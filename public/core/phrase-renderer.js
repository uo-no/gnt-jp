/**
 * phrase-renderer.js — Phrase Renderer v1（Stage A）
 *
 * 責務: Reading Engine が生成した Reading Japanese を句表示用に整形する。
 *        意味・語義・構造判断は行わない。
 *        （設計正典: docs/phrase-rendering.md §0）
 *
 * 規則（docs/phrase-rendering.md §2）:
 *   1. 冠詞（class=det）はスキップ
 *   2. 各語の日本語 = resolveWord(idx)。null は w.japanese || w.text へ fallback
 *   3. PP は前置詞トークンもスキップ（前置詞の意味は Engine が head に付ける）
 *   4. 語順は原文順。ただし NP のみ「head より後ろの属格修飾語 → 中心語」へ
 *      並べ替える（句種ごとの決まった整形であり意味判断ではない）
 *   5. 句末の文中機能助詞「を・は・が」を省略。「の」と PP 助詞
 *      （から・へ・と共に 等 = 前置詞の訳）は保持
 *   6. 引用範囲ガード（_trimPhraseEnd）は呼び出し側が適用し endIdx を渡す
 *
 * 入力は純粋データのみ。Engine / ContextBuilder を直接参照しない
 * （resolveWord は呼び出し側が Engine + ResolveContext を包んで渡す）。
 * Failure Mode: 例外・不備は null（静寂）。
 *
 * ══════════════════════════════════════════════════════════════════
 * Stage A [FROZEN 2026-07-17]
 *   基準値: NT 引用対象句 23,101 / 一致 2,163 / 変更 20,936 /
 *           新規沈黙 2（旧・冠詞ゴミのみ）/ 新引用の［冠詞］混入 0
 *   変更時は scripts/re-stageA-regression.cjs へ回帰ケース追加 →
 *   npm run test:re-stageA 全 PASS を確認すること。
 *   旧 renderPhraseJP / _PP_TRANS_JP（index.html）は比較・切戻し用に
 *   残置（新経路からは未参照）。削除判断は次 Stage 以降。
 * ══════════════════════════════════════════════════════════════════
 */

'use strict';

const PHRASE_RENDERER_VERSION = '1.0.1';

// 句末で省略する文中機能助詞（docs/phrase-rendering.md §2-5）。
// 「の」は連体機能のため常に保持。
// PP は句末省略を行わない: PP 内の格は前置詞に支配されており
// （ἐκ→から・ἐν→に・πρός+対格→を）文中機能ではなく句の構成要素。
// Engine 出力をそのまま引用する（Renderer は日本語を決めない）。
const _QUOTE_STRIP_FINAL    = new Set(['を', 'は', 'が', 'に']);
const _QUOTE_STRIP_FINAL_PP = new Set([]);

class PhraseRenderer {
    /**
     * 句の日本語引用を生成する。
     *
     * @param {Object} phrase   { type: 'NP'|'PP'|'PtcP'|'GenP', start, end, head }
     * @param {number} endIdx   引用終端（呼び出し側で _trimPhraseEnd 適用済み）
     * @param {Object[]} words  節の生トークン配列
     * @param {(idx: number) => string|null} resolveWord
     *        Engine 経由の Reading Japanese。null は fallback
     * @returns {string|null}   引用文字列。生成できなければ null（静寂）
     */
    static renderQuote(phrase, endIdx, words, resolveWord) {
        try {
            return PhraseRenderer._renderUnsafe(phrase, endIdx, words, resolveWord);
        } catch (_) {
            return null;
        }
    }

    static _renderUnsafe(phrase, endIdx, words, resolveWord) {
        if (!phrase || !Array.isArray(words)) return null;
        const start = phrase.start | 0;
        const end   = Math.min(endIdx | 0, words.length - 1);
        if (end < start) return null;
        const type = phrase.type || '';

        // ── 語の収集（冠詞スキップ・PP は前置詞スキップ） ──
        const items = [];   // { idx, ja, genitive }
        for (let i = start; i <= end; i++) {
            const w = words[i];
            if (!w) continue;
            const cls = (w.class || '').toLowerCase();
            if (cls === 'det') continue;                       // 規則1
            if (type === 'PP' && cls === 'prep') continue;     // 規則3
            let ja = null;
            if (typeof resolveWord === 'function') {
                try { ja = resolveWord(i); } catch (_) { ja = null; }
            }
            if (typeof ja !== 'string' || !ja) ja = w.japanese || w.text || '';
            if (!ja) continue;
            items.push({ idx: i, ja, genitive: (w.case || '') === 'genitive' });
        }
        if (items.length === 0) return null;

        // ── NP のみ: head より後ろの属格修飾語を中心語の前へ（規則4） ──
        let ordered = items;
        if (type === 'NP') {
            // 中心語 = 最初の非属格名詞（『〜の』関係文と同じ判定）。なければ並べ替えない
            let headPos = -1;
            for (let k = 0; k < items.length; k++) {
                const w = words[items[k].idx];
                if ((w.class || '') === 'noun' && (w.case || '') !== 'genitive') {
                    headPos = k; break;
                }
            }
            if (headPos >= 0) {
                const postGen = items.slice(headPos + 1).filter(x => x.genitive);
                if (postGen.length > 0 &&
                    postGen.length === items.length - headPos - 1) {
                    // head の後ろがすべて属格の場合のみ並べ替え（混在は原文順を維持）
                    ordered = [
                        ...items.slice(0, headPos).filter(x => !postGen.includes(x)),
                        ...postGen,
                        items[headPos],
                    ];
                }
            }
        }

        // ── 属格同格連鎖の「の」整形（規則4b） ──
        // Ἰησοῦ Χριστοῦ のような固有名詞の同格連鎖では、中間の「の」を落として
        // 名前として結合する（イエスのキリストの → イエスキリストの）。
        // 条件: 現語が名詞（代名詞は除外 —「私たちの」の の は所有で必須）で
        //       「の」で終わり、次の語も属格で原文上隣接し、
        //       現語か次語が固有名詞（type='proper'）であること。
        for (let k = 0; k < ordered.length - 1; k++) {
            const cur = ordered[k], nxt = ordered[k + 1];
            if (!cur.genitive || !nxt.genitive) continue;
            if (!cur.ja.endsWith('の') || cur.ja.length < 2) continue;
            const cw = words[cur.idx], nw = words[nxt.idx];
            if ((cw.class || '') !== 'noun') continue;
            if (nxt.idx !== cur.idx + 1) continue;
            if ((cw.type || '') !== 'proper' && (nw.type || '') !== 'proper') continue;
            cur.ja = cur.ja.slice(0, -1);
        }

        // ── 結合と句末助詞の省略（規則5・句種別） ──
        const stripSet = type === 'PP' ? _QUOTE_STRIP_FINAL_PP : _QUOTE_STRIP_FINAL;
        let quote = ordered.map(x => x.ja).join('');
        if (quote.length > 1 && stripSet.has(quote.slice(-1))) {
            quote = quote.slice(0, -1);
        }
        return quote || null;
    }
}

// ── グローバルエクスポート ─────────────────────────────────────────
if (typeof window !== 'undefined') {
    window.App = window.App || {};
    window.App.PhraseRenderer = PhraseRenderer;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PhraseRenderer, PHRASE_RENDERER_VERSION };
}
