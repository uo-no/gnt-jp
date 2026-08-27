# P6-G.6.2 — APPOSITION Repair Design

**Date:** 2026-08-25  
**Phase:** P6-G.6.2 — Repair Design (read-only)  
**Predecessor:** P6-G.6.1 APPOSITION Audit (PASS)  
**Constraint:** No production code changes. Design specification only.

---

## Dirty State at Design Start

```
git status --short:
 M public/core/dg-engine.js
 M public/index.html
 M scripts/output/re-stageB-audit.json
 M scripts/output/re-stageD-audit.json
 M scripts/output/wallace_coverage.json
 M scripts/output/wallace_coverage.md
```

G-4.3 changes present and intentional. Not touched during this design phase.

---

## 1. Candidate A vs E — Final Decision

P6-G.6.1 proposed two candidates (A and E) as equivalent alternatives. Both use parallel horizontal segments within the slot. This section formally picks one.

### Comparison

| Criterion | Candidate A (separate "=" element) | Candidate E (border-bottom on head span) |
|-----------|-----------------------------------|------------------------------------------|
| SR fidelity | ✅ Equal | ✅ Equal |
| RK/Leedy alignment | ✅ Uses explicit "═══" character | ✅ Dashed line — same RK "=" convention |
| Visual distinction from modifier | HIGH | HIGH |
| Existing DG visual vocabulary | — | ✅ Matches `dg-conn-implied` (`border-top: 1.5px dashed`) |
| DOM element count | +1 extra element per APPOSITION | Minimal — CSS only for connector |
| Implementation complexity | Slightly higher | Simpler |
| Connector regression risk | Equal | Equal |
| Mobile | Equal | Equal |
| Nested APPOSITION | Equal | Equal |
| L-0 | ✅ SAFE | ✅ SAFE |

### Decision: **Candidate E**

**Rationale:** `border-bottom: 1px dashed` on `.dg-appos-head` aligns with the existing dashed-line vocabulary (`dg-conn-implied` uses `border-top: 1.5px dashed var(--text-sub)`). Fewer DOM elements. The dashed line IS the structural separator — it does not need to be a separate element. Both candidates produce identical visual grammar; E is the simpler implementation.

---

## 2. First Principle Reaffirm

APPOSITION in SR expresses:

```
HEAD NP
  ↕ (co-referential — same entity, different description)
APPOSITIVE NP
```

This is NOT:
- Modifier (modifier is dependent; appositive is co-equal)
- PP relationship (PP is oblique; appositive is in the same syntactic slot)
- IO platform (IO is a different grammatical function)

Visual grammar requirement:

```
[head text      ]
─────────────────   ← dashed horizontal line (CSS border-bottom)
[appositive text]
[fn label       ]   ← 主語 / 目的語 / 補語
──────────────────  ← main baseline
```

The head and appositive are visually parallel (horizontal segments), NOT in a hierarchical/dependent relationship. This is preserved by Candidate E.

---

## 3. Visual Design (Candidate E — Final)

### Target Visual (desktop)

```
┌────────────────────────────────────────────────┐
│  main line (.dg-main-line; align-items: flex-end; border-bottom: 2px solid) │
│                                                │
│  ┌──────────────────┐  │  ┌───────────────┐   │
│  │ .dg-slot         │ sp  │ .dg-slot       │   │
│  │ ┌──────────────┐ │  │  │ ┌───────────┐ │   │
│  │ │.dg-appos-wrap│ │  │  │ │.dg-slot-  │ │   │
│  │ │ ┌──────────┐ │ │  │  │ │  text     │ │   │
│  │ │ │appos-head│ │ │  │  │ └───────────┘ │   │
│  │ │ │ (dashed  │ │ │  │  │ ┌───────────┐ │   │
│  │ │ │ border)  │ │ │  │  │ │.dg-slot-fn│ │   │
│  │ │ ├──────────┤ │ │  │  │ └───────────┘ │   │
│  │ │ │appos-appo│ │ │  │  └───────────────┘   │
│  │ │ │sitive    │ │ │  │                       │
│  │ │ └──────────┘ │ │  │                       │
│  │ └──────────────┘ │  │                       │
│  │ ┌──────────────┐ │  │                       │
│  │ │.dg-slot-fn   │ │  │                       │
│  │ └──────────────┘ │  │                       │
│  └──────────────────┘  │                       │
└────────────────────────────────────────────────┘
```

