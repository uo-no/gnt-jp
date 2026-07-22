# Coverage Report — Wallace Core + Engine Extensions

Generated: 2026-07-21T11:24:09.296Z
Engine Version: 0.2.0
Wallace: Wallace, Daniel B. Greek Grammar Beyond the Basics. Zondervan, 1996.

> 本エンジンは Wallace GGBB の統語カテゴリ（Wallace Core）を実装し、
> これに GGBB には章として存在しない独自の横断解析レイヤー
> （Engine Extensions: Nominal Syntax / Discourse）を加えたものである。
> 両者は本レポートで区分して集計し、混在させない。

---

## Summary

- Categories: 17（Wallace Core 15 + Engine Extensions 2）
- Types: 242 (active 242 / stub 0)
- Tested types: 242 / 242 (**100%**)
- Test assertions (call sites): 400
- Wallace Core chapter coverage: 15 / 15
- Engine Extensions: 2 / 2（GGBB の章ではない独自レイヤー）

---

# Part I — Wallace Core Grammar（GGBB の章に対応）

## Nominative

Status: **complete**  |  Pages: 36–64  |  Implemented: 10 / 10  |  Tested: 10 (100%)  |  Stub: 0  |  Test mentions: 20  |  Metrics: ✓

| Type | Wallace | Active | Tested | Examples |
|------|---------|--------|--------|----------|
| nominative.subject | pp.38–40 | ✓ | ✓ | MAT 1:2 |
| nominative.predicate_nominative | pp.40–48 | ✓ | ✓ | JHN 1:1 |
| nominative.apposition | pp.48–49 | ✓ | ✓ | ROM 1:1 |
| nominative.nominative_absolute | pp.49–51 | ✓ | ✓ | REV 1:4 |
| nominative.pendens | pp.51–53 | ✓ | ✓ | ACT 7:40 |
| nominative.vocative_nominative | pp.56–59 | ✓ | ✓ | MRK 9:25 |
| nominative.indeclinable | pp.61–62（外来固有名詞） | ✓ | ✓ | MAT 1:2 |
| nominative.subject_with_infinitive | pp.36–40（周辺用法） | ✓ | ✓ | PHP 1:21 |
| nominative.exclamation | pp.59–60 | ✓ | ✓ | ROM 7:24 |
| nominative.title_nominative | p.61 | ✓ | ✓ | MAT 1:1 |

---

## Vocative

Status: **complete**  |  Pages: 65–71  |  Implemented: 5 / 5  |  Tested: 5 (100%)  |  Stub: 0  |  Test mentions: 11  |  Metrics: ✓

| Type | Wallace | Active | Tested | Examples |
|------|---------|--------|--------|----------|
| vocative.direct_address | pp.67–68 | ✓ | ✓ | MAT 8:2 |
| vocative.with_o | pp.68–69 | ✓ | ✓ | MAT 15:28 |
| vocative.nominative_for_vocative | pp.56–59, 69–70 | ✓ | ✓ | JHN 20:28 |
| vocative.exclamatory | pp.68–69（感嘆用法） | ✓ | ✓ | ROM 11:33 |
| vocative.chain | pp.67–68（反復呼格） | ✓ | ✓ | MAT 27:46 |

---

## Genitive

Status: **complete**  |  Pages: 72–136  |  Implemented: 22 / 22  |  Tested: 22 (100%)  |  Stub: 0  |  Test mentions: 75  |  Metrics: ✓

| Type | Wallace | Active | Tested | Examples |
|------|---------|--------|--------|----------|
| genitive.possessive | §4.A.1 (pp.81–83) | ✓ | ✓ | MAT 5:3 |
| genitive.descriptive | §4.A.2 (pp.79–81) | ✓ | ✓ | ROM 7:24 |
| genitive.partitive | §4.A.5 (pp.84–86) | ✓ | ✓ | ROM 11:17 |
| genitive.attributive | §4.A.3 (pp.86–88) | ✓ | ✓ | ROM 6:6 |
| genitive.epexegetical | §4.A.9 (pp.94–100) | ✓ | ✓ | ROM 4:11 |
| genitive.relationship | §4.A.1 sub (pp.83–84) | ✓ | ✓ | MAT 1:1 |
| genitive.material | §4.A.6 (pp.88–90) | ✓ | ✓ | REV 18:12 |
| genitive.content | §4.A.7 (pp.90–92) | ✓ | ✓ | JHN 21:8 |
| genitive.attributed | §4.A.4 (pp.88) | ✓ | ✓ | ROM 6:4 |
| genitive.predicate | §4.A.12 (pp.100–101) | ✓ | ✓ | — |
| genitive.subjective | §4.B.1 (pp.112–116) | ✓ | ✓ | ROM 8:35 |
| genitive.objective | §4.B.2 (pp.116–119) | ✓ | ✓ | — |
| genitive.plenary | §4.B.3 (pp.119–121) | ✓ | ✓ | — |
| genitive.comparison | §4.C.7 (pp.110–112) | ✓ | ✓ | JHN 13:16 |
| genitive.separation | §4.C.6 (pp.107–109) | ✓ | ✓ | JAS 1:13 |
| genitive.time | §4.C.1 (pp.122–124) | ✓ | ✓ | JHN 3:2 |
| genitive.place | §4.C.2 (pp.124–125) | ✓ | ✓ | LUK 16:24, MRK 1:10 |
| genitive.agency | §4.C.5 (pp.126–127) | ✓ | ✓ | JHN 6:45 |
| genitive.means | §4.C.3 (pp.125) | ✓ | ✓ | — |
| genitive.source | §4.C.4 (pp.109–110) | ✓ | ✓ | — |
| genitive.absolute | §4.C special (pp.654–655) | ✓ | ✓ | MAT 2:1 |
| genitive.direct_object | §4 after certain verbs (pp.131–134) | ✓ | ✓ | JHN 10:3 |

---

## Dative

Status: **complete**  |  Pages: 137–175  |  Implemented: 14 / 14  |  Tested: 14 (100%)  |  Stub: 0  |  Test mentions: 37  |  Metrics: ✓

| Type | Wallace | Active | Tested | Examples |
|------|---------|--------|--------|----------|
| dative.indirect_object | §6.A.1 (pp.140–142) | ✓ | ✓ | MAT 7:6 |
| dative.interest_advantage | §6.A.2a (pp.142–144) | ✓ | ✓ | ROM 6:10 |
| dative.interest_disadvantage | §6.A.2b (pp.144–145) | ✓ | ✓ | ROM 8:7 |
| dative.reference | §6.A.4 (pp.144–146) | ✓ | ✓ | ROM 6:11 |
| dative.ethical | §6.A.5 (pp.146–147) | ✓ | ✓ | MAT 21:5 |
| dative.possession | §6.A (pp.149–151) | ✓ | ✓ | LUK 2:7 |
| dative.direct_object | §6 after certain verbs (pp.171–173) | ✓ | ✓ | MAT 4:10 |
| dative.sphere | §6.B.1 (pp.153–155) | ✓ | ✓ | ACT 16:5 |
| dative.time | §6.B.2 (pp.155–156) | ✓ | ✓ | JHN 2:1 |
| dative.means | §6.C.1 (pp.156–158) | ✓ | ✓ | ROM 3:28 |
| dative.manner | §6.C.2 (pp.158–160) | ✓ | ✓ | JHN 7:26 |
| dative.association | §6.C.5 (pp.159–160) | ✓ | ✓ | ROM 6:4 |
| dative.agent | §6.C.6 (pp.163–166) | ✓ | ✓ | LUK 23:15 |
| dative.measure | §6.C.4 (pp.160–162) | ✓ | ✓ | ROM 5:9 |

