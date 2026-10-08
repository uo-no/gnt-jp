# RK-ARCH-04 Phase 3-5 Implementation Report
# Coordination Geometry + Relative Clause Geometry

**Date**: 2026-09-09  
**Module**: `public/core/rk-geometry-layout.js`  
**Phase**: RK-ARCH-04 Phase 3-5  
**Status**: VALIDATED

---

## Objective

Phase 3-5 は Coordination Geometry（等位接続節の幾何学的配置）と Relative Clause Geometry（関係節の幾何学的配置）を実装する。

出力型として `GCoordStackNode`, `GCoordClauseNode`, `GRelClauseNode`, `GAntecedentLink` を追加し、Phase 3-4 までの全アーキテクチャを維持したまま Phase 3 を完成させる。

---

## Change Type

`FEATURE` — Phase 3 の残存機能実装。既存出力構造の破壊なし。

---

## In Scope

- `GCoordStackNode` / `GCoordClauseNode` の幾何学配置（`_buildGRootNode` Step 10）
- `GRelClauseNode` の幾何学配置（`buildRKGeometryLayout`）
- `GAntecedentLink` の anchor 解決（`_findSlotBySi` ヘルパー）
- Phase 3-4 以前の全出力に対する無回帰確認
- NT-wide 8,010 sentences 処理確認

## Out of Scope

- SVG 描画（Phase 4）
- `antecedentRef` の解決（`_annotateRelClauses` は `index.html` 側処理）
- conjunction の装飾・折れ線描画

---

## Implementation

### 新規追加: `_findSlotBySi(gRoot, targetSi, depth)`

`antecedentSi` で指定されたスロットを GRootNode ツリーから再帰検索する。

探索順序：
1. `root.slots` — 直接スロット
2. `slot.innerDiagram` — ContentClause 内部
3. `root.coordStack.clauses[].innerRoot` — 等位節内スロット
4. `root.adverbials[].innerDiagram` — 副詞節内スロット

depth > 10 でガード打ち切り。

### Step 10: Coordination Zone（`_buildGRootNode` 内）

Phase 2 契約:
- `plRoot.coordStack.clauses[].conjunction` — 接続詞 (string | null)
- `plRoot.coordStack.clauses[].innerRoot` — PLRootNode（PLPageLayout ではない）

配置方針:
- 等位節ゾーンは Adverbial Zone の下端（`maxContentBottom` 追跡後）から `zoneGapPx` を加えた位置から開始
- 各 `GCoordClauseNode` は `_buildGRootNode` の再帰呼び出しで完全な GRootNode を構築
- 各節は垂直に積み上げ（`coordY` を節底 + `zoneGapPx` で更新）
- `offsetX` を共有して親ダイアグラムと水平基準を揃える

### Step 11: Root Frame（更新）

`rightEdges` に `gCoordClauses.map(cc => cc.frame.x + cc.frame.width)` を追加し、等位節を含む正確な Root 幅を確保。

### `buildRKGeometryLayout` 更新: gRelClauses + gAntecedentLinks

**gRelClauses**:
- `pageLayout.relClauses[]` を走査
- `innerPageLayout` がある場合は `_buildGRootNode` で再帰ビルド
- `innerPageLayout` が null の場合は `width=0, height=0` のゼロ frame で記録
- 各 GRelClauseNode は root.frame.height 以降の y 座標に配置

**gAntecedentLinks**:
- `pageLayout.antecedentLinks[]` を走査（Node.js テスト環境では常に空）
- `_findSlotBySi` で先行詞スロットを検索
- 解決成功: `antecedentAnchor = { x: slot.anchors.centerX, y: slot.anchors.bottom }`
- 解決失敗: `antecedentAnchor = null`（例外なし、安全失敗）
- `relClauseAnchor = { x: rc.frame.x, y: rc.frame.y }`（リンク先の top-left）

---

## Test Results

テストスクリプト: `test-rk-gl-35.js`

### Section A: Static Audit
- 禁止依存 (DOM/SVG/window.*): **PASS** — 検出 0
- Phase 3-5 新規シンボル 9件: **PASS** 全確認
- Phase 3-4 既存シンボル回帰 2件: **PASS**

### TEST 1: 1CO 11:8 — Coordination basic (2 clauses)
```
coordStack.type = GCoordStackNode   PASS
coordStack.clauses.length = 2       PASS
cc[0]: SUBJECT(si=3)/COPULA/COMPLEMENT スロット PASS
cc[1]: SUBJECT/COMPLEMENT スロット   PASS
垂直スタック (cc[1].y = cc[0].bottom + zoneGapPx) PASS
外部ベースライン以降に配置           PASS
coordStack frame が全節を包含        PASS
root frame が coordStack を包含      PASS
全 dimension 値 finite/positive     PASS
```

