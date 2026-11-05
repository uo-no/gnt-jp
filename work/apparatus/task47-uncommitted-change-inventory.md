# Task 47 — 未コミット変更の棚卸しと依存関係

**Date:** 2026-10-16  
**Branch:** fix/vr5-gate-n-a  
**HEAD:** ec1b447d test(apparatus): 語の分析 Level3 状態での異読表示を実操作で検証  
**State:** DONE

---

## 作業前の git status --short

```
 M package.json
 M public/index.html
 M scripts/output/re-stageD-audit.json
 M scripts/output/wallace_coverage.json
 M scripts/output/wallace_coverage.md
 M scripts/re-flow-dom-regression.cjs
?? audit-ch-verse.cjs
?? debug_drawer_repro.cjs
?? debug_l2.cjs
?? public/assets/data/apparatus-ja-auto.json
?? public/assets/data/apparatus-ja-phase2.json
?? public/assets/data/apparatus-ja-phase3.json
?? public/rk-phase-c-test.html
?? public/rk-test.html
?? scripts/build-apparatus-ja-auto.cjs
?? scripts/build-apparatus-ja-phase2.cjs
?? scripts/build-apparatus-ja-phase3.cjs
?? scripts/re-apparatus-display-regression.cjs
?? scripts/re-apparatus-ja-all-regression.cjs
?? scripts/re-apparatus-ja-auto-regression.cjs
?? scripts/re-apparatus-ja-phase2-regression.cjs
?? scripts/re-apparatus-ja-phase3-regression.cjs
?? scripts/test_level2_glosses.cjs
?? scripts/test_mvv_drawer.cjs
?? tests/browser/audit-st004-007.cjs
?? tests/browser/verify-st005-height.cjs
?? verify-chapter-boundary.cjs
?? verify-drawer-close.cjs
?? verify-mobile-chapter-tracking.cjs
?? verify-mobile-clean.cjs
?? verify-mobile-layer2-back.cjs
?? verify-studypanel-companion.cjs
?? verify_motion_tmp.cjs
?? work/apparatus/task31-integration-audit.md
?? work/apparatus/task33-ellipsis-display-policy.md
?? work/apparatus/task34-special-cases-audit.md
?? work/apparatus/task37-final-integration-audit.md
?? work/apparatus/task38-preservation-audit.md
?? work/apparatus/task39-ui-integration-design-audit.md
?? work/apparatus/task42-post-integration-audit.md
?? work/apparatus/task43-final-quality-gate.md
?? work/apparatus/task44-japanese-visibility-diagnosis.md
?? work/apparatus/task45-japanese-readable-annotations.md
?? work/apparatus/task46-comparison-readability.md
?? work/search-page-redesign/
```

既追跡（コミット済み）: `work/apparatus/sblgnt_tei.xml`, `work/apparatus/task4-part2-report.md`

---

## 変更ファイルの全一覧と分類

### Group A — 異読注釈コア（コミット候補）

Tasks 40–46 による変更。異読注釈機能として一体でコミットする候補。

| ファイル | 状態 | 内容 |
|---|---|---|
| `public/index.html` | M (modified) | Tasks 40–46 の CSS + JS 変更（後述） |
| `package.json` | M (modified) | 6スクリプトエントリ追加（Phase 1/2/3 build/test） |
| `public/assets/data/apparatus-ja-auto.json` | ?? (untracked) | Phase 1 自動生成注釈 2,418件 |
| `public/assets/data/apparatus-ja-phase2.json` | ?? (untracked) | Phase 2 自動生成注釈 2,796件 |
| `public/assets/data/apparatus-ja-phase3.json` | ?? (untracked) | Phase 3 自動生成注釈 1,512件 |
| `scripts/build-apparatus-ja-auto.cjs` | ?? (untracked) | Phase 1 ビルダー |
| `scripts/build-apparatus-ja-phase2.cjs` | ?? (untracked) | Phase 2 ビルダー |
| `scripts/build-apparatus-ja-phase3.cjs` | ?? (untracked) | Phase 3 ビルダー |
| `scripts/re-apparatus-ja-all-regression.cjs` | ?? (untracked) | 4データセット統合の回帰テスト（54件）|
| `scripts/re-apparatus-display-regression.cjs` | ?? (untracked) | 表示統合の回帰テスト（33件） |
| `scripts/re-apparatus-ja-auto-regression.cjs` | ?? (untracked) | Phase 1 データ回帰テスト（32件） |
| `scripts/re-apparatus-ja-phase2-regression.cjs` | ?? (untracked) | Phase 2 データ回帰テスト（24件） |
| `scripts/re-apparatus-ja-phase3-regression.cjs` | ?? (untracked) | Phase 3 データ回帰テスト（53件） |

