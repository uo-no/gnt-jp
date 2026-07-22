# Reading Japanese Editorial Full Review Report(Stage M-12)

実施日: 2026-07-22
位置づけ: **M-11 で確定した Review Record 台帳を用いて、NT 全巻 7,939 verse の Editorial Review 状態を
生成する**。レビュー状態生成のみ・**bible_data.japanese は変更しない**。
根拠(FROZEN): reading-japanese-policy.md(L-0)・-editorial-review-integration-design.md(M-9)・
-editorial-pilot-integration-report.md(M-10)・-editorial-full-review-infrastructure-design.md(M-11)・
-builder-adoption-integration-freeze.md(M-8f)。
数値はクリーン NT 実測(7,939 verse・重複「 2.json」不在)。

- **成果台帳**: `scripts/output/reading-japanese-editorial-review-records.json`
  (7,939 records・`source=editorial-review`・**bible_data と分離**)。
- **生成器**: `scripts/gen-editorial-review-records.cjs`(判定は M-10 同一基準・推論なし)。
- **本 Stage はコード判定ロジック・bible_data を変更しない**(Builder/Engine 非改変・台帳生成のみ)。

---

## 1. 対象範囲

- **New Testament 全巻**(27 書)。単位=verse。token/phrase/clause は原因確認用(`pending[].tokens`)。

## 2. 総 verse 数

- **7,939 verse**(Record 数 7,939・**検算 A+R+P=7,939**)。

## 3. Status 集計

| Status | 件数 | 割合 |
|---|---|---|
| **Accepted** | **5,082** | 64.0% |
| **Revise Required** | **0** | 0.0% |
| **Pending** | **2,857** | 36.0% |

- **Revise=0 を全巻で確認**(破損・fact 反映不整合なし)。M-10(JHN 1)の Revise=0 を全巻へ拡張。
- **Pending 2,857 は全て決定的情報不足**(品質不良ではない・L-0)。

## 4. Pending 原因層集計

| 原因層 | のべ(verse・重複計上) | 主原因(優先分類) |
|---|---|---|
| **Discourse** | 1,350 | **1,350** |
| **Corpus** | 1,259 | 818 |
| **Semantic** | 841 | 689 |
| Morph | 0 | 0 |
| Syntax | 0 | 0 |
| Editorial | 0 | 0 |
| **合計(主原因)** | — | **2,857** ✓ |

- **主原因の優先順**: ①直接 reading 影響 ②決定的情報不足 ③将来層責任 = **Discourse > Semantic > Corpus**。
  複数原因の verse(**555**)は `pending[]` に全原因を保持し、先頭を主原因とする。
- **Discourse が最大**(主原因 1,350・全 Pending の 47.3%)。次いで Corpus 818・Semantic 689。
- **Morph/Syntax=0**(採用完了・不足なし)、**Editorial=0**(表示品質問題なし)。

## 5. Builder adoption 集計

| 種別 | verse 数 |
|---|---|
| **Morph adoption verse**(morphCount>0) | **6,708** |
| **Syntax adoption verse**(syntaxCount>0) | **171** |

- 台帳の各 Record `adoption{morphCount,syntaxCount}` は Builder 出力と一致(M-8f 契約)。

## 6. 代表 walkthrough

### Accepted

- **n46001013(1CO 1:13)** — `status=Accepted`・`adoption={morphCount:4,syntaxCount:0}`・`pending=[]`。
  Morph 決定語形 4 件が適切反映・未判定なし・非破損 → **Accepted**。
- **n46001012(1CO 1:12)** — `adoption={morphCount:1,syntaxCount:1}`・`pending=[]`。
  **Morph と Syntax 採用が併存**し、いずれも決定済み fact の反映 → **Accepted**。

### Pending

- **n46001020(1CO 1:20)** — `status=Pending`・`pending=[{layer:Discourse, tokens:[n46001020009]}]`。
  demonstrative の pronominal/adnominal・談話距離が未判定(この/その/これ の選択は談話依存)
  → **Pending(Discourse)**。推論で埋めない。
- **n46001010(1CO 1:10)** — `status=Pending`・`adoption={morphCount:3}`・
  `pending=[{layer:Semantic, tokens:[…3件]},{layer:Corpus, tokens:[n46001010010]}]`。
  **複数層**(Semantic=語義非一意 / Corpus=referent 不在)。**主原因=Semantic**(優先順で先頭)、
  Corpus を保持。**Morph 採用 3 件は記録されつつ verse は Pending**(採用と Pending の併存)。

## 7. 将来層への課題一覧

