# UX-10.8-D — Grammar Pattern Result Placement Implementation

**実施日**: 2026-07-14  
**変更範囲**: `search-tool.html`（HTML 12行変更 + JS 15行変更）  
**根拠**: UX-10.8-C Grammar Pattern Placement Audit — 候補 B（検索結果後）採用

---

## 目的

Discovery Lobby から文法パターンチップを削除し、検索結果ページ下部の「文法で深める」セクションとして再配置する。Pattern Engine・検索ロジックは一切変更しない。表示場所のみの変更。

---

## 変更内容

---

### 1. `#state-empty` HTML — `#pattern-search-section` 削除

**変更前**:
```html
<!-- 文法パターン: search-patterns.json 読込後に表示 -->
<div id="pattern-search-section" style="display:none;margin-top:var(--space-xl);">
    <div class="empty-section-label">文法パターン</div>
    <div class="layer-chips" id="pattern-chips"></div>
</div>
```

**変更後**: DOM ごと削除（4行）

**理由**: Discovery Lobby は「今日、聖書を読み始めるきっかけ」を差し出す場（DS-DISCOVERY-01）。文法パターンは「読んだ後に深める」機能であり、Discovery Lobby の責務ではない。

---

### 2. `result-body` HTML — `#pattern-explore-section` 追加

**変更後**（`.hits-col` 内、`#hits-list` の後）:
```html
<!-- UX-10.8-D: 文法で深める -->
<div id="pattern-explore-section" style="display:none;margin-top:var(--space-xl);padding-top:var(--space-lg);border-top:1px solid var(--border-soft);">
    <div class="empty-section-label">文法で深める</div>
    <div class="layer-chips" id="pattern-explore-chips"></div>
</div>
```

**設計判断**:
- `display:none` で初期非表示。検索結果あり時のみ `_renderPatternExplore()` が表示する
- `border-top` でヒットカードリストと視覚的に区切る（新規デザインなし。既存 `--border-soft` トークンを使用）
- `layer-chips` は既存スタイル。チップは `layer-chip phrase`（緑）を使用

---

### 3. `_loadSearchPatterns()` — `_renderPatternChips()` 呼び出し停止

**変更前**:
```javascript
async function _loadSearchPatterns() {
    // ...
    SEARCH_PATTERNS = data.patterns.filter(/* ... */);
    _renderPatternChips();   // ← Discovery Lobby に描画していた
}
```

**変更後**:
```javascript
async function _loadSearchPatterns() {
    // ...
    SEARCH_PATTERNS = data.patterns.filter(/* ... */);
    /* _renderPatternChips() 呼び出し削除 (UX-10.8-D) */
}
```

`_renderPatternChips()` 関数本体は残存（`#pattern-chips` がなければ即 return）。

---

### 4. 新関数 `_renderPatternExplore()` — 追加

```javascript
function _renderPatternExplore() {
    const sec  = document.getElementById('pattern-explore-section');
    const wrap = document.getElementById('pattern-explore-chips');
    if (!sec || !wrap || SEARCH_PATTERNS.length === 0) return;
    wrap.innerHTML = SEARCH_PATTERNS.map((p, i) =>
        `<span class="layer-chip phrase" title="${_escH(p.description || '')}"
            onclick="runPatternSearch(${i})">${_escH(p.label)}</span>`).join('');
    sec.style.display = '';
}
```

**チップスタイル**: `layer-chip phrase`（緑）を直接指定。理由: `#pattern-chips` では `#pattern-chips .layer-chip.prox` で prox→green オーバーライドが既存 CSS に存在した。`#pattern-explore-chips` に同様のオーバーライドを追加するより `phrase` を直接使う方が CSS 依存を増やさない。

---

### 5. `_renderUnifiedResults()` — リセット追加 + 末尾呼び出し追加

**リセット**（関数先頭で `result-body` 表示前）:
```javascript
// UX-10.8-D: 各検索でパターンセクションをリセット
const _patEx = document.getElementById('pattern-explore-section');
if (_patEx) _patEx.style.display = 'none';
```

**末尾呼び出し**（ヒットカード描画・書分布描画の後）:
```javascript
_renderBookDist(entries);
_renderPatternExplore();   // UX-10.8-D: 検索結果ありの場合のみ到達
```

