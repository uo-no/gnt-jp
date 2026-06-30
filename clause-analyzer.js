/**
 * clause-analyzer.js
 * Clause Analysis Layer — Phase 10A
 *
 * 目的:  SyntaxAnalyzer / PhraseAnalyzer の出力を受け取り、
 *         節レベル構造 (ClauseResult) を生成する。
 * 依存:  clause-registry.json (節型定義データ)
 * 制約:  syntax-analyzer.js / phrase-analyzer.js を変更しない
 *         これらを import しない（入力データのみ参照）
 *         DOM / UI に依存しない
 *         prototype / apodosis 対応 / DiscourseAnalyzer 機能は含まない
 * バージョン: 1.9.0 (Phase 10C-γD: resolveDiscourseType v2 — signal駆動の決定器)
 */

'use strict';

// =====================================================================
// § 1. 定数
// =====================================================================

// span 停止条件 C: 主要従位接続詞 — 節境界とみなす。
// 等位接続詞 (καί, τε など) は _COORD_LEMMAS に移動 (Phase 10B-1)。
// δέ は後置型で節内部によく現れるため引き続き除外。
const _MAJOR_CONJ_LEMMAS = new Set([
    'ἀλλά', 'οὖν', 'γάρ',
    'εἰ', 'ἐάν', 'ἵνα', 'ὅπως', 'ὅτι', 'ὥστε',
]);

// 節内等位接続詞 (Phase 10B-1) — span を継続する（stop を更新しない）。
// これらが節境界になるのは直後に有限動詞 + 主要接続詞が続く場合のみ。
const _COORD_LEMMAS = new Set(['καί', 'τε', 'τέ', 'μηδέ', 'οὐδέ']);

// ὅτι 内容節の context_check: アンカー前方で検索する宣言・知覚・認識動詞の lemma。
const _DECLARATIVE_LEMMAS = new Set([
    'λέγω', 'εἶπον', 'εἴπω', 'λαλέω', 'φημί',
    'γράφω', 'ἀπογράφω', 'ἐπιγράφω',
    'οἶδα', 'γινώσκω', 'ἐπιγινώσκω', 'ἀναγινώσκω',
    'ἀκούω', 'παρακούω',
    'ὁράω', 'βλέπω', 'θεωρέω', 'θεάομαι',
    'πιστεύω', 'ὁμολογέω', 'ἀρνέομαι',
    'ἀγγέλλω', 'ἀπαγγέλλω', 'ἀναγγέλλω', 'καταγγέλλω', 'εὐαγγελίζω',
    'κηρύσσω', 'διδάσκω', 'μαρτυρέω', 'διαμαρτύρομαι',
    'δηλόω', 'φανερόω', 'νοέω', 'ἐρωτάω', 'αἰτέω',
    'ἐπερωτάω', 'ἀπαγγέλλω', 'ὑπομιμνήσκω',
]);

// Phase 10C: _DECLARATIVE_LEMMAS の部分集合 — discourse type 識別用。
// 発言・書記・宣告動詞 (reporting verbs) → CONTENT
const _REPORT_LEMMAS = new Set([
    'λέγω', 'εἶπον', 'εἴπω', 'λαλέω', 'φημί',
    'γράφω', 'ἀπογράφω', 'ἐπιγράφω',
    'ἀγγέλλω', 'ἀπαγγέλλω', 'ἀναγγέλλω', 'καταγγέλλω', 'εὐαγγελίζω',
    'κηρύσσω', 'διδάσκω', 'μαρτυρέω', 'διαμαρτύρομαι',
    'δηλόω', 'φανερόω', 'ὑπομιμνήσκω',
]);

// 知覚・認識・信念動詞 (cognition/perception verbs) → COMPLEMENT
const _COGNITION_LEMMAS = new Set([
    'οἶδα', 'γινώσκω', 'ἐπιγινώσκω', 'ἀναγινώσκω',
    'ἀκούω', 'παρακούω',
    'ὁράω', 'βλέπω', 'θεωρέω', 'θεάομαι',
    'πιστεύω', 'ὁμολογέω', 'ἀρνέομαι',
    'νοέω', 'ἐρωτάω', 'αἰτέω', 'ἐπερωτάω',
]);

// 発話コンテキストを示す人称代名詞 lemma（一・二人称）。
// tok.book は 'MRK' / 'ROM' 等の文字列、tok.person は '1'/'2'/'3' 文字列。
// σύ は ὑμεῖς / ὑμῖν 等の二人称全格を統一する lemma。
const _SPEECH_PRONOUNS = new Set(['ἐγώ', 'σύ', 'ἡμεῖς']);

// Phase 10C-γB: Discourse Frame — 書籍ジャンル分類。
// ACT は使徒の説教・引用を含むため GOSPEL から分離し、
// discourseMode 'NARRATIVE' の対象外とする（ACT 13:36 等の誤分類防止）。
const _DISCOURSE_BOOKS = {
    GOSPEL:     ['MAT', 'MRK', 'LUK', 'JHN'],
    ACTS:       ['ACT'],
    EPISTLE:    ['ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH',
                 '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE',
                 '1JN', '2JN', '3JN', 'JUD'],
    APOCALYPSE: ['REV'],
};

// Phase 10C-γC: Priority Resolver の base score（固定）。
// marker ごとに候補プルーニング済みの集合内でのみ使用する
// （CONTRAST_EXPLANATION 等が無条件に他ラベルと競合することはない）。
const _DISC_BASE_SCORE = {
    DISCOURSE_EXPLANATION: 3,  // 旧仕様の EXPLANATION 相当（γA/γB ラベル名を維持）
    TRUE_NARRATIVE:         2,  // 旧仕様の NARRATIVE_SUPPORT 相当
    CONTENT:                3,
    COMPLEMENT:              3,
    PURPOSE:                 3,
    EXPLANATORY_PURPOSE:     3,
    RESULT:                  2,
    CONTRAST_EXPLANATION:    4,
};

// 同点時の優先順位（指定順）。
const _DISC_TIE_BREAK_ORDER = ['DISCOURSE_EXPLANATION', 'CONTENT', 'COMPLEMENT'];

// =====================================================================
// § 2. 内部ユーティリティ
// =====================================================================

function _getLemma(token) {
    const raw = token.lemma ?? token.text ?? '';
    return typeof raw.normalize === 'function' ? raw.normalize('NFC') : raw;
}

function _getMood(token) {
    return String(token.mood ?? '');
}

function _clamp01(v) {
    return Math.max(0, Math.min(1, v));
}

// Phase 10C: discourse result helpers — clause.discourse を設定して返す。
function _setDisc(clause, type, marker, confidence) {
    const result = { type, marker, confidence: _clamp01(confidence) };
    if (clause) clause.discourse = result;
    return result;
}

function _discUnknown(clause, marker = '') {
    return _setDisc(clause, 'UNCLASSIFIED', marker, 0.0);
}

// Phase 10C-γA: γάρ ナラティブ判定ヘルパー。
// tok.book が直接利用可能（bible_data JSON の直属フィールド）。
function _extractBook(tokens) {
    return String(tokens[0]?.book ?? '');
}

// span 内に一・二人称動詞または人称代名詞がなく、
// 三人称有限動詞が存在するとき true（語り手視点）を返す。
// tok.person は '1'/'2'/'3' 文字列（未設定時は ''）。
function _isThirdPersonNarration(tokens, clause) {
    let hasThird = false;
    for (let i = clause.start; i <= clause.end && i < tokens.length; i++) {
        const tok = tokens[i];
        // 人称代名詞 lemma で発話コンテキストを検出
        if (_SPEECH_PRONOUNS.has(_getLemma(tok))) return false;
        const mood = _getMood(tok);
        if (!mood || mood === 'participle' || mood === 'infinitive') continue;
        const person = String(tok.person ?? '');
        if (person === '1' || person === '2') return false;
        if (person === '3') hasThird = true;
    }
    return hasThird;
}

// span 内の最初の直説法動詞が過去時制（aorist / imperfect / perfect / pluperfect）か確認。
// 未来形・現在汎称（gnomic present）の教示発言を TRUE_NARRATIVE から除外するための補完条件。
function _hasPastTenseIndicative(tokens, clause) {
    for (let i = clause.start; i <= clause.end && i < tokens.length; i++) {
        const tok = tokens[i];
        if (_getMood(tok) !== 'indicative') continue;
        const tense = String(tok.tense ?? '');
        return tense === 'aorist'    || tense === 'imperfect' ||
               tense === 'perfect'  || tense === 'pluperfect';
    }
    return false; // 直説法なし → DISCOURSE_EXPLANATION
}

// Phase 10C-γB: Discourse Frame — 書籍ジャンル × 語り手視点 × 過去時制を
// 一度に計算し、γάρ / ὅτι / ἵνα の分類で共有する構造体。
// discourseMode の判定は既存の _isThirdPersonNarration / _hasPastTenseIndicative
// を再利用する（lemma リストのみの簡易判定より精度が高いため）。
function buildDiscourseFrame(tokens, clause) {
    const book = _extractBook(tokens);

    const bookType =
        _DISCOURSE_BOOKS.GOSPEL.includes(book)     ? 'GOSPEL' :
        _DISCOURSE_BOOKS.ACTS.includes(book)       ? 'ACTS' :
        _DISCOURSE_BOOKS.EPISTLE.includes(book)    ? 'EPISTLE' :
        _DISCOURSE_BOOKS.APOCALYPSE.includes(book) ? 'APOCALYPSE' :
        'EPISTLE';

    const isThirdPerson    = _isThirdPersonNarration(tokens, clause);
    const hasPastNarrative = _hasPastTenseIndicative(tokens, clause);

    const discourseMode =
        (bookType === 'GOSPEL' && isThirdPerson && hasPastNarrative)
            ? 'NARRATIVE'
            : 'EXPLANATION';

    return { bookType, discourseMode, hasFirstPerson: !isThirdPerson };
}

