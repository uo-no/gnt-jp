# Reading Hint Candidate Selection Rules(Stage SP-9)

策定日: 2026-07-22
位置づけ: Reading Hint の **Candidate 抽出規則・採用条件・除外条件・優先順位**を定義する。
**Candidate Rule の設計のみ。**
**UI 設計・コード変更・bible_data 変更・Workflow 変更・Data Model 変更・Editorial Character 変更は禁止。**
前提(FROZEN・変更禁止): L-0 / RM-0 / M-15 / M-16 / M-16.5 / SP-5 / SP-6 / SP-7 / SP-7A / SP-8。
**確定事項: Reading Hint は Editorial Asset・AI は編集支援・人が公開判断**。
根拠: reading-hint-editorial-workflow-design.md(SP-8)・reading-hint-unit-trigger-design.md(SP-6)・
reading-japanese-rhetorical-consistency-audit.md(M-16.5)。

Severity 凡例: **P0(致命)/ P1(高)/ P2(中)/ P3(低)**。

---

## 追加検討(中核):AI 抽出と Editor 採用の境界

- **AI は「機械的に資格を満たす候補」を広めに抽出する(recall 志向)。判断(distinctiveness の程度・JHN21 型の
  非表示・最終文言・公開)は人**(SP-8 の編集支援者/編集者分離)。
- **候補漏れ vs 誤候補**: **決定的レベルでは候補漏れ(recall)を優先して避ける**——見逃した候補は編集者の目に
  永久に触れず良い Hint が失われる。一方 **誤候補は編集者の監査(SP-5/SP-6/L-0)で捨てられる(安全網が存在)**。
  ただし **recall は機械的フィルタ(集中反復+内容語+日本語可視+スコープ責務除外)で境界づけ**、遍在語・
  機能語の氾濫でノイズ化させない。
- **機械化の限界**: AI は **反復計数・内容語判定・遍在語除外・日本語可視性・スコープ責務除外**まで機械化できる。
  **distinctiveness を「真の主題か」まで・JHN21 型の隠れた原語の非表示・最終文言・公開判断は機械化できない**
  (人=Editorial Judgment・SP-8)。
- **結論**: AI 抽出=**決定的な候補資格判定まで(広め)**。以降の**採用・非表示・公開は人**。

---

## Phase 1: Reading Hint Candidate とは何か(Candidate ≠ Published Hint)

| | **Candidate** | **Published Hint** |
|---|---|---|
| 主体 | **AI 抽出**(機械的資格判定) | **人が編集・監査・公開**(SP-8) |
| 性質 | 未判断の素材(段落あたり複数あり得る) | 編集済み・監査済みの Editorial Asset(1 pericope 1 つ以下) |
| 内容 | 焦点 lemma・範囲・根拠節・機械資格 | SP-5 の静かな一文・非表示判断適用済み |

- **評価**: **Candidate は「編集者に提示する原石」**であり、Hint ではない。多数の Candidate から、人が**選択・
  編集・監査・公開**して初めて Published Hint になる(0 個のこともある)。
- **Evidence**: SP-7(Editorial Asset)・SP-8(Candidate→Draft→…→Published)。
- **Severity**: **P3**。
- **Conclusion**: **Candidate=AI 提示の素材 / Published Hint=人が仕上げた資産。両者を厳密に区別**。

## Phase 2: Candidate になれる現象(Word/Reading/Passage 責務分類)

| 現象 | 責務 | Reading Hint Candidate |
|---|---|---|
| **同一語の反復**(同じ日本語が反復) | **Reading** | ✓ 候補 |
| **同一語族**(見える共通語根・例 義) | **Reading**(見える範囲)/ 語族データは Word | ✓ 条件付き候補 |
| **主題語**(読みの印象としての中心語) | **Reading** | ✓ 条件付き候補 |
| **keyword 反復** | **Reading** | ✓ 候補 |
| inclusio | **Passage** | ✗(構造) |
| parallelism | **Passage** | ✗(構造) |
| discourse | **Passage**(構造)/ 局所は Reading Memo | ✗ |
| contrast(対比) | **Passage**(構造)/ 隠れ原語は Word | ✗ |

- **評価**: **Candidate になれるのは Reading 責務の「日本語で見える反復/語根/主題」のみ**。inclusio/parallelism/
  discourse/contrast は **Passage(構造)または Word(隠れ原語)の責務**であり Hint 候補にならない。
