# 画面別スタイル監査（2026-10-19）

範囲: 読書モード、StudyPanel、検索、ハイライト、読書履歴。形態論・統語論の独立ページは今回の横断統一から除外する。

このファイルはCSSソースを読んだ時点の棚卸し。ブラウザのcomputed styleや視覚回帰テストの結果ではない。セレクタの上書きやメディアクエリがあるため、実際に表示される最終値は画面幅・状態ごとに確認が必要。

## 画面別の観測値

| 画面・領域 | 実装で確認できた値 | トークン利用 | 判断 / 次の確認 |
|---|---|---|---|
| 読書本文 | .verse-block は選択背景に --accent-light、遷移に --transition-fast を使用。本文の文字サイズは関連セレクタ・モードで変わるため、このルール単体から一つの値には確定できない。 | 背景・遷移・角丸は共有トークン | Single / Comparison / 口語訳 / 語順表示ごとに実効値を抽出する。 |
| 節本文の参照ラベル | #mobile-verse-area .mvv-ref とインスペクタ内の同クラスはcaption、weight 600、--tracking-subsection。色は今回 #a0a0a6 から var(--text-hint) に変更。 | サイズ・字間・色は共有トークン | 色変更後のコントラストと視認性をブラウザで確認する。 |
| StudyPanel内の節本文 | #mobile-inspector-area .mvv-inline-translation: --font-prose, --text-body-lg (1rem), line-height 2.1, letter-spacing .01em。内側余白は --rhythm-macro-min / --space-md。 | 大部分は共有トークン、行間・字間は直指定 | 口語訳・比較本文との相対サイズを実画面で確認する。 |
| StudyPanel辞書・用例 | .rn-usage-list / .rn-dict-full-text: --font-prose, --text-reading (15px), line-height 1.8, letter-spacing .01em。 | family/sizeは共有、行間/字間は直指定 | Desktopとmobileの値が一致するか確認する。 |
| 語の表示チップ | .wlv-chip-ja: --text-body-lg (1rem), line-height 1.3, letter-spacing -.01em。mobile inspector overrideは line-height 1.4 / letter-spacing .01em。 | family/sizeは共有、行間・字間は直指定 | これは意図的な密度差か、同じ役割の不一致か、語順表示を目視して判断する。 |
| StudyPanel本文幅・余白 | #reading-notes-area: max-width 44em、左右は --rhythm-macro-min、下部60px。 | 一部トークン、下部余白・幅は直指定 | 画面遷移時の中心軸と本文幅を比較する。60pxを単純に32pxへ変更しない。 |
| StudyPanel高さ | #bottom-depth-panel の高さはviewportと画面幅に応じて46vh / 40vh / 70vh / 98vhなどの設定がある。 | 専用CSS変数で状態別に管理 | これは余白トークンではなくパネル寸法。各ブレークポイントでドラッグ・展開状態を確認する。 |
| 検索画面の新レイアウト | --s-ts-*, --s-lh-*, --s-sp-*, --s-radius-*, --s-dur-* の独立体系。基本文字サイズは0.72–1.6rem、行間1.35/1.6/1.85、余白4–64px。 | アクセントはruntime共通色を参照するが、他の尺度は独自 | 共通トークンへの移行前に各tokenが実際に使われる領域と例外をマッピングする。 |
| 検索画面の既存情報パネル | 検索ページ内に --space-* や --text-body などruntime共通トークンも混在。旧パネルの一部は非表示ルールを持つ。 | 新しい --s-* と共通トークンが混在 | active DOMかどうかを確認し、表示中の画面に限定して統合対象を選ぶ。 |
| ハイライト | ユーザー選択色は yellow / blue / green / pink を保持。CSSには色別のswatchと本文マーカーがある。 | ユーザー選択色として独立 | Product Accentに統一しない。各色のコントラスト、ダーク背景・選択状態での視認性を別途評価する。 |
| 読書履歴・再開カード | .list-item-card と .rv-continue-card のfocus-visible輪郭は --focus-ring に変更済み。 | focus色は共有トークン | 行間、ラベルサイズ、アイコンのタップ領域、空状態と削除操作は未監査。 |

## 2026-10-19 追跡：役割別タイポグラフィトークンの導入

値を変えずに共通参照へ移行した箇所：

- `public/css/tokens.css` にfont-weight役割（400/500/600/700）、日本語本文・読書本文・辞書・語チップ・ギリシャ語見出しのline-height役割、本文字間 `--tracking-reading` を追加。
- `public/index.html` の `.reading-prose`、`.greek-headword`、StudyPanel内本文・辞書本文・語チップ、`.ui-label` で対応トークンを参照。
- `public/search-tool.html` の `.s-label` で `--weight-semibold` を参照。
- これらは元の数値と同値。見た目を変える意図はないが、ブラウザでの視覚確認はまだ行っていない。

