# 動詞ラベル48件・一次監査（Phase 1）

- 対象ブランチ: `fix/syntax-check-unsupported-tristate`
- 対象データ: `public/assets/data/syntax-registry.json`（取得時 blob SHA `54b7971122eeed94e9aaff014b647e18fb6ed3fc`）
- 基準: Wallace, *Greek Grammar Beyond the Basics*。Smyth等を分類の主根拠に置き換えない。
- 状態: **レジストリ条件の一次レビュー**。本文例・形態解析・Wallace本文を一例ずつ照合した完了監査ではない。
- 目的: 形態・統語構造として機械的に観測できる条件と、文脈・意味・談話解釈を要するラベルを分ける。以下の懸念は要検証事項であり、本文例の誤りや実装バグと確定したものではない。

## 全体所見

48件すべてが `dictionary.classification` 未設定だった。現時点で自動確定可能なA判定は付けない。ラベルの名称が示す分類軸は、少なくとも次の三群に分けて監査する必要がある。

1. **形態・形式で候補を絞れるもの**: 時制・態・法・人称・数、μή / οὐ μή、ἵνα / ἐάν 等の形式標識。ただし、形式標識の検出は意味機能の確定と同義ではない。
2. **文脈から解釈するもの**: 歴史的現在、格言的用法、進行・習慣・反復、起動・結果到達・総括、命令の語用的機能、動詞態の意味機能。
3. **複数条件が競合するもの**: 現在／アオリスト／完了の意味分類、希求法の機能分類、中動態の意味分類。対立候補と文脈根拠を併記し、スコアだけで確定しない。

## 先に調べるべき構造的リスク

### 1. 時制・法だけでは意味機能を区別できない

- `verb.imperative_customary` は `target_tense_eq('present')` のみ、`verb.imperative_constative` と `verb.imperative_ingressive` はともに `target_tense_eq('aorist')` のみ。時制アスペクトは候補の手掛かりになっても、継続／総括／起動の意味を単独で確定する条件ではない。
- `verb.present_customary` と `verb.present_iterative` は同じ `target_tense_eq('present')` + `clause_has_iterative_marker()` を使う。現状の条件だけでは両者を区別する根拠が見えない。
- `verb.perfect_extensive` は完了形＋主節、`verb.perfect_dramatic` は完了形＋物語節。節種別の判定が正しくても、完了の意味分類を直接証明するわけではない。

**対応方針:** これらはB（競合候補を提示）を暫定案とし、Wallaceの区別基準と肯定・否定・曖昧例の人手判定が揃うまでAにしない。

### 2. 文脈標識の存在を意味判定に直結させている

- `verb.gnomic_present` / `verb.aorist_gnomic` / `verb.future_gnomic` は、γάρ・πᾶς・τις等の存在を条件に含む。これらは格言的意味を自動的に確定しない。
- `verb.present_progressive` は時間副詞の存在、`verb.present_customary` / `verb.present_iterative` は反復標識の存在を利用するが、標識と対象動詞の意味的関係を別途確認する必要がある。
- `verb.historical_present` は節頭の καί または同節・同節外の過去直説法の存在を使う。物語文脈、談話の時間基準、語りの機能を確認せずに確定できない。
- `verb.imperative_urgency` は意志的文脈または νῦν・σήμερον・ταχύ 等を使う。副詞の存在だけでは命令の切迫性を保証しない。

**対応方針:** 標識検出を「観測事実」として表示し、意味機能は文脈根拠と競合候補の比較を必要とする。

### 3. 条件の重複・広さをコードで確認する

- `verb.future_deliberative` の条件に `target_person_eq('1')` が単独条件としても、疑問節とのAND条件内にもある。重複が意図した加点なのか、条件の重複記述なのか、XSCのシグナル対応と照合する。
- `verb.voice_permissive_passive` は `target_voice_eq('passive')` と `target_voice_eq('passive') AND target_mood_eq('imperative')` を併記する。前者は後者に含まれるため、独立した根拠として二重計上されていないかを確認する。
- `verb.voice_passive` は `target_voice_eq('passive')` に加えて `clause_has_agent_phrase()` を要求する。これが「受動態一般」ではなく「行為者句を伴う受動態」を検出しているなら、ラベルの意味範囲と条件が一致しているか確認する。
- `verb.imperative_customary` / `verb.imperative_constative` / `verb.imperative_ingressive` はID上は命令法の下位分類だが、各タイプの `detection.required_mood` と必須条件を別途確認する。条件欄に時制だけが記載されている場合、呼び出し側が法を保証しているかを検証する。

