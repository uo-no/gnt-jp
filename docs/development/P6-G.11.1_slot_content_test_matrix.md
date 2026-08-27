# P6-G.11.1 — Slot-Content Test Matrix

**Date:** 2026-08-26
**Phase:** P6-G.11.1 — Read-Only Audit
**Companion to:** `P6-G.11.1_slot_content_audit.md`

Test cases for verifying any eventual slot-content reachability repair. These are defined here for future use — **not executed now**. The audit is READ-ONLY.

Each test case specifies: the test id, verse, SR structure, expected DR output, and which repair option(s) it covers.

---

## TC-1 (Baseline — PASS under current engine)

**ID:** TC-1  
**Verse:** PHP 2:4  
**SR pattern:** SECOND_OBJECT directly visible (no slot blocking)  
**Expected DR:** `slots[]` contains `fn=SECOND_OBJECT`  
**countSO result:** ≥1  
**Covers:** Regression — must pass under all options A–E  
**Priority:** P0 (regression)

---

## TC-2 (Baseline — PASS under current engine)

**ID:** TC-2  
**Verse:** JHN 1:1  
**SR pattern:** COORDINATION at root; no SECOND_OBJECT  
**Expected DR:** `isCoordination: true`, `coordClauses.length ≥ 2`  
**countSO result:** 0  
**Covers:** Regression — coordination structure must not change  
**Priority:** P0 (regression)

---

## TC-3 (Baseline — PASS: CONTENT_CLAUSE already handled)

**ID:** TC-3  
**Verse:** Any verse with SECOND_OBJECT inside CONTENT_CLAUSE fn=OBJECT  
**SR pattern:** `OBJECT slot → node=clause cn=CONTENT_CLAUSE → inner clause → SECOND_OBJECT`  
**Expected DR:** `slots[OBJECT].contentClause.innerDR.slots[]` contains `fn=SECOND_OBJECT`  
**countSO result:** ≥1  
**Covers:** Existing behavior — must pass under all options  
**Priority:** P0 (regression)

---

## TC-4 (FAIL under current; PASS under Option A, C, D)

**ID:** TC-4  
**Verse:** MAT 5:34  
**SR pattern:** `OBJECT slot → node=clause (no cn) → inner clause → SECOND_OBJECT`  
**Expected DR under Option A/C/D:** `slots[OBJECT].contentClause.innerDR.slots[]` contains `fn=SECOND_OBJECT`  
**countSO result before:** 0  
**countSO result after Option A:** ≥1  
**Covers:** Clause-type slot (no cn) — Option A primary target  
**Priority:** P1 (gate chapter MAT 5)

---

## TC-5 (FAIL under current; PASS under Option A, C, D)

**ID:** TC-5  
**Verse:** COL 1:26  
**SR pattern:** `OBJECT slot → node=clause cn=SUBORDINATE_CLAUSE → inner clause → SECOND_OBJECT`  
**Expected DR under Option A/C/D:** `slots[OBJECT].contentClause.innerDR.slots[]` contains `fn=SECOND_OBJECT`  
**countSO result before:** 0  
**countSO result after Option A:** ≥1  
**Covers:** SUBORDINATE_CLAUSE slot type  
**Priority:** P1 (gate chapter COL 1)

---

## TC-6 (FAIL under current; PASS under Option A, C, D)

**ID:** TC-6  
**Verse:** Any verse in OBJECT|clause/PARTICIPIAL_CLAUSE group (4 cases)  
**SR pattern:** `OBJECT slot → node=clause cn=PARTICIPIAL_CLAUSE → inner structure → SECOND_OBJECT`  
**Expected DR under Option A/C/D:** `slots[OBJECT].contentClause.innerDR` contains SECOND_OBJECT  
**countSO result before:** 0  
**countSO result after:** ≥1  
**Covers:** PARTICIPIAL_CLAUSE slot type  
**Priority:** P2

---

## TC-7 (FAIL under current; PASS under Option A, C, D)

**ID:** TC-7  
**Verse:** Any verse in OBJECT|clause/NOMINALIZED_CLAUSE group (4 cases)  
**SR pattern:** `OBJECT slot → node=clause cn=NOMINALIZED_CLAUSE → inner structure → SECOND_OBJECT`  
**Expected DR under Option A/C/D:** `slots[OBJECT].contentClause.innerDR` contains SECOND_OBJECT  
**countSO result before:** 0  
**countSO result after:** ≥1  
**Covers:** NOMINALIZED_CLAUSE slot type  
**Priority:** P2

---

## TC-8 (FAIL under current; PASS under Option B, C, D)

**ID:** TC-8  
**Verse:** LUK 3:3 or MAT 3:3 or MRK 1:2 (OBJECT|group — group fn=OBJECT)  
**SR pattern:** `OBJECT slot → node=group → [clause1, clause2] → clause2 → SECOND_OBJECT`  
**Expected DR under Option B/C/D:** `slots[OBJECT].contentClause.innerDR.isCoordination: true`, `coordClauses[]` contains SECOND_OBJECT  
**countSO result before:** 0  
**countSO result after Option B:** ≥1  
**Covers:** Group-type slot — Option B primary target  
**Priority:** P2

