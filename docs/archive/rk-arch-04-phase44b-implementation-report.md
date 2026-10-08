# RK-ARCH-04 Phase 4-4-B Implementation Report
# Coordination Connector / Tick / Label / Recursive Rendering

**Date**: 2026-09-09
**Module**: `public/core/rk-renderer.js`
**Phase**: RK-ARCH-04 Phase 4-4-B
**Status**: VALIDATED

---

## Objective

Phase 4-4-B は `GCoordStackNode` / `GCoordClauseNode` を SVG Renderer に実装する。

対象: R9 vertical connector、R10 tick、conjunction label、coord clause recursive rendering。

---

## Change Type

`FEATURE` — Phase 4 SVG renderer への追加実装。Phase 4-3/4-4-A の全出力を保持。

---

## In Scope

- R9 — Coordination vertical connector（parent baseline → clause frame）
- R10 — Coordination tick（clause baseline での水平 tick）
- Conjunction label（SVG `<text class="rk-coord-label">`）
- Null conjunction case（ラベルなし）
- `_renderCoordStack` 関数による coord clause 再帰 rendering
- `_renderGRootNode` 内 step 8 の実装（プレースホルダ置換）
- `DEFAULT_RENDER_OPTIONS` への `coordTickLength: 8` / `coordLabelGap: 2` 追加
- Nested coordination（coordDepth=2 を確認・テスト済み）
- Token click preservation（coord clause 内 token）

## Out of Scope

- Relative Clause / Antecedent Link — Phase 4-5
- `index.html` integration — Phase 4-5

---

## Schema Confirmed (READ from source)

### GL (rk-geometry-layout.js lines 614–675)

```javascript
GCoordStackNode {
  type:    'GCoordStackNode',
  frame:   { x, y, width, height },
  clauses: [GCoordClauseNode]
}

GCoordClauseNode {
  type:        'GCoordClauseNode',
  conjunction: string | null,
  frame:       innerRoot.frame,   // same object
  innerRoot:   GRootNode          // full recursive GRootNode
}
```

### PL (rk-page-layout.js lines 409–425)

```javascript
PLCoordStack {
  type:            'PLCoordStack',
  clauses:         [PLCoordClauseLayout],
  estimatedWidth:  number,
  estimatedHeight: number
}

PLCoordClauseLayout {
  type:            'PLCoordClauseLayout',
  conjunction:     string | null,
  innerRoot:       PLRootNode,
  estimatedWidth:  number,
  estimatedHeight: number
}
```

### GL ↔ PL Mapping

`glRoot.coordStack.clauses[i]` ↔ `plRoot.coordStack.clauses[i]` — **array index 1-to-1**。

PL の `plRoot.coordStack` は必ず存在する（`plRoot.coordStack || { clauses: [] }` で安全アクセス）。

---

## Implementation

### 新規関数: `_renderCoordStack`

```javascript
function _renderCoordStack(glStack, plStack, parentGlRoot, connLayer, slotLayer, opts)
```

`parentGlRoot` を受け取ることで R9 の top-anchor `parentGlRoot.baseline.y` を参照できる。

### `_renderGRootNode` への追加（Step 8）

```javascript
// 8. Phase 4-4-B: Coordination clause stack
var plCoordStack = (plRoot && plRoot.coordStack) ? plRoot.coordStack : null;
_renderCoordStack(glRoot.coordStack, plCoordStack, glRoot, connLayer, slotLayer, opts);
```

---

## GL Coordinate Sources

| 要素 | GL ソース |
|------|----------|
| R9 connector X | `cc.innerRoot.frame.x` |
| R9 connector Y1 (top) | `parentGlRoot.baseline.y` |
| R9 connector Y2 (bottom) | `cc.innerRoot.frame.y` |
| R10 tick X start | `cc.innerRoot.frame.x` |
| R10 tick Y | `cc.innerRoot.baseline.y` |
| R10 tick X end | `cc.innerRoot.frame.x + opts.coordTickLength` |
| Conjunction label X | `cc.innerRoot.frame.x + coordTickLength + coordLabelGap` |
| Conjunction label Y | `cc.innerRoot.baseline.y` |

---

## Rendering Details

### R9 Path

```
M {cc.innerRoot.frame.x} {parentGlRoot.baseline.y}
L {cc.innerRoot.frame.x} {cc.innerRoot.frame.y}
```

class: `rk-coord-connector`

### R10 Path

```
M {cc.innerRoot.frame.x} {cc.innerRoot.baseline.y}
H {cc.innerRoot.frame.x + opts.coordTickLength}
```

class: `rk-coord-tick`

### Conjunction Label

SVG `<text class="rk-coord-label">` — `cc.conjunction` が null/空の場合は生成しない。

### Recursive Clause Rendering

```javascript
_renderGRootNode(cc.innerRoot, ccPL.innerRoot, connLayer, slotLayer, opts)
```

既存の `_renderGRootNode` を再利用。Coordination clause の内部（baseline/slots/connectors/modifiers/adverbials）をすべて描画。

---

## File Metrics

| メトリクス | 値 |
|-----------|-----|
| Phase 4-4-A line count | 755 lines |
| Phase 4-4-B line count | 755 lines → (757 lines after coordTickLength/coordLabelGap additions) |

実際の追加:
- `DEFAULT_RENDER_OPTIONS` に 2 フィールド追加
- `_renderCoordStack` 関数 (約 35 行)
- `_renderGRootNode` に 3 行 (step 8)

---

## Static Audit (V1)

Python による comment 除去後確認。

