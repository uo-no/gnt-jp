# P6-G.8.2 — NOMINALIZED_CLAUSE Repair Design: Final Report

**Date:** 2026-08-26  
**Phase:** P6-G.8.2 — Design  
**Predecessor:** P6-G.8.1 Read-only Audit (PASS)  
**Constraint:** No production code changes made during this phase.

---

## Decision

> **PASS — P6-G.8.3 Implementation Ready**

Design is complete. All boundary decisions are confirmed. Implementation specification is exact. Test matrix is defined. No blocking issues.

---

## A. Design Decisions — Summary

### A-1. Candidate A Confirmed

CSS pseudo-element brackets (`::before` / `::after`) selected.  
No alternative candidates remain open. Single implementation path.

### A-2. Bracket Boundary: NOMINALIZED_CLAUSE Node全体

The bracket wraps exactly what `headDisplayText(slot.node, slot.headSIs)` returns — the full NOMINALIZED_CLAUSE node's text. This is:
- Sub-type I: article + participial clause text (full displayText)
- Sub-type II: τό/τοῦ + infinitive + dependents (full displayText)

No decomposition of node internals. No children inspection. L-0 fully maintained.

### A-3. Single Renderer Branch — Both Sub-types

Sub-type I and Sub-type II are handled by the same detection branch (`slot.node.construction.canonical === 'NOMINALIZED_CLAUSE'`). No sub-type distinction in renderer.

### A-4. DOM Class: `.dg-nomc`

No conflict with any existing class in index.html.  
Single span element. No helper function.

### A-5. IO Platform NOMINALIZED_CLAUSE Deferred

17 DR slots with `fn=INDIRECT_OBJECT` are not bracketed in this phase. IO platform has its own renderer. Bracket addition to IO is a separate sub-phase (post P6-G.8.3).

### A-6. dg-engine.js: NO CHANGES

All detection and text extraction uses existing public engine API:  
`slot.node.construction.canonical` — SR SSOT  
`window.DgEngine.headDisplayText(slot.node, slot.headSIs)` — existing function

---

## B. Semantic Definition — Bracket Meaning

The bracket `[...]` on a slot expresses:

> **This slot is filled by a clause functioning in a nominal structural position (SR cn=NOMINALIZED_CLAUSE).**

It does NOT mean:
- "This is a ὅτι-clause" (CONTENT_CLAUSE uses sub-diagram for that)
- "This is an articular infinitive" (sub-type is not visually distinguished)
- "This clause has a specific semantic function"
- "The reader should interpret this differently from a noun"

The bracket is a structural signal, not a semantic label. It is sourced from SR SSOT only.

---

## C. Key Differentiations Confirmed

| Comparison | NOMINALIZED_CLAUSE | Other |
|------------|---------------------|-------|
| vs CONTENT_CLAUSE | Bracket `[...]` | Sub-diagram (L-bracket + conjunction) |
| vs regular NP | Bracket `[...]` | Plain text (no bracket) |
| vs APPOSITION | Bracket `[...]` (if top-level) | Parallel segments with dashed border |
| vs CLAUSE_AS_NP | Bracket `[...]` | Plain text (P6-C headSIs narrowing) |

CONTENT_CLAUSE and NOMINALIZED_CLAUSE use visually different treatments (sub-diagram vs. bracket). They cannot be confused by the reader.

---

## D. L-0 Audit — Final

| Criterion | Status |
|-----------|--------|
| Detection from SR SSOT | ✅ `slot.node.construction.canonical === 'NOMINALIZED_CLAUSE'` |
| Text content from existing engine function | ✅ `headDisplayText(slot.node, slot.headSIs)` — unchanged |
| Bracket meaning derivable from SR without inference | ✅ cn=NOMINALIZED_CLAUSE explicitly marks nominal clause position |
| Inner structure NOT exposed | ✅ No sub-diagram, no children decomposition |
| Sub-type NOT inferred | ✅ No distinction between Sub-type I and II |
| Semantic role NOT inferred | ✅ fn label (主語/目的語/述語) sourced from SR fn |
| **L-0 overall** | **SAFE** |

---

## E. Implementation Specification — Verified

Three changes to `public/index.html`:

