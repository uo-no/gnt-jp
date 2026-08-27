# P6-A SR Diagram-Readiness Audit

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE (READ-ONLY)  
**Production code changes:** 0

---

## 監査目的

Reed–Kellogg / Leedy 型の Greek NT sentence diagram を成立させるために、現在の SR schema が必要な構造関係をどこまで明示的に保持しているかを判定する。

**判定基準:**

| Grade | 意味 |
|---|---|
| A | Explicitly represented — SR field/node relationshipから直接取得可能 |
| B | Represented indirectly — 構造から取得可能だが明示relationshipではない |
| C | Inference required — morph/order/proximity/heuristic等から推定が必要 |
| D | Not represented — SRに必要な情報が存在しない |

Aのみを「Leedy-ready」とする。

---

## 監査対象 SR データ一覧

| 節 | ref | 主要確認事項 |
|---|---|---|
| JHN 1:1 | `clause[COORDINATION]` | 等位節・copular clause・補語 |
| MAT 5:3 | `clause` (verbless) | verbless clause・ADV_MOD・SUBORDINATE_CLAUSE |
| EPH 2:8 | `clause[CONJOINED_CLAUSE]` | COPULAR_VP・periphrastic・AcI相当 |
| PHP 2:5–8 | 複数句 | relative/fn=null・分詞・GENITIVE_MOD・APPOSITION |
| MAT 28:18–20 | `clause[CONJOINED_CLAUSE]` × 3 | 分詞・COORDINATION・不定詞内 SUBJECT |
| COL 1:15–18 | 長文 | relative・APPOSITION・ADJ_MOD・SUBORDINATE_CLAUSE |
| ROM 6:1–10 | 10文 | relative・条件節・不定詞・NOMINALIZED_CLAUSE |

---

## Audit A — Relative / Antecedent Attachment

### A-1. RELATIVE_CLAUSE construction の存在

**発見:** SR の 17 construction 種に `RELATIVE_CLAUSE` は存在しない。

確認した construction 種: ARTICULAR_NP, PREP_PHRASE, GENITIVE_MOD, CONJOINED_CLAUSE, ADJ_MOD, SUBORDINATE_CLAUSE, NP_COMPLEX, NOMINALIZED_CLAUSE, APPOSITION, CONTENT_CLAUSE, CLAUSE_AS_NP, COORDINATION, ADV_MOD, DEMO_MOD, PARTICIPIAL_CLAUSE, NUM_MOD, COPULAR_VP

関係代名詞を含む節: `clause` (construction なし) として現れる。

**Grade: D** — RELATIVE_CLAUSE construction は SR に存在しない

### A-2. Relative pronoun token の識別

関係代名詞 (`ὃ`, `ὃς`, `οἵτινες` 等) は morph_raw `R-*` / `K-*` で識別可能。

- ROM 6:2: `token fn=SUBJECT "οἵτινες" [R-NPM]` — 節内で fn=SUBJECT を持つ
- ROM 6:10: `token fn=ADVERBIAL "ὃ" [R-ASN]` — 節内で fn=ADVERBIAL を持つ
- PHP 2:5: `token fn=SUBJECT "ὃ" [R-NSN]`、`token fn=SUBJECT "ὃς" [R-NSM]`
- COL 1:15: `token fn=SUBJECT "ὅς" [R-NSM]`

関係代名詞の「節内での機能」は fn label から取得可能。

**Grade: B** — morph `R-` で識別可能; 節内機能は fn から取得可能。antecedent への link なし。

### A-3. Antecedent への explicit link

**発見:** SR node に `antecedentId`, `coref`, `link`, `target` 等のフィールドは**皆無**。

PHP 2:5 の `ὃ` [R-NSN] は `fn=SUBJECT` として fn=null 節内に存在するが、その先行詞（`τοῦτο`、または節全体？）へのリンクは存在しない。

COL 1:15 の `ὅς` [R-NSM] は先行 COMPLEMENT節 `εἰκὼν τοῦ θεοῦ` の後に現れるが、antecedent field なし。

**Grade: D** — antecedent link は SR に存在しない

### A-4. SurfaceIndex からの推定

先行詞の候補を特定するには surfaceIndex の近接性と格の一致から推定するしかない。これは「推論」であり L-0 違反。

