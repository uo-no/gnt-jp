# Stage 4 Phase 4ab — G566 ἀπέχω 1件実装・downstream 検証

**Phase**: 4ab
**実施日**: 2026-11-04
**目的**: Phase 4aa で APPROVED_FOR_CHANGE と判定された G566 ἀπέχω MRK 14:41!13 の token.japanese 変更
**最終ステータス**: **PHASE 4ab PASS**

---

## 1. 作業前確認

| 項目 | 値 |
|------|---|
| ブランチ | data/ja1955-nt-approved-132 |
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| origin HEAD | 2120b4b4201a492bfd7f9f5e610e7b2833b02d31 |
| worktree M files | 137件（Phase 4m/4q/4r/4s/4v/4y 適用済み） |
| Phase 4aa 成果物 | stage4-phase4aa-g566-audit.md / stage4-phase4aa-g566-decision.json ✓ |
| 対象 ref の japanese | 〜である ✓ |
| 対象 ref の strong | G566 ✓ |
| G566 NT 総数 | **1件**（ハパックス — MRK 14:41!13 のみ） |

---

## 2. 実装対象

| フィールド | 値 |
|-----------|---|
| ref | MRK 14:41!13 |
| strong | G566 |
| lemma | ἀπέχω |
| text | ἀπέχει |
| morph | V-PAI-3S |
| from | 〜である |
| to | **〜十分だ** |
| file | public/bible_data/nt/MRK/14.json |

---

## 3. 事前 snapshot

| 項目 | 値 |
|------|---|
| スナップショット | stage4-phase4ab-pre-implementation-snapshot.zip |
| 収録ファイル | stage4-phase4ab-pre-snapshot.json |
| pre-change SHA256 (MRK/14.json) | 0bea037a3f382ae0e126c23c4cdf68726a213aa5aa889cda87262d6d66b70782 |

---

## 4. 実装

### 4.1 変更

| ref | strong | morph | from | to | file |
|-----|--------|-------|------|----|------|
| MRK 14:41!13 | G566 | V-PAI-3S | 〜である | **〜十分だ** | MRK/14.json |

### 4.2 token-level 検証

| 条件 | 結果 |
|------|------|
| japanese = 〜十分だ | ✓ PASS |
| strong = G566 | ✓ 不変 |
| morph = V-PAI-3S | ✓ 不変 |
| lemma = ἀπέχω | ✓ 不変 |
| text = ἀπέχει | ✓ 不変 |
| 禁止フィールド変更 0件 | ✓ PASS |
| 隣接 token 不変 | ✓ PASS（!12 休ませる / !14 来る） |
| JSON parse PASS | ✓ PASS |
| G566 NT 総数 = 1 | ✓ PASS |

### 4.3 事後 SHA256

| ファイル | SHA256 |
|---------|--------|
| MRK/14.json | 1964f15eefd918526fd1286fb7c5f3c7974bbc081d54016fbeae7ee342dc16cb |

---

## 5. downstream 更新

### 5.1 reading-lexicon-data.js（npm run build:lexicon）

| 項目 | 結果 |
|------|------|
| 実行 | ✓ 正常完了 |
| 走査トークン | 617,364 |
| 集約対象 | 137,741 |
| エントリ数 | 5,440 |
| G566 glosses | ["〜十分だ"] ✓ |

**注**: G567（〜避ける）の変化は Phase 4m の既存 worktree 変化。Phase 4ab の新規変更ではない。

### 5.2 search-index/nt/（npm run build:search-index）

| 項目 | 結果 |
|------|------|
| 実行 | ✓ 正常完了（NT + LXX 全書） |
| 総章数 | 1,191 |
| 総トークン数 | 617,364 |
| MRK.json G566 japanese | 〜十分だ ✓ |
| LXX token content | 変更なし ✓ |

### 5.3 lexicon-lite.json

| 項目 | 結果 |
|------|------|
| G566 gloss（English） | "It is enough"（不変） |
| 内容変化 | なし（lexicon-lite は English gloss を使用。japanese field は影響しない） |
| フォーマット変化 | あり（minified→pretty-printed。search-index rebuild に伴う再整形。Phase 4y と同一パターン） |

---

## 6. morph 展開確認

