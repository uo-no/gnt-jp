# Reading Japanese Builder Syntax Adoption Boundary Design(Stage M-8c)

策定日: 2026-07-20
位置づけ: Builder が **Syntax fact を Reading Japanese に採用できる範囲と、採用してはいけない範囲**を
確定する。
根拠(FROZEN): reading-japanese-policy.md(L-0)・syntax-completion-*(L-3)・
syntax-gap-boundary-freeze.md(M-7e)・discourse-boundary-classification.md(M-7f)・
-builder-morph-adoption-implementation-report.md(M-8b)・relative-syntax-study-panel-integration-design.md(K-5)。

**本 Stage は設計のみ。コード・bible_data・Syntax・Builder は変更しない。** 擬似コード・JSON・
TypeScript・日本語変更は含まない。

---

## 1. Syntax Adoption の責務定義

- **Builder は Syntax fact を読むだけ**。**Syntax 判定・referent 推論・discourse 解釈は禁止**。
- Syntax が **決定済み**とした fact のみを採用対象とする。Builder は fact を生成・推測しない。
- reading への反映は **決定的にレンダリング可能なもの**に限る(判定を要するものは採用しない)。

---

## 2. Adoption 可能範囲(決定済み Syntax fact のみ)

| 対象 | 内容 | reading への影響 |
|---|---|---|
| **relativeSyntax(role / referent / head relation)** | 関係詞の節内役割・先行詞リンク・頭語関係(1,071) | **reading 非影響**(頭語 者/もの は Morph 済・**語順不変**・role/referent は StudyPanel 構造情報=K-5) |
| **demonstrativeSyntax 決定済み 310** | pronominal(verb 参照)304 / adnominal(隣接一致名詞)6 | **pronominal 304 のみ reading 影響**(下記)・adnominal 6 は この(現状維持) |

- **relativeSyntax は「構造情報として採用可」だが reading は変えない**(K-5 の読むための Syntax・語順不変)。
  StudyPanel/Builder 構造として利用でき、reading(者/もの・Greek 順)は Morph のまま。
- **demonstrativeSyntax の pronominal(304)は reading 影響あり**(§5)。

---

## 3. Adoption 禁止範囲(Reading 変更不可)

| 禁止 | 件数/内容 |
|---|---|
| **demonstrativeSyntax 未判定** | 1,377(Unresolved by Design・M-7e) |
| **discourse 依存** | 既出性・談話距離 |
| **anaphora 解釈** | 先行名詞への照応判断 |
| **この/これ/その/あの 選択(deixis 距離)** | 近/中/遠の距離選択は discourse(この→その 既出化 等) |
| **文脈補完** | 省略・含意の補完 |

- これらは Builder に渡しても **reading を変更してはいけない**(現状維持)。**Discourse Layer(future・M-7f)/
  Editorial** の責務であり、Builder は推論しない(L-0)。
- **注意**: pronominal/adnominal(連体/代名詞の軸)は決定済み(310・§2)。一方 **deixis 距離
  (この/その/あの)の選択は discourse で禁止**。両者は別軸であり混同しない。

---

## 4. Morph Adoption との違い

| 観点 | Morph Adoption(M-8b) | Syntax Adoption(本 Stage) |
|---|---|---|
| 決定信号 | **number/person が strong で一意**に決定可能 | **discourse 依存が多数**・決定的信号は一部のみ |
| Adoption 可能 | **2,087 件を採用可能**(私→私たち/あなた→あなたがた) | **決定済み 310 のみ**・うち reading 影響は pronominal 304 |
| reading 影響 | 2,087 件が number 反映 | **~304 件(pronominal)**・relativeSyntax は reading 非影響 |
| 未判定 | ほぼ無し(混在 G4675 のみ除外) | **1,377 件が未判定=現状維持** |

- **Morph は決定的信号(number)で全面 Adoption 可能。Syntax は discourse 依存で一部のみ Adoption 可能**。
  この非対称性が本境界の核心(Morph Gap は Engine で完全解消・Syntax は大半が現状維持)。

---

## 5. Reading Japanese への影響範囲(測定)

