# αὐτός(G846)Morph Rule 設計(Stage I-1)

策定日: 2026-07-19
位置づけ: αὐτós の Reading Japanese における **Morph の責務を定義する設計文書**。
根拠: docs/alphautos-quality-audit.md(Stage H-6 実測・NT 全巻 6,954 件)。

**本文書は設計(責務定義)のみ。実装・コード・擬似コード・修正案・データ変更は一切含まない。**
bible_data / Engine / Semantic / Presentation / 生成データは変更しない。

---

## 1. 目的

αὐτós は NT 最多の代名詞(6,954 件)であり、固定 japanese「彼」は 62.9% でしか意味に適合しない
(H-6)。本設計は、この不適合を**責務分離**で解消するための Morph の役割を定義する。

原則は二点:

1. **代表語「彼」は Data(bible_data.japanese)の責務として維持する。**
   H-3b ポリシー「一つの lemma に一つの安定した代表語」に従い、最頻の代表値「彼」は動かさない。
2. **Reading Japanese の語幹を gender / number に応じて決定するのは Morph の責務である。**
   「彼」を起点に、形態情報から「彼ら / それ / 彼女 / それら …」を導く判断を Morph が担う。

Data は「安定した起点」を持ち、Morph は「形態による変化」を担う。両者の境界を明確にすることが
本設計の目的であり、**何を Morph が決め、何を Morph が決めないか**を定義する。

---

## 2. Morph が扱う情報

Morph は **token に既に付与された形態情報のみ**を入力とする(意味推論・文脈解釈を行わない)。

| 情報 | 用途 |
|---|---|
| **gender** | 語幹の選択(彼 / 彼女 / それ) |
| **number** | 単複の選択(彼 / 彼ら) |
| **case** | 格助詞の付与(の / に / を …)※既存 morph 責務 |
| **person** | 原則不要(αὐτós は 3 人称)。他 lemma 一般化時にのみ考慮 |

**重要**: gender / number は bible_data の token が既に保持する形態値である。Morph はこれを
読むだけで語幹を決定でき、**先行詞の解決や文脈判断(Semantic)を必要としない**。これが
「Morph だけで決定できる」ことの根拠である。

---

## 3. Morph だけで決定できる変換

αὐτós の **anaphoric(前方照応)代名詞用法**において、gender × number は Reading Japanese の
語幹を決定的に定める。以下は責務の対応であり、実装方式ではない。

| gender | number | Reading Japanese(語幹) |
|---|---|---|
| masculine | singular | 彼 |
| masculine | plural | 彼ら |
| feminine | singular | 彼女 |
| feminine | plural | 彼女たち(または 彼女ら) |
| neuter | singular | それ |
| neuter | plural | それら |

- 語幹決定の後、**case による格助詞付与は既存の Morph 責務**(彼→彼の / 彼ら→彼らの / それ→それを 等)。
  本設計は語幹選択を Morph 責務に加えるものであり、格助詞層と同一レイヤーに属する。
- 主格(nominative)は既存どおり格助詞を付与しない(語幹そのまま)。
- この表は **anaphoric 代名詞用法にのみ適用**する。強調・同一用法(§4)は対象外。

---

## 4. Morph の対象外(Semantic の責務)

以下は gender / number からは決定できず、**語義の判別を要する**。Morph の責務ではなく
Semantic の責務として明確に分離する。

| 用法 | Reading Japanese の方向性 | なぜ Morph 対象外か |
|---|---|---|
| 強調用法(intensive) | 自身 / 自ら | 同じ gender/number でも代名詞か強調かで語が変わる |
| 同一用法(identity) | 同じ | 「同じ」は形態ではなく統語・語義で決まる |
| まさに(強意) | まさに / その〜こそ | 形態不変で意味だけ異なる |

- これらは αὐτós の **別語義**であり、H-6 で class=adj(126 件)や english「same / very / self」
  として観測された残差に対応する。
- **Semantic が anaphoric 用法か intensive/identity 用法かを判別**し、後者では Morph の
  語幹選択(§3)を上書きする。Morph は判別に踏み込まない。
- 責務境界: **「形態で決まるもの=Morph、語義で決まるもの=Semantic」**。

---

## 5. H-6 実測との対応

H-6(NT 全巻 6,954 件)の内訳を責務別に整理する。

