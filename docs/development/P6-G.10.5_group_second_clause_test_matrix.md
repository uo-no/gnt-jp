# P6-G.10.5 — Group Second-Clause Reachability: Test Matrix

**Date:** 2026-08-26  
**Phase:** P6-G.10.5 — Read-Only Audit → Repair Design  
**Status:** FOR USE IN P6-G.10.6 (implementation phase) — NOT YET EXECUTED  
**Constraint:** READ-ONLY. Tests defined but not run.

---

## Overview

This matrix defines implementation verification tests for the group second-clause repair. Tests are ordered by priority and grouped by category.

**Pre-repair baseline (post-P6-G.10.3):** DR SECOND_OBJECT = 192.  
**Expected post-repair:** DR SECOND_OBJECT = 208 (+16 from 22 R6 groups).

---

## R6-Specific Tests

### TG-1 — PHP 2:1 Gate Verse: Second Clause Visible

**Priority:** P1

**Purpose:** PHP 2:1 is the canonical gate verse for R6. After the fix, the second clause's content (including OBJECT2) must appear in DR.

**Method:**
```javascript
// Node.js
require('./public/core/dg-engine.js');
const { deriveDR } = global.DgEngine;
const data = JSON.parse(fs.readFileSync('public/assets/data/sr/PHP/2.json','utf8'));
const s = data.sentences.find(s => s.ref === 'PHP 2:1');
const dr = deriveDR(s.root);

// The group's DR (somewhere in the tree) should now be isCoordination: true
function findCoordGroup(d, depth=0) {
  if(!d||depth>20) return null;
  if(d.isCoordination && d.coordClauses.length > 1) return d;
  for(const ac of (d.adverbialClauses||[])) { const r=findCoordGroup(ac,depth+1); if(r) return r; }
  for(const cc of (d.coordClauses||[])) { const r=findCoordGroup(cc,depth+1); if(r) return r; }
  return null;
}
console.log(findCoordGroup(dr));   // expected: non-null coordination DR

// And SECOND_OBJECT count increases
function countSO(d,depth=0) { ... }
console.log(countSO(dr));  // expected: 1 (was 0 before fix)
```

**Exit criteria:** `countSO(dr) === 1` for PHP 2:1. `findCoordGroup(dr)` returns non-null.

---

### TG-2 — All 16 Directly Recoverable R6 Cases

**Priority:** P1

**Purpose:** Verify all 16 OBJECT2 residuals recoverable by R6 fix alone gain SECOND_OBJECT slot.

**Expected changes:**

| Verse | Pre-fix SR | Pre-fix DR | Post-fix DR |
|-------|-----------|-----------|------------|
| 1JN 4:10 | 1 | 0 | 1 |
| 2TH 3:9 | 1 | 0 | 1 |
| JAS 1:27 | 1 | 0 | 1 |
| JHN 2:14 | 2 | 1 | 2 |
| JHN 4:17 | 2 | 1 | 2 |
| JHN 5:18 | 2 | 0 | 2 |
| JHN 16:32 | 1 | 0 | 1 |
| LUK 1:52 | 1 | 0 | 1 |
| LUK 1:59 | 1 | 0 | 1 |
| LUK 3:3 | 1 | 0 | 1 |
| MAT 3:3 | 1 | 0 | 1 |
| MAT 20:26 | 1 | 0 | 1 |
| MRK 1:2 | 1 | 0 | 1 |
| MRK 11:31 | 1 | 0 | 1 |
| MAT 20:26 | 1 | 0 | 1 |
| PHP 2:1 | 1 | 0 | 1 |

**Exit criteria:** For each verse, `countSO(deriveDR(root)) === expected post-fix DR`.

---

### TG-3 — Seven Compound R6+R1 Cases Remain Residual

**Priority:** P1

**Purpose:** Verify that the 7 compound cases are NOT accidentally resolved by the R6 fix (they need R1 fix too).

| Verse | Expected post-R6-fix DR | Should remain? |
|-------|------------------------|---------------|
| 1TI 2:5 | 0 | YES — blocked by slot boundary |
| 2CO 3:5 | 0 | YES |
| ACT 24:10 | 0 | YES |
| JHN 15:16 | 0 | YES |
| JHN 19:12 | 0 | YES |
| MAT 11:7 | 0 | YES |
| MRK 6:21 | 0 | YES |

**Exit criteria:** All 7 show `countSO(deriveDR(root)) === 0` after R6 fix.

---

### TG-4 — NT-Wide DR SECOND_OBJECT = 208

