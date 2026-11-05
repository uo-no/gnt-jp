# Stage 4 Phase 4ac — Revision Candidate 31件 個別監査

**Phase**: 4ac
**実施日**: 2026-11-04
**目的**: Phase 4w REVISION_CANDIDATE 31件の個別監査・判定確定
**種別**: READ-ONLY 監査（bible_data・辞書・インデックス・engine・baseline 変更なし）
**最終ステータス**: **PHASE 4ac AUDIT PASS**

---

## 1. 作業前確認

| 項目 | 値 |
|------|---|
| ブランチ | data/ja1955-nt-approved-132 |
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| origin HEAD | 2120b4b4201a492bfd7f9f5e610e7b2833b02d31 |
| worktree M files | 137件（Phase 4m/4q/4r/4s/4v/4y/4ab 適用済み） |
| Phase 4aa/4ab 成果物 | 確認済み ✓ |

---

## 2. 対象集合の確認

### 2.1 Phase 4w 記録との照合

Phase 4w residual inventory の REVISION_CANDIDATE 31件は以下の3ソースに由来する。

| ソース | Strong | 件数 | 備考 |
|--------|--------|------|------|
| Phase 4e（Tier 1 audit） | G3762, G4183, G2983, G3056, G4160 | 18件 | ACT/HEB/JHN/LUK/MAT/ROM/TIT/PHM |
| Phase 4f（Tier 2 audit） | G3860 | 1件 | MRK 4:29!3 |
| Phase 4b（Group D audit） | G5616, G5228 | 12件 | 11件+1件 |
| **合計** | 7 Strong | **31件** | ✓ |

### 2.2 ref 重複・欠落チェック

bible_data から全 ref を直接取得し、31件すべてが一意に存在することを確認した。

| Strong | 期待件数 | 取得件数 | 一致 |
|--------|---------|---------|------|
| G3762 | 10 | 10 | ✓ |
| G4183 | 4 | 4 | ✓ |
| G2983 | 2 | 2 | ✓ |
| G3056 | 1 | 1 | ✓ |
| G4160 | 1 | 1 | ✓ |
| G3860 | 1 | 1 | ✓ |
| G5616 | 11 | 11 | ✓ |
| G5228 | 1 | 1 | ✓ |
| **合計** | **31** | **31** | ✓ |

---

## 3. 個別監査

### Group A Tier 1 — G3762 οὐδείς（10件）

**背景**: G3762 οὐδείς は NT に234件存在。gender 分布: masculine=129 / neuter=94 / feminine=11。
現在の chip label「誰も〜ない」は masculine/feminine "no one/nobody" の用法を反映する。
10件は全件 gender=neuter または feminine（thing を指す用法）。

---

**RC-01: ACT 28:17!22**

| フィールド | 値 |
|-----------|---|
| text | οὐδὲν |
| morph | A-ASN-N (accusative singular neuter negative) |
| gender | neuter |
| current japanese | 誰も〜ない |
| english | nothing |
| gloss | nothing |

文脈: Paul「私は民に対しても先祖の慣習に対しても何も（οὐδὲν）行っていない」。
neuter 形。指示対象は人ではなく「行為・事柄」。english/gloss ともに "nothing"。
「誰も〜ない」（人格否定）は意味的に不正確。

**判定: APPROVED_FOR_CHANGE → 何も〜ない（HIGH）**

---

**RC-02: HEB 2:8!13**

| フィールド | 値 |
|-----------|---|
| text | οὐδὲν |
| morph | A-ASN-N |
| gender | neuter |
| current japanese | 誰も〜ない |
| english | nothing |
| gloss | nothing |

文脈: HEB 2:8「万物を従わせるにあたって、彼は何も（οὐδὲν）服さないものを残さなかった」（οὐδὲν ἀφῆκεν αὐτῷ ἀνυπότακτον）。
neuter 形。指示対象は「服さないもの・物事」。

**判定: APPROVED_FOR_CHANGE → 何も〜ない（HIGH）**

---

**RC-03: JHN 11:49!17**

| フィールド | 値 |
|-----------|---|
| text | οὐδέν |
| morph | A-ASN-N |
| gender | neuter |
| current japanese | 誰も〜ない |
| english | anything |
| gloss | nothing |

