# StudyPanel Coverage Audit（Phase 21 / 読書メモ品質監査）

- 監査日: 2026-07-07
- 対象: StudyPanel の学習コンテンツのみ（読書メモ・解説・Tips・Observation・Related）
- 方法: UI/コアの読み取り調査（index.html・core/clause-analyzer.js・syntax-search.html）+ registry 学習フィールドの全 242 型機械集計 + コーパス頻度による重み付け
- 本監査でのコード変更: **ゼロ**（監査スクリプトは scratchpad・読み取りのみ）

---

## 1. 現状分析（Audit 1 — StudyPanel が参照しているデータ構造）

### 1.1 表示レイヤーと生成源

| 表示 | 生成源 | 内容 |
|---|---|---|
| **Layer 1: 読書メモ**（`rn-prose` 単語 / `wlv-pn-prose`「この節の読書メモ」） | `ReadingFormatter._WALLACE_TEXT`（47 テンプレート） | 「ここでは、〜されています。」型の自然文。**節の discourse.type（14 種）+ clause.type（5 種: condition/content/contrast/purpose/reason）のみで選択** |
| 確度の語り | `_getConfidenceText`（3 段階固定文） | ≥0.95「解析は安定しています」/ ≥0.80「一般的な解釈です」/ それ未満「複数の解釈が考えられます」 |
| 読書用ヒント（suggest） | `_SUGGESTION_BY_MARKER`（**5 マーカーのみ**: γάρ・ἵνα・ὅπως・εἰ・ἐάν） | 「理由として読むと流れが見えます」等の短文 |
| Level 2: 単語を詳しく調べる | 形態グリッド・語源合成・Abbott-Smith 辞書全文 | 形態論・語彙情報（統語型とは独立） |
| Level 3: 意味が近い語と比べる | セマンティックレイヤー（LN/クラスタ） | 語彙意味情報 |
| さらに調べる | 固定 3 リンク（用例 / 語形 / **同じ構文を探す** → syntax-search.html） | 型非依存の汎用導線 |

### 1.2 決定的な発見 — 242 型エンジンと学習コンテンツの断絶

1. **単語・節の読書メモは 242 型の候補を一切参照していない。** `sa.analyzeAll()` の結果（syntaxResults）は Phrase/Clause の**構造解析にのみ**使われ、読書メモの文選択には節の discourse 判定（14 種）だけが使われる。エンジンが 131,923 トークンに付与している型判定・シグナル・確度は、読書メモに反映されない。
2. **genitive 22 + article 11 = 33 型分のテンプレートは存在するが到達不能（死蔵）。** `_CLAUSE_TYPE_TO_GLOSS_KEY` に genitive.\*/article.\* のブリッジが定義済みだが、`format()` に渡る type は ClauseAnalyzer の clause-registry 由来（5 種の clause.\* のみ）であり、genitive.\*/article.\* が渡る呼び出し経路が存在しない。
3. **registry の学習ペイロード（label_ja・hint_ja・description_ja・example_greek/gloss・signals label_ja・alternatives・wallace_ref）は全 242 型でほぼ完備**だが、StudyPanel はどのフィールドも表示しない。唯一の表示先は syntax-search.html（top の label_ja・確度バー・根拠ポインタ・第2〜6位候補）で、StudyPanel からの導線は型非指定の汎用リンク。
4. `StudyPanelAdapter`（core 側の 5 カード API: overview/clauseCard/phraseCard/discourseCard/auditCard）は **UI から未使用**（index.html・assets/js で参照 0）。
5. `_getConfidenceText` の閾値（≥0.95/≥0.80）は clause 側 confidence（0.60–0.88）向けで、**242 型の実測分布（0.25–0.90・中央値 0.60）に当てると 239/242 型が常に「複数の解釈が考えられます」になる**尺度。

---

## 2. Coverage（Audit 2・7 — 242 型 × 5 軸）

