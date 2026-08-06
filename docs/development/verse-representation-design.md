# Verse Representation Architecture 設計正典（Phase VR-1）

作成: 2026-08-04
位置づけ: 本文表示モード（翻訳 / 語順フロー / 構文ツリー）を単一の Renderer 基盤へ
統合するための設計書。[`docs/development/flow-rendering.md`](flow-rendering.md)（Stage B）
と対をなし、その責務境界（「Flow Renderer は日本語を生成しない」）を継承・一般化する。
先行監査: 本フェーズ着手前に実施した語順フロー基盤アーキテクチャ監査（2026-08-04、コード変更なし）。
本フェーズも**コード変更を行わない。設計仕様のみ。**

---

## 0. 責務宣言（本書の最上位規範）

> **Representation は「意味の決定」と「表示」を切り離す境界である。
> Analysis が確定した事実を、Renderer が解釈し直すことなくそのまま渡すための
> 唯一の受け渡し契約（Interface Contract）である。**

| 層 | 決めるもの | 決めてはいけないもの |
|---|---|---|
| **Analysis（Reading Engine 他・FROZEN）** | 日本語の決定・構文構造の読み取り — 唯一の SSOT | 表示形式・色・DOM |
| **Representation（本書が新設）** | Analysis の結果を displayMode 別の構造化 JSON に整える | 新しい意味判断・日本語の言い換え |
| **Renderer（本書が新設）** | Representation を HTML/SVG に描画する | 意味判断・Representation の再解釈・Analysis への直接アクセス |

先行監査で確認済みの通り、現行実装は「Analysis → Renderer」の間に受け渡し契約が存在せず、
`_wordToFlowChip()` が両者を兼ねる形で個々の呼び出し元へ直接値を返している。
本設計は、この間に **Representation という中間層**を明示的に挟むことが核心である。

---

## A. Architecture（全体アーキテクチャ）

### A-1. パイプライン全体図

```
┌─────────────────────────────────────────────────────────────────┐
│  bible_data/{nt|lxx}/{book}/{ch}.json                             │
│  translations/{transId}/{book}/{ch}.json                          │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ fetch + group by verse
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Verse                                                             │
│  節の同一性（VerseRef）を保証する束。GreekTokens[] と               │
│  TranslationText（transId 別）を「未加工のまま」保持する。            │
└───────────────────────────────┬───────────────────────────────────┘
                                 │
                 ┌───────────────┴────────────────┐
                 │ (Greek 系 DisplayMode のみ)      │ (Translation 系 DisplayMode)
                 ▼                                 │
┌───────────────────────────────┐                  │
│  Analysis Layer                 │                  │
│  Reading Engine resolve()       │                  │
│  + ContextBuilder（phrase/clause）│                  │
│  + bible_data role/frame/referent│                  │
│  読み取り（FROZEN・唯一のSSOT）    │                  │
└───────────────┬─────────────────┘                  │
                 │ AnalysisResult[]                   │ TranslationText（パススルー）
                 ▼                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  Representation Builder（DisplayMode ごとに1つ）                    │
│  buildRepresentation(displayMode, verse, analysis) → Representation │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ Representation（JSON。kind で自己記述）
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Renderer Registry                                                 │
│  RendererRegistry.render(representation)                           │
│    → registry.get(representation.kind).render(representation)      │
└───────────────────────────────┬───────────────────────────────────┘
                                 │
                 ┌───────────────┼────────────────┐
                 ▼                ▼                ▼
      TranslationRenderer  WordOrderRenderer  SyntaxTreeRenderer（将来）
                 │                │                │
                 └────────────────┴────────────────┘
                                 ▼
                        HTML（単一表示・並列表示 共通経路）
```

### A-2. 現行構造との対応

| 本設計の層 | 現行コードでの対応物 | 変更方針 |
|---|---|---|
| Verse | `render()` 内 `elByVerse` / `words`（`index.html:8932-8939`） | 概念を明示化するのみ。既存のグルーピング処理を再利用 |
| Analysis | `readingEngine.resolve()`（FROZEN）+ `_buildReadingContext()`（`index.html:10770`） | **変更しない**。呼び出し方を統一するのみ |
| Representation | **新設**。現行は存在せず、`_wordToFlowChip()` の戻り値が Renderer 相当の関数へ直接渡っている | 新規追加（既存関数の戻り値の形をほぼそのまま契約化できる） |
| Renderer | `render()` 内の HTML 組み立て（左列）/ `_buildFlowTabHTML()` / `_buildGfVerseBlock()` / `_renderFlowTab()` の4実装 | 統合して `TranslationRenderer` / `WordOrderRenderer` の2つ（+将来 `SyntaxTreeRenderer`）に集約 |

