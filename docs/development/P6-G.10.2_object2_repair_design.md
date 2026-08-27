# P6-G.10.2 — OBJECT2 Repair Design

**Date:** 2026-08-26  
**Phase:** P6-G.10.2 — Design Review  
**Predecessor:** P6-G.10.1 Read-only Audit (PASS)  
**Constraint:** No production code changes.

---

## Approved Architectural Direction

```
SR fn='OBJECT2'
    │
    ▼  dg-engine.js — normalization (Change 1 or 2)
    fn = 'SECOND_OBJECT'
    │
    ▼  MAIN_FN.has('SECOND_OBJECT') → true  (no MAIN_FN change needed)
    │
    ▼  DR slot: { fn: 'SECOND_OBJECT', node, connector, ... }
    │
    ▼  connectorBetween() — Change 3
    │
    ▼  index.html renderer — ZERO changes
         _DG_FN_JA['SECOND_OBJECT'] = '第二目的語'  ✓ (already present)
```

**`index.html`: ZERO changes. Confirmed.**

---

## 1. What 'po' Means — Connector Semantics Audit

`connectorBetween()` returns one of: `'sp'` / `'po'` / `'complement'` / `'implied'` / `null`.

`'po'` is the **short vertical divider** on the Reed-Kellogg main baseline. It separates PREDICATE from OBJECT (and by extension any structural slot that follows an object on the baseline).

**Current callers that receive 'po':**

| prevFn | curFn | Condition | Result |
|--------|-------|-----------|--------|
| PREDICATE | OBJECT | `vp && obj` | 'po' |
| OBJECT | PREDICATE | `vp && obj` | 'po' (bidirectional) |
| COPULA | OBJECT | `vc && obj`? | **No** — COPULA block has no `obj` check |

Wait — current `if (vc)` block has no `obj` check. `COPULA + OBJECT` returns null currently. Only `PREDICATE ↔ OBJECT` returns 'po'. This is the existing behavior.

**SECOND_OBJECT extension:** In RK/Leedy notation, SECOND_OBJECT (predicate accusative / double accusative) sits on the baseline after OBJECT, connected with the same short vertical divider. Reusing 'po' is the correct choice. No new connector type is required.

---

## 2. Does SECOND_OBJECT Already Have Connector Behavior?

**No.** Searching `connectorBetween()`:

```javascript
const vc   = prevFn === 'COPULA'     || curFn === 'COPULA';
const vp   = prevFn === 'PREDICATE'  || curFn === 'PREDICATE';
const subj = prevFn === 'SUBJECT'    || curFn === 'SUBJECT';
const comp = prevFn === 'COMPLEMENT' || curFn === 'COMPLEMENT';
const obj  = prevFn === 'OBJECT'     || curFn === 'OBJECT';
```

'SECOND_OBJECT' appears in **zero** of the five existing constants. There is no existing connector behavior for SECOND_OBJECT.

**Implication:** Adding three new paths (`if (obj2)` × 3) is the minimum required. No reduction is possible without changing existing logic.

---

## 3. Can the 3 Connector Paths Be Reduced?

Proposed paths:

| Path | Condition | Covers |
|------|-----------|--------|
| noVerb block | `obj && obj2` | ROM 6:12 verbless coordinate clause |
| vp block | `obj2` | PREDICATE↔SECOND_OBJECT (all verb positions) |
| after-vp | `obj && obj2` | OBJECT↔SECOND_OBJECT without adjacent PREDICATE |

**Can paths 3 and noVerb path be merged?**
No — they are in separate code blocks (`if (noVerb)` exits before reaching `if (vp)` or after-vp).

**Can paths 3 and vp path be merged?**
No — path 3 executes only when `vp=false` (falls through the `if (vp)` block). If merged inside `if (vp)`, OBJECT↔SECOND_OBJECT cases without adjacent PREDICATE would not be reached.

**Alternative: expand `obj` to include SECOND_OBJECT:**
```javascript
const obj = prevFn === 'OBJECT' || curFn === 'OBJECT'
         || prevFn === 'SECOND_OBJECT' || curFn === 'SECOND_OBJECT';
```
This would handle PREDICATE↔SECOND_OBJECT via existing `if (obj) return 'po'` in vp block. But it would NOT handle OBJECT↔SECOND_OBJECT without PREDICATE (still needs after-vp case). And modifying the existing `obj` constant is higher regression risk than adding a new `obj2` constant.