// Phase 10C-γD: resolveDiscourseType v2 — 「スコア分類器」から
// 「signal駆動の決定器」へ再設計。呼び出し側（Layer 2 / 各 _discourseXxx）が
// marker ごとに candidates を 1 件（基本）に絞り込んだ上で本関数に渡す。
// 本関数はその候補をそのまま信頼しつつ、暴走防止のための独立した安全層を持つ：
//
//   Step 1: hard override        — candidates が単独ならそのまま確定
//   Step 2: hard signal override — γA/γB 保護層（ἀλλά / GOSPEL+trueNarrative）
//   Step 3: contextual suppression — ἀλλά 不在時に CONTRAST_EXPLANATION を
//                                     候補集合から強制除去（暴走防止の核心）
//   Step 4: scoring               — 上記で解決できない場合のみ最終手段として使用
//
// marker 間でのスコア競合は発生しない（candidates は呼び出し側で marker ごとに
// プルーニング済みであり、本関数自体は marker を知らない）。
//
// @param {{label:string, confidence:number}[]} candidates  Layer 2 プルーニング済み候補
// @param {Object} signals  marker ごとの signal フラグ群
// @param {Object} frame    buildDiscourseFrame() の結果（不変・補助情報としてのみ使用）
// @param {Object} clause   ClauseResult（将来拡張用、現状未使用）
// @returns {{label:string, confidence:number}}
function resolveDiscourseType(candidates, signals, frame, clause) {
    // Step 1: hard override（最優先 — Layer 2 プルーニングの結果を信頼）
    if (candidates.length === 1) return candidates[0];

    // Step 2: hard signal override（γA/γB 保護層）
    if (signals.hasAllaInSpan) {
        return candidates.find(c => c.label === 'CONTRAST_EXPLANATION')
            ?? { label: 'CONTRAST_EXPLANATION', confidence: 0.82 };
    }
    if (frame?.bookType === 'GOSPEL' && signals.trueNarrative) {
        return candidates.find(c => c.label === 'TRUE_NARRATIVE')
            ?? { label: 'TRUE_NARRATIVE', confidence: 0.82 };
    }

    // Step 3: contextual suppression（核心 — ἀλλά が無いのに
    // CONTRAST_EXPLANATION が候補に残っている場合は強制除去）
    let pruned = candidates;
    if (!signals.hasAllaInSpan) {
        pruned = pruned.filter(c => c.label !== 'CONTRAST_EXPLANATION');
    }
    if (pruned.length === 1) return pruned[0];
    if (pruned.length === 0) return candidates[0]; // 理論上到達しないフォールバック

    // Step 4: scoring（最終手段。frame は補助情報としてのみ使用し、単独で決定しない）
    const scored = pruned.map(cand => {
        let score = _DISC_BASE_SCORE[cand.label] ?? 0;
        if (signals.cognitionVerb && cand.label === 'COMPLEMENT')       score += 3;
        if (signals.reportVerb    && cand.label === 'CONTENT')         score += 3;
        if (frame?.discourseMode === 'NARRATIVE' && cand.label === 'TRUE_NARRATIVE') score += 2;
        return { cand, score };
    });

    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const rank = (label) => {
            const idx = _DISC_TIE_BREAK_ORDER.indexOf(label);
            return idx === -1 ? Infinity : idx;
        };
        return rank(a.cand.label) - rank(b.cand.label);
    });

    return scored[0].cand;
}

// =====================================================================
// § 3. ClauseAnalyzer クラス
// =====================================================================

class ClauseAnalyzer {
    /**
     * @param {Object} clauseRegistry  clause-registry.json を parse した plain object
     * @param {Object} [options]
     * @param {Function} [options.posResolver]  token → pos code 文字列（任意の注入）
     */
    constructor(clauseRegistry, options = {}) {
        if (!clauseRegistry || typeof clauseRegistry.clauses !== 'object') {
            throw new Error(
                'ClauseAnalyzer: clauseRegistry must have a "clauses" object'
            );
        }
        this._clauses    = clauseRegistry.clauses;
        this._posResolver = options.posResolver ?? null;
    }

    /**
     * 節解析のエントリポイント。
     *
     * @param {Object} param0
     * @param {TokenEntry[]}            param0.tokens        節内全トークン
     * @param {(AnalysisResult|null)[]} param0.syntaxResults  tokens と平行な配列（読み取り専用）
     * @param {PhraseResult[]}          param0.phraseResults  PhraseAnalyzer 出力（読み取り専用、将来用）
     * @returns {ClauseResult[]}  start 昇順ソート済み
     */
    analyze({ tokens, syntaxResults, phraseResults }) {
        if (!Array.isArray(tokens) || !Array.isArray(syntaxResults)) return [];
        if (tokens.length !== syntaxResults.length) return [];

        const usedAnchors = new Set();
        const results     = [];

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const lemma = _getLemma(token);

            for (const [typeId, def] of Object.entries(this._clauses)) {
                const det = def.detection;
                if (!det) continue;

                const markerLemmas = det.markers?.lemmas ?? [];
                if (!markerLemmas.includes(lemma)) continue;

                // pos チェック（pos が不明な場合はスキップせずに通す）
                if (det.markers?.pos?.length > 0) {
                    const resolved = this._resolvePos(token);
                    if (resolved !== '' && !det.markers.pos.includes(resolved)) continue;
                }

                if (usedAnchors.has(i)) continue;

                // ─── strategy 別: start 決定 ─────────────────────────────
                let start;
                if (det.strategy === 'conjunction_anchor') {
                    start = i;
                } else if (det.strategy === 'postpositive_anchor') {
                    const window = det.search_window ?? 4;
                    if (i > window) continue; // 節頭から遠すぎる
                    start = 0;
                } else {
                    continue;
                }

                // ─── context_check ────────────────────────────────────────
                let confMod = 0;
                const mods  = def.confidence_modifiers ?? {};

                if (det.context_check) {
                    const pass = this._runContextCheck(i, det.context_check, tokens);
                    if (!pass) continue; // check 失敗 → このタイプをスキップ
                    confMod += mods.context_check_pass ?? 0;
                }

                // ─── span 決定 (B+C Hybrid) ──────────────────────────────
                const { end, stopReason } = this._resolveSpan(
                    i, det, tokens, lemma, typeId
                );

                // ─── following_mood チェック → confidence 調整 ────────────
                if (det.following_mood?.length > 0) {
                    const found = this._scanMoodInSpan(
                        tokens, i + 1, end, det.following_mood
                    );
                    confMod += found
                        ? (mods.following_mood_match    ?? 0)
                        : (mods.following_mood_mismatch ?? 0);
                }

                const confidence = parseFloat(
                    _clamp01((def.confidence_base ?? 0.75) + confMod).toFixed(4)
                );

                results.push({
                    id:         `${typeId}:${i}`,
                    type:       typeId,
                    start,
                    end,
                    anchor:     i,
                    confidence,
                    parent:     null,
                    stopReason,
                });

                usedAnchors.add(i);
                break; // 同一 anchor は最初にマッチした type のみ
            }
        }

