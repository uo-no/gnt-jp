# Search Design System — 聖書原語リーダー 検索ページ設計仕様書

**バージョン**: 1.0  
**生成日**: 2026-07-14  
**対象**: `search-tool.html` のみ  
**根拠**: UX-1〜UX-8.5 全監査結果の統合  
**方針**: 「どのUIをどう作るか」ではなく「なぜそのUIなのか」を定義する  
**権限**: この文書は、今後 search-tool.html を改善する際の **唯一の設計基準** とする

---

## §1. Mission — 検索ページの使命

> **聖書のことばを見つけ、本文へ導く入口**

検索ページは「探す場所」である。
「読む場所」でも「理解する場所」でも「学ぶ場所」でもない。

この使命を一度でも逸脱する変更は、根拠を明示しなければならない。

---

## §2. Core Principles — 設計思想

### P-01. 探すことが最優先

検索ページのあらゆるUI決定は「探しやすいか」を第一基準とする。
機能の多さではなく、探す行為の純粋さを守る。

### P-02. 本文が目的地

Hit card は「目的地」ではなく「案内板」である。
本文（index.html）が目的地であり、検索ページはそこへの地図である。

### P-03. 「本文で読む」が唯一の Primary CTA

検索ページにおける最重要アクションは「本文で読む」だけである。
これを超える視覚的な重みを持つ要素を検索ページ内に作ってはならない。

### P-04. Concept は理解を助ける地図

Concept Insight は「検索結果の一部」ではなく「テーマの地図」である。
検索件数・ランキングに関与しない。発見と理解を深めるための補助的な知識源である。

### P-05. Pattern は探索の入口

Pattern チップはフィルターではなく、探索の新しい切り口を提案するものである。
近接検索（Prox）・語形検索（Morph）・フレーズ検索（Phrase）とは別カテゴリの「探し方の提案」として扱う。

### P-06. History は再訪を助ける

最近の検索履歴は「ユーザーがすでに歩いた道」の記録である。
初回訪問時には表示しない。再訪時に自然に現れる設計を維持する。

### P-07. 同一の UI は同一の挙動を持つ

同じ見た目のコンポーネントは、画面を問わず同じ挙動を持たなければならない。
index.html と search-tool.html で同一クラスを使いながら挙動が違うことは原則禁止。

### P-08. 一方向のフロー

search-tool → index.html → StudyPanel → (search-tool へ戻る) という方向性を維持する。
検索ページ内でフローを完結させない。読書・分析は別画面に委譲する。

### P-09. 専門語は奥へ

初心者が最初に目にする語は平易な日本語でなければならない。
ギリシャ語・Strong番号・語形・語根は「さらに詳しく」の奥に配置する。
Empty State の入口は常に日本語から始まる。

### P-10. 段階的な開示

すべての情報を一度に表示しない。
最初は概要・要約・件数のみ。詳細は要求された時だけ出す。
「見る前に知りたい量」と「見た後に欲しい量」は異なる。

### P-11. 0件は失敗ではなく分岐点

0件の時こそ、次の探索への入口を提供する。
「見つからない」で終わらず「次を試してみる」へ繋げる。

### P-12. デザインシステムに存在しないコンポーネントを作らない

新しい色・新しいフォントサイズ・新しいボーダーを追加する前に、
既存のトークン（tokens.css）と既存のクラスで表現できないかを先に確認する。

### P-13. ラベルは動詞で始める

インタラクションを持つ要素のラベルは動詞から始める。
「本文で読む」「テーマから探す」「さらに表示する」のように、
ユーザーが何をすることになるかを一語目で伝える。

### P-14. Hit card は招待状

Hit card はその場で完結する読書体験を提供しない。
「このテキストがここにある」という発見の報告であり、
「本文で読む」という動詞がその招待状への返答である。

---

## §3. Information Architecture — 画面構造

### 3-1. 全体フロー

```
[ Empty State ]                  ← 検索前の入口画面
    ↓ 検索実行
[ Search Input + Concept Insight ]   ← 検索結果ヘッダー
    ↓
[ Hit Cards + Progressive Disclosure ]  ← 発見の本体
    ↓
[ Distribution Panel ]           ← 発見の補足（書物別分布）
    ↓ 「本文で読む」クリック
[ index.html ]                   ← 読む場所（別画面）
```

### 3-2. 各セクションの責務

#### Empty State（空状態）

