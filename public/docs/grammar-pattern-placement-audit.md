# UX-10.8-C — Grammar Pattern Placement Audit

**実施日**: 2026-07-15  
**種別**: 配置監査（実装変更なし）  
**対象**: `#pattern-search-section` / `SEARCH_PATTERNS` / `runPatternSearch()`

---

## 1. 現在の実装

### 生成関数

```javascript
async function _loadSearchPatterns() {
    const r = await fetch('../assets/data/search-patterns.json');
    SEARCH_PATTERNS = data.patterns.filter(p => p.id && p.label && p.query.type === 'cooccurrence' && p.query.termA && p.query.termB);
    _renderPatternChips();
}

function _renderPatternChips() {
    const sec  = document.getElementById('pattern-search-section');
    const wrap = document.getElementById('pattern-chips');
    if (!sec || !wrap || SEARCH_PATTERNS.length === 0) return;
    wrap.innerHTML = SEARCH_PATTERNS.map((p, i) =>
        `<span class="layer-chip prox" onclick="runPatternSearch(${i})">${p.label}</span>`).join('');
    sec.style.display = '';
}
```

**現在の表示場所**: `#pattern-search-section`（`#state-empty` 内。Discovery Lobby と同じコンテナ）  
**表示タイミング**: `search-patterns.json` 非同期ロード完了後（ページロード後数百ms）  
**CSS**: `.layer-chip.prox` — 紫系アクセントチップ（`.ex-chip` とは異なるスタイル）

---

### データソース

| フィールド | 値 |
|-----------|-----|
| ファイル | `assets/data/search-patterns.json` |
| パターン数 | 4件 |
| スキーマ | `id` / `label` / `description` / `query.type=cooccurrence` / `query.termA` / `query.termB` |

| ID | ラベル | termA | termB | 用途 |
|----|--------|-------|-------|------|
| reciprocal-command | 互いに＋命令形 | `ἀλλήλων`（lemma）| 命令法（morph）| 相互の勧め |
| me-command | μή＋命令形 | `μή`（lemma）| 命令法（morph）| 否定命令 |
| hina-subjunctive | ἵνα＋接続法 | `ἵνα`（lemma）| 接続法（morph）| 目的節 |
| ean-subjunctive | ἐάん＋接続法 | `ἐάん`（lemma）| 接続法（morph）| 条件節 |

---

### クリック時の処理

```
runPatternSearch(i)
  → runTermProximitySearch(termA, termB, {scope:'verse'})
  → _renderUnifiedResults(p.label, [termA.value], null)
```

**結果レンダリング**: 通常の統合検索と**完全に同じパイプライン**。`result-body` に hit cards が表示される。Concept Insight は非表示（`_activeInsightConcept = null`）。

**インデックス依存**: `IDX.ready` が必要。ロード前クリック時は loading 表示して待機する。

---

### 既存の検索機能との接続

**Concept Insight**（`#concept-insight`）に重要な先例がある。

```javascript
// _renderConceptInsight() L2675
patHtml ? `<div class="ci-section"><div class="ci-section-title">パターンで探す</div>
           <div class="layer-chips ci-chips">${patHtml}</div></div>` : ''
```

Concept 検索が発火した時（「愛」「祈り」等）、`#concept-insight` 内に「パターンで探す」セクションが自動的に描かれる。`SEARCH_CONCEPTS[i].patterns` がそのコンセプトに紐づくパターン ID を保持しており、該当する `.layer-chip.prox` チップが表示される。

→ **「パターンを検索後に表示する」設計は Concept Insight で既に実装されている。**

---

## 2. 候補配置の評価

---

### 候補 A — 検索サジェスト

**概要**: 検索入力フォーカス後のサジェストドロップダウン（`.suggest-dropdown`）にパターンを追加する。

#### 評価

| 観点 | 評価 | 詳細 |
|------|------|------|
| 文脈適合性 | **低** | フォーカス時はまだ入力していない状態。何を検索するかが決まる前に文法パターンを差し出すのは「検索方法の説明」 |
| DS-DISCOVERY-01 | **違反** | 「検索前」のタイミングで文法チップを見せることは、検索入力の前段階で方法を教えることと同義 |
| 実装コスト | 中 | 現在の `.suggest-dropdown` は lemma サジェスト専用。パターンを追加するにはドロップダウンの構造を変更が必要 |
| ユーザー体験 | **弱い** | 入力欄をタップしたら文法パターン名が出てくる — 文法を知らない初心者には何が起きているか不明 |
| UX-10.8-B との整合 | 注意 | E-03（最近の検索）が既に focus ハンドラで `#history-recent-section` を表示している。パターンを追加すると focus 時の情報量が増えすぎる |

**判定: 不採用**

---

### 候補 B — 検索結果後

**概要**: `result-body` 内、hit cards の下部に「文法で深める」セクションとしてパターンチップを表示する。

#### 評価

| 観点 | 評価 | 詳細 |
|------|------|------|
| 文脈適合性 | **高** | ユーザーが検索結果を読んだ後 → 「この語彙がどんな文法構造で使われているか」という深掘りニーズが自然に発生する |
| DS-DISCOVERY-01 | **準拠** | 検索後のタイミングは「発見（Discovery）の延長」であり、「検索方法の説明」ではない |
| 先例 | **あり** | Concept Insight が「パターンで探す」セクションを検索後に表示する（L2675）。同じ設計パターン |
| 実装コスト | **低** | `_renderPatternChips()` のターゲットを `#result-body` 内の新要素に変更するだけ。`_renderUnifiedResults()` の末尾で呼べばよい |
| ユーザー体験 | **良い** | 「愛 631件」の結果を読み終えたユーザーが「互いに+命令形で探す」チップを見つける = 自然な探索継続 |
| 表示条件 | 要検討 | 毎検索後に表示（常時）vs Concept 検索後のみ vs テーマ語検索後のみ。常時表示が最もシンプルで一貫性がある |

