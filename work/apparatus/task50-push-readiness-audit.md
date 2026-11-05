# Task 50 — 異読注釈コミットの push 前監査

**Date:** 2026-10-16  
**Branch:** fix/vr5-gate-n-a  
**HEAD:** 0696f989d2aecf28980a0ce697280879ac77338c  
**State:** DONE

---

## Phase A — ローカル状態の確認

### ブランチ・HEAD

```
Branch: fix/vr5-gate-n-a
HEAD:   0696f989d2aecf28980a0ce697280879ac77338c  ← 対象コミットと一致 ✓
```

### git log -3

```
0696f989 (HEAD -> fix/vr5-gate-n-a) feat(apparatus): integrate Japanese textual variant annotations
ec1b447d (origin/fix/vr5-gate-n-a)  test(apparatus): 語の分析 Level3 状態での異読表示を実操作で検証
1a32a09e                             fix(apparatus): 語の分析中に本文の異読が隠れる CSS を修正
```

### 対象コミット内容（CONFIRMED）

```
13 files changed, 42242 insertions(+), 10 deletions(-)

M  package.json
A  public/assets/data/apparatus-ja-auto.json
A  public/assets/data/apparatus-ja-phase2.json
A  public/assets/data/apparatus-ja-phase3.json
M  public/index.html
A  scripts/build-apparatus-ja-auto.cjs
A  scripts/build-apparatus-ja-phase2.cjs
A  scripts/build-apparatus-ja-phase3.cjs
A  scripts/re-apparatus-display-regression.cjs
A  scripts/re-apparatus-ja-all-regression.cjs
A  scripts/re-apparatus-ja-auto-regression.cjs
A  scripts/re-apparatus-ja-phase2-regression.cjs
A  scripts/re-apparatus-ja-phase3-regression.cjs
```

### whitespace check

```
git diff HEAD^ HEAD --check → check OK
```

---

## Phase B — リモート追跡状態

### remote

```
origin  https://github.com/uo-no/gnt-jp.git (fetch)
origin  https://github.com/uo-no/gnt-jp.git (push)
```

### git branch -vv

```
* fix/vr5-gate-n-a  0696f989 [origin/fix/vr5-gate-n-a: ahead 1]
```

### ローカル追跡参照

```
git rev-parse origin/fix/vr5-gate-n-a
→ ec1b447dee669c64d69e7060d80de59f7a4bf2c5
```

### ls-remote（リモートの実状態）

```
git ls-remote origin refs/heads/fix/vr5-gate-n-a
→ ec1b447dee669c64d69e7060d80de59f7a4bf2c5  refs/heads/fix/vr5-gate-n-a
```

**リモートの実状態とローカル追跡参照が一致（CONFIRMED）。**  
`git fetch` 不要。追跡参照がリモートの実状態と同値。

---

## Phase C — 差分判定

### ahead / behind

```
git log --oneline origin/fix/vr5-gate-n-a..HEAD
→ 0696f989 feat(apparatus): integrate Japanese textual variant annotations

git log --oneline HEAD..origin/fix/vr5-gate-n-a
→ (空)
```

| 項目 | 値 |
|---|---|
| ローカル ahead | **1コミット** (`0696f989`) |
| ローカル behind | **0コミット** |
| 共通祖先（merge-base） | `ec1b447d`（= リモート現在 HEAD） |
| 分岐 | **なし** |
| push 方式 | **fast-forward のみ** |

### git diff --stat origin/fix/vr5-gate-n-a...HEAD

```
 package.json                                  |     8 +-
 public/assets/data/apparatus-ja-auto.json     | 14526 ++++++++++++++++++++
 public/assets/data/apparatus-ja-phase2.json   | 16806 ++++++++++++++++++++++++
 public/assets/data/apparatus-ja-phase3.json   |  9224 +++++++++++++
 public/index.html                             |    79 +-
 scripts/build-apparatus-ja-auto.cjs           |   134 +
 scripts/build-apparatus-ja-phase2.cjs         |   122 +
 scripts/build-apparatus-ja-phase3.cjs         |   165 +
 scripts/re-apparatus-display-regression.cjs   |   231 +
 scripts/re-apparatus-ja-all-regression.cjs    |   294 +
 scripts/re-apparatus-ja-auto-regression.cjs   |   206 +
 scripts/re-apparatus-ja-phase2-regression.cjs |   192 +
 scripts/re-apparatus-ja-phase3-regression.cjs |   265 +
 13 files changed, 42242 insertions(+), 10 deletions(-)
```

リモートとの差分は対象コミット 1件分のみ。想定通り。

---

## Phase D — 残存変更の保全確認

### コミット混入確認

```
git show --name-status HEAD | grep "re-flow-dom|re-stageD|wallace|rk-phase|rk-test|search-page|work/apparatus|debug_|audit-ch|verify-"
→ none of the preserved files in this commit
```

**対象外ファイルのコミット混入: なし（CONFIRMED）。**

### ファイル別保全確認

| ファイル / ディレクトリ | 期待状態 | 実際の状態 |
|---|---|---|
| `scripts/re-flow-dom-regression.cjs` | 未コミット（M） | **exists** ✓ |
| `scripts/output/re-stageD-audit.json` | 未コミット（M） | **exists** ✓ |
| `scripts/output/wallace_coverage.json` | 未コミット（M） | **exists** ✓ |
| `scripts/output/wallace_coverage.md` | 未コミット（M） | **exists** ✓ |
| `public/rk-phase-c-test.html` | 未追跡（??） | **exists** ✓ |
| `public/rk-test.html` | 未追跡（??） | **exists** ✓ |
| `work/search-page-redesign/` | 未追跡（??） | **exists** ✓ |
| `work/apparatus/*.md`（12件未コミット + 2件コミット済） | 未追跡 + 追跡済み | **14件 exists** ✓ |
| Group D デバッグスクリプト 14件（`audit-ch-verse.cjs` 他） | 未追跡（??） | **14件全 exists** ✓ |

全件保全確認済み。

---

## 作業ツリー状態（現在）

```
 M scripts/output/re-stageD-audit.json
 M scripts/output/wallace_coverage.json
 M scripts/output/wallace_coverage.md
 M scripts/re-flow-dom-regression.cjs
?? audit-ch-verse.cjs
?? debug_drawer_repro.cjs
?? debug_l2.cjs
?? public/rk-phase-c-test.html
?? public/rk-test.html
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
  (他 work/apparatus/ 未コミット文書)
?? work/search-page-redesign/
```

---

## push 可否

**READY**

| 判定項目 | 結果 |
|---|---|
| HEAD = 対象コミット | CONFIRMED |
| コミット内容が 13件のみ | CONFIRMED |
| 対象外ファイルの混入なし | CONFIRMED |
| whitespace check | クリーン |
| リモート実状態（ls-remote） | `ec1b447d`（追跡参照と一致） |
| ahead | 1コミット |
| behind | 0コミット |
| 分岐 | なし |
| push 方式 | fast-forward |
| 残存変更の保全 | 全件確認済み |

---

## push 前に必要な対応

なし。push は `git push origin fix/vr5-gate-n-a` で fast-forward 完了する。

---

## このタスクで実行していない操作

- `git fetch`
- `git push`
- PR作成・merge
- `git checkout`、`git reset`、`git clean`、`git stash`
- ファイルの変更・削除
