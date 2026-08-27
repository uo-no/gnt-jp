# P6-G.10.2 — OBJECT2 Test Matrix

**Date:** 2026-08-26  
**Phase:** P6-G.10.2 — Design Review  
**Status:** FOR USE IN P6-G.10.3 (implementation phase) — NOT YET EXECUTED  
**Predecessor:** P6-G.10.1 test matrix (T-1 through T-17)

---

## Overview

This matrix extends P6-G.10.1's T-1–T-17 with three additional tests (T-18–T-20) and formally assigns gate verses to each of the 3 proposed changes.

**Coverage target:** 311 DR fn=SECOND_OBJECT slots (0 → 311, all NT OBJECT2 instances).

---

## Change-to-Test Mapping

| Change | Function | Tests that validate it |
|--------|---------|------------------------|
| 1 | `deriveClauseCore()` normalization | T-1, T-3, T-4, T-5, T-6, T-7, T-8, T-17, T-18 |
| 2 | `deriveFromGroup()` normalization | T-19 |
| 3 | `connectorBetween()` new paths | T-2, T-3, T-4, T-5, T-6 |

Regression coverage (no-change verification):
- T-9, T-10, T-11, T-12, T-13, T-14, T-15, T-16

---

## Tests Inherited from P6-G.10.1 (T-1 through T-17)

See `P6-G.10.1_object2_test_matrix.md` for full specifications. Summary:

| Test | Verse | Change validated | Priority |
|------|-------|-----------------|---------|
| T-1 | EPH 2:14 | Change 1 — slot created, fn=SECOND_OBJECT | P1 |
| T-2 | ROM 6:12 / EPH 2:14 | Change 3 — OBJECT→SECOND_OBJECT connector 'po' | P1 |
| T-3 | JHN 1:33 | Change 3 — PREDICATE→SECOND_OBJECT 'po' (no OBJECT) | P1 |
| T-4 | MAT 28:14 | Change 3 — O-O2-V order: OBJ→OBJ2→PRED connectors | P1 |
| T-5 | PHP 2:5 | Change 3 — SUBJECT→SECOND_OBJECT null; OBJ2→PRED 'po' | P1 |
| T-6 | ROM 6:12 | Change 3 — noVerb path: OBJECT→SECOND_OBJECT 'po' | P2 |
| T-7 | COL 1:21 | Change 1 — cn=COORDINATION phrase renders correctly | P2 |
| T-8 | non-gate | Change 1 — cn=CONTENT_CLAUSE sub-diagram | P2 |
| T-9 | EPH 2:14 | Regression — existing OBJECT connector unchanged | P1 |
| T-10 | JHN 1 | Regression — IO platform count unchanged | P1 |
| T-11 | MAT 5, JHN 1 | Regression — PP diagonal count unchanged | P1 |
| T-12 | PHP 2, MAT 5 | Regression — NOMC bracket count unchanged | P1 |
| T-13 | MAT 5, EPH 2 | Regression — CC sub-diagram count unchanged | P1 |
| T-14 | non-gate | Regression — no SECOND_OBJECT in SD-only view | P1 |
| T-15 | ROM 6 / EPH 2 | Mobile 390px — slot visible, no overflow | P2 |
| T-16 | all gate | Console errors = 0 across all gate chapters | P1 |
| T-17 | NT-wide | NT-wide DR SECOND_OBJECT count = 311 | P1 |

---

## New Tests for P6-G.10.2 (T-18 through T-20)

### T-18 — Source Node Not Mutated (SR SSOT Preservation)

**Purpose:** Verify Change 1 does NOT mutate `child.function.canonical`. The local `fn` variable is reassigned, not the source object.

**Verse:** EPH 2:14 (OBJECT2=ἓν, token node)

**Method (browser console after implementation):**

```javascript
// Access a SECOND_OBJECT slot and verify its source node still has 'OBJECT2'
// The DR is exposed via the internal rendering state or via a debug hook
// (exact API depends on DR access method in this app)

// Method A — if DR is accessible via window or debug:
// const dr = window.__lastDR || appState.getDR('EPH', 2, 14);
// const obj2slot = dr.slots.find(s => s.fn === 'SECOND_OBJECT');
// console.log(obj2slot.node.function.canonical);  // expected: 'OBJECT2'

// Method B — verify via SR data file directly (read-only check):
// Fetch public/assets/data/sr/EPH.json
// Find EPH 2:14 second-object node
// Confirm function.canonical === 'OBJECT2' (unchanged)
```

**Expected:**
- DR: `slot.fn === 'SECOND_OBJECT'` ✓ (normalized)
- SR source: `slot.node.function.canonical === 'OBJECT2'` ✓ (NOT mutated)
- SR JSON file: `"canonical": "OBJECT2"` unchanged ✓

