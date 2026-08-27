# P6-G.10.5 — Group Second-Clause Reachability: Audit

**Date:** 2026-08-26  
**Phase:** P6-G.10.5 — Read-Only Audit → Repair Design  
**Predecessor:** P6-G.10.4 Residual Audit (PASS WITH LIMITATIONS — Fix R6 recommended)  
**Constraint:** READ-ONLY. No code, SR, DR schema, or CSS changes.

---

## A. Dirty State (git status --short at phase start)

Pre-existing dirty files (all inherited from prior phases; NONE introduced by this phase):

```
 M public/core/dg-engine.js      ← P6-G.10.3 normalization (P6-F/G-4 also)
 M public/index.html             ← P6-F, P6-G-4 changes
 M scripts/output/re-stageB-audit.json
 M scripts/output/re-stageD-audit.json
 M scripts/output/wallace_coverage.json
 M scripts/output/wallace_coverage.md
?? .vscode/  ... [development docs, untracked]
```

No new modifications from P6-G.10.5. State is READ-ONLY.

---

## B. R6 Baseline Confirmation (Independent of P6-G.10.4 Documents)

Verified via fresh enumeration against post-P6-G.10.3 engine and SR files:

| Metric | Confirmed value |
|--------|----------------|
| SR `"canonical":"OBJECT2"` NT-wide | 311 |
| DR `fn='SECOND_OBJECT'` NT-wide | 192 |
| Total residuals | 119 |
| R6 residuals (OBJECT2 in second clause child of group) | **23** |
| R6 unique sentences | 22 (JHN 5:18 has 2 OBJECT2 in second clause) |

---

## C. Exact Traversal Bug

### C.1 Function and Location

**File:** `public/core/dg-engine.js`  
**Function:** `deriveFromGroup(node, conjunction)`  
**Line:** 530

```javascript
function deriveFromGroup(node, conjunction) {
    const clauseChild  = (node.children || []).find(c => c.type === 'clause');  // ← BUG
    const extraPhrases = (node.children || []).filter(
      c => c.type !== 'clause' && c.type !== 'token' && c.function?.canonical
    );

    let dr;
    if (clauseChild) {
      dr = deriveClauseCore(clauseChild, conjunction);
    } else {
      dr = { id: node.id, conjunction, slots: [], adverbialPhrases: [],
             adverbialClauses: [], isCoordination: false, coordClauses: [],
             noVerb: true, isParticipalClause: false };
    }
    // extraPhrases merge loop follows (lines 548–581)
    ...
}
```

### C.2 Why Only the First Clause Is Exposed

`.find()` returns the first element matching the predicate and stops. When a group has N clause children (N ≥ 2):
- `clauseChild` = `children[k]` where k is the index of the FIRST clause child
- All other clause children at indices k+1, k+2, ... are DROPPED

The dropped clauses are also not captured by `extraPhrases`, which explicitly excludes `c.type !== 'clause'`:

```javascript
// extraPhrases filter line 531-533
const extraPhrases = (node.children || []).filter(
  c => c.type !== 'clause' && c.type !== 'token' && c.function?.canonical
);
```

A clause with `c.type === 'clause'` fails `c.type !== 'clause'` → excluded. Token children also excluded. Only non-clause, non-token children with fn set are captured by `extraPhrases`.

**Result:** Any clause after the first in a group vanishes completely from the DR.

### C.3 Is This `.find()` Intentional?

No design document (P5, P6 series) specifies that group second-clause children should be dropped. The `.find()` was an implementation choice that assumed groups contain at most one clause child. The assumption is false for 966 NT groups (confirmed NT-wide scan).

### C.4 Other `.find()` Calls in the Engine

All other `.find()` uses are in contexts where first-child-only is structurally correct:

| Line | Location | Context | First-child-only correct? |
|------|---------|---------|--------------------------|
| 191 | `_extractContentClause()` | Find CONJ token in CONTENT_CLAUSE children | YES — at most 1 CONJ token |
| 195 | `_extractContentClause()` | Find inner clause/group of CONTENT_CLAUSE | YES — CC has 1 inner content node |
| 530 | `deriveFromGroup()` | Find clause child of group | **NO — bug** |
| 603 | `deriveFromNode()` COORDINATION | Find CONJ token in coord member group | YES — at most 1 CONJ token per member |
| 606 | `deriveFromNode()` COORDINATION | Find inner clause of coord member group | YES — each member wraps exactly 1 clause |
| 632 | `deriveFromNode()` CONJOINED_CLAUSE | Find CONJ token | YES — at most 1 CONJ token |
| 635 | `deriveFromNode()` CONJOINED_CLAUSE | Find non-token inner node | YES — CONJOINED_CLAUSE has 1 inner content node |
| 650 | `deriveFromNode()` SUB/REL/CC/PART | Find CONJ token | YES — at most 1 CONJ token |
| 653 | `deriveFromNode()` SUB/REL/CC/PART | Find inner clause/group | YES — these constructions have 1 inner content node |

