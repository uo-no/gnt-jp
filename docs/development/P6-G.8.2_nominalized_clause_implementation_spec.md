# P6-G.8.2 — NOMINALIZED_CLAUSE Implementation Specification

**Date:** 2026-08-26  
**Phase:** P6-G.8.2 — Design  
**Purpose:** Exact code changes for P6-G.8.3 implementation  
**Target file:** `public/index.html` only  
**dg-engine.js:** NO CHANGES

---

## Summary: 3 Changes to index.html

| # | Location | Type | Size |
|---|----------|------|------|
| 1 | After `.dg-appos-appositive {}` block, before `@media` | CSS (desktop) | 9 lines |
| 2 | Inside `@media (max-width: 480px)` | CSS (mobile) | 1 line |
| 3 | In `_dgRenderMainLine()`, after APPOSITION branch | JS | 5 lines |

---

## Change 1: CSS — Desktop Bracket Styles

**Location:** `public/index.html`  
**Insert after:** `.dg-appos-appositive { ... }` block (currently ends at ~line 4537)  
**Insert before:** `@media (max-width: 480px) {` (currently at ~line 4538)

**Exact text to insert:**

```css
/* P6-G-8: NOMINALIZED_CLAUSE bracket notation */
.dg-nomc {
    font-family: var(--font-greek);
    font-size: 1rem;
    color: var(--text-main);
    white-space: nowrap;
}
.dg-nomc::before {
    content: '[';
    color: var(--text-sub);
    font-size: .85rem;
    margin-right: 1px;
}
.dg-nomc::after {
    content: ']';
    color: var(--text-sub);
    font-size: .85rem;
    margin-left: 1px;
}
```

**Verification after Change 1:** Open browser DevTools → Elements → inspect `.dg-nomc::before` pseudo-element. Check `content: "["` and `color: var(--text-sub)`.

---

## Change 2: CSS — Mobile Override

**Location:** `public/index.html`  
**Insert inside:** `@media (max-width: 480px) { ... }` block  
**Insert after:** `.dg-appos-appositive { font-size: .82rem; }` line (currently at ~line 4549)

**Exact text to insert:**

```css
    .dg-nomc { font-size: .9rem; }
```

**Result inside @media block (after change):**

```css
@media (max-width: 480px) {
    .dg-slot-text { font-size: .9rem; }
    .dg-slot { padding: .1rem .3rem; }
    .dg-adv-text { font-size: .8rem; }
    .dg-pp-prep { font-size: .85rem; }
    .dg-pp-np   { font-size: .8rem; }
    .dg-io-platform-text { font-size: .85rem; }
    .dg-io-stalk { height: .9rem; }
    .dg-cc-clause-attach { padding-left: .8rem; }
    .dg-cc-clause-label  { font-size: 8px; }
    .dg-appos-head { font-size: .9rem; }
    .dg-appos-appositive { font-size: .82rem; }
    .dg-nomc { font-size: .9rem; }    /* ← NEW */
}
```

---

## Change 3: JS — Renderer Branch

**Location:** `public/index.html`  
**Function:** `_dgRenderMainLine()` (currently at ~line 12302)  
**Insert after:** APPOSITION branch (`slotEl.appendChild(_dgRenderAppositionSlot(slot.node));`)  
**Insert before:** `else {` (default branch)

**Current code (lines ~12323–12330):**

```javascript
        } else if (slot.node?.construction?.canonical === 'APPOSITION') {
            // P6-G-4.4: APPOSITION — parallel segment notation (head / dashed / appositive)
            slotEl.appendChild(_dgRenderAppositionSlot(slot.node));
        } else {
            // Use headDisplayText: excludes tokens belonging to extracted word-level modifiers
            textEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
            slotEl.appendChild(textEl);
        }
```

**New code (with NOMINALIZED_CLAUSE branch inserted):**

