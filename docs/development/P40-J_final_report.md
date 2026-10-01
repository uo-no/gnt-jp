# Phase 4.0-J Final Report — Reed-Kellogg 読書モード / Display / StudyPanel / Legend Integration

**Status: PASS**  
Date: 2026-10-01  
Phase: 4.0 / Task: Phase J — RK Reading Mode Display / StudyPanel / Legend Integration  
State: BROWSER-VERIFIED

---

## Summary

Phase I-2 監査で特定した 3 つの表示課題（黒塗り / StudyPanel jaWord 欠如 / Legend 未実装）を修正し、RK Reading Mode の表示を聖書アプリの既存 UI として完成させた。

```
J-1 黒塗り修正:      PASS — CSS vars 解決 + .wn rect transparent
J-2 StudyPanel修正:  PASS — jaWord / 辞書 / 使用傾向 表示確認
J-3 Legend追加:      PASS — 4項目 legend visible

Phase C 5 chapters:  5/5 PASS
H regression 4 cases: 3/4 PASS (HEB 11 = pre-existing TECH-DEBT)
WO mode regression:  PASS (chips=826, rkLegend=false, wn rects=0)
NT-wide adapter:     8,010 / 8,010 sentences, errors=0
Mobile 375×812:      PASS
```

---

## 1. J-1: 黒塗り修正

### 原因（Phase I-2 監査 CONFIRMED）

1. `--core / --mod / --adv / --link` CSS 変数が未定義 → SVG `fill` が fallback `black`
2. `.wn rect` に `fill` 属性なし → SVG デフォルト `black`

### 修正

**`public/css/tokens.css`** — RK 役割色を Design Token SSOT に追加:

```css
/* ── RK Reading Mode colors（Reed-Kellogg 構文図: 役割色 — Phase J）── */
--core: #3730a3;
--mod:  #0f766e;
--adv:  #a16207;
--link: #a21caf;
--sub:  #5b6178;
```

値出典: `Reed-Kellogg 読書モード.html`（Reference）/ `rk-phase-c-test.html`

**`public/index.html`** — `.wn rect` に透明 fill を適用（RK view にスコープ）:

```css
.rk-reading-view .wn rect {
    fill: transparent;
    stroke: transparent;
    stroke-width: 1.5;
}
```

`.wn` クラスは `rk-reading-renderer.js` 専用（他モードに使用なし — Phase I-2 CONFIRMED）。既存 SVG モードへの影響ゼロ。

### 検証

| 項目 | 結果 |
|------|------|
| `--core` computed | `#3730a3` | CONFIRMED |
| `--mod` computed  | `#0f766e` | CONFIRMED |
| `--adv` computed  | `#a16207` | CONFIRMED |
| `--link` computed | `#a21caf` | CONFIRMED |
| `.wn rect` computed fill | `rgba(0,0,0,0)` = transparent | CONFIRMED |
| `.wn text` computed fill | `rgb(162,28,175)` = `--link` | CONFIRMED (not black) |
| Screenshot: JHN 1:1 desktop | 多色表示、黒塗りなし | BROWSER-VERIFIED |

---

## 2. J-2: StudyPanel jaWord / 辞書 修正

### 原因（Phase I-2 監査 CONFIRMED）

RK click handler が `openStudyPanel()` のみ呼び出し。`_setInspectDataFromElToken()` 未呼び出し → `AppState.inspect.data = null` → jaWord / 辞書セクション非表示。

### 修正方針

`rk-reading-adapter.js` を変更しない（原則）。`_renderRKReadingView` 内で `bdTokenMap` の逆引きマップを構築し、click 時に既存 `_setInspectDataFromElToken(bd)` + `_setStudyTarget()` を呼ぶ。

**`public/index.html` — `_renderRKReadingView`**:

```javascript
// J-2: ref → bdToken reverse-lookup for StudyPanel (no adapter change needed)
const _rkRefToBd = new Map();
for (const tok of bdTokenMap.values()) {
    if (tok && tok.ref) _rkRefToBd.set(tok.ref, tok);
}
```

