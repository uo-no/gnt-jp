# Phase UX-10-4A — Discovery Lobby Visual Audit

**実施日**: 2026-07-14  
**種別**: 視覚監査（実装変更なし）  
**対象**: `search-tool.html` — Discovery Lobby CSS / HTML

---

## 設計原則

| ID | 原則 |
|----|------|
| DS-DISCOVERY-01 | テーマ語が主役。ラベル・タイトルより視覚的に優位であること |
| DS-DISCOVERY-02 | 検索候補リストに見えない。ピル・ボーダー・背景なし。サジェスト一覧と区別できること |

---

## CSS 現状スナップショット

```css
/* 計測対象コード（変更なし・読取のみ）*/

#discovery-lobby {
    padding: var(--space-xl) var(--space-md);   /* 32px 16px */
    gap: var(--space-lg);                        /* 24px */
}
.discovery-title {
    font-size: 1rem;          /* ← raw値。var(--text-body-lg) 未使用 */
    font-weight: 700;
    color: var(--text-main);
    line-height: 1.75;
}
.discovery-themes {
    gap: var(--space-md);     /* 16px ✅ */
}
.discovery-theme-chip {
    padding: 4px 0;           /* tap target: 4+16+4 = 24px */
    font-size: var(--text-body-lg);  /* 1rem ✅ */
    font-weight: (unset → 400);
    color: var(--text-main);  /* ✅ */
    transition: opacity 0.15s, transform 0.15s;  /* ease-out 未指定 */
}
.discovery-theme-chip:hover {
    opacity: 0.55;            /* ← token 外。--opacity-secondary=0.6 未使用 */
    transform: translateY(-1px);
}
.state-empty {
    gap: 14px;                /* ← token 外。スケール: 4/8/16/24/32 */
}
```

---

## 監査結果

### A-01 — Discovery Lobby が検索候補一覧に見えていないか（DS-DISCOVERY-02）

**評価: GOOD ✅**

- `border: none / background: transparent / border-radius: なし` → ピル形状を持たない
- `.ex-chip`（`border: 1.5px solid / border-radius: 20px`）と明確に異なる
- 縦列レイアウトはサジェストドロップダウンとは視覚的に別物
- DS-DISCOVERY-02 は達成されている

**所見（次回検討）**: `cursor: pointer` 以外のインタラクション示唆がなく、ホバー前にクリック可能と気づかない可能性がある。→ A-07 参照。

---

### A-02 — テーマ語が主役になっているか（DS-DISCOVERY-01）

**評価: IMPROVE**

`.discovery-title`（h2）と `.discovery-theme-chip` が**ともに `1rem`** で同一サイズ。

| 要素 | font-size | font-weight | 評価 |
|------|-----------|-------------|------|
| .discovery-title | 1rem | **700** | ラベル位置だが「太字」で目立つ |
| .discovery-theme-chip | 1rem | 400（通常）| テーマ語なのにタイトルより細い |

タイトルが bold・テーマ語が normal のため、**タイトルのほうが視覚的に重い**。DS-DISCOVERY-01「テーマ語が主役」に対して逆転が起きている。

**推奨**: `.discovery-theme-chip` を `var(--text-title) = 1.25rem` へ昇格させ、テーマ語にサイズ優位性を与える。タイトルは 1rem のまま維持。

---

### A-03 — 検索入力との視覚的優先順位

**評価: GOOD ✅**

Desktop: 検索入力は左サイドバー、Discovery Lobby は右リザルトパネル。物理的に別レーンであり直接競合しない。

Mobile: A-05 で別途評価。

---

### A-04 — Empty State 全体の余白

**評価: IMPROVE**

`.state-empty` の `gap: 14px` がデザイントークンスケール外。

| トークン | 値 |
|---------|-----|
| --space-xs | 4px |
| --space-sm | 8px |
| **14px → 該当なし** | |
| --space-md | 16px |
| --space-lg | 24px |

Discovery Lobby 表示時は `#discovery-lobby` が唯一の子要素のため現状の実害は限定的。ただし、`_showEmpty()` 呼び出し時（エラー表示）は複数の子要素が並び、14px ギャップが使われる。トークン準拠のため `var(--space-md)` へ修正が必要。

---

### A-05 — Mobile 390px 表示

**評価: BLOCK 🚫**

`.discovery-theme-chip` のタッチターゲット高さが **24px**。最小推奨値（44px）を大幅に下回る。

```
現状計算:
  padding-top:    4px
  line-height:    ~16px（1rem × 1.0 実高）
  padding-bottom: 4px
  ─────────────────
  合計:           24px  ← 最小44pxの55%
```

| 基準 | 最小タップ目標 |
|------|--------------|
| Apple HIG | 44×44pt |
| Material Design 3 | 48×48dp |
| WCAG 2.5.5 (Level AAA) | 44×44px |

**390px 幅での影響**: テーマ語は Discovery Lobby のメイン操作対象であり、これがタップできない/ミスタップするのは機能的ブロック。

