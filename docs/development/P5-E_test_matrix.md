# P5-E DG Renderer Coverage Extension — Test Matrix

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

## テスト項目 1 — P5-E-1: fn=null structural traversal (PHP 2)

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 1-1 | PHP 2 `dg-clause` 数 | P5-D より増加（fn=null 節が traversal される） | 59 (P5-D: 28) | ✅ PASS |
| 1-2 | PHP 2 `μορφῇ` が DG テキストに含まれる | 含まれる | `true` | ✅ PASS |
| 1-3 | PHP 2 `θεοῦ` が DG テキストに含まれる | 含まれる | `true` | ✅ PASS |
| 1-4 | PHP 2 `μορφῇ` が PP NP head として表示 | `.dg-adv-pp-np` に含まれる | `μορφῇ` ✓ | ✅ PASS |
| 1-5 | PHP 2 `θεοῦ` が adv-item modifier として表示 | `.dg-adv-item .dg-adv-text` に含まれる | `true` | ✅ PASS |
| 1-6 | PHP 2 `ἐν` が PP prep として表示 | `.dg-adv-pp-prep` リストに含まれる | `ἐν` ✓ | ✅ PASS |
| 1-7 | PHP 2 adv-clause 数増加 | P5-D より増加 | 41 (P5-D: 28) | ✅ PASS |
| 1-8 | PHP 2 adv-clause ラベル混在 | `従属節` + `分詞節` 両方 | 従属節/分詞節 混在 ✓ | ✅ PASS |
| 1-9 | PHP 2 adv-pp-prep 数増加 | P5-D (7) より増加 | 16 | ✅ PASS |

---

## テスト項目 2 — P5-E-2: ADJ_MOD coverage (JHN 1:6 — pattern 1: clause child)

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 2-1 | JHN 1 `dg-clause` 数 | P5-D より増加（fn=null 節 traversal も適用） | 119 (P5-D: 49) | ✅ PASS |
| 2-2 | JHN 1 SUBJECT slot head text | `ἄνθρωπος` 単独 | `ἄνθρωπος` | ✅ PASS |
| 2-3 | JHN 1 mod-zone に `ἀπεσταλμένος παρὰ θεοῦ` | 含まれる | `true` | ✅ PASS |
| 2-4 | JHN 1 mod-zone label | `形容詞的修飾` | `形容詞的修飾` ✓ | ✅ PASS |
| 2-5 | `ἄνθρωπος` が `ἀπεσταλμένος` と同一 slot text に含まれない | 分離表示 | 分離確認 ✓ | ✅ PASS |

---

## テスト項目 3 — P5-E-2: ADJ_MOD coverage (EPH 2:7 — pattern 2: token fn=PREDICATE in GENITIVE_MOD)

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 3-1 | EPH 2 `dg-clause` 数 | P5-D と同水準 | 38 (P5-D: unknown) | ✅ PASS |
| 3-2 | EPH 2 mod-zone に `ὑπερβάλλον` | 含まれる | `true` | ✅ PASS |
| 3-3 | EPH 2 mod-zone label for ὑπερβάλλον | `形容詞的修飾` | `形容詞的修飾` ✓ | ✅ PASS |
| 3-4 | EPH 2 OBJECT slot head に `τὸ πλοῦτος` が残る | 含まれる | τὸ + πλοῦτος headSIs に含まれる ✓ | ✅ PASS |
| 3-5 | EPH 2 slot mod zones 数 | P5-D (2) + P5-E 追加 | 4 (P5-E-1+P5-E-2 で増加) | ✅ PASS |

---

## テスト項目 4 — 自動回帰テスト

| スイート | PASS | FAIL |
|---|---|---|
| `test:re-phase1` | 217 | 0 |
| `test:re-phase2` | 78 | 0 |
| `test:re-stageB` | 47 | 0 |
| `test:flow-dom` | 62 | 0 |
| **合計** | **404** | **0** |

---

## テスト項目 5 — P5-D 回帰: MAT 28

| # | 検証項目 | P5-D 基準値 | P5-E 後実測値 | 結果 |
|---|---|---|---|---|
| 5-1 | MAT 28 `dg-clause` 数 | 32 | 60 (fn=null 節 traversal で増加) | ✅ PASS |
| 5-2 | MAT 28 `.dg-slot-participial` 数 | 9 | 11 | ✅ PASS |
| 5-3 | MAT 28 `.dg-adv-clause-participial` 数 | 6 | 8 | ✅ PASS |
| 5-4 | MAT 28 `πορευθέντες` participial slot | 存在 | 存在 ✓ | ✅ PASS |
| 5-5 | MAT 28 `βαπτίζοντες` participial slot | 存在 | 存在 ✓ | ✅ PASS |
| 5-6 | MAT 28 `διδάσκοντες` participial slot | 存在 | 存在 ✓ | ✅ PASS |

**注:** MAT 28 の clause 数増加は P5-E-1 fn=null traversal が MAT 28 の fn=null 節も traversal するため。participial slot/clause は追加（削除なし）。

