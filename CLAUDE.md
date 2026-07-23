# CLAUDE.md

> 対象読者: 未来の Claude Code。
> 目的: **このファイルだけ読めば、コードを書く前にプロジェクトの目的・思想・設計原則を理解できる**こと。
> 言語: 本プロジェクトはドキュメント・コメント・UI すべて日本語が標準。あなたの応答・コメント・コミットメッセージも日本語で書く。

---

## 1. First Principle（最重要原則）

**「聖書がよく分かった」= 原著者の意図がより正確に理解できること。** アプリの成否はこの一点で測る。

この原則から、あらゆる判断を導く：

- **研究は目的ではなく、読むことを助けるための手段。** 統語・形態・語彙の解析（Wallace エンジン等）は読書体験に奉仕する道具であり、それ自体が目的化してはならない。
- **「読むために研究する」という軸を最優先する。** 研究機能の網羅性・精緻さより、読みへの貢献を優先する。
- **これはギリシャ語学習アプリではない。聖書理解を支援するツールである。** 語学教材・文法ドリルの方向へ寄せない。
- **機能追加より、原著者の意図理解への貢献を優先する。** 「できるから足す」のではなく「意図理解に効くか」で判断する。

**なぜこれが第一原則なのか:** 解析エンジンが充実するほど、開発の重心は「研究ツールとしての網羅性・精度」へ自然に引き寄せられる。この原則は、その引力に対する明示的な錨（いかり）である。新機能や改修を検討するとき、まず問うべきは「これは原著者の意図理解＝読みにどう貢献するか」。それを説明できない拡張は、たとえ技術的に可能でも優先度を下げる。

> ### ⚠ 最重要の非矛盾 — この原則を誤読するな
>
> 「原著者の意図理解を助ける」ことと「解釈・意訳・推論を足さない」（§3 L-0）ことは、**矛盾しない。後者が前者の唯一の手段である。**
>
> 読者を原著者の意図へ近づける道は、**ギリシャ語の構造をそのまま読めるようにすること**であって、こちらの読み下し・補完・意訳を差し込むことではない。解釈を足せば、読者に届くべき原著者の声の上に、**こちらの解釈が重なって声を覆い隠す。** それは意図理解を助けるどころか妨げる。
>
> したがって **「意図理解に貢献するから」を口実に、翻訳・推論・語義選択・自然化を正当化してはならない。** もし「読者のためにここを訳した方が親切だ」と感じたら、それはこの原則を破ろうとしている合図である。親切さではなく忠実さを選ぶ。§3 の L-0 境界はこの帰結にすぎない。

---

## 2. Mission

ギリシャ語新約聖書および七十人訳（LXX）を、**原語に触れながら読み進められる**聖書閲覧 Web アプリ。サーバー・ビルド工程を持たない静的構成で、ブラウザ上でそのまま動作する。

中心にあるのは「聖書を読む体験」であり、目指すのは：

> **言語の壁に気づかせない。読書の流れが途切れない。**

4 つの画面で構成される（`index.html` が本体、他は読書を補助する検索ツール）：

- `index.html` — 聖書本文の閲覧（メイン画面）
- `morph-search.html` — 形態論（語形）検索
- `syntax-search.html` — 統語論（文構造）検索
- `search-tool.html` — 統合検索（見出し語・フレーズ・近接・形態素）

**なぜ検索を「補助」と位置づけるか:** 検索3ツールは強力だが、それらは読書体験の従属物である。読書（`index.html`）が主、検索が従、という序列を崩さない。機能拡張時に検索側へ重心が寄るのを防ぐための、意図的な宣言。

---

## 3. Design Philosophy

このプロジェクトの技術的良心は **Reading Japanese**（日本語表示システム）に集約される。正典は [`public/docs/reading-japanese-specification.md`](public/docs/reading-japanese-specification.md)、最上位原則は L-0（`reading-japanese-policy.md`）。

根幹テーゼ：

> **Reading Japanese は「翻訳」ではない。ギリシャ語の構造（数・性・人称・格・指示・語形・節構造）を「読むための」日本語表示である。**

### L-0 境界 — 「しないこと」

これは First Principle の技術的表現である。**破ってはならない：**

