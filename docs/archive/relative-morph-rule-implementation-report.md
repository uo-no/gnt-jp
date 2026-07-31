# 関係詞ファミリー Morph Rule 実装報告(Stage J-6b)

実装日: 2026-07-20
位置づけ: 関係詞 3 lemma(ὅς / ὅστις / ὅσος)へ、αὐτós(J-3)・τίς(J-5)と同一の Morph Rule
Registry を適用した 3 例目の実装。設計 docs/relative-morph-rule-design.md(J-6a・FROZEN)に準拠。
**Morph が担当するのは gender による頭語(substantive head)の種別のみ**。関係節・先行詞・格役割・
数量・談話は Syntax / Semantic の責務で本 Stage の対象外。
数値はすべて **クリーン NT 実測**(総 137,741・重複「 2.json」不在)。

---

## 1. 変更ファイル

| ファイル | 種別 | 変更内容 |
|---|---|---|
| public/core/reading-engine.js | 実装 | `_MORPH_STEM_RULES` に **G3739 / G3748 / G3745** を追加(masculine→者・neuter→もの。feminine 未登録=既定維持)。既存ロジックは不変 |
| scripts/re-phase1-regression.cjs | テスト | 関係詞 単体回帰 7 ケース追加。morph 基準 44,114 → **44,251**(+137) |
| scripts/re-phase3-regression.cjs | テスト | particle 基準 3,063 → **3,017**(が −46。〜する者が の解消) |
| scripts/re-stageB-regression.cjs | テスト | changed 39,603→**39,694** / identical 98,138→**98,047**(チップ改善 +91) |

**変更なし(制約遵守)**: bible_data / Semantic(reading-semantic-data.js)/ Syntax / Presentation
(presentation-policy.js)/ generated data(再生成なし)/ lexicon。Engine 構造・pipeline も不変
(Registry に 3 lemma 追加のみ)。重複ファイル再混入 0。αὐτós(G846)・τίς(G5101)の非回帰を確認。

---

## 2. 実装範囲

- 対象 lemma: **ὅς(G3739)/ ὅστις(G3748)/ ὅσος(G3745)**。Data 代表語(〜する者 / 〜するだけ)は維持。
- Morph 責務: **gender による頭語のみ**。
  - **masculine → 者**(ὅς/ὅστις は「〜する者」で不変。ὅσος は「〜するだけ」→「〜する者」)
  - **neuter → もの**(「〜する者」→「〜するもの」/ ὅσος「〜するだけ」→「〜するもの」)
  - **feminine → 変更しない**(Registry 未登録 → `|| base` で既定値のまま・Semantic 責務)
- number による語幹変更は行わない(単複とも同一頭語)。
- 方式: αὐτós/τίς と同一 Registry(strong キー・base=代表語一致で発火・Semantic 優先維持)。
  Engine 構造・pipeline は不変。
- **禁止事項の遵守**: 関係節・先行詞・格役割・case に応じた格助詞・whoever・whatever・how many・
  数量・談話・文脈推論はいずれも実装していない。case 助詞の付与は **Phase 1 の既存挙動**であり、
  本 Rule は頭語の種別選択のみを行う(格助詞ロジックには触れていない)。

---

## 3. 対象件数と Before / After(クリーン NT)

### ὅς(G3739)— total 1,408 / changed 489 / unchanged 919

| gender | 件数 | 変化 |
|---|---|---|
| masculine | 705 | 0(〜する者 維持) |
| feminine | 214 | 0(〜する者 維持・Semantic 責務) |
| **neuter** | 489 | **489 改善**(者→もの) |

| パターン | 件数 |
|---|---|
| neuter 対格 〜する者を → 〜するものを | 272 |
| neuter 主格 〜する者 → 〜するもの | 95 |
| neuter 属格 〜する者の → 〜するものの | 63 |
| neuter 与格 〜する者に → 〜するものに | 59 |

### ὅστις(G3748)— total 139 / changed 5 / unchanged 134

| gender | 件数 | 変化 |
|---|---|---|
| masculine | 86 | 0(維持) |
| feminine | 48 | 0(維持) |
| **neuter** | 5 | **5 改善**(主格 〜する者→〜するもの) |

### ὅσος(G3745)— total 111 / changed 110 / unchanged 1

| gender | 件数 | 変化 |
|---|---|---|
| **masculine** | 40 | **40**(〜するだけ→〜する者) |
| **neuter** | 70 | **70**(〜するだけ→〜するもの) |
| feminine | 1 | 0(維持) |

主パターン: neuter 対格 〜するだけを→〜するものを(58)・masculine 主格 〜するだけ→〜する者(29)・
masculine 対格 〜するだけを→〜する者を(11)・neuter 主格 〜するだけ→〜するもの(8)。

> **注(ὅσος)**: ὅσος は数量関係詞で、代表語「〜するだけ」に数量含意がある。本 Morph Rule は
> gender→頭語(者/もの)のみを行うため、**数量「だけ(as many/how much)」は頭語に置き換わり脱落**する。
> 数量は **Semantic の責務**(§6)であり、Morph は referent の種別(人=者 / 事物=もの)を与えるに留まる。
> Semantic 未整備の間は数量が非表示だが、頭語の種別は正しく反映される。

