# FEATURE_MAP.md

UIイベント単位の実装状態のみを記載する。3区分：

- **実装済み**：UIイベント→処理→画面反映の経路がコード上で確認できる
- **未接続**：処理は存在するが、UIへの反映経路またはUI操作要素が確認できない
- **死んだコード**：呼び出し元が存在しない

---

## 1. index.html

| UIイベント / 対象 | 状態 |
|---|---|
| 書物・章選択 | 実装済み |
| 節クリック | 実装済み |
| 単語（`.wlv-chip`）クリック → Inspect Popover | 実装済み。チップ表示処理（7846行目付近、8083〜8086行目付近、9448〜9449行目付近の3箇所）は、原語（`c.greek`）と日本語訳（`c.gloss`）を`_escH()`を経由せず`innerHTML`へ展開する |
| Popover「詳しく見る」→ StudyPanel展開 | 実装済み |
| StudyPanel：形態情報表示 | 実装済み |
| StudyPanel：読書メモ（Wallace解説文）表示 | 実装済み |
| StudyPanel：関連語表示（概念のつながり等） | 実装済み。`s.gloss`/`node.gloss`/`exSnippet`等を`_escH()`を経由せず`innerHTML`へ展開する箇所が複数ある（5623〜5863行目付近） |
| 本文（節テキスト）の描画 | 実装済み。`jpData.verses`から取得した翻訳テキストを`_escH()`を経由せず`innerHTML`へ展開する（7860行目／7877行目） |
| 翻訳切り替え（口語訳／文語訳） | 実装済み。`TRANSLATIONS`オブジェクトの`KAI17`/`KYO`エントリはコメントアウトされており、UI操作からは選択できない |
| 比較表示モード | 実装済み |
| 共有ボタン（`.panel-header`／`#mobile-nav-bar`） | 実装済み |
| URL直接アクセス（book/ch/verse/panel/word/transA/transB/mode） | 実装済み |
| オンボーディング | 実装済み |
| 「後で読む」保存ボタン | 実装済み（`localStorage`キー`app_saved_insights`への書き込みまで確認）。保存した一覧の読み出しUIは確認できる範囲では見つからない（未確認） |
| `decorate()` | 死んだコード（呼び出し元なし） |
| `index.html`内の`_escH`相当処理 | `_escH`という名前の関数定義は確認できない（未確認：別名処理の有無） |

---

## 2. morph-search.html

| UIイベント / 対象 | 状態 |
|---|---|
| 検索語入力・各種フィルタ | 実装済み |
| Core/Ext条件トグル | 実装済み |
| 結果一覧表示（`renderPage()`） | 実装済み。`entry.word`/`entry.lemma`/`refLabel`はいずれも`_escH()`を経由する |
| 結果クリック → 節文脈表示（`toggleMorphContext()`） | 実装済み。表示語（`ja`/`w`）は`_escH()`を経由する |
| 共有ボタン | 実装済み |
| URL直接アクセス（`tool=morph`） | 実装済み |
| `entryPosCode()`（`entry.pos` → `entry.morph` → `entry.class`の順にフォールバック） | 実装済み。実データ（`bible_data`のトークン）に`pos`フィールドは存在しないため、`entry.morph`（例：`'A-NSF'`）の先頭文字が使われる |
| 発見一覧・分布一覧・スコープ選択UI（1158行目／1322行目／1435行目付近） | 実装済み。表示項目に`_escH()`を経由しないものが含まれる（書物名等の内部マスターデータが中心で、ユーザー入力・外部fetchデータか内部定数かは項目ごとに未確認） |
| `_morphSel`相当の複数選択構造 | 存在しない（`search-tool.html`固有の仕様であり、本ファイルには同等の機能・制限は確認できない） |

---

## 3. syntax-search.html

