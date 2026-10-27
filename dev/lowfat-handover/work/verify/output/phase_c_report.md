# Task 8 Phase C — 統語構造からRK図への対応検証報告書

**READ-ONLY監査 — HTML/XML/解析コード変更なし / Git操作なし**

生成日: 2026-10-21  
根拠: `rk-diagram-m3.html` L8290〜L8430 静的コード解析 / Puppeteer 実行時座標計測 (col_final.xml / 03-luke.xml)  
座標データ: `phase_c_out/phase_c_coords.json` / `phase_c_out/phase_c_luk.json`

---

## 1. `phrase()` / `mods()` / `detInline` — コード構造の確定

### 1.1 `place()` ルーティング (L8308–L8314)

```
place(n, x, y)
  if n == w           → put()             (単語を配置)
  if any child has role in SLOT → clause() (節：スロットベース水平配置)
  if sentence | all-cl children → stack()  (文/節列：縦積み)
  else                → phrase()           (句：head + mods)
```

### 1.2 `phrase()` の detInline 条件 (L8400–L8418)

4条件すべてが `!hoist && pre.length===0` ブロック内。すべてが `rest.every(k => k.tagName==='w' && A(k,'class')==='det')` を必須とする（rest が det 語のみのとき限定）。

| 条件 | head type | 追加条件 | 発火例 |
|---|---|---|---|
| C1 | `w`（非NONHEAD） | — | τήν + πίστιν(w) |
| C2 | `wg[AdjpNp]` | 全直接子が `w` | τόν + AdjpNp{ἀγαπητόν, υἱόν} |
| C3 | `wg[NPofNP]` | 先頭直接子が `w` 非NONHEAD | τοῦ + NPofNP{κυρίου, ...} |
| C4 | `wg[NPDetAdj]` | 先頭直接子 `w` or 先頭 `wg[NPofNP]` の先頭 `w` | τήν + NPDetAdj{...} |

条件不成立 → `const hr=place(ks[hi],x,y), m=mods(hr.head,rest,x,y+hr.h)` に落ちる。  
`mods()` は `list` 内の各要素を **head の下方** に `y+IND+dxOf(k)` で配置する。

### 1.3 `mods()` における rk-dy / rk-dx の適用 (L8337–L8341)

```javascript
function mods(head, list, x, y0) {
  for(const k of list) {
    const py = Math.max(nom + dyOf(k), cy);       // rk-dy が nom に加算
    const r = place(k, x + IND + dxOf(k), py);   // rk-dx が x に加算
    ...
  }
}
```

`rk-dy` / `rk-dx` は **`mods()` の list 内の wg にのみ** 加算される。  
`clause()` では適用されない（slot-based 水平配置）。  
`phrase()` では head 配置時には適用されない（head は常に (x, y) に置かれる）。

---

## 2. B判定9件の実測座標（CONFIRMED）

`col_final.xml` を `fresh()` でロード後、Puppeteer 実測。

| ID | det ref | det (x,y) | head ref | head (x,y) | yDiff | xDiff | 原因 |
|---|---|---|---|---|---|---|---|
| S-2 | COL 1:4!2 | (672, 376) | COL 1:4!3 | (642, 200) | **176** | 30 | NpPp head → detInline C1〜C4 不成立 |
| S-3 | COL 1:4!9 | (702, 598) | COL 1:4!10 | (672, 422) | **176** | 30 | NP-CL head → 同上 |
| S-4 | COL 1:7!5 | (521,1720) | COL 1:7!6 | (551,1666) | **54** | −30 | NPofNP first child が wg → C3 不成立 |
| S-5 | COL 1:8!5 | (918,2682) | COL 1:8!6 | (888,1950) | **732** | 30 | ofNPNP head + rk-dy=602 複合 |
| S-7 | COL 1:5!4 | (176, 406) | COL 1:5!5 | (146, 276) | **130** | 30 | DetCL head → C1〜C4 不成立 |
| S-8 | COL 1:6!1 | (378, 696) | COL 1:6!2 | (348, 612) | **84** | 30 | DetCL head → 同上 |
| S-9 | COL 1:8!1 | (761,2728) | COL 1:8!3 | (731,1950) | **778** | 30 | DetCL head + 節内に rk-dy=602 複合 |

S-6 (npofnp6 検査誤検知確認):

| 語 | ref | (x, y) |
|---|---|---|
| ἡμῶン (NPofNP layout head) | COL 1:7!8 | (491, 1590) |
| συンドゥ (AdjpNp head) | COL 1:7!7 | (521, 1628) |
| ἀがτοῦ (AdjpNp mods) | COL 1:7!6 | (551, 1666) |
| τοῦ (DetNP det, S-4) | COL 1:7!5 | (521, 1720) |

