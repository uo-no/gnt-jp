# Stage 4 Phase 4ai — 既存監査済み196件 再分類報告

**Phase**: 4ai
**実施日**: 2026-11-04
**性格**: Phase 4h 個別確認済みトークンの UNREVIEWED → RETAIN_CONFIRMED 再分類（READ-ONLY 相当）

---

## 1. 概要

Phase 4h（G863/G1210/G2919 全件個別監査）で `changeNeeded=false` と確認された 196 件を、
Phase 4ag の UNREVIEWED から RETAIN_CONFIRMED に昇格した。

| 項目 | 値 |
|------|-----|
| Phase 4h confirmed-OK 総数 | 196 |
| Phase 4ag 照合 | 196/196（全件 UNREVIEWED に存在確認） |
| bible_data 照合 | 196/196（japanese・strong 完全一致） |
| エラー | 0 |
| 整合性チェック | **PASS** |

---

## 2. Strong 別集計

| Strong | lemma | 件数 | bible_data 完全一致 | 差異 |
|--------|-------|------|---------------------|------|
| G863 | ἀφίημι | 47 | 47 | 0 |
| G1210 | δέω | 43 | 43 | 0 |
| G2919 | κρίνω | 106 | 106 | 0 |
| **合計** | | **196** | **196** | **0** |

---

## 3. 状態変化（Phase 4ag 更新後）

| state | 変更前 | 変更後 | 差分 |
|-------|--------|--------|------|
| UNREVIEWED | 46,354 | 46,158 | −196 |
| RETAIN_CONFIRMED | 46,225 | 46,421 | +196 |
| IMPLEMENTED_AND_VERIFIED | 365 | 365 | 0 |
| HOLD_DATA_QUALITY | 7 | 7 | 0 |
| HOLD_CONTEXT | 1 | 1 | 0 |
| **合計** | **92,952** | **92,952** | 0 |

---

## 4. RETAIN_CONFIRMED 品質内訳（更新後）

| 分類 | 件数 | 根拠 |
|------|------|------|
| Group Z 機能語 | 40,990 | Stage 4 対象外（機能語除外設計） |
| Group C 否定副詞 | 2,494 | Phase 4c FUNCTION_CONFIRMED（全件） |
| Group E 内容語 bracket | 142 | Phase 4a 全件個別 OK 確認 |
| Group B OK（εἰμί 正常形） | 2,318 | Phase 4b 全件照合 |
| Group D OK（tilde 確認済み） | 281 | Phase 4b 全件照合 |
| Phase 4h 個別確認（本 Phase） | 196 | Phase 4h changeNeeded=false |
| **合計** | **46,421** | |

**DESIGN_RULE（Group Z）**: 40,990 件（98.5%）
**ALL_INDIVIDUALLY_CONFIRMED（C+E+Phase4ai）**: 2,832 件（6.8%）
**PHASE4B_AUDITED（D）**: 281 件（0.7%）
**GROUP_RULE_INFERRED（B）**: 2,318 件（5.6%）

---

## 5. 証拠照合プロセス

### 5.1 照合手順

1. `stage4-phase4h-full-population-audit.json` から `changeNeeded=false` の 196 件を抽出
2. `stage4-phase4ag-residual-inventory.json` で各 ref が `UNREVIEWED` であることを確認
3. `public/bible_data/nt/BOOK/CH.json`（フラット配列）で現在の japanese・strong を照合
4. 全件一致確認後、`RETAIN_CONFIRMED` に昇格

### 5.2 照合条件

- Phase 4ag 状態: `UNREVIEWED` ✓（全196件）
- bible_data 一致: `evidence_match = EXACT` ✓（全196件）
- basis: `PHASE4H_INDIVIDUALLY_CONFIRMED_OK`

---

## 6. Strong 別 ref 一覧

### G863 ἀφίημι（47件）— 赦す

