# Reading Japanese Builder Semantic Adoption Boundary Design(Stage M-8e)

策定日: 2026-07-22
位置づけ: Builder が **Semantic fact(semanticInfo)を Reading Japanese に採用できる範囲と、
採用してはいけない範囲**を確定する。**Morph(M-8b・2,087)・Syntax(M-8d・179)に続く採用境界の
終着点**。
根拠(FROZEN): reading-japanese-policy.md(L-0)・semantic-completion-*(L-4c)・
-builder-morph-adoption-implementation-report.md(M-8b)・
-builder-syntax-adoption-implementation-report.md(M-8d)・
-builder-syntax-adoption-boundary-design.md(M-8c)・-editorial-review-framework.md(M-5)。

**本 Stage は設計のみ。コード・bible_data・Semantic・Builder は変更しない。** 擬似コード・JSON・
TypeScript・日本語変更は含まない。数値はクリーン NT 実測(総 137,741)。

---

## 0. 前提の区別(最重要)

- **reading-level の Semantic 決定**(慣用句 すなわち・prepDomain・lnGloss)は **resolve 内(source='semantic'・
  context 必要)で既に確定済み**。Builder は **M-8d の guard で既にそれを尊重**している(Semantic 先行を
  上書きしない)。
- **semanticInfo(L-4c)は別物**=既存注釈から**決定的に導ける記述メタデータ**(lnDomain/pronType/…)。
  **これは「reading」ではなく「意味の骨格・種別」**であり、reading に採用すると **語義選択=文脈解釈=禁止**
  になる。
- したがって本 Stage の問いは「semanticInfo の各フィールドを reading に採用してよいか」であり、
  **結論を先取りすれば reading 変更可能は 0**(§5)。

---

## 1. Semantic Adoption の責務定義

- **Builder は semanticInfo を読むだけ**。**意味判定・語義選択・文脈解釈は禁止**。
- Semantic が **決定的に導いた記述**のみ参照可。**日本語出力が一意に定まるもの**に限り reading 採用対象
  とする(Morph/Syntax と同一基準)。
- semanticInfo は主に **StudyPanel(意味の骨格提示)** と **将来層** に渡す情報であり、reading を変えない。

---

## 2. Semantic fact 分類(6 フィールド)

| フィールド | 実測 | 決定的か | Reading 変更可能か | StudyPanel 向けか | 将来層が必要か |
|---|---|---|---|---|---|
| **lnDomain** | 128,493(93.3%) | 決定的(ln 注釈) | **✗**(ドメインから gloss を選ぶ=語義選択=禁止) | **✓**(多義語の骨格) | ✓ 語義選択層(文脈依存) |
| **pronType** | 1,085(疑問 555 / 不定 530) | 決定的(strong 分離) | **✗**(疑問 τίス→誰/何 は **Morph 既済**・不定 τις は「ある」word 選択) | **✓** | ✓ 不定詞レンダリング層 |
| **reflexivePerson** | 408(1:58 / 2:99 / 3:251) | 決定的(morph F) | **部分**(1/2=**Morph 既済** 私自身/あなた自身 157)・**3 は ✗** | **✓**(3=referent 依存) | ✓ 3 人称再帰層(referent/gender) |
| **intensive** | 85(現 reading 全 彼) | 決定的(class=adj) | **✗**(「自身」の付着先=構造依存・付着なしに 彼→自身 不可) | **✓** | ✓ 強意付着層(attributive 構造) |
| **deixis** | 1,687 | 決定的(lemma) | **✗**(pronominal=**M-8d 既済** これ/あれ・距離=discourse 禁止) | **✓** | Discourse Layer(M-8c) |
| **adverbial** | 79(何を 70 / 何に 6 / 誰に 1 / 何 2) | 部分(role=adv 注釈・混在) | **✗**(なぜ/どう/どうして=word 選択非一意・role は Syntax) | **✓** | ✓ 副詞的疑問層(word 選択) |

- **どのフィールドも「決定済みかつ日本語出力が一意」に該当しない**:
  - 既に Morph/Syntax が採用済(疑問 τίς・再帰 1/2・deixis pronominal)= **新規 reading 影響 0**。
  - 残りは **語義選択(lnDomain・不定詞)/ 構造依存(intensive 付着・再帰 3)/ word 選択(adverbial)** で
    **一意でない=採用不可**。

---

## 3. Adoption 可能範囲

- **Morph/Syntax と同一基準**: 決定済みで **日本語出力が一意**なもののみ。
- **本 Stage の該当=なし(0 件)**。reading-level の一意な Semantic 決定(慣用句 等)は **resolve が既に
  source='semantic' で確定**しており、Builder は**新たに採用する semanticInfo を持たない**。

---

## 4. Adoption 禁止範囲

| 禁止 | 該当 semanticInfo |
|---|---|
| **文脈による語義選択** | lnDomain からの gloss 選択・不定詞 τις の語選択 |
| **神学判断** | いずれのフィールドも神学的含意の補完に用いない |
| **翻訳的補完** | intensive「自身」の付着・adverbial「なぜ」への言い換え |
| **自然な日本語への変更** | 何を→なぜ 等の自然化・語選択 |
| **未判定 semantic の補完** | reflexivePerson=3(referent 未解決)・intensive 付着先未定 |

- これらは **Builder に渡しても reading を変更してはいけない**(現状維持)。**Discourse Layer / 語義選択層 /
  Editorial**(future)の責務であり、Builder は推論しない(L-0)。

---

