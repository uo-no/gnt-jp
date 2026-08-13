# SF-9 構造関係データ監査（実装なし・事実確認のみ）

対象: focus 中心の Mindmap 型 Relation Flow を将来設計するにあたり、**現在のデータのどこに
どの構造関係情報が実在するか**を実データで確定する。
作成: 2026-08-11
State: STATIC_AUDIT（READ ONLY・コード変更なし・新 relation 生成なし）
前提: [SF-1](./SF-1-structure-audit.md), [SF-8](./SF-8-relation-flow-audit.md)
一次資料: `work/SBLGNT/lowfat/04-john.xml`（Lowfat）／`public/assets/data/flow-tree/JHN/6.json`（flow-tree）

> 属性名は推測せず、実在するものだけを列挙する。「ὃ は πᾶν を指す」等の推論はしない。

---

## 0. 結論（先に要約）

- **Lowfat XML は、parent/child 以外に豊富な関係情報を持つ**: `role`（主語/目的語/動詞…）, `rule`/`Rule`（構成規則）, `clauseType`, **`frame`（述語項構造＝dependency）**, **`referent`（coreference/antecedent）**, word 単位 `type`（relative 等）, `articular`, `junction`。`CONFIRMED`
- **flow-tree 生成時にこれらは全て捨てられる**。保存されるのは `id, parentId, type(=class由来), tokens, children` の5フィールドのみ。`CONFIRMED`
- したがって多くの関係は **「データに無い」のではなく「flow-tree 以降へ運んでいない」**（分類B）。`CONFIRMED`
- 例外: **relative pronoun ὃ→πᾶν の明示リンクは Lowfat にも無い**（ὃ に `referent`/antecedent 属性なし）。構造 nesting と role/frame からの間接位置のみ。`CONFIRMED`

---

## 1. Lowfat 実データ（John 6:37・実属性のみ）

`<w>`（語）と `<wg>`（語群）の実属性を、6:37 の主要トークンで確認した（`CONFIRMED`）。

```
<wg class=cl Rule=ClCl nodeId=430060370010360>
 <wg class=cl rule=S-ADV-V clauseType=nominalized>
  <wg class=np rule=All-NP role=s>                 ← 主語NP
   <w 6:37!1 πᾶν>  class=adj  xml:id=n43006037001  morph=A-ASN
   <wg class=cl rule=O-V-IO-S clauseType=nominalized>   ← 関係節（名詞化節）
    <w 6:37!2 ὃ>   role=o  class=pron  type=relative  xml:id=n43006037002  morph=R-ASN
    <w 6:37!3 δίδωσίν> role=v class=verb frame="A1:n43006037002 A2:n43006037004 A0:n43006037006" xml:id=n43006037003
    <w 6:37!4 μοι> role=io class=pron type=personal referent=n43006035004 xml:id=n43006037004
    <wg class=np rule=DetNP role=s articular=true>
     <w 6:37!5 ὁ>  class=det … ／ <w 6:37!6 πατὴρ> class=noun type=common
  <wg class=pp rule=PrepNp role=adv>               ← 前置詞句（副詞的）
   <w 6:37!7 πρὸς> class=prep ／ <w 6:37!8 ἐμὲ> class=pron type=personal referent=n43006035004
  <w 6:37!9 ἥξει> role=v class=verb frame="A0:n43006037003"
 ...（καὶ 以下 τὸν ἐρχόμενον… は class=cl rule=O-ADV-V-ADV 配下。ἐρχόμενον=6:37!12 は
     role=v frame="A0:n00000000000"（項ゼロ）, ἐκβάλω=6:37!17 frame="A0:n43006035004 A1:n43006037012"）
```

### 属性の出現数（1文中・4節で確認）`CONFIRMED`
| 節 | role | rule/Rule | clauseType | frame | referent | type(word) | articular |
|---|---|---|---|---|---|---|---|
| 6:37 | 20 | 25 | 4 | 4 | 3 | 12 | 7 |
| 6:38 | 20 | 25 | 4 | 3 | 2 | 12 | 7 |
| 6:39 | 16 | 15 | 2 | 4 | 5 | 9 | 2 |
| 6:51 | 6 | 10 | 1 | 2 | 1 | 5 | 6 |

