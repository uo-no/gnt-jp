# Reading Japanese Builder Syntax Adoption 実装報告(Stage M-8d)

実装日: 2026-07-22
位置づけ: M-8c Syntax Adoption Boundary Design(FROZEN)に基づき、**Builder が demonstrativeSyntax の
pronominal neuter を決定的に採用する**実装。
根拠(FROZEN): reading-japanese-policy.md(L-0)・-builder-syntax-adoption-boundary-design.md(M-8c)・
syntax-completion-*(L-3c)・-builder-morph-adoption-implementation-report.md(M-8b)・
-editorial-review-framework.md(M-5)。
数値はクリーン NT 実測(総 137,741・重複「 2.json」不在)。

---

## 1. 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| public/core/reading-japanese-builder.js | **`setCorpus(tokens)`(verseId→token 索引)追加**・**`_adoptPronominalNeuter` 追加**(pronominal neuter を決定的に採用)・`_collectToken` に `syntaxAdopted` 記録・`buildVerse` に `syntaxAdoptedCount`・静的定数 SEMANTIC/_DEIXIS_ADNOMINAL_TO_PRONOMINAL |
| scripts/re-m8d-builder-syntax-adoption-regression.cjs | **新規**(Builder Syntax Adoption 回帰基準・8 checks) |

**変更なし(制約遵守)**: **bible_data.japanese(代表語起点保持)** / **reading-engine.js**(本 Stage 非改変)/
Syntax / Corpus / Discourse / Morph Registry / UI / Presentation。重複再混入 0。

---

## 2. 実装方針(Builder は判定しない)

- **Builder は決定済み Syntax fact のみ採用**(M-8c 境界)。referent は **corpus 索引で決定的に lookup**
  (推論でなく注釈参照)し、**参照先 class='verb'** を確認して pronominal と判定する(Syntax が既に
  注釈した referent の読み取り)。
- **demonstrativeSyntax は `engine.getDemonstrativeSyntax(token)` を直接読む**。resolve はルール不発時
  `null` を返し demonstrativeSyntax を添付しないため、res には依存しない(重要な実装知見・§5)。
- **採用は「Data 代表語が標準連体形(この/これらの/あの/あれらの)」に厳密一致するときのみ**発火。
  これにより **すなわち(Data 固定慣用=Semantic 先行)・τοιοῦτス「このような」(質)は自動的に不採用**。
- レンダリング: **この→これ / これらの→これら / あの→あれ**(連体→代名詞・lemma+number で決定的)。
  格助詞は付さない(現状の指示詞と同一慣習・格助詞付与は particle 層/別 Stage の責務)。
- **number/person 推論・discourse 解釈・deixis 距離選択・文脈補完はしない**(L-0/M-8c 準拠)。

---

## 3. QA 結果

### 3-1. 採用件数(pronominal neuter)

| before → after | 件数 |
|---|---|
| この → これ | 164 |
| これらの → これら | 13 |
| あの → あれ | 2 |
| **合計** | **179**(οὗτος 177 / ἐκεῖνος 2) |

- `buildVerse.syntaxAdoptedCount` 集計 = トークン集計 = **179**(一致)。

### 3-2. before / after

- **before = Data 代表語**(この/これらの/あの・連体形)/ **after = 代名詞形**(これ/これら/あれ)。
- **bible_data.japanese(代表語)自体は不変**(起点保持)。Builder 確定 reading が代名詞形を採用。

### 3-3. 非採用の内訳(M-8c「neuter 195」のうち 16 件を原則的に除外)

| 除外 | 件数 | 理由 |
|---|---|---|
| **οὗτος 複数だが Data 代表語=この** | 9 | Data の number 不整合(この=単数形)。number 補正は Data/Morph 責務・**Syntax Adoption 対象外**(現状維持) |
| **すなわち** | 5 | Data 固定慣用代表語=**Semantic 先行**(この→これ で上書きしない) |
| **τοιοῦτος(このような)** | 2 | 質・非デイクシス・代名詞レンダリング非決定的(現状維持) |

- **179 採用 + 16 除外 = 195**(M-8c neuter 総数)。除外はすべて**責務境界に基づく正しい現状維持**。

### 3-4. 非変更確認(誤採用 0)

| 対象 | 確認 |
|---|---|
| **masc/fem pronominal(109)** | reading 誤変更 = **0**(この人/この方=語選択の余地・M-8c で不採用)✓ |
| **すなわち(Semantic 先行)** | 上書き = **0** ✓ |
| **τοιοῦτος** | 誤変更 = **0** ✓ |
| **adnominal(参照先 non-verb)** | 誤変更 = **0**(連体は不採用)✓ |
| **非採用トークン全体** | reading = resolve 表示読みと一致(不一致 **0**・現状維持)✓ |

