# Reading Hint Editorial Specification(Stage SP-5)

策定日: 2026-07-22
位置づけ: SP-4 で新設した **Reading Hint(段落・章を読む入口)の編集方針(Editorial Character)**を定義する。
**UI 変更・コード変更・デザイン・生成実装は禁止。編集仕様のみ。**
前提(FROZEN・変更禁止): RM-0(Reading Memo Editorial Character)・SP-IA-1 / SP-SD-1 / SP-2 / SP-3 / SP-4。
根拠: reading-memo-editorial-character-audit.md(RM-0)・reading-word-separation-design.md(SP-4)・
reading-japanese-policy.md(L-0)。M-16.5 の実測を代表ケースに使用。

Reading Hint は **Reading の家**に属する。**StudyPanel / Passage View を代替せず、Reading Memo の人格を継承する**。

Severity 凡例: **P0(致命)/ P1(高)/ P2(中)/ P3(低)**。

---

## Phase 1: Reading Hint の目的

- **助けるもの**: **段落・章を読み始める読者が、日本語の読みの中で「聞こえる」繰り返し・流れ・つながりに
  気づくこと**。読書の入口として、これから読む段落の「響き」を静かに予告する。
- **助けないもの**: 語の分析(Morph/Syntax/Semantic)・データ検索(Concordance/Cluster/出現回数)・
  段落構造の研究(Inclusio/Chiasm/Discourse 構造)・原語の区別の解明。これらは **Word / Passage の責務**。
- **Evidence**: SP-4(Reading=読む/Word=調べる/Passage=研究)・RM-0(読解補助)。
- **Severity**: **P2**。
- **Conclusion**: **Reading Hint は「段落を読む入口」——読みの中で聞こえるものに気づかせるだけで、調べも
  研究もしない**。

## Phase 2: Editorial Character(一文定義)

> **「段落・章を読み始める読者に、日本語の読みの中で聞こえる繰り返しや流れの気づきを、分類ラベル・数値・
> 原語を出さずに静かな一文で差し出す、読書の入口の編集メモ」。**

- **Evidence**: RM-0 の編集思想(分類ラベル/数値/原語を出さない静かな声)を段落スコープへ拡張。
- **Severity**: **P2**。
- **Conclusion**: **Reading Memo の段落版**——声(静かな読者視点)と規律(非露出)は共有し、スコープが
  段落へ広がる。

## Phase 3: 載せられる内容の分類

| 内容 | 判定 | 条件 |
|---|---|---|
| **反復**(日本語の読みで同じ語が繰り返し聞こえる) | **採用可** | 核心。ページ上に見える/聞こえる反復のみ |
| **前後とのつながり**(段落の流れ) | **採用可** | 読書の声で(Reading Memo の段落版) |
| 同一 lemma | **条件付き** | **見える同じ日本語の反復**としてのみ可。lemma 同定(原語の主張)は不可 |
| 語族 | **条件付き** | **見える共通語根(例: 義)の反復**としてのみ可。語源分析は不可 |
| 段落テーマ | **条件付き** | 読みの**印象**(「〜が中心に響く」)まで可。分析的テーマ断定は Passage |
| 強調 | **条件付き** | 読みで**聞こえる強調**まで可。修辞的強調の分析は Passage |

- **Evidence**: SP-4 Phase5(繰り返し/流れの気づき可)・RM-0 Phase6(反復は流れとして条件付き)。
- **Severity**: **P2**。
- **Conclusion**: **「日本語の読みの中で見える/聞こえるもの」だけが載る**。原語同定・語源・構造分析は載らない。

## Phase 4: 載せられない内容の分類(責務明記)

