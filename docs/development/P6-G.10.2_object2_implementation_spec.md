# P6-G.10.2 — OBJECT2 Implementation Specification

**Date:** 2026-08-26  
**Phase:** P6-G.10.2 — Design Review  
**Status:** SPECIFICATION ONLY — NOT YET IMPLEMENTED  
**Target file:** `public/core/dg-engine.js` (lines verified in P6-G.10.1 audit)  
**`index.html`:** ZERO changes required.

---

## Overview

Three additive changes to `dg-engine.js`. Total new lines: 7. Modified lines: 2 (const → let). No existing logic altered.

| Change | Location | Lines affected | Type |
|--------|---------|----------------|------|
| 1 | `deriveClauseCore()` | 422 | const→let + 1 new line |
| 2 | `deriveFromGroup()` | 544 | const→let + 1 new line |
| 3 | `connectorBetween()` | 80–106 | 4 new lines |

---

## Change 1 — `deriveClauseCore()` — Line 422

**File:** `public/core/dg-engine.js`  
**Function:** `deriveClauseCore(clauseNode, conjunction)`  
**Current line 422 (verified):**

```javascript
const fn = child.function?.canonical;
```

**Replace with:**

```javascript
let fn = child.function?.canonical;
if (fn === 'OBJECT2') fn = 'SECOND_OBJECT';
```

**Result: line 422 → 2 lines.**

### Context (for locating the edit precisely)

The edit is inside the `for (const child of clauseNode.children)` loop, immediately before the variable `fn` is used. The block continues:

```javascript
// [existing] line ~440:
if (fn === 'ADVERBIAL') {
    ...
} else if (MAIN_FN.has(fn)) {   // [existing] line ~474
    ...
}
```

The normalization must appear BETWEEN the `fn` assignment and the `MAIN_FN.has(fn)` check. The current placement is correct.

### Why `const` → `let`?

`const fn` cannot be reassigned. The normalization requires reassignment. `let` is the minimum change; no other behavior changes.

### What does NOT change?

- `child.function.canonical` — source object, NOT reassigned
- The slot stored in DR: `{ fn: 'SECOND_OBJECT', node: child, ... }` — `node` retains the original SR node with `function.canonical === 'OBJECT2'`
- All `fn !== 'OBJECT2'` values: `const`→`let` has no effect on them

---

## Change 2 — `deriveFromGroup()` — Line 544

**File:** `public/core/dg-engine.js`  
**Function:** `deriveFromGroup(node, conjunction)`  
**Current line 544 (verified):**

```javascript
const fn = p.function?.canonical;
```

**Replace with:**

```javascript
let fn = p.function?.canonical;
if (fn === 'OBJECT2') fn = 'SECOND_OBJECT';
```

**Result: line 544 → 2 lines.**

### Context (for locating the edit precisely)

The edit is inside the `for (const p of extraPhrases)` loop. The block continues:

```javascript
// [existing] line 545 (renumbered after edit → 546):
if (fn && MAIN_FN.has(fn)) {
```

### Scope of `extraPhrases`

`extraPhrases` is defined at line 527:

```javascript
const extraPhrases = (node.children || []).filter(
    c => c.type !== 'clause' && c.type !== 'token' && c.function?.canonical
);
```

This filter EXCLUDES type='clause' nodes. Clause-type OBJECT2 nodes (if present as group siblings) go through `clauseChild = .find(c => c.type === 'clause')` → `deriveClauseCore()` → covered by Change 1.

However: the `clauseChild` finder uses `.find()` (first match). If a group has TWO clause children (one primary clause, one clause-type OBJECT2 sibling), the second is NEITHER `clauseChild` NOR `extraPhrases`. This is a pre-existing limitation (not introduced by this fix). See Design document §10 for scope.

### Identical normalization logic

Changes 1 and 2 are identical in form:
```javascript
let fn = <source>.function?.canonical;
if (fn === 'OBJECT2') fn = 'SECOND_OBJECT';
```

This is the complete set of locations where `function?.canonical` feeds into a MAIN_FN check.

---

## Change 3 — `connectorBetween()` — Lines 80–106

**File:** `public/core/dg-engine.js`  
**Function:** `connectorBetween(prevFn, curFn, noVerb)`  
**Current function body (lines 80–106, verified):**