---

## TC-9 (FAIL under current; PASS under Option B, C, D)

**ID:** TC-9  
**Verse:** JHN 2:14 or JHN 4:17 or LUK 18:19  
**SR pattern:** `SECOND_OBJECT slot → node=group fn=OBJECT2 → inner OBJECT2 node`  
**Expected DR under Option B/C/D:** `slots[SECOND_OBJECT].contentClause.innerDR` contains inner OBJECT2 as SECOND_OBJECT  
**countSO result before:** 1 (outer group is counted, inner is not)  
**countSO result after Option B:** 2  
**Covers:** Self-nested OBJECT2 in group slot  
**Priority:** P2

---

## TC-10 (FAIL under current; NOT FIXED by Options A–D)

**ID:** TC-10  
**Verse:** Any OBJECT|clause/CONTENT_CLAUSE depth-2 case (4 cases)  
**SR pattern:** `OBJECT slot → node=clause cn=CONTENT_CLAUSE → innerDR → OBJECT slot in innerDR → SECOND_OBJECT`  
**Expected DR under Option A/C:** innerDR exists (already does), but depth-2 slot still blocks  
**countSO result before:** 0  
**countSO result after Option A/C:** 0 (unchanged — depth-2 not addressed)  
**countSO result after Option D:** depends on recursive depth implementation  
**Covers:** Depth-2 slot nesting — requires separate repair  
**Priority:** P3

---

## TC-11 (FAIL under current; PASS under Option D only)

**ID:** TC-11  
**Verse:** EPH 2:14  
**SR pattern:** `COMPLEMENT slot → node=phrase.np/APPOSITION → inner structure → SECOND_OBJECT (ἓν)`  
**Expected DR under Option D (if APPOSITION included):** `slots[COMPLEMENT].contentClause.innerDR` contains SECOND_OBJECT  
**countSO result before:** 0  
**countSO result after Option D:** ≥1 (if phrase.np/APPOSITION included)  
**Covers:** COMPLEMENT/APPOSITION phrase-type slot — EPH 2:14 specific  
**Priority:** P3 (gate chapter EPH 2 — Class E, may not be fixed)

---

## TC-12 (Structural gap — NOT FIXABLE by slot-content repair)

**ID:** TC-12  
**Verse:** 1JN 4:10  
**SR pattern:** Root group drops non-clause sibling group; OBJECT2 is inside the dropped nested group  
**Expected DR:** Cannot be fixed by slot-content repair alone. Requires root-group structural extension.  
**Covers:** NONE category (R6 residual — root-drops-nested-group)  
**Priority:** P3 (out of scope for slot-content repair)

---

## TC-13 (Cross-function — regression)

**ID:** TC-13  
**Verse:** MAT 1:19  
**SR pattern:** SUBJECT slot → node=phrase.np/APPOSITION (existing APPOSITION modifier display)  
**Expected DR:** APPOSITION modifier display unchanged; `slots[SUBJECT].modifiers[]` still contains appositive node  
**Covers:** Regression — `extractSlotModifiers()` must still fire for APPOSITION even if new innerDR is added to slot  
**Priority:** P0 (regression)

---

## TC-14 (Cross-function — regression)

**ID:** TC-14  
**Verse:** EPH 2:8  
**SR pattern:** CONTENT_CLAUSE fn=OBJECT → existing sub-diagram  
**Expected DR:** `slots[OBJECT].contentClause.innerDR` unchanged  
**countSO result:** Same as before repair  
**Covers:** Regression — existing CONTENT_CLAUSE path must not be disturbed  
**Priority:** P0 (regression)

---

## TC-15 (Cross-function — coordination regression)

**ID:** TC-15  
**Verse:** PHP 2:1  
**SR pattern:** R6-fixed coordinated group → adverbialClauses → coordClauses → SECOND_OBJECT  
**Expected DR:** Same as post-P6-G.10.6 — `countSO() = 1` via adverbialClauses path  
**Covers:** Regression — P6-G.10.6 recovery must not be broken  
**Priority:** P0 (regression)

---

## TC-16 (NT-wide count regression)

**ID:** TC-16  
**Scope:** NT-wide  
**Check:** DR SECOND_OBJECT count = (199 + number of cases addressed by repair option)  
**Implementation:** Run `countSO()` NT-wide after repair, compare to expected figure  
**Covers:** Regression + coverage gain validation  
**Priority:** P0

---

## TC-17 (SR non-mutation regression)

**ID:** TC-17  
**Scope:** Any repaired sentence  
**Check:** After `deriveDR(root)`, the `root` SR object is identical to pre-derivation state (no mutations)  
**Covers:** L-0 constraint — SR must not be mutated  
**Priority:** P0

---

## TC-18 (Token deduplication regression)

**ID:** TC-18  
**Verse:** Any verse where a slot node is also a clause with children exposed in both slot and inner DR  
**Check:** Surface indices of tokens in `slots[x]` vs `slots[x].contentClause.innerDR.slots[]` must not overlap  
**Covers:** No token duplication in coordinated/nested sub-diagrams  
**Priority:** P0

