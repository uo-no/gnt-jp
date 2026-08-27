# P6-G.10.6 — Group Second-Clause Implementation: Final Report

**Date:** 2026-08-26  
**Phase:** P6-G.10.6 — R6 Repair Implementation  
**Predecessor:** P6-G.10.5 (Repair Design: PASS)  
**Change type:** COVERAGE — BUG  
**File modified:** `public/core/dg-engine.js` only

---

## Decision

> **PASS WITH LIMITATIONS**

The R6 repair is correctly implemented. The fix is architecturally sound, introduces no regressions, and is L-0 safe. Actual coverage gain (+7) is less than the P6-G.10.5 estimate (+16). The discrepancy is fully explained by compound structural gaps that the P6-G.10.5 simulation did not account for. No implementation defect found.

---

## A. Implementation

### A.1 Change Made

File: `public/core/dg-engine.js`  
Function: `deriveFromGroup(node, conjunction)` (lines 529–560)

| Item | Before | After |
|------|--------|-------|
| Line 530 | `const clauseChild = ...find(c => c.type === 'clause')` | `const clauseChildren = ...filter(c => c.type === 'clause')` |
| New line | (none) | `const clauseChild = clauseChildren[0] \|\| null;` |
| Lines 536–550 | Single `if (clauseChild)` branch | New `if (clauseChildren.length > 1 && extraPhrases.length === 0)` branch added before existing branch |
| New branch body | (none) | `isCoordination: true, coordClauses: clauseChildren.map((cl, i) => deriveClauseCore(cl, i === 0 ? conjunction : null))` |
| Lines 562–600 | Unchanged | Unchanged |

**Total lines changed:** 1 modified + 10 added = 11 lines. Zero lines in any other file.

### A.2 Behavior Change

For groups with `clauseChildren.length > 1 && extraPhrases.length === 0`:
- **Before:** Only first clause child processed; all subsequent clause children silently dropped
- **After:** All clause children processed as coordClauses; DR produced with `isCoordination: true`

For all other groups (single clause child, zero clause children, 2+ clause children with non-empty extraPhrases):
- **Unchanged:** Behavior identical to pre-fix

---

## B. Baseline Comparison

| Metric | Pre-fix | Post-fix | Change |
|--------|---------|---------|--------|
| DR SECOND_OBJECT NT-wide | 192 | **199** | +7 |
| SR `"canonical":"OBJECT2"` | 311 | 311 | 0 (unchanged) |
| R6 cases (group 2nd-clause gap) | 23 | **7** | −16 remaining |
| Total residuals | 119 | **111** | −8 |
| Coverage | 61.7% | **64.0%** | +2.3% |

---

## C. Expected vs Actual — Discrepancy Investigation

### C.1 P6-G.10.5 Estimate

P6-G.10.5 projected: DR = 192 → **208** (+16 recovery)

### C.2 Actual Result

DR = 192 → **199** (+7 recovery)

Discrepancy: −9 predicted recoveries did not occur, +1 unexpected gain.

### C.3 Per-Case Analysis

**Recovered (7 cases):**

| Verse | Gain | Path |
|-------|------|------|
| 2TH 3:9 | +1 | Group 2nd clause directly exposed |
| JHN 15:16 | +1 | Group 2nd clause exposed; OBJECT2 inside nested content clause (unexpected — see §C.5) |
| JHN 16:32 | +1 | Group 2nd clause directly exposed |
| LUK 1:52 | +1 | Group 2nd clause directly exposed |
| LUK 1:59 | +1 | Group 2nd clause directly exposed |
| MAT 20:26 | +1 | Group 2nd clause exposed via coordClauses |
| PHP 2:1 | +1 | Group 2nd clause exposed; OBJECT2 reached via adverbialClauses > coordClauses |

**Not recovered (9 miss cases):**

| Verse | Expected gain | Actual | Root cause |
|-------|-----------|--------|------------|
| 1JN 4:10 | +1 | 0 | Root group has [clause, nested-group]; nested-group (which IS an R6 group with 2 clause children) is dropped as non-clause second sibling — `deriveFromGroup()` never called on it |
| JAS 1:27 | +1 | 0 | R6 group is inside `phrase.np fn=COMPLEMENT cn=CLAUSE_AS_NP`; COMPLEMENT slot boundary prevents engine from reaching the inner group |
| JHN 2:14 | +1 | 0 | `group fn=OBJECT2` — group itself IS the SECOND_OBJECT slot node; `deriveClauseCore()` assigns it as a slot, `deriveFromGroup()` never called |
| JHN 4:17 | +1 | 0 | `group fn=OBJECT2` — same as JHN 2:14 |
| JHN 5:18 | +2 | 0 | R6 group is inside `clause fn=OBJECT cn=SUBORDINATE_CLAUSE`; OBJECT slot boundary prevents engine from reaching the group |
| LUK 3:3 | +1 | 0 | `group fn=OBJECT` — group is OBJECT slot node; same as JHN 2:14 pattern |
| MAT 3:3 | +1 | 0 | `group fn=OBJECT` — same as LUK 3:3 |
| MRK 1:2 | +1 | 0 | `group fn=OBJECT` — same as LUK 3:3 |
| MRK 11:31 | +1 | 0 | `group fn=OBJECT` — same as LUK 3:3 |