        return results.sort((a, b) => a.start - b.start);
    }

    // ===================================================================
    // § 3-A. context_check — ὅτι 内容節の宣言動詞検索
    // ===================================================================

    /**
     * アンカー前方の window トークン以内に宣言動詞が存在するか確認する。
     *
     * @param {number}   anchorIdx
     * @param {Object}   check      det.context_check
     * @param {Array}    tokens
     * @returns {boolean}
     */
    _runContextCheck(anchorIdx, check, tokens) {
        if (check.look !== 'before') return false; // 'before' のみ実装
        const win = check.window ?? 4;
        for (let j = anchorIdx - 1; j >= Math.max(0, anchorIdx - win); j--) {
            if (_DECLARATIVE_LEMMAS.has(_getLemma(tokens[j]))) return true;
        }
        return false;
    }

    // ===================================================================
    // § 3-B. span 決定 — B+C Hybrid
    // ===================================================================

    /**
     * アンカー位置から B+C ハイブリッドで節末尾を決定する (Phase 10B-3)。
     *
     * 停止優先順位（共通）:
     *   1. max_span                — max_span トークン数上限
     *   2. major_conjunction (C)  — 主要従位接続詞の直前で停止
     *   3. finite_verb             — 期待 mood 動詞検出（節型により挙動が異なる）
     *   4. verse_end               — tokens 末尾到達
     *
     * Phase 10B-1: 有限動詞は最低終了位置 (minimumEnd) として走査継続。
     *              等位接続詞は stop を更新せずに透過。
     *
     * Phase 10B-3 (clause.condition のみ): 等位接続詞を考慮した protasis 追跡。
     *   - lastVerbStop: 最後に記録した protasis 動詞の位置 (-1 = 未検出)
     *   - afterCoord:   lastVerbStop 以降に等位接続詞が出現したか
     *   matching verb:
     *     lastVerbStop < 0 または afterCoord → 同一 protasis 内, span 延長
     *     それ以外                            → apodosis 開始, stop at lastVerbStop
     *   non-matching finite verb (lastVerbStop >= 0):
     *     → apodosis 開始, stop at lastVerbStop
     *   後置: reason 終了時に stop を lastVerbStop へ補正
     *
     * @param {number}   anchorIdx
     * @param {Object}   det          detection 定義
     * @param {Array}    tokens
     * @param {string}   anchorLemma  anchor トークンの lemma（予約、現在未使用）
     * @param {string}   typeId       節型 ID（例: 'clause.condition'）
     * @returns {{ end: number, stopReason: string }}
     */
    _resolveSpan(anchorIdx, det, tokens, anchorLemma, typeId = '') {
        const maxSpan     = det.max_span ?? 20;
        const followMoods = det.following_mood ?? null;
        const isCondition = (typeId === 'clause.condition');

        let i            = anchorIdx + 1;
        let stop         = anchorIdx;
        let reason       = 'unknown';
        let lastVerbStop = -1;   // Phase 10B-3: 最後の protasis 動詞位置
        let afterCoord   = false; // Phase 10B-3: lastVerbStop 以降に等位接続詞を確認済み

        while (i < tokens.length) {
            if ((i - anchorIdx) >= maxSpan) { reason = 'max_span'; break; }

            const tok   = tokens[i];
            const lemma = _getLemma(tok);

            // 等位接続詞: 節内等位として走査継続 — stop を更新しない。
            if (_COORD_LEMMAS.has(lemma)) {
                if (isCondition && lastVerbStop >= 0) afterCoord = true;
                i++;
                continue;
            }

            // 停止条件 C: 主要従位接続詞 — 直前まで停止
            if (_MAJOR_CONJ_LEMMAS.has(lemma)) {
                reason = 'major_conjunction';
                break;
            }

            // 有限動詞の処理
            const mood = _getMood(tok);
            if (mood && followMoods?.length > 0) {
                const isMatch = followMoods.includes(mood);
                if (isCondition) {
                    // Phase 10B-3: 等位接続詞考慮の protasis 追跡
                    const isFin = mood === 'indicative' || mood === 'subjunctive' ||
                                  mood === 'optative'   || mood === 'imperative';
                    if (isMatch) {
                        if (lastVerbStop < 0 || afterCoord) {
                            // Phase 10B-4: afterCoord 状態での future indicative は apodosis
                            if (isCondition && afterCoord &&
                                mood === 'indicative' &&
                                String(tok.tense ?? '') === 'future') {
                                reason = 'finite_verb'; break;
                            }
                            // 同一 protasis 内の動詞 — span 延長
                            lastVerbStop = i; afterCoord = false; stop = i; i++; continue;
                        } else {
                            // coord なしで 2 個目の matching verb → apodosis
                            reason = 'finite_verb'; break;
                        }
                    } else if (isFin && lastVerbStop >= 0) {
                        // 非 matching 有限動詞 (imperative 等) → apodosis
                        reason = 'finite_verb'; break;
                    }
                } else if (isMatch) {
                    // その他の節型: minimumEnd として記録し走査継続 (Phase 10B-1)
                    stop = i; i++; continue;
                }
            }

            stop = i;
            i++;
        }

        if (i >= tokens.length && reason === 'unknown') reason = 'verse_end';

        // Phase 10B-3 後置補正 (condition): stop を lastVerbStop に揃える
        if (isCondition && lastVerbStop >= 0) {
            stop = lastVerbStop;
            if (reason === 'verse_end' || reason === 'unknown') reason = 'finite_verb';
        }

        // 後置 stopReason 判定 (非 condition のみ):
        // verse_end かつ最終トークンが期待 mood → 'finite_verb'
        if (!isCondition && reason === 'verse_end' &&
            followMoods?.length > 0 && stop > anchorIdx) {
            if (followMoods.includes(_getMood(tokens[stop]))) {
                reason = 'finite_verb';
            }
        }

        return { end: Math.max(stop, anchorIdx), stopReason: reason };
    }

    // ===================================================================
    // § 3-C. span 内の mood スキャン
    // ===================================================================

    /**
     * tokens[fromIdx..toIdx]（両端 inclusive）を走査し、
     * 指定 mood リストのいずれかに一致する有限動詞が存在するか返す。
     *
     * @param {Array}    tokens
     * @param {number}   fromIdx
     * @param {number}   toIdx
     * @param {string[]} moodList
     * @returns {boolean}
     */
    _scanMoodInSpan(tokens, fromIdx, toIdx, moodList) {
        for (let j = fromIdx; j <= toIdx && j < tokens.length; j++) {
            const mood = _getMood(tokens[j]);
            if (mood && moodList.includes(mood)) return true;
        }
        return false;
    }

    // ===================================================================
    // § 3-D. POS 解決
    // ===================================================================

    /**
     * トークンから pos コード（'C', 'N', 'V' 等）を解決する。
     * syntax-analyzer.js を import しない独立実装。
     *
     * @param {Object} token
     * @returns {string}  解決できない場合は ''
     */
    _resolvePos(token) {
        if (this._posResolver) return this._posResolver(token);
        const cls = String(token.class ?? '').toLowerCase();
        switch (cls) {
            case 'conj':         case 'conjunction':  return 'C';
            case 'noun':                              return 'N';
            case 'verb':                              return 'V';
            case 'adj':          case 'adjective':    return 'A';
            case 'adv':          case 'adverb':       return 'D';
            case 'prep':         case 'preposition':  return 'P';
            case 'det':          case 'article':      return 'T';
            case 'pron':         case 'pronoun':      return 'R';
            case 'ptcl':         case 'particle':     return 'X';
        }
        // fallback: token.pos が設定されている場合
        if (token.pos) return String(token.pos).replace(/-$/, '').toUpperCase();
        return '';
    }

    // ===================================================================
    // § 3-E. Phase 10C — discourse relation classification
    // ===================================================================

    /**
     * Phase 10C: 節間の意味関係（discourse relation）を分類する。
     *
     * clause.discourse = { type, marker, confidence } を設定して返す。
     * Phase 10A/10B の span / stopReason / confidence 等には一切触れない。
     *
     * @param {Array}  tokens  節が属する verse の全トークン
     * @param {Object} clause  ClauseResult（.discourse フィールドを追加する）
     * @returns {{ type: string, marker: string, confidence: number }}
     */
    classifyDiscourseRelation(tokens, clause) {
        if (!clause || !Array.isArray(tokens)) return _discUnknown(clause);
        const anchor = tokens[clause.anchor];
        if (!anchor) return _discUnknown(clause);

        const anchorLemma = _getLemma(anchor);
        const spanTokens  = tokens.slice(clause.start, clause.end + 1);

        if (anchorLemma === 'γάρ') {
            return this._discourseGar(tokens, clause, spanTokens, anchorLemma);
        }
        if (anchorLemma === 'ὅτι') {
            return this._discourseHoti(tokens, clause, spanTokens, anchorLemma);
        }
        if (anchorLemma === 'ἵνα' || anchorLemma === 'ὅπως') {
            return this._discourseHina(tokens, clause, spanTokens, anchorLemma);
        }

        // span 内の ὡς / ὥσπερ を補助マーカーとして走査
        for (const tok of spanTokens) {
            const l = _getLemma(tok);
            if (l === 'ὡς' || l === 'ὥσπερ') {
                return this._discourseHos(tokens, clause, spanTokens, l);
            }
        }

        return _discUnknown(clause, anchorLemma);
    }

    /**
     * γάρ discourse 分類 — Phase 10C-γD: resolveDiscourseType v2 経由。
     *
     * Layer 1（不変）: ἀλλά in span 検出 / DiscourseFrame / 三人称語り手視点 / 過去時制
     * Layer 2（pruning）: 候補を 1 件に絞り込む
     *   - hasAllaInSpan         → [CONTRAST_EXPLANATION]
     *   - GOSPEL × trueNarrative → [TRUE_NARRATIVE]
     *   - それ以外               → [DISCOURSE_EXPLANATION]
     */
    _discourseGar(tokens, clause, spanTokens, marker) {
        // Layer 1: signal 検出（γA/γB 不変）
        const hasAllaInSpan  = spanTokens.some(t => _getLemma(t) === 'ἀλλά');
        const frame          = buildDiscourseFrame(tokens, clause);
        const trueNarrative  = _isThirdPersonNarration(tokens, clause) &&
                                _hasPastTenseIndicative(tokens, clause);

        const signals = { hasAllaInSpan, trueNarrative };

        // Layer 2: candidate pruning（1 件に制限）
        let candidates;
        if (hasAllaInSpan) {
            candidates = [{ label: 'CONTRAST_EXPLANATION', confidence: 0.82 }];
        } else if (frame.bookType === 'GOSPEL' && trueNarrative) {
            candidates = [{ label: 'TRUE_NARRATIVE', confidence: 0.82 }];
        } else {
            candidates = [{ label: 'DISCOURSE_EXPLANATION', confidence: 0.88 }];
        }

        const winner = resolveDiscourseType(candidates, signals, frame, clause);
        return _setDisc(clause, winner.label, marker, winner.confidence);
    }

    /**
     * ὅτι: COMPLEMENT / CONTENT / REASON
     *
     * アンカー前方 window=6 で支配動詞を検索:
     *   - 知覚・認識動詞 (_COGNITION_LEMMAS) → COMPLEMENT
     *   - 発言・書記動詞 (_REPORT_LEMMAS)    → CONTENT
     *   - clause.type === 'clause.content' (context_check 済み) → CONTENT（低信頼）
     *   - 宣言動詞が見つからない場合（Phase 10C-γB）: Discourse Frame で補完
     *       discourseMode === 'NARRATIVE' → CONTENT（語り手の地の文）
     *       bookType === 'EPISTLE'        → COMPLEMENT（論証内の前提）
     *   - それ以外 → REASON（因果的 ὅτι）
     */
    /**
     * ὅτι discourse 分類 — Phase 10C-γD: resolveDiscourseType v2 経由。
     *
     * Layer 1（不変）: 宣言動詞 window scan（cognition/report）/ DiscourseFrame
     * Layer 2（pruning）:
     *   - cognitionVerb            → [COMPLEMENT]
     *   - reportVerb               → [CONTENT]
     *   - clause.type==='clause.content' → [CONTENT]（context_check 済み、低信頼）
     *   - GOSPEL かつ speechVerb なし → [REASON]（Phase 10C-γD: CONTENT から変更 —
     *     「ὅτιの50/50問題」緩和のため、語り手の地の文は causal REASON に再分類）
     *   - EPISTLE                  → [COMPLEMENT]（γB fallback 維持）
     *   - それ以外                  → [REASON]
     */
    _discourseHoti(tokens, clause, spanTokens, marker) {
        // Layer 1: signal 検出（γA 以前から不変、first-match-wins window scan）
        let cognitionVerb = false;
        let reportVerb    = false;
        const win = 6;
        for (let j = clause.anchor - 1; j >= Math.max(0, clause.anchor - win); j--) {
            const l = _getLemma(tokens[j]);
            if (_COGNITION_LEMMAS.has(l)) { cognitionVerb = true; break; }
            if (_REPORT_LEMMAS.has(l))    { reportVerb    = true; break; }
        }

        const frame      = buildDiscourseFrame(tokens, clause);
        const speechVerb  = frame.hasFirstPerson; // 一・二人称（直接発話）の有無

        const signals = { cognitionVerb, reportVerb, speechVerb };

        // Layer 2: candidate pruning（1 件に制限）
        let candidates;
        if (cognitionVerb) {
            candidates = [{ label: 'COMPLEMENT', confidence: 0.85 }];
        } else if (reportVerb) {
            candidates = [{ label: 'CONTENT', confidence: 0.88 }];
        } else if (clause.type === 'clause.content') {
            candidates = [{ label: 'CONTENT', confidence: 0.75 }];
        } else if (frame.bookType === 'GOSPEL' && !speechVerb) {
            candidates = [{ label: 'REASON', confidence: 0.60 }];
        } else if (frame.bookType === 'EPISTLE') {
            candidates = [{ label: 'COMPLEMENT', confidence: 0.60 }];
        } else {
            candidates = [{ label: 'REASON', confidence: 0.68 }];
        }

        const winner = resolveDiscourseType(candidates, signals, frame, clause);
        return _setDisc(clause, winner.label, marker, winner.confidence);
    }

    /**
     * ἵνα / ὅπως discourse 分類 — Phase 10C-γD: resolveDiscourseType v2 経由。
     *
     * Layer 1（不変）: confidence（mood mismatch）/ DiscourseFrame / span 内有限動詞数
     * Layer 2（pruning）:
     *   - strongResultPattern（confidence<0.75 または NARRATIVE frame） → [RESULT]
     *   - explanatoryStrength > 0.7（verbCount>=3 相当）                → [EXPLANATORY_PURPOSE]
     *   - それ以外                                                      → [PURPOSE]
     */
    _discourseHina(tokens, clause, spanTokens, marker) {
        const frame = buildDiscourseFrame(tokens, clause);
        const verbCount = spanTokens.filter(t => {
            const m = _getMood(t);
            return m === 'subjunctive' || m === 'indicative';
        }).length;

        // Layer 1: signal 検出
        const strongResultPattern = clause.confidence < 0.75 || frame.discourseMode === 'NARRATIVE';
        const explanatoryStrength = verbCount / 4; // verbCount>=3 で 0.7 超（既存閾値を維持）

        const signals = { strongResultPattern, explanatoryStrength };

        // Layer 2: candidate pruning（1 件に制限）
        let candidates;
        if (strongResultPattern) {
            candidates = [{
                label: 'RESULT',
                confidence: clause.confidence < 0.75 ? 0.65 : 0.70,
            }];
        } else if (explanatoryStrength > 0.7) {
            candidates = [{ label: 'EXPLANATORY_PURPOSE', confidence: 0.72 }];
        } else {
            candidates = [{ label: 'PURPOSE', confidence: 0.92 }];
        }

        const winner = resolveDiscourseType(candidates, signals, frame, clause);
        return _setDisc(clause, winner.label, marker, winner.confidence);
    }

    /**
     * ὡς / ὥσπερ: SIMILE / TEMPORAL / APPROX_CAUSE
     *
     *   - ὥσπερ → SIMILE（ほぼ常に比較）
     *   - ὡς + span 内に分詞 → TEMPORAL
     *   - ὡς + span 内に直説法 → APPROX_CAUSE
     *   - それ以外 → SIMILE
     */
    _discourseHos(tokens, clause, spanTokens, marker) {
        if (marker === 'ὥσπερ') {
            return _setDisc(clause, 'SIMILE', marker, 0.88);
        }
        if (spanTokens.some(t => _getMood(t) === 'participle')) {
            return _setDisc(clause, 'TEMPORAL', marker, 0.80);
        }
        if (spanTokens.some(t => _getMood(t) === 'indicative')) {
            return _setDisc(clause, 'APPROX_CAUSE', marker, 0.72);
        }
        return _setDisc(clause, 'SIMILE', marker, 0.75);
    }
}