判定基準: **covered** = StudyPanel に実際に表示される / **partial** = データまたはテンプレは存在するが表示されない（死蔵・データのみ） / **missing** = データ自体がない。

| 軸 | covered | partial（データ/テンプレあり・非表示） | missing | StudyPanel 表示 Coverage |
|---|---|---|---|---|
| Reading Note | **0** | 33（テンプレ存在・到達不能: genitive 22 + article 11） | 209 | **0%** |
| Observation（hint_ja） | **0** | 235 | 7（hint 実質なし） | **0%**（データ整備 97%） |
| Related Syntax（alternatives） | **0**（syntax-search でのみ表示） | 238 | 4 | **0%**（データ整備 98%） |
| Representative Example | **0** | 239 | 3（dormant: genitive.means・particle.emphasis_per/toi） | **0%**（データ整備 99%） |
| Wallace Summary（description_ja + wallace_ref） | **0** | 242 | 0 | **0%**（データ整備 **100%**） |

**総括: データ整備率 97–100% に対し、StudyPanel 表示率は実質 0%。** 読書メモとして機能しているのは discourse 14 テンプレート + clause 5 型のみで、カテゴリ別に見ると 17 カテゴリ中 **15 カテゴリ（209 型）に読書メモの経路が存在しない**（genitive/article はテンプレ死蔵、残りはテンプレ自体なし）。

### 欠落一覧（カテゴリ別 Reading Note 経路）

| 状況 | カテゴリ |
|---|---|
| テンプレあり・到達不能（33） | genitive（22/22）・article（11/11） |
| テンプレなし（209） | dative 14・participle 17・accusative 7・infinitive 11・**verb 48**・adjective 11・pronoun 12・nominative 10・vocative 5・clause 12（※節 discourse 経由で 5 種のみ間接カバー）・preposition 7・conjunction 12・particle 21・nominal_syntax 12・discourse 10 |

---

## 3. 品質評価（Audit 3）

存在する学習テキスト（47 テンプレート + registry フィールド）の品質:

| 観点 | 評価 | 詳細 |
|---|---|---|
| **Wallace 整合** | ✓ 矛盾なし | Phase 20 Fidelity 監査済みの registry と同一の分類語彙。テンプレ 47 文も Wallace の用法定義と矛盾しない |
| **Syntax（統語的理由）** | **✗ 意図的に不在** | テンプレは全て意味の要約（「〜を表しています」）で統語的根拠を含まない。これは「marker/confidence/文法用語を出さない」という Layer 1 の設計原則（コード内に明記）による。**ただし根拠を語れる素材（signals label_ja）は全 242 型に完備**しており、深層レイヤーで使える。registry 側では hint_ja に統語手掛かり語（格・冠詞・位置等）を欠く型が **33**（genitive.possessive・dative.sphere 等） |
| **Confidence の説明可能性** | △ | 3 段階文言の閾値が 242 型の実測分布と不整合（§1.2-5）。一方、confidence の「理由」を構成する signals label_ja + 加点値は全型で説明可能（Phase 20 Audit 4 で検証済み） |
| **Observation（何を見るべきか）** | △ データのみ | hint_ja が 235 型に存在（「εἰ + 節内直説法（ἄν 帰結なし）」等、観察指示として良質）だが非表示。薄い hint（12 字未満）が **28 型**（verb 系に集中: imperative_customary・purpose_clause 等） |
| **Related への導線** | △ データのみ | alternatives が 238 型に存在（Phase 20 で宙参照 0 を確認済み）だが UI 導線なし。「同じ構文を探す」リンクは型を引き継がない |
| **Example 対応** | ✓ データ完備 | example_verse を持つ 239 型すべてに example_greek + example_gloss が揃い、Phase 20 Audit 5 で**全例の実発火を検証済み**（偶然 PASS なし）。ただし非表示 |

---

## 4. 重複一覧（Audit 4）

**別カテゴリ間の高類似テキスト（bigram 類似 ≥0.75）: 6 ペア**

