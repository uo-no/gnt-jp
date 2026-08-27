# P6-G.5 — Priority Matrix (Post G-4.3)

**Date:** 2026-08-25  
**Phase:** P6-G.5 — Read-only audit  
**Scope:** Remaining visual grammar gaps after G-4.3 implementation  
**Constraint:** No production code changes. Scoring only. Pick 1 recommended next phase.

---

## 1. Scoring Criteria

Same criteria and weights as G-1 priority matrix:

| Criterion | Weight | Description |
|-----------|--------|-------------|
| C1: RK/Leedy Priority | ×1.5 | How fundamental is this relationship in Reed-Kellogg/Leedy diagram grammar? |
| C2: NT Volume | ×1.0 | How many SR instances exist NT-wide? (1=low, 5=high) |
| C3: Gate Coverage | ×1.0 | How many instances in gate chapters (JHN1, MAT5, MAT28, EPH2, PHP2, COL1, ROM6)? |
| C4: SR Confidence | ×1.5 | How reliable is SR data for this construction? (1=uncertain, 5=explicit SSOT) |
| C5: Implementation Risk | ×1.5 | How low-risk is implementation? (1=high risk, 5=low risk) |
| **Max Score** | | **(5×1.5) + (5×1.0) + (5×1.0) + (5×1.5) + (5×1.5) = 32.5** |

### NT Volume scale (C2)
| Score | Volume |
|-------|--------|
| 5 | >5,000 |
| 4 | 1,000–5,000 |
| 3 | 500–1,000 |
| 2 | 100–500 |
| 1 | <100 |

### Gate Coverage scale (C3)
| Score | Gate instances |
|-------|---------------|
| 5 | 60+ |
| 4 | 40–60 |
| 3 | 20–40 |
| 2 | 5–20 |
| 1 | <5 |

---

## 2. Gaps Scored

### G-2: APPOSITION Notation

**Data:** 1,890 SR / 467 in DR (24.7%) / 70 in gate chapters  
**Current:** headDisplayText = flat text (head + appositive concatenated). No "=" connector.  
**Target:** Parallel horizontal segment with dashed "=" connector (standard RK notation)  
**Engine change:** NOT required. Renderer only.

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| C1: RK/Leedy Priority | **3** | Apposition is a well-defined RK element with specific notation ("="); not a core sentence element but has dedicated visual treatment |
| C2: NT Volume | **4** | 1,890 SR instances — high volume |
| C3: Gate Coverage | **5** | 70 instances in gate chapters — highest among remaining gaps |
| C4: SR Confidence | **5** | cn=APPOSITION is explicit SSOT; children[0]=head, children[1]=appositive. No inference required. |
| C5: Implementation Risk | **3** | Renderer-only; no engine change. But requires new visual element (parallel segment + "=" connector). Moderate complexity. |

**Weighted score:** (3×1.5) + (4×1.0) + (5×1.0) + (5×1.5) + (3×1.5) = 4.5 + 4 + 5 + 7.5 + 4.5 = **25.5 / 32.5 = 78.5%**

---

### G-3: NOMINALIZED_CLAUSE Bracket Notation

**Data:** 2,008 SR / 542 in DR (27.0%) / 47 in gate chapters  
**Current:** displayText = flat text. No bracket or other marker indicating nominalized clause.  
**Target:** Bracket notation `[τὸ θέλειν]` or CSS class distinguishing clause from NP  
**Engine change:** NOT required. Renderer only.

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| C1: RK/Leedy Priority | **2** | Bracket notation for nominalized clause is useful but not among the most visually fundamental RK conventions; often treated as a label variant |
| C2: NT Volume | **4** | 2,008 SR instances — high volume (largest among gaps) |
| C3: Gate Coverage | **3** | 47 instances in gate chapters (20–40 range: JHN1=10, MAT5=12, others=25) |
| C4: SR Confidence | **5** | cn=NOMINALIZED_CLAUSE is explicit SSOT. No inference required. |
| C5: Implementation Risk | **4** | Simpler than APPOSITION: add CSS class/bracket to existing slot text. Low structural risk. |

**Weighted score:** (2×1.5) + (4×1.0) + (3×1.0) + (5×1.5) + (4×1.5) = 3 + 4 + 3 + 7.5 + 6 = **23.5 / 32.5 = 72.3%**

---

### G-5: OBJECT2 / SECOND_OBJECT Engine Gap

**Data:** 311 SR (fn=OBJECT2) / 0 in DR / gate chapter count: est. <5  
**Current:** MAIN_FN set has 'SECOND_OBJECT'; SR uses 'OBJECT2'. Mismatch → 0 DR slots. Renderer has label ready: `OBJECT2: '第二目的語'`.  
**Target:** Second object rendered as slot on baseline (standard RK position for double-object construction)  
**Engine change:** REQUIRED (add 'OBJECT2' to MAIN_FN in dg-engine.js)

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| C1: RK/Leedy Priority | **4** | Double-object construction (ditransitive) has dedicated baseline slot in RK; visually important when present |
| C2: NT Volume | **1** | 311 SR instances — small volume. NT average < 0.04/sentence. |
| C3: Gate Coverage | **1** | Estimated <5 instances in gate chapters (no confirmed count; 311 NT-wide / 8,010 sentences) |
| C4: SR Confidence | **5** | fn=OBJECT2 is explicit SSOT. Clear mismatch — fix is well-defined. |
| C5: Implementation Risk | **2** | Requires dg-engine.js change (adding to MAIN_FN). Risk of unintended MAIN_FN routing side effects. Must audit all 311 instances post-change. |

