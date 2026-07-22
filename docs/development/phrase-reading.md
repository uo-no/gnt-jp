# Phrase Reading 設計正典（v1.1 意味層）

作成: 2026-07-11
位置づけ: reading-policy.md §11「v1.1 方針 2. Phrase Reading の意味層」の設計書。
scope / priority / 現象グループの定義源は従来どおり `assets/data/reading-policy.json`
であり、本書はそれに一切関与しない。本書が定めるのは
**「phrase scope と判定された現象を、どのような文章として読者に渡すか」** だけである。

---

## Phase A — 設計原則

### 目的（最上位原則）

> **Phrase Reading は、句の意味を決めるのではなく、
> その句をどう読めば本文の流れが理解しやすくなるかを案内する。**

以後のすべての設計判断（Reading Intent の選定・文章の候補・品質監査）は
この一文に照らして行う。迷ったときは常にこの原則に戻る。

### やらないこと（禁止事項）

Phrase Reading は次の五つを**行わない**。

| # | 禁止 | 意味 |
|---|---|---|
| 1 | **神学を教えない** | 教理的な含意・神学的評価を文章に持ち込まない |
| 2 | **解釈を決めない** | 複数の読みがありうる箇所で一つの解釈を確定しない |
| 3 | **Wallace を教えない** | Wallace の分類名・要約・参照を読者に見せない |
| 4 | **文法用語を教えない** | 「属格絶対」「迂言法」等の用語を画面に出さない |
| 5 | **翻訳を作らない** | 句の訳文・言い換えを新たに生成しない |

### やること

代わりに、次の四つ**だけ**を伝える。

| # | 伝えるもの | 例 |
|---|---|---|
| 1 | **このまとまりの役割** | 背景・理由・目的・結果・対比 … |
| 2 | **本文の流れ** | このまとまりが前後とどうつながるか |
| 3 | **読み方** | どの順で・何を意識して読むと流れがつかめるか |
| 4 | **注意点** | 予想と逆の展開になる、比べながら読む、など |

### 既存レイヤーとの関係

- **構造層（実装済み・Phase 25B-2）**: 「どこまでが一まとまりか」を引用で示す。
  本書の対象外（変更しない）。
- **意味層（本書が設計）**: そのまとまりを**どう読むか**を案内する。
  reading-policy.md §9 の phrase × critical/high/normal が対象。
- 静寂原則は両層共通: 言うことがない句では何も出さない。フォールバック文の禁止。

---

## Phase B — Reading Guidance の型（Reading Intent）

### 生成の型

従来の生成は **現象 → 文章** だった（例: 属格絶対 → 「〜です」）。
これを次の三段に改める。

```
現象（phenomenon）
   ↓
読解意図（Reading Intent）＝ 読ませたい読み方
   ↓
文章
```

**文章は現象からではなく Intent から生成する。**
現象は「どの Intent か」を決めるためだけに使い、
文章テーブルのキーには現れない。これにより:

- 同じ読み方を与える現象群（理由分詞と理由不定詞など）は自動的に同じ品質の文章になる
- 新しい現象の追加は「Intent を1つ割り当てる」だけで完了する（文章の新規執筆が不要）

例:

```
genitive_absolute（属格絶対）
   ↓
background（背景を先に読む）
   ↓
「このまとまりは、背景となる状況を先に示しています。」
```

### Reading Intent の規則

1. **各現象はちょうど1つの Intent を持つ**（0個・複数は禁止）
2. Intent は**読者に与える読み方**であり、文法分類・意味分類ではない
3. Intent キーは内部専用。画面には一切出さない（Phase A 禁止事項 4 と同根）
4. Intent の新設は「既存のどの Intent でも読み方が案内できない」場合のみ許す

### Reading Intent 一覧

| Intent | 読者へ与えるもの |
|---|---|
| `background` | 背景として読む |
| `reason` | 理由として読む |
| `purpose` | 目的として読む |
| `result` | 結果として読む |
| `condition` | 条件として読む |
| `concession` | 逆接を意識する |
| `comparison` | 比べながら読む |
| `contrast` | 対比する |
| `explanation` | 中身を読む |
| `identification` | 同一人物・同一物を見る |
| `progression` | 話の展開を見る |
| `single_action` | 一つの動きとして読む |

