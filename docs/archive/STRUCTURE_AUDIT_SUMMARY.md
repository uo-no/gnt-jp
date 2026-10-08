# FLOW Structure Audit Summary

対象アプリ: gnt-jp（ギリシャ語新約聖書・LXX閲覧Webアプリ）
対象ファイル: `public/index.html` を中心に `public/core/*.js`、`public/assets/js/*.js`
作成根拠: Phase FLOW-01-A〜FLOW-23-A（実装事実の機械的監査、grep/Readによる確認のみ、改善提案・評価を含まない）

---

## 1. Scope

対象: FLOW-01-A〜FLOW-23-A

監査対象境界:

- **Data Boundary**（FLOW-02-A, 04-A, 09-A, 15-A, 20-A）
- **Runtime Boundary**（FLOW-06-A, 10-A, 11-A, 13-A, 17-A, 19-A, 21-A）
- **Rendering Boundary**（FLOW-01-A, 03-A, 05-A, 07-A, 16-A, 22-A）
- **Failure Boundary**（FLOW-12-A, 18-A, 23-A）
- **Dead Code / Reachability**（FLOW-14-A）

各Phaseの詳細な対応関係は `STRUCTURE_AUDIT_DETAIL_INDEX.md` を参照。

---

## 2. System Architecture Overview

**正常経路**（FLOW-08-A / 16-A / 19-A / 22-A で確認）:

```
Raw Data（bible_data静的JSON）
   ↓ field読み取り（reference経由）
Analysis Pipeline
   ├─ Resolution経路: ReadingEngine.resolve()（Phase1-7 + K-3/L-3c/L-4c）
   └─ Analysis/Projection経路: SyntaxAnalyzer → PhraseAnalyzer → ClauseAnalyzer
      → ReadingSupportProjection
   （両経路はData直下で分岐し、View Model Layerに達するまで合流しない）
   ↓ field copy / 新規生成
View Model
   Flow Chip（_wordToFlowChip()、18フィールド）
   AppState.inspect.data（Flow Chipからのfield copy）
   Mobile Inspector d（AppState.inspect.dataからのfield copy）
   ↓ テンプレートリテラルによるHTML文字列生成
Rendering
   WordOrderRenderer / _renderReadingNotes() / _renderMobileWordDetail() /
   _buildPhraseReadingHTML() / _buildObservationHTML() 等
   ↓ innerHTML= / outerHTML= / textContent=
DOM
   reading-notes-area / #mobile-inspector-area / .verse-block / Flow Chip等
   ↓ inline onclick / addEventListener
User Interaction
   → イベントハンドラ（_wlvChipClick()等）→ State Mutation → 次サイクルへ
```

**Failure Path**（FLOW-12-A / 23-A で確認）:

```
External Failure（fetch失敗 / 例外 / 欠落データ）
   ↓
Catch Boundary
   45件のtry/catch境界のいずれかで捕捉。SyntaxAnalyzer/PhraseAnalyzer/
   ClauseAnalyzer自体は内部にtry/catchを持たず（0件確認）、
   呼び出し元index.html側の外側catchが唯一の捕捉点
   ↓
Fallback Value
   null / 空配列 / 空オブジェクト / 固定文字列
   ↓
Silent Recovery / User Visible Error
   大半は該当UI要素の非表示（静寂）。ユーザーへの明示的エラー表示は
   章描画失敗時の1箇所（#bible-text-areaへの赤字メッセージ）のみ確認
```

---

## 3. Data Boundary Summary

| Object | 定義箇所 | producer | consumer |
|---|---|---|---|
| `bible_data` token | 静的JSON | fetch結果 | Analysis/Resolution/View Model全般 |
| `ResolveResult` | `reading-engine.js` `resolve()` | ReadingEngine | `_wordToFlowChip()`（`.japanese`/`.source`のみ使用） |
| `Flow Chip` | `_wordToFlowChip()`（index.html） | 同関数 | `WordOrderRenderer`、`_wlvChipClick()` |
| `ClauseResult` | `clause-analyzer.js` `ClauseAnalyzer.analyze()` | ClauseAnalyzer | Wallace Reading Notes/Passage Note生成関数 |
| `AppState` | index.html内定義（プレーンオブジェクト） | 各イベントハンドラ | StudyPanel/Mobile Inspector等 |
| `localStorage`（`app_user_data`） | `app-storage.js` | `saveNote()`等 | メモ/ブックマーク/履歴UI |

**producer/consumer関係の要点**:
- token → ResolveResult → Flow Chip → AppState.inspect.data → Mobile Inspector d という一連のコピー境界が確認され、いずれも**field copy**（オブジェクト全体のspread/Object.assignではなく個別フィールド代入）で構成される。