**Weighted score:** (4×1.5) + (1×1.0) + (1×1.0) + (5×1.5) + (2×1.5) = 6 + 1 + 1 + 7.5 + 3 = **18.5 / 32.5 = 56.9%**

---

### G-3b: CLAUSE_AS_NP Nominalized Status Notation

**Data:** 886 SR / 194 in DR (21.9%) / 31 in gate chapters  
**Current:** P6-C already extracts embedded relative clause; head tokens shown without nominalized-status marker.  
**Target:** Notation for nominalized status of CLAUSE_AS_NP slot (similar to NOMINALIZED_CLAUSE bracket)  
**Engine change:** NOT required. Renderer only.

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| C1: RK/Leedy Priority | **2** | Partial handling already in place (P6-C extracts rel clause). Remaining gap is a status marker only. |
| C2: NT Volume | **2** | 886 SR instances; only 194 reach DR. Effective rendering volume is 194. |
| C3: Gate Coverage | **2** | 31 instances in gate chapters (COL1=12, JHN1=10, EPH2=4, MAT28=3, PHP2=1, ROM6=1, MAT5=0) |
| C4: SR Confidence | **4** | cn=CLAUSE_AS_NP explicit; but interaction with P6-C rel clause extraction (headSIs narrowing) increases complexity. |
| C5: Implementation Risk | **3** | Renderer-only; but must account for P6-C's existing headSI extraction without breaking it. Moderate care required. |

**Weighted score:** (2×1.5) + (2×1.0) + (2×1.0) + (4×1.5) + (3×1.5) = 3 + 2 + 2 + 6 + 4.5 = **17.5 / 32.5 = 53.8%**

---

## 3. Priority Ranking Summary

| Rank | Gap | Weighted Score | % | Engine Change | Notes |
|------|-----|---------------|---|---------------|-------|
| **1** | **G-2 APPOSITION** | **25.5 / 32.5** | **78.5%** | No | Renderer only; 70 gate instances; clear SR structure |
| 2 | G-3 NOMINALIZED_CLAUSE | 23.5 / 32.5 | 72.3% | No | Renderer only; simpler implementation than APPOSITION |
| 3 | G-5 OBJECT2 | 18.5 / 32.5 | 56.9% | **Yes** | Engine fix required; small volume (311); low gate presence |
| 4 | G-3b CLAUSE_AS_NP | 17.5 / 32.5 | 53.8% | No | P6-C partial already; lowest gate impact |

---

## 4. Comparison with G-1 Estimates

| Gap | G-1 Estimate | G-5 Actual | Change |
|-----|-------------|------------|--------|
| G-2 APPOSITION | 76.9% (estimated) | 78.5% | +1.6% (confirmed DR 24.7%, gate 70) |
| G-3 NOMINALIZED | 76.9% (estimated, shared with G-2) | 72.3% | −4.6% (lower RK priority, lower gate C3) |
| G-5 OBJECT2 | Not scored in G-1 | 56.9% | New gap discovered this audit |
| G-3b CLAUSE_AS_NP | Not scored separately in G-1 | 53.8% | Partial (P6-C) → lower priority confirmed |

G-1 listed APPOSITION and NOMINALIZED_CLAUSE at equal estimates. G-5 audit with confirmed NT data differentiates them: APPOSITION ranks higher due to larger gate chapter presence (70 vs 47) and more visually fundamental RK notation.

---

## 5. Recommended Next Phase

**G-4.4: APPOSITION Notation** — Implement visual distinction for APPOSITION constructions in DR slots:
- Detect `slot.node?.construction?.canonical === 'APPOSITION'` in renderer
- Extract `children[0]` (head NP text) and `children[1+]` (appositive NP text)
- Render head as slot text, appositive as parallel element with "=" visual connector (dashed line)
- Engine change: NOT required

Rationale: Highest priority score (78.5%), renderer-only (no engine risk), largest gate chapter coverage (70 instances), explicit SR structure (children[0/1] well-defined), consistent with RK/Leedy "=" apposition notation.

**Do not start G-4.4 or any implementation. This document is read-only analysis.**

---

## 6. Items Deferred

The following items are recognized but out of scope for the next single phase:

| Item | Reason for Deferral |
|------|---------------------|
| G-3 NOMINALIZED_CLAUSE | Second highest priority; implement after G-4.4 |
| G-5 OBJECT2 | Requires dg-engine.js change; small volume; schedule after G-4.4 |
| G-3b CLAUSE_AS_NP | Partial P6-C handling; lowest effective impact |
| CC NOT_FOUND 194 | SR-structural limit; requires SR restructuring or deeper DR extraction |
| IO SR→DR gap (926) | Pre-existing engine routing issue; separate investigation needed |

---

*P6-G.5 — read-only priority matrix. No production code changes.*