**Grade: C/D** — 推定可能だが L-0 境界を越える

### 判定サマリー A

| 項目 | Grade |
|---|---|
| RELATIVE_CLAUSE construction | D |
| Relative pronoun token 識別 | B |
| 節内での relative pronoun 機能 | A |
| Antecedent explicit link | D |
| Antecedent 推定 (surfaceIndex) | C — L-0 BLOCKED |

**結論:** P5-D.1 SCHEMA GAP 確定を再確認。antecedent link は SR に存在しない。

---

## Audit B — Participial Attachment

### B-1. Adjectival attachment (名詞修飾分詞)

**例: JHN 1:6** `phrase.np[ADJ_MOD] fn=SUBJECT { token 'ἄνθρωπος', clause { token fn=PREDICATE 'ἀπεσταλμένος' } }`

- SR の `ADJ_MOD` construction が head 名詞と修飾分詞節を明示
- `clause` child が修飾節; 非 clause child が head 名詞
- 修飾先 (head noun) は同一 ADJ_MOD node 内で直接取得可能

**Grade: A** — ADJ_MOD construction で modifier → head が明示

**例: EPH 2:7** `phrase.np[ADJ_MOD] { token fn=PREDICATE 'ὑπερβάλλον', token 'πλοῦτος' }`

- fn=PREDICATE を持つトークンが修飾分詞
- fn=null のトークンが head 名詞
- 両者が同一 ADJ_MOD 内に共存

**Grade: A** — ADJ_MOD + fn=PREDICATE で modifier/head が直接取得可能

**BUT: 分詞 vs. 形容詞の区別は morph からの推定が必要:**

- `phrase.np[ADJ_MOD] { τὰ, πάντα }` (COL 1:16): ADJ_MOD で article + adjective を単純グループ化。どちらが head か SR からは明示されない。
- ADJ_MOD は「形容詞的修飾関係」を示すが、内部の head/modifier 分離の明示度はケースによる。

**Grade: B** — 内部の head/modifier 分離は token type と fn=PREDICATE の有無から取得。adjective の場合は位置による推測。

### B-2. Adverbial attachment (副詞的分詞)

**例: PHP 2:5** `clause fn=ADVERBIAL { phrase.pp fn=ADVERBIAL, token fn=PREDICATE 'ὑπάρχων' [V-PAP-NSM] }`

- 分詞節の fn=ADVERBIAL が governing clause への attachment を明示
- Attachment target: SR 上の parent clause (tree containment による)
- 具体的な「どの動詞に付く」という pointer は存在しない

**Grade: B** — governing clause は tree から取得可能; attachment target word は not explicit

**例: ROM 6:9** `clause fn=ADVERBIAL { token fn=PREDICATE 'ἐγερθεὶς' [V-APP-NSM], phrase.pp fn=ADVERBIAL }`

同じパターン。Grade: **B**

### B-3. 出席状況 (Attendant Circumstance)

**例: MAT 28:18** `clause { token fn=PREDICATE 'προσελθὼν' [V-2AAP-NSM], token fn=PREDICATE 'ἐλάλησεν' [V-AAI-3S], ... }`

- 同一 clause に fn=PREDICATE が2つ存在
- SR は attendant circumstance を明示しない
- どちらが「主動詞」でどちらが「attendant」かは morph (finite vs. participle) + discourse から推定

**Grade: C** — attendant circumstance の関係は明示されない

**例: MAT 28:19** `clause { token fn=PREDICATE 'πορευθέντες' [V-AOP-NPM], token fn=PREDICATE 'μαθητεύσατε' [V-AAM-2P], ... }`

同様。Grade: **C**

### B-4. Genitive Absolute

調査対象節には genitive absolute の明確例は出現しなかった。

一般的に SR は genitive absolute に特定の construction label を付与しない。participial clause が主語名詞と genitive participle から成る場合、`clause fn=ADVERBIAL` として処理されると推定されるが、「主節の主語と異なるgenitive subject を持つ絶対分詞構文」という関係は SR に明示されない。

**Grade: C** — 調査から推定; 明示的 construction がない場合 morph (genitive case) + context から推論が必要

### B-5. Adverbial Type (temporal / causal / concessive 等)

