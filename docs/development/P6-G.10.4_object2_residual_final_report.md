# P6-G.10.4 — OBJECT2 Residual Reachability Audit: Final Report

**Date:** 2026-08-26  
**Phase:** P6-G.10.4 — Read-Only Residual Audit  
**Predecessor:** P6-G.10.3 Engine Normalization (PASS WITH LIMITATIONS)  
**Constraint:** READ-ONLY. No code, data, SR, DR schema, or CSS changes.

---

## Decision

> **PASS WITH LIMITATIONS**

The 119 residual SR OBJECT2 instances that are unreachable by the post-P6-G.10.3 engine are fully enumerated, structurally classified, and assessed for L-0 safety and visual grammar impact. No engine errors, no L-0 violations, no SR mutations. The engine's 61.7% coverage is a documented architectural limitation, not a correctness failure.

**Recommended next step: B — Fix R6 alone (group second-clause gap).**

---

## A. Audit Completeness

| Item | Status |
|------|--------|
| All 119 residuals enumerated | ✓ CONFIRMED (scripts verified against SR and DR) |
| R-category classification (R1–R7) | ✓ CONFIRMED |
| Gate verse case studies (MAT 5:34, EPH 2:14, PHP 2:1, COL 1:26) | ✓ CONFIRMED |
| L-0 assessment per category | ✓ SAFE across all 7 categories |
| Visual grammar implications (A–D scale) | ✓ ASSESSED |
| Priority scoring | ✓ COMPLETE |
| Cross-function structural analysis | ✓ COMPLETE |
| Test matrix for future repair | ✓ COMPLETE |

---

## B. Summary of Findings

### B.1 Structural Root Causes

Two architectural properties of the engine account for all 119 residuals:

**Gap 1 — Slot content non-recursion (R1–R5, 87 cases, 73.1%):**  
`deriveClauseCore()` and `deriveFromGroup()` treat slot creation as terminal. Once a node with fn=MAIN_FN is absorbed as a slot, its subtree is not recursively searched for additional fn annotations. OBJECT2 nodes nested inside OBJECT (74), SUBJECT (8), COMPLEMENT (2), INDIRECT_OBJECT (2), or AUX (1) slots are invisible to the engine.

**Gap 2 — Group second-clause child dropped (R6, 23 cases, 19.3%):**  
`deriveFromGroup()` selects the clause child of a group via `.find()`, returning only the first clause. All subsequent clause children are neither `clauseChild` nor `extraPhrases` and are silently dropped, along with any OBJECT2 nodes they contain.

**Gap 3 — ADVERBIAL/deep nesting (R7, 9 cases, 7.6%):**  
ADVERBIAL subtrees lack full sub-DR derivation for deeply nested content. One case (LUK 18:19) is an SR double-annotation question. One case (1PE 2:16) involves a deeply nested SUBORDINATE_CLAUSE not reachable via standard group traversal.

### B.2 Gate Chapter Status

| Chapter | Residual | R-cat | Gate status |
|---------|---------|-------|------------|
| JHN 1 | 0 | — | PASS |
| MAT 5 | 1 (5:34) | R1 | FAIL |
| MAT 28 | 0 | — | PASS |
| EPH 2 | 1 (2:14) | R3 | FAIL |
| PHP 2 | 1 (2:1) | R6 | FAIL |
| COL 1 | 1 (1:26) | R1 | FAIL |
| ROM 6 | 0 | — | PASS |

Three gate chapters pass fully (JHN 1, MAT 28, ROM 6). Four have one residual each.

### B.3 EPH 2:14 Correction

**P6-G.10.1 and P6-G.10.2 design documents incorrectly described EPH 2:14 as a V-O-O2 clause.** The actual SR structure is COPULA (αὐτός|ἐστίν|εἰρήνη ἡμῶν). The OBJECT2 (ἓν) is inside a NOMINALIZED_CLAUSE inside COMPLEMENT-APPOSITION, giving category R3 (not R1 as the design docs implied). This does not change the engine fix or coverage count, but the design doc error is noted here for the record.

---

## C. L-0 Final Assessment

| L-0 criterion | Status |
|--------------|--------|
| Engine creates no incorrect OBJECT2 / SECOND_OBJECT slots | SAFE |
| Engine does not infer OBJECT2 from context | SAFE |
| SR source nodes not mutated | SAFE |
| No double-normalization risk | SAFE |
| Residuals are omissions, not errors | CONFIRMED |

