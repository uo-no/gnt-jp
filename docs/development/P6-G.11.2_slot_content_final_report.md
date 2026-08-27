# P6-G.11.2 — Slot Content Repair Design: Final Report

**Date:** 2026-08-26
**Phase:** P6-G.11.2 — Read-Only Design Audit
**Predecessor:** P6-G.11.1 (PASS WITH LIMITATIONS — gap confirmed non-intentional)
**Constraint:** READ-ONLY. No production code changes made.

---

## Decision

> **PASS**

The design for Option C (modified) is complete, safe, and fully specified. The implementation scope is minimal, bounded, and L-0 compliant. All 19 design audit items (A–S) are resolved. The repair can proceed to P6-G.11.3 (implementation).

---

## A. 現行 Gap の根本原因

**一点の欠陥:** `_extractContentClause(node)` 関数（dg-engine.js 行 186–207）。

```javascript
if ((node.construction && node.construction.canonical) !== 'CONTENT_CLAUSE') return null;
```

この一行が、MAIN_FN slot の slot node について「CONTENT_CLAUSE のみ innerDR を生成する」という条件を作り出している。

- SUBORDINATE_CLAUSE, PARTICIPIAL_CLAUSE, bare clause（no construction）, group の slot node → すべて null を返す
- これらの slot node の内部は engine の traversal から一切見えない

**根拠:** `_extractContentClause()` 自体が CONTENT_CLAUSE に対して innerDR を生成する実装を持っており、slot content の sub-DR 化はアーキテクチャ上すでに可能。他の clause 型が対象外なのは設計上の明示的除外ではなく、CONTENT_CLAUSE 実装時の construction-specific 記述が他の型を暗黙的に除外したことによる coverage omission。

---

## B. Option C の妥当性

Option C（A+B, NOMINALIZED_CLAUSE 除外）は妥当。

### A — Clause Constructions

| Construction | 根拠 | 安全性 |
|-------------|------|--------|
| SUBORDINATE_CLAUSE | `deriveFromNode()` 行 663 が同一パターンで処理済み — 実装済み先例あり | SAFE |
| PARTICIPIAL_CLAUSE | 同上（行 664） | SAFE |
| Bare clause（no cn） | `deriveClauseCore(node, null)` を直接呼ぶだけ — 最もシンプルな形 | SAFE |
| ~~NOMINALIZED_CLAUSE~~ | **除外。** renderer 行 12346 の bracket notation が contentClause=null の else 分岐で動作。contentClause を追加すると bracket notation が bypass される。mandate: "NOMINALIZED_CLAUSE bracketを壊さない" | 除外 |

### B — Group Slots

`deriveFromGroup(node, null)` は既存の P6-G.10.6 で実装・検証済み。group-type slot node に対して呼ぶだけ。`_isEmptyDR()` ガードで空 DR のケースをスキップ。

---

## C. 採用する具体的 Recursive Boundary

```
_extractContentClause(node) が innerDR を生成する対象:

  ◉ clause cn=CONTENT_CLAUSE     → 既存（unchanged）
  ◉ clause cn=SUBORDINATE_CLAUSE → 新規（Option A）
  ◉ clause cn=PARTICIPIAL_CLAUSE → 新規（Option A）
  ◉ clause cn=null (bare)        → 新規（Option A）
  ◉ group (any)                  → 新規（Option B）

  ✗ clause cn=NOMINALIZED_CLAUSE → 除外（bracket notation 保護）
  ✗ phrase.np (any cn)           → 除外（Class E）
  ✗ phrase.pp (any cn)           → 除外（Class E）
  ✗ phrase.adjp (any cn)         → 除外（Class E）
  ✗ token                        → 除外（recursion 不要）
```

この boundary は「SR の node type と construction を明示的に分類し、安全に sub-DR 化できる node type のみを対象にする」という mandate の要件を満たす。

---

## D. 対象 Node Type

| Node type | Construction | DR output | countFnInDR traversal | Label displayed |
|-----------|-------------|-----------|----------------------|-----------------|
| clause | CONTENT_CLAUSE | `contentClause.innerDR` (既存) | ✓ | conjunction or '内容節' |
| clause | SUBORDINATE_CLAUSE | `contentClause.innerDR` (新規) | ✓ | conjunction or '従属節' |
| clause | PARTICIPIAL_CLAUSE | `contentClause.innerDR` (新規) | ✓ | '分詞節' |
| clause | (none/bare) | `contentClause.innerDR` (新規) | ✓ | '節' |
| group | (any) | `contentClause.innerDR` (新規) | ✓ | '節グループ' |

---

## E. 対象外 Node Type

| Node type | Construction | Reason |
|-----------|-------------|--------|
| clause | NOMINALIZED_CLAUSE | Bracket notation 保護（mandate constraint） |
| phrase.np | any | Class E（phrase-type 内部構造の display semantics 未解決） |
| phrase.pp | PREP_PHRASE | Class E |
| phrase.adjp | any | Class E |
| token | (n/a) | Recursion 不要 |

---

## F. 変更予定ファイル

| ファイル | 変更内容 | 行数 |
|---------|---------|------|
| `public/core/dg-engine.js` | `_isEmptyDR()` 追加 + `_extractContentClause()` 拡張 + schema comment | +~32 lines |
| `public/index.html` | Label fallback: `conjunction \|\| label \|\| '内容節'`（2箇所） | 2 lines modified |

---

## G. 変更箇所

### dg-engine.js

1. **行 33–34:** contentClause schema comment を更新（`label: string|null` 追加）
2. **行 185 直前:** `_isEmptyDR(dr)` helper 関数を挿入
3. **行 186–207:** `_extractContentClause(node)` を完全に置き換え

