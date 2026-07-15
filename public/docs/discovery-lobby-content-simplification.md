# UX-10.8-B — Discovery Lobby Content Simplification

**実施日**: 2026-07-15  
**変更範囲**: `search-tool.html`（HTML 13行削除 + JS 4行変更）  
**根拠**: UX-10.8 Content Audit — E-03 MOVE / E-04 REMOVE / E-05 REMOVE

---

## 目的

Discovery Lobby を「検索機能一覧」から「聖書を読み始める静かな入口」へ整理する。  
機能削除ではなく責務移動。検索ロジックは一切変更しない。

---

## 変更内容

---

### E-04 REMOVE — 例セクション（dead element）

**対象**: `#empty-examples-section`

```diff
-        <div id="empty-examples-section" style="display:none;margin-top:var(--space-lg);">
-            <div class="empty-section-label">例</div>
-            <div class="empty-examples">
-                <span class="ex-chip" onclick="_exampleSearch('ἀγαπάω')">ἀγαπάω</span>
-                <span class="ex-chip" onclick="_exampleSearch('πιστεύω')">πιστεύω</span>
-                <span class="ex-chip" onclick="_exampleSearch('G3056')">G3056</span>
-            </div>
-        </div>
```

**理由**: 表示するコードが存在しない dead element。仮に表示してもギリシャ語・番号例は DS-DISCOVERY-01 違反。

---

### E-05 REMOVE — テーマから探すセクション

**対象**: `#concept-discovery-section`（見出し + 説明文 + concept chips）

```diff
-        <div id="concept-discovery-section" style="display:none;margin-top:var(--space-xl);">
-            <div class="empty-section-label">テーマから探す</div>
-            <div style="...">聖書の大切なテーマから探すことができます</div>
-            <div class="empty-examples" id="concept-discovery-chips"></div>
-        </div>
```

**理由**:
- Discovery Theme chip と「テーマ語クリック → 検索」が重複する
- 「テーマから探す」「聖書の大切なテーマから探すことができます」は説明文 → DS-DISCOVERY-01 違反
- 最終状態: テーマ語そのものが入口になる

**JS 側**: `_renderConceptDiscoveryChips()` はそのまま存在する。DOM 要素が消えたため `if(!sec) return` で即時終了する（エラーなし）。

---

### E-03 MOVE — 最近の検索 → 検索入力フォーカス時

**概要**: 「最近の検索」セクションをページロード時ではなく、検索入力フォーカス時に表示する。

#### JS変更 1: `_loadHistory()` — ロード時の表示を停止

```diff
     } catch(_) {}
     _renderHistory();
-    _renderEmptyStateHistory();
 }
```

#### JS変更 2: `_addHistory()` — 検索追加時の表示を停止

```diff
     _saveHistory();
     _renderHistory();
-    _renderEmptyStateHistory();
 }
```

#### JS変更 3: `_initSuggest()` — フォーカス/ブラー ハンドラ追加

```diff
 function _initSuggest(){
     const inp=document.getElementById('unified-search-input');
     inp.addEventListener('input',()=>{...});
+    inp.addEventListener('focus',()=>_renderEmptyStateHistory());
-    inp.addEventListener('blur',()=>setTimeout(()=>document.getElementById('suggest-dropdown').classList.remove('open'),150));
+    inp.addEventListener('blur',()=>{
+        setTimeout(()=>document.getElementById('suggest-dropdown').classList.remove('open'),150);
+        setTimeout(()=>{const s=document.getElementById('history-recent-section');if(s)s.style.display='none';},150);
+    });
     inp.addEventListener('keydown',e=>{...});
 }
```

**動作**:
- ページロード: 履歴セクション非表示（初期 `display:none` のまま）
- 検索入力フォーカス: `_renderEmptyStateHistory()` が呼ばれ、履歴があれば表示
- 検索入力ブラー: 150ms 後に履歴セクション非表示（チップクリック操作を妨げない delay）
- 履歴データ保存/復元ロジック: 変更なし

---

## 変更後の `#state-empty` 構造

