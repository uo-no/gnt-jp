# Phase 4.0-E Final Report — Reed-Kellogg 読書モード StudyPanel 統合

**Status: PASS**
Date: 2026-10-01
Phase: 4.0 / Task: Phase E — RK Reading Mode StudyPanel Integration
State: BROWSER-VERIFIED

---

## Summary

Reed-Kellogg 読書モード（`rk-reading`）を `index.html` に統合し、既存 StudyPanel（`openStudyPanel()`）と接続した。RK ダイアグラムの各単語をクリックすると canonical identity（`ref`, `greek`, `rawMorph`, `lemma`）を正しく StudyPanel へ渡す。Phase C 12/12 回帰テストも継続 PASS。

---

## Objective

Reed-Kellogg 読書モードを「読書モード」として機能させる。

- 日本語 = 読書の主役（SVG primary text）
- ギリシャ語 = 構造・研究情報
- 既存 StudyPanel を再利用（再設計なし）

---

## Implementation

### Step 1 — READ-ONLY 調査（CONFIRMED）

| 項目 | 確認内容 |
|------|---------|
| StudyPanel API | `openStudyPanel(greek, rawMorph, ref, lemma)` at index.html:18259 |
| `ref` 形式 | `bd.ref` = `"JHN 1:1!1"` |
| `rawMorph` 形式 | `bd.morph` = `"PREP"`, `"V-PAI-3S"` 等 |
| RK モード未登録 | index.html に script tag・mode 登録なし |
| `.wn[data-i]` | rk-reading-renderer.js:159 — 位置 1-based, Greek text in `data-grk` |

### Step 2 — Integration Boundary

```
RK SVG .wn[data-i] click
  → position = +el.dataset.i
  → clickMap.get(position) → { greek, rawMorph, ref, lemma }
  → openStudyPanel(greek, rawMorph, ref, lemma)
```

### Step 3 — Adapter 拡張

`rk-reading-adapter.js` に `buildClickMap(srSentence, bdTokenMap)` を追加。

- `Map<position, {greek, rawMorph, ref, lemma}>` を返す
- position = 1-based（SVG `.wn[data-i]` の `data-i` と一致）
- `adaptSentence()` と同じトークン順序（`surfaceIndex` ソート）を使用
- export: `global.RKReadingAdapter = { adaptSentence, buildTokenMap, buildClickMap }`

### Step 4 — Selection（canonical identity）

`.wn[data-i]` → position → `bdTokenMap.get(srToken.evidence.nodeId)` → `{ ref, morph, lemma, text }`

### Step 5-6 — index.html 統合

追加した変更点：

| 変更箇所 | 内容 |
|---------|------|
| Script tags (line 6725-6726) | `rk-reading-renderer.js`, `rk-reading-adapter.js` を追加 |
| `TRANSLATIONS` | `'RK_READING': { label: '読み解きで読む', code: 'RK_READING' }` |
| `TRANSLATION_REGISTRY` filter | `RK_READING` を疑似翻訳ID除外リストへ追加 |
| `DISPLAY_MODE_REGISTRY` | `{ kind: 'rk-reading', label: ... }` エントリ追加 |
| `ShareURLService._PATH_CODE` | `'RK_READING': 'RK'` |
| `Router._DISPLAY_CODE` | `'RK': 'RK_READING'` |
| `_toColumnMode()` | `'RK_READING'` → `{ kind: 'rk-reading' }` |
| `_isGreekReadingMode()` | `kind === 'rk-reading'` を追加 |
| `_isAutoloadBlockedMode()` | `kind === 'rk-reading'` を追加 |
| SR data loading (2箇所) | `_colA.kind === 'rk-reading'` / `_colB.kind === 'rk-reading'` |
| Render path early-return | `_colA.kind === 'rk-reading'` → `_renderRKReadingView()` |
| B-column passage-level | `_bIsPassageLevel` と後処理に `rk-reading` を追加 |
| `_GBC_MODE_LABELS` | `'RK_READING': '読み解きで読む'` |
| `_sbRenderModes` | `{ id: 'RK_READING', label: '読み解きで読む' }` |
| `_renderRKReadingView` | 新規関数（SR → adapter → renderer → click handler） |