Because `.dg-main-line` uses `align-items: flex-end`, the APPOSITION slot (taller) rises upward from the baseline. The head NP appears highest, appositive below it, fn label at bottom — all above the main baseline. Adjacent non-APPOSITION slots bottom-align to the same baseline.

### Concrete Example

**MAT 1:19 — "Ἰωσὴφ ὁ ἀνὴρ αὐτῆς" (fn=SUBJECT)**

```
Ἰωσὴφ
──────────── (dashed; CSS border-bottom on .dg-appos-head)
ὁ ἀνὴρ αὐτῆς
   主語
──────────────────────────────────────────
                 (main baseline)
```

**MAT 2:3 — "ὁ βασιλεὺς Ἡρῴδης" (fn=SUBJECT)**

```
ὁ βασιλεύς
─────────────
Ἡρῴδης
   主語
──────────────────────────────────────────
```

---

## 4. HTML Structure — Final

### Current HTML (pre-fix)

```html
<div class="dg-slot dg-slot-subject">
  <span class="dg-slot-text">Ἰωσὴφ ὁ ἀνὴρ αὐτῆς</span>  <!-- flat text -->
  <span class="dg-slot-fn">主語</span>
</div>
```

### New HTML (APPOSITION case)

```html
<div class="dg-slot dg-slot-subject">
  <div class="dg-appos-wrap">
    <span class="dg-appos-head">Ἰωσὴφ</span>         <!-- children[0] -->
    <!-- dashed line: CSS border-bottom on .dg-appos-head -->
    <span class="dg-appos-appositive">ὁ ἀνὴρ αὐτῆς</span>  <!-- children[1] -->
  </div>
  <span class="dg-slot-fn">主語</span>               <!-- unchanged -->
</div>
```

**Unchanged:** `.dg-slot` outer element, class `dg-slot-{fn}`, `.dg-slot-fn`.  
**Replaced:** `.dg-slot-text` → `.dg-appos-wrap` + children.  
**New classes:** `.dg-appos-wrap`, `.dg-appos-head`, `.dg-appos-appositive`.

### Non-APPOSITION slot (unchanged)

```html
<div class="dg-slot dg-slot-predicate">
  <span class="dg-slot-text">ἦν</span>
  <span class="dg-slot-fn">述語</span>
</div>
```

---

## 5. CSS Specification — Final

### New CSS Rules (4 rules)

```css
/* P6-G-4.4: APPOSITION parallel-segment notation */
.dg-appos-wrap {
    display: flex;
    flex-direction: column;
    align-items: stretch;   /* children fill wrap width → dashed line spans full width */
    gap: 0;
}
.dg-appos-head {
    font-family: var(--font-greek);
    font-size: 1rem;
    color: var(--text-main);
    white-space: nowrap;
    border-bottom: 1px dashed var(--text-sub);   /* the "=" connector */
    padding-bottom: 2px;
}
.dg-appos-appositive {
    font-family: var(--font-greek);
    font-size: .92rem;           /* slightly smaller to create visual hierarchy */
    color: var(--text-main);
    white-space: nowrap;
    padding-top: 3px;
    opacity: .9;                 /* slight differentiation from head */
}
```

### Mobile Override (inside existing `@media (max-width: 480px)`)

```css
    .dg-appos-head { font-size: .9rem; }
    .dg-appos-appositive { font-size: .82rem; }
```

### CSS Insertion Point

Insert new rules after:
```css
.dg-cc-clause { /* inherits .dg-clause styles */ }
```
(currently line 4514)

Insert mobile overrides inside the existing `@media (max-width: 480px)` block (currently ends at line 4525), before the closing `}`.

### Visual Vocabulary Consistency

| DG element | Visual separator | Color |
|------------|-----------------|-------|
| APPOSITION head | `border-bottom: 1px dashed var(--text-sub)` | text-sub |
| Implied copula connector | `border-top: 1.5px dashed var(--text-sub)` | text-sub |
| Adverbial clause left border | `border-left: 2px dashed var(--border-soft)` | border-soft |
| Relative clause left border | `border-left: 2px dashed var(--color-domain)` | domain purple |

APPOSITION uses the same dashed vocabulary as `dg-conn-implied` (verbless copula). Both signal "grammatical relationship without a visible verb/connector element". Visually consistent.

---

## 6. JavaScript Specification — Final

