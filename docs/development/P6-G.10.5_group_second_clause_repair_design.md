# P6-G.10.5 — Group Second-Clause Reachability: Repair Design

**Date:** 2026-08-26  
**Phase:** P6-G.10.5 — Read-Only Audit → Repair Design  
**Status:** DESIGN ONLY — no code has been changed  
**Constraint:** READ-ONLY. No implementation in this phase.

---

## A. Repair Options Evaluated

### Option A — Replace `.find()` with `.filter()`

**Description:** Change line 530 from `.find(c => c.type === 'clause')` to `.filter(c => c.type === 'clause')`. For groups with multiple clause children (no extraPhrases), return a DR with `isCoordination: true` and `coordClauses` derived from each clause child.

**Pros:**
- Minimal line change (1 new constant, 1 changed expression)
- Architecturally consistent: mirrors how `deriveFromNode()` COORDINATION branch handles multiple clauses
- Generic: fixes the gap for ALL fn values (PREDICATE, SUBJECT, OBJECT, OBJECT2 etc.), not just OBJECT2
- Renderer already handles `isCoordination: true` correctly (line 12570 in index.html)
- L-0 safe: no inference added

**Cons:**
- Changes DR shape for all groups with 2+ clause children (961 groups after excluding 5 extraPhrases edge cases)
- 944 non-OBJECT2 groups will now render previously-invisible second clauses — visual change at scale
- The 5 groups with 2+ clauses AND non-empty extraPhrases require special handling

**Assessment:** RECOMMENDED with the `extraPhrases.length === 0` guard (see Selected Approach).

---

### Option B — Explicitly traverse second clause only

**Description:** After `deriveClauseCore(clauseChild, conjunction)`, also check if a second clause exists and specifically look for OBJECT2 nodes in it.

**Pros:**
- Minimal scope (targets only OBJECT2)

**Cons:**
- ARCHITECTURALLY WRONG — the audit confirms the gap is generic. PREDICATE, SUBJECT, OBJECT from the second clause are equally dropped. An OBJECT2-specific fix creates an inconsistent engine where OBJECT2 is privileged over PREDICATE.
- Fragile — adds an OBJECT2-specific branch to a general traversal function
- Does not fix the 944 non-OBJECT2 groups

**Assessment:** REJECTED. Generic gap requires generic fix.

---

### Option C — Generic recursive group traversal

**Description:** Rewrite `deriveFromGroup()` to recursively traverse all children at all depths, building a unified slot list.

**Pros:**
- Most complete

**Cons:**
- Highest regression risk — completely changes how all groups are processed
- Overkill: the gap is specifically at the "first clause child" level, not deeper

**Assessment:** DEFERRED. The targeted Option A is sufficient for this phase.

---

### Option D — Add a group child extraction helper

**Description:** Extract clause-child selection logic into a helper `getGroupClauses(node)` that returns all clause children.

**Pros:**
- Isolates behavior
- Testable independently

**Cons:**
- Adds abstraction for a single-function fix
- No benefit over Option A for a single `.find()` → `.filter()` change

**Assessment:** NOT NEEDED for this phase.

---

## B. Selected Approach: Option A with ExtraPhrases Guard

### B.1 Rationale

Option A is the only architecturally sound choice. The gap is generic. The fix must expose all fn values (PREDICATE, SUBJECT, OBJECT, OBJECT2 etc.) in the second clause, not just OBJECT2.

The `extraPhrases.length === 0` guard is added because 5 NT groups have both 2+ clause children AND non-empty extraPhrases (COMPLEMENT nodes). For those 5 groups:
- None contain OBJECT2 in their second clause (confirmed)
- Their current DR output (first clause + merged COMPLEMENT slots) is an existing behavior
- Changing them to a coordination DR without handling extraPhrases correctly would create a regression

The guard preserves existing behavior for those 5 edge cases while fixing all 961 other multi-clause groups.

