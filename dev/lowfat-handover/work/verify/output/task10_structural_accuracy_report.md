# Task 10 監査報告書: LOWFAT→RK 構造正確性監査

**作業日:** 2026-10-21  
**監査種別:** READ ONLY 静的・実行時監査  
**対象範囲:** LOWFAT構造とRK図配置の対応関係  
**変更件数:** 0（監査のみ）

---

## 0. 検証対象とSHA

| ファイル | SHA | 語数 | 範囲 |
|---|---|---|---|
| `tests/task7_xml/col_final.xml` | `549efaa4` | 102語 | COL 1:3–8 |
| `tests/task7_xml/luk_after_fold.xml` | `4720ebe7` | 165語 | LUK 3:23–38 |
| `app/rk-diagram-m3.html` | `5381255b` | — | B-1実装済み（Task 9A完了後） |

**検証スクリプト:** `scratchpad/task10_audit.cjs`（Puppeteer実行）  
**取得スクリーンショット:** 16件（`scratchpad/task10_*.png`）

---

## 1. LOWFAT関係の種類と数

### 1.1 LOWFATで使用される関係属性

| 属性 | 値 | RK配置上の意味 |
|---|---|---|
| `role` | s / v / vc / o / o2 / p | SLOT（水平配置。sv/vo/vpエッジ生成） |
| `role` | adv / io | 非SLOT（動詞下方にmodエッジ） |
| `rule` | DetNP / NPofNP / PrepNp / DetCL / NP-CL / NPDetAdj / ofNPNP / Np-Appos / ... | 句構造の種類 → phrase()の分岐先 |
| `class` | cl / np / pp / conj | place()の振り分け先 |
| `junction` | — | stack()での分岐フラグ |
| `rk-dx` / `rk-dy` | 整数 | 手動座標オフセット |

### 1.2 計測されたエッジ数

| ファイル | sv | vp | vo | mod | cont | dash | 合計 |
|---|---|---|---|---|---|---|---|
| COL 1:3–8 | 1 | 1 | 7 | 59 | 14 | 4 | **86** |
| LUK 3:23–38 | 1 | 1 | 0 | 160 | 0 | 1 | **163** |

LUKはNPofNP系譜（全modエッジ）でPrepNpなし（cont=0）。

---

## 2. RKマッピング方式の確認（CONFIRMED）

### 2.1 SLOT水平配置

`clause(ks, x, y)` 内の処理：  
`SLOT = {s:1, v:2, vc:2, o:3, o2:3, p:4}`  
→ SLOT値昇順に左から配置。SLOT値が同値のもの（例: o/o2）はDOM順。  
→ 隣接SLOTペアに `sv`（s→v）、`vo`（v→o, o→o2）、`vp`（→p）エッジを生成。

### 2.2 修飾語下方配置

`mods(head, list, x, y0)` 内の処理：  
→ 非SLOTの children（role=adv/io 等）は頭語の下方 `y0+ROW` に垂直配置。  
→ `mod` エッジ：`a=head → b=modの lead`。

### 2.3 前置詞句

`phrase()` 内で PrepNp 検出時：  
→ prep word を左に配置、非prepを `prep.w+14` 右に配置。  
→ `cont` エッジ：`a=prep → b=NP.lead`。

### 2.4 節スタック

`stack(ks, x, y)` 内の処理：  
→ 接続詞 w を検出してconj配置、次の wg を `y+dyOf(wg)` 、`x+conj.w+40+dxOf(wg)` に配置。  
→ `dash` エッジ：`a=conj → b=clause.head`。

---

## 3. 比較結果サマリー

### 3.1 SLOT水平整合

| ファイル | OK件数 | BAD件数 | BAD詳細 |
|---|---|---|---|
| COL 1:3–8 | 8 | **1** | vo: θεῷ(y=24) → καθώς(y=1200)、yDiff=1176 |
| LUK 3:23–38 | 2 | 0 | — |

### 3.2 modエッジ方向（全件、頭語下方期待）

| ファイル | 合計 | CORRECT | FAIL |
|---|---|---|---|
| COL 1:3–8 | 59 | 59 | 0 |
| LUK 3:23–38 | 160 | 160 | 0 |

### 3.3 contエッジ方向（NP右期待）

| ファイル | 合計 | CORRECT | FAIL |
|---|---|---|---|
| COL 1:3–8 | 14 | 14 | 0 |
| LUK 3:23–38 | 0 | — | — |

