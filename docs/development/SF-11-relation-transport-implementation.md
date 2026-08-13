# SF-11 Relation Data Transport + Hybrid Structure Flow 実装記録

作成: 2026-08-12
State: IMPLEMENTED / VALIDATED（回帰PASS）/ BROWSER-VERIFIED（render path）
前提: [SF-9](./SF-9-relation-data-audit.md)（データ事実）, [SF-10](./SF-10-relation-display-design.md)（表示設計・凍結）

> SF-10 の確定仕様は変更していない。新しい「賢い推論」は追加していない。
> Lowfat が既に持つ構造事実を失わずに UI まで運び、SF-10 案C の範囲だけ表示する。

---

## 1. flow-tree schema v2

v1（5フィールド）に、Lowfat の関係属性を「存在時のみ・値を改変せず」追加する。**後方互換**（v1 consumer は無視して動作）。

```
Node = {
  id, parentId, type, tokens, children,   // v1（不変）
  role?,      // <w>/<wg> の role をそのまま（s/o/io/v/vc/p/adv/aux 等の生値）
  frame?,     // 述語 <w> の frame をそのまま（"A0:<id> A1:<id> …" の生文字列）
  referent?   // <w> の referent をそのまま（"<id> <id>" 空白区切り・生文字列）
}
```

- `id` は Lowfat `xml:id`（word）/`nodeId`（一部wg）を維持 ＝ frame/referent の **join key を壊さない**（再採番なし）。
- `rule` / `clauseType` / word `type` は搬送しない（SF-10 Tier3・非表示）。
- 生値は内部データ。UI へは一切出さない（表示は表示層で日本語化・§3）。

## 2. Lowfat → flow-tree transport（変更点）

- `public/core/flow-tree-adapter.js`: `convertElement()` が node 生成時に `_attachRelationAttrs(node, el)` を呼び、`role`/`frame`/`referent` を存在時のみ付与（word・wg 両方で role、word で frame/referent）。値は無改変。
- `scripts/build-flow-tree.cjs`: 変換器は adapter のまま（コピーせず）。境界コメントを v2 に更新。再生成で 260 files 決定的出力（digest 不変を確認）。
- 実データ確認（JHN 6:37）:
  - πᾶν: word.role 無 / 親 np.role="s"（役割は所属側）
  - δίδωσίν: word.role="v" / frame="A1:… A2:… A0:…"
  - ὃ: word.role="o" / **frame・referent 無**（ὃ→πᾶν は不在＝L-0）
  - μοι: referent="n43006035004"（文跨ぎ→当文 nodesById に不在＝注記しない）
- 文跨ぎ referent: 対象 node が当該 sentence の nodesById に無ければ **補完せず注記しない**（broken reference を作らない）。同一文内の referent（例 JHN 6:39!1）のみ注記。

## 3. 表示（SF-10 案C）— `public/index.html`（表示層のみ）

- `_sfRelationModel(nodesById, ref)`: focus/parent(所属)/sibs(前後)/upper(最寄clause) に加え、
  - `role`: focus 自身に role があれば `{ja, placement:'word'}`、無ければ所属側の最寄 role `{ja, placement:'unit'}`（役割の帰属を偽らない）。
  - `frame`: focus が述語(role=v/vc)かつ frame 有りのときのみ、各項を node id 解決し `{roleJa, text}`（項ゼロ`n00000000000`・他文未解決はスキップ）。
  - `referent`: 明示 referent の指示先が同文内で解決できる語のみ。
- `_sfRenderRelationFlow(m)`:
  - 水平 `→`＝順序、縦線＝包含（SF-8 の2軸を維持）。
  - role は方向を増やさずタグ：word placement は focus チップに小タグ、unit placement は「所属するまとまり · 主語」の見出しに付す。
  - frame/referent は**線を引かずテキスト注記**（「この動詞の項： 主語：父／目的語：…」「共参照：…」）。
  - 生値（s/o/A0/node id/rule）は一切出さない。日本語ラベルのみ。
- role→日本語: `s主語 o目的語 io間接目的語 v動詞 vc繋ぎの動詞 p述部 adv副詞的 aux助動詞`。

## 4. 回帰更新

- `scripts/re-flowtree-runtime-regression.cjs` テストD を v2 化: allowed に `role/frame/referent` を追加、forbidden は `rule/clauseType/class/semanticRole/confidence`（生成系・意味解釈は依然禁止）。
- 他は無変更で PASS（adapter 単体テストは role/frame/referent を持たない fixture のため影響なし。NeighborhoodView VM は role/frame/referent を複製しないため "role/rule 非含有" 契約を維持）。

## 5. L-0 / 非表示境界（遵守）

- referent 非明示の指示（ὃ→πᾶん）を構造から生成しない。
- frame 項ゼロ・欠損 referent を埋めない（静寂）。
- role の語/句への帰属を偽らない（word 由来か unit 由来かで表示位置を分ける）。
- rule/clauseType を意味関係へ翻訳しない・表示しない。
- 生値（A0/A1/node id/s/o/rule）を UI に出さない。

## 6. データサイズ

flow-tree アセット 41M → 44M（+約3M / +約7%）。JHN 実測: node 26,605 中 role 10,486・frame 3,149・referent 2,230。
