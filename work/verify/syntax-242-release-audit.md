# 統語論検索 242ラベル・リリース品質監査台帳（初版）

- 対象: `public/assets/data/syntax-registry.json`（main blob `a80206bbed9ea37880dcc19fc55e838862c773e8`）
- 対象ラベル数: 242
- 作成目的: 80%リリース目標に向け、242ラベルの判定根拠・入力要件・検証状態を漏れなく管理する。
- **本書は一次棚卸しであり、個々のラベルの学術的分類を確定するものではない。** 未確認ラベルを推測で「構造的」「意味的」と確定しない。
- 今回は監査台帳のみを追加。アプリ本体・レジストリ・検索ロジック・UIは変更していない。

## リリース判定の原則

1. 形態・構造の観測事実と、意味関係／談話機能の解釈を別々に記録する。
2. 検出条件が一致したことを、用法の意味が確定したことと同一視しない。
3. 必要な入力が存在しない条件は、陰性扱いで隠さず `unsupported` または候補提示にする。
4. ラベルごとに、肯定例・否定例・競合例を人手で確認した評価用例を用意する。
5. Wallace の該当節・ページを一次の文法根拠として照合し、根拠未確認の説明や自動判定規則を作らない。
6. A（リリース対象として検証）／B（候補提示）／C（自動判定保留）は、実例監査後に決める。現在の一覧ではランクを先に決めない。

## 現状の分類メタデータ

| `dictionary.classification` | 件数 | 意味 |
|---|---:|---|
| Semantic | 13 | 既存データ上の意味分類。自動判定可能性は別途検証 |
| Hybrid | 6 | 既存データ上の混合分類。判定根拠を分解して検証 |
| 未分類 | 214 | 分類メタデータなし。分類未確定のため個別監査が必要 |
| Structural | 9 | 既存データ上の構造分類。規則の妥当性は別途検証 |

**注意:** 分類メタデータの有無は、判定ロジックの正確さを直接保証しない。既存分類がある28件も例外なく実例検証の対象とする。

## 全242ラベルの棚卸し

各行の「条件／シグナル」はレジストリに登録された件数で、正しさや精度の評価ではない。「分類」は既存の値であり、未分類は未評価を意味する。

### genitive（22件）

監査観点：意味関係を含むため重点監査（構造検出と意味推定を分離）

| ID | ラベル | 既存分類 | 条件数 | シグナル数 | 登録例 | Wallace参照 |
|---|---|---|---:|---:|---|---|
| `genitive.possessive` | 所有属格 | Semantic | 4 | 4 | MAT 5:3 | §4.A.1 (pp.81–83) |
| `genitive.descriptive` | 描写的属格 | Semantic | 4 | 4 | ROM 7:24 | §4.A.2 (pp.79–81) |
| `genitive.partitive` | 部分属格 | Semantic | 3 | 3 | ROM 11:17 | §4.A.5 (pp.84–86) |
| `genitive.attributive` | 属性属格（ヘブライ語的） | Hybrid | 3 | 3 | ROM 6:6 | §4.A.3 (pp.86–88) |
| `genitive.epexegetical` | 説明的同格属格 | Semantic | 3 | 3 | ROM 4:11 | §4.A.9 (pp.94–100) |
| `genitive.relationship` | 関係属格 | 未分類 | 2 | 2 | MAT 1:1 | §4.A.1 sub (pp.83–84) |
| `genitive.material` | 材料属格 | 未分類 | 2 | 2 | REV 18:12 | §4.A.6 (pp.88–90) |
| `genitive.content` | 内容属格 | 未分類 | 2 | 2 | JHN 21:8 | §4.A.7 (pp.90–92) |
| `genitive.attributed` | 被属性属格（逆転） | 未分類 | 1 | 1 | ROM 6:4 | §4.A.4 (pp.88) |
| `genitive.predicate` | 述語属格 | 未分類 | 2 | 2 | 1CO 6:19 | §4.A.12 (pp.100–101) |
| `genitive.subjective` | 主語的属格 | Semantic | 4 | 4 | ROM 8:35 | §4.B.1 (pp.112–116) |
| `genitive.objective` | 目的語的属格 | Semantic | 3 | 3 | ROM 3:22 | §4.B.2 (pp.116–119) |
| `genitive.plenary` | 複合属格 | 未分類 | 2 | 2 | 2CO 5:14 | §4.B.3 (pp.119–121) |
| `genitive.comparison` | 比較属格 | Structural | 2 | 2 | MAT 3:11 | §4.C.7 (pp.110–112) |
| `genitive.separation` | 分離属格 | Hybrid | 2 | 2 | ROM 8:39 | §4.C.6 (pp.107–109) |
| `genitive.time` | 時間の属格 | Structural | 2 | 2 | JHN 3:2 | §4.C.1 (pp.122–124) |
| `genitive.place` | 場所属格 | 未分類 | 2 | 2 | LUK 16:24 | §4.C.2 (pp.124–125) |
| `genitive.agency` | 行為者属格 | 未分類 | 1 | 1 | JHN 6:45 | §4.C.5 (pp.126–127) |
| `genitive.means` | 手段属格 | 未分類 | 3 | 3 | — | §4.C.3 (pp.125) |
| `genitive.source` | 起源属格 | Hybrid | 3 | 2 | JAS 1:13 | §4.C.4 (pp.109–110) |
| `genitive.absolute` | 属格絶対 | Structural | 5 | 5 | MAT 2:1 | §4.C special (pp.654–655) |
| `genitive.direct_object` | 動詞支配属格（直接目的語） | 未分類 | 2 | 2 | JHN 10:3 | §4 after certain verbs (pp.131–134) |

### dative（14件）

監査観点：意味役割・動詞支配・格構造を分離して重点監査

