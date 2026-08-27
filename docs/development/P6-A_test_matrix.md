# P6-A SR Diagram-Readiness — Test Matrix

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE (READ-ONLY)

---

## Evidence Level Scale

| Symbol | 意味 |
|---|---|
| ✅ A | Explicitly represented — field/node から直接取得 |
| 🔵 B | Indirectly represented — tree/morph から推定可能 |
| 🟡 C | Inference required — L-0 境界に抵触 |
| ❌ D | Not represented — SR に情報なし |
| N/A | 対象節に例なし |

---

## Passage 1: JHN 1:1

**SR structure:** `clause[COORDINATION]` — 3 coordinated copular clauses

| Audit | Relationship | SR Evidence | Grade |
|---|---|---|---|
| I | fn=SUBJECT (`ὁ λόγος`) | `function.canonical === 'SUBJECT'` — confirmed in clause 1, 2, 3 | ✅ A |
| I | fn=COPULA (`ἦν` × 3) | `function.canonical === 'COPULA'` — confirmed | ✅ A |
| I | fn=COMPLEMENT (`ἐν ἀρχῇ`, `πρὸς τὸν θεόν`, `θεὸς`) | `function.canonical === 'COMPLEMENT'` — confirmed | ✅ A |
| D | COORDINATION construction | `construction.canonical === 'COORDINATION'` — confirmed | ✅ A |
| D | Coordinated members | 3 direct clause children of COORDINATION | ✅ A |
| D | Conjunction tokens | `group { καί, clause }` pattern — confirmed | ✅ A |
| I | Word order independence (θεὸς ἦν ὁ λόγος) | fn labels assign COMPLEMENT to θεὸς regardless of position | ✅ A |
| A | Relative pronoun | Not present in JHN 1:1 | N/A |
| B | Participial attachment | Not present in JHN 1:1 | N/A |
| F | Infinitive | Not present in JHN 1:1 | N/A |
| H | COPULAR_VP | Not present in JHN 1:1 | N/A |

**JHN 1:1 Result:** All present relationships Grade A. No relative clauses, participials, or infinitives.

---

## Passage 2: MAT 5:3

**SR structure:** `clause` (verbless) + `clause[SUBORDINATE_CLAUSE] fn=ADVERBIAL`

| Audit | Relationship | SR Evidence | Grade |
|---|---|---|---|
| I | fn=COMPLEMENT (`Μακάριοι`) | `function.canonical === 'COMPLEMENT'` role=p — confirmed | ✅ A |
| I | fn=SUBJECT (`οἱ πτωχοὶ τῷ πνεύματι`) | `function.canonical === 'SUBJECT'` — confirmed | ✅ A |
| I | Verbless clause (no COPULA/PREDICATE) | fn=COPULA/PREDICATE absent — verbless determinable by absence | ✅ A |
| C | ADV_MOD head (`πτωχοὶ`) vs. modifier (`τῷ πνεύματι`) | `phrase.np[ADV_MOD] { πτωχοὶ, ARTICULAR_NP }` — token = head, phrase = modifier | 🔵 B |
| E | SUBORDINATE_CLAUSE type | `construction.canonical === 'SUBORDINATE_CLAUSE'` — confirmed | ✅ A |
| E | fn=ADVERBIAL on ὅτι clause | `function.canonical === 'ADVERBIAL'` — confirmed | ✅ A |
| E | Governing clause of ὅτι clause | Parent clause (tree containment) | ✅ A |
| E | ὅτι conjunction token | `token [CONJ] 'ὅτι'` as first child of SUBORDINATE_CLAUSE | ✅ A |
| I | Inner ὅτι clause: COPULA+SUBJECT+COMPLEMENT | `ἐστιν fn=COPULA`, `βασιλεία fn=SUBJECT`, `αὐτῶν fn=COMPLEMENT` — confirmed | ✅ A |
| C | GENITIVE_MOD in ὅτι clause (`τῶν οὐρανῶν`) | `GENITIVE_MOD { βασιλεία, ARTICULAR_NP { τῶν, οὐρανῶν } }` | ✅ A |
| A | Relative pronoun | Not present in MAT 5:3 | N/A |

