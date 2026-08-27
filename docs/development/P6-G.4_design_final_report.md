# P6-G.4 — Design Final Report (G-4.2)

**Phase:** P6-G.4 (G-4.2 Repair Design Review)  
**Date:** 2026-08-25  
**Status:** COMPLETE — Read-only  
**Successor:** G-4.3 実装 (mandate必要)

---

## Decision

**PASS WITH LIMITATIONS**

設計レビュー全14項目 SAFE。実装可能。  
Limitations: 194 NOT_FOUND cases 未解決、connector gap 140件既知、CSS layout 設計決定要。

---

## Phase Summary

| Phase | Decision | Key Output |
|-------|----------|-----------|
| G-4.1 Root Cause Audit | PASS WITH LIMITATIONS | 736件の実測分類 (311+229+2+194)、routing誤謬否定、flat text問題確定 |
| G-4.2 Repair Design Review | **PASS WITH LIMITATIONS** | 14項目SAFE、実装仕様書、改訂テストマトリクス、本レポート |

---

## Confirmed Problem (from G-4.1)

P6-G.1 の「736件がadverbialClausesへ誤routing」は **不正確**。

実際の問題:

1. **Flat text rendering (542件):** CC fn=OBJ は `dr.slots[]` に OBJECT として正しく格納済み。しかし `headDisplayText(CC_node, null)` = `displayText(CC_node)` = 全トークン連結文字列として表示される。CC の内部節構造 (PREDICATE、OBJECT、ADVERBIAL) がサブダイアグラムとして描画されていない。

2. **Parent burial (145件):** CC は親clause (fn=OBJECT/null, cn=null) の slot 内に埋没。CC 自体は MAIN_FN branch を通過しない。既存 flat text で確認できるが、独立したサブダイアグラムなし。

3. **Deep invisibility (39件):** NOMINALIZED_CLAUSE / APPOSITION / ADJ_MOD 等の構造内に埋没。DR 描画経路に到達しない。

---

## Architecture Validated

```
SR
 └─ CONTENT_CLAUSE (fn=OBJECT)
       ├─ conjTok (CONJ morph)
       └─ inner_clause
 ↓
dg-engine.js: _extractContentClause(CC_node)
  → {conjunction: 'ὅτι', innerDR: deriveClauseCore(inner_clause)}
 ↓
DR_Slot: { fn: 'OBJECT', contentClause: {conjunction, innerDR} | null }
 ↓
index.html: _dgRenderMainLine()
  → slot text = conjunction (not flat text)
  _dgRenderClause() → .dg-cc-clause-attach + recursive _dgRenderClause(innerDR)
```

---

## 14 Review Points — Summary Table

| # | 項目 | 結論 | 根拠 |
|---|------|------|------|
| 1 | innerDR generation / DR SSOT | **SAFE** | `deriveClauseCore` はpure function; SR変更なし; P6-C precedent |
| 2 | 循環再帰なし | **SAFE** | SR is acyclic tree; 各再帰で strictly smaller subtree; NT max 2段ネスト確認済み |
| 3 | 同一node重複derive防止 | **SAFE** | direct children のみ処理; inner_clause は別subtree; seen-set不要 |
| 4 | CC内IO | **SAFE** | P6-G-2 の `_dgRenderMainLine` IO platform logic がinnerDR slots に適用 |
| 5 | CC内PP | **SAFE** | P6-F の `_dgRenderAdvPhrases` PP diagonal がinnerDR advPhrases に適用 |
| 6 | PP diagonal coexistence | **SAFE** | 独立パス (adverbialPhrases vs contentClause); CSS衝突なし |
| 7 | CC内relative clauses | **SAFE** | P6-C の embeddedRelClauses logic が `_dgRenderClause(innerDR)` で動作 |
| 8 | nested CONTENT_CLAUSE | **SAFE** | 再帰により両レベルで contentClause 設定; NT 6件 2段ネストすべて解決 |
| 9 | headDisplayText責務分離 | **SAFE** | `headDisplayText` 変更なし; renderer は additive if-else ブランチのみ |
| 10 | slot contract互換性 | **SAFE** | additive extension (P5-D-1, P6-C と同パターン); 既存consumer 無変更 |
| 11 | Mobile 390px | **SAFE** | 既存 CSS (font-size, overflow-x scroll) 継承; 新規 `@media` 追加のみ |
| 12 | SD fallback | **SAFE** | `_sdRenderNode` は SR直読; DR_Slot fields 未使用 |
| 13 | Structure Flow / DA / ICL | **SAFE** | ICL は SR node.id 経由; DG/DR と交差なし |
| 14 | L-0 | **SAFE** | CONJ morph チェック・inner clause 取得・SR token text表示 = すべて structural |

---

## Key Design Decisions (G-4.2 Findings)

### Finding A: Target count = 542 (not 540)
- G-4.1 final_report は "311 + 229 = 540" とした
- 実測: SLOT_IN_COORD 2件 も MAIN_FN branch を通過 → contentClause 設定対象
- 正: **542件 / 736件 (73.6%)**

### Finding B: No depth guard required
- SR is acyclic → 再帰は必ず終了
- NT maximum 2段ネスト (6件のみ); 3段以上は存在しない (CONFIRMED)
- depth guardはoption (malformed SR protection) だが必須ではない

### Finding C: 194 NOT_FOUND → correct fallback
- 145 buried: 親slot に CC が埋没 → `_extractContentClause(parent)` → cn=null → null → flat text (CORRECT fallback)
- 39 invisible: DR path 未到達 → `_extractContentClause` 未呼び出し → 表示なし (CORRECT)
- Mandate「取得不能なら既存flat表示へfallback」= CONFIRMED

