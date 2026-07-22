# αὐτός(G846)品質監査(Stage H-6)

実測日: 2026-07-18
目的: bible_data.japanese の責務では解決できない**最大規模の代名詞** αὐτós(G846)について、
修正ではなく**責務分類**を確定する。
**本監査は分類のみ。bible_data / Engine / Semantic / Presentation / 生成データは一切変更しない。**
全数値は NT 全巻の実測値(推測なし)。

> **⚠️ 重大な数値訂正(Stage J-3 で確定)**: 本監査は当初 αὐτós を count **6,954** としたが、これは
> **誤り**。ワークツリーに 90 個の重複ファイル(「 2.json」・クラウド同期のコンフリクトコピー・
> git 未追跡)が混入し、コーパスを 137,741→187,809 に水増ししていた。J-3 で重複を除去し、
> **クリーン NT 実測 = 総 137,741・αὐτós G846 = 5,067**(H-3c/H-4 の元値が正しかった)と確定。
> **本文中の 6,954・37.3%・gender M6103/N385/F466 等は下記クリーン値に読み替えること。**
>
> | 項目 | 誤(汚染) | **クリーン実測(正)** |
> |---|---|---|
> | αὐτós 全出現 | 6,954 | **5,067** |
> | class | pron 6,828 / adj 126 | **pron 4,982 / adj 85** |
> | gender | M6103 / N385 / F466 | **M4446 / N281 / F340** |
> | number | sg5215 / pl1739 | **sg3786 / pl1281** |
> | 彼(固定)不適合率 | 37.3% | **34.6%(1,755)** |
> | 責務(Type C・Morph/Semantic) | — | **不変** |
>
> J-3 で Morph Rule を実装し、この不適合 1,755 のうち **1,680 件を解消**(残 75 = intensive/adj は
> Semantic 対象)。詳細は docs/alphautos-morph-rule-implementation-report.md。

---

## 1. 全形態分布

### 総数

- lemma: αὐτós / Strong: **G846** / 全出現: **6,954**
- japanese 固定値: **「彼」6,954 件すべて**(単一固定)
- class: pron 6,828 / adj(強調用法)126

### gender

| gender | 件数 | 比率 |
|---|---|---|
| masculine | 6,103 | 87.8% |
| feminine | 466 | 6.7% |
| neuter | 385 | 5.5% |

### number

| number | 件数 | 比率 |
|---|---|---|
| singular | 5,215 | 75.0% |
| plural | 1,739 | 25.0% |

### case

| case | 件数 | 比率 |
|---|---|---|
| genitive | 2,901 | 41.7% |
| dative | 2,110 | 30.3% |
| accusative | 1,550 | 22.3% |
| nominative | 393 | 5.7% |

### gender × number(責務判定の核心)

| | singular | plural |
|---|---|---|
| **masculine** | 4,569 | 1,534 |
| **feminine** | 410 | 56 |
| **neuter** | 236 | 149 |

**「彼」が厳密に適合するのは masculine/singular の 4,569 件のみ。**
残り 2,385 件(男性複数 1,534・女性 466・中性 385)は gender または number の点で「彼」に不適合。

---

## 2. japanese「彼」と実際の意味適合率

判定基準: 「彼」= 3 人称男性単数のみ適合(english he/him/his のみ safe)。

| | 件数 | 比率 |
|---|---|---|
| **適合(男性単数 he/him/his)** | 4,372 | **62.9%** |
| **不適合** | 2,582 | **37.1%** |

(english ベース 4,372 と morph ベース masc/sg 4,569 の差は、主格 he が少なく属格・与格に
男性単数の them/their 相当が混じるなどの表層差。いずれも約 63% で一致。)

---

## 3. 不適合例の分類(2,582 件)

| 分類 | 件数 | 内訳(english) | 正しい日本語 | 現状(誤) |
|---|---|---|---|---|
| **複数 they/them/their** | 1,662 | them 1082 / their 398 / they 161 / themselves 13 / theirs 4 / their own 4 | 彼**ら**・それら | 彼 |
| **中性 it/its** | 347 | it 248 / its 88 / itself 11 | **それ** | 彼 |
| **女性 she/her** | 257 | her 241 / she 13 / herself 3 | **彼女** | 彼 |
| **強調・同一 same/very** | 137 | same 113 / very 22 / same [place] 2 | **同じ・まさに・自身** | 彼 |
| **他 person 再帰・その他** | 179 | himself 71 / myself 20 / yourselves 21 / ourselves 8 / we 6 / その他 | 彼自身・私自身 等 | 彼 |

### 分類の要点

- **最大は「複数」1,662 件**。gender=masculine でも number=plural なら「彼ら」であり、
  「彼」では number が不適合。**gender だけでなく number も反映が必要**。
- **中性 347・女性 257** は gender の不適合(それ/彼女)。
- **強調・同一 137** は αὐτós の**別語義**(anaphoric 代名詞ではなく intensive/identity 用法。
  class=adj 126 とほぼ対応)。「彼」でも「それ/彼女/彼ら」でもなく「同じ・自身」。
