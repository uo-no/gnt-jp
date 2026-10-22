# 第15段階：シグナルと検出条件の対応付け — 再評価

## 結論

第14段階の直接ID照合だけでは、シグナルに対応する条件が存在しないと判断できなかった。`public/core/syntax-analyzer.js` の `_BUILTIN_CONDITION_SIGNAL_MAP` は条件IDからシグナルIDへの対応表であり、実行時の `_evaluateType_patched()` はこれを逆引きしてシグナルに対応する条件を評価する。

242型の `syntax-registry.json` とmainの実装を照合し直した結果、直接IDが一致しない39件は、**すべて同じ型内のフォールバック条件に対応**していた。フォールバック照合後に未対応となるシグナルは0件だった。

したがって、この文書の旧版に記載した「39件の条件ID不一致をコード修正する」という提案は撤回する。シグナルIDを条件IDに合わせる一括置換は不要であり、むしろ現在の対応表と回帰テストの設計を壊すおそれがある。

## 残る検証事項

1. `scripts/genitive-regression-test.cjs` §7a の orphan-signal 検査が全242型で成功することを、該当ブランチ上で実行して確認する。
2. `_BUILTIN_CONDITION_SIGNAL_MAP` のキーが同じ型の `detection.conditions` に存在することを検査する。
3. 同じシグナルIDへ複数条件が対応する場合、現行実装が最初に見つかった条件だけを評価するのか、複数条件を評価すべき設計なのかを確認する。
4. 直接一致とフォールバック一致が同じ型内で重複した場合の扱いをテストする。
5. 常時falseを返すチェック関数（`has_adjectival_equivalent`、`semantic_equivalence_test`、`semantic_substitution_test`、`context_discourse_type_eq`）に依存する型は別問題として監査する。

## 状態

この再評価は監査文書の訂正であり、実装コードやレジストリは変更していない。
