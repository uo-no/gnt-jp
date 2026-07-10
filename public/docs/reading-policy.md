# Reading Policy — Wallace 242型 表示ポリシー

作成: 2026-07-10
根拠データ: NT全巻 7,939節の実測スキャン（ReadingSupportProjection の
words[*].categories に confidence ≥ 0.40 で出現した 211種 ＋ 未到達 31型）。

## 0. 唯一の真実（Single Source of Truth）

**機械可読な唯一の定義源は `assets/data/reading-policy.json` である。**
scope / priority / 現象グループ（phenomenon）/ 表示規則（display_rules）は
すべて同ファイルに定義され、UI（Passage Note / Phrase Reading / Observation）は
実行時にそれを読む。**コードの中に scope・priority を書くことは禁止。**
本書（reading-policy.md）は人が読む解説であり、両者が食い違う場合は JSON が正。

構造は「ID → 現象 → 文章」の3層である。複数のIDが同じ現象を検出する場合
（強調否定3ID等）、JSON が ID 群を1つの phenomenon に束ね、文テーブル
（コード側）は現象名 → 一文のみを持つ。

検出ロジック（SyntaxAnalyzer / PhraseAnalyzer / ClauseAnalyzer / registry）と
集約（ReadingSupportProjection）の責務には一切関与しない。
「Projection に集約された判定を、どの表示面に・どの優先度で出すか」だけを定める。

---

## 1. 表示面の定義

| 面 | タイミング | 役割 |
|---|---|---|
| **Passage Note** | 節を開いた瞬間（自動） | 節を読む前に知る価値がある情報のみ |
| **Phrase Reading** | 単語クリック時 | 「どこまでが一まとまりか」を句単位で示す |
| **Observation** | 単語クリック時 | その語を指さす一文（流れの入口） |
| （形態グリッド / XSC） | 単語クリック時 | priority: low の受け皿。自然文は出さない |

## 2. scope の決定規則（決定木）

新しい型を追加するときも、この順に判定して一度だけ分類する。

1. 複数語の呼応で成立し、**節の意味の強度・反転・骨格**に関わる → `verse`
2. **句（かたまり）として読む**と理解される現象（分詞句・前置詞句・属格関係・不定詞句） → `phrase`
3. **1語の語形・用法**のニュアンス → `word`
4. 節の骨格と語の指さしの両方に読書価値がある → `multiple`（verse＋word）

補則（Phase 1 で追加）: JSON の scope は文字列のほか**配列**（例:
`["verse","word"]`）でも書ける。`'multiple'` は `["verse","word"]` の別名で、
UI 側の `_policyScopes()` が正規化する。配列形は**表示面ごとに異なる文章を
持つ現象**に使う — verse 側は節の意味（`_VERSE_NOTE_TEXT`）、word 側は
その単語の役割（`_WORD_ROLE_TEXT`、節文の再利用は禁止）。第1号は
negative_emphasis（節=「決して〜ないと強く断言」、語= οὐ / μή / 動詞
それぞれの役割文）。

## 3. priority の定義（読書価値。文法的重要度ではない）

| priority | 定義 |
|---|---|
| **critical** | 知らないと誤読する（意味の反転・強度の喪失） |
| **high** | 流れ・構造の理解を大きく助ける／翻訳で消える情報 |
| **normal** | 知ると読みが深まるが、なくても誤読はしない |
| **low** | 通常読書では意識不要。形態グリッド等の非文章UIが担当 |
| **hidden** | 自然文を一切生成しない。Projection・検索・将来の上級者モードでのみ利用 |

補則1: NT の過半の節で発火する判定（discourse.left_dislocation 5.6万件、
foregrounding / backgrounding 各1万件超、verb.declarative 8.8千件）は
情報量ゼロとして hidden に固定する。
補則2: hidden の基準は ①節の過半で発火 ②純粋な内部構造情報（NP構造・
格支配・限定/述語位置の構造標識）のいずれか。low との違いは
「low は語をクリックした学習者に形態グリッド等で見せる価値が残る、
hidden はデータとしてのみ存在する」こと。上級者モード実装時は
hidden を表示に昇格できる（JSON の priorities 配列に既に定義済み）。

## 4. 表示面への割当規則

この規則は reading-policy.json の `display_rules` に機械可読で定義されている。

照合は**正規化後の原子スコープ**で行う（`'multiple'`・配列は含まれる原子
スコープで一致判定）。

