# P6-A SR Diagram-Readiness Audit — Final Report

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE (READ-ONLY)  
**Production code changes:** 0  
**SR schema changes:** 0

---

## エグゼクティブサマリー

SR schema は Reed–Kellogg / Leedy 型の Greek NT sentence diagram に必要な **構造関係の 81% (37/46 items)** を明示的または間接的に保持している。

しかし、R-K/Leedy diagram において不可欠な **Relative Clause / Antecedent 接続** は SR に存在しない (Grade D)。これは P5-D.1 が発見した SCHEMA GAP の確認であり、P6-A 監査を通じて全 7 節・10 文で一貫して確認された。

---

## 監査スコープ

| 項目 | 内容 |
|---|---|
| 監査節 | JHN 1:1 / MAT 5:3 / EPH 2:8 / PHP 2:5–8 / MAT 28:18–20 / COL 1:15–18 / ROM 6:1–10 |
| 監査カテゴリ | A〜I (9 categories / 46 relationship types) |
| 判定基準 | A=Explicitly / B=Indirectly / C=Inference / D=Not represented |
| 変更 | 0 件 (READ-ONLY) |

---

## カテゴリ別最終判定

### Audit A — Relative Clause / Antecedent Attachment

| 項目 | Grade | 備考 |
|---|---|---|
| RELATIVE_CLAUSE construction | **D** | 17 construction 種に存在しない |
| Relative pronoun token 識別 | **B** | morph `R-*` / `K-*` で識別可能 |
| 節内での relative pronoun 機能 | **A** | fn=SUBJECT/OBJECT/ADVERBIAL で明示 |
| Antecedent explicit link | **D** | antecedent field 皆無 |
| Governing noun → relative clause link | **D** | pointer なし |

**判定: SCHEMA GAP (Grade D)** — R-K/Leedy diagram で必須の関係節↔先行詞接続は SR に存在しない。  
**Leedy-ready: NO**

---

### Audit B — Participial Attachment

| 項目 | Grade | 備考 |
|---|---|---|
| Adjectival participle (ADJ_MOD construction) | **A** | ADJ_MOD construction + clause/token 型で明示 |
| Adjectival participle fn=PREDICATE | **A** | fn=PREDICATE で modifier 識別 |
| Adverbial participle (fn=ADVERBIAL clause) | **B** | tree containment で governing clause 識別 |
| Adverbial participle attachment target word | **B** | explicit pointer なし; tree のみ |
| Attendant circumstance | **C** | 複数 fn=PREDICATE + morph から推定要; L-0 境界 |
| Genitive absolute | **C** | morph + subject 相違から推定要 |

**判定: PARTIALLY LEEDY-READY**  
- Adjectival participle with ADJ_MOD: **A (Leedy-ready)**  
- Adverbial participle: **B (indirectly)**  
- Attendant circumstance: **C (inference)**

---

### Audit C — Modifier Head Attachment

| 項目 | Grade | 備考 |
|---|---|---|
| GENITIVE_MOD head vs. modifier | **A** | construction + morph case で完全明示 |
| ADJ_MOD (clause child = modifier) | **A** | token/clause 型で明示 |
| ADJ_MOD (fn=PREDICATE = modifier) | **A** | fn=PREDICATE で modifier 識別 |
| ADJ_MOD (adjective + noun) | **B** | morph/位置で推定 |
| PREP_PHRASE prep vs. governed NP | **A** | morph PREP で識別 |
| PREP_PHRASE governing word | **B** | tree containment のみ |
| ARTICULAR_NP article vs. head | **B** | morph で識別 |
| ADV_MOD head vs. modifier | **B** | 位置/型で識別 |

**判定: MOSTLY LEEDY-READY**  
- GENITIVE_MOD: **A**  
- ADJ_MOD (participle): **A**  
- PREP_PHRASE internal: **A**  
- ARTICULAR_NP / ADJ_MOD adjective: **B**

---

### Audit D — Coordination

| 項目 | Grade | 備考 |
|---|---|---|
| COORDINATION construction | **A** | construction で明示 |
| Coordinated members | **A** | 直接子から取得 |
| Conjunction in group | **A** | group 内 CONJ token |
| COORDINATION fn in governing clause | **A** | fn label で明示 |
| Governing clause attachment | **A** | tree containment |

