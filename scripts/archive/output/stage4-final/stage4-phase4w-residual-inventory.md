# Stage 4 Phase 4w — 残件総点検

**Phase**: 4w  
**実施日**: 2026-11-03  
**性格**: READ-ONLY 棚卸し — bible_data・辞書・エンジン・baseline 変更なし  
**最終ステータス**: **PHASE 4w CONDITIONAL PASS — UNRESOLVED INVENTORY**

---

## 1. 作業前確認

| 項目 | 値 |
|------|---|
| ブランチ | data/ja1955-nt-approved-132 |
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| origin HEAD | 2120b4b4201a492bfd7f9f5e610e7b2833b02d31 |
| worktree M（修正済み追跡ファイル） | 132件 |
| worktree ??（未追跡ファイル） | 169件 |
| 参照成果物 | stage4-completion-inventory.md（2026-11-02）/ stage5-hold-inventory.md / 各Phase報告書 |

### 現行 baseline 確認

| テスト | baseline | 確認値 |
|--------|---------|--------|
| re-phase1 morph coverage | 44,276 | CONFIRMED（Phase 4s更新） |
| re-stageB changed | 39,674 | CONFIRMED（Phase 4v更新） |
| re-stageB identical | 98,067 | CONFIRMED |
| re-stageB brokenOld | 1,245 | CONFIRMED |
| re-stageB brokenNew | 0 | CONFIRMED |
| re-stageB panelMismatch | 0 | CONFIRMED |

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

NT 総 137,741 tokens との整合: 15,883（恒久BL）+ 723（S4除外）+ 22,624（JA1955承認済み）+ 3,559（Stage 2）+ 92,952 = **137,741 ✓**

---

## 3. 実装済み変更の照合

### 3.1 Phase 4k — G863 ἀφίημι（コミット済み）

| 項目 | 確認値 | 期待値 | 判定 |
|------|-------|--------|------|
| G863 総 tokens | 143 | 143 | ✓ |
| 非「赦す」変更済み tokens | 96 | 96 | ✓ |
| 「赦す」維持 tokens | 47 | 47 | ✓ |
| 「離縁する」（1CO 7:11-13） | 3 | 3 | ✓ |
| コミット SHA | 4acb52bc | 4acb52bc | ✓ CONFIRMED |

変更内訳（96件）:
`許す`=32, `残す`=23, `去る`=15, `捨てる`=9, `残される`=9, `離縁する`=3, `疎かにする`=2, `放つ`=2, `黙認する`=1

### 3.2 Phase 4m — 132 tokens（未コミット）

| Strong | lemma | 変更前 | 変更後 | 件数 | bible_data照合 |
|--------|-------|--------|--------|------|--------------|
| G756 | ἄρχομαι | 〜である | 〜し始める | 84 | ✓ 全84件 CONFIRMED |
| G680 | ἅπτομαι | 〜である | 〜さわる | 34 | ✓ 全34件 CONFIRMED |
| G2919 | κρίνω (decide) | 裁く | 決める | 7 | ✓ 全7件 CONFIRMED |
| G2919 | κρίνω (passive) | 裁く | 決まる | 1 | ✓ 1件 CONFIRMED (ACT 27:1) |
| G567 | ἀπέχομαι | 〜である | 〜避ける | 6 | ✓ 全6件 CONFIRMED |
| **合計** | | | | **132** | ✓ ALL CONFIRMED |

### 3.3 Phase 4q — 95 tokens（未コミット）

| Strong変更 | lemma | 変更前ja | 変更後ja | 件数 | bible_data照合 |
|-----------|-------|---------|---------|------|--------------|
| G1210 → G1163 | δεῖ | 縛る | 〜しなければならない | 85 | ✓ G1163 = 101件（16+85） CONFIRMED |
| G1210 → G1189 | δέομαι | 縛る | 願う | 10 | ✓ G1189 = 22件（12+10） CONFIRMED |
| G1210 残留 (deo-bind) | δέω | — | 縛る | 43 | ✓ G1210 = 43件 CONFIRMED |

### 3.4 Phase 4r — downstream rebuild（未コミット）

| 成果物 | 状態 |
|--------|------|
| reading-lexicon-data.js | ✓ G1163/G1189/G1210 正値 CONFIRMED（Phase 4r audit PASS） |
| lexicon-lite.json | ✓ count/gloss/domains/ln 全更新 CONFIRMED |
| domains-cluster-index.json | ✓ G1210 除去・G1163 追加 CONFIRMED |
| domains-ln-index.json | ✓ G1210 除去 CONFIRMED |
| search-index/nt/ | ✓ 27書 再生成 CONFIRMED |

### 3.5 Phase 4s・4v — baseline更新（未コミット）

