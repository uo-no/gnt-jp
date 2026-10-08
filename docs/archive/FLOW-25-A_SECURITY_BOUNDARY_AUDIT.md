# Phase FLOW-25-A Report — Security Boundary Audit（詳細補完）

FLOW-18-A（Security / External Boundary Audit）およびFLOW-22-A（Rendering / DOM Mutation Boundary Audit）の実装事実を前提とし、本Phaseで追加確認（`app-storage.js`の`normalize()`内部構造、`Router.parse()`→`AppState`の型変換詳細、`ShareURLService.generate()`のencode方式、`postMessage`送信有無）に基づく。コード・docs・コメントは変更していない。評価表現・改善提案・推測は含まない。

---

## 1. Input Source Boundary

### URL → Router.parse() → AppState

| 確認項目 | 結果 |
|---|---|
| 型変換 | `Router.parse()`は`URLSearchParams.get()`の戻り値（文字列または`null`）をそのまま返す（型変換なし）。`init()`側で`const chNum = parseInt(ch)`という数値変換が行われる（:8719） |
| validation | `book`は`allBooks.find(b => b.key === book)`という**既知の書籍リストに対する照合**を通す（:8718）。一致しない場合は`found`が`undefined`となる |
| unexpected value handling | `book`が許可リスト外の場合、`AppState.location.book = found \|\| null`により**`null`が代入される**（例外は発生しない）。`isNt = SB_BOOKS.nt.some(b => b.key === book)`も同様に許可リスト外なら`false`となり`testament='ot'`が設定される。`ch`（章番号）が数値化できない文字列の場合、`parseInt(ch)`は`NaN`を返すが、この`NaN`に対する追加チェックは`AppState.location.chapter = chNum`の代入箇所には確認できなかった。ただし、bible_data fetch用のURL構築（`${testament}/${book}/${ch}.json`）には`chNum`ではなく**`Router.parse()`が返した生の文字列`ch`**が使われていることを確認した（`chNum`と`ch`は別変数） |

### localStorage → JSON.parse() → AppState

| 確認項目 | 結果 |
|---|---|
| 型変換 | `JSON.parse(raw)`によりJSON文字列からJSオブジェクトへ変換（`app-storage.js:119`） |
| validation | `normalize(raw)`（:97-113）が`typeof raw === 'object'`という型チェック後、`bookmarks`/`notes`/`recentVerses`/`recentWords`の各フィールドについて`Array.isArray()`チェックを行い、それぞれ`migrateBookmarkEntry`/`migrateNoteEntry`/`migrateRecentVerseEntry`/`migrateRecentWordEntry`という個別の移行関数へmapする |
| unexpected value handling | `raw`が`null`または非オブジェクトの場合、`normalize()`は`defaultState()`（空配列群）をそのまま返す。個別エントリが`migrateXxxEntry()`で無効と判定された場合は`.filter(e => e)`により除去される。**この経路は直接`AppState`へは書き込まれない**（`app-storage.js`の`_state`という別モジュールの内部状態であり、`index.html`側の`AppState`とは別オブジェクト、FLOW-06-A確認済み） |

### External JSON → fetch() → Application objects

| 確認項目 | 結果 |
|---|---|
| 型変換 | `Response.json()`によりJSON文字列からJSオブジェクト/配列へ変換 |
| validation | bible_data取得時は`res.ok`チェックのみ確認された（FLOW-12-A/23-A）。取得したJSONの内部構造（フィールド有無・型）に対するスキーマ検証は本Phaseでは確認できなかった |
| unexpected value handling | `_loadReadingHints()`は`Array.isArray(arr) ? arr : []`という配列型チェックを持つ（FLOW-23-A確認済み）。他のfetch結果に対する同種の型チェックは、本Phaseの確認範囲では特定できなかった |

---

## 2. HTML Injection Boundary（FLOW-22-A補完）

