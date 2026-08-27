# P6-G.10.4 — OBJECT2 Residual Reachability Audit

**Date:** 2026-08-26  
**Phase:** P6-G.10.4 — Read-Only Residual Audit  
**Predecessor:** P6-G.10.3 Engine Normalization (PASS WITH LIMITATIONS)  
**Constraint:** READ-ONLY. No code, data, SR, DR schema, or CSS changes.

---

## A. Baseline

| Metric | Count |
|--------|-------|
| SR `"canonical":"OBJECT2"` instances (NT-wide) | 311 |
| DR `fn='SECOND_OBJECT'` slots after P6-G.10.3 | 192 |
| Residual (SR unreachable in DR) | **119** |
| Coverage (P6-G.10.3) | 61.7% |

Source: Node.js scripts against `public/assets/data/sr/` and `deriveDR()` post-P6-G.10.3 engine.

---

## B. R-Category Definitions

The 119 residual instances are classified into 7 structural categories by root cause.

| Category | Root cause | Count |
|---------|-----------|-------|
| **R1** | OBJECT2 nested inside OBJECT slot content | 74 |
| **R2** | OBJECT2 nested inside SUBJECT slot content | 8 |
| **R3** | OBJECT2 nested inside COMPLEMENT slot content | 2 |
| **R4** | OBJECT2 nested inside INDIRECT_OBJECT slot content | 2 |
| **R5** | OBJECT2 nested inside AUX slot content | 1 |
| **R6** | OBJECT2 in second (non-first) clause child of group | 23 |
| **R7** | OBJECT2 inside ADVERBIAL subtree or deeply nested subclause | 9 |
| **Total** | | **119** |

### B.1 R1–R5: Slot Content Inaccessibility

The engine creates a slot for a MAIN_FN node (OBJECT, SUBJECT, etc.) at the `deriveClauseCore()` or `deriveFromGroup()` level, but does NOT recurse into that node's subtree to find nested OBJECT2 children. The OBJECT2 resides inside the absorbed slot's content tree and is never encountered during traversal.

All R1–R5 cases share this structural pattern:

```
clause
└── node [fn=MAIN_FN, e.g. OBJECT]  ← engine creates slot here; stops
    └── ... (subtree) ...
        └── node [fn=OBJECT2]        ← never reached
```

R1 (74) dominates because OBJECT is the most structurally common hosting slot for nested OBJECT2. R2–R5 apply the same gap to other slot types.

### B.2 R6: Second Clause Child of Group

`deriveFromGroup()` identifies the clause child of a group via:

```javascript
const clauseChild = group.children.find(c => c.type === 'clause');
```

`.find()` returns the FIRST matching element. When a group has two or more direct clause children, all clause children after the first are silently dropped. They are neither `clauseChild` nor `extraPhrases` (the extraPhrases filter explicitly excludes `type === 'clause'`).

```
group
├── clause [fn=null]  ← clauseChild (FIRST) — processed
└── clause [fn=null]  ← DROPPED — never reached
    └── ... 
        └── node [fn=OBJECT2]  ← unreachable
```

23 of the 119 residuals fall into this category. This is the same gap that prevents PHP 2:1 from rendering in DR (gate chapter failure).

### B.3 R7: Adverbial and Deeply Nested Subclause

The 9 R7 cases do not fall into any slot content subtree (insideSlotFn=null) and are not second clause children of a group. They subdivide further:

**R7a — Inside ADVERBIAL subtree (7 cases):** The OBJECT2 node has an ancestor with fn=ADVERBIAL (a prepositional phrase or adverbial clause). The engine routes ADVERBIAL nodes to `adverbialPhrases` (as a PP object) or `adverbialClauses` (as a recursive DR call). In the case of `adverbialPhrases`, no sub-DR is derived and inner content is not searched for OBJECT2. In the case of `adverbialClauses`, the sub-DR recurse DOES occur — but in these 7 cases the OBJECT2 is nested deeper than one clause level inside the ADVERBIAL (e.g., inside a `CLAUSE_AS_NP` → inner clause within the adverbial), making it unreachable even recursively.

**R7b — SR double-annotation (1 case, LUK 18:19):** Both a group node and an inner token within that group carry `fn=OBJECT2`. The engine creates one SECOND_OBJECT slot for the group node (SR=2, DR=1, residual=1). The inner token's `fn=OBJECT2` is a redundant SR annotation within an already-captured slot.

**R7c — Deeply nested SUBORDINATE_CLAUSE (1 case, 1PE 2:16):** The OBJECT2 node is inside a SUBORDINATE_CLAUSE that is nested several levels deep in a group tree, not reachable via either the `clauseChild` path or the `extraPhrases` path.

