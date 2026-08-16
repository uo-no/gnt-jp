# DA-2a — Discourse Unit Representation: Minimal Schema Contract

作成: 2026-08-15
Phase: **DA-2a（schema / contract 確定・コード実装なし）**
State: DESIGN（契約確定）
位置づけ: 「構造層のみの Discourse Unit Representation」の最小 schema を、**実 flow-tree の検証結果**に基づき確定する。
DA-2 Audit（`discourse-unit-representation-audit.md`）の Implementation Decision B（representation-only・構造層限定）を具体化。
根拠(FROZEN/既存): `verse-representation-design.md`・`flow-tree-representation-schema.md`・DA-2 Audit・`CLAUDE.md`(L-0)。

Evidence 凡例: **CONFIRMED**(実データ実測)。以下の契約は全て flow-tree 実測（ROM+JHN 37章・38,852ノード）に基づく。

---

## 0. 必須確認の結果（§12・実コード/実データ）

| # | 確認項目 | 結果（CONFIRMED） |
|---|---|---|
| 1 | flow-tree の node id | 2形式が混在：`BOOK#NNNNN#nSTART-nEND`（例 `ROMANS#00101#n45005001002-n45005002023`）／純数値（例 `450160010010400`）。**opaque string**。 |
| 2 | clause node の type | `type === "clause"`（ROM+JHN で 7,743 個）。**`"sentence"` という node type は存在しない**（`sentences[]` は配列名）。top-level は clause(1,464)/group(37)/phrase.np(1)。 |
| 3 | parentId の root convention | **top-level node は `parentId === null`（1,502/1,502＝100%）**。root は null。 |
| 4 | token membership の実フィールド | **`node.tokens`**（`["ROM 5:1!2", "ROM 5:1!1", …]`＝bible_data.ref と一致）。順序は **structural order**（surface 順ではない。例：後置 δέ が index2→1 より前）。 |
| 5 | children との整合性 | **parentId 参照整合性 100%**（全 non-null parentId が同章内の実ノードを指す・missing 0）。children↔parentId は双方向一致。 |
| 6 | unitId の一意性 | **1章内で重複 0**（37章で dup 0）。node id は章 flow-tree 内で一意。 |
| 7 | DA-1 Representation 接続位置 | `buildDiscourseRepresentation()`（`index.html`）が unit を生成。**現状 unitId は合成値 `dcv-u${idx}-${ref}`＝flow-tree node id ではない**。units は `tree.sentences[]`（top-level）ベースで、`{id, verseLabel, words[], connective}` を持つ。 |
| 8 | buildDiscourseRepresentation の現構造 | flow-tree sentence を単位に、先頭接続詞（lemma＋既存 japanese 転写）を `connective`／`connections[]` として保持。`unitType/parentUnitId/tokenRefs` は未保持。`clause.discourse` 非参照（実測 NONE）。 |
| 9 | 既存 Representation naming convention | `{ kind, verseRef|scope, … }`。判別子は `kind`（`translation`/`wordOrder`/`discourse`）。camelCase。`renderColumn(representation)` が唯一の dispatch。 |

**重要な帰結（§7）:** DA-2a の unitId 契約（＝flow-tree node id）と unit 集合（＝clause node）は、**DA-1 現行出力（合成 id・sentence 単位）とは異なる**。DA-2a は DA-1 を「構造層に沿って正す」契約であり、実装は §H の通り最小変更。

---

## A. Conceptual Definition

> **DA-2 における Discourse Unit とは、既存 flow-tree の clause node（`type==="clause"`）を、
> Renderer が扱える Representation として転写した構造単位である。**

- **新しい Discourse Unit 境界を推論しない。** 既存 flow-tree の clause boundary を再利用するだけ。
- `unitType==="clause"` は「新しい談話解析結果」ではなく「**既存 flow-tree の clause node を転写している**」という意味に限定する。
- sentence / paragraph / passage は将来拡張の余地を schema に残すが、**DA-2a では実装しない**。
- Unit 間の意味関係（理由/結果/対比…）は **DA-2a では持たない**（Unresolved by Design）。

