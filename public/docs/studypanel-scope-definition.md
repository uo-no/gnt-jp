# StudyPanel Scope Definition(Stage SP-SD-1)

策定日: 2026-07-22
位置づけ: SP-IA-1 で StudyPanel の IA が概ね健全と確認したうえで、**Lexical / Rhetorical / Discourse など
将来機能について、どのスコープの情報を StudyPanel が扱うべきかを正式に定義・凍結する**。
**責務定義のみ。UI / コード / bible_data は変更しない。実装提案・デザイン提案はしない。**
根拠(FROZEN): reading-japanese-policy.md(L-0)・studypanel-information-architecture-audit.md(SP-IA-1)。

前提: Reading Japanese は **推論しない/翻訳しない/決定的 fact のみ**。**StudyPanel は Reading を補助する画面で
あり、Reading の責務を侵してはならない**。

Severity 凡例: **P0(致命)/ P1(高)/ P2(中)/ P3(低)**。Scope: Token / Phrase / Clause / Verse / Passage / Corpus。

---

## スコープ定義の核心原理

- **StudyPanel は「選択された 1 語(トークン)を起点に、その語へ還元できる情報」を扱う**(word-anchored)。
  Token(この語の形態)/ Phrase(この語の句)/ Clause(この語の節役割)/ Verse(この語を含む節の読み)/
  Corpus(この語の全巻用例)——**いずれも「この語について」**。
- **段落構造(Passage)は、どの単一語にも還元できない「構造そのもの」**であり、word-anchored でない。
  → **StudyPanel の責務外**(段落スコープの表示面の責務)。

---

## Phase 1: 各情報のスコープ分類

| Scope | 情報例 | 現 StudyPanel |
|---|---|---|
| **Token** | lemma・Strong・Morph(品詞/活用/時制/法/態/格/数/性)・語源・辞書全文 | ✓ L2「単語を詳しく調べる」 |
| **Phrase** | Phrase Reading(現象→Intent→文章)・修飾構造 | ✓ L1 phrase reading |
| **Clause** | 主節・従属節・関係節・Predicate(節役割) | ~ clause-analyzer・散文に織り込み(第一級不在) |
| **Verse** | Reading Japanese(displayLabel)・この節での響き・Editorial Status | ✓ L1 / 節Panel |
| **Passage** | Inclusio・Chiasm・三回の反復・段落テーマ・Discourse 構造 | ✗ 不在 |
| **Corpus** | 出現回数・Concordance・Cluster・LN・Usage Trend | ✓ L3 / 使用傾向 |

- **評価**: 現 StudyPanel は **Token〜Corpus を word-anchored で網羅し、Passage のみ不在**。Token(最小)と
  Corpus(最大)を両端で扱えるのは、両者とも「この語について」だから。**Passage だけが語に還元できない**。
- **Evidence**: L2 morphGrid=Token(5407)/L1 phrase reading=Phrase/clause-analyzer.js=Clause(3885)/
  displayLabel+「この節での響き」=Verse(2943)/L3 LN・cluster・concordance=Corpus(5520)。Passage 表示面なし。
- **Severity**: **P2**(Clause が第一級でない・Passage が未定義)。
- **Scope**: 全 6。

## Phase 2: StudyPanel が扱うべきスコープ

- **評価**: **StudyPanel が扱うべきは Token / Phrase / Clause / Verse / Corpus の 5 スコープ**(すべて
  word-anchored=選択語に還元可能)。**Passage は扱うべきでない**(語に還元できない構造・別スコープ責務)。
- **Evidence**: 現 IA は 5 スコープを語起点で提示済み。Passage は原理上 word-anchored でない(核心原理)。
- **Severity**: **P1**(Passage を扱うか否かの境界は将来機能で最も衝突しやすい)。
- **Scope**: Token / Phrase / Clause / Verse / Corpus =扱う / Passage =扱わない。

## Phase 3: StudyPanel に載せるべきでない情報

- **評価**: **①Passage 構造(Inclusio/Chiasm/Parallelism/段落テーマ/節横断 Discourse 構造)**——語に還元
  できない。**②Reading 責務を侵す情報(他訳候補・翻訳・語義推論を「決定的読み」として提示)**——L-0 違反。
  **③段落テーマ・談話の解釈**——推論を含み Reading/Discourse 層の責務。
- **Evidence**: L-0(推論/翻訳禁止)・SP-IA-1 Phase6/7(段落スコープ不一致・別画面責務)。
- **Severity**: **P1**。
- **Scope**: Passage(不可)/ 全スコープでの翻訳・推論(不可)。

## Phase 4: Lexical 情報の分類

