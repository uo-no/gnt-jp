# RK-ARCH-04 Phase 4-4-A Implementation Report
# Modifier Connector / Adverbial L-bracket / PP Diagonal

**Date**: 2026-09-09
**Module**: `public/core/rk-renderer.js`
**Phase**: RK-ARCH-04 Phase 4-4-A
**Status**: VALIDATED

---

## Objective

Phase 4-4-A は Phase 4-3（ベースライン・スロット・コネクタ）の上に Modifier connector、Adverbial L-bracket、PP diagonal を追加する。

---

## Change Type

`FEATURE` — Phase 4 SVG renderer への追加実装。Phase 4-3 の全出力を保持。

---

## In Scope

- `GModifierNode` の vertical bracket レンダリング（`_renderModifiers`）
- `GAdvPhraseNode` の L-bracket レンダリング（`_renderAdvLBracket`）
- PP: prepFrame foreignObject + diagonal line + NP content（`_renderPPAdv`）
- ADV: frame foreignObject + content（`_renderADVAdv`）
- CLAUSE/PARTICIPLE: L-bracket + inner diagram 再帰（`_renderClauseAdv`）
- 全アドバービアル型のコンテンツレンダリング（headTokens / textWrapBlock / FLAT_WRAP）
- トークンクリックハンドラ（modifier tokens + PP NP tokens）

## Out of Scope

- Coordination（GCoordStackNode, GCoordClauseNode, R9/R10）— Phase 4-4-B
- Relative Clause / Antecedent Link — Phase 4-5
- `index.html` integration

---

## Architecture Constraints Satisfied

| 制約 | 確認 |
|------|------|
| `rk-renderer.js` のみ変更 | CONFIRMED |
| `rk-semantic-layout.js`, `rk-page-layout.js`, `rk-geometry-layout.js`, `index.html`, `dg-engine.js` 変更なし | CONFIRMED |
| DOM 測定禁止（getBoundingClientRect, offsetWidth 等） | CONFIRMED — 検出 0 |
| 幾何学計算禁止（pipeline API: deriveDR, buildRK* 等） | CONFIRMED — 検出 0 |
| Renderer は DOM に append しない | CONFIRMED |
| GL = WHERE（座標）、PL = WHAT（コンテンツ）アーキテクチャ維持 | CONFIRMED |

---

## Implementation

### 新規関数（`rk-renderer.js` に追加）

| 関数 | 役割 |
|------|------|
| `_renderModifierContent(gMod, plMod, opts)` | modifier の content 要素生成（headTokens / FLAT_WRAP） |
| `_renderOneModifier(gMod, plMod, connLayer, slotLayer, opts)` | 1 modifier: bracket path + foreignObject |
| `_renderModifiers(gModifiers, plSlots, connLayer, slotLayer, opts)` | ModifierZone 全エントリを走査 |
| `_renderAdvLBracket(gAdv, cls, connLayer, opts)` | L-bracket SVG path（M anchorX topY L anchorX bottom L right bottom） |
| `_renderPPAdv(gAdv, plAdv, connLayer, slotLayer, opts)` | PP: L-bracket + diagonal + prep foreignObject + NP foreignObject |
| `_renderADVAdv(gAdv, plAdv, connLayer, slotLayer, opts)` | ADV: L-bracket + content foreignObject |
| `_renderClauseAdv(gAdv, plAdv, connLayer, slotLayer, opts)` | CLAUSE/PARTICIPLE: L-bracket + innerDiagram 再帰 |
| `_renderAdverbials(gAdvPhrases, plAdvPhrases, connLayer, slotLayer, opts)` | 全 adverbial を phraseType でディスパッチ |

### `_renderGRootNode` への追加（Steps 6–7）

```
// 6. Modifier connectors and content
_renderModifiers(glRoot.modifiers, plSlots, connLayer, slotLayer, opts);

// 7. Adverbial L-brackets, PP diagonals, and content
var plAdvPhrases = (plRoot && plRoot.advZone && plRoot.advZone.phrases) || [];
_renderAdverbials(glRoot.adverbials, plAdvPhrases, connLayer, slotLayer, opts);
```

### 主要設計決定

1. **Modifier bracket は VERTICAL line**: `bracketFrom.x === bracketTo.x === slotCenterX`（GL 設計から確認）
2. **PP diagonalLabel は plain string**: `plAdv.diagonalLabel`（例: "ἐν"）。トークンではなく span テキストとして render。click 不要。
3. **再帰カウント原則**: Renderer の再帰（ContentClause slots + CLAUSE/PARTICIPLE adverbials）と GL recursive count 関数を一致させる。coordStack は Phase 4-4-B まで除外。

---

## File Metrics

| メトリクス | 値 |
|-----------|-----|
| Phase 4-3 line count | 494 lines |
| Phase 4-4-A line count | 693 lines |
| 追加行 | +199 lines |

---

## Test Results

テストスクリプト: `scratchpad/test-rk-renderer-44a.js`

### T1: Phase 4-3 Regression

