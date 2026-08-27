# P6-G.11.2 — Slot Content Repair: Test Matrix

**Date:** 2026-08-26
**Phase:** P6-G.11.2 — Read-Only Design Audit
**For use in:** P6-G.11.3 (implementation phase)
**Status:** DEFINED, NOT EXECUTED.

Tests verify: correct DR derivation, coverage gain, backward compatibility, regression safety.

Test IDs prefixed G11 to distinguish from P6-G.11.1 test cases (TC-1..TC-20).

---

## P0: Regression Gates (must PASS before AND after repair)

### G11-P0-1 — CONTENT_CLAUSE existing behavior

**Verse:** Any verse with fn=OBJECT cn=CONTENT_CLAUSE (e.g., JHN 3:16)
**Pre-repair state:** PASS
**Check:**
- `slot.contentClause !== null` for the OBJECT slot
- `slot.contentClause.conjunction === 'ὅτι'` (or the actual conjunction)
- `slot.contentClause.innerDR !== null`
- `countFnInDR(dr, 'SECOND_OBJECT') ≥ 0`
**After repair:** Same result. `slot.contentClause.label === null` (backward-compatible).
**Fails if:** contentClause becomes null for CONTENT_CLAUSE slots.

---

### G11-P0-2 — NOMINALIZED_CLAUSE bracket notation

**Verse:** Any verse with fn=OBJECT cn=NOMINALIZED_CLAUSE (e.g., from NT NOMC data)
**Pre-repair state:** PASS — slot rendered with `dg-nomc` bracket class
**Check:**
- `slot.contentClause === null` for NOMINALIZED_CLAUSE slot
- Renderer uses bracket notation path (line 12346 in index.html)
**After repair:** Same result — NOMINALIZED_CLAUSE slots still have `contentClause = null`.
**Fails if:** contentClause becomes non-null for NOMINALIZED_CLAUSE.

---

### G11-P0-3 — APPOSITION slot rendering

**Verse:** MAT 1:19 (fn=SUBJECT, cn=APPOSITION)
**Pre-repair state:** PASS — APPOSITION rendered with `dg-appos-wrap`
**Check:**
- `slot.contentClause === null` for the SUBJECT/APPOSITION slot
- Renderer uses APPOSITION path (line 12343)
**After repair:** `slot.contentClause === null` unchanged (APPOSITION is phrase.np — excluded from extension).
**Fails if:** contentClause becomes non-null for APPOSITION slot.

---

### G11-P0-4 — COORDINATION root unchanged

**Verse:** JHN 1:1 (COORDINATION root)
**Pre-repair state:** PASS — `isCoordination: true, coordClauses.length ≥ 3`
**Check:** DR structure identical before and after repair.
**Fails if:** R6 fix or new extension changes COORDINATION DR.

---

### G11-P0-5 — PHP 2:1 R6 recovery preserved

**Verse:** PHP 2:1
**Pre-repair state:** PASS (DR SECOND_OBJECT = 1, via P6-G.10.6)
**Check:** `countFnInDR(dr, 'SECOND_OBJECT') === 1` after repair.
**Fails if:** Extension disrupts adverbialClauses path used by R6 recovery.

---

### G11-P0-6 — EPH 2:8 CONTENT_CLAUSE sub-diagram

**Verse:** EPH 2:8
**Pre-repair state:** PASS — CONTENT_CLAUSE slot has innerDR
**Check:**
- slot.contentClause.innerDR exists
- slot.contentClause.label === null (backward-compatible)
- countFnInDR unchanged
**Fails if:** EPH 2:8 sub-diagram changes in any way.

---

### G11-P0-7 — NT-wide SECOND_OBJECT baseline

**Scope:** All NT books
**Pre-repair state:** DR SECOND_OBJECT = 199
**Check:** Run `countFnInDR()` NT-wide → result = 199 (before repair)
**Fails if:** Baseline is not 199 before repair begins.

---

### G11-P0-8 — SR non-mutation

**Scope:** Any modified verse
**Check:** After `deriveDR(root)`, verify `root` SR object equals pre-derivation snapshot.
**Fails if:** SR node is mutated during DR derivation.

---

### G11-P0-9 — NT-wide derivation error-free

**Scope:** All NT books, all sentences
**Check:** `deriveDR()` returns non-null with no thrown exceptions for all sentences.
**Fails if:** Any sentence throws an error.

---

## P1: Coverage Gain Gates (must PASS after repair)

### G11-P1-1 — MAT 5:34 recovery (bare clause, depth-2)

**Verse:** MAT 5:34 (sentence 2)
**Blocking pattern:** OBJECT|clause/SUBORDINATE_CLAUSE → innerDR → OBJECT|clause (no cn) → SECOND_OBJECT
**Pre-repair:** `countFnInDR = 0`
**Expected after repair:** `countFnInDR = 1`
**DR path:** `dr.adverbialClauses[3].slots[OBJECT(SUB)].contentClause.innerDR.slots[PREDICATE,OBJECT(bare)]; .slots[OBJECT(bare)].contentClause.innerDR.slots[SECOND_OBJECT]`
**Covers:** Bare clause extension (Option A) + SUBORDINATE_CLAUSE extension + depth-2 propagation

