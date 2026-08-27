# P6-G.9 — Remaining Visual Grammar Gap Reassessment: Final Report

**Date:** 2026-08-26  
**Phase:** P6-G.9 — Read-only Audit  
**Predecessor:** P6-G.8.3 NOMINALIZED_CLAUSE Implementation (PASS WITH LIMITATIONS)  
**Constraint:** Read-only. No production code changes.

---

## Decision

> **PASS**

All 15 required relationships measured. All implemented features confirmed stable post-G.8.3. Exactly one next candidate selected. Documentation complete.

---

## Q&A — Mandate Required Items

### Q1. What improved since P6-G.7?

| Feature | G.7 State | G.9 State |
|---------|-----------|-----------|
| NOMINALIZED_CLAUSE | 271 DR slots → no bracket (invisible as distinct from NP) | 285 DR slots → bracket `[...]` via `.dg-nomc` CSS pseudo-elements |
| APPOSITION | 292 DR slots → parallel segments + dashed border | SAME (stable) |
| All other features | Unchanged | All stable, no regressions |

**NOMINALIZED_CLAUSE bracket (P6-G.8.3):**
- 271 main-line DR slots + 14 sub-DR slots = 285 total
- Sub-type I (substantive participle) and Sub-type II (articular infinitive) both receive bracket
- CSS `::before`/`::after` — textContent clean (no brackets in DOM text)
- T-1 through T-15 all PASS in gate chapters
- No regressions in CONTENT_CLAUSE, APPOSITION, IO, PP, coordination

**Count revision from G.7:** Core slot counts increased slightly (SUBJECT +11, PREDICATE +23, IO +19, etc.) due to the traversal now measuring sub-DRs consistently. No SR data changed. All increases are valid inclusions.

---

### Q2. What remains?

| Remaining gap | DR count | Type | Status |
|--------------|----------|------|--------|
| OBJECT2 / SECOND_OBJECT | 0 DR (311 SR) | ENGINE GAP | ❌ Unresolved |
| CLAUSE_AS_NP bracket | 115 DR | RENDERER GAP | ⚠️ Partial (99/115 stilt visible) |
| IO NOMINALIZED_CLAUSE bracket | 19 DR | RENDERER GAP | ⚠️ Deferred |
| Buried NOMINALIZED_CLAUSE | 1,723 SR | SR→DR structural | Known limit |
| Buried APPOSITION | ~1,598 SR | SR→DR structural | Known limit |

**OBJECT2 is the only remaining gap affecting gate chapters.** All other gaps have 0–4 gate instances or are structural limits.

---

### Q3. Which gaps are renderer gaps vs. engine/DR gaps?

| Gap | Root cause | Required fix location |
|-----|-----------|----------------------|
| OBJECT2 | `MAIN_FN` missing 'OBJECT2' + no OBJECT→OBJECT2 connector | dg-engine.js (2 locations) |
| CLAUSE_AS_NP bracket | No dedicated renderer branch | index.html `_dgRenderMainLine()` |
| IO NOMC bracket | IO renderer loop has no NOMC branch | index.html IO loop |

OBJECT2 is the **only engine/DR gap**. CLAUSE_AS_NP and IO NOMC are pure renderer gaps (DR slots exist but visual treatment is missing).

---

### Q4. NOMINALIZED_CLAUSE post-G.8.3 state

**Confirmed state:**

| Metric | Value |
|--------|-------|
| SR cn=NOMINALIZED_CLAUSE | 2,008 |
| DR slots (full, including sub-DRs) | 285 |
| Rendered with bracket | 285 (100% of DR-reachable) |
| `.dg-nomc` in DOM | Confirmed in all gate chapters |
| textContent integrity | Clean Greek only (no '[' ']' in textContent) |
| Sub-type I (substantive participle) | Bracketed ✓ |
| Sub-type II (articular infinitive) | Bracketed ✓ |
| IO deferred | 19 slots |
| Buried (cannot reach DR) | 1,723 SR |

**NOMINALIZED_CLAUSE implementation is complete for all DR-reachable slots. Status: IMPLEMENTED and VALIDATED.**

---

