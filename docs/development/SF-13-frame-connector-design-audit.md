# SF-13 Frame Connector Design Audit（設計のみ・コード変更なし）

作成: 2026-08-12
State: DESIGN AUDIT（実装しない）
前提: [SF-10](./SF-10-relation-display-design.md)（凍結）, [SF-11](./SF-11-relation-transport-implementation.md)（データv2）, [SF-12](./SF-12-relation-visual-refinement.md)（role 空間統合）
人間判断: 本機能は「ある程度 構文解析ツールらしい見た目でよい」。ただし **推論禁止**。

> 目的: Lowfat の `frame`（述語↔項）に**明示された node-id 間だけ**を視覚的に接続する設計を確定する。
> referent は別種の relation として別チャネルで扱う。ὃ→πᾶν 等データに無い関係は生成しない。
> **包含 / 順序 / frame / referent を同じ視覚表現に混ぜない**（4チャネル分離）。

---

## 1. 実データ（JHN 6:37/38/39/51・v2 アセット実測）

frame の項ターゲットは4分類に落ちる（`focus からの接続可否`が変わる）:

| 分類 | 意味 | 接続 |
|---|---|---|
| **直兄弟** | source と同じ親の子（同一 band 内） | ○ 帯内で短い弧 |
| **入れ子/別枝** | 同一 sentence 内だが直兄弟でない（ある band chip の中） | △ その語を含む band chip へ接続（drill しない） |
| **文外** | node-id が当該 sentence tree に不在（例 A0:6:35!4） | ✗ 描かない（推論しない） |
| **ゼロ** | `n00000000000`（項省略） | ✗ 描かない |

代表 frame edges（focus 候補＝述語）:
```
6:37 与える(v) → A1 〜するもの(直兄弟) / A2 私(直兄弟) / A0 父(入れ子=［冠詞］父chip内)
6:37 来る(v)   → A0 与える(入れ子=すべて…父chip内) ／ 別frame A0 ゼロ
6:37 追い出す(v)→ A0 文外 / A1 来る(入れ子)
6:38 送る(v)   → A0 父(入れ子) / A1 私(直兄弟)
6:39 与える(v) → A0 送る(入れ子) / A1 〜する者(直兄弟) / A2 私(直兄弟)
6:39 立ち上がる(v)→ A0 文外 / A1 彼(直兄弟)
6:51 生きる/下る(v)→ A0 パン(入れ子)
```
referent edges（大半は文外＝Jesus「私」/他節）:
```
6:37 私×3 → 文外(6:35)     6:38 私の・私 → 文外
6:39 この → 滅ぼす(同文) 立ち上がる(同文)  ／ 彼 → 与える(同文)   ← 同文=接続可
6:51 私 → 文外(6:43)
```
**確認**: ὃ(6:37!2) は frame にも referent にも現れない → ὃ→πᾶν は不在（描かない）。

## 2. どの relation を線で結べるか

- **frame（述語→項）**: source と target が**同一 sentence tree に在る**場合のみ接続可。文外・ゼロは描かない。
- **referent（共参照）**: 明示 referent の target が**同一 sentence 内**の時のみ接続可（6:39 のみ該当）。文外は線にしない（SF-12 の短い注記 or 非表示）。
- **絶対に描かない**: 非明示の関係（relative の antecedent 等）、role から推測した関係。

## 3. focus からどこまで接続するか

- **focus-incident のみ**（focus を端点に持つ edge だけ）。sentence 全体の frame グラフは描かない。
  - focus が述語(role=v/vc) → focus → その項（in-band 分のみ）。
  - focus が項 → focus → それを項に持つ述語（in-band 分のみ）。
- スコープは **focus が属する 1 band**（＝所属まとまり）に限定。band 外（文外含む）へは線を伸ばさない。
  - 効果: edge は focus を共有する「扇形」になり、相互交差が最小化される。

## 4. nested constituent の扱い

- band は親の子で親の全 token を分割被覆する。frame target の token は**必ずどれか1つの band chip に含まれる**（同一 band 内なら）。
- ⇒ target 語が multi-token chip（例 ［冠詞］父）の内部でも、**その語を含む band chip へ接続**する（chip 内部の個別語まで drill しない）。
- target が band の外（別 clause・文外）なら接続しない（§2）。band chip 側に「外を指す項あり」の微標識に留める案は Tier下げ（既定オフ）。

## 5. structural order と connector の交差

- structural order は**不変**（並べ替えない）。項は focus の前後どちらにも来るため、connector は中間 chip を跨ぐ。
- 対策:
  1. frame connector は **chip 行の下** に弧（arc）で描く（本文・role 行に被せない）。
  2. focus-incident のみなので弧は focus を共有＝扇形。**span の長い弧を外側、短い弧を内側**に入れ子配置して視認性を確保（依存弧の定石）。
  3. 矢頭は項側（述語→項の向き）。1色・細線。
- referent は**別チャネル**（chip 行の**上**に点線弧、別色、矢頭なし）。frame と混ぜない。

## 6. mobile 360px の成立

- 帯が1行に収まらず**折返す**と、行を跨ぐ弧は破綻する。
- フォールバック（幅狭 or 折返し検出時）:
  - frame/referent の**弧を描かない**。
  - SF-12（role を各 chip 真上へ整列）を維持＋ focus 述語時のみ**短い項注記**（「項：目的語 〜するもの／間接目的語 私／主語 父」＝focus 近傍・1行）。
  - referent 同文は「共参照：…」注記。