| ref | h4h_japanese | cur_japanese | match | cluster |
|-----|-------------|-------------|-------|---------|
| MAT 6:12!2 | 赦す | 赦す | EXACT | A |
| MAT 6:12!10 | 赦す | 赦す | EXACT | A |
| MAT 6:14!3 | 赦す | 赦す | EXACT | A |
| MAT 6:14!9 | 赦す | 赦す | EXACT | A |
| MAT 6:15!4 | 赦す | 赦す | EXACT | A |
| MAT 6:15!11 | 赦す | 赦す | EXACT | A |
| MAT 9:2!21 | 赦す | 赦す | EXACT | A |
| MAT 9:5!6 | 赦す | 赦す | EXACT | A |
| MAT 9:6!14 | 赦す | 赦す | EXACT | A |
| MAT 12:31!9 | 赦す | 赦す | EXACT | A |
| MAT 12:31!18 | 赦す | 赦す | EXACT | A |
| MAT 12:32!11 | 赦す | 赦す | EXACT | A |
| MAT 12:32!23 | 赦す | 赦す | EXACT | A |
| MAT 18:21!16 | 赦す | 赦す | EXACT | A |
| MAT 18:27!13 | 赦す | 赦す | EXACT | A |
| MAT 18:32!15 | 赦す | 赦す | EXACT | A |
| MAT 18:35!12 | 赦す | 赦す | EXACT | A |
| MRK 2:5!12 | 赦す | 赦す | EXACT | A |
| MRK 2:7!8 | 赦す | 赦す | EXACT | A |
| MRK 2:9!7 | 赦す | 赦す | EXACT | A |
| MRK 2:10!15 | 赦す | 赦す | EXACT | A |
| MRK 3:28!7 | 赦す | 赦す | EXACT | A |
| MRK 3:29!4 | 赦す | 赦す | EXACT | A |
| MRK 11:25!8 | 赦す | 赦す | EXACT | A |
| MRK 11:25!13 | 赦す | 赦す | EXACT | A |
| MRK 11:26!4 | 赦す | 赦す | EXACT | A |
| LUK 5:20!10 | 赦す | 赦す | EXACT | A |
| LUK 5:21!8 | 赦す | 赦す | EXACT | A |
| LUK 5:23!6 | 赦す | 赦す | EXACT | A |
| LUK 5:24!15 | 赦す | 赦す | EXACT | A |
| LUK 7:47!3 | 赦す | 赦す | EXACT | A |
| LUK 7:47!8 | 赦す | 赦す | EXACT | A |
| LUK 7:48!5 | 赦す | 赦す | EXACT | A |
| LUK 7:49!5 | 赦す | 赦す | EXACT | A |
| LUK 11:4!2 | 赦す | 赦す | EXACT | A |
| LUK 12:10!8 | 赦す | 赦す | EXACT | A |
| LUK 12:10!15 | 赦す | 赦す | EXACT | A |
| LUK 23:34!4 | 赦す | 赦す | EXACT | A |
| JHN 20:23!4 | 赦す | 赦す | EXACT | A |
| JHN 20:23!8 | 赦す | 赦す | EXACT | A |
| ACT 8:22!8 | 赦す | 赦す | EXACT | A |
| ROM 4:7!4 | 赦す | 赦す | EXACT | A |
| 1JN 1:9!9 | 赦す | 赦す | EXACT | A |
| 1JN 2:12!5 | 赦す | 赦す | EXACT | A |
| REV 2:4!5 | 赦す | 赦す | EXACT | A |
| REV 2:14!3 | 赦す | 赦す | EXACT | A |
| REV 2:20!3 | 赦す | 赦す | EXACT | A |

### G1210 δέω（43件）— 縛る（束縛的文脈）