**責務**: 検索前の初心者・再訪者への入口を提供する

- 表示条件: 検索実行前
- 必須要素:
  - グリフ `λόγος`（文脈設定。聖書アプリとしての文体を確立）
  - title「聖書を検索する」
  - description「日本語・ギリシャ語・Strong番号で検索できます」
  - 「テーマから探す」（8件、日本語、初心者の主要入口）
  - 「例」（日本語を必ず含む。ギリシャ語は日本語の後に）
  - 「文法パターン」（高度ユーザー向け、後方配置）
  - 「最近の検索」（初回非表示、使用後に自動表示）
- 優先順位: テーマ > 日本語例 > ギリシャ語例 > パターン > 履歴
- 禁止: 検索結果的な要素、件数表示、Concept Insight の混入

#### Search Input（検索入力）

**責務**: 検索語の入力と実行

- 常時表示
- ラベル「検索語」、placeholder「愛・信じる・ἀγαπάω …」（3形式を例示）
- 検索ボタンアイコンは `search`（`layers` は不可。積層/設定を連想させる）
- 詳細検索（Morph/Phrase/Prox フィルター）は `<details>` 内に折りたたむ

#### Concept Insight（概念インサイト）

**責務**: 検索語に対応するテーマの地図を提供する

- 表示条件: `SEARCH_CONCEPTS` データに一致するテーマが存在する時のみ
- 検索結果リストより上に表示（視覚的に先に目に入る）
- 検索結果の「件数」には関与しない
- 必須要素:「X について」タイトル / 関連するギリシャ語 / 関連する概念 / さらに詳しく（折りたたみ）
- 禁止: 検索結果として扱うこと、件数の表示、ランキングへの参加

#### Hit Cards（ヒットカード）

**責務**: 見つかった箇所を「発見」として提示する

- 表示条件: 検索結果が1件以上の時
- 最初の8件は展開表示、残りは「残り X節を表示」ボタンで開示
- 各カードに「本文で読む」（Primary CTA）を必ず配置する
- 翻訳テキストは自動表示（ユーザーが押す前に読める設計を維持）
- 禁止: Hit card 内で読書体験を完結させること

#### Zero Hit State（0件状態）

**責務**: 探索の失敗を分岐点に変える

- 表示条件: 検索結果が0件の時
- 必須要素: ∅ アイコン / メッセージ / Recovery UI（試してみるチップ）
- Recovery UI のチップは4件、日本語、`_exampleSearch()` で即検索
- 禁止: 「見つかりません」で終わること

#### Distribution Panel（書物分布）

**責務**: ヒットの書物別偏在を補足情報として提供する

- Hit Cards の後、末尾に配置
- 常時表示（ヒット後に自然に現れる）
- 書物絞り込みへのナビゲーション補助として機能

---

## §4. Component System — コンポーネント一覧

### 4-1. Layout Components

| コンポーネント | クラス | 役割 | 表示条件 | 優先順位 |
|--------------|-------|------|---------|---------|
| Empty State | `.state-empty` | 検索前入口 | 検索実行前のみ | High |
| Result Header | `#result-header` | 検索語・件数表示 | 検索実行後 | High |
| Concept Insight | `#concept-insight` | テーマの地図 | Concept 一致時 | Medium-High |
| Hit List | `#hits-list` | 結果一覧 | 検索実行後 | High |
| Distribution Panel | `.dist-panel` | 書物分布 | 1件以上 | Medium |
| Left Panel | `#left-panel` | 詳細検索・履歴 | 常時（PC） | Low-Medium |

### 4-2. Card Components

| コンポーネント | クラス | 役割 | 表示条件 | 優先順位 |
|--------------|-------|------|---------|---------|
| Hit Card | `.hit-card` | 1件の検索結果 | 検索結果あり | High |
| Concept Card | `#concept-insight` | 概念知識 | Concept 一致時 | Medium |
| Lemma Group Card | `.lemma-group` | 語義グループ | 日本語検索時 | Medium |

**Hit Card 構造（規定）**:
```
[ hit-badge ] [ hit-ref ]          ← 参照（書名・章・節）
[ hit-text ]                       ← 本文テキスト
[ hit-trans ]                      ← 日本語翻訳（自動表示）
[ hit-snippet-body ]               ← 語順フロー（展開時）
[ hit-footer ]
    [ 本文で読む ]                  ← Primary CTA（必須）
    [ 語順を見る / 原語の流れを見る ] ← Secondary（任意）
```

