# Stage 4 Phase 4y — G1573・G4823 10件実装・downstream検証

**Phase**: 4y  
**実施日**: 2026-11-03  
**目的**: Phase 4x 監査結果に基づく G1573/G4823 10件 token.japanese 変更・派生データ再構築・regression 検証  
**最終ステータス**: **PHASE 4y CONDITIONAL PASS**

CONDITIONAL の理由: re-stageB の changed/identical/brokenOld 3指標が Phase 4v baseline から乖離（変更自体は改善方向）。baseline 更新が別途必要。brokenNew=0・panelMismatch=0 の絶対条件は維持。

---

## 1. 作業前確認

| 項目 | 値 |
|------|---|
| ブランチ | data/ja1955-nt-approved-132 |
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| origin HEAD | 2120b4b4201a492bfd7f9f5e610e7b2833b02d31 |
| worktree M（修正済み追跡ファイル） | 132件（Phase 4m/4q/4r/4s/4v 適用済み） |
| 参照 Phase 4x 成果物 | stage4-phase4x-token-decisions.json ✓ |
| 10件 ref×bible_data 照合 | **PASS（10/10 current_ja=〜である 確認）** |

---

## 2. 実装対象

| Strong | lemma | tokens | 変更前 | 変更後 |
|--------|-------|--------|--------|--------|
| G1573 | ἐγκακέω | 6 | 〜である | **〜くじける** |
| G4823（能動） | συμβουλεύω | 2 | 〜である | **〜助言する** |
| G4823（中動） | συμβουλεύω | 2 | 〜である | **〜相談する** |

---

## 3. 事前スナップショット

| 項目 | 値 |
|------|---|
| スナップショットファイル | stage4-phase4y-pre-snapshot.json |
| 記録トークン数 | 10件 |
| 記録ファイル数 | 9ファイル |
| 変更前 SHA256 | スナップショット内記録 |

---

## 4. 実装

### 4.1 変更内容

| ref | strong | morph | from | to | file |
|-----|--------|-------|------|----|------|
| 2CO 4:1!10  | G1573 | V-PAI-1P | 〜である | 〜くじける | 2CO/4.json |
| 2CO 4:16!3  | G1573 | V-PAI-1P | 〜である | 〜くじける | 2CO/4.json |
| 2TH 3:13!5  | G1573 | V-AAS-2P | 〜である | 〜くじける | 2TH/3.json |
| EPH 3:13!4  | G1573 | V-PAN    | 〜である | 〜くじける | EPH/3.json |
| GAL 6:9!6   | G1573 | V-PAS-1P | 〜である | 〜くじける | GAL/6.json |
| LUK 18:1!13 | G1573 | V-PAN    | 〜である | 〜くじける | LUK/18.json |
| ACT 9:23!6  | G4823 | V-AMI-3P | 〜である | 〜相談する | ACT/9.json |
| JHN 18:14!5 | G4823 | V-AAP-NSM| 〜である | 〜助言する | JHN/18.json |
| MAT 26:4!2  | G4823 | V-AMI-3P | 〜である | 〜相談する | MAT/26.json |
| REV 3:18!1  | G4823 | V-PAI-1S | 〜である | 〜助言する | REV/3.json |

### 4.2 実装検証

| 条件 | 結果 |
|------|------|
| 対象 ref 10件が一意 | ✓ PASS |
| 10件すべてが承認値と一致 | ✓ PASS（10/10） |
| 対象外 token 変更 0件 | ✓ PASS |
| 禁止フィールド変更 0件（strong/lemma/morph 等） | ✓ PASS |
| JSON parse 全件 PASS | ✓ PASS |
| G1573 総数 6 / G4823 総数 4 | ✓ PASS |

### 4.3 事後 SHA256