---

## 4. QA 結果

### 4-1. gender 別確認

| 確認項目 | 結果 |
|---|---|
| **masculine 〜する者 維持**(ὅς/ὅστις) | 705 + 86 = 791 件すべて不変 ✓ |
| **neuter 〜するもの 改善** | ὅς 489 + ὅστις 5 + ὅσος 70 = **564 件** |
| **feminine 変更なし** | ὅς 214 + ὅστις 48 + ὅσος 1 = 263 件すべて不変 ✓ |
| ὅσος masculine(だけ→者) | 40 件(数量は Semantic へ・§3 注) |

### 4-2. 既存 lemma 非回帰

| lemma | 確認 | 結果 |
|---|---|---|
| αὐτός(G846) | 中性対格=それを / 男性複数属格=彼らの | **悪化 0** |
| τίς(G5101) | 中性対格=何を / 男性対格=誰を | **悪化 0** |

### 4-3. 悪化チェック

| 項目 | 結果 |
|---|---|
| masculine(ὅς/ὅστις)悪化 | **0**(維持) |
| feminine 悪化 | **0**(未変更) |
| Semantic 既存処理 悪化 | **0**(re-phase5 ALL PASS・base 一致時のみ発火) |
| 破損形(新) | **0** |
| chip⇔panel 不一致 | **0**(一致率 100%) |
| particle 破損 | **0**(むしろ「〜する者が」46 件を解消。関係詞への が 付与は H-3a が指摘) |

### 4-4. 全回帰(ALL PASS)

| テスト | 結果 |
|---|---|
| re-phase1 | **ALL PASS(99 checks)** morph 44,251 |
| re-phase2 | ALL PASS(47) |
| re-phase3 | **ALL PASS(27)** particle 3,017(が −46) |
| re-phase5 | **ALL PASS(55)** Semantic 不変 |
| re-stageA | ALL PASS(19) |
| re-stageB | **ALL PASS(27)** chip⇔panel 100%・破損形 0 |
| re-stageD | ALL PASS(18) |
| re-stageE | ALL PASS(16) |

FROZEN プロトコル: morph(Phase1)・particle(Phase3)・chip(StageB)基準を悪化 0 確認のうえ更新
(各ファイルに根拠コメント)。test:genitive FAIL=2 は Stage H-5 で確認済みの既存失敗(J-6b と無関係)。

---

## 5. 悪化 0 の確認(総括)

- neuter 564 件を「者→もの」(referent 種別)に改善。masculine(ὅς/ὅστις)791・feminine 263 は非変更。
- αὐτós・τίς の既存 Morph Rule は不変(2+3=5 lemma 併存で相互干渉なし)。
- 破損形 0・chip⇔panel 100%・Semantic 悪化 0。副次的に関係詞への「が」付与 46 件を解消。
- ὅσος の数量脱落は Semantic 責務への委譲であり(§6)、頭語種別は正しく反映(破損なし)。

---

## 6. 未解決(Syntax / Semantic 責務)

本 Stage は Morph(gender→頭語)のみを実装。以下は **Syntax / Semantic の責務**として残る(J-6b 対象外)。

### Syntax 責務

| 領域 | 内容 |
|---|---|
| 関係節 | 「〜する」に相当する従属節の構成(現状は placeholder のまま) |
| 先行詞 | 関係詞が指す先行名詞の同定・連結 |
| 格役割 | 関係詞の case が示す節内役割(主語/目的語)。日本語の語順・助詞での表現 |
| 格助詞の適否 | 関係詞への格助詞付与(者を/ものを)の妥当性は節構造とともに Syntax が決める |

### Semantic 責務

| 用法 | 対象 |
|---|---|
| whoever(誰でも) | ὅστις |
| whatever(何でも) | ὅς(neuter)・ὅσος |
| **数量(as many as / how much / all)** | **ὅσος**(「だけ」の数量含意。本 Rule で頭語化し脱落・Semantic が復元) |
| discourse | 全般(先行詞の既出性・指示対象) |
| feminine の人/物判別 | ὅς・ὅστις(女性名詞が人=者 か事物=もの か) |

- 関係節として自然な日本語を作ることは本 Stage の目的ではなく、将来の **Syntax Rule Engine** が担う。
  本 Rule は「Morph だけで安全に改善できる頭語の種別選択」に限定した。

---

## 7. 結論

- **関係詞 3 lemma の Morph Rule が αὐτós・τίς と同一 Registry 方式で実装成功**。gender で頭語
  (者/もの)を選び、neuter 564 件を「者→もの」に改善。masculine(ὅς/ὅστις)・feminine は悪化 0。
- 既存回帰 8 スイート ALL PASS・chip⇔panel 100%・破損形 0・αὐτós/τίス 悪化 0。関係詞への不自然な
  「が」付与 46 件も解消。
- **case・関係節・先行詞・格役割は Syntax、数量・不定・談話は Semantic** として明確に保留。Morph は
  頭語種別の選択に閉じ、Registry への 3 lemma 追加のみで Engine 構造を変えず拡張(J-2 方針の実証)。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版(ὅς/ὅστις/ὅσος Morph Rule 実装・gender→頭語・neuter 564件改善・QA・未解決 Syntax/Semantic) |
