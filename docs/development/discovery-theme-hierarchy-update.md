# Phase UX-10-4C — Discovery Theme Visual Hierarchy

**実施日**: 2026-07-14  
**変更範囲**: `search-tool.html`（CSS 1行のみ）  
**根拠**: UX-10-4A 監査 A-02 IMPROVE（DS-DISCOVERY-01 違反）

---

## 目的

`.discovery-title`（1rem / 700）と `.discovery-theme-chip`（1rem / 400）が同一サイズで、  
タイトルが bold のためテーマ語より視覚的に重くなっていた。  
テーマ語の font-size を昇格し、DS-DISCOVERY-01「テーマ語が主役」を回復する。

---

## 変更内容

### `search-tool.html`（L1046）

```diff
 .discovery-theme-chip {
     padding: 12px 0;
     border: none;
     background: transparent;
-    font-size: var(--text-body-lg);
+    font-size: var(--text-title);
```

| トークン | 値 |
|---------|----|
| `--text-body-lg`（変更前）| 1rem = 16px |
| `--text-title`（変更後）| 1.25rem = 20px |

**変更後の視覚階層:**

| 要素 | font-size | font-weight | 視覚的重み |
|------|-----------|-------------|-----------|
| `.discovery-title` | 1rem (16px) | 700 | ラベル（問いかけ）|
| `.discovery-theme-chip` | **1.25rem (20px)** | 400 | **主役（テーマ語）** |

テーマ語がタイトルより 25% 大きく表示され、サイズ階層が正しく成立する。

---

## 設計制約の遵守確認

| 制約 | 遵守 |
|------|------|
| border 追加禁止 | ✅ 変更なし |
| background 追加禁止 | ✅ 変更なし |
| border-radius 変更禁止 | ✅ 変更なし |
| chip / button 化禁止 | ✅ font-size のみ変更 |
| 新規 CSS token 追加禁止 | ✅ 既存 `--text-title` を使用 |

---

## 確認結果

### 1. Visual Hierarchy（Mobile 390px）

| 指標 | 結果 |
|------|------|
| chip font-size（実測）| 20px |
| title font-size（実測）| 16px |
| chip > title（サイズ優位性）| PASS ✅（20px > 16px）|
| tap target 高さ | PASS ✅（**53px** — font-size 増加により自然に拡大）|
| border なし | PASS ✅ |
| background なし | PASS ✅ |
| 横スクロールなし | PASS ✅ |

### 2. hover 維持確認

CSS ルール `.discovery-theme-chip:hover` の存在を確認。  
`opacity` フェードと `translateY(-1px)` は変更なし ✅

### 3. クリック → 検索起動

テーマ語タップ → `unified-search-input` に語が入力され検索が起動 ✅

### 4. 機能回帰（Playwright）

| クエリ | 期待値 | 実測 | 結果 |
|--------|--------|------|------|
| 愛 | 631件 | 631件 | ✅ PASS |
| 罪 | 1,009件 | 1,009件 | ✅ PASS |
| ἀγαπάω | 353件 | 353件 | ✅ PASS |
| 新規エラー | 0件 | 0件 | ✅ PASS |

---

## 変更しなかった項目

| 項目 | 理由 |
|------|------|
| font-weight | 変更対象外。400（通常）のまま |
| color | 変更対象外。`var(--text-main)` 維持 |
| padding / border / background | 変更対象外（UX-10-4B 値維持）|
| transition / opacity（hover）| A-06 は次フェーズ対象 |
| JS / 検索ロジック | 変更禁止 |

---

## 残課題（次フェーズ以降）

| ID | 内容 | 優先 |
|----|------|------|
| A-06 | transition → var(--transition-fast); opacity → var(--opacity-secondary) | 3 |
| A-04 | .state-empty gap: 14px → var(--space-md) | 4 |
| A-07 | affordance 方針決定 | 5 |
| A-08 | .discovery-title 生値 → var(--text-body-lg) | 6 |

---

## 成果物

| ファイル | 変更 |
|---------|------|
| `search-tool.html`（L1046）| font-size: var(--text-body-lg) → var(--text-title) |
| `docs/discovery-theme-hierarchy-update.md` | 本ドキュメント |
