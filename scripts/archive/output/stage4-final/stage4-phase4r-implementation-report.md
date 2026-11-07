# Stage 4 Phase 4r — G1210/G1163/G1189 Downstream Rebuild 実装報告

**Phase**: 4r  
**実施日**: 2026-11-03  
**対象**: Phase 4q Bible JSON移行後のdownstream再構築（辞書・意味領域インデックス・検索インデックス）  
**ステータス**: PHASE 4r COMPLETE — READY FOR AUDIT

---

## 0. 作業前確認

| 項目 | 値 |
|------|---|
| リポジトリ | uo-no/gnt-jp.git |
| ブランチ | data/ja1955-nt-approved-132 |
| HEAD SHA | 4acb52bcd3077500904ddf41225b3bb5b2a1c |
| worktree | M bible_data 118件（Phase 4m + Phase 4q適用済み）、?? 未追跡多数 |
| Phase 4q 完了確認 | CONFIRMED（G1210=43/G1163=101/G1189=22） |
| Phase 4q 5成果物 | CONFIRMED |
| morph regression audit | CONFIRMED |
| Phase 4p 実装仕様 | CONFIRMED（stage4-phase4p-implementation-spec.md / index-migration.json） |

---

## 1. 実装前スナップショット

`stage4-phase4r-pre-implementation-snapshot.zip` を新規作成（既存成果物上書きなし）。

- 内容: 4インデックスファイル + search-index/nt 27件 + search-index/lxx 40件 + meta.json = 71ファイル
- サイズ: 23.0 MB
- 既存Phase 4q/4p成果物: 上書きなし

---

## 2. 実装内容

### A. reading-lexicon-data.js

**更新方法**: `node scripts/build-reading-lexicon.cjs`（全体再生成）

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| G1163 glosses | ["〜しなければならない"] | ["〜しなければならない"] ← 変化なし |
| G1189 glosses | ["願う","必要とする","お願いする","神に祈る"] | ["願う","必要とする","お願いする","神に祈る"] ← 変化なし |
| G1210 glosses | ["縛る","結ぶ","物を縛る","人を縛る","結婚の縛り"] | ["縛る","結ぶ","物を縛る","人を縛る","結婚の縛り"] ← 変化なし |
| ファイルサイズ | 624,966 bytes | ~523,264 bytes（Phase 4m bible_data変更の反映を含む） |

G1163/G1189/G1210の3エントリの glosses は Phase 4q 適用前から正しい値だったため、内容変化なし。Phase 4m（132件）の bible_data 変更が他 lemmaId のエントリに反映されたことでサイズが変化。

### B. lexicon-lite.json

**更新方法**: 手動（ビルドスクリプトなし）

| キー | フィールド | 変更前 | 変更後 |
|------|---------|--------|--------|
| grc:G1163 | count | 16 | **101** |
| grc:G1163 | domains | ["71004","71005"] | **["071004","071005","71004","71005"]** |
| grc:G1210 | count | 138 | **43** |
| grc:G1210 | gloss | "It behooves" | **"to bind, to tie"** |
| grc:G1210 | domains | [...071004,071005,33012,71004,71005...] | **["18002","23009","37002","37003","37008"]** |
| grc:G1210 | ln | [...33.17,...71.21,71.34] | **["18.13","23.157","37.114","37.33","37.45","37.46"]** |
| grc:G1189 | count | 12 | **22** |
| grc:G1189 | gloss_ja | "必要とする" | **"願う、お願いする"** |

根拠: Phase 4p spec の5変更（count×3, gloss×1, gloss_ja×1）+ displays整合性（domains/ln更新）。

### C. domains-cluster-index.json

**更新方法**: 手動（ビルドスクリプトなし）

