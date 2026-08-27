# P5-C.1 Visual Grammar Hardening — Test Matrix

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
| N/A | 該当なし |

---

## テスト項目 1 — F-01 BUG FIX: EPH 2:8 s4 第2COMPLEMENT

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 1-1 | `dg-conn-implied` 数 (EPH 2:8全体) | ≥ 2 | 2 | ✅ PASS |
| 1-2 | スロットテキスト `τοῦτο` | main lineに存在 | 存在 | ✅ PASS |
| 1-3 | スロットテキスト `ἐξ ὑμῶν,` | main lineに存在 | 存在 | ✅ PASS |
| 1-4 | スロットテキスト `τὸ δῶρον·` | main lineに存在 | 存在 | ✅ PASS |
| 1-5 | 第2COMPLEMENTのコネクタ | implied (破線) | 確認済み (implied×2) | ✅ PASS |

**BEFORE:** `connectorBetween('COMPLEMENT', 'COMPLEMENT', true)` → `null` → 第2COMPLEMENT孤立  
**AFTER:** F-01 fix → `'implied'` → 視覚的に接続

---

## テスト項目 2 — 語レベル修飾添付: MAT 5:3 SUBJECT

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 2-1 | MAT 5 `dg-slot-mod-zone` 数 | ≥ 1 | 8 | ✅ PASS |
| 2-2 | `dg-adv-item` 数 (MAT 5全体) | ≥ 1 | 39 | ✅ PASS |
| 2-3 | modifier zone text に `τῷ πνεύματι` | 存在 | 存在 | ✅ PASS |
| 2-4 | modifier zone label | `副詞的修飾` | `副詞的修飾` | ✅ PASS |
| 2-5 | main line SUBJECT text | `οἱ πτωχοί` (τῷ πνεύματι を含まない) | `οἱ πτωχοί` | ✅ PASS |
| 2-6 | modifier L-bracket (CSS) | `dg-adv-connector` 要素存在 | 存在 | ✅ PASS |
| 2-7 | Desktop 1280px 目視 | τῷ πνεύματι が main line 下に表示 | CONFIRMED (screenshot) | ✅ PASS |
| 2-8 | Mobile 390px 目視 | 同上 | CONFIRMED (screenshot) | ✅ PASS |

---

## テスト項目 3 — 語レベル修飾添付: MAT 5:3 ὅτι 節内 SUBJECT

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 3-1 | modifier zone text に `τῶν οὐρανῶν` | 存在 | 存在 | ✅ PASS |
| 3-2 | modifier zone label | `属格修飾` | `属格修飾` | ✅ PASS |
| 3-3 | ὅτι 節 main line SUBJECT text | `ἡ βασιλεία` (τῶν οὐρανῶν を含まない) | `ἡ βασιλεία` | ✅ PASS |
| 3-4 | Desktop 1280px 目視 | τῶν οὐρανῶν が ἡ βασιλεία 下に表示 | CONFIRMED (screenshot) | ✅ PASS |
| 3-5 | Mobile 390px 目視 | 同上 | CONFIRMED (screenshot) | ✅ PASS |

---

## テスト項目 4 — 語レベル修飾添付: EPH 2:8 s4 COMPLEMENT

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 4-1 | EPH 2:8 `dg-slot-mod-zone` 数 | ≥ 1 | 2 | ✅ PASS |
| 4-2 | modifier text に `θεοῦ` | 存在 | 存在 | ✅ PASS |
| 4-3 | modifier label | `属格修飾` | `属格修飾` | ✅ PASS |
| 4-4 | COMPLEMENT main line text | `τὸ δῶρον·` (θεοῦ を含まない) | `τὸ δῶρον·` | ✅ PASS |

---

## テスト項目 5 — 従属節 L-bracket 接続

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 5-1 | `dg-adv-clause-attach` 数 (MAT 5全体) | ≥ 1 | 28 | ✅ PASS |
| 5-2 | MAT 5:3 ὅとι節前に attach 要素 | 存在 | 確認済み | ✅ PASS |
| 5-3 | Desktop 1280px 目視 | └ 形状が 従属節ラベル前に表示 | CONFIRMED (screenshot) | ✅ PASS |
| 5-4 | Mobile 390px 目視 | 同上 | CONFIRMED (screenshot) | ✅ PASS |
| 5-5 | MAT 5:1 adverbial phrase 前の attach | 存在 | 確認済み (└ visible) | ✅ PASS |