### 3.4 dashエッジ（接続詞左期待）

| ファイル | 合計 | 接続詞左 | 接続詞右 | 備考 |
|---|---|---|---|---|
| COL 1:3–8 | 4 | 3 | **1** | καθώς x≈1249、ἐστίν x≈0（xDiff=-1249）|
| LUK 3:23–38 | 1 | 1 | 0 | — |

### 3.5 DetCL inline（B-1実装確認）

| ケース | 参照 | yDiff | 判定 |
|---|---|---|---|
| S-7 τήν/ἀποκειμένην | COL 1:5!4–5 | 0 | PASS ✓ |
| S-8 τοῦ/παρόντος | COL 1:6!1–2 | 0 | PASS ✓ |
| S-9 ὁ/δηλώσας | COL 1:8!1, 1:8!3 | 0 | PASS ✓ |

### 3.6 head選択（HEAD=NONHEAD疑い）

COL: 35件の疑い検出、LUK: 1件の疑い検出。

**全件 false positive**（実エラーなし）。  
理由: detInline条件下で冠詞と名詞が同一 y に配置されるため、min-y判定がどちらもhead候補として検出。実際のhead選択は phrase() 内で正しく名詞（noun/cl）が選ばれている。

---

## 4. ミスマッチ分類（カテゴリA–F）

### カテゴリA: LOWFAT関係がRK図に未反映

**件数: 0**

全LOWFAT関係（role/rule/class/junction）に対応するエッジが生成されており、構造の欠落は確認されなかった。

---

### カテゴリB: 接続終点が誤解を招く配置

**件数: 3**

#### B-1: detInline後のcont edge終点が冠詞（article）に向かう

**発生箇所:** COL 1:3–8の PrepNp 14件のうち、detInline展開後のものすべて  
**構造:** PrepNp{διά, NP-CL{τήν ἐλπίδα, ...}}

detInline C1/C2/C3/C5条件適用後、NP先頭に冠詞（τήν）がinline配置される。  
PrepNpのcontエッジ終点は `r.lead = 冠詞 τήν` になる。

```
διά ─── τήν ἐλπίδα
(cont)  ↑
        終点が冠詞
```

伝統的RKでは prep→noun（ἐλπίδα）に線が向かう。現在の実装では prep→article になる。  
**影響:** 軽微（冠詞と名詞は同一行なので読者は一体として認識しやすい）。

EVIDENCE: `CONFIRMED` (edges配列、14件cont検証)

---

#### B-2: NP-CL relative clauseのmod edge終点が関係代名詞でなく節動詞

**発生箇所:** COL 1:4!9-10（ἀγάπην → ἔχετε）  
**構造:** NP-CL{ἀγάπην, wg[O-V-ADV]{ἣν, ἔχετε, PrepNp}}

clause()内でSLOT順ソート: v(ἔχετε, slot2) < o(ἣν, slot3)。  
→ 節の先頭（lead）= ἔχετε（動詞）。  
→ mods()のエッジ: `a=ἀγάπην → b=ἔχετε, kind=mod`。

```
ἀγάπην
  └──(mod)── ἔχετε | ἣν
```

伝統RKでは関係代名詞 ἣν（o役割、目的語）が先行詞 ἀγάπην と破線で接続される。  
現実装では antecedent → verb という非標準接続になる。  
**影響:** 中程度（節の構造的始点が誤解される可能性）。

EVIDENCE: `CONFIRMED` (edges配列, edge kind=mod, aRef=COL1:4!9, bRef=COL1:4!10→ἔχετε)

---

#### B-3: ofNPNP構造で所有代名詞がvisual headに見える

**発生箇所:** COL 1:8!5-9（ὑμῶν/ἀγάπην, S-5ケース）  
**構造:** ofNPNP{ὑμῶν, NpPp{ἀγάπην, PrepNp{ἐν, πνεύματι}}}

phrase(ofNPNP)内: hi=0（ὑμῶν, pron）。NpPp が rest に。  
→ head=ὑμῶν.head, NpPp は mods() で下方配置。  
→ rk-dy=602 により NpPp（ἀγάπην基準）が 602px 下に手動オフセット。

実測: ὑμῶν y=1950、ἀγάπην y=2590、yDiff=640px。

```
ὑμῶν           ← visual head（所有代名詞）
  │
  ├──(mod 602px下)── ἀγάπην ── ἐν πνεύματι
```