**注意:** 以上はレジストリ記述から検出したレビュー項目であり、実行時に二重計上・誤検出が起きていると断定するものではない。XSCのシグナル重み、`CandidateScorer`、`AnalysisContext` の前提を追って結論を出す。

## 48件の現行条件一覧

| ID | ラベル | 登録例 | Wallace参照（レジストリ記載） | 登録条件 | 分類 |
|---|---|---|---|---|---|
| `verb.declarative` | 叙述的直説法 | JHN 1:1 | Indicative (p.449) | main_clause: `main_clause()`<br>not_question: `NOT clause_is_question()` | 未検証 |
| `verb.historical_present` | 歴史的現在 | MRK 1:40 | Present tense (pp.526–532) | present_tense: `target_tense_eq('present')`<br>narrative_context: `clause_initial_kai() OR verse_has_past_indicative()`<br>third_person: `target_person_eq('3')` | 未検証 |
| `verb.gnomic_present` | 格言的現在 | 2CO 9:7 | Present tense (pp.523–525) | present_tense: `target_tense_eq('present')`<br>gnomic_marker: `context_has_lemma_in(['γάρ','πᾶς'])` | 未検証 |
| `verb.futuristic_present` | 未来的現在 | JHN 4:25 | Present tense (pp.535–537) | present_tense: `target_tense_eq('present')`<br>motion_lemma: `target_lemma_in_list('futuristic_motion_lemmas')` | 未検証 |
| `verb.epistolary_aorist` | 書簡的アオリスト | PHP 2:28 | Aorist tense (pp.562–563) | aorist_tense_v: `target_tense_eq('aorist')`<br>epistolary_lemma: `target_lemma_in_list('epistolary_verb_lemmas')`<br>first_person: `target_person_eq('1')` | 未検証 |
| `verb.dramatic_aorist` | 劇的アオリスト | MAT 3:17 | Aorist tense (pp.564–565) | aorist_tense_v: `target_tense_eq('aorist')`<br>present_context: `clause_has_present_indicative()` | 未検証 |
| `verb.imperative_customary` | 継続命令（現在命令法） | LUK 11:3 | Imperative (pp.485–486, 521) | present_impv: `target_tense_eq('present')` | 未検証 |
| `verb.imperative_constative` | 総括命令（アオリスト命令法） | ACT 2:38 | Imperative (pp.485–486, 720–721) | aorist_impv: `target_tense_eq('aorist')` | 未検証 |
| `verb.imperative_ingressive` | 起動命令 | JHN 2:7 | Imperative (pp.485–486, 720) | aorist_impv: `target_tense_eq('aorist')` | 未検証 |
| `verb.imperative_urgency` | 切迫命令 | MAT 6:11 | Imperative in prayers/requests (pp.487–488) | aorist_impv: `target_tense_eq('aorist')`<br>urgency_marker: `is_volitive_context() OR context_has_lemma_in(['νῦν','σήμερον','ταχύ'])` | 未検証 |
| `verb.imperative_permissive` | 許容命令（3人称） | MAT 27:42 | Imperative 3rd person (pp.485–486) | third_person_impv: `target_person_eq('3')` | 未検証 |
| `verb.hortatory` | 勧告的接続法 | HEB 12:1 | Subjunctive (pp.464–465) | first_plural: `first_person_plural() AND main_clause()`<br>not_question: `NOT clause_is_question()` | 未検証 |
| `verb.prohibitory` | 禁止の接続法 | MAT 6:13 | Subjunctive (p.469) | me_before: `prev_token_lemma_in(['μή']) AND NOT ou_me_before()`<br>aorist_subj: `target_tense_eq('aorist')` | 未検証 |
| `verb.deliberative` | 審議的接続法 | MAT 6:31 | Subjunctive (pp.465–467) | question: `clause_is_question()`<br>main_clause: `main_clause()` | 未検証 |
| `verb.emphatic_negation` | 強調否定（οὐ μή） | JHN 10:28 | Subjunctive (p.468) | ou_me: `ou_me_before()`<br>aorist_subj: `target_tense_eq('aorist')` | 未検証 |
| `verb.purpose_clause` | 目的節の接続法（ἵνα） | JHN 17:3 | Subjunctive in purpose clauses (pp.471–473) | hina: `has_hina()` | 未検証 |
| `verb.indefinite_relative` | 不定関係節の接続法 | MRK 3:29 | Subjunctive (pp.478–479) | relative_an: `has_relative_pronoun() AND context_has_lemma_in(['ἄν'])` | 未検証 |
| `verb.conditional_subjunctive` | 条件節の接続法（ἐάν） | 1JN 1:9 | Subjunctive (pp.469–471) | ean: `has_ean()` | 未検証 |
| `verb.potential_optative` | 可能性の希求法 | ACT 8:31 | Optative (pp.483–484) | an_particle: `context_has_lemma_in(['ἄν'])` | 未検証 |
| `verb.wish_optative` | 祈願の希求法 | ROM 6:2 | Optative (pp.481–483) | main_clause: `main_clause()`<br>no_an: `NOT context_has_lemma_in(['ἄν'])` | 未検証 |
| `verb.optative_indirect_discourse` | 間接話法の希求法 | LUK 8:9 | Optative (p.483) | oblique_context: `clause_is_question() OR clause_is_subordinate()`<br>matrix_speech: `matrix_speech_verb()` | 未検証 |
| `verb.present_progressive` | 進行的現在 | MAT 25:8 | Present (pp.518–519) | present_t: `target_tense_eq('present')`<br>now_adverb: `clause_has_temporal_adverb()` | 未検証 |
| `verb.present_customary` | 習慣的現在 | LUK 18:12 | Present (pp.521–522) | present_t: `target_tense_eq('present')`<br>iter_marker: `clause_has_iterative_marker()` | 未検証 |
| `verb.present_iterative` | 反復的現在 | MAT 17:15 | Present (pp.520–521) | present_t: `target_tense_eq('present')`<br>iter_marker: `clause_has_iterative_marker()` | 未検証 |
| `verb.imperfect_progressive` | 進行的未完了 | MRK 9:31 | Imperfect (pp.543–544) | impf_t: `target_tense_eq('imperfect')`<br>main_clause: `main_clause()` | 未検証 |
| `verb.imperfect_ingressive` | 起動的未完了 | MAT 5:2 | Imperfect (pp.544–545) | impf_t: `target_tense_eq('imperfect')`<br>aor_before: `past_verbal_before_target()` | 未検証 |
| `verb.imperfect_iterative` | 反復的未完了 | JHN 19:3 | Imperfect (pp.546–547) | impf_t: `target_tense_eq('imperfect')`<br>iter_marker: `clause_has_iterative_marker()` | 未検証 |
| `verb.imperfect_customary` | 習慣的未完了 | MRK 15:6 | Imperfect (p.548) | impf_t: `target_tense_eq('imperfect')`<br>distributive: `clause_has_distributive_temporal('distributive_temporal_lemmas')` | 未検証 |
| `verb.imperfect_conative` | 企図的未完了 | MAT 3:14 | Imperfect (pp.550–551) | impf_t: `target_tense_eq('imperfect')`<br>conative_lemma: `target_lemma_in_list('conative_verb_lemmas')` | 未検証 |
| `verb.aorist_constative` | 総括的アオリスト | REV 20:4 | Aorist (p.557) | aor_t: `target_tense_eq('aorist')`<br>main_clause: `main_clause()` | 未検証 |
| `verb.aorist_ingressive` | 起動的アオリスト | 2CO 8:9 | Aorist (pp.558–559) | aor_t: `target_tense_eq('aorist')`<br>stative_lemma: `target_lemma_in_list('ingressive_stative_lemmas')` | 未検証 |
| `verb.aorist_culminative` | 結果到達アオリスト | PHP 4:11 | Aorist (pp.559–561) | aor_t: `target_tense_eq('aorist')`<br>culminative_lemma: `target_lemma_in_list('culminative_verb_lemmas')` | 未検証 |
| `verb.aorist_gnomic` | 格言的アオリスト | 1PE 1:24 | Aorist (p.562) | aor_t: `target_tense_eq('aorist')`<br>gnomic_marker: `context_has_lemma_in(['γάρ','πᾶς'])` | 未検証 |
| `verb.perfect_intensive` | 強意的完了（現在状態） | MAT 4:4 | Perfect (pp.574–576) | perf_t: `target_tense_eq('perfect')`<br>stative_perfect: `target_lemma_in_list('intensive_perfect_lemmas')` | 未検証 |
| `verb.perfect_extensive` | 広延的完了（完結行為） | JHN 1:34 | Perfect (p.577) | perf_t: `target_tense_eq('perfect')`<br>main_clause: `main_clause()` | 未検証 |
| `verb.perfect_dramatic` | 劇的完了 | JHN 1:15 | Perfect (p.578) | perf_t: `target_tense_eq('perfect')`<br>narrative: `clause_is_narrative()` | 未検証 |
| `verb.pluperfect_intensive` | 強意的過去完了 | MRK 1:34 | Pluperfect (pp.584–585) | plup_t: `target_tense_eq('pluperfect')`<br>stative_plup: `target_lemma_in_list('intensive_pluperfect_lemmas')` | 未検証 |
| `verb.pluperfect_extensive` | 広延的過去完了 | JHN 4:8 | Pluperfect (pp.585–586) | plup_t: `target_tense_eq('pluperfect')` | 未検証 |
| `verb.future_predictive` | 予告的未来 | ACT 1:11 | Future (p.568) | fut_t: `target_tense_eq('future')`<br>main_clause: `main_clause()` | 未検証 |
| `verb.future_imperatival` | 命令的未来 | MAT 22:39 | Future (p.569) | fut_t: `target_tense_eq('future')`<br>second_person: `target_person_eq('2')`<br>legal_lemma: `target_lemma_in_list('imperatival_future_lemmas')` | 未検証 |
| `verb.future_deliberative` | 審議的未来 | ROM 6:1 | Future (p.570) | fut_t: `target_tense_eq('future')`<br>question: `clause_is_question() AND target_person_eq('1')`<br>first_p: `target_person_eq('1')` | 未検証 |
| `verb.future_gnomic` | 格言的未来 | ROM 5:7 | Future (p.571) | fut_t: `target_tense_eq('future')`<br>gnomic_marker: `context_has_lemma_in(['γάρ','τις','πᾶς'])` | 未検証 |
| `verb.voice_active` | 単純能動態 | JHN 3:16 | Voice (pp.410–412) | active_v: `target_voice_eq('active')` | 未検証 |
| `verb.voice_middle_direct` | 直接中動態 | MAT 27:5 | Voice (pp.416–417) | middle_v: `target_voice_eq('middle')`<br>direct_lemma: `target_lemma_in_list('direct_middle_lemmas')` | 未検証 |
| `verb.voice_middle_reflexive` | 再帰的中動態 | MAT 16:7 | Voice (pp.416–418) | middle_v: `target_voice_eq('middle')`<br>reflexive: `clause_has_reflexive()` | 未検証 |
| `verb.voice_middle_reciprocal` | 相互的中動態 | JHN 9:22 | Voice (p.427) | middle_v: `target_voice_eq('middle')`<br>reciprocal: `clause_has_reciprocal_marker() OR context_verb_has_syn_prefix()`<br>plural_subj: `target_number_eq('plural')` | 未検証 |
| `verb.voice_passive` | 受動態 | MAT 4:1 | Voice (pp.431–438) | passive_v: `target_voice_eq('passive')`<br>agent_phrase: `clause_has_agent_phrase()` | 未検証 |
| `verb.voice_permissive_passive` | 許容受動態 | 2CO 5:20 | Voice (pp.440–441) | passive_v: `target_voice_eq('passive')`<br>impv_mood: `target_voice_eq('passive') AND target_mood_eq('imperative')` | 未検証 |

