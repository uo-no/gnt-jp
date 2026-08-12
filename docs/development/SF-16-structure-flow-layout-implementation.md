# SF-16 Structure Flow Layout 実装（SF-15 案C）

作成: 2026-08-12
State: IMPLEMENTED / VALIDATED（回帰PASS）/ DOM-VERIFIED
前提: [SF-14](./SF-14-frame-connector-implementation-structure.md), [SF-15](./SF-15-structure-flow-layout-redesign.md)
表示層のみ変更（`public/index.html`）。SF-11 データ経路・adapter・NeighborhoodView・Reading Engine は不変。

> 目的: Structure Flow は語順表示ではない。横軸を原文順→**layout rank**（UI 配置優先順位・文法的正解語順ではない）へ。
> focus とその Lowfat 明示関係を最短で理解できるようにする。推論・ὃ→πᾶν 生成は禁止。

## 1. layout rank（UI 配置優先順位）

原文順は Word Order Flow が担うため撤去。Structure Flow は関係を読みやすい順で並べる。
```
1 主語(s) / 2 動詞(v) / 3 繋ぎの動詞(vc) / 4 補語(p) / 5 目的語(o) / 6 間接目的語(io) / 7 副詞的(adv) / 8 その他・roleなし(元順維持)
```
- 文法的な正解語順ではなく **表示配置の優先順位**。
- role を持たない語は 8（末尾・元の相対順維持＝中立順）。**role の推測付与はしない**（誤帰属禁止）。
- 並べ替えは stable sort（rank, 元 index）。

## 2. 実装前 ASCII（実データ・確認済み）

```
■ 6:37 focus=δίδωσίν(動詞)   role: 主語 動詞★ 目的語 間接目的語
   [父]  [与える]★  [〜するもの]  [私]        frame弧(下・実線・▸=項): 与える→父/→〜するもの/→私（短・隣接）
■ 6:37 focus=ὃ(目的語)       [父] [与える] [〜するもの]★ [私]   frame弧: 与える↔ὃ 1本（ὃ→πᾶν は描かない）
■ 6:37 focus=πᾶν(role無)     所属·主語  [すべての]★ [〜するもの与える私父]   frame無・弧無（中立順）
■ 6:38 御心(role無)          [御心]★ [［冠詞］私の]   frame無
■ 6:39 この(補語)            [主語 …送る私] [繋ぎ 〜である] [補語 この]★ [目的語 …最後の日]  referent点線→滅ぼす/立ち上がる
■ 6:51 〜である(繋ぎの動詞)   [主語 私] [繋ぎ 〜である]★ [補語 …天下る]
```

## 3. 変更内容（SF-14 → SF-16）

**変更**:
- `_SF_ROLE_JA`: `p` の表示を `述部`→`補語`（SF-16 の role 表示規則）。
- `_SF_ROLE_RANK` 追加（layout rank）。
- `_sfRelationModel`: 兄弟 `sibs` を **layout rank 順へ並べ替え**（stable）。focusIdx / idxForNode / frameEdges / referentEdges は並べ替え後の index で一貫。
- `_sfRenderRelationFlow`: 横の **`→`（順序矢印）を撤去**（順序チャネルは Word Order Flow が担うため）。chip は layout rank 順・gap 区切り。
- CSS: `.sf-rel-row` の列 gap 拡大（矢印撤去分の区切り）。

**維持（SF-14 準拠・変更なし）**:
- 4チャネル分離: 包含=帯＋上位縦線／**frame=下・実線弧・▸=項**／referent=上・点線弧／role=chip 直上ラベル。
- frame は **Lowfat 明示 node-id 間のみ**（source か target が focus・同 sentence・非ゼロ・実在 id）。**推論禁止・ὃ→πᾶν 非描画・文外/ゼロ非接続**。
- role の帰属を偽らない（word 由来 chip 直上／unit 由来は帯見出し）。role 無しに role を付けない。
- mobile/折返し縮退（弧を消し role キャップ＋短い注記）。

## 4. 検証

- **DOM 実測（wide 620px）**: δίδωσίν role順=主語/動詞/目的語/間接目的語・chip順=父/与える/〜するもの/私・frame=1:2,1:3,1:0・arrows=0。ὃ frame=1:2 のみ。πᾶν/御心 frame無・中立順。6:39 この=補語・referent 有・折返し縮退。6:51 主語/繋ぎ/補語。全ケースで **→ 矢印ゼロ**、layout rank 並べ替え確認。
- **弧描画**: 実 Chrome（harness を実レイアウト＋enhancer 実行）で paths 生成を確認（wide=13 paths）。弧の描画機構は SF-14 と同一（並べ替えで弧は**短く隣接化**）。
- **420/360**: 収まる帯=弧、折返す帯=縮退（role キャップ＋注記）。360 は SF-14 縮退方針を維持。
- **Regression 全PASS**: re-neighborhoodview(30)/-integration(34)/re-flowtree-adapter(28)/re-flowtree-runtime(10)/flow-dom(62/62・inline構文ゲート)/re-stageB(27)。Word Order/Translation/Syntax Tree/Flow/StudyPanel/deep-link 影響なし。

## 5. 変更ファイル
- `public/index.html`（Structure Flow 表示層のみ）。
- 追加: 本 doc。
- 不変: SF-11 データ経路・adapter・NeighborhoodView・Reading Engine・flow-tree schema。

## 6. 残課題
- layout rank の細部（copula 補語 p を vc 直後に置く現配置で妥当か）は実運用で再評価可。
- 6:39 等の巨大 band は referent 弧を出せず縮退注記（SF-14 同）。
- セッションの画像取得制限により SF-16 の弧の**目視スクショ確認**は未完（DOM 実測＋SF-14 の同一描画機構で担保）。GUI ブラウザでの目視は人間確認推奨。
