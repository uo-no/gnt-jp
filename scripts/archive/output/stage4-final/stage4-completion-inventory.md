# Stage 4 完了棚卸し

**作成日**: 2026-11-02  
**性格**: READ ONLY 棚卸し — bible_data・台帳・既存成果物の変更なし  
**根拠**: stage4-group-assignment.json（92,952件）/ 各 Phase 成果物 / ja1955-nt-ledger.json

---

## 1. 作業環境

| 項目 | 値 |
|------|-----|
| ブランチ | `data/ja1955-nt-approved-132` |
| HEAD SHA（本棚卸し時点） | `4acb52bc` |
| Phase 4k Morph Fix SHA | `0b5595b5` |
| Phase 4k Bible JSON SHA | `4acb52bc` |
| 未コミット変更 | `scripts/output/*.json/.md` 8件（テスト生成物、スコープ外） |
| リモートとの差分 | 未 push（ローカルのみ） |

### コミット親子関係

```
ebf70bc6 ← 0b5595b5 (Commit A: Morph Fix) ← 4acb52bc (Commit B: Bible JSON G863)
```

---

## 2. 母集団の整合性

| Group | 説明 | tokens | Strongs | 整合性 |
|-------|------|--------|---------|-------|
| A | 内容語 plain | 39,310 | 4,195 | ✓ |
| B | εἰμί 述語構造 | 2,369 | 22 | ✓ |
| C | 否定副詞 | 2,494 | 2 | ✓ |
| D | tilde その他 | 377 | 16 | ✓ |
| E | 内容語 bracket | 142 | 4 | ✓ |
| F | pron plain | 5,544 | 46 | ✓ |
| G | 関係代名詞 tilde | 1,657 | 3 | ✓ |
| H | G4671 σοί | 69 | 1 | ✓ |
| Z | 機能語（除外） | 40,990 | 139 | ✓ |
| **合計** | | **92,952** | **432** | ✓ |

NT 全体 137,741 tokens との照合: 15,883（恒久BL）+ 723（S4除外）+ 22,624（台帳承認済み）+ 3,559（Stage 2）+ 92,952 = **137,741 ✓**

---

## 3. Phase 別状態

### Phase 4a — G756 ἄρχομαι / Group E（2026-10-31 完了）

| 対象 | 方式 | tokens | 結果 | データ変更 |
|------|------|--------|------|-----------|
| G756 ἄρχομαι（Group D） | 全件個別確認 | 84 | 全件 CONFIRMED_ERROR（現行 "〜である" → "〜し始める"） | **未適用** |
| Group E 内容語 bracket | 全件（4 Strongs） | 142 | 全件 OK | 不要 |

- G756: 84件すべてが ἄρχομαι（開始相補助動詞）への εἰμί ラベル誤適用
- 推奨ラベル: `"〜し始める"`（全84件一律適用可）
- **bible_data 未変更**

---

### Phase 4b — Group B 語義疑問 / Group D 残（2026-10-31 完了）

| 対象 | 確認 | tokens | 結果 | データ変更 |
|------|------|--------|------|-----------|
| Group B 語義疑問 5 Strongs | 全件 | 51 | 全件 CONFIRMED_ERROR | **未適用** |
| Group D 残 15 Strongs | 全件 14 + サンプル 1 | 293 | 13 OK / 1 REV / 1 CTX_DEP | **未適用** |

**Group B CONFIRMED_ERROR 詳細:**

| Strong | lemma | tokens | 現行 | 推奨 |
|--------|-------|--------|------|------|
| G680 | ἅπτομαι | 34 | 〜である | 〜さわる |
| G1573 | ἐγκακέω | 6 | 〜である | 〜くじける（他候補あり） |
| G567 | ἀπέχομαι | 6 | 〜である | 〜避ける |
| G4823 | συμβουλεύω | 4 | 〜である | 〜相談する（他候補あり） |
| G566 | ἀπέχω | 1 | 〜である | HOLD（特殊用法） |

**Group D 要注意:**
- G5616 ὡσεί（11件）: REVISION_CANDIDATE（近似表現用法のラベル不整合）
- G5228 ὑπέρ（1件）: CONTEXT_DEPENDENT（副詞比較用法）

---

### Phase 4c — Group C 否定表現（2026-10-31 完了）

| Strong | tokens | 確認方式 | 結果 |
|--------|--------|---------|------|
| G3756 | 1,543 | Strong確認 + 用法別サンプル 83件 | FUNCTION_CONFIRMED |
| G3361 | 951 | Strong確認 + 用法別サンプル 141件 | FUNCTION_CONFIRMED |

全2,494件 CONFIRMED_OK。データ変更不要。

---

### Phase 4d — サンプリング基盤（2026-10-31 完了）

サンプリングスクリプト実装・ドライラン検証のみ。bible_data 変更なし。

---