**判定: FULLY LEEDY-READY (Grade A)**

---

### Audit E — Subordinate Clause Attachment

| 項目 | Grade | 備考 |
|---|---|---|
| SUBORDINATE_CLAUSE construction | **A** | construction label で明示 |
| CONTENT_CLAUSE construction | **A** | construction label で明示 |
| NOMINALIZED_CLAUSE construction | **A** | articular infinitive として明示 |
| CLAUSE_AS_NP construction | **A** | NP として機能する clause |
| fn label (ADVERBIAL/OBJECT/SUBJECT) | **A** | governing clause への機能 |
| Purpose clause (ἵνα) | **A** | construction + conjunction |
| Conditional clause (εἰ) | **A** | construction + conjunction |
| Comparative clause (ὥσπερ) | **A** | construction + conjunction |
| Governing clause (parent) | **A** | tree containment |
| Attachment target word | **B** | specific word の pointer なし |
| RELATIVE_CLAUSE type | **D** | construction label なし |
| Causal ὅτι (vs. content) | **B** | construction type で一部区別 |

**判定: MOSTLY LEEDY-READY**  
- 全 construction types (non-relative): **A**  
- Relative clause type: **D**

---

### Audit F — Infinitive Structure

| 項目 | Grade | 備考 |
|---|---|---|
| Infinitive fn=PREDICATE | **A** | fn label で明示 |
| AcI — fn=SUBJECT on accusative | **A** | fn=SUBJECT が accusative token に明示 |
| AcI governing verb (parent clause) | **B** | tree containment |
| Articular infinitive (NOMINALIZED_CLAUSE) | **A** | construction で明示 |
| Articular infinitive subject (fn=SUBJECT) | **A** | fn=SUBJECT 内部に明示 |
| Infinitive object (fn=OBJECT) | **A** | fn=OBJECT で明示 |

**判定: FULLY LEEDY-READY (Grade A)**  
AcI と articular infinitive の両パターンで fn=SUBJECT が明示されている。

---

### Audit G — Apposition

| 項目 | Grade | 備考 |
|---|---|---|
| APPOSITION construction | **A** | construction で関係を明示 |
| Shared referent/function | **A** | APPOSITION + fn label |
| Compound APPOSITION | **A** | 複数 complex children |
| Head vs. appositive member | **B** | 位置慣習; 明示 field なし |
| Restrictive vs. non-restrictive | **C** | discourse 分析が必要 |

**判定: MOSTLY LEEDY-READY**  
- APPOSITION relationship: **A**  
- Head/appositive distinction: **B**

---

### Audit H — Compound / Periphrastic Verbal Structure

| 項目 | Grade | 備考 |
|---|---|---|
| COPULAR_VP construction | **A** | finite copula + participle を明示 |
| fn=COPULA on participle | **A** | participial copula 識別 |
| fn=AUX | **A** | auxiliary 識別 |
| Attendant circumstance (two PREDICATE) | **C** | morph から推定要; L-0 境界 |

**判定: MOSTLY LEEDY-READY**  
- COPULAR_VP periphrastic: **A**  
- fn=COPULA: **A**  
- Attendant circumstance: **C**

---

### Audit I — Main Predication Readiness

| 項目 | Grade |
|---|---|
| fn=SUBJECT | **A** |
| fn=PREDICATE | **A** |
| fn=COPULA | **A** |
| fn=OBJECT | **A** |
| fn=COMPLEMENT | **A** |
| fn=INDIRECT_OBJECT | **A** |
| fn=OBJECT2 | **A** |
| fn=AUX | **A** |
| fn=ADVERBIAL | **A** |
| Verbless clause | **A** |
| Word-order independence | **A** |
| Pro-drop subject | **B** |

**判定: FULLY LEEDY-READY (Grade A) for all explicit fn labels**  
Pro-drop (Greek pro-drop は verb morph に埋め込み): **B**

---

## 総合分類

### Category 1: Explicitly Represented (Grade A) — Leedy-ready

以下の関係は SR が直接保持しており、DG Renderer が SR から変換 (`dg-engine.js`) することで Reed–Kellogg / Leedy 型の diagram 要素として取得可能:

