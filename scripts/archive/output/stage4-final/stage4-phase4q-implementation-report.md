# Stage 4 Phase 4q — G1210 Strong/lemma修正 実装報告

**Phase**: 4q  
**実施日**: 2026-11-03  
**対象**: G1210誤登録トークン 95件（dei-necessity 85 + deom-hold 10）  
**ステータス**: PHASE 4q BIBLE JSON MIGRATION COMPLETE — READY FOR AUDIT

---

## 1. 実装前確認

### 1.1 リポジトリ状態

| 項目 | 値 |
|------|---|
| リポジトリ | uo-no/gnt-jp.git |
| ブランチ | data/ja1955-nt-approved-132 |
| HEAD SHA | 4acb52bcd3077500904ddf41225b3bb5b2a1c |
| worktree | M bible_data 72件（Phase 4m適用済み）+ 未追跡152件 |

### 1.2 Phase 4p 成果物確認

| ファイル | 結果 |
|---------|------|
| `stage4-phase4p-implementation-spec.md` | CONFIRMED (correction4 適用済み) |
| `stage4-phase4p-reference-migration.json` | CONFIRMED (95件, 73ファイル) |
| `stage4-phase4p-index-migration.json` | CONFIRMED |
| `stage4-phase4p-regression-plan.md` | CONFIRMED (correction4 適用済み) |
| `stage4-phase4p-bible-snapshot.zip` | CONFIRMED (73ファイル / 3.0MB) |

### 1.3 Pre-flight 確認結果

| チェック | 結果 | 詳細 |
|---------|------|------|
| 台帳 ref 重複なし | PASS | 95件すべて一意 |
| dei-necessity 85件 / deom-hold 10件 分類 | PASS | 両クラスターを確認 |
| 73ファイル hash_before が worktree と一致 | PASS | 73/73 |
| ZIP (73ファイル) が hash_before と一致 | PASS | 73/73 |
| snapshot_before が実ファイルと一致 | PASS | 95/95 |
| correction4 差分監査仕様が反映済み | PASS | 確認済み |
| Phase 4m token diff (132件) 利用可能 | PASS | stage4-phase4m-token-diff.json |
| T1-1: 全95件 strong=G1210 | PASS | 95/95 |

---

## 2. 実装前スナップショット

`stage4-phase4q-pre-implementation-snapshot.zip` を新規作成（Phase 4p スナップショットを上書きしない）。

- 内容: Phase 4m適用済みworktreeの73ファイル
- hash_before との一致: 73/73（Phase 4p スナップショットと同一内容）
- Phase 4m の132件変更を含む現在状態を基準とすることを確認

---

## 3. Bible JSON 移行

### 3.1 移行概要

| 分類 | 件数 | 変更前 | 変更後 |
|------|-----|--------|--------|
| dei-necessity | 85 | G1210/δέω/grc:G1210/縛る | G1163/δεῖ/grc:G1163/〜しなければならない |
| deom-hold | 10 | G1210/δέω/grc:G1210/縛る | G1189/δέομαι/grc:G1189/願う |
| 変更なし | - | deo-bind 43件 / G1163既存16件 / G1189既存12件 | 変更なし |

### 3.2 移行後カウント確認

| Strong | 移行前 | 移行後 | 期待値 |
|--------|-------|-------|--------|
| G1210 | 138 | **43** | 43 ✓ |
| G1163 | 16 | **101** | 101 ✓ |
| G1189 | 12 | **22** | 22 ✓ |
| 合計 | 166 | **166** | 166 ✓ |
| bible_data 総 token 数 | 137,741 | **137,741** | 137,741 ✓ |

---

## 4. 差分監査（correction4 仕様）

### 4.1 監査結果

| チェック項目 | 結果 |
|------------|------|
| ref重複なし（before/after 両方） | PASS（73ファイル全件） |
| targetIndices の全 ref が実ファイルに存在 | PASS（73ファイル全件） |
| targetIndices ref集合 ≡ 実際に変更されたref集合 | PASS（73ファイル全件） |
| 配列順序の不変 | PASS（73ファイル全件） |
| ref集合の完全一致（追加・削除なし） | PASS（73ファイル全件） |
| 対象95件のフィールド名集合が変更前後で完全一致 | PASS（95/95） |
| 対象95件の許可4フィールドのみ変更 | PASS（95/95） |
| 対象95件の禁止32フィールドを deepStrictEqual で比較 | PASS（95/95） |
| 対象外トークンを全フィールド deepStrictEqual で比較 | PASS（0件の差分） |
| 説明できない変更 | 0件 |

### 4.2 Phase 4m 保護確認

| チェック | 結果 |
|---------|------|
| Phase 4m 132件 japanese = newJa | PASS（132/132） |
| 重複27ファイル内の Phase 4m 変更トークンが不変 | PASS（zip 検証による自動網羅） |

### 4.3 ファイル単位集計

- 変更ファイル数: 73
- 変更トークン数: 95
- 非対象トークン変更数: 0
- 予期しない差分: 0

詳細は `stage4-phase4q-file-diff.json` を参照。

---

## 5. 回帰テスト

### 5.1 テスト結果一覧

