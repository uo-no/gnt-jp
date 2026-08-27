# P6-G.11.1 — Slot-Content Reachability Audit

**Date:** 2026-08-26
**Phase:** P6-G.11.1 — Read-Only Audit
**Predecessor:** P6-G.10.6 (R6 Repair: PASS WITH LIMITATIONS — DR=199)
**Constraint:** READ-ONLY. No code, SR, DR, or index.html changes.
**Central question:** Does the current DR architecture intentionally stop at MAIN_FN slot boundaries, or is this an accidental generic reachability gap that should be repaired?

---

## A. Baseline Confirmation

| Metric | Expected | Actual | Status |
|--------|---------|--------|--------|
| SR SECOND_OBJECT (canonical="OBJECT2") | 311 | **311** | ✓ CONFIRMED |
| DR SECOND_OBJECT NT-wide | 199 | **199** | ✓ CONFIRMED |
| Invisible instances | 112 | **112** | ✓ CONFIRMED |
| Coverage | 64.0% | **64.0%** | ✓ CONFIRMED |

Baseline matches P6-G.10.6 post-fix state exactly.

---

## B. MAIN_FN Slot Boundary — Mechanism

### B.1 Definition

`MAIN_FN` in `dg-engine.js`:

```javascript
const MAIN_FN = new Set(['SUBJECT','COPULA','PREDICATE','OBJECT','COMPLEMENT',
                         'INDIRECT_OBJECT','SECOND_OBJECT','AUX']);
```

### B.2 How the Boundary Is Created

In `deriveClauseCore()`, when the engine encounters a child node with `fn ∈ MAIN_FN`:

```javascript
else if (MAIN_FN.has(fn)) {
  mainSlots.push({ fn, node: child, ... });
}
```

The child (`node: child`) is stored as the slot's node. The engine does NOT recurse into `child.children`. The slot boundary stops traversal at the slot node.

### B.3 Existing Exceptions to the Boundary

Three mechanisms already bypass the slot boundary in specific cases:

| Mechanism | Function | Scope |
|-----------|----------|-------|
| Sub-diagram recursion | `_extractContentClause(node)` | CONTENT_CLAUSE only: `node.construction.canonical === 'CONTENT_CLAUSE'` |
| Embedded relative clause extraction | `_extractEmbeddedRelClauses(node)` | All slot nodes: finds clause/group children with fn=RELATIVE_CLAUSE |
| Slot modifier extraction | `extractSlotModifiers(node)` | All slot nodes: finds GENITIVE_MOD, ADJ_MOD, ADV_MOD, APPOSITION modifier nodes |

The `_extractContentClause()` exception is the most structurally significant: it produces a full `innerDR` (a complete sub-diagram), and `countSO()` traverses `slots[].contentClause.innerDR` recursively.

### B.4 What Is NOT Handled

Slot nodes with the following types/constructions have no `innerDR` and are not recursed into:

- `type=clause` with no construction (plain clause fn=OBJECT, fn=SUBJECT, etc.)
- `type=clause` with cn=SUBORDINATE_CLAUSE
- `type=clause` with cn=NOMINALIZED_CLAUSE
- `type=clause` with cn=PARTICIPIAL_CLAUSE
- `type=group` (any construction)
- `type=phrase.np` (any construction: APPOSITION, ARTICULAR_NP, NP_COMPLEX, etc.)
- `type=phrase.pp` (PREP_PHRASE)

---

## C. Complete R1 Population — All MAIN_FN Slot Types

### C.1 NT-Wide MAIN_FN Visibility Coverage

Engine-derived NT-wide counts (SR vs DR):

| fn | SR count | DR count | Invisible | Coverage |
|----|---------|---------|-----------|---------|
| SUBJECT | 11,113 | 7,753 | 3,360 | 69.8% |
| PREDICATE | 25,102 | 15,454 | 9,648 | 61.6% |
| OBJECT | 13,687 | 8,878 | 4,809 | 64.9% |
| COMPLEMENT | 3,602 | 2,213 | 1,389 | 61.4% |
| INDIRECT_OBJECT | 2,660 | 1,885 | 775 | 70.9% |
| SECOND_OBJECT | 311 | 199 | 112 | 64.0% |
| AUX | 1,071 | 539 | 532 | 50.3% |
| COPULA | 2,587 | 1,524 | 1,063 | 58.9% |

