# P6-G.10.1 — OBJECT2 Engine Gap: Final Report

**Date:** 2026-08-26  
**Phase:** P6-G.10.1 — Read-only Audit  
**Predecessor:** P6-G.9 Remaining Visual Grammar Gap Reassessment (PASS)  
**Constraint:** Read-only. No production code changes made.

---

## Decision

> **PASS**

OBJECT2 → SECOND_OBJECT normalization is structurally justified. No semantic inference. Implementation scope is confirmed and bounded. Test matrix is complete. L-0 SAFE.

P6-G.10.2 design approval required before implementation proceeds.

---

## A. Gap Nature — Final Determination

### NAMING MISMATCH (not deliberate, not historical compatibility, not schema problem)

SR Builder (MACULA source data) uses canonical value `'OBJECT2'` for the second direct object of ditransitive verbs.

MAIN_FN in dg-engine.js was written with `'SECOND_OBJECT'` as the expected canonical — a label that SR never emits (confirmed: 0 SR files contain 'SECOND_OBJECT').

This mismatch causes 100% invisibility: all 311 SR fn=OBJECT2 instances are silently dropped at the MAIN_FN filter.

**The fix is representational normalization, not schema change.** Both `_SD_FN_JA` and `_DG_FN_JA` use '第二目的語' for both labels. The SR is SSOT. The engine normalizes the label before DR creation.

---

## B. OBJECT2 Structural Properties — Confirmed

| Property | Confirmed value |
|----------|----------------|
| SR canonical fn | 'OBJECT2' |
| SR derivation | `derivedFrom: ["role"]` (MACULA 'o2' role) |
| SR status | 'CONFIRMED' |
| SR files with OBJECT2 | 154 |
| SR files with SECOND_OBJECT | 0 |
| NT clause count | 311 |
| Gate clause count (all 7 chapters) | 16 |
| Without OBJECT sibling | 43 (14%) |
| With IO sibling | 48 (15%) |
| Verbless (no PREDICATE) | 14 (4.5%) |
| Can appear before PREDICATE | Yes (PHP 2:5, PHP 2:25, MAT 28:14, PHP 2:29) |
| Sub-constructions | All types: token, group, phrase.np, clause (CONTENT_CLAUSE etc.) |
| cn=CONTENT_CLAUSE | 17 — renders as sub-diagram (Branch 1) ✓ |
| cn=NOMINALIZED_CLAUSE | 1 — renders as bracket (Branch 3) ✓ |
| cn=APPOSITION | 1 — renders as parallel segments (Branch 2) ✓ |

---

## C. P6-G.9 Correction

**P6-G.9 stated:** `_DG_FN_JA` has `OBJECT2: '第二目的語'` at line 12117.

**P6-G.10.1 confirms:** Lines 12116–12117 belong to `_SD_FN_JA`, not `_DG_FN_JA`.

`_DG_FN_JA` (line 12315–12320) has ONLY `SECOND_OBJECT: '第二目的語'` — NOT 'OBJECT2'.

**Impact on implementation:** If 'OBJECT2' were stored in DR (Fix Option A), `_DG_FN_JA['OBJECT2']` would be undefined → label falls back to 'OBJECT2' (English string). This would be a bug. The Normalization approach (Fix Option B, storing 'SECOND_OBJECT') avoids this issue entirely.

---

## D. Implementation Scope — Final

**Files changed: `public/core/dg-engine.js` ONLY. `index.html`: NO CHANGE.**

### D.1 Change 1 — `deriveClauseCore()` line ~422

```javascript
// Change `const` to `let` and add normalization:
let fn = child.function?.canonical;
if (fn === 'OBJECT2') fn = 'SECOND_OBJECT';
```

**Purpose:** SR fn='OBJECT2' nodes now pass `MAIN_FN.has('SECOND_OBJECT')` = true and enter DR as `fn='SECOND_OBJECT'`.

### D.2 Change 2 — `deriveFromGroup()` line ~544

```javascript
// Same normalization in group processing:
let fn = p.function?.canonical;
if (fn === 'OBJECT2') fn = 'SECOND_OBJECT';
```

**Purpose:** OBJECT2 nodes inside group structures are also normalized.

### D.3 Change 3 — `connectorBetween()` lines 80–106

Add `obj2` constant and three new return paths:

```javascript
const obj2 = prevFn === 'SECOND_OBJECT' || curFn === 'SECOND_OBJECT';

// In noVerb block: if (obj && obj2) return 'po';
// In if (vp) block: if (obj2) return 'po';
// After if (vp) block: if (obj && obj2) return 'po';
```

**Purpose:** Provides 'po' connector for all relevant SECOND_OBJECT adjacency patterns.

### D.4 What Does NOT Need Changing

| Item | Reason |
|------|--------|
| MAIN_FN set | 'SECOND_OBJECT' already present ✓ |
| `_DG_FN_JA` in index.html | 'SECOND_OBJECT': '第二目的語' already present ✓ |
| Renderer branches (1–4) | All correctly apply to SECOND_OBJECT slots ✓ |
| IO renderer | Filter `s.fn !== 'INDIRECT_OBJECT'` — SECOND_OBJECT → baseSlots ✓ |
| CSS | No slot-specific CSS needed ✓ |
| SR data | SR is SSOT — unchanged ✓ |

---

## E. Connector Design Justification

### E.1 RK/Leedy Notation

In Reed-Kellogg diagrams, the double-object (ditransitive) construction is:

```
SUBJECT | PREDICATE | OBJECT | SECOND_OBJECT
                      │          │
                    [po]       [po]
```

Both OBJECT and SECOND_OBJECT are connected to the PREDICATE/OBJECT chain with short vertical dividers. This is the established convention for verbs of making, calling, naming, and presenting in NT Greek grammar.

