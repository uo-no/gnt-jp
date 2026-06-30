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
// § 5. Phase 11B — StudyPanelAdapter（AnnotationMapper → ViewModel）
// =====================================================================
//
// AnnotationMapper が生成した標準データを StudyPanel がそのまま描画できる
// ViewModel に変換するだけの層。discourse分類・stopReason・color・span・
// phrase・confidence のいずれも変更/再計算しない（読み取り→詰め替えのみ）。
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
// § 6. Phase 11C/最終仕上げ — ReadingFormatter（Wallace Gloss 統合版）
// =====================================================================
//
// AnnotationMapper / StudyPanelAdapter / ReadingNoteLibrary の出力を
// 「読書中の自然な理解を助ける静かな1文」に翻訳するだけの Presentation
// Layer。解析・再判定・score計算・discourse.type/marker/confidence の
// 直接表示は一切行わない。
//
// 注記（2点の逸脱、いずれも意図的・要報告）:
//
// (1) hint: 仕様の生成ルールは `hint = item.discourse?.marker ?? null`
//     だが、同じ仕様の冒頭「絶対原則」は「❌ marker（γάρ/ὅτι 等）を
//     出さない」と明記している。生のマーカー文字列をそのまま hint に
//     入れるとこの絶対原則に直接違反するため、絶対原則を優先し
//     hint は常に null を返すようにした。
//
// (2) confidenceText: 仕様の生成ルールは
//     `` `confidence: ${Math.round(confidence*100)}%` `` という
//     数値そのものを文字列化する内容だが、同じ仕様の絶対原則は
//     「❌ confidenceをUIに出さない」と明記している。これも矛盾する
//     ため、絶対原則を優先し、Phase 11C で実装済みの定性的な表現
//     （安定/一般的/複数の解釈）をそのまま維持し、数値は一切出さない。
//
// 注記（WallaceGloss の補完）: ご指定の WallaceGloss は
// DISCOURSE_EXPLANATION / CONTENT / COMPLEMENT / PURPOSE /
// EXPLANATORY_PURPOSE / RESULT / CONDITION / CONTRAST_EXPLANATION /
// UNCLASSIFIED の9種のみだが、実際の classifyDiscourseRelation() は
// これ以外に TRUE_NARRATIVE（γάρ）/ REASON（ὅτι）/
// SIMILE・TEMPORAL・APPROX_CAUSE（ὡς/ὥσπερρ）も出力する
// （TRUE_NARRATIVE は Phase 10C-γB/11C の必須テストケースである
// MRK 3:10 で実際に出力される値）。これらが WallaceGloss に未定義の
// まま素通しすると全て汎用 UNCLASSIFIED 文に潰れてしまうため、
// 同じ文体で補完エントリを追加した（WallaceGloss 本体は改変せず、
// 別定数としてマージしている）。
//
// 注記（CONDITION の到達経路）: classifyDiscourseRelation() は
// εἰ/ἐάν/ἀλλά を専用処理しないため、条件節・対比節の discourse.type は
// 常に 'UNCLASSIFIED' になる（ROM 1:10 で確認済み）。
// discourse.type 単独の lookup では WallaceGloss.CONDITION は
// 到達不能なデッドコードになってしまうため、clause.type
// （'clause.condition' / 'clause.contrast'）から対応する WallaceGloss
// キーへ橋渡しする小さなマップを追加した。これにより成功条件にある
// εἰ / ἀλλά も、汎用 UNCLASSIFIED 文ではなく専用の自然文になる。

const WallaceGloss = {
    DISCOURSE_EXPLANATION:
        'ここでは、前の内容がなぜ成立するのかという理由が説明されています。',

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
};

// WallaceGloss に無いが実際に出力される discourse.type への補完（同一文体）
const _GLOSS_TITLE = {
    ...WallaceGloss,
    TRUE_NARRATIVE: 'ここでは、背景となる出来事や状況が補足されています。',
    REASON:         'ここでは、理由にあたる内容が示されています。',
    SIMILE:         'ここでは、たとえを用いて説明されています。',
    TEMPORAL:       'ここでは、出来事の前後関係が示されています。',
    APPROX_CAUSE:   'ここでは、おおよその理由が示されています。',
};

// summary: 主語・分類語を避けた「少し自然化した1文」
// γάρ/ὅτι/ἵνα は仕様の ⭕ 例を逐語的に使用。他は WallaceGloss/_GLOSS_TITLE
// から確認済みの変換規則（先頭の「ここでは、」を外す）のみを機械的に適用し、
// 仕様に無い独自の言い回しは作らない。
const _GLOSS_SUMMARY = {
    DISCOURSE_EXPLANATION: '前の内容がなぜ成立するのかが説明されています。',
    CONTENT:                'その内容が具体的に明らかにされています。',
    PURPOSE:                'その目的として意図されていることが示されています。',
    COMPLEMENT:              'その内容が補足的に示されています。',
    EXPLANATORY_PURPOSE:     'その目的がより説明的に展開されています。',
    RESULT:                  'その結果が示されています。',
    CONDITION:               'ある条件が前提として提示されています。',
    CONTRAST_EXPLANATION:    '前の内容との対比が示され、話の方向が転換されています。',
    UNCLASSIFIED:            '状況や背景が補足されています。',
    TRUE_NARRATIVE:          '背景となる出来事や状況が補足されています。',
    REASON:                  '理由にあたる内容が示されています。',
    SIMILE:                  'たとえを用いて説明されています。',
    TEMPORAL:                '出来事の前後関係が示されています。',
    APPROX_CAUSE:            'おおよその理由が示されています。',
};