- **role 値**: `s, o, v, io, adv, p, vc, aux`（主語/目的語/動詞/間接目的/副詞的/述部/動詞補語/助動詞）
- **rule 値（抜粋）**: `ClCl, S-ADV-V, O-V-IO-S, All-NP, DetNP, PrepNp, O-ADV-V-ADV, DetCL, V-ADV, sub-CL, V-O, NPofNP, Np-Appos, Conj-CL, that-VP, S-VC-P, V-O-IO, AdjpNp` …（構成規則名）
- **frame 例**: `δίδωσίν(6:37!3) A1:ὃ A2:μοι A0:πατὴρ` … 述語がその項（主語A0/目的A1/…）を **node id で** 指す＝依存構造。`A0:n00000000000` は項ゼロ（実装上の欠損マーカー）。
- **referent 例**: `μοι/ἐμὲ/με → n43006035004`（＝6:35 の「私」＝共参照）。`6:39!1 → "n43006039015 n43006039019"`（**複数値**）、`6:51!1 → n43006043002`（**文をまたぐ**）。

## 2. flow-tree が保存する範囲 `CONFIRMED`

`public/assets/data/flow-tree/JHN/6.json` の全 node の distinct keys = **`id, parentId, type, tokens, children`** のみ。

- 例（δίδωσίν, Lowfat では role=v・frame 有り）:
  ```json
  { "id":"n43006037003", "parentId":"…", "type":"word", "tokens":["JHN 6:37!3"], "children":[] }
  ```
  → `role` も `frame` も無い。
- `type` は Lowfat `class` の写像のみ（`cl→clause`, `np→phrase.np`…）。word 単位の `type="relative"` は**保存されない**。
- ただし **node `id` は Lowfat `xml:id`（word）/`nodeId`（一部wg）を保持**している（例 `n43006037003`）。frame/referent が参照する **join key（node id）は生きている**が、frame/referent の値自体が保存されないためリンクは辿れない。

**flow-tree が捨てている Lowfat 情報**: `role, rule, Rule, clauseType, frame, referent, type(word), articular, junction, morph, lemma, gloss, english, domain, ln`。

## 3. NeighborhoodView / Representation で何が失われるか `CONFIRMED`

- **Representation** = `{root, nodesById}`。node は flow-tree JSON そのもの（5フィールド）。**flow-tree からの追加ロスはない**が、上流で既に落ちているため 5 フィールドのみ。
- **buildNeighborhoodView 出力** = `{anchorId, usedFallback, constituents:[{nodeId, tokens, isFocus, expanded, children}]}`。ここでは `type` すら出力から落ちる（View 内部判断のみ）。SF-8 UI は Model を介さず `nodesById` を直接読むため `type` は内部利用可（表示は §6 で禁止）。
- 結論: **関係情報のロスは Lowfat→flow-tree の1段で確定的に発生**。以降の段では新たな関係ロスは無い（元々無い）。

## 4. 3分類（A: 既に利用可能 / B: 上流にあるが運んでいない / C: データに存在しない）

- **A（現在のUI経路で取得可能）**: parent/child、sibling/structural order、clause membership（type=clause）、phrase membership（type=phrase.*）、包含の入れ子。
- **B（Lowfat には有るが flow-tree で失われる）**: role（主語/目的語/動詞/副詞的…）、rule/clauseType（構成規則・節種別）、**frame（述語項＝dependency/governor）**、**referent（coreference/antecedent、一部token）**、word type（relative 等）、articular/junction。
- **C（Lowfat にも無い）**: **relative pronoun ὃ→πᾶν の明示 antecedent リンク**（ὃ に referent 無し）。意味的な節間関係（理由/目的/逆接 等の“意味ラベル”そのもの。※rule 名は構成であって意味関係名ではない）。frame の項ゼロ（`n00000000000`）が指す実体。

## 5. 最終分類表

| Relation | Lowfat | flow-tree | NeighborhoodView | Representation | 現在UI |
|---|---|---|---|---|---|
| parent/child | 存在 | 存在 | 存在 | 存在 | 存在 |
| sibling/order | 存在 | 存在 | 存在 | 存在 | 存在 |
| clause membership | 存在 | 存在 | 存在 | 存在 | 存在 |
| phrase membership | 存在 | 存在 | 存在(構成語として) | 存在 | 存在 |
| head/governor | 存在(frame) | 保持されていない | 保持されていない | 保持されていない | 保持されていない |
| dependency | 存在(frame 述語項) | 保持されていない | 保持されていない | 保持されていない | 保持されていない |
| subject/object | 存在(role) | 保持されていない | 保持されていない | 保持されていない | 保持されていない |
| modifier | 存在(role=adv/adj系・rule) | 保持されていない | 保持されていない | 保持されていない | 保持されていない |
| relative relation | 存在(word type=relative＋構造nesting)／ただし ὃ→antecedent の明示linkは無し | 保持されていない(type=relative捨てる) | 保持されていない | 保持されていない | 構造nestingのみ |
| antecedent/referent | 存在(referent, 一部token・複数値/文跨ぎ有)／ὃ→πᾶνは無し | 保持されていない | 保持されていない | 保持されていない | 保持されていない |
| clause-to-clause relation | 存在(入れ子＋rule/clauseType/role)※構成名であり意味関係名ではない | 部分(入れ子とtype=clauseのみ・rule/clauseType捨てる) | 部分(anchor階層) | 部分(nesting) | 部分(所属/上位の包含のみ) |

