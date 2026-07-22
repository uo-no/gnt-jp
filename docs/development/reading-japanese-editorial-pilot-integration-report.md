# Reading Japanese Editorial Pilot Integration Report(Stage M-10)

実施日: 2026-07-22
位置づけ: **M-9 Editorial Review Integration で確定した Workflow を、代表章(JHN 1)で実運用**し、
判定工程・入力契約・原因分類が機能することを検証する。**評価のみ・bible_data.japanese は変更しない**。
根拠(FROZEN): reading-japanese-policy.md(L-0)・-editorial-review-framework.md(M-5)・
-editorial-pilot-report.md(M-6)・-editorial-review-integration-design.md(M-9)・
-builder-adoption-integration-freeze.md(M-8f)。
数値はクリーン NT 実測(setCorpus=NT 全 137,741・JHN 1=51 verse・重複「 2.json」不在)。

**本 Stage はコード・データ・bible_data を一切変更しない(評価のみ)。**

---

## 1. 対象章

- **JHN 1(ヨハネ 1 章・book 43)**。M-6 と同一章で**比較可能**。Morph Adoption・Syntax Adoption・
  Discourse Pending・Semantic metadata をすべて含む代表章。

## 2. verse 数

- **51 verse**(v1〜v51)。chapter 全 verse を対象。

## 3. Builder adoption 件数

| 種別 | 件数 |
|---|---|
| **Morph adoption** | **63**(αὐτός 彼→彼ら・関係詞 〜する者・複数人称 私たち/あなた自身・分詞 等) |
| **Syntax adoption** | **1**(v31: この→これ・pronominal neuter=verb 参照) |

- 採用は Builder 出力の `morphAdopted`/`syntaxAdopted` と**一致**(diff 一致)。bible_data 代表語は不変。

## 4〜6. Status 集計

| Status | 件数 | M-6 比較 |
|---|---|---|
| **Accepted** | **34** | M-6=30(+4) |
| **Revise Required** | **0** | M-6=0(一致) |
| **Pending** | **17** | M-6=21(−4) |

- **Revise=0 を再確認**(M-6 と一致)。**破損・翻訳化・誤解はゼロ**=保守的な Morph/Syntax 採用は
  editorial 問題を持ち込まない。
- **Accepted +4 / Pending −4**: 統合 Workflow では Morph 採用(私たち/彼ら/〜する者 等)が反映されるため、
  M-6 で Pending だった一部が **決定済み fact の適切反映**として Accepted へ。**判定基準は変えていない**
  (Pending は Engine 側不足のみ)。

## 7. Pending 原因分類(のべ)

| 原因層 | のべ件数 | 内容 |
|---|---|---|
| **Discourse** | 14 | demonstrative 未判定(οὗτος/ἐκεῖνος の この/その距離・pronominal/adnominal 未決定) |
| **Semantic** | 2 | 副詞的 τί(v25・なぜ vs 何)/ 不定詞レンダリング(v46・τις「ある」) |
| **Corpus** | 2 | referent 不在(v22・v51) |
| Morph | 0 | — |
| Syntax | 0 | — |

- **Pending 17 verse はすべて Engine 側不足**(Discourse/Semantic/Corpus)。**Editorial 起因の問題は 0**。
- **Pending と Revise は混同していない**: Revise は「決定的根拠で修正可能な問題」(=0)、Pending は
  「情報不足・未判定」(=17・全件理由記録)。

## 8. 代表 verse walkthrough

### v1 — Accepted(採用なし・純 Data)
`〜の中に｜初めに｜〜である｜［冠詞］｜ことば｜そして｜［冠詞］｜ことば｜〜である｜〜のもとに｜［冠詞］｜神を｜…`
- 構造忠実・読解可能・非破損。採用も未判定もなし → **Accepted**。

### v12 — Accepted(Morph adoption 4)
`〜する者｜［転換語句］｜受ける｜彼を｜与える｜彼らに｜権威を｜子を｜神の｜なること｜…`
- adoption: 〜するだけ**→〜する者**(関係詞)/ 彼**→彼ら**(αὐτός 複数)/ なる→なること / 信じる→信じながら。
- number/relative の**決定済み fact が適切反映**・破損なし → **Accepted**。

### v31 — Accepted(唯一の Syntax adoption)
`私も｜〜ない｜知る｜彼を｜［対比語句］｜［目的語句］｜現される｜［冠詞］｜イスラエルに｜〜によって｜これ｜来る｜私｜…`
- adoption: 現す→現される / **この→これ(S・pronominal neuter=verb 参照)** / バプテスマを施す→施しながら。
- pronominal neuter が **verb 参照として これ**に採用(referent=verb・discourse 非混入) → **Accepted**。

### v2 — Pending(Discourse)
`この｜〜である｜〜の中に｜初めに｜〜のもとに｜［冠詞］｜神を`
- οὗτος が **この**(demonstrative 未判定・この方/彼 の pronominal/adnominal・距離が discourse 依存)
  → **Pending(Discourse)**。推論で埋めない。

### v22 — Pending(Corpus)+ adoption 3
`言う｜［結論語句］｜彼に｜誰｜〜である｜…｜送る｜私たちを｜何を｜言う｜〜について｜あなた自身の`
- adoption: 私→私たち / 誰→何 / 自分自身→あなた自身(いずれも決定済み・反映済)。
- ただし referent 不在のトークンあり → **Pending(Corpus)**。**採用と Pending は併存**(採用は記録・
  verse は corpus 不足で Pending)。

