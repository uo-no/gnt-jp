# Stage 4 Phase 4m — 実装報告書

**Phase**: 4m  
**作成日**: 2026-11-02  
**ステータス**: IMPLEMENTATION COMPLETE — HUMAN REVIEW  
**根拠**: `stage4-phase4l-final-judgment.json`（APPROVED_FOR_CHANGE 132件）

---

## 実装概要

Phase 4l で `APPROVED_FOR_CHANGE` と判定された132件について、`bible_data` の `token.japanese` のみを変更した。

- 変更対象: `token.japanese` フィールド（1フィールドのみ）
- 変更除外: `token.strong`、`token.lemma`、`token.morph`、`token.greekForm`、その他全フィールド
- 判定JSONを唯一の実装リストとして使用（報告書件数からの再構成なし）

---

## 変更内容（Strong別）

| Strong | 語 | 変更件数 | 変更前 | 変更後 | 信頼度 |
|--------|---|---:|------|------|-------|
| G756 | ἄρχομαι | 84 | 〜である | 〜し始める | HIGH (79) / MEDIUM (5) |
| G680 | ἅπτομαι | 34 | 〜である | 〜さわる | HIGH |
| G2919 | κρίνω (decide) | 7 | 裁く | 決める | HIGH |
| G2919 | κρίνω (passive) | 1 | 裁く | 決まる | HIGH |
| G567 | ἀπέχομαι | 6 | 〜である | 〜避ける | HIGH |
| **合計** | | **132** | | | |

G2919 の「決まる」1件 = ACT 27:1（受動形）。

---

## 変更ファイル（72件）

bible_data:

| 書 | 変更ファイル |
|----|------------|
| MAT | 4, 8, 9, 11, 12, 14, 16, 18, 20, 24, 26 |
| MRK | 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15 |
| LUK | 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 18, 19, 20, 21, 22, 23, 24 |
| JHN | 8, 13, 20 |
| ACT | 1, 2, 8, 10, 11, 15, 18, 20, 24, 25, 27 |
| ROM | 14 |
| 1CO | 2, 7 |
| 2CO | 2, 3, 6 |
| COL | 2 |
| 1TH | 4, 5 |
| 1TI | 4 |
| TIT | 3 |
| 1PE | 2, 4 |
| 1JN | 5 |

スクリプトファイル（ベースライン更新）:

| ファイル | 変更内容 |
|---------|---------|
| `scripts/re-stageB-regression.cjs` | STAGEB_BASELINE 更新（bible_data 132件変更による期待値シフト） |

---

## 検証結果

### A. 対象件数

| 項目 | 結果 |
|------|------|
| APPROVED_FOR_CHANGE 132件すべて変更済み | PASS |
| 変更漏れ | 0件 |
| 重複変更 | 0件 |
| 判定JSONにない変更 | 0件 |

### B. 保留対象の不変確認

| 項目 | 結果 |
|------|------|
| G1210 dei-necessity 85件（HOLD_DATA_QUALITY）変更なし | PASS |
| G2919 ACT 3:13!27（HOLD_CONTEXT）変更なし | PASS |
| ACT 3:13!27 現在値 | `裁く`（変更前と同一） |
| HOLD 86件全件の現在値一致 | PASS |

### C. フィールド保護

| 項目 | 結果 |
|------|------|
| `token.japanese` のみ変更 | PASS |
| `token.strong` 変更 | 0件 |
| `token.lemma` 変更 | 0件 |
| `token.morph` 変更 | 0件 |
| token 追加・削除 | 0件 |

### D. ファイル・JSON

| 項目 | 結果 |
|------|------|
| 変更ファイル数 | 72件（bible_data）|
| JSON構文エラー | 0件 |
| 判定JSON proposedJa との一致 | 132件全件 PASS |
| Strong 不一致 | 0件 |

### E. 回帰テスト

| テスト | 結果 | 備考 |
|--------|------|------|
| re-phase1 | PASS | 106+111 checks pass |
| re-stageB | PASS | ベースライン更新後 pass（詳細下記）|
| re-stageA | PASS | 14+19 checks pass |
| re-stageD | PASS | 10+18 checks pass |

**re-stageB ベースライン更新詳細**

bible_data 132件変更により stageB の期待値が変化した（Phase 4k と同一パターン）。

| 指標 | 変更前 | 変更後 | 差分 |
|------|--------|--------|------|
| チップ変更件数 | 39,692 | 39,679 | −13 |
| 一致件数 | 98,049 | 98,062 | +13 |
| 破損形（旧・参考） | 1,265 | 1,253 | −12 |
| 破損形（新）= 0 | 維持 | 維持 | 0 |
| chip⇔panel 不一致 = 0 | 維持 | 維持 | 0 |

brokenNew=0・panelMismatch=0 は維持。132件はすべて審査済み APPROVED_FOR_CHANGE のため、意図的な変更としてベースラインを更新した。

---

## Git 状態

| 項目 | 状態 |
|------|------|
| ブランチ | `data/ja1955-nt-approved-132` |
| HEAD SHA | `4acb52bc` |
| commit | 実施せず（指示による禁止）|
| push | 実施せず（指示による禁止）|
| PR | 実施せず（指示による禁止）|

変更は未コミット状態で作業ディレクトリに存在する。

---

## 未解決事項（Phase 4m スコープ外）

| 項目 | 分類 | 内容 |
|------|------|------|
| G1210 dei-necessity 85件 | HOLD_DATA_QUALITY | Strong 設計方針（G1210 維持 or G1163 移行）のユーザー判断待ち |
| G2919 ACT 3:13!27 | HOLD_CONTEXT | `裁く` 維持 or `決める` のユーザー判断待ち |
| G1573・G4823 最終訳語確定 | 候補複数 | MEDIUM confidence、別途判断が必要 |
| Group A Tier 3-7 サンプリング | 未着手 | Phase 4o として提案済み |
| Group F/G/H 監査 | 未着手 | Phase 4p として提案済み |

---

## 成果物

| ファイル | 内容 |
|---------|------|
| `stage4-phase4m-implementation-report.md` | 本報告書 |
| `stage4-phase4m-token-diff.json` | 132件 ref 別 変更前後の japanese 記録 |
| `stage4-phase4m-verification.json` | 検証A〜E の機械可読記録 |
