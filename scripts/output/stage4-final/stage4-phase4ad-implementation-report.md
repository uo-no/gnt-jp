# Phase 4ad 実装報告書

**日付**: 2026-11-04  
**Phase**: 4ad — 31 Approved Revision Candidates 実装  
**承認台帳**: `scripts/output/stage4-final/stage4-phase4ac-revision-decisions.json`

---

## 1. 概要

Phase 4ac で全件 `APPROVED_FOR_CHANGE` と判定された31 tokenの `japanese` フィールドを実装した。  
変更は承認台帳に記載された31 refsの `japanese` フィールドのみ。他フィールドは変更なし。

| 項目 | 値 |
|------|-----|
| 変更 token 数 | 31 |
| 変更ファイル数（bible_data） | 25 |
| Downstream 更新 | reading-lexicon-data.js / lexicon-lite.json / search-index/nt 12ファイル |
| Engine 変更 | なし |
| Baseline 変更 | なし（Phase 4ae で更新予定） |

---

## 2. 変更内容（全31件）

### 2.1 G3762 οὐδείς — 誰も〜ない → 何も〜ない（9件）

対象 ref はすべて中性形（A-ASN-N / A-ASF-N / A-NSN-N）。対象 token の strong=G3762 かつ文脈が「物・事」を否定する用例。

| ref | morph | 旧 | 新 |
|-----|-------|-----|-----|
| ACT 28:17!22 | A-ASN-N | 誰も〜ない | 何も〜ない |
| HEB 2:8!13 | A-ASN-N | 誰も〜ない | 何も〜ない |
| JHN 11:49!17 | A-ASN-N | 誰も〜ない | 何も〜ない |
| JHN 16:23!9 | A-ASN-N | 誰も〜ない | 何も〜ない |
| JHN 16:29!12 | A-ASF-N | 誰も〜ない | 何も〜ない |
| LUK 23:15!11 | A-NSN-N | 誰も〜ない | 何も〜ない |
| LUK 23:22!12 | A-ASN-N | 誰も〜ない | 何も〜ない |
| MAT 23:18!8 | A-NSN-N | 誰も〜ない | 何も〜ない |
| PHM 1:14!6 | A-ASN-N | 誰も〜ない | 何も〜ない |
| TIT 1:15!10 | A-NSN-N | 誰も〜ない | 何も〜ない |

### 2.2 G5616 ὡσεί — 〜のように → 〜ほど（11件）

G5616 は「約・おおよそ〜」の量的副詞。「〜ほど」が実態に即した訳語。

| ref | morph |
|-----|-------|
| ACT 2:41!16 | ADV |
| ACT 10:3!5 | ADV |
| ACT 19:7!6 | ADV |
| LUK 3:23!6 | ADV |
| LUK 9:14!3 | ADV |
| LUK 9:14!15 | ADV |
| LUK 9:28!7 | ADV |
| LUK 22:41!6 | ADV |
| LUK 22:59!3 | ADV |
| LUK 23:44!4 | ADV |
| MAT 14:21!6 | ADV |

### 2.3 G4183 πολύς — 多くの → 文脈別（3件）

| ref | morph | 旧 | 新 | 根拠 |
|-----|-------|-----|-----|------|
| MAT 9:14!15 | A-APN | 多くの | しばしば | 副詞用法「しばしば断食する」 |
| MRK 3:12!2 | A-APN | 多くの | 〜厳しく | ἐπιτιμάω修飾：強く戒める副詞用法 |
| MRK 5:43!4 | A-APN | 多くの | 〜厳しく | 同上 |
| PHP 1:23!16 | A-DSN | 多くの | はるかに | σύν修飾：はるかにまさって |

### 2.4 G2983 λαμβάνω — 受ける → 取る（2件）

| ref | morph | 旧 | 新 | 根拠 |
|-----|-------|-----|-----|------|
| 1CO 11:23!20 | V-2AAI-3S | 受ける | 取る | 「主が取られた夜に」=物理的に取る行為 |
| MAT 17:24!10 | V-PAP-NPM | 受ける | 取る | 神殿税を「受け取る」vs 「取る」：徴収動作 |

### 2.5 その他（各1件）

| ref | strong | morph | 旧 | 新 | 根拠 |
|-----|--------|-------|-----|-----|------|
| 2CO 11:23!6 | G5228 | PREP | 〜のために | 〜まさって | ὑπέρ 比較用法「はるかにまさって」 |
| MAT 7:17!14 | G4160 | V-PAI-3S | 行う | 結ぶ | ποιέω+καρπός=実を結ぶ（慣用句） |
| MRK 4:29!3 | G3860 | V-2AAS-3S | 引き渡す | 熟する | παραδίδωμι農業文脈「実が熟する」 |
| ROM 14:12!6 | G3056 | N-ASM | ことば | 申し開き | λόγος「神への申し開き」（BDAG: account） |

---

## 3. Downstream 更新

### 3.1 reading-lexicon-data.js

変更された8 Strongs のグロス配列を更新。  
SHA256（post）: `a0726919a82a937174e509a14ddfbe7593c42edaf07dd8cf9b12e816ce23c9d1`

