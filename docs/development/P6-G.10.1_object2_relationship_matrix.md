# P6-G.10.1 — OBJECT2 Relationship Matrix

**Date:** 2026-08-26  
**Phase:** P6-G.10.1 — Read-only Audit  
**Constraint:** Read-only. No production code changes.

---

## 1. Pipeline Matrix

```
SR fn=OBJECT2
  │
  ├─ CURRENT (BROKEN):
  │    child.function.canonical = 'OBJECT2'
  │    MAIN_FN.has('OBJECT2') → false
  │    ↓
  │    slot DROPPED — invisible
  │
  └─ PROPOSED (FIXED — normalization):
       child.function.canonical = 'OBJECT2'
       fn = 'SECOND_OBJECT'  (normalize before MAIN_FN check)
       MAIN_FN.has('SECOND_OBJECT') → true
       ↓
       slot CREATED in mainSlots[]
       ↓
       connectorBetween() assigns 'po' (new cases)
       ↓
       Renderer: default branch
       _DG_FN_JA['SECOND_OBJECT'] = '第二目的語' ✓ (no change needed)
```

---

## 2. Source Record (SR) — OBJECT2 Properties

| Property | Value | Source |
|----------|-------|--------|
| Canonical function | 'OBJECT2' | `child.function.canonical` |
| Derivation | `derivedFrom: ["role"]` | From MACULA Greek source |
| Status | `"CONFIRMED"` | SR builder |
| Source role | `"o2"` (MACULA) | `_SF_ROLE_JA['o2'] = '第二目的語'` |
| NT clause count | 311 | Measured |
| SR files containing OBJECT2 | 154 | `grep -rl '"OBJECT2"' sr/` |
| SR files containing SECOND_OBJECT | 0 | `grep -rl '"SECOND_OBJECT"' sr/` |

---

## 3. Display Record (DR) — Before and After Fix

### Before Fix (Current State)

| Metric | Value |
|--------|-------|
| DR fn=OBJECT2 | 0 |
| DR fn=SECOND_OBJECT | 0 |
| Reason | MAIN_FN.has('OBJECT2') = false → slot dropped |
| User sees | Nothing — 311 instances invisible |

### After Fix (Proposed: Normalization)

| Metric | Projected Value |
|--------|----------------|
| DR fn=SECOND_OBJECT (from SR 'OBJECT2') | 311 |
| DR fn=SECOND_OBJECT (from SR 'SECOND_OBJECT') | 0 (SR never emits it) |
| Total DR fn=SECOND_OBJECT | 311 |
| User sees | 第二目的語 label + slot text on baseline |

---

## 4. Engine Processing Pipeline

### 4.1 deriveClauseCore() — Current

```javascript
// line ~422
const fn = child.function?.canonical;  // → 'OBJECT2'
// ...
if (fn === 'ADVERBIAL') { ... }
else if (MAIN_FN.has(fn)) {            // MAIN_FN.has('OBJECT2') = false
    // NOT REACHED
}
// Result: slot silently dropped
```

### 4.2 deriveClauseCore() — Proposed

```javascript
// line ~422
let fn = child.function?.canonical;    // → 'OBJECT2'
if (fn === 'OBJECT2') fn = 'SECOND_OBJECT';  // normalize
// ...
if (fn === 'ADVERBIAL') { ... }
else if (MAIN_FN.has(fn)) {           // MAIN_FN.has('SECOND_OBJECT') = true ✓
    // SLOT CREATED: { fn: 'SECOND_OBJECT', node: child, ... }
}
```

### 4.3 deriveFromGroup() — Proposed (identical normalization)

```javascript
// line ~544
let fn = p.function?.canonical;
if (fn === 'OBJECT2') fn = 'SECOND_OBJECT';  // normalize
if (fn && MAIN_FN.has(fn)) { ... }
```

---

## 5. Connector Relationship Matrix

### 5.1 connectorBetween() — Current

