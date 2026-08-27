# P6-B Relative Clause / Antecedent Schema Design Audit

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE (READ-ONLY)  
**Production code changes:** 0  
**SR schema changes:** 0

---

## Audit A — Current SR Schema Reality

### A-1. Node-level Schema (実コードと実データより確認)

全 260 SR ファイル (NT 全 27 書・全章) をスキャンして確認したフィールド:

**Node fields (全 type 共通):**
```
id, type, tokenIds, construction, evidence, children, parentId, surfaceIndex, text, morphCategory, function, flags
```

**type 値:** `clause`, `group`, `phrase.np`, `phrase.pp`, `phrase.vp`, `token`

**construction sub-fields:**
```
canonical, axis, sourceRule, derivedFrom, note, status
```

**construction.canonical 値 (全 17):**
```
ADJ_MOD, ADV_MOD, APPOSITION, ARTICULAR_NP, CLAUSE_AS_NP, CONJOINED_CLAUSE,
CONTENT_CLAUSE, COORDINATION, COPULAR_VP, DEMO_MOD, GENITIVE_MOD,
NOMINALIZED_CLAUSE, NP_COMPLEX, NUM_MOD, PARTICIPIAL_CLAUSE, PREP_PHRASE,
SUBORDINATE_CLAUSE
```
**注: `RELATIVE_CLAUSE` は存在しない**

**function.canonical 値 (全 10):**
```
SUBJECT, PREDICATE, COPULA, OBJECT, COMPLEMENT, INDIRECT_OBJECT, OBJECT2, AUX, ADVERBIAL, UNRESOLVED
```

**evidence sub-fields:**
```
nodeId, ref, role, morph_raw, articular, clauseType, junction, predication, rule, type
```

**morphCategory 値 (全 3):**
```
infinitive, participle, relative_pronoun
```

- **全 1,676 件の R-/K-\* 形態 token が `morphCategory: ['relative_pronoun']` を持つ** (100%)
- 追加 1 件 (ACT 26:29!26 `ὁποῖος` A-NSM も relative_pronoun として分類)

**flags:** フィールドは schema に存在するが、NT 全体で値が 0 件。現在未使用。

### A-2. Link / Reference / Antecedent フィールドの不在確認

以下のフィールドを全 260 ファイルで検索: `link`, `target`, `source`, `antecedent`, `coreference`, `coref`, `relation`, `relations`, `attachment`, `relative`, `headNodeId`, `relativeTarget`, `governing`

**結果: 0 件 — これらのフィールドは SR に皆無。**

### A-3. CLAUSE_AS_NP の役割 (重要構造的発見)

`CLAUSE_AS_NP` construction は、相対節を名詞句としてラップする既存の mechanism として機能している:

```
ARTICULAR_NP fn=SUBJECT {
  token "ὁ" [T-NSM]
  phrase.np[CLAUSE_AS_NP] {
    token "θεός," [N-NSM]    ← head noun (antecedent候補)
    clause {
      token fn=SUBJECT "ὃς" [R-NSM]   ← relative pronoun
      ...predicate...
    }
  }
}
```

このパターンでは head noun と relative clause が `CLAUSE_AS_NP` 内に co-locate している。
明示的 pointer は存在しないが、tree 構造から head noun を識別可能 (Grade B)。

### A-4. bible_data における既存 referent 注釈 (決定的発見)

`bible_data` の token level に `referent` フィールドが存在する:

```json
{
  "ref": "JHN 1:3!11",
  "text": "ὃ",
  "morph": "R-NSN",
  "referent": "n43001003010",
  "role": "s"
}
```

- `referent` の値形式: `n` + 数字 (例: `n43001003010`) — SR token の `id` フィールドと同一形式
- 一部 space-separated (複数 token が antecedent: 例 `"n45016003002 n45016003004"`)
- NT-wide: 1,676 relative pronouns のうち **1,078 件 (64.3%) が referent 注釈あり**
- 残 598 件は空 (free relative / unresolved)

**この referent フィールドは MACULA (Clear Bible) 由来の既存注釈であり、推論ではない。**

reading-engine.js Stage K-3 (FROZEN 2026-07-20) には:
> "role/referent は既存注釈の転写のみ。推論しない。resolve() の japanese は不変。"

