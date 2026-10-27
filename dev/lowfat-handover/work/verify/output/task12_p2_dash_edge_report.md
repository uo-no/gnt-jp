# Task 12 完了報告: P2 καθώς dash エッジ検証

Date: 2026-10-21
Target: `app/rk-diagram-m3.html`（変更なし）
XML: `tests/task7_xml/col_final.xml` (COL 1:3–8)

---

## 1. 作業前確認

| 項目 | 値 |
|---|---|
| 対象 SHA (rk-diagram-m3.html) | `2de4891a38a6572fc476d32e361da8307ad6346bb3016a93dbaf6631433ec296` |
| P1 fix (Task 11) | 維持確認 (PASS) |
| LOWFAT XML | 変更なし |

P2 対象: COL 1:6!5 `καθώς` を起点とする dash エッジ（Task 10 D-1）。

---

## 2. LOWFAT 構造確認

```
sub-CL (role=o, class=cl)   ← main clause の第2目的語
  w  COL 1:6!5  καθὼς  class=conj     ← 接続詞
  wg class=cl  rk-dx=-1362, rk-dy=1176  ← 節内容（inner ClCl）
    wg AdvPp (role=adv)  ...
    wg BeVerb (role=v)
      w COL 1:6!11  ἐστὶν  class=verb
      wg Conj2VP  ...
    wg sub-CL (role=adv)  ...
```

接続先: `καθώς` (conj) → `ἐστίν` (clause head)。LOWFAT 構造上の接続先は正しい。

---

## 3. dash エッジ生成経路

`place(sub-CL)` → `stack([w(καθώς), wg(class=cl)], x, y=24)`

`stack()` 内の処理:
```javascript
// i=0: conjunction word
conj = put(k, x, Math.max(nom + dyOf(nx), cy));
// dyOf(nx) = 1176 → conjunction y = 24 + 1176 = 1200

// i=1: inner wg (clause content)
const py = Math.max(nom + dyOf(k), cy);       // py = 1200
const cx = (conj ? x + conj.w + 40 : x) + dxOf(k);  // cx = x + 73 + 40 - 1362
if(conj){ edges.push({a:conj.head, b:r.head, kind:'dash', grp:k}); }
```

`a` = καθώς (conjunction)、`b` = ἐστίν (clause content の head)。

---

## 4. yDiff / xDiff の直接原因

inner ClCl wg の `rk-dx=-1362` および `rk-dy=1176` が両方に作用する。

| 座標 | 計算式 | 値 |
|---|---|---|
| καθώς x (a.x) | `x_stack` | 1411 |
| καθώς y (a.y) | `y + dyOf(inner) = 24 + 1176` | 1200 |
| ἐστίν x (b.x) | `x_stack + conj.w + 40 + dxOf = 1411 + 73 + 40 - 1362` | 162 |
| ἐστίν y (b.y) | same as conjunction | 1200 |
| xDiff (b.x − a.x) | `162 − 1411` | **−1249** |
| yDiff (b.y − a.y) | `1200 − 1200` | **0** |

`dxOf = -1362` は、接続詞の配置後の自然な位置 `(x + conj.w + 40)` から 1362px 左へのオフセット。これにより節内容が接続詞より 1249px 左側に折り畳まれる。

---

## 5. 変更前後（Task 11 との比較）

### 現在の状態（Task 11 適用後）

| 要素 | x | y |
|---|---|---|
| καθώς (COL 1:6!5) | 1411 | 1200 |
| ἐστίν (COL 1:6!11) | 162 | 1200 |
| dash xDiff | −1249 | — |
| dash yDiff | 0 | — |

**SVG パス** (pd() dash):
```
M1442.27,1210 L186.27,1180
```
= 接続詞中央 (1442, 1210) から節内容中央 (186, 1180) への右→左対角線。

### Task 11 前との差分

Task 11 の変更は `clause()` のみ（`vTail` 追加）。`stack()` は変更していないため、dash エッジは Task 11 前後で変化なし。CONFIRMED by measurement: 全 4 dash エッジ方向・座標ともに変化なし。

---

## 6. 右→左 dash エッジは実際に誤読を招くか

| 読み取り | 状況 |
|---|---|
| CorreCT: καθώς が左の節内容を導く | 構造的には正しい |
| 混乱要因: 接続詞が節の右側に表示 | RK の慣習（接続詞が節の左側）と逆 |
| 混乱要因: dashed line が右→左に進む | 通常は左→右で節を導く |

**判定**: OBSERVED。読者が RK の慣習を知っている場合、接続詞が節内容の右側に表示されていることは非標準であり、混乱の可能性がある。ただし、καθώς が接続詞 (class=conj) として識別可能であり、破線は通常の実線と区別されるため、重大な誤読リスクは限定的。

---

## 7. 修正可能性の分析

### Task 12 の前提制約

- P1 fix (Task 11) を維持する
- LOWFAT XML を変更しない
- 最小限の修正のみ

### 検討した修正オプション

#### Option A: conjunction を節内容の左側に移動

`conjunction_x = content_x − conj.w − 14 = 162 − 73 − 14 = 75`

| 効果 | 評価 |
|---|---|
| P2 dash: left→right (75 < 162) | ✓ 修正 |
| P1 vo: Εὐχαριστοῦμεν(x=0) → καθώς(x=75), angle=4° | ✗ ほぼ垂直 (Task 11 修正前と同様) |

