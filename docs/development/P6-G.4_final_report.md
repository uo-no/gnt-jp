# P6-G.4 — CONTENT_CLAUSE fn=OBJ Root Cause Audit — Final Report

**Phase:** P6-G.4 (G-4.1 Read-only Audit)  
**Date:** 2026-08-25  
**Mode:** Read-only audit — NO code changes  
**Files changed:** 0 (audit-only)

---

## Decision

**PASS WITH LIMITATIONS**

Root cause confirmed. Repair design complete. Minimal fix scope: 540/736 cases. 196 cases excluded (buried 145 + invisible 39) pending deeper SR investigation.

---

## Problem

**P6-G.1 stated:** 736 CONTENT_CLAUSE fn=OBJ nodes "misrouted to adverbialClauses" in dg-engine.js.

**Actual visual gap:** CONTENT_CLAUSE with fn=OBJECT (736 NT-wide instances) is displayed without inner clause structure — shown as flat concatenated text in the OBJECT slot rather than as a properly structured sub-diagram showing the clause's own predicate, objects, and adverbials.

---

## Root Cause

**P6-G.1's routing claim is INCORRECT.** DR trace (all 8,010 NT sentences) shows:

| DR Location | Count | % |
|-------------|-------|---|
| Root DR slots as OBJECT (correctly routed) | 311 | 42.3% |
| Adv sub-clause slots as OBJECT (correctly routed) | 229 | 31.1% |
| Coord sub-clause slots as OBJECT | 2 | 0.3% |
| CC buried inside parent slot node | 145 | 19.7% |
| CC truly invisible (not in any slot) | 39 | 5.3% |

**The CC is NOT misrouted to adverbialClauses.** The confirmed root causes are:

1. **Flat text rendering (542 cases):** CC IS correctly in `dr.slots` as OBJECT. But renderer calls `headDisplayText(CC_node, null)` which returns all tokens concatenated. The CC's inner clause (with its own PREDICATE, OBJECT, ADVERBIAL structure) is not rendered as a sub-diagram.

2. **Parent burial (145 cases):** CC is inside a plain clause (fn=OBJECT or fn=null, cn=null) that itself goes to mainSlots. `deriveClauseCore` does not recurse into slot node descendants, so CC is unreachable as a separate element.

3. **Deep structure invisibility (39 cases):** CC inside NOMINALIZED_CLAUSE, APPOSITION, ADJ_MOD, or similar structures. CC content is absent from the DR rendering entirely.

---

## Classification

| Pattern | Count | P6-G.1 claimed | Confirmed |
|---------|-------|----------------|-----------|
| CC in root slots as OBJECT | 311 | "misrouted to adv" | CORRECTLY ROUTED — flat text issue only |
| CC in adv sub-clause slots | 229 | "misrouted to adv" | CORRECTLY ROUTED in sub-DR — flat text issue |
| CC in coord sub-clause slots | 2 | — | CORRECTLY ROUTED |
| CC buried in parent slot | 145 | "misrouted to adv" | NOT in adv; invisible due to parent clause structure |
| CC invisible (NOMINALIZED etc.) | 39 | "misrouted to adv" | NOT in adv; buried in NP/phrase nodes |

---

## Correct DR Representation

**Current DR:**
```javascript
dr.slots[i] = { fn: 'OBJECT', node: CC_node, connector: 'po'|null }
// headDisplayText(CC_node) = "ὅτι ἐν παντὶ ἐπλουτίσθητε..." (flat text)
```

**Target DR (for 542 in-slot cases):**
```javascript
dr.slots[i] = {
  fn: 'OBJECT',
  node: CC_node,
  connector: 'po'|null,
  contentClause: {
    conjunction: 'ὅτι',       // extracted from CC_node's CONJ token
    innerDR: DR_Clause,        // deriveClauseCore(CC_node's inner clause)
  }
}
// Renderer shows conjunction label + inner clause as sub-diagram
```

The inner clause DR is derived from the CC's inner clause (the clause after the conjunction), using the same `deriveClauseCore` path. No semantic inference.

---

## L-0 Assessment

| Action | L-0 | Reason |
|--------|-----|--------|
| Extract CONJ token from CC children | SAFE | Structural; no inference |
| Extract inner clause from CC children | SAFE | Structural; first clause child |
| `deriveClauseCore(inner_clause)` | SAFE | Same function; SR=SSOT |
| Render inner DR as sub-diagram | SAFE | Recursive structural rendering |
| Buried CC (145) — no fix | SAFE | Conservative; don't infer from parent |
| Invisible CC (39) — no fix | SAFE | Conservative; unusual structures |

