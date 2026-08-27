# P6-G.8.1 — NOMINALIZED_CLAUSE Read-only Audit: Final Report

**Date:** 2026-08-26  
**Phase:** P6-G.8.1 — Read-only Audit  
**Predecessor:** P6-G.7 Remaining Visual Grammar Gap Reassessment (PASS WITH LIMITATIONS)  
**Constraint:** No production code changes made during this phase.

---

## Decision

> **PASS — Ready to proceed to P6-G.8.2 Design**

NOMINALIZED_CLAUSE is fully audited. All required data is confirmed. Engine change is NOT required. L-0 is SAFE. Three visual candidates are evaluated below. Design phase (P6-G.8.2) can begin.

---

## A. Audit Summary

### Confirmed Facts

| Fact | Value | Status |
|------|-------|--------|
| SR total | 2,008 | CONFIRMED |
| Gate SR | 47 | CONFIRMED |
| DR main slots | 271 (canonical: 276) | CONFIRMED |
| Gate DR | 5 (MAT 5:4, 5:6, 5:10 / PHP 2:13 / ROM 6:7) | CONFIRMED |
| Adv zone DR | 0 | CONFIRMED |
| Sub-type I (subst.ptc.) in DR | 237 (87.4%) | CONFIRMED |
| Sub-type II (art.inf.) in DR | 34 (12.6%) | CONFIRMED |
| Sub-type III (ὅτι/ἵνα) in DR | 0 | CONFIRMED |
| slot.contentClause for all NOMINALIZED_CLAUSE | null | CONFIRMED |
| slot.headSIs for all NOMINALIZED_CLAUSE | null | CONFIRMED |
| Engine change required | NO | CONFIRMED |
| L-0 status | SAFE | CONFIRMED |
| CONTENT_CLAUSE DR (for comparison) | 326 (100% hasInnerDR) | CONFIRMED |

### Key Findings

1. **NOMINALIZED_CLAUSE and CONTENT_CLAUSE are structurally distinct in DR.** CONTENT_CLAUSE has innerDR = full sub-diagram; NOMINALIZED_CLAUSE has contentClause = null. The bracket notation target for NOMINALIZED_CLAUSE does NOT require inner structure extraction or sub-diagram rendering.

2. **Sub-type distribution is clear.** DR instances are exclusively substantive participles (87%) and articular infinitives (13%). No ὅτι/ἵνα types reach DR main slots.

3. **Detection is SR-explicit.** `slot.node.construction.canonical === 'NOMINALIZED_CLAUSE'` is direct. No inference needed.

4. **Gate chapter coverage is real.** 5 gate DR instances in 3 gate chapters (MAT 5, PHP 2, ROM 6) — all substantive participles. Browser-verifiable after implementation.

5. **IO interaction noted but deferred.** 17 DR slots with fn=INDIRECT_OBJECT are NOMINALIZED_CLAUSE but render on the IO platform. Bracket addition for IO slots is a separate sub-concern; initial implementation targets only main line slots (fn=SUBJECT/OBJECT/COMPLEMENT/AUX = 254 slots).

---

## B. Visual Design Candidates

Three candidates are evaluated for the bracket notation.

---

### Candidate A — CSS Pseudo-element Brackets

**Implementation:**

```css
/* P6-G.8.2: NOMINALIZED_CLAUSE bracket notation */
.dg-nomc-wrap {
    display: inline;
    font-family: var(--font-greek);
    font-size: 1rem;
    color: var(--text-main);
    white-space: nowrap;
}
.dg-nomc-wrap::before { content: '['; color: var(--text-sub); }
.dg-nomc-wrap::after  { content: ']'; color: var(--text-sub); }
```

```javascript
// Renderer: wrap slot.node text in .dg-nomc-wrap span
const nomcEl = document.createElement('span');
nomcEl.className = 'dg-nomc-wrap';
nomcEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
slotEl.appendChild(nomcEl);
```

**Advantages:**
- Brackets rendered by CSS, not JS — bracket characters not in DOM text content
- `.textContent` of `.dg-nomc-wrap` = Greek text only (clean for copy)
- CSS `::before`/`::after` colors can be independently themed (e.g., muted bracket)
- Minimal DOM: 1 element per slot

**Disadvantages:**
- `::before`/`::after` are not selectable in copy-paste (bracket chars excluded from copy)
- Requires careful `white-space` management if text is long