**変更しない:** `deriveClauseCore()`, `deriveFromGroup()`, `deriveFromNode()`, `MAIN_FN` set, `_extractEmbeddedRelClauses()`, `extractSlotModifiers()`, その他すべての関数

### index.html

1. **行 12341:** `slot.contentClause.conjunction || '内容節'` → `slot.contentClause.conjunction || slot.contentClause.label || '内容節'`
2. **行 12677:** 同上

---

## H. 回帰リスク

| リスク | 深刻度 | 対策 |
|-------|--------|------|
| NOMINALIZED_CLAUSE bracket notation bypass | HIGH | 明示的に除外 — NOMINALIZED_CLAUSE は contentClause=null を維持 |
| APPOSITION slot rendering bypass | HIGH | phrase.np 型 — 除外 |
| CONTENT_CLAUSE 既存動作の変更 | MEDIUM | label:null 追加のみ — backward compatible |
| connector 生成への影響 | NONE | connector は outer slot fn のみ参照 |
| circular reference | NONE | SR は有向非巡回木 |
| token deduplication | NONE | countFnInDR は slot を数える、token を数えない |
| NT-wide derivation エラー | LOW | 同一コードパス（deriveClauseCore, deriveFromGroup）使用 |
| mobile overflow | LOW | 既存 dg-cc-clause-attach CSS が自動適用 |

---

## I. Projected Coverage

| 指標 | 現在 | 修復後（Option C modified） |
|-----|------|--------------------------|
| SR SECOND_OBJECT | 311 | 311（変化なし） |
| DR SECOND_OBJECT | 199 | **~276** |
| Coverage | 64.0% | **~88.7%** |
| 残存不可視（NOMINALIZED_CLAUSE） | — | 7 |
| 残存不可視（phrase-type, Class E） | — | 18 |
| 残存不可視（structural gap） | — | 9 |
| Gate FAIL chapters | MAT 5, EPH 2, COL 1 | **EPH 2 のみ** |

---

## J. L-0 判定

> **L-0: SAFE**

| 確認項目 | 判定 |
|---------|------|
| 意味論的推論の追加 | なし — SR explicit |
| 語彙的推論の追加 | なし |
| 付着（attachment）推論の追加 | なし — SR の fn-marking を読むだけ |
| SR source node の変異 | なし — deriveClauseCore は read-only |
| 新たな文法的主張 | SR に明示的にエンコードされた fn 値のみ |
| OBJECT2 専用の処理 | なし — generic extension |

---

## K. 必須成果物 Compliance

| 成果物 | ステータス |
|-------|----------|
| `P6-G.11.2_slot_content_repair_design.md` | ✅ 完了 |
| `P6-G.11.2_slot_content_implementation_spec.md` | ✅ 完了 |
| `P6-G.11.2_slot_content_test_matrix.md` | ✅ 完了 |
| `P6-G.11.2_slot_content_final_report.md` | ✅ 本文書 |
| production code 変更 | ✗ なし（READ-ONLY） |
| index.html 変更 | ✗ なし（READ-ONLY） |
| commit / merge / push / deploy | ✗ なし（STOP） |

---

## L. Mandate 遵守確認

| 絶対条件 | 遵守 |
|---------|------|
| SRを変更しない | ✓ |
| SRをSSOTとする | ✓ |
| rendererに統語推論を追加しない | ✓ |
| L-0を維持する | ✓ |
| OBJECT2専用hackにしない | ✓（generic extension） |
| Phrase-type slotは今回修正しない | ✓ |
| Structure Flowを変更しない | ✓ |
| Discourse Analysisを変更しない | ✓ |
| ICLを変更しない | ✓ |
| DAは現在非表示のまま | ✓ |
| 既存CONTENT_CLAUSE処理を壊さない | ✓（backward-compatible） |
| PP diagonalを壊さない | ✓（phrase.pp 除外） |
| IO platformを壊さない | ✓（IO rendering はioSlots使用） |
| APPOSITIONを壊さない | ✓（phrase.np 除外） |
| NOMINALIZED_CLAUSE bracketを壊さない | ✓（明示的除外） |
| 非DG章のSD fallbackを壊さない | ✓（deriveDR() 自体変更なし） |
| mobile 390pxを考慮する | ✓（既存CSS自動適用 + テスト定義） |
| NT-wide fallbackを保証する | ✓（deriveDR catchブロック維持） |
| 今回は実装しない（production code変更禁止） | ✓ |

---

## M. 設計上の制約と未解決事項

### M.1 NOMINALIZED_CLAUSE (7 cases)

NOMINALIZED_CLAUSE slot nodes は現フェーズでは対象外。将来 P6-G.11.x で対応する場合、renderer に以下の変更が必要:
- slot が NOMINALIZED_CLAUSE で contentClause を持つ場合、bracket notation と sub-diagram を共存させる表示パス
- 現在の else-if 構造（行 12343–12356）を contentClause 存在時にも bracket notation を表示するよう変更

### M.2 Depth-2 Nesting 自動処理

MAT 5:34 の解析で確認: `_extractContentClause()` の recursive call chain により、depth-2 以上の nesting も自動的に処理される。明示的な深度管理は不要。NT Greek の実際の構造深度（最大 2–3 レベル）では stack overflow の危険性はない。

### M.3 _isEmptyDR Guard の効果

`_isEmptyDR()` は group slot node が clause children を持たない場合（bare NP group など）に空 innerDR をスキップする。これにより、clause-type group slot（OBJECT が単純な名詞グループ）に対して誤った空の sub-diagram が生成されない。

---

*P6-G.11.2 完了。Decision: PASS。実装仕様確定。STOP — P6-G.11.3 への進行は明示的承認後。no implementation, no commit, merge, push, or deploy.*
