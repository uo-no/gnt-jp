# Morph Rule Engine 設計(Stage I-2)

策定日: 2026-07-19
位置づけ: Reading Japanese における **Morph Rule Engine の共通基盤設計**。
αὐτós 専用ではなく、**今後すべての Morph Rule を追加するための責務・構造の設計**である。
根拠: docs/alphautos-morph-rule-design.md(I-1)・docs/alphautos-quality-audit.md(H-6)・
docs/bible-data-japanese-policy.md(H-3b)・docs/interrogative-relative-quality-audit.md(H-3a)。

**本文書は設計(責務定義・設計原則)のみ。実装・コード・擬似コード・修正案・データ変更は
一切含まない。** Engine / Presentation / Semantic / Context / bible_data / 生成データは変更しない。

---

## 1. 目的

Morph Rule Engine の責務を定義する。Reading Japanese は次の責務分離を前提とする。

```
Data ─→ Morph ─→ Semantic ─→ Presentation
```

- **Data**: lemma ごとの安定した代表語を提供する(H-3b)。
- **Morph**: 形態情報(gender/number/case/person …)に応じて Reading Japanese の語幹を決定する。
- **Semantic**: 形態では決まらない語義・談話・強調を判別する。
- **Presentation**: 表示形式のみを整える(語そのものは変えない)。

本設計は、この 4 層のうち **Morph の責務境界を明文化し、Morph Rule を追加するための共通構造**を
定義することを目的とする。特定 lemma の変換内容ではなく、「どの Rule が Morph に属し、どの Rule が
属さないか」を判定する基準と、その登録・拡張の原則を定める。

> **注(既存 Engine との関係)**: 上記は **責務の論理的分離**であり、凍結済み Reading Engine v2 の
> 実行順(semantic → syntax → morph → particle → fallback)を変更するものではない。実行系では
> Semantic が先に評価されて Morph 既定を上書きする形が「Semantic が Morph に優先する」責務関係を
> 実装している。本設計は責務の帰属を定義するもので、実行順の再設計ではない。

---

## 2. Morph Rule Engine の責務

### Morph が担当するもの

| 情報 | 役割 |
|---|---|
| gender | 語幹の性選択(彼 / 彼女 / それ) |
| number | 単複の選択(彼 / 彼ら) |
| case | 格の反映(格助詞・既存責務) |
| person | 人称の反映(必要な lemma のみ) |
| mood | 用言の活用選択(必要時。分詞・命令など既存責務) |

共通条件: **入力は token が既に保持する形態値のみ**。Morph はこれらを読むだけで出力を決める。

### Morph が担当しないもの

- 語義選択(同一形態で語が変わるもの)
- 談話(この/その/あの の距離、指示対象の同定)
- 文脈(先行詞の解決、節をまたぐ参照)
- 強調(intensive)
- 比喩・修辞
- 神学的解釈

これらは形態値だけでは決まらず、Semantic(または Syntax)の責務である。

---

## 3. Rule Pipeline

各層の責務を整理する。Morph Rule Engine はこのうち Morph 層に位置する。

| 層 | 入力 | 責務 | 出力 | 例 |
|---|---|---|---|---|
| **Data** | lemma | 安定した代表語を保持する | 代表語 | αὐτós → 彼 |
| **Morph** | 代表語 + 形態値 | 形態で決まる語幹・活用を決定する | Reading 語幹(+格助詞) | 彼 → 彼ら / それ / 彼女 |
| **Semantic** | 語幹 + 語義文脈 | 形態で決まらない語義・談話・強調を判別し、必要なら上書きする | 語義反映済み語 | 彼 → 自身 / 同じ(intensive) |
| **Presentation** | 語 | 表示形式のみ整える(語は変えない) | 表示文字列 | 福音（へ）等の整形 |

- 各層は**上位層の出力を入力とし、自層の責務範囲だけを変える**。
- Morph は Data の代表語を起点にし、Semantic は Morph の語幹を必要時に上書きする(責務の優先関係)。
- Presentation は語を変えない(H-6 で αὐτós の Presentation 無罪を確認済み)。

---

## 4. Rule Interface(責務契約)

Morph Rule は、**共通の入力集合を受け取り、Reading Japanese の語幹を返す責務**を持つ。
以下はコードではなく、**Rule が満たすべき契約(何を入力とし何を出力するか)**の定義である。

### 入力(Rule が参照してよい形態情報)

- lemma
- gender
- number
- case
- person
- mood
- voice
- tense

これらはすべて token が保持する形態値であり、**Rule はこの範囲の外(語義・文脈・先行詞)を
参照してはならない**。参照が必要になった時点で、その判断は Morph ではなく Semantic の責務である。

### 出力(Rule が返すもの)

- Reading Japanese の**語幹**(例: 彼 / 彼ら / 彼女 / それ / それら)。
- 格助詞の付与など既存 Morph 責務は語幹決定の後段で従来どおり行う(本設計の対象は語幹選択の帰属)。

### 契約の性質

- **決定的**: 同一の入力(形態値)に対して常に同一の語幹を返す。
- **閉じている**: 入力は上記の形態値集合に限られ、外部状態に依存しない。
- **単一責務**: 語幹選択のみを行い、語義判別・表示整形は行わない。

---

## 5. Rule Table(Morph / Semantic 責務一覧)

今後追加される Morph Rule は**すべて同じ契約(§4)で登録できる**こと。対象候補 lemma について、
Morph が担当する範囲と Semantic が担当する範囲を一覧化する(数値根拠は H-3a / H-4 / H-6)。

