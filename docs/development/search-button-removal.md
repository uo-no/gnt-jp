# UX-11.2B — Search Button Removal

**実施日**: 2026-07-15  
**変更範囲**: `search-tool.html`（CSS 14行削除 + HTML 4行削除 + JS 3行削除 + 余白調整 1行）  
**根拠**: `visual-weight-audit.md` P0 — `.run-btn` 重量10・重要度2・ギャップ +8

---

## 目的

Discovery Lobby の Primary CTA を検索欄へ一本化する。  
`検索する` ボタンを削除し、3つの検索経路（Enter・SVG アイコン・Discovery Theme）のみを維持する。

---

## 変更内容

### 1. CSS 削除（14行）

```css
/* 削除した定義 */
/* Search button */
.run-btn {
    width: 100%; padding: 13px 0;
    background: var(--highlight); color: #fff;
    border: none; border-radius: 8px;
    font-family: inherit; font-size: 0.88rem; font-weight: 700;
    letter-spacing: 0.05em; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 9px;
    transition: opacity 0.15s, transform 0.1s;
    margin-bottom: 22px;
}
.run-btn:hover { opacity: 0.87; transform: translateY(-1px); }
.run-btn:active { transform: scale(0.98); }
.run-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }
```

---

### 2. HTML 削除（4行）

```html
<!-- 削除した要素 -->
<button class="run-btn" id="run-btn" onclick="unifiedSearch()">
    <span class="material-symbols-outlined">search</span>
    <span>検索する</span>
</button>
```

---

### 3. 余白補完（1行変更）

ボタンが持っていた `margin-bottom: 22px` の空間をインプットラップで補完。

```html
<!-- 変更前 -->
<div class="search-input-wrap" style="margin-bottom:10px;">

<!-- 変更後 -->
<div class="search-input-wrap" style="margin-bottom:22px;">
```

**実測ギャップ**: input 下端 → layers-block 上端 = **22px** （`gap >= 16 && gap <= 40` の PASS 範囲内）

---

### 4. JS — `run-btn` 参照3箇所削除

| 場所 | 削除したコード | 理由 |
|------|--------------|------|
| `runPatternSearch()` | `const runBtn = document.getElementById('run-btn');` + `if (runBtn) runBtn.disabled = true;` | 不要になった disabled 制御 |
| `unifiedSearch()` L3180 相当 | `document.getElementById('run-btn').disabled=true;` | null 参照エラー防止 |
| `unifiedSearch()` L3365 相当 | `document.getElementById('run-btn').disabled=false;` | null 参照エラー防止 |

**重要**: L3180・L3365 はガードなし参照（`getElementById` が `null` を返すと即 TypeError）。  
削除しなければページ起動直後の検索で Console Error が発生していた。

---

## 維持する検索経路

| 経路 | 実装 | 変更 |
|------|------|------|
| **Enter キー** | `_initSuggest()` の `keydown` ハンドラ | 変更なし |
| **入力欄右端 SVG クリック** | `.search-icon-btn` → `onclick="unifiedSearch()"` | 前フェーズ (UX-11.2A) で実装済み |
| **Discovery Theme クリック** | `.discovery-theme-chip` → `_exampleSearch(term)` | 変更なし |

---

## 変更しないもの

| カテゴリ | 要素 |
|---------|------|
| 検索ロジック | `unifiedSearch()`・`resolveTerm()`・`resolveConcept()` |
| Discovery Lobby | `renderDiscoveryLobby()`・テーマ語 |
| Concept Insight | `_renderConceptInsight()` |
| Pattern Engine | `runPatternSearch()`・`runTermProximitySearch()` |
| Wallace Engine | |
| 入力欄 SVG | `.search-icon-btn` |

---

## 検証結果（Playwright / localhost:8765）

### Desktop 1280×800

| 確認項目 | 結果 | 実測 |
|---------|------|------|
| IDX.l3Ready | ✅ | — |
| `.run-btn` 消滅 | PASS ✅ | DOM・CSS ともに存在しない |
| `.search-icon-btn` 存在 | PASS ✅ | — |
| SVG クリック → 愛 631件 | PASS ✅ | `631 件` |
| Enter → 罪 1,009件 | PASS ✅ | `1,009 件` |
| Discovery Lobby 表示 | PASS ✅ | — |
| Discovery Theme 存在 | PASS ✅ | 忍耐 |
| Discovery Theme クリック → 検索起動 | PASS ✅ | 忍耐 92件 |
| ἀγαπάω 353件（SVG クリック）| PASS ✅ | `353 件` |
| input → layers gap | PASS ✅ | **22px** |
| console errors | PASS ✅ | 0件 |

### Mobile 390×844

| 確認項目 | 結果 | 実測 |
|---------|------|------|
| 横スクロールなし | PASS ✅ | body=390px, vp=390px |
| FAB 存在 | PASS ✅ | `#mobile-fab` |
| SVG クリック → 愛 631件 | PASS ✅ | `631 件` |
| console errors | PASS ✅ | 0件 |

---

## Before / After

### Before（削除前）

```
検索語
┌──────────────────────┐
│  愛・信じる・ἀγαπάω  │
└──────────────────────┘
┌──────────────────────┐
│  🔍  検索する        │  ← Visual Weight 10 / 重要度 2
└──────────────────────┘
┌──────────────────────┐
│ ✓ 語根で探す         │
└──────────────────────┘
```

### After（削除後）

```
検索語
┌────────────────────🔍┐
│  愛・信じる・ἀγαπάω  │  ← 入力 + SVG が一体化
└──────────────────────┘
                          22px gap
┌──────────────────────┐
│ ✓ 語根で探す         │
└──────────────────────┘
```

Primary CTA がなくなったことで、Discovery Lobby のテーマ語とタイトルが視覚的に主役化する。

---

## 次フェーズへの引き継ぎ

`visual-weight-audit.md` P0 残課題:

| 項目 | 状態 |
|------|------|
| `.run-btn` 削除 | ✅ **本フェーズ完了** |
| `.layer-row.active-lemma` 重量軽減 | 未着手（次フェーズ候補）|

---

## 成果物

| ファイル | 変更 |
|---------|------|
| `search-tool.html` CSS | `.run-btn` 4ルール削除（14行）|
| `search-tool.html` HTML | `<button class="run-btn">` 削除（4行）|
| `search-tool.html` JS | `run-btn` 参照 3箇所削除 |
| `search-tool.html` HTML | `.search-input-wrap` `margin-bottom` 10px → 22px |
| `docs/search-button-removal.md` | 本ドキュメント |
