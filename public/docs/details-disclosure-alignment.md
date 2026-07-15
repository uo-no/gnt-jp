# Phase UX-9-6 — Details Disclosure Indicator Alignment

**実施日**: 2026-07-14  
**根拠**: `docs/search-design-system.md` §7 Progressive Disclosure / §8 Visual Hierarchy / §9 Interaction Rules

---

## 対象一覧（監査）

`search-tool.html` 内の全 details/折りたたみ UI を調査した結果：

| 要素 | セレクタ | ファイル | 文字 | 位置 | pseudo | 開状態 |
|------|---------|---------|------|------|--------|--------|
| 詳細検索 | `.advanced-layers-toggle` | search-tool.html | `›` | テキスト前 | `::before` | `rotate(90deg)` |
| さらに詳しく | `.ci-advanced-toggle` | search-tool.html | `▸` | テキスト後 | `::after` | `rotate(90deg)` |
| フィルター | `.syn-filter summary` | **components.css** | `▶` | テキスト前 | `::before` | `rotate(90deg)` |
| Lemma group | `.lg-toggle` | search-tool.html (JS) | SVG chevronRight | テキスト前 | span | `rotate(90deg)` |
| さらに表示 | `.ci-related-more-btn` | search-tool.html (JS) | — | — | — | 非表示→展開 |

### 不整合の内訳

| 問題 | 内容 |
|------|------|
| **文字の不統一** | `›`（advanced-layers）/ `▸`（ci-advanced）/ `▶`（syn-filter）の3種混在 |
| **pseudo の不統一** | `::before`（advanced-layers）vs `::after`（ci-advanced） |
| **テキストとの相対位置** | advanced-layers: テキスト前 / ci-advanced: テキスト後 |

### 変更しない要素

| 要素 | 理由 |
|------|------|
| `.lg-toggle` | div ベースの JS トグル。SVG icon() システムで実装。details/summary と別カテゴリ |
| `.ci-related-more-btn` | 「さらに表示」ボタン。展開後は消滅するため disclosure indicator 不要 |

---

## Before / After

### D-1: `.ci-advanced-toggle` — `::after▸` → `::before›`

**search-tool.html L1067-1074**

```css
/* Before */
.ci-advanced-toggle::after {
    content: '▸';
    font-size: 0.6rem;
    transition: transform 0.2s;
    margin-left: 2px;
}
.ci-advanced[open] .ci-advanced-toggle::after { transform: rotate(90deg); }

/* After */
.ci-advanced-toggle::before {
    content: '›';
    font-size: 1rem;
    line-height: 1;
    transition: transform 0.2s var(--ease-out);
    flex-shrink: 0;
}
.ci-advanced[open] .ci-advanced-toggle::before { transform: rotate(90deg); }
```

**変更点**:
- pseudo-element: `::after` → `::before`（インジケーターがテキスト前に移動）
- 文字: `▸` U+25B8 → `›` U+203A（advanced-layers と同一）
- font-size: `0.6rem` → `1rem`（advanced-layers と同一）
- 追加: `line-height: 1` / `flex-shrink: 0`（advanced-layers と同一）
- 削除: `margin-left: 2px`（position が before になるため不要）
- transition: `0.2s` → `0.2s var(--ease-out)`（既存トークン使用）

**視覚変化**: 「さらに詳しく ▸」→「› さらに詳しく」

### D-2: `.syn-filter summary` — `▶` → `›` override

**search-tool.html L1172（`<style>` ブロック末尾追加）**

```css
/* Before (components.css L349 — このファイルは変更しない) */
.syn-filter summary::before { content: '▶'; font-size: var(--text-caption); ... }

/* After (search-tool.html override) */
.syn-filter summary::before { content: '›'; font-size: 1rem; }
```

**変更点**:
- 文字: `▶` U+25B6 → `›` U+203A
- font-size: `var(--text-caption)` → `1rem`（advanced-layers と同一サイズに）
- `components.css` は変更しない（`search-tool.html のみ` の原則に従い inline `<style>` にオーバーライドを追加）

---

## 変更範囲

| ファイル | 変更行 | 種別 |
|---------|--------|------|
| `search-tool.html` | L1067-1074 | CSS 修正（7行 → 7行） |
| `search-tool.html` | L1172（新規1行） | CSS override 追加 |
| `components.css` | 変更なし | — |

---

## 統一後のパターン

全 `details/summary` 要素が以下のパターンに統一された：

| 状態 | 見た目 |
|------|--------|
| 閉じている | `›` テキスト（水平） |
| 開いている | `›` を 90°回転（下向き） |

---

## 回帰結果

### 機能動作確認

| 確認項目 | 結果 |
|---------|------|
| advanced-layers `::before` = `›` | ✅ |
| advanced-layers 開閉動作 | ✅ |
| ci-advanced-toggle `::before` = `›` | ✅ |
| ci-advanced `::after` に `▸`/`▶` なし | ✅ |
| ci-advanced 開閉動作 | ✅ |
| syn-filter summary `::before` = `›`（override 適用） | ✅ |
| Mobile 390px: advanced-layers `::before` = `›` | ✅ |
| Mobile 390px: ci-advanced `::before` = `›` | ✅ |
| Mobile 390px: 横スクロールなし | ✅ |

### 件数回帰

| クエリ | 件数 | 結果 |
|-------|------|------|
| 愛 | 631 件 | ✅ |
| 罪 | 1,009 件 | ✅ |
| ἀγαπάω | 353 件 | ✅ |

---

## 今回変更しなかった項目

| 項目 | 理由 |
|------|------|
| `.lg-toggle` SVG | div ベースの JS トグル。details/summary とは別カテゴリ。rotate(90deg) で動作一致しており統一済み |
| `.ci-related-more-btn` | show-more ボタン。開閉インジケーター不要 |
| `components.css` | スコープ外（`search-tool.html のみ`）。override で対応 |

---

## UX-9 ロードマップ更新

| フェーズ | 内容 | ステータス |
|---------|------|-----------|
| UX-9A | Search Design System 仕様書 | ✅ |
| UX-9-1 | Language Alignment | ✅ |
| UX-9-2 | Search Button Visual Audit | ✅ |
| UX-9-2-B | `layers` → `search` アイコン変更 | ✅ |
| UX-9-3 Audit | Concept Insight Visual Audit | ✅ |
| UX-9-3 | Concept Insight Section Label 統一 | ✅ |
| **UX-9-6** | **Details Disclosure Indicator 統一** | **✅** |
| UX-9-7 | Pattern chip 色分離（prox → pattern） | 未着手 |
| UX-9-8 | `result-query-label` affordance | 未着手 |
| UX-9-9 | 「さらに表示」ボタン共通化 | 未着手 |
| UX-9-10 | Badge 統一（High risk） | 未着手 |
| UX-9-11 | Section Label 全統一（High risk） | 未着手 |
