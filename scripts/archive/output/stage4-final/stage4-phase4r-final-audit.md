# Stage 4 Phase 4r — Downstream Rebuild 最終監査報告

**Phase**: 4r  
**監査実施日**: 2026-11-03  
**監査種別**: 独立監査（READ-ONLY）  
**監査対象**: Phase 4r実装結果（実装報告のPASSを採用せず独立検証）  
**最終判定**: **PHASE 4r AUDIT PASS**

---

## 0. 監査スコープと禁止事項

| 項目 | 状態 |
|------|------|
| Bible JSON 変更 | **禁止** — 実施なし |
| 辞書・インデックス修正 | **禁止** — 実施なし |
| テスト・baseline 変更 | **禁止** — 実施なし |
| commit / push | **禁止** — 実施なし |
| 既存成果物上書き | **禁止** — 実施なし |

---

## 1. §1 作業状態確認

| 項目 | 確認値 |
|------|--------|
| ブランチ | data/ja1955-nt-approved-132 |
| HEAD SHA | 4acb52bc |
| Phase 4r 成果物 | 5件すべて存在を確認 |

成果物一覧:
- `stage4-phase4r-implementation-report.md` ✓
- `stage4-phase4r-verification.json` ✓
- `stage4-phase4r-file-diff.json` ✓
- `stage4-phase4r-pre-implementation-snapshot.zip` (71ファイル, 23.0MB) ✓
- `stage4-phase4r-regression-samples.json` ✓

---

## 2. §2 Bible JSON 不変性確認

**方法**: NT bible_data 全体スキャン（独立実行）

| Strong | 期待件数 | 実件数 | 判定 |
|--------|---------|-------|------|
| G1210 | 43 | **43** | **PASS** |
| G1163 | 101 | **101** | **PASS** |
| G1189 | 22 | **22** | **PASS** |
| NT 総 token | 137,741 | **137,741** | **PASS** |

Phase 4r が Bible JSON を変更していないことを CONFIRMED。

---

## 3. §3 reading-lexicon-data.js 独立検証

### 3.1 3エントリ内容確認

| lemmaId | glosses (先頭) | deponent | 判定 |
|---------|--------------|---------|------|
| grc:G1163 | `["〜しなければならない"]` | false | **PASS** |
| grc:G1189 | `["願う","必要とする","お願いする","神に祈る"]` | false | **PASS** |
| grc:G1210 | `["縛る","結ぶ","物を縛る","人を縛る","結婚の縛り"]` | false | **PASS** |

### 3.2 ファイル整合性

| 項目 | 値 | 判定 |
|------|---|------|
| ファイルサイズ | 523,304 bytes (~511KB) | — |
| SHA256 (current) | 5fc85c0f6584791d... | — |
| SHA256 = file-diff.json hash_after | 一致 | **PASS** |
| エントリ数 | 5,437 件 | — |

### 3.3 625KB → 511KB 縮小の原因（独立検証）

**旧ファイル**: 624,966 bytes（hash_before: 1710b5e1dd932c20...）  
**新ファイル**: 523,304 bytes（hash_after: 5fc85c0f6584791d...）  
**縮小率**: 約 16.3%

**原因 CONFIRMED**:

`scripts/build-reading-lexicon.cjs` は NT+LXX 全 bible_data をスキャンし、lemmaId ごとに `token.japanese` を集計して glosses 配列を生成する（頻度順）。

旧ファイルは Phase 4m（132件 japanese 更新）適用前の bible_data から生成されていた。Phase 4m の132件変更は各トークンの japanese を正規訳語に統一したため、対象 lemmaId の glosses に含まれていた非正規・非標準訳語が消滅した。

**具体例**: G863（ἀφίημι, 96件 Phase 4k で更新）の bible_data から集計した unique japanese: 10語。全 lemmaId でこの効果が累積し、~16% の縮小をもたらした。

**評価**: 縮小はデータ消失ではなく Phase 4m の正規化効果の反映。新ファイルの方が bible_data の現状に忠実。**CORRECT**。

### 3.4 エントリ数の差異（実装報告との不一致）

実装報告「5440件」vs 監査実測「5437件」。3件差。G1163/G1189/G1210 の3エントリは全て存在・内容正確。エンジン動作上影響なし。  
→ **報告書の記述誤り（DOC-NOTE-1）**。機能影響なし。

---

## 4. §4 lexicon-lite.json 独立検証

Phase 4p spec (`stage4-phase4p-index-migration.json`) と照合。

### 4.1 Phase 4p 承認変更（5フィールド）

| キー | フィールド | spec before | spec after | 現在値 | 判定 |
|------|---------|------------|-----------|-------|------|
| grc:G1163 | count | 16 | 101 | **101** | **PASS** |
| grc:G1210 | count | 138 | 43 | **43** | **PASS** |
| grc:G1189 | count | 12 | 22 | **22** | **PASS** |
| grc:G1210 | gloss | "It behooves" | "to bind, to tie" | **"to bind, to tie"** | **PASS** |
| grc:G1189 | gloss_ja | "必要とする" | "願う、お願いする" | **"願う、お願いする"** | **PASS** |

