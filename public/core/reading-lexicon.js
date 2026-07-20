/**
 * reading-lexicon.js — ReadingLexicon（Phase 4: Lexicon Layer）
 *
 * 責務: 語彙データの保持と lookup のみ。
 *   - 語義の選択（文脈判断）は行わない — Phase 5 Semantic の責務
 *   - 訳文の生成・表示判断は行わない
 *   - fetch しない（データは注入される）
 *
 * キー: lemmaId（bible_data トークンの token.lemmaId と同形。
 *       lexicon-lite.json / Abbott-Smith との結合キー）。
 *
 * 二層構造（Phase 4-C）:
 *   - 基本層: reading-lexicon-data.js（同期・軽量）
 *       glosses（語義候補: bible_data 実使用 → Abbott-Smith → gloss_ja）
 *       deponent
 *   - 補強層: enrich(liteData) で lexicon-lite（非同期・3MB 級）到着後に付与
 *       glossJa / abbottSmith 全文 / semanticDomains（ln・domains）
 *   enrich 前の lookup も安全（補強フィールドは null）。
 *
 * Failure Mode: 例外は投げない。不正入力・未登録 lemmaId は null。
 * 設計正典: docs/reading-lexicon.md
 */

'use strict';

const READING_LEXICON_VERSION = '1.1.0';

class ReadingLexicon {
    /**
     * @param {Object} data  reading-lexicon-data.js の内容（注入。fetch しない）
     *                       { version, entries: { lemmaId: {...} } }
     */
    constructor(data) {
        this._entries = (data && typeof data === 'object' && data.entries &&
                         typeof data.entries === 'object') ? data.entries : {};
        this._version  = data?.version ?? 0;
        this._enriched = null;   // lemmaId → { glossJa, abbottSmith, semanticDomains }
    }

    /**
     * lexicon-lite（assets/data/lexicon/lexicon-lite.json）の内容で補強する。
     * 何度呼んでも安全（最後の呼び出しが有効）。不正入力は無視。
     *
     * @param {Object} liteData  lemmaId キーの辞書
     *   （{ gloss_ja, abbottSmith, ln: [], domains: [] } を持つエントリ群）
     * @returns {number} 補強できたエントリ数（基本層と lemmaId が一致したもの）
     */
    enrich(liteData) {
        try {
            if (!liteData || typeof liteData !== 'object') return 0;
            const enriched = {};
            let count = 0;
            for (const lemmaId of Object.keys(this._entries)) {
                const lite = liteData[lemmaId];
                if (!lite || typeof lite !== 'object') continue;
                enriched[lemmaId] = Object.freeze({
                    glossJa:     typeof lite.gloss_ja === 'string' ? lite.gloss_ja : null,
                    abbottSmith: typeof lite.abbottSmith === 'string' ? lite.abbottSmith : null,
                    semanticDomains: Object.freeze({
                        ln:      Object.freeze(Array.isArray(lite.ln) ? lite.ln.slice() : []),
                        domains: Object.freeze(Array.isArray(lite.domains) ? lite.domains.slice() : []),
                    }),
                });
                count++;
            }
            this._enriched = enriched;
            return count;
        } catch (_) {
            return 0;
        }
    }

    /**
     * lemmaId を引いて語彙エントリを返す。
     *
     * @param {string} lemmaId  例: 'grc:G611'
     * @returns {{
     *     lemmaId: string,
     *     deponent: boolean,
     *     glosses: string[],                 // 語義候補（選択しない・返すだけ）
     *     glossJa: string|null,              // enrich 後のみ（lexicon-lite 代表訳）
     *     abbottSmith: string|null,          // enrich 後のみ（AS 全文）
     *     semanticDomains: { ln: string[], domains: string[] } | null, // enrich 後のみ
     * } | null}  未登録・不正入力は null。戻り値は凍結済み。
     */
    lookup(lemmaId) {
        if (typeof lemmaId !== 'string' || !lemmaId) return null;
        const e = this._entries[lemmaId];
        if (!e) return null;
        const x = this._enriched ? this._enriched[lemmaId] : null;
        return Object.freeze({
            lemmaId:  e.lemmaId ?? lemmaId,
            deponent: e.deponent === true,
            glosses:  Array.isArray(e.glosses) ? Object.freeze(e.glosses.slice()) : Object.freeze([]),
            glossJa:         x ? x.glossJa : null,
            abbottSmith:     x ? x.abbottSmith : null,
            semanticDomains: x ? x.semanticDomains : null,
        });
    }

    /**
     * 語義見出し(Display Label)を返す（Stage E・docs/display-label.md）。
     *
     * Display Label は「読む日本語(Engine.resolve)」でも「語義説明(gloss_ja)」でもない、
     * lemma 単位・文脈非依存・短い代表見出し（条件 L1〜L4）。
     * 源は glosses[0]（Phase 4-B の頻度順代表訳）。gloss_ja / resolve は使わない。
     *
     * @param {string} lemmaId
     * @param {Object} [context] 将来拡張用（文脈による見出し切替・Semantic 統合の余地）。
     *                           今回は一切参照しない（lemmaId のみで決定的・L4）。
     * @returns {string|null} 見出し。供給不能は null（呼び出し側が最小 fallback）
     */
    getDisplayLabel(lemmaId, context) {
        void context;   // 将来拡張用・今回未使用（決定性を保つ）
        if (typeof lemmaId !== 'string' || !lemmaId) return null;
        const e = this._entries[lemmaId];
        if (!e || !Array.isArray(e.glosses) || e.glosses.length === 0) return null;
        // 1. キュレーション label（将来）— 現状データには未定義
        // 2. glosses[0]（bible_data 実使用の最頻訳・文脈非依存の代表訳）
        const label = e.glosses[0];
        return (typeof label === 'string' && label) ? label : null;
    }
}

// ── グローバルエクスポート ─────────────────────────────────────────
if (typeof window !== 'undefined') {
    window.App = window.App || {};
    window.App.ReadingLexicon = ReadingLexicon;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ReadingLexicon, READING_LEXICON_VERSION };
}
