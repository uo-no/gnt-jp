# Phase 19 — 判定不能の意味条件7件の棚卸し

## 目的

PR #230 で導入した三値評価（matched / not_matched / unsupported）を、実際に未実装の意味・談話条件へ対応づける。判定不能を「条件が偽」と同一視せず、根拠のない加点・除外を避ける。

## 対象と現状

| 統語型 | 条件ID | check | 用途 | 現状 |
|---|---|---|---|---|
| `genitive.attributive` | `semantically_replaceable_by_adjective` | `has_adjectival_equivalent()` | 属格名詞句を意味の等しい形容詞で言い換えられるか | unsupported |
| `genitive.attributive` | `semitic_context` | `context_discourse_type_eq('semitic')` | ヘブライ語的文体の文脈か | unsupported |
| `genitive.epexegetical` | `paraphrasable_with_namely` | `semantic_equivalence_test()` | 「すなわち／という」で説明関係を表せるか | unsupported |
| `genitive.epexegetical` | `no_possessive_semantics` | `semantic_equivalence_test()` | 所有関係ではないことを確認できるか | unsupported |
| `dative.means` | `substitutable_with_dia` | `semantic_substitution_test('διά')` | 手段の与格を διά＋属格で言い換えられるか | unsupported |
| `dative.manner` | `adverb_substitutable` | `semantic_substitution_test('adverb')` | 与格句を副詞で言い換えられるか | unsupported |
| `participle.adverbial_causal` | `logical_discourse_marker` | `context_discourse_type_eq('argumentative')` | 論証的談話の文脈か | unsupported |

計7条件、4種類のハンドラー。レジストリの条件式に接続され、該当する加点シグナルは条件が matched のときのみ加点される。unsupported は加点せず、診断用の `signalsUnsupported` / `checksUnsupported` に記録する。

## 重要な区別

- `not_matched`: 評価した結果、条件を満たさないと判断できた。
- `unsupported`: 現在の実装・入力情報では判断できない。条件が偽だという意味ではない。
- `matched`: 実装された判定根拠により条件を満たす。

語形・隣接語だけから意味的等価性や談話機能を確定する実装は避ける。特に「論証的」「ヘブライ語的」は単語の近接だけで決めず、談話範囲と原典に基づく根拠が必要。

## 次の実装順

1. **入力データの棚卸し** — `AnalysisContext` に節・句・統語関係・語彙情報のどれが利用可能かを確認し、各判定に必要な情報との差を明記する。
2. **明示的な文脈特徴から実装** — 既存データに根拠があり、決定規則を再現可能に定義できる条件だけを実装候補とする。語彙リストだけで意味的等価性を推定しない。
3. **Wallace を主参照として検証** — それぞれの統語型の定義・識別基準を確認し、Smyth 等は補助資料に限定する。参照箇所を直接確認できない場合、例文やページを推測して記載しない。
4. **ゴールドセットを作る** — 各条件について肯定・否定・判定不能の人手確認例を作り、出典と判定理由を保存する。
5. **実装後に新約全体を再比較** — 既存の `scripts/syntax-score-compare.cjs` でスコア・順位差分を確認し、意図した差分のみレビューする。

## この段階の完了条件

- 7条件が回帰テストで全件列挙される。
- レジストリ説明が「恒偽／常に false」と誤記せず、未実装・判定不能であることを明示する。
- 新約全体比較の差分ゼロを維持する。
- 意味的判定ロジックの実装は、根拠とゴールドセットが揃うまで推測で進めない。

## 関連

- PR #230: https://github.com/uo-no/gnt-jp/pull/230
- Whole-NT comparison: `scripts/syntax-score-compare.cjs`
- Tri-state regression: `scripts/syntax-check-tristate-regression.cjs`