文法的には ἀγάπην が主名詞（動詞の目的語）であり、ὑμῶν はその修飾語。  
RK図ではこの関係が逆転して見える。  
**影響:** 高（主名詞の誤認、S-5として既に記録済み）。

EVIDENCE: `CONFIRMED` (Puppeteer座標測定)

---

### カテゴリC: SLOTの水平整合エラー

**件数: 1**

#### C-1: main clauseの2つのrole=oを結ぶvoエッジのyDiff=1176

**発生箇所:** COL main clause（COL 1:3 Εὐχαριστοῦμεν）  
**構造:** ClCl{v:Εὐχαριστοῦμεν, o:Np-Appos{τῷ θεῷ,πατρί,...}, adv:[複数], o:sub-CL{καθώς,ClCl}}

clause()内のSLOT処理: o=Np-Appos(slot3) と o=sub-CL(slot3) が同一SLOTとしてDOM順配置。  
→ 接続エッジ: a=Np-Appos.tail（θεῷ, y=24）→ b=sub-CL.lead（καθώς, y=1200）、kind=vo。

実測: yDiff=1176。sub-CLのrk-dy=1176により節が1176px下方に配置されるためこのyDiffが生じる。

```
Εὐχαριστοῦμεν ─── τῷ θεῷ ...         ← y=24
                         │
                    (vo: 1176px下)
                         │
                      καθώς ...         ← y=1200
```

構造的には正しい（どちらも同一動詞の目的語）が、連続したvo edgeが1176px縦方向に伸びる。  
**影響:** 高（目的語間の接続が誤読される可能性）。

EVIDENCE: `CONFIRMED` (edges配列 slot_alignment チェック)

---

### カテゴリD: 手動座標による表示副作用

**件数: 2**

#### D-1: sub-CL内のdash edgeで接続詞が節の右側に表示

**発生箇所:** COL 1:6!5（καθώς）← sub-CL接続詞  
**手動座標:** sub-CL内のClCl wgに `rk-dx=-1362, rk-dy=1176`

stack()の処理: conj（καθώς）を先に配置 → 次のwg（ClCl）を `x+conj.w+40+dxOf(ClCl)` に配置。  
dxOf(ClCl) = -1362 により、ClClの開始x = x + καθώς.w + 40 - 1362 ≈ x - 1262。  
→ ClClの節内容が καθώς より1249px左側に配置される。

実測: καθώς x≈1249、節頭語 ἐστίν x≈0、xDiff=-1249。  
dashエッジが右の接続詞から左の節へ向かう（通常と逆）。

```
ἐστίν ... (節内容)    ←1249px←    καθώς
     ╔═══════════════════════════════╝
     (dash edge: 右から左)
```

伝統RKでは接続詞が節の左側（節の前）に位置する。  
**影響:** 中程度（接続詞が「どこの節を導くか」の視覚的関係が不明瞭）。

EVIDENCE: `CONFIRMED` (edges配列 dash direction チェック)

---

#### D-2: rk-dy=602によるofNPNP内縦方向大幅分離

**発生箇所:** COL 1:8!5-9（S-5ケース、カテゴリBとの重複）  
**手動座標:** NpPp wgに `rk-dy=602, rk-dx=-802`

rk-dy=602 がmod配置の縦方向オフセットに加算される。  
通常の1段=38pxのところ、602+38=640px下方にNpPp（ἀγάπην基準）が配置される。

実測: yDiff=640px（ὑμῶν→ἀγάπην）。

**影響:** 高（カテゴリB-3と合わせて主名詞が大幅に遠ざかる）。

EVIDENCE: `CONFIRMED` (Puppeteer座標測定, rk-dy=602 XML確認)

---

### カテゴリE: head選択の誤り

**件数: 0（実エラー）**

スクリプト検出: COL 35件、LUK 1件（全件 false positive）。

detInline条件（C1–C5）適用後、冠詞と名詞が同一y上に配置される。  
スクリプトの「min-y=headと仮定」アルゴリズムが同y上の全wordsをheadと誤判定。  
実際の phrase() 内head選択は名詞/cl wg を正しく選んでいる。

EVIDENCE: `CONFIRMED` (ソースコード確認: NONHEAD={det,prep,conj}フィルタ, hi選択ロジック)

---

### カテゴリF: その他

**件数: 0**

---

## 5. 代表例の視覚確認