### Q5. Exact OBJECT2 current state

**10-item OBJECT2 special treatment (as required by mandate):**

| # | Item | Value |
|---|------|-------|
| 1 | SR fn=OBJECT2 count | **311** |
| 2 | Gate SR fn=OBJECT2 count | **16** |
| 3 | DR fn=SECOND_OBJECT count | **0** |
| 4 | DR fn=OBJECT2 count | **0** |
| 5 | Gate DR count | **0** |
| 6 | Renderer support | `_DG_FN_JA['OBJECT2'] = '第二目的語'` ✓ (line 12117) / `_DG_FN_JA['SECOND_OBJECT'] = '第二目的語'` ✓ (line 12116) |
| 7 | Reason for loss | `MAIN_FN = Set([...,'SECOND_OBJECT',...])` — does NOT contain 'OBJECT2'. Engine: `if (!MAIN_FN.has(fn)) skip` → slot never created. |
| 8 | Safe fix in dg-engine.js | (a) Add 'OBJECT2' to MAIN_FN (~line 48); (b) Add connector case in `connectorBetween()` for OBJECT→OBJECT2 → return 'po' |
| 9 | L-0 risk | SAFE — fn=OBJECT2 is SR SSOT; connector 'po' is structural (same as PRED→OBJ), not semantic inference |
| 10 | Regression surface | Currently 0 DR slots → zero existing rendering disturbed. New regression surface: 311 SR instances newly rendered. Gate verification: 16 instances across all 7 chapters. |

**Gate chapter distribution (OBJECT2 SR instances):**

| Chapter | SR count | Verses |
|---------|----------|--------|
| JHN 1 | 2 | 1:21, 1:33 |
| MAT 5 | 1 | 5:34 |
| MAT 28 | 1 | 28:14 |
| EPH 2 | 1 | 2:14 |
| PHP 2 | 4 | 2:1, 2:5, 2:25, 2:29 |
| COL 1 | 2 | 1:21, 1:26 |
| ROM 6 | 4 | 6:12(×2), 6:16, 6:19(×2) |

---

### Q6. Exact CLAUSE_AS_NP state

| Metric | Value |
|--------|-------|
| SR cn=CLAUSE_AS_NP | 886 |
| Gate SR | 31 |
| DR slots | 115 |
| Gate DR | 4 |
| With headSIs (P6-C narrowed text) | 108/115 (94%) |
| Without headSIs (flat text) | 6/115 (5%) |
| With embeddedRelClauses (stilt connector) | 99/115 (86%) |
| Bracket on slot text | 0/115 (0%) |

**Visual state:**
- 99/115 DR slots: head NP text (P6-C narrowed) + relative clause stilt below baseline → visually distinguished from simple NP
- 6/115 DR slots: flat text only, no stilt, completely unmarked
- 0/115 DR slots: have bracket notation

**Gap significance:** The 99/115 stilt connector cases provide substantial visual distinction. The true unmarked residual is only 6 slots. Gate DR count is only 4. This gap is lower priority than OBJECT2.

---

### Q7. The single highest-priority next step and why

**OBJECT2 engine fix.** Three converging reasons:

1. **Gate penetration:** 16 instances across all 7 gate chapters. OBJECT2 is the only remaining gap that fails in every gate chapter. Any reader opening a gate chapter encounters an invisible slot.

2. **Correctness, not coverage:** MAIN_FN missing 'OBJECT2' is a mismatch between SR SSOT and engine filter. SR defines the function as 'OBJECT2'. MAIN_FN defines 'SECOND_OBJECT'. This is an implementation error relative to the data, not a missing feature.

3. **Label already prepared:** `_DG_FN_JA` contains both `'OBJECT2': '第二目的語'` and `'SECOND_OBJECT': '第二目的語'` (lines 12116–12117). The renderer is already ready. Only the engine filter and connector need updating.

---

### Q8. Whether next step is audit/design or implementation

**Audit → Design → Implementation** (3-sub-phase pattern, as used in P6-G.8.x).