→ **ἡμῶン y=1590 < ἀがτοῦ y=1666: ἡμῶン が layout head（上位）であることを CONFIRMED**。  
Phase 2 の検査は全子孫 w を使い ἀがτοῦ を誤って head と判定したメソドロジー誤り。

S-1 slot11 edges:
- vo: `COL 1:8!3 → COL 1:8!6` (δηλώσας → ὑμῶン) **CONFIRMED**
- τήン (COL 1:8!5) は det として mods() で下方配置されるため vo エッジの接続先ではない
- Phase 2 SUSPECT は検査誤検知 **CONFIRMED**

---

## 3. S-5 / R-6 連鎖関係の検証

### 3.1 因果連鎖

```
NpPp[rk-dy=602, rk-dx=-802]   (COL 1:8!7-9: ἀがん ἐν πνεύματι)
  ↓ mods() で ofNPNP の list に置かれる
  ↓ dyOf(NpPp) = 602 → NpPp が nom+602 の位置に移動
  ↓ ofNPNP.h (height) が大きくなる (602px 分拡大)
  ↓ phrase([τήン, ofNPNP], ...) → mods(ofNPNP_head, [τήン], x, y+ofNPNP.h)
  ↓ τήン y = y_start + ofNPNP.h
```

### 3.2 実測比較（Puppeteer）

| 状態 | ὑμῶン y | ἀが y | τήン y | τήン yDiff from ὑμῶン |
|---|---|---|---|---|
| rk-dy=602 あり（現行） | 1950 | 2590 | **2682** | **732** |
| rk-dy 除去（ブラウザDOM操作） | 1950 | 1988 | **2080** | **130** |

→ `rk-dy=602` が **τήン の yDiff を 130px → 732px へ 602px 拡大**することを実測で CONFIRMED。  
→ rk-dy 除去後も yDiff=130px は残る（detInline が ofNPNP を未対応のため）。

### 3.3 S-9 の yDiff=778 の原因

S-9 (ὁ = COL 1:8!1) は DetCL の det。DetCL の head は ADV-V-IO-O 節 (8語)。  
ADV-V-IO-O 節は clause() で処理され、そのオブジェクト句は DetNP→ofNPNP→NpPp[rk-dy=602] を含む。  
clause() は v-slot の高さを ADV-V-IO-O.h に反映し、NpPp の rk-dy=602 が clause 全体の高さを拡大する。  
DetCL phrase(): ὁ → mods() → ADV-V-IO-O 節の下方へ。节.h が rk-dy=602 の影響で拡大 → ὁ.y = 2728 (778px below δηλώσας y=1950)。

**S-5 (det yDiff=732) と S-9 (det yDiff=778) は同一の NpPp[rk-dy=602] を共有する連鎖問題。**

---

## 4. R-4 πατρί (COL 1:3!4-9) rk-dy=938 の検証

| 状態 | θεῷ y | πατρί y |
|---|---|---|
| auto（rk-dy 除去） | 24 | 62 |
| rk-dy=938 あり（現行） | 24 | 1000 |

→ `rk-dy=938` により πατρί は auto 位置 y=62 から y=1000 へ、正確に **938px 下方シフト** CONFIRMED。  
→ auto では θεῷ (y=24) と πατρί (y=62) がほぼ同一行に重なる → 視認性のため下方移動が必要。  
→ 構造正常（同格 Np-Appos として正しい）。座標調整は視認性のための必要な手動オフセット。

---

## 5. R-1〜R-3 LUK 系譜 rk-dx=-780 の検証

`03-luke.xml`（19,446語）を `fresh()` でロード後、Puppeteer 実測。

### 5.1 現行座標

| ID | ref | τοῦ x (現行) | name x (現行) | τοῦ y |
|---|---|---|---|---|
| R-1 | LUK 3:25!5-6 | **31** | 1 | 58,726 |
| R-2 | LUK 3:30!7-8 | **31** | 1 | 60,910 |
| R-3 | LUK 3:35!7-8 | **31** | 1 | 63,094 |
| root | LUK 3:23!7,9 | 313 | 283 | 57,840 |

### 5.2 rk-dx 全除去後のオート位置

| ID | τοῦ x (auto) |
|---|---|
| R-1 | 811 |
| R-2 | 1,591 |
| R-3 | 2,371 |

### 5.3 累積オフセットメカニズム (CONFIRMED)

`rk-dx=-780` は **各 NPofNP に個別に付与されている**が、`mods()` 経由で **累積される**。

