# P6-A Relationship Matrix

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE (READ-ONLY)

---

## Grade Scale

| Grade | 意味 |
|---|---|
| A | Explicitly represented — SR field/node から直接取得 |
| B | Indirectly represented — 構造から取得可能だが明示 field なし |
| C | Inference required — morph/order/context から推論が必要 |
| D | Not represented — SR に情報なし |

---

## 1. Main Predication Relationships

| Relationship | 代表例 | SR representation | Grade | 直接取得可能? | DG 利用可能? | Schema gap? |
|---|---|---|---|---|---|---|
| Subject (SUBJECT fn) | JHN 1:1 `ὁ λόγος fn=SUBJECT` | `function.canonical === 'SUBJECT'` | A | Yes | Yes | No |
| Predicate (PREDICATE fn) | ROM 6:1 `ἐροῦμεν fn=PREDICATE` | `function.canonical === 'PREDICATE'` | A | Yes | Yes | No |
| Copula (COPULA fn) | JHN 1:1 `ἦν fn=COPULA` | `function.canonical === 'COPULA'` | A | Yes | Yes | No |
| Direct Object (OBJECT fn) | ROM 6:1 `Τί fn=OBJECT` | `function.canonical === 'OBJECT'` | A | Yes | Yes | No |
| Predicate Complement (COMPLEMENT fn) | JHN 1:1 `θεὸς fn=COMPLEMENT` | `function.canonical === 'COMPLEMENT'` | A | Yes | Yes | No |
| Indirect Object (INDIRECT_OBJECT fn) | MAT 28:18 `μοι fn=INDIRECT_OBJECT` | `function.canonical === 'INDIRECT_OBJECT'` | A | Yes | Yes | No |
| Second Object (OBJECT2 fn) | PHP 2:5 `ἁρπαγμὸν fn=OBJECT2` | `function.canonical === 'OBJECT2'` | A | Yes | Yes | No |
| Auxiliary (AUX fn) | MAT 28:20 `ἰδοὺ fn=AUX` | `function.canonical === 'AUX'` | A | Yes | Yes | No |
| Adverbial (ADVERBIAL fn) | 多数 | `function.canonical === 'ADVERBIAL'` | A | Yes | Yes | No |
| Verbless clause | MAT 5:3 `clause` without COPULA/PREDICATE | COPULA/PREDICATE の不在から判定 | A | Yes (by absence) | Yes | No |
| Pro-drop subject | EPH 2:8 `ἐστε [V-PAI-2P]` — no fn=SUBJECT | verb morph に埋め込まれるが SR に不在 | B | Via morph only | Limited | SOFT GAP |
| Inverted word order | JHN 1:1 θεὸς ἦν ὁ λόγος | fn labels が語順に依存しない | A | Yes | Yes | No |

---

## 2. Coordination Relationships

| Relationship | 代表例 | SR representation | Grade | 直接取得可能? | DG 利用可能? | Schema gap? |
|---|---|---|---|---|---|---|
| Clause coordination container | JHN 1:1 `clause[COORDINATION]` | `construction.canonical === 'COORDINATION'` | A | Yes | Yes | No |
| Coordinated member identification | JHN 1:1 3 coordinated clauses | COORDINATION の子 (clause/group) | A | Yes | Yes | No |
| Coordination conjunction | JHN 1:1 `group { καί, clause }` | group 内 conjunction token (morph CONJ) | A | Yes | Yes | No |
| Coordination function in governing clause | MAT 28:18 `phrase.pp[COORDINATION] fn=ADVERBIAL` | COORDINATION node の fn label | A | Yes | Yes | No |
| Parallel semantic type | JHN 1:1 — 3 clauses all assert same subject | construction 型から類推のみ | B | Via structure | Partial | SOFT GAP |
| CONJOINED_CLAUSE vs COORDINATION | EPH 2:8 `clause[CONJOINED_CLAUSE]` | construction で区別可能 | A | Yes | Yes | No |

---

## 3. Subordinate Clause Relationships

