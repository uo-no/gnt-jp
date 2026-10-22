# StudyPanel 候補比較・根拠表示 適用監査（初回マトリクス）

- 目的：ユーザー指定の2項目だけを対象に、読書メモへの候補比較統合と「根拠を詳しく見る」の適用条件を整理する。
- 対象：`public/assets/data/syntax-registry.json` の242型、`public/core/icl-engine.js`、`public/core/reading-projection.js`、既存の StudyPanel 監査資料。
- 変更範囲：監査ドキュメントのみ。アプリコード・レジストリ・UIは変更しない。
- データ確認時点：main の取得結果（registry blob `a80206bbed9ea37880dcc19fc55e838862c773e8`、ICL blob `b6c770c70705ce44568088f66d52857a5c5b5d7a`、Projection blob `2c6bdec09e619f3820ffb16c46e6dfc9b9925638`）。
- 注意：本表は登録データから作成した**初回の静的適用マトリクス**であり、実際のトークンで各候補が出現すること、競合候補の意味的な比較が妥当であることを保証しない。最終表示可否は実例監査が必要。

## 1. 結論

1. **候補比較は `alternatives` の有無だけで表示しない。** レジストリの関連候補は、同じ分類群の競合解釈だけでなく、異なる分析レベルや隣接する現象も含み得る。候補名を並べるのではなく、同じ箇所に実際に適用可能な候補だけを比較対象にする。
2. **通常の読書メモには、意味の違いと本文上の要点だけを自然文で統合する。** 第一候補を優先する理由が説明できない場合は「第一候補」と断定せず、複数の読みがあり得ることを示す。
3. **「根拠を詳しく見る」では、実際に発火したシグナルと本文との対応を説明する。** シグナル定義に項目があるだけでは、当該トークンでその根拠が成立したとは言えない。
4. **確信度の数値表示は初期実装から除外する。** ICL の `confidence_internal` はスコアを0–1に換算した内部値であり、校正済みの「解釈が正しい確率」と確認できない。表示するなら、別途校正・評価データ・尺度定義が必要。
5. **候補比較と根拠詳細は独立した判断軸。** 競合候補がなくても根拠詳細は役立つ場合があり、候補が複数あっても根拠の信頼性が不足する場合は比較を表示しない。

## 2. 現行実装に関する確認

- StudyPanel 監査資料は、242型の候補を読書メモ生成にまだ結び付けておらず、既存の確度文言の閾値も registry スコア分布と整合しないと報告している。
- ICL は各候補について `signals_matched` / `signals_missed` と内部スコアを生成する。したがって根拠詳細の候補データは存在するが、UIで使う前にシグナルIDから日本語説明へ安全に対応付け、本文上の証拠が実際に確認できたことを検証する必要がある。
- Reading Support Projection は候補ID・内部confidence値・シグナルID・関連型IDなどを持つ読み取り専用中間層であり、説明文や表示判断は持たない。この責務分離は維持する。
- レジストリの `alternatives` は「この文脈で実際に競合している候補」の証拠ではない。関連候補の参照情報として扱い、候補比較は実際の解析結果にある候補とその根拠から構成する。

## 3. 表示判定ルール

### A. 読書メモ内の候補比較

次の条件をすべて満たす場合のみ比較する。

- 同じ対象（語・句・節）についての候補である。
- 両候補が当該文脈で成立し得る。単なる関連型・同カテゴリ型は不可。
- 意味・文の読み方に実質的な違いがある。
- 第一候補を優先する本文上または文脈上の理由を説明できる。説明できない場合は順位を断定しない。
- 日本語で「Aなら〜、Bなら〜」と読み分けを説明できる。

一つでも満たさない場合は候補比較を表示せず、必要なら読書メモに限定的な留保を短く示す。

### B. 「根拠を詳しく見る」

- 実際の解析結果で発火したシグナルのみを「判定に使われた手がかり」として表示する。
- 各シグナルは、日本語ラベルだけでなく「本文のどこで確認されたか」を説明できる場合に表示する。
- 見落とされたシグナル（`signals_missed`）は、否定根拠として意味が明確で、実際に検証された場合のみ表示する。
- 候補ごとに根拠を分け、候補Aの根拠を候補Bの根拠として流用しない。
- データの欠落、文脈不足、対象範囲の不一致がある場合は詳細を出さない。
- `wallace_ref` は参照情報であり、エンジンの根拠や確信度そのものではない。

