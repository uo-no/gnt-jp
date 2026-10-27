# Task 8 Phase D — 自動配置規則と手動座標の修正方針

**READ-ONLY 設計判断報告書 — HTML/XML/解析コード変更なし / Git操作なし**

生成日: 2026-10-21  
根拠: Phase B報告書 / Phase C報告書 / Phase D Python静的解析（本セッション）  
目的: Phase E（実装）の前提となる設計判断を確定する

---

## 1. 問題の分類と根拠

### 1.1 問題の種別

Phase B/C の監査で確認された問題は、**2つの独立した根本原因**に整理できる。

| 種別 | 説明 |
|------|------|
| **detInlineギャップ** | `phrase()` が det を `mods()` 下方に配置する（headのwg typeが C1〜C4 の対象外） |
| **rk-dy カスケード** | 手動座標 `rk-dy` が隣接する auto 配置要素の y を連動して変化させる |

### 1.2 15件の分類マトリクス（Phase B/C 根拠）

| 件 | 問題種別 | 確認済み根本原因 | Phase D 推奨アクション |
|----|---------|----------------|----------------------|
| S-1 (slot11) | なし（検査誤検知） | vo エッジ正常 CONFIRMED | アクション不要 |
| S-2 (NpPp) | detInlineギャップ | NpPp head 未対応、yDiff=176px | B-3 (NpPp条件追加) |
| S-3 (NP-CL) | detInlineギャップ | NP-CL head 未対応、yDiff=176px | B-3 (NP-CL条件追加) |
| S-4 (NPofNP wg-first) | detInlineギャップ | C3 の wg先頭子ケース未対応、yDiff=54px | B-2 (C3拡張) |
| S-5 (ofNPNP+rk-dy) | detInlineギャップ + rk-dyカスケード | ofNPNP head未対応 + R-6 rk-dy=602複合、yDiff=732px | B-1実装後に再評価 |
| S-6 (layout head) | layout head 意味的乖離 | NPofNP で属格代名詞が先行する場合のhead選択 | DEFER（人間判断） |
| S-7 (DetCL) | detInlineギャップ（系統的） | DetCL head（分詞節）未対応、yDiff=130px | B-1 (DetCL条件追加) |
| S-8 (DetCL) | detInlineギャップ（系統的） | 同上、yDiff=84px | B-1 |
| S-9 (DetCL+cascade) | detInlineギャップ + rk-dyカスケード | DetCL head未対応 + R-6波及、yDiff=778px | B-1 |
| R-1 (LUK NPofNP) | 正常（overflow補正） | rk-dx=-780 が水平overflow防止 CONFIRMED | 変更不要 |
| R-2 (LUK NPofNP) | 正常（overflow補正） | 同上 CONFIRMED | 変更不要 |
| R-3 (LUK NPofNP) | 正常（overflow補正） | 同上 CONFIRMED | 変更不要 |
| R-4 (COL πατρί) | 正常（canvas混雑回避） | rk-dy=938 で auto y=62 から y=1000 へ CONFIRMED | 変更不要 |
| R-5 (καθώς) | 構造判断保留 | role=o の言語学的根拠未確認 | DEFER（座標調整は進める） |
| R-6 (NpPp rk-dy) | 正常 + S-5/S-9カスケード源 | rk-dy=602 が S-5/S-9 の yDiff を増幅 | B-1実装後に rk-dy の必要性を再評価 |

---

## 2. DetNP/DetCL 代表例と影響範囲

### 2.1 DetCL（計2,008件、全件 detInline 未対応）

DetCL = 実質化冠詞 + 分詞節（分詞/動詞句を名詞的に機能させる）。phrase() の head は常に wg[class=cl]。現行 C1〜C4 はすべて句構造 rule（NPofNP, AdjpNp, NPDetAdj）を対象とし、cl class は対象外。

**代表例:**

