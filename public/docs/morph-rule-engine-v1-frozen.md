# Morph Rule Engine v1 FROZEN

策定日: 2026-07-20
位置づけ: Morph Rule Engine v1 の**実装範囲・責務境界・対象外を正式凍結**する開発基準文書。
本文書は仕様の確定のみで、実装変更・コード追加・Rule 追加は一切行わない。
根拠成果物: morph-rule-engine-design(I-2)・implementation-spec(J-1)・implementation-plan(J-2)・
alphautos/tis/relative/reflexive の各 implementation-report・demonstrative/reflexive-morph-rule-design・
allelon-morph-rule-audit。

---

## 1. 目的

**Data → Morph → Syntax → Semantic → Presentation** の責務分離を維持し、**Morph 層は「形態情報による
決定的な語幹変化」のみ**を扱うことを定義する。

- **Morph は翻訳層ではない。** token に存在する形態情報(gender/number/case/person/mood)から
  **Reading Stem(読解語幹)を生成する層**である。
- 意味の選択・文脈解釈・談話判断は Morph の責務ではなく、Syntax / Semantic が担う。
- Data 代表語を起点に、Morph が形態で語幹を変化させ、Semantic が必要時に上書きする(Semantic > Morph)。

---

## 2. 責務境界

| 層 | 担当する | 担当しない(禁止) |
|---|---|---|
| **Data** | lemma 代表語の保持・安定した基本語義 | 文脈解釈・多義化・節個別訳 |
| **Morph** | gender / number / case / person / mood など **token に存在する形態情報のみ**で語幹決定 | 語義選択・文脈・談話・先行詞解決 |
| **Syntax** | 関係節・先行詞・連体/代名詞判定・節内役割(主語/目的語) | 形態変化・語義選択 |
| **Semantic** | 語義選択・談話・強調・identity・idiom・referent 判定 | 形態変化・表示形式 |
| **Presentation** | 表示加工のみ(括弧・強調表示・UI) | 語の変更 |

- 各層は上位層の出力を入力とし、自層の責務範囲だけを変える。
- Morph の入力は **形態値の範囲に閉じる**。範囲外を要する判断は Morph に置かない。

---

## 3. Registry 方式の確定

Morph Rule Engine v1 は次の Registry 方式を採用した。

```
lemma(strong)─→ Morph Rule ─→ Reading Stem
```

原則:

- **lemma 追加は Registry 登録**(`_MORPH_STEM_RULES` への 1 エントリ追加)。
- **Engine 構造・pipeline・責務境界は変更しない**(登録による拡張・分岐追加ではない)。
- **未登録 lemma / base 不一致 / 未定義の形態組み合わせは Data 代表語へ安全フォールバック**
  (既存挙動と完全同一)。
- **base(Data 代表語)一致時のみ発火**し、Semantic が別語を代入した token では Morph は上書きしない
  (Semantic > Morph の優先関係を保持)。

---

## 4. 実装済み lemma 一覧(v1 = 7 lemma)

| lemma | Strong | Morph 担当 | 結果 |
|---|---|---|---|
| αὐτός | G846 | gender × number | 彼 / 彼ら / 彼女 / 彼女たち / それ / それら |
| τίς | G5101 | gender | 誰 / 何 |
| ὅς | G3739 | gender(頭語) | 〜する者 / 〜するもの |
| ὅστις | G3748 | gender(頭語) | 〜する者 / 〜するもの |
| ὅσος | G3745 | gender(頭語) | 〜する者 / 〜するもの |
| ἐμαυτοῦ | G1683 | person 固定(strong 一意) | 私自身 |
| σεαυτοῦ | G4572 | person 固定(strong 一意) | あなた自身 |

各実装に共通する原則:

- **Data 代表語は維持**(彼 / 誰 / 〜する者 / 〜するだけ / 自分自身 は削除・変更しない)。
- **Morph は形態変化のみを担当**(gender→語幹・person→語幹)。
- **Semantic / Syntax 領域は未実装**(intensive/identity・why/which・関係節/格役割・数量・person-leveling
  は各層の責務として保留)。

---

## 5. 対象外一覧(v1 で凍結)

### 指示詞 — οὗτος / ἐκεῖνος / τοιοῦτος

- **理由**: 中核の変化(これ/この/この人)が **連体用法(この+名詞)か代名詞用法(これ 単独)かに
  依存 = Syntax 領域**。gender→頭語を無条件適用すると連体用法を破壊する。deixis(この/あの)は
  lemma 固定。
- 根拠: docs/demonstrative-morph-rule-design.md(Morph 単独対象外・Gate 未充足)。

### ἑαυτοῦ の精密化(G1438 / G848)

- **理由**: person 決定に **節主語・文脈が必要**(F-3 が yourselves/ourselves に流用される
  person-leveling)。精密 person(私たち自身/彼ら自身)は Semantic。汎用「自分自身/自分」を維持。
- 根拠: docs/reflexive-morph-rule-design.md。

### ἀλλήλων(G240)

- **理由**: **形態による語幹変化が存在しない**(常に複数・person 中立・gender 無関係)。Data 代表語
  「互いに」で全 100 件に適合し十分。
