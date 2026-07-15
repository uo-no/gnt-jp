# Phase UX-10-4B — Discovery Lobby Tap Target Fix

**実施日**: 2026-07-14  
**変更範囲**: `search-tool.html`（CSS 1行のみ）  
**根拠**: UX-10-4A 監査 A-05 BLOCK（mobile tap target 24px < 44px）

---

## 目的

`.discovery-theme-chip` のタッチターゲット高さを最小推奨値（44px）に近づけ、  
モバイルでの誤タップ・タップ失敗を解消する。

---

## 変更内容

### `search-tool.html`（L1043）

```diff
 .discovery-theme-chip {
-    padding: 4px 0;
+    padding: 12px 0;
     border: none;
     background: transparent;
```

**変更前のタッチ領域計算**:
```
padding-top:    4px
line-height:   ~16px（1rem）
padding-bottom: 4px
─────────────────
合計:          24px  ← 最小44pxの55%
```

**変更後のタッチ領域計算**:
```
padding-top:   12px
line-height:  ~24px（1rem × 実際の line-height）
padding-bottom:12px
─────────────────
合計:          48px  ← Apple HIG 44pt を超過（Playwright 実測値）
```

---

## 設計制約の遵守確認

| 制約 | 遵守 |
|------|------|
| border 追加禁止 | ✅ 変更なし |
| background 追加禁止 | ✅ 変更なし |
| border-radius 変更禁止 | ✅ 変更なし |
| chip / button 化禁止 | ✅ padding のみ変更 |
| 新規 CSS token 追加禁止 | ✅ 追加なし |

---

## 確認結果

### 1. Mobile 390px — タップ領域

| 指標 | 結果 |
|------|------|
| chip height（getBoundingClientRect）| **48px** |
| tap target ≥ 44px | PASS ✅（Apple HIG 超過）|
| 横スクロールなし | PASS ✅ |

> 実測 48px。Apple HIG 44pt・Material Design 48dp・WCAG 2.5.5 いずれも満たす。  
> UI上の外観変化なし（padding 増加は外側への余白追加のみ）。

### 2. テーマクリック → 検索起動

| 操作 | 結果 |
|------|------|
| .discovery-theme-chip をタップ | input に語が入力される ✅ |
| 検索が起動 | PASS ✅ |

### 3. 機能回帰（Playwright）

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
| border / background / border-radius | 設計制約で禁止 |
| font-size / color / font-weight | 変更対象外（A-02 改善は次フェーズ）|
| transition / opacity | 変更対象外（A-06 は次フェーズ）|
| JS / 検索ロジック | 変更禁止 |

---

## 残課題（次フェーズ以降）

UX-10-4A 監査で指摘された以下の IMPROVE は本フェーズ対象外:

| ID | 内容 | 優先 |
|----|------|------|
| A-02 | テーマ語 font-size を var(--text-title)=1.25rem へ昇格 | 2 |
| A-06 | transition → var(--transition-fast); opacity → var(--opacity-secondary) | 3 |
| A-04 | .state-empty gap: 14px → var(--space-md) | 4 |
| A-07 | affordance 方針決定 | 5 |
| A-08 | .discovery-title 生値 → var(--text-body-lg) | 6 |

---

## 成果物

| ファイル | 変更 |
|---------|------|
| `search-tool.html`（L1043）| padding: 4px 0 → 12px 0 |
| `docs/discovery-lobby-tap-target-fix.md` | 本ドキュメント |
