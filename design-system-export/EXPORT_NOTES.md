# エクスポートについて

このエクスポートは、Claude Artifact「聖書［緑版］ Design System」
（https://claude.ai/artifact/11g9bfeD5H8rERBWGTkTHp）から書き出した、
エクスポート時点の全内容のスナップショットです（Artifactサービス上のバージョン: 1790332050-632a）。

GitHubへの書き込み・commit・push は行っていません。このZIP自体が「GitHubに保存できる形」の成果物です。

## 含まれるもの（`design-system/project/` 以下）

Artifact内部の`project/`ディレクトリ構造をそのまま維持しています（理由は下記「配置について」参照）。

- `README.md` — 使用ルール全体、Visual foundations要約、Iconography
- `01-product-family-and-reading-architecture.md` 〜 `10-motion.md` — 設計文書10本
- `tokens.json` — 色・タイポグラフィ・スペーシング・角丸・境界線・シャドウの実値（生データ）
- `tokens.css` — `tokens.json`から生成されたCSSカスタムプロパティ一式（ファイル先頭に生成元の注記あり）
- `api/tokens.md`、`api/components/<Comp>.md`（8件） — いずれも `@generated ... do not edit` の注記付き。
  `tokens.json`・各コンポーネントREADMEから自動生成された参照用ドキュメントです。
- `components/<Comp>/README.md`（8件）、`components/<Comp>/preview.html`（Coverを含め9件） —
  コンポーネント個別仕様と、静的HTML/CSSのライブプレビュー

すべてのファイルは、Artifactサービスの公開ファイル一覧（`Artifact list --scope files`）が報告した
バイト数と1バイト単位で一致することを確認済みです。要約・転記による改変は一切していません。

## 意図的に除外したもの

- `project/manifest.json`、`project/design-system.json` —
  「Design System」Artifactタイプ自身の内部管理用メタデータ（バージョン番号、変更履歴、
  ビルド用ファイル一覧など）。プレーンなGitリポジトリでは意味を持たない、
  Claude Artifact基盤固有の情報のため除外しました。
- ルート直下の `SKILL.md`、`index.html`、`artifact-type/`配下一式
  （`app.css`・`app.js`・`demo.json`・`reference/*.md`・`run.html`） —
  これらは「Design System」というArtifactタイプ自体のレンダリングエンジン・テンプレートであり、
  このDesign System固有のコンテンツではありません（すべてのDesign System Artifactに共通するインフラ部分）。

除外した理由の要約：GitHubに置いて意味を持つのは「このDesign Systemの内容そのもの」であり、
Claude Artifact基盤がそれを表示・生成するための内部機構ではないと判断したためです。
ご要望があれば、除外した2ファイル（manifest.json・design-system.json）も参考資料として追加できます。

## GitHubへの配置について

- `design-system/` フォルダをそのままリポジトリへコピーすれば、内部の相対パス参照
  （例：`README.md`の「Consuming this system」節にある `project/api/tokens.md` という記述）が
  壊れずに成立します。
- リポジトリ内のどのパスに置くか（例：リポジトリ直下 `design-system/`、または
  `docs/design-system/` など）は今回指定がなかったため、このエクスポートでは決めていません。
  実際にcommit・pushする際にご指定ください。
- `uo-no/gnt-jp` の実装コード（`index.html`、`components.css` 等）はこのエクスポートには
  含まれておらず、参照もしていません。Design Systemの文書・トークン・コンポーネント仕様のみです。
