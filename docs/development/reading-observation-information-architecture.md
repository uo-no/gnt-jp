# Reading Observation Information Architecture(Stage SP-2)

策定日: 2026-07-22
位置づけ: Reading Japanese 完成後の「読むための情報」を**どこに表示するか**の責務境界を定義する。
SP-IA-1(StudyPanel IA)・SP-SD-1(StudyPanel Scope)・RM-0(読書メモ編集人格)を統合。
**UI デザイン・実装・コード変更は禁止。責務境界のみを定義する。**
根拠(FROZEN): reading-japanese-policy.md(L-0)・studypanel-information-architecture-audit.md(SP-IA-1)・
studypanel-scope-definition.md(SP-SD-1)・reading-memo-editorial-character-audit.md(RM-0)。

Severity 凡例: **P0(致命)/ P1(高)/ P2(中)/ P3(低)**。スコープ: token / phrase / clause / verse / passage / corpus。

---

## Phase 1: 現在の情報を「ユーザーが知りたい単位」で分類

| 情報 | 知りたい単位 |
|---|---|
| Reading Japanese | **verse**(節の読み・token 単位で実体化) |
| Phrase Reading | **phrase** |
| 読書メモ(Wallace) | **clause / verse**(談話の流れ) |
| Morph | **token** |
| Syntax(role/referent) | **clause** |
| Semantic(LN/意味) | **corpus / verse** |
| 熟練者ラベル(中動態/主語省略) | **token**(morph 由来) |
| 使用傾向 | **corpus** |
| 意味が近い語 | **corpus** |
| Concordance / 用例 | **corpus** |
| 外部検索 | **corpus** |

- **Evidence**: SP-IA-1 の 4 階層実測(morphGrid=token・phrase reading=phrase・LN/cluster/concordance=corpus)。
- **Severity**: **P3**(現状の単位は明快)。
- **Conclusion**: 現情報は **token / phrase / clause / verse / corpus** に収まり、**passage は不在**。

## Phase 2: StudyPanel セクション → スコープ・マッピング

| StudyPanel セクション | スコープ |
|---|---|
| L1 word-head + Reading Japanese | verse / token |
| L1 Phrase Reading | phrase |
| L1 熟練者ラベル | token |
| L1 使用傾向 | corpus |
| L2 Morph grid | token |
| L2 語源 / 辞書全文 | token |
| L3 意味が近い語(LN / cluster) | corpus |
| L3 Concordance / 用例 | corpus |
| さらに調べる(外部検索) | corpus |

- **Evidence**: SP-IA-1 の 4 階層 + SP-SD-1(word-anchored 5 スコープ)。
- **Severity**: **P3**。
- **Conclusion**: **StudyPanel は token↔corpus を word-anchored で網羅・passage は持たない**(SP-SD-1 確定)。

## Phase 3: 追加候補のスコープ分類

| 追加候補 | スコープ |
|---|---|
| 同一 lemma 反復 | **corpus**(生データ)/ passage(この段落での反復という観察) |
| 語族反復 | **token / corpus** |
| 同じ日本語だが別 lemma | **corpus**(逆引き) |
| 修辞反復 | **passage** |
| 段落テーマ | **passage** |
| Discourse 情報 | **clause**(局所の流れ・既存メモ)/ **passage**(談話構造) |

- **Evidence**: SP-SD-1 Phase4/5/6(Lexical=Corpus/Token・Rhetorical=Passage・Discourse=Clause 局所/Passage 構造)。
- **Severity**: **P2**(反復・Discourse が corpus と passage に跨る)。
- **Conclusion**: **Lexical=corpus/token(word-anchored)・修辞/段落テーマ=passage・Discourse=局所 clause と構造 passage の二層**。

## Phase 4: 各情報をどこに置くべきか

| 情報 | 読書メモ | 単語カード | 節全体 | Passage View | StudyPanel 外 |
|---|---|---|---|---|---|
| 同一 lemma 反復 | △(流れとして条件付き・RM-0) | ○(生データ) | △ | ○(段落反復) | — |
| 語族 | ✗ | ○ | ✗ | ✗ | — |
| 別 lemma 同訳 | ✗ | ○ | ✗ | ✗ | — |
| 修辞反復 | ✗ | △(語アンカーの目印のみ) | ✗ | ○ | — |
| 段落テーマ | ✗ | ✗ | ✗ | ○ | — |
| Discourse(局所) | ○(既存) | △ | ○ | — | — |
| Discourse(構造) | ✗ | ✗ | ✗ | ○ | — |

- **Evidence**: RM-0(反復は流れとして条件付き可・語詳細/数値は責務外)・SP-SD-1(passage 構造は StudyPanel 外)。
- **Severity**: **P2**。
- **Conclusion**: **語詳細=単語カード / 局所の流れ=読書メモ / 段落構造=Passage View**。反復は「流れの観察」なら
  読書メモ(条件付き)、「生データ」なら単語カード、「段落の型」なら Passage View に分かれる。

## Phase 5: 節全体情報と「この節の読書メモ」の関係(編集思想のみ)