```html
<div class="state-empty" id="state-empty">
    <!-- Discovery Lobby: 常時表示 -->
    <div id="discovery-lobby">
        <h2 class="discovery-title">今日は、<br>どんなことばを読みますか？</h2>
        <div class="discovery-themes"></div>
    </div>
    <!-- エラー時フォールバック: _showEmpty() 時のみ -->
    <div class="empty-glyph" style="display:none">λόγος</div>
    <div class="empty-title" style="display:none">聖書を検索する</div>
    <div class="empty-desc" style="display:none">日本語・ギリシャ語・Strong番号で検索できます</div>
    <!-- 最近の検索: 入力フォーカス時のみ表示 -->
    <div id="history-recent-section" style="display:none;margin-top:var(--space-lg);">
        <div class="empty-section-label">最近の検索</div>
        <div class="empty-examples" id="history-recent-chips"></div>
    </div>
    <!-- 文法パターン: (E-06 — 本フェーズ対象外) -->
    <div id="pattern-search-section" style="display:none;margin-top:var(--space-xl);">
        <div class="empty-section-label">文法パターン</div>
        <div class="layer-chips" id="pattern-chips"></div>
    </div>
</div>
```

---

## 設計制約の遵守確認

| 制約 | 確認 |
|------|------|
| unifiedSearch 変更禁止 | ✅ |
| resolveTerm / resolveConcept 変更禁止 | ✅ |
| Knowledge Graph 変更禁止 | ✅ |
| Pattern Engine / runPatternSearch 変更禁止 | ✅ |
| Wallace Engine 変更禁止 | ✅ |
| StudyPanel 変更禁止 | ✅ |
| Discovery Theme resolver 変更禁止 | ✅ |
| 検索結果 UI 変更禁止 | ✅ |
| 検索履歴データ・保存処理変更禁止 | ✅ |

---

## 検証結果（Playwright / localhost:8765）

### Desktop 1280×800

| 確認項目 | 結果 | 実測 |
|---------|------|------|
| IDX.l3Ready | ✅ | — |
| Discovery Lobby 表示 | PASS ✅ | — |
| テーマ4件表示 | PASS ✅ | 忍耐 / 信仰 / 希望 / 証し |
| E-04: `#empty-examples-section` 消滅 | PASS ✅ | DOM に存在しない |
| E-05: `#concept-discovery-section` 消滅 | PASS ✅ | DOM に存在しない |
| E-03: ロード時に履歴セクション非表示 | PASS ✅ | `display:none` |
| E-05a: 説明文テキスト消滅 | PASS ✅ | `innerText` に存在しない |
| chip クリック → 検索起動 | PASS ✅ | 92件（忍耐 NT78+LXX14）|
| 回帰: 愛 631件 | PASS ✅ | `631 件` |
| 回帰: 罪 1,009件 | PASS ✅ | `1,009 件` |
| 回帰: ἀγαπάω 353件 | PASS ✅ | `353 件` |
| console errors | PASS ✅ | 0件 |
| E-03: 入力フォーカスで履歴表示 | PASS ✅ | `display:''`（履歴あり時）|

### Mobile 390×844

| 確認項目 | 結果 | 実測 |
|---------|------|------|
| Discovery Lobby 表示 | PASS ✅ | — |
| tap target ≥44px | PASS ✅ | **54px** |
| 横スクロールなし | PASS ✅ | — |
| concept-discovery-section 消滅 | PASS ✅ | DOM に存在しない |
| ロード時に履歴セクション非表示 | PASS ✅ | — |
| chip クリック → 検索 | PASS ✅ | 92件 |
| console errors | PASS ✅ | 0件 |

---

## Discovery Lobby 最終状態

```
今日は、
どんなことばを読みますか？

忍耐

信仰

希望

証し
```

4語のみ。説明なし。ラベルなし。セクションなし。

---

## 残存 IMPROVE（本フェーズ対象外）

| ID | 内容 | 状態 |
|----|------|------|
| E-06 | 文法パターン → 検索結果下部 へ移動 | 持越し（`#pattern-search-section` は残存）|

---

## 成果物

| ファイル | 変更 |
|---------|------|
| `search-tool.html` L1430–1442 | `#empty-examples-section` + `#concept-discovery-section` 削除（13行）|
| `search-tool.html` `_loadHistory()` | `_renderEmptyStateHistory()` 呼び出し削除（1行）|
| `search-tool.html` `_addHistory()` | `_renderEmptyStateHistory()` 呼び出し削除（1行）|
| `search-tool.html` `_initSuggest()` | focus/blur ハンドラ追加（3行）|
| `docs/discovery-lobby-content-simplification.md` | 本ドキュメント |
