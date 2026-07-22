# 再帰代名詞ファミリー Morph Rule 責務設計(Stage J-8a)

策定日: 2026-07-20
位置づけ: 再帰代名詞 3 lemma(ἐμαυτοῦ / σεαυτοῦ / ἑαυτοῦ)の **Morph / Semantic の責務境界を
確定**する設計文書。枠組みは I-2(Morph Rule Engine Design)・J-1(Implementation Spec)・
J-6a/J-7a(関係詞・指示詞責務設計)に従う。
根拠監査: H-4(代名詞監査)。

**本文書は設計(責務定義)のみ。実装・コード・擬似コード・修正案は含まない。**
bible_data / reading-engine.js / Semantic / Syntax / Presentation / generated data は変更しない。

数値は **クリーン NT 実測**(総 137,741・重複「 2.json」不在)。

---

## 1. 実 FS 全 NT 出現数

| lemma | count | Strong | 固定 japanese |
|---|---|---|---|
| **ἐμαυτοῦ**(1人称) | 37 | G1683 | 自分自身 |
| **σεαυτοῦ**(2人称) | 43 | G4572 | 自分自身 |
| **ἑαυτοῦ**(3人称/汎用) | 823 | G1438 330(真正再帰 F)+ G848 493(人称代名詞の再帰的用法 P) | 自分 493 / 自分自身 330 |

---

## 2. lemma 別・形態別分布(重要: person は morph 文字列に符号化)

**決定的所見**: token の `person` フィールドは全件 **空("")** だが、**morph 文字列に person が符号化**されている
(F-1 / F-2 / F-3)。しかも **各 lemma(strong)の person は一意**である。

### ἐμαυτοῦ(G1683)

- morph: **F-1**GSM / F-1ASM / F-1DSM(すべて 1 人称・単数・男性)
- number: singular 37 / gender: masculine 37 / case: acc18 / gen14 / dat5
- english: myself 23 / my own 9 / me 3 / my 2 → **1 人称単数**

### σεαυτοῦ(G4572)

- morph: **F-2**ASM / F-2DSM / F-2GSM(2 人称・単数・男性)
- number: singular 43 / gender: masculine 43 / case: acc33 / dat5 / gen5
- english: yourself 37 / you 2 / your 2 → **2 人称単数**

### ἑαυτοῦ(G1438 / G848)

- **G1438**(真正再帰): morph **F-3**ASM/GSM/DSM/APM(3 人称)。gender M/F/N・単複あり
- **G848**(人称代名詞の再帰的用法): morph **P**-APM/ASF 等(person 桁なし・αὐτῶν 等)。ja=自分
- 合算 number: singular 293 / plural 530 / gender: masculine 651 / feminine 164 / neuter 8
- english: them 337 / himself 98 / it 66 / her 57 / themselves 48 / **yourselves 37** / they 30 / his own 21
- **要点**: 文法上 3 人称(F-3)だが、Koine の再帰levelingで **yourselves(2 複)・ourselves(1 複)にも
  流用**される(yourselves 37 等)。したがって **実際の person は文脈(節の主語)依存**。

---

## 3. japanese 代表語の妥当性確認

| lemma | 代表語 | 妥当性 |
|---|---|---|
| ἐμαυτοῦ | 自分自身 | 再帰として正しいが person(1 人称)非反映。「私自身」がより精密 |
| σεαυτοῦ | 自分自身 | 同上。「あなた自身」がより精密 |
| ἑαυτοῦ(G1438) | 自分自身 | 3 人称/汎用。person-leveling(yourselves 等)があるため **person 中立の「自分自身」が安全** |
| ἑαυτοῦ(G848) | 自分 | 人称代名詞の再帰/所有的用法。「自分」で概ね機能 |

- **「自分/自分自身」は person 中立で全再帰に適合する安全な代表語**(誤りではない)。person 精密化は
  「精度向上」であって「誤り訂正」ではない(H-3b の代表語として妥当・維持)。

---

## 4. Morph で決定可能な範囲

判定基準: 形態情報だけで一意決定できるもの。

### person(strong により一意 → Morph-Registry で決定可能)

| lemma | person | Reading(精密) | 決定性 |
|---|---|---|---|
| ἐμαυτοῦ(G1683) | 1 人称(F-1) | **私自身** | strong で一意・決定的・安全 |
| σεαυτοῦ(G4572) | 2 人称(F-2) | **あなた自身** | strong で一意・決定的・安全 |
| ἑαυτοῦ(G1438) | 3 人称(F-3)だが leveling | 自分自身(維持) | **person-leveling で不一意 → 精密化は Semantic** |

- **ἐμαυτοῦ / σεαυτοῦ は person が strong で一意**(常に 1 人称 / 2 人称単数)。strong キーの Registry で
  「私自身 / あなた自身」を決定的に選べる(形態のみ・文脈推論不要・安全)。
- **ἑαυτοῦ(F-3)は person が leveling で不一意**(himself だけでなく yourselves/ourselves)。単一 person に
  固定できないため、**汎用「自分自身」を維持**するのが安全。

### number / gender(ἑαυτοῦ)

- number(単複)・gender は morph に明示されるが、**「自分/自分自身」は person・gender・number 中立**で
  全件に適合するため、Morph による細分(彼自身/彼女自身/彼ら自身/自分たち)は **改善余地が小さく、
  かつ person-leveling と衝突する**(F-3 でも yourselves のため「彼ら自身」は不適合)。Morph の追加価値は低い。

### case

- 格助詞付与は Phase 1 の既存挙動(自分を/自分の)。本設計の対象外。

---

## 5. Semantic へ委譲する範囲