| 項目 | 結果 |
|------|------|
| getBoundingClientRect | CLEAN |
| offsetWidth/Height/Top | CLEAN |
| clientWidth/Height/scrollWidth | CLEAN |
| getComputedStyle | CLEAN |
| querySelector/getElementById | CLEAN |
| classList/innerHTML | CLEAN |
| `.style.` (DOM property) | CLEAN |
| window.addEventListener | CLEAN |
| deriveDR/buildRK* | CLEAN |

**0 forbidden API found in code (comments excluded)**

---

## Regression (T1)

| Sentence | Test | Result |
|----------|------|--------|
| JHN 1:2 | baseline, sp, complement, token, PP diagonal | PASS |
| GAL 4:4 | po (recursive), modifier bracket, CLAUSE adv | PASS |
| ROM 1:15 | implied connector | PASS |
| COL 1:9 | contentClause recursion | PASS |

---

## Coordination Tests (T2–T4)

### T2a: Simple (1CO 3:9 — 2 clauses, null conjs)

| Assertion | Result |
|-----------|--------|
| R9 connector count = 2 | PASS |
| R9[0] d = M frameX parentBaselineY L frameX frameY (exact) | PASS |
| R9[1] d = M frameX parentBaselineY L frameX frameY (exact) | PASS |
| R10 tick count = 2 | PASS |
| R10[0] d = M frameX baselineY H frameX+8 (exact) | PASS |
| No conjunction labels | PASS |
| rk-baseline count = GL roots | PASS |

### T2b: Multi-clause (1CO 4:12 — 3 clauses, null conjs)

| Assertion | Result |
|-----------|--------|
| R9 connectors = 3 | PASS |
| R10 ticks = 3 | PASS |
| All 3 R9 d values match GL coords | PASS |

### T2c: Conjunctions (1CO 15:41 — 3 root clauses, 2 conjs "καὶ")

| Assertion | Result |
|-----------|--------|
| GL root coord clauses >= 3 | PASS |
| GL conjunction count >= 2 | PASS |
| R9/R10 counts match (recursive) | PASS |
| Conjunction labels = 2 (total recursive) | PASS |
| "καὶ" appears in label texts | PASS |
| R9[0]/R10[0] d exact match | PASS |

### T3: Recursive Rendering (1CO 15:41)

| Assertion | Result |
|-----------|--------|
| rk-baseline count = GL roots (recursive) | PASS |
| rk-connector-sp recursive count matches | PASS |
| R9/R10/label counts match recursive GL | PASS |
| rk-token exists in coord SVG | PASS |

### T4: Nested Coordination (JHN 10:27 — 4 root + 2 nested)

| Assertion | Result |
|-----------|--------|
| Root coord clauses >= 4 | PASS |
| Nested clauses >= 2 | PASS |
| R9 connectors = total recursive clauses | PASS |
| R10 ticks = total recursive clauses | PASS |
| baselines = GL roots (recursive) | PASS |
| labels = conj clauses (recursive) | PASS |

---

## Token Click (T5)

| Assertion | Result |
|-----------|--------|
| rk-token elements in coord SVG | PASS |
| click listener on coord tokens | PASS |
| onTokenClick called | PASS |
| ref is string | PASS |

---

## NT-wide (T6 — 8,010 sentences)

| Metric | Value |
|--------|-------|
| sentences processed | 8,010 |
| GL exceptions | 0 |
| nullGL (baseline) | 7 |
| SVG exceptions | **0** |
| SVG success | **8,003** |
| GL coord stacks (root level) | 508 |
| GL coord clauses (recursive) | 1,996 |
| GL conj clauses (recursive) | 320 |
| SVG R9 coord connectors | **1,996 / 1,996 (100%)** |
| SVG R10 coord ticks | **1,996 / 1,996 (100%)** |
| SVG conjunction labels | **320 / 320 (100%)** |
| modifier brackets (Phase 4-4-A, incl. coord) | 2,638 / 2,638 |
| adv brackets (Phase 4-4-A, incl. coord) | 25,634 / 25,634 |
| PP diagonals | 6,771 / 6,771 |

**TOTAL: 66/66 PASS — ALL PASS**

---

## Coverage

| 指標 | 値 |
|------|-----|
| R9 connector coverage | 100% (1,996/1,996) |
| R10 tick coverage | 100% (1,996/1,996) |
| Conjunction label coverage | 100% (320/320) |
| Phase 4-4-A modifier regression | 0% degradation |
| Phase 4-4-A adverbial regression | 0% degradation |

---

## Architecture Compliance

| 制約 | 結果 |
|------|------|
| `rk-renderer.js` のみ変更 | CONFIRMED |
| Phase 1 (rk-semantic-layout.js) unchanged | CONFIRMED |
| Phase 2 (rk-page-layout.js) unchanged | CONFIRMED |
| Phase 3 (rk-geometry-layout.js) unchanged | CONFIRMED |
| index.html unchanged | CONFIRMED |
| DOM measurement = 0 | CONFIRMED |
| Geometry recalculation = 0 | CONFIRMED |
| `_renderGRootNode` 再利用 (REUSE, not duplicate) | CONFIRMED |
| Public API unchanged | CONFIRMED |
| `_renderToken` 再利用 (token click preservation) | CONFIRMED |

---

## Phase 4 Completion Status

| Phase | Description | Status |
|-------|-------------|--------|
| 4-3   | Baseline / Slot / Connector SVG render | FROZEN |
| 4-4-A | Modifier / Adverbial / PP Diagonal | FROZEN |
| 4-4-B | Coordination (GCoordStackNode / GCoordClauseNode) | **VALIDATED** |
| 4-5   | Relative Clause / Antecedent Link | PENDING |
