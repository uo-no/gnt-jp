# P5-D Visual Grammar Core — Test Matrix

**Phase:** P5 — Original Greek NT Diagram Grammar  
**Date:** 2026-08-20  
**Viewport:** Desktop 1280px + Mobile 390px  
**Evidence level:** CONFIRMED (Playwright screenshots + DOM measurements)

---

## グレードスケール

| 記号 | 意味 |
|---|---|
| ✅ PASS | 検証完了、期待通り |
| ❌ FAIL | 期待と異なる |
| ⚠️ WARN | 機能するが注記あり |
| N/A | 該当なし / DESIGN GAP |

---

## テスト項目 1 — P5 Gate 拡張

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 1-1 | MAT 28 `dg-clause` 数 | > 0 | 32 | ✅ PASS |
| 1-2 | PHP 2 `dg-clause` 数 | > 0 | 28 | ✅ PASS |
| 1-3 | COL 1 `dg-clause` 数 | > 0 | 11 | ✅ PASS |
| 1-4 | ROM 6 `dg-clause` 数 (gate 外) | 0 | 0 | ✅ PASS |
| 1-5 | ROM 6 `sd-sentence` 数 | 27 | 27 | ✅ PASS |

---

## テスト項目 2 — P5-D-1: 分詞スロット検出

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 2-1 | MAT 28 `.dg-slot-participial` 数 | ≥ 3 | 9 | ✅ PASS |
| 2-2 | PHP 2 `.dg-slot-participial` 数 | ≥ 1 | 1 | ✅ PASS |
| 2-3 | COL 1 `.dg-slot-participial` 数 | ≥ 1 | 2 | ✅ PASS |
| 2-4 | MAT 28 participial slot text に `πορευθέντες` | 存在 | `πορευθέντες` ✓ | ✅ PASS |
| 2-5 | MAT 28 participial slot text に `βαπτίζοντες` | 存在 | `βαπτίζοντες` ✓ | ✅ PASS |
| 2-6 | MAT 28 participial slot text に `διδάσκοντες` | 存在 | `διδάσκοντες` ✓ | ✅ PASS |
| 2-7 | PHP 2 participial slot text | `εὑρεθεὶς` | `εὑρεθεὶς` ✓ | ✅ PASS |
| 2-8 | CSS italic on participial text | `font-style: italic` | 確認済み | ✅ PASS |

---

## テスト項目 3 — P5-D-1: 分詞節ラベル (`分詞節`)

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 3-1 | MAT 28 `.dg-adv-clause-participial` 数 | ≥ 3 | 6 | ✅ PASS |
| 3-2 | `.dg-adv-clause-participial .dg-adv-clause-label` text | `分詞節` | `分詞節` (全6件) | ✅ PASS |
| 3-3 | MAT 28 adv-clause ラベル混在 | `従属節` + `分詞節` 両方存在 | `従属節` × 9, `分詞節` × 6 | ✅ PASS |
| 3-4 | Desktop 1280px 目視 | 分詞節ラベルが italic で表示 | CONFIRMED (screenshot) | ✅ PASS |
| 3-5 | Mobile 390px overflow check | scrollWidth ≤ clientWidth | scrollWidth=294, clientWidth=294, no overflow | ✅ PASS |

---

## テスト項目 4 — P5-D-1: ADVERBIAL group 内の複数分詞節

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 4-1 | MAT 28:19 `βαπτίζοντες` + `διδάσκοντες` が別々の adverbialClause | 両方 `.dg-adv-clause` として存在 | 確認済み (participial slot text に両方) | ✅ PASS |

---

## テスト項目 5 — P5-D-2: 関係代名詞 → 先行詞コネクタ

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 5-1 | JHN 1:15 `ὅν` [R-ASM] の先行詞コネクタ | DESIGN GAP — SR に antecedent link なし | 表示なし (L-0 準拠) | N/A |
| 5-2 | PHP 2:6 `ὅς` [R-NSM] の先行詞コネクタ | DESIGN GAP — SR に antecedent link なし | 表示なし (L-0 準拠) | N/A |

**判定:** SR が SSOT。antecedent link を SR が持たない以上、ビジュアル接続は実装不可。L-0 境界を維持した正しい判断。

---

## テスト項目 6 — P5-D-3: PP 内部構造 (前置詞分離表示)

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 6-1 | PHP 2 `.dg-adv-pp-prep` 数 | ≥ 5 | 7 | ✅ PASS |
| 6-2 | PHP 2 PP prep text サンプル | `μέχρι`, `μετὰ`, `ἐν`, `εἰς` 等を含む | `μέχρι, μετὰ, χωρὶς, ἐν, σὺν, εἰς, ἐπὶ` | ✅ PASS |
| 6-3 | PHP 2 `.dg-adv-pp-np` 数 | prep 数と一致 | 7 (一致) | ✅ PASS |
| 6-4 | EPH 2 PP prep tokens | ≥ 5 | 9 | ✅ PASS |
| 6-5 | MAT 5 PP prep tokens | ≥ 3 | 5 (first 5) | ✅ PASS |
| 6-6 | PP prep text に前置詞が正しく表示 | `ἐν`, `εἰς`, `κατὰ` 等 | CONFIRMED | ✅ PASS |
| 6-7 | `.dg-adv-pp-prep` CSS `font-weight: 600` | bold | 確認済み (CSS定義) | ✅ PASS |
| 6-8 | Desktop 1280px 目視 | 前置詞が NP と視覚的に分離 | CONFIRMED (screenshot) | ✅ PASS |