// =====================================================================
// § 4. Phase 11A — AnnotationMapper（StudyPanel 用変換レイヤー）
// =====================================================================
//
// ClauseAnalyzer / PhraseAnalyzer / DiscourseAnalyzer の出力を
// StudyPanel 用の標準アノテーション形式に変換するだけの層。
// 分類しない・推論しない・ロジックを持たない——「構造をUIに変換する」のみ。
//
// 注記（色マッピングの補正）: clause.type は registry 上 'clause.purpose' /
// 'clause.content' / 'clause.reason' / 'clause.condition' / 'clause.contrast'
// という 'clause.' 接頭辞付きの値を取る。_getClauseColor() のマップキーは
// 接頭辞なし（'purpose' 等）で与えられているため、接頭辞を剥がしてから
// 引くようにした（剥がさないと全 clause が常にデフォルト色 '#999' になり、
// 色分け自体が機能しなくなるため）。
class AnnotationMapper {
    constructor() {}

    // -----------------------------------------------------------------
    // メイン変換関数
    // -----------------------------------------------------------------
    convert(clauseResults, phraseResults = [], discourseResults = {}) {
        return {
            clauses:   this._mapClauses(clauseResults),
            phrases:   this._mapPhrases(phraseResults),
            discourse: this._mapDiscourse(discourseResults),
            meta:      this._buildMeta(clauseResults),
        };
    }

    // -----------------------------------------------------------------
    // Clause 変換
    // -----------------------------------------------------------------
    _mapClauses(clauses) {
        return clauses.map(c => ({
            id: c.id ?? null,

            // 原文情報
            text: c.text ?? '',

            // 構造情報（既存そのまま）
            anchor: c.anchor,
            span: {
                start: c.start ?? c.span?.start,
                end:   c.end   ?? c.span?.end,
            },

            type:       c.type,
            stopReason: c.stopReason,

            // discourse情報（読み取り専用）
            discourse: c.discourse ?? null,

            // UI用メタ
            ui: {
                highlight: true,
                color:     this._getClauseColor(c.type),
                label:     c.type,
            },
        }));
    }

    // -----------------------------------------------------------------
    // Phrase 変換
    // -----------------------------------------------------------------
    _mapPhrases(phrases) {
        return phrases.map(p => ({
            id:   p.id ?? null,
            text: p.text ?? '',

            span: {
                start: p.start ?? p.span?.start,
                end:   p.end   ?? p.span?.end,
            },

            type: p.type,

            ui: {
                highlight: true,
                color:     this._getPhraseColor(p.type),
                label:     p.type,
            },
        }));
    }

    // -----------------------------------------------------------------
    // Discourse 変換
    // -----------------------------------------------------------------
    _mapDiscourse(discourse) {
        return {
            type:       discourse?.type ?? null,
            confidence: discourse?.confidence ?? 0,

            // UI表示用
            label: this._getDiscourseLabel(discourse?.type),

            // 安定表示用（Phase 10C結果固定）
            locked: true,
        };
    }

    // -----------------------------------------------------------------
    // メタ情報
    // -----------------------------------------------------------------
    _buildMeta(clauses) {
        return {
            totalClauses: clauses.length,

            stopReasonDistribution: clauses.reduce((acc, c) => {
                const r = c.stopReason || 'unknown';
                acc[r] = (acc[r] || 0) + 1;
                return acc;
            }, {}),

            anchorCount: clauses.filter(c => c.anchor != null).length,
        };
    }

    // -----------------------------------------------------------------
    // UI補助関数
    // -----------------------------------------------------------------
    _getClauseColor(type) {
        const map = {
            'condition': '#4A90E2',
            'purpose':   '#7ED321',
            'content':   '#F5A623',
            'contrast':  '#D0021B',
        };
        const key = type?.replace(/^clause\./, '');
        return map[key] || '#999';
    }

    _getPhraseColor(type) {
        const map = {
            'verb':     '#4A90E2',
            'noun':     '#7ED321',
            'modifier': '#BD10E0',
        };
        return map[type] || '#999';
    }

    _getDiscourseLabel(type) {
        const map = {
            'DISCOURSE_EXPLANATION': 'Explanation',
            'TRUE_NARRATIVE':        'Narrative',
            'CONTRAST_EXPLANATION':  'Contrast',
            'CONTENT':               'Content',
            'COMPLEMENT':            'Complement',
            'PURPOSE':               'Purpose',
        };
        return map[type] || 'Unknown';
    }
}

// =====================================================================
// § 5. Phase 11B/12 — StudyPanelAdapter（AnnotationMapper → ViewModel）
// =====================================================================
//
// AnnotationMapper が生成した標準データを StudyPanel がそのまま描画できる
// ViewModel に変換するだけの層。discourse分類・stopReason・color・span・
// phrase・confidence のいずれも変更/再計算しない（読み取り→詰め替えのみ）。
//
// 注記（Phase 12: 役割固定・要確認）: 本クラスは文を一切生成しない
// （= 自然文生成ロジックを持たない）という意味では既に③に適合している。
// 一方、本クラスの出力は discourse.type / confidence / stopReason / span
// をそのまま含んでおり、Phase 11D で定義した「Inspect/Studyモード」用の
// 詳細ビューであって、Wallace読書メモが表示される「Readingモード」とは
// 別の画面を想定している（Reading側のテキストは必ず ReadingFormatter /
// ReadingNoteLibrary を経由し、本クラスは経由しない）。今回の指示④
// 「禁止: discourse.type/marker/confidence数値/clause構造」を本クラスにも
// 無条件に適用すると Inspect/Studyモードの構造化データが丸ごと失われる
// ため、Reading面のテキスト生成経路には絶対に関与させないという制約は
// 厳守しつつ、Inspect/Study用の構造化フィールドはそのまま残した。
// この区分の理解が違う場合はご指摘ください。
class StudyPanelAdapter {
    constructor() {}

