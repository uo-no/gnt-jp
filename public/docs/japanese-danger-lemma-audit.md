# bible_data.japanese 危険 lemma 全体監査(Stage H-3c)

実測日: 2026-07-18
目的: Stage H-3b の Type A/B/C 基準を、疑問詞・関係詞以外の高危険度語彙群
(代名詞・指示詞・形容詞・抽象語)に適用し、固定日本語が危険な lemma を抽出する。
**本監査は分類のみ。bible_data / Engine / Presentation / lexicon / 生成データは変更しない。**
全数値は NT 全巻の実測値(推測なし)。

> **⚠️ 訂正の訂正(Stage J-3 で確定)**: 本監査の αὐτός(G846)count「5,067」は **正しい**。
> H-6 で一時「6,954」へ訂正したが、それは重複ファイル(「 2.json」90 個・未追跡)がコーパスを
> 水増しした誤り。J-3 で除去し、クリーン実測は総 137,741・**αὐτós 5,067**(本監査の値)と確定。
> unsafe 率も本監査の値が正。Type C 判定は不変。

判定基準(Stage H-3b と同一):
- **Type A(固定可)** → Data 保持
- **Type B(代表語可)** → Display Label 用途(本文は Engine/Semantic 補正の余地)
- **Type C(固定禁止)** → gender/case/syntax/discourse 依存。Engine/Semantic 担当

---

## ① 代名詞ファミリー(最優先)

### αὐτός(G846)

- count: **5,067**(新約最多級)
- current japanese: 彼(5,067 件すべて)
- english 上位: him 1885 / his 1027 / them 781 / their 315 / he 266 / it 181 / her 177 / they 113
- unsafe: **1,843(36.4%)**
- 「彼」不適合の内訳(実測): it/its **258** / her/she **194** / them/they/their **1,231**
- classification: **C**
- reason: 「彼」は男性単数のみ適合。中性(それ)・女性(彼女)・複数(彼ら)で不適合。gender/number
  依存で意味が変わり、5,067 件中 1,843 件で不適合。新約最多語だけに影響規模が最大。

### ἐκεῖνος(G1565)

- count: 243 / current japanese: あの
- english: that 121 / he 39 / those 38 / they 13
- unsafe: **84(34.6%)** / classification: **C**
- reason: 「あの」は連体詞(that/those)としては可だが、代名詞用法(he/they=あの人/あの者)で
  不完全。discourse 依存(この/その/あの)。

### οὗτος(G3778)

- count: 340 / current japanese: この
- english: this 215 / these 69 / he 31 / she 12 / they 6
- unsafe: **53(15.6%)** / classification: **B**
- reason: 「この」は this/these で安定(284 件)。代名詞用法(he/she/they)49 件で不完全だが、
  見出し・連体用途では代表語として可。discourse 依存は残る。

### ἑαυτοῦ 系(G1438)

- count: 330 / current japanese: 自分自身
- english: himself 98 / themselves 47 / yourselves 37 / ourselves 19 / one another 13
- unsafe: **56(17.0%)** / classification: **B**
- reason: 「自分自身」は再帰代名詞として person 横断で機能(himself/yourselves/ourselves)。
  person(自分/あなた自身/私たち自身)は非反映だが、代表語としては再帰性を表現できる。
  相互代名詞(one another=互いに)13 件で不適合。

---

## ② 指示詞ファミリー

| lemma | Strong | count | current | unsafe | Type | 理由 |
|---|---|---|---|---|---|---|
| οὗτος | G3778 | 340 | この | 15.6% | B | this/these 安定・代名詞用法で不完全 |
| ἐκεῖνος | G1565 | 243 | あの | 34.6% | C | 代名詞用法(he/they)で不適合 |
| τοιοῦτος | G5108 | 57 | このような | 8.8% | B | such で安定・代表語可 |

日本語の「この/その/あの」は談話依存だが、実測では οὗτος(この)は安定、ἐκεῖνος(あの)は
代名詞用法が多く unsafe 率が高い。

---

## ③ αὐτός 系(特に重要)

αὐτός(G846)は上記①のとおり **count 5,067・unsafe 36.4%・Type C**。
分類候補「彼/それ/自身/同じ」のうち固定訳は「彼」のみで、中性(それ 258)・女性(彼女 194)・
複数(彼ら 1,231)を表現できない。**単一 japanese では危険**であり、gender/number による Engine
形態選択が必要な代表例。

---

## ④ 形容詞で意味が変化するもの

### μέγας(G3173)

- count: 194 / current japanese: 大きい
- english: great 125 / loud 43 / large 9 / greatest 4
- unsafe: **12(6.2%)** / classification: **B**
- reason: 「大きい」は great/large/loud(声)で概ね安定。ただし LN 87.22(status/重要さ=50 件)で
  「偉大」の意が「大きい」では弱まる場合あり。代表語としては可。

### πνευματικός(G4152)