### TEST 2: 1CO 10:31 — Coordination with nested adverbials
```
coordStack.clauses.length = 2       PASS
cc[0].adverbials.length = 3         PASS
cc[1].adverbials.length = 1         PASS
各副詞句が内部 baseline 以降に配置   PASS
内部 frame が副詞句最下端を包含      PASS
節間オーバーラップなし              PASS
全 dimension 値 finite/positive     PASS
```

### TEST 3: 1CO 10:11 — Relative Clause geometry
```
relClauses.length >= 1              PASS
rc.type = GRelClauseNode            PASS
rc.innerDiagram.type = GRootNode    PASS
rc.antecedentRef = null (expected)  PASS
rc.antecedentSi = null (expected)   PASS
rc.frame.width/height > 0           PASS
rc.frame.y >= root.frame.height     PASS
rc.frame = innerDiagram.frame       PASS
gl.height >= rc.frame.bottom        PASS
antecedentLinks = [] (test env)     PASS
```

### TEST 4: Antecedent Link resolves (synthetic)
```
si=3 (SUBJECT in coord clause 0) を注入
antecedentLinks.length = 1          PASS
link.type = GAntecedentLink         PASS
antecedentAnchor != null            PASS
antecedentAnchor.x = centerX (20)  PASS
antecedentAnchor.y = bottom  (68)  PASS
relClauseAnchor = rc.frame.topLeft  PASS
```

### TEST 5: Missing Antecedent Safety (si = -9999)
```
例外なし                            PASS
antecedentAnchor = null             PASS
relClauseAnchor finite              PASS
gl.width/height > 0                 PASS
```

### TEST 6-8: Regressions
```
GAL 4:4   adverbials=5, OBJECT modifier   PASS
PHP 2:13  relClauses/antecedentLinks array PASS
JHN 1:26  sp connector                    PASS
ROM 1:1   SUBJECT modifier                PASS
EPH 2:19  PREDICATE=CC, innerDiagram      PASS
COL 1:9   OBJECT=CC, innerDiagram         PASS
COL 1:24  1 adv, 0 coord, 1 rel           PASS
```

### Section C: NT-wide (8,010 sentences)

| Metric                    | Value  |
|--------------------------|--------|
| sentences processed      | 8,010  |
| nullSL                   | 7      |
| nullPL                   | 0      |
| nullGL                   | 0      |
| exceptions               | 0      |
| dimension issues         | 0      |
| coordStackCount          | 508    |
| coordClauseCount         | 1,232  |
| relativeClauseCount      | 464    |
| antecedentLinkCount      | 0 *    |
| resolvedAntecedentCount  | 0 *    |
| unresolvedAntecedentCount| 0 *    |
| maxGeometryDepth         | 9      |

\* `antecedentRef` は `_annotateRelClauses()` (index.html 側) を経由しないと設定されない。Node.js テスト環境では常に 0。ブラウザ環境では有効値が入る。

**TOTAL: 131/131 PASS — ALL PASS**

---

## Key Constraints Satisfied

| 制約 | 結果 |
|------|------|
| `rk-geometry-layout.js` のみ変更 | CONFIRMED |
| `index.html`, `dg-engine.js`, `rk-semantic-layout.js`, `rk-page-layout.js` 変更なし | CONFIRMED |
| DOM/SVG/window.* 禁止 | CONFIRMED — 0 件 |
| nullGL = 0 | CONFIRMED |
| exceptions = 0 | CONFIRMED |
| dimension issues = 0 | CONFIRMED |

---

## Corpus Statistics

- 等位節スタックを持つ文: **508** / 8,010 (6.3%)
- 等位節総数: **1,232** (平均 2.4 節/スタック)
- 関係節: **464**
- 最大幾何学深度: **9** (ContentClause + 副詞節 + 等位節の入れ子)
- `antecedentLinks`: ブラウザ環境でのみ有効（`_annotateRelClauses` 依存）

---

## Phase 3 Completion Status

| Phase | Description | Status |
|-------|-------------|--------|
| 3-1   | Slot + Connector + Raised Geometry | FROZEN |
| 3-2   | ContentClause Geometry | FROZEN |
| 3-3   | Modifier Geometry | FROZEN |
| 3-4   | Adverbial Geometry (PP/ADV/CLAUSE/PARTICIPLE) | FROZEN |
| 3-5   | Coordination + Relative Clause Geometry | **VALIDATED** |

Phase 3 (RKGeometryLayout) 全実装完了。Phase 4 (SVG Renderer) への移行可能状態。