### C. 確信度

- 初期表示：数値・パーセント・色付き確度バーは出さない。
- 詳細：まずシグナルの具体性と候補間の根拠差を説明する。
- 将来の数値化条件：人手評価済みの検証コーパス、候補の正解判定基準、校正曲線・誤差評価、型別または全体の校正性能を整備してから再検討する。
- 「スコアが高い」「一致した特徴が多い」と「文法解釈が正しい確率が高い」を同義にしない。

## 4. レジストリ静的集計

| カテゴリ | 型数 | 同カテゴリ候補あり | 異カテゴリ候補のみ | alternativesなし | XSCシグナルあり | 代表例あり |
|---|---:|---:|---:|---:|---:|---:|
| genitive | 22 | 22 | 0 | 0 | 22 | 21 |
| dative | 14 | 13 | 1 | 0 | 14 | 14 |
| participle | 17 | 17 | 0 | 0 | 17 | 17 |
| article | 11 | 7 | 0 | 4 | 11 | 11 |
| accusative | 7 | 7 | 0 | 0 | 7 | 7 |
| infinitive | 11 | 11 | 0 | 0 | 11 | 11 |
| verb | 48 | 48 | 0 | 0 | 48 | 48 |
| adjective | 11 | 11 | 0 | 0 | 11 | 11 |
| pronoun | 12 | 12 | 0 | 0 | 12 | 12 |
| nominative | 10 | 10 | 0 | 0 | 10 | 10 |
| vocative | 5 | 5 | 0 | 0 | 5 | 5 |
| clause | 12 | 11 | 1 | 0 | 12 | 12 |
| preposition | 7 | 7 | 0 | 0 | 7 | 7 |
| conjunction | 12 | 12 | 0 | 0 | 12 | 12 |
| particle | 21 | 21 | 0 | 0 | 21 | 19 |
| nominal_syntax | 12 | 12 | 0 | 0 | 12 | 12 |
| discourse | 10 | 10 | 0 | 0 | 10 | 10 |

- 同カテゴリ候補が登録されている型：236。
- alternatives があるが同カテゴリ候補を持たない型：2。
- alternatives が登録されていない型：4。
- これは候補比較の適用数ではない。**表示候補は文脈上の解析結果により確定する**。

## 5. 242型 初回適用マトリクス

列の意味：
- **関連候補**：レジストリに登録された `alternatives`。実際の競合候補とは限らない。
- **候補比較の初期扱い**：静的に見た関連候補の範囲。実例検証前はUI表示を許可しない。
- **根拠詳細の初期扱い**：シグナル定義の有無。実際の発火・本文との対応確認は別途必要。
- **代表例**：レジストリに例文・参照箇所・グロスがそろっているか。候補の妥当性を保証するものではない。