### A-3. なぜ「例」の4層構造をそのまま採らないか

依頼の例示（Greek Token → Analysis → Representation → Renderer）は Greek 由来のモード
（語順フロー・構文ツリー）には正確に当てはまるが、**翻訳は Greek Token を経由しない**
（`translations/*.json` は独立した人手翻訳テキストであり、Reading Engine の出力ではない）。
そのため本設計では起点を「Greek Token」ではなく **「Verse」** に引き上げ、Analysis を
「Greek 系 DisplayMode にのみ適用される層」として分岐させる。これにより Translation
Representation は Analysis を経由せず Verse から直接構築される（後述 B・C）。

---

## B. Layer Design（各Layerの責務）

| | **Verse** | **Analysis** | **Representation** | **Renderer** |
|---|---|---|---|---|
| **入力** | book / chapter / verse（+ corpus） | Verse.tokens（GreekTokens[]） | VerseRef + (AnalysisResult[] または TranslationText) + DisplayMode | Representation（1種類のみ） |
| **出力** | VerseRef と 生データ束（tokens・翻訳文字列） | `AnalysisResult[]`（token単位。`{ japanese, source, confidence, candidates?, syntax? }`） | DisplayMode別JSON（`kind`で自己記述。C章参照） | HTML文字列（将来SVGも） |
| **責務** | 節の同一性を保証する。どの Representation もこの VerseRef を参照点にする | 「この語は何か」を決定的に確定する唯一のSSOT。Reading Engine FROZEN Phase 1–7 と拡張パターン（`getRelativeSyntax` 等）を束ねる呼び出し窓口 | Analysis / TranslationText を UI 非依存の「表示可能な構造」に変換する。Renderer と Analysis の間の唯一の契約 | Representation を渡された通りに描画するだけ |
| **持ってよい情報** | tokens（生データ、未加工）、ロード済み翻訳文字列（生データ、未加工） | 形態・統語・語彙・意味の決定結果、confidence、候補、bible_data の role/frame/referent を読み取った構造情報 | displayMode固有の構造化情報（chip配列、node/edge構造等）。CSS**クラス名**は可 | 描画に必要な DOM/HTML 生成ロジック、CSS クラスの割り当て |
| **持ってはいけない情報** | 日本語の「決定」、構文解析結果、表示用HTML、DisplayMode固有の加工 | 表示色・DOM構造・displayMode固有の見せ方（roleClass や signals の**言葉選び**は Representation Builder 側）、自然文の"整形"（PresentationPolicy の責務のまま） | HTML文字列・DOM操作・**新しい意味判断**（Analysis にない情報をここで推論しない） | 意味判断・japanese の決定・Representation の再解釈・**Analysis への直接アクセス** |

**Analysis が唯一の SSOT であることの担保:** Representation Builder は Analysis が返した
`japanese` 文字列を**書き換えずに転写する**（`docs/development/flow-rendering.md` §0 の
SSOT 保証パターンをそのまま踏襲）。Representation Builder が独自に語形変換・自然化を行う
実装は L-0 境界違反として設計レビュー（G2）で差し戻す。

**Renderer が Analysis を直接読まないことの担保:** Renderer の関数シグネチャは
`render(representation)` の1引数のみを受け取り、`token` / `AnalysisResult` /
`window.App.readingEngine` を一切引数にもクロージャにも持たない。実装フェーズでは
既存の Guard Rule（`assertReadingTextSafe` 等、CLAUDE.md §8）と同じ思想で、
`assertRendererInputIsRepresentation()` のような機械的チェックを設けることを推奨する
（本書は仕様のみのため実装はしない）。

---

## C. Representation Specification

### C-1. DisplayMode 設計

現行の `_transA` / `_transB`（翻訳ID文字列。`TRANSLATIONS.FLOW` という疑似翻訳を含む）を廃止し、
カラムの状態を**タグ付き構造体 `ColumnMode`** に置き換える。

```ts
type ColumnMode =
  | { kind: 'translation', translationId: string }   // 'JJ2017' | 'JA1955' | 'BUN' | ...
  | { kind: 'wordOrder' }
  | { kind: 'syntaxTree' }                            // 将来
```

`kind` は Representation の判別子（discriminator）と一致させる。新改訳2017・口語訳・文語訳は
すべて `kind: 'translation'` で `translationId` だけが異なる — これらは同一の
`TranslationRenderer` を共有する。一方 `wordOrder` / `syntaxTree` は Representation の形状自体が
異なるため別 Renderer を持つ。

