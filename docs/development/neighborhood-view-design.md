# NeighborhoodView Specification v1

作成: 2026-08-07
位置づけ: Flow Tree（Lowfat由来の構造データ, `work/SBLGNT/lowfat/`）を根拠とする、単語タップ起点の読書補助 Projection の仕様正典。
これは実装ではなく設計文書である。本書に基づく `public/index.html` への実装は、本書確定後の別フェーズで行う。

---

## 0. 責務宣言

> **NeighborhoodView は、Flow Tree 自体を表示するビューではない。**
> **Flow Tree を根拠・導出元として利用し、「対象語が実際に属すると判定される構成語群」だけを観察可能にする、読書補助のための Projection である。**

| 層 | 責務 |
|---|---|
| Lowfat XML | 統語構造の一次情報（不変） |
| Flow Tree Adapter | Lowfat から Flow Tree を構築する（`scripts/re-flowtree-adapter-realdata.cjs`／`npm run test:re-flowtree-adapter-realdata` で全27書の構造的完全性を確認済み） |
| **NeighborhoodView（本書）** | Flow Tree を根拠に、対象語の構成語群を観察可能な形へ投影する（構造データではなく navigation view。詳細は本書 §2） |
| Display Policy（未実装） | NeighborhoodView が保証したデータの、画面上の表示量を制御する（折りたたみ・件数表示。詳細は本書 §4「expanded の責務境界」） |
| StudyPanel | 整形済み内容の描画のみ（判断しない） |

---

## 1. Purpose

NeighborhoodView は、読者が本文中で気になった対象語について、その語が Flow Tree 上で属すると判定される構成語群を、確認可能にする、読書補助のための射影である。この判定の安定性は §6（Adapter Dependency Contract）に定める条件の範囲内でのみ成立する。

**読者の理解到達・誤解防止を目的としない。** 責務は確認可能な事実の提示に限られ、その事実から読者が何を理解するかは責務の範囲に含まれない。

---

## 2. Observation Target（観察対象）

- 対象語
- 対象語が実際に属する構成語群の全構成員（既存の日本語表示を用い、個別に識別可能な形で）
- 構成員が同じ構成語群に属するという事実（所属関係）

**Flow Tree は観察対象ではない。** 上記の判定を行うための根拠・導出元としてのみ機能する。「Flow Tree 上で表示する」「Flow Tree を見る」といった、Flow Tree 自体を観察対象であるかのように読める表現は、本書および将来のすべての関連文書・実装コメントにおいて使用しない。

---

## 3. Non Target（非観察対象）

- Flow Tree のノード構造・`type`・`children[]` 等の内部表現
- role / rule / semanticRole 等の解釈属性
- 対象語の構成語群を超える祖先階層（完全経路）
- 木の深さそのもの

**「非観察対象」とは読者向け表示を禁止する意味であり、View層内部判断での参照まで一律に禁止するものではない。** 特に `type` は構造識別属性であり、role / rule / semanticRole 等の意味解釈属性とは区別する。`type` は内部判定に利用可能だが、表示は禁止する（詳細は §6「type 利用の境界」）。

**NeighborhoodView は HTML 生成、日本語文章生成、表示用ラベル生成を行わない。** これらは Renderer の責務であり（`flow-tree-adapter-design.md` §6）、NeighborhoodView は構成語群の構造（focus判定・anchor探索・constituent抽出・expanded算出）のみを確定させ、Representation から取得した token 参照をそのまま渡す（FLOW-TREE-11-C/D 監査、2026-08-07）。

Source Tree View（Flow Tree 自体を忠実に観察対象とする、将来の別ビュー。未実装）とは観察対象そのものが異なる。両者は「同じデータの表示範囲違い」ではなく、観察対象の種類が異なる別のビューである。

---

## 4. Minimal Guarantee（最小保証）

対象語が属する構成語群の全構成員の**存在**と**正確な構成**を、常にデータとして保持する。