| 型ID | 日本語ラベル | 優先度 | 関連候補（registry） | 候補比較の初期扱い | 根拠詳細の初期扱い | 代表例 |
|---|---|---:|---|---|---|---|
| `accusative.adverbial` | 副詞的対格（様態・観点） | 2 | `accusative.direct_object` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `accusative.cognate` | 同族対格 | 4 | `accusative.direct_object` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `accusative.direct_object` | 直接目的語 | 1 | `accusative.subject_of_infinitive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `accusative.double_person_thing` | 二重対格（人・物） | 3 | `accusative.direct_object` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `accusative.object_complement` | 二重対格（目的語・補語） | 3 | `accusative.direct_object` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `accusative.predicate` | 述語対格 | 4 | `accusative.subject_of_infinitive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `accusative.subject_of_infinitive` | 不定詞の主語 | 2 | `accusative.direct_object` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `adjective.attributive` | 限定用法 | 1 | `adjective.predicate` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `adjective.attributive_position` | 限定位置（構造標識） | 4 | `adjective.attributive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `adjective.comparative` | 比較級 | 2 | `adjective.superlative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `adjective.epithet` | エピセット（敬称・修辞） | 3 | `adjective.proper_adjective` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `adjective.genitive_complement` | 属格補語をとる形容詞 | 1 | `adjective.proper_adjective` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `adjective.predicate` | 述語用法 | 1 | `adjective.attributive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `adjective.predicate_position` | 述語位置（構造標識） | 4 | `adjective.predicate` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `adjective.proper_adjective` | 記述的用法（基本） | 5 | `adjective.attributive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `adjective.restrictive` | 限定的用法（保守的） | 5 | `adjective.attributive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `adjective.substantival` | 実体用法（名詞化） | 1 | `adjective.attributive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `adjective.superlative` | 最上級 | 2 | `adjective.comparative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `article.abstract` | 抽象名詞用法 | 4 | `article.simple_identification`, `article.generic` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `article.colwell` | コルウェル構文（主語標識） | 1 | `article.simple_identification`, `article.par_excellence` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `article.deictic` | 指示的用法 | 3 | `article.simple_identification` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `article.generic` | 総称的用法 | 2 | — | 候補なし：比較表示しない | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `article.granville_sharp` | グランビル・シャープ構文 | 1 | `article.simple_identification` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `article.kataphoric` | 後方照応用法 | 3 | `article.simple_identification`, `article.previous_reference` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `article.monadic` | 単一体的用法 | 1 | — | 候補なし：比較表示しない | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `article.par_excellence` | 卓越的用法 | 4 | — | 候補なし：比較表示しない | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `article.previous_reference` | 前出指示用法 | 3 | — | 候補なし：比較表示しない | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `article.simple_identification` | 単純識別用法 | 5 | `article.monadic`, `article.previous_reference` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `article.well_known` | 著名用法 | 4 | `article.monadic`, `article.par_excellence` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `clause.adjectival_relative` | 形容詞節（関係節） | 2 | `pronoun.relative` | 異カテゴリ候補のみ（1）：自動比較しない | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `clause.causal_hoti` | 理由節（ὅτι・副詞的） | 3 | `clause.substantival_hoti` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `clause.comparative_kathos` | 比較節（καθώς） | 3 | `clause.result_hoste` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `clause.conditional_first_class` | 第1類条件文（事実仮定） | 2 | `clause.conditional_second_class` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `clause.conditional_fourth_class` | 第4類条件文（希求） | 1 | `clause.conditional_first_class` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `clause.conditional_second_class` | 第2類条件文（反事実） | 1 | `clause.conditional_first_class` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `clause.conditional_third_class` | 第3類条件文（未来仮定） | 1 | `clause.conditional_first_class` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `clause.purpose_hina` | 目的節（ἵνα） | 2 | `clause.result_hoste` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `clause.result_hoste` | 結果節（ὥστε） | 2 | `clause.purpose_hina` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `clause.substantival_hoti` | 内容節（ὅτι・名詞的） | 2 | `clause.causal_hoti` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `clause.temporal_hotan` | 時間節（ὅταν） | 2 | `clause.temporal_hote` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `clause.temporal_hote` | 時間節（ὅτε） | 2 | `clause.temporal_hotan` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `conjunction.coordinating_additive` | 等位接続（連結） | 2 | `conjunction.coordinating_transition` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `conjunction.coordinating_adversative` | 等位接続（逆接） | 2 | `conjunction.coordinating_transition` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `conjunction.coordinating_explanatory` | 等位接続（説明） | 2 | `conjunction.coordinating_inferential` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `conjunction.coordinating_inferential` | 等位接続（帰結） | 2 | `conjunction.coordinating_explanatory` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `conjunction.coordinating_transition` | 等位接続（転換） | 2 | `conjunction.correlative_men_de` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `conjunction.correlative_men_de` | 相関構文 μέν…δέ | 1 | `conjunction.coordinating_transition` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `conjunction.subordinating_comparative` | 従属接続（比較） | 2 | `conjunction.subordinating_content` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `conjunction.subordinating_conditional` | 従属接続（条件） | 2 | `conjunction.subordinating_comparative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `conjunction.subordinating_content` | 従属接続（内容） | 2 | `conjunction.subordinating_comparative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `conjunction.subordinating_purpose` | 従属接続（目的） | 2 | `conjunction.subordinating_content` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `conjunction.subordinating_result` | 従属接続（結果） | 2 | `conjunction.subordinating_purpose` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `conjunction.subordinating_temporal` | 従属接続（時間） | 2 | `conjunction.subordinating_conditional` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `dative.agent` | 行為者与格 | 4 | `dative.indirect_object`, `dative.means` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `dative.association` | 結合与格（付帯与格） | 2 | `dative.indirect_object`, `dative.means` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `dative.direct_object` | 動詞支配与格（直接目的語） | 1 | `dative.indirect_object` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `dative.ethical` | 道義的与格（倫理的与格） | 5 | `dative.indirect_object` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `dative.indirect_object` | 間接目的語与格 | 1 | `dative.interest_advantage`, `dative.reference` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `dative.interest_advantage` | 利益与格 | 2 | `dative.indirect_object`, `dative.interest_disadvantage`, `dative.reference` | 同カテゴリ候補あり（3）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `dative.interest_disadvantage` | 不利益与格 | 3 | `dative.interest_advantage`, `dative.indirect_object` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `dative.manner` | 様態与格 | 2 | `dative.means`, `dative.sphere` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `dative.means` | 手段与格 | 2 | `dative.manner`, `dative.indirect_object` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `dative.measure` | 程度与格 | 5 | `genitive.comparison` | 異カテゴリ候補のみ（1）：自動比較しない | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `dative.possession` | 所有与格 | 2 | `dative.indirect_object`, `dative.interest_advantage` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `dative.reference` | 基準与格（参照与格） | 2 | `dative.indirect_object`, `dative.interest_advantage` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `dative.sphere` | 領域与格（場所・球体与格） | 2 | `dative.reference`, `dative.indirect_object` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `dative.time` | 時間与格 | 3 | `dative.indirect_object` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `discourse.backgrounding` | 背景化（従属・分詞） | 3 | `discourse.foregrounding` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `discourse.contrast_men_de` | 対比構造（μέν…δέ） | 2 | `discourse.backgrounding` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `discourse.emphasis_word_order` | 語順による強調 | 3 | `discourse.focus_fronting` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `discourse.explanatory_parenthesis` | 説明的挿入（ὅ ἐστιν / τοῦτ᾽ ἔστιν） | 1 | `discourse.parenthetical` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `discourse.focus_fronting` | 焦点前置 | 2 | `discourse.emphasis_word_order` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `discourse.foregrounding` | 前景化（主節・歴史的現在） | 3 | `discourse.backgrounding` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `discourse.left_dislocation` | 左方転位（懸垂主格） | 1 | `discourse.topic_fronting` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `discourse.parenthetical` | 挿入句（λέγω/φημί） | 1 | `discourse.explanatory_parenthesis` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `discourse.right_dislocation` | 右方転位 | 3 | `discourse.left_dislocation` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `discourse.topic_fronting` | 主題前置 | 2 | `discourse.focus_fronting` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.absolute` | 属格絶対 | 1 | `genitive.descriptive`, `participle.adverbial_temporal` | 同系候補あり（1）／異層候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.agency` | 行為者属格 | 4 | `genitive.separation` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.attributed` | 被属性属格（逆転） | 5 | `genitive.attributive`, `genitive.descriptive` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.attributive` | 属性属格（ヘブライ語的） | 3 | `genitive.descriptive`, `genitive.possessive` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.comparison` | 比較属格 | 1 | `genitive.separation` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.content` | 内容属格 | 4 | `genitive.partitive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.descriptive` | 描写的属格 | 2 | `genitive.possessive`, `genitive.attributive` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.direct_object` | 動詞支配属格（直接目的語） | 1 | `genitive.possessive`, `genitive.partitive` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.epexegetical` | 説明的同格属格 | 2 | `genitive.possessive`, `genitive.descriptive` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.material` | 材料属格 | 4 | `genitive.descriptive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.means` | 手段属格 | 5 | `genitive.descriptive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | なし |
| `genitive.objective` | 目的語的属格 | 2 | `genitive.subjective`, `genitive.plenary` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.partitive` | 部分属格 | 2 | `genitive.possessive`, `genitive.descriptive` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.place` | 場所属格 | 4 | `genitive.time` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.plenary` | 複合属格 | 5 | `genitive.subjective`, `genitive.objective` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.possessive` | 所有属格 | 1 | `genitive.descriptive`, `genitive.attributive` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.predicate` | 述語属格 | 5 | `genitive.possessive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.relationship` | 関係属格 | 3 | `genitive.possessive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.separation` | 分離属格 | 2 | `genitive.agency`, `genitive.descriptive` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.source` | 起源属格 | 3 | `genitive.separation`, `genitive.descriptive` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.subjective` | 主語的属格 | 2 | `genitive.objective`, `genitive.plenary` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `genitive.time` | 時間の属格 | 2 | `genitive.place` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `infinitive.articular` | 冠詞付き不定詞（名詞化） | 4 | `infinitive.subject` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `infinitive.cause` | 原因不定詞 | 2 | `infinitive.time` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `infinitive.complementary` | 補語不定詞 | 1 | `infinitive.indirect_discourse` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `infinitive.epexegetical` | 付加説明不定詞 | 3 | `infinitive.complementary` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `infinitive.imperatival` | 命令的不定詞 | 5 | `infinitive.complementary` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `infinitive.indirect_discourse` | 間接話法不定詞 | 2 | `infinitive.complementary` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `infinitive.means` | 手段不定詞 | 4 | `infinitive.time` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `infinitive.purpose` | 目的不定詞 | 1 | `infinitive.result` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `infinitive.result` | 結果不定詞 | 1 | `infinitive.purpose` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `infinitive.subject` | 主語不定詞 | 1 | `infinitive.complementary` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `infinitive.time` | 時の不定詞 | 1 | `infinitive.means` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominal_syntax.anarthrous_np` | 無冠詞名詞句 | 3 | `nominal_syntax.articular_np` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominal_syntax.appositional_np` | 同格名詞句 | 2 | `nominal_syntax.modified_np` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominal_syntax.articular_np` | 有冠詞名詞句 | 2 | `nominal_syntax.anarthrous_np` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominal_syntax.complex_np` | 多層名詞句 | 1 | `nominal_syntax.nested_np` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominal_syntax.head_final_np` | 主名詞末尾型 | 3 | `nominal_syntax.head_initial_np` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominal_syntax.head_initial_np` | 主名詞先頭型 | 3 | `nominal_syntax.head_final_np` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominal_syntax.modified_np` | 修飾名詞句 | 2 | `nominal_syntax.multiple_modifier_np` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominal_syntax.multiple_modifier_np` | 複数修飾名詞句 | 1 | `nominal_syntax.modified_np` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominal_syntax.nested_np` | 入れ子名詞句 | 1 | `nominal_syntax.complex_np` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominal_syntax.simple_np` | 単純名詞句 | 3 | `nominal_syntax.anarthrous_np` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominal_syntax.substantival_phrase` | 名詞化句（冠詞＋形容詞/分詞/前置詞句） | 1 | `nominal_syntax.articular_np` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominal_syntax.vocative_np` | 呼格名詞句 | 1 | `nominal_syntax.articular_np` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominative.apposition` | 同格主格 | 2 | `nominative.subject` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominative.exclamation` | 感嘆主格 | 3 | `nominative.vocative_nominative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominative.indeclinable` | 不変化語の主格 | 3 | `nominative.subject` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominative.nominative_absolute` | 独立主格 | 4 | `nominative.title_nominative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominative.pendens` | 懸垂主格 | 1 | `nominative.subject` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominative.predicate_nominative` | 述語主格 | 1 | `nominative.subject` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominative.subject` | 主語 | 2 | `nominative.predicate_nominative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominative.subject_with_infinitive` | 不定詞文の主格 | 4 | `nominative.predicate_nominative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominative.title_nominative` | 表題の主格 | 5 | `nominative.nominative_absolute` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `nominative.vocative_nominative` | 呼格代用の主格 | 2 | `nominative.exclamation` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `participle.adverbial_attendant` | 付帯状況 | 2 | `participle.adverbial_temporal`, `participle.adverbial_manner` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `participle.adverbial_causal` | 理由・原因 | 3 | `participle.adverbial_temporal`, `participle.adverbial_concessive` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `participle.adverbial_concessive` | 譲歩 | 4 | `participle.adverbial_causal` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `participle.adverbial_conditional` | 条件 | 4 | `participle.adverbial_temporal`, `participle.adverbial_causal` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `participle.adverbial_manner` | 様態 | 4 | `participle.adverbial_temporal`, `participle.adverbial_attendant` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `participle.adverbial_means` | 手段 | 4 | `participle.adverbial_temporal`, `participle.adverbial_manner` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `participle.adverbial_purpose_result` | 目的・結果 | 4 | `participle.adverbial_temporal`, `participle.adverbial_causal` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `participle.adverbial_temporal` | 副詞用法—時間（先行・同時・結果状態） | 2 | `participle.adverbial_attendant`, `participle.adverbial_causal` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `participle.attributive` | 形容詞用法（限定的） | 2 | `participle.substantival`, `participle.adverbial_temporal` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `participle.complementary` | 補語用法（παύομαι 型） | 2 | `participle.adverbial_temporal`, `participle.attributive` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `participle.genitive_absolute` | 属格絶対分詞 | 1 | `participle.adverbial_temporal`, `participle.attributive` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `participle.imperatival` | 命令的分詞 | 5 | `participle.adverbial_temporal` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `participle.indirect_discourse` | 間接話法分詞 | 2 | `participle.complementary`, `participle.adverbial_temporal` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `participle.periphrastic` | 迂言的分詞 | 3 | `participle.predicate`, `participle.attributive` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `participle.predicate` | 述語的分詞 | 4 | `participle.periphrastic`, `participle.attributive` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `participle.redundant` | 冗語的分詞 | 2 | `participle.adverbial_attendant`, `participle.adverbial_temporal` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `participle.substantival` | 実体用法（名詞的） | 1 | `participle.attributive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `particle.assertive_de` | 断定の δή | 2 | `particle.attention_de` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `particle.attention_de` | 喚起の δή（意志法と共起） | 1 | `particle.assertive_de` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `particle.connective_te` | 連結の τε | 2 | `particle.emphatic_ge` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `particle.continuative_de` | 継続の δέ | 3 | `particle.correlative_de` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `particle.correlative_de` | 相関の δέ（後項） | 1 | `particle.correlative_men` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `particle.correlative_men` | 相関の μέν（前項） | 1 | `particle.correlative_de` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `particle.deliberative_particle` | 熟慮疑問の οὖν | 1 | `particle.inferential_oun` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `particle.double_negative` | 二重否定 οὐ μή | 1 | `particle.emphatic_negative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `particle.emphasis_per` | 強意小辞 περ | 3 | `particle.emphatic_ge` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | なし |
| `particle.emphasis_toi` | 強意小辞 τοι | 3 | `particle.emphasis_per` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | なし |
| `particle.emphatic_ge` | 強調小辞 γε | 2 | `particle.emphasis_per` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `particle.emphatic_negative` | 強調否定（οὐ μή＋接続法/未来） | 1 | `particle.double_negative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `particle.explanatory_gar` | 説明の γάρ | 3 | `particle.inferential_oun` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `particle.inferential_oun` | 帰結の οὖν | 3 | `particle.deliberative_particle` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `particle.interrogative_particle` | 疑問小辞（ἆρα/ἦ/μήτι） | 2 | `particle.deliberative_particle` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `particle.negative_me` | 否定小辞 μή（非直説法） | 2 | `particle.negative_ou` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `particle.negative_ou` | 否定小辞 οὐ（直説法） | 2 | `particle.negative_me` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `particle.particle_an` | 非確定小辞 ἄν | 2 | `particle.particle_ean` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `particle.particle_ean` | 条件小辞 ἐάν | 2 | `particle.particle_an` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `particle.restrictive_monon` | 限定副詞 μόνον | 2 | `particle.emphatic_ge` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `particle.rhetorical_particle` | 修辞的否定小辞（μὴ γένοιτο 型） | 1 | `particle.negative_me` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `preposition.adverbial_pp` | 副詞的前置詞句 | 3 | `preposition.attributive_pp` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `preposition.attributive_pp` | 限定的（形容詞的）前置詞句 | 1 | `preposition.substantival_pp` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `preposition.improper` | 非固有前置詞（independent） | 2 | `preposition.proper_with_genitive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `preposition.proper_with_accusative` | 固有前置詞＋対格 | 2 | `preposition.proper_with_genitive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `preposition.proper_with_dative` | 固有前置詞＋与格 | 2 | `preposition.proper_with_genitive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `preposition.proper_with_genitive` | 固有前置詞＋属格 | 2 | `preposition.proper_with_accusative`, `preposition.improper` | 同カテゴリ候補あり（2）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `preposition.substantival_pp` | 独立用法（名詞的）前置詞句 | 1 | `preposition.attributive_pp` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `pronoun.demonstrative` | 指示代名詞 | 2 | `pronoun.personal` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `pronoun.distributive` | 配分代名詞 | 2 | `pronoun.indefinite` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `pronoun.identical` | 同一用法（ὁ αὐτός） | 1 | `pronoun.intensive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `pronoun.indefinite` | 不定代名詞 | 2 | `pronoun.interrogative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `pronoun.intensive` | 強意用法（αὐτός） | 1 | `pronoun.identical` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `pronoun.interrogative` | 疑問代名詞 | 2 | `pronoun.indefinite` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `pronoun.personal` | 人称代名詞 | 3 | `pronoun.intensive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `pronoun.possessive_pronoun` | 所有代名詞 | 2 | `pronoun.personal` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `pronoun.reciprocal` | 相互代名詞 | 1 | `pronoun.reciprocal_emphasis` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `pronoun.reciprocal_emphasis` | 相互強調（前置詞句） | 4 | `pronoun.reciprocal` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `pronoun.reflexive` | 再帰代名詞 | 1 | `pronoun.personal` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `pronoun.relative` | 関係代名詞 | 2 | `pronoun.interrogative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.aorist_constative` | 総括的アオリスト | 3 | `verb.aorist_ingressive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.aorist_culminative` | 結果到達アオリスト | 3 | `verb.aorist_constative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.aorist_gnomic` | 格言的アオリスト | 5 | `verb.aorist_constative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.aorist_ingressive` | 起動的アオリスト | 2 | `verb.aorist_constative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.conditional_subjunctive` | 条件節の接続法（ἐάν） | 1 | `verb.indefinite_relative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.declarative` | 叙述的直説法 | 5 | `verb.historical_present` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.deliberative` | 審議的接続法 | 2 | `verb.hortatory` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.dramatic_aorist` | 劇的アオリスト | 5 | `verb.declarative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.emphatic_negation` | 強調否定（οὐ μή） | 1 | `verb.prohibitory` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.epistolary_aorist` | 書簡的アオリスト | 2 | `verb.declarative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.future_deliberative` | 審議的未来 | 1 | `verb.future_predictive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.future_gnomic` | 格言的未来 | 5 | `verb.future_predictive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.future_imperatival` | 命令的未来 | 1 | `verb.future_predictive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.future_predictive` | 予告的未来 | 2 | `verb.future_imperatival` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.futuristic_present` | 未来的現在 | 4 | `verb.historical_present` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.gnomic_present` | 格言的現在 | 4 | `verb.declarative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.historical_present` | 歴史的現在 | 1 | `verb.declarative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.hortatory` | 勧告的接続法 | 1 | `verb.deliberative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.imperative_constative` | 総括命令（アオリスト命令法） | 3 | `verb.imperative_ingressive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.imperative_customary` | 継続命令（現在命令法） | 2 | `verb.imperative_constative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.imperative_ingressive` | 起動命令 | 4 | `verb.imperative_constative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.imperative_permissive` | 許容命令（3人称） | 1 | `verb.imperative_constative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.imperative_urgency` | 切迫命令 | 2 | `verb.imperative_constative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.imperfect_conative` | 企図的未完了 | 2 | `verb.imperfect_progressive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.imperfect_customary` | 習慣的未完了 | 3 | `verb.imperfect_iterative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.imperfect_ingressive` | 起動的未完了 | 2 | `verb.imperfect_progressive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.imperfect_iterative` | 反復的未完了 | 4 | `verb.imperfect_customary` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.imperfect_progressive` | 進行的未完了 | 2 | `verb.imperfect_ingressive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.indefinite_relative` | 不定関係節の接続法 | 2 | `verb.conditional_subjunctive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.optative_indirect_discourse` | 間接話法の希求法 | 2 | `verb.potential_optative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.perfect_dramatic` | 劇的完了 | 4 | `verb.perfect_extensive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.perfect_extensive` | 広延的完了（完結行為） | 2 | `verb.perfect_intensive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.perfect_intensive` | 強意的完了（現在状態） | 1 | `verb.perfect_extensive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.pluperfect_extensive` | 広延的過去完了 | 2 | `verb.pluperfect_intensive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.pluperfect_intensive` | 強意的過去完了 | 1 | `verb.pluperfect_extensive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.potential_optative` | 可能性の希求法 | 1 | `verb.wish_optative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.present_customary` | 習慣的現在 | 3 | `verb.present_iterative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.present_iterative` | 反復的現在 | 4 | `verb.present_customary` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.present_progressive` | 進行的現在 | 3 | `verb.present_customary` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.prohibitory` | 禁止の接続法 | 1 | `verb.emphatic_negation` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.purpose_clause` | 目的節の接続法（ἵνα） | 1 | `verb.conditional_subjunctive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.voice_active` | 単純能動態 | 5 | `verb.voice_passive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.voice_middle_direct` | 直接中動態 | 1 | `verb.voice_middle_reflexive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.voice_middle_reciprocal` | 相互的中動態 | 2 | `verb.voice_middle_reflexive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.voice_middle_reflexive` | 再帰的中動態 | 2 | `verb.voice_middle_reciprocal` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.voice_passive` | 受動態 | 3 | `verb.voice_active` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.voice_permissive_passive` | 許容受動態 | 1 | `verb.voice_passive` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `verb.wish_optative` | 祈願の希求法 | 1 | `verb.potential_optative` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `vocative.chain` | 呼格連鎖 | 3 | `vocative.direct_address` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `vocative.direct_address` | 直接呼びかけ | 2 | `vocative.with_o` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `vocative.exclamatory` | 感嘆的呼格 | 3 | `vocative.with_o` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `vocative.nominative_for_vocative` | 主格転用の呼格 | 2 | `vocative.direct_address` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |
| `vocative.with_o` | ὦ 付き呼格 | 1 | `vocative.exclamatory` | 同カテゴリ候補あり（1）：文脈検証後 | 根拠表示の素材あり（実発火・説明妥当性の検証が必要） | あり |

## 6. 次の実例監査（コード変更前）

静的表だけでは候補比較の可否を確定できないため、まず代表例を選び、実際の解析出力と本文を照合する。

1. 同じ分類群の競合候補が出るケース（例：所有属格と描写的属格、限定的分詞と実体詞的分詞）。
2. 関連候補が別カテゴリ／別分析レベルにまたがるケース（動詞レベルと節レベルなど）。
3. シグナルが複数発火して候補差を説明できるケース。
4. シグナルはあるが文脈上は曖昧で、第一候補の断定を避けるべきケース。
5. 根拠データ不足、または候補が安定して出ないケース。

各実例で記録するもの：
- 参照箇所・対象トークン／句／節
- 実際に出力された候補（ID・順位・スコアは内部監査用）
- 候補ごとの発火シグナルと本文上の証拠
- 候補間の意味の違いを自然な日本語で説明できるか
- 候補比較：表示可／表示不可／データ改善後
- 根拠詳細：表示可／表示不可／データ改善後
- 数値確信度：現時点では不採用

## 7. 安全な実装境界

この監査の次段階で実装する場合も、まずは表示対象を絞った additive な変更にする。解析エンジンの順位付けやレジストリのスコアを同時に変更しない。読書メモの自然文は既存の文章生成経路を維持し、候補情報は別データとして受け渡す。表示に必要な根拠が不足する場合は、現在の読書メモ表示をそのまま維持する（fail closed）。
