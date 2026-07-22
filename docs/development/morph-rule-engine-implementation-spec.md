# Morph Rule Engine 実装仕様書(Stage J-1)

策定日: 2026-07-19
位置づけ: 設計(I-1 / I-2 / I-3)を**コード化するための実装仕様書**。実装者がこの一冊で
迷わず着手できることを目的とする。
入力資料: docs/morph-rule-engine-design.md(I-2)・docs/alphautos-morph-rule-design.md(I-1)・
docs/interrogative-relative-morph-rule-design.md(I-3)・docs/bible-data-japanese-policy.md(H-3b)。

**本文書は仕様のみ。コード・擬似コード・実装案・JSON・TypeScript は一切含まない。**
本 Stage(J-1)では実装を行わず、bible_data / Engine / Semantic / Presentation / 生成データも変更しない。

---

## 1. 実装目的

Reading Japanese において、次の責務分離を**保ったまま** Morph Rule を実装できるようにする。

```
Data ─→ Morph ─→ Semantic ─→ Presentation
```

- Data は lemma の安定代表語を提供する(H-3b)。実装ではこれが Morph の**起点(base)**になる。
- Morph は形態情報で Reading Japanese の語幹を決定する。
- Semantic は形態で決まらない語義・談話を判別し、必要時に Morph を上書きする。
- Presentation は表示形式のみ整える(語は変えない)。

この仕様書は、既存 Reading Engine v2 の凍結資産を壊さずに、**Morph 層へ lemma 単位の語幹選択規則を
追加する**ための約束事を定義する。

---

## 2. Engine の責務(明確な区別)

| 層 | 担当する情報 | 担当しないもの |
|---|---|---|
| **Morph** | gender / number / case / person / mood | 語義・文脈・談話・比喩・強調・identity |
| **Semantic** | 語義 / 文脈 / 談話 / 比喩 / 強調 / identity | 形態変化(性数格の語幹・助詞) |
| **Presentation** | 括弧・強調表示・UI 整形 | 語そのものの変更 |

- Morph の入力は **token が既に保持する形態値のみ**。形態値の外(先行詞・文脈・語義)を参照する
  判断は Morph に置かない(I-2 の帰属基準)。
- Semantic の判断結果は語(base)を差し替えうる。Presentation は語を変えず見た目だけを扱う。

---

## 3. Engine Pipeline

現在の Reading Engine の処理は次の順で進み、**最初に結果を返した層で確定する(短絡)**。

```
入力(token = Data 代表語 base + 形態値 + context)
   ↓
Semantic Rule     … idiom → prepDomain → lnGloss（context と semantic データがある時のみ活性）
   ↓（不発時）
Syntax Rule       … 関係詞・前置詞句などの構造反映（context がある時のみ活性）
   ↓（不発時）
Morph Rule        … gender/number/case/person による語幹・助詞決定
   ↓（不発時）
Particle Rule     … 主格の は/が などギャップフィラー
   ↓（不発時）
fallback（結果なし = 代表語をそのまま表示）
   ↓
Reading Japanese
```

### 「Semantic が Morph を上書きできる」仕様

- **Semantic は Morph より前に評価され、成立した時点で確定する(短絡)**。したがって Semantic が
  結果を返した token では Morph は動かない。これが「Semantic が Morph を上書きする」の意味である。
- 逆に **Semantic が不発なら Morph が既定の語幹・助詞を決める**。この二段構えにより、
  αὐτós の intensive/identity(自身・同じ)は Semantic が捕捉し、通常の代名詞用法(彼/彼ら/それ)は
  Morph が担う(I-1)。
- Semantic が語(base)を差し替えた後、その語に対して形態処理が必要な場合は、Semantic 層の内部で
  形態処理を経由してよい(既存 lnGloss がこの形をとる)。**責務の優先関係は Semantic > Morph** で固定。

---

## 4. Morph Rule Registry

- Morph Rule は **lemma 単位で登録する**。ある lemma に対する「形態値 → Reading 語幹」の対応が
  Rule の中身であり、lemma がレジストリの鍵になる。

```
lemma ─→ Morph Rule ─→ Reading Stem
```

- レジストリは **lemma をキーに Rule を引く**構造とし、Morph 層は解決対象 token の lemma で
  該当 Rule を探索する。該当がなければ既存の既定 Morph 処理(格助詞付与等)に委ねる。
- Rule の内容(どの gender/number でどの語幹か)は I-1 / I-3 の Rule Table を典拠とする。実装は
  Rule Table の各行をレジストリ項目として登録すること。**登録は表の転記であり、Engine の分岐追加
  ではない**(I-2 拡張方針)。
- 未登録 lemma・未定義の形態組み合わせでは、**代表語 base をそのまま用いる(現状維持)**。Rule の
  欠落が破損を生まないこと(安全側フォールバック)を必須要件とする。

---

## 5. Rule Priority

優先順位は次で固定する。

```
Data（代表語 base：起点）
   ↓
Morph（形態で語幹・助詞を決定）
   ↓
Semantic（語義・談話で上書き可能）
   ↓
Presentation（語を変えず表示のみ）
```

- **Semantic は Morph を上書きできる**(§3 のとおり、実行上は Semantic が先に評価され短絡する形で
  実装される)。
- **Presentation は語を変更しない**。括弧化・強調などの表示整形のみを行い、Morph/Semantic が決めた
  語を保持する(H-6 で αὐτós の Presentation 無罪を確認済み)。
- Data は常に起点であり削除しない。Morph/Semantic はあくまで**変化分**を担う(H-3b)。

