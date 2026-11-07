# Stage 4 Phase 4ag — 残存対象 全件再照合

**Phase**: 4ag
**実施日**: 2026-11-04
**性格**: READ-ONLY 全件再照合 — bible_data・辞書・エンジン・baseline 変更なし
**ステータス**: **PASS — 全 10 整合性チェック通過**

---

## 1. 作業前確認

| 項目 | 値 |
|------|-----|
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| Phase 4ad 実装 | 31件 CONFIRMED（stage4-phase4ad-token-diff.json） |
| Phase 4ae baseline 更新 | STAGEB_BASELINE 3値更新済み |
| Phase 4af baseline 更新 | PHASE1_BASELINE.morph 44275 更新済み |
| 参照母集団 | stage4-group-assignment.json (92,952 tokens, 2026-10-31) |
| 実装 diff 6件 | 4k/4m/4q/4y/4ab/4ad |

---

## 2. 対象母集団（92,952 tokens）

| Group | 説明 | tokens | Strongs |
|-------|------|--------|---------|
| A | 内容語 plain | 39,310 | 4,195 |
| B | εἰμί 述語構造 | 2,369 | 22 |
| C | 否定副詞 | 2,494 | 2 |
| D | tilde その他 | 377 | 16 |
| E | 内容語 bracket | 142 | 4 |
| F | pron plain | 5,544 | 46 |
| G | 関係代名詞 tilde | 1,657 | 3 |
| H | G4671 σοί | 69 | 1 |
| Z | 機能語（除外） | 40,990 | 139 |
| **合計** | | **92,952** | **432** |

---

## 3. 全件分類結果

| state | 件数 | 説明 |
|-------|------|------|
| IMPLEMENTED_AND_VERIFIED | 365 | Phase 4k/4m/4q/4y/4ab/4ad 実装済み |
| HOLD_CONTEXT | 1 | ユーザー文脈判断待ち |
| HOLD_DATA_QUALITY | 7 | bible_data Strong/morph 異常疑い |
| RETAIN_CONFIRMED | 46,225 | 確認済み・変更不要 |
| UNREVIEWED | 46,354 | 未監査 |
| **合計** | **92,952** | |

---

## 4. IMPLEMENTED_AND_VERIFIED（365件）

| Phase | 実装内容 | 件数 |
|-------|---------|------|
| 4k | G863 ἀφίημι — 赦す 以外の用法 (96件) | 96 |
| 4m | G756/G680/G2919/G567 — 動詞意味精度向上 (132件) | 132 |
| 4q | G1210→G1163/G1189 — dei-necessity / δέομαι 再分類 (95件) | 95 |
| 4y | G1573/G4823 — ἐγκακέω/συμβουλεύω 意味改善 (10件) | 10 |
| 4ab | G566 ἀπέχω MRK 14:41!13 — 語義特殊用法 (1件) | 1 |
| 4ad | G2983/G5228/G5616/G3762/G4160/G4183/G3860/G3056 — 多様改善 (31件) | 31 |
| **合計** | | **365** |

**所属グループ内訳:**

| Group | 実装件数 |
|-------|---------|
| A | 218 |
| B | 51 |
| D | 96 |
| 計 | 365 |

---

## 5. HOLD（8件）

### 5.1 HOLD_CONTEXT（1件）

| ref | Strong | lemma | 問題 |
|-----|--------|-------|------|
| ACT 3:13!27 | G2919 | κρίνω | ピラトの釈放判断：裁く vs 決める。文脈による |

### 5.2 HOLD_DATA_QUALITY（7件）

| ref | Strong | 問題 |
|-----|--------|------|
| MRK 4:8!20 | G1520 | morph=PREP（εἷς に前置詞形は不存在）→ G1519 混在疑い |
| MRK 4:8!23 | G1520 | 同上 |
| MRK 4:20!19 | G1520 | 同上 |
| MRK 4:20!22 | G1520 | 同上 |
| MRK 4:20!25 | G1520 | 同上 |
| LUK 24:28!11 | G4183 | greekForm=πορρώτερον（πόρρω 比較級）→ G4207 誤割当疑い |
| MRK 10:50!7 | G450 | lemma=ἀναπηδάω ≠ G450(ἀνίστημι) → Strong 誤割当疑い |

**備考:** ROM 1:10!6 は stage5-hold-inventory に G1210 DQ として記録されていたが、Phase 4q で G1189(δέομαι/願う) に変更実装済み。HOLD_DATA_QUALITY には含まない。

---

## 6. RETAIN_CONFIRMED（46,225件）

