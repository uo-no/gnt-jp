# C-17 Structural Diagram Split — Design Report

**Phase:** C-17 — Hierarchical Diagram (HDG) Renderer  
**Date:** 2026-09-01  
**State:** DESIGN ONLY — CODE CHANGES: 0  
**Audit Base:** C-17 Step 5-B BROWSER-VERIFIED（変更禁止）

---

## 1. Executive Summary

現在の構文ダイアグラム実装は、

1. **Reed-Kellogg (RK) renderer** — P5〜P6で完成済み。DR(DiagramRepresentation)を介してSR JSONを空間的に可視化する。
2. **Hierarchical (HDG) renderer** — C-17 Step 5-Bで実装済み。SR JSONを直接走査してインデント構造で表示する。URLパラメータ `?view=hierarchical` で起動（開発トグル）。

2つのrendererは**現時点で既に独立している**（コードパスが完全分離）。  
混在実装は存在しない。

今後のゴールは以下2点。

1. 3モード（語順フロー / 階層 / RK）をUIとして明示的に独立させる
2. 設計境界（DOM・CSS・JS・データ）を正式に文書化する

---

## 2. Current Architecture

### 2.1 データフロー

```
bible_data（elData）
  ↓ _dgActiveTokenMap（ref → token entry）
  ↓ _dgConjJaMap（Greek conjunction text → Japanese）

SR JSON（assets/data/sr/{BOOK}/{CH}.json）
  ├─ sentences[].root → SR node tree（clause / group / phrase.* / token）
  │
  ├─→ [RK path]
  │    dg-engine.js: deriveDR(root) → DR_Clause
  │    _dgRenderClause(dr) → .dg-view DOM
  │
  └─→ [HDG path]
       _hdgRenderSentence(sentence) → .hdg-view DOM
       （SR JSON を直接走査。DR経由なし）
```

### 2.2 モード選択（現状）

```javascript
const _hdgViewMode = _hdgInitViewParam === 'hierarchical'; // URL ?view=hierarchical

if (_hdgViewMode && _isDGChapter && sentence.root) {
    // HDG path
    _hdgRenderSentence(sentence) → .hdg-view
} else if (_isDGChapter && sentence.root) {
    // RK path (default)
    DgEngine.deriveDR(sentence.root) → _dgRenderClause(dr) → .dg-view
} else {
    // fallback: _sdRenderNode (tree view for non-DG chapters)
}
```

### 2.3 Chapter Gate（現状）

```javascript
const _isDGChapter = window.DgEngine && _src.book && _src.chapter && (
    (book === 'JHN' && ch === 1) || (book === 'MAT' && ch === 5) ||
    (book === 'MAT' && ch === 28) || (book === 'EPH' && ch === 2) ||
    (book === 'PHP' && ch === 2) || (book === 'COL' && ch === 1) ||
    (book === 'ROM' && ch === 6)
);
```

開発中のゲート。他章は `_sdRenderNode`（生SR表示）へfallback。

### 2.4 共通インフラ

両rendererが実行前に依存する状態：

| インフラ | 設定箇所 | 使用者 |
|---|---|---|
| `_dgActiveTokenMap` | `_renderStructuralDiagramView` 内 | RK + HDG 両方 |
| `_dgConjJaMap` | 同上 | RK のみ |
| `_isDGChapter` | 同上 | RK + HDG 両方（gate） |
| `DgEngine`（global） | `dg-engine.js` 読み込み | RK のみ（`deriveDR` 使用） |

---

## 3. Current Mixed Diagram Audit

### 3.1 CONFIRMED: 2つのrendererは完全分離している

コードレベルで確認済み。

- HDG renderer（`_hdgRenderSentence`）はSR JSONを直接走査する。`deriveDR`を呼ばない。
- RK renderer（`_dgRenderClause`）はDRを受け取る。SR JSONを直接走査しない。
- 両者は同一の `sd-sentence` 内で**排他的に**描画される（`_dgRendered` フラグで制御）。

### 3.2 混在に見える要素の正体

| 要素 | 実態 |
|---|---|
| RK内の `.dg-adv-clause` インデント | RK視覚文法（従属節はL字型ブラケット＋インデント）として正当 |
| RK内の `.dg-cc-clause-attach` | content clause sub-diagramはRK記法として正当 |
| `.dg-slot-mod-zone` | RKの語レベル修飾（斜め線）記法として正当 |
| `.dg-io-platform` | RKの間接目的語raised platform記法として正当 |
| HDGが `.dg-token` chipを再利用 | 意図的な共有（クリックターゲット視覚文法） |
| HDGが `_DG_FN_JA` を再利用 | 意図的な共有（fn日本語ラベル） |

**結論**: 現在の実装に「除去すべき混合」はない。RKはRK記法として成立し、HDGはHDG記法として成立している。

---

## 4. Element Responsibility Matrix

### A. Hierarchical専属