| source | escape | destination |
|---|---|---|
| bible_data | **箇所により異なる**。`_renderReadingNotes()`の`${word}`/`${displayLabel}`、`WordOrderRenderer`の`${c.gloss}`は`_escH()`を**経由しない**ことを確認済み（FLOW-22-A）。章描画失敗時のエラーメッセージ内`${book}`/`${ch}`は`_escH()`を**経由する**（FLOW-12-A/18-A確認済み） | innerHTML |
| localStorage | `_listItemCard()`の`title`/`sub`/`meta`は`_escH()`を**経由する**。同関数の`href`は**経由しない**（コード内コメントで明記、FLOW-18-A確認済み） | innerHTML（`onclick`属性文字列を含む） |
| URL | `AppState.location`経由の`book`/`ch`がエラーメッセージ内で`_escH()`を経由することを確認（上記bible_data欄と同一箇所）。URLパラメータの値がinnerHTMLへ直接（`_escH()`を経由せず）埋め込まれる箇所は本Phaseでは確認できなかった | innerHTML |
| generated text（Wallace Reading Notes等の生成文） | 本Phaseでは`_buildWordResonanceText()`等の内部で`_escH()`が使われているかの個別確認は完了していない（「確認できなかった」） | innerHTML |

---

## 3. Storage Boundary

| 確認項目 | 結果 |
|---|---|
| 保存データ | `{version:1, bookmarks:[], notes:[], recentVerses:[], recentWords:[]}`（`defaultState()`、`app-storage.js:21-29`、FLOW-20-A確認済み） |
| 読み込み | `loadUserData()`が`localStorage.getItem(STORAGE_KEY)`→`JSON.parse()`→`normalize()`という順で処理（:115-122） |
| normalize | `normalize(raw)`は各配列フィールドに対し個別の`migrateXxxEntry()`関数を適用する（1.で確認済み） |
| version migration | `defaultState()`は`version:1`という固定値を持つが、**読み込み時（`normalize()`内）に`raw.version`の値を条件分岐に使う記述は確認できなかった**。マイグレーション判定は`version`番号ではなく、個別エントリの**値の型そのもの**（例: `migrateRecentVerseEntry()`が「文字列型なら旧形式、オブジェクト型なら新形式」と判定する、既存フェーズ確認済みのパターン）に基づいて行われることを確認した |

---

## 4. URL Boundary

| 確認項目 | 結果 |
|---|---|
| query parameter | `Router.parse()`が`book`/`ch`/`verse`/`panel`/`word`/`transA`/`transB`/`mode`の8パラメータを読み取る（1.参照） |
| import機能 | `_applyUrlImportIfPresent()`が`?import=`パラメータを`window.App.urlImport.parseBibleUrl(imported)`（`url-import-engine.js`）へ渡す。結果は通常のURL形式（`?book/?ch/?verse`）へ変換される（FLOW-18-A確認済み） |
| share URL | `ShareURLService.generate(state)`が`url.searchParams.set(key, value)`という形で8フィールドをURLへ書き込む（:4489-4501、本Phaseで新規確認） |
| encode/decode | `ShareURLService.generate()`の`url.searchParams.set()`、`Router.parse()`の`URLSearchParams.get()`は、いずれも**`URLSearchParams`標準APIによる自動encode/decode**に依存しており、アプリ側で独自のencode/decode処理を実装している箇所はこの2関数には確認できなかった。別文脈（`_listItemCard()`のhref生成、FLOW-18-A確認済み）では`encodeURIComponent()`が個別に使われている |

---

## 5. postMessage Boundary

| 確認項目 | 結果 |
|---|---|
| sender | **`postMessage(`という送信呼び出しは`index.html`内に0件**（本Phaseで新規確認）。このアプリはmessageイベントの**受信専用**であり、自ら他フレームへメッセージを送信する経路は確認できなかった |
| receiver | `window.addEventListener('message', (e) => {...})`（:7784-7793、FLOW-18-A確認済み） |
| type check | `if (!d || !d.type) return;`という存在チェックのみ。`d.type`の値は`'NAV_TO_MORPH'`/`'NAV_TO_SYNTAX'`/`'NAV_TO_SEMANTICS'`/`'GO_TO_VERSE'`という4値との一致判定で分岐する（厳密な型定義・スキーマ検証ではなく文字列比較） |
| origin check | `e.origin`の確認は**確認できなかった**（FLOW-18-A確認済み事実の再確認） |

---

## 完了条件

- [x] Input Source Boundary確認完了（URL/localStorage/External JSON）
- [x] HTML Injection Boundary確認完了（FLOW-22-A補完）
- [x] Storage Boundary確認完了（normalize/version migration含む）
- [x] URL Boundary確認完了（encode/decode方式含む）
- [x] postMessage Boundary確認完了（sender側の送信有無を新規確認）

---

コード・docs・コメントは変更していない。
改善提案は含めていない。
確認できた実装事実のみを記録した。