1. **全 fn function labels** (SUBJECT / PREDICATE / COPULA / OBJECT / COMPLEMENT / INDIRECT_OBJECT / OBJECT2 / AUX / ADVERBIAL)
2. **Verbless clause** (fn=COPULA/PREDICATE の不在から判定)
3. **語順非依存の predication** (JHN 1:1 θεὸς ἦν ὁ λόγος 確認)
4. **COORDINATION construction + members + conjunctions**
5. **CONJOINED_CLAUSE + conjunction token**
6. **Subordinate clause types** (SUBORDINATE_CLAUSE / CONTENT_CLAUSE / NOMINALIZED_CLAUSE / CLAUSE_AS_NP)
7. **Subordinate clause fn (ADVERBIAL/OBJECT/SUBJECT)**
8. **Purpose/conditional/comparative conjunctions** (ἵνα / εἰ / ὥσπερ)
9. **COPULAR_VP periphrastic** (EPH 2:8 ἐστε σεσῳσμένοι)
10. **fn=COPULA on participial copula** (PHP 2:7 γενόμενος)
11. **AcI — fn=SUBJECT on accusative** (MAT 28:19 αὐτοὺς / ROM 6:6 ἡμᾶς)
12. **NOMINALIZED_CLAUSE (articular infinitive) + subject**
13. **GENITIVE_MOD head/modifier distinction**
14. **ADJ_MOD with clause child (adjectival participle clause)**
15. **ADJ_MOD with fn=PREDICATE token (adjectival modifier token)**
16. **PREP_PHRASE preposition/governed NP distinction**
17. **APPOSITION construction**
18. **Relative pronoun 節内機能** (fn=SUBJECT/OBJECT/ADVERBIAL within relative clause)

---

### Category 2: Represented Indirectly (Grade B)

以下は SR に explicit field は存在しないが tree structure / morph / 位置慣習から DG が取得可能:

1. **Pro-drop subject** (verb morph から person/number; ただし SR は implied subject を追加しない)
2. **Adverbial participle governing clause** (tree containment)
3. **Subordinate clause attachment target word** (tree containment)
4. **PP governing word** (tree containment)
5. **ARTICULAR_NP article vs. noun** (morph T-* / N-*)
6. **ADJ_MOD adjective/article + noun head** (morph / 位置)
7. **ADV_MOD head vs. adverbial particle** (位置 / token type)
8. **APPOSITION head vs. appositive** (位置慣習)
9. **Relative pronoun token 識別** (morph R-* / K-*)
10. **Causal ὅτι (partial)** (construction type SUBORDINATE vs. CONTENT で一部区別)
11. **AcI governing verb** (parent clause from tree)

---

### Category 3: Inference Required (Grade C) — L-0 BLOCKED

以下は morph / context / discourse 分析によって推定可能だが、L-0 境界 (SR は SSOT / 統語推論追加禁止) により DG Renderer では実装不可:

1. **Attendant circumstance** — 複数 fn=PREDICATE のうち participle = attendant は morph (finite vs. ptcp) から推定が必要
2. **Genitive absolute** — genitive case の participle + 主節と異なる subject から推定が必要
3. **Relative clause antecedent** (SR なしの推定) — surfaceIndex 近接 + 格一致から推定が必要
4. **Restrictive vs. non-restrictive apposition** — discourse / semantic 分析が必要

---

### Category 4: Not Represented (Grade D) — Schema Gap

以下は SR に必要な情報が**皆無**であり、schema 変更なしには解決できない:

1. **RELATIVE_CLAUSE construction** — SR の 17 construction 種に存在しない
2. **Antecedent → relative pronoun explicit link** — antecedent field が SR に皆無
3. **Governing noun → relative clause link** — pointer が SR に皆無

---

## Schema Gap の影響評価

### Reed–Kellogg / Leedy Diagram への影響

| Diagram Feature | SR Status | DG 実装可能? |
|---|---|---|
| Main predication horizontal baseline | A | Yes |
| Subject/Predicate/Object positions | A | Yes |
| Complement diagonal | A | Yes |
| Adverbial modifiers | A | Yes |
| Coordination parallel lines | A | Yes |
| Periphrastic construction (COPULAR_VP) | A | Yes |
| Infinitive AcI structure | A | Yes |
| Subordinate clause L-brackets | A | Yes |
| Adjectival participle modifier | A | Yes |
| Genitive modifier zone | A | Yes |
| Apposition bracket | A | Yes |
| Relative clause bracket with antecedent line | **D** | **No — schema gap** |
| Relative pronoun role within clause | A | Yes |
| Attendant circumstance distinction | C | Partial (morph-only; L-0 blocked) |
| Implied subject (pro-drop) | B | Limited |