| ファイル | 更新内容 | 状態 |
|---------|---------|------|
| re-phase1-regression.cjs | morph 44280 → 44276 | ✓ ALL PASS (111 checks) |
| re-stageB-regression.cjs | changed 39679→39674 / identical 98062→98067 / brokenOld 1253→1245 | ✓ ALL PASS (27 checks) |

### 3.6 APPROVED_NOT_APPLIED 確認

**0件** — 全承認済み変更は適用済み。

---

## 4. 残件分類

### 4.1 HOLD_CONTEXT（文脈依存判断）

| # | ref | Strong | lemma | current ja | 選択肢 | 優先度 |
|---|-----|--------|-------|-----------|--------|--------|
| 1 | ACT 3:13!27 | G2919 | κρίνω | 裁く | `裁く`（judicial act維持）/ `決める`（personal decision） | HIGH |

**根拠（Phase 4l）**: ピラトの釈放決定は裁判手続き内の判断であり judicial act の可能性があるが、en=decided は個人的意思決定にも読める。両語義とも成立するため文脈判断が必要。

### 4.2 HOLD_LEXICAL（語義・訳語候補複数）

| # | Strong | lemma | tokens | current ja | 候補 | 優先度 |
|---|--------|-------|--------|-----------|------|--------|
| 1 | G1573 | ἐγκακέω | 6 | 〜である | `〜くじける` / `〜怠る` 等（MEDIUM confidence、複数案） | MEDIUM |
| 2 | G4823 | συμβουλεύω | 4 | 〜である | `〜相談する` / `〜助言する` 等（MEDIUM confidence、複数案） | MEDIUM |
| 3 | G566 | ἀπέχω | 1 | 〜である | 特殊用法（MRK 14:41!13、形容詞的用法の疑い） | LOW |

G1573/G4823 は推奨案が複数あり MEDIUM confidence。変更には追加確認が必要。  
G566 MRK 14:41!13（ἀπέχει）は「十分だ」「終わりだ」という特殊用法で、標準的な"離れる/避ける"では対応しない。

### 4.3 HOLD_DATA_QUALITY（bible_data フィールド異常疑い）

| # | ref | Strong | 問題 | 現在値 | 必要な確認 |
|---|-----|--------|------|--------|-----------|
| 1 | MRK 4:8!20 | G1520 | morph=PREP（εἷς に前置詞形は不存在） | japanese=一つ | G1519(εἰς) 混在か強引な用法か |
| 2 | MRK 4:8!23 | G1520 | 同上 | japanese=一つ | 同上 |
| 3 | MRK 4:20!19 | G1520 | 同上 | japanese=一つ | 同上 |
| 4 | MRK 4:20!22 | G1520 | 同上 | japanese=一つ | 同上 |
| 5 | MRK 4:20!25 | G1520 | 同上 | japanese=一つ | 同上 |
| 6 | LUK 24:28!11 | G4183 | greekForm=πορρώτερον（G4207相当？） | japanese=多くの | G4183 Strong 誤割当か |
| 7 | MRK 10:50!7 | G450 | lemma=ἀναπηδάω（G450=ἀνίστημι と不一致） | japanese=立ち上がる | Strong 誤割当か |

**Note**: ROM 1:10!6（G1210 deom疑い）は Phase 4q で G1189 へ修正済み → 残り7件。

### 4.4 JA1955 判断保留（Stage 5 行き）

#### 4.4.1 Stage 4 スコープ内（Group A）— 49件

| Strong | lemma | tokens in GA | HOLD件数 | 保留理由 |
|--------|-------|-------------|---------|---------|
| G435 | ἀνήρ | 99 | **45** | 文脈により「夫」「男」「人」混在。一律変更不可。 |
| G1538 | ἕκαστος | 35 | **2** | JA1955 に対応訳語なし。 |
| G1939 | ἐπιθυμία | 7 | **2** | JA1955 では複合表現に吸収。 |
| **合計** | | | **49** | |

#### 4.4.2 Stage 4 スコープ外（Group Z / 別分類）— 6件

| Strong | lemma | GA件数 | HOLD件数 | 備考 |
|--------|-------|--------|---------|------|
| G846 | αὐτός | **0** | 6 | Stage 4 対象外。Stage 5 行き。 |

G846 αὐτός intensive用法（自ら/自身）6件は GA（92,952）に含まれず、Stage 5 専用 HOLD。

### 4.5 REVISION_CANDIDATE（個別確認待ち）

#### Group A Tier 1（8,724 tokens / 20 Strongs）内の残件

