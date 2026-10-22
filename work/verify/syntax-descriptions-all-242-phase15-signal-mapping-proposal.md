# 第15段階：39件のシグナルID不一致の修正マッピング案

## 方針

第14段階で確認した39件を、既存の条件へ安全に接続できるもの、既存チェックの意味が合わず新規実装が必要なもの、チェックが常時falseのため検出器の設計見直しが必要なものに分ける。**以下は修正案であり、実装済みの変更ではない。** 同名に近いという理由だけで機械的にIDを置換しない。

## A. 既存条件への接続候補

| 型 | 現行シグナルID | 接続候補の条件ID | 注意 |
|---|---|---|---|
| genitive.partitive | `partitive_trigger` | `head_is_partitive_trigger` | `head_lemma_in_list` が期待する語彙リストを確認。 |
| genitive.attributive | `abstract_genitive` | `abstract_noun_genitive` | 抽象名詞リストがWallaceの分類と合うか確認。 |
| genitive.attributive | `adjectival_equivalent` | `semantically_replaceable_by_adjective` | 対応チェックは常にfalse。接続だけでは解決しない。 |
| genitive.epexegetical | `head_is_abstract` | `head_is_abstract_or_symbol` | 同じ語彙リストが適切か確認。 |
| genitive.epexegetical | `namely_substitutable` | `paraphrasable_with_namely` | 対応チェックは常にfalse。新しい意味判定が必要。 |
| genitive.relationship | `kinship_noun_head` | `head_is_kinship_noun` | 語彙リストを確認。 |
| genitive.subjective / objective | `action_noun_head` | `head_is_action_noun` | これは「動作名詞である」条件。主語的／目的語的の意味区別そのものではない。 |
| genitive.comparison | `comparative_adjective` | `comparative_adjective_present` | 節スコープ・対象格の判定を確認。 |
| genitive.separation | `separation_verb` | `separation_verb_present` | 動詞リストと係り先の確認が必要。 |
| genitive.separation | `prep_apo_ek` | `prep_apo_or_ek` | 前置詞が当該属格を実際に支配することを確認。 |
| genitive.time | `temporal_lemma` | `temporal_noun` | 属格の時間用法に適した語彙リストか確認。 |
| genitive.source | `source_prep` | `prep_source_present` | sourceの意味関係と単なる前置詞支配を区別。 |
| dative.indirect_object | `giving_verb` | `giving_communication_verb` | 前置詞支配除外と二重目的語の競合を確認。 |
| dative.interest_advantage | `benefactive_verb` | `benefactive_context` | 受益の意味を動詞リストだけで確定しない。 |
| dative.interest_disadvantage | `adversative_verb` | **既存条件への単純接続は保留** | `adversative_context` は否定の有無も含むため、「反抗動詞」シグナルと意味が一致しない。 |
| dative.reference | `reference_head` | `reference_head_word` | 語彙リストと節内参照関係を確認。 |
| dative.time | `temporal_lemma` | `temporal_noun` | 時間名詞リストと冠詞条件の役割を分ける。 |
| dative.manner | `manner_noun` | `abstract_manner_noun` | `semantic_substitution_test` は常にfalse。別途意味判定が必要。 |
| dative.association | `syn_verb` | `syn_compound_verb` | 複合動詞と与格の関連が必要。 |
| dative.association | `prep_sun` | `prep_sun_present` | 前置詞支配と複合動詞を区別。 |
| participle.attributive | `matching_noun` | `matching_noun_present` | 一致名詞の探索範囲を確認。 |
| participle.attributive | `proximity_2` | `proximity_close` | 一致名詞との距離計算を確認。 |
| participle.attributive | `no_article` | `no_article_before_ptc` | 対象語の直前だけでなく限定位置全体を見てよいか検証。 |
| participle.substantival | `article_present` | `article_before_ptc` | 冠詞が対象分詞に係ることを確認。 |
| participle.substantival | `article_case_match` | **新しいcase-only条件を検討** | 現行 `article_full_agreement` は格・性・数一致なので、ラベルの「格一致」より強い条件。 |
| participle.adverbial_temporal | `no_article` | `no_article_before` | 冠詞なしは副詞的用法の十分条件ではない。 |
| participle.adverbial_temporal | `no_match_noun` | `no_matching_noun` | 一致名詞の探索範囲を確認。 |
| participle.adverbial_attendant | `aorist_ptc` | `aorist_tense` | 形態条件にすぎず、付帯状況の意味は主動詞・文脈と合わせて判断。 |
| participle.adverbial_attendant | `aorist_imperative_main` | `main_verb_aorist_imperative` | 主動詞との対応関係・同一節の判定を確認。 |
| participle.adverbial_causal | `causal_particle` | `causal_adverb_present` | 接続詞の近傍と、分詞自体の原因関係を同一視しない。 |
| participle.adverbial_causal | `logical_context` | `logical_discourse_marker` | チェックは常にfalse。接続だけでは機能しない。 |
| participle.genitive_absolute | `ptc_genitive_case` | `participle_case_genitive` | 対象が分詞であることも必須。 |
| participle.genitive_absolute | `genitive_noun_present` | `genitive_noun_in_context` | 同じ属格句の主語候補かを検証。 |
| participle.genitive_absolute | `distinct_subject` | `distinct_from_main_subject` | 主節主語が不明な場合の推定規則を検証。 |
| participle.indirect_discourse | `perception_verb` | `perception_cognition_verb` | 動詞があるだけでは間接話法を確定しない。 |
| participle.indirect_discourse | `no_article` | `no_article_before` | 冠詞の有無は補助シグナルにとどめる。 |

## B. 条件の対応付けだけでは解決しないもの

- `has_adjectival_equivalent`、`semantic_equivalence_test`、`semantic_substitution_test`、`context_discourse_type_eq` は実装上常にfalse。これらに接続するシグナルは、新しい検出器がない限り実際の証拠として機能しない。
- 主語的／目的語的属格は、共通の「動作名詞ヘッド」条件を通すだけでは区別できない。動作名詞の項構造・文脈上の意味役割を別途検証する必要がある。
- 分詞の時間／原因／付帯状況などは、アオリスト形や接続詞の存在だけでは意味を確定できない。本文と主動詞の関係を考慮する。
- 「述語対格」「不定詞の主語」など別の分類でも同様のID不一致がないか、同じ機械監査を全型へ適用する。

## C. 修正の実装規則

1. シグナルと条件が一致しない場合、既定では加点しない。
2. 本当に無条件で加点する設計が必要なら、明示的な `unconditional: true` などのスキーマを導入し、理由を文書化する。
3. CIで「条件が見つからないシグナル」を検出し、明示的に許可されたもの以外は失敗させる。
4. 既存条件の再利用・新規条件の追加・シグナルの一時停止を、型ごとに選択する。
5. 修正前後の候補順位・表示閾値通過率・同列候補率を全NTトークンで比較し、特定型の消失・過剰表示がないか確認する。
6. 監査の対象はmainでも39件確認済み。修正は監査用PR #228とは別のコード変更PRに分離する。

## 状態

マッピング案の文書化まで完了。実装・CI・全NT回帰計測は未実施。
