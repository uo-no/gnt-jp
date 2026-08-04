# External Bible View（Experimental）検証記録

作成: 2026-08-04
更新: 2026-08-04（撤回）
位置づけ: URL Import機能群（`public/core/url-import-engine.js` / `public/bookmarklet.html` /
`public/index.html`）の一部として実装を試みた、外部聖書サイト分割ビュー（Phase 2a）の検証記録。
**実装・実機検証まで完了したうえで、現時点では不採用と判断し、コードは撤回済み。**
本ドキュメントは「何を試し、何が分かったか」を残すための記録として保持する。

---

## 結論

- iframe方式で実装し、UIとしては完成させた（PC限定・sourceUrl保持・fallbackボタン併設まで一式）。
- 実機Chromeで検証したところ、BibleGateway / PRS.app / Bible.com の**3サイトすべてでiframe埋め込みがブロックされる**ことを確認した。
- 技術的に不安定なため、**現時点では採用を見送り、関連コードは全て撤回**した。
- `public/core/url-import-engine.js` によるURL Import自体、`transA=FLOW`自動表示、`sessionStorage`によるsourceUrl保持、「元の聖書サイトを開く」ボタン（新規タブ）は維持されている（本機能とは独立して価値がある部分のため）。
- 将来、埋め込み以外の方式（例: 各サービスが公式APIを提供する場合の本文取得統合、または埋め込み許可状況の変化）が現実的になった場合の**再検討候補**として記録を残す。

---

## Feature

External Bible View（Experimental） — **撤回済み**

## Purpose

URL Importした外部聖書サイトをPC画面右側へ表示し、語順フロー読解を補助する。

## Scope（実装当時）

- PC only（900px超の画面幅でのみ有効。900px以下では起動ボタン・表示領域とも非表示）
- iframe based（`#external-frame-area` 内の `#external-frame-iframe` に `sourceUrl` をそのまま `src` として設定するのみ）
- sessionStorage sourceUrl based（`app_url_import_source`。URL Import成功時にのみ保存。開閉状態は `app_url_import_split_open` で管理し、チャプター送り等のフルリロードをまたいで保持する）
- 元サイトを開くfallbackあり（`#open-source-btn`。分割ビュー表示中も常に併存させる。iframeが将来ブロックされるようになった場合の手動代替手段）

## Non-goals（実装当時から変更なし）

- 外部本文取得（本文テキストの取得・キャッシュ・保存は行わない）
- 翻訳データ統合（外部サイトの本文を本アプリの翻訳データ・Reading Japaneseへ取り込まない）
- 外部サイトとの同期（postMessage等によるスクロール位置・閲覧箇所の双方向連携。実現手段自体が現時点で存在しない）
- mobile split view

## Supported（検証対象。いずれも埋め込み不可を確認）

- BibleGateway
- Bible.com（YouVersion）
- PRS.app

## 撤回理由（詳細）

事前のヘッダー調査（X-Frame-Options / CSP frame-ancestors）では3サイトとも明示的なブロックヘッダーが
確認できず、Playwrightでのiframe埋め込みテストでも一度は成功していたが、**実機Chromeでの利用時に
3サイトともブロックされることを確認**した。ヘッダーベースの事前調査だけでは実運用時の埋め込み可否を
確実に判定できないことが分かった（検証環境と実機の差、あるいはサイト側のクライアントサイドでの
フレーム検知等が影響した可能性がある）。

自動検知によるフォールバック切り替えも、クロスオリジンの制約上確実な手段が存在しないため実装していない。
以上より、iframe方式は現時点で採用条件（安定して動作すること）を満たさないと判断した。

## 将来的な再検討候補

- 各サービスが提供する公式API（例: YouVersion Platform APIが2026年4月に新規公開されたことを別途確認済み）を用いた、埋め込みではなく本文取得ベースでの統合。ただしdeveloper登録・app key取得・訳版ライセンス確認という新たな運用コストが発生し、「分割ビュー」ではなく実質的に「新しい翻訳ソースを追加する」機能に近くなる点に留意。
- 埋め込み許可状況が将来的に変化した場合の再評価。

## 撤回時の変更範囲

`public/index.html`のみ。以下を完全削除した。

- `#open-split-btn`（起動ボタン）
- `#external-frame-area` / `#external-frame-toolbar` / `#external-frame-close-btn` / `#external-frame-iframe`
- `.split-external-mode`関連CSS一式（`@media`ブロック含む）
- `_syncExternalSplitButton()` / `_openExternalSplitView()` / `_closeExternalSplitView()` / `_restoreExternalSplitViewIfNeeded()`
- `URL_IMPORT_SPLIT_KEY`（`app_url_import_split_open`）

以下は維持した。

- `_getValidUrlImportSource()` / `_syncUrlImportSourceButton()` / `_openUrlImportSource()`
- `#open-source-btn`（元の聖書サイトを開く。新規タブ）
- `app_url_import_source`の保存処理、`transA=FLOW`自動表示

Router / ShareURLService / AppState / `transA`・`transB` / MobileVerseView / 既存の `compare-mode` は、
導入時・撤回時のいずれにおいても変更していない。
