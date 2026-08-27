# P6-G.7 — Relationship Coverage Matrix

**Date:** 2026-08-26  
**Phase:** P6-G.7 — Read-only Audit  
**Purpose:** Full SR→DR→Renderer pipeline status for each visual grammar relationship

---

## Pipeline Model

```
SR (SSOT)
  → deriveDR()       [dg-engine.js]
    → DR slots / adv phrases / coord / rel clauses
      → Renderer     [index.html _dgRender*()]
        → Visualized
        OR
        → Flat fallback
```

Gate chapter rendering only activates for: JHN 1, MAT 5, MAT 28, EPH 2, PHP 2, COL 1, ROM 6.

---

## 1. Core Sentence Functions

### SUBJECT

| Stage | Count | Notes |
|-------|-------|-------|
| SR fn=SUBJECT | 11,116 | |
| DR slot fn=SUBJECT | 3,534 | 31.8% of SR |
| Renderer | `headDisplayText()` flat text | |
| Visualized | 3,534 | P5-D baseline slot |
| Visual | Main line slot, 主語 label | |

**Status: IMPLEMENTED** ✅

### PREDICATE

| Stage | Count | Notes |
|-------|-------|-------|
| SR fn=PREDICATE | 25,110 | |
| DR slot fn=PREDICATE | 5,700 | 22.7% of SR |
| Renderer | `headDisplayText()` | |
| Visualized | 5,700 | |

**Status: IMPLEMENTED** ✅

### OBJECT

| Stage | Count | Notes |
|-------|-------|-------|
| SR fn=OBJECT | 13,693 | |
| DR slot fn=OBJECT | 3,575 | 26.1% of SR |
| Renderer | `headDisplayText()` | |
| Visualized | 3,575 | |

**Status: IMPLEMENTED** ✅

### COMPLEMENT

| Stage | Count | Notes |
|-------|-------|-------|
| SR fn=COMPLEMENT | 3,604 | |
| DR slot fn=COMPLEMENT | 827 | 22.9% of SR |
| Renderer | `headDisplayText()` | |
| Visualized | 827 | |

**Status: IMPLEMENTED** ✅

### COPULA

| Stage | Count | Notes |
|-------|-------|-------|
| SR fn=COPULA | 2,589 | |
| DR slot fn=COPULA | 550 | 21.2% of SR |
| Renderer | `headDisplayText()` (no fn label — COPULA suppressed) | |
| Visualized | 550 | |

**Status: IMPLEMENTED** ✅

### AUX

| Stage | Count | Notes |
|-------|-------|-------|
| SR fn=AUX | 1,071 | |
| DR slot fn=AUX | 416 | 38.8% of SR |
| Renderer | `headDisplayText()` (no fn label — AUX suppressed) | |
| Visualized | 416 | |

**Status: IMPLEMENTED** ✅

---

## 2. Indirect Object — IO Raised Platform

| Stage | Count | Gate | Notes |
|-------|-------|------|-------|
| SR fn=INDIRECT_OBJECT | 2,662 | — | |
| DR fn=INDIRECT_OBJECT | 1,052 | 29 | 39.5% of SR |
| Renderer | `_dgRenderMainLine()` IO platform branch | | |
| Visualized | 1,052 | 29 | Raised platform + stalk |
| Not visualized | ~1,610 | — | Buried: inside PP, rel clause, nested clause |

**Status: IMPLEMENTED** ✅ (P6-G.2)

---

## 3. SECOND_OBJECT / OBJECT2 — Engine Gap

| Stage | Count | Gate | Notes |
|-------|-------|------|-------|
| SR fn=OBJECT2 | 311 | 16 | SR canonical: 'OBJECT2' |
| MAIN_FN set | has 'SECOND_OBJECT' | — | Does NOT have 'OBJECT2' |
| DR fn=SECOND_OBJECT | **0** | **0** | Confirmed: mismatch → 0 DR |
| Renderer | `SECOND_OBJECT: '第二目的語'` label exists | — | Label ready; never called |
| Visualized | **0** | **0** | |
| Not visualized | **311** | **16** | 100% invisible |

**Status: ENGINE GAP** ❌

Pipeline break: `MAIN_FN.has('OBJECT2') === false` → OBJECT2 nodes never enter DR slots.

Fix required: dg-engine.js — add 'OBJECT2' to MAIN_FN set (or normalize OBJECT2 → SECOND_OBJECT in `deriveClauseCore`).

Post-fix: connector between OBJECT and SECOND_OBJECT is undefined — additional design work needed.

---

## 4. PP Diagonal

| Stage | Count | Gate | Notes |
|-------|-------|------|-------|
| SR fn=PREP_PHRASE | 0 (not tracked as fn) | — | PP is a construction, not just a fn |
| DR adverbialPhrases | 3,680 | 84 | Derived by `deriveDR()` adv phrase extraction |
| Renderer | `_dgRenderAdvPhrases()` | | |
| Visualized | 3,680 | 84 | Diagonal connector + prep + NP |

**Status: IMPLEMENTED** ✅ (P6-F)

---

## 5. APPOSITION — Post G.6.3