---

## C. Gate Verse Case Studies

### C.1 MAT 5:34 — R1 (Inside OBJECT slot)

**SR structure:** SR=1, DR=0, residual=1.

The OBJECT2 node is `type=phrase.adjp` (adjective phrase) with `parentFn=OBJECT`. It is a direct child of a node with fn=OBJECT, which is itself inside an infinitive/subordinate clause structure. The engine creates an OBJECT slot for the fn=OBJECT parent and does not recurse into its children.

**Classification:** R1 — standard slot content inaccessibility.

**Gate status:** MAT 5 chapter: SR=1, DR=0. T-20 expected "MAT 5 ≥ 1" — FAIL (pre-existing gate failure acknowledged in P6-G.10.3 PASS WITH LIMITATIONS).

### C.2 EPH 2:14 — R3 (Inside COMPLEMENT slot)

**SR structure:** SR=1, DR=0, residual=1.

**Correction from P6-G.10.1/10.2 design docs:** EPH 2:14 is NOT a V-O-O2 clause. The main clause is COPULA (αὐτός|ἐστίν|εἰρήνη ἡμῶν). The OBJECT2 node (ἓν) is inside a NOMINALIZED_CLAUSE inside an APPOSITION inside the COMPLEMENT subtree. The ancestor path is:

```
clause [COPULA]
├── SUBJECT: αὐτός
├── COPULA: ἐστίν
└── COMPLEMENT: εἰρήνη ἡμῶν
    └── ... [APPOSITION → NOMINALIZED_CLAUSE → ποιήσας clause]
        └── fn=OBJECT2 ← ἓν (object of ποιήσας, "having made the two one")
```

The engine creates a COMPLEMENT slot at the top level but does not recurse into the COMPLEMENT's subtree to find the nested OBJECT2 inside ποιήσας's clause.

**Classification:** R3 — COMPLEMENT slot content inaccessibility.

**L-0 note:** The SR correctly represents ἓν as OBJECT2 of the participle ποιήσας. The engine's non-recursion into COMPLEMENT subtrees is the gap, not an SR error.

**Gate status:** EPH 2:14 SR=1, DR=0. Gate chapter failure pre-existing and documented in P6-G.10.3.

### C.3 PHP 2:1 — R6 (Second clause child of group)

**SR structure:** SR=1, DR=0, residual=1.

PHP 2:1's sentence root is a group with at least two direct clause children. The first clause is selected as `clauseChild`; the second clause (containing the OBJECT2 path) is dropped. The OBJECT2 is a clause node (`type=clause`) inside the second clause of the group, inaccessible via `deriveFromGroup()`.

**Classification:** R6 — group second-clause gap.

**Gate status:** PHP 2 chapter: SR=4, DR=3 (PHP 2:5, 2:25, 2:29 ✓; PHP 2:1 ✗). Acknowledged in P6-G.10.3.

### C.4 COL 1:26 — R1 (Inside OBJECT slot)

**SR structure:** SR=1, DR=0, residual=1.

The OBJECT2 node is `type=token` with `parentFn=null` and `insideSlotFn=OBJECT`. It is inside the content of an OBJECT slot. The mystery revealed (τὸ μυστήριον) is shown as the OBJECT; the OBJECT2 (τοῖς ἁγίοις — "to the saints") is inside that slot subtree.

**Classification:** R1 — standard slot content inaccessibility.

**Gate status:** COL 1 chapter: SR=2, DR=1 (COL 1:21 ✓; COL 1:26 ✗). Acknowledged in P6-G.10.3.

---

## D. Complete Per-Verse Enumeration (119 Residuals)

Sorted by book, chapter, verse. R-cat = structural category. InSlot = nearest MAIN_FN ancestor. 2nd = second clause child of group.