SR は fn=ADVERBIAL の「意味種別」を明示しない。

ὅτι causal vs. ὅτι content: construction が `SUBORDINATE_CLAUSE` か `CONTENT_CLAUSE` かで一部区別できるが、causal ὅτι は `SUBORDINATE_CLAUSE fn=ADVERBIAL` として処理されることが多く、その場合 conjunction トークン ὅτι を参照する必要がある。ὅτι 自体は context/discourse 依存で causal/content/epexegetic が区別されない。

**Grade: B/C** — conjunction から種別を推定できる場合もあるが、意味種別は SR が明示しない

---

## Audit C — Modifier Head Attachment

### C-1. GENITIVE_MOD

**実例:** `phrase.np[GENITIVE_MOD] { 'μορφῇ' [N-DSF], 'θεοῦ' [N-GSM] }` (PHP 2:5)

- 非属格 token = head (`μορφῇ`)
- 属格 token = modifier (`θεοῦ`)
- `GENITIVE_MOD` construction が modifier-head 関係を明示
- morph case で head/modifier の区別が可能

**Grade: A** — 明示的。`GENITIVE_MOD` construction + morph case から直接取得

### C-2. ADJ_MOD

**実例1 (adjective + noun):** `phrase.np[ADJ_MOD] { 'παλαιὸς' [A-NSM], phrase.np[GENITIVE_MOD] { 'ἡμῶν', 'ἄνθρωπος' } }` (ROM 6:6)

- 形容詞が先頭, 名詞が後続
- `ADJ_MOD` construction が関係を明示
- head/modifier の区別は位置と morph (形容詞 vs. 名詞) による

**Grade: B** — `ADJ_MOD` construction は関係を示すが; head/modifier の明示 field はない

**実例2 (article + noun):** `phrase.np[ADJ_MOD] { 'τὰ' [T-NPN], 'πάντα' [A-NPN] }` (COL 1:16)

- Article + adjective/pronoun の単純グループ化
- どちらが head かは morph から推定

**Grade: B** — 位置と morph に依存

**実例3 (participle clause):** `phrase.np[ADJ_MOD] fn=SUBJECT { 'ἄνθρωπος', clause { 'ἀπεσταλμένος' } }` (JHN 1:6)

- token child = head, clause child = modifier
- 明示的分離可能

**Grade: A** — token/clause の型で直接取得可能

### C-3. PREP_PHRASE

**実例:** `phrase.pp[PREP_PHRASE] { 'ἐν' [PREP], 'ἀρχῇ' [N-DSF] }` (JHN 1:1)

- 第一子 = 前置詞 (morph=PREP)
- 後続 = 支配 NP
- `PREP_PHRASE` construction と morph PREP で分離可能

**Grade: A** — prep/governed-NP の分離は直接取得可能

PP が修飾する head (governing word) への link:

- PP の fn label が governing clause への機能を示す (fn=ADVERBIAL, fn=COMPLEMENT 等)
- しかし「具体的にどの語を修飾するか」は SR に明示されない (tree containment のみ)

**Grade: B** — function in clause は A; specific head word は tree containment のみ (B)

### C-4. ARTICULAR_NP (article + noun)

**実例:** `phrase.np[ARTICULAR_NP] { 'ὁ' [T-NSM], 'λόγος,' [N-NSM] }`

- Article + noun をグループ化
- どちらが head (noun) かは type (token) と morph (T-* article vs. N-* noun) から判定

**Grade: B** — `ARTICULAR_NP` construction は関係を示すが; article vs. noun head の明示 field はない

### C-5. APPOSITION

**実例:** `phrase.np[APPOSITION] { 'Χριστὸν', 'Ἰησοῦν' }` (ROM 6:3)

- `APPOSITION` construction が apposition 関係を明示
- 2要素が shared referent を持つことは construction から明示
- どちらが head (被修飾) でどちらが appositive かは位置依存 (第一子 = head)

**Grade: A** — apposition 関係は construction で明示; head の同定は B (位置)

### C-6. ADV_MOD

**実例:** `phrase.np[ADV_MOD] fn=SUBJECT { 'καὶ', 'ἡμεῖς,' [P-1NP] }` (ROM 6:4)

