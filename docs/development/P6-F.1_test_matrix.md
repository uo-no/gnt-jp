# P6-F.1 — Test Matrix

**Phase:** P6-F.1 — PP Diagonal Notation  
**Date:** 2026-08-25  
**State:** AUDIT-COMPLETE (design phase)  
**Note:** テストケースは P6-F-1 実装後に実行する。本 document は設計フェーズの事前定義。

---

## 検証レベル

| Level | 内容 | 適用 |
|---|---|---|
| L1 | 静的コード監査 | ✅ P6-F-1 実装後 |
| L2 | DOM 検証 (Playwright) | ✅ P6-F-1 実装後 |
| L3 | 視覚確認 (screenshot) | ✅ P6-F-1 実装後 |
| L4 | 回帰: 既存 DG 機能 | ✅ P6-F-1 実装後 |
| L5 | モバイル 390px | ✅ P6-F-1 実装後 |

---

## T-1: 基本 PP diagonal 表示

**対象:** fn:ADVERBIAL の PP (8,912 件代表)  
**章/節:** JHN 1:9 `εἰς τὸν κόσμον`  
**URL:** `?book=JHN&ch=1&transA=STRUCTURAL&mode=single`

| 検証項目 | 期待値 | 検証方法 |
|---|---|---|
| `.dg-pp-wrap` 存在 | 1+ 件 | `querySelectorAll('.dg-pp-wrap').length > 0` |
| `.dg-pp-diag-line` 存在 | prep ごとに1件 | DOM count |
| `.dg-pp-prep` textContent | "εἰς" | textContent チェック |
| `.dg-pp-np` textContent | "κόσμον" (head) | textContent チェック |
| `.dg-adv-fn` textContent | "副詞的" | textContent チェック |
| `.dg-adv-pp-wrap` 消滅 | 0件 | 旧クラス不存在 |
| inline PP (旧形式) 不存在 | 0件 | `.dg-adv-pp-wrap` count = 0 |

**PASS条件:** 全項目一致

---

## T-2: Nested PP (PP内PP)

**対象:** PP の governed NP を修飾する nested PP (994 件代表)  
**章/節:** EPH 2:2 等 (nested PP を含む節)

| 検証項目 | 期待値 | 検証方法 |
|---|---|---|
| 上位 PP に diagonal 表示 | あり | `.dg-pp-wrap` 存在 |
| NP modifier として nested PP が表示 | あり | `.dg-adv-item` (nested) 存在 |
| Nested PP のテキスト正確 | SR surface と一致 | textContent |

**PASS条件:** 上位 PP は diagonal。nested は modifier ゾーンで表示継続。

---

## T-3: Edge case — non-token first child (213 件)

**対象:** `extractPPStructure()` が null を返すケース  
**期待挙動:** 旧 `displayText(adv.node)` フォールバック (変更なし)

| 検証項目 | 期待値 | 検証方法 |
|---|---|---|
| `adv.ppPrep` 未設定ノード | `displayText()` 表示 | `.dg-adv-text` 存在 |
| 例外 / エラー なし | console.error = 0 | page.on('console') |
| `.dg-pp-wrap` 不存在 (この node) | 0件 | DOM |

**PASS条件:** エラーなし、フォールバック正常表示

---

## T-4: 複数 PP が同一節内に存在するケース

**対象:** EPH 2:8 (2+ PP), ROM 6:10 (dative PP)

| 検証項目 | 期待値 |
|---|---|
| 全 PP が個別に diagonal 表示 | `.dg-pp-wrap` の数 = 節内 PP 数 |
| PP 間の縦方向積み重なり | `.dg-adv-list` flex-column で自然に配置 |
| 各 PP の前置詞テキスト正確 | SR トークン surface と一致 |
| 各 PP の NP head テキスト正確 | `headDisplayText()` と一致 |

---

## T-5: DG gate 章全体の網羅確認