**Conclusion: 3 new paths (additive) is the minimum correct design.** No modification to existing constants or return statements is required.

---

## 4. Change Specifications

### Change 1 — `deriveClauseCore()` line 422

**Location:** `deriveClauseCore()` function, inside the `for (const child of clauseNode.children)` loop.

**Current (line 422):**
```javascript
const fn = child.function?.canonical;
```

**Proposed:**
```javascript
let fn = child.function?.canonical;
if (fn === 'OBJECT2') fn = 'SECOND_OBJECT';
```

**Effect:** SR fn='OBJECT2' nodes now have `fn='SECOND_OBJECT'` before the ADVERBIAL check (line 440) and MAIN_FN check (line 474). `MAIN_FN.has('SECOND_OBJECT')` = true → slot created.

**What does NOT change:**
- `child.function.canonical` — NOT mutated. Source node unchanged.
- Stored slot: `{ fn: 'SECOND_OBJECT', node: child, ... }` — node retains original SR data.
- All other fn values pass through unaffected (`const`→`let` is a semantics-preserving change for all fn ≠ 'OBJECT2').

**Idempotency:** If the same child were processed twice (impossible in a linear for-loop), `child.function.canonical` remains 'OBJECT2' → `fn` is re-assigned to 'SECOND_OBJECT' → same result. Idempotent. ✓

**Scope:** Applies to OBJECT2 children of `clauseNode`. These are the primary structural nodes where OBJECT2 appears as a direct clause child (types: token, group, phrase.*, clause).

---

### Change 2 — `deriveFromGroup()` line 544

**Location:** `deriveFromGroup()` function, inside the `for (const p of extraPhrases)` loop.

**Current (line 544):**
```javascript
const fn = p.function?.canonical;
```

**Proposed:**
```javascript
let fn = p.function?.canonical;
if (fn === 'OBJECT2') fn = 'SECOND_OBJECT';
```

**Effect:** Same normalization for OBJECT2 nodes that reach `deriveFromGroup()` as `extraPhrases` (non-clause, non-token siblings of the primary clause child in a group structure).

**What does NOT change:** All existing logic is additive. The `isParticipial` check at line 548 uses `fn === 'PREDICATE' || fn === 'COPULA'` — unaffected by OBJECT2 normalization.

**`extraPhrases` filter (line 527):**
```javascript
const extraPhrases = (node.children || []).filter(
    c => c.type !== 'clause' && c.type !== 'token' && c.function?.canonical
);
```

Clause-type OBJECT2 nodes (30/311 NT-wide, types: clause + CONTENT_CLAUSE etc.) are EXCLUDED from `extraPhrases` by `c.type !== 'clause'`. This is **pre-existing behavior** — clause siblings in groups were already unreachable via the extraPhrases path before this change. Our normalization does not make this worse.

For gate chapters: all confirmed gate OBJECT2 instances are type=token, group, or phrase — not type=clause as direct group siblings. No gate regression from this limitation.

---

### Change 3 — `connectorBetween()` lines 80–106

**Location:** `connectorBetween()` function body. 4 new lines total; 0 existing lines modified.

**Current function (lines 80–106):**
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

**Proposed function:**
```javascript
function connectorBetween(prevFn, curFn, noVerb) {
  const vc   = prevFn === 'COPULA'        || curFn === 'COPULA';
  const vp   = prevFn === 'PREDICATE'     || curFn === 'PREDICATE';
  const subj = prevFn === 'SUBJECT'       || curFn === 'SUBJECT';
  const comp = prevFn === 'COMPLEMENT'    || curFn === 'COMPLEMENT';
  const obj  = prevFn === 'OBJECT'        || curFn === 'OBJECT';
  const obj2 = prevFn === 'SECOND_OBJECT' || curFn === 'SECOND_OBJECT'; // P6-G-10: SECOND_OBJECT

  if (noVerb) {
    if (subj && comp) return 'implied';
    if (prevFn === 'COMPLEMENT' && curFn === 'COMPLEMENT') return 'implied';
    if (obj && obj2)  return 'po';  // P6-G-10: OBJECT↔SECOND_OBJECT in verbless clause
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
    if (obj2) return 'po';  // P6-G-10: PREDICATE↔SECOND_OBJECT
    return null;
  }
  if (obj && obj2) return 'po';  // P6-G-10: OBJECT↔SECOND_OBJECT (no adjacent PREDICATE)
  return null;
}
```

