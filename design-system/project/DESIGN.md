# 聖書アプリ Design Reference

**ステータス: 第1草稿 — 確定仕様と暫定・保留項目が混在する。各項目のステータスを確認してから参照すること。**

作成日: 2026-09-26  
根拠ソース: `design-system/project/` 以下の設計ドキュメント群、静的コード監査（`public/index.html`）、実ブラウザ監査（Playwright, Desktop 1440px + Mobile 390px）  
詳細な決定履歴: `revision-proposal-01.md`

---

## この文書について

このファイルは設計・実装の中心参照ドキュメントである。

**何をするか:**
- デザイン原則・トークン・コンポーネント・状態の規範的な記述
- 確定・暫定・保留の区分を明示する
- 未解決の問いを実装前に可視化する

**何をしないか:**
- `tokens.json` / `tokens.css` の置き換え（それらが実値の正本）
- 個別コンポーネントの詳細仕様の置き換え（各 `components/<Comp>/README.md` が正本）
- 実装計画やフェーズ判断（`09-implementation-priorities.md` を参照）

**ステータス凡例:**

| マーク | 意味 |
|---|---|
| ✅ CONFIRMED | ソースドキュメントまたは明示された製品方針に直接支持される |
| 🔶 PROVISIONAL | 目標値として採用するが、視覚評価・技術確認待ち |
| 👁 VISUAL REVIEW | 実機・実ブラウザでの目視評価が必要 |
| 🔬 TECH INVESTIGATION | 技術的実現可能性の調査が必要 |
| ⏸ DEFER | 別の判断が確定するまで明示的に保留 |

---

## 1. プロダクト原則

### 1-1. Reading First ✅ CONFIRMED

> The Bible is the visual foreground. Reading is primary; every tool is subordinate to it.  
> Does this help the user read? If not, do not add it.

このプロダクトの中心は「聖書を読むこと」であり、目指す体験は「聖書がよく分かった」——原著者の意図をより正確に理解すること——である。ギリシャ語学習アプリでも、聖書研究ツールでも、神学ダッシュボードでもない。語義・形態・統語・構造・翻訳比較はすべて重要だが、主役ではない。主役は聖書本文そのものである。

読書体験を妨げる要素は加えない。本文と視覚的に競合するものは抑制する。

### 1-2. ブランドとリーディングサーフェスの境界 ✅ CONFIRMED

> **Brand outside. Bible inside.**

| サーフェス | ブランド要素 |
|---|---|
| Reading / Comparison / Research | 最小限。「聖書アプリ」程度の表示のみ。Tagline・ロゴマーク・Fish Gate の英語表記は出さない |
| Brand / Landing / About | ウオノ / Fish Gate / Tagline を前面に出してよい |

### 1-3. 回避するビジュアルパターン ✅ CONFIRMED

以下はすべてのデザイン判断において避ける（固定リスト、`05-visual-language-and-foundations.md` §1 より）:

- **宗教的クリシェ:** 十字架中心の UI、教会サイト的装飾、過度に牧歌的な表現
- **テクノロジー系クリシェ:** AI ダッシュボード風、未来的 UI、ネオン、過剰なグラデーション
- **SaaS 系クリシェ:** ダッシュボードカード、KPI パネル、過剰な角丸コンテナ、汎用的な生産性アプリの外観
- **装飾のための装飾**

---

## 2. 情報設計

### 2-1. 読書の階層構造 ✅ CONFIRMED

```
Bible Context
 └─ Book（書物）
     └─ Chapter（章）
         └─ Reading State（Single / Comparison）
             └─ View Mode（Default / WORD_ORDER / STRUCTURE / CLAUSE_ROLE / RELATION）
```

プロダクトの基本単位は「画面」ではなく **Bible Location**（Book / Chapter / Verse）である。UI は常に「今どの聖書箇所を読んでいるか」を明示する。

### 2-2. 3つの軸の分離 ✅ CONFIRMED（原則）/ 🔶 PROVISIONAL（実装形態）

Reading Architecture の3軸は UI 上で混同してはならない:

| 軸 | 問い | 切り替えると変わるもの | 例 |
|---|---|---|---|
| **Translation（翻訳）** | 何語・何訳で読むか | 本文テキスト | 口語訳・新改訳・ギリシャ語原文 |
| **Reading State** | 単一読み or 比較読みか | 画面の構造 | Single / Comparison |
| **View Mode（読み方）** | 同じ本文をどう見るか | 表示形式（本文テキストは変わらない） | Default / WORD_ORDER / STRUCTURE / CLAUSE_ROLE / RELATION |

**現行実装 (CONFIRMED):** 「読み方を選ぶ」パネルに Translation（口語訳）と View Mode（語順で読む・構造で読む…）が1本のフラットリストに混在している。これは3軸の未分離状態である。

