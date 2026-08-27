# P6-G.10.2 — OBJECT2 Repair Design: Final Report

**Date:** 2026-08-26  
**Phase:** P6-G.10.2 — Design Review  
**Predecessor:** P6-G.10.1 Read-only Audit (PASS)  
**Constraint:** No production code changes. Read-only.

---

## Decision

> **PASS**

The proposed repair design is structurally sound, L-0 safe, and regression-free. All cases A–J confirmed safe. Implementation may proceed to P6-G.10.3.

---

## A. Design Completeness Assessment

### A.1 Root Cause Addressed

| Root cause (P6-G.10.1) | Design response | Status |
|------------------------|----------------|--------|
| SR emits 'OBJECT2'; MAIN_FN has 'SECOND_OBJECT' — naming mismatch | Change 1+2: normalize 'OBJECT2'→'SECOND_OBJECT' before MAIN_FN check | ✓ Addressed |
| `connectorBetween()` has no SECOND_OBJECT case | Change 3: 4 additive lines covering all structural positions | ✓ Addressed |
| `_DG_FN_JA` has no 'OBJECT2' entry (label would show raw string) | Normalization stores 'SECOND_OBJECT' — existing entry already present | ✓ Addressed |

### A.2 Cases A–J — Summary

| Case | Description | Design outcome |
|------|-------------|---------------|
| A | PREDICATE+OBJECT+OBJECT2 (EPH 2:14, COL 1:21, etc.) | 'po' at OBJECT→OBJ2 via Change 3 after-vp path ✓ |
| B | OBJECT2 without OBJECT (JHN 1:33) | 'po' at PREDICATE→OBJ2 via Change 3 vp path ✓ |
| C | OBJECT2 + IO (ROM 6, JHN 1:33) | IO goes to ioSlots (platform); SECOND_OBJECT to baseSlots — no conflict ✓ |
| D | OBJECT2 cn=CONTENT_CLAUSE (17 NT) | Branch 1 (sub-diagram) is fn-independent; after normalization, slot created → Branch 1 reached ✓ |
| E | Verbless clause (ROM 6:12) | noVerb path: `if (obj && obj2) return 'po'` — new Change 3 line ✓ |
| F | Subordinate clause | Recursive `deriveClauseCore()` call sees Change 1 normalization ✓ |
| G | OBJECT2 with modifiers | `extractSlotModifiers()` is fn-independent; called after slot creation ✓ |
| H | OBJECT2 cn=COORDINATION (COL 1:21) | Default renderer branch is fn-independent ✓ |
| I | OBJECT2 cn=APPOSITION (1 NT) | Branch 2 checks `node.construction.canonical` — fn-independent ✓ |
| J | Idempotency / nested structures | `fn === 'OBJECT2'` check is false for 'SECOND_OBJECT'; source node unchanged ✓ |

All 10 cases: **CONFIRMED SAFE**.

### A.3 Change Count Verification

| Change | Location | Lines | Existing lines modified | New lines added |
|--------|---------|-------|------------------------|----------------|
| 1 | `deriveClauseCore()` L422 | 2 | 1 (const→let) | 1 |
| 2 | `deriveFromGroup()` L544 | 2 | 1 (const→let) | 1 |
| 3 | `connectorBetween()` L80–106 | 4 | 0 | 4 |
| **Total** | | **7** | **2** | **5** |

Zero existing `return` statements modified. Zero existing constants changed. All additions are additive and currently unreachable.

---

## B. L-0 Final Assessment

| L-0 Criterion | Assessment | Evidence |
|---------------|-----------|----------|
| SR fn='OBJECT2' is explicit, not inferred | SAFE | `derivedFrom: ["role"]`, `status: "CONFIRMED"` |
| Normalization is representational | SAFE | Both 'OBJECT2' and 'SECOND_OBJECT' map to '第二目的語' |
| No semantic inference from context | SAFE | Normalization triggered only by `fn === 'OBJECT2'` — no other SR fields read |
| 'po' connector is structural | SAFE | Same connector used for PREDICATE→OBJECT (same baseline position) |
| No morphological inference | SAFE | No form/case/mood analysis |
| Source node not mutated | SAFE | Local `let fn` variable; `child.function.canonical` unchanged |
| **L-0: SAFE** | **CONFIRMED** | |

---

## C. SSOT Integrity

| SSOT concern | Assessment |
|-------------|-----------|
| SR is SSOT for fn='OBJECT2' | Unchanged — SR files not modified |
| SR node not reinterpreted | `fn === 'OBJECT2'` is the only condition; no other SR field drives normalization |
| 'SECOND_OBJECT' will not appear in SR | Confirmed 0 SR files — no risk of double-normalization |
| DR stores 'SECOND_OBJECT' — is this correct? | Yes — DR is a derived, engine-internal representation. SSOT remains SR. |

---

## D. `index.html` — Zero Changes Confirmed

| Element checked | Status | Reason |
|----------------|--------|--------|
| `_DG_FN_JA` | No change needed | 'SECOND_OBJECT': '第二目的語' already at line 12318 |
| Renderer branches 1–4 | No change needed | All check `node.construction.canonical` — fn-independent |
| IO filter | No change needed | `s.fn !== 'INDIRECT_OBJECT'` — SECOND_OBJECT → baseSlots correctly |
| CSS | No change needed | `dg-slot-second_object` inherits from `.dg-slot` |
| `_SD_FN_JA` | No change needed | Both 'OBJECT2' and 'SECOND_OBJECT' already present |

