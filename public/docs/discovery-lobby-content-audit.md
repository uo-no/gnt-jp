# UX-10.8 — Discovery Lobby Content Audit

**実施日**: 2026-07-14  
**種別**: コンテンツ構成監査（実装変更なし）  
**対象**: `#state-empty` 内の全要素

---

## 監査前提

### `#state-empty` の表示状態

`#state-empty` は一つの `<div>` コンテナ。内部の要素は表示タイミングが異なる。

| 要素 | 初期 display | 表示トリガー |
|------|-------------|------------|
| `#discovery-lobby` | 常時表示 | — |
| `#history-recent-section` | `none` | `_loadHistory()` が履歴を検出時 |
| `#empty-examples-section` | `none` | **なし（表示するコードが存在しない）** |
| `#concept-discovery-section` | `none` | `search-concepts.json` 読込後 |
| `#pattern-search-section` | `none` | `search-patterns.json` 読込後 |
| `.empty-glyph/.empty-title/.empty-desc` | `none` | `_showEmpty()` 呼び出し時（エラー専用）|

### 実際に見える画面

**通常ロード（履歴あり）:**

```
今日は、どんなことばを読みますか？  [Discovery Lobby]
忍耐  信仰  希望  証し               [theme chips]

最近の検索                            [history section]
祈り  愛  罪  …

テーマから探す                        [concept section]
聖書の大切なテーマから探すことができます
愛  祈り  信仰  救い  罪  キリスト  十字架  復活

文法パターン                          [pattern section]
互いに＋命令形  μή＋命令形  ἵνα＋接続法  ἐάν＋接続法
```

**通常ロード（履歴なし）:** 最近の検索 なし。それ以外は同じ。

---

## 判定ルール

| 判定 | 基準 |
|------|------|
| **KEEP** | 「これから聖書を読む」気持ちを直接起こす。Discovery Lobby の核心にある |
| **MOVE** | 有用だが「読む前」ではなく別のタイミング・文脈が適切 |
| **REMOVE** | 機能しないか、DS-DISCOVERY-01/02 に反し、移動先もない |

---

## 要素別監査

---

### E-01 — Discovery Title「今日は、どんなことばを読みますか？」

- **ID**: E-01
- **場所**: `.discovery-title`（`#discovery-lobby` 内）
- **現在の役割**: Discovery Lobby の問いかけ。テーマチップに「今日、聖書と出会う」というコンテキストを与える
- **表示状態**: 常時表示
- **Discovery Lobby 適合度**: 高

**判定: KEEP**

**理由**: DS-DISCOVERY-01 の核心。「読む気持ちを起こす」問いかけとしてテーマ語の前にある。削除するとテーマチップが文脈なしに並び、検索候補リストとの区別がなくなる。

---

### E-02 — Discovery Theme Chips（今日のテーマ 4件）

- **ID**: E-02
- **場所**: `.discovery-theme-chip` × 4（`#discovery-lobby .discovery-themes` 内）
- **現在の役割**: 教会暦に基づく今日のテーマ語。クリックで `unifiedSearch()` 起動
- **表示状態**: 常時表示。`renderDiscoveryLobby()` が決定論的に生成
- **Discovery Lobby 適合度**: 最高

**判定: KEEP**

**理由**: 「今日、聖書を読み始めるきっかけ」を 1 語で差し出す設計。DS-DISCOVERY-01 の本体。Gentium Plus serif、20px、色階層（UX-10.7-B 適用済み）で「聖書のことば」として表示される。

---

### E-03 — 最近の検索

- **ID**: E-03
- **場所**: `#history-recent-section`（`#state-empty` 直下、`#discovery-lobby` の兄弟）
- **現在の役割**: `localStorage` から最大 5 件の検索履歴を `.ex-chip` で表示
- **表示状態**: 履歴が存在する場合のみ表示（`_renderEmptyStateHistory()`）
- **Discovery Lobby 適合度**: 低

