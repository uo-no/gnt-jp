# アーキテクチャルール

本プロジェクトの構造を守るための強制ルール集です。
旧パス文字列の混入は `scripts/path-audit.js` および `.github/workflows/path-check.yml` によって自動検証されます（VR-5 回帰ゲートにも組み込み済み）。

> 2026-11-07 の整理で、責務表のパスを現行構造（全て `public/` 配下）に合わせて修正しました。旧版が前提にしていた `pages/` は実在しません。

---

## ディレクトリ責務

| ディレクトリ | 責務 | 禁止事項 |
|---|---|---|
| `public/*.html` | UI の画面（index / search-tool / bookmarklet） | ロジックの集積（画面ロジックは `public/app/` へ） |
| `public/app/` | 画面ロジック（state / loaders / renderers / ui / boot.js） | 解析判断の持ち込み（解析は `core/`） |
| `public/core/` | 解析ロジック（純関数） | DOM / window への依存 |
| `public/assets/js/` | UI 補助・共通部品・形態デコード・i18n | データの直接生成・編集 |
| `public/assets/data/` | 実データ（JSON / TSV / JS） | 手動編集（scripts/ 経由のみ可） |
| `public/css/` | スタイル定義（tokens.css がトークンの正本） | ロジックの記述 |
| `scripts/` | 生成・監査・回帰テスト | 本番 UI から直接参照 |
| `docs/` | 設計・仕様ドキュメント | 実行コードの配置 |

---

## 禁止パス（自動検出）

以下は旧配置時代のパス文字列です。現行コード（`*.js` / `*.html`）への新規混入を **禁止** します（履歴文書が当時のパスを記録している場合を除く）。

| 禁止パス | 移行先（現行） |
|---|---|
| `./data/` | `public/assets/data/` |
| `./js/` | `public/core/` または `public/assets/js/` |
| `./index/` | `public/assets/data/index/` |
| `./lexicon/` | `public/assets/data/lexicon/` |

---

## 設計原則

- **画面は薄く保つ** — ロジックは `public/app/`、`public/core/` または `public/assets/js/` へ。`index.html` にインライン JS を書かない
- **`core/` は DOM に依存しない** — Node.js 単体でも動作する純関数のみ
- **`assets/data/` は直接編集しない** — 必ず `scripts/` 経由で生成する
- **`scripts/` でのみデータ生成する** — アドホックな手動加工はしない

---

## 検証コマンド

```sh
# ローカル監査（旧パス検出）
npm run audit

# ローカルの pre-commit hook と同等のチェック（hook 本体はリポジトリに含まれない）
npm run check
```

---

## 違反した場合

1. GitHub へのプッシュ後、CI (`path-check.yml`) が fail します
2. 上記が発生したら、`npm run audit` で箇所を特定し修正してください
