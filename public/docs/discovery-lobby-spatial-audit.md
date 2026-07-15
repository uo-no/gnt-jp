# Phase UX-10-5A — Discovery Lobby Spatial Audit

**実施日**: 2026-07-14  
**種別**: 空間監査（実装変更なし）  
**対象**: `search-tool.html` — `#discovery-lobby` の配置・余白・視線フロー

---

## 計測値（Playwright 実測）

### Desktop 1280×800

| 要素 | y-top | y-bottom | 高さ | 備考 |
|------|-------|----------|------|------|
| result panel | 0 | 800 | 800px | sidebar 幅 300px |
| lobby | 28 | 432 | 404px | panel padding-top = 28px |
| title | 60 | 116 | 56px | 2行。font 16px / 700 |
| themes container | 140 | 400 | 260px | gap 16px |
| chip[0]（忍耐）| 140 | 193 | 53px | font 20px |
| chip[3]（証し）| — | 400 | — | — |
| search input（sidebar）| **143** | — | — | **左パネル y=143** |
| panel vertical center | — | — | — | y = 400 |
| lobby vertical center | — | — | — | y = **230** |

### Mobile 390×844

| 要素 | y-top | y-bottom | 備考 |
|------|-------|----------|------|
| lobby | 20 | 424 | viewport 内に完全収まる |
| title | 52 | 108 | — |
| chip[0] | 132 | 185 | — |
| chip[3] | — | 392 | — |
| search input | **1010** | — | オフスクリーン（モバイル専用 toggle UI）|

### 主要距離

| 距離 | Desktop | Mobile | トークン |
|------|---------|--------|---------|
| panel top → lobby top | 28px | 20px | panel padding のみ |
| title bottom → chip[0] top | **24px** | **24px** | `var(--space-lg)` ✅ |
| lobby center vs panel center | **170px 上方ずれ** | 上半分 | — |

---

## A. Vertical Rhythm

### A-1 — 画面上端 → Discovery title

**評価: IMPROVE**

`#discovery-lobby` は `padding-top: var(--space-xl) = 32px`、`.state-empty` は `justify-content: center` を持つ。  
しかし計測上、lobby は panel top + padding(28px) の直後（lobby.top = 28px）に始まる。

**原因分析**:

```
state-empty min-height = 60vh = 480px（at 800px viewport）
lobby height = 404px
中央寄せ余白 = (480 - 404) / 2 = 38px
panel padding-top = 28px
→ 期待 lobby.top = 28 + 38 = 66px
→ 実測 lobby.top = 28px ← 中央寄せが効いていない
```

`state-empty` の実高さが `min-height`（480px）ではなく `lobby` の高さ（404px）に追従している可能性が高い。  
結果としてロビーが画面最上部に貼り付き、「入口（foyer）」としての静かな着地感がない。

**推奨**: `#discovery-lobby` の `padding-top` を増加（`32px → 48px` or `64px`）し、タイトルが画面中央寄りに来るようにする。または `state-empty` の `justify-content` が機能するよう `min-height` を `80vh` 以上に増やす。

---

### A-2 — title bottom → first theme

**評価: GOOD ✅**

実測 24px = `var(--space-lg)`。  
タイトルとテーマ一覧のブレスが適切。語への移行がリズムよく読める。

---

### A-3 — lobby の垂直位置

**評価: IMPROVE**

```
lobby 重心: y = 230（panel 高さの 29% 位置）
panel 中央: y = 400（panel 高さの 50% 位置）
差:         170px 上方
```

ロビーが画面上部 30% 付近に集中している。「ロビー（待合・入口）」が持つ  
「腰を落ち着けた、中央に立つ」感覚がなく、ナビゲーションバーまたはヘッダーとして読まれるリスクがある。

---

## B. Visual Center

**評価: IMPROVE**

期待する視線着地順:

```
1. 今日のテーマ語（chips）
2. タイトル問いかけ
3. 検索入力
```

実際の視線着地順（推定）:

```
1. .discovery-title（y=60, bold 700, 先頭）  ← タイトルが先
2. .discovery-theme-chip（y=140-, 20px/400）
```

**問題の構造**:

