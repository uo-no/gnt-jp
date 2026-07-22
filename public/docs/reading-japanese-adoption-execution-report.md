# Reading Japanese Adoption Execution Report(Stage M-15)

実施日: 2026-07-22
位置づけ: **M-14 実行設計 + M-15 前提 freeze(役割移行・Data 層境界)に基づき、adoption diff を唯一の
変更根拠として bible_data.japanese へ Reading Japanese を反映**した実行報告。**実行 Stage(bible_data を
実変更)**。
根拠(FROZEN): reading-japanese-policy.md(L-0)・-data-role-migration-freeze.md・
-data-layer-boundary-freeze.md・-adoption-execution-design.md(M-14)・-adoption-decision-framework.md(M-13)。
ユーザ判断(2026-07-22・固定点サブセットのみ反映・回帰再スコープ)。

- 成果台帳: `scripts/output/reading-japanese-adoption-diff.json`(diff 2,537)/
  `scripts/output/reading-japanese-adoption-backup.json`(before + pre/post-hash)。
- 実行器: `scripts/exec-adoption-reflection.cjs`(機械適用・before 一致検証 → after 置換のみ)。

---

## 1. 実行前の重要発見(2 つの境界問題)と対応

| 発見 | 対応(ユーザ判断) |
|---|---|
| **① 反映は engine-corpus 回帰の morph 集計を必然的にドリフトさせる**(japanese は engine の入力起点だった) | **役割移行**: bible_data.japanese を Data 代表語→Reading Japanese 正規値へ。engine-corpus baseline は反映前歴史的記録として保存し、監査を 4 分類へ再スコープ(data-role-migration-freeze) |
| **② engine 出力を入力へ戻すと再変換**(動詞屈折 豊かにされる→豊かにされられる の二重屈折・_stem が もの→も 誤除去) | **固定点のみ反映**: 代名詞/関係詞/Syntax の約 2,537 のみ。動詞屈折 約7,000 は Data 層保持対象外(engine 動的屈折)。after は case 認識で算出・_stem の もの バグ修正(data-layer-boundary-freeze) |

---

## 2. 反映結果

| 項目 | 値 |
|---|---|
| **反映 token** | **2,537**(morph 2,414 / syntax 123) |
| 変更ファイル | 252 |
| 反映対象外(動詞屈折・Data 層保持対象外) | 約 7,000(engine 動的屈折のまま) |
| pre-hash | `54d9f28372d3a143…` |
| post-hash | `980cb659e5c7d445…` |
| 重複「 2.json」 | 0 |

### 反映 before→after 上位

あなた→あなたがた 704 / 彼→彼ら 603 / 〜する者→〜するもの 292 / 彼→彼女 204 / 私→私たち 158 /
誰→何 158 / **この→これ 115(syntax)** / 彼→それ 98 / 彼→それら 56 / 自分自身→あなた自身 30。
すべて **代名詞・関係詞・指示詞の固定点代表形**(格助詞・屈折は含まない=engine が動的付与)。

---

## 3. QA(4 分類)

### QA1. Engine logic regression(ロジック不壊)

- **全 9 スイートの Part 1(合成トークン単体検査)= ALL PASS**(engine ロジック非改変)。
- 再 baseline 後、**全 9 スイート ALL PASS**(engine 8 + Builder re-m8d)。

### QA2. Morph coverage baseline(反映前後の期待差分・記録)

**engine-corpus 集計は反映前 Data 代表語時代の歴史的 baseline。反映で下記へドリフト(期待差分・失敗でない)。
旧値はコメント保存し削除しない(data-role-migration-freeze)。**

| 監査 | before(pre-reflection) | after(post-reflection) |
|---|---|---|
| morph coverage(re-phase1) | 44,614 | **44,396**(−218) |
| syntax(re-phase2) | 4,194 | 4,208(+14) |
| particle(re-phase3) | 3,015 | 3,084(は 2,170→2,202 / が 845→882) |
| re-stageA identical/changed | 2,163 / 20,936 | 2,174 / 20,925 |
| re-stageB changed/identical/presented | 40,055 / 97,686 / 4,244 | 39,891 / 97,850 / 4,258 |
| syntax adoption(re-m8d) | 179 | 56(反映 123 が Data 化) |

- morph の低下が小さい(−218)のは、反映後も **格助詞は engine が morph 解決する**ため(私たち→私たちの)。

### QA3. Adoption integrity

| 項目 | 結果 |
|---|---|
| adoption diff 件数 | 2,537(morph 2,414 / syntax 123) |
| before == 現 japanese(適用前) | 一致(不一致 0) |
| after == 現 japanese(適用後) | 一致 2,537 / 不一致 0 |
| **冪等**(反映後 再実行の新規 diff) | **0**(再採用 0) |
| **rollback**(backup の before 逆適用 → pre-hash 復元) | **✓ 一致** |
| post-hash 一致 | ✓ |

### QA4. Reading output integrity