| Relationship | 代表例 | SR representation | Grade | 直接取得可能? | DG 利用可能? | Schema gap? |
|---|---|---|---|---|---|---|
| Subordinate clause type | ROM 6:1 `clause[SUBORDINATE_CLAUSE]` | `construction.canonical` で直接取得 | A | Yes | Yes | No |
| Content clause | ROM 6:3 `clause[CONTENT_CLAUSE] fn=OBJECT` | `CONTENT_CLAUSE` construction | A | Yes | Yes | No |
| Nominalized clause (articular inf.) | ROM 6:6 `clause[NOMINALIZED_CLAUSE]` | `NOMINALIZED_CLAUSE` construction | A | Yes | Yes | No |
| Clause-as-NP | MAT 28:19 `clause[CLAUSE_AS_NP] fn=OBJECT` | `CLAUSE_AS_NP` construction | A | Yes | Yes | No |
| Purpose clause (ἵνα) | ROM 6:4 `SUBORDINATE_CLAUSE fn=ADVERBIAL { ἵνα }` | construction + conjunction token | A | Yes | Yes | No |
| Conditional clause (εἰ) | ROM 6:5 `SUBORDINATE_CLAUSE fn=ADVERBIAL { εἰ }` | construction + conjunction token | A | Yes | Yes | No |
| Comparative clause (ὥσπερ) | ROM 6:4 `SUBORDINATE_CLAUSE fn=ADVERBIAL { ὥσπερ }` | construction + conjunction token | A | Yes | Yes | No |
| Causal ὅτι vs. content ὅτι | ὅτι in SUBORDINATE vs. CONTENT | construction 型で一部区別可能だが ambiguous | B | Partial | Partial | SOFT GAP |
| Governing clause of subordinate | 全ての SUBORDINATE_CLAUSE 例 | parent clause (tree containment) | A | Yes (tree) | Yes | No |
| Attachment target word within governing clause | — | SR に explicit pointer なし | B | Tree only | Limited | SOFT GAP |
| Relative clause construction type | ROM 6:2 `clause { οἵτινες fn=SUBJECT }` | construction label なし (RELATIVE_CLAUSE 不在) | D | No | No | **HARD GAP** |
| Relative pronoun token 識別 | ROM 6:2 `[R-NPM]` morph | morph `R-*` / `K-*` で識別可能 | B | Via morph | Partial | SOFT GAP |

---

## 4. Relative / Antecedent Relationships

| Relationship | 代表例 | SR representation | Grade | 直接取得可能? | DG 利用可能? | Schema gap? |
|---|---|---|---|---|---|---|
| RELATIVE_CLAUSE construction | 全 relative 節 | **存在しない** | D | No | No | **HARD GAP** |
| Relative pronoun 節内機能 | ROM 6:2 `οἵτινες fn=SUBJECT` | fn label から取得可能 | A | Yes | Yes | No |
| Relative pronoun → antecedent link | ROM 6:2 οἵτινες → ἡμεῖς | **antecedent field 皆無** | D | No | No | **HARD GAP** |
| Relative clause governing noun識別 | COL 1:15 ὅς → τὸν υἱὸν | SR に pointer なし; surfaceIndex 近接のみ | C | Via proximity | BLOCKED (L-0) | **HARD GAP** |
| Head noun ↔ relative clause connection | 全 relative 節 | 明示 link なし | D | No | No | **HARD GAP** |

---

## 5. Participial Relationships

| Relationship | 代表例 | SR representation | Grade | 直接取得可能? | DG 利用可能? | Schema gap? |
|---|---|---|---|---|---|---|
| Adjectival participle (ADJ_MOD) | JHN 1:6 `phrase.np[ADJ_MOD]` | ADJ_MOD construction + clause child | A | Yes | Yes | No |
| Adjectival participle fn=PREDICATE token | EPH 2:7 `token fn=PREDICATE ὑπερβάλλον` in ADJ_MOD | ADJ_MOD + fn=PREDICATE | A | Yes | Yes | No |
| Adverbial participle (fn=ADVERBIAL clause) | PHP 2:5 `clause fn=ADVERBIAL { ὑπάρχων }` | fn=ADVERBIAL on participial clause | B | Via clause fn | Yes (DG renders as adv-clause) | SOFT GAP |
| Adverbial participle attachment verb | PHP 2:5 ὑπάρχων → ? | tree containment のみ; 明示 pointer なし | B | Tree only | Limited | SOFT GAP |
| Attendant circumstance | MAT 28:18 `πορευθέντες fn=PREDICATE` + `ἐλάλησεν fn=PREDICATE` | 同一 clause 内の複数 fn=PREDICATE | C | Morph required | Limited | GAP |
| Participial copula | PHP 2:7 `γενόμενος fn=COPULA` | fn=COPULA で明示 | A | Yes | Yes | No |
| Genitive absolute | (対象節に明確例なし) | 推定: `clause fn=ADVERBIAL` だが genitive absolute と明示されない | C | Via morph | Limited | GAP |
| Adverbial type (causal/temp/concessive) | — | SR は fn=ADVERBIAL の意味種別を不明示 | B/C | Via conjunction only | Partial | SOFT GAP |