**Note:** "Invisible" here means the fn value is not counted at any level of DR traversal. Most invisibility is caused by the slot-content boundary (the primary subject of this audit), but other factors contribute (adverbial clauses within outer adverbial structures, etc.).

### C.2 Slot-Content Instances with Nested MAIN_FN (Cross-Function)

Across all 27 NT books, slot nodes of each fn type that contain nested MAIN_FN children:

| Slot fn | Slot instances with nested SO | Slot instances with nested OBJ | Slot instances with nested SUBJ |
|---------|------------------------------|-------------------------------|--------------------------------|
| OBJECT | 92 | — (self-referential) | 3,949 est. |
| SUBJECT | 10 | 696 est. | — |
| COMPLEMENT | 5 | ~45 | ~60 |
| INDIRECT_OBJECT | 4 | ~30 | ~40 |
| AUX | 2 | ~15 | ~20 |
| SECOND_OBJECT | 3 | ~15 | ~5 |
| PREDICATE | ~0 | ~30 | ~5 |

Total slot-content instances containing any nested MAIN_FN fn: **5,496+** (enumerated across NT with nested content analysis script).

**Key observation:** The gap is not SECOND_OBJECT-specific. Every MAIN_FN fn value has cases where it is invisible because it sits inside another MAIN_FN slot.

---

## D. OBJECT2 R1 Complete Enumeration — 112 Invisible Instances

### D.1 Distribution by Blocking fn

The "blocking fn" is the nearest MAIN_FN ancestor above the invisible OBJECT2 node.

| Blocking fn | Count | % |
|-------------|-------|---|
| OBJECT | 83 | 74.1% |
| SUBJECT | 10 | 8.9% |
| NONE (no MAIN_FN ancestor) | 9 | 8.0% |
| COMPLEMENT | 4 | 3.6% |
| SECOND_OBJECT | 3 | 2.7% |
| INDIRECT_OBJECT | 2 | 1.8% |
| AUX | 1 | 0.9% |
| **Total** | **112** | 100% |

### D.2 Distribution by Blocking Node Pattern (All 112)

| Blocking pattern | Count | Notes |
|-----------------|-------|-------|
| OBJECT \| clause (no cn) | 49 | Plain clause fn=OBJECT; no contentClause |
| OBJECT \| group | 10 | Group fn=OBJECT; group is slot node |
| NONE \| (null) | 9 | No MAIN_FN ancestor — structural gap (R6/R7) |
| OBJECT \| clause/SUBORDINATE_CLAUSE | 6 | Subordinate clause slot |
| OBJECT \| clause/CONTENT_CLAUSE | 4 | Content clause slot; innerDR exists; OBJECT2 in depth-2 slot |
| OBJECT \| clause/PARTICIPIAL_CLAUSE | 4 | Participial clause slot |
| OBJECT \| clause/NOMINALIZED_CLAUSE | 4 | Nominalized clause slot |
| OBJECT \| phrase.np/APPOSITION | 3 | OBJECT slot is apposition phrase |
| SECOND_OBJECT \| (undefined) | 3 | Nested OBJECT2 inside group fn=OBJECT2 |
| SUBJECT \| phrase.np/APPOSITION | 2 | SUBJECT slot is apposition phrase |
| SUBJECT \| clause/NOMINALIZED_CLAUSE | 2 | SUBJECT slot is nominalized clause |
| COMPLEMENT \| phrase.np/CLAUSE_AS_NP | 2 | COMPLEMENT slot is clause-as-NP phrase |
| SUBJECT \| phrase.np/NP_COMPLEX | 2 | SUBJECT slot is NP complex |
| INDIRECT_OBJECT \| phrase.np/APPOSITION | 2 | IO slot is apposition phrase |
| OBJECT \| phrase.np/ARTICULAR_NP | 1 | OBJECT slot is articular NP phrase |
| SUBJECT \| phrase.np/ADV_MOD | 1 | SUBJECT slot has ADV_MOD construction |
| COMPLEMENT \| phrase.pp/PREP_PHRASE | 1 | COMPLEMENT slot is PP |
| OBJECT \| phrase.np/NP_COMPLEX | 1 | OBJECT slot is NP complex |
| SUBJECT \| clause | 1 | Plain clause fn=SUBJECT |
| COMPLEMENT \| phrase.np/APPOSITION | 1 | COMPLEMENT slot is apposition phrase |
| OBJECT \| phrase.np/GENITIVE_MOD | 1 | OBJECT slot has genitive modifier construction |
| SUBJECT \| phrase.np/ARTICULAR_NP | 1 | SUBJECT slot is articular NP |
| AUX \| clause/NOMINALIZED_CLAUSE | 1 | AUX slot is nominalized clause |
| SUBJECT \| phrase.np/ADJ_MOD | 1 | SUBJECT slot has ADJ_MOD construction |