**Priority:** P1

**Purpose:** NT-wide coverage confirms the total recovery.

**Method:**
```javascript
// NT-wide scan, same countSO() as TG-1
let total = 0;
for (const book of books) {
  for (const ch of chapters) {
    for (const s of data.sentences) {
      total += countSO(deriveDR(s.root));
    }
  }
}
console.log(total);  // Expected: 208
```

**Exit criteria:** `total === 208`. Any value < 208 means some R6 cases weren't fixed. Any value > 208 means spurious SECOND_OBJECT slots were created (regression).

---

### TG-5 — DR Shape for Multi-Clause Groups

**Priority:** P1

**Purpose:** Verify groups with 2 clause children now produce `isCoordination: true` DRs with `coordClauses.length === 2`.

**Method:**
```javascript
// For each of the 22 R6 sentences, verify the group's DR has correct shape
// (group is nested within the sentence DR)
function findGroupDR(sentDR, depth=0) {
  if(!sentDR||depth>20) return null;
  if(sentDR.isCoordination && sentDR.coordClauses.length >= 2) return sentDR;
  // recurse into adverbialClauses, coordClauses
  ...
}
// For PHP 2:1, MAT 3:3, MRK 1:2, LUK 3:3 etc.
const r6Verses = ['PHP 2:1', 'MAT 3:3', 'MRK 1:2', 'LUK 3:3', 'JHN 16:32'];
for (const ref of r6Verses) {
  const groupDR = findGroupDR(deriveDR(root));
  assert(groupDR !== null, ref + ': group DR should be coordination');
  assert(groupDR.isCoordination, ref + ': isCoordination');
  assert(groupDR.coordClauses.length === 2, ref + ': coordClauses.length');
}
```

**Exit criteria:** For all 22 R6 sentences, the group DR has `isCoordination: true` and `coordClauses.length >= 2`.

---

### TG-6 — PHP 2 Gate Chapter: 4/4 Verses

**Priority:** P1

**Purpose:** PHP 2 is the primary gate chapter affected by R6. All 4 verses must pass.

**Method (browser):**
```javascript
// Navigate to PHP 2, render, check
document.querySelectorAll('.dg-slot-second_object').length  // ≥ 4
```

**Expected:**

| Verse | Expected `.dg-slot-second_object` |
|-------|----------------------------------|
| PHP 2:1 | 1 (newly fixed) |
| PHP 2:5 | 1 (unchanged) |
| PHP 2:25 | 1 (unchanged) |
| PHP 2:29 | 1 (unchanged) |

**Exit criteria:** PHP 2 chapter: ≥ 4 `.dg-slot-second_object` elements. No console errors.

---

## Cross-Function Tests

### TG-7 — Second Clause PREDICATE Visible in DR

**Priority:** P1

**Purpose:** The most critical cross-function test. After R6 fix, PREDICATE from the second clause must appear in the DR.

**Method (MAT 3:3, MRK 1:2, LUK 3:3 — all have PREDICATE in second clause direct children):**
```javascript
function hasPredInCoord(dr, depth=0) {
  if(!dr||depth>20) return false;
  if(dr.isCoordination) {
    return dr.coordClauses.some(c => c.slots.some(s => s.fn === 'PREDICATE'));
  }
  return (dr.adverbialClauses||[]).some(ac=>hasPredInCoord(ac,depth+1)) ||
         (dr.coordClauses||[]).some(cc=>hasPredInCoord(cc,depth+1));
}
console.log(hasPredInCoord(deriveDR(mat33_root)));  // expected: true
```

**Exit criteria:** For MAT 3:3, MRK 1:2, LUK 3:3: second clause PREDICATE is visible in DR (inside a coordClause DR).

---

### TG-8 — Second Clause OBJECT Visible in DR

**Priority:** P1

**Purpose:** OBJECT from the second clause must be visible.

**Verses:** JAS 1:27 (second clause has OBJECT as direct child), LUK 3:3, MAT 3:3.

**Exit criteria:** `coordClauses[1].slots.some(s => s.fn === 'OBJECT')` is true for these verses' group DR.

---

### TG-9 — SECOND_OBJECT Connector in Second Clause

**Priority:** P1

**Purpose:** The OBJECT → SECOND_OBJECT connector ('po') must be assigned correctly within the second coordClause.

**Verses:** JAS 1:27 (OBJECT2+OBJECT+PREDICATE in second clause), JHN 16:32 (OBJECT+OBJECT2+PREDICATE), LUK 3:3 (OBJECT2+PREDICATE+OBJECT).