| ref | 語 | 構造 | head rule | yDiff |
|-----|-----|------|-----------|-------|
| COL 1:5!4 (S-7) | τήν ἀποκειμένην | wg[V-ADV-ADV, cl] | V-ADV-ADV | 130px |
| COL 1:6!1 (S-8) | τοῦ παρόντος | wg[V-ADV, cl] | V-ADV | 84px |
| COL 1:8!1 (S-9) | ὁ δηλώσας | wg[ADV-V-IO-O, cl] | ADV-V-IO-O | 778px（cascade） |
| MAT 1:16!13 | ὁ λεγόμενος χριστός | wg[VC-P] | VC-P | — |
| MAT 1:20!23 | τὸ ἐν αὐτῇ γεννηθέν | wg[ADV-V] | ADV-V | — |

**head rule 分布（全27書）:**

| head rule | 件数 |
|-----------|------|
| w(verb) — 単語1件 | 498 |
| V-O | 363 |
| V-ADV | 308 |
| ADV-V | 115 |
| CLaCL | 98 |
| VC-P | 71 |
| その他 | 555 |

**実際の表示問題確信度: 高（全件）。** RK 図の慣例では実質化冠詞は分詞・動詞句と同一ベースラインに配置される。現行では最小 46px から最大778px（rk-dy複合時）の下方配置が生じる。

---

### 2.2 DetNP NOT COVERED 上位群の代表例

**NP-CL（249件）— S-3 型:**

| ref | 語 | 構造 | phrase() head | 先頭子 |
|-----|-----|------|---------------|--------|
| COL 1:4!9 (S-3) | τήν ἀγάπην ἣν ἔχετε | wg[NP-CL]{w(noun) + wg(cl)} | NP-CL | w[noun] |
| MAT 2:9!9 | ὁ ἀστήρ ὃν εἶδον | wg[NP-CL]{w(noun) + wg(cl)} | NP-CL | w[noun] |
| MAT 7:15!3 | τῶν ψευδοπροφητῶν οἵτινες | wg[NP-CL]{w(noun) + wg(cl)} | NP-CL | w[noun] |

内訳（DetNP 文脈内）:
- **186件**: 先頭直接子 w[noun] → 条件追加で対応可能（C1 に準じた拡張）
- 35件: 先頭直接子 wg[NPofNP] → 複合、別途分析要
- 28件: 先頭直接子 wg その他 → 複合、別途分析要

典型 yDiff: NP-CL 高さ（noun + cl の合計）≈ 176px（S-3 実測値）

---

**NpPp（74件）— S-2 型:**

| ref | 語 | 構造 | 先頭子 |
|-----|-----|------|--------|
| COL 1:4!2 (S-2) | τήν πίστιν ὑμῶν ἐν Χριστῷ | wg[NpPp]{w(noun) + wg(PrepNp)} | w[noun] |
| MAT 2:11!7 | τὸ παιδίον μετὰ Μαρίας | wg[NpPp]{w(noun) + wg(PrepNp)} | w[noun] |

内訳（DetNP 文脈内）:
- **32件**: 先頭直接子 w[noun/adj] → 条件追加で対応可能
- 26件: 先頭直接子 wg[NPofNP] → 複合、別途分析要
- 16件: その他 wg → 複合、別途分析要

典型 yDiff: NpPp 高さ ≈ 176px（S-2 実測値）

---

**ofNPNP（134件）— S-5 型:**

phrase() の head 選択が2パターンに分かれる（後述）:

| パターン | 件数 | phrase() head | det配置の問題 |
|---------|------|--------------|-------------|
| w[pron] が先頭（属格代名詞先行） | 67 | 属格代名詞 | det が属格代名詞の前 → RK 的に不適切 |
| wg が先頭 + w[noun] が次 | 46 | noun（正しい）| det が wg の前、noun と inline → 概ね適切 |
| w[noun] が直接先頭 | 12 | noun | det と noun が inline → 適切 |
| wg のみ | 3 | wg | 複合 |

---

**NPofNP_wg_first（41件）— S-4 型:**

