# Stage 4 次工程提案（Phase 4l 以降）

**作成日**: 2026-11-02  
**性格**: READ ONLY 棚卸しに基づく次工程の提案。承認なし実行禁止。  
**前提**: この提案は方向性の整理であり、確定した計画ではない。

---

## 現在の State（Phase 4k 完了時点）

### 完了
- G863 ἀφίημι 96件 APPLIED（コミット `4acb52bc`）
- Morph Fix（去る 五段漢字語幹）APPLIED（コミット `0b5595b5`）
- Group C / E 全件 CONFIRMED_OK

### 確認済み・未適用（High confidence）

| Strong | tokens | 内容 | 根拠 Phase |
|--------|--------|------|------------|
| G756 ἄρχομαι | 84 | 〜である → 〜し始める | 4a |
| G680 ἅπτομαι | 34 | 〜である → 〜さわる | 4b |
| G1210 δέω（dei-necessity） | 85 | 縛る → 〜しなければならない | 4h |
| G2919 κρίνω（decide） | 9 | 裁く → 決める | 4h |
| G567 ἀπέχομαι | 6 | 〜である → 〜避ける | 4b |
| G1573 ἐγκακέω | 6 | 〜である → 〜くじける（候補複数） | 4b |
| G4823 συμβουλεύω | 4 | 〜である → 〜相談する（候補複数） | 4b |
| **合計** | **228** | | |

### 未監査（完全未着手）

| 区分 | tokens | 説明 |
|------|--------|------|
| Group A Tier 3-7 | ~25,620 | 79+212+347+591+2,910 strongs |
| Group F | 5,544 | pron plain（46 strongs） |
| Group G | 1,657 | 関係代名詞 tilde（3 strongs） |
| Group H | 69 | G4671 σοί（1 strong） |
| **合計** | **~32,890** | |

---

## Phase 4l 提案: 確認済み変更の一括適用

### 目的

Phase 4a/4b/4h で全件個別確認済みの変更（228件）を bible_data へ適用する。

### 対象

| Strong | tokens | 適用内容 | 信頼度 |
|--------|--------|---------|-------|
| G756 | 84 | 〜し始める | HIGH |
| G680 | 34 | 〜さわる | HIGH |
| G1210（dei-necessity） | 85 | 〜しなければならない | HIGH |
| G2919（decide） | 9 | 決める | HIGH |
| G567 | 6 | 〜避ける | HIGH |

小計: 218件（G1573/G4823 は候補確定後に追加）

### スコープ外（Phase 4l では扱わない）

- G1573/G4823 の最終訳語候補確定（別途 1工程必要）
- Tier 1/2 REVISION_CANDIDATE 38件（個別確認未完了）
- G5616/G3860 等の REVISION_CANDIDATE
- G1210 deom-hold 10件（Strong 真正性確認要）
- Group F/G/H（未着手）
- Stage 5 行き HOLD 63件

### 実施方針

1. G756/G680/G567 から開始（HIGH confidence 3 Strongs、124件）
2. G1210 dei-necessity / G2919 decide を個別コミットで適用（94件）
3. G1573/G4823 は訳語候補を確定してから別 Phase

### 注意事項

- G1210 適用時は deom-hold 10件と deo-bind 43件を除外し、dei-necessity 85件のみに限定
- G2919 適用時は judicial 106件を除外し、decide 9件のみに限定
- 各適用後に re-phase1 / re-stageB Regression 必須

---

## Phase 4m 提案: Tier 1/2 REVISION_CANDIDATE 個別確認

### 目的

Phase 4e（Tier 1）・Phase 4f（Tier 2）の REVISION_CANDIDATE 38件を個別に確認し、適用 / HOLD / 棄却を判定する。

### 対象

| Strong | 件数 | 現状 |
|--------|-----|-----|
| G3762 οὐθείς | 10 | サンプル内確認のみ |
| G4183 πολύς | 4 | サンプル内確認のみ |
| G2983 λαμβάνω | 2 | サンプル内確認のみ |
| G3056 λόγος | 1 | サンプル内確認のみ |
| G4160 ποιέω | 1 | サンプル内確認のみ |
| G3860 παραδίδωμι | 1 | Phase 4f |
| G5616 ὡσεί | 11 | Phase 4b Group D |
| G5228 ὑπέρ | 1 | CONTEXT_DEPENDENT |
| **合計** | **31** | |

### 注意

サンプル内の REVISION_CANDIDATE はサンプル件数のみ確認済み。各 Strong の母集団全件確認が必要。

---

## Phase 4n 提案: Stage 4 内部 HOLD 技術調査

### 目的

Phase 4e/4f で発見した bible_data 異常疑い 8件の真正性を確認する。

### 対象

| 分類 | 件数 | 調査内容 |
|------|-----|---------|
| G1520 morph=PREP（MRK 4:8/4:20） | 5 | NA28 原典との照合で G1519/G1520 を確認 |
| G4183 greekForm=πορρώτερον（LUK 24:28） | 1 | πόρρω の比較級としての Strong 確認 |
| G450 lemma 不一致（MRK 10:50） | 1 | ἀναπηδάω の Strong を NA28 で確認 |
| G1210 δέομαι 疑い（ROM 1:10） | 1 | δεόμενος の正確な lemma/Strong 確認 |
| **合計** | **8** | |

### 前提

この調査は bible_data の `strong` / `morph` フィールドの修正の可否を判定するものであり、`token.japanese` 変更ではない。

---

## Phase 4o 提案: Group A Tier 3 サンプリング

### 目的

Group A Tier 3（n=50-99、79 Strongs、5,548 tokens）の品質評価を行う。

### 方針

- Tier 1/2 と同様のサンプリング（各 Strong 上限 3-5件）
- 目標サンプル数: ~300件
- 優先: Strongs n≥80 の上位から

---

## Phase 4p 提案: Group F/G/H 監査

### 目的

Group F（pron plain, 5,544 tokens, 46 strongs）/ G（関係代名詞 tilde, 1,657 tokens）/ H（G4671, 69 tokens）の品質評価。

### 特記

- Group F は代名詞が中心。Morph Rule Engine の影響範囲（G846/G5101/G3739/G3748/G3745 等）と重複する可能性がある。
- 監査前に Group F の Strong 内訳を確認して、Morph Rule 適用済み Strongs を除外する。

---

## 優先順位（提案）

| 優先 | Phase | 件数 | 理由 |
|------|-------|-----|------|
| 1 | 4l（確認済み適用） | 218件 | 全件個別確認済み・待機中 |
| 2 | 4m（REV_CAND 個別確認） | 31件 | Tier 1/2 残課題のクリア |
| 3 | 4n（HOLD 技術調査） | 8件 | 軽量な READ ONLY 調査 |
| 4 | 4o（Tier 3 サンプリング） | 5,548 tokens | 監査網の下方拡張 |
| 5 | 4p（Group F/G/H） | 7,270 tokens | 未着手グループ |

---

## 備考: Stage 5 への引き渡し候補

Stage 4 の範囲では解決しない事項をまとめる。

| 件数 | 内容 | 理由 |
|-----|------|------|
| 55 | JA1955 判断保留（G435/G846/G1538/G1939） | 文脈依存判断・一律変更不可 |
| 8 | Stage 4 内部 HOLD（bible_data 異常疑い） | Strong / morph 真正性確認が先 |
| ~25,620+ | Group A Tier 3-7 / Group F/G/H 未監査分 | Stage 4 Scope 外継続 |
| **63+** | **合計（HOLDのみ）** | |

詳細: `stage5-hold-inventory.md`