- **Passage Note** ＝ 正規化スコープに `verse` を含む × priority:`critical`/`high` ×
  `verse_source: "projection"`（confidence ≥ min_confidence = 0.40）。
  `verse_source: "discourse"` の現象（γάρ/ὅτι/ἵνα/ὡς 系）は既存 ClauseAnalyzer
  経路が節文の正典で、Projection 走査からは出さない（言い換え重複の禁止）
- **Phrase Reading** ＝ 正規化スコープに `phrase` を含む × priority:`critical`/`high`/`normal`
- **Observation** ＝ 正規化スコープに `word` を含む × priority:`critical`/`high`/`normal`
- **low / hidden はどの面にも自然文を出さない**（low は形態グリッド・XSC が担当、
  hidden はデータのみ）
- 静寂原則を維持: 言うことがない節・語では何も出さない。フォールバック文の禁止

## 5. 現象グループ（同一文・重複排除）

同一の読書現象を複数IDが検出する場合、**IDごとではなく現象グループごとに1文**とする。
同グループのIDは同じ文にマップし、文単位の重複排除で1回だけ表示する。
Passage Note に出た現象は Observation では出さない（実装済みゲート）。

| グループ | 所属ID |
|---|---|
| 強調否定 οὐ μή | particle.emphatic_negative / particle.double_negative / verb.emphatic_negation |
| μέν…δέ 対比 | discourse.contrast_men_de / conjunction.correlative_men_de / particle.correlative_men / particle.correlative_de（Phase 2 で4IDを men_de_contrast に統合。scope ["verse","word"]） |
| 挿入句 | discourse.explanatory_parenthesis / discourse.parenthetical |
| 理由 γάρ | particle.explanatory_gar / conjunction.coordinating_explanatory（word）＋ 既存 discourse 経路（verse） |
| 推論 οὖν | particle.inferential_oun / conjunction.coordinating_inferential |
| 条件 | clause.conditional_1〜4類（verse＋word）、conjunction.subordinating_conditional / particle.particle_ean / verb.conditional_subjunctive（補助） |
| 目的 | clause.purpose_hina / conjunction.subordinating_purpose / infinitive.purpose / verb.purpose_clause |
| 結果 | clause.result_hoste / conjunction.subordinating_result / infinitive.result |
| 内容・時・比較 | clause.substantival_hoti 系 / temporal 系 / comparative 系＋対応する conjunction |
| 属格絶対 | participle.genitive_absolute / genitive.absolute |

注: γάρ / ὅτι / ἵνα / ὡς 系の**節文は既存の ClauseAnalyzer discourse 経路が担当**する。
Projection 走査からは同じ現象の verse 文を追加しない（言い換え重複の禁止）。

---

## 6. 全242型ポリシー表

「※未到達」= NT実測で confidence ≥ 0.40 の首位実績なし（検出が到達したら本表の通り扱う）。

### particle（19型）

| ID | scope | priority | 理由 |
|---|---|---|---|
| particle.emphatic_negative | verse | critical | οὐ μή。節全体の否定の強度を左右する |
| particle.double_negative ※未到達(maxConf0.30) | verse | critical | 同グループの保険。emphatic 側が常に上回る |
| particle.particle_an | word | high | 反実の響き。条件文の理解に必須 |
| particle.explanatory_gar | word | high | γάρ 理由の開始点の指さし |
| particle.inferential_oun | word | high | οὖν「だから」の流れ |
| particle.emphatic_ge | word | high | γε「まさに〜こそ」。訳で消える |
| particle.restrictive_monon | word | high | 「〜だけ」の限定は意味を左右する |
| particle.rhetorical_particle | word | normal | 強い修辞的否定 |
| particle.correlative_men | ["verse","word"] | high | Phase 2 で men_de_contrast に統合。μέν の役割文 |
| particle.correlative_de | ["verse","word"] | high | Phase 2 で men_de_contrast に統合。δέ の役割文 |
| particle.attention_de | word | normal | ἰδού 系の注意喚起 |
| particle.assertive_de | word | normal | 断定の小辞（稀） |
| particle.deliberative_particle | word | normal | 熟慮疑問の標識 |
| particle.interrogative_particle | word | normal | 疑問標識 |
| particle.emphasis_per ※未到達 | word | normal | 強意小辞 περ（稀） |
| particle.emphasis_toi ※未到達 | word | normal | 強意小辞 τοι（稀） |
| particle.negative_ou | word | low | 通常の否定。訳で自明 |
| particle.negative_me | word | low | 同上（禁止は verb.prohibitory が担当） |
| particle.continuative_de | word | low | 最頻の δέ 継続 |
| particle.connective_te | word | low | 連結 τε |
| particle.particle_ean | word | low | 条件グループ（節レベル）が担当 |