**判定: 採用推奨**

#### 実装スケッチ

```html
<!-- result-body 内、hits-list の後 -->
<div id="pattern-explore-section" style="display:none; margin-top: var(--space-xl);">
    <div class="empty-section-label">文法で深める</div>
    <div class="layer-chips" id="pattern-explore-chips"></div>
</div>
```

```javascript
// _renderPatternChips() を新ターゲットで呼び出す
// _renderUnifiedResults() の末尾か、_renderHitCards() の後

function _renderPatternExplore() {
    const sec  = document.getElementById('pattern-explore-section');
    const wrap = document.getElementById('pattern-explore-chips');
    if (!sec || !wrap || SEARCH_PATTERNS.length === 0) return;
    wrap.innerHTML = SEARCH_PATTERNS.map((p, i) =>
        `<span class="layer-chip prox" title="${_escH(p.description||'')}"
            onclick="runPatternSearch(${i})">${_escH(p.label)}</span>`).join('');
    sec.style.display = '';
}
```

`runPatternSearch()` は変更不要。クリック後は通常の結果画面に遷移する。

---

### 候補 C — StudyPanel

**概要**: `index.html` の StudyPanel（本文読解画面）内にパターン検索入口を追加する。

#### 評価

| 観点 | 評価 | 詳細 |
|------|------|------|
| 文脈適合性 | 高 | 本文を読んだ後に文法構造を探るのは理想的なフロー |
| DS-DISCOVERY-01 | 準拠 | 読書後のタイミングは完全に「発見の先」 |
| 実装コスト | **高** | `runPatternSearch()` と `SEARCH_PATTERNS` は `search-tool.html` に存在。StudyPanel は `index.html`。クロスファイル通信（postMessage 等）が必要 |
| 変更禁止制約 | **抵触** | StudyPanel の変更は制約外ではないが、`search-tool.html` ↔ `index.html` の接続は大規模変更 |
| 独立性 | **低** | 検索ツールと読書ツールを接続するアーキテクチャ変更。UX-10 系のスコープを大きく超える |

**判定: 本フェーズは対象外。将来フェーズの検討候補として記録。**

---

## 3. 優先順位

| 優先 | 候補 | 判定 | 理由 |
|------|------|------|------|
| 1位 | **B（検索結果後）** | **採用** | 文脈適合・先例あり・実装コスト低 |
| 2位 | C（StudyPanel）| 将来検討 | アーキテクチャ的には理想。本フェーズ対象外 |
| 3位 | A（検索サジェスト）| **不採用** | 「検索前」は DS-DISCOVERY-01 に反する |

---

## 4. 追加考察 — Concept Insight との関係

現在、Concept 検索が発火した場合（「愛」→ love concept）、`#concept-insight` 内に「パターンで探す」が自動表示される。これは **配置 B と完全に一致する設計**。

差異は「Concept 検索のみ」vs「全検索後」。

- Concept 検索のみ: すでに動作中。4 パターン全部が出るわけではない（概念に紐づくものだけ）
- 全検索後: `result-body` に固定の 4 パターンセクションを追加

後者は「すべての検索からパターン探索へのブリッジ」として機能する。特に lemma / phrase 検索（Concept 未発火）でも使える。

---

## 5. 現在の `#pattern-search-section` の状態

UX-10.8-B 完了後も `#pattern-search-section` は `#state-empty` 内に残存している。  
`search-patterns.json` ロード後に表示されるため、現時点では Discovery Lobby にパターンが表示されている。

本フェーズ（UX-10.8-C）が次の実装フェーズ（D）で解消される:

| 変更 | 内容 |
|------|------|
| `#pattern-search-section` の非表示化 | `_renderPatternChips()` を呼ばない or DOM 要素を削除 |
| 新 DOM 要素の追加 | `result-body` 内に `#pattern-explore-section` を追加 |
| `_renderUnifiedResults()` への統合 | 末尾で `_renderPatternExplore()` を呼ぶ |

---

## 6. 移動先決定

| 項目 | 決定 |
|------|------|
| **移動先** | 検索結果後（`result-body` 内、hit cards の下）|
| **表示条件** | 全検索後（常時表示）|
| **セクション名** | 「文法で深める」|
| **スタイル** | 既存 `.layer-chip.prox` を踏襲（変更なし）|
| **実装フェーズ** | UX-10.8-D |
| **Discovery Lobby からの削除** | UX-10.8-D で `#pattern-search-section` を DOM 削除 + `_renderPatternChips()` 呼び出し停止 |

---

## 7. 制約遵守確認

| 制約 | 確認 |
|------|------|
| Pattern Engine 変更禁止 | ✅ `runPatternSearch()` / `runTermProximitySearch()` は変更しない |
| Wallace Engine 変更禁止 | ✅ |
| syntax registry 変更禁止 | ✅ |
| syntax-search 変更禁止 | ✅ |
| `search-patterns.json` 変更禁止 | ✅ |

変更するのは **表示場所のみ**: `_renderPatternChips()` のターゲット DOM と呼び出しタイミング。

---

## 成果物

| ファイル | 内容 |
|---------|------|
| `docs/grammar-pattern-placement-audit.md` | 本ドキュメント |
| `docs/output/grammar-pattern-placement-audit.json` | 機械可読版 |