## 検証手順（未完了）

- [ ] 各登録例のギリシャ語本文・形態・節境界を実データと照合
- [ ] Wallaceの該当節で定義と識別基準を確認（頁表記だけを根拠確認済みとしない）
- [ ] 各ラベルにつき肯定例・否定例・競合例を最低1例ずつ独立評価セットに登録
- [ ] 共有条件（例: `clause_has_iterative_marker()`）の実装と入力範囲を確認
- [ ] 条件の重複とXSC重みの対応を追跡
- [ ] 候補順位・confidence・unsupported表示への影響を全NT回帰で確認
- [ ] 根拠が揃ったラベルのみA/B/Cを決定

## Phase 1結論

動詞48件は、現在の条件式だけでは意味・アスペクト・談話機能を十分に分離できているとは判断できない。形式標識を使った候補生成は維持しつつ、意味分類は「検出された形式」「解釈候補」「未評価の文脈条件」を別々に扱う設計を優先する。登録例の直接照合とWallace原典の確認を終えるまでは、これはリリース認定ではなく監査計画・リスク一覧として扱う。

## 追加追跡：実ハンドラーと採点経路（コード確認）

確認対象: `public/core/syntax-analyzer.js` の共有条件ハンドラー、`CandidateScorer.prototype._evaluateType_patched`、`CheckEvaluator.evalDetailed`。