Click handler（J-2 追加分）:

```javascript
const bd = _rkRefToBd.get(data.ref);
if (bd) {
    _setInspectDataFromElToken(bd);
    _setStudyTarget(data.ref, bd.verseId);
}
openStudyPanel(data.greek, data.rawMorph, data.ref, data.lemma);
```

### 変更範囲

- `rk-reading-adapter.js`: **UNCHANGED** ✅
- `AppState.inspect.data` 構造: **UNCHANGED** ✅（既存 SSOT を利用）
- RK専用 StudyPanel data structure: **作成なし** ✅

### 検証

| 項目 | 結果 |
|------|------|
| καὶ クリック → panel open | CONFIRMED |
| jaWord `そして` 表示 | CONFIRMED |
| `品詞接続詞` 表示 | CONFIRMED |
| `使用傾向` セクション | CONFIRMED |
| `辞書全文` セクション | CONFIRMED |
| Panel text (先頭600文字) | `καὶ そして 単語を詳しく調べる 品詞接続詞 使用傾向 福音書で使われることが多い...辞書全文 【語義】...` |

比較（修正前 Phase I-2 CONFIRMED）: `καὶ 単語を詳しく調べる 品詞接続詞... メモ 保存`（jaWord なし / 辞書なし）

---

## 3. J-3: Legend 追加

### 修正

**`public/index.html` — `_renderRKReadingView`** に Legend DOM 要素を追加（sentence loop の前）:

```javascript
// J-3: Legend
const legendEl = document.createElement('div');
legendEl.className = 'rk-legend';
legendEl.innerHTML =
    '<span><i style="background:var(--core)"></i>文の骨格</span>' +
    '<span><i style="background:var(--mod)"></i>名詞の修飾</span>' +
    '<span><i style="background:var(--adv)"></i>副詞的要素</span>' +
    '<span><i style="background:var(--link)"></i>接続(点線)</span>';
wrap.appendChild(legendEl);
```

CSS（`index.html` `<style>`）:

```css
.rk-legend {
    display: flex; flex-wrap: wrap;
    gap: var(--space-xs) var(--space-md);
    padding: var(--space-xs) var(--space-sm) var(--space-sm);
    font-size: var(--text-caption); color: var(--text-sub);
    border-bottom: 1px solid var(--border);
    margin-bottom: var(--space-md);
}
```

既存 Design Token を使用。Reference HTML そのままの移植ではなく、既存アプリ UI に適合。

### 検証

| 項目 | 結果 |
|------|------|
| `.rk-legend` found | CONFIRMED |
| `.rk-legend` visible | CONFIRMED |
| items: 4 | 文の骨格 / 名詞の修飾 / 副詞的要素 / 接続(点線) |
| Desktop visible | CONFIRMED |
| Mobile 375×812 visible | CONFIRMED |
| WO mode: `.rk-legend` なし | CONFIRMED（WO mode に legend 混入なし） |

---

## 4. Regression Results

### 4.1 Phase C representative chapters

| chapter | sentences | tokens | errors | legend | black | status |
|---------|-----------|--------|--------|--------|-------|--------|
| JHN 1 | 57 | 883 | 0 | ✅ | false | **PASS** |
| MRK 1 | 43 | 756 | 0 | ✅ | false | **PASS** |
| MRK 2 | 31 | 575 | 0 | ✅ | false | **PASS** |
| ROM 1 | 20 | 577 | 0 | ✅ | false | **PASS** |
| EPH 1 | 9 | 405 | 0 | ✅ | false | **PASS** |

**5/5 PASS**

### 4.2 H regression cases

| ref | errors | legend | black | status |
|-----|--------|--------|-------|--------|
| ROM 1 (incl. 1:24) | 0 | ✅ | false | **PASS** |
| 1CO 3 (incl. 3:11) | 0 | ✅ | false | **PASS** |
| HEB 11 (incl. 11:32) | 1 | ✅ | false | FAIL* |
| ROM 15 (incl. 15:30) | 0 | ✅ | false | **PASS** |