| ファイル | SHA256 |
|---------|--------|
| 2CO/4.json | e0918a7e787d0a0fc5b6154a8f4bc99fe2c9dc254b3c72ac754b920de1f3e7fe |
| 2TH/3.json | 1d90ff754e868c0eb137d7b91cbe097a0a533dbfd2872420b1b67c572bd5d23c |
| EPH/3.json | 566442556353662aadeb3457cfb74afc2ae3d55bc80f66d2b9c4150ad78d5a9e |
| GAL/6.json | 3847d4744d3ecc9de25ed312b8caad8637c94718dac5cd1a2a246cb55c5bc60d |
| LUK/18.json | 5466f87aed1ef4d9b717860760b006f6eed3647786e3754114773de5627847bb |
| ACT/9.json | 0b53ef4fe37dd474a08c5f35dd54334ad2191b7bbf90df78697ee541dfb3c1a0 |
| JHN/18.json | 827bd209254f1c28d391e34e1f5e13711ec92075e4b163ae5d291116855d03e5 |
| MAT/26.json | c8c51f295da3ac3549e012c2ece5732e5a0283dcfac63dafaf49b60616610142 |
| REV/3.json | d899b4ce3801bb137c8a92ef963b9db3b71e405b1738a2d6805feb78c569777f |

---

## 5. downstream 再構築

### 5.1 reading-lexicon-data.js（npm run build:lexicon）

| 項目 | 結果 |
|------|------|
| 実行 | ✓ 正常完了 |
| 走査トークン | 617,364 |
| 集約対象 | 137,741 |
| エントリ数 | 5,440 |
| G1573 glosses | ["〜くじける"] ✓ |
| G4823 glosses | ["〜相談する", "〜助言する"] ✓ |

G4823 の glosses 順序: 各グロスの出現頻度は同数（各2件）のため、アルファベット昇順スキャン（ACT < JHN）で 〜相談する が先。正常動作。

### 5.2 search-index/nt/（npm run build:search-index）

| 項目 | 結果 |
|------|------|
| 実行 | ✓ 正常完了（NT + LXX 全書） |
| 総章数 | 1,191 |
| 総トークン数 | 617,364 |

### 5.3 lexicon-lite.json

| 項目 | 結果 |
|------|------|
| G1573 内容変化 | なし（count=6 維持） |
| G4823 内容変化 | なし（count=4 維持） |
| フォーマット変化 | あり（minified→pretty-printed。search-index rebuild に伴う再整形） |
| 内容意味的等価 | ✓ CONFIRMED |

---

## 6. morph 展開確認

### 〜くじける（G1573）

| morph | Tier2 出力 | Tier1(null) 出力 | 一致 | 評価 |
|-------|-----------|----------------|------|------|
| V-PAI-1P | 〜くじける | 〜くじける | ✓ | 正常（present indicative = base form） |
| V-AAS-2P | 〜くじける | 〜くじける | ✓ | 正常 |
| V-PAN | **〜くじけること** | 〜くじける | ✗ | Tier2 不定詞名詞化（こと 付加）= 文法的に正当。不一致は Tier2/Tier0 制限。 |
| V-PAS-1P | 〜くじける | 〜くじける | ✓ | 正常 |

### 〜助言する（G4823 能動態）

| morph | Tier2 出力 | Tier1(null) 出力 | 一致 | 評価 |
|-------|-----------|----------------|------|------|
| V-AAP-NSM | **〜助言した** | 〜助言する | ✗ | Tier2 能動分詞→過去形 = 文法的に正当（「助言した方」のニュアンスは正確）。不一致は Tier2/Tier0 制限。 |
| V-PAI-1S | 〜助言する | 〜助言する | ✓ | 正常 |

### 〜相談する（G4823 中動態）

| morph | Tier2 出力 | Tier1(null) 出力 | 一致 | 評価 |
|-------|-----------|----------------|------|------|
| V-AMI-3P | 〜相談する | 〜相談する | ✓ | 正常 |

### morph 評価まとめ

- **engine 変更は不要**。Tier2/Tier0 不一致は既存設計範囲内（Tier2 は従来動作、Tier0 は engine 解決）。
- V-PAN「〜くじけること」= 不定詞名詞化として文法的に適切。
- V-AAP-NSM「〜助言した」= 能動分詞過去形として文法的に適切。JHN 18:14 の文脈（「かつて助言した者であった」）にも意味が合致。
- いずれも brokenNew = 0（新経路での破損形ゼロ）を維持している。

---

## 7. re-stageB 差分分析

### 7.1 数値比較

| 指標 | Phase 4v baseline | Phase 4y 実測 | 差分 | 判定 |
|------|-----------------|--------------|------|------|
| tokens | 137,741 | 137,741 | 0 | ✓ |
| changed | 39,674 | **39,673** | **−1** | FAIL（改善） |
| identical | 98,067 | **98,068** | **+1** | FAIL（改善） |
| brokenOld | 1,245 | **1,244** | **−1** | FAIL（改善） |
| **brokenNew** | 0 | **0** | 0 | **✓ 絶対条件 PASS** |
| **panelMismatch** | 0 | **0** | 0 | **✓ 絶対条件 PASS** |
| presented | 4,258 | 4,258 | 0 | ✓ |