| ID | ラベル | 既存分類 | 条件数 | シグナル数 | 登録例 | Wallace参照 |
|---|---|---|---:|---:|---|---|
| `dative.indirect_object` | 間接目的語与格 | Structural | 4 | 4 | MAT 7:6 | §6.A.1 (pp.140–142) |
| `dative.interest_advantage` | 利益与格 | Semantic | 3 | 3 | ROM 6:10 | §6.A.2a (pp.142–144) |
| `dative.interest_disadvantage` | 不利益与格 | Semantic | 2 | 2 | ROM 8:7 | §6.A.2b (pp.144–145) |
| `dative.reference` | 基準与格（参照与格） | Semantic | 3 | 3 | ROM 6:11 | §6.A.4 (pp.144–146) |
| `dative.ethical` | 道義的与格（倫理的与格） | 未分類 | 2 | 2 | MAT 21:5 | §6.A.5 (pp.146–147) |
| `dative.possession` | 所有与格 | 未分類 | 3 | 3 | LUK 2:7 | §6.A (pp.149–151) |
| `dative.direct_object` | 動詞支配与格（直接目的語） | 未分類 | 2 | 2 | MAT 4:10 | §6 after certain verbs (pp.171–173) |
| `dative.sphere` | 領域与格（場所・球体与格） | Semantic | 2 | 2 | ACT 16:5 | §6.B.1 (pp.153–155) |
| `dative.time` | 時間与格 | Structural | 2 | 2 | JHN 2:1 | §6.B.2 (pp.155–156) |
| `dative.means` | 手段与格 | Semantic | 4 | 4 | ROM 3:28 | §6.C.1 (pp.156–158) |
| `dative.manner` | 様態与格 | Semantic | 2 | 2 | JHN 7:26 | §6.C.2 (pp.158–160) |
| `dative.association` | 結合与格（付帯与格） | Hybrid | 3 | 3 | ROM 6:4 | §6.C.5 (pp.159–160) |
| `dative.agent` | 行為者与格 | 未分類 | 2 | 2 | LUK 23:15 | §6.C.6 (pp.163–166) |
| `dative.measure` | 程度与格 | 未分類 | 2 | 2 | ROM 5:9 | §6.C.4 (pp.160–162) |

### participle（17件）

監査観点：構造／時間・原因等の意味／談話機能を分離して重点監査

| ID | ラベル | 既存分類 | 条件数 | シグナル数 | 登録例 | Wallace参照 |
|---|---|---|---:|---:|---|---|
| `participle.attributive` | 形容詞用法（限定的） | Structural | 4 | 4 | JHN 4:11 | §27.A.1a (pp.617–619) |
| `participle.predicate` | 述語的分詞 | 未分類 | 2 | 2 | MAT 3:15 | §27.A.1b (pp.619–621) |
| `participle.substantival` | 実体用法（名詞的） | Structural | 5 | 5 | JHN 3:16 | §27.A.2 (pp.619–621) |
| `participle.adverbial_temporal` | 副詞用法—時間（先行・同時・結果状態） | Structural | 6 | 6 | MAT 2:7 | §27.B.1 (pp.623–627) |
| `participle.adverbial_attendant` | 付帯状況 | Hybrid | 4 | 3 | MAT 2:8 | §27.B.8 (pp.640–645) |
| `participle.adverbial_causal` | 理由・原因 | Semantic | 3 | 3 | ROM 5:1 | §27.B.4 (pp.630–632) |
| `participle.adverbial_manner` | 様態 | 未分類 | 2 | 2 | LUK 19:6 | §27.B.3 (pp.628–630) |
| `participle.adverbial_means` | 手段 | 未分類 | 2 | 2 | ACT 16:16 | §27.B.2 (pp.628) |
| `participle.adverbial_conditional` | 条件 | 未分類 | 3 | 3 | GAL 6:9 | §27.B.5 (pp.632–634) |
| `participle.adverbial_concessive` | 譲歩 | 未分類 | 2 | 2 | HEB 5:8 | §27.B.6 (pp.634–636) |
| `participle.adverbial_purpose_result` | 目的・結果 | 未分類 | 2 | 2 | ACT 8:27 | §27.B.7 (pp.636–640) |
| `participle.genitive_absolute` | 属格絶対分詞 | Structural | 5 | 5 | MAT 9:18 | §27.C.1 (pp.654–655) |
| `participle.periphrastic` | 迂言的分詞 | 未分類 | 3 | 3 | MAT 16:19 | §27.C.2 (pp.647–648) |
| `participle.imperatival` | 命令的分詞 | 未分類 | 4 | 4 | ROM 12:9 | §27.C.3 (pp.650–652) |
| `participle.complementary` | 補語用法（παύομαι 型） | Hybrid | 2 | 2 | LUK 5:4 | §27 (p.646) |
| `participle.indirect_discourse` | 間接話法分詞 | 未分類 | 3 | 3 | ACT 7:12 | §27 (pp.645–646) |
| `participle.redundant` | 冗語的分詞 | 未分類 | 2 | 2 | MAT 4:4 | §27 (pp.649–650) |

### article（11件）

監査観点：形態・名詞句構造と指示・総称・談話的解釈を分離

| ID | ラベル | 既存分類 | 条件数 | シグナル数 | 登録例 | Wallace参照 |
|---|---|---|---:|---:|---|---|
| `article.monadic` | 単一体的用法 | 未分類 | 1 | 1 | MAT 5:14 | §2.A.1 (pp.223–225) |
| `article.generic` | 総称的用法 | 未分類 | 1 | 1 | MAT 5:13 | §2.A.2 (pp.227–231) |
| `article.previous_reference` | 前出指示用法 | 未分類 | 1 | 1 | JHN 4:9 | §2.A.3 (pp.217–220) |
| `article.par_excellence` | 卓越的用法 | 未分類 | 1 | 1 | JHN 1:21 | §2.A.4 (pp.222–223) |
| `article.simple_identification` | 単純識別用法 | 未分類 | 1 | 1 | MAT 2:14 | §2 with substantives (pp.216–217) |
| `article.well_known` | 著名用法 | 未分類 | 1 | 1 | JHN 7:38 | §2 (p.225) |
| `article.abstract` | 抽象名詞用法 | 未分類 | 1 | 1 | ROM 13:10 | §2 (pp.226–227) |
| `article.deictic` | 指示的用法 | 未分類 | 1 | 1 | LUK 23:47 | §2 (p.221) |
| `article.kataphoric` | 後方照応用法 | 未分類 | 1 | 1 | JHN 15:20 | §2 (pp.220–221) |
| `article.granville_sharp` | グランビル・シャープ構文 | 未分類 | 1 | 1 | EPH 1:3 | §2 TSKS (pp.270–290) |
| `article.colwell` | コルウェル構文（主語標識） | 未分類 | 1 | 1 | JHN 1:1 | §2 Colwell (pp.256–270) |

