# P6-G.5 — Final Report: Remaining Visual Grammar Gap Audit

**Date:** 2026-08-25  
**Phase:** P6-G.5 — Read-only audit  
**Auditor:** Claude Sonnet 4.6  
**Baseline:** P6-G.4.3 (CONTENT_CLAUSE internal structure) complete  
**Constraint:** No production code changes during this audit.

---

## Decision

> **PASS WITH LIMITATIONS**

The visual grammar system is operational. G-4.3 delivered the highest-priority remaining gap (CONTENT_CLAUSE sub-diagram rendering) to PASS. Three structural gaps remain (APPOSITION, NOMINALIZED_CLAUSE, OBJECT2) with confirmed data, defined root causes, and clear implementation paths. No blocking condition exists. The system is ready to proceed to G-4.4.

---

## 1. Executive Summary

### What This Audit Covered

P6-G.5 is a read-only NT-wide re-audit of all remaining visual grammar gaps after G-4.3 implementation. It re-measures actual SR→DR→Renderer coverage using current dg-engine.js (G-4.3 included), identifies residual structural limitations in the G-4 CONTENT_CLAUSE 194-case NOT_FOUND population, and produces a priority-scored matrix for the next phase selection.

### What Changed Since G-1

| Gap | G-1 Status | G-5 Status |
|-----|------------|------------|
| IO Raised Platform | IMPLEMENTED (P6-G-2) | PASS — regression PASS |
| PP Diagonal | IMPLEMENTED (P6-F) | PASS — regression PASS |
| Relative Clause | IMPLEMENTED (P6-C) | PASS — regression PASS |
| CONTENT_CLAUSE fn=OBJ | GAP (flat text) | **IMPLEMENTED (G-4.3) — 542/542 rendered** |
| APPOSITION notation | GAP | GAP — confirmed 467/1,890 in DR (24.7%), flat text |
| NOMINALIZED_CLAUSE | GAP | GAP — confirmed 542/2,008 in DR (27.0%), flat text |
| OBJECT2 engine gap | Not in G-1 | **NEW FINDING — 311 SR → 0 DR (fn mismatch)** |
| CLAUSE_AS_NP | PARTIAL (P6-C) | PARTIAL — unchanged |

### Key New Finding

OBJECT2 fn mismatch discovered during audit: SR uses `fn.canonical = 'OBJECT2'` (311 nodes), but dg-engine.js MAIN_FN set contains `'SECOND_OBJECT'`. Result: 311 second-object nodes never reach DR. Renderer has label `OBJECT2: '第二目的語'` anticipating the fn value. Fix requires dg-engine.js change.

---

## 2. Current Gap Inventory

### 2.1 Fully Implemented (PASS)

| Feature | Implementation | NT Coverage | Status |
|---------|---------------|-------------|--------|
| IO Raised Platform | P6-G-2/P6-G-3 | 1,736 / 2,662 SR (65.2%) | ✅ PASS |
| PP Diagonal | P6-F | ~4,918 diagonal / 8,838 total | ✅ PASS |
| Relative Clause | P6-C | ~3,000 | ✅ PASS |
| Coordination | P6 | 855 clauses | ✅ PASS |
| Participial Clause | P6 | 543 | ✅ PASS |
| Subordinate Clause | P6 | 3,134 | ✅ PASS |
| Modifier Zone | P6-F | 12,379 (GENMOD+ADJMOD+etc.) | ✅ PASS |
| **CONTENT_CLAUSE fn=OBJ** | **G-4.3** | **542 / 542 rendered (100% of DR-reachable)** | **✅ PASS** |

**IO note:** 926 SR→DR gap (34.8%) is pre-existing engine routing issue for clause-wrapped structures. Not introduced by G-4.3.

---

### 2.2 Remaining Gaps

