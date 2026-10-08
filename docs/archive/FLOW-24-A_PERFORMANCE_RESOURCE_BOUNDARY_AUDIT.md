# Phase FLOW-24-A Report — Performance / Resource Boundary Audit

FLOW-01-A〜FLOW-23-Aの実装事実、および本Phaseでの追加確認（`assets/data/`／`bible_data/`の実ファイルサイズ計測、`_ensureSemanticData()`の起動タイミング、`render()`呼び出し箇所の直接検証）に基づく。コード・docs・コメントは変更していない。評価表現・改善提案・推測は含まない。

---

## 1. Scope

対象: `public/index.html`、`public/core/*.js`、`public/assets/data/*`、`public/bible_data/*`

FLOW-01-A〜FLOW-23-Aで確認済みの実装事実を前提とし、本Phaseでは実行時のリソース量（ネットワーク・メモリ・DOM・レンダリング）に焦点を当てて追加確認した。

---

## 2. Initial Load Audit

**HTMLロードからinit()完了までの経路**（FLOW-19-A/21-Aで確認済みの内容を本Phaseで再確認）:
```
HTML load
 ↓
<script>群の同期実行（18ファイル、shared-ui.js → core/*.js 9ファイル →
  reading-lexicon-data.js/reading-semantic-data.js/reading-ln-final-data.js →
  app-config.js → app-storage.js → shared-insight.js(defer) → onboarding.js）
 ↓
window.App.bridge構築（インラインscript内）
 ↓
DOMContentLoadedイベント発火
 ↓
window.App.onboarding.init() → _syncOnboardingActiveFlag() → init()
 ↓（同時に、DOMContentLoaded内の別行で）
_ensureSemanticData().catch(function(){})（:12771、awaitされないfire-and-forget起動）
```

**script読み込み順**: FLOW-19-A確認済み（全18件、`defer`属性は`shared-insight.js`の1件のみ、`async`属性0件、重複読込0件）。

**初期fetch一覧と開始タイミング**:

| resource | trigger | timing | await有無 |
|---|---|---|---|
| `reading-lexicon-data.js`／`reading-semantic-data.js`／`reading-ln-final-data.js` | `<script src>` | HTML解析時（同期） | 該当なし（scriptタグ自体がブロッキング） |
| `abbott-smith.tsv`（約4.9MB） | `loadDict()` | `init()`内 | **awaitされる**（`await loadDict()`、FLOW-21-A確認済み） |
| 翻訳データ（`_fetchTranslation`） | `init()`内 | `loadDict()`完了後 | awaitされる |
| `bible_data/{testament}/{book}/{ch}.json` | `init()`内 | 翻訳データ取得後 | awaitされる（内側try/catchで保護） |
| `lexicon-lite.json`（約3.1MB）等5ファイル | `_ensureSemanticData()` | DOMContentLoaded内、`init()`と**並行して**起動 | **awaitされない**（`.catch(function(){})`のみ、fire-and-forget） |
| `syntax-registry.json`等4ファイル（Wallace） | `_ensureWallacePipeline()` | Wallace系機能（Reading Notes等）が初めて要求された時点 | 該当箇所内でawaitされる（ページロード時には起動しない） |
| `reading-hints.json` | `_loadReadingHints()` | `init()`内 | 該当箇所内でawaitされる（`init()`内の他処理とは別行） |
| `roadmap.json`／`changelog.json` | `showRoadmap()`／`showChangelog()` | ユーザーが該当画面を開いた時点 | awaitされる（ページロード時には起動しない） |

**fire-and-forget処理**: `_ensureSemanticData()`（起動直後）、`_fillMvvReadingSlot()`／`_fillMvvSemanticSlot()`／`_fillWallacePassageNote()`（いずれもUI操作後の非同期補完、FLOW-17-A確認済み）。

**failure handling**: FLOW-23-A確認事実を参照。`abbott-smith.tsv`取得失敗時は`console.error`のみで`init()`シーケンス自体は継続する（`loadDict()`内`if (!resAbbott.ok) return;`という早期リターン）。

---

## 3. Network Resource Audit

