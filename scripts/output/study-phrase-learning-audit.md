# Phrase Learning Audit（Phase 23 / StudyPanel 読解フロー監査）

- 監査日: 2026-07-07
- 前提: Phase 21（242 型未接続）・Phase 22（Learning Object 設計）の結論
- 性質: UI・情報設計の監査のみ。コード・Registry・UI 変更ゼロ
- 中心の問い: StudyPanel は「Clause → Phrase → Word」という人の読解順序に沿っているか

---

## Audit 1 — Reading Flow（実際の読解順序）

### 実測フロー

```
本文（節=verse を読む）
  ↓ 節番号タップ
節パネル（語チップ一覧 + 「この節の読書メモ」= Clause 粒度の 1 文）
  ↓ 語チップタップ
単語詳細（rn-prose = ★その語が属する節の同じ Clause 粒度の文★ + 形態グリッド + 辞書）
```

### 判定: **Clause → Word の 2 点鎖であり、Phrase 層が完全に欠落。さらに逆流がある**

1. **Phrase 層の空洞**（3 重の欠落）:
   - `phrase-registry.json` は実質空（`{version, phrases:{}}` 267 bytes）— **PhraseAnalyzer は句を 1 つも生成しない**
   - StudyPanelAdapter の phraseCard は UI 未接続（Phase 21 既知）
   - 節パネルの「句区切り」表示は Phrase API と無関係の UI ヒューリスティック（CONJ/PREP の前で改行するだけ）。Context Engine が保持する本物の句（NP/PP/PtcP/GenP + head/dependents）は表示に届いていない
2. **逆流（Word→Clause）**: 単語をクリックすると返ってくる読書メモは「その語が属する**節**の discourse 文」— 語を尋ねたのに節の答えが返る。語固有の情報（この語は属格で前の名詞を修飾している等）は返らない
3. **第 3 の文言源の発見**: 節パネルの語チップには手書きのミニ文言（CONJ_SIG: 「γάρ = なぜなら、と理由へ進む」/ CASE_SIG: 「誰の話かを示している」等）が残存。エンジン・_WALLACE_TEXT と独立に保守される 3 系統目のコンテンツであり、二重管理リスク（内容自体は良質で、Word 粒度 Reading Note の原型として回収価値がある）

---

## Audit 2 — Phrase Coverage（句レベルで提示可能な情報）

| 句情報 | 供給源（既存） | 状態 |
|---|---|---|
| 主語 NP / 目的語 NP | roleMap（subj/obj・内部）+ nominative.subject / accusative.direct_object | **未接続**（wlv の役割色分けが部分的に近似・語単位） |
| 述語 NP（Predicate Nominative / Colwell 構文） | nominative.predicate_nominative + article.colwell | **未接続** |
| Apposition（同格） | nominal_syntax.appositional_np + nominative.apposition | **未接続** |
| Nested NP / Complex NP（属格連鎖） | nominal_syntax.nested_np / complex_np（+ np_depth） | **未接続** |
| Articular / Anarthrous / Modified NP | nominal_syntax 各型（NT top 14,068 箇所） | **未接続** |
| PP / Attributive PP / Substantival PP | preposition 7 型（10,894 トークン） | **未接続** |
| Participial Phrase（範囲・限定/独立/状況） | ctx.phrases の PtcP + participle 型 | **未接続** |
| Infinitival Phrase（冠詞付き・前置詞パターン） | infinitive 型 + articular_inf 検出 | **未接続** |
| 句境界・句ヘッド・従属語 | Context Engine `_detectPhrases`（NP/PP/PtcP/GenP + head/dependents） | **表示不能**（UI に経路なし） |
| PhraseAnalyzer の PhraseResult | phrase-registry が空のため生成ゼロ | **表示不能** |

**「現在表示可能」に分類できる句情報はゼロ。** 全 10 項目が未接続または表示不能であり、供給源はすべて実装・監査済み。

---

## Audit 3 — Information Distribution（242 型の自然粒度）

型ごとに「どのレイヤーで提示するのが最も自然か」を規則で全数分類した:

