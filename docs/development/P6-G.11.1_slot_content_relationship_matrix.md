# P6-G.11.1 — Slot-Content Relationship Matrix

**Date:** 2026-08-26
**Phase:** P6-G.11.1 — Read-Only Audit
**Companion to:** `P6-G.11.1_slot_content_audit.md`

This matrix crosses slot types × blocking patterns × intentionality classification × repair option coverage.

---

## Matrix 1: Slot Fn × Blocking Node Type × OBJECT2 Count

Rows = slot fn (blocking ancestor). Columns = node type/construction of the blocking slot node. Cell = invisible OBJECT2 count.

| Slot fn | clause (no cn) | clause/SUBORDINATE | clause/PARTICIPIAL | clause/NOMINALIZED | clause/CONTENT_CLAUSE | group | phrase.np/APPOSITION | phrase.np (other) | phrase.pp | Total |
|---------|----------------|-------------------|-------------------|-------------------|----------------------|-------|---------------------|------------------|-----------|-------|
| OBJECT | 49 | 6 | 4 | 4 | 4 | 10 | 3 | 3 | 0 | **83** |
| SUBJECT | 1 | 0 | 0 | 2 | 0 | 0 | 2 | 5 | 0 | **10** |
| COMPLEMENT | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 2 | 1 | **4** |
| INDIRECT_OBJECT | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | **2** |
| AUX | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | **1** |
| SECOND_OBJECT | 0 | 0 | 0 | 0 | 0 | 3† | 0 | 0 | 0 | **3** |
| NONE (no ancestor) | — | — | — | — | — | — | — | — | — | **9** |
| **Total** | **50** | **6** | **4** | **7** | **4** | **13** | **8** | **10** | **1** | **112** |

† SECOND_OBJECT|group: group fn=OBJECT2 is the slot node; inner OBJECT2 is nested within the group (JHN 2:14, JHN 4:17, LUK 18:19).

---

## Matrix 2: Blocking Pattern × Intentionality Classification

| Blocking pattern | Count | Classification | Sub-classification | Notes |
|-----------------|-------|---------------|-------------------|-------|
| OBJECT \| clause (no cn) | 49 | **B** — Generic omission | Clause-type slot | Architecturally equivalent to CONTENT_CLAUSE |
| OBJECT \| group | 10 | **B** — Generic omission | Group-type slot | Same engine gap as R6 second-clause drop |
| OBJECT \| clause/SUBORDINATE_CLAUSE | 6 | **B** — Generic omission | Clause-type slot | cn≠CONTENT_CLAUSE excludes from `_extractContentClause()` |
| OBJECT \| clause/CONTENT_CLAUSE | 4 | **B** — Generic omission (depth-2) | Depth-2 slot nesting | innerDR exists; OBJECT2 inside innerDR's own OBJECT slot |
| OBJECT \| clause/PARTICIPIAL_CLAUSE | 4 | **B** — Generic omission | Clause-type slot | Same as SUBORDINATE_CLAUSE |
| OBJECT \| clause/NOMINALIZED_CLAUSE | 4 | **B** — Generic omission | Clause-type slot | Same; nominalized clause = clause |
| SECOND_OBJECT \| group | 3 | **B** — Generic omission | Self-nested OBJECT2 | Group fn=OBJECT2; no group-content recursion |
| SUBJECT \| clause/NOMINALIZED_CLAUSE | 2 | **B** — Generic omission | Clause-type slot | SUBJECT slot is nominalized clause |
| SUBJECT \| clause (no cn) | 1 | **B** — Generic omission | Clause-type slot | Plain clause fn=SUBJECT |
| AUX \| clause/NOMINALIZED_CLAUSE | 1 | **B** — Generic omission | Clause-type slot | AUX slot is nominalized clause |
| OBJECT \| phrase.np/APPOSITION | 3 | **E** — Ambiguous | Phrase-type slot | NP apposition; display semantics unresolved |
| OBJECT \| phrase.np/ARTICULAR_NP | 1 | **E** — Ambiguous | Phrase-type slot | Articular NP; phrase-level internal structure |
| OBJECT \| phrase.np/NP_COMPLEX | 1 | **E** — Ambiguous | Phrase-type slot | Complex NP |
| OBJECT \| phrase.np/GENITIVE_MOD | 1 | **E** — Ambiguous | Phrase-type slot | Genitive modifier phrase |
| SUBJECT \| phrase.np/APPOSITION | 2 | **E** — Ambiguous | Phrase-type slot | NP apposition within SUBJECT |
| SUBJECT \| phrase.np/NP_COMPLEX | 2 | **E** — Ambiguous | Phrase-type slot | Complex NP within SUBJECT |
| SUBJECT \| phrase.np/ADV_MOD | 1 | **E** — Ambiguous | Phrase-type slot | ADV_MOD phrase within SUBJECT |
| SUBJECT \| phrase.np/ARTICULAR_NP | 1 | **E** — Ambiguous | Phrase-type slot | Articular NP within SUBJECT |
| SUBJECT \| phrase.np/ADJ_MOD | 1 | **E** — Ambiguous | Phrase-type slot | ADJ_MOD phrase within SUBJECT |
| COMPLEMENT \| phrase.np/CLAUSE_AS_NP | 2 | **E** — Ambiguous | Phrase-type slot | Clause-as-NP; structurally between clause and phrase |
| COMPLEMENT \| phrase.np/APPOSITION | 1 | **E** — Ambiguous | Phrase-type slot | Apposition within COMPLEMENT |
| COMPLEMENT \| phrase.pp/PREP_PHRASE | 1 | **E** — Ambiguous | Phrase-type slot | PP as COMPLEMENT |
| INDIRECT_OBJECT \| phrase.np/APPOSITION | 2 | **E** — Ambiguous | Phrase-type slot | Apposition within IO |
| NONE (structural gap) | 9 | **N/A** | R6/R7 structural gap | Not a slot-content issue |

