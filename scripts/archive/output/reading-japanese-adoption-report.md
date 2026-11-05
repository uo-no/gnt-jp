# Reading Japanese Adoption Report(M-15 実行サマリ)

生成: 2026-07-22 / 実行器: scripts/exec-adoption-reflection.cjs

## 反映
- 反映 token: **2,537**(morph 2,414 / syntax 123)・252 ファイル
- 反映対象: 固定点のみ(代名詞/関係詞/指示詞の数・性・人称)
- 反映対象外: 動詞屈折 約7,000(Data 層保持対象外・engine 動的屈折)
- pre-hash: 54d9f28372d3a143… / post-hash: 980cb659e5c7d445…
- 重複「 2.json」: 0

## 上位 before→after
あなた→あなたがた 704 / 彼→彼ら 603 / 〜する者→〜するもの 292 / 彼→彼女 204 / 私→私たち 158 /
誰→何 158 / この→これ 115 / 彼→それ 98 / 彼→それら 56 / 自分自身→あなた自身 30

## QA
- QA1 engine ロジック: 全 9 スイート ALL PASS(engine 非改変)
- QA2 corpus baseline(期待差分): morph 44,614→44,396 / syntax 4,194→4,208 / particle 3,015→3,084 / re-m8d 179→56
- QA3 adoption integrity: diff 2,537 / before一致 / after一致 2,537 / 冪等再実行 0 / rollback pre-hash 復元 ✓
- QA4 reading output: git diff=japanese 値のみ 2,537(非 japanese 変更 0)/ 破損 0

## 成果物
- scripts/output/reading-japanese-adoption-diff.json(diff 2,537)
- scripts/output/reading-japanese-adoption-backup.json(before + pre/post-hash・rollback)
- docs/reading-japanese-adoption-execution-report.md(詳細)

詳細・完了条件は docs/reading-japanese-adoption-execution-report.md を参照。