- この保証は「データとして正確であること」を指し、「常に全構成員を画面に描画すること」を意味しない。
- 構成員数に上限は設けない（人為的な取捨選択は意味的選別に該当するため）。
- **構成員間の並び**は **structural order**（Flow Tree の `children` 配列順。本書 §5 で定義）を保持し、surface order 等への並べ替えを行わない。ただし、個々の構成員内部における文字列生成・token配置は Text Rendering 責務であり、本仕様の対象外とする。

### 保証対象

- 対象語を含む構成語群の全構成員データ
- 各構成員の個別識別可能性（1本の文字列への融合を禁止する）
- 構成員間の structural order の保持

### 保証対象外（Display Policy へ委譲）

- 常時画面上へ全構成員を表示すること
- 読者の理解の達成
- 誤解の防止

表示量の制御（折りたたみ・件数表示・展開操作）は本書の責務範囲外とし、将来実装される Display Policy 層（未実装。責務は本書 §4「expanded の責務境界」に記述）に委ねる。NeighborhoodView は、Display Policy が正しく機能するために必要な、完全かつ無加工の構成員データを供給する責務を持つ。

### expanded の責務境界（FLOW-TREE-11-C/D 監査、2026-08-07 確定）

現行の NeighborhoodView Model が持つ `expanded` フィールドと、本節が述べる「展開操作（Display Policy 責務）」は、字面上は同じ「展開」という語を含むが、指す対象の階層が異なる。以下の区別を正式仕様とする。

- 現在 NeighborhoodView が生成する `expanded` は、ユーザー操作・画面制約・表示件数制限などを表す**表示制御状態ではない**。
- `expanded` は、Representation と focus の位置関係のみから決定される「focus への構造経路上にあるか（かつ子を持つか）」という**構造事実の表現**である。生成時点で1回だけ決定され、ユーザー操作・画面幅・件数上限・過去の表示状態のいずれも参照しない（FLOW-TREE-11-B で全27書・137,741 focus に対し、この定義通りの決定的な値になることを確認済み）。
- **将来的な Display Policy 層が導入された場合、この構造事実を入力として、最終的な表示量制御（折りたたみ・件数表示・展開操作）を行うことを妨げない。** むしろ Display Policy はこの構造事実なしには機能できない（「focus への経路上か」を知らずに、経路を隠さず・かつ過不足なく折りたためない）。
- **現時点では Display Policy は未実装であり、Renderer はこの構造事実を表示判断の入力として直接利用している。** これは Display Policy 層が担うべき最終判断を、その層が存在しないために Renderer が暫定的に肩代わりしている状態であり、正式な Display Policy 層の追加を妨げるものではない。

**名称についての注記:** 「`expanded`」という名称は、UI 上の展開操作（ユーザーが開閉する操作、またはその結果としての表示状態）を直接意味するものではない。現在の View Model において、この名称は構造的展開状態（focus への経路上にあり子を持つこと）を表す便宜的な名称であり、Display Policy 層が持つべき「実際に展開して表示するか」という表示判断とは区別される概念である。

**責務境界（変更なし・再確認）:**

| 層 | 担当 |
|---|---|
| NeighborhoodView | focus判定／anchor探索／constituent抽出／`expanded`（構造経路上か）の算出 |
| Renderer | label生成／HTML生成／`expanded`値の透過利用（現時点では表示判断としてそのまま使用） |
| Display Policy（未実装） | 将来的な表示量制御／件数制限／深度制限／ユーザー操作による開閉状態管理 |

---

## 5. Structural Order

- **structural order = Flow Tree が保持する `children` 配列の順序**であり、Lowfat の XML が実際に子要素を列挙している順を、Adapter が無変更で保持したものである（FLOW-TREE-2.6 の原則）。
- 本文の表層語順（surface order）とは区別する。後置接続詞（δέ 等）のような非連続要素では、structural order と surface order が一致しない場合があることを確認済みである。
- Adapter の内部実装上の反復順（偶発的な走査順）とも区別する。structural order は Lowfat の XML 構造に由来する意味のある順序であり、実装上の偶然の産物ではない。
- **surface order への自然化・並べ替えは禁止する。** 読みやすさを理由とした構成員の並べ替えは、Structure Comes From Source に反する。