```
mods(head, [NPofNP_R1], x_parent, y0)
  → NPofNP_R1 placed at: x_parent + IND + dxOf(NPofNP_R1)
                       = x_parent + 30 + (-780)

  Within NPofNP_R1:
    mods(head, [NPofNP_R2], x_R1, y0)
      → NPofNP_R2 placed at: x_R1 + 30 + (-780)
      
  Within NPofNP_R2:
    mods(head, [NPofNP_R3], x_R2, y0)
      → NPofNP_R3 placed at: x_R2 + 30 + (-780)
```

深さに比例してオフセットが積み重なり、すべてのレベルが x≈31 に収束。  
→ auto 位置では R-3 が x=2,371 まで拡大するのに対し、rk-dx=-780 × 3 = -2,340 で x≈31 に抑制。  
→ **意図: 系譜鎖の水平展開を左端に揃え、canvas overflow を防ぐ** — CONFIRMED。

---

## 6. detInline 未対応ケースの全体集計（LOWFAT 全27書）

**調査対象**: `gnt-jp/work/SBLGNT/lowfat/` 全書  
**調査方法**: Python 静的解析 (全 wg[rule=DetNP] と wg[rule=DetCL] を分類)

### 6.1 DetNP (計15,557件)

| 状態 | 件数 | 割合 |
|---|---|---|
| COVERED (detInline 対応) | 14,542 | 93.5% |
| NOT COVERED | **1,015** | 6.5% |

**COVERED 内訳:**

| 条件 | 件数 |
|---|---|
| C1: w head | 9,391 |
| C3: NPofNP (first child w) | 4,526 |
| C2: AdjpNp (all-w children) | 415 |
| C4: NPDetAdj | 210 |

**NOT COVERED 内訳（上位）:**

| head type | 件数 | 例 (Phase B) |
|---|---|---|
| NP-CL | 249 | S-3 (τήン/ἀがπην) |
| AdjpNp_has_wg (子に wg 含む) | 148 | — |
| ofNPNP | 134 | S-5 (τήン/ὑμῶン) |
| NpaNp | 89 | — |
| PpNp2Np | 87 | — |
| NumpNP | 85 | — |
| NpPp | 74 | S-2 (τήン/πίστιν) |
| NPofNP_wg (first child wg) | 41 | S-4 (τοῦ/ἀがτοῦ) |
| Np-Appos | 19 | — |
| その他 | 89 | — |

### 6.2 DetCL (計2,008件) — 全件 detInline 未対応

DetCL の head は節（sentence-level clause）であり、現行 4 条件はすべて `wg[rule=...]` タイプの確認のみ。句構造 rule（NPofNP, AdjpNp, NPDetAdj）しか対象にしていない。

**head rule 上位:**

| head rule | 件数 |
|---|---|
| w(verb) — 単一動詞 | 498 |
| V-O | 363 |
| V-ADV | 308 |
| ADV-V | 115 |
| CLaCL | 98 |
| VC-P | 71 |
| その他多数 | 555 |

### 6.3 影響範囲サマリー

| 対象 | 件数 | 修正の優先度 |
|---|---|---|
| DetCL | 2,008 | 高 (系統的・件数大・Phase B 9件中3件) |
| DetNP → NP-CL head | 249 | 中 (noun+related clause で多い) |
| DetNP → ofNPNP head | 134 | 中 (S-5/R-6 連鎖の根本原因) |
| DetNP → NpPp head | 74 | 低〜中 |
| DetNP → NPofNP_wg_first | 41 | 低〜中 |
| 残り NOT COVERED | 515 | 未分析 |

**確認できていない範囲**: 各 NOT COVERED 件が視覚的にどの程度問題になっているか（yDiff の大きさ）は、個別文脈と rk-dy の有無による。本調査は件数のみ確定。

---

## 7. 修正案の比較

### 案 A: 手動座標で個別調整（現行 detInline 維持）

各 det 語に `rk-y` 属性を付与して head と同一 y に配置。

**影響範囲**: 調整した語のみ  
**回帰リスク**: 低（detInline ロジック不変）  
**既存座標との相互作用**:
- S-5: `rk-dy=602` が NpPp を押し下げているため、τήン を手動で 2682→1950 に引き上げると、将来 rk-dy が変更されたとき τήン の絶対 y が乖離する
- S-9: 同様（S-5 と同一の NpPp[rk-dy=602] が起因）
- S-4: τοῦ.x が -30 と head より左にある（S-4 では τοぅ が左にいる = mods() による right-indent が逆方向）— 手動 rk-y だけでは x の問題は解決しない

