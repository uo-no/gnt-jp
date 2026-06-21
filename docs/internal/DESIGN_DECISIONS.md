# DESIGN_DECISIONS.md

コードから読み取れる判断理由のみを記載する。コードの逐次説明はARCHITECTURE.md／DATA_FLOW.md／FEATURE_MAP.mdを参照し、本ファイルでは行わない。

---

## 1. AppStateを変更せずURL共有機構を外付けした判断

`index.html`の`ShareURLService`/`Router`/`getShareState`/`applyShareState`/`syncUrlState`/`notifyAppStateChange`は、`AppState`の定義自体を変更せず、`AppState`の読み取りを`getShareState()`一箇所に集約する形で実装されている。既存の状態管理構造に手を加えずにURL共有機能を追加する判断が読み取れる。

---

## 2. URLパラメータを画面ごとに独立して許可リスト管理する判断

`morph-search.html`/`syntax-search.html`/`search-tool.html`の`syncURL()`は、いずれも`location.search`をコピーせず`new URLSearchParams()`で毎回新規にパラメータを構築する。画面ごとに出力するパラメータの種類を独立して管理する判断が読み取れる。

---

## 3. オンボーディングとURL同期を分離した判断

`window.__onboardingActive`フラグと`_syncOnboardingActiveFlag()`により、オンボーディング進行中は`syncUrlState()`の実行を止める構造になっている。チュートリアル表示中の一時的な画面状態がURLに反映されないようにする判断が読み取れる。

---

## 4. 条件式評価にネイティブ`eval()`を使わない判断

`syntax-analyzer.js`の`CheckEvaluator.eval()`は独自パーサーであり、JavaScriptネイティブの`eval()`／`new Function()`は使用されていない。コード内コメントに「check 文字列を直接 eval() しない」と明記されており、意図的にネイティブ評価を避けた判断であることが読み取れる。

---

## 5. コードとデータのライセンスを分離した判断

ライセンス文書はコード対象の`LICENSE.md`とデータ対象の`DATA_LICENSE.md`に分離されている。コードとデータで出典・権利関係の性質が異なることを踏まえた判断が読み取れる。

---

## 6. エスケープ処理が画面ごとに個別実装されている状態

`_escH()`は`morph-search.html`と`syntax-search.html`にそれぞれ個別定義されており、共通ファイルへの集約はされていない。4画面を独立したアプリケーションとして個別実装する設計（ARCHITECTURE.md参照）の結果として、エスケープ処理についても画面横断での統一が行われていない状態になっていると読み取れる。`index.html`・`search-tool.html`では同名の関数定義が確認できておらず、4画面間でエスケープ方針が共通化されているかどうかは、本文書の確認範囲では判断できない。

---

## 7. 未確認事項

- 上記はいずれもコード構造からの読み取りであり、設計文書・コミットメッセージ等の一次資料による裏付けは確認していない。
- 6節について、`index.html`・`search-tool.html`に`_escH`相当の処理が別名で存在するかどうかは未確認であり、「方針が統一されていない」という記述はその未確認を前提とした暫定的なものである。