---

### G11-P1-2 — COL 1:26 recovery (SUBORDINATE_CLAUSE)

**Verse:** COL 1:26
**Blocking pattern:** OBJECT|clause/SUBORDINATE_CLAUSE
**Pre-repair:** `countFnInDR = 0`
**Expected after repair:** `countFnInDR = 1`
**Covers:** SUBORDINATE_CLAUSE extension (Option A)

---

### G11-P1-3 — NT-wide post-repair count

**Scope:** All NT books
**Expected after repair:** `countFnInDR() NT-wide ≥ 270`
**Upper bound:** 276
**Acceptable range:** 270–276 (some cases may have deeper nesting than recoverable at 1 pass)
**Fails if:** Count < 270 or > 311 (SR total)

---

## P2: Per-Construction Coverage Tests

### G11-P2-1 — SUBORDINATE_CLAUSE slot extension

**Target:** Any case in OBJECT|clause/SUBORDINATE_CLAUSE group (6 cases)
**Verify:**
- Affected slot has `contentClause !== null`
- `contentClause.label === '従属節'`
- `contentClause.conjunction === <the actual subordinator>`
- `countFnInDR(sentence_dr, 'SECOND_OBJECT') > 0`

---

### G11-P2-2 — PARTICIPIAL_CLAUSE slot extension

**Target:** Any case in OBJECT|clause/PARTICIPIAL_CLAUSE group (4 cases)
**Verify:**
- Affected slot has `contentClause !== null`
- `contentClause.label === '分詞節'`
- `contentClause.conjunction === null` (typical for participials)
- `countFnInDR > 0`

---

### G11-P2-3 — Bare clause slot extension

**Target:** Any case in OBJECT|clause (no cn) group (49 cases) + SUBJECT|clause (1 case)
**Verify:**
- Affected slot has `contentClause !== null`
- `contentClause.label === '節'`
- `contentClause.conjunction === null`
- `countFnInDR > 0`

---

### G11-P2-4 — Group slot extension (OBJECT|group)

**Target:** Any case in OBJECT|group group (10 cases, e.g. MAT 3:3, MRK 1:2)
**Verify:**
- OBJECT slot has `contentClause !== null`
- `contentClause.label === '節グループ'`
- `contentClause.innerDR.isCoordination === true` (if group has 2+ clause children)
- `countFnInDR > 0`

---

### G11-P2-5 — SECOND_OBJECT self-nested group (JHN 2:14)

**Verse:** JHN 2:14
**Structure:** SECOND_OBJECT slot, node = group fn=OBJECT2, inner OBJECT2 node inside
**Pre-repair:** `countFnInDR = 1` (outer group counted, inner not)
**Expected after repair:** `countFnInDR = 2`
**Verify:**
- SECOND_OBJECT slot has `contentClause !== null`
- `contentClause.innerDR` has a SECOND_OBJECT slot (the inner OBJECT2)
**Same test for JHN 4:17 and LUK 18:19.**

---

### G11-P2-6 — CONTENT_CLAUSE depth-2 recovery

**Target:** Any case in OBJECT|clause/CONTENT_CLAUSE (depth-2) group (4 cases)
**Structure:** OBJECT/CONTENT_CLAUSE slot (existing innerDR) → innerDR has OBJECT/bare-clause → OBJECT2 inside
**Pre-repair:** `countFnInDR = 0`
**Expected after repair:** `countFnInDR = 1`
**Path:** `slot.contentClause.innerDR.slots[OBJECT].contentClause.innerDR.slots[SECOND_OBJECT]`
**Covers:** Depth-2 propagation via recursive `_extractContentClause()` call chain.

---

## P3: Known Limitations (must FAIL as expected)

### G11-P3-1 — NOMINALIZED_CLAUSE remains invisible

**Target:** Any case in OBJECT|clause/NOMINALIZED_CLAUSE group (4 cases) or SUBJECT/NOMINALIZED_CLAUSE (2 cases) or AUX/NOMINALIZED_CLAUSE (1 case)
**Expected:** `countFnInDR = 0` (unchanged)
**Confirm:** `slot.contentClause === null` for NOMINALIZED_CLAUSE slots.
**Rationale:** Excluded to preserve bracket notation. Known limitation.

---

### G11-P3-2 — EPH 2:14 remains invisible (COMPLEMENT/APPOSITION)

**Verse:** EPH 2:14
**Expected:** `countFnInDR = 0` (unchanged)
**Confirm:** COMPLEMENT slot `contentClause === null` (APPOSITION is phrase.np — excluded).
**Rationale:** Class E (ambiguous phrase-type slot). Known limitation.

---

### G11-P3-3 — Phrase-type slots remain invisible

**Target:** Any phrase.np or phrase.pp blocking case (18 cases)
**Expected:** `countFnInDR = 0` for these sentences (unchanged).
**Rationale:** Class E excluded.

