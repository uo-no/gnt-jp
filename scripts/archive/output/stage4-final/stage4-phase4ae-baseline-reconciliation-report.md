# Phase 4ae Baseline Reconciliation Report

**日付**: 2026-11-04  
**Phase**: 4ae — Regression Baseline Reconciliation  
**対象**: re-stageB-regression.cjs / re-phase1-regression.cjs

---

## 1. 作業前確認

| 項目 | 値 |
|------|-----|
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| origin HEAD SHA | 2120b4b4201a492bfd7f9f5e610e7b2833b02d31 |
| 未コミット変更 | 多数（Phase 4k以降の全変更、WT変更保持済み） |
| Phase 4ad 成果物 | 5件確認済み（token-diff/verification/file-diff/report/snapshot.zip） |
| STAGEB_BASELINE.changed | 39673（更新前） |
| STAGEB_BASELINE.identical | 98068（更新前） |
| STAGEB_BASELINE.brokenOld | 1244（更新前） |
| STAGEB_BASELINE.brokenNew | 0 |
| STAGEB_BASELINE.panelMismatch | 0 |
| PHASE1_BASELINE.morph | 44276（更新前） |

---

## 2. STAGEB_BASELINE 再照合

### 2.1 Phase 4z → Phase 4ad 実測値の差分

| 指標 | Phase 4z | Phase 4ad 実測 | 差分 |
|------|----------:|---------------:|-----:|
| changed | 39673 | 39674 | +1 |
| identical | 98068 | 98067 | -1 |
| brokenOld | 1244 | 1245 | +1 |
| **brokenNew** | **0** | **0** | **0 ✓** |
| **panelMismatch** | **0** | **0** | **0 ✓** |

### 2.2 原因特定：MAT 17:24!10 V-PAP-NPM G2983 受ける→取る

差分3値すべてが MAT 17:24!10 の1 token に起因することを **CONFIRMED**（コードと実行結果で照合）。

**詳細検証:**

```
chipFn(w, idx, 'MAT', 1) を OLD/NEW の両値で実行。

OLD 受ける（1段動詞 受け+る）:
  T2 chip gloss: 受けながら
  T0 chip gloss: 受けながら
  T2 == T0: IDENTICAL → changed に含まれない

NEW 取る（五段ラ行 取+る）:
  T2 chip gloss: 取ながら
  T0 chip gloss: 取る
  T2 != T0: CHANGED → changed +1, identical -1
```

**isBrokenForm 検証:**

```
isBrokenForm("取る", "取ながら", "participle"):
  - base 末尾が "る" ✓
  - out ≠ base ✓
  - [漢字]ながら$ かつ りながら$ でない ✓
  → TRUE → brokenOld +1

isBrokenForm("取る", "取る", "participle"):
  - out === base → return false
  → FALSE → brokenNew 変化なし (0維持)
```

**T2 パス限定の確認:**

- T2（Tier 2）= `chipFn(w, i, book, 1)` — resolved 未指定、engine context なし
- T0（Tier 0）= `chipFn(w, i, book, 1, resolved[i], words)` — engine result + verse context
- **ユーザー表示経路は T0**。T2 は「旧パスで仮に表示した場合の参考値」
- T0 output = "取る"（engine.resolve() = null → 基本形フォールバック）→ 表示は正常
- brokenOld は「旧経路の破損形（参考記録）」として baseline コメントに明示

**許容性の判断:**

brokenOld の増加 (+1) は仕様上許容可能。理由：
1. T0（実ユーザー表示）"取る" は正常（破損なし）
2. brokenNew=0（絶対条件）維持
3. panelMismatch=0（絶対条件）維持
4. T2 パスは参考記録のみ（`// 旧経路の破損形（参考記録）`）
5. 他言語訳の正確さ（受ける→取る）が優先される CORRECTNESS 変更

### 2.3 STAGEB_BASELINE 更新 — PASS

変更した値（`re-stageB-regression.cjs`）：

| フィールド | 旧値 | 新値 |
|-----------|-----:|-----:|
| changed | 39673 | 39674 |
| identical | 98068 | 98067 |
| brokenOld | 1244 | 1245 |
| brokenNew | 0 | **0（不変）** |
| panelMismatch | 0 | **0（不変）** |

---

## 3. PHASE1_BASELINE 再照合

### 3.1 Phase 4ad 実測値

- 実測: 44275
- 現行 baseline: 44276
- 差分: -1

### 3.2 Phase 4ad 31 tokens の resolve() 再照合

**Phase 4ae で再調査した結果、Phase 4ad 実装報告の分析に誤りがあった。**

Phase 4ad 報告書は「全31 token の old/new japanese値で engine.resolve() を照合、全件 null→null または non-null→non-null（カバレッジ変化なし）」と記録した。

しかしこれは**不完全なトークンオブジェクト**（`{ strong, morph, japanese }` のみ）で照合したためであり、実際のトークンオブジェクト（`class`, `mood`, `tense`, `voice`, `case` 等を含む）で再テストすると以下が判明した：

```
MAT 17:24!10 (実トークンオブジェクト使用):
  class: verb, mood: participle, tense: present, voice: active, case: nominative

  OLD 受ける → engine.resolve():
    {"japanese":"受けながら","source":"morph","semanticInfo":{"lnDomain":"57.65"}}
    covered: TRUE

  NEW 取る → engine.resolve(): null
    covered: FALSE

  Coverage impact: COVERED→UNCOVERED (-1)
```

**根拠**: 実トークンオブジェクト全31件を bible_data から読み込み、old/new japanese を差し替えて engine.resolve() を照合。MAT 17:24!10 のみが coverage 変化。他30件は変化なし。（CONFIRMED）