---

## Accusative

Status: **complete**  |  Pages: 176–205  |  Implemented: 7 / 7  |  Tested: 7 (100%)  |  Stub: 0  |  Test mentions: 46  |  Metrics: ✓

| Type | Wallace | Active | Tested | Examples |
|------|---------|--------|--------|----------|
| accusative.direct_object | §5.A.1 (pp.179–181) | ✓ | ✓ | MAT 22:37 |
| accusative.subject_of_infinitive | §5.A.4 (pp.192–197) | ✓ | ✓ | MAT 16:13 |
| accusative.double_person_thing | §5.A.2 (pp.181–182) | ✓ | ✓ | JHN 14:26, MAT 7:9 |
| accusative.object_complement | §5.A.3 (pp.182–189) | ✓ | ✓ | PHP 3:7, JHN 15:15, LUK 12:14 |
| accusative.cognate | §5.A.5 (pp.189–190) | ✓ | ✓ | MAT 2:10, MRK 4:41 |
| accusative.predicate | §5.A.6 (pp.190–192) | ✓ | ✓ | ACT 28:6 |
| accusative.adverbial | §5.B (pp.199–203) | ✓ | ✓ | MAT 26:45 |

---

## Article

Status: **complete**  |  Pages: 206–290  |  Implemented: 11 / 11  |  Tested: 11 (100%)  |  Stub: 0  |  Test mentions: 38  |  Metrics: ✓

| Type | Wallace | Active | Tested | Examples |
|------|---------|--------|--------|----------|
| article.monadic | §2.A.1 (pp.223–225) | ✓ | ✓ | MAT 5:14 |
| article.generic | §2.A.2 (pp.227–231) | ✓ | ✓ | LUK 10:7 |
| article.previous_reference | §2.A.3 (pp.217–220) | ✓ | ✓ | — |
| article.par_excellence | §2.A.4 (pp.222–223) | ✓ | ✓ | — |
| article.simple_identification | §2 with substantives (pp.216–217) | ✓ | ✓ | — |
| article.well_known | §2 (p.225) | ✓ | ✓ | JHN 7:38 |
| article.abstract | §2 (pp.226–227) | ✓ | ✓ | ROM 13:10 |
| article.deictic | §2 (p.221) | ✓ | ✓ | — |
| article.kataphoric | §2 (pp.220–221) | ✓ | ✓ | JHN 15:20 |
| article.granville_sharp | §2 TSKS (pp.270–290) | ✓ | ✓ | — |
| article.colwell | §2 Colwell (pp.256–270) | ✓ | ✓ | — |

---

## Adjective

Status: **complete**  |  Pages: 291–314  |  Implemented: 11 / 11  |  Tested: 11 (100%)  |  Stub: 0  |  Test mentions: 23  |  Metrics: ✓

| Type | Wallace | Active | Tested | Examples |
|------|---------|--------|--------|----------|
| adjective.attributive | pp.306–309（限定位置） | ✓ | ✓ | JHN 10:11 |
| adjective.predicate | pp.307–309（述語位置） | ✓ | ✓ | ROM 7:12 |
| adjective.substantival | pp.294–295 | ✓ | ✓ | LUK 6:20 |
| adjective.attributive_position | pp.306–307 | ✓ | ✓ | — |
| adjective.predicate_position | pp.307–308 | ✓ | ✓ | — |
| adjective.comparative | pp.297–301 | ✓ | ✓ | JHN 13:16 |
| adjective.superlative | pp.301–305 | ✓ | ✓ | 2PE 1:4 |
| adjective.proper_adjective | pp.291–293 | ✓ | ✓ | MAT 7:17 |
| adjective.restrictive | pp.306–307（限定機能） | ✓ | ✓ | — |
| adjective.epithet | pp.293（修辞的用法） | ✓ | ✓ | LUK 1:3 |
| adjective.genitive_complement | pp.134–135（形容詞 + 属格） | ✓ | ✓ | LUK 23:15 |

---

## Pronoun

Status: **complete**  |  Pages: 315–354  |  Implemented: 12 / 12  |  Tested: 12 (100%)  |  Stub: 0  |  Test mentions: 30  |  Metrics: ✓

| Type | Wallace | Active | Tested | Examples |
|------|---------|--------|--------|----------|
| pronoun.personal | pp.316–325 | ✓ | ✓ | JHN 8:12 |
| pronoun.intensive | pp.348–349 | ✓ | ✓ | 1TH 4:16 |
| pronoun.identical | pp.349–350 | ✓ | ✓ | 1CO 12:5 |
| pronoun.reflexive | pp.350–351 | ✓ | ✓ | PHP 2:8 |
| pronoun.reciprocal | pp.351–352 | ✓ | ✓ | JHN 13:34 |
| pronoun.demonstrative | pp.325–335 | ✓ | ✓ | JHN 1:2 |
| pronoun.relative | pp.335–345 | ✓ | ✓ | MRK 3:29 |
| pronoun.interrogative | pp.345–346 | ✓ | ✓ | MAT 6:31 |
| pronoun.indefinite | pp.347 | ✓ | ✓ | GAL 6:1 |
| pronoun.distributive | pp.347–348 | ✓ | ✓ | 1CO 3:8 |
| pronoun.reciprocal_emphasis | pp.351–352（相互の強調文脈） | ✓ | ✓ | — |
| pronoun.possessive_pronoun | pp.348（所有形容詞） | ✓ | ✓ | JHN 8:16 |

---

## Preposition

Status: **complete**  |  Pages: 355–389  |  Implemented: 7 / 7  |  Tested: 7 (100%)  |  Stub: 0  |  Test mentions: 34  |  Metrics: ✓

| Type | Wallace | Active | Tested | Examples |
|------|---------|--------|--------|----------|
| preposition.proper_with_genitive | pp.360–363 | ✓ | ✓ | MRK 1:10 |
| preposition.proper_with_dative | pp.360–363 | ✓ | ✓ | MAT 3:11 |
| preposition.proper_with_accusative | pp.360–363 | ✓ | ✓ | MAT 4:12 |
| preposition.improper | p.357 | ✓ | ✓ | LUK 1:15, MAT 3:11 |
| preposition.adverbial_pp | pp.356–357 | ✓ | ✓ | MRK 1:10 |
| preposition.attributive_pp | pp.356–357 | ✓ | ✓ | MAT 6:9, MAT 3:11, MAT 12:50 |
| preposition.substantival_pp | pp.356–357 | ✓ | ✓ | GAL 3:7, MAT 14:33 |

---

## Infinitive

Status: **complete**  |  Pages: 587–611  |  Implemented: 11 / 11  |  Tested: 11 (100%)  |  Stub: 0  |  Test mentions: 33  |  Metrics: ✓