```javascript
        } else if (slot.node?.construction?.canonical === 'APPOSITION') {
            // P6-G-4.4: APPOSITION — parallel segment notation (head / dashed / appositive)
            slotEl.appendChild(_dgRenderAppositionSlot(slot.node));
        } else if (slot.node?.construction?.canonical === 'NOMINALIZED_CLAUSE') {
            // P6-G-8: NOMINALIZED_CLAUSE — bracket notation (brackets via CSS ::before/::after)
            const nomcEl = document.createElement('span');
            nomcEl.className = 'dg-nomc';
            nomcEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
            slotEl.appendChild(nomcEl);
        } else {
            // Use headDisplayText: excludes tokens belonging to extracted word-level modifiers
            textEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
            slotEl.appendChild(textEl);
        }
```

**Note:** The `textEl` variable (created as `const textEl = document.createElement('span')` before the detection block) is NOT used in the NOMINALIZED_CLAUSE branch. It is created but not appended — this is the same pattern as the APPOSITION branch. The `textEl` is garbage-collected; no DOM leak.

---

## Full diff summary (index.html)

```
public/index.html
  CSS block:
    + 16 lines (desktop .dg-nomc rules)
    +  1 line  (mobile .dg-nomc override)
  JS block:
    +  5 lines (NOMINALIZED_CLAUSE branch in _dgRenderMainLine)
  Total: +22 lines

public/core/dg-engine.js
    0 changes
```

---

## Pre-implementation Checklist

Before implementing P6-G.8.3, verify:

- [ ] `git status` confirms only index.html and dg-engine.js are modified (pre-existing P6-G.6.3 changes)
- [ ] `.dg-nomc` class does NOT exist in current index.html (would indicate duplicate change)
- [ ] `_dgRenderMainLine` still has APPOSITION branch before default branch (line order as expected)
- [ ] `@media (max-width: 480px)` block ends after `.dg-appos-appositive` (insertion point confirmed)

---

## Post-implementation Verification (for P6-G.8.3)

### Step 1 — Static check
```bash
grep -n "dg-nomc" public/index.html
# Expected: CSS block (3 rules), @media line (1), JS branch (1)
```

### Step 2 — Gate chapter browser check

Navigate to each gate chapter with NOMINALIZED_CLAUSE in DR:

```
?book=MAT&ch=5&transA=STRUCTURAL   → 3 brackets expected (5:4, 5:6, 5:10)
?book=PHP&ch=2&transA=STRUCTURAL   → 1 bracket expected (2:13)
?book=ROM&ch=6&transA=STRUCTURAL   → 1 bracket expected (6:7)
```

### Step 3 — DOM query (MAT 5)
```javascript
document.querySelectorAll('.dg-nomc').length          // expect 3
document.querySelector('.dg-nomc').textContent        // expect: "οἱ πενθοῦντες," (NO brackets)
getComputedStyle(document.querySelector('.dg-nomc')).fontSize  // expect: 16px (1rem desktop)
```

### Step 4 — Regression check (MAT 5)
```javascript
document.querySelectorAll('.dg-appos-wrap').length    // expect: unchanged from pre-implementation
document.querySelectorAll('.dg-cc-clause').length     // expect: unchanged
document.querySelectorAll('.dg-conn-sp').length       // expect: unchanged
```

### Step 5 — Console
```
console.errors === 0
```

### Step 6 — Mobile (390px viewport)
```javascript
// Resize to 390px, navigate to MAT 5
document.querySelector('.dg-nomc')  // must be visible
getComputedStyle(document.querySelector('.dg-nomc')).fontSize  // expect: 14.4px (.9rem)
```

---

## Dg-engine.js — Confirmed No Changes

| Function | Status |
|----------|--------|
| `deriveDR()` / `deriveClauseCore()` | UNCHANGED |
| `headDisplayText()` | UNCHANGED |
| `displayText()` | UNCHANGED |
| `_extractContentClause()` | UNCHANGED |
| `_extractEmbeddedRelClauses()` | UNCHANGED |
| `MAIN_FN` set | UNCHANGED |

The renderer uses only the existing engine API (`headDisplayText`, `displayText`) with existing slot properties (`slot.node.construction.canonical`, `slot.headSIs`). No new engine methods or properties are required.

---

*P6-G.8.2 implementation specification. No production code changes. Read-only.*
