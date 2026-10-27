# Task 8 Phase B — 統語構造・語のつながり・座標の独立検証報告書

**READ-ONLY監査 — HTML/XML/解析コード変更なし / Git操作なし**

生成日: 2026-10-21  
対象: SUSPECT 9件 + rk-dx/rk-dy 6件 = 計15件  
根拠: LOWFAT原本XML / 形態論フィールド / rk-diagram-m3.html レイアウトエンジン静的読解 / Phase 2ブラウザ実行結果

---

## 判定区分

| 記号 | 意味 |
|---|---|
| A | 構造も接続も妥当。座標調整に進める |
| B | 構造は妥当だが、接続または配置に問題がある（layout algorithm gap） |
| C | 統語構造そのものに疑義あり。座標調整を保留する |
| D | 根拠不足。人間による追加判断が必要 |

---

## SUSPECT 9件

---

### S-1: slot11 — δηλώσας vs τήν (COL 1:8!3 / 1:8!5)

**参照箇所**: COL 1:8!3 (v), COL 1:8!5 (o検査対象)  
**語ID**: δηλώσας (V-AAP-NSM), τήν (T-ASF)  
**原文**: δηλώσας ἡμῖν τὴν ὑμῶν ἀγάπην ἐν πνεύματι

**LOWFATの構造**:
```
wg[rule=ADV-V-IO-O, class=cl]          ← DetCL の内側
  w καὶ  (COL 1:8!2, adv)
  w δηλώσας (COL 1:8!3, role=v)
  w ἡμῖν  (COL 1:8!4, role=io)
  wg[rule=DetNP, role=o]
    w τήν   (COL 1:8!5, det)
    wg[rule=ofNPNP]
      w ὑμῶν  (COL 1:8!6, pron)          ← phrase()ではここがhead
      wg[rule=NpPp, rk-dx=-802, rk-dy=602]
        w ἀγάπην (COL 1:8!7)
        wg[rule=PrepNp] ἐν πνεύματι
```

**形態論的根拠**:  
δηλώσας = V-AAP-NSM（アオリスト能動分詞・男性主格単数）。  
ὑμῶν = P-2GP（2人称複数属格）。  
ἀγάπην = N-ASF（対格）。  
τήν = T-ASF（対格冠詞）。対格が一致しており τήν がこの名詞句の冠詞であることはCONFIRMED。

**構造上の判断**:  
Phase 2 slot11 SUSPECT は**検査メソドロジーの誤り**。slot11チェックは DetNP の LOWFAT DOM順序の最初の ref (COL 1:8!5 = τήν) を対象 o の代表として使用したが、τήν は `mods()` によって ofNPNP の下方に配置されるため x=451 となった。  
edges[] が返す実際の vo エッジ: `COL 1:8!3 → COL 1:8!6`（δηλώσας → ὑμῶν）。これはレイアウトエンジンが ofNPNP の phrase() head = ὑμῶン (NONHEAD でない最初の直接 w) を vo 接続先として正しく選択していることを示す（CONFIRMED）。

**図の接続**: CONFIRMED。vo エッジは δηλώσας → ὑμῶν。エッジ接続は正しい。  
**座標上の問題**: τήν の x=451 は mods() による下方配置の副産物（S-5参照）。slot11 チェック自体が誤検知。  
**確信度**: HIGH（Phase 2 実行時 edges[] 直接確認）

**判定: A** — 構造も接続も妥当。座標調整に進める。

---

### S-2: detnp3 — τήν / πίστιν (COL 1:4!2 / 1:4!3)、yDiff=176px

**参照箇所**: COL 1:4!2 (det), COL 1:4!3 (noun)  
**語ID**: τήν (T-ASF), πίστιν (N-ASF)  
**原文**: τὴν πίστιν ὑμῶν ἐν Χριστῷ Ἰησοῦ

**LOWFATの構造**:
```
wg[rule=DetNP, class=np]
  w τήν   (COL 1:4!2, det)
  wg[rule=NpPp, class=np]      ← head として phrase() に渡される
    wg[rule=NPofNP]
      w πίστιν (COL 1:4!3)    ← NpPpのphrase()head
      w ὑμῶν  (COL 1:4!4)
    wg[rule=PrepNp]
      w ἐν    (COL 1:4!5)
      wg[Np-Appos] Χριστῷ Ἰησοῦ
```

**形態論的根拠**:  
τήν T-ASF と πίστιν N-ASF は格・性・数が一致（CONFIRMED）。  
τὴν πίστιν = 「あなたがたの信仰」。DetNP として article + NP は構造的に正しい。

**構造上の判断**: CONFIRMED。τήν は πίστιν の冠詞。DetNP → NpPp 構造はギリシャ語の「冠詞 + 前置詞句付き名詞」として正しい。

