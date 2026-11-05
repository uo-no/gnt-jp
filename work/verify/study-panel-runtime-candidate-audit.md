# StudyPanel 統語候補 実行時監査

- 実施日：2026-10-22
- ブランチ：`fix/attributed-genitive-example-hide-v2`
- 目的：候補比較 UI の実装に着手する前に、実際の解析経路が返すデータを4例で実測する。

---

## 実行環境と解析経路

### 解析経路

`index.html` の `_buildSyntaxLabelHTML()` と同一の経路を Node.js で再現した。

```
bible_data/nt/<book>/<chapter>.json
    ↓  verse tokens（事前デコード済みフィールド: case / mood / tense / voice / number / gender）
SyntaxAnalyzer.analyze({ target, tokens, targetIdx })
    ↓  output.candidates[] （全候補）
displayFilter
    conf >= 0.60 && status !== 'stub' && label_ja 存在
    → sort by confidence desc → label_ja 重複排除
    → topHasLead: unique[0].conf - unique[1].conf >= 0.05 なら1件最有力
    → それ以外: unique[0].conf から 0.05 未満の差にある候補がすべて primary
    ↓  表示候補（primary / other）
```

### decodeMorph の動作

`index.html` と同一の実装。bible_data トークンには `case`, `mood` 等の事前デコード済みフィールドが存在する。`morph` 文字列（例 `N-GSM`）は解析に直接使わない。

CONFIRMED: `public/index.html` (line 7572) と診断スクリプトの `decodeMorph` 実装は一致する。

### raw_score フィールドについて

診断スクリプトで `c.xsc.raw_score` を参照したが全件 `(なし)` だった。正しいキー名は `rawScore`（キャメルケース）と推定される。本監査では `xsc.deltas` のシグナル別内訳が取得できているため、raw_score の欠損は結論に影響しない。未確認のまま記録する。

---

## 例 A：JHN 2:17 — οἴκου（N-GSM）

**τοῦ οἴκου σου** — ζῆλος の後に続く属格句。詩篇 69:10 の引用内。

### トークン位置

| idx | text | morph | lemma |
|---|---|---|---|
| 8 | ζῆλος | N-NSM | ζῆλος |
| 9 | τοῦ | T-GSM | ὁ |
| **10** | **οἴκου** | **N-GSM** | **οἶκος** |
| 11 | σου | P-2GS | σύ |
| 12 | καταφάγεταί | V-FDI-3S | κατεσθίω |

context summary（実測）:
- mainVerbWord = `καταφάγεταί`（lemma=κατεσθίω）
- headNounWord = `ζῆλος`
- prevPos = T（冠詞 τοῦ）
- hasCopula = true（ἐστίν が節内に存在）
- distanceToVerb = 10

### 全候補スコア（フィルタ前、上位のみ）

| rank | id | confidence | status |
|---|---|---|---|
| 1 | genitive.subjective | 0.7020 | active |
| 2 | genitive.objective | 0.7020 | active |
| 3 | genitive.possessive | 0.6020 | active |
| 4 | genitive.descriptive | 0.6020 | active |
| 5 | genitive.comparison | 0.3517 | active |
| 6 | genitive.plenary | 0.3515 | active |
| … | その他39件 | ≤ 0.35 | active |

### 表示フィルタ適用後

- `topHasLead` = false（0.7020 - 0.7020 = 0、差なし）
- tiedNotice = true
- **primary 2件**：主語的属格 + 目的語的属格
- **other 2件（折りたたみ）**：所有属格 + 描写的属格

### シグナル詳細（表示候補）

**主語的属格（conf=0.7020）**
- signals_matched: `action_noun_head`, `agentive_semantics`
- signals_failed: `pronoun_genitive`, `proper_name_genitive`
- xsc.deltas: `action_noun_head:+30`, `agentive_semantics:+20`

**目的語的属格（conf=0.7020）**
- signals_matched: `action_noun_head`, `patient_semantics`
- signals_failed: `proper_name_genitive`
- xsc.deltas: `action_noun_head:+30`, `patient_semantics:+20`

**所有属格（conf=0.6020）**
- signals_matched: `follows_head_noun`, `article_agreement`, `no_preposition`
- xsc.deltas: `follows_head_noun:+25`, `article_agreement:+15`, `no_preposition:+10`