**Exit criteria:** SR source node reads 'OBJECT2'; DR slot reads 'SECOND_OBJECT'. Both simultaneously true.

**Why this matters:** Verifies the L-0 / SSOT guarantee. If the source node were mutated, re-processing the same SR data would produce incorrect results on second pass and the SR's `derivedFrom: ["role"]` integrity would be compromised.

**Priority:** P1

---

### T-19 — `deriveFromGroup()` Path (Change 2)

**Purpose:** Verify Change 2 correctly normalizes OBJECT2 nodes that enter the `extraPhrases` loop in `deriveFromGroup()`.

**Background:** `deriveFromGroup()` processes group-type nodes where clause structure and functional phrases are siblings. OBJECT2 nodes of type ≠ clause and type ≠ token reach this path. Of the 311 NT OBJECT2 instances, those inside group structures with a primary clause sibling go through this path.

**Verse identification:** Requires NT-wide search for group nodes whose `children` include both a `type=clause` node AND an OBJECT2 node with `type ∈ {group, phrase.np, phrase.vp, phrase.adjp}`. This is a structural condition that cannot be confirmed without runtime traversal.

**Fallback verification method (static):**

```javascript
// Node.js script — find instances going through deriveFromGroup extraPhrases
// Run against SR data:

const fs = require('fs');
const path = require('path');
const srDir = 'public/assets/data/sr';

let groupObj2count = 0;
function walk(node, parentType) {
    if (parentType === 'group') {
        if (node.function?.canonical === 'OBJECT2' 
            && node.type !== 'clause' 
            && node.type !== 'token') {
            groupObj2count++;
            console.log('Found:', node.function.canonical, node.type);
        }
    }
    for (const child of node.children || []) {
        walk(child, node.type);
    }
}
// Walk all SR files and collect
```

**Expected:** Any OBJECT2 nodes found through this scan should appear in DR as SECOND_OBJECT after Change 2. If count=0, T-19 is N/A (the path is unused) and T-17's 311 count covers all instances via Change 1 alone.

**Exit criteria:** If NT-wide static scan finds N group-extraPhrases OBJECT2 nodes, verify DR count includes all N in the 311 total. If N=0, T-19 = N/A — document with reason.

**Priority:** P2

---

### T-20 — All Gate Chapters Show At Least 1 SECOND_OBJECT

**Purpose:** Verify that every gate chapter individually renders at least one SECOND_OBJECT slot after the fix. A chapter-level pass confirms the DG renderer is active and the normalization is working end-to-end in each gate context.

**Gate chapters and minimum expected counts:**

| Chapter | Min expected `.dg-slot-second_object` | Representative verse |
|---------|--------------------------------------|---------------------|
| JHN 1 | ≥ 2 | 1:21 (O-O2), 1:33 (no-O) |
| MAT 5 | ≥ 1 | 5:34 (O-O2 without OBJECT before verb) |
| MAT 28 | ≥ 1 | 28:14 (O-O2-V) |
| EPH 2 | ≥ 1 | 2:14 (V-O-O2) |
| PHP 2 | ≥ 4 | 2:1, 2:5, 2:25, 2:29 |
| COL 1 | ≥ 2 | 1:21, 1:26 |
| ROM 6 | ≥ 5 | 6:12 (×2), 6:16, 6:19 (×2) |

**Method (browser console, repeated for each gate chapter):**

```javascript
// For each gate chapter — navigate to chapter, wait for render, then:
document.querySelectorAll('.dg-slot-second_object').length
// Expected: >= minimum above
```

**Exit criteria:** Every gate chapter passes its minimum count. Zero gate chapters may show 0 SECOND_OBJECT slots.

**Priority:** P1

---

## Complete Test Suite — Priority Ordered

### P1 Tests (must all pass for DONE)

| Test | Verse | What it checks |
|------|-------|----------------|
| T-1 | EPH 2:14 | Change 1: slot created, label '第二目的語' |
| T-2 | ROM 6:12 / EPH 2:14 | Change 3: OBJECT→SECOND_OBJECT connector 'po' |
| T-3 | JHN 1:33 | Change 3: PREDICATE→SECOND_OBJECT 'po' (no OBJECT) |
| T-4 | MAT 28:14 | Change 3: O-O2-V word order |
| T-5 | PHP 2:5 | Change 3: fronted OBJ2, SUBJECT→OBJ2 null |
| T-9 | EPH 2:14 | Regression: OBJECT connector unchanged |
| T-10 | JHN 1 | Regression: IO platform baseline |
| T-11 | MAT 5, JHN 1 | Regression: PP diagonal baseline |
| T-12 | PHP 2, MAT 5 | Regression: NOMC bracket baseline |
| T-13 | MAT 5, EPH 2 | Regression: CC sub-diagram baseline |
| T-14 | non-gate | Regression: no SECOND_OBJECT in non-DG view |
| T-16 | all gate | Console errors = 0 |
| T-17 | NT-wide | DR SECOND_OBJECT count = 311 |
| T-18 | EPH 2:14 | Change 1: source node NOT mutated (SR SSOT) |
| T-20 | all gate | Each gate chapter ≥ min SECOND_OBJECT count |

