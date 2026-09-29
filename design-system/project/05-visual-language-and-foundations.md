# Visual Language / Design Principles / Foundations / Accessibility

## 1. Design Principles

Personality: **Quiet / Clear / Intelligent / Modern / Trustworthy / Focused.** Keywords: **Quiet Intelligence**, **Calm Clarity**.

判断基準（繰り返し）：

> Read before interact. Understand before investigate. Content before interface.
> Does this help the user read? If not, do not add it.

参照するのはLinearの情報密度・段階的開示・抑制、Vercel/Geistのトークン化されたシステム思考であり、いずれも配色やレイアウトそのものはコピーしない。両者から借りるのは「態度」——多くの情報を、静かに、秩序立てて見せる態度——である。

### Avoid（固定リスト）

- **宗教的クリシェ**：十字架中心のUI、教会サイト的装飾、過度に牧歌的な表現。
- **テクノロジー系クリシェ**：AIダッシュボード風、未来的UI、ネオン、過剰なグラデーション、開発者ツール的な見た目。
- **SaaS系クリシェ**：ダッシュボードカード、KPIパネル、過剰な角丸コンテナ、過剰なバッジ、設定過多なUI、汎用的な生産性アプリの外観。
- **装飾のための装飾。**

本システムのtoken値（暖色系のpaper背景、控えめな2段階のshadowのみ、pill radiusをSegmented Controlのみに限定する等）は、このAvoidリストを満たすように選定している。

## 2. Visual Grammar — Structural Readingの意味体系

Structural Reading（構造で読む・文の役割で読む・つながりで読む）は、技術的な構文解析ツールではなく「この文はこういう構造になっていたのか」という発見の体験として設計する。実機で確認した既存実装は、すでにネストした箱＋インデントによるReed–Kellogg的な階層表現を持っており、これを踏襲・一般化する。

```text
Reading axis     ← left to right →     （語順・文の流れ）
Structural axis   ↑ top to bottom      （階層・従属関係）
```

3つの意味レイヤーを、色相ではなく色相+明度+ラベルの組み合わせで区別する（`structural-function-*` / `structural-construction-*` / `structural-morphology-*`、いずれも `structural-tag` という同一の小さなラベルクラスでテキストを添える）：

- **FUNCTION**（主語・動詞・目的語・補語など文法上の働き）— 淡い青系の箱（`structural-function-fill`）。
- **CONSTRUCTION**（同格・並列・節の入れ子といった構成関係）— 淡い紫系の箱（`structural-construction-fill`）。
- **MORPHOLOGY**（格・時制・法などの語形変化タグ）— 淡い緑系のチップ（`structural-morphology-fill`）。MORPHOLOGYの緑はProduct Accentの`accent-greek-*`とは明度・彩度が異なる別トークンであり、意味の混同を避ける（§4参照）。

色・線・レイアウト・Typography・Spacing・Shapeは、情報量を増やすためではなく、構造的意味がより直感的に理解できるようにするために使う。1つの文に3層すべてを同時に、常時オーバーレイしない——既定はFUNCTIONのみを見せ、CONSTRUCTIONとMORPHOLOGYはProgressive Disclosure（§5）で段階的に開く。

## 3. Typography rationale

3つの読字言語（日本語・ギリシャ語・英語）＋将来のヘブライ語を扱うため、`reading-ja` / `reading-source` / `reading-en` を意図的に別ファミリーとした（値は `tokens.json` 参照）。