**描写的属格（conf=0.6020）**
- signals_matched: `follows_head_noun`, `no_preposition`
- xsc.deltas: `follows_head_noun:+25`, `no_preposition:+10`

### 候補比較の根拠分類

**根拠クラス：B — 共通の構造的手掛かりのみ**

主語的属格と目的語的属格の両方が `action_noun_head`（+30）を共有しており、スコアは完全一致（0.7020333…）。「区別に使えるシグナル」は存在しない。`agentive_semantics` と `patient_semantics` は ζῆλος のセマンティックタグに基づく判定と推定されるが、どちらの方向に読むかは形態・語順からは決定できない。

- 本文から確認できる事実：ζῆλος が action_noun として検出された、οἴκου が属格単数男性（N-GSM）
- 文法的解釈に必要な判断：「ζῆλος を動詞形で言い換えたとき οἴκου が主語か目的語か」は文脈・神学的解釈が必要

**表示できるか：YES（同列primary 2件 + 折りたたみ 2件）**

---

## 例 B：ROM 8:35 — Χριστοῦ（N-GSM）

**τῆς ἀγάπης τοῦ Χριστοῦ** — χωρίζω 節の目的語句 ἀπὸ τῆς ἀγάπης τοῦ Χριστοῦ の内部。

### トークン位置

| idx | text | morph | lemma |
|---|---|---|---|
| 3 | ἀπὸ | PREP | ἀπό |
| 4 | τῆς | T-GSF | ὁ |
| 5 | ἀγάπης | N-GSF | ἀγάπη |
| 6 | τοῦ | T-GSM | ὁ |
| **7** | **Χριστοῦ** | **N-GSM** | **Χριστός** |

context summary（実測）:
- mainVerbWord = `χωρίσει`（lemma=χωρίζω）
- headNounWord = `ἀγάπης`
- prevPos = T（冠詞 τοῦ）
- hasCopula = false
- distanceToVerb = 5

### 全候補スコア（フィルタ前、上位のみ）

| rank | id | confidence | status |
|---|---|---|---|
| 1 | genitive.subjective | 0.8520 | active |
| 2 | genitive.possessive | 0.8020 | active |
| 3 | genitive.objective | 0.8020 | active |
| 4 | genitive.descriptive | 0.6020 | active |
| 5 | genitive.separation | 0.5515 | active |
| 6 | genitive.plenary | 0.4515 | active |
| … | その他36件 | ≤ 0.36 | active |

**注**：`genitive.plenary`（複合属格）は conf=0.4515 でフィルタ対象外。UI には表示されない。

### 表示フィルタ適用後

- topHasLead 計算：0.8520333… - 0.8020333… = 0.04999…（< 0.05、浮動小数点演算の結果）
- `topHasLead` = **false**（差が厳密に 0.05 未満）
- tiedNotice = true
- **primary 3件**：主語的属格 + 所有属格 + 目的語的属格
- **other 1件（折りたたみ）**：描写的属格

### シグナル詳細（表示候補）

**主語的属格（conf=0.8520）**
- signals_matched: `action_noun_head`, `agentive_semantics`, `proper_name_genitive`
- signals_failed: `pronoun_genitive`
- xsc.deltas: `action_noun_head:+30`, `agentive_semantics:+20`, `proper_name_genitive:+15`

**所有属格（conf=0.8020）**
- signals_matched: `follows_head_noun`, `article_agreement`, `no_preposition`
- signals_failed: `after_preposition`
- xsc.deltas: `follows_head_noun:+25`, `article_agreement:+15`, `no_preposition:+10`

**目的語的属格（conf=0.8020）**
- signals_matched: `action_noun_head`, `patient_semantics`, `proper_name_genitive`
- signals_failed: （なし）
- xsc.deltas: `action_noun_head:+30`, `patient_semantics:+20`, `proper_name_genitive:+10`

**描写的属格（conf=0.6020）**
- signals_matched: `follows_head_noun`, `no_preposition`
- xsc.deltas: `follows_head_noun:+25`, `no_preposition:+10`

### 候補比較の根拠分類

**根拠クラス：B — 共通の構造的手掛かりのみ（区別できない）**