---

## B. Schema（最小・JSON・コードには追加しない）

既存 `kind:'discourse'` Representation の構造層契約。**意味関係を持たない。**

```jsonc
{
  "kind": "discourse",
  "scope": { "book": "ROM", "chapter": 5 },     // 既存 naming（passage境界=章。DA-0/DA-1と同じ）

  "units": [
    {
      "unitId":       "ROMANS#00101#n45005001002-n45005002023",  // = flow-tree node.id（逐語）
      "unitType":     "clause",                                   // = flow-tree node.type（逐語）
      "parentUnitId": null,                                       // = flow-tree node.parentId（逐語 / root=null）
      "tokenRefs":    ["ROM 5:1!2", "ROM 5:1!1", "ROM 5:1!3"]     // = flow-tree node.tokens（逐語・structural order）
    },
    {
      "unitId":       "ROMANS#00101#n45005001001-n45005001004",
      "unitType":     "clause",
      "parentUnitId": "ROMANS#00101#n45005001002-n45005002023",   // 親 clause の node.id（逐語）
      "tokenRefs":    ["ROM 5:1!1", "ROM 5:1!3", "ROM 5:1!4"]
    }
  ],

  "connections": [                                                // A: 決定的な語彙マーカーのみ（DA-1由来・任意）
    { "from": "…unitId…", "to": "…unitId…",
      "marker": { "lemma": "γάρ", "ja": "［理由語句］", "tokenId": "…" } }
  ],

  "relations": []                                                 // C: 談話意味関係 = Unresolved by Design（常に空）
}
```

**relations の固定状態（§8）:** DA-2a では `relations` は**常に `[]`（空配列）**とする。
= 「現在の Analysis から確定可能な Discourse Relation が Representation に存在しない」という意味（静寂・`CLAUDE.md §4.1`）。
仮に将来 per-instance の未解決プレースホルダを置く場合の形は `{ "from": "…", "to": "…", "relation": null, "status": "unresolved" }` とするが、**DA-2a では 1 件も生成しない**（対象ペアを選ぶこと自体が判断になるため）。

**`connections` と `relations` の分離（重要）:**
- `connections[]` = **決定的な語彙マーカー**（接続詞 lemma＋既存 japanese 転写）＝分類 **A**。マーカーの「存在事実」のみ。関係名を付けない。
- `relations[]` = **解釈的談話関係**（理由/結果/対比…）＝分類 **C**。DA-2a では空。
- この2フィールドを混同しない。「γάρ がある」（A）と「これは理由関係である」（C）は別物。

---

## C. Field Contract

| field | source | meaning | invariants | nullability | Renderer 利用可否 |
|---|---|---|---|---|---|
| `kind` | 固定 | 判別子 | `=== "discourse"` | 非null | dispatch のみ |
| `scope` | AppState/elData | 章スコープ | `{book, chapter}` | 非null | 表示補助 |
| `unitId` | `flowtree.node.id` | Unit の一意識別 | **node.id と厳密一致**・章内一意（実測dup0）・**opaque（parse禁止）** | 非null | 参照キーのみ（意味を読み取らない） |
| `unitType` | `flowtree.node.type` | 構造識別（Lowfat class 転記） | DA-2a は `"clause"` に filter。値は raw type 文字列 | 非null | 内部判定可・**読者向け表示禁止**（`flow-tree-representation-schema.md §6`） |
| `parentUnitId` | `flowtree.node.parentId` | 構造上の親（包含） | **parentId と逐語一致**・root は `null`（実測100%）・全 flow-tree 内で参照整合（実測100%） | **null（root時）** | 包含辿りに利用可 |
| `tokenRefs` | `flowtree.node.tokens` | 所属 token（membership） | **tokens と逐語一致**・**structural order 保持（並替禁止）**・nested unit 間で重複しうる（包含） | 非null（空配列なし・実測） | membership 参照。**surface 並替は Renderer 責務**（Representation はしない） |
| `connections[]` | bible_data token（class='conj'＋lemma） | 決定的語彙マーカー（A） | marker は lemma＋既存 japanese 転写のみ | 空配列可 | マーカー表示可。関係名付与禁止 |
| `relations[]` | —（無し） | 談話意味関係（C） | **DA-2a は常に `[]`** | 空配列固定 | 空（表示対象なし） |