P1 fix との矛盾: 確定。

#### Option D: block 全体を dxOf 分左シフト

`conjunction_x = x_stack + dxOf = 1411 − 1362 = 49`

| 効果 | 評価 |
|---|---|
| P2 dash: left→right (49 < 162) | ✓ 修正 |
| P1 vo: Εὐχαριστοῦμεν(x=0) → καθώς(x=49), angle=2° | ✗ ほぼ垂直 |

#### Option B: pd() で dash パスを変更

dash エッジを右→左に描画するとき、L 字形や C 字形の別パスに変更する案。

- 接続詞の位置は変わらない（節の右側）
- 線の形状が変わるだけで、根本的な左右逆転は解消しない
- RK 上の意味は変わらない

効果: 限定的（視覚ノイズにもなりうる）。

### 幾何的制約のまとめ

```
P1 fix が機能する条件:
  καθώς は x=1411 (動詞から広い斜線が引ける) → P2 は逆方向

P2 が修正される条件:
  καθώς は x<162 (節内容の左側) → P1 vo edge はほぼ垂直に戻る

⇒ P1 と P2 は同一の καθώς 座標を共有するため、
  どちらか一方を修正すると他方が悪化する。
  XML 変更なしに両方を同時に解決する最小修正は存在しない。
```

---

## 8. 判定: DEFERRED

**理由**: 接続先は正しいが、P1 fix との幾何的矛盾により最小限の修正での解決不可。

根本的な解決には以下のいずれかが必要:
- LOWFAT XML の `rk-dx=-1362` を変更（Node さんが手動で設定した値、変更には承認が必要）
- sub-CL 全体のレイアウト再設計（大規模変更、現 Scope 外）

---

## 9. 検証結果

### task12_p2_verify.cjs — PASS 14 / FAIL 0

| 検証項目 | 結果 |
|---|---|
| P2 dash: a=COL 1:6!5 (καθώς) | PASS |
| P2 dash: b=COL 1:6!11 (ἐστίν) | PASS |
| P2 dash: xDiff < 0 (右→左) | PASS (xDiff=-1249) |
| P2 dash: yDiff≈0 (同一 y) | PASS (yDiff=0) |
| P2 dash: |xDiff| > 1000 | PASS |
| P1 vo: Εὐχαριστοῦμεν→καθώς 存在 | PASS (Task 11 維持) |
| P1 vo: aX < 10 (verb position) | PASS |
| P1 vo: yDiff=1176 | PASS |
| 正常方向 dash: 3件 | PASS |
| 逆方向 dash: 1件 (P2のみ) | PASS |
| COL 総エッジ数 86 変化なし | PASS |
| LUK dash: 1件 (正常方向) | PASS |
| LUK 総エッジ数 163 変化なし | PASS |

### task7_verify.js

Task 12 では `app/rk-diagram-m3.html` を変更していないため実行省略。
前回 (Task 11) baseline: PASS 11 / FAIL 3（既知問題のみ）。

---

## 10. 視覚確認

スクリーンショット取得済み:

| ファイル | 内容 | 判定 |
|---|---|---|
| `task12_p2_subCL_area.png` | sub-CL 領域 (y≈1200)。ἐστίν が左、καθώς が右端、dashed line が右→左 | OBSERVED: reversed direction 確認 |
| `task12_p2_full_0.3.png` | 全体 scale=0.3。P1 vo edge (広い斜線) 維持、sub-CL 内容確認 | OBSERVED: P1 维持 ✓ |

---

## 11. LOWFAT XML の変更

なし。`tests/task7_xml/col_final.xml` は変更していない。

---

## 12. Task 11 (vTail) の影響

`vTail` ロジックは `clause()` 内に限定される。`dash` エッジは `stack()` 内でのみ生成される。2つの関数間に依存関係はなく、Task 11 変更は dash エッジに一切影響しない。CONFIRMED (全 4 dash エッジ: 方向・座標ともに変化なし)。

---

## 13. スコープ外（DEFERRED）

| 問題 | 理由 |
|---|---|
| P3 (D-1 以外の手動座標副作用) | Task 12 スコープ外 |
| B-2 (NP-CL mod edge) | Task 12 スコープ外 |
| B-3 (ofNPNP head) | Task 12 スコープ外 |
| rk-dx=-1362 の値変更 | XML 変更につき承認要 |

---

## 完了状態

| ステート | 結果 |
|---|---|
| INVESTIGATED | ✓ 構造・エッジ生成・幾何制約を確認 |
| BROWSER-VERIFIED | ✓ スクリーンショット取得・視覚確認済み |
| CODE CHANGE | なし（DEFERRED）|
| REGRESSION | N/A（変更なし）|
| LOWFAT XML 変更なし | ✓ 確認済み |
| Git 操作 | なし |
| P1 fix 維持 | ✓ PASS |

**結論**: P2 の根本原因は特定済み（rk-dx=-1362 による接続詞右配置）。LOWFAT 構造上の接続先は正しい。最小限の修正では P1 fix との幾何的矛盾を解消できないため、DEFERRED。解決には LOWFAT XML の rk-dx 値変更または全体レイアウト再設計が必要。
