# Phase UX-9-7 — Pattern Chip Color Separation

**実施日**: 2026-07-14  
**根拠**: `docs/concept-insight-visual-audit.json` V-2 / `docs/search-design-system.md` §4-4

---

## 現状（監査）

### chip 色体系

| クラス | カラートークン | 色 | 意味 |
|--------|-------------|-----|------|
| `.layer-chip.lemma` | `--lemma` | 青 #1a5fa8 | 語根検索レイヤー |
| `.layer-chip.phrase` | `--phrase` | 緑 #2e7d46 | フレーズ検索レイヤー |
| `.layer-chip.prox` | `--prox` | 橙 #b84a1a | 近接検索レイヤー |
| `.layer-chip.morph` | `--morph` | 紫 #7b3d9a | 語形フィルタレイヤー |

### chip 出現箇所（JS コードより）

| 箇所 | クラス | 機能 | 行番号 |
|------|--------|------|--------|
| CI「関連する概念」 | `layer-chip lemma` | `_ciConceptClick()` 再検索 | 2559 |
| CI「パターンで探す」 | `layer-chip prox` | `runPatternSearch(i)` | 2566 |
| CI「構文で探す」 | `layer-chip morph` | `_ciSyntaxClick()` | 2568 |
| 空状態「文法パターン」 | `layer-chip prox` | `runPatternSearch(i)` | 2664 |

---

## 問題

### Pattern chip と Proximity chip が同じオレンジ色を使用

```
layer-chip prox（橙） = 近接検索レイヤー色
layer-chip prox（橙） = パターン検索プリセット ← 誤用
```

**認知カテゴリの違い:**

| | Proximity | Pattern |
|--|-----------|---------|
| 意味 | 語と語の距離条件 | 聖書表現の定型パターン |
| 操作 | スライダーで距離を設定 | プリセットをワンクリック実行 |
| 色の意味 | 近接レイヤーが有効 | （無関係） |

設計システム §4-4 違反（V-2 MAJOR）として記録済み。

---

## 変更方針

**制約:** `JavaScript変更なし` — JS コードでは `class="layer-chip prox"` がハードコードされているため変更不可。

**解決:** CSS コンテキストセレクターによるオーバーライド。パターンチップが出現する DOM コンテキスト（`#pattern-chips`、`.ci-advanced`）でのみ `prox` 色を `phrase`（緑）に上書き。

**使用カラー: `--phrase`（緑 #2e7d46）**

理由：
- パターンチップは「聖書テキストの表現・文法構造パターン」= テキストパターン概念
- `--phrase`（フレーズ/連続テキスト）は意味的に近く、4色の中で最も適切
- `--lemma`（青）は概念チップが既に使用
- `--morph`（紫）は構文チップが既に使用
- 新色トークンを追加しない（既存トークン優先の原則）

---

## Before / After

### CSS 変更（search-tool.html L505-511）

**Before:**

```css
.layer-chip.lemma  { background: var(--lemma-bg);  color: var(--lemma);  border-color: var(--lemma-border); }
.layer-chip.phrase { background: var(--phrase-bg); color: var(--phrase); border-color: var(--phrase-border); }
.layer-chip.prox   { background: var(--prox-bg);   color: var(--prox);   border-color: var(--prox-border); }
.layer-chip.morph  { background: var(--morph-bg);  color: var(--morph);  border-color: var(--morph-border); }
.layer-chip:hover { opacity: 0.75; }
```

**After（追加 5行）:**

```css
.layer-chip.lemma  { background: var(--lemma-bg);  color: var(--lemma);  border-color: var(--lemma-border); }
.layer-chip.phrase { background: var(--phrase-bg); color: var(--phrase); border-color: var(--phrase-border); }
.layer-chip.prox   { background: var(--prox-bg);   color: var(--prox);   border-color: var(--prox-border); }
.layer-chip.morph  { background: var(--morph-bg);  color: var(--morph);  border-color: var(--morph-border); }
.layer-chip:hover { opacity: 0.75; }
/* Pattern chips reuse class="layer-chip prox" in JS — override in context to phrase-green.
   Prox (orange) = word-distance condition; Pattern (green) = biblical expression preset. */
#pattern-chips .layer-chip.prox,
.ci-advanced .layer-chip.prox {
    background: var(--phrase-bg);
    color: var(--phrase);
    border-color: var(--phrase-border);
}
```

**変更内容:** CSS 追加 5行のみ。JS 変更なし。新色トークン追加なし。

---

## 回帰結果

### 視覚確認

| 確認項目 | 結果 |
|---------|------|
| `#pattern-chips` 内 chip: 緑（phrase-green） | ✅ (4件) |
| CI `.ci-advanced` 内 pattern chip: 緑（phrase-green） | ✅ (1件「互いに＋命令形」) |
| CI concept chip（lemma-blue）: 変更なし | ✅ |
| Advanced layers prox row（active時）: 橙のまま | ✅ |
| Mobile 390px: pattern chip 表示正常 | ✅ (1件) |
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
| JS クラス名（`class="layer-chip prox"`） | 変更禁止（JavaScript変更なし の原則） |
| `--prox` トークン本体 | 近接検索レイヤー（`.layer-row.active-prox` 等）は引き続きオレンジが正しい |
| 履歴バッジ `.h-badge.prox` | 実際の近接検索履歴を示すため橙が正しい |
| 結果バッジ `.r-badge.prox` / `.ht-badge.prox` | 同上 |
| CI 「構文で探す」chip（morph-purple） | 構文分類（Wallace Engine）で適切 |
| CI 「関連する概念」chip（lemma-blue） | 語根概念として適切 |

---

## UX-9 ロードマップ更新

| フェーズ | 内容 | ステータス |
|---------|------|-----------|
| UX-9A | Search Design System 仕様書 | ✅ |
| UX-9-1 | Language Alignment | ✅ |
| UX-9-2/B | Search Button Icon | ✅ |
| UX-9-3 | Concept Insight Section Label 統一 | ✅ |
| UX-9-6 | Details Disclosure Indicator 統一 | ✅ |
| **UX-9-7** | **Pattern Chip 色分離** | **✅** |
| UX-9-8 | `result-query-label` affordance | 未着手 |
| UX-9-9 | 「さらに表示」ボタン共通化 | 未着手 |
| UX-9-10 | Badge 統一（High risk） | 未着手 |
| UX-9-11 | Section Label 全統一（High risk） | 未着手 |