| ref | h4h_japanese | cur_japanese | match | cluster |
|-----|-------------|-------------|-------|---------|
| MAT 12:29!8 | 縛る | 縛る | EXACT | A |
| MAT 13:30!10 | 縛る | 縛る | EXACT | A |
| MAT 16:19!5 | 縛る | 縛る | EXACT | A |
| MAT 16:19!8 | 縛る | 縛る | EXACT | A |
| MAT 18:18!2 | 縛る | 縛る | EXACT | A |
| MAT 18:18!5 | 縛る | 縛る | EXACT | A |
| MAT 21:2!8 | 縛る | 縛る | EXACT | A |
| MAT 22:13!6 | 縛る | 縛る | EXACT | A |
| MAT 27:2!4 | 縛る | 縛る | EXACT | A |
| MRK 3:27!8 | 縛る | 縛る | EXACT | A |
| MRK 5:3!10 | 縛る | 縛る | EXACT | A |
| MRK 5:4!2 | 縛る | 縛る | EXACT | A |
| MRK 6:17!8 | 縛る | 縛る | EXACT | A |
| MRK 11:2!5 | 縛る | 縛る | EXACT | A |
| MRK 11:4!2 | 縛る | 縛る | EXACT | A |
| MRK 15:1!8 | 縛る | 縛る | EXACT | A |
| MRK 15:7!8 | 縛る | 縛る | EXACT | A |
| LUK 13:16!9 | 縛る | 縛る | EXACT | A |
| LUK 19:30!5 | 縛る | 縛る | EXACT | A |
| JHN 11:44!5 | 縛る | 縛る | EXACT | A |
| JHN 18:12!8 | 縛る | 縛る | EXACT | A |
| JHN 18:24!5 | 縛る | 縛る | EXACT | A |
| JHN 19:40!4 | 縛る | 縛る | EXACT | A |
| ACT 9:2!8 | 縛る | 縛る | EXACT | A |
| ACT 9:14!5 | 縛る | 縛る | EXACT | A |
| ACT 9:21!8 | 縛る | 縛る | EXACT | A |
| ACT 12:6!10 | 縛る | 縛る | EXACT | A |
| ACT 20:22!5 | 縛る | 縛る | EXACT | A |
| ACT 21:11!10 | 縛る | 縛る | EXACT | A |
| ACT 21:13!5 | 縛る | 縛る | EXACT | A |
| ACT 22:5!8 | 縛る | 縛る | EXACT | A |
| ACT 22:29!8 | 縛る | 縛る | EXACT | A |
| ACT 24:27!10 | 縛る | 縛る | EXACT | A |
| ROM 7:2!5 | 縛る | 縛る | EXACT | A |
| 1CO 7:27!2 | 縛る | 縛る | EXACT | A |
| 1CO 7:39!2 | 縛る | 縛る | EXACT | A |
| COL 4:3!5 | 縛る | 縛る | EXACT | A |
| 2TI 2:9!5 | 縛る | 縛る | EXACT | A |
| REV 9:14!6 | 縛る | 縛る | EXACT | A |
| REV 20:2!4 | 縛る | 縛る | EXACT | A |
| REV 20:2!7 | 縛る | 縛る | EXACT | A |
| REV 20:7!4 | 縛る | 縛る | EXACT | A |
| REV 20:8!2 | 縛る | 縛る | EXACT | A |

### G2919 κρίνω（106件）— 裁く（司法的文脈）

*注: ACT 3:13!27 は HOLD_CONTEXT として Phase 4ag で別途管理（本 Phase 対象外）*

