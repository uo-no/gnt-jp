# 分詞17タイプ 初回独立監査メモ v0.1

- Date: 2026-10-30
- Scope: `syntax-registry.json` の participle カテゴリ全17タイプ
- Source registry blob: `c44d13b6d128e3a6a2e302ad1ba0081d4cdadd00`
- Corpus: `public/bible_data/nt/{BOOK}/{CHAPTER}.json` on `main`
- Review status: first-pass; no production changes

## 1. 方針

代表例の形態・一致・冠詞・語順・主節との関係をコーパスで照合し、分類の独立性と検出条件の妥当性を初回点検した。分詞の形態だけで、時間・理由・条件・譲歩などの意味関係を確定しない。

## 2. 本文データとの照合

| Legacy ID | 代表箇所 | コーパス上の対象 | 初回所見 |
|---|---|---|---|
| participle.attributive | JHN 4:11 | τὸ ζῶν / V-PAP-ASN | 冠詞を伴う名詞修飾の構造を確認 |
| participle.predicate | MAT 3:15 | πρέπον / V-PAP-NSN | εἰμί と述語関係を作る構造を確認 |
| participle.substantival | JHN 3:16 | ὁ πιστεύων / V-PAP-NSM | 冠詞付き分詞が「信じる者」を表す構造を確認 |
| participle.adverbial_temporal | MAT 2:7 | καλέσας / V-AAP-NSM | 主動詞に先行するアオリスト分詞。時間関係は文脈で確認 |
| participle.adverbial_attendant | MAT 2:8 | Πορευθέντες / V-AOP-NPM | アオリスト分詞＋命令形の連続。付帯状況の候補 |
| participle.adverbial_causal | ROM 5:1 | Δικαιωθέντες / V-APP-NPM | 理由の読みは可能だが、οὖν は推論・結論を示す接続語であり、因果関係の直接証拠とは限らない |
| participle.adverbial_manner | LUK 19:6 | χαίρων / V-PAP-NSM | 主動詞 ὑπεδέξατο に伴う様態の候補 |
| participle.adverbial_means | ACT 16:16 | μαντευομένη / V-PNP-NSF | 「占いをして利益をもたらす」という手段の候補。主節との意味関係を再確認 |
| participle.adverbial_conditional | GAL 6:9 | μὴ ἐκλυόμενοι / V-PPP-NPM | 否定を伴う分詞と未来主動詞。条件の読みを文脈で確認 |
| participle.adverbial_concessive | HEB 5:8 | καίπερ ὢν / V-PAP-NSM | 譲歩を明示する καίπερ と分詞の構造を確認 |
| participle.adverbial_purpose_result | ACT 8:27 | προσκυνήσων / V-FAP-NSM | 未来分詞による目的の読みが自然。結果との区別は未解決 |
| participle.genitive_absolute | MAT 9:18 | αὐτοῦ + λαλοῦντος / P-GSM + V-PAP-GSM | 属格の意味上の主語と分詞の一致を確認 |
| participle.periphrastic | MAT 16:19 | ἔσται δεδεμένον / V-FDI-3S + V-RPP-NSN | コプラ＋分詞の迂言的構文候補。時制・相は構文全体で判断 |
| participle.imperatival | ROM 12:9 | ἀποστυγοῦντες / V-PAP-NPM | 勧告の連続の中で命令的に機能する候補。節境界・省略主語を確認 |
| participle.complementary | LUK 5:4 | ἐπαύσατο λαλῶν / V-AMI-3S + V-PAP-NSM | παύομαι が分詞補語を取る構造を確認 |
| participle.indirect_discourse | ACT 7:12 | ὄντα / V-PAP-APN | ἀκούω に続く対格＋分詞の内容表現候補 |
| participle.redundant | MAT 4:4 | ἀποκριθεὶς εἶπεν / V-AOP-NSM + V-2AAI-3S | 発話動詞との慣用的な分詞連結を確認 |

## 3. 初回に判明した概念上の問題

### 3.1 属格絶対の重複

`participle.genitive_absolute` と `genitive.genitive_absolute` は同じ構文を別側面から登録している。これは独立ナレッジでは単一の構文IDに統合し、属格の名詞句・分詞それぞれの観察情報を別フィールドとして保持する案が適切。

### 3.2 副詞的分詞の意味分類が混線

`adverbial_temporal`、`causal`、`attendant`、`manner`、`means`、`conditional`、`concessive`、`purpose_result` は、すべて副詞的分詞という広い構文領域に属する。これらの差は形態だけで決まらず、主節との意味関係・談話の流れ・語彙的意味から判断する必要がある。