### New Helper Function: `_dgRenderAppositionSlot(apposNode)`

**Location:** Insert between `_dgRenderSlotModZone()` (currently ends ~line 12392) and `_dgRenderAdvPhrases()` (currently starts ~line 12394).

```javascript
/* P6-G-4.4: APPOSITION — render head/appositive as parallel segments.
   apposNode.children[0] = head NP, [1] = appositive NP (SR-explicit; L-0 safe). */
function _dgRenderAppositionSlot(apposNode) {
    const children = apposNode.children || [];
    const headNode = children[0] || apposNode;    // fallback: whole node if malformed
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

**Key points:**
- Uses `displayText()` (not `headDisplayText()`) for both children — children[0/1] are self-contained NP nodes; their full text is the correct display.
- `children[1] || null` guard: if SR somehow has only one child, only head renders (no dashed line for degenerate case; rare/impossible in NT data).
- No recursion: inner APPOSITION nesting (Pattern I) is handled by `displayText()` which flattens all tokens.
- No engine call: pure DOM construction from SR node data.

### Modified: `_dgRenderMainLine()` — APPOSITION detection branch

**Location:** Inside the `for (const slot of baseSlots)` loop, replace the current `textEl` block.

**Current code (~lines 12292–12300):**
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

**New code:**
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
    // textEl created but not appended — garbage collected
} else {
    // Use headDisplayText: excludes tokens belonging to extracted word-level modifiers
    textEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
    slotEl.appendChild(textEl);
}
```

**Change summary:** The `slotEl.appendChild(textEl)` is moved inside each branch. CC and default branches are unchanged in behavior. APPOSITION branch replaces textEl with `_dgRenderAppositionSlot()` output.

### Change Count

| File | Location | Change type |
|------|----------|-------------|
| `public/index.html` | CSS ~line 4514 | ADD 3 new CSS rules |
| `public/index.html` | `@media (max-width: 480px)` | ADD 2 mobile overrides |
| `public/index.html` | Between `_dgRenderSlotModZone` and `_dgRenderAdvPhrases` | ADD `_dgRenderAppositionSlot()` function |
| `public/index.html` | Inside `_dgRenderMainLine()` APPOSITION detection | MODIFY ~8 lines |
| `public/core/dg-engine.js` | — | **NO CHANGE** |

**Total: 4 targeted changes in index.html only. dg-engine.js untouched.**

---

## 7. Connector Alignment Analysis

`.dg-main-line` uses `align-items: flex-end` and `border-bottom: 2px solid`. All flex children (slots, connectors) bottom-align.

With APPOSITION slot (taller than adjacent slots):

| Connector | CSS | Behavior with tall APPOSITION slot |
|-----------|-----|-------------------------------------|
| `dg-conn-sp` (SUBJ\|PRED) | `align-self: stretch` | Stretches full slot height → spans from appos head to baseline ✅ |
| `dg-conn-po` (PRED\|OBJ) | `height: 45%; align-self: flex-end` | 45% of container height, bottom-anchored → correct ✅ |
| `dg-conn-complement` | `height: 36px; align-self: flex-end` | `::after` starts at `bottom: 0` → diagonal still connects at baseline ✅ |
| `dg-conn-implied` | `height: 36px; align-self: flex-end` | Same as complement → correct ✅ |

**No connector CSS change required.** The existing `align-items: flex-end` on `.dg-main-line` naturally accommodates taller APPOSITION slots. The `dg-conn-sp` stretch behavior is particularly correct — it should visually span the full APPOSITION slot height (both head and appositive), which it does via `align-self: stretch`.

**Risk note:** If an APPOSITION slot becomes extremely tall (>50px, e.g., very long head text wrapping), the `dg-conn-complement` and `dg-conn-implied` (fixed 36px height) might appear "too short" relative to the taller slot. Mitigation: test with longest observed appositive text; consider increasing `dg-conn-complement` height in mobile media query if needed.

---

## 8. Nested APPOSITION Design (Pattern I — 206 cases)

### Structure

```
DR slot node: APPOSITION (outer)
  children[0]: APPOSITION (inner) — e.g. "Ἰησοῦ χριστοῦ υἱοῦ Δαυίδ"
  children[1]: GENITIVE_MOD — e.g. "υἱοῦ Ἀβραάμ"
```

### Rendering Decision: Depth-1 (Non-recursive)

