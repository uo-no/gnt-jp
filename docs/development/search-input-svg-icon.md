# Search Input SVG Icon — 実装ドキュメント

**実施日**: 2026-07-15  
**変更範囲**: `search-tool.html`（CSS 10行変更 + HTML 6行変更）  
**目的**: 検索ボタン削除の前準備。入力欄右端に `ICONS.search`（shared-ui.js SSOT）と同一の SVG をクリッカブルアイコンとして配置する。

---

## 背景

`visual-weight-audit.md` の P0 判定「`.run-btn` は重量10・重要度2・ギャップ+8」に基づき、  
検索ボタンを ghost 化 → 最終的に削除するロードマップを進める。

本フェーズは「ボタン削除前の安全網」として、  
入力欄右端に SVG アイコンボタンを設置し、クリックで `unifiedSearch()` を実行できるようにする。

---

## 変更内容

### 1. CSS — `.search-icon` を `.search-icon-btn` に差し替え

**変更前:**
```css
.unified-input {
    padding: 14px 16px 14px 44px;   /* left: アイコン分の余白 */
    ...
}
.search-icon {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    color: var(--text-sub); font-size: 0.9rem; pointer-events: none;
}
```

**変更後:**
```css
.unified-input {
    padding: 14px 44px 14px 16px;   /* right: アイコンボタン分の余白 */
    ...
}
.search-icon-btn {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    color: var(--text-sub); padding: 4px; line-height: 1;
    display: flex; align-items: center; justify-content: center;
    border-radius: 4px;
    transition: color var(--transition-fast);
}
.search-icon-btn:hover { color: var(--text-main); }
.search-icon-btn svg { width: 16px; height: 16px; display: block; }
```

**設計判断:**
- `tabindex="-1"`: Tab キーのフォーカス順に入れない。Enter キー検索が主経路のため。
- hover は `color` の変化のみ。background 変化は入力欄の内側に干渉する。

---

### 2. HTML — 入力欄の構造変更

**変更前:**
```html
<div class="search-input-wrap" style="margin-bottom:10px;">
    <span class="search-icon"><span class="material-symbols-outlined">search</span></span>
    <input class="unified-input" id="unified-search-input"
        type="text"
        placeholder="愛・信じる・ἀγαπάω …"
        autocomplete="off" spellcheck="false">
    <div class="suggest-dropdown" id="suggest-dropdown"></div>
</div>
```

**変更後:**
```html
<div class="search-input-wrap" style="margin-bottom:10px;">
    <input class="unified-input" id="unified-search-input"
        type="text"
        placeholder="愛・信じる・ἀγαπάω …"
        autocomplete="off" spellcheck="false">
    <button class="search-icon-btn" onclick="unifiedSearch()" tabindex="-1" aria-label="検索" title="検索する">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
    </button>
    <div class="suggest-dropdown" id="suggest-dropdown"></div>
</div>
```

**SVG ソース:**  
`assets/js/shared-ui.js` L16 — `ICONS.search`（このプロジェクトのアイコン SSOT）

```javascript
search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
         <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>'
```

`index.html` の `_renderStaticIcons()` が同じ SVG を `data-icon="search"` 要素に挿入している。  
search-tool.html はインラインで同一パスを使用（shared-ui.js を読み込んでいないため）。

---

### 3. 変更しないもの

| 要素 | 状態 |
|------|------|
| `.run-btn`（「検索する」ボタン）| 残存（このフェーズでは削除しない）|
| `unifiedSearch()` | 変更なし |
| Enter キー検索（`_initSuggest()` keydown ハンドラ）| 変更なし |
| `.suggest-dropdown` の挙動 | 変更なし |
| `.search-input-wrap` の位置・サイズ | 変更なし |

---

## 検証結果（Playwright / localhost:8765）

### Desktop 1280×800

| 確認項目 | 結果 | 実測 |
|---------|------|------|
| IDX.l3Ready | ✅ | — |
| `.search-icon-btn` 存在 | PASS ✅ | DOM に存在 |
| 旧 `.search-icon`（Material Symbols）消滅 | PASS ✅ | DOM に存在しない |
| SVG = `ICONS.search`（`circle cx=11 r=8`）| PASS ✅ | 一致 |
| アイコンクリック → 愛 631件 | PASS ✅ | `631 件` |
| `.run-btn` 残存 | PASS ✅ | DOM に存在 |
| Enter → 罪 1,009件 | PASS ✅ | `1,009 件` |
| `.run-btn` クリック → ἀγαπάω 353件 | PASS ✅ | `353 件` |
| ボタン右端配置（btn.left > input.width × 60%）| PASS ✅ | btn.left=226, input.right=262 |
| console errors | PASS ✅ | 0件 |

### Mobile 390×844

| 確認項目 | 結果 | 実測 |
|---------|------|------|
| `.search-icon-btn` 存在 | PASS ✅ | — |
| アイコンクリック → 愛 631件 | PASS ✅ | `631 件` |
| console errors | PASS ✅ | 0件 |

---

## 次フェーズへの引き継ぎ

本フェーズ完了後、`.run-btn` 削除フェーズに進める条件が整った。

| 次フェーズ | 内容 |
|-----------|------|
| UX-11-A（仮）| `.run-btn` を ghost 化（visual-weight-audit P0）|
| UX-11-B（仮）| `.run-btn` を DOM 削除 |

`.run-btn` 削除後も `unifiedSearch()` の入口は以下の3経路が維持される:
1. 入力欄右端 SVG アイコンボタン（本フェーズで追加）
2. Enter キー（`_initSuggest()` keydown ハンドラ）
3. Mobile FAB（`mobile-search-toggle`）

---

## 成果物

| ファイル | 変更 |
|---------|------|
| `search-tool.html` CSS | `.search-icon` → `.search-icon-btn`（10行）+ `.unified-input` padding 方向変更（1行）|
| `search-tool.html` HTML | 左 Material Symbols span 削除 + 右端 SVG button 追加（6行）|
| `docs/search-input-svg-icon.md` | 本ドキュメント |