- `ADV_MOD` construction が副詞的修飾関係を明示
- token child = head (ἡμεῖς), adverbial particle = modifier (καὶ)
- morph/type から分離可能

**Grade: B** — 修飾関係は construction で示されるが; head/modifier の明示 field なし

### C-7. NP_COMPLEX

**実例:** `phrase.np[NP_COMPLEX] { 'πᾶσα', phrase.np[PREP_PHRASE] { 'ἐξουσία', ... } }` (MAT 28:18)

- 複数 NP 要素のグループ化 construction
- head/modifier の明示的区分なし
- 位置と morph に依存

**Grade: B** — グループ化は明示; head の明示 field なし

---

## Audit D — Coordination

### D-1. COORDINATION construction

**実例:** `clause[COORDINATION]` (JHN 1:1) — 3節を包む coordination container

- Coordination members は construction の直接子 (clause または group)
- `COORDINATION` construction が coordination 関係を明示

**Grade: A** — coordination container と members は直接取得可能

### D-2. Group node + conjunction

**実例:** `group { 'καὶ' [CONJ], clause { ... } }` — coordination の追加要素

- conjunction token が group の第一子として存在
- coordination member が conjunction に後続
- 複数要素の coordination: `clause`, `group { καὶ, clause }`, `group { καὶ, clause }` (JHN 1:1)

**Grade: A** — conjunction は group 内で直接取得可能

### D-3. Coordinated members が同一 functional slot かどうか

**実例:** `phrase.pp[COORDINATION]` (MAT 28:18) — 2つの PREP_PHRASE が coordination

- COORDINATION node が fn label を持つ場合 (e.g., fn=ADVERBIAL): members が同一機能で接続されることが明示
- COORDINATION node が fn を持たない場合: 各 member の fn は個別に参照が必要

**Grade: A** — COORDINATION node の fn が親への機能を明示; members の均質性は construction から取得

### D-4. 等位節の attachment 先

- COORDINATION node の親 clause が attachment 先
- tree containment から直接取得可能

**Grade: A**

### D-5. 評価

| 項目 | Grade |
|---|---|
| COORDINATION container | A |
| Coordinated members 識別 | A |
| Conjunction in group | A |
| Member 機能の一致 | A (COORDINATION fn による) |
| Attachment 先 (parent clause) | A (tree containment) |
| 等位接続の semantic type | B (conjunction token から推定) |

---

## Audit E — Subordinate Clause Attachment

### E-1. 従属節の construction type

| Construction | 例 | Grade |
|---|---|---|
| `SUBORDINATE_CLAUSE fn=ADVERBIAL` | ROM 6:1 (ἵνα), 6:4 (ὥσπερ), 6:5 (εἰ), 6:8 (εἰ) | A — type + function 両方明示 |
| `CONTENT_CLAUSE fn=OBJECT` | ROM 6:3 (ὅτι), 6:6 (ὅτι), 6:8 (ὅτι), 6:9 (ὅτι) | A — content clause として明示 |
| `NOMINALIZED_CLAUSE fn=ADVERBIAL` | ROM 6:6 (τοῦ δουλεύειν) | A — articular infinitive として明示 |
| `CONJOINED_CLAUSE` | 多数 | A — leading conjunction として明示 |
| `CLAUSE_AS_NP fn=OBJECT` | MAT 28:19 (πάντα ὅσα) | A — NP として機能する clause |
| relative clause (no construction label) | ROM 6:2, 6:10, COL 1:15 | B — clause 型のみ; relative と明示されない |

### E-2. Governing clause の識別

- 従属節の parent node が governing clause
- tree containment から直接取得可能

**Grade: A** — governing clause は tree containment で明示

### E-3. Attachment target (specific word)

- fn=ADVERBIAL は「動詞への副詞的付着」を示す
- しかし「具体的にどの動詞に付く」という pointer は存在しない
- ROM 6:4 の ἵνα 節: parent clause の `token fn=PREDICATE 'συνετάφημεν'` が target だが SR に明示なし

**Grade: B** — attachment word の特定は tree 構造 + 文脈推定が必要

### E-4. 意味種別の判定