### 機械可読の置き場（SSOT の維持）

- **現象 → Intent の対応**: `reading-policy.json` の phenomena 各項に
  `intent` フィールドとして持つ（scope / priority と同じ場所・同じ運用ルール）
- **Intent → 文章の対応**: 従来の文テーブルと同じくコード側
  （Phrase Reading Engine）が持つ。キーは現象名ではなく Intent
- 両対応表とも本書 Phase C / Phase D の表を人向け正典とし、食い違う場合は JSON が正

---

## Phase C — phrase 現象の棚卸しと Intent 割当

対象: reading-policy.json の phrase scope 全 55 現象（2026-07-11 時点の実測）。
内訳は high 12 / normal 25 / low 3 / hidden 15。
**Intent を持つのは表示対象（critical/high/normal）の 37 現象のみ。**
low / hidden は自然文を生成しないため Intent を割り当てない（静寂原則）。

### high（12現象）

| 現象 | 通称 | Intent |
|---|---|---|
| genitive_absolute | 属格絶対 | `background` |
| participle.adverbial_causal | 理由分詞 | `reason` |
| participle.adverbial_concessive | 譲歩分詞 | `concession` |
| participle.adverbial_conditional | 条件分詞 | `condition` |
| participle.adverbial_purpose_result | 目的・結果分詞 | `purpose` |
| participle.periphrastic | 迂言法 | `single_action` |
| infinitive.purpose | 目的不定詞 | `purpose` |
| infinitive.result | 結果不定詞 | `result` |
| infinitive.cause | 理由不定詞 | `reason` |
| genitive.subjective | 主語的属格 | `explanation` |
| genitive.objective | 目的語的属格 | `explanation` |
| genitive.attributed | 逆修飾属格 | `explanation` |

**設計判断（属格の意味下位分類の統合）**: 主語的・目的語的・逆修飾などの属格
下位分類は Wallace 上の解釈判断そのものであり、これを文章で区別することは
Phase A 禁止事項 2（解釈を決めない）に抵触する。よって属格の意味下位分類は
すべて同一 Intent（`explanation` または `identification`）へ統合し、
「この『〜の』が中心の語を説明している」という**読み方**だけを案内する。

### normal（25現象）

| 現象 | Intent | 割当理由 |
|---|---|---|
| participle.adverbial_temporal | `background` | 時の状況を背景として先に読む |
| participle.adverbial_manner | `background` | 様子＝付随する状況として読む |
| participle.adverbial_means | `single_action` | 主動詞と一つの動きとして読む |
| participle.attributive | `explanation` | 前の名詞を説明する |
| participle.indirect_discourse | `explanation` | 見聞きした中身を読む |
| participle.substantival | `identification` | 動きのかたちで人・ものを指す |
| infinitive.time | `background` | 時の枠を先に読む |
| infinitive.epexegetical | `explanation` | 直前の語の中身を読む |
| infinitive.indirect_discourse | `explanation` | language の中身を読む |
| infinitive.means | `single_action` | 主動詞と一つの動きとして読む |
| genitive.partitive | `explanation` | 全体とのつながりを見る |
| genitive.descriptive | `explanation` | 性質の説明として読む |
| genitive.content | `explanation` | 中身の説明として読む |
| genitive.material | `explanation` | 材料の説明として読む |
| genitive.means | `explanation` | 手段の説明として読む |
| genitive.agency | `explanation` | 行為者の説明として読む |
| genitive.plenary | `explanation` | 説明として読む（両義を確定しない） |
| genitive.source | `explanation` | 出どころの説明として読む |
| genitive.attributive | `explanation` | 形容の説明として読む |
| genitive.epexegetical | `identification` | 「すなわち」で同一物を見る |
| genitive.relationship | `identification` | 人のつながり（〜の子・妻）を見る |
| preposition.attributive_pp | `explanation` | 前の名詞を説明する |
| preposition.substantival_pp | `identification` | 前置詞句が人・ものを指す |
| nominal_syntax.appositional_np | `identification` | 言い換えで同一人物・物を見る |
| nominal_syntax.substantival_phrase | `identification` | 句全体が一つの名詞のはたらき |

### Intent 使用状況の集計

