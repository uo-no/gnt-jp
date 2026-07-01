# アーキテクチャルール

本プロジェクトの構造を守るための強制ルール集です。
`scripts/path-audit.js` および `.github/workflows/path-check.yml` によって自動検証されます。

---

## ディレクトリ責務

| ディレクトリ | 責務 | 禁止事項 |
|---|---|---|
| `pages/` | UI のみ（HTML） | ビジネスロジックの記述 |
| `core/` | 解析ロジック（純関数） | DOM / window への依存 |
| `assets/js/` | UI 補助・状態管理 | データの直接生成・編集 |
| `assets/data/` | 実データ（JSON / TSV） | 手動編集（scripts/ 経由のみ可） |
| `css/` | スタイル定義 | ロジックの記述 |
| `scripts/` | ビルド・データ生成 | 本番 UI から直接参照 |
| `docs/` | 設計・仕様ドキュメント | 実行コードの配置 |

---

## 禁止パス（自動検出・コミット拒否）

以下の旧パスはリファクタリングで廃止されました。
コードまたはコメントへの記述を **禁止** します。

| 禁止パス | 移行先 |
|---|---|
| `./data/` | `./assets/data/` |
| `./js/` | `./core/` または `./assets/js/` |
| `./index/` | `./assets/data/index/` |
| `./lexicon/` | `./assets/data/lexicon/` |

---

## 設計原則

- **`pages/` は薄く保つ** — ロジックは `core/` または `assets/js/` へ
- **`core/` は DOM に依存しない** — Node.js 単体でも動作する純関数のみ
- **`assets/data/` は直接編集しない** — 必ず `scripts/` 経由で生成する
- **`scripts/` でのみデータ生成する** — アドホックな手動加工はしない

---

## 検証コマンド

```sh
# ローカル監査（旧パス検出）
npm run audit

# pre-commit hook と同等のチェック
npm run check
```

---

## 違反した場合

1. `git commit` が pre-commit hook によりブロックされます
2. GitHub へのプッシュ後、CI (`path-check.yml`) が fail します
3. 上記いずれかが発生したら、`npm run audit` で箇所を特定し修正してください
