# Product Family Architecture / Reading Architecture

## 1. Product Center

このProductの中心は「聖書を読むこと」であり、目指す体験は「聖書がよく分かった」——原著者の意図をより正確に理解すること——である。ギリシャ語学習アプリでも、聖書研究ツールでも、神学ダッシュボードでも、AIツールでも、SaaSダッシュボードでもない。原語・語義・形態・統語・構造・翻訳比較はすべて重要だが、主役ではない。主役は聖書本文そのものである（**The Bible remains the visual foreground.**）。

このDesign Systemのすべての判断は、次の問いに対する答えで検証される：

> Does this help the user read? If not, do not add it.

## 2. Product Family Architecture

```text
聖書 (Product Family)
│
├── 聖書［緑版］  ← 現行Primary Product（本Design Systemの実装対象）
│   └── Greek
│       ├── LXX（七十人訳）
│       └── New Testament
│
└── 聖書［赤版］  ← Future Product（Design上は準備するが実装対象ではない）
    └── Hebrew
        └── Hebrew Bible (Old Testament)
```

GreenとRedは単なるThemeではなく、**Bible Language / Corpusを表すProduct Identity**である。

```text
Product Accent
├── Greek  → Green  (accent-greek-*)
└── Hebrew → Red    (accent-hebrew-*)
```

この構造をToken Systemに直接埋め込んだ（`tokens.json` の `accent-greek-*` / `accent-hebrew-*`）。両ファミリーは同じ階調構造（050 / 100 / 300 / 600 / 700）を持つため、赤版が実装される際も、色の「役割」を再設計する必要はなく、Product Accentのfamilyを差し替えるだけで済む。現行実装では `accent-hebrew-*` は一切使用しない——将来のための在庫であり、今日のUIの一部ではない。

現在の青系UIは、Green-centered Product Identityへ移行する。ただし「緑色だらけ」にはしない。Greenは、Product Identity・Navigation Context・Selected State・Key Interactive Elementsという、限られた意味的役割にのみ使う。聖書本文の可読性を損なう位置には絶対に置かない（本文＝`ink-primary`、Greenは本文色として一度も使われない）。

## 3. Brand Context — 背景としてのBrand

日本語ブランド「ウオノ」、英語ブランド「Fish Gate」、Tagline「Beyond Boundaries. Beyond Translation.」は、Reading Surfaceの主役ではない。**Brand outside. Bible inside.** の原則に従い：

- Reading Surface / Comparison Surface / Research Panel — Brand要素は最小限（タブのタイトルバーに小さく「聖書アプリ」とあれば十分。Tagline・ロゴマーク・Fish Gateという英語表記は出さない）。
- Brand Surface / Landing / About / Documentation — Brand Identityを明確に使ってよい。ウオノ／Fish Gate／Taglineはここでのみ前面に出る。

この境界はNavigation Architecture（`02-information-and-navigation-architecture.md`）のSurface分類と対応している。

## 4. Reading Architecture — Design Systemの上位構造

Design Systemの「見た目」を決める前に、次の6つの概念を固定する。これらはVisual Designより上位のUX制約であり、どのRepresentative Screenも、この6つの整合性を壊してはならない。

### 4.1 Bible Location — 基本単位

Productの基本単位は「画面」ではなく **Bible Location** である。

```text
Book → Chapter → Verse → Reading Location
```

内部Canonical Identityは `book / chapter / verse / tokenIndex`（既存実装のまま、変更しない — `07 Existing Product Constraints` 参照）。UI上も常に「今どこにいるか（画面名）」ではなく「今、聖書のどこを読んでいるか（Bible Location）」を明示する。既存実装のトップバー（`新約聖書 › ローマ › 1章 › 口語訳`）はこの原則にすでに近く、温存すべき資産である。

### 4.2 Reading State — SingleとComparison

Reading Stateは「どのような読書状態にいるか」であり、Viewや画面遷移ではない。

```text
Reading State
├── Single       — 1つの翻訳を読む通常状態
└── Comparison   — 同じBible Locationを複数の翻訳で読む状態
```

Comparisonは分析ツールでも差分ビューアでもなく、**「同じ聖書箇所を別の翻訳でも読むためのReading State」**である。詳細は `03-comparison-architecture.md`。

### 4.3 Translation — Reading Modeではない