| Intent | 現象数 | 備考 |
|---|---|---|
| `explanation` | 17 | 属格下位分類の統合先 |
| `identification` | 6 | |
| `background` | 4 | |
| `single_action` | 3 | |
| `purpose` | 2 | |
| `reason` | 2 | |
| `result` / `condition` / `concession` | 各1 | |
| `comparison` / `contrast` / `progression` | 0 | **予約**（phrase scope では現状該当なし。verse/word scope や将来の検出型のために保持） |

### 対象外（Intent なし）

- **low（3）**: genitive.possessive / infinitive.articular / participle.adverbial_attendant
  — 形態グリッド等の非文章UIが担当
- **hidden（15）**: nominal_syntax の NP 構造群（simple_np 等 10）・
  preposition.proper_with_*（5）— 構造層の引用生成の内部情報のみ

---

## Phase D — Intent ごとの文章テーブル

文章は**現象ではなく Intent から生成する**（Phase B の型）。
1文目＝役割、2文目＝読むコツ（Phase E の二段構成）。
すべて Phase F の品質基準（一文40字以内・解釈禁止・文法用語禁止・語彙統一）を満たす。

| Intent | 1文目（役割） | 2文目（読むコツ） |
|---|---|---|
| `background` | このまとまりは、背景となる状況を先に示しています。 | ここを読んでから本文へ進むと、流れがつかみやすくなります。 |
| `reason` | このまとまりは、その理由を添えています。 | 前の内容と結び付けながら読むと理解しやすくなります。 |
| `purpose` | このまとまりは、何のためなのかを示しています。 | 動きの向かう先を意識して読むと流れがつながります。 |
| `result` | このまとまりは、その結果どうなるかを示しています。 | 前の内容の流れを受けて読むとつながりが見えます。 |
| `condition` | このまとまりは、「もし〜なら」の条件を示しています。 | この条件を頭に置いて本文を読むと流れがつかめます。 |
| `concession` | このまとまりは、予想とは逆の展開になることを知らせています。 | 「それでも」と心に置いて読むと流れが見えてきます。 |
| `comparison` | このまとまりは、何かと比べる形になっています。 | 比べながら読むと意味が見えやすくなります。 |
| `contrast` | このまとまりは、前の内容との対比を示しています。 | 違いを並べて読むと流れがはっきりします。 |
| `explanation` | このまとまりは、中心の語の中身や性質を説明しています。 | どの語を説明しているかを意識すると読みやすくなります。 |
| `identification` | このまとまりは、だれのこと・何のことかを指しています。 | 同じ人やものを思い浮かべながら読むとつながりが見えます。 |
| `progression` | このまとまりは、話が次へ進む合図になっています。 | 展開の変わり目として読むと流れが追いやすくなります。 |
| `single_action` | このまとまりは、全体で一つの動きを表しています。 | 分けずにひとまとめで読むと意味が入りやすくなります。 |

- 予約 Intent（comparison / contrast / progression）にも文章を先に用意する。
  将来 phrase scope の現象が割り当てられた時点で自動的に表示に入る（執筆不要）。
- 文章の変更は本表＝正典で行い、コード側の文テーブルを追随させる。

---

## Phase E — 二段階表示

### 構成

Phrase Reading の意味層は**最大2文**。

1. **1文目 = 役割**（必須） — このまとまりが何をしているか
2. **2文目 = 読むコツ**（任意） — どう読むと本文の流れがつかめるか

### 表示規則

1. **1句1現象**: 同じまとまりに複数の phrase 現象が出た場合、
   priority（critical > high > normal）→ confidence の順で**1現象のみ**表示する
2. **ブロック予算**: 既存の構造層（引用文・最大2文）と合わせて
   Phrase Reading ブロック全体で**最大3文**。意味層が出る場合、
   構造層は第1文（まとまりの引用文）のみ残す
3. **静寂条件**（既存に追加）: 対象語の判定が min_confidence（0.40）未満 /
   phrase scope の現象に該当しない / Intent 未割当（low・hidden）→ 意味層は沈黙し、
   既存表示のまま
4. 2文目は常に表示してよい（Intent 文テーブルに定義がある限り）。
   将来、表示密度を下げたい場合は「high のみ2文・normal は1文」の規則を
   本節に追記して切り替える（コードに priority を書かない）

---

## Phase F — 品質基準（監査基準）