| Test | Result |
|------|--------|
| JHN 1:2 svg tag, baseline, sp/complement connector, foreignObject, rk-token | PASS |
| GAL 4:4 po connector count (recursive) | PASS |
| ROM 1:15 implied connector | PASS |
| COL 1:9 contentClause recursive count | PASS |

### T2: Modifier (GAL 4:4)

| Test | Result |
|------|--------|
| GL modifier entries >= 1 | PASS |
| GModifierNode schema: bracketFrom/bracketTo/frame | PASS |
| bracketFrom.x === bracketTo.x (vertical) | PASS |
| bracket path `d` matches GL coords | PASS |
| rk-modifier fo count = GL mods (recursive) | PASS |
| fo.x/y = GL frame.x/y | PASS |
| rk-modifier-content exists | PASS |
| 5 sentences multi-validation | PASS (10/10) |

### T3: Adverbial L-bracket (GAL 4:4)

| Test | Result |
|------|--------|
| bracketAnchorX/bracketTopY finite | PASS |
| adv bracket count = GL advs (recursive) | PASS |
| L-bracket M = bracketAnchorX/bracketTopY | PASS |
| L-bracket has 2 L segments | PASS |
| CLAUSE bracket class exists | PASS |
| ADV bracket rendered (ROM 1:8) | PASS |
| PARTICIPLE bracket rendered (ROM 1:20) | PASS |

### T4: PP (JHN 1:2 + ROM 1:7)

| Test | Result |
|------|--------|
| PP GL schema: diagonalFrom/To, prepFrame, npFrame | PASS |
| PL diagonalLabel = "ἐν" | PASS |
| PP L-bracket M = bracketAnchorX/bracketTopY | PASS |
| PP diagonal d matches GL diagonalFrom/diagonalTo exactly | PASS |
| PP prep fo.x/y = prepFrame.x/y | PASS |
| rk-pp-label textContent = diagonalLabel | PASS |
| PP NP fo.x/y = npFrame.x/y | PASS |
| ROM 1:7 FLAT_WRAP NP rendered | PASS |
| ROM 1:7 diagonal matches GL | PASS |

### T5: Token click

| Test | Result |
|------|--------|
| modifier tokens have click listeners | PASS |
| PP NP token has click listener | PASS |
| PP NP onTokenClick called with ref (string) | PASS |

### T6: NT-wide (8,010 sentences)

| Metric | Value |
|--------|-------|
| sentences processed | 8,010 |
| GL exceptions | 0 |
| nullGL (baseline) | 7 |
| SVG exceptions | 0 |
| SVG success | 8,003 |
| modifier nodes rendered (recursive) | 2,317 |
| modifier brackets rendered | 2,317 (100%) |
| adv nodes rendered (recursive, non-PP) | 16,926 |
| PP nodes rendered (recursive) | 5,929 |
| adv brackets rendered | 22,855 = 16,926 + 5,929 (100%) |
| PP diagonals rendered | 5,929 (100% of PP nodes) |

**TOTAL: 86/86 PASS — ALL PASS**

---

## Static Audit (V1)

| 項目 | 結果 |
|------|------|
| getBoundingClientRect | CLEAN |
| offsetWidth / offsetHeight / offsetTop / scrollWidth / clientHeight | CLEAN |
| getComputedStyle | CLEAN |
| getElementById / querySelector | CLEAN |
| classList / innerHTML | CLEAN |
| `.style.` (DOM property chain) | CLEAN |
| window.addEventListener | CLEAN |
| deriveDR / buildRKSemanticLayout / buildRKPageLayout / buildRKGeometryLayout | CLEAN |

Verification: Python-based comment stripping + regex — 0 forbidden API found.

---

## Corpus Statistics (Phase 4-4-A scope)

| 統計 | 値 |
|------|-----|
| Modifier nodes in scope (excl. coordStack) | 2,317 |
| Adverbial nodes non-PP (incl. inner diagrams, excl. coordStack) | 16,926 |
| PP nodes (incl. inner diagrams, excl. coordStack) | 5,929 |
| PP diagonals | 5,929 (every PP node has diagonalFrom/To) |

---

## Key Constraints Satisfied

| 制約 | 結果 |
|------|------|
| `rk-renderer.js` のみ変更 | CONFIRMED |
| Phase 4-3 回帰なし | CONFIRMED — T1 全 PASS |
| nullGL = 7 (baseline 維持) | CONFIRMED |
| SVG exceptions = 0 | CONFIRMED (8,003/8,003 success) |
| Modifier/Adv/PP bracket 100% rendering | CONFIRMED |
| 禁止 DOM API = 0 | CONFIRMED |

---

## Phase 4 Completion Status

| Phase | Description | Status |
|-------|-------------|--------|
| 4-3   | Baseline / Slot / Connector SVG render | FROZEN |
| 4-4-A | Modifier / Adverbial / PP Diagonal | **VALIDATED** |
| 4-4-B | Coordination (GCoordStackNode / GCoordClauseNode) | PENDING |
| 4-5   | Relative Clause / Antecedent Link | PENDING |