wg[NPofNP] の先頭直接子が wg（AdjpNp 等）で、C3 条件 `npHead.tagName==='w'` が不成立。  
S-4 実測: yDiff=54px、xDiff=−30px。

---

## 3. NOT COVERED 件数と実際の表示問題の区別

NOT COVERED 3,023件は「detInline が発火しない」件数であり、「表示に問題がある」件数ではない。

本アプリは C1〜C4 で 14,542件の DetNP に対して「det を head と同一 y に配置」するスタイルを実装済み。NOT COVERED は **このスタイルの一貫性から外れているケース** である。

### 3.1 確信度別分類

| 区分 | 件数 | 内訳 | 判断根拠 |
|------|------|------|---------|
| **高確度：実際の表示問題** | **2,226件** | DetCL 2,008 + NP-CL(noun-first) 186 + NpPp(noun-first) 32 | S-2/S-3/S-7/S-8の実測値、RK慣例との乖離CONFIRMED |
| **中確度：改善候補** | **216件** | NumpNP 85 + NpaNp 89 + NP-CL(wg-first) 63 - 重複調整 | det と semantic head の位置関係が想定と異なる。ただし head 選択が複雑 |
| **ofNPNP 注意群** | **67件** | pron-head パターン | detInline 追加で det が属格代名詞の前に来る → 現行より悪化の可能性 |
| **要分析・低優先** | **514件** | PpNp2Np 87 + AdjpNp_has_wg 148 + NPofNP_wg_first 41 + Np-Appos 19 + 残り | 構造が複雑、または問題の深刻度が不明 |

> **結論: 3,023件を「表示不具合3,023件」と解釈してはならない。**  
> 高確度の表示問題は 2,226件。さらに 216件が中確度の改善候補。  
> ofNPNP(pron-head) 67件に detInline を安易に適用すると悪化する。

---

## 4. 修正案 A/B/C の比較

### 案 A: 手動 XML 座標で個別修正（detInline 変更なし）

各 det 語に `rk-y` 属性を付与して head と同一 y に強制配置。

| 比較軸 | 評価 |
|--------|------|
| 期待改善 | B判定9件の det を head と同一 y に配置可能 |
| 根本原因解消 | なし（detInline ギャップ残存） |
| 既存座標との相互作用 | S-5/S-9: rk-dy=602 が残存するため、将来 rk-dy を変更した際に手動 rk-y との乖離が生じる（不安定） |
| S-4 の xDiff=-30 | rk-y のみでは x を修正できない |
| 3,023件の残余問題 | 解消なし |
| 推奨用途 | B 案で解決できない細部調整（S-4 の xDiff 等）に限定 |

---

### 案 B: detInline 条件の段階的拡張（**推奨**）

`phrase()` の C1〜C4 の後に条件を追加。

---

#### B-1: DetCL 対応（2,008件）

**対象:** `wg[class=cl]` を head に持つ DetNP。

**条件（phrase() 内、C4 の後）:**
```javascript
if (detInline
    && ks[hi].tagName === 'wg'
    && A(ks[hi], 'class') === 'cl'
    && rest.length > 0
    && rest.every(k => k.tagName === 'w' && A(k, 'class') === 'det')) {
  // inline 配置（C1 と同一パターン）
}
```

| 比較軸 | 評価 |
|--------|------|
| 期待改善 | S-7/S-8/S-9 解消。全27書 DetCL 2,008件 inline 化 |
| 既存座標との影響 | S-9: ὁ が inline 化 → yDiff ≈ 0。S-5: τήン は ofNPNP 未修正のため変化なし（下記参照） |
| R-6 rk-dy=602 との関係 | B-1 実装後、clause height 計算への rk-dy 影響残存 → S-5/R-6 cascade の τήン は別途対応 |
| Regression risk | **中**。guard 確認が必要（空 cl、単一語 cl、nested cl 内での誤発火防止） |
| 必要なテスト | empty cl guard / DetCL 2件以上 det がある場合の挙動（rest.every で保護済みのはず） |