---

## 6. Adapter Dependency Contract

「直近の親」に基づく構成語群の判定は、以下2条件を前提として初めて安定する。**この2条件は互いに独立した、別種の性質である。**

### (a) Adapter の構造的完全性

Flow Tree Adapter が、Lowfat の全 token・全 `wg` を欠損なく Flow Tree へ反映していること。`scripts/re-flowtree-adapter-realdata.cjs`（`npm run test:re-flowtree-adapter-realdata`）により、全27書・8,010 sentence・137,741 token に対し token/wg欠損ゼロを実測済みである。

### (b) Adapter 構築の決定性

同一の Lowfat 入力から、常に同一の親子関係（構造の形）が生成されること。

**(a) と (b) は別の性質であり、混同してはならない。** (a)（完全性＝何も失われていない）は、(b)（決定性＝同じ入力なら常に同じ木の形になる）を論理的に含意しない。理論上、両方とも100%完全でありながら、異なる木の組み立て方をする2つの Adapter 実装が存在しうる。

**現状の評価:** (a)(b) いずれも `scripts/re-flowtree-adapter-realdata.cjs`（`npm run test:re-flowtree-adapter-realdata`）により実測済みである。同スクリプトは全27書・8,010 sentence に対し、各 sentence を2回独立に変換し、生成された Representation の完全一致（deterministic不一致0件）を確認している。これは (a) の完全性測定とは別の、(b) 決定性に対する独立した検証であり、(b) は解消済みである（従来 Open Questions に記載していた「独立した検証記録を持たない」は本改訂で削除する）。

NeighborhoodView が「直近の親」を信頼して利用できるのは、(a)(b) 双方が成立している場合に限られる。Adapter の実装が将来変更される場合、(a) の完全性基準が回帰していないことに加え、(b) の決定性が損なわれていないことも、既存の回帰検証の枠組みに準じて確認することを、NeighborhoodView 側の前提条件とする。

### (c) 構造識別情報マッピング完全性

Lowfat の `class` 属性から構造識別情報（現行 Representation では `type` として保持する）への変換が、全ての入力に対して安定していること。未知の `class` 値に遭遇した場合、暗黙的な誤変換（推測によるカテゴリ付与）を行わないこと。同一の Lowfat 入力からは、常に同一の構造識別情報を持つ Tree が生成されること。

### type 利用の境界

`type`（Lowfat の `class` 属性から機械的な1:1対応で導出される値）は、以下の通り扱う。

- **表示用途:** 禁止。読者向けの表示（NeighborhoodView の出力）へ `type` の値を一切出力しない。
- **View内部判断用途:** 許可。対象語の構成語群を判定する内部ロジック（直近の親の探索等）において、`type` を参照してよい。
- **Adapter保持用途:** 許可。Flow Tree の Representation として `type` を保持することを妨げない。

`type` は role / rule / semanticRole 等の意味解釈属性とは異なり、**構造識別属性**（ノード自身が何であるかを、Lowfat の既存分類から機械的に転記しただけの属性）として扱う。この区別により、`type` の内部利用は Structure Comes From Source（表示される事実が Source に存在する関係であることを要求し、内部の計算手法までは規定しない）に反しない。

**契約として必須なのは「ノード種別を識別できる構造識別情報」であり、「`type` というフィールド名」そのものではない。** 現行 Representation ではこれを `type` として保持しているが、将来的なフィールド名の変更を本契約は制約しない。

### Prototype と正式実装の責務境界

- NeighborhoodView は、Flow Tree Adapter の生成結果を入力として利用することを前提とする。
- Prototype 等において、Lowfat fixture から独自に Flow Tree 相当構造を生成する実装（例: HTML 単体に埋め込まれた簡易パーサ）は、あくまで View ロジック単体の検証にすぎず、本 Adapter Dependency Contract（(a)(b) の充足）の検証とはみなさない。両者を混同しない。