と明記されており、SR が `evidence.role` を bible_data の `role` から転写しているのと同じパターンで、`referent` → SR への転写が設計上整合する。

---

## Audit B — Relative Clause Taxonomy

### B-1. NT corpus 実データから抽出した分類

**全 1,676 件のデータに基づく:**

| 分類 | 件数 | % | 備考 |
|---|---|---|---|
| 関係代名詞 fn=OBJECT | 606 | 36.2% | 目的語的関係詞 |
| 関係代名詞 fn=SUBJECT | 548 | 32.7% | 主語的関係詞 |
| 関係代名詞 fn=null | 310 | 18.5% | 前置詞目的語等 |
| 関係代名詞 fn=ADVERBIAL | 149 | 8.9% | 副詞的関係詞 |
| 関係代名詞 fn=INDIRECT_OBJECT | 38 | 2.3% | 与格 |
| 関係代名詞 fn=COMPLEMENT | 17 | 1.0% | 補語 |
| 関係代名詞 fn=OBJECT2 | 8 | 0.5% | 第二目的語 |

**節レベルの付着パターン:**

| パターン | 件数 | Grade | 備考 |
|---|---|---|---|
| 包含 clause が fn=ADVERBIAL | 169 | B | 副詞的相対節 (先行詞は節全体) |
| 包含 clause が fn=SUBJECT | 96 | C | 自由関係詞 (先行詞 NP なし) |
| 包含 clause が fn=OBJECT | 145 | C | 自由関係詞 (先行詞 NP なし) |
| 包含 clause が fn=null | 995 | C | PHP 2:5 型 fn=null 構造コンテナ |
| CLAUSE_AS_NP 内 (head NP 識別可) | 527 | A (SR 拡張後) | head noun がCLAUSE_AS_NPの兄弟 |
| CLAUSE_AS_NP 内 (head NP 識別不可) | 14 | B | 構造的に取得可能 |

**前置詞に支配される関係詞 (ἐν ᾧ 等):**

- 全 204 件が `PREP_PHRASE` の内部に関係代名詞を持つ
- 関係詞の SR fn は fn=null (PREP_PHRASE 内での位置から判定)
- 関係詞の clause 内 grammatical role は PREP_PHRASE を通じた adverbial として処理

**自由関係詞 (free relative):**

- 241 件 (fn=SUBJECT または fn=OBJECT の包含節) が自由関係詞候補
- 先行詞 NP が存在しない
- `referent` フィールドも空 (bible_data 確認済み)
- SR では null / UNRESOLVED のまま保持するのが正しい設計

**入れ子 relative clause:**

- 複数の関係代名詞が同一節構造内に出現するケースが複数確認
- ネスト深さ 2 以上: 少数だが JHN 10, ROM 8 等で確認

### B-2. L-0 判定不可分類

| 分類 | L-0 Status | 理由 |
|---|---|---|
| Restrictive vs. non-restrictive | UNRESOLVED | discourse 判断が必要 |
| Causal relative (`ὃς γε...`) | UNRESOLVED | 意味解釈が必要 |
| Attraction (格の引き付け) | UNRESOLVED | morph + context 分析が必要 |

これらは SR では判定せず `null` のまま保持する。

---

## Audit C — What the Schema Must Represent

### C-1. 厳密な分離

| 種別 | 内容 | L-0 | 例 |
|---|---|---|---|
| Structural fact | 関係節が特定 NP に syntactically attached | PERMITTED | `CLAUSE_AS_NP` 内の兄弟 NP |
| Morphological fact | この token は relative pronoun | PERMITTED | `morphCategory: ['relative_pronoun']` (既存) |
| Annotation transfer | MACULA 既存注釈の転写 | PERMITTED | `bible_data.referent` → `evidence.antecedentTokenId` |
| Semantic claim | この pronoun は X を指す (discourse referent) | BLOCKED | 先行詞の意味的同定 |
| Interpretive claim | この関係節は restrictive / non-restrictive | BLOCKED | 制限的・非制限的の区別 |

### C-2. 「antecedent」という用語の問題

「antecedent (先行詞)」という名前は **discourse coreference** を暗示する。

本システムでは:
- **正確な呼称**: `syntacticHead` / `headTokenId` (統語的支配語)
- **MACULA 由来の転写** であることを明示: `evidence.antecedentTokenId`
- **Free relative では null** (先行詞 NP が存在しない場合)

