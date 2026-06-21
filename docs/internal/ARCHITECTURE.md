# ARCHITECTURE.md

構造と依存関係のみを記載する。状態遷移はDATA_FLOW.md、機能の実装状態はFEATURE_MAP.md、判断理由はDESIGN_DECISIONS.mdを参照。

---

## 1. ファイル構成

| ファイル | 概算行数 |
|---|---|
| `index.html` | 約9,700行 |
| `morph-search.html` | 約1,960行 |
| `syntax-search.html` | 約3,300行 |
| `search-tool.html` | 約3,400行 |

リポジトリ直下に`package.json`等のビルド設定ファイルは存在しない。

---

## 2. `<script src>`依存関係

```
index.html
 ├─ shared-insight.js
 └─ onboarding.js

morph-search.html
 └─ book-master.js

syntax-search.html
 ├─ syntax-analyzer.js
 └─ book-master.js

search-tool.html
 └─ book-master.js
```

- `book-master.js`：3画面（morph-search/syntax-search/search-tool）が読み込む。
- `syntax-analyzer.js`：`syntax-search.html`のみが読み込む。
- `shared-insight.js`：`index.html`のみが読み込む。
- `syntax-tree-builder.js`／`shared-ui.js`：4画面いずれの`<script src>`にも該当しない。

4画面間でJSオブジェクト・状態を直接共有する構成は存在しない。画面遷移は`<a href>`／`window.location.href`によるページ遷移。

---

## 3. index.html内のトップレベル構成要素

単一ファイル内、モジュール分割なし。

- `AppState`：`mode`/`selectedVerse`/`inspect`/`study`/`location`/`depth`を保持するオブジェクトリテラル。
- `ShareURLService`/`Router`/`getShareState`/`applyShareState`/`syncUrlState`/`notifyAppStateChange`
- `window.__onboardingActive`／`_syncOnboardingActiveFlag()`
- `render()`/`renderCurrentPage()`/`openStudyPanel()`/`closeStudyPanel()`/`reopenStudyPanel()`/`openWordListInStudyPanel()`
- `wallaceGrammarAdapter()`/`generateWallaceReadingProse()`

---

## 4. DOM階層（index.html、確認できた範囲）

```
#app
 ├─ .nav-sidebar
 ├─ #main-reading-area
 │   ├─ verse-block
 │   └─ verse-pair-right
 ├─ #inspect-popover
 └─ #bottom-depth-panel
     ├─ .panel-header（`@media (min-width:901px)`で表示）
     ├─ #mobile-nav-bar（`@media (max-width:900px)`で表示）
     ├─ .rcb-container
     └─ #reading-notes-area
```

---

## 5. 外部リソース依存

4画面とも`<link>`での外部読み込みは`fonts.googleapis.com`（Google Fonts：Gentium Plus、Noto Sans JP、一部Noto Serif JP、Material Symbols Outlined）のみ。それ以外の外部ホストへの`<script src>`／`<link>`は確認できない。

---

## 6. データファイルとコードの分離

`bible_data/`・`translations/`・`morph-index/`・`lexicon/`・`abbott-smith.tsv`・`books.json`はJSON/TSV形式の静的ファイルであり、4画面から`fetch()`で読み込まれる。

`build-syntax-index.js`／`build-morph-index.js`／`sync-abbott-smith.js`は`require`構文を含むNode.js向けスクリプトであり、4画面の`<script src>`からは参照されない。

---

## 7. 品詞判定・エスケープ処理の定義位置

- `CLASS_TO_POS`／`entryPosCode()`：`morph-search.html`（868行目／881行目）と`syntax-search.html`（1489行目／1502行目）にそれぞれ個別定義されている。共通ファイル化はされていない。判定内容の差異はFEATURE_MAP.mdを参照。
- `_escH()`：`morph-search.html`（721行目）と`syntax-search.html`（2498行目）にそれぞれ個別定義されている。`index.html`・`search-tool.html`には`_escH`という名前の関数定義は確認できない（同等処理が別名で存在するかは未確認）。

---

## 8. 未確認事項

- `archive/wallace-compiler/`（TypeScript）が4画面の`<script src>`に含まれないことは確認したが、過去のビルド経路の有無自体は未確認。
- `index.html`・`search-tool.html`に`_escH`相当の処理が別名で存在するかは未確認。
- `book-master.js`の公開メソッド全量は本文書では列挙していない。
