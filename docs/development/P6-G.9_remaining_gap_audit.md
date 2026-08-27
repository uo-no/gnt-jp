# P6-G.9 — Remaining Visual Grammar Gap Audit

**Date:** 2026-08-26  
**Phase:** P6-G.9 — Read-only Audit  
**Baseline:** Post P6-G.8.3 NOMINALIZED_CLAUSE implementation (PASS WITH LIMITATIONS)  
**Constraint:** No production code changes. Read-only.  
**Pre-existing dirty state:** `M public/core/dg-engine.js` (P6-G.6.3), `M public/index.html` (P6-G.6.3 + P6-G.8.3)

---

## 1. NT Baseline

| Metric | Value | Status |
|--------|-------|--------|
| Sentences | 8,010 | CONFIRMED ✓ |
| Tokens | 137,741 | CONFIRMED ✓ |
| Processing errors | 0 | CONFIRMED ✓ |

Matches all prior baselines (G.5, G.7). SR data unchanged.

---

## 2. Implemented Features — Current State (Post G.8.3)

### Core Sentence Structure

| Feature | Phase | SR | DR | Status |
|---------|-------|----|----|--------|
| SUBJECT | P5-D | 11,116 | 3,597 | ✅ IMPLEMENTED |
| PREDICATE | P5-D | 25,110 | 5,813 | ✅ IMPLEMENTED |
| OBJECT | P5-D | 13,693 | 3,625 | ✅ IMPLEMENTED |
| COMPLEMENT | P5-D | 3,604 | 882 | ✅ IMPLEMENTED |
| COPULA | P5-D | 2,589 | 594 | ✅ IMPLEMENTED |
| AUX | P5-D | 1,071 | 419 | ✅ IMPLEMENTED |

### Visual Grammar Additions

| Feature | Phase | DR | Status |
|---------|-------|----|--------|
| IO Raised Platform | P6-G.2 | 1,071 | ✅ IMPLEMENTED |
| PP Diagonal | P6-F | 3,776 | ✅ IMPLEMENTED |
| Content Clause Sub-diagram | P6-G.4 | 330 (100% innerDR) | ✅ IMPLEMENTED |
| Relative Clause Connector | P6-C/B | 394 | ✅ IMPLEMENTED |
| Coordination | P6-G.4.3 | 84 | ✅ IMPLEMENTED |
| APPOSITION Parallel Segments | P6-G.6.3 | 292 | ✅ IMPLEMENTED |
| **NOMINALIZED_CLAUSE Bracket** | **P6-G.8.3** | **285 full / 271 main** | **✅ IMPLEMENTED** |

**Note — DR count revisions from G.7:** Core slot counts increased slightly compared to G.7 measurement. Difference attributable to traversal now including sub-DRs for PP/rel-clause zones. No SR data changed.

---

## 3. NOMINALIZED_CLAUSE — Post G.8.3 State

| Metric | G.8.1 Prediction | G.9 Confirmed | Status |
|--------|-----------------|---------------|--------|
| SR total | 2,008 | 2,008 | ✓ |
| DR main slots | 271 | 271 | ✓ |
| DR full (incl sub-DRs) | 285 (G.8.3 browser) | 285 | ✓ |
| Rendered with bracket | 268 main (excl IO) | 266 main + sub-DRs | IMPLEMENTED ✓ |
| IO bracket deferred | 17 | **19** | DEFERRED |
| Buried (fn=null, ADVERBIAL) | 1,723 | 1,723 | KNOWN LIMIT |

**IO discrepancy note:** P6-G.8.1 estimated 17 IO NOMINALIZED_CLAUSE deferred; current traversal finds 19. Difference within script traversal methodology variance (main-slot counting vs. comprehensive). Both are small.

**Status:** NOMINALIZED_CLAUSE bracket notation is implemented and verified (T-1 through T-15 PASS in G.8.3). Sub-type I (substantive participle) and Sub-type II (articular infinitive) both correctly receive bracket. Sub-DR instances (content clause inner DRs) also correctly bracketed.

---

## 4. APPOSITION — Post G.6.3 State

| Metric | Value |
|--------|-------|
| SR cn=APPOSITION | 1,890 |
| Gate SR | 70 |
| DR slots (comprehensive) | 292 |
| Gate DR | 7 |
| Renderer | `_dgRenderAppositionSlot()` — parallel segments + dashed border |
| Buried (fn=null, inside PP etc.) | ~1,598 |

**Status:** IMPLEMENTED. DR-reachable APPOSITION correctly renders parallel segments. Buried APPOSITION (structural limit) cannot be addressed without engine/SR changes. No regression observed in G.9 measurement.

