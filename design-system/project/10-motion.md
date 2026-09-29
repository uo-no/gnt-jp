# Motion

`tokens.json`のスキーマにはmotion用のトークンファミリーが存在しない（`format.md`で明示されている制約）。そのため、モーションの値・適用箇所は消費可能なトークンとしてではなく、このドキュメント一枚に集約する。実装時はここで定める値をCSSのカスタムプロパティ等としてコード側に直接定義してよいが、本システムの`tokens.json`側には追加しない。

すべての値は**本Design Systemが定める設計値**であり、現行実装（`uo-no/gnt-jp` main）の実測トランジション時間を調査した結果ではない——既存実装のアニメーション速度は今回の読み取り専用調査の対象外であり、未確認である。実装時に既存コードへ組み込む際は、ここに定める値と既存の他のトランジション（もし存在すれば）との整合を別途確認すること。

## 1. 原則

- 控えめで機能的。装飾目的のモーション（派手なページ遷移、パルスするバッジ、注意を引くための揺れ）は使わない（`05`§1 Avoid）。
- モーションは「状態が変わったこと」「元の場所に戻ったこと」を裏付けるためだけに使う——モーション自体が情報を運ばない。
- `prefers-reduced-motion`が指定されている場合、下表のすべての遷移はクロスフェード・スケール・スムーススクロールなしの即時切り替えに置き換える。Sticky Label（`03`§5.5）のようなCSSネイティブな挙動は、ブラウザ側の`scroll-behavior`設定にも従う。

## 2. インタラクション別リファレンス

| インタラクション | 値 | 対象コンポーネント / 参照 | 備考 |
|---|---|---|---|
| 節ジャンプのスムーススクロール | 200–260ms, ease-out | `ComparisonMobileStacked`（`03`§5.6） | `scrollIntoView`相当。連続同期ではなく一回限り。 |
| ジャンプ着地時のハイライト | `accent-greek-100`背景を0.6秒でフェードアウト | `ComparisonMobileStacked`（`03`§5.6）、Research Return（`07`#9） | 同一の視覚言語を2箇所で再利用——システム内で一貫させる。 |
| Comparison Sync（Desktop 2ペイン追従） | 200–260ms, ease-out | Desktop Comparison（`03`§3） | pixel-perfect syncを狙わないため、動き自体も急に感じさせない範囲に収める。Mobile Stackedには追従の仕組み自体が存在しない（`03`§5.3）。 |
| Research Return ハイライト | `accent-greek-100`を`space-4`分の背景として0.6秒フェードアウト | Research → Return（`07`#9） | 唯一許容する装飾的モーション。状態遷移の正しさを裏付ける目的に限定。 |
| Panel / Sheetの開閉 | クロスフェード、200–260ms, ease-out | 読み方を選ぶパネル、Research側パネル、Mobile Comparison Setupシート（`03`§5.9） | Reduced Motion時は即時表示に切り替える。 |
| Popoverのフェード | 200–260ms, ease-out | 語タップ時の語義要約Popover（`06` Supporting Interaction） | |
| Sticky Translation Label（Sticky切り替わり） | モーションなし（ブラウザネイティブのsticky挙動のみ） | `ComparisonMobileStacked`（`03`§5.5） | JSによるスクロール監視・追従処理を持たない——「モーションを設計しない」こと自体がこのパターンの利点。 |

## 3. コンポーネント別の未確認状態（Motionに関連する範囲）

`06-component-architecture.md`「Component States」で個別に扱うHover/Pressed/Focus-visibleの遷移時間も、本来はこの表の対象になる。ただし現行実装ではPressed/Focus-visibleのトランジション時間そのものが確認できていない項目が多く（`06`参照）、ここでは新たな時間値を捏造しない。実装時、Hover/Pressed/Focus-visibleの遷移にもこの文書の200–260ms・ease-outという基準を適用することを推奨するが、これは推奨であって確認済みの値ではない。
