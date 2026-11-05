# Stage 4 Phase 4v — re-stageB Baseline更新 報告

**Phase**: 4v  
**実施日**: 2026-11-03  
**目的**: Phase 4t・4u監査結果に基づく re-stageB regression baseline更新  
**最終ステータス**: **PHASE 4v BASELINE UPDATE PASS**

---

## 1. 作業前確認

| 項目 | 確認値 |
|------|--------|
| ブランチ | data/ja1955-nt-approved-132 |
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| origin HEAD | 2120b4b4201a492bfd7f9f5e610e7b2833b02d31 |
| worktree M files | 132件（Phase 4m + 4q + 4r + 4s適用済み） |
| Phase 4t 判定 | CONDITIONAL PASS（→ Phase 4uでUI確認） |
| Phase 4u 判定 | **BROWSER AUDIT PASS** |
| brokenNew=0 維持確認 | CONFIRMED（Phase 4u時点） |
| panelMismatch=0 維持確認 | CONFIRMED（Phase 4u時点） |

### 更新前の baseline定義箇所

ファイル: `scripts/re-stageB-regression.cjs`  
Phase 4m適用後の未コミット状態（changed=39679、identical=98062、brokenOld=1253）。

---

## 2. 更新前後のbaseline

| 項目 | Phase 4m baseline（更新前） | Phase 4q baseline（更新後） | 差分 |
|-----|---------------------------|---------------------------|------|
| changed | 39,679 | **39,674** | −5 |
| identical | 98,062 | **98,067** | +5 |
| brokenOld | 1,253 | **1,245** | −8 |
| brokenNew | 0 | **0** | 0（不変） |
| panelMismatch | 0 | **0** | 0（不変） |
| presented | 4,258 | 4,258 | 0（不変、今回対象外） |
| tokens | 137,741 | 137,741 | 0（不変） |

### 更新根拠

**−5 changed / +5 identical**:  
Phase 4q前に Tier2≠Tier0/1（changed）だった dei/deom 5件が、Phase 4q後に Tier2=Tier0/1（identical）に遷移。  
- V-PAP「〜しなければならない」: Tier2フォールバック = Tier0/1フォールバック（'〜'prefix は inf ルール非マッチ）  
- V-PNP-NSM「願いながら」: Tier2 う→いながら適用 = Tier0/1 engine resolve

**−8 brokenOld**:  
Tier2経路の旧 japanese 値（"縛る"）が `isBrokenForm(base,out,mood)` の `/る$/.test(base)` を誘発していた8件が解消。旧 japanese → 新 japanese（"〜しなければならない"/"願う"）に変更後、いずれも `/る$/.test()` が false になるため brokenOld が減少。  
`brokenOld` は「旧経路呼び出し時の活用形破損参考値」であり、Phase 4q後の実際の表示に破損はない。

---

## 3. 変更内容

### 変更ファイル

`scripts/re-stageB-regression.cjs` の1箇所のみ

### 変更内容（diff）

```diff
-    changed:        39679,   // Phase 4m bible_data 132件適用
-    identical:      98062,
-    brokenOld:       1253,   // 旧経路の破損形（参考記録）
+    // 2026-11-03 Phase 4q G1210→G1163/G1189 Strong/lemma修正 95件。
+    // changed 39679→39674（−5）/ identical 98062→98067（+5）/ brokenOld 1253→1245（−8）。
+    // 破損形（新）0・panelMismatch 0 維持。
+    // −5 changed: Phase 4q前に changed だった dei/deom 5件が Phase 4q後に identical に遷移。
+    //    V-PAP「〜しなければならない」(Tier2 fallback = Tier0/1 fallback) / V-PNP「願いながら」(両経路一致)。
+    // −8 brokenOld: Tier2経路の旧japanese値（"縛る"）が isBrokenForm を誘発していた8件が解消。
+    //    brokenOld は「旧経路呼び出し時の活用形破損数」の参考記録。Phase 4q後の新表示に破損なし。
+    // 根拠: Phase 4q実装報告 / Phase 4t 回帰サンプル監査 PASS / Phase 4u ブラウザ監査 PASS。
+    changed:        39674,   // Phase 4q G1163/G1189 修正 95件: 39679→39674
+    identical:      98067,
+    brokenOld:       1245,   // 旧経路の破損形（参考記録）: 1253→1245
```

Phase 4m由来のコメント（2026-11-02行）は保持。今回追加したのはPhase 4qコメントブロックと3値の更新のみ。

### 変更しなかったbaseline