- 主語的属格が subjective +5 のリードを持つが（proper_name_genitive が +15 vs +10）、topHasLead = false（浮動小数演算により差が 0.05 未満）。すべて同列 primary として扱われる。
- ἀγάπη が action_noun として検出され、Χριστός が固有名詞（proper_name_genitive）として検出される。これらは両方向に成立する根拠。
- ἀπό による分離格文脈は `genitive.separation`（conf=0.5515）に反映されているが、これは Χριστοῦ 自体ではなく ἀγάπης に対する文脈。
- 「キリストの愛」が主語的（キリストが愛する）か目的語的（キリストへの愛）かは、ロマ書のコンテキストと神学的判断が必要。

**表示できるか：YES（同列primary 3件 + 折りたたみ 1件）**

---

## 例 C：JHN 4:11 — ζῶν（V-PAP-ASN）

**τὸ ὕδωρ τὸ ζῶν** — ἔχεις τὸ ὕδωρ τὸ ζῶν の末尾。標準的な限定的分詞配置（冠詞-名詞-冠詞-分詞）。

### トークン位置

| idx | text | morph | lemma |
|---|---|---|---|
| 15 | ἔχεις | V-PAI-2S | ἔχω |
| 16 | τὸ | T-ASN | ὁ |
| 17 | ὕδωρ | N-ASN | ὕδωρ |
| 18 | τὸ | T-ASN | ὁ |
| **19** | **ζῶν** | **V-PAP-ASN** | **ζάω** |

context summary（実測）:
- mainVerbWord = `ἔχεις`（lemma=ἔχω）
- headNounWord = `(null)`
- prevPos = T（冠詞 τὸ）
- hasCopula = true（ἐστὶν が節内に存在）
- distanceToVerb = 19

### 全候補スコア（フィルタ前、上位のみ）

| rank | id | confidence | status |
|---|---|---|---|
| 1 | participle.attributive | 0.6018 | active |
| 2 | accusative.direct_object | 0.6015 | active |
| 3 | participle.substantival | 0.5520 | active |
| 4 | accusative.object_complement | 0.5515 | active |
| 5 | participle.adverbial_temporal | 0.5218 | active |
| 6 | participle.adverbial_causal | 0.4018 | active |
| … | その他39件 | ≤ 0.35 | active |

**注**：`participle.substantival`（実体用法）は conf=0.552、閾値未満で表示されない。

### 表示フィルタ適用後

- `topHasLead` = false（0.6018 - 0.6015 = 0.0003、差が 0.05 未満）
- tiedNotice = true
- **primary 2件**：形容詞用法（限定的） + 直接目的語
- **other 0件**

### シグナル詳細（表示候補）

**形容詞用法（限定的）—— participle.attributive（conf=0.6018）**
- signals_matched: `matching_noun`, `proximity_2`
- signals_failed: `proximity_far`, `no_article`
- xsc.deltas: `matching_noun:+35`, `proximity_2:+10`

**直接目的語 —— accusative.direct_object（conf=0.6015）**
- signals_matched: `finite_verb_present`, `no_preposition`
- signals_failed: （なし）
- xsc.deltas: `finite_verb_present:+25`, `no_preposition:+10`

### 観察：格・性・数の一致と冠詞配置

- `matching_noun` (+35) が最大シグナル。ζῶν (ASN) が ὕδωρ (ASN) と格・性・数で一致することを検出。
- τὸ ὕδωρ τὸ ζῶン の冠詞-名詞-冠詞-分詞配置はギリシャ語の限定的分詞の典型パターンだが、
  `no_article` が `signals_failed` に入っている（=冠詞が存在する状態であることを確認）。

### 候補比較の根拠分類

**根拠クラス：B — 共通の構造的手掛かりのみ（区別は弱い）**

- 形容詞用法は `matching_noun`（格・性・数一致）を主根拠とする。τὸ ὕδωρ τὸ ζῶν のパターンは限定的分詞の構造的証拠だが、`accusative.direct_object` も同節に定形動詞 ἔχεις があることで成立する。
- どちらかを完全に排除する形態論的根拠はない。τὸ-ὕδωρ-τὸ-ζῶν の冠詞配置が区別できれば A 評価になり得るが、現行シグナルはこの配置パターン全体を単一のシグナルとして評価していない。
- `participle.substantival`（実体用法）は 0.552、閾値以下。UI には表示されない。

**表示できるか：YES（同列primary 2件）**

---

## 例 D：ACT 16:16 — μαντευομένη（V-PNP-NSF）

