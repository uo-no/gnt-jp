# P6-G.9 — Priority Matrix

**Date:** 2026-08-26  
**Phase:** P6-G.9 — Read-only Audit  
**Constraint:** No production code changes.  
**Purpose:** Select exactly ONE next implementation candidate from remaining gaps.

---

## 1. Evaluation Criteria

| Criterion | Label | Scale | Weight |
|-----------|-------|-------|--------|
| RK/Leedy Structural Priority | C1 | 1–5 (5=highest) | High |
| NT Volume (SR count) | C2 | 1–5 | Medium |
| Gate Chapter Coverage | C3 | 1–5 | High |
| SR Confidence (detection reliability) | C4 | 1–5 | High |
| Implementation Risk (lower = safer) | C5 | 1–5 (5=lowest risk) | Medium |
| L-0 Safety | C6 | SAFE / UNSAFE / CONDITIONAL | Gate |

**C6 is a gate criterion**: UNSAFE gaps are not eligible regardless of other scores.

---

## 2. Candidate Gap Inventory

### Gap A — OBJECT2 (ENGINE GAP)

**Description:** SR fn=OBJECT2 nodes never enter DR because 'OBJECT2' is absent from MAIN_FN. 311 SR instances, 16 gate instances. Complete invisibility: no label, no connector, no slot.

**Pipeline:** SR → engine MAIN_FN filter → **BLOCKED** → 0 DR → 0 rendered

| Criterion | Score | Evidence |
|-----------|-------|----------|
| C1 RK/Leedy Priority | 5 | Ditransitive is a fundamental RK/Leedy diagram category. In all NT Greek grammars, double-object verbs (causative, denominative, verbs of naming/making/calling) are explicitly diagrammed with SECOND_OBJECT on the baseline after the first object. |
| C2 NT Volume | 3 | 311 SR (100–499 range) — meaningful but not high volume |
| C3 Gate Coverage | 5 | **16 gate instances across ALL 7 gate chapters** — highest gate penetration of any remaining gap |
| C4 SR Confidence | 5 | `fn=OBJECT2` is explicit SR SSOT. No inference needed. Label `第二目的語` already in `_DG_FN_JA`. |
| C5 Implementation Risk | 3 | dg-engine.js changes required (2 locations: MAIN_FN + connectorBetween). Moderate risk vs. index.html-only changes. Both changes are small (1–5 lines each). |
| C6 L-0 Safety | **SAFE** | fn=OBJECT2 from SR SSOT. Connector 'po' is structural, not semantic inference. |
| **Total (C1+C2+C3+C4+C5)** | **21/25** | |

**Fix scope:**
1. `dg-engine.js` line ~48: Add `'OBJECT2'` to MAIN_FN set
2. `dg-engine.js` `connectorBetween()` line ~80–106: Add OBJECT2-aware branch

**Connector design (confirmed):** `connectorBetween(prevFn='OBJECT', curFn='OBJECT2')` should return `'po'`. This reuses the existing `dg-conn-po` CSS class. No new CSS or renderer changes needed. The renderer default branch already handles slot text correctly (label from `_DG_FN_JA['OBJECT2'] = '第二目的語'` ✓).

**Risk assessment:**
- MAIN_FN change is 1 token in a Set literal — surgical
- connectorBetween change is 2–3 new lines in an existing if-else chain
- No renderer changes in index.html required (slot renders via default branch)
- Regression surface: any sentence with OBJECT2 slot — but this is currently 0 DR slots, so NO existing rendering is disturbed
- No CSS changes needed

---

### Gap B — CLAUSE_AS_NP Bracket (RENDERER GAP)

**Description:** 115 DR slots with cn=CLAUSE_AS_NP have no bracket `[...]` on slot text. 99/115 already have relative clause stilt connector below the baseline (P6-C), providing partial visual distinction.

**Pipeline:** SR → DR (115 slots present) → renderer default branch → plain text (no bracket)

| Criterion | Score | Evidence |
|-----------|-------|----------|
| C1 RK/Leedy Priority | 2 | Relative clause modifiers are already shown via stilt connector. Bracket on head NP adds marginal structural clarity. Not a standard RK/Leedy first-tier feature. |
| C2 NT Volume | 3 | 886 SR, 115 DR effective — comparable to NOMINALIZED_CLAUSE in scope |
| C3 Gate Coverage | 1 | Only 4 gate DR instances — very limited gate testing surface |
| C4 SR Confidence | 4 | cn=CLAUSE_AS_NP is explicit SR SSOT. But headSIs interaction with P6-C adds complexity. |
| C5 Implementation Risk | 4 | index.html-only change (renderer branch addition). Similar to NOMINALIZED_CLAUSE G.8.3. |
| C6 L-0 Safety | SAFE | cn=CLAUSE_AS_NP is SR SSOT. Bracket is structural. |
| **Total (C1+C2+C3+C4+C5)** | **14/25** | |

**Priority reduction factors:**
- 99/115 cases ALREADY visually distinguished by relative clause stilt — the visual gap is smaller than volume suggests
- Only 4 gate DR instances → minimal testing surface in gate chapter protocol
- C1 structural priority low because existing stilt connector partially fulfills the role
- Would require audit phase first (similar scope to G.8.1–G.8.2 pipeline) before implementation

---

### Gap C — IO NOMINALIZED_CLAUSE Bracket (DEFERRED RENDERER GAP)

**Description:** 19 DR IO slots with cn=NOMINALIZED_CLAUSE have no bracket. Deferred from P6-G.8.3 because the IO platform renderer is a separate code path.

