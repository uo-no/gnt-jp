# P6-G.10.1 — OBJECT2 Engine Gap: Read-only Audit

**Date:** 2026-08-26  
**Phase:** P6-G.10.1 — Read-only Audit  
**Predecessor:** P6-G.9 Remaining Visual Grammar Gap Reassessment (PASS)  
**Constraint:** Read-only. No production code changes.  
**Pre-existing dirty state:** `M public/core/dg-engine.js` (P6-G.6.3), `M public/index.html` (P6-G.6.3 + P6-G.8.3)

---

## 1. Gap Nature — Naming Mismatch (Not Structural)

**Determination:** NAMING MISMATCH — Not a deliberate distinction, not a historical compatibility issue, not a deeper schema problem.

SR uses `fn='OBJECT2'`. MAIN_FN contains `'SECOND_OBJECT'` (not 'OBJECT2'). 'SECOND_OBJECT' has NEVER been emitted by SR (0 SR files). The mismatch is a labeling inconsistency between the SR builder (which uses the MACULA source label 'OBJECT2') and the MAIN_FN set (which anticipated 'SECOND_OBJECT' as the canonical form but was never connected to actual SR output).

**Proof:**

```bash
# SR data contains OBJECT2 in 154 files, SECOND_OBJECT in 0 files
grep -rl '"SECOND_OBJECT"' public/assets/data/sr/  → 0 files
grep -rl '"OBJECT2"'       public/assets/data/sr/  → 154 files
```

Both `_SD_FN_JA` and `_DG_FN_JA` anticipated SECOND_OBJECT as the canonical DR label:
- `_DG_FN_JA`: `SECOND_OBJECT: '第二目的語'` (line 12318, index.html) — already present
- `_SD_FN_JA`: both `SECOND_OBJECT` and `OBJECT2` = '第二目的語' (lines 12116–12117, index.html)

**Correction from P6-G.9 audit:** P6-G.9 stated `_DG_FN_JA` contains both 'OBJECT2' and 'SECOND_OBJECT'. This was incorrect. Lines 12116–12117 belong to `_SD_FN_JA`, not `_DG_FN_JA`. `_DG_FN_JA` has ONLY 'SECOND_OBJECT' — NOT 'OBJECT2'.

**Implication:** Normalization in the engine (`fn='OBJECT2'` → `fn='SECOND_OBJECT'`) means `_DG_FN_JA` needs NO change. The existing 'SECOND_OBJECT' label is ready.

---

## 2. Current State — Confirmed

### 2.1 MAIN_FN (dg-engine.js lines 46–49)

```javascript
const MAIN_FN = new Set([
  'SUBJECT', 'COPULA', 'PREDICATE', 'OBJECT',
  'COMPLEMENT', 'INDIRECT_OBJECT', 'SECOND_OBJECT', 'AUX',
]);
```

- `MAIN_FN.has('OBJECT2')` → **false** — slot dropped
- `MAIN_FN.has('SECOND_OBJECT')` → **true** — dead entry (SR never emits it)

### 2.2 Pipeline Trace

```
SR:   child.function.canonical = 'OBJECT2'
         │
         ▼
Engine:  fn = child.function?.canonical  → 'OBJECT2'
         MAIN_FN.has('OBJECT2')           → false
         SKIP → slot never created
         │
         ▼
DR:    fn=SECOND_OBJECT count: 0  |  fn=OBJECT2 count: 0
         │
         ▼
Rendered: nothing — 311 SR instances invisible
```

### 2.3 connectorBetween() (dg-engine.js lines 80–106)

```javascript
function connectorBetween(prevFn, curFn, noVerb) {
    const vc   = prevFn === 'COPULA'     || curFn === 'COPULA';
    const vp   = prevFn === 'PREDICATE'  || curFn === 'PREDICATE';
    const subj = prevFn === 'SUBJECT'    || curFn === 'SUBJECT';
    const comp = prevFn === 'COMPLEMENT' || curFn === 'COMPLEMENT';
    const obj  = prevFn === 'OBJECT'     || curFn === 'OBJECT';
    // SECOND_OBJECT: NOT handled
    ...
```

No case for 'SECOND_OBJECT' in any condition. Even if MAIN_FN fix is applied and slots enter DR with `fn='SECOND_OBJECT'`, connector would be `null` for all adjacency patterns involving SECOND_OBJECT.

### 2.4 _DG_FN_JA (index.html lines 12315–12320)