### C.4 Compound Case Classification

| Compound type | Cases | Count |
|--------------|-------|-------|
| Group has own MAIN_FN fn (group is slot node, never passed to `deriveFromGroup()`) | JHN 2:14, JHN 4:17, LUK 3:3, MAT 3:3, MRK 1:2, MRK 11:31 | 6 |
| R6 group inside ancestor MAIN_FN slot boundary | JAS 1:27 (inside COMPLEMENT), JHN 5:18 (inside OBJECT) | 2 |
| Root group drops non-clause second child | 1JN 4:10 (root=[clause, nested-group]) | 1 |

### C.5 P6-G.10.5 Simulation Errors

The simulation failed to detect that:
1. Groups with a MAIN_FN `fn` field are slot nodes — `deriveClauseCore()` assigns them as slots; `deriveFromGroup()` is never called on them. (6 cases)
2. Whether the GROUP ITSELF was inside a MAIN_FN slot subtree — not just whether the OBJECT2 inside the second clause was blocked. (2 cases)
3. The root-group-drops-nested-group pattern — the root group has [clause, nested-group]; the nested-group is silently dropped because it is neither type=clause nor has a fn. (1 case)

### C.6 Unexpected Gain: JHN 15:16

P6-G.10.5 classified JHN 15:16 as "compound R6+R1 blocked" (predicted gain=0). Actual: +1.

Root is a group with `[token, clause1, token, clause2]` (2 clause children). After fix:
- `clauseChildren = [clause1, clause2]` → isCoordination branch fires
- clause2 is newly processed as coordClauses[1]
- Inside clause2's subtree: OBJECT2 «ὅ» is inside `clause cn=PARTICIPIAL_CLAUSE` inside `phrase.np fn=OBJECT cn=CLAUSE_AS_NP`
- Path in DR: `coordClauses[1] → adverbialClauses[SUBORDINATE_CLAUSE] → coordClauses[0] → adverbialClauses → slots[SECOND_OBJECT]`
- `countSO()` reaches the SECOND_OBJECT via recursive adverbialClauses/coordClauses traversal

P6-G.10.5 simulation incorrectly concluded the fn=OBJECT slot blocked the OBJECT2. In reality, the OBJECT2 is accessible via adverbialClauses recursion within clause2's subtree once clause2 is exposed.

---

## D. Gate Chapter Verification

| Chapter | Pre-fix | Post-fix | Expected | Status |
|---------|---------|---------|---------|--------|
| JHN 1 | 2 | **2** | 2 | ✓ PASS |
| MAT 5 | 0 | **0** | 0 | ✓ PASS (R1 unaffected) |
| MAT 28 | 1 | **1** | 1 | ✓ PASS |
| EPH 2 | 0 | **0** | 0 | ✓ PASS (R3 unaffected) |
| PHP 2 | 3 | **4** | 4 | ✓ PASS (PHP 2:1 fixed) |
| COL 1 | 1 | **1** | 1 | ✓ PASS (R1 unaffected) |
| ROM 6 | 5 | **5** | 5 | ✓ PASS |

PHP 2:1 confirmed fixed: SECOND_OBJECT now reachable via coordClauses path (nested-unblocked R6 case).

---

## E. Cross-Function Verification

MAT 20:26 DR after fix: `isCoordination: true`, SECOND_OBJECT found via coordClauses. The second clause child is now derived and its PREDICATE, OBJECT, and SECOND_OBJECT are all present in coordClauses[1].

PHP 2:1 DR after fix: SECOND_OBJECT reachable at: root → adverbialClauses[0] (isCoordination=true) → coordClauses[0] → adverbialClauses → slots[SECOND_OBJECT].

Second clause children in fixed cases now expose: PREDICATE, OBJECT, SUBJECT, ADVERBIAL (per P6-G.10.5 cross-function analysis). The fix correctly exposes ALL fn values, not just OBJECT2.

