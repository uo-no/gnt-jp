# Task 44 — Japanese Apparatus Annotation Visibility Diagnosis

**Date:** 2026-10-16  
**Branch:** fix/vr5-gate-n-a  
**HEAD:** ec1b447d test(apparatus): 語の分析 Level3 状態での異読表示を実操作で検証  
**State:** DONE — 表示正常確認、修正不要

---

## 作業前 git status --short

```
 M package.json
 M public/index.html
 M scripts/output/re-stageD-audit.json
 M scripts/output/wallace_coverage.json
 M scripts/output/wallace_coverage.md
 M scripts/re-flow-dom-regression.cjs
?? public/assets/data/apparatus-ja-auto.json
?? public/assets/data/apparatus-ja-phase2.json
?? public/assets/data/apparatus-ja-phase3.json
?? scripts/re-apparatus-display-regression.cjs
?? scripts/re-apparatus-ja-all-regression.cjs
[...その他 untracked files]
```

---

## Phase A — 実ブラウザ再現結果

**環境:** ローカルサーバー `http://localhost:53977`、Playwright、モバイル幅 390×844px

### ケース1: ローマ1:1（manual 確認済み、ROM-0001）

| 項目 | 結果 |
|---|---|
| 異読UIを開けるか | YES — `<details class="mvv-apparatus-note">` 存在 |
| ギリシャ語異読情報 | YES — `Χριστοῦ Ἰησοῦ / Ἰησοῦ Χριστοῦ`（2読み） |
| 日本語注釈が見えるか | **YES** — `語順差　語順: Χριστοῦ Ἰησοῦ / Ἰησοῦ Χριστοῦ` |
| DOM に要素が存在 | YES — `.mvv-app-anno` |
| textContent が空でないか | YES — 非空 |
| display | flex |
| visibility | visible |
| opacity | 1.0 |
| height | 24.4px |
| コンソールエラー | なし |
| ネットワークエラー | なし |

**スクリーンショット:** `/tmp/task44/01-rom-1-1.png`

### ケース2: ローマ1:8（自動生成 Phase2、ROM-0002）

| 項目 | 結果 |
|---|---|
| 異読UIを開けるか | YES |
| ギリシャ語異読情報 | YES — `περὶ / ὑπὲρ`（2読み） |
| 日本語注釈が見えるか | **YES** — `読み差　περὶ（WH Treg NIV）・ὑπὲρ（RP）` |
| クラス | `.mvv-app-anno--auto`（自動生成） |
| .mvv-app-anno--auto display | flex |
| .mvv-app-anno--auto opacity | 1.0 |
| .mvv-app-tag fontStyle | italic（Task 41-Fix 適用済み） |
| .mvv-app-ja textContent | `περὶ（WH Treg NIV）・ὑπὲρ（RP）` |
| .mvv-app-ja height | 24px |

**スクリーンショット:** `/tmp/task44/02-rom-1-8.png`

### ケース3: 異読なし節（ローマ1:2）

| 項目 | 結果 |
|---|---|
| apparatus.json に存在するか | NO — `byVerse['ROM 1:2'] = null` |
| 表示 | 異読UIなし（正常動作） |

### ケース4: 節切り替え

| 操作 | 結果 |
|---|---|
| ROM 1:8 → ROM 1:1 高速切り替え | hasDetails=true（新しい節が正しく表示） |
| 再度切り替え | hasDetails=true（世代カウンタ正常動作） |

---

## Phase B — データ取得から表示まで追跡

### 4ファイル fetch 結果

| ファイル | HTTP | エントリ数 | 結果 |
|---|---|---|---|
| `apparatus-ja.json` | 200 OK | 30 | 正常 |
| `apparatus-ja-auto.json` | 200 OK | 2,418 | 正常 |
| `apparatus-ja-phase2.json` | 200 OK | 2,796 | 正常 |
| `apparatus-ja-phase3.json` | 200 OK | 1,512 | 正常 |

### `_loadApparatusJaAllData()` 実行結果