---

## TC-19 (SUBJECT/NOMINALIZED_CLAUSE — Option A)

**ID:** TC-19  
**Blocking pattern:** SUBJECT|clause/NOMINALIZED_CLAUSE (2 cases)  
**SR:** `SUBJECT slot → node=clause cn=NOMINALIZED_CLAUSE → SECOND_OBJECT inside`  
**Expected after Option A:** `slots[SUBJECT].contentClause.innerDR` contains SECOND_OBJECT  
**countSO before:** 0; after: ≥1  
**Covers:** SUBJECT slot type, NOMINALIZED_CLAUSE construction  
**Priority:** P2

---

## TC-20 (AUX/NOMINALIZED_CLAUSE — Option A)

**ID:** TC-20  
**Blocking pattern:** AUX|clause/NOMINALIZED_CLAUSE (1 case)  
**SR:** `AUX slot → node=clause cn=NOMINALIZED_CLAUSE → SECOND_OBJECT inside`  
**Expected after Option A:** `slots[AUX].contentClause.innerDR` contains SECOND_OBJECT  
**countSO before:** 0; after: ≥1  
**Covers:** AUX slot type  
**Priority:** P2

---

## Test Execution Order (for eventual implementation phase)

### Pre-repair (P0 regression baseline)
Run TC-1, TC-2, TC-3, TC-13, TC-14, TC-15, TC-17, TC-18 → all must PASS before repair.

### Post-repair P0 (regression must hold)
Run TC-1, TC-2, TC-3, TC-13, TC-14, TC-15, TC-16, TC-17, TC-18 → all must still PASS.

### Post-repair P1 (gate chapter recovery)
Run TC-4 (MAT 5), TC-5 (COL 1) → must PASS under Option A or C.

### Post-repair P2 (coverage validation)
Run TC-6, TC-7 (clause constructions), TC-8 (group slots), TC-9 (SECOND_OBJECT self-nested), TC-19, TC-20.

### Post-repair P3 (known limitations — expected FAIL)
Run TC-10 (depth-2), TC-11 (EPH 2:14 COMPLEMENT/APPOSITION), TC-12 (1JN 4:10 structural gap) → expected FAIL; confirm they remain as known limitations.

---

## Summary: Test Case → Repair Option Coverage

| TC | Description | Current | Opt A | Opt B | Opt C | Opt D | Priority |
|----|-------------|---------|-------|-------|-------|-------|---------|
| TC-1 | PHP 2:4 baseline | PASS | PASS | PASS | PASS | PASS | P0 |
| TC-2 | JHN 1:1 coordination | PASS | PASS | PASS | PASS | PASS | P0 |
| TC-3 | CONTENT_CLAUSE fn=OBJECT | PASS | PASS | PASS | PASS | PASS | P0 |
| TC-4 | MAT 5:34 OBJECT\|clause | FAIL | **PASS** | FAIL | **PASS** | PASS | P1 |
| TC-5 | COL 1:26 OBJECT\|SUBORDINATE | FAIL | **PASS** | FAIL | **PASS** | PASS | P1 |
| TC-6 | OBJECT\|PARTICIPIAL (4) | FAIL | **PASS** | FAIL | **PASS** | PASS | P2 |
| TC-7 | OBJECT\|NOMINALIZED (4) | FAIL | **PASS** | FAIL | **PASS** | PASS | P2 |
| TC-8 | OBJECT\|group (10) | FAIL | FAIL | **PASS** | **PASS** | PASS | P2 |
| TC-9 | SO\|group self-nested (3) | partial | FAIL | **PASS** | **PASS** | PASS | P2 |
| TC-10 | CONTENT_CLAUSE depth-2 (4) | FAIL | FAIL | FAIL | FAIL | TBD | P3 |
| TC-11 | EPH 2:14 COMPLEMENT/APPOSITION | FAIL | FAIL | FAIL | FAIL | TBD | P3 |
| TC-12 | 1JN 4:10 structural gap | FAIL | FAIL | FAIL | FAIL | FAIL | P3 |
| TC-13 | MAT 1:19 APPOSITION modifier | PASS | PASS | PASS | PASS | PASS | P0 |
| TC-14 | EPH 2:8 CONTENT_CLAUSE | PASS | PASS | PASS | PASS | PASS | P0 |
| TC-15 | PHP 2:1 R6 recovery | PASS | PASS | PASS | PASS | PASS | P0 |
| TC-16 | NT-wide count | 199 | ~268 | ~212 | ~279 | ~297 | P0 |
| TC-17 | SR non-mutation | PASS | PASS | PASS | PASS | PASS | P0 |
| TC-18 | Token deduplication | PASS | PASS | PASS | PASS | PASS | P0 |
| TC-19 | SUBJECT\|NOMINALIZED (2) | FAIL | **PASS** | FAIL | **PASS** | PASS | P2 |
| TC-20 | AUX\|NOMINALIZED (1) | FAIL | **PASS** | FAIL | **PASS** | PASS | P2 |

---

*Test matrix complete. READ-ONLY. No tests executed. These test cases are defined for use in a future implementation phase.*
