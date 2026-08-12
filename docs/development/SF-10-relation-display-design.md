# SF-10 Relation Display Design — 構造関係表示設計（実装なし）

対象: focus 語を中心に、既存 Lowfat データ上の構造関係を Reading Flow として把握できる表示を設計する。
作成: 2026-08-12
State: DESIGN（コード変更なし・新 relation 推論なし・UI 実装なし）
前提: [SF-8](./SF-8-relation-flow-audit.md), [SF-9](./SF-9-relation-data-audit.md)

> 目的は「構文情報を増やす」ことではない。**focus 語が既存データ上どの構造とどう関係するかを、
> 読書を邪魔しない静かな形で直感把握できる**ようにすること。SF-10 は「何を見せるか」を決める。

---

## 0. SF-9 前提（変更なく引き継ぐ）

- Lowfat に実在: `role` / `rule`(`Rule`) / `clauseType` / `frame` / `referent` / word `type` / `articular` / `junction` / parent・child・order。
- flow-tree は `id, parentId, type, tokens, children` のみ保持（role/frame/referent 等は **Lowfat→flow-tree で破棄**）。
- `id` は Lowfat `xml:id` を保持 ＝ frame/referent の **join key は生きている**（値だけが未搬送）。
- **ὃ→πᾶν の antecedent は Lowfat にも無い**（ὃ に referent 属性なし）。type=relative は構造属性であって指示関係ではない。

---

## 1. Relation 分類と Lowfat 上の根拠

| 分類 | Lowfat 根拠（実測値） | 関係の内容 | SF-9分類 |
|---|---|---|---|
| **A 包含/構造** | `<wg>` 入れ子（class=cl⊃np⊃word）、`parentId`/`children` | 所属まとまり・上位まとまり | A(利用可) |
| **B 順序/兄弟** | children 配列順＝structural order（ref `!n`=surface とは別） | 前の構造 → focus → 後の構造 | A(利用可) |
| **C 役割(role)** | word/wg の `role`＝`s,o,io,v,vc,p,adv,aux` | focus（またはその中心句）の文中の働き | B(未搬送) |
| **D 述語項(frame)** | 動詞の `frame="A0:… A1:… A2:…"`（node id 参照） | 述語 ↔ その項（語）を id で結ぶ | B(未搬送) |
| **E 共参照(referent)** | 一部 pron の `referent="node id …"`（複数値・文跨ぎ有） | 語 ↔ 指示先の語（明示時のみ） | B(未搬送)／ὃ→πᾶνは C(無) |
| **F 構成(rule/clauseType)** | `rule`(All-NP,O-V-IO-S,PrepNp,sub-CL…)、`clauseType`(nominalized…) | 句/節の構成規則名（**意味関係名ではない**） | B(未搬送) |

## 2. 表示優先順位（Tier）と判断

| Relation | Tier | 表示方向 | ラベル | 理由 | リスクと緩和 |
|---|---|---|---|---|---|
| A 包含 | **1 必須** | 上位=上／所属=focus 行を囲む枠、縦細線=包含 | 中立語「所属」「上位」（type 出さない） | Reading Flow の骨格。SF-8 で確立済み | 低。深い節は最寄 clause 止めで抑制 |
| B 順序 | **1 必須** | 水平 ← / →（順序） | なし（矢印=順序のみ） | 「どこを読んでいるか」の流れ | structural≠surface を明記（後置語で不一致有） |
| C 役割 | **2 有用** | focus に付す小タグ（方向を増やさない） | 日本語・控えめ（主語/目的語/動詞/述部/間接目的/副詞的） | 「この語は何をしている語か」は読解に直結 | grammar-tool 化。→ focus 1個のみ・淡色・任意表示 |
| E 共参照 | **2 有用（存在時のみ）** | テキスト注記（線を引かない） | 「この語は〔語/箇所〕を指す」 | 代名詞の指示先は読解に有用・データ明示 | 文跨ぎの線は破綻。→ 線ではなく短い注記 |
| D 述語項 | **2/3 限定** | focus が述語の時のみ、focus 近傍にテキストで項一覧 | 「項: 主語=… 目的語=…」（A0/A1 生値は出さない） | 述語中心の理解に有用 | 全項を線で結ぶと構文解析図。→ 描かない・テキスト・既定オフ |
| F 構成 | **3 表示しない** | —（内部のみ） | — | rule 名は構成コードで読者に無意味。意味関係でもない | 意味(purpose/reason)への誤読。→ 出さない |
| ὃ→πᾶν 指示 | **3 表示しない** | — | — | **データに無い**（referent 欠損） | 推論禁止（L-0） |

**要点**: 空間的な「方向」を持つのは **A(縦=包含)** と **B(横=順序)** の2軸のみに保つ。C は方向を増やさず**タグ**、D/E は**テキスト注記**。これにより「focus から6方向へ枝が伸びる放射状ダイアグラム（＝構文解析図）」を回避する。

## 3. 方向の意味論（ユーザーが何と理解するか）