- **翻訳しない** — 自然な訳文を目的にしない。
- **推論しない** — referent / discourse を勝手に解決しない。
- **語義を勝手に選ばない** — 例: ἀγαπάω / φιλέω を両方「愛する」とし、対比を暴かない（Semantic は情報提供のみ）。
- **自然な日本語へ整えない** — 語順変更・敬体化をしない。
- **未判定を埋めない** — Unresolved by Design。discourse 依存・非一意なものは現状維持。

**なぜ「しない」を徹底するか:** AI や自動生成は「気を利かせて」意訳・補完してしまう。だがそれは原著者の意図の上に訳者の解釈を重ねる行為であり、First Principle に反する。読者に届けるべきはギリシャ語構造そのものであって、こちらの読み下しではない。**「静寂（何もせず素の値を返す）」を、消極的な失敗ではなく積極的な設計選択として扱う。**

### 貫く原則

- **決定的な事実のみ反映。** 一意性の勾配 **Morph > Syntax > Semantic**。文脈依存・非一意なものは採用しない。
- **断定しない。** 解析器の出力はすべて `candidates[]` 形式。単一の「答え」を返さず、confidence を添える。最終的な表示は UI が決める。
- **Failure Mode = null / 静寂。** 例外・不備は握りつぶして `null` を返し、呼び出し元が従来経路へフォールバックする。壊れても「機能が無いだけ」で、表示は現状維持。
- **自然文生成源は単一。** 日本語の文章を生成するのは ReadingFormatter（`clause-analyzer.js`）ただ一つ。他の層は文章を持ち込まない。
- **設計 → 実装 → 監査 → 凍結。** 完成した層は FROZEN し、基準値（トークン数・一致率）を記録し、変更時は回帰テストへのケース追加を必須とする。

---

## 4. Architecture Overview

**静的サイト。ビルド不要。** `<script>` で各モジュールを読み込み、`window.*`（`SyntaxAnalyzer` / `PhraseAnalyzer` / `App` / `AppBridge` 等）にクラスを露出して連携する。

解析パイプライン（すべて `public/core/` 配下、**DOM / window 非依存の純関数**）：

```
bible_data（decoded tokens）
  └→ syntax-analyzer.js   統語分類・per-token 候補   （syntax-registry.json 参照）
       └→ phrase-analyzer.js   句レベル構造            （phrase-registry.json）
            └→ clause-analyzer.js  節レベル構造 + ReadingFormatter（clause-registry.json）

reading-engine.js（Reading Engine v2）: resolve(token, context?) を 7 フェーズで解決
  Phase 1 morph → 2 syntax → 3 particle → 4 lexicon → 5 semantic → 6 phrase → 7 policy
  補助: reading-context.js（ResolveContext 供給・SSOT） / reading-lexicon.js / reading-projection.js
  統合: reading-japanese-builder.js（verse 単位・決定的 fact のみ採用）
  表示: presentation-policy.js / phrase-renderer.js
```

**なぜ二層（純関数コア + UIモノリス）か:** `core/` を DOM から切り離すことで、Node.js 単体で回帰テストが書ける（`npm run test:re-*`）。解析の正しさを UI から独立して検証できることが、FROZEN 文化を成立させている。UI 本体 `index.html` は約 11,000 行の単一モノリスだが、そこには「配線と表示」だけを置き、判断ロジックはコアへ寄せる方針。

**なぜレジストリ駆動か:** 分類名・スコア値をコードにハードコードせず JSON レジストリ（`syntax-registry.json` 等）から読む。Wallace の統語カテゴリはレジストリに stub を足すだけで拡張でき、エンジンのコードを触らずに済む。

---

## 5. Core Modules

