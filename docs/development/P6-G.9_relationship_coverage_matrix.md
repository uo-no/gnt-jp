# P6-G.9 — Relationship Coverage Matrix

**Date:** 2026-08-26  
**Phase:** P6-G.9 — Read-only Audit  
**Constraint:** No production code changes.  
**Pipeline:** SR → DR → Renderer candidate → Rendered → Fallback → Invisible

---

## Pipeline Definition

```
SR (Source Record)
  │
  ▼ Engine: _buildDR() — fn must be in MAIN_FN, construction must be extractable
DR (Display Record)
  │
  ▼ Renderer: _dgRenderMainLine() / _dgRenderAppositionSlot() / zone renderers
Rendered (DOM output visible to user)
  │
  ▼ Fallback (default branch: plain text)
  │
  ▼ Invisible (never reaches renderer)
```

---

## 1. Core Syntactic Function Relationships

| Relationship | SR Count | DR Count | Rendered | Visual Form | Status |
|-------------|----------|----------|----------|-------------|--------|
| SUBJECT | 11,116 | 3,597 | 3,597 | Slot label 主語 + text on baseline | ✅ FULL |
| PREDICATE | 25,110 | 5,813 | 5,813 | Slot label 述語 + text on baseline | ✅ FULL |
| OBJECT | 13,693 | 3,625 | 3,625 | Slot label 目的語 + text on baseline | ✅ FULL |
| COMPLEMENT | 3,604 | 882 | 882 | Slot label 補語 + text on baseline | ✅ FULL |
| COPULA | 2,589 | 594 | 594 | Slot label コプラ + text on baseline | ✅ FULL |
| AUX | 1,071 | 419 | 419 | Slot label (suppressed for display) + text | ✅ FULL |
| **INDIRECT_OBJECT** | 2,662 | 1,071 | 1,071 | Raised IO platform | ✅ FULL (P6-G.2) |
| **SECOND_OBJECT / OBJECT2** | 311 SR (fn=OBJECT2) | **0** | **0** | None — invisible | ❌ ENGINE GAP |

### OBJECT2 Pipeline Trace

```
SR:   node.function.canonical = 'OBJECT2'
         │
         ▼
Engine:  MAIN_FN.has('OBJECT2') → FALSE
         │
         ▼
DR:      slot NOT created → OBJECT2 = 0 in DR
         │
         ▼
Rendered: nothing (not in any DR)
         │
         ▼
Invisible: 311 SR instances completely invisible
```

**Engine fix required (dg-engine.js):**
1. `MAIN_FN.add('OBJECT2')` — 1 line change at line ~48
2. `connectorBetween()` — add OBJECT2 awareness for OBJECT→OBJECT2 adjacency

---

## 2. Sentence Connector Relationships

| Connector | prevFn | curFn | Result | Status |
|-----------|--------|-------|--------|--------|
| Subject-Predicate | SUBJECT | COPULA / PREDICATE | 'sp' → vertical baseline divider | ✅ IMPLEMENTED |
| Predicate-Object | PREDICATE / COPULA | OBJECT | 'po' → short vertical divider | ✅ IMPLEMENTED |
| Predicate-Complement | PREDICATE / COPULA | COMPLEMENT | 'complement' → diagonal line | ✅ IMPLEMENTED |
| Predicate-OBJECT2 | OBJECT / PREDICATE | OBJECT2 | **null** → NO connector rendered | ❌ CONNECTOR GAP |
| Implied | any gap | any | 'implied' → dashed line | ✅ IMPLEMENTED |

### OBJECT2 Connector Analysis

In NT Greek double-object constructions (e.g., causative verbs, verbs of making/calling), slot order is typically:
```
SUBJECT | PREDICATE | OBJECT | SECOND_OBJECT
```

`connectorBetween()` call sequence when OBJECT2 enters DR:
```javascript
connectorBetween('OBJECT', 'OBJECT2')
// obj = prevFn === 'OBJECT' || curFn === 'OBJECT'
//     = true || false = true
// BUT: vp = prevFn === 'PREDICATE' || curFn === 'PREDICATE' = false
// No vp → cannot return 'po'
// Returns: null
```