### verb（49型）

| ID | scope | priority | 理由 |
|---|---|---|---|
| verb.emphatic_negation | verse | critical | οὐ μή＋接続法（強調否定グループ） |
| verb.historical_present | word | high | 物語の臨場感。訳で消える |
| verb.hortatory | word | high | 「〜しよう」。直説法と誤読しやすい |
| verb.prohibitory | word | high | 禁止「〜するな」の型 |
| verb.future_imperatival | word | high | 未来形の命令「〜すべし」 |
| verb.imperative_permissive | word | high | 許容「〜させておけ」。命令と誤読 |
| verb.imperfect_conative | word | high | 未遂「〜しようとした」。完遂と誤読 |
| verb.potential_optative | word | high | 可能性の希求法（μὴ γένοιτο 等） |
| verb.wish_optative | word | high | 祈願「〜ならんことを」 |
| verb.voice_permissive_passive | word | high | 「〜されるままになる」 |
| verb.gnomic_present | word | normal | 格言的現在。単語説明として十分 |
| verb.present_progressive | word | normal | 進行 |
| verb.present_customary | word | normal | 習慣 |
| verb.imperfect_ingressive | word | normal | 起動「〜し始めた」 |
| verb.imperfect_iterative | word | normal | 反復 |
| verb.imperfect_progressive | word | normal | 過去進行 |
| verb.aorist_constative | word | normal | 全体把握のアオリスト |
| verb.aorist_culminative | word | normal | 完結の強調 |
| verb.aorist_ingressive | word | normal | 起動「〜になった」 |
| verb.epistolary_aorist | word | normal | 手紙の慣用時制 |
| verb.perfect_intensive | word | normal | 結果状態（アスペクトUIも担当） |
| verb.perfect_extensive | word | normal | 完了動作の強調 |
| verb.pluperfect_intensive | word | normal | 過去の結果状態 |
| verb.pluperfect_extensive | word | normal | 同上 |
| verb.future_deliberative | word | normal | 熟慮の未来 |
| verb.deliberative | word | normal | 熟慮の接続法 |
| verb.imperative_urgency | word | normal | 切迫の命令 |
| verb.optative_indirect_discourse | word | normal | 間接話法の希求法 |
| verb.voice_middle_direct | word | normal | 直接中動 |
| verb.voice_middle_reflexive | word | normal | 再帰中動 |
| verb.voice_middle_reciprocal | word | normal | 相互中動 |
| verb.aorist_gnomic ※未到達 | word | normal | 格言的アオリスト |
| verb.dramatic_aorist ※未到達 | word | normal | 劇的アオリスト |
| verb.future_gnomic ※未到達 | word | normal | 格言的未来 |
| verb.futuristic_present ※未到達 | word | normal | 未来的現在 |
| verb.imperative_ingressive ※未到達 | word | normal | 起動命令 |
| verb.imperfect_customary ※未到達 | word | normal | 習慣的未完了 |
| verb.perfect_dramatic ※未到達 | word | normal | 劇的完了 |
| verb.present_iterative ※未到達 | word | normal | 反復的現在 |
| verb.indefinite_relative | word | low | 不定関係の接続法 |
| verb.future_predictive | word | low | 予告の未来。訳で自明 |
| verb.imperative_constative | word | low | 命令法の基本 |
| verb.imperative_customary | word | low | 同上 |
| verb.conditional_subjunctive | word | low | 条件グループ（節側）が担当 |
| verb.purpose_clause | word | low | 目的グループ（節側）が担当 |
| verb.declarative | word | hidden | 平叙（8,837件・情報量なし） |
| verb.voice_passive | word | low | 受動は訳で自明 |
| verb.voice_active ※未到達 | word | hidden | 単純能動（情報量なし） |

### clause（12型）