**図の接続**: τήν と NpPp head(πίστιν)の間には mod エッジが生成されるべきだが、τήν が mods() 経由で下方に配置されるため、diagram上の視覚的な関係が不明瞭になる。  
**座標上の問題**: `phrase()` の detInline 条件は `NPofNP / NPDetAdj / AdjpNp` のみ対応。NpPp は対象外。τήν → mods() → 下方配置。yDiff ≈ 176px。伝統的 RK 図では冠詞は名詞と同一ベースラインに配置されるべき。  
**確信度**: HIGH

**判定: B** — 構造は妥当。detInline が NpPp を head に持つ DetNP に未対応（layout algorithm gap）。

---

### S-3: detnp4 — τήν / ἀγάπην (COL 1:4!9 / 1:4!10)、yDiff=176px

**参照箇所**: COL 1:4!9 (det), COL 1:4!10 (noun)  
**語ID**: τήν (T-ASF), ἀγάπην (N-ASF)  
**原文**: τὴν ἀγάπην ἣν ἔχετε εἰς πάντας τοὺς ἁγίους

**LOWFATの構造**:
```
wg[rule=DetNP, class=np]
  w τήν    (COL 1:4!9, det)
  wg[rule=NP-CL, class=np, type=apposition]   ← head
    w ἀγάπην (COL 1:4!10, noun)
    wg[rule=O-V-ADV, class=cl, junction=apposition]
      w ἣν    (COL 1:4!11, rel.pron, role=o)
      w ἔχετε (COL 1:4!12, verb, role=v)
      wg[PrepNp, role=adv]
```

**形態論的根拠**:  
τήν T-ASF と ἀγάπην N-ASF は格・性・数が一致（CONFIRMED）。  
ἣν R-ASF = 関係代名詞（対格女性単数）は ἀγάπην を先行詞とする（性・格一致 CONFIRMED）。

**構造上の判断**: CONFIRMED。τήν は ἀγάπην の冠詞。NP-CL (名詞 + 関係節) は正しい構造。

**図の接続**: 同上（S-2 と同パターン）。  
**座標上の問題**: NP-CL も detInline 対応外。τήν → mods() → 下方配置。yDiff ≈ 176px。  
**確信度**: HIGH

**判定: B** — 構造妥当。detInline が NP-CL を head に持つ DetNP に未対応（layout algorithm gap）。

---

### S-4: detnp13 — τοῦ / ἀγαπητοῦ (COL 1:7!5 / 1:7!6)、yDiff=54px

**参照箇所**: COL 1:7!5 (det), COL 1:7!6 (adj)  
**語ID**: τοῦ (T-GSM), ἀγαπητοῦ (A-GSM)  
**原文**: τοῦ ἀγαπητοῦ συνδούλου ἡμῶν

**LOWFATの構造**:
```
wg[rule=DetNP, junction=apposition]
  w τοῦ        (COL 1:7!5, det)
  wg[rule=NPofNP]              ← head
    wg[rule=AdjpNp]            ← NPofNP の直接子 wg (phrase()でのhead候補)
      w ἀγαπητοῦ (COL 1:7!6, adj)
      w συνδούλου (COL 1:7!7, noun)
    w ἡμῶν      (COL 1:7!8, pron) ← phrase()での実際のhead (最初のw・非NONHEAD)
```

**形態論的根拠**:  
τοῦ T-GSM、ἀγαπητοῦ A-GSM、συνδούλου N-GSM、ἡμῶν P-1GP — すべて属格一致（CONFIRMED）。  
「愛する同僚の しもべ ἡμῶν（わたしたちの）」= DetNP として正しい。

**構造上の判断**: CONFIRMED。τοῦ は NPofNP 全体の冠詞。LOWFAT 構造は正しい。

**図の接続**: phase() では NPofNP の直接子が先頭 w 非NONHEAD = ἡμῶン。したがって NPofNP の phrase() head は ἡμῶν となり、AdjpNp が mods() 経由で下方に配置される。τοῦ はさらに NPofNP ごと mods() 対象となる。  
**座標上の問題**: NPofNP の detInline 条件 `A(ks[hi],'rule')==='NPofNP' && npKids[0].tagName==='w'` が不成立（npKids[0] = AdjpNp = wg）。τοῦ → mods() → 下方配置。yDiff ≈ 54px。  
**確信度**: HIGH

**判定: B** — 構造妥当。NPofNP の先頭直接子が wg の場合 detInline 未対応（layout algorithm gap）。

---

### S-5: detnp15 — τήν / ὑμῶν (COL 1:8!5 / 1:8!6)、yDiff=732px

