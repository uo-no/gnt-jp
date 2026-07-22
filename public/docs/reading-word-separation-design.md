# Reading / Word Separation Design(Stage SP-4)

策定日: 2026-07-22
位置づけ: StudyPanel と Reading の責務を**最終確定**する。**Reading=読むため / Word=調べるため / Passage=
段落構造**の三者を完全分離する。**UI 変更・コード変更・デザイン作成は禁止。定義のみ。**
前提(FROZEN・変更禁止): SP-IA-1 / SP-SD-1 / RM-0 / SP-2 / SP-3、Reading Japanese Builder(L-0〜M-16)。
根拠: reading-observation-information-architecture.md(SP-2)・studypanel-cognitive-load-audit.md(SP-3)・
reading-memo-editorial-character-audit.md(RM-0)・reading-japanese-policy.md(L-0)。

Severity 凡例: **P0(致命)/ P1(高)/ P2(中)/ P3(低)**。

---

## 設計原理(最終分離)

- **各スコープには「読む面」と「調べる面」がある**。
  - **読む面 → Reading の家**(静かな読書の声・推論/翻訳/数値/ラベルなし)。
  - **調べる面 → Word の家(StudyPanel)/ Passage の家(別 View)**(データ・構造・分析)。
- 例: 節/句スコープの読む面=Reading Memo・調べる面=Syntax/Semantic。**段落スコープの読む面=Reading Hint
  (新規)・調べる面=Passage View**。**語スコープの読む面=Reading Japanese・調べる面=Morph/Lexical**。

---

## Phase 1: Reading / Word / Passage の責務境界

| 家 | 責務 | 対象 | 声/様式 |
|---|---|---|---|
| **Reading** | **文章として聖書を読む補助のみ** | Reading Japanese・Phrase Reading・Reading Memo・**Reading Hint** | 静かな読書の声・**推論/翻訳/数値/ラベルなし** |
| **Word(StudyPanel)** | **単語を調べる** | Greek・Morph・Syntax・Semantic・Lexical・Concordance・Usage | 語アンカーのデータ・分析 |
| **Passage(別 View)** | **段落構造を研究する** | Theme・Repetition・Inclusio・Chiasm・Parallelism・Discourse | 構造分析・**StudyPanel 責務外** |

- **Evidence**: SP-SD-1(StudyPanel=word-anchored・Passage 外)・RM-0(Reading の静かな声)・SP-2(三つの家)。
- **Severity**: **P1**(責務の最終確定は将来機能の前提)。
- **Conclusion**: **Reading=読む声(全スコープの読む面)/ Word=語を調べる / Passage=段落構造を研究**。三者完全分離。

## Phase 2: Reading に置く情報の整理

| 項目 | Scope | Purpose | 編集方針 |
|---|---|---|---|
| **Reading Japanese** | verse(token 実体) | 決定的な読みを読む | 推論/翻訳なし・決定的 fact のみ(L-0/M-15) |
| **Phrase Reading** | phrase | 句の意味の流れを読む | 現象→Intent→文章(既存正典) |
| **Reading Memo** | clause / verse | 談話の流れを読む | RM-0(静かな 1 文・分類ラベル/生マーカー/数値の非露出・Guard Rule) |
| **Reading Hint(新規)** | **passage** | **段落を読む入口** | **RM-0 の人格を段落スコープへ拡張**(静かな声・繰り返しの気づき・数値/ラベル/Corpus なし) |

- **Evidence**: 各既存正典 + RM-0。Reading Hint は Reading Memo と同じ編集人格の段落版。
- **Severity**: **P2**(Reading Hint の編集方針が RM-0 と一致することが条件)。
- **Conclusion**: **Reading の 4 項目はすべて「静かな読書の声」で統一**。Reading Hint も同じ人格に従う。

## Phase 3: Reading Hint の責務(条件監査)

