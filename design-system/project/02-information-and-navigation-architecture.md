# Information Architecture / Navigation Architecture / Desktop & Mobile Architecture

## 1. Information Architecture

```text
Bible Context
 └─ Book
     └─ Chapter
         └─ Reading State (Single / Comparison)
             └─ View Mode (Default / WORD_ORDER / STRUCTURE / CLAUSE_ROLE / RELATION)
```

Navigationはこの階層を「ユーザーが理解できる形」で表出するために存在する。Navigation自体がPrimary Surfaceになってはならない——Navigationの役割は常に **Where am I?** に答えることであり、Reading Surfaceの分量・視覚的重さを上回ってはならない。

既存実装のトップバー breadcrumb（`新約聖書 › ローマ › 1章 › 口語訳`）はこの階層をほぼそのまま可視化しており、温存する。変更するのは、この breadcrumb の最後の項目「口語訳」が Translation なのか View Mode なのかが曖昧である点——breadcrumb の各セグメントには、Book/Chapterのような位置情報と、Translation/View Modeのような読み方情報という、異なる種類の情報が並んでいることを、ラベルの視覚的重さ（`ui-label` vs `ui-caption`）で区別する。

## 2. Navigation System（既存資産の再構成）

実機調査で確認した既存の左ナビゲーション構造：

```text
聖書アプリ
├── [Translation selector]  口語訳（1955）
├── 旧約聖書
├── 新約聖書
├── ツール           ← morph-search / syntax-search / search-tool への導線
├── 検索
├── ハイライト
├── メモ
└── 履歴
    ├── 最近読んだ箇所
    └── 最近見た単語
```

この構造は骨格として妥当であり、大きく作り直さない（`07 Existing Product Constraints` 原則）。Design Systemが加える変更は3点のみ：

1. **Translation selectorを「読み方を選ぶ」から独立させる。** 現状、Translationの選択とView Modeの選択が同じ「読み方を選ぶ」パネル内の1本のリストに同居している。ナビゲーション上も、Translation（何語・何訳で読むか）と View Mode（同じ本文をどう見るか）を別グループの見出しの下に分離する（コンポーネント仕様は `06-component-architecture.md` の ReadingModePicker）。
2. **「ツール」の内側を、Research Surfacesとして明示する。** `search-tool.html`（Concordance／全聖書検索）は独立したSurfaceとして維持し、統合しない（既存Search Architecture制約、`04` および `09` 参照）。`morph-search.html` / `syntax-search.html` は Research Side Panel（`04-research-and-state-transitions.md`）への導線として、Bible Locationを引き継いだ状態で開けるようにする——「ツール」メニューから独立に開くと現在のBible Locationを失うため、極力 Reading Surface からの導線（語をタップ→さらに調べる）を主要経路にし、「ツール」メニューからの直接起動は汎用検索の入口として残す。
3. **履歴の「最近読んだ箇所」を Reading Position の基盤として明示的に位置づける。** 実装は変えず、意味づけをState Transition Architecture（`04`）の一部として文書化する。

## 3. Desktop Spatial Architecture

```text
┌──────────────┬────────────────────────────────────┐
│ Navigation   │ Bible Reading Surface                │
│ Column       │ (Single / Comparison / View Mode)    │
│              │                                        │
│ (secondary)  │ (primary)                             │
└──────────────┴────────────────────────────────────┘
```

固定2カラムを絶対条件にはしないが、**Navigation is secondary. Bible Reading Surface is primary.** という関係は常に守る。既存実装のNavigation ColumnとReading Surfaceの構造的境界（左ナビ＋トップバー＋本文エリア）は尊重し、作り直さない。

Comparison State や Research 起動時は、この2カラムの右側（Reading Surface）がさらに分割される（Comparisonは左右2列、Structural Readingは本文＋右パネル）。Navigation Columnは常にこの分割の外側に留まり、Comparison/Research中も折りたためる形で残す——Comparison/ResearchはNavigationを置き換えない。

## 4. Mobile Architecture — Reading-first

```text
優先順位
Reading Surface
  ↓
Navigation（Contextual）
  ↓
Supporting Information
```

MobileはDesktopの縮小版ではない。実機で確認した現状のMobile構造：

```text
┌───────────────────────────┐
│ ‹ ローマ 1章 ▾        ···  │  ← Contextual header（Book/Chapter + More）
├───────────────────────────┤
│                             │
│        Reading Surface      │
│                             │
├───────────────────────────┤
│  聖書      本文      検索   │  ← Bottom Navigation（現状3項目）
└───────────────────────────┘
```

この構造の骨格（ヘッダーは最小限、Reading Surfaceが画面の大半、下部にApp-level Bottom Navigation）はReading-firstの方向としてすでに正しい。ただし2つの問題を確認した：

- Bottom Navigationの「本文」は、今まさに表示しているReading Surfaceそのものを指すタブになっており、App-level destinationとしての意味を持たない（詳細下記 §5）。
- 「読み方」ボトムシートには、Single/Comparisonの切り替えが存在せず、View Modeの単一選択リストのみになっている。これはComparisonというReading Stateがモバイルでは事実上選べない状態であることを意味し、`03-comparison-architecture.md` で最優先に再設計する。

## 5. Bottom Navigation — App-level destinationsのみ

Mobile Bottom Navigationは **App-level destinations** を表す。Reading / Comparison / Research を Bottom Navigation の3項目にしてはならない。理由：

- Reading = primary activity（既定状態であり、"選ぶ" ものではない）
- Comparison = Reading State（Readingの中の状態であり、並列の行き先ではない）
- Research = Deep Dive Layer（Readingから派生する層であり、独立した行き先ではない）

代わりに Bottom Navigation には、アプリ全体の主要な「行き先」——例えば「聖書（Book/Chapter起点のホーム）」「検索（Concordance/全文検索）」「ハイライト・メモ」「マイページ（履歴・設定）」——を置く。既存実装の「聖書／本文／検索」のうち「本文」は行き先ではないため、Bottom Navigationからは外し、代わりに履歴・ハイライト・メモをまとめた「マイページ」的な4つ目の項目を追加する案を推奨する（詳細は `06-component-architecture.md` BottomNavigationコンポーネント）。

```text
Bottom Navigation（提案）
├── 聖書   — Book/Chapter起点、現在地へのショートカット
├── 検索   — Concordance / 全文検索（search-tool.htmlへの導線）
├── ノート — ハイライト・メモ（Readingから生まれた記録）
└── その他 — 履歴・設定・Information
```

Reading State（Single/Comparison）とView Modeは、Bottom Navigationではなく、Reading Surface内のコンテキストコントロール（トップバーの「読み方を選ぶ」起点）からのみ変更する。これにより「今どのApp Destinationにいるか」と「今どう読んでいるか」が、UI上でも完全に分離される。
