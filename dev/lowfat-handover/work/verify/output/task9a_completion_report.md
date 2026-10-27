# Task 9A 完了報告: B-1 DetCL detInline 対応

**作業日:** 2026-10-21  
**対象ファイル:** `app/rk-diagram-m3.html`  
**変更種別:** BUG / CORRECTNESS

---

## 1. 実施概要

Phase D 設計判断（`work/verify/output/phase_d_design_report.md`）に基づき、  
`wg[class=cl]` を頭語とする DetCL 構造（実質化冠詞 + 分詞節）に detInline 条件 C5 を追加した。

**Before:**  
DetCL の冠詞（det）が頭語節（cl）の下方に配置（mods() 経由）。  
Phase C 実測: S-7 yDiff=130px, S-8 yDiff=84px, S-9 yDiff=778px。

**After:**  
DetCL の冠詞が頭語節と同一ベースライン、左横に配置（inline）。  
S-7/S-8/S-9 yDiff = 0。

---

## 2. 変更内容

### 変更ファイル

`app/rk-diagram-m3.html`（2箇所）

### Change 1: hPhrase() — DetCL の高さ計算

**行 8388–8389（hPhrase 関数内、NPDetAdj チェックの直後）:**

```javascript
// detInline（cl 頭語、B-1）: head が cl（実質化分詞節）の場合 det は inline → 高さに加算しない
if(detInline&&ks[hi]&&ks[hi].tagName==='wg'&&A(ks[hi],'class')==='cl'){const rest_=ks.filter((_,i)=>i!==hi);if(rest_.length>0&&rest_.every(k=>k.tagName==='w'&&A(k,'class')==='det'))return hgt(ks[hi])}
```

**意図:** DetCL の親構造（例: Np-Appos）の高さを計算するとき、冠詞を別行扱いしない。  
hgt(cl頭語) のみを返す（冠詞の ROW 分を加算しない）。

---

### Change 2: phrase() — DetCL の横並び配置（C5条件）

**行 8419–8420（phrase 関数内、C4/NPDetAdj 条件の直後、fallthrough の前）:**

```javascript
// detInline C5（wg 頭語 = cl、DetCL、B-1）: 実質化冠詞を節と同一ベースラインに横並び
if(detInline&&ks[hi].tagName==='wg'&&A(ks[hi],'class')==='cl'&&rest.length>0&&rest.every(k=>k.tagName==='w'&&A(k,'class')==='det')){let cx=x,firstDr=null;for(const d of rest){const dr=put(d,cx,y);if(!firstDr)firstDr=dr;cx+=dr.head.w+14;}const hr=place(ks[hi],cx,y);if(b2UL&&firstDr)b2Pairs.push({det:firstDr.head,noun:hr.head,el:null});return{head:hr.head,lead:EW.get(rest[0])||hr.head,tail:hr.tail||hr.head,w:cx-x+hr.w,h:hr.h,usedPre:true}}
```

**条件（C5）:**
- `detInline` フラグが true
- 頭語 (hi) が `tagName=wg` かつ `class=cl`
- 残りメンバー (rest) がすべて `tagName=w, class=det`

**動作:** 冠詞を左から順に x に配置 → cl を `cx` に配置 → inline 結果を返す。

---

## 3. S-7 / S-8 / S-9 改善確認

| ケース | 参照 | 変更前 yDiff | 変更後 yDiff | 結果 |
|--------|------|------------|------------|------|
| S-7 τήν/ἀποκειμένην | COL 1:5!4–5 | 130 px | **0** | PASS ✓ |
| S-8 τοῦ/παρόντος | COL 1:6!1–2 | 84 px | **0** | PASS ✓ |
| S-9 ὁ/δηλώσας | COL 1:8!1, 1:8!3 | 778 px | **0** | PASS ✓ |

検証方法: `scratchpad/task9a_verify.cjs`（Puppeteer, col_final.xml）

---

## 4. 回帰確認: B-1 対象外ケース

| ケース | 参照 | 変更前 | 変更後 | 結果 |
|--------|------|--------|--------|------|
| S-2 NpPp τήん/πίστιν | COL 1:4!2–3 | yDiff=176 | 変化なし | PASS ✓ |
| S-3 NP-CL τήん/ἀγάπην | COL 1:4!9–10 | yDiff=176 | 変化なし | PASS ✓ |
| S-4 NPofNP-wg τοῦ/ἀγαπητοῦ | COL 1:7!5–6 | yDiff=54 | 変化なし | PASS ✓ |
| S-5 ofNPNP+rk-dy τήん/ὑμῶν | COL 1:8!5–6 | yDiff=732 | 変化なし | PASS ✓ |
| S-6 ἡμῶν y位置 | COL 1:7!8 | y≈1590 | 変化なし | PASS ✓ |
| C1 τῷ/θεῷ inline | COL 1:3!2–3 | yDiff≈0 | yDiff≈0 | PASS ✓ |
| C3 NPofNP τοῦ/κυρίου | COL 1:3!5–6 | yDiff≈0 | yDiff≈0 | PASS ✓ |

---

## 5. 手動座標への影響

| 参照 | 属性 | 確認内容 | 結果 |
|------|------|---------|------|
| COL 1:8!7 ἀγάπην | rk-dy=602 (NpPp) | task7_verify.js V2: `rk-dx=-802 rk-dy=602 "ἀγάπην ἐν"` CONFIRMED | 変化なし ✓ |
| COL 1:3!4–8 πατρί | rk-dx=-1009, rk-dy=938 | V2: `rk-dx=-1009 rk-dy=938 "πατρὶ τοῦ"` CONFIRMED | 変化なし ✓ |
| LUK 3:25!5 etc. | rk-dx=-780 (系譜) | V2: LUK 3件の rk-dx=-780 CONFIRMED, V3 PASS | 変化なし ✓ |