| 構造 | スクリーンショット | 確認内容 | 判定 |
|---|---|---|---|
| LUK 3:23 main clause | `task10_luk_main_clause.png` | αὐτός\|ἦν（sv水平）、ἀρχόμενος下方、Ἰησοῦς下方 | OBSERVED ✓ |
| LUK rk-dx=-780 系譜 | `task10_luk_rk_dx_naum.png` | Μελχί/Ἰανναί/Ἰωσήτ各名前+τοῦ上下配置 | OBSERVED ✓ |
| COL V-O-ADV + DetCL S-7 | `task10_col_DetCL_S7.png` | ἀκούσαντες、διά τήν ελπίδα inline | OBSERVED ✓ |
| COL NPofNP chain | `task10_col_NPofNP_chain.png` | ἣν/ἔχετε/PrepNp 縦列、διά/τήν/ἐλπίδα構造 | OBSERVED ✓ |
| COL S-VC-P域 | `task10_col_SVC_P.png` | ἐστὶν/καρποφορούμενον/αὐξανόμενον（COL 1:6節） | OBSERVED (COL1:6節, viewport) |
| COL S-9 DetCL inline | `task10_col_DetCL_S9.png` | **NOT CAPTURED** — viewport外（αὐξανόμενον末尾のみ） | NOT VERIFIED |
| COL ofNPNP S-5 | `task10_col_ofNPNP_S5.png` | **NOT CAPTURED** — blank（対象y=1950-2590, viewport外） | NOT VERIFIED |
| COL sub-CL (καθώς) | `task10_col_subCL_R5.png` | **NOT CAPTURED** — blank（対象y=1200領域, viewport外） | NOT VERIFIED |

S-9/ofNPNP/sub-CL各ケースの視覚確認は未取得。数値測定（CONFIRMED）で補完。

---

## 6. 手動座標（rk-dx/rk-dy）の効果確認

### COL 1:3–8

| 参照 | 属性 | 効果 | 評価 |
|---|---|---|---|
| COL 1:3!4 πατρί の親wg | rk-dx=-1009, rk-dy=938 | NPofNP group全体を左下に折り畳み | 構造維持 ✓ |
| COL 1:6!3 inner clause | rk-dx=-1362, rk-dy=1176 | sub-CL節を左下に大幅折り畳み | 構造維持、dash direction副作用あり (D-1) |
| COL 1:8!5 NpPp | rk-dx=-802, rk-dy=602 | ofNPNP内NpPpを左下に大幅移動 | 構造維持、大幅縦分離あり (D-2/B-3) |

### LUK 3:23–38

| 参照 | 属性 | 効果 | 評価 |
|---|---|---|---|
| LUK 3:25!5, 3:30!7, 3:35!7 | rk-dx=-780 | NPofNP系譜グループを左に折り畳み | 構造維持 ✓ |
| τοῦ位置 (折り畳み後) | (rk-dx効果) | 固有名詞より38px下方に配置（hoist機構） | CORRECT ✓ |

hoist機構: `A(ks[hi].parentNode, 'rule')==='NPofNP' && A(ks[hi], 'rule')==='Np-Appos' && hgt(ks[hi])>=GEN_TH` 条件でτοῦをNp-Appos内に渡し、固有名詞の修飾語として下方配置。

EVIDENCE: `CONFIRMED` (LUK τοῦ y=1032, Ναούμ y=994, yDiff=38)

---

## 7. 未確認事項

| 項目 | 理由 | 分類 |
|---|---|---|
| S-9 DetCL inline の視覚表示 | viewport範囲外 | NOT VERIFIED |
| ofNPNP (S-5) の視覚表示 | viewport範囲外 | NOT VERIFIED |
| sub-CL (D-1 dash edge) の視覚表示 | viewport範囲外 | NOT VERIFIED |
| COL以外のDetCL構造の一般性 | col_final.xml のみ検証 | NOT VERIFIED |
| 1CO 等の他書テキストへの適用性 | テスト対象外 | NOT VERIFIED |
| PrepNp cont edge終点の全件確認 | a→b参照の詳細は14件中代表のみ | NOT VERIFIED (INFERRED 全件) |

---

## 8. 優先修正リスト

### P1 — HIGH（構造的誤読リスク）

**C-1: main clauseの2つのrole=oを結ぶvoエッジ yDiff=1176**