**参照箇所**: COL 1:8!5 (det), COL 1:8!6 (pron, phrase head)  
**語ID**: τήν (T-ASF), ὑμῶν (P-2GP)  
**原文**: τὴν ὑμῶν ἀγάπην ἐν πνεύματι

**LOWFATの構造**:
```
wg[rule=DetNP, role=o]
  w τήν    (COL 1:8!5, det)
  wg[rule=ofNPNP]              ← head (detInline非対応)
    w ὑμῶン (COL 1:8!6, pron) ← phrase()では最初のw非NONHEAD = layout head
    wg[rule=NpPp, rk-dx=-802, rk-dy=602]
      w ἀγάπην (COL 1:8!7, noun)
      wg[PrepNp] ἐν πνεύματι
```

**形態論的根拠**:  
τήν T-ASF、ἀγάπην N-ASF は格・性・数一致（CONFIRMED）。  
ὑμῶン P-2GP は ἀγάπην の属格所有者修飾語。「あなたがたの愛（ἀγάπην）」構造はCONFIRMED。

**構造上の判断**:  
LOWFATの ofNPNP rule は「属格代名詞先行 + 名詞句」の語順（ὑμῶン ἀγάπην = your love）を表す。phrase() はこの rule の最初の直接 w (ὑμῶン) を layout head とする。  
ただし RK 図の観点では名詞 ἀγάπην が意味的な head であり、ὑμῶン は修飾語。layout head の選択が RK 意味論と乖離している点は注記が必要だが、これは layout algorithm の問題であり LOWFAT 構造の誤りではない。

**図の接続**: τήν は mods() 経由で ofNPNP の下方配置。yDiff が732pxと極端に大きいのは、ofNPNP の内部 NpPp が rk-dy=602 で大幅に下方シフトされているため ofNPNP.h が拡大されているから（複合効果）。  
**座標上の問題**:  
- 直接原因: ofNPNP が detInline 非対応 → τήν → mods() 下方配置  
- 増幅原因: NpPp (COL 1:8!7-9) の rk-dy=602 が ofNPNP 高さを拡大  
- 結果: τήν が RK 図上で名詞句と視覚的に切り離される（732px 下）  
**確信度**: HIGH（構造）/ CONFIRMED（yDiff 計算根拠）

**判定: B** — 構造は妥当。ofNPNP が detInline 非対応 + rk-dy=602 の複合効果による極端な配置ずれ。

---

### S-6: npofnp6 — ἀγαπητοῦ y=1666 / avgY=1609

**参照箇所**: COL 1:7!6 (adj, Phase 2 で head として誤認定)  
**語ID**: ἀγαπητοῦ (A-GSM)  
**原文**: τοῦ ἀγαπητοῦ συνδούλου ἡμῶν

※本件は S-4 (detnp13) と同一の wg 構造が対象。

**LOWFATの構造**: S-4 参照。

**構造上の判断**:  
Phase 2 npofnp6 チェックは `wg.querySelectorAll('w')` で**全子孫 w** を取得し、最初の非NONHEAD w = ἀγαπητοῦ (COL 1:7!6) を "head" として判定した。  
しかし layout engine の `phrase()` は**直接子のみ**を使用して head を選択する。NPofNP の直接子: [AdjpNp(wg), ἡμῶン(w)]。最初の非NONHEAD w = ἡμῶン。  
したがって layout head = ἡμῶン (y=1609)、AdjpNp は mods() により下方配置 (y≈1655+)。  
Phase 2 の「modifier が head より y 小さい（上方にある）」は**検査メソドロジーの誤り**（CONFIRMED）。  
ただし layout head = ἡμῶン（属格所有格代名詞）は意味的には修飾語であり、ἀγαπητοῦ/συνδούλου が意味的 head である。layout と RK 意味論の乖離は S-5 と同種の問題。

**図の接続**: phase()上は ἡμῶン が NPofNP の接続基点。LOWFAT 構造と layout engine の処理は一貫している（ただし RK 意味的 head とは異なる）。  
**座標上の問題**: S-4 の「τοῦの下方配置」の延長問題。検査自体は誤検知。  
**確信度**: HIGH（検査誤り CONFIRMED）

**判定: B** — 検査誤検知を確認。ただし NPofNP で属格代名詞が先行する場合の layout head 選択は B-level 注記対象（ἡμῶン ではなく AdjpNp/συνδούλου が RK head であるべき）。

---

### S-7: detcl1 — τήν / ἀποκειμένην (COL 1:5!4 / 1:5!5)

**参照箇所**: COL 1:5!4 (det), COL 1:5!5 (ptc, DetCL 内)  
**語ID**: τήν (T-ASF), ἀποκειμένην (V-PNP-ASF)  
**原文**: τὴν ἀποκειμένην ὑμῖν ἐν τοῖς οὐρανοῖς