### 4.2 整合性変更（domains/ln — spec暗黙承認）

| キー | フィールド | 現在値 | Phase 4p 整合性 | 判定 |
|------|---------|-------|----------------|------|
| grc:G1163 | domains | [071004,071005,71004,71005] | G1163が071004/071005対象トークンを持つ → CORRECT | **PASS** |
| grc:G1210 | domains | [18002,23009,37002,37003,37008] | deo-bind 43件のdomainのみ → CORRECT | **PASS** |
| grc:G1210 | ln | [18.13,23.157,37.114,37.33,37.45,37.46] | deo-bind 43件のlnのみ → CORRECT | **PASS** |

### 4.3 ファイル整合性

SHA256 (current) = file-diff.json hash_after: **PASS**

---

## 5. §5 domains-cluster-index.json 独立検証

**参照**: Phase 4p spec `domainsClusterIndex` セクション

| domainCode | lemmaCount before→after | G1210除去 | G1163追加 | G1189状態 | occurrences | 判定 |
|-----------|------------------------|---------|---------|---------|------------|------|
| 33012 | 20 → **19** | ✓ REMOVED | N/A | 残留 ✓ | 674（変化なし）| **PASS** |
| 71004 | 12 → **11** | ✓ REMOVED | ALREADY_PRESENT ✓ | N/A | 304（変化なし）| **PASS** |
| 71005 | 8 → **7** | ✓ REMOVED | ALREADY_PRESENT ✓ | N/A | 328（変化なし）| **PASS** |
| 071004 | 5 → **5** | ✓ REMOVED | ✓ ADDED | N/A | 230（変化なし）| **PASS** |
| 071005 | 3 → **3** | ✓ REMOVED | ✓ ADDED | N/A | 179（変化なし）| **PASS** |

SHA256 (current) = file-diff.json hash_after: **PASS**

---

## 6. §6 domains-ln-index.json 独立検証

**参照**: Phase 4p spec `domainsLnIndex` セクション

| ln | lemmaCount before→after | G1210除去 | G1163/G1189状態 | occurrences | 判定 |
|----|------------------------|---------|----------------|------------|------|
| 33.17 | 5 → **4** | ✓ REMOVED | G1189 残留 ✓ | 2936（変化なし）| **PASS** |
| 71.21 | 2 → **1** | ✓ REMOVED | G1163 残留 ✓ | 154（変化なし） | **PASS** |
| 71.34 | 2 → **1** | ✓ REMOVED | G1163 残留 ✓ | 154（変化なし） | **PASS** |

SHA256 (current) = file-diff.json hash_after: **PASS**

---

## 7. §7 search-index 独立検証

### 7.1 NT search-index

| 項目 | 実測値 | 期待値 | 判定 |
|------|-------|--------|------|
| shard数 | 27 | 27 | **PASS** |
| tokenCount 合計 | 137,741 | 137,741 | **PASS** |
| schemaVersion=3 | 全27シャード | 全27シャード | **PASS** |
| JSON parse エラー | 0 | 0 | **PASS** |
| 全 shard hash = file-diff.json hash_after | 27/27 | 27/27 | **PASS** |
| distinct sourceVersion | 1種 (cb3e0dbad75d241b) | — | — |

### 7.2 LXX search-index

| 項目 | 実測値 | スナップショット | 判定 |
|------|-------|--------------|------|
| shard数 | **39** | 39 | **PASS** |
| tokenCount 合計 | 479,623 | — | — |
| schemaVersion=3 | 全39シャード | — | **PASS** |
| JSON parse エラー | 0 | — | **PASS** |
| token content 不変 (3書サンプル: GEN/PSA/ISA) | 一致 | 一致 | **PASS** |
| sourceVersion 変更 | 変更あり (cb3e0dbad75d241b) | 旧 ≠ 新 | **EXPECTED** |

**DOC-NOTE-2**: 実装報告「LXX: 40書」は誤記。LXX bible_data は元々39冊（bible_data/lxx/: 39ディレクトリ、スナップショット: 39ファイル）。実装前後とも一貫して39 shard。機能影響なし。

**LXX sourceVersion 変更の理由**: `build-search-index.js` の sourceVersion は NT bible_data ファイルの hash も含むため、NT bible_data 変更（Phase 4q）の結果として LXX shard の sourceVersion も更新される。LXX token content は変化なし。**EXPECTED BEHAVIOR**。

---

## 8. §8 回帰テスト結果（独立実行）

| テスト | 結果 | 詳細 |
|-------|------|------|
| re-phase1-regression | ⚠ FAIL | morph coverage=44276 vs baseline=44280（Phase 4q起因、baseline未更新）|
| re-stageA-regression | ✓ **PASS** | ALL PASS (19 checks) |
| re-stageD-regression | ✓ **PASS** | ALL PASS (18 checks) |
| re-stageB brokenNew=0 | ✓ **PASS** | **絶対条件** |
| re-stageB panelMismatch=0 | ✓ **PASS** | **絶対条件** |
| re-stageB changed | ⚠ FAIL | 39674 vs 39679（Phase 4q起因、baseline未更新）|
| re-stageB identical | ⚠ FAIL | 98067 vs 98062（Phase 4q起因、baseline未更新）|
| re-stageB brokenOld | ⚠ FAIL | 1245 vs 1253（Phase 4q起因、baseline未更新）|