文脈: カイアファ「あなたがたは何も（οὐδέν）知らない」（ὑμεῖς οὐκ οἴδατε οὐδέν）。
neuter 形。english="anything"、gloss="nothing"。対象は「知識・情報」。

**判定: APPROVED_FOR_CHANGE → 何も〜ない（HIGH）**

---

**RC-04: JHN 16:23!9**

| フィールド | 値 |
|-----------|---|
| text | οὐδέν |
| morph | A-ASN-N |
| gender | neuter |
| current japanese | 誰も〜ない |
| english | anything |
| gloss | nothing |

文脈: JHN 16:23「その日にはあなたがたは私に何も（οὐδέν）尋ねない」（ἐμὲ οὐκ ἐρωτήσετε οὐδέν）。
neuter 形。対象は「質問・事柄」。

**判定: APPROVED_FOR_CHANGE → 何も〜ない（HIGH）**

---

**RC-05: JHN 16:29!12**

| フィールド | 値 |
|-----------|---|
| text | οὐδεμίαν |
| morph | A-ASF-N (accusative singular feminine negative) |
| gender | feminine |
| current japanese | 誰も〜ない |
| english | not |
| gloss | not |

文脈: JHN 16:29「今あなたは明らかに語っており、何の比喩（οὐδεμίαν παροιμίαν）も言わない」。
feminine 形は παροιμίαν（比喩・たとえ話、女性名詞）に一致。
指示対象は「比喩・たとえ話」という事物（人ではない）。「誰も〜ない」は不正確。

**判定: APPROVED_FOR_CHANGE → 何も〜ない（MEDIUM）**

注: feminine 形は形容詞的修飾（παροιμίαν を修飾）。chip として「何の〜もない」の方が正確だが、chip label の制約で「何も〜ない」を推奨。JHN 16:29!11（パロイミアン）と合わせて読者は意味を把握できる。

---

**RC-06: LUK 23:15!11**

| フィールド | 値 |
|-----------|---|
| text | οὐδὲν |
| morph | A-NSN-N |
| gender | neuter |
| current japanese | 誰も〜ない |
| english | nothing |
| gloss | nothing |

文脈: LUK 23:15 ヘロデも死刑に相当するものは「何も（οὐδὲν）見つからない」とした。
neuter 形。対象は「証拠・理由」。

**判定: APPROVED_FOR_CHANGE → 何も〜ない（HIGH）**

---

**RC-07: LUK 23:22!12**

| フィールド | 値 |
|-----------|---|
| text | οὐδὲν |
| morph | A-ASN-N |
| gender | neuter |
| current japanese | 誰も〜ない |
| english | no |
| gloss | No |

文脈: LUK 23:22 ピラト「この人に死刑に相当することは何も（οὐδὲν）見当たらない」。
neuter 形。対象は「罪・理由」。

**判定: APPROVED_FOR_CHANGE → 何も〜ない（HIGH）**

---

**RC-08: MAT 23:18!8**

| フィールド | 値 |
|-----------|---|
| text | οὐδέν |
| morph | A-NSN-N |
| gender | neuter |
| current japanese | 誰も〜ない |
| english | nothing |
| gloss | nothing |

文脈: MAT 23:18「祭壇の上の供え物にかけて誓う者は何も（οὐδέν）ない」（契約の有効性を否定）。
neuter 形。対象は「誓い・契約の効力」（抽象的事物）。

**判定: APPROVED_FOR_CHANGE → 何も〜ない（HIGH）**

---

**RC-09: PHM 1:14!6**

| フィールド | 値 |
|-----------|---|
| text | οὐδὲν |
| morph | A-ASN-N |
| gender | neuter |
| current japanese | 誰も〜ない |
| english | nothing |
| gloss | nothing |

文脈: PHM 1:14「しかしあなたの同意なしには何も（οὐδὲν）したくなかった」（χωρὶς δὲ τῆς σῆς γνώμης οὐδὲν ἠθέλησα）。
neuter 形。対象は「行為・こと」。

**判定: APPROVED_FOR_CHANGE → 何も〜ない（HIGH）**

---

**RC-10: TIT 1:15!10**

| フィールド | 値 |
|-----------|---|
| text | οὐδὲν |
| morph | A-NSN-N |
| gender | neuter |
| current japanese | 誰も〜ない |
| english | nothing |
| gloss | nothing |

