/**
 * reading-projection.js — Reading Support Projection（Phase 24）
 *
 * 目的:  Wallace-based Greek Syntax Engine（242 型）の解析結果を、
 *         StudyPanel が利用しやすい形へ整理する読み取り専用の射影。
 *
 * 責務:  「情報を整理して渡す」のみ。
 *         文章生成・説明・表示判断は一切行わない（設計理念正典 原則 1 /
 *         Phase 23.8 監査の B 案）。自然文の生成源は従来どおり
 *         ReadingFormatter ただ一つであり、本クラスはそれに関与しない。
 *
 * 保持してよいもの:  型 id・confidence・シグナル id・句の境界/ヘッド/従属語・
 *                     節の範囲/種類・関連型 id・検索引数（純粋データ）。
 * 保持してはいけないもの:  日本語文章・説明文（label_ja / hint_ja 等）・
 *                     Reading Note・Observation・Wallace 要約・HTML・UI 状態。
 *
 * 制約:  SyntaxAnalyzer / Registry / ReadingFormatter / UI を変更しない。
 *         副作用なし。入力不備・内部例外はすべて null（Failure Mode =
 *         「Projection が無い」だけ。UI は現状表示のまま）。
 * バージョン: 1.0.0
 */

'use strict';

const READING_PROJECTION_VERSION = 1;

/** 射影を凍結して読み取り専用にする（浅い階層構造のため再帰で十分） */
function _deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    for (const v of Object.values(obj)) _deepFreeze(v);
    return Object.freeze(obj);
}

/** candidate → 純粋データ（文章フィールドを持ち込まない） */
function _projectCandidate(c) {
    if (!c || typeof c.id !== 'string') return null;
    return {
        id:         c.id,
        category:   c.id.split('.')[0],
        confidence: typeof c.confidence === 'number' ? c.confidence : 0,
        signals:    Array.isArray(c.signals_matched)
            ? c.signals_matched.map(s => (s && s.id) ? s.id : String(s)).filter(Boolean)
            : [],
        wallaceRef: typeof c.wallace_ref === 'string' ? c.wallace_ref : '',
    };
}

/** RegistryLoader から型定義の alternatives（関連型 id）を読む（任意・失敗は空） */
function _relatedIdsOf(registry, typeId) {
    try {
        if (!registry || typeof registry.getTypesForCategory !== 'function') return [];
        const cat = String(typeId).split('.')[0];
        const def = (registry.getTypesForCategory(cat) || []).find(t => t.id === typeId);
        return Array.isArray(def?.alternatives) ? def.alternatives.slice() : [];
    } catch (_) {
        return [];
    }
}

/** token → syntax-search へ引き継げる純粋な検索引数 */
function _searchParamsOf(token) {
    const p = {};
    if (!token || typeof token !== 'object') return p;
    if (token.ref)    p.ref    = token.ref;
    if (token.lemma)  p.lemma  = token.lemma;
    if (token.class)  p.pos    = token.class;
    for (const k of ['case', 'mood', 'tense', 'voice', 'gender', 'number', 'person']) {
        if (token[k]) p[k] = token[k];
    }
    return p;
}

class ReadingSupportProjection {
    /**
     * 解析済みの素材から射影を組み立てる。新しい解析は行わない。
     *
     * @param {Object} args
     * @param {TokenEntry[]}            args.tokens         節トークン列
     * @param {(AnalysisOutput|null)[]} args.syntaxResults  tokens と平行な配列
     *                                  （sa.analyzeAll(words).results.map(r => r.output)）
     * @param {Array}  [args.clauseResults]   ClauseAnalyzer の結果（任意）
     * @param {Object} [args.contextBuilder]  ContextBuilder（Phrase API 供給源・任意）
     * @param {Object} [args.registry]        RegistryLoader（関連型 id 用・任意）
     * @returns {Object|null} 凍結済みの純粋データ。入力不備・例外は null
     */
    static build(args) {
        try {
            return ReadingSupportProjection._buildUnsafe(args || {});
        } catch (_) {
            return null;   // Failure Mode: 「Projection が無い」だけ
        }
    }