「discourse referent」との区別:
- `evidence.antecedentTokenId` = MACULA が注釈した syntactic head token (転写)
- Discourse referent の推定 = L-0 BLOCKED

---

## Audit D — Candidate Schema Designs

### Option A — RELATIVE_CLAUSE construction type のみ

```json
{
  "type": "clause",
  "construction": {
    "canonical": "RELATIVE_CLAUSE",
    "sourceRule": "RelClause",
    "status": "CONFIRMED"
  },
  "function": { "canonical": "ADVERBIAL" },
  "children": [...]
}
```

- 利点: シンプル。新 construction 値を 1 つ追加するのみ
- 欠点: antecedent pointer なし。head NP は tree traversal が必要
- L-0: CLEAN (semantic inference なし)
- Renderer: 関係節の識別は可能。connector 描画のためには head NP の特定が別途必要

### Option B — relative pronoun token level に antecedentTokenId

```json
{
  "type": "token",
  "text": "ὃς",
  "morphCategory": ["relative_pronoun"],
  "evidence": {
    "nodeId": "...",
    "ref": "COL 1:15!1",
    "role": "s",
    "morph_raw": "R-NSM",
    "antecedentTokenId": "n51001013002"
  }
}
```

- 利点: token level でアクセスしやすい。`evidence` パターンに整合
- 欠点: token が PREP_PHRASE 内にある場合、clause との距離あり
- L-0: CLEAN (bible_data.referent の転写であり推論ではない)
- Renderer: relative pronoun token から head token を直接取得可能
- Migration: `morphCategory: ['relative_pronoun']` token に `evidence.antecedentTokenId` を追加

### Option C — explicit relation object

```json
{
  "relations": [
    {
      "type": "RELATIVE_ATTACHMENT",
      "source": "clause-id-of-relative-clause",
      "target": "token-id-of-head-noun"
    }
  ]
}
```

- 利点: 最も汎用的。将来の拡張に対応
- 欠点: schema 変更量が最大。新しいトップレベルフィールドが必要
- L-0: CLEAN だが over-engineering
- Renderer: 新しいフィールド読み込みロジックが必要
- Migration: 大規模

### Option D — clause level: RELATIVE_CLAUSE construction + relative sub-object

```json
{
  "type": "clause",
  "construction": {
    "canonical": "RELATIVE_CLAUSE"
  },
  "function": { "canonical": "ADVERBIAL" },
  "relative": {
    "headTokenId": "n51001013002",
    "markerTokenId": "n51001015001"
  }
}
```

- 利点: clause level で完結。関係節の clause に head NP pointer と marker token pointer の両方
- 欠点: `relative` という新フィールドが clause schema に追加される
- L-0: CLEAN (headTokenId = bible_data.referent の転写)
- Renderer: relative clause node → headTokenId で直接取得

### Option E (NEW from data analysis) — evidence.antecedentTokenId のみ (最小変更)

```json
{
  "type": "token",
  "text": "ὃς",
  "morphCategory": ["relative_pronoun"],
  "evidence": {
    "nodeId": "n51001015001",
    "ref": "COL 1:15!1",
    "role": "s",
    "morph_raw": "R-NSM",
    "antecedentTokenId": "n51001013002"  // NEW: from bible_data.referent
  }
}
```

- 利点: 最小変更 (1 フィールド追加のみ)。`evidence` パターンに完全整合
- `evidence.role` が bible_data.role の転写であるのと同じく、`antecedentTokenId` が bible_data.referent の転写
- 欠点: `RELATIVE_CLAUSE` construction type が存在しない (clause 識別は morphCategory 経由のみ)
- L-0: CLEAN (既存 MACULA 注釈の転写)
- Renderer: `morphCategory: ['relative_pronoun']` で relative pronoun を識別 → `evidence.antecedentTokenId` で head を取得

---

## Audit E — Evaluate Against Project Principles

