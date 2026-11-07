# Stage 4 Phase 4au — G3056 λόγος 7件 Bible JSON 実装報告

**Phase**: 4au
**実施日**: 2026-11-04
**種別**: DATA (token.japanese 変更)

---

## 1. 作業前確認

| 項目 | 値 |
|------|-----|
| branch | data/ja1955-nt-approved-132 |
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| origin HEAD | ba5c55a3ff6d76a37ee7a6edd31f2c81f639d356 |
| 承認根拠 | stage4-phase4at-g3056-audit.json（APPROVE_MOSHIHIRAKI 6件 + APPROVE_OTHER_GLOSS 1件） |
| Phase 4at overall_verdict | CONDITIONAL PASS |

---

## 2. 変更内容

### 2.1 APPROVE_MOSHIHIRAKI（6件）

| ref | 旧訳 | 新訳 | 構文根拠 |
|-----|------|------|---------|
| MAT 12:36!15 | ことば | 申し開き | ἀποδώσουσιν (G591) + λόγον（裁きの日に申し開き） |
| LUK 16:2!13 | ことば | 申し開き | ἀπόδος (G591) + τὸν λόγον（管理の申し開きをせよ） |
| ACT 19:40!17 | ことば | 申し開き | ἀποδοῦναι (G591) + λόγον（騒乱について申し開きできない） |
| HEB 13:17!15 | ことば | 申し開き | ἀποδώσοντες (G591) + λόγον（魂のために申し開きをする） |
| 1PE 3:15!18 | ことば | 申し開き | αἰτοῦντι (G154) + λόγον（+ἀπολογίαν 文脈） |
| 1PE 4:5!3 | ことば | 申し開き | ἀποδώσουσιν (G591) + λόγον（裁き主に申し開き） |

### 2.2 APPROVE_OTHER_GLOSS（1件）

| ref | 旧訳 | 新訳 | 根拠 |
|-----|------|------|-----|
| ACT 1:1!4 | ことば | 著述 | λόγον ποιέομαι（中動態）= ルカ序文の著述定型 |

**変更フィールド**: `token.japanese` のみ

**不変フィールド**: strong / morph / text / lemma / ref / verse / tokenIndex / その他すべて

---

## 3. 事前照合

| チェック | 件数 | 判定 |
|---------|------|------|
| Phase 4at APPROVE_MOSHIHIRAKI + APPROVE_OTHER_GLOSS 抽出 | 7 | ✓ PASS |
| 全7件のstrong = G3056 | 7 | ✓ PASS |
| 全7件のmorph = N-ASM | 7 | ✓ PASS |
| 全7件のjapanese = ことば（Phase 4at記録と一致） | 7 | ✓ PASS |

**事前照合: PASS（4/4）**

---

## 4. 実装結果

| 項目 | 値 |
|------|-----|
| 変更ファイル数 | 7 |
| 変更トークン数 | 7 |
| エラー | 0 |

| ファイル | ref | 旧訳 | 新訳 |
|---------|-----|------|------|
| public/bible_data/nt/1PE/3.json | 1PE 3:15!18 | ことば | 申し開き |
| public/bible_data/nt/1PE/4.json | 1PE 4:5!3 | ことば | 申し開き |
| public/bible_data/nt/ACT/1.json | ACT 1:1!4 | ことば | 著述 |
| public/bible_data/nt/ACT/19.json | ACT 19:40!17 | ことば | 申し開き |
| public/bible_data/nt/HEB/13.json | HEB 13:17!15 | ことば | 申し開き |
| public/bible_data/nt/LUK/16.json | LUK 16:2!13 | ことば | 申し開き |
| public/bible_data/nt/MAT/12.json | MAT 12:36!15 | ことば | 申し開き |

---

## 5. 事後検証