| 項目 | 結果 |
|---|---|
| git diff = **japanese 値のみ**変更 | ✓(非 japanese 変更 0・CRLF/構造/他フィールド完全保持) |
| 変更行 | 2,537 追加 / 2,537 削除(= japanese 行のみ) |
| reading 破損(undefined/もの 欠け 等) | 0 |

---

## 4. Rollback 保証(三重)

- **adoption diff / backup**: 全変更の before を保持(逆適用で pre-hash `54d9f28…` へ復元・検証済)。
- **git**: bible_data 252 ファイルの変更履歴(git revert 可能)。
- **Editorial 台帳**: 採用判断の根拠(M-12・source=editorial-review)を永続保存。

---

## 5. 完了条件

| 完了条件 | 充足 |
|---|---|
| bible_data.japanese が採用済み Reading Japanese になる | ✓ 固定点 2,537 反映(私たち/彼ら/〜するもの/これ 等) |
| 変更根拠が全件 adoption diff に存在 | ✓ diff 2,537・before/after/source/reason |
| 反映対象以外が変更されない | ✓ japanese 値のみ 2,537・非 japanese 変更 0・動詞屈折/他不変 |
| Pending 情報が混入しない | ✓ Pending verse は反映せず(A 分類 Accepted のみ) |
| 推論追加がない | ✓ 機械適用(before 一致 → after 置換)のみ |
| rollback 可能 | ✓ 三重(diff/git/台帳)・pre-hash 復元検証済 |
| L-0〜M-14 と矛盾しない | ✓ 固定点のみ・責務境界(Data/Engine/Builder)・engine 非改変 |

---

## 6. 変更ファイル一覧(M-15)

| ファイル | 変更 |
|---|---|
| public/bible_data/nt/**(252 ファイル) | japanese 値 2,537 反映(固定点のみ) |
| public/core/reading-japanese-builder.js | **_stem の もの 誤除去バグ修正**(〜するもの→〜するも を防止・別途 QA 記録) |
| scripts/re-phase1/2/3・re-stageA/B・re-m8d | **corpus-aggregate baseline を反映後値へ再 baseline**(旧値はコメント保存・削除しない) |
| scripts/exec-adoption-reflection.cjs | 新規(反映実行器) |
| scripts/output/reading-japanese-adoption-diff.json / -backup.json | 新規(diff / backup) |
| public/docs/(data-role-migration-freeze・data-layer-boundary-freeze・本報告) | 新規 |

- **reading-engine.js は非改変**(engine ロジック不変・QA1 で担保)。

---

## 7. 最重要判断

- **bible_data.japanese を Data 代表語から採用済み Reading Japanese の正規値へ移行**した。反映は
  **固定点(代名詞/関係詞/指示詞の数・性・人称)2,537 のみ**で、**動詞屈折は Data 層保持対象外**(engine が
  表示時に動的屈折する責務・屈折済みを Data に戻すと二重屈折=循環)。これで **engine 出力を入力へ戻す
  循環を避け**、L-0 の責務境界を保った。
- **機械適用(before 一致 → after 置換)のみ**で推論を混入させず、**三重 rollback(diff/git/台帳)+ pre-hash
  復元検証**で可逆性を保証した。**変更は japanese 値のみ 2,537**(非 japanese 変更 0・CRLF/構造完全保持)。
- **engine ロジックは非改変**(全 9 スイート Part 1=ALL PASS)。corpus-aggregate baseline のドリフトは
  **reading 移行の期待差分**として before/after を記録し、旧値をコメント保存のうえ再 baseline した。

---

## 凍結(候補)

```
[reading-japanese-adoption-execution-report FROZEN候補 2026-07-22]
反映: 固定点2,537(morph2,414/syntax123)・252ファイル・bible_data.japanese=採用済みReading Japanese正規値へ
発見対応: ①役割移行(japanese=Reading正規値・engine-corpus baselineは反映前歴史) ②固定点のみ(動詞屈折約7,000はData層保持対象外・engine動的屈折)・_stem ものバグ修正
QA1 engineロジック: 全9スイートPart1 ALL PASS(engine非改変)。再baseline後 全9 ALL PASS
QA2 morph coverage(期待差分・旧値コメント保存): morph44,614→44,396 / syntax4,194→4,208 / particle3,015→3,084 / stageA・B・re-m8d179→56
QA3 adoption integrity: diff2,537・before一致・after一致2,537・冪等再実行0・rollback pre-hash復元✓・post-hash✓
QA4 reading output: git diff=japanese値のみ2,537(非japanese変更0・CRLF/構造保持)・破損0
rollback三重: adoption diff(before) + git + Editorial台帳。pre-hash54d9f28→post980cb659
非改変: reading-engine.js。builder.jsは_stem修正のみ。重複0
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結候補(M-15 反映実行: 固定点 2,537 反映・bible_data 正規値移行・4 分類 QA・三重 rollback・_stem 修正・engine 非改変・corpus baseline 再スコープ) |
