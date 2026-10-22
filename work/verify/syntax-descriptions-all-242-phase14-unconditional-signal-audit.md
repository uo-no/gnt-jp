# 第14段階：39件の無条件加点シグナルを検出

## 結論（優先度：最優先）

レジストリ242型と `public/core/syntax-analyzer.js` を機械的に照合したところ、**39件の `xsc.signals[].id` が同じ型の `detection.conditions[].id` に存在しない**ことを確認した。さらに同じ検査を `main` で再実施し、39件すべてがmainにも存在することを確認した。これは閉じられた未マージPR #219のブランチだけの問題ではなく、現行mainにもある。

`CandidateScorer._evaluateType()` は各シグナルIDに対応する条件を `conditions.find(c => c.id === signal.id)` で探す。条件が見つかればそのチェック結果に応じて加点するが、条件が見つからない場合はコメントどおり「condition なし → 常に加算」としている。

したがって、下記39件は、ラベル上の説明と異なり、検出条件の成立を確認せずスコアに加点される。これは文章の品質問題ではなく、**実際の候補順位・0.60の表示閾値・0.05の同列候補判定を歪め得る実装／データ整合性問題**である。

## 検出した39件

| 型ID | シグナルID | 加点 | 表示ラベル |
|---|---|---:|---|
| `genitive.partitive` | `partitive_trigger` | +40 | 数量詞・代名詞がヘッド |
| `genitive.attributive` | `abstract_genitive` | +25 | 抽象名詞が属格に立つ |
| `genitive.attributive` | `adjectival_equivalent` | +20 | 対応形容詞と意味等価 |
| `genitive.epexegetical` | `head_is_abstract` | +30 | ヘッドが抽象・象徴語 |
| `genitive.epexegetical` | `namely_substitutable` | +25 | 「すなわち」置換可能 |
| `genitive.relationship` | `kinship_noun_head` | +35 | 親族・関係名詞がヘッド（υἱός, ἀδελφός 等） |
| `genitive.subjective` | `action_noun_head` | +30 | 動作名詞がヘッド |
| `genitive.objective` | `action_noun_head` | +30 | 動作名詞がヘッド |
| `genitive.comparison` | `comparative_adjective` | +50 | 比較級形容詞と共起 |
| `genitive.separation` | `separation_verb` | +35 | 分離動詞と共起 |
| `genitive.separation` | `prep_apo_ek` | +30 | ἀπό / ἐκ が直前 |
| `genitive.time` | `temporal_lemma` | +45 | 時間名詞が属格形 |
| `genitive.source` | `source_prep` | +35 | ἀπό / ἐκ / παρά が直前 |
| `dative.indirect_object` | `giving_verb` | +40 | 授与・伝達動詞と共起 |
| `dative.interest_advantage` | `benefactive_verb` | +25 | 利益文脈動詞と共起 |
| `dative.interest_disadvantage` | `adversative_verb` | +30 | 否定・反抗動詞と共起 |
| `dative.reference` | `reference_head` | +30 | 基準与格典型語と共起 |
| `dative.time` | `temporal_lemma` | +45 | 時間名詞が与格形 |
| `dative.means` | `instrumental_noun` | +20 | 手段・道具的名詞 |
| `dative.manner` | `manner_noun` | +35 | 様態・感情名詞が与格に |
| `dative.association` | `syn_verb` | +35 | syn- 複合動詞と共起 |
| `dative.association` | `prep_sun` | +30 | σύν 前置詞支配 |
| `participle.attributive` | `matching_noun` | +35 | 格・性・数一致名詞あり |
| `participle.attributive` | `proximity_2` | +10 | 近接（2語以内） |
| `participle.attributive` | `no_article` | -10 | 無冠詞（限定用法の確度低下・Wallace p.618） |
| `participle.substantival` | `article_present` | +45 | 直前に冠詞あり |
| `participle.substantival` | `article_case_match` | +20 | 格が冠詞と一致 |
| `participle.adverbial_temporal` | `no_article` | +15 | 冠詞なし（実体用法除外） |
| `participle.adverbial_temporal` | `no_match_noun` | +10 | 格一致名詞なし（形容詞用法除外） |
| `participle.adverbial_temporal` | `tense_aorist` | +15 | アオリスト（先行動作） |
| `participle.adverbial_attendant` | `aorist_ptc` | +20 | アオリスト分詞 |
| `participle.adverbial_attendant` | `aorist_imperative_main` | +35 | 主動詞がアオリスト命令法 |
| `participle.adverbial_causal` | `causal_particle` | +30 | 因果接続詞（οὖν/γάρ）近傍 |
| `participle.adverbial_causal` | `logical_context` | +15 | 論証的文体 |
| `participle.genitive_absolute` | `ptc_genitive_case` | +30 | 分詞が属格形 |
| `participle.genitive_absolute` | `genitive_noun_present` | +25 | 属格名詞（主語候補）あり |
| `participle.genitive_absolute` | `distinct_subject` | +25 | 主節主語と非同一 |
| `participle.indirect_discourse` | `perception_verb` | +50 | 知覚・認識動詞と共起 |
| `participle.indirect_discourse` | `no_article` | -5 | 冠詞なし |