### P2 Tests (should pass; document if failing)

| Test | Verse | What it checks |
|------|-------|----------------|
| T-6 | ROM 6:12 | Change 3 noVerb path |
| T-7 | COL 1:21 | Change 1: cn=COORDINATION |
| T-8 | non-gate | Change 1: cn=CONTENT_CLAUSE sub-diagram |
| T-15 | ROM 6 / EPH 2 | Mobile 390px |
| T-19 | NT-wide scan | Change 2: deriveFromGroup path (or N/A) |

---

## Gate Chapter Expected Counts (Post-implementation)

| Chapter | `.dg-slot-second_object` (min) | IO baseline | PP baseline | NOMC baseline | CC baseline |
|---------|-------------------------------|-------------|-------------|---------------|-------------|
| JHN 1 | ≥ 2 | 18 | 22 | 1 | 2 |
| MAT 5 | ≥ 1 | 14 | 25 | 5 | 8 |
| MAT 28 | ≥ 1 | 7 | 18 | 1 | 1 |
| EPH 2 | ≥ 1 | 3 | 28 | 0 | 1 |
| PHP 2 | ≥ 4 | 1 | 16 | 2 | 2 |
| COL 1 | ≥ 2 | 3 | 16 | 0 | 0 |
| ROM 6 | ≥ 5 | 8 | 26 | 1 | 5 |

**Note on regression baselines:** IO, PP, NOMC, CC baselines are from P6-G.8.3. These must remain unchanged — the SECOND_OBJECT fix adds new `.dg-slot-second_object` elements but does not modify any existing element counts.

---

## connectorBetween() Path Coverage Matrix

Each of the 3 new code paths in Change 3 must be exercised at least once:

| Path | Condition | Covered by | Gate verse |
|------|-----------|-----------|-----------|
| A — noVerb: `obj && obj2` | OBJECT+SECOND_OBJECT+noVerb | T-6 | ROM 6:12 (coord clause) |
| B — vp: `obj2` | PREDICATE↔SECOND_OBJECT | T-3, T-5 | JHN 1:33, PHP 2:5 |
| C — after-vp: `obj && obj2` | OBJECT↔SECOND_OBJECT (no adjacent PRED) | T-4, T-5 | MAT 28:14, PHP 2:1 |

All 3 paths have at least 1 P1 or P2 test gate verse.

---

## NT-wide Coverage Verification Script

For T-17 (P6-G.10.3 implementation phase):

```javascript
// Run in Node.js after implementation, using the engine's deriveFromNode() 
// or equivalent DR-generation API:

let secondObjectCount = 0;
let object2InSR = 0;

for (const srFile of srFiles) {
    const verses = parseSR(srFile);
    for (const verse of verses) {
        const dr = deriveFromNode(verse.clauseNode);
        secondObjectCount += dr.slots.filter(s => s.fn === 'SECOND_OBJECT').length;
    }
}

// From static scan:
// object2InSR = 311 (confirmed in P6-G.10.1)

console.log('DR SECOND_OBJECT:', secondObjectCount);  // Expected: 311
console.log('SR OBJECT2:', object2InSR);              // 311
console.log('Coverage:', secondObjectCount / object2InSR * 100 + '%');  // Expected: 100%
```

---

## Definition of Done for P6-G.10.3

Implementation is DONE when:

1. All P1 tests PASS (T-1 through T-5, T-9 through T-14, T-16 through T-18, T-20)
2. P2 tests PASS or formally documented as DEFERRED with reason
3. NT error baseline unchanged: 8,010 sentences, 137,741 tokens, 0 errors
4. DR SECOND_OBJECT = 311 (T-17 PASS)
5. Gate chapter min counts all met (T-20 PASS)
6. Console errors = 0 across all gate chapters (T-16 PASS)
7. `index.html` unchanged (confirm no accidental edits)
8. `dg-engine.js` diff: exactly 7 lines changed/added (2 const→let, 5 new lines)

---

*P6-G.10.2 test matrix complete. For use in P6-G.10.3 implementation.*