| Type | Wallace | Active | Tested | Examples |
|------|---------|--------|--------|----------|
| infinitive.purpose | §34.A.1 (pp.590–592) | ✓ | ✓ | MAT 13:3, ROM 1:11 |
| infinitive.result | §34.A.2 (pp.592–594) | ✓ | ✓ | MAT 8:24 |
| infinitive.time | §34.A.3 (pp.594–596) | ✓ | ✓ | MAT 26:32, MAT 13:4 |
| infinitive.cause | §34.A.4 (pp.596–597) | ✓ | ✓ | MAT 13:5 |
| infinitive.means | §34.A.5 (p.597) | ✓ | ✓ | — |
| infinitive.complementary | §34.A.6 (pp.598–599) | ✓ | ✓ | MAT 6:24 |
| infinitive.subject | §34.B.1 (pp.600–601) | ✓ | ✓ | MAT 16:21 |
| infinitive.indirect_discourse | §34.B.3 (pp.603–605) | ✓ | ✓ | MAT 16:13 |
| infinitive.epexegetical | §34.B.4 (pp.606–607) | ✓ | ✓ | MAT 3:11 |
| infinitive.articular | §34.B (pp.600–607, 構造標識) | ✓ | ✓ | PHP 1:21 |
| infinitive.imperatival | §34.C (p.608) | ✓ | ✓ | ROM 12:15 |

---

## Participle

Status: **complete**  |  Pages: 612–655  |  Implemented: 17 / 17  |  Tested: 17 (100%)  |  Stub: 0  |  Test mentions: 60  |  Metrics: ✓

| Type | Wallace | Active | Tested | Examples |
|------|---------|--------|--------|----------|
| participle.attributive | §27.A.1a (pp.617–619) | ✓ | ✓ | JHN 4:11 |
| participle.predicate | §27.A.1b (pp.619–621) | ✓ | ✓ | — |
| participle.substantival | §27.A.2 (pp.619–621) | ✓ | ✓ | JHN 3:16 |
| participle.adverbial_temporal | §27.B.1 (pp.623–627) | ✓ | ✓ | MAT 4:2 |
| participle.adverbial_attendant | §27.B.8 (pp.640–645) | ✓ | ✓ | MAT 28:19, MAT 2:8 |
| participle.adverbial_causal | §27.B.4 (pp.630–632) | ✓ | ✓ | ROM 5:1 |
| participle.adverbial_manner | §27.B.3 (pp.628–630) | ✓ | ✓ | LUK 19:6 |
| participle.adverbial_means | §27.B.2 (pp.628) | ✓ | ✓ | ACT 16:16 |
| participle.adverbial_conditional | §27.B.5 (pp.632–634) | ✓ | ✓ | GAL 6:9 |
| participle.adverbial_concessive | §27.B.6 (pp.634–636) | ✓ | ✓ | HEB 5:8 |
| participle.adverbial_purpose_result | §27.B.7 (pp.636–640) | ✓ | ✓ | ACT 8:27 |
| participle.genitive_absolute | §27.C.1 (pp.654–655) | ✓ | ✓ | MAT 2:1, MAT 9:18 |
| participle.periphrastic | §27.C.2 (pp.647–648) | ✓ | ✓ | MAT 16:19 |
| participle.imperatival | §27.C.3 (pp.650–652) | ✓ | ✓ | ROM 12:9 |
| participle.complementary | §27 (p.646) | ✓ | ✓ | LUK 5:4 |
| participle.indirect_discourse | §27 (pp.645–646) | ✓ | ✓ | ACT 7:12 |
| participle.redundant | §27 (pp.649–650) | ✓ | ✓ | MAT 4:4 |

---

## Verb (Mood)

Status: **complete**  |  Pages: 443–493  |  Implemented: 48 / 48  |  Tested: 48 (100%)  |  Stub: 0  |  Test mentions: 110  |  Metrics: ✓

| Type | Wallace | Active | Tested | Examples |
|------|---------|--------|--------|----------|
| verb.declarative | Indicative (p.449) | ✓ | ✓ | JHN 1:1 |
| verb.historical_present | Present tense (pp.526–532) | ✓ | ✓ | MRK 1:40 |
| verb.gnomic_present | Present tense (pp.523–525) | ✓ | ✓ | — |
| verb.futuristic_present | Present tense (pp.535–537) | ✓ | ✓ | JHN 4:25 |
| verb.epistolary_aorist | Aorist tense (pp.562–563) | ✓ | ✓ | PHP 2:28 |
| verb.dramatic_aorist | Aorist tense (pp.564–565) | ✓ | ✓ | — |
| verb.imperative_customary | Imperative (pp.485–486, 521) | ✓ | ✓ | LUK 11:3 |
| verb.imperative_constative | Imperative (pp.485–486, 720–721) | ✓ | ✓ | ACT 2:38 |
| verb.imperative_ingressive | Imperative (pp.485–486, 720) | ✓ | ✓ | — |
| verb.imperative_urgency | Imperative in prayers/requests (pp.487–488) | ✓ | ✓ | MAT 6:11 |
| verb.imperative_permissive | Imperative 3rd person (pp.485–486) | ✓ | ✓ | MAT 27:42 |
| verb.hortatory | Subjunctive (pp.464–465) | ✓ | ✓ | HEB 12:1 |
| verb.prohibitory | Subjunctive (p.469) | ✓ | ✓ | MAT 6:13 |
| verb.deliberative | Subjunctive (pp.465–467) | ✓ | ✓ | MAT 6:31 |
| verb.emphatic_negation | Subjunctive (p.468) | ✓ | ✓ | JHN 10:28 |
| verb.purpose_clause | Subjunctive in purpose clauses (pp.471–473) | ✓ | ✓ | JHN 17:3 |
| verb.indefinite_relative | Subjunctive (pp.478–479) | ✓ | ✓ | MRK 3:29 |
| verb.conditional_subjunctive | Subjunctive (pp.469–471) | ✓ | ✓ | 1JN 1:9 |
| verb.potential_optative | Optative (pp.483–484) | ✓ | ✓ | ACT 8:31 |
| verb.wish_optative | Optative (pp.481–483) | ✓ | ✓ | ROM 6:2 |
| verb.optative_indirect_discourse | Optative (p.483) | ✓ | ✓ | LUK 8:9 |
| verb.present_progressive | Present (pp.518–519) | ✓ | ✓ | MAT 25:8 |
| verb.present_customary | Present (pp.521–522) | ✓ | ✓ | LUK 18:12 |
| verb.present_iterative | Present (pp.520–521) | ✓ | ✓ | MAT 17:15 |
| verb.imperfect_progressive | Imperfect (pp.543–544) | ✓ | ✓ | MRK 9:31 |
| verb.imperfect_ingressive | Imperfect (pp.544–545) | ✓ | ✓ | MAT 5:2 |
| verb.imperfect_iterative | Imperfect (pp.546–547) | ✓ | ✓ | JHN 19:3 |
| verb.imperfect_customary | Imperfect (p.548) | ✓ | ✓ | MRK 15:6 |
| verb.imperfect_conative | Imperfect (pp.550–551) | ✓ | ✓ | MAT 3:14 |
| verb.aorist_constative | Aorist (p.557) | ✓ | ✓ | REV 20:4 |
| verb.aorist_ingressive | Aorist (pp.558–559) | ✓ | ✓ | 2CO 8:9 |
| verb.aorist_culminative | Aorist (pp.559–561) | ✓ | ✓ | PHP 4:11 |
| verb.aorist_gnomic | Aorist (p.562) | ✓ | ✓ | 1PE 1:24 |
| verb.perfect_intensive | Perfect (pp.574–576) | ✓ | ✓ | MAT 4:4 |
| verb.perfect_extensive | Perfect (p.577) | ✓ | ✓ | JHN 1:34 |
| verb.perfect_dramatic | Perfect (p.578) | ✓ | ✓ | JHN 1:15 |
| verb.pluperfect_intensive | Pluperfect (pp.584–585) | ✓ | ✓ | MRK 1:34 |
| verb.pluperfect_extensive | Pluperfect (pp.585–586) | ✓ | ✓ | JHN 4:8 |
| verb.future_predictive | Future (p.568) | ✓ | ✓ | ACT 1:11 |
| verb.future_imperatival | Future (p.569) | ✓ | ✓ | MAT 22:39 |
| verb.future_deliberative | Future (p.570) | ✓ | ✓ | ROM 6:1 |
| verb.future_gnomic | Future (p.571) | ✓ | ✓ | ROM 5:7 |
| verb.voice_active | Voice (pp.410–412) | ✓ | ✓ | JHN 3:16 |
| verb.voice_middle_direct | Voice (pp.416–417) | ✓ | ✓ | MAT 27:5 |
| verb.voice_middle_reflexive | Voice (pp.416–418) | ✓ | ✓ | MAT 16:7 |
| verb.voice_middle_reciprocal | Voice (p.427) | ✓ | ✓ | JHN 9:22 |
| verb.voice_passive | Voice (pp.431–438) | ✓ | ✓ | MAT 4:1 |
| verb.voice_permissive_passive | Voice (pp.440–441) | ✓ | ✓ | 2CO 5:20 |

