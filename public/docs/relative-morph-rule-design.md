# 関係詞ファミリー Morph Rule 責務設計(Stage J-6a)

策定日: 2026-07-20
位置づけ: 関係詞 3 lemma(ὅς / ὅστις / ὅσος)の **Morph / Syntax / Semantic の責務境界を確定**する
設計文書。枠組みは I-2(Morph Rule Engine Design)・I-3(疑問詞・関係詞 Morph 責務設計)・
J-1(Implementation Spec)に従う。
根拠監査: H-3a(疑問詞・関係詞監査)・H-3b(bible_data.japanese ポリシー)。

**本文書は設計(責務定義)のみ。実装・コード・擬似コード・修正案は含まない。**
bible_data / reading-engine.js / Semantic / Presentation は変更しない。

数値は **クリーン NT 実測**(J-3 で重複「 2.json」除去済・総 137,741)。

---

## 1. 実 FS 実測監査(NT 全巻)

### ὅς(G3739)

- count: **1,408** / class: pron 1,407・det 1 / 固定 japanese: **「〜する者」**(全件)
- gender: **masculine 705 / neuter 489 / feminine 214**
- number: singular 1,058 / plural 350
- case: accusative 591 / nominative 357 / genitive 245 / dative 215
- english(全体): which 273 / whom 219 / that 201 / who 161 / what 151 / he 37
- **gender 別 english(責務判定の核心)**:
  - masculine: whom 198 / who 147 / which 39 / that 36 / he 35 → **人(who/whom)**
  - feminine: which 102 / that 51 / when 11 / whom 8 → 女性名詞への一致(which=どの女性名詞)
  - neuter: what 147 / which 132 / that 114 / whatever 19 → **事物(what)**

### ὅστις(G3748)

- count: **139** / class: pron / 固定 japanese: **「〜する者」**
- gender: masculine 86 / feminine 48 / neuter 5
- number: plural 75 / singular 64 / case: **すべて nominative(139)**
- english: who 66 / which 30 / they 16 / whoever 12 / this 5 / that 4
- gender 別: masculine who53/they16/whoever12 / feminine which26/who13 / neuter which2/whatever1

### ὅσος(G3745)

- count: **111** / class: pron / 固定 japanese: **「〜するだけ」**
- gender: neuter 70 / masculine 40 / feminine 1
- number: plural 91 / singular 20 / case: accusative 69 / nominative 38 / dative 3 / genitive 1
- english: whatever 19 / that 17 / all 13 / who 8 / how much 7 / as many as 6 / all that 6
- gender 別: masculine all11/who8/as many as5 / neuter whatever19/that17/how much7/all that6

---

## 2. Data 代表語の妥当性確認

| lemma | 代表語 | 妥当性 |
|---|---|---|
| ὅς | 〜する者 | 最頻の referent は人(M/F 919 件)。「者」は人の代表として妥当。ただし中性(489)は事物で「者」不適合 → 変化は Morph 以降 |
| ὅστις | 〜する者 | 同上(M/F 134・N 5)。ほぼ人。「者」妥当 |
| ὅσος | 〜するだけ | 数量関係詞「as much/many as」。neuter(事物)70・masculine(人)40。「〜するだけ」は数量代表として妥当 |

- H-3b ポリシーどおり **代表語は維持**(削除・多義化しない)。3 lemma とも H-3a で **Type C**。
- 「〜する者」「〜するだけ」は **関係節の placeholder(〜する)+ 頭語(者/だけ)** を含む複合形であり、
  単純名詞(彼/誰)とは構造が異なる。この点が Morph/Syntax の分担に影響する(§3〜§4)。

---

## 3. Morph が担当できる情報

条件: 形態情報だけで決定可能・文脈推論不要・決定的変換。

関係詞で Morph が決定的に扱えるのは **gender による頭語(substantive head)の種別**のみ。

| gender | 頭語 | 例 |
|---|---|---|
| masculine | 者(人) | 〜する者(維持) |
| neuter | もの / こと(事物) | 〜する者 → 〜するもの |
| feminine | (境界)既定は者・referent 依存 → Semantic | §5 |

- **決定的に Morph 可能なのは masculine→者(不変)/ neuter→もの**。gender は token の形態値であり推論不要。
- number(者/者たち)は寄与が小さく、代表語のままでも破綻しない(補助的)。
- **重要な限界**: 関係詞の **case は Morph の格助詞対象ではない**。αὐτós/τίς では case→格助詞(の/に/を)が
  Morph だったが、関係詞の case は **関係節内での役割(主語=nominative / 目的語=accusative)** を表す
  統語関係であり、頭語への単純な助詞付与(者を 等)は誤読を生む。したがって **関係詞の case 処理は
  Morph の責務ではなく Syntax**(§4)。Morph は頭語の種別選択に閉じる。

---

## 4. Syntax が担当する領域

関係詞の本質は関係節マーカーであり、以下は形態では決まらず統語構造を要する。