- **定義**: **Reading Hint は「段落を読む入口」**——この段落を読み始める前/読みながらの、静かな気づき。
- **条件 1（StudyPanel の代替禁止）**: **Lexical / Semantic を代替してはならない**。Reading Hint は
  「調べる」ではなく「読む」——**データ(出現回数/Cluster/Concordance/詳細語義)を持たない**。それらは
  Word の家(StudyPanel)の責務。**→ 監査: Reading Hint がデータを持てば StudyPanel と重複し責務衝突(不可)**。
- **条件 2（Reading Memo 人格の非破壊）**: **RM-0 の人格を壊してはならない**。Reading Hint は Reading Memo と
  **同じ静かな声・非露出規律・Guard Rule 準拠**であること。**→ 監査: 数値/ラベルを持ち込めば Memo と同じ
  人格破壊(不可)**。Reading Hint は Memo の「段落版」であり、両者は声を共有する。
- **Evidence**: RM-0(Guard Rule・静かな 1 文)・SP-SD-1(Lexical/Semantic は Word)・SP-3 Phase5/6。
- **Severity**: **P1**(データ混入で StudyPanel 重複 + Memo 人格破壊)。
- **Conclusion**: **Reading Hint = 段落を読む入口(静かな気づき)。データ・詳細語義は持たず、RM-0 の声を継承**。

## Phase 4: Word の責務整理(重複評価)

| 情報 | Scope | Word 内の位置 | 重複 |
|---|---|---|---|
| Greek / Morph / Syntax | token / clause | 語形・構造(L1〜L2) | 低 |
| **Semantic**(LN/意味) | corpus/verse | 意味近接(L3) | Lexical・Cluster と近接 |
| **Lexical**(同 lemma/語族/別 lemma 同訳) | corpus/token | L3 corpus 帯 | **Concordance・Cluster・Usage と重複** |
| **Concordance / 用例** | corpus | 出現箇所(L3) | Lexical(同 lemma 反復)と重複 |
| **Usage**(使用傾向) | corpus | L1/L3 | Lexical(使用傾向補足)と重複 |
| **Cluster** | corpus | 意味クラスタ(L3) | Semantic・Lexical(別 lemma 同訳)と重複 |

- **評価**: Word の家は **word-anchored データを一手に引き受ける**。内部で **Lexical↔Concordance↔Cluster↔
  Semantic↔Usage が corpus 帯(L3)で重複**するため、**Word 内での統合整理が必要**(SP-3 Phase4)。ただし
  これは Word の家の内部課題であり、Reading との境界は明確(Reading にデータを出さない)。
- **Evidence**: SP-2 Phase7・SP-3 Phase4。
- **Severity**: **P2**(Word 内の corpus 帯重複整理)。
- **Conclusion**: **Word は語のデータを一手に持ち、L3 corpus 帯の重複(Lexical/Semantic/Concordance/Cluster/
  Usage)を統合整理する**。Reading へはデータを漏らさない。

## Phase 5: Reading Hint に載せられる/載せられない

| 載せられる(読む声で言える気づき) | 載せられない(データ/ラベル/数値=Word 責務) |
|---|---|
| この章で繰り返される語 | Strong 番号 |
| 同じ語が繰り返される | LN(Louw-Nida)番号 |
| 同じ語族が続く | 出現回数(数値) |
| (段落の流れ・響きの気づき) | Cluster |
| | Concordance 一覧 |
| | 詳細語義 |

- **評価**: 境界線は **RM-0 と同一**——**「静かな読書の声で、繰り返し/流れの気づきとして言えるもの」は可**、
  **数値・ラベル・Corpus 一覧・詳細語義は不可**(Guard Rule・Word 責務)。段落スコープでも規律は変わらない。
- **Evidence**: RM-0 Phase6/7・SP-3 Phase5。
- **Severity**: **P1**(不可側の混入で人格破壊 + StudyPanel 重複)。
- **Conclusion**: **Reading Hint は「繰り返し・流れの気づき」のみ。数値/ラベル/一覧/詳細語義は Word へ**。