| Criterion | Option A | Option B | Option C | Option D | Option E |
|---|---|---|---|---|---|
| SR as SSOT | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS |
| L-0 (no semantic inference) | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS |
| Greek word order 不変 | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS |
| Renderer が connector を描画可能 | ⚠️ NOTE: head NP 取得が別途必要 | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS |
| Reading-first (研究ツール化しない) | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS |
| Existing SR compatibility | ✅ PASS | ✅ PASS | ⚠️ RISK: 新フィールド大規模 | ✅ PASS | ✅ PASS |
| Backward compatibility | ✅ PASS | ✅ PASS | ⚠️ RISK | ✅ PASS | ✅ PASS |
| Corpus coverage (27/27 books) | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS |
| Unresolved = null 保持可能 | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS |
| 最小変更 | ✅ PASS (1 new cn) | ✅ PASS | ❌ BLOCKED | ⚠️ NOTE: 2変更 | ✅✅ BEST (1 field) |
| bible_data 転写パターンに整合 | N/A | ✅✅ BEST | N/A | ⚠️ PARTIAL | ✅✅ BEST |

**評価サマリー:**

- Option C: BLOCKED (over-engineering, schema 変更量最大)
- Option A: 不完全 (head NP の pointer なし)
- Option B/E: 最も整合 (evidence パターン + bible_data 転写)
- Option D: 完全だが 2 つの変更が必要

**推奨:** Option D (RELATIVE_CLAUSE construction + evidence.antecedentTokenId) — 明示性と最小変更のバランス

---

## Audit F — Critical Boundary Tests

### Case 1: ὁ λόγος ὃν ἤκουσα (典型的な adjectival relative)

**必要情報:** `ὃν を含む節が λόγος に syntactically attached`

**SR 構造 (現在):**
```
ARTICULAR_NP fn=OBJECT {
  token "ὁ" [T-ASM]
  CLAUSE_AS_NP {
    token "λόγον" [N-ASM]     ← head noun (antecedent)
    clause {
      token fn=OBJECT "ὃν" [R-ASM]
      token fn=PREDICATE "ἤκουσα"
    }
  }
}
```

**判定:** `CLAUSE_AS_NP` 内の兄弟関係から head noun は構造的に取得可能 (Grade B → A after extension)  
**必要フィールド:** `evidence.antecedentTokenId` on ὃν token → λόγον node id  
**Semantic claim は不要:** 「λόγος と ὃν が同一 referent を指す」は L-0 BLOCKED のまま

### Case 2: ἐν ᾧ (前置詞に支配される関係詞)

**SR 構造:**
```
clause fn=ADVERBIAL {
  PREP_PHRASE {
    token "ἐν" [PREP]
    token fn=null "ᾧ" [R-DSN]   ← relative pronoun inside PREP_PHRASE
  }
  token fn=PREDICATE "..."
}
```

**判定:**
- 関係詞の节内 grammatical role: PREP の object (fn=null が PREP_PHRASE 内から)
- 関係節の governing clause: parent clause (tree containment)
- 先行詞: `evidence.antecedentTokenId` から取得 (bible_data.referent)
- 「関係節が PP を経由して修飾する」は renderer が PREP_PHRASE 内の morphCategory から導出可能

### Case 3: 関係詞が節の SUBJECT の場合 (ὃς ἐστιν)

```
clause {
  token fn=SUBJECT "ὃς" [R-NSM]   ← relative pronoun = SUBJECT
  token fn=COPULA "ἐστιν"
  ...
}
```

**判定:**
- fn=SUBJECT on relative pronoun: SR に明示 (Grade A 既存)
- Antecedent: `evidence.antecedentTokenId` で取得
- 混同なし: 「節内での役割 (fn=SUBJECT)」と「先行詞 pointer」は別フィールド

### Case 4: 関係詞が OBJECT の場合 (ὃν εἶδον)

```
clause {
  token fn=OBJECT "ὃν" [R-ASM]
  token fn=PREDICATE "εἶδον"
}
```

**判定:**
- fn=OBJECT: 既存 SR で明示
- Antecedent: `evidence.antecedentTokenId`
- 「目的語の関係詞」と「先行詞 NP」を混同しない設計

### Case 5: Free relative (明確な antecedent NP なし)

```
clause fn=OBJECT {
  token fn=SUBJECT "ὃς" [R-NSM]
  token fn=PREDICATE "ἂν αἰτήσητε"
}
```

**判定:**
- `evidence.antecedentTokenId`: **null / absent** (bible_data.referent が空)
- Renderer は null の場合 connector line を描画しない
- SR は「先行詞なし」を明示しない → 欠落自体が free relative の証拠

### Case 6: Antecedent が unresolved の場合

