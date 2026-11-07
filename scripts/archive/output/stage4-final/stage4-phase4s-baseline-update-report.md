# Stage 4 Phase 4s — re-phase1 Baseline更新 報告

**Phase**: 4s  
**実施日**: 2026-11-03  
**目的**: Phase 4q・4r監査結果に基づく re-phase1 morph coverage baseline更新  
**最終ステータス**: **PHASE 4s COMPLETE — re-phase1 BASELINE UPDATED**

---

## 1. 作業前確認

| 項目 | 確認値 |
|------|--------|
| ブランチ | data/ja1955-nt-approved-132 |
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| origin HEAD | 2120b4b4201a492bfd7f9f5e610e7b2833b02d31 |
| worktree M files | 131件（Phase 4m + 4q + 4r適用済み） |
| worktree ?? files | 164件 |
| Phase 4r AUDIT PASS | CONFIRMED（stage4-phase4r-final-audit.md） |
| Phase 4q morph regression audit | CONFIRMED（stage4-phase4q-morph-regression-audit.md） |

### baseline定義箇所

ファイル: `scripts/re-phase1-regression.cjs`  
行: 80（変更後: 84）  
オブジェクト: `PHASE1_BASELINE.morph`  
変更前の値: `44280`

他スクリプトへの `44280` 参照: **なし**（全 `.cjs` ファイル検索済み）

---

## 2. 変更前テスト

| テスト | 結果 | 詳細 |
|-------|------|------|
| re-phase1-regression | **1 FAIL** | got=44276 expect=44280 |
| re-stageA-regression | PASS | ALL PASS (19 checks) |
| re-stageD-regression | PASS | ALL PASS (18 checks) |

実測 morph coverage = **44,276** — 期待値 44,276 と一致 → 変更続行。

---

## 3. baseline変更内容

### 変更ファイル

`scripts/re-phase1-regression.cjs` の1箇所のみ

### 変更内容（diff）

```diff
-    morph:       44280,
+    // 2026-11-03 Phase 4q G1210→G1163/G1189 Strong/lemma修正: 44280→44276（−4）。悪化ケース 0。
+    // dei-necessity 85件の japanese が "縛る" → "〜しなければならない" に変更。
+    // "〜しなければならない" は '〜' prefix のため reading-engine.js inf ルールにマッチしない（-4）。
+    // これは誤訳語での morph coverage が消滅した意図的な修正結果。機能回帰なし。
+    // 監査: stage4-phase4q-morph-regression-audit.md / stage4-phase4r-final-audit.md。
+    morph:       44276,
```

### 変更しなかったbaseline

| ファイル | baseline | 状態 |
|---------|---------|------|
| re-stageA-regression.cjs | Stage A基準 | **変更なし** |
| re-stageD-regression.cjs | Stage D基準 | **変更なし** |
| re-stageB-regression.cjs | STAGEB_BASELINE | **変更なし** |

**注**: `re-stageB-regression.cjs` は git diff上「M（変更済み）」と表示されるが、これは Phase 4m 時（2026-11-02）の既存未コミット変更であり、Phase 4s では一切触っていない（Phase 4s が dirty にしたファイル: 1件のみ）。

---

## 4. 変更後テスト

| テスト | 変更前 | 変更後 | 判定 |
|-------|--------|--------|------|
| re-phase1 全体 | 1 FAIL / 110 passed | **ALL PASS (111 checks)** | ✓ **PASS** |
| re-phase1 morph coverage | FAIL (44276 vs 44280) | **PASS (44276 = 44276)** | ✓ **PASS** |
| re-stageA | ALL PASS (19 checks) | ALL PASS (19 checks) | ✓ **不変** |
| re-stageD | ALL PASS (18 checks) | ALL PASS (18 checks) | ✓ **不変** |
| re-stageB brokenNew=0 | PASS | PASS | ✓ **維持** |
| re-stageB panelMismatch=0 | PASS | PASS | ✓ **維持** |
| re-stageB 3 FAIL | Phase 4q-level (baseline未更新) | Phase 4q-level (baseline未更新) | 変化なし（今回対象外） |

---

## 5. 差分監査

### 5.1 変更ファイル

| ファイル | 変更前SHA256 (16char) | 変更後SHA256 (16char) |
|---------|---------------------|---------------------|
| scripts/re-phase1-regression.cjs | — | e7b5112abe1278d0... |

変更後 full SHA256: `e7b5112abe1278d06381af106e846796d2f5ff612709f697a2297c513132720e`

### 5.2 不変性確認

| 対象 | 判定 |
|------|------|
| Bible JSON（bible_data/）| ✓ 不変（Phase 4sによる新規変更なし） |
| reading-lexicon-data.js | ✓ 不変 |
| lexicon-lite.json | ✓ 不変 |
| domains-cluster-index.json | ✓ 不変 |
| domains-ln-index.json | ✓ 不変 |
| search-index/nt/, search-index/lxx/ | ✓ 不変 |
| re-stageA / re-stageD baseline | ✓ 不変 |
| re-stageB baseline | ✓ 不変（Phase 4s未接触） |
| reading-engine.js | ✓ 不変 |
| Phase 4m 132件保護 | ✓ 維持 |
| Phase 4q 95件保護 | ✓ 維持 |
| 予定外ファイル変更 | ✓ なし |
| Phase 4s がdirtyにしたファイル数 | 1件（re-phase1-regression.cjs のみ） |

### 5.3 既存の未コミット変更保持確認

- reset / checkout / clean / stash: **実施なし**
- Phase 4m / 4q / 4r の未コミット変更: **保持**

---

## 6. 最終worktree状態

| 項目 | 値 |
|------|---|
| ブランチ | data/ja1955-nt-approved-132 |
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c（変更なし） |
| Phase 4s による新規dirty | 1件（scripts/re-phase1-regression.cjs） |
| commit / push | なし |
| re-phase1 | **ALL PASS (111 checks)** |

---

## 7. 変更根拠

Phase 4q（G1210→G1163/G1189 Strong/lemma修正 95件）により、dei-necessity 85件の `japanese` が `"縛る"` から `"〜しなければならない"` に変更された。`"〜しなければならない"` は `'〜'` prefix を持つため、`reading-engine.js` の `inf` ルール（`/い$/` 末尾チェック）にマッチせず morph coverage が 4件減少した（44280→44276）。

この変化は：
- 誤訳語（δέω「縛る」）での morph coverage 消滅であり機能回帰ではない
- Phase 4q morph regression audit にて CONDITIONAL PASS（悪化ケース0、新規brokenNew=0）として確認済み
- Phase 4r final audit PASS によりdownstream整合性も確認済み

上記条件が揃ったため baseline を 44,276 に更新した。

---

**PHASE 4s COMPLETE — re-phase1 BASELINE UPDATED**