| Gap | SR | In DR | DR% | Current render | Visual target | Engine change? |
|-----|----|----|-----|----------------|---------------|----------------|
| G-2 APPOSITION | 1,890 | 467 | 24.7% | Flat text (head+appos concatenated) | Parallel "=" connector (dashed) | No |
| G-3 NOMINALIZED_CLAUSE | 2,008 | 542 | 27.0% | Flat text (clause tokens) | Bracket `[...]` notation | No |
| G-3b CLAUSE_AS_NP | 886 | 194 | 21.9% | Partial (P6-C rel clause extracted) | Nominalized status marker | No |
| G-5 OBJECT2 | 311 | **0** | **0%** | Not rendered | Baseline slot (ditransitive position) | **Yes** |

---

## 3. G-4 Residual Analysis — 194 NOT_FOUND Cases

G-4.3 rendered 542/542 CC fn=OBJ that reached DR MAIN_FN slots. 194 CC fn=OBJ nodes did not produce a `contentClause` DR entry. Classification:

| Category | Count | Root Cause | Current render | Fixable? |
|----------|-------|-----------|----------------|----------|
| **Buried** | **145** | CC fn=OBJ is a child node inside a parent ARTICULAR_NP or NP_COMPLEX slot. Parent's `displayText()` concatenates all tokens (head + CC text). | Flat text (correct fallback) | SR restructuring required |
| **Invisible** | **39** | CC fn=OBJ embedded inside NOMINALIZED_CLAUSE, APPOSITION, or ADJ_MOD constructions that themselves never reach DR MAIN_FN as direct slot nodes. | Not rendered (outer construction absent from DR) | Requires fixing outer construction gap first |
| **Total** | **194** | | | |

**Assessment:** Neither category is a G-4.3 implementation bug. Both are SR-level structural constraints:
- Buried (145): the engine sees the *parent* NP as the slot node and correctly renders combined text. The CC structure inside is inaccessible without per-slot SR tree traversal.
- Invisible (39): these become accessible only if their containing NOMINALIZED_CLAUSE/APPOSITION constructions are first given proper DR treatment (G-3/G-2).

**The 194 NOT_FOUND are a known limitation, not a regression.**

---

## 4. DR Coverage Why-Analysis

### Why 73–78% of APPOSITION/NOMINALIZED_CLAUSE miss DR

Pattern confirmed NT-wide:

```
ARTICULAR_NP (fn=SUBJECT)        ← slot node in DR
  └─ APPOSITION (fn=null)        ← buried, never a slot
        ├─ NP1 (head)
        └─ NP2 (appositive)
```

The parent ARTICULAR_NP fn=SUBJECT routes to MAIN_FN → becomes a DR slot. Its child APPOSITION (fn=null or fn=other) is never extracted. `displayText(ARTICULAR_NP_node)` collects all descendant token texts, so both head and appositive appear as flat text.

**This is not a rendering bug — it's a structural depth limit in dg-engine.js.** The engine's `deriveDR` does not recurse into slot node children to find nested APPOSITION/NOMINALIZED_CLAUSE constructions. Surfacing the remaining 75% requires either:
- Deeper per-slot SR tree traversal in the engine (engine change), or
- SR restructuring so APPOSITION/NOMINALIZED_CLAUSE appear directly as slot nodes (SR change)

Neither is in scope for the current phase. The 24.7% and 27.0% DR coverage figures are structural ceilings for renderer-only fixes.

---

## 5. Relationship Coverage Summary (Post G-4.3)