| 区分 | 件数 | 比率 | 責務 | Reading Japanese |
|---|---|---|---|---|
| 代表語一致(男性単数) | 4,372 | 62.9% | **Data** | 彼(維持) |
| 複数(they/them/their) | 1,662 | 23.9% | **Morph** | 彼ら 等 |
| 中性(it/its) | 347 | 5.0% | **Morph** | それ |
| 女性(she/her) | 257 | 3.7% | **Morph** | 彼女 |
| 強調・同一(same/very) | 137 | 2.0% | **Semantic** | 同じ / まさに |
| 再帰・他 person・その他 | 179 | 2.6% | **Semantic** | 自身 等 |
| **合計** | **6,954** | 100% | | |

責務別の集計:

| 責務 | 件数 | 比率 |
|---|---|---|
| Data(代表語「彼」で一致) | 4,372 | **62.9%** |
| Morph(gender/number で決定) | 2,266 | **32.6%** |
| Semantic(語義判別が必要) | 316 | **4.5%** |

**Morph 導入で不適合 2,582 件のうち 2,266 件(87.8%)が形態情報のみで解決可能**であり、
残る 316 件(12.2%)が Semantic の責務として残る。Data は「彼」を起点として維持し、
Presentation は関与しない(H-6 で無罪確定)。

---

## 6. 他 lemma への一般化

本設計の責務分離は αὐτós 固有ではなく、**代名詞・指示詞ファミリー全体に適用できる汎用原則**である。

### 共通原則

> **Data は 1 つの安定代表語を持つ。Morph は gender / number / case から Reading Japanese を
> 決定的に導く。Semantic は形態で決まらない語義・談話の判別を担う。**

### 適用候補(既監査 lemma)

| lemma | Data 代表語 | Morph が決めるもの(gender/number) | Semantic が決めるもの |
|---|---|---|---|
| **αὐτós** | 彼 | 彼 / 彼ら / 彼女 / それ / それら | 自身・同じ(強調・同一) |
| **ἐκεῖνος** | あの | あの人 / あの人々 / あれ(gender・number) | この/その/あの の談話距離 |
| **οὗτος** | この | この人 / これ / これら(gender・number) | 談話上の指示対象・近称の含意 |
| **τίς** | 誰 | 誰(男性) / 何(中性)(gender) | 疑問の語用(なぜ・どれ 等の語義) |
| **ὅς** | 〜する者 | 者(人=M/F) / もの(モノ=N)(gender) | 関係節の構文機能(Syntax と協働) |

- **共通する形は「代表語(Data)を起点に、gender/number で語幹を分岐(Morph)、語義・談話は
  分離(Semantic)」**。αὐτós の設計はこのテンプレートの最初の適用例である。
- 各 lemma で「Morph が決めてよい範囲」は gender/number に閉じ、談話距離(この/その/あの)・
  疑問の語用・関係節構文は Morph の外(Semantic / Syntax)に置く。
- これにより、Type C(固定禁止・H-3b)と分類された lemma 群を、**Data の削除ではなく
  責務の再配置**で扱えるようになる。

---

## 7. 設計原則(要約)

1. **Data は代表語を保持する**(αὐτós = 彼)。削除も多義化もしない。
2. **Morph は形態(gender/number/case)で Reading Japanese を決定する**。入力は token の形態値のみ、
   意味推論はしない。
3. **Semantic は語義・談話を判別する**。intensive/identity/談話距離など形態で決まらないものを担う。
4. **Presentation は関与しない**(表示整形のみ)。
5. 責務境界の一語要約: **「形態=Morph、語義=Semantic、代表語=Data、表示=Presentation」**。

本設計は責務定義に留まる。変換の実装方式・規則の記述形式・データ構造は本文書の対象外であり、
後続 Stage(実装計画)で扱う。

---

## 凍結

```
[alphautos-morph-rule-design FROZEN 2026-07-19]
Stage I-1 — αὐτós(G846)Morph Rule 責務設計
根拠: docs/alphautos-quality-audit.md(H-6・NT 6,954 件)
責務: Data=彼(代表語) / Morph=gender・number 語幹選択(彼/彼ら/彼女/それ/それら)+ case 助詞 /
      Semantic=intensive・identity 判別(自身・同じ) / Presentation=無関与
分類根拠: Data 62.9% / Morph 32.6% / Semantic 4.5%
```

以後、αὐτós(および代名詞・指示詞ファミリー)の Reading Japanese 責務は本設計に照らして扱う。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-19 | 初版・凍結(Morph 責務定義・Semantic 分離・H-6 実測対応・他 lemma 一般化) |
