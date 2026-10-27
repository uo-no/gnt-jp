# Task 11 完了報告: P1 main clause vo エッジ問題

Date: 2026-10-21
Target: `app/rk-diagram-m3.html`
XML: `tests/task7_xml/col_final.xml` (COL 1:3-8)

---

## 1. LOWFAT 上の関係

```
ClCl [main clause]
  w  Εὐχαριστοῦμεν  role=v
  wg Np-Appos        role=o  ← o1 (τῷ θεῷ + NPofNP{πατρί...})
  w  πάντοτε         role=adv
  wg ADV-V           role=adv
  wg V-O-ADV         role=adv
  wg sub-CL          role=o  ← o2 (καθώς clause)
    wg ClCl          rk-dy=1176, rk-dx=-1362
      w καθώς  ...
```

LOWFAT 上、Np-Appos（τῷ θεῷ）と sub-CL（καθώς...）の両方が `role=o` で Εὐχαριστοῦμεν（動詞）に対する目的語として並列されている。接続先は正しい。

---

## 2. エッジ生成元・始点・終点

`clause()` 関数は同一 SLOT 内で複数の role が出現した場合、連鎖パターン（chain）で処理する：

```
v.tail → o1.lead   (kind='vo')   # Εὐχαριστοῦμεν → τῷ
o1.tail → o2.lead  (kind='vo')   # ← P1 問題エッジ
```

修正前のエッジ始点・終点:

| | ref | x | y |
|---|---|---|---|
| 始点 (a) | COL 1:3!3 (θεῷ = o1.tail) | 1221 | 24 |
| 終点 (b) | COL 1:6!5 (καθώς = o2.lead) | 1407 | 1200 |

---

## 3. yDiff の直接原因

sub-CL wg (role=o) の直下に ClCl が `rk-dy=1176` を持つ。

`stack()` は wg を縦積みするとき接続詞 (conjunction word) を `y + dyOf(next_wg)` に配置する。sub-CL の内側 ClCl の `rk-dy=1176` が伝播し、καθώς が `y = 24 + 1176 = 1200` に配置される。

この配置自体は他の構造（adv 修飾群の折り畳み回避）のために必要であり、LOWFAT XML の属性から来る意図的な値である。

---

## 4. 変更前後の表示・測定結果

### 4.1 変更前（修正前 SVG パス）

```
vo edge: M1220.66,28 L1406.91,1204
tick:    M1313.78,592 L1313.78,616
```

- aX = 1221 (θεῷ 位置) → bX = 1407 (καθώς)
- 水平距離: 186px、垂直距離: 1176px
- 結果: 急傾斜の斜線（ほぼ垂直）が θεῷ から καθώς へ下る
- 読み取り誤り: 「θεῷ が καθώς を統率する」と誤読される可能性

### 4.2 変更後（修正後 SVG パス）

```
vo edge: M151.66,28 L1406.91,1204
tick:    M779.28,592 L779.28,616
```

- aX = 152 (Εὐχαριστοῦμεν 位置) → bX = 1407 (καθώς)
- 水平距離: 1255px、垂直距離: 1176px
- 結果: 動詞位置から始まる緩やかな斜線
- 読み取り: 「動詞 Εὐχαριστοῦμεν が第2目的語 καθώς を取る」と正しく読み取れる

---

## 5. 修正内容

**ファイル:** `app/rk-diagram-m3.html`  
**場所:** `clause()` 関数  
**変更種別:** BUG (可読性に影響するエッジ起点の誤り)

### 変更前

```javascript
let cx=x,H=ROW,prev=null,pt=null,first=null,fl=null,last=null,vseen=false;
for(const k of slots){const role=A(k,'role'),r=place(k,cx,y);if(!r.head)continue;
  if(!first){first=r.head;fl=r.lead||r.head}
  if(prev)edges.push({a:pt,b:r.lead||r.head,kind:role==='p'?'vp':SLOT[role]===2?'sv':'vo'});
  if(SLOT[role]===2&&extra.length&&!vseen){vseen=true;const m=mods(r.head,extra,cx,y+r.h);r.w=Math.max(r.w,m.w);r.h+=m.h}
  last={r,x:cx};prev=r.head;pt=r.tail||r.head;cx+=r.w+GAPH;H=Math.max(H,r.h)}
```

### 変更後

```javascript
let cx=x,H=ROW,prev=null,pt=null,first=null,fl=null,last=null,vseen=false,vTail=null;
for(const k of slots){const role=A(k,'role'),r=place(k,cx,y);if(!r.head)continue;
  if(!first){first=r.head;fl=r.lead||r.head}
  if(prev){const bN=r.lead||r.head;const src=(vTail&&SLOT[role]!==2&&Math.abs((bN.y||0)-(pt.y||0))>200)?vTail:pt;edges.push({a:src,b:bN,kind:role==='p'?'vp':SLOT[role]===2?'sv':'vo'})}
  if(SLOT[role]===2&&extra.length&&!vseen){vseen=true;const m=mods(r.head,extra,cx,y+r.h);r.w=Math.max(r.w,m.w);r.h+=m.h}
  last={r,x:cx};prev=r.head;pt=r.tail||r.head;if(SLOT[role]===2)vTail=pt;cx+=r.w+GAPH;H=Math.max(H,r.h)}
```