---

### G11-P3-4 — Structural gap cases remain invisible (NONE=9)

**Target:** 1JN 4:10, 1PE 2:16, 1PE 3:14, 1TH 2:14, 1TH 3:12, 2CO 10:13, HEB 1:1, JHN 4:46, PHP 3:8
**Expected:** `countFnInDR = 0` for these (unchanged).
**Rationale:** Structural gap (R6/R7), not slot-content issue.

---

## P4: Renderer Behavior Tests (browser required)

### G11-P4-1 — Sub-diagram label for SUBORDINATE_CLAUSE slot

**Verse:** COL 1:26 (after repair)
**Expected in UI:** OBJECT slot main line shows the subordinating conjunction OR '従属節' if no conjunction. Sub-diagram label shows same text.
**CSS class:** `dg-cc-clause-label` with correct text.

---

### G11-P4-2 — Sub-diagram label for PARTICIPIAL_CLAUSE slot

**Verse:** Any verse with PARTICIPIAL_CLAUSE fn=OBJECT (after repair)
**Expected in UI:** Main line shows '分詞節'. Sub-diagram label shows '分詞節'.

---

### G11-P4-3 — Sub-diagram label for bare clause slot

**Verse:** MAT 5:34 (after repair)
**Expected in UI:** Main line for OBJECT slot in 4th group's inner clause shows '節'. Sub-diagram shows inner clause structure.

---

### G11-P4-4 — Sub-diagram label for group slot

**Verse:** MAT 3:3 or MRK 1:2 (after repair)
**Expected in UI:** OBJECT slot main line shows '節グループ'. Sub-diagram shows coordinated inner clauses.

---

### G11-P4-5 — NOMINALIZED_CLAUSE bracket notation unchanged

**Verse:** Any verse with NOMINALIZED_CLAUSE fn=OBJECT (after repair)
**Expected in UI:** `dg-nomc` element with bracket notation, NO sub-diagram.

---

### G11-P4-6 — CONTENT_CLAUSE conjunction label unchanged

**Verse:** EPH 2:8 (after repair)
**Expected in UI:** OBJECT slot shows 'ὅτι' (conjunction), sub-diagram unchanged from pre-repair.
**Confirm:** No regression in existing CONTENT_CLAUSE rendering.

---

### G11-P4-7 — Mobile 390px — sub-diagram legibility

**Verse:** COL 1:26 or MAT 5:34 (after repair, mobile viewport)
**Expected:** `dg-cc-clause-attach` padding-left: .8rem, `dg-cc-clause-label` font-size: 8px (mobile media query applies).
**No overflow, no truncation.**

---

## Test Execution Summary Table

| Test | Category | Pre-repair | Expected post-repair | Key verification |
|------|---------|-----------|---------------------|-----------------|
| G11-P0-1 | P0 regression | PASS | PASS | contentClause.label=null for CC |
| G11-P0-2 | P0 regression | PASS | PASS | contentClause=null for NOMC |
| G11-P0-3 | P0 regression | PASS | PASS | contentClause=null for APPOS |
| G11-P0-4 | P0 regression | PASS | PASS | JHN 1:1 COORD unchanged |
| G11-P0-5 | P0 regression | PASS | PASS | PHP 2:1 count=1 |
| G11-P0-6 | P0 regression | PASS | PASS | EPH 2:8 CC unchanged |
| G11-P0-7 | P0 baseline | DR=199 | DR=199 | before repair only |
| G11-P0-8 | P0 regression | PASS | PASS | SR not mutated |
| G11-P0-9 | P0 regression | PASS | PASS | 0 derivation errors |
| G11-P1-1 | P1 gate | count=0 | count=1 | MAT 5:34 |
| G11-P1-2 | P1 gate | count=0 | count=1 | COL 1:26 |
| G11-P1-3 | P1 NT-wide | 199 | 270–276 | range check |
| G11-P2-1 | P2 coverage | 0 | 1 | SUBORDINATE_CLAUSE |
| G11-P2-2 | P2 coverage | 0 | 1 | PARTICIPIAL_CLAUSE |
| G11-P2-3 | P2 coverage | 0 | 1 | bare clause |
| G11-P2-4 | P2 coverage | 0 | 1 | group slot |
| G11-P2-5 | P2 coverage | 1 | 2 | JHN 2:14 self-nested |
| G11-P2-6 | P2 coverage | 0 | 1 | depth-2 CC |
| G11-P3-1 | P3 limitation | 0 | 0 | NOMINALIZED_CLAUSE |
| G11-P3-2 | P3 limitation | 0 | 0 | EPH 2:14 |
| G11-P3-3 | P3 limitation | 0 | 0 | phrase-type |
| G11-P3-4 | P3 limitation | 0 | 0 | NONE structural |
| G11-P4-1..7 | P4 browser | visual | visual | browser required |

---

*Test matrix complete. READ-ONLY. No tests executed in this phase.*