| lemma | Morph が担当(形態で決定) | Semantic が担当(語義・談話) | 備考 |
|---|---|---|---|
| **αὐτós** | gender/number 語幹: 彼 / 彼ら / 彼女 / 彼女たち / それ / それら | intensive・identity: 自身 / 同じ / まさに | H-6: Morph 32.6% / Semantic 4.5% |
| **τίς** | gender: 男性→誰 / 中性→何 | 疑問の語用: なぜ / どれ 等の語義 | H-3a: unsafe 74.4% |
| **ὅς** | gender: 人(M/F)→者 / モノ(N)→もの | 関係節の構文機能(Syntax と協働) | H-3a: 中性 482 で「者」不適合 |
| **ὅστις** | gender: 者 / もの | 不定関係(whoever)+ 関係節構文(Syntax) | H-3a |
| **ὅσος** | number/gender: 数量関係の性数 | 数量・程度の語義(whatever / as many) | H-3a: 中性 72 |
| **ἐκεῖνος** | gender/number: あの人 / あの人々 / あれ / あれら | 談話距離(この/その/あの) | H-4: unsafe 34.6% |
| **οὗτος** | gender/number: この人 / これ / これら | 談話上の指示対象・近称の含意 | H-4: unsafe 15.6% |
| **τοιοῦτος** | gender/number: このような人 / このようなもの | 質・種類の含意(such) | H-4: unsafe 12.3% |

- **関係詞(ὅς / ὅστις / ὅσος)は Morph(性数)に加えて Syntax(関係節構造)との協働が必要**であり、
  純粋な Morph 単独では完結しない。Rule Table 上は Morph 担当分(性数による者/もの)と、
  Syntax/Semantic 担当分(関係節機能)を分けて登録する。
- 各 lemma とも **Data は 1 つの代表語を維持**し、Morph/Semantic が変化分を分担する構造は共通。

---

## 6. Morph Rule に追加できる条件

ある変換規則を Morph Rule として登録してよいかは、次の基準で判定する。

### Morph 対象の条件(すべて満たす)

1. **形態情報だけで出力が一意に決定できる**(gender/number/case/person/mood/voice/tense の範囲)。
2. **意味推論・文脈参照・先行詞解決を要しない**。
3. **決定的**である(同一形態 → 常に同一出力)。

この 3 条件を満たすものだけが Morph Rule に属する。αὐτós の gender/number 語幹選択はこれを満たす
(token.gender/number から一意・推論不要・決定的)。

### Semantic 対象の条件(いずれかに該当)

1. 同一形態でも**語義**によって出力が変わる(αὐτós の代名詞 vs intensive)。
2. **談話**(指示距離・指示対象)の解釈を要する(ἐκεῖνος / οὗτος)。
3. **文脈・先行詞・統語位置**の解釈を要する(関係詞の referent、疑問の語用)。
4. 比喩・強調・神学的含意など、形態に還元できない判断を要する。

いずれかに該当する規則は Morph に置かず、Semantic(必要に応じ Syntax)に帰属させる。

> 判定の一語要約: **「形態で一意に決まるなら Morph、語義・談話・文脈が要るなら Semantic」**。

---

## 7. 拡張方針

- **lemma を追加するだけで Morph Rule を拡張できる**こと。新しい lemma の性数変換を Rule Table
  (§5)の 1 行として登録すれば済み、**Engine の構造(層構成・責務境界・パイプライン)は変更しない**。
- Morph Rule の追加は「**登録**」であって「分岐の追加」ではない。すなわち、責務境界(§2)と契約(§4)を
  満たす限り、規則の増加が Engine の他部分に波及しない。
- 既存の凍結資産(Reading Engine v2 の resolve chain、Presentation Policy、Context Layer)は
  本設計の追加によって責務を侵さない。Morph Rule Engine は Morph 層の内部構造の定義に閉じる。
- 将来 Semantic Rule が拡張される場合も、同じ「登録による拡張・構造不変」の原則を Semantic 層に
  適用する(本設計の対象は Morph 層だが、原則は共通に持てる)。

---

## 8. 設計原則(要約)

1. **責務は Data → Morph → Semantic → Presentation に分離する**。各層は自層の責務範囲だけを変える。
2. **Morph は形態値のみを入力とし、Reading 語幹を決定的に返す**。語義・談話・文脈は参照しない。
3. **Semantic は形態で決まらない判断を担い、必要時に Morph 出力を上書きする**。
4. **Presentation は語を変えず表示形式のみ整える**。
5. **Morph Rule はすべて共通契約(§4)で登録し、lemma 追加は構造を変えない拡張である**。
6. 帰属判定の基準は §6:**形態で一意=Morph / 語義・談話・文脈が必要=Semantic**。

本設計は責務・構造・原則の定義に留まる。変換規則の記述形式・データ構造・実装方式は本文書の
対象外であり、後続 Stage(実装計画)で扱う。

---

## 凍結

```
[Morph Rule Engine Design FROZEN 2026-07-19]
Stage I-2 — Reading Japanese Morph Rule Engine 共通基盤設計
責務: Data(代表語) → Morph(形態値のみで語幹決定・決定的) → Semantic(語義/談話/文脈・上書き) → Presentation(表示のみ)
契約: 入力=lemma/gender/number/case/person/mood/voice/tense、出力=Reading語幹。決定的・閉じている・単一責務。
帰属基準: 形態で一意決定=Morph / 語義・談話・文脈が必要=Semantic
拡張: lemma追加=Rule Table登録のみ・Engine構造不変
根拠: I-1(alphautos-morph-rule-design)・H-6・H-3a・H-3b・H-4
```

以後、Reading Japanese の Morph Rule 追加は本設計に照らして行う。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-19 | 初版・凍結(Morph Rule Engine 責務・Pipeline・Rule Interface 契約・Rule Table・帰属基準・拡張方針) |