**0件時の非表示**: `total === 0` 時は早期 return があるため `_renderPatternExplore()` が呼ばれない → 自然に非表示のまま。追加の条件分岐不要。

---

## 変更後の表示フロー

```
ページロード
  → renderDiscoveryLobby()    → 「今日は、どんなことばを読みますか？」+ テーマ4件
  → _loadSearchPatterns()     → SEARCH_PATTERNS にロード（画面には何も描画しない）

検索実行（例: 愛）
  → _renderUnifiedResults()
      → #pattern-explore-section を display:none にリセット
      → ヒットカード描画
      → _renderBookDist()
      → _renderPatternExplore()  → 「文法で深める」セクション表示

0件検索
  → _renderUnifiedResults()
      → total === 0 で早期 return
      → _renderPatternExplore() は呼ばれない → 非表示のまま

パターンチップクリック（例: 互いに＋命令形）
  → runPatternSearch(0)
  → runTermProximitySearch(termA, termB, {scope:'verse'})
  → _renderUnifiedResults('互いに＋命令形', ...)
  → 通常の結果画面（Pattern Engine 回帰なし）
```

---

## 制約遵守確認

| 制約 | 確認 |
|------|------|
| Pattern Engine（`runTermProximitySearch`）変更禁止 | ✅ 変更なし |
| Wallace Engine 変更禁止 | ✅ 変更なし |
| syntax registry / syntax-search 変更禁止 | ✅ 変更なし |
| `runPatternSearch()` 変更禁止 | ✅ 変更なし |
| `search-patterns.json` 変更禁止 | ✅ 変更なし |
| 検索ロジック全般変更禁止 | ✅ 変更なし |

---

## 検証結果（Playwright / localhost:8765）

### Desktop 1280×800

| 確認項目 | 結果 | 実測 |
|---------|------|------|
| IDX.l3Ready | ✅ | — |
| lobby: `#pattern-search-section` 消滅 | PASS ✅ | DOM に存在しない |
| lobby: `#pattern-explore-section` 非表示 | PASS ✅ | `display:none` |
| 愛 631件 | PASS ✅ | `631 件` |
| 愛検索後: `#pattern-explore-section` 表示 | PASS ✅ | `display:''` |
| chip 数 4件 | PASS ✅ | 互いに＋命令形 / μή＋命令形 / ἵνα＋接続法 / ἐάν＋接続法 |
| chip class = phrase（緑） | PASS ✅ | `layer-chip phrase` |
| 罪 1,009件 | PASS ✅ | `1,009 件` |
| 罪検索後: pattern-explore 表示 | PASS ✅ | — |
| ἀγαπάω 353件 | PASS ✅ | `353 件` |
| ἀγαπάω検索後: pattern-explore 表示 | PASS ✅ | — |
| 0件検索: pattern-explore 非表示 | PASS ✅ | `display:none` |
| chip クリック → pattern search 起動 | PASS ✅ | 30件（互いに＋命令形） |
| result-query = パターン名 | PASS ✅ | `互いに＋命令形` |
| console errors | PASS ✅ | 0件 |

### Mobile 390×844

| 確認項目 | 結果 | 実測 |
|---------|------|------|
| `#pattern-search-section` 消滅 | PASS ✅ | DOM に存在しない |
| lobby 表示 | PASS ✅ | — |
| tap target ≥44px | PASS ✅ | 54px |
| 愛検索後: pattern-explore 表示 | PASS ✅ | — |
| console errors | PASS ✅ | 0件 |

---

## 完了状態

- Discovery Lobby から文法パターンが消えた
- 検索後の深掘り入口として「文法で深める」セクションが自然に表示される
- Pattern Engine・Wallace Engine・runPatternSearch() — 回帰なし

---

## 成果物

| ファイル | 変更 |
|---------|------|
| `search-tool.html` `#state-empty` | `#pattern-search-section` 削除（4行）|
| `search-tool.html` `result-body` | `#pattern-explore-section` 追加（6行）|
| `search-tool.html` `_loadSearchPatterns()` | `_renderPatternChips()` 呼び出し削除（1行）|
| `search-tool.html` | `_renderPatternExplore()` 追加（8行）|
| `search-tool.html` `_renderUnifiedResults()` | リセット追加（2行）+ `_renderPatternExplore()` 呼び出し追加（1行）|
| `docs/grammar-pattern-result-placement-implementation.md` | 本ドキュメント |