PHP 2:5 の `ὃ` および `ὃς` (fn=null clause 内):

```
clause fn=null {
  token fn=SUBJECT "ὃ" [R-NSN]
  ...
}
```

**判定:**
- bible_data の referent: 実際に確認が必要 (P6-A では fn=null として扱われた)
- `evidence.antecedentTokenId`: null → null を正規の状態として保持
- DG renderer: null の場合は connector なし (diagram は相対節のみ表示)

---

## Audit G — Corpus Audit

### G-1. NT 全体統計

| 指標 | 数値 | 備考 |
|---|---|---|
| 総文数 | 8,010 | 全 27 書・全章 |
| 相対節を含む文 | 1,340 (16.7%) | — |
| 関係代名詞総数 (R-* / K-*) | 1,676 | — |
| morphCategory: relative_pronoun 付与 | 1,676 (100%) | 全件カバー |
| bible_data.referent あり | 1,078 (64.3%) | 単数または複数 nodeId |
| bible_data.referent なし (free relative) | 598 (35.7%) | null/空 |
| CLAUSE_AS_NP 内 (head 識別可) | 527 | Grade A 候補 |
| 前置詞に支配される関係詞 | 204 | ἐν ᾧ 等 |
| 全 27 書での出現 | 27/27 (100%) | 全書に存在 |

### G-2. 書別分布 (上位 10 書)

| 書 | 件数 |
|---|---|
| ACT | 265 |
| LUK | 220 |
| JHN | 172 |
| MAT | 172 |
| ROM | 108 |
| MRK | 107 |
| HEB | 93 |
| REV | 87 |
| 1CO | 67 |
| 2CO | 48 |

### G-3. antecedentTokenId 付与可能性の評価

| 分類 | 件数 | 付与可能? |
|---|---|---|
| bible_data.referent あり (単数 nodeId) | ~1,000 | YES (Grade A) |
| bible_data.referent あり (複数 nodeIds, space-separated) | ~78 | PARTIAL (最初の nodeId を参照) |
| bible_data.referent なし | 598 | NO → null |

---

## Audit H — Renderer Contract

### H-1. DG Renderer が最小限必要とする情報

R-K/Leedy diagram の relative clause connector を描画するために DG (dg-engine.js) が必要とする最小情報:

```
1. このノードが relative clause であることの識別
   → morphCategory: ['relative_pronoun'] on child token (既存)

2. この relative clause が修飾する head NP (または head token)
   → evidence.antecedentTokenId on the relative pronoun token

3. Relative pronoun の節内機能
   → function.canonical on the token (既存: SUBJECT/OBJECT/ADVERBIAL 等)
```

### H-2. Renderer が**要求しない**情報

| 情報 | 理由 |
|---|---|
| Antecedent の semantic interpretation | L-0 BLOCKED |
| Discourse referent | L-0 BLOCKED |
| Restrictive/non-restrictive の判定 | L-0 BLOCKED / C grade |
| 格の引き付け (attraction) の判定 | L-0 BLOCKED |

### H-3. 理想的な DG 描画フロー (schema 拡張後)

```
1. slot を iterate
2. slot の head NP 内に morphCategory: ['relative_pronoun'] を持つ token を発見
3. token.evidence.antecedentTokenId を読む
4. antecedentTokenId が null でない場合:
   a. antecedentTokenId の token を SR tree で検索
   b. connector line: [relative clause L-bracket] → [antecedent token position]
5. antecedentTokenId が null の場合:
   a. 「自由関係詞」として connector なしで描画
```

---

## Audit I — Reed–Kellogg / Leedy Fidelity

### I-1. 評価軸

**目標:** この schema extension によって、relative clause → syntactic head の connector を視覚的に表現できるか

### I-2. R-K/Leedy との対応

| R-K/Leedy 要素 | Schema extension 後の実現可否 | 備考 |
|---|---|---|
| Relative clause は head noun から broken bracket で接続 | ✅ 可能 (antecedentTokenId → connector) | connector が null の場合 = free relative |
| Relative pronoun の節内役割 (subject line 等) | ✅ 既存 (fn=SUBJECT/OBJECT 等) | |
| 前置詞に支配される関係詞の PP ライン | ✅ PREP_PHRASE + morphCategory で表現可 | |
| Free relative は independent clause 的扱い | ✅ null pointer で表現 | |
| Restrictive / non-restrictive の視覚的区別 | ❌ UNRESOLVED (L-0 BLOCKED) | |
| Nested relative clauses | ⚠️ PARTIAL (各関係詞が antecedentTokenId を持てば可) | |
| Attraction の視覚的表示 | ❌ UNRESOLVED (L-0 BLOCKED) | |