| ID | scope | priority | 理由 |
|---|---|---|---|
| clause.conditional_second_class | multiple | critical | 反実仮想。事実の逆を仮定 — 知らないと誤読 |
| clause.conditional_first_class | multiple | high | 議論上「事実」と仮定する条件。訳の「もし」より強い |
| clause.purpose_hina | multiple | high | 目的の枠組み（verse文は既存 discourse 経路） |
| clause.causal_hoti | multiple | high | 理由の枠組み（同上） |
| clause.result_hoste | multiple | high | 結果の枠組み（同上） |
| clause.conditional_third_class | multiple | normal | 不確定条件。訳の「もし」と概ね一致 |
| clause.conditional_fourth_class | multiple | normal | 希求法条件（稀） |
| clause.substantival_hoti | multiple | normal | 内容節。訳で自明なことが多い |
| clause.temporal_hotan | multiple | normal | 時の枠組み |
| clause.temporal_hote | multiple | normal | 同上 |
| clause.comparative_kathos | multiple | normal | 比較・たとえの枠組み |
| clause.adjectival_relative | word | low | 関係節は訳で自明（1,551件） |

### conjunction（12型）

| ID | scope | priority | 理由 |
|---|---|---|---|
| conjunction.correlative_men_de | ["verse","word"] | high | μέν…δέ 対比の骨格（conf 0.75）。Phase 2 で word 側に役割文 |
| conjunction.coordinating_adversative | word | high | 話の転換点の指さし |
| conjunction.coordinating_explanatory | word | high | γάρ（節文は discourse 経路） |
| conjunction.coordinating_inferential | word | high | οὖν「だから」 |
| conjunction.subordinating_purpose | word | high | ἵνα の指さし（目的グループ） |
| conjunction.subordinating_result | word | high | ὥστε の指さし |
| conjunction.subordinating_conditional | word | high | 条件の入口の指さし（類別は clause.* が担当） |
| conjunction.subordinating_content | word | normal | 内容節の入口 |
| conjunction.subordinating_temporal | word | normal | 時節の入口 |
| conjunction.subordinating_comparative | word | normal | 比較の入口 |
| conjunction.coordinating_transition | word | normal | 話の進行 |
| conjunction.coordinating_additive | word | low | καί（8,183件・自明） |

### discourse（10型）

| ID | scope | priority | 理由 |
|---|---|---|---|
| discourse.contrast_men_de | ["verse","word"] | high | 対比の骨格（μέν…δέ グループ）。Phase 2 で word 側に役割文 |
| discourse.emphasis_word_order | verse | high | 語順による強調。翻訳で消える |
| discourse.explanatory_parenthesis | ["verse","word"] | high | 挿入説明。構文が切れる理由が分かる。Phase 2 で word 側に役割文 |
| discourse.parenthetical | ["verse","word"] | high | 挿入句（同グループ）。Phase 2 で word 側に役割文 |
| discourse.focus_fronting | word | normal | 前置焦点 |
| discourse.topic_fronting | word | normal | 主題前置 |
| discourse.right_dislocation | word | low | 後置。読書価値小 |
| discourse.left_dislocation | word | hidden | 5.6万件＝ほぼ全節で発火。情報量なし |
| discourse.foregrounding | word | hidden | 1.2万件。同上 |
| discourse.backgrounding | word | hidden | 1.1万件。同上 |

### participle（17型）

| ID | scope | priority | 理由 |
|---|---|---|---|
| participle.genitive_absolute | phrase | high | 属格絶対。句単位で理解すべき（conf 0.99） |
| participle.periphrastic | phrase | high | ἦν＋分詞＝一つの動詞として読む |
| participle.adverbial_concessive | phrase | high | 譲歩「〜にもかかわらず」。誤読防止 |
| participle.adverbial_causal | phrase | high | 理由「〜なので」。訳に出にくい |
| participle.adverbial_conditional | phrase | high | 条件の分詞 |
| participle.adverbial_purpose_result | phrase | high | 目的・結果の分詞 |
| participle.imperatival | word | high | 分詞の命令用法（ロマ12章等） |
| participle.substantival | phrase | normal | 「〜する者」のかたまり |
| participle.attributive | phrase | normal | 名詞修飾のかたまり |
| participle.adverbial_temporal | phrase | normal | 「〜してから／しながら」 |
| participle.adverbial_manner | phrase | normal | 様態 |
| participle.indirect_discourse | phrase | normal | 間接話法の分詞 |
| participle.complementary | word | normal | 補語の分詞 |
| participle.redundant | word | normal | 「答えて言った」冗語法 |
| participle.adverbial_means ※未到達 | phrase | normal | 手段の分詞 |
| participle.predicate ※未到達 | word | normal | 述語的分詞 |
| participle.adverbial_attendant | phrase | low | 付帯状況（デフォルト推定） |