---

## D. Source-of-Truth

| Representation field | Source-of-Truth（実フィールド） | 変換 |
|---|---|---|
| `unitId` | `flow-tree node.id` | 逐語コピー（無変換） |
| `unitType` | `flow-tree node.type` | 逐語（DA-2a: `"clause"` を採用） |
| `parentUnitId` | `flow-tree node.parentId` | 逐語（`null` 保持） |
| `tokenRefs` | `flow-tree node.tokens` | 逐語（**順序も無変換**） |
| `connections[].marker` | `bible_data token`（class='conj', lemma, japanese, tokenId） | 逐語転写（既存 japanese 値のみ） |
| `relations` | 無 | 固定 `[]` |
| `scope` | `AppState.location` / `elData[0]` | book/chapter の読み取り |

**すべて逐語転写であり、Representation 内で再解析・再計算・意味付与を行わない。**

---

## E. Non-Goals（DA-2a で絶対にしないこと）

1. 新しい Discourse Relation の生成（cause/result/contrast/purpose/condition/temporal/explanation/elaboration/continuation 等）。
2. `clause.discourse.type`（clause-analyzer・heuristic・confidence<1.0）の Representation への投影（完全 DEFER）。
3. 新しい unitId 体系の発明（flow-tree node.id 以外禁止）。
4. 新しい親子関係の計算（parentId の逐語転写のみ。**「最寄り祖先 clause」の解決も DA-2a 範囲外**＝§F 参照）。
5. tokenRefs の surface 並替・再所属計算（structural order を保持）。
6. referent / subjref / frame / topic / focus / given-new の投影。
7. sentence / paragraph / passage 単位の実装（schema 拡張余地は残すが実装しない）。
8. FLOW / Structure Flow / Syntax Tree / Reading Engine / ClauseAnalyzer の挙動変更。

---

## F. L-0 Audit

| 監査点 | 判定 |
|---|---|
| unitId 生成 | **安全**（node.id 逐語・推論なし） |
| unitType | **安全**（node.type 逐語・"clause" は構造識別であって談話解析結果ではない） |
| parentUnitId | **安全**（parentId 逐語・親子計算なし）。**caveat（下記）を明示** |
| tokenRefs | **安全**（tokens 逐語・並替/再解析なし） |
| connections（マーカー） | **安全**（語彙事実の転写・関係名なし） |
| relations | **安全**（空・Unresolved by Design・静寂） |
| referent resolution | **発生しない**（referent/subjref を schema に含めない） |
| 意味補完・翻訳 | **発生しない**（japanese は既存値の転写のみ・新規生成なし） |

**parentUnitId の明示 caveat（推論ではなく既知の構造事実）:**
flow-tree の入れ子では、clause の親が clause でない構造ノード（group / phrase.*）である場合がある
（実測例: clause `ROMANS#00101#n45005002001-n45005002023` の parentId は非clauseノードを指す）。
DA-2a は parentId を**逐語**転写するため、**units を clause に filter した場合、`parentUnitId` が `units[]` 内に存在しない
flow-tree ノードを指すことがある**。これは L-0 上の問題ではなく、flow-tree 構造の忠実な反映である。
「最寄り祖先 clause の解決」は**計算＝DA-2a 範囲外**とし、必要な consumer は flow-tree 側で解決する。
（この性質が受け入れ難い場合の代替は §最終判断の注記参照。）

