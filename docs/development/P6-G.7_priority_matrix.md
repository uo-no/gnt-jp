# P6-G.7 — Priority Matrix (Post G.6.3)

**Date:** 2026-08-26  
**Phase:** P6-G.7 — Read-only Audit  
**Predecessor:** P6-G.5 priority matrix (pre-APPOSITION implementation)  
**Scope:** Re-score remaining gaps with confirmed NT measurements

---

## 1. Scoring Criteria

Same criteria and weights as P6-G.5 (unchanged for consistency):

| Criterion | Weight | Description |
|-----------|--------|-------------|
| C1: RK/Leedy Priority | ×1.5 | How fundamental is this relationship in Reed-Kellogg/Leedy notation? |
| C2: NT Volume | ×1.0 | How many SR instances? (1=<100, 2=100–500, 3=500–1,000, 4=1,000–5,000, 5=>5,000) |
| C3: Gate Coverage | ×1.0 | How many gate chapter instances? (1=<5, 2=5–20, 3=20–40, 4=40–60, 5=60+) |
| C4: SR Confidence | ×1.5 | SR data reliability (1=uncertain, 5=explicit SSOT) |
| C5: Implementation Risk | ×1.5 | Implementation safety (1=high risk, 5=low risk) |
| **Max Score** | | **(5×1.5) + (5×1.0) + (5×1.0) + (5×1.5) + (5×1.5) = 32.5** |

---

## 2. Gaps Scored

### G-3: NOMINALIZED_CLAUSE Bracket Notation

**Data:** 2,008 SR / 276 in DR (13.7%) / 47 gate SR / 5 gate DR  
**Current:** DR slot renders as flat text via `headDisplayText()`. Indistinguishable from regular NP.  
**Target:** Bracket notation `[...]` or CSS visual class — slot text wrapped to signal clause-as-noun  
**Engine change:** NOT required  
**L-0:** SAFE — detection from cn=NOMINALIZED_CLAUSE (SR SSOT); bracket is presentation only

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| C1: RK/Leedy Priority | **3** | Bracket notation for nominalized clauses (articular infinitives, substantive ὅτι-clauses) is standard in Reed-Kellogg; visually communicates that a clause fills a noun-slot — distinct from NP. More nuanced than main line separators but above a cosmetic label. |
| C2: NT Volume | **4** | 2,008 SR instances (1,000–5,000 range) — largest remaining SR gap |
| C3: Gate Coverage | **3** | 47 gate SR instances (20–40 range); 5 gate DR — moderate gate presence |
| C4: SR Confidence | **5** | cn=NOMINALIZED_CLAUSE is explicit SSOT. No inference required. fn=SUBJECT/OBJECT/COMPLEMENT subsets well-defined. |
| C5: Implementation Risk | **4** | Renderer-only. Can detect at `slot.node.construction.canonical === 'NOMINALIZED_CLAUSE'`. Bracket wraps existing `headDisplayText()` output. Low structural risk. No engine change. No connector change needed. |

**Weighted score:**  
(3×1.5) + (4×1.0) + (3×1.0) + (5×1.5) + (4×1.5)  
= 4.5 + 4.0 + 3.0 + 7.5 + 6.0  
= **25.0 / 32.5 = 76.9%**

**Change from P6-G.5:** 72.3% → 76.9% (+4.6pp). C1 re-evaluated upward after APPOSITION implementation (bracket notation has comparable RK importance to parallel segment; now clearer without APPOSITION competing for attention).

---

### G-5: OBJECT2 / SECOND_OBJECT Engine Gap

**Data:** 311 SR fn=OBJECT2 / 0 DR / 16 gate SR (correction: P6-G.5 estimated <5; actual = 16)  
**Current:** fn=OBJECT2 in SR is NOT in MAIN_FN set → 0 DR slots → 100% invisible  
**Target:** Second object rendered as baseline slot with 第二目的語 label (RK double-object position)  
**Engine change:** REQUIRED — add 'OBJECT2' to MAIN_FN in dg-engine.js  
**L-0:** SAFE — fn=OBJECT2 is SR explicit; no inference required

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| C1: RK/Leedy Priority | **4** | Ditransitive double-object construction has dedicated visual treatment in RK: both DO and IO appear on main baseline. Second object slot is structurally important, not cosmetic. |
| C2: NT Volume | **2** | 311 SR instances (100–500 range). NT average: 0.039/sentence. Low absolute volume. |
| C3: Gate Coverage | **2** | **16 gate instances (5–20 range)** — corrected from P6-G.5 estimate of <5. PHP2 and ROM6 have highest density. |
| C4: SR Confidence | **5** | fn=OBJECT2 is explicit SSOT. Mismatch is well-defined and specific. Fix is unambiguous. |
| C5: Implementation Risk | **2** | Requires dg-engine.js change (expanding MAIN_FN). Must audit OBJECT2→SECOND_OBJECT slot routing, connector between OBJECT and SECOND_OBJECT (undefined), and 311 post-fix instances. Engine change is contained but non-trivial. |

**Weighted score:**  
(4×1.5) + (2×1.0) + (2×1.0) + (5×1.5) + (2×1.5)  
= 6.0 + 2.0 + 2.0 + 7.5 + 3.0  
= **20.5 / 32.5 = 63.1%**

**Change from P6-G.5:** 56.9% → 63.1% (+6.2pp). C3 corrected from 1 to 2 (actual gate count = 16, not <5). Confirms this gap is more gate-present than previously estimated, but engine risk keeps it ranked below NOMINALIZED_CLAUSE.