| ref | h4h_japanese | cur_japanese | match | cluster |
|-----|-------------|-------------|-------|---------|
| MAT 5:40!5 | 裁く | 裁く | EXACT | A |
| MAT 7:1!2 | 裁く | 裁く | EXACT | A |
| MAT 7:2!2 | 裁く | 裁く | EXACT | A |
| MAT 7:2!10 | 裁く | 裁く | EXACT | A |
| MAT 19:28!16 | 裁く | 裁く | EXACT | A |
| LUK 6:37!2 | 裁く | 裁く | EXACT | A |
| LUK 6:37!5 | 裁く | 裁く | EXACT | A |
| LUK 7:43!4 | 裁く | 裁く | EXACT | A |
| LUK 12:57!5 | 裁く | 裁く | EXACT | A |
| LUK 19:22!3 | 裁く | 裁く | EXACT | A |
| LUK 22:30!10 | 裁く | 裁く | EXACT | A |
| JHN 3:17!10 | 裁く | 裁く | EXACT | A |
| JHN 3:17!14 | 裁く | 裁く | EXACT | A |
| JHN 3:18!2 | 裁く | 裁く | EXACT | A |
| JHN 3:18!9 | 裁く | 裁く | EXACT | A |
| JHN 5:22!4 | 裁く | 裁く | EXACT | A |
| JHN 5:22!6 | 裁く | 裁く | EXACT | A |
| JHN 5:30!5 | 裁く | 裁く | EXACT | A |
| JHN 7:24!2 | 裁く | 裁く | EXACT | A |
| JHN 7:24!7 | 裁く | 裁く | EXACT | A |
| JHN 7:51!3 | 裁く | 裁く | EXACT | A |
| JHN 8:15!2 | 裁く | 裁く | EXACT | A |
| JHN 8:15!5 | 裁く | 裁く | EXACT | A |
| JHN 8:16!3 | 裁く | 裁く | EXACT | A |
| JHN 8:26!5 | 裁く | 裁く | EXACT | A |
| JHN 8:50!8 | 裁く | 裁く | EXACT | A |
| JHN 12:47!8 | 裁く | 裁く | EXACT | A |
| JHN 12:47!12 | 裁く | 裁く | EXACT | A |
| JHN 12:48!5 | 裁く | 裁く | EXACT | A |
| JHN 16:11!5 | 裁く | 裁く | EXACT | A |
| JHN 18:31!7 | 裁く | 裁く | EXACT | A |
| ACT 4:19!5 | 裁く | 裁く | EXACT | A |
| ACT 7:7!3 | 裁く | 裁く | EXACT | A |
| ACT 13:46!8 | 裁く | 裁く | EXACT | A |
| ACT 15:19!2 | 裁く | 裁く | EXACT | A |
| ACT 16:4!4 | 裁く | 裁く | EXACT | A |
| ACT 16:15!10 | 裁く | 裁く | EXACT | A |
| ACT 17:31!6 | 裁く | 裁く | EXACT | A |
| ACT 20:16!4 | 裁く | 裁く | EXACT | A |
| ACT 21:25!3 | 裁く | 裁く | EXACT | A |
| ACT 23:3!8 | 裁く | 裁く | EXACT | A |
| ACT 24:6!6 | 裁く | 裁く | EXACT | A |
| ACT 25:9!10 | 裁く | 裁く | EXACT | A |
| ACT 25:10!8 | 裁く | 裁く | EXACT | A |
| ACT 25:20!8 | 裁く | 裁く | EXACT | A |
| ACT 26:6!3 | 裁く | 裁く | EXACT | A |
| ROM 2:1!2 | 裁く | 裁く | EXACT | A |
| ROM 2:1!5 | 裁く | 裁く | EXACT | A |
| ROM 2:3!5 | 裁く | 裁く | EXACT | A |
| ROM 2:12!5 | 裁く | 裁く | EXACT | A |
| ROM 2:16!4 | 裁く | 裁く | EXACT | A |
| ROM 3:4!8 | 裁く | 裁く | EXACT | A |
| ROM 3:6!4 | 裁く | 裁く | EXACT | A |
| ROM 3:7!8 | 裁く | 裁く | EXACT | A |
| ROM 14:3!8 | 裁く | 裁く | EXACT | A |
| ROM 14:4!2 | 裁く | 裁く | EXACT | A |
| ROM 14:5!2 | 裁く | 裁く | EXACT | A |
| ROM 14:5!6 | 裁く | 裁く | EXACT | A |
| ROM 14:10!2 | 裁く | 裁く | EXACT | A |
| ROM 14:13!2 | 裁く | 裁く | EXACT | A |
| ROM 14:22!9 | 裁く | 裁く | EXACT | A |
| 1CO 2:2!5 | 裁く | 裁く | EXACT | A |
| 1CO 4:5!2 | 裁く | 裁く | EXACT | A |
| 1CO 5:3!10 | 裁く | 裁く | EXACT | A |
| 1CO 5:12!3 | 裁く | 裁く | EXACT | A |
| 1CO 5:12!7 | 裁く | 裁く | EXACT | A |
| 1CO 5:13!3 | 裁く | 裁く | EXACT | A |
| 1CO 6:2!2 | 裁く | 裁く | EXACT | A |
| 1CO 6:2!8 | 裁く | 裁く | EXACT | A |
| 1CO 6:3!2 | 裁く | 裁く | EXACT | A |
| 1CO 6:6!5 | 裁く | 裁く | EXACT | A |
| 1CO 7:37!9 | 裁く | 裁く | EXACT | A |
| 1CO 10:15!4 | 裁く | 裁く | EXACT | A |
| 1CO 11:13!3 | 裁く | 裁く | EXACT | A |
| 1CO 11:31!2 | 裁く | 裁く | EXACT | A |
| 1CO 11:31!6 | 裁く | 裁く | EXACT | A |
| 1CO 11:32!2 | 裁く | 裁く | EXACT | A |
| 2CO 2:1!4 | 裁く | 裁く | EXACT | A |
| 2CO 5:14!4 | 裁く | 裁く | EXACT | A |
| GAL 4:9!3 | 裁く | 裁く | EXACT | A |
| COL 2:16!2 | 裁く | 裁く | EXACT | A |
| 2TH 2:12!3 | 裁く | 裁く | EXACT | A |
| 2TI 4:1!8 | 裁く | 裁く | EXACT | A |
| TIT 3:12!3 | 裁く | 裁く | EXACT | A |
| HEB 10:30!5 | 裁く | 裁く | EXACT | A |
| HEB 13:4!6 | 裁く | 裁く | EXACT | A |
| JAS 2:12!5 | 裁く | 裁く | EXACT | A |
| JAS 4:11!2 | 裁く | 裁く | EXACT | A |
| JAS 4:11!5 | 裁く | 裁く | EXACT | A |
| JAS 4:11!8 | 裁く | 裁く | EXACT | A |
| JAS 4:11!14 | 裁く | 裁く | EXACT | A |
| JAS 4:12!10 | 裁く | 裁く | EXACT | A |
| 1PE 1:17!4 | 裁く | 裁く | EXACT | A |
| 1PE 2:23!8 | 裁く | 裁く | EXACT | A |
| 1PE 4:5!5 | 裁く | 裁く | EXACT | A |
| 1PE 4:6!5 | 裁く | 裁く | EXACT | A |
| REV 6:10!7 | 裁く | 裁く | EXACT | A |
| REV 11:18!8 | 裁く | 裁く | EXACT | A |
| REV 16:5!6 | 裁く | 裁く | EXACT | A |
| REV 17:1!7 | 裁く | 裁く | EXACT | A |
| REV 18:8!10 | 裁く | 裁く | EXACT | A |
| REV 18:20!7 | 裁く | 裁く | EXACT | A |
| REV 19:2!4 | 裁く | 裁く | EXACT | A |
| REV 19:11!10 | 裁く | 裁く | EXACT | A |
| REV 20:12!5 | 裁く | 裁く | EXACT | A |
| REV 20:13!4 | 裁く | 裁く | EXACT | A |