| モジュール | 責務 | 守るべき境界 |
|---|---|---|
| `core/syntax-analyzer.js` | Wallace 統語分類（GGBB 全カテゴリ + 独自 Engine Extensions: Nominal Syntax / Discourse） | 候補のみ返す・断定しない・UI 非依存 |
| `core/phrase-analyzer.js` | syntax の per-token 結果から句レベル構造を構成 | syntax-analyzer を変更しない・registry を読まない・再分類しない |
| `core/clause-analyzer.js` | 節レベル構造 + **ReadingFormatter（唯一の自然文生成源）** | syntax/phrase を import しない・語形コードを露出しない |
| `core/reading-engine.js` | `resolve()` の 7 フェーズ解決エンジン | morph 文字列を自前でパースしない（decoded を使う）・SyntaxAnalyzer を直接呼ばない（context で受ける）・副作用なし |
| `core/reading-context.js` | **ResolveContext の単一供給源（SSOT）** | 日本語生成・語義・表示をしない |
| `core/reading-japanese-builder.js` | verse 単位で決定的 fact のみ採用し読みを確定 | 判定・推論をしない・engine を変更しない |
| `core/reading-lexicon.js` | 語彙データの保持と lookup のみ | 語義選択（文脈判断）をしない・fetch しない |
| `core/reading-projection.js` | 解析結果を StudyPanel 用に整理する読み取り専用射影 | 日本語文章・説明・HTML を持ち込まない |
| `core/presentation-policy.js` / `phrase-renderer.js` | 生成済み日本語を**変えずに**表示整形するだけ | 意味・語義・構造判断をしない |
| `index.html` | UI 本体（3 階層: 本文 → 節パネル → 単語詳細） | 判断ロジックはコアへ寄せる |
| `assets/js/app-storage.js` | ユーザーデータ永続化（ブックマーク・メモ・履歴、localStorage） | ソフトデリート方式を保つ |
| `css/tokens.css` | デザイントークン（全スタイルの唯一のソース） | ここ以外でトークン値を定義しない |

**注意:** `syntax-analyzer.js` はヘッダで「依存: morph-decoder.js」と記すが、`decodeMorph` は現状 `index.html` にインライン定義されている（core への切り出しは未完）。

---

## 6. Data Principles

- **データとコードを分離する。** runtime データは `public/assets/data/`、設計文書は `public/docs/`、本文データは `bible_data/` / `translations/` / `morph-index/`。
- **`assets/data/` を直接編集しない。** 必ず `scripts/` 経由で生成する（`npm run build:*`）。**なぜ:** アドホックな手編集は再現性を失わせる。データは常に再生成可能でなければならない。
- **`bible_data.japanese` = 採用済み Reading Japanese の単一正規値。** 反映するのは「固定点」（代名詞・関係詞・指示詞の数/性/人称 = engine 再処理後も値が変わらない語形）のみ。**動詞屈折は Data 層に固定せず、engine が表示時に動的生成する。** 原文 Data は不変。旧値は adoption diff / git / Editorial 台帳で保持し、`japanese_old/new` を持たせない。
- **Reading Hint は Editorial Asset。** `reading-hints.json` は編集済みの静的資産であり、**runtime に AI 推論・生成を一切持たない。** read-only 参照、`focusLemmaId`（不変アンカー）、status/version 管理。
- **生成物と一次情報を分ける。** 再生成可能なもの（レジストリ、監査出力）と保全必須のもの（Editorial Asset、rollback 台帳、回帰 baseline）を混同しない。
- **辞書は Abbott-Smith ベースの再構成データ**（`abbott-smith.tsv`）。日本語部分は人手翻訳と AI 補助の抄訳を含む。コードとデータでライセンスが異なる（`docs/LICENSE.md` / `docs/DATA_LICENSE.md`）。

---

## 7. Reading Engine Principles

`resolve(token, context?) → ResolveResult | null` が中核 API。`null` = 改善なし → 呼び出し元が `token.japanese` へフォールバック。

7 フェーズ（source 列挙値）：`morph`（形態）→ `syntax`（統語構造）→ `particle`（助詞）→ `lexicon`（語彙）→ `semantic`（文脈依存の多義語 = 情報提供のみ）→ `phrase`（句レンダリング）→ `policy`（Wallace 分類）。

**設計原則（reading-engine.js ヘッダ）:**
- morph 文字列を自前でパースしない — `decoded` フィールドを直接使う。
- SyntaxAnalyzer を直接呼ばない — 解析結果を `context` で受け取る。
- 副作用なし。例外は `null` で吸収する。
- 表示責務は呼び出し元が持つ（engine は生の値を返し、`presentation-policy.js` / `phrase-renderer.js` が整形する）。