| Lexical 候補 | Scope | StudyPanel 適性 |
|---|---|---|
| 同一 lemma(この語の他出現) | **Corpus** | 適(concordance と同軸・word-anchored) |
| 語族(cognate) | **Token / Corpus** | 適(この lemma の派生・word-anchored) |
| 同じ日本語だが別 lemma(逆引き) | **Corpus** | 適だが L3 cluster と重複整理要 |
| 他訳候補 | **Token / Verse** | **要注意**——Reading(決定的)との境界を侵さない範囲でのみ |

- **評価**: Lexical は概ね **Corpus/Token スコープで word-anchored=StudyPanel 適**。ただし **他訳候補は
  L-0 境界**(Reading 決定的読みと候補の混同禁止)。**「この語の反復」は語に還元でき Corpus/Verse 内で可**、
  「段落の反復パターン」は Passage=不可。
- **Evidence**: L3 concordance/cluster が既存の Corpus 軸(5520–5549)。
- **Severity**: **P2**(他訳の L-0 境界)。
- **Scope**: Token / Corpus(適)・他訳=境界注意。

## Phase 5: Rhetorical 情報の分類

| Rhetorical 候補 | Scope | StudyPanel 適性 |
|---|---|---|
| 反復(この語がキーワード反復) | **Passage**(語フラグは還元可) | 語フラグ=境界的に可 / 構造=不可 |
| Inclusio | **Passage** | **不可**(節横断構造・語に還元できない) |
| Chiasm | **Passage** | **不可** |
| Parallelism | **Passage / Clause** | 構造=不可 |
| Contrast(対比・ἀγαπάω/φιλέω 等) | **Passage / Clause** | **不可**(対比は 2 語以上の構造) |

- **評価**: **Rhetorical はほぼ Passage スコープ=StudyPanel 責務外**。唯一「この語は反復キーワード」という
  **語アンカーのフラグ(ポインタ)は境界的に還元可**だが、**修辞構造そのもの(inclusio/chiasm/対比)は
  段落スコープで扱えない**(核心原理)。M-16.5 の ἀγαπάω/φιλέω 対比も「2 語間の構造」で Passage。
- **Evidence**: SP-IA-1 Phase6(段落スコープ不一致・P1)。M-16.5 Case3(対比は複数語)。
- **Severity**: **P1**。
- **Scope**: Passage(構造=不可)/ 語アンカーのフラグ=境界的。

## Phase 6: Discourse 情報の分類

| Discourse 候補 | Scope | StudyPanel 適性 |
|---|---|---|
| この/その(deixis 距離) | **Clause / Verse**(指示詞自体)・解決は **Passage** | 指示詞の語情報=可 / 談話解決=不可 |
| Topic | **Clause / Verse** | 情報構造=境界的 |
| Focus | **Clause / Verse** | 境界的 |
| Referent(照応) | **Clause / Passage** | この語の referent リンク=可 / 節横断の照応連鎖=Passage 側 |

- **評価**: Discourse は **語アンカー部分(この指示詞・この照応リンク)は Clause/Verse で還元可=StudyPanel 可**、
  **談話構造の解決(この/その の距離判断・節横断の照応連鎖・Topic/Focus 連鎖)は Passage=Discourse 層責務**。
  M-15/M-16 で連体 この(未判定 714)を保全したのはこの境界の実践(reading は談話推論をしない)。
- **Evidence**: reading-engine demonstrativeSyntax(role/referent 保持・adnominal 未判定)。M-16 Phase5/6。
- **Severity**: **P1**。
- **Scope**: 語アンカー=Clause/Verse(可)/ 談話構造=Passage(不可)。

## Phase 7: StudyPanel の責務(明文化)

| StudyPanel が扱うべき情報 | StudyPanel が扱わない情報 |
|---|---|
| **Token**: lemma/Strong/Morph/語源/辞書 | **Passage 構造**: Inclusio/Chiasm/Parallelism/段落テーマ |
| **Phrase**: Phrase Reading/修飾構造 | **節横断 Discourse 構造**: この/その距離解決・照応連鎖・Topic/Focus 連鎖 |
| **Clause**: 節役割(主/従/関係/Predicate) | **修辞対比構造**: 2 語以上にまたがる Contrast |
| **Verse**: Reading Japanese/この節での響き/Editorial Status | **Reading 責務の侵犯**: 他訳/翻訳/語義推論を「決定的読み」として提示 |
| **Corpus**: 出現回数/Concordance/Cluster/LN/Usage/語族 | **段落テーマの解釈**(推論を含む) |

- **原理**: **word-anchored(選択語に還元可能)= 扱う。structure-anchored(語に還元できない段落構造)= 扱わない。**
  加えて **Reading 補助に徹し、Reading の決定的責務(推論なし/翻訳なし)を侵さない**。
- **Severity**: **P1**(責務境界の明文化が将来機能の前提)。

## Phase 8: 将来層完成時の責務衝突評価