- 参照: COL main clause (θεῷ→καθώς)
- 現象: 同一動詞の直接目的語同士を接続するvoエッジが1176px縦断
- 根本原因: rk-dy=1176を持つsub-CLがSLOT構造内でrole=oとして処理され、通常のvo接続エッジが縦長になる
- 修正候補: rk-dy付きsub-CLをSLOT扱いせずextra（mods配下）扱いにする、または2o間のvo edge生成をスキップ
- 変更分類: `BUG / UX`

---

### P2 — MEDIUM（表示方向の違和感）

**D-1: sub-CL接続詞(καθώς)が管轄節の右側に表示**

- 参照: COL 1:6!5 καθώς, rk-dx=-1362
- 現象: dash edgeが右から左（接続詞→節内容）に逆向きに見える
- 根本原因: rk-dx=-1362で節内容が接続詞より1249px左に折り畳まれる
- 修正候補: stack()内でconj配置位置をdxOf(next_clause)に応じて調整
- 変更分類: `UX`

---

### P3 — MEDIUM（主名詞の誤認リスク）

**B-3/D-2: ofNPNP構造で所有代名詞がvisual headに見え、主名詞が640px下方**

- 参照: COL 1:8!5-9 (ὑμῶν, ἀγάπην, rk-dy=602)
- 現象: 所有代名詞ὑμῶんが目的語位置、主名詞ἀγάπηんが640px下
- 根本原因: ofNPNP構造でhi=0(pron)が選ばれ、rk-dy=602で主名詞がさらに遠ざかる
- 修正候補: ofNPNP のhead選択を noun に変更（B-3として既に設計済）
- 変更分類: `CORRECTNESS`（B-2 NPofNP wg-head extensionに相当）

---

### P4 — LOW（RK慣習との差異）

**B-2: NP-CL modエッジが関係代名詞でなく節動詞に接続**

- 参照: COL 1:4!9-10 (ἀγάπην→ἔχετε)
- 現象: 先行詞 ἀγάπην から節動詞 ἔχετε へmod edge（関係代名詞 ἣν でない）
- 根本原因: clause()のlead選択が最初のSLOT（SLOT[v]=2）の言語になる
- 修正候補: NP-CLのmod edge終点を関係代名詞（role=o, SLOT=3だが先行詞との接続点）にする
- 変更分類: `UX`

---

### P5 — LOW（detInline後の接続先）

**B-1: detInline後のcont edge終点が名詞でなく冠詞に向かう**

- 参照: COL PrepNp各所 (τήν ελπίδα等)
- 現象: prep cont edgeが inline冠詞に向かう
- 根本原因: phrase()内のcont edge生成が `r.lead` を使う → detInline leadは冠詞
- 修正候補: cont edge終点を `r.head`（名詞）に変更
- 変更分類: `UX`

---

## 9. 検証限界

1. **ファイル限定:** col_final.xml (COL 1:3-8) と luk_after_fold.xml (LUK 3:23-38) のみ。他書・他テキストの構造は未確認。
2. **viewport外未確認:** S-9 DetCL inline、ofNPNP S-5、sub-CL dash edge逆転の視覚確認はスクリーンショット取得失敗（プログラム測定のみ）。
3. **HEAD=NONHEAD検出:** スクリプトのmin-y判定がdetInline同y語を誤検知。改良アルゴリズムが必要。
4. **cont edge終点詳細:** 14件中、τήν/τῷ 等のarticle終点は一部のみ個別確認（全件 INFERRED）。
5. **カテゴリF (その他):** LUK系譜でのvp/sv（ἦν|ἀρχόμενος）詳細確認は代表スクリーンショットのみ（OBSERVED）。

---

## 10. 判定サマリー

| カテゴリ | 件数 | 最大影響 |
|---|---|---|
| A: RK図に存在しない | 0 | — |
| B: 接続終点が誤解を招く | 3 | MEDIUM–HIGH |
| C: SLOT水平整合エラー | 1 | HIGH |
| D: 手動座標副作用 | 2 | MEDIUM–HIGH |
| E: head選択エラー | 0 | — |
| F: その他 | 0 | — |
| **合計** | **6** | **HIGH (C-1, D-2/B-3)** |

LOWFAT構造はRK図に全件エッジとして反映されており（カテゴリA=0）、  
接続の欠落・消失は確認されなかった。  
問題はすべて「エッジの終点選択」「縦方向分離による誤読」「手動座標の表示副作用」の3種に集約される。

---

**状態:** READ ONLY監査完了  
**次のState:** 修正実装への進行は別Task。実装前にP1(C-1)の設計を優先確認することを推奨。