**FROZEN プロトコル（最重要の運用規律）:**
各層は完成時にヘッダへ `[FROZEN 日付]` と基準値（例: NT 137,741 tokens / morph 44,591 / 悪化ケース 0）を記録している。**この層のロジックを変更するときは：**
1. 対応する回帰テスト（`scripts/re-*.cjs`）へケースを追加する。
2. `npm run test:re-*` を全 PASS させる。
3. 基準値を割らない。とくに `reading-context.js` はバイト等価が絶対上位で、崩れる語は per-token build fallback に落とす。

**なぜここまで厳格か:** Reading Japanese はコーパス全体（NT だけで 13 万トークン超）に一括適用される。1 つのロジック変更が数千箇所の表示を静かに変えうる。基準値と回帰テストは、その見えない波及を可視化する唯一の手段。**リグレッションは絶対悪として扱う。**

---

## 8. UI/UX Principles

- **「静かな読書体験」を志向する。** 情報密度・余白・強調の重ね掛けを抑える。すべてのスタイル値は `css/tokens.css`（タイポ 6 段階・角丸 3 段階・不透明度 4 段階・単一アクセントカラー・easing 1 種）を唯一のソースとする。
- **StudyPanel は「読書支援パネル」であり研究ツールではない。** 文法情報は「なぜそのように読めるか」の根拠としてのみ提示する。
- **3 階層 + 単純な戻る。** 本文 → 節パネル → 単語詳細。「戻る」は常に 1 つ上の階層を閉じるだけ。**なぜ:** 読書の流れを止めないため、操作モデルを最小に保つ。
- **三つの家（責務分離）:** **Reading（読む）** / **Word（調べる = StudyPanel）** / **Passage（研究 = 別 View）**。読む面は上、分析面は下。
- **読む面に露出させないもの:** 分類ラベル・confidence 数値・語形コード・生マーカー。Guard Rule（`assertReadingTextSafe`）が漏洩を検出して throw する。**なぜ:** これらは研究の道具であって、読書の声を濁らせてはならない（First Principle）。
- **状態は URL で共有・復元する**（書籍・章・節・StudyPanel・選択語・検索条件）。
- **メモ削除はソフトデリート**（ゴミ箱 → 復元 / 完全削除）。
- **UI は監査駆動で磨く。** `docs/development/` の silence / density / attention / interaction 系 audit のように、実装前後に監査文書を書き、それに照らして削る。

---

## 9. Development Rules

- **ワークフロー: 設計 → 実装 → 監査 → 凍結。** ファイル名も `*-design.md` → `*-implementation-plan.md` → `*-implementation-report.md` → `*-audit.md` → `*-freeze-audit.md` と揃える。
- **実装前ワークフローは [`docs/ai-workflow.md`](docs/ai-workflow.md) に従う（早走り禁止）。** 実装判断を伴う作業では、Claude は**自律的に G1（価値）→ G2（忠実性）→ G3（技術）を完了してから実装へ進む**。「直して」「対応して」「全部やって」等の曖昧・広範な依頼は**それ自体が実装の許可ではない**。まず依頼を Value Brief へ言い換えて G1 を開始し、Change Plan と Validation Criteria を確定してから bible_data・コードに触れる。ゲート通過は自律的に行ってよい（各段で人間の承認を挟む必要はない）が、**未通過のまま実装へ入らない**。
- **監査は「監査・提案のみ、移動/削除しない」を明記して始める。** 急いで削除・大規模変更を提案しない。
- **変更は機械適用 + 三重 rollback**（diff / git / 台帳）。before 一致 → after 置換で、engine ロジックは非改変を保つ。
- **ディレクトリ責務を守る**（`docs/architecture-rules.md`）:
  - UI（HTML）にビジネスロジックを書かない。
  - `core/` は DOM / window に依存しない（Node 単体で動く純関数）。
  - `assets/data/` を直接編集しない（`scripts/` 経由のみ）。
  - `scripts/` を本番 UI から参照しない。