```javascript
const _DG_FN_JA = {
    SUBJECT: '主語', PREDICATE: '述語', COPULA: '繋辞',
    OBJECT: '目的語', COMPLEMENT: '補語',
    INDIRECT_OBJECT: '間接目的語', SECOND_OBJECT: '第二目的語',
    AUX: '助動詞', ADVERBIAL: '副詞的',
};
```

`_DG_FN_JA['SECOND_OBJECT']` = '第二目的語' — **ALREADY PRESENT** ✓

---

## 3. SR Structural Analysis

### 3.1 NT-wide Statistics

| Metric | Value |
|--------|-------|
| SR parent clauses with fn=OBJECT2 child | 311 |
| Without OBJECT sibling | 43 (14%) |
| With IO sibling | 48 (15%) |
| No PREDICATE/COPULA (verbless) | 14 (4.5%) |
| Gate instances (all 7 chapters) | 16 |

### 3.2 OBJECT2 Node Construction Types (NT-wide)

| Type | Construction | Count | Renderer branch |
|------|-------------|-------|-----------------|
| token | (none) | 145 | Default text |
| group | (none) | 48 | Default text |
| phrase.np | GENITIVE_MOD | 27 | Default text |
| **clause** | **CONTENT_CLAUSE** | **17** | **Branch 1: sub-diagram** |
| phrase.np | ARTICULAR_NP | 13 | Default text |
| phrase.np | NP_COMPLEX | 11 | Default text |
| phrase.np | ADJ_MOD | 10 | Default text |
| phrase.adjp | (none) | 10 | Default text |
| clause | (none) | 9 | Default text |
| phrase.np | PREP_PHRASE | 9 | Default text |
| phrase.np | CLAUSE_AS_NP | 2 | Default text (P6-C) |
| phrase.np | ADV_MOD | 2 | Default text |
| clause | SUBORDINATE_CLAUSE | 2 | Default text |
| **clause** | **NOMINALIZED_CLAUSE** | **1** | **Branch 3: bracket** |
| phrase.np | APPOSITION | 1 | Branch 2: parallel |
| phrase.pp | PREP_PHRASE | 1 | Default text |
| phrase.adjp | PREP_PHRASE | 1 | Default text |
| phrase.adjp | COORDINATION | 1 | Default text |
| **TOTAL** | | **311** | |

**Key finding:** All renderer branches correctly handle OBJECT2 constructions. The existing branch order (CONTENT_CLAUSE → APPOSITION → NOMINALIZED_CLAUSE → default) applies to OBJECT2 slots once they enter DR. No new branch needed.

### 3.3 OBJECT2 Source Rules (Gate Chapters)

| Ref | Source rule | Slot order | OBJECT2 position |
|-----|------------|-----------|-----------------|
| ROM 6:12 | V-O-O2-IO | PRED, OBJ, OBJ2, IO | After OBJ |
| ROM 6:12 | O-O2-IO | OBJ, OBJ2, IO (verbless) | After OBJ |
| ROM 6:16 | IO-V-O-O2-ADV | IO, PRED, OBJ, OBJ2, ADV | After OBJ |
| ROM 6:19 | V-O-O2-IO-ADV | PRED, OBJ, OBJ2, IO, ADV | After OBJ |
| ROM 6:19 | ClCl2 | PRED, OBJ, OBJ2, IO | After OBJ |
| JHN 1:21 | ClCl | PRED, OBJ, OBJ2 | After OBJ |
| JHN 1:33 | ClCl2 | AUX, SUBJ, IO, PRED, OBJ2 | After PRED, **no OBJECT** |
| MAT 5:34 | O-V-O2 | OBJ, PRED, OBJ2 | After PRED |
| MAT 28:14 | O-O2-V | OBJ, OBJ2, PRED | Before PRED |
| EPH 2:14 | V-O-O2 | PRED, OBJ, OBJ2 | After OBJ |
| PHP 2:1 | ClCl | OBJ, PRED, OBJ2, OBJ | After PRED |
| PHP 2:5 | S-ADV-ADV-O2-V-O | SUBJ, OBJ2, PRED, OBJ | **Before PRED, no adjacent OBJ** |
| PHP 2:25 | ClCl | OBJ2, PRED, OBJ, OBJ | **First slot, before PRED** |
| PHP 2:29 | O-O2-V | OBJ, OBJ2, PRED | Before PRED |
| COL 1:21 | V-O-O2-ADV | PRED, OBJ, OBJ2, ADV | After OBJ |
| COL 1:26 | ClCl | PRED, OBJ, OBJ2, ADV | After OBJ |

**Connector coverage needed (after normalization to SECOND_OBJECT):**