### B.2 SR SSOT Compliance

The second clause children are:
- Annotated with `function.canonical` by the SR team
- Marked `status: "CONFIRMED"` and `derivedFrom: ["role"]`
- Explicitly encoded in the SR tree

No new inference is performed. The repair reads SR-explicit structure that was previously silently dropped.

### B.3 Existing DR Architecture Compatibility

The renderer at `index.html:12570` handles `dr.isCoordination === true` with `coordClauses`:

```javascript
if (dr.isCoordination && dr.coordClauses.length > 0) {
    const coordWrap = document.createElement('div');
    coordWrap.className = 'dg-coord-wrap';
    for (const subDr of dr.coordClauses) {
        // renders each as dg-coord-clause
    }
    wrap.appendChild(coordWrap);
    return wrap;  // early return, does NOT render dr.slots
}
```

When `isCoordination: true`, the renderer renders `coordClauses` and ignores `dr.slots`. This is exactly what the repair produces for multi-clause groups. No renderer change needed.

---

## C. Implementation Specification

### C.1 File

`public/core/dg-engine.js`

### C.2 Function

`deriveFromGroup(node, conjunction)` — lines 529–588

### C.3 Current Logic (lines 530–545)

```javascript
function deriveFromGroup(node, conjunction) {
    const clauseChild  = (node.children || []).find(c => c.type === 'clause');
    const extraPhrases = (node.children || []).filter(
      c => c.type !== 'clause' && c.type !== 'token' && c.function?.canonical
    );

    let dr;
    if (clauseChild) {
      dr = deriveClauseCore(clauseChild, conjunction);
    } else {
      dr = {
        id: node.id, conjunction,
        slots: [], adverbialPhrases: [], adverbialClauses: [],
        isCoordination: false, coordClauses: [], noVerb: true,
        isParticipalClause: false,
      };
    }
    // ... extraPhrases merge loop, slot re-sort, connector recomputation (lines 548–585)
```

### C.4 Proposed Logic (lines 530–545, change only)

```javascript
function deriveFromGroup(node, conjunction) {
    const clauseChildren = (node.children || []).filter(c => c.type === 'clause');
    const clauseChild    = clauseChildren[0] || null;
    const extraPhrases   = (node.children || []).filter(
      c => c.type !== 'clause' && c.type !== 'token' && c.function?.canonical
    );

    let dr;
    if (clauseChildren.length > 1 && extraPhrases.length === 0) {
      dr = {
        id: node.id, conjunction,
        slots: [], adverbialPhrases: [], adverbialClauses: [],
        isCoordination: true,
        coordClauses: clauseChildren.map((cl, i) =>
          deriveClauseCore(cl, i === 0 ? conjunction : null)
        ),
        noVerb: false,
        isParticipalClause: false,
      };
    } else if (clauseChild) {
      dr = deriveClauseCore(clauseChild, conjunction);
    } else {
      dr = {
        id: node.id, conjunction,
        slots: [], adverbialPhrases: [], adverbialClauses: [],
        isCoordination: false, coordClauses: [], noVerb: true,
        isParticipalClause: false,
      };
    }
    // ... remainder of function UNCHANGED (lines 548–585)
```

### C.5 Change Summary

| Item | Before | After |
|------|--------|-------|
| Line 530 | `const clauseChild = ...find(c => c.type === 'clause')` | `const clauseChildren = ...filter(c => c.type === 'clause')` |
| Line 530 (new) | (none) | `const clauseChild = clauseChildren[0] \|\| null;` |
| Lines 536–545 | `if (clauseChild) { dr = deriveClauseCore(...) } else { ... }` | New branch for `clauseChildren.length > 1 && extraPhrases.length === 0`, followed by existing branches |
| Lines 548–588 | Unchanged | Unchanged |