- 日本語本文は明朝体（`reading-ja`）。UI（ナビ・ボタン・パンくず）はゴシック体（`ui-sans`）。この対比自体が「今読んでいるのは本文か、操作しているのはUIか」を、言葉で説明せずとも伝える。
- ギリシャ語・将来のヘブライ語は `reading-source` に統一する。両言語とも複雑な発音記号・母音記号を持つため、開いているフォント資産の中でも学術的信頼性の高いセリフ体（Cardo/Gentium系）を選定した。ヘブライ語実装時はRTLフローを追加するのみで、フォントファミリーの再選定は不要になる設計とした。
- 行間はJapanese本文で2倍前後（`verse-ja`: 17px/34px）と広めに取り、長時間読書での疲労を優先する。Comparison中のみ、密度確保のため1段階詰める（`verse-ja-comparison`: 16px/30px）が、それでも1.85倍程度は確保する。
- Mixed-script（ギリシャ語見出し語＋日本語グロスなど）は`lang`属性ごとにフォントファミリーを切り替える実装とし、単一フォントで全スクリプトをカバーしようとしない（英語フォールバックのみで済ませると、ギリシャ語アクセント記号やヘブライ語母音点が正しく表示されないリスクが高い）。
- `reading-en`は現時点で**将来専用（reserved, not live）**の位置づけである。実機調査で、現行ビルドにはEnglish本文（英語訳の聖書テキスト）が一切存在しないことを確認した。フォントスタック自体は`tokens.json`に確定済みだが、`type.groups`には`verse-en`に相当するスタイル（フォントサイズ・行間・太さ）を意図的に定義していない——実際にEnglish引用が必要になる画面・文脈が定まってから、その文脈の実測に基づいて定義すべきであり、`verse-ja`や`verse-source`の数値を仮に流用して先回りしない（`README.md`参照）。

## 4. Color rationale — GreenとStructural Greenの分離

Greenは2つの異なる意味で使われるリスクがある——Product Accent（Greek Bible識別）と、Structural ReadingのMORPHOLOGYレイヤー（語形変化タグ）——ため、明確に異なるトークン・異なる明度で分離した。`accent-greek-700`（濃い深緑、彩度が低い）と `structural-morphology-ink`（やや明るいセージ寄りの緑）は並べて見ても混同しないよう調整している。1つの画面でこの2つの緑が同時に出る場面（Comparison中にStructural Readingを片方のペインで見る場合など）では、必ず離れた位置に配置し、隣接させない。

## 5. Spacing / Progressive Disclosure

情報は一度にすべて表示しない。基本の開示段階：

```text
Bible Text
 → Immediate Context（節番号・章見出し）
   → Supporting Information（FUNCTION層のみのStructural表示、Translation Bのラベル）
     → Research（語義・形態のPopover、CONSTRUCTION/MORPHOLOGY層）
       → Deep Research（Morph/Syntax Search全画面）
```

各段階は、ユーザーの明示的な操作（タップ・パネルを開く）によってのみ進む。既定の並び順は「本文が一番静かで、深く調べるほど情報密度が増す」という単調増加になるようにする。

## 6. Motion

控えめで機能的。詳細な時間・イージング値、インタラクション別の一覧、「確認済み」と「本システムの設計値」の区別は `10-motion.md` に集約した（tokens.jsonのスキーマにmotionファミリーが存在しないため、トークンではなく専用ドキュメントとして扱う——単独のプリンシプルだけをここに残す）。

- 控えめで機能的。Reading Position保持のための追従スクロール、Panel/Sheetの開閉、Popoverのフェードのみに使う。
- 装飾目的のアニメーション（ページ遷移の派手なトランジション、パルスするバッジ等）は使わない。
- `prefers-reduced-motion` を尊重し、それが指定されている場合はPanel/Sheetの開閉もクロスフェードなしの即時表示に切り替える。

値・根拠・コンポーネント別の適用箇所は `10-motion.md` を参照。

## 7. Accessibility — Foundationとして

後付けではなくFoundationとして扱う。

