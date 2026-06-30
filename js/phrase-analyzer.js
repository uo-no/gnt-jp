/**
 * phrase-analyzer.js
 * Phrase Analysis Layer
 *
 * 目的:  SyntaxAnalyzer の per-token 結果を受け取り、
 *         句レベル構造 (PhraseResult) を生成する。
 * 依存:  phrase-registry.json (戦略データ)
 * 制約:  syntax-analyzer.js を変更しない
 *         syntax-registry.json を読まない
 *         Wallace 再分類・再スコアリングを行わない
 *         DOM / UI に依存しない
 * バージョン: 1.0.0
 */

'use strict';

// =============================================================
// § 1.  内部ユーティリティ
// =============================================================

function _topCandidate(result) {
    return result?.candidates?.[0] ?? null;
}

// =============================================================
// § 2.  PhraseAnalyzer クラス
// =============================================================

class PhraseAnalyzer {
    /**
     * @param {Object} phraseRegistry  phrase-registry.json を parse した plain object
     */
    constructor(phraseRegistry) {
        if (!phraseRegistry || typeof phraseRegistry.phrases !== 'object') {
            throw new Error(
                'PhraseAnalyzer: phraseRegistry must have a "phrases" object'
            );
        }
        this._registry = phraseRegistry.phrases;
    }

    /**
     * 句解析のエントリポイント。
     *
     * @param {Object} param0
     * @param {TokenEntry[]}              param0.tokens        節内全トークン
     * @param {(AnalysisResult|null)[]}   param0.syntaxResults tokens と平行な配列
     * @returns {PhraseResult[]}  start 昇順ソート済み
     */
    analyze({ tokens, syntaxResults }) {
        if (!Array.isArray(tokens) || !Array.isArray(syntaxResults)) return [];
        if (tokens.length !== syntaxResults.length) return [];

        const out = [];
        for (const [typeId, def] of Object.entries(this._registry)) {
            switch (def.strategy) {
                case 'dual_anchor':
                    out.push(...this._dualAnchor(typeId, def, tokens, syntaxResults));
                    break;
                case 'anchor_only':
                    out.push(...this._anchorOnly(typeId, def, tokens, syntaxResults));
                    break;
            }
        }
        return out.sort((a, b) => a.start - b.start);
    }

    // ==========================================================
    // § 2-A.  dual_anchor 戦略 — phrase.genitive_absolute
    // ==========================================================

    /**
     * 分詞 anchor と主語 anchor の最近傍ペアリングで句を生成する。
     * greedy: 分詞 anchor を順番に処理し、未使用の最近傍主語を割り当てる。
     * 同一主語が複数の分詞 anchor に使われることを防ぐ。
     *
     * 分詞 anchor: participle.genitive_absolute (threshold 以上)
     * 主語 anchor: genitive.absolute            (threshold * 0.7 以上)
     *   主語側の閾値を低めにするのは genitive.absolute の実測精度が
     *   participle.genitive_absolute より低いため。
     */
    _dualAnchor(typeId, def, tokens, syntaxResults) {
        const threshold = def.confidence_threshold ?? 0.70;
        const maxSpan   = def.max_span ?? 6;

        const ptcAnchors  = [];
        const subjAnchors = [];

        for (let i = 0; i < syntaxResults.length; i++) {
            const top = _topCandidate(syntaxResults[i]);
            if (!top) continue;
            if (top.id === 'participle.genitive_absolute' &&
                top.confidence >= threshold) {
                const t = tokens[i];
                ptcAnchors.push({
                    idx:        i,
                    confidence: top.confidence,
                    number:     t.number ?? '',
                    gender:     t.gender  ?? '',
                });
            }
            if (top.id === 'genitive.absolute' &&
                top.confidence >= threshold * 0.7) {
                const t   = tokens[i];
                const cls = String(t.class ?? '').toLowerCase();
                // P1: 冠詞は GA 主語に成り得ない
                if (cls === 'det' || cls === 'article') continue;
                // P2: 直前トークンが前置詞 → 前置詞支配属格は GA 主語でない
                if (i > 0 &&
                    String(tokens[i - 1].class ?? '').toLowerCase() === 'prep') {
                    continue;
                }
                subjAnchors.push({
                    idx:        i,
                    confidence: top.confidence,
                    number:     t.number ?? '',
                    gender:     t.gender  ?? '',
                    class:      cls,
                });
            }
        }

        if (ptcAnchors.length === 0 || subjAnchors.length === 0) return [];

        const results  = [];
        const usedSubj = new Set();

        for (const ptc of ptcAnchors) {
            let bestSubj = null;
            let bestDist = Infinity;

            for (const subj of subjAnchors) {
                if (usedSubj.has(subj.idx)) continue;
                const dist = Math.abs(ptc.idx - subj.idx);
                if (dist > maxSpan || dist >= bestDist) continue;
                // P3: number 一致チェック (両者が既知の場合のみ reject)
                if (ptc.number && subj.number &&
                    ptc.number !== subj.number) continue;
                // P4: gender 一致チェック (代名詞除く、両者が既知の場合のみ reject)
                const isPronoun =
                    subj.class === 'pron' || subj.class === 'pronoun';
                if (!isPronoun && ptc.gender && subj.gender &&
                    ptc.gender !== subj.gender) continue;
                bestSubj = subj;
                bestDist = dist;
            }

            if (!bestSubj) continue;
            usedSubj.add(bestSubj.idx);

            const avgConf = (ptc.confidence + bestSubj.confidence) / 2;
            results.push({
                type:       typeId,
                start:      Math.min(ptc.idx, bestSubj.idx),
                end:        Math.max(ptc.idx, bestSubj.idx),
                confidence: parseFloat(avgConf.toFixed(4)),
            });
        }

        return results;
    }