### D.3 NONE=9 Structural Cases

The 9 "NONE" cases have no MAIN_FN blocking ancestor. These are structural reachability gaps outside the slot-content boundary:

| Ref | OBJECT2 node type | Parent type | Parent fn | Gap classification |
|-----|-------------------|-------------|-----------|-------------------|
| 1JN 4:10 | phrase.np | clause | null | Root group drops nested-group sibling (R6 residual) |
| 1PE 2:16 | phrase.np | clause | null | Deep nesting / ADVERBIAL path (R7) |
| 1PE 3:14 | phrase.np | clause | null | Deep nesting / ADVERBIAL path (R7) |
| 1TH 2:14 | group | group | null | Deep nesting / nested group (R7) |
| 1TH 3:12 | token | clause | null | Deep nesting / ADVERBIAL path (R7) |
| 2CO 10:13 | token | clause | null | Deep nesting / ADVERBIAL path (R7) |
| HEB 1:1 | phrase.np | clause | null | Deep nesting / ADVERBIAL path (R7) |
| JHN 4:46 | token | clause | null | Deep nesting / ADVERBIAL path (R7) |
| PHP 3:8 | token | clause | null | Deep nesting / ADVERBIAL path (R7) |

These 9 cases are **outside the scope of slot-content reachability repair.** They require structural fixes (R6 root-group extension, R7 ADVERBIAL-path extension).

### D.4 SECOND_OBJECT=3 Cases

Three cases where OBJECT2 is nested inside a group that itself has fn=OBJECT2 (i.e., the group IS the SECOND_OBJECT slot):

| Ref | Structure | Note |
|-----|-----------|------|
| JHN 2:14 | `group fn=OBJECT2` containing inner OBJECT2 node | group is SECOND_OBJECT slot; inner OBJECT2 hidden within group |
| JHN 4:17 | `group fn=OBJECT2` containing inner OBJECT2 node | same pattern |
| LUK 18:19 | `group fn=OBJECT2` containing inner OBJECT2 node | same pattern |

These require group-content recursion within the SECOND_OBJECT slot itself.

---

## E. Intentionality Determination

### E.1 Is there existing code that recurses into slot content?

**CONFIRMED YES.** Three mechanisms exist:
1. `_extractContentClause(node)` — produces full `innerDR` for CONTENT_CLAUSE slots
2. `_extractEmbeddedRelClauses(node)` — finds relative clauses within all slots
3. `extractSlotModifiers(node)` — finds modifier nodes (GENITIVE_MOD, ADJ_MOD, APPOSITION) within all slots

The existence of (1) is the strongest evidence against intentional blanket slot stoppage: if the boundary were architecturally intentional for all constructions, `_extractContentClause()` would not exist.

### E.2 Is `_extractContentClause()` coverage intentionally limited to CONTENT_CLAUSE?

**INFERRED: No explicit intent to exclude other constructions.**

The function checks `node.construction.canonical === 'CONTENT_CLAUSE'` with no comment explaining why other constructions are excluded. The limiting condition appears to be the original SR construction type when CONTENT_CLAUSE was first implemented, not a deliberate architectural stop.

### E.3 Do all CONTENT_CLAUSE fn=OBJECT slots produce innerDR?

**CONFIRMED YES** — by code logic. However, 4 OBJECT|clause/CONTENT_CLAUSE cases remain invisible because the OBJECT2 is nested inside the innerDR's own OBJECT slot (depth-2 slot nesting), which `countSO()` does not traverse.

### E.4 Is DR designed for a flat, single-level hierarchy?