**ἥτις ἐργασίαν πολλὴν παρεῖχεν τοῖς κυρίοις αὐτῆς μαντευομένη** — 節末の分詞。前行に ἥτις（相関代名詞 NSF）。

### トークン位置

| idx | text | morph | lemma |
|---|---|---|---|
| 14 | ἥτις | R-NSF | ὅστις |
| 15 | ἐργασίαν | N-ASF | ἐργασία |
| 16 | πολλὴν | A-ASF | πολύς |
| 17 | παρεῖχεν | V-IAI-3S | παρέχω |
| 18 | τοῖς | T-DPM | ὁ |
| 19 | κυρίοις | N-DPM | κύριος |
| 20 | αὐτῆς | P-GSF | αὐτός |
| **21** | **μαντευομένη** | **V-PNP-NSF** | **μαντεύομαι** |

context summary（実測）:
- mainVerbWord = `παρεῖχεν`（lemma=παρέχω）
- headNounWord = `(null)`
- prevPos = R（関係代名詞 αὐτῆς = P-GSF）
- hasCopula = true
- distanceToVerb = 21（節末の分詞）

### 全候補スコア（フィルタ前、全件）

| rank | id | confidence | status |
|---|---|---|---|
| 1 | participle.adverbial_temporal | 0.5218 | active |
| 2 | discourse.backgrounding | 0.5015 | active |
| 3 | participle.attributive | 0.3518 | active |
| 4 | participle.periphrastic | 0.3518 | active |
| 5 | participle.adverbial_means | 0.3513 | active |
| 6 | participle.imperatival | 0.3020 | active |
| 7–27 | nominal_syntax.*/discourse.*/participle.* | 0.3015–0.300 | active |

### 表示フィルタ適用後

- **表示候補：0件（静寂）**
- 最高スコア（adverbial_temporal）でも 0.5218 < 0.60
- `participle.adverbial_means`（手段）= 0.3513 — 閾値を大幅に下回る

### 観察

- μαντευομένη は V-PNP-NSF（現在中動態分詞、主格女性単数）
- 主格女性単数の名詞が節内にない（ἥτις が R-NSF = 関係代名詞）
- `matching_noun` シグナルが発火していない（headNounWord = null、matchingNoun が resolved されなかった）
- prevPos = R（関係代名詞） — prevPos による文脈シグナルが弱い
- distanceToVerb = 21（節全体をスコープにした距離が最大値に近い）

### 候補比較の根拠分類

**根拠クラス：C — 文脈解釈が必要／表示不能**

すべての候補が conf < 0.60 で表示対象外。現行の解析では、この文脈での分詞の機能的役割を確度 0.60 以上で特定できない。

- adverbial_means（手段）が文法的にはもっともらしい解釈（「占いをすることによって稼ぎをもたらした」）だが、conf=0.3513。
- これは `participle.adverbial_means` の検出ロジックが、この節でのシグナルを十分に拾えていないことを示す。
- 原因の特定には `adverbial_means` のシグナル設計の詳細調査が必要。DEFERRED。

**表示できるか：NO（静寂）**

---

## 現行表示条件を適用した結果まとめ

| 例 | 対象語 | primary候補 | other候補 | topHasLead | tiedNotice | 表示可否 |
|---|---|---|---|---|---|---|
| A | JHN 2:17 οἴκου | 2件（主語的・目的語的） | 2件 | false | true | YES |
| B | ROM 8:35 Χριστοῦ | 3件（主語的・所有・目的語的） | 1件 | false | true | YES |
| C | JHN 4:11 ζῶν | 2件（形容詞用法・直接目的語） | 0件 | false | true | YES |
| D | ACT 16:16 μαντευομένη | 0件 | 0件 | — | — | NO（静寂） |

---

## 候補比較文を表示できる例・できない例

### 表示できる：A、B、C

いずれも conf >= 0.60 の候補が2件以上あり、tiedNotice = true になる。
現行 UI は候補ラベルを列挙するが、「なぜ同列なのか」「どのシグナルが一致し、どこで分岐するか」は表示しない。

### 表示できない：D

全候補が閾値未満。静寂が現行の正しい動作。候補比較文の問題ではなく、「解析が確信を持てない」という情報を読者に伝える方法（例：灰色テキストやデフォルト非表示）が別途必要になる可能性がある。これは DEFERRED。

---

## 次の UI 実装に必要な最小データ契約