| Conjunction | 種別 | SR での扱い | Grade |
|---|---|---|---|
| ἵνα | 目的 | SUBORDINATE_CLAUSE fn=ADVERBIAL + ἵνα token | A |
| ὥσπερ | 比較 | SUBORDINATE_CLAUSE fn=ADVERBIAL + ὥσπερ token | A |
| εἰ / Εἰ | 条件 | SUBORDINATE_CLAUSE fn=ADVERBIAL + εἰ token | A |
| ὅτι (causal) | 原因 | SUBORDINATE_CLAUSE fn=ADVERBIAL + ὅτι token | B (content ὅτι との区別は文脈依存) |
| ὅτι (content) | 内容 | CONTENT_CLAUSE fn=OBJECT + ὅτι token | A (CONTENT_CLAUSE で明示) |
| ὅς/ὃ (relative) | 関係 | 明示 construction なし | D |

---

## Audit F — Infinitive Structure

### F-1. Basic infinitive (finite verb の object/complement)

直接観察例なし。MAT 28:19 の `τηρεῖν` は clause 内の fn=PREDICATE として現れる (AcI 構造)。

### F-2. AcI — Accusative + Infinitive

**実例: MAT 28:19**

```
clause fn=OBJECT
  token fn=SUBJECT "αὐτοὺς" [P-APM]    ← accusative = infinitive subject
  token fn=PREDICATE "τηρεῖν" [V-PAN]  ← infinitive
  phrase.np fn=OBJECT "πάντα ὅσα ἐνετειλάμην"
```

- fn=SUBJECT on accusative pronoun `αὐτοὺς` が infinitive subject を **明示**
- infinitive は fn=PREDICATE で識別
- infinitive の object も fn=OBJECT で識別

**Grade: A** — SR が AcI structure を fn labels で完全に明示

### F-3. Articular Infinitive (NOMINALIZED_CLAUSE)

**実例: ROM 6:6**

```
clause[NOMINALIZED_CLAUSE] fn=ADVERBIAL
  token "τοῦ" [T-GSN]                  ← genitive article
  clause
    token fn=SUBJECT "ἡμᾶς" [P-1AP]   ← infinitive subject
    token fn=PREDICATE "δουλεύειν" [V-PAN]  ← articular infinitive
    phrase.np fn=OBJECT "τῇ ἁμαρτίᾳ"
```

- `NOMINALIZED_CLAUSE` construction が articular infinitive を明示
- 内部に fn=SUBJECT が存在し, infinitive subject が直接取得可能

**Grade: A** — NOMINALIZED_CLAUSE construction + fn labels で完全に明示

### F-4. COL 1 の κατοικῆσαι

```
clause
  phrase.pp fn=ADVERBIAL "ἐν αὐτῷ"
  phrase.np fn=SUBJECT { 'πᾶν τὸ πλήρωμα' }
  token fn=PREDICATE "κατοικῆσαι" [V-AAN]
```

- infinitive が fn=PREDICATE
- SUBJECT が fn=SUBJECT で明示

**Grade: A**

### F-5. 評価

| 項目 | Grade |
|---|---|
| Infinitive token 識別 (V-*AN morph) | A |
| Infinitive fn=PREDICATE | A |
| AcI — accusative subject as fn=SUBJECT | A |
| Articular infinitive (NOMINALIZED_CLAUSE) | A |
| Infinitive object (fn=OBJECT) | A |
| Bare infinitive functional role (complement vs. object) | A (fn label による) |

---

## Audit G — Apposition

### G-1. APPOSITION construction の存在

**実例: ROM 6:3** `phrase.np[APPOSITION] { 'Χριστὸν' [N-ASM], 'Ἰησοῦν' [N-ASM] }`

- `APPOSITION` construction が apposition 関係を明示
- 2 token children が同一 referent を共有することは construction から取得可能

**Grade: A** — APPOSITION construction で関係は明示

### G-2. Head vs. Appositive の区別

APPOSITION construction は head/appositive の明示フィールドを持たない。
第一子 = head、第二子以降 = appositive というのは **位置的慣習**。

COL 1:14 `phrase.np[APPOSITION] fn=OBJECT { 'τὴν ἀπολύτρωσιν', 'τὴν ἄφεσιν τῶν ἁμαρτιῶν' }`:
- 両者が fn=OBJECT の APPOSITION 内のメンバー
- 第一子がより基本的な概念、第二子が説明的だが SR は明示しない