- **判定**:
  - **拡張すべき**: verse スコープの**談話の流れ**(なぜ/内容/目的/結果/条件/対比)は読書メモと**同じ人格**
    なので拡張で収まる。
  - **新セクションに分けるべき**: verse スコープでも**語彙・反復の生データ・数値**は、読書メモの
    観察型・非露出規律と**性格が異なる**ため別セクション(単語カード/節全体)へ。
  - **同居すると人格が壊れる**: **数値(出現回数)・ラベル(Strong/LN)・Corpus 一覧(Concordance/Cluster)を
    読書メモに同居させると、RM-0 の「分類ラベル・数値を出さない静かな 1 文」という人格が壊れる**
    (Guard Rule と衝突)。
- **Evidence**: RM-0 Phase4/6(1 関係 1 文・Guard Rule・反復は条件付き可/数値ラベルは責務外)。
- **Severity**: **P1**(同居による人格破壊リスク)。
- **Conclusion**: **読書メモは談話の流れの拡張のみ受け入れ、語彙データ・数値・Corpus 一覧は別セクションへ**。

## Phase 6: 責務境界表

| 情報 | Reading Memo | StudyPanel | Passage |
|---|---|---|---|
| lemma 反復 | △(流れの観察として条件付き) | ○(corpus 生データ) | ○(段落反復) |
| 語族 | ✗ | ○(token/corpus) | ✗ |
| 別 lemma 同訳 | ✗ | ○(corpus 逆引き) | ✗ |
| 修辞反復 | ✗ | △(語アンカーの目印のみ) | ○(構造) |
| Discourse | ○(局所の流れ・既存) | △(語アンカー) | ○(談話構造) |
| Strong | ✗ | ○(token) | ✗ |
| Louw-Nida | ✗ | ○(corpus/semantic) | ✗ |
| Concordance | ✗ | ○(corpus) | ✗ |
| 出現回数 | ✗(数値=Guard 衝突) | ○(corpus) | ✗ |
| Cluster | ✗ | ○(corpus/semantic) | ✗ |

- **Evidence**: RM-0(メモ列の ✗ は数値/ラベル/Corpus)・SP-SD-1(StudyPanel=word-anchored・Passage=構造)。
- **Severity**: **P1**(境界を破ると人格破壊/責務衝突)。
- **Conclusion**: **Reading Memo=流れの観察のみ / StudyPanel=word-anchored 語詳細・Corpus / Passage=構造**。

## Phase 7: 情報の重複監査

| 重複リスク | 評価 |
|---|---|
| Reading Japanese(verse)↔ Phrase Reading(phrase) | 粒度が異なり境界で近接するが**別スコープ**・重複低 |
| 読書メモ(談話の流れ)↔ Syntax(clause role) | メモは syntax/discourse の**読者向け散文化**・Syntax は第一級不在(SP-IA-1)→ **現状重複低**。Syntax を第一級化する際は register 分離(散文 vs 構造)が必要 |
| Morph(態=中動)↔ 熟練者ラベル(中動態として読める) | **同一 fact の二重表示リスク(中)**——morph=事実・ラベル=読みのヒント。目的が異なるが語が重なる |
| Semantic(LN/cluster)↔ 意味が近い語 ↔ Concordance | L3 内で近接。**Lexical(別 lemma 同訳)追加は L3 cluster と重複**(SP-SD-1 Phase5) |

- **Evidence**: SP-IA-1(Syntax 織り込み)・SP-SD-1 Phase5(Lexical↔cluster 重複)・熟練者ラベル(index.html 5456)。
- **Severity**: **P2**(Morph↔熟練者ラベル、Lexical↔cluster の重複整理が必要)。
- **Conclusion**: **追加 Lexical は L3 Semantic との重複整理が前提**。Morph↔熟練者ラベルは目的分離を保つ。

## Phase 8: Progressive Disclosure 監査(L1 まず読む → L2 詳しく → L3 研究する)

- **評価**: **word-scoped の 3 階層は維持される**——L1(Reading/Phrase/Memo=まず読む)→ L2(Morph/語源/辞書=
  詳しく)→ L3(Semantic/Cluster/Concordance=研究する)。**追加 Lexical(語族/反復/別 lemma)は L2/L3 に自然に
  収まり階層を壊さない**。
  - ただし **Passage(段落テーマ/修辞/談話構造)は「より深い研究」ではなく「より広いスコープ」**であり、
    **L3 の延長ではない**。L3 に押し込むと「深さ」と「広さ」の軸が混線し、progressive disclosure が破綻する。
    → **Passage は別軸(Passage View)として分離すれば L1→L2→L3 は維持される**。
- **Evidence**: SP-IA-1 Phase8(段落スコープの受け皿なし=P1)・SP-SD-1(Passage は StudyPanel 外)。
- **Severity**: **P1**(Passage を word 階層に混入させると破綻)。
- **Conclusion**: **word の深さ軸(L1→L2→L3)は維持可。passage は広さ軸として別 View に分離すること**が条件。

---

## Severity 集約