### v25 — Pending(Semantic)
`…｜言う｜彼に｜何を｜［結論語句］｜バプテスマを施す｜…`
- 副詞的 τί(role=adv)が **何を** のまま(なぜ/どう=word 選択非一意・M-8e) → **Pending(Semantic)**。

## 9. M-11 への課題整理

| 課題 | 対応先(将来層) |
|---|---|
| **Discourse Pending が最大(14/17)**: demonstrative の この/その距離・pronominal/adnominal | **Discourse Layer**(M-7f・最優先) |
| **Semantic 非一意**: 副詞的 τί(なぜ)・不定詞 τις(ある/誰か) | 副詞的疑問層 / 不定詞レンダリング層 |
| **Corpus 不在**: referent 未注釈 | 注釈拡充 / Corpus 補完 |
| **全巻集計基盤**: 7,939 verse を status 集計する反復インフラ | **M-11 Full Review Infrastructure** |
| Accepted/Pending の verse 台帳・原因層別ダッシュボード | M-11 |

---

## QA

| 項目 | 結果 |
|---|---|
| **bible_data 不変** | git diff 空(評価のみ・status 産出) |
| **Builder output 不変** | builder.js 非改変・adoption 出力は M-8d/M-8f と同一 |
| **adoption diff 一致** | morphAdopted 63 / syntaxAdopted 1 が Builder 出力と一致 |
| **chip⇔panel 100%** | engine.resolve 参照=不変・破損 0 |
| **regression ALL PASS** | engine 8 + Builder(re-m8d)= **全 9 ALL PASS** |
| **推論混入 0** | Discourse/Semantic 判断を代行せず Pending 化・語義選択/自然化 0 |
| **Pending 理由記録あり** | 17 verse 全件に原因層 + 理由を記録 |

---

## 完了条件

| 完了条件 | 充足 |
|---|---|
| Editorial Workflow が実際に動作する | ✓ JHN 1・51 verse を 8 工程で判定 |
| verse 単位判定できる | ✓ Accepted 34 / Revise 0 / Pending 17 |
| Accepted / Revise / Pending が区別される | ✓ Revise=決定的問題(0)/ Pending=情報不足(17) |
| Pending 原因層が分類できる | ✓ Discourse 14 / Semantic 2 / Corpus 2 |
| Builder と Editorial の責務混同なし | ✓ Builder=採用記録(不変)/ Editorial=成果物 reading の verse 評価 |
| bible_data.japanese 未変更 | ✓ diff 空 |
| L-0〜M-9 と矛盾なし | ✓ 推論禁止・未判定維持・一意性の勾配 |

---

## 最重要判断

- **統合 Workflow は実運用で機能した**。JHN 1 で **Accepted 34 / Revise 0 / Pending 17** を産出し、
  **Revise=0(破損・翻訳化・誤解ゼロ)を M-6 と同じく確認**。**Pending は全て Engine 側不足**
  (Discourse 14/Semantic 2/Corpus 2)で、**Editorial 起因の問題は 0**。
- **Builder adoption 情報が Editorial に正しく渡り**(Morph 63/Syntax 1)、**採用と Pending が併存する
  verse(v22)も正しく処理**できた(採用は記録・verse は別トークンの corpus 不足で Pending)。
- **L-0 推論禁止が Editorial Workflow でも維持**された。demonstrative の この/その、副詞的 τί の なぜ、
  不定詞 τις の語選択を **代行せず Pending 化**し、将来層(Discourse Layer 等)へ構造化して渡した。
- **最大の課題は Discourse Pending(14/17)** であり、M-11 以降で **Discourse Layer** と
  **全巻集計インフラ**が最優先となる。

---

## 凍結(候補)

```
[reading-japanese-editorial-pilot-integration-report FROZEN候補 2026-07-22]
対象: JHN1(book43)・51verse。評価のみ・bible_data不変・コード非改変
adoption: Morph63 / Syntax1（v31 この→これ）。Builder出力と一致
Status: Accepted34 / Revise0 / Pending17（M-6=30/0/21比較・Morph採用反映でAccepted+4/Pending-4・基準不変）
Pending原因(のべ): Discourse14（demonstrative未判定）/ Semantic2（副詞的τί v25・不定詞τις v46）/ Corpus2（referent不在 v22/v51）。Morph0/Syntax0/Editorial0
walkthrough: v1純Data Accepted / v12 Morph採用4 Accepted / v31 唯一Syntax採用 Accepted / v2 Discourse Pending / v22 採用3+Corpus Pending併存 / v25 Semantic Pending
QA: bible_data不変(diff空) / Builder output不変 / adoption diff一致 / chip⇔panel100% / 回帰全9 ALL PASS / 推論混入0 / Pending理由全件記録
検証成功: 5目的（adoption伝達/verse判定/原因分類/Pending≠Revise/推論禁止維持）すべて充足
M-11課題: Discourse Layer最優先(14/17) + 全巻7939verse集計インフラ
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結候補(JHN1 Pilot Integration・Accepted34/Revise0/Pending17・原因層Discourse14/Semantic2/Corpus2・6 walkthrough・M-6比較・M-11 課題=Discourse Layer + 全巻集計) |
