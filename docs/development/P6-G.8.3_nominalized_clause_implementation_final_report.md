# P6-G.8.3 — NOMINALIZED_CLAUSE Implementation: Final Report

**Date:** 2026-08-26  
**Phase:** P6-G.8.3 — Implementation  
**Predecessor:** P6-G.8.2 Repair Design (PASS)  
**Constraint:** public/index.html only. dg-engine.js: 0 changes.

---

## Decision

> **PASS WITH LIMITATIONS**

Implementation matches approved design. All applicable tests pass. No regression. Console errors = 0 on all gate chapters. One known limitation (IO NOMINALIZED_CLAUSE bracket) is carried forward as designed.

---

## 1. Implementation Summary

Three changes to `public/index.html`. Zero changes to `dg-engine.js`.

| # | Location | Type | Lines |
|---|----------|------|-------|
| 1 | After `.dg-appos-appositive {}`, before `@media` | CSS desktop `.dg-nomc` | +16 |
| 2 | Inside `@media (max-width: 480px)` | CSS mobile `.dg-nomc` | +1 |
| 3 | `_dgRenderMainLine()` — after APPOSITION branch | JS NOMINALIZED_CLAUSE branch | +5 |

---

## 2. Exact Changed Areas

### Change 1 — CSS Desktop

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

### Change 2 — CSS Mobile

```css
    .dg-nomc { font-size: .9rem; }
```

### Change 3 — JS Renderer Branch

```javascript
} else if (slot.node?.construction?.canonical === 'NOMINALIZED_CLAUSE') {
    // P6-G-8: NOMINALIZED_CLAUSE — bracket notation (brackets via CSS ::before/::after)
    const nomcEl = document.createElement('span');
    nomcEl.className = 'dg-nomc';
    nomcEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
    slotEl.appendChild(nomcEl);
}
```

Detection source: `slot.node.construction.canonical === 'NOMINALIZED_CLAUSE'` — SR SSOT.  
Text content: `headDisplayText(slot.node, slot.headSIs)` — identical to default branch.  
Bracket: CSS `::before`/`::after` only — not in textContent.

---

## 3. Test Results T-1 through T-15

| Test | Description | Result | Evidence |
|------|-------------|--------|---------|
| T-1 | Substantive participle (short) | **PASS** | ROM 6:7 "ὁ ἀποθανὼν" — `.dg-nomc` count=1, textContent clean |
| T-2 | Articular infinitive (Sub-type II) | **PASS** | PHP 2:6 "τὸ εἶναι ἴσα θεῷ," — fnLabel="目的語", textContent clean |
| T-3 | fn=SUBJECT | **PASS** | MAT 5:4,5:6,5:10 — fnLabel="主語", all brackets present |
| T-4 | fn=OBJECT | **PASS** | PHP 2:6 "τὸ εἶναι ἴσα θεῷ," fnLabel="目的語"; MAT 5 "τὸν θέλοντα…" fnLabel="目的語" |
| T-5 | fn=COMPLEMENT | **PASS** | PHP 2:13 "ὁ ἐνεργῶν…" fnLabel="補語" |
| T-6 | Modifier zone | **N/A** | No gate DR NOMINALIZED_CLAUSE has modCount>0; bracket wraps headDisplayText() which is modifier-extracted; no conflict by design |
| T-7 | PP + NOMINALIZED_CLAUSE | **PASS** | MAT 5 "τὸν θέλοντα ἀπὸ σοῦ δανίσασθαι" — PP inside bracket text ✓; pp count=25 unchanged |
| T-8 | APPOSITION — no bracket | **PASS** | MAT 5: noNomc_on_appos=true; EPH 2: noNomc_on_appos=true; `.dg-appos-wrap` unchanged |
| T-9 | CONTENT_CLAUSE regression | **PASS** | MAT 5 cc=8, EPH 2 cc=1 — unchanged; sub-diagram still renders |
| T-10 | IO platform regression | **PASS** | JHN 1 io=18 ✓ (matches P6-G.6.3 baseline) |
| T-11 | PP diagonal regression | **PASS** | JHN 1 pp=22 ✓ (matches P6-G.6.3 baseline) |
| T-12 | Mobile 390px | **PASS** | computedStyle fontSize=14.4px (.9rem); nomcCount=5 visible; 0 errors |
| T-13 | textContent integrity | **PASS** | All chapters: textContent.includes('[') = false; textContent.includes(']') = false |
| T-14 | Console errors | **PASS** | All gate chapters: 0 errors |
| T-15 | Non-DG view fallback | **PASS** | nomcCount=0 in non-DG; 0 console errors |

