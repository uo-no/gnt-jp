# SF-19 Structure Flow 縦型関係表示 実装

作成: 2026-08-12
State: IMPLEMENTED / VALIDATED（回帰PASS）/ DOM-VERIFIED
前提: [SF-18](./SF-18-structure-flow-2row-implementation.md)
表示層のみ変更（`public/index.html`）。Lowfat / flow-tree v2 / adapter / NeighborhoodView / Reading Engine / データ生成は不変。

> Structure Flow を「主語＋主動詞を第1層に横並び固定し、動詞→各項を縦に1つずつ並べる」縦型へ。
> 「誰が・何をする・何を・誰に」を一目で読む。推論・ὃ→πᾶン・role 推測は禁止。

## 1. 変更内容（DOM / renderer）

- **`_sfRenderRelationFlow` を全面刷新（縦型）**。SVG 計測をやめ、**CSS の trunk＋横枝**で構成:
  - **第1層**（`.sf-l1`, 横並び）: 主語(role s) ＋ 主動詞(role v/vc)。主語は左・動詞はその右。role は chip 上。
  - **枝**（`.sf-branches` = 動詞の下の縦 trunk、各 `.sf-branch` = 横枝）: 動詞に関係する項を**縦に1つずつ**。role はインライン、frame の項は accent（`.sf-frame`）。
  - **主語への frame 線は引かない**（第1層配置で役割を表現＝§5）。
  - **nested**（`.sf-nested`）: 項の直接の子のうち **Lowfat が role を持つもの**だけを、項の下に包含として indent 表示（別チャネル）。role の無い子には role を推測付与しない（§7/§11）。
  - **referent**: 同文明示のみ**注記**（線を引かない）。frame と混同させない（§9）。
- **段選択**: 主動詞(v/vc)がある band のみ縦型。無い band（role 無し等）は **SF-16 単段へフォールバック**。
- **枝に載せる項**: focus が第1層(主語/動詞)なら**全ての下段 role sib**、focus が項なら**その focus のみ**（focus-incident 維持・他項を無理に出さない）。
- **frame 描画対象**: focus-incident・同 band・明示 node-id・非ゼロ・実在のみ（SF-14 原則）。**ὃ→πᾶン・文外・zero は描かない**。
- SVG enhancer は縦型では未使用（呼んでも svg 無しで no-op）。

## 2. frame connector の実装（CSS）

- `.sf-branches { border-left:1.5px accent }`（動詞から下がる trunk）。
- `.sf-branch::before { border-top }`（trunk→項の横枝）。frame の枝は accent、非 frame（例: copula の補語）は neutral。
- 矢印は使わない（`→` 水平語順矢印なし）。frame connector のみ構造接続として使用。
- **containment との分離**: 帯・上位縦線（左端・`.sf-rel-link`）＝包含、trunk＋横枝（動詞下・accent）＝frame、nested（さらに indent・`--border`）＝項の内部包含。位置・色で3種を分離。

## 3. John 6:37/38/39/51 実測（DOM）

| focus | 縦型 | 第1層 | 枝（[frame]=accent） | 備考 |
|---|---|---|---|---|
| 6:37 δίδωσίν(v) | ✓ | 主語[父] / 動詞[与える]★ | [frame]目的語 〜するもの／[frame]間接目的語 私 | **基本形どおり。主語は第1層・線なし** |
| 6:37 ὃ(o) | ✓ | 主語[父] / 動詞[与える] | [frame]目的語 〜するもの★ のみ | μοι は出さない・**ὃ→πᾶン 非描画** |
| 6:37 πᾶン(role無) | ✗ 単段 | — | — | role 推測せず（所属·主語＋包含） |
| 6:38 御心(role無) | ✗ 単段 | — | — | フォールバック |
| 6:38 行う(v, 参考) | ✓ | 主語 / 動詞[行う] | [frame]目的語 ［冠詞］御心［冠詞］私の | 項の子は role 無し→nested 非表示（役割を捏造しない） |
| 6:39 この(p=補語) | ✓ | 主語[…送る私] / 繋ぎの動詞[〜である] | [ ]補語 この★（frame 線なし） | referent注記「滅ぼす、立ち上がる」。frame/referent 非混同 |
| 6:51 〜である(vc) | ✓ | 主語[私] / 繋ぎの動詞[〜である]★ | [ ]補語 ［冠詞］パン…天下る | copula・補語を下位に |
| 11:35 涙を流す(v) | ✓ | 主語[イエス] / 動詞[涙を流す]★ | （項なし） | 主語＋動詞のみ |

## 4. nested constituent の確認

- 実装済み（`.sf-nested`、role を持つ直接の子を1階層・包含で表示）。
- 本コーパスでは項の下位構成語（例 τὸ ἐμὸν＝私の）に **role が付与されていない**（role=−）。**役割（例「所有格」）を推測して付与しない**方針（§7/§11）のため、これらは nested に出さない（項 chip の連結表示に含まれる）。role 付きの下位構成が存在する場合のみ nested が発火する。

## 5. Desktop / Mobile

- 縦型は**幅に強い**（各枝は縦積み・chip はラベル折返し）。360px でも**目的語と間接目的語を横一列に戻さず**縦を維持（§10）。
- 幅不足時は chip ラベルが折返す（trunk/枝は維持）。巨大 band（6:39/6:51 の補語）は chip が折返すが縦構造は保持。
- 620/420/360 の DOM で縦型（sf-vert・第1層・枝）を確認。

## 6. Regression
全PASS：re-neighborhoodview(30)/-integration(34)/re-flowtree-adapter(28)/re-flowtree-runtime(10)/**flow-dom(62/62・inline構文ゲート)**/re-stageB(27)。Word Order/Translation/Syntax Tree/Flow/StudyPanel/deep-link 影響なし。

## 7. SF-18 からの変更点
- **変更**: 「上段＋下段横並び＋SVG エルボ」→ **「第1層(主語+動詞)＋動詞から縦に1項ずつ＋CSS trunk/横枝」**。SVG 計測を廃し CSS 化。referent は線→注記。目的語/間接目的語を**横一列にしない**（縦積み）。項の内部（nested containment）を項の近くに表示する枠組みを追加。
- **維持**: frame は Lowfat 明示 node-id のみ・推論禁止・ὃ→πᾶン非描画・文外/ゼロ非接続・主語は配置で表現（線なし）・focus-incident・role 日本語(p=補語)・role 無しに付与しない・layout rank・横「→」なし・focus 強調・包含（帯＋上位）。

## 8. 残課題 / 人間レビュー観点
- **セッションの画像取得制限により、縦型の目視スクショ確認は未完**（DOM で第1層/枝/frame class/nested/referent/フォールバックを実測）。GUI ブラウザでの目視を人間確認に回す。
- 人間レビュー観点（明記）: (a)「線を増やしたことで構文解析ツール感が強すぎないか」、(b)「主語＋動詞→項の構造が説明文なしに一目で分かるか」、(c) trunk/横枝(frame) と 帯/上位縦線(containment) と nested(項の内部) の3種が混同しないか。
- nested は role 付き下位構成のみ発火（本コーパスでは稀）。役割の捏造はしない方針を維持。