### 実装と一致していた点

- `clause_has_iterative_marker()` は `_clauseTokens(ctx)` を使い、節内の `πολλάκις / δίς / τρίς / ὁσάκις / πάντοτε / ἀεί` の有無を検出する。これは「反復標識がある」という形式的事実であり、対象動詞の習慣性・反復性の意味判定ではない。
- 三値評価を使う実際のオーバーライド経路は、除外条件と直接／マップ経由のシグナル条件を `_evalCheckDetailed` で評価し、unsupported を false と同一視せず診断情報に記録する。通常の `CandidateScorer._evaluateType` 定義だけを読んで動作を判断すると、この後段オーバーライドを見落とすため、実行順序を含めて追跡する必要がある。
- `evalDetailed` の `NOT / AND / OR` は、NOTでunsupportedを反転させず、ANDは確定した偽、ORは確定した真があればその結果を返し、それ以外ではunsupportedを保持する実装になっている。

### 追加で検証すべきスコープ疑義

- `clause_is_narrative()` のコメントは「詩節が物語文脈か」と説明するが、実装は `(ctx.tokens ?? []).some(...)` を使っており、`_clauseTokens(ctx)` に限定していない。実行時の `ctx.tokens` が節単位か節を含む聖句単位かを確認し、後者なら同じ聖句内の別節の過去直説法によって `verb.perfect_dramatic` が加点される可能性をテストする。現時点ではスコープ不一致の**疑義**であり、実例での誤判定は未確認。
- `verb.present_customary` と `verb.present_iterative` が共有する反復標識条件は、実装が正しくても2ラベルを識別しない。シグナル重みや候補正規化が順位に与える影響を調べ、意味の違いを自動確定する設計になっていないか確認する。
- `verb.imperative_customary / constative / ingressive` は条件が時制のみのため、実行時の `required_mood` による命令法制約が各タイプに設定されているか、データを再確認する。条件式一覧だけでは必須法制約の有無は断定しない。