| Stage | Count | Gate | Notes |
|-------|-------|------|-------|
| SR cn=APPOSITION | 1,890 | 70 | |
| DR slots (APPOSITION node) | ~292 | 7 | G-7 comprehensive walk |
| Gate rendered (browser) | — | 9 | Browser-confirmed |
| Renderer | `_dgRenderAppositionSlot()` | | P6-G.6.3 |
| Visualized | ~292 DR-reachable | 9 gate | Parallel segment + dashed border |
| Not visualized (buried) | ~1,598 | 61 gate SR | SR-structural limit |

**Status: IMPLEMENTED** ✅ (P6-G.6.3)

Non-visualized cases are SR-structural (buried inside PP, GENITIVE_MOD, nested CN). Engine change would be required to increase DR coverage — out of current scope.

---

## 6. Content Clause Sub-diagram

| Stage | Count | Gate | Notes |
|-------|-------|------|-------|
| DR slots with contentClause.innerDR | 328 | 16 | |
| Renderer | `_dgRenderClause(slot.contentClause.innerDR)` | | |
| Visualized | 328 | 16 | Sub-diagram with conjunction label + L-bracket |

**Status: IMPLEMENTED** ✅ (P6-G.4)

---

## 7. Relative Clause Connector

| Stage | Count | Gate | Notes |
|-------|-------|------|-------|
| DR adverbialClauses with isRelativeClause | 401 | 19 | |
| Renderer | `.dg-rel-clause` + antecedent text | | |
| Visualized | 401 | 19 | Clause stilt + antecedent bracket |

**Status: IMPLEMENTED** ✅ (P6-C / P6-B)

---

## 8. Coordination

| Stage | Count | Gate | Notes |
|-------|-------|------|-------|
| DR isCoordination | 84 | 4 | |
| Renderer | `_dgRenderCoordination()` | | |
| Visualized | 84 | 4 | coord-wrap + left border |

**Status: IMPLEMENTED** ✅ (P6-G.4.3)

---

## 9. NOMINALIZED_CLAUSE — Gap

| Stage | Count | Gate | Notes |
|-------|-------|------|-------|
| SR cn=NOMINALIZED_CLAUSE | 2,008 | 47 | |
| DR slots | 276 | 5 | 13.7% of SR |
| Renderer | `headDisplayText()` — NO bracket | — | Flat text only |
| Visualized (distinctive) | **0** | **0** | Rendered as plain text, indistinguishable from NP |
| Not visualized (buried) | 1,732 | 42 gate SR | fn=null (1,112) + adv (98) etc. |

**Status: GAP** ❌

Pipeline reach: NOMINALIZED_CLAUSE nodes with fn=SUBJECT/OBJECT/COMPLEMENT DO enter DR. Renderer receives them but displays as flat text — no visual distinction.

Target: Bracket notation `[ ... ]` or CSS class on slot text to signal clause-as-noun.

Engine change: NOT required.  
L-0: SAFE — cn=NOMINALIZED_CLAUSE is SR explicit; bracket is a presentation wrapper only.

---

## 10. CLAUSE_AS_NP — Partial Gap

| Stage | Count | Gate | Notes |
|-------|-------|------|-------|
| SR cn=CLAUSE_AS_NP | 886 | 31 | |
| DR slots | 113 | 4 | 12.8% of SR |
| P6-C partial | headSIs narrowing | — | Relative clause text extracted; slot text = head NP only |
| Renderer | `headDisplayText()` — NO clause marker | — | Flat text only |
| Visualized (distinctive) | **0** | **0** | No visual marker for clause status |
| Not visualized (buried) | 773 | 27 gate SR | fn=null (545) + adv etc. |

**Status: PARTIAL GAP** ⚠️

P6-C already handles relative pronoun text extraction. Remaining gap: no visual marker on the 113 DR slots to indicate the slot content is a clause.

Interaction constraint: any marker must not break the existing headSIs narrowing (P6-C).

---

## 11. Coverage Summary Table

| Relationship | SR | DR | Visualized | % Visualized | Status |
|-------------|----|----|------------|--------------|--------|
| SUBJECT | 11,116 | 3,534 | 3,534 | 31.8% | ✅ |
| PREDICATE | 25,110 | 5,700 | 5,700 | 22.7% | ✅ |
| OBJECT | 13,693 | 3,575 | 3,575 | 26.1% | ✅ |
| COMPLEMENT | 3,604 | 827 | 827 | 22.9% | ✅ |
| COPULA | 2,589 | 550 | 550 | 21.2% | ✅ |
| AUX | 1,071 | 416 | 416 | 38.8% | ✅ |
| INDIRECT_OBJECT (IO) | 2,662 | 1,052 | 1,052 | 39.5% | ✅ |
| OBJECT2 → SECOND_OBJECT | 311 | **0** | **0** | **0%** | ❌ ENGINE |
| PP diagonal | — | 3,680 | 3,680 | — | ✅ |
| APPOSITION | 1,890 | ~292 | ~292 | ~15.5% | ✅ |
| Content Clause | — | 328 | 328 | — | ✅ |
| Relative Clause | — | 401 | 401 | — | ✅ |
| Coordination | — | 84 | 84 | — | ✅ |
| **NOMINALIZED_CLAUSE** | 2,008 | **276** | **0 (distinctive)** | **0%** | ❌ RENDERER |
| **CLAUSE_AS_NP** | 886 | **113** | **0 (distinctive)** | **0%** | ⚠️ PARTIAL |

---

*P6-G.7 relationship coverage matrix. No production code changes.*