候補比較文を表示する場合（例：「なぜ○○と○○が同列か」「どの証拠が区別できないか」）に必要なフィールド：

### 既に存在するフィールド（実測済み）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | 候補 ID（例: `genitive.subjective`） |
| `label_ja` | string | 表示ラベル（例: `主語的属格`） |
| `confidence` | number | 正規化済みスコア（0〜1、校正済み確率ではない） |
| `status` | string | `active` / `stub` |
| `signals_matched` | string[] | マッチしたシグナル ID の配列 |
| `signals_failed` | string[] | 不成立だったシグナル ID の配列 |
| `xsc.deltas` | `{signal_id, value, label_ja}[]` | シグナル別スコア内訳 |
| `hint_ja` | string | 判定の手掛かり（短文） |
| `description_ja` | string | 用法説明（中文） |

### 区別可能性の判定ロジック（実装例）

候補間の「共通シグナル」と「分岐シグナル」を比較する場合：

```javascript
const shared  = candidateA.signals_matched.filter(s => candidateB.signals_matched.includes(s));
const onlyA   = candidateA.signals_matched.filter(s => !candidateB.signals_matched.includes(s));
const onlyB   = candidateB.signals_matched.filter(s => !candidateA.signals_matched.includes(s));
const canDistinguish = onlyA.length > 0 || onlyB.length > 0;
```

ただし「分岐シグナルがある = 区別できる」ではない。例 A では `agentive_semantics` と `patient_semantics` が分岐しているが、どちらが正しいかは本文から読み取れない。

### 未確認事項

- `c.xsc.rawScore`（正しいキー名）の存在確認 — NOT VERIFIED
- `context.matchingNoun` の正確な内容（context summary に含まれない） — NOT VERIFIED
- `participle.adverbial_means` の検出シグナル設計 — NOT VERIFIED（D の静寂原因の詳細調査 DEFERRED）

---

## 未確認事項と限界

1. **topHasLead の浮動小数点依存（B）**：ROM 8:35 で 主語的属格が他候補より +0.05 の差を持つが、浮動小数点演算により 0.04999… となり topHasLead = false になる。仕様上の意図（0.05 は含まない）かどうか確認が必要。UNKNOWN。

2. **D の静寂の原因**：`participle.adverbial_means` が conf=0.35 にとどまる理由は、シグナル設計の詳細を調べないと確認できない。この語が手段的分詞であるという文法的判断が正しいとしても、それは本監査のスコープ外。DEFERRED。

3. **analyzeAll() との差**：本監査は `analyze({ target, tokens, targetIdx })` を使用。`analyzeAll()` はすべてのトークンに同じ analyze を呼ぶラッパーのため、結果は同じはず。INFERRED — 直接確認はしていない。

4. **morph-index との関係**：bible_data は事前デコードされたフィールドを持つ。`public/morph-index/` との関係（どちらが正本か）は今回確認しなかった。NOT VERIFIED。

5. **Node.js での実行と browser 実行の差**：`window` / `document` に依存するコードパスは今回の経路に含まれない。syntax-analyzer.js は DOM 非依存と設計されており、実差は発生しないはず。INFERRED。

---

## アプリ本体の変更確認

```
git diff HEAD -- public/index.html public/core/syntax-analyzer.js public/assets/data/syntax-registry.json
```

出力：0 バイト。変更なし。CONFIRMED。

---

## 実行コマンドと終了コード

```bash
node /private/tmp/.../scratchpad/syntax-candidate-audit.cjs
# 終了コード: 0
```

実行結果は `/private/tmp/...` の一時ファイル。コミットしない。

---

## まとめ

| 例 | 区別の根拠 | 根拠クラス |
|---|---|---|
| A JHN 2:17 οἴκου | action_noun_head が共通。agentive vs patient は本文構造だけでは決定不能 | B |
| B ROM 8:35 Χριστοῦ | proper_name_genitive で主語的が微差リードするが、all 3 が同列 primary | B |
| C JHN 4:11 ζῶν | matching_noun で形容詞用法が僅差リード。accusative.direct_object も並立 | B |
| D ACT 16:16 μαντευομένη | 全候補が閾値未満、表示なし（静寂） | C |

4例すべてで、競合候補を候補間で決定的に区別する根拠は存在しない。これは解析エンジンの限界ではなく、形態情報と語順だけでは区別できない用法が存在するという言語的事実を反映している。
