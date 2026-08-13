# SF-8 Step1 監査 — Focus 中心 Relation Flow で使えるデータ

対象: Structure Flow を「focus 中心の関係表示」へ再設計するにあたり、現在の実データ経路から
focus について取得できる関係を確定する。
作成: 2026-08-11
State: STATIC_AUDIT（READ ONLY・コード変更なし）
前提: [SF-1](./SF-1-structure-audit.md) 〜 [SF-3](./SF-3-structure-flow-design.md), neighborhood-view-design.md

> 目的は「構文情報を推測して増やす」ことではなく、**既存の構造情報を focus 中心に見えるようにする**こと。
> 本書は「表示できる関係」と「現在のデータには存在しない関係」を分離して記録する。

---

## 1. アセット node に実在するフィールド（実測）`CONFIRMED`

`public/assets/data/flow-tree/{BOOK}/{ch}.json` の全 node が持つキー:

```
id, parentId, type, tokens, children
```

- **`type` のみが唯一の明示的な分類情報**（値: `clause` / `phrase.np` / `phrase.pp` / `phrase.advp` / `group` / `word` …）。
- **存在しない**: `role` / `rule` / `semanticRole` / `head` / `governor` / `antecedent` / `subject/object` / `discourse relation`。
  （`test:re-flowtree-runtime` の「asset node に意味解釈属性なし」と一致）

## 2. focus 中心で取得できる関係（実データ・推論なし）`CONFIRMED`

`{root, nodesById}`（`_flowTreeRootForRef` の戻り。`buildNeighborhoodView` 呼び出し前に既に手元にある）から、
純粋に構造だけで以下が取れる:

| 関係 | 取得方法 | 実在性 |
|---|---|---|
| **focus node** | `type==='word'` かつ `tokens[0]===ref` | 常に |
| **所属するまとまり（直近の親）** | `nodesById[focus.parentId]` | 常に |
| **前の構造 / 後の構造（同一 parent の兄弟）** | parent.children を structural order で走査し focus の前後 | 端では無い場合あり |
| **focus の children** | word なので常に空（`[]`） | 常に空 |
| **上位の構造** | parent の parent（＝grandparent）／または最寄 clause | 無い場合あり（root 直下） |
| **最寄 clause（anchor）** | 親チェーンを上へ辿り最初の `type==='clause'` | 概ね存在 |
| **structural order 上の位置** | parent.children 内の index | 常に |

### 代表 focus の実測（抜粋）

| focus | 所属(親) | 前 | 後 | 上位(最寄clause) |
|---|---|---|---|---|
| 6:37!1 πᾶν | np「すべての〜するもの与える私父」 | — | clause「〜するもの与える私父」 | clause「すべての…来る」(9語) |
| 6:37!9 ἥξει(端) | clause「すべての…来る」 | pp「〜のもとに私」 | — | 親自身が clause（＝所属と同一） |
| 6:37!18 ἔξω(端) | clause「［冠詞］来る…外に」 | word「追い出す」 | — | 親自身が clause（＝所属と同一） |
| 6:38!10 御心(内部) | np「御心私の」 | — | np「［冠詞］私の」 | clause「行う御心私の」 |
| 6:39!2(先頭) | clause(節全体) | — | clause(残り全体) | 親自身が clause（root 直下） |
| 6:51!2(内部) | clause「私〜である…下る」 | word「私」 | np「［冠詞］パン…下る」 | 親自身が clause |
| 11:35!1(単純) | clause「涙を流すイエス」 | — | np「［冠詞］イエス」 | 親自身が clause |

## 3. 表示できる関係 / できない関係（明確な分離）

### ✅ 表示できる（実データ・構造のみ）
- focus の **所属するまとまり**（直近の親ノード）
- focus の **前 / 後の兄弟構造**（同一 parent・structural order）
- focus を含む **最寄 clause**（上位の構造）
- これら相互の **包含（part-of）** と **順序（structural order）**

