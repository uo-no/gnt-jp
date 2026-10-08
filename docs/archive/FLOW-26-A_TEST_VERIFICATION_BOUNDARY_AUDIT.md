# Phase FLOW-26-A Report — Test / Verification Boundary Audit

FLOW-01-A〜FLOW-25-Aの実装事実を前提とし、本Phaseで新規確認（`package.json`全文、`.github/workflows/`、`.git/hooks/`実ファイル、`public/_headers`、`scripts/output/`一覧）に基づく。コード・docs・コメントは変更していない。評価表現・改善提案・推測は含まない。

---

## 1. Test Infrastructure Audit

| 項目 | 内容 |
|---|---|
| tool | Node.js標準ライブラリのみ（`package.json`に`dependencies`/`devDependencies`フィールド自体が存在しないことを確認した） |
| location | `scripts/*.cjs`（回帰テスト・監査スクリプト群） |
| trigger | `npm run test:xxx`（個別スクリプト名を指定して手動実行） |
| scope | Reading Engine各Phase（1/2/3/5）、Stage（A/B/D/E）、Syntax/Semantic Completion（K-3/L-3c/L-4c）、`test:genitive` |
| automation | **`.github/workflows/`にはpath-check.ymlのみ存在し、`test:re-*`系の回帰テストはCI上で自動実行される設定は確認できなかった** |

**確認した`npm scripts`一覧**（`package.json`）:
```
audit, check, test:genitive, test:genitive:verbose,
test:re-phase1, test:re-phase2, test:re-phase3, test:re-phase5,
test:re-stageA, test:re-stageB, test:re-stageD, test:re-stageE,
test:re-syntax-completion, test:re-semantic-completion,
build:lexicon, build:ln-gloss, build:ln-final, metrics, coverage
```

**確認できた事実**:
- `npm test`という汎用コマンドで一括実行される仕組みは確認できなかった（個別`test:xxx`スクリプトのみ）。
- `package-lock.json`は存在しない。
- `"check": "sh .git/hooks/pre-commit"`という定義が存在するが、**`.git/hooks/pre-commit`という実ファイルは存在しない**（`.git/hooks/`配下には`pre-commit.sample`という拡張子付きのGit標準サンプルファイルのみ確認した）。`.git/hooks/post-commit`は実ファイルとして存在するが、内容はGit LFS用の定型フックであり、テスト/検証とは無関係であることを確認した。
- **Playwright**は`package.json`の`dependencies`/`devDependencies`のいずれにも記載がなく、リポジトリ内に`playwright.config.*`という設定ファイルも確認できなかった（本監査シリーズ以前のセッションで確認された利用は、`npx playwright`によるアドホックな都度取得であり、リポジトリに構成として組み込まれたテストインフラではない）。
- `test`/`tests`という名称の専用ディレクトリ、`fixture`という名称のファイル/ディレクトリはいずれも確認できなかった。

---

## 2. Existing Verification Path Audit

### Data Layer

| 確認項目 | 結果 |
|---|---|
| JSON validation | `bible_data`取得時は`res.ok`チェックのみ確認された（FLOW-12-A/25-A）。JSON内部のスキーマ検証（フィールド有無・型）を行う専用コードは確認できなかった |
| bible_data確認方法 | `scripts/`配下の各種監査スクリプト（`corpus-metrics.cjs`／`wallace-coverage.cjs`／`concept-audit.cjs`等、`scripts/output/`に出力が確認された）が存在するが、これらは自動テストではなく手動実行される監査・集計スクリプトである |
| schema確認方法 | 専用のJSON Schemaファイル（`.schema.json`等）は本Phaseの検索範囲では確認できなかった |
| lexicon確認方法 | `npm run coverage`（`wallace-coverage.cjs`）が`scripts/output/wallace_coverage.json`等を生成することを確認した。これも監査目的の生成物であり、pass/failを判定する自動テストとは性質が異なる |

### Analysis Layer

| 対象 | 単体テスト有無 | fixture有無 | 手動確認経路 |
|---|---|---|---|
| `ReadingEngine`（reading-engine.js） | `scripts/re-phase1-regression.cjs`等5件のPhase別回帰テストが存在（ESM-53-A/54-A/55-Aで確認済み、npm run test:re-phaseN） | 専用fixtureファイルは確認できず、テストスクリプト内にハードコードされたケース、またはNT全巻bible_dataそのものを走査する構成であることを確認した | `node --check`によるシンタックス検証（本監査シリーズ内の作業記録として確認） |
| `SyntaxAnalyzer` | `test:re-phase2`が部分的にカバー | 同上 | — |
| `PhraseAnalyzer` | 専用の回帰テストスクリプトは確認できなかった | — | — |
| `ClauseAnalyzer` | 専用の回帰テストスクリプトは確認できなかった | — | — |
| `Projection`（reading-projection.js） | 専用の回帰テストスクリプトは確認できなかった | — | — |