- **コントラスト**：本文色（`ink-primary`）は`surface-canvas`/`surface-raised`いずれの上でも4.5:1以上（実測、`ink-primary #211f1a` on `surface-canvas #fbfaf7` は約16:1、`surface-raised #ffffff` 上でも同等）。Product Accent（`accent-greek-700`）を背景に文字を置く場合は必ず`ink-on-accent`（白）を使い、これも4.5:1以上を確保する。Structural Reading各層のfill/inkペアも4.5:1以上で選定済み（`tokens.json`各usageに明記）。
- **キーボード操作**：Reading Surfaceの節送り、View Mode切り替え、Comparison Setupのすべてをキーボードのみで操作可能にする。Structural Readingのネストした箱も、Tab順で階層順（FUNCTION→CONSTRUCTION→MORPHOLOGY、外側から内側）にフォーカス移動できるようにする。
- **可視フォーカス**：`focus-ring`（ink色、2px、2pxオフセット）を全フォーカス可能要素に適用し、Product Accentの色と混同しない設計にした（§2 Visual Grammar・`README.md`参照）。
- **タッチターゲット**：モバイルの節タップ領域・Bottom Navigationのタブ・Comparison SetupのRadio行はいずれも44×44px以上を確保する。
- **Reduced Motion**：§6参照。
- **スクリーンリーダー意味論**：節番号は本文と別要素にマークアップし、`aria-label`で「第◯節」と読み上げられるようにする。Structural Readingの箱は`role="group"`＋`aria-label`（"主語：パウロ"等）で、視覚的な箱構造に依存しない情報取得を保証する。
- **色だけに意味を持たせない**：Structural Reading各層は色に加えて`structural-tag`ラベルを必ず併記（§2）。Comparison中のTranslation A/Bも色ではなくラベル文字列（翻訳名）で区別する。
- **多言語可読性**：日本語・英語・ギリシャ語（将来ヘブライ語）それぞれの実測可読性を優先し、単一のフォントサイズ・行間をすべての言語に強制しない（§3）。ヘブライ語追加時はRTL方向の行送り・句読点処理を`reading-source`のCSS論理プロパティ（`margin-inline`等）で吸収できるよう、現行コンポーネントも物理プロパティ（`margin-left`等）ではなく論理プロパティで実装することを推奨する。

## 8. Grid / Reading Measure

Reading Measure（1行あたりの文字数・行幅）は、Spacing（§5, 縦方向のリズム）と対になる、横方向の読みやすさの基礎である。本システムはこれまでGrid/Measureを独立した基礎として明文化していなかった——以下で補う。

**現状（確認済み・暫定値）**：現行実装のReading Surfaceには`max-width: 44em`相当の本文幅の上限があることを実機調査で確認した。ただしこの値が意図的なTypography検証（文字数・字間・フォントでの実測）を経て選ばれたものかは確認できていない——**`44em`は暫定値／検証対象として扱い、本Design Systemが正式に採用した基準値として引用しない**。Phase 1着手前に、`verse-ja`（17px/34px, Mincho）・`verse-source`（18px/34px, Cardo/Gentium）それぞれで実測の1行文字数を確認し、日本語で30〜40字程度、ギリシャ語で50〜75字程度という一般的な可読レンジ（本Design Systemの推奨値であり、現行実装の確認値ではない）に収まっているかを検証したうえで、`44em`を維持するか調整するかを決定すること。

**Comparisonでの列幅（新規の設計要件・実装未確認）**：実機調査で、比較表示の列幅には最小可読幅の下限が定義されていないことを確認した——ビューポートが狭まるほど、Grid/Flexの列が際限なく圧縮されうる状態にある。これはComparison UX原則（`03`§4「Readable Bible first」）に反する。本Design Systemは以下を新たな設計要件として定める（現行実装での確認はできていないため、実装未確認の要求として扱う）：

