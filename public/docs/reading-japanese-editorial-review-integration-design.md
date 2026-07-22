# Reading Japanese Editorial Review Integration Design(Stage M-9)

策定日: 2026-07-22
位置づけ: **M-8f までで完成した Builder Adoption の出力を、M-5 Editorial Review Framework と統合する**。
Builder 出力を Editorial Review が **verse 単位で評価できる形式・工程**を確定する。
根拠(FROZEN): reading-japanese-policy.md(L-0)・-editorial-review-framework.md(M-5)・
-editorial-pilot-report.md(M-6)・-builder-adoption-integration-freeze.md(M-8f)・
-pending-classification.md(M-7a)・discourse-boundary-classification.md(M-7f)。

**本 Stage は設計のみ。bible_data / Morph Registry / Syntax / Semantic / Discourse / reading-engine.js /
Builder adoption logic は変更しない。** 擬似コード・JSON・TypeScript・日本語変更は含まない。
数値はクリーン NT 実測(総 137,741 トークン・7,939 verse・重複「 2.json」不在)。

---

## 0. 前提と責務の区別(最重要)

- **レビュー対象 = 最終成果物「Reading Japanese」(= bible_data.japanese 代表語 + Builder 採用)**。
  **Builder は内部処理でありレビュー対象ではない**(M-6)。
- **本 Stage で bible_data.japanese は変更しない**。Editorial Review は **verse ごとに status(判定)を
  産出する工程**であり、bible_data を書き換えない。実際の反映は将来の適用 Stage(人手ゲート)に委ねる。
- Builder は M-8f で凍結済:**決定的で一意な fact のみ採用**(Morph 決定語形/決定済み Syntax pronominal
  neuter)、**Semantic/Discourse 推論は禁止・未判定は現状維持**。

---

## 1. Editorial Review 入力契約

- **レビュー単位 = verse**。token / phrase / clause は**原因確認用**(最終判定は verse)。
- Builder(`buildVerse(tokens, context)`・要 `setCorpus(corpusTokens)`)の出力を入力とする。

| verse レベル | 用途 |
|---|---|
| `readings[]` | 現 Reading Japanese(評価対象そのもの) |
| `morphAdoptedCount` / `syntaxAdoptedCount` | 採用の有無・規模 |

| token レベル(確認対象) | 用途 |
|---|---|
| `reading` | 現 reading |
| `morphAdopted{representative,adopted}` | Builder adoption 差分(Morph) |
| `syntaxAdopted{representative,adopted,reason}` | Builder adoption 差分(Syntax) |
| `morph{japanese,source}` | Morph fact / source 層 |
| `relativeSyntax` / `demonstrativeSyntax` | Syntax fact(構造・reading 非影響) |
| `semanticInfo` | Semantic metadata(reading 非影響・参照のみ) |
| (未判定情報) | Pending 情報(demonstrative 未判定・Semantic 非一意・corpus 不足) |

---

## 2. Review Workflow

各 verse について以下の順に確認し、**問題発生時は原因層を記録**する。

```
Data → Morph → Syntax → Semantic metadata → Builder adoption
     → Reading Japanese → Verse quality → Final status
```

| 工程 | 確認内容 |
|---|---|
| Data | 代表語(bible_data.japanese)の起点が妥当か |
| Morph | number/person/gender/case の決定語形が反映されているか |
| Syntax | pronominal neuter・関係詞構造が正しく参照されているか |
| Semantic metadata | 意味の骨格(lnDomain 等)が参照可能か(reading は変えない) |
| Builder adoption | morphAdopted/syntaxAdopted の before/after が決定的根拠を持つか |
| Reading Japanese | verse の reading が構造忠実・読解可能か |
| Verse quality | 破損・誤解・不自然な断絶がないか(自然化は求めない) |
| Final status | Accepted / Revise Required / Pending |

**原因分類(7 層)**: **Data / Morph / Syntax / Semantic / Discourse / Corpus / Editorial**。
問題は必ずいずれかの層に帰属させる(Editorial 自身の表示不整合も含む)。

---

