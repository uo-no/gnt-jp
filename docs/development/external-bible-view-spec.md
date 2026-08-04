# External Bible View（Experimental）仕様

作成: 2026-08-04
位置づけ: URL Import機能群（`public/core/url-import-engine.js` / `public/bookmarklet.html` /
`public/index.html`）の一部として実装された、Phase 2a（外部聖書サイト分割ビュー）の現行仕様。
Experimental機能として扱う（§1参照）。

---

## Feature

External Bible View（Experimental）

## Purpose

URL Importした外部聖書サイトをPC画面右側へ表示し、語順フロー読解を補助する。

## Scope

- PC only（900px超の画面幅でのみ有効。900px以下では起動ボタン・表示領域とも非表示）
- iframe based（`#external-frame-area` 内の `#external-frame-iframe` に `sourceUrl` をそのまま `src` として設定するのみ）
- sessionStorage sourceUrl based（`app_url_import_source`。URL Import成功時にのみ保存。開閉状態は `app_url_import_split_open` で管理し、チャプター送り等のフルリロードをまたいで保持する）
- 元サイトを開くfallbackあり（`#open-source-btn`。分割ビュー表示中も常に併存させる。iframeが将来ブロックされるようになった場合の手動代替手段）

## Non-goals

- 外部本文取得（本文テキストの取得・キャッシュ・保存は行わない。iframeによる表示のみ）
- 翻訳データ統合（外部サイトの本文を本アプリの翻訳データ・Reading Japaneseへ取り込まない）
- 外部サイトとの同期（postMessage等によるスクロール位置・閲覧箇所の双方向連携は行わない。実現手段自体が現時点で存在しない）
- mobile split view（モバイル幅では分割ビューを提供しない。既存の「新規タブで開く」導線に一本化する）

## Supported

- BibleGateway
- Bible.com（YouVersion）
- PRS.app

## Note

外部サービス側の仕様変更（X-Frame-Options / CSP frame-ancestors の追加等）により、
いつでも利用できなくなる可能性がある。ブロック発生の自動検知は行わないため
（クロスオリジンの制約上、確実な検知手段が存在しない）、その場合は`#open-source-btn`
（新規タブで開く）による手動フォールバックのみが有効な代替手段となる。

---

## 関連実装箇所（`public/index.html`内）

| 要素/関数 | 役割 |
|---|---|
| `#open-split-btn` | 分割ビュー起動ボタン（app-header内、sourceUrl存在時のみ表示） |
| `#external-frame-area` / `#external-frame-iframe` | iframe表示領域（`.split-external-mode`時のみ表示） |
| `_syncExternalSplitButton()` | ボタン表示可否の同期 |
| `_openExternalSplitView()` / `_closeExternalSplitView()` | 分割ビューの開閉 |
| `_restoreExternalSplitViewIfNeeded()` | セッション内での開閉状態復元 |
| `_getValidUrlImportSource()` | sourceUrlの検証（http/https以外は無視。`_openUrlImportSource()`と共用） |

## 既存経路との関係（変更していないもの）

Router / ShareURLService / AppState / `transA`・`transB` / MobileVerseView / 既存の `compare-mode` は
本機能の実装にあたって一切変更していない。`.split-external-mode` は独立した新規CSSクラスであり、
`compare-mode` と同時に有効化された場合はiframe側を隠す防御ルールのみを追加している。

## 既知の限定事項

- 分割ビュー中に静的ページ（ロードマップ等）へ遷移した場合の見た目は未対応。
- StudyPanel展開時は既存compare-modeと同様に列2（iframe）を一時的に隠す。