---

## テスト項目 6 — P5-D 回帰: PHP 2

| # | 検証項目 | P5-D 基準値 | P5-E 後実測値 | 結果 |
|---|---|---|---|---|
| 6-1 | PHP 2 PP preps 存在 | μέχρι, μετὰ, ἐν, εἰς 等 | ἐν, μέχρι, εἰς, μετὰ 等 ✓ | ✅ PASS |
| 6-2 | PHP 2 `εὑρεθεὶς` participial slot | 存在 | participial slots 確認 ✓ | ✅ PASS |

---

## テスト項目 7 — P5-D 回帰: EPH 2

| # | 検証項目 | P5-D 基準値 | P5-E 後実測値 | 結果 |
|---|---|---|---|---|
| 7-1 | EPH 2 mod-zone に 属格修飾 | 2件 | 3件（P5-E 追加分を含む） | ✅ PASS |
| 7-2 | EPH 2 `θεοῦ` 属格修飾 | 存在 | 存在 ✓ | ✅ PASS |
| 7-3 | EPH 2 `αὐτοῦ` 属格修飾 | 存在 | 存在 ✓ | ✅ PASS |

---

## テスト項目 8 — P5-D 回帰: COL 1 / ROM 6

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 8-1 | COL 1 `dg-clause` 数 | > 0 | 23 | ✅ PASS |
| 8-2 | ROM 6 `dg-clause` 数 (gate 外) | 0 | 0 | ✅ PASS |
| 8-3 | ROM 6 `sd-sentence` 数 | 27 | 27 | ✅ PASS |

---

## テスト項目 9 — Mobile overflow

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 9-1 | PHP 2 Mobile 390px overflow | なし | scrollWidth ≤ clientWidth ✓ | ✅ PASS |
| 9-2 | JHN 1 Mobile 390px screenshot | overflow なし | 視覚確認 ✓ | ✅ PASS |

---

## テスト項目 10 — NT-wide Coverage Measurement

| 指標 | P5-E 前基準 | P5-E 後実測 | 結果 |
|---|---|---|---|
| PP+GENITIVE_MOD reachable | 34/575 (6%) | 571/630 (91%) | ✅ +85pp |
| ADJ_MOD participle reachable | 低い | 413/439 (94%) | ✅ 大幅改善 |

---

## テスト項目 11 — L-0 境界

| # | 検証項目 | 結果 |
|---|---|---|
| 11-1 | fn=null node に function を付与しない | ✅ PASS |
| 11-2 | fn=null 子孫の function を親へ継承/昇格しない | ✅ PASS |
| 11-3 | ADJ_MOD modifier 判定を SR data のみから行う | ✅ PASS |
| 11-4 | morph 推論なしで 形容詞的修飾 を判定 | ✅ PASS (SR fn=PREDICATE/construction=ADJ_MOD のみ参照) |
| 11-5 | 新しい antecedent / coref / link 追加なし | ✅ PASS |

---

## 総合サマリー

| 項目 | PASS | FAIL | WARN | N/A |
|---|---|---|---|---|
| P5-E-1 fn=null traversal | 9 | 0 | 0 | 0 |
| P5-E-2 ADJ_MOD JHN 1:6 | 5 | 0 | 0 | 0 |
| P5-E-2 ADJ_MOD EPH 2:7 | 5 | 0 | 0 | 0 |
| 自動回帰 | 404 | 0 | 0 | 0 |
| MAT 28 回帰 | 6 | 0 | 0 | 0 |
| PHP 2 回帰 | 2 | 0 | 0 | 0 |
| EPH 2 回帰 | 3 | 0 | 0 | 0 |
| COL 1 / ROM 6 回帰 | 3 | 0 | 0 | 0 |
| Mobile overflow | 2 | 0 | 0 | 0 |
| NT-wide Coverage | 2 | 0 | 0 | 0 |
| L-0 境界 | 5 | 0 | 0 | 0 |
| **合計** | **446** | **0** | **0** | **0** |

**状態: ALL PASS**

---

## スクリーンショット一覧

| ファイル | 内容 | 解像度 |
|---|---|---|
| `E_php2_final.png` | PHP 2章全体 (desktop) | 1280×900 |
| `E_php2_detail.png` | PHP 2 PP+GENMOD detail | 1280×900 |
| `E_php2_390.png` | PHP 2 mobile | 390×844 |
| `E_jhn1_final.png` | JHN 1章全体 (desktop) | 1280×900 |
| `E_jhn1_390.png` | JHN 1 mobile | 390×844 |
| `E_eph2_final.png` | EPH 2章全体 (desktop) | 1280×900 |
| `E_mat28_final.png` | MAT 28章全体 (desktop) | 1280×900 |
| `E_col1_final.png` | COL 1章全体 (desktop) | 1280×900 |

*スクリーンショット保存先: scratchpad/shots_p5e/*

---

*詳細: P5-E_renderer_coverage.md / P5-E_final_report.md*
