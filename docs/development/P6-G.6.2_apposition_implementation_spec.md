# P6-G.6.2 — APPOSITION Implementation Specification

**Date:** 2026-08-25  
**Phase:** P6-G.6.2 — Repair Design (read-only)  
**Purpose:** Exact, line-referenced implementation instructions for P6-G.6.3  
**Constraint:** No production code changes in this document. Specification only.

---

## Overview

One file changes: `public/index.html`. Four targeted changes. No engine change.

| Change | File | Type | Lines (approx.) |
|--------|------|------|-----------------|
| 1 — New CSS rules | index.html | ADD | after ~4514 |
| 2 — Mobile CSS override | index.html | ADD | inside ~4515–4525 |
| 3 — New JS helper `_dgRenderAppositionSlot()` | index.html | ADD | ~12393 |
| 4 — APPOSITION detection in `_dgRenderMainLine()` | index.html | MODIFY | ~12292–12300 |

**Total:** 4 changes. `dg-engine.js`: zero changes.

---

## Change 1 — New CSS Rules

### Insert After

```css
.dg-cc-clause { /* inherits .dg-clause styles */ }
```

(currently ~line 4514)

### New CSS (3 rules)

```css
/* P6-G-4.4: APPOSITION parallel-segment notation */
.dg-appos-wrap {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
}
.dg-appos-head {
    font-family: var(--font-greek);
    font-size: 1rem;
    color: var(--text-main);
    white-space: nowrap;
    border-bottom: 1px dashed var(--text-sub);
    padding-bottom: 2px;
}
.dg-appos-appositive {
    font-family: var(--font-greek);
    font-size: .92rem;
    color: var(--text-main);
    white-space: nowrap;
    padding-top: 3px;
    opacity: .9;
}
```

### Verification

After applying, `grep -n "dg-appos" index.html` should return 3+ CSS lines and the JS usages added in Changes 3 and 4.

---

## Change 2 — Mobile CSS Override

### Insert Inside

```css
@media (max-width: 480px) {
    .dg-slot-text { font-size: .9rem; }
    .dg-slot { padding: .1rem .3rem; }
    ...
    .dg-cc-clause-label  { font-size: 8px; }
    /* ← INSERT BEFORE CLOSING BRACE */
}
```

(currently ~lines 4515–4525)

### New Lines to Insert (2 lines)

```css
    .dg-appos-head { font-size: .9rem; }
    .dg-appos-appositive { font-size: .82rem; }
```

---

## Change 3 — New Helper Function `_dgRenderAppositionSlot()`

### Insert Between

```javascript
    return zone;
}
/* ← end of _dgRenderSlotModZone() (~line 12392) */

/* ← INSERT HERE */

function _dgRenderAdvPhrases(advPhrases) {
/* ← start of _dgRenderAdvPhrases() (~line 12394) */
```

### New Function (complete)

```javascript
/* P6-G-4.4: APPOSITION — render head / appositive as parallel segments.
   node.children[0] = head NP, children[1] = appositive NP (SR-explicit; L-0 safe).
   Depth-1 only: inner nesting handled by displayText() flattening. */
function _dgRenderAppositionSlot(apposNode) {
    const children = apposNode.children || [];
    const headNode = children[0] || apposNode;   // safety: fallback to whole node
    const appNode  = children[1] || null;

    const wrap = document.createElement('div');
    wrap.className = 'dg-appos-wrap';

    const headEl = document.createElement('span');
    headEl.className = 'dg-appos-head';
    headEl.textContent = window.DgEngine.displayText(headNode);
    wrap.appendChild(headEl);

    if (appNode) {
        const appEl = document.createElement('span');
        appEl.className = 'dg-appos-appositive';
        appEl.textContent = window.DgEngine.displayText(appNode);
        wrap.appendChild(appEl);
    }
    return wrap;
}
```

### Preconditions

- `window.DgEngine.displayText` must be available (it is — exported at engine line 680)
- `apposNode.children` may be `undefined` for malformed nodes — `|| []` guard handles this
- `children[1] || null` guard: if only 1 child (degenerate SR), only head renders with dashed underline; no appositive span

---

## Change 4 — APPOSITION Detection in `_dgRenderMainLine()`

### Location

Inside `_dgRenderMainLine(slots)`, within the `for (const slot of baseSlots)` loop.

### Current Code Block (to be replaced)

```javascript
        const textEl = document.createElement('span');
        textEl.className = 'dg-slot-text';
        // P6-G-4: CC slot shows conjunction label; fallback to full text if no innerDR
        if (slot.contentClause && slot.contentClause.innerDR) {
            textEl.textContent = slot.contentClause.conjunction || '内容節';
        } else {
            // Use headDisplayText: excludes tokens belonging to extracted word-level modifiers
            textEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
        }
        slotEl.appendChild(textEl);
```

### Replacement Code Block