文脈: TIT 1:15「しかし汚れた者や不信者にとっては清いものは何も（οὐδὲν）ない」（οὐδὲν καθαρόν）。
neuter 形。対象は「清いもの・物事」。

**判定: APPROVED_FOR_CHANGE → 何も〜ない（HIGH）**

---

### Group A Tier 1 — G4183 πολύς（4件）

**背景**: G4183 πολύς は NT に303件存在。通常 chip「多くの」は形容詞的用法（大量・多数）に正確。
4件は副詞的対格（accusative of specification）または具格（instrumental dative）として動詞を修飾する副詞的用法であり、形容詞ラベル「多くの」と実用法の乖離がある。

---

**RC-11: MAT 9:14!15**

| フィールド | 値 |
|-----------|---|
| text | πολλά |
| morph | A-APN (accusative plural neuter) |
| current japanese | 多くの |
| english | often |
| gloss | （空） |

文脈: MAT 9:14「私たちとパリサイ人たちは断食をしばしば（πολλά）するのに」。
副詞的対格（πολλά = 「しばしば・何度も」）。動詞 νηστεύομεν（断食する）を修飾。
「多くの」（形容詞的）では頻度の意味が伝わらない。

**判定: APPROVED_FOR_CHANGE → しばしば（HIGH）**

---

**RC-12: MRK 3:12!2**

| フィールド | 値 |
|-----------|---|
| text | πολλὰ |
| morph | A-APN |
| current japanese | 多くの |
| english | sternly |
| gloss | much |

文脈: MRK 3:12「そして彼はしきりに（πολλὰ）彼らに戒められた」（πολλὰ ἐπετίμα αὐτοῖς）。
副詞的対格（πολλά = 「強く・しきりに」）。動詞 ἐπιτιμάω（戒める・叱責する）を修飾する強意副詞。
「多くの」は量的形容詞で強意副詞として機能しない。

**判定: APPROVED_FOR_CHANGE → 〜厳しく（MEDIUM）**

注: "sternly" に対応する「厳しく」を推奨。〜 prefix は Group D 規則に従い維持（πολλά の副詞的用法はGroup D chip 規則に近い）。

---

**RC-13: MRK 5:43!4**

| フィールド | 値 |
|-----------|---|
| text | πολλὰ |
| morph | A-APN |
| current japanese | 多くの |
| english | strictly |
| gloss | strictly |

文脈: MRK 5:43「そして彼は厳しく（πολλὰ）彼らに命じた」（πολλὰ διεστείλατο αὐτοῖς）。
副詞的対格。動詞 διαστέλλομαι（命じる・厳命する）を修飾する強意副詞。
english/gloss ともに "strictly"。

**判定: APPROVED_FOR_CHANGE → 〜厳しく（MEDIUM）**

---

**RC-14: PHP 1:23!16**

| フィールド | 値 |
|-----------|---|
| text | πολλῷ |
| morph | A-DSN (dative singular neuter) |
| current japanese | 多くの |
| english | very |
| gloss | very much |

文脈: PHP 1:23「キリストと共にいることははるかに（πολλῷ）まさっているから」（πολλῷ γὰρ μᾶλλον κρεῖσσον）。
具格の与格（dative of degree）: πολλῷ μᾶλλον = "by much more" = "far more"。
「多くの」は形容詞的で比較の程度副詞として機能しない。

**判定: APPROVED_FOR_CHANGE → はるかに（HIGH）**

---

### Group A Tier 1 — G2983 λαμβάνω（2件）

**背景**: G2983 λαμβάνω は NT に258件。通常 chip「受ける」は受動・受領的意味（receive）。
2件は能動的「取る」（take/grasp）の用法であり、「受ける」では方向性が反転する。

---

**RC-15: 1CO 11:23!20**

| フィールド | 値 |
|-----------|---|
| text | ἔλαβεν |
| morph | V-2AAI-3S (2nd aorist active indicative 3rd singular) |
| current japanese | 受ける |
| english | took |
| gloss | took |