## Phase 6: Passage View との責務整理

| | **Reading Hint** | **Passage View** |
|---|---|---|
| 家 | **Reading**(読む) | **Passage**(研究) |
| スコープ実体 | passage の**読む面** | passage の**分析面** |
| 目的 | 段落を**読む入口** | 段落**構造の研究** |
| 声/様式 | 静かな読書の声(RM-0 継承) | 構造分析(Inclusio/Chiasm/Parallelism/Discourse) |
| 内容 | 繰り返される語の気づき | 修辞構造・談話構造・照応連鎖 |
| 数値/ラベル/構造データ | **なし** | 構造データを持ちうる |

- **評価**: **同じ passage スコープを、Reading Hint は「読むために軽く」・Passage View は「研究のために構造的に」
  扱う**(語スコープの Reading Japanese と Morph の関係と同型)。両者は**声と目的で完全分離**し、重複しない。
- **Evidence**: SP-2(Passage の家)・本設計原理(読む面/調べる面)。
- **Severity**: **P2**。
- **Conclusion**: **Reading Hint=段落の読む入口(軽い気づき)/ Passage View=段落構造の研究(分析)**。同スコープの
  読む面と分析面。

## Phase 7: Progressive Disclosure(Reading → Word → Passage)

- **評価**: **三段構造は成立する**。**Reading(読む: RJ/Phrase/Memo/Hint)→ Word(調べる: Greek/Morph/Syntax/
  Semantic/Lexical/Concordance)→ Passage(研究: Theme/Repetition/Discourse/Rhetoric)**。Reading Hint は
  Reading の家の入口(段落の読む面)、Passage View は最深部(段落構造の研究)に位置し、**読む面は上・分析面は
  下**という一貫した勾配で三段が保たれる。**条件**: Reading Hint がデータ化しない(Word へ降りない)・Passage を
  Word 階層に混ぜない(SP-3 の維持条件)。
- **Evidence**: SP-3 Phase2/8・SP-2 Phase8。
- **Severity**: **P1**(条件を破ると三段が崩れる)。
- **Conclusion**: **Reading → Word → Passage の三段は成立**。読む面(Reading Hint 含む)を上、分析面を下に保つ。

## Phase 8: 総合評価

- **P0 なし**。**P1×3**(Phase1 責務確定 / Phase3・5 Reading Hint のデータ非混入 / Phase7 三段維持)は、
  すべて **「Reading にデータを出さない・Passage を Word に混ぜない」** という本設計の分離線を守れば回避可能。
- 分離は明快(Reading=読む声 / Word=語のデータ / Passage=段落構造)で、**Reading Hint は Reading Memo の
  段落版として声を継承**し、StudyPanel を代替しない。

| Phase | 監査 | Severity |
|---|---|---|
| 1 | 三者責務境界 | **P1** |
| 2 | Reading 情報整理 | P2 |
| 3 | Reading Hint 責務(データ非混入) | **P1** |
| 4 | Word 責務(corpus 帯重複) | P2 |
| 5 | Reading Hint 載否分類 | **P1** |
| 6 | Passage View との整理 | P2 |
| 7 | Progressive Disclosure 三段 | **P1** |

---

## Final Information Architecture(一枚)

```
Reading（読む・静かな読書の声・推論/翻訳/数値/ラベルなし）
├ Reading Japanese   … verse    決定的 fact（M-15 反映済）
├ Phrase Reading     … phrase   句の流れ
├ Reading Memo       … clause/verse  談話の流れ（RM-0 人格）
└ Reading Hint       … passage  段落を読む入口（RM-0 継承・繰り返しの気づきのみ）
        ↓  読む → 調べる
Word（調べる・StudyPanel・word-anchored データ）
├ Greek              … token
├ Morph              … token
├ Syntax             … clause
├ Semantic           … corpus  （LN/意味）
├ Lexical            … corpus/token（同 lemma/語族/別 lemma 同訳）※L3 で重複統合整理
└ Concordance        … corpus  （用例/使用傾向/Cluster を含む corpus 帯）
        ↓  調べる → 研究する
Passage（研究・別 View・StudyPanel 責務外・構造分析）
├ Theme              … passage
├ Repetition         … passage
├ Discourse          … passage（談話構造・照応連鎖）
└ Rhetoric           … passage（Inclusio/Chiasm/Parallelism/対比）
```