| Strong | lemma | 件数 | 現行 ja | 問題 |
|--------|-------|------|--------|------|
| G3762 | οὐθείς | 10 | 何も〜ない | 全件 Phase 4e でフラグ。否定用法の微妙な格パターン。 |
| G4183 | πολύς | 4 | 多くの | 用法範囲（多い/大きい等）の整理が必要。LUK 24:28!11 HOLD_DATA_QUALITY とは別件。 |
| G2983 | λαμβάνω | 2 | 受け取る | 特定文脈での用法確認待ち。 |
| G3056 | λόγος | 1 | 言葉 | 特定用法の要確認。 |
| G4160 | ποιέω | 1 | 〜する | 特定用法の要確認。 |
| **小計** | | **18** | | |

#### Group A Tier 2（4,966 tokens / 36 Strongs）内の残件

| Strong | lemma | 件数 | 現行 ja | 問題 |
|--------|-------|------|--------|------|
| G3860 | παραδίδωμι | 1 | 引き渡す | Phase 4f フラグ。引き渡す/裏切る の文脈確認待ち。 |
| **小計** | | **1** | | |

#### Group D（377 tokens / 16 Strongs）内の残件

| Strong | lemma | 件数 | 現行 ja | 問題 |
|--------|-------|------|--------|------|
| G5616 | ὡσεί | 11 | 〜のように | 全11件が近似表現（"like"/"as if"）用法。ラベルと実用法の乖離。Group D 中全件が対象。 |
| G5228 | ὑπέρ | 1 | 〜のために | 2CO 11:23!6。副詞比較用法（even more）と前置詞ラベルの乖離。 |
| **小計** | | **12** | | |

**REVISION_CANDIDATE 合計: 31件**

### 4.6 UNREVIEWED（未監査）

#### Group A Tier 3-7（未着手）

| Tier | 出現数範囲 | Strongs | tokens（概算） |
|------|----------|---------|--------------|
| 3（n=50-99） | 50-99 | 79 | ~5,548 |
| 4（n=20-49） | 20-49 | 212 | ~6,534 |
| 5（n=10-19） | 10-19 | 347 | ~4,585 |
| 6（n=5-9） | 5-9 | 591 | ~3,895 |
| 7（n=1-4） | 1-4 | 2,910 | ~5,058 |
| **小計** | | **4,139** | **~25,620** |

#### Group F/G/H（未着手）

| Group | 説明 | Strongs | tokens |
|-------|------|---------|--------|
| F | pron plain（代名詞）| 46 | 5,544 |
| G | 関係代名詞 tilde | 3 | 1,657 |
| H | G4671 σοί | 1 | 69 |
| **小計** | | **50** | **7,270** |

**UNREVIEWED 合計: 32,890 tokens / 4,189 Strongs**

---

## 5. 残件集計サマリー

| 分類 | tokens | Strongs | 備考 |
|------|--------|---------|------|
| HOLD_CONTEXT | 1 | 1（G2919） | ACT 3:13!27 |
| HOLD_LEXICAL | 11 | 3（G1573/G4823/G566） | 訳語候補複数または特殊用法 |
| HOLD_DATA_QUALITY | 7 | 3（G1520/G4183/G450） | bible_data フィールド異常疑い |
| JA1955保留（Stage 4内） | 49 | 3（G435/G1538/G1939） | Stage 5 引き渡し候補 |
| JA1955保留（Stage 4外） | 6 | 1（G846） | Stage 4 スコープ外 |
| REVISION_CANDIDATE | 31 | 9 strongs | 個別確認待ち |
| UNREVIEWED（Group A T3-7） | ~25,620 | 4,139 | 未着手 |
| UNREVIEWED（Group F/G/H） | 7,270 | 50 | 未着手 |
| **APPROVED_NOT_APPLIED** | **0** | — | **ALL CLEAR** |

---

## 6. 「55 holds」の定義と現状

**55件 = JA1955 比較監査から引き継いだ「判断保留」**（stage5-hold-inventory.md Part 1）

| Strong | lemma | 件数 | Stage 4 スコープ | 現状 |
|--------|-------|-----|----------------|------|
| G435 | ἀνήρ | 45 | Group A（99 tokens中の45件） | 保留維持 |
| G846 | αὐτός | 6 | **Stage 4外** | Stage 5 専用保留 |
| G1538 | ἕκαστος | 2 | Group A（35 tokens中の2件） | 保留維持 |
| G1939 | ἐπιθυμία | 2 | Group A（7 tokens中の2件） | 保留維持 |
| **合計** | | **55** | | |

**補足**: stage5-hold-inventory.md の「Stage 4 内部 HOLD 8件」から ROM 1:10!6（G1210/G1189 deom疑い）が Phase 4q で解消された。残り7件（G1520×5, G4183×1, G450×1）は HOLD_DATA_QUALITY として継続中。

---