| 要素 | 種別 | 説明 |
|---|---|---|
| `data-hdg-depth` | DOM attribute | 節の深さ（0=主節、1+=サブ節） |
| `.hdg-clause` | CSS class | 節の主要構造コンテナ |
| `.hdg-clause--root` | CSS class | 主節（depth=0）専用 |
| `.hdg-clause--sub` | CSS class | サブ節（depth≥1） |
| `.hdg-clause--pp` | CSS class | 前置詞句ブロック |
| `.hdg-clause--relative` | CSS class | 関係節ブロック（CLAUSE_AS_NP） |
| `.hdg-clause--apposition` | CSS class | 同格ブロック |
| `.hdg-clause-label` | CSS class | 節ラベル（主節/節/従属節/等） |
| `.hdg-slots` | CSS class | 節内スロット群（インデントブロック） |
| `.hdg-slot` | CSS class | 関数付きスロット（fn badge + content列） |
| `.hdg-fn` | CSS class | 関数バッジ（主語/述語/等） |
| `.hdg-phrase` | CSS class | インラインフレーズ |
| `.hdg-prep-token` | CSS class | 前置詞トークン（opacity修飾） |
| `.hdg-conj` | CSS class | 素の接続詞トークン |
| `.hdg-view` | CSS class | HDG全体ラッパー |
| `.hdg-sentence` | CSS class | 文単位ラッパー |
| `.hdg-collapsed` | CSS class | collapse状態クラス |
| `_hdgClauseEl` | JS関数 | 節ノードをDOMへ変換 |
| `_hdgChildEl` | JS関数 | 節の直接子ノードをslot/conjunction/clauseとして変換 |
| `_hdgPhraseEl` | JS関数 | phraseノードを変換 |
| `_hdgGroupEl` | JS関数 | groupノードをDocumentFragmentとして透過化 |
| `_hdgPPEl` | JS関数 | phrase.ppをlabeledブロックへ変換 |
| `_hdgClauseAsNpEl` | JS関数 | CLAUSE_AS_NPを関係節ブロックへ変換 |
| `_hdgAppositionEl` | JS関数 | APPOSITIONを同格ブロックへ変換 |
| `_hdgTokenEl` | JS関数 | tokenをdg-tokenチップへ変換（RKチップを再利用） |
| `_hdgNodeEl` | JS関数 | SR nodeタイプ別ディスパッチャー |
| `_hdgRenderSentence` | JS関数 | 文単位エントリーポイント |
| `_hdgAttachFold` | JS関数 | collapse handlerをattach |
| `_hdgToggleFold` | JS関数 | collapse状態をtoggle |
| `_HDG_CS_LABEL` | JS定数 | construction → 日本語節ラベル |
| `_hdgInitViewParam` | JS定数 | URL paramをmodule eval時に取得 |
| border-left indent構造 | CSS設計 | 深さを左ボーダー幅+破線で視覚化 |
| collapse/expand UI | UX | クリック/キーボードで開閉 |
| `aria-expanded` / `aria-controls` | ARIA | アクセシビリティ属性 |

### B. RK専属