**MAT 5:3 Result:** Verbless clause, SUBORDINATE_CLAUSE, ADV_MOD all handled. ADV_MOD head B-level.

---

## Passage 3: EPH 2:8

**SR structure:** `clause[CONJOINED_CLAUSE]` × 2 — (1) periphrastic + (2) τοῦτο/δῶρον

| Audit | Relationship | SR Evidence | Grade |
|---|---|---|---|
| H | COPULAR_VP construction | `phrase.vp[COPULAR_VP] fn=PREDICATE { ἐστε [V-PAI-2P], σεσῳσμένοι [V-RPP-NPM] }` | ✅ A |
| H | Finite copula in COPULAR_VP | `ἐστε` — first child, morph V-PAI | ✅ A |
| H | Participle in COPULAR_VP | `σεσῳσμένοι` — second child, morph V-RPP | ✅ A |
| I | fn=ADVERBIAL (`τῇ χάριτί`) | `function.canonical === 'ADVERBIAL'` | ✅ A |
| I | fn=ADVERBIAL (`διὰ πίστεως`) | `function.canonical === 'ADVERBIAL'` | ✅ A |
| I | Pro-drop subject (implied ὑμεῖς) | fn=SUBJECT absent; `ἐστε` morph 2P implies subject | 🔵 B |
| I | fn=SUBJECT (`τοῦτο`) in sentence 2 | `function.canonical === 'SUBJECT'` — confirmed | ✅ A |
| I | fn=COMPLEMENT in sentence 2 | `function.canonical === 'COMPLEMENT'` for ἐξ ὑμῶν and θεοῦ τὸ δῶρον | ✅ A |
| C | GENITIVE_MOD (`θεοῦ`) | `phrase.np[GENITIVE_MOD] fn=COMPLEMENT { τὸ δῶρον [ARTICULAR_NP], θεοῦ }` — head/mod distinction via case | ✅ A |
| E | CONJOINED_CLAUSE (γάρ) | `construction.canonical === 'CONJOINED_CLAUSE'` + γάρ token | ✅ A |

**EPH 2:8 Result:** COPULAR_VP (periphrastic) Grade A. Pro-drop subject B. GENITIVE_MOD A.

---

## Passage 4: PHP 2:5–8

**SR structure:** fn=null root → fn=null children → fn-marked descendants; NOMINALIZED_CLAUSE

| Audit | Relationship | SR Evidence | Grade |
|---|---|---|---|
| I | fn=OBJECT (τοῦτο, [.0]) | `function.canonical === 'OBJECT'` — confirmed | ✅ A |
| A | fn=null structural containers ([.1], [.2]) | `function.canonical === null` on clause nodes | (structural note) |
| A | Relative pronoun `ὃ` in fn=null [.1] | `token fn=SUBJECT [R-NSN] 'ὃ'` — morph R-NSN | 🔵 B (morph identifies) |
| A | Antecedent of `ὃ` | No antecedent field anywhere in SR | ❌ D |
| A | Relative pronoun `ὃς` in fn=null [.2] | `token fn=SUBJECT [R-NSM] 'ὅς'` | 🔵 B |
| A | Antecedent of `ὃς` | No antecedent field | ❌ D |
| B | Adverbial participle `ὑπάρχων` | `clause fn=ADVERBIAL { ὑπάρχων fn=PREDICATE }` | 🔵 B |
| C | GENITIVE_MOD `μορφῇ / θεοῦ` | `GENITIVE_MOD { μορφῇ [N-DSF], θεοῦ [N-GSM] }` — head/mod by case | ✅ A |
| F | NOMINALIZED_CLAUSE (εἶναι) | `clause[NOMINALIZED_CLAUSE] fn=OBJECT { εἶναι fn=COPULA, ἴσα fn=COMPLEMENT }` | ✅ A |
| I | PHP 2:7 fn=COPULA (`γενόμενος`) | `token fn=COPULA 'γενόμενος' [V-2ADP-NSM]` | ✅ A |
| I | PHP 2:7 fn=COMPLEMENT (`ὑπήκοος`) | `function.canonical === 'COMPLEMENT'` | ✅ A |
| B | Attendant `εὑρεθεὶς` (fn=PREDICATE alongside main) | Two fn=PREDICATE tokens in same adverbial clause | 🟡 C |