`_dgRenderAppositionSlot()` uses `displayText(children[0])` and `displayText(children[1])`. `displayText()` collects all descendant tokens as flat text — it does NOT call `_dgRenderAppositionSlot()` recursively.

Result for nested case:
```
[Ἰησοῦ χριστοῦ υἱοῦ Δαυίδ]     ← displayText(inner APPOSITION) = flat text
──────────────────────────────
[υἱοῦ Ἀβραάμ]                    ← displayText(GENITIVE_MOD) = flat text
   目的語 (or fn)
```

**Rationale for depth-1:**
1. The inner APPOSITION (children[0]) is itself a head of the outer — showing it as "head text" is semantically correct.
2. Infinite recursion risk is eliminated.
3. The 206 nested cases are mostly Χριστοῦ Ἰησοῦ chains where depth-1 flat text is an acceptable representation.
4. Deep visual nesting (head-within-head-within-appositive) would create extreme slot heights and be visually unusable on mobile.

**Future note:** If deep nested APPOSITION rendering is required, it can be added as a separate scope item. Depth-1 is the correct G-4.4 scope.

---

## 9. APPOSITION + Modifiers Co-existence (Pattern E — 301 cases)

### Structure

```
DR slot node: APPOSITION (fn=SUBJECT)
  children[0]: ARTICULAR_NP — head
  children[1]: GENITIVE_MOD — appositive expressed as genitive modifier
modifiers: []   (extractSlotModifiers returns null for APPOSITION)
```

### Rendering

`_dgRenderAppositionSlot()` uses:
- `displayText(children[0])` — full head NP text
- `displayText(children[1])` — full appositive text (even if internally a GENITIVE_MOD)

The appositive text correctly displays the full genitive appositive. No modifier zone entry. The modifier zone (`_dgRenderSlotModZone()`) sees `slot.modifiers = []` → no items.

**No special handling required.** `displayText()` correctly flattens both head and appositive regardless of their internal construction.

---

## 10. APPOSITION Inside PP (Pattern F — 253 cases) — Confirmed Excluded

Pattern F APPOSITION nodes have parent `cn=PREP_PHRASE`. These never reach DR main line slots — the PP renders as an adverbial phrase, and `displayText(pp_node)` collects all tokens including the buried APPOSITION.

**This design does not address Pattern F.** The PP diagonal correctly renders the preposition and governed NP. The governed NP may internally contain APPOSITION, but this is not distinguishable in the renderer without deeper SR tree extraction (which is outside G-4.4 scope).

**PP + APPOSITION co-existence (different structures):**

If a sentence has a SUBJECT (APPOSITION) AND a PP adverbial:
- Main line: SUBJECT slot gets APPOSITION rendering (parallel segments)
- Adv zone: PP adverbial shows diagonal notation

These are in separate DOM zones (`dg-main-line` vs `dg-adv-list`). No visual conflict.

---

## 11. APPOSITION fn=IO — Excluded (36 cases)

When `fn=INDIRECT_OBJECT` AND `cn=APPOSITION`:
- The slot is routed through the IO platform branch in `_dgRenderMainLine()`:
  ```javascript
  const ioSlots = slots.filter(s => s.fn === 'INDIRECT_OBJECT');
  const baseSlots = slots.filter(s => s.fn !== 'INDIRECT_OBJECT');
  ```
- IO APPOSITION goes to `ioSlots` → IO platform rendering → `headDisplayText(ioSlot.node, ioSlot.headSIs)` = flat text.
- The APPOSITION detection in `baseSlots` loop never sees fn=IO slots.

**No change to IO path.** The 36 IO APPOSITION cases remain as flat text in the IO platform. This is a known limitation, not a regression.

---

## 12. Mobile Design (390px)

### CSS Strategy

`white-space: nowrap` on both `.dg-appos-head` and `.dg-appos-appositive` prevents token-breaking. Long text causes horizontal scroll at the `.dg-main-line` level (which has `overflow-x: auto`). This is the same behavior as current long slot text.

### Interaction with Slot Column Layout

`.dg-slot` has `flex-shrink: 0` → slots don't compress. On 390px, if APPOSITION text is long, horizontal scroll activates on the clause level (`.dg-view` has `overflow-x: auto`).

### Mobile Font Sizes

```css
@media (max-width: 480px) {
    .dg-appos-head { font-size: .9rem; }       /* matches .dg-slot-text: .9rem */
    .dg-appos-appositive { font-size: .82rem; }
}
```