### 次の実行テスト

1. `clause_is_narrative()` の入力スコープを特定し、同一節に過去直説法がある例／別節だけにある例を対にする。
2. 習慣的現在と反復的現在について、同じ節標識が双方に一致したときの候補スコアと表示順位を記録する。
3. 命令法3ラベルの `required_mood`、対象トークン、条件、XSCシグナルの対応を照合する。
4. 検証例はNT本文と形態データから実際に抽出し、人手判定が終わるまで例を「正解」と扱わない。

## 追加検証：`clause_is_narrative()` のスコープ不一致をコード上で確認

**判定: 実装上のスコープ不一致を確認。実際の候補誤順位の頻度は未測定。**

確認できたコード上の事実:

1. `ContextBuilder.build()` は `clauseStart: clause.start` と `clauseEnd: clause.end` を `AnalysisContext` に設定する（`public/core/syntax-analyzer.js` のコンテキスト組み立て部）。
2. 共通ヘルパー `_clauseTokens(ctx)` はその開始・終了位置を使い、節内トークンに限定する。
3. `clause_has_future_reference()`、`context_has_lemma_in()` など複数の文脈チェックは `_clauseTokens(ctx)` を利用している。
4. 一方 `clause_is_narrative()` は `(ctx.tokens ?? []).some(...)` としており、節境界を無視して全入力トークンを走査する。
5. `scripts/syntax-score-compare.cjs` も対象聖句のトークン配列を `SyntaxAnalyzer.analyze({ target, tokens: verseTokens, targetIdx })` に渡している。ContextBuilder は節境界を計算しているため、このハンドラーだけがその境界を使わないことはコード上で確認できる。