**作業文書（Group A に含む）:**

| ファイル | 内容 |
|---|---|
| `work/apparatus/task31-integration-audit.md` | 統合監査 |
| `work/apparatus/task33-ellipsis-display-policy.md` | 省略表示ポリシー |
| `work/apparatus/task34-special-cases-audit.md` | 特殊ケース監査 |
| `work/apparatus/task37-final-integration-audit.md` | 最終統合監査 |
| `work/apparatus/task38-preservation-audit.md` | 保全監査 |
| `work/apparatus/task39-ui-integration-design-audit.md` | UI統合設計監査 |
| `work/apparatus/task42-post-integration-audit.md` | 統合後監査 |
| `work/apparatus/task43-final-quality-gate.md` | 最終品質ゲート |
| `work/apparatus/task44-japanese-visibility-diagnosis.md` | 可視性診断 |
| `work/apparatus/task45-japanese-readable-annotations.md` | 日本語表示改善 |
| `work/apparatus/task46-comparison-readability.md` | 比較表示改善 |

---

### Group B — 別コミット候補

| ファイル | 状態 | 内容 | 理由 |
|---|---|---|---|
| `scripts/re-flow-dom-regression.cjs` | M (modified) | golden baseline更新（フォントサイズトークン変更対応）+ 削除関数 3件を N/A 置換 | 異読注釈とは別のTask（フォントトークン変更 / 関数削除）に起因。同一コミットに混在させると変更歴が複数Taskにまたがる |

---

### Group C — 出力ファイル（コミット要否は要判断）

| ファイル | 状態 | 内容 |
|---|---|---|
| `scripts/output/re-stageD-audit.json` | M (modified) | ステージD監査の出力JSON（差分2行） |
| `scripts/output/wallace_coverage.json` | M (modified) | Wallace coverage メトリクス（差分2行） |
| `scripts/output/wallace_coverage.md` | M (modified) | Wallace coverage マークダウン（差分2行） |

これらは生成物（scripts 実行の出力）。本番機能に影響しない。異読注釈コミットに含めるかは任意。

---

### Group D — デバッグ・検証スクリプト（コミット不要、後片付け対象）

本番コードにもテストスイートにも属さない一時的な検証スクリプト。

| ファイル | 用途 |
|---|---|
| `audit-ch-verse.cjs` | 章・節監査スクリプト（別セッションスクラッチ参照あり） |
| `debug_drawer_repro.cjs` | ドロワー再現デバッグ（旧セッションのスクラッチパス参照） |
| `debug_l2.cjs` | Level 2 デバッグスクリプト |
| `public/rk-phase-c-test.html` | RK Phase C テスト用HTML |
| `public/rk-test.html` | RK Phase B テスト用HTML |
| `scripts/test_level2_glosses.cjs` | StudyPanel Level 2 語義表示の確認スクリプト |
| `scripts/test_mvv_drawer.cjs` | MVV Level 2 ドロワー確認スクリプト |
| `tests/browser/audit-st004-007.cjs` | ST-004〜007 ブラウザ監査（別Task） |
| `tests/browser/verify-st005-height.cjs` | ST-005 高さ検証（別Task） |
| `verify-chapter-boundary.cjs` | 章境界検証 |
| `verify-drawer-close.cjs` | ドロワークローズ検証 |
| `verify-mobile-chapter-tracking.cjs` | モバイル章トラッキング検証 |
| `verify-mobile-clean.cjs` | モバイルクリーン状態検証 |
| `verify-mobile-layer2-back.cjs` | モバイル第二層戻る操作検証 |
| `verify-studypanel-companion.cjs` | StudyPanel 検証 |
| `verify_motion_tmp.cjs` | モーション一時検証 |

---

### Group E — 別機能（コミット不要）

| ファイル | 内容 |
|---|---|
| `work/search-page-redesign/` | 検索ページ再設計仕様書（別Phase） |

---

## `public/index.html` の変更内容要約

Tasks 40–46 による変更。単一の未コミットブロック。

### CSS 変更（6箇所）