提案：まず「副詞的分詞」という上位構文を認定し、その下に意味関係の候補を複数付与する。特に時間と付帯状況、手段と様態、目的と結果は境界例を比較する。

### 3.3 目的と結果を一つのタイプにまとめている

`participle.adverbial_purpose_result` は目的と結果を同じ候補に含めているが、両者は主節との意味関係が異なる。未来分詞は目的の手掛かりにはなっても、結果の証拠にはならない。

提案：目的と結果を別の意味関係候補に分けるか、少なくとも一つの構文IDの下に別の解釈候補として保持する。

### 3.4 述語的分詞と迂言的構文の境界

`participle.predicate` と `participle.periphrastic` は、コプラとの共起で重なり得る。単に εἰμί が存在するかだけでなく、分詞が述語補語なのか、時制・相を構成する迂言的述語なのかを文脈と構文全体から判断する必要がある。

## 4. 検出ロジックの初回所見

1. **時間的分詞**：アオリスト・現在・完了という時制／相だけで時間関係を決めない。時間的解釈は主動詞との相対関係・文脈を要する。
2. **因果的分詞**：ROM 5:1 の οὖν は結論・推論を示し、因果関係の直接証拠とは限らない。接続語の存在だけで因果候補を強くしない。
3. **付帯状況**：アオリスト分詞＋アオリスト命令／直説法は手掛かりだが、連続動作・時間的先行・付帯状況の区別には談話情報が必要。
4. **手段・様態**：語彙リストや「どのように／何によって」の置換だけでは区別できない。
5. **条件・譲歩**：μή や καίπερ は有力な標識だが、標識の有無だけで意味関係を確定しない。
6. **目的・結果**：未来分詞は目的の候補を示すが、結果用法まで同じ条件で検出するのは不十分。
7. **属格絶対**：`genitive_subject_differs_from_main_subject()` の主語同定精度と、主節・従属節の境界を別途検証する。
8. **命令的分詞**：有限動詞が同じ節にないことだけでは命令性を証明できない。談話上の勧告・命令機能を確認する。
9. **間接話法分詞**：知覚動詞＋対格＋分詞の構造と、通常の目的語・補語関係を区別する。
10. **冗語的分詞**：語彙リストの一致だけで冗語性を確定しない。慣用的な発話構文か、独立した付帯状況かを比較する。

## 5. 暫定処置案

| Legacy ID | 暫定処置案 | 次の確認 |
|---|---|---|
| participle.attributive | retain_redefined | 名詞句内の修飾関係を構造的に定義 |
| participle.predicate | retain_redefined | predicate complementと迂言構文の境界 |
| participle.substantival | retain_redefined | 名詞的機能と省略名詞・冠詞構造 |
| participle.adverbial_temporal | unresolved | 上位の副詞的構文＋時間関係の候補へ再構成 |
| participle.adverbial_attendant | retain_redefined | 談話関係の候補として再定義 |
| participle.adverbial_causal | unresolved | 因果の文脈根拠・推論標識との区別 |
| participle.adverbial_manner | retain_redefined | 手段との境界 |
| participle.adverbial_means | unresolved | 主節との意味的依存を複数例で確認 |
| participle.adverbial_conditional | retain_redefined | 条件関係の文脈的証拠 |
| participle.adverbial_concessive | retain_redefined | 明示標識と非明示例の両方を検証 |
| participle.adverbial_purpose_result | split | 目的と結果の意味関係を分離 |
| participle.genitive_absolute | merge | genitive.genitive_absoluteと共通構文IDに統合 |
| participle.periphrastic | retain_redefined | コプラ＋分詞の述語構造を精査 |
| participle.imperatival | retain_redefined | 命令機能を談話・節構造から確認 |
| participle.complementary | retain_redefined | 動詞価数・補語選択を基準化 |
| participle.indirect_discourse | retain_redefined | 知覚・認識動詞＋対格分詞の構文を確認 |
| participle.redundant | unresolved | 慣用構文と付帯状況の境界を追加検証 |

## 6. 結論と次の作業

- 17タイプすべての代表箇所をNTコーパスで照合した。
- 属格絶対の重複登録を再確認した。
- 目的・結果、時間・付帯状況、手段・様態など、意味関係を独立候補として整理し直す必要がある。
- 形態・冠詞・語彙リストは候補抽出の手掛かりであり、意味関係を確定する根拠とはしない。
- 今回の暫定処置は公開用分類の確定ではない。

次は、冠詞・代名詞・形容詞など、名詞句内部の機能を扱うカテゴリを監査し、既に確認した格・分詞との重複・境界を横断比較する。

No production code, syntax registry, or StudyPanel behavior was changed.