- **Evidence**: SP-4/SP-5(Reading=読む面・反復)・SP-2(Passage=構造)。
- **Severity**: **P2**。
- **Conclusion**: **候補現象=日本語で見える反復・語根・主題(Reading)。構造・隠れ原語は候補外**。

## Phase 3: 採用できる条件(Candidate 資格)

Candidate 資格(**AI が機械的に判定**・すべて満たす):

1. **日本語で反復している**(同一日本語表記/語根が反復・原語のみの反復でない)。
2. **段落内で集中している**(SP-6: 概ね 3 回以上・連続集中)。
3. **内容語**である(機能語・冠詞・コピュラを除く)。
4. **distinctive(相対集中)**——その段落に集中し、遍在語でない。
5. **passage スコープ**(段落の読む面・Word/Passage の責務でない)。

- **Evidence**: SP-6 表示条件・M-16.5(信仰/勧め/とどまる/義 が該当)。
- **Severity**: **P2**。
- **Conclusion**: **日本語可視の集中反復・内容語・相対 distinctive・passage スコープが Candidate 資格**。

## Phase 4: 除外条件

以下は **Candidate から除外**(AI が機械的に除外):

- **遍在語**: 神・主・イエス・キリスト・父・人(頻度で遍在=段落の特徴にならない)。
- **機能語・generic 動詞**: 言う・行く・〜である・冠詞。
- **散発・一回**(集中していない・SP-6)。
- **原語を見ないと分からない**(反復/対比が日本語で見えない=JHN21 型・JAS1 の別語連関)。
- **Strong 依存 / LN 依存 / Greek 依存**(データ/原語がないと成立しない=Word)。
- **StudyPanel 責務**(出現回数・Concordance・Cluster・語義=Word)。
- **Passage 責務**(inclusio/chiasm/parallelism/contrast 構造=Passage)。

- **Evidence**: SP-5/SP-6(非表示条件)・M-16.5(θεός 遍在 1307・JHN21 隠れ原語)。
- **Severity**: **P1**(原語限定・データ依存を候補にすると L-0/責務越境)。
- **Conclusion**: **遍在語・機能語・散発・原語限定・データ依存・StudyPanel/Passage 責務は候補外**。

## Phase 5: 優先順位

複数候補があるとき、**AI は次の順に並べる**(提示順・SP-6 Phase5):

1. **distinctive(相対集中)最優先**——遍在語を外し、その段落に最も集中する内容語。
2. **反復の強さ**(段落内の集中回数)。
3. **内容語性**(抽象主題語 > 一般語)。

- **評価**: この順は **候補の提示順**であって**公開順ではない**。最上位でも人が非表示にし得る(Phase 6)。
- **Evidence**: SP-6 Phase5。
- **Severity**: **P2**。
- **Conclusion**: **distinctive > 反復強度 > 内容語性 で並べるが、公開は人の判断**。

## Phase 6: Editorial Judgment(優先度スコアでない最終判断)

**AI は数値順位だけで公開判断してはならない**(明文化)。最終判断に必要な観点:

- **読者が実際に「聞こえる」か**(頻度は高いが読みで印象に残らない語でないか)。
- **段落の真の主題か、偶発的反復か**(数だけ多い機能的反復でないか)。
- **読書を助けるか、逸らすか**(気づきが読みを促すか、些末な指摘か)。
- **意味ある内容が隠れていないか**(JHN21: 愛する は反復するが、真の内容は隠れた原語対比=非表示)。

- **評価**: これらは**頻度スコアに写像できない編集判断**であり、**Editorial Judgment(人)の領域**。AI は
  ランク付き候補を提示し、人がこれらの観点で採否・非表示を決める。
- **Evidence**: SP-8(判断は人)・M-16.5(JHN21 の非表示は判断)。
- **Severity**: **P1**(AI が数値順で自動公開すると L-0/編集人格を破る)。
- **Conclusion**: **公開は数値でなく Editorial Judgment。AI は自動公開しない**。

## Phase 7: 代表ケース監査