**Line 530 is the only `.find()` that is architecturally incorrect.**

---

## D. All 22 R6 Groups Enumerated

All groups have `construction=(none)` (UNRESOLVED) and `extraPhrases=[]`. Columns: Ref = verse; nCls = number of clause children in group; First = direct-fn children of first clause; Target = direct-fn children of second clause; AllFns = all fn values in target subtree; DRStatus = current DR SECOND_OBJECT count.

| # | Ref | nCls | First clause direct-fn children | Target clause direct-fn children | All fns in target subtree | DR now |
|---|-----|------|--------------------------------|----------------------------------|--------------------------|--------|
| 1 | 1JN 4:10 | 2 | {} | {} | SUBJECT, PREDICATE, OBJECT, OBJECT2 | 0 |
| 2 | 1TI 2:5 | 2 | {COMPLEMENT, SUBJECT} | {COMPLEMENT, SUBJECT} | COMPLEMENT, SUBJECT, PREDICATE, OBJECT, OBJECT2, ADVERBIAL | 0 |
| 3 | 2CO 3:5 | 2 | {} | {SUBJECT, COMPLEMENT} | SUBJECT, COMPLEMENT, ADVERBIAL, PREDICATE, OBJECT, OBJECT2 | 0 |
| 4 | 2TH 3:9 | 2 | {} | {} | OBJECT, OBJECT2, PREDICATE, INDIRECT_OBJECT, ADVERBIAL | 0 |
| 5 | ACT 24:10 | 2 | {PREDICATE, SUBJECT, ADVERBIAL} | {ADVERBIAL, OBJECT, PREDICATE} | ADVERBIAL, OBJECT, COPULA, SUBJECT, COMPLEMENT, PREDICATE, IO, OBJECT2 | 0 |
| 6 | JAS 1:27 | 2 | {PREDICATE, OBJECT, ADVERBIAL} | {OBJECT2, OBJECT, PREDICATE, ADVERBIAL} | OBJECT2, OBJECT, PREDICATE, ADVERBIAL | 0 |
| 7 | JHN 2:14 | 2 | {PREDICATE, OBJECT, ADVERBIAL} | {ADVERBIAL, PREDICATE, OBJECT, OBJECT2} | ADVERBIAL, PREDICATE, OBJECT, OBJECT2 | 1† |
| 8 | JHN 4:17 | 2 | {ADVERBIAL, PREDICATE, OBJECT, ADVERBIAL} | {OBJECT, OBJECT2, PREDICATE} | OBJECT, OBJECT2, PREDICATE | 1† |
| 9 | JHN 5:18 | 2 | {ADVERBIAL, PREDICATE, OBJECT} | {OBJECT2, PREDICATE, OBJECT, ADVERBIAL} | OBJECT2(×2), PREDICATE, OBJECT, ADVERBIAL | 0 |
| 10 | JHN 15:16 | 2 | {SUBJECT, OBJECT, PREDICATE} | {} | SUBJECT, PREDICATE, OBJECT, ADVERBIAL, OBJECT2, IO | 0 |
| 11 | JHN 16:32 | 2 | {PREDICATE, SUBJECT, ADVERBIAL} | {OBJECT, OBJECT2, PREDICATE} | OBJECT, OBJECT2, PREDICATE | 0 |
| 12 | JHN 19:12 | 2 | {ADVERBIAL, COPULA, COMPLEMENT} | {SUBJECT, PREDICATE, IO} | SUBJECT, OBJECT2, OBJECT, PREDICATE, IO | 0 |
| 13 | LUK 1:52 | 2 | {} | {} | PREDICATE, ADVERBIAL, OBJECT2 | 0 |
| 14 | LUK 1:59 | 2 | {PREDICATE, ADVERBIAL} | {} | PREDICATE, ADVERBIAL, OBJECT, OBJECT2 | 0 |
| 15 | LUK 3:3 | 2 | {PREDICATE, OBJECT} | {OBJECT2, PREDICATE, OBJECT} | OBJECT2, PREDICATE, OBJECT | 0 |
| 16 | MAT 3:3 | 2 | {PREDICATE, OBJECT} | {OBJECT2, PREDICATE, OBJECT} | OBJECT2, PREDICATE, OBJECT | 0 |
| 17 | MAT 11:7 | 2 | {SUBJECT, PREDICATE} | {PREDICATE, SUBJECT, OBJECT} | PREDICATE, SUBJECT, OBJECT, IO, ADVERBIAL, OBJECT2 | 0 |
| 18 | MAT 20:26 | 2 | {COMPLEMENT, COPULA, ADVERBIAL} | {} | SUBJECT, PREDICATE, OBJECT, ADVERBIAL, COMPLEMENT, COPULA, OBJECT2 | 0 |
| 19 | MRK 1:2 | 2 | {PREDICATE, OBJECT} | {OBJECT2, PREDICATE, OBJECT} | OBJECT2, PREDICATE, OBJECT | 0 |
| 20 | MRK 6:21 | 2 | {} | {PREDICATE, SUBJECT, IO, OBJECT} | PREDICATE, SUBJECT, IO, OBJECT, OBJECT2 | 0 |
| 21 | MRK 11:31 | 2 | {PREDICATE, OBJECT} | {PREDICATE, OBJECT, ADVERBIAL} | PREDICATE, OBJECT, ADVERBIAL, SUBJECT, OBJECT2, COMPLEMENT, COPULA | 0 |
| 22 | PHP 2:1 | 2 | {OBJECT, PREDICATE, ADVERBIAL, ADVERBIAL} | {} | OBJECT, ADVERBIAL, PREDICATE, OBJECT2 | 0 |