| 要素 | 種別 | 説明 |
|---|---|---|
| `deriveDR()` 使用 | アーキ | RKはDRを経由してSR JSONを消費 |
| DR schema全体 | データ | DR_Clause / DR_Slot / DR_AdvPhrase |
| `connectorBetween()` | JS関数（engine） | sp/po/complement/impliedを決定 |
| `extractSlotModifiers()` | JS関数（engine） | スロット語レベル修飾を抽出 |
| `extractPPStructure()` | JS関数（engine） | PP内部構造を抽出 |
| `_extractEmbeddedRelClauses()` | JS関数（engine） | CLAUSE_AS_NP埋め込み関係節を抽出 |
| `_extractContentClause()` | JS関数（engine） | content clause sub-diagramを抽出 |
| `deriveRelativeConnectors()` | JS関数（engine） | 関係代名詞先行詞connectorを導出 |
| `.dg-view` | CSS class | RK全体ラッパー |
| `.dg-clause` | CSS class | RK節コンテナ |
| `.dg-main-line` | CSS class | 水平ベースライン |
| `.dg-slot` | CSS class | ベースライン上のスロット（center+column） |
| `.dg-slot-text` | CSS class | スロット本文テキスト |
| `.dg-slot-fn` | CSS class | スロット関数ラベル（下部） |
| `.dg-conn-sp` | CSS class | S\|P 全高垂直区切り |
| `.dg-conn-po` | CSS class | P\|O 短縮垂直区切り |
| `.dg-conn-complement` | CSS class | P\Complement 後退斜め線 |
| `.dg-conn-implied` | CSS class | 破線斜め線（動詞省略） |
| `.dg-adv-list` | CSS class | 副詞句ゾーン（ベースライン下） |
| `.dg-adv-item` | CSS class | 副詞句アイテム |
| `.dg-adv-connector` | CSS class | L字型接続子 |
| `.dg-adv-row` | CSS class | 副詞句水平行 |
| `.dg-adv-text` | CSS class | 副詞句テキスト |
| `.dg-adv-fn` | CSS class | 副詞句関数ラベル |
| `.dg-pp-wrap` | CSS class | PP斜め記法ラッパー |
| `.dg-pp-prep-level` | CSS class | 前置詞（斜め線の上） |
| `.dg-pp-diagonal` | CSS class | 斜め線 |
| `.dg-pp-np-level` | CSS class | 目的語NP（水平線上） |
| `.dg-pp-np-row` | CSS class | NP水平行 |
| `.dg-pp-prep` / `.dg-pp-np` | CSS class | PP内テキスト |
| `.dg-io-wrap` | CSS class | 間接目的語ラッパー |
| `.dg-io-platform-area` | CSS class | raised platform配置エリア |
| `.dg-io-platform` | CSS class | raised platform本体 |
| `.dg-io-platform-text` | CSS class | IO テキスト |
| `.dg-io-platform-fn` | CSS class | IO 関数ラベル |
| `.dg-io-stalk` | CSS class | platform→baselineの茎 |
| `.dg-adv-clause-attach` | CSS class | 従属節L字接続子 |
| `.dg-adv-clause` | CSS class | 従属節ブロック |
| `.dg-adv-clause-label` | CSS class | 従属節ラベル |
| `.dg-rel-clause` | CSS class | 関係節ブロック |
| `.dg-rel-clause-label` | CSS class | 関係節ラベル |
| `.dg-coord-wrap` | CSS class | 等位節コンテナ |
| `.dg-coord-clause` | CSS class | 等位節個別ブロック |
| `.dg-coord-join` | CSS class | 等位接続子 |
| `.dg-coord-join-text` | CSS class | 等位接続詞テキスト |
| `.dg-cc-clause-attach` | CSS class | content clause接続部 |
| `.dg-cc-clause-label` | CSS class | content clauseラベル |
| `.dg-cc-clause` | CSS class | content clause sub-diagram |
| `.dg-slot-mod-zone` | CSS class | 語レベル修飾ゾーン |
| `.dg-slot-mod-cell` | CSS class | スロット別修飾セル |
| `.dg-slot-mod-spacer` | CSS class | connector幅に対応したスペーサー |
| `.dg-appos-wrap` | CSS class | 同格並列記法ラッパー |
| `.dg-appos-head` | CSS class | 同格主要語（破線区切り） |
| `.dg-appos-appositive` | CSS class | 同格語 |
| `.dg-nomc` | CSS class | 名詞化節角括弧記法 |
| `.dg-conjunction` | CSS class | 節上部の接続詞ラベル |
| `.dg-view-label` | CSS class | ラベル（未使用、定義のみ） |
| `.dg-rel-connector-svg` | DOM | SVG関係節connector overlay |
| `dg-token--antecedent` | CSS class | 先行詞トークンのビジュアルマーカー |
| `_dgRenderMainLine` | JS関数 | メインベースライン描画 |
| `_dgRenderSlotModZone` | JS関数 | 語レベル修飾ゾーン描画 |
| `_dgRenderAdvPhrases` | JS関数 | 副詞句ゾーン描画 |
| `_dgRenderAppositionSlot` | JS関数 | 同格スロット描画 |
| `_dgRenderClause` | JS関数 | 節単位描画（RKエントリー） |
| `_dgDrawRelConnectors` | JS関数 | SVG connector描画（post-render） |
| `_annotateRelClauses` | JS関数 | DR treeへの先行詞情報注入 |
| `_dgCollectAntecedentRefs` | JS関数 | 先行詞ref事前収集 |
| `_dgActiveTokenMap` | JS変数 | tokenルックアップ（HDGも依存）※後述 |
| `_dgConjJaMap` | JS変数 | 接続詞ルックアップ（RK専用） |
| `_dgAntecedentRefSet` | JS変数 | 先行詞refセット（RK専用） |
| `_dgJaText` | JS関数 | ノードの日本語テキスト取得 |
| `_dgHeadEntry` | JS関数 | 主要tokenエントリー取得 |
| `_dgAppendTokens` | JS関数 | token chipをcontainerへ追加 |
| `_dgConjJa` | JS関数 | 接続詞日本語取得 |
| `_dgAntecedentJa` | JS関数 | 先行詞日本語取得 |
| `_dgNodeRefs` | JS関数 | nodeからref一覧収集 |
| `_dgOpenDepthPanel` | JS関数 | StudyPanel起動（RK専用） |

### C. Shared Semantic/Data Layer

| 要素 | 種別 | 説明 |
|---|---|---|
| SR JSON | データSSoT | 両rendererの情報源。変更なし。 |
| `sentences[].root` | SR node | 両rendererの起点 |
| `node.type` | SR field | clause / group / phrase.* / token |
| `node.id` | SR field | nodeアイデンティティ |
| `node.function.canonical` | SR field | SUBJECT/PREDICATE等（両方が参照） |
| `node.construction.canonical` | SR field | 構成型（両方が参照） |
| `node.evidence.morph_raw` | SR field | 形態論情報（dg-engine経由でRKが使用） |
| `node.evidence.ref` | SR field | tokenアイデンティティ |
| `node.evidence.nodeId` | SR field | `data-node-id`として付与（両方） |
| `node.children` | SR field | 子ノード（両方が走査） |
| `node.surfaceIndex` | SR field | 語順（engine経由でRKが使用） |
| `node.tokenIds` | SR field | token参照（sentenceRef計算に使用） |
| `.dg-token` | CSS class | クリック可能tokenチップ（両方が使用） |
| `_DG_FN_JA` | JS定数 | fn → 日本語ラベル（両方が参照） |
| `_dgActiveTokenMap` | JS変数 | ref → 日本語/形態データ（両方が依存）※ |
| `openStudyPanel()` | JS関数 | StudyPanel起動（両rendererのtoken clickが使用） |
| `data-node-id` | DOM attribute | StudyPanel接続（両rendererが付与） |
| `_isDGChapter` | JS変数 | 章ゲート（両rendererに適用） |
| `.sd-sentence` | CSS class | 文単位ラッパー（両rendererの外側コンテナ） |
| `.sd-sentence-ref` | CSS class | 句参照表示（両rendererが付与） |
| `.sd-sentence-ref--dg` | CSS class | DG系描画時のref追加スタイル |
| `_formatSentenceRef(sentence)` | JS関数 | 句参照テキスト生成（両rendererが使用） |
| `sentence.ref` | SR field | 句参照文字列 |
| `displayText()` | JS関数（engine） | ノードのGreekテキスト取得（engine内部） |
| `headDisplayText()` | JS関数（engine） | headトークンのGreekテキスト（engine内部） |

