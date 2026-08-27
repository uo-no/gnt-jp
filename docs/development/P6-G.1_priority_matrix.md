# P6-G.1 Priority Matrix — Visual Grammar Gap Prioritization

**Date:** 2026-08-25
**Phase:** P6-G.1 NT-wide visual grammar gap re-audit (read-only)
**Purpose:** Rank remaining visual grammar gaps to identify the next implementation candidate.
**Constraint:** Next candidate is data-driven. Do NOT predecide. Appraise all gaps equally.

---

## 1. Scoring Criteria

Each gap is evaluated on 5 criteria, each scored 1–5 (5 = highest priority).

| Criterion | Description |
|---|---|
| **C1: RK/Leedy Visual Priority** | How fundamental is this notation in Reed–Kellogg / Leedy diagramming theory |
| **C2: NT-wide Volume** | Raw count of affected SR nodes across all 27 NT books |
| **C3: Gate Chapter Coverage** | Instances in the 7 DG gate chapters (immediate visibility) |
| **C4: SR Confidence** | Clarity of the SR SSOT signal; absence of inference requirement |
| **C5: Implementation Risk** | Inverse of complexity; dg-engine.js requirement reduces score |

**Weighting:** C1 × 1.5 + C2 × 1.0 + C3 × 1.0 + C4 × 1.5 + C5 × 1.5 (max = 27.5)

---

## 2. Gap Candidates

### G-1: INDIRECT_OBJECT Raised Platform

| Criterion | Score | Evidence |
|---|---|---|
| C1: RK/Leedy Priority | **5** | IO platform is one of 5 fundamental RK diagram elements (subj/pred/obj/comp/IO). Not secondary notation — a core structural distinction from OBJECT. |
| C2: NT Volume | **5** | 2,662 instances — 6th largest fn.canonical in NT; larger than COMPLEMENT (3,604) only if weighting unique structural roles |
| C3: Gate Coverage | **5** | 73 instances across all 7 gate chapters (JHN 1: 22, MAT 5: 20, MAT 28: 12) |
| C4: SR Confidence | **5** | fn=INDIRECT_OBJECT is explicit SSOT. No fn inference. No construction ambiguity. |
| C5: Implementation Risk | **5** | index.html only. CSS platform geometry + JS slot routing. No dg-engine.js. Low regression risk (isolated to IO slot). |

**Weighted score:** 5×1.5 + 5×1.0 + 5×1.0 + 5×1.5 + 5×1.5 = **32.5 / 32.5 → 100%**

---

### G-2: APPOSITION Notation

| Criterion | Score | Evidence |
|---|---|---|
| C1: RK/Leedy Priority | **3** | Apposition has a conventional RK notation (parallel horizontal with = connector) but is less fundamental than IO platform. Secondary structural layer. |
| C2: NT Volume | **4** | 1,890 instances — significant; 10th most common construction |
| C3: Gate Coverage | **5** | 70 instances across gate chapters (COL 1: 27, EPH 2: 14) |
| C4: SR Confidence | **5** | cn=APPOSITION is explicit SSOT. No inference. |
| C5: Implementation Risk | **3** | index.html only but requires new `extractApposition()` or extension of `extractSlotModifiers()`. More complex DOM than IO platform. Both NP children must be rendered distinctly. |

**Weighted score:** 3×1.5 + 4×1.0 + 5×1.0 + 5×1.5 + 3×1.5 = **25.0 / 32.5 → 76.9%**

---

### G-3: NOMINALIZED_CLAUSE Notation

| Criterion | Score | Evidence |
|---|---|---|
| C1: RK/Leedy Priority | **2** | Nominalization notation (bracket/parenthesis) is a recognized convention but not a fundamental diagram element. Often acceptable as flat text in simplified diagrams. |
| C2: NT Volume | **4** | 2,008 instances — comparable to APPOSITION in volume |
| C3: Gate Coverage | **3** | 47 instances in gate chapters (MAT 5: 12, JHN 1: 10) |
| C4: SR Confidence | **5** | cn=NOMINALIZED_CLAUSE is explicit SSOT. |
| C5: Implementation Risk | **4** | index.html only. Detect cn=NOMINALIZED_CLAUSE in slot children and add bracket notation. Moderate complexity. |

**Weighted score:** 2×1.5 + 4×1.0 + 3×1.0 + 5×1.5 + 4×1.5 = **25.0 / 32.5 → 76.9%**

---

### G-4: CONTENT_CLAUSE fn=OBJECT Routing Fix