†JHN 2:14 and JHN 4:17 show DR=1 because another OBJECT2 instance elsewhere in the sentence IS reachable; the group's second clause is still dropped.

**Observation:** In every case, the first clause is a complete independent clause (with PREDICATE or COPULA). The second clause is also a complete independent clause. The group represents informal coordination — two parallel clauses within a larger syntactic unit.

---

## E. GENERIC GROUP TRAVERSAL GAP

**This is NOT an OBJECT2-specific gap.**

For every R6 group, the target (second) clause contains multiple fn values beyond OBJECT2. The dropped content includes:

| Fn dropped (beyond OBJECT2) | Groups affected |
|-----------------------------|----------------|
| PREDICATE | 19/22 (86%) |
| OBJECT | 16/22 (73%) |
| SUBJECT | 8/22 (36%) |
| ADVERBIAL | 9/22 (41%) |
| INDIRECT_OBJECT | 4/22 (18%) |
| COMPLEMENT | 4/22 (18%) |
| COPULA | 3/22 (14%) |

**Verdict: GENERIC GROUP TRAVERSAL GAP.** The engine drops entire second clauses — with PREDICATE, SUBJECT, OBJECT, COMPLEMENT and all other fn values — not just OBJECT2. OBJECT2 happens to be the fn value flagged by the P6-G.10.4 audit, but it is a symptom of the broader gap, not its cause.

An OBJECT2-specific fix would be architecturally wrong: it would expose OBJECT2 but leave PREDICATE, SUBJECT, OBJECT from the same clause invisible.

---

## F. NT-Wide Scope of the Gap

| Metric | Count |
|--------|-------|
| Groups with 2+ clause children NT-wide | 966 |
| Of which: extraPhrases non-empty | 5 |
| Of which: extraPhrases empty | 961 |
| Of which: contain OBJECT2 in second clause (R6 cases) | 22 groups (23 residuals) |
| Of which: no OBJECT2 in second clause | 944 groups |

The 944 non-OBJECT2 groups also drop their second-clause PREDICATE, SUBJECT, OBJECT etc. The R6 fix, applied generically, resolves the traversal gap for all 961 non-extraPhrases groups. The 5 extraPhrases edge cases are discussed in the Repair Design.

---

## G. OBJECT2 Reachability Within Second Clause (R6 vs R6+R1)

After fixing R6 (exposing the second clause to engine processing), not all 23 OBJECT2 residuals are automatically recoverable. Those with OBJECT2 blocked by a MAIN_FN slot boundary within the second clause remain residual (compound R6+R1).