    // -----------------------------------------------------------------
    // メインAPI
    // -----------------------------------------------------------------
    build(annotation) {
        return {
            overview:     this._buildOverview(annotation),
            clauseCard:   this._buildClauseCard(annotation),
            phraseCard:   this._buildPhraseCard(annotation),
            discourseCard: this._buildDiscourseCard(annotation),
            auditCard:    this._buildAuditCard(annotation),
        };
    }

    // -----------------------------------------------------------------
    // ① Overview
    // -----------------------------------------------------------------
    _buildOverview(annotation) {
        return {
            clauseCount:   annotation.meta.totalClauses,
            phraseCount:   annotation.phrases.length,
            discourseType: annotation.discourse.type,
            confidence:    annotation.discourse.confidence,
        };
    }

    // -----------------------------------------------------------------
    // ② Clause Card
    // -----------------------------------------------------------------
    _buildClauseCard(annotation) {
        return {
            items: annotation.clauses.map(c => ({
                id:         c.id,
                label:      c.ui.label,
                span:       c.span,
                stopReason: c.stopReason,
                discourse:  c.discourse,
                color:      c.ui.color,
            })),
        };
    }

    // -----------------------------------------------------------------
    // ③ Phrase Card
    // -----------------------------------------------------------------
    _buildPhraseCard(annotation) {
        return {
            items: annotation.phrases,
        };
    }

    // -----------------------------------------------------------------
    // ④ Discourse Card
    // -----------------------------------------------------------------
    _buildDiscourseCard(annotation) {
        return {
            label:      annotation.discourse.label,
            confidence: annotation.discourse.confidence,
            locked:     annotation.discourse.locked,
        };
    }

    // -----------------------------------------------------------------
    // ⑤ Audit Card
    // -----------------------------------------------------------------
    _buildAuditCard(annotation) {
        return {
            totalClauses:           annotation.meta.totalClauses,
            anchorCount:            annotation.meta.anchorCount,
            stopReasonDistribution: annotation.meta.stopReasonDistribution,
        };
    }
}

// =====================================================================
// § 6. Phase 11C/最終仕上げ/読書言語統一 — ReadingFormatter（Wallace Gloss 統合版）
// =====================================================================
//
// AnnotationMapper / StudyPanelAdapter / ReadingNoteLibrary の出力を
// 「読書として読める静かな1文」に翻訳するだけの Presentation Layer。
// 解析・再判定・score計算・discourse.type/clause.type/marker/confidence
// の直接表示は一切行わない。主語は常に「読書の視点（ここでは／この
// 箇所では）」であり、「この節は」のような分析主語は使わない。
//
// 注記（2点の逸脱、いずれも意図的・要報告、最終仕上げラウンドからの継続）:
//
// (1) hint: 過去の仕様生成ルールは `hint = item.discourse?.marker` だが、
//     marker（生のギリシア語マーカー）を表に出すことは絶対禁止のため、
//     hint は常に null を返す。
//
// (2) confidenceText: 過去の仕様生成ルールは生の confidence% 文字列化
//     だが、confidence数値の露出は絶対禁止のため、定性的な表現
//     （安定/一般的/複数の解釈）のみを返す。数値は一切出さない。
//
// 注記（title/summary の統合）: 前ラウンドでは title=WallaceGloss原文・
// summary=脱プレフィックス変形という2系統の文言を保持していたが、今回の
// 「読書言語への統一」指示はその区別を要求しておらず、両方とも同じ
// Wallace原則（「ここでは／この流れでは／この箇所では」＋意味説明、
// 分類ラベルを露出しない静かな1文）に従う必要がある。2系統を維持する
// 根拠が無くなったため、1つの正規文（_WALLACE_TEXT）に統合し、
// title・summary はともに同じ文を返す。
//
// 注記（DISCOURSE_EXPLANATION の文言修正）: 今回指定された OK例
// 「ここでは、前の内容がなぜ成立するのかが説明されています」は、
// 前ラウンドの WallaceGloss 原文にあった「という理由が」を含まない。
// この1件は今回のテスト基準で名指しされているため文言を合わせた。
// 他のキー（PURPOSE の「目的」、CONDITION の「条件」など）は今回
// 名指しでの修正対象になっておらず、かつ前ラウンドで✅例として
// 明示的に承認済みの語であるため、独自判断で除去することはしていない
// （分類名詞そのものではなく「この節は〜です／を示します／説明して
// います」という分析口調が禁止対象、という理解に基づく）。
//
// 注記（WallaceGloss の補完）: ご指定の WallaceGloss は
// DISCOURSE_EXPLANATION / CONTENT / COMPLEMENT / PURPOSE /
// EXPLANATORY_PURPOSE / RESULT / CONDITION / CONTRAST_EXPLANATION /
// UNCLASSIFIED の9種のみだが、実際の classifyDiscourseRelation() は
// これ以外に TRUE_NARRATIVE（γάρ）/ REASON（ὅτι）/
// SIMILE・TEMPORAL・APPROX_CAUSE（ὡς/ὥσπερρ）も出力する
// （TRUE_NARRATIVE は Phase 10C-γB/11C の必須テストケースである
// MRK 3:10 で実際に出力される値）。これらが未定義のまま素通しすると
// 全て汎用 UNCLASSIFIED 文に潰れてしまうため、同じ文体で補完エントリを
// 追加している。
//
// 注記（CONDITION の到達経路）: classifyDiscourseRelation() は
// εἰ/ἐάν/ἀλλά を専用処理しないため、条件節・対比節の discourse.type は
// 常に 'UNCLASSIFIED' になる（ROM 1:10 で確認済み）。discourse.type
// 単独の lookup では CONDITION 用の文は到達不能なデッドコードになって
// しまうため、clause.type（'clause.condition' / 'clause.contrast'）
// から対応するキーへ橋渡しする小さなマップを追加した。これにより
// 成功条件にある εἰ / ἀλλά も汎用 UNCLASSIFIED 文ではなく専用の自然文
// になる。
//
// 注記（Phase 12: アーキテクチャ固定）: 本クラスをシステム内で唯一の
// 自然文生成源とする。ReadingNoteLibrary は自前の文章テーブルを持たず
// 本クラスの出力をそのまま再利用するのみ（§7 参照）。StudyPanelAdapter
// は文を一切生成しない（§5 参照）。さらに、将来このクラスや
// _WALLACE_TEXT に変更が入っても discourse.type / marker / confidence
// 数値が誤って自然文に紛れ込まないよう、format() の戻り値を
// assertReadingTextSafe() で検証してから返す（Guard Rule）。

// ── Guard Rule: discourse.type / marker / confidence数値の漏洩を検出する ──
const _LEAK_GUARD_TOKENS = [
    // discourse.type 列挙値（_WALLACE_TEXT の全キー）
    'DISCOURSE_EXPLANATION', 'CONTENT', 'COMPLEMENT', 'PURPOSE',
    'EXPLANATORY_PURPOSE', 'RESULT', 'CONDITION', 'CONTRAST_EXPLANATION',
    'UNCLASSIFIED', 'TRUE_NARRATIVE', 'REASON', 'SIMILE', 'TEMPORAL',
    'APPROX_CAUSE',
    // 生マーカー（clause-registry.json の lemmas + ὡς系）
    'γάρ', 'ὅτι', 'ἵνα', 'ὅπως', 'εἰ', 'ἐάν', 'ἀλλά', 'ὡς', 'ὥσπερ',
];
const _CONFIDENCE_NUMBER_RE = /\d+(\.\d+)?\s*%|confidence\s*[:=]/i;

// UI に渡す直前の自然文を検査し、内部用語・数値が混入していれば例外を
// 投げる（"strip" ではなく "throw" を選択: 漏洩は仕様バグであり、UI側で
// 黙って取り除くと検出が遅れるため、生成側で即座に失敗させる）。
function assertReadingTextSafe(text) {
    if (text == null) return text;
    if (typeof text !== 'string') return text;
    for (const token of _LEAK_GUARD_TOKENS) {
        if (text.includes(token)) {
            throw new Error(`Reading UI Guard: internal token "${token}" leaked into UI text: "${text}"`);
        }
    }
    if (_CONFIDENCE_NUMBER_RE.test(text)) {
        throw new Error(`Reading UI Guard: confidence-like number leaked into UI text: "${text}"`);
    }
    return text;
}

const _WALLACE_TEXT = {
    DISCOURSE_EXPLANATION:
        'ここでは、前の内容がなぜ成立するのかが説明されています。',

    CONTENT:
        'ここでは、その内容が具体的に明らかにされています。',

    COMPLEMENT:
        'ここでは、その内容が補足的に示されています。',

    PURPOSE:
        'ここでは、その目的として何が意図されているかが示されています。',

    EXPLANATORY_PURPOSE:
        'ここでは、その目的がより説明的に展開されています。',

    RESULT:
        'ここでは、その結果が示されています。',

    CONDITION:
        'ここでは、ある条件が前提として提示されています。',

    CONTRAST_EXPLANATION:
        'ここでは、前の内容との対比が示され、話の方向が転換されています。',

    UNCLASSIFIED:
        'ここでは、状況や背景が補足されています。',

    // WallaceGloss に無いが実際に出力される discourse.type への補完（同一文体）
    TRUE_NARRATIVE: 'ここでは、背景となる出来事や状況が補足されています。',
    REASON:         'ここでは、理由にあたる内容が示されています。',
    SIMILE:         'ここでは、たとえを用いて説明されています。',
    TEMPORAL:       'ここでは、出来事の前後関係が示されています。',
    APPROX_CAUSE:   'ここでは、おおよその理由が示されています。',
};