### Rendering Layer

| 対象 | 確認内容 |
|---|---|
| `WordOrderRenderer` | `re-stageA-regression.cjs`（PhraseRenderer Stage A）／`re-stageB-regression.cjs`（Flow Renderer Stage B）がHTML出力のバイト等価性を検証する回帰テストとして存在することを確認した（FLOW-01-A〜07-A記載の設計文書コメントとも一致） |
| Flow Chip | 同上（Stage Bの回帰対象に含まれる） |
| StudyPanel | 専用の自動テストスクリプトは確認できなかった |
| Mobile Inspector | 同上 |
| screenshot test | リポジトリ内に構成されたスクリーンショット比較テストは確認できなかった |
| DOM test | 同上（DOM構造を検証する専用テストは確認できなかった） |
| browser verification | Playwright経由での実ブラウザ検証は、本監査シリーズ以前のセッションで手動実行されていた記録があるが、リポジトリに恒久的なテストとして組み込まれてはいない |
| manual verification | 上記のPlaywright実行、および目視確認が主な検証手段であることが、これまでの一連の実装フェーズ（ESM系）の記録から確認できる |

---

## 3. Regression Boundary Audit

| Boundary | verification method | 存在有無 |
|---|---|---|
| JSON→JS | `res.ok`チェックのみ（1.参照） | 限定的に存在（スキーマ検証は無し） |
| Analysis→Projection | 専用の回帰テストは確認できなかった | **確認できなかった** |
| Projection→UI | 専用の回帰テストは確認できなかった | **確認できなかった** |
| UI→Interaction | 専用の自動テストは確認できなかった | **確認できなかった** |
| Reading Engine内部（Phase1-7, K-3/L-3c/L-4c） | `scripts/re-phase*.cjs`／`re-syntax-completion-regression.cjs`／`re-semantic-completion-regression.cjs` | 存在する（npm run経由で手動実行） |
| Flow Renderer（Stage B） | `re-stageB-regression.cjs` | 存在する |
| PhraseRenderer（Stage A） | `re-stageA-regression.cjs` | 存在する |
| ReadingContext（Stage D） | `re-stageD-regression.cjs` | 存在する |
| Presentation Policy（Stage E、推定） | `re-stageE-regression.cjs` | 存在する（対象コンポーネントの個別対応関係は本Phaseでは未確認） |

**確認できた事実**: Data→Analysis→Projection→Rendering→DOMという主要な変換パイプラインのうち、**Reading Engine内部の各Phase／Stage単位の回帰テストは存在するが、Layer間の境界（Analysis→Projection、Projection→UI）そのものを検証する専用テストは確認できなかった**。

---

## 4. Build Verification Audit

| item | value |
|---|---|
| build command | リポジトリ内に明示的なbuildコマンド定義（`package.json`の`scripts`内）は確認できなかった。`build:lexicon`／`build:ln-gloss`／`build:ln-final`という3件のscriptは存在するが、これらはアプリ本体のビルド（バンドル等）ではなく、`assets/data/`配下の派生データ生成用スクリプトであることを確認した（CLAUDE.md記載の「静的サイト、ビルド不要」という構成と一致） |
| output | `assets/data/reading-lexicon-data.js`等（`build:xxx`スクリプトの出力先） |
| environment | Cloudflare Pages向けの`public/_headers`ファイル（セキュリティヘッダー定義: `X-Content-Type-Options`／`X-Frame-Options`／`Content-Security-Policy`等）を確認した |
| verification method | `wrangler.toml`は確認できなかった。Cloudflare Pages固有のビルド設定（ビルドコマンド・出力ディレクトリ）がリポジトリ内のファイルとして存在するかは確認できなかった（Cloudflare Pages管理画面側の設定である可能性があるが、本Phaseの確認範囲＝リポジトリ内では特定できなかった） |

**確認できた事実**: `.github/workflows/path-check.yml`（1件のみ）が`push`（mainブランチ）／`pull_request`（mainブランチ）をトリガーに、旧ディレクトリパス（`./data/`／`./js/`／`./index/`／`./lexicon/`）への参照を検出する。**このCI workflowは`test:re-*`系の回帰テストを実行しない**（`npm run test:xxx`の呼び出しは`path-check.yml`内に確認できなかった）。

---

## 5. Manual QA Boundary Audit