```javascript
function connectorBetween(prevFn, curFn, noVerb) {
    const vc   = prevFn === 'COPULA'     || curFn === 'COPULA';
    const vp   = prevFn === 'PREDICATE'  || curFn === 'PREDICATE';
    const subj = prevFn === 'SUBJECT'    || curFn === 'SUBJECT';
    const comp = prevFn === 'COMPLEMENT' || curFn === 'COMPLEMENT';
    const obj  = prevFn === 'OBJECT'     || curFn === 'OBJECT';

    if (noVerb) {
        if (subj && comp) return 'implied';
        if (prevFn === 'COMPLEMENT' && curFn === 'COMPLEMENT') return 'implied';
        return null;
    }
    if (vc) {
        if (subj) return 'sp';
        if (comp) return 'complement';
        return null;
    }
    if (vp) {
        if (subj) return 'sp';
        if (comp) return 'complement';
        if (obj)  return 'po';
        return null;
    }
    return null;
}
```

**Replace with:**

```javascript
function connectorBetween(prevFn, curFn, noVerb) {
    const vc   = prevFn === 'COPULA'        || curFn === 'COPULA';
    const vp   = prevFn === 'PREDICATE'     || curFn === 'PREDICATE';
    const subj = prevFn === 'SUBJECT'       || curFn === 'SUBJECT';
    const comp = prevFn === 'COMPLEMENT'    || curFn === 'COMPLEMENT';
    const obj  = prevFn === 'OBJECT'        || curFn === 'OBJECT';
    const obj2 = prevFn === 'SECOND_OBJECT' || curFn === 'SECOND_OBJECT';

    if (noVerb) {
        if (subj && comp) return 'implied';
        if (prevFn === 'COMPLEMENT' && curFn === 'COMPLEMENT') return 'implied';
        if (obj && obj2)  return 'po';
        return null;
    }
    if (vc) {
        if (subj) return 'sp';
        if (comp) return 'complement';
        return null;
    }
    if (vp) {
        if (subj) return 'sp';
        if (comp) return 'complement';
        if (obj)  return 'po';
        if (obj2) return 'po';
        return null;
    }
    if (obj && obj2) return 'po';
    return null;
}
```

### Diff (4 new lines, 0 modified lines):

```diff
+    const obj2 = prevFn === 'SECOND_OBJECT' || curFn === 'SECOND_OBJECT';
 
     if (noVerb) {
         if (subj && comp) return 'implied';
         if (prevFn === 'COMPLEMENT' && curFn === 'COMPLEMENT') return 'implied';
+        if (obj && obj2)  return 'po';
         return null;
     }
     if (vc) {
         if (subj) return 'sp';
         if (comp) return 'complement';
         return null;
     }
     if (vp) {
         if (subj) return 'sp';
         if (comp) return 'complement';
         if (obj)  return 'po';
+        if (obj2) return 'po';
         return null;
     }
+    if (obj && obj2) return 'po';
     return null;
 }
```

### Path analysis

**Path A — noVerb block (ROM 6:12 verbless coordinate clause):**
```
prevFn='OBJECT', curFn='SECOND_OBJECT', noVerb=true
→ subj=false, comp=false → first two checks fail
→ obj=true, obj2=true → if (obj && obj2) return 'po'  ✓
```

**Path B — vp block, PREDICATE↔SECOND_OBJECT:**
```
prevFn='PREDICATE', curFn='SECOND_OBJECT', noVerb=false
→ vp=true → enters if (vp)
→ subj=false, comp=false, obj=false → first three checks fail
→ obj2=true → if (obj2) return 'po'  ✓
```
Also covers SECOND_OBJECT→PREDICATE (MAT 28:14, PHP 2:5, PHP 2:25, PHP 2:29):
```
prevFn='SECOND_OBJECT', curFn='PREDICATE', noVerb=false
→ vp=true → if (obj2) return 'po'  ✓
```

**Path C — after-vp block, OBJECT↔SECOND_OBJECT (PHP 2:1):**
```
prevFn='OBJECT', curFn='SECOND_OBJECT', noVerb=false
→ vp=false (neither is PREDICATE) → if (vp) not entered
→ obj=true, obj2=true → if (obj && obj2) return 'po'  ✓
```
Also covers SECOND_OBJECT→OBJECT:
```
prevFn='SECOND_OBJECT', curFn='OBJECT', noVerb=false
→ same path → 'po'  ✓
```