// discourse.type が UNCLASSIFIED になる clause.type を _WALLACE_TEXT の
// 対応キーへ橋渡しする（上の「CONDITION の到達経路」注記を参照）
const _CLAUSE_TYPE_TO_GLOSS_KEY = {
    'clause.condition': 'CONDITION',
    'clause.contrast':  'CONTRAST_EXPLANATION',
};

// combine() の読書リズム用：各 _WALLACE_TEXT キーが2文目以降に来たときの
// 接続語タイプ（A=通常追加「、」/ B=軽い意味転換「、そして」/
// C=補足追加「、さらに」）。各キーの本文に含まれる語そのものから判定:
//   - 「対比」「転換」を含む → B（CONTRAST_EXPLANATIONは自身の文に
//     既に「転換されています」とあり、明確な意味の転換）
//   - SIMILEはたとえ話への切替＝説明の仕方自体が変わるためBとした
//   - 「補足」「展開」を含む → C（COMPLEMENT/UNCLASSIFIED/
//     TRUE_NARRATIVEは文中に「補足」、EXPLANATORY_PURPOSEは目的の
//     「展開」＝既出の目的を掘り下げる付加情報）
//   - それ以外（理由・内容・目的・結果・条件など、新規の事実を
//     ストレートに足すもの）→ A
// 未知のキー（将来追加分・combine()に渡された非_WALLACE_TEXT文）は
// 既定で 'A'（最も控えめな「、」）にフォールバックする。
const _CONNECTOR_TYPE_BY_KEY = {
    DISCOURSE_EXPLANATION: 'A',
    CONTENT:               'A',
    COMPLEMENT:             'C',
    PURPOSE:                'A',
    EXPLANATORY_PURPOSE:    'C',
    RESULT:                 'A',
    CONDITION:              'A',
    CONTRAST_EXPLANATION:   'B',
    UNCLASSIFIED:           'C',
    TRUE_NARRATIVE:         'C',
    REASON:                 'A',
    SIMILE:                 'B',
    TEMPORAL:               'A',
    APPROX_CAUSE:           'A',
};

// combine() が入力文字列から元の _WALLACE_TEXT キーを逆引きするための表
const _WALLACE_TEXT_TO_KEY = new Map(
    Object.entries(_WALLACE_TEXT).map(([key, text]) => [text, key])
);

class ReadingFormatter {
    constructor() {}

    // -----------------------------------------------------------------
    // 公開API — AnnotationMapper item / StudyPanelAdapter clauseCard
    // item / ReadingNoteLibrary output / Wordレイヤーの wordContext
    // （{type, text, verseContext, clauseContext}）のいずれも受け取れる。
    // （.discourse も .clauseContext も持たない入力は UNCLASSIFIED 相当）
    //
    // 注記（Wordレイヤー統一）: wordContext.clauseContext が存在する
    // 場合は、その clauseContext（節レベルの discourse/type を持つ
    // アイテム）を唯一の意味源として使う。単語自体（wordContext.type=
    // lemma/morph種別, .text, .verseContext）は一切新規解釈しない —
    // 「節の意味の一部として単語を見る」という Wallace 思想どおり、
    // 節の判定結果をそのまま再利用するだけ。clauseContext が無い
    // （= 意味のある節文脈が無い）場合は通常どおり UNCLASSIFIED 文に
    // フォールバックする（呼び出し側が「完全非表示にすべきか」を
    // 判断する場合は、clauseContext が無い時点で format() を呼ばずに
    // null を返す設計にする — 本メソッドの戻り値は常に
    // {title,summary,hint,confidenceText} の4フィールドで一貫させる）。
    // -----------------------------------------------------------------
    format(item) {
        const source = (item && item.clauseContext !== undefined) ? item.clauseContext : item;

        const discourseType = source?.discourse?.type ?? null;
        const confidence    = source?.discourse?.confidence ?? 0;
        const clauseType    = source?.type ?? source?.label ?? null;

        const key  = this._resolveGlossKey(discourseType, clauseType);
        const text = assertReadingTextSafe(_WALLACE_TEXT[key]);

        return {
            title:          text,
            summary:        text,
            hint:           this._getHint(),
            confidenceText: assertReadingTextSafe(this._getConfidenceText(confidence)),
        };
    }

    // -----------------------------------------------------------------
    // combine — 複数の format() 出力文を「ここでは、」1回だけの
    // 1つの自然文に統合し、節境界に読書リズム（接続語の軽い変化）を
    // 持たせる。
    //
    // 例: ["ここでは、Aされています。", "ここでは、Bされています。"]
    //     → "ここでは、Aされ、Bされています。"（Bが通常追加=Aタイプの場合）
    //
    // 最後の1文以外は「〜されています」を継続形「〜され」に機械的に
    // 変換する。2文目以降の接続語は、その文の discourse 種別から
    // 「、」（通常追加）/「、そして」（軽い意味転換）/
    // 「、さらに」（補足追加）のいずれかを選ぶ（_CONNECTOR_TYPE_BY_KEY
    // 参照、判定根拠は同マップのコメントに記載）。最後の1文だけ元の
    // 丁寧形のまま残す。入力は呼び出し側で重複除去済みであることを
    // 前提とする（同一文の重複排除はここでは行わない＝呼び出し側の責務）。
    //
    // 注記（仕様の解釈について・要報告）: 依頼文の出力例⑥は
    // Before/After が文字列として同一で「視覚的には変更しない」と
    // 注記されていたが、依頼文④では接続語自体を「、」/「、そして」/
    // 「、さらに」の3種に変えると明記されていた。両者は字面上矛盾する。
    // ④の方が具体的かつ実行可能な指示であり、またゴール⑨の「読みの
    // リズム」は語の変化なしには実現できないと判断したため、④を採用し
    // 接続語を実際に変化させた（HTML/CSSによる視覚的な間の表現は
    // 追加していない＝「視覚的には変更しない」はそちらの意味として
    // 解釈）。
    //
    // 注記: 現行の全14種の _WALLACE_TEXT エントリは検証済みの通り
    // 例外なく「〜されています」で終わる（node実行による確認済み）。
    // 将来このパターンに合わないエントリが追加された場合、継続形への
    // 変換は単に無効（置換が起きず元の丁寧形のまま）になるだけで、
    // 文として壊れたり内部用語が漏れたりすることはない。
    // -----------------------------------------------------------------
    combine(sentences) {
        const list = (sentences || []).filter(Boolean);
        if (list.length === 0) return null;
        if (list.length === 1) return assertReadingTextSafe(list[0]);

        const bodies = list.map(s => s.replace(/^ここでは、/, '').replace(/。$/, ''));
        const continuatives = bodies.slice(0, -1).map(b => b.replace(/されています$/, 'され'));
        const last = bodies[bodies.length - 1];
        const allBodies = continuatives.concat(last);

        const CONNECTOR_TEXT = { A: '、', B: '、そして', C: '、さらに' };
        let combined = 'ここでは、' + allBodies[0];
        for (let i = 1; i < allBodies.length; i++) {
            const key  = _WALLACE_TEXT_TO_KEY.get(list[i]);
            const type = _CONNECTOR_TYPE_BY_KEY[key] || 'A';
            combined += CONNECTOR_TEXT[type] + allBodies[i];
        }
        combined += '。';

        return assertReadingTextSafe(combined);
    }

    // discourse.type が具体的な値を持つ場合はそれを優先し、
    // UNCLASSIFIED（または未知）の場合のみ clause.type 橋渡しを試みる
    _resolveGlossKey(discourseType, clauseType) {
        if (discourseType && discourseType !== 'UNCLASSIFIED' && _WALLACE_TEXT[discourseType]) {
            return discourseType;
        }
        const bridged = _CLAUSE_TYPE_TO_GLOSS_KEY[clauseType];
        if (bridged) return bridged;
        return 'UNCLASSIFIED';
    }

    // 絶対原則「markerを出さない」を優先し常に null（注記(1)参照）
    _getHint() {
        return null;
    }

    // 絶対原則「confidenceをUIに出さない」を優先し数値は出さない（注記(2)参照）
    _getConfidenceText(confidence) {
        if (confidence >= 0.95) return '解析は安定しています。';
        if (confidence >= 0.80) return '一般的な解釈です。';
        return '複数の解釈が考えられます。';
    }
}

