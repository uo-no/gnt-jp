# Stage 4 Phase 4aw — Phase 4av 提案に基づく inventory 更新報告

**Phase**: 4aw
**実施日**: 2026-11-04
**種別**: inventory state 変更のみ（Bible JSON・lexicon・search-index・engine 変更なし）

---

## 1. 作業前確認

| 項目 | 値 |
|------|-----|
| branch | data/ja1955-nt-approved-132 |
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| origin HEAD | ba5c55a3ff6d76a37ee7a6edd31f2c81f639d356 |
| 変更前 inventory SHA256 | 5314664fc69d7e219d439d2a42552774bf0d8756e4032560da91f5f6f9ea03ae |
| 承認根拠 | stage4-phase4av-proposed-inventory-diff.json (218件) |

---

## 2. 変更前 state

| state | 件数 |
|-------|------|
| UNREVIEWED | 33,335 |
| RETAIN_CONFIRMED | 59,244 |
| IMPLEMENTED_AND_VERIFIED | 365 |
| HOLD_DATA_QUALITY | 7 |
| HOLD_CONTEXT | 1 |
| **合計** | **92,952** |

---

## 3. 適用変更の内訳

### 3.1 UNREVIEWED → IMPLEMENTED_AND_VERIFIED（100件）

| 対象 | 件数 | 根拠 Phase | 訳語変更 |
|------|------|-----------|---------|
| G3762 οὐδείς（中性・女性形 APPROVE_NANIMO） | 93 | Phase 4as | 誰も〜ない → 何も〜ない |
| G3056 λόγος N-ASM（APPROVE_MOSHIHIRAKI 6件 + APPROVE_OTHER_GLOSS 1件） | 7 | Phase 4au | ことば → 申し開き / 著述 |

### 3.2 UNREVIEWED → RETAIN_CONFIRMED（117件）

| 対象 | 件数 | 根拠 Phase | 根拠 |
|------|------|-----------|-----|
| G3762 LUK 4:26!3（RETAIN_DAREMO） | 1 | Phase 4ar | αὐτῶν = 人物参照、誰も〜ない 維持 |
| G3056 λόγος N-ASM RETAIN_KOTOBA 116件 | 116 | Phase 4at | 個別監査で ことば 維持確認済み |

### 3.3 UNREVIEWED → HOLD_CONTEXT（1件）

| ref | 根拠 Phase | 理由 |
|-----|-----------|-----|
| PHP 4:15!15 | Phase 4ar | G3762 ἐκκλησία（女性名詞・集団体）: 誰も vs 何も は L-0設計判断待ち |

---

## 4. 変更後 state

| state | 件数 | 変化 |
|-------|------|------|
| UNREVIEWED | 33,117 | **−218** |
| RETAIN_CONFIRMED | 59,361 | **+117** |
| IMPLEMENTED_AND_VERIFIED | 465 | **+100** |
| HOLD_DATA_QUALITY | 7 | 0 |
| HOLD_CONTEXT | 2 | **+1** |
| **合計** | **92,952** | **0** ✓ |

---

## 5. 事後検証

| チェック | 期待値 | 実測値 | 判定 |
|---------|--------|--------|------|
| V1 総件数 = 92,952 | 92,952 | 92,952 | ✓ PASS |
| V2 ref 重複なし | 92,952 unique | 92,952 unique | ✓ PASS |
| V3 state 別件数（全5種） | 上表参照 | 一致 | ✓ PASS |
| V4 変更 218件の新 state 正確 | 218 | 218 | ✓ PASS |
| V5 G3762 masculine 119件は UNREVIEWED のまま | 119 | 119 | ✓ PASS |
| V6 HOLD_DATA_QUALITY 7件 不変 | 7件 | 7件 | ✓ PASS |
| V7 ACT 3:13!27 HOLD_CONTEXT 不変 | HOLD_CONTEXT | HOLD_CONTEXT | ✓ PASS |
| V8 PHP 4:15!15 → HOLD_CONTEXT | HOLD_CONTEXT | HOLD_CONTEXT | ✓ PASS |
| V9 LUK 4:26!3 → RETAIN_CONFIRMED | RETAIN_CONFIRMED | RETAIN_CONFIRMED | ✓ PASS |
| V10 合計 = 92,952 | 92,952 | 92,952 | ✓ PASS |