---

#### B-2: C3 拡張（NPofNP wg-first, 41件）— S-4 型

**現行 C3:** `npKids[0].tagName==='w'` を要求。  
**拡張:** `npKids[0].tagName==='wg'` の場合も inline 化。

```javascript
// 現行 C3 の wg-first 拡張
else if (npHead.tagName === 'wg') {
  // wg の lead position (内部 phrase() head の x,y) に det を揃える
}
```

| 比較軸 | 評価 |
|--------|------|
| 期待改善 | S-4 (yDiff=54, xDiff=-30) 改善 / 41件 inline 化 |
| Regression risk | **低**。C3 の minor 拡張。wg head の lead x 取得ロジックの確認が必要 |
| B-1 との依存関係 | なし。B-1 と同時実装可能 |

---

#### B-3: NP-CL / NpPp（noun-first）対応（NP-CL 186件 + NpPp 32件 = 218件）— S-2/S-3 型

**条件（NP-CL）:**
```javascript
if (detInline
    && ks[hi].tagName === 'wg'
    && A(ks[hi], 'rule') === 'NP-CL'
    && rest.every(k => k.tagName === 'w' && A(k, 'class') === 'det')) {
  const npKids = kids(ks[hi]);
  const npHead = npKids[0];
  if (npHead && npHead.tagName === 'w' && !NONHEAD.has(A(npHead, 'class'))) {
    // inline 配置
  }
}
```

**条件（NpPp）:** 同様（rule==='NpPp'）

| 比較軸 | 評価 |
|--------|------|
| 期待改善 | S-2 (yDiff=176), S-3 (yDiff=176) 解消 / 218件 inline 化 |
| Regression risk | **中**。NP-CL / NpPp は多書に分布（全27書で NP-CL 249件 + NpPp 74件）。全書での Baseline 比較要 |
| B-1/B-2 との依存関係 | なし。ただし Regression 安全確認のため B-1/B-2 の後に実装推奨 |

---

#### ofNPNP は B-3 に含めない

理由: 67件（50%）が phrase() head = w[pron]（属格代名詞先行）。  
この状態で detInline を追加すると、det が属格代名詞の前に配置される（`τούς ἑαυτῶν νεκρούς` では τούς が ἑαυτῶν の前に来る）。  
RK 図では τούς は νεκρούς（対格名詞）の修飾語であり、ἑαυτῶン（属格代名詞）の修飾語ではない。  
この問題は S-6 の「NPofNP layout head 選択」と同根（後述）であり、head 選択ロジックの再設計なしには安全に対応できない。

---

### 案 C: DetCL 専用ルール（parentNode チェック方式）

B-1 の変形。`A(ks[hi].parentNode,'rule')==='DetCL'` でスコープを絞る。

| B-1 との比較 | 評価 |
|-------------|------|
| スコープ | parentNode チェックのため DetCL の直接子に限定（B-1 の `class=cl` より若干狭い） |
| 実装差異 | 微小。B-1 の `class=cl` は DetCL 以外に cl class を持つ wg が head になるケースも対象にする。ただし DetNP の直接子として `class=cl` を持つ wg は DetCL 由来がほとんど |
| 推奨 | B-1 の `class=cl` で実装し、guard 条件（empty cl / nested cl）を確認すれば C と同等の安全性が得られる |

---

### 案の比較サマリー

| 比較軸 | 案 A | 案 B（B-1+B-2 優先） | 案 C |
|--------|------|---------------------|------|
| 根本原因解消 | なし | DetCL/NP-CL/NpPp 系統的に解消 | DetCL のみ部分的 |
| 改善件数 | 9件のみ | 最大 2,267件（B-1+B-2+B-3） | 2,008件 |
| Regression risk | 低 | B-1/B-2: 中 / B-3: 中 | B-1 相当 |
| rk-dy との相互作用 | 不安定（手動 rk-y と rk-dy の競合） | B-1 後に cascade 測定 → rk-dy 再評価可能 | B-1 相当 |
| 推奨 | 微調整のみ | **B-1 + B-2 を先行。B-3 を次に** | B-1 の変形として参考 |