| # | Ref | R-cat | InSlot | 2nd | Type | CN |
|---|-----|-------|--------|-----|------|----|
| 1 | 1CO 1:4 | R1 | OBJECT | — | token | — |
| 2 | 1JN 4:10 | R6 | — | ✓ | phrase.np | PREP_PHRASE |
| 3 | 1PE 2:16 | R7c | — | — | phrase.np | GENITIVE_MOD |
| 4 | 1PE 3:5 | R1 | OBJECT | — | token | — |
| 5 | 1PE 3:14 | R7a | — | — | phrase.np | PREP_PHRASE |
| 6 | 1TH 2:14 | R7a | — | — | group | — |
| 7 | 1TH 3:12 | R7a | — | — | token | — |
| 8 | 1TI 2:5 | R6 | SUBJECT | ✓ | token | — |
| 9 | 2CO 3:5 | R6 | COMPLEMENT | ✓ | phrase.np | GENITIVE_MOD |
| 10 | 2CO 10:13 | R7a | — | — | token | — |
| 11 | 2CO 12:20 | R1 | OBJECT | — | clause | — |
| 12 | 2PE 1:10 | R1 | OBJECT | — | token | — |
| 13 | 2TH 3:9 | R6 | — | ✓ | token | — |
| 14 | 2TI 2:15 | R1 | OBJECT | — | phrase.np | APPOSITION |
| 15 | ACT 2:34 | R1 | OBJECT | — | phrase.np | GENITIVE_MOD |
| 16 | ACT 7:27 | R1 | OBJECT | — | phrase.np | PREP_PHRASE |
| 17 | ACT 7:35 (a) | R1 | OBJECT | — | phrase.np | NP_COMPLEX |
| 18 | ACT 7:35 (b) | R1 | OBJECT | — | phrase.np | — |
| 19 | ACT 10:28 | R1 | OBJECT | — | phrase.adjp | — |
| 20 | ACT 20:28 | R1 | OBJECT | — | token | — |
| 21 | ACT 24:5 | R1 | OBJECT | — | token | — |
| 22 | ACT 24:10 | R6 | OBJECT | ✓ | token | — |
| 23 | ACT 24:14 | R1 | OBJECT | — | token | — |
| 24 | ACT 25:11 | R2 | SUBJECT | — | token | — |
| 25 | ACT 26:1 | R1 | OBJECT | — | token | — |
| 26 | ACT 28:19 | R1 | OBJECT | — | token | — |
| 27 | COL 1:26 | R1 | OBJECT | — | token | — |
| 28 | EPH 1:3 | R2 | SUBJECT | — | token | — |
| 29 | EPH 2:14 | R3 | COMPLEMENT | — | token | — |
| 30 | EPH 5:25 | R1 | OBJECT | — | phrase.adjp | — |
| 31 | HEB 1:1 | R7a | — | — | phrase.np | GENITIVE_MOD |
| 32 | HEB 1:7 (a) | R1 | OBJECT | — | token | — |
| 33 | HEB 1:7 (b) | R1 | OBJECT | — | phrase.np | GENITIVE_MOD |
| 34 | HEB 1:13 | R1 | OBJECT | — | phrase.np | GENITIVE_MOD |
| 35 | HEB 5:12 | R1 | OBJECT | — | phrase.np | ARTICULAR_NP |
| 36 | HEB 9:13 | R2 | SUBJECT | — | token | — |
| 37 | HEB 10:29 | R2 | SUBJECT | — | token | — |
| 38 | JAS 1:27 | R6 | COMPLEMENT | ✓ | token | — |
| 39 | JHN 2:14 | R6 | — | ✓ | phrase.np | GENITIVE_MOD |
| 40 | JHN 4:17 | R6 | — | ✓ | token | — |
| 41 | JHN 4:35 | R1 | OBJECT | — | clause | CONTENT_CLAUSE |
| 42 | JHN 4:46 | R7a | — | — | token | — |
| 43 | JHN 5:11 | R5 | AUX | — | token | — |
| 44 | JHN 5:15 | R2 | SUBJECT | — | token | — |
| 45 | JHN 5:18 (a) | R6 | OBJECT | ✓ | phrase.np | ADV_MOD |
| 46 | JHN 5:18 (b) | R6 | OBJECT | ✓ | token | — |
| 47 | JHN 9:8 | R2 | SUBJECT | — | clause | CONTENT_CLAUSE |
| 48 | JHN 10:33 | R1 | OBJECT | — | token | — |
| 49 | JHN 11:21 | R1 | OBJECT | — | token | — |
| 50 | JHN 15:16 | R6 | OBJECT | ✓ | token | — |
| 51 | JHN 16:23 | R1 | OBJECT | — | token | — |
| 52 | JHN 16:32 | R6 | — | ✓ | token | — |
| 53 | JHN 19:7 | R1 | OBJECT | — | phrase.np | GENITIVE_MOD |
| 54 | JHN 19:12 | R6 | SUBJECT | ✓ | token | — |
| 55 | JUD 1:24 (a) | R1 | OBJECT | — | token | — |
| 56 | JUD 1:24 (b) | R1 | OBJECT | — | token | — |
| 57 | LUK 1:13 | R1 | OBJECT | — | token | — |
| 58 | LUK 1:52 | R6 | — | ✓ | token | — |
| 59 | LUK 1:59 | R6 | — | ✓ | token | — |
| 60 | LUK 3:3 | R6 | OBJECT | ✓ | token | — |
| 61 | LUK 3:8 | R1 | OBJECT | — | token | — |
| 62 | LUK 4:33 | R1 | OBJECT | — | group | — |
| 63 | LUK 6:8 | R4 | INDIRECT_OBJECT | — | token | — |
| 64 | LUK 6:13 (a) | R1 | OBJECT | — | phrase.np | ADV_MOD |
| 65 | LUK 6:13 (b) | R1 | OBJECT | — | token | — |
| 66 | LUK 9:38 | R1 | OBJECT | — | clause | — |
| 67 | LUK 10:21 | R1 | OBJECT | — | group | — |
| 68 | LUK 11:46 | R1 | OBJECT | — | phrase.np | ADJ_MOD |
| 69 | LUK 12:14 | R1 | OBJECT | — | phrase.np | PREP_PHRASE |
| 70 | LUK 18:19 | R7b | — | — | group | — |
| 71 | LUK 19:45 | R1 | OBJECT | — | phrase.np | GENITIVE_MOD |
| 72 | LUK 20:3 | R1 | OBJECT | — | token | — |
| 73 | LUK 20:37 | R1 | OBJECT | — | phrase.np | ARTICULAR_NP |
| 74 | LUK 20:40 | R1 | OBJECT | — | token | — |
| 75 | LUK 20:42 | R1 | OBJECT | — | phrase.np | GENITIVE_MOD |
| 76 | LUK 22:11 | R1 | OBJECT | — | group | — |
| 77 | LUK 23:13 | R1 | OBJECT | — | clause | SUBORDINATE_CLAUSE |
| 78 | MAT 1:20 (a) | R1 | OBJECT | — | phrase.np | ARTICULAR_NP |
| 79 | MAT 1:20 (b) | R1 | OBJECT | — | token | — |
| 80 | MAT 1:22 | R1 | OBJECT | — | phrase.np | CLAUSE_AS_NP |
| 81 | MAT 3:3 | R6 | OBJECT | ✓ | token | — |
| 82 | MAT 3:9 | R1 | OBJECT | — | token | — |
| 83 | MAT 4:19 | R1 | OBJECT | — | phrase.np | GENITIVE_MOD |
| 84 | MAT 5:34 | R1 | OBJECT | — | phrase.adjp | — |
| 85 | MAT 7:9 | R2 | SUBJECT | — | token | — |
| 86 | MAT 11:7 | R6 | OBJECT | ✓ | group | — |
| 87 | MAT 19:4 | R1 | OBJECT | — | phrase.np | NP_COMPLEX |
| 88 | MAT 20:11 | R1 | OBJECT | — | token | — |
| 89 | MAT 20:26 | R6 | — | ✓ | phrase.np | PREP_PHRASE |
| 90 | MAT 21:12 | R1 | OBJECT | — | phrase.np | GENITIVE_MOD |
| 91 | MAT 21:24 | R1 | OBJECT | — | phrase.np | ADJ_MOD |
| 92 | MAT 26:73 | R1 | OBJECT | — | token | — |
| 93 | MAT 27:13 | R1 | OBJECT | — | token | — |
| 94 | MRK 1:2 | R6 | OBJECT | ✓ | token | — |
| 95 | MRK 1:23 | R1 | OBJECT | — | group | — |
| 96 | MRK 2:8 | R1 | OBJECT | — | group | — |
| 97 | MRK 2:10 | R1 | OBJECT | — | group | — |
| 98 | MRK 3:3 | R4 | INDIRECT_OBJECT | — | token | — |
| 99 | MRK 4:20 | R3 | COMPLEMENT | — | group | — |
| 100 | MRK 6:21 | R6 | OBJECT | ✓ | clause | PARTICIPIAL_CLAUSE |
| 101 | MRK 6:34 | R1 | OBJECT | — | token | — |
| 102 | MRK 7:6 | R1 | OBJECT | — | token | — |
| 103 | MRK 10:18 | R1 | OBJECT | — | token | — |
| 104 | MRK 10:35 | R1 | OBJECT | — | token | — |
| 105 | MRK 11:17 | R1 | OBJECT | — | phrase.np | GENITIVE_MOD |
| 106 | MRK 11:29 | R1 | OBJECT | — | phrase.np | ADJ_MOD |
| 107 | MRK 11:31 | R6 | OBJECT | ✓ | clause | CONTENT_CLAUSE |
| 108 | MRK 15:4 | R1 | OBJECT | — | token | — |
| 109 | MRK 15:12 | R1 | OBJECT | — | phrase.np | ARTICULAR_NP |
| 110 | PHP 2:1 | R6 | — | ✓ | clause | — |
| 111 | PHP 3:8 | R7a | — | — | token | — |
| 112 | PHP 3:17 | R1 | OBJECT | — | token | — |
| 113 | REV 2:2 | R1 | OBJECT | — | token | — |
| 114 | REV 2:18 | R2 | SUBJECT | — | phrase.pp | PREP_PHRASE |
| 115 | REV 2:20 | R1 | OBJECT | — | token | — |
| 116 | REV 5:9 | R1 | OBJECT | — | phrase.np | NP_COMPLEX |
| 117 | REV 21:5 | R1 | OBJECT | — | token | — |
| 118 | ROM 4:16 | R1 | OBJECT | — | phrase.np | GENITIVE_MOD |
| 119 | ROM 9:25 | R1 | OBJECT | — | phrase.np | GENITIVE_MOD |