**mechanism:**

- "受ける"（1段動詞）: `_applyRules("受ける", "part-pres")` → "受けながら"（正規形）→ morph result
- "取る"（五段ラ行）: `_applyRules("取る", "part-pres")` → "取ながら"（イ音便欠落・破損形）→ engine が null を返し安全側フォールバック

engineが "取ながら" を返さずに null を返すのは正しい動作（破損形を suppress する設計）。

### 3.3 Phase 4q との類比

Phase 4q でも同種の変化が起きた（-4 coverage、baseline を 44280→44276 に更新）：

> "dei-necessity 85件の japanese が 縛る → 〜しなければならない に変更。〜しなければならない は '〜' prefix のため reading-engine.js inf ルールにマッチしない（-4）。これは誤訳語での morph coverage が消滅した意図的な修正結果。機能回帰なし。"

今回も同種: 旧訳語「受ける」(1段動詞・morph 解決可) → 正確な訳語「取る」(五段動詞・morph 解決不可) への変更。機能回帰なし。

### 3.4 更新条件の照合

Phase 4ae 仕様の更新条件：

> 「原因が Phase 4ad より前の既存状態にあり、44275 が再現可能な現行仕様の値と確認できた場合のみ PHASE1_BASELINE.morph を 44275 に更新する」

**条件照合結果:**

| 条件 | 結果 |
|------|------|
| 原因が Phase 4ad より前の既存状態にあること | **NOT MET** — 原因は Phase 4ad の MAT 17:24!10 |
| 44275 が再現可能であること | CONFIRMED — 毎回 44275 |
| 悪化ケースが 0 であること | CONFIRMED — doubleParticle=0, weirdPassive=0, brokenImperative=0 |

**「原因が Phase 4ad より前」の条件が満たされないため、仕様上 PHASE1_BASELINE を更新しない。**

### 3.5 PHASE1_BASELINE — CONDITIONAL PASS

PHASE1_BASELINE.morph = 44276 を維持。re-phase1-regression は FAIL のままとする。

**ユーザーへの委ねる判断：**

原因は完全に特定済み。Phase 4ad の MAT 17:24!10 変更（APPROVED_FOR_CHANGE、実装報告書承認済み）が morph coverage -1 を引き起こした。Phase 4q と同種の意図的データ変更による coverage 変化。

ユーザーが Phase 4ad の変更を承認済みと判断する場合、PHASE1_BASELINE.morph を 44275 に更新可能。  
更新承認後、`re-phase1-regression.cjs` の PHASE1_BASELINE.morph に下記コメントを追加して 44275 に更新：

```
// 2026-11-04 Phase 4ad 31件実装。morph 44276→44275（−1）。
// MAT 17:24!10 V-PAP-NPM G2983 受ける→取る: 受ける（1段）は morph 解決可だったが
// 取る（五段ラ行）はイ音便欠落を prevent するため engine が null を返す。
// Phase 4q（−4）と同種の意図的データ変更による coverage 変化。悪化ケース 0。
morph: 44275,
```

---

## 4. 更新後テスト結果

### 4.1 re-stageA

**ALL PASS（19/19 checks）**

### 4.2 re-stageB

**ALL PASS（27/27 checks）**  
STAGEB_BASELINE 更新後。

### 4.3 re-stageD

**ALL PASS（18/18 checks）**

### 4.4 re-phase1

**1 FAIL — morph coverage: got=44275 expect=44276**

CONDITIONAL PASS。PHASE1_BASELINE 未更新（仕様条件「Phase 4ad より前」が不充足）。  
原因は特定済み（MAT 17:24!10）。ユーザー承認後に更新可能。

---

## 5. re-stageE（今回対象外）

re-stageE FAIL（`rn-ja が displayLabel を描画`）は既知の index.html gap。Phase 4ae の更新対象外。

---

## 6. 変更ファイル一覧

| ファイル | 変更内容 |
|----------|---------|
| `scripts/re-stageB-regression.cjs` | STAGEB_BASELINE: changed 39673→39674, identical 98068→98067, brokenOld 1244→1245 + コメント追加 |
| `scripts/output/stage4-final/stage4-phase4ae-baseline-reconciliation-report.md` | 本書 |

変更しなかったもの：
- Bible JSON（bible_data/nt/）
- 辞書・検索インデックス
- reading engine（reading-engine.js）
- re-phase1-regression.cjs（PHASE1_BASELINE 未更新）

---

## 7. 未解決事項

| 項目 | 分類 | 内容 |
|------|------|------|
| PHASE1_BASELINE.morph | CONDITIONAL | 44276→44275 更新可否をユーザーが承認すれば更新 |
| re-stageE FAIL | DEFERRED | index.html の rn-ja displayLabel gap、別 Phase |
| Phase 4ad 実装報告書の誤記 | INFO | morph -1 の原因を「Phase 4ad より前の既存 gap」と誤記していた。正確には Phase 4ad (MAT 17:24!10) が原因。報告書の再発行は不要（本書で訂正・補足） |

---

## 8. 判定

| テスト | 判定 |
|--------|------|
| re-stageA | **ALL PASS** |
| re-stageB | **ALL PASS（更新後）** |
| re-stageD | **ALL PASS** |
| re-phase1 | **CONDITIONAL PASS** |
| re-stageE | 対象外（既知 gap） |

**Phase 4ae: PARTIAL PASS**  
STAGEB_BASELINE 更新完了。PHASE1_BASELINE は仕様条件不充足のため CONDITIONAL。  
ユーザーが Phase 4ad の影響を承認した場合、PHASE1_BASELINE.morph = 44275 に更新可。