### genitive（22型）

| ID | scope | priority | 理由 |
|---|---|---|---|
| genitive.absolute | phrase | high | 属格絶対（participle 側と同グループ） |
| genitive.subjective | phrase | high | 「神の愛」＝神が愛する。解釈を左右 |
| genitive.attributed | phrase | high | 語順逆転の強調（稀・価値大） |
| genitive.objective ※未到達 | phrase | high | 「〜への」対象。subjective と対で解釈を左右 |
| genitive.partitive | phrase | normal | 全体の中の一部 |
| genitive.descriptive | phrase | normal | 性質の描写 |
| genitive.content | phrase | normal | 中身 |
| genitive.material | phrase | normal | 材料 |
| genitive.means | phrase | normal | 手段 |
| genitive.agency | phrase | normal | 行為者 |
| genitive.predicate | word | normal | 「〜のものである」 |
| genitive.time | word | normal | 時 |
| genitive.place | word | normal | 場所 |
| genitive.plenary ※未到達 | phrase | normal | 両義の広がり |
| genitive.epexegetical ※未到達 | phrase | normal | 言いかえ |
| genitive.relationship ※未到達 | phrase | normal | 間柄 |
| genitive.source ※未到達 | phrase | normal | 出どころ |
| genitive.attributive ※未到達 | phrase | normal | ヘブライ語的特徴づけ |
| genitive.comparison | word | low | 「〜より」は訳で自明 |
| genitive.separation | word | low | 分離。訳で自明 |
| genitive.possessive | phrase | low | 「〜の」最頻（7,302件）・自明 |
| genitive.direct_object | word | hidden | 動詞の格支配のデータのみ |

### infinitive（11型）

| ID | scope | priority | 理由 |
|---|---|---|---|
| infinitive.purpose | phrase | high | 「〜するために」のかたまり |
| infinitive.result | phrase | high | 結果 |
| infinitive.cause | phrase | high | διὰ τό＋不定詞の理由。訳に出にくい |
| infinitive.imperatival | word | high | 不定詞の命令用法。誤読防止 |
| infinitive.time | phrase | normal | ἐν τῷ／πρὸ τοῦ の時 |
| infinitive.epexegetical | phrase | normal | 説明の不定詞 |
| infinitive.indirect_discourse | phrase | normal | 間接話法 |
| infinitive.subject | word | normal | 主語の不定詞 |
| infinitive.means ※未到達 | phrase | normal | 手段 |
| infinitive.complementary | word | low | θέλω＋不定詞等。自明 |
| infinitive.articular | phrase | low | 冠詞付き構造（情報のみ） |

### article（11型）

| ID | scope | priority | 理由 |
|---|---|---|---|
| article.granville_sharp | word | high | 二冠詞規則。2つの称号が同一人物を指す |
| article.colwell | word | high | 語順と冠詞（θεὸς ἦν ὁ λόγος の解釈） |
| article.kataphoric | word | normal | 後で説明されるものを先に指す |
| article.previous_reference | word | normal | 前出参照。文脈追跡を助ける |
| article.par_excellence | word | normal | 代表的存在 |
| article.monadic | word | low | 唯一物。訳で自明 |
| article.simple_identification | word | low | 最頻（12,175件）・基本 |
| article.well_known | word | low | 周知 |
| article.abstract | word | low | 抽象 |
| article.deictic | word | low | 指示 |
| article.generic | word | low | 読書の流れへの影響は小さい |

### nominative（10型）

| ID | scope | priority | 理由 |
|---|---|---|---|
| nominative.pendens | ["verse","word"] | high | 懸垂主格。文の仕切り直し。Phase 2 で word 側に役割文 |
| nominative.predicate_nominative | word | normal | 述語主格 |
| nominative.apposition | word | normal | 同格 |
| nominative.nominative_absolute | word | normal | 独立主格（表題等） |
| nominative.exclamation | word | normal | 感嘆 |
| nominative.title_nominative | word | normal | 称号 |
| nominative.vocative_nominative | word | normal | 呼びかけの主格 |
| nominative.subject | word | low | 基本（5,231件） |
| nominative.indeclinable | word | low | 無変化語 |
| nominative.subject_with_infinitive | word | low | 稀・文法詳細 |

### accusative（7型）