---

## 7. 整合性チェック

| チェック | 期待値 | 結果 | 判定 |
|---------|--------|------|------|
| Phase 4h confirmed-OK 総数 | 196 | 196 | ✓ PASS |
| 再分類成功件数 | 196 | 196 | ✓ PASS |
| エラー | 0 | 0 | ✓ PASS |
| bible_data 不一致 | 0 | 0 | ✓ PASS |
| Phase 4ag 総数 | 92,952 | 92,952 | ✓ PASS |
| UNREVIEWED 更新後 | 46,158 | 46,158 | ✓ PASS |
| RETAIN_CONFIRMED 更新後 | 46,421 | 46,421 | ✓ PASS |
| 全 state 合計 | 92,952 | 92,952 | ✓ PASS |

**Phase 4ai: PASS**

---

## 8. 更新ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `stage4-phase4ai-reclassification.json` | 新規作成 — 196件の再分類証拠記録 |
| `stage4-phase4ai-reclassification-report.md` | 新規作成 — 本ファイル |
| `stage4-phase4ag-residual-inventory.json` | 更新 — 196件の state 変更、state_summary 更新 |

---

## 9. 次 Phase への申し送り

| 項目 | 状態 | 優先度 |
|------|------|--------|
| ACT 3:13!27 G2919 裁く vs 決める | HOLD_CONTEXT | HIGH |
| G1520×5 / G4183 LUK 24:28 / G450 MRK 10:50 | HOLD_DATA_QUALITY | MEDIUM |
| Group A UNREVIEWED（39,084件→46,158件含む） | FUTURE | MEDIUM |
| Phase 4ah 9ユニット監査計画（TRULY_UNREVIEWED 32,890件） | FUTURE | MEDIUM |
| Group F/G/H UNREVIEWED（7,270件） | FUTURE | LOW |