### 4-3. Button Components

CTA Hierarchy の §5 を参照。

### 4-4. Chip Components

| クラス | 種別 | 用途 | 挙動 | 形状 |
|-------|------|------|------|------|
| `.ex-chip` | Discovery Chip | テーマ・例・Recovery | クリック → `_exampleSearch()` | 丸ピル、20px radius、Gentium Plus |
| `.layer-chip .lemma` | Concept Chip | 関連ギリシャ語グループ | クリック → 再検索 | 小ピル、12px radius |
| `.layer-chip .phrase` | Concept Chip | フレーズ検索 | クリック → 再検索 | 〃 |
| `.layer-chip .morph` | Filter Chip | 語形フィルター候補 | クリック → フィルター | 〃、紫系 |
| `.morph-chip` | Filter Chip | 品詞フィルター（選択中） | クリック → 解除 | 小ピル、10px radius、monospace |
| `.wlv-chip`（参照禁止）| Flow Chip | 語順フロー | index.html のみインタラクティブ | 要分離（§7 参照） |

**Pattern Chip の独立原則**:
Pattern チップは `.layer-chip prox`（近接オレンジ）を **使用禁止**。
パターン検索は近接検索とは別機能であり、専用の色またはクラスを持つ。

### 4-5. Badge Components

| クラス | 種別 | 用途 | 形状 |
|-------|------|------|------|
| `.ht-badge` | Hit Type Badge | ヒットの種別（lemma/phrase/prox/morph） | 角丸矩形、8px radius |
| `.h-badge` | History Badge | 履歴のラベル | 角丸矩形、3px radius |
| `.r-badge` | Result Badge | 結果の種別 | 角丸矩形、10px radius |

**将来の統一方針**: Badge は「Hit Type Badge」と「Small Label」の2種類に収束させる（UX-9-10）。
新しい Badge を追加する場合は必ず既存の2種類から選ぶ。

### 4-6. Section Label Components

**規定**: Section Label は「大文字見出し」と「通常見出し」の2種類のみとする。

| 種別 | 規定スタイル | 使用箇所 |
|------|------------|---------|
| 大文字見出し（Primary Label） | `font-size: var(--text-caption); font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; color: var(--text-sub); opacity: 0.6;` | すべての Section 見出し |
| 通常見出し（Secondary Label） | `font-size: var(--text-caption); color: var(--text-sub);` | カード内の補足見出し |

現在の乱立（`.s-label` / `.empty-section-label` / `.cooc-title` / `.ci-section-title` / `.lg-cooc-title`）は
将来2種類に統合する（UX-9-11）。新規実装は必ず上記2種類から選ぶ。

### 4-7. Details / Expand Components

**規定**: `<details>` を使う折りたたみは全て同一の矢印スタイルを持つ。

| 現状 | 規定 |
|------|------|
| `.advanced-layers-toggle`：`›` が `::before`（テキスト左） | 統一先: `›` が `::before`（テキスト左） |
| `.ci-advanced-toggle`：`▸` が `::after`（テキスト右） | → これを上記に統一（UX-9-6） |

新規 `<details>` は必ず `::before` + `›` を使う。

### 4-8. Input Components

| コンポーネント | 要素 | 役割 |
|--------------|------|------|
| 検索入力 | `#unified-search-input` | メイン入力 |
| Morph フィルター | `.morph-select` | 品詞フィルター |
| Prox スライダー | `.prox-slider` | 近接距離 |
| Phrase 入力 | `.phrase-input` | フレーズ入力 |

### 4-9. History Components

| コンポーネント | 場所 | 役割 | 表示条件 |
|--------------|------|------|---------|
| `.history-block` | 左パネル | 履歴一覧（常設） | 検索履歴あり |
| `.history-recent-section` | Empty State | 最近の検索（簡易） | 検索履歴あり・検索前 |

**二重配置の方針**: 左パネルが「完全な履歴」、Empty State が「直近3件の簡易表示」として役割を分ける。
将来的には一方に統合する。現状は維持。

---

## §5. CTA Hierarchy — ボタン分類

### 5-1. 分類体系