---

## 7. Forbidden Transformations（禁止事項）

- **意味的選別**（重要語の抽出・要約による構成員の取捨選択）
- **構成語群の1本の文字列への融合**（構成員を個別に識別不能にすること）
- **role / rule / semanticRole 等の解釈属性の生成・表示**
- **修飾関係の主張**（例: A が B を修飾する）
- **文法的機能の説明**（例: A が主語である、目的語である）
- **意味的関係の説明**（例: 理由・目的・原因等の関係を述べる）
- **構成員間の順序を、surface order 等、structural order 以外の基準へ変更すること**
- **読者の理解・誤解防止を成功基準として扱うこと**

---

## 8. Open Questions（未解決事項）

- §6「type 利用の境界」により、Flow Tree の隣接関係（`type` に基づく直近の親の探索）を View 内部判断の基準として用いることを正式に許可した。この基準を用いること自体の是非は解消されたが、これ以外に合理的な代替基準がありうるかは、引き続き未検討のまま残る（ただし現時点で NeighborhoodView の実装を妨げるものではない）。
- Lowfat 自体が統語的解釈（Lowfat 注釈者による判断）の産物であるという上位の前提は、本書固有の課題ではないが、解消されない制約として残る。
- Adapter Dependency Contract の継続的な検証手段について、**回帰テストスクリプト自体は既に存在する**（`npm run test:re-flowtree-adapter` / `test:re-flowtree-adapter-realdata` / `test:re-neighborhoodview` / `test:re-neighborhoodview-integration` / `test:re-neighborhoodview-realdata`）。手動実行は可能だが、**CI（`.github/workflows/`）等への自動組み込みは未実施**であり、未解決事項は「検証手段の存在」ではなく「CIでの自動化」に限定される。
- **全27書を実ブラウザ表示へ接続する段階では、深い構造（例: ルカ3:23-38のような長大な系図。FLOW-TREE-11-B で実測: parent chain 深度156・constituent tree 深度156）に対する表示量制御が必要になる可能性がある。** その段階で、Display Policy の具体的仕様（深度制限・件数制限・折りたたみの初期状態等）を定義する。**現時点では、まだ存在しない Display Policy の要件を先取りして `expanded` の構造や NeighborhoodView Model の契約を変更しない**（FLOW-TREE-11-D 設計監査の結論）。

---

## 9. 実装前監査結果（2026-08-07 時点）

本書確定に先立ち、`public/index.html` に既に存在する NeighborhoodView Prototype 実装（FLOW-TREE-11-A, Matthew 1:1 限定）を、本書の要件に照らして監査した。**コード変更は行っていない。**

| 確認項目 | 結果 |
|---|---|
| role/rule/semanticRole を表示していないか | **適合。** `_ft11RenderList`（`public/index.html` 内）の出力は `item.label` のみで、role/rule/type を一切含まない |
| group wrapper を意味カテゴリとして扱っていないか | **適合。** `_ft11BuildConstituent` は `node.type` を出力に含めない。`type` は anchor（直近の clause）を探す内部ロジックでのみ使用され、表示には現れない |
| Display Policy と保証ロジックが混在していないか | **未接続（要対応、監査時点）。** 監査当時の Prototype は Display Policy 設計前に実装されたものであり、折りたたみ・件数表示等の表示量制御ロジックを一切持たない。「混在」という形の矛盾はないが、本書 §4 が要求する Display Policy への委譲が、当時の実装にはまだ存在しなかった（Display Policy は本改訂時点でも未実装のまま） |
| Adapter完全性テストとの接続箇所 | **監査当時は接続なし。** 監査当時の Prototype は Matthew 1:1 のみの埋め込みデータを使う独立実装であり、汎用 Adapter・回帰テストとは一切接続されていなかった。その後 FLOW-TREE-12（`scripts/re-flowtree-adapter-realdata.cjs`）により全27書実データでの Adapter 検証経路が確立している |

---