| ファイル | baseline | 状態 |
|---------|---------|------|
| re-phase1-regression.cjs | morph coverage | **変更なし**（Phase 4sで更新済み） |
| re-stageA-regression.cjs | Stage A基準 | **変更なし** |
| re-stageD-regression.cjs | Stage D基準 | **変更なし** |
| STAGEB_BASELINE.brokenNew | 0 | **変更なし** |
| STAGEB_BASELINE.panelMismatch | 0 | **変更なし** |
| STAGEB_BASELINE.presented | 4,258 | **変更なし** |
| STAGEB_BASELINE.tokens | 137,741 | **変更なし** |

---

## 4. テスト結果

### 4.1 re-stageB-regression

```
── Part 1: 単体回帰 ──
Part 1: 20 passed, 0 failed

── Part 2: NT 全巻基準値照合（差分監査 実行中…） ──

ALL PASS (27 checks) — Stage B 基準を維持
```

| 指標 | 期待値 | 結果 | 判定 |
|-----|--------|------|------|
| changed | 39,674 | 39,674 | ✓ PASS |
| identical | 98,067 | 98,067 | ✓ PASS |
| brokenOld | 1,245 | 1,245 | ✓ PASS |
| brokenNew | 0 | 0 | ✓ PASS |
| panelMismatch | 0 | 0 | ✓ PASS |
| 全チェック | ALL PASS | **ALL PASS (27)** | ✓ PASS |

### 4.2 関連テスト

| テスト | 結果 | 詳細 |
|-------|------|------|
| re-phase1-regression | **ALL PASS** | 111 checks（Phase 4s更新済み baseline） |
| re-stageA-regression | **ALL PASS** | 19 checks |
| re-stageD-regression | **ALL PASS** | 18 checks |

Phase 4vによる新たな回帰ゼロ確認。

---

## 5. 差分監査

### 5.1 変更ファイル

| ファイル | 変更前baseline | 変更後baseline |
|---------|--------------|--------------|
| scripts/re-stageB-regression.cjs | changed=39679/identical=98062/brokenOld=1253 | **changed=39674/identical=98067/brokenOld=1245** |

変更後 SHA256: `cabf1c8a17117063d943a27881eaabcd28ef70956567dc2bfeae39c7a90a1dcf`

### 5.2 Phase 4m由来既存変更の保持確認

| 確認項目 | 結果 |
|---------|------|
| Phase 4m コメントブロック（2026-11-02行） | ✓ 保持 |
| Phase 4m changed/identical/brokenOld 値の履歴コメント（→39679/98062/1253） | ✓ 保持 |
| Phase 4k コメントブロック（2026-11-01行） | ✓ 保持 |
| Phase 4v以外のbaseline行 | ✓ 不変 |

### 5.3 不変性確認

| 対象 | 判定 |
|------|------|
| Bible JSON（bible_data/）| ✓ 不変（Phase 4vによる新規変更なし） |
| reading-engine.js | ✓ 不変 |
| UIコード | ✓ 不変 |
| 辞書・インデックス | ✓ 不変 |
| re-phase1 / re-stageA / re-stageD | ✓ 不変 |
| Phase 4m / 4q / 4r / 4s 既存未コミット変更 | ✓ 保持 |
| reset / checkout / clean / stash | ✓ 実施なし |
| 予定外ファイル変更 | ✓ なし |
| Phase 4v がdirtyにしたファイル数 | 1件（scripts/re-stageB-regression.cjs のみ） |

---

## 6. 作業後のworktree状態

| 項目 | 値 |
|------|---|
| ブランチ | data/ja1955-nt-approved-132 |
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c（変更なし） |
| Phase 4v による新規dirty | 1件（scripts/re-stageB-regression.cjs） |
| commit / push | なし |
| re-stageB | **ALL PASS (27 checks)** |
| re-phase1 | **ALL PASS (111 checks)** |
| re-stageA | **ALL PASS (19 checks)** |
| re-stageD | **ALL PASS (18 checks)** |

---

## 7. 完了条件チェックリスト

| 条件 | 結果 |
|------|------|
| baseline が指定値と一致（changed=39674/identical=98067/brokenOld=1245） | ✓ PASS |
| re-stageB 全チェック PASS | ✓ PASS（27 checks） |
| brokenNew = 0 | ✓ PASS |
| panelMismatch = 0 | ✓ PASS |
| 変更が対象ファイルのbaseline部分に限定 | ✓ PASS |
| 既存worktree変更が保持されている | ✓ PASS |
| commit / push / PR / merge / deploy なし | ✓ PASS |
| 予定外ファイル変更なし | ✓ PASS |

---

**PHASE 4v BASELINE UPDATE PASS**