| Phase | 監査 | Severity |
|---|---|---|
| 1 | 現情報の単位分類 | P3 |
| 2 | StudyPanel マッピング | P3 |
| 3 | 追加候補の分類 | P2 |
| 4 | 配置判定 | P2 |
| 5 | 節全体 vs 読書メモ(人格) | **P1** |
| 6 | 責務境界表 | **P1** |
| 7 | 重複監査 | P2 |
| 8 | Progressive Disclosure(passage 分離) | **P1** |

- **P0 なし**。P1×3 はすべて **「読書メモの人格保持」と「word 深さ軸/passage 広さ軸の分離」** に収斂。

---

## Reading Observation Information Architecture(一枚)

```
Reading（まず読む・L1）
│  ※読者の視点・静かな読書の声・推論/翻訳なし
├ Reading Japanese      … verse（決定的 fact・M-15 反映済）
├ Phrase Reading        … phrase
└ Reading Memo          … clause/verse（談話の流れ・観察型・数値/ラベル非露出）
        ↓
Word（詳しく読む/研究する・L2→L3・StudyPanel・word-anchored）
├ Morph                 … token（品詞/活用/格/数/性）
├ Syntax                … clause（節役割/referent・語アンカー）
├ Semantic              … corpus（LN/cluster/意味が近い語）
├ Lexical               … corpus/token（同 lemma 反復/語族/別 lemma 同訳）※L3 と重複整理
└ Usage                 … corpus（使用傾向/Concordance/用例/出現回数）
        ↓
Passage（別軸・Passage View・StudyPanel 責務外）
├ Theme                 … passage（段落テーマ）
├ Repetition            … passage（修辞反復）
├ Discourse             … passage（談話構造・この/その解決・照応連鎖）
└ Rhetoric              … passage（Inclusio/Chiasm/Parallelism/対比）
```

- **三つの家**: **Reading(読む声)/ Word(語の詳細・StudyPanel)/ Passage(段落構造・別 View)**。
- **Reading Memo は Reading の家に属し、流れの観察のみを受け入れる**(数値/ラベル/Corpus は Word の家)。
- **Passage は Word の深さ軸の延長でなく別の広さ軸**——別 View に分離してのみ整合。

---

## FROZEN 判定

- **FROZEN 可能**。
- **理由**: 現情報と追加候補が **Reading / Word / Passage の三スコープと、Reading Memo / StudyPanel / Passage View
  の三つの家に一意に対応づけられ**、責務境界(どの情報がどこに属し、どこに属さないか)が矛盾なく確定した。
  P1 課題(読書メモの人格保持・word/passage 軸分離)は本 IA が境界として明文化し、衝突経路を塞いだ。
- **今後 UI 設計へ進める条件**:
  1. **Reading Memo に数値/ラベル/Corpus 一覧を持ち込まない**(RM-0 の 7 条件・談話の流れの観察のみ)。
  2. **Lexical は Word の家(StudyPanel L2/L3)へ配置し、L3 Semantic(cluster)との重複を整理する**。
  3. **Passage(段落テーマ/修辞/談話構造)は StudyPanel の word 階層に載せず、別軸(Passage View)として扱う**。
  4. **Progressive Disclosure(L1 読む→L2 詳しく→L3 研究)を維持し、passage を深さ軸に混入させない**。
  5. **すべて Reading の決定的責務(推論なし/翻訳なし)を侵さない**(他訳候補は Reading と区別)。

```
[reading-observation-information-architecture FROZEN 2026-07-22]
三つの家: Reading(読む声=Reading Japanese/Phrase/Memo) / Word(StudyPanel・word-anchored=Morph/Syntax/Semantic/Lexical/Usage) / Passage(別View=Theme/Repetition/Discourse/Rhetoric)
Phase1-2 現情報: token/phrase/clause/verse/corpusに収まりpassage不在。StudyPanelはtoken↔corpusをword-anchoredで網羅
Phase3-4 追加: Lexical=corpus/token→Word / 修辞・段落テーマ=passage→Passage View / Discourse=局所clause(メモ)+構造passage(View)。反復は流れ観察なら読書メモ条件付き
Phase5 節全体vs読書メモ: 談話の流れは拡張可・語彙データ/数値/Corpusは別セクション・同居は人格破壊(Guard衝突) P1
Phase6 責務境界: Reading Memo=流れ観察のみ / StudyPanel=word-anchored語詳細+Corpus / Passage=構造。Strong/LN/Concordance/出現回数/Cluster/語族/別lemma同訳=メモ✗StudyPanel○
Phase7 重複: Morph↔熟練者ラベル(同fact二重)・Lexical↔L3 cluster重複整理要 P2
Phase8 Progressive Disclosure: word深さ軸L1→L2→L3は維持可・passageは広さ軸で別View分離が条件(L3延長でない) P1
FROZEN可能。UI設計条件: メモに数値/ラベル/Corpus持ち込まない/LexicalはWordでcluster重複整理/PassageはView分離/L1→L2→L3維持/Reading決定的責務不可侵
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結(Reading Observation IA・三つの家 Reading/Word/Passage・8 Phase・P1×3=メモ人格保持と word/passage 軸分離・一枚 IA・FROZEN 可能・UI 設計 5 条件) |