**注 `_dgActiveTokenMap`**: 名前は `_dg*` だが機能的にはbible_data lookup mapであり、HDGも依存している。将来的にはリネームが望ましいが、現段階では変更しない。

---

## 5. Hierarchical Visual Grammar

### 5.1 目的

> **Hierarchical = 「文の構造がどのように入れ子になっているかを読むための表示」**

### 5.2 視覚文法定義

| 要素 | 視覚表現 | 意味 |
|---|---|---|
| 主節（depth=0） | 太い左ボーダー + 薄いbg | 文の最上位節 |
| サブ節（depth≥1） | 細い破線左ボーダー + 透明bg | 入れ子の節 |
| 節ラベル | 上部のsmall caps badge | 節の種類（主節/節/従属節/内容節/関係節/同格/分詞節/名詞化節）|
| インデント | `padding-left`による右へのshft | 入れ子の深さ |
| fn badge | 節ラベル上部の小さいラベル | 親節における関数（主語/述語/目的語/副詞的等） |
| collapse ▼/▶ | 節ラベル左端のインジケーター | 開閉可能を示す |
| `.dg-token` chip | 角丸+bg-inset+border | クリック可能な語単位 |
| 前置詞句ブロック | サブ節と同じラベル付きブロック | PP内部構造の可視化 |

### 5.3 HDGが使わないもの

- 水平ベースライン（RK固有）
- 垂直区切り線（RK固有）
- 後退斜め線（RK固有）
- 語レベル修飾斜め線（RK固有）
- IO raised platform（RK固有）
- SVG connector overlay（RK固有）
- 同格並列記法（RK固有）
- 角括弧記法（NOMINALIZED_CLAUSE、RK固有）

---

## 6. RK Visual Grammar

### 6.1 目的

> **RK = 「Reed–Kellogg法による文法関係の空間的可視化」**

### 6.2 視覚文法定義

| 要素 | 視覚表現 | 意味 |
|---|---|---|
| 水平ベースライン | `border-bottom: 2px solid` | 主要文要素の空間軸 |
| S\|P 全高垂直線 | `width:2px; align-self:stretch` | 主語と述語/繋辞の境界 |
| P\|O 短縮垂直線 | `width:2px; height:2rem` | 述語と目的語の境界 |
| P\Complement 後退斜め | CSS `rotate(-38deg)` | 述語と補語の境界 |
| 破線斜め | `border-top: 1.5px dashed` | 動詞省略述定（implied copula） |
| 副詞句L字接続子 | `border-left + border-bottom` | 副詞的要素の附着点 |
| PP斜め記法 | 斜め線+水平行 | 前置詞（上）と目的語（下）の分離 |
| IO raised platform | 上部に独立した段 | 間接目的語の空間的分離 |
| 従属節インデント | 左インデント + 破線左ボーダー | 従属節の埋め込み |
| 関係節SVG connector | SVGパスライン | 関係代名詞から先行詞への接続 |
| 等位節左ボーダー | 共通左ボーダー | 並列関係の視覚化 |
| 同格並列記法 | 上段（破線）+下段 | 同格語の関係 |
| content clause sub-diagram | インデント付き再帰RK図 | 内容節の完全RK展開 |
| 角括弧（名詞化節） | CSS `::before []` | 名詞化節のRK記法 |
| 語レベル修飾ゾーン | ベースライン下の斜め接続子 | 形容詞的/副詞的修飾語のRK記法 |

### 6.3 RKが使わないもの

- 深さによるインデントブロック（HDG固有）
- 節種別ラベル（HDGの `hdg-clause-label` 相当）
- collapse/expand UI（HDG固有）
- DocumentFragmentによるgroup透過（HDG固有）

---

## 7. Shared Semantic Layer

両rendererが共有する意味データは **SR JSON のみ**。

### 7.1 SR JSONの役割

```
SR JSON（SSOT）
├─ clause type（construction.canonical）  ← 両方が使用
├─ function（function.canonical）         ← 両方が使用
├─ token identity（evidence.ref）         ← 両方が使用
├─ morphology（evidence.morph_raw）       ← RKのみ（engine経由）
├─ surface order（surfaceIndex）          ← RKのみ（engine経由）
└─ node identity（id / evidence.nodeId）  ← 両方（data-node-id）
```

### 7.2 「二重化しない」原則の確認

現在の実装は正しく二重化を避けている。

