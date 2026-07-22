# Semantic Completion 責務設計(Stage L-4a)

策定日: 2026-07-20
位置づけ: **Semantic Engine の完成責務**を定義する設計。Semantic を「意味を推論する Engine」ではなく、
**「既存注釈・形態・構造から決定的に導ける意味情報を整理して Builder に渡す Engine」**として定義する。
Semantic は翻訳器ではなく、**Builder が意味推論を持たないための入力**を提供する。
根拠: reading-japanese-policy.md(L-0)・-baseline.md(L-1)・-builder-design.md(L-2a)・
syntax-completion-design.md(L-3a)・morph-rule-engine-v1-frozen.md(J-9)。

**本文書は責務設計のみ。コード・bible_data・Engine・Morph・Syntax の実装/変更、Reading Japanese 改善、
Builder 実装、擬似コード・JSON・TypeScript は一切含まない。**

---

## 0. 前提: 決定的な意味信号(実測)

Semantic Completion は **既存注釈・形態・構造の決定的信号のみ**を用いる(推論しない)。全巻実測で確認:

| 信号 | 由来 | 充足/内訳 | 何を決めるか |
|---|---|---|---|
| **LN domain(ln)** | Louw-Nida 注釈 | **93.3%**(128,493/137,741) | 多義語の語義(κόσμος 世界/世・λόγος ことば/申し開き 等) |
| **class(pron/adj)** | 注釈 | αὐτós: pron 4,982 / adj 85 | intensive(adj)/ anaphoric(pron)の一部 |
| **strong** | 注釈 | τις G5100(不定 530)/ τίς G5101(疑問 555) | interrogative / indefinite の分離 |
| **morph(F-1/2/3)** | 形態 | ἑαυτοῦ person: F-1 21・F-2 57・F-3 248(計 326)・無 497 | reflexive の person |
| **role(adv)** | 注釈 | τίς adv 79 | 副詞的 τί(なぜ/どう) |
| **lemma** | 注釈 | οὗτος(近)/ ἐκεῖνος(遠) | demonstrative の deixis |

- これらは **決定的**(推論不要)。**非決定的な部分は未判定**(安全 fallback・§3)。

---

## 1. Semantic Completion の完了条件

Semantic が最終的に保証する意味情報:

| 意味情報 | 対象 | 由来(決定的) |
|---|---|---|
| **多義語の LN 語義** | 多義語全般 | ln domain(93.3%)。既存 lnGloss(Phase 5-D)を含む |
| **intensive / anaphoric** | αὐτós | class(adj=intensive・pron=anaphoric)。class で決まらない残は未判定 |
| **reflexive の person** | ἑαυτοῦ / ἐμαυτοῦ / σεαυτοῦ | morph F-1/2/3(326)。person 無(G848 497)は未判定 |
| **interrogative / indefinite** | τίς / τις | strong(G5101 / G5100)分離 |
| **副詞的 τί(なぜ/どう)/ 事物(何)** | τίς | role(adv=副詞的)。Morph の gender(何/誰)と協働 |
| **demonstrative の deixis(近/遠)** | οὗτος / ἐκεῖνος | lemma(近称/遠称)。この/その/あの の談話精緻化は未判定 |

- **完了条件 = 上記が「Builder が読むだけの決定的意味情報」として提供され、Builder が意味推論を要さない状態**。
- 非決定的(文脈依存)は **未判定**として明示され、Builder が安全既定で扱える。

---

## 2. Semantic が扱う対象(決定的に導出できる意味情報)

| 意味区分 | 決定的信号 |
|---|---|
| **intensive**(自身・同じ・まさに) | class=adj(αὐτós)・LN domain |
| **reflexive**(再帰・person) | morph F-1/2/3・lemma |
| **interrogative**(疑問) | strong G5101・role |
| **indefinite**(不定・ある/誰か) | strong G5100 |
| **demonstrative の意味区別**(近/遠 deixis) | lemma(οὗτος/ἐκεῖνος/τοιοῦτος) |
| **多義語の語義** | LN domain(ln) |

- いずれも **注釈・形態・構造の決定的読み取り**。意味の生成・推測はしない。

---

## 3. Semantic が扱わない対象(除外)

| 除外 | 理由 |
|---|---|
| **文脈推論** | L-0 禁止。文脈から意味を断定しない |
| **神学判断** | 対象外 |
| **翻訳** | 対象外(自然文生成をしない) |
| **日本語生成** | Builder / Presentation の責務(Semantic は文字列を生成しない) |
| **読者向け解釈** | 対象外 |
| **AI 的意味推測** | L-0 禁止(既存注釈にない意味を作らない) |
| LN 非該当の文脈語義(6.7%) | 決定的信号がない → 未判定 |
| person-leveling の残(G848 497・subjref 空) | 節主語からの person 決定は決定的信号なし → 未判定 |
| discourse この/その/あの の精緻化 | 談話依存 → 未判定 |
| intensive のうち class=pron の残 | class で決まらない → 未判定 |

- **非決定的は一律「未判定」**(推論しない・安全 fallback)。

