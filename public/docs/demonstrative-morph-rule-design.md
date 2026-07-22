# 指示詞ファミリー Morph Rule 責務設計(Stage J-7a)

策定日: 2026-07-20
位置づけ: 指示詞 3 lemma(οὗτος / ἐκεῖνος / τοιοῦτος)の **Morph / Syntax / Semantic の責務境界を
確定**する設計文書。枠組みは I-2(Morph Rule Engine Design)・J-1(Implementation Spec)・
J-6a(関係詞責務設計)に従う。
根拠監査: H-3c / H-4(危険 lemma・代名詞監査)。

**本文書は設計(責務定義)のみ。実装・コード・擬似コード・修正案は含まない。**
bible_data / reading-engine.js / Semantic / Presentation / generated data は変更しない。

数値は **クリーン NT 実測**(J-3 で重複「 2.json」除去済・総 137,741)。

---

## 1. 実 FS 全 NT 出現数

| lemma | count | Strong | 固定 japanese |
|---|---|---|---|
| **οὗτος** | 1,387 | **13 種**(G3778 340 / G5124 318 / G5023 233 / G5026 118 / G5129 89 / G5130 72 / G5127 68 / G5126 60 / G5128 28 / G5025 20 / G5125 19 / G5123 17 / G5024 5) | この 1,137 / これらの 233 / すなわち 17 |
| **ἐκεῖνος** | 243 | G1565(単一) | あの 243 |
| **τοιοῦτος** | 57 | G5108(単一) | このような 57 |

> **重要(οὗτος の Strong 分散)**: οὗτος は格・性・数ごとに **13 の Strong** に分かれ、**Data 代表語も
> 既に「この / これらの / すなわち」と変化**している(number を一部 Data が担当)。strong キーの
> Registry では 13 エントリを要し、αὐτós(単一 G846)・τίς(単一 G5101)とは条件が異なる。

---

## 2. gender / number / case 分布

### οὗτος(1,387)

- gender: neuter 708 / masculine 458 / feminine 221
- number: singular 932 / plural 455
- case: accusative 581 / nominative 481 / genitive 174 / dative 151
- english: this 842 / these 378 / that 38 / he 31 / him 26 / she 12
- gender 別: masculine this266/these112/he31/him24 / feminine this171/these24/she12 / neuter this405/these242/it3

### ἐκεῖνος(243)

- gender: masculine 136 / feminine 99 / neuter 8
- number: singular 181 / plural 62 / case: nominative 90 / dative 70 / genitive 50 / accusative 33
- english: that 121 / he 39 / those 38 / they 13 / his 6 / she 4
- gender 別: masculine that44/he39/those16/they12 / feminine that71/those21/she4 / neuter that6

### τοιοῦτος(57)

- gender: masculine 27 / neuter 17 / feminine 13 / number: plural 33 / singular 24
- case: accusative 28 / nominative 15 / dative 7 / genitive 7
- english: such 46 / such as these 3 / so 2 / this 2 / of a kind 1

---

## 3. japanese 代表語の妥当性確認

| lemma | 代表語 | 妥当性 |
|---|---|---|
| οὗτος | この(/ これらの / すなわち) | 近称指示。english this/these で安定(1,220/1,387)。連体「この」は妥当。Data が number(これらの)・慣用(すなわち)を一部分担済 |
| ἐκεῖνος | あの | 遠称指示。that/those/he(遠称・三人称)。連体「あの」は妥当 |
| τοιοῦτος | このような | 性状指示。such で安定(46/57)。連体「このような」は妥当 |

- H-3c で οὗτος・ἐκεῖνος・τοιοῦτος はいずれも代表語として概ね妥当(Type B〜C)。**代表語は維持**(H-3b)。
- **近称/遠称の deixis は lemma に固定**(οὗτος=近=この、ἐκεῖνος=遠=あの)。したがって
  「この/その/あの」の選択自体は lemma で決まり、談話で選ぶ余地は小さい(§5 の精緻化を除く)。

---

## 4. Morph で決定可能な範囲

指示詞は αὐτós/τίς/関係詞と**決定的に異なる**。中核の変化(これ / この / この人)は **gender では決まらず、
連体用法か代名詞用法かに依存する**。

### 連体(adnominal)/ 代名詞(pronominal)の問題

- **連体用法**: 「この」+ 名詞(この世・この人々)。代表語「この」のまま正しい。
- **代名詞用法**: 「これ」(単独・事物)・「この人」(人)・「これら」(複数事物)。

gender は referent の性を示すが、**その token が連体か代名詞かは形態からは分からない**(後続に
名詞があるかどうか=統語)。したがって:

- 仮に「gender→頭語(neuter→これ / M・F→この人)」を Morph で無条件に適用すると、**連体用法を破壊**する
  (例: masculine の「この世(界)」を「この人世界」にしてしまう)。
- ゆえに **gender→頭語は Morph 単独では安全に決定できない**(Syntax の前提が必要)。

### Morph が単独で安全に扱える範囲