**LOWFATの構造**:
```
wg[rule=Np-Appos, class=np]
  wg[rule=DetNP]
    w τήν   (COL 1:5!2)
    w ἐλπίδα (COL 1:5!3)
  wg[rule=DetCL, junction=apposition]
    w τήν   (COL 1:5!4, det)  ← 検査対象
    wg[rule=V-ADV-ADV, class=cl]
      w ἀποκειμένην (COL 1:5!5, role=v, V-PNP-ASF)
      w ὑμῖν  (COL 1:5!6, role=io)
      wg[PrepNp, role=adv]
```

**形態論的根拠**:  
τήν T-ASF、ἀποκειμένην V-PNP-ASF（完了受動分詞・対格女性単数）。性・格・数が一致（CONFIRMED）。  
文脈: τὴν ἐλπίδα ... τὴν ἀποκειμένην ὑμῖν ἐν τοῖς οὐρανοῖς = 「あなたがたのために天に蓄えられている（その）希望」。τήν は実質化された分詞節を導く実質化冠詞。

**構造上の判断**: CONFIRMED。DetCL 構造（冠詞 + 分詞節 = 実質化分詞）は文法的に正しい。冠詞 τήν は分詞節全体を名詞的に機能させる。

**図の接続**: DetCL の phrase() 処理では先頭 w = τήν (det, NONHEAD)、残り = V-ADV-ADV (wg)。detInline 条件: V-ADV-ADV は NPofNP / NPDetAdj / AdjpNp のいずれでもない → detInline 不発。τήν → mods() → cl_head の下方配置。  
**座標上の問題**: DetCL の article を clause-level head と同一 y 軸に配置するロジックが layout engine に存在しない（系統的 gap）。3件（S-7/S-8/S-9）に共通する同一原因。  
**確信度**: HIGH

**判定: B** — 構造妥当（実質化分詞 + 実質化冠詞 CONFIRMED）。DetCL の detInline 系統的未対応（layout algorithm gap）。

---

### S-8: detcl2 — τοῦ / παρόντος (COL 1:6!1 / 1:6!2)

**参照箇所**: COL 1:6!1 (det), COL 1:6!2 (ptc)  
**語ID**: τοῦ (T-GSN), παρόντος (V-PAP-GSN)  
**原文**: τοῦ παρόντος εἰς ὑμᾶς

**LOWFATの構造**:
```
wg[rule=DetCL]
  w τοῦ      (COL 1:6!1, det)
  wg[rule=V-ADV, class=cl]
    w παρόντος (COL 1:6!2, role=v, V-PAP-GSN)
    wg[PrepNp, role=adv]
      w εἰς   (COL 1:6!3)
      w ὑμᾶς (COL 1:6!4)
```

**形態論的根拠**:  
τοῦ T-GSN、παρόντος V-PAP-GSN（現在能動分詞・属格中性単数）。性・格・数一致（CONFIRMED）。  
文脈: τοῦ εὐαγγελίου... τοῦ παρόντος εἰς ὑμᾶς = 「あなたがたのところに来ている（その）福音の」。τοῦ は εὐαγγελίου と同格で分詞節を実質化。

**構造上の判断**: CONFIRMED。S-7 と同構造（実質化冠詞 + 分詞節）。

**図の接続**: S-7 と同じ。detInline 未対応 → τοῦ → mods() 下方配置。  
**座標上の問題**: S-7 と同根（DetCL 系統的 gap）。  
**確信度**: HIGH

**判定: B** — S-7 と同判定。

---

### S-9: detcl3 — ὁ / δηλώσας (COL 1:8!1 / 1:8!3)

**参照箇所**: COL 1:8!1 (det), COL 1:8!3 (ptc, role=v)  
**語ID**: ὁ (T-NSM), δηλώσας (V-AAP-NSM)  
**原文**: ὁ καὶ δηλώσας ἡμῖν τὴν ὑμῶν ἀγάπην ἐν πνεύματι

**LOWFATの構造**:
```
wg[rule=S-VC-P, class=cl, junction=apposition]   ← COL 1:7!9-1:8!9
  w ὅς   (COL 1:7!9, role=s)
  w ἐστιν (COL 1:7!10, role=vc)
  wg[rule=Np-Appos, role=p]
    wg[rule=AdjpNp] πιστὸς διάκονος ὑπὲρ ἡμῶν
    wg[rule=DetCL, junction=apposition]
      w ὁ   (COL 1:8!1, det)  ← 検査対象
      wg[rule=ADV-V-IO-O, class=cl]   ← 8語
        w καὶ  (COL 1:8!2, adv)
        w δηλώσας (COL 1:8!3, role=v, V-AAP-NSM)
        w ἡμῖν (COL 1:8!4, role=io)
        wg[rule=DetNP, role=o] …
```