```
        [上位のまとまり]        ↑ = より大きな入れ物（包含）
             │(縦線=包含・矢頭なし)
 [前] ──→ [FOCUS] ──→ [後]      ← → = 読み進む順序（意味関係ではない）
   └─────所属するまとまり─────┘   枠 = focus が属する最小のまとまり
   (focus に付く小タグ) 主語        role = focus の働き（方向を持たせない）
   〔注記〕この「私」は 6:35 を指す   referent = 明示時のみテキスト
```

- 横矢印は **順序**であって「A が B を修飾/支配する」ではない（誤読防止のため矢頭は細く1種）。
- 縦線は **包含（part-of）**。矢頭を付けない（順序と区別）。
- role は focus の**属性タグ**（枝ではない）。frame/referent は**注記**（線を引かない）。

## 4. ラベルと視覚（Structure Flow 思想を維持）

- 静か・単色アクセント・細罫・非装飾・Reading 優先・mobile 無破綻・grammar-tool 化しない。
- **role → 日本語ラベル対応**（表示する場合）: `s=主語` `o=目的語` `io=間接目的語` `v=動詞` `vc=繋ぎの動詞` `p=述部` `adv=副詞的` `aux=助動詞`。英語専門語（subject/object）は出さない。
- role の帰属注意: `role` は語ではなく**まとまり(wg)**に付くことが多い（例 πᾶν 自身に role なし・囲む np に role=s）。⇒ 「focus はこの〈主語のまとまり〉の中心語」という帰属で示し、「πᾶν＝主語」と語へ断定しない（L-0）。
- frame/referent の生値（`A0:` `n43006035004`）は**UI に出さない**。内部データと表示関係を分離する。

## 5. John 6:37 具体化（focus=πᾶν・実測のみ）

πᾶν(6:37!1) の実データ:
- parent（所属）: `np rule=All-NP role=s`（＝主語のまとまり「すべての〜父」）
- children: なし（word）
- siblings（同一 np 内, structural order）: [πᾶν(focus)], [関係節 O-V-IO-S「〜するもの…父」]
- role: **πᾶν 自身は無し**。囲む np の role=**s（主語）**
- frame: **πᾶν は any frame の項に現れない**（δίδωσίν frame=A1:ὃ A2:μοι A0:πατὴρ／ἥξει A0:δίδωσίν に πᾶν=001 は不在）→ **表示なし**
- referent: **なし** → 表示なし
- clause / clauseType: 最寄 clause=`S-ADV-V clauseType=nominalized`
- rule: np=All-NP（F＝表示しない）

**πᾶν で表示するもの**: A 所属(主語 np)・上位(clause)、B 後=関係節（前=なし）、C role タグ「主語（のまとまりの中心）」。**D/E は無いので出さない**。

対比（同節・別 focus）:
- `δίδωσίν(!3)`: role=v・frame=**A1:ὃ(目的) A2:μοι(間接) A0:πατὴρ(主語)** → D で「項: 主語=父／目的語=ὃ／間接=私」をテキスト注記可能。
- `ὃ(!2)`: type=relative・role=o。**referent 無し** → 「関係詞・目的語」までは示せるが **ὃ→πᾶν の線は禁止**。

## 6. 5代表ケース（焦点の関係が“どう見えるべきか”・実測値ベース）

```
■ John 6:37  focus=πᾶν(!1)   role:主語(np) / frame:なし / referent:なし
      上位: すべての〜するもの与える私父〜のもとに私来る
       │
   ┌ 所属(主語) ─────────────┐
   [πᾶν]★[主語] ──→ [関係節: 〜するもの与える私父]
   （後のみ・前なし。ὃ→πᾶν の指示線は出さない）

■ John 6:38  focus=θέλημα(!10)  role:目的語(np) / frame:なし / referent:なし
   上位: (最寄clause V-O)
    │
   [御心]★[目的語] ──→ [［冠詞］私の]
   （深い入れ子は所属＝最寄まとまりに畳む。role=o を淡タグ）

■ John 6:39  focus=οὗτος(!1)  role:述部(p) / referent:n…015 n…019（複数・明示）
   [οὗτος]★[述部]   〔注記〕この語は「最後の日に…立ち上がらせる/失わない」を指す(明示 referent)
   ──→ [残りの節…]
   （E をテキスト注記で。線は引かない。referent が複数でも語を列挙するだけ）

■ John 11:35 focus=ἐδάκρυσεν(!1)  role:動詞(v) / frame:A0:ὁ Ἰησοῦς
   [ἐδάκρυσεν]★[動詞] ──→ [［冠詞］イエス]
   D注記(任意): 項 主語=イエス   （単純節・上位なし）

■ John 6:51  focus=εἰμί(!2)  role:繋ぎの動詞(vc) / frame:A0:… 
   [私] ──→ [εἰμί]★[繋ぎの動詞] ──→ [パン…下る]
   （S-VC-P。前後の兄弟＋role タグで「主語 → be → 述部」が読める）
```
破綻要因: 6:38 の深い入れ子（→所属を最寄まとまりに畳む）、6:39 の複数/文跨ぎ referent（→線でなく語の列挙注記）、6:51 の複雑節（→前後＋role で十分）。いずれも Tier2 をテキスト/タグに留めれば破綻しない。

