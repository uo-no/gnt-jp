# 属格・与格・分詞の一次個別監査（Phase 1）

- 対象レジストリ: `public/assets/data/syntax-registry.json`（main blob `a80206bbed9ea37880dcc19fc55e838862c773e8`）
- 対象: 53 ラベル（属格・与格・分詞）
- 目的: 80%リリース品質のため、各ラベルの判定対象と現行条件が実際に示すことを分けて記録する。
- **これは条件式とレジストリ記述に基づく一次監査であり、コーパス上の精度評価でも、Wallace本文の全記述との照合完了でもない。** Wallace参照はレジストリに記録された節・ページを示す。例文のラベル自体が正しいかは、別途本文・文法書で検証する。

## 共通判定基準

- **構造的事実:** 格・冠詞・分詞形・節内位置・ヘッド候補・動詞の支配など、解析器が直接観測できる事項。
- **意味的推定:** 所有／性質／部分、主語的／目的語的、手段／様態、時間／原因／譲歩など、文脈と語彙意味を必要とする解釈。
- **候補シグナル:** 抽象名詞、特定の動詞・名詞リスト、時制、冠詞、接続小辞。これらは原則として必要十分条件ではない。
- **unsupported:** 意味判定器が未実装の場合、偽と評価して候補を落とすのではなく、判定不能として保持する。
- **重要な検査点:** `conditions` に肯定条件と否定条件が同時に登録されているタイプや、複数条件が別々の意味を示すタイプは、スコアラーがどのように集約するかをコードと実例で検証する。

## 集計

| 対象 | 件数 |
|---|---:|
| 属格 | 22 |
| 与格 | 14 |
| 分詞 | 17 |
| 未実装の意味判定を含む | 5 |

## 個別監査表


### genitive