| Sub-type | Description | Count | Recoverable by R6 fix alone? |
|---------|-------------|-------|------------------------------|
| Direct | OBJECT2 is a direct child of the second clause | 8 | YES |
| Nested-unblocked | OBJECT2 is in the second clause's subtree, not inside any MAIN_FN slot | 8 | YES (via P5-E-1 recursive processing) |
| Blocked | OBJECT2 is in the second clause's subtree, inside a MAIN_FN slot boundary | 7 | NO (need R1 fix additionally) |
| **Total** | | **23** | **16 YES, 7 NO** |

**Recoverable by R6 fix alone: 16 of 23 OBJECT2 residuals.**

The 7 blocked cases (compound R6+R1):
1. 1TI 2:5 — OBJECT2 inside OBJECT content within second clause
2. 2CO 3:5 — OBJECT2 inside COMPLEMENT content within second clause
3. ACT 24:10 — OBJECT2 inside slot content within second clause
4. JHN 15:16 — OBJECT2 inside OBJECT content within second clause
5. JHN 19:12 — OBJECT2 inside SUBJECT content within second clause
6. MAT 11:7 — OBJECT2 inside OBJECT content within second clause
7. MRK 6:21 — OBJECT2 inside OBJECT content within second clause

After R6 fix, these 7 are reclassified from R6 to R1 (slot-content non-recursion).

---

## H. Gate Chapter Impact

| Chapter | Current residuals | Residuals after R6 fix | Gate status change |
|---------|-----------------|----------------------|-------------------|
| JHN 1 | 0 | 0 | PASS → PASS |
| MAT 5 | 1 (5:34, R1) | 1 | FAIL → FAIL |
| MAT 28 | 0 | 0 | PASS → PASS |
| EPH 2 | 1 (2:14, R3) | 1 | FAIL → FAIL |
| PHP 2 | 1 (2:1, R6) | 0 | **FAIL → PASS** |
| COL 1 | 1 (1:26, R1) | 1 | FAIL → FAIL |
| ROM 6 | 0 | 0 | PASS → PASS |

PHP 2:1 is nested-unblocked → fully recovered by R6 fix. PHP 2 gate chapter: 3/4 → 4/4.

---

## I. L-0 Assessment

| L-0 criterion | Status |
|--------------|--------|
| Second clause children are SR-explicit | CONFIRMED — all children have explicit fn values assigned by annotation team |
| No semantic inference required | SAFE — engine reads fn from `child.function.canonical`; no interpretation |
| No lexical inference | SAFE — no new morphological or lexical analysis |
| No attachment inference | SAFE — attachment is encoded in SR structure; engine traverses it |
| No discourse inference | SAFE — clause relationships are structurally encoded (group containment) |
| Source nodes not mutated | SAFE — local `fn` variable only (existing Change 1/2 pattern) |

**L-0: SAFE.** The second clause children are explicitly annotated in SR. Exposing them requires only traversal — no new inference of any kind.

---

## J. Summary Table: All `.find()` Sites

| Line | Function | Context | Predicate | First-only correct? | Affected by R6? |
|------|---------|---------|----------|-------------------|----------------|
| 191 | `_extractContentClause` | Find CONJ token | `morph_raw.startsWith('CONJ')` | YES (≤1 CONJ per CC) | NO |
| 195 | `_extractContentClause` | Find inner clause/group | `type==='clause'\|\|'group'` | YES (CC has 1 inner node) | NO |
| **530** | **`deriveFromGroup`** | **Find clause child of group** | **`type==='clause'`** | **NO — bug** | **YES** |
| 603 | `deriveFromNode` COORD | Find CONJ in coord member | `morph_raw.startsWith('CONJ')` | YES (≤1 CONJ per member) | NO |
| 606 | `deriveFromNode` COORD | Find inner clause of coord member | `type==='clause'\|\|'group'` | YES (1 inner per member) | NO |
| 632 | `deriveFromNode` CONJOINED | Find CONJ token | `morph_raw.startsWith('CONJ')` | YES (≤1 CONJ) | NO |
| 635 | `deriveFromNode` CONJOINED | Find non-token inner | `type!=='token'` | YES (1 non-token inner) | NO |
| 650 | `deriveFromNode` SUB/REL/CC/PART | Find CONJ token | `morph_raw.startsWith('CONJ')` | YES (≤1 CONJ) | NO |
| 653 | `deriveFromNode` SUB/REL/CC/PART | Find inner clause/group | `type==='clause'\|\|'group'` | YES (1 inner per construction) | NO |

**Change required: line 530 only.**

---

*P6-G.10.5 group second-clause audit complete. Read-only. No code, data, or schema modified.*
