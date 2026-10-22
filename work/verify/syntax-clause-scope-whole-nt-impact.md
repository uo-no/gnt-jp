# 節スコープ修正：新約全体の影響検証

更新日: 2026-10-22

## 確認できた範囲

- `syntax-registry.json` の全登録型を検索した結果、`clause_is_narrative()` を使用する型は `verb.perfect_dramatic` の1件。
- したがって、今回の修正で候補スコアが直接変わり得る範囲は、完了形トークンに対する構文候補評価である。
- 対照テスト `scripts/syntax-clause-narrative-scope-regression.cjs` は、別節の過去直説法を無視し、対象節内の過去直説法を検出することを検証する。
- 全新約の比較スクリプト `scripts/syntax-clause-scope-compare.cjs` を追加した。PR のベース版と修正版の解析器を同じレジストリ・同じ本文データで実行し、完了形トークンごとの候補集合、スコア、順位の差分を JSON レポートに記録する。27巻・260章・全トークン／全節を読み込み、影響対象となる完了形トークンを比較する。

## 検証状態

- [x] 影響を受けるレジストリ型を全件検索
- [x] 節内／節外の単体回帰テストを用意
- [x] 全新約比較スクリプトを追加
- [x] PR の CI に比較処理と artifact 出力を追加
- [x] GitHub Actions の単体テスト結果を確認（節スコープ対照3件 PASS）
- [x] 全新約比較レポートを取得し、変更件数・候補順位・スコアを確認
- [ ] 影響例を文脈でレビューして、修正が意図どおりか判断

## 解釈上の注意

この比較は全新約を走査しますが、すべての構文ラベルを再評価するものではありません。`clause_is_narrative()` を使う型が `verb.perfect_dramatic` の1件だけであることを根拠に、完了形トークンを影響対象として絞っています。比較レポートを確認するまでは、修正による影響件数や順位変化がゼロ／正当と断定しません。

また、これは回帰影響の測定であり、`verb.perfect_dramatic` の言語学的な適合率・再現率を評価するものではありません。


## 2026-10-22 追加調査：CI 初回失敗と修正

- 既存の VR-5 Regression Gate run `39779734575` では、節スコープ単体テストは3件とも PASS。
- 全新約比較は、ベース版解析器の読み込み時に `SyntaxError: Invalid or unexpected token` で停止。原因は VM ラッパー文字列に改行文字そのものではなく `\\n` が渡っていたこと。
- 比較スクリプトの読み込み方式を見直し、解析器が持つ CommonJS export を Node のネイティブ `require()` で読む方式に変更（コミット `8af03ceb6e46d1d9afdc6915997784a2821f7067`）。
- この修正コミットに対する新しい Actions run は、現時点で API 上確認できていない。したがって、修正後の比較が完走したとはまだ扱わない。
- マージ判断は保留。修正後 CI の完走と JSON レポート確認を必須条件とする。


## 2026-10-22: main 起点での検証やり直し

先行ブランチでは、CI の全新約比較が古い VM ラッパー実装を実行し、ベース版解析器の読み込み時に `SyntaxError: Invalid or unexpected token` で停止した。ブランチが main から1コミット遅れて競合状態になったため、最新 main を起点に新しいブランチ `fix/clause-narrative-scope-v2` を作り直し、変更を移植した。

- 解析器読み込み: Node のネイティブ CommonJS `require()` を使用し、ソース文字列のラッパー実行を廃止。
- 節スコープ修正と単体回帰テストを再適用。
- CI に PR base の解析器取得、単体テスト、全新約比較、レポート artifact 出力を追加。
- 次の必須確認: 新PRのCIが新しいheadで走り、比較処理が完走すること。レポートの変更件数・例を確認するまでは、影響評価を完了としない。


## 全新約比較結果（CI run 39782139553）