| 区分 | 件数 | 扱い |
|---|---|---|
| **pronominal(verb 参照・決定済み)** | **304** | reading 変更可能(この→これ/これら)。gender: neuter 195(これ/これら・**Morph number と組み合わせ決定的**)/ masc・fem 109(この人/この方=word 選択の余地・慎重) |
| relativeSyntax(role/referent/head) | 1,071 | **reading 非影響**(StudyPanel 構造・頭語 Morph・語順不変) |
| adnominal(決定済み) | 6 | この(現状維持) |
| **未判定** | **1,377** | **現状維持**(discourse・推論で埋めない) |

- **reading 変更可能な Syntax Adoption は最大 304 件(pronominal)**。うち **neuter 195 が決定的**
  (これ/これら)。masc/fem 109 は word 選択の余地があり境界(慎重・別途)。
- **未判定 1,377 は現状維持**。本設計 Stage では reading を変えない(境界確定のみ)。

---

## 6. QA 設計

| 項目 | 確認 |
|---|---|
| **before / after** | Syntax Adoption 実装時、pronominal(この→これ/これら)の変更を測定。未判定 1,377 は不変 |
| **Syntax fact 採用理由の記録** | 各採用が決定済み fact(pronominal=verb 参照・adnominal=隣接一致名詞)由来であることを記録 |
| **推論混入 0** | referent 推論・discourse 解釈・deixis 距離選択をしない |
| **未判定維持** | 1,377 が現状維持(この/あの)・推論で埋めない |
| **chip⇔panel 維持** | 100%・破損形 0 |
| **bible_data 不変** | 代表語(この/あの)起点保持 |

---

## 7. 完了条件

| 完了条件 | 充足 |
|---|---|
| Syntax 責務境界確定 | ✓ Adoption 可能=決定済み 310(reading 影響 pronominal 304)/ 禁止=未判定 1,377・discourse・deixis 距離 |
| Builder 推論禁止維持 | ✓ referent 推論・discourse 解釈・deixis 選択を禁止（§1/§3） |
| Discourse Layer との責務分離 | ✓ 未判定 1,377 は Discourse Layer(future・M-7f)/ Editorial・Builder は不介入 |
| L-0〜M-8b 整合 | ✓ 推論禁止・未判定維持・Morph Adoption(全面)との非対称を明記 |

---

## 8. 最重要判断

- **Syntax Adoption は Morph Adoption と非対称**。Morph は number という決定的信号で **2,087 件を全面採用**
  できたが、Syntax は **discourse 依存が多数**で、**reading 変更可能なのは pronominal 304(うち決定的
  neuter 195)に限られる**。
- **relativeSyntax(1,071)は reading を変えない**(StudyPanel 構造・語順不変=K-5)。関係詞の構造は
  読解補助であって reading 順序の変更ではない。
- **未判定 1,377 は Builder が触れない**(Discourse Layer/Editorial の責務)。**Builder に discourse 推論を
  移さない**ことが本境界の目的。

---

## 凍結(候補)

```
[reading-japanese-builder-syntax-adoption-boundary-design FROZEN候補 2026-07-20]
Adoption可能: 決定済みSyntax fact 310（relativeSyntax role/referent/head=reading非影響StudyPanel / demonstrativeSyntax pronominal304+adnominal6）
reading影響: pronominal304のみ（この→これ/これら・neuter195決定的・masc/fem109は慎重）。relativeSyntaxはreading非影響
Adoption禁止: 未判定1,377 / discourse依存 / anaphora / deixis距離(この-その-あの選択) / 文脈補完 → 現状維持
Morph比: Morph=number決定的で2,087全面採用 / Syntax=discourse依存で reading影響~304のみ（非対称）
Builder境界: Syntax fact読むだけ・referent推論/discourse解釈/deixis選択禁止。未判定はDiscourse Layer(future)/Editorial
QA: before/after・採用理由記録・推論混入0・未判定維持・chip⇔panel維持・bible_data不変
```

本設計は凍結可能な状態である。承認により FROZEN 化し、Syntax Adoption の実装可否(pronominal 304 の
reading 反映)は別 Stage で判断する(未判定 1,377 は恒久的に現状維持)。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結候補(Syntax Adoption 境界: 決定済み 310・reading 影響 pronominal 304・relativeSyntax は reading 非影響・未判定 1,377 現状維持・Morph との非対称) |