---

### G-3b: CLAUSE_AS_NP Clause Status Notation

**Data:** 886 SR / 113 in DR (12.8%) / 31 gate SR / 4 gate DR  
**Current:** DR slot renders as flat text. P6-C already handles rel clause extraction (headSIs); remaining gap is no clause marker.  
**Target:** Visual marker indicating slot content is a clause (not NP). Must not break P6-C headSIs narrowing.  
**Engine change:** NOT required  
**L-0:** SAFE — cn=CLAUSE_AS_NP is SR explicit

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| C1: RK/Leedy Priority | **2** | Partial handling already in place (P6-C headSIs). Remaining gap is a status marker for 113 DR slots. Less visual impact than NOMINALIZED_CLAUSE bracket (relative clause already has the rel-clause stilt connector). |
| C2: NT Volume | **2** | 886 SR / 113 effective DR (100–500 effective rendering volume). |
| C3: Gate Coverage | **2** | 31 gate SR / 4 gate DR. Low gate DR presence. |
| C4: SR Confidence | **4** | cn=CLAUSE_AS_NP is explicit. However, P6-C interaction (headSIs) adds complexity. Score 4 vs 5 due to interaction risk. |
| C5: Implementation Risk | **3** | Renderer-only. BUT must not disturb P6-C's `headSIs` narrowing which runs on the same slot. Marker must wrap the already-narrowed text output. Moderate care required. |

**Weighted score:**  
(2×1.5) + (2×1.0) + (2×1.0) + (4×1.5) + (3×1.5)  
= 3.0 + 2.0 + 2.0 + 6.0 + 4.5  
= **17.5 / 32.5 = 53.8%**

**Change from P6-G.5:** Unchanged. CLAUSE_AS_NP interaction with P6-C limits practical gain.

---

## 3. Priority Ranking Summary

| Rank | Gap | Weighted Score | % | Engine Change | Status |
|------|-----|---------------|---|---------------|--------|
| **1** | **G-3 NOMINALIZED_CLAUSE** | **25.0 / 32.5** | **76.9%** | No | Renderer only |
| 2 | G-5 OBJECT2 | 20.5 / 32.5 | 63.1% | **Yes** | Engine fix required |
| 3 | G-3b CLAUSE_AS_NP | 17.5 / 32.5 | 53.8% | No | Partial handling already |

---

## 4. Comparison with P6-G.5

| Gap | P6-G.5 Score | P6-G.7 Score | Change | Reason |
|-----|-------------|-------------|--------|--------|
| G-2 APPOSITION | 78.5% | — | *IMPLEMENTED* | P6-G.6.3 PASS |
| G-3 NOMINALIZED_CLAUSE | 72.3% | **76.9%** | +4.6pp | C1 re-evaluated +1 |
| G-5 OBJECT2 | 56.9% | **63.1%** | +6.2pp | C3 corrected: gate=16 (was <5) |
| G-3b CLAUSE_AS_NP | 53.8% | **53.8%** | 0 | Unchanged |

**Key changes:**
1. APPOSITION removed from ranking (implemented).
2. NOMINALIZED_CLAUSE now unambiguously #1 remaining gap.
3. OBJECT2 higher than estimated (more gate presence), but engine risk keeps it at #2.

---

## 5. Implementation Preconditions

### G-3 NOMINALIZED_CLAUSE

**Entry criteria:**
- Read-only audit (G-7.x): DONE after this phase
- Design doc: required before implementation
- Engine change: NONE needed
- Gate chapter test verses with NOMINALIZED_CLAUSE in DR: JHN 1, MAT 5

**Estimated scope:**
- 1 new CSS class (`.dg-nomc-bracket` or similar wrapper)
- 1 new detection branch in `_dgRenderMainLine()` (after APPOSITION branch)
- Optional: mobile CSS override
- No engine change

**Risk:** LOW. Additive renderer change, no existing features affected.

---

### G-5 OBJECT2 (deferred)

**Entry criteria:**
- NOMINALIZED_CLAUSE implementation complete
- Separate design audit for MAIN_FN expansion + connector design
- Gate chapter OBJECT2 instances pre-documented (16 instances, all identified)

**Estimated scope:**
- dg-engine.js: add 'OBJECT2' to MAIN_FN set
- Connector between OBJECT and SECOND_OBJECT: design required
- 311 post-fix instances to validate

**Risk:** MODERATE. Engine change required. New connector type needed.

---

### G-3b CLAUSE_AS_NP (deferred)

**Entry criteria:**
- NOMINALIZED_CLAUSE implementation complete
- Design specifying P6-C headSIs interaction clearly resolved

**Estimated scope:**
- Renderer-only. Add clause marker around headDisplayText output.
- Must not break P6-C rel clause connector.

**Risk:** LOW (renderer) but P6-C interaction requires care.

---

## 6. Items Deferred from P6-G.5

| Item | Previous status | Current status |
|------|----------------|----------------|
| APPOSITION | Rank #1 | IMPLEMENTED ✅ |
| G-3 NOMINALIZED_CLAUSE | Rank #2 | **New Rank #1** |
| G-5 OBJECT2 | Rank #3 | **Rank #2** (gate count corrected) |
| G-3b CLAUSE_AS_NP | Rank #4 | **Rank #3** (unchanged) |
| Buried APPOSITION (~1,600) | Known limit | Known limit — unchanged |
| IO SR→DR gap (1,610 buried) | Known limit | Known limit — unchanged |

---

*P6-G.7 priority matrix. No production code changes.*
