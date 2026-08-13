# SF-1 現状実装監査 — 「この語の構造上の位置づけ」UI

対象: Structure Flow UI 再設計（左→右 Reading Flow 化）の前提となる現状監査
作成: 2026-08-11
State: STATIC_AUDIT（READ ONLY・コード変更なし）
Evidence 区分: CLAUDE.md §22 に従い各項目に付す

> 本書は「現在アプリが実際に持っている構造とデータフロー」を記録する。
> 「こうあるべき」という再解釈は含まない（それは SF-3 以降）。

---

## 0. 結論（先に要約）

- 「この語の構造上の位置づけ」UI の実体は **NeighborhoodView**（`public/core/neighborhood-view.js`）である。`CONFIRMED`
- MAT 1:1 のみ inline prototype（`_FT11_*`）、**それ以外（John 6:37 を含む）は runtime asset**（`public/assets/data/flow-tree/{BOOK}/{ch}.json`）を読む一般化経路で動作する。`CONFIRMED`
- 現在の表示は `_ft11RenderList()` による **上→下ネスト `<ul>` インデント**。`CONFIRMED`
- Representation の Node は `{id, parentId, type, tokens[], children[]}` を持ち、**parent/child・token range・structural order を保持している**。左→右再設計に必要な構造情報は**すでに存在する**（新データモデル不要）。`CONFIRMED`
- ただし X 軸（surface order）と Y 軸（structural nesting）は**別概念**であり、後置語（δέ 等）で両者が一致しない場合がありうる（設計文書 neighborhood-view-design.md §5 が明記）。John 6:37 では不一致は発生しない。`CONFIRMED`（John 6:37）／`INFERRED`（一般ケースの破綻可能性 → SF-3/4 で評価）

---

## 1. Lowfat のどの情報を使っているか `CONFIRMED`

Runtime では Lowfat XML を直接読まず、**事前生成済み Flow Tree JSON** を読む。

