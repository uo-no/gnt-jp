# P6-G.10.4 — OBJECT2 Residual Test Matrix

**Date:** 2026-08-26  
**Phase:** P6-G.10.4 — Read-Only Residual Audit  
**Status:** FOR USE IN ANY FUTURE P6-G.10.5 (repair phase) — NOT YET EXECUTED  
**Constraint:** READ-ONLY. These tests are defined but not run. No implementation has occurred.

---

## Overview

This matrix defines verification tests that would validate a future repair for each residual R-category. Tests are organized by category (R1–R7) and repair scenario. All tests reference SR data already audited; none require SR changes.

**Current baseline (post-P6-G.10.3):** DR SECOND_OBJECT = 192. If all 119 residuals were repaired, target = 311.

---

## Change-to-Test Mapping (Hypothetical Future Repair)

| Hypothetical change | R-cat addressed | Tests that validate it |
|--------------------|----------------|------------------------|
| A — Fix `deriveFromGroup()` to loop all clause children | R6 | TR-1, TR-2, TR-3 |
| B — Recurse into slot subtrees for nested OBJECT2 | R1, R2, R3, R4, R5 | TR-4 through TR-12 |
| C — Fix ADVERBIAL phrase inner-clause traversal | R7a | TR-13, TR-14 |
| D — SR data review for double-annotation | R7b | TR-15 |

---

## TR-1 — R6: PHP 2:1 Clause Appears in DR

**Purpose:** Verify that a fix to `deriveFromGroup()` causes the second clause child to be processed.

**Verse:** PHP 2:1

**Pre-repair state:** SR=1, DR=0 — OBJECT2 in second clause child of group. Engine drops the second clause.

**Expected post-repair state:**

```javascript
// Node.js
require('./public/core/dg-engine.js');
const { deriveDR } = global.DgEngine;
const data = JSON.parse(fs.readFileSync('public/assets/data/sr/PHP/2.json','utf8'));
const s = data.sentences.find(s => s.ref === 'PHP 2:1');
const dr = deriveDR(s.root);
// DR should include SECOND_OBJECT slot somewhere in the clause tree
function countSO(d,depth=0){ ... }  // see P6-G.10.3 countSO
console.log(countSO(dr));  // Expected: 1
```

**Exit criteria:** `countSO(dr) === 1` (was 0 before repair). No regression in PHP 2:5, 2:25, 2:29 (DR=1 each).

**Priority:** P1

---

## TR-2 — R6: Additional Group Multi-Clause Cases

**Purpose:** Verify all 23 R6 cases gain their OBJECT2 slot after the group-second-clause fix.

**Method:**

```javascript
// For each R6 verse in audit table, compute SR vs DR:
const r6Verses = ['PHP 2:1','1JN 4:10','1TI 2:5','2CO 3:5','2TH 3:9',
  'ACT 24:10','JAS 1:27','JHN 2:14','JHN 4:17','JHN 5:18',
  'JHN 15:16','JHN 16:32','JHN 19:12','LUK 1:52','LUK 1:59',
  'LUK 3:3','MAT 3:3','MAT 11:7','MAT 20:26','MRK 1:2',
  'MRK 6:21','MRK 11:31','2CO 3:5'];
// For each: SR count should equal DR count post-repair
```

**Exit criteria:** All 23 R6 verses show SR === DR. Total NT-wide DR SECOND_OBJECT = 215 (192 + 23).

**Priority:** P1

---

## TR-3 — R6: No Regression in Currently Passing Group Clauses

**Purpose:** Verify that the group-second-clause fix does not affect existing DR output for sentences that have groups with a single clause child (the common case).

**Method:** Sample 50 non-gate sentences with group nodes and no OBJECT2. Confirm DR output unchanged.

**Exit criteria:** Zero new SECOND_OBJECT slots appear in these sample sentences.

**Priority:** P1

---

## TR-4 — R1: COL 1:26 Token Becomes SECOND_OBJECT Slot

**Purpose:** Gate verse. Verify that slot-content recursion fix produces SECOND_OBJECT for COL 1:26.

**Verse:** COL 1:26

**Pre-repair state:** SR=1, DR=0.

**Expected post-repair:**

```javascript
const data = JSON.parse(fs.readFileSync('public/assets/data/sr/COL/1.json','utf8'));
const s = data.sentences.find(s => s.ref === 'COL 1:26');
const dr = deriveDR(s.root);
console.log(countSO(dr));  // Expected: 1
```

**Exit criteria:** `countSO(dr) === 1`.

**Priority:** P1

---

## TR-5 — R1: MAT 5:34 Phrase.adjp Becomes SECOND_OBJECT Slot

**Purpose:** Gate verse. Verify MAT 5:34 OBJECT2 (phrase.adjp inside OBJECT content) is captured.