### accusative（7件）

監査観点：格形・支配関係と目的語／述語／副詞的解釈を分離

| ID | ラベル | 既存分類 | 条件数 | シグナル数 | 登録例 | Wallace参照 |
|---|---|---|---:|---:|---|---|
| `accusative.direct_object` | 直接目的語 | 未分類 | 2 | 2 | MAT 22:37 | §5.A.1 (pp.179–181) |
| `accusative.subject_of_infinitive` | 不定詞の主語 | 未分類 | 2 | 2 | MAT 16:13 | §5.A.4 (pp.192–197) |
| `accusative.double_person_thing` | 二重対格（人・物） | 未分類 | 2 | 2 | JHN 14:26 | §5.A.2 (pp.181–182) |
| `accusative.object_complement` | 二重対格（目的語・補語） | 未分類 | 2 | 2 | PHP 3:7 | §5.A.3 (pp.182–189) |
| `accusative.cognate` | 同族対格 | 未分類 | 1 | 1 | MAT 2:10 | §5.A.5 (pp.189–190) |
| `accusative.predicate` | 述語対格 | 未分類 | 2 | 2 | ACT 28:6 | §5.A.6 (pp.190–192) |
| `accusative.adverbial` | 副詞的対格（様態・観点） | 未分類 | 1 | 1 | MAT 26:45 | §5.B (pp.199–203) |

### infinitive（11件）

監査観点：不定詞構文の構造と目的・結果・原因等の意味を分離

| ID | ラベル | 既存分類 | 条件数 | シグナル数 | 登録例 | Wallace参照 |
|---|---|---|---:|---:|---|---|
| `infinitive.purpose` | 目的不定詞 | 未分類 | 2 | 2 | MAT 13:3 | §34.A.1 (pp.590–592) |
| `infinitive.result` | 結果不定詞 | 未分類 | 1 | 1 | MAT 8:24 | §34.A.2 (pp.592–594) |
| `infinitive.time` | 時の不定詞 | 未分類 | 1 | 1 | MAT 26:32 | §34.A.3 (pp.594–596) |
| `infinitive.cause` | 原因不定詞 | 未分類 | 1 | 1 | MAT 13:5 | §34.A.4 (pp.596–597) |
| `infinitive.means` | 手段不定詞 | 未分類 | 1 | 1 | MAT 13:4 | §34.A.5 (p.597) |
| `infinitive.complementary` | 補語不定詞 | 未分類 | 1 | 1 | MAT 6:24 | §34.A.6 (pp.598–599) |
| `infinitive.subject` | 主語不定詞 | 未分類 | 1 | 1 | MAT 16:21 | §34.B.1 (pp.600–601) |
| `infinitive.indirect_discourse` | 間接話法不定詞 | 未分類 | 1 | 1 | MAT 16:13 | §34.B.3 (pp.603–605) |
| `infinitive.epexegetical` | 付加説明不定詞 | 未分類 | 1 | 1 | MAT 3:11 | §34.B.4 (pp.606–607) |
| `infinitive.articular` | 冠詞付き不定詞（名詞化） | 未分類 | 2 | 2 | PHP 1:21 | §34.B (pp.600–607, 構造標識) |
| `infinitive.imperatival` | 命令的不定詞 | 未分類 | 2 | 2 | ROM 12:15 | §34.C (p.608) |

### verb（48件）

監査観点：形態（時制・相・法・態）と文脈的用法・談話効果を分離