| 要素 | y 位置 | font-size | font-weight | 視覚重量 |
|------|--------|-----------|-------------|---------|
| `.discovery-title` | 60px（先頭）| 16px | **700 bold** | 高（先行・太字）|
| `.discovery-theme-chip` | 140px（後続）| 20px | 400 | 中（大きいが細字）|

タイトルが bold のため視覚的引力が強く、20px のテーマ語より先に目に入る。  
DS-DISCOVERY-01「テーマ語が主役」が視線フローとして実現されていない。

**推奨**: `.discovery-title` の `font-weight: 700` → `400` または `color: var(--text-sub)` への変更で重量をテーマ語に移す。

---

## C. Mobile Layout（390×844）

**評価: GOOD ✅**

| 確認 | 結果 |
|------|------|
| テーマが上部に詰まりすぎていないか | lobby top=20px、title top=52px。自然な余白 ✅ |
| 検索入力が近すぎないか | input y=1010（オフスクリーン）。競合なし ✅ |
| スクロールなしで入口感があるか | lobby 全体（top=20, bottom=424）が 844px 内に収まる ✅ |

モバイルでは検索入力がオフスクリーン（toggle UI で別操作）のため、  
Discovery Lobby が画面全体を占有し、「今日のことば」としての独立感がある。

---

## D. 検索入力との位置関係

**評価: IMPROVE（desktop）/ GOOD（mobile）**

### Desktop

```
検索入力（sidebar）: y = 143
最初のテーマ語（lobby）: y = 140
差: 3px（実質ゼロ）
```

検索入力と最初のテーマ語が**画面上で同一の水平ライン**に並ぶ。  
ユーザーが左から右にスキャンすると、「ここに入力する OR こちらから選ぶ」という  
フォーム＋選択肢の構造として読まれる可能性がある。  
テーマ語が「フォームのオートコンプリート候補」に近く見えてしまう。

**推奨**: ロビーの開始位置を下げ（`padding-top` 増加）、テーマ語の y 座標を 160-180px 以上に移動する。検索入力（y=143）より明確に下に位置づけることで「検索の延長」感を排除する。

### Mobile

検索入力が y=1010（オフスクリーン）のため競合なし。GOOD ✅

---

## E. Design System との整合

**評価: GOOD ✅（CSS トークン準拠）**

| 確認 | 結果 |
|------|------|
| DS-DISCOVERY-01（検索方法を教えない）| chip に border / background なし。フォーム感なし ✅ |
| DS-DISCOVERY-02（入口は静かである）| 余分な装飾なし。縦列の静かなレイアウト ✅ |
| token 準拠（padding / gap / font）| 全準拠 ✅ |
| 未修正の token 違反（A-04 持越し）| `.state-empty gap: 14px`（raw px）⚠️ |

**補足**: CSS レベルでの DS 準拠は達成されているが、**配置（positioning）レベル**で  
DS-DISCOVERY-01・02 の精神が損なわれている（上部貼り付き、検索入力との水平整列）。  
次フェーズではトークンではなく空間配置の修正が必要。

---

## 総合評価

| 評価 | 件数 | 対象 |
|------|------|------|
| GOOD | 3 | A-2（title→chip gap）/ C（mobile）/ E（DS tokens）|
| IMPROVE | 4 | A-1（上部貼り付き）/ A-3（重心 上30%）/ B（視覚重心）/ D（水平整列）|
| BLOCK | 0 | — |

---

## 対応優先順位

| 優先 | 対象 | 内容 | 推奨変更 |
|------|------|------|---------|
| 1 | A-1 + D | ロビーが最上部・検索入力と同水平 | `#discovery-lobby padding-top` を増加（32px → 48-64px）または lobby 全体を下方にシフト |
| 2 | B | visual center がタイトル優位 | `.discovery-title font-weight: 700 → 400` or `color: var(--text-sub)` |
| 3 | A-04 持越し | `.state-empty gap: 14px` | `gap: var(--space-md)` |

---

## 変更しなかった項目

実装変更なし。本フェーズはコード読取・計測・評価のみ。

---

## 成果物

| ファイル | 内容 |
|---------|------|
| `docs/discovery-lobby-spatial-audit.md` | 本ドキュメント（監査レポート）|
| `docs/output/discovery-lobby-spatial-audit.json` | 機械可読版（完全計測データ）|