| 内容 | 責務 |
|---|---|
| Strong 番号 / LN(Louw-Nida)番号 | **Word(StudyPanel)** |
| Cluster / Concordance 一覧 / 出現回数(数値) | **Word(StudyPanel・corpus 帯)** |
| 辞書 / 語義(詳細) / 他訳 | **Word(StudyPanel)**・他訳は Reading 決定的責務とも衝突 |
| Greek(原語)/ 形態論 | **Word(StudyPanel・token)** |
| Syntax / Semantic | **Word(StudyPanel)** |
| 隠れた原語の区別(例: ἀγαπάω/φιλέω) | **Word(StudyPanel)**——読みで見えないものは Hint が暴かない |
| 段落構造(Inclusio/Chiasm/Parallelism/Discourse 構造) | **Passage View** |

- **Evidence**: RM-0(数値/ラベル非露出・Guard Rule)・SP-SD-1/SP-4(データは Word・構造は Passage)。
- **Severity**: **P1**(これらの混入は人格破壊 + 責務越境)。
- **Conclusion**: **数値・ラベル・原語・語義・構造はすべて Reading Hint 外**(Word / Passage の責務)。

## Phase 5: 文章密度

- **定義**: **段落/章につき最大一〜二文**(入口の密度)。**情報数=1 つの気づき**(反復 or 流れ or つながりの
  いずれか一点)。数値なし・ラベルなし・箇条書きなし・一覧なし。
- **RM-0 人格を壊さない密度**: RM-0 は「1 関係 1 文」。Reading Hint は段落スコープでも **「1 段落 1 気づき」**に
  抑え、observation dump 化しない。**入口であって要約ではない**ため、二文を超えない。
- **Evidence**: RM-0 Phase4(1 関係 1 文・抑制が identity)・SP-3 Phase1(L1 常時層の低負荷維持)。
- **Severity**: **P1**(密度超過で入口が要約化し人格破壊)。
- **Conclusion**: **最大一〜二文・一気づき**。抑制を人格として保つ。

## Phase 6: Reading Memo との違い(責務境界)

| | **Reading Memo** | **Reading Hint** |
|---|---|---|
| スコープ | clause / verse | **passage / chapter** |
| 対象 | この節/節内の**談話の流れ**(なぜ/内容/目的/結果/条件/対比) | この段落の**繰り返し/流れ/つながりの気づき** |
| 単位 | 節ごと | 段落/章の入口に一度 |
| 声 | 静かな読書の声 | **同じ**(継承) |

- **評価**: **Memo=局所(節の流れ)/ Hint=全体(段落の入口)**。**重複しない**——Memo は段落反復を扱わず、
  Hint は節ごとの談話関係を扱わない。両者は**スコープで排他**。
- **Evidence**: RM-0(clause/verse)・SP-4(Hint=passage の読む面)。
- **Severity**: **P2**。
- **Conclusion**: **Memo は節の流れ、Hint は段落の入口。スコープで完全に分かれ重複しない**。

## Phase 7: StudyPanel / Passage View との境界

- **StudyPanel へ踏み込まない条件**: **データ(Strong/LN/出現回数/Concordance/Cluster/語義/Greek/形態論/
  Syntax/Semantic)を一切持たない**。Reading Hint が「調べ物」を始めた瞬間に越境する。
- **Passage View へ踏み込まない条件**: **段落構造の分析(Inclusio/Chiasm/Parallelism/Discourse 構造・照応連鎖)を
  しない**。Reading Hint は「構造がある」と分析せず、「同じ語が繰り返し聞こえる」と**読みの印象を言うだけ**。
- **評価**: Reading Hint は **StudyPanel の「入口」であり代替でない**(気づきが調べたい欲求を生み、読者が
  StudyPanel/Passage へ進む)。**Hint 自身は調べも研究もしない**。
- **Evidence**: SP-4 Phase3(Lexical/Semantic を代替しない)・SP-3 Phase6(Passage 侵入=IA 破綻)。
- **Severity**: **P1**(越境で StudyPanel/Passage 重複・IA 破綻)。
- **Conclusion**: **データを持てば StudyPanel、構造を分析すれば Passage——どちらもせず入口に留まる**。

## Phase 8: 代表ケース監査(編集者として)