### Mobile-Specific Test Requirements

| Test | Expected |
|------|----------|
| "Ἰωσὴφ ὁ ἀνὴρ αὐτῆς" at 390px | Parallel segments visible; no overflow clipping |
| Long appositive (>40 chars) | Slot expands; main line scroll activates |
| APPOSITION + PP at 390px | Mod zone below renders correctly below main line |
| fn label preserved at mobile size | "主語" label visible below appositive |

---

## 13. Regression Baseline — Gate Chapter Measurements

The following baseline values must be confirmed BEFORE implementation and verified as unchanged AFTER implementation.

### Required Baseline Metrics (to measure before G-4.4)

| Chapter | IO count | PP diagonal | REL clause | CC (contentClause) | APPOSITION in DR | Console errors |
|---------|----------|-------------|-----------|---------------------|------------------|----------------|
| JHN 1 | 18 | 22 | 14 | known | ~3 | 0 |
| MAT 5 | 14 | 25 | known | known | ~1 | 0 |
| MAT 28 | 12 | known | known | known | ~1 | 0 |
| EPH 2 | 3 | known | known | known | ~4 | 0 |
| PHP 2 | 2 | known | known | known | ~2 | 0 |
| COL 1 | 5 | known | known | known | ~7 | 0 |
| ROM 6 | 9 | known | known | known | ~1 | 0 |

**APPOSITION in DR baseline (new metric for G-4.4):** Count `.dg-appos-wrap` elements per chapter after implementation. Before: 0 in all chapters. After: should match DR slot counts above.

### Representative Test Verses

| Pattern | Verse | Structure |
|---------|-------|-----------|
| B (proper noun) | MAT 1:19 | "Ἰωσὴφ ὁ ἀνὴρ αὐτῆς" fn=SUBJECT |
| C (articular) | MAT 2:3 | "ὁ βασιλεὺς Ἡρῴδης" fn=SUBJECT |
| C (articular) | MAT 1:2 | "τὸν Δαυὶδ τὸν βασιλέα" fn=OBJECT |
| B (proper noun) | MAT 11:? | Any "Ἰωάννης ὁ βαπτιστής" occurrence |
| E (with modifier) | MAT 4:21 | Any APPOSITION with GENITIVE_MOD |
| I (nested) | Any | Nested APPOSITION → flat text fallback |
| IO (excluded) | COL 1:3 | "τῷ θεῷ πατρί" fn=IO → unchanged flat text |

---

## 14. Scope Summary

### In Scope for G-4.4 Implementation

| Item | Coverage |
|------|----------|
| APPOSITION fn=SUBJECT main line | ~252 DR slots |
| APPOSITION fn=OBJECT main line | ~125 DR slots |
| APPOSITION fn=COMPLEMENT main line | ~28 DR slots |
| APPOSITION fn=AUX main line | ~26 DR slots |
| **Total** | **~431 main line slots** |

### Explicitly Out of Scope

| Item | Reason | Future scope? |
|------|--------|---------------|
| APPOSITION fn=IO (36) | IO platform separate path | Separate G-4.x |
| Buried APPOSITION (1,404) | SR-structural limit | Requires engine or SR change |
| APPOSITION in adv phrases (~19) | Adv phrase path separate | Low priority |
| Nested APPOSITION inner levels | Depth-1 rule | G-4.5 if needed |
| Pattern F (inside PP, 253) | All buried | PP extension |

---

## 15. Design Constraints Summary

| Constraint | Status |
|------------|--------|
| No dg-engine.js change | ✅ CONFIRMED — renderer-only |
| No SR change | ✅ CONFIRMED |
| No DR schema change | ✅ CONFIRMED |
| L-0 safe | ✅ CONFIRMED — SR children[0/1] are SSOT; no inference |
| APPOSITION ≠ MODIFIER | ✅ CONFIRMED — parallel segments, NOT modifier zone |
| Existing connectors preserved | ✅ CONFIRMED — no connector CSS change |
| Existing IO path preserved | ✅ CONFIRMED — fn=IO goes to IO branch, not modified |
| Existing CC path preserved | ✅ CONFIRMED — CC detection precedes APPOSITION check |
| Mobile-safe | ✅ CONFIRMED — white-space: nowrap + existing overflow-x: auto |

---

*P6-G.6.2 — read-only repair design. No production code changes.*