| Pattern | connectorBetween needed | Current result |
|---------|------------------------|----------------|
| PREDICATE → SECOND_OBJECT | 'po' | null ✗ |
| SECOND_OBJECT → PREDICATE | 'po' | null ✗ |
| OBJECT → SECOND_OBJECT | 'po' | null ✗ |
| SECOND_OBJECT → OBJECT | 'po' | null ✗ |
| OBJECT → SECOND_OBJECT (noVerb) | 'po' | null ✗ |
| SUBJECT → SECOND_OBJECT | null | null ✓ (no direct structural connection) |

### 3.4 OBJECT2 Without OBJECT (43 Instances)

43/311 parent clauses have OBJECT2 but no OBJECT sibling. Key examples:

- **JHN 1:33 (gate):** `AUX, SUBJECT, IO, PREDICATE, OBJECT2` — speech verb (εἶπεν), OBJECT2 = content of speech
- **PHP 2:5 (gate):** `SUBJECT, OBJECT2, PREDICATE, OBJECT` — OBJECT2 is accusative predicate complement, OBJECT is the infinitive clause (NOMINALIZED_CLAUSE `τὸ εἶναι ἴσα θεῷ`)

Wait — PHP 2:5 scan showed `OBJ=True` (OBJECT present). JHN 1:33 showed `OBJ=False`. The 43 instances are NT-wide including non-gate cases.

For gate cases with no OBJECT: **JHN 1:33** is confirmed. OBJECT2 after PREDICATE with IO on platform.

Connector for JHN 1:33 (DR order: SUBJECT, PREDICATE, OBJECT2):
- SUBJECT: null (first)
- PREDICATE: connectorBetween('SUBJECT','PREDICATE') → sp ✓
- OBJECT2: connectorBetween('PREDICATE','SECOND_OBJECT') → with fix: 'po' ✓

### 3.5 OBJECT2 With IO (48 Instances)

IO goes to `ioSlots` (raised platform via P6-G.2 renderer). OBJECT2 goes to `baseSlots` (baseline). No conflict. The existing IO renderer separation handles this automatically.

### 3.6 Verbless Clauses (14 Instances)

ROM 6:12 `O-O2-IO` (no PREDICATE, no SUBJECT) — coordinate elliptical clause:
- IO → ioSlots
- baseSlots: OBJECT, SECOND_OBJECT (after normalization)
- `hasVerb = false` → `noVerb=true`
- Current: connectorBetween('OBJECT','SECOND_OBJECT', noVerb=true) → null
- Fix: add `if (obj && obj2) return 'po'` in noVerb block

This verbless case is rare but visible in gate chapter ROM 6.

---

## 4. OBJECT vs. OBJECT2 Structural Comparison

| Property | OBJECT | OBJECT2 |
|----------|--------|---------|
| SR fn canonical | 'OBJECT' | 'OBJECT2' |
| DR fn (proposed) | 'OBJECT' | 'SECOND_OBJECT' (normalized) |
| MAIN_FN | ✓ | ✗ (proposed: normalize before check) |
| Parent | Direct clause child | Direct clause child (same level) |
| Slot behavior | mainSlots[] | mainSlots[] (after fix) |
| Connector (to PREDICATE) | 'po' | 'po' (proposed) |
| Visual label | 目的語 | 第二目的語 |
| Modifiers | extractSlotModifiers() | extractSlotModifiers() (same) |
| IO interaction | Separate (baseSlots) | Separate (baseSlots) |
| Coordination | Possible | Not confirmed in SR |
| Can appear without partner | N/A | Yes (43/311 without OBJECT) |
| Sub-constructions | CONTENT_CLAUSE etc. | Same (all branches apply) |

**OBJECT2 is structurally parallel to OBJECT.** Same nesting level, same parent clause scope, same slot processing. The second object of ditransitive verbs (double accusative in NT Greek grammar).

---

## 5. SECOND_OBJECT Audit

### 5.1 Does SR emit SECOND_OBJECT?

**No.** 0 SR files contain 'SECOND_OBJECT'. CONFIRMED.

### 5.2 Is SECOND_OBJECT generated internally?

No normalization layer currently exists. 'SECOND_OBJECT' in MAIN_FN is a dead entry — placed in anticipation but never activated because SR uses 'OBJECT2'.

### 5.3 Would OBJECT2 and SECOND_OBJECT coexist in DR?

After normalization: No. All SR 'OBJECT2' → DR 'SECOND_OBJECT'. 'SECOND_OBJECT' from SR would also go to 'SECOND_OBJECT' in DR (no change to existing path, which is already dead).

### 5.4 Would normalization bypass an intended distinction?