**DisplayMode Registry**（UI のモードピッカーが参照する一覧。翻訳一覧 `TRANS_LIST` を置き換える）:

```json
[
  { "kind": "translation", "translationId": "JJ2017", "label": "新改訳2017", "status": "planned" },
  { "kind": "translation", "translationId": "JA1955", "label": "口語訳",     "status": "available" },
  { "kind": "translation", "translationId": "BUN",    "label": "文語訳",     "status": "available" },
  { "kind": "wordOrder",                              "label": "語順フロー", "status": "available" },
  { "kind": "syntaxTree",                             "label": "構文ツリー", "status": "planned" }
]
```

新しい翻訳を追加する場合は配列に1エントリ追加するだけで済み、新しい Representation 種別
（`kind`）を追加する場合のみ Renderer の新規実装が必要になる。**いずれの場合も
`render()` 本体の `if` 分岐は増えない。**（先行監査 問題点1・2 の根治）

### C-2. Translation Representation

翻訳は Greek Token を経由しない（B章参照）。Verse が保持する翻訳文字列をそのまま包む。

```json
{
  "kind": "translation",
  "verseRef": { "corpus": "nt", "book": "JHN", "chapter": 3, "verse": 16 },
  "translationId": "JA1955",
  "text": "神はそのひとり子を賜わったほどに、この世を愛して下さった。それは彼を信じる者がひとりも滅びないで、永遠の命を得るためである。"
}
```

### C-3. WordOrder Representation

現行 `_wordToFlowChip()` の戻り値の形をほぼそのまま契約化したもの。`tokenId` を主キーに採用し、
`ref` 文字列パースへの依存から脱却する（先行監査 A-3 の推奨に対応）。

```json
{
  "kind": "wordOrder",
  "verseRef": { "corpus": "nt", "book": "JHN", "chapter": 3, "verse": 16 },
  "chips": [
    {
      "tokenId": "n43003016003",
      "greek": "Οὕτως",
      "gloss": "このように",
      "roleClass": "role-other",
      "morphText": "副詞",
      "phraseBreakBefore": false,
      "signals": []
    },
    {
      "tokenId": "n43003016004",
      "greek": "γὰρ",
      "gloss": "なぜなら",
      "roleClass": "role-conj",
      "morphText": "接続詞",
      "phraseBreakBefore": true,
      "signals": [{ "label": "理由を説明している", "cls": "sig-logic" }]
    },
    {
      "tokenId": "n43003016007",
      "greek": "ἠγάπησεν",
      "gloss": "愛された",
      "roleClass": "role-verb",
      "morphText": "動詞・直説法・アオリスト・能動態",
      "phraseBreakBefore": false,
      "signals": [{ "label": "一つの出来事として語っている", "cls": "sig-declare" }]
    }
  ]
}
```

`gloss` は Analysis（`resolve()`）が確定した `japanese` の**転写のみ**であり、Representation
Builder はここで語形変換を行わない（`_naturalize()` 相当の処理は Analysis 側の責務のまま）。

### C-4. SyntaxTree Representation（将来・仕様のみ）

**実装はしない。** 将来 Analysis Layer に `syntax: { parent, relation, role }` が追加された場合に
Representation Builder が機械的に変換する形を示す仕様。node/edge 形式を採用する。

```json
{
  "kind": "syntaxTree",
  "verseRef": { "corpus": "nt", "book": "JHN", "chapter": 3, "verse": 16 },
  "nodes": [
    { "id": "n43003016007", "greek": "ἠγάπησεν", "gloss": "愛された", "role": "v" },
    { "id": "n43003016001", "greek": "Θεὸς",      "gloss": "神",      "role": "s" },
    { "id": "n43003016012", "greek": "κόσμον",    "gloss": "世",      "role": "o" }
  ],
  "edges": [
    { "from": "n43003016007", "to": "n43003016001", "relation": "subj" },
    { "from": "n43003016007", "to": "n43003016012", "relation": "obj" }
  ]
}
```

`nodes[].id` は bible_data の `tokenId`（先行監査で確認済み。現状は未使用）をそのまま使う。
先行監査で判明した通り、bible_data には `role`（s/v等）・`frame`（`A0:tokenId A1:tokenId`）・
`referent`（照応先 tokenId）という PropBank 的な部分注釈が既に存在し、`edges[].relation` は
将来これを Analysis Layer が読み取って変換する形が最も自然（新規解析エンジンの開発を要さない）。
ただし現状の注釈は全語を網羅しておらず、frame は動詞のみに限定される点は実装フェーズでの
既知の制約として引き継ぐ。