- count: 26 / current japanese: 霊的な
- english: spiritual 26(全件)
- unsafe: **0(0.0%)** / classification: **B**
- reason: english は全件 spiritual で表面上安定だが、LN が 7 コードに分散(神の霊/非物質/属霊)。
  神学的固定語になりやすく、Display Label では可・文脈語義は Semantic 領域。

---

## ⑤ 前置詞由来・抽象語(Stage G semantic 領域)

### σπουδή(G4710)

- count: 12 / current japanese: 熱心
- english: earnestness 4 / diligence 3 / haste 2 / concern 1 / zeal 1
- unsafe: **3(25.0%)** / classification: **B(文脈選択が必要)**
- reason: 「熱心」は earnestness/diligence/zeal で可だが、haste(急ぎ 2)・concern(配慮 1)で
  不適合。Stage G の MRK 6:25「熱心（と共に）」の該当。文脈語義選択(Semantic)の領域。

### κόσμος(G2889)

- count: 185 / current japanese: 世界
- english: world 182 / adornment 1
- unsafe: **1(0.5%)** / classification: **B**
- reason: english は world でほぼ一定だが、LN が意味を分ける — 9.23(人々=世の人々 60)・
  41.38(世俗秩序=世 57)・1.39(地/宇宙 50)。「世界」は代表語として可で、文脈の意味差は
  Semantic(lnGloss)が既に一部担当(41.38→世・6.188→飾り)。

### λόγος(G3056)

- count: 330 / current japanese: ことば
- english: word 171 / words 58 / message 15 / saying 14 / speech 10 / account 8
- unsafe: **44(13.3%)** / classification: **B**
- reason: 「ことば」は word/message/saying/speech で安定。account(申し開き 8)・reason(理由)で
  不適合だが、これらは Semantic(lnGloss)が既に担当(57.228→申し開き・89.18→理由)。
  代表語としては可。

---

## 最終表

| lemma | Strong | count | current japanese | unsafe 率 | Type | 理由 |
|---|---|---|---|---|---|---|
| **αὐτός** | G846 | 5,067 | 彼 | 36.4% | **C** | 多義(彼/それ/彼女/彼ら)。gender/number 依存。新約最多で影響最大 |
| **ἐκεῖνος** | G1565 | 243 | あの | 34.6% | **C** | 代名詞用法(he/they)で不適合。discourse 依存 |
| **σπουδή** | G4710 | 12 | 熱心 | 25.0% | B | haste/concern で文脈選択が必要 |
| **ἑαυτοῦ** | G1438 | 330 | 自分自身 | 17.0% | B | 再帰は表現可・person 非反映・相互代名詞で不適合 |
| **οὗτος** | G3778 | 340 | この | 15.6% | B | this/these 安定・代名詞用法で不完全 |
| **λόγος** | G3056 | 330 | ことば | 13.3% | B | 代表語可・account/reason は Semantic 担当済 |
| **τοιοῦτος** | G5108 | 57 | このような | 8.8% | B | such で安定・代表語可 |
| **μέγας** | G3173 | 194 | 大きい | 6.2% | B | great/large/loud 安定・重要さの意でやや弱い |
| **πνευματικός** | G4152 | 26 | 霊的な | 0.0% | B | english 一定・神学固定語・文脈は Semantic |
| **κόσμος** | G2889 | 185 | 世界 | 0.5% | B | 代表語可・意味差は Semantic(lnGloss)担当済 |

---

## 分類集計

| Type | 件数 | lemma |
|---|---|---|
| **A(固定可)** | 0 | (本監査対象には該当なし) |
| **B(代表語可)** | 8 | σπουδή・ἑαυτοῦ・οὗτος・λόγος・τοιοῦτος・μέγας・πνευματικός・κόσμος |
| **C(固定禁止)** | 2 | **αὐτός・ἐκεῖνος** |

---

## 責務分離の所見(修正は行わない)

- **Type C(固定禁止)は αὐτός・ἐκεῖνος の 2 lemma**。特に **αὐτός は count 5,067・unsafe 1,843 件で、
  本監査中で影響規模が最大**。gender/number(彼/それ/彼女/彼ら)を単一固定訳では表現できず、
  Morph Engine(gender/number/case)による選択が必要。
- **Type B(8 lemma)は Display Label としては代表語で十分**。本文の意味差は
  Semantic(κόσμος/λόγος は lnGloss で一部担当済)・文脈選択(σπουδή)が担う。
- **bible_data.japanese の責務は「安定代表語の保持」**(H-3b ポリシー)であり、
  Type C でも japanese 削除ではなく、変化を Engine/Semantic に委ねる責務分離が妥当。
- 本監査は分類のみ。修正・Engine 変更・Semantic 追加・生成データ再生成はいずれも行わない。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-18 | 初版(代名詞・指示詞・形容詞・抽象語 10 lemma の実測監査・Type 分類) |