**目標:** パネル内を Translation セクション / View Mode セクションに分離し、Reading State（Single/Comparison）は ReadingStateSwitch として最上部に独立させる。

**未確定 (H-2 参照):** 分離の具体的な UI 形態（見出し・区切り線・コンテナ等）および「語順で読む」が将来的に非ギリシャ語翻訳でも有効になるかどうか。

### 2-3. ReadingStateSwitch ✅ CONFIRMED（設計原則）/ ⏸ DEFER（配置）

**役割:** Single（単一読み）と Comparison（比較読み）を切り替える Reading State コントロール。`radius-pill` を使うコントロールの一つ（ReadingStateSwitch のセグメントコントロールと translation chips のみがこのトークンを使う）——この形状が「モードスイッチ・翻訳選択のコントロール」であることを形で伝える。

**現行実装 (CONFIRMED):** `bp-segment-wrap`（pill スイッチ）は DOM に存在するが、読み方パネルの一次リストには表示されない。「比較表示を設定…」という末尾項目の先のサブパネルに配置されている。

**目標案 A（DS 準拠）:** 読み方パネルの最上部に配置。Single 選択中は翻訳軸 + ビューモード軸を表示。Comparison 選択中は Translation A / B の選択を表示。Translation B in-app データが必要。

**暫定案 B（現行維持）:** 現行位置を維持しつつ、pill 形状 (`radius-pill`) を確保する。Translation B in-app データが整備されるまでこちらを暫定とする。

**保留条件:** Translation B の in-app 保有方針（H-3）が確定してから最終化する。

### 2-4. ReadingLocationBar ✅ CONFIRMED

既存のトップバー breadcrumb（`新約聖書 › ローマ › 1章`）を踏襲し温存する。現行実装では末尾に翻訳名が続く（例: `新約聖書 › ローマ › 1章 › 口語訳`）。

**目標の変更点 (PROVISIONAL):** breadcrumb 末尾の Translation / View Mode 表示を独立したチップとして分離する。位置情報（Book/Chapter、`ui-label`）と読み方情報（Translation・View Mode、背景つきの小さなチップ）を視覚的に別グループとして提示する。これにより位置情報と読み方情報の混同を防ぐ。

**非インタラクティブなコンポーネント (CONFIRMED):** ReadingLocationBar 自体は操作対象ではなく、情報表示専用。実機調査で確認済み。

**breadcrumb のフォント:** 現行は `'Noto Serif JP', serif`（読書体）を使用 (CONFIRMED)。DS の定義は `font-ui-sans`（UI フォント）。原則は明確だが変更の最終判断は目視確認後（H-10、👁 VISUAL REVIEW）。

### 2-5. BottomNavigation ✅ CONFIRMED（原則）/ ⏸ DEFER（ノートタブ）

Mobile Bottom Navigation は **App-level destinations のみ** を表す。

**確定原則:**
- Reading / Comparison / Research を Bottom Navigation の項目にしない（Reading は既定状態、Comparison は Reading の内部状態、Research は Reading から派生する層）
- 「本文」タブは現在表示しているサーフェスの名前であり、目的地ではないため廃止または「読む」に改名する

**確定項目:**

| タブ | 状態 |
|---|---|
| 聖書（書物・章選択） | ✅ 維持 |
| 検索（Concordance / 全文検索） | ✅ 維持 |
| ノート（ハイライト・メモ） | ⏸ DEFER（機能は存在するが公開方針未確定、H-5） |
| その他（履歴・設定） | ⏸ DEFER（内容定義後に追加） |

**アクティブ状態の色:** DS 定義は `accent-greek-700`（深緑）。現行実装はアクティブ色変化なし（グレーのみ）。アクセント色実装（H-1）と連動して変更される。

**現行実装との差異 (CONFIRMED):** 現行は「聖書 / 本文 / 検索」3タブ。アクティブ色変化なし。

### 2-6. モバイル比較表示 ⏸ DEFER（暫定方式を維持）

**暫定採用方式 (CONFIRMED):** verse-by-verse ページング（`1節 ‹ ›` ナビゲーション）。翻訳 A と B を同一画面に縦並び表示。

**DS が定義する目標方式（`ComparisonMobileStacked`）:** 章全体の連続スクロール、sticky 翻訳ラベル、節番号タップジャンプ。

**現行ページング方式を暫定維持する理由:**
1. Translation B の in-app データが存在しない（現行は外部サイト誘導）
2. 節番号 1:1 対応の検証が未完了
3. 現行のページング方式でも「2翻訳を比べる」という目的は達成している

**連続スクロール方式への移行条件（解除条件）:** Translation B テキストの in-app 参照が可能になること、節番号 1:1 対応の確認、既存ジェスチャーとの競合確認。

---

## 3. カラーシステム