**Classification summary:**

| Class | Label | Count | % |
|-------|-------|-------|---|
| B | Generic omission | 83 | 74.1% |
| E | Ambiguous | 20 | 17.9% |
| N/A | Structural gap | 9 | 8.0% |

---

## Matrix 3: Repair Option Coverage per Blocking Pattern

Which repair options address each blocking pattern:

| Blocking pattern | Count | Opt A (clause cn) | Opt B (group) | Opt C (A+B) | Opt D (full) | Opt E (none) |
|-----------------|-------|-------------------|---------------|-------------|--------------|--------------|
| OBJECT \| clause (no cn) | 49 | ✓ | — | ✓ | ✓ | — |
| OBJECT \| group | 10 | — | ✓ | ✓ | ✓ | — |
| OBJECT \| clause/SUBORDINATE_CLAUSE | 6 | ✓ | — | ✓ | ✓ | — |
| OBJECT \| clause/CONTENT_CLAUSE (depth-2) | 4 | — | — | — | — | — |
| OBJECT \| clause/PARTICIPIAL_CLAUSE | 4 | ✓ | — | ✓ | ✓ | — |
| OBJECT \| clause/NOMINALIZED_CLAUSE | 4 | ✓ | — | ✓ | ✓ | — |
| SECOND_OBJECT \| group | 3 | — | ✓ | ✓ | ✓ | — |
| SUBJECT \| clause/NOMINALIZED_CLAUSE | 2 | ✓ | — | ✓ | ✓ | — |
| SUBJECT \| clause (no cn) | 1 | ✓ | — | ✓ | ✓ | — |
| AUX \| clause/NOMINALIZED_CLAUSE | 1 | ✓ | — | ✓ | ✓ | — |
| OBJECT \| phrase.np/APPOSITION | 3 | — | — | — | ✓ | — |
| OBJECT \| phrase.np (other) | 3 | — | — | — | ✓ | — |
| SUBJECT \| phrase.np (all) | 7 | — | — | — | ✓ | — |
| COMPLEMENT \| phrase.np (all) | 3 | — | — | — | ✓ | — |
| COMPLEMENT \| phrase.pp | 1 | — | — | — | ✓ | — |
| INDIRECT_OBJECT \| phrase.np/APPOSITION | 2 | — | — | — | ✓ | — |
| NONE (structural gap) | 9 | — | — | — | — | — |
| **Total addressed** | | **~71** | **~13** | **~80** | **~103** | **0** |