```javascript
        const textEl = document.createElement('span');
        textEl.className = 'dg-slot-text';
        // P6-G-4: CC slot shows conjunction label; fallback to full text if no innerDR
        if (slot.contentClause && slot.contentClause.innerDR) {
            textEl.textContent = slot.contentClause.conjunction || '内容節';
            slotEl.appendChild(textEl);
        } else if (slot.node?.construction?.canonical === 'APPOSITION') {
            // P6-G-4.4: APPOSITION — parallel segment notation (head / dashed / appositive)
            slotEl.appendChild(_dgRenderAppositionSlot(slot.node));
            // textEl created but not used — garbage collected
        } else {
            // Use headDisplayText: excludes tokens belonging to extracted word-level modifiers
            textEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
            slotEl.appendChild(textEl);
        }
```

### Diff Summary

- `slotEl.appendChild(textEl)` moves INSIDE each branch (CC and default)
- New `else if` branch added for APPOSITION detection
- CC behavior: unchanged
- Default behavior: unchanged
- APPOSITION: replaces textEl with `_dgRenderAppositionSlot(slot.node)` output

### Optional Chaining Note

`slot.node?.construction?.canonical === 'APPOSITION'` uses optional chaining. This is safe: if `slot.node` is null/undefined, the expression short-circuits to `undefined !== 'APPOSITION'` → falls through to default. The `?.` is defensive; in practice `slot.node` is always present for MAIN_FN slots (see deriveClauseCore, line 483: `mainSlots.push({fn, node: child, ...})`).

---

## Change Order

Recommended implementation order (within a single edit session):

1. **Change 1** (CSS) — establishes class names before JS uses them
2. **Change 2** (mobile CSS) — complete the CSS section
3. **Change 3** (JS helper) — add function before it's called
4. **Change 4** (JS detection) — call the helper from the render loop

---

## Verification Steps (Post-Implementation)

### Static

```bash
grep -c "dg-appos-wrap\|dg-appos-head\|dg-appos-appositive" public/index.html
# Expected: ≥8 (3 CSS rules × uses + JS helper × 2 + detection × 1)
grep -n "_dgRenderAppositionSlot" public/index.html
# Expected: 2 lines (definition + call site)
grep -n "APPOSITION" public/index.html
# Expected: existing _SD_CN_JA label + new detection branch
```

### No Engine Change

```bash
git diff public/core/dg-engine.js
# Expected: empty (no change)
```

### DOM Verification (browser)

Navigate to a verse known to have APPOSITION in DR (e.g., MAT 1:19 or MAT 2:3):

```javascript
// In browser console after loading MAT 1:19 in DG view:
document.querySelectorAll('.dg-appos-wrap').length
// Expected: ≥1

document.querySelector('.dg-appos-head').textContent
// Expected: head NP text (e.g., "Ἰωσήφ" or "ὁ βασιλεύς")

document.querySelector('.dg-appos-appositive').textContent
// Expected: appositive text (e.g., "ὁ ἀνὴρ αὐτῆς" or "Ἡρῴδης")
```

### CSS Computed Style

```javascript
// In browser console:
const h = document.querySelector('.dg-appos-head');
getComputedStyle(h).borderBottom
// Expected: contains "dashed"

const w = document.querySelector('.dg-appos-wrap');
getComputedStyle(w).flexDirection
// Expected: "column"
```

---

## Non-Changes (Confirmed)

The following are explicitly NOT changed in G-4.4:

| Location | Reason not changed |
|----------|--------------------|
| `dg-engine.js` — entire file | Renderer-only fix |
| `dg-engine.js` — MAIN_FN set | Not modified; APPOSITION routing unchanged |
| `dg-engine.js` — `extractSlotModifiers()` | Not modified; APPOSITION still returns null (modifiers: []) |
| `_dgRenderSlotModZone()` | Not modified; APPOSITION slots have modifiers:[] → no mod zone items |
| IO platform branch in `_dgRenderMainLine()` | Not modified; fn=IO filtered before baseSlots loop |
| `_dgRenderAdvPhrases()` | Not modified; APPOSITION in adv phrases still flat text |
| `_dgRenderClause()` | Not modified; CC sub-diagram loop already calls `_dgRenderMainLine()` which inherits APPOSITION detection |
| `_sdRenderNode()` (Structure Diagram) | Not modified; already has `_SD_CN_JA.APPOSITION = '同格'` |
| SR data | Not modified |
| DR schema | Not modified |

---

## L-0 Final Confirmation

```
Renderer reads: slot.node.construction.canonical === 'APPOSITION'  → SR explicit
Renderer reads: slot.node.children[0]                               → head NP (SR explicit)
Renderer reads: slot.node.children[1]                               → appositive NP (SR explicit)
Renderer calls: DgEngine.displayText(children[0])                   → token texts only
Renderer calls: DgEngine.displayText(children[1])                   → token texts only
Renderer infers: NOTHING                                            → L-0 SAFE
```

---

*P6-G.6.2 implementation specification. No production code changes.*