| ケース | 反復実測(M-16.5) | Candidate | Published(人の判断) | 理由 |
|---|---|---|---|---|
| **HEB11 πίστις** | 信仰 ×24(全章集中) | **✓ 候補** | 採用見込 | 日本語可視・集中・distinctive・内容語 |
| **2CO1 παράκλησις** | 勧め族 ×10(v3–7) | **✓ 候補** | 採用見込 | 同根反復が密集・distinctive |
| **JHN15 μένω** | とどまる ×11 | **✓ 候補** | 採用見込 | とどまる が段落を貫く |
| **ROM3 δικαιοσύνη** | 義族(v21–26) | **✓ 候補** | 採用見込 | 見える語根「義」の集中 |
| **JAS1 πειρασμός** | 誘惑 ×2(散発)+ 試みる ×4 | **✗ 非候補** | — | 散発・単一反復が読みで聞こえない(別語) |
| **JHN21 ἀγαπάω/φιλέω** | 愛する ×7(v15–17 集中) | **△ 機械的には候補**(愛する は反復) | **非表示(人が withhold)** | 真の内容は隠れた原語対比=Word。表面反復を出すと誤導 |

- **評価**: **HEB11/2CO1/JHN15/ROM3 は候補→採用見込**。**JAS1 は非候補(散発)**。**JHN21 は機械的には候補
  (愛する は集中反復)だが、人が非表示にする**——この 1 例が **「AI は広く出す/人が judgment で落とす」境界**を
  最も鮮明に示す。
- **Evidence**: M-16.5 各ケース実測(JHN21 愛する v15–17 集中・JAS1 散発 v2,12)。
- **Severity**: **P1**(JHN21 型を機械公開すると誤導)。
- **Conclusion**: **候補は機械的に広く(JHN21 も候補化)、公開は人が判断(JHN21 非表示)**。

## Phase 8: 境界ケース(頻出語)

| 語 | Candidate 可否 |
|---|---|
| 神・主・キリスト・父・人 | **不可(原則)**——遍在ゆえ段落の特徴にならない。ただし**特定段落で異常に集中**(相対 distinctive が高い)なら**機械的には候補化し、人が判断** |
| 言う・行く | **不可**——generic 動詞・機能的反復 |

- **評価**: **絶対頻度でなく相対集中(その段落 vs baseline)で distinctive を判定**。遍在語は原則除外だが、
  ある段落に異常集中する場合のみ候補化し、**最終は Editorial Judgment**。generic 動詞は機能的反復として除外。
- **Evidence**: θεός 全 NT 1,307(遍在・M-16.5)。SP-6 Phase5(distinctive=遍在語除外)。
- **Severity**: **P2**。
- **Conclusion**: **遍在語・generic 動詞は原則除外。異常集中時のみ相対 distinctive で候補化し人が判断**。

## Phase 9: Candidate Selection Rules(箇条書き)

**採用(Candidate 資格・AI が機械判定)**:
- 集中反復(段落内で概ね 3 回以上・連続集中)。
- 内容語。
- 日本語で見える(表記/語根の反復)。
- distinctive(相対集中・遍在語でない)。
- passage スコープ(Reading の読む面)。

**除外(AI が機械除外)**:
- 遍在語(神/主/キリスト/父/人)・機能語・generic 動詞(言う/行く)。
- 散発・一回。
- 原語を見ないと分からない(JHN21 型・別語連関)。
- Strong/LN/Greek 依存・StudyPanel 責務(データ)・Passage 責務(構造)。

**優先(AI が提示順)**: distinctive(相対集中)> 反復強度 > 内容語性。

**判断(人)**: 採用・非表示・最終文言・公開は Editorial Judgment(数値順でない)。

## Phase 10: 総合評価

- **P0 なし**。**P1×3**(Phase4 原語/データ依存の候補化禁止 / Phase6 数値自動公開禁止 / Phase7 JHN21 型)は、
  すべて **「AI は機械資格まで広く抽出、採用/非表示/公開は人」**という本規則で確定・回避済み。
- **設計判断(recall vs precision)**: **決定的レベルは recall 志向(候補漏れを避ける)・機械フィルタで境界づけ・
  precision は編集者**。**機械化は候補資格判定まで**(反復/内容語/遍在語除外/日本語可視/スコープ)、**判断は人**。

