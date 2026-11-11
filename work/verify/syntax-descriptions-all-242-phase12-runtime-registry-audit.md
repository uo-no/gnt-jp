# 第12段階：レジストリと実行時候補生成の照合

## 対象と方法

対象レジストリは `fix/syntax-description-ja-update` ブランチの `public/assets/data/syntax-registry.json`、実装は同ブランチの `public/core/syntax-analyzer.js` と `public/index.html`。本段階では、説明文の文面だけでなく、`alternatives`・`detection.conditions`・`xsc`・実行時候補表示の関係をコードで確認した。

## 1. レジストリの静的集計

| 項目 | 結果 |
|---|---:|
| 統語型 | 242 |
| `label_ja` 欠落 | 0 |
| `description_ja` 欠落／空欄 | 0 |
| `wallace_ref` 欠落 | 0 |
| `alternatives` を持つ型 | 238 |
| `alternatives` を持たない型 | 4 |

`alternatives` がない4型は `article.monadic`、`article.generic`、`article.previous_reference`、`article.par_excellence`。この一覧はレジストリの存在・形式を確認したもので、Wallaceの参照先が正確であることを意味しない。

## 2. 重要なコード上の発見

### A. `alternatives` は「同時候補」の証拠ではない

`SyntaxAnalyzer` の候補生成では、各型の `detection` 条件と `xsc` のシグナルから候補スコアを計算する。候補オブジェクトにはレジストリの `alternatives` が付加されるが、配列に列挙された型をそのまま同時候補として追加する処理ではない。

したがって、UIは `alternatives` の配列だけを根拠に「今回の本文には別解釈も検出された」と表示してはならない。同時候補比較の根拠は、同じ対象トークンの `output.candidates` に実際に複数の型が含まれていることと、それぞれの `signals_matched` 等の実際の判定根拠である。

### B. ただし `alternatives` はスコアに間接影響する

`public/core/syntax-analyzer.js` の `_computeTieBreakScore(typeDef)` は、`alternatives.length` から `specificity_score = 1 / (1 + alternatives.length)` を計算し、同点候補のタイブレークに加算する。コメントも「競合候補が少ないほど固有」と想定している。

このため、`alternatives` は候補を直接生成しないものの、**その関連型リストの長さが、判定シグナルとは別に最終スコアへ影響する**。リストが分類学上の関連型を表しているだけなら、リストの長さを候補の確からしさ・特異性の代理にする妥当性は再検討が必要。スコアが確率として校正されている根拠は確認できていない。

推奨：この監査では即座にスコア変更を行わず、先に全型の `alternatives` が「実際に競合する型」なのか「関連する型」なのかを定義し直し、候補順位への影響を回帰テストで測定する。

### C. `detection.conditions` は全条件をANDで要求する単純な配列ではない

`CandidateScorer._evaluateType()` は、各 `xsc.signals` について同じIDの `detection.conditions` を探し、その `check` を評価する。条件の一致／不一致は、対応するシグナルの加点／非加点として扱われる。一方、`detection.exclusions` は一致が一つでもあれば候補スコアを0にする別の仕組みである。

したがって、`conditions` に `no_preposition` と `after_preposition` が同時に記載されていることだけでは、型が論理矛盾しているとは断定できない。実際にどのシグナルが評価され、除外条件がどの段階で適用されるかを併せて読む必要がある。

静的検査でこの両IDが同じ条件群に存在したのは、少なくとも次の4型：
- `genitive.possessive`
- `genitive.descriptive`
- `dative.indirect_object`
- `dative.means`

これらは誤りと断定せず、重複した負シグナル／除外ロジックが意図どおりか、実トークンと単体テストで確認する監査対象とする。

### D. レジストリには未実装・恒偽のシグナル注記がある

静的検査で `_TODO`、`未実装`、`恒偽` 等の注記が見つかった型：
- `genitive.attributive`
- `genitive.epexegetical`
- `dative.reference`
- `dative.manner`

注記には、形容詞相当の判定や文体判定などが未実装、または恒偽である旨が含まれる。これらの型は、説明文が自然でも、実行時に記載された根拠が実際には発火しない可能性がある。原典監査R1/R2と実データ監査R5を分けて記録し、未実装シグナルを読者向けの根拠表示に出さないこと。

この静的走査はレジストリ全体に対する文字列検査であり、未実装条件の全件やランタイムでの発火状況を完全に確定したものではない。次段階で `CheckEvaluator` の実装と各 `check` 名の対応を照合する。

## 3. UI表示との接続

`public/index.html` の `_buildSyntaxLabelHTML(words, targetRef)` は `SyntaxAnalyzer.analyze()` の `output.candidates` を受け取り、confidence 0.60以上、`status !== 'stub'` の候補を表示対象にしている。スコア順に並べ、ラベル重複を除去し、上位候補間の差が0.05未満なら同列候補として扱う実装である。

このUI条件から、次の点が導かれる。

1. 同列候補の基準は現状「スコア差0.05未満」であり、校正済み確率の差ではない。説明・ラベルで「確率」や「○％の確度」と言い換えない。
2. 0.60の足切りで、別候補が実際には生成されていてもUIから見えなくなる場合がある。監査ログでは「エンジンが生成した候補」と「UIに表示された候補」を分ける。
3. 最高候補との差が0.05以上なら一候補を主候補として扱う設計だが、その差だけで言語学的な解釈が確定したことにはならない。
4. `signals_matched` と `signals_failed` を本文の根拠として表示するなら、そのシグナルが実際に評価されたか、単に無条件加算された値かを区別する必要がある。

## 4. 具体的な次のテスト

1. `alternatives` を同時候補リストとして使っていないことをユニットテストで固定する。
2. `alternatives.length` が `_computeTieBreakScore` に与える影響を数値化し、順位・閾値・表示結果が変わる実例を抽出する。
3. 前置詞支配の属格／与格を代表例で解析し、候補が除外される前後のスコア・`signals_matched`・`signals_failed` を確認する。
4. 恒偽／未実装と記録されたチェック名を `CheckEvaluator` の実装に照合し、ランタイムで実際に呼ばれるか確認する。
5. 0.60足切りと0.05同列基準を、原典の言語学的確度ではなくUI用ヒューリスティックとして明示する。
6. これらの確認後に初めて、候補比較文の表示条件を全トークンに適用する。

## 5. 結論

242型の名称・説明・Wallace参照がすべて存在する一方、それだけでは原典の正確性も、判定シグナルの実装・実トークンの正しさも保証されない。今回のコード照合で特に重要なのは、`alternatives` が候補を直接作らないがスコアには間接的に影響すること、そしてUIの同列判定がスコア差のヒューリスティックであること。

この段階では監査文書のみを追加し、`syntax-registry.json`、`syntax-analyzer.js`、`index.html` の動作変更は行っていない。