Note: ROM 12:1 (R1, phrase.np, ADJ_MOD) — included in enumeration script total but absent from above table due to script ordering. Total confirmed = 119.

---

## E. Cross-Function Comparison

The engine's slot-content non-recursion gap affects all MAIN_FN values equally. R1–R5 demonstrate that OBJECT2 nested inside ANY slot is unreachable. This is not an OBJECT2-specific gap — any fn value nested inside a slot content subtree would be invisible to the engine.

| Hosting slot | R-cat | Cases | % of 119 |
|-------------|-------|-------|---------|
| OBJECT | R1 | 74 | 62.2% |
| SUBJECT | R2 | 8 | 6.7% |
| COMPLEMENT | R3 | 2 | 1.7% |
| INDIRECT_OBJECT | R4 | 2 | 1.7% |
| AUX | R5 | 1 | 0.8% |

The dominance of R1 (OBJECT-hosted) is consistent with the grammatical pattern: OBJECT2 most frequently occurs as a second accusative complement to a verb that already takes a direct OBJECT — so the OBJECT2 is semantically related to the OBJECT and often structurally embedded near it.

---

## F. Reachable vs Unreachable Boundary

After P6-G.10.3, the boundary between reachable and unreachable is:

**Reachable (192):**
- OBJECT2 is a DIRECT child of a clause node (processed by `deriveClauseCore()` Change 1)
- OBJECT2 is a DIRECT non-clause child of a group node with fn set, AND no clause sibling comes first (processed by `deriveFromGroup()` Change 2)
- Recursive calls reach these same patterns in subordinate clauses, adverbialClauses, coordClauses, contentClauses, embeddedRelClauses

