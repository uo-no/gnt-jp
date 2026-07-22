# Stage SP-13 Reading Hint v1 Post-Implementation Audit

実施日: 2026-07-22
監査者立場: **品質監査担当(実装担当ではない)**。SP-12 実装が SP-5〜SP-12 の凍結設計・責務境界を守るかを
独立監査する。**コード・UI・データ変更なし。問題は修正せず Severity と根拠を記録する。**
根拠(FROZEN): reading-hint-editorial-specification.md(SP-5)・-unit-trigger-design.md(SP-6)・
-data-model-design.md(SP-7)・-metadata-review.md(SP-7A)・-editorial-workflow-design.md(SP-8)・
-candidate-selection-rules.md(SP-9)・-v1-implementation-plan.md(SP-12)。

Reading Hint の人格(凍結): 「段落・章を読み始める読者に、日本語の読みの中で聞こえる繰り返しや流れの
気づきを、分類ラベル・数値・原語を出さずに静かな一文で差し出す、読書の入口の編集メモ」。

Severity 凡例: **P0(即修正必須)/ P1(設計境界違反)/ P2(改善余地)/ P3(軽微)**。

---

## 変更ファイル確認

| ファイル | 変更 | 種別 |
|---|---|---|
| **public/assets/data/reading-hints.json** | 新規(5 件・全 published) | Editorial Asset |
| **public/index.html** | +64 行(**純加算・削除 0**) | JS 3 関数 + CSS 1 + 呼び出し 2 |

- reading-engine.js / clause-analyzer.js(ReadingFormatter/Guard Rule)/ bible_data / StudyPanel は**本実装で
  未編集**(独立確認済)。

---

## Phase 1〜8 監査結果

### Phase 1: Reading Memo 保護 — **PASS**

- **評価**: Reading Memo の生成系は**完全非改変**。ReadingFormatter・`_WALLACE_TEXT`・Guard Rule
  (assertReadingTextSafe)は clause-analyzer.js にあり、**本実装で 1 文字も変更されていない**。Reading Hint は
  ReadingFormatter を**呼び出さない**(engine/Formatter 実呼び出し 0・コメント言及のみ)。Memo=clause/verse・
  ドロワー / Hint=pericope・本文フローで**責務混線なし**。
- **Evidence**: clause-analyzer.js の git 差分 0。Reading Hint 関数(index.html 8218–8259)に
  ReadingFormatter/resolve/_wallace の実呼び出し 0(grep 実測・マッチ 1 は「出さない」コメント)。
- **Severity**: 該当なし(**PASS**)。

### Phase 2: StudyPanel 保護 — **PASS**

- **評価**: **Word 情報は Hint 表示へ一切流入していない**。表示は `el.textContent = hint.hintText` の**hintText
  のみ**。lemma / Strong / Morph / Syntax / Semantic / LN / Cluster / Concordance を**描画しない**。
  `focusLemmaId` は JSON に保持されるが**表示コードに参照なし**(el 生成部に focusLemmaId 参照 0=非表示)。
- **Evidence**: index.html 8253–8257(textContent=hintText のみ・focusLemmaId 参照 0)。Word 用語の実描画 0。
- **Severity**: 該当なし(**PASS**)。
- **軽微観察(P3)**: `data-reading-hint` 属性に `hint.id`(例 "rh-heb11-001")を保持。これは**非表示の data 属性の
  内部 id**であり、Greek/lemma/Strong/回数ではなく読者に露出しない(標準的な DOM トラッキング・違反ではない)。

### Phase 3: Reading Hint Editorial Character — **PASS**

全 5 件の hintText を確認:

| 参照 | hintText | 判定 |
|---|---|---|
| HEB 11:1 | この章では、「信仰」ということばが、初めから終わりまで繰り返し響きます。 | 読者視点・静かな 1 文 |
| 2CO 1:3 | この段落では、「勧め」ということばが、寄せては返すように重なって聞こえてきます。 | 同上 |
| JHN 15:1 | この段落では、「とどまる」ということばが、初めから終わりまで繰り返し響きます。 | 同上 |
| ROM 3:21 | ここから、「義」ということばが、幾度も重ねて現れてきます。 | 同上 |
| 1CO 13:1 | この章では、「愛」ということばが、幾度も立ち返ってきます。 | 同上 |

- **評価**: 全て**読者視点**(「この章では/この段落では/ここから」)・**静かな 1 文**・**要約化していない**
  (一気づきのみ)・**教師的説明でない**(「〜すべき」なし)・**神学解説でない**・**原語を隠して提示していない**
  (見える日本語語のみ)・**他訳比較でない**(慰め等の別訳を出さず読みの語「勧め」のみ)。人格定義に合致。
- **Evidence**: reading-hints.json 全 hintText(上表)。
- **Severity**: 該当なし(**PASS**)。

### Phase 4: 非露出ルール — **PASS**

- **評価**: 独立 lint で **Greek/原語・Strong 番号・数値/回数・「反復」・「語族」・「原語」・分析ラベル
  (lemma/LN/Cluster/Concordance/Morph/Syntax/Semantic)= 違反 0**。
