# P6-G.4 — CONTENT_CLAUSE fn=OBJ Test Matrix

**Phase:** P6-G.4  
**Date:** 2026-08-25  
**Status:** DESIGN ONLY — For future implementation gate

---

## Coverage Note

This matrix covers the 540-case minimal fix target (SLOT_ROOT + SLOT_IN_ADV). The 196 excluded cases (buried, invisible) are out of scope.

---

## T-1: Basic CC fn=OBJ in SLOT_ROOT — structural rendering

**Target:** 311 SLOT_ROOT cases where CC is a direct child of main clause  
**Evidence source:** 1CO 1:2 (s2), 1CO 1:4 (s4), ROM 6 chapter (5 cases)

### T-1a — CC slot has `contentClause` set
- Assert: `dr.slots` contains slot where `fn='OBJECT'` and `slot.contentClause !== null`
- Assert: `slot.contentClause.conjunction` ∈ {`'ὅτι'`, `'ἵνα'`, `'ὅπως'`, null}
- Assert: `slot.contentClause.innerDR` is a valid DR_Clause object
- Sample: 1CO 1:2 — `slot.contentClause.conjunction === 'ὅτι'`

### T-1b — Inner DR has slots (inner clause parsed correctly)
- Assert: `slot.contentClause.innerDR.slots.length > 0`
- Assert: inner DR has at least a PREDICATE slot
- Sample: 1CO 1:2 — inner DR slots include PREDICATE(ἐπλουτίσθητε)

### T-1c — Renderer shows conjunction label in slot, not full flat text
- Assert: OBJECT slot element shows only ὅτι (or ἵνα), not full inner clause text
- Assert: inner clause DG sub-diagram rendered below the slot
- Visual: slot reads "ὅτι", not "ὅτι ἐν παντὶ ἐπλουτίσθητε..."

### T-1d — All non-CC OBJECT slots unaffected
- Assert: OBJECT slots where `fn='OBJECT'` AND `slot.node.construction?.canonical !== 'CONTENT_CLAUSE'` have `contentClause === null`
- Assert: Their rendering is unchanged (flat text as before)

---

## T-2: Gate chapters — CC fn=OBJ count and rendering

### T-2a — ROM 6 (5 SLOT_ROOT cases)
- Assert: 5 CC fn=OBJ slots in ROM 6 DG views
- Assert: Each has `contentClause` set
- Assert: Each shows conjunction label in OBJECT slot
- Assert: Inner clause sub-diagram visible

### T-2b — MAT 5 (6 SLOT_ROOT cases confirmed)
- Assert: 6 OBJECT slots in MAT 5 with `contentClause` set
- Assert: Flat text NOT shown for CC slots

### T-2c — EPH 2 (1 SLOT_ROOT case)
- Assert: 1 CC fn=OBJ slot in EPH 2 ch.2 DG view
- Assert: `slot.contentClause !== null`

---

## T-3: SLOT_IN_ADV — CC inside participial/adverbial clause

**Target:** 229 cases where CC is in adv sub-clause's slots  
**Sample:** JHN 1 (adv cases), PHP 2 (2 SLOT_IN_ADV)

### T-3a — CC in adv clause slots has contentClause
- Assert: Within `dr.adverbialClauses[i].slots[]`, CC fn=OBJ slot has `contentClause` set
- Assert: `innerDR` rendered as sub-sub-diagram within the adverbial clause rendering
- Sample: JHN 1 s30 — λέγων adv clause, CC slot → innerDR

### T-3b — Non-CC adv clause structure unchanged
- Assert: adverbialClauses entries where no CC fn=OBJ slot exist are rendered identically to pre-fix
- Assert: PHP 2 gate chapter — adv clause count unchanged

---

## T-4: Conjunction detection — ὅτι vs ἵνα vs null

### T-4a — ὅτι conjunction extracted
- Assert: CC beginning with ὅτι token: `slot.contentClause.conjunction === 'ὅτι'`
- Sample: 1CO 1:2, ROM 6 cases

### T-4b — ἵνα conjunction extracted
- Assert: CC beginning with ἵνα token: `slot.contentClause.conjunction === 'ἵνα'`
- Sample: Any ἵνα-clause in slots (1CO 1:4 has ἵνα)

### T-4c — No CONJ token: conjunction=null
- Assert: CC without leading CONJ morph token: `slot.contentClause.conjunction === null`
- Handles: Indirect discourse CC without explicit conjunction

---

## T-5: Non-CC OBJECT slots — no regression