- **旧パス禁止（自動強制）:** ルート直下の旧ディレクトリ（旧 `data` / `js` / `index` / `lexicon`）への参照は pre-commit hook（`scripts/path-audit.js`）と CI（`.github/workflows/path-check.yml`）がブロックする。移行先はそれぞれ `assets/data` / `core`・`assets/js` / `assets/data/index` / `assets/data/lexicon`。
- **概念データを編集したら `node scripts/concept-audit.cjs` を必ず実行**（FAIL で exit 1）。
- **ロードマップの単一ソースは `assets/data/roadmap.json`。** README・アプリ内表示はそれを反映するだけ。編集は roadmap.json のみ。
- **確認ゲートは最小限に。** 完了報告は続けるが、確認を挟むのは本当に判断が必要なときだけ（フェーズを 1 つ進めるたびに確認しない）。※ これは*人間への確認*の頻度を指すものであり、上記**実装前ゲート G1-G3 を省略できる意味ではない**（設計ゲートは自律的に必ず通す）。
- **原語表記の原則:** 読書メモの入口は日本語。ギリシャ語は未特定の語への指さしとしてのみ、常に「日本語（ギリシャ語）」の形式で添える。
- **未解決の構成不整合（着手前に確認）:** `docs/README.md` と `architecture-rules.md` は `pages/index.html` 前提で書かれ、`index.html` 内の参照も `../core/` 等の 1 階層上を指すが、実体は `public/index.html`（`pages/` は未実在）。設計文書のパス（`docs/xxx.md`）と実体（`public/docs/xxx.md`）にもズレがある。Pre-Release のファイル再編途中。**パスに触れる作業の前に、現構造を正とするか `pages/` 目標構造へ寄せるかをユーザーに確認する。**

---

## 10. Things Never To Break

1. **L-0 境界** — 翻訳 / 推論 / 語義選択 / 自然化 / 未判定補完をしない（§3）。すべての上位。
2. **FROZEN 層** — `reading-engine.js` Phase 1–7 / `reading-context.js` Stage D / `presentation-policy.js` Stage C-P1 / `phrase-renderer.js` Stage A / `morph-rule-engine-v1`。基準値を割らず、変更時は回帰テスト追加 + 全 PASS。
3. **自然文生成源の単一性** — ReadingFormatter 以外で日本語文章を生成しない。
4. **ResolveContext の SSOT** — `reading-context.js` を唯一の Context 供給源とする。
5. **ディレクトリ責務境界** — `core/` は DOM 非依存、`assets/data/` は直接編集禁止、`scripts/` は本番から参照禁止（§9）。
6. **旧パス禁止** — pre-commit / CI が強制。
7. **runtime データの fetch パス** — `assets/data/*.json` の移動は fetch を壊す。
8. **回帰 baseline**（`scripts/output/re-phase*-audit.json`）の移動・gitignore 不可。
9. **`bible_data` の原文 Data 不変** — 固定点以外を Data 層へ書き込まない（とくに動詞屈折）。
10. **`css/tokens.css` の単一性** — トークン値をここ以外で定義しない。

---

## 11. Future Roadmap

単一ソース: [`public/assets/data/roadmap.json`](public/assets/data/roadmap.json)（アプリ内 ℹ️ → ロードマップからも確認可）。

- **テキストと辞書**（読みを支える言語データの充実）
  - 日本語訳の追加（新改訳2017・聖書協会共同訳など現代語訳）
  - ヘブライ語聖書への対応（旧約を読解フローで読む）
  - 辞書の拡充（読書中の引っかかりを減らす形で）
- **読書体験**（読む流れを止めない一体感のある画面へ）
  - 画面を分けずに読む（本文・検索・調べるの統合）
  - 読んでいた場所への即時復帰
- **記録と持ち出し**（読書の痕跡を残し持ち出せるように）
  - メモのつながり（タグでなく「参照関係」としての最小接続）
  - 読書記録のエクスポート

**優先順位の判断基準は §1 に従う:** どの項目も「機能として面白いか」ではなく「原著者の意図理解＝読みにどう貢献するか」で優先度を決める。

**現在フェーズ: Pre-Release。** 基本読書・検索・URL 共有は動作。データ出典明記とライセンス整理、ファイル/ドキュメント構成の整理が進行中。