---

## 5. R-6 / S-5 / S-9 の連鎖影響分析

### 5.1 連鎖の構造（Phase C CONFIRMED）

```
NpPp[rk-dy=602, rk-dx=-802] (COL 1:8!7-9: ἀγάπην ἐν πνεύματι)
  ↓ ofNPNP の mods() list に配置
  → ofNPNP.h ≈ ROW(38) + max(nom+602, cy) + NpPp.h(ROW+GAPV+ROW=84)
             ≈ 38 + 602 + 84 = 724px（rk-dyなし時は ≈ 122px）

  ↓ DetNP phrase([τήン, ofNPNP]) → mods(ofNPNP_head, [τήン], x, y+724)
  → τήン.y = y_base + 724 ≈ yDiff 732px（実測）

  ↓ ADV-V-IO-O clause.h が拡大（NpPp の role=o スロット分）
  → DetCL phrase([ὁ, ADV-V-IO-O]) → mods(cl_head, [ὁ], x, y+cl.h_expanded)
  → ὁ.y = y_base + cl.h ≈ yDiff 778px（実測）
```

### 5.2 B-1 実装後の状態予測

| 件 | B-1 前 | B-1 後（DetCL inline 化） |
|----|--------|--------------------------|
| S-9 (ὁ yDiff=778) | 778px | **≈ 0px**（ὁ が ADV-V-IO-O 開始 y に移動） |
| S-5 (τήン yDiff=732) | 732px | **変化なし**（ofNPNP は B-1 の対象外） |

**B-1 単独では S-5 は解消されない。** S-5 の解消には ofNPNP 対応（S-6 人間判断後）が前提。

### 5.3 R-6 rk-dy=602 の再評価方針

R-6 (rk-dy=602) の役割:
- **現行**: ἀγάπην(y=1950+38) を 602px 下に移動 → NpPp の auto y ≈ 1988 → rk-dy 後 y = 2590
- **目的（Phase B 推定）**: 102語の長文センテンス (COL 1:3〜1:8) の canvas 混雑回避
- **Phase C 実測**: rk-dy 除去後 ἀが y=1988（ὑμῶン y=1950 の38px下）。38px は 1ROW 分のみの間隔

実測上は rk-dy=602 がなくても ἀが(NpPp)は ὑμῶン のすぐ下（38px）に配置される。  
rk-dy=602 の 602px という値の根拠は現時点では UNKNOWN。

**B-1 + B-3(ofNPNP 対応後) の実装後、τήン が inline 化されれば：**
- S-5 の τήン は ofNPNP 開始 y に移動 → yDiff ≈ 0
- NpPp は rk-dy=602 で引き続き下方に配置されても τήン への影響なし
- rk-dy=602 の必要性は「NpPp の位置そのもの」の問題に縮小される

> **Phase D 判断: rk-dy=602 の変更は B-1 + ofNPNP 修正後の実測確認後に判断する。現時点では変更しない。**

---

## 6. R-1〜R-4 座標調整方針

### R-1, R-2, R-3 (LUK 系譜 rk-dx=-780 × 3段）

| 確認項目 | 結果 |
|---------|------|
| 目的 | NPofNP の深ネスト（最大3段）による水平 canvas overflow を防止 |
| 効果（Phase C 実測） | auto x: R-1=811, R-2=1,591, R-3=2,371 → rk-dx=-780×累積で全て x≈31 に収束 |
| 構造的正確さ | CONFIRMED（属格定冠詞 + 属格固有名詞の系譜鎖） |

**判断: 変更不要。** 現行座標は水平 overflow を防ぐ有効な補正。変更すると x=2,371 の overflow が復活する。

---

### R-4 (COL πατρί rk-dy=938)