| 階層 | 定義 | 視覚 | 用途 |
|------|------|------|------|
| **Primary** | 最重要の次のアクション。1画面に1種 | Filled（highlight色） | 「検索する」「本文で読む」 |
| **Secondary** | 補助的な次のアクション | Ghost outline | 「語順を見る」（Hit card 右ボタン） |
| **Tertiary** | 追加情報の開示 | Ghost dashed / outline | 「さらに表示」「残り N節を表示」 |
| **Navigation** | 別テーマ・別語への移動 | Chip スタイル | テーマチップ・関連概念チップ |
| **Information** | モーダル・辞書の表示 | テキストリンク / アイコン付き | `result-query-label`（Abbott-Smith） |
| **Utility** | 状態の変更 | Small ghost | 「選択をクリア」「URL をコピー」 |

### 5-2. 全ボタン一覧

| ボタン | ラベル | 分類 | クラス | 動作 |
|-------|-------|------|-------|------|
| 検索実行 | 「検索する」 | **Primary** | `.run-btn` | `unifiedSearch()` 実行 |
| 本文で読む | 「本文で読む」 | **Primary** | `.hit-open-btn-lg` | index.html へ新規タブ遷移 |
| 語順プレビュー | 「原語の流れを見る」※ | Secondary | `.hit-trans-toggle` | hit-snippet-body 展開 |
| さらに表示（Concept） | 「さらに表示（N）」 | Tertiary | `.ci-related-more-btn` | 関連概念の残りを展開 |
| さらに表示（結果） | 「残り N節を表示」 | Tertiary | `.hits-toggle-btn` | hits-overflow を展開 |
| さらに表示（Lemma） | 「さらに表示」 | Tertiary | `.lg-more-btn` | Lemma グループ残りを展開 |
| 辞書を開く | `result-query-label` | Information | `.result-query` | Abbott-Smith モーダル |
| 選択をクリア | 「選択をクリア」 | Utility | `.morph-clear-btn` | morph フィルター解除 |
| URLコピー | （アイコン） | Utility | `.share-btn` | URL をクリップボードへ |
| テーマチップ | 「愛」等 | Navigation | `.ex-chip` | `_exampleSearch()` |
| 概念チップ | 「恵み」等 | Navigation | `.layer-chip .lemma` | 再検索 |

※ 右ボタンのラベルについては §6 Language Rules を参照。

### 5-3. Primary CTA の原則

- **検索ページ全体で「検索する」と「本文で読む」の2つのみが Primary**
- 「検索する」はアプリのメイン動詞（常時1つ）
- 「本文で読む」は Hit card ごとに1つ（外部遷移の唯一の正規ルート）
- この2つより視覚的に目立つ要素を検索ページ内に作ってはならない

### 5-4. Tertiary ボタンの統一方針

現在「さらに表示」系ボタンが3種類存在する（`.ci-related-more-btn` / `.hits-toggle-btn` / `.lg-more-btn`）。
将来は共通クラス（`.expand-btn`）に統一する（UX-9-9）。
新規実装では必ず既存のいずれかを使い、新しいスタイルを追加しない。

---

## §6. Language Rules — 動詞の定義

### 6-1. 動詞の意味定義

| 動詞 | 定義 | 使う場面 | 禁止される誤用 |
|------|------|---------|-------------|
| **探す** | 検索語を入力して聖書全文から語を見つける行為 | 検索入力・Empty State | Hit card の中で使わない |
| **見る** | 表示・展開する。インタラクションは発生しない | 「語順を見る」「書物分布を見る」等 | クリックで次の場所に「行く」行為には使わない |
| **読む** | 本文テキストを精読する行為 | 「本文で読む」のみ | 非インタラクティブな展開に「読む」は使わない |
| **調べる** | 詳細な情報を深掘りする行為 | StudyPanel・Abbott-Smith | 検索ページの文脈では使用最小限 |
| **理解する** | 意味・構造を把握する行為 | StudyPanel 文脈 | 検索ページでは使わない |
| **比較する** | 複数の語・訳を並べて違いを見る行為 | StudyPanel 文脈 | 検索ページでは使わない |
| **試してみる** | 何か試しにやってみる。低リスクな探索への誘い | Zero-hit Recovery UI | 確定的なアクションに「試す」は使わない |
| **表示する** | 隠れていた情報を開く機能的な展開 | 「さらに表示」「残り N節を表示」 | 動詞として読む/見るとの混在を避ける |

### 6-2. 動詞の一貫性ルール

- 同じ操作には必ず同じ動詞を使う
- 「開く」と「表示する」は混在させない（統一先: 「表示」）
- 「見る」と「読む」は混在させない（展開→「見る」、遷移→「読む」）
- 「さらに詳しく」は Concept Insight の折りたたみ専用。他では使わない