// =====================================================================
// § 7. Phase 11D/12 — ReadingNoteLibrary（読書体験のための意味記憶レイヤー）
// =====================================================================
//
// AnnotationMapper / StudyPanelAdapter / ReadingFormatter の出力を
// 「読書ノート」（ReadingNote）に変換するだけの読み取り専用レイヤー。
// 解析・再分類・confidence再計算は一切行わない。
//
// 注記（Phase 12: 役割固定・要報告）: 「ReadingFormatterを唯一の自然文
// 生成源にする」という指示に伴い、本クラスが独自に保持していた文章表
// （旧 _NOTE_RULES_BY_MARKER、γάρ/ὅτι/ἵνα/εἰ/ἀλλά ごとの label/text）を
// 廃止した。前ラウンドで一度 _WALLACE_TEXT の値を複写して使う形に統一
// していたが、複写である以上「ReadingFormatterの結果をそのまま再利用」
// にはなっておらず、将来 _WALLACE_TEXT 側だけが変更されればこちらは
// 古い文言のまま取り残される（＝崩れる）リスクが残っていた。そのため
// generateNote() は ReadingFormatter のインスタンスを直接呼び出し、
// その戻り値をそのまま label/text に詰め替えるだけにした。本クラスが
// 行うのは group（refs付与）・cluster（clusterNotes）・suggest の3つの
// みで、分類・翻訳・新規の文章生成は一切行わない。
//
// 注記（3種類の入力形状の橋渡し）: generateNote() は AnnotationMapper
// item / StudyPanelAdapter clauseCard item / ReadingFormatter output の
// いずれも受け取れる。ReadingFormatter output（{title,summary,...}）が
// 渡された場合は二重に format() へ通さず、既に確定した自然文を
// そのまま再利用する（item.discourse が無く item.title がある場合に
// 限り素通しする）。marker由来の情報（type/confidence/id）は元の
// discourse が無ければ安全なデフォルト（'UNCLASSIFIED' / 0 / null）に
// 倒す。
//
// 注記（suggest() は維持）: 役割固定リストは generateNote() で「新しい
// 文章を作らない」ことを求めているが、suggest() 自体は group/cluster と
// 並んで本クラスに明示的に残された責務であり、UIの許可リストにある
// 「読書用ヒント」に当たる別カテゴリの短文（Wallace文＝自然文とは別物、
// 既存の固定テーブルからの読み出しのみで新規生成ではない）。
// 「この節は」のような分析口調や discourse.type/marker/confidence の
// 直接露出が無いことは確認済みのため、文言は変更していない。

// suggest() 用の軽量ヒント（generateNote() のラベル/本文とは独立した短文）
const _SUGGESTION_BY_MARKER = {
    'γάρ':  '理由として読むと流れが見えます',
    'ἵνα':  '目的と結果を区別してください',
    'ὅπως': '目的と結果を区別してください',
    'εἰ':   '条件節の範囲に注目してください',
    'ἐάν':  '条件節の範囲に注目してください',
};

class ReadingNoteLibrary {
    constructor() {
        // ① ReadingFormatterを唯一の自然文生成源にする — 本クラスは
        // 自前の文章テーブルを持たず、必ずこのインスタンス経由で文を取得する
        this._formatter = new ReadingFormatter();
    }

    // -----------------------------------------------------------------
    // ① generateNote — 入力 → ノート生成（文章は作らず group するだけ）
    // refs は元の clause/discourse オブジェクトが book/chapter/verse を
    // 持たないため、呼び出し側が文脈として渡す任意の第2引数。
    // -----------------------------------------------------------------
    generateNote(item, refs = {}) {
        const marker     = item?.discourse?.marker ?? null;
        const confidence = item?.discourse?.confidence ?? 0;
        const id         = item?.id ?? null;

        // 既に ReadingFormatter.format() 済みの出力（.discourse を持たず
        // .title を持つ）はそのまま再利用し、そうでなければ Formatter に
        // 生成させる（本クラス自身は文章を作らない）
        const formatted = (item?.discourse === undefined && item?.title !== undefined)
            ? item
            : this._formatter.format(item);

        return {
            id,
            type:  marker ?? 'UNCLASSIFIED',
            label: assertReadingTextSafe(formatted.title),
            text:  assertReadingTextSafe(formatted.summary),
            refs: {
                book:    refs.book,
                chapter: refs.chapter,
                verse:   refs.verse,
            },
            confidence,
        };
    }

    // -----------------------------------------------------------------
    // ② clusterNotes — 同一 type（マーカー）でグルーピング
    // -----------------------------------------------------------------
    clusterNotes(notes) {
        return notes.reduce((acc, n) => {
            const key = n.type ?? 'UNCLASSIFIED';
            (acc[key] = acc[key] || []).push(n);
            return acc;
        }, {});
    }

    // -----------------------------------------------------------------
    // ③ suggest — 軽量ヒント生成（UI用）
    // context は marker文字列そのもの、または
    // ReadingNote（.type）/ discourse付きitem（.discourse.marker）のいずれも可
    // -----------------------------------------------------------------
    suggest(context) {
        const marker = typeof context === 'string'
            ? context
            : (context?.type ?? context?.discourse?.marker ?? null);
        return _SUGGESTION_BY_MARKER[marker] ?? '';
    }
}

// =====================================================================
// § 8. Phase 10D — PrecisionAudit（観測専用 QA レイヤー）
// =====================================================================
//
// ClauseAnalyzer / PhraseAnalyzer の出力を読み取るだけの監査クラス。
// span / discourse / stopReason 等のロジックには一切書き込まない
// （ClauseResult を変更せず、必要な範囲はローカル変数として導出する）。
//
// 注記（読み取り専用導出）:
//   ClauseResult は { start, end } を直接持ち、{ span: {start,end} } という
//   形のフィールドは持たない。本クラスは clause.span が無い場合
//   { start: clause.start, end: clause.end } をその場で導出して使う
//   （clause オブジェクトへの書き込みは行わない）。
//
// 注記（gold-standard フィールド）:
//   anchorExpected / expectedSpanEnd / parentDepth は ClauseAnalyzer が
//   設定するフィールドではない（外部の正解データを注入する想定のフック）。
//   未注入の場合、anchorPrecision / spanPrecision は機械的に
//   不一致 / overlap=0 を返す——これは本クラスの不具合ではなく、
//   正解データが無い状態での当然の挙動。
class PrecisionAudit {
    constructor() {
        this.results = [];
    }

    // -----------------------------------------------------------------
    // (1) anchor precision
    // -----------------------------------------------------------------
    anchorPrecision(clause) {
        return {
            expected: clause.anchorExpected ?? null,
            actual:   clause.anchor,
            match:    clause.anchor === clause.anchorExpected,
        };
    }

    // -----------------------------------------------------------------
    // (2) span precision
    // -----------------------------------------------------------------
    spanPrecision(clause) {
        const actualSpan  = clause.span ?? { start: clause.start, end: clause.end };
        const expectedEnd = clause.expectedSpanEnd;
        const expectedSpan = (expectedEnd !== undefined)
            ? { start: actualSpan.start, end: expectedEnd }
            : undefined;

        return {
            expected: expectedEnd ?? null,
            actual:   actualSpan,
            overlap:  this._computeOverlap(actualSpan, expectedSpan),
        };
    }

    // -----------------------------------------------------------------
    // (3) stopReason validity
    // -----------------------------------------------------------------
    stopReasonValidity(clause) {
        const validReasons = [
            'finite_verb',
            'major_conjunction',
            'verse_end',
            'max_span',
        ];

        return {
            reason: clause.stopReason,
            valid:  validReasons.includes(clause.stopReason),
        };
    }

    // -----------------------------------------------------------------
    // (4) parent structure check
    // -----------------------------------------------------------------
    parentStructureCheck(clause) {
        return {
            parent: clause.parent,
            depth:  clause.parentDepth ?? 0,
            valid:  clause.parent !== undefined,
        };
    }

    // -----------------------------------------------------------------
    // (5) phrase containment rate
    // -----------------------------------------------------------------
    phraseContainmentRate(clause, phraseResult) {
        const clauseRange = clause.span ?? { start: clause.start, end: clause.end };
        const phraseRange = phraseResult?.span ??
            ((phraseResult?.start !== undefined) ? { start: phraseResult.start, end: phraseResult.end } : undefined);

        if (!phraseRange) return { rate: 0 };

        const overlap = this._computeOverlap(clauseRange, phraseRange);

        return {
            rate:       overlap,
            clauseSpan: clauseRange,
            phraseSpan: phraseRange,
        };
    }

    // -----------------------------------------------------------------
    // メイン監査関数
    // -----------------------------------------------------------------
    runPrecisionAudit(clauses, phraseResults) {
        const report = {
            anchorPrecision:   [],
            spanPrecision:     [],
            stopReason:        [],
            parentStructure:   [],
            phraseContainment: [],
            summary:           {},
        };

        for (const clause of clauses) {
            report.anchorPrecision.push(this.anchorPrecision(clause));
            report.spanPrecision.push(this.spanPrecision(clause));
            report.stopReason.push(this.stopReasonValidity(clause));
            report.parentStructure.push(this.parentStructureCheck(clause));

            const phrase = phraseResults?.find(p => p.id === clause.id);
            report.phraseContainment.push(this.phraseContainmentRate(clause, phrase));
        }

        report.summary = this._computeSummary(report);
        this.results.push(report);

        return report;
    }

    // -----------------------------------------------------------------
    // サマリー（集計のみ）
    // -----------------------------------------------------------------
    _computeSummary(report) {
        return {
            anchorPrecisionRate:    this._rate(report.anchorPrecision, 'match'),
            spanPrecisionRate:      this._avg(report.spanPrecision, 'overlap'),
            stopReasonValidityRate: this._rate(report.stopReason, 'valid'),
            parentValidityRate:    this._rate(report.parentStructure, 'valid'),
            phraseContainmentAvg:  this._avg(report.phraseContainment, 'rate'),
        };
    }

    // -----------------------------------------------------------------
    // 出力形式: "Precision Audit Report v1.0" テキストレポート
    // -----------------------------------------------------------------
    formatReport(report) {
        const pct = (v) => `${(v * 100).toFixed(1)}%`;
        const s = report.summary;
        const overall = (
            s.anchorPrecisionRate + s.spanPrecisionRate + s.stopReasonValidityRate +
            s.parentValidityRate + s.phraseContainmentAvg
        ) / 5;

        return [
            'Precision Audit Report v1.0',
            '',
            `Anchor Precision: ${pct(s.anchorPrecisionRate)}`,
            `Span Precision: ${pct(s.spanPrecisionRate)}`,
            `StopReason Validity: ${pct(s.stopReasonValidityRate)}`,
            `Parent Structure: ${pct(s.parentValidityRate)}`,
            `Phrase Containment: ${pct(s.phraseContainmentAvg)}`,
            '',
            `Overall Score: ${pct(overall)}`,
        ].join('\n');
    }

