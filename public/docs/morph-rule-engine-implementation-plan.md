# Morph Rule Engine 実装計画(Stage J-2)

策定日: 2026-07-19
位置づけ: Morph Rule Engine **実装前の計画**。設計(I-1/I-2/I-3)・仕様(J-1)を実装へ移すための
段取り・QA・リリース判定・開始 Gate を定義する。
前提資料: docs/bible-data-japanese-policy.md(H-3b)・docs/morph-rule-engine-design.md(I-2)・
docs/interrogative-relative-morph-rule-design.md(I-3)・docs/morph-rule-engine-implementation-spec.md(J-1)・
docs/alphautos-quality-audit.md(H-6)。

**本文書は計画のみ。コード・擬似コード・JSON・修正案は一切含まない。本 Stage(J-2)でコード・データは
変更しない。**

---

## 現状確認(実装前の事実整理)

計画の前提として、実装対象の現状を確認した(いずれも実 FS で確認・変更なし)。

- **resolve 処理**: `_resolveUnsafe` は base=token.japanese(Data 代表語)を起点に、
  Semantic(idiom→prepDomain→lnGloss)→ Syntax → Morph → Particle → fallback の順で評価し、
  **最初の非 null で確定(短絡)**。Semantic が先に評価されるため Morph を上書きできる(J-1 §3)。
- **各層の責務**: Morph=形態(gender/number/case/person/mood)、Semantic=語義/文脈/談話、
  Syntax=関係詞・前置詞句などの構造、Particle=主格の は/が。αὐτós は現在 Morph が「彼+格助詞」を
  返す(H-6: 彼に src=morph。gender/number は非反映)。
- **generated data の依存**: build:lexicon/ln-gloss/ln-final は **bible_data.japanese を集約**する
  だけで、reading-engine の Morph Rule を実行しない(build-reading-lexicon.cjs の reading-engine 参照は
  コメントのみ)。**Morph Rule の追加は生成データに依存せず、再生成を要さない**(H-2/H-5 の
  bible_data パッチとは性質が異なる)。
- **QA テスト構造**: test:genitive / test:re-phase1〜5 / test:re-stageA/B/D/E。**Morph は Phase 1
  [FROZEN]**(re-phase1-regression.cjs に凍結基準 totalTokens 137,741・morph 43,936・
  zeroFlags[doubleParticle/weirdPassive/brokenImperative])。Morph 変更は FROZEN プロトコル
  (回帰ケース追加 → 悪化 0 確認 → 基準値更新)に従う。

---

## 1. 実装範囲の確定

対象 8 lemma。各 lemma の Data / Morph / Semantic / 対象外を整理する(典拠: I-1 / I-3 / H-6)。

| lemma | Data 代表語 | Morph が担当する変換 | Semantic が担当する領域 | 実装対象外(今回) |
|---|---|---|---|---|
| **αὐτós** | 彼 | 性数語幹: 彼 / 彼ら / 彼女 / 彼女たち / それ / それら | intensive・identity(自身・同じ・まさに) | Semantic 側の intensive 判別 |
| **τίς** | 誰 | 性: M/F→誰・N→何 / 数 | 語用(なぜ / どれ) | 疑問語用の Semantic |
| **ὅς** | 〜する者 | 性: M/F→者・N→もの / 数 | 関係節構文(Syntax) | Syntax 側の関係節処理 |
| **ὅστις** | 〜する者 | 性: M/F→者・N→もの / 数 | 不定関係・関係節構文 | 不定関係の Semantic / Syntax |
| **ὅσος** | 〜するだけ | 性数: 者 / もの | 数量語義・関係節構文 | 数量語義の Semantic |
| **ἐκεῖνος** | あの | 代名詞語幹: あの人 / あれ / 数 | 談話距離・指示対象 | 談話の Semantic |
| **οὗτος** | この | この / これらの・代名詞語幹(これ/これら/この人) | 指示対象・すなわち用法 | 談話の Semantic |
| **τοιοῦτος** | このような | 性数: このような人 / このようなもの | 質・種類の含意(such) | 含意の Semantic |