// discourse.type が UNCLASSIFIED になる clause.type を WallaceGloss の
// 対応キーへ橋渡しする（上の「CONDITION の到達経路」注記を参照）
const _CLAUSE_TYPE_TO_GLOSS_KEY = {
    'clause.condition': 'CONDITION',
    'clause.contrast':  'CONTRAST_EXPLANATION',
};

class ReadingFormatter {
    constructor() {}

    // -----------------------------------------------------------------
    // 公開API — AnnotationMapper item / StudyPanelAdapter clauseCard
    // item / ReadingNoteLibrary output のいずれも受け取れる
    // （.discourse を持たない入力は UNCLASSIFIED 相当として扱う）
    // -----------------------------------------------------------------
    format(item) {
        const discourseType = item?.discourse?.type ?? null;
        const confidence    = item?.discourse?.confidence ?? 0;
        const clauseType    = item?.type ?? item?.label ?? null;

        const key = this._resolveGlossKey(discourseType, clauseType);

        return {
            title:          _GLOSS_TITLE[key],
            summary:        _GLOSS_SUMMARY[key],
            hint:           this._getHint(),
            confidenceText: this._getConfidenceText(confidence),
        };
    }

    // discourse.type が具体的な値を持つ場合はそれを優先し、
    // UNCLASSIFIED（または未知）の場合のみ clause.type 橋渡しを試みる
    _resolveGlossKey(discourseType, clauseType) {
        if (discourseType && discourseType !== 'UNCLASSIFIED' && _GLOSS_TITLE[discourseType]) {
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
// § 7. Phase 11D — ReadingNoteLibrary（読書体験のための意味記憶レイヤー）
// =====================================================================
//
// AnnotationMapper / StudyPanelAdapter / ReadingFormatter の出力を
// 「読書ノート」（ReadingNote）に変換するだけの読み取り専用レイヤー。
// 解析・再分類・confidence再計算は一切行わない。
//
// 注記（3種類の入力形状の橋渡し）: 仕様上 generateNote() は
// AnnotationMapper item / StudyPanelAdapter clauseCard item /
// ReadingFormatter output のいずれも受け取れることになっているが、
// ReadingFormatter.format() の戻り値（{title,summary,hint,confidenceText}）
// には discourse.marker も confidence の数値も id も存在しない
// （Phase 11C で意図的に剥ぎ取られているため）。そのため、
// item.discourse が無い場合は item.title / item.summary をそのまま
// label / text として再利用し（新たな分析はせず、既に完成している
// 自然文をそのまま転記するだけ）、marker由来の情報（type/confidence/id）
// は安全なデフォルト（'UNCLASSIFIED' / 0 / null）に倒す。
//
// 注記（マーカー表の補完）: ὅπως は registry 上 ἵνα と同一マーカー群
// （"lemmas": ["ἵνα","ὅπως"]）であるため目的ノートの表に同居させた。
// ἐάν は仕様の見出しに "εἰ / ἐάν" と明記されているため条件ノートの
// 表に含めた。ὡς/ὥσπερρ 等、仕様に明記の無いマーカーは
// UNCLASSIFIED 側のフォールバックに委ねる（独自の文言を捏造しない）。

const _NOTE_RULES_BY_MARKER = {
    'γάρ':        { label: '理由',        text: 'この節は前の内容の理由を説明しています' },
    'ὅτι':        { label: '内容 / 理由', text: 'この節は内容や理由を導きます' },
    'ἵνα':        { label: '目的',        text: 'この節は目的を示しています' },
    'ὅπως':       { label: '目的',        text: 'この節は目的を示しています' },
    'εἰ':         { label: '条件',        text: 'この節は条件を示しています' },
    'ἐάν':        { label: '条件',        text: 'この節は条件を示しています' },
    'ἀλλά':       { label: '対比',        text: 'ここで話題の流れが転換します' },
    UNCLASSIFIED: { label: '読書補助',    text: 'この節は文の補足情報です' },
};

// suggest() 用の軽量ヒント（generateNote() のラベル/本文とは独立した短文）
const _SUGGESTION_BY_MARKER = {
    'γάρ':  '理由として読むと流れが見えます',
    'ἵνα':  '目的と結果を区別してください',
    'ὅπως': '目的と結果を区別してください',
    'εἰ':   '条件節の範囲に注目してください',
    'ἐάν':  '条件節の範囲に注目してください',
};

class ReadingNoteLibrary {
    constructor() {}

    // -----------------------------------------------------------------
    // ① generateNote — 入力 → ノート生成
    // refs は元の clause/discourse オブジェクトが book/chapter/verse を
    // 持たないため、呼び出し側が文脈として渡す任意の第2引数。
    // -----------------------------------------------------------------
    generateNote(item, refs = {}) {
        const marker     = item?.discourse?.marker ?? null;
        const confidence = item?.discourse?.confidence ?? 0;
        const id         = item?.id ?? null;

        const rule = _NOTE_RULES_BY_MARKER[marker] ?? _NOTE_RULES_BY_MARKER.UNCLASSIFIED;

        return {
            id,
            type:  marker ?? 'UNCLASSIFIED',
            label: item?.title   ?? rule.label,
            text:  item?.summary ?? rule.text,
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
    /* 互換エイリアス */
    window.ClauseAnalyzer = ClauseAnalyzer;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ClauseAnalyzer, AnnotationMapper, StudyPanelAdapter, ReadingFormatter, ReadingNoteLibrary, PrecisionAudit, StabilityMonitor };
}