| ペア | 類似 | 判定 |
|---|---|---|
| conjunction.coordinating_inferential ↔ particle.inferential_oun | hint 1.00 | 多層設計による意図的並走（οὖν の接続詞層/小辞層）。**層の違い（何を説明する層か）を一言追記すべき** |
| conjunction.coordinating_explanatory ↔ particle.explanatory_gar | hint 1.00 | 同上（γάρ） |
| verb.voice_middle_reciprocal ↔ pronoun.reciprocal | hint 1.00 | 相互中動態と相互代名詞 — 別現象なので **hint の差別化が必要** |
| genitive.direct_object ↔ dative.direct_object | hint 0.91 | 格が異なる。「属格支配動詞/与格支配動詞」の語を hint に入れて差別化可 |
| nominative.vocative_nominative ↔ vocative.nominative_for_vocative | desc 0.95 | 同一現象の双方向登録（設計どおり）。相互参照の明示が望ましい |
| verb.purpose_clause ↔ clause.purpose_hina | desc 0.80 | 動詞層/節層の二層（設計どおり） |

**_WALLACE_TEXT テンプレート間: 2 ペア** — `PURPOSE`↔`RESULT`（0.80）: ἵνα 目的と ὥστε 結果の区別は Wallace が強調する学習ポイントであり、**文言の差別化価値が高い**。`GENITIVE_SUBJECTIVE`↔`OBJECTIVE`（0.87）: 主語的/目的語的属格は一語違いだが、この対比自体が Wallace 属格の最重要教育項目なので「動作名詞に注目」等の観察指示があると教育効果が上がる（いずれも現状は死蔵テンプレ）。

---

## 5. 難易度監査（Audit 5）

| 層 | 評価 | 根拠 |
|---|---|---|
| **初心者** | ○（設計思想は適切）/ △（空白が多い） | 「静寂優先」（出せる内容がなければ何も出さない）+ 文法用語ゼロの自然文は初心者に最適。ただし discourse 判定が付く節以外は読書メモ自体が出ないため、**最頻出の構文（καί 連結・主語・目的語・前置詞句）で一度も何も語られない** |
| **中級者** | **✗ 不足** | 形態グリッドと辞書はあるが、「この語がなぜこの用法か」（型名 label_ja・観察ポイント hint_ja・シグナル）に触れる経路がない。Wallace の用法名を学ぶ機会が StudyPanel 内に存在しない |
| **上級者** | **✗ 不足** | wallace_ref（GGBB 頁）・alternatives（競合解釈）・confidence 根拠（signals + 加点）が全型に整備済みなのに UI に出ない。syntax-search まで自力で移動する必要があり、型の引き継ぎもない |

---

## 6. Study Flow 監査（Audit 6 — 情報設計のみ）

現状のフロー: **分類（エンジン・非表示）→ 説明（discourse 1 文）→ 読書メモ（同じ 1 文）** — 説明と読書メモが同一文で、分類結果はユーザーに届かない。

不足している情報（UI 案ではなく情報の列挙）:

1. **型名の提示** — top 候補の label_ja（「所有の属格」）。読書メモ文と Wallace 分類を結ぶ最小の橋
2. **観察ポイント** — hint_ja / signals label_ja（「冠詞+分詞+性数格一致に注目」）。学習者が本文の何を見るべきか
3. **判定根拠** — signals_matched（発火したシグナルの label_ja 列挙）。confidence の理由を言語化する素材
4. **代表例との対応** — example_greek + example_gloss（「同じ構文: ὁ υἱὸς τοῦ ἀνθρώπου『人の子』」）。いま読んでいる箇所と定番例の往復
5. **関連構文への導線** — alternatives → 型指定つき syntax-search リンク（「対比: 目的語的属格も見る」）
6. **Wallace 参照** — wallace_ref（上級者の原典照合用）
7. **確度の語りの整合** — 3 段階文言の閾値を 242 型の実測分布（Contextual 0.25–0.35 帯 = 「参考程度の提案」）に対応させる語彙設計