### Phase 4e — Group A Tier 1 サンプリング（2026-10-31 完了）

| 項目 | 値 |
|------|-----|
| 対象 Strongs | Tier 1（20 Strongs） |
| 母集団 tokens | 8,724 |
| サンプル数 | 400 |
| 個別確認 | 400件（サンプル） |

**サンプル結果:**

| 判定 | 件数 |
|------|-----|
| CONFIRMED_OK | 375 |
| REVISION_CANDIDATE | 18 |
| HOLD | 6 |
| CONTEXT_DEPENDENT | 1 |
| 合計 | 400 |

**REVISION_CANDIDATE（18件）の Strong 内訳:**

| Strong | 件数 |
|--------|-----|
| G3762 οὐθείς | 10 |
| G4183 πολύς | 4 |
| G2983 λαμβάνω | 2 |
| G3056 λόγος | 1 |
| G4160 ποιέω | 1 |

**HOLD（6件）:**

| ref | Strong | 保留理由 |
|-----|--------|---------|
| MRK 4:20!19 | G1520 | morph=PREP、Strong=G1520（εἷς）— G1519（εἰς）との混在疑い |
| MRK 4:20!22 | G1520 | 同上 |
| MRK 4:20!25 | G1520 | 同上 |
| MRK 4:8!20 | G1520 | 同上 |
| MRK 4:8!23 | G1520 | 同上 |
| LUK 24:28!11 | G4183 | greekForm=πορρώτερον（πόρρω の比較級）— G4183 との misassignment 疑い |

→ REVISION_CANDIDATE 18件・HOLD 6件は**未解決**、データ変更なし

---

### Phase 4f — Group A Tier 2 サンプリング（2026-10-31 完了）

| 項目 | 値 |
|------|-----|
| 対象 Strongs | Tier 2（36 Strongs） |
| 母集団 tokens | 4,966 |
| サンプル数 | 451 |

**サンプル結果:**

| 判定 | 件数 |
|------|-----|
| CONFIRMED_OK | 429 |
| REVISION_CANDIDATE | 20 |
| HOLD | 2 |
| 合計 | 451 |

**REVISION_CANDIDATE（20件）の Strong 内訳:**

| Strong | 件数 | 備考 |
|--------|-----|------|
| G863 ἀφίημι | 10 | → Phase 4g/4h/4i/4j/4k で完全処理済み |
| G1210 δέω | 7 | → Phase 4h で全件分類済み（未適用） |
| G2919 κρίνω | 2 | → Phase 4h で全件分類済み（未適用） |
| G3860 παραδίδωμι | 1 | 未処理 |

**HOLD（2件）:**

| ref | Strong | 保留理由 |
|-----|--------|---------|
| MRK 10:50!7 | G450 | ἀναπηδήσας の lemma が bible_data では ἀναπηδάω（G450 と不一致） |
| ROM 1:10!6 | G1210 | δεόμενος は δέομαι（G1189）の形。bible_data のG1210 登録が疑わしい |

---

### Phase 4g — 拡大サンプリング（2026-10-31 完了）

G863/G1210/G2919 のみ追加 39サンプル。→ Phase 4h に続く。

---

### Phase 4h — 全用例影響範囲監査（2026-10-31 完了）

| Strong | 母集団 | 変更候補 | HOLD | 現状維持 |
|--------|--------|---------|------|---------|
| G863 ἀφίημι | 143 | 96 | 0 | 47 |
| G1210 δέω | 138 | 85（dei-necessity） | 10（deom-hold） | 43 |
| G2919 κρίνω | 115 | 9（decide） | 0 | 106 |

---

### Phase 4i/4j/4j-correction — G863 詳細監査（2026-11-01 完了）

- Phase 4i: 96件 APPROVED_FOR_CHANGE（ledger確定）
- Phase 4j-addendum: 78件 CONFIRM + 18件 REVISE（項構造・語義境界横断検証）
- Phase 4j-correction: 93件 CONFIRM + 3件 REVISE（文法修正・1CO 7:11-13 離縁する）

---

### Phase 4k — G863 実装 + Morph Fix（2026-11-02 完了・コミット済み）

**Commit A（Morph Fix）SHA: `0b5595b5`**
- reading-engine.js: 去る 五段漢字語幹 4ルール追加
- baseline 更新（44187→44280）

**Commit B（Bible JSON）SHA: `4acb52bc`**
- G863 ἀφίημι 96件 token.japanese 変更（赦す → finalCorrectedJa）
- 53ファイル変更、token.japanese のみ

---

## 4. グループ別監査状態サマリー

### Group A — 内容語 plain（39,310 tokens, 4,195 strongs）

