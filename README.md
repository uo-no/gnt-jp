# gnt-jp

ギリシャ語新約聖書・七十人訳（LXX）を、原語に触れながら読み進めるための**静的Webアプリ**。
サーバーもビルドも持たず、ブラウザ上でそのまま動作する。本番: https://bible-text.pages.dev

**「1タップで、翻訳の向こう側へ。One tap, BEYOND TRANSLATION.」**

> この README は**案内板**である。詳細は持たず、行き先だけを示す。
> 規則は [CLAUDE.md](CLAUDE.md)、仕様と履歴は [docs/](docs/)、コマンドは `package.json` を正とする。

---

## Quick Start

1. **コードを書く前に [CLAUDE.md](CLAUDE.md) を読む。** 目的・設計思想・禁止事項がそこにある。
2. ビルド不要。`public/` を静的配信すればそのまま動く。
3. 実行できる作業（監査・テスト・ビルド）は `package.json` の scripts を参照する。生成・監査スクリプトの運用は [scripts/README.md](scripts/README.md)。

---

## 目的

**「聖書がよく分かった」＝原著者の意図がより正確に理解できること。** アプリの成否はこの一点で測る。
研究の網羅性ではなく、**読む体験**を中心に置く。解析は読書を助ける手段であって、目的ではない。
（First Principle の詳細は [CLAUDE.md](CLAUDE.md)。）

---

## 現在の姿

- **画面**: 本文閲覧 `public/index.html`（ロジックは `public/app/` に分離済み、インライン JS なし）と、統合検索 `public/search-tool.html`、外部サイトから開くための `public/bookmarklet.html`。
- **言語入口**: URL のパス接頭辞 `/ja/`・`/en/` で UI 言語が決まる（接頭辞 ＞ 保存済み設定 ＞ 初回はブラウザ判定）。
- **収録訳**: 口語訳（JA1955）・文語訳（BUN）・WEB（英語）・RVR1909（スペイン語）。訳文データは `public/translations/`。
- **グロス**: 言語ごとのグロスは bible_data 本体ではなく、翻訳ごとのサイドカー（`public/assets/data/gloss/`）で持つ（方式 B）。
- **読み方**: 口語訳／語順で読む／文の構造で読む／語の役割で読む、と StudyPanel による語の分析。

---

## 正本として管理する範囲

**GitHub を唯一の正本とする。** 本リポジトリが持つのは、アプリを成立させるもの一式：

- アプリのコード・配信データ（`public/`）
- 生成・監査スクリプト（`scripts/`）とテスト（`tests/`）、CI（`.github/`）
- 現行仕様・設計原則・履歴（`docs/`）／ 開発ルール（`CLAUDE.md`）

> **3リポジトリ体制について（2026-11-07 実態に合わせて修正）**: 構想上の gnt-editorial（SNS運用）／ knowledge-library（研究背景・完了監査・判断履歴）は**まだ設立されていない**。設立されるまでの間、完了記録・判断履歴は本リポジトリの `docs/archive/` と `docs/development/` に置く。設立時に [docs/development/INDEX.md](docs/development/INDEX.md) の分類を移行台帳として使う。
> ローカル専用データは `.gitignore` を正とする。

---

## ディレクトリ構成（トップレベル）

```
gnt-jp/
├── README.md              案内板（本書）
├── CLAUDE.md              開発ルール・設計思想（コードを書く前に読む）
├── package.json           スクリプト定義（監査・テスト・ビルド）
├── public/                アプリ本体（静的・これがそのまま配信される）
│   ├── index.html         本文閲覧（殻。ロジックは app/ 配下）
│   ├── search-tool.html   統合検索
│   ├── bookmarklet.html   外部サイトから開く
│   ├── app/               画面ロジック（state / loaders / renderers / ui / boot.js）
│   ├── core/              解析エンジン（DOM 非依存）
│   ├── assets/            js（共通部品・形態デコード・i18n）／ data（生成データ・辞書・サイドカー）／ i18n
│   ├── css/               tokens.css（正本）／ layout.css ／ components.css
│   ├── bible_data/        本文・形態データ（nt / lxx）
│   ├── translations/      JA1955 ／ BUN ／ WEB ／ RVR1909
│   ├── morph-index/       形態索引（word/ のみ。apparatus 生成系の入力）
│   └── docs/              公開仕様（reading-japanese-specification.md 等）
├── scripts/               生成・監査・回帰テスト（運用は scripts/README.md。archive / output の区分あり）
├── tests/                 ブラウザテスト・検索テスト（CI から参照）
├── docs/                  設計・仕様・履歴（入口は docs/README.md）
├── design-system/         設計側のトークン・文書（project/tokens.css は check-tokens の照合対象）
├── design-system-export/  デザインシステム書き出し時のメモ（実体は design-system/ に取り込み済み）
├── dev/                   開発用プロトタイプ
├── work/                  生成の源泉データ（SBLGNT lowfat XML、apparatus TEI）
├── .github/               CI
├── .claude/               エージェント定義（agents/）
└── node_modules/          依存パッケージ（package.json の devDependencies）
```

ルート直下には一時検証用スクリプト（`serve_i18n.cjs` 等、多言語化作業時のハーネス）が残っている。恒常的なテストは `scripts/` と `tests/` に置く。

各ディレクトリの中身・設計原則は [docs/README.md](docs/README.md) を参照（ここには複製しない）。

---

## どこを読むか

| 文書 | 役割 |
|---|---|
| **README.md**（本書） | 全体像・現在地・行き先の案内板 |
| **CLAUDE.md** | 開発ルール・設計思想・禁止事項（**書く前に必ず**） |
| **docs/** | アプリ仕様・アーキテクチャルール・AI作業フロー・現行仕様・完了記録（入口は docs/README.md） |
| **scripts/README.md** | スクリプトの区分・生成手順・データ書き込みのガード規約 |
| **package.json** | 実行できるコマンド（監査・テスト・ビルド） |

原則：**README は詳細を持たない。** 書きたくなったら CLAUDE.md か docs/ に置き、ここからは指すだけにする。

---

## 将来方針

- 正本は常に GitHub。ローカルは clone / 作業場として扱う。
- 機能追加は「読むことを助けるか」で判断する。
- 仕様は docs の現行仕様へ、完了記録は履歴へ。gnt-editorial / knowledge-library が設立されたら、その時点で責務に応じて移す。
- 公開条件・ライセンスは `docs/` の該当文書を正とする。権利確認前に公開範囲を広げない。
- 原則が現実と矛盾したら、思想を曲げず、まず CLAUDE.md / 本 README を更新する議論から始める。
