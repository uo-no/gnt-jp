# P6-G.7 — Remaining Visual Grammar Gap Reassessment: Final Report

**Date:** 2026-08-26  
**Phase:** P6-G.7 — Read-only Audit  
**Predecessor:** P6-G.6.3 APPOSITION Implementation (PASS)  
**Constraint:** No production code changes made during this phase.

---

## Decision

> **PASS WITH LIMITATIONS**

Current visual grammar coverage is confirmed accurate and complete within scope. Three remaining gaps are identified with corrected measurements and updated priority scores. One gap (OBJECT2) is reclassified as ENGINE GAP (not renderer gap).

**Next implementation target: G-3 NOMINALIZED_CLAUSE** — one phase at a time.

---

## A. Baseline Confirmed

| Metric | Value |
|--------|-------|
| NT sentences | 8,010 ✅ |
| NT tokens | 137,741 ✅ |
| Processing errors | 0 ✅ |

Baseline matches P6-G.5. SR data unchanged.

---

## B. Implemented Features — Status Confirmed

| Feature | Phase | DR-reachable | Gate DR | Regression |
|---------|-------|-------------|---------|------------|
| Subject / Predicate / Object / Complement | P5-D | 13,636 slots | — | ✅ No change |
| Copula / AUX | P5-D | 966 slots | — | ✅ No change |
| IO Raised Platform | P6-G.2 | 1,052 | 29 | ✅ No change |
| PP Diagonal | P6-F | 3,680 | 84 | ✅ No change |
| Content Clause Sub-diagram | P6-G.4 | 328 | 16 | ✅ No change |
| Relative Clause Connector | P6-C/B | 401 | 19 | ✅ No change |
| Coordination | P6-G.4.3 | 84 | 4 | ✅ No change |
| **APPOSITION Parallel Segments** | **P6-G.6.3** | **~292** | **9 (browser)** | **✅ NEW** |

APPOSITION implementation confirmation: 0 console errors, regression counts intact (IO=18 in JHN1, PP=22, REL=14, coord-wrap=3).

---

## C. Remaining Gaps — Corrected Measurements

### C-1: NOMINALIZED_CLAUSE (Rank #1)

| Metric | P6-G.5 | P6-G.7 | Change |
|--------|--------|--------|--------|
| SR total | 2,008 | 2,008 | None |
| DR slots | 542 (est.) | **276** (confirmed) | Method correction |
| DR as % of SR | 27.0% (est.) | **13.7%** | Confirmed |
| Gate SR | 47 | 47 | None |
| Gate DR | est. — | **5** | Confirmed |
| Priority score | 72.3% | **76.9%** | +4.6pp |

**Finding:** DR count was overestimated in P6-G.5 (542 → 276). The lower confirmed DR count reflects the high burial rate (55.4% of NOMINALIZED_CLAUSE nodes have fn=null — buried inside other constructions).

**Gap:** 276 DR slots display flat text indistinguishable from noun phrases. No bracket notation.

**Engine change needed:** NO.  
**L-0:** SAFE.

### C-2: OBJECT2 / SECOND_OBJECT (Rank #2)

| Metric | P6-G.5 | P6-G.7 | Change |
|--------|--------|--------|--------|
| SR fn=OBJECT2 | 311 | 311 | None |
| DR SECOND_OBJECT | 0 | **0** (confirmed) | — |
| Gate instances | est. <5 | **16** (confirmed) | Major correction |
| Priority score | 56.9% | **63.1%** | +6.2pp |

**Critical finding:** This is NOT a renderer gap — it is an **engine gap**.

```
SR canonical:  fn = 'OBJECT2'
MAIN_FN set:   has 'SECOND_OBJECT' — does NOT have 'OBJECT2'
Result:         fn=OBJECT2 nodes never enter DR → 100% invisible
```

**Engine change needed:** YES — dg-engine.js MAIN_FN set.  
**Gate instances corrected:** 16 (not <5). PHP 2 has 4, ROM 6 has 5, confirming significant gate presence.

**Additional design work:** Connector between OBJECT and SECOND_OBJECT is undefined. Must be designed before implementation.

### C-3: CLAUSE_AS_NP (Rank #3)

| Metric | P6-G.5 | P6-G.7 | Change |
|--------|--------|--------|--------|
| SR total | 886 | 886 | None |
| DR slots | 194 (est.) | **113** (confirmed) | Correction |
| Gate SR | 31 | 31 | None |
| Gate DR | est. — | **4** | Confirmed |
| Priority score | 53.8% | **53.8%** | None |

**Finding:** P6-C (relative clause connector) already handles headSIs narrowing for CLAUSE_AS_NP slots. Remaining gap: no visual marker for clause status. 113 DR slots look identical to NP slots.

**Interaction constraint:** Any visual marker must work alongside existing headSIs narrowing.

---

## D. Priority Ranking — Updated