| ケース | 読みの実測(M-16.5) | 書くべきか | 理由 | 責務 |
|---|---|---|---|---|
| **HEB11 πίστις** | 信仰 ×24(全章) | **書く** | 「信仰」が読みで反復的に響く=読者が聞こえる気づき | Reading Hint |
| **2CO1 παράκλησις** | 勧め ×6 / 勧める ×4 | **書く** | 「勧め/勧める」が密に畳みかける=同根の反復が聞こえる | Reading Hint |
| **JHN15 μένω** | とどまる ×11 | **書く** | 「とどまる」が最後まで繰り返し響く | Reading Hint |
| **ROM3 δικαιοσύνη** | 義 ×5 / 義と認める ×6 / 義の ×2 | **書く** | **見える共通語根「義」**が繰り返し現れる(語源分析でなく読みの印象) | Reading Hint |
| **JAS1 πειρασμός** | 誘惑 ×2 / 試みる ×4(別日本語) | **書かない** | 単一の反復語が読みで**聞こえない**(誘惑/試みるは別語)。πειρασμός/πειράζω の連関は原語同定=Word | Word(StudyPanel) |
| **JHN21 ἀγαπάω/φιλέω** | 両方 愛する | **書かない** | 意味ある内容は**隠れた原語の対比**(愛する では見えない)=Reading Hint が暴いてはならない | Word(StudyPanel) |

- **評価**: **「日本語の読みで一つの語/語根が繰り返し聞こえる」ケース(HEB11/2CO1/JHN15/ROM3)は書く**。
  **反復が読みで聞こえない(JAS1)、または重要な内容が隠れた原語の区別(JHN21)であるケースは書かない**
  ——後者は Word(StudyPanel)の責務であり、Reading Hint が原語の区別を surface すると越境かつ RM-0 の
  非露出規律違反。
- **Evidence**: M-16.5(各ケース実測)・RM-0(原語非露出)・SP-4(隠れた区別は Word)。
- **Severity**: **P1**(JHN21 型で原語対比を暴くと越境 + 人格破壊)。
- **Conclusion**: **見える/聞こえる反復は書く。見えない原語の連関・区別は書かず Word へ委ねる**。

## Phase 9: Progressive Disclosure(Reading → Word → Passage)

- **評価**: **維持される**。Reading Hint は **Reading(読む)の入口**で「気づき」を差し出し、それが読者を
  **Word(調べる: この語を StudyPanel で)/ Passage(研究する: 構造を Passage View で)**へ誘う。Hint 自身は
  調べも研究もしないため、**三段の頂点(読む)に留まり、下の層を代替せず、むしろ下の層への入口として機能**する。
- **Evidence**: SP-3 Phase2/8・SP-4 Phase7。
- **Severity**: **P2**。
- **Conclusion**: **Reading Hint は三段の入口。読む→調べる→研究の勾配を壊さず、下層への誘いとなる**。

## Phase 10: 総合評価

- **P0 なし**。**P1×4**(Phase4 データ非混入 / Phase5 密度 / Phase7 越境禁止 / Phase8 原語対比の非開示)は、
  すべて **「Reading Hint はデータ・原語・構造を持たず、読みで聞こえる一気づきだけを静かに書く」** という
  本仕様を守れば回避可能。仕様は RM-0 と完全整合。

| Phase | 監査 | Severity |
|---|---|---|
| 1 | 目的 | P2 |
| 2 | Editorial Character | P2 |
| 3 | 載せられる内容 | P2 |
| 4 | 載せられない内容 | **P1** |
| 5 | 文章密度 | **P1** |
| 6 | Reading Memo との違い | P2 |
| 7 | StudyPanel/Passage 境界 | **P1** |
| 8 | 代表ケース | **P1** |
| 9 | Progressive Disclosure | P2 |

---

## Reading Hint Editorial Rules(箇条書き)