| 将来層 | 主スコープ | StudyPanel との関係 | 衝突 |
|---|---|---|---|
| **Lexical Layer** | Token / Corpus | word-anchored=StudyPanel が受け皿 | **なし** |
| **Semantic Layer** | Corpus / Verse | LN/cluster=既存 L3 と同軸 | **なし** |
| **Discourse Layer** | **Passage** | 語アンカー部のみ StudyPanel・談話構造は Passage 側 | 境界を守れば **なし** |
| **Rhetorical Layer** | **Passage** | 修辞構造は Passage 側・語フラグのみポインタ | 境界を守れば **なし** |

- **評価**: **word-anchored 層(Lexical/Semantic)は StudyPanel が自然に受け止め、衝突しない**。
  **Passage 層(Discourse/Rhetorical)は本定義で「構造は Passage 側・語アンカーのポインタのみ StudyPanel」と
  境界を引けば衝突しない**。衝突は **段落構造を語パネルに押し込んだ場合のみ**発生する(=本定義が防ぐ)。
- **Evidence**: 核心原理 + Phase 5/6 の Passage 分類。
- **Severity**: **P2**(境界を守れば衝突なし)。
- **Scope**: word-anchored=StudyPanel / Passage=別責務。

---

## Severity 集約

| Phase | 監査 | Severity |
|---|---|---|
| 1 | スコープ分類(Clause 第一級不在・Passage 未定義) | P2 |
| 2 | 扱うべきスコープ(Passage 境界) | **P1** |
| 3 | 載せるべきでない情報(Passage・L-0 侵犯) | **P1** |
| 4 | Lexical 分類(他訳の L-0 境界) | P2 |
| 5 | Rhetorical 分類(Passage 責務外) | **P1** |
| 6 | Discourse 分類(談話構造 Passage 側) | **P1** |
| 7 | 責務明文化 | **P1** |
| 8 | 将来層衝突(境界遵守で衝突なし) | P2 |

---

## StudyPanel Scope Definition(凍結可能な責務定義)

**原理**: **StudyPanel は「選択された 1 語に還元できる word-anchored 情報」を、Reading を補助する目的で扱う。
語に還元できない段落構造(Passage)は扱わない。Reading の決定的責務(推論なし/翻訳なし)を侵さない。**

**扱うスコープ(5)**: Token / Phrase / Clause / Verse / Corpus(いずれも word-anchored)。
**扱わないスコープ(1)**: Passage(Inclusio/Chiasm/Parallelism/段落テーマ/節横断 Discourse 構造)。
**扱わない情報(横断)**: 他訳/翻訳/語義推論を「決定的読み」として提示すること(L-0 侵犯)。
**境界的に扱える**: Passage 構造への「語アンカーのポインタ/フラグ」(構造本体でなく、この語が属する目印)。

```
[studypanel-scope-definition FROZEN 2026-07-22]
原理: StudyPanel=word-anchored情報(選択1語に還元可能)をReading補助として扱う。語に還元できない段落構造(Passage)は扱わない。Reading決定的責務(推論/翻訳なし)を侵さない
扱うスコープ5: Token(lemma/Strong/Morph/語源/辞書) / Phrase(Phrase Reading/修飾) / Clause(節役割) / Verse(Reading Japanese/節の響き/Editorial) / Corpus(出現/Concordance/Cluster/LN/Usage/語族)
扱わないスコープ1: Passage(Inclusio/Chiasm/Parallelism/段落テーマ/節横断Discourse構造)=段落表示面の責務
扱わない横断情報: 他訳/翻訳/語義推論を決定的読みとして提示(L-0侵犯)
境界的に可: Passage構造への語アンカーのポインタ/フラグのみ(構造本体は不可)
Lexical分類: 同lemma/語族/別lemma同日本語=Corpus/Token(StudyPanel適) / 他訳候補=境界注意(Reading境界)
Rhetorical分類: 反復語フラグ=境界的可 / Inclusio/Chiasm/Parallelism/Contrast=Passage(不可)
Discourse分類: 指示詞/照応リンク=Clause/Verse(可) / この-その距離解決・照応連鎖・Topic/Focus連鎖=Passage(不可)
将来層衝突: Lexical/Semantic(word-anchored)=衝突なし / Discourse/Rhetorical(Passage)=境界遵守で衝突なし。衝突は段落構造を語パネルに押し込んだ場合のみ=本定義が防ぐ
```

本定義により、Lexical/Semantic Layer は StudyPanel が受け皿となり、Discourse/Rhetorical Layer の段落構造は
StudyPanel の責務外(語アンカーのポインタのみ許容)と確定する。以後この境界を前提に将来機能を配置する。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結(StudyPanel Scope Definition・word-anchored 5 スコープを扱い Passage は扱わない・L-0 補助境界・将来 4 層の帰属確定) |