**Grade: B** — 位置慣習による推定

### G-3. 複合 APPOSITION

COL 1:15 `phrase.np[COMPLEMENT] fn=COMPLEMENT [APPOSITION] { GENITIVE_MOD { εἰκὼν, τοῦ θεοῦ τοῦ ἀοράτου }, GENITIVE_MOD { πρωτότοκος, πάσης κτίσεως } }`:
- 2つの GENITIVE_MOD が APPOSITION 内で並置
- 両方が COMPLEMENT としての同一機能を持つ
- APPOSITION construction が parallel relationship を明示

**Grade: A** — 複合 APPOSITION も construction で明示

---

## Audit H — Compound / Periphrastic Verbal Structure

### H-1. COPULAR_VP — 完全 periphrastic 明示

**実例: EPH 2:8** `phrase.vp[COPULAR_VP] fn=PREDICATE { 'ἐστε' [V-PAI-2P], 'σεσῳσμένοι' [V-RPP-NPM] }`

- `COPULAR_VP` construction が finite copula + participle を明示的にグループ化
- periphrastic perfect passive の両要素が単一 PREDICATE として識別可能

**Grade: A** — COPULAR_VP construction で完全に明示

### H-2. Participial Copula (γενόμενος, ὤν 等)

**実例: PHP 2:7** `clause fn=ADVERBIAL { token fn=COPULA 'γενόμενος' [V-2ADP-NSM], token fn=COMPLEMENT 'ὑπήκοος' }`

- participial copula が fn=COPULA で明示
- COPULA function で finite copula と同一役割を担うことを SR が明示

**Grade: A** — fn=COPULA が participial copula を明示

### H-3. 複数 PREDICATE (attendant circumstance)

**実例: MAT 28:18** `clause { token fn=PREDICATE 'προσελθὼν' [V-2AAP-NSM], token fn=PREDICATE 'ἐλάλησεν' [V-AAI-3S], ... }`

- 同一 clause に fn=PREDICATE が2つ
- どちらが「主動詞」でどちらが「attendant」かは morph (participle vs. finite) から推定
- SR は「attendant circumstance」という semantic category を明示しない

**Grade: C** — attendant circumstance の関係は明示されない

### H-4. AUX slot

**実例: MAT 28:20** `token fn=AUX 'ἰδοὺ' [V-2AMM-2S] role=aux`

- fn=AUX が auxiliary element を明示
- 通常の PREDICATE/COPULA と区別されている

**Grade: A** — fn=AUX で明示

---

## Audit I — Main Predication Readiness

### I-1. 主要 function labels

全対象節を通じて確認された function labels:

| fn label | 意味 | 実例 | Grade |
|---|---|---|---|
| `fn=SUBJECT` | 主語 | JHN 1:1 `ὁ λόγος`, ROM 6:2 `οἵτινες`, MAT 28:18 `ὁ Ἰησοῦς` | A |
| `fn=PREDICATE` | 動詞述語 | ROM 6:1 `ἐροῦμεν`, MAT 28:18 `ἐλάλησεν` | A |
| `fn=COPULA` | 繋辞 | JHN 1:1 `ἦν`, MAT 28:20 `εἰμι` | A |
| `fn=OBJECT` | 目的語 | ROM 6:1 `Τί`, MAT 28:19 `πάντα τὰ ἔθνη` | A |
| `fn=COMPLEMENT` | 補語 | JHN 1:1 `θεὸς`, JHN 1:1 `ἐν ἀρχῇ` | A |
| `fn=INDIRECT_OBJECT` | 間接目的語 | MAT 28:18 `αὐτοῖς`, `μοι` | A |
| `fn=AUX` | 補助要素 | MAT 28:20 `ἰδοὺ` | A |
| `fn=OBJECT2` | 第二目的語 | PHP 2:5 `ἁρπαγμὸν` | A |
| `fn=ADVERBIAL` | 副詞的要素 | 多数 | A |

全ての主要 predication 機能が fn labels から直接取得可能。

**Grade: A** — main predication の全 function labels が SR に明示

### I-2. Verbless clause