このため、同じ聖句内の別節にアオリスト／未完了過去の直説法があると、対象節自体にその標識がなくても `clause_is_narrative()` が真になる可能性がある。これが `verb.perfect_dramatic` 等のどのラベルに影響するかは、レジストリ参照と実例の対照テストで測る必要がある。

### 修正判断

- 最小修正候補はハンドラー内の `(ctx.tokens ?? []).some(...)` を `_clauseTokens(ctx).some(...)` に変えること。
- ただし、PR #230 の `syntax-score-compare.cjs` は三値判定導入前後で全NTのスコア・順位・候補集合が変わらないことを保証する回帰テストである。この修正は意図的に判定スコープを変えるため、同じPRに混ぜるとその保証の目的が崩れる。
- よってこのバグ修正はPR #230とは分離し、節内／別節の対照テスト、対象ラベルの影響一覧、全NT差分レポートを持つ独立PRで扱う。対照テストと差分を確認する前に本番コードを変更しない。



## 追加追跡：動詞ラベルの条件・重みの対応（レジストリ実データ確認）

対象: `public/assets/data/syntax-registry.json` の7ラベル。以下は登録データから確認できた事実と、採点経路の追加検証が必要な疑義を分けて記録する。

### 確認できた事実

- `verb.imperative_customary` / `verb.imperative_constative` / `verb.imperative_ingressive` には、それぞれ `required_mood: "imperative"` が設定されている。したがって、少なくともレジストリ上は命令法制約が欠けているわけではない。ただし、実行時にこの制約が必ず適用されるかは scorer の経路を確認する必要がある。
- `verb.present_customary` と `verb.present_iterative` は、現在形＋節内反復標識という同じ条件、同じXSC重み（現在形 +10、反復標識 +25）、同じ既定信頼度45を持つ。登録条件・重みからは両ラベルを識別できない。候補が同時に出る場合、これは独立した意味判定ではなく、同一の形式的証拠から作られた競合ラベルとして扱うべきである。
- `verb.imperative_constative` と `verb.imperative_ingressive` はともにアオリスト命令法を条件とするが、重みはそれぞれ30と20、既定信頼度は50と35。時制アスペクト以外の識別根拠は、登録条件に明示されていない。
- `verb.voice_permissive_passive` は `required_mood: "imperative"` を持ち、受動態条件と「受動態 AND 命令法」条件を別々のシグナルとして登録している。2つ目は1つ目を含むため、両方が一致した場合の加点が意図されたものかを scorer で検証する必要がある。
- `verb.future_deliberative` は未来形、疑問節＋1人称、1人称の3条件を持つ。後ろ2条件は1人称の証拠を重複して含むが、XSC上では疑問節＋1人称に+25、1人称に+15を割り当てている。これは意図的な複合証拠の加点かもしれず、条件の重複だけではバグと断定できない。

### リリース上の扱い

- `present_customary` / `present_iterative`：条件が同一である限り自動的に一方を確定しない。文脈上の区別を説明できる独立根拠がなければ、両方を競合候補として表示するか、より広い「現在形＋反復標識」までに留める。
- 命令法の下位分類：`required_mood` の適用をテストで確認したうえで、継続／総括／起動という意味機能は時制・アスペクトだけから確定しない。
- 許容受動態・審議的未来：実際の scorer が条件をどう集約するかを追跡し、実例のスコア内訳で重複加点の意図を確認する。検証前に条件や重みを変更しない。

この追跡はレジストリの構造監査であり、実コーパス上の精度・適合率・再現率を測定したものではない。


## 追加追跡：required_mood の実行時適用

コード検索で `CandidateScorer.prototype._evaluateType_patched` 内に `required_case / required_mood / required_pos` の共通チェックがあることを確認した。したがって、命令法3ラベルの `required_mood: "imperative"` は、登録データ上だけでなく、実行時スコアラーのチェック経路にも存在する。

ただし、この確認だけでは、各入力形態のすべての表記揺れ・欠損形態に対する正しさまでは証明しない。リリース検証では「命令法でない同時制の動詞が命令ラベル候補にならない」負例テストを追加する。