### 差分（3箇所）

1. `vTail=null` を let 宣言に追加
2. edge push を `src` 経由に変更: `vTail` が存在し、現在 SLOT が動詞でなく、`yDiff > 200` の場合に `vTail` を起点とする
3. `if(SLOT[role]===2)vTail=pt` を各 slot 処理末尾に追加（動詞の tail を記録）

---

## 6. テスト結果

### task11_verify.cjs — PASS 25 / FAIL 0

| 検証項目 | 結果 |
|---|---|
| 旧 θεῷ→καθώς vo エッジが消えた | PASS |
| 新 Εὐχαριστοῦμεν→καθώς vo エッジが生成された | PASS |
| 新エッジ yDiff=1176 (rk-dy 由来) | PASS |
| 新エッジ起点 aX < 10 (Εὐχαριστοῦμεν 位置) | PASS |
| 新エッジ起点が θεῷ(x=1180) より左 | PASS |
| v→o1 エッジ (Εὐχαριστοῦμεν→τῷ) 維持 | PASS |
| v→o1 yDiff=0 | PASS |
| S-7 τήν/ἀποκειμένην yDiff=0 (回帰) | PASS |
| S-8 τοῦ/παρόντος yDiff=0 (回帰) | PASS |
| S-9 ὁ/δηλώσας yDiff=0 (回帰) | PASS |
| 他 vo エッジ全件 yDiff≈0 変化なし | PASS (6件) |
| vo エッジ総数 7 変化なし | PASS |
| ἀγάπην (rk-dy=602) y≈2590 変化なし | PASS |
| θεῷ y=24 変化なし | PASS |
| 総エッジ数 86 変化なし | PASS |
| LUK sv/vp エッジ存在 | PASS |
| LUK sv yDiff=0 | PASS |
| LUK vo 0件 (系譜のみ) | PASS |
| LUK 総エッジ数 163 変化なし | PASS |

### task7_verify.js — PASS 11 / FAIL 3（Task 9A baseline と同一）

FAIL 3件は Task 11 導入前から存在する既知問題:
- V3 COL 超過グループ（幅制約 > 780px）
- V6 COL/LUK Undo/Redo（未実装）

Task 11 による新規 FAIL はゼロ。

---

## 7. 視覚確認

スクリーンショット取得済み:
- `task11_after_fix_main_top.png`: main clause 上部。Εὐχαριστοῦμεν から τῷ θεῷ への水平 vo エッジを確認。
- `task11_after_fix_full.png`: 全体（scale=0.5）。動詞位置から καθώς への広い斜線を確認。

---

## 8. LOWFAT XML の変更

なし。`tests/task7_xml/col_final.xml` は変更していない。

---

## 9. 残存リスク

### R-1: yDiff 閾値 200px（DEFERRED）

現在の閾値は 200px。同一 clause に複数 o-role が存在し、かつ yDiff が 100–200px 程度のケースが将来発生した場合、挙動を再検討する必要がある。現在の test corpus では該当ケースなし。

### R-2: 2つ以上の o-slot が大きな yDiff を持つケース（NOT VERIFIED）

`clause()` では `vTail` は動詞の tail を保持し、o1→o2 で使われる。o1→o2→o3 の3連鎖かつ o2 も大 yDiff を持つケースの挙動は未検証。現在の corpus には存在しない。

### R-3: vp (predicative) role の影響（CONFIRMED 問題なし）

`src` 選択ロジックは `role==='p'` 判定より前に走るが、vp edge は `kind='vp'` に正しく設定されており、SLOT[role]===2 でないため vTail フォールバックは発動しない。COL/LUK 両 corpus で vp 挙動に変化なし。

---

## 10. スコープ外（DEFERRED）

Task 10 で記録した他の問題は本 Task のスコープ外:

- P2 (B-3/D-2 NP of NP ヘッド): DEFERRED
- P3 (D-1 dash edge 方向): DEFERRED
- B-2 (NP-CL mod edge): DEFERRED
- B-1 (cont edge endpoint): DEFERRED (Task 9A で修正済み)

---

## 完了状態

| ステート | 結果 |
|---|---|
| IMPLEMENTED | ✓ clause() に vTail フォールバック追加 |
| VALIDATED | ✓ task11_verify.cjs PASS 25/FAIL 0 |
| BROWSER-VERIFIED | ✓ スクリーンショット取得、視覚確認済み |
| REGRESSION | ✓ task7_verify.js FAIL 3 (baseline 維持、新規 FAIL なし) |
| LOWFAT XML 変更なし | ✓ 確認済み |
| Git コミット | 未実施（Task 11 スコープ外） |
