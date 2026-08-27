# P6-G.11.1 — Slot-Content Reachability: Final Report

**Date:** 2026-08-26
**Phase:** P6-G.11.1 — Read-Only Audit
**Predecessor:** P6-G.10.6 (R6 Repair: PASS WITH LIMITATIONS — DR=199)
**Constraint:** READ-ONLY throughout. No code, SR, DR, or index.html changes made.

---

## Decision

> **PASS WITH LIMITATIONS**

The audit is complete. The slot-content reachability gap is real, fully enumerated, and classified. The central architectural question is answered. The gap is NOT intentional — it is a generic coverage omission. A sound repair path exists. Implementation is deferred pending authorization.

---

## A. Central Question — Answer

> "Does the current DR architecture intentionally stop at MAIN_FN slot boundaries, or is this an accidental generic reachability gap that should be repaired?"

### Answer: NOT INTENTIONAL — Generic Coverage Omission

**Evidence:**

1. **`_extractContentClause()` exists.** The engine already recurses into slot content for CONTENT_CLAUSE constructions, producing a full sub-diagram (`slot.contentClause.innerDR`). If slot boundaries were architecturally intentional stops, this function would not exist.

2. **No documentation of intent.** No code comment, design document, or architecture record states that the slot boundary is an intentional stop for non-CONTENT_CLAUSE constructions.

3. **The `cn` check is construction-specific, not boundary-setting.** The line `if (node.construction?.canonical !== 'CONTENT_CLAUSE') return null;` in `_extractContentClause()` was written to handle a specific SR construction type — not to declare all other constructions opaque.

4. **SR encodes the inner structure explicitly.** For every blocking clause-type slot node (SUBORDINATE_CLAUSE, NOMINALIZED_CLAUSE, PARTICIPIAL_CLAUSE, bare clause), the inner fn values (PREDICATE, OBJECT, SUBJECT, SECOND_OBJECT) are fully encoded in SR. There is nothing to infer. The engine simply does not call `deriveClauseCore()` on these nodes.

5. **The gap is uniform across all fn values.** PREDICATE (9,648 invisible), OBJECT (4,809 invisible), SUBJECT (3,360 invisible), COPULA (1,063 invisible), SECOND_OBJECT (112 invisible) are all equally affected. Uniform gaps indicate omission, not selective design.

---

## B. Audit Results Summary

### B.1 Baseline

| Metric | Value |
|--------|-------|
| SR SECOND_OBJECT | 311 |
| DR SECOND_OBJECT | 199 |
| Invisible SECOND_OBJECT | 112 |
| Coverage | 64.0% |

### B.2 Invisible OBJECT2 — Classification

| Category | Count | Addressable by slot-content repair |
|----------|-------|-----------------------------------|
| Class B — Generic omission (clause-type slots) | 63 | YES — Options A/C |
| Class B — Generic omission (group-type slots) | 13 | YES — Options B/C |
| Class B — Generic omission (depth-2 CONTENT_CLAUSE) | 4 | NOT by A/C; requires recursive innerDR |
| Class E — Ambiguous (phrase-type slots) | 20 | Only Option D (design question unresolved) |
| N/A — Structural gap (no slot boundary) | 9 | NO — requires separate structural repair |
| **Total** | **112** | ~76 addressable by Option C |

### B.3 NT-Wide Scale

The gap affects all MAIN_FN fn values:

| fn | Coverage |
|----|---------|
| SUBJECT | 69.8% |
| PREDICATE | 61.6% |
| OBJECT | 64.9% |
| COMPLEMENT | 61.4% |
| INDIRECT_OBJECT | 70.9% |
| SECOND_OBJECT | 64.0% |
| AUX | 50.3% |
| COPULA | 58.9% |

### B.4 Gate Chapter Status

| Chapter | Status | Blocker |
|---------|--------|---------|
| JHN 1 | ✓ PASS | — |
| MAT 5 | ✗ FAIL | MAT 5:34: OBJECT\|clause (Class B) |
| MAT 28 | ✓ PASS | — |
| ROM 6 | ✓ PASS | — |
| PHP 2 | ✓ PASS | PHP 2:1 recovered by P6-G.10.6 |
| EPH 2 | ✗ FAIL | EPH 2:14: COMPLEMENT\|APPOSITION (Class E) |
| COL 1 | ✗ FAIL | COL 1:26: OBJECT\|SUBORDINATE_CLAUSE (Class B) |