| 確認項目 | 結果 |
|---------|------|
| 目的 | Np-Appos で θεῷ(y=24) と πατρί の重なりを回避 |
| 効果（Phase C 実測） | auto y=62 → rk-dy=938 で y=1000。38px の間隔 → 938px の垂直スペース |
| 構造的正確さ | CONFIRMED（θεῷ と πατρί の同格関係、NPofNP{πατρί + …} として正しい） |

**判断: 変更不要。** 102語の長文では Np-Appos の auto 位置 (y=62) では直後の要素と重なる可能性が高い。rk-dy=938 は可視性のための有効な調整。

---

## 7. 保留項目と実装前に必要な判断

### 7.1 S-6: NPofNP での layout head 選択（HUMAN REVIEW）

**現象:**  
NPofNP{w[pron(gen)], wg[AdjpNp]} において、phrase() の head = w[pron]（属格代名詞）。  
RK 的には AdjpNp/noun が意味的 head のはず。

**ofNPNP 67件（pron-head パターン）との関係:**  
この問題は ofNPNP で属格代名詞が先行する 67件すべてに共通する。  
detInline を適用すると τούς が ἑαυτῶン（属格代名詞）の前に来る → RK 意味論から外れる。

**必要な判断:**
1. NPofNP で先行 genitive pronoun は「修飾語」として扱い、後続 noun/wg を layout head とすべきか？
2. それとも LOWFAT の DOM 順序（pronoun-first = genitive modifier-first）が RK 配置に最適か？
3. この変更は FROZEN 層（phrase() ロジック）の変更に相当するため、影響範囲（全27書 NPofNP）の確認が必要

**Phase D 判断: DEFER — 別 Task として登録。B-1/B-2/B-3 の実装後に着手。**

---

### 7.2 R-5: καθώς 節の role=o（DEFERRED）

**現象:**  
LOWFAT が καθώς 節に `role=o` を割り当てている。比較副詞節（role=adv）の可能性もある。

**Phase B 判断 (B 判定):** 座標調整（rk-dx=-1362, rk-dy=1176）は canvas 混雑回避として妥当。role の正確さは座標調整の可否に影響しない。

**Phase D 判断: DEFERRED — LOWFAT 仕様の判断は現 Scope 外。座標は変更不要。**

---

## 8. 最終推奨案とその理由

**推奨: 段階的 B 案（B-1 優先 → B-2 → B-3）+ 事後 A 微調整**

### 推奨する理由

1. **DetCL 2,008件は系統的な表示問題であり、個別修正では対処できない。**  
   全27書にわたる 2,008件を Approach A で修正するには 2,008件の XML 編集が必要。  
   B-1 は条件を1つ追加するだけで全件を解消する。

2. **B-1/B-2 の条件は structurally narrow で regression リスクが限定的。**  
   B-1: `class=cl` + `every(det)` guard で誤発火を防止。  
   B-2: C3 の wg-first 拡張で変更範囲は 41件に限定。

3. **全体件数が多いという理由だけで B 案を避ける必要はない。**  
   B-1 の 2,008件は「同一の構造的ギャップを持つ同質のケース群」。  
   条件の正確さが保証されれば、件数の多さは問題ではない。

4. **B-1 実装後に cascade の実測ができる。**  
   S-9 が解消されることで、rk-dy=602 の影響を S-5 のみで測定可能になり、  
   次ステップ（ofNPNP 対応と rk-dy=602 再評価）の判断根拠が得られる。

---

## 9. 推奨する実装順序と回帰テスト

### フェーズ分け（Phase E 内）

| ステップ | 内容 | 対象件数 |
|---------|------|---------|
| E-1 | B-1: DetCL 条件追加 + B-2: C3 wg-first 拡張 | 2,008 + 41 = 2,049件 |
| E-1 後 | COL/MAT/LUK の Baseline 比較、S-7/S-8/S-9 解消確認 | — |
| E-2 | B-3: NP-CL(noun-first) + NpPp(noun-first) 条件追加 | 186 + 32 = 218件 |
| E-2 後 | S-2/S-3 解消確認、全書 Baseline 比較 | — |
| E-3（別 Task） | S-5 の τήン: S-6 human review + ofNPNP head 選択再設計 | 134件（一部） |
| E-4（別 Task） | R-6 rk-dy=602: E-3 実装後の実測に基づき判断 | 1件 |