| Rank | Gap | Score | Engine Change | Key Factor |
|------|-----|-------|---------------|------------|
| **1** | **NOMINALIZED_CLAUSE** | **76.9%** | **No** | Largest SR gap (2,008); renderer-only; bracket notation SR-safe |
| 2 | OBJECT2 | 63.1% | **Yes** | Engine fix + connector design required; 16 gate instances |
| 3 | CLAUSE_AS_NP | 53.8% | No | P6-C partial; only 113 DR slots; lowest gate DR (4) |

---

## E. NOMINALIZED_CLAUSE — Implementation Readiness

NOMINALIZED_CLAUSE is selected as the next implementation target.

**Readiness assessment:**

| Check | Status |
|-------|--------|
| SR confidence | ✅ cn=NOMINALIZED_CLAUSE is explicit SSOT |
| DR pipeline | ✅ 276 slots confirmed in DR |
| Engine change | ✅ None needed |
| Renderer path | ✅ Same `_dgRenderMainLine()` slot branch as APPOSITION |
| Detection | ✅ `slot.node?.construction?.canonical === 'NOMINALIZED_CLAUSE'` |
| Text content | ✅ `headDisplayText(slot.node, slot.headSIs)` — unchanged |
| L-0 | ✅ SAFE — bracket is presentation wrapper, not inference |
| Gate test cases | ✅ JHN 1, MAT 5 have NOMINALIZED_CLAUSE in DR |
| Regression surface | LOW — additive branch; no existing feature modified |

**Target visual (RK/Leedy bracket notation):**

```
[τὸ ζῆν]    ← bracket signals clause-as-noun
──────────
   主語
══════════════════   ← main baseline
```

**Proposed approach:**
- CSS class (`.dg-nomc-wrap`) wraps slot text
- `[` and `]` bracket markers via CSS `::before` / `::after` OR text prepend/append
- Alternatively: CSS border-left styling to signal clause bracket
- No separate element needed (unlike APPOSITION which required head/appositive split)

**Note:** Implementation approach is subject to full design specification in the next phase (G-8.x audit + design + implementation sequence). This document does not prescribe the exact visual implementation.

---

## F. OBJECT2 — Design Work Required

Before OBJECT2 can be implemented, the following must be resolved:

1. **Engine change scope:** Add 'OBJECT2' to MAIN_FN set in dg-engine.js. Verify all 311 SR instances route to DR correctly after change.

2. **Connector design:** Relationship OBJECT → SECOND_OBJECT needs a visual connector. Options:
   - Extend PO connector type (currently PREDICATE→OBJECT)
   - New connector type 'oo' (object-to-object)
   - Second vertical separator similar to sp/po

3. **Post-fix validation:** 311 new DR slots must be tested. Gate chapters PHP 2 (4 instances) and ROM 6 (5 instances) are primary test cases.

4. **Potential collision:** When both IO (raised platform) and SECOND_OBJECT are present in the same clause — visual layout interaction must be designed.

OBJECT2 is deferred until NOMINALIZED_CLAUSE is complete and a separate design audit (G-8.x equivalent) is conducted.

---

## G. Known Limitations — Carried Forward

| Limitation | Count | Reason | Action |
|-----------|-------|--------|--------|
| Buried APPOSITION | ~1,598 | SR-structural (inside PP/GENITIVE_MOD) | Engine/SR change needed — out of current scope |
| Buried NOMINALIZED_CLAUSE | 1,732 SR | fn=null (1,112) + adv (98) + etc. | SR-structural; renderer cannot reach |
| Buried CLAUSE_AS_NP | 773 SR | fn=null (545) | SR-structural |
| IO buried | ~1,610 | Inside PP, rel clause, nested | SR-structural |
| Non-gate chapter DG | All non-gate | `_isDGChapter` condition | Separate phase for gate expansion |

---

## H. Deliverable Index

| Document | Status |
|----------|--------|
| `P6-G.7_remaining_gap_audit.md` | ✅ Complete |
| `P6-G.7_relationship_coverage_matrix.md` | ✅ Complete |
| `P6-G.7_priority_matrix.md` | ✅ Complete |
| `P6-G.7_final_report.md` | ✅ This document |

All 4 deliverables complete. No production code changes made during this phase.

---

## I. Recommended Next Phase

**P6-G.8 — NOMINALIZED_CLAUSE Audit and Repair Design**

Sequence:
1. G-8.1: NOMINALIZED_CLAUSE read-only audit (SR structure, DR pipeline, visual candidates)
2. G-8.2: NOMINALIZED_CLAUSE repair design (bracket notation specification)
3. G-8.3: NOMINALIZED_CLAUSE implementation

Do not begin G-8.x or any implementation from this document. This report is read-only.

---

*P6-G.7 reassessment complete. STOP. Do not begin P6-G.8 or any implementation.*