    static _buildUnsafe({ tokens, syntaxResults, clauseResults, contextBuilder, registry }) {
        if (!Array.isArray(tokens) || !Array.isArray(syntaxResults)) return null;
        if (tokens.length === 0 || tokens.length !== syntaxResults.length) return null;

        // ── Word 層: トークンと index 平行の射影 ─────────────────────
        const words = tokens.map((t, i) => {
            const cands = syntaxResults[i]?.candidates;
            if (!Array.isArray(cands) || cands.length === 0) return null;
            const top = _projectCandidate(cands[0]);
            if (!top) return null;
            // カテゴリごとの最上位（多層並走の素材・Phase 22 E2）
            const categories = {};
            for (const c of cands) {
                const cat = String(c.id ?? '').split('.')[0];
                if (cat && !categories[cat]) {
                    categories[cat] = {
                        id: c.id,
                        confidence: typeof c.confidence === 'number' ? c.confidence : 0,
                    };
                }
            }
            return {
                index:        i,
                ref:          tokens[i]?.ref ?? '',
                top,
                alternatives: cands.slice(1, 5).map(_projectCandidate).filter(Boolean)
                    .map(({ id, confidence }) => ({ id, confidence })),
                categories,
                relatedIds:   _relatedIdsOf(registry, top.id),
                searchParams: _searchParamsOf(tokens[i]),
            };
        });

        // ── Phrase 層: Context Engine の句検出を読むだけ ─────────────
        let phrases = [];
        let genitivePhrases = [];
        if (contextBuilder && typeof contextBuilder.build === 'function') {
            try {
                const ctx = contextBuilder.build(tokens[0], tokens, 0, registry);
                const proj = (p) => ({
                    type:       p.type,
                    start:      p.start,
                    end:        p.end,
                    head:       p.head,
                    headLemma:  p.headLemma ?? '',
                    case:       p.case ?? '',
                    gender:     p.gender ?? '',
                    number:     p.number ?? '',
                    dependents: Array.isArray(p.dependents) ? p.dependents.slice() : [],
                });
                phrases         = (ctx.phrases         ?? []).map(proj);
                genitivePhrases = (ctx.genitivePhrases ?? []).map(proj);
            } catch (_) {
                phrases = [];
                genitivePhrases = [];
            }
        }

        // ── Clause 層: ClauseAnalyzer 結果 + アンカーの clause.* 候補 ──
        const clauses = (Array.isArray(clauseResults) ? clauseResults : []).map(c => {
            const anchorIdx = Number.isInteger(c.anchor) ? c.anchor : -1;
            const anchorCands = (anchorIdx >= 0 && syntaxResults[anchorIdx]?.candidates) || [];
            const clauseCands = anchorCands
                .filter(x => String(x.id ?? '').startsWith('clause.'))
                .map(_projectCandidate).filter(Boolean);
            return {
                type:       c.type ?? '',
                start:      c.start,
                end:        c.end,
                anchor:     anchorIdx,
                confidence: typeof c.confidence === 'number' ? c.confidence : 0,
                top:          clauseCands[0] ?? null,
                alternatives: clauseCands.slice(1, 4)
                    .map(({ id, confidence }) => ({ id, confidence })),
            };
        });

        // ── Related 層: 節内で登場した関連型 id の集約 ────────────────
        const relatedSet = new Set();
        for (const w of words) {
            if (!w) continue;
            for (const id of w.relatedIds) relatedSet.add(id);
        }

        // ── metadata ─────────────────────────────────────────────────
        const analyzed = words.filter(Boolean);
        const confSum = analyzed.reduce((a, w) => a + w.top.confidence, 0);
        const candidateCount = tokens.reduce(
            (a, _, i) => a + (syntaxResults[i]?.candidates?.length ?? 0), 0);

        return _deepFreeze({
            version: READING_PROJECTION_VERSION,
            words,
            phrases,
            genitivePhrases,
            clauses,
            related: [...relatedSet],
            metadata: {
                tokenCount:           tokens.length,
                analyzedCount:        analyzed.length,
                candidateCount,
                averageTopConfidence: analyzed.length
                    ? Number((confSum / analyzed.length).toFixed(4)) : 0,
                clauseCount:          clauses.length,
                phraseCount:          phrases.length,
            },
        });
    }
}

// ── グローバルエクスポート ──────────────────────────────────────────
// ブラウザ（script タグ）用
if (typeof window !== 'undefined') {
    window.App = window.App || {};
    window.App.syntax = window.App.syntax || {};
    window.App.syntax.ReadingSupportProjection = ReadingSupportProjection;
}

// Node / テスト用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ReadingSupportProjection, READING_PROJECTION_VERSION };
}