**L-0: SAFE for minimal fix scope.**

---

## Proposed Minimal Fix

**Two files, three changes:**

### Change 1: dg-engine.js — `deriveClauseCore()` (lines 442–455)

In the `MAIN_FN.has(fn)` branch, when `child.construction?.canonical === 'CONTENT_CLAUSE'`:
- Extract conjunction token (CONJ morph)
- Extract inner clause (first clause/group child)
- Call `deriveClauseCore(inner, conjunction)` → `contentClause.innerDR`
- Add `contentClause` field to mainSlots entry (null for non-CC slots)

### Change 2: index.html — `_dgRenderMainLine()`

When `slot.contentClause !== null`:
- Show conjunction as slot text instead of full flat text
- Render `slot.contentClause.innerDR` as nested sub-diagram below the OBJECT slot

### Not changed:
- adverbialClauses routing logic (not the issue)
- fn=null → adverbialClauses path (not changed)
- CC fn=ADVERBIAL (54 cases) — correctly in adv; no change
- IO raised platform (P6-G-2) — no interaction

---

## Regression Surface

| Feature | Impact | Risk |
|---------|--------|------|
| Non-CC OBJECT slots | contentClause=null → no change | NONE |
| IO raised platform (P6-G-2) | fn=INDIRECT_OBJECT, not CC | NONE |
| PP diagonal (P6-F) | adverbialPhrases, not affected | NONE |
| Relative clauses (P6-C) | embeddedRelClauses, different path | NONE |
| SD fallback (non-gate chapters) | CC only in DG chapters | NONE |
| Mobile rendering | No CSS change required | NONE |
| Nested CC (6 cases) | Need depth limit | LOW |
| CC fn=SUBJECT (26 cases) | Same MAIN_FN path, gets contentClause | REVIEW |

---

## Test Plan

Full test matrix: `P6-G.4_test_matrix.md`

Key assertions for G-4 implementation gate:
- T-1: CC fn=OBJ in SLOT_ROOT has `contentClause` set, inner DR parsed
- T-2: Gate chapter CC counts and sub-diagram rendering
- T-5: Non-CC OBJECT slots unchanged
- T-6: IO platform baseline unchanged (P6-G-2 regression)
- T-12: 0 JS errors

---

## Coverage

| Metric | Value |
|--------|-------|
| Cases addressed by minimal fix | 540 / 736 (73.4%) |
| Cases excluded (buried) | 145 / 736 (19.7%) |
| Cases excluded (invisible) | 39 / 736 (5.3%) |
| CC fn=OBJ with connector=null (known gap) | 140 / 311 SLOT_ROOT |
| Gate chapter coverage | JHN/1, MAT/5, MAT/28, EPH/2, PHP/2, COL/1, ROM/6 |

---

## Why PASS WITH LIMITATIONS (not PASS)

**PASS conditions met:**
- Root cause confirmed by NT-wide DR trace (CONFIRMED evidence)
- Correct DR representation established
- Repair design complete (dg-engine.js + index.html, 3 changes)
- L-0 SAFE
- Regression surface analyzed

**LIMITATIONS:**
- 145 buried cases require parent clause SR restructuring — out of minimal fix scope
- 39 invisible cases involve unusual structures (NOMINALIZED_CLAUSE etc.) — scope unclear
- 140 SLOT_ROOT cases have connector=null after IO extraction — known gap, not fixed
- P6-G.1's original characterization ("misrouted to adverbialClauses") was inaccurate — the implementation scope for G-4 should be defined against confirmed findings, not P6-G.1's description

---

## Absolutes Check

| Absolute | Status |
|----------|--------|
| dg-engine.js 変更禁止 | ✅ NOT CHANGED (audit only) |
| index.html 変更禁止 | ✅ NOT CHANGED (audit only) |
| SR 変更禁止 | ✅ NOT CHANGED |
| commit / merge / push / deploy 禁止 | ✅ NOT DONE |
| G-4 実装自動進行禁止 | ✅ STOPPED HERE |

---

## Documents Produced

1. `P6-G.4_content_clause_root_cause_audit.md` — Full DR routing classification, code path analysis
2. `P6-G.4_content_clause_repair_design.md` — Correct representation, minimal fix proposal, L-0, regression surface
3. `P6-G.4_test_matrix.md` — T-1 through T-12 test assertions, coverage targets
4. `P6-G.4_final_report.md` — This document

---

## STOP

G-4.1 Read-only Audit is complete.

**Do not begin G-4 implementation. Do not auto-progress.**

Next step requires explicit G-4 implementation mandate.

---

*G-4.1 Audit — PASS WITH LIMITATIONS*