| 領域 | 内容 |
|---|---|
| **関係節** | 「〜する」に相当する従属節(関係節の動詞・修飾内容)の構成 |
| **先行詞(antecedent)** | 関係詞が指す先行名詞の同定と連結 |
| **主語/目的語関係** | 関係詞の case が示す**節内の文法役割**(nominative=節の主語 / accusative=節の目的語 等)。
  日本語では関係節の語順・助詞で表現され、頭語への機械的助詞付与では表せない |
| **格助詞の適否** | 上記より、関係詞への格助詞付与(者が/者を)は Syntax が節構造とともに決める領域 |

- H-3a Phase 4/5 の所見(「〜する者が」208 件の が 付与・中性 482 件を「者」と訳出)は、いずれも
  **Syntax 未整備に起因**する。関係節構造の反映は Syntax の責務。
- Morph(§3)は頭語 者/もの を選ぶのみで、節構造・格役割には踏み込まない。

---

## 5. Semantic が担当する領域

gender・統語では決まらず、語義・談話を要するもの。

| 用法 | 対象 lemma | 内容 |
|---|---|---|
| **whoever(誰でも)** | ὅστις | 不定関係・自由関係。「who」との判別は語義(ὅστις の総称・不定用法) |
| **whatever(何でも)** | ὅς(neuter whatever 19)・ὅσος | 自由関係・任意性 |
| **quantity(数量・程度)** | ὅσος | as many as / how much / all — 「どれだけの量か」は形態では決まらず語義選択 |
| **they(総称)** | ὅστις(they 16) | 総称的先行詞の解釈 |
| **discourse** | 全般 | 先行詞が既出か・指示対象の同定 |
| **feminine の人/物判別** | ὅς・ὅστις | 女性名詞が人(者)か事物(もの)かは referent 依存(§3 の境界) |

- Semantic は Morph/Syntax の既定を上書きする(I-1/J-1 の「Semantic > Morph」)。

---

## 6. Rule Table

| lemma | Data 代表語 | Morph 担当 | Syntax 担当 | Semantic 担当 |
|---|---|---|---|---|
| **ὅς**(G3739) | 〜する者 | gender→頭語: M→者(不変)/ N→もの・こと(・数: 者/者たち) | 関係節・先行詞・関係詞の格(主語/目的語役)・格助詞の適否 | 自由関係(whatever)・discourse・feminine 人/物判別 |
| **ὅστις**(G3748) | 〜する者 | gender→頭語: M→者(不変)/ N→もの | 関係節・先行詞・不定関係節構造 | 不定関係(whoever=誰でも)・they(総称)・feminine 判別 |
| **ὅσος**(G3745) | 〜するだけ | gender→頭語: M→者/ N→もの・こと | 関係節・先行詞 | 数量(as many/how much/all)・程度・任意性(whatever) |

- 3 lemma とも **Data は代表語を維持**し、**Morph は gender→頭語の種別選択に閉じる**。
- **case・関係節・先行詞は Syntax**(αὐτós/τίス と決定的に異なる点)。**数量・不定・談話は Semantic**。

---

## 7. 実装対象範囲の確定

本設計に基づく実装可否を、層の整備状況とともに確定する(実装案は書かない・範囲の確定のみ)。

| 責務 | 実装可否(現時点) | 理由 |
|---|---|---|
| **Morph: gender→頭語(N→もの)** | **実装可能**(Registry 追加型) | 形態のみ・決定的。αὐτós/τίς と同じ Registry 方式で頭語種別を選べる |
| **Morph: number(者/者たち)** | 補助・任意 | 寄与小。代表語のままでも破綻しない |
| **Morph: case→格助詞** | **対象外(禁止)** | 関係詞の case は節内役割(Syntax)。頭語への機械的助詞付与は誤読源 |
| **Syntax: 関係節・先行詞・格役割** | **未整備・対象外** | Syntax 層が未構築。本 Stage の実装対象に含めない |
| **Semantic: whoever/whatever/quantity/discourse** | **未整備・対象外** | Semantic 拡張が必要。対象外 |

- **即時に Morph 実装可能なのは「gender→頭語(neuter→もの)」のみ**。これは αὐτós(J-3)・τίς(J-5)と
  同一 Registry への lemma 追加で表現でき、Engine 構造を変えない。
- **case・関係節・格役割は Syntax の責務**であり、Syntax 層が未整備の現時点では実装対象外。Morph が
  関係詞へ格助詞を付けることは本設計で**明示的に対象外**とする(誤読防止)。
- feminine の人/物判別、数量・不定・談話は Semantic 責務として保留。
- したがって後続の実装 Stage(J-6b 等)があれば、その Morph 実装範囲は **gender→頭語の種別選択に
  限定**される(本設計はその範囲を確定するのみで、実装手順・コードは定義しない)。

---

## 責務凍結

```
[relative-morph-rule-design FROZEN 2026-07-20]
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結(ὅς/ὅστις/ὅσος 実測監査・Data/Morph/Syntax/Semantic 責務境界・Rule Table・実装対象範囲確定) |