| ID / ラベル | 判定対象（暫定） | 現行条件が観測するもの | 主なリスク／必要な検証 | 登録例 | Wallace参照 | 既存分類 |
|---|---|---|---|---|---|---|
| `genitive.possessive` / 所有属格 | 名詞句内の意味関係 | has_adnominal_head(); article_agrees_case_gender_number(); NOT governed_by_prep(); governed_by_prep() | ヘッド関係や抽象名詞などは手掛かりであり、所有・性質・部分・同格の意味関係を単独で確定しない。 | MAT 5:3 | §4.A.1 (pp.81–83) | Semantic |
| `genitive.descriptive` / 描写的属格 | 名詞句内の意味関係 | has_adnominal_head(); target_is_abstract_noun(); NOT governed_by_prep(); governed_by_prep() | ヘッド関係や抽象名詞などは手掛かりであり、所有・性質・部分・同格の意味関係を単独で確定しない。 | ROM 7:24 | §4.A.2 (pp.79–81) | Semantic |
| `genitive.partitive` / 部分属格 | 名詞句内の意味関係 | head_lemma_in_list('partitive_trigger_lemmas'); NOT governed_by_prep(); target_number_eq('plural') | ヘッド関係や抽象名詞などは手掛かりであり、所有・性質・部分・同格の意味関係を単独で確定しない。 | ROM 11:17 | §4.A.5 (pp.84–86) | Semantic |
| `genitive.attributive` / 属性属格（ヘブライ語的） | 名詞句内の意味関係 | target_is_abstract_noun(); has_adjectival_equivalent(); context_discourse_type_eq('semitic') | 現行条件に未実装の意味判定が含まれる。該当条件は一致／不一致にせず unsupported とし、候補確定の根拠にしない。 | ROM 6:6 | §4.A.3 (pp.86–88) | Hybrid |
| `genitive.epexegetical` / 説明的同格属格 | 名詞句内の意味関係 | semantic_equivalence_test(); head_lemma_in_list('abstract_symbol_lemmas'); semantic_equivalence_test() | 現行条件に未実装の意味判定が含まれる。該当条件は一致／不一致にせず unsupported とし、候補確定の根拠にしない。 | ROM 4:11 | §4.A.9 (pp.94–100) | Semantic |
| `genitive.relationship` / 関係属格 | 名詞句内の意味関係 | head_lemma_in_list('kinship_head_lemmas'); target_is_proper_noun() | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | MAT 1:1 | §4.A.1 sub (pp.83–84) | 未分類 |
| `genitive.material` / 材料属格 | 名詞句内の意味関係 | target_lemma_in_list('material_noun_lemmas'); has_adnominal_head() | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | REV 18:12 | §4.A.6 (pp.88–90) | 未分類 |
| `genitive.content` / 内容属格 | 名詞句内の意味関係 | head_lemma_in_list('container_noun_lemmas'); context_verb_lemma_in_list('filling_verb_lemmas') | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | JHN 21:8 | §4.A.7 (pp.90–92) | 未分類 |
| `genitive.attributed` / 被属性属格（逆転） | 名詞句内の意味関係 | head_lemma_in_list('attributed_head_lemmas') | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | ROM 6:4 | §4.A.4 (pp.88) | 未分類 |
| `genitive.predicate` / 述語属格 | 構造・形態中心 | context_has_copula(); NOT has_adnominal_head() | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | 1CO 6:19 | §4.A.12 (pp.100–101) | 未分類 |
| `genitive.subjective` / 主語的属格 | 名詞句内の意味関係 | head_lemma_in_list('action_noun_lemmas'); target_pos_eq('P'); target_is_proper_noun(); head_lemma_in_list('action_noun_lemmas') | 動作名詞の存在だけでは主語的／目的語的／複合の区別を確定できない。動作主・対象の意味役割を例文ごとに確認する。 | ROM 8:35 | §4.B.1 (pp.112–116) | Semantic |
| `genitive.objective` / 目的語的属格 | 名詞句内の意味関係 | head_lemma_in_list('action_noun_lemmas'); target_is_proper_noun(); head_lemma_in_list('action_noun_lemmas') | 動作名詞の存在だけでは主語的／目的語的／複合の区別を確定できない。動作主・対象の意味役割を例文ごとに確認する。 | ROM 3:22 | §4.B.2 (pp.116–119) | Semantic |
| `genitive.plenary` / 複合属格 | 名詞句内の意味関係 | head_lemma_in_list('action_noun_lemmas'); target_is_proper_noun() | 動作名詞の存在だけでは主語的／目的語的／複合の区別を確定できない。動作主・対象の意味役割を例文ごとに確認する。 | 2CO 5:14 | §4.B.3 (pp.119–121) | 未分類 |
| `genitive.comparison` / 比較属格 | 構造・形態中心 | context_has_comparative_adj(); NOT governed_by_prep() | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | MAT 3:11 | §4.C.7 (pp.110–112) | Structural |
| `genitive.separation` / 分離属格 | 語彙・意味手掛かり中心 | context_verb_lemma_in_list('separation_verb_lemmas'); governor_lemma_in(['ἀπό','ἐκ']) | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | ROM 8:39 | §4.C.6 (pp.107–109) | Hybrid |
| `genitive.time` / 時間の属格 | 構造と意味手掛かりの混合 | target_lemma_in_list('temporal_noun_lemmas'); NOT governed_by_prep() | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | JHN 3:2 | §4.C.1 (pp.122–124) | Structural |
| `genitive.place` / 場所属格 | 構造と意味手掛かりの混合 | target_lemma_in_list('place_noun_lemmas'); NOT governed_by_prep() | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | LUK 16:24 | §4.C.2 (pp.124–125) | 未分類 |
| `genitive.agency` / 行為者属格 | 構造と意味手掛かりの混合 | head_is_verbal_adjective() | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | JHN 6:45 | §4.C.5 (pp.126–127) | 未分類 |
| `genitive.means` / 手段属格 | 構造と意味手掛かりの混合 | main_verb_voice_eq('passive'); target_is_abstract_noun(); NOT governed_by_prep() | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | 未登録 | §4.C.3 (pp.125) | 未分類 |
| `genitive.source` / 起源属格 | 語彙・意味手掛かり中心 | governor_lemma_in(['ἀπό','ἐκ','παρά']); NOT context_verb_lemma_in_list('separation_verb_lemmas'); target_is_proper_noun() | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | JAS 1:13 | §4.C.4 (pp.109–110) | Hybrid |
| `genitive.absolute` / 属格絶対 | 構造・形態中心 | target_mood_eq('participle') AND target_case_eq('genitive'); context_has_genitive_noun(); genitive_subject_differs_from_main_subject(); NOT genitive_subject_differs_from_main_subject(); NOT context_has_genitive_noun() | 属格形・属格名詞・主語差の解析が正確であることが前提。主語同定の失敗は誤判定に直結する。 | MAT 2:1 | §4.C special (pp.654–655) | Structural |
| `genitive.direct_object` / 動詞支配属格（直接目的語） | 構造と意味手掛かりの混合 | valency_governs('genitive'); NOT governed_by_prep() | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | JHN 10:3 | §4 after certain verbs (pp.131–134) | 未分類 |