No. Both `_SD_FN_JA` and `_DG_FN_JA` use '第二目的語' for both 'OBJECT2' and 'SECOND_OBJECT'. No semantic distinction is expressed.

---

## 6. Implementation Design — Normalization Approach

### 6.1 Decision: Normalize OBJECT2 → SECOND_OBJECT

**Rationale:**
- MAIN_FN already has 'SECOND_OBJECT' — no MAIN_FN change needed
- `_DG_FN_JA` already has 'SECOND_OBJECT': '第二目的語' — no index.html change needed
- `connectorBetween()` change uses 'SECOND_OBJECT' consistently
- index.html: ZERO changes required
- Fewer files modified = lower regression risk

**Alternative rejected:** Adding 'OBJECT2' to MAIN_FN would require an additional `_DG_FN_JA` change in index.html (since `_DG_FN_JA['OBJECT2']` is undefined → would show English 'OBJECT2' as label).

### 6.2 Required Changes — dg-engine.js ONLY

**Change 1 — `deriveClauseCore()` (line ~422):**

```javascript
// CURRENT:
const fn = child.function?.canonical;

// PROPOSED:
let fn = child.function?.canonical;
if (fn === 'OBJECT2') fn = 'SECOND_OBJECT';  // normalize SR label to DR canonical
```

**Change 2 — `deriveFromGroup()` (line ~544):**

```javascript
// CURRENT:
const fn = p.function?.canonical;

// PROPOSED:
let fn = p.function?.canonical;
if (fn === 'OBJECT2') fn = 'SECOND_OBJECT';  // normalize SR label to DR canonical
```

**Change 3 — `connectorBetween()` (lines 80–106):**

```javascript
// Add new constant after existing ones:
const obj2 = prevFn === 'SECOND_OBJECT' || curFn === 'SECOND_OBJECT';

// In noVerb block — add after complement checks:
if (obj && obj2) return 'po';  // SECOND_OBJECT adjacent to OBJECT in verbless clause

// In if (vp) block — add after obj check:
if (obj2) return 'po';  // PREDICATE↔SECOND_OBJECT bidirectional

// After if (vp) block — add new case:
if (obj && obj2) return 'po';  // OBJECT↔SECOND_OBJECT (no adjacent PREDICATE)
```

### 6.3 Full Proposed connectorBetween()

```javascript
function connectorBetween(prevFn, curFn, noVerb) {
    const vc   = prevFn === 'COPULA'        || curFn === 'COPULA';
    const vp   = prevFn === 'PREDICATE'     || curFn === 'PREDICATE';
    const subj = prevFn === 'SUBJECT'       || curFn === 'SUBJECT';
    const comp = prevFn === 'COMPLEMENT'    || curFn === 'COMPLEMENT';
    const obj  = prevFn === 'OBJECT'        || curFn === 'OBJECT';
    const obj2 = prevFn === 'SECOND_OBJECT' || curFn === 'SECOND_OBJECT'; // NEW

    if (noVerb) {
        if (subj && comp) return 'implied';
        if (prevFn === 'COMPLEMENT' && curFn === 'COMPLEMENT') return 'implied';
        if (obj && obj2) return 'po';  // NEW: verbless double-object
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
        if (obj2) return 'po';  // NEW: PREDICATE↔SECOND_OBJECT
        return null;
    }
    if (obj && obj2) return 'po';  // NEW: OBJECT↔SECOND_OBJECT
    return null;
}
```

### 6.4 Connector Coverage Verification

| Ref | DR baseSlots order | Connectors (after fix) |
|----|-------------------|----------------------|
| ROM 6:12 `V-O-O2-IO` | PRED → OBJ → OBJ2 | null, po, po ✓ |
| ROM 6:12 `O-O2-IO` (noVerb) | OBJ → OBJ2 | null, po ✓ |
| ROM 6:16 `IO-V-O-O2` | PRED → OBJ → OBJ2 | null, po, po ✓ |
| ROM 6:19 `V-O-O2-IO` | PRED → OBJ → OBJ2 | null, po, po ✓ |
| JHN 1:21 `ClCl` | PRED → OBJ → OBJ2 | null, po, po ✓ |
| JHN 1:33 `ClCl2` | SUBJ → PRED → OBJ2 | null, sp, po ✓ |
| MAT 5:34 `O-V-O2` | OBJ → PRED → OBJ2 | null, po, po ✓ |
| MAT 28:14 `O-O2-V` | OBJ → OBJ2 → PRED | null, po, po ✓ |
| EPH 2:14 `V-O-O2` | PRED → OBJ → OBJ2 | null, po, po ✓ |
| PHP 2:1 `ClCl` | OBJ → PRED → OBJ2 → OBJ | null, po, po, po ✓ |
| PHP 2:5 `S-O2-V-O` | SUBJ → OBJ2 → PRED → OBJ | null, null, po, po ✓* |
| PHP 2:25 `ClCl` | OBJ2 → PRED → OBJ | null, po, po ✓ |
| PHP 2:29 `O-O2-V` | OBJ → OBJ2 → PRED | null, po, po ✓ |
| COL 1:21 `V-O-O2` | PRED → OBJ → OBJ2 | null, po, po ✓ |
| COL 1:26 `ClCl` | PRED → OBJ → OBJ2 | null, po, po ✓ |

