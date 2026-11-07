# docs/ — 案内

このフォルダは、アプリの設計・仕様・履歴の置き場です。本書は案内に徹し、内容の正本は各文書に置きます（全体の案内は [../README.md](../README.md)、開発ルールは [../CLAUDE.md](../CLAUDE.md)）。

> 旧版の本書は `pages/` 前提の旧構造で機能・技術構成を複製していましたが、二重持ちが陳腐化の原因になるため、2026-11-07 の整理で案内文書に縮小しました。アプリの機能・技術構成の説明は README と CLAUDE.md が正です。

---

## 直下の現行文書

| 文書 | 役割 |
|---|---|
| [architecture-rules.md](architecture-rules.md) | ディレクトリ責務と禁止パス（旧パス混入は `scripts/path-audit.js` と CI が自動検証） |
| [ai-workflow.md](ai-workflow.md) | 専門エージェント（`.claude/agents/`）の連携フロー。上位規範は CLAUDE.md |
| [LICENSE.md](LICENSE.md) | コードのライセンス（MIT） |
| [DATA_LICENSE.md](DATA_LICENSE.md) | 収録データ（聖書本文・辞書・形態素索引等）の扱い。コードとデータでライセンスが異なる |

直下には検索設計系のデータ（`*.tsv`：wallace_ontology_merged、syntax_patterns、query_*、patch_* 等）も置かれている。コードからは参照されない設計資料で、TSV 同士が相互に参照し合う。

---

## サブフォルダ

| フォルダ | 中身 |
|---|---|
| `development/` | 設計・仕様・フェーズ作業記録（241 件）。**現行コードのコメントから設計正典として参照される文書を含むため、移動しない。** 分類は [development/INDEX.md](development/INDEX.md) |
| `archive/` | 完了した監査・実装報告（64 件）。コード内コメントから報告パスとして参照されるものを含む |
| `specs/` | 層アーキテクチャと StudyPanel の evidence-first 方針 |
| `search/` | 検索インデックスの事前生成への移行メモ |
| `content-platform/` | 監査の振り返りパターン（v0.1） |

---

## どこに何を書くか

- **現行の仕様・設計判断** → `development/`（設計正典になるものは、コード側コメントからのパス参照が付く前提で置く）
- **完了した監査・フェーズの記録** → `archive/`、または `development/` に置いて INDEX の分類で「完了記録」と示す
- **アプリから公開する仕様** → `public/docs/`（例：reading-japanese-specification.md）。ここは配信対象なので、内部文書は置かない
- **スクリプトの証跡出力** → `scripts/output/`（現役）／ `scripts/archive/output/`（凍結）。docs/ には置かない

## ロードマップ

単一ソースは `public/assets/data/roadmap.json`（アプリ内の ℹ️ → ロードマップからも確認できる）。本書には複製しない。