## 5. Reading 影響範囲(測定)

| フィールド | 件数 | reading 影響 | 理由 |
|---|---|---|---|
| lnDomain | 128,493 | **0** | 語義選択=禁止(StudyPanel) |
| pronType(疑問) | 555 | **0**(既済) | τίス→誰/何 は Morph(M-8d 系) |
| pronType(不定) | 530 | **0** | 「ある」word 選択・非一意 |
| reflexivePerson 1/2 | 157 | **0**(既済) | 私自身/あなた自身 は Morph |
| reflexivePerson 3 | 251 | **0** | referent/gender 依存(将来) |
| intensive | 85 | **0** | 付着先=構造依存 |
| deixis | 1,687 | **0** | pronominal=M-8d 既済・距離=discourse |
| adverbial | 79 | **0** | なぜ/どう=word 選択非一意 |
| **合計(新規 reading 影響)** | — | **0** | — |

- **Semantic Adoption の新規 reading 変更可能件数 = 0**。**未判定・非一意はすべて現状維持**。
- 唯一の境界候補は **adverbial τί(79)→ なぜ**だが、**word 選択(なぜ/どう/どうして)が非一意**であり、
  かつ **role は Syntax 領域**のため採用しない(将来の副詞的疑問層の候補)。

---

## 6. QA 設計

| 項目 | 確認 |
|---|---|
| **before / after** | Semantic Adoption は reading を変えない(0 件)。実装時は **全トークンで reading 不変(バイト等価)**を確認 |
| **採用理由の記録** | 仮に将来採用する場合も、決定的 fact(strong/morph/lemma 由来)であることを記録・文脈判断を残さない |
| **推論混入 0** | 語義選択・文脈解釈・神学補完・自然化をしない |
| **未判定維持** | lnDomain gloss・不定詞・reflexive3・intensive 付着・adverbial は現状維持 |
| **bible_data 不変** | 代表語起点保持 |
| **chip⇔panel 維持** | 100%・破損 0(chip/panel は engine.resolve 参照=不変) |

---

## 7. 完了条件

| 完了条件 | 充足 |
|---|---|
| Semantic 責務境界確定 | ✓ semanticInfo は StudyPanel/将来層向け・**reading 採用 0**・reading-level Semantic は resolve が既決 |
| Builder 推論禁止維持 | ✓ 語義選択・文脈解釈・神学判断を禁止(§1/§4) |
| M-8b / M-8d との整合 | ✓ Morph 2,087・Syntax 179・**Semantic 0** の非対称を確定(一意性が下がるほど採用不可) |
| L-0 準拠 | ✓ 推論禁止・未判定維持・自然化しない・翻訳しない |

---

## 8. 最重要判断

- **採用境界の三層は「一意性の勾配」である**。**Morph(number=strong で一意・2,087)> Syntax(pronominal
  neuter=決定的・179)> Semantic(意味=disambiguation/domain/context・0)**。**一意性が下がるほど reading
  採用は不可**になり、Semantic はその終着点で **reading 影響 0**。
- **semanticInfo は reading ではない**。lnDomain(93.3%)は多義語の**骨格**であって語ではなく、そこから語を
  選ぶのは **語義選択=禁止**。reading-level の Semantic 決定(慣用句 すなわち 等)は **resolve が既に
  source='semantic' で確定**しており、Builder は M-8d guard でそれを尊重している。
- **Semantic は StudyPanel と将来層(語義選択層/Discourse Layer/3 人称再帰層/副詞的疑問層)の入口**である。
  **Builder に意味推論を移さない**ことが本境界の目的であり、これにより Builder は
  **「決定的で一意な fact のみを採用する記録層」**として三層(Morph/Syntax/Semantic)で一貫する。

---

## 凍結(候補)

```
[reading-japanese-builder-semantic-adoption-boundary-design FROZEN候補 2026-07-22]
前提: reading-levelのSemantic決定(慣用句すなわち/prepDomain/lnGloss)はresolve内(source=semantic)で既決・BuilderはM-8d guardで尊重済
semanticInfo(L-4c)は記述メタデータ=StudyPanel/将来層向け。readingに採用すると語義選択=禁止
分類: lnDomain128493(語義選択禁止) / pronType1085(疑問=Morph既済/不定=word選択) / reflexivePerson408(1-2=Morph既済157/3=referent依存251) / intensive85(付着=構造依存) / deixis1687(pronominal=M-8d既済/距離=discourse) / adverbial79(なぜ/どう=word選択非一意)
Adoption可能: 決定済みかつ日本語出力が一意なもののみ → 該当なし=0
reading影響: 0（新規採用なし・未判定/非一意は現状維持）。唯一の境界候補adverbialτίもword選択非一意で不採用（将来層）
禁止: 語義選択/神学判断/翻訳補完/自然化/未判定semantic補完
非対称: Morph2087 > Syntax179 > Semantic0（一意性の勾配・下がるほど採用不可）
QA: reading不変(バイト等価)/推論混入0/未判定維持/bible_data不変/chip⇔panel100%
```

本設計は凍結可能な状態である。承認により FROZEN 化し、**Builder Adoption 三層(Morph/Syntax/Semantic)の
境界を確定**する。semanticInfo は恒久的に StudyPanel/将来層向けとし、reading には採用しない。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結候補(Semantic Adoption 境界: semanticInfo 6 フィールド分類・reading 採用 0・Morph2087>Syntax179>Semantic0 の一意性勾配・reading-level Semantic は resolve 既決・StudyPanel/将来層向け) |