| 自然粒度 | 型数 | 割合 | 主な内訳 |
|---|---|---|---|
| **Clause** | 55 | 23% | clause 12・discourse 7（背景/前景/対比/転位/挿入）・verb の節機能 11（hortatory/deliberative/purpose 等）・participle 副詞的 10・infinitive 副詞的 6・従属接続詞 6・小辞 2・属格独立 1 |
| **Phrase** | 50 | 21% | nominal_syntax 12・preposition 7・participle 形容詞的 7・adjective 位置 7・infinitive 名詞的 5・article スパン構文 3（Sharp/Colwell/kataphoric）・accusative 3（二重対格・不定詞主語）・discourse 前置 3・nominative 2・vocative 1 |
| **Word** | 137 | 57% | 格の用法（genitive 21・dative 14 等）・verb 時制/態 37・pronoun 12・particle 19・等位接続詞 6 ほか |

仕様の例との整合: Purpose Clause→Clause ✓ / Subject NP・Predicate Nominative→Phrase ✓ / Genitive of Source・Historical Present→Word ✓ / Backgrounding→Clause ✓。

---

## Audit 4 — Learning Sequence（初学者の理解順序）

理想の系列「Clause → Subject → Predicate → Modifier → Word」に対する現状評価:

| 評価 | 箇所 |
|---|---|
| **自然** | 本文 → 節パネル → 単語詳細という「深さ方向」の階層自体。静寂優先の原則 |
| **飛躍** | 節の 1 文の直後に語の形態グリッドへ落ちる — 「この節は目的を述べている」→（**誰が・何を・どのかたまりで、が抜ける**）→「この語はアオリスト受動分詞」。目的語 NP の中の属格を、NP の存在を知らずに語として読まされる |
| **重複** | 節パネルの passage note と単語詳細の rn-prose が**同一の節文**（同じ文を 2 階層で 2 回読む）。深くなったのに情報が増えない — 階層降下の教育的意味が失われている |
| **逆流** | Audit 1-2 のとおり、Word 階層の答えが Clause 粒度 |

---

## Audit 5 — Reading Notes の粒度分類

| Reading Note | 型数 | 内容 |
|---|---|---|
| Clause RN | 55 | 「この節は〜している」（現行 47 テンプレの守備範囲と一致 — 現行はここだけ生きている） |
| **Phrase RN** | **50** | 「このかたまりは〜」— **Phrase Reading に向く型の一覧**: nominal_syntax 全 12（simple/articular/anarthrous/modified/multiple/appositional/substantival/head_initial/head_final/nested/complex/vocative）・preposition 全 7・participle {attributive, predicate, substantival, periphrastic, complementary, redundant, indirect_discourse}・adjective {attributive, predicate, substantival, attributive_position, predicate_position, restrictive, epithet}・infinitive {complementary, subject, epexegetical, articular, means}・article {granville_sharp, colwell, kataphoric}・accusative {subject_of_infinitive, double_person_thing, object_complement}・nominative {apposition, title_nominative}・vocative {chain}・discourse {topic_fronting, focus_fronting, emphasis_word_order} |
| Word RN | 137 | 「この語は〜」（死蔵 33 テンプレ = genitive/article はここ。チップの CASE_SIG/CONJ_SIG も原型） |

## Audit 6 — Observation の粒度分類

観察指示はシグナルの性質から機械的に粒度が決まる（registry の signals/conditions が判定材料）:

| Observation | 見るもの | シグナル例 |
|---|---|---|
| Clause Obs | マーカー + 節内の法・後続節 | `target_lemma_in(['εἰ']) AND clause_has_past_indicative()`・apodosis_has_an |
| Phrase Obs | 位置・冠詞の反復・一致・句ヘッド | in_attributive_position・pp_article_head・np_depth・predicate_nom_pair・agreement 系 |
| Word Obs | 形態そのもの | target_tense_eq・target_case_eq・degree・person |

現行 StudyPanel に Observation 層は存在しない（Phase 21）。導入時は上の 3 粒度をそのまま踏襲すべきで、**Phrase Obs（一致・位置・反復冠詞）が初学者の観察訓練として最も視認しやすい**（目で見て確かめられる形式特徴のため）。