| ID | ラベル | 既存分類 | 条件数 | シグナル数 | 登録例 | Wallace参照 |
|---|---|---|---:|---:|---|---|
| `verb.declarative` | 叙述的直説法 | 未分類 | 2 | 2 | JHN 1:1 | Indicative (p.449) |
| `verb.historical_present` | 歴史的現在 | 未分類 | 3 | 3 | MRK 1:40 | Present tense (pp.526–532) |
| `verb.gnomic_present` | 格言的現在 | 未分類 | 2 | 2 | 2CO 9:7 | Present tense (pp.523–525) |
| `verb.futuristic_present` | 未来的現在 | 未分類 | 2 | 2 | JHN 4:25 | Present tense (pp.535–537) |
| `verb.epistolary_aorist` | 書簡的アオリスト | 未分類 | 3 | 3 | PHP 2:28 | Aorist tense (pp.562–563) |
| `verb.dramatic_aorist` | 劇的アオリスト | 未分類 | 2 | 2 | MAT 3:17 | Aorist tense (pp.564–565) |
| `verb.imperative_customary` | 継続命令（現在命令法） | 未分類 | 1 | 1 | LUK 11:3 | Imperative (pp.485–486, 521) |
| `verb.imperative_constative` | 総括命令（アオリスト命令法） | 未分類 | 1 | 1 | ACT 2:38 | Imperative (pp.485–486, 720–721) |
| `verb.imperative_ingressive` | 起動命令 | 未分類 | 1 | 1 | JHN 2:7 | Imperative (pp.485–486, 720) |
| `verb.imperative_urgency` | 切迫命令 | 未分類 | 2 | 2 | MAT 6:11 | Imperative in prayers/requests (pp.487–488) |
| `verb.imperative_permissive` | 許容命令（3人称） | 未分類 | 1 | 1 | MAT 27:42 | Imperative 3rd person (pp.485–486) |
| `verb.hortatory` | 勧告的接続法 | 未分類 | 2 | 2 | HEB 12:1 | Subjunctive (pp.464–465) |
| `verb.prohibitory` | 禁止の接続法 | 未分類 | 2 | 2 | MAT 6:13 | Subjunctive (p.469) |
| `verb.deliberative` | 審議的接続法 | 未分類 | 2 | 2 | MAT 6:31 | Subjunctive (pp.465–467) |
| `verb.emphatic_negation` | 強調否定（οὐ μή） | 未分類 | 2 | 2 | JHN 10:28 | Subjunctive (p.468) |
| `verb.purpose_clause` | 目的節の接続法（ἵνα） | 未分類 | 1 | 1 | JHN 17:3 | Subjunctive in purpose clauses (pp.471–473) |
| `verb.indefinite_relative` | 不定関係節の接続法 | 未分類 | 1 | 1 | MRK 3:29 | Subjunctive (pp.478–479) |
| `verb.conditional_subjunctive` | 条件節の接続法（ἐάν） | 未分類 | 1 | 1 | 1JN 1:9 | Subjunctive (pp.469–471) |
| `verb.potential_optative` | 可能性の希求法 | 未分類 | 1 | 1 | ACT 8:31 | Optative (pp.483–484) |
| `verb.wish_optative` | 祈願の希求法 | 未分類 | 2 | 2 | ROM 6:2 | Optative (pp.481–483) |
| `verb.optative_indirect_discourse` | 間接話法の希求法 | 未分類 | 2 | 2 | LUK 8:9 | Optative (p.483) |
| `verb.present_progressive` | 進行的現在 | 未分類 | 2 | 2 | MAT 25:8 | Present (pp.518–519) |
| `verb.present_customary` | 習慣的現在 | 未分類 | 2 | 2 | LUK 18:12 | Present (pp.521–522) |
| `verb.present_iterative` | 反復的現在 | 未分類 | 2 | 2 | MAT 17:15 | Present (pp.520–521) |
| `verb.imperfect_progressive` | 進行的未完了 | 未分類 | 2 | 2 | MRK 9:31 | Imperfect (pp.543–544) |
| `verb.imperfect_ingressive` | 起動的未完了 | 未分類 | 2 | 2 | MAT 5:2 | Imperfect (pp.544–545) |
| `verb.imperfect_iterative` | 反復的未完了 | 未分類 | 2 | 2 | JHN 19:3 | Imperfect (pp.546–547) |
| `verb.imperfect_customary` | 習慣的未完了 | 未分類 | 2 | 2 | MRK 15:6 | Imperfect (p.548) |
| `verb.imperfect_conative` | 企図的未完了 | 未分類 | 2 | 2 | MAT 3:14 | Imperfect (pp.550–551) |
| `verb.aorist_constative` | 総括的アオリスト | 未分類 | 2 | 2 | REV 20:4 | Aorist (p.557) |
| `verb.aorist_ingressive` | 起動的アオリスト | 未分類 | 2 | 2 | 2CO 8:9 | Aorist (pp.558–559) |
| `verb.aorist_culminative` | 結果到達アオリスト | 未分類 | 2 | 2 | PHP 4:11 | Aorist (pp.559–561) |
| `verb.aorist_gnomic` | 格言的アオリスト | 未分類 | 2 | 2 | 1PE 1:24 | Aorist (p.562) |
| `verb.perfect_intensive` | 強意的完了（現在状態） | 未分類 | 2 | 2 | MAT 4:4 | Perfect (pp.574–576) |
| `verb.perfect_extensive` | 広延的完了（完結行為） | 未分類 | 2 | 2 | JHN 1:34 | Perfect (p.577) |
| `verb.perfect_dramatic` | 劇的完了 | 未分類 | 2 | 2 | JHN 1:15 | Perfect (p.578) |
| `verb.pluperfect_intensive` | 強意的過去完了 | 未分類 | 2 | 2 | MRK 1:34 | Pluperfect (pp.584–585) |
| `verb.pluperfect_extensive` | 広延的過去完了 | 未分類 | 1 | 1 | JHN 4:8 | Pluperfect (pp.585–586) |
| `verb.future_predictive` | 予告的未来 | 未分類 | 2 | 2 | ACT 1:11 | Future (p.568) |
| `verb.future_imperatival` | 命令的未来 | 未分類 | 3 | 3 | MAT 22:39 | Future (p.569) |
| `verb.future_deliberative` | 審議的未来 | 未分類 | 3 | 3 | ROM 6:1 | Future (p.570) |
| `verb.future_gnomic` | 格言的未来 | 未分類 | 2 | 2 | ROM 5:7 | Future (p.571) |
| `verb.voice_active` | 単純能動態 | 未分類 | 1 | 1 | JHN 3:16 | Voice (pp.410–412) |
| `verb.voice_middle_direct` | 直接中動態 | 未分類 | 2 | 2 | MAT 27:5 | Voice (pp.416–417) |
| `verb.voice_middle_reflexive` | 再帰的中動態 | 未分類 | 2 | 2 | MAT 16:7 | Voice (pp.416–418) |
| `verb.voice_middle_reciprocal` | 相互的中動態 | 未分類 | 3 | 3 | JHN 9:22 | Voice (p.427) |
| `verb.voice_passive` | 受動態 | 未分類 | 2 | 2 | MAT 4:1 | Voice (pp.431–438) |
| `verb.voice_permissive_passive` | 許容受動態 | 未分類 | 2 | 2 | 2CO 5:20 | Voice (pp.440–441) |

### adjective（11件）

監査観点：形態・位置と限定／述語／実体／意味的用法を分離