---

## テスト項目 7 — P5-D-4: PP内部の属格修飾語

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 7-1 | コードの正確性 | `extractSlotModifiers(ppNpNode)` が GENITIVE_MOD を検出 | コード確認済み | ✅ PASS |
| 7-2 | `ἐν μορφῇ θεοῦ` (PHP 2:6) のネスト modifier | 表示 | DEFERRED — PHP 2:5 の ὅς 節は root から fn パスなし (SR fn-depth 制限) | ⚠️ DEFERRED |
| 7-3 | DOM 順正確性 | `.dg-adv-item` (modifier) が row の後に配置 | `ppNpModItems` array で収集後 `item.appendChild(row)` 後に append | ✅ PASS |

**注:** `ἐν μορφῇ θεοῦ` が現れる ὅς 節は、root clause の fn なし子 ([2]) の中にネストされており、`deriveClauseCore` が fn を持たない子をスキップするため未到達。SR の構造的制限（別 Phase 対象）。

---

## テスト項目 8 — 回帰テスト: P5-C.1 継続動作

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 8-1 | JHN 1 `dg-clause` 数 | 49 | 49 | ✅ PASS |
| 8-2 | JHN 1 coord border-left | `2px solid rgb(110, 110, 115)` | `2px solid rgb(110, 110, 115)` | ✅ PASS |
| 8-3 | JHN 1 mod-zone 数 | 2 | 2 | ✅ PASS |
| 8-4 | EPH 2 implied connector 数 | 2 | 2 | ✅ PASS |
| 8-5 | EPH 2 mod-zone 数 | 2 | 2 | ✅ PASS |
| 8-6 | MAT 5 mod-zone 数 | 8 | 8 | ✅ PASS |
| 8-7 | MAT 5 adv-item 数 | ≥ 39 | 41 (+2: PP modifiers 追加分) | ✅ PASS |
| 8-8 | ROM 6 sd-sentence | 27 | 27 | ✅ PASS |
| 8-9 | ROM 6 dg-clause | 0 | 0 | ✅ PASS |
| 8-10 | JS エラー | 0件 | 0件 | ✅ PASS |

---

## テスト項目 9 — 自動回帰テスト

| スイート | PASS | FAIL |
|---|---|---|
| `test:re-phase1` | 106 + 111 = 217 | 0 |
| `test:re-phase2` | 31 + 47 = 78 | 0 |
| `test:re-stageB` | 20 + 27 = 47 | 0 |
| `test:flow-dom` | 62 | 0 |
| **合計** | **404** | **0** |

---

## テスト項目 10 — L-0 境界

| # | 検証項目 | 結果 |
|---|---|---|
| 10-1 | morph_raw 以外の新推論なし | ✅ PASS |
| 10-2 | antecedent link を SR なしに推論しない | ✅ PASS (DESIGN GAP として記録) |
| 10-3 | SR construction.canonical のみ参照 | ✅ PASS |
| 10-4 | ギリシャ語語順維持 | ✅ PASS |

---

## 総合サマリー

| 項目 | PASS | FAIL | WARN/DEFERRED | N/A |
|---|---|---|---|---|
| P5 gate 拡張 | 5 | 0 | 0 | 0 |
| 分詞スロット検出 | 8 | 0 | 0 | 0 |
| 分詞節ラベル | 5 | 0 | 0 | 0 |
| ADVERBIAL group 複数分詞節 | 1 | 0 | 0 | 0 |
| 関係代名詞先行詞 | 0 | 0 | 0 | 2 |
| PP 内部構造 | 8 | 0 | 0 | 0 |
| PP 内属格修飾語 | 2 | 0 | 1 | 0 |
| 回帰 (P5-C.1) | 10 | 0 | 0 | 0 |
| 自動回帰 | 404 | 0 | 0 | 0 |
| L-0 境界 | 4 | 0 | 0 | 0 |
| **合計** | **447** | **0** | **1** | **2** |

**状態: ALL PASS (DEFERRED 1件は SR 構造的制限、DESIGN GAP 2件は L-0 準拠)**

---

## スクリーンショット一覧

| ファイル | 内容 | 解像度 |
|---|---|---|
| `D_mat28_1280.png` | MAT 28章全体 (desktop) | 1280×900 |
| `D_mat28_crop.png` | MAT 28 分詞スロットクロップ | cropped |
| `D_php2_1280.png` | PHP 2章全体 (desktop) | 1280×900 |
| `D_php2_final.png` | PHP 2 PP構造確認 | 1280×900 |
| `D_php25_crop.png` | PHP 2:5 分詞スロットクロップ | cropped |
| `D_col1_1280.png` | COL 1章全体 (desktop) | 1280×900 |
| `D_eph2_regression.png` | EPH 2 回帰確認 | 1280×900 |
| `M_mat28_390.png` | MAT 28 mobile | 390×844 |

*スクリーンショット保存先: scratchpad/shots_p5d/*
