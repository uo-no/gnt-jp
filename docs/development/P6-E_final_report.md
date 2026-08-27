# P6-E — Final Report

**Phase:** P6-E — Visual Grammar Design  
**Date:** 2026-08-25  
**State:** AUDIT-COMPLETE  
**Decision:** PASS WITH LIMITATIONS

---

## Summary

P6-E は Reed-Kellogg / Leedy の基本原則を参考に、現在の SR + DG 上で実装可能な視覚文法の完成形を設計する監査フェーズ。

Production code への変更は一切なし。

---

## Phase 1–3 結果 (本セッション完了)

| フェーズ | 内容 | 結果 |
|---|---|---|
| Phase 1: CI確認 | path-check PASS / flow-dom 62/62 / stageB 27/27 | ✅ PASS |
| Phase 2: 目視確認 | 7章 DG正常 / relative connector動作 / DA hidden / errors=0 | ✅ PASS |
| Phase 3: Deploy判断 | CI PASS + 目視 PASS | **DEPLOY RECOMMENDED** |

---

## P6-E 監査スコープ確認

**15項目監査完了:**

| # | 項目 | 現在 | 判定 |
|---|---|---|---|
| 1 | Main line visual primacy | IMPLEMENTED (minor gap) | DEFERRED |
| 2 | Modifier attachment | IMPLEMENTED (L-bracket, not diagonal) | DEFERRED |
| 3 | Word-level modifier diagonal | PARTIAL | DEFERRED |
| 4 | Clause-level subordinate connection | IMPLEMENTED | DEFERRED |
| 5 | Coordination visual grammar | IMPLEMENTED | DEFERRED |
| 6 | Predicate complement vs object | **PASS** | PASS |
| 7 | Indirect object visual treatment | **GAP** (IO on main line) | P6-F |
| 8 | PP internal structure | PARTIAL (inline not diagonal) | P6-F |
| 9 | Participial attachment | IMPLEMENTED | CURRENT ACCEPTABLE |
| 10 | Relative clause connector | **IMPLEMENTED (P6-C)** | PASS |
| 11 | Infinitive / AcI structure | **GAP** (not rendered) | P6-F |
| 12 | Genitive modifier | IMPLEMENTED | CURRENT ACCEPTABLE |
| 13 | Greek word order preservation | PASS | PASS |
| 14 | L-0 / ambiguity boundary | PASS | PASS |
| 15 | DA integration余地 | DEFERRED | DEFERRED |

---

## データ実績 (NT-wide)

| 構造 | 件数 | 現在のカバレッジ |
|---|---|---|
| PREP_PHRASE (PP modifier) | 11,889 | PARTIAL (inline, not diagonal) |
| GENITIVE_MOD | 7,281 | IMPLEMENTED |
| SUBORDINATE_CLAUSE | 3,134 | IMPLEMENTED |
| INDIRECT_OBJECT fn | 2,662 | PARTIAL (on main line) |
| NOMINALIZED_CLAUSE | 2,008 | NOT RENDERED |
| APPOSITION | 1,890 | NOT RENDERED |
| RELATIVE connector | 947 | IMPLEMENTED (P6-C) |
| CONTENT_CLAUSE | 908 | PARTIAL (same as 従属節) |
| PARTICIPIAL_CLAUSE | 543 | IMPLEMENTED |

---

## P6-F 候補 (Priority Stack)

以下の順序で実装することを推奨する。すべて SR evidence が確認済みであり、L-0 リスクなし。

### P6-F-1: PP Diagonal Notation (Option B)

- 対象: 11,889 PREP_PHRASE
- SR: `extractPPStructure()` 既に実装済み
- 変更: `_dgRenderAdvPhrases()` 内の inline 表示を diagonal notation component に置換
- CSS: `.dg-pp-diag` (diagonal for prep) + `.dg-pp-np` (horizontal for NP)
- リスク: NONE — データ完備、レイアウト変更は限定的

### P6-F-2: Indirect Object Platform (Option A)