**Pipeline:** SR → DR (19 IO slots) → IO renderer loop (`ioSlots[]`) → no NOMC branch → plain text

| Criterion | Score | Evidence |
|-----------|-------|----------|
| C1 RK/Leedy Priority | 3 | Consistency with existing NOMINALIZED_CLAUSE bracket implementation. But IO is a secondary display zone. |
| C2 NT Volume | 1 | Only 19 DR slots — smallest scope of all candidates |
| C3 Gate Coverage | 2 | Gate estimate: 2–3 IO NOMINALIZED_CLAUSE in gate chapters (unconfirmed, not measured) |
| C4 SR Confidence | 5 | cn=NOMINALIZED_CLAUSE from SR SSOT (same as already-implemented bracket) |
| C5 Implementation Risk | 4 | index.html-only change. IO renderer branch addition is parallel to G.8.3 work. |
| C6 L-0 Safety | SAFE | Identical logic to G.8.3. |
| **Total (C1+C2+C3+C4+C5)** | **15/25** | |

**Priority reduction factors:**
- Volume too small to justify a full audit-design-implementation pipeline
- IO platform already correctly renders slot text (just without bracket)
- Can be bundled into a future IO platform enhancement phase

---

## 3. Priority Ranking

| Rank | Gap | Score | Gate DR | Risk | Decision |
|------|-----|-------|---------|------|---------|
| **#1** | **OBJECT2 (Engine Gap)** | **21/25** | **16** | Moderate (engine) | **SELECTED** |
| #2 | IO NOMC Bracket | 15/25 | ~2–3 | Low (renderer) | DEFERRED |
| #3 | CLAUSE_AS_NP Bracket | 14/25 | 4 | Low (renderer) | DEFERRED |

---

## 4. Selection Rationale — OBJECT2

### Why OBJECT2 is #1

**1. Gate penetration is decisive.**  
16 gate instances across all 7 gate chapters is the highest of any remaining gap. Every gate chapter has at least one invisible OBJECT2 slot. The existing test protocol (gate chapter verification) will immediately reveal this gap to any reviewer opening JHN 1, MAT 5, PHP 2, or ROM 6.

**2. Structural completeness — not cosmetic.**  
OBJECT2/SECOND_OBJECT is a core syntactic function, not a construction subtype. It belongs in MAIN_FN alongside SUBJECT, PREDICATE, OBJECT. Its absence is a correctness issue, not a coverage enhancement. The ditransitive construction (verbs of making, calling, naming, commanding) is a documented NT Greek grammatical category.

**3. SR SSOT is unambiguous.**  
`fn=OBJECT2` is explicit in SR. No inference. The renderer label `第二目的語` is already prepared. The fix is a direct alignment between MAIN_FN and SR canonical values.

**4. Fix is self-contained.**  
Two small changes in dg-engine.js. No index.html changes needed. No CSS changes needed. No new construction detection logic. The default renderer branch already produces correct output once the slot is admitted to DR.

**5. Risk is bounded.**  
Currently 0 DR slots exist for OBJECT2 — therefore there is no existing rendering to regress. The regression surface is only: (a) the new slots now rendered, and (b) the connector between OBJECT and OBJECT2. Both are verifiable in gate chapters.

### Why CLAUSE_AS_NP is NOT #1

- 99/115 cases already distinguished by stilt connector → the visual gap is smaller than the volume implies
- Only 4 gate DR instances → gate chapter protocol barely touches it
- Would still require full audit → design → implementation pipeline (not a quick follow-on)
- Lower structural priority than correcting an engine mismatch

### Why IO NOMC is NOT #1

- 19 slots is too small to justify a standalone audit pipeline
- IO bracket is a consistency enhancement, not a structural correctness issue
- Can be bundled with a future IO platform pass

---

## 5. Next Phase Recommendation

**Selected candidate:** OBJECT2 / SECOND_OBJECT engine gap  
**Recommended next phase:** P6-G.10 — OBJECT2 Engine Fix  
**Phase type:** Audit → Design → Implementation (3-sub-phase pattern)

### Recommended sub-phase structure

```
P6-G.10.1 — OBJECT2 Read-only Audit
  - Confirm exact MAIN_FN location in dg-engine.js (line number)
  - Confirm exact connectorBetween() change needed
  - Trace all 16 gate SR instances
  - Verify _DG_FN_JA label presence
  - Define T-1 through T-N test matrix
  - Gate: READ ONLY

P6-G.10.2 — OBJECT2 Repair Design
  - Confirm exact code changes (dg-engine.js ONLY)
  - Connector behavior specification
  - Regression surface definition
  - Test matrix exit criteria

P6-G.10.3 — OBJECT2 Implementation
  - Implement 2 changes in dg-engine.js
  - Run T-matrix across gate chapters
  - Final report
```

**Files in scope for implementation:**
- `public/core/dg-engine.js` — MAIN_FN + connectorBetween()
- `public/index.html` — NO CHANGE expected

**Files explicitly out of scope:**
- SR data
- DR schema
- index.html renderer
- CSS

---

## 6. Deferred Items

| Gap | Next phase | When |
|-----|-----------|------|
| CLAUSE_AS_NP bracket | P6-G.11 | After OBJECT2 |
| IO NOMINALIZED_CLAUSE bracket | P6-G.12 or bundled with IO platform pass | TBD |
| Buried NOMINALIZED_CLAUSE | Future structural work | Out of current scope |
| Buried APPOSITION | Future structural work | Out of current scope |

---

*P6-G.9 priority matrix complete. ONE candidate selected: OBJECT2. No production code changes made.*