| resource | caller | timing | awaited | cache | failure |
|---|---|---|---|---|---|
| translation data | `_fetchTranslation()` | `init()`内 | あり | 確認できなかった（fetchごとに新規リクエストと推定されるが、ブラウザHTTPキャッシュ以外のアプリ内キャッシュ機構は本Phaseでは特定できなかった） | `throw new Error`→外側catch（FLOW-12-A確認済み） |
| `bible_data/{testament}/{book}/{ch}.json` | 章描画関数 | 同上 | あり | `_verseResolveCache`等が`words`参照単位で保持するが、fetch結果自体の再利用キャッシュは確認できなかった（章移動のたび新規fetch） | 内側`try/catch`、`console.warn`のみ |
| `lexicon-lite.json`／`domains-ln-index.json`／`domains-cluster-index.json`／`lexicon-composition.json`／`semantic-domain-labels.json` | `_ensureSemanticData()` | ページロード直後（fire-and-forget） | `Promise.all`内でawait | モジュールレベル変数（`_lexiconData`等）に保持、`_ensureSemanticData()`冒頭の存在チェックにより2回目以降はfetchされない | 個別`res.ok`フォールバック＋外側catch（FLOW-23-A確認済み） |
| `syntax-registry.json`／`phrase-registry.json`／`clause-registry.json`／`reading-policy.json` | `_ensureWallacePipeline()` | Wallace機能初回要求時 | `Promise.all`内でawait | `_wallacePipeline`に保持、2回目以降は`if (_wallacePipeline \|\| _wallacePipelineFailed) return`によりfetchされない | 外側catch、`_wallacePipelineFailed`恒久フラグ |
| `abbott-smith.tsv`（約4.9MB） | `loadDict()` | `init()`内 | あり | `abbottSmithDict`変数に保持、`loadDict()`の再呼び出し箇所は本Phaseでは確認できなかった（章移動のたび再呼び出しされるかは未確認） | `console.error`のみ |
| `reading-hints.json` | `_loadReadingHints()` | `init()`内 | あり | `_readingHintIndex`（`if (_readingHintIndex) return;`という存在チェックあり） | 空Mapフォールバック |
| `roadmap.json`／`changelog.json` | 各表示関数 | ユーザー操作時 | あり | 確認できなかった | `console.warn`のみ |

---

## 4. Memory Resource Audit（FLOW-21-Aとの差分: 保持量・増加可能性）

| Object | creation point | retention location | replacement condition | release path | 保持量・増加可能性 |
|---|---|---|---|---|---|
| bible_data token配列 | 章描画時のfetch結果 | `elByVerse`（章描画関数のローカル変数、章ごとに`{}`から再構築） | 次の章描画実行時 | 明示的解放は確認できなかった（GC依存） | 章単位でのみ保持（全巻を一括保持する構造は確認できなかった。JHN1章で約701KBのJSONが1回分のみメモリ上に存在すると推定される） |
| translation data | `_fetchTranslation()`結果 | `jpData`/`jpDataB`（章描画関数のローカル変数） | 次の章描画実行時 | 同上 | 章単位 |
| `ResolveResult`配列 | `_getVerseResolved()` | `_verseResolveCache.resolved`（節単位の配列） | `words`参照不一致時（FLOW-11-A確認済み） | 明示的解放は確認できなかった | **節単位**（章全体ではなく、直近にアクセスされた1節分のみ保持する設計、`_verseResolveCache`が単一スロットであるため） |
| `SyntaxAnalyzer`/`PhraseAnalyzer`出力 | `_getWallaceClauseAnalysis()`内ローカル変数 | 保持されない（`clauseResults`/`projection`の生成に消費されて消える、FLOW-04-A/20-A確認済み） | 該当なし（毎回破棄） | 関数スコープ終了時 | 増加要因にならない（都度使い捨て） |
| `ClauseResult`／`Projection` | 同上 | `_wallaceClauseCache`（節単位、単一スロット） | `words`参照不一致時 | 明示的解放は確認できなかった | 節単位（`_verseResolveCache`と同型の単一スロット保持） |
| `_wlvChipCache`／`_wlvWordCache` | StudyPanel/Mobile一覧描画時 | モジュールレベル変数（配列） | 対応する描画関数の再実行時 | 明示的解放は確認できなかった | 節単位（表示中の1節分のchip/word配列のみ） |
| `abbottSmithDict` | `loadDict()` | モジュールレベル変数 | `loadDict()`再呼び出し時（呼び出し頻度は本Phaseでは未確認） | 明示的解放は確認できなかった | 辞書全体（約4.9MBのtsv由来データ）を単一オブジェクトとして保持し続ける構造を確認した |
| `_lexiconData`等5変数（`_ensureSemanticData`） | 同関数 | モジュールレベル変数 | 再fetchされない（初回のみ、既述） | 明示的解放は確認できなかった | 5ファイル分（約3.1MB+αのJSON）をページ全体のライフタイムにわたり保持し続ける構造を確認した |

**保持量に関する確認できた事実**: `_verseResolveCache`／`_wallaceClauseCache`／`_wlvChipCache`／`_wlvWordCache`はいずれも**単一スロット**（直近1件のみを保持する構造、`{words, ...}`という形で過去の節のデータを配列やMapとして蓄積する構造ではない）であることを確認した。一方`abbottSmithDict`と`_lexiconData`等（`_ensureSemanticData`系）は、一度ロードされると**ページ全体のライフタイム中、解放されずに保持され続ける**ことを確認した。

