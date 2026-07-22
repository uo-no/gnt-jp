# Context Layer 設計正典（Stage D）

作成: 2026-07-18
位置づけ: Reading Engine 次期ロードマップ Stage D の設計書。
扱うのは **文脈情報(Context)の一元管理**であり、日本語の生成・語義・表示は扱わない。

---

## 0. 責務宣言

> **Context Layer は、節の文脈情報(構造情報)を一元的に生成・キャッシュし、
> Engine・Presentation・Phrase Renderer が消費する ResolveContext を供給する層である。
> 日本語の生成・語義判断・表示整形・冠詞処理は一切行わない。**

## 1. Context Layer の責務

| 責務 | 内容 |
|---|---|
| **ResolveContext の生成** | `{ tokens, targetIdx, phrases, hasPassiveVerb, mainVerb, clause }` を組み立てる。現 `_buildReadingContext` の出力契約と**完全に同一**の形 |
| **節スコープ情報のキャッシュ** | `phrases` / `genitivePhrases` / `hasPassiveVerb` / `clauses`(全節リスト)を節につき 1 回だけ計算し保持する(節内全語で共有) |
| **語スコープ情報の供給** | `mainVerb` / `clause`(targetIdx 依存)を、所属節から復元して供給する |

Context Layer は `ContextBuilder.build()` の**呼び出し元**であり、build の内部・出力仕様には触れない。build から得た純粋データを整理・キャッシュ・供給するだけ。

## 2. 変更禁止

以下は Stage D の対象外・変更禁止:

- **Reading Engine**(語義決定・resolve チェーン)
- **Semantic Layer**(idiom / prepDomain / lnGloss)
- **Presentation Policy**(PP 表示・括弧化)
- **Reading Japanese の生成**
- **ContextBuilder の出力仕様**(syntax-analyzer.js — build の入出力に触れない)
- **冠詞処理**(現状維持。冠詞は構造情報として `tokens` に保持され、Context Layer は素通しする。削除・統合・非表示化しない)
- **Flow Renderer の表示ルール**(Stage B/C の chip 生成・Tier 分岐)

## 3. 出力契約(バイト等価)

- **ResolveContext は現 `_buildReadingContext(words, idx)` の出力とバイト等価**である。
  全 NT トークン(137,741)で JSON 完全一致を機械照合する(④監査)。
- **Engine・Presentation・Phrase Renderer から見た入力は 1 バイトも変わらない**。
  各消費者のコードは無変更。Context の「作り方」だけが変わり、「渡されるもの」は不変。

## 4. 最適化(節スコープ計算の 1 回統合)

### 実測で確定した構造(全 NT・2026-07-18)

| 量 | スコープ | 実測 |
|---|---|---|
| `phrases` / `genitivePhrases` | 節スコープ | 節内全語で **100% 同一** |
| `clauses`(全節リスト) | 節スコープ | build(idx=0) が節全体を保持 |
| `clause.index` | — | range 検索(`clauses.findIndex(c=> k∈[c.start,c.end])`)と **100% 一致** |
| `clause` / `mainVerb` | 語スコープ | 所属節の**代表 build**(節 start で 1 回)から range 内トークンで **100% バイト一致** |
| range 外トークン | — | 全体の 0.02%。所属節が特定できない語 |

### 最適化の方針

1. 節につき代表トークン(各節の start)で `build` を呼び、`phrases`(節スコープ)と
   各節の `clause` / `mainVerb`(語スコープ)を取得する
2. 各語は所属節を `clauses` の range 検索で特定し、その節の代表 build 結果から
   `clause` / `mainVerb` を復元する
3. **range 外トークン(0.02%)は per-token build にフォールバック**(安全側。
   バイト等価を無条件に保証)
4. 結果を節キャッシュに保存し、複数の消費経路(Engine 経路・Phrase 引用経路・
   chip クリック経路)が**同一キャッシュを共有**する

### 効果

- `build` 呼び出しを **節あたり n 回 → 節数 C 回 + range 外語数** へ削減
  (現状の per-token 全語 build による節スコープ反復計算 O(n²) の解消)
- 経路間の重複 build の排除(Phrase 引用経路が Engine 経路のキャッシュを共有)
- Context 生成ロジックの 1 箇所への集約

> 注: C(節数)は実測で小さいが、最悪 C=O(n) では O(n²) に退化しうる。
> 現実の NT では章平均で十分小さく、Stage B 実測(章 7.7ms)からの回帰は
> ⑥実表示監査の性能計測で確認する。**最適化は目的だが、バイト等価が絶対上位**。
> いかなる語でも等価が崩れるなら per-token build フォールバックを優先する。

## 5. 責務境界(Context Layer と各層)

| 層 | 持つ責務 | 持たない責務 |
|---|---|---|
| **Context Layer** | 構造情報の生成・キャッシュ・ResolveContext 供給 | 日本語生成・語義・表示・冠詞処理 |
| **Reading Engine** | ResolveContext を読んで Reading Japanese を決定(semantic→syntax→morph→particle) | Context の作り方(注入されるだけ) |
| **Presentation Policy** | Engine 出力の表示整形(PP 括弧化) | Context 生成・日本語決定 |
| **Phrase Renderer** | 句引用の整形(Engine 出力を並べる) | Context 生成・日本語決定 |

境界の要点:
- **Context Layer は「何が文脈か」だけを扱い、「その文脈で日本語をどう決めるか」は
  Engine の責務**。Context Layer は resolve を呼ばない(Engine が Context を受け取る側)。
- Presentation / Phrase Renderer は Engine 出力の下流であり、Context Layer とは
  直接やりとりしない(Context は Engine への入力としてのみ流れる)。

## 6. 将来課題(Stage D 対象外)

- **経路 B(Wallace/projection)との統合**: `_getWallaceClauseAnalysis` は
  `SyntaxAnalyzer.analyzeAll` + projection 生成を含む非同期経路。Context Layer が
  同じ `clauses` / `phrases` を供給できれば共通化の余地があるが、非同期・
  projection 生成の責務分離が必要なため将来 Stage に残す
- **Wallace projection 経路の共通化**: Phrase Reading / Observation が使う
  `ReadingSupportProjection` の Context 供給を Context Layer に寄せる検討

## 7. 検証で担保する不変条件(実装時)

- ResolveContext が現 `_buildReadingContext` と**全 NT トークンでバイト等価**
- 全既存回帰(re-phase1〜5 / re-stageA / re-stageB)PASS 維持
- chip⇔panel 一致率 100% / P1 括弧化 4,244 件 不変 / 破損形 0 不変
- **［冠詞］表示件数 不変**(冠詞非介入の証明)
- 章レンダリング相当の性能が Stage B(章 7.7ms)から悪化しない

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-18 | 初版(Stage D 設計。責務境界・バイト等価・節スコープ 1 回計算) |