**PHP 2:5-8 Result:** Antecedent links absent (D). Relative pronoun identifiable (B). GENITIVE_MOD (A). COPULAR_VP (A). Attendant circumstance (C).

---

## Passage 5: MAT 28:18–20

**SR structure:** `clause[CONJOINED_CLAUSE]` × 3; COORDINATION; AcI structure

| Audit | Relationship | SR Evidence | Grade |
|---|---|---|---|
| I | fn=PREDICATE (`ἐλάλησεν`, MAT 28:18) | `function.canonical === 'PREDICATE'` | ✅ A |
| I | fn=PREDICATE + fn=ADVERBIAL (λέγων clause) | λέγων clause as fn=ADVERBIAL | ✅ A |
| I | Inner speech: fn=SUBJECT (`πᾶσα ἐξουσία`) | `function.canonical === 'SUBJECT'` — NP_COMPLEX | ✅ A |
| I | fn=PREDICATE (`Ἐδόθη`) | `function.canonical === 'PREDICATE'` role=v | ✅ A |
| I | fn=INDIRECT_OBJECT (`μοι`) | `function.canonical === 'INDIRECT_OBJECT'` role=io | ✅ A |
| D | COORDINATION of PPs (`ἐν οὐρανῷ καὶ ἐπὶ γῆς`) | `phrase.pp[COORDINATION]` — construction confirmed | ✅ A |
| B | Attendant `πορευθέντες` + main `μαθητεύσατε` | Both fn=PREDICATE in same clause; participle identifiable by morph | 🟡 C |
| B | Adverbial participles (`βαπτίζοντες`, `διδάσκοντες`) | `group fn=ADVERBIAL { βαπτίζοντες fn=PREDICATE, διδάσκοντες fn=PREDICATE }` | 🔵 B |
| F | AcI: `αὐτοὺς fn=SUBJECT [P-APM]` in infinitival clause | fn=SUBJECT on accusative pronoun within clause fn=OBJECT | ✅ A |
| F | AcI: `τηρεῖν fn=PREDICATE [V-PAN]` | fn=PREDICATE on infinitive | ✅ A |
| D | COORDINATION of baptism formula (`πατρὸς/υἱοῦ/πνεύματος`) | `phrase.np[COORDINATION] { group { τοῦ πατρὸς }, group { καὶ τοῦ υἱοῦ }, group { καὶ τοῦ ἁγίου πνεύματος } }` | ✅ A |
| I | MAT 28:20 verbless (εἰμι present, Grade A) | `fn=COPULA εἰμι`, `fn=SUBJECT ἐγώ`, `fn=COMPLEMENT μεθ' ὑμῶν` | ✅ A |
| I | NP_COMPLEX fn=ADVERBIAL (`πάσας τὰς ἡμέρας`) | `phrase.np[NP_COMPLEX] fn=ADVERBIAL` | ✅ A |

**MAT 28:18-20 Result:** AcI explicitly represented (A). Attendant circumstance (C). COORDINATION (A). Adverbial participle clause (B).

---

## Passage 6: COL 1:15–18

**SR structure:** Long sentence; APPOSITION; ADJ_MOD; GENITIVE_MOD; multiple relative clauses