| 章 | 確認内容 | 期待値 |
|---|---|---|
| JHN 1 | `.dg-pp-wrap` 総数 | ≧ 40 (fn:ADVERBIAL PP 数) |
| MAT 5 | `.dg-pp-wrap` 総数 | ≧ 45 |
| EPH 2 | `.dg-pp-wrap` 総数 | ≧ 38 |
| ROM 6 | `.dg-pp-wrap` 総数 | ≧ 38 |
| PHP 2 | `.dg-pp-wrap` 総数 | ≧ 32 |
| COL 1 | `.dg-pp-wrap` 総数 | ≧ 46 |
| MAT 28 | `.dg-pp-wrap` 総数 | ≧ 13 |

---

## T-6: 回帰 — 既存 DG 機能

**対象:** P6-F-1 実装前後で変わらないべき機能

| 機能 | 確認対象章/節 | 期待値 |
|---|---|---|
| 主語/述語 main line | JHN 1:1 | `.dg-conn-sp` 存在 |
| 補語 diagonal connector | EPH 2:8 | `.dg-conn-complement` 存在 |
| 分詞節 italic | EPH 2:5 | `.dg-adv-clause-participial` 存在 |
| 関係節 connector (P6-C) | JHN 1:1 | `.dg-rel-clause` 存在 |
| 等位節 left border | JHN 1:1 | `.dg-coord-wrap` 存在 |
| 旧 SD renderer 不存在 | 全 DG gate 章 | `.sd-node` count = 0 |
| `window.DgEngine` 存在 | 全 DG gate 章 | `typeof DgEngine !== 'undefined'` |

**PASS条件:** 全項目が P6-F-1 実装前の値と同一

---

## T-7: 非 DG gate 章 (回帰: SD fallback)

**対象:** DG gate 以外の章 (例: ACT 2, GAL 3)

| 検証項目 | 期待値 |
|---|---|
| `.dg-view` 不存在 | count = 0 |
| `.sd-node` 存在 (旧 renderer) | count > 0 |
| `_isDGChapter = false` | DG 非表示 |

**PASS条件:** 旧 SD renderer が正常動作継続 (PP diagonal 変更の影響なし)

---

## T-8: モバイル 390px

**対象:** JHN 1:9 (単純 PP), EPH 2:8 (複数 PP)

| 検証項目 | 期待値 |
|---|---|
| `.dg-pp-wrap` 表示崩れなし | overflow-x: hidden |
| prep テキスト切れなし | 390px 幅内に収まる |
| NP テキスト切れなし | wrap または省略表示 |
| diagonal 線の傾きが崩れない | CSS transform 維持 |
| 縦スクロールのみ (横なし) | overflow-x: auto でない |

---

## T-9: コンソールエラー 0

**全 DG gate 章にて:**

| 検証項目 | 期待値 |
|---|---|
| JS console.error | 0件 |
| network 404 | 0件 (dg-engine.js は 200) |
| uncaught exceptions | 0件 |

---

## テスト実行順序 (P6-F-1 実装後)

```
1. T-9: エラーチェック (全章)
2. T-1: 基本 diagonal 表示 (JHN 1:9)
3. T-4: 複数 PP (EPH 2:8, ROM 6:10)
4. T-5: 全 7 章網羅
5. T-3: Edge case (fallback)
6. T-6: 回帰チェック
7. T-7: 非 DG 章 (SD fallback 回帰)
8. T-2: Nested PP
9. T-8: モバイル 390px
```

---

## Pass / Fail 判定基準

| 判定 | 条件 |
|---|---|
| **PASS** | T-1〜T-9 全項目 PASS |
| **PASS WITH LIMITATIONS** | T-1〜T-7 PASS、T-8 (mobile) に軽微な調整余地あり |
| **FAIL** | T-6 (回帰) または T-9 (エラー) に FAIL あり |

---

*Refs: P6-F.1_pp_diagonal_audit.md / P6-F.1_pp_relationship_matrix.md / P6-F.1_final_report.md*