---

## 6. Modifier/Head Relationships

| Relationship | 代表例 | SR representation | Grade | 直接取得可能? | DG 利用可能? | Schema gap? |
|---|---|---|---|---|---|---|
| GENITIVE_MOD head vs. modifier | PHP 2:5 `GENITIVE_MOD { μορφῇ, θεοῦ }` | GENITIVE_MOD construction + morph case | A | Yes | Yes | No |
| ADJ_MOD — clause modifier vs. token head | JHN 1:6 `ADJ_MOD { ἄνθρωπος, clause }` | token child = head; clause child = modifier | A | Yes | Yes | No |
| ADJ_MOD — fn=PREDICATE vs. head | EPH 2:7 `ADJ_MOD { fn=PREDICATE ὑπερβάλλον, fn=null πλοῦτος }` | fn=PREDICATE = modifier | A | Yes | Yes | No |
| ADJ_MOD — adjective/article + noun | COL 1:16 `ADJ_MOD { τὰ, πάντα }` | 位置と morph で推定 | B | Via morph | Partial | SOFT GAP |
| PREP_PHRASE prep vs. governed NP | JHN 1:1 `PREP_PHRASE { ἐν, ἀρχῇ }` | preposition = morph PREP; governed NP = 後続子 | A | Yes | Yes | No |
| PREP_PHRASE governing word in clause | — | tree containment のみ | B | Tree only | Limited | SOFT GAP |
| ARTICULAR_NP article vs. head noun | JHN 1:1 `ARTICULAR_NP { ὁ, λόγος }` | morph T-* = article; N-* = noun | B | Via morph | Yes | SOFT GAP |
| ADV_MOD head vs. adverbial particle | ROM 6:4 `ADV_MOD { καὶ, ἡμεῖς }` | token type + position | B | Via position | Yes | SOFT GAP |
| NP_COMPLEX head element | MAT 28:18 `NP_COMPLEX { πᾶσα, PREP_PHRASE { ἐξουσία } }` | 明示 head field なし; 位置による | B | Via position | Partial | SOFT GAP |
| DEMO_MOD demonstrative → head | (対象節に出現せず) | 推定: DEMO_MOD construction で関係を示す | B | — | — | SOFT GAP |

---

## 7. Apposition Relationships

| Relationship | 代表例 | SR representation | Grade | 直接取得可能? | DG 利用可能? | Schema gap? |
|---|---|---|---|---|---|---|
| Appositive relationship | ROM 6:3 `APPOSITION { Χριστὸν, Ἰησοῦν }` | APPOSITION construction | A | Yes | Yes | No |
| Head vs. appositive member | ROM 6:3 (第一子 = head 慣習) | 位置慣習; 明示 field なし | B | Via position | Partial | SOFT GAP |
| Shared referent / function | COL 1:15 APPOSITION fn=COMPLEMENT | APPOSITION + fn label | A | Yes | Yes | No |
| Compound APPOSITION | COL 1:15 `APPOSITION { GENITIVE_MOD, GENITIVE_MOD }` | APPOSITION 内に複数 complex children | A | Yes | Yes | No |
| Restrictive vs. non-restrictive | — | SR は明示しない | C | Inference only | No | GAP |

---

## 8. Infinitive Relationships