## 3. Adoption の評価基準(採用済み fact を再判定しない)

### Morph Adoption 確認項目

- person/number が strong/morph と一致しているか。
- 単数誤変換がないか(G4675 単数 σου 等が あなたがた 化していないか)。
- strong 根拠があるか(Registry 14 strong のいずれか)。

### Syntax Adoption 確認項目

- referent lookup が corpus に存在するか。
- 参照先 class='verb' の pronominal(verb 参照)であるか。
- discourse 推論が混入していないか(deixis 距離・anaphora が入っていないか)。

- **採用済み fact 自体は再判定しない**(Editorial は fact の妥当性ではなく、**reading への反映が
  破損・誤解を生んでいないか**を確認する)。fact の誤りは原因層(Morph/Syntax/Corpus)へ差し戻す。

---

## 4. Editorial が変更可能な範囲

| 許可 | 禁止 |
|---|---|
| verse 内の**明らかな破損修正**(表示崩れ・重複) | 翻訳化 |
| **既存決定情報の表示不整合修正**(chip⇔panel 不一致 等) | 自然な日本語への変更 |
| **章節内一貫性確認**(同一 verse 内の同語処理の整合) | 語順変更 / 神学補完 |
| | 文脈推論 / Semantic 語義選択 / Discourse 判断 |

- 許可は **決定済み情報の忠実な提示の担保**に限る。**新たな意味・語選択・語順の判断は一切しない**
  (L-0/M-8f)。**禁止に該当する改善要望は Pending(原因層)へ回す**。

---

## 5. Status 定義

| Status | 条件 | 備考 |
|---|---|---|
| **Accepted** | 構造忠実・読解可能・非破損・非誤解・**決定済み fact が適切反映** | 自然な日本語であることは条件でない(L-0) |
| **Revise Required** | Builder 出力または表示に**明確な問題**があり、**修正理由が決定的根拠で説明可能** | 決定的根拠のない「改善」は不可 |
| **Pending** | **Morph 不足 / Syntax 不足 / Semantic 未決定 / Discourse 不足 / Corpus 不足** | **理由必須・推論で解決しない** |

- **Pending は欠陥でなく「Unresolved by Design」**(L-0)。原因層を必ず記録し、将来層へ委ねる。
- M-6 パイロット(JHN 1・51 verse)実績: **Accepted 30 / Revise 0 / Pending 21**(Pending は全て Engine 側
  不足)。本統合はこの基準を NT 全巻へ拡張する(実判定は M-10)。

---

## 6. QA

| 項目 | 確認 |
|---|---|
| **bible_data 不変** | レビューは status を産出するのみ・bible_data.japanese を書き換えない(diff 空) |
| **Builder adoption diff 記録一致** | morphAdopted/syntaxAdopted の before/after が Builder 出力と一致 |
| **chip⇔panel 100%** | chip/panel は engine.resolve 参照=不変・破損 0 |
| **regression ALL PASS** | engine 8(re-phase1/2/3/5・re-stageA/B/D/E)+ Builder(re-m8d)= 全 9 |
| **Pending 原因分類可能** | 各 Pending が 7 層のいずれかに帰属 |
| **verse 状態集計可能** | Accepted / Revise / Pending および原因層別 Pending を集計可能 |

### 集計可能性の実証(NT 全巻・framework 入力)

| 指標 | 件数 |
|---|---|
| 総 verse | 7,939 |
| Morph 採用ありverse | 6,708 |
| Syntax 採用ありverse | 171 |
| 採用(Morph∪Syntax)ありverse | 6,725 |
| Discourse Pending シグナルありverse(demonstrative 未判定) | 847 |
| 採用なし & discourse Pending なしverse | 1,098 |

- これらは **framework が verse 単位で計算可能な入力**であり(status 集計・原因層別集計が可能)、
  **実際の Accepted/Revise/Pending 判定は M-10 Pilot Integration で産出**する(本 Stage は工程確定)。

---

## 7. M-9 完了条件

