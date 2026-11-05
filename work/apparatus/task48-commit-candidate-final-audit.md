# Task 48 — 異読注釈コミット候補の最終確定

**Date:** 2026-10-16  
**Branch:** fix/vr5-gate-n-a  
**HEAD:** ec1b447dee669c64d69e7060d80de59f7a4bf2c5  
**State:** DONE

---

## 監査前のブランチ・HEAD・作業ツリー状態

```
Branch:              fix/vr5-gate-n-a
HEAD:                ec1b447dee669c64d69e7060d80de59f7a4bf2c5
origin/fix/vr5-gate-n-a: ec1b447dee669c64d69e7060d80de59f7a4bf2c5 (ローカル = リモート HEAD)
staged (cached):     なし
unstaged:            6ファイル変更 (102挿入 / 45削除)
untracked:           37ファイル
```

**git diff --stat:**
```
package.json                         |  8 +++-
public/index.html                    | 79 ++++++++++++++++++++++++++++++++----
scripts/output/re-stageD-audit.json  |  6 +--
scripts/output/wallace_coverage.json |  2 +-
scripts/output/wallace_coverage.md   |  2 +-
scripts/re-flow-dom-regression.cjs   | 50 +++++++++--------------
6 files changed, 102 insertions(+), 45 deletions(-)
```

---

## Task 47 分類からの変更点

| 変更 | 内容 |
|---|---|
| 追加 | `work/apparatus/task47-uncommitted-change-inventory.md` が `??` (untracked) として追加 |
| その他 | なし。Task 47 以降の状態変化なし |

---

## Phase B — 各ファイルの詳細確認

### `public/index.html`（M）

差分は 8 hunk、全 79行挿入 / 4行削除。

後述 Phase C 参照。**全 hunk が異読注釈の実装に属する（B/C 分類なし）。**

### `package.json`（M）

6スクリプトエントリを追加。

```json
"build:apparatus-ja-auto":     "node scripts/build-apparatus-ja-auto.cjs",
"test:re-apparatus-ja-auto":   "node scripts/re-apparatus-ja-auto-regression.cjs",
"build:apparatus-ja-phase2":   "node scripts/build-apparatus-ja-phase2.cjs",
"test:re-apparatus-ja-phase2": "node scripts/re-apparatus-ja-phase2-regression.cjs",
"build:apparatus-ja-phase3":   "node scripts/build-apparatus-ja-phase3.cjs",
"test:re-apparatus-ja-phase3": "node scripts/re-apparatus-ja-phase3-regression.cjs"
```

6スクリプトはすべて異読注釈 Phase 1/2/3 のビルド・テストに対応。他の機能への影響なし。  
**分類: A（異読注釈コア）。**

### 3つのデータ JSON（??）

| ファイル | エントリ数 | CONFIRMED |
|---|---|---|
| `apparatus-ja-auto.json` | 2,418 | ✓ |
| `apparatus-ja-phase2.json` | 2,796 | ✓ |
| `apparatus-ja-phase3.json` | 1,512 | ✓ |

**分類: A（異読注釈コア）。**

### 3つのビルダー（??）

**入力依存関係（CONFIRMED）:**

| ビルダー | 入力 | 出力 |
|---|---|---|
| `build-apparatus-ja-auto.cjs` | `apparatus.json`（コミット済）, `apparatus-ja.json`（コミット済）| `apparatus-ja-auto.json` |
| `build-apparatus-ja-phase2.cjs` | `apparatus.json`, `apparatus-ja.json`, `apparatus-ja-auto.json` | `apparatus-ja-phase2.json` |
| `build-apparatus-ja-phase3.cjs` | `apparatus.json`, `apparatus-ja.json`, `apparatus-ja-auto.json`, `apparatus-ja-phase2.json` | `apparatus-ja-phase3.json` |

**再現順序**: auto → phase2 → phase3（順次依存）。  
ビルダーの入力は既存コミット済みファイルと、前Phaseの出力のみ。  
再現に必要な前提条件はすべて Git 管理下にある（ビルダー自身をコミットすれば完結）。  
**分類: A（異読注釈コア）。**