| prevFn | curFn | noVerb | Result | Correct? |
|--------|-------|--------|--------|---------|
| PREDICATE | SECOND_OBJECT | false | null | ✗ needs 'po' |
| SECOND_OBJECT | PREDICATE | false | null | ✗ needs 'po' |
| OBJECT | SECOND_OBJECT | false | null | ✗ needs 'po' |
| SECOND_OBJECT | OBJECT | false | null | ✗ needs 'po' |
| OBJECT | SECOND_OBJECT | true | null | ✗ needs 'po' |
| SUBJECT | SECOND_OBJECT | false | null | ✓ (no direct connection) |
| COPULA | SECOND_OBJECT | false | null | ✓ (copula doesn't take OBJ2) |

### 5.2 connectorBetween() — Proposed

New constant added: `const obj2 = prevFn === 'SECOND_OBJECT' || curFn === 'SECOND_OBJECT';`

New return paths added:

| Location | Condition | Returns | Covers |
|---------|-----------|---------|--------|
| noVerb block | `obj && obj2` | `'po'` | ROM 6:12 O-O2-IO (verbless) |
| if (vp) block | `obj2` | `'po'` | PRED↔OBJ2 (all verb positions) |
| after if (vp) | `obj && obj2` | `'po'` | OBJ↔OBJ2 (no adjacent PRED) |

### 5.3 All Gate Connector Outcomes After Fix

| Ref | prevFn | curFn | noVerb | Old | New |
|----|--------|-------|--------|-----|-----|
| ROM 6:12 | PREDICATE | OBJECT | - | po | po (unchanged) |
| ROM 6:12 | OBJECT | SECOND_OBJECT | false | null | **po** ✓ |
| ROM 6:12 | OBJECT | SECOND_OBJECT | true | null | **po** ✓ |
| ROM 6:16 | PREDICATE | OBJECT | - | po | po (unchanged) |
| ROM 6:16 | OBJECT | SECOND_OBJECT | false | null | **po** ✓ |
| ROM 6:19 | PREDICATE | OBJECT | - | po | po (unchanged) |
| ROM 6:19 | OBJECT | SECOND_OBJECT | false | null | **po** ✓ |
| JHN 1:21 | PREDICATE | OBJECT | - | po | po (unchanged) |
| JHN 1:21 | OBJECT | SECOND_OBJECT | false | null | **po** ✓ |
| JHN 1:33 | SUBJECT | PREDICATE | - | sp | sp (unchanged) |
| JHN 1:33 | PREDICATE | SECOND_OBJECT | false | null | **po** ✓ |
| MAT 5:34 | OBJECT | PREDICATE | - | po | po (unchanged) |
| MAT 5:34 | PREDICATE | SECOND_OBJECT | false | null | **po** ✓ |
| MAT 28:14 | OBJECT | SECOND_OBJECT | false | null | **po** ✓ |
| MAT 28:14 | SECOND_OBJECT | PREDICATE | false | null | **po** ✓ |
| EPH 2:14 | PREDICATE | OBJECT | - | po | po (unchanged) |
| EPH 2:14 | OBJECT | SECOND_OBJECT | false | null | **po** ✓ |
| PHP 2:1 | PREDICATE | SECOND_OBJECT | false | null | **po** ✓ |
| PHP 2:1 | SECOND_OBJECT | OBJECT | false | null | **po** ✓ |
| PHP 2:5 | SUBJECT | SECOND_OBJECT | false | null | null (acceptable) |
| PHP 2:5 | SECOND_OBJECT | PREDICATE | false | null | **po** ✓ |
| PHP 2:25 | SECOND_OBJECT | PREDICATE | false | null | **po** ✓ |
| PHP 2:25 | PREDICATE | OBJECT | - | po | po (unchanged) |
| PHP 2:29 | OBJECT | SECOND_OBJECT | false | null | **po** ✓ |
| PHP 2:29 | SECOND_OBJECT | PREDICATE | false | null | **po** ✓ |
| COL 1:21 | PREDICATE | OBJECT | - | po | po (unchanged) |
| COL 1:21 | OBJECT | SECOND_OBJECT | false | null | **po** ✓ |
| COL 1:26 | PREDICATE | OBJECT | - | po | po (unchanged) |
| COL 1:26 | OBJECT | SECOND_OBJECT | false | null | **po** ✓ |

All 16 gate instances: connector gap fully resolved by 3 new code paths.

---

## 6. Renderer Matrix

### 6.1 Slot Rendering Branch Selection (index.html)

After normalization, DR slot has `fn='SECOND_OBJECT'`. The renderer:

```javascript
const baseSlots = slots.filter(s => s.fn !== 'INDIRECT_OBJECT');
```
→ SECOND_OBJECT goes to `baseSlots` (not ioSlots) ✓

```javascript
slotEl.className = 'dg-slot dg-slot-' + slot.fn.toLowerCase();
// → 'dg-slot dg-slot-second_object'
// No specific CSS for this class → inherits from .dg-slot ✓
```

### 6.2 Text Rendering Branch by Construction

| OBJECT2 cn | Renderer branch | Rendering |
|-----------|----------------|-----------|
| CONTENT_CLAUSE (17) | Branch 1: `contentClause.innerDR` | Sub-diagram + conjunction ✓ |
| APPOSITION (1) | Branch 2: `_dgRenderAppositionSlot()` | Parallel segments ✓ |
| NOMINALIZED_CLAUSE (1) | Branch 3: `.dg-nomc` | [bracket text] ✓ |
| All others (292) | Default: `headDisplayText()` | Plain text ✓ |

### 6.3 Function Label

```javascript
fnEl.textContent = _DG_FN_JA[slot.fn] || slot.fn;
// slot.fn = 'SECOND_OBJECT'
// _DG_FN_JA['SECOND_OBJECT'] = '第二目的語'  ← ALREADY PRESENT
// → displays: 第二目的語 ✓ (no index.html change needed)
```

---

## 7. IO Interaction Matrix

| Ref | IO in clause? | IO in DR | OBJECT2 in DR | Conflict? |
|----|--------------|---------|--------------|---------|
| ROM 6:12 (×2) | Yes | ioSlots (platform) | baseSlots (baseline) | None ✓ |
| ROM 6:16 | Yes | ioSlots | baseSlots | None ✓ |
| ROM 6:19 (×2) | Yes | ioSlots | baseSlots | None ✓ |
| JHN 1:33 | Yes | ioSlots | baseSlots | None ✓ |
| All others | No | N/A | baseSlots | N/A |

The existing `ioSlots = slots.filter(s => s.fn === 'INDIRECT_OBJECT')` filter correctly separates IO to the platform. OBJECT2/SECOND_OBJECT with `fn='SECOND_OBJECT'` remains in `baseSlots`. No conflict.

---

## 8. SECOND_OBJECT State Summary

| Question | Answer |
|---------|--------|
| Does SR emit 'SECOND_OBJECT'? | **No** (0 files) |
| Is 'SECOND_OBJECT' in MAIN_FN? | **Yes** (line 48) — dead entry before fix |
| Will 'SECOND_OBJECT' coexist with 'OBJECT2' in DR after fix? | No — normalization makes 'OBJECT2' → 'SECOND_OBJECT' |
| Is there a normalization layer currently? | **No** — this fix creates the first one |
| Would 'SECOND_OBJECT' ever appear twice? | No — SR uses only 'OBJECT2' |
| Will adding 'OBJECT2' to MAIN_FN be needed? | **No** — normalization bypasses the need |

---

## 9. Verbless Clause Matrix (noVerb=true)

14 NT-wide parent clauses with OBJECT2 and no PREDICATE.

Most common: coordinate elliptical clauses that share the predicate from a parallel clause (zero-anaphora). DR treats these as verbless (`noVerb=true`).

| ROM 6:12 `O-O2-IO` | Before fix | After fix |
|---------------------|-----------|-----------|
| baseSlots order | OBJ → OBJ2 | OBJ → OBJ2 |
| noVerb | true | true |
| Connector (OBJ→OBJ2) | null | **po** ✓ |

Visual result after fix: `τὰ μέλη ὑμῶν | ὅπλα δικαιοσύνης` with IO platform for `τῷ θεῷ`.

---

## 10. Files in Scope

| File | Changes | Change type |
|------|---------|-------------|
| `public/core/dg-engine.js` | 3 locations | CORRECTNESS |
| `public/index.html` | **None** | — |
| SR data | None | — |
| CSS | None | — |

---

*P6-G.10.1 relationship matrix complete. No production code changes.*