**Total lines changed:** 1 modified (`const clauseChild = ...find` → `const clauseChildren = ...filter`)  
**Total lines added:** 1 (new `const clauseChild = clauseChildren[0]`) + 9 (new `if` branch) = 10  
**Total lines removed:** 0  
**Functions affected:** `deriveFromGroup()` only  
**Files affected:** `dg-engine.js` only. `index.html`: ZERO changes.

### C.6 Unchanged Code Paths

The following are explicitly NOT changed:

| Path | Status | Evidence |
|------|--------|---------|
| `deriveClauseCore()` | Unchanged | Not touched |
| `connectorBetween()` | Unchanged | Not touched |
| `deriveFromNode()` | Unchanged | Not touched |
| All other `.find()` calls (lines 191, 195, 603, 606, 632, 635, 650, 653) | Unchanged | Contextually correct |
| `index.html` renderer | Unchanged | Already handles `isCoordination: true` |
| SR data files | Unchanged | READ-ONLY |
| `extraPhrases` merge loop (lines 548–569) | Unchanged | For multi-clause case, `extraPhrases.length === 0` guarantees loop body never executes |
| Slot re-sort and connector logic (lines 572–585) | Unchanged | For multi-clause case, `dr.slots = []`, `dr.slots.length > 1` is false → no-op |

---

## D. Edge Case Analysis

### D.1 Groups with 2+ Clause Children AND Non-Empty ExtraPhrases (5 cases)

| Verse | nCls | ExtraPhrases | hasOBJ2inSecond |
|-------|------|-------------|----------------|
| 2CO 11:26 (group 1) | 6 | COMPLEMENT, COMPLEMENT | NO |
| 2CO 11:26 (group 2) | 2 | COMPLEMENT, COMPLEMENT, COMPLEMENT | NO |
| 2PE 2:13 | 7 | COMPLEMENT, COMPLEMENT | NO |
| PHP 3:5 | 4 | COMPLEMENT, COMPLEMENT, COMPLEMENT | NO |
| ROM 1:28 | 2 | COMPLEMENT | NO |

All 5 have `hasOBJ2inSecond=false` — no OBJECT2 in their second clause. The `extraPhrases.length === 0` guard:
- Preserves existing behavior for these 5 groups (fall through to `else if (clauseChild)`)
- Incurs no coverage loss (none contain OBJECT2 in second clause)
- Note: these groups still drop their second+ clause content — but that was true before the fix and no OBJECT2 is missed

**Future consideration:** A follow-on phase could extend the fix to also handle the extraPhrases case (merge extraPhrases into first coordClause). Not in scope for P6-G.10.5.

### D.2 Groups with Single Clause Child (Vast Majority)

For groups with exactly 1 clause child (`clauseChildren.length === 1`):
- `clauseChildren[0] || null` = the one clause child
- `clauseChildren.length > 1` is false → falls through to `else if (clauseChild)`
- Behavior IDENTICAL to current

### D.3 Groups with Zero Clause Children

Unchanged: falls through to `else` branch, returns empty DR.

### D.4 Behavior of `extraPhrases` Loop for Multi-Clause Case

```javascript
// extraPhrases loop (lines 548–569, unchanged)
for (const p of extraPhrases) { ... }
```

When `clauseChildren.length > 1 && extraPhrases.length === 0`:
- `extraPhrases` is empty → loop body never executes
- `dr.slots` remains `[]`
- No spurious slots added to multi-clause DR

### D.5 Connector Recomputation for Multi-Clause Case

```javascript
// Slot re-sort and connectors (lines 572–581, unchanged)
if (dr.slots.length > 1) { ... }
```

For multi-clause case: `dr.slots.length === 0` → condition false → block skipped.

Each `coordClause` DR already has its connectors set by `deriveClauseCore()`. No re-sort needed.

---

## E. Coverage Projection

### E.1 OBJECT2 Recovery