---

## D. Renderer Registry

### D-1. クラス設計

```ts
interface Renderer {
  render(representation: Representation): string;  // HTML文字列（将来SVGも）
}

class RendererRegistry {
  register(kind: string, renderer: Renderer): void;
  get(kind: string): Renderer;                      // 未登録kindはthrow（fail-fast）
  render(representation: Representation): string {
    return this.get(representation.kind).render(representation);
  }
}
```

- **登録方法:** 起動時に各 Renderer モジュールが自己登録する
  （`RendererRegistry.register('translation', TranslationRenderer)` 等）。
  `index.html` 本体は個々の Renderer の実装を知らず、`kind` という文字列キーだけを知る。
- **呼び出し方法:** 呼び出し元（単一表示・並列表示のどちらでも）は
  `renderColumn(representation)` という単一エントリポイントだけを呼ぶ。
  内部で `RendererRegistry.render(representation)` に委譲する。

### D-2. 単一表示との関係

単一表示は「カラム数 = 1」の特殊ケースとして同じ経路を通る。単一表示専用の分岐・専用関数を
持たない（現行の `render()` 左列べた書きロジックは廃止し、並列表示と同じ
`renderColumn()` を呼ぶ）。

### D-3. 並列表示との関係

現行の「左右2カラム固定」を `columns: ColumnMode[]`（可変長配列）に一般化する。

```
verse:      Verse（1節分の生データ、1回だけロード）
columns:    [ { kind: 'translation', translationId: 'JJ2017' },
              { kind: 'wordOrder' } ]

for (const mode of columns) {
  const analysis = needsAnalysis(mode) ? getOrBuildAnalysis(verse) : null;  // 節単位で共有・キャッシュ
  const rep       = buildRepresentation(mode, verse, analysis);
  const html      = RendererRegistry.render(rep);
  appendColumn(html);
}
```

- `getOrBuildAnalysis(verse)` は**節単位で1回だけ**計算・キャッシュする
  （`docs/development/flow-rendering.md` §2 の Resolve Cache パターンを踏襲）。
  「語順フロー × 構文ツリー」のように Greek 系モードを2列同時に表示する場合でも、
  `resolve()` の呼び出しは1回で済み、二重計算を避けられる。
- カラム数は `columns.length` で決まり、2列専用のコードパスは存在しない。
  「翻訳 + 翻訳」「翻訳 + 語順フロー」「語順フロー + 構文ツリー」はすべて同じループを通る。
- レイアウト（CSS Grid）は `grid-template-columns: repeat(columns.length, 1fr)` を
  動的生成する形に一般化する必要がある（現行の `.verse-pair-left` / `.verse-pair-right`
  という固定2要素前提から、`verse-pair-col-{i}` のような可変要素へ）。これは
  E章のフェーズで扱う実装上のリファクタリングであり、本設計書はその必要性のみを指摘する。

---

## E. Migration Plan

各フェーズは CLAUDE.md §9 の「設計 → 実装 → 監査 → 凍結」および `docs/ai-workflow.md` の
G1（価値）→ G2（忠実性）→ G3（技術）ゲートに従う。本書（VR-1）は設計フェーズの成果物であり、
以降の各フェーズは着手前に個別に G1–G3 を通過させる（本書はそれを代替しない）。

| フェーズ | 内容 | 表示への影響 | 触れる範囲 |
|---|---|---|---|
| **VR-1（本書）** | Verse Representation Architecture の設計仕様確定 | なし（設計文書のみ） | ドキュメントのみ |
| **VR-2** | **内部整理のみ・表示を変えない段階。** `_transA`/`_transB` の文字列は温存したまま、その裏で `ColumnMode` への変換アダプタを追加。既存 `if (_transA === 'FLOW')` 分岐は残置するが、新しい `renderColumn()` 経由の呼び出しに置き換え、出力が旧実装とバイト等価であることを機械比較で確認する | **なし（意図的に不変）** | `index.html` 内の呼び出し経路のみ。`reading-engine.js` 等 FROZEN層は非接触 |
| **VR-3** | Representation 層を正式導入。`_wordToFlowChip()` の出力を WordOrder Representation として契約化。Translation 側も同型の Representation 化。4箇所に重複した HTML 生成（`render()` 左列 / `_buildFlowTabHTML` / `_buildGfVerseBlock` / `_renderFlowTab`）を `WordOrderRenderer` 1本に統合 | なし（統合後の出力が統合前と一致することを回帰確認） | `index.html`。Analysis層（Reading Engine）は非接触 |
| **VR-4** | `TRANSLATIONS.FLOW` を廃止し、DisplayMode Registry（C-1）へ完全移行。UI（翻訳ピッカー）を DisplayMode 選択に切り替え | UI変更あり（モード選択の見た目が変わりうる） | `index.html`。URL共有パラメータの新旧マッピング層が必要（下記リスク参照） |
| **VR-5** | 並列表示の N 列化。`.verse-pair` の CSS Grid を2列固定から可変長に一般化 | なし（2列時点の見た目は不変。3列目以降が初めて解禁される） | `index.html` の CSS/DOM 構造 |
| **VR-6** | Analysis Layer への `syntax: { parent, relation, role }` 付帯情報の設計確定・実装（構文ツリー本体の着手ではなく、その**前提条件**の整備） | なし | `reading-engine.js` への**追加のみ**（既存 `getRelativeSyntax` 等と同型。FROZEN Phase 1–7 の変更は伴わない） |

