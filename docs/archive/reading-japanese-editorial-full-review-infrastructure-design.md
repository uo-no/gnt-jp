# Reading Japanese Editorial Full Review Infrastructure Design(Stage M-11)

策定日: 2026-07-22
位置づけ: **NT 全巻 7,939 verse を対象に、Reading Japanese Editorial Review を管理する基盤**を設計する。
M-10 で実データ成立した Workflow を、全巻の verse 台帳として管理可能にする。
根拠(FROZEN): reading-japanese-policy.md(L-0)・-editorial-review-integration-design.md(M-9)・
-editorial-pilot-integration-report.md(M-10)・-builder-adoption-integration-freeze.md(M-8f)。

**本 Stage はインフラ設計のみ。bible_data.japanese / Builder logic / Morph Registry / Syntax / Semantic /
Discourse / reading-engine.js は変更しない。** 数値はクリーン NT 実測(7,939 verse・重複「 2.json」不在)。

---

## 0. 目的と非目的

- **目的**: NT 全巻 verse 単位で **Review status / Builder adoption 状況 / Pending 原因 / 原因層 /
  将来解決対象**を管理可能にする(台帳と集計の形式確定)。
- **非目的(本 Stage で行わない)**: bible_data 修正・Reading Japanese 修正・Discourse 解決・
  Semantic 解決・Morph/Syntax 拡張・Builder logic 変更。**判定の実行は M-12**。

---

## 1. 管理単位

- **最小管理単位 = verse**(**7,939 verse**)。token / phrase / clause は**補助情報**(Pending の原因確認・
  `tokens[]` 参照用)。**最終 status は verse 単位**。

---

## 2. Review Record Schema

各 verse に 1 レコードを保持する(Editorial Review が産出・bible_data とは分離した台帳)。

```json
{
  "verseId": "n43001002",
  "status": "Accepted | Revise Required | Pending",
  "adoption": {
    "morphCount": 0,
    "syntaxCount": 0
  },
  "pending": [
    {
      "layer": "Morph | Syntax | Semantic | Discourse | Corpus | Editorial",
      "reason": "決定的情報不足の記述（推論でない）",
      "tokens": ["補助: 原因トークンの verseId 群"]
    }
  ],
  "reviewNotes": "",
  "source": "editorial-review"
}
```

| フィールド | 内容・制約 |
|---|---|
| `verseId` | verse キー(先頭 9 桁 `n`+book+chap+verse)。**主キー** |
| `status` | Accepted / Revise Required / Pending のいずれか一意 |
| `adoption.morphCount` / `syntaxCount` | Builder の `morphAdoptedCount` / `syntaxAdoptedCount`(採用状況) |
| `pending[]` | status=Pending のとき **1 件以上**(Accepted/Revise では空)。各要素は `{layer, reason, tokens}` |
| `pending[].layer` | 6 原因層のいずれか一意 |
| `pending[].reason` | **理由必須**・決定的情報不足の記述(推論・語義選択を含めない) |
| `pending[].tokens` | 補助(原因トークン)・空可 |
| `reviewNotes` | 任意(破損修正の記録等) |
| `source` | 固定 `editorial-review`(bible_data 由来でないことを明示) |

- **Record は bible_data.japanese を書き換えない**(別台帳)。Reading Japanese は Builder が verse 単位で
  再生成でき、Record は status/pending のみを保持する。

---

## 3. Pending 分類(6 原因層)

| 原因層 | 分類ルール(いつ Pending にするか) |
|---|---|
| **Morph** | 語形情報不足(number/person/gender が決定できず reading に反映不能) |
| **Syntax** | 構造情報不足(role/referent/head が未注釈で構造反映不能) |
| **Semantic** | 語義決定不能(lnDomain gloss 選択・不定詞・intensive・3 人称再帰・副詞的 τί=非一意) |
| **Discourse** | 指示・談話関係不足(demonstrative の この/その距離・pronominal/adnominal 未判定) |
| **Corpus** | 注釈不足(referent 不在・自由関係・欠落注釈) |
| **Editorial** | 表示・品質問題(破損形・chip⇔panel 不整合。修正可能なら Revise) |

- **原因層は verse×token 単位で一意**に割り当てる(1 トークンの 1 問題は 1 層)。verse が複数層を持つ場合
  `pending[]` に複数要素を格納する。
- **Pending は品質不良でなく「決定的情報不足の記録」**(L-0・M-10)。**推論で解決しない**。

---

## 4. 集計項目(全巻取得可能)

以下を NT 全巻について取得可能とする。

| 集計 | 定義 |
|---|---|
| 総 verse 数 | Record 総数(7,939) |
| Accepted / Revise Required / Pending | status 別 verse 数 |
| Pending layer 別 | Morph / Syntax / Semantic / Discourse / Corpus(verse 数・重複計上可) |
| Morph adoption verse 数 | `adoption.morphCount > 0` の verse 数 |
| Syntax adoption verse 数 | `adoption.syntaxCount > 0` の verse 数 |

### 4-1. Feasibility 実証(M-10 同一基準・全巻 read-only 集計)

| 指標 | 実測 |
|---|---|
| **総 verse** | **7,939** |
| **Accepted** | **5,082(64.0%)** |
| **Revise Required** | **0** |
| **Pending** | **2,857(36.0%)** |
| Pending layer: Discourse | 1,350 |
| Pending layer: Corpus | 1,259 |
| Pending layer: Semantic | 841 |
| Pending layer: Morph / Syntax | 0 / 0 |
| 複数 layer Pending verse | 555 |
| Morph adoption verse | 6,708 |
| Syntax adoption verse | 171 |
| 検算(A+R+P) | 7,939 ✓ |