| 分類 | 件数 | 根拠 |
|------|------|------|
| Group Z 機能語 | 40,990 | Stage 4 対象外（機能語除外設計） |
| Group C 否定副詞 | 2,494 | Phase 4c FUNCTION_CONFIRMED（全件） |
| Group E 内容語 bracket | 142 | Phase 4a 全件個別 OK 確認 |
| Group B OK（εἰμί 正常形） | 2,318 | Phase 4b 全件照合（2,369 − 51 実装済み） |
| Group D OK（tilde 確認済み） | 281 | Phase 4b 全件照合（377 − 96 実装済み） |
| **合計** | **46,225** | |

---

## 7. UNREVIEWED（46,354件）

| Group | 件数 | 説明 |
|-------|------|------|
| A（未監査） | 39084 | 内容語 plain — Group A Tier 3-7 および未確認部分 |
| F | 5544 | pron plain — 代名詞形式 |
| G | 1657 | 関係代名詞 tilde |
| H | 69 | G4671 σοί |
| **合計** | **46,354** | |

---

## 8. Stage 5 関連の取り扱い

### 8.1 Phase 4w ja1955_pending_stage4_scope (49件) — 要注記

Phase 4w は G435×45, G1538×2, G1939×2 = 49件を「Stage 4 scope 内 JA1955 保留」と分類した。

しかし、stage5-hold-inventory.md に記載されたこれら49件の具体的 ref（MAT 1:19!4 等）を **stage4-group-assignment.json (92,952件) と照合した結果、1件も存在しなかった**。

| Strong | hold inventory 件数 | Stage 4 population 件数 | 一致 |
|--------|-------------------|------------------------|------|
| G435 | 45 | 99（別 ref） | **0** |
| G1538 | 2 | 35（別 ref） | **0** |
| G1939 | 2 | 7（別 ref） | **0** |

**結論:** hold inventory の 49件は JA1955 比較監査（ja1955-nt-ledger.json）由来の別集団。Stage 4 group-assignment の対象外トークン（Stage 2/3 相当、または別カテゴリ）に属する可能性が高い。これら49件は Phase 4ag の 92,952件集計の対象外。

Stage 4 内に存在する G435(99件), G1538(35件), G1939(7件) = 141件は Group A UNREVIEWED として分類。

### 8.2 G846 (αὐτός) 6件 — Stage 4 対象外

Phase 4w ja1955_pending_outside_stage4 に記載の G846×6件は Stage 4 group-assignment に存在しない（Group Z 相当）。Phase 4ag 対象外。

---

## 9. グループ別状態クロス表

| Group | IMPL | HOLD_CTX | HOLD_DQ | RETAIN | UNREV | 合計 |
|-------|------|----------|---------|--------|-------|------|
| A | 218 | 1 | 7 | - | 39,084 | 39,310 |
| B | 51 | - | - | 2,318 | - | 2,369 |
| C | - | - | - | 2,494 | - | 2,494 |
| D | 96 | - | - | 281 | - | 377 |
| E | - | - | - | 142 | - | 142 |
| F | - | - | - | - | 5,544 | 5,544 |
| G | - | - | - | - | 1,657 | 1,657 |
| H | - | - | - | - | 69 | 69 |
| Z | - | - | - | 40,990 | - | 40,990 |
| **合計** | **365** | **1** | **7** | **46,225** | **46,354** | **92,952** |

---

## 10. 整合性チェック

| チェック | 期待値 | 実測値 | 判定 |
|---------|--------|--------|------|
| 総 token 数 | 92,952 | 92952 | ✓ PASS |
| 重複 ref なし | 0 | 0 | ✓ PASS |
| 全 ref が exactly 1 state に属する | true | true | ✓ PASS |
| 各 state の合計 = 92,952 | 92,952 | 92952 | ✓ PASS |
| IMPLEMENTED_AND_VERIFIED | 365 | 365 | ✓ PASS |
| HOLD_CONTEXT | 1 | 1 | ✓ PASS |
| HOLD_DATA_QUALITY | 7 | 7 | ✓ PASS |
| RETAIN_CONFIRMED ≥ 46,000 | ≥46,000 | 46225 | ✓ PASS |
| UNREVIEWED = 92,952 − others | 46354 | 46354 | ✓ PASS |
| impl refs 全件が group-assignment に存在 | 365 | 365 | ✓ PASS |

**Phase 4ag: PASS**

---

## 11. 次 Phase への申し送り

| 項目 | 分類 | 優先度 |
|------|------|--------|
| ACT 3:13!27 G2919 裁く vs 決める | HOLD_CONTEXT | HIGH |
| G1520×5 morph=PREP / G4183 LUK 24:28!11 / G450 MRK 10:50!7 | HOLD_DATA_QUALITY | MEDIUM |
| Group A UNREVIEWED（39084件） | FUTURE | MEDIUM |
| Group F/G/H UNREVIEWED（7270件） | FUTURE | LOW |
| stage5-hold-inventory 49件（Stage 4 対象外 G435/G1538/G1939 の別集団） | STAGE5 | MEDIUM |
| stage5-hold-inventory G846×6件（Group Z 相当） | STAGE5 | LOW |