| 課題 | 規模(主原因) | 対応先(将来層) | 優先 |
|---|---|---|---|
| **demonstrative の この/その距離・pronominal/adnominal** | Discourse 1,350 | **Discourse Layer** | **最優先** |
| **referent 注釈不在(構造リンク欠落)** | Corpus 818 | 注釈拡充 / Corpus 補完 | 高 |
| **語義非一意**(副詞的 τί・不定詞 τις・intensive・3 人称再帰) | Semantic 689 | 副詞的疑問層 / 不定詞層 / 3 人称再帰層 / 語義選択層 | 中 |
| 全巻台帳の反復更新・ダッシュボード | 7,939 verse | 台帳運用(M-13 以降) | — |

- **M-13 Reading Japanese Adoption Decision** は、本台帳(Accepted 5,082)を入力に **bible_data への
  反映可否**を判断する(本 Stage までは一貫して bible_data 不変)。

---

## QA

| 項目 | 結果 |
|---|---|
| **Review Record と verse 数一致** | Record 7,939 = verse 7,939 |
| **A+R+P=7,939** | 5,082+0+2,857=7,939 ✓ |
| **reason 必須** | Pending 2,857 verse の全 `pending[]` に layer+reason+tokens |
| **原因層分類可能** | 6 層・主原因/のべ 双方集計可能 |
| **bible_data diff 0** | 変更なし(台帳は別ファイル) |
| **Builder output 不変** | builder.js 非改変・adoption 出力は M-8f と同一 |
| **regression ALL PASS** | engine 8 + Builder(re-m8d)= **全 9 ALL PASS** |
| **推論混入 0** | Discourse/Semantic/Corpus を代行解決せず Pending 化・語義選択/自然化 0 |

---

## 完了条件

| 完了条件 | 充足 |
|---|---|
| NT 全巻 status 生成 | ✓ 7,939 Record(Accepted 5,082/Revise 0/Pending 2,857) |
| Pending 原因分類完了 | ✓ Discourse 1,350/Corpus 818/Semantic 689(主原因)・複数層 555 保持 |
| Accepted/Revise/Pending 集計可能 | ✓ status 別・layer 別・adoption 別 |
| M-11 schema 準拠 | ✓ verseId/status/adoption/pending/reviewNotes/source |
| bible_data 不変 | ✓ diff 0 |
| L-0〜M-11 と矛盾なし | ✓ 推論禁止・未判定維持・別台帳・一意性の勾配 |

---

## 最重要判断

- **NT 全巻 7,939 verse の Editorial Review 状態を台帳として生成した**: **Accepted 5,082(64%)/
  Revise 0 / Pending 2,857(36%)**。**Revise=0 を全巻で確認**し、**保守的な Morph/Syntax 採用が
  全巻規模でも破損・翻訳化・誤解を持ち込まない**ことを実証した。
- **Pending は全て Engine 側不足**(主原因 Discourse 1,350 > Corpus 818 > Semantic 689)。
  **優先分類(直接 reading 影響 > 情報不足 > 将来層責任)**により主原因を一意に記録しつつ、複数原因
  (555 verse)を保持し、**将来層への入力を漏れなく構造化**した。
- **台帳は bible_data と分離**(`source=editorial-review`)し、**bible_data.japanese を一切変更せず**
  status を全巻産出した。これで L-0 の最終目的(各章節の japanese がギリシャ語データに対し「読むための
  日本語」としてふさわしい状態か)を、**全巻規模で測定・管理できる状態**が確立した。反映可否の判断は
  M-13 へ。

---

## 凍結(候補)

```
[reading-japanese-editorial-full-review-report FROZEN候補 2026-07-22]
対象: NT全巻7939verse。台帳生成のみ・bible_data不変・判定ロジック非改変
成果: scripts/output/reading-japanese-editorial-review-records.json（7939 records・source=editorial-review・bible_data分離）
Status: Accepted5082(64%) / Revise0 / Pending2857(36%)・検算A+R+P=7939✓。全巻Revise=0
Pending主原因(優先Discourse>Semantic>Corpus): Discourse1350 / Corpus818 / Semantic689 / Morph0 / Syntax0 / Editorial0。のべ Discourse1350/Corpus1259/Semantic841・複数層555保持
Adoption: Morph採用verse6708 / Syntax採用verse171
walkthrough: Accepted=n46001013(Morph4)/n46001012(Morph1+Syntax1) / Pending=n46001020(Discourse単独)/n46001010(Semantic+Corpus複数層・Morph採用3併存・主原因Semantic)
QA: Record数=verse7939 / A+R+P一致 / reason必須 / 原因層分類可能 / bible_data diff0 / Builder不変 / 回帰全9 ALL PASS / 推論混入0
将来層: Discourse Layer最優先(1350) > Corpus補完(818) > Semantic各層(689)。反映可否はM-13 Adoption Decision
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結候補(全巻レビュー実行: 7,939 Record・Accepted5082/Revise0/Pending2857・主原因Discourse1350/Corpus818/Semantic689・台帳 scripts/output・bible_data 不変・M-13 へ) |
