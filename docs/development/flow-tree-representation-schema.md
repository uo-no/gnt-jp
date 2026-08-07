# Flow Tree Representation Schema v1

作成: 2026-08-07
位置づけ: `docs/development/flow-tree-adapter-design.md` が定義する Adapter の出力形式を固定し、NeighborhoodView・将来の Source Tree View 等の消費者が依存できる境界を定義する仕様正典。
これは実装ではなく設計文書である。

---

## 0. Schema 責務宣言

このSchemaは:
- Flow Tree Adapter 出力の共通形式を定義する
- 消費者（View / Renderer 等）が依存してよい情報範囲を定義する

目的外:
- 表示仕様
- 読者向け説明
- 文法解釈生成
- 日本語文章生成

---

## 1. Representation の基本原則

Flow Tree Representation は、Lowfat 由来の構造情報を保持する。

**Adapter は:**
- 構造を変換する
- 新しい統語判断を生成しない

**Representation は:**
- Source 構造を保持する
- View が必要な範囲で参照する

---

## 2. Node Schema

### 必須

| 項目 | 目的 | 保証条件 | 消費者 |
|---|---|---|---|
| **node識別情報** | 各ノードを一意に参照・追跡できるようにする | Representation 内で一意であること（生成方式は §3） | NeighborhoodView（構成員の識別）／将来の Source Tree View |
| **parent参照** | 「直近の親」を判定できるようにする | 各ノード（root を除く）が、Lowfat 上の実際の入れ子関係と一致する親を1つ持つこと | NeighborhoodView（anchor 探索） |
| **children** | 構造的な包含関係と、その内部の並びを表現する | Lowfat XML 上の実際の子要素を過不足なく含み、順序を保持すること（§4） | NeighborhoodView（構成語群抽出）／将来の Source Tree View |
| **structural order** | 構成員間の並びを、Lowfat の実際の記述順のまま伝える | `children` 配列の順序が Lowfat XML の子要素列挙順と一致すること | NeighborhoodView／Renderer（並べ替えは行わない） |
| **token参照** | 各ノードが対応する Lowfat の語（`<w>`）を辿れるようにする | token 欠落がないこと（Adapter Guarantee (a)） | NeighborhoodView（構成語群の内容特定）／Renderer（既存日本語表示値の参照キー） |
| **構造識別情報（現行 `type`）** | そのノードが Lowfat のどの分類に由来するかを識別する | `class` 属性からの変換が安定していること（Adapter Guarantee (c)） | View 内部判断（anchor 探索等）。読者向け表示には使わない（§6） |

### 任意保持可能

- role
- rule
- clauseType
- その他 Lowfat 由来属性

**NeighborhoodView はこれらに依存してはならない。** 将来の別の消費者（Source Tree View 等）のために Representation が保持すること自体は妨げない。

### 禁止

Representation 生成時に、以下を一切付与しない。

- 人間向け説明文
- 意味的重要度
- confidence
- AI推定値
- 生成済み翻訳

---

## 3. node識別方式

**必須:** 一意性。

**未固定:** フィールド名、生成方式。

例: `nodeId`、`sourceRef`、composite key（複合キー）等は、いずれも実装判断事項であり、本 Schema はどれか一つを指定しない。

---

## 4. children / structural order

`children` 配列の順序は、Lowfat XML の子要素列挙順を保持する。

**禁止:**
- surface order による兄弟の並べ替え
- 読みやすさ目的の並べ替え
- 意味的重要度による並べ替え

---

## 5. token reference

Node は token 参照を保持する。

**保証:**
- token 欠落なし
- 元 token との対応可能性

**注意:** token 内部の表示順・文字列生成は Renderer 責務である。Representation はあくまで token への参照（どの token がそのノードに属するか）を保持するのみで、それらをどう連結し、どう表示するかには関与しない。

---

## 6. type policy

`neighborhood-view-design.md` §6・`flow-tree-adapter-design.md` §5 と一致させる。

**`type`:**
- 構造識別属性
- Adapter 保持可
- View 内部判断利用可
- Reader 表示禁止

role / rule / semanticRole 等の意味解釈属性とは異なる。

---

## 7. Consumer Dependency Rules

### NeighborhoodView

**利用可能:**
- node識別
- parent
- children
- structural order
- token参照
- type

**利用禁止:**
- role
- rule
- semanticRole
- 解釈属性

### Renderer

**利用:**
- token
- 日本語表示データ

**禁止:**
- 構造解釈の追加

---

## 8. Versioning Policy

Schema 変更時、以下は**破壊的変更**として扱う。

- 必須項目の変更
- 意味変更（既存項目が表す内容の変更）
- type policy の変更

---

## 9. Open Questions

- node識別方式の正式決定（`nodeId`／`sourceRef`／composite key のいずれを採用するか）
- optional属性（role/rule/clauseType等）の保持範囲（Representation が常に全てを保持するのか、消費者ごとに選択的に生成するのか）
- Source Tree View 利用範囲（Source Tree View が実際に必要とする項目の全量が、本 Schema の「任意保持可能」区分で過不足なくカバーされているか）

**既決事項（type policy §6 等）は本節に含めない。**

---