| ID | scope | priority | 理由 |
|---|---|---|---|
| accusative.subject_of_infinitive | word | high | 不定詞の主語は対格。主語／目的語の取り違えを防ぐ |
| accusative.adverbial | word | normal | 副詞的対格「〜の間」等 |
| accusative.cognate | word | normal | 同族目的語の強調 |
| accusative.double_person_thing | word | normal | 「AをBに」の二重対格 |
| accusative.object_complement | word | normal | 「AをBと呼ぶ」構造 |
| accusative.predicate | word | normal | 述語対格 |
| accusative.direct_object | word | hidden | 格支配のデータのみ（11,891件） |

### dative（14型）

| ID | scope | priority | 理由 |
|---|---|---|---|
| dative.agent | word | high | 行為者与格（完了受動と共起）。誤読しやすい |
| dative.means | word | normal | 手段「〜によって」 |
| dative.possession | word | normal | 「〜には〜がある」構文 |
| dative.association | word | normal | 「〜と共に」 |
| dative.reference | word | normal | 観点 |
| dative.sphere | word | normal | 領域 |
| dative.time | word | normal | 「三日目に」 |
| dative.manner | word | normal | 様態 |
| dative.interest_advantage | word | normal | 利益 |
| dative.interest_disadvantage | word | normal | 不利益 |
| dative.indirect_object | word | low | 基本（3,750件） |
| dative.direct_object | word | hidden | 動詞の格支配のデータのみ |
| dative.measure | word | low | 程度差 |
| dative.ethical | word | low | ニュアンス小 |

### pronoun（12型）

| ID | scope | priority | 理由 |
|---|---|---|---|
| pronoun.intensive | word | normal | αὐτός 強意「〜自身」 |
| pronoun.identical | word | normal | ὁ αὐτός「同じ」。人称代名詞との混同防止 |
| pronoun.demonstrative | word | normal | 指示 |
| pronoun.reflexive | word | normal | 再帰 |
| pronoun.reciprocal | word | normal | 「互いに」 |
| pronoun.distributive | word | normal | 配分 |
| pronoun.reciprocal_emphasis ※未到達 | word | normal | 相互強調 |
| pronoun.personal | word | low | 最頻（10,100件） |
| pronoun.relative | word | low | 訳で自明 |
| pronoun.indefinite | word | low | 不定 |
| pronoun.interrogative | word | low | 疑問 |
| pronoun.possessive_pronoun | word | low | 所有 |

### adjective（11型）

| ID | scope | priority | 理由 |
|---|---|---|---|
| adjective.substantival | word | normal | 「〜な者」の名詞化 |
| adjective.predicate | word | normal | 限定／述語の区別が訳を分ける場合がある |
| adjective.comparative | word | normal | 比較級（コイネーでは最上級相当のことも） |
| adjective.superlative | word | normal | 最上級（強意のことも） |
| adjective.attributive | word | low | 基本 |
| adjective.epithet | word | low | 修飾の一種 |
| adjective.genitive_complement | word | low | 文法詳細 |
| adjective.attributive_position ※未到達 | word | hidden | 構造標識（データのみ） |
| adjective.predicate_position ※未到達 | word | hidden | 構造標識（データのみ） |
| adjective.proper_adjective ※未到達 | word | low | 基本 |
| adjective.restrictive ※未到達 | word | low | 保守的判定 |

### preposition（7型）

| ID | scope | priority | 理由 |
|---|---|---|---|
| preposition.attributive_pp | phrase | normal | 前置詞句が名詞を修飾「天にいます父」 |
| preposition.substantival_pp | phrase | normal | 前置詞句の名詞化 |
| preposition.proper_with_accusative | phrase | hidden | 格支配のデータのみ（PP の訳出は既存処理が担当） |
| preposition.proper_with_dative | phrase | hidden | 同上 |
| preposition.proper_with_genitive | phrase | hidden | 同上 |
| preposition.improper | phrase | hidden | 副詞由来前置詞（構造情報） |
| preposition.adverbial_pp | phrase | hidden | 副詞的 PP（構造情報） |

### nominal_syntax（12型）