| domainCode | 操作 | lemmaCount | lemmas変化 |
|-----------|------|-----------|---------|
| 33012 | G1210 除去 | 20→19 | G1210削除（G1189は残留） |
| 71004 | G1210 除去 | 12→11 | G1210削除（G1163は残留） |
| 71005 | G1210 除去 | 8→7 | G1210削除（G1163は残留） |
| 071004 | G1210 除去 / G1163 追加 | 5→5 | G1210削除、G1163追加 |
| 071005 | G1210 除去 / G1163 追加 | 3→3 | G1210削除、G1163追加 |

occurrences は全5エントリとも変更なし（トークンは移動なし、lemmaIdのみ変更）。

### D. domains-ln-index.json

**更新方法**: 手動（ビルドスクリプトなし）

| ln | 操作 | lemmaCount | lemmas変化 |
|----|------|-----------|---------|
| 33.17 | G1210 除去 | 5→4 | G1210削除（G1189は残留） |
| 71.21 | G1210 除去 | 2→1 | G1210削除（G1163は残留） |
| 71.34 | G1210 除去 | 2→1 | G1210削除（G1163は残留） |

occurrences は全3エントリとも変更なし。

### E. search-index/nt/

**更新方法**: `node scripts/build-search-index.js`（NT+LXX全巻一括再生成）

- NT: 27書 / 137,741 tokens 再生成
- LXX: 40書 / 479,623 tokens 再生成（LXX bible_data 未変更、sourceVersionのみ更新）
- schemaVersion: 3（変更なし）
- meta.json: 更新

---

## 3. 検証

### 3.1 Strong / lemma整合性

| Strong | 期待件数 | 実件数 | 結果 |
|--------|---------|-------|------|
| G1210 | 43 | 43 | PASS |
| G1163 | 101 | 101 | PASS |
| G1189 | 22 | 22 | PASS |
| 合計 | 166 | 166 | PASS |
| bible_data 総tokens | 137,741 | 137,741 | PASS |

### 3.2 reading-lexicon-data.js

| 項目 | 期待値 | 結果 |
|------|--------|------|
| G1163 glosses lead | 〜しなければならない | PASS |
| G1189 glosses lead | 願う | PASS |
| G1210 glosses lead | 縛る | PASS |
| G1163 deponent | false | PASS |
| G1189 deponent | false | PASS |
| G1210 deponent | false | PASS |

### 3.3 lexicon-lite.json

全8変更項目 PASS（stage4-phase4r-verification.json 参照）。

### 3.4 domains-cluster-index.json

全5エントリで G1210 除去確認、071004/071005 で G1163 追加確認。PASS。

### 3.5 domains-ln-index.json

全3エントリで G1210 除去確認。PASS。

### 3.6 search-index

| 項目 | 結果 |
|------|------|
| schemaVersion | 3（変更なし） PASS |
| NT tokenCount | 137,741 PASS |
| JSON parse エラー | なし PASS |
| LXX bible_data変更 | なし（LXX token content 不変） PASS |

---

## 4. 回帰テスト

| テスト | 結果 | 詳細 |
|-------|------|------|
| re-phase1 | ⚠ FAIL | morph coverage 44,276 vs baseline 44,280（Phase 4q起因、Phase 4r影響なし） |
| re-stageA-regression | PASS | ALL PASS (19 checks) |
| re-stageD-regression | PASS | ALL PASS (18 checks) |
| re-stageB brokenNew=0 | PASS | **絶対条件 PASS** |
| re-stageB panelMismatch=0 | PASS | **絶対条件 PASS** |
| re-stageB 変化件数 | ⚠ FAIL | changed=39,674/identical=98,067/brokenOld=1,245（Phase 4q-level、baseline未更新） |

**Phase 4r による新たな回帰ゼロ確認**: re-stageB の数値は Phase 4q 後と完全同一。Phase 4r downstream rebuild はエンジン動作に影響を与えなかった。

### re-stageB 数値の背景