### dative

| ID / ラベル | 判定対象（暫定） | 現行条件が観測するもの | 主なリスク／必要な検証 | 登録例 | Wallace参照 | 既存分類 |
|---|---|---|---|---|---|---|
| `dative.indirect_object` / 間接目的語与格 | 構造と意味手掛かりの混合 | context_verb_lemma_in_list('giving_verb_lemmas'); NOT governed_by_prep(); governed_by_prep(); target_lemma_in_list('personal_noun_lemmas') | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | MAT 7:6 | §6.A.1 (pp.140–142) | Structural |
| `dative.interest_advantage` / 利益与格 | 格の意味役割 | context_verb_lemma_in_list('benefactive_verb_lemmas'); NOT context_verb_lemma_in_list('giving_verb_lemmas'); target_lemma_in_list('personal_noun_lemmas') | 語彙リストや文脈標識は候補生成に使えるが、格の意味役割の確定には文脈と競合候補の確認が必要。 | ROM 6:10 | §6.A.2a (pp.142–144) | Semantic |
| `dative.interest_disadvantage` / 不利益与格 | 格の意味役割 | context_has_negation() OR context_verb_lemma_in_list('adversative_verb_lemmas'); context_has_negation() | 語彙リストや文脈標識は候補生成に使えるが、格の意味役割の確定には文脈と競合候補の確認が必要。 | ROM 8:7 | §6.A.2b (pp.144–145) | Semantic |
| `dative.reference` / 基準与格（参照与格） | 格の意味役割 | context_lemma_in_list('reference_head_lemmas'); NOT context_verb_lemma_in_list('giving_verb_lemmas'); target_lemma_in_list('theological_noun_lemmas') | 語彙リストや文脈標識は候補生成に使えるが、格の意味役割の確定には文脈と競合候補の確認が必要。 | ROM 6:11 | §6.A.4 (pp.144–146) | Semantic |
| `dative.ethical` / 道義的与格（倫理的与格） | 格の意味役割 | target_lemma_in_list('ethical_pronoun_lemmas'); NOT context_verb_lemma_in_list('giving_verb_lemmas') | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | MAT 21:5 | §6.A.5 (pp.146–147) | 未分類 |
| `dative.possession` / 所有与格 | 格の意味役割 | context_has_copula(); target_pos_eq('R'); NOT context_verb_lemma_in_list('giving_verb_lemmas') | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | LUK 2:7 | §6.A (pp.149–151) | 未分類 |
| `dative.direct_object` / 動詞支配与格（直接目的語） | 構造と意味手掛かりの混合 | valency_governs('dative'); NOT governed_by_prep() | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | MAT 4:10 | §6 after certain verbs (pp.171–173) | 未分類 |
| `dative.sphere` / 領域与格（場所・球体与格） | 格の意味役割 | target_lemma_in_list('sphere_noun_lemmas'); NOT governed_by_prep() | 語彙リストや文脈標識は候補生成に使えるが、格の意味役割の確定には文脈と競合候補の確認が必要。 | ACT 16:5 | §6.B.1 (pp.153–155) | Semantic |
| `dative.time` / 時間与格 | 構造と意味手掛かりの混合 | target_lemma_in_list('temporal_noun_lemmas'); prev_pos_eq('T') | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | JHN 2:1 | §6.B.2 (pp.155–156) | Structural |
| `dative.means` / 手段与格 | 格の意味役割 | NOT governed_by_prep(); semantic_substitution_test('διά'); governed_by_prep(); main_verb_voice_eq('passive') | 現行条件に未実装の意味判定が含まれる。該当条件は一致／不一致にせず unsupported とし、候補確定の根拠にしない。 | ROM 3:28 | §6.C.1 (pp.156–158) | Semantic |
| `dative.manner` / 様態与格 | 格の意味役割 | target_lemma_in_list('manner_noun_lemmas'); semantic_substitution_test('adverb') | 現行条件に未実装の意味判定が含まれる。該当条件は一致／不一致にせず unsupported とし、候補確定の根拠にしない。 | JHN 7:26 | §6.C.2 (pp.158–160) | Semantic |
| `dative.association` / 結合与格（付帯与格） | 格の意味役割 | context_verb_has_syn_prefix(); governor_lemma_eq('σύν'); target_lemma_in_list('personal_noun_lemmas') | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | ROM 6:4 | §6.C.5 (pp.159–160) | Hybrid |
| `dative.agent` / 行為者与格 | 格の意味役割 | clause_has_perfect_passive(); target_pos_eq('R') | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | LUK 23:15 | §6.C.6 (pp.163–166) | 未分類 |
| `dative.measure` / 程度与格 | 語彙・意味手掛かり中心 | target_lemma_in_list('measure_lemmas'); context_has_comparative_adj() | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | ROM 5:9 | §6.C.4 (pp.160–162) | 未分類 |