### 6-3. 専門語の扱い

| 種別 | 扱い方 |
|------|--------|
| ギリシャ語テキスト | 常に日本語（読み・意味）とセットで表示 |
| Strong番号（G1234） | placeholder でのみ例示。ラベルに使わない |
| 語根・語形・形態素 | 「詳細検索」内、説明文付きで使用可 |
| 特徴共起 | **禁止**。「よく一緒に出る語」を使う |
| 語順フロー | index.html の文脈専用ラベル |
| 原文 | 検索ページでは「ギリシャ語」を使う。「原文」は誤解を招く |

### 6-4. 禁止ワード一覧

| 禁止ワード | 理由 | 代替 |
|-----------|------|------|
| 特徴共起 | 統計専門語。初心者に不明 | よく一緒に出る語 |
| 原文を見る | 「原文」=ギリシャ語テキストと誤解される | 原語の流れを見る / 語順を見る |
| 語順フロー | index.html 専用ラベル。search-tool 内では使わない | 原語の流れ |
| 関連する検索 | 「検索」が目的語として不明瞭 | パターンで探す |
| 関連する文法 | 「文法」で何が分かるか不明 | 構文で探す |

---

## §7. Progressive Disclosure — 段階開示ルール

### 7-1. 原則

**デフォルト表示 = ユーザーが次の1アクションに必要な情報のみ**

### 7-2. 各要素の開示ルール

| 要素 | デフォルト | 展開条件 | 展開方法 |
|------|----------|---------|---------|
| Hit Cards | 最初の **8件** | 「残り N節を表示」クリック | `.hits-overflow` を表示 |
| Hit Card の語順フロー | **折りたたみ** | 右ボタンクリック | `.hit-snippet-body` 展開 |
| 関連する概念 (Concept) | **≤8件は全表示**、>8件は折りたたみ | 「さらに表示」クリック | 残り件数を展開 |
| さらに詳しく (Concept) | **折りたたみ** | クリック | `<details>` 展開 |
| 詳細検索 | **折りたたみ** | クリック | `<details>` 展開 |
| 最近の検索 (Empty State) | **初回非表示** | 検索履歴発生後 | 自動表示 |
| 書物分布 (dist-panel) | **ヒット後に自動表示** | — | 常時（ヒット末尾） |
| Lemma グループの共起語 | **最初の数件** | 「さらに表示」クリック | 残りを展開 |
| Empty State「例」 | **常時表示** | — | 折りたたまない |
| Empty State「テーマ」 | **常時表示** | — | 折りたたまない |
| Empty State「パターン」 | **常時表示（後方配置）** | — | 折りたたまない |

### 7-3. 開示の階層

```
Level 0（常時）: 入力フォーム / 検索語 / 件数 / 最初の8件
Level 1（1クリック）: 残りの Hit Cards / さらに表示 / 書物分布
Level 2（詳細検索・Concept展開）: 詳細フィルター / さらに詳しく / 語順フロー
Level 3（外部遷移）: Abbott-Smith モーダル / index.html（本文）
```

### 7-4. 折りたたみの実装方針

- 単純な展開（表示/非表示）: `<details>` を使う
- 件数が動的な展開（残り N件）: カスタムボタン + JS
- 上記2つのみを使う。新しい展開パターンを作らない

---

## §8. Visual Hierarchy — 視覚的重要度

### 8-1. 重要度の定義

| レベル | 名称 | 定義 |
|-------|------|------|
| 1 | **Primary** | ユーザーが次に行うべきアクション |
| 2 | **Secondary** | 補助的なアクション・主要情報 |
| 3 | **Support** | 文脈情報・件数・分類 |
| 4 | **Metadata** | 書名・章節番号・バッジ |
| 5 | **Decoration** | 区切り線・グリフ・背景 |

### 8-2. 要素別分類

#### Button

| 要素 | 重要度 | 理由 |
|------|-------|------|
| 「検索する」(.run-btn) | **Primary** | アプリのメイン動詞 |
| 「本文で読む」(.hit-open-btn-lg) | **Primary** | 唯一の外部遷移 Primary CTA |
| 「語順を見る」(.hit-trans-toggle) | Secondary | 補助的プレビュー |
| 「残り N節を表示」(.hits-toggle-btn) | Tertiary | 追加情報の開示 |
| 「さらに表示」(.ci-related-more-btn, .lg-more-btn) | Tertiary | 追加情報の開示 |
| 「選択をクリア」(.morph-clear-btn) | Utility | 状態リセット |
| Abbott-Smith リンク | Information | 辞書参照 |