| 対象 | 可否 | 理由 |
|---|---|---|
| gender→代名詞頭語(これ/この人) | **不可(単独では)** | 連体/代名詞の判別(Syntax)が前提。無条件適用は連体を破壊 |
| number→単複(この→これら) | 条件付き | 連体では「これらの」、代名詞では「これら」で語形が分岐。Data が既に「これらの」を一部保持しており、Morph 単独の追加余地は小さい |
| deixis(この/あの) | 不要 | lemma に固定(Morph の仕事ではない) |

**結論**: **指示詞で Morph が単独・無条件に安全改善できる範囲はほぼ無い**。αὐτós(gender/number)・
τίς(gender)・関係詞(gender→頭語)で成立した「形態のみで決定的」という条件を、指示詞は
**連体/代名詞の統語依存のため満たさない**。

---

## 5. Syntax / Semantic へ委譲する範囲

### Syntax 責務(指示詞の中核)

| 領域 | 内容 |
|---|---|
| **連体 / 代名詞の判別** | 後続に主要名詞があるか(この+名詞 vs これ 単独)。頭語(これ/この人)決定の前提 |
| **代名詞頭語の適用** | 代名詞用法と判別できた時に gender で これ/この人/あれ/あの人 を選ぶ(Syntax が gate、種別は Morph 相当だが Syntax の判別なしには発火できない) |
| number 語形 | 連体(これらの)/ 代名詞(これら)の分岐も用法に依存 |

### Semantic 責務

| 用法 | 対象 |
|---|---|
| **すなわち(=that is)** | οὗτος(idiom・17 件)。慣用句として Semantic |
| **談話距離の精緻化** | 既出の近称が日本語で「その」になる等の微調整(deixis の基本は lemma 固定だが、既出性は談話) |
| **指示対象の同定** | 何を指す「これ/あれ」か(先行詞・文脈) |
| **質・種類の含意** | τοιοῦτος(such / of a kind / 「そのような性質の」) |
| feminine の人/物判別 | 女性名詞が人(この人)か事物(これ)か referent 依存 |

---

## 6. Rule Table

| lemma | Data 代表語 | Morph 担当 | Syntax 担当 | Semantic 担当 |
|---|---|---|---|---|
| **οὗτος**(G3778 他 13 strong) | この / これらの / すなわち | (単独では実質なし。gender→頭語は Syntax gate 前提) | 連体/代名詞判別・代名詞頭語(これ/この人)・number 語形(これら/これらの) | すなわち(idiom)・談話距離精緻化・指示対象同定・feminine 人/物判別 |
| **ἐκεῖνος**(G1565) | あの | (同上・単独では実質なし) | 連体/代名詞判別・代名詞頭語(あれ/あの人/あの人々) | 談話距離・指示対象同定・feminine 判別 |
| **τοιοῦτος**(G5108) | このような | (同上・単独では実質なし) | 連体/代名詞判別・頭語(このような人/もの) | 質・種類の含意(such) |

- 3 lemma とも **Data は代表語(連体形)を維持**。**中核の変化は Syntax(連体/代名詞判別)が前提**であり、
  Morph 単独の安全な担当範囲は実質的に無い。
- これは αὐτós/τίス/関係詞(Morph 単独で頭語・語幹を決定できた)と**異なる責務構造**である。

---

## 7. 実装 Gate 条件

指示詞を αὐτós/τίス/関係詞と同じ **Morph 単独 Registry で実装する Gate は「未充足」**。

| Gate | 状態 | 理由 |
|---|---|---|
| G-morph: 形態のみで一意・決定的・無条件安全 | **未充足** | gender→頭語は連体用法を破壊。連体/代名詞判別(Syntax)が前提 |
| G-data: 代表語の妥当性 | 充足 | この/あの/このような は妥当・維持 |
| G-strong: strong キー適合 | 部分 | οὗτος は 13 strong に分散(Registry 多エントリ・Data が number を一部分担) |
| G-syntax: 連体/代名詞判別の layer | **未整備** | Syntax Rule Engine が必要 |
| G-regression: 既存回帰非破壊で追加可能 | 前提未達 | 無条件 Morph 適用は連体破壊で悪化を生む |

### 進行条件(責務確定のみ・実装案は書かない)

- **指示詞は Morph 単独実装の対象外**とする。**Syntax Rule Engine(連体/代名詞の判別)が整備された
  段階で再評価**する。
- Syntax 整備後は「Syntax が代名詞用法を判別 → その gate 内で gender による頭語(これ/この人・あれ/
  あの人・このような人/もの)を選ぶ」形になる(本設計は責務の所在を確定するのみ)。
- すなわち(idiom)・質/種類(τοιοῦτος)・談話距離は Semantic の責務として保留。
- したがって **J-7b(指示詞 Morph 実装)へは進まない**。これは失敗ではなく、指示詞の変化が
  Morph の担当外(Syntax 依存)であることの確定である。

---

## 責務凍結

```
[demonstrative-morph-rule-design FROZEN 2026-07-20]
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結(οὗτος/ἐκεῖνος/τοιοῦτος 実測・連体/代名詞=Syntax 依存の確定・Morph 単独実装は対象外・Gate 未充足) |
