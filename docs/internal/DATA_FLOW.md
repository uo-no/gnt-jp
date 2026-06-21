# DATA_FLOW.md

状態遷移のみを記載する。構造・依存関係はARCHITECTURE.md、機能の実装状態はFEATURE_MAP.mdを参照。

---

## 1. 状態オブジェクト一覧

| 状態 | ファイル | 永続化 |
|---|---|---|
| `AppState`（mode/selectedVerse/inspect/study/location/depth） | `index.html` | なし |
| `params`/`extState`/`coreOnState`/`scopeState`/`wordFilterMode`/`bookState` | `morph-search.html` | なし |
| `params`/`_tokens`/`_selectedIdx`/`_roleMap` | `syntax-search.html` | なし |
| `_layers`/`currentDist`/`_morphSel`/`_lastQuery` | `search-tool.html` | なし |
| onboarding進捗`_state` | `onboarding.js` | `localStorage`キー`app_onboarding` |
| 保存済み気づき | `onboarding.js` | `localStorage`キー`app_saved_insights`（最大30件） |

画面間の状態引き継ぎはURLクエリパラメータのみ。

---

## 2. index.html：初期ロード

```
location.search
 → Router.parse()
 → init() で book/ch/transA/mode 決定
 → fetch('./translations/{transId}/{book}/{ch}.json')
 → fetch('./bible_data/{nt|lxx}/{book}/{ch}.json')
 → render(jpData, elData, ...)
 → applyShareState(urlParams)
```

`render()`が構築するトークンマップは`_cachedElByVerse`としてモジュールスコープに保持される。

---

## 3. index.html：URL同期

```
節クリック / 単語クリック / StudyPanel開閉
 → AppStateのメソッド呼び出し（toBrowsing()等）
 → notifyAppStateChange()
 → syncUrlState()
 → getShareState()
 → ShareURLService.generate(state)
 → history.replaceState()
```

`window.__onboardingActive`が`true`の間、`syncUrlState()`内で同期は実行されない。

---

## 4. index.html：StudyPanel表示

```
語クリック（onWordCardClick / _wlvChipClick）
 → AppState.inspect.data に格納
 → showInspectPopover()
 → escalateToStudy()
 → openStudyPanel(greek, rawMorph, ref, lemma)
 → AppState.toStudy(params, 'notes')
 → _renderReadingNotes(params)（_ensureSemanticData() 完了待ち）
 → wallaceGrammarAdapter(params) → generateWallaceReadingProse()
 → #reading-notes-area へ出力
```

---

## 5. morph-search.html

```
location.search
 → getSearchParams()
 → ref指定時：該当章をfetch → patchParamsFromEntry()
 → word/lemma指定時：morph-index/ のインデックスをfetch（なければ全書物データ）
 → renderResults() → matchEntryFilters()
```

```
toggleCore()/toggleExt() 等の状態変更
 → syncURL()（new URLSearchParams() で再構築）
 → history.replaceState()
```

---

## 6. syntax-search.html

```
location.search
 → getParams()
 → BookMaster.pathFor()/fetchJSON()（該当1章のみ取得）
 → getVerseTokens(allData, ref)
 → renderAll(tokens, ref)
     → assignSyntacticRoles(tokens)
     → selectToken(autoIdx)
         → window._syntaxAnalyzer.analyze()
         → renderRoleHero()/renderCandidates()/renderWordOrder()
         → syncURL()
```

```
init() 内
 → fetchJaData([{key, ch}])
 → _jaMap へ格納
```

`_jaMap`を読み取る処理（`getJaVerse()`の呼び出し）は、この状態遷移の先に存在しない。

---

## 7. search-tool.html

```
location.search
 → initFromUrl()
 → _ensureFullIndex() 完了待ち
 → unifiedSearch()
     → lemma/phrase/prox/morph 各レイヤー実行（_layers に基づく）
     → globalIdx ベースでマージ
     → _renderUnifiedResults()
     → syncURL()
```

```
形態素チップクリック
 → _morphSel[slot] への add()/delete()
 → unifiedSearch() 再実行
 → syncURL()
     → _morphSel各スロット → Array.from(set)[0] のみを URLSearchParams に set()
```

---

## 8. データ変換点

| 変換 | 場所 |
|---|---|
| URLSearchParams ⇄ stateオブジェクト | 各画面の`Router.parse()`/`getParams()`/`getSearchParams()`/`initFromUrl()`、`ShareURLService.generate()`/`syncURL()` |
| 章JSON（トークン配列）→ 節別マップ | `index.html`の`render()`、`syntax-search.html`の`getVerseTokens()` |
| morph文字列 → 構造化オブジェクト | `decodeMorph()`（画面ごとに個別実装） |
| 統語解析結果 → 解説文 | `index.html`の`wallaceGrammarAdapter()`/`generateWallaceReadingProse()`、`syntax-analyzer.js`の`CandidateScorer`系 |

---

## 9. 未確認事項

- `morph-index/`の生成タイミング・更新手順は未確認。
- `_ensureSemanticData()`が取得するデータの内部処理は検証していない。