**実例: MAT 5:3** `clause { token fn=COMPLEMENT 'Μακάριοι', phrase.np fn=SUBJECT { οἱ πτωχοὶ... } }` — PREDICATE/COPULA なし

- fn=SUBJECT と fn=COMPLEMENT が存在
- fn=COPULA/PREDICATE の不在が verbless を示す
- DG の `noVerb` 判定は fn labels の不在から取得可能

**Grade: A** — verbless は PREDICATE/COPULA の不在から直接判定

### I-3. Pro-Drop (implied subject)

Greek 動詞は person/number を語形に含む。SR は implied subject を追加しない。

**実例: EPH 2:8** `clause { phrase.np fn=ADVERBIAL, phrase.vp[COPULAR_VP] fn=PREDICATE, phrase.pp fn=ADVERBIAL }` — fn=SUBJECT なし

- `ἐστε` [V-PAI-2P] の "2nd person plural" は morph から推定可能だが SR に明示なし

**Grade: B** — morph から推定可能; SR は implied subject を追加しない

### I-4. Inverted word order での predication

**実例: JHN 1:1 clause 3:** `{ fn=COMPLEMENT 'θεὸς', fn=COPULA 'ἦν', fn=SUBJECT 'ὁ λόγος' }` — VSO ではなく OSV 順

- fn labels が語順に関わらず主語・述語・補語を明示
- R-K diagram の正しい水平配置が fn labels から直接取得可能

**Grade: A** — 語順に依存しない function 識別が SR で実現

---

## まとめ

### Grade A (Explicitly represented) — 確認済み

1. Main predication function labels (SUBJECT/PREDICATE/COPULA/OBJECT/COMPLEMENT/INDIRECT_OBJECT/AUX)
2. Verbless clause (PREDICATE/COPULA の不在から判定)
3. COORDINATION construction + members + conjunctions
4. CONJOINED_CLAUSE construction + conjunction token
5. SUBORDINATE_CLAUSE / CONTENT_CLAUSE / NOMINALIZED_CLAUSE types
6. Conjunction tokens (purpose/conditional/comparative 等で種別判定)
7. COPULAR_VP (periphrastic 構造の明示)
8. fn=COPULA (participial copula の明示)
9. ACI — infinitive subject as fn=SUBJECT in accusative
10. Articular infinitive (NOMINALIZED_CLAUSE construction)
11. GENITIVE_MOD — head/modifier 区別
12. ADJ_MOD — clause child (modifier) vs. token (head)
13. PREP_PHRASE — preposition vs. governed NP
14. APPOSITION construction
15. Relative pronoun の節内 function (fn=SUBJECT/OBJECT/ADVERBIAL)
16. fn=AUX

### Grade B (Indirectly represented) — 推定可能だが明示的 field なし

1. Adverbial participle の governing clause (tree containment)
2. PP の attachment target word (tree containment)
3. Governing word of subordinate clause (tree containment)
4. Head vs. appositive in APPOSITION (position)
5. Article vs. noun head in ARTICULAR_NP (morph)
6. ADJ_MOD internal head (morph/token-type)
7. ADV_MOD internal head (morph/position)
8. NP_COMPLEX internal head
9. Pro-drop implied subject (verb morph)
10. Coordinated member の semantic parallel (construction 型から類推)
11. Causal ὅτι vs. content ὅτι (context 依存)

### Grade C (Inference required) — L-0 境界に関わる

1. Attendant circumstance vs. coordinated predicate (複数 fn=PREDICATE)
2. Genitive absolute (morph + subject 相違から推定)
3. Adjectival vs. adverbial participle (ADJ_MOD なしの場合)
4. Predicate nominative subtype (semantic/referential 判断が必要)
5. Restrictive vs. non-restrictive apposition

### Grade D (Not represented) — Schema Gap

1. **Relative pronoun → antecedent explicit link** ← P5-D.1 確認済み
2. **RELATIVE_CLAUSE construction** — SR の 17 construction 種に存在しない
3. Semantic type of adverbial clause (causal/concessive/result 等の明示)
4. Discourse-level pro-drop subject identification

---

*詳細: P6-A_relationship_matrix.md / P6-A_test_matrix.md / P6-A_final_report.md*