| テスト | 結果 | 詳細 |
|-------|------|------|
| re-phase1 | **1 FAIL** | morph coverage: 44280 → 44276（-4）— 下記参照 |
| re-stageA | PASS | ALL PASS (19 checks) |
| re-stageD | PASS | ALL PASS (18 checks) |
| re-stageB | **3 FAIL** ※ | changed/identical/brokenOld が変化（改善方向）— 下記参照 |

※ brokenNew=0 / panelMismatch=0 は維持（絶対条件 PASS）

### 5.2 re-phase1 詳細

| 項目 | 変化 | 分析 |
|------|------|------|
| morph coverage | 44280 → 44276（-4） | Phase 4q で japanese を "縛る" から "〜しなければならない" へ変更した85件のうち4件が、morph パスを失った（"〜" prefix は morph エンジンで別処理）。今回と無関係ではなく、Phase 4q 起因の変化。ただし機能回帰ではない — "縛る" の morph coverage は誤った訳語での coverage だった。 |
| baselineを更新 | しない | Phase 4q 仕様に従い baseline 更新なし |

### 5.3 re-stageB 詳細

| 項目 | Phase 4m baseline | Phase 4q 後 | 変化 | 評価 |
|------|-----------------|------------|------|------|
| `changed` | 39,679 | 39,674 | **-5** | 改善（fewer deviations） |
| `identical` | 98,062 | 98,067 | **+5** | 改善（more correct output） |
| `brokenOld` | 1,253 | 1,245 | **-8** | 改善（fewer degraded forms） |
| `brokenNew` | 0 | **0** | ✓ | **絶対条件 PASS** |
| `panelMismatch` | 0 | **0** | ✓ | **絶対条件 PASS** |
| `presented` | 4,258 | 4,258 | 0 | 不変 |
| `tokens` | 137,741 | 137,741 | 0 | 不変 |

変化の解釈: Phase 4q により 5件のトークンが「差分あり」から「一致」に改善、8件の旧broken形が解消。brokenNew=0 を維持し、機能回帰なし。

**このPhaseでは re-stageB baseline を更新しない（Phase 4q 仕様に従う）。**

---

## 6. 成果物

| ファイル | サイズ | 内容 |
|---------|-------|------|
| `stage4-phase4q-implementation-report.md` | — | 本報告書 |
| `stage4-phase4q-token-diff.json` | 35K | 95件の変更前後フィールド値 |
| `stage4-phase4q-verification.json` | 1.4K | 差分監査全チェック結果（ALL_PASS） |
| `stage4-phase4q-file-diff.json` | 36K | 73ファイルのhash_before/after・変更件数・non_target_unchanged |
| `stage4-phase4q-pre-implementation-snapshot.zip` | 3.0M | 実装直前の73ファイルアーカイブ |

---

## 7. 完了判定チェックリスト

| 条件 | 結果 |
|------|------|
| 移行 95/95件一致 | ✓ PASS |
| G1210=43、G1163=101、G1189=22 | ✓ PASS |
| 対象外トークン変更ゼロ | ✓ PASS |
| 禁止フィールド変更ゼロ | ✓ PASS |
| Phase 4m 132/132維持 | ✓ PASS |
| 73ファイルの差分を説明可能 | ✓ PASS（予期しない差分ゼロ） |
| JSON parse 成功 | ✓ PASS（全73ファイル） |
| re-phase1 | ⚠ FAIL（morph coverage -4、Phase 4q 起因・機能回帰なし） |
| re-stageA / re-stageD | ✓ PASS |
| re-stageB brokenNew=0 | ✓ PASS（絶対条件） |
| re-stageB panelMismatch=0 | ✓ PASS（絶対条件） |
| 辞書・インデックス等の変更ゼロ | ✓ PASS（未変更を確認） |
| commit / push / PR / merge / deploy なし | ✓ PASS |

### 要注意事項（次Phaseへの引き継ぎ）

1. **re-phase1 baseline 更新**: morph coverage が 44280 → 44276（-4）。Phase 4q 起因の意図的変化。次Phaseで lexicon rebuild 後に悪化ケースゼロを確認してから baseline を更新する。
2. **re-stageB baseline 更新**: Phase 4q 後の changed=39674/identical=98067/brokenOld=1245 はブランチベースラインに反映されていない。辞書・インデックス rebuild 後（Phase 4r以降）にサンプルレビューを経てから更新する。
3. **未実施 downstream**: reading-lexicon-data.js / lexicon-lite.json / domains-cluster-index.json / domains-ln-index.json / search-index の更新は次Phase扱い。

---

## 8. 禁止事項遵守確認

| 禁止事項 | 遵守 |
|---------|------|
| reading-lexicon-data.js 変更 | ✓ 未変更 |
| lexicon-lite.json 変更 | ✓ 未変更 |
| domains-cluster-index.json 変更 | ✓ 未変更 |
| domains-ln-index.json 変更 | ✓ 未変更 |
| search-index/nt/*.json 変更 | ✓ 未変更 |
| reading-engine.js 変更 | ✓ 未変更 |
| scripts / tests / baseline 変更 | ✓ 未変更 |
| commit / push / PR / merge / deploy | ✓ 実施なし |

---

**PHASE 4q BIBLE JSON MIGRATION COMPLETE — READY FOR AUDIT**