### participle

| ID / ラベル | 判定対象（暫定） | 現行条件が観測するもの | 主なリスク／必要な検証 | 登録例 | Wallace参照 | 既存分類 |
|---|---|---|---|---|---|---|
| `participle.attributive` / 形容詞用法（限定的） | 構造・形態中心 | context_has_case_gender_number_match(); distance_to_match_le(2); NOT distance_to_match_le(2); NOT prev_pos_eq('T') | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | JHN 4:11 | §27.A.1a (pp.617–619) | Structural |
| `participle.predicate` / 述語的分詞 | 構造・形態中心 | context_has_copula(); NOT prev_pos_eq('T') | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | MAT 3:15 | §27.A.1b (pp.619–621) | 未分類 |
| `participle.substantival` / 実体用法（名詞的） | 構造・形態中心 | prev_pos_eq('T'); article_agrees_case_gender_number(); article_gender_matches(); article_number_matches(); ptc_in_attributive_position() | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | JHN 3:16 | §27.A.2 (pp.619–621) | Structural |
| `participle.adverbial_temporal` / 副詞用法—時間（先行・同時・結果状態） | 副詞的意味機能 | NOT prev_pos_eq('T'); NOT context_has_case_gender_number_match(); target_tense_in(['aorist','present','perfect']); target_tense_eq('present'); target_tense_eq('perfect'); NOT target_tense_in(['aorist','present','perfect']) | 時制・接続小辞・語彙は副詞的分詞の意味分類を確定しない。時間／原因／手段等は候補として扱い、文脈で評価する。 | MAT 2:7 | §27.B.1 (pp.623–627) | Structural |
| `participle.adverbial_attendant` / 付帯状況 | 副詞的意味機能 | target_tense_eq('aorist'); main_verb_tense_eq('aorist') AND main_verb_mood_eq('imperative'); NOT prev_pos_eq('T'); main_verb_tense_eq('aorist') AND main_verb_mood_eq('indicative') | 時制・接続小辞・語彙は副詞的分詞の意味分類を確定しない。時間／原因／手段等は候補として扱い、文脈で評価する。 | MAT 2:8 | §27.B.8 (pp.640–645) | Hybrid |
| `participle.adverbial_causal` / 理由・原因 | 副詞的意味機能 | context_has_lemma_in(['οὖν','γάρ','διό','ὅτι']); context_discourse_type_eq('argumentative'); target_voice_eq('passive') | 現行条件に未実装の意味判定が含まれる。該当条件は一致／不一致にせず unsupported とし、候補確定の根拠にしない。 | ROM 5:1 | §27.B.4 (pp.630–632) | Semantic |
| `participle.adverbial_manner` / 様態 | 副詞的意味機能 | target_lemma_in_list('manner_ptc_lemmas'); NOT prev_pos_eq('T') | 時制・接続小辞・語彙は副詞的分詞の意味分類を確定しない。時間／原因／手段等は候補として扱い、文脈で評価する。 | LUK 19:6 | §27.B.3 (pp.628–630) | 未分類 |
| `participle.adverbial_means` / 手段 | 副詞的意味機能 | follows_main_verb(); NOT prev_pos_eq('T') | 時制・接続小辞・語彙は副詞的分詞の意味分類を確定しない。時間／原因／手段等は候補として扱い、文脈で評価する。 | ACT 16:16 | §27.B.2 (pp.628) | 未分類 |
| `participle.adverbial_conditional` / 条件 | 副詞的意味機能 | main_verb_tense_eq('future'); prev_token_lemma_in(['μή']); NOT prev_pos_eq('T') | 時制・接続小辞・語彙は副詞的分詞の意味分類を確定しない。時間／原因／手段等は候補として扱い、文脈で評価する。 | GAL 6:9 | §27.B.5 (pp.632–634) | 未分類 |
| `participle.adverbial_concessive` / 譲歩 | 副詞的意味機能 | context_has_lemma_in(['καίπερ','καίτοι','καίγε']); NOT prev_pos_eq('T') | 時制・接続小辞・語彙は副詞的分詞の意味分類を確定しない。時間／原因／手段等は候補として扱い、文脈で評価する。 | HEB 5:8 | §27.B.6 (pp.634–636) | 未分類 |
| `participle.adverbial_purpose_result` / 目的・結果 | 副詞的意味機能 | target_tense_eq('future'); NOT prev_pos_eq('T') | 時制・接続小辞・語彙は副詞的分詞の意味分類を確定しない。時間／原因／手段等は候補として扱い、文脈で評価する。 | ACT 8:27 | §27.B.7 (pp.636–640) | 未分類 |
| `participle.genitive_absolute` / 属格絶対分詞 | 構造・形態中心 | target_case_eq('genitive'); context_has_genitive_noun(); genitive_subject_differs_from_main_subject(); NOT genitive_subject_differs_from_main_subject(); NOT context_has_genitive_noun() | 属格形・属格名詞・主語差の解析が正確であることが前提。主語同定の失敗は誤判定に直結する。 | MAT 9:18 | §27.C.1 (pp.654–655) | Structural |
| `participle.periphrastic` / 迂言的分詞 | 構造・形態中心 | context_has_copula(); target_tense_in(['present','perfect']); NOT prev_pos_eq('T') | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | MAT 16:19 | §27.C.2 (pp.647–648) | 未分類 |
| `participle.imperatival` / 命令的分詞 | 構造・形態中心 | clause_lacks_finite_verb(); target_case_eq('nominative'); NOT prev_pos_eq('T'); NOT clause_is_subordinate() | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | ROM 12:9 | §27.C.3 (pp.650–652) | 未分類 |
| `participle.complementary` / 補語用法（παύομαι 型） | 構造と意味手掛かりの混合 | valency_complement_participle(); NOT prev_pos_eq('T') | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | LUK 5:4 | §27 (p.646) | Hybrid |
| `participle.indirect_discourse` / 間接話法分詞 | 構造と意味手掛かりの混合 | context_verb_lemma_in_list('perception_verb_lemmas'); context_verb_lemma_in_list('perception_verb_lemmas') AND target_case_eq('accusative') AND context_has_case_gender_number_match(); NOT prev_pos_eq('T') | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | ACT 7:12 | §27 (pp.645–646) | 未分類 |
| `participle.redundant` / 冗語的分詞 | 語彙・意味手掛かり中心 | target_lemma_in_list('redundant_ptc_lemmas'); main_verb_lemma_in(['λέγω','εἶπον','φημί','λαλέω']) | 条件が観測できる形態・構造を正しく捉えるか、代表例と反例で検証する。条件一致をそのままラベル確定とみなさない。 | MAT 4:4 | §27 (pp.649–650) | 未分類 |

