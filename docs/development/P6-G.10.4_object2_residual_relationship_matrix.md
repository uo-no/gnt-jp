# P6-G.10.4 — OBJECT2 Residual Relationship Matrix

**Date:** 2026-08-26  
**Phase:** P6-G.10.4 — Read-Only Residual Audit  
**Constraint:** READ-ONLY. No code, data, SR, DR schema, or CSS changes.

---

## A. R-Category × Structural Properties

| R-cat | Count | Root cause | Engine location | Fix complexity |
|-------|-------|-----------|----------------|---------------|
| R1 | 74 | OBJECT slot content non-recursion | `deriveClauseCore()` / `deriveFromGroup()` post-slot creation | HIGH |
| R2 | 8 | SUBJECT slot content non-recursion | Same | HIGH |
| R3 | 2 | COMPLEMENT slot content non-recursion | Same | HIGH |
| R4 | 2 | INDIRECT_OBJECT slot content non-recursion | Same | HIGH |
| R5 | 1 | AUX slot content non-recursion | Same | HIGH |
| R6 | 23 | Group second-clause child dropped | `deriveFromGroup()` `.find()` → single clause | MODERATE |
| R7a | 7 | Inside ADVERBIAL subtree / CLAUSE_AS_NP | No DR derivation path reaches this depth | HIGH |
| R7b | 1 | SR double-annotation (group + inner token) | Engine correctly creates 1 slot for group | N/A — SR data question |
| R7c | 1 | Deeply nested SUBORDINATE_CLAUSE in group tree | Not reachable via clauseChild or extraPhrases | HIGH |
| **Total** | **119** | | | |

---

## B. Visual Grammar Implications (A–D)

**Scale:**
- **A** — No visual gap: the relationship is correctly represented (or the absence is grammatically acceptable)
- **B** — Minor gap: the OBJECT2 is structurally secondary; core sentence structure is correctly shown
- **C** — Noticeable gap: the V-O-O2 / double-accusative structure is partially visible but the secondary complement is absent
- **D** — Significant misrepresentation: entire clause branch is missing from diagram

| R-cat | Visual implication | Reasoning |
|-------|------------------|-----------|
| R1 | **C** | The OBJECT IS shown in the diagram. The OBJECT2 nested within the OBJECT's content is a secondary complement (often a predicate complement or second accusative). Its absence means the double-accusative relationship is invisible to the reader. Core verb structure is readable but the grammatical nuance is lost. |
| R2 | **B** | OBJECT2 inside SUBJECT content is an unusual structural position; in most cases the SUBJECT itself is correctly shown and the nested OBJECT2 represents an embedded relationship (e.g., a relative clause or appositive within the subject). Missing but less structurally prominent. |
| R3 | **C** | OBJECT2 inside COMPLEMENT follows the same gap as R1 but within a predicate nominal/copula context. EPH 2:14 is the canonical example: the participial predicate's double-accusative is invisible. |
| R4 | **B** | OBJECT2 inside INDIRECT_OBJECT content — structurally similar to R2. The IO is shown; the nested OBJECT2 is a secondary relationship within the dative complement. |
| R5 | **B** | 1 case (JHN 5:11). OBJECT2 inside AUX content — AUX is a peripheral slot; impact is minimal. |
| R6 | **D** | Entire second clause of a group is absent from the diagram. The engine renders only the first clause; the second clause's content (including its OBJECT2) does not appear at all. This is the most severe gap: the user cannot see the second clause exists. |
| R7a | **C** | OBJECT2 inside ADVERBIAL: the ADVERBIAL itself is shown (as a PP diagonal or adverbial clause bracket), but its inner clause's double-accusative relationship is absent. |
| R7b | **A** | Engine correctly creates the SECOND_OBJECT slot for the group-level annotation. Inner token's OBJECT2 is a redundant SR annotation; no visual gap from user perspective. |
| R7c | **C** | 1 case (1PE 2:16). Nested clause relationship missed. |

---

## C. L-0 Safety Assessment

| R-cat | L-0 status | Evidence |
|-------|-----------|---------|
| R1–R5 | SAFE — no violation | Engine silently drops; creates no incorrect slot. SR source unchanged. |
| R6 | SAFE — no violation | Dropped clause creates no incorrect output. Second clause is simply absent. |
| R7a | SAFE — no violation | ADVERBIAL node itself is correctly routed; missing inner OBJECT2 is silent omission. |
| R7b | SAFE — no violation | Engine correctly picks group-level fn=OBJECT2. Inner token double-annotation is SR data question. |
| R7c | SAFE — no violation | Silent omission; no incorrect inference. |

**Verdict:** All 119 residuals are L-0 safe. Engine produces no incorrect grammatical assertions. Gaps are omissions, not errors.

---

## D. Intentionality Assessment

