# デザインシステム全体監査（2026-10-19）

## 目的と範囲

色だけでなく、フォントファミリー、文字サイズ、行間、ウェイト、字間、余白、幅、高さ、角丸、境界線、影、透明度、モーション、レスポンシブ境界、タップ領域、フォーカス、コントラスト、コンポーネント状態を、設計文書・トークン・実装コードで照合した。

主対象は読書画面、StudyPanel、検索、ハイライト、履歴。形態論・統語論の独立ページは今回のUI統一対象から外す。ただし共有トークンを消費する箇所や、現行コードに含まれる意味色は勝手に変更しない。

## 正本の優先順位

1. 実際の共通UIトークン: `public/css/tokens.css`
2. 現行の実装: `public/index.html`、`public/css/layout.css`、`public/css/components.css`
3. 検索画面固有の実装: `public/search-tool.html` の `--s-*` と検索マーカー変数
4. 設計原則・判断履歴: `design-system/project/DESIGN.md`、`05-visual-language-and-foundations.md`、`README.md`、`10-motion.md`
5. 本監査と `design-system.html`: 現状・未解決差分の案内。トークン生成元や実装の代替ではない。

## 監査で確認したこと

### 色
- 共通アクセントは `--accent: #2c4f34`、薄い背景と枠線は `--accent-light` / `--accent-mid`。
- `--color-domain` は固定紫色から `var(--accent)` へ変更済み。
- 検索の `--lemma` / `--phrase` とその背景・枠線は `--s-accent` 系へ接続済み。lemma下線も共通アクセントの中間値を参照。
- 検索の選択状態も共通アクセントに統一済み。
- 成功・注意・エラー、構造読解FUNCTION / CONSTRUCTION / MORPHOLOGY、RK用の色は意味を持つ別体系。今回の色統一の対象として一括変更しない。
- `public/index.html` 内には固定色が残る。すべてが装飾色とは限らず、選択色、異読、ハイライト、構造意味色などの用途を特定してから整理する。

### フォント・文字サイズ
- 共通トークンにはUI `--font-ui`、日本語読書系 `--font-prose`、ギリシャ語 `--font-greek` がある。
- 共通サイズ階層は `--text-caption`、`--text-body`、`--text-body-lg`、`--text-title`、`--text-headline`、`--text-display`、加えて `--text-reading` / `--text-label`。
- 現行runtime `public/css/tokens.css` には行間・font-weightの役割別スケールがない。一方、Design Systemの `tokens.json` にはUI・日本語本文・ギリシャ語本文などの役割別font-size / line-height / font-weightがある。生成された `design-system/project/tokens.css` も存在するが、runtimeのトークン体系へ対応づけられていない。実装ではline-heightやfont-weightが直指定される。
- 設計資料には日本語本文16px / line-height 2.1と17px / 34pxの記録差がある。ギリシャ語本文にも18px / 34pxの設計記録がある。現行画面の全セレクタを実測・照合してから正式値を確定する。
- 検索画面は `--s-ts-*` と `--s-lh-*`、独立したフォントファミリーを持つ。意味は近いが共通体系へ完全統合されていない。

### 余白・寸法
- 共通トークンは4 / 8 / 16 / 24 / 32px。役割の別名としてmicro、medium、macroのリズムを持つ。
- 共通CSSには40pxのセクション間隔などの直接指定がある。読書画面にも12px、48px、vhなどの個別値がある。
- 検索画面は4 / 8 / 12 / 16 / 24 / 32 / 48 / 64pxの別スケール。
- 本文側のページ例は680px、検索側の最大幅は720px。読書面と検索面の役割差があるため、値を即時統一せず意図を明文化する。
- StudyPanelの高さは画面幅・モードによりvh/px/clampを組み合わせている。単純なspacing tokenに押し込まず、パネル寸法の役割別仕様が必要。

### 形・境界・影・透明度
- 共通角丸は4 / 8 / 16 / pill。検索側は4 / 6 / 6 / 10 / 8pxの別値。
- `design-system/project/tokens.json` → `design-system/project/tokens.css` はgenerated CSSとして関係が明記されている。別途、現行runtimeは `public/css/tokens.css` を参照し、色・フォント・余白・角丸などの名前と値が異なる。両体系の対応表が未整備で、境界線色も命名・構成が一致していない。
- 共通CSSにはborder-radius 999pxや個別の境界幅の直接指定が残る。ドット・円形アイコンなど意図的な例外を分けて確認する。
- opacityは1 / .6 / .3 / .15の役割値があるが、適用後の文字コントラストは画面ごとの確認が必要。
- 共通影は `--shadow-card`、検索側は独立したmodal shadowを持つ。

