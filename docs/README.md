# README（Pre-Release）

## 概要

ギリシャ語新約聖書および七十人訳（LXX）を、原語に触れながら読み進められる聖書閲覧Webアプリです。
サーバーやビルドプロセスを持たない静的構成で、ブラウザ上でそのまま動作します。

構成は以下の4画面です。

* `pages/index.html` — 聖書本文の閲覧（メイン画面）
* `pages/morph-search.html` — 形態論（語形）検索
* `pages/syntax-search.html` — 統語論（文構造）検索
* `pages/search-tool.html` — 統合検索（見出し語・フレーズ・近接・形態素）

---

## プロジェクト構造

- `pages/`       → UI（HTMLのみ・ロジック禁止）
- `core/`        → 解析ロジック（純関数）
- `assets/js/`   → UI補助・状態管理
- `assets/data/` → 実データ
- `css/`         → スタイル
- `scripts/`     → ビルド・生成専用
- `docs/`        → 設計・仕様

## 設計原則

- `pages/` は薄く保つ（ロジックは `core/` または `assets/js/` へ）
- `core/` は DOM に依存しない（純関数・Node.js でも動作可能）
- `assets/data/` は直接編集しない（`scripts/` 経由で生成）
- `scripts/` でのみデータ生成する

---

## 目指す方向性

本プロジェクトの中心は「聖書を読む体験」です。

研究ツールとしての網羅性よりも、

> 言語の壁に気づかせない。読書の流れが途切れない。

という体験を重視しています。形態論・統語論・統合検索の3ツールは、読書体験を補助する位置づけです。

UIは 情報密度・余白・強調の重ね掛けを抑えた「静かな読書体験」を志向しています（`css/tokens.css` に定義したデザイントークンに沿って統一）。

---

## 現在の状態（Pre-Release）

基本的な読書機能・検索機能・URL共有機能は動作します。

データの出典明記とライセンス整理は整理途中です。本リポジトリはその完了前の**Pre-Release**として公開しています。

---

## 主な機能

* 原文と日本語訳（口語訳・文語訳）の並列表示・比較表示
* 「読解フロー」表示：原語の語順のまま、語ごとの日本語グロスを添えて読み進めるモード
* StudyPanel：選択した語の読書メモ（本文理解の補助）・辞書解説・形態情報を表示する**読書支援パネル**。文法情報は「なぜそのように読めるか」の根拠としてのみ提示する（設計理念: `scripts/output/studypanel-design-principles.md`）
  * 本文 → 節パネル → 単語詳細の3階層構造。「戻る」操作は常に1つ上の階層を閉じるだけの単純な動作で統一されている
* ReadingFormatter（`core/clause-analyzer.js`）による読書メモの自然文生成
  * 節・文の構造（`core/syntax-analyzer.js` / `core/phrase-analyzer.js` の解析結果）に基づき、語形コード等を露出させない自然文を生成する単一の生成元として統一されている
* Wallace ベースの統語解析エンジンによる構文分類（`core/syntax-analyzer.js` / `assets/data/syntax-registry.json`）
  * **Wallace Core**: Wallace, *Greek Grammar Beyond the Basics*（GGBB 1996）の統語カテゴリ（格・冠詞・形容詞・代名詞・前置詞・動詞・不定詞・分詞・節構文・条件文・接続詞・小辞）をすべて実装
  * **Engine Extensions**: GGBB には章として存在しない独自の横断解析レイヤー — Nominal Syntax（名詞句全体の構造分類）と Discourse / Information Structure（Wallace が各章で個別に扱う語順・強調・談話的特徴の横断整理）
* ブックマーク・メモ・最近読んだ箇所・最近見た単語の保存と一覧表示
  * メモの削除はソフトデリート（ゴミ箱への移動・復元・完全削除）方式
* 更新情報（Changelog）画面：`data/changelog.json` を読み込んで表示
* 閲覧状態（書籍・章・節・StudyPanel・選択語）をURLで共有・復元
* 形態論／統語論／統合検索の3ツール（検索条件もURLで共有可能）
* 初回利用者向けのオンボーディングガイド