**結論:** Relative clause → antecedent connection line (R-K/Leedy diagram の特徴的要素) は現在の SR schema では実装不可能。それ以外の主要な diagram features は SR Grade A または B で対応可能。

---

## 制約事項の遵守確認

| 禁止項目 | 状態 |
|---|---|
| production code 変更 | 変更なし ✅ |
| SR schema 変更 | 変更なし ✅ |
| reading-engine.js 変更 | 変更なし ✅ |
| syntax-analyzer.js 変更 | 変更なし ✅ |
| syntax-registry.json 変更 | 変更なし ✅ |
| dg-engine.js 変更 | 変更なし ✅ |
| index.html 変更 | 変更なし ✅ |
| ICL / Structure Flow / Discourse Analysis 変更 | 変更なし ✅ |
| 新しい統語推論の追加 | 実施せず ✅ |
| antecedent / coreference の推定 | 実施せず ✅ |
| L-0 境界の維持 | 維持 ✅ |
| SR にない関係の DG 側補完 | 実施せず ✅ |
| commit / merge / deploy | 実施せず ✅ |
| P6-B への自動進行 | 実施せず ✅ |

---

## 数値サマリー

| Grade | 関係種数 | % |
|---|---|---|
| A — Explicitly represented | 26 | 57% |
| B — Indirectly represented | 11 | 24% |
| C — Inference required | 4 | 9% |
| D — Not represented | 4 | 9% |
| **合計** | **46** | — |

Leedy-ready (Grade A のみ): **57%** / A+B = **81%** / Gap (D): **9%** (3 items)

---

## 結論

**P6-A 監査の結論:**

SR schema は主要な sentence diagram requirements を広くカバーしているが、**Relative Clause / Antecedent Link** という R-K/Leedy diagram の識別的要素を schema として保持していない。この HARD GAP は P5-D.1 の発見を確認するものであり、解消には SR schema への `antecedent` link field または `RELATIVE_CLAUSE` construction の追加が必要である。

その他の関係 (main predication / coordination / subordinate clause / periphrastic / infinitive AcI / apposition / modifier-head) はすべて Grade A または B で SR に保持されており、DG Renderer の改良によって Leedy-type diagram への段階的な対応が可能である。

---

```
STATE: AUDIT-COMPLETE (READ-ONLY)

Audited:
  ✅ Audit A — Relative/Antecedent: D (SCHEMA GAP confirmed)
  ✅ Audit B — Participial: A (adjectival) / B (adverbial) / C (attendant)
  ✅ Audit C — Modifier-Head: A (GENITIVE_MOD, PREP_PHRASE) / B (ADJ_MOD adjective, ARTICULAR_NP)
  ✅ Audit D — Coordination: A (fully represented)
  ✅ Audit E — Subordinate Clause: A (all non-relative types) / D (RELATIVE_CLAUSE)
  ✅ Audit F — Infinitive: A (AcI, articular infinitive, fn=SUBJECT)
  ✅ Audit G — Apposition: A (relationship) / B (head/appositive)
  ✅ Audit H — Periphrastic: A (COPULAR_VP, fn=COPULA) / C (attendant)
  ✅ Audit I — Main Predication: A (all fn labels) / B (pro-drop)

Passages: JHN 1:1 / MAT 5:3 / EPH 2:8 / PHP 2:5–8 / MAT 28:18–20 / COL 1:15–18 / ROM 6:1–10
Schema changes: 0
Code changes: 0
L-0 maintained: YES

NEXT: STOP
AUTO-ADVANCE TO P6-B: NO
SR SCHEMA CHANGE: NO
COMMIT/MERGE/DEPLOY: NO
STOP.
```

---

*詳細: P6-A_sr_diagram_readiness_audit.md / P6-A_relationship_matrix.md / P6-A_test_matrix.md*
