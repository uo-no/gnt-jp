# Display Policy Specification v1（未実装・設計のみ）

作成: 2026-08-07
位置づけ: FLOW-TREE-12-A／12-B 設計監査で確定した Display Policy の責務境界を、将来実装時の基準文書として固定する仕様正典。
これは実装ではなく設計文書である。**Display Policy は本書作成時点で未実装であり、本書は将来実装する場合の設計基準を先に固定するものである。** 本書に基づく実装は、実装開始条件（§7）を満たした後の別フェーズで行う。
前提: `docs/development/neighborhood-view-design.md`／`docs/development/flow-tree-adapter-design.md`／`docs/development/flow-tree-representation-schema.md` と整合する。本書はこれら3文書が既に確定した責務（Adapter／NeighborhoodView／Renderer）に新しい責務を追加しない。

---

## 0. 責務宣言

> Display Policy は、Representation や NeighborhoodView が生成した構造データを変更せず、その構造データを UI へどれだけ・どのように渡すか（表示量）を制御する層である。HTML 生成・日本語生成・意味解釈のいずれも行わない。

| 層 | 責務 |
|---|---|
| Lowfat XML | 統語構造の一次情報（不変） |
| Flow Tree Adapter | Representation の構造生成のみ |
| NeighborhoodView | 構成語群の構造確定（focus／anchor／constituent抽出／`expanded`） |
| **Display Policy（本書、未実装）** | 表示量の制御（深度・件数・viewport差） |
| Renderer | label生成・HTML生成 |

---

## 1. 目的

Display Policy は、NeighborhoodView が確定した構造データ（NeighborhoodView Model）を入力とし、画面上にどれだけ表示するかを決定する層である。

**行わないこと:**
- HTML生成
- 意味解釈（役割・重要度の付与等）
- 新しい構造判断（focus探索・anchor探索・木の再構築）

FLOW-TREE-11-G の実測（全27書規模で最大深度156、children最大21、token最大164/node）が、この層が将来必要になる具体的根拠である。ただし、これは「今すぐ実装する理由」ではない（§7 実装開始条件を参照）。

---

## 2. 責務

### 入力
NeighborhoodView Model（`{nodeId, tokens, isFocus, expanded, children}`。既存契約のまま、変更しない）

### 出力
Display View Model（本書で新設する概念。既存の NeighborhoodView Model とは別の形として扱う。§3 参照）

### 責務
- 表示深度制御（maxDepth）
- children 表示量制御（maxChildren、"+N件"相当の判断）
- viewport 差分（mobile／desktop 等で閾値を変える）
- focus 周辺表示制御（focus からの距離に応じた表示範囲の決定）
- DOM 量制御（大量ノードをどこまで DOM 化するかの方針決定）

### 非責務
- Tree解析（Adapter の責務）
- focus探索・anchor探索（NeighborhoodView の責務）
- 日本語生成・label生成（Renderer の責務）
- HTML生成（Renderer の責務）

---

## 3. expanded 境界

`expanded` は NeighborhoodView が確定する構造事実（focus への構造経路上にあり、children を持つこと。`neighborhood-view-design.md` §4「expanded の責務境界」で確定済み）である。

**Display Policy は `expanded` の値を変更しない。**

Display Policy が実際の表示判断を行う場合、`expanded` を入力の一つとして、別名の新しい出力状態（例: `displayExpanded`）を生成する。これにより、「構造事実」（NeighborhoodView が保証し常に不変）と「最終表示状態」（Display Policy が config に応じて決定し可変）を型レベルで区別する（FLOW-TREE-12-B §B、案2）。

---

## 4. Consumer境界

### 共通 Tree Policy（Source Tree View 等、他の木構造 View でも再利用可能な候補）
- maxDepth
- maxChildren
- viewport 差
- DOM量制御

### NeighborhoodView固有 Policy（focus 概念に依存し、他 View では再利用不可）
- focus 周辺表示
- anchor 表示
- focus から遠い部分の省略

### 新機能扱い（Display Policy の最小仕様に含めない。将来 CLAUDE.md の実装前ゲート G1-G3 を要する別トラック）
- token省略表示の具体的UX
- 別画面詳細表示
- lazy loading 等の実装アプローチ選択

---

## 5. API候補（検討記録・未採用）

```
applyDisplayPolicy(viewModel, options) → Display View Model
```

純粋関数（副作用なし）。`flow-tree-adapter.js`／`neighborhood-view.js` と同じ設計パターン（Representation／View Model を引数として受け取り、新しいデータを返す）を踏襲する案として、他2案（Representation 直接入力、class／service型）と比較した結果、最も既存設計と整合し過剰設計リスクが低いと判断されたもの。

**これは実装の確定ではない。** 「設計 → 実装 → 監査 → 凍結」（CLAUDE.md §9）の設計段階の検討記録であり、実装時に再評価してよい。

---

## 6. 未決事項

以下は本書では決定せず、実際の UI/UX デザイン検討時に決める。

- maxDepth の具体値
- maxChildren の具体値
- token省略方法（具体的な省略アルゴリズム・UX）
- 展開UI（ボタンの有無・挙動）
- localStorage 等の永続化、およびそれを Display Policy に含めるか別モジュールにするか
- animation

---

## 7. 実装開始条件

以下のいずれかを満たした段階で実装を開始する。

- 全27書を実ブラウザ表示へ接続開始する段階
- mobile UX検証を開始する段階
- Source Tree View が、NeighborhoodView Model 相当の中間層を持つ設計になった段階（単なる「Source Tree View 設計開始」ではなく、この条件を満たした時点を指す）

---

## 8. Open Questions（未解決事項）

- Display Policy の出力（Display View Model）を Renderer が消費する際、既存 `_ft11ToRenderItem` 等の入力元差し替えがどの程度のコストになるかは、実装時まで見積もれない。
- UI状態管理（開閉状態の保存等）を Display Policy 自体に含めるか、既存の永続化レイヤー（`assets/js/app-storage.js` 等）と連携する別関心事として切り出すかは未整理。
- §5 API候補は比較検討の記録であり、実装時に別形状が妥当と判断される可能性を排除しない。
- `neighborhood-view-design.md`／`flow-tree-adapter-design.md` 内の「Display Policy（未実装）」という記述を、本書への参照へ更新するかどうかは、本書のスコープ外（別フェーズでの提案事項として記録する）。

---
