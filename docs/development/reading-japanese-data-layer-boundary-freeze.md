# Reading Japanese Data Layer Boundary Freeze(Stage M-15 前提・第 2)

策定日: 2026-07-22
位置づけ: **bible_data.japanese(Data 層)に安全に保持できる fact を定義**し、**Morph fact でも反映
不可な「屈折生成」を Data 層保持対象外として分離**する。M-14 execution design の反映対象を修正する。
根拠(FROZEN): reading-japanese-policy.md(L-0)・-data-role-migration-freeze.md(M-15 前提第 1)・
-adoption-decision-framework.md(M-13)・-adoption-execution-design.md(M-14)。
ユーザ判断(2026-07-22・固定点サブセットのみ反映)。

**本 freeze は責務境界の確定のみ。コード・データ・bible_data は変更しない。**

---

## 0. 背景(なぜ Data 層境界か)

- bible_data.japanese を Reading Japanese 正規値へ移行(M-15 前提第 1)する際、**engine は自身の出力を
  入力に戻すと再変換する**ことが判明した。
- 例: 動詞 豊かにする→(受動)豊かにされる を japanese に反映すると、再走査で **豊かにされられる**(二重屈折)
  になる。**屈折済み出力を Data に戻すと engine の入力/出力が循環し二重屈折する**(L-0 責務境界違反)。
- したがって **Data 層に保持してよい fact は「固定点」に限る**。屈折生成は Data に保持しない。

---

## 1. Data 層保持可能な fact の定義

**Data 層(bible_data.japanese)に保持してよいのは、engine 再処理後も値が変わらない「固定点」の fact のみ**。

| 保持可能(固定点) | 例 |
|---|---|
| **代名詞の数/性/人称変化** | 私→私たち・あなた→あなたがた・彼→彼ら/彼女/それ/それら |
| **関係詞の性変化** | 〜する者→〜するもの(neuter) |
| **Syntax pronominal(指示詞)** | この→これ(pronominal neuter=verb 参照) |

- これらは **engine に該当規則がない語形**(規則は 私/あなた/彼/〜する者/この を base にする)であり、
  反映後の base は規則不一致で **morph 不発 → 固定点**。格助詞は engine が動的付与(私たち→私たちの)。

---

## 2. 固定点条件

トークンが Data 層へ反映可能であるための条件(すべて満たす):

1. **source ∈ {morph, syntax}**(決定的 fact)。
2. **class が verb でない**(屈折生成でない)。
3. **反映値(after)が engine 再処理で再採用されない**(morphAdopted/syntaxAdopted が null になる)。
4. **格助詞は after に含めない**(engine が case から動的付与・after は格中立の代表形)。

- **after の算出は case 認識で行う**(reading から当該 case の格助詞のみ除去)。**語内の「もの」の の は
  格助詞でないため除かない**(§5 の _stem バグ修正参照)。

---

## 3. Morph fact でも反映不可な「屈折生成」の扱い

| 反映不可(Data 層保持対象外) | 理由 |
|---|---|
| **動詞屈折**(受動・分詞・屈折済み動詞形) | Data 層は辞書形/代表形を保持し、**engine が表示時に屈折を生成する責務**。屈折済み出力を Data に戻すと二重屈折(循環)する |

- **これは「採用不可(C)」ではなく「Data 層保持対象外」**である。屈折自体は正しく、**engine の描画層で
  動的生成される**(bible_data には辞書形が残り、表示で屈折が付く)。
- 規模: 約 7,000 token(A 分類 Morph 9,412 のうち動詞 class)。

---

## 4. Builder / Engine / Data の責務境界(確定)

| 層 | 保持/生成するもの |
|---|---|
| **Data(bible_data.japanese)** | **固定点の代表形**(数/性/人称を反映した代名詞・関係詞・指示詞)。**屈折・格助詞は保持しない** |
| **Engine** | Data を入力に **屈折・格助詞を動的生成**(辞書形→屈折形・代表形→格形) |
| **Builder** | 決定的 fact を採用し reading を確定(記録層)。**Data 層へ反映できるのは固定点のみ**を判定 |

- **境界の核心**: **Data 層は「engine の入力かつ固定点」**でなければならない。engine が生成する屈折・格は
  Data に固定しない(循環防止)。

---

## 5. M-14 execution design からの変更点

| 項目 | M-14 | 本 freeze(修正後) |
|---|---|---|
| 反映対象 | A 分類 9,535 token(Morph 9,412/Syntax 123) | **固定点のみ 約 2,537 token**(代名詞・関係詞 Morph 2,414/Syntax 123) |
| 動詞屈折 約 7,000 | Morph adoption として反映 | **Data 層保持対象外**(engine 動的屈折のまま・採用不可ではない) |
| after 算出 | Builder reading(morphAdopted.adopted) | **case 認識で格助詞を除いた代表形**(語内「もの」は保持) |
| adoption diff 仕様 | 維持 | **維持**({verseId,tokenId,before,after,source,reason}) |
| engine 非改変 | 維持 | **維持** |

- **_stem バグ修正(別途 QA 記録)**: M-8b の `_stem` は末尾の の を格助詞として除いていたため、
  **もの→も**(〜するもの→〜するも)と誤って語を壊していた。**「もの」で終わる場合は除かない**よう
  修正し、morphAdopted metadata を正す(reflection は case 認識 after を使うため別経路だが、metadata も修正)。

---

## 6. 最重要判断

- **今回の論点は rollback ではなく「bible_data に何を保持すべきか」という責務境界**である。
  **Data 層は辞書形/代表形(固定点)を保持し、engine が屈折・格を生成する**。屈折済み出力を Data へ戻すと
  入力/出力が循環し二重屈折する(L-0 違反)。
- **M-8〜M-14 の「決定的 fact のみ採用」原則をさらに厳密化**し、**「Data 層に安全に存在できる fact
  (固定点)だけを反映する」**方針とする。全件反映(9,535)ではなく **固定点 約 2,537** を反映し、
  動詞屈折は Data 層保持対象外(engine 描画責務)とする。

---

## 凍結

```
[reading-japanese-data-layer-boundary FROZEN 2026-07-22]
Data層保持可能fact=固定点のみ: 代名詞の数/性/人称(私→私たち等) / 関係詞の性(〜する者→〜するもの) / Syntax pronominal(この→これ)
固定点条件: source∈{morph,syntax} / class≠verb / 再処理で再採用null / 格助詞はafterに含めない(engine動的付与・case認識でafter算出・語内「もの」保持)
反映不可(Data層保持対象外・採用不可ではない): 動詞屈折(受動/分詞/屈折済み)約7,000=engine描画層で動的生成。屈折済みをDataに戻すと二重屈折(循環)
責務境界: Data=固定点代表形(屈折/格を保持しない) / Engine=屈折・格を動的生成 / Builder=固定点のみ反映判定
M-14変更: 反映9,535→固定点約2,537(Morph代名詞/関係詞2,414+Syntax123)。動詞7,000はData層保持対象外。after=case認識除去の代表形。diff仕様/engine非改変は維持
_stemバグ: M-8b _stem がもの→も誤除去。「もの」終端は除かない修正(別途QA記録)
```

本 freeze により M-15 反映を **固定点 約 2,537 token** に限定して実装する。engine 非改変・diff 仕様維持・
動詞屈折は Data 層保持対象外(engine 描画)とする。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結(Data 層保持=固定点のみ・動詞屈折は Data 層保持対象外・責務境界 Data/Engine/Builder・M-14 反映 9,535→約2,537・_stem もの バグ修正記録) |