### ❌ 現在のデータには存在しない（推測しない＝表示しない）
- 意味上の主語 / 目的語 / 補語
- 修飾関係（A が B を修飾する）
- referent / antecedent（例: 関係詞 ὃ が何を指すか）
- head / governor（データに head 情報なし）
- discourse relation（理由・目的・逆接 等の意味関係）
- 「主節／従属節」等の**意味的**節区分（`type='clause'` は構造識別のみで、主従の区別を持たない）

## 4. 重要な設計上の論点（実装前に確定が必要）

### 論点A: relation label（type）の表示可否 — 凍結仕様との衝突
- 明示情報は `type` のみ。しかし **neighborhood-view-design.md §6 は `type` の読者向け表示を明確に禁止**（View 内部判断のみ許可）。
- Step 5 は「明示的 relation/type があればラベル表示を検討」だが、`type` を出すと §6（FROZEN）に反する。
- ⇒ 既定は **ラベルなし**（構造と方向だけで示す）。type ラベルを出すには §6 の凍結解除（＝仕様変更・承認必須）が要る。

### 論点B: 「上位の構造」の定義 — 巨大チップ問題
- 生の grandparent は、focus が clause 直下だと **sentence root（節全体＝時に一節丸ごと36語）** になり、チップが巨大化する（例: 6:37!9 の grandparent は 6:37+6:38 全体）。
- 一方 **最寄 clause（anchor）** を「上位」とすれば、多くの focus で適度なサイズの節になる。親自身が clause の場合は所属と一致するので **重複表示を避けて省略**できる。
- ⇒ 推奨: **上位 = 最寄 clause。所属と一致する場合は省略**。

### 論点C: 矢印の意味（新関係を定義しない）
- 水平 `──→` は **structural order（＝この文脈では reading order）の進行**のみを意味する（前→focus→後）。
- 垂直の接続は **包含（part-of）** のみ。意味関係ではない。
- ⇒ 矢印は「意味関係」を主張しない。水平=順序、垂直=包含、と一義に固定する。

## 5. 実装方針（案・確定前）

現行経路を維持し、**表示層に薄い抽出処理を1つ追加**する:

```
_buildFlowTreeNeighborhoodViewHTML 内で既に持つ representation.nodesById + ref から、
focus 中心の関係（親/前/後/最寄clause）を抽出する _sfRelationModel(nodesById, ref) を新設。
→ 新レンダラ _sfRenderRelationFlow() が focus 中心レイアウトを生成。
```
- `buildNeighborhoodView` / `_ft11ToRenderItem` / Adapter / Model / bible_data は**不変**。
- 抽出は nodesById と structural order のみ。新しい意味判断ゼロ。
- Failure Mode 維持（取れない関係は出さない・ダミー禁止）。

---

## 6. 確定事項（人間承認済み・実装済み）

- **論点A → ラベルなし**を採用（§6 凍結を維持。type を表示しない）。
- **論点B → 上位 = 最寄 clause。parent 自身が clause の場合は所属と一致するため省略**。
- **論点C → 矢印=順序のみ（水平）、包含=矢頭なし縦線（垂直）**。意味関係は主張しない。
- 実装（表示層のみ）:
  - `_sfRelationModel(nodesById, ref)` — focus / parent(所属) / sibs(前後) / upper(上位=最寄clause) を抽出。
  - `_sfRenderRelationFlow(model)` — 所属まとまりを1帯に「前→focus→後」で並べ、下に上位を縦線で接続。
  - `buildNeighborhoodView` / Adapter / Model / bible_data / Reading Engine は不変。
- レイアウト実像:
  ```
  所属するまとまり  [前] → [FOCUS] → [後]     ← 淡い枠＝ひとまとまり／矢印＝順序
       │ (縦線＝包含)
  上位            [ 最寄clause ]              ← parent が clause の時は非表示
  ```