| チェック | 期待値 | 実測値 | 判定 |
|---------|--------|--------|------|
| 7件 japanese = 承認訳語（bible_data） | 7 | 7 | ✓ PASS |
| 7件 strong = G3056（不変） | 7 | 7 | ✓ PASS |
| 7件 morph = N-ASM（不変） | 7 | 7 | ✓ PASS |
| RETAIN_KOTOBA 116件 japanese 不変（同ファイル内） | 全件 | 全件 | ✓ PASS |
| JSON parse 整合性（全7ファイル） | エラーなし | エラーなし | ✓ PASS |
| token-diff.json 件数 | 7 | 7 | ✓ PASS |
| 全7ファイルのSHA256変化 | 7 | 7 | ✓ PASS |

**事後検証: PASS（7/7）**

---

## 6. 下流データ更新

| ファイル | 処理 | 結果 |
|---------|------|------|
| public/assets/data/reading-lexicon-data.js | npm run build:lexicon 再生成（137,741 tokens） | G3056: glosses に「申し開き」「著述」追加 ✓ |
| public/search-index/nt/*.json | npm run build:search-index 再生成（617,364 tokens） | 7/7 tokens 新訳語に更新 ✓ |

---

## 7. 回帰テスト

| テスト | 結果 |
|--------|------|
| re-phase1 | ✓ ALL PASS (106 unit + 111 NT-wide checks) |
| re-stageA | ✓ ALL PASS (14 unit + 19 checks) |
| re-stageB | ✓ ALL PASS (20 unit + 27 checks) |
| re-stageD | ✓ ALL PASS (10 unit + 18 checks) |

### Stage B 重点指標

| 指標 | 値 | 判定 |
|------|-----|------|
| brokenNew | 0 | ✓ PASS |
| panelMismatch | 0 | ✓ PASS |
| tokens | 137,741 | — |
| changed | 39,674 | — |

---

## 8. 成果物一覧

| ファイル | 内容 |
|---------|------|
| `stage4-phase4au-token-diff.json` | 7件のref・旧値・新値 |
| `stage4-phase4au-file-diff.json` | 7ファイルのpre/post SHA256 |
| `stage4-phase4au-pre-implementation-snapshot.json` | 変更前スナップショット（123件全員の japanese 保存） |
| `stage4-phase4au-pre-implementation-snapshot.zip` | 同上 ZIP |
| `stage4-phase4au-verification.json` | 全検証チェック結果 |
| `stage4-phase4au-implementation-report.md` | 本ファイル |

---

## 9. 未変更・保護ファイル

- stage4-phase4ag-residual-inventory.json（変更なし）
- reading-engine.js（変更なし）
- regression baseline（変更なし）
- commit / push / PR なし

---

## 10. 判定

**PHASE 4au PASS**

| 条件 | 判定 |
|------|------|
| APPROVE_MOSHIHIRAKI 6件 token.japanese = 申し開き | ✓ PASS |
| APPROVE_OTHER_GLOSS 1件 token.japanese = 著述（ACT 1:1!4） | ✓ PASS |
| 7件以外の変更なし（bible_data・lexicon・search-index以外） | ✓ PASS |
| RETAIN_KOTOBA 116件 不変（同ファイル内確認） | ✓ PASS |
| 禁止フィールド（strong / morph / text / lemma 等）変更なし | ✓ PASS |
| JSON整合性 7ファイル | ✓ PASS |
| 下流データ（lexicon, search-index）更新完了 | ✓ PASS |
| re-phase1 / re-stageA / re-stageB / re-stageD: PASS | ✓ PASS |
| brokenNew=0 / panelMismatch=0 | ✓ PASS |

---

## 11. 次フェーズへの申し送り

| 優先 | 対象 | 件数 | 状態 |
|------|------|------|------|
| 高 | G3056 N-ASM 116件 → Phase 4ag RETAIN_CONFIRMED 昇格 | 116 | UNREVIEWED（別フェーズ） |
| 高 | G3762 masculine forms 再分類 | 119 | UNREVIEWED（誰も〜ない で正しい） |
| 中 | PHP 4:15!15 L-0設計判断 | 1 | CONTEXT_DEPENDENT |
| 中 | G3708 V-RAP 設計判断 | 20+5 | UNREVIEWED |
| 中 | G4183/G2983/G4160 exception | 101 | UNREVIEWED |

**現在の UNREVIEWED 残存: 33,335件（Phase 4ag 変更なし）**
