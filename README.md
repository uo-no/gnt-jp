# README（Pre-Release）

## 概要

ギリシャ語新約聖書および七十人訳（LXX）を、原語に触れながら読み進められる聖書閲覧Webアプリです。
サーバーやビルドプロセスを持たない静的構成で、ブラウザ上でそのまま動作します。

構成は以下の4画面です。

* `index.html` — 聖書本文の閲覧（メイン画面）
* `morph-search.html` — 形態論（語形）検索
* `syntax-search.html` — 統語論（文構造）検索
* `search-tool.html` — 統合検索（見出し語・フレーズ・近接・形態素）

---

## 目指す方向性

本プロジェクトの中心は「聖書を読む体験」です。

研究ツールとしての網羅性よりも、

> 聖書を読んでいるうちに、自然と原語の理解が深まる

という体験を重視しています。形態論・統語論・統合検索の3ツールは、読書体験を補助する位置づけです。

UIは Apple Books / Apple Notes 等を参照し、情報密度・余白・強調の重ね掛けを抑えた「静かな読書体験」を志向しています（`css/tokens.css` に定義したデザイントークンに沿って統一）。

---

## 現在の状態（Pre-Release）

基本的な読書機能・検索機能・URL共有機能は動作します。

データの出典明記とライセンス整理は整理途中です。本リポジトリはその完了前の**Pre-Release**として公開しています。

---

## 主な機能

* 原文と日本語訳（口語訳・文語訳）の並列表示・比較表示
* 「読解フロー」表示：原語の語順のまま、語ごとの日本語グロスを添えて読み進めるモード
* StudyPanel：選択した語の形態情報・辞書解説・読書メモを表示
  * 本文 → 節パネル → 単語詳細の3階層構造。「戻る」操作は常に1つ上の階層を閉じるだけの単純な動作で統一されている
* ReadingFormatter（`js/clause-analyzer.js`）による読書メモの自然文生成
  * 節・文の構造（`js/syntax-analyzer.js` / `js/phrase-analyzer.js` の解析結果）に基づき、語形コード等を露出させない自然文を生成する単一の生成元として統一されている
* Wallace文法体系に基づく構文分類（`js/syntax-analyzer.js` / `data/syntax-registry.json`）
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
* 解析エンジン（いずれも `/js` 配下、DOM/UIに非依存）
  * `syntax-analyzer.js`：トークン単位の構文機能候補を判定（`data/syntax-registry.json` 参照）
  * `phrase-analyzer.js`：`syntax-analyzer.js` の出力から句レベル構造を構成（`data/phrase-registry.json` 参照）
  * `clause-analyzer.js`：`syntax-analyzer.js` / `phrase-analyzer.js` の出力から節レベル構造を構成し、ReadingFormatter等を含む（`data/clause-registry.json` 参照）
* デザイントークン（`css/tokens.css`）：タイポグラフィ6段階・角丸3段階・不透明度4段階・単一アクセントカラー・モーション（easing 1種類／duration 3段階）を単一のソースとして定義
* 外部通信はGoogle Fonts（CDN）のみで、サーバーサイド処理は行いません

---

## ディレクトリ構成

```
index.html / morph-search.html / syntax-search.html / search-tool.html  — 主要画面
css/                    — 共通スタイル（tokens.css / layout.css / components.css）
js/                     — 解析エンジン（syntax-analyzer.js / phrase-analyzer.js / clause-analyzer.js）
data/                   — レジストリ・辞書・Changelogデータ（*.json / abbott-smith.tsv）
bible_data/             — 聖書本文・形態素データ
translations/           — 日本語訳データ
morph-index/, lexicon/  — 形態素索引・辞書データ
onboarding.js, book-master.js, shared-ui.js, shared-insight.js, app-storage.js 等 — 補助スクリプト
docs/                   — 内部設計ドキュメント・本README
```

---

## 制限事項

* データの出典・ライセンス表記は整理途中です。詳細は [DATA_LICENSE.md](./DATA_LICENSE.md) を参照してください。
* `syntax-search.html` の節全体の和訳表示は、UIとして未完成です（表示までは接続されていません）。
* `syntax-search.html` の書物フィルタUIは未実装です。
* `search-tool.html` で形態素を複数選択した場合、URL共有で保存されるのは各項目の先頭の1件のみです。これは既知の制約です。
* 語の品詞判定は、データ中のどの項目を参照するかが画面ごとに異なり、結果が画面間で一致しない場合があります。
* 一部の画面表示処理で、表示内容の無害化（エスケープ）処理が構造的に一貫していません。整備対象として認識しています。

---

## 今後の予定

* データ出典・ライセンス表記の整備
* 未完成UI機能（和訳表示、書物フィルタ）の実装または整理
* 表示処理のエスケープ方針の統一
* 品詞判定の画面間差異の整理
* 大容量データ構成の見直し
* 自動テスト（`clause-analyzer-test.js`）のカバレッジ拡大（現状は解析エンジン層のみ対象）

---

## ライセンス・公開条件

コードは [MIT License](./LICENSE.md) のもとで公開しています。
収録データ（聖書本文・辞書・形態素索引等）の扱いは [DATA_LICENSE.md](./DATA_LICENSE.md) を参照してください。コードとデータでライセンスが異なります。

---

## 注意事項

* 本リポジトリは研究・学習用途を想定しています。
* データの完全性・正確性は保証しません。
* リポジトリ容量が大きいため、クローン・初回読み込みに時間がかかる場合があります。