### 3-1. 3層の設計 ✅ CONFIRMED

カラートークンは目的の異なる3層に分かれる。層をまたぐ使い方をしない。

```
層 1 — 共有セマンティックトークン
  surface-* / ink-* / border-* / signal-* / focus-ring
  → 原則として言語に依存しない。Greek 版・Hebrew 版で共通。
    （例外: surface-selected / ink-on-accent-tint は accent-greek-* への alias — §3-2 参照）

層 2 — 言語テーマトークン
  accent-greek-* / accent-hebrew-*
  → 言語・プロダクトごとに差し替わる。

層 3 — 読書・解析セマンティックカラー
  structural-function-* / structural-construction-* / structural-morphology-*
  → 統語・形態の意味を表す。言語テーマと完全独立。
```

### 3-2. 共有セマンティックトークン ✅ CONFIRMED

実値は `tokens.css` を参照。

**サーフェス:**

| トークン | 値 | 用途 |
|---|---|---|
| `surface-canvas` | `#fbfaf7` | すべての読書面の背景（暖色 paper white）|
| `surface-raised` | `#ffffff` | カード・シート・モーダル・パネル |
| `surface-sunken` | `#f3f1ec` | サイドナビ・Structural Reading パネル地・非アクティブタブ |
| `surface-overlay` | `rgba(33,32,28,0.45)` | モーダル・ボトムシートの背景スクリム |
| `surface-selected` | `{accent-greek-100}` | ピッカーリストの選択行背景 |

**インク（テキスト・アイコン）:**

| トークン | 値 | 用途 |
|---|---|---|
| `ink-primary` | `#211f1a` | 聖書本文および連続して読まれる primary reading content。最高優先度。UI クロムには使わない |
| `ink-secondary` | `#57534a` | breadcrumb・ラベル・章見出し・翻訳名 |
| `ink-tertiary` | `#8a8577` | タイムスタンプ・プレースホルダー・無効コントロールラベル |
| `ink-on-accent` | `#ffffff` | accent-greek-700 / accent-hebrew-700 上の文字・アイコン |
| `ink-on-accent-tint` | `{accent-greek-700}` | accent-*-100 上の文字・アイコン（選択行など）|

**境界線:**

| トークン | 値 | 用途 |
|---|---|---|
| `border-hairline` | `#e6e2d7` | デフォルト 1px 区切り。節の間・リスト行・トップバー下線 |
| `border-strong` | `#cdc7b6` | 入力欄・セグメントコントロール外枠・構造ノード枠 |

**フォーカス・シグナル:**

| トークン | 値 | 用途 |
|---|---|---|
| `focus-ring` | `{ink-primary}` | 2px キーボードフォーカスアウトライン。意図的に ink 色（アクセント・構造色と混同しないため）|
| `signal-attention-fill` | `#faf0da` | 非緊急の注意喚起のみ（翻訳欠落・本文異読など）|
| `signal-attention-ink` | `#8a5a14` | `signal-attention-fill` 上のテキスト |

**言語依存エイリアスの注記:** `surface-selected`（値: `{accent-greek-100}`）と `ink-on-accent-tint`（値: `{accent-greek-700}`）は共有セマンティックトークンとして定義されているが、現行の解決値は Greek accent ファミリーを参照している。将来 Hebrew テーマが追加される場合、これらのトークンはアクティブな言語テーマの accent 値を反映するよう更新が必要になる（固定色ではなく言語テーマへの alias）。

**現行アプリとの主要な差異 (CONFIRMED):**
- `--bg: #ffffff`（現行）vs `--surface-canvas: #fbfaf7`（DS 目標）— 背景色（👁 H-9）
- `--accent: #2c4f34` 深緑（Phase 15D 実装済み）= `accent-greek-700` — アクセント色（✅ H-12 暫定PASS・2026-09-29）

### 3-3. 言語テーマトークン

**Greek テーマ（現行プロダクト）✅ CONFIRMED（方向）/ 🔶 PROVISIONAL（実値）**

製品方針: ギリシャ語版 = 緑テーマ。DS は `accent-greek-700: #2c4f34` を Greek Bible のプロダクトアイデンティティカラーとして定義している。

| トークン | 値 | 用途 |
|---|---|---|
| `accent-greek-050` | `#f5f8f3` | hover 背景（ナビ行等）|
| `accent-greek-100` | `#e4ecdf` | 選択状態の塗り（`surface-selected` 参照先）|
| `accent-greek-300` | `#93b389` | 装飾的なセカンダリアクセント（Brand サーフェス等）|
| `accent-greek-600` | `#3c6b45` | hover/pressed 状態 |
| `accent-greek-700` | `#2c4f34` | **プロダクトアクセント**（primary button・active pill・選択状態・重要インタラクション）|