**形態論的根拠**:  
ὁ T-NSM、δηλώσας V-AAP-NSM（アオリスト能動分詞・男性主格単数）。性・格・数一致（CONFIRMED）。  
文脈: ὁ καὶ δηλώσας ἡμῖν τὴν ὑμῶν ἀγάπην ἐν πνεύματι = 「（彼は）わたしたちに霊による愛をも知らせてくれた（その者）」。ὁ は実質化冠詞として Ἐπαφρᾶの同格分詞句を導く。

**構造上の判断**: CONFIRMED。DetCL（実質化冠詞 + 分詞節）として正しい。ὁ は関係詞的実質化機能。

**図の接続**: S-7/S-8 と同根（detInline 系統的未対応）。  
**座標上の問題**: S-7/S-8 と同根。加えて、ADV-V-IO-O 節内の vo エッジ（δηλώσας → ὑμῶン、S-1参照）は正常に機能している。  
**確信度**: HIGH

**判定: B** — S-7/S-8 と同判定。

---

## rk-dx / rk-dy 6件

---

### R-1: LUK 3:25!5-3:38!8 (NPofNP, rk-dx=-780, 136語)

**参照箇所**: LUK 3:25!5 (先頭 τοῦ) 〜 LUK 3:38!8  
**語ID**: τοῦ (T-GSM), Ναοὺμ 他 (固有名詞)  
**原文**: τοῦ Ναοὺμ τοῦ Ἑσλὶ ... τοῦ θεοῦ（先祖系譜の後半136語）

**LOWFATの構造**:
```
wg[rule=NPofNP, junction=apposition, rk-dx=-780]  ← 136語
  w τοῦ     (LUK 3:25!5, det)
  wg[rule=Np-Appos]
    w Ναοὺμ (LUK 3:25!6, noun, 固有)
    wg[rule=NPofNP, rk-dx=-780] ...  ← 84語 (R-2)
```

直接親: `wg[rule=Np-Appos, class=np]`

**形態論的根拠**:  
τοῦ T-GSM は属格定冠詞。続く固有名詞はすべて属格（NPofNP の genitive modifier として機能）。  
LUK 3:23-38 系譜: ὢν υἱός... τοῦ Ἰωσὴφ τοῦ Ἠλὶ... τοῦ θεοῦ = 「ヨセフの子（とされた）... 神の子」。  
τοῦ [名前] = 「[名前]の（子）」というギリシャ語系譜定型。全τοῦは属格冠詞で構造的に一貫（CONFIRMED）。

**構造上の判断**: CONFIRMED。NPofNP{det + Np-Appos} の交互ネストによる系譜鎖は LOWFATの正しい解析。ネストが深くなるほど右方向にシフトするため、rk-dx=-780 で水平位置を補正している。

**図の接続**: 各 NPofNP の phrase() head は Np-Appos の最初の直接 w（固有名詞）。mod エッジで祖先方向に繋がる鎖構造。接続は正しい。  
**座標上の問題**: 深ネストによる水平方向の canvas overflow を rk-dx=-780 で補正。視認性改善目的の調整であり、構造上の問題ではない。  
**確信度**: HIGH（構造）/ NOT VERIFIED（実際の canvas 右端距離）

**判定: A** — 構造・接続妥当。rk-dx は水平 overflow 補正。座標調整に進める。

---

### R-2: LUK 3:30!7-3:38!8 (NPofNP, rk-dx=-780, 84語)

**参照箇所**: LUK 3:30!7 (τοῦ Ἰωνὰμ) 〜 LUK 3:38!8  
**語ID**: τοῦ (T-GSM), Ἰωνὰμ 他  
**原文**: τοῦ Ἰωνὰμ τοῦ Ἐλιακὶμ ... τοῦ θεοῦ（84語）

**LOWFATの構造**: R-1 と同構造（深さが異なる）。直接親: `wg[rule=Np-Appos]`。

**形態論的根拠**: R-1 と同じ（属格冠詞 + 属格固有名詞、CONFIRMED）。  
**構造上の判断**: CONFIRMED（R-1 参照）。  
**図の接続**: R-1 と同じ。  
**座標上の問題**: R-1 と同じ（水平 overflow 補正、rk-dx=-780）。  
**確信度**: HIGH

**判定: A** — R-1 と同判定。

---

### R-3: LUK 3:35!7-3:38!8 (NPofNP, rk-dx=-780, 32語)