```
SR JSON
├─→ dg-engine.js → DR → RK Renderer
└─→ HDG Renderer（直接）
```

DR は RK renderer 専用の中間表現であり、HDG renderer は DR を使わない。  
「SR JSON → Hierarchical JSON」という第2の変換層は作らない。

---

## 8. Renderer Boundary

### 8.1 明示的境界

| 境界 | Hierarchical | Reed-Kellogg |
|---|---|---|
| 入力 | SR node（直接） | DR_Clause（dg-engine経由） |
| エントリー関数 | `_hdgRenderSentence(sentence)` | `_dgRenderClause(dr)` |
| 前処理 | なし | `deriveDR(root)` + `_annotateRelClauses` + `_dgCollectAntecedentRefs` |
| 後処理 | `_hdgAttachFold()` | `_dgDrawRelConnectors()` |
| 出力先 | `.hdg-view` 内の `.hdg-sentence` | `.dg-view` 内の `.dg-clause` |
| トークンチップ | `.dg-token`（共有） | `.dg-token`（共有） |
| 関数ラベル | `_DG_FN_JA`（共有） | `_DG_FN_JA`（共有） |

### 8.2 SR節タイプ別のrenderer挙動

| SR construction | HDG の処理 | RK の処理 |
|---|---|---|
| clause（none） | `.hdg-clause--sub`（「節」ラベル） | `dg-main-line` + slots |
| WORD_ORDER | `.hdg-clause--root` / `--sub` | `dg-main-line` + slots |
| COORDINATION | 等位節として各子clauseをhdg-slot | `dg-coord-wrap` |
| CONJOINED_CLAUSE | 接続詞+内部節のslot | `dg-conjunction` + slots |
| SUBORDINATE_CLAUSE | `--sub`（「従属節」ラベル） | `dg-adv-clause` + slots |
| CONTENT_CLAUSE | `--sub`（「内容節」ラベル） | `dg-cc-clause-attach` + sub-diagram |
| CLAUSE_AS_NP | `--relative`（「関係節」ラベル） | slot内に `embeddedRelClauses` |
| NOMINALIZED_CLAUSE | `--sub`（「名詞化節」ラベル） | `.dg-nomc` 角括弧 |
| PARTICIPIAL_CLAUSE | `--sub`（「分詞節」ラベル） | `dg-adv-clause-participial` |
| APPOSITION | `--apposition`（「同格」ラベル） | `.dg-appos-wrap` 並列記法 |
| PREP_PHRASE | `.hdg-phrase.hdg-cs-prep-phrase` | （phrase.npの場合、engineで無視） |
| phrase.pp | `--pp`（「前置詞句」ラベル） | `dg-pp-wrap` 斜め記法 |
| GENITIVE_MOD | hdg-phrase内に展開 | `dg-slot-mod-zone`（属格修飾） |
| ADV_MOD | hdg-phrase内に展開 | `dg-slot-mod-zone`（副詞的修飾） |
| ADJ_MOD | hdg-phrase内に展開 | `dg-slot-mod-zone`（形容詞的修飾） |

---

## 9. DOM Boundary

### 9.1 `.sd-sentence` 内の構造

```html
<!-- 共通コンテナ（両renderer） -->
<section class="sd-sentence" data-ref="JHN 1:1">
  <div class="sd-sentence-ref sd-sentence-ref--dg">1:1</div>

  <!-- HDGパスの場合 -->
  <div class="hdg-view">
    <div class="hdg-sentence">
      <div class="hdg-clause hdg-clause--root" data-node-id="…" data-hdg-depth="0">
        <div class="hdg-clause-label">主節</div>
        <div class="hdg-slots">
          <div class="hdg-slot hdg-slot-subject" data-node-id="…">
            <span class="hdg-fn">主語</span>
            <!-- token / phrase / nested clause -->
          </div>
          <!-- more slots... -->
        </div>
      </div>
    </div>
  </div>

  <!-- RKパスの場合（HDGがfalseの場合） -->
  <div class="dg-view">
    <div class="dg-clause">
      <div class="dg-main-line">
        <!-- connector + slots -->
      </div>
      <!-- modifiers / adverbials / subclauses -->
    </div>
    <!-- SVG overlay（dg-rel-connector-svg） -->
  </div>
</section>
```

### 9.2 DOM要素の所属まとめ

| DOM要素 | 所属 |
|---|---|
| `.sd-sentence` | Shared |
| `.sd-sentence-ref` | Shared |
| `.sd-sentence-ref--dg` | Shared（DG系章に適用） |
| `.hdg-view` | Hierarchical専属 |
| `.hdg-sentence` | Hierarchical専属 |
| `.hdg-clause*` | Hierarchical専属 |
| `.hdg-slots` | Hierarchical専属 |
| `.hdg-slot*` | Hierarchical専属 |
| `.hdg-fn` | Hierarchical専属 |
| `.hdg-phrase*` | Hierarchical専属 |
| `.hdg-conj` | Hierarchical専属 |
| `.dg-view` | RK専属 |
| `.dg-clause` | RK専属 |
| `.dg-main-line` | RK専属 |
| `.dg-slot*` | RK専属 |
| `.dg-conn-*` | RK専属 |
| `.dg-adv-*` | RK専属 |
| `.dg-pp-*` | RK専属 |
| `.dg-io-*` | RK専属 |
| `.dg-rel-*` | RK専属 |
| `.dg-coord-*` | RK専属 |
| `.dg-cc-*` | RK専属 |
| `.dg-slot-mod-*` | RK専属 |
| `.dg-appos-*` | RK専属 |
| `.dg-nomc` | RK専属 |
| `.dg-token` | **Shared** |
| `.dg-token--antecedent` | RK専属（先行詞マーカー） |
| `.dg-rel-connector-svg` | RK専属（SVG） |
| `data-node-id` | **Shared** |
| `data-hdg-depth` | Hierarchical専属 |
| `data-ant-ref` | RK専属 |
| `data-dg-ref` | RK専属 |