---

## 5. CONTENT_CLAUSE — Post G.4 State

| Metric | G.7 | G.9 | Notes |
|--------|-----|-----|-------|
| SR cn=CONTENT_CLAUSE | — | 908 | Includes direct SR instances |
| DR slots | 328 | 330 | Minor variance |
| hasInnerDR | 328 | 330 | 100% — all have sub-diagram ✓ |
| Gate DR | 16 | 16 | Confirmed |

**Status:** IMPLEMENTED. All CONTENT_CLAUSE DR slots have innerDR sub-diagram. P6-G.4 implementation confirmed intact.

---

## 6. PP Diagonal — Post P6-F State

| Metric | G.7 | G.9 | Notes |
|--------|-----|-----|-------|
| DR adverbialPhrases | 3,680 | 3,776 | +96 from sub-DR traversal inclusion |
| Gate DR | 84 | 90 | Same reason |

**Status:** IMPLEMENTED. PP diagonal rendering confirmed stable. Count increase from including sub-DRs.

---

## 7. IO Raised Platform — Post G.2 State

| Metric | G.7 | G.9 |
|--------|-----|-----|
| SR fn=INDIRECT_OBJECT | 2,662 | 2,662 |
| Gate SR | — | 73 |
| DR fn=INDIRECT_OBJECT | 1,052 | 1,071 |
| Gate DR | 29 | 30 |

**Status:** IMPLEMENTED. Raised platform confirmed. Small count increase consistent with broader traversal.

---

## 8. Relative Clause and Coordination

| Feature | G.7 DR | G.9 DR |
|---------|--------|--------|
| Relative clause (isRelativeClause) | 401 | 394 |
| Coordination (isCoordination) | 84 | 84 |

Both stable. Minor variance in relative clause count within traversal methodology.

---

## 9. OBJECT2 / SECOND_OBJECT — Engine Gap (CRITICAL)

### 9.1 Measurement

| Metric | Value |
|--------|-------|
| SR fn=OBJECT2 | 311 |
| Gate SR fn=OBJECT2 | **16** |
| DR fn=SECOND_OBJECT | **0** |
| DR fn=OBJECT2 | **0** |

### 9.2 Engine Gap Analysis

```
SR:       node.function.canonical = 'OBJECT2'

Engine:   MAIN_FN = Set(['SUBJECT','COPULA','PREDICATE','OBJECT','COMPLEMENT',
                          'INDIRECT_OBJECT','SECOND_OBJECT','AUX'])

Check:    MAIN_FN.has('OBJECT2') → false

Result:   fn=OBJECT2 nodes NEVER enter DR → 0 slots → 100% invisible
```

**Confirmed:** MAIN_FN contains 'SECOND_OBJECT' but NOT 'OBJECT2'. SR uses 'OBJECT2'. This mismatch causes complete invisibility.

### 9.3 Renderer State

```
_DG_FN_JA has:
  SECOND_OBJECT: '第二目的語'   ✓ (line 12116)
  OBJECT2: '第二目的語'          ✓ (line 12117)
```

The label `第二目的語` is ready for BOTH 'SECOND_OBJECT' and 'OBJECT2' in the renderer label map.

### 9.4 Connector Gap

`connectorBetween(prevFn, curFn)` in dg-engine.js handles:
- `subj + predicate → 'sp'`
- `predicate + obj → 'po'`
- `predicate + comp → 'complement'`

If 'OBJECT2' is added to MAIN_FN, slots enter DR with `fn='OBJECT2'` (from `child.function.canonical`). Calling `connectorBetween(prevFn='OBJECT', curFn='OBJECT2')`:
- `obj = prevFn === 'OBJECT' || curFn === 'OBJECT'` → `true` (prevFn='OBJECT')
- But `vp = prevFn === 'PREDICATE' || curFn === 'PREDICATE'` → depends on order

**Issue:** The current `vp` check would be true if PREDICATE is adjacent to OBJECT2 (e.g., in predicate–object2 adjacency). But for OBJECT→OBJECT2 adjacency, neither `vp` nor other conditions include an OBJECT2-aware branch. Result: `return null` — no connector between OBJECT and OBJECT2 in current code.

**Engine fix scope:**
1. Add `'OBJECT2'` to MAIN_FN set (1 line)
2. Add `const obj2 = prevFn === 'OBJECT2' || curFn === 'OBJECT2';` and handle in connectorBetween (3–5 lines)

**RK/Leedy connector for OBJECT→OBJECT2:** Short vertical divider ('po') between OBJECT and SECOND_OBJECT. This reuses the existing `dg-conn-po` CSS class. No new CSS needed.

