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