**`index.html`: ZERO changes. Confirmed.**

---

## E. Regression Safety

### E.1 Existing Features

13 features audited:

| Feature | Impact | Result |
|---------|--------|--------|
| SUBJECT | None — normalization condition false | SAFE |
| PREDICATE | None | SAFE |
| OBJECT | None | SAFE |
| COMPLEMENT | None | SAFE |
| SECOND_OBJECT (existing) | 0 existing slots — additive only | SAFE |
| IO platform | None — ioSlots filter unchanged | SAFE |
| PP / ADVERBIAL | None — separate path | SAFE |
| APPOSITION | None — Branch 2 is fn-independent | SAFE |
| NOMINALIZED_CLAUSE | None — Branch 3 is fn-independent | SAFE |
| CONTENT_CLAUSE | None — Branch 1 is fn-independent | SAFE |
| Relative clauses | None — cn=CLAUSE_AS_NP check | SAFE |
| Coordination | None — DR isCoordination is clause-level | SAFE |
| SD fallback (non-gate) | None — `_isDGChapter` gate unchanged | SAFE |

**All 13 features: REGRESSION SAFE.**

### E.2 NT Baseline

Current NT baseline: 8,010 sentences, 137,741 tokens, 0 errors.

Changes 1 and 2 create new DR slots from previously dropped nodes. They do NOT modify how other fn values are processed. Error count is expected to remain 0.

Changes 3 adds new return paths in `connectorBetween()`. With 0 current SECOND_OBJECT slots, all new paths are unreachable — no existing connector result changes.

**NT error baseline: 0 → 0 (expected unchanged).**

---

## F. Known Limitations

| Limitation | Scope | Classification |
|-----------|-------|----------------|
| Clause-type OBJECT2 as extra-sibling in group | ~30/311 NT-wide, 0 gate | DEFERRED — pre-existing; not new regression |
| PHP 2:5 SUBJECT→SECOND_OBJECT null connector | 1 gate verse | ACCEPTABLE — correct structural representation |
| COPULA + SECOND_OBJECT (no path in `if (vc)` block) | 0 NT instances | N/A — COPULA verbs are equative, don't take direct objects |

No limitations affect gate chapter correctness. No limitations introduce new regressions relative to current behavior.

---

## G. Test Coverage

| Priority | Tests | Status |
|---------|-------|--------|
| P1 (must pass) | T-1–T-5, T-9–T-14, T-16–T-18, T-20 | 15 tests defined |
| P2 (should pass) | T-6, T-7, T-8, T-15, T-19 | 5 tests defined |
| **Total** | **T-1 through T-20** | **20 tests defined** |

NT-wide coverage: 311/311 (100%) expected after P6-G.10.3 implementation.

connectorBetween() path coverage:
- Path A (noVerb): T-6 (ROM 6:12) ✓
- Path B (vp+obj2): T-3 (JHN 1:33), T-5 (PHP 2:5) ✓
- Path C (after-vp): T-4 (MAT 28:14), T-2 (PHP 2:1) ✓

All 3 new paths have at least 1 designated test.

---

## H. Deliverable Index

| Document | Status |
|----------|--------|
| `P6-G.10.2_object2_repair_design.md` | ✅ Complete |
| `P6-G.10.2_object2_implementation_spec.md` | ✅ Complete |
| `P6-G.10.2_object2_test_matrix.md` | ✅ Complete |
| `P6-G.10.2_object2_final_report.md` | ✅ This document |

---

## I. Entry Criteria for P6-G.10.3

All met:

- [x] Design reviewed: 3 changes, 7 lines, dg-engine.js only
- [x] Cases A–J: all confirmed safe
- [x] L-0: SAFE
- [x] SSOT: SR unchanged, normalization representational only
- [x] `index.html`: zero changes required and confirmed
- [x] Regression analysis: 13 features SAFE
- [x] NT baseline: 8,010 sentences / 0 errors (reference for P6-G.10.3)
- [x] Test matrix: T-1 through T-20 defined
- [x] Expected coverage: 311/311
- [x] connectorBetween() paths: all 3 new paths covered by tests
- [x] Gate distribution: 16 instances across all 7 gate chapters
- [x] Implementation spec: exact line numbers and diff specified

**P6-G.10.3 may begin.**

---

## J. What P6-G.10.3 Must NOT Do

Constraints inherited from P6-G.10.2:

- MUST NOT touch `index.html`
- MUST NOT touch SR data files
- MUST NOT add 'OBJECT2' to MAIN_FN
- MUST NOT add 'OBJECT2' to `_DG_FN_JA`
- MUST NOT create a new connector type (reuse 'po')
- MUST NOT store 'OBJECT2' in DR (normalize to 'SECOND_OBJECT')
- MUST NOT mutate `child.function.canonical` (local `fn` var only)
- MUST NOT modify MAIN_FN set (already contains 'SECOND_OBJECT')

---

*P6-G.10.2 design review complete. Decision: PASS. STOP.*  
*Do not begin P6-G.10.3 or any implementation. No commit, merge, push, or deploy.*