## 特に優先度の高い所見

### 1. 未実装の意味条件は確定根拠にできない

次のラベルには未実装の条件式が含まれる。PR #230 の三値評価で `unsupported` として扱うことは妥当だが、これらのラベルを公開時に確定表示する根拠にはならない。

- `genitive.attributive`（属性属格（ヘブライ語的））: target_is_abstract_noun(); has_adjectival_equivalent(); context_discourse_type_eq('semitic')
- `genitive.epexegetical`（説明的同格属格）: semantic_equivalence_test(); head_lemma_in_list('abstract_symbol_lemmas'); semantic_equivalence_test()
- `dative.means`（手段与格）: NOT governed_by_prep(); semantic_substitution_test('διά'); governed_by_prep(); main_verb_voice_eq('passive')
- `dative.manner`（様態与格）: target_lemma_in_list('manner_noun_lemmas'); semantic_substitution_test('adverb')
- `participle.adverbial_causal`（理由・原因）: context_has_lemma_in(['οὖν','γάρ','διό','ὅτι']); context_discourse_type_eq('argumentative'); target_voice_eq('passive')

### 2. 主語的／目的語的／複合属格は同じ構造的手掛かりに依存している

`genitive.subjective`、`genitive.objective`、`genitive.plenary` は、いずれも動作名詞ヘッドを中心とする条件を持つ。現行条件の一部は属格が人称代名詞・固有名であることや動作名詞リストへの一致であり、属格名詞が動作主なのか対象なのか、また両方を含む複合的関係なのかを直接判定していない。したがって、この条件だけで三者を確定する設計は不十分であり、Wallaceの説明に照らした人手判定例と競合候補比較が必要。

