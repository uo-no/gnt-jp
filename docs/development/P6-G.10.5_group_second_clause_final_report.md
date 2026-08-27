# P6-G.10.5 — Group Second-Clause Reachability: Final Report

**Date:** 2026-08-26  
**Phase:** P6-G.10.5 — Read-Only Audit → Repair Design  
**Predecessor:** P6-G.10.4 Residual Audit (PASS WITH LIMITATIONS — Fix R6 recommended)  
**Constraint:** READ-ONLY throughout this phase. No code, SR, or DR changes.

---

## Decision

> **PASS**

All 23 R6 cases inspected. Traversal root cause established. Cross-function impact established. Gap confirmed GENERIC (not OBJECT2-specific). A safe, minimal repair strategy is selected. Implementation specification is complete. No unresolved architectural ambiguity.

---

## A. Criteria Checklist

| Criterion | Status |
|-----------|--------|
| All 23 cases inspected | ✓ CONFIRMED (22 groups enumerated; JHN 5:18 contributes 2 OBJECT2) |
| Traversal root cause established | ✓ CONFIRMED (line 530, `deriveFromGroup()`, `.find()`) |
| Cross-function impact established | ✓ CONFIRMED (generic — PREDICATE, SUBJECT, OBJECT etc. equally dropped) |
| Repair strategy selected | ✓ Option A with extraPhrases guard (`.filter()` + coordination DR) |
| Implementation specification complete | ✓ Exact file, function, line, before/after code documented |
| No unresolved architectural ambiguity | ✓ All edge cases analyzed; 5 extraPhrases groups explicitly handled |

---

## B. Root Cause Summary

**Single point of failure:** `deriveFromGroup()` line 530 in `public/core/dg-engine.js`.

```javascript
// Current (bug):
const clauseChild = (node.children || []).find(c => c.type === 'clause');

// Fix:
const clauseChildren = (node.children || []).filter(c => c.type === 'clause');
const clauseChild    = clauseChildren[0] || null;
// + new branch for clauseChildren.length > 1 && extraPhrases.length === 0
```

`Array.prototype.find()` returns the first match and stops. All subsequent clause children in a group are invisible to the engine — not in `clauseChild` (only first) and explicitly excluded from `extraPhrases` (`c.type !== 'clause'`).

**This is the ONLY traversal site with this bug.** All 9 other `.find()` calls in the engine are in contexts where first-child-only behavior is structurally correct (CONJOINED_CLAUSE inner node, COORDINATION member inner clause, SUBORDINATE_CLAUSE inner node, CONJ token extraction).

---

## C. Generic Classification Confirmed

> **GENERIC GROUP TRAVERSAL GAP** — not OBJECT2-specific.

The 22 second-clause children dropped by the bug contain:

| Dropped fn | Groups | % |
|-----------|--------|---|
| PREDICATE | 19/22 | 86% |
| OBJECT | 16/22 | 73% |
| SUBJECT | 8/22 | 36% |
| ADVERBIAL | 9/22 | 41% |
| IO | 4/22 | 18% |
| COMPLEMENT | 4/22 | 18% |
| COPULA | 3/22 | 14% |
| OBJECT2 | 22/22 | 100% (by selection) |

An OBJECT2-specific fix would be architecturally wrong — it would expose OBJECT2 while leaving PREDICATE, SUBJECT, and OBJECT from the same clause invisible. The correct fix is generic: expose ALL fn values by processing all clause children.

---

## D. Coverage Projection (Corrected)

**Correction from P6-G.10.4 final report:** P6-G.10.4 estimated +23 recovery from R6 fix (192 → 215). The correct figure is **+16** recovery (192 → 208).

The remaining 7 are compound R6+R1 cases: OBJECT2 is in the second clause (R6 gap), but also inside a MAIN_FN slot boundary within that clause (R1 gap). Exposing the second clause to `deriveClauseCore()` alone is insufficient — the OBJECT2 is blocked by the slot-content non-recursion boundary. After R6 fix, these 7 are reclassified from R6 to R1.

| Metric | Pre-fix | Post-fix |
|--------|---------|---------|
| DR SECOND_OBJECT | 192 | **208** |
| Coverage | 61.7% | **66.9%** |
| R6 residuals | 23 | 7 |
| Total residuals | 119 | **103** |