- 対象: 2,662 fn=INDIRECT_OBJECT
- SR: `fn.canonical='INDIRECT_OBJECT'` 識別済み
- 変更: `_dgRenderMainLine()` でIO slotを別経路へ分離 → `_dgRenderIOPlatform()`
- CSS: `.dg-io-platform` (raised horizontal) + `.dg-io-connector` (vertical from predicate)
- リスク: LOW — レイアウト変更は main line renderer のみ

### P6-F-3: Content Clause / ὅτι (Option C)

- 対象: 908 CONTENT_CLAUSE (fn=OBJECT/SUBJECT)
- SR: `construction.canonical='CONTENT_CLAUSE'` 識別済み
- 変更: `deriveClauseCore()` で CONTENT_CLAUSE 構造を DR に追加
- レンダリング: OBJECT slot 内に embedded proposition を表示
- リスク: LOW — SR construction type 明確

### P6-F-4: Nominalized Clause (Option D)

- 対象: 2,008 NOMINALIZED_CLAUSE
- SR: `construction.canonical='NOMINALIZED_CLAUSE'` 識別済み
- 変更: extractSlotModifiers() に NOMINALIZED_CLAUSE パスを追加
- リスク: LOW

### P6-F-5: Apposition (Option E)

- 対象: 1,890 APPOSITION
- SR: `construction.canonical='APPOSITION'` 識別済み
- 変更: 新規 apposition slot rendering
- リスク: NONE

---

## 不実施判定の項目

| 項目 | 理由 |
|---|---|
| True diagonal modifier lines (Items 2/3) | Layout engine rewrite required — cost too high |
| Rel-clause visual connecting line (Item 10) | Cross-block CSS line not feasible; text label sufficient |
| Participial head-noun connection (Item 9) | New syntactic inference required |
| Semantic genitive distinction | L-0 — theological judgment |
| DA discourse markers in DG | DA hidden; integration deferred |

---

## 混同禁止の確認

| 区別 | P6-E での判断 |
|---|---|
| データとして存在する | SR construction.canonical に全候補あり — CONFIRMED |
| 構造として表現できる | DR schema の拡張で実現可能 — IMPLEMENTABLE |
| 視覚文法として表現できる | Layout / CSS の制約内で可能なものとそうでないものを分離した |

特に:
- IO platform: データ ✅ 構造 ✅ 視覚 ✅ → P6-F-2
- PP diagonal: データ ✅ 構造 ✅ 視覚 ✅ → P6-F-1
- True modifier diagonal (token-level): データ ✅ 構造 ✅ 視覚 ❌ (layout制約) → 見送り
- Participial head-noun: データ ❌ (SR未完) 構造 ❌ 視覚 ❌ → 見送り

---

## Decision

```
PASS WITH LIMITATIONS
```

**PASS:** 15項目監査完了。現在の DG は R-K / Leedy の基本原則を Parts 1–5 で実装済み (主線・補語・関係節・分詞節・等位節)。P6-C relative connector は P6-E の一部として適切。

**LIMITATIONS:**
1. IO visual treatment (main line instead of platform) — P6-F-2
2. PP shown inline instead of diagonal notation — P6-F-1
3. CONTENT_CLAUSE / NOMINALIZED_CLAUSE / APPOSITION not rendered — P6-F-3/4/5

いずれも SR evidence が揃っており、L-0 リスクなし。実装は P6-F での承認を要する。

---

## 次のアクション (P6-F 開始条件)

P6-F を開始するには以下の全条件を満たすこと:

1. ✅ P6-E PASS WITH LIMITATIONS として承認済み
2. P6-F の Scope を明示的に定義する (どの Option を対象とするか)
3. SR schema 変更なし の確認
4. dg-engine.js への変更は P6-F の実装フェーズとして別 commit / 別 audit

**P6-E から P6-F へ自動進行しない。**

---

## 作成物

| ファイル | 内容 |
|---|---|
| `docs/development/P6-E_visual_grammar_gap_audit.md` | 15項目詳細監査 |
| `docs/development/P6-E_relationship_matrix.md` | SR construction → DG coverage マトリクス |
| `docs/development/P6-E_design_options.md` | Option A–E 設計案 (P6-F 向け) |
| `docs/development/P6-E_final_report.md` | 本報告 |

---

STOP.