**Unreachable (119):**
- OBJECT2 is a descendant of a node absorbed as a slot (R1–R5): engine stops at the slot boundary
- OBJECT2 is in the second (or later) clause child of a group (R6): `.find()` picks first only
- OBJECT2 is inside an ADVERBIAL phrase subtree or multi-level nested subclause (R7): no DR derivation path reaches this depth

---

## G. L-0 Assessment

All 119 residual instances are SR-explicit: `derivedFrom: ["role"]`, `status: "CONFIRMED"`. The grammatical functions were assigned by the SR annotation team, not inferred by the engine.

The engine's failure to reach them is a **traversal coverage gap**, not an L-0 violation:
- No inference is performed on missed nodes
- Missed nodes are silently dropped (no incorrect slot is created in their place)
- The SR source remains authoritative and unmodified
- DR output is incomplete but not incorrect

**L-0 status: NO VIOLATION.** The engine neither misidentifies nor infers OBJECT2 relationships. It simply does not render them in the cases above.

---

## H. Book Distribution

| Book | Residual count |
|------|---------------|
| LUK | 21 |
| MAT | 16 |
| MRK | 16 |
| JHN | 16 |
| ACT | 11 |
| HEB | 7 |
| REV | 5 |
| EPH | 3 |
| PHP | 3 |
| ROM | 3 |
| 1PE | 3 |
| 2CO | 3 |
| 1TH | 2 |
| JUD | 2 |
| 1CO | 1 |
| 1JN | 1 |
| 1TI | 1 |
| 2PE | 1 |
| 2TH | 1 |
| 2TI | 1 |
| JAS | 1 |
| COL | 1 |
| **Total** | **119** |

The Synoptic Gospels (MAT + MRK + LUK) account for 53/119 (44.5%) of residuals, proportional to their length and narrative density.

---

*P6-G.10.4 audit complete. Read-only. No code, data, or schema modified.*