| Tier | Strongs | Tokens | 状態 | サンプル数 | 結果 |
|------|---------|--------|------|-----------|------|
| 1（n≥200） | 20 | 8,724 | ✅ サンプル完了 | 400 | 375 OK / 18 REV / 6 HOLD / 1 CTX |
| 2（n=100-199） | 36 | 4,966 | ✅ サンプル完了 | 451 | 429 OK / 20 REV / 2 HOLD |
| 3（n=50-99） | 79 | 5,548 | ❌ 未着手 | — | — |
| 4（n=20-49） | 212 | 6,534 | ❌ 未着手 | — | — |
| 5（n=10-19） | 347 | 4,585 | ❌ 未着手 | — | — |
| 6（n=5-9） | 591 | 3,895 | ❌ 未着手 | — | — |
| 7（n=1-4） | 2,910 | 5,058 | ❌ 未着手 | — | — |

**データ変更済み（Group A から）:**
- G863 96件（Phase 4k ✓）

**データ変更未適用（Group A 内）:**
- G1210 dei-necessity 85件（Phase 4h で全件分類済み）
- G2919 decide 9件（Phase 4h で全件分類済み）
- Tier 1/2 REVISION_CANDIDATE 38件（個別確認待ち）
- Tier 1/2 HOLD 8件（未解決）

**未監査 tokens（Group A）:**
- Tier 3-7: 4,139 strongs / 25,620 tokens

---

### Group B — εἰμί 述語構造（2,369 tokens, 22 strongs）

| 状態 | Strongs | tokens |
|------|---------|--------|
| 設計上 CONFIRMED_OK（標準 εἰμί 形） | 17 | 2,318 |
| CONFIRMED_ERROR（非εἰμί 語義誤適用） | 5 | 51 |

**未適用:** 51件（G680/G1573/G567/G4823 + G566 HOLD）

---

### Group C — 否定副詞（2,494 tokens, 2 strongs）

✅ 全件 FUNCTION_CONFIRMED。データ変更不要。

---

### Group D — tilde その他（377 tokens, 16 strongs）

| Strongs | tokens | 判定 |
|---------|--------|------|
| 14（G3757/G3195/G3761/G3699/G3752/G1163/G303/G3753/G3366/G1715/G575/G5565/G3924 + G756） | 361 + 84 = 366 | CONFIRMED_OK（G756 は CONFIRMED_ERROR）|
| 1（G5616） | 11 | REVISION_CANDIDATE |
| 1（G5228） | 1 | CONTEXT_DEPENDENT |

**注意:** G756 84件の CONFIRMED_ERROR は Group D に属する。未適用。

---

### Group E — 内容語 bracket（142 tokens, 4 strongs）

✅ 全件 OK。データ変更不要。

---

### Group F — pron plain（5,544 tokens, 46 strongs）

❌ **未着手**（Phase 4e として計画済みだったが未実施）

---

### Group G — 関係代名詞 tilde（1,657 tokens, 3 strongs）

❌ **未着手**

---

### Group H — G4671 σοί（69 tokens, 1 strong）

❌ **未着手**（独立監査として設計済み）

---

## 5. データ変更の現状

| 変更 | 件数 | 状態 |
|------|-----|------|
| G863 96件（Phase 4k） | 96 | ✅ コミット済み（`4acb52bc`） |
| G756 84件（Phase 4a） | 84 | 未適用（CONFIRMED_ERROR 確認済み） |
| Group B 5 Strongs 51件（Phase 4b） | 51 | 未適用（CONFIRMED_ERROR 確認済み） |
| G1210 dei-necessity 85件（Phase 4h） | 85 | 未適用（全件分類済み） |
| G2919 decide 9件（Phase 4h） | 9 | 未適用（全件分類済み） |
| Group D G5616 11件（Phase 4b） | 11 | 未適用（REVISION_CANDIDATE） |
| Tier 1/2 REVISION_CANDIDATE 38件 | 38 | 未確定（個別確認待ち） |
| **確認済み未適用合計（確定分）** | **285** | |
| **未確定（REV/HOLD）合計** | **49** | |

---

## 6. 未解決事項

| 事項 | 件数 | 分類 |
|------|-----|------|
| G1210 deom-hold（δέομαι 語根の Strong 誤割当疑い） | 10 | HOLD（Strong 誤割当の可能性） |
| G566 特殊用法 | 1 | HOLD |
| G5228 CONTEXT_DEPENDENT | 1 | CONTEXT_DEPENDENT |
| G1573/G4823 推奨ラベル候補が複数 | 10 | REVISION_CANDIDATE 再確認 |
| Tier 1/2 REVISION_CANDIDATE（G3762 10件を含む） | 38 | REVISION_CANDIDATE |
| Tier 1/2 HOLD（G1520 Strong 混在疑い、G4183 比較級問題） | 8 | HOLD |
| G3860 1件 | 1 | REVISION_CANDIDATE |
| Group F/G/H 未着手 | 7,270 | 未監査 |
| Group A Tier 3-7 未着手 | ~25,620 | 未監査 |