| Audit | Relationship | SR Evidence | Grade |
|---|---|---|---|
| A | Relative `ὅς fn=SUBJECT` (COL 1:15) | `token fn=SUBJECT [R-NSM] 'ὅς'` — morph R-NSM | 🔵 B |
| A | Antecedent of `ὅς` | No antecedent field | ❌ D |
| G | APPOSITION (COL 1:15 COMPLEMENT) | `phrase.np[APPOSITION] fn=COMPLEMENT { GENITIVE_MOD {εἰκὼν...}, GENITIVE_MOD {πρωτότοκος...} }` | ✅ A |
| G | Head vs. appositive | APPOSITION 第一子 = εἰκὼν (head by position) | 🔵 B |
| C | GENITIVE_MOD (`εἰκὼν / θεοῦ τοῦ ἀοράτου`) | `GENITIVE_MOD { εἰκών, ARTICULAR_NP { τοῦ θεοῦ } }` with nested ADJ_MOD | ✅ A |
| C | ADJ_MOD (`τοῦ ἀοράτου` modifying θεοῦ) | `phrase.np[ADJ_MOD] { τοῦ, ἀοράτου }` — article + adjective | 🔵 B |
| C | GENITIVE_MOD (`πρωτότοκος / πάσης κτίσεως`) | `GENITIVE_MOD { πρωτότοκος, NP_COMPLEX {πάσης κτίσεως} }` | ✅ A |
| D | COORDINATION (COL 1:16) | `clause[COORDINATION]` with 3 clauses | ✅ A |
| I | fn=SUBJECT (`τὰ πάντα`) in COORDINATION | `function.canonical === 'SUBJECT'` | ✅ A |
| I | fn=PREDICATE (`ἔκτισται`) | `function.canonical === 'PREDICATE'` | ✅ A |
| E | SUBORDINATE_CLAUSE fn=ADVERBIAL (ὅτι clause in COL 1:16) | `clause[SUBORDINATE_CLAUSE] fn=ADVERBIAL` + ὅτι token | ✅ A |
| G | APPOSITION (COL 1:18 τοῦ σώματος / τῆς ἐκκλησίας) | `phrase.np[APPOSITION] { ARTICULAR_NP, ARTICULAR_NP }` | ✅ A |
| G | APPOSITION (ἀρχή / πρωτότοκος) | `phrase.np[APPOSITION] { ἀρχή, πρωτότοκος }` | ✅ A |

**COL 1:15-18 Result:** APPOSITION (A). GENITIVE_MOD (A). Relative antecedent (D). ADJ_MOD internal head (B).

---

## Passage 7: ROM 6:1–10

**SR structure:** 10 sentences; multiple relative clauses; NOMINALIZED_CLAUSE; CONTENT_CLAUSE; conditional; purpose