| Relationship | 代表例 | SR representation | Grade | 直接取得可能? | DG 利用可能? | Schema gap? |
|---|---|---|---|---|---|---|
| Infinitive token 識別 | MAT 28:19 `τηρεῖν [V-PAN]` | morph_raw[4]==='N' (infinitive) | A | Yes | Yes | No |
| Infinitive fn=PREDICATE | MAT 28:19 `τηρεῖν fn=PREDICATE` | fn=PREDICATE | A | Yes | Yes | No |
| AcI — accusative subject | MAT 28:19 `αὐτοὺς fn=SUBJECT [P-APM]` | fn=SUBJECT on accusative | A | Yes | Yes | No |
| AcI governing verb | MAT 28:19 `διδάσκοντες` (parent clause) | tree containment | B | Tree only | Yes | SOFT GAP |
| Articular infinitive construction | ROM 6:6 `clause[NOMINALIZED_CLAUSE]` | NOMINALIZED_CLAUSE construction | A | Yes | Yes | No |
| Articular infinitive subject | ROM 6:6 `ἡμᾶς fn=SUBJECT [P-1AP]` | fn=SUBJECT within NOMINALIZED_CLAUSE | A | Yes | Yes | No |
| COL 1:19 κατοικῆσαι + subject | COL 1:19 `πᾶν τὸ πλήρωμα fn=SUBJECT` | fn=SUBJECT within infinitive clause | A | Yes | Yes | No |

---

## 9. Periphrastic / Compound Verbal

| Relationship | 代表例 | SR representation | Grade | 直接取得可能? | DG 利用可能? | Schema gap? |
|---|---|---|---|---|---|---|
| Periphrastic structure | EPH 2:8 `phrase.vp[COPULAR_VP] { ἐστε, σεσῳσμένοι }` | COPULAR_VP construction | A | Yes | Yes | No |
| Finite copula in COPULAR_VP | EPH 2:8 `ἐστε [V-PAI-2P]` | COPULAR_VP 第一子 = copula | A | Yes | Yes | No |
| Participle in COPULAR_VP | EPH 2:8 `σεσῳσμένοι [V-RPP-NPM]` | COPULAR_VP 第二子 = participle | A | Yes | Yes | No |
| fn=COPULA on participle | PHP 2:7 `γενόμενος fn=COPULA` | fn=COPULA | A | Yes | Yes | No |
| Attendant circumstance distinction | MAT 28:18-19 複数 fn=PREDICATE | 同一 clause 内の複数 PREDICATE; 明示ラベルなし | C | Morph required | Limited | GAP |

---

## 10. Schema Gap Summary

### HARD GAPS (Grade D)

| Gap | 影響 |
|---|---|
| RELATIVE_CLAUSE construction が存在しない | 関係節を関係節として識別不可 |
| Antecedent link field が存在しない | 先行詞への接続線を描画不可 |
| Relative clause → governing noun link が存在しない | R-K/Leedy型の関係節接続実現不可 |

### SOFT GAPS (Grade B — 構造から推定可能)

| Gap | 推定手段 | DG への影響 |
|---|---|---|
| Pro-drop implied subject | 動詞 morph の person/number | DG は implied subject 表示不可 |
| Adverbial attachment target word | tree containment | DG は governing clause を示せるが target word 不明 |
| Head vs. appositive in APPOSITION | 位置慣習 | DG は position-order に依存 |
| ADJ_MOD adjective/noun head | morph | DG は morph で補完可能 |
| Causal ὅτι vs. content ὅτι | construction type | 一部区別可能 |
| ARTICULAR_NP article/head | morph | DG は morph で補完可能 |
| Attendant participle vs. adverbial | morph (finite/ptcp) | L-0 BLOCKED |

### FUNCTIONAL GAPS (Grade C — L-0 で blocked)

| Gap | 推論 | L-0 Status |
|---|---|---|
| Attendant circumstance identification | 複数 PREDICATE のうち participle = attendant | BLOCKED |
| Genitive absolute identification | genitive case + non-coreferential subject | BLOCKED |
| Relative clause antecedent | surfaceIndex 近接 + 格一致 | BLOCKED |
| Restrictive vs. non-restrictive apposition | 意味/談話分析 | BLOCKED |

---

*詳細: P6-A_sr_diagram_readiness_audit.md / P6-A_test_matrix.md / P6-A_final_report.md*