**Method:**
```javascript
// For JAS 1:27 second coordClause
const groupDR = findGroupDR(dr);
const coordCl2 = groupDR.coordClauses[1];
const obj2Slot = coordCl2.slots.find(s => s.fn === 'SECOND_OBJECT');
console.log(obj2Slot.connector);  // expected: 'po'
```

**Exit criteria:** SECOND_OBJECT slot in second coordClause has `connector === 'po'`.

---

### TG-10 — CONTENT_CLAUSE Second Object (Clausal Second Object)

**Priority:** P2

**Purpose:** MRK 11:31 has OBJECT2 as `cn=CONTENT_CLAUSE` nested inside an ADVERBIAL within the second clause. After R6 fix, verify it's processed correctly (as a sub-diagram or accessible DR).

**Verse:** MRK 11:31

**Exit criteria:** `countSO(deriveDR(root)) === 1` for MRK 11:31 (currently 0). The OBJECT2 (cn=CONTENT_CLAUSE) is nested-unblocked within the second clause.

---

### TG-11 — IO (INDIRECT_OBJECT) in Second Clause Visible

**Priority:** P2

**Purpose:** Cross-function — IO from second clause should be visible. ACT 24:10 has IO in its second clause.

**Verse:** ACT 24:10 (second clause contains IO)

**Method:** Verify that after R6 fix, the second clause's DR (inside coordClauses) contains an IO slot.

Note: ACT 24:10 is a compound R6+R1 case (OBJECT2 still blocked), but IO and PREDICATE from the same clause are NOT blocked → they should appear.

**Exit criteria:** ACT 24:10's group DR has `coordClauses[1].slots.some(s => s.fn === 'INDIRECT_OBJECT')`.

---

## Regression Tests

### TG-12 — Single-Clause Groups Unchanged

**Priority:** P1

**Purpose:** Groups with exactly 1 clause child must produce identical DR output before and after the fix.

**Method:**
```javascript
// For a sample of 50 non-R6 sentences with groups:
// Derive DR before fix (current behavior) and after fix
// DR output must be identical (structurally equal)
// Use gate chapter verses as anchors
const gateSentences = ['JHN 1:1', 'JHN 1:14', 'MAT 28:14', 'ROM 6:12'];
// Pre-fix: save DR → post-fix: compare
```

**Exit criteria:** DR output for all single-clause-group sentences is byte-identical to pre-fix output.

---

### TG-13 — ExtraPhrases Edge Cases Unchanged

**Priority:** P1

**Purpose:** The 5 groups with 2+ clause children AND extraPhrases must NOT change behavior.

| Verse | Pre-fix DR slots | Post-fix DR slots |
|-------|-----------------|------------------|
| 2CO 11:26 | COMPLEMENT (from extraPhrases) | Identical |
| 2PE 2:13 | PREDICATE | Identical |
| PHP 3:5 | COMPLEMENT×3 + first clause | Identical |
| ROM 1:28 | PREDICATE+OBJECT+SUBJECT | Identical |

**Exit criteria:** `deriveDR(root)` for these 5 sentences returns the same slots as before.

---

### TG-14 — NT Error Baseline Unchanged

**Priority:** P1

**Purpose:** NT-wide sentence count and error count must remain stable.

**Expected:** 8,010 sentences, 0 errors (same as P6-G.10.3 baseline).

**Exit criteria:** `errors === 0` across all NT sentences.

---

### TG-15 — PP Diagonal Count Unchanged (Gate Chapters)

**Priority:** P1

**Purpose:** PP diagonal rendering is driven by `adverbialPhrases` — R6 fix does not touch this path.

**Expected counts (from P6-G.8.3 baseline):**

| Chapter | PP diagonal count |
|---------|-----------------|
| MAT 5 | 25 |
| EPH 2 | 28 |
| ROM 6 | 26 |

**Exit criteria:** All 3 chapters: PP count unchanged.

---

### TG-16 — IO Platform Count Unchanged (JHN 1)

**Priority:** P1

**Purpose:** IO platform rendering is slot-level; R6 fix creates new slots only inside coordClauses.

**Expected:** JHN 1: 18 IO platforms (P6-G.8.3 baseline).

**Exit criteria:** IO count unchanged.

---

### TG-17 — APPOSITION Dashed Line Unchanged

**Priority:** P1

**Purpose:** APPOSITION rendering is driven by `extractSlotModifiers()` and construction type checks — R6 fix does not touch these.

