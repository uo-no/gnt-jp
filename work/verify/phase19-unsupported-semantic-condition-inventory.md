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

## AnalysisContext の入力監査（実装判断）

現行の `ContextBuilder.build()` が組み立てる主な情報は、形態情報、前後トークン、節分割、節内の定形動詞、ヘッド／支配語候補、句検出、授与動詞・否定／逆接の手掛かりなどである。一方、次の情報は明示的な注釈として保持されていない。

- 名詞句の意味的言い換え（形容詞・「すなわち」・副詞・διά＋属格）の妥当性
- 所有関係が成立しないことを示す意味役割判定
- 「ヘブライ語的」「論証的」を裏付ける談話単位・談話機能の注釈

節分割や接続詞・句読点の検出は談話分析の手掛かりにはなるが、それだけで談話タイプを確定する根拠にはならない。したがって、この段階で7条件のどれかを形態・近接語ヒューリスティックに置き換えるのは不適切であり、すべて unsupported のまま維持する。

追加監査では、既存の `genitive.attributive` の `adjectival_equivalent` シグナルに「条件なし登録なので unconditional 扱い」と誤解を招く TODO が残っていたため、条件→シグナル対応表で接続され、unsupported の間は加点されないことを明記した。回帰テストも7条件すべてに明示的な「未実装／判定不能」説明があることを要求する。

## Wallace を主参照とした定義確認（一次資料への参照）

以下は公開されている Wallace 著作の説明・要約から確認できた判定原則であり、個別の新約用例を評価した結果ではない。

- **説明的属格（genitive of apposition / epexegetical genitive）**: 属格名詞がヘッド名詞の指す大きなカテゴリーを具体化することがあり、「which is / that is / namely」への言い換えは識別の手掛かり。ただし、置換が自然かどうかを文脈と他の候補に照らして判断する必要がある。単なる文字列置換テストを自動判定の根拠にしない。
- **与格の様態（dative of manner）**: 動作が「どのように」行われるかを表す。副詞への変換は有用なテストだが、常に変換できるわけではない。手段（means）と様態（manner）は意味上の区別が必要で、抽象名詞か具体名詞かは傾向であって絶対条件ではない。
- **副詞的分詞**: 原動詞との関係（いつ／どのように／なぜ等）を文脈で判断し、文脈が解釈に大きく関与する。接続詞や句読点の存在だけでは、原因・論証的談話を確定できない。
- **ヘブライ語的文体／形容詞相当性／非所有関係**: 今回確認できた公開資料だけでは、アプリ内で機械判定するための再現可能な十分条件を確立できていない。よって unsupported のまま保留する。

参照:
- Wallace, *The Basics of New Testament Syntax* — [公開PDF内の説明的属格の識別基準](https://www.obinfonet.ro/docs/gk/resgk/wallace-basic-nt-greek.pdf)（同書 pp. 52–53 の該当節が検索結果で確認できる公開ミラー）
- Wallace, *The Basics of New Testament Syntax* — [副詞的分詞の定義と文脈の役割](https://www.obinfonet.ro/docs/gk/resgk/wallace-basic-nt-greek.pdf)（同書 p. 272 の該当節が検索結果で確認できる公開ミラー）
- Wallace の著作内容を参照して説明する補助資料: [Zondervan Academic の解説](https://zondervanacademic.com/blog/when-does-of-mean-namely-or-is-mondays-with-mounce)
- 著者・出版社による書籍概要: [Zondervan Academic — *Greek Grammar Beyond the Basics*](https://zondervanacademic.com/products/greek-grammar-beyond-the-basics)

この確認で根拠が得られたのは、主に識別のための問いと文脈依存性であり、これだけで自動分類器を実装できるわけではない。とくに「すなわち」テストや副詞変換は人間の解釈を助ける診断手段として扱い、判定を自動化するには、用例ごとの正解ラベルと反例を先に用意する。

## ゴールドセットの記録形式

今後、実装候補にする場合は各条件について少なくとも次の項目を記録する。現時点では例文を推測で埋めず、検証済みの聖書箇所と参照箇所が揃ってから登録する。

| フィールド | 要件 |
|---|---|
| `condition_id` | 上記7条件のいずれか |
| `reference` / `token_index` | 節参照と対象語の安定した位置ID |
| `human_label` | `matched` / `not_matched` / `unsupported` |
| `reason_ja` | 文脈・統語関係・意味上の根拠を日本語で記録 |
| `alternatives` | 競合する読みと、それぞれを支持／弱める根拠 |
| `wallace_reference` | 章・節・ページ。確認できたものだけを記録 |
| `review_status` | 未レビュー／独立レビュー済み |
| `reviewer_note` | 意見が分かれる場合の理由 |

各条件に肯定例・否定例・判定不能例を用意し、別のレビュー者が根拠を追えるまで本番の判定ロジックには接続しない。

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