---

## Clause Syntax

Status: **complete**  |  Pages: 656–712  |  Implemented: 12 / 12  |  Tested: 12 (100%)  |  Stub: 0  |  Test mentions: 49  |  Metrics: ✓

| Type | Wallace | Active | Tested | Examples |
|------|---------|--------|--------|----------|
| clause.conditional_first_class | pp.690–694 | ✓ | ✓ | MAT 12:28 |
| clause.conditional_second_class | pp.694–696 | ✓ | ✓ | JHN 11:21 |
| clause.conditional_third_class | pp.696–699 | ✓ | ✓ | 1JN 1:9 |
| clause.conditional_fourth_class | pp.699–701 | ✓ | ✓ | 1PE 3:14 |
| clause.substantival_hoti | pp.659–660（名詞節） | ✓ | ✓ | MAT 5:17 |
| clause.causal_hoti | pp.662–663（副詞節） | ✓ | ✓ | MAT 5:3 |
| clause.purpose_hina | pp.661–662（副詞節） | ✓ | ✓ | JHN 3:16 |
| clause.result_hoste | pp.662–663（副詞節） | ✓ | ✓ | MAT 8:24 |
| clause.temporal_hotan | pp.660–661（副詞節） | ✓ | ✓ | MAT 6:2 |
| clause.temporal_hote | pp.660–661（副詞節） | ✓ | ✓ | MAT 7:28 |
| clause.comparative_kathos | pp.662–663（副詞節） | ✓ | ✓ | JHN 13:34 |
| clause.adjectival_relative | pp.659–660（形容詞節） | ✓ | ✓ | MAT 2:9 |

---

## Conjunction

Status: **complete**  |  Pages: 666–678  |  Implemented: 12 / 12  |  Tested: 12 (100%)  |  Stub: 0  |  Test mentions: 52  |  Metrics: ✓

| Type | Wallace | Active | Tested | Examples |
|------|---------|--------|--------|----------|
| conjunction.coordinating_additive | p.671 | ✓ | ✓ | JHN 1:1 |
| conjunction.coordinating_adversative | p.671 | ✓ | ✓ | 1CO 15:10 |
| conjunction.coordinating_transition | p.674 | ✓ | ✓ | ROM 1:13 |
| conjunction.coordinating_inferential | p.673 | ✓ | ✓ | ROM 12:1 |
| conjunction.coordinating_explanatory | p.673 | ✓ | ✓ | ROM 1:16 |
| conjunction.correlative_men_de | p.672 | ✓ | ✓ | ROM 6:11 |
| conjunction.subordinating_purpose | p.676 | ✓ | ✓ | JHN 3:16 |
| conjunction.subordinating_content | p.678 | ✓ | ✓ | MAT 5:17 |
| conjunction.subordinating_temporal | p.677 | ✓ | ✓ | MAT 6:2 |
| conjunction.subordinating_conditional | p.675 | ✓ | ✓ | 1JN 1:9 |
| conjunction.subordinating_result | p.677 | ✓ | ✓ | MAT 8:24 |
| conjunction.subordinating_comparative | p.675 | ✓ | ✓ | JHN 13:34 |

---

## Particle

Status: **complete**  |  Pages: 465–469, 670–674  |  Implemented: 21 / 21  |  Tested: 21 (100%)  |  Stub: 0  |  Test mentions: 38  |  Metrics: ✓

| Type | Wallace | Active | Tested | Examples |
|------|---------|--------|--------|----------|
| particle.negative_ou | p.468 | ✓ | ✓ | JHN 1:5 |
| particle.negative_me | p.468 | ✓ | ✓ | MAT 6:13, MAT 5:34 |
| particle.double_negative | pp.468–469 | ✓ | ✓ | JHN 10:28 |
| particle.emphatic_negative | pp.468–469 | ✓ | ✓ | JHN 10:28 |
| particle.particle_an | p.469 | ✓ | ✓ | JHN 11:21 |
| particle.particle_ean | p.469 | ✓ | ✓ | 1JN 1:9 |
| particle.interrogative_particle | pp.467–468 | ✓ | ✓ | MAT 12:23 |
| particle.deliberative_particle | pp.466–467 | ✓ | ✓ | ROM 6:1 |
| particle.rhetorical_particle | pp.481–482 | ✓ | ✓ | ROM 6:2 |
| particle.emphatic_ge | p.673 | ✓ | ✓ | GAL 3:4 |
| particle.restrictive_monon | p.200 | ✓ | ✓ | MAT 8:8 |
| particle.continuative_de | p.674 | ✓ | ✓ | ROM 1:13 |
| particle.inferential_oun | p.673 | ✓ | ✓ | ROM 12:1 |
| particle.explanatory_gar | p.673 | ✓ | ✓ | ROM 1:16 |
| particle.correlative_men | p.672 | ✓ | ✓ | ROM 6:11 |
| particle.correlative_de | p.672 | ✓ | ✓ | ROM 6:11 |
| particle.connective_te | p.671 | ✓ | ✓ | MAT 22:10 |
| particle.assertive_de | p.673 | ✓ | ✓ | MAT 13:23 |
| particle.attention_de | p.673 | ✓ | ✓ | ACT 13:2 |
| particle.emphasis_per | p.673 | ✓ | ✓ | — |
| particle.emphasis_toi | p.673 | ✓ | ✓ | — |

---

# Part II — Engine Extensions（GGBB に章は存在しない独自レイヤー）