**事後検証: PASS（10/10）**

---

## 6. 除外確認（変更禁止対象）

| 対象 | 除外理由 | 確認 |
|------|---------|------|
| G3762 masculine 119件（A-NSM-N:90 / A-ASM-N:14 / A-GSM-N:9 / A-DSM-N:6） | 個別確認未実施 → 別フェーズ | ✓ 全件 UNREVIEWED のまま |
| G3708 V-RAP 20件 | L-0設計判断保留 | ✓ 変更なし |
| G4183 39件 | 個別監査未実施 | ✓ 変更なし |
| G2983 22件 | 個別監査未実施 | ✓ 変更なし |
| G4160 21件 | 個別監査未実施 | ✓ 変更なし |
| 既存 RETAIN_CONFIRMED 59,244件 | 変更対象外 | ✓ 全件不変 |
| 既存 HOLD_DATA_QUALITY 7件 | 変更対象外 | ✓ 全件不変 |
| ACT 3:13!27 HOLD_CONTEXT | 既存保留 | ✓ 不変 |

---

## 7. 成果物一覧

| ファイル | 内容 |
|---------|------|
| `stage4-phase4ag-residual-inventory.json` | 更新済み inventory（218件変更） |
| `stage4-phase4aw-inventory-update-diff.json` | 218件の変更前後 state・根拠 Phase |
| `stage4-phase4aw-inventory-verification.json` | 全検証チェック結果 |
| `stage4-phase4aw-inventory-update-report.md` | 本ファイル |

---

## 8. 未変更ファイル

- Bible JSON（bible_data/）— 変更なし
- reading-lexicon-data.js — 変更なし
- public/search-index/ — 変更なし
- reading-engine.js — 変更なし
- regression baseline — 変更なし
- commit / push / PR なし

---

## 9. 判定

**PHASE 4aw PASS**

| 条件 | 判定 |
|------|------|
| 承認 218件のみ state 変更 | ✓ PASS |
| 変更前 state = UNREVIEWED の全件 | ✓ PASS |
| 変更後 state が提案どおり | ✓ PASS |
| G3762 masculine 119件は UNREVIEWED 維持 | ✓ PASS |
| exception_risk 221件は不変 | ✓ PASS |
| 既存 HOLD 全件不変 | ✓ PASS |
| 総件数 92,952 維持 | ✓ PASS |
| Bible JSON / lexicon / search-index 変更なし | ✓ PASS |

---

## 10. 更新後の inventory 要約

| state | 件数 |
|-------|------|
| UNREVIEWED | 33,117 |
| RETAIN_CONFIRMED | 59,361 |
| IMPLEMENTED_AND_VERIFIED | 465 |
| HOLD_DATA_QUALITY | 7 |
| HOLD_CONTEXT | 2 |
| **合計** | **92,952** |

---

## 11. 次フェーズへの申し送り

| 優先 | 対象 | 件数 | 推奨アクション |
|------|------|------|------------|
| 高 | G3762 masculine 再分類 | 119 | 個別確認後 RETAIN_CONFIRMED 昇格 |
| 中 | G3708 V-RAP 設計判断 | 20 | L-0 判断後 RETAIN_CONFIRMED or HOLD |
| 中 | G4183/G2983/G4160 例外監査 | 82 | 個別監査後 RETAIN_CONFIRMED or IMPL |
| 低 | PHP 4:15!15 L-0 設計判断 | 1 | HOLD_CONTEXT → 設計決定後 IMPL |
| 低 | HOLD_DATA_QUALITY 解決 | 7 | 別途 Data Quality フェーズ |
| — | 残余 UNREVIEWED | ~32,996 | Tier 3〜7 未分類（長期作業） |