**L-0:** SAFE. Bracket is CSS presentation. textContent = `headDisplayText()` output (unchanged).  
**DOM:** 1 span element, `className = 'dg-nomc-wrap'`  
**Mobile:** `font-size` override via `@media (max-width: 480px)` as needed  
**Regression risk:** LOW — additive CSS class, no existing class affected

---

### Candidate B — Text-prepend/append Brackets

**Implementation:**

```css
.dg-nomc-wrap {
    font-family: var(--font-greek);
    font-size: 1rem;
    color: var(--text-main);
    white-space: nowrap;
}
```

```javascript
const nomcEl = document.createElement('span');
nomcEl.className = 'dg-nomc-wrap';
const text = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
nomcEl.textContent = '[' + text + ']';
slotEl.appendChild(nomcEl);
```

**Advantages:**
- Bracket characters are IN the DOM text — fully selectable and copy-able
- Simpler CSS (no pseudo-elements)
- Bracket guaranteed to be visible even if CSS pseudo-elements are blocked

**Disadvantages:**
- Bracket characters in `.textContent` — if downstream code reads `.textContent`, it sees `[text]` not `text`
- Cannot independently style bracket vs. text (same text node)

**L-0:** SAFE. `headDisplayText()` output unchanged; brackets are added as presentation prefix/suffix.  
**DOM:** 1 span element, text content = `[` + headDisplayText + `]`  
**Regression risk:** LOW — additive, no existing class affected

---

### Candidate C — CSS Border-left (Visual Rail, No Bracket Character)

**Implementation:**

```css
.dg-nomc-wrap {
    display: inline-block;
    font-family: var(--font-greek);
    font-size: 1rem;
    color: var(--text-main);
    white-space: nowrap;
    border-left: 2px solid var(--text-sub);
    padding-left: 4px;
    padding-right: 4px;
}
```

```javascript
const nomcEl = document.createElement('span');
nomcEl.className = 'dg-nomc-wrap';
nomcEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
slotEl.appendChild(nomcEl);
```

**Advantages:**
- No bracket characters at all — purely visual
- Text content is clean
- Border-left matches the existing visual vocabulary (IO platform uses top border, APPOSITION uses border-bottom)

**Disadvantages:**
- Left border alone does NOT convey "bracket" — RK/Leedy tradition uses explicit `[...]`
- Reader may not recognize it as a clause marker without the closing `]`
- Ambiguous: border-left could be mistaken for indentation or emphasis

**L-0:** SAFE. Visual marker only — no inference about content.  
**RK/Leedy fidelity:** LOWER — does not match the RK bracket `[...]` convention  
**Regression risk:** LOW

---

## C. L-0 Audit — All Candidates

| Criterion | Candidate A | Candidate B | Candidate C |
|-----------|-------------|-------------|-------------|
| Detection source | SR SSOT (cn=NOMINALIZED_CLAUSE) | SR SSOT | SR SSOT |
| Inference required | No | No | No |
| Text content | headDisplayText() — unchanged | headDisplayText() — unchanged | headDisplayText() — unchanged |
| Bracket meaning | "slot = nominalized clause" — SR-explicit | same | "slot = clause" (visual only) |
| Inner structure exposed | No | No | No |
| L-0 status | **SAFE** | **SAFE** | **SAFE** |

All three candidates are L-0 SAFE. The bracket is a presentation signal, not a syntactic inference.

---

## D. Candidate Comparison

| Criterion | Candidate A | Candidate B | Candidate C |
|-----------|-------------|-------------|-------------|
| RK/Leedy fidelity | ★★★ (CSS bracket) | ★★★ (text bracket) | ★★ (border only) |
| DOM cleanliness | ★★★ (textContent = text only) | ★★ (textContent includes brackets) | ★★★ (textContent = text only) |
| CSS simplicity | ★★ (pseudo-elements) | ★★★ (no pseudo) | ★★★ (border) |
| Copy-paste behavior | Brackets excluded from copy | Brackets included in copy | No bracket chars |
| Visual clarity | ★★★ | ★★★ | ★★ |
| Mobile adaptability | ★★★ | ★★★ | ★★★ |

**Recommended:** Candidate A (CSS pseudo-element brackets).