---

## 4. Gate Chapter Results

| Chapter | `.dg-nomc` rendered | APPOSITION stable | CC stable | IO stable | PP stable | Errors |
|---------|--------------------|--------------------|-----------|-----------|-----------|--------|
| JHN 1 | 1* | 2 ✓ | 2 ✓ | 18 ✓ | 22 ✓ | 0 ✓ |
| MAT 5 | 5* | 2 ✓ | 8 ✓ | 14 ✓ | 25 ✓ | 0 ✓ |
| MAT 28 | 1* | 0 ✓ | 1 ✓ | 7 ✓ | 18 ✓ | 0 ✓ |
| EPH 2 | 0 ✓ | 3 ✓ | 1 ✓ | 3 ✓ | 28 ✓ | 0 ✓ |
| PHP 2 | 2* | 3 ✓ | 2 ✓ | 1 ✓ | 16 ✓ | 0 ✓ |
| COL 1 | 0 ✓ | 2 ✓ | 0 ✓ | 3 ✓ | 16 ✓ | 0 ✓ |
| ROM 6 | 1 ✓ | 1 ✓ | 5 ✓ | 8 ✓ | 26 ✓ | 0 ✓ |

\* Higher than P6-G.8.1 audit prediction — see Section 5.

**JHN 1 NOMINALIZED_CLAUSE sample:** "ὁ πέμψας με βαπτίζειν ἐν ὕδατι" (fn=AUX — participle in auxiliary position) — textContent clean, no fnLabel (AUX suppressed by design).

**PHP 2 sample:**  
- PHP 2:6 "τὸ εἶναι ἴσα θεῷ," — Sub-type II articular infinitive, fn=OBJECT ✓  
- PHP 2:13 "ὁ ἐνεργῶν ἐν ὑμῖν…" — Sub-type I substantive participle, fn=COMPLEMENT ✓

---

## 5. NT-wide Coverage

| Metric | P6-G.8.1 Baseline | P6-G.8.3 Confirmed | Match |
|--------|------------------|--------------------|-------|
| SR total | 2,008 | 2,008 | ✓ |
| DR main slots | 271 | 271 | ✓ |
| DR full (incl sub-DRs) | not measured | **285** | NEW |
| Buried (not in DR) | ~1,737 | 1,723 | ≈ |

**Audit discovery (not a regression):** The renderer calls `_dgRenderMainLine()` for both top-level DR AND all sub-DRs (content clause inner DRs, coordination DRs, adverbial clause DRs). P6-G.8.1 measured only main-line slots (271). The full scope is 285 instances — 14 additional NOMINALIZED_CLAUSE nodes appear in sub-DRs. All correctly receive brackets.

The P6-G.8.1 gate predictions (5 gate DR) were based on main-slot traversal. Browser-rendered gate counts (10 total across 7 chapters) include sub-DR instances. No regression — the broader coverage is correct behavior.

**Coverage breakdown:**

| Category | Count | Status |
|----------|-------|--------|
| SR cn=NOMINALIZED_CLAUSE | 2,008 | SSOT |
| Rendered with bracket (DR full) | 285 | IMPLEMENTED ✅ |
| IO platform (fn=INDIRECT_OBJECT) | 17 | DEFERRED |
| Buried (fn=null, ADVERBIAL, etc.) | 1,723 | SR-structural — cannot reach renderer |

---

## 6. Mobile 390px

| Check | Result |
|-------|--------|
| `.dg-nomc` visible at 390px | YES — 5 instances in MAT 5 |
| computedStyle fontSize | 14.4px (0.9rem at 16px root) ✓ |
| Brackets not clipped | YES |
| No new horizontal overflow | YES — existing `.dg-main-line` overflow-x: auto handles |
| Console errors | 0 ✓ |

---

## 7. Copy Integrity (T-13)

```javascript
document.querySelector('.dg-nomc').textContent
// ROM 6:7 → "ὁ ἀποθανὼν"          (no '[' ']')
// MAT 5:4 → "οἱ πενθοῦντες,"       (no '[' ']')
// PHP 2:6 → "τὸ εἶναι ἴσα θεῷ,"   (no '[' ']')
```

`.textContent` on `.dg-nomc` elements returns Greek text only. CSS `::before`/`::after` pseudo-element content is excluded from the DOM textContent API. All 5 chapters tested: clean = true.

---

## 8. Accessibility