- 今回の実装範囲は **各 lemma の Morph 担当分(性数による語幹分岐)のみ**。Semantic 委譲分・Syntax
  協働分は別 Stage(本計画の対象外)。
- Data 代表語は変更しない(H-3b)。生成データも変更しない(前述の独立性)。

---

## 2. 実装責務境界の確認

実装は次の境界を保証する設計とする。

| 層 | 保証する責務 | してはならないこと |
|---|---|---|
| **Data** | 代表語(base)の保持のみ | 多義化・削除・文脈訳 |
| **Morph** | gender / number / case / person / mood など**既存形態情報のみ**を用いて語幹決定 | 語義・文脈・談話・先行詞の参照 |
| **Semantic** | 文脈 / 談話 / 強調 / identity / 関係詞解釈 | 形態変化(性数格の語幹・助詞) |
| **Presentation** | 表示加工(括弧・強調・UI)のみ | 語そのものの変更 |

- Morph Rule は **token が既に持つ形態値の範囲に閉じる**(I-2 帰属基準)。範囲外を要する変換は
  Morph に入れず Semantic / Syntax へ回す。
- Semantic は先行短絡で Morph を上書きできる関係を維持(J-1 §3/§5)。Presentation は語を変えない
  (H-6 で αὐτós の Presentation 無罪を確認済み)。

---

## 3. 実装順序(Phase 提案)

影響規模と改善効率の順に段階化する。各 Phase は独立に QA・凍結し、悪化 0 を確認してから次へ進む。

| Phase | 対象 | 規模(実測) | 根拠 |
|---|---|---|---|
| **Phase 1** | αὐτós のみ | 6,954 件 | 最大影響。Morph だけで不適合の約 87.8%(2,266/2,582)を改善可能(H-6) |
| **Phase 2** | τίς | 818 件 | 疑問詞の中核。gender→誰/何 の分岐効果が大きい |
| **Phase 3** | ὅς / ὅστις / ὅσος | 約 2,185 件 | 関係詞群。Morph(者/もの)+ Syntax 協働の切り分けを確認しながら |
| **Phase 4** | ἐκεῖνος / οὗτος / τοιοῦτος | 約 2,340 件 | 指示詞群。談話は Semantic 委譲、Morph は性数語幹に閉じる |

- **Phase 1(αὐτós)を最優先**とする理由: 単一 lemma で最大件数、Morph 単独で最大の改善余地、
  Semantic 委譲分(intensive 4.5%)は今回対象外で切り分けが明快。
- Phase 3 は関係詞のため **Morph 単独では完結せず Syntax 協働が要る**。Phase 3 では「Morph が担う
  性数語幹(者/もの)」の範囲に実装を限定し、関係節構文は触れない(別 Stage)。
- 各 Phase 完了時に凍結マーカーを付し、以後はその Phase の回帰基準を割らない。

---

## 4. 各 Phase の QA 計画

各 Phase で以下をすべて実施する(共通)。

1. **既存テスト維持**: test:genitive / re-phase1〜5 / re-stageA/B/D/E を全 PASS で維持。
   Morph は Phase 1 [FROZEN] のため、**FROZEN プロトコル**(re-phase1 に新規回帰ケースを先に追加し、
   悪化 0 を確認したうえで基準値 morph/totalTokens を更新)に従う。
2. **新規 Morph Rule テスト**: 対象 lemma の gender×number 各組み合わせについて、期待語幹の
   単体回帰を追加(該当 Phase の対象 lemma のみ)。
3. **before / after 差分測定**: NT 全巻で当該 lemma の Reading Japanese を旧/新で機械比較。
   改善件数・不変件数・**悪化件数 0** を実測(サンドボックス不可・実 FS 実測。H-6 教訓)。
4. **Critical Error 再監査**: docs/reading-japanese-quality-v1.md の Quality Scorecard(C 判定・
   uniq14)を再測定し、当該 lemma 由来の C が減少し新規 C が増えていないことを確認。
5. **regression 確認**: chip⇔panel 一致率 100%・破損形 0・性能ゲートを既存 Stage 基準で確認。