`accent-greek-700` は聖書本文（`ink-primary`）と区別できるよう、本文の色として一度も使わない。読書画面の大半は緑を見せない——「ハイライトのように予算を使う」。DS は `surface-canvas` との 4.5:1 コントラスト達成を確認済みと明記している。

**✅ 暫定PASS（H-12・2026-09-29）:** `#2c4f34` を Phase 15D で実装。ブラウザ検証で本文との視覚分離・構造色との非混同を確認。実機での最終確定は VISUAL REVIEW 残件として残る（H-12）。

**Hebrew テーマ（将来プロダクト）⏸ DEFER**

DS は `accent-hebrew-700: #732f1e`（深赤）を 聖書［赤版］ 用として予約定義済み。現行 Greek ビルドでは使用しない。採用判断は Hebrew 製品計画が具体化してから（H-13）。

> **設計上の重要事項:** accent-greek-* と accent-hebrew-* は同一の階調構造（050/100/300/600/700）を持つ。将来 Hebrew が加わっても、「共通 DS の中で accent ファミリーを差し替える」だけで済む設計になっている。共有トークン・構造色・フォーカストークンは変更不要。

**テーマ活性化メカニズム 🔬 TECHNICAL INVESTIGATION**

DS はトークン構造は定義しているが、アプリ上での言語テーマの切り替え方（CSS クラス切り替え vs JS によるトークン差し替え等）を定義していない。現行アプリが複数言語を同時表示するシナリオがあるかによっても判断が変わる。実装前に技術調査が必要（H-14）。

**言語テーマの影響範囲 🔶 PROVISIONAL（INFERRED）**

現在の推奨方針: 言語テーマの影響は `accent-*` ファミリー（選択状態・ボタン・アクティブアイコン）のみに限定する。`surface-*`・`ink-*`・`border-*` 等の共有トークンは全言語版で共通。抑制されたトーンに言語固有の差異を加えるかどうかは、Hebrew 実装計画時に再評価する（H-15）。

### 3-4. 読書・解析セマンティックカラー ✅ CONFIRMED（トークン定義・3色実装）

言語テーマとは完全独立したカラーシステム。言語が変わっても変化しない。ギリシャ語版は緑系で統一。

| レイヤー | fill | ink | アプリ適用要素 | 用途 |
|---|---|---|---|---|
| FUNCTION | `#e3eddf`（淡黄緑） | `#375e2c` | `.hdg-fn` チップ | 主語・動詞・目的語・補語など統語機能 |
| CONSTRUCTION | `#cce6db`（淡青緑） | `#2e5945` | `.hdg-clause--sub` 背景、`.hdg-clause-label` | 同格・並列・節の入れ子など構成関係 |
| MORPHOLOGY | `#e6f0ea`（淡緑） | `#316148` | 将来実装（WLV 形態表示・現在無効化中） | 格・時制・法など語形変化タグ |
| connector | `#a49c86` | — | — | ノードを繋ぐ線・括弧。意味を単独で担わない |

**H-7 確定（2026-09-29）:** FUNCTION = `.hdg-fn` スロット、CONSTRUCTION = `.hdg-clause--sub` + `.hdg-clause-label`。深度別着色は廃止しインデントで深度を表現。

**全構造 ink 色と `accent-greek-700`（深緑）の分離:** function-ink（H≈107°）・construction-ink（H≈152°）・morphology-ink（H≈149°）はすべて `accent-greek-700`（H≈134°）と明度・色相が意図的に異なる。同一画面で隣接させない（`05-visual-language-and-foundations.md` §4）。

---

## 4. タイポグラフィ

### 4-1. ファミリー ✅ CONFIRMED

| ファミリー | CSS 変数 | 用途 | 状態 |
|---|---|---|---|
| `reading-ja` | `--font-reading-ja` | 日本語翻訳本文 | ✅ 現行使用中 |
| `reading-source` | `--font-reading-source` | ギリシャ語本文・将来のヘブライ語本文 | ✅ 現行使用中 |
| `reading-en` | `--font-reading-en` | 英語本文（将来用途）| ⏸ 予約済み・未使用（スタイル未定義）|
| `ui-sans` | `--font-ui-sans` | ナビゲーション・ボタン・ラベル・breadcrumb・全 UI クローム | ✅ 規範 |

**絶対ルール:**
- 聖書本文を `ui-sans` で組まない
- ボタン・breadcrumb を reading ファミリーで組まない（`README.md`）
- Mixed-script 行は `lang` 属性でフォントファミリーを切り替える（単一フォントで全スクリプトをカバーしない）

### 4-2. タイポグラフィスケール ✅ CONFIRMED

**UI テキスト（すべて `ui-sans`）:**

