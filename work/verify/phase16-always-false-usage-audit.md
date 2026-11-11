# Phase 16 — Always-false check の実使用箇所と安全な扱い

## 目的

Phase 13で列挙した常に `false` を返す CheckEvaluator を、main の現行 `public/assets/data/syntax-registry.json` と突合し、実際の利用箇所・スコアへの影響・次の対応を整理する。Wallaceの分類を、未実装の意味判定が成立したかのように扱わない。

## 対象と方法

- 対象 ref: `main`
- Registry: `public/assets/data/syntax-registry.json`
- Evaluator: `public/core/syntax-analyzer.js`
- Registryの242型を再帰走査し、以下のcheck名が条件式に使われている箇所を抽出:
  - `has_adjectival_equivalent()`
  - `semantic_equivalence_test()`
  - `semantic_substitution_test(...)`
  - `context_discourse_type_eq(...)`

この文書は静的なRegistry–実装照合であり、NT全トークンを実行した回帰試験ではない。

## 確認された使用箇所

| 型ID | 条件ID | Check | 評価 |
|---|---|---|---|
| `genitive.attributive` | `semantically_replaceable_by_adjective` | `has_adjectival_equivalent()` | 形容詞との意味等価性を自動判定できず、条件は常にfalse。該当シグナルが有効な証拠として加点されない可能性がある。 |
| `genitive.attributive` | `semitic_context` | `context_discourse_type_eq('semitic')` | 談話・文体の判定器が未実装。現状この条件は成立しない。 |
| `genitive.epexegetical` | `paraphrasable_with_namely` | `semantic_equivalence_test()` | 「すなわち」置換の意味判定が未実装。 |
| `genitive.epexegetical` | `no_possessive_semantics` | `semantic_equivalence_test()` | **条件とCheckの意味が不一致。** 否定的な所有意味の排除を、一般的な「すなわち」置換テストで判定しようとしている。単なる実装待ちではなく、仕様の再設計が必要。 |
| `dative.means` | `substitutable_with_dia` | `semantic_substitution_test('διά')` | `διά + 属格`への言い換え可能性を自動判定できず、条件は常にfalse。 |
| `dative.manner` | `adverb_substitutable` | `semantic_substitution_test('adverb')` | 副詞への意味的言い換え判定が未実装。 |
| `participle.adverbial_causal` | `logical_discourse_marker` | `context_discourse_type_eq('argumentative')` | 論証的談話の判定器が未実装。文脈判定済みとは扱えない。 |

## スコア・表示への意味

1. `false` を返す条件は、その条件が必要な判定・加点を成立させない。これを「条件を確認せず加点」と混同しない。
2. ただし、型の他の条件や基礎点、他のシグナルは独立しているため、型全体が必ず候補から消えるとは限らない。
3. `genitive.epexegetical` の `no_possessive_semantics` は否定的条件の意図とCheckが一致していない。安全な実装では、意味判定を実装するまで該当シグナルを根拠として表示・加点しないことを検討する。
4. 「対応する形容詞がある」「すなわちと置換できる」「διά句に言い換えられる」「論証的文脈である」といった意味・談話上の主張は、形態情報だけでは確定できない。自動判定が未実装なら、その旨を開発上明示し、ユーザー向け説明でも確定的根拠として扱わない。

## Wallaceに照らした対応方針

- Wallaceの分類・記述を一次の文法的枠組みとする。
- 形態・局所構文から検出可能な手掛かりと、文脈・意味解釈に依存する判断を分離する。
- 置換テストを一般的な文字列置換で代用しない。文脈内で意味が保たれるかを必要とする場合、語彙・統語・談話の情報要件を先に定義する。
- 特に `no_possessive_semantics` は肯定的な「すなわち置換」テストと別の判定概念として扱う。
- 自動判定の信頼性が確保できない場合は、スコアシグナルとしては保留し、読書メモで「解釈上の検討点」として示す設計を優先する。

## 次の作業

1. `CheckEvaluator` の戻り値を `true/false/unsupported` に分離する案を設計し、unsupported を false と同一視して重要な証拠を黙って失わないようにする。
2. Registryで条件がunsupportedの場合のスコア方針を決める。既定は加点なし。候補confidenceの正規化・閾値・候補間差分への影響も検証する。
3. `no_possessive_semantics` は別Checkとして再定義するか、検出可能な証拠がなければスコア条件から外す。
4. これらを実装する前に、各型の代表トークンと、既存の全新約回帰テストで差分を計測する。根拠のない一括マッピングは行わない。

## 未実施

- Wallace本文の各節・ページを全条件について直接照合すること。
- 新約全トークンの実行時比較、候補順位の差分測定。
- コード変更、CI追加、マージ、デプロイ。

## 結論

現時点での確認対象は7条件、5型。すべての恒偽条件を単純に実装するのではなく、意味の異なる条件を分離し、unsupportedを明示できる判定契約を設計することが安全な次段階である。