## Audit 7 — Wallace Alignment（本文の説明粒度との比較）

- Wallace GGBB の説明様式は「**語の形態を、句・節の文脈条件で判定する**」— 粒度の実測（Audit 3 の分類）: Word 57% / Phrase 21% / Clause 23%
- 現行 StudyPanel の提示粒度: **Clause 粒度の文 1 種のみ**（+ Word 粒度の形態グリッド=文法情報であって用法説明ではない）
- つまり Wallace の説明量の **78%（Phrase 50 + Word 137 型）が節の 1 文に押し潰されており**、特に Phrase 21% は表示座席そのものがない。Wallace が最重要視する構文（属格連鎖・限定位置・Sharp・Colwell・分詞句）はほぼ Phrase 粒度である

## Audit 8 — Gap Analysis（Phrase 不在による教育損失）

| 失われているもの | 規模 |
|---|---|
| Engine Extension（nominal_syntax）全 12 型 | NT top 14,068 箇所 — Phase 18 の成果に表示先がない |
| preposition 全 7 型 | 10,894 トークン |
| 「かたまりの範囲」（分詞句・不定詞句・PP がどこからどこまでか） | 初学者の最大の躓き。ctx.phrases に境界が実在するのに見えない |
| 属格連鎖の構造（2CO 4:4 の 4 層など） | 語単位では原理的に語れない（θεοῦ 単独では「τοῦ θεοῦ が λόγος を修飾する」を言えない） |
| 複数語スパン構文（Granville Sharp・Colwell・μέν…δέ の対） | Word にも Clause にも自然に置けず、迷子になる |
| 句ヘッド/従属語（head/dependents） | Phase 4.5 実装済み・全面未使用 |

## Audit 9 — Proposed Learning Architecture（情報設計のみ・実装なし）

```
節を開く
  ↓
【Clause】 節の骨格 — 節の数・種類（条件/目的/…）・discourse 1 文（既存 passage note を再利用）
  ↓
【Phrase】 読みのまとまり — Context Engine の句（NP/PP/PtcP/GenP）を「かたまり」として提示し、
           各かたまりに Phrase 粒度 50 型の 1 行（nominal_syntax / preposition / 位置型）を対応させる
           ※ 供給源は既存の ctx.phrases + 242 型候補で完結（phrase-registry の充填すら必須でない —
             Phase 22 の Learning Object が Context Engine の句を読む設計で足りる）
  ↓
【Word】  語の役割 — Word 粒度 137 型の 1 行（死蔵 33 テンプレ + チップ CASE_SIG の回収先）
           + 既存の形態グリッド・辞書（現 Level 2 と同一）
  ↓
【Related】 Phase 22 の E1 混同対 / E2 多層並走 / E3 教育系列
```

各階層の教育的機能: Clause=「何が起きている場面か」→ Phrase=「どんなかたまりで組み立っているか」→ Word=「この語はそのかたまりの中で何をしているか」→ Related=「似た構文と比べる」。階層を降りるたびに**新しい情報が増える**こと（Audit 4 の重複の解消）が設計上の必須条件。

---

## 結論

**「Clause → Phrase → Word」という学習導線は自然であり、採用すべきである。** ただし現状の StudyPanel はこの導線になっていない: 実態は「Clause の 1 文 →（Phrase 空洞）→ Word の形態辞書」の 2 点鎖で、①中間の Phrase 層が 3 重に欠落（registry 空・adapter 孤児・UI ヒューリスティック代用）、②Word 階層の読書メモが Clause 粒度のまま（逆流）、③2 階層が同一文（重複）という 3 つの構造問題を持つ。

したがって現在の StudyPanel は「統語解析結果を表示する UI」ですらなく、「節の要約 1 文 + 語の形態辞書」である。**読解プロセス支援 UI になるための欠落は Phrase 層ただ 1 つであり、その素材（句境界・句ヘッド・Phrase 粒度 50 型・NT 25,000 箇所超の判定結果）はすべて実装・監査済みで、接続だけが存在しない** — Phase 21–22 の結論（問題は接続だけ）は句レイヤーにおいて最も深刻な形で現れている。