**推奨**: `padding: 4px 0` → `padding: 12px 0`。タッチ領域 = 12+16+12 = **40px**（許容範囲内）。または `min-height: 44px; display: flex; align-items: center` で完全準拠。

---

### A-06 — hover 表現

**評価: IMPROVE**

3点の指摘:

**① opacity 値がトークン外**

```css
/* 現在 */
opacity: 0.55;

/* トークン定義 */
--opacity-primary:   1.0
--opacity-secondary: 0.6   ← 最近傍
--opacity-tertiary:  0.3
--opacity-disabled:  0.15
```

0.55 と 0.6 の差は視覚的にほぼ検知不能だが、原則「トークン外の opacity は使わない」に違反。

**② transition に ease-out 未指定**

```css
/* 現在 */
transition: opacity 0.15s, transform 0.15s;

/* 期待 */
transition: opacity var(--transition-fast), transform var(--transition-fast);
/* = opacity 0.15s cubic-bezier(0.2,0.8,0.2,1), transform 0.15s cubic-bezier(0.2,0.8,0.2,1) */
```

duration 0.15s は `--duration-fast` と一致しているが easing が欠落。ブラウザデフォルト `ease` が適用されている。

**③ translateY(-1px): 問題なし** — 微細で品質の高いマイクロインタラクション。維持推奨。

---

### A-07 — インタラクション示唆（観察的所見）

**評価: IMPROVE**

`cursor: pointer` のみが「クリック可能」の唯一の常時シグナル。hover 効果は存在するが、初見ユーザーがマウス操作前・タッチ前にアクション可能性を認識できるか不明。

**選択肢（DS-DISCOVERY-02 を侵害しない範囲で）**:

| 案 | 内容 | DS-DISCOVERY-02 | 評価 |
|----|------|----------------|------|
| A | 薄い underline 常時表示 | ⚠️ リンク的 → 微妙 | 検討余地あり |
| B | font-weight: 500 → 600 | ✅ chip 化しない | 安全 |
| C | 語頭に「→」等の記号 | ✅ | 装飾的になりすぎる |
| D | 現状維持（affordance は hover のみ）| ✅ | 最もシンプル |

本フェーズでは判断保留。次フェーズで実装方針を決定する。

---

### A-08 — 既存 Design System との整合

**評価: IMPROVE**

#### トークン違反（minor 4件）

| 箇所 | プロパティ | 現在値 | 期待値 |
|------|-----------|--------|--------|
| `.discovery-title` | font-size | `1rem`（生値）| `var(--text-body-lg)` |
| `.discovery-theme-chip` | transition | `opacity 0.15s, transform 0.15s` | `opacity var(--transition-fast), transform var(--transition-fast)` |
| `.discovery-theme-chip:hover` | opacity | `0.55` | `var(--opacity-secondary)` |
| `.state-empty` | gap | `14px`（生値）| `var(--space-md)` |

#### 準拠確認 ✅

| 箇所 | 確認項目 | 結果 |
|------|---------|------|
| `.discovery-theme-chip` | font-size | `var(--text-body-lg)` ✅ |
| `.discovery-theme-chip` | color | `var(--text-main)` ✅ |
| `#discovery-lobby` | padding | `var(--space-xl) var(--space-md)` ✅ |
| `#discovery-lobby` | gap | `var(--space-lg)` ✅ |
| `.discovery-themes` | gap | `var(--space-md)` ✅ |
| `.discovery-title` | color | `var(--text-main)` ✅ |

---

## 総合評価

| 評価 | 件数 | ID |
|------|------|-----|
| GOOD | 2 | A-01, A-03 |
| IMPROVE | 5 | A-02, A-04, A-06, A-07, A-08 |
| BLOCK | 1 | A-05 |

---

## 対応優先順位

| 優先 | ID | 評価 | 対応内容 |
|------|----|------|---------|
| 1 | A-05 | **BLOCK** | tap target 拡張: `padding: 4px 0` → `padding: 12px 0` |
| 2 | A-02 | IMPROVE | chip font-size を `var(--text-title)=1.25rem` へ昇格 |
| 3 | A-06 | IMPROVE | transition → `var(--transition-fast)`; opacity → `var(--opacity-secondary)` |
| 4 | A-04 | IMPROVE | `.state-empty gap: 14px` → `var(--space-md)` |
| 5 | A-07 | IMPROVE | affordance 方針を決定（次フェーズ） |
| 6 | A-08 | IMPROVE | `.discovery-title` 生値 → `var(--text-body-lg)` |

---

## 変更しなかった項目

実装変更なし。本フェーズはコード読取・評価のみ。

---

## 成果物

| ファイル | 内容 |
|---------|------|
| `docs/discovery-lobby-visual-audit.md` | 本ドキュメント（監査レポート）|
| `docs/output/discovery-lobby-visual-audit.json` | 機械可読版（完全データ）|