### E.2 'po' Connector Reuse Justification

The 'po' connector (short vertical divider) is already used for PREDICATE→OBJECT. Reusing it for OBJECT→SECOND_OBJECT maintains visual consistency:

```
PRED | OBJ | SECOND_OBJ
    po     po
```

The 'po' connector does not carry semantic meaning beyond "slot boundary on the main baseline." Using it for SECOND_OBJECT is structural, not semantic. L-0: SAFE.

### E.3 SUBJECT→SECOND_OBJECT Gap (PHP 2:5)

When OBJECT2 appears before PREDICATE AND before OBJECT in surface order (e.g., PHP 2:5 `S-ADV-ADV-O2-V-O`), the sorted baseSlots are SUBJECT → SECOND_OBJECT → PREDICATE → OBJECT.

`connectorBetween('SUBJECT', 'SECOND_OBJECT')` = null — NO connector between SUBJECT and SECOND_OBJECT.

This is correct: there is no direct structural connection between SUBJECT and SECOND_OBJECT. The SECOND_OBJECT is a predicate accusative of OBJECT (via the verb). Showing a connector from SUBJECT to SECOND_OBJECT would misrepresent the structure.

**Visual result:** SUBJECT [gap] SECOND_OBJECT po PREDICATE po OBJECT

The fronted SECOND_OBJECT appears to "float" before the predicate structure — which accurately represents Greek topic/focus fronting. This is the expected behavior.

---

## F. Regression Safety — Confirmed

### F.1 Zero Existing Rendering Disturbed

DR currently has 0 slots with fn='SECOND_OBJECT'. No existing rendering exists to regress.

### F.2 Connector Changes — Unreachable Before Fix

The new `obj2` paths in `connectorBetween()` only trigger when one slot is 'SECOND_OBJECT'. Since 0 SECOND_OBJECT slots exist currently, these paths are unreachable in the current codebase. After fix: 311 new slots activate them.

### F.3 Normalization Scope

The normalization `if (fn === 'OBJECT2') fn = 'SECOND_OBJECT'` is triggered only for OBJECT2. All other fn values pass through unchanged. SUBJECT, PREDICATE, OBJECT, COMPLEMENT, IO, AUX: unaffected.

---

## G. L-0 Audit — Final

| Criterion | Status |
|-----------|--------|
| Detection from SR SSOT | ✓ `fn='OBJECT2'` is SR-explicit, no inference |
| Normalization semantics | ✓ OBJECT2 = SECOND_OBJECT = '第二目的語' — purely representational |
| Connector 'po' | ✓ Structural position marker only |
| Inner construction branches | ✓ All existing branches (CC, NOMC, APPOS, default) apply correctly |
| No morphological inference | ✓ No case, mood, or form analysis |
| No semantic inference | ✓ Label is pre-defined in SR via role 'o2' |
| **L-0: SAFE** | **CONFIRMED** |

---

## H. Known Limitations

| Limitation | Scope | Impact |
|-----------|-------|--------|
| PHP 2:5 SUBJECT→SECOND_OBJECT gap | Single verse, non-fatal | null connector — acceptable |
| Verbless clauses (14 NT) | All books | 'po' connector with noVerb fix |
| OBJECT2 cn=CONTENT_CLAUSE (17 NT) | All books | Sub-diagram rendering (existing Branch 1) — no visual gap |

---

## I. Test Matrix Coverage

T-1 through T-17 defined in `P6-G.10.1_object2_test_matrix.md`:

| Priority | Tests | Coverage |
|---------|-------|---------|
| P1 (must pass) | T-1, T-2, T-3, T-4, T-5, T-9, T-10, T-11, T-12, T-13, T-14, T-16, T-17 | Basic functionality, regressions, NT-wide count |
| P2 (should pass) | T-6, T-7, T-8, T-15 | Edge cases, mobile, CONTENT_CLAUSE interaction |

---

## J. Deliverable Index

| Document | Status |
|----------|--------|
| `P6-G.10.1_object2_engine_audit.md` | ✅ Complete |
| `P6-G.10.1_object2_relationship_matrix.md` | ✅ Complete |
| `P6-G.10.1_object2_test_matrix.md` | ✅ Complete |
| `P6-G.10.1_object2_final_report.md` | ✅ This document |

---

## K. Recommended Next Phase

**P6-G.10.2 — OBJECT2 Repair Design**

Entry criteria for P6-G.10.2 (all met):
- [x] Gap nature confirmed: naming mismatch, not schema problem
- [x] SR SSOT confirmed: fn='OBJECT2' explicit, derivedFrom=role, status=CONFIRMED
- [x] MAIN_FN state: 'SECOND_OBJECT' present, 'OBJECT2' absent — normalization strategy viable
- [x] Connector design: 'po' reuse, 3 new code paths in connectorBetween()
- [x] `_DG_FN_JA['SECOND_OBJECT']` = '第二目的語' already present — no index.html change
- [x] Regression surface: zero existing rendering disturbed
- [x] L-0: SAFE
- [x] Implementation scope: dg-engine.js only, 3 locations, ~5 lines total
- [x] Test matrix: T-1 through T-17 defined
- [x] Gate chapter distribution: 16 instances across all 7 chapters
- [x] Edge cases documented: OBJECT2 without OBJECT (JHN 1:33), verbless (ROM 6:12), fronted (PHP 2:5)

P6-G.10.2 scope: Confirm exact change specification, verbless clause connector policy, regression proof. STOP before implementation.

---

*P6-G.10.1 read-only audit complete. Decision: PASS. STOP.*  
*Do not begin P6-G.10.2 or any implementation. No commit, merge, push, or deploy.*