**Verse:** MAT 5:34

**Pre-repair state:** SR=1, DR=0.

**Exit criteria:** `countSO(deriveDR(root)) === 1` for MAT 5:34 sentence.

**Priority:** P1

---

## TR-6 — R3: EPH 2:14 Nested OBJECT2 in COMPLEMENT

**Purpose:** Gate verse. Verify EPH 2:14 OBJECT2 (inside COMPLEMENT → NOMINALIZED_CLAUSE → participial clause) is captured.

**Verse:** EPH 2:14

**Pre-repair state:** SR=1, DR=0.

**Note:** This requires recursion into COMPLEMENT slot content AND into the nominalized/participial clause within it. Likely requires multi-level slot-content recursion.

**Exit criteria:** `countSO(deriveDR(root)) === 1` for EPH 2:14.

**Priority:** P1

---

## TR-7 — R1: HEB 1:7 Two OBJECT2 Nodes Both Captured

**Purpose:** Verify both OBJECT2 instances in HEB 1:7 (SR=2, DR=0) become DR slots.

**Verse:** HEB 1:7

**Exit criteria:** `countSO(dr) === 2`. This tests that the slot-content recursion correctly handles multiple OBJECT2 nodes within the same slot subtree.

**Priority:** P2

---

## TR-8 — R1: ACT 7:35 Two OBJECT2 Nodes

**Purpose:** ACT 7:35 has SR=2, DR=1. One OBJECT2 was already reached; the second is R1. After fix, both should appear.

**Verse:** ACT 7:35

**Pre-repair state:** SR=2, DR=1.

**Exit criteria:** `countSO(dr) === 2`.

**Priority:** P2

---

## TR-9 — R1: Clause-type OBJECT2 (Content Clause as Second Object)

**Purpose:** JHN 4:35 has OBJECT2 with `cn=CONTENT_CLAUSE` inside OBJECT slot content. This is a clausal second object — the repair must create a sub-diagram entry, not just a token slot.

**Verse:** JHN 4:35

**Exit criteria:** DR contains a SECOND_OBJECT slot where the slot represents a content clause (either a sub-diagram or a contentClause entry). Connector between OBJECT slot and SECOND_OBJECT slot = 'po'.

**Priority:** P2

---

## TR-10 — R1: Phrase.adjp OBJECT2 (Predicate Complement Pattern)

**Purpose:** ACT 10:28 has OBJECT2 with `type=phrase.adjp` inside OBJECT content. Adjective phrase as predicate complement to the object.

**Verse:** ACT 10:28

**Exit criteria:** DR contains SECOND_OBJECT slot with adjective phrase content. Rendered correctly in DG view (label = '第二目的語').

**Priority:** P2

---

## TR-11 — R1: NT-wide Coverage After Slot-Content Fix

**Purpose:** Measure NT-wide DR SECOND_OBJECT count after R1+R2+R3+R4+R5 fix.

**Expected:** 192 (current) + 87 (R1+R2+R3+R4+R5) = 279 (if R6 not yet fixed) or 302 (if both R1–R5 and R6 fixed).

**Exit criteria:** NT-wide count equals 192 + sum of fixed categories. No instances in any non-OBJECT2 SR verse.

**Priority:** P1

---

## TR-12 — R1: Existing Slot Counts Unchanged

**Purpose:** Regression — verify slot-content recursion does not create spurious slots for existing fn values.

**Method:** NT-wide counts for SUBJECT, PREDICATE, OBJECT, COMPLEMENT, IO, AUX before and after. All should be identical.

**Expected:**
- PREDICATE: 14,657 unchanged
- OBJECT: 8,444 unchanged
- SUBJECT: 7,373 unchanged
- COMPLEMENT: 2,092 unchanged
- IO: 1,810 unchanged
- COPULA: 1,463 unchanged
- AUX: 525 unchanged

**Exit criteria:** All counts match baseline exactly.

**Priority:** P1

---

## TR-13 — R7a: ADVERBIAL Inner Clause Coverage

**Purpose:** After a fix that derives full sub-DR for ADVERBIAL phrases containing inner clauses, verify at least one R7a case is captured.

**Verse (sample):** JHN 4:46

**Pre-repair state:** SR=1, DR=0.

**Exit criteria:** `countSO(deriveDR(root)) === 1` for JHN 4:46.

**Note:** This test is only relevant if an R7a fix is undertaken. R7a fix complexity is HIGH — not a prerequisite for R6 or R1 fixes.

**Priority:** P3

---

## TR-14 — R7a: ADVERBIAL Fix Does Not Break Existing PP Diagonals

**Purpose:** Regression test for ADVERBIAL changes — if ADVERBIAL processing is modified to do deeper recursion, ensure existing PP diagonal counts remain stable.