| feature | manual check required | location |
|---|---|---|
| Bible rendering | 自動テストは確認できず、目視確認に依存すると推定される（推測ではなく「自動化された検証経路が確認できなかった」という事実） | `render()`／`WordOrderRenderer` |
| Greek display | 同上（`re-stageA`/`re-stageB`がテキスト内容のバイト等価性は検証するが、実際の画面上のフォント表示・折り返し等の視覚的検証は自動化されていないことを確認した） | Flow Chip表示 |
| Flow interaction | クリック挙動・StudyPanel遷移等の自動E2Eテストは確認できなかった | `_wlvChipClick()`等 |
| Wallace display | `_buildWordResonanceText()`等の生成テキスト自体は`re-phase5-regression.cjs`等で一部検証されるが、StudyPanel上の実際の表示崩れ等は自動化されていないことを確認した | StudyPanel |
| Mobile UI | 専用のモバイル自動テストは確認できなかった | Mobile Inspector |
| Share URL | `ShareURLService`／`Router`の単体テストは確認できなかった | URL生成・復元機能 |
| localStorage | `app-storage.js`の`normalize()`／マイグレーション処理に対する専用テストは確認できなかった | メモ・ブックマーク機能 |

---

## 6. Test Coverage Boundary Diagram

```
Source Data（bible_data JSON）
   |
   ↓
Validation
   Verification Point: res.okチェックのみ（スキーマ検証テストは確認できなかった）
   |
   ↓
Analysis（SyntaxAnalyzer/PhraseAnalyzer/ClauseAnalyzer）
   Verification Point: re-phase1〜5-regression.cjs（Reading Engine内部の
   Phase単位で存在。PhraseAnalyzer/ClauseAnalyzer単体の専用テストは
   確認できなかった）
   |
   ↓
Projection（ReadingSupportProjection）
   Verification Point: 専用テストは確認できなかった
   |
   ↓
Rendering（WordOrderRenderer等）
   Verification Point: re-stageA/re-stageB-regression.cjs（バイト等価性検証）
   |
   ↓
Interaction（クリック等のイベント処理）
   Verification Point: 専用の自動テストは確認できなかった
                                    ↑
                                    |
                       Verification Point（手動: 本監査シリーズ以前の
                       セッションにおけるPlaywright実ブラウザ確認、
                       ただしリポジトリへの恒久的組み込みは確認できなかった）
```

---

## 7. Final Test / Verification Boundary Summary

**1. Test infrastructure**: `scripts/*.cjs`による回帰テスト群（`npm run test:xxx`で個別に手動実行）。外部npmパッケージへの依存は0件（`package.json`に`dependencies`/`devDependencies`なし）。

**2. Automated verification**: `.github/workflows/path-check.yml`のみがCI上で自動実行される（旧パス参照の検出）。回帰テスト（`test:re-*`）はCI上での自動実行が確認できなかった。

**3. Manual verification**: Bible rendering／Flow interaction／Mobile UI／Share URL／localStorageのいずれについても、専用の自動テストは確認できなかった。本監査シリーズ以前のセッション記録から、Playwrightによる実ブラウザ確認が行われていたことが分かるが、これはリポジトリに恒久的に組み込まれた仕組みではなくアドホックな実行であることを確認した。

**4. Regression boundary**: Reading Engine内部（Phase1-7、K-3/L-3c/L-4c）およびStage A/B/D/Eについては回帰テストが存在する。Analysis→Projection、Projection→UIというLayer間境界を専用に検証するテストは確認できなかった。

**5. Build verification**: 静的サイト構成のためアプリ本体のビルドコマンドは存在しない。`build:lexicon`等3件は派生データ生成用。Cloudflare Pages向け`public/_headers`は存在するが、`wrangler.toml`やリポジトリ内のデプロイ検証手順は確認できなかった。

**6. Missing verification path（確認できなかったもの）**:
- `.git/hooks/pre-commit`の実ファイル（`package.json`の`check`スクリプトが参照する対象が存在しない）
- CI上での回帰テスト（`test:re-*`）自動実行
- PhraseAnalyzer／ClauseAnalyzer／Projection単体の専用回帰テスト
- StudyPanel／Mobile Inspector／Flow interactionの自動E2Eテスト
- Share URL（Router/ShareURLService）／localStorage（normalize/migration）の専用テスト
- JSON Schemaによるデータ検証
- スクリーンショット比較テスト

---

## 完了条件

- [x] Test Infrastructure Audit完了
- [x] Existing Verification Path Audit完了（Data/Analysis/Rendering各Layer）
- [x] Regression Boundary Audit完了
- [x] Build Verification Audit完了
- [x] Manual QA Boundary Audit完了
- [x] Test Coverage Boundary Diagram作成完了
- [x] Final Summary作成完了

FLOW-26-A 完了

---

コード・docs・コメントは変更していない。
確認できた実装事実のみを記録した。