| ID | ラベル | 既存分類 | 条件数 | シグナル数 | 登録例 | Wallace参照 |
|---|---|---|---:|---:|---|---|
| `adjective.attributive` | 限定用法 | 未分類 | 1 | 1 | JHN 10:11 | pp.306–309（限定位置） |
| `adjective.predicate` | 述語用法 | 未分類 | 2 | 2 | ROM 7:12 | pp.307–309（述語位置） |
| `adjective.substantival` | 実体用法（名詞化） | 未分類 | 2 | 2 | LUK 6:20 | pp.294–295 |
| `adjective.attributive_position` | 限定位置（構造標識） | 未分類 | 1 | 1 | JHN 10:11 | pp.306–307 |
| `adjective.predicate_position` | 述語位置（構造標識） | 未分類 | 1 | 1 | ROM 7:12 | pp.307–308 |
| `adjective.comparative` | 比較級 | 未分類 | 1 | 1 | JHN 13:16 | pp.297–301 |
| `adjective.superlative` | 最上級 | 未分類 | 1 | 1 | 2PE 1:4 | pp.301–305 |
| `adjective.proper_adjective` | 記述的用法（基本） | 未分類 | 1 | 1 | MAT 7:17 | pp.291–293 |
| `adjective.restrictive` | 限定的用法（保守的） | 未分類 | 1 | 1 | JHN 10:11 | pp.306–307（限定機能） |
| `adjective.epithet` | エピセット（敬称・修辞） | 未分類 | 1 | 1 | LUK 1:3 | pp.293（修辞的用法） |
| `adjective.genitive_complement` | 属格補語をとる形容詞 | 未分類 | 2 | 2 | LUK 23:15 | pp.134–135（形容詞 + 属格） |

### pronoun（12件）

監査観点：形態・照応先の構造と強調・指示等の解釈を分離

| ID | ラベル | 既存分類 | 条件数 | シグナル数 | 登録例 | Wallace参照 |
|---|---|---|---:|---:|---|---|
| `pronoun.personal` | 人称代名詞 | 未分類 | 3 | 3 | JHN 8:12 | pp.316–325 |
| `pronoun.intensive` | 強意用法（αὐτός） | 未分類 | 2 | 2 | 1TH 4:16 | pp.348–349 |
| `pronoun.identical` | 同一用法（ὁ αὐτός） | 未分類 | 2 | 2 | 1CO 12:5 | pp.349–350 |
| `pronoun.reflexive` | 再帰代名詞 | 未分類 | 1 | 1 | PHP 2:8 | pp.350–351 |
| `pronoun.reciprocal` | 相互代名詞 | 未分類 | 1 | 1 | JHN 13:34 | pp.351–352 |
| `pronoun.demonstrative` | 指示代名詞 | 未分類 | 2 | 2 | JHN 1:2 | pp.325–335 |
| `pronoun.relative` | 関係代名詞 | 未分類 | 2 | 2 | MRK 3:29 | pp.335–345 |
| `pronoun.interrogative` | 疑問代名詞 | 未分類 | 1 | 1 | MAT 6:31 | pp.345–346 |
| `pronoun.indefinite` | 不定代名詞 | 未分類 | 2 | 2 | GAL 6:1 | pp.347 |
| `pronoun.distributive` | 配分代名詞 | 未分類 | 1 | 1 | 1CO 3:8 | pp.347–348 |
| `pronoun.reciprocal_emphasis` | 相互強調（前置詞句） | 未分類 | 2 | 2 | 1TH 3:12 | pp.351–352（相互の強調文脈） |
| `pronoun.possessive_pronoun` | 所有代名詞 | 未分類 | 2 | 2 | JHN 8:16 | pp.348（所有形容詞） |

### nominative（10件）

監査観点：格形・主語／述語関係と懸垂・感嘆等の談話的用法を分離

| ID | ラベル | 既存分類 | 条件数 | シグナル数 | 登録例 | Wallace参照 |
|---|---|---|---:|---:|---|---|
| `nominative.subject` | 主語 | 未分類 | 2 | 2 | MAT 1:2 | pp.38–40 |
| `nominative.predicate_nominative` | 述語主格 | 未分類 | 2 | 2 | JHN 1:1 | pp.40–48 |
| `nominative.apposition` | 同格主格 | 未分類 | 2 | 2 | ROM 1:1 | pp.48–49 |
| `nominative.nominative_absolute` | 独立主格 | 未分類 | 3 | 3 | REV 1:4 | pp.49–51 |
| `nominative.pendens` | 懸垂主格 | 未分類 | 2 | 2 | ACT 7:40 | pp.51–53 |
| `nominative.vocative_nominative` | 呼格代用の主格 | 未分類 | 4 | 4 | MRK 9:25 | pp.56–59 |
| `nominative.indeclinable` | 不変化語の主格 | 未分類 | 1 | 1 | MAT 1:2 | pp.61–62（外来固有名詞） |
| `nominative.subject_with_infinitive` | 不定詞文の主格 | 未分類 | 2 | 2 | PHP 1:21 | pp.36–40（周辺用法） |
| `nominative.exclamation` | 感嘆主格 | 未分類 | 2 | 2 | ROM 7:24 | pp.59–60 |
| `nominative.title_nominative` | 表題の主格 | 未分類 | 2 | 2 | MAT 1:1 | p.61 |

### vocative（5件）

監査観点：呼格形・呼びかけ構造と修辞的機能を分離

| ID | ラベル | 既存分類 | 条件数 | シグナル数 | 登録例 | Wallace参照 |
|---|---|---|---:|---:|---|---|
| `vocative.direct_address` | 直接呼びかけ | 未分類 | 1 | 1 | MAT 8:2 | pp.67–68 |
| `vocative.with_o` | ὦ 付き呼格 | 未分類 | 1 | 1 | MAT 15:28 | pp.68–69 |
| `vocative.nominative_for_vocative` | 主格転用の呼格 | 未分類 | 2 | 2 | JHN 20:28 | pp.56–59, 69–70 |
| `vocative.exclamatory` | 感嘆的呼格 | 未分類 | 3 | 3 | ROM 11:33 | pp.68–69（感嘆用法） |
| `vocative.chain` | 呼格連鎖 | 未分類 | 2 | 2 | MAT 27:46 | pp.67–68（反復呼格） |

### clause（12件）

監査観点：接続詞・法・節境界の構造と節の意味関係を分離