---

## 10. CSS Boundary

### 10.1 CSS class分類

すべてのダイアグラム関連CSSは `public/index.html` の `<style>` ブロック内に記述されている（`public/css/` ファイルには存在しない）。

| CSSブロック | 行数（概算） | 分類 |
|---|---|---|
| `.sd-sentence` / `.sd-sentence-ref` | 4251〜4250 | Shared |
| `/* P5 Reed-Kellogg */` ブロック | 4251〜4618 | RK専属 |
| `/* C-17 Step 1: HDG */` ブロック | 4620〜4750 | Hierarchical専属 |

### 10.2 Shared CSS

```css
/* これらはShared: */
.sd-sentence { … }
.sd-sentence-ref { … }
.sd-sentence-ref--dg { … }
.dg-token { … }         /* RK命名だが両rendererで使用 */
.dg-token:hover { … }
.dg-token--antecedent { … }  /* RK専属（antecedent marker） */
```

### 10.3 Design Token依存

両rendererともに `css/tokens.css` のデザイントークンを使用する。

```css
--color-domain   /* HDG: ボーダー・ラベル色 / RK: rel-clause色 */
--bg-inset       /* Shared: token chip背景 / HDG: root clause背景 */
--border         /* Shared: token chip枠 */
--text-main      /* Shared: テキスト色 */
--text-sub       /* Shared: サブテキスト・線色 */
--text-caption   /* Shared: 小さいラベル */
--radius-s       /* Shared: token chip角丸 */
--space-xs / --space-md  /* Shared: spacing */
```

---

## 11. JS Function Boundary

### 11.1 dg-engine.js（変更なし）

```
dg-engine.js
  Public API（window.DgEngine）:
    deriveDR(sentenceRoot)           → DR_Clause（RK専用）
    displayText(node)                → Greek text（engine内部）
    headDisplayText(node, headSIs)   → Greek text（engine内部）
    deriveRelativeConnectors(root, bdByRef, bdById)  → RK専用

  Internal（RK DR derivation専用）:
    deriveClauseCore / deriveFromGroup / deriveFromNode
    connectorBetween                 ← RK固有ロジック
    extractSlotModifiers / extractPPStructure
    _extractEmbeddedRelClauses / _extractContentClause
    _extractAdjMod / extractSlotModifiers
    isParticiple / isRelPronToken / isGenitiveToken / allGenitiveTokens
    _isNominalMorph / _findRelPronInSubtree / _isEmptyDR
    _collectRelPronTokens / minSI / getTokens
```

### 11.2 index.html内JS（RK renderer）

```
_dgNodeRefs / _dgJaText / _dgHeadEntry / _dgAppendTokens
_dgConjJa / _dgAntecedentJa / _dgOpenDepthPanel
_dgCollectAntecedentRefs / _annotateRelClauses
_dgRenderMainLine / _dgRenderSlotModZone / _dgRenderAdvPhrases
_dgRenderAppositionSlot / _dgRenderClause
_dgDrawRelConnectors
```

### 11.3 index.html内JS（HDG renderer）

```
_hdgTokenEl / _hdgPPEl / _hdgClauseAsNpEl / _hdgAppositionEl
_hdgPhraseEl / _hdgGroupEl / _hdgClauseEl / _hdgChildEl
_hdgNodeEl / _hdgRenderSentence
_hdgAttachFold / _hdgToggleFold
```

### 11.4 index.html内JS（Shared）

```
_renderStructuralDiagramView  ← 両rendererのエントリーラッパー
_formatSentenceRef            ← 句参照フォーマット
_sdCollectJaByRef             ← 日本語参照収集（非DG fallback）
_sdRenderNode                 ← 非DG章のfallback renderer
```

### 11.5 index.html内JS（Shared定数）

```
_DG_FN_JA                     ← fn → 日本語（両renderer使用）
_HDG_CS_LABEL                 ← construction → 節ラベル（HDG使用）
_dgActiveTokenMap             ← ref → token data（両renderer使用）
_isDGChapter                  ← 章ゲート（両renderer適用）
_hdgInitViewParam             ← URLパラメータ取得（HDG起動判定）
_hdgViewMode                  ← 現在のHDG/RK選択
```

---

## 12. Data Boundary

### 12.1 各rendererのデータ消費