## 7. UI 3案の比較

### 案A：最小 Relation Flow（＝現行 SF-8 相当）
```
所属  [前] → [FOCUS] → [後]
        │
上位  [最寄clause]
```
構造(A/B)のみ。role/frame/referent なし。

### 案B：Focus-centered（全方向展開）
```
                [上位]
                  │
[前] ── [FOCUS] ── [後]
        ╱   │   ╲
   role  所属   frame群→各項
              ╲
            referent→別の語（線）
```
role/frame/referent を focus から放射状に線で展開。

### 案C：Hybrid（推奨）
```
所属  [前] → [FOCUS]★[主語] → [後]        ← A/B 常時 + C を focus の小タグ
        │
上位  [最寄clause]
〔任意〕 項: 主語=… 目的語=…   /  この語は〔…〕を指す   ← D/E は存在時のみテキスト
```
Tier1 常時、C(role) を focus タグで常時、D/E は**存在時のみテキスト注記**（線を引かない・既定は控えめ表示）。

| 観点 | 案A | 案B | 案C(推奨) |
|---|---|---|---|
| Reading 性 | ◎ | △(図的) | ○ |
| 構造理解 | △(役割不明) | ◎ | ○〜◎ |
| 情報量 | 少 | 多 | 中(focus局所) |
| grammar-tool 感 | 弱 | **強(放射状=構文解析図)** | 弱〜中 |
| Desktop | ◎ | △ | ◎ |
| Mobile | ◎ | ✗(交差線/overflow) | ◎(タグ/注記は折返し) |
| 実装難度 | 低 | 高 | 中 |
| L-0 安全 | ◎ | △(frame/referent を線で誇張しやすい) | ◎ |

**選定＝案C**。理由: 読解に最も効く「focus の役割(role)」を1タグだけ足し、frame/referent は明示時のみテキストで添える。放射状の線（案B）は構文解析図化・mobile 破綻・L-0 誇張のリスクが高い。

## 8. 最終決定（SF-10 の確定事項）

1. **表示する relation**: A 包含 / B 順序（Tier1・常時）、C role（Tier2・focus タグ）、E referent と D frame（Tier2・**明示時のみテキスト注記**）。
2. **表示しない relation**: F rule/clauseType（構成コード）、frame/referent の生値（A0/node id）、**ὃ→πᾶん等 referent 非明示の指示関係**、意味/談話関係（purpose/reason 等）。
3. **方向**: 横 ←/→＝順序、縦＝包含（矢頭なし）。role は方向を持たせず focus タグ。referent/frame は線を引かずテキスト。
4. **視覚表現**: 単色アクセント＝focus のみ。role タグ・注記は淡色・小。線は細1種。装飾なし。
5. **label**: 構造は中立語（所属/上位）、role は日本語（主語/目的語/動詞…）、frame/referent は自然文注記。英語専門語・生コードは出さない。
6. **focus 中心レイアウト**: SF-8 の「所属帯（前→focus→後）＋上位」を土台に、focus に role タグ、下に存在時のみ D/E 注記。
7. **mobile fallback**: タグは chip 内、注記は帯の下に折返し。線を引かないので overflow・交差なし。
8. **Lowfat→flow-tree へ運ぶ必要がある属性（SF-11）**: `role`（word/wg 両方）、`frame`、`referent`。join key の node id は既存。`rule`/`clauseType` は Tier3 のため当面不要（将来 F を使うなら追加）。
9. **推論禁止境界**: referent 非明示の指示を作らない／frame の項ゼロ(`n00000000000`)・欠損 referent を埋めない／role は帰属レベル（語 vs まとまり）を偽らない／rule 名を意味関係へ翻訳しない。
10. **次フェーズ(SF-11)実装範囲**: (a) `scripts/build-flow-tree.cjs` で role/frame/referent を node へ付与（schema 拡張 v2, join key=既存 id）または並行アセット化、(b) Representation/表示層で focus の role タグ＋存在時 D/E 注記を描画（案C）、(c) 回帰: 既存 flow-tree schema 依存テストの更新、(d) L-0/§6 整合（どの属性を表示可とするかの Freeze）。**SF-11 で初めてコード変更する。**

## 9. L-0 境界（明記）

- Lowfat に明示された事実のみ表示。無い関係（ὃ→πᾶν 等）は生成しない。
- `frame`/`referent` は Lowfat 注釈者の付与物。こちらで補完・推定しない。欠損は静寂。
- `rule`/`clauseType` は構成名であり意味ではない。意味関係（目的/理由/結果）へ変換しない。
- role の語/句への帰属を偽らない（「このまとまりが主語」と「この語が主語」を区別）。

## 10. SF-11 への引き継ぎ（データ経路に足すもの）

- **必須搬送**: `role`, `frame`, `referent`（node id で join）。
- **任意（将来）**: `rule`, `clauseType`, word `type`。
- schema 拡張は flow-tree v2 として neighborhood-view-design.md / flow-tree-representation-schema.md の凍結境界に沿って行い、表示可否は §6 と整合させる。
