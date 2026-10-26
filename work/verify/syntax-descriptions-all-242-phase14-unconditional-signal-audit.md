# 第14段階：39件の直接ID不一致とフォールバック対応

## 結論（重要な訂正：直接ID一致だけでは判定できない）

レジストリ242型を直接ID一致だけで走査すると、**39件の `xsc.signals[].id` が同じ型の `detection.conditions[].id` に存在しない**。ただし、これは実行時に条件なし加点される39件を意味しない。`syntax-analyzer.js` には `condition_signal_map`（既定 `_BUILTIN_CONDITION_SIGNAL_MAP`）による条件ID→シグナルIDの対応付けがあり、実行時の `_evaluateType_patched()` はこの逆引きで条件を評価する。したがって、39件の影響を判定するには、このマップを同じ型の条件群と照合する必要がある。

`CandidateScorer._evaluateType()` は各シグナルIDに対応する条件を `conditions.find(c => c.id === signal.id)` で探す。条件が見つかればそのチェック結果に応じて加点するが、条件が見つからない場合はコメントどおり「condition なし → 常に加算」としている。

第16段階の再照合で、**39件すべてに同じ型内のフォールバック対応条件が存在する**ことを確認した。よって「39件が無条件加点される」という第14段階の当初結論は誤りであり、撤回する。39件の直接ID不一致は保守性・可読性の課題ではあるが、それだけを根拠にスコア誤りとはいえない。

## 直接IDが一致しなかった39件（すべてフォールバック対応あり）

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

## 影響の再評価

- この39件については、同じ型内のフォールバック条件が見つかるため、実行時に条件評価なしで加点されるとはいえない。
- 直接IDが一致しないことは、マップを介さない静的解析や将来のコード変更で誤認を招く保守性上の弱点ではある。
- 本当に重要なのは、対応する条件の意味がシグナルのラベル・スコアと一致しているか、またそのチェック関数が実装され実際に判定可能かどうかである。第16段階でその問題を確認する。

## 改善の原則

1. 直接ID一致だけで orphan signal と判定せず、必ず `condition_signal_map` と実行時の逆引きロジックを考慮する。
2. 各シグナルについて、(a) 意図する言語学的証拠、(b) 対応条件のチェック関数、(c) そのチェックが実装済みか、(d) ラベルと加点の意味が一致するかを確認する。
3. CIの orphan 検査は、直接一致とマップ経由の両方を検査する。既存の `scripts/genitive-regression-test.cjs` §7a に同趣旨の lint がある。
4. 代表例を用いて、シグナルの条件が成立したときだけ加点され、成立しないときは加点されないことを実行テストで確認する。
5. 全242型について、対応条件の未実装・常時false・シグナルラベルとの意味的不一致を優先して修正する。

## 次の工程

39件を機械的に一括修正する作業は不要。代わりに、フォールバックマップと実行時評価のテストが同じ意味を保っていることを回帰テストで確認する。さらに、マップの重複・存在しない条件・複数型間での意図しない再利用を検査する。別途、常時falseのチェック関数に依存する分類の検出能力は、実際の別問題として検証する。

この段階は監査文書の訂正のみで、`syntax-registry.json`、`syntax-analyzer.js`、`index.html` は変更していない。