---

## C. Architectural Boundary Conclusion

### C.1 Where the Boundary Should Be

The L-0 boundary in this architecture is between:
- **SR-explicit structure** (safe to expose) → includes all fn values inside clause-type slot nodes
- **Inferred structure** (not safe to add) → attachment, semantic roles, discourse functions not encoded in SR

Clause-type slot nodes (SUBORDINATE_CLAUSE, NOMINALIZED_CLAUSE, PARTICIPIAL_CLAUSE, bare clause) sit entirely on the "SR-explicit" side. The engine already knows how to process them (`deriveClauseCore()` handles any clause). The boundary stopping at these nodes is not a semantic or L-0 boundary — it is a coverage boundary.

### C.2 Where the Boundary Is Genuinely Ambiguous

Phrase-type slot nodes (phrase.np/APPOSITION, phrase.np/ARTICULAR_NP, phrase.pp, etc.) present a real architectural question: should the inner structure of a noun phrase ever be rendered as a DR sub-diagram? This is a display semantics question, not a data access question. The inner structure is SR-accessible, but whether it is diagrammatically meaningful is not established. This question should be addressed in a separate design phase before any phrase-type slot repair.

### C.3 The CONTENT_CLAUSE Precedent

The existing `_extractContentClause()` pattern is the correct model for repairing clause-type slots:
1. Check if slot node is a clause-type construction
2. Find the inner clause/group
3. Call `deriveClauseCore()` / `deriveFromGroup()` on the inner node
4. Return innerDR

Extending this to SUBORDINATE_CLAUSE, NOMINALIZED_CLAUSE, PARTICIPIAL_CLAUSE, and bare clause requires only widening the construction check. No architectural innovation is needed.

---

## D. Repair Recommendation

### D.1 Recommended Option

> **Option A** (clause constructions extended) as minimum viable repair, or  
> **Option C** (A + group slots) as preferred complete repair for Class B cases.

**Option C is preferred** because:
- Group-type slot nodes (10 OBJECT|group cases, 3 SECOND_OBJECT self-nested) have the same architectural character as clause-type cases — they contain clause children processable by `deriveFromGroup()`
- Option B is low additional risk on top of Option A
- Combined Option C addresses ~79% of the Class B cases (63+13 = 76 of 96 non-depth-2 Class B)

### D.2 Not Recommended Now

- **Option D** (phrase-type slots): requires display design work before implementation
- **Depth-2 recursion** (TC-10 CONTENT_CLAUSE depth-2): 4 cases; requires separate design for recursive innerDR traversal
- **Structural gap repair** (NONE=9 cases): separate R6/R7 scope

### D.3 L-0 Assessment

| Criterion | Status |
|-----------|--------|
| New semantic inference added | SAFE — none |
| New lexical inference added | SAFE — none |
| SR source nodes mutated | SAFE — none |
| New grammatical claims exposed | SAFE — SR-explicit only |
| L-0 boundary crossed | SAFE — clause-type slots are fully SR-encoded |

**Option A/C are L-0 SAFE.**

### D.4 Expected Coverage Under Option C

| Metric | Current | After Option C |
|--------|---------|----------------|
| DR SECOND_OBJECT | 199 | ~277 (estimated) |
| Coverage | 64.0% | ~89.1% (estimated) |
| Gate FAIL chapters | MAT 5, EPH 2, COL 1 | EPH 2 only |
| Remaining Class B | 96 | ~20 (phrase.np cases + depth-2) |
| Remaining Class E | 20 | 20 (unchanged) |
| Remaining N/A | 9 | 9 (unchanged) |

**Note:** Actual recovery may differ from estimate. The 63 clause-type OBJECT cases include some where OBJECT2 is itself inside a nested slot within the inner clause — those would remain invisible after Option A/C. Exact recovery requires implementation and NT-wide verification.

---

## E. Implementation Specification Pointer

The following is a design sketch for Option A/C. This is NOT an implementation directive — it is scoped for a future implementation phase.

### Option A Change (clause constructions)