### 3. 分詞の副詞的意味分類は形態・談話標識だけでは確定できない

時間・原因・手段・様態・条件・譲歩・目的／結果の分類は、分詞の形態や接続標識と相関する場合があるが、それらは意味機能そのものではない。特に `participle.adverbial_causal` の `context_discourse_type_eq('argumentative')` は未実装条件であり、受動態や接続詞の存在を原因解釈の確定根拠として扱わない。

### 4. レジストリの条件・シグナル構成自体を検査する必要がある

例えば `genitive.possessive` は `no_preposition` と `after_preposition` の両条件が登録され、さらに前置詞支配が除外条件にある。これは意図的な負のシグナル登録の可能性もあるため、データだけでバグとは断定しないが、実行時の条件集約・負スコア・除外処理を確認し、対象例で期待通り動くかを検証する必要がある。

### 5. 次に必要な実証作業

1. `syntax-analyzer.js` の条件評価・スコア集約・候補順位・除外処理を各タイプに対して追跡する。
2. 表に挙げた登録例を、実際のギリシャ語本文・形態情報・句／節解析と照合する。
3. Wallace の該当節を一次資料で確認し、ラベル定義と区別基準を要約する。
4. 肯定例・否定例・競合例を独立した評価セットに登録する。
5. その結果を踏まえ A（検証済み自動判定）／B（候補提示）／C（自動判定保留）を決める。今回の一次監査だけでは、いずれのラベルもA確定とはしない。

## この段階の結論

現行条件は、構造的候補の抽出に使えるものがある一方、意味的ラベルを一意に確定するには不足するケースがある。リリースに向けては「条件を増やして確定判定を増やす」よりも、**構造的に観測できた事実・意味的な候補・判定不能を区別する**ことを優先する。次段階では、実行コードと登録例を結びつけて検証する。


## 追加監査：三値判定の診断情報が正規化時に失われる問題

### 発見

`CandidateScorer._evaluateType` は、意味判定条件の `unsupported` を `signalsUnsupported` / `checksUnsupported` に記録していた。一方、`CandidateNormalizer.normalize` は公開候補へ `signals_matched` と `signals_failed` だけを渡し、unsupported の診断情報を落としていた。