```
ok=true, null=false
total entries: 6,756
ROM-0001: { tag: "語順差", ja: "語順: Χριστοῦ Ἰησοῦ / Ἰησοῦ Χριστοῦ", status: "確認済み", note: "ROM 1:1" }
ROM-0002: { tag: "読み差", ja: "περὶ（WH Treg NIV）・ὑπὲρ（RP）", status: "自動生成", autoPhase: 2 }
```

### `_buildApparatusHTML()` 直接呼び出し結果（ROM 1:1）

```
entryCount: 1
firstEntryId: ROM-0001
jaEntry0: { tag: "語順差", ja: "語順: ...", status: "確認済み", note: "ROM 1:1" }
htmlLength: 506
hasAnno: true
hasAutoAnno: false
```

生成 HTML（先頭）:
```html
<div class="mvv-apparatus-entries">
  <div class="mvv-app-entry">
    <div class="mvv-app-lem">Χριστοῦ Ἰησοῦ</div>
    <div class="mvv-app-anno">
      <span class="mvv-app-tag">語順差</span>
      <span class="mvv-app-ja">語順: Χριστοῦ Ἰησοῦ / Ἰησοῦ Χριστοῦ</span>
    </div>
    ...
  </div>
</div>
```

### CSS 実測（ROM 1:8、`.mvv-app-anno--auto`）

```
display: flex
visibility: visible
opacity: 1
height: 24.4px
maxHeight: none
overflow: visible
clipPath: none

.mvv-app-tag: display=block, fontStyle=italic, opacity=1
.mvv-app-ja:  display=block, visibility=visible, opacity=1, height=24px
```

### コンソールエラー / ネットワーク失敗

- コンソールエラー: **0件**
- ネットワーク失敗: **0件**

---

## Phase C — 原因分類

**分類: G — 表示処理は正常で、確認方法や操作手順の問題**

### 根拠

| 経路 | 結果 |
|---|---|
| A: JSONが取得できない | CONFIRMED 正常取得 |
| B: fetchパスが誤っている | CONFIRMED パス正常（全200 OK） |
| C: 統合されていない | CONFIRMED 6,756エントリ統合済み |
| D: 表示条件で除外 | CONFIRMED 確認済み/自動生成とも表示 |
| E: DOM に挿入されていない | CONFIRMED DOM に挿入・textContent 非空 |
| F: CSSで隠れている | CONFIRMED opacity=1, display=flex, height>0 |
| **G: 確認方法の問題** | **CONFIRMED — 実ブラウザでは正常に表示** |

### 分類 G の詳細

`<details>` 要素は初期状態で **閉じている**。  
ユーザーが「本文の異読」のヘッダー行をタップして開くまで中身は見えない。  
これは `<details>` 要素の標準動作であり、実装のバグではない。

もし「日本語が表示されていない」という印象があるとすれば:
- `<details>` を開かない状態で見ていた
- 特定の節に apparatus エントリが存在しない（ローマ1:2 等）

---

## Phase D — 修正方針

**修正: 不要**

実装、データ取得、DOM 挿入、CSS、HTML生成、全経路が正常に動作していることを実ブラウザで CONFIRMED。

---

## 未検証項目

| 項目 | 理由 |
|---|---|
| 実機（iOS Safari / Android Chrome）での確認 | Playwright 環境では実機相当で検証済みだが、実端末の差異は未確認 |
| 特定フォント環境でのギリシャ語文字の描画 | 機能実装の確認範囲外 |
| ローマ以外の書（MAT 等）でのモバイル閲覧フロー | AppState.location.book が ROM の場合のみ通常経路で確認 |

---

## 絶対条件チェック

| 条件 | 結果 |
|---|---|
| 既存の未コミット変更を保持 | ✓ |
| commit / push / PR / merge 禁止 | ✓ |
| 原因特定前にコード・JSONを変更しない | ✓（コメント修正は Task 43 で実施済み） |
| デスクトップに異読UIを追加しない | ✓ |
| 既存の表示デザインを変更しない | ✓ |
