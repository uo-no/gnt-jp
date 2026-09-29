# Component Architecture

コンポーネントは、Reading Architectureの4つの軸（Bible Location / Reading State / Translation / View Mode）をUI上で混同しないことを最優先に設計する。8つのコンポーネントを本Design Systemの`components/`配下にライブプレビュー付きで収録した。残りは仕様のみ記載する（実装は`09`のPhaseに従う）。

## 収録コンポーネント（ライブプレビューあり）

### Verse — Bible Text / Verse / Paragraph
本文の最小単位。節番号（`ui-caption`, `ink-tertiary`）＋本文（`verse-ja` / `verse-source`）。節番号は本文から`space-2`離し、本文へのタップ領域を広く取る（Research起動のトリガー）。段落境界は`space-6`の余白のみで表現し、罫線を引かない——余白そのものが構造を語る（`05`§5 Spacing）。

**Comparison中のみの例外**：Single Readingでは節番号を含む節全体がResearch起点（タップ領域は本文＋番号）だが、Comparison（`ComparisonMobileStacked`）では番号と本文のタップ役割を分離する——番号＝対応節へのジャンプ（`03`§5.6）、本文＝Research起点。理由と要確認事項は`03-comparison-architecture.md`§5.6・§5.10を参照。

### ReadingLocationBar — Breadcrumb / Context Navigation / Reading Position
既存のトップバーbreadcrumb（`新約聖書 › ローマ › 1章`）を踏襲しつつ、末尾のTranslation/View Mode表示を独立したチップとして分離した。位置情報（Book/Chapter、`ui-label`）と読み方情報（Translation・View Mode、背景つきの小さなチップ）を視覚的に別グループとして提示し、§の混同を物理的に防ぐ。

### ReadingStateSwitch — Segmented Control（Single / Comparison）
`radius-pill`を使う唯一の場所。Reading Stateという「今読んでいる状態」を切り替える、意味的に特別なコントロールであることを形で示す。Translation選択やView Mode選択には`radius-pill`を使わない（他は`radius-md`の行選択）。

### StructuralNode — Structure Node / Relation / Clause / Hierarchy
FUNCTION/CONSTRUCTION/MORPHOLOGYの3層を、ネスト＋インデントで表現する箱。`structural-connector`色の細い接続線で親子関係を示す。既定はFUNCTION層のみ展開、CONSTRUCTION/MORPHOLOGYはタップで開く（Progressive Disclosure）。

### ComparisonMobileStacked — Mobile Comparison Surface
`03-comparison-architecture.md`§5で設計したStacked Readingの中核コンポーネント。Translation A・Bは単一の連続スクロール上に`space-7`の間隔と1本の`border-hairline`で区切って並ぶ（独立した2つのスクロール領域ではない、§5.3）。各`Translation Label`は`position: sticky`でスクロール中も識別可能にし（§5.5）、節番号タップで対応節へ一回限りスムーズジャンプする（§5.6）。常時スクロール同期は行わない。

### BottomNavigation — Mobile App-level destinations
Reading/Comparison/Researchを含まない、4項目のApp-level navigationのプレビュー（`02`§5）。

### ProductAccent — Product Family Color System
Green（Greek・現行）とRed（Hebrew・将来）のトークンを並べた、Product Accentのセマンティック構造そのものを説明するための参照コンポーネント。実装UIには直接使わないが、将来の赤版着手時に「同じ構造をfamilyだけ差し替える」ことを示す資料として収録した。

### Button — Primary / Secondary / Ghost
Controlsの基礎。Primaryは`accent-greek-700`塗り＋`ink-on-accent`、Secondaryは`border-strong`のアウトライン＋`ink-primary`、Ghostは背景なし＋`ink-secondary`。Reading Surface内にPrimary Buttonを置く頻度は最小限にする（多用するとSaaS的になる、`05`§1 Avoid）。

## 仕様のみ（Phase 2以降で実装、`09`参照）

**Navigation**: Book navigation / Chapter navigation / Context navigation（既存資産の再構成、`02`）／Mobile navigation（ヘッダー＋ボトムシート起点、`03`§5.6）。