| ID | scope | priority | 理由 |
|---|---|---|---|
| nominal_syntax.appositional_np | phrase | normal | 同格「神の子イエス」 |
| nominal_syntax.substantival_phrase | phrase | normal | 名詞化句 |
| nominal_syntax.simple_np | phrase | hidden | NP構造は Phrase Reading の引用生成の内部情報 |
| nominal_syntax.articular_np | phrase | hidden | 同上 |
| nominal_syntax.modified_np | phrase | hidden | 同上 |
| nominal_syntax.multiple_modifier_np | phrase | hidden | 同上 |
| nominal_syntax.nested_np | phrase | hidden | 同上 |
| nominal_syntax.complex_np | phrase | hidden | 同上 |
| nominal_syntax.vocative_np | phrase | hidden | vocative.direct_address が担当 |
| nominal_syntax.anarthrous_np ※未到達 | phrase | hidden | 構造情報 |
| nominal_syntax.head_final_np ※未到達 | phrase | hidden | 構造情報 |
| nominal_syntax.head_initial_np ※未到達 | phrase | hidden | 構造情報 |

### vocative（5型）

| ID | scope | priority | 理由 |
|---|---|---|---|
| vocative.direct_address | word | normal | 呼びかけ＝対話構造の認識 |
| vocative.exclamatory | word | normal | 感嘆の呼格 |
| vocative.with_o | word | normal | ὦ＋呼格の感情 |
| vocative.chain ※未到達 | word | normal | 呼格連鎖 |
| vocative.nominative_for_vocative ※未到達 | word | low | 形態論的詳細 |

---

## 7. ③ Passage Note 自動表示一覧（verse × critical/high）

### Projection 走査で表示（本ポリシーによる追加対象）

| ID | priority | 表示文の方向性 |
|---|---|---|
| particle.emphatic_negative / particle.double_negative / verb.emphatic_negation | critical | 「打ち消しを二つ重ねて『決して〜ない』」（実装済み） |
| clause.conditional_second_class | critical | 「実際とは違う『もし〜だったなら』の話」 |
| clause.conditional_first_class | high | 「この条件は事実として仮定されている」 |
| discourse.contrast_men_de / conjunction.correlative_men_de | high | 「二つのことが対にして語られている」 |
| discourse.emphasis_word_order | high | 「ことばの順序による強調がある」 |
| discourse.explanatory_parenthesis / discourse.parenthetical | high | 「途中に説明の挿入がある」 |
| nominative.pendens | high | 「最初に主題が置かれ、あとで受け直される」 |

### 既存 ClauseAnalyzer discourse 経路で表示済み（Projection からは追加しない）

γάρ（理由・物語背景）/ ὅτι（内容・理由）/ ἵνα・ὅπως（目的）/ ὡς・ὥσπερ（たとえ・時・理由）
→ clause.purpose_hina / causal_hoti / result_hoste / substantival_hoti 等の verse 側はこの経路が正典。

## 8. ④ Observation 表示一覧（word × critical/high/normal）

**high（優先整備）**: particle.particle_an / explanatory_gar / inferential_oun / emphatic_ge / restrictive_monon、
conjunction.coordinating_adversative / coordinating_explanatory / coordinating_inferential /
subordinating_purpose / subordinating_result / subordinating_conditional、
verb.historical_present / hortatory / prohibitory / future_imperatival / imperative_permissive /
imperfect_conative / potential_optative / wish_optative / voice_permissive_passive、
participle.imperatival、infinitive.imperatival、article.granville_sharp / colwell、
dative.agent、accusative.subject_of_infinitive、
clause.*（multiple の word 側: 条件・目的・理由・結果等の入口の指さし — 現行実装済み）

**normal（順次整備）**: 上表で word × normal の全ID
（verb の時制ニュアンス群、pronoun.intensive / identical、article.kataphoric / previous_reference、
dative / accusative の用法群、vocative.direct_address ほか）

**表示しない**: word × low の全ID（形態グリッド・XSC が担当）

## 9. ⑤ Phrase Reading 表示一覧（phrase × critical/high/normal）

**high**: participle.genitive_absolute / genitive.absolute（属格絶対）、participle.periphrastic、
participle.adverbial_concessive / adverbial_causal / adverbial_conditional / adverbial_purpose_result、
infinitive.purpose / result / cause、genitive.subjective / attributed（/ objective ※未到達）

**normal**: participle.substantival / attributive / adverbial_temporal / adverbial_manner /
indirect_discourse（/ adverbial_means ※未到達）、
infinitive.time / epexegetical / indirect_discourse（/ means ※未到達）、
genitive.partitive / descriptive / content / material / means / agency
（/ plenary / epexegetical / relationship / source / attributive ※未到達）、
preposition.attributive_pp / substantival_pp、
nominal_syntax.appositional_np / substantival_phrase