File: `public/core/dg-engine.js`  
Function: `_extractContentClause(node)` (lines ~186–207)

Current condition:
```javascript
if ((node.construction && node.construction.canonical) !== 'CONTENT_CLAUSE') return null;
```

Would become (conceptually):
```javascript
const CLAUSE_CONSTRUCTIONS = new Set([
  'CONTENT_CLAUSE','SUBORDINATE_CLAUSE','NOMINALIZED_CLAUSE','PARTICIPIAL_CLAUSE'
]);
if (node.type !== 'clause') return null;
if (node.construction?.canonical && !CLAUSE_CONSTRUCTIONS.has(node.construction.canonical)) return null;
```

This allows bare clauses (no cn) and the three named constructions to produce innerDR.

### Option B Addition (group slots)

After slot construction in `deriveClauseCore()`, for slots where `slot.node.type === 'group'`, call `deriveFromGroup(slot.node)` and attach as `slot.contentClause = { innerDR: result }`.

### Combined Risk

Option A: ~5–8 lines changed. Risk: Low.  
Option B: ~5–8 additional lines. Risk: Low.  
Combined: ~10–16 lines. Risk: Low-medium. Renderer updates required to display new innerDR cases.

---

## F. Known Limitations

| Limitation | Count | Classification | Disposition |
|-----------|-------|---------------|-------------|
| Depth-2 CONTENT_CLAUSE slot nesting | 4 | Class B | Requires recursive innerDR — separate design |
| Phrase-type slot nodes (APPOSITION, NP_COMPLEX, etc.) | 20 | Class E | Requires phrase-type display design |
| Structural gaps (root-drops-nested-group, ADVERBIAL path) | 9 | N/A | Separate R6/R7 structural repair scope |
| EPH 2:14 (COMPLEMENT/APPOSITION) | 1 | Class E | Not addressed by Option A/C |
| Gate chapter EPH 2 | — | Class E gate | Requires Option D + design work |

---

## G. Deliverable Compliance

| Deliverable | Status |
|------------|--------|
| `P6-G.11.1_slot_content_audit.md` | ✅ Complete |
| `P6-G.11.1_slot_content_relationship_matrix.md` | ✅ Complete |
| `P6-G.11.1_slot_content_test_matrix.md` | ✅ Complete |
| `P6-G.11.1_slot_content_final_report.md` | ✅ This document |
| Code modified | ✗ NONE — READ-ONLY audit |
| SR/DR/index.html modified | ✗ NONE — READ-ONLY audit |
| Commit/merge/push/deploy | ✗ NONE — STOP after documents |

---

## H. Mandate Compliance

| Mandate requirement | Status |
|--------------------|--------|
| 1. Baseline confirmed (SR=311, DR=199) | ✓ CONFIRMED |
| 2. Complete R1 population enumerated | ✓ 5,496+ slot-content instances; all MAIN_FN fns covered |
| 3. All 112 OBJECT2 R1 cases enumerated | ✓ All 112 with per-case blocking pattern |
| 4. Intentionality determined (10 sub-questions) | ✓ E.1–E.10 in audit document |
| 5. R1 patterns classified A–E | ✓ 83 Class B, 20 Class E, 9 N/A |
| 6. Cross-function analysis | ✓ NT-wide coverage table; 5,496+ cross-function instances |
| 7. Comparison with existing special structures | ✓ Section G of audit document |
| 8. EPH 2:14 reconfirmed | ✓ COMPLEMENT\|APPOSITION, Class E |
| 9. Gate chapters | ✓ 4 PASS, 3 FAIL (MAT 5, EPH 2, COL 1) |
| 10. L-0 assessment | ✓ Option A/C are L-0 SAFE |
| 11. Repair candidates A–E evaluated | ✓ Options A–E in audit Section K |
| 12. Coverage projection | ✓ Per option in audit Section L and report Section D.4 |
| 13. Exactly 4 deliverable documents created | ✓ All 4 created |
| STOP — no implementation | ✓ No code changes made |

---

*P6-G.11.1 complete. Decision: PASS WITH LIMITATIONS. The slot-content boundary is NOT architecturally intentional for clause-type slots. Option A or C repair is warranted. STOP — no implementation, no commit, merge, push, or deploy.*