| ID | ラベル | 既存分類 | 条件数 | シグナル数 | 登録例 | Wallace参照 |
|---|---|---|---:|---:|---|---|
| `clause.conditional_first_class` | 第1類条件文（事実仮定） | 未分類 | 3 | 3 | MAT 12:28 | pp.690–694 |
| `clause.conditional_second_class` | 第2類条件文（反事実） | 未分類 | 3 | 3 | JHN 11:21 | pp.694–696 |
| `clause.conditional_third_class` | 第3類条件文（未来仮定） | 未分類 | 2 | 2 | 1JN 1:9 | pp.696–699 |
| `clause.conditional_fourth_class` | 第4類条件文（希求） | 未分類 | 2 | 2 | 1PE 3:14 | pp.699–701 |
| `clause.substantival_hoti` | 内容節（ὅτι・名詞的） | 未分類 | 2 | 2 | MAT 5:17 | pp.659–660（名詞節） |
| `clause.causal_hoti` | 理由節（ὅτι・副詞的） | 未分類 | 2 | 2 | MAT 5:3 | pp.662–663（副詞節） |
| `clause.purpose_hina` | 目的節（ἵνα） | 未分類 | 2 | 2 | JHN 3:16 | pp.661–662（副詞節） |
| `clause.result_hoste` | 結果節（ὥστε） | 未分類 | 2 | 2 | MAT 8:24 | pp.662–663（副詞節） |
| `clause.temporal_hotan` | 時間節（ὅταν） | 未分類 | 2 | 2 | MAT 6:2 | pp.660–661（副詞節） |
| `clause.temporal_hote` | 時間節（ὅτε） | 未分類 | 2 | 2 | MAT 7:28 | pp.660–661（副詞節） |
| `clause.comparative_kathos` | 比較節（καθώς） | 未分類 | 2 | 2 | JHN 13:34 | pp.662–663（副詞節） |
| `clause.adjectival_relative` | 形容詞節（関係節） | 未分類 | 3 | 3 | MAT 2:9 | pp.659–660（形容詞節） |

### preposition（7件）

監査観点：前置詞・格支配の構造と前置詞句の意味機能を分離

| ID | ラベル | 既存分類 | 条件数 | シグナル数 | 登録例 | Wallace参照 |
|---|---|---|---:|---:|---|---|
| `preposition.proper_with_genitive` | 固有前置詞＋属格 | 未分類 | 1 | 1 | MRK 1:10 | pp.360–363 |
| `preposition.proper_with_dative` | 固有前置詞＋与格 | 未分類 | 1 | 1 | MAT 3:11 | pp.360–363 |
| `preposition.proper_with_accusative` | 固有前置詞＋対格 | 未分類 | 1 | 1 | MAT 4:12 | pp.360–363 |
| `preposition.improper` | 非固有前置詞（independent） | 未分類 | 2 | 2 | LUK 1:15 | p.357 |
| `preposition.adverbial_pp` | 副詞的前置詞句 | 未分類 | 1 | 1 | MRK 1:10 | pp.356–357 |
| `preposition.attributive_pp` | 限定的（形容詞的）前置詞句 | 未分類 | 1 | 1 | MAT 6:9 | pp.356–357 |
| `preposition.substantival_pp` | 独立用法（名詞的）前置詞句 | 未分類 | 1 | 1 | GAL 3:7 | pp.356–357 |

### conjunction（12件）

監査観点：接続形式・節関係の構造と説明／推論／対比等の談話機能を分離

| ID | ラベル | 既存分類 | 条件数 | シグナル数 | 登録例 | Wallace参照 |
|---|---|---|---:|---:|---|---|
| `conjunction.coordinating_additive` | 等位接続（連結） | 未分類 | 1 | 1 | JHN 1:4 | p.671 |
| `conjunction.coordinating_adversative` | 等位接続（逆接） | 未分類 | 1 | 1 | 1CO 15:10 | p.671 |
| `conjunction.coordinating_transition` | 等位接続（転換） | 未分類 | 2 | 2 | ROM 1:13 | p.674 |
| `conjunction.coordinating_inferential` | 等位接続（帰結） | 未分類 | 1 | 1 | ROM 12:1 | p.673 |
| `conjunction.coordinating_explanatory` | 等位接続（説明） | 未分類 | 1 | 1 | ROM 1:16 | p.673 |
| `conjunction.correlative_men_de` | 相関構文 μέν…δέ | 未分類 | 2 | 2 | ROM 6:11 | p.672 |
| `conjunction.subordinating_purpose` | 従属接続（目的） | 未分類 | 2 | 2 | MAT 5:16 | p.676 |
| `conjunction.subordinating_content` | 従属接続（内容） | 未分類 | 3 | 3 | MAT 5:17 | p.678 |
| `conjunction.subordinating_temporal` | 従属接続（時間） | 未分類 | 2 | 2 | MAT 6:2 | p.677 |
| `conjunction.subordinating_conditional` | 従属接続（条件） | 未分類 | 2 | 2 | MAT 12:28 | p.675 |
| `conjunction.subordinating_result` | 従属接続（結果） | 未分類 | 2 | 2 | MAT 8:24 | p.677 |
| `conjunction.subordinating_comparative` | 従属接続（比較） | 未分類 | 3 | 3 | JHN 13:34 | p.675 |

### particle（21件）

監査観点：小辞の形式・共起条件と語用論的・談話的機能を分離