**問題**: 1,015 + 2,008 = 3,023 件のうち今回の 9 件のみを修正。根本原因は残る。S-5/S-9 では rk-dy との複合で将来不安定になる可能性。

**推奨スコープ**: S-1〜S-9 のうち、detInline 修正に含まれない小さい yDiff ケース（S-4: 54px, S-8: 84px）の微調整に限定する場合に有効。

---

### 案 B: `detInline` の適用条件を拡張

`phrase()` の条件 C1〜C4 に新条件を追加。

**拡張候補（段階的）:**

**B-1: DetCL 対応**（2,008件）
```javascript
// phrase() 内、C4 の後に追加
if (detInline && ks[hi].tagName==='wg' && A(ks[hi],'class')==='cl'
    && rest.length>0 && rest.every(k=>k.tagName==='w'&&A(k,'class')==='det')) {
  // det を cl の先頭 head と同一 y に inline 配置
  let cx=x, firstDr=null;
  for (const d of rest) { const dr=put(d,cx,y); if(!firstDr)firstDr=dr; cx+=dr.head.w+14; }
  const hr=place(ks[hi],cx,y);
  return {...hr, lead:EW.get(rest[0])||hr.head, usedPre:true}
}
```
対象: S-7, S-8, S-9 (DetCL 全2,008件)

**B-2: NPofNP first child wg 対応**（41件、S-4型）
C3 の条件 `npHead.tagName==='w'` を `npHead.tagName==='wg'` にも拡張：
```javascript
// C3 拡張: first child が wg の場合も detInline
if (...rule==='NPofNP'...) {
  const npHead = npKids[0];
  if (npHead.tagName==='w' && !NONHEAD.has(A(npHead,'class'))) { /* 既存 */ }
  else if (npHead.tagName==='wg') {
    // wg(AdjpNp等)の lead を使って inline 配置
    const hr=place(ks[hi],cx,y);
    // det を hr.lead と同 y に配置
  }
}
```

**B-3: ofNPNP / NpPp / NP-CL 対応**（457件計）  
NpPp: `w(noun) + wg[PrepNp]` → head は先頭 `w(noun)` と決定できる  
NP-CL: head は先頭 `w(noun)` と決定できる  
ofNPNP: head は NpPp または noun（文脈依存）— 慎重な head 選択が必要

**影響範囲**: 段階的適用で B-1: 2,008件, B-2: 41件, B-3: 457件  
**回帰リスク**:
- B-1 (DetCL): 中。`class=cl` の判定で clause 全体が対象となるため、予期しない clause 構造で detInline が発火しないよう guard が必要。特に clause が空や単語 1 件の場合。
- B-2 (NPofNP_wg): 低。既存 C3 の minor 拡張。  
- B-3 (ofNPNP/NpPp/NP-CL): 中〜高。ofNPNP の head 選択は現行ロジックが genitive pronoun を head とするため、detInline 後の見た目が変わる（det が genitive pronoun の前に来る）。RK 的意味論との整合性確認が必要。

**既存座標との相互作用**:  
- detInline が発火した場合、det が inline になり親 phrase の height が減少。上位の mods() / stack() で後続要素の y 位置が変化する可能性。
- 現行 rk-dy/rk-dx は `autoLayout 位置 + offset` だが、autoLayout の基準が変わるため **rk-dy の絶対値の意味が変わる**。特に S-5/R-6 の rk-dy=602 は detInline 修正後に再評価が必要。

---

### 案 C: 対象構造に限定した別ルール

`phrase()` 内に既存 detInline 条件とは別個の DetCL 専用ルールを設ける。

例（DetCL のみ）:
```javascript
// phrase() 内: DetCL の冠詞は clause-head と同一 y に配置（別ルール）
const isDetCL = A(ks[hi].parentNode, 'rule') === 'DetCL';
if (detInline && isDetCL && rest.every(k=>A(k,'class')==='det')) {
  /* B-1 と同様の inline 配置 */
}
```

**影響範囲**: `wg[rule=DetCL]` の直接子に限定  
**回帰リスク**: 低〜中。DetCL の親チェックを行うため誤発火が少ない。ただし phase() が再帰的に呼ばれるため、DetCL 内のさらに内側の phrase() では `parentNode.rule=DetCL` が不成立となり意図通り動く。  
**既存座標との相互作用**: B-1 と同様。DetCL が inline になることで親 phrase の height が変わる可能性。

---

### 案の比較サマリー

