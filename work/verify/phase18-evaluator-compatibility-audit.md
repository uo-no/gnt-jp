# Phase 18 — CheckEvaluator 呼び出し契約・後方互換性監査

## 対象

- `public/core/syntax-analyzer.js` on `main` (blob `7e51f03add73a2687fc867f4b7a85ea15989e0cd`)
- `scripts/genitive-regression-test.cjs` on `main` (blob `0ac7ef15629c604bbba6ee9c9c1883dde66dde8c`)

## 現行契約の確認

1. `CheckEvaluator.eval(checkStr, ctx)` はbooleanを返す。未知のcheckも `false` を返す。
2. `NOT` は評価結果を反転する。ANDは `every`、ORは `some` を使う。
3. `CandidateScorer._evaluateType()` は、checkがtrueの時だけ条件付きシグナルを加点し、falseは `signalsFailed` に記録する。
4. ID不一致は、後段の `_patchCandidateScorerEvaluateType` が組み込み対応表を参照して解決する。対応条件がある場合は、そのcheckを評価する。
5. 条件・マッピングがないシグナルは現行仕様上、無条件加点となる。この仕様は39件のID不一致とは別に扱う必要がある。
6. 現行コメントでは `deltas` は「マッチシグナルのみ」と定義されるが、条件なしのシグナルも `deltas` に追加されている。これは説明コメントと実装の不一致で、三値評価とは分けて修正要否を決める。

## 互換性上の注意

- `signalsMatched` と `signalsFailed` は候補出力の一部。利用側の全呼び出し箇所を確認せずに意味を変えない。
- `signalsUnsupported` の追加はオブジェクトの追加フィールドなので、通常は既存の読み取りを壊しにくいが、厳密なスキーマ検査やオブジェクト比較のあるテストを確認する必要がある。
- `eval()` の戻り値をbooleanから文字列・オブジェクトに変更すると、既存の直接呼び出しすべてに破壊的変更となる。安全な移行案は既存の `eval()` を維持し、別メソッド `evalDetailed()` を追加して、スコアラーのみが詳細状態を使う方法。ただし、boolean専用の内部論理評価を三値論理に置き換えるには、NOT/AND/ORを同時にテストする必要がある。
- unsupportedをfalseの別名として処理し続ける互換ラッパーを残す場合、スコアラーは詳細APIを利用しなければ、状態区別の目的が達成されない。
- `status: stub` の型は別経路でdefault confidenceを返すため、unsupported条件の変更と混同しない。

## 実装の受け入れ条件

1. `eval()` の既存boolean契約を維持するか、呼び出し全体を移行するかを明示する。
2. `evalDetailed()` は `matched/not_matched/unsupported` と理由を返す。
3. `NOT unsupported` はmatchedにならない。
4. AND/ORの三値論理を単体テストする。
5. scorerはunsupportedシグナルを加点せず、`signalsUnsupported` に記録する。
6. IDフォールバックを維持し、39ペアの回帰テストを行う。
7. 既存のテストコマンド、候補出力を使う全箇所、新約全体のスコア差分を確認する。
8. 計測結果がレビューできるまでは本番ブランチへマージしない。

## まだ実施していないこと

- CheckEvaluatorのコード変更
- 直接呼び出しの全体検索結果を得た実行テスト
- 新約全トークンの旧版/新版差分測定
- CI追加、マージ、デプロイ

## 次の推奨作業

次のコードPRは三値評価の追加に限定し、Registryの文言変更やWallace分類の改訂を混ぜない。意味的置換テストをどう実装するかは、その後に個別仕様として扱う。