---

## G. DA-1 Integration

DA-1 現行 `buildDiscourseRepresentation()` と DA-2a schema の差分（＝接続点）:

| 項目 | DA-1 現行 | DA-2a 契約 |
|---|---|---|
| unit 集合 | `tree.sentences[]`（top-level） | flow-tree **clause node**（`type==="clause"`） |
| unitId | 合成 `dcv-u${idx}-${ref}` | **flow-tree node.id 逐語** |
| unitType | 無 | **追加**（`"clause"`） |
| parentUnitId | 無 | **追加**（parentId 逐語・null=root） |
| tokenRefs | 無（`words[]`＝表示用 ja を保持） | **追加**（node.tokens 逐語） |
| connections | 有（接続詞マーカー） | **維持**（A・変更なし） |
| relations | 無 | **追加**（空配列固定） |
| `clause.discourse` | 非参照 | 非参照（維持） |

**接続方針:** DA-2a schema は既存 `kind:'discourse'` の**同一 Representation を構造層で拡張**する（新 kind を作らない）。
`words[]`（表示用 ja）は Renderer 用の派生であり、DA-2b で `tokenRefs` から surface 整形して生成する形へ整理できる（DA-2a では設計のみ）。

---

## H. Implementation Boundary（DA-2b で実装する場合の最小変更）

| 対象 | 変更内容 | 変更しない |
|---|---|---|
| `public/index.html` `buildDiscourseRepresentation()` | (1) 単位を flow-tree clause node へ（tree を walk して type==="clause" を収集）。(2) `unitId=node.id` / `unitType=node.type` / `parentUnitId=node.parentId` / `tokenRefs=node.tokens` を逐語設定。(3) `relations: []` を追加。(4) `connections` は現行維持。 | — |
| `DiscourseRenderer` | tokenRefs から surface 整形して表示（DA-2b の描画判断）。**構造の入れ子をどう見せるかは別途 UX 判断** | 語順フロー/翻訳 renderer |
| Reading Engine / ClauseAnalyzer / clause-registry / flow-tree-adapter | — | **一切変更なし** |
| JSON / TSV / bible_data | — | **一切変更なし** |
| 既存 kind（translation/wordOrder） | — | **no impact** |

**変更は `public/index.html` 内の discourse builder（＋DA-2b で renderer）に限定。Analysis・データ・他 renderer は不変。**
**DA-2a では実装・commit・push を行わない。** 実装は本 schema 承認後の DA-2b で着手。

---

## 最終判断

# DA-2a schema READY

- 全 field の source / invariant / nullability / 一意性 / 参照整合が **実 flow-tree で検証済み**（§0）。
- すべて逐語転写であり、**新規推論・referent 解決・意味補完は発生しない**（§F）。
- 意味関係（C）と `clause.discourse.type` は完全に DEFER し、`relations` は空で固定。
- 既存 architecture（kind 判別・naming・renderColumn）と整合し、実装は `index.html` の discourse builder に限定（§H）。

**注記（READY 条件下の設計選択・要ユーザー確認1点）:** `parentUnitId` は flow-tree parentId を逐語転写するため、
clause-filter 下で「units[] に無い祖先」を指しうる（§F caveat）。この**逐語方針で確定**する（推奨）。
もし「parentUnitId は必ず units[] 内の clause を指す」閉包を求める場合のみ **NEEDS REVISION** となり、
その際は「units を全 flow-tree ノードに拡張（unitType 混在）」または「最寄り祖先 clause 解決（＝計算・別DA）」のいずれかを選ぶ設計に差し替える。
現行推奨は**逐語方針・READY**。

---

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-08-15 | 初版（DA-2a。unitId/unitType/parentUnitId/tokenRefs を flow-tree 逐語転写する構造層 schema を確定。relations=空固定・clause.discourse は DEFER。実 flow-tree 検証済み。READY。コード変更なし） |