Nominal Syntax は名詞句（NP）全体を横断解析するための独自レイヤー、
Discourse / Information Structure は Wallace が各章で個別に扱う語順・強調・
談話的特徴を横断的に整理したエンジン拡張である。Pages 欄は対応する章では
なく、エンジンが参照する GGBB の関連箇所を示す。

## Nominal Syntax（Engine Extension）

Status: **complete**  |  GGBB 関連箇所: 206–314 passim  |  Implemented: 12 / 12  |  Tested: 12 (100%)  |  Stub: 0  |  Test mentions: 23  |  Metrics: ✓

| Type | Wallace | Active | Tested | Examples |
|------|---------|--------|--------|----------|
| nominal_syntax.simple_np | pp.243–245 | ✓ | ✓ | JHN 1:6 |
| nominal_syntax.articular_np | pp.206–231 | ✓ | ✓ | JHN 1:1 |
| nominal_syntax.anarthrous_np | pp.243–254 | ✓ | ✓ | JHN 1:1 |
| nominal_syntax.modified_np | pp.306–309 | ✓ | ✓ | MAT 12:35, JHN 10:11, LUK 8:11 |
| nominal_syntax.multiple_modifier_np | pp.306–314 | ✓ | ✓ | MAT 6:11 |
| nominal_syntax.appositional_np | p.48 | ✓ | ✓ | MAT 1:6 |
| nominal_syntax.substantival_phrase | pp.231–238 | ✓ | ✓ | MAT 5:3, MAT 7:21, MAT 5:15 |
| nominal_syntax.head_initial_np | pp.306–307 | ✓ | ✓ | JHN 10:11 |
| nominal_syntax.head_final_np | pp.306–307 | ✓ | ✓ | MAT 12:35 |
| nominal_syntax.nested_np | pp.239–240 | ✓ | ✓ | LUK 8:11, MAT 8:20 |
| nominal_syntax.complex_np | p.87 | ✓ | ✓ | 2CO 4:4 |
| nominal_syntax.vocative_np | pp.65–71 | ✓ | ✓ | MAT 6:9 |

---

## Discourse（Engine Extension）

Status: **complete**  |  GGBB 関連箇所: 51–53, 526–532, 622–625 passim  |  Implemented: 10 / 10  |  Tested: 10 (100%)  |  Stub: 0  |  Test mentions: 22  |  Metrics: ✓

| Type | Wallace | Active | Tested | Examples |
|------|---------|--------|--------|----------|
| discourse.topic_fronting | pp.51–53（語順と主題化） | ✓ | ✓ | 1JN 4:8 |
| discourse.focus_fronting | passim（語順による強調） | ✓ | ✓ | ROM 10:2 |
| discourse.emphasis_word_order | passim（語順による強調） | ✓ | ✓ | EPH 2:8 |
| discourse.left_dislocation | pp.51–53 | ✓ | ✓ | ACT 7:40 |
| discourse.right_dislocation | pp.51–53（転位構文） | ✓ | ✓ | JHN 9:13 |
| discourse.parenthetical | p.53 | ✓ | ✓ | ROM 3:5 |
| discourse.explanatory_parenthesis | p.336 | ✓ | ✓ | MRK 3:17 |
| discourse.contrast_men_de | p.672 | ✓ | ✓ | MAT 9:37 |
| discourse.backgrounding | pp.622–625 | ✓ | ✓ | MRK 1:10, 1JN 1:9 |
| discourse.foregrounding | pp.526–532 | ✓ | ✓ | MRK 1:40 |

---

## Regression Matrix