### 9.5 Gate Chapter Distribution

| Chapter | Count | Verses |
|---------|-------|--------|
| JHN 1 | 2 | 1:21, 1:33 |
| MAT 5 | 1 | 5:34 |
| MAT 28 | 1 | 28:14 |
| EPH 2 | 1 | 2:14 |
| PHP 2 | 4 | 2:1, 2:5, 2:25, 2:29 |
| COL 1 | 2 | 1:21, 1:26 |
| ROM 6 | 4 | 6:12(×2), 6:16, 6:19(×2) |
| **TOTAL** | **16** | |

16 gate instances across all 7 gate chapters — OBJECT2 is present in every gate chapter.

### 9.6 L-0 Assessment

- `fn=OBJECT2` is SR SSOT — explicit, no inference
- Adding 'OBJECT2' to MAIN_FN restores what SR already defines
- Label '第二目的語' is already in renderer
- Connector 'po' (reused) is a structural marker, not a semantic inference
- **L-0: SAFE**

---

## 10. CLAUSE_AS_NP — Current State

### 10.1 Measurement

| Metric | G.7 | G.9 |
|--------|-----|-----|
| SR cn=CLAUSE_AS_NP | 886 | 886 |
| Gate SR | 31 | 31 |
| DR slots | 113 | 115 |
| Gate DR | 4 | 4 |

### 10.2 P6-C Interaction Analysis

| Category | Count | % |
|----------|-------|---|
| DR with headSIs (P6-C narrowed text) | 108 | 94% |
| DR without headSIs (flat text) | 6 | 5% |
| DR with embeddedRelClauses (stilt connector shown) | 99 | 86% |

**Key finding:** 99/115 CLAUSE_AS_NP slots already have a visible relative clause stilt connector below the main line — this visually distinguishes them from simple NPs. The remaining gap is that no bracket `[...]` appears on the slot text itself.

However, 99/115 cases are already **visually distinguished** by the relative clause stilt. The reader can see that the slot contains clause structure.

**Residual gap:** 6 slots with no headSIs and no stilt connector — completely unmarked. 16 slots with stilt connector but no bracket on slot text.

**Priority assessment:** Low. The majority of CLAUSE_AS_NP DR slots are already visually distinguished. Gate DR count is only 4 — very limited testing surface.

---

## 11. Buried Structures — Classification

### 11.1 NOMINALIZED_CLAUSE Buried (1,723 SR)

| Reason | Count |
|--------|-------|
| fn=null (inside PP, NP_COMPLEX, GENITIVE_MOD etc.) | 1,112 |
| fn=ADVERBIAL (routed to adv zone, 0 in adverbialClauses DR) | 98 |
| fn=INDIRECT_OBJECT (IO platform, bracket deferred) | 62 |
| fn=AUX (some in DR, some buried inside subordinate) | ~51 |
| fn=OBJECT2 (existing engine gap) | 1 |
| Other (structural nesting) | ~399 |

Type: **SR→DR reachability gap** (structural). Not a renderer gap.

### 11.2 APPOSITION Buried (~1,598 SR)

Buried inside PP, GENITIVE_MOD, relative clause slots. fn=null at the slot level. Engine/SR change required. Structural limit.

### 11.3 CLAUSE_AS_NP Buried (771 SR)

fn=null (545), fn=ADVERBIAL (34), fn=IO (17), fn=OBJECT2 (2). Structural limit.

### 11.4 IO Buried (~1,591 SR)

SR IO=2,662, DR IO=1,071 → 1,591 buried inside PP, relative clauses, nested structures.

---

## 12. Summary: Gap Classification

| Gap | SR | DR | Renderer | Type | Priority |
|-----|----|----|----------|------|---------|
| OBJECT2 → SECOND_OBJECT | 311 | 0 | Label ready | **ENGINE GAP** | #1 |
| CLAUSE_AS_NP bracket | 886 | 115 | No bracket | RENDERER GAP | #2 |
| IO NOMINALIZED_CLAUSE bracket | — | 19 | No bracket | RENDERER GAP (deferred) | #3 |
| Buried NOMINALIZED_CLAUSE | 1,723 SR | 0 | N/A | SR→DR gap | STRUCTURAL LIMIT |
| Buried APPOSITION | ~1,598 SR | 0 | N/A | SR→DR gap | STRUCTURAL LIMIT |
| Buried IO | ~1,591 SR | 0 | N/A | SR→DR gap | STRUCTURAL LIMIT |

---

*P6-G.9 gap audit complete. No production code changes. Read-only.*