各フェーズの検証観点（実装フェーズで `docs/ai-workflow.md` §4 の Change Plan / Audit Report
形式に落とし込む）:

- **VR-2・VR-3・VR-5:** 「表示を変えない」フェーズであるため、before/after のHTML出力を
  機械比較し**差分ゼロ**を凍結条件とする。
- **VR-4:** 表示が変わるため、biblical-editor による G2 レビュー（L-0 境界の侵害がないか、
  特にモード名の日本語ラベルが翻訳/推論的でないか）を必須とする。
- **VR-6:** `reading-engine.js` は FROZEN のため、対応する回帰テスト（`npm run test:re-*`）への
  ケース追加を着手条件とする（CLAUDE.md §7 FROZEN プロトコル）。

---

## F. リスク評価

| リスク | 内容 | 緩和方針 |
|---|---|---|
| **性能劣化** | Representation 層を挟むことで `resolve()` の呼び出し経路が増え、キャッシュ設計を誤ると二重計算が発生しうる | D-3 の「節単位で1回だけ Analysis を計算・共有する」設計を厳守する。既存の `_getVerseResolved` パターンをそのまま踏襲すれば回避可能 |
| **URL 共有・復元の後方互換** | `ColumnMode` 化により、現行の `?transA=FLOW` のような URL パラメータ形式が変わる可能性がある。CLAUDE.md §8「状態は URL で共有・復元する」原則との整合が必要 | VR-4 着手時に新旧パラメータのマッピング層（旧URLの受理・変換）を設計に含める。本書では方針のみ指摘し、詳細はVR-4設計で確定する |
| **FROZEN層との混同** | Analysis Layer は `resolve()` を呼び出す「窓口」だが、これを新規コードとして書く際に FROZEN層（`reading-engine.js` Phase 1–7）自体を変更したと誤認されるリスク | Analysis Layer の呼び出し窓口は `reading-engine.js` を変更せず、別ファイル/別関数として実装する（現行の `_buildReadingContext()` / `_getVerseResolved()` と同じ「呼び出すが変更しない」関係を維持） |
| **Representation 形状の先読みリスク** | SyntaxTree Representation（C-4）は実装未着手のため、実際の構文解析要件が固まった際に再設計が必要になる可能性がある | node/edge 形式は一般的なグラフ表現であり拡張耐性は高いが、C-4はあくまで「現時点の仕様」であり、VR-6着手時に再検証を必須とする |
| **「表示を変えない」制約の形骸化** | 12,412行のモノリス内でのリファクタリングは、フェーズ境界を曖昧にすると意図せず表示が変わりやすい | VR-2・VR-3・VR-5 の各フェーズで出力の機械比較（バイト等価性確認）を凍結の必須ゲートにする（E章に記載済み） |
| **L-0 境界の侵食** | Representation Builder が「表示のための整形」を行う中で、意訳的な signal 文言・言い換えを追加してしまうリスク（現行 `_wordToFlowChip` の signal 辞書のような「読書感覚の言葉」の生成がここに該当しうる） | Representation Builder は Analysis の `japanese` を転写するのみとし、新しい文言生成を行う場合は biblical-editor の G2 レビューを実装前レビューの必須項目とする（E章 VR-4 の検証観点に明記済み） |
| **並列表示のレイアウト複雑化** | N列化（VR-5）により、高さ揃え（`display: contents` トリック）やモバイル表示の再設計が必要になる可能性がある | 本書はアーキテクチャ（データ・呼び出し経路）の設計に限定し、レイアウトCSSの詳細はVR-5の個別設計に委ねる |

---

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-08-04 | 初版（Phase VR-1。先行監査を踏まえた Verse Representation Architecture 設計） |