### I-3. 評価

> 「R-K/Leedy の見た目を完全コピーする」ことではなく、  
> 「relationship が視覚的に明示される」という原則を維持できるか。

**評価: YES (条件付き)**

- `evidence.antecedentTokenId` が付与された場合 (1,078/1,676 = 64.3%)、connector line の描画が可能
- Free relative (598 件) は pointer なし (これは正しい — free relative には head NP がない)
- Restrictive/non-restrictive の視覚的区別は L-0 BLOCKED のまま保留
- 64.3% のカバレッジで R-K/Leedy の relative clause diagram 要素を実現可能

---

## Audit J — Recommended Minimal Schema

### J-1. 推奨案: Option D + E の融合 (Recommended)

**変更 1: `evidence.antecedentTokenId` フィールドをトークンに追加**

| 項目 | 内容 |
|---|---|
| Field name | `evidence.antecedentTokenId` |
| Field location | `token.evidence` (既存 sub-object) |
| Field type | `string \| null` |
| Nullability | YES — free relative / unresolved = null または absent |
| Source of truth | `bible_data.token.referent` (MACULA 既存注釈) |
| What it means | この関係代名詞 token が syntactically 修飾する先行詞 token の SR nodeId |
| What it does NOT mean | discourse referent の同定ではない / coreference resolution ではない / restrictive を確定しない |
| Renderer consumption | `evidence.antecedentTokenId` → target SR token → その surfaceIndex で connector を描画 |
| Backward compatibility | 既存フィールドへの追加のみ。欠落 = null と等価 |
| Migration requirement | SR builder が bible_data.referent を読んで token.evidence.antecedentTokenId として出力する変更 (builder のみ) |
| L-0 compliance | COMPLIANT: bible_data.referent は MACULA 既存注釈の転写。新しい推論なし。evidence.role と同一パターン |

**変更 2 (オプション): `RELATIVE_CLAUSE` construction type の追加**

| 項目 | 内容 |
|---|---|
| Construction canonical | `RELATIVE_CLAUSE` |
| Applied to | 関係代名詞を含む clause nodes |
| Source of truth | morphCategory: ['relative_pronoun'] を持つ token の親 clause |
| Migration requirement | SR builder が既存 clause nodes の construction を更新 (約 1,676 件) |
| L-0 compliance | COMPLIANT: morphological fact (relative pronoun の存在) から syntactic construction を導く |
| Benefit | DG が clause 型のみで relative clause を識別可能 (morphCategory スキャン不要) |
| Risk | 既存 CLAUSE_AS_NP を持つ clause に RELATIVE_CLAUSE を追加すると重複する可能性 |
| Priority | Optional (evidence.antecedentTokenId のみでも renderer は動作可能) |

### J-2. 実装すべきでない場合

以下の場合は実装を延期する:

1. SR builder の変更スコープが想定より大きい場合 (bible_data から SR への新フィールド転写パイプラインが未整備)
2. `bible_data.referent` の space-separated 複数値の扱いについて設計判断が必要な場合
3. 関係節の clause に対する construction 変更 (RELATIVE_CLAUSE 追加) が既存 DG テストを壊す場合

---

## 禁止事項の遵守確認

| 禁止項目 | 状態 |
|---|---|
| production code 変更 | 変更なし ✅ |
| `public/core/*.js` 変更 | 変更なし ✅ |
| `public/index.html` 変更 | 変更なし ✅ |
| SR builder 変更 | 変更なし ✅ |
| 新しい統語推論の実装 | 実施せず ✅ |
| antecedent の自動推定ロジック | 実施せず ✅ |
| coreference / discourse referent 推定 | 実施せず ✅ |
| L-0 を越える意味解釈 | 実施せず ✅ |
| commit / merge / deploy | 実施せず ✅ |

---

*詳細: P6-B_relative_relationship_matrix.md / P6-B_test_matrix.md / P6-B_final_report.md*