## 検証対象の確定

2026-10-22時点のGitHub取得結果：
- `main` の `public/assets/data/syntax-registry.json` blob SHA: `a80206bbed9ea37880dcc19fc55e838862c773e8`
- `main` の `public/core/syntax-analyzer.js` blob SHA: `7e51f03add73a2687fc867f4b7a85ea15989e0cd`
- 対象型数：242
- ID不一致シグナル：39
- `main` のスコアラーにも `// condition なし → 常に加算` の実装を確認

PR #219 (`fix(syntax-description-ja-update`) はclosed / unmergedだが、上記の39件はmainでも再現した。したがって、これはPR #219の差分だけを原因とみなしてはいけない。

## 影響の大きさ

- 最大 +50 の加点が、対応する条件の評価なしに入るケースがある。
- 本来は形態・構文・語彙条件に基づいて競合する候補が、根拠のない加点で0.60の表示閾値を超えたり、0.05以内の同列候補になったりする可能性がある。
- 「同じ型の条件IDが存在しない」ことはコード上確認済み。一方、個々のトークンで候補順位が変わるかは、代表例を使った実行テストで別途測定する必要がある。

## 修正の原則

1. **単純に条件IDを機械置換しない。** 同じ意味に見えるIDでも、チェック関数・引数・文脈スコープが一致するとは限らない。
2. 各シグナルについて、(a) 意図する言語学的証拠、(b) 既存条件のチェック関数、(c) 必要な引数、(d) その型の適用対象を照合する。
3. 対応する実装済み条件が存在しない場合は、適切な条件／ハンドラーを追加するか、シグナルを一時停止する。根拠なく無条件加点のまま残さない。
4. すべてのシグナルについて「conditionなしは常に加算」を許可するかを明示する。説明ラベルが観察可能な証拠を述べているのに条件がない場合は、CIで失敗させる。
5. 既存の信頼できる例（例：所有属格、主語的／目的語的属格、冠詞付き分詞、属格絶対）を使い、修正前後の候補・スコア・順位・UI表示を比較する。
6. スコア修正後に全242型の候補頻度・候補ゼロ率・同列候補率を再計測し、特定の型が一律に消えたり大量に増えたりしていないことを確認する。

## 次の工程

まず39件を、対応する既存条件があるもの／条件IDの単純な不一致ではないもの／検出器自体が未実装のものに分類する。次に、1型ずつテストを伴って修正する。大きな一括置換や、言語学的な定義確認を省いた機械的修正は行わない。

この段階は監査文書の追加のみで、`syntax-registry.json`、`syntax-analyzer.js`、`index.html` はまだ変更していない。