*HEB 11:4 error = **pre-existing TECH-DEBT**（Phase I CONFIRMED）: `RangeError: Maximum call stack size exceeded` — verb/cverb cycle。Phase J 変更と無関係。

### 4.3 NT-wide adapter sweep

```
Total sentences: 8,010
Adapter errors:  0
prep-without-pobj: 0
```

`CONFIRMED` — Phase H 修正後の状態を維持。

### 4.4 WO mode regression

```
chips: 826  (unchanged)
rkLegend present in WO: false  (legend not leaking)
.wn rect count in WO: 0  (no wn elements in WO mode)
chip color: rgb(33, 31, 26) = var(--text) (unchanged)
```

**PASS** — `--core/mod/adv/link/sub` CSS vars 追加による WO mode への影響なし。

### 4.5 Mobile

| viewport | legend | blackRects | status |
|----------|--------|------------|--------|
| 375×812 ROM 1 | found / visible | 0/577 | **PASS** |
| 390×844 | N/A — covered by 375×812 | — | N/A |

---

## 5. Modified Files

| File | Change | Type |
|------|--------|------|
| `public/css/tokens.css` | `--core/mod/adv/link/sub` 追加 | FEATURE |
| `public/index.html` | `.rk-reading-view .wn rect` CSS 追加 | BUG |
| `public/index.html` | `.rk-legend` CSS 追加 | FEATURE |
| `public/index.html` | `_renderRKReadingView`: `_rkRefToBd` map 追加 | BUG |
| `public/index.html` | `_renderRKReadingView`: click handler に `_setInspectDataFromElToken` 追加 | BUG |
| `public/index.html` | `_renderRKReadingView`: legend DOM 追加 | FEATURE |

### Unchanged (原則維持)

- `public/core/rk-reading-adapter.js` — **UNCHANGED** ✅
- `public/core/rk-reading-renderer.js` — **UNCHANGED** ✅
- DG / DR / SR / bible_data — **UNCHANGED** ✅
- Navigation — **UNCHANGED** ✅
- 通常の「語順で読む」実装 — **UNCHANGED** ✅

---

## 6. Pre-existing Issues (DEFERRED)

Phase J で確認した pre-existing issues（Phase J 変更と無関係）:

| issue | ref | type | status |
|-------|-----|------|--------|
| verb/cverb cycle → max call stack | HEB 11:4 | TECH-DEBT | DEFERRED |
| verb/cverb cycle → max call stack | MAT 5:23 | TECH-DEBT | DEFERRED |
| renderer overflow (no cycle) | GAL 3:21 | TECH-DEBT | DEFERRED |

いずれも Phase H Final Report / Phase I Final Report で記録済み。

---

## 7. Validation Summary

| 検証項目 | 結果 |
|---------|------|
| J-1: CSS vars `--core/mod/adv/link/sub` 解決 | ✅ CONFIRMED |
| J-1: `.wn rect` fill = transparent | ✅ CONFIRMED |
| J-1: SVG text 多色表示（非黒）| ✅ CONFIRMED |
| J-2: StudyPanel jaWord 表示 | ✅ CONFIRMED |
| J-2: StudyPanel 辞書 表示 | ✅ CONFIRMED |
| J-2: `rk-reading-adapter.js` 変更なし | ✅ CONFIRMED |
| J-3: Legend 4項目 visible | ✅ CONFIRMED |
| Phase C 5 chapters | ✅ 5/5 PASS |
| H regression 4 cases | ✅ 3/4 PASS（1件は pre-existing） |
| NT-wide adapter sweep | ✅ 8,010/8,010 errors=0 |
| WO mode not broken | ✅ PASS |
| Mobile 375×812 | ✅ PASS |

---

**Phase J: PASS**
