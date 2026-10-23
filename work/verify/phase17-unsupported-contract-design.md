# Phase 17 — CheckEvaluator の unsupported 契約と移行設計

## 結論

現行実装の `CheckEvaluator.eval()` は boolean を返す。未登録checkも恒偽の意味判定器も `false` を返すため、「判定不能」と「証拠を確認して不成立」を区別できない。一方、現行のスコア経路では条件が見つかって評価結果がfalseならシグナルを加点しない。したがって、現時点で確認できる直接の問題は、unsupportedなシグナルが陽性証拠として加点されることではなく、判定不能状態が結果・診断に表れず、条件設計上の誤りを見逃しやすいことにある。

## 現行コードの確認

対象: `main` の `public/core/syntax-analyzer.js` と `public/assets/data/syntax-registry.json`。

- `CheckEvaluator.eval()` はbooleanを返す。
- `NOT` は評価結果を反転する。したがって、将来unsupportedを単純にfalseの代わりにnullで返すだけでは、`NOT unsupported` がtrueに反転したり、AND/ORの評価が誤る可能性がある。
- `CandidateScorer._evaluateType()` は、条件が見つかったシグナルを条件評価し、trueのときのみ加点する。falseの場合は `signalsFailed` に記録する。
- 条件IDとシグナルIDが異なる場合は、後段のパッチにあるフォールバック対応表で対応する条件を探す。
- 条件もマッピングもないシグナルは無条件加点される既存仕様である。この経路をunsupported対応のついでに変更すると、242型全体のスコアを変えるため、別の移行として扱う必要がある。

## 推奨する戻り値契約

段階1では、内部評価結果を次の判別可能な形にする。

- `matched`: 条件を評価でき、成立した。
- `not_matched`: 条件を評価でき、不成立だった。
- `unsupported`: checkの実装が未提供、必要なデータがない、または意味判定を自動化できない。

`NOT`、`AND`、`OR` は三値論理を明示的に実装する。unsupportedを暗黙にfalseとして反転してはならない。AND/ORでは、結果が他の項だけで確定する場合（例: false AND unsupported）と、確定できない場合を分ける。エラーや未知のcheckも、ログだけで隠さずunsupported理由として追跡可能にする。

## スコアへの移行方針

- `matched`: 従来どおりシグナルを加点。
- `not_matched`: 加点しない。従来の失敗診断を維持。
- `unsupported`: 加点しない。別の診断配列に `signalsUnsupported` と理由を記録する。
- 候補の正規化処理でunsupportedを成功数として扱わない。
- 既存の `signalsMatched` / `signalsFailed` の意味を変えず、`signalsUnsupported` を追加する。既存利用箇所を調査してから互換性を確定する。
- `status: stub` と、実装済み型のunsupported条件を混同しない。

## Registry側の対応

| 型ID | 条件 | 現在の問題 | 推奨 |
|---|---|---|---|
| `genitive.attributive` | `semantically_replaceable_by_adjective` | 形容詞との意味等価性が恒偽 | unsupportedとして診断。スコア根拠にしない |
| `genitive.attributive` | `semitic_context` | 文体分類が恒偽 | 自動判定の仕様ができるまでunsupported |
| `genitive.epexegetical` | `paraphrasable_with_namely` | 文脈内の意味置換が恒偽 | unsupportedとして診断 |
| `genitive.epexegetical` | `no_possessive_semantics` | 「すなわち」テストを流用しており、条件の意味とcheckが不一致 | check名と定義を分離。実装までunsupported |
| `dative.means` | `substitutable_with_dia` | 意味的置換が恒偽 | unsupportedとして診断 |
| `dative.manner` | `adverb_substitutable` | 副詞への意味的置換が恒偽 | unsupportedとして診断 |
| `participle.adverbial_causal` | `logical_discourse_marker` | 論証的文脈判定が恒偽 | unsupportedとして診断 |

## 必須テスト

1. 単純な既知checkのtrue/falseが既存挙動を維持する。
2. 未知checkがunsupportedとして返り、候補を加点しない。
3. unsupportedを含む `NOT` がtrueに化けない。
4. `false AND unsupported`、`true AND unsupported`、`true OR unsupported`、`false OR unsupported` の結果と理由が定義どおり。
5. 7条件が `signalsUnsupported` に記録され、`signalsMatched` には入らない。
6. IDフォールバックで条件を解決する39シグナルの回帰を維持する。
7. 全242型の構造検査と、代表節（既存のJAS/ROM/JHN/LUK）を実行する。
8. NT全体で旧版/新版の候補・raw score・confidenceを比較し、差分の理由を出力する。未説明の差分が残る場合はマージしない。

## 非目標

- unsupportedな意味判定を、単語リストだけで「実装済み」に見せること。
- 242型の条件IDやシグナルIDを一括置換すること。
- unsupportedな条件を無視して、他のシグナルまで無効化すること。
- 回帰テストなしに本番のスコアを変えること。

## 次の工程

まずCheckEvaluatorとその呼び出し側・出力利用箇所を横断し、追加フィールドの互換性を確認する。その後、三値論理を独立したテストで実装し、候補スコア比較を経て、専用PRに分離する。実装・実行テスト・マージ・デプロイはまだ未実施。