そのため、内部評価では「判定不能」を識別していても、`SyntaxAnalyzer.analyze()` の最終 `candidates[]` からは、その候補が未実装の意味条件を含むことを呼び出し側が確認できなかった。これは今回の「構造的事実・意味的候補・判定不能を分ける」というリリース方針に反する情報欠落である。

### 対応

`public/core/syntax-analyzer.js` の正規化出力に以下を追加した。

- `signals_unsupported`: 未実装／判定不能だったシグナルの診断情報
- `checks_unsupported`: 未実装／判定不能だった除外条件の診断情報
- `has_unsupported_checks`: 上記のいずれかが存在することを示す boolean

既存のスコア、候補順位、confidence の計算は変更していない。したがって、この修正だけで意味候補の確度が向上するわけではないが、呼び出し側が判定不能を識別できるようになる。

### 回帰ガード

`scripts/syntax-check-tristate-regression.cjs` に、CandidateNormalizer が3つの診断フィールドを公開出力に保持することを確認するソースガードを追加した。

- 実装コミット: `bb0a1631`
- テストガード追加コミット: `3ff7e6df`
- PR #230: Draft / 未マージ
- このコミット時点のCI: まだ実行結果を確認できていない

### 残る制約

診断フィールドを返すことと、画面上で利用者に適切に説明することは別問題である。UIが `has_unsupported_checks` 等を参照して候補表示を調整するかは未確認であり、今回の修正は表示挙動を変更していない。また、unsupported 条件を含む候補のスコアは既存ロジックのままなので、今後、意味判定を必須とするラベルを候補提示に限定するかどうかを、実例と独立評価セットに基づいて決める必要がある。


## 追加監査：検索画面で判定不能が利用者に伝わるか

### 発見

診断情報を `CandidateNormalizer` が候補に引き継ぐ修正だけでは不十分だった。検索画面 `public/syntax-search.html` は従来、`signals_matched` と `signals_failed` のみを表示し、未実装条件を含む候補にも通常の確信度表示を行っていた。画面側が診断フィールドを読まなければ、内部で判定不能を保持しても利用者には伝わらない。

### 対応

`public/syntax-search.html` を修正し、`has_unsupported_checks` が真の候補には次の注意書きを表示するようにした。

> この候補には自動判定できていない条件があります。表示スコアだけで意味・用法が確定したとは判断できません。

- 第一候補の役割表示の直下
- 「構文上の結論」の先頭
- 展開された別候補の詳細

さらに、`signals_unsupported` のシグナルは「未判定」と表示し、通常の一致・不一致チップと区別する。注意書きは中立的な背景と細い境界線を用い、候補自体を自動的に除外したりスコアを改変したりしない。

### 回帰ガード

`scripts/syntax-check-tristate-regression.cjs` に、正規化後の診断情報保持に加え、画面側が注意書きと未判定シグナルを表示することを確認するソースガードを追加した。

- UI修正コミット: `5e38a77c`
- UI回帰ガード: `53cac32a`
- PR #230: Draft / 未マージ
- 最新コミットのWorkflow Runs: 取得結果なし
- 最新コミットのCombined Status: status check なし

**したがって、UIのソース変更と回帰ガードは追加済みだが、実行テスト・Playwright・CIの成功は未確認である。** 次は実ブラウザーで、未実装条件を含む候補／含まない候補、第一候補／別候補の表示を確認する。


### 追加追跡：説明文欠落時の注意書き消失を防止

追加確認で、第一候補の「構文上の結論」領域が説明文 `summary` の欠落時に早期終了し、判定不能の注意書きまで消える可能性を確認した。候補の `ui_role` がない場合には役割表示も出ないため、説明文の有無に依存せず診断情報を表示する必要がある。

- `public/syntax-search.html` の候補定義・説明文が見つからない場合の早期終了を修正し、注意書きがあれば表示する。
- `scripts/syntax-check-tristate-regression.cjs` にこのフォールバックのソースガードを追加。
- UIフォールバック修正: `e1abd281`
- 回帰ガード追加: `bbb042ef`

最新コミット `bbb042ef` でも GitHub Actions Workflow Runs と Combined Status は空。よって、これらの変更が実行テストや実ブラウザーで確認済みとは扱わない。