### 5つの回帰テスト（??）

| ファイル | 対象 | チェック数 |
|---|---|---|
| `re-apparatus-ja-all-regression.cjs` | `_loadApparatusJaAllData()` マージロジック | 54 |
| `re-apparatus-display-regression.cjs` | `_buildApparatusHTML()` 表示条件 | 33 |
| `re-apparatus-ja-auto-regression.cjs` | `apparatus-ja-auto.json` 静的内容 | 32 |
| `re-apparatus-ja-phase2-regression.cjs` | `apparatus-ja-phase2.json` 静的内容 | 24 |
| `re-apparatus-ja-phase3-regression.cjs` | `apparatus-ja-phase3.json` 静的内容 | 53 |

5件はすべて異読注釈の実装・データに対応。  
**分類: A（異読注釈コア）。**

### 作業文書 11件（??）

| ファイル | 内容 | 実装必須か |
|---|---|---|
| `task31-integration-audit.md` | 統合監査 | 否（履歴） |
| `task33-ellipsis-display-policy.md` | 省略表示ポリシー | 否（履歴） |
| `task34-special-cases-audit.md` | 特殊ケース監査 | 否（履歴） |
| `task37-final-integration-audit.md` | 最終統合監査 | 否（履歴） |
| `task38-preservation-audit.md` | 保全監査 | 否（履歴） |
| `task39-ui-integration-design-audit.md` | UI統合設計監査 | 否（履歴） |
| `task42-post-integration-audit.md` | 統合後監査 | 否（履歴） |
| `task43-final-quality-gate.md` | 最終品質ゲート | 否（履歴） |
| `task44-japanese-visibility-diagnosis.md` | 可視性診断 | 否（履歴） |
| `task45-japanese-readable-annotations.md` | タグラベル改善 | 否（履歴） |
| `task46-comparison-readability.md` | 比較表示改善 | 否（履歴） |

実装再現・ビルド・テストには不要。設計根拠・監査証跡として残すことが望ましい。  
**分類: A任意（履歴・根拠として有用。含めることを推奨するが必須ではない）。**

### `scripts/re-flow-dom-regression.cjs`（M）

差分 +50/-25:

- **hunk 1 (lines 366+)**: golden baseline 2件を `--text-body` → `--text-body-lg` に更新。  
  起因: `626d7ab4` (fix: align reading mode body typography) で `renderBodyColumn` のフォントサイズトークンが変更されたため。
- **hunk 2 (lines 1702+)**: `_saveCurrentNote`, `toggleBookmark`, `_loadNoteUI`, `storage.saveNote/addBookmark` の各テストブロックを、正存在チェックから**非存在確認（N/A）**に置換。  
  起因: `6d59f91f` / `44b164c9` (2026-10-07, メモUI・bookmarkUI撤去) で対象関数が削除されたため。

**異読注釈との独立性: CONFIRMED。** 2つの別Taskに起因する変更のみ。  
**分類: B（別コミット候補）。**

### `scripts/output/` 3件（M）

| ファイル | 変更内容 |
|---|---|
| `re-stageD-audit.json` | `generated` 日付と `oldMs`/`newMs` パフォーマンス数値の更新 |
| `wallace_coverage.json` | `generated_at` タイムスタンプのみ |
| `wallace_coverage.md` | `Generated:` タイムスタンプのみ |

すべてスクリプト再実行による生成物。本番機能に無影響。スクリプト再実行で再現可能。  
**分類: C（任意。コミットしても問題なし。省略可能）。**

### Group D — 16件のデバッグ・検証スクリプト（??）

```
grep 検索: package.json, scripts/*.cjs, tests/**/*.cjs から16件のファイル名を検索
結果: none found
```

**外部参照なし CONFIRMED。** npm scripts にも、他のスクリプト・テストにも参照されていない。  
**分類: 除外（コミット不要）。**