- 根拠: docs/allelon-morph-rule-audit.md。

---

## 6. QA 結果(既存 report からの引用・新規測定なし)

### lemma 別改善

| 実装 | 改善内容 | 件数 | morph 基準 |
|---|---|---|---|
| αὐτós(J-3) | 不適合 34.6%(1,755)→ 1.5%(75) | **1,680 改善** | 43,936 → 44,035(+99) |
| τίス(J-5) | neuter 誰→何(全 neuter) | **354 改善** | 44,035 → 44,114(+79) |
| 関係詞(J-6b) | neuter 者→もの(ὅς489/ὅστις5/ὅσος70) | **564 改善** | 44,114 → 44,251(+137) |
| 再帰(J-8b) | 自分自身→私自身/あなた自身 | **80 改善** | 44,251(更新不要・非主格) |

- v1 累計: morph coverage **43,936 → 44,251**(+315)。改善トークン **約 2,678 件**。
- 副次改善: 疑問詞「誰は」16 件・関係詞「〜する者が」46 件の不自然な助詞付与を解消。

### 共通確認(全実装で成立)

| 項目 | 結果 |
|---|---|
| 既存 lemma の悪化 | **なし**(各実装で相互干渉 0・7 lemma 併存) |
| Semantic 短絡維持 | **維持**(re-phase5 ALL PASS・base 一致時のみ発火) |
| chip ⇔ panel 一致 | **100.00%**(不一致 0) |
| Presentation 破損 | **なし**(破損形 0) |
| generated data 非依存 | **確認**(Morph Rule は engine コード・再生成不要) |
| 既存回帰 8 スイート | **ALL PASS** |

---

## 7. Morph 追加 Gate(今後の基準)

新しい lemma を Morph Rule に追加してよい条件:

### 実装可能(すべて満たす)

- **形態情報だけで決定可能**(gender/number/case/person/mood の範囲)
- **推論不要**(意味・文脈・先行詞を参照しない)
- **deterministic**(同一形態 → 常に同一語幹)
- **Semantic / Syntax を侵害しない**(base 一致時のみ発火・短絡順を壊さない)

### 実装禁止(いずれか該当)

- **文脈依存**(同一形態でも文脈で変わる)
- **談話依存**(指示距離・既出性)
- **先行詞依存**(関係節・照応対象)
- **referent 判定が必要**(人/物・person-leveling 等)

---

## 8. Syntax / Semantic へ移行する条件

**Morph で解決できない問題を無理に Morph へ入れない。**

| 移行先 | 対象 |
|---|---|
| **Syntax** | 節構造・関係節・連体修飾(連体/代名詞判定)・格役割(主語/目的語) |
| **Semantic** | 語義選択・強調・identity・idiom・discourse・referent 判定・数量・person-leveling |

- 指示詞(連体/代名詞=Syntax)・ἑαυτοῦ(person-leveling=Semantic)・関係詞の格役割(Syntax)・
  ὅσος の数量(Semantic)は、いずれも上表に従い各層へ委譲済み。
- 将来 Syntax Rule Engine / Semantic Rule 拡張が整備された段階で、これらを対象に再評価する。

---

## 9. FROZEN 宣言

Morph Rule Engine v1 を以下の内容で凍結する。

- **対象 lemma(7)**: αὐτós(G846)/ τίス(G5101)/ ὅς(G3739)/ ὅστις(G3748)/ ὅσος(G3745)/
  ἐμαυτοῦ(G1683)/ σεαυτοῦ(G4572)
- **方式**: strong キー Registry(`_MORPH_STEM_RULES`)・base 一致発火・安全フォールバック・
  Engine 構造不変
- **対象外**: 指示詞(Syntax)・ἑαυτοῦ 精密化(Semantic)・ἀλλήλων(形態変化なし)
- **責務境界**: Data → Morph → Syntax → Semantic → Presentation(§2)
- **追加 Gate / 移行条件**: §7 / §8

### 確認事項(本 Stage J-9)

- **本文書作成のみ**(morph-rule-engine-v1-frozen.md の追加)
- **コード差分なし**(reading-engine.js 不変)
- **データ差分なし**(bible_data / generated data 不変)
- **Engine 挙動変更なし**(Registry・pipeline・出力すべて不変・全回帰 ALL PASS)

```
[Morph Rule Engine v1 FROZEN 2026-07-20]
対象 7 lemma: G846 / G5101 / G3739 / G3748 / G3745 / G1683 / G4572
方式: strong キー Registry・base 一致発火・安全 FB・Engine 構造不変
対象外: 指示詞(Syntax)/ ἑαυτοῦ 精密化(Semantic)/ ἀλλήλων(形態変化なし)
QA: morph 43,936→44,251(+315)・改善約2,678件・悪化0・chip⇔panel100%・回帰ALL PASS
```

以後、Morph Rule の追加・変更は本 v1 FROZEN 基準に照らして行う。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結(v1 実装範囲・責務境界・Registry 方式・7 lemma・対象外・QA・追加 Gate・移行条件) |