**Phase 4r による新規回帰ゼロ確認**: 全 FAIL は Phase 4q 後から変化なし。Phase 4r downstream rebuild はエンジン動作に影響を与えなかった（reading-lexicon-data.js glosses は Phase 5 Semantic Layer 向けデータ; エンジンは deponent のみ参照）。

---

## 9. §9 差分監査

### 9.1 file-diff.json との整合

| ファイル | hash_before (file-diff) | hash_after (file-diff) | current hash | 判定 |
|---------|----------------------|----------------------|-------------|------|
| reading-lexicon-data.js | 1710b5e1dd932c20... | 5fc85c0f6584791d... | 5fc85c0f... | **PASS** |
| lexicon-lite.json | 998baee17b24f61c... | ca5b896532db9b10... | ca5b8965... | **PASS** |
| domains-cluster-index.json | e46ad58d0b4efdd6... | 2bfa520192b63f20... | 2bfa5201... | **PASS** |
| domains-ln-index.json | 1c320f405e0956ad... | d5f5b47e7aa75cd1... | d5f5b47e... | **PASS** |
| search-index/nt/ (27件) | — | — | 全一致 | **PASS** |

### 9.2 スナップショット整合性

| 項目 | 確認値 | 判定 |
|------|-------|------|
| zip ファイル数 | 71 (4+27+39+1) | **PASS** |
| LXX 事前39件 = 事後39件 | 一致 | **PASS** |
| Phase 4q/4m 保護 | (re-stageA/D通過で間接確認) | **PASS** |

---

## 10. 監査サマリーと最終判定

### 10.1 確認事項チェックリスト

| チェック項目 | 結果 |
|------------|------|
| Bible JSON 不変（G1210=43/G1163=101/G1189=22/137741） | ✓ CONFIRMED |
| reading-lexicon-data.js 3エントリ内容正確 | ✓ CONFIRMED |
| reading-lexicon-data.js hash = file-diff 一致 | ✓ CONFIRMED |
| 625KB→511KB 縮小が正当（Phase 4m反映） | ✓ CONFIRMED |
| lexicon-lite.json Phase 4p承認5変更のみ | ✓ CONFIRMED |
| lexicon-lite.json hash = file-diff 一致 | ✓ CONFIRMED |
| domains-cluster-index 5エントリ全正確 | ✓ CONFIRMED |
| domains-ln-index 3エントリ全正確 | ✓ CONFIRMED |
| NT search-index 27シャード構造・件数正確 | ✓ CONFIRMED |
| NT search-index hash 全一致 | ✓ CONFIRMED |
| LXX search-index 39シャード token content 不変 | ✓ CONFIRMED |
| re-phase1 FAIL = Phase 4q-level | ✓ CONFIRMED (baseline未更新のため) |
| re-stageA / re-stageD PASS | ✓ CONFIRMED |
| re-stageB brokenNew=0 | ✓ CONFIRMED (絶対条件) |
| re-stageB panelMismatch=0 | ✓ CONFIRMED (絶対条件) |
| Phase 4r 新規回帰ゼロ | ✓ CONFIRMED |

### 10.2 監査で発見した非重大事項

| 番号 | 種別 | 内容 | 機能影響 |
|------|------|------|---------|
| DOC-NOTE-1 | 報告書誤記 | エントリ数「5440」→ 実測5437（差3件） | なし |
| DOC-NOTE-2 | 報告書誤記 | LXX「40書」→ 実際は39書（実装前後一貫） | なし |

いずれも実装報告書のみの記述誤りで、実ファイルの状態は正確。修正対象外（READ-ONLY監査のため）。

---

## 11. 最終判定

```
PHASE 4r AUDIT PASS

根拠:
- Phase 4p spec で承認された5フィールド変更がすべて正確に反映
- G1210=43/G1163=101/G1189=22 の Bible JSON 不変性を独立確認
- 4インデックスファイルおよび27 NT search-index shard のハッシュが
  file-diff.json と完全一致
- LXX search-index: token content 不変、shard数・構造正確
- 回帰: brokenNew=0 / panelMismatch=0 絶対条件達成
- Phase 4r 起因の新規回帰ゼロ
- 625KB→511KB 縮小は Phase 4m 正規化効果の正当な反映

非重大事項:
- 実装報告書の記述誤り2件（エントリ数・LXX書数）
  いずれも実ファイルの状態は正確

引き継ぎ条件:
- re-phase1 baseline 更新: 44280 → 44276 への更新条件が整った
  （lexicon rebuild 完了 + 悪化ケースゼロ確認済み）
- re-stageB baseline 更新: changed=39674/identical=98067/brokenOld=1245
  サンプルレビュー後に更新
```

---

**PHASE 4r AUDIT PASS — 2026-11-03**