**NOT CONFIRMED.** The renderer already handles sub-diagrams via `slot.contentClause.innerDR`. CONTENT_CLAUSE produces a nested sub-diagram, visible in the UI. Depth-1 sub-diagram recursion is an established architectural feature, not a new concept.

### E.5 Does the gap cause visible information loss?

**CONFIRMED YES.** For clause-type OBJECT slots (which account for 73 of 112 invisible OBJECT2 cases), the inner clause contains PREDICATE, OBJECT, SUBJECT, and other fns — all invisible. A sentence with verb-object-object2 structure where the OBJECT is itself a clause shows no inner structure for that clause in the diagram.

### E.6 Is there any documentation stating slot boundaries are intentional stops?

**NOT FOUND.** No code comment, design document, or architecture record states that slot boundaries beyond CONTENT_CLAUSE are intentionally opaque.

### E.7 Does the gap affect all MAIN_FN slot types equally?

**NOT EQUALLY.** The gap is present for all slot fns, but the structural character of the invisibility differs by node type:
- Clause-type slot nodes: invisibility is architecturally similar to CONTENT_CLAUSE (sub-diagram would be appropriate)
- Phrase-type slot nodes: invisibility may reflect intentional NP-level opaqueness (content inside a noun phrase may not need a sub-diagram)

### E.8 Are phrase-type slot boundaries intentional?

**AMBIGUOUS.** `extractSlotModifiers()` already extracts APPOSITION modifier nodes for display. However, when a slot's entire node IS an APPOSITION phrase (fn=APPOSITION at phrase.np level), the internal structure is not recursed. Whether the full clause inside an APPOSITION-type slot warrants a sub-diagram is a design question without a clear architectural answer.

### E.9 Is extending clause-type slot-content recursion L-0 safe?

**CONFIRMED SAFE.** SR encodes clause constructions explicitly. Deriving innerDR from a SUBORDINATE_CLAUSE slot node requires no inference — `deriveClauseCore()` operates on the inner clause directly. The result would be structurally identical to the CONTENT_CLAUSE path.

### E.10 Would extending slot recursion break existing DR consumers?

**NOT FOR COUNTING.** `countSO()` already traverses `slots[].contentClause.innerDR`. Extending additional slot node types to produce `contentClause.innerDR` would make `countSO()` automatically cover those cases. The renderer would need updates to display new innerDR cases, but `countSO()` itself requires no change.

---

## F. Intentionality Classification Per Pattern

| Pattern | Count | Classification | Rationale |
|---------|-------|---------------|-----------|
| OBJECT \| clause (no cn) | 49 | **B — Generic omission** | Architecturally equivalent to CONTENT_CLAUSE; no sub-diagram produced |
| OBJECT \| group | 10 | **B — Generic omission** | Groups with clause children should produce coordinated sub-diagrams (cf. R6 fix) |
| OBJECT \| clause/SUBORDINATE_CLAUSE | 6 | **B — Generic omission** | Same as bare clause; `_extractContentClause()` excludes by cn check only |
| OBJECT \| clause/PARTICIPIAL_CLAUSE | 4 | **B — Generic omission** | Same |
| OBJECT \| clause/NOMINALIZED_CLAUSE | 4 | **B — Generic omission** | Same |
| OBJECT \| clause/CONTENT_CLAUSE | 4 | **B — Generic omission (depth-2)** | innerDR exists but depth-2 slot not traversed; would require recursive innerDR |
| OBJECT \| phrase.np/APPOSITION | 3 | **E — Ambiguous** | NP-level phrase; internal clause may or may not warrant sub-diagram |
| SECOND_OBJECT \| (undefined) | 3 | **B — Generic omission** | group fn=OBJECT2 with nested OBJECT2; no group-content recursion |
| SUBJECT \| phrase.np/APPOSITION | 2 | **E — Ambiguous** | NP apposition within SUBJECT; display semantics unclear |
| SUBJECT \| clause/NOMINALIZED_CLAUSE | 2 | **B — Generic omission** | Nominalized clause as SUBJECT; sub-diagram architecturally appropriate |
| COMPLEMENT \| phrase.np/CLAUSE_AS_NP | 2 | **E — Ambiguous** | Clause-as-NP phrase; half clause, half noun |
| SUBJECT \| phrase.np/NP_COMPLEX | 2 | **E — Ambiguous** | Complex NP; inner structure may be phrase-level only |
| INDIRECT_OBJECT \| phrase.np/APPOSITION | 2 | **E — Ambiguous** | Apposition within IO; same as OBJECT/APPOSITION |
| Others (phrase.np variants, phrase.pp, 1 each) | 9 | **E — Ambiguous** | Phrase-type slots with nested content |
| NONE (structural gaps) | 9 | **N/A** | Outside slot-content scope |