| Category | Type | Representative | Tested |
|----------|------|----------------|--------|
| Nominative | subject | MAT 1:2 | ✓ |
| Nominative | predicate_nominative | JHN 1:1 | ✓ |
| Nominative | apposition | ROM 1:1 | ✓ |
| Nominative | nominative_absolute | REV 1:4 | ✓ |
| Nominative | pendens | ACT 7:40 | ✓ |
| Nominative | vocative_nominative | MRK 9:25 | ✓ |
| Nominative | indeclinable | MAT 1:2 | ✓ |
| Nominative | subject_with_infinitive | PHP 1:21 | ✓ |
| Nominative | exclamation | ROM 7:24 | ✓ |
| Nominative | title_nominative | MAT 1:1 | ✓ |
| Vocative | direct_address | MAT 8:2 | ✓ |
| Vocative | with_o | MAT 15:28 | ✓ |
| Vocative | nominative_for_vocative | JHN 20:28 | ✓ |
| Vocative | exclamatory | ROM 11:33 | ✓ |
| Vocative | chain | MAT 27:46 | ✓ |
| Genitive | possessive | MAT 5:3 | ✓ |
| Genitive | descriptive | ROM 7:24 | ✓ |
| Genitive | partitive | ROM 11:17 | ✓ |
| Genitive | attributive | ROM 6:6 | ✓ |
| Genitive | epexegetical | ROM 4:11 | ✓ |
| Genitive | relationship | MAT 1:1 | ✓ |
| Genitive | material | REV 18:12 | ✓ |
| Genitive | content | JHN 21:8 | ✓ |
| Genitive | attributed | ROM 6:4 | ✓ |
| Genitive | predicate | 1CO 6:19 | ✓ |
| Genitive | subjective | ROM 8:35 | ✓ |
| Genitive | objective | ROM 3:22 | ✓ |
| Genitive | plenary | 2CO 5:14 | ✓ |
| Genitive | comparison | MAT 3:11 | ✓ |
| Genitive | separation | ROM 8:39 | ✓ |
| Genitive | time | JHN 3:2 | ✓ |
| Genitive | place | LUK 16:24 | ✓ |
| Genitive | agency | JHN 6:45 | ✓ |
| Genitive | means | — | ✓ |
| Genitive | source | JAS 1:13 | ✓ |
| Genitive | absolute | MAT 2:1 | ✓ |
| Genitive | direct_object | JHN 10:3 | ✓ |
| Dative | indirect_object | MAT 7:6 | ✓ |
| Dative | interest_advantage | ROM 6:10 | ✓ |
| Dative | interest_disadvantage | ROM 8:7 | ✓ |
| Dative | reference | ROM 6:11 | ✓ |
| Dative | ethical | MAT 21:5 | ✓ |
| Dative | possession | LUK 2:7 | ✓ |
| Dative | direct_object | MAT 4:10 | ✓ |
| Dative | sphere | ACT 16:5 | ✓ |
| Dative | time | JHN 2:1 | ✓ |
| Dative | means | ROM 3:28 | ✓ |
| Dative | manner | JHN 7:26 | ✓ |
| Dative | association | ROM 6:4 | ✓ |
| Dative | agent | LUK 23:15 | ✓ |
| Dative | measure | ROM 5:9 | ✓ |
| Accusative | direct_object | MAT 22:37 | ✓ |
| Accusative | subject_of_infinitive | MAT 16:13 | ✓ |
| Accusative | double_person_thing | JHN 14:26 | ✓ |
| Accusative | object_complement | PHP 3:7 | ✓ |
| Accusative | cognate | MAT 2:10 | ✓ |
| Accusative | predicate | ACT 28:6 | ✓ |
| Accusative | adverbial | MAT 26:45 | ✓ |
| Article | monadic | MAT 5:14 | ✓ |
| Article | generic | MAT 5:13 | ✓ |
| Article | previous_reference | JHN 4:9 | ✓ |
| Article | par_excellence | JHN 1:21 | ✓ |
| Article | simple_identification | MAT 2:14 | ✓ |
| Article | well_known | JHN 7:38 | ✓ |
| Article | abstract | ROM 13:10 | ✓ |
| Article | deictic | LUK 23:47 | ✓ |
| Article | kataphoric | JHN 15:20 | ✓ |
| Article | granville_sharp | EPH 1:3 | ✓ |
| Article | colwell | JHN 1:1 | ✓ |
| Adjective | attributive | JHN 10:11 | ✓ |
| Adjective | predicate | ROM 7:12 | ✓ |
| Adjective | substantival | LUK 6:20 | ✓ |
| Adjective | attributive_position | JHN 10:11 | ✓ |
| Adjective | predicate_position | ROM 7:12 | ✓ |
| Adjective | comparative | JHN 13:16 | ✓ |
| Adjective | superlative | 2PE 1:4 | ✓ |
| Adjective | proper_adjective | MAT 7:17 | ✓ |
| Adjective | restrictive | JHN 10:11 | ✓ |
| Adjective | epithet | LUK 1:3 | ✓ |
| Adjective | genitive_complement | LUK 23:15 | ✓ |
| Pronoun | personal | JHN 8:12 | ✓ |
| Pronoun | intensive | 1TH 4:16 | ✓ |
| Pronoun | identical | 1CO 12:5 | ✓ |
| Pronoun | reflexive | PHP 2:8 | ✓ |
| Pronoun | reciprocal | JHN 13:34 | ✓ |
| Pronoun | demonstrative | JHN 1:2 | ✓ |
| Pronoun | relative | MRK 3:29 | ✓ |
| Pronoun | interrogative | MAT 6:31 | ✓ |
| Pronoun | indefinite | GAL 6:1 | ✓ |
| Pronoun | distributive | 1CO 3:8 | ✓ |
| Pronoun | reciprocal_emphasis | 1TH 3:12 | ✓ |
| Pronoun | possessive_pronoun | JHN 8:16 | ✓ |
| Preposition | proper_with_genitive | MRK 1:10 | ✓ |
| Preposition | proper_with_dative | MAT 3:11 | ✓ |
| Preposition | proper_with_accusative | MAT 4:12 | ✓ |
| Preposition | improper | LUK 1:15 | ✓ |
| Preposition | adverbial_pp | MRK 1:10 | ✓ |
| Preposition | attributive_pp | MAT 6:9 | ✓ |
| Preposition | substantival_pp | GAL 3:7 | ✓ |
| Infinitive | purpose | MAT 13:3 | ✓ |
| Infinitive | result | MAT 8:24 | ✓ |
| Infinitive | time | MAT 26:32 | ✓ |
| Infinitive | cause | MAT 13:5 | ✓ |
| Infinitive | means | MAT 13:4 | ✓ |
| Infinitive | complementary | MAT 6:24 | ✓ |
| Infinitive | subject | MAT 16:21 | ✓ |
| Infinitive | indirect_discourse | MAT 16:13 | ✓ |
| Infinitive | epexegetical | MAT 3:11 | ✓ |
| Infinitive | articular | PHP 1:21 | ✓ |
| Infinitive | imperatival | ROM 12:15 | ✓ |
| Participle | attributive | JHN 4:11 | ✓ |
| Participle | predicate | MAT 3:15 | ✓ |
| Participle | substantival | JHN 3:16 | ✓ |
| Participle | adverbial_temporal | MAT 2:7 | ✓ |
| Participle | adverbial_attendant | MAT 2:8 | ✓ |
| Participle | adverbial_causal | ROM 5:1 | ✓ |
| Participle | adverbial_manner | LUK 19:6 | ✓ |
| Participle | adverbial_means | ACT 16:16 | ✓ |
| Participle | adverbial_conditional | GAL 6:9 | ✓ |
| Participle | adverbial_concessive | HEB 5:8 | ✓ |
| Participle | adverbial_purpose_result | ACT 8:27 | ✓ |
| Participle | genitive_absolute | MAT 9:18 | ✓ |
| Participle | periphrastic | MAT 16:19 | ✓ |
| Participle | imperatival | ROM 12:9 | ✓ |
| Participle | complementary | LUK 5:4 | ✓ |
| Participle | indirect_discourse | ACT 7:12 | ✓ |
| Participle | redundant | MAT 4:4 | ✓ |
| Verb (Mood) | declarative | JHN 1:1 | ✓ |
| Verb (Mood) | historical_present | MRK 1:40 | ✓ |
| Verb (Mood) | gnomic_present | 2CO 9:7 | ✓ |
| Verb (Mood) | futuristic_present | JHN 4:25 | ✓ |
| Verb (Mood) | epistolary_aorist | PHP 2:28 | ✓ |
| Verb (Mood) | dramatic_aorist | MAT 3:17 | ✓ |
| Verb (Mood) | imperative_customary | LUK 11:3 | ✓ |
| Verb (Mood) | imperative_constative | ACT 2:38 | ✓ |
| Verb (Mood) | imperative_ingressive | JHN 2:7 | ✓ |
| Verb (Mood) | imperative_urgency | MAT 6:11 | ✓ |
| Verb (Mood) | imperative_permissive | MAT 27:42 | ✓ |
| Verb (Mood) | hortatory | HEB 12:1 | ✓ |
| Verb (Mood) | prohibitory | MAT 6:13 | ✓ |
| Verb (Mood) | deliberative | MAT 6:31 | ✓ |
| Verb (Mood) | emphatic_negation | JHN 10:28 | ✓ |
| Verb (Mood) | purpose_clause | JHN 17:3 | ✓ |
| Verb (Mood) | indefinite_relative | MRK 3:29 | ✓ |
| Verb (Mood) | conditional_subjunctive | 1JN 1:9 | ✓ |
| Verb (Mood) | potential_optative | ACT 8:31 | ✓ |
| Verb (Mood) | wish_optative | ROM 6:2 | ✓ |
| Verb (Mood) | optative_indirect_discourse | LUK 8:9 | ✓ |
| Verb (Mood) | present_progressive | MAT 25:8 | ✓ |
| Verb (Mood) | present_customary | LUK 18:12 | ✓ |
| Verb (Mood) | present_iterative | MAT 17:15 | ✓ |
| Verb (Mood) | imperfect_progressive | MRK 9:31 | ✓ |
| Verb (Mood) | imperfect_ingressive | MAT 5:2 | ✓ |
| Verb (Mood) | imperfect_iterative | JHN 19:3 | ✓ |
| Verb (Mood) | imperfect_customary | MRK 15:6 | ✓ |
| Verb (Mood) | imperfect_conative | MAT 3:14 | ✓ |
| Verb (Mood) | aorist_constative | REV 20:4 | ✓ |
| Verb (Mood) | aorist_ingressive | 2CO 8:9 | ✓ |
| Verb (Mood) | aorist_culminative | PHP 4:11 | ✓ |
| Verb (Mood) | aorist_gnomic | 1PE 1:24 | ✓ |
| Verb (Mood) | perfect_intensive | MAT 4:4 | ✓ |
| Verb (Mood) | perfect_extensive | JHN 1:34 | ✓ |
| Verb (Mood) | perfect_dramatic | JHN 1:15 | ✓ |
| Verb (Mood) | pluperfect_intensive | MRK 1:34 | ✓ |
| Verb (Mood) | pluperfect_extensive | JHN 4:8 | ✓ |
| Verb (Mood) | future_predictive | ACT 1:11 | ✓ |
| Verb (Mood) | future_imperatival | MAT 22:39 | ✓ |
| Verb (Mood) | future_deliberative | ROM 6:1 | ✓ |
| Verb (Mood) | future_gnomic | ROM 5:7 | ✓ |
| Verb (Mood) | voice_active | JHN 3:16 | ✓ |
| Verb (Mood) | voice_middle_direct | MAT 27:5 | ✓ |
| Verb (Mood) | voice_middle_reflexive | MAT 16:7 | ✓ |
| Verb (Mood) | voice_middle_reciprocal | JHN 9:22 | ✓ |
| Verb (Mood) | voice_passive | MAT 4:1 | ✓ |
| Verb (Mood) | voice_permissive_passive | 2CO 5:20 | ✓ |
| Clause Syntax | conditional_first_class | MAT 12:28 | ✓ |
| Clause Syntax | conditional_second_class | JHN 11:21 | ✓ |
| Clause Syntax | conditional_third_class | 1JN 1:9 | ✓ |
| Clause Syntax | conditional_fourth_class | 1PE 3:14 | ✓ |
| Clause Syntax | substantival_hoti | MAT 5:17 | ✓ |
| Clause Syntax | causal_hoti | MAT 5:3 | ✓ |
| Clause Syntax | purpose_hina | JHN 3:16 | ✓ |
| Clause Syntax | result_hoste | MAT 8:24 | ✓ |
| Clause Syntax | temporal_hotan | MAT 6:2 | ✓ |
| Clause Syntax | temporal_hote | MAT 7:28 | ✓ |
| Clause Syntax | comparative_kathos | JHN 13:34 | ✓ |
| Clause Syntax | adjectival_relative | MAT 2:9 | ✓ |
| Conjunction | coordinating_additive | JHN 1:4 | ✓ |
| Conjunction | coordinating_adversative | 1CO 15:10 | ✓ |
| Conjunction | coordinating_transition | ROM 1:13 | ✓ |
| Conjunction | coordinating_inferential | ROM 12:1 | ✓ |
| Conjunction | coordinating_explanatory | ROM 1:16 | ✓ |
| Conjunction | correlative_men_de | ROM 6:11 | ✓ |
| Conjunction | subordinating_purpose | MAT 5:16 | ✓ |
| Conjunction | subordinating_content | MAT 5:17 | ✓ |
| Conjunction | subordinating_temporal | MAT 6:2 | ✓ |
| Conjunction | subordinating_conditional | MAT 12:28 | ✓ |
| Conjunction | subordinating_result | MAT 8:24 | ✓ |
| Conjunction | subordinating_comparative | JHN 13:34 | ✓ |
| Particle | negative_ou | JHN 1:5 | ✓ |
| Particle | negative_me | MAT 6:13 | ✓ |
| Particle | double_negative | JHN 10:28 | ✓ |
| Particle | emphatic_negative | JHN 10:28 | ✓ |
| Particle | particle_an | JHN 11:21 | ✓ |
| Particle | particle_ean | 1JN 1:9 | ✓ |
| Particle | interrogative_particle | MAT 12:23 | ✓ |
| Particle | deliberative_particle | ROM 6:1 | ✓ |
| Particle | rhetorical_particle | ROM 6:2 | ✓ |
| Particle | emphatic_ge | GAL 3:4 | ✓ |
| Particle | restrictive_monon | MAT 8:8 | ✓ |
| Particle | continuative_de | ROM 1:13 | ✓ |
| Particle | inferential_oun | ROM 12:1 | ✓ |
| Particle | explanatory_gar | ROM 1:16 | ✓ |
| Particle | correlative_men | MAT 9:37 | ✓ |
| Particle | correlative_de | MAT 9:37 | ✓ |
| Particle | connective_te | MAT 22:10 | ✓ |
| Particle | assertive_de | MAT 13:23 | ✓ |
| Particle | attention_de | ACT 13:2 | ✓ |
| Particle | emphasis_per | — | ✓ |
| Particle | emphasis_toi | — | ✓ |
| Nominal Syntax | simple_np | JHN 1:6 | ✓ |
| Nominal Syntax | articular_np | JHN 1:14 | ✓ |
| Nominal Syntax | anarthrous_np | JHN 1:6 | ✓ |
| Nominal Syntax | modified_np | MAT 12:35 | ✓ |
| Nominal Syntax | multiple_modifier_np | MAT 6:11 | ✓ |
| Nominal Syntax | appositional_np | MAT 1:6 | ✓ |
| Nominal Syntax | substantival_phrase | MAT 5:3 | ✓ |
| Nominal Syntax | head_initial_np | LUK 8:11 | ✓ |
| Nominal Syntax | head_final_np | MAT 12:35 | ✓ |
| Nominal Syntax | nested_np | MAT 8:20 | ✓ |
| Nominal Syntax | complex_np | 2CO 4:4 | ✓ |
| Nominal Syntax | vocative_np | MAT 6:9 | ✓ |
| Discourse | topic_fronting | 1JN 4:8 | ✓ |
| Discourse | focus_fronting | ROM 10:2 | ✓ |
| Discourse | emphasis_word_order | EPH 2:8 | ✓ |
| Discourse | left_dislocation | ACT 7:40 | ✓ |
| Discourse | right_dislocation | JHN 9:13 | ✓ |
| Discourse | parenthetical | ROM 3:5 | ✓ |
| Discourse | explanatory_parenthesis | MRK 3:17 | ✓ |
| Discourse | contrast_men_de | MAT 9:37 | ✓ |
| Discourse | backgrounding | MRK 1:10 | ✓ |
| Discourse | foregrounding | MRK 1:40 | ✓ |