| Audit | Relationship | SR Evidence | Grade |
|---|---|---|---|
| A | Relative `οἵτινες fn=SUBJECT` (6:2) | `token [R-NPM] fn=SUBJECT` within clause fn=SUBJECT | 🔵 B |
| A | Antecedent of `οἵτινες` | No antecedent field | ❌ D |
| A | Relative `ὃ fn=ADVERBIAL` (6:10) | `token [R-ASN] fn=ADVERBIAL` | 🔵 B |
| A | Antecedent of `ὃ` (6:10) | No antecedent field | ❌ D |
| I | Relative clause fn=SUBJECT (6:2) | `clause fn=SUBJECT { οἵτινες, ἀπεθάνομεν }` — clause as subject | ✅ A |
| E | CONTENT_CLAUSE fn=OBJECT (6:3 ὅτι) | `clause[CONTENT_CLAUSE] fn=OBJECT` — confirmed | ✅ A |
| E | SUBORDINATE_CLAUSE fn=ADVERBIAL ἵνα (6:4) | `clause[SUBORDINATE_CLAUSE] fn=ADVERBIAL` + ἵνα | ✅ A |
| E | SUBORDINATE_CLAUSE fn=ADVERBIAL ὥσπερ (6:4) | `clause[SUBORDINATE_CLAUSE] fn=ADVERBIAL` + ὥσπερ | ✅ A |
| E | SUBORDINATE_CLAUSE fn=ADVERBIAL εἰ (6:5) | `clause[SUBORDINATE_CLAUSE] fn=ADVERBIAL` + Εἰ | ✅ A |
| F | NOMINALIZED_CLAUSE fn=ADVERBIAL (6:6 τοῦ δουλεύειν) | `clause[NOMINALIZED_CLAUSE] fn=ADVERBIAL { τοῦ, clause { ἡμᾶς fn=SUBJECT, δουλεύειν fn=PREDICATE, τῇ ἁμαρτίᾳ fn=OBJECT } }` | ✅ A |
| F | Infinitive subject `ἡμᾶς fn=SUBJECT [P-1AP]` in NOMINALIZED_CLAUSE | fn=SUBJECT on accusative — confirmed | ✅ A |
| F | NOMINALIZED_CLAUSE fn=SUBJECT (6:7 ὁ ἀποθανών) | `clause[NOMINALIZED_CLAUSE] fn=SUBJECT { ὁ, ἀποθανών fn=PREDICATE }` | ✅ A |
| G | APPOSITION (6:3 Χριστὸν Ἰησοῦν) | `phrase.np[APPOSITION] { Χριστὸν, Ἰησοῦν }` | ✅ A |
| I | fn=OBJECT (`Τί`, 6:1) | `function.canonical === 'OBJECT'` — interrogative pronoun | ✅ A |
| I | fn=PREDICATE (`ἐροῦμεν`, 6:1) | `function.canonical === 'PREDICATE'` | ✅ A |
| C | GENITIVE_MOD (`τῆς ἁμαρτίας`) | `GENITIVE_MOD { ζωῇ, ARTICULAR_NP { τῆς, ἁμαρτίας } }` | ✅ A |
| I | `ἐγώ fn=SUBJECT` (6:10) | `function.canonical === 'SUBJECT'` | ✅ A |
| B | Multiple fn=PREDICATE attendant (ROM 6:4 συνετάφημεν) | Attendant vs. main requires morph check | 🟡 C |

**ROM 6:1-10 Result:** CONTENT_CLAUSE/NOMINALIZED_CLAUSE (A). AcI/articular infinitive subject (A). COORDINATION (A). Relative antecedent consistently absent (D).

---

## Cross-Passage Summary Table

