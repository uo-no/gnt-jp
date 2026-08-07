# Flow Tree Adapter Specification v1

作成: 2026-08-07
位置づけ: `docs/development/neighborhood-view-design.md` が前提とする Flow Tree Adapter 層の責務・入力・出力契約・保証条件を固定する仕様正典。
これは実装ではなく設計文書である。本書に基づく Adapter の実装は、本書確定後の別フェーズで行う。

---

## 0. 責務宣言

> **Flow Tree Adapter は、Lowfat XML の構造をそのまま機械的に反映した Flow Tree Representation を生成する層であり、表示・文章生成・文法解釈を一切行わない。**

| 層 | 責務 |
|---|---|
| Lowfat XML | 統語構造の一次情報（不変） |
| **Flow Tree Adapter（本書）** | Lowfat XML を入力とし、Flow Tree Representation を生成する。構造情報の保持のみを行う |
| NeighborhoodView（`neighborhood-view-design.md`） | Flow Tree Representation を根拠に、対象語の構成語群を観察可能な形へ投影する |
| Display Policy | NeighborhoodView が保証したデータの、画面上の表示量を制御する |
| Renderer / StudyPanel | label 生成・日本語表示・HTML 生成、整形済み内容の描画 |

---

## 1. Purpose

### 責務

- Lowfat XML を入力として受け取る
- Flow Tree Representation を生成する
- 構造情報（node・parent/children 関係・structural order・token 参照・構造識別情報）を保持する

### 責務外

- 表示
- 日本語文章生成
- 読者向け説明
- 文法解釈の追加生成

Adapter は Lowfat が既に保持する構造情報を、別の形（Flow Tree Representation）へ変換するだけの層である。この変換において、Adapter 自身が新しい統語的判断・解釈を行うことはない。

---

## 2. Input Contract

**入力: Lowfat XML のみ。**

Adapter は Lowfat が保持する構造情報（`<sentence>`／`<wg>`／`<w>` とその属性）を変換するだけであり、**新規の統語判断を生成しない。** `class`・`role`・`rule` 等の値は、Lowfat の注釈者が既に確定させたものをそのまま読み取るのみで、Adapter がこれらを推測・補完・訂正することはない。

---

## 3. Output Contract

### 必須

- **node識別情報**（各ノードを一意に指し示せること。具体的なフィールド名・生成方式は本書では固定しない）
- **parent参照**（各ノードの直近の親を辿れること）
- **children配列**（各ノードの直接の子を、構造上の並びのまま保持すること）
- **structural order**（`children` 配列の順序が、Lowfat の XML における子要素の列挙順と一致すること）
- **token参照**（各ノードが対応する `<w>` の `ref` を辿れること）
- **構造識別情報**（そのノードが Lowfat のどの分類——`<wg class="...">` や `<w>` 自体——に由来するかを識別できること。**現行実装ではこれを `type` フィールドとして保持する**。フィールド名自体は契約の対象外であり、将来変更されうる）

### 不要

- role
- rule
- semanticRole
- 文法説明属性
- 意味的重要度

これらは Flow Tree Representation の必須契約には含まれない。ただし、Adapter がこれらを Representation 内に保持すること自体を本書は禁じない（§5・`neighborhood-view-design.md` §6「type 利用の境界」と同様の考え方に基づく。将来の他の消費者——例えば Flow Tree 構造そのものを忠実に観察するビュー——が必要とする可能性を排除しない）。

---

## 4. Guarantees（保証条件）

### (a) Structural completeness（構造的完全性）

Lowfat の全 token・全 `wg` が、欠落なく Flow Tree Representation へ反映されること。

### (b) Determinism（決定性）

同一の Lowfat 入力から、常に同一の Flow Tree Representation（同一の親子関係・同一の構造）が生成されること。

### (c) Structural identifier mapping completeness（構造識別情報マッピング完全性）

Lowfat の `class` 属性から構造識別情報への変換が、既知の全 `class` 値に対して安定していること。