- **他 person 再帰 179** は himself(彼自身)や myself/ourselves(私自身/私たち自身)など、
  person 反映が必要。

---

## 4. 現在の表示経路(実 Engine 確認)

```
bible_data.japanese "彼"(固定・全6,954件同一)
        ↓
ReadingEngine.resolve(token)
   → morph 層が case 助詞のみ付与(gender/number は非反映)
        ↓
PresentationPolicy.formatDisplay
   → 「彼」は PP サフィックス非該当のため素通し(無変換)
        ↓
UI(Flow chip / StudyPanel)
```

実 Engine 出力(実測):

| token(gender/number/case) | 意味 | Engine 出力 | src | 問題 |
|---|---|---|---|---|
| 男性・単数・属格 | his | 彼の | morph | ✓ 適合 |
| 男性・**複数**・属格 | their(彼らの) | **彼の** | morph | number 非反映 |
| **中性**・単数・対格 | it(それを) | **彼を** | morph | gender 非反映 |
| **女性**・単数・与格 | her(彼女に) | **彼に** | morph | gender 非反映 |
| 男性・単数・主格 | he | 彼(null=無変換) | — | ✓ 適合 |

- **Display Label(②見出し)も「彼」**(lemma 単位・非文脈)。
- **morph 層は case(格助詞)のみ担当し、語幹「彼」は gender/number で変化しない**。
  これが不適合 2,582 件の直接原因。
- **Presentation は「彼」を素通し。表示形式の責務逸脱はない(無罪)**。

---

## 5. Data 修正で解決可能か

**不可能。**

- bible_data.japanese は **1 lemma = 1 固定値**。「彼」を「それ/彼女/彼ら/同じ」の 4〜5 種へ
  同時に持たせることはできない。
- 仮に別語へ替えても、置換先も特定の gender/number にしか適合せず、不適合を別の形態へ移すだけ。
- H-3b ポリシー「安定代表語の保持」に従い、**「彼」は最頻の代表値(男性単数 62.9%)として妥当**。
  Data 修正対象ではない(σύ G5213 の単純誤り=Stage H-5 とは性質が異なる。あちらは固定値自体が
  誤りだったが、αὐτós の「彼」は代表値として正しく、変化分が Data では表現不能なだけ)。

**→ Data Patch 対象ではない。**

---

## 6. 責務分類(Engine / Semantic / Presentation)

| 責務 | 対象件数 | 内容 | 判定 |
|---|---|---|---|
| **Engine Rule(Morph)** | **2,266**(87.8%) | 複数 1,662 + 中性 347 + 女性 257。語幹「彼」→「彼ら/それ/彼女」を **token.gender / token.number から決定的に選択**(意味推論不要・形態情報のみ) | **主責務** |
| **Semantic** | **316**(12.2%) | 強調・同一 137(same/very=同じ・まさに)+ 他 person 再帰・intensive 179。anaphoric 代名詞か intensive/identity 用法かの**語義判別**が必要(class=adj 126 と対応) | 従責務 |
| **Presentation** | 0 | 「彼」を素通し。表示形式の問題なし | 無罪 |
| **Data** | 0 | 「彼」は代表値として妥当・変化分は表現不能 | 対象外 |

### 補足

- **中核は Engine Rule**。gender/number は token に既にある形態情報であり、Semantic の
  文脈推論を要さない。morph 層が case 助詞を付与しているのと同じレイヤーで、語幹選択
  (彼/それ/彼女/彼ら)を加えれば不適合の約 88% が解決する構造(本監査は分類のみ・実装しない)。
- **Semantic は intensive/identity 用法のみ**。「同じ・自身」は形態では分からず、
  class=adj や統語位置(冠詞との関係)による語義判別が要る少数の残差。
- **referent の gender(αὐτós が指す先行詞の性)による it/he の揺れ**は、token.gender が
  既に referent 性を担っているため、多くは Engine Rule で吸収可能。真に文脈依存で残るのは
  Semantic 区分に含めた intensive 用法が中心。

---

## 責務確定

> **αὐτós(G846)は Data Patch 対象ではなく、主として Engine Rule(Morph)対象。**
> gender/number による語幹選択(彼→それ/彼女/彼ら)が不適合 2,582 件の 87.8%(2,266 件)を
> 占め、これは token の形態情報から決定的に導ける Engine 責務である。残り 12.2%(316 件)の
> 強調・同一・再帰用法は Semantic(語義判別)対象。Presentation は無罪(0)、Data は
> 「彼」を安定代表値として保持(H-3b 準拠)。

**確定: Engine Rule 対象(主)+ Semantic 対象(従)。Data Patch 対象ではない。**

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-18 | 初版(αὐτós G846 6,954 件の全形態分布・適合率62.9%・不適合分類・表示経路・責務確定)。H-3c/H-4 の count 5,067 を実測 6,954 に訂正 |