**Method:** Gate chapters with PP diagonals (MAT 5: 25, EPH 2: 28, ROM 6: 26). Count must match P6-G.8.3 baseline.

**Exit criteria:** PP counts unchanged across all gate chapters.

**Priority:** P1 (if TR-13 is attempted)

---

## TR-15 — R7b: LUK 18:19 SR Annotation Review

**Purpose:** LUK 18:19 has SR=2 (group fn=OBJECT2 + inner token fn=OBJECT2), DR=1. The engine correctly creates one slot for the group. The inner token's OBJECT2 annotation may be redundant.

**Method (read-only SR inspection):**

```javascript
// Navigate SR tree for LUK 18:19
// Find the group with fn=OBJECT2
// Check if inner token fn=OBJECT2 represents a distinct grammatical relationship
// or is an artefact of SR annotation propagation
```

**Exit criteria:** SR annotation team decision: (a) inner token annotation is redundant → remove from SR (out of scope for engine fix); or (b) inner token annotation is distinct → engine must create 2 SECOND_OBJECT slots.

**Note:** This test is a data question for the SR team, not an engine fix. Current behavior (DR=1) may be correct if the annotation is redundant.

**Priority:** P4 — defer to SR team

---

## TR-16 — End-to-End Gate Chapter Regression (Post Any Repair)

**Purpose:** After any R-category fix, verify all 7 gate chapters render without console errors and with correct SECOND_OBJECT counts.

**Expected post-R6 fix:**

| Chapter | Pre-fix DR | Post-R6-fix DR |
|---------|----------|---------------|
| JHN 1 | 2 | 2 |
| MAT 5 | 0 | 0 (still R1) |
| MAT 28 | 1 | 1 |
| EPH 2 | 0 | 0 (still R3) |
| PHP 2 | 3 | 4 (PHP 2:1 now included) |
| COL 1 | 1 | 1 |
| ROM 6 | 5 | 5 |

**Expected post-R1+R3+R6 fix:**

| Chapter | Post-R1+R3+R6-fix DR |
|---------|---------------------|
| JHN 1 | ≥2 |
| MAT 5 | 1 |
| MAT 28 | 1 |
| EPH 2 | 1 |
| PHP 2 | 4 |
| COL 1 | 2 |
| ROM 6 | 5 |

**Exit criteria:** All 7 gate chapters: SECOND_OBJECT count matches table; console errors = 0.

**Priority:** P1 (after any repair)

---

## TR-17 — Source Node Not Mutated After Slot-Content Recursion

**Purpose:** Verify that any slot-content recursion fix uses local `fn` variables only and does not mutate `node.function.canonical` in SR source nodes.

**Method:** After repair, re-read a repaired verse's SR JSON directly and confirm `"canonical": "OBJECT2"` is unchanged.

**Exit criteria:** `node.function.canonical === 'OBJECT2'` in SR; `slot.fn === 'SECOND_OBJECT'` in DR. Both simultaneously true.

**Priority:** P1 (after any repair)

---

## Summary: Test Priority by Repair Scenario

### Scenario A: Fix R6 only (minimum viable repair)

| Test | Priority | Purpose |
|------|---------|---------|
| TR-1 | P1 | PHP 2:1 gate |
| TR-2 | P1 | All 23 R6 verses |
| TR-3 | P1 | Regression |
| TR-16 | P1 | Gate chapters |
| TR-17 | P1 | SR mutation |

NT-wide after: 215 SECOND_OBJECT slots. Gate fix: PHP 2 (adds PHP 2:1). Still failing: MAT 5, EPH 2, COL 1.

### Scenario B: Fix R6 + R1 (moderate + high complexity)

All of Scenario A, plus:

| Test | Priority | Purpose |
|------|---------|---------|
| TR-4 | P1 | COL 1:26 gate |
| TR-5 | P1 | MAT 5:34 gate |
| TR-7 | P2 | HEB 1:7 dual |
| TR-8 | P2 | ACT 7:35 dual |
| TR-9 | P2 | Clausal OBJECT2 |
| TR-10 | P2 | Adjp OBJECT2 |
| TR-11 | P1 | NT-wide coverage |
| TR-12 | P1 | Slot regression |

NT-wide after: ~289 (192 + 23 + 74) SECOND_OBJECT slots. Gate fix: PHP 2, MAT 5, COL 1. Still failing: EPH 2 (R3).

### Scenario C: Fix R6 + R1 + R3 (full gate repair)

All of Scenario B, plus:

| Test | Priority | Purpose |
|------|---------|---------|
| TR-6 | P1 | EPH 2:14 gate |

NT-wide after: ~291. All 7 gate chapters pass. 20 residuals remain (R2, R4, R5, R7).

---

*P6-G.10.4 test matrix complete. For use in any future P6-G.10.5 repair phase.*