| Metric | Before R6 fix | After R6 fix |
|--------|--------------|-------------|
| DR SECOND_OBJECT NT-wide | 192 | **208** |
| R6 residuals | 23 | 7 |
| R6 direct fixes | — | 8 (OBJECT2 is direct clause child) |
| R6 nested-unblocked fixes | — | 8 (via P5-E-1 recursive processing) |
| R6+R1 compound (remain blocked) | — | 7 |
| Coverage | 61.7% (192/311) | **66.9% (208/311)** |

**Note:** P6-G.10.4 final report estimated 215 (192+23). Correct figure is 208 (192+16). The 7 compound R6+R1 cases remain residual because OBJECT2 is inside a MAIN_FN slot boundary within the second clause.

### E.2 Cross-Function Exposure

Beyond OBJECT2, the fix exposes all fn values in the second clauses of 961 groups. For the 22 R6 OBJECT2 groups specifically, the second clauses contain:

- 19 PREDICATE nodes (newly visible)
- 16 OBJECT nodes (newly visible)
- 8 SUBJECT nodes (newly visible)
- 9 ADVERBIAL nodes (newly visible)
- 4 IO nodes (newly visible)
- 4 COMPLEMENT nodes (newly visible)
- 3 COPULA nodes (newly visible)

These structural elements were previously invisible in the DR. After the fix they appear within their coordClause's DR, correctly rendered.

### E.3 Gate Chapter Projections

| Chapter | Pre-fix DR | Post-fix DR | Gate status |
|---------|-----------|------------|------------|
| JHN 1 | 2 | 2 | PASS |
| MAT 5 | 0 | 0 | FAIL (R1 unaffected) |
| MAT 28 | 1 | 1 | PASS |
| EPH 2 | 0 | 0 | FAIL (R3 unaffected) |
| PHP 2 | 3 | **4** | **FAIL → PASS** |
| COL 1 | 1 | 1 | FAIL (R1 unaffected) |
| ROM 6 | 5 | 5 | PASS |

---

## F. Critical Invariant Check

| Invariant | Status | Evidence |
|-----------|--------|---------|
| Greek surface order | SAFE | `si = minSI()` ordering unchanged; coordClauses each sorted by surface index |
| SR source nodes not mutated | SAFE | No mutation; `deriveClauseCore()` reads fn via `child.function?.canonical` |
| Existing main-line connector semantics | SAFE | `connectorBetween()` unchanged; coordClause connectors derived per-clause |
| IO platform | SAFE | `ioSlots` filter in renderer is slot-level; unchanged |
| PP diagonal | SAFE | `adverbialPhrases` rendering unchanged; `deriveClauseCore()` ADVERBIAL path unchanged |
| APPOSITION | SAFE | `extractSlotModifiers()` unchanged; APPOSITION is a construction, not fn |
| NOMINALIZED_CLAUSE | SAFE | Branch 3 in renderer unchanged |
| CONTENT_CLAUSE sub-diagram | SAFE | `_extractContentClause()` unchanged; called inside `deriveClauseCore()` |
| SD fallback | SAFE | `_isDGChapter` gate unchanged |
| Coordination rendering | SAFE | Renderer already handles `isCoordination: true` at line 12570 |
| No duplicate Greek tokens | SAFE | Each token is in exactly one clause child; `clauseChildren.map(deriveClauseCore)` derives each clause once |

---

## G. Relationship to Other R-Categories

The R6 fix addresses only the group second-clause traversal gap. It is independent of:

- **R1–R5 (slot-content non-recursion):** Separate gap. R6 fix may reclassify 7 R6 instances to R1 (they'll become visible as R1 once the second clause is exposed). Fix for R1 is a separate architectural change.
- **R7 (ADVERBIAL/deep nesting):** Separate gap. Unaffected by R6 fix.

The R6 fix does NOT attempt to fix R1–R5 or R7. It is strictly scoped to the group second-clause traversal.

---

*P6-G.10.5 repair design complete. Specification ready for P6-G.10.6 implementation. No code has been changed.*