---

## 6. Rule 単位(Rule が返すもの)

1 つの Morph Rule が返す情報を、仕様として次のとおり定義する(実装形式は問わない)。

| 返す情報 | 意味 |
|---|---|
| **語幹(stem)** | 形態で選択された Reading Japanese の語幹(例: 彼 / 彼ら / それ / 者 / もの) |
| **読み** | 語幹の読み情報(必要な lemma のみ。表示・整形で使う想定) |
| **助詞対象(case を適用するか)** | 選択した語幹に既存の格助詞処理を続けてよいか(例: 彼→彼の の「の」を付すか) |
| **Morph 完了フラグ** | Morph でこの token の解決が完了したか、後段(Particle 等)に委ねるか |

- Rule は**語幹の選択に責務を閉じ**、語義判別・表示整形は返さない。
- 「助詞対象」「Morph 完了フラグ」は、既存の格助詞層・Particle 層との接続点を明示するための
  仕様上の区分であり、Rule が形態処理のどこまでを引き受けたかを後段へ伝える役割を持つ。
- 本節は仕様のみ。データ構造・フィールド名・型は実装 Stage で定める。

---

## 7. Rule の追加手順

新しい lemma に Morph Rule を追加するときの標準手順を固定する。

```
① 監査（NT 全巻・lemma 単位・実 FS 実測。件数と gender/number/case 分布）
   ↓
② 責務分類（Morph 担当 / Semantic 担当 / Data 維持 を I-2 帰属基準で判定）
   ↓
③ Rule Table 登録（Data 代表語・Morph 変換・Semantic 委譲を表の 1 行として登録）
   ↓
④ QA（回帰テスト全 PASS・悪化ケース 0・chip⇔panel 一致・表示監査）
```

- **Engine の構造変更は禁止**。追加は Rule Table への登録に閉じ、層構成・責務境界・パイプラインは
  変えない(I-2)。
- ①の監査は実 FS 実測で行う(サンドボックス上の部分データは過少集計を生む。H-6 の教訓)。
- ②で「形態だけで一意に決まらない」と判定された変換は Morph に登録せず Semantic(関係詞は Syntax)へ回す。
- ④で既存の凍結基準(各 Stage 回帰・Quality v1.0 KPI)を割らないことを確認する。

---

## 8. 実装対象一覧(今回)

今回 Morph Rule の対象とするのは次の 7 lemma のみ(I-1 / I-3 で責務確定済み)。

| lemma | Data 代表語 | Morph 担当(形態で決定) | Semantic / Syntax 委譲 |
|---|---|---|---|
| αὐτós | 彼 | 性数語幹: 彼 / 彼ら / 彼女 / それ / それら | intensive・identity(自身・同じ) |
| τίς | 誰 | 性: 誰 / 何・数 | 語用(なぜ / どれ) |
| ὅς | 〜する者 | 性: 者 / もの・数 | 関係節構文(Syntax) |
| ὅστις | 〜する者 | 性: 者 / もの・数 | 不定関係・関係節構文 |
| ὅσος | 〜するだけ | 性数: 者 / もの | 数量語義・関係節構文 |
| ἐκεῖνος | あの | 代名詞語幹: あの人 / あれ・数 | 談話距離・指示対象 |
| οὗτος | この | この / これらの・代名詞語幹 | 指示対象・すなわち |
| τοιοῦτος | このような | 性数: このような人 / もの | 質・種類の含意 |

- この一覧の外の lemma は今回の実装対象に含めない。
- 各 lemma の Morph 担当分・Semantic 委譲分の詳細は I-1(αὐτós)・I-3(残り 6 lemma)を典拠とする。

---

## 9. 将来対象

今後、同じ枠組み(§7 の手順)で追加を検討する候補(今回の対象外)。

- 再帰代名詞: ἑαυτοῦ 系 / σεαυτοῦ 系(person・再帰性の反映)
- 指示代名詞の残り・派生
- 不定代名詞: τις(G5100, indefinite)/ ある の語幹選択
- 相互代名詞: ἀλλήλων(互いに)
- 人称代名詞の number 精緻化(ἐγώ 複数=私たち / σύ 複数=あなたがた)

これらはいずれも監査 → 責務分類 → Rule Table 登録 → QA の同一手順で扱い、**Engine の構造は
変更しない**。今回は候補の提示に留め、実装・責務確定は行わない。

---

## 10. 凍結

```
[Morph Rule Implementation Spec FROZEN 2026-07-19]
Stage J-1 — Morph Rule Engine 実装仕様
責務: Data(代表語=base) → Morph(形態で語幹/助詞) → Semantic(語義/談話・上書き可) → Presentation(表示のみ)
Pipeline: Semantic → Syntax → Morph → Particle → fallback（最初の非nullで確定＝Semanticが先行短絡でMorphを上書き）
Registry: lemma 単位登録・未登録は代表語 base をそのまま（安全側フォールバック）
Rule 単位: 語幹 / 読み / 助詞対象 / Morph 完了フラグ
追加手順: 監査 → 責務分類 → Rule Table 登録 → QA（Engine 構造変更禁止）
対象: αὐτós / τίς / ὅς / ὅστις / ὅσος / ἐκεῖνος / οὗτος / τοιοῦτος
根拠: I-1 / I-2 / I-3 / H-3b
```

以後、Morph Rule の実装は本仕様書に照らして行う。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-19 | 初版・凍結(実装目的・責務・Pipeline・Registry・Priority・Rule 単位・追加手順・対象一覧・将来対象) |