| スタイル | CSS クラス | サイズ/行高/太さ | 用途 |
|---|---|---|---|
| `ui-caption` | `.ui-caption` | 12px / 16px / 500 | 節番号・タイムスタンプ・構造タグ |
| `ui-label` | `.ui-label` | 13px / 18px / 500 | breadcrumb・Bottom Nav ラベル・フォームラベル |
| `ui-body` | `.ui-body` | 15px / 22px / 400 | メニュー行・ピッカー・パネル本文・ボタンラベル |
| `ui-title` | `.ui-title` | 17px / 24px / 600 | パネル・シートタイトル（「読み方を選ぶ」等）|
| `ui-display` | `.ui-display` | 22px / 28px / 600 | Reading Surface の章見出し（「ローマ人への手紙 第1章」）|

**読書テキスト:**

| スタイル | CSS クラス | サイズ/行高/太さ | 用途 |
|---|---|---|---|
| `verse-ja` | `.verse-ja` | 17px / 34px / 400 | 単一読み・日本語翻訳本文 |
| `verse-ja-comparison` | `.verse-ja-comparison` | 16px / 30px / 400 | Comparison ペイン内の日本語本文（2翻訳同時表示のための最小限の縮小）|
| `verse-ja-compact` | `.verse-ja-compact` | 14px / 24px / 400 | 参照・コンテキスト用（ピッカーの折りたたみプレビュー等）|
| `verse-source` | `.verse-source` | 18px / 34px / 400 | ギリシャ語・将来ヘブライ語の本文 |
| `word-source-inline` | `.word-source-inline` | 16px / 26px / 400 | WORD_ORDER・STRUCTURE モードの語トークン・Research Popover |
| `gloss-source` | `.gloss-source` | 12px / 16px / 400 | WORD_ORDER モードのインターリニアグロス |

**構造表示テキスト:**

| スタイル | CSS クラス | サイズ/行高/太さ | 用途 |
|---|---|---|---|
| `structural-tag` | `.structural-tag` | 11px / 14px / 600 | FUNCTION/CONSTRUCTION/MORPHOLOGY のロールラベル |
| `structural-node-text` | `.structural-node-text` | 15px / 22px / 400 | 構造ノードボックス内のデフォルト UI メトリクス |

### 4-3. 現行アプリとの差異（コード確認済み）

| 要素 | 現行実装 | DS 定義 | 差分ステータス |
|---|---|---|---|
| 日本語本文 | 16px / 行高 2.1（`line-height: 2.1`）| 17px / 34px（行高 2.0）| 1px 差。誤差範囲（KEEP 判断）|
| ギリシャ語本文 | Gentium Plus | `reading-source`（Cardo / Gentium Plus / Noto Serif）| fallback で整合 |
| breadcrumb フォント | `'Noto Serif JP', serif`（reading 体）| `font-ui-sans` | 👁 VISUAL REVIEW（H-10）|
| 節番号色 | `var(--text-hint, #8e8e93)`（cool gray）| `ink-secondary #57534a`（warm）| アクセント色実装（H-1）と連動して評価 |

---

## 5. スペーシング・形状・シャドウ

### 5-1. スペーシングトークン ✅ CONFIRMED

トークンは役割で命名されており、サイズ名（`sm`/`lg`）ではない。使用時は「何の間隔か」でトークンを選ぶ。

| トークン | 値 | 主な役割 |
|---|---|---|
| `space-1` | 4px | アイコン-ラベル間・タグ内パディング |
| `space-2` | 8px | 節番号-本文間・構造タグ-ボックス辺間 |
| `space-3` | 12px | 構造内の句レベル間隔・語とグロスの間 |
| `space-4` | 16px | パネル・カードの内部パディング |
| `space-5` | 24px | 単一読み時の節間デフォルトリズム |
| `space-6` | 32px | 段落境界・章見出し-1節間 |
| `space-7` | 48px | モバイル比較の翻訳間間隔 |
| `space-8` | 64px | デスクトップの章レベル上部余白 |

**現行アプリとの対応:** 現行アプリの spacing 値（4px・8px・16px・24px・32px）は DS の `space-1`・`space-2`・`space-4`・`space-5`・`space-6` に対応する。DS の `space-3: 12px` に相当するトークンは現行アプリに存在しない。名称形式のみ異なる（サイズ名 vs 役割名）。

### 5-2. 角丸（Radius）✅ CONFIRMED

| トークン | 値 | 用途 | 使用限定 |
|---|---|---|---|
| `radius-sm` | 4px | 構造ノードボックス・小タグ・MORPHOLOGY チップ | — |
| `radius-md` | 8px | ボタン・入力欄・ピッカー行・カード | — |
| `radius-lg` | 16px | 画面端から上がるシート・サイドパネル | 端から立ち上がる要素のみ |
| `radius-pill` | 999px | **ReadingStateSwitch（Segmented Control）および translation chips** | これら以外に使わない |