- ⇒ desktop 広幅＝弧、mobile/折返し＝SF-12＋注記、の**レスポンシブ縮退**。情報は保持し表現だけ落とす。

## 7. 4チャネル分離（混ぜない）

| relation | 視覚チャネル |
|---|---|
| 包含(parent/child) | 帯の面＋上位への縦線（矢頭なし・既存） |
| 順序(structural order) | chip 間の水平 →（既存） |
| **frame(述語↔項)** | **chip 行の下の実線弧（矢頭=項側・色A）** |
| **referent(共参照)** | **chip 行の上の点線弧（矢頭なし・色B）** |

role（SF-12）は各 chip 真上のラベル（チャネルではなく属性）。生値(A0/A1/node id/s/o)は非表示。

## 8. 3案比較

### 案A：Full dependency arcs（band 内の frame 全 edge を弧で）
band に現れる全述語の項を弧で描く。
- ◎最も図的／✗交差多・mobile 破綻・focus 中心でない・grammar-tool 感最大。

### 案B：Focus hub connectors（focus 端点のみ・扇形弧）
focus-incident の frame edge だけを chip 行下に扇形弧で。referent 同文は上に点線弧。
- ○交差最小・focus 中心・実装中／△弧のため mobile は縮退必須。

### 案C：Responsive Hybrid（採用候補）
案B（focus-incident 弧）を desktop 広幅で描き、**mobile/折返し時は SF-12＋短い項注記へ縮退**。referent は同文のみ別チャネル（上・点線）、文外は注記。
- ◎focus 中心・交差最小・mobile 成立・情報保持／実装は「弧レイヤ＋縮退」の2経路で中程度。

| 評価 | 案A | 案B | 案C(候補) |
|---|---|---|---|
| frame の可視化 | ◎ | ○ | ○ |
| 交差の少なさ | ✗ | ◎ | ◎ |
| focus 中心 | ✗ | ◎ | ◎ |
| mobile 360 | ✗ | △ | ◎ |
| grammar-tool 過剰 | 強 | 中 | 中(可) |
| 推論なし/4チャネル分離 | ○ | ◎ | ◎ |
| 実装複雑度 | 高 | 中 | 中〜高 |

## 9. 実装候補＝案C（Responsive Focus-incident Frame Arcs）

- **接続対象**: focus-incident・同一 band・frame 明示 edge のみ。文外/ゼロは非描画。
- **幾何**: chip 行の下に実線弧（矢頭=項）。span 長で入れ子配置。focus 共有の扇形。
- **referent**: 同文 target のみ chip 行の上に点線弧（別色・矢頭なし）。文外は短い注記 or 非表示。
- **nested**: target 語を含む band chip へ接続（drill しない）。band 外は接続しない。
- **mobile/折返し**: 弧を描かず SF-12＋focus 近傍の短い項注記へ縮退。
- **L-0**: frame/referent の node-id 明示 edge のみ。推論・補完・antecedent 生成なし。ὃ→πᾶన 非描画。
- **チャネル分離**: 包含=面/縦線、順序=水平→、frame=下弧(実線)、referent=上弧(点線)。混ぜない。

## 10. 代表ケース（設計イメージ・ASCII）

```
■ 6:37 focus=与える(述語)  … frame: A1 ὃ / A2 μοι / A0 父（全て同band）
   目的語      動詞★     間接目的語     主語
  [〜するもの]→[与える]★→ [私]  →  [［冠詞］父]
       └────────┘  └───┘        │        （下：実線弧・矢頭=項・focus起点の扇形）
       └──────────────────────────┘

■ 6:37 focus=ὃ(項)  … ὃ は 与える の A1
   目的語★      動詞      間接目的語     主語
  [〜するもの]★→[与える]→ [私] → [［冠詞］父]
       └───────┘                              （focus→その述語 1本のみ）
   referent: なし（ὃ→πᾶν 描かない）

■ 6:39 focus=この(demonstr., 同文referent 有)
  [この]★ → [ … ]
     ⋯⋯⋯⋯⋯⋯⋯⋯→ 滅ぼす / 立ち上がる     （上：点線弧＝referent・別チャネル）

■ mobile 360（折返し時・弧なし縮退）
   目的語      動詞★     間接目的語  主語
  [〜するもの]→[与える]★→[私]→[父]
   項：目的語 〜するもの／間接目的語 私／主語 父   （focus近傍の短い注記）
```

## 11. 未解決（実装フェーズ SF-14 で判断）

- 弧描画方式（inline SVG vs CSS）。ゼロ依存方針のため inline SVG を1つ差すのが有力。
- 「折返し検出」の実装（ResizeObserver か CSS container query か固定ブレークポイント 768/幅計測）。
- band 外/文外項の微標識を出すか（既定は非表示）。
- referent 複数 target（6:39 この→2件）の弧の重なり順。
- 実ブラウザ検証（SF-11/12 と同じ headless 制約への対処）。

**本監査の結論**: 実装候補は **案C**。SF-14 で 案C を実装する（本 SF-13 ではコード変更しない）。