**参照箇所**: LUK 3:35!7 (τοῦ Ἔβερ) 〜 LUK 3:38!8  
**語ID**: τοῦ (T-GSM), Ἔβερ 他  
**原文**: τοῦ Ἔβερ τοῦ Σαλὰ τοῦ Καϊνὰμ ... τοῦ θεοῦ（32語）

**LOWFATの構造**: R-1/R-2 と同構造（最も内側の3件目）。直接親: `wg[rule=Np-Appos]`。

**形態論的根拠**: R-1 と同じ（CONFIRMED）。  
**構造上の判断**: CONFIRMED（R-1 参照）。  
**図の接続**: R-1 と同じ。  
**座標上の問題**: R-1 と同じ（水平 overflow 補正）。  
**確信度**: HIGH

**判定: A** — R-1 と同判定。

---

### R-4: COL 1:3!4-9 (NPofNP rk-dx=-1009, rk-dy=938)

**参照箇所**: COL 1:3!4 (πατρί) 〜 COL 1:3!9 (Χριστοῦ)  
**語ID**: πατρί (N-DSM), κυρίου (N-GSM), ἡμῶν, Ἰησοῦ, Χριστοῦ  
**原文**: πατρὶ τοῦ κυρίου ἡμῶν Ἰησοῦ Χριστοῦ

**LOWFATの構造**:
```
wg[rule=Np-Appos, role=o]        ← τῷ θεῷ と πατρί の同格グループ
  wg[rule=DetNP] τῷ θεῷ         ← COL 1:3!2-3
  wg[rule=NPofNP, junction=apposition, rk-dx=-1009, rk-dy=938]
    w πατρί (COL 1:3!4, N-DSM)
    wg[rule=Np-Appos]
      wg[rule=DetNP]
        w τοῦ   (COL 1:3!5)
        wg[rule=NPofNP]
          w κυρίου (COL 1:3!6, N-GSM)
          w ἡμῶν  (COL 1:3!7)
      wg[rule=Np-Appos, junction=apposition]
        w Ἰησοῦ   (COL 1:3!8, N-GSM)
        w Χριστοῦ (COL 1:3!9, N-GSM)
```

**形態論的根拠**:  
πατρί N-DSM と θεῷ N-DSM は格・性・数が一致（与格男性単数）。  
τοῦ κυρίου ἡμῶν：κυρίου N-GSM は πατρί の属格修飾語（NPofNP）。  
Ἰησοῦ / Χριστοῦ は共に N-GSM → κυρίου の同格（CONFIRMED）。  
文脈: εὐχαριστοῦμεν τῷ θεῷ πατρὶ τοῦ κυρίου ἡμῶν Ἰησοῦ Χριστοῦ = 「わたしたちの主イエス・キリストの父なる神に感謝する」。

**構造上の判断**: CONFIRMED。θεῷ と πατρί は同格（同一存在の別称）。NPofNP{πατρί + Np-Appos{…}} はギリシャ語の「of」関係を正しく表現。

**図の接続**: この NPofNP は Np-Appos[role=o] の一部として Εὐχαριστοῦμεν の目的語グループ。接続は正しい。Np-Appos の phrase() head は θεῷ → NPofNP は mods() 経由でその下方に配置される（rk-dy=-938 はこの自然な下方配置をさらに 938px 下に移動）。  
**座標上の問題**: rk-dy=938 は大きな下方シフト。102語の長文センテンス（COL 1:3!1-1:8!9）での canvas 混雑回避、またはこの NPofNP の下方展開が長い（Ἰησοῦ Χριστοῦ まで）ことへの対応と推定。構造上の問題は NONE。  
**確信度**: HIGH（構造）/ NOT VERIFIED（canvas 上の視認性）

**判定: A** — 構造・接続妥当。rk-dy は canvas 混雑回避。座標調整に進める。

---

### R-5: COL 1:6!6-1:8!9 (wg[class=cl], rk-dx=-1362, rk-dy=1176, 50語)

**参照箇所**: COL 1:6!6 (καὶ) 〜 COL 1:8!9 (πνεύματι)  
**語ID**: ἐστὶν (V-PAI-3S, role=v), καρποφορούμενον (V-PPP-NSN, role=adv) 他  
**原文**: καὶ ἐν παντὶ τῷ κόσμῳ ἐστὶν καρποφορούμενον καὶ αὐξανόμενον καθὼς καὶ ἐν ὑμῖν...（50語）

**LOWFATの構造**:
```
wg[rule=sub-CL, role=o]          ← 51語, COL 1:6!5-1:8!9
  w καθὼς (COL 1:6!5, conj)
  wg[class=cl, rk-dx=-1362, rk-dy=1176]   ← 50語
    wg[rule=AdvPp, role=adv]  καὶ ἐν παντὶ τῷ κόσμῳ  (5語)
    wg[rule=BeVerb, role=v]   ἐστὶν + participles     (4語)
    wg[rule=sub-CL, role=adv] καθὼς + 41語            (41語)
```