| 完了条件 | 充足 |
|---|---|
| Builder output を Editorial Review が利用可能 | ✓ verse/token 入力契約を確定(§1) |
| verse 単位レビュー工程確定 | ✓ Data→…→Final status の 8 工程 + 7 層原因分類(§2) |
| Accepted / Revise / Pending 基準確定 | ✓ 条件・理由必須・推論禁止(§5) |
| Builder 責務と Editorial 責務の混同なし | ✓ Builder=採用記録(内部)/ Editorial=成果物 reading の verse 評価(§0/§3) |
| L-0〜M-8f と矛盾なし | ✓ 推論禁止・未判定維持・一意性の勾配・bible_data 不変 |
| bible_data.japanese は変更しない | ✓ status 産出のみ・diff 空 |

---

## 8. 最重要判断

- **Editorial Review は「Builder の内部採用」ではなく「成果物 Reading Japanese」を verse 単位で評価する**。
  Builder(M-8f 凍結・決定的 fact のみ採用)は再判定せず、Editorial は **reading が構造忠実・非破損・
  非誤解であるか**だけを見る。**採用済み fact の誤りは原因層へ差し戻し**、Editorial 自身は意味・語選択・
  語順を判断しない。
- **Pending は Engine 側不足の可視化**であり(M-6 で実証: 問題ゼロ・Pending は全て不足)、
  **7 層原因分類**により将来層(Discourse Layer/語義選択層/Corpus 拡充)への入力を構造化する。
- **bible_data.japanese を変更せず status を産出する**ことで、原文(新改訳)を不変に保ちながら、
  **「読むための日本語」の品質を verse 単位で管理可能**にする。これで L-0 の最終目的
  (各章節の japanese がギリシャ語データに対し「読むための日本語」としてふさわしい状態)を、
  **測定・管理できる工程**として確立する。

---

## 凍結(候補)

```
[reading-japanese-editorial-review-integration-design FROZEN候補 2026-07-22]
対象: 成果物Reading Japanese(bible_data.japanese代表語+Builder採用)。Builderは内部処理でレビュー対象外
単位: verse（token/phrase/clauseは原因確認用・最終判定はverse）。本Stageはbible_data不変・status産出のみ
入力契約: verse{readings,morphAdoptedCount,syntaxAdoptedCount} / token{reading,morphAdopted,syntaxAdopted,morph,relative/demonstrativeSyntax,semanticInfo,Pending情報}
Workflow: Data→Morph→Syntax→Semantic metadata→Builder adoption→Reading Japanese→Verse quality→Final status。原因7層=Data/Morph/Syntax/Semantic/Discourse/Corpus/Editorial
Adoption評価: Morph=person/number一致・単数誤変換なし・strong根拠 / Syntax=referent存在・verb参照pronominal・discourse非混入。採用済みfactは再判定しない
Editorial可変: 破損修正/表示不整合修正/章節内一貫性。禁止: 翻訳化/自然化/語順/神学/文脈推論/語義選択/Discourse
Status: Accepted(構造忠実・読解可能・非破損・非誤解・fact反映) / Revise(明確な問題・決定的根拠) / Pending(Morph/Syntax/Semantic/Discourse/Corpus不足・理由必須・推論解決しない)
集計実証(framework入力): 総verse7939 / Morph採用6708 / Syntax採用171 / 採用∪6725 / discourse Pendingシグナル847 / 採用なし&Pendingなし1098。実判定はM-10
QA: bible_data不変(diff空) / adoption diff一致 / chip⇔panel100% / 回帰全9 ALL PASS / Pending原因分類可能 / verse状態集計可能
M-6基準: JHN1=Accepted30/Revise0/Pending21（全てEngine側不足）をNT全巻へ拡張
```

本設計は凍結可能な状態である。承認により FROZEN 化し、**M-10 Reading Japanese Editorial Pilot
Integration** で実際の verse 判定を産出する(bible_data は引き続き不変)。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結候補(Editorial Review 統合: verse 単位入力契約・8 工程 Workflow・7 層原因分類・Adoption 評価基準・Status 定義・集計可能性実証 7,939verse・bible_data 不変・M-10 へ接続) |
