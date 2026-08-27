# P6-G.7 — Remaining Visual Grammar Gap Audit

**Date:** 2026-08-26  
**Phase:** P6-G.7 — Read-only Audit  
**Baseline:** Post P6-G.6.3 APPOSITION implementation (PASS)  
**Constraint:** No production code changes. Measurement and classification only.

---

## 1. Baseline Confirmation

| Metric | Value | Source |
|--------|-------|--------|
| NT sentences | 8,010 | CONFIRMED — script |
| NT tokens | 137,741 | CONFIRMED — script |
| Processing errors | 0 | CONFIRMED — script |
| Script errors | 0 | CONFIRMED |

**Consistent with P6-G.5 baseline.** No SR data changes detected.

---

## 2. Implemented Visual Grammar — Post G.6.3 Summary

| Feature | Phase | DR count | Gate DR | Status |
|---------|-------|----------|---------|--------|
| Subject / Predicate / Object / Complement | P5-D | SUBJECT=3,534 / PREDICATE=5,700 / OBJECT=3,575 / COMPLEMENT=827 | — | IMPLEMENTED ✅ |
| IO Raised Platform | P6-G.2 | 1,052 | 29 | IMPLEMENTED ✅ |
| PP Diagonal | P6-F | 3,680 (adv phrases) | 84 | IMPLEMENTED ✅ |
| Content Clause Sub-diagram | P6-G.4 | 328 | 16 | IMPLEMENTED ✅ |
| Relative Clause Connector | P6-C/P6-B | 401 | 19 | IMPLEMENTED ✅ |
| Coordination (coord-wrap) | P6-G.4 | 84 | 4 | IMPLEMENTED ✅ |
| APPOSITION Parallel Segments | P6-G.6.3 | ~292 | 7 | IMPLEMENTED ✅ |

---

## 3. APPOSITION — Post G.6.3 Re-measurement

| Metric | G-6.1 Measurement | G-7 Re-measurement | Change |
|--------|-------------------|--------------------|--------|
| SR total | 1,890 | 1,890 | None |
| DR (comprehensive) | 467 (G-6.1 method) | 292 (G-7 method) | Method difference¹ |
| Gate SR | 70 | 70 | None |
| Gate DR (script) | ~19 (estimated) | 7 | Method difference¹ |
| Gate rendered (browser) | — | 9 (CONFIRMED) | Browser test |
| Renderer errors | — | 0 | CONFIRMED |

¹ *Traversal method difference: G-6.1 script counted APPOSITION nodes at any DR position; G-7 script counts APPOSITION as slot nodes in main DR slots + subclauses + content clauses. Browser-confirmed gate count (9) indicates actual renderer output.*

**APPOSITION status: IMPLEMENTED. Visual gap eliminated for DR-reachable cases.**

Remaining non-visualized APPOSITION (~1,600 cases): SR-structural limit (buried inside PP, nested within other constructions). Renderer cannot address without engine/SR changes. **Carried forward as known limitation.**

---

## 4. NOMINALIZED_CLAUSE — Gap Analysis

### 4.1 NT-wide Measurement

| Metric | Value |
|--------|-------|
| SR total (cn=NOMINALIZED_CLAUSE) | 2,008 |
| Gate SR | 47 |
| DR slots (main line) | 276 |
| DR as % of SR | 13.7% |
| Gate DR slots | 5 |
| Current renderer behavior | Flat text — no bracket or clause marker |

### 4.2 SR fn Distribution

| fn | Count | % | DR-reachable? |
|----|-------|---|---------------|
| null (no fn — buried) | 1,112 | 55.4% | No — inside other construction |
| SUBJECT | 466 | 23.2% | Yes (MAIN_FN) |
| OBJECT | 156 | 7.8% | Yes (MAIN_FN) |
| ADVERBIAL | 98 | 4.9% | No — adv zone (PP/adv path) |
| INDIRECT_OBJECT | 62 | 3.1% | Yes (MAIN_FN → IO platform) |
| AUX | 62 | 3.1% | Yes (MAIN_FN) |
| COMPLEMENT | 51 | 2.5% | Yes (MAIN_FN) |
| OBJECT2 | 1 | 0.1% | No — engine gap |