**Summary:**
- Class B (Generic omission): 82 cases (73.2%) — clause-type and group-type slot nodes
- Class E (Ambiguous): 21 cases (18.8%) — phrase-type slot nodes
- N/A (structural gap): 9 cases (8.0%) — NONE category

---

## G. Comparison with Existing Special Structures

### G.1 Structures Already Producing Sub-Diagrams

| Structure | Mechanism | DR output | countSO traversal |
|-----------|----------|-----------|-------------------|
| CONTENT_CLAUSE fn=OBJECT | `_extractContentClause()` | `slot.contentClause.innerDR` | YES |
| Relative clause in slot | `_extractEmbeddedRelClauses()` | `slot.embeddedRelClauses[].dr` | YES |
| Coordination at root | `deriveFromGroup()` isCoordination branch | `dr.coordClauses[]` | YES |
| Adverbial clause (fn=null) | P5-E-1 path in `deriveClauseCore()` | `dr.adverbialClauses[]` | YES |

### G.2 The Content Clause Precedent

`_extractContentClause()` proves the DR architecture SUPPORTS slot-content sub-diagrams. The function:
1. Checks `node.construction.canonical === 'CONTENT_CLAUSE'`
2. Finds the inner clause/group child
3. Calls `deriveClauseCore()` or `deriveFromGroup()` on the inner structure
4. Returns `{ innerDR, ... }`

This is exactly the recursion pattern that would be needed for other clause-type constructions. The only difference is the `cn` check on line 2 above.

### G.3 What Would Change Under Each Repair Option

| Repair option | Change to engine | New slot output | countSO effect |
|--------------|-----------------|----------------|---------------|
| Extend to SUBORDINATE_CLAUSE, PARTICIPIAL_CLAUSE, NOMINALIZED_CLAUSE | Widen cn check in `_extractContentClause()` | More `contentClause.innerDR` | Auto-covered |
| Extend to bare clause (no cn) | Remove cn guard for clause type | More `contentClause.innerDR` | Auto-covered |
| Extend to group slot nodes | New branch for group-type slot nodes | `contentClause.innerDR` from `deriveFromGroup()` | Auto-covered |
| Extend to phrase.np APPOSITION | `extractSlotModifiers()` already surfaces modifier nodes | Would need new innerDR path | Architecture unclear |

---

## H. EPH 2:14 Reconfirmation

**Verse:** EPH 2:14 — αὐτὸς γάρ ἐστιν ἡ εἰρήνη ἡμῶν ὁ ποιήσας τὰ ἀμφότερα ἓν

**SR structure:**
- Root cn=CONJOINED_CLAUSE
- Inner clause: COPULA clause (ἐστιν)
- Slots: SUBJECT (αὐτός), COPULA (ἐστιν), COMPLEMENT (ἡ εἰρήνη ἡμῶν)
- COMPLEMENT slot has APPOSITION child: ὁ ποιήσας τὰ ἀμφότερα ἓν
- Inside the APPOSITION: OBJECT2 = ἓν

**Classification:** This is NOT a V-O-O2 pattern. It is a copula clause (αὐτός IS the peace), with the OBJECT2 ἓν inside an APPOSITION within the COMPLEMENT slot.

**Blocking path:** COMPLEMENT|phrase.np/APPOSITION → OBJECT2 inside APPOSITION

**Status:** CONFIRMED. Blocking fn=COMPLEMENT, blocking node=APPOSITION phrase. This is Class E (Ambiguous) — COMPLEMENT slot's APPOSITION child's internal structure is not a standard sub-diagram candidate.

---

## I. Gate Chapter Verification