Phrase Reading の意味層の文章は、以下を**すべて**満たす。
Phase H の全巻監査もこの基準で機械照合する。

| # | 基準 | YES の例 | NO の例 |
|---|---|---|---|
| ① | **解釈禁止** | 理由を添えています。 | 神が○○した理由です。 |
| ② | **文法用語禁止** | 一つのまとまりです。 | 属格絶対です。 |
| ③ | **本文へ戻す** | 前の内容と結び付けながら読むと… | これは○○構文です。 |
| ④ | **一文40文字以内** | （従来基準と同じ） | |
| ⑤ | **語彙統一** | 背景・理由・目的・結果・対比・比較・条件・まとまり | 同義語のゆらぎ（状況説明/わけ/ねらい 等） |

### 機械監査用の禁止語リスト（②の照合語）

属格・与格・対格・主格・分詞・不定詞・迂言・絶対・同格・修飾・叙述・
限定・構文・時制・相・態・法・接続法・希求法・命令法・Wallace・
アオリスト・現在形・完了形・未完了

### 固定語彙（⑤）

- まとまりの呼称: **「このまとまり」**（「句」「フレーズ」は使わない）
- 役割語: **背景 / 理由 / 目的 / 結果 / 条件 / 対比 / 比較**
- 読者への効果: **「流れがつかみやすくなります」「理解しやすくなります」** 系に統一

---

## Phase G — 実装（2026-07-11）

変更したのは **Phrase Reading Engine（表示層）とポリシーデータだけ**。
SyntaxAnalyzer / PhraseAnalyzer / ClauseAnalyzer / Registry /
ReadingSupportProjection は一切変更していない。

### 変更ファイル

1. **assets/data/reading-policy.json**
   - phrase scope の表示対象 37 現象に `intent` フィールドを追加
   - トップレベルに `intents`（12種の語彙）と `intent_note` を追加
2. **index.html（`__PHRASE_READING_BEGIN__` ブロック内のみ）**
   - `_PHRASE_INTENT_TEXT`: Intent → [役割文, 読むコツ文] の文テーブル
     （キーは Intent のみ。現象名・scope・priority はコードに書かない）
   - `_phraseIntentLines(proj, idx)`: 対象語の categories から
     phrase scope × 表示 priority × confidence ≥ 0.40 × intent 定義済み
     の現象を探し、priority → confidence で 1 現象だけ選ぶ（1句1現象）
   - `_buildPhraseReadingHTML`: 意味層が成立した場合、
     構造層第1文＋意味層2文（計3文）。不成立なら従来表示のまま

### 実装上の設計判断

- ~~意味層は構造層の引用文が成立した時のみ表示する~~
  → Phase H の監査で高価値現象の大量沈黙が判明し、**v1.2 対象語引用型**で解消
  （下記 v1.2 節）。構造層が成立する語では従来どおり構造層第1文＋意味層2文。
- priority の優先順は `display_rules.phrase_reading.priorities` の
  **配列の並び順**から読む（コードに priority 名を書かない）。
- 意味層の内部例外は握りつぶして構造層のみ表示（Failure Mode = 意味層が無い）。

### 検証（実物ソース抽出による論理テスト 13件・全PASS）

属格絶対→background / 理由分詞→reason / 迂言法→single_action /
low・hidden・低confidence・word scope・未定義ID→沈黙 /
high×normal 競合→high / 同priority競合→confidence / 全24文が40字以内

---

## Phase H — NT全巻監査（2026-07-11 実測）

監査スクリプト: `scripts/phrase-intent-audit.cjs`（表示ロジックは index.html の
実物ソースをマーカー区間から抽出して実行 — 監査用の再実装なし）。
詳細: `scripts/output/phrase-intent-audit.{md,json}`。

### 表示率（NT 7,939節・137,741トークン）

| 指標 | 実測 |
|---|---|
| 構造層ブロック表示 | 55,483 トークン（40.28%） |
| **意味層（3文）表示** | **4,605 トークン（3.34%）** |
| 意味層が出る節 | 3,190 / 7,939（40.18%） |

表示 Intent 分布: identification 3,096 / explanation 1,328 /
background 157 / single_action 24。

### 品質監査（Phase F 基準・すべて合格）