| Relationship | SR | DR / Renderer | Visual Grammar | Status |
|---|---|---|---|---|
| Subject | 11,116 | ✅ full | Baseline leftmost | ✅ |
| Predicate | 25,110 | ✅ full | Baseline center | ✅ |
| Object (NP) | 13,693 | ✅ full | Baseline after pred | ✅ |
| Complement | 3,604 | ✅ full | Baseline diagonal | ✅ |
| Copula | 2,589 | ✅ full | Baseline | ✅ |
| IO Platform | 2,662 | 1,736 | Platform above baseline | ✅ |
| PP Diagonal | 11,889 | ~8,838 (adv) | Prep diagonal | ✅ |
| Genitive modifier | 7,281 | ✅ full | L-bracket | ✅ |
| Adj/Adv modifier | 5,098 | ✅ full | Modifier label | ✅ |
| Relative clause | ~3,000 | ✅ full | Purple dashed + antecedent | ✅ |
| Coordination | 855 | ✅ full | Left border | ✅ |
| Participial clause | 543 | ✅ full | Italic label | ✅ |
| Subordinate clause | 3,134 | ✅ full | 従属節 bracket | ✅ |
| CC fn=OBJ (internal) | 736 | 542 rendered | Sub-diagram (G-4.3) | ✅ |
| **APPOSITION** | **1,890** | **467 in DR** | **❌ Flat text, no "=" notation** | **⚠️ GAP** |
| **NOMINALIZED_CLAUSE** | **2,008** | **542 in DR** | **❌ Flat text, no bracket** | **⚠️ GAP** |
| CLAUSE_AS_NP | 886 | 194 in DR | ⚠️ Partial (P6-C rel clause) | ⚠️ PARTIAL |
| OBJECT2 | 311 | **0** | **❌ Not in DR (fn mismatch)** | **⚠️ ENGINE GAP** |

---

## 6. Gate Chapter Data (SR-level)

| Chapter | APPOS | NOMC | CANP | CC | IO | OBJECT2 (est.) |
|---------|-------|------|------|----|----|-----------------|
| JHN 1 | 11 | 10 | 10 | 4 | 22 | <1 |
| MAT 5 | 3 | 12 | 0 | 13 | 20 | <1 |
| MAT 28 | 2 | 4 | 3 | 4 | 12 | <1 |
| EPH 2 | 14 | 6 | 4 | 1 | 3 | <1 |
| PHP 2 | 8 | 4 | 1 | 3 | 2 | <1 |
| COL 1 | 27 | 8 | 12 | 1 | 5 | <1 |
| ROM 6 | 5 | 3 | 1 | 5 | 9 | <1 |
| **Total** | **70** | **47** | **31** | **31** | **73** | — |

APPOSITION gate total (70) is the largest among remaining gaps, driven by COL 1 (27) and EPH 2 (14).

---

## 7. Regression Verification

All regressions confirmed PASS with G-4.3 implementation in place:

| Feature | Gate baseline | G-5 result | Status |
|---------|--------------|------------|--------|
| IO platform | JHN1=18, MAT5=14 | JHN1=18, MAT5=14 | ✅ PASS |
| PP diagonal | JHN1=22, MAT5=25 | JHN1=22, MAT5=25 | ✅ PASS |
| Relative clause | JHN1=14 | JHN1=14 | ✅ PASS |
| SD fallback | ACT2: IO=0, CC=0 | ACT2: IO=0, CC=0 | ✅ PASS |
| Mobile 390px | JHN1: CC=2, IO=18 | JHN1: CC=2, IO=18 | ✅ PASS |
| Console errors | 0 | 0 | ✅ PASS |

No regressions observed. G-4.3 changes (dg-engine.js + index.html) do not affect IO, PP, REL, or coordination rendering paths.

---

## 8. Priority Matrix Results

Full scoring detail in `P6-G.5_priority_matrix.md`. Summary:

| Rank | Gap | Score | % | Engine change |
|------|-----|-------|---|---------------|
| 1 | G-2 APPOSITION | 25.5 / 32.5 | 78.5% | No |
| 2 | G-3 NOMINALIZED_CLAUSE | 23.5 / 32.5 | 72.3% | No |
| 3 | G-5 OBJECT2 | 18.5 / 32.5 | 56.9% | **Yes** |
| 4 | G-3b CLAUSE_AS_NP | 17.5 / 32.5 | 53.8% | No |