**判定: MOVE**

**理由**:

過去操作の記録は「発見（Discovery）」ではない。「今日、何かを読もう」という気持ちに対して、昨日の作業の続きを差し出すのは違うレイヤーの情報。

また現状、Discovery Lobby（テーマ 4件）のすぐ下に「最近の検索」が並ぶことで、画面が「検索起動の選択肢一覧」に見える。DS-DISCOVERY-02 に反する。

**移動先**: 検索入力フォーカス時のサジェスト（`.suggest-dropdown`）に統合する。検索を始めた瞬間に履歴を提示するのは文脈として自然。

---

### E-04 — 例（ἀγαπάω / πιστεύω / G3056）

- **ID**: E-04
- **場所**: `#empty-examples-section`
- **現在の役割**: ギリシャ語・Strong番号の入力例を提示（設計意図）
- **表示状態**: **常時 `display:none`。表示するコードが存在しない（dead element）**
- **Discovery Lobby 適合度**: なし

**判定: REMOVE**

**理由**:

現在のコードに `#empty-examples-section` を `display` に戻す箇所がない。UX 改善で不要と判断され非表示化されたと推定される。

仮に復元しても、ギリシャ語・Strong番号の例は「操作方法の説明」であり DS-DISCOVERY-01 に反する。P-09「Empty State の入口は日本語から」にも反する。

**実装**: DOM から削除（3行）。検索ロジックへの依存なし。

---

### E-05 — テーマから探す（Concept Discovery）

- **ID**: E-05
- **場所**: `#concept-discovery-section`
- **現在の役割**: Top 8 Concept（愛・祈り・信仰・救い・罪・キリスト・十字架・復活）をセクションとして表示。Concept 検索（Term[] 展開）を経由した検索起動
- **表示状態**: `search-concepts.json` 読込後に表示（`_renderConceptDiscoveryChips()`）
- **Discovery Lobby 適合度**: 中（機能重複・説明過剰）

**判定: MOVE**

**理由**:

*機能重複*: Discovery Lobby の theme chip（感謝・祈り・信仰など）と「テーマ語クリック → 検索」の体験が重複する。同画面に同種の選択肢が 2 セット並ぶと、どちらを選ぶか迷いが生まれる。

*DS-DISCOVERY-01 違反*: 「テーマから探す」「聖書の大切なテーマから探すことができます」という文言は「検索方法の説明」であり、「読むきっかけ」ではない。

*質的差異の埋没*: Concept Discovery は Concept → Term[] 展開による質的に異なる検索（関連語群の横断検索）だが、`.ex-chip` で並べるだけでは Discovery Lobby の chip と区別がつかない。Concept 検索の価値が伝わらない。

**移動先**: 検索後のゼロヒット画面（「見つからない場合はこちらのテーマから」）または結果下部の「関連テーマ」セクション。Concept Insight（`#concept-insight`）との統合も検討。

---

### E-05a — 説明文「聖書の大切なテーマから探すことができます」

- **ID**: E-05a
- **場所**: E-05 セクション内の `<div style="font-size:0.78rem;...">`
- **現在の役割**: テーマから探すセクションの補足説明
- **Discovery Lobby 適合度**: なし

**判定: REMOVE**

**理由**: E-05 が MOVE になれば自然に消える。単独でも「説明で理解させる」設計は DS-DISCOVERY-01 に反する。Discovery Lobby は「説明なしに伝わる」入口であるべき。

---

### E-06 — 文法パターン

- **ID**: E-06
- **場所**: `#pattern-search-section`
- **現在の役割**: `search-patterns.json` のプリセット（互いに＋命令形 / μή＋命令形 / ἵνα＋接続法 / ἐάν＋接続法）を `.layer-chip.prox` で表示。クリックで `runPatternSearch()` 起動
- **表示状態**: `search-patterns.json` 読込後に表示（`_renderPatternChips()`）
- **Discovery Lobby 適合度**: 最低