直接親: `wg[rule=sub-CL, role=o]`  
上位親: `wg[class=cl, rule=（なし）]`（COL 1:3!1-1:8!9, 102語）の直接子 sub-CL

**形態論的根拠**:  
ἐστὶν V-PAI-3S（現在能動直説3人称単数）は BeVerb として正しい（CONFIRMED）。  
καρποφορούμενον V-PPP-NSN + αὐξανόμενον（不図示）は BeVerb 節の主語と一致（NSN）。  
内部 sub-CL の καθὼς は比較副詞的接続詞（adv role で正しい）。

**構造上の判断**:  
主節 wg[class=cl] の直接子:
- v: Εὐχαριστοῦμεν (COL 1:3!1)
- o: Np-Appos τῷ θεῷ πατρί...
- adv: πάντοτε / ADV-V / V-O-ADV
- **o: sub-CL[role=o]** — καθὼς + この 50語 cl

この sub-CL に role=o が割り当てられている。  
意味的観点: καθὼς は通常「ちょうど〜のように」という比較副詞節を導く。εὐχαριστέω の直接目的語として καθὼς 節を使うのは通常の用法ではない（目的語は dative + ὑπέρ/περί が典型）。  
一方 LOWFAT は長い COL 1:3-8 文の中でこの節に役割を与える必要があり、o を選んだと考えられる。この判断の根拠（LOWFAT 編集方針）は本監査では確認できない。  
**構造的断定の確信度は MEDIUM** — role=o と role=adv のどちらが正しいかは LOWFAT の意図の確認が必要。

**図の接続**: vo エッジ: 実行時に `COL 1:3!3 → COL 1:6!5`（θεῷ → καθὼς）が edges[] に記録されていた（Phase 2）。これは LOWFAT の role=o 割り当てに従ったエッジ生成。  
**座標上の問題**: rk-dx=-1362, rk-dy=1176 は 50語の大きな cl を大幅に左下へ移動。102語の長文センテンスでは自動レイアウトが canvas 右端に達するため、この移動は視認性のための調整と推定。  
**確信度**: 座標調整の妥当性は HIGH。role=o の構造的正確さは MEDIUM。

**判定: B** — 座標調整は視認性のための配置補正として妥当。role=o の言語学的正確さは LOWFAT 仕様の問題であり、座標調整の可否には影響しない。座標調整に進める。  
※ role=o vs role=adv の構造的問題は DEFERRED（LOWFAT 仕様判断は現 Scope 外）。

---

### R-6: COL 1:8!7-9 (NpPp, rk-dx=-802, rk-dy=602, 3語)

**参照箇所**: COL 1:8!7 (ἀγάπην) 〜 COL 1:8!9 (πνεύματι)  
**語ID**: ἀγάπην (N-ASF), ἐν (prep), πνεύματι (N-DSN)  
**原文**: ἀγάπην ἐν πνεύματι

**LOWFATの構造**:
```
wg[rule=ofNPNP]
  w ὑμῶん  (COL 1:8!6, pron)
  wg[rule=NpPp, rk-dx=-802, rk-dy=602]
    w ἀγάπην  (COL 1:8!7, N-ASF)
    wg[rule=PrepNp]
      w ἐν        (COL 1:8!8)
      w πνεύματι  (COL 1:8!9, N-DSN)
```

直接親: `wg[rule=ofNPNP]`  
上位: `wg[rule=DetNP, role=o]` → `wg[rule=ADV-V-IO-O]` → `wg[rule=DetCL]`

**形態論的根拠**:  
ἀγάπην N-ASF、τήν T-ASF（DetNP の冠詞、COL 1:8!5）は格・性・数一致（CONFIRMED）。  
πνεύματι N-DSN は ἐν の支配する与格（CONFIRMED）。  
「霊における愛」または「聖霊による愛」。NpPp（名詞 + 前置詞句）構造は正しい。

**構造上の判断**: CONFIRMED。NpPp{ἀγάπην + PrepNp(ἐν πνεύματι)} は標準的な「名詞 + 前置詞句修飾語」構造。

**図の接続**: PrepNp は ἀγάπην の mod として配置。接続は正しい。  
**座標上の問題**:  
- rk-dx=-802, rk-dy=602 のシフトが S-5(detnp15) の yDiff=732px の主要因となっている。  
- ofNPNP 内で NpPp が rk-dy=602 で下方シフトされることで ofNPNP 全体の height が拡大し、DetNP の τήν が mods() 経由でさらに下方（合計 732px）に配置される。  
- NpPp 自体の座標調整は視認性改善目的と推定されるが、τήν に対する連鎖影響が大きい点は注記が必要。  
**確信度**: HIGH（構造）/ MEDIUM（rk-dy=602 の選択根拠）