- **未知の `class` 値に遭遇した場合、暗黙的な変換（推測によるカテゴリ付与）を行わない。**
- この場合、**Failure Mode** を発動する: 該当ノードを構造識別不能として扱い、変換結果に含めない。
- **Failure Mode の発動と (a) の関係を明記する:** Failure Mode は「未知の入力に対して安全に失敗する」ための最終防御であり、通常運用で発動することを前提とした挙動ではない。Failure Mode が実際に発動した場合、その対象ノード（および配下）は (a) Structural completeness の保証範囲から外れる——すなわち、**Failure Mode の非発動こそが (a) と (c) が同時に満たされている状態を示す。** 既知の `class` 値が全 27 書を通じて網羅されていることは、(a)(c) が両立するための前提条件である。

### (d) Structural order preservation（構造順序の保持）

`children` 配列の順序は、Lowfat XML における子要素の列挙順をそのまま保持し、いかなる基準（読みやすさ・重要度等）によっても並べ替えない。

---

## 5. type policy（構造識別情報の扱い）

`type`（現行実装における構造識別情報のフィールド名）は、**構造識別属性**である。role / rule / semanticRole 等の**意味解釈属性**とは性質が異なり、Lowfat の `class` 属性から機械的な1:1対応で導出される、ノード自身の分類にすぎない。

| 用途 | 可否 |
|---|---|
| Adapter 保持 | **許可** |
| View（NeighborhoodView 等）内部判断での利用 | **許可** |
| 読者向け表示 | **禁止** |
| 意味説明（文法的機能・関係の説明）への利用 | **禁止** |

本方針は `neighborhood-view-design.md` §6「type 利用の境界」と同一であり、両文書間で矛盾しない。

---

## 6. Adapter / View / Renderer 境界

| 層 | 責務 |
|---|---|
| **Adapter** | Lowfat XML の解析、node 生成、parent/children 関係構築、structural order の保持、token 参照の保持——**構造の生成のみ** |
| **View**（NeighborhoodView） | 対象語（focus）の判定、構成語群の抽出（直近の親探索等）、経路上ノードの expanded 判定 |
| **Renderer** | label 生成（既存の日本語表示値の参照・連結）、日本語表示、HTML/UI 生成 |

Adapter は View・Renderer の責務（対象語選択・構成語群抽出・表示整形・文章生成）を一切持たない。View は Adapter の出力を消費するのみで、Lowfat XML を直接解析しない。Renderer は View が確定した構造（構成語群・focus・expanded 状態）を受け取って表示するのみで、構造判断を行わない。

---

## 7. Test Contract（検証すべき項目）

Adapter の実装完了後、以下を検証項目として定義する（本書は項目の列挙のみを行い、テストコードの作成は対象外とする）。

1. **token完全性:** 入力 Lowfat の `<w>` 総数・ref 集合と、Flow Tree Representation が捕捉した token 参照の総数・集合が一致すること。
2. **node完全性:** 入力 Lowfat の `<wg>` 総数と、Flow Tree Representation 上の対応するノード数（構造識別情報が既知の `class` に対応するもの、および `class` 無しノードを含む）が一致すること。
3. **parent整合性:** 各ノードの parent 参照が、Lowfat XML 上の実際の入れ子関係と一致すること。
4. **children順序:** 各ノードの `children` 配列の並びが、Lowfat XML における子要素の文書順と一致すること。
5. **deterministic:** 同一の Lowfat 入力に対し、複数回の変換実行が常に同一の Representation を生成すること。
6. **class mapping完全性:** 既知の `class` 値による変換が安定していること、および未知の `class` 値に遭遇した場合に Failure Mode が正しく発動し、暗黙変換が行われないこと。
7. **全27書検証可能性:** 上記 1〜6 の検証が、Matthew 1:1 等の一部データに限定されず、SBLGNT Lowfat 全27書に対して実行可能であること。

---