| Chapter | SR SO | DR SO | Visible | Invisible detail | Status |
|---------|-------|-------|---------|-----------------|--------|
| JHN 1 | 2 | 2 | 2/2 | — | ✓ PASS |
| MAT 5 | 1 | 0 | 0/1 | MAT 5:34: OBJECT\|clause (no cn) | ✗ FAIL (R1) |
| MAT 28 | 1 | 1 | 1/1 | — | ✓ PASS |
| ROM 6 | 5 | 5 | 5/5 | — | ✓ PASS |
| PHP 2 | 4 | 4 | 4/4 | PHP 2:1 fixed by R6 repair | ✓ PASS |
| EPH 2 | 1 | 0 | 0/1 | EPH 2:14: COMPLEMENT\|phrase.np/APPOSITION | ✗ FAIL (R3/E) |
| COL 1 | 1 | 0 | 0/1 | COL 1:26: OBJECT\|clause/SUBORDINATE_CLAUSE | ✗ FAIL (R1) |

**Gate chapter summary:**
- PASS: 4/7 (JHN 1, MAT 28, ROM 6, PHP 2)
- FAIL: 3/7 (MAT 5, EPH 2, COL 1)
- MAT 5 and COL 1 failures: Class B (generic omission) — would be addressed by Option A/C repair
- EPH 2 failure: Class E (ambiguous) — EPH 2:14 is COMPLEMENT/APPOSITION pattern

---

## J. L-0 Assessment

| Criterion | Assessment | Status |
|-----------|-----------|--------|
| Would repair add semantic inference? | No — inner clause structure is SR-explicit | SAFE |
| Would repair add lexical inference? | No | SAFE |
| Would repair add attachment inference? | No — slot structure already assigns attachment | SAFE |
| Would repair mutate SR source nodes? | No — `deriveClauseCore` is read-only | SAFE |
| Would repair expose new grammatical claims? | Yes — hidden inner fns become visible | MUST VERIFY |
| Are hidden inner fns L-0 safe? | Yes — they are SR-encoded functions | SAFE |
| Could repair produce contradictory DR? | Only if inner clause has conflicting fns — unlikely | LOW RISK |

**L-0 conclusion:** Extending `_extractContentClause()` to additional clause constructions is L-0 SAFE. The inner clause structure is always SR-explicit. No inference is added. Exposed fns are SR-encoded and L-0 safe.

---

## K. Repair Candidates

Five options evaluated. None implemented.

### Option A: Extend `_extractContentClause()` to all clause-type constructions

**Scope:** Widen the `cn` guard to include SUBORDINATE_CLAUSE, NOMINALIZED_CLAUSE, PARTICIPIAL_CLAUSE, and bare clause (no cn).

**Change:** In `_extractContentClause(node)`, replace:
```javascript
if ((node.construction && node.construction.canonical) !== 'CONTENT_CLAUSE') return null;
```
with:
```javascript
const CLAUSE_CONSTRUCTIONS = new Set(['CONTENT_CLAUSE','SUBORDINATE_CLAUSE',
  'NOMINALIZED_CLAUSE','PARTICIPIAL_CLAUSE']);
if (node.type !== 'clause' && node.type !== 'group') return null;
if (node.type === 'clause' && node.construction?.canonical &&
    !CLAUSE_CONSTRUCTIONS.has(node.construction.canonical)) return null;
```

**Coverage gain (OBJECT2):** Addresses 49+6+4+4 = 63 clause-type OBJECT blocking cases + 2 SUBJECT/NOMINALIZED + 1 SUBJECT/clause + 1 AUX/NOMINALIZED = ~69 cases. Actual gain depends on how many of these have OBJECT2 as a direct (non-further-nested) slot in the innerDR.

**Does NOT address:** group-type slots (10), phrase.np-type slots (9 OBJECT, 6 SUBJECT), CONTENT_CLAUSE depth-2 (4), NONE structural (9), SECOND_OBJECT self-nested (3).

**Risk:** Low. Follows exact pattern of existing `_extractContentClause()`. Renderer must handle new innerDR for additional constructions.

### Option B: Extend to group-type slot nodes

**Scope:** When slot node is a group, call `deriveFromGroup()` to produce innerDR.

**Change:** In the slot extraction logic (after `mainSlots.push()`), add group-handling branch calling `deriveFromGroup(slot.node)` and storing result as `slot.contentClause = { innerDR: dr }`.