## 2026-10-19 追跡：Spacing / Radius

- 共通runtime spacingへ12px / 48px / 64pxを拡張値として追加。既存の基本リズム値は維持。
- 検索画面の `--s-sp-1`〜`--s-sp-8` を、値が一致する共通spacing tokenへのaliasに変更。
- 検索画面のチップ角丸4pxとパネル角丸8pxを `--radius-s` / `--radius-m` へ接続。
- 背景、独自フォント・行間、6px / 10px角丸、motionは未変更。
- GitHubソースを再取得して確認。computed style・視覚比較・Playwrightは未実施。

## 2026-10-19 追跡：検索画面の文字サイズトークン

- `public/search-tool.html` の `font-size: 0.72rem` 8箇所を `--s-ts-xs`、`0.82rem` 3箇所を `--s-ts-sm`、`0.92rem` 2箇所を `--s-ts-base` に移行。
- 各トークンと元の値は同値。GitHub再取得で対象の直接指定が残っていないことを確認。
- それ以外の小さい文字サイズは、バッジ・補助情報など役割が異なる可能性があるため一括統合していない。
- ブラウザcomputed style・視覚比較・Playwrightは未実施。

## 共有トークンへの対応で優先する候補

1. **高:** mvv-ref の色を --text-hint に統一（実装済み、視覚確認待ち）。
2. **高:** 主要な focus-visible を --focus-ring に統一（実装済み、視覚確認待ち）。
3. **高:** 読書本文 / 比較本文 / StudyPanel本文のサイズ・行間の実効値を画面幅別に採取。
4. **中:** StudyPanelの本文幅、セクション余白、60pxの末尾余白を役割ごとに説明し、必要なものだけ意味トークン化。
5. **中:** 検索画面の --s-* をruntimeトークンにマッピングし、役割が一致するものだけ共通化。
6. **低:** 使用されていない可能性のある .app-badge--blue/green/amber を、JSによる動的参照も含めて調べてから整理。
7. **維持:** ハイライト色、意味色、構造読解のFUNCTION / CONSTRUCTION / MORPHOLOGY色は別の役割であり、ブランド色へ一律統合しない。

## 完了条件

- Desktopとmobileの実効スタイル（computed values）を記録。
- Reading / StudyPanel / Search / Highlights / Historyそれぞれの主要状態をスクリーンショットで確認。
- tokenへの移行後に、本文の読みやすさ・比較時の情報階層・キーボードフォーカス・タップ領域に回帰がないことを検証。
- 検証済みの値だけをDesign Systemの規範値として昇格する。


## 2026-10-19 最終ソース監査と区切り

今回、追加の実装変更を増やすより、未確認項目を再点検して完了条件を明確にする。

- StudyPanelのモバイル用チップ文字サイズ指定を分離し、上書きされる指定を削除済み（e4943e7c）。
- StudyPanelのモバイル比較セクション余白の上書き指定を削除済み（fbfd262a）。
- 節の読書メモ本文について、PC/語リスト側の文字サイズとモバイル節側の文字サイズを別ルールに分離済み（d82c2ded）。
- モバイル辞書本文の margin-top: 0 は基本ルールと重複していたため削除済み。モバイル固有の overflow-wrap: anywhere は維持（e12f5aea）。
- .app-badge--blue / .app-badge--green / .app-badge--amber は、現行 public/index.html 全文にクラス名の参照が見つからなかった。CSS削除対象としては変更せず、不要なルールが存在するかの確認課題から除外。
- 検索画面の --s-sp-* と角丸aliasは対応するruntime tokenへ接続済み。検索固有の文字体系・色・6px/10px角丸などは、役割が一致すると確認できていないため維持。

### 判定

**ソース上で明確に確認できた重複・上書き指定の整理は、いったん終了候補とする。** 同じ役割と確認できない数値の一括統一や、見た目を確認せずに行う追加のCSS整理は行わない。

### 完了前に残る必須確認（未実施）

1. Desktop / mobileで読書本文、比較表示、StudyPanel（節・語）、検索、ハイライト、履歴を実画面確認。
2. mvv-ref の色コントラスト、チップの字間・行間、StudyPanelの高さと末尾余白、検索画面の旧/新パネル表示状態を確認。
3. 主要操作をPlaywright等で回帰確認し、必要ならスクリーンショットを保存。

この時点ではGitHubソースの確認のみ。ブラウザのcomputed style、視覚回帰、Playwright、Cloudflareデプロイ状態は未確認のため、デザインシステム全体を「検証完了」とは扱わない。