#### Chip

| 要素 | 重要度 | 理由 |
|------|-------|------|
| テーマ・例チップ(.ex-chip) | Secondary | 探索の入口 |
| 関連概念チップ(.layer-chip .lemma) | Secondary | 再検索への導線 |
| 品詞フィルター(.morph-chip) | Support | 絞り込み補助 |
| Pattern チップ | Support | 探し方の提案 |
| Prox/Morph レイヤーチップ | Support | 検索種別の切り替え |

#### Card

| 要素 | 重要度 | 理由 |
|------|-------|------|
| Hit Card 全体 | Secondary | 検索結果の1件 |
| Hit Card テキスト | Primary（card内） | 発見の中心情報 |
| Hit Card 翻訳 | Secondary（card内） | 文脈の補助 |
| Hit Card 語順フロー | Support（card内） | 構造プレビュー |
| Concept Card | Secondary | テーマの地図 |

#### Section / Header / Footer

| 要素 | 重要度 | 理由 |
|------|-------|------|
| 検索語表示 (result-query-label) | Primary | 何を検索したかの確認 |
| 件数 (result-count) | Secondary | 発見の規模 |
| Section Label | Support | 各セクションの識別 |
| 書物分布 | Support | ヒットの偏在補足 |
| ヒット種別バッジ | Metadata | Hit card の分類 |
| グリフ `λόγος` | Decoration | 文脈設定 |
| 区切り線 | Decoration | 視覚的整理 |

### 8-3. 色トークンの重要度マッピング

| 色 | 意味 | 使用要素 |
|----|------|---------|
| `--highlight` / `--accent` | Primary アクション | .run-btn, .hit-open-btn-lg, フォーカスリング |
| `--text` | 本文テキスト | Hit card テキスト |
| `--text-sub` | Support / Metadata | Section Label, 件数, バッジ |
| `--text-hint` | Decoration | グリフ, placeholder |
| `--border-soft` | 区切り・Ghost ボタン | Ghost ボタン枠, 区切り線 |

**エイリアス統一方針**: `--ink-soft`(=`--text-hint`)と `--ink-muted`(=`--text-sub`)は aliases であり
直接 `--text-hint` / `--text-sub` を使う。4つの参照名を2つに統一する。

---

## §9. Interaction Rules — インタラクションルール

### 9-1. クリックの定義

| インタラクション | 結果 | 条件 |
|--------------|------|------|
| テーマ/例チップをクリック | `_exampleSearch()` → 即検索 | 常時 |
| 「検索する」をクリック | `unifiedSearch()` 実行 | 常時 |
| 「本文で読む」をクリック | index.html を新規タブで開く | Hit card 表示中 |
| 「語順を見る」をクリック | `.hit-snippet-body` トグル | Hit card 表示中 |
| `result-query-label` をクリック | Abbott-Smith モーダル表示 | 検索実行後 |
| Concept ギリシャ語行クリック | Abbott-Smith モーダル表示 | Concept Insight 表示中 |
| 関連概念チップをクリック | そのテーマで再検索 | Concept Insight 表示中 |
| 「残り N節を表示」をクリック | `.hits-overflow` を展開 | Hit Cards 8件超 |
| 「さらに表示」をクリック | 対応する残りを展開 | 該当要素が折りたたみ中 |
| 詳細検索 `<details>` を開く | フィルター UI を表示 | 常時 |
| Morph チップをクリック | フィルターに追加 | 詳細検索 open 中 |

### 9-2. Hover の定義

| 要素 | Hover 挙動 | 実装 |
|------|----------|------|
| Primary Button | 背景色を暗くする | CSS :hover |
| Ghost Button | 背景色を薄くつける | CSS :hover |
| Chip（Discovery/Navigation） | 背景色を薄くつける | CSS :hover |
| `result-query-label` | 下線を実線・濃色に変更 | CSS :hover（現在は dotted のみ → 強化必要） |
| Concept ギリシャ語行 | `cursor: pointer` + 視覚変化 | CSS :hover（現在は title 属性のみ → 強化必要） |

### 9-3. 展開・折りたたみ