文脈: 1CO 11:23「主イエスは引き渡された夜に、パンを取り（ἔλαβεν）」。
2nd aorist active。ἔλαβεν = "he took" (能動・積極的取得）。
english/gloss ともに "took"。
「受ける」（他動詞受動的：受け取られる）は意味の向きが異なる。JA1955「パンをとり」と一致。

**判定: APPROVED_FOR_CHANGE → 取る（HIGH）**

morph 展開: V-2AAI-3S + 「取る」→ Tier2 aorist active = 「取った」（正常な過去形）

---

**RC-16: MAT 17:24!10**

| フィールド | 値 |
|-----------|---|
| text | λαμβάνοντες |
| morph | V-PAP-NPM (present active participle nominative plural masculine) |
| current japanese | 受ける |
| english | collectors |
| gloss | collecting |

文脈: MAT 17:24「二ドラクマを徴収する者たち（λαμβάνοντες τὰ δίδραχμα）」。
現在分詞能動形（実質的「徴収人たち」）。english="collectors"（徴収人）、gloss="collecting"。
「受ける」（受動的受領）では「取り立てる・徴収する」の能動性が失われる。

**判定: APPROVED_FOR_CHANGE → 取る（HIGH）**

morph 展開: V-PAP-NPM + 「取る」→ Tier2 participle = 「取る者」（正常展開）

---

### Group A Tier 1 — G3056 λόγος（1件）

---

**RC-17: ROM 14:12!6**

| フィールド | 値 |
|-----------|---|
| text | λόγον |
| morph | N-ASM (accusative singular masculine) |
| current japanese | ことば |
| english | account |
| gloss | account |

文脈: ROM 14:12「そのようなわけで、私たちはめいめい自分のことについて神に申し開き（λόγον）をすることになる」（λόγον δώσει τῷ θεῷ）。
λόγον δίδωμι（λόγος + 与える）= 「申し開きをする・弁明する」（法律的・会計的「計算を出す」語法）。
english/gloss ともに "account"。
「ことば」（言語・言葉）ではこの「弁明・勘定」義を表現できない。JA1955「申し開きをする」と対応。

**判定: APPROVED_FOR_CHANGE → 申し開き（HIGH）**

morph 展開: N-ASM + 「申し開き」→ 名詞、Tier2 は基本形返却（活用なし）

---

### Group A Tier 1 — G4160 ποιέω（1件）

---

**RC-18: MAT 7:17!14**

| フィールド | 値 |
|-----------|---|
| text | ποιεῖ |
| morph | V-PAI-3S (present active indicative 3rd singular) |
| current japanese | 行う |
| english | bears |
| gloss | produces |

文脈: MAT 7:17「同じように、良い木はみな良い実を結び（ποιεῖ）、腐った木は悪い実を結ぶ（ποιεῖ）」。
「実を結ぶ」という農業的文脈。english="bears"、gloss="produces"。
「行う」（人が行為を行う）では植物が実を産出する意味を反映できない。
JA1955「よい実を結ぶ」と対応。

**判定: APPROVED_FOR_CHANGE → 結ぶ（HIGH）**

morph 展開: V-PAI-3S + 「結ぶ」→ 現在直説法基本形 = 「結ぶ」（変化なし）。brokenNew リスクなし。

注: MAT 7:17!7（同一形 ποιεῖ）はこの Phase の対象外だが、同一判断を適用することが望ましい（UNREVIEWED）。

---

### Group A Tier 2 — G3860 παραδίδωμι（1件）

---

**RC-19: MRK 4:29!3**

| フィールド | 値 |
|-----------|---|
| text | παραδοῖ |
| morph | V-2AAS-3S (2nd aorist active subjunctive 3rd singular) |
| current japanese | 引き渡す |
| english | ripe |
| gloss | offers itself |

文脈: MRK 4:29「実が熟すると（παραδοῖ ὁ καρπός）すぐに鎌を入れる。収穫の時が来たから。」
農業的イディオム: καρπός（実・穀物）が主語で παραδίδωμι = 「実が実りを差し出す/熟す」。
english="ripe"、gloss="offers itself"。
標準義「引き渡す/裏切る」は農業文脈に不適合。JA1955「実が熟すると」に対応。

**判定: APPROVED_FOR_CHANGE → 熟する（HIGH）**

morph 展開: V-2AAS-3S（仮定法アオリスト） + 「熟する」→ Tier2 は「熟する」（基本形を条件形に展開する可能性あり）。
「熟するなら/熟したら」は文法的に正当。brokenNew リスク: LOW。

---

### Group D — G5616 ὡσεί（11件）

**背景**: G5616 ὡσεί は NT に11件。現在の chip「〜のように」は比較（ὡς + εἰ = as if / like）の意味。
しかし NT の全11件は数・時間・距離の前に置かれ「約〜 / およそ〜」という近似表現として機能する。
「〜のように」（比較的）と「〜ほど」（近似的）は意味的に別であり、全11件で乖離が確認される。

---

**RC-20: MAT 14:21!6**

文脈: MAT 14:21「食べた者は、女と子供のほかに、約（ὡσεὶ）五千人の男がいた」。
english="about"。近似用法（数量）。

**判定: APPROVED_FOR_CHANGE → 〜ほど（HIGH）**

---

**RC-21: LUK 3:23!6**

文脈: LUK 3:23「イエスは活動を始めた時、約（ὡσεὶ）三十歳であった」。
english="about"。近似用法（年齢）。

**判定: APPROVED_FOR_CHANGE → 〜ほど（HIGH）**

---

**RC-22: LUK 9:14!3**

文脈: LUK 9:14「五千人ほど（ὡσεὶ）の男がいた」。
english="about"。近似用法（人数）。

**判定: APPROVED_FOR_CHANGE → 〜ほど（HIGH）**

---

**RC-23: LUK 9:14!15**

文脈: LUK 9:14「五十人ほど（ὡσεὶ）ずつの組にして」（κλισίας ὡσεὶ ἀνὰ πεντήκοντα）。
english="about"。近似用法（組の人数）。同節に2件存在。

**判定: APPROVED_FOR_CHANGE → 〜ほど（HIGH）**

---

**RC-24: LUK 9:28!7**

文脈: LUK 9:28「約（ὡσεὶ）八日の後」（ὡσεὶ ἡμέραι ὀκτώ）。
english="about"。近似用法（時間）。

**判定: APPROVED_FOR_CHANGE → 〜ほど（HIGH）**

---

**RC-25: LUK 22:41!6**

文脈: LUK 22:41「石を投げるほど（ὡσεὶ λίθου βολήν）ほどの距離だけ離れた」。
english="about"。近似用法（距離）。

**判定: APPROVED_FOR_CHANGE → 〜ほど（HIGH）**

---

**RC-26: LUK 22:59!3**

文脈: LUK 22:59「約（ὡσεὶ）一時間後に」（ὡσεὶ ὥρας μιᾶς）。
english="about"。近似用法（時間）。

**判定: APPROVED_FOR_CHANGE → 〜ほど（HIGH）**

---

**RC-27: LUK 23:44!4**

文脈: LUK 23:44「約（ὡσεὶ）六時から」（ὡσεὶ ὥρα ἕκτη）。
english="about"。近似用法（時刻）。

**判定: APPROVED_FOR_CHANGE → 〜ほど（HIGH）**

---

**RC-28: ACT 2:41!16**

文脈: ACT 2:41「その日に約（ὡσεὶ）三千人の魂が加わった」。
english="about"。近似用法（人数）。

**判定: APPROVED_FOR_CHANGE → 〜ほど（HIGH）**

---

**RC-29: ACT 10:3!5**

文脈: ACT 10:3「約（ὡσεὶ）第九時の頃に、幻の中でくっきりと…天使が入ってくるのを見た」。
english="about"。近似用法（時刻）。gloss="as if"（字義的だが文脈は近似）。

**判定: APPROVED_FOR_CHANGE → 〜ほど（HIGH）**

---

**RC-30: ACT 19:7!6**

文脈: ACT 19:7「みんなで約（ὡσεὶ）十二人ほどいた」（ἄνδρες ὡσεὶ δώδεκα）。
english="about"。近似用法（人数）。

**判定: APPROVED_FOR_CHANGE → 〜ほど（HIGH）**

---

### Group D — G5228 ὑπέρ（1件）

---

**RC-31: 2CO 11:23!6**

| フィールド | 値 |
|-----------|---|
| text | ὑπὲρ |
| morph | PREP |
| current japanese | 〜のために |
| english | more |
| gloss | above [measure] |

文脈: 2CO 11:23「彼らはキリストの執事か。狂気じみたことを言うが、私はそれにまさって（ὑπὲρ ἐγώ）そうだ」（ὑπὲρ ἐγώ = 比較省略構文）。
比較副詞的用法: ὑπέρ + 人称代名詞 = 「それ以上に・まさって」。
english="more"、gloss="above [measure]"。
「〜のために」（目的前置詞）はこの比較用法に全く対応しない。
Phase 4b 注記: 「副詞的比較用法。ラベルと実用法の乖離」。

**判定: APPROVED_FOR_CHANGE → 〜まさって（HIGH）**

morph 展開: PREP + 「〜まさって」→ 副詞/助詞形、Tier2 変化なし

---

## 4. 全件照合

### 4.1 判定サマリー

| 判定 | 件数 | 内訳 |
|------|------|------|
| APPROVED_FOR_CHANGE | **31** | 全件 |
| CONFIRM_CURRENT | 0 | — |
| HOLD_CONTEXT | 0 | — |
| HOLD_LEXICAL | 0 | — |
| HOLD_DATA_QUALITY | 0 | — |
| RECLASSIFY | 0 | — |

### 4.2 Strong 別内訳

| Strong | lemma | 件数 | 判定 | 推奨訳語 |
|--------|-------|------|------|---------|
| G3762 | οὐδείς | 10 | APPROVED | 何も〜ない |
| G4183 | πολύς | 4 | APPROVED | しばしば/〜厳しく/はるかに |
| G2983 | λαμβάνω | 2 | APPROVED | 取る |
| G3056 | λόγος | 1 | APPROVED | 申し開き |
| G4160 | ποιέω | 1 | APPROVED | 結ぶ |
| G3860 | παραδίδωμι | 1 | APPROVED | 熟する |
| G5616 | ὡσεί | 11 | APPROVED | 〜ほど |
| G5228 | ὑπέρ | 1 | APPROVED | 〜まさって |
| **合計** | | **31** | | |

### 4.3 確信度別件数

| 確信度 | 件数 | 該当 ref |
|--------|------|---------|
| HIGH | 25 | G3762×9, G4183×2(MAT9/PHP1), G2983×2, G3056, G4160, G3860, G5616×11, G5228 |
| MEDIUM | 6 | G3762×1(JHN 16:29!12), G4183×2(MRK3/MRK5) |
| LOW | 0 | — |

### 4.4 ref 全件登場確認

31件すべてが一度ずつ登場することを確認した。

| # | ref | Strong | 判定 |
|---|-----|--------|------|
| 1 | ACT 28:17!22 | G3762 | APPROVED → 何も〜ない |
| 2 | HEB 2:8!13 | G3762 | APPROVED → 何も〜ない |
| 3 | JHN 11:49!17 | G3762 | APPROVED → 何も〜ない |
| 4 | JHN 16:23!9 | G3762 | APPROVED → 何も〜ない |
| 5 | JHN 16:29!12 | G3762 | APPROVED → 何も〜ない |
| 6 | LUK 23:15!11 | G3762 | APPROVED → 何も〜ない |
| 7 | LUK 23:22!12 | G3762 | APPROVED → 何も〜ない |
| 8 | MAT 23:18!8 | G3762 | APPROVED → 何も〜ない |
| 9 | PHM 1:14!6 | G3762 | APPROVED → 何も〜ない |
| 10 | TIT 1:15!10 | G3762 | APPROVED → 何も〜ない |
| 11 | MAT 9:14!15 | G4183 | APPROVED → しばしば |
| 12 | MRK 3:12!2 | G4183 | APPROVED → 〜厳しく |
| 13 | MRK 5:43!4 | G4183 | APPROVED → 〜厳しく |
| 14 | PHP 1:23!16 | G4183 | APPROVED → はるかに |
| 15 | 1CO 11:23!20 | G2983 | APPROVED → 取る |
| 16 | MAT 17:24!10 | G2983 | APPROVED → 取る |
| 17 | ROM 14:12!6 | G3056 | APPROVED → 申し開き |
| 18 | MAT 7:17!14 | G4160 | APPROVED → 結ぶ |
| 19 | MRK 4:29!3 | G3860 | APPROVED → 熟する |
| 20 | MAT 14:21!6 | G5616 | APPROVED → 〜ほど |
| 21 | LUK 3:23!6 | G5616 | APPROVED → 〜ほど |
| 22 | LUK 9:14!3 | G5616 | APPROVED → 〜ほど |
| 23 | LUK 9:14!15 | G5616 | APPROVED → 〜ほど |
| 24 | LUK 9:28!7 | G5616 | APPROVED → 〜ほど |
| 25 | LUK 22:41!6 | G5616 | APPROVED → 〜ほど |
| 26 | LUK 22:59!3 | G5616 | APPROVED → 〜ほど |
| 27 | LUK 23:44!4 | G5616 | APPROVED → 〜ほど |
| 28 | ACT 2:41!16 | G5616 | APPROVED → 〜ほど |
| 29 | ACT 10:3!5 | G5616 | APPROVED → 〜ほど |
| 30 | ACT 19:7!6 | G5616 | APPROVED → 〜ほど |
| 31 | 2CO 11:23!6 | G5228 | APPROVED → 〜まさって |

---

## 5. 設計上の注記

### G3762 οὐδείς — 分割ラベル設計

今回変更する10件（neuter/feminine 形）に「何も〜ない」を採用した場合、G3762 の bible_data 内に:
- masculine 形 129件: 「誰も〜ない」（UNCHANGED）
- neuter 形 94件: 10件→「何も〜ない」（本 Phase）、残り84件は UNREVIEWED
- feminine 形 11件: 「誰も〜ない」（UNREVIEWED, 個別確認要）

という状態が生まれる。これは意図的な分割（masculine = 人格否定、neuter = 事物否定）であり、L-0 に反しない。残り84件の neuter G3762 は Stage 4 UNREVIEWED 範囲に属し、別 Phase の対象となる。

### G4183 πολύς — 副詞的用法ラベル

4件は形容詞 πολύς が副詞的に機能する用法（adverbial accusative / instrumental dative）。
「多くの」は形容詞的用法に正確だが、副詞的用法では意味が一致しない。
推奨ラベルは各文脈の english/gloss に基づく（しばしば/〜厳しく/はるかに）。
G4183 NT 全303件のうち副詞的用法はこの4件のみが REVISION_CANDIDATE。

### G5616 ὡσεί — 全件「〜ほど」

NT 全11件（全 G5616 tokens）が REVISION_CANDIDATE であるため、G5616 の chip label を全件「〜ほど」に統一することになる。これは設計上一貫しており、単純。

---

## 6. morph 展開影響まとめ

| Strong | 推奨訳語 | morph | Tier2 展開予測 | risk |
|--------|---------|-------|--------------|------|
| G3762 | 何も〜ない | A-ASN/NSN/ASF | 形容詞基本形 = 変化なし | NONE |
| G4183 MAT9 | しばしば | A-APN | 副詞基本形 = 変化なし | NONE |
| G4183 MRK3/5 | 〜厳しく | A-APN | 副詞基本形 = 変化なし | NONE |
| G4183 PHP1 | はるかに | A-DSN | 副詞基本形 = 変化なし | NONE |
| G2983 1CO | 取る | V-2AAI-3S | 「取った」（aorist past） | LOW |
| G2983 MAT | 取る | V-PAP-NPM | 「取る者」（participle） | LOW |
| G3056 | 申し開き | N-ASM | 名詞基本形 = 変化なし | NONE |
| G4160 | 結ぶ | V-PAI-3S | 「結ぶ」（base form） | NONE |
| G3860 | 熟する | V-2AAS-3S | 「熟する」or「熟した」 | LOW |
| G5616 | 〜ほど | ADV | 副詞基本形 = 変化なし | NONE |
| G5228 | 〜まさって | PREP | 副詞形 = 変化なし | NONE |

brokenNew が懸念されるのは G2983（2件）と G3860（1件）のみ（MEDIUM → 実装後 re-stageB で確認要）。

---

## 7. 次フェーズへの引き継ぎ

| 分類 | 内容 | 次アクション |
|------|------|------------|
| 実装可能 | APPROVED_FOR_CHANGE 31件 | Phase 4ad: 実装・検証 |
| 要追加審査 | G3762 neuter 残84件（UNREVIEWED） | 別 Phase |
| 要追加審査 | G3762 feminine 11件（UNREVIEWED） | 別 Phase |
| 要追加審査 | G4160 MAT 7:17!7（同一 Strong/morph, UNREVIEWED） | 別 Phase |

---

**PHASE 4ac AUDIT PASS — 31件全件 APPROVED_FOR_CHANGE**

実装可能件数: 31件
保留件数: 0件
次フェーズ候補: Phase 4ad — REVISION_CANDIDATE 31件実装・downstream 検証