- **Evidence**: reading-hints.json 全 hintText の正規表現 lint 結果 = 違反合計 0(実測)。
- **Severity**: 該当なし(**PASS**)。

### Phase 5: Data Model Integrity — **PASS**

- **評価**: reading-hints.json は **public/assets/data/(bible_data 外)** に存在。**bible_data を変更していない**
  (252 ファイルは M-15 のまま・追加変更 0)。実装は **fetch による read-only 参照**のみ(書き込みなし)。
  Editorial Asset として**独立**(SP-7)。bible_data 内に hint ファイル 0。
- **Evidence**: 配置=assets/data・bible_data 差分 0・bible_data 内 hint ファイル 0(実測)。
- **Severity**: 該当なし(**PASS**)。

### Phase 6: Runtime Isolation — **PASS**

- **評価**: **Runtime に AI 生成・推論・自動生成なし**——公開済み JSON を fetch して索引化し、verseStart 一致で
  hintText を出すだけ(決定的 read)。**fetch 失敗時は空 Map で継続**(catch)し既存表示に影響なし。
  **Hint なし節は早期 return**(hint 無し→DOM 追加なし)で**以前と完全同一表示**。
- **Evidence**: `_loadReadingHints`(catch→空 Map)・`_appendReadingHint`(hint 無しで return・try/catch)・
  engine/推論/生成の呼び出し 0(実測)。
- **Severity**: 該当なし(**PASS**)。

### Phase 7: Progressive Disclosure — **PASS**

- **評価**: **Reading(Reading Japanese → Reading Hint → Reading Memo)/ Word(StudyPanel)の責務分離を維持**。
  - **L1 読む層を重くしていない**——pericope 冒頭に**静かな 1 行**のみ(毎節でない・大カードでない)。
  - **StudyPanel の役割を奪っていない**——Word データ(lemma/Strong/Concordance 等)を持たない。
  - **Passage 構造を混入していない**——inclusio/chiasm/parallelism/discourse 構造を出さず、読みの反復の
    気づきのみ。
- **Evidence**: CSS `.reading-hint`(caption サイズ・opacity secondary・border-left の控えめ表示・大カードなし)。
  表示は hintText のみ。
- **Severity**: 該当なし(**PASS**)。

### Phase 8: 表示位置監査 — **PASS**

- **評価**: **pericope 冒頭のみ表示**——`_getReadingHintForVerse` は **verseStart 一致の節でのみ** Hint を返し、
  他の節では null(**毎節表示にならない**)。Reading 本文の該当節ブロック後に加算するため**本文の流れを
  壊さない**(既存ブロックを書き換えず加算)。Reading Memo は word-list-view ドロワーにあり、Hint は本文
  フローのため**視覚的競合なし**。
- **Evidence**: 8237–8242(verseStart===v のみ)・8563(該当節 append 後に加算)。Memo は別領域(ドロワー)。
- **Severity**: 該当なし(**PASS**)。
- **軽微観察(P3・スコープ)**: v1 は**主 Reading ビュー(非比較 single 分岐)のみ**に加算し、compare-mode には
  加算しない。これは SP-12 の v1 スコープ決定であり違反ではない(将来拡張余地)。

---

## 既存機能への影響

| 対象 | 変更有無 | 判定 |
|---|---|---|
| **bible_data** | なし(252・M-15 のまま) | **PASS** |
| **reading-engine.js** | なし(reading-hint 記述 0・本実装で未編集) | **PASS** |
| **ReadingFormatter**(clause-analyzer.js) | なし(git 差分 0) | **PASS** |
| **Guard Rule**(assertReadingTextSafe) | なし(未改変) | **PASS** |
| **Reading Memo**(生成ロジック) | なし(未改変・責務混線なし) | **PASS** |
| **StudyPanel** | なし(Word 情報流入なし) | **PASS** |

- 参考: engine 回帰 9/9 ALL PASS(engine 非改変の担保)・主 script ブロック 7361 行構文 OK。

---

## 総合判定

**FROZEN 継続可能。**

- SP-12 実装は **純加算(index.html +64 行・削除 0 + 独立 JSON 1)** で、**engine / ReadingFormatter / Guard Rule /
  Reading Memo / bible_data / StudyPanel を一切改変せず**、Reading Hint の人格(静かな読書の入口・非露出・
  一文)と責務境界(Reading の家・pericope 冒頭・Word 非流入・Passage 非混入)を守っている。
- 8 Phase すべて **PASS**、既存機能への影響 6 対象すべて **変更なし/PASS**。**P0/P1/P2 の指摘なし**。
- 軽微観察(P3)は 2 点——(a)`data-reading-hint` の内部 id(非表示・違反でない)、(b)v1 が compare-mode 非対象
  (SP-12 スコープ決定)。いずれも設計境界違反ではなく、修正不要。

---

[reading-hint-v1-post-implementation-audit FROZEN候補 2026-07-22]

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版(SP-12 実装の独立品質監査・8 Phase 全 PASS・既存 6 対象 変更なし・P0/P1/P2 なし・P3×2 は違反でない・FROZEN 継続可能) |