**The 4 new lines:**

| Line | Condition | Purpose |
|------|-----------|---------|
| `const obj2 = ...` | Always | Detect SECOND_OBJECT on either side |
| `if (obj && obj2) return 'po'` in noVerb | `noVerb && obj && obj2` | ROM 6:12: OBJECT→OBJ2 in verbless coordinate clause |
| `if (obj2) return 'po'` in vp | `vp && obj2` | PREDICATE↔SECOND_OBJECT (MAT 5:34, EPH 2:14, JHN 1:33, etc.) |
| `if (obj && obj2) return 'po'` after vp | `!vp && obj && obj2` | OBJECT↔SECOND_OBJECT without adjacent PREDICATE (MAT 28:14, ROM 6:12, PHP 2:1) |

**All existing lines unchanged.** No existing `return` statement is modified. Pure additive change.

---

## 5. Structural Case Analysis — Design Completeness

### Case A — OBJECT + OBJECT2 (e.g., EPH 2:14 V-O-O2)

DR baseSlots order (sorted by si): PREDICATE → OBJECT → SECOND_OBJECT

| Pair | Path taken | Connector |
|------|-----------|-----------|
| PREDICATE (first) | — | null |
| OBJECT | `vp && obj → 'po'` | 'po' ✓ |
| SECOND_OBJECT | `!vp && obj && obj2 → 'po'` | 'po' ✓ |

Visual: `ποιήσας | τὰ ἀμφότερα | ἓν`

---

### Case B — OBJECT2 without OBJECT (JHN 1:33)

DR baseSlots order: AUX → SUBJECT → PREDICATE → SECOND_OBJECT  
(IO μοι → ioSlots, not in baseSlots)

| Pair | Path taken | Connector |
|------|-----------|-----------|
| AUX (first) | — | null |
| SUBJECT | `!vp && !obj → null` | null (AUX→SUBJECT gap: pre-existing) |
| PREDICATE | `vp && subj → 'sp'` | 'sp' ✓ |
| SECOND_OBJECT | `vp && obj2 → 'po'` | 'po' ✓ |

Visual: `[ὁ πέμψας...] [ἐκεῖνός | εἶπεν | [content-of-speech]]`  
(AUX bracket + SUBJECT sp PREDICATE po SECOND_OBJECT; IO on platform)

**OBJECT is NOT required for SECOND_OBJECT to render.** ✓

---

### Case C — OBJECT2 + IO (ROM 6:12, ROM 6:16, JHN 1:33)

IO filter in renderer: `ioSlots = slots.filter(s => s.fn === 'INDIRECT_OBJECT')`

`fn='SECOND_OBJECT'` ≠ 'INDIRECT_OBJECT' → SECOND_OBJECT always goes to `baseSlots`.

No connector is computed between IO and SECOND_OBJECT (they are in separate rendering paths). No conflict. ✓

---

### Case D — OBJECT2 + CONTENT_CLAUSE (17 NT instances)

When OBJECT2 node has `cn=CONTENT_CLAUSE`, engine calls:
```javascript
const contentClause = _extractContentClause(child);  // line 482
```

`_extractContentClause(node)` checks `node.construction.canonical === 'CONTENT_CLAUSE'` — it is NOT fn-dependent.

After normalization: `fn='SECOND_OBJECT'`, but `child.node.construction.canonical='CONTENT_CLAUSE'` is unchanged (node itself not mutated). The slot is pushed with `contentClause = { conjunction, innerDR }`.

Renderer Branch 1:
```javascript
if (slot.contentClause && slot.contentClause.innerDR) {
    textEl.textContent = slot.contentClause.conjunction || '内容節';
    ...
}
```
→ `fn='SECOND_OBJECT'` is irrelevant to this check → sub-diagram rendered correctly ✓

CONTENT_CLAUSE inside OBJECT2 IS NOT flattened. ✓

---

### Case E — Verbless Clause (ROM 6:12 O-O2-IO)