---

## 5. DOM Resource Audit

| component | creation | update | removal |
|---|---|---|---|
| `.verse-block` | 章描画ループ内`document.createElement('div')`（章内の節数分、繰り返し生成） | `block.innerHTML=`（Flow Chip群を含むHTML文字列を注入） | `app.innerHTML=''`（次の章描画時、既存の全`.verse-block`が一括除去） |
| Flow Chip（`.wlv-chip`） | `.verse-block`のHTML文字列内に含まれる形で生成（節内語数分） | `classList.add/remove('active')`（クリック時のみ） | 親`.verse-block`の除去に伴い連動して除去 |
| StudyPanel（`reading-notes-area`内） | `_renderReadingNotes()`実行のたびに新規HTML文字列で全置換 | 同上（再描画のたび全置換、部分更新は確認できなかった） | 次の`_renderReadingNotes()`実行時 |
| Mobile Inspector（`#mobile-inspector-area`内） | `_renderMobileVerseArea()`／`_mobileInspectorDetail()`実行のたびに全置換 | 同上 | 同上 |

**確認できた事実**: 章内の節数・語数に比例して`.verse-block`要素数・Flow Chip要素数が増加する構造であることを確認した（1節あたりのFlow Chip数は節内トークン数に一致、FLOW-02-A確認済みの`tokens.map()`構造から）。具体的な章あたりの平均節数・語数の統計値は本Phaseでは算出していない。

---

## 6. Rendering Cost Boundary

| 関数 | 呼び出し回数（確認できた箇所数） | DOM全置換か部分更新か | state依存 | cache利用 | async処理有無 |
|---|---|---|---|---|---|
| `render()`（章全体描画） | **2箇所**（:8771／:12063、`init()`側と`renderCurrentPage()`側） | 全置換（`app.innerHTML=''`後に再構築） | 引数経由（`AppState`直接参照は本Phaseでは確認できなかった） | `_verseResolveCache`等を間接的に利用（`getAnalysis()`経由） | 呼び出し元（`init()`）はasyncだが`render()`自体の関数定義がasyncかは本Phaseでは個別確認していない |
| `WordOrderRenderer`（3メソッド） | 章内節数分、各節ごとに1回ずつ呼ばれる構造（FLOW-02-A確認済みの`tokens.map()`とは別の、節単位でのRenderer呼び出し） | 全置換（HTML文字列を返すのみ、部分更新の仕組みは確認できなかった） | 確認できなかった（`representation`引数のみ、FLOW-06-A確認済み） | 利用しない（`representation`は呼び出し元が事前に構築済み） | 無し（同期関数） |
| `_renderReadingNotes()` | StudyPanelが開かれるたび、および同一パネル内での語切替のたびに1回 | 全置換（`area.innerHTML=`） | `AppState.inspect.data`（FLOW-16-A確認済み） | `_wallaceClauseCache`を間接利用（`_buildWordResonanceText()`等経由） | あり（`async function`） |
| `_renderMobileVerseArea()` | Mobile一覧表示のたびに1回 | 全置換 | `AppState.location`（本Phaseでは個別行までは未追跡） | `_verseResolveCache`（`getAnalysis()`経由） | あり |
| `_mobileInspectorDetail()` | Mobile詳細表示のたびに1回 | 全置換 | `AppState.inspect.data` | 確認できなかった（この関数自体はcacheへ直接アクセスしない、FLOW-22-A確認済み） | 同期処理本体＋後続の非同期補完（`_fillMvvReadingSlot()`等）に分離 |

---

## 7. Async Resource Boundary

| 対象 | Promise生成箇所 | 同時実行制御 | generation guard | stale result破棄 | abort controller有無 |
|---|---|---|---|---|---|
| `_fillMvvReadingSlot()` | `_mobileInspectorDetail()`後、awaitされず起動 | 確認できなかった（同時に複数回起動された場合の排他制御は無し、generation guardのみが後続の反映を制御） | あり（`_mvvReadingGen`） | あり（`myGen !== _mvvReadingGen`でreturn） | **0件**（FLOW-17-A確認済み） |
| `_fillMvvSemanticSlot()` | 同上 | 同上 | あり（`_mvvSemanticGen`） | あり | 0件 |
| `_ensureSemanticData()` | ページロード時（fire-and-forget）＋StudyPanel/Mobile Inspector等からの複数呼び出し | **あり**（`_lexiconLoading`フラグ＋`setInterval`ポーリング待機、FLOW-23-A確認済み。同時に複数呼び出されても実際のfetchは1回のみ実行される構造） | 該当なし（generation counterではなくロード完了フラグによる制御） | 該当なし | 0件 |
| `_ensureWallacePipeline()` | Wallace系関数の初回呼び出し時 | `_wallacePipeline`/`_wallacePipelineFailed`という状態フラグにより、初回呼び出し以降は即座に既存値を返す（ただし初回呼び出しが複数同時発生した場合の排他制御＝ローディング中フラグは確認できなかった。`_ensureSemanticData()`の`_lexiconLoading`のような専用フラグは`_ensureWallacePipeline()`には確認できなかった） | 該当なし | 該当なし | 0件 |