- Adapter: `public/core/flow-tree-adapter.js` `parseLowfatXml()` / `convertElement()`
  - Lowfat の `<w>` → `word` ノード、`<wg>` → `class` 属性を `CLASS_MAP` で変換したノード。
  - `CLASS_MAP`（[flow-tree-adapter.js:32-41](../../public/core/flow-tree-adapter.js#L32)）:
    `cl→clause` / `np→phrase.np` / `pp→phrase.pp` / `vp→phrase.vp` / `adjp→phrase.adjp` / `advp→phrase.advp` / `nump→phrase.nump` / `adv→phrase.adv` / `conj→phrase.conj`
  - `class` 属性なしの `<wg>` → `group`（推測せず構造的パススルー、[flow-tree-adapter.js:116-120](../../public/core/flow-tree-adapter.js#L116)）
  - 未知 `class` → `null`（Failure Mode、暗黙変換しない）
- 各ノードが使う Lowfat 情報は **`class`（→type）と入れ子構造（parent/child）と `ref`（token 参照）のみ**。role/rule/semanticRole は View では使わない（§6 後述）。

## 2. token の所属構造をどこで保持しているか `CONFIRMED`

- runtime asset `public/assets/data/flow-tree/{BOOK}/{ch}.json`
  - top keys: `book`, `chapter`, `sentences[]`, `refIndex{}`（実測）
  - `refIndex[ref] = sentences 配列の index`（その token が属する sentence root）
  - 各 Node schema（[flow-tree-adapter.js:102-144](../../public/core/flow-tree-adapter.js#L102)）:
    ```
    { id, parentId, type, tokens: string[], children: Node[] }
    ```
  - `wg` ノードの `tokens` = 子孫の全 `<w>` の ref（`_descendantWords`）。つまり**そのノードが覆う token 全体**。
- ローダ: `_loadFlowTreeChapter()`（[index.html:9503](../../public/index.html#L9503)）が chapter JSON を fetch し `_flowTreeChapterCache` にキャッシュ（null もキャッシュ＝静音）。
- root 取得: `_flowTreeRootForRef()`（[index.html:9514](../../public/index.html#L9514)）が `refIndex[ref]` → `sentences[idx]`。
- `nodesById` は保存 JSON に持たず `_flowTreeNodesById()`（[index.html:9520](../../public/index.html#L9520)）が root walk で再構築。

## 3. clause / phrase の区別 `CONFIRMED`

`type` 値で区別する（Lowfat `class` 由来）。John 6:37 sentence 内で実在するのは:
`clause` / `phrase.np` / `phrase.pp` / `phrase.advp` / `group` / `word`（実測）。

NeighborhoodView の anchor 探索は **`type === 'clause'` のみ**を節境界として扱う（`CLAUSE_TYPE='clause'`、[neighborhood-view.js:57,119-130](../../public/core/neighborhood-view.js#L119)）。phrase.* / group は節としては扱わない。

## 4. parent / child `CONFIRMED`

- child: 各ノードの `children[]`（Lowfat の子要素列挙順を保持＝structural order）。
- parent: 各ノードの `parentId`（root は `null`）。
- NeighborhoodView での利用:
  - focus node 特定: `_findFocusNode()` — id 直接一致、または `type==='word'` かつ `tokens[0]===ref`（[neighborhood-view.js:71-87](../../public/core/neighborhood-view.js#L71)）。
  - anchor 特定: focus から `parentId` を辿り（`_buildParentChain`）、**直近の `clause` 祖先**を anchor。無ければ最上位祖先（sentence root 相当）を fallback anchor（`usedFallback=true`）（[neighborhood-view.js:119-130](../../public/core/neighborhood-view.js#L119)）。

## 5. sibling `CONFIRMED`

- 表示される「構成語群（constituents）」= **anchor の直接の子** をそのまま列挙（[neighborhood-view.js:194](../../public/core/neighborhood-view.js#L194)）。対象語自身を含む兄弟をそのまま並べる（兄弟関係を詐称しない、design §6）。
- 各 constituent は `_toViewModelNode()` で `{nodeId, tokens, isFocus, expanded, children}` へ変換。
  - `isFocus = node.id === focusId`
  - `expanded = hasChildren && _isOnPath(node, focusId)`（＝focus への経路上にあり子を持つ、構造事実。表示制御ではない — design §4）
  - `children` は expanded に関係なく**常に保持**（省略しない）。

## 6. 表示順は何で決まるか `CONFIRMED`

- **constituent 間（縦の並び）**: anchor.children の配列順＝**structural order**（Lowfat 記述順）。並べ替えなし。
- **1 ノード内のラベル文字列（token 連結）**: `_ft11LabelOf()`（[index.html:9446](../../public/index.html#L9446)）が tokens を **surface order（ref の `!n`）に並べ替えてから**日本語を連結。
  - ⇒ **縦の並び＝structural order / ラベル内の語順＝surface order** という二本立て。`CONFIRMED`
- ラベルの日本語値: `_flowTreeJaForRef()`（[index.html:9454](../../public/index.html#L9454)）が MAT 1:1 は `_FT11_JAPANESE`、それ以外は `_cachedElByVerse`（bible_data の既存 `japanese`）を参照。新規生成・推論なし。

## 7. 現在の Renderer `CONFIRMED`

- エントリ: `_buildFlowTreeNeighborhoodViewHTML(ref)`（[index.html:9534](../../public/index.html#L9534)）
  - MAT 1:1: `_ft11BuildFlowTree()`（inline `_FT11_SENTENCE_XML` を Adapter に通す）
  - それ以外: `_flowTreeParseRef` → `_loadFlowTreeChapter` → `_flowTreeRootForRef` → `{root, nodesById}`
  - `window.App.neighborhoodView.buildNeighborhoodView(representation, ref)` で Model を得る。
  - `nv.constituents.map(_ft11ToRenderItem)` → `_ft11RenderList(items)` で HTML 化。
  - 例外は全て `catch` で `''`（Failure Mode: 既存表示に影響しない）。
- `_ft11ToRenderItem()`（[index.html:9470](../../public/index.html#L9470)）: VM Node → `{label, isFocus, expanded, children}`。label 生成のみ Renderer 責務。
- `_ft11RenderList()`（[index.html:9478-9486](../../public/index.html#L9478)）: **再帰 `<ul>/<li>`**。
  - `<li>` に `border-left:2px solid` のインデント罫、focus は `font-weight:600`、`expanded && children` のときのみ子 `<ul>` を `padding-left:16px` で展開。

## 8. DOM 生成箇所 `CONFIRMED`

- HTML 文字列は `_buildFlowTreeNeighborhoodViewHTML` が組み立て、`<details class="rn-level-section" id="rn-flowtree-neighborhood">` として返す（[index.html:9563-9570](../../public/index.html#L9563)）。
  - `<summary>` = 「この語の構造上の位置づけ」
  - body に「Lowfat由来の構造情報（所属節を単位として表示 …）」の注記 + `<ul>` リスト。
- 差し込み先: StudyPanel（word モード）の Reading Notes 本体。変数 `neighborhoodViewHTML`（[index.html:5590](../../public/index.html#L5590)）を、テンプレート内 [index.html:5794](../../public/index.html#L5794) に埋め込む（`${observationHTML}` 等の並び、`LEVEL 2「単語を詳しく調べる」` の直前）。
- innerHTML 化は Reading Notes 全体の全置換経路（`reading-notes-area.innerHTML`）に含まれる。この UI 専用の独立 DOM 書き込みはない。

---

## 9. 左→右再設計に対する事実ベースの含意（評価は SF-3 へ回す）

1. **必要な構造情報は既存**: parent(`parentId`) / child(`children`) / token range(`tokens`) / structural order(children 配列) / surface order(ref `!n`) が全て Representation から取れる。**新データモデル・Reading Engine 変更は不要**（STOP 条件 2,3 に非該当）。`CONFIRMED`
2. **X 軸候補は surface order（ref `!n`）**、**Y 軸候補は tree depth**。両者は別概念。`CONFIRMED`
3. **潜在リスク（SF-3/4 で評価必須）**: structural order ≠ surface order の節（後置 δέ 等）では、あるノードの token range が surface 上で非連続になり、左→右レーン表示が交差しうる。John 6:37 では全ノードの token range が連続で、この破綻は発生しない。一般ケースの破綻可能性は STOP 条件 7 に関わるため SF-3/4 で必ず判定する。`CONFIRMED`（6:37）/`NOT VERIFIED`（全書）
4. **表示層のみで解決可能**: 変更対象は `_ft11RenderList`（と必要なら `_ft11ToRenderItem` の透過項目追加）＋ CSS。`buildNeighborhoodView` / Adapter / bible_data は不変で足りる見込み。`INFERRED`（SF-5 で確定）

---

## 付録: John 6:37 実測ツリー（抜粋・focus=`JHN 6:37!1`）

anchor（直近 clause）= `clause 037001-037009`。その直接の子＝constituents:

```
clause 037001-009  … πᾶν ὃ δίδωσίν μοι ὁ πατὴρ πρὸς ἐμὲ ἥξει
├─ phrase.np 037001-006   すべての／〜するもの／与える／私／［冠詞］／父   ← focus を含む(expanded)
│   ├─ word 037001  すべての  ← focus
│   └─ clause 037002-006
│       ├─ word 037002  〜するもの
│       ├─ word 037003  与える
│       ├─ word 037004  私
│       └─ phrase.np 037005-006  ［冠詞］父
├─ phrase.pp 037007-008   〜のもとに／私
└─ word 037009            来る
```

（sentence root はさらに上位の `clause 037001-038018` で、6:37 全体＋6:38 を含む。anchor は sentence root ではなく直近 clause である点に注意。）