| 変更 | Task |
|---|---|
| `.mvv-app-rdg-num` 新クラス追加（①②③番号の書式） | 46 |
| `.mvv-app-rdg-text` に `flex: 1` 追加 | 46 |
| `.mvv-app-anno` に `flex-wrap: wrap` 追加 | 45 |
| `.mvv-app-tag` から `white-space: nowrap` 削除 | 45 |
| `.mvv-app-anno--auto .mvv-app-tag` に `font-style: italic` 追加 | 41-Fix |

### JS 変更（5箇所）

| 変更 | Task |
|---|---|
| `let _apparatusJaAllData`, `_apparatusJaAllLoadP` 状態変数追加 | 40 |
| `_loadApparatusJaAllData()` 関数追加（4データセット並列 fetch + マージ） | 40 |
| `_APPARATUS_TAG_LABELS` 定数追加（8タグ → 日本語ラベル） | 45 |
| `_buildApparatusHTML()` 更新（`isAuto` 判定・`tagLabel()`・①②③番号） | 41/45/46 |
| `_fillApparatusSection()` で `_loadApparatusJaAllData()` を呼ぶよう変更 | 40 |

### 変更ルール適合性

| 確認項目 | 結果 |
|---|---|
| CONFIRMED: `_APPARATUS_TAG_LABELS` 定数がdiffに存在 | ✓ |
| CONFIRMED: `tagLabel()` 関数がdiffに存在 | ✓ |
| CONFIRMED: `_rdgNums` + 番号付き readings がdiffに存在 | ✓ |
| CONFIRMED: `flex-wrap: wrap` がdiffに存在 | ✓ |
| CONFIRMED: `white-space: nowrap` 削除がdiffに存在 | ✓ |
| CONFIRMED: 自動生成クラス `mvv-app-anno--auto` がdiffに存在 | ✓ |
| NOT VERIFIED: デスクトップ表示への漏れなし（CSS セレクターは `#mobile-verse-area` スコープ） | 構造から N/A |

---

## 異読注釈を一緒にコミットする場合の候補ファイル一覧

最小構成（機能 + データ + 回帰）:

```
public/index.html
public/assets/data/apparatus-ja-auto.json
public/assets/data/apparatus-ja-phase2.json
public/assets/data/apparatus-ja-phase3.json
scripts/build-apparatus-ja-auto.cjs
scripts/build-apparatus-ja-phase2.cjs
scripts/build-apparatus-ja-phase3.cjs
scripts/re-apparatus-ja-all-regression.cjs
scripts/re-apparatus-display-regression.cjs
scripts/re-apparatus-ja-auto-regression.cjs
scripts/re-apparatus-ja-phase2-regression.cjs
scripts/re-apparatus-ja-phase3-regression.cjs
package.json
```

任意（作業文書を含める場合）:

```
work/apparatus/task31-integration-audit.md
work/apparatus/task33-ellipsis-display-policy.md
work/apparatus/task34-special-cases-audit.md
work/apparatus/task37-final-integration-audit.md
work/apparatus/task38-preservation-audit.md
work/apparatus/task39-ui-integration-design-audit.md
work/apparatus/task42-post-integration-audit.md
work/apparatus/task43-final-quality-gate.md
work/apparatus/task44-japanese-visibility-diagnosis.md
work/apparatus/task45-japanese-readable-annotations.md
work/apparatus/task46-comparison-readability.md
```

---

## 未解決事項

| 項目 | 分類 | 説明 |
|---|---|---|
| `scripts/re-flow-dom-regression.cjs` の扱い | DEFERRED | 別Taskに起因する変更。異読注釈コミット前に別コミットにするか、後でまとめるかは人間判断 |
| `scripts/output/` 3ファイルの扱い | DEFERRED | 生成物のコミット要否は任意。本番機能に無影響 |
| Group D デバッグスクリプト16件の削除 | DEFERRED | コミット不要だが削除するか残すかは人間判断（CLAUDE.md §4.2: ファイル削除は明示的承認が必要） |
| `work/search-page-redesign/` の扱い | DEFERRED | 別Phase・別機能。コミットには含めない |
| `public/rk-*.html` の扱い | DEFERRED | テスト用HTMLがpublic/に残っている。削除するか残すかは人間判断 |

---

## 作業後の状態

**変更ファイル:** なし（本Taskは読み取り専用）  
**新規ファイル:** `work/apparatus/task47-uncommitted-change-inventory.md`（本文書のみ）  
**git add / commit / push:** 実施なし