### モーション・レスポンシブ・アクセシビリティ
- 共通durationは150 / 200 / 300ms、検索側は140 / 180 / 220 / 280ms。Design Systemのmotion文書は目標値であり、実測値とは明記されていない。
- 実装で確認できるメディア境界は390、480、520、600、768、769、800、900、901、1366pxなど。統一ブレークポイントとして確定していない。
- 主要操作には44×44px以上のタップ領域を適用した変更があるが、すべてのインタラクティブ要素に適用済みとは未確認。
- `--focus-ring` は存在するが、全操作要素で一貫して使われているかは未確認。古い設計記述に残る紫・青のフォーカス色は現行実装と照合が必要。
- reduced-motion、全色コントラスト、キーボード操作、画面幅別の実表示はブラウザ横断で未確認。

## 不足している定義（追加候補）

1. **Typography roles:** font-weight、line-height、本文・UI・見出し・メタ情報のサイズ/行間/字間の役割別セット。
2. **Spacing map:** 4/8/12/16/24/32/40/48/64pxがどの役割で必要か。重複値は統合し、40pxなどの必要な値は意味名を与える。
3. **Layout dimensions:** reading width、search width、header height、panel height、safe-area inset、sticky offsetの役割別仕様。
4. **Responsive breakpoints:** 390/480/520/600/768/769/800/900/901/1366の使用理由、優先順位、削減候補。
5. **Shape and border map:** radius、border width、focus width、divider、shadowの役割対応表。
6. **Interaction states:** default / hover / active / selected / pressed / focus-visible / disabled / loading / empty / errorの見た目とアクセシビリティ要件。
7. **Accessibility:** タップ領域、コントラスト、色に依存しない区別、reduced-motion、フォーカスの共通検証表。
8. **Theme family:** Product Accentだけを差し替える層、固定する意味色、赤版・青版で検証する項目の分離。
9. **Token mapping:** `design-system/project/tokens.json` → `design-system/project/tokens.css` は生成関係が明記されている。これと独立したruntime `public/css/tokens.css` の対応表を作り、意味・値・使用箇所を照合する。生成物は手編集しない。
10. **Screen audit matrix:** Reading / StudyPanel / Search / Highlights / Historyごとに、実装値、設計値、差分、目視検証状況を追跡する。

### 暫定の不足定義案（採用前に目視検証）

以下は実装済みの値ではなく、欠落していた設計項目を検討できる状態にするための提案である。

- **Font weight:** 400 / 500 / 600 / 700。本文400、UIラベル500–600、強調700を基本候補とする。
- **Line-height:** UI tight 1.35、UI body 1.6、日本語読書本文2.0–2.1、辞書・注釈本文1.5–1.7を候補とする。日本語本文とギリシャ語本文の現行値をセレクタ単位で確認してから確定する。
- **Letter-spacing:** 本文0–0.01em、UIラベル0.04–0.10em、セクションラベル0.14emを候補とする。既存tracking tokenとの対応を整理する。
- **Spacing:** 既存の4 / 8 / 16 / 24 / 32pxを基本とし、12px、section-gap 40px、48px、64pxを意味付き拡張候補として定義する。不要な値を増やすのではなく、実装上の反復と役割を確認して採否を決める。
- **Responsive:** 390 / 480 / 520 / 600 / 768–800 / 900pxを候補群として棚卸しする。隣接する768/769、900/901は、切替挙動の確認後に整理する。
- **Layering:** z-indexの共通役割スケールが未定義。header / drawer / StudyPanel / modal / overlayの重なり順を実装調査してから定義する。
- **Interaction states:** default / hover / pressed / selected / focus-visible / disabled / loading / empty / errorを画面横断のチェック項目にする。
- **Token source:** JSONと生成CSS、runtime CSSの生成関係を確認するまでは、生成物に新規キーを手作業で追加しない。

これらは全ての値を機械的に一つに揃えるという意味ではない。読書本文、検索操作、構造意味色のように目的が違う値は、違いの理由を定義する。

## HTML参照

`design-system.html` は全体を閲覧するための単独HTML。色・文字・余白・形・モーション・レスポンシブ・アクセシビリティ・差分一覧をまとめる。自己完結型の表示であり、実装CSSの生成物ではない。

## 検証状況

- GitHub上の対象ファイルを再取得してソース内容を確認。
- 色トークン変更と今回のfocus-visible輪郭変更はGitHub上で再取得確認済み。読書画面の紫色fallbackは0件になった。
- HTMLのブラウザ表示・全画面の視覚回帰テスト・コントラスト実測は未実施。