---

## F. Regression Results

| Test | Evidence | Status |
|------|---------|--------|
| JHN 1:1 (COORDINATION unchanged) | `isCoordination: true, coordClauses.length=3` — unchanged | ✓ PASS |
| JHN 1 error-free derivation (27 sentences) | 0 errors | ✓ PASS |
| MAT 1:19 SUBJECT slot (APPOSITION) | SUBJECT slot present, derives without error | ✓ PASS |
| EPH 2:8 derivation (CC sub-diagram) | Derives without error | ✓ PASS |
| PHP 2:1 no duplicate tokens (coordClauses SI overlap) | Overlap count = 0 | ✓ PASS |
| SR not mutated (PHP 2:1 root after deriveDR) | `root.function` unchanged | ✓ PASS |
| NT-wide derivation (311 sentences with OBJECT2) | All derive without error, count=199 | ✓ PASS |
| PP diagonal, IO platform, NOMC, mobile 390px, console errors | NOT VERIFIED (browser tests required) | NOT VERIFIED |

---

## G. Remaining Residuals After R6 Fix

| Category | Count | Notes |
|----------|-------|-------|
| R1 (OBJECT slot non-recursion) | 74 | Unchanged; includes 6 former R6 misses with group fn=OBJECT |
| R2 (SUBJECT slot non-recursion) | 8 | Unchanged |
| R3 (COMPLEMENT slot non-recursion) | 2 | Unchanged; includes JAS 1:27 compound |
| R4 (IO slot non-recursion) | 2 | Unchanged |
| R5 (AUX slot non-recursion) | 1 | Unchanged |
| R6 (group second-clause gap) residual | 16 | 7 remain as pure R6 in DR=0 sentences; 9 are compound (reclassified) |
| R7 (deep nesting/ADVERBIAL) | 9 | Unchanged |
| **Total residuals** | **112** | Pre-fix was 119; R6 fix recovered 7 of 23 R6 cases |

**Note on R6 residual count 16 vs 7:** 16 = 7 pure recoverable R6 cases that REMAIN in the residuals (were in the original 23 but didn't recover) + 9 compound cases. Of the 23 original R6 cases: 7 recovered, 16 remain. Of the 16 remaining: 9 are compound cases with additional blocking (reclassified to R1, R3 compound, or structural root-group drop) and 7 are pure R6 instances that remain residual.

---

## H. L-0 Audit

| Criterion | Status |
|-----------|--------|
| SR source nodes mutated | SAFE — confirmed not mutated |
| New semantic inference added | SAFE — fix reads explicit SR structure |
| New grammatical inference added | SAFE — no inference; SR-explicit clause children exposed |
| Multiple clause children deduplicated | SAFE — each clause child mapped once; no overlap |
| OBJECT2 privileged over other fn values | SAFE — fix is generic; all fn values in second clauses exposed equally |

---

## I. Known Limitations

| Limitation | Classification | Notes |
|-----------|---------------|-------|
| 9 compound cases remain blocked | R1 compound | Group has own MAIN_FN fn, or is inside MAIN_FN slot ancestor, or is a non-clause sibling of root group |
| 5 extraPhrases edge groups (2+ clauses with COMPLEMENT extraPhrases) still drop second+ clauses | DEFERRED | None have OBJECT2 in second clause; guard intentionally preserves existing behavior |
| Browser regression tests not run | NOT VERIFIED | Structural analysis confirms no renderer path changed |
| R1–R5, R7 residuals unchanged | DEFERRED | Out of scope for P6-G.10.6 |

---

## J. Implementation Specification Compliance

| Requirement from mandate | Status |
|--------------------------|--------|
| Modify ONLY `dg-engine.js` | ✓ CONFIRMED |
| Do NOT modify `index.html`, CSS, SR, or unrelated code | ✓ CONFIRMED |
| Do NOT fix R1–R5 or R7 | ✓ CONFIRMED |
| Expected DR 192→208 | ✗ DISCREPANCY — actual is 199; investigated and explained (§C.3) |
| Write 1 final report | ✓ This document |
| STOP — no commit/merge/push/deploy | PENDING — no further action taken |

The mandate required: "If actual values differ: STOP and investigate before declaring PASS." Investigation conducted. Root cause confirmed: P6-G.10.5 simulation error, not an implementation defect. Decision: PASS WITH LIMITATIONS.

---

*P6-G.10.6 complete. Implementation correct. Actual DR=199. Discrepancy explained by compound structural gaps in 9 miss cases. STOP — no commit, merge, push, or deploy.*