**Non-triggering case — SUBJECT→SECOND_OBJECT (PHP 2:5 fronted):**
```
prevFn='SUBJECT', curFn='SECOND_OBJECT', noVerb=false
→ vp=false, vc=false
→ obj=false (SUBJECT is not OBJECT)
→ obj2=true, obj=false → if (obj && obj2) = false → falls to final return null  ✓
```
Null is the correct result — SUBJECT has no direct connector to SECOND_OBJECT.

### Why 3 separate paths instead of merging?

`if (noVerb)` returns at `return null` — execution never reaches the vp or after-vp blocks in the noVerb=true case. The paths are in structurally separated branches and cannot be merged without restructuring the function.

The after-vp block (`if (obj && obj2)`) vs the vp block (`if (obj2)`) serve different conditions:
- vp block: triggered when PREDICATE is present — `if (obj2)` sufficient (PREDICATE already establishes 'po' context)
- after-vp block: triggered when NO PREDICATE is adjacent — `obj && obj2` required (OBJECT must be present to form 'po' baseline connection; other two-slot baseline pairs without obj are: SUBJECT+SECOND_OBJECT which should return null)

### Unreachable before fix

Currently: 0 DR slots have `fn='SECOND_OBJECT'`. Therefore `obj2=true` is impossible in any real call. All 3 new paths are currently unreachable. After fix: 311 slots created → paths activated. No existing connector result can change.

---

## Complete Diff Summary

### `deriveClauseCore()` (line 422):

```diff
-    const fn = child.function?.canonical;
+    let fn = child.function?.canonical;
+    if (fn === 'OBJECT2') fn = 'SECOND_OBJECT';
```

### `deriveFromGroup()` (line 544):

```diff
-    const fn = p.function?.canonical;
+    let fn = p.function?.canonical;
+    if (fn === 'OBJECT2') fn = 'SECOND_OBJECT';
```

### `connectorBetween()` (lines 80–106):

```diff
+    const obj2 = prevFn === 'SECOND_OBJECT' || curFn === 'SECOND_OBJECT';
 
     if (noVerb) {
         if (subj && comp) return 'implied';
         if (prevFn === 'COMPLEMENT' && curFn === 'COMPLEMENT') return 'implied';
+        if (obj && obj2)  return 'po';
         return null;
     }
     ...
     if (vp) {
         ...
         if (obj)  return 'po';
+        if (obj2) return 'po';
         return null;
     }
+    if (obj && obj2) return 'po';
     return null;
```

**Total: 2 lines modified (const→let), 5 lines added. dg-engine.js only. index.html: zero changes.**

---

## Pre-Implementation Checklist (for P6-G.10.3)

Before writing any code to the file, verify:

- [ ] Line 422 reads `const fn = child.function?.canonical;` exactly
- [ ] Line 544 reads `const fn = p.function?.canonical;` exactly
- [ ] Lines 80–106 match the `connectorBetween` body above
- [ ] MAIN_FN set at lines 46–49 contains 'SECOND_OBJECT' (present) and NOT 'OBJECT2' (absent)
- [ ] NT baseline: 8,010 sentences, 137,741 tokens, 0 errors (record before touching file)

After implementation, verify:

- [ ] NT-wide error count = 0 (unchanged)
- [ ] DR fn=SECOND_OBJECT count = 311
- [ ] Gate chapters: T-1 through T-17 all PASS (see test matrix)

---

## Structural Safety of Each Change

| Change | Can regress existing features? | Reason |
|--------|-------------------------------|--------|
| 1 | No | `if (fn === 'OBJECT2')` false for all current SR fn values |
| 2 | No | Same condition; extraPhrases didn't hold OBJECT2 before normalization |
| 3 | No | `obj2` always false until SECOND_OBJECT slots exist |

All 3 changes are logically unreachable in the current codebase state and activate exclusively via the new SECOND_OBJECT slots created by Changes 1 and 2.

---

*P6-G.10.2 implementation specification complete. NOT YET IMPLEMENTED. No production code changes.*