口語訳（1955）・新改訳2017・新共同訳などは **Translation** であり、View / Reading Modeではない。

```text
Translation
├── 口語訳（1955）
├── 新改訳2017
├── 新共同訳
└── その他
```

### 4.4 View / Reading Mode — 同じ本文の見方の切り替え

```text
View / Reading Mode
├── Default        — 通常の逐次テキスト
├── WORD_ORDER      — 語順で読む
├── STRUCTURE       — 構造で読む
├── CLAUSE_ROLE     — 文の役割で読む
└── RELATION        — つながりで読む
```

これら5つのラベルは既存実装の実ラベル（語順で読む／構造で読む／文の役割で読む／つながりで読む）と対応させた。別々のアプリではなく、**One Bible Reading Surface, multiple ways of seeing the same text** である。

### 4.5 3つの軸を混同しない

既存実装を実機で検証したところ、現在の「読み方を選ぶ」パネルは Translation（口語訳）と View Mode（語順で読む・構造で読む…）を **1つのフラットな選択リストの中で兄弟項目として** 提示している。これは概念的な誤り——TranslationとView Modeは別の軸であり、意思決定の粒度も頻度も異なる——であり、本Design Systemが是正すべき最重要ポイントの一つである（詳細な指摘と修正案は `06-component-architecture.md` の ReadingModePicker、および `08-critical-evaluation.md` を参照）。

### 4.6 Reading Position — 状態の保持

Reading Positionは以下をできる限り保持する：

```text
Book / Chapter / Verse
Reading State（Single / Comparison）
View Mode
Translation A / Translation B
Reading Position（スクロール中の実際の読書点）
```

ユーザーが Reading → Comparison → Research → Back と移動しても、「別の場所に飛ばされた」と感じさせない。既存実装の「履歴」機能（最近読んだ箇所／最近見た単語）は、このReading Positionの基盤としてすでに存在する資産であり、削らずに拡張する。詳細は `04-research-and-state-transitions.md`。

## 5. One Reading Engine, Multiple Reading Modes

既存のBible Reading Engineは「One Reading Engine, Multiple Reading Modes」という方向性をすでに持っている（Default / WORD_ORDER / STRUCTURE / CLAUSE_ROLE / RELATIONが同一のBible Reading Surfaceを共有する構造）。この方向性は変更せず、Design Systemはこの上に**共通のReading Identityを維持しながら見え方・情報構造・視覚的意味を切り替える**視覚言語を与える（`05-visual-language-and-foundations.md` のStructural Visual Grammarを参照）。

## 6. 既存実装からの示唆（要約）

実機（bible-text.pages.dev）で確認した構造をこのDesign Systemの前提として採用した：

- 左ナビゲーションは Translation選択 → 旧約聖書／新約聖書 → ツール → 検索 → ハイライト／メモ → 履歴（最近読んだ箇所／最近見た単語）という階層をすでに持つ。これはNavigation Architecture（`02`）の骨格として温存する。
- 「読み方を選ぶ」モーダルには単一表示／比較表示のセグメントが既に存在し、比較表示では「左列／右列」という発想もすでにある。ただし左右列の中身が「Translationと View Modeの同じフラットリスト」であり、Translation A / Bという明確な対概念になっていない。
- Comparisonの「翻訳同士の比較」は現状、アプリ内では実現しておらず、「外部の翻訳で比較」という形で外部サイトへ離脱する導線になっている（新改訳2017・新共同訳がここに列挙されている）。これは歴史的な暫定実装であり、本Design Systemはこれをアプリ内Reading Stateとして取り込む方向を提案する（`03`）。
- Structural Reading（構造で読む）は、デスクトップでは右側パネルとして展開され、ネストされた箱と「同格」「主語」「副詞的」「前置詞句」「関係節」といったラベルによるReed–Kellogg的な階層表現を、すでに実装している。この視覚文法は非常に良質な出発点であり、Design Systemはこれをトークン化して一般化する（`05`）。
- モバイルの「読み方」ボトムシートは、デスクトップと異なり Single/Comparison の切り替えが露出しておらず、View Modeの単一選択のみに縮小されている。これは「モバイルはデスクトップの縮小版」という、このDesign Systemが最も強く否定する状態そのものであり、Mobile Comparisonの再設計（`03-comparison-architecture.md` §Mobile Comparison）で最優先に扱う。