    // -----------------------------------------------------------------
    // ユーティリティ（判定ロジックなし — 純粋な集計関数）
    // -----------------------------------------------------------------
    _computeOverlap(a, b) {
        if (!a || !b) return 0;

        const start = Math.max(a.start, b.start);
        const end   = Math.min(a.end, b.end);

        if (end < start) return 0;

        return (end - start + 1) / (a.end - a.start + 1);
    }

    _rate(arr, key) {
        const valid = arr.filter(x => x[key]).length;
        return arr.length ? valid / arr.length : 0;
    }

    _avg(arr, key) {
        const sum = arr.reduce((s, x) => s + (x[key] || 0), 0);
        return arr.length ? sum / arr.length : 0;
    }
}

// =====================================================================
// § 9. Phase 10D-A — StabilityMonitor（観測専用・バージョン間安定性監視）
// =====================================================================
//
// ClauseAnalyzer / PhraseAnalyzer / DiscourseFrame には一切介入しない。
// 「正しいかどうか」ではなく「（前回スナップショットと比べて）変わって
// いないか」だけを測る外付けの観測層。
//
// 注記（読み取り専用導出）: PrecisionAudit と同様、ClauseResult /
// PhraseResult が { span: {start,end} } を持たない場合は
// { start: c.start, end: c.end } をその場で導出する（書き込みなし）。
//
// 注記（discourse 比較の補正）: discourse は _setDisc() が分類のたびに
// 新規生成する { type, marker, confidence } オブジェクトのため、
// 参照比較（!==）では値が同じでも常に「変化あり」と判定されてしまう。
// 「型が変わったか」を見たいという意図に合わせ、type 値で比較する。
//
// 注記（diff の入力形状）: runStabilityMonitor() は prev/curr に
// スナップショット全体（{timestamp, clauses, phrases, discourse}）を渡す
// ため、diffClauses/diffPhrases は curr.clauses / curr.phrases を走査する
// （curr 自体は配列ではないため curr.map は直接呼べない）。
class StabilityMonitor {
    constructor(prevSnapshot = null) {
        this.prev    = prevSnapshot;
        this.current = null;
    }

    // -----------------------------------------------------------------
    // (2.1) Snapshot 生成
    // -----------------------------------------------------------------
    createSnapshot(clauses, phrases, discourse) {
        return {
            timestamp: Date.now(),

            clauses: clauses.map(c => ({
                id:         c.id,
                anchor:     c.anchor,
                span:       c.span ?? (c.start !== undefined ? { start: c.start, end: c.end } : null),
                stopReason: c.stopReason,
                type:       c.type,
                discourse:  c.discourse,
            })),

            phrases: (phrases ?? []).map(p => ({
                id:   p.id,
                span: p.span ?? (p.start !== undefined ? { start: p.start, end: p.end } : null),
                type: p.type,
            })),

            discourse,
        };
    }

    // -----------------------------------------------------------------
    // (3.1) Clause Diff
    // -----------------------------------------------------------------
    diffClauses(prev, curr) {
        const currClauses = curr?.clauses ?? [];

        return currClauses.map((c, i) => {
            const p = prev?.clauses?.[i];

            if (!p) {
                return { id: c.id, status: 'NEW' };
            }

            return {
                id:                c.id,
                anchorShift:       p.anchor !== c.anchor,
                spanDrift:         this._spanDrift(p.span, c.span),
                stopReasonChanged: p.stopReason !== c.stopReason,
                discourseChanged:  (p.discourse?.type ?? null) !== (c.discourse?.type ?? null),
            };
        });
    }

    // -----------------------------------------------------------------
    // (3.2) Phrase Diff
    // -----------------------------------------------------------------
    diffPhrases(prev, curr) {
        const currPhrases = curr?.phrases ?? [];

        return currPhrases.map((p, i) => {
            const old = prev?.phrases?.[i];

            if (!old) {
                return { id: p.id, status: 'NEW' };
            }

            return {
                id:          p.id,
                spanDrift:   this._spanDrift(old.span, p.span),
                typeChanged: old.type !== p.type,
            };
        });
    }

    // -----------------------------------------------------------------
    // (4) Drift 計算ユーティリティ
    // -----------------------------------------------------------------
    _spanDrift(a, b) {
        if (!a || !b) return 1;

        const startDiff = Math.abs(a.start - b.start);
        const endDiff   = Math.abs(a.end - b.end);

        return (startDiff + endDiff) / 2;
    }

    // -----------------------------------------------------------------
    // (5) Stability Score 算出
    // -----------------------------------------------------------------
    computeStability(diff) {
        const total = diff.length;

        const anchorStable    = diff.filter(d => !d.anchorShift).length;
        const spanStable      = diff.filter(d => d.spanDrift < 2).length;
        const stopStable      = diff.filter(d => !d.stopReasonChanged).length;
        const discourseStable = diff.filter(d => !d.discourseChanged).length;

        return {
            anchorStability:     total ? anchorStable / total : 0,
            spanStability:       total ? spanStable / total : 0,
            stopReasonStability: total ? stopStable / total : 0,
            discourseStability:  total ? discourseStable / total : 0,

            overall: total
                ? (anchorStable + spanStable + stopStable + discourseStable) / (total * 4)
                : 0,
        };
    }

    // -----------------------------------------------------------------
    // (6) StopReason Distribution Tracker
    // -----------------------------------------------------------------
    trackStopReasonDistribution(clauses) {
        const dist = {};

        for (const c of clauses) {
            const r = c.stopReason || 'unknown';
            dist[r] = (dist[r] || 0) + 1;
        }

        return dist;
    }

    // -----------------------------------------------------------------
    // (7) Instability Detector（回帰検出）
    // -----------------------------------------------------------------
    detectInstability(diff) {
        return diff.filter(d =>
            d.spanDrift > 5 ||
            d.stopReasonChanged ||
            d.anchorShift
        );
    }

    // -----------------------------------------------------------------
    // (8) メイン実行関数
    // -----------------------------------------------------------------
    runStabilityMonitor(prevSnapshot = this.prev, currClauses, currPhrases, currDiscourse) {
        const currentSnapshot = this.createSnapshot(currClauses, currPhrases, currDiscourse);

        const clauseDiff = this.diffClauses(prevSnapshot, currentSnapshot);
        const phraseDiff = this.diffPhrases(prevSnapshot, currentSnapshot);

        const clauseStability = this.computeStability(clauseDiff);
        const phraseStability = this.computeStability(phraseDiff);

        const instability = this.detectInstability(clauseDiff);

        const stopDist = this.trackStopReasonDistribution(currClauses);

        this.current = currentSnapshot;

        return {
            clauseStability,
            phraseStability,
            instability,
            stopReasonDistribution: stopDist,
            snapshot: currentSnapshot,
            // formatReport() 用（typeChanged は computeStability の汎用集計
            // では表現できないため diff をそのまま保持する）
            clauseDiff,
            phraseDiff,
        };
    }

    // -----------------------------------------------------------------
    // (9) 出力フォーマット: "Stability Monitor Report v1.0"
    // -----------------------------------------------------------------
    formatReport(result) {
        const pct = (v) => `${(v * 100).toFixed(1)}%`;
        const cs  = result.clauseStability;

        // Phrase Stability の Type 行は typeChanged を直接集計する
        // （computeStability の discourseStability は clause 専用の
        //   discourseChanged フィールドを見るため phrase diff には無意味）。
        const phraseDiff     = result.phraseDiff ?? [];
        const spanStability  = result.phraseStability.spanStability;
        const typeStability  = phraseDiff.length
            ? phraseDiff.filter(d => !d.typeChanged).length / phraseDiff.length
            : 0;
        const phraseOverall  = (spanStability + typeStability) / 2;

        const dist = result.stopReasonDistribution;
        const orderedReasons = ['finite_verb', 'major_conjunction', 'verse_end', 'max_span'];
        const extraReasons   = Object.keys(dist).filter(k => !orderedReasons.includes(k));

        return [
            'Stability Monitor Report v1.0',
            '',
            'Clause Stability:',
            `- Anchor: ${pct(cs.anchorStability)}`,
            `- Span: ${pct(cs.spanStability)}`,
            `- StopReason: ${pct(cs.stopReasonStability)}`,
            `- Discourse: ${pct(cs.discourseStability)}`,
            `- Overall: ${pct(cs.overall)}`,
            '',
            'Phrase Stability:',
            `- Span: ${pct(spanStability)}`,
            `- Type: ${pct(typeStability)}`,
            `- Overall: ${pct(phraseOverall)}`,
            '',
            `Instability Count: ${result.instability.length}`,
            'StopReason Distribution:',
            ...orderedReasons.map(r => `- ${r}: ${dist[r] ?? 0}`),
            ...extraReasons.map(r => `- ${r}: ${dist[r]}`),
        ].join('\n');
    }
}

// =====================================================================
// § 10. エクスポート
// =====================================================================

if (typeof window !== 'undefined') {
    window.App              = window.App              || {};
    window.App.syntax       = window.App.syntax       || {};
    window.App.syntax.ClauseAnalyzer      = ClauseAnalyzer;
    window.App.syntax.AnnotationMapper    = AnnotationMapper;
    window.App.syntax.StudyPanelAdapter   = StudyPanelAdapter;
    window.App.syntax.ReadingFormatter    = ReadingFormatter;
    window.App.syntax.ReadingNoteLibrary  = ReadingNoteLibrary;
    window.App.syntax.PrecisionAudit      = PrecisionAudit;
    window.App.syntax.StabilityMonitor    = StabilityMonitor;
    window.App.syntax.assertReadingTextSafe = assertReadingTextSafe;
    /* 互換エイリアス */
    window.ClauseAnalyzer = ClauseAnalyzer;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ClauseAnalyzer, AnnotationMapper, StudyPanelAdapter, ReadingFormatter, ReadingNoteLibrary, PrecisionAudit, StabilityMonitor, assertReadingTextSafe };
}