**field rename（Schema Drift、FLOW-20-A確認）**:
- `japanese`（producer側名称）→ `jaWord`（consumer側名称）という一貫した改名。
- `morph`（bible_data側）→ `rawMorph`／`morphText`という2つの派生フィールド名に分岐。
- `gloss`という同一フィールド名が、①`bible_data.gloss`（未使用）と②`chip.gloss`（`japanese`由来の別概念）という**無関係な2系統**として存在する。

**unused field**:
- `bible_data.gloss`（consumer確認できず、FLOW-20-A）
- `chip.signals`（生成されるが表示先確認できず、FLOW-03-A/14-A）
- `ResolveResult.confidence`／`.candidates`（型定義のみ、値設定箇所確認できず、FLOW-04-A/14-A/20-A）
- `relativeSyntax.role`／`demonstrativeSyntax.role`（付帯されるが下流で未読、FLOW-04-A）
- `bible_data.frame`（実装コード0件、FLOW-46系のESM監査で既確認）

**type boundary**:
- JSON→JS: `Response.json()`経由（`JSON.parse()`直接呼び出しはindex.html内0件、FLOW-18-A）
- JS→Storage: `JSON.stringify()`
- JS→URL: `URLSearchParams`／`encodeURIComponent()`

---

## 4. Runtime Lifecycle Summary

**Bootstrap sequence**（FLOW-19-A/21-A確認）:
```
<script>群の同期実行（shared-ui.js → core/*.js 9ファイル → app-config.js →
app-storage.js → shared-insight.js(defer) → onboarding.js）
   ↓
window.App.bridge構築（インラインscript、DOMContentLoaded前）
   ↓
DOMContentLoadedイベント発火
   ↓
window.App.onboarding.init() → _syncOnboardingActiveFlag() → init()
```

**init()内部シーケンス**（FLOW-21-A確認）:
URL Import処理 → アイコン挿入 → Reading Hint読込 → `Router.parse()` →
`AppState.location`設定 → `loadDict()`（await） → 翻訳/bible_data fetch（await） →
`render()` → `applyShareState()`

**User interaction lifecycle**（FLOW-10-A/17-A/21-A確認）:
click（inline onclick／`.onclick=`／`addEventListener`の3方式が混在）→
State Mutation（`AppState.inspect.data`等の完全代入）→ Rendering呼び出し →
DOM Mutation → （一部）非同期補完（generation counterによるstale結果破棄）

**Object lifetime**（FLOW-09-A/15-A/21-A確認）:
- 生成後のフィールド単位ミューテーションは、対象オブジェクト（token/ResolveResult/Flow Chip/ClauseResult/Projection）について機械的全文検索で**確認できなかった**（`AppState.depth.stack.push()`のみが唯一の生成後追加操作）。
- 4種キャッシュ（`_verseResolveCache`／`_wallaceClauseCache`／`_wlvChipCache`／`_wlvWordCache`）はいずれも`words`配列の**参照等価（`===`）**のみで一致判定し、**replace方式**（オブジェクト全体の再代入）で更新される。

**Navigation lifecycle**（FLOW-11-A/21-A確認）:
章移動時、`AppState`の7項目（`mode`/`selectedVerse`/`inspect.data`/`study.params`/`study.tab`/`scrollTop`/`depth`）が一括resetされる。**4種キャッシュへの明示的クリア処理は確認できなかった**（次回の`words`参照不一致による間接的な再構築のみ）。

---

## 5. Rendering Boundary Summary

**Rendering functions**（FLOW-05-A/07-A/16-A確認）: `WordOrderRenderer`（3メソッド）／`_renderReadingNotes()`／`_renderMobileWordDetail()`／`_buildPhraseReadingHTML()`／`_buildObservationHTML()`／`_buildWallacePassageNoteHTML()`等。うち`_renderMorphTab`系6関数・`_buildGreekTabHTML`・`_fillWlvResonance`は呼び出し元0件（FLOW-05-A/07-A/14-A確認）。

**DOM mutation方式**（FLOW-16-A/22-A確認）: `classList`操作98件、`style`操作74件、`appendChild`25件、`.remove()`7件が機械的件数集計で確認された（`replaceWith`/`.append(`は0件）。