**判定: MOVE**

**理由**:

文法パターン検索は「聖書を読んだ後に深める」機能。「互いに＋命令形」「ἵνα＋接続法」という表現は、テキストに慣れ文法構造を意識した読者向け。

「これから聖書を読もう」という初回訪問者にとって、命令形・接続法という文法用語は入口の障壁になる。Discovery Lobby で最初に目にするものとして不適切。

また `.layer-chip.prox`（紫系のアクセントチップ）は Discovery Lobby の無装飾テーマ語と視覚的に競合し、画面の「静けさ」を乱す。

**移動先**: 検索結果ページ下部の「パターンで深める」セクション、または専用の syntax-search 画面（`morph-search.html`）への導線として再配置。

---

### E-07 — エラー時フォールバック（.empty-glyph / .empty-title / .empty-desc）

- **ID**: E-07
- **場所**: `.empty-glyph`「λόγος」/ `.empty-title`「聖書を検索する」/ `.empty-desc`「日本語・ギリシャ語・Strong番号で検索できます」
- **現在の役割**: `_showEmpty(title, desc)` が呼ばれた時（エラー・特殊状態）にのみ表示されるフォールバック UI
- **表示状態**: 通常は `display:none`。エラー時のみ
- **Discovery Lobby 適合度**: N/A（Discovery Lobby とは別の責務）

**判定: KEEP（as-is）**

**理由**: Discovery Lobby とはコンテキストが完全に異なる（エラー時のリカバリ UI）。変更対象外。

---

## 総合評価

| ID | 要素 | 判定 | 優先 |
|----|------|------|------|
| E-01 | Discovery Title | **KEEP** | — |
| E-02 | Discovery Theme Chips | **KEEP** | — |
| E-03 | 最近の検索 | **MOVE** → 検索入力サジェスト | P1 |
| E-04 | 例（dead element）| **REMOVE** | P0 |
| E-05 | テーマから探す（Concept）| **MOVE** → 検索後 / ゼロヒット | P1 |
| E-05a | 説明文 | **REMOVE** | P0（E-05 に付随）|
| E-06 | 文法パターン | **MOVE** → 検索結果 / syntax-search | P1 |
| E-07 | エラーフォールバック | **KEEP** | — |

---

## 理想構成（Final State）

実装後の Discovery Lobby:

```
今日は、
どんなことばを読みますか？

忍耐

信仰

希望

証し
```

4 語のみ。説明なし。ラベルなし。セクションなし。

---

## 実装方針

### P0 — 即時（影響なし）

| 対象 | 変更 | 影響範囲 |
|------|------|---------|
| `#empty-examples-section` | DOM 削除（HTML 4行）| なし（dead element）|
| E-05a 説明文 | E-05 MOVE 実装時に消滅 | E-05 に付随 |

### P1 — 次フェーズ（機能移動）

| 対象 | 移動先 | 変更規模 |
|------|--------|---------|
| E-03 最近の検索 | 検索入力フォーカス時サジェストに統合 | 中（JS 側の表示タイミング変更）|
| E-05 テーマから探す | ゼロヒット画面 or 検索後セクション | 中（render 関数の呼び出し先変更）|
| E-06 文法パターン | 検索結果下部 or syntax-search 導線 | 中（render 関数の呼び出し先変更）|

---

## 設計制約の遵守

変更禁止:

- 検索ロジック
- `resolveTerm` / `resolveConcept`
- Pattern Engine / `runPatternSearch`
- Wallace Engine
- `StudyPanel`
- データ構造（JSON）

P1 の「移動」は render 関数の呼び出し箇所を変えるだけ。検索ロジック自体は不変。

---

## 成果物

| ファイル | 内容 |
|---------|------|
| `docs/discovery-lobby-content-audit.md` | 本ドキュメント |
| `docs/output/discovery-lobby-content-audit.json` | 機械可読版 |