DR for this coordinate clause (noVerb=true):  
IO → ioSlots. baseSlots: OBJECT → SECOND_OBJECT.

| Pair | Path taken | Connector |
|------|-----------|-----------|
| OBJECT (first) | — | null |
| SECOND_OBJECT | `noVerb && obj && obj2 → 'po'` | 'po' ✓ |

Visual: `τὰ μέλη ὑμῶν | ὅπλα ἀδικίας/δικαιοσύνης` (IO on platform above)

**New noVerb path is necessary for ROM 6:12 gate verification.** ✓

---

### Case F — Subordinate Clause

OBJECT2 inside a subordinate clause: the subordinate clause is reached via `adverbialClauses` → `deriveFromNode()` → recursively calls `deriveClauseCore()` or `deriveFromGroup()`.

Both functions now have the normalization. Any OBJECT2 encountered during recursive processing is normalized to SECOND_OBJECT before MAIN_FN check. ✓

The new DR slot for OBJECT2 in a subordinate clause belongs to the subordinate DR (its own `slots[]` array) — not promoted to the parent DR. Correct scoping. ✓

---

### Case G — Modifiers

`extractSlotModifiers(child)` is called at line 475 (immediately after the MAIN_FN check passes). This is fn-independent — it inspects `child.children` for modifier patterns.

After normalization: `fn='SECOND_OBJECT'`, but `child` (the node) is unchanged. `extractSlotModifiers(child)` sees the same node structure. `modInfo.modifiers` and `modInfo.headSIs` are correctly extracted.

The slot is pushed with modifiers attached: `{ fn: 'SECOND_OBJECT', ..., modifiers: modInfo.modifiers }`. ✓

---

### Case H — Coordination

COL 1:21 OBJECT2 has `cn=COORDINATION` (phrase.adjp). This is a phrase-level coordination, not a clause-level `dr.isCoordination`.

The `isCoordination` flag is set at the DR level (coordinate clause structure). A slot with `cn=COORDINATION` goes through the default renderer branch (plain text with `headDisplayText()`). This is fn-independent.

After normalization: `fn='SECOND_OBJECT'`, `slot.node.construction.canonical='COORDINATION'`. Renderer:
- Not CONTENT_CLAUSE → Branch 1 skipped
- Not APPOSITION → Branch 2 skipped
- Not NOMINALIZED_CLAUSE → Branch 3 skipped
- → Default branch: `textEl.textContent = headDisplayText(node, headSIs)` ✓

No misclassification. ✓

---

### Case I — APPOSITION

1 NT-wide instance of OBJECT2 + `cn=APPOSITION`.

After normalization: `fn='SECOND_OBJECT'`, `node.construction.canonical='APPOSITION'`.

Renderer Branch 2: `if (slot.node?.construction?.canonical === 'APPOSITION')` → `_dgRenderAppositionSlot(slot.node)` — fn-independent ✓

---

### Case J — Nested Structures / Idempotency

**Source mutation:** `child.function.canonical` is read-only — `fn` is a local `let` variable. The source node is not modified. Second pass (if possible) would read 'OBJECT2' again and re-assign to 'SECOND_OBJECT'. Same result.

**Can SECOND_OBJECT recursively normalize?**
```javascript
if (fn === 'OBJECT2') fn = 'SECOND_OBJECT';
```
Checks for 'OBJECT2' specifically. If fn is already 'SECOND_OBJECT', condition is false → no reassignment. True idempotency. ✓

**Can any existing SR emit 'SECOND_OBJECT'?**
0 SR files contain 'SECOND_OBJECT' (confirmed). No risk of double-normalization. ✓

---

## 6. L-0 Audit

| Criterion | Assessment |
|-----------|-----------|
| SR provides fn=OBJECT2 explicitly | ✓ `derivedFrom: ["role"]` `status: "CONFIRMED"` |
| Normalization is representational | ✓ Both labels map to '第二目的語' in all label maps |
| No lexical interpretation | ✓ No text lookup |
| No morphological inference | ✓ No morph_raw access for normalization |
| No attachment inference | ✓ Parent-child structure determined by SR tree |
| No semantic classification | ✓ fn='OBJECT2' is the only trigger |
| Connector 'po' semantics | ✓ Structural position only (same as PREDICATE↔OBJECT) |
| renderer inference | ✓ Renderer reads slot.fn='SECOND_OBJECT' and existing label |
| **L-0: SAFE** | **CONFIRMED** |