- 展開方向: 常に下（上から下へ情報が増える）
- 折りたたみに使うアニメーション: なし（即時表示 or `<details>` デフォルト）
- 一度展開した後のリセット: 再検索時にすべての展開状態をリセットする

### 9-4. 再検索のトリガー

1. 「検索する」ボタン（`.run-btn`）クリック
2. `Enter` キー（入力フォーム）
3. Discovery チップ（`.ex-chip`）クリック → `_exampleSearch()`
4. 関連概念チップ（Concept Insight）クリック → `_exampleSearch()`
5. 履歴アイテムクリック → `_exampleSearch()`

いずれも `unifiedSearch()` を最終的に呼び出す。

### 9-5. History（履歴）のルール

- 新しい検索が実行されるたびに先頭に追加
- 表示上限: 左パネルは制限なし、Empty State は直近3件
- クリックで `_exampleSearch()` を呼ぶ（再検索と同一経路）
- ローカルストレージに保存。クリアボタンで削除可能

### 9-6. Concept Insight の発火ルール

- `SEARCH_CONCEPTS` データに一致するキーワードを検索した時のみ発火
- 件数が0件でも発火する（Concept は検索結果とは独立）
- 一致しない検索語では表示しない（`#concept-insight` を非表示）

### 9-7. `.wlv-chip` の挙動分離原則

- index.html の `.wlv-chip`: **クリック可能**（StudyPanel を開く）
- search-tool.html の語順フロー内 chip: **クリック不可**（表示専用）
- この不一致は UX-8.5 で確認済みの設計問題。将来は以下いずれかに解決する:
  1. search-tool.html の語順チップをクリック可能にする（High effort）
  2. search-tool.html の語順 UI を `.wlv-chip` とは別のクラスに変更する（推奨）
  3. 語順プレビュー UI 自体を廃止し「本文で読む」1ボタンに統一する

---

## §10. Future Extension Rules — 機能拡張ルール

### 10-1. 新しい検索機能を追加する時

1. まず以下のいずれかに属するかを決める:
   - **Concept**（テーマ・概念単位の探索）
   - **Pattern**（構文・語形パターンの探索）
   - **Morph**（形態素・語形の絞り込み）
   - **Phrase**（フレーズ・共起の探索）
   - **Prox**（近接・位置関係の探索）
2. どれにも属さない場合は、新しいカテゴリを定義してから追加する
3. カテゴリが決まったら、対応するレイヤーチップ（`.layer-chip .新カテゴリ`）を使う
4. 専用の新色を作る前に、既存の morph / lemma / phrase / prox 色で表現できないか検討する

### 10-2. 新しい Chip を追加する時

必ず以下のいずれかに属するかを決める:

| 種別 | 定義 | 例 |
|------|------|---|
| **Discovery Chip** | 探索の入口（Empty State・Recovery） | テーマチップ、例チップ |
| **Navigation Chip** | 別テーマ・別語への移動（再検索） | 関連概念チップ |
| **Filter Chip** | 絞り込み条件の追加 | 品詞フィルター |
| **Result Chip** | 検索結果の分類表示 | Lemma グループチップ |

- Discovery / Navigation → `.ex-chip` または `.layer-chip` を使う
- Filter → `.morph-chip` を使う
- 新しい chip 形状（radius・フォント）は原則追加しない

### 10-3. 新しいセクションを追加する時

1. Empty State への追加: 「テーマから探す」の後、「文法パターン」の前に配置する
2. 検索結果への追加: Concept Insight → Hit Cards → Distribution の順序を維持する
3. Section Label は §4-6 の2種類から選ぶ
4. Progressive Disclosure の §7 のルールに従い、デフォルトで何を表示するか決める

### 10-4. 新しいボタンを追加する時

1. §5-1 の分類（Primary/Secondary/Tertiary/Navigation/Information/Utility）のいずれかに分類する
2. Primary は「検索する」と「本文で読む」のみ。新しい Primary は原則追加しない
3. Tertiary（「さらに表示」系）は将来の共通クラス `.expand-btn` を使う
4. ボタンのラベルは §6 の動詞定義に従う

### 10-5. 新しい画面遷移先を追加する時

search-tool.html からの遷移先は現在「index.html（本文で読む）」のみが Primary である。
新しい遷移先を追加する場合:
- Secondary 遷移: Hit card 内に配置。「本文で読む」より右または下に
- Navigation 遷移: Chip として配置（Primary ボタンとして追加しない）
- StudyPanel や morph-search / syntax-search への遷移は「さらに調べる」カテゴリとして扱う

