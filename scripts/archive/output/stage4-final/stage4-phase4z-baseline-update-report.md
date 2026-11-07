# Stage 4 Phase 4z — re-stageB Baseline Update

**Phase**: 4z  
**実施日**: 2026-11-04  
**目的**: Phase 4y（G1573/G4823 10件実装）後の re-stageB baseline 更新  
**最終ステータス**: **PHASE 4z BASELINE UPDATE PASS**

---

## 1. 作業前確認

| 項目 | 値 |
|------|---|
| ブランチ | data/ja1955-nt-approved-132 |
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| origin HEAD | 2120b4b4201a492bfd7f9f5e610e7b2833b02d31 |
| worktree M files | 137件（Phase 4m/4q/4r/4s/4v/4y 適用済み） |
| Phase 4y 成果物 | stage4-phase4y-*.md / *.json（4件） ✓ |
| 現行 baseline（Phase 4v） | changed=39674/identical=98067/brokenOld=1245 |

---

## 2. Phase 4v baseline と Phase 4y 実測値の照合

| 指標 | Phase 4v baseline | Phase 4y 実測 | 差分 | 方向 | 判定 |
|------|-----------------|--------------|------|------|------|
| changed | 39,674 | 39,673 | **−1** | 改善 | ✓ |
| identical | 98,067 | 98,068 | **+1** | 改善 | ✓ |
| brokenOld | 1,245 | 1,244 | **−1** | 改善 | ✓ |
| **brokenNew** | 0 | **0** | 0 | — | **✓ 絶対条件 PASS** |
| **panelMismatch** | 0 | **0** | 0 | — | **✓ 絶対条件 PASS** |
| tokens | 137,741 | 137,741 | 0 | — | ✓ |
| presented | 4,258 | 4,258 | 0 | — | ✓ |

---

## 3. 差分の因果関係照合

### 3.1 changed −1 / identical +1

**原因**: Phase 4y で変更した10件のうち1件が、engine 解決結果と Tier2 出力が一致し identical に移行。

具体的には: 旧 japanese="〜である" のとき、engine が bible_data から "〜である" を読み取り特定の変換を行い Tier2 と不一致だったトークンが、新 javascript 値（〜くじける等）に変更されたことで engine 解決と Tier2 が一致するようになった。

確認方法: Phase 4y での `re-stageB-audit.json` の `samples.changed` サンプルが、変更前後で1件の差異を示す。全差分は Phase 4y bible_data 10件変更のみ（bible_data 変更後、他の変更なし）。

| 条件 | 結果 |
|------|------|
| Phase 4y 10件変更が bible_data に残っていること | ✓ 10/10 確認済み |
| Phase 4y 以降の bible_data 変更がゼロであること | ✓ 新規変更なし |
| 無関係な変更の混入がないこと | ✓ CONFIRMED |

### 3.2 brokenOld −1

**原因確認**:

| 項目 | 旧状態 | 新状態 |
|------|--------|--------|
| token | JHN 18:14!5 (V-AAP-NSM) | JHN 18:14!5 (V-AAP-NSM) |
| japanese | 〜である | **〜助言する** |
| Tier2 出力 | **〜であた**（活用失敗形） | **〜助言した**（正常な過去形） |
| isBrokenForm | true → brokenOld にカウント | false → カウントなし |

V-AAP-NSM（アオリスト能動分詞）の morph に対して旧 japanese "〜である" を展開すると "〜であた"（不完全な活用形）が生成されていた。Phase 4y で "〜助言する" に変更した結果、Tier2 展開が "〜助言した"（正常な過去形）となり isBrokenForm が false になった。

**現在の JHN 18:14!5 確認**:
```
japanese: 〜助言する
strong:   G4823
morph:    V-AAP-NSM
```
✓ CONFIRMED

### 3.3 無関係な変更の混入チェック

| チェック項目 | 結果 |
|------------|------|
| Phase 4z 実施前後で bible_data に追加変更なし | ✓ |
| reading-lexicon-data.js 変更が stats に影響しないこと | ✓（re-stageB は bible_data の japanese を直接読む） |
| lexicon-lite.json 変更（formatting のみ）が stats に影響しないこと | ✓ |
| search-index 変更が stats に影響しないこと | ✓ |

**照合結果: 全項目 PASS。baseline 更新は妥当。**

---

## 4. baseline 更新内容

### 変更ファイル

`scripts/re-stageB-regression.cjs`

### 変更内容

```diff
-    changed:        39674,   // Phase 4q G1163/G1189 修正 95件: 39679→39674
-    identical:      98067,
-    brokenOld:       1245,   // 旧経路の破損形（参考記録）: 1253→1245
+    // 2026-11-04 Phase 4y G1573（〜くじける×6）・G4823（〜助言する×2/〜相談する×2）10件実装。
+    // changed 39674→39673（−1）/ identical 98067→98068（+1）/ brokenOld 1245→1244（−1）。
+    // −1 changed: 10件のうち1件が engine解決と一致し identical に移行（改善）。
+    // −1 brokenOld: JHN 18:14!5 V-AAP-NSM の旧japanese「〜である」→「〜助言した」（破損「〜であた」解消）。
+    // 根拠: Phase 4y実装報告 / Phase 4z baseline 更新。
+    changed:        39673,   // Phase 4y G1573/G4823 修正 10件: 39674→39673
+    identical:      98068,
+    brokenOld:       1244,   // 旧経路の破損形（参考記録）: 1245→1244
```

変更行数: baseline 値 3行更新 + コメント 4行追加。テストロジック・他指標・他 baseline 変更なし。

---

## 5. 更新後のテスト結果

| テスト | 結果 | checks |
|-------|------|--------|
| **re-stageB** | **ALL PASS** | **27** |
| re-phase1 | ALL PASS | 111 |
| re-stageA | ALL PASS | 19 |
| re-stageD | ALL PASS | 18 |

### re-stageB 詳細

| 指標 | 新 baseline | 実測 | 一致 |
|------|-----------|------|------|
| changed | 39,673 | 39,673 | ✓ PASS |
| identical | 98,068 | 98,068 | ✓ PASS |
| brokenOld | 1,244 | 1,244 | ✓ PASS |
| brokenNew | 0 | 0 | ✓ PASS |
| panelMismatch | 0 | 0 | ✓ PASS |
| tokens | 137,741 | 137,741 | ✓ PASS |
| presented | 4,258 | 4,258 | ✓ PASS |

---

## 6. 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `scripts/re-stageB-regression.cjs` | baseline 3値更新（changed/identical/brokenOld）+ コメント4行追加 |

その他のファイル変更: **なし**（bible_data・reading-lexicon-data.js・lexicon-lite.json・search-index・reading-engine.js 変更なし）。

---

## 7. 未解決事項

なし。Phase 4z で確認すべき差分は全件照合済み。

---

## 8. 作業後状態

| 項目 | 値 |
|------|---|
| ブランチ | data/ja1955-nt-approved-132（変化なし） |
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c（変化なし） |
| commit / push | なし |
| Phase 4z による新規 dirty ファイル | 1件（scripts/re-stageB-regression.cjs） |

---

**PHASE 4z BASELINE UPDATE PASS**

Stage 4 の Phase 4k/4m/4q/4r/4s/4v/4w/4x/4y/4z が完了した。次の残件候補: Phase 4w 残件 HOLD_CONTEXT（G2919 ACT 3:13）/ HOLD_LEXICAL（G566）/ REVISION_CANDIDATE（31件）/ UNREVIEWED（Group A Tier 3〜 / Group F/G/H）。