---

## Validation

- FAIL: 0
- WARN: 0
- INFO: 64
  - ℹ️ 代表節の共有: MAT 5:3 (genitive.possessive, clause.causal_hoti, nominal_syntax.substantival_phrase)
  - ℹ️ 代表節の共有: ROM 7:24 (genitive.descriptive, nominative.exclamation)
  - ℹ️ 代表節の共有: MAT 1:1 (genitive.relationship, nominative.title_nominative)
  - ℹ️ 代表節の共有: ROM 6:4 (genitive.attributed, dative.association)
  - ℹ️ 代表節の共有: MAT 3:11 (genitive.comparison, infinitive.epexegetical, preposition.proper_with_dative)
  - ℹ️ 代表節の共有: ROM 6:11 (dative.reference, conjunction.correlative_men_de)
  - ℹ️ 代表節の共有: LUK 23:15 (dative.agent, adjective.genitive_complement)
  - ℹ️ 代表節の共有: JHN 3:16 (participle.substantival, verb.voice_active, clause.purpose_hina)
  - ℹ️ 代表節の共有: MAT 4:4 (participle.redundant, verb.perfect_intensive)
  - ℹ️ 代表節の共有: JHN 1:1 (article.colwell, verb.declarative, nominative.predicate_nominative)
  - ℹ️ 代表節の共有: MAT 16:13 (accusative.subject_of_infinitive, infinitive.indirect_discourse)
  - ℹ️ 代表節の共有: MAT 8:24 (infinitive.result, clause.result_hoste, conjunction.subordinating_result)
  - ℹ️ 代表節の共有: PHP 1:21 (infinitive.articular, nominative.subject_with_infinitive)
  - ℹ️ 代表節の共有: MRK 1:40 (verb.historical_present, discourse.foregrounding)
  - ℹ️ 代表節の共有: MAT 6:11 (verb.imperative_urgency, nominal_syntax.multiple_modifier_np)
  - ℹ️ 代表節の共有: MAT 6:13 (verb.prohibitory, particle.negative_me)
  - ℹ️ 代表節の共有: MAT 6:31 (verb.deliberative, pronoun.interrogative)
  - ℹ️ 代表節の共有: JHN 10:28 (verb.emphatic_negation, particle.double_negative, particle.emphatic_negative)
  - ℹ️ 代表節の共有: MRK 3:29 (verb.indefinite_relative, pronoun.relative)
  - ℹ️ 代表節の共有: 1JN 1:9 (verb.conditional_subjunctive, clause.conditional_third_class, particle.particle_ean)
  - ℹ️ 代表節の共有: ROM 6:2 (verb.wish_optative, particle.rhetorical_particle)
  - ℹ️ 代表節の共有: ROM 6:1 (verb.future_deliberative, particle.deliberative_particle)
  - ℹ️ 代表節の共有: JHN 10:11 (adjective.attributive, adjective.attributive_position, adjective.restrictive)
  - ℹ️ 代表節の共有: ROM 7:12 (adjective.predicate, adjective.predicate_position)
  - ℹ️ 代表節の共有: JHN 13:34 (pronoun.reciprocal, clause.comparative_kathos, conjunction.subordinating_comparative)
  - ℹ️ 代表節の共有: MAT 1:2 (nominative.subject, nominative.indeclinable)
  - ℹ️ 代表節の共有: ACT 7:40 (nominative.pendens, discourse.left_dislocation)
  - ℹ️ 代表節の共有: MAT 12:28 (clause.conditional_first_class, conjunction.subordinating_conditional)
  - ℹ️ 代表節の共有: JHN 11:21 (clause.conditional_second_class, particle.particle_an)
  - ℹ️ 代表節の共有: MAT 5:17 (clause.substantival_hoti, conjunction.subordinating_content)
  - ℹ️ 代表節の共有: MAT 6:2 (clause.temporal_hotan, conjunction.subordinating_temporal)
  - ℹ️ 代表節の共有: MRK 1:10 (preposition.proper_with_genitive, preposition.adverbial_pp, discourse.backgrounding)
  - ℹ️ 代表節の共有: MAT 6:9 (preposition.attributive_pp, nominal_syntax.vocative_np)
  - ℹ️ 代表節の共有: ROM 1:13 (conjunction.coordinating_transition, particle.continuative_de)
  - ℹ️ 代表節の共有: ROM 12:1 (conjunction.coordinating_inferential, particle.inferential_oun)
  - ℹ️ 代表節の共有: ROM 1:16 (conjunction.coordinating_explanatory, particle.explanatory_gar)
  - ℹ️ 代表節の共有: MAT 9:37 (particle.correlative_men, particle.correlative_de, discourse.contrast_men_de)
  - ℹ️ 代表節の共有: JHN 1:6 (nominal_syntax.simple_np, nominal_syntax.anarthrous_np)
  - ℹ️ 代表節の共有: MAT 12:35 (nominal_syntax.modified_np, nominal_syntax.head_final_np)
  - ℹ️ 同一ページ pp.654–655: genitive.absolute, participle.genitive_absolute
  - ℹ️ 同一ページ pp.619–621: participle.predicate, participle.substantival
  - ℹ️ 同一ページ pp.526–532: verb.historical_present, discourse.foregrounding
  - ℹ️ 同一ページ pp.485–486: verb.imperative_customary, verb.imperative_constative, verb.imperative_ingressive, verb.imperative_permissive
  - ℹ️ 同一ページ p.469: verb.prohibitory, particle.particle_an, particle.particle_ean
  - ℹ️ 同一ページ p.468: verb.emphatic_negation, particle.negative_ou, particle.negative_me
  - ℹ️ 同一ページ pp.306–309: adjective.attributive, nominal_syntax.modified_np
  - ℹ️ 同一ページ pp.306–307: adjective.attributive_position, adjective.restrictive, nominal_syntax.head_initial_np, nominal_syntax.head_final_np
  - ℹ️ 同一ページ pp.351–352: pronoun.reciprocal, pronoun.reciprocal_emphasis
  - ℹ️ 同一ページ pp.51–53: nominative.pendens, discourse.topic_fronting, discourse.left_dislocation, discourse.right_dislocation
  - ℹ️ 同一ページ pp.56–59: nominative.vocative_nominative, vocative.nominative_for_vocative
  - ℹ️ 同一ページ pp.67–68: vocative.direct_address, vocative.chain
  - ℹ️ 同一ページ pp.68–69: vocative.with_o, vocative.exclamatory
  - ℹ️ 同一ページ pp.659–660: clause.substantival_hoti, clause.adjectival_relative
  - ℹ️ 同一ページ pp.662–663: clause.causal_hoti, clause.result_hoste, clause.comparative_kathos
  - ℹ️ 同一ページ pp.660–661: clause.temporal_hotan, clause.temporal_hote
  - ℹ️ 同一ページ pp.360–363: preposition.proper_with_genitive, preposition.proper_with_dative, preposition.proper_with_accusative
  - ℹ️ 同一ページ pp.356–357: preposition.adverbial_pp, preposition.attributive_pp, preposition.substantival_pp
  - ℹ️ 同一ページ p.671: conjunction.coordinating_additive, conjunction.coordinating_adversative, particle.connective_te
  - ℹ️ 同一ページ p.674: conjunction.coordinating_transition, particle.continuative_de
  - ℹ️ 同一ページ p.673: conjunction.coordinating_inferential, conjunction.coordinating_explanatory, particle.emphatic_ge, particle.inferential_oun, particle.explanatory_gar, particle.assertive_de, particle.attention_de, particle.emphasis_per, particle.emphasis_toi
  - ℹ️ 同一ページ p.672: conjunction.correlative_men_de, particle.correlative_men, particle.correlative_de, discourse.contrast_men_de
  - ℹ️ 同一ページ p.677: conjunction.subordinating_temporal, conjunction.subordinating_result
  - ℹ️ 同一ページ p.675: conjunction.subordinating_conditional, conjunction.subordinating_comparative
  - ℹ️ 同一ページ pp.468–469: particle.double_negative, particle.emphatic_negative

---

## Corpus Metrics（book_summary.json より引用）

- Representative Examples Verified: 220 / 242
- Analyzed tokens: 131923
- Average confidence: 0.613
- Unresolved (<0.40): 6151
- Top confusion:
  - article.simple_identification>article.monadic: 12175
  - conjunction.coordinating_additive>conjunction.subordinating_content: 7995
  - genitive.possessive>genitive.descriptive: 4964
  - verb.declarative>discourse.foregrounding: 3673
  - preposition.proper_with_accusative>preposition.adverbial_pp: 2392