---

## E. Gate Chapter Impact

| Chapter | Residual | Status after fix |
|---------|---------|-----------------|
| JHN 1 | 0 | PASS (unchanged) |
| MAT 5 | 1 (R1) | FAIL (R6 fix does not address R1) |
| MAT 28 | 0 | PASS (unchanged) |
| EPH 2 | 1 (R3) | FAIL (R6 fix does not address R3) |
| PHP 2 | 1 (R6) → 0 | **FAIL → PASS** |
| COL 1 | 1 (R1) | FAIL (R6 fix does not address R1) |
| ROM 6 | 0 | PASS (unchanged) |

PHP 2:1 is a nested-unblocked R6 case: the OBJECT2 is inside the second clause's subtree but not blocked by any MAIN_FN slot boundary. Normal recursive processing via P5-E-1 (fn=null containers → adverbialClauses) reaches it after the second clause is exposed.

---

## F. L-0 Audit

| Criterion | Status |
|-----------|--------|
| Second clause children are SR-explicit | SAFE |
| No semantic inference required | SAFE |
| No lexical inference | SAFE |
| No attachment inference | SAFE |
| No discourse inference | SAFE |
| SR source nodes not mutated | SAFE |

**L-0: SAFE.** The repair reads structure that is explicitly encoded in SR. No inference of any kind is added.

---

## G. Implementation Specification Pointer

Full specification in `P6-G.10.5_group_second_clause_repair_design.md`.

**One-sentence summary:** In `deriveFromGroup()`, change line 530 from `.find(c => c.type === 'clause')` to `.filter(c => c.type === 'clause')` and add a coordination-DR branch for groups with 2+ clause children and no extraPhrases; all other code paths are unchanged.

**Lines changed:** 1 modified + 10 added = 11 lines in `dg-engine.js`. Zero lines in `index.html`.

---

## H. Deliverable Index

| Document | Status |
|----------|--------|
| `P6-G.10.5_group_second_clause_audit.md` | ✅ Complete |
| `P6-G.10.5_group_second_clause_repair_design.md` | ✅ Complete |
| `P6-G.10.5_group_second_clause_test_matrix.md` | ✅ Complete |
| `P6-G.10.5_group_second_clause_final_report.md` | ✅ This document |

---

## I. What P6-G.10.6 Must Do (If Authorized)

If P6-G.10.6 (implementation) is authorized:

1. Apply change to `dg-engine.js` as specified in repair design — `deriveFromGroup()` only
2. `index.html`: ZERO changes
3. SR data files: ZERO changes
4. Run TG-1 through TG-5, TG-12, TG-14, TG-20, TG-23 (P1 node.js tests)
5. Confirm NT-wide DR SECOND_OBJECT = **208** (not 215)
6. Confirm 7 compound R6+R1 cases remain residual (TG-3)
7. Confirm PHP 2 gate chapter: 4/4 (TG-6)
8. Run browser regression tests: PP diagonal, IO platform, NOMC bracket (TG-15, TG-16, TG-17, TG-18)
9. Console errors = 0 (TG-20)
10. Source nodes not mutated (TG-23)
11. Write P6-G.10.6 implementation report
12. STOP — no commit, merge, push, deploy

---

## J. Known Limitations After R6 Fix

| Limitation | Count | Classification |
|-----------|-------|---------------|
| Compound R6+R1: OBJECT2 blocked by slot boundary within second clause | 7 | DEFERRED — requires R1 fix |
| ExtraPhrases edge cases (5 groups with 2+ clauses and COMPLEMENT extraPhrases): second+ clauses still dropped | 5 groups | DEFERRED — no OBJECT2 missed; out of scope |
| R1, R2, R3, R4, R5, R7 residuals unchanged (103 total after R6 fix) | 103 | DEFERRED |

No new regressions are introduced. All limitations are pre-existing or documented carry-overs.

---

*P6-G.10.5 complete. Decision: PASS. Implementation specification ready for P6-G.10.6. STOP.*  
*Do not implement. No commit, merge, push, or deploy.*