### Finding D: Connector gap — not introduced, not fixed
- 140件 (SLOT_ROOT) の CC fn=OBJ slot が connector=null (IO 先行または OBJECT 先行)
- P6-G-4 は connector logic 変更しない → gap は継続 (known limitation)

### Finding E: fn scope = all CONTENT_CLAUSE in MAIN_FN
- `_extractContentClause` は `cn === 'CONTENT_CLAUSE'` のみを判定; fn 値を問わない
- CC fn=SUBJECT (26件), CC fn=COMPLEMENT (2件), CC fn=SECOND_OBJECT (17件) も対象
- これは cleaner かつ Reed-Kellogg的に correct (主語節・補語節も pedestal で表示)

---

## Scope Clarification

| 項目 | G-4.2 決定 |
|------|----------|
| G-4 主対象 | CC fn=OBJECT (736件) |
| 実際の適用範囲 | CC fn=any in MAIN_FN (OBJECT + SUBJECT + COMPLEMENT + SECOND_OBJECT) |
| NOT_FOUND 194件 | Out of scope; correct fallback |
| connector gap 140件 | Out of scope; known gap |
| CSS layout | New: `.dg-cc-clause-attach` etc. (spec 確定) |

---

## Implementation Scope (for G-4.3)

| File | Changes | Type |
|------|---------|------|
| `dg-engine.js` | `_extractContentClause()` helper追加 | FEATURE |
| `dg-engine.js` | `deriveClauseCore()` MAIN_FN branch 修正 | CORRECTNESS |
| `index.html` | `_dgRenderMainLine()` slot text 分岐 | CORRECTNESS |
| `index.html` | `_dgRenderClause()` CC sub-diagram loop | CORRECTNESS |
| `index.html` | CSS: `.dg-cc-clause-attach` / `.dg-cc-clause-label` / `.dg-cc-clause` | UX |

Not changing: `headDisplayText()`, `connectorBetween()`, `_extractEmbeddedRelClauses()`, SD, ICL, PP diagonal, IO platform.

---

## G-4.3 Entry Criteria

G-4.3 実装開始前の必須条件:

1. ✅ G-4.1 Root Cause Audit — PASS WITH LIMITATIONS (完了)
2. ✅ G-4.2 Repair Design Review — PASS WITH LIMITATIONS (本レポート)
3. ✅ 実装仕様書確定 (`P6-G.4_implementation_spec.md`)
4. ✅ テストマトリクス確定 (`P6-G.4_implementation_test_matrix.md`)
5. ☐ G-4.3 実装 mandate (ユーザーから明示的に)

---

## Limitations

1. **194 NOT_FOUND cases 未解決:** 145 buried + 39 invisible。これらは SR level の restructuring なしには解決できない。flat text fallback は正しい選択。

2. **Connector gap 140件:** CC fn=OBJ が IO の後に来る場合、connector=null。`connectorBetween('INDIRECT_OBJECT','OBJECT')` = null。P6-G-2 の IO extraction 後に connector 再計算すれば解決可能だが、G-4.3 スコープ外。

3. **CSS layout は実装時に視覚確認が必要:** spec で定義した `.dg-cc-clause-attach` の border / padding は机上設計。実ブラウザで多段ネスト・mobile・PP diagonal 共存を目視確認する。

4. **3件の implementation 変更ポイントがある:** 相互依存なし (Change 1→2 は engine 側; Change 3→4→5 は renderer 側)。独立して実装・テスト可能。

---

## Why PASS WITH LIMITATIONS (not PASS)

**PASSの根拠:**
- 14 review points 全 SAFE
- No blockers
- SR SSOT 維持
- L-0 SAFE
- 実装仕様書・テストマトリクス完成
- 既存全機能 (P6-G-2 IO, P6-F PP, P6-C rel) への regression なし

**LIMITATIONS の根拠:**
- 194 NOT_FOUND cases は本設計で未解決 (scope外、correct fallback)
- connector gap 140件は既知問題として継続
- CSS visual layout は実装時目視確認が必要 (机上確定のみ)
- G-4.1 最終報告の "540件" 表記 → 正しくは "542件" (軽微なcount差)

**BLOCKEDとしない理由:**
- 設計上の未解決技術的懸念は存在しない
- すべての安全性評価が完了し、実装パスが明確
- 14 review points のうち UNKNOWN または BLOCKED になったものは0件

---

## Absolutes Check

| Absolute | Status |
|----------|--------|
| `dg-engine.js` 変更禁止 (G-4.2) | ✅ NOT CHANGED (design only) |
| `index.html` 変更禁止 (G-4.2) | ✅ NOT CHANGED (design only) |
| SR 変更禁止 | ✅ NOT CHANGED |
| commit / merge / push / deploy 禁止 | ✅ NOT DONE |
| G-4.3 実装自動進行禁止 | ✅ STOPPED HERE |

---

## Documents Produced (G-4.2)

1. `P6-G.4_repair_design_review.md` — 14 review points 詳細評価
2. `P6-G.4_implementation_spec.md` — 実装仕様書 (5 changes, exact code)
3. `P6-G.4_implementation_test_matrix.md` — 改訂テストマトリクス (T-1〜T-14)
4. `P6-G.4_design_final_report.md` — 本レポート

---

## STOP

G-4.2 Repair Design Review 完了。

**Do not begin G-4.3 implementation. Do not auto-progress.**

---

*G-4.2 Design Review — **PASS WITH LIMITATIONS***