（セル値: 存在 / 存在しない / 保持されていない / 未確認）

## 6. Q&A（最終回答）

- **Q1 token A/B の構造関係を直接取得できるか**: Lowfat では**部分的に可**（親子・順序に加え、role・frame(node id)・referent(node id) が id ベースで A↔B を直接結ぶ）。現在のUI経路では**親子・順序・包含のみ**。
- **Q2 parent/children 以外の関係は存在するか**: Lowfat に**存在**（role, rule, clauseType, frame, referent, word type, articular, junction）。flow-tree 以降は**保持されていない**。
- **Q3 head/governor/dependency 相当**: **存在**（`frame="A0:… A1:… A2:…"` が述語→項の依存を node id で明示。A0≈主語/支配項）。flow-tree 以降で保持されていない。
- **Q4 ὃ→πᾶν の relative 関係**: ὃ は `type=relative`,`role=o` を持つが **antecedent/referent 属性を持たない**。⇒ **ὃ→πᾶν の明示関係はデータに存在しない**（分類C）。構造 nesting と role/frame から位置は分かるが「指示先」は無い。推論禁止。（他の代名詞 μοι 等には referent 有り＝分類B/A）
- **Q5 phrase/clause 同士の関係**: Lowfat に**存在**（入れ子＝包含、role＝親内での役割、rule/clauseType＝構成規則・節種別）。ただしこれは**構成名**であって「理由・目的」等の**意味関係名ではない**。flow-tree 以降は包含と順序のみ。
- **Q6 subject/object/modifier 等**: Lowfat に **`role`（s/o/io/v/adv/p/vc/aux）として存在**。flow-tree 以降で保持されていない。
- **Q7 flow-tree の保存範囲**: `class(→type)`／入れ子(parent/children)／子順(structural order)／tokens(ref)／node id(word=xml:id, 一部wg=nodeId) **のみ**。role/rule/clauseType/frame/referent/word type/articular/junction/morph/lemma/gloss 等は**全て非保存**。
- **Q8 既存データだけで Mindmap Relation Flow をどこまで実現できるか**:
  - **現在のUI経路(flow-tree/Representation)のみ** → 包含・兄弟順・clause/phrase membership の**構造マップ止まり**（＝SF-8 で到達済み。役割や指示の枝は出せない）。
  - **Lowfat まで遡れば（次フェーズで flow-tree 生成 or 別経路に role/frame/referent/rule を運べば）** → **推論なしで**、focus→述語項（frame）、subject/object/verb（role）ラベル、coreference（referent）の枝、節間構成（rule/clauseType）まで表示可能。join key（node id）は既に flow-tree 側にも存在するため接続可能。
  - **ὃ→πᾶん型の relative antecedent** は当該 token に referent が無い限り**不可（分類C）**。referent を持つ token の coreference のみ可。

## 7. 次フェーズへの含意（設計判断は次フェーズ・本監査では決めない）

- Mindmap 型 Relation Flow を「実データのみ・推論なし」で実現する鍵は、**Lowfat の `role`/`frame`/`referent`/`rule` を flow-tree（または並行アセット）へ運ぶこと**。これは flow-tree 生成（`scripts/build-flow-tree.cjs`）または Representation schema の拡張＝**コード/データ経路変更**であり、本 SF-9（コード変更禁止）の範囲外。
- 運ぶ場合も **L-0**: frame/referent/role は Lowfat 注釈者が付けた事実であり、こちらで新規推論しない。項ゼロ（`n00000000000`）や referent 欠損は**埋めない**（静寂）。
- neighborhood-view-design.md §6（type 表示禁止）と同様、どの属性を**表示**してよいかは別途 Display 方針の判断が要る（role ラベル表示は §6 と整合させる必要）。