RK/Leedy convention: OBJECT and SECOND_OBJECT are separated by the same short vertical divider used between PREDICATE and OBJECT (reuse of 'po' connector). Fix: add `obj2` condition to `connectorBetween()`.

---

## 3. Construction-Level Visual Relationships

| Construction | SR Count | DR Count | Visual Treatment | Renderer Branch | Status |
|-------------|----------|----------|-----------------|-----------------|--------|
| APPOSITION | 1,890 | 292 | Parallel segments + dashed border | `_dgRenderAppositionSlot()` | ✅ FULL (P6-G.6.3) |
| CONTENT_CLAUSE | 908 | 330 | Sub-diagram with L-bracket + conjunction | `contentClause.innerDR` sub-renderer | ✅ FULL (P6-G.4) |
| **NOMINALIZED_CLAUSE** | 2,008 | 285 full | `[...]` bracket via CSS ::before/::after | `.dg-nomc` branch | ✅ FULL (P6-G.8.3) |
| CLAUSE_AS_NP | 886 | 115 | Plain text (P6-C headSIs narrowing) | Default branch | ⚠️ PARTIAL |
| COORDINATION | 84 DR | 84 | Coordination layout | `isCoordination` branch | ✅ FULL (P6-G.4.3) |

### NOMINALIZED_CLAUSE Pipeline (Post G.8.3)

```
SR:   node.construction.canonical = 'NOMINALIZED_CLAUSE'
         │
         ▼
Engine:  fn in MAIN_FN (SUBJECT/OBJECT/etc.) → DR slot created
         slot.node.construction.canonical preserved
         │
         ▼
Renderer: Branch 3 — NOMINALIZED_CLAUSE
         nomcEl = <span class="dg-nomc">
         textContent = headDisplayText(slot.node, slot.headSIs)
         │
         ▼
DOM:     span.dg-nomc → CSS ::before '[' / ::after ']'
         User sees: [τὸ εἶναι ἴσα θεῷ,] with subtle brackets
```

Coverage: 285 DR slots (100% of DR-reachable) ✅  
Buried (1,723 SR): structural limit, cannot reach renderer  
IO deferred (19 DR): IO platform renderer separate path

### CLAUSE_AS_NP Pipeline (Partial)

```
SR:   node.construction.canonical = 'CLAUSE_AS_NP'
         │
         ▼
Engine:  fn in MAIN_FN → DR slot created
         slot.headSIs = [...] (P6-C: narrowed to head NP tokens)
         slot.embeddedRelClauses = [...] (99/115 cases)
         │
         ▼
Renderer: Default branch (no dedicated CLAUSE_AS_NP branch)
         textEl.textContent = headDisplayText(slot.node, slot.headSIs)
         → Shows headSIs-narrowed text (head NP only, not full clause)
         Below baseline: relative clause stilt connector (99/115)
         │
         ▼
DOM:     Plain text + rel-clause stilt below (99/115 cases)
         User sees: head NP text WITHOUT clause bracket
```

**Gap:** No bracket `[...]` on the slot text itself. Visual distinction relies entirely on the relative clause stilt connector below the baseline. For 6/115 cases (no headSIs, no stilt), there is no visual marker at all.

**Comparison with NOMINALIZED_CLAUSE:**
- NOMINALIZED_CLAUSE: bracket `[...]` on slot text (P6-G.8.3 ✅)
- CLAUSE_AS_NP: no bracket (gap)
- Relative clause stilt is partial compensation (99/115), but is NOT equivalent to an explicit clause marker on the slot

---

## 4. Adverbial Zone Relationships

| Zone | DR Count | Visual Treatment | Status |
|------|----------|-----------------|--------|
| PP (adverbialPhrases) | 3,776 | Diagonal connector below baseline | ✅ FULL (P6-F) |
| Relative clause (isRelativeClause) | 394 | Stilt connector below baseline | ✅ FULL (P6-C/B) |
| Coordination (isCoordination) | 84 | Coordination layout | ✅ FULL (P6-G.4.3) |
| Adverbial clause | 0 measured in adverbialClauses DR | — | Minimal gap |

