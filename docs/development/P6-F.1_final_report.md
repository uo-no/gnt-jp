# P6-F.1 — Final Report

**Phase:** P6-F.1 — PP Diagonal Visual Grammar  
**Date:** 2026-08-25  
**State:** AUDIT-COMPLETE  
**Decision:** PASS

---

## Summary

P6-F.1 Phase A (Read-only 設計監査) 完了。

PP Diagonal Notation の実装を P6-F-1 として承認するための事前確認を 8 項目の監査 (A–H) で実施した。Production code は変更していない。

---

## 監査結果サマリー

| 監査 | 内容 | 判定 |
|---|---|---|
| A | NT-wide PP 件数・付加先分類 | CONFIRMED |
| B | PP 内部構造 (prep+NP) | CONFIRMED |
| C | `extractPPStructure()` カバレッジ | CONFIRMED |
| D | DG gate 章 PP 統計 | CONFIRMED |
| E | 現在のレンダラー実装 | CONFIRMED |
| F | L-0 安全性 | SAFE |
| G | 具体例 (JHN 1 / ROM 6 / EPH 2) | CONFIRMED |
| H | Diagonal 実装方式 | FEASIBLE |

---

## 数値エビデンス

| 指標 | 値 | 根拠 |
|---|---|---|
| NT-wide PP 総数 | 11,889 | SR data NT-wide |
| extractPPStructure() カバレッジ | 11,676 / 11,889 = 98.2% | code analysis |
| L-0 safe 件数 | 11,027 / 11,889 = 92.8% | fn distribution |
| DG gate 章 PP (fn:ADVERBIAL) | 252 / 363 = 69.4% | DG chapter stats |
| 現在 inline 表示済み | 8,851 / 11,889 = 74.4% | renderer path analysis |
| Edge case (非 token first child) | 213 / 11,889 = 1.8% | extractPPStructure null |
| Fallback 保持件数 (safe) | 845 件 | complex context |

---

## 実装可能性の確認

### データ層 (CONFIRMED)

- `extractPPStructure()` が `{ prepToken, npNode }` を既に返している
- DR フィールド `adv.ppPrep` / `adv.ppNpNode` / `adv.ppNpModInfo` が既に設定されている
- `headDisplayText()` が NP head テキストを既に返している

### 実装変更スコープ (CONFIRMED)

| 変更対象 | 変更内容 | dg-engine.js 変更 |
|---|---|---|
| `index.html` の `_dgRenderAdvPhrases()` | PP 部分を diagonal DOM 構造に置換 | 不要 |
| `index.html` の CSS | `.dg-pp-wrap` / `.dg-pp-diag-row` / `.dg-pp-np-row` 追加 | 不要 |
| `index.html` の `.dg-adv-pp-*` | 旧 inline クラスの役割を新クラスに移行 | 不要 |

**core/dg-engine.js への変更: 不要**

### L-0 確認 (SAFE)

PP diagonal は構造的境界の視覚化のみ。レンダラーが意味的分類（場所/手段/目的/時間）を追加しない。前置詞テキスト・NP head テキストは SR トークン surface を使用。

### 回帰安全性 (CONFIRMED)

- 非 DG gate 章: `_isDGChapter = false` → `_sdRenderNode()` → PP diagonal コードに到達しない
- DG gate 章の非 PP 要素: `adv.ppPrep = undefined` → `else` ブランチ → `displayText()` fallback
- edge case 213 件: `extractPPStructure()` null → fallback 継続

---

## 実装計画 (P6-F-1 実装フェーズ用)

### 変更箇所

```
index.html
  ├── _dgRenderAdvPhrases() (line ~12325)
  │     if (adv.ppPrep && adv.ppNpNode) ブロック
  │     → 現在: div.dg-adv-pp-wrap / span.dg-adv-pp-prep / span.dg-adv-pp-np
  │     → 変更: div.dg-pp-wrap > div.dg-pp-diag-row > div.dg-pp-np-row
  │
  └── CSS (line ~4486)
        → .dg-adv-pp-* を .dg-pp-* に置換
        → diagonal line: CSS transform: rotate() でP
```

### 新規 CSS 構造

```css
.dg-pp-wrap      { display: flex; flex-direction: column; ... }
.dg-pp-diag-row  { display: flex; align-items: flex-end; ... }
.dg-pp-diag-line { transform: rotate(-38deg); border-top: 2px solid ...; ... }
.dg-pp-prep      { font-weight: 600; ... }
.dg-pp-np-row    { display: flex; align-items: baseline; margin-left: ...; ... }
.dg-pp-np        { color: var(--text-main); border-bottom: 1px solid ...; ... }
```

### 実装優先順位

1. fn:ADVERBIAL の PP (8,912 件) — primary target
2. governed NP 内の nested PP (994 件)
3. モバイル 390px CSS 調整

---

## 制約・注意事項 (実装時)

| 制約 | 内容 |
|---|---|
| dg-engine.js 変更禁止 | DR フィールドは変更不要。renderer のみ変更 |
| SR schema 変更禁止 | PREP_PHRASE は SR SSOT のまま |
| semantic ラベル追加禁止 | L-0 — 場所/手段/目的の分類不可 |
| slot modifier PP (954 件) | P6-F-1 scope 外 — 別途 P6-F-2 等で判断 |
| DA hidden 維持 | DA non-visible 状態は変更しない |
| 既存 SD fallback 保持 | `_sdRenderNode()` は削除・変更しない |
| Structure Flow / ICL 変更禁止 | P6-F-1 scope 外 |

---

## P6-F-1 実装フェーズの Entry Criteria

P6-F-1 実装を開始するには以下の全条件を満たすこと:

1. ✅ P6-F.1 設計監査 PASS (本 document)
2. P6-F-1 実装の明示的承認
3. dg-engine.js 変更なし の確認
4. 実装は index.html + CSS のみ
5. 実装後: T-1〜T-9 テストマトリクス全項目実行

---

## 作成物

| ファイル | 内容 |
|---|---|
| `docs/development/P6-F.1_pp_diagonal_audit.md` | 8項目監査詳細 (A–H) |
| `docs/development/P6-F.1_pp_relationship_matrix.md` | SR→DR→Renderer パイプライン |
| `docs/development/P6-F.1_test_matrix.md` | T-1〜T-9 テストケース定義 |
| `docs/development/P6-F.1_final_report.md` | 本報告 |

---

## Decision

```
PASS
```

**理由:**

1. `extractPPStructure()` は NT-wide の 98.2% (11,676/11,889) をカバー済み — データ基盤は完備
2. DR フィールド (`adv.ppPrep`, `adv.ppNpNode`, `adv.ppNpModInfo`) は既に実装済み — engine 変更不要
3. L-0 リスクなし — structural boundary の視覚化のみ、意味分類なし
4. Fallback チェーン確認済み — 213 件 edge case と 845 件 deferred は既存 `displayText()` で安全
5. DG gate 章 7章 全 363 PP が extractable — 実装後の即時視覚効果確認可能
6. 実装スコープ明確 — `_dgRenderAdvPhrases()` + CSS のみ、dg-engine.js 変更なし
7. 回帰安全性確認済み — 非 DG gate 章 / 非 PP 要素 / SD fallback に影響なし

**LIMITATIONS: なし**

8項目全ての監査が CONFIRMED / SAFE / FEASIBLE。実装を P6-F-1 として承認する準備が整っている。

---

STOP.

---

*Parent: P6-E_final_report.md (PASS WITH LIMITATIONS)*  
*Next: P6-F-1 実装フェーズ (ユーザー承認後)*
