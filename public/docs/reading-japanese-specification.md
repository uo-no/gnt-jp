# Reading Japanese Specification(プロジェクト根幹仕様・正典)

策定日: 2026-07-22
位置づけ: 本アプリの日本語表示システム **Reading Japanese** のプロジェクト根幹仕様(正典)。
Data / Morph / Syntax / Semantic / Builder / Reading Memo / Reading Hint / Presentation を一つに束ねる。
**本 Stage は文書のみ。コード・bible_data 変更なし。**
上位原則: reading-japanese-policy.md(L-0)。個別正典: phrase-reading.md・morph-rule-engine-v1-frozen.md・
reading-japanese-adoption-execution-report.md(M-15)・reading-memo-editorial-character-audit.md(RM-0)・
reading-word-separation-design.md(SP-4)・reading-hint-v1-release-freeze-audit.md(SP-16)。

---

## 0. 根幹テーゼ

> **Reading Japanese は「翻訳」ではない。ギリシャ語の構造(数・性・人称・格・指示・語形・節構造)を
> 読むための日本語表示である。**

- **原文(新改訳)を起点(Data 代表語)として保持**し、**決定的に定まる構造のみ**を日本語の読みに反映する。
- **推論しない・翻訳しない・語義を勝手に選ばない・自然な日本語へ整えない**(L-0)。目的は「自然な訳文」でなく
  「ギリシャ語構造を追える読み」。

---

## 1. 責務レイヤ(決定的 fact のみ)

| 層 | 責務 | 例 |
|---|---|---|
| **Data(代表語)** | 起点の日本語(新改訳由来)を保持 | 私・あなた・この |
| **Morph** | 語形(数/性/人称/格/語形)を決定 | 私→私たち・彼→彼ら・〜する者→〜するもの |
| **Syntax** | 構造(節役割/referent/指示のはたらき)を決定 | 関係詞・pronominal 指示詞(この→これ) |
| **Semantic** | 決定的意味情報を提供(**語義選択はしない**) | LN ドメイン・慣用句(source=semantic) |
| **Builder** | 決定的 fact のみを採用し verse の読みを確定(**判定・推論なし**) | Morph/Syntax 採用の記録層 |
| **Presentation** | 表示のみ | chip / StudyPanel |

- **一意性の勾配**: Morph > Syntax > Semantic。**決定的で一意なもののみ採用**し、文脈依存・非一意は採用しない
  (Reading Japanese Builder・M-8f)。

---

## 2. bible_data.japanese の役割(M-15 反映後)

- **bible_data.japanese = 採用済み Reading Japanese の単一正規値**(Data 代表語 + 固定点の Morph/Syntax 採用)。
- **反映は「固定点」のみ**——代名詞/関係詞/指示詞の数・性・人称(engine 再処理後も値が変わらない語形)。
  **動詞屈折は Data 層に固定せず、engine が表示時に動的生成**(reading-japanese-data-layer-boundary-freeze)。
- **原文(新改訳)は Data の起点として不変**。旧値は adoption diff / git / Editorial 台帳で保持
  (bible_data に `japanese_old/new` を持たない)。
- 反映実績(M-15): 固定点 2,537 token(代名詞/関係詞/指示詞)。動詞屈折は Data 層保持対象外。

---

## 3. 読みを支える三つの家(SP-4)

| 家 | 責務 | 構成 |
|---|---|---|
| **Reading(読む)** | 文章として読む補助(静かな読書の声・推論/翻訳/数値/ラベルなし) | Reading Japanese・Phrase Reading・Reading Memo・Reading Hint |
| **Word(調べる)** | 語を調べる(StudyPanel・word-anchored) | Greek・Morph・Syntax・Semantic・Lexical・Concordance・Usage |
| **Passage(研究)** | 段落構造を研究(別 View・StudyPanel 責務外) | Theme・Repetition・Discourse・Rhetoric |

- **読む面は上・分析面は下**。同じスコープでも「読む面(Reading)」と「分析面(Word/Passage)」を分離する。

---

## 4. Reading Memo(この節の読書メモ)

- **決定的生成物**——ReadingFormatter(唯一の自然文生成源)が Wallace の談話・構文解析から静かな一文を生成。
- **人格(RM-0)**: 読者視点(「ここでは/この流れでは」)・分類ラベル/生マーカー/confidence 数値の非露出・
  Guard Rule(assertReadingTextSafe)が漏洩を throw。**保存されず毎回再生成**(判断を含まないため)。