---

## 5. Gate Chapter Coverage Snapshot

| Gate Chapter | SUBJECT | PRED | OBJ | IO | CC | NOMC | APPOS | OBJECT2 |
|-------------|---------|------|-----|----|----|------|-------|---------|
| JHN 1 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (2 missing) |
| MAT 5 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (1 missing) |
| MAT 28 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (1 missing) |
| EPH 2 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (1 missing) |
| PHP 2 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (4 missing) |
| COL 1 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (2 missing) |
| ROM 6 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (4 missing) |

OBJECT2 is the ONLY remaining functional gap visible in gate chapters. All other core features pass in all 7 gate chapters.

---

## 6. Full Pipeline Summary — 15 Required Relationships

The P6-G.9 mandate specifies re-measurement of all relationships. Matrix below covers all 15 tracked in the NT visual grammar system:

| # | Relationship | SR | DR | Rendered | Loss at | Status |
|---|-------------|----|----|----------|---------|--------|
| 1 | SUBJECT | 11,116 | 3,597 | 3,597 | None | ✅ |
| 2 | PREDICATE | 25,110 | 5,813 | 5,813 | None | ✅ |
| 3 | OBJECT | 13,693 | 3,625 | 3,625 | None | ✅ |
| 4 | COMPLEMENT | 3,604 | 882 | 882 | None | ✅ |
| 5 | COPULA | 2,589 | 594 | 594 | None | ✅ |
| 6 | AUX | 1,071 | 419 | 419 | None | ✅ |
| 7 | IO (raised platform) | 2,662 | 1,071 | 1,071 | None | ✅ |
| 8 | PP diagonal | — | 3,776 | 3,776 | None | ✅ |
| 9 | Rel. clause stilt | — | 394 | 394 | None | ✅ |
| 10 | Coordination | — | 84 | 84 | None | ✅ |
| 11 | APPOSITION parallel | 1,890 SR | 292 DR | 292 | 1,598 buried (structural) | ✅ DR-full |
| 12 | CONTENT_CLAUSE sub-diag | 908 | 330 | 330 | None in DR | ✅ |
| 13 | NOMINALIZED_CLAUSE bracket | 2,008 | 285 | 285 | 1,723 buried (structural) | ✅ DR-full |
| 14 | **OBJECT2 / SECOND_OBJECT** | **311** | **0** | **0** | **Engine: MAIN_FN** | ❌ |
| 15 | CLAUSE_AS_NP bracket | 886 | 115 | 0 (bracket) | Renderer: no branch | ⚠️ PARTIAL |

**Exactly ONE functional gap at the engine level:** OBJECT2 (relationship #14).  
**One visual enhancement gap:** CLAUSE_AS_NP bracket (relationship #15) — partially compensated by rel-clause stilt.

---

## 7. Invisibility Analysis

### Where SR instances are lost in the pipeline

| Stage | Lost count | Mechanism |
|-------|-----------|-----------|
| SR→DR (MAIN_FN filter) | **311** (OBJECT2) | `MAIN_FN.has('OBJECT2') = false` |
| SR→DR (structural burial) | ~4,900+ | fn=null inside PP/NP_COMPLEX/GENITIVE_MOD etc. |
| SR→DR (ADVERBIAL routing) | ~98 (NOMINALIZED_CLAUSE) | Routed to adv zone, 0 in adverbialClauses DR |
| DR→Rendered (IO deferred) | 19 (NOMINALIZED_CLAUSE) | IO platform renderer has no NOMC branch |
| DR→Rendered (CLAUSE_AS_NP bracket) | 115 | No bracket renderer branch |

### Engine vs. Renderer vs. Structural

| Gap | Root cause | Fix location |
|-----|-----------|-------------|
| OBJECT2 | MAIN_FN mismatch | dg-engine.js (~2 locations) |
| CLAUSE_AS_NP bracket | No renderer branch | index.html (1 location) |
| IO NOMC bracket | IO renderer no NOMC branch | index.html IO loop (1 location) |
| Buried structures | fn=null structural | SR-level (out of scope) |

---

*P6-G.9 relationship coverage matrix complete. No production code changes.*