---

## 4. Morph / Syntax / Semantic / Builder の責務境界(最終確認)

| 層 | 決定する | 決定しない |
|---|---|---|
| **Morph** | 形態から読む語形(gender/number/case/person/mood) | 構造・意味・章節統合 |
| **Syntax** | 構造情報(role/referent/連体代名詞/節境界) | 語形・意味・章節確定・語順変更 |
| **Semantic** | **決定的意味情報の整理**(LN 語義・intensive/reflexive/interrogative/indefinite/deixis) | 語形・構造・章節確定・**意味推論**・日本語生成 |
| **Reading Japanese Builder** | 章節としての統合・最終確定 | 語形/構造/意味の内部判断(各層に委任) |

- **重複責務なし**: Morph=語形 / Syntax=構造 / Semantic=**意味情報の整理**(推論でない)/ Builder=章節確定。
- Semantic は Syntax(構造)や Morph(語形)を決めない。意味の**分類**に閉じる。

---

## 5. Builder が依存する Semantic 情報

Builder が **推論せず読み取るだけ**で利用できる意味情報:

| Builder が読む | 内容 | 未判定時 |
|---|---|---|
| LN 語義 | 多義語の domain 由来語義 | domain 無(6.7%)は既定(代表語) |
| intensive フラグ | αὐτós が intensive(class=adj 等) | 未判定は anaphoric 既定 |
| reflexive person | F-1/2/3 の person | 未判定(497)は person 中立(自分) |
| interrogative / indefinite | strong 由来の区分 | — |
| 副詞的フラグ | τί の adv | 未判定は事物(何)既定 |
| deixis(近/遠) | lemma 由来 | この/その/あの 精緻化は未判定 |

- **Builder は意味を推論しない**(決定的分類を読む)。未判定は安全既定で扱う。

---

## 6. QA 方針

| 項目 | 内容 |
|---|---|
| **全巻監査** | NT 全巻(137,741・7,939 章節)・実 FS・重複「 2.json」不在の確認 |
| **意味分類率** | 各決定的信号の充足率(LN 93.3%・intensive class=adj・reflexive person 326・interrogative/indefinite strong・adv 79・deixis lemma) |
| **未判定率** | 非決定的(LN 非該当 6.7%・person-leveling 497・discourse・pron intensive 残)を未判定として計上・推論混入 0 |
| **回帰** | Morph(morph 44,251)・Syntax(K-3/K-4/L-3c バイト等価)・Semantic 既存(re-phase5)・既存 8 スイート ALL PASS |
| **悪化判定** | L-0 §7 準拠。意味情報の提供が reading を変えない(バイト等価)・意味推論の混入 0・構造隠蔽 0 |
| **Reading Japanese Policy 準拠** | L-0 の「意味推論禁止・既存注釈のみ」に照らす |

---

## 7. FROZEN 条件

Semantic Completion を凍結できる条件:

- §1(完了条件)〜§6(QA)が確定している。
- 意味情報が **既存注釈・形態・構造由来の決定的導出**であり、**文脈推論・AI 的推測・翻訳を含まない**。
- **非決定的は一律「未判定」**(安全 fallback)で、推論の混入が 0。
- Builder(L-2a)が **意味推論を持たず**、決定的意味情報を読むだけで利用できる。
- Morph v1・Syntax Completion(K-3/K-4/L-3c)の FROZEN 資産を侵さない(バイト等価・情報層)。
- LN 非該当・person-leveling・discourse は対象外(未判定)として明示されている。

---

## 責務凍結(候補)

```
[semantic-completion-design FROZEN候補 2026-07-20]
目的: 意味を推論せず、既存注釈(LN/class/strong/morph/role/lemma)から決定的に導ける意味情報を整理しBuilderへ渡す
完了条件: 多義語LN語義 + intensive/anaphoric(αὐτós) + reflexive person(F-1/2/3) + interrogative/indefinite(strong) + 副詞的τί(role adv) + deixis(lemma) を決定的提供
扱う: intensive/reflexive/interrogative/indefinite/demonstrative意味区別/多義語LN語義（決定的信号のみ）
扱わない: 文脈推論/神学判断/翻訳/日本語生成/読者解釈/AI推測/LN非該当語義/person-leveling残(497)/discourse/pron intensive残 → 一律未判定
境界: Morph=語形 / Syntax=構造 / Semantic=決定的意味整理 / Builder=章節確定（重複なし）
Builder依存: LN語義/intensiveフラグ/reflexive person/interrogative indefinite/副詞的フラグ/deixis を読むのみ。未判定は安全既定
QA: 全巻/意味分類率(LN93.3%等)/未判定率/回帰/悪化0(reading不変・推論混入0)/Policy準拠
```

本設計は凍結可能な状態である。承認により FROZEN 化し、Semantic Completion 実装計画へ進む。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結候補(Semantic=決定的意味情報の整理・完了条件・扱う/扱わない・Engine 境界・Builder 依存・QA・FROZEN 条件。決定的信号 LN93.3%/class/strong/morph/role/lemma を確認) |