- **読む面は上(Reading・Reading Hint 含む)/ 分析面は下(Word・Passage)**。同じスコープでも読む面と分析面を
  上下に分離する。**Reading Hint(段落の読む面)と Passage View(段落の分析面)は声と目的で完全分離**。

---

## FROZEN 判定

- **FROZEN 可能**。
- **理由**: **Reading=読む / Word=調べる / Passage=研究 の三者責務が、各スコープの「読む面/分析面」原理で
  一意に確定**した。新規 Reading Hint は Reading Memo の段落版として RM-0 の声を継承し、StudyPanel(Lexical/
  Semantic)を代替せず、データを持たない。P1 はすべて本設計の分離線(Reading にデータを出さない・Passage を
  Word に混ぜない)で塞がれ、新規 P0 はない。
- **UI 設計へ進める条件**:
  1. **Reading の家(RJ/Phrase/Memo/Hint)には数値・ラベル・Corpus 一覧・詳細語義を出さない**(RM-0 統一)。
  2. **Reading Hint は「繰り返し・流れの気づき」のみ**——StudyPanel の Lexical/Semantic を代替しない。
  3. **Word の家(StudyPanel)で L3 corpus 帯(Lexical/Semantic/Concordance/Cluster/Usage)の重複を統合整理**。
  4. **Passage(Theme/Repetition/Discourse/Rhetoric)は StudyPanel の word 階層に載せず別 View**。
  5. **読む面(Reading・上)と分析面(Word/Passage・下)を上下に保ち、Reading → Word → Passage の三段を維持**。

```
[reading-word-separation-design FROZEN 2026-07-22]
原理: 各スコープに読む面/分析面。読む面→Readingの家(静かな声・数値/ラベルなし)・分析面→Word(StudyPanel)/Passage(別View)
三者: Reading=読む(RJ/Phrase/Memo/Hint) / Word=語を調べる(Greek/Morph/Syntax/Semantic/Lexical/Concordance/Usage) / Passage=段落構造を研究(Theme/Repetition/Inclusio/Chiasm/Parallelism/Discourse・StudyPanel外)
Reading Hint(新規): passageの読む面・段落を読む入口・RM-0人格継承(静かな声・繰り返しの気づきのみ)。StudyPanel Lexical/Semanticを代替しない・Reading Memo人格を壊さない
Reading Hint載せられる: この章で繰り返される語/同じ語反復/同じ語族が続く。載せられない: Strong/LN/出現回数/Cluster/Concordance一覧/詳細語義(=Word責務)
Reading Hint vs Passage View: 同passageスコープの読む面(軽い気づき・静かな声)vs分析面(構造研究)。声と目的で完全分離
Word重複: L3 corpus帯でLexical↔Concordance↔Cluster↔Semantic↔Usage重複→Word内で統合整理(Reachへデータ漏らさない)
Progressive Disclosure: Reading(読む・読む面上)→Word(調べる)→Passage(研究・分析面下)三段成立。条件=Readingデータ化しない/PassageをWordに混ぜない
総合: P0なし・P1×3は分離線遵守で回避可。FROZEN可能。UI設計5条件
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結(Reading/Word/Passage 三者分離・各スコープ読む面/分析面原理・Reading Hint=段落の読む面/RM-0 継承・Final IA・FROZEN 可能・UI 設計 5 条件) |
