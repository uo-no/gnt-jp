# Phase 4af — PHASE1 Baseline Update Report

**日付**: 2026-11-04  
**Phase**: 4af — PHASE1_BASELINE.morph 更新  
**変更対象**: `scripts/re-phase1-regression.cjs`

---

## 1. 作業前確認

| 項目 | 値 |
|------|-----|
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| origin HEAD SHA | 2120b4b4201a492bfd7f9f5e610e7b2833b02d31 |
| worktree | 未コミット変更多数（Phase 4k 以降、既存変更保持済み） |
| Phase 4ae 報告書 | `scripts/output/stage4-final/stage4-phase4ae-baseline-reconciliation-report.md` ✓ |
| PHASE1_BASELINE.morph（更新前） | 44276 ✓ |
| STAGEB_BASELINE.changed | 39674 ✓ |
| STAGEB_BASELINE.identical | 98067 ✓ |
| STAGEB_BASELINE.brokenOld | 1245 ✓ |
| STAGEB_BASELINE.brokenNew | 0 ✓ |
| STAGEB_BASELINE.panelMismatch | 0 ✓ |

---

## 2. 更新根拠の再確認

Phase 4ae の調査結果を再検証した。

| 確認項目 | 結果 |
|----------|------|
| 対象は MAT 17:24!10 G2983 V-PAP-NPM の Phase 4ad 変更であること | CONFIRMED |
| 旧訳 `受ける` の resolve() 結果 | `{"japanese":"受けながら","source":"morph",...}` → covered=true |
| 新訳 `取る` の resolve() 結果 | `null` → covered=false |
| coverage delta | -1（COVERED→UNCOVERED） |
| Phase 4ad の承認済み変更に由来すること | CONFIRMED（Phase 4ac APPROVED_FOR_CHANGE、Phase 4ad 実装済み） |
| T0 表示 `取る` が正常であること | CONFIRMED（engine null→base フォールバック、表示は正常） |
| T2 `取ながら` はイ音便欠落（T2 パス限定の既知制約） | CONFIRMED（brokenNew=0 維持、実ユーザー表示への影響なし） |

**mechanism（再確認）:**

- `受ける`（1段動詞）: `_applyRules("受ける", "part-pres")` → "受けながら"（正規形）→ morph result
- `取る`（五段ラ行）: `_applyRules("取る", "part-pres")` → "取ながら"（イ音便欠落・破損形）→ engine が null を返し安全側フォールバック（T0="取る"）

Phase 4q（-4: "縛る"→"〜しなければならない"）と同種の、承認済みデータ変更による意図的な coverage 変化。

---

## 3. 変更内容

ファイル: `scripts/re-phase1-regression.cjs`

```
// 変更前
morph:       44276,

// 変更後
// 2026-11-04 Phase 4ad 31件実装: 44276→44275（−1）。悪化ケース 0。
// MAT 17:24!10 V-PAP-NPM G2983 受ける→取る: 受ける（1段動詞）は part-pres ルールで
// "受けながら" を生成し morph 解決可だったが、取る（五段ラ行）はイ音便欠落を prevent
// するため engine が null を返す（T0 表示 "取る" は正常）。Phase 4q と同種の変化。
// 承認: stage4-phase4ae-baseline-reconciliation-report.md / Phase 4af。
morph:       44275,
```

変更はこの1値と根拠コメントのみ。他の baseline・テストロジック・閾値は変更なし。

---

## 4. 更新後テスト結果

| テスト | 結果 | checks |
|--------|------|--------|
| **re-phase1** | **ALL PASS** | 111/111 |
| **re-stageB** | **ALL PASS** | 27/27 |
| **re-stageA** | **ALL PASS** | 19/19 |
| **re-stageD** | **ALL PASS** | 18/18 |

**critical conditions:**

| 指標 | 値 |
|------|-----|
| brokenNew | 0 ✓ |
| panelMismatch | 0 ✓ |
| doubleParticle | 0 ✓ |
| weirdPassive | 0 ✓ |
| brokenImperative | 0 ✓ |

---

## 5. T2 イ音便欠落の管理

MAT 17:24!10 V-PAP-NPM "取る" の T2 path では "取ながら"（イ音便欠落）が発生する。

- **T0（実表示）**: "取る"（engine null→base フォールバック）→ 正常
- **T2（参考記録）**: "取ながら"（brokenOld=1245 に計上済み）→ 参考記録のみ

この形の正確な表示（"取りながら"）には reading engine の五段ラ行 part-pres ルール拡張が必要。読み engine の修正は別 Phase での判断事項。現行では "取る"（base form）が表示され、文意の破壊はない。

---

## 6. 変更ファイル一覧

| ファイル | 変更内容 |
|----------|---------|
| `scripts/re-phase1-regression.cjs` | `PHASE1_BASELINE.morph`: 44276 → 44275 + コメント追加 |
| `scripts/output/stage4-final/stage4-phase4af-phase1-baseline-update-report.md` | 本書 |

変更しなかったもの：
- Bible JSON（bible_data/nt/）
- reading engine（reading-engine.js）
- 辞書・検索インデックス
- STAGEB_BASELINE（re-stageB-regression.cjs の値は変更なし）
- 他のテストロジック・閾値