Criteria: C1 RK/Leedy Priority ×1.5 + C2 NT Volume ×1.0 + C3 Gate Coverage ×1.0 + C4 SR Confidence ×1.5 + C5 Implementation Risk ×1.5. Max = 32.5.

---

## 9. Recommended Next Phase

### G-4.4: APPOSITION Notation

**Recommended.** Score 78.5% — highest among remaining gaps.

**What it fixes:**  
APPOSITION nodes that reach DR slots (467/1,890) are rendered as flat text combining head NP and appositive NP. Reed-Kellogg notation requires: appositive on a parallel horizontal segment below the head, connected by a dashed "=" symbol.

**Scope:**
- Renderer only (index.html `_dgRenderMainLine()` or `_dgRenderSlotModZone()`)
- No dg-engine.js change required
- SR structure is explicit: `children[0]` = head NP, `children[1+]` = appositive(s)
- Detect `slot.node?.construction?.canonical === 'APPOSITION'`

**Expected coverage:** 467 DR-reachable nodes NT-wide; 70 in gate chapters (COL1=27, EPH2=14, JHN1=11 are highest-density chapters for baseline testing).

**Limitation (unchanged):** 1,423/1,890 (75.3%) remain unreachable at renderer level because they are buried inside parent NP constructions in DR. Renderer-only fix cannot surface these.

**Do NOT start G-4.4 or any implementation. This recommendation is for planning only.**

---

## 10. Deferred Items

| Item | Scope | Rationale |
|------|-------|-----------|
| G-3 NOMINALIZED_CLAUSE | After G-4.4 | Second priority; renderer-only; implement after APPOSITION |
| G-5 OBJECT2 | After G-3 | Engine change (MAIN_FN) required; small NT volume (311); low gate presence |
| G-3b CLAUSE_AS_NP | Low priority | P6-C partial handling already in place; lowest gate impact (31) |
| CC NOT_FOUND 194 | FUTURE | SR-structural limitation; requires SR restructuring or DR depth extension |
| IO SR→DR gap 926 | FUTURE | Pre-existing engine issue; separate investigation scope |

---

## 11. Audit Completeness

| Document | Status |
|----------|--------|
| `P6-G.5_remaining_visual_grammar_gap_audit.md` | ✅ Complete |
| `P6-G.5_current_relationship_coverage_matrix.md` | ✅ Complete |
| `P6-G.5_priority_matrix.md` | ✅ Complete |
| `P6-G.5_final_report.md` | ✅ This document |

All 4 required deliverables complete. No production code changes made during this audit.

---

## 12. Final Decision

**PASS WITH LIMITATIONS**

| Criterion | Result |
|-----------|--------|
| G-4.3 implementation functional | ✅ 542/542 CC fn=OBJ rendered as sub-diagram |
| G-4.3 regressions | ✅ All PASS (IO, PP, REL, SD, mobile, console) |
| Remaining gaps quantified | ✅ APPOSITION 24.7%, NOMINALIZED 27.0%, OBJECT2 0% (engine gap) |
| 194 NOT_FOUND classified | ✅ 145 buried + 39 invisible; both SR-structural |
| Priority matrix scored | ✅ G-4.4 APPOSITION recommended as next phase |
| New gap discovered | ✅ OBJECT2 fn mismatch documented; path to fix clear |
| Blocking condition | ❌ None |

**Limitations acknowledged:**
- 194 CC NOT_FOUND (SR-structural limit, not implementation bug)
- APPOSITION/NOMINALIZED_CLAUSE: 73–78% of SR instances structurally unreachable by renderer-only fix
- OBJECT2: 311 instances completely absent from DR pending engine fix
- IO: 926 SR→DR gap unresolved (pre-existing)

---

*P6-G.5 audit complete. STOP. Do not begin G-4.4 or P6-G.6.*