| R-cat | Classification | Evidence |
|-------|--------------|---------|
| R1–R5 | **Accidental omission / architectural gap** | Engine was designed for top-level clause-child OBJECT2 cases only. No deliberate DR abstraction excludes slot-content OBJECT2. |
| R6 | **Accidental omission** | `.find()` vs. loop is an implementation choice that silently drops extra clause siblings. No design doc specifies this behavior as intentional. |
| R7a | **Architectural gap** | ADVERBIAL phrase processing was designed to capture the PP/adverbial form, not to recursively derive sub-DR for all ADVERBIAL content. Intentional at the ADVERBIAL level, but has the side effect of missing OBJECT2 inside ADVERBIAL subtrees. |
| R7b | **SR data question** | Group-level fn=OBJECT2 is the primary annotation; inner token fn=OBJECT2 is secondary. Whether this is intentional dual annotation or SR redundancy is not determinable from engine alone. |
| R7c | **Architectural gap** | Same as R7a — depth of traversal was never designed to reach deeply nested SUBORDINATE_CLAUSE grandchildren. |

No residual category is an intentional DR abstraction. All represent gaps between SR annotation depth and engine traversal depth.

---

## E. Priority Scoring

Priority is assessed by: (a) number of cases, (b) visual severity (D > C > B > A), (c) gate chapter impact, (d) fix complexity.

| R-cat | Cases | Visual | Gate impact | Fix complexity | Priority |
|-------|-------|--------|-------------|---------------|---------|
| R6 | 23 | D | PHP 2:1 (gate fail) | MODERATE | **P1** |
| R1 | 74 | C | MAT 5:34, COL 1:26 (gate fail) | HIGH | **P2** |
| R3 | 2 | C | EPH 2:14 (gate fail) | HIGH | **P2** |
| R7a | 7 | C | none | HIGH | **P3** |
| R7c | 1 | C | none | HIGH | **P3** |
| R2 | 8 | B | none | HIGH | **P3** |
| R4 | 2 | B | none | HIGH | **P3** |
| R5 | 1 | B | none | HIGH | **P4** |
| R7b | 1 | A | none | N/A | **P4** |

**R6 is uniquely P1** because it drops entire clause branches (visual severity D) and has a known gate chapter failure (PHP 2:1), with MODERATE fix complexity (change `.find()` to a loop in `deriveFromGroup()`).

**R1 is P2** because it represents the largest count (74) and accounts for two gate fails (MAT 5:34, COL 1:26), but the fix requires recursive slot-content parsing — a significant architectural change.

**R3 (EPH 2:14) is P2** by gate fail alone, even though only 2 cases. The fix for R3 is the same mechanism as R1 (recursive slot-content parsing).

**R2, R4, R5, R7 are P3–P4** — B-severity gaps or very low case counts.

---

## F. Gate Chapter Impact Summary

| Gate chapter | Residual count | Failing verses | R-cat |
|-------------|---------------|----------------|-------|
| JHN 1 | 0 | none | — |
| MAT 5 | 1 | MAT 5:34 | R1 |
| MAT 28 | 0 | none | — |
| EPH 2 | 1 | EPH 2:14 | R3 |
| PHP 2 | 1 | PHP 2:1 | R6 |
| COL 1 | 1 | COL 1:26 | R1 |
| ROM 6 | 0 | none | — |

Gate chapters passing: JHN 1, MAT 28, ROM 6 — all passing with zero residuals.  
Gate chapters with residual: MAT 5, EPH 2, PHP 2, COL 1.

---

## G. Cross-Function Structural Symmetry

The slot-content non-recursion gap (R1–R5) is not OBJECT2-specific. The same traversal boundary applies to any fn value nested inside a slot subtree. The following analysis confirms symmetry:

If a node with `fn=X` appears as a descendant of a node with `fn=OBJECT`, the engine creates an OBJECT slot for the outer node and never recurses further. This affects OBJECT2 (this audit) but would equally affect any fn value (e.g., a nested COMPLEMENT inside an OBJECT, a nested PREDICATE inside a SUBJECT, etc.).

The engine's current design treats slot creation as a terminal operation: once a node is absorbed as a slot, its subtree is not further parsed for additional slots. This is the architectural property that creates R1–R5.

---

## H. Type Distribution of Residual Nodes

| Node type | Count | % |
|---------|-------|---|
| token | 59 | 49.6% |
| phrase.np | 39 | 32.8% |
| phrase.adjp | 3 | 2.5% |
| phrase.pp | 1 | 0.8% |
| group | 9 | 7.6% |
| clause | 8 | 6.7% |

Tokens (59) are the most common — simple lexical items that the SR annotator tagged fn=OBJECT2 but which are inside slot subtrees. Phrases (phrase.np) are the second most common. The 8 clauses represent embedded subclauses (e.g., CONTENT_CLAUSE) with fn=OBJECT2 that function as clausal second objects (entire embedded propositions as second arguments).

---

*P6-G.10.4 relationship matrix complete. Read-only. No code, data, or schema modified.*