| 比較軸 | 案 A | 案 B (段階的) | 案 C |
|---|---|---|---|
| 根本原因の解消 | なし | あり | DetCL のみ部分的 |
| 影響件数 | 今回9件のみ | 最大3,023件 | 2,008件 |
| 回帰リスク | 低 | 中 (B-1,B-3 は要 guard) | 低〜中 |
| rk-dy との相互作用 | 不安定 | 要再評価 | 要再評価 (DetCL のみ) |
| 優先アクション | 微調整に限定 | B-1 (DetCL) を先行 | B-1 相当 |

**推奨**: 案 B-1 (DetCL 条件の追加) を優先実装。DetCL は2,008件と最大の未対応群で、B 判定3件 (S-7/S-8/S-9) の直接原因。実装後に S-5/R-6 の rk-dy=602 の必要性を再評価する。次点: B-2 (NPofNP_wg, 41件, リスク低)。B-3 は ofNPNP の head 選択問題を整理してから別 Task として実装。

---

## 8. Phase D 仕分け

### 8.1 座標調整に進める項目

| ID | 根拠 |
|---|---|
| S-1 (slot11) | vo エッジ CONFIRMED。Phase 2 の SUSPECT は誤検知 CONFIRMED。アクション不要 |
| R-1 (LUK 3:25!5) | 構造 CONFIRMED。rk-dx=-780 は水平 overflow 補正 CONFIRMED |
| R-2 (LUK 3:30!7) | 同上 |
| R-3 (LUK 3:35!7) | 同上 |
| R-4 (COL πατρί) | 構造 CONFIRMED。rk-dy=938 は canvas 混雑回避 CONFIRMED (auto y=62 vs 現行 y=1000) |
| R-6 (COL ἀがπην) | 構造 CONFIRMED。rk-dy=602 は位置調整。**ただし S-5/S-9 の cascade 原因のため detInline 修正後に再評価推奨** |

### 8.2 自動配置規則の修正を先に検討すべき項目

| ID | 問題 | 推奨 |
|---|---|---|
| S-7/S-8/S-9 (DetCL) | detInline 未対応 (系統的)。2,008件に共通 | 案 B-1 (DetCL 条件追加) を先に実装 |
| S-2 (NpPp head, yDiff=176) | detInline 未対応 (74件) | 案 B-3 の NpPp 部分 |
| S-3 (NP-CL head, yDiff=176) | detInline 未対応 (249件) | 案 B-3 の NP-CL 部分 |
| S-4 (NPofNP_wg, yDiff=54) | detInline C3 の wg 先頭子パターン (41件) | 案 B-2 |
| S-5 (ofNPNP head, yDiff=732) | detInline 未対応 + rk-dy=602 複合。root 修正は ofNPNP head 問題を先に解決 | 案 B-3 の ofNPNP 部分（head 選択要整理） |

### 8.3 追加の言語学的判断が必要な項目

| ID | 問題 | 必要な判断 |
|---|---|---|
| S-6 (npofnp6) | NPofNP の phrase() layout head が ἡμῶン (属格代名詞) になっている。意味的 head は AdjpNp/συンドゥ だが、layout engine の head 選択は LOWFATの DOM 順序依存。 | RK 図の「head」として属格代名詞を上位に置くことは構造的に妥当か？ LOWFATのNPofNP rule の意図（head + genitive modifier の順序）を確認。 |
| R-5 (καθώς 節) | LOWFAT が role=o を割り当てているが、καθώς 節は比較副詞節が文法的に自然 | LOWFAT の role=o の根拠を確認。座標調整前に role の正確さを確定する必要はないが、vo エッジの接続先が言語学的に適切かを要確認 |

---

## 9. 未検証の範囲（UNKNOWN）

- **3,023 件の NOT COVERED の yDiff 分布**: 件数は確定したが、各ケースの視覚的問題の深刻度（yDiff 大小）は未測定。rk-dy が付いていない通常ケースでは yDiff は NpPp.h など句の高さに等しく、S-2/S-3 の 176px が典型値と推定されるが確認していない。
- **案 B-1 実装後の rk-dy 再評価**: detInline で DetCL が inline 化された場合、S-9 の ὁ (yDiff=778) がどこまで改善するか。rk-dy=602 (R-6) の影響が S-9 にも波及しているため、DetCL inline 化 + NpPp rk-dy=602 維持の場合の最終座標を確認する必要がある。
- **LUK 系譜の rk-dx 累積と canvas 表示**: x=31 への収束が視覚的に適切かどうかは browser 実行時の画面確認が必要（NOT VERIFIED）。

---

*本報告書は READ-ONLY 監査。既存レポート上書きなし。対象ファイル変更なし。*