| データ | HDG | RK | dg-engine |
|---|---|---|---|
| SR JSON（sentences[].root） | 直接走査 | engine経由 | 処理 |
| node.type / .construction / .function | 直接参照 | engine経由 | 処理 |
| node.evidence.ref | 直接（token lookup） | engine経由 | 参照 |
| node.evidence.morph_raw | 不使用 | engine経由 | 処理 |
| node.surfaceIndex | 不使用 | engine経由（ソート） | 処理 |
| _dgActiveTokenMap | 直接（Japanese text） | 直接（Japanese text） | 不使用 |
| bible_data（elData） | 不使用 | 使用（rel connector） | deriveRelativeConnectors |
| DR_Clause（dg-engine出力） | **不使用** | 使用 | 生成 |

### 12.2 SR JSONはSSOT

SR JSONを変更しない。  
HDG/RK splitはデータモデルの変更を必要としない。

---

## 13. UI / Reading Mode Specification

### 13.1 現在の状態

| モード | UIラベル | 起動方法 | 実装状態 |
|---|---|---|---|
| 語順フロー | FLOW | DISPLAY_MODE_REGISTRY entry | 完成・変更なし |
| Reed-Kellogg | （internal名） | 構文ダイアグラムモードのデフォルト | 完成 |
| Hierarchical | （internal名） | `?view=hierarchical` URLパラメータ | 開発POC |

現在のUIでは「構文ダイアグラム」は単一モードとして登録されており、HDG/RK切り替えはURL paramのみ。

### 13.2 必要な最終状態

```
[ 語順フロー ] [ 階層 ] [ RK ]
```

3つは独立した reading mode として扱う。

### 13.3 UI実装のオプション分析

**Option A: DISPLAY_MODE_REGISTRYに2エントリーを追加**
```javascript
{ kind: 'structural-hierarchical', label: '階層' },
{ kind: 'structural-rk', label: 'Reed-Kellogg' },
```
`structural-diagram` エントリーを削除。

- メリット: UI統一、URL状態管理が自然
- デメリット: `_toColumnMode()` 等の既存ColumnMode変換経路に変更が必要

**Option B: structural-diagramをumbrellaとして維持し、内部sub-toggleを追加**
```
structural-diagram モード内に [階層] [RK] のsub-toggle
```
- メリット: 既存ColumnMode経路を変更しない
- デメリット: モードの概念が二重になる（ColumnModeとsub-toggle）

**DECISION REQUIRED**: UI実装方針（Option A vs B）は人間判断が必要。

### 13.4 現在のURLパラメータとの互換性

`?view=hierarchical` は開発トグルとして使われてきた。  
本番UIへの移行時には、このパラメータ方式を廃止するかURLStateに組み込むかを決定する必要がある。

**DECISION REQUIRED**: `?view=hierarchical` の廃止・移行方針。

---

## 14. C-17 Existing Work Reassessment

### 14.1 C-17 Step 1〜5の評価

| Step | 内容 | 新仕様との整合 | 判定 |
|---|---|---|---|
| Step 1 | HDG Renderer基盤、?view=hierarchical | SR直接走査は正しい設計 | ✅ 維持 |
| Step 2 | CLAUSE_AS_NP/APPOSITION/SUBORDINATE_CLAUSE/CONTENT_CLAUSEラベル | Hierarchical視覚文法として正当 | ✅ 維持 |
| Step 3 | phrase.pp → 前置詞句ブロック | Hierarchical視覚文法として正当 | ✅ 維持 |
| Step 4 | hdg-slot常時column化、group DocumentFragment透過化 | 設計として正しい | ✅ 維持 |
| Step 5-A | collapse設計レポート | 設計通り実装済み（5-B） | ✅ 参照のみ |
| Step 5-B | collapse実装 | BROWSER-VERIFIED | ✅ 維持 |

**全C-17実装はそのまま維持する。設計分離後に変更が必要な部分はない。**

### 14.2 問題点として記録されていた課題の現在状態

| 課題 | 現状 | 判定 |
|---|---|---|
| `?view=hierarchical` URL paramのみでの切り替え | UI toggle未実装（Step 5未着手として記録済み） | 新規実装が必要 |
| COL 1:9長大構造 | collapse（Step 5-B）で対処済み | 解決済み |
| NP_COMPLEX横並び/縦積み制御 | Step 4で「許容する」確定 | 解決済み |
| HDGとmemo機能の接続 | `data-node-id`付与済み | 実装保留 |

---

## 15. Migration Strategy

### 15.1 段階的アプローチ

**Phase 1（現在）**: 設計確定（このドキュメント）  
**Phase 2**: UI toggle実装（Option A or B、人間判断後）  
**Phase 3**: Chapter gate拡張（全書に対応）  
**Phase 4**: 本番リリース準備

### 15.2 Phase 2の実装スコープ（概算）

UI toggleの最小実装（Option B例）:

1. `_hdgViewMode` 決定ロジックをURL paramからUI状態へ切り替え
2. `.hdg-view` / `.dg-view` の切り替えハンドラー追加
3. URL state管理への統合（現在の `transA/transB` パターンと整合）

変更対象: `public/index.html` のみ  
変更禁止: `dg-engine.js` / SR JSON / dg- CSS / hdg- CSS

---

## 16. Regression Risks

### 16.1 実装時のリスク