`radius-pill` は「これはモードスイッチ・翻訳選択のコントロールである」という意味を形で伝える。装飾目的で他のコントロールに使わない。

### 5-3. シャドウ ✅ CONFIRMED

| トークン | 用途 |
|---|---|
| `shadow-panel` | 読書ペインの上に浮くパネル・ポップオーバー・比較セットアップパネル |
| `shadow-sheet` | モバイルビューポートの端から上がるボトムシート |

読書要素（本文・節）にシャドウを使わない。シャドウは「読書面より上に浮いている」ことを示す。

---

## 6. コンポーネント原則

コンポーネントの詳細仕様・プレビューは各 `components/<Comp>/README.md` を参照。ここでは設計意図と実装状態のみを記録する。

### 6-1. Verse ✅ CONFIRMED

節番号（`ui-caption`, `ink-secondary`）＋本文（`verse-ja` / `verse-source`）の最小単位。節番号は本文から `space-2` 離す。段落境界は `space-6` の余白のみで表現し、罫線を引かない。

**Comparison 中の例外:** 番号タップ = 対応節へのジャンプ。本文タップ = Research 起動。（Single 読み時は節全体が Research 起点）

### 6-2. StructuralNode ✅ CONFIRMED（基本構造）/ ⏸ DEFER（3色実装）

Reed–Kellogg 式のネスト+インデント表現。`structural-connector` 色の細い接続線で親子関係を示す。既定は FUNCTION 層のみ展開、CONSTRUCTION/MORPHOLOGY はタップで開く（Progressive Disclosure）。

**focus-visible の競合 (CONFIRMED from code):** 現行は `outline: 2px solid var(--color-domain, #7a7aaa)`（紫）。DS は `focus-ring: ink-primary`。方針が一致していない。focus-ring を ink-primary に変更する方針自体は §7-1 で CONFIRMED 済み。実装後、StructuralNode 上での境界線との視覚的区別が保たれるかを目視確認する（H-8、👁 VISUAL REVIEW）。

### 6-3. ReadingModePicker（再設計要件）🔶 PROVISIONAL

現行の「読み方を選ぶ」パネルは3軸が未分離。再設計の目標形態:
1. 最上部: ReadingStateSwitch（Single / Comparison）⏸ DEFER — Translation B in-app データが整備され H-3 が確定するまで、案 B（現行位置維持）を採用（H-3/H-4 参照）
2. Translation セクション: 翻訳の選択
3. View Mode セクション: Default / WORD_ORDER / STRUCTURE / CLAUSE_ROLE / RELATION

H-2（翻訳軸-モード軸の境界形態）・H-3（Translation B 保有方針）・H-4（ReadingStateSwitch 配置）が確定してから実装形態を最終化する。

### 6-4. BottomNavigation ✅ CONFIRMED（アーキテクチャ）/ ⏸ DEFER（全タブ構成）

**確定タブ:** 聖書・検索。「本文」タブは廃止または「読む」に改名。  
**保留:** ノートタブ（H-5）・その他タブ（内容定義後）。  
**Pressed 状態 (CONFIRMED):** `rgba(0,0,0,0.05)` 背景（`index.html:6007`）— 維持。  
**アクティブ色:** `accent-greek-700`（DS 定義）。現行は色変化なし。アクセント色実装（H-1）と連動。

### 6-5. ReadingStateSwitch ✅ CONFIRMED（設計）/ ⏸ DEFER（配置）

`radius-pill`（999px）を使う2つのコントロールのうちの1つ（translation chips も同トークンを使う）。Active 状態: `accent-greek-700` 塗り + `ink-on-accent` テキスト（DS 定義）。現行 Active: `rgba(255,255,255,0.92)` + `var(--text-main)` グレー（アクセント色実装後に変更）。

### 6-6. ComparisonMobileStacked ⏸ DEFER（Translation B 待ち）

DS が定義する連続スクロール型の Mobile Comparison（`space-7` で翻訳間を区切る、sticky 翻訳ラベル、節番号タップジャンプ）。Translation B in-app データが整備され、節番号 1:1 対応が確認されてから実装する（§2-6 参照）。

---

## 7. インタラクション・アクセシビリティ

### 7-1. focus-visible ✅ CONFIRMED（原則）/ 👁 VISUAL REVIEW（実装確認）

`--focus-ring: var(--ink-primary)` — 2px、offset 2px、すべてのフォーカス可能要素。

**原則:** フォーカスリングはアクセント色（`accent-greek-700`）・構造色（`structural-*`）・選択状態（`surface-selected`）と混同しないよう、意図的に ink 色にする。

**現行との競合 (CONFIRMED from code):**
- `StructuralNode` の `.hdg-clause--sub > .hdg-clause-label:focus-visible`: `var(--color-domain, #7a7aaa)`（紫）
- WORD_ORDER モード時: `outline-color: #3a6aab`（青のオーバーライド）
- `.role-view:focus-visible`: `var(--accent)`（青灰）