**判定: A** — 構造・接続妥当。rk-dx/rk-dy は視認性のための位置調整。ただし **τήν (S-5) への連鎖影響を要考慮**。

---

## 集計

### 構造判定サマリー（15件）

| 件 | ID | 構造 | 接続 | 座標問題 | 判定 |
|---|---|---|---|---|---|
| S-1 | slot11 | CONFIRMED | CONFIRMED (vo正常) | なし（検査誤検知）| **A** |
| S-2 | detnp3 | CONFIRMED | mod接続不明瞭 | yDiff=176px (detInline gap) | **B** |
| S-3 | detnp4 | CONFIRMED | mod接続不明瞭 | yDiff=176px (detInline gap) | **B** |
| S-4 | detnp13 | CONFIRMED | mod接続不明瞭 | yDiff=54px (detInline gap) | **B** |
| S-5 | detnp15 | CONFIRMED | mod接続不明瞭 | yDiff=732px (ofNPNP gap + rk-dy複合) | **B** |
| S-6 | npofnp6 | CONFIRMED | 検査誤検知 | layout head = ἡμῶン (意味的 head と乖離) | **B** |
| S-7 | detcl1 | CONFIRMED | mod接続不明瞭 | 系統的 DetCL detInline gap | **B** |
| S-8 | detcl2 | CONFIRMED | mod接続不明瞭 | 系統的 DetCL detInline gap | **B** |
| S-9 | detcl3 | CONFIRMED | mod接続不明瞭 | 系統的 DetCL detInline gap | **B** |
| R-1 | LUK-NPofNP 136語 | CONFIRMED | CONFIRMED | overflow補正 | **A** |
| R-2 | LUK-NPofNP 84語 | CONFIRMED | CONFIRMED | overflow補正 | **A** |
| R-3 | LUK-NPofNP 32語 | CONFIRMED | CONFIRMED | overflow補正 | **A** |
| R-4 | COL πατρί 6語 | CONFIRMED | CONFIRMED | canvas混雑回避 | **A** |
| R-5 | COL cl 50語 | CONFIRMED (role=o 要確認 DEFERRED) | vo正常 | canvas混雑回避 | **B** |
| R-6 | COL NpPp 3語 | CONFIRMED | CONFIRMED | τήN連鎖影響あり | **A** |

### 判定別集計

| 判定 | 件数 | 件 |
|---|---|---|
| A（座標調整可） | 6 | S-1, R-1, R-2, R-3, R-4, R-6 |
| B（構造妥当・layout gap） | 9 | S-2〜S-9, R-5 |
| C（構造疑義） | 0 | — |
| D（要人手確認） | 0 | — |

### 検出されたレイアウトアルゴリズム上の問題

| 問題 | 影響件数 | 対象ID |
|---|---|---|
| detInline: NpPp head 未対応 | 1 | S-2 |
| detInline: NP-CL head 未対応 | 1 | S-3 |
| detInline: NPofNP 先頭子が wg の場合 未対応 | 2 | S-4, S-6 |
| detInline: DetCL (clause head) 系統的未対応 | 3 | S-7, S-8, S-9 |
| detInline: ofNPNP head 未対応 + rk-dy 複合 | 1 | S-5 |
| NPofNP layout head = 属格代名詞（意味的 head 選択ずれ） | 1 | S-6 |
| NpPp の rk-dy による DetNP τήN への連鎖影響 | 1 | R-6 → S-5 |

### Phase B DEFERRED 事項

1. **R-5 role=o の言語学的正確さ**: LOWFAT が καθὼς 節に role=o を割り当てた根拠の確認（LOWFAT 仕様判断が必要）。座標調整の可否には影響しないため DEFERRED。

---

## Phase B 結論

- 15件すべてについて **LOWFAT 構造の言語学的正確さが確認できた（A または B）**。
- 構造そのものに疑義がある件は 0件（判定 C なし）。
- 根拠不足の件は 0件（判定 D なし）。
- B 判定9件の共通原因は **layout algorithm の detInline ギャップ**（DetNP の冠詞が clause / NpPp / NP-CL / ofNPNP head に対して phrase head と同一 y に配置されない）。
- 座標調整前提として最も注意すべきは **S-5 + R-6 の連鎖関係**（R-6 の rk-dy=602 が S-5 の yDiff=732px を生成している）。

---

*本報告書は READ-ONLY 監査。既存レポート上書きなし。対象ファイル変更なし。*