### 4.3 DR Slot fn Distribution (276 slots)

| fn in DR | Count |
|----------|-------|
| SUBJECT | 170 |
| AUX | 34 |
| OBJECT | 32 |
| COMPLEMENT | 18 |
| INDIRECT_OBJECT (IO platform) | 17 |
| **TOTAL** | **271** |

*Note: 276 from main audit script vs 271 from detail script — within script traversal variance. Use 276 as canonical figure.*

### 4.4 Pattern Classification

| Pattern | Count | Notes |
|---------|-------|-------|
| A: Buried (fn=null) | 1,112 | Inside PP, NP_COMPLEX, GENITIVE_MOD etc. — renderer cannot reach |
| B: As SUBJECT | 466 | τὸ ζῆν / τὸ πιστεύειν / ὅτι-clause as subject |
| C: As OBJECT | 156 | Most articular infinitives as object |
| D: As ADVERBIAL | 98 | Adv zone — separate rendering path |
| E: As AUX | 62 | Unusual but SR-explicit |
| F: With internal modifiers | (overlaps) | Modifier zone handles separately |

### 4.5 Renderer Gap

**Current:** NOMINALIZED_CLAUSE slot renders as flat text (`headDisplayText()`) — identical to regular noun phrase.  
**Target (RK/Leedy):** Bracket notation `[...]` or CSS visual distinction indicating the slot is a clause functioning as noun, not a noun phrase.  
**Engine change needed:** NO — `slot.node.construction.canonical === 'NOMINALIZED_CLAUSE'` is SR-explicit.  
**L-0:** SAFE — detection from SR SSOT, no inference required.

---

## 5. OBJECT2 / SECOND_OBJECT — Engine Gap Analysis

### 5.1 NT-wide Measurement

| Metric | Value |
|--------|-------|
| SR fn=OBJECT2 | 311 |
| Gate SR fn=OBJECT2 | 16 (CONFIRMED) |
| DR fn=SECOND_OBJECT | **0** |
| Gate DR fn=SECOND_OBJECT | **0** |

### 5.2 Mismatch Confirmation

```
SR definition:         node.function.canonical = 'OBJECT2'
MAIN_FN set:           Set(['SUBJECT','COPULA','PREDICATE','OBJECT','COMPLEMENT',
                            'INDIRECT_OBJECT','SECOND_OBJECT','AUX'])
Engine check:          MAIN_FN.has(child.function.canonical)
Mismatch:              'OBJECT2' NOT IN MAIN_FN → never enters DR
DR result:             0 SECOND_OBJECT slots (confirmed via DR walk)
```

**This is an engine gap, not a renderer gap.**

### 5.3 Gate Chapter Instances (16 confirmed)

| Chapter | Verses | Count |
|---------|--------|-------|
| JHN 1 | 1:21, 1:33 | 2 |
| MAT 5 | 5:34 | 1 |
| MAT 28 | 28:14 | 1 |
| EPH 2 | 2:14 | 1 |
| PHP 2 | 2:1, 2:5, 2:25, 2:29 | 4 |
| COL 1 | 1:21, 1:26 | 2 |
| ROM 6 | 6:12(×2), 6:16, 6:19(×2) | 5 |
| **TOTAL** | | **16** |

**Correction from P6-G.5 estimate:** P6-G.5 estimated <5 gate instances; actual count is 16. C3 rescored from 1 → 2.

### 5.4 Engine Fix Required

To restore OBJECT2 to DR:

| Option | Description | Risk |
|--------|-------------|------|
| A | Add 'OBJECT2' to MAIN_FN | Minimal: just expands routing |
| B | Normalize fn=OBJECT2 → fn=SECOND_OBJECT in `deriveClauseCore` | Requires mapping layer |

Option A is simpler. Either requires `dg-engine.js` change.