これらは DS 原則と一致しない。実装変更後の目視確認が必要（H-8）。

### 7-2. コントラスト要件 ✅ CONFIRMED

| 組み合わせ | 状態 |
|---|---|
| `ink-primary #211f1a` on `surface-canvas #fbfaf7` | ✅ 確認済み（約16:1） |
| `ink-primary` on `surface-raised #ffffff` | ✅ 確認済み（同等）|
| `accent-greek-700 #2c4f34` on `surface-canvas` | ✅ DS が 4.5:1 達成と明記（🔶 実値 #2c4f34 は provisional）|
| `ink-on-accent #ffffff` on `accent-greek-700` | ✅ DS が 4.5:1 達成と明記 |
| `structural-function-ink #375e2c` on `structural-function-fill #e3eddf` | ✅ 6.2:1 確認済み |
| `structural-construction-ink #2e5945` on `structural-construction-fill #cce6db` | ✅ 6.1:1 確認済み |
| `structural-morphology-ink #316148` on `structural-morphology-fill #e6f0ea` | ✅ 6.1:1 確認済み |
| `signal-attention-ink #8a5a14` on `signal-attention-fill #faf0da` | ✅ DS 確認済み |
| `accent-hebrew-700 #732f1e` on `surface-canvas` | ✅ DS が 4.5:1 達成と明記（⏸ 実装は DEFER）|

### 7-3. キーボード操作 ✅ CONFIRMED（要件）

Reading Surface の節送り、View Mode 切り替え、Comparison Setup のすべてをキーボードのみで操作可能にする。Structural Reading のネスト箱も Tab 順で階層順（FUNCTION → CONSTRUCTION → MORPHOLOGY、外側から内側）にフォーカス移動できるようにする。

**実装確認状態 (CONFIRMED):** 現行フォーカスは StructuralNode で確認済み（ただし色が DS と不一致）。その他コンポーネントは設計要件・実装未確認（NOT FOUND）。

### 7-4. タッチターゲット ✅ CONFIRMED（要件）

モバイルの節タップ領域・Bottom Navigation タブ・Comparison Setup の Radio 行はいずれも 44×44px 以上を確保する。

### 7-5. Reduced Motion ✅ CONFIRMED（要件）

`prefers-reduced-motion` を尊重する。パネル・シートの開閉もクロスフェードなしの即時表示に切り替える。詳細は `10-motion.md` を参照。

### 7-6. 色以外の識別手段 ✅ CONFIRMED

Structural Reading 各層は色に加えて `structural-tag` ラベルを必ず併記する。Comparison 中の Translation A/B は色ではなくラベル文字列（翻訳名）で区別する。いかなる意味の区別も色のみに依存しない。

---

## 8. ステータス・決定事項レジスタ

### 8-1. 確定項目（CONFIRMED）

| 事項 | 根拠 |
|---|---|
| Reading First 原則 | `README.md`・`01`・`05` |
| 3軸分離の原則（Translation / Reading State / View Mode）| `01`・`06`・`revision-proposal-01.md` |
| BottomNavigation に Reading/Comparison/Research を置かない | `02` §5 |
| 「本文」タブの廃止 | `02` §5・`revision-proposal-01.md` §1-C |
| radius-pill を ReadingStateSwitch および translation chips に限定 | `README.md`・`tokens.json` |
| focus-ring = ink-primary の原則 | `tokens.json`・`05` §7 |
| 共有トークン vs 言語テーマトークン vs 読書解析カラーの3層分離 | `tokens.json`・`01` §2 |
| Greek = 緑テーマの製品方向 | ユーザー明示の製品方針 + `01` §2 + `tokens.json`（H-11: ユーザー明示の製品方針により確認済み）|
| accent-hebrew-* は現行 Greek ビルドで使用しない | `README.md`・`01` §2 |
| モバイル比較の verse-by-verse ページングを暫定維持 | `revision-proposal-01.md` §1-D |
| breadcrumb の DS 定義は ui-sans | `README.md` |
| 3層構造色の意味定義なしに3色実装しない | `revision-proposal-01.md` §2-B |
| 現行背景色 #ffffff を暫定維持 | `revision-proposal-01.md` §2-D |
| CONFIRMED なトークン値（surface-*, ink-*, border-*, structural-*, signal-*, focus-ring）| `tokens.json`・`tokens.css` |

### 8-2. 暫定・推論（PROVISIONAL / INFERRED）