## 7. 母集団92,952件の現在状態マッピング

| 分類 | tokens | %（概算） | 根拠 |
|------|--------|----------|------|
| COMPLETED — 変更適用済み | 323 | 0.3% | Phase 4k(96)+4m(132)+4q(95) |
| COMPLETED — 確認済み変更不要 | ~5,812 | 6.3% | Group C(2494)+Group E(142)+Group B OK(2318)+Group D OK+Tier1/2 OK sample |
| Group Z（機能語、Stage 4除外） | 40,990 | 44.1% | 設計上の除外 |
| HOLD / REVISION_CANDIDATE | 99 | 0.1% | 上記4.1-4.5合計 |
| UNREVIEWED | ~32,890 | 35.4% | Group A T3-7 + Group F/G/H |
| 未分類・算出不確定 | ~12,838 | 13.8% | Group A T1-2 remaining + Group B/D partial |

**注記**: 全件を一意に分類するには Group A Tier 1-2 の OK/HOLD/REV 全件カウントが必要。上記の「COMPLETED 確認済み」はサンプル調査ベースの推計値であり、全件照合ではない。92,952件の完全な状態マッピングには、Group A Tier 1-2 の非サンプル部分（約25,620-851=24,769 tokens）の確認が必要。

---

## 8. 次 Phase 候補と優先順位

### 優先候補（推奨: Phase 4x）

**G1573 + G4823 最終訳語確定（HOLD_LEXICAL 解消）**

| 項目 | 内容 |
|------|------|
| 対象 | G1573 ἐγκακέω 6件 + G4823 συμβουλεύω 4件 = 10件 |
| 問題 | 現行「〜である」は Group B 語義誤適用（CONFIRMED_ERROR 確認済み）。推奨訳語候補が複数あり確定が必要。 |
| 必要な作業 | 各 Strong の語義・用例を再確認し、訳語を一意に決定 |
| データ変更 | bible_data 10件 token.japanese のみ |
| リスク | LOW（lexicon/index への影響なし、morph 非依存の訳語） |
| 依存 | なし |
| 推奨Phase | Phase 4x — G1573/G4823 訳語確定・実装 |

**理由**: 件数が少なく（10件）、コミット済み G863 と同じパターン（Group B 語義誤適用の確定エラー）。G2919 HOLD_CONTEXT と異なりユーザー文脈判断を要しない（語義自体の明確化のみ）。

### その他の候補

| 候補 | 対象 | 件数 | 優先度 | 備考 |
|-----|------|------|--------|------|
| HOLD_CONTEXT 解消 | G2919 ACT 3:13!27 | 1 | MEDIUM | ユーザー判断必要 |
| REVISION_CANDIDATE 確認 | G3762/G4183/G2983等 | 31 | MEDIUM | Group A Tier 1-2 |
| Group A Tier 3 サンプリング | 79 Strongs / ~5,548 tokens | — | LOW-MEDIUM | 次の量的調査 |
| Group F 開始 | 46 Strongs / 5,544 tokens | — | LOW | 代名詞グループ |
| HOLD_DATA_QUALITY 調査 | G1520/G4183/G450 | 7 | LOW | bible_data 設計確認が先 |
| G566 特殊用法判断 | G566 MRK 14:41!13 | 1 | LOW | 1件のみ |

---

## 9. 最終worktree確認

| 項目 | 値 |
|------|---|
| ブランチ | data/ja1955-nt-approved-132 |
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c（変化なし） |
| origin HEAD | 2120b4b4201a492bfd7f9f5e610e7b2833b02d31（変化なし） |
| Phase 4w によるファイル変更 | **0件**（READ-ONLY） |
| bible_data 変更 | なし |
| baseline 変更 | なし |
| commit / push | なし |
| 未コミット状態 | Phase 4m/4q/4r/4s/4v 適用済み（未コミット）を保持 |

---

## 10. 完了ステータス判定

| 条件 | 結果 |
|------|------|
| Phase 4k/4m/4q/4r/4s/4v 照合完了 | ✓ PASS |
| APPROVED_NOT_APPLIED = 0件 | ✓ CONFIRMED |
| bible_data変更なし（READ-ONLY遵守） | ✓ PASS |
| 残件の完全棚卸し | ✓ CONDITIONAL（全件照合ではなく分類別集計） |
| 次Phase推奨提示 | ✓ PASS |

**PHASE 4w CONDITIONAL PASS — UNRESOLVED INVENTORY**

CONDITIONAL の理由: Group A Tier 1-2 の非サンプル部分（~24,769 tokens）および Tier 3-7（~25,620 tokens）・Group F/G/H（7,270 tokens）は全件照合未実施のため、92,952件の完全な状態マッピングは不確定。