**Exit criteria:** No change in APPOSITION rendering for gate chapters.

---

### TG-18 — NOMINALIZED_CLAUSE Bracket Unchanged

**Priority:** P1

**Purpose:** NOMINALIZED_CLAUSE rendering is construction-type-based — unaffected.

**Exit criteria:** No change in NOMC bracket count for gate chapters.

---

### TG-19 — CONTENT_CLAUSE Sub-Diagram Unchanged

**Priority:** P1

**Purpose:** Content clause sub-diagrams are derived via `_extractContentClause()` — unaffected by R6 fix.

**Exit criteria:** No change in CC sub-diagram count for gate chapters.

---

### TG-20 — Console Errors = 0 (All Gate Chapters)

**Priority:** P1

**Purpose:** No JavaScript errors should be introduced by the fix.

**Method (browser):** Navigate to each gate chapter, monitor console.

**Exit criteria:** 0 errors across all 7 gate chapters.

---

### TG-21 — No Duplicate Greek Token Rendering

**Priority:** P1

**Purpose:** Each clause child is processed once by `deriveClauseCore()`. No token should appear in multiple coordClauses.

**Method:**
```javascript
// For each R6 sentence, collect all token nodes from coordClauses
// Verify no nodeId or surfaceIndex appears in 2 different coordClauses
function collectTokens(dr) { ... }
// assert no duplicates
```

**Exit criteria:** No Greek token appears in more than one coordClause DR for any sentence.

---

## Mobile Test

### TG-22 — PHP 2:1 Coordination Render on Mobile (390px)

**Priority:** P2

**Purpose:** The newly visible second clause (as a coordination block) must not overflow or obscure on mobile.

**Method:** Resize to 390px viewport. Navigate to PHP 2:1. Screenshot.

**Exit criteria:**
- `.dg-coord-wrap` visible and not overflowing
- `.dg-slot-second_object` within PHP 2:1 coordClause visible
- No horizontal scroll in DG view

---

## Safety Tests

### TG-23 — SR Source Nodes Not Mutated

**Priority:** P1

**Purpose:** `deriveClauseCore()` uses Change 1 (`let fn = child.function?.canonical; if (fn === 'OBJECT2') fn = 'SECOND_OBJECT'`). The SR node itself must remain `"canonical":"OBJECT2"`.

**Method:**
```javascript
// For PHP 2:1, find the OBJECT2 token in SR
// After deriveDR(), re-read sr.root and confirm function.canonical === 'OBJECT2'
const sr = data.sentences.find(s => s.ref === 'PHP 2:1').root;
function findObj2Node(n) { ... }
const obj2Node = findObj2Node(sr);
console.log(obj2Node.function.canonical);  // expected: 'OBJECT2'
deriveDR(sr);  // run derivation
console.log(obj2Node.function.canonical);  // still expected: 'OBJECT2'
```

**Exit criteria:** `obj2Node.function.canonical === 'OBJECT2'` before AND after `deriveDR()`.

---

### TG-24 — isCoordination DR from Group Does Not Break Parent Rendering

**Priority:** P1

**Purpose:** The group's DR (now `isCoordination: true`) is often used as an adverbialClause of a parent clause. Verify the parent renders it correctly.

**Method (browser):** Navigate to MAT 3:3, JHN 16:32. Visually confirm:
1. First clause renders normally on main line
2. Second clause appears as coordination block (inside a `.dg-coord-wrap`)
3. No rendering errors

**Exit criteria:** No visual glitch; both clauses visible; no console errors.

---

## Priority Summary

### P1 Tests (must all pass for DONE)

TG-1, TG-2, TG-3, TG-4, TG-5, TG-6, TG-7, TG-8, TG-9, TG-12, TG-13, TG-14, TG-15, TG-16, TG-17, TG-18, TG-19, TG-20, TG-21, TG-23, TG-24

### P2 Tests (should pass; document if failing)

TG-10, TG-11, TG-22

---

## NT-Wide Coverage After Fix

| Category | Pre-fix | Post-fix | Change |
|---------|---------|---------|--------|
| DR SECOND_OBJECT | 192 | 208 | +16 |
| R6 residuals | 23 | 7 | -16 |
| R6+R1 compound (now just R1) | 0 | 7 | +7 |
| Total residuals (119) | 119 | 103 | -16 |
| Coverage | 61.7% | 66.9% | +5.2% |

---

*P6-G.10.5 test matrix complete. For use in P6-G.10.6 implementation.*