| UIイベント / 対象 | 状態 |
|---|---|
| 検索語・参照節入力 → 統語解析実行 | 実装済み |
| トークンクリック（`selectToken`） → 文表示（`renderSentence()`） | 実装済み。`jaLabel`/`grLabel`/`ja`/`word`はいずれも`_escH()`を経由する |
| 共有ボタン | 実装済み |
| URL直接アクセス（`tool=syntax`） | 実装済み |
| 書物フィルタ（`.book-filter-panel`） | 未接続：対応するHTML操作要素が見つからない |
| 節全体の和訳表示（`.sentence-ja`） | 未接続：`fetchJaData()`は`init()`から呼ばれ`_jaMap`へ格納するが、`_jaMap`を読み取る処理（`getJaVerse()`の呼び出し）、および`.sentence-ja`クラスをDOMに付与する処理はいずれも見つからない。CSSクラス定義（148行目）のみが存在する |
| `entryPosCode()`（`e.pos` → `e.class`の2段階。`e.morph`へのフォールバックなし） | 実装済み。実データの`class`値（`adj`/`adv`/`conj`/`det`/`noun`/`num`/`prep`/`pron`/`ptcl`/`verb`の10種を確認）のうち、`CLASS_TO_POS`のキー（`verb`/`noun`/`adjective`/`article`/`preposition`/`conjunction`/`adverb`/`particle`/`pronoun`/`relative pronoun`/`personal pronoun`/`demonstrative pronoun`）と完全一致するのは`verb`/`noun`の2種のみ。残り8種（`adj`/`adv`/`conj`/`det`/`num`/`prep`/`pron`/`ptcl`）は一致せず、`entryPosCode()`は空文字列を返す。`morph-search.html`は`entry.morph`へのフォールバックがあるため、この不一致の影響を受けない |
| `findMainVerb()` | 死んだコード（呼び出し元なし） |
| `getEnabledBooks()` | 死んだコード（呼び出し元なし） |
| 候補表示・分詞用法・不定詞用法表示（2486行目／2532行目／2544行目付近） | 実装済み。`word`/`meta.bg`/`meta.barColor`等を`_escH()`を経由せず`innerHTML`へ展開する（`meta.*`は内部定義の役割メタデータ、`word`はトークンの原語表記） |

---

## 4. search-tool.html

| UIイベント / 対象 | 状態 |
|---|---|
| 検索語入力（見出し語／フレーズ／近接／形態素） | 実装済み |
| 形態素複数選択（`_morphSel`、スロットごとに`Set`） | 実装済み。検索結果のフィルタには複数値が反映される |
| 形態素複数選択のURL保存 | 部分実装：`syncURL()`は`_morphSel`各スロットについて`Array.from(set)[0]`（先頭の1値）のみを`URLSearchParams`へ書き込む。2件目以降はURLに反映されない |
| 距離プリセット（`currentDist`）・レイヤー選択（`_layers`） | 実装済み（URL保存・復元あり） |
| 共有ボタン | 実装済み |
| URL直接アクセス（`tool=search`） | 実装済み |
| 検索履歴の保存・表示（`_renderHistory()`） | 実装済み。検索ボックスに入力した検索語（`query`）が`_history`へ保存され、表示時に`_escH()`を経由せず`innerHTML`へ展開される（1923〜1925行目） |
| 検索結果カード・ランキング表示（2420行目／2480行目付近） | 実装済み。表示語を`_escH()`を経由せず`innerHTML`へ展開する箇所がある |
| `search-tool.html`内の`_escH`相当処理 | `_escH`という名前の関数定義は確認できない（未確認：別名処理の有無） |

---

## 5. 共有JS（`shared-insight.js`）関連

| 対象 | 状態 |
|---|---|
| `renderAspectTag()`の`morph-search.html`からの呼び出し | 未接続：`typeof renderAspectTag === 'function'`によるガード付きで呼び出しコードが存在するが、`morph-search.html`は`shared-insight.js`を`<script src>`していないため、`typeof`判定は常にfalseとなり到達しない |

---

## 6. 未確認事項

- 4ファイル合計117箇所の`.innerHTML`代入のうち、本文書で個別に出所まで確認したのは本文表示・単語チップ・検索履歴・関連語表示など主要な箇所に限られる。それ以外の箇所（表示項目が内部定数かユーザー入力かを含む）は個別確認していない。
- 「後で読む」保存データの読み出しUIの不在は、`onboarding.js`の主要箇所の確認に基づく暫定的な判定であり、ファイル全体の総当たり確認ではない。