**表示しない（構造情報として内部利用のみ）**: phrase × low の全ID
（nominal_syntax の NP 構造群、preposition.proper_with_*、genitive.possessive、
participle.adverbial_attendant、infinitive.articular）

---

## 10. 運用ルール

1. **新しい型を registry に追加したとき**: §2 の決定木で scope、§3 の定義で priority を
   一度だけ決め、**reading-policy.json の phenomena に1件追加**する（既存現象の
   検出IDが増えただけなら、その現象の ids 配列に追記するだけ）。表示文が必要な
   スコープなら、対応する文テーブル（現象名 → 一文）に1行足す。
   Analyzer / Projection / 表示ロジックのコード変更は不要。
2. **未到達31型が到達可能になったとき**: JSON の分類のまま自動的に表示に入る。
   再設計は不要。
3. **scope / priority の変更**: 読書上の価値の再評価があった場合のみ。
   **reading-policy.json を先に更新**し、本書 §6 の表を追随させる（逆順は禁止）。
   コード内に scope・priority を書くことは常に禁止。
4. **重複の管理**: 新しい現象グループを作る場合は JSON の phenomena に ids 配列で
   定義し、§5 に解説を追記する。同一現象は同一文・1回表示が原則。
   Passage Note と Observation の排他は display_rules の scope 規則が保証する。
5. **反復（repetition）等の未実装現象**: registry に検出IDが存在しないため本書の対象外。
   検出が実装された時点で §2 の決定木により分類する。
6. **hidden の昇格**: 上級者モード等で hidden を表示する場合も、コードではなく
   display_rules の priorities 配列にモード別の規則を追加して実現する。

---

## 11. v1.0 Final Freeze（2026-07-11 凍結）

本節の凍結時点をもって Reading Memo v1.0 とする。以後の変更は v1.1 として扱う。

### 最終表示率（NT全巻 7,939節・実測）

| 面 | 表示率 |
|---|---|
| Passage Note（projection 経路） | **746節（9.4%）** |
| Passage Note（discourse 経路） | 1,784節（22.5%） |
| Observation | 9,282 / 137,741 トークン（6.7%） |
| 節文と語文の同一文二重表示 | 0件 |

projection 経路の現象別内訳: conditional_assumed_true 385 / parenthesis 129 /
men_de_contrast 94 / negative_emphasis 86 / conditional_counterfactual 37 /
nominative_pendens 35。

### 凍結時の設計判断（emphasis_word_order の priority 引き下げ）

v1.0 最終監査により `discourse.emphasis_word_order` の priority を high → normal
に変更し、Passage Note の自動表示から外した（発火605節が対象。うち514節は
節文が完全に消え、91節は他現象の節文が残る）。

理由: 検出条件「節頭の斜格＋後続定形動詞」は、関係代名詞（ὅς 204件・31%）・
疑問詞・前接代名詞など**義務的に節頭へ立つ語**を「強調の前置」と誤認する。
除外605節から30節を抽出して個別評価した結果、約半数は誤検出（除外が適切）、
約3分の1は正当な強調前置（ヘブル11:23 Πίστει、ルカ22:48 φιλήματι、
ヘブル2:5 Οὐ γὰρ ἀγγέλοις 等 — v1.1 での復帰対象）だった。節を開いた瞬間に
自動表示される面で誤り率が約半分に達することは静寂原則
（言うことがある時だけ正しく話す）に反するため、表示を保留した。
検出自体（Analyzer / Projection / registry）には手を入れていない。

### v1.1 方針

1. **emphasis_word_order の復帰**: Analyzer の `fronted_constituent()` に
   「義務的節頭語（関係代名詞・疑問詞・前接語）の除外」を加えた上で、
   priority を high に戻す。正当な名詞前置（約400件）が回復する。
2. **Phrase Reading の意味層**: §9 の phrase×high（属格絶対・迂言法・
   目的/結果/理由の不定詞）の文言整備。
3. **Observation word×high の残り**: historical_present / hortatory /
   prohibitory / granville_sharp / wish_optative 等の文言整備。
4. **UNCLASSIFIED resonance の体験改善**: 汎用文「状況や背景が補足されています」
   の静寂化または語固有文の整備（表示率の再測定とセットで）。
5. いずれも本書 §2〜§4 の決定木・規則の範囲内で行い、ポリシーの構造変更は
   伴わない。