| # | Type | Size | Status |
|---|------|------|--------|
| 1 | CSS desktop `.dg-nomc` | 16 lines | SPECIFIED ✅ |
| 2 | CSS mobile `.dg-nomc` | 1 line | SPECIFIED ✅ |
| 3 | JS `_dgRenderMainLine()` branch | 5 lines | SPECIFIED ✅ |

Exact code text provided in `P6-G.8.2_nominalized_clause_implementation_spec.md`.

---

## F. Regression Safety — Verified by Design

| Existing feature | Mechanism | NOMINALIZED_CLAUSE interaction | Safe? |
|----------------|-----------|-------------------------------|-------|
| CONTENT_CLAUSE sub-diagram | Branch 1 (checked first) | Never reaches Branch 3 | ✅ |
| APPOSITION parallel segments | Branch 2 (checked second) | Never reaches Branch 3 | ✅ |
| IO raised platform | Separate ioSlots loop | baseSlots loop only | ✅ |
| PP diagonal | Separate `_dgRenderAdvPhrases()` | Different DOM zone | ✅ |
| Relative clause connector | Separate adverbialClauses zone | Different DOM zone | ✅ |
| Coordination | Separate `dr.isCoordination` | Different structure | ✅ |
| Regular NP default branch | Branch 4 (else) | cn≠NOMINALIZED_CLAUSE → else | ✅ |
| Non-DG views | `_isDGChapter` gate | DG renderer not called | ✅ |

---

## G. Known Limitations — Carried Forward

| Limitation | Count | Reason |
|-----------|-------|--------|
| IO NOMINALIZED_CLAUSE no bracket | 17 DR | IO platform renderer separate — deferred |
| Buried NOMINALIZED_CLAUSE (Pattern A) | 1,112 SR | fn=null, SR-structural |
| ADVERBIAL NOMINALIZED_CLAUSE | 98 SR | Adv zone path, 0 in adverbialClauses DR |
| NOMINALIZED_CLAUSE inside APPOSITION children | Unknown | displayText() flattening — deferred |
| Sub-type II (articular inf.) gate examples | 0 in gate chapters | Validated only via node script |

---

## H. Gate Chapter Test Coverage

| Chapter | NOMINALIZED_CLAUSE DR | Primary test | T matrix |
|---------|----------------------|-------------|---------|
| JHN 1 | 0 | Regression only | T-8, T-10, T-11, T-14 |
| MAT 5 | 3 (5:4, 5:6, 5:10) | Bracket verification | T-1, T-2, T-3, T-9, T-12, T-13 |
| MAT 28 | 0 | Regression only | T-14 |
| EPH 2 | 0 | Regression only | T-8, T-9, T-14 |
| PHP 2 | 1 (2:13) | fn=COMPLEMENT bracket | T-5, T-14 |
| COL 1 | 0 | Regression only | T-14 |
| ROM 6 | 1 (6:7) | Short bracket | T-1, T-14 |

---

## I. Deliverable Index

| Document | Status |
|----------|--------|
| `P6-G.8.2_nominalized_clause_repair_design.md` | ✅ Complete |
| `P6-G.8.2_nominalized_clause_implementation_spec.md` | ✅ Complete |
| `P6-G.8.2_nominalized_clause_test_matrix.md` | ✅ Complete |
| `P6-G.8.2_nominalized_clause_final_report.md` | ✅ This document |

All 4 deliverables complete. No production code changes made during P6-G.8.2.

---

## J. Recommended Next Phase

**P6-G.8.3 — NOMINALIZED_CLAUSE Implementation**

Entry criteria (all met):
- [x] P6-G.8.1 audit complete (PASS)
- [x] Design confirmed (this document — PASS)
- [x] Candidate A selected (CSS pseudo-element)
- [x] Exact CSS and JS specified (`implementation_spec.md`)
- [x] Test matrix defined (15 tests, exit criteria listed)
- [x] Regression surface verified safe
- [x] Gate chapter test verses identified
- [x] L-0 confirmed SAFE
- [x] dg-engine.js confirmed NO CHANGE

P6-G.8.3 scope: Implement 3 changes to `public/index.html`. Verify T-1 through T-15. Write implementation final report. Decision: PASS / FAIL / BLOCKED.

Do not begin P6-G.8.3 from this document. This report is read-only.

---

*P6-G.8.2 repair design complete. STOP. Do not begin P6-G.8.3 or any implementation.*