| リスク | 影響範囲 | 軽減策 |
|---|---|---|
| UI toggle実装でURL state破壊 | ブックマーク・共有URL | 既存URLパラメータ互換性を維持 |
| `_dgActiveTokenMap` init順序変更 | 両renderer | 初期化ロジックを変更しない |
| `_isDGChapter` 拡張時の性能問題 | 全書 | 段階的に書を追加 |
| `.dg-token` CSSの変更 | 両renderer | 変更しない |
| `_DG_FN_JA` の変更 | 両renderer | 変更しない |
| RK rendererへのHDG要素混入 | RK表示 | 分離を維持する |
| HDG rendererへのDR依存追加 | HDG表示 | SR直接走査を維持する |

### 16.2 現行の回帰確認

C-17 Step 5-B QA（BROWSER-VERIFIED）より:

```
dg-view count: 57（RK mode正常動作確認済み）
hdg-view count: 0（RK mode時HDGなし確認済み）
書: JHN 1 / COL 1 / EPH 2 / MAT 28 / ROM 6 / PHP 2（全PASS）
```

---

## 17. Implementation Scope

### 17.1 今回のフェーズ（設計のみ）

このドキュメントが成果物。コード変更: 0。

### 17.2 次フェーズ（UI toggle実装）

Priority 1:
- UI mode選択（Option A or B確定後）
- `?view=hierarchical` → UI状態への移行

Priority 2:
- Chapter gate拡張（全書対応）

Priority 3:
- HDGとmemo機能の接続（`data-node-id` 利用）
- localStorage状態保存（折りたたみ状態）
- 「全て折りたたむ/展開」ボタン

### 17.3 実装が必要な変更ファイル

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `public/index.html` | FEATURE | UI toggle（Phase 2） |
| `public/index.html` | COVERAGE | Chapter gate拡張（Phase 3） |
| `dg-engine.js` | なし | 変更不要 |
| SR JSON | なし | 変更不要 |
| `public/css/` | なし | 変更不要 |

---

## 18. Explicit Non-Goals

以下は今回のスコープ外。

- dg-engine.jsの変更
- SR JSONの変更  
- 新たなDRスキーマ（"HDG-DR"等）の追加
- HDG rendererのDR依存化
- `css/components.css` / `css/layout.css` / `css/tokens.css` の変更
- `.dg-token` チップの変更
- `_DG_FN_JA` の変更
- 既存RK rendererの挙動変更
- 既存HDG rendererの挙動変更
- LXX / 7書以外への即座の拡張
- StudyPanel / memo機能の変更

---

## 19. Final Design Decision

### 確定事項

以下はすべて設計として確定。実装判断を要しない。

| 決定 | 内容 |
|---|---|
| Hierarchicalの目的 | 文の構造がどのように入れ子になっているかを読むための表示 |
| RKの目的 | Reed–Kellogg法による文法関係の空間的可視化 |
| データモデル | SR JSON を SSOT として、HDGは直接走査、RKはengine(DR)経由。二重化しない。 |
| 責務境界 | HDG = SR直接走査; RK = DR経由。境界は現実装で既に成立している。 |
| dg-engine.js | 変更不要。RK専用中間層として機能が完結している。 |
| SR JSON | 変更不要。両rendererの情報源として完全。 |
| `.dg-token` | Shared。両rendererのtoken chip視覚文法として維持。 |
| `_DG_FN_JA` | Shared。両rendererの関数ラベルとして維持。 |
| C-17 Step 1〜5-B | 全て維持。新仕様と矛盾なし。 |
| 「混合実装」の除去 | 不要。現実装はすでに分離されている。 |
| `.dg-adv-clause` / `.dg-rel-clause` 等 | RK固有として維持。RK視覚文法として正当。 |
| `_hdgGroupEl` DocumentFragment | 維持。group透過化は正しい設計。 |

### DECISION REQUIRED（人間判断）

| # | 判断事項 | 選択肢 |
|---|---|---|
| D-1 | UI 3モードの実装方式 | A: DISPLAY_MODE_REGISTRY 2エントリー / B: sub-toggle |
| D-2 | `?view=hierarchical` URLパラメータの廃止方針 | 廃止 / URLStateへ統合 / 互換維持 |

---

## Design Freeze Checklist

| 条件 | 状態 | 証拠 |
|---|---|---|
| Hierarchicalの目的が一文で定義されている | ✅ | §5.1 |
| RKの目的が一文で定義されている | ✅ | §6.1 |
| 両者の責務境界が明確 | ✅ | §8, §11 |
| すべての主要DOM要素の所属が決まっている | ✅ | §9.2 |
| CSS責務が分離されている | ✅ | §10 |
| JS renderer責務が分離されている | ✅ | §11 |
| Shared semantic/data layerが明確 | ✅ | §7 |
| C-17既存実装の扱いが決まっている | ✅ | §14 |
| 現在のRKから何を剥がすか決まっている | ✅ | 剥がすものなし（§3.2） |
| UIの3モード仕様が確定している | ⚠️ **DECISION REQUIRED** | D-1, D-2 |
| SR JSON / dg-engine.jsを変更する必要があるか判定されている | ✅ | 変更不要（§12, §17.2） |
| 実装順序が決まっている | ✅ | §15 |
| Regression strategyが決まっている | ✅ | §16 |

---

**DESIGN PHASE COMPLETE（UI仕様D-1/D-2を除く）**

```
CODE CHANGES: 0
COMMIT: なし
PUSH: なし
```