---

## 7. SSOT Verification

| Property | Status |
|----------|--------|
| SR fn='OBJECT2' is SSOT | ✓ Not modified |
| SR is not reinterpreted | ✓ fn='OBJECT2' triggers normalization; no other SR field is read |
| OBJECT2 not generated from another property | ✓ Only `child.function.canonical === 'OBJECT2'` triggers |
| SR tree structure preserved in node | ✓ `fn` is local var; `child` is unmodified |

---

## 8. Regression Analysis — All 13 Required Items

| # | Feature | Impact path | Analysis |
|---|---------|-------------|---------|
| 1 | SUBJECT | `fn==='SUBJECT'` — normalization condition false | No change ✓ |
| 2 | PREDICATE | `fn==='PREDICATE'` — normalization condition false | No change ✓ |
| 3 | OBJECT | `fn==='OBJECT'` — normalization condition false | No change ✓ |
| 4 | COMPLEMENT | `fn==='COMPLEMENT'` — normalization condition false | No change ✓ |
| 5 | SECOND_OBJECT | Currently 0 DR slots. After fix: 311 new slots. No existing rendering to regress. | Additive only ✓ |
| 6 | IO | `fn==='INDIRECT_OBJECT'` — normalization condition false. ioSlots filter unchanged. | No change ✓ |
| 7 | PP | `fn==='ADVERBIAL'` path — normalization condition false. adverbialPhrases separate. | No change ✓ |
| 8 | APPOSITION | Branch 2 checks `node.construction.canonical` — fn-independent | No change ✓ |
| 9 | NOMINALIZED_CLAUSE | Branch 3 checks `node.construction.canonical` — fn-independent | No change ✓ |
| 10 | CONTENT_CLAUSE | Branch 1 checks `slot.contentClause.innerDR` — fn-independent | No change ✓ |
| 11 | Relative clauses | `_extractEmbeddedRelClauses()` checks cn=CLAUSE_AS_NP — fn-independent | No change ✓ |
| 12 | Coordination | `dr.isCoordination` at DR level — fn-independent | No change ✓ |
| 13 | SD fallback | `_isDGChapter` gate — DG renderer not called in non-gate chapters | No change ✓ |

**connectorBetween() regression:**
- `obj2` constant is false whenever neither prevFn nor curFn is 'SECOND_OBJECT'
- Currently: 0 SECOND_OBJECT slots → obj2 always false → all new paths unreachable → existing behavior unchanged
- After fix: new paths activate only for SECOND_OBJECT slots — no existing connector result changes

---

## 9. `index.html` Change Confirmation

**Confirmed: ZERO changes required.**

| Element | Needed? | Reason |
|---------|---------|--------|
| `_DG_FN_JA` | No | `SECOND_OBJECT: '第二目的語'` already at line 12318 ✓ |
| Renderer branches | No | All branches are fn-agnostic (check node.construction) ✓ |
| IO platform renderer | No | Filter `s.fn === 'INDIRECT_OBJECT'` — SECOND_OBJECT excluded ✓ |
| CSS | No | `dg-slot-second_object` inherits from `.dg-slot` ✓ |
| `_DG_FN_JA` OBJECT2 entry | Not added | DR stores 'SECOND_OBJECT', never 'OBJECT2' after normalization ✓ |

If any future code path were found requiring index.html changes, implementation would STOP and report.

---

## 10. Known Limitations

| Limitation | Scope | Impact |
|-----------|-------|--------|
| Clause-type OBJECT2 as group extra-sibling | ~30/311 NT-wide, 0 gate | Pre-existing; `extraPhrases` filter excludes type='clause' nodes |
| PHP 2:5 SUBJECT→SECOND_OBJECT gap | 1 gate verse | SUBJECT→OBJ2 connector = null — correct (no structural connection) |
| COPULA + SECOND_OBJECT | Unlikely; 0 gate instances | `if (vc)` block has no obj2 check — COPULA doesn't take SECOND_OBJECT |

---

*P6-G.10.2 repair design complete. No production code changes.*