また、`verb.present_customary` と `verb.present_iterative` の条件・重みが同一という問題は、required_mood のような前提条件で解消されない。両者の意味を区別する根拠が別途追加されるまでは、同時候補を独立した確定判定として解釈しない。


## 追加追跡：採点実装で確定できること／できないこと（2026-10-22）

対象コード: `public/core/syntax-analyzer.js` の `CandidateScorer.prototype._evaluateType_patched`。

### 実装経路の確認結果

1. `required_case / required_mood / required_pos` はシグナル評価より先に適用され、不一致なら `null` を返す。命令法限定ラベルについて、レジストリの `required_mood: "imperative"` は採点前の候補除外条件として実装されている。
2. 条件に対応するシグナルは、評価結果が `matched` の場合だけ加点される。`not_matched` は失敗シグナルに、`unsupported` は `signalsUnsupported` に記録され、どちらも加点されない。
3. 一方、レジストリでシグナルに対応する条件が見つからない場合、そのシグナルは「常に加算」される。この仕様は既存互換だが、条件式の記述漏れがある場合にも無条件加点になるため、ラベル監査では **全シグナルと条件の対応関係** を確認しなければならない。
4. `rawScore` には `_computeTieBreakScore(typeDef)` も加算される。したがって、意味的根拠が同じ候補同士でも最終的なスコアが異なる場合があり、スコア差そのものを言語学的な確度差と解釈してはいけない。

### 既知の重複条件に対する評価

- **習慣的現在／反復的現在**：同じ条件・重みからは区別不能。候補のどちらかをスコア差で選ぶ根拠はない。タイブレーク等で順位が違っても、それは意味の識別を意味しない。
- **許容受動態**：受動態条件と「受動態かつ命令法」条件は包含関係にある。両方の加点が意図された設計かどうかは、Wallaceの定義、登録例の形態、表示内訳を照合するまで保留する。
- **審議的未来**：1人称シグナルが複合条件と単独条件に現れるため、同じ形態的事実が複数回寄与する可能性がある。独立した証拠を二つ測っているのか、同じ証拠の重複加点なのかは、条件の意味と実例で検証する必要がある。

### この段階でのリリース判断

- `required_mood` の存在はコード上確認できたが、実際の非命令法トークンを投入する回帰テストはまだ実行していない。したがって「負例テスト合格」とは報告しない。
- 今回は採点経路のコード監査であり、NT全体での候補数・順位変化や適合率／再現率の測定ではない。
- 次に必要なのは、実コーパスから対象ラベルを抽出し、各候補の `rawScore`・一致／失敗／unsupported シグナル・最終順位を保存するテストである。特に条件が同一のラベル群は、順位だけで一つを確定しないことを回帰条件に含める。
- Wallace原典の直接確認と独立した人手判定が終わるまで、これらの意味分類は自動確定ではなく「候補」として扱う。


### 2026-10-22 実装追跡の更新

- `scripts/genitive-regression-test.cjs` の既存コーパス回帰ハーネスに、命令法ラベルの負例を追加した。
  - LUK 18:12 `νηστεύω`（現在直説法）に `verb.imperative_customary` が出ないこと。
  - REV 20:4 `ἐβασίλευσαν`（アオリスト直説法）に `verb.imperative_constative` / `verb.imperative_ingressive` が出ないこと。
- 変更コミット: `e3e2cddff6654fac77dffea5b8cf25f047829f28`。
- コミットに対する GitHub Actions は確認時点で `Path Structure Check` と `VR-5 Regression Gate` がともに `queued`。このため、負例テストの実行結果はまだ未確認であり、合格とは記録しない。


### CIの再確認（2026-10-22）

- コミット `e3e2cddff6654fac77dffea5b8cf25f047829f28` について、`Path Structure Check` と `VR-5 Regression Gate` の両方が `success` になったことを後続確認した。
- ただし `VR-5 Regression Gate` は `test:syntax-tristate` と `test:syntax-score-compare` などを実行し、`test:genitive` は実行していない。したがって、同コミットで追加した `genitive-regression-test.cjs` 内の命令法負例テストが実行・合格したことを意味しない。
- その後に監査文書を更新したコミットのCI結果は確認できていない。最新HEADの合格とは記録しない。