| morph | japanese | Tier2 予測 | Tier1(null) | match | 評価 |
|-------|---------|------------|-------------|-------|------|
| V-PAI-3S | 〜十分だ | **〜十分だ** | 〜十分だ | ✓ | 現在直説法基本形 = 活用なし |

**brokenNew: 0**（re-stageB ALL PASS が実証）

---

## 7. regression テスト

| テスト | 結果 | checks |
|-------|------|--------|
| **re-stageB** | **ALL PASS** | **27** |
| re-phase1 | ALL PASS | 111 |
| re-stageA | ALL PASS | 19 |
| re-stageD | ALL PASS | 18 |

### re-stageB 詳細

| 指標 | Phase 4z baseline | Phase 4ab 実測 | 差分 | 判定 |
|------|-----------------|--------------|------|------|
| changed | 39,673 | 39,673 | **0** | ✓ PASS |
| identical | 98,068 | 98,068 | **0** | ✓ PASS |
| brokenOld | 1,244 | 1,244 | **0** | ✓ PASS |
| **brokenNew** | 0 | **0** | 0 | **✓ 絶対条件 PASS** |
| **panelMismatch** | 0 | **0** | 0 | **✓ 絶対条件 PASS** |
| tokens | 137,741 | 137,741 | 0 | ✓ PASS |
| presented | 4,258 | 4,258 | 0 | ✓ PASS |

### re-stageB delta = 0 の理由

MRK 14:41!13 V-PAI-3S は変更前から "identical" バケットに属していた。

| | 変更前 | 変更後 |
|-|--------|--------|
| japanese | 〜である | 〜十分だ |
| Tier2 (V-PAI-3S) | 〜である（基本形 = 変化なし） | 〜十分だ（基本形 = 変化なし） |
| Tier0 (engine) | 〜である（bible_data から直接解決） | 〜十分だ（bible_data から直接解決） |
| bucket | identical | identical |

V-PAI-3S（現在直説法3単）はどちらの値に対しても Tier2 = Tier0 = 基本形。bucket は unchanged → unchanged。

---

## 8. baseline 更新

**不要。**

Phase 4z baseline（changed=39673/identical=98068/brokenOld=1244）は Phase 4ab 後も有効。

---

## 9. 完了条件チェックリスト

| 条件 | 結果 |
|------|------|
| 1件のみ変更（MRK 14:41!13） | ✓ PASS |
| japanese = 〜十分だ | ✓ PASS |
| 禁止フィールド（strong/morph/lemma/text 等）変更なし | ✓ PASS |
| downstream rebuild 完了（lexicon/search-index） | ✓ PASS |
| **brokenNew = 0** | ✓ **PASS（絶対条件）** |
| **panelMismatch = 0** | ✓ **PASS（絶対条件）** |
| re-phase1/re-stageA/re-stageD ALL PASS | ✓ PASS |
| re-stageB ALL PASS（baseline 一致） | ✓ **PASS** |
| baseline 変更なし | ✓ PASS |
| commit / push なし | ✓ PASS |
| 既存 worktree 変更を保持 | ✓ PASS（137件 M files 維持） |
| reading engine 変更なし | ✓ PASS |

---

## 10. 作業後状態

| 項目 | 値 |
|------|---|
| ブランチ | data/ja1955-nt-approved-132（変化なし） |
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c（変化なし） |
| commit / push | なし |
| Phase 4ab による新規 dirty ファイル | 3件（bible_data 1件 + downstream 2件） |

---

## 11. HOLD_LEXICAL 残件状態

Phase 4ab 完了をもって、Phase 4w で記録した **HOLD_LEXICAL 11件（G1573×6 / G4823×4 / G566×1）が全件解消**した。

| Phase | 内容 | 件数 | 状態 |
|-------|------|------|------|
| 4y | G1573（〜くじける×6）/ G4823（〜助言する×2 / 〜相談する×2） | 10件 | ✓ 完了 |
| 4ab | G566（〜十分だ×1） | 1件 | ✓ 完了 |
| **合計** | HOLD_LEXICAL 全件 | **11件** | **✓ 全件解消** |

---

**PHASE 4ab PASS**

次の残件: Phase 4w 記録の HOLD_CONTEXT（G2919 ACT 3:13!27 1件）/ HOLD_DATA_QUALITY（G1520×5, G4183×1, G450×1）/ REVISION_CANDIDATE（31件）/ UNREVIEWED（Group A Tier 3〜 / Group F/G/H）