    // ==========================================================
    // § 2-B.  anchor_only 戦略 — phrase.attendant_circumstance
    // ==========================================================

    /**
     * SyntaxAnalyzer の候補を起点に、PhraseAnalyzer 側で構造確認を行う。
     *
     * 確認条件 (Wallace GGBB §45 最小条件):
     *   (1) token.mood === 'participle'
     *   (2) token.tense === 'aorist'
     *   (3) 同節内に aorist indicative または imperative の主動詞がある
     *
     * いずれかを満たさない場合は句を生成しない。
     */
    _anchorOnly(typeId, def, tokens, syntaxResults) {
        const threshold = def.confidence_threshold ?? 0.70;
        const results   = [];

        for (let i = 0; i < syntaxResults.length; i++) {
            const top = _topCandidate(syntaxResults[i]);
            if (!top) continue;
            if (top.id !== 'participle.adverbial_attendant') continue;
            if (top.confidence < threshold) continue;

            const token = tokens[i];

            if (token.mood !== 'participle') continue;
            if (token.tense !== 'aorist')    continue;

            const mainVerbIdx = this._findMainVerbIdx(tokens, i);
            if (mainVerbIdx < 0) continue;

            const mv      = tokens[mainVerbIdx];
            const mvMood  = mv.mood  ?? '';
            const mvTense = mv.tense ?? '';
            const validMain =
                mvMood === 'imperative' ||
                (mvMood === 'indicative' && mvTense === 'aorist');
            if (!validMain) continue;

            // 直前の καί / δέ があればスパンに含める
            let start = i;
            if (i > 0) {
                const prev      = tokens[i - 1];
                const prevClass = String(prev.class ?? '').toLowerCase();
                const prevLemma = (prev.lemma ?? prev.text ?? '').normalize('NFC');
                const isExtend  =
                    prevClass === 'conj' &&
                    (prevLemma === 'καί' || prevLemma === 'δέ' ||
                     prevLemma === 'Καί' || prevLemma === 'Δέ');
                if (isExtend) start = i - 1;
            }

            const end = mainVerbIdx;
            results.push({
                type:       typeId,
                start:      Math.min(start, end),
                end:        Math.max(start, end),
                confidence: parseFloat(top.confidence.toFixed(4)),
            });
        }

        return results;
    }

    // ==========================================================
    // § 2-C.  内部ヘルパー
    // ==========================================================

    /**
     * 節内で分詞でも不定詞でもない動詞の index を返す。
     * forward scan 優先 (付帯状況分詞は通常、主動詞の前に位置する)。
     *
     * @returns {number} 見つかった index。なければ -1。
     */
    _findMainVerbIdx(tokens, ptcIdx) {
        const isMainVerb = (t) =>
            Boolean(t.mood) &&
            t.mood !== 'participle' &&
            t.mood !== 'infinitive';

        for (let j = ptcIdx + 1; j < tokens.length; j++) {
            if (isMainVerb(tokens[j])) return j;
        }
        for (let j = ptcIdx - 1; j >= 0; j--) {
            if (isMainVerb(tokens[j])) return j;
        }
        return -1;
    }
}

// =============================================================
// § 3.  エクスポート
// =============================================================

if (typeof window !== 'undefined') {
    window.App              = window.App              || {};
    window.App.syntax       = window.App.syntax       || {};
    window.App.syntax.PhraseAnalyzer = PhraseAnalyzer;
    /* 互換エイリアス */
    window.PhraseAnalyzer = PhraseAnalyzer;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PhraseAnalyzer };
}