**innerHTML boundary**（FLOW-16-A/18-A/22-A確認）: 主要6箇所（`#word-list-view`／`reading-notes-area`／`#mobile-inspector-area`／`.verse-block`／`.gf-verse-block`／`#wlv-passage-note-slot`）でいずれも全面置換方式。`_escH()`エスケープは箇所により経由・非経由が混在することを確認した（`_renderReadingNotes()`の`${word}`/`${displayLabel}`、Flow Chipの`${c.gloss}`は非経由。エラーメッセージの`${book}`/`${ch}`、`_listItemCard()`の`title`/`sub`/`meta`は経由。`opts.href`は非経由、コード内コメントに明記あり）。

**textContent boundary**（FLOW-16-A確認）: Drawer3要素／`#mvv-reading-slot`／`#mvv-semantic-slot`が該当。いずれもHTML解釈されない値表示経路であることを構造上確認した。

**DOM ownership**: 主要DOM領域はいずれも単一のcreator/updater関数によって管理され、複数関数が同一領域を独立に書き換える経路は確認されなかった。

**hidden reference**（FLOW-09-A/13-A/16-A確認）: `block._flowChips`／`.gfEl._flowChips`／`._flowWords`／`._flowResolved`というDOM要素への非標準プロパティ付与を確認。明示的な削除処理（`delete`）は確認できず、親要素の`innerHTML`置換に伴う間接消滅のみ確認された。

---

## 6. Failure Boundary Summary

**try/catch inventory**（FLOW-23-A確認）: `index.html`全体で`try{}`45件、`catch()`45件（対応一致）、`finally`0件。`core/*.js`のうち`SyntaxAnalyzer`／`PhraseAnalyzer`／`ClauseAnalyzer`は内部に`try/catch`0件（FLOW-12-A確認）。

**async failure handling**（FLOW-17-A/23-A確認）: `_ensureSemanticData()`は多重実行防止フラグ＋個別`res.ok`フォールバック＋外側catchの二重防御。`_ensureWallacePipeline()`は失敗時`_wallacePipelineFailed=true`という恒久フラグを立て以後再試行しない。

**fetch failure handling**: 大半が`res.ok`チェックまたは`try/catch`による`console.warn`のみの処理で、UIへの明示的反映は伴わない。

**fallback pattern**: `null`／空配列／空オブジェクト／固定文字列という4種のフォールバック値が、モジュールをまたいで共通の慣習として使われていることを確認した（FLOW-12-A/23-A）。

**silent failure pattern**: `return null`パターンがReading Engine／Wallace Pipeline／Referent・Subjref Evidence／chip取得系という独立した複数モジュールに共通して存在する。

**user-visible error path**: 本監査シリーズ全体を通じて、明示的なユーザー向けエラー表示は**章描画失敗時の1箇所**（`#bible-text-area`への赤字メッセージ）のみ確認された。他はすべて静寂（非表示）またはconsole出力のみ。

---

## 7. Confirmed Design Characteristics

※評価ではなく、機械的確認によって得られた事実の記録

- null fallbackによる処理継続経路が、Reading Engine・Wallace Pipeline・キャッシュ取得系など複数モジュールで共通パターンとして存在する。
- UI更新は`innerHTML`／`textContent`／`classList`操作／`style`操作という4方式で構成され、`replaceWith`や`insertBefore`等の他DOM APIの使用は確認できなかった。
- 4種モジュールレベルキャッシュはいずれも`words`配列の参照等価（`===`）による一致判定で、生成後の部分書き換えではなく全体replace方式によって更新される。
- 章移動・パネルクローズ等の状態遷移で、`AppState`は複数フィールドの一括resetが実行されるが、モジュールレベルキャッシュへの明示的cleanupは確認できなかった。
- Flow Chip・ResolveResult・ClauseResult・Projectionは、生成後にフィールド単位で書き換えられる箇所が機械的全文検索で確認できなかった（`AppState.depth.stack.push()`が唯一の生成後追加操作として確認された）。
- イベント接続方式はinline onclick属性・`.onclick=`プロパティ代入・`addEventListener`の3種が併存し、対象領域（複数節同時表示か単一節表示か等）によって使い分けられている。
- `SyntaxAnalyzer`／`PhraseAnalyzer`／`ClauseAnalyzer`という3つのAnalysis Layerモジュールは内部に`try/catch`を持たず、例外処理は呼び出し元（index.html側）の外側`try/catch`に一元化されている。
- `reading-japanese-builder.js`は`<script src>`による読み込みが確認できず、ブラウザ実行時には到達しない状態にある。
- `StudyPanelAdapter`／`AnnotationMapper`（`clause-analyzer.js`内で定義）は、`index.html`からの参照が確認できなかった。

---

## 8. Audit Completion Status

FLOW-01-A〜FLOW-23-A 完了
