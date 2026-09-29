# Implementation Priorities

本Phaseはコード実装を含まない（ブリーフ§48）。以下は次Phase以降の優先順位であり、既存のData Model・Canonical Identity・Bible Engine・Structural Data・Search Architectureを変更しないことを前提とする（`09 Existing Product Constraints` = ブリーフ§41-43）。

## Phase 1 — Foundation（既存Visual Identityの置き換え）

- `tokens.json`のColor/Typography/Spacing/Radius/Shadowを実装へ反映。既存の青系識別色を`accent-greek-700`系へ置き換える。本文色・Surface色は既存実装の暖色系paper背景に近いため、変更の影響範囲は限定的。
- `ReadingLocationBar`のTranslation/View Modeチップ分離。既存breadcrumbの末尾要素を置き換えるのみで、情報構造自体は変えない低リスクな変更。
- Structural ReadingのFUNCTION/CONSTRUCTION/MORPHOLOGY配色を、既存の箱表現に適用（構造そのものは変えず、配色とラベル体系のみ更新）。

## Phase 2 — ReadingModePicker再設計

- 「読み方を選ぶ」パネルを、Reading State（`ReadingStateSwitch`）／Translation／View Modeの三段構成に分離。デスクトップから着手し、モバイルの「読み方」ボトムシートへ展開する。
- この変更は既存のTranslationデータ・View Modeデータの参照方法を変えずに、UIの見せ方のみを変更できる設計にしてある（`06`参照）——Bible Engine・Structural Dataへの変更は不要。

## Phase 3 — Mobile Comparison

- モバイルの「読み方」シートに、Single/Comparisonの切り替えを復活させる（現状消えている）。
- `ComparisonMobileStacked`の実装。Comparison Syncは新規のクライアント側スクロール処理であり、既存Search/Bible Engineへの変更を要求しない。
- 優先度が高い理由：ブリーフが最も重視する画面であり、かつ現状「モバイルでComparisonがほぼ選べない」という、ユーザーが実際に失っている機能を回復する変更でもある。

## Phase 4 — 翻訳間Comparisonのアプリ内化

- 「外部の翻訳で比較」（新改訳2017・新共同訳などを外部サイトで開く現行動線）を、段階的にTranslation Bとしてアプリ内に取り込む。
- 著作権・データライセンスの確認が必要になる可能性が高く（外部サイトへの現行導線は、データを自前で持たないことの回避策だった可能性がある）、他のPhaseと異なりプロダクト側の権利関係の精査が先行条件になる。本Design SystemはUI構造のみを準備し、データ提供元の交渉状況に合わせて着手時期を決める。

## Phase 5 — Bottom Navigation再構成

- 「本文」タブの削除、「ノート」「その他」タブの新設。既存の履歴・ハイライト・メモ機能を再配置するのみで、新規機能開発を伴わないため、Phase優先度としては低いが実装コストも低い。

## Phase 6 — 聖書［赤版］準備（実装対象外・設計確認のみ）

- 本Phaseでは実装しない。`accent-hebrew-*`トークンとRTL対応方針（`05`§7）が、実際のHebrew文字データが用意された時点で機能するかどうかの検証のみ、次回Design Phaseで行う。

## 横断的な実装方針

- Reading Position（Bible Location・Reading State・View Mode・Translation A/B・スクロール位置）は、単一の状態オブジェクトとして扱う（`08`参照）。個々のPhaseで部分的な状態管理を導入しない。
- `search-tool.html`（Concordance）・`morph-search.html`・`syntax-search.html`の画面そのものは統合しない。Phase 2以降で、Reading SurfaceからこれらへのBible Location付き導線のみを追加する。
- どのPhaseも、着手前に該当するRepresentative Screen仕様（`07`）と、`08 Critical Evaluation`の該当チェック項目を再読すること。