### 7.2 差分の根拠

#### changed −1 / identical +1

| 旧 japanese | 旧 T2 | 旧 T0/engine | 旧 bucket | 新 japanese | 新 T2 | 新 T0/engine | 新 bucket |
|------------|--------|------------|---------|------------|--------|------------|---------|
| 〜である（該当1件） | 〜である | （engine: 別値） | changed | 新 japanese | 新 T2 | 新 T2 と一致 | identical |

Phase 4v baseline では、今回の10件のうち1件が「Tier2 と engine 解決値の不一致（changed）」に分類されていた。Phase 4y で japanese を変更した結果、engine が新 japanese をそのまま解決として返し、Tier2 出力と一致 → identical に移行。

#### brokenOld −1

| token | 旧 T2 出力 | 旧 brokenOld | 新 T2 出力 | 新 brokenOld |
|-------|-----------|------------|-----------|------------|
| JHN 18:14!5 V-AAP-NSM | **〜であた**（不完全な活用形） | ✓ カウント | **〜助言した**（正常な過去形） | ✗ カウントなし |

旧 japanese「〜である」が V-AAP-NSM（能動分詞）で Tier2 展開されると「〜であた」（活用失敗形）を生成していた。新 japanese「〜助言する」では「〜助言した」（正常な過去形）に展開されるため isBrokenForm が false になり brokenOld が1減少。

### 7.3 絶対条件確認

| 条件 | 結果 | 備考 |
|------|------|------|
| brokenNew = 0 | **✓ PASS** | 新経路での破損形ゼロ |
| panelMismatch = 0 | **✓ PASS** | chip⇔StudyPanel 不一致ゼロ |

---

## 8. regression テスト総括

| テスト | 結果 | checks |
|-------|------|--------|
| re-phase1 | **ALL PASS** | 111 |
| re-stageA | **ALL PASS** | 19 |
| re-stageB | **CONDITIONAL**（3指標乖離、絶対条件 PASS） | 27 |
| re-stageD | **ALL PASS** | 18 |

---

## 9. baseline 更新の必要性

Phase 4y により re-stageB baseline から3指標が乖離した（いずれも改善方向）:

| 指標 | 現行 baseline | 推奨新 baseline |
|------|-------------|----------------|
| changed | 39,674 | **39,673** |
| identical | 98,067 | **98,068** |
| brokenOld | 1,245 | **1,244** |
| brokenNew | 0 | 0（不変） |
| panelMismatch | 0 | 0（不変） |

**baseline 変更は Phase 4y では実施しない（Phase 4y 指示に従い報告のみ）。**  
→ Phase 4z で baseline 更新を実施することを推奨する。

---

## 10. 作業後確認

| 項目 | 値 |
|------|---|
| ブランチ | data/ja1955-nt-approved-132（変化なし） |
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c（変化なし） |
| origin HEAD | 2120b4b4201a492bfd7f9f5e610e7b2833b02d31（変化なし） |
| Phase 4y による新規 dirty ファイル | 9件（bible_data）+ 3件（downstream）= 12件 |
| commit / push | なし |

---

## 11. 完了条件チェックリスト

| 条件 | 結果 |
|------|------|
| 10件すべて正確に変更 | ✓ PASS |
| Strong/lemma/morph 等禁止フィールド変更なし | ✓ PASS |
| downstream 再構築完了（lexicon/search-index） | ✓ PASS |
| brokenNew = 0 | ✓ **PASS（絶対条件）** |
| panelMismatch = 0 | ✓ **PASS（絶対条件）** |
| re-phase1/re-stageA/re-stageD ALL PASS | ✓ PASS |
| re-stageB 絶対条件 PASS | ✓ PASS（changed/identical/brokenOld は baseline 乖離） |
| morph 展開確認（engine 変更不要） | ✓ PASS |
| baseline 変更なし（Phase 4y では禁止） | ✓ PASS |
| commit / push なし | ✓ PASS |

**PHASE 4y CONDITIONAL PASS**

次アクション: Phase 4z — re-stageB baseline 更新（39673/98068/1244）