| Criterion | Score | Evidence |
|---|---|---|
| C1: RK/Leedy Priority | **4** | Complement clause as direct object is structurally significant — it should occupy the OBJECT slot on the baseline, not appear as adverbial. Current misrouting is a structural error. |
| C2: NT Volume | **3** | 736 fn=OBJECT instances (of 908 CONTENT_CLAUSE total) — moderate |
| C3: Gate Coverage | **3** | ~25 fn=OBJECT cases in gate chapters (est. 81% of 31 total) |
| C4: SR Confidence | **4** | fn=OBJECT is explicit SSOT. But the DR routing bug means the renderer currently cannot access it through normal DR output. Requires engine fix to surface. |
| C5: Implementation Risk | **1** | **Requires dg-engine.js change.** deriveClauseCore() must route CONTENT_CLAUSE by fn (OBJECT → slots, ADVERBIAL → adverbialClauses). Risk of regression in adverbialClauses rendering. Complex testing requirement. |

**Weighted score:** 4×1.5 + 3×1.0 + 3×1.0 + 4×1.5 + 1×1.5 = **22.5 / 32.5 → 69.2%**

---

### G-5: SECOND_OBJECT Notation

| Criterion | Score | Evidence |
|---|---|---|
| C1: RK/Leedy Priority | **2** | Double-object diagrams have specialized RK notation but are rare and complex. Low practical urgency. |
| C2: NT Volume | **1** | 311 instances — smallest MAIN_FN category by far |
| C3: Gate Coverage | **1** | Estimated ~7–8 instances in gate chapters |
| C4: SR Confidence | **5** | fn=SECOND_OBJECT is explicit SSOT. |
| C5: Implementation Risk | **4** | index.html only; similar pattern to IO platform. |

**Weighted score:** 2×1.5 + 1×1.0 + 1×1.0 + 5×1.5 + 4×1.5 = **18.0 / 32.5 → 55.4%**

---

## 3. Priority Ranking

| Rank | Gap | Score | % Max | Verdict |
|---|---|---|---|---|
| 1 | **G-1: INDIRECT_OBJECT Platform** | 32.5 | 100% | → Next candidate |
| 2 | **G-2: APPOSITION Notation** | 25.0 | 76.9% | Phase after G-1 |
| 2 | **G-3: NOMINALIZED_CLAUSE** | 25.0 | 76.9% | Phase after G-1/G-2 |
| 4 | **G-4: CONTENT_CLAUSE Routing** | 22.5 | 69.2% | Requires dg-engine.js — schedule separately |
| 5 | **G-5: SECOND_OBJECT** | 18.0 | 55.4% | Low volume; defer |

---

## 4. G-1 Recommendation Rationale

**INDIRECT_OBJECT raised platform is the next implementation target.**

Three factors independently converge on G-1:

1. **RK/Leedy theory:** The IO platform is not optional decoration — it is one of the 5
   structural positions that define a Reed–Kellogg diagram. Without the platform, the diagram
   cannot be called RK-conformant for ditransitive constructions. SUBJECT, PREDICATE, OBJECT,
   COMPLEMENT have their structural positions; IO does not yet have its platform.

2. **Data volume and gate coverage:** 2,662 NT-wide instances; 73 in 7 gate chapters.
   IO appears in every gate chapter (JHN 1: 22, MAT 5: 20). Visibility on delivery is high.

3. **Implementation profile:** 100% SR confidence, 0% dg-engine.js risk, index.html only.
   The DR already isolates IO in `slots` with fn=INDIRECT_OBJECT. CSS geometry + JS routing
   change. Exactly the same risk profile as P6-F (PP diagonal), which passed P6-F.1 audit.

**G-4 (CONTENT_CLAUSE routing)** is the highest severity structural error in the current system
but must be scheduled separately due to dg-engine.js requirement. It is a Phase G-4 candidate,
not Phase G-2.

---

## 5. Implementation Scope Estimate for G-1

- **CSS additions (~8 lines):**
  ```css
  .dg-io-platform-wrap { ... }     /* vertical connector + platform */
  .dg-io-platform { ... }          /* horizontal line for IO head NP */
  .dg-io-text { ... }              /* IO text + fn label */
  @media (max-width: 480px) { ... } /* mobile adjustment */
  ```
- **JS changes (~25 lines in `_dgRenderSlots()`):**
  - Detect `slot.fn === 'INDIRECT_OBJECT'`
  - Render as separate visual element with raised platform
  - Connector line from predicate position to platform
- **dg-engine.js:** NO CHANGES
- **Regression surface:** Narrow — only IO slot items affected; other slots unchanged

---

*P6-G.1 — read-only audit. No production code changes.*
