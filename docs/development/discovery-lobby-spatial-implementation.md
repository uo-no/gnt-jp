# Phase UX-10-5B — Discovery Lobby Spatial Adjustment

**実施日**: 2026-07-14  
**変更範囲**: `search-tool.html`（CSS 2行のみ）  
**根拠**: UX-10-5A Spatial Audit — IMPROVE A-1+D（上部貼り付き・検索入力水平整列）/ B（visual center）

---

## 目的

Discovery Lobby を「検索フォームの延長」ではなく「静かな読書の入口」として視覚的に独立させる。  
CSS の空間調整のみで達成する。実装変更なし。

---

## 変更内容

### 修正1 — `#discovery-lobby` padding-top（L1027）

**解消対象**: UX-10-5A A-1（上部貼り付き）/ D（検索入力との水平整列）

```diff
 #discovery-lobby {
     display: flex; flex-direction: column;
     align-items: center;
-    padding: var(--space-xl) var(--space-md);
+    padding: 48px var(--space-md) var(--space-xl);
     gap: var(--space-lg);
 }
```

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| padding-top | `var(--space-xl)` = 32px | `48px` |
| padding-bottom | `var(--space-xl)` = 32px | `var(--space-xl)` = 32px（維持）|
| padding-left/right | `var(--space-md)` = 16px | `var(--space-md)` = 16px（維持）|

> **48px の根拠**: トークンスケール（4/8/16/24/32）に存在しない値だが、  
> `calc(var(--space-xl) + var(--space-md))` = 32 + 16 = 48px として表現できる。  
> デスクトップで最初のテーマ語が sidebar 検索入力（y≈143）より明確に下に来るために必要な値。

---

### 修正2 — `.discovery-title` font-weight（L1031）

**解消対象**: UX-10-5A B（visual center がタイトル優位）

```diff
-.discovery-title {
-    font-size: 1rem; font-weight: 700;
+.discovery-title {
+    font-size: 1rem; font-weight: 400;
```

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| font-weight | 700（bold）| 400（regular）|

**変更後の視覚階層:**

| 要素 | font-size | font-weight | 視覚的役割 |
|------|-----------|-------------|-----------|
| `.discovery-title` | 1rem | **400（regular）** | 背景としての問いかけ |
| `.discovery-theme-chip` | 1.25rem（var(--text-title)）| 400 | **主役（テーマ語）** |

テーマ語は font-size でタイトルより 25% 大きく、weight が同等になることで  
**サイズ優位性のみで主役** として成立する。

---

## 設計制約の遵守確認

| 制約 | 遵守 |
|------|------|
| 検索ロジック変更禁止 | ✅ |
| データ変更禁止 | ✅ |
| イベント処理変更禁止 | ✅ |
| border 追加禁止 | ✅ |
| background 追加禁止 | ✅ |
| chip/button 化禁止 | ✅ |

---

## 確認結果

### Desktop 1280×800

| 確認項目 | 実測 | 結果 |
|---------|------|------|
| title y | 76px（変更前 60px）| — |
| chip[0] y | 156px（変更前 140px）| — |
| sidebar 検索入力 y | 143px | — |
| chip[0] - input（正=下）| **+13px**（変更前 -3px）| IMPROVE（改善したが 30px 閾値に未達）|
| title が non-bold（weight ≤ 400）| 400 | PASS ✅ |
| chip font-size > title font-size | 20px > 16px | PASS ✅ |
| console errors | 0件 | PASS ✅ |

> **検索入力との垂直分離について**: chip（y=156）と sidebar 入力（y=143）の差は 13px。  
> 変更前の −3px（実質同一ライン）から改善したが、30px 目標には届かなかった。  
> ただし両要素は 300px の水平距離（sidebar / result panel 境界）で隔てられており、  
> 純粋な y 座標の差ほど視覚的な「同一ライン感」は強くない。  
> 完全解消には padding-top をさらに増やすか（≥64px）、state-empty の高さを拡大する追加対応が必要。

### Mobile 390×844

| 確認項目 | 結果 |
|---------|------|
| 横スクロールなし | PASS ✅ |
| lobby スクロールなしで表示 | PASS ✅ |
| tap target ≥ 44px | PASS ✅ |
| テーマクリック → 検索起動 | PASS ✅ |
| console errors | PASS ✅（0件）|

### 機能回帰（Playwright）

| クエリ | 期待値 | 実測 | 結果 |
|--------|--------|------|------|
| 愛 | 631件 | 631件 | ✅ PASS |
| 罪 | 1,009件 | 1,009件 | ✅ PASS |
| ἀγαπάω | 353件 | 353件 | ✅ PASS |
| console error | 0件 | 0件 | ✅ PASS |

---

## 変更しなかった項目

| 項目 | 理由 |
|------|------|
| font-size / color / border | 変更対象外 |
| hover（opacity / translateY）| 変更対象外 |
| JS / 検索ロジック | 変更禁止 |
| `.state-empty gap: 14px`（A-04）| 本フェーズ対象外 |

---

## UX-10-5A IMPROVE 解消状況

| ID | 内容 | 本フェーズ |
|----|------|-----------|
| A-1 | 上部貼り付き | ✅ 改善（padding-top 32→48px。title y: 60→76px）|
| A-3 | lobby 重心 上30% | ✅ 改善（lobby center: 230→238px。さらなる改善は次フェーズ）|
| B | visual center がタイトル優位 | ✅ 解消（title font-weight 700→400）|
| D | 検索入力と水平整列 | △ 部分解消（差 -3px→+13px。完全分離には追加余白が必要）|
| A-04 | state-empty gap: 14px | 持越し |

---

## 成果物

| ファイル | 変更 |
|---------|------|
| `search-tool.html`（L1027）| padding-top: 32px → 48px |
| `search-tool.html`（L1031）| font-weight: 700 → 400 |
| `docs/discovery-lobby-spatial-implementation.md` | 本ドキュメント |