**L-0: SAFE across all 119 residuals.**

The 119 missing SECOND_OBJECT slots are architectural omissions — the engine does not reach them, does not misidentify them, and does not create incorrect representations in their place.

---

## D. Recommended Next Step: B — Fix R6 Alone

### Option A — Freeze (no action)

Accept all 119 residuals as documented limitations. Current 61.7% coverage is stable. No gate chapters newly pass.

**Risk:** Four gate chapters remain failing (MAT 5, EPH 2, PHP 2, COL 1). PHP 2:1 (entire second clause invisible) is a D-severity visual gap.

**Appropriate if:** The architectural changes required for R1+R3 are deferred to a later phase.

### Option B — Fix R6 only (RECOMMENDED)

Change `deriveFromGroup()` to loop over all clause children instead of using `.find()`. This is a MODERATE complexity change affecting one function and one line pattern.

**Expected outcome:**
- 23 R6 cases resolved
- DR SECOND_OBJECT: 192 → 215
- PHP 2:1 gate chapter pass: PHP 2 goes from 3/4 to 4/4
- MAT 5, EPH 2, COL 1 still failing (R1/R3)
- L-0 safe: no inference; second clause is SR-explicit

**Rationale for recommending B over C:**
1. R6 is the only D-severity gap (entire clause branches missing)
2. Fix complexity is MODERATE vs. HIGH for R1
3. One new gate chapter passes (PHP 2)
4. R1 fix (slot-content recursion) is a significant architectural change warranting its own design review

### Option C — Fix R6 + R1 + R3

All gate chapters pass after this fix. NT-wide coverage: ~291/311 (93.6%). Architectural change: recursive slot-content parsing.

**Appropriate as a follow-on phase (P6-G.10.5) after B is validated.**

### Option D — Fix all 119 (full recursive engine)

NT-wide coverage: 311/311 (100%). Requires ADVERBIAL sub-DR derivation and SR data review for R7b. Highest risk of regression.

**Not recommended as a single phase.**

---

## E. OBJECT2 / SECOND_OBJECT Freeze Assessment

**Should `fn='OBJECT2'` in SR be considered frozen?**

No. The SR data is SSOT for grammatical function annotations. The engine normalization (`OBJECT2` → `SECOND_OBJECT`) implemented in P6-G.10.3 is a representational translation, not a freeze of the SR annotation.

SR may continue to emit `fn='OBJECT2'` for any node the annotation team identifies as a second object (dative shift / double-accusative / factitive). The engine normalizes at traversal time.

What IS effectively frozen by this audit:

1. **`MAIN_FN` set** — `'SECOND_OBJECT'` is already present; no change needed
2. **DR slot fn value** — always `'SECOND_OBJECT'`; never `'OBJECT2'`
3. **SR SSOT** — SR emits `'OBJECT2'`; this is correct and should not change

The 119 unreachable instances are architectural limitations, not data errors. SR need not be altered.

---

## F. Deliverable Index

| Document | Status |
|----------|--------|
| `P6-G.10.4_object2_residual_audit.md` | ✅ Complete |
| `P6-G.10.4_object2_residual_relationship_matrix.md` | ✅ Complete |
| `P6-G.10.4_object2_residual_test_matrix.md` | ✅ Complete |
| `P6-G.10.4_object2_residual_final_report.md` | ✅ This document |

---

## G. What P6-G.10.5 Must Do (If Authorized)

If Option B (Fix R6) is authorized as P6-G.10.5:

1. Modify `deriveFromGroup()` only — change the single `.find(c => c.type === 'clause')` to process all clause children in order
2. `index.html`: zero changes
3. SR: zero changes
4. Run tests TR-1 through TR-3, TR-16, TR-17
5. Confirm NT-wide DR SECOND_OBJECT = 215
6. Confirm PHP 2 gate chapter: 4/4 verses passing
7. Confirm JHN 1, MAT 28, ROM 6 still passing
8. L-0: source nodes not mutated
9. Write P6-G.10.5 implementation report
10. STOP — no commit, merge, push, deploy

---

*P6-G.10.4 residual audit complete. Decision: PASS WITH LIMITATIONS. Recommended next step: B. STOP.*  
*Do not begin P6-G.10.5 or any implementation. No code changes. No commit, merge, push, or deploy.*