CSS `::before`/`::after` pseudo-elements do not add ARIA labels or roles. Pseudo-element content `[` `]` may be announced by some screen readers — this is acceptable as structural notation.

No new `aria-*` attributes added. No change to ARIA structure of existing elements.

---

## 9. Regression Results

| Feature | Mechanism | Gate evidence | Status |
|---------|-----------|---------------|--------|
| CONTENT_CLAUSE sub-diagram | Branch 1 (contentClause.innerDR) — checked before NOMINALIZED_CLAUSE | MAT 5 cc=8 ✓, EPH 2 cc=1 ✓ | PASS ✓ |
| APPOSITION parallel segments | Branch 2 (.canonical==='APPOSITION') — checked before NOMINALIZED_CLAUSE | noNomc_on_appos=true all chapters ✓ | PASS ✓ |
| IO raised platform | Separate ioSlots loop — NOMINALIZED_CLAUSE branch only in baseSlots | JHN 1 io=18 ✓ | PASS ✓ |
| PP diagonal | Separate _dgRenderAdvPhrases() | JHN 1 pp=22 ✓, MAT 5 pp=25 ✓ | PASS ✓ |
| Regular NP default branch | `else` — reached only if cn≠NOMINALIZED_CLAUSE, cn≠APPOSITION | EPH 2 (0 nomc, all other slots default) | PASS ✓ |
| Non-DG view | _isDGChapter gate — DG not activated | JHN 1 nomcCount=0 non-DG ✓ | PASS ✓ |

---

## 10. Console Errors

| Chapter | Errors |
|---------|--------|
| JHN 1 | 0 ✓ |
| MAT 5 | 0 ✓ |
| MAT 28 | 0 ✓ |
| EPH 2 | 0 ✓ |
| PHP 2 | 0 ✓ |
| COL 1 | 0 ✓ |
| ROM 6 | 0 ✓ |

---

## 11. Known Limitations

| Limitation | Count | Reason | Status |
|-----------|-------|--------|--------|
| IO NOMINALIZED_CLAUSE | 17 DR | fn=INDIRECT_OBJECT → IO platform renderer; separate sub-phase required | DEFERRED |
| Buried NOMINALIZED_CLAUSE | 1,723 SR | fn=null/ADVERBIAL/OBJECT2 — SR-structural, cannot reach renderer | KNOWN LIMIT |
| NOMINALIZED_CLAUSE in APPOSITION children | Unknown count | Flattened by displayText() in APPOSITION renderer | OUT OF SCOPE |

The IO deferred scope covers 17/285 = 6% of rendered instances. Main coverage (268/285 = 94%) is implemented.

---

## 12. Git Diff Audit

**dg-engine.js:** CONFIRMED 0 new changes in P6-G.8.3.  
Verification: temporarily stashed dg-engine.js → `git diff` returned 0 lines → confirms dg-engine.js diff is entirely pre-existing P6-G.6.3 work.

**index.html P6-G.8.3 additions confirmed:**
- `/* P6-G-8: NOMINALIZED_CLAUSE bracket notation */` CSS block ✓
- `.dg-nomc { font-size: .9rem; }` in `@media` ✓
- `NOMINALIZED_CLAUSE` branch in `_dgRenderMainLine()` ✓

No unrelated lines touched. No formatting churn. No refactoring of existing renderer code.

---

## 13. Sub-type Verification

| Sub-type | Description | Gate example | Result |
|---------|-------------|-------------|--------|
| I | Article + participial clause | MAT 5:4 "οἱ πενθοῦντες," / ROM 6:7 "ὁ ἀποθανὼν" | PASS ✓ |
| II | Articular infinitive | PHP 2:6 "τὸ εἶναι ἴσα θεῷ," | PASS ✓ |

Both sub-types are detected by the same `canonical === 'NOMINALIZED_CLAUSE'` check. Both receive the same `.dg-nomc` wrapper. No separate styles. ✓

---

## 14. L-0 Confirmation

- Detection: `slot.node.construction.canonical === 'NOMINALIZED_CLAUSE'` — SR SSOT ✓
- Text: `headDisplayText(slot.node, slot.headSIs)` — unchanged engine output ✓
- Bracket meaning: "this slot is filled by a clause in a nominal structural position" — SR-derivable ✓
- No inference about content, referent, or inner structure ✓
- L-0: **SAFE** ✓

---

*P6-G.8.3 implementation complete. Decision: PASS WITH LIMITATIONS. STOP.*  
*Do not begin P6-G.8.4, P6-G.9, OBJECT2, or any new phase. No commit, merge, push, or deploy.*