**Reading**: Translation Label（Comparisonペイン見出し。`ui-label`、`ink-secondary`、翻訳名のみ・アイコンなし）／Reading Mode Indicator（現在のView Modeを示す小さなアイコン＋ラベル。TranslationのチップとStructural Reading）／Comparison Surface（デスクトップ版。左右2ペイン、`ComparisonMobileStacked`と同じToken・同じVerse組版比率を横並びに再配置したもの）／**ReadingModePicker**（`読み方を選ぶ`パネルの再設計。既存実装への具体的な指摘：現状は「Translation（口語訳）」と「View Mode（語順で読む 等）」が同一リストの兄弟項目として並んでおり、`01`§4.5で指摘した概念混同がUIに直接現れている。再設計では、パネル内を「Translation」セクションと「View Mode」セクションに見出しで分離し、さらにReading State（Single/Comparison）は`ReadingStateSwitch`として最上部に独立させる三段構成にする）。

**Supporting Interaction**: Tooltip／Popover（語タップ時の語義要約、Research Layerへの入口）／Context Menu／Selection Interaction（節・語の選択状態、ハイライト機能との接点）／Research Entry Point（「さらに調べる」の統一されたアフォーダンス——既存実装の「前の語の読解に戻る」導線を踏襲し、Research内からReadingへの復帰経路を必ず視覚的に用意する）。

**Controls**: Icon Button／Select／Toggle／Menu／Tabs——いずれも`Button`と同じ塗り・境界線トークンを使い、独自の色を持たない。

## 現状のReadingModePicker実装に対する具体的評価

実機での検証結果を再掲する（デスクトップの「読み方を選ぶ」モーダルおよびモバイルの「読み方」ボトムシート、いずれも確認済み）：

1. デスクトップ：単一表示/比較表示のセグメントは存在するが、比較表示の左列・右列内が「口語訳（1955）」と4つのView Modeの混在フラットリストになっている。
2. モバイル：Single/Comparisonの切り替え自体が「読み方」シートから消えており、View Mode単一選択のみになっている。
3. 「外部の翻訳で比較」が、アプリ内Comparisonとは別セクションの、別の仕組み（外部サイトへの遷移）として存在している。

この3点はいずれも、Reading State・Translation・View Modeという3軸をUIレベルで独立させることで解消される。`ReadingModePicker`の再設計と`03`§2の Comparison Setup 再構成は、同じ根本原因（3軸の未分離）に対する1つの解であり、別々の修正ではない。

## Component States（Default / Hover / Focus-visible / Pressed / Selected / Disabled）

各コンポーネントについて、インタラクション状態を以下の3区分で記す：

- **確認済み** — 実機（`uo-no/gnt-jp` main、読み取り専用調査）で該当のセレクタ・スタイルを直接確認した。ファイル・行番号を併記する。
- **設計要件・実装未確認** — 本Design Systemが新たに定める要件であり、現行実装での存在は確認できていない（未実装、または調査で該当セレクタが見つからなかった＝NOT FOUND）。実装時にゼロから作る必要がある。
- **該当なし** — このコンポーネントの性質上、その状態自体が成立しない。
- **判断不能** — 調査対象ではあったが、この記録の時点で個別の確認結果（セレクタ・行番号）を保持していない。実装着手前に再確認すること。

### Button

- Default：確認済み（Primary/Secondary/Ghostの塗り分け、本ファイル上部＋`Button/README.md`）。
- Hover：確認済み（`.app-btn`にHoverスタイルが存在、`components.css:146-149`）。ただし色の対応（例：Primary Hoverに`accent-greek-600`を使うか）は設計要件・実装未確認——現行Hoverが本システムのトークンと一致するかは個別に確認すること。
- Pressed：設計要件・実装未確認（現行実装にPressedスタイルはNOT FOUND）。
- Focus-visible：設計要件・実装未確認（現行実装にFocusスタイルはNOT FOUND）。`focus-ring`トークン（`05`§7）を適用する。
- Selected：該当なし（Buttonに選択状態という概念はない）。
- Disabled：設計要件・実装未確認（現行実装にDisabledスタイルはNOT FOUND）。`ink-tertiary`＋塗りの不透明度低下を推奨するが、これは本システムの提案であり確認済みの値ではない。