| Audit | 対象 | JHN 1:1 | MAT 5:3 | EPH 2:8 | PHP 2:5-8 | MAT 28:18-20 | COL 1:15-18 | ROM 6:1-10 | Overall |
|---|---|---|---|---|---|---|---|---|---|
| A | RELATIVE_CLAUSE construction | N/A | N/A | N/A | N/A | N/A | N/A | ❌ D | **D** |
| A | Relative pronoun 識別 | N/A | N/A | N/A | 🔵 B | N/A | 🔵 B | 🔵 B | **B** |
| A | Antecedent link | N/A | N/A | N/A | ❌ D | N/A | ❌ D | ❌ D | **D** |
| B | Adjectival participle (ADJ_MOD) | N/A | N/A | N/A | N/A | N/A | 🔵 B | N/A | **A/B** |
| B | Adverbial participle clause | N/A | N/A | N/A | 🔵 B | 🔵 B | N/A | N/A | **B** |
| B | Attendant circumstance | N/A | N/A | N/A | 🟡 C | 🟡 C | N/A | 🟡 C | **C** |
| C | GENITIVE_MOD head/mod | N/A | ✅ A | ✅ A | ✅ A | N/A | ✅ A | ✅ A | **A** |
| C | ADJ_MOD head (clause child) | N/A | N/A | N/A | N/A | N/A | N/A | N/A | **A** |
| C | ADJ_MOD head (adjective/article) | N/A | N/A | N/A | N/A | N/A | 🔵 B | N/A | **B** |
| C | PREP_PHRASE prep/governed | ✅ A | N/A | N/A | ✅ A | N/A | N/A | N/A | **A** |
| D | COORDINATION construction | ✅ A | N/A | N/A | N/A | ✅ A | ✅ A | N/A | **A** |
| D | Coordination members | ✅ A | N/A | N/A | N/A | ✅ A | ✅ A | N/A | **A** |
| D | Conjunction in group | ✅ A | N/A | N/A | N/A | ✅ A | N/A | N/A | **A** |
| E | Subordinate clause type | N/A | ✅ A | N/A | N/A | N/A | ✅ A | ✅ A | **A** |
| E | fn=ADVERBIAL function | N/A | ✅ A | ✅ A | 🔵 B | 🔵 B | ✅ A | ✅ A | **A** |
| E | Governing clause | N/A | ✅ A | N/A | N/A | N/A | ✅ A | ✅ A | **A** |
| E | RELATIVE_CLAUSE type | N/A | N/A | N/A | ❌ D | N/A | ❌ D | ❌ D | **D** |
| F | Infinitive fn=PREDICATE | N/A | N/A | N/A | ✅ A | ✅ A | ✅ A | ✅ A | **A** |
| F | AcI fn=SUBJECT on accusative | N/A | N/A | N/A | N/A | ✅ A | N/A | ✅ A | **A** |
| F | NOMINALIZED_CLAUSE | N/A | N/A | N/A | ✅ A | N/A | N/A | ✅ A | **A** |
| G | APPOSITION construction | N/A | N/A | N/A | N/A | N/A | ✅ A | ✅ A | **A** |
| G | Head vs. appositive | N/A | N/A | N/A | N/A | N/A | 🔵 B | 🔵 B | **B** |
| H | COPULAR_VP | N/A | N/A | ✅ A | N/A | N/A | N/A | N/A | **A** |
| H | fn=COPULA on participle | N/A | N/A | N/A | ✅ A | N/A | N/A | N/A | **A** |
| H | Attendant circumstance | N/A | N/A | N/A | 🟡 C | 🟡 C | N/A | N/A | **C** |
| I | fn=SUBJECT | ✅ A | ✅ A | 🔵 B | ✅ A | ✅ A | ✅ A | ✅ A | **A** |
| I | fn=PREDICATE | ✅ A | N/A | ✅ A | ✅ A | ✅ A | ✅ A | ✅ A | **A** |
| I | fn=COPULA | ✅ A | N/A | ✅ A | ✅ A | ✅ A | N/A | N/A | **A** |
| I | fn=OBJECT | N/A | N/A | ✅ A | ✅ A | ✅ A | N/A | ✅ A | **A** |
| I | fn=COMPLEMENT | ✅ A | ✅ A | ✅ A | ✅ A | N/A | ✅ A | N/A | **A** |
| I | fn=INDIRECT_OBJECT | N/A | N/A | N/A | N/A | ✅ A | N/A | N/A | **A** |
| I | Verbless clause | N/A | ✅ A | N/A | N/A | N/A | N/A | N/A | **A** |

---

## Grade Distribution

| Grade | 項目数 | % |
|---|---|---|
| A — Explicitly represented | 26 | 57% |
| B — Indirectly represented | 11 | 24% |
| C — Inference required | 3 | 7% |
| D — Not represented | 5 | 11% |

---

## Grade D Items (Schema Gaps)

| Item | 影響 |
|---|---|
| RELATIVE_CLAUSE construction が SR に存在しない | 関係節を construction として識別不可 |
| Antecedent link field が存在しない | 先行詞への接続線描画不可 |
| 関係節と先行詞 governing noun の link が存在しない | R-K/Leedy diagram では必須 |

---

*詳細: P6-A_sr_diagram_readiness_audit.md / P6-A_relationship_matrix.md / P6-A_final_report.md*