| 事項 | 根拠 |
|---|---|
| accent-greek-700 = `#2c4f34`（provisional target）| DS 指定。実機評価後に確定（H-12）|
| 言語テーマの影響範囲 = accent ファミリーのみ（推奨）| `revision-proposal-01.md` §2-F（INFERRED）|
| テーマ活性化のオプション案（`:root[data-lang]` クラス等）| `revision-proposal-01.md` §2-F（INFERRED）|
| ReadingStateSwitch の暫定配置 = 現行末尾（案 B）| H-3 が未解決のため |

### 8-3. 視覚評価待ち（VISUAL REVIEW）

| H | 事項 | 評価できる最早タイミング |
|---|---|---|
| H-8 | focus-visible を ink-primary に変更後、StructuralNode 上で境界線と区別できるか | focus-ring 実装後 |
| H-9 | 背景色 #fbfaf7 vs #ffffff の長時間読書での実機評価 | 背景色変更後 |
| H-10 | breadcrumb フォント: serif 維持 vs ui-sans 変更 | 現時点で実機確認可能 |
| H-12 | accent-greek-700 `#2c4f34` の実機 Reading-First 評価 | ✅ 暫定PASS（Phase 15D 実装・2026-09-29）。実機最終確定は残件。|

### 8-4. 技術調査待ち（TECHNICAL INVESTIGATION）

| H | 事項 |
|---|---|
| H-3 | Translation B の in-app 保有可能性。ReadingStateSwitch 配置（H-4）・モバイル比較方式（H-6）の前提 |
| H-14 | テーマ活性化メカニズム（CSS クラス / JS トークン差し替え / その他） |

### 8-5. 明示的保留（DEFER）

| H | 事項 | 解除条件 |
|---|---|---|
| H-1 | アクセント色の実装タイミング | 実装計画時 |
| H-2 | 翻訳/モード軸の UI 境界の具体形 | ReadingModePicker 実装時 |
| H-4 | ReadingStateSwitch の配置（案 A vs 案 B）| H-3 が解決後 |
| H-5 | BottomNavigation にノートタブを追加するか | ノート機能の公開方針確定後 |
| H-6 | モバイル比較の連続スクロール移行 | H-3 + 節番号対応確認後 |
| H-7 | StructuralNode 3層の意味定義 | 各層の教育的定義確定後 |
| H-13 | Hebrew テーマ色の採用判断 | Hebrew 製品計画確定後 |
| H-15 | 言語テーマの影響範囲確定 | Hebrew 実装計画時 |

---

## 9. 再監査チェックリスト

アプリ変更後または DS 更新後に以下を確認する。

### 読書第一・視覚的階層
- [ ] 聖書本文が視覚的前景に保たれているか（`ink-primary` が UI クロムに使われていないか）
- [ ] `accent-greek-700`（深緑）が本文テキストに使われていないか
- [ ] BottomNavigation に Reading/Comparison/Research が項目として含まれていないか
- [ ] 読書サーフェス内で Primary Button の多用がないか（SaaS 的な印象になる）

### 共有トークン vs 言語テーマ色
- [ ] `surface-*`・`ink-*`・`border-*`・`focus-ring`・`signal-*` が `accent-*` に汚染されていないか
- [ ] `accent-greek-700` が選択状態・ボタン・アクティブ状態の限定された役割のみに使われているか
- [ ] `accent-hebrew-*` が現行 Greek ビルドで使われていないか

### 読書・解析セマンティックカラー
- [ ] `structural-*` が `accent-greek-*` と視覚的に混同されていないか
- [ ] `structural-morphology-ink`（緑）と `accent-greek-700`（深緑）が隣接していないか
- [ ] 構造色の各層にラベルテキストが伴っているか（色単独で意味を担っていないか）

### ナビゲーションとモード分離
- [ ] Translation と View Mode が同一フラットリストに混在していないか
- [ ] ReadingStateSwitch が `radius-pill` を使っているか
- [ ] translation chips が `radius-pill` を使っているか
- [ ] Bottom Navigation が App-level destination のみを含んでいるか

### タイポグラフィと読書快適性
- [ ] `reading-ja`・`reading-source` が本文以外（ボタン・breadcrumb）に使われていないか
- [ ] `ui-sans` が本文テキストに使われていないか
- [ ] `verse-ja`（17px/34px）が Comparison ペイン外で維持されているか

### フォーカスとインタラクション状態
- [ ] すべてのフォーカス可能要素に `focus-ring`（2px ink 色）が適用されているか
- [ ] フォーカスリングがアクセント色・構造色と混同されないか
- [ ] モバイルタッチターゲットが 44×44px 以上か

### モバイル動作
- [ ] モバイルで Comparison の Reading State が選択できるか（ReadingStateSwitch のアクセスが確保されているか）
- [ ] Bottom Navigation のアクティブ状態の色変化があるか

---

*この文書は第1草稿である。§8 の保留項目（H-1〜H-15）が解決されるたびに更新する。詳細な決定履歴・監査根拠は `revision-proposal-01.md` を参照すること。*