| ID | ラベル | 既存分類 | 条件数 | シグナル数 | 登録例 | Wallace参照 |
|---|---|---|---:|---:|---|---|
| `particle.negative_ou` | 否定小辞 οὐ（直説法） | 未分類 | 1 | 1 | JHN 1:5 | p.468 |
| `particle.negative_me` | 否定小辞 μή（非直説法） | 未分類 | 1 | 1 | MAT 6:13 | p.468 |
| `particle.double_negative` | 二重否定 οὐ μή | 未分類 | 1 | 1 | JHN 10:28 | pp.468–469 |
| `particle.emphatic_negative` | 強調否定（οὐ μή＋接続法/未来） | 未分類 | 2 | 2 | JHN 10:28 | pp.468–469 |
| `particle.particle_an` | 非確定小辞 ἄν | 未分類 | 1 | 1 | JHN 11:21 | p.469 |
| `particle.particle_ean` | 条件小辞 ἐάν | 未分類 | 1 | 1 | 1JN 1:9 | p.469 |
| `particle.interrogative_particle` | 疑問小辞（ἆρα/ἦ/μήτι） | 未分類 | 2 | 2 | MAT 12:23 | pp.467–468 |
| `particle.deliberative_particle` | 熟慮疑問の οὖν | 未分類 | 1 | 1 | ROM 6:1 | pp.466–467 |
| `particle.rhetorical_particle` | 修辞的否定小辞（μὴ γένοιτο 型） | 未分類 | 2 | 2 | ROM 6:2 | pp.481–482 |
| `particle.emphatic_ge` | 強調小辞 γε | 未分類 | 2 | 2 | GAL 3:4 | p.673 |
| `particle.restrictive_monon` | 限定副詞 μόνον | 未分類 | 2 | 2 | MAT 8:8 | p.200 |
| `particle.continuative_de` | 継続の δέ | 未分類 | 2 | 2 | ROM 1:13 | p.674 |
| `particle.inferential_oun` | 帰結の οὖν | 未分類 | 2 | 2 | ROM 12:1 | p.673 |
| `particle.explanatory_gar` | 説明の γάρ | 未分類 | 2 | 2 | ROM 1:16 | p.673 |
| `particle.correlative_men` | 相関の μέν（前項） | 未分類 | 1 | 1 | MAT 9:37 | p.672 |
| `particle.correlative_de` | 相関の δέ（後項） | 未分類 | 1 | 1 | MAT 9:37 | p.672 |
| `particle.connective_te` | 連結の τε | 未分類 | 1 | 1 | MAT 22:10 | p.671 |
| `particle.assertive_de` | 断定の δή | 未分類 | 1 | 1 | MAT 13:23 | p.673 |
| `particle.attention_de` | 喚起の δή（意志法と共起） | 未分類 | 1 | 1 | ACT 13:2 | p.673 |
| `particle.emphasis_per` | 強意小辞 περ | 未分類 | 1 | 1 | — | p.673 |
| `particle.emphasis_toi` | 強意小辞 τοι | 未分類 | 1 | 1 | — | p.673 |

### nominal_syntax（12件）

監査観点：句境界・冠詞・ヘッド・修飾関係を中心に構造判定を検証

| ID | ラベル | 既存分類 | 条件数 | シグナル数 | 登録例 | Wallace参照 |
|---|---|---|---:|---:|---|---|
| `nominal_syntax.simple_np` | 単純名詞句 | 未分類 | 2 | 2 | JHN 1:6 | pp.243–245 |
| `nominal_syntax.articular_np` | 有冠詞名詞句 | 未分類 | 1 | 1 | JHN 1:14 | pp.206–231 |
| `nominal_syntax.anarthrous_np` | 無冠詞名詞句 | 未分類 | 1 | 1 | JHN 1:6 | pp.243–254 |
| `nominal_syntax.modified_np` | 修飾名詞句 | 未分類 | 1 | 1 | MAT 12:35 | pp.306–309 |
| `nominal_syntax.multiple_modifier_np` | 複数修飾名詞句 | 未分類 | 1 | 1 | MAT 6:11 | pp.306–314 |
| `nominal_syntax.appositional_np` | 同格名詞句 | 未分類 | 1 | 1 | MAT 1:6 | p.48 |
| `nominal_syntax.substantival_phrase` | 名詞化句（冠詞＋形容詞/分詞/前置詞句） | 未分類 | 1 | 1 | MAT 5:3 | pp.231–238 |
| `nominal_syntax.head_initial_np` | 主名詞先頭型 | 未分類 | 1 | 1 | LUK 8:11 | pp.306–307 |
| `nominal_syntax.head_final_np` | 主名詞末尾型 | 未分類 | 1 | 1 | MAT 12:35 | pp.306–307 |
| `nominal_syntax.nested_np` | 入れ子名詞句 | 未分類 | 1 | 1 | MAT 8:20 | pp.239–240 |
| `nominal_syntax.complex_np` | 多層名詞句 | 未分類 | 1 | 1 | 2CO 4:4 | p.87 |
| `nominal_syntax.vocative_np` | 呼格名詞句 | 未分類 | 1 | 1 | MAT 6:9 | pp.65–71 |

### discourse（10件）

監査観点：談話注釈が必要な候補。語順や標識の検出を談話機能の確定と混同しない

| ID | ラベル | 既存分類 | 条件数 | シグナル数 | 登録例 | Wallace参照 |
|---|---|---|---:|---:|---|---|
| `discourse.topic_fronting` | 主題前置 | 未分類 | 1 | 1 | 1JN 4:8 | pp.51–53（語順と主題化） |
| `discourse.focus_fronting` | 焦点前置 | 未分類 | 1 | 1 | ROM 10:2 | passim（語順による強調） |
| `discourse.emphasis_word_order` | 語順による強調 | 未分類 | 1 | 1 | EPH 2:8 | passim（語順による強調） |
| `discourse.left_dislocation` | 左方転位（懸垂主格） | 未分類 | 1 | 1 | ACT 7:40 | pp.51–53 |
| `discourse.right_dislocation` | 右方転位 | 未分類 | 1 | 1 | JHN 9:13 | pp.51–53（転位構文） |
| `discourse.parenthetical` | 挿入句（λέγω/φημί） | 未分類 | 1 | 1 | ROM 3:5 | p.53 |
| `discourse.explanatory_parenthesis` | 説明的挿入（ὅ ἐστιν / τοῦτ᾽ ἔστιν） | 未分類 | 1 | 1 | MRK 3:17 | p.336 |
| `discourse.contrast_men_de` | 対比構造（μέν…δέ） | 未分類 | 1 | 1 | MAT 9:37 | p.672 |
| `discourse.backgrounding` | 背景化（従属・分詞） | 未分類 | 1 | 1 | MRK 1:10 | pp.622–625 |
| `discourse.foregrounding` | 前景化（主節・歴史的現在） | 未分類 | 2 | 2 | MRK 1:40 | pp.526–532 |