- スコープ: clause / verse(節の談話の流れ)。

---

## 5. Reading Hint(段落を読む入口)

- **Editorial Asset**——編集済み・保存済みの静的資産(reading-hints.json)。**Runtime に AI 推論・生成なし**。
- **人格(SP-5)**: 段落・章を読み始める読者に、読みで聞こえる繰り返しの気づきを、ラベル/数値/原語を出さず
  静かな一文で差し出す入口。
- スコープ: pericope(段落・SP-6)。**冒頭節でのみ表示**・1 pericope 1 つ以下。
- データ: bible_data 外の独立台帳・read-only 参照・focusLemmaId(不変アンカー)・status/version 管理
  (SP-7/SP-7A)。編集は AI=支援・人=判断公開の Editorial Workflow(SP-8)。
- v1: 5 件 published(HEB11/2CO1/JHN15/ROM3/1CO13)・Release Freeze 承認(SP-16)。

---

## 6. 品質保証(監査を経た資産)

- **Reading Japanese**(反映)は機械適用(before 一致 → after 置換)+ 三重 rollback(diff/git/台帳)+ 監査
  (M-15)。engine ロジックは非改変(合成トークン回帰 ALL PASS)。
- **語彙一貫性**(M-16): 同一 lemma は同一日本語で読める(REVIEW 級欠陥 0)。
- **修辞一貫性**(M-16.5): 反復・強調・語族区別を保持(唯一の課題=同義語対比は将来 Semantic)。
- **Editorial Review**(M-5/M-12): verse 単位 Accepted/Revise/Pending 台帳(bible_data と分離)。

---

## 7. しないこと(L-0 境界)

- **翻訳しない**(自然な訳文を目的にしない)。**推論しない**(referent/discourse を勝手に解決しない)。
- **語義を勝手に選ばない**(Semantic は情報提供のみ・ἀγαπάω/φιλέω を両方「愛する」とし対比を暴かない)。
- **自然な日本語へ整えない**(語順変更・敬体化をしない)。
- **未判定を埋めない**(Unresolved by Design——discourse 依存・非一意は現状維持)。

---

## 8. 正典としての位置づけ

- 本仕様は **Reading Japanese システム全体の根幹仕様**であり、個別 FROZEN 文書(L-0/phrase-reading/Morph Rule
  Engine/M-15/RM-0/SP-4/SP-16 等)を束ねる入口とする。**個別仕様の変更は各 FROZEN 文書で行い、本仕様は
  その全体像を示す**。

```
[reading-japanese-specification 正典 2026-07-22]
根幹テーゼ: Reading Japaneseは翻訳でなくギリシャ語構造(数/性/人称/格/指示/語形/節構造)を読むための日本語表示。原文(新改訳)をData起点に保持し決定的構造のみ反映・推論/翻訳/語義選択/自然化しない(L-0)
レイヤ: Data代表語 / Morph語形 / Syntax構造 / Semantic意味情報(語義選択せず) / Builder決定fact採用(判定なし) / Presentation表示。一意性の勾配Morph>Syntax>Semantic
bible_data.japanese: 採用済みReading Japanese単一正規値(M-15)。固定点(代名詞/関係詞/指示詞の数性人称)のみ反映・動詞屈折はData非固定でengine動的生成。原文Data不変・旧値はdiff/git/台帳
三つの家(SP-4): Reading(読む=RJ/Phrase/Memo/Hint) / Word(調べる=StudyPanel) / Passage(研究=別View)。読む面上/分析面下
Reading Memo: 決定的生成物(ReadingFormatter・RM-0人格・Guard Rule・非保存再生成)。clause/verse
Reading Hint: Editorial Asset(reading-hints.json・Runtime生成なし)・pericope冒頭・SP-5人格・独立台帳。v1 5件Release Freeze承認(SP-16)
品質: 反映は機械適用+三重rollback+監査(M-15)・語彙一貫M-16・修辞一貫M-16.5・Editorial Review台帳M-12
しないこと: 翻訳/推論/語義選択/自然化/未判定補完(L-0)
正典: Reading Japanese全体の根幹仕様・個別FROZEN文書を束ねる入口
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・正典(Reading Japanese 根幹仕様: 翻訳でなくギリシャ語構造を読む日本語・6 レイヤ・bible_data 役割・三つの家・Memo/Hint・品質・L-0 境界・個別 FROZEN 文書を束ねる) |