補足(Phase 1 固有): αὐτós の intensive/identity(4.5%)は今回 Morph 対象外。Semantic 未整備の間は
Morph 既定語幹(性数による 彼/彼ら/それ)で描画され、**現状の「彼」固定より悪化しない**ことを
差分測定で確認する(改善は anaphoric 32.6%、intensive は不変)。

---

## 5. リリース判定基準

各 Phase のリリース(凍結)は次をすべて満たすとき PASS とする。

| # | PASS 条件 | 測定 |
|---|---|---|
| 1 | **C 判定の減少**(当該 lemma 由来) | Quality Scorecard 再測定 |
| 2 | **Data 責務侵害なし**(代表語 base 不変・生成データ不変) | git 差分・build 差分ゼロ |
| 3 | **Semantic 既存機能の破壊なし**(idiom/prepDomain/lnGloss の出力不変) | re-phase 系・差分測定 |
| 4 | **Presentation 変更なし**(表示整形の出力不変) | re-stageC 相当・chip⇔panel 一致 |
| 5 | **既存 QA ALL PASS**(FROZEN 基準を割らない) | test 一式 |
| 6 | **悪化件数 0**(before/after 差分) | NT 全巻実 FS 実測 |

いずれか 1 つでも未達ならリリースしない(その Phase は保留・是正)。

---

## 6. 実装開始条件(J-3 へ進む Gate)

以下をすべて満たしたとき、J-3(実装)に進む。

- [ ] G1: 本計画(J-2)が凍結されている。
- [ ] G2: Phase 1(αὐτós)の Morph 担当範囲が I-1 で確定し、Semantic 委譲分との境界が曖昧でない。
- [ ] G3: FROZEN プロトコルの手順(re-phase1 への回帰ケース追加 → 悪化 0 → 基準値更新)が合意済み。
- [ ] G4: before/after 差分測定と Quality Scorecard 再測定を**実 FS**で回す QA 手順が用意されている。
- [ ] G5: 生成データ非再生成(Morph Rule と独立)であることが確認済み。
- [ ] G6: リリース判定基準(§5)の 6 条件が測定可能な形で定義されている。

Gate 未達の項目が残る限り J-3 に進まない。Phase 2 以降の Gate は、直前 Phase のリリース PASS を
G1 相当の前提として引き継ぐ。

---

## 計画要約

1. 対象は 8 lemma の **Morph 担当分(性数語幹)のみ**。Semantic/Syntax 委譲分は別 Stage。
2. 責務境界(Data=代表語 / Morph=形態 / Semantic=語義談話 / Presentation=表示)を保証。
3. Phase 1 αὐτós → Phase 2 τίς → Phase 3 関係詞 → Phase 4 指示詞 の順。
4. 各 Phase で既存テスト維持・新規テスト・before/after・Critical 再監査・regression を実施。
5. リリースは C 減少・Data/Semantic/Presentation 不変・既存 QA ALL PASS・悪化 0 の 6 条件。
6. Gate 6 項目を満たしたら J-3 実装へ。

---

## 凍結(候補)

```
[Morph Rule Implementation Plan FROZEN候補 2026-07-19]
Stage J-2 — Morph Rule Engine 実装計画
範囲: 8 lemma の Morph 担当分（性数語幹）のみ。生成データ非再生成（Morph Rule と独立）
順序: Phase1 αὐτós → Phase2 τίς → Phase3 ὅς/ὅστις/ὅσος → Phase4 ἐκεῖνος/οὗτος/τοιοῦτος
QA: 既存テスト維持(Morph=Phase1 FROZEN プロトコル) + 新規回帰 + before/after 悪化0 + Critical再監査 + regression
リリース: C減少 / Data不変 / Semantic不破壊 / Presentation不変 / 既存QA ALL PASS / 悪化0
Gate: G1〜G6 充足で J-3 へ
根拠: I-1 / I-2 / I-3 / J-1 / H-3b / H-6
```

本計画は凍結可能な状態である。承認により FROZEN 化し、Gate 充足後に J-3(実装)へ進む。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-19 | 初版・凍結候補(実装範囲・責務境界・Phase 順序・QA 計画・リリース基準・開始 Gate) |