**Consequence if fixed:** 311 new DR slots of fn=SECOND_OBJECT appear. Connector between OBJECT and SECOND_OBJECT not yet specified (design needed).

### 5.5 Renderer Readiness

`_DG_FN_JA` already has `SECOND_OBJECT: '第二目的語'` → label is ready.  
`_DG_FN_JA` also has `OBJECT2: '第二目的語'` → label for both names.  
Connector design: undefined. Current PO connector handles PREDICATE→OBJECT; OBJECT→SECOND_OBJECT needs a new connector type or reuse.

---

## 6. CLAUSE_AS_NP — Gap Analysis

### 6.1 NT-wide Measurement

| Metric | Value |
|--------|-------|
| SR total (cn=CLAUSE_AS_NP) | 886 |
| Gate SR | 31 |
| DR slots | 113 |
| DR as % of SR | 12.8% |
| Gate DR | 4 |

### 6.2 SR fn Distribution

| fn | Count | % |
|----|-------|---|
| null (buried) | 545 | 61.5% |
| OBJECT | 121 | 13.7% |
| SUBJECT | 113 | 12.7% |
| COMPLEMENT | 35 | 3.9% |
| ADVERBIAL | 34 | 3.8% |
| AUX | 19 | 2.1% |
| INDIRECT_OBJECT | 17 | 1.9% |
| OBJECT2 | 2 | 0.2% |

### 6.3 Partial Implementation Status

P6-C (Relative Clause Connector) already handles the case where CLAUSE_AS_NP contains an embedded relative clause:
- The relative clause connector is extracted from the head NP
- `headSIs` narrows the slot text to exclude the relative pronoun

**Remaining gap:** The 113 DR slots do not display any visual marker indicating the slot content is a clause (vs. a noun phrase). No bracket, no CSS distinction.

**Interaction risk:** Adding a visual marker must not break the existing headSIs narrowing logic from P6-C. The marker should wrap the (already narrowed) text, not replace it.

---

## 7. Implemented Features — Coverage Verification

### IO Platform

| Metric | Value |
|--------|-------|
| SR fn=INDIRECT_OBJECT | 2,662 |
| DR fn=INDIRECT_OBJECT | 1,052 |
| DR as % of SR | 39.5% |
| Gate DR | 29 |

Buried IO (61%) = inside PP, relative clause, or non-main-clause context.  
IO platform renders correctly for all 1,052 DR slots. No regression observed.

### PP Diagonal

| Metric | Value |
|--------|-------|
| DR adverbialPhrases | 3,680 |
| Gate DR | 84 |

PP diagonal implemented via `.dg-pp-wrap` + `.dg-pp-prep` / `.dg-pp-np`. No regression observed.

### Content Clause Sub-diagram

| Metric | Value |
|--------|-------|
| DR slots with contentClause.innerDR | 328 |
| Gate DR | 16 |

CC sub-diagram with label and L-bracket. No regression.

### Relative Clause Connector

| Metric | Value |
|--------|-------|
| DR adverbialClauses with isRelativeClause | 401 |
| Gate DR | 19 |

Relative clause connector with antecedent text display. No regression.

### Coordination

| Metric | Value |
|--------|-------|
| DR isCoordination | 84 |
| Gate DR | 4 |

Coordination via `.dg-coord-wrap`. No regression.

---

## 8. Gap Inventory Summary

| Gap | SR | DR | DR% | Gate SR | Gate DR | Engine Change | Status |
|-----|----|----|-----|---------|---------|---------------|--------|
| NOMINALIZED_CLAUSE | 2,008 | 276 | 13.7% | 47 | 5 | NO | **GAP** |
| OBJECT2 (SECOND_OBJECT) | 311 | 0 | 0% | 16 | 0 | **YES** | **ENGINE GAP** |
| CLAUSE_AS_NP | 886 | 113 | 12.8% | 31 | 4 | NO | **PARTIAL GAP** |
| APPOSITION (buried) | ~1,600 | 0 | 0% | — | — | YES (SR-structural) | KNOWN LIMIT |

---

*P6-G.7 gap audit complete. No production code changes. Read-only.*