### `work/search-page-redesign/`（??）

`design-spec.md`（検索ページ再設計仕様書）を含むディレクトリ。別Phase・別機能。  
**分類: 除外（コミット不要）。**

---

## Phase C — `public/index.html` の hunk 分類

全 8 hunk を確認。

| Hunk | 行範囲（原本） | 内容 | 分類 |
|---|---|---|---|
| 1 | 718+ CSS | `.mvv-app-rdg-num` 新クラス追加（①②③番号スタイル）、`.mvv-app-rdg-text` に `flex: 1` | **A** |
| 2 | 738+ CSS | コメント更新、`.mvv-app-anno` に `flex-wrap: wrap` | **A** |
| 3 | 753+ CSS | `.mvv-app-tag` から `white-space: nowrap` 削除、`.mvv-app-anno--auto .mvv-app-tag { font-style: italic }` 追加 | **A** |
| 4 | 13602+ JS | `_apparatusJaAllData`, `_apparatusJaAllLoadP` 状態変数追加 | **A** |
| 5 | 14898+ JS | `_loadApparatusJaAllData()` 関数追加（4データセット並列fetch + マージ） | **A** |
| 6 | 14930+ JS | `_APPARATUS_TAG_LABELS` 定数追加（8タグ → 日本語ラベル） | **A** |
| 7 | 14943+ JS | `_buildApparatusHTML()` 更新（`isAuto`, `tagLabel()`, ①②③番号） | **A** |
| 8 | 14974+ JS | `_fillApparatusSection()` を `_loadApparatusJaAllData()` に切り替え | **A** |

**B（別機能）: 0件。C（不明）: 0件。**

`public/index.html` の差分は異読注釈の実装のみ。混在変更なし。  
**ファイル全体を異読注釈コミットに含めて安全。**

---

## Phase D — コミット候補の最終リスト

### 1. 候補に含める（異読注釈コア）

| ファイル | 種別 | 根拠 |
|---|---|---|
| `public/index.html` | 実装 | 全hunk異読注釈。混在なし（CONFIRMED） |
| `package.json` | 設定 | 6スクリプト追加、全て異読注釈のbuild/test |
| `public/assets/data/apparatus-ja-auto.json` | データ | Phase 1, 2,418件。ビルダーから再現可能 |
| `public/assets/data/apparatus-ja-phase2.json` | データ | Phase 2, 2,796件。ビルダーから再現可能 |
| `public/assets/data/apparatus-ja-phase3.json` | データ | Phase 3, 1,512件。ビルダーから再現可能 |
| `scripts/build-apparatus-ja-auto.cjs` | ビルダー | Phase 1生成器。入力依存はコミット済みのみ |
| `scripts/build-apparatus-ja-phase2.cjs` | ビルダー | Phase 2生成器。Phase 1出力に依存 |
| `scripts/build-apparatus-ja-phase3.cjs` | ビルダー | Phase 3生成器。Phase 1+2出力に依存 |
| `scripts/re-apparatus-ja-all-regression.cjs` | 回帰テスト | 4データセット統合ローダー (54件) |
| `scripts/re-apparatus-display-regression.cjs` | 回帰テスト | 表示条件 (33件) |
| `scripts/re-apparatus-ja-auto-regression.cjs` | 回帰テスト | Phase 1データ静的検証 (32件) |
| `scripts/re-apparatus-ja-phase2-regression.cjs` | 回帰テスト | Phase 2データ静的検証 (24件) |
| `scripts/re-apparatus-ja-phase3-regression.cjs` | 回帰テスト | Phase 3データ静的検証 (53件) |

**任意（コミットに含めることを推奨）:**

| ファイル | 種別 | 根拠 |
|---|---|---|
| `work/apparatus/task31-integration-audit.md` 〜 `task46-comparison-readability.md`（11件） | 監査文書 | 設計根拠・判断履歴。実装必須ではないが残す価値がある |
| `work/apparatus/task47-uncommitted-change-inventory.md` | 棚卸し文書 | 本Task 48 の前提文書 |