- **集計はすべて計算可能**(A+R+P=7,939 で整合)。**Revise=0 を全巻で確認**(破損なし)。
- **Pending 2,857(36%)は全て Engine 側不足**(Discourse 最大 1,350・Corpus 1,259・Semantic 841)。
  **Morph/Syntax=0**(採用は完了・不足なし)、**Editorial=0**(表示品質問題なし)。
- これは **M-12 Full Review Execution の baseline**であり、M-10 パイロット(JHN 1)と同一基準の拡張。

---

## 5. 禁止事項(本 Stage で行わない)

- bible_data 修正 / Reading Japanese 修正 / Discourse 解決 / Semantic 解決 / Morph・Syntax 拡張 /
  Builder logic 変更。**本 Stage は台帳・集計の形式確定のみ**(判定実行は M-12)。

---

## 6. QA

| 項目 | 確認 |
|---|---|
| **M-10 Workflow と同一基準** | status 判定・Pending 分類が M-10 と同一(JHN 1 で Accepted34/Revise0/Pending17 を再現可能) |
| **verse 単位維持** | 管理・集計はすべて verse 単位 |
| **Pending 理由必須** | `pending[].reason` を必須・空を許さない |
| **原因層一意** | 各 pending 要素の `layer` は 6 層のいずれか一意 |
| **推論混入 0** | reason は情報不足の記述のみ・語義選択/Discourse 判断を含めない |
| **bible_data 不変** | Record は別台帳・bible_data.japanese を書き換えない(diff 空) |

---

## 7. 完了条件

| 完了条件 | 充足 |
|---|---|
| NT 全巻レビュー管理形式確定 | ✓ Review Record Schema(verseId/status/adoption/pending/notes/source) |
| verse 単位 status 管理可能 | ✓ 7,939 verse・主キー verseId |
| Pending 原因管理可能 | ✓ 6 原因層 + reason 必須 + tokens 補助 |
| M-10 Pilot と同じ判定基準 | ✓ feasibility 集計で JHN 1 基準を全巻拡張(Revise=0 再現) |
| Builder と Editorial の責務分離維持 | ✓ Builder=採用記録(不変)/ Record=別台帳の status |
| L-0〜M-10 と矛盾なし | ✓ 推論禁止・未判定維持・bible_data 不変・一意性の勾配 |

---

## 8. 最重要判断

- **Editorial Review を「bible_data と分離した verse 台帳」として設計した**(`source=editorial-review`)。
  Record は status/adoption/pending のみを保持し、**bible_data.japanese を書き換えない**。Reading Japanese は
  Builder が verse 単位で再生成でき、台帳は評価結果だけを管理する。
- **全巻集計は計算可能で、baseline が確定した**: **Accepted 5,082(64%)/ Revise 0 / Pending 2,857(36%)**。
  **Pending は全て Engine 側不足**で、**Discourse(1,350)> Corpus(1,259)> Semantic(841)** の順。
  これは M-9/M-10 の非対称(一意性の勾配)と整合し、**将来層の優先順位(Discourse Layer 最優先)**を
  全巻規模で裏づける。
- **Pending は品質不良でなく決定的情報不足の記録**(L-0)。台帳が原因層を構造化して保持することで、
  **将来層(Discourse Layer/語義選択層/Corpus 拡充)への入力を漏れなく供給**する。判定実行は M-12。

---

## 凍結(候補)

```
[reading-japanese-editorial-full-review-infrastructure-design FROZEN候補 2026-07-22]
管理単位: verse（7,939）。token/phrase/clauseは補助。最終statusはverse
Schema: {verseId, status(Accepted|Revise|Pending), adoption{morphCount,syntaxCount}, pending[{layer,reason(必須),tokens}], reviewNotes, source=editorial-review}。bible_dataと分離した別台帳
Pending6層: Morph=語形不足 / Syntax=構造不足 / Semantic=語義決定不能 / Discourse=指示談話不足 / Corpus=注釈不足 / Editorial=表示品質。層はtoken単位で一意
集計項目: 総verse / Accepted / Revise / Pending / Pending layer別 / Morph採用verse / Syntax採用verse
Feasibility実証(M-10同一基準・全巻): 総7939 / Accepted5082(64%) / Revise0 / Pending2857(36%) / Discourse1350・Corpus1259・Semantic841・Morph0・Syntax0・Editorial0 / 複数層555 / Morph採用verse6708・Syntax採用verse171 / 検算A+R+P=7939✓
禁止: bible_data修正 / Reading修正 / Discourse解決 / Semantic解決 / Morph・Syntax拡張 / Builder変更
QA: M-10同一基準 / verse単位 / reason必須 / 原因層一意 / 推論混入0 / bible_data不変
baseline: M-12 Full Review Execution へ。Discourse Layer最優先
```

本設計は凍結可能な状態である。承認により FROZEN 化し、**M-12 Reading Japanese Editorial Full Review
Execution** で全巻 7,939 verse の Record を産出する(bible_data は引き続き不変)。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結候補(全巻レビュー基盤: Review Record Schema・6 原因層・集計項目・feasibility 実証 7,939verse=Accepted5082/Revise0/Pending2857・Discourse最大・M-12 baseline) |