### Step 7 — Regression

Phase C 12/12 テストおよび CLAUSE_ROLE モード表示を確認。

---

## `_renderRKReadingView` 動作

```
srData.sentences ループ:
  1. RKReadingAdapter.buildTokenMap(elData)     → bdTokenMap
  2. RKReadingAdapter.adaptSentence(sent, bdMap) → rows[greek, ja, morph, head, role]
  3. RKReadingAdapter.buildClickMap(sent, bdMap) → Map<pos, {greek, rawMorph, ref, lemma}>
  4. RKReadingRenderer.loadWords(rows)           → words[]
  5. RKReadingRenderer.renderSVG(words)          → SVGElement
  6. svg.querySelectorAll('.wn[data-i]') 各要素:
     el.style.cursor = 'pointer'
     el.addEventListener('click', () => openStudyPanel(data.greek, data.rawMorph, data.ref, data.lemma))
  7. app へ append
```

---

## Test Results

| Test | Result |
|------|--------|
| JHN 1:1 — `.rk-reading-view` present | PASS |
| JHN 1:1 — SVG rendered | PASS |
| JHN 1:1 — `.wn[data-i]` nodes present | PASS |
| MRK 1:11 — SVG rendered (Phase C regression) | PASS |
| ROM 1:1 — SVG rendered | PASS |
| EPH 1:3 — SVG rendered | PASS |
| Click `.wn` → StudyPanel opens | PASS |
| StudyPanel shows Greek word (καὶ) | PASS |
| Close StudyPanel → panel closed | PASS |
| Second `.wn` click → StudyPanel updates | PASS |
| CLAUSE_ROLE mode renders (regression) | PASS |

**8 / 8 automated tests PASS**

---

## Browser Verification

| 画面 | 確認 |
|------|------|
| JHN 1章 RK Reading Mode | Reed-Kellogg ダイアグラムが各節で表示。breadcrumb「読み解きで読む」 |
| 単語クリック（καὶ）| StudyPanel がスライドアップ、「καὶ」見出し + 3タブ表示 |

---

## Modified Files

| File | Change Type | Description |
|------|-------------|-------------|
| `public/core/rk-reading-adapter.js` | FEATURE | `buildClickMap()` 追加、export 更新 |
| `public/index.html` | FEATURE | RK_READING モード登録、SR data loading、`_renderRKReadingView` 追加 |

## Unmodified Critical Assets (CONFIRMED)

| File | Status |
|------|--------|
| `public/core/rk-reading-renderer.js`   | UNCHANGED |
| `public/core/role-semantic-layout.js`  | UNCHANGED |
| `public/core/role-page-layout.js`      | UNCHANGED |
| `public/core/role-geometry-layout.js`  | UNCHANGED |
| `public/core/role-renderer.js`         | UNCHANGED |
| `public/core/dg-engine.js`             | UNCHANGED |
| `public/core/clause-role-renderer.js`  | UNCHANGED |
| `assets/data/sr/` (SR data)            | UNCHANGED |
| `bible_data/nt/` (bible_data)          | UNCHANGED |

---

## Exit Criteria Check

| Criterion | Status |
|-----------|--------|
| RK → 単語選択 → canonical identity → 既存 StudyPanel → 正しいコンテキスト | CONFIRMED |
| StudyPanel を再設計していない | CONFIRMED |
| RK Renderer への大規模変更なし | CONFIRMED |
| DG/DR, CLAUSE_ROLE, SR/bible_data 変更なし | CONFIRMED |
| Phase C 12/12 回帰 PASS | CONFIRMED |

**Phase E: PASS**