- Desktop Comparisonの各Translationペイン、およびMobile Comparison（`ComparisonMobileStacked`）の1ブロックは、Single Readingと同じMeasure規律を守る——`verse-ja-comparison`（16px/30px）であっても、単独読書時と体感が変わらない範囲の1行文字数を維持する。
- 列（またはブロック）の幅が、そのMeasureを維持できないほど狭くなる場合は、列を圧縮するのではなくレイアウトを切り替える——Desktop Comparisonの2ペイン横並びは、ペイン幅がMeasure下限を割り込む前に、Mobile Comparisonと同じStacked Readingへフォールバックするレスポンシブ規則を持つべきである（Grid上の`1fr 1fr`のような単純な等分割のみに依存しない）。
- 具体的な下限値（em/ch単位）は、§8冒頭のMeasure実測と合わせて決定する——ここでは「下限を設ける」という要件のみを確定し、数値そのものは検証対象として`03-comparison-architecture.md`§4に追記した注記に委ねる。

## 9. UI Density と Reading Density

情報密度についての議論を単一の「密度」として扱うと、UIを詰めることと本文を詰めることが混同される。本システムは意図的に2つを分ける：

- **UI Density（UIの密度）**：ナビゲーション、ピッカー、チップ、ボタン、Structural Readingのラベルなど、操作・メタ情報の層。ここは積極的に密度を上げてよい——`space-1`〜`space-4`、`ui-caption`〜`ui-body`、`radius-sm`/`radius-md`が担当する範囲であり、Linear的な「多くの情報を静かに、秩序立てて見せる」態度（`05`§1）が最も直接当てはまるのはこの層である。
- **Reading Density（本文の密度）**：`verse-ja` / `verse-source`本体の行間・段落間隔。ここは密度を最大化する対象ではなく、長時間読書での疲労を最優先する——`space-5`〜`space-8`、`verse-*`系スタイルが担当する。Comparison中の`verse-ja-comparison`（16px/30px）はSingleの`verse-ja`（17px/34px）よりわずかに詰めるが、これは「もっと詰められるから詰める」のではなく、2つの翻訳を同時に視界へ収めるための最小限の譲歩であり、下限は§8のMeasure規律で歯止めをかける。
- 実装判断の基準：あるスペーシング・タイポグラフィの変更がUI要素に対するものならUI Densityの基準（積極的に詰めてよい）を、Bible Text本体に対するものならReading Densityの基準（疲労を優先し、安易に詰めない）を適用する。両者を同じ「密度」という一語で議論しないこと。

## 10. High Information Density — 明示的な共存目標として

ブリーフの目標設定は「Quiet Reading Environment」「High Information Density」「Clear Structural Meaning」「Consistent Design System」の4つが並列・co-equalである。これまで本システムの文書群は前者2つを対立するリスクとしてのみ語っており（`08-critical-evaluation.md`「情報密度が高すぎて／低すぎて」）、High Information Densityを積極的に達成すべき目標として明記していなかった。ここで明示する：

**High Information Densityは、Reading Densityを圧縮することでは達成しない。UI Density（§9）とProgressive Disclosure（§5）を通じて達成する。** 具体例：

- `StructuralNode`のFUNCTION/CONSTRUCTION/MORPHOLOGYという3層構造は、1つの文に関する文法情報量としては非常に高密度だが、既定表示はFUNCTION層のみで、視覚的な静けさを保ったまま「さらに調べれば全情報がそこにある」という高密度を実現している——密度と静けさは、Progressive Disclosureを介せば対立しない。
- `ReadingLocationBar`は、Book/Chapter位置・Translation・View Modeという3種の情報を、専用の設定画面に逃がさず1行のバーに収める——UI Densityを上げることで、Reading Surface自体は情報過多にならない。
- `ComparisonMobileStacked`は、2つの翻訳の全文をページ送りせず1つの連続スクロールに収める——ページ分割よりも高密度（一度にアクセスできる情報量が多い）でありながら、単一の読書体験として静かに保たれる（`03`§5.2-5.3）。

これらはいずれも「情報を減らして静かにする」のではなく「情報の提示方法を段階化・整理することで、密度と静けさを両立する」という一貫した解法であり、本システム全体の設計判断（Progressive Disclosure、Semantic Tokens、Component Architectureの役割分離）は、この目標に沿って選ばれている。