- **読者の視点で書く**(「この章では/この段落では」・分析主語を避ける)。
- **数値を書かない**(出現回数・頻度など)。
- **ラベルを書かない**(Strong・Louw-Nida・型名・分類名)。
- **Greek(原語)を書かない**(lemma・原語綴りを出さない)。
- **語義・辞書を書かない**(詳細語義・語釈)。
- **他訳を書かない**(Reading の決定的責務と衝突)。
- **形態論・Syntax・Semantic を書かない**(Word の責務)。
- **隠れた原語の区別を暴かない**(例: ἀγαπάω/φιλέω=愛する の対比は Word へ)。
- **段落構造を分析しない**(Inclusio/Chiasm/Discourse 構造は Passage View へ)。
- **日本語の読みの中で見える/聞こえる反復・流れ・つながりだけを書く**。
- **最大一〜二文・一気づき**(入口の密度・要約化しない)。
- **読書を促す。研究を始めない**(下層への入口に留まる)。
- **静かな読書の声を保つ**(RM-0 継承・Guard Rule 準拠)。

---

## FROZEN 判定

- **FROZEN 可能**。
- **理由**: Reading Hint の編集人格が **RM-0 と完全整合**する一文で定義され、載せる/載せない内容・密度・
  Reading Memo/StudyPanel/Passage View との境界・代表ケースの書く/書かない判断がすべて**「読みで聞こえる
  一気づきのみ・データ/原語/構造なし」**の一線で確定した。P0 はなく、P1 は本仕様で塞がれている。
- **次に進める Stage**:
  - 編集仕様が揃ったため、**Reading の家の UI 設計(SP-4 の 5 条件下)** へ進める。
  - もしくは **Reading Hint の生成源設計**(どの決定的 fact=反復回数の内部判定 等から「読みで聞こえる反復」を
    選ぶかの責務設計。RM-0 の ReadingFormatter 同様、生成は別途)。いずれも本仕様を上位制約とする。

```
[reading-hint-editorial-specification FROZEN 2026-07-22]
人格: 段落・章を読む読者に、日本語の読みで聞こえる繰り返し/流れの気づきを、ラベル/数値/原語を出さず静かな一文で差し出す読書の入口メモ(RM-0の段落版)
目的: 読みで聞こえるものへの気づき(助ける) / 分析・検索・構造研究(助けない=Word/Passage)
載せられる: 反復・前後のつながり=採用可 / 同一lemma・語族・段落テーマ・強調=条件付き(見える/聞こえる範囲のみ)
載せられない: Strong/LN/Cluster/Concordance/出現回数/辞書/語義/他訳/Greek/形態論/Syntax/Semantic(=Word) / 段落構造(=Passage) / 隠れた原語の区別(=Word)
密度: 最大一〜二文・一気づき(要約化しない・RM-0の抑制を継承)
vs Reading Memo: Memo=clause/verseの談話の流れ / Hint=passageの読む入口。スコープで排他・重複なし
vs StudyPanel/Passage: データを持てばStudyPanel越境・構造分析すればPassage越境。どちらもせず入口に留まる
代表ケース: HEB11信仰24/2CO1勧め/JHN15とどまる/ROM3義族=書く(見える反復) / JAS1誘惑(反復聞こえず)・JHN21愛する(隠れた原語対比)=書かない(Word責務)
PD: Reading Hintは三段の入口・読む→調べる→研究を壊さず下層への誘い
Rules: 読者視点/数値なし/ラベルなし/Greekなし/語義なし/他訳なし/形態Syntax Semanticなし/隠れた区別暴かない/構造分析しない/読みで聞こえる反復流れのみ/最大一二文/読書促し研究始めない/静かな声
FROZEN可能。次: Readingの家UI設計(SP-4 5条件下) or Reading Hint生成源設計(本仕様を上位制約)
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結(Reading Hint 編集仕様・RM-0 段落版・載否分類・最大一二文・Memo/StudyPanel/Passage 境界・代表 6 ケース監査・Editorial Rules・FROZEN 可能) |
