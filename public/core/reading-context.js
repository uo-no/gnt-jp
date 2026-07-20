/**
 * reading-context.js — Reading Context Layer（Stage D）
 *
 * 責務: 節の文脈情報(構造情報)を一元的に生成・キャッシュし、ResolveContext を
 *        供給する。日本語生成・語義・表示・冠詞処理は行わない。
 *        （設計正典: docs/context-layer.md）
 *
 * 唯一の Context Source: Flow / StudyPanel / Phrase Reading / Presentation は
 *   すべて本層が供給する ResolveContext を(_buildReadingContext 経由で)共有する。
 *
 * 生成物 ResolveContext（現 _buildReadingContext とバイト等価）:
 *   { tokens, targetIdx, phrases, hasPassiveVerb, mainVerb, clause }
 *
 * 最適化(副次的成果・責務整理が最優先):
 *   節スコープ情報(phrases 等)を節につき 1 回計算し、語スコープ情報(mainVerb/
 *   clause)は所属節の代表 build から復元する。ContextBuilder.build の呼び出しを
 *   「節あたり n 回 → 節数 C 回 + range 外語数」へ削減。
 *
 * ContextBuilder の入出力仕様には触れない(呼び出し元として利用するだけ)。
 * Failure Mode: 例外・不備は null(呼び出し元が従来経路へ fallback できる)。
 *
 * ══════════════════════════════════════════════════════════════════
 * Stage D [FROZEN 2026-07-18]
 *   検証: 実ソース抽出比較（index.html __READING_CTX__ 抽出。監査に旧ロジックを
 *   書き写さない）。基準値:
 *     NT バイト等価 137,741/137,741(100%) / rcFallback 0(SSOT 維持) /
 *     ContextBuilder.build 137,741 → 30,499(77.86% 削減) / 表示差分 0 /
 *     全既存回帰 PASS
 *   変更時は scripts/re-stageD-regression.cjs へ回帰ケース追加 →
 *   npm run test:re-stageD 全 PASS を確認すること。
 *   バイト等価が絶対上位 — 崩れる語は per-token build fallback に落とす。
 *   経路 B(Wallace/projection)統合は将来課題(本層の対象外)。
 * ══════════════════════════════════════════════════════════════════
 */

'use strict';

const READING_CONTEXT_VERSION = '1.0.0';

class ReadingContext {
    constructor() {
        this._cache = null;   // { words, contexts: ResolveContext[] }
        this._CB    = null;   // 注入された ContextBuilder（Node テスト用）
        // 観測用カウンタ（表示に影響しない・Stage D レビュー反映）:
        //   rangeOuterBuild = _buildVerse で所属節が特定できず per-token build へ
        //   落ちた語数（設計上の正常経路・全体の 0.02% 程度）。将来の警告表示の土台。
        this._stats = { rangeOuterBuild: 0 };
    }

    /** ContextBuilder を注入する（省略時はブラウザの window.App.syntax.ContextBuilder） */
    setContextBuilder(cb) {
        this._CB = (cb && typeof cb.build === 'function') ? cb : null;
    }

    /** 観測用カウンタのスナップショット（監査・将来の警告表示用） */
    getStats() {
        return { rangeOuterBuild: this._stats.rangeOuterBuild };
    }

    _contextBuilder() {
        if (this._CB) return this._CB;
        if (typeof window !== 'undefined') {
            const cb = window.App && window.App.syntax && window.App.syntax.ContextBuilder;
            if (cb && typeof cb.build === 'function') return cb;
        }
        return null;
    }

    /**
     * 対象語の ResolveContext を返す（節キャッシュ経由）。
     * @param {Object[]} words  節トークン配列
     * @param {number}   idx    対象語インデックス
     * @returns {Object|null}   ResolveContext。生成不能は null
     */
    getContext(words, idx) {
        try {
            if (!Array.isArray(words) || !words[idx]) return null;
            if (!this._cache || this._cache.words !== words) {
                const contexts = this._buildVerse(words);
                if (!contexts) return null;
                this._cache = { words, contexts };
            }
            return this._cache.contexts[idx] || null;
        } catch (_) {
            return null;
        }
    }

    /**
     * 節の全語ぶんの ResolveContext を 1 パスで生成する。
     * @returns {Object[]|null}
     */
    _buildVerse(words) {
        const CB = this._contextBuilder();
        if (!CB) return null;

        // ── 節スコープ: 代表 build(idx=0) から phrases / clauses を取得 ──
        const base = CB.build(words[0], words, 0);
        const phrases = Array.isArray(base && base.phrases) ? base.phrases : [];
        const clauses = Array.isArray(base && base.clauses) ? base.clauses : [];
        const hasPassiveVerb = words.some(w =>
            (w.class || '') === 'verb' && (w.voice || '') === 'passive');

        // ── 各節の代表 build（節 start で 1 回。語スコープ mainVerb/clause 源）──
        //    clause.index == range 検索 が全 NT で 100% 一致（docs/context-layer.md §4）。
        const repByClauseIdx = new Map();
        for (const c of clauses) {
            if (!Number.isInteger(c.start) || c.start < 0 || c.start >= words.length) continue;
            repByClauseIdx.set(c.index, CB.build(words[c.start], words, c.start));
        }

        // ── 各語: 所属節の代表から語スコープを復元。range 外は per-token build ──
        const out = new Array(words.length);
        for (let k = 0; k < words.length; k++) {
            const ci = clauses.findIndex(c => k >= c.start && k <= c.end);
            let src;
            if (ci >= 0 && repByClauseIdx.has(clauses[ci].index)) {
                src = repByClauseIdx.get(clauses[ci].index);
            } else {
                src = CB.build(words[k], words, k);   // range 外 fallback（安全側・観測）
                this._stats.rangeOuterBuild++;
            }
            out[k] = ReadingContext._extract(words, k, phrases, hasPassiveVerb, src);
        }
        return out;
    }

    /** ResolveContext の抽出（現 _buildReadingContext と同一の純粋データ整形） */
    static _extract(words, idx, phrases, hasPassiveVerb, src) {
        return {
            tokens:    words,
            targetIdx: idx,
            phrases:   phrases,
            hasPassiveVerb: hasPassiveVerb,
            mainVerb: (src && src.mainVerb) ? {
                lemma:  src.mainVerb.lemma  || '',
                person: src.mainVerb.person || '',
                number: src.mainVerb.number || '',
                mood:   src.mainVerb.mood   || '',
            } : null,
            clause: (src && src.clause) ? {
                start: src.clause.start,
                end:   src.clause.end,
                subordinate: src.clause.subordinate === true,
            } : null,
        };
    }
}

// ── グローバルエクスポート ─────────────────────────────────────────
if (typeof window !== 'undefined') {
    window.App = window.App || {};
    window.App.readingContext = new ReadingContext();
    window.App.ReadingContext = ReadingContext;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ReadingContext, READING_CONTEXT_VERSION };
}