| 指標 | Phase 4m baseline | Phase 4q/4r 後 | Phase 4rによる変化 |
|-----|-----------------|--------------|-----------------|
| changed | 39,679 | 39,674 | 0（変化なし） |
| identical | 98,062 | 98,067 | 0（変化なし） |
| brokenOld | 1,253 | 1,245 | 0（変化なし） |
| brokenNew | 0 | **0** | 0（変化なし） |
| panelMismatch | 0 | **0** | 0（変化なし） |

reading-lexicon-data.js の glosses 変化はエンジンの deponent チェック（Phase 4 読み取り）には影響しない。Phase 5 Semantic Layer（現在未使用）向けデータのみ。

---

## 5. 差分監査

| 項目 | 結果 |
|------|------|
| 変更ファイル一覧 | 4インデックス + 27 NT search-index |
| SHA-256 before/after | stage4-phase4r-file-diff.json 参照 |
| bible_data 変更 | なし PASS |
| Phase 4q 95件保護 | PASS（スポットチェック10/10） |
| Phase 4m 132件保護 | PASS（スポットチェック10/10） |
| 予定外ファイル変更 | なし PASS |
| 既存未コミット変更保持 | PASS（reset/stashなし） |

---

## 6. 成果物

| ファイル | 内容 |
|---------|------|
| `stage4-phase4r-implementation-report.md` | 本報告書 |
| `stage4-phase4r-verification.json` | 全検証結果（status: ALL_CRITICAL_PASS） |
| `stage4-phase4r-file-diff.json` | ファイルごとのhash_before/after |
| `stage4-phase4r-pre-implementation-snapshot.zip` | 実装直前71ファイルアーカイブ（23.0 MB） |
| `stage4-phase4r-regression-samples.json` | re-stageB差分サンプル（Phase 4q/4r起因分析含む） |

---

## 7. 完了判定チェックリスト

| 条件 | 結果 |
|------|------|
| Bible JSONの変更なし | ✓ PASS |
| G1210=43 / G1163=101 / G1189=22 | ✓ PASS |
| reading-lexicon-data.js整合 | ✓ PASS |
| lexicon-lite.json整合（count/gloss/gloss_ja/domains/ln） | ✓ PASS |
| domains-cluster-index整合 | ✓ PASS |
| domains-ln-index整合 | ✓ PASS |
| NT search-index整合 | ✓ PASS |
| Phase 4q 95件保護 | ✓ PASS |
| Phase 4m 132件保護 | ✓ PASS |
| brokenNew=0 | ✓ PASS |
| panelMismatch=0 | ✓ PASS |
| baseline未変更 | ✓ PASS |
| 予定外ファイル変更なし | ✓ PASS |
| 既存未コミット変更を保持 | ✓ PASS |
| 全成果物作成 | ✓ PASS |
| commit / push / PR / merge / deploy なし | ✓ PASS |

### 残課題（次Phaseへ引き継ぎ）

1. **re-phase1 baseline更新**: morph coverage 44,276。Phase 4q morph regression audit にて CONDITIONAL PASS 確認済み。lexicon rebuild 完了（Phase 4r）後に baseline を 44,276 に更新する条件が整った。
2. **re-stageB baseline更新**: changed=39,674/identical=98,067/brokenOld=1,245 を正式 baseline として更新するため、サンプルレビューを実施する。

---

## 8. worktree最終状態

| 項目 | 値 |
|------|---|
| ブランチ | data/ja1955-nt-approved-132 |
| HEAD SHA | 4acb52bcd3077500904ddf41225b3bb5b2a1c（変更なし） |
| bible_data | 118件 modified（Phase 4m+4q） |
| downstream | reading-lexicon-data.js, lexicon-lite.json, domains-cluster-index.json, domains-ln-index.json（未コミット変更） |
| search-index | public/search-index/ 未追跡（?? 状態） |
| commit/push | なし |

---

**PHASE 4r COMPLETE — READY FOR AUDIT**