---

### 2. 別コミット候補

| ファイル | 内容 | コミット分離の理由 |
|---|---|---|
| `scripts/re-flow-dom-regression.cjs` | golden baseline更新 + N/A置換（削除関数3件） | 2つの別Task（フォントトークン変更 + UI撤去）に起因。異読注釈と混在させると変更歴が不明確になる |

**推奨コミットメッセージ案:**  
`test(regression): renderBodyColumn golden baseline 更新、削除済み関数テストを N/A 化`

---

### 3. 保留

| ファイル | 理由 |
|---|---|
| `scripts/output/re-stageD-audit.json` | 生成物。コミット要否は任意（省略可） |
| `scripts/output/wallace_coverage.json` | 生成物。コミット要否は任意（省略可） |
| `scripts/output/wallace_coverage.md` | 生成物。コミット要否は任意（省略可） |

「保留」だが技術的な問題ではなく、プロジェクトポリシーの判断。  
**含めなければ `git diff` から除外すればよい。含めた場合も本番機能に影響なし。**

---

## 実装・ビルド・テストの依存関係

```
apparatus.json         (コミット済)
apparatus-ja.json      (コミット済)
        ↓
build-apparatus-ja-auto.cjs → apparatus-ja-auto.json
        ↓
build-apparatus-ja-phase2.cjs → apparatus-ja-phase2.json
        ↓
build-apparatus-ja-phase3.cjs → apparatus-ja-phase3.json
        ↓
public/index.html (_loadApparatusJaAllData: 4ファイルを並列fetch)
```

ビルド再実行の際は auto → phase2 → phase3 の順を守る必要がある。  
ビルダー3件と生成JSON3件をセットでコミットすれば、再現に必要な情報が完結する。

---

## コミット前に解決すべき事項

| 項目 | 状態 | 推奨 |
|---|---|---|
| `re-flow-dom-regression.cjs` を別コミットにする | 要判断 | 異読注釈コミットには含めず、別途コミットする |
| `scripts/output/` 3件の扱い | 要判断 | 省略（生成物のため）または別コミット |
| Group D 16件の後片付け | 要判断（CLAUDE.md §4.2） | 削除する場合は明示的承認が必要 |
| `work/search-page-redesign/` の後片付け | 要判断（CLAUDE.md §4.2） | 削除する場合は明示的承認が必要 |
| `public/rk-*.html` の後片付け | 要判断（CLAUDE.md §4.2） | `public/` 下にテスト用HTMLが残っている。削除するかは人間判断 |

技術的に**コミットをブロックする未解決事項はない**。  
上記はコミット後の後片付けとして整理できる。

---

## 推奨コミット構成

### コミット 1 — 異読注釈（必須13件 + 任意13件）

```
feat(apparatus): 異読注釈 Phase 1/2/3 の自動生成注釈を統合表示（Tasks 40-46）

必須:
  public/index.html
  package.json
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

任意（含める場合）:
  work/apparatus/task31-integration-audit.md
  〜
  work/apparatus/task47-uncommitted-change-inventory.md（12件）
```

### コミット 2 — 回帰テスト golden baseline 更新（1件）

```
test(regression): re-flow-dom-regression golden baseline 更新、削除済み関数 N/A 化

  scripts/re-flow-dom-regression.cjs
```

---

## 監査後の作業ツリー状態

```
変更ファイル:  既存の未コミット変更はそのまま保持
新規ファイル:  work/apparatus/task48-commit-candidate-final-audit.md (本文書)
git add:       実施なし
commit:        実施なし
push:          実施なし
```

**作業ツリー状態の変化: 本文書の追加のみ。**

---

## このタスクで実行していない操作

- `git checkout`、`git reset`、`git clean`、`git stash`
- `git add`、commit、push、PR作成、merge
- `public/index.html` の編集
- 既存の未コミットファイルの編集・削除
- 分類が不明なファイルの推測による確定