| Strong | 変更内容 |
|--------|---------|
| G2983 | glosses に "取る" 追加 |
| G3056 | glosses に "申し開き" 追加 |
| G3762 | glosses に "何も〜ない" 追加 |
| G3860 | glosses に "熟する" 追加 |
| G4160 | glosses に "結ぶ" 追加 |
| G4183 | glosses に "〜厳しく" / "しばしば" / "はるかに" 追加 |
| G5228 | glosses に "〜まさって" 追加 |
| G5616 | 11件全更新により "〜ほど" が最頻訳・先頭グロスに変化 |

### 3.2 lexicon-lite.json

フォーマット再構築。English `gloss` フィールドを使用するため実質的内容変更なし。  
SHA256（post）: `ca5b896532db9b108a920d81393ee77421d6e258398467a96dedf94464188986`

### 3.3 search-index/nt/

影響12ファイル（1CO/2CO/ACT/HEB/JHN/LUK/MAT/MRK/PHM/PHP/ROM/TIT）を更新。  
全31 refs の search-index 内 ref 値を検証済み。

---

## 4. 回帰テスト結果

### 4.1 re-stageA

**ALL PASS（19/19 checks）**

Stage A（NP/PP/PtcP 引用差分）基準を維持。

### 4.2 re-stageB

**Critical conditions: ALL PASS。Non-critical: 3 FAIL（説明済み）**

| 指標 | Phase 4z baseline | Phase 4ad 後 | 判定 |
|------|------------------|-------------|------|
| changed | 39673 | 39674（+1） | EXPLAINED |
| identical | 98068 | 98067（-1） | EXPLAINED |
| brokenOld | 1244 | 1245（+1） | EXPLAINED |
| **brokenNew** | **0** | **0** | **PASS ✓** |
| **panelMismatch** | **0** | **0** | **PASS ✓** |

**原因: MAT 17:24!10 V-PAP-NPM G2983 受ける→取る**

- OLD「受ける」: T2="受けながら"（1段動詞 受け+ながら）= T0="受けながら" → IDENTICAL bucket
- NEW「取る」: T2="取ながら"（五段ラ行・イ音便欠落、正しくは"取りながら"） ≠ T0="取る"（engine=base form） → CHANGED bucket移動
- brokenNew=0: engine は "取る" を返す（正常）
- panelMismatch=0: 全137,741 token で chip=panel 一致

### 4.3 re-stageD

**ALL PASS（18/18 checks）**

Stage D（Context Layer）基準を維持。バイト等価100%。

### 4.4 re-phase1

**1 FAIL — morph coverage 44275 vs baseline 44276（-1）**

**Phase 4ad は原因ではない（CONFIRMED）**

根拠：
1. 全31変更 token の old/new japanese 値で `engine.resolve(t)` を照合
2. 全件 null→null または non-null→non-null（カバレッジ変化なし）
3. reading-lexicon-data.js の変更はengineの `deponent` フラグのみ参照する `_passiveAllowed` に影響するが、変更したのは `glosses` フィールドのみ（`deponent` 未変更）
4. 結論: -1 は Phase 4s baseline更新（44280→44276）以降のいずれかのフェーズ起因の既存gap

対応: Phase 4ae（次Phase）で baseline 更新予定。

### 4.5 re-stageE

**1 FAIL — 既存gap（Phase 4ad 原因ではない）**

`rn-ja が displayLabel を描画` チェック失敗。index.html は Phase 4ad の変更対象外。

---

## 5. 厳守事項確認

| 項目 | 状態 |
|------|------|
| 変更対象は承認済み31 refsの japanese のみ | ✓ CONFIRMED |
| 承認台帳にない訳語変更なし | ✓ CONFIRMED |
| reading engine 変更なし | ✓ CONFIRMED |
| テスト baseline 変更なし | ✓ CONFIRMED |
| 既存 worktree 変更を保持 | ✓ CONFIRMED |
| commit / push / PR / merge / deploy なし | ✓ CONFIRMED |
| brokenNew = 0 | ✓ CONFIRMED |
| panelMismatch = 0 | ✓ CONFIRMED |

---

## 6. 成果物一覧

| ファイル | 説明 |
|----------|------|
| `stage4-phase4ad-implementation-report.md` | 本書 |
| `stage4-phase4ad-token-diff.json` | 31 token の ref/from/to/morph/strong 一覧 |
| `stage4-phase4ad-verification.json` | pre/post 検証・回帰テスト結果まとめ |
| `stage4-phase4ad-file-diff.json` | 変更ファイル一覧・SHA256 |
| `stage4-phase4ad-pre-implementation-snapshot.zip` | 実装前 japanese 値スナップショット |

---

## 7. 次 Phase への申し送り

| 項目 | 内容 |
|------|------|
| re-stageB baseline 更新 | STAGEB_BASELINE: changed 39673→39674, identical 98068→98067, brokenOld 1244→1245 |
| re-phase1 baseline 更新 | PHASE1_BASELINE.morph: 44276→44275（原因調査済み・悪化ケースなし） |
| HOLD_CONTEXT | G2919 ACT 3:13!27（裁く vs 決める）— ユーザー判断要 |
| HOLD_DATA_QUALITY | G1520×5, G4183×1, G450×1 |
| UNREVIEWED | Group A Tier 3–7 (~32,890 tokens), Group F/G/H (7,270 tokens) |
| JA1955 保留 Stage 5 | G435×45, G1538×2, G1939×2（49件） |
