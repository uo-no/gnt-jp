# Phase UX-9-3 — Concept Insight Visual Hierarchy Alignment

**実施日**: 2026-07-14  
**根拠**: `docs/concept-insight-visual-audit.md` / `docs/output/concept-insight-visual-audit.json`  
**フェーズ**: UX-9-3-1（Section Label 統一）

---

## 1. 変更ファイル

| ファイル | 行番号 | 変更種別 |
|---------|--------|---------|
| `search-tool.html` | 526–533 | CSS 修正（`.ci-section-title`） |

---

## 2. 変更理由

`.ci-section-title` は Concept Insight コンポーネント内のセクション見出しに使われるクラスで、「関連するギリシャ語」「関連する概念」等のラベルを担う。

監査（UX-9-3 Audit）の結果、このクラスだけが `search-tool.html` 内の他のすべてのセクションラベルと異なるスタイルを持っていることが判明した。

| クラス | font-weight | letter-spacing | text-transform | opacity |
|--------|------------|---------------|---------------|---------|
| `.ci-section-title` **変更前** | 400（未設定） | none | none | 1.0 |
| `.cooc-title` | 700 | 0.12em | uppercase | 0.6 |
| `.dist-title` | 700 | 0.12em | uppercase | 0.6 |
| `.lg-cooc-title / .lg-hits-title` | 700 | 0.10em | uppercase | 0.55 |
| `.ci-section-title` **変更後** | 700 | 0.10em | uppercase | 0.6 |

`ci-section-title` だけがセクションラベルのパターンから外れており、これは Design System §4-6 の違反（V-1 MAJOR）として記録された。

---

## 3. Design System 上の位置づけ

- **Design Commandment Ⅶ**（階層の一貫性）: すべてのセクション見出しは同一の視覚パターンを持つ
- **§4-6 Section Label Rule**: `uppercase + letter-spacing 0.10em + font-weight: 700 + opacity: 0.6`
- **§3 Design Token 準拠**: 新しいトークンを追加しない。既存トークン `--text-caption`・`--text-sub`・`--space-xs` のみ使用

---

## 4. Before / After

### Before

```css
.ci-section-title {
    font-size: var(--text-caption);
    color: var(--text-sub);
    margin-bottom: var(--space-xs);
}
```

### After

```css
.ci-section-title {
    font-size: var(--text-caption);
    font-weight: 700;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--text-sub);
    opacity: 0.6;
    margin-bottom: var(--space-xs);
}
```

**追加プロパティ**: `font-weight: 700` / `letter-spacing: 0.10em` / `text-transform: uppercase` / `opacity: 0.6`  
**変更プロパティ**: なし  
**削除プロパティ**: なし  
**構造変更**: なし

---

## 5. 回帰結果

### UX-9-3-1: `.ci-section-title` CSS 確認

| 確認項目 | 結果 |
|---------|------|
| `font-weight: 700` | ✅ |
| `letter-spacing > 0` | ✅ |
| `text-transform: uppercase` | ✅ |
| `opacity < 1.0` | ✅ |
| `font-size ≦ 12px` (`--text-caption`) | ✅ |
| 表示テキスト（「関連するギリシャ語」） | ✅ |

### UX-9-3-2: Concept Insight と Hit Card の視覚分離

| 確認項目 | 計測値 | 結果 |
|---------|--------|------|
| Concept Insight 背景色 | `rgb(245, 245, 247)` = `#f5f5f7` | — |
| Hit Card 背景色 | `rgb(255, 255, 255)` = `#ffffff` | — |
| 背景色が異なる | — | ✅ |
| CI `border-radius` | `12px` (`--radius-m`) | — |
| Hit Card `border-radius` | `10px` | — |
| CI 表示中 | — | ✅ |

背景色の差（`#f5f5f7` vs `#ffffff`）および `border-radius` の違い（12px vs 10px）により、CSS 追加変更なしで視覚分離は十分と判断。**UX-9-3-2 は変更不要**。

### UX-9-3-3: 機能回帰確認

| 確認内容 | 結果 |
|---------|------|
| 検索「愛」→ 631 件 | ✅ |
| 検索「罪」→ 1,009 件 | ✅ |
| 検索「ἀγαπάω」→ 353 件 | ✅ |
| Concept Insight タイトル「愛」含む | ✅ |
| 関連するギリシャ語 4 件表示 | ✅ |
| 関連する概念チップ 4 件表示 | ✅ |
| 「さらに詳しく」（details 要素）存在 | ✅ |
| Mobile 390px: CI 存在 | ✅ |
| Mobile 390px: CI コンテンツあり | ✅ |
| Mobile 390px: 横スクロールなし | ✅ |

> **備考**: console に 404 リソースエラーが複数件記録されたが、これは本変更以前から存在する既存のアセット読み込みエラーであり、今回の CSS 変更では発生し得ない。検索件数・機能動作に影響なし。

---

## 6. 今回変更しなかった項目

| 項目 | 理由 |
|------|------|
| V-2: `.layer-chip.prox`（Pattern chip 色） | UX-9-7 対象。JS + CSS 両方に影響するため別フェーズで実施 |
| V-3: `.ci-advanced-toggle::after`（矢印方向） | UX-9-6 対象。details/summary 全体の統一と合わせて実施 |
| 案 B: 識別バッジ追加 | JS + CSS 変更を伴う。今回は「最小変更」の原則を優先 |
| 案 D: 内部順序変更（概念→Greek） | `_renderConceptInsight` JS 変更を伴う。禁止対象に近い |
| 案 E: Mobile max-height | MODERATE リスク。別フェーズで検討 |
| Hit Card 側 CSS | 視覚分離は現状で十分（背景色 + radius の差あり） |

---

## 7. UX-9 ロードマップ更新

| フェーズ | 内容 | ステータス |
|---------|------|-----------|
| UX-9A | Search Design System 仕様書 | ✅ 完了 |
| UX-9-1 | Language Alignment（7 件） | ✅ 完了 |
| UX-9-2 | Search Button Icon 監査 | ✅ 完了 |
| UX-9-2-B | `layers` → `search` アイコン変更 | ✅ 完了 |
| UX-9-3 Audit | Concept Insight Visual Audit | ✅ 完了 |
| **UX-9-3** | **Concept Insight Section Label 統一** | **✅ 完了** |
| UX-9-6 | details summary 矢印統一 | 未着手 |
| UX-9-7 | Pattern chip 色分離（prox → pattern） | 未着手 |
| UX-9-8 | `result-query-label` affordance | 未着手 |
| UX-9-9 | 「さらに表示」ボタン共通化 | 未着手 |
| UX-9-10 | Badge 統一（High risk） | 未着手 |
| UX-9-11 | Section Label 全統一（High risk） | 未着手 |