---

## テスト項目 6 — 等位節 並列表示 (JHN 1:1)

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 6-1 | `dg-coord-wrap` 存在 | 存在 | 存在 | ✅ PASS |
| 6-2 | `dg-coord-wrap` border-left | 2px solid (色付き) | `2px solid rgb(110, 110, 115)` | ✅ PASS |
| 6-3 | `dg-coord-wrap` padding-left | > 0 | `8.8px` | ✅ PASS |
| 6-4 | Desktop 1280px 目視 | 3節が左縦線で束ねられた並列表示 | CONFIRMED (screenshot) | ✅ PASS |
| 6-5 | Mobile 390px 目視 | 同上、横overflow なし | CONFIRMED (screenshot) | ✅ PASS |
| 6-6 | Mobile coordination border-left | 2px solid | `2px solid rgb(110, 110, 115)` | ✅ PASS |

---

## テスト項目 7 — 回帰テスト (ROM 6: P5 gate 外の章)

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 7-1 | `sd-sentence` 数 | > 0 | 27 | ✅ PASS |
| 7-2 | `dg-clause` 数 | 0 (P5 gate対象外) | 0 | ✅ PASS |
| 7-3 | `sd-empty` 存在 | 非存在 | 非存在 | ✅ PASS |
| 7-4 | ギリシャ語トークン表示 | 存在 (`sd-greek`) | 存在 | ✅ PASS |
| 7-5 | コンソールエラー | 0件 | 0件 | ✅ PASS |

**注:** P5 gate は JHN 1 / MAT 5 / EPH 2 のみ DG renderer を有効にする（コード上で明示）。ROM 6 は旧 SD ツリーレンダラで描画されることが正しい挙動。

---

## テスト項目 8 — L-0 境界

| # | 検証項目 | 確認方法 | 結果 |
|---|---|---|---|
| 8-1 | 含意主語 (ὑμεῖς 等) の非追加 | スロットテキスト目視 + EPH 2:8 s3確認 | ✅ PASS |
| 8-2 | referent解決の非実施 | extractSlotModifiers コードレビュー | ✅ PASS |
| 8-3 | 新しいsemantic推論の非導入 | morph_raw 参照のみ確認 | ✅ PASS |
| 8-4 | ギリシャ語語順の維持 | surfaceIndex ソート継続確認 | ✅ PASS |

---

## 総合サマリー

| 項目 | PASS | FAIL | WARN | N/A |
|---|---|---|---|---|
| F-01 BUG FIX | 5 | 0 | 0 | 0 |
| 語レベル修飾 (MAT 5:3 SUBJECT) | 8 | 0 | 0 | 0 |
| 語レベル修飾 (MAT 5:3 ὅとι内) | 5 | 0 | 0 | 0 |
| 語レベル修飾 (EPH 2:8 s4) | 4 | 0 | 0 | 0 |
| 従属節 L-bracket | 5 | 0 | 0 | 0 |
| 等位節並列 | 6 | 0 | 0 | 0 |
| 回帰 (ROM 6) | 5 | 0 | 0 | 0 |
| L-0 境界 | 4 | 0 | 0 | 0 |
| **合計** | **42** | **0** | **0** | **0** |

**状態: ALL PASS**

---

## スクリーンショット一覧

| ファイル | 内容 | 解像度 |
|---|---|---|
| `D_jhn11_1280.png` | JHN 1章全体 (desktop) | 1280×900 |
| `D_jhn11_coord.png` | JHN 1:1 等位節クロップ | cropped |
| `D_mat53_1280.png` | MAT 5章全体 (desktop) | 1280×900 |
| `D_mat53_sentence.png` | MAT 5:3 文クロップ | cropped |
| `D_eph28_1280.png` | EPH 2章全体 (desktop) | 1280×900 |
| `D_eph28_s4_sentence.png` | EPH 2:8 s4 文クロップ | cropped |
| `D_rom6_regression_final.png` | ROM 6 回帰確認 | 1280×900 |
| `M_jhn11_390.png` | JHN 1:1 mobile | 390×844 |
| `M_mat53_390.png` | MAT 5:3 mobile | 390×844 |

*スクリーンショット保存先: scratchpad/shots/*