### Verse

- Default：確認済み（節番号＋本文のレイアウト、`Verse/README.md`）。
- Hover：判断不能。
- Pressed（タップ時の視覚フィードバック）：設計要件・実装未確認。
- Focus-visible：設計要件・実装未確認（キーボードでの節送りが`05`§7で要件化されているが、対応するフォーカス表示は現行実装・本システムのプレビューいずれにも未確定）。
- Selected：該当なし（通常のVerseに選択状態はない。ハイライト機能との接続は将来課題として`08`に既出）。
- Disabled：該当なし。

### StructuralNode

- Default：確認済み（ネスト＋インデント表現、本ファイル・`StructuralNode/README.md`）。
- Expanded / Collapsed：確認済み（`.hdg-collapsed`クラスが現行実装に存在）。
- Hover：判断不能。
- Focus-visible：確認済み（`.hdg-clause--sub`に`outline: 2px solid var(--color-domain, #7a7aaa); outline-offset: 2px;`、`index.html:4926-4929`）。**ただし本システムの`focus-ring`はink固定色を原則とする（`05`§7）のに対し、現行実装はノード種別ごとの色（`--color-domain`）でフォーカスを表現しており、方針が一致しない。** どちらを採るかは意図的な決定が必要で、本書は現行実装の色を自動的に正としない——Phase 2着手前に判断すること。
- Pressed：判断不能。
- Selected：該当なし（展開/折りたたみのみで、選択という概念は持たない）。
- Disabled：該当なし。

### BottomNavigation

- Default / Active（現在の色分け）：確認済み（本ファイル・`BottomNavigation/README.md`記載の`accent-greek-700`/`ink-tertiary`ルール）。
- Pressed：確認済み（背景`rgba(0,0,0,0.05)`、`index.html:6007`）——この状態は従来`BottomNavigation/README.md`に未記載だったため、今回追記した（下記参照）。
- Selected（現在タブであることを示す、色以外の追加インジケータ）：設計要件・実装未確認（現行実装はActiveの色分けのみで、それ以上の「現在地」インジケータはNOT FOUND）。
- Focus-visible：設計要件・実装未確認（NOT FOUND）。
- Hover：該当なし（モバイル・タッチ前提のナビゲーションであり、ホバー可能なポインタを前提にしない）。
- Disabled：該当なし（4つのApp-level destinationは常に到達可能である想定）。

### ReadingLocationBar

- 全状態：該当なし。情報表示のみの非インタラクティブなコンポーネントであり（`ReadingLocationBar/README.md`にすでにその設計を明記済み）、実機調査でも`.rcb-container`に対応するインタラクティブ状態はNOT FOUNDだった——設計と実装が一致していることを確認できた項目である。

### ReadingStateSwitch

- Default / Active / Inactive：確認済み（`.bp-seg-btn`、本ファイル・`ReadingStateSwitch/README.md`の記述と一致）。
- Hover：判断不能。
- Pressed：設計要件・実装未確認（NOT FOUND）。
- Focus-visible：設計要件・実装未確認（NOT FOUND）。`focus-ring`トークンを適用する（Segmented Controlの操作はキーボードのみでも完結する必要がある、`05`§7）。
- Selected：Activeと同義（上記）。
- Disabled：該当なし（常にどちらか一方がActiveであり、コントロール全体が無効化される状況を想定しない）。

### ComparisonMobileStacked

- 全状態：該当なし（現状の理由）。実機調査で、現行実装にはモバイルでComparisonというReading State自体が選択できないことを確認済み——つまりこのコンポーネントに対応する既存UIが存在しないため、Hover/Pressed/Focus-visible/Selected/Disabledのいずれも「確認済み／NOT FOUND」を判定する対象がない。`03`§5・`ComparisonMobileStacked/README.md`で定義した節番号タップ・Sticky Labelなどの挙動はすべて設計要件・実装未確認として扱う。実装後、本表を「確認済み」に更新すること。

### ProductAccent

- 全状態：該当なし。`ProductAccent/README.md`にすでに明記の通り、Reference component（実際のUIとして操作されない）であり、インタラクション状態という概念自体が適用されない。
