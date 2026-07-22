# Phase UX-9.10-C — Distribution Panel NT/LXX Section Split

**実施日**: 2026-07-14  
**仕様書**: `docs/search-corpus-presentation-spec.md` §5  
**変更範囲**: `search-tool.html` のみ

---

## 実装内容

分布パネル（Distribution Panel）の描画を NT / LXX の 2 セクション方式に変更した。

| 仕様 ID | 内容 | 優先度 | 実装 |
|---------|------|--------|------|
| UX-9.9-C | 分布パネル NT/LXX 2 セクション分割 | P1 MUST | ✅ |

---

## 変更詳細

### 変更 1: CSS 追加（`.dist-title` 直後）

```css
.dist-section-title {
    font-size: var(--text-caption); font-weight: 700;
    letter-spacing: 0.10em; text-transform: uppercase;
    color: var(--text-sub); opacity: 0.6;
    margin-top: var(--space-sm); margin-bottom: var(--space-xs);
}
.dist-title + .dist-section-title { margin-top: 0; }
.dist-section-divider {
    border: none; border-top: 1px solid var(--border-soft);
    margin: var(--space-sm) 0;
}
.dist-overflow-note {
    font-size: var(--text-caption); color: var(--text-sub);
    opacity: 0.5; padding: 2px 5px;
}
```

**設計根拠:**
- `.dist-section-title` は Design System §4-6 Section Label パターンに準拠（`.dist-title` と同スタイル体系）
- `.dist-title + .dist-section-title` セレクターで、パネルヘッダー直後の NT セクションタイトルの余分な `margin-top` を除去
- `.dist-section-divider`: `border-soft` トークンのみ使用（新規カラーなし）
- `.dist-overflow-note`: `--text-caption` トークンのみ使用

### 変更 2: `_renderBookDist` 関数の全面書き換え

**変更前の構造:**
```
1. 全 entries を1つの countMap に集計（NT/LXX 混合）
2. 頻度降順ソートで top 12 を表示
3. バーのパーセンテージ = count / 全体合計
```

**変更後の構造:**
```
1. entries を ntMap / lxxMap に分離（corpusId を判定ソース）
2. NT セクション（新約聖書 N件）→ 区切り線 → LXX セクション（旧約 N件）
3. 各セクション内で頻度降順ソート（最大 8 書物 + 他N書物）
4. バーのパーセンテージ = count / セクション内最大値（セクション内相対スケール）
5. activeRow はセクション間で共有（NT 選択中に LXX を選ぶと NT が自動解除）
```

**関数シグネチャ**: 変更なし `_renderBookDist(entries)`  
**クリック動作**: 変更なし（書物絞り込み → `_renderHitCards` 呼び出し）  
**表示条件**: 変更なし（総ユニーク書物数 < 2 でパネル非表示）

---

## Before / After

### κύριος の分布パネル

**Before（NT/LXX 混合・頻度降順 top 12）:**
```
出現分布（書物別）
████████████ 詩篇       818
████████     エレミヤ   607
████████     申命記     558
███████      エゼキエル  487
（マタイ等NT書物は圏外）
```

**After（2 セクション分割・相対スケール）:**
```
出現分布（書物別）
新約聖書（714件）
████████████ 使徒行伝   107
████████████ ルカ       102
█████████    マタイ      80
████████     ヨハネ      75
...
────────────────────────────
旧約ギリシア語訳（LXX）（7,458件）
████████████ 詩篇       818
████████     エレミヤ   607
████████     申命記     558
███████      エゼキエル  487
...
他 29 書物
```

---

## セクション表示条件

| 状態 | NT セクション | 区切り線 | LXX セクション |
|------|------------|--------|--------------|
| NT のみ（LXX=0） | 表示 | なし | 非表示 |
| LXX のみ（NT=0） | 非表示 | なし | 表示 |
| 両方あり | 表示 | あり | 表示 |
| 総書物数 < 2 | パネル全体非表示 | — | — |

---

## 検証結果

### セクション分割精度

| クエリ | NT セクション | LXX セクション | 区切り線 | 相対スケール |
|--------|------------|--------------|--------|------------|
| κύριος | 新約聖書（714件）✅ | 旧約ギリシア語訳（LXX）（7,458件）✅ | ✅ | NT top=100% ✅ / LXX top=100% ✅ |
| διαθήκη | 新約聖書（33件）✅ | 旧約ギリシア語訳（LXX）（297件）✅ | ✅ | ✅ |
| χριστός | 新約聖書（528件）✅ | 旧約ギリシア語訳（LXX）（41件）✅ | ✅ | ✅ |

### オーバーフロー表示

| クエリ | NT 書物数 → 表示 | LXX 書物数 → 表示 |
|--------|----------------|----------------|
| κύριος | 23書 → 8 + 他15書物 | 37書 → 8 + 他29書物 |

### 件数回帰（総件数不変）

| クエリ | 期待値 | 実測値 | 結果 |
|--------|--------|--------|------|
| 愛 | 631 件 | 631 件 | ✅ PASS |
| 罪 | 1,009 件 | 1,009 件 | ✅ PASS |
| ἀγαπάω | 353 件 | 353 件 | ✅ PASS |

### Mobile / 横スクロール

| 確認項目 | 結果 |
|---------|------|
| Mobile 390px: 横スクロールなし | ✅ PASS (scrollWidth=390) |
| Mobile 390px: NT セクション表示 | ✅ PASS |
| Mobile 390px: NT のみロード時（`IDX.ready`）→ NT セクションのみ | ✅ 仕様通り |

### その他

| 確認項目 | 結果 |
|---------|------|
| page error 0件 | ✅ PASS |

---

## 注記: Mobile での NT のみ表示

Mobile 検証は `IDX.ready`（NT 先行ロード完了）段階で実施したため、κύριος の分布パネルは **新約聖書（714件）** のみ表示された。これは仕様通りの動作:

> NT のみ（LXX=0）: LXX セクションを表示しない

`IDX.l3Ready`（NT+LXX 完全ロード）後は両セクションが表示される。

---

## 変更しなかった項目

| 項目 | 理由 |
|------|------|
| `_renderBookDist` の関数シグネチャ | 変更禁止（呼び出し元への影響なし） |
| 書物クリック → `_renderHitCards` フィルタ | 動作維持（変更不要） |
| `corpusId` 設定ロジック | 変更禁止 |
| 検索ロジック一切 | 変更禁止 |
| Hit Card 構造 | 変更禁止 |
| `index.html` / StudyPanel | 変更禁止 |

---

## UX-9 ロードマップ更新

| フェーズ | 内容 | ステータス |
|---------|------|-----------|
| UX-9.8 | Corpus Boundary Audit | ✅ |
| UX-9.9 | Corpus Presentation Specification | ✅ |
| UX-9.10-A | Hit Card Corpus Visibility（`data-corpus` + LXX badge） | ✅ |
| UX-9.10-B | 件数表示 NT/LXX 内訳 | ✅ |
| **UX-9.10-C** | **分布パネル NT/LXX 2 セクション分割** | **✅** |
| UX-9.10-D〜H | Hit Card LXX badge 強化 / LXX 折りたたみ / corpus filter UI 等 | 未着手 |