**NONE structural gap:** Not addressable by any of Options A–D. Requires separate structural repair (R6 root-group extension for 1JN 4:10; R7 ADVERBIAL-path extension for 8 others).

**CONTENT_CLAUSE depth-2:** Not addressable by Options A–C. Would require recursive innerDR traversal (Option D does not specifically address this either, as it's a depth-2 issue, not a phrase-type issue).

---

## Matrix 4: Slot Fn × NT-Wide Visibility Coverage

Full NT-wide MAIN_FN visibility (includes all causes of invisibility, not just slot-content gap):

| fn | SR NT-wide | DR NT-wide | Invisible | Coverage |
|----|-----------|-----------|-----------|---------|
| SUBJECT | 11,113 | 7,753 | 3,360 | 69.8% |
| PREDICATE | 25,102 | 15,454 | 9,648 | 61.6% |
| OBJECT | 13,687 | 8,878 | 4,809 | 64.9% |
| COMPLEMENT | 3,602 | 2,213 | 1,389 | 61.4% |
| INDIRECT_OBJECT | 2,660 | 1,885 | 775 | 70.9% |
| SECOND_OBJECT | 311 | 199 | 112 | 64.0% |
| AUX | 1,071 | 539 | 532 | 50.3% |
| COPULA | 2,587 | 1,524 | 1,063 | 58.9% |

AUX has the lowest coverage (50.3%). This reflects the structural position of AUX — auxiliary verbs frequently appear inside subordinate clauses that are slot content.

---

## Matrix 5: Existing Special Structure vs Slot-Content Gap

Which existing mechanisms already handle specific cases, and what remains:

| Mechanism | Input condition | Output | OBJECT2 cases already handled | Cases remaining |
|-----------|----------------|--------|------------------------------|----------------|
| `_extractContentClause()` | `node.cn === 'CONTENT_CLAUSE'` | `slot.contentClause.innerDR` | CONTENT_CLAUSE slot, OBJECT2 as direct slot in innerDR | 4 (depth-2) |
| `_extractEmbeddedRelClauses()` | RELATIVE_CLAUSE fn children of slot node | `slot.embeddedRelClauses[].dr` | Relative clauses only | N/A for OBJECT2 in slots |
| `extractSlotModifiers()` | GENITIVE_MOD, ADJ_MOD, ADV_MOD, APPOSITION modifier children | `slot.modifiers[]` | Modifier nodes only (display, not countSO) | All OBJECT2 cases |
| `countSO()` traversal | Recursive: coordClauses, adverbialClauses, innerDR, embeddedRelClauses.dr | SECOND_OBJECT count | Only what DR already contains | All 112 invisible |
| R6 fix (P6-G.10.6) | Groups with 2+ clause children | coordClauses | 7 cases recovered | 16 R6 residuals |

---

## Matrix 6: Gate Chapter Status × Repair Option

| Gate chapter | Current status | Opt A | Opt B | Opt C | Opt D |
|-------------|---------------|-------|-------|-------|-------|
| JHN 1 | PASS (2/2) | PASS | PASS | PASS | PASS |
| MAT 5 | FAIL (MAT 5:34: OBJECT\|clause) | **PASS** | FAIL | **PASS** | PASS |
| MAT 28 | PASS (1/1) | PASS | PASS | PASS | PASS |
| ROM 6 | PASS (5/5) | PASS | PASS | PASS | PASS |
| PHP 2 | PASS (4/4) | PASS | PASS | PASS | PASS |
| EPH 2 | FAIL (EPH 2:14: COMPLEMENT\|phrase.np/APPOSITION) | FAIL | FAIL | FAIL | depends |
| COL 1 | FAIL (COL 1:26: OBJECT\|clause/SUBORDINATE_CLAUSE) | **PASS** | FAIL | **PASS** | PASS |

Option A or C would resolve MAT 5 and COL 1. EPH 2:14 (Class E, COMPLEMENT/APPOSITION) is not resolved by Options A–C. Under Option D, EPH 2:14 depends on whether phrase.np/APPOSITION slots are included.

---

*Relationship matrix complete. READ-ONLY. No code changes made.*