---

## 8. Large Data Handling

| 確認項目 | 結果 |
|---|---|
| JSONサイズ（代表値、本Phaseで実測） | `bible_data/nt`全体: 113MB／`bible_data/lxx`全体: 263MB／MAT1章: 約369KB／JHN1章: 約701KB／`abbott-smith.tsv`: 約4.9MB／`lexicon-lite.json`: 約3.1MB／`reading-lexicon-data.js`: 約624KB／`syntax-registry.json`: 約603KB／`reading-ln-final-data.js`: 約421KB |
| lazy load有無 | `bible_data`は**章単位のJSONファイル分割**により、章描画時に該当章のみfetchされる構造を確認した（全巻113MB/263MBを一括ロードする経路は確認できなかった）。Wallace registry（4ファイル）は初回利用時まで遅延される。`_ensureSemanticData()`系5ファイルはページロード直後に開始されるがawaitはされない |
| chapter単位load | 確認した（`../bible_data/${testament}/${book}/${ch}.json`という章単位のURL構造） |
| 全体保持箇所 | `abbottSmithDict`（辞書全文、約4.9MB由来）と`_lexiconData`等5変数（`_ensureSemanticData`系、約3.1MB+α由来）は、一度ロードされるとページ全体のライフタイム中保持され続けることを確認した。bible_data/translation dataは章単位のみ保持（前章のデータは新しい章描画時に変数が上書きされる） |
| 重複保持箇所 | `_verseResolveCache.resolved`（ResolveResult配列）と`_wallaceClauseCache.clauseResults`/`.projection`は、同じ節（同じ`words`参照）に対して**別々の解析結果を並行して保持**する構造を確認した（両キャッシュは独立して`words`参照比較を行うため、同一節に対して2つの異なるキャッシュオブジェクトが同時に存在しうる）。`_wlvChipCache`と`block._flowChips`/`gfEl._flowChips`も、同一節のFlow Chip配列が複数の保持場所（グローバル変数とDOM property）に同時に存在しうることを確認した（FLOW-09-A/11-A確認事実の再整理） |

---

## 9. Final Performance Boundary Diagram

**Resource Loading**:
```
External Assets
   （bible_data: 章単位JSON／translation: 章単位JSON／
    lexicon-lite等5ファイル: 起動時fire-and-forget／
    Wallace registry4ファイル: 遅延ロード／abbott-smith.tsv: 起動時await）
   |
   ↓ fetch / Response.json() or .text()
Fetch / Parse
   |
   ↓ AppState.location等への反映、変数への格納
Application State
   |
   ↓ resolve()呼び出し、Wallace pipeline実行
Analysis Cache
   （_verseResolveCache／_wallaceClauseCache: 節単位単一スロット／
    abbottSmithDict／_lexiconData等: ページ全体保持）
   |
   ↓ field copy、HTML文字列生成
Rendering
   （render()／WordOrderRenderer／_renderReadingNotes()等、
    いずれも全置換方式）
   |
   ↓ innerHTML= 等
DOM
   （章内節数・語数に比例したverse-block／Flow Chip要素）
```

**Memory Lifetime**:
```
Creation
   （fetch完了時、または各種_build*/_render*関数の呼び出し時）
   |
Retention
   （節単位: _verseResolveCache等の単一スロット／
    ページ全体: abbottSmithDict・_lexiconData等）
   |
Replacement
   （words参照不一致時のreplace方式、または章移動時の
    AppState一括reset）
   |
Release
   （明示的な解放処理は限定的。章移動・DOM置換に伴う
    間接的な参照消失がGCに委ねられる経路のみ確認できた）
```

---

## 10. Completion Status

- [x] Initial Load Boundary確認完了
- [x] Network Resource Audit完了
- [x] Memory Lifetime Audit完了（FLOW-21-Aとの差分＝保持量・増加可能性を含む）
- [x] DOM Resource Audit完了
- [x] Rendering Cost Boundary確認完了
- [x] Async Resource Boundary確認完了
- [x] Large Data Handling確認完了
- [x] Final Performance Boundary Diagram作成完了

FLOW-24-A 完了

---

コード・docs・コメントは変更していない。
評価表現・改善提案・推測は含めていない。
確認できた実装事実のみを記録した。