---

### E-1 で必要な実装 guard 確認

| リスク | 確認すべき条件 |
|--------|-------------|
| B-1 空 cl | `ks[hi]` が `class=cl` でも子要素が空または単一語の場合 — `place()` から `{head:null}` が返る可能性 |
| B-1 nested DetCL | DetCL の内部にさらに DetCL がある場合 — `phrase()` は再帰的に呼ばれるが、内側は DetNP の直接子の phrase() では `parentNode` チェックを持たない |
| B-2 lead取得 | C3拡張: wg head の `lead` または先頭位置の取得方法（`hr.lead || hr.head` で対応可能か確認） |

---

### 回帰テスト要件

**E-1 実装後:**

| テスト | 期待値 |
|--------|--------|
| S-7 (COL 1:5!4 τήン) | yDiff ≈ 0px（DetCL inline 化） |
| S-8 (COL 1:6!1 τοῦ) | yDiff ≈ 0px（DetCL inline 化） |
| S-9 (COL 1:8!1 ὁ) | yDiff ≈ 0px（DetCL inline 化） |
| S-4 (COL 1:7!5 τοῦ) | yDiff ≈ 0px（C3拡張） |
| S-5 (COL 1:8!5 τήン) | **変化なし** (≈ 732px のまま。B-3 ofNPNP 対応まで残存) |
| COL 全 verse（COVERED 件） | Baseline 差分なし |
| MAT DetCL サンプル（全27書中） | 各 DetCL inline 化、周辺 verse への cascade 波及なし |

**E-2 実装後:**

| テスト | 期待値 |
|--------|--------|
| S-2 (COL 1:4!2 τήン) | yDiff ≈ 0px（NpPp inline 化） |
| S-3 (COL 1:4!9 τήン) | yDiff ≈ 0px（NP-CL inline 化） |
| NP-CL/NpPp 多書サンプル | inline 化、周辺 yDiff 変化の調査 |

**全ステップ共通:**
- COVERED 14,542件（C1〜C4）について、新条件追加後も Baseline 変化がないことを確認
- 変化がある場合、その原因を「新条件の誤発火」か「新条件による意図的な高さ変化の波及」かを区別する

---

## 10. 設計判断サマリー

| 判断事項 | 決定 |
|---------|------|
| DetCL (2,008件) | B-1 で対応（条件: class=cl + every(det)） |
| NPofNP_wg_first (41件) | B-2 で対応（C3 の wg-first 拡張） |
| NP-CL noun-first (186件) | B-3 で対応（B-1/B-2 後） |
| NpPp noun-first (32件) | B-3 で対応（B-1/B-2 後） |
| ofNPNP (134件) | DEFER — S-6 human review 後に head 選択再設計が先決 |
| R-1/R-2/R-3 (LUK rk-dx) | 変更不要（overflow補正として有効 CONFIRMED） |
| R-4 (COL rk-dy=938) | 変更不要（可視性調整として有効 CONFIRMED） |
| R-5 (role=o) | DEFERRED（現 Scope 外、座標変更なし） |
| R-6 (rk-dy=602) | B-1 + ofNPNP 修正後の実測結果で判断（現時点では変更しない） |
| S-6 (layout head) | HUMAN REVIEW — NPofNP での属格代名詞先行時の head 選択方針を確認 |
| ofNPNP pron-head 67件への detInline | 適用しない（det が属格代名詞の前に来る → RK 意味論と不整合） |

---

*本報告書は READ-ONLY 設計判断。既存レポート上書きなし。対象ファイル変更なし。実装は Phase E で別途実施。*