### 3-5. 回帰・整合

| 項目 | 結果 |
|---|---|
| **engine 全回帰** | re-phase1(111)/2/3/5・re-stageA/B/D/E **全 ALL PASS**(engine 非改変) |
| **M-8d Builder 回帰** | re-m8d-builder-syntax-adoption **ALL PASS(8 checks)**・179/マッピング/ガード固定 |
| **chip⇔panel 一致** | **100%**(chip/panel は engine.resolve 参照=不変)・破損形 0 |
| **推論混入 0** | referent は決定的 lookup・discourse/deixis 距離/文脈補完なし |
| **bible_data 不変** | 代表語(この/これらの/あの)起点保持・git diff 空 |
| **重複「 2.json」** | 0 |

### 3-6. Editorial Review 連携

- `buildVerse` が **`syntaxAdoptedCount`** を返し、各トークンの **`syntaxAdopted`**
  (representative→adopted・reason='pronominal-neuter-verb-referent')で採用 verse/トークンを識別・記録可能。
  M-5 Editorial Review が「Syntax 採用のあった verse」を対象にできる(Morph 採用=`morphAdopted` と並列)。

---

## 4. 完了条件の充足

| 完了条件 | 充足 |
|---|---|
| Builder が Syntax fact のみ読む | ✓ getDemonstrativeSyntax + corpus lookup・判定なし |
| pronominal neuter のみ採用 | ✓ 179 件(この→これ/これらの→これら/あの→あれ) |
| masc/fem 非採用 | ✓ 誤変更 0 |
| adnominal 非採用 | ✓ 参照先 non-verb 誤変更 0 |
| unresolved 非変更 | ✓ 非採用トークン reading 不一致 0 |
| 推論混入 0 | ✓ 決定的 lookup のみ・discourse/deixis 距離なし |
| bible_data 不変・全回帰 PASS | ✓ git diff 空・engine 8 + Builder 1 全 PASS |

---

## 5. 重要な実装知見

- **resolve はルール不発時 `null` を返す**(_resolveUnsafe が該当ルールなしで null)。この場合
  relativeSyntax/demonstrativeSyntax/semanticInfo は**添付されない**(`if(result)` ブロックを通らない)。
  素の指示詞(この)は resolve=null が多く、**res.demonstrativeSyntax に依存すると採用が 0 件になる**
  (初回実装の不発原因)。**getDemonstrativeSyntax(token) を直接呼ぶ**ことで解決。
- **「標準連体形に厳密一致」ガード**が Semantic 先行(すなわち)を無害に保護する。res.source に依存せず
  (context なしでは semantic 不活性)、**Data 代表語の surface form で判定**することで、Semantic 決定を
  Builder が壊さない。

---

## 6. FROZEN 可否

- **FROZEN 可能**。Builder は demonstrativeSyntax の pronominal neuter を **判定なしで採用**(179 件)。
  **masc/fem・すなわち・τοιοῦτος・adnominal・unresolved はすべて現状維持(誤採用 0)**、
  **bible_data 代表語は不変**、**engine 全回帰 ALL PASS**、**Builder 回帰 ALL PASS(8 checks)**、
  chip⇔panel 100%・破損 0・推論混入 0。

```
[reading-japanese-builder-syntax-adoption-implementation FROZEN候補 2026-07-22]
実装: builder.js に setCorpus + _adoptPronominalNeuter 追加。getDemonstrativeSyntax直読 + corpus lookup(class=verb)で pronominal 判定
採用: pronominal neuter 179（この→これ164 / これらの→これら13 / あの→あれ2・οὗτος177/ἐκεῖνος2）。before=連体代表語 / after=代名詞形
非採用(195中16): οὗτος複数だがData=この9(number不整合=Data/Morph責務) / すなわち5(Semantic先行) / τοιοῦτος2(質)
ガード: masc/fem0 / すなわち上書き0 / τοιοῦτος0 / adnominal(non-verb)0 / 非採用reading不一致0
QA: engine全回帰ALL PASS / re-m8d Builder回帰ALL PASS(8) / chip⇔panel100% / 推論混入0 / bible_data不変 / 重複0
知見: resolveはルール不発時null→demonstrativeSyntax非添付。getDemonstrativeSyntax直読で解決。標準連体形一致ガードでSemantic先行保護
非改変: bible_data / reading-engine / Syntax / Corpus / Discourse / Morph Registry / Presentation / UI
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版(Builder Syntax Adoption・pronominal neuter 179 採用・16 原則的除外・誤採用 0・engine 非改変・Builder 回帰新設・Editorial Review 連携) |