| 用法 | 対象 | 内容 |
|---|---|---|
| **person-leveling** | ἑαυτοῦ(G1438) | F-3 が yourselves/ourselves に流用。精密 person(私たち自身/あなたがた自身/彼ら自身)は **節の主語(文脈)** から決まる |
| 再帰 vs 所有 | ἑαυτοῦ(G848) | αὐτῶν の再帰的用法か所有(their own)かの判別 |
| **強調 / identity** | 全般 | 「自ら」「〜自身が」の強調用法 |
| 反射対象の同定 | 全般 | 何を指す再帰かの文脈判断 |

- Semantic は Morph の既定を上書きする(Semantic > Morph)。ἑαυτοῦ の精密 person は Semantic が
  節主語から決め、汎用「自分自身」を必要時に上書きする。

---

## 6. αὐτός との責務差分

| 観点 | αὐτός(G846・実装済) | 再帰代名詞 |
|---|---|---|
| 変化の駆動 | **gender / number(morph 明示フィールド)** | **person(strong で一意 or 文脈で leveling)** |
| Morph の決定 | 単一 strong 内で gender/number により 彼/彼女/彼ら/それ | **strong 自体が person を決める**(ἐμαυτοῦ→私自身 / σεαυτοῦ→あなた自身) |
| gender の役割 | 語幹を決める(彼/彼女/それ) | **中立**(自分 は gender 非依存)・Morph 不要 |
| 文脈依存 | intensive/identity のみ(少数) | **ἑαυτοῦ の person-leveling が文脈依存**(構造的) |
| 代表語の正しさ | 「彼」は非男性単数で **不適合**(誤り) | 「自分自身」は全 person で **適合**(誤りでない・精度のみ) |

- **本質差**: αὐτós は「単一 lemma が形態で分岐」→ Morph 中核。再帰代名詞は「person が lemma(strong)で
  固定 or 文脈 leveling」→ **ἐμαυτοῦ/σεαυτοῦ は strong 固定(Morph-Registry で可)、ἑαυτοῦ は文脈(Semantic)**。
- また αὐτós の改善は **誤り訂正**(彼→それ)だったが、再帰代名詞は **精度向上**(自分自身→私自身)であり、
  改善の性質(緊急度)が異なる。

---

## 7. Rule Table

| lemma | Data 代表語 | Morph 担当 | Semantic 担当 |
|---|---|---|---|
| **ἐμαυτοῦ**(G1683) | 自分自身 | **私自身**(strong=1 人称・一意)・case 助詞 | 強調/identity(自ら) |
| **σεαυτοῦ**(G4572) | 自分自身 | **あなた自身**(strong=2 人称・一意)・case 助詞 | 強調/identity |
| **ἑαυτοῦ**(G1438) | 自分自身 | (person 固定は不可・leveling。number/gender 細分も低価値)・case 助詞 | **person 精密化(私たち自身/あなたがた自身/彼ら自身=節主語)**・強調/identity |
| **ἑαυτοῦ**(G848) | 自分 | (P 形・person 非マーク) | 再帰 vs 所有(their own)の判別・強調 |

---

## 8. 実装 Gate 条件と J-8b 判定

| Gate | 状態 | 理由 |
|---|---|---|
| G-morph(person・ἐμαυτοῦ/σεαυτοῦ) | **充足** | strong で person 一意(F-1/F-2)。私自身/あなた自身 を決定的・安全に選べる |
| G-morph(person・ἑαυτοῦ) | **未充足** | F-3 の person-leveling(yourselves/ourselves)で不一意。単一 person 固定は悪化リスク |
| G-morph(gender/number 細分) | 低価値 | 自分自身 が中立で兼用可・leveling と衝突。追加価値小 |
| G-data(代表語妥当) | 充足 | 自分/自分自身 は person 中立で妥当・維持 |
| G-strong(Registry 適合) | 充足 | 3 lemma とも単一〜少数 strong で Registry 追加型に適合 |
| G-regression(非破壊追加) | 前提充足 | ἐμαυτοῦ/σεαυτοῦ は base='自分自身' 一致時のみ発火で安全側 |

### J-8b 実装 Gate 判定

- **J-8b は限定スコープで実装可能**(条件付き Gate 充足):
  - **ἐμαυτοῦ(G1683)→ 私自身 / σεαυτοῦ(G4572)→ あなた自身** は strong で person 一意のため、αὐτós/τίス と
    同じ Registry(strong キー・base='自分自身' 一致時のみ発火)で**決定的・安全に実装可能**。ただし改善は
    **精度向上**(誤り訂正ではない)であり規模は小(37 + 43 = 80 件)。
  - **ἑαυτοῦ(G1438/G848)は Morph 対象外**。person-leveling が文脈依存のため精密 person は **Semantic 責務**、
    汎用「自分自身/自分」を維持。gender/number 細分は低価値・衝突リスクで見送り。
- **判定**: J-8b は「ἐμαυτοῦ→私自身・σεαυτοῦ→あなた自身」の **2 lemma・person 精密化に限定**して進める
  ことが可能。ἑαυτοῦ の person は Semantic に委譲。指示詞(J-7a・Morph 対象外)よりは Morph 適合だが、
  αὐτós/τίス/関係詞ほどの改善規模・緊急度はない(責務確定のみ・実装可否の最終判断は発注側)。

---

## 責務凍結

```
[reflexive-morph-rule-design FROZEN 2026-07-20]
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結(ἐμαυτοῦ/σεαυτοῦ/ἑαυτοῦ 実測・person は morph 文字列符号化かつ strong で一意・ἐμαυτοῦ/σεαυτοῦ は Morph 可/ἑαυτοῦ leveling は Semantic・J-8b 限定スコープ判定) |