## 個別監査で必ず記録する項目

各ラベルの精査時に次を追記する。未確認の欄を空想で埋めない。

- **判定対象:** 形態／句・節構造／統語機能／意味関係／語用論・談話機能
- **必要な入力:** 現行 `AnalysisContext` にあるもの／不足しているもの
- **必要十分性:** 現行条件は必要条件か、十分条件か、単なる手掛かりか
- **競合ラベル:** どのラベルと混同しやすく、何で区別するか
- **評価用例:** 肯定例・否定例・曖昧例（聖書箇所と人手判定根拠）
- **Wallace 根拠:** 節・ページ・診断法。参照未確認なら未確認と記す
- **リリース扱い:** A（検証済み自動判定）／B（候補提示）／C（自動判定保留）
- **検証状態:** 未着手／原典確認済み／用例セット作成済み／回帰テスト済み

## 監査の順序

1. PR #230 の三値評価と回帰ゲートを維持する。
2. 属格・与格・分詞を先行し、構造条件と意味判定条件を切り分ける。
3. 動詞（48件）を形態条件と文脈依存の用法ラベルに分解する。
4. 節・接続詞・小辞・談話ラベルを、形式検出と談話解釈に分ける。
5. 名詞句・代名詞・冠詞・格の構造ラベルを評価用例で検証する。
6. 最後に全242件を再集計し、A/B/Cの根拠とテスト結果からリリース可否を判定する。

## 現時点での完了／未完了

- [x] 242ラベルを列挙し、既存分類メタデータの有無を集計
- [x] 17カテゴリごとの一次監査観点を設定
- [ ] 各ラベルの判定規則を個別に精査
- [ ] Wallace の該当箇所と各ラベルを照合
- [ ] 人手確認済みの肯定・否定・曖昧例を作成
- [ ] A/B/Cを根拠付きで決定
- [ ] リリース対象の適合率・再現率を独立評価セットで測定
- [ ] 新約聖書全体の回帰検証とモバイルUI確認

## 追加監査 Phase 2：動詞ラベル48件

- 詳細記録: [syntax-verb-48-audit-phase1.md](./syntax-verb-48-audit-phase1.md)
- 対象: `verb` カテゴリの48ラベル
- 結果: 全48件で `dictionary.classification` が未設定。よって現段階でA（検証済み自動判定）に認定したラベルはない。
- 主なレビュー項目: 時制だけで継続／総括／起動を区別する条件、同一条件を共有する習慣的現在と反復的現在、文脈標識を格言的意味に直結させる条件、未来的審議法の条件重複、許容受動態の重複条件、受動態一般と行為者句付き受動態の範囲。
- 判定の強さ: これはレジストリ条件の一次レビューであり、本文例・Wallace原典・実行時スコアを照合した確定的なバグ認定ではない。
- 次: 共有条件の実装、XSC重み、候補スコアへの影響を追跡し、登録例と独立した肯定・否定・競合例で検証する。

### 動詞条件の実装経路追跡（追加）

- 詳細: [syntax-verb-48-audit-phase1.md](./syntax-verb-48-audit-phase1.md) の「追加追跡：実ハンドラーと採点経路」。
- コード確認: 反復標識検出は節スコープだが、これは意味機能の確定ではない。三値判定は後段の `CandidateScorer.prototype._evaluateType_patched` が実際の採点経路を担うため、元メソッドだけを読んだ静的レビューでは不十分。
- 要検証の疑義: `clause_is_narrative()` はコメント上は節の物語性を判定するが、実装は `ctx.tokens` 全体を走査する。実行時の入力範囲を確定し、別節の過去直説法が候補スコアに影響するケースがないか対照テストを作る。
- これはコード上のスコープ疑義であり、実データ上の誤判定を確定したものではない。リリース判断は対照テスト後に行う。

### 実装確認で判明したスコープ不一致

- 詳細記録: [syntax-verb-48-audit-phase1.md](./syntax-verb-48-audit-phase1.md) の「追加検証：`clause_is_narrative()` のスコープ不一致」。
- `ContextBuilder.build()` は `clauseStart/clauseEnd` を設定し、共通の `_clauseTokens(ctx)` はその境界を使う。一方 `clause_is_narrative()` は `ctx.tokens` 全体を走査している。したがって、コード上のスコープ不一致は確認済み。
- 同じ聖句の別節にある過去直説法が対象節の物語性判定に影響する可能性がある。ただし、候補順位への実影響・発生件数はまだ測定していない。
- 修正は三値判定PR #230から分離する。節内／別節の対照テストと全NT差分レポートを作成し、影響を明示した独立PRで扱う。



## 2026-10-22 回帰ゲート結果（PR #230）

- 対象コミット: `b17a6b0a2eecd5809f35700526c1293ea48909ee`
- GitHub Actions: [VR-5 Regression Gate](https://github.com/uo-no/gnt-jp/actions/runs/39780058941) と [Path Structure Check](https://github.com/uo-no/gnt-jp/actions/runs/39780058957) は両方 PASS。
- 回帰レポートの走査範囲: 新約27巻・260章・137,741トークン・7,939節。
- 比較対象: 属格19,509、与格12,121、分詞5,569、合計37,199トークン。
- ベース版と三値評価版の比較: 候補集合の増減0、スコア変更0、順位変更0。比較レポートでは全37,199対象で差分なし。
- 解釈: 未実装の意味チェックを「不一致」と誤認しない三値評価への変更が、上記対象の既存候補・順位を変えていないことを確認した。これは候補の言語学的正確性を保証するものではない。
- 注意: このゲートは `scripts/genitive-regression-test.cjs` を実行していない。追加した命令法の否定テストは、別途実行結果を確認するまで未検証として扱う。