*PHP 2:5: SUBJECT→OBJECT2 has null connector — OBJECT2 appears before PREDICATE without any OBJECT between them. Acceptable: no structural connection between SUBJECT and OBJECT2. The OBJECT2→PREDICATE connector ('po') correctly identifies the structural relationship.

---

## 7. L-0 Audit

| Criterion | Assessment |
|-----------|-----------|
| SR source | fn=OBJECT2 is SR SSOT — explicit `derivedFrom: ["role"]` `status: "CONFIRMED"` |
| Normalization | OBJECT2 → SECOND_OBJECT is representational, not semantic |
| Both labels mean same thing | `_SD_FN_JA`, `_DG_FN_JA` both map → '第二目的語' |
| Connector 'po' semantics | Structural position marker (like PRED→OBJ), not semantic inference |
| Inner construction handling | All existing branches apply (CONTENT_CLAUSE sub-diagram, NOMC bracket, etc.) |
| Morphological inference | None — fn=OBJECT2 from SR, not derived from case or form |
| **L-0 assessment** | **SAFE** |

---

## 8. Regression Surface Analysis

### 8.1 Currently (Before Fix)

DR fn=SECOND_OBJECT: 0 slots. No existing rendering of SECOND_OBJECT in DG view. Zero regression surface from the slot itself.

### 8.2 After Fix

| Changed behavior | Scope | Risk |
|----------------|-------|------|
| 311 new SR instances enter DR | All books | LOW — additive only |
| 16 gate instances become visible | 7 gate chapters | TESTABLE |
| connectorBetween() gets 3 new cases | All DRs | LOW — cases only trigger for SECOND_OBJECT |
| deriveClauseCore() fn reassignment | All sentences | LOW — 1-line conditional affects only fn=OBJECT2 |
| deriveFromGroup() fn reassignment | All groups | LOW — same |
| `_DG_FN_JA['SECOND_OBJECT']` used | Already present | NO CHANGE |

### 8.3 Non-regression Proof

The connector changes add new `return 'po'` paths only when `obj2` is true. The `obj2` constant is true ONLY when one of the slots is 'SECOND_OBJECT'. Since 0 slots currently have fn='SECOND_OBJECT', these new paths are currently unreachable. Post-fix, they apply to newly created SECOND_OBJECT slots only.

Existing connectors (sp, po, complement, implied) are unchanged.

---

## 9. Book Distribution (NT-wide)

| Book | Count | Book | Count | Book | Count |
|------|-------|------|-------|------|-------|
| JHN | 49 | HEB | 14 | 1PE | 5 |
| MAT | 43 | 2CO | 12 | 1JN | 5 |
| MRK | 38 | ROM | 11 | 1TI | 5 |
| LUK | 34 | 2PE | 8 | JAS | 4 |
| ACT | 30 | PHP | 8 | COL | 3 |
| REV | 16 | EPH | 7 | others | 10 |
| | | 1CO | 6 | **TOTAL** | **311** |

Gospels + Acts = 194/311 = 62%. Epistles = 117/311 = 38%.

---

## 10. Global Search — All References Confirmed

| Search term | dg-engine.js | index.html | SR data |
|------------|-------------|-----------|---------|
| 'OBJECT2' | line 422 (fn read) | line 12117 (_SD_FN_JA) | 154 files |
| 'SECOND_OBJECT' | line 48 (MAIN_FN) | lines 12116, 12318 (_SD/_DG_FN_JA) | 0 files |
| '第二目的語' | absent | lines 12116–12117, 12318 | absent |
| 'object2' | absent | absent | absent |
| 'second_object' | absent | absent | absent |

No other files reference OBJECT2 or SECOND_OBJECT in the project. Scope is fully contained to dg-engine.js.

---

*P6-G.10.1 engine gap audit complete. Decision: PASS. No production code changes. STOP.*