| Phase | 監査 | Severity |
|---|---|---|
| 1 | Candidate 定義 | P3 |
| 2 | 候補現象の責務分類 | P2 |
| 3 | 採用条件 | P2 |
| 4 | 除外条件 | **P1** |
| 5 | 優先順位 | P2 |
| 6 | Editorial Judgment | **P1** |
| 7 | 代表ケース | **P1** |
| 8 | 境界ケース(頻出語) | P2 |

---

## Reading Hint Candidate Rules(一覧: 採用/除外/優先/判断主体)

| 区分 | 内容 | 判断主体 |
|---|---|---|
| **採用(候補資格)** | 集中反復・内容語・日本語可視・相対 distinctive・passage スコープ | **AI(機械抽出・recall 志向)** |
| **除外** | 遍在語・機能語・generic 動詞・散発/一回・原語限定・Strong/LN/Greek 依存・StudyPanel/Passage 責務 | **AI(機械除外)** |
| **優先(提示順)** | distinctive > 反復強度 > 内容語性 | **AI(並べ替えのみ)** |
| **採用・非表示・文言・公開** | 読者が聞こえるか・真の主題か・隠れ内容(JHN21)・読書を助けるか | **人(Editorial Judgment)** |

---

## FROZEN 判定

- **FROZEN 可能**。
- **理由**: Candidate 選定規則が、**AI が機械的資格(集中反復・内容語・日本語可視・相対 distinctive・スコープ
  責務除外)で候補を広めに抽出し、採用・非表示・公開は人の Editorial Judgment が行う**、という SP-8 の
  編集支援者/編集者分離に整合する形で確定した。除外条件で原語/データ依存を候補化せず(L-0/責務保護)、
  JHN21 型は「機械的候補・人が非表示」で境界が明確。P0 はなく、P1 は本規則で塞がれ、既存 FROZEN
  (SP-5/SP-6/SP-7/SP-7A/SP-8)を変更しない。
- **次 Stage**:
  - **pericope 境界データ整備**(Corpus・Candidate の段落範囲確定の前提)。
  - もしくは **Candidate 抽出の内部判定設計**(反復計数・遍在語しきい値・相対集中度の**決定的算出**の責務設計。
    生成アルゴリズム実装ではなく、AI が機械化してよい範囲の判定仕様。本規則と SP-6/SP-8 を上位制約)。

```
[reading-hint-candidate-selection-rules FROZEN 2026-07-22]
中核: AIは機械資格で候補を広めに抽出(recall志向・候補漏れを避ける)・採用/非表示/公開は人(Editorial Judgment)。機械化は候補資格判定まで・判断は人
Candidate≠Published: Candidate=AI提示の素材(複数可) / Published Hint=人が編集監査公開した資産(1pericope1つ以下・0もあり)
候補現象: 日本語で見える反復/語根/主題=Reading候補 / inclusio・parallelism・discourse・contrast=Passage or Word(候補外)
採用条件: 日本語で反復・段落内集中(≈3回以上)・内容語・相対distinctive・passageスコープ
除外条件: 遍在語(神/主/キリスト/父/人)・機能語generic動詞(言う/行く)・散発一回・原語限定(JHN21型)・Strong/LN/Greek依存・StudyPanel責務・Passage責務
優先(提示順): distinctive(相対集中)>反復強度>内容語性。但し公開は数値でなく人
Editorial Judgment: 読者が聞こえるか/真の主題か/隠れ内容(JHN21)/読書を助けるか。AIは数値順で自動公開しない
代表ケース: HEB11信仰/2CO1勧め/JHN15とどまる/ROM3義=候補→採用見込 / JAS1誘惑=非候補(散発) / JHN21愛する=機械的候補だが人が非表示(真の内容は隠れ原語対比=Word)
境界ケース: 遍在語generic動詞は原則除外・異常集中時のみ相対distinctiveで候補化し人が判断
判断主体一覧: 採用資格/除外/提示順=AI機械 / 採用非表示文言公開=人
FROZEN可能。既存SP-5/6/7/7A/8不変。次: pericope境界データ整備 or Candidate抽出内部判定設計(機械化範囲の仕様)
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結(Candidate 選定規則・AI 機械抽出 recall 志向/人が採用公開・候補現象の責務分類・採用/除外/優先・Editorial Judgment・代表 6 ケース[JHN21=機械候補/人が非表示]・頻出語境界・FROZEN 可能) |