- [VR-5 Regression Gate](https://github.com/uo-no/gnt-jp/actions/runs/39782139553) は全工程 PASS。節スコープ単体テスト、全新約比較、既存 Flow DOM、Stage B、パス監査、apparatus の回帰テスト・再現性確認を通過。
- 本文走査: 27巻、260章、137,741トークン、7,939節。
- 比較した完了形トークン: 1,572。
- 候補集合の増減: 0件追加・0件削除。
- スコア変化: 311対象（19.8%）。順位変化も311対象。
- 変更箇所は全て `verb.perfect_dramatic` のスコア低下で、35.15 → 20.15（-15）。他の候補のスコアは変化せず、並び順のみが相対的に変わる。
- 影響例はマタイ26、マルコ22、ルカ30、ヨハネ90、使徒28、ローマ12、第一コリント19、第二コリント14、ヘブル14、第一ヨハネ16、黙示録18など、計21巻に分布。ヨハネ福音書が90件と最多。
- これは、同一聖句内の別節にある過去直説法が原因で「劇的完了形」の候補が加点されていた対象から、その加点を除いた結果と整合する。例: マタ2:5 `γέγραπται` は `verb.perfect_dramatic` が7位・35.15から候補38位相当・20.15へ低下。
- ただし、311件全てが言語学的に正しい修正かは、節分割の品質と各文脈の確認を含むレビューが必要。自動比較のみを根拠に即時マージしない。
- 追加した厳格な比較アサーションも [CI run 39782380233](https://github.com/uo-no/gnt-jp/actions/runs/39782380233) で PASS。311件すべての変更例をレポートに保存し、各例で `verb.perfect_dramatic` の -15 以外のスコア差分がないこと、候補追加・削除がないことを機械検証した。
- [全311件の比較レポート artifact](https://github.com/uo-no/gnt-jp/actions/runs/39782380233)（Artifacts: `syntax-clause-scope-compare-report`）。

## 2026-10-22: 全新約比較結果（CI run 39782139553）

- CI: [VR-5 Regression Gate](https://github.com/uo-no/gnt-jp/actions/runs/39782139553) PASS。節スコープ対照3件、全新約比較、VR-5-H-7、NT 全巻バイト等価、旧パス監査、装置データ／日本語注釈回帰、装置ビルド再現性の各ステップが成功。
- コーパス走査: 27巻・260章・137,741トークン・7,939節。
- 比較対象: 完了形 1,572 トークン。
- 差分: 311 対象で候補スコアと順位が変化。候補追加 0、候補削除 0。候補集合を維持したままのスコア／順位差分。
- 書巻別の変更数: MAT 26、MRK 22、LUK 30、JHN 90、ACT 28、ROM 12、1CO 19、2CO 14、GAL 6、PHP 2、COL 3、1TH 2、2TH 1、1TI 1、2TI 3、PHM 1、HEB 14、JAS 2、1JN 16、2JN 1、REV 18。EPH、TIT、1PE、2PE、3JN、JUD は 0。
- 例: MAT 2:5 `γέγραπται` の `verb.perfect_dramatic` は score 35.15 / rank 7 から score 20.15 / rank 38 に低下。MAT 4:4、MAT 4:7 でも同様の変化。
- レポート artifact: `syntax-clause-scope-compare-report`（artifact ID `12426064318`）。

### 判定（暫定）

単体テストと全新約の技術的比較は完走した。ただし、311件でスコア・順位が変わったため「影響なし」ではない。特に `verb.perfect_dramatic` の候補スコア低下が、誤発火の除去なのか、節をまたぐ物語文脈を必要とする正当な候補の過剰抑制なのかを、前後文脈と Wallace の説明に照らしてレビューする必要がある。完了形の候補自体は追加・削除されていないが、順位低下により UI 上で見つけにくくなる可能性がある。

**マージ保留。** まず差分311件の対象節／前後文脈を確認し、`clause_is_narrative` が節内の形態だけを見てよい条件なのか、節内判定と談話文脈判定を分離すべきかを決める。必要なら「節内に過去直説法がある」チェックと「直前の物語文脈に属する」チェックを別々に設計する。


## 影響例の文脈スポットレビュー

全311件のうち、書巻・文脈の異なる代表例を本文トークン列で確認した。これは全件の学術的な人手判定ではなく、スコープ修正が狙いどおりの型の例に作用しているかを見る初回レビュー。

- **マタ2:5 — `γέγραπται`**: 同じ節より前にある `εἶπαν`（2:5!3）は「彼らが言った」に属し、対象の「預言者を通して書かれている」（!11）とは句の区切りがある。別節のアオリストによる劇的完了形の加点を除くのは妥当な方向。
- **ヨハ1:3 — `γέγονεν`**: 直前の `ἐγένετο` 2回は「すべてのものが生じた」の節に属し、対象語は後続の関係節 `ὃ γέγονεν` にある。前の節の過去形で対象節を物語的と判定しない修正と整合する。
- **ロマ4:17 — `γέγραπται`**: 対象の「書かれている」に対し、後続の `ἐπίστευσεν` は `κατέναντι οὗ` の節にある。別節のアオリストを根拠に対象の完了形を劇的用法と加点しない方向は整合的。
- **黙2:2 — `Οἶδα`**: 「わたしは知っている」の後に続く `ἐπείρασας`、`εὗρες` はエペソの教会についての別の行為記述であり、これらのアオリストを冒頭の完了形の物語性判定に流用しないのは妥当な方向。

### 残るレビュー

- [x] 全新約比較を実行し、311件の変更例を保存
- [x] 代表4例で、節スコープ修正の意図と本文の構造が整合することを確認
- [ ] 全311件の文脈を人手で精査
- [ ] `ContextBuilder` の節境界が、談話・従属節・引用などで過不足なく切れているかを独立評価
- [ ] PR #232 の最終CI結果を確認してからマージ可否を判断

## 2026-10-22: 完全差分リストの再検証（CI run 39782659670）

- 更新後の比較スクリプトで変更例を上限なしで保存し直した。全311件が JSON レポートに含まれることを確認。
- 311件すべて、差分は `verb.perfect_dramatic` のスコア `-15` のみ。候補追加・削除はなく、311件すべてで順位も変化した。
- 書巻別の件数合計は311で、全新約の集計と一致。変更例リストの欠落は解消した。
- 最新の全差分 artifact: `syntax-clause-scope-compare-report`（artifact ID `12426669550`）。
- CI の該当比較ステップは PASS。VR-5 全体の残りのステップも実行中／完了確認を継続する。

### 次のレビュー単位

311件を一括して「誤発火」と見なさない。各参照について、対象節の形態・前後の節・談話が物語叙述か発話／論証かを確認し、Wallace の完了形用法区分と照合する。`verb.perfect_dramatic` の定義が「同じ節に過去直説法があること」なのか「物語文脈における完了形」なのかを分け、後者なら節ローカルな形態条件だけで落とさず、談話文脈を独立した証拠として扱う。レビュー完了までは PR をマージしない。
## 2026-10-22: Wallace 引用例を回帰センチネル化

- レジストリ自身が `verb.perfect_dramatic` の Wallace 引用例として指定する JHN 1:15 `κέκραγεν λέγων` が、311件の差分に含まれることを確認した。
- ベース版では `κέκραγεν` の `verb.perfect_dramatic` は score 35.15 / rank 5、節スコープ版では score 20.15 / rank 38。候補は残るが、順位が大きく下がる。同節の `γέγονεν` も同様に影響する。
- これは重要な反例候補である。JHN 1:15 はレジストリが明示的に参照する用例なのに、同節内の過去直説法の有無だけでは「劇的完了」を判定できない可能性がある。単純な節内限定をそのまま正解とはみなせない。
- 比較スクリプトにセンチネル検査を追加し、全差分に前後の章トークンが付くこと、JHN 1:15 `κέκραγεν` が差分レポートに残ること、旧・新両方で候補が消えていないことを必須化した。スコア低下の妥当性を承認するテストではない。

### 設計判断

`clause_is_narrative` は名称上「物語文脈」を判定するが、実装は過去直説法形態の存在を代理指標としている。旧実装は同じ節内の別の行為から誤加点し得る一方、節内限定は談話文脈を捉え損ねる可能性がある。従って、次の段階ではこの二者択一を避け、

1. 節内の過去直説法（形態的観察）
2. 文脈が物語叙述かどうか（談話的解釈）

を別々の証拠として管理する。談話注釈がない現状では、自動判定の確度を高く見せず、候補表示は暫定的な低確度に留める。JHN 1:15 を含む311件の文脈レビューが終わるまではマージしない。

## 2026-10-22: Wallace example counterexample

- The registry entry verb.perfect_dramatic cites Wallace Perfect (p.578) and explicitly uses JHN 1:15 κέκραγεν λέγων as its example.
- The whole-NT report lowers the score of JHN 1:15 κέκραγεν by 15 points. Its context includes μαρτυρεῖ and the following quoted clause with ἦν and εἶπον, but the target clause itself has no past indicative; the clause-only condition therefore removes the narrative-context bonus from the registry's own example.
- This shows the issue cannot be treated as simply removing false positives from other clauses. A canonical example based on Wallace is not detected by clause-local morphology alone.
- Do not merge the current clause-only implementation. clause_is_narrative likely represents a discourse-context cue, not a strictly syntactic condition. Separate clause-local morphological evidence from cross-clause narrative-context evidence, and do not treat the mere presence of a past form in another clause as a definitive semantic classification.
- The existing verse_has_past_indicative() handler is also used as a narrative-context cue for historical present. Scope should therefore be decided per signal and label, in light of its meaning, Wallace, and registered examples—not by applying a universal clause-only rule.


## 2026-10-22: 重み分離案の全新約検証（PR #233）

- CI: [VR-5 Regression Gate](https://github.com/uo-no/gnt-jp/actions/runs/39787094945) PASS。節内／聖句内の手掛かりを分離する回帰テストを含む。
- 全新約27巻・260章・137,741トークン・7,939節を走査し、完了形1,572対象を比較。
- 311対象でスコア／順位が変化。候補追加0、候補削除0。全311件で `verb.perfect_dramatic` のスコア差は -10。その他の候補の直接スコアは変化しておらず、順位の変化はこの候補が下がったことによる相対的な並び替え。
- 全311件の文脈窓をレポートに含め、欠落がないことを確認。JHN 1:15 `κέκραγεν` は候補として維持され、35.15点／5位から25.15点／18位に変化。
- レポート artifact ID `12429387092`。全体の技術ゲートは通過したが、これは311件の意味的正しさを保証しない。特に順位が18位まで下がる代表例は、UI上で利用者が見つけにくくなるリスクを別途評価する。
- テストフィクスチャも見直し、節内手掛かりテストの対象トークンが実際にその節内に含まれる形に修正した。

### 暫定評価

節内形態を強い手掛かり、聖句内の別節の過去形を弱い手掛かりとして分離できた点は、単純な節限定より妥当。ただし「+15 / +5」は校正済み確率ではなく候補順位用のヒューリスティック値である。PR #233 はレビュー用として保持し、全311件の文脈レビューと UI での順位・説明の妥当性確認が済むまでマージしない。