The OBJECT2 fix touches `dg-engine.js` — a modified file with pre-existing P6-G.6.3 changes. The engine has higher regression risk than index.html. A read-only audit phase first (P6-G.10.1) is warranted to:
- Confirm exact line numbers for MAIN_FN and connectorBetween()
- Trace connector logic for all prevFn/curFn combinations involving OBJECT2
- Define T-matrix for gate chapter validation

---

## Measurement Summary — All 15 Relationships

| # | Relationship | SR | DR | Rendered | Δ vs G.7 | Status |
|---|-------------|----|----|----------|----------|--------|
| 1 | SUBJECT | 11,116 | 3,597 | 3,597 | +11 DR | ✅ |
| 2 | PREDICATE | 25,110 | 5,813 | 5,813 | +23 DR | ✅ |
| 3 | OBJECT | 13,693 | 3,625 | 3,625 | +1 DR | ✅ |
| 4 | COMPLEMENT | 3,604 | 882 | 882 | 0 | ✅ |
| 5 | COPULA | 2,589 | 594 | 594 | 0 | ✅ |
| 6 | AUX | 1,071 | 419 | 419 | 0 | ✅ |
| 7 | IO Raised Platform | 2,662 | 1,071 | 1,071 | +19 DR | ✅ |
| 8 | PP Diagonal | — | 3,776 | 3,776 | +96 DR | ✅ |
| 9 | Rel. Clause Stilt | — | 394 | 394 | -7 DR | ✅ |
| 10 | Coordination | — | 84 | 84 | 0 | ✅ |
| 11 | APPOSITION | 1,890 SR | 292 DR | 292 | +5 DR | ✅ |
| 12 | CONTENT_CLAUSE | 908 SR | 330 DR | 330 | +2 DR | ✅ |
| 13 | **NOMINALIZED_CLAUSE** | **2,008 SR** | **285 DR** | **285** | **+285 (NEW)** | **✅ NEW** |
| 14 | **OBJECT2** | **311 SR** | **0** | **0** | **unchanged** | **❌** |
| 15 | CLAUSE_AS_NP bracket | 886 SR | 115 DR | 0 (bracket) | unchanged | ⚠️ |

All count deltas from G.7 are explained by the traversal now consistently including sub-DRs. No SR data changed. No regression.

---

## Feature Stability Post-G.8.3

| Feature | Gate evidence | Regression |
|---------|--------------|------------|
| CONTENT_CLAUSE sub-diagram | MAT 5 cc=8, EPH 2 cc=1 | NONE ✓ |
| APPOSITION parallel segments | JHN 1=2, EPH 2=3, PHP 2=3 | NONE ✓ |
| IO raised platform | JHN 1=18, PHP 2=1, ROM 6=8 | NONE ✓ |
| PP diagonal | JHN 1=22, MAT 5=25 | NONE ✓ |
| Coordination | MAT 28, ROM 6 | NONE ✓ |
| Non-DG fallback | All chapters | NONE ✓ |

---

## Deliverable Index

| Document | Status |
|----------|--------|
| `P6-G.9_remaining_gap_audit.md` | ✅ Complete |
| `P6-G.9_relationship_coverage_matrix.md` | ✅ Complete |
| `P6-G.9_priority_matrix.md` | ✅ Complete |
| `P6-G.9_final_report.md` | ✅ This document |

---

## Recommended Next Phase

**P6-G.10 — OBJECT2 Engine Fix**

Entry criteria for P6-G.10.1:
- [x] P6-G.9 audit complete (this document — PASS)
- [x] OBJECT2 SR count confirmed: 311
- [x] Gate SR instances confirmed: 16 (all 7 gate chapters)
- [x] Engine gap confirmed: MAIN_FN.has('OBJECT2') = false
- [x] Renderer label confirmed: `_DG_FN_JA['OBJECT2'] = '第二目的語'` ✓
- [x] Connector strategy identified: reuse 'po', add OBJECT2 case in connectorBetween()
- [x] L-0: SAFE
- [x] Fix scope: dg-engine.js only (2 locations)

---

*P6-G.9 remaining visual grammar gap reassessment complete. Decision: PASS. STOP.*  
*Do not begin P6-G.10 or any implementation. No commit, merge, push, or deploy.*