### T-5a — NP objects unchanged
- Assert: OBJECT slots where `slot.node.type === 'token'` or `slot.node.construction?.canonical === 'ARTICULAR_NP'` etc. have `contentClause === null`
- Assert: Rendered as before (full head text, no sub-diagram)

### T-5b — CLAUSE_AS_NP objects unchanged (P6-C embedded rel clauses)
- Assert: OBJECT slots where `slot.node.construction?.canonical === 'CLAUSE_AS_NP'` — `contentClause` NOT set (CLAUSE_AS_NP already uses `embeddedRelClauses`)
- Assert: embeddedRelClauses rendering unchanged

### T-5c — JHN 1 relative clause count unchanged (regression baseline)
- Assert: 14 relative clauses rendered in JHN 1 (P6-C baseline)

---

## T-6: IO raised platform — no regression (P6-G-2 baseline)

### T-6a — JHN 1 IO platform count unchanged
- Assert: 18 `dg-io-wrap` elements in JHN 1 (P6-G-2 baseline)

### T-6b — MAT 5 IO platform count unchanged
- Assert: 13 IO platforms in MAT 5 (P6-G-2 baseline)

### T-6c — IO not in main line
- Assert: No IO text in `.dg-main-line` in any gate chapter

---

## T-7: Connector behavior

### T-7a — CC as only OBJECT after PREDICATE has 'po' connector
- Assert: Sentence with PREDICATE then CC-OBJECT: `slot.connector === 'po'`
- Sample: 1CO 1:5 (εὐχαριστῶ + ὅτι ἔριδες)

### T-7b — CC after IO: connector=null (known gap, not a regression)
- Assert: Sentence with PREDICATE + IO + CC-OBJECT: `slot.connector === null` for CC slot
- Note: This is a known pre-existing gap; fixing it is out of scope

### T-7c — sp connectors unchanged
- Assert: JHN 1 sp-connector count = 48 (P6-G-2 baseline)

---

## T-8: Buried CC (145 cases) — confirmed NOT fixed

### T-8a — Buried CC text visible in parent slot text
- Assert: For 1CO 10:0 (parentFn=OBJECT, CN=null), the parent slot's text includes CC tokens
- Assert: No separate CC sub-diagram (as expected — out of scope)

### T-8b — No regression in parent slot rendering
- Assert: Parent slot (fn=OBJECT, cn=null) renders with full text as before

---

## T-9: Invisible CC (39 cases) — confirmed NOT fixed

### T-9a — NOMINALIZED_CLAUSE context
- Assert: For 1JN 2:4 (CC inside CLAUSE_AS_NP subject), no CC slot or sub-diagram
- Assert: No JS error or crash

---

## T-10: No-clause chapters unchanged (SD fallback regression)

### T-10a — ACT 2 SD fallback unchanged
- Assert: 0 `dg-io-wrap` in ACT 2 (not a DG gate chapter)
- Assert: 645 sd-nodes (P6-G-2 baseline) or equivalent SD structure

---

## T-11: Recursion depth limit

### T-11a — Doubly-nested CC (6 cases)
- Assert: For 1CO 1:9 (CC nested inside another CC's inner clause), outer CC renders normally
- Assert: Inner CC (nested in outer CC's inner clause) has `contentClause=null` or is bounded by depth limit
- Assert: No infinite recursion / stack overflow

---

## T-12: JavaScript errors

- Assert: 0 console errors across all gate chapters (JHN 1, MAT 5, MAT 28, EPH 2, PHP 2, COL 1, ROM 6)

---

## Test Priority

| Priority | Tests | Reason |
|----------|-------|--------|
| P1 — Must pass | T-1, T-2, T-5, T-6, T-12 | Core fix + regression |
| P2 — Should pass | T-3, T-4, T-7a, T-7c, T-8, T-9, T-10 | Coverage + known gaps |
| P3 — Nice to have | T-7b, T-11 | Edge cases |

---

## Expected Coverage

| Metric | Target |
|--------|--------|
| CC fn=OBJ with contentClause set | ≥ 540 (SLOT_ROOT + SLOT_IN_ADV) |
| CC fn=OBJ shown as sub-diagram | ≥ 540 |
| Remaining flat-text CC (buried + invisible) | ≤ 196 |
| Non-CC OBJECT slots affected | 0 |
| P6-G-2 IO regressions | 0 |
| P6-C relative clause regressions | 0 |

---

*Test matrix for implementation gate. Read-only phase complete.*