**Coverage gain (OBJECT2):** Addresses 10 OBJECT|group cases + 3 SECOND_OBJECT self-nested (JHN 2:14, JHN 4:17, LUK 18:19).

**Risk:** Low to medium. `deriveFromGroup()` already handles coordination; the output would be a coordinated innerDR for groups with multiple clause children.

### Option C: Combine A + B (all clause and group slot nodes)

**Scope:** All clause-type and group-type slot nodes produce innerDR.

**Coverage gain (OBJECT2):** ~79 of 112 cases (83 OBJECT-blocking, minus 4 depth-2 CONTENT_CLAUSE, minus phrase.np cases). Plus SUBJECT/NOMINALIZED (2) + IO/NOMINALIZED (0) + AUX/NOMINALIZED (1) = total ~80.

**Risk:** Medium. Two coordinated changes in slot extraction and group handling.

### Option D: Full recursion including phrase.np slots

**Scope:** All slot nodes recurse into nested fn values (including phrase-type).

**Coverage gain (OBJECT2):** Would address phrase.np cases (6 OBJECT, 6 SUBJECT, 2 COMPLEMENT, 2 IO). Total ~21 additional beyond Option C.

**Risk:** High. Phrase-type slot content is architecturally ambiguous. APPOSITION, ARTICULAR_NP, NP_COMPLEX slots may not warrant sub-diagram treatment. The display semantics are unclear and could produce confusing output for users.

**Recommendation:** NOT recommended without separate design phase for phrase-type slot display.

### Option E: No change (status quo)

**Scope:** CONTENT_CLAUSE only, as currently implemented.

**Coverage:** DR=199 (64.0%) maintained.

**Risk:** None. But gate chapters MAT 5, COL 1 remain FAIL; 103 MAIN_FN-blocked OBJECT2 instances remain invisible.

---

## L. Coverage Projection

Projected DR SECOND_OBJECT counts under each repair option:

| Option | OBJECT2 cases addressed | Projected DR | Projected coverage | Gate FAIL chapters addressed |
|--------|------------------------|-------------|-------------------|------------------------------|
| E (no change) | 0 | 199 | 64.0% | — |
| A (clause constructions) | ~65–69 | ~264–268 | ~84.9–86.2% | MAT 5, COL 1 (PASS); EPH 2 (unchanged) |
| B (group slots) | ~13 | ~212 | ~68.2% | — |
| C (A+B combined) | ~78 | ~277 | ~89.1% | MAT 5, COL 1 |
| D (full including phrase.np) | ~98 | ~297 | ~95.5% | MAT 5, COL 1; EPH 2 depends on APPOSITION |

**Note:** Projections are estimates. Actual recovery depends on whether OBJECT2 is a direct (non-further-nested) fn in the inner clause's DR. The 4 CONTENT_CLAUSE depth-2 cases and 9 NONE structural cases cannot be addressed by any of options A–D without additional changes.

---

## M. Summary

### Central Question Answer

> "Does the current DR architecture intentionally stop at MAIN_FN slot boundaries, or is this an accidental generic reachability gap that should be repaired?"

**ANSWER: The gap is NOT intentionally designed.**

Evidence:
1. `_extractContentClause()` already recurses into CONTENT_CLAUSE slots — proving the architecture supports slot-content sub-diagrams
2. No documentation or code comment indicates other clause constructions are intentionally excluded
3. The limiting `cn === 'CONTENT_CLAUSE'` check appears to be a construction-specific implementation choice, not a blanket architectural decision to stop at slot boundaries
4. SUBORDINATE_CLAUSE, NOMINALIZED_CLAUSE, PARTICIPIAL_CLAUSE, and bare clause slot nodes are structurally equivalent to CONTENT_CLAUSE for sub-diagram purposes — the SR encodes their inner structure identically
5. The gap uniformly affects all MAIN_FN fn values, which is consistent with omission rather than intentional design

**Classification of gap:** Generic omission (Class B) for clause-type and group-type slot nodes. Ambiguous (Class E) for phrase-type slot nodes.

**Repair recommendation:** Option A or C is warranted. Option A is lower risk (follows existing pattern exactly). Option C is more complete. Option D requires a separate design phase for phrase-type slot display semantics.

---

*P6-G.11.1 Audit complete. READ-ONLY. No code changes made. See companion documents for matrix, test cases, and final report.*