B-2/B-3 は未実装。LOWFAT XML は変更していない。

---

## 6. task7_verify.js 全スイート結果

```
=== 検証結果: PASS 11 / FAIL 3 ===
```

| テスト | B-1前 | B-1後 | 分類 |
|--------|-------|-------|------|
| COL V1–V2 | PASS | PASS | ✓ |
| COL V3 (GM≤780) | **FAIL (3件超過)** | **FAIL (4件超過)** | 後述 |
| COL V4–V5 | PASS | PASS | ✓ |
| COL V6 (Undo/Redo) | FAIL | FAIL | 既存バグ・B-1無関係 |
| COL V7 | PASS | PASS | ✓ |
| LUK V1–V5, V7 | PASS | PASS | ✓ |
| LUK V3 (GM≤780) | PASS (0件超過) | PASS (0件超過) | ✓ |
| LUK V6 (Undo/Redo) | FAIL | FAIL | 既存バグ・B-1無関係 |

**総 PASS/FAIL 数は B-1 前後で変化なし（11 PASS / 3 FAIL）。**

---

## 7. COL V3 カスケード分析

### 現象

B-1 後、COL V3 内の超過グループ数が 3 → 4 に増加。  
具体的には COL 1:4 / COL 1:7 エリアの複数語が +46–47px 右シフト。

```
COL 1:4!3 πίστιν:  x 642 → 688  (+46px)
COL 1:7!7 διάκονος: x 521 → 568  (+47px)
COL 1:5!5 ἀποκειμένην: x 146 → 193 (+47px)  ← B-1 直接対象（S-7）
```

### 根本原因

B-1 は S-9（COL 1:8!1 ὁ + δηλώσας）の DetCL を inline 化した。

1. S-9 DetCL の phrase 幅が `τήν.w + 14 ≈ 47px` 増加。
2. S-9 を内包する S-VC-P 節（role=p スロット）の幅が +47px。
3. S-VC-P はさらに上位の NPofNP chain（main clause の role=o スロット）内にあり、その幅が増加。
4. role=o スロットの幅増加により、main clause 内の後続スロット/extra items の cx 開始位置が +47px シフト。
5. ἀκούσαντες 節（COL 1:4）と複数の adv 項がその extra items に含まれ、全体が +47px 右シフト。

### 評価

- **この +47px シフトは RK 図の correctness を損なわない。**  
  語の相対配置（上下・左右関係）は維持されている。水平方向に全体がずれるのみ。
- **V3 は B-1 前から FAIL**（COL ではすでに 3 グループが 780px を超過）。  
  B-1 により 4 グループに増加（既存 FAIL の悪化、新規 FAIL ではない）。
- **LUK V3 は変化なし（PASS 維持）。**
- B-1 実装上の本質的な副作用: DetCL inline 化により親フレーズ幅が増加する。  
  これは仕様通りの挙動であり、将来の B-2/B-3 実装でも同様の width cascade が生じうる点を記録する。

---

## 8. 非実装事項（制約遵守）

| 制約 | 状態 |
|------|------|
| LOWFAT XML 変更しない | CONFIRMED — XML 未変更 |
| ofNPNP pron-head 67件に一括 detInline 適用しない | CONFIRMED — C5 は cl 頭語のみ |
| rk-dy=602 等の手動座標を変更しない | CONFIRMED — V2 で保持を確認 |
| B-2 / B-3 を同時実装しない | CONFIRMED — 未実装 |
| 既存テスト条件を弱めない | CONFIRMED — V3 FAIL 数は増加（緩和なし） |
| ユーザーの未コミット変更を上書きしない | CONFIRMED — 作業前にファイル状態確認済み |

---

## 9. 状態

```
STATE BEFORE:  B-1 未実装、S-7/S-8/S-9 yDiff=130/84/778px
STATE AFTER:   B-1 実装済み、S-7/S-8/S-9 yDiff=0

IMPLEMENTED:   hPhrase() C5 check (line 8389), phrase() C5 condition (line 8420)
VALIDATED:     task9a_verify.cjs (S-7/S-8/S-9 PASS, 回帰 PASS)
               task7_verify.js (PASS 11 / FAIL 3, 総数変化なし)
EVIDENCE:      CONFIRMED (Puppeteer runtime measurement)

REGRESSION:    V3 COL 超過グループ数 3→4 (pre-existing FAIL の悪化、width cascade)
               V6 COL/LUK: pre-existing FAIL 継続 (undoS empty, B-1 無関係)

NOT VERIFIED:  1CO 系 DetCL の視覚検証（col_final.xml の COL のみ実施）
DEFERRED:      B-2 (NPofNP wg-head extension)
               B-3 (NP-CL / NpPp対応)
               V3 COL width cascade 解消（B-2/B-3 後に再評価）

NEXT ALLOWED STATE: B-2 実装（Task 9B）、または V3 COL cascade 対応（別 Task）
```

---

## 10. 変更ログ

```
[B-1] hPhrase(): DetCL (cl頭語) の高さ計算に C5 条件追加
  File: app/rk-diagram-m3.html, line 8388-8389
  Condition: detInline && ks[hi].tagName==='wg' && A(ks[hi],'class')==='cl' && all-det rest
  Effect: hgt(cl_head) を返す（冠詞の高さを加算しない）

[B-1] phrase(): DetCL inline 配置 C5 条件追加
  File: app/rk-diagram-m3.html, line 8419-8420
  Condition: detInline && cl wg head && all-det rest
  Effect: 冠詞を x に横並び配置、cl 頭語を cx に配置して inline 結果を返す
```