| 監査 | 結果 |
|---|---|
| ブロック内の同一文重複 | **0 件** |
| 文法用語漏洩（引用外） | **0 種** |
| Passage Note と同一文 | **0 件** |
| Observation と同一文 | **0 件** |
| パイプライン例外 | **0 件** |

### 発見: 構造層ゲートによる高価値現象の沈黙（v1.2 課題）

意味層候補があるのに構造層の引用が成立せず沈黙したトークンが **5,641 件**。
その内訳に v1.1 の本来の狙いだった high 現象が集中している:

| 現象 | 表示 | 沈黙 |
|---|---|---|
| 属格絶対 | 147 | 600（80%が沈黙） |
| 迂言法 | 24 | 480 |
| 目的不定詞 | 0 | 151 |
| 結果不定詞 | 0 | 68 |
| 理由分詞ほか reason 系 | 0 | 50 |
| 条件分詞 | 0 | 19 |
| 譲歩分詞 | 0 | 7 |

原因: 構造層の検出（ContextBuilder の NP / PP / PtcP）は名詞句系に強く、
**不定詞句・無冠詞の副詞的分詞句を「まとまり」として検出しない**ため、
「意味層は構造層の引用成立時のみ」というゲート（Phase G の設計判断）が
これらを塞いでいる。現在表示されている意味層の97%は identification /
explanation（名詞句系）である。

### v1.2 候補（当日判断: 候補1 を採用）

1. **対象語引用型**: 構造層が沈黙しても、対象語を引用して意味層を出す ← **採用**
2. 構造層の検出拡張（Projection / ContextBuilder の変更が必要 — 見送り）
3. 現状維持（見送り）

## v1.2 — 対象語引用型（2026-07-11 実装）

構造層（NP/PP/PtcP）の引用が成立しない語でも、意味層候補があれば
対象語を引用して案内する。実装は index.html の
`_phraseIntentStandaloneHTML` のみ（Analyzer / Projection 無変更）。

- **文言は文テーブル（Phase D 正典）から変えない。** 1文目冒頭の
  「このまとまりは、」を「「◯◯」のまとまりは、」に置き換えるだけの機械変換
  （◯◯は対象語の日本語グロス）
- 例（マタイ 8:1 属格絶対）:
  「下る」のまとまりは、背景となる状況を先に示しています。／
  ここを読んでから本文へ進むと、流れがつかみやすくなります。

### v1.2 再監査（NT全巻・実測）

| 指標 | v1.1 | v1.2 |
|---|---|---|
| 意味層表示トークン | 4,605（3.34%） | **10,246（7.44%）** |
| 意味層が出る節 | 3,190（40.2%） | **5,342（67.3%）** |
| 属格絶対の表示 | 147 | **747**（沈黙0） |
| 迂言法 | 24 | **504** |
| 目的不定詞 / 結果不定詞 | 0 / 0 | **157 / 68** |
| reason / condition / concession | 0 | **50 / 19 / 7** |
| 構造層沈黙による非表示 | 5,641 | **0** |

品質監査は v1.1 と同じく全項目合格（ブロック内重複 0・文法用語漏洩 0・
Passage Note 重複 0・Observation 重複 0・例外 0）。
これで Intent 12種中 9種が実表示に入った（comparison / contrast /
progression は予約のまま — phrase scope に該当現象が来た時点で自動表示）。

## 改訂履歴

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-11 | Phase A: 目的・禁止事項・伝達事項を確立 |
| 2026-07-11 | Phase B: 現象→Intent→文章 の生成型と Intent 12種を確立 |
| 2026-07-11 | Phase C: phrase 55現象を棚卸し、表示対象37現象へ Intent 割当 |
| 2026-07-11 | Phase D: Intent 12種の文章テーブル（役割＋読むコツ）確定 |
| 2026-07-11 | Phase E: 二段階表示（最大2文・1句1現象・ブロック予算3文）確定 |
| 2026-07-11 | Phase F: 品質基準5項目と機械監査用禁止語リスト確定 |
| 2026-07-11 | Phase G: 実装（reading-policy.json intent / index.html 意味層） |
| 2026-07-11 | Phase H: NT全巻監査（品質全合格・構造層ゲート課題を発見） |
| 2026-07-11 | v1.2: 対象語引用型を実装。高価値現象の沈黙 5,641 件を解消 |