### 10-6. 新しい状態（State）を追加する時

現在の状態:
1. Empty State（検索前）
2. Loading State（検索中）
3. Result State（結果あり）
4. Zero Hit State（0件）

新しい状態は上記4つの「混合状態」として扱う。独立した5番目の状態を安易に作らない。

---

## Design Commandments — 設計の掟 20箇条

これは今後すべての変更において参照すべき基準である。

```
Ⅰ.   検索ページは探す場所である。
      読む・理解する・分析するは別画面が担う。

Ⅱ.   本文（index.html）が目的地である。
      検索ページはそこへの地図である。

Ⅲ.   StudyPanel は理解する場所である。
      検索ページ内で語義の深掘りを完結させない。

Ⅳ.   「本文で読む」が唯一の Primary CTA である。
      これを超える視覚的な重みを検索ページ内に作るな。

Ⅴ.   Concept Insight は地図である。
      検索結果ではない。件数に関与しない。

Ⅵ.   Pattern は入口である。
      近接検索（Prox）の色を使うな。独立した視覚を持て。

Ⅶ.   History は再訪である。
      初回訪問者に見せるな。使った後に現れる。

Ⅷ.   Hit Card は招待状である。
      それ自体が目的地ではない。「本文で読む」がその返答。

Ⅸ.   Zero Hit は失敗ではなく分岐点である。
      見つからない時こそ次の入口を示せ。

Ⅹ.   Empty State の入口は日本語から始まる。
      初心者はギリシャ語で検索しない。

ⅩⅠ.  同一の UI 要素は同一の挙動を持つ。
      画面をまたいで見た目が同じならば挙動も同じであれ。

ⅩⅡ.  ラベルは動詞で始まる。
      「見る」と「読む」は混在させない。

ⅩⅢ.  「探す」から「読む」へは 1 アクションで遷移できる。
      中間ステップを増やすな。

ⅩⅣ.  「読む」から「探す」へは明示的に遷移する。
      読書中に意図せず検索ページへ戻るな。

ⅩⅤ.  専門語は奥に置く。
      「特徴共起」は書くな。「よく一緒に出る語」と書け。

ⅩⅥ.  デザインシステムに存在しないコンポーネントを作るな。
      tokens.css と既存クラスで表現できないか先に確認せよ。

ⅩⅦ.  Section Label は 2 種類だけである。
      大文字見出しと通常見出し。それ以外は作るな。

ⅩⅧ.  「さらに表示」ボタンは 1 種類だけである。
      同じ展開インタラクションに異なるスタイルを使うな。

ⅩⅨ.  各画面はどこへ進むかを 1 方向に持つ。
      search-tool → index.html → StudyPanel → search-tool。

ⅩⅩ.  探すことで何かに出会う体験を守れ。
      検索は手段であり、出会いが目的である。
```

---

## Appendix — 監査根拠と変更履歴

| Section | 根拠 Phase | 主な発見事項 |
|---------|-----------|------------|
| §1 Mission | UX-8.5 | 責務定義の統合（探す/読む/理解する） |
| §2 Principles | UX-8, UX-8.5 | P1-P10（architecture audit）を拡張 |
| §3 IA | UX-3, UX-4, UX-8 | Empty State → Result → Distribution の順序確定 |
| §4 Components | UX-8 Visual Consistency | Section Label 5種・Badge 3種・Button 7種の乱立を記録 |
| §5 CTA Hierarchy | UX-8.5 Button Audit | 「原文を見る」ラベルの問題・Primary 2種の整理 |
| §6 Language | UX-8 Language Audit | 「特徴共起」「原文を見る」等の禁止ワード |
| §7 Progressive | UX-2, UX-8 | `_REL_FOLD=8` の根拠・詳細検索折りたたみ |
| §8 Visual Hierarchy | UX-8 Design System | 重要度マッピング・色トークン統一方針 |
| §9 Interaction | UX-3, UX-4, UX-8 | `.wlv-chip` 挙動不一貫の記録 |
| §10 Extension | UX-8.5 P1-P10 + 全監査 | 機能追加時のカテゴリ分類ルール |
| Design Commandments | 全 UX Phase | 20箇条として統合 |

**次フェーズ**: UX-9（実装フェーズ）は本文書の §5 CTA Hierarchy および §4 Component System を根拠として進める。