---

## 7. 改善優先順位 Top20（Audit 8 — 改善効果順）

効果 = コーパス top 頻度（読者が遭遇する回数）× 現状の欠落度。S = 構造課題（複数型に波及）、個別型は「読書メモ経路なし × 高頻度」。

| # | 対象 | 頻度/影響 | 内容 |
|---|---|---|---|
| S1 | **token-top 候補 → 読書メモの経路新設**（情報設計） | 全 209 型 | 読書メモ選択に top 候補型を使う経路がないことが全欠落の根本 |
| S2 | **死蔵 33 テンプレの接続**（genitive 22 + article 11） | 属格は NT 最頻出の学習困難点 | テンプレは書き済み。到達経路の設計だけが欠けている |
| S3 | **確度文言の尺度整合** | 全 242 型 | 現尺度では 99% の型が同一文言になる |
| S4 | **hint_ja 薄い 28 型の増補**（verb 系中心） | verb は 48 型で最大カテゴリ | 観察指示として機能する長さ・具体性へ |
| S5 | **PURPOSE/RESULT テンプレ差別化** | ἵνα 689 + ὥστε 83 | Wallace が強調する目的/結果の区別を文言に反映 |
| 6 | conjunction.coordinating_additive | 8,183 | καί — 最頻出トークンに読書メモなし |
| 7 | verb.declarative | 6,361 | 平叙直説法 — 動詞の既定型 |
| 8 | accusative.direct_object | 5,804 | 目的語 — 初心者の第一関門 |
| 9 | nominal_syntax.modified_np | 4,379 | 修飾 NP — Extension 層の最頻出 |
| 10 | preposition.proper_with_accusative | 3,740 | 前置詞+対格 |
| 11 | discourse.backgrounding | 3,655 | 背景化 — 物語読解の核 |
| 12 | preposition.proper_with_genitive | 3,149 | 前置詞+属格 |
| 13 | nominative.subject | 3,115 | 主語 |
| 14 | preposition.proper_with_dative | 2,919 | 前置詞+与格 |
| 15 | discourse.foregrounding | 2,909 | 前景化（歴史的現在との連携） |
| 16 | pronoun.personal | 2,665 | 人称代名詞 |
| 17 | conjunction.coordinating_transition | 2,660 | δέ 転換 — 段落読解の鍵 |
| 18 | accusative.subject_of_infinitive | 2,398 | 不定詞の主語 — 中級者の壁 |
| 19 | dative.indirect_object | 2,211 | 間接目的語 |
| 20 | verb.historical_present | 1,515 | 歴史的現在 — 教育価値が最も高い動詞用法の一つ（foregrounding と併走） |

---

## 8. 推奨ロードマップ（情報設計のみ・実装は次フェーズの判断）

1. **Phase A（接続）**: 死蔵 33 テンプレ + registry ペイロードへの到達経路を情報設計する（S1・S2）。素材は全て監査済み・新規執筆ほぼ不要
2. **Phase B（高頻度 15 型）**: Top20 の個別型に _WALLACE_TEXT 文体（「ここでは、〜」）でテンプレを追加。1 型 1 文・意味論に踏み込まない現行原則を維持
3. **Phase C（深層の観察レイヤー）**: Level 2「単語を詳しく調べる」に hint_ja / signals / example_gloss / wallace_ref を段階開示する情報設計（初心者=Layer 1 のみ、中級=+観察、上級=+根拠と GGBB 頁）
4. **Phase D（整合）**: 確度文言の尺度、重複 hint の差別化（6 ペア）、薄い hint 28 型の増補、suggest マーカーの拡張（5 → 主要従属標識全体）

**結論: 教育コンテンツの素材（242 型 × 6 フィールド + 47 テンプレート）は Phase 20 監査済みの品質で存在するが、StudyPanel との接続がほぼゼロであることが唯一かつ最大の品質課題である。**