Reasons:
1. Bracket characters not polluting `.textContent` — downstream code, search, and copy-paste receive clean Greek text.
2. Bracket appearance can be controlled independently (color, weight) via CSS.
3. RK/Leedy authentic — `[...]` is the standard bracket notation for clauses-as-nouns.
4. Consistent with existing dashed-line approach for APPOSITION (CSS-driven, not DOM-driven).

Candidate B is an acceptable alternative if the implementation team prefers bracket chars in DOM. Candidate C is not recommended — insufficient RK/Leedy fidelity.

---

## E. Implementation Scope (for P6-G.8.2 / P6-G.8.3)

### Files to change
- `public/index.html` — CSS + JS renderer only
- `public/core/dg-engine.js` — NO CHANGE

### Changes to index.html
1. **CSS** (after `.dg-appos-appositive` block):
   ```css
   /* P6-G.8: NOMINALIZED_CLAUSE bracket notation */
   .dg-nomc-wrap { font-family: var(--font-greek); font-size: 1rem; color: var(--text-main); white-space: nowrap; }
   .dg-nomc-wrap::before { content: '['; color: var(--text-sub); }
   .dg-nomc-wrap::after  { content: ']'; color: var(--text-sub); }
   ```

2. **Mobile CSS** (inside `@media (max-width: 480px)`):
   ```css
   .dg-nomc-wrap { font-size: .9rem; }
   ```

3. **JS detection branch** (in `_dgRenderMainLine()`, after APPOSITION branch):
   ```javascript
   } else if (slot.node?.construction?.canonical === 'NOMINALIZED_CLAUSE') {
       const nomcEl = document.createElement('span');
       nomcEl.className = 'dg-nomc-wrap';
       nomcEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
       slotEl.appendChild(nomcEl);
   } else {
       // existing default branch
   ```

**Total changes: 3 (CSS, mobile CSS, JS branch). All in index.html. No helper function needed (unlike APPOSITION which required _dgRenderAppositionSlot).**

---

## F. Gate Test Coverage

| Gate chapter | NOMINALIZED_CLAUSE in DR | Testable after implementation |
|-------------|-------------------------|-------------------------------|
| JHN 1 | 0 | Regression only (must NOT add bracket to other slots) |
| MAT 5 | 3 (5:4, 5:6, 5:10) | YES — primary test target |
| MAT 28 | 0 | Regression only |
| EPH 2 | 0 | Regression only |
| PHP 2 | 1 (2:13) | YES |
| COL 1 | 0 | Regression only |
| ROM 6 | 1 (6:7) | YES |

Browser verification chapters: MAT 5 (3 brackets), PHP 2 (1 bracket), ROM 6 (1 bracket).

---

## G. Mobile Specification

| Property | Value | Rationale |
|----------|-------|-----------|
| Base font-size | 1rem (16px) | Consistent with other slot text |
| Mobile font-size | 0.9rem (14.4px) | Matches .dg-appos-head mobile override |
| Bracket color | var(--text-sub) | Muted — indicates structure, not content |
| Bracket padding | none needed (pseudo-element) | Bracket chars naturally adjacent |
| white-space | nowrap | Consistent with other slot elements |
| Overflow behavior | Handled by existing `.dg-main-line` scroll | No slot-specific overflow needed |

---

## H. Deliverable Index

| Document | Status |
|----------|--------|
| `P6-G.8.1_nominalized_clause_audit.md` | ✅ Complete |
| `P6-G.8.1_nominalized_clause_relationship_matrix.md` | ✅ Complete |
| `P6-G.8.1_nominalized_clause_test_matrix.md` | ✅ Complete |
| `P6-G.8.1_nominalized_clause_final_report.md` | ✅ This document |

All 4 deliverables complete. No production code changes made during P6-G.8.1.

---

## I. Recommended Next Phase

**P6-G.8.2 — NOMINALIZED_CLAUSE Design Specification**

The implementation scope, candidate selection, CSS spec, JS insertion point, and mobile spec are all defined in this document. P6-G.8.2 may be abbreviated or merged into P6-G.8.3 if the recommendations above are adopted without modification.

If P6-G.8.2 proceeds as a design-only phase:
- Confirm Candidate A (CSS pseudo-element) or select alternative
- Finalize CSS property values
- Confirm JS insertion point (line reference in current index.html)
- Define exit criteria for P6-G.8.3

Do not begin P6-G.8.2 or any implementation from this document. This report is read-only.

---

*P6-G.8.1 read-only audit complete. STOP. Do not begin P6-G.8.2 or any implementation.*
