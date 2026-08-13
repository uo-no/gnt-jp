# SF-18 Structure Flow 2段レイアウト実装（SF-17-A 案A）

作成: 2026-08-12
State: IMPLEMENTED / VALIDATED（回帰PASS）/ DOM-VERIFIED
前提: [SF-16](./SF-16-structure-flow-layout-implementation.md), [SF-17-A](./SF-17-structure-flow-2row-layout-design.md)
表示層のみ変更（`public/index.html`）。Lowfat / flow-tree v2 / adapter / NeighborhoodView / Reading Engine / データ生成は不変。

> Structure Flow を「語順表示」でなく「focus が構造上、何とどう関係するか」を直感理解する表示へ。
> 上段=核(主語/動詞/繋ぎ)・下段=項。frame は上段述語→下段項の短い縦エルボ。推論・ὃ→πᾶン は生成しない。

## 1. 実装（DOM/renderer/enhancer の変更点）

- **`_sfRelationModel`**: 兄弟に段割りを付与。`_SF_TOP={s,v,vc}`。`rows[i]='t'|'b'`、上段・下段が両方揃う時のみ `useTwoRow=true`（それ以外は単段＝SF-16 フォールバック）。role でのみ段を決め、role 無しに付与しない。frame/referent edge・layout rank は SF-16 のまま。
- **`_sfRenderRelationFlow`**: `useTwoRow` 時に `.sf-rel-row.sf-row-top`（{s,v,vc}）と `.sf-rel-row.sf-row-bottom`（項）の2段を出力。chip に `data-sf-idx`＋`data-sf-row`。単段時は従来通り1行。横の → は無し（SF-16）。
- **`_sfEnhanceRelations`**: 折返し判定を「同一段内での行ずれ」に変更（上段/下段が別行なのは正常）。frame は **上段述語→下段項の縦エルボ**（trunk＋bus＋drop、▾=項側の列上端＝role ラベルと非重複）。**同段の edge（述語↔主語）は線を引かない**（主語は上段配置で表現＝SF-18 §4）。referent は従来の点線（別チャネル）。段内折返し・巨大 chip は縮退（線を消し `.sf-frame-note`/`.sf-ref-note`）。
- **CSS**: `.sf-two-row .sf-row-bottom { margin-top:28px }`（エルボ用の段間縦スペース）、`.sf-has-frame` の旧下部余白を縮小、frame path に `stroke-linejoin:round`。

## 2. frame connector の実装

- 述語ごとに cross-row 項をまとめ、**trunk（述語 chip 下端→bus）＋bus（水平）＋drop（各項へ）＋▾**。矢頭は項側の**列上端**（role キャップの上）に置き、role ラベルと重ねない。
- 描画対象は **focus-incident・同 band・明示 node-id・非ゼロ・実在**のみ（SF-14 ルール維持）。同段（主語）はスキップ。**ὃ→πᾶン・文外・zero は描かない**。
- containment（左端の帯＋上位縦線・矢頭なし）と、frame（中央の縦エルボ・▾）は位置・様式で分離。

## 3. John 6:37/38/39/51 実測（DOM）

| focus | two-row | 上段 | 下段 | frame(描画) |
|---|---|---|---|---|
| 6:37 δίδωσίν(v) | ✓ | [父][与える]★ | [〜するもの][私] | 与える→〜するもの/→私（2エルボ・▾×2）。**父(主語)は上段配置・線なし** |
| 6:37 ὃ(o) | ✓ | [父][与える] | [〜するもの]★[私] | 与える→ὃ 1本のみ。**ὃ→πᾶン 非描画** |
| 6:37 πᾶν(role無) | ✗ 単段 | — | — | frame無（所属·主語＋包含のみ） |
| 6:38 御心(role無) | ✗ 単段 | — | — | frame無 |
| 6:39 この(p=補語) | ✓→縮退 | [主語…送る私][〜である] | [この]★[…最後の日(巨大)] | referent この→滅ぼす/立ち上がる（巨大chip折返し→注記へ縮退） |
| 6:51 〜である(vc) | ✓ | [私][〜である]★ | [補語 …天下る] | frame無（copula に frame なし） |
| （11:35 ἐδάκρυσεν） | ✗ 単段 | — | — | 主語+動詞のみ＝下段項なし→単段・線なし（主語は配置） |

## 4. Desktop / Mobile

- **620/420/360**: 小さい 2段 band（δίδωσίν/ὃ）は content 幅に収まり **2段＋エルボを維持**（framePaths 実測）。巨大 band（6:39/6:51）は段内折返しで **縮退**（role キャップ整列＋短い注記）。`resize` で再計算。
- mobile は 2段が成立すれば維持、破綻時のみ SF-14/16 縮退（線を無理に維持しない）。

## 5. Regression
全PASS：re-neighborhoodview(30)/-integration(34)/re-flowtree-adapter(28)/re-flowtree-runtime(10)/**flow-dom(62/62・inline構文ゲート)**/re-stageB(27)。Word Order/Translation/Syntax Tree/Flow/StudyPanel/deep-link 影響なし。

## 6. SF-16 から：維持 / 変更
- **維持**: 4チャネル分離（包含=帯＋上位縦線／frame=実線▾／referent=点線／role=chip 直上）；frame は Lowfat 明示 node-id のみ・推論禁止・ὃ→πᾶン非描画・文外/ゼロ非接続；role 帰属を偽らない（p→補語・role 無しに付与しない・unit role は帯見出し）；layout rank（各段内）；横「→」なし；mobile 縮退；focus 強調。
- **変更**: 単段横一列 → **2段（上段核／下段項）**；frame 弧（同段下の曲線）→ **上段→下段の縦エルボ（trunk+bus+drop+▾）**；主語(A0)は線でなく**上段配置**で表現（同段 edge はスキップ）。

## 7. 未解決事項 / 人間レビュー観点
- **画像取得がセッション制限に達し、SF-18 の縦エルボの目視スクショ確認は未完**（DOM 実測で trunk/bus/drop/▾・段割り・同段スキップ・縮退を確認）。GUI ブラウザでの目視を人間確認に回す。
- 人間レビュー観点（明記）: (a)「線を増やしたことで構文解析ツール感が強すぎないか」、(b)「主語＋動詞→項 の構造が一目で分かるか」、(c) containment 縦線と frame 縦エルボが混同しないか。
- copula(6:51) は frame が無く 2段の role 配置のみ（線なし）。この見え方が妥当かは要目視。