---

## 技術構成

* 静的HTML / CSS / JavaScript（サーバーなし、ビルド不要）
* フォント：Google Fonts（CDN）— Gentium Plus（ギリシャ語）、Noto Sans JP / Noto Serif JP（日本語）
* データ：ローカルJSON / TSV（聖書本文・翻訳・形態索引・辞書・構文/句/節レジストリ）。辞書データは原典辞書（Abbott-Smith）をベースにした再構成データで、日本語部分は人手翻訳とAI補助による抄訳を含みます。詳細は [DATA_LICENSE.md](./DATA_LICENSE.md) を参照してください。
* 解析エンジン（いずれも `core/` 配下、DOM/UIに非依存）
  * `core/syntax-analyzer.js`：トークン単位の構文機能候補を判定（`assets/data/syntax-registry.json` 参照）。Wallace Core（GGBB の統語カテゴリ）を実装し、独自の Engine Extensions（Nominal Syntax / Discourse）を加えた **Wallace-based Greek Syntax Engine**
  * `core/phrase-analyzer.js`：`syntax-analyzer.js` の出力から句レベル構造を構成（`assets/data/phrase-registry.json` 参照）
  * `core/clause-analyzer.js`：`syntax-analyzer.js` / `phrase-analyzer.js` の出力から節レベル構造を構成し、ReadingFormatter等を含む（`assets/data/clause-registry.json` 参照）
* デザイントークン（`css/tokens.css`）：タイポグラフィ6段階・角丸3段階・不透明度4段階・単一アクセントカラー・モーション（easing 1種類／duration 3段階）を単一のソースとして定義
* 外部通信はGoogle Fonts（CDN）のみで、サーバーサイド処理は行いません

---

## ディレクトリ構成

```
pages/                  — 主要画面（index.html / morph-search.html / syntax-search.html / search-tool.html）
core/                   — 解析エンジン（syntax-analyzer.js / phrase-analyzer.js / clause-analyzer.js）
assets/js/              — UI補助スクリプト（app-storage.js / book-master.js / shared-ui.js 等）
assets/data/            — レジストリ・辞書・Changelogデータ（*.json / abbott-smith.tsv）
  assets/data/index/    — ドメインインデックス
  assets/data/lexicon/  — 辞書データ
css/                    — 共通スタイル（tokens.css）
bible_data/             — 聖書本文・形態素データ
translations/           — 日本語訳データ
morph-index/            — 形態素索引
scripts/                — ビルド・データ生成スクリプト
docs/                   — 設計ドキュメント・本README
```

---

## 今後の予定

* データレイヤー（読書を成立させるための基盤）
  * 日本語訳の追加（読書の即時理解を支える）
  * ヘブライ語テキスト対応（読解フローとして）
  * 辞書データの拡充（ただし読書中に“止めない”形で利用）
  * 語の出現頻度・希少性データ（表示ではなく、摩擦検知の裏情報として利用）
* 読書体験統合（コア機能）
  * 4ページ分散によるコンテキスト断絶の解消（読書・参照・メモ・検索を「読書画面内」で循環可能にする）
  * 読書位置を壊さないコンテキスト復帰設計（ジャンプ・戻る・履歴保持）
  * 研究機能ではなく「読書中の補助情報」としての統合UI設計
* 記録・接続（読書記録）
  * メモ・ブックマーク機能（読書の流れを壊さない軽量記録）
  * メモ間リンク（タグではなく“参照関係”としての最小接続）
  * エクスポート機能（外部研究ではなく、読書記録の持ち出し）

---

## ライセンス・公開条件

コードは [MIT License](./LICENSE.md) のもとで公開しています。
収録データ（聖書本文・辞書・形態素索引等）の扱いは [DATA_LICENSE.md](./DATA_LICENSE.md) を参照してください。コードとデータでライセンスが異なります。

---

## 注意事項

* 本リポジトリは研究・学習用途を想定しています。
* データの完全性・正確性は保証しません。
* リポジトリ容量が大きいため、クローン・初回読み込みに時間がかかる場合があります。
