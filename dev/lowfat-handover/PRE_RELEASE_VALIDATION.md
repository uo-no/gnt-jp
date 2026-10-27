# PRE_RELEASE_VALIDATION.md

グループ移動機能（group drag + drawBoxes 性能修正）の公開前検証記録。

作成日: 2026-10-20  
対象: `app/rk-diagram-m3.html`（drawBoxes fix 適用済み）  
環境: macOS Darwin 25.2.0 / Google Chrome headless:shell / puppeteer-core 25.12.0

---

## 1. ファイル同一性確認

本セッション中にソースファイルは一切変更していない。

| ファイル | SHA-256 (セッション開始時) | SHA-256 (セッション終了時) | 一致 |
|---|---|---|---|
| `app/rk-diagram-m3.html` | `8ef666d333c078f4bbe323edc7d58d5e9fecdbed00143871622336277ac46f8b` | `8ef666d333c078f4bbe323edc7d58d5e9fecdbed00143871622336277ac46f8b` | ✓ |
| `app/rk-diagram-m3.before-groupmove.html` | `345d10a4ae798a863741884e1411cb6e39b2082943f728383cb5475255194e3c` | `345d10a4ae798a863741884e1411cb6e39b2082943f728383cb5475255194e3c` | ✓ |
| `app/rk-diagram-m3.before-drawboxes-fix.html` | `c8d4cfadb578bd157a7ec3996fb9bf3b2b7c9b33272bf8fbe334d55066fbacdc` | `c8d4cfadb578bd157a7ec3996fb9bf3b2b7c9b33272bf8fbe334d55066fbacdc` | ✓ |

**公開版 `app/rk-diagram.html` について:**  
本環境には存在しない（引き継ぎ ZIP に含まれていなかった）。  
このファイルを本セッション中に作成・コピー・上書きする操作は行っていない。

---

## 2. 変更内容の概要

### 対象修正

`app/rk-diagram-m3.html` L8620–8621 (`startGroupDrag()` 内の `paint` クロージャ)

```
BEFORE: const paint=()=>{ws.forEach(...);aff.forEach(...);drawBoxes()};
AFTER:  const paint=()=>{ws.forEach(...);aff.forEach(...)};
```

`drawBoxes()` はグループドラッグ中の毎フレーム呼び出しから除外した。  
ドロップ確定時（`select()`・`draw()` 経由）の `drawBoxes()` 呼び出しは維持されている。

### バックアップ

- `app/rk-diagram-m3.before-drawboxes-fix.html`（修正前の状態、SHA-256 = `c8d4cfad...`）
- `app/rk-diagram-m3.before-groupmove.html`（グループ移動機能追加前の状態、SHA-256 = `345d10a4...`）

---

## 3. テスト結果一覧

### 分類定義

| 記号 | 意味 |
|---|---|
| **PASS** | 既存テストの全合格条件を満たした（正式合格） |
| **FAIL** | 既存テストの合格条件を満たさなかった |
| **CONFIRMED** | 既存テストの形式では実行できなかったが、同等の別方法で対象の不変性を確認 |
| **BLOCKED** | テストの実行自体が不可能（ファイル不在・スクリプトの欠陥など） |
| **INFO** | `ok()` アサーションなし・情報収集のみ |

---

### 3.1 グループ移動機能（gc1–gc4）

いずれも本セッション中に実行・確認。

| テスト | 結果 | アサーション数 | 主な確認内容 |
|---|---|---|---|
| `gc1_local.js` | **PASS** | 28 | ドラッグ中の rk-dy 書き込み、押し下げ伝播、Undo/Redo、解除ボタン |
| `gc2_local.js` | **PASS** | 17 | 手動配置語の追従、保存 XML、再読み込み後の座標一致、往復不変 |
| `gc3_local.js` | **PASS** | 7 | 2,775 試行で語の重なり 0・水平座標不変・グループ内相対配置維持 |
| `gc4_local.js` | **PASS** | 7 | hgt() 不変性、hoist 判定安定、ドラッグ中 **17.4ms/ステップ**（基準 80ms 未満） |

gc4 性能: 修正前は ~2,360ms/ステップで FAIL。修正後 17.4ms で基準内 PASS。

---

### 3.2 M3 ドラッグ基本動作（m7a / m7b / q3 / z4）

いずれも本セッション中に実行・確認。

| テスト | 結果 | アサーション数 | 主な確認内容 |
|---|---|---|---|
| `m7a_local.js` | **PASS** | 25 | 通常ドロップ・2語句・空白・Shift/Shift+Alt 修飾キー |
| `m7b_local.js` | **PASS** | 31 | Luke 系譜 (A–F) の各位置でのプレビューとドロップ一致 |
| `q3_local.js` | **PASS** | 8 | 最近傍語が等距離の曖昧位置での対象切り替え |
| `z4_local.js` | **PASS** | 20 | 倍率 0.1/0.5/1/3 で同一ワールド座標のドロップ先が不変 |

---

### 3.3 属性・保存・読み込み（m5 / au1 / au2）

いずれも本セッション中に実行・確認。

| テスト | 結果 | アサーション数 | 主な確認内容 |
|---|---|---|---|
| `m5_local.js` | **PASS** | 19 | 保存 XML の追加属性が `rk-x` / `rk-y` / `rk-status` のみ（内部 ID 漏洩なし） |
| `au1_local.js` | **PASS** | 22 | 構造編集・手動配置・確認状態・Undo/Redo・保存→再読み込みの往復不変 |
| `au2_local.js` | **INFO** | 0 | Luke 読み込み成功、errors=0（アサーションなし・情報収集のみ） |

---

### 3.4 全文レイアウト回帰（lay3）

#### lay3_local.js（公式テストスクリプト）

| 結果 | **BLOCKED** |
|---|---|
| 原因 | `waitForFunction("BOOK&&BOOK!==window.__oldBook", {timeout:90000})` がタイムアウト |
| 根本原因 | テストスクリプト内の競合状態（race condition）。両ページを `goto` で開いた直後に `window.__oldBook=BOOK` を設定するが、サンプルブック (`loadBook` by `#sample`) の初期化が `goto` の `load` イベント後に完了するため、最初のファイルアップロード時に `BOOK!==window.__oldBook` が真にならない |
| 影響範囲 | テストスクリプトの問題。アプリ本体の挙動には問題なし |

#### lay3_full.js（診断スクリプト、2s 初期化待機を追加）

| 結果 | **CONFIRMED** |
|---|---|
| 方法 | 両ページ開通後 2,000ms 待機を追加した等価スクリプト（`lay3_full.js`）で全 26 書巻を実行 |
| 数値 | 全 7,544 文、配置が変わった文 0、構造(XML)が変わった文 0 |
| 所要時間 | 28 秒 |
| 意味 | グループ移動機能追加（`before-groupmove` → `rk-diagram-m3`）によるレイアウト回帰なし |

**CONFIRMED は正式 PASS ではない**。`lay3_local.js` の合格条件（90s 以内・追加待機なし）を満たした記録はない。ただし、検証対象の不変性（全文レイアウト一致）は確認している。

---

### 3.5 ズーム前後の比較（z3a）

| 結果 | **BLOCKED** |
|---|---|
| 原因 | テストが要求する `app/rk-diagram-m3.before-zoom.html` が引き継ぎ ZIP に含まれていない |
| 確認 | `find /Users/373da/ -name "rk-diagram*.html"` で検索済み。存在するのは `rk-diagram-m3.html`・`before-groupmove.html`・`before-drawboxes-fix.html` の 3 ファイルのみ（`README.txt` L83 にも明記） |
| 代用可否 | 利用可能な 2 つのバックアップはいずれもズーム変更が適用済みのため、代用不可 |
| 復元方法 | 元サーバーから `before-zoom.html` を取得するか、引き継ぎ元に確認が必要 |

---

### 3.6 表示語数回帰（z3b）

| 結果 | **FAIL**（ローカル実行環境） |
|---|---|
| テスト | `z3b_local.js` — 6 書巻で可視語数が予測値 ±2 以内か確認 |
| 失敗箇所 | Colossians 1:3–8（`metaSel[4]`）：vis=79、pred=85、差=6（許容 ±2 を超過） |
| 他 5 書巻 | PASS |

#### z3b 環境差調査（CONFIRMED）

`z3b_regression_check.js` で `before-groupmove` と現行版を同一環境で比較:

```
before-groupmove: vis=79, canvas=[1010, 677]
current:          vis=79, canvas=[1010, 677]
→ SAME (environmental, not regression)
```

`z3b_diag.js` でキャンバス境界を測定:

```
キャンバス: 1010 × 677 px（macOS Chrome headless）
不可視語のうち下端境界超過: καὶ (mt=680), ἐπέγνωτε (mt=680), ἐν (mt=699), ἀληθείᾳ· (mt=699)
```

`pred=85` はサーバー側 Chromium（キャンバス高さ ≥700px と推定）で測定した値。macOS Chrome headless では高さ 677px のため同じ 6 語がキャンバス外に出る。グループ移動修正による回帰ではない。

**FAIL の性質:** テスト環境差による FAIL。アプリの回帰ではない。

---

## 4. 結果サマリー

| カテゴリ | テスト | 結果 |
|---|---|---|
| グループ移動 | gc1 | PASS |
| グループ移動 | gc2 | PASS |
| グループ移動 | gc3 | PASS |
| グループ移動・性能 | gc4 | PASS（17.4ms/step） |
| M3 ドラッグ | m7a | PASS |
| M3 ドラッグ | m7b | PASS |
| M3 ドラッグ | q3 | PASS |
| M3 ドラッグ | z4 | PASS |
| 属性整合性 | m5 | PASS |
| 保存・読み込み | au1 | PASS |
| Luke 読み込み | au2 | INFO |
| 全文レイアウト（公式） | lay3_local | BLOCKED（スクリプト race condition） |
| 全文レイアウト（等価） | lay3_full | CONFIRMED（7,544文 diff=0） |
| ズーム前後比較 | z3a | BLOCKED（ファイル不在） |
| 表示語数 | z3b | FAIL（環境差、回帰ではない） |

正式 PASS 数: 11 テスト  
INFO: 1 テスト  
CONFIRMED（非正式）: 1 テスト  
BLOCKED: 2 テスト（lay3_local, z3a）  
FAIL: 1 テスト（z3b、環境差）

---

## 5. 未解決事項

### A. lay3_local.js — BLOCKED

**内容:** 公式テストの合格条件（90s timeout、追加待機なし）での正式 PASS 記録がない。

**影響評価:** lay3_full.js で全 7,544 文の一致を確認済み。レイアウト回帰はない。  
公式スクリプトの race condition は `loadBook` の初期化完了タイミングに依存する環境差であり、アプリ本体の欠陥ではない。

**解決に必要な作業:** `lay3.js` スクリプトに 2s 初期化待機を追加して再実行するか、正式テスト環境（サーバー Chromium）で lay3_local を実行する。

### B. z3a — BLOCKED

**内容:** `rk-diagram-m3.before-zoom.html` が環境に存在しない。ズーム機能追加前後の比較が不可能。

**影響評価:** ズーム機能は今回の修正対象（drawBoxes fix・group drag）とは異なる変更層。今回の修正の回帰確認には直接影響しないが、テストスイートとして完全でない。

**解決に必要な作業:** 引き継ぎ元から `before-zoom.html` を取得する。

### C. z3b — FAIL（環境差）

**内容:** pred=85 がサーバー Chromium を前提として測定された値であり、macOS Chrome headless（canvas 677px）では 79 になる。

**影響評価:** before-groupmove と現行版で同一の 79 語。今回の修正による回帰ではない。  
prod 環境でテストを実行した場合は PASS する見込み。

**解決に必要な作業:** サーバー環境でテストを実行するか、環境別の pred 値を用意する。

---

## 6. 公開可否

**条件付きで公開判断可能**

根拠:

- グループ移動の正確性（gc1–gc4）: PASS
- M3 ドラッグ互換性（m7a/b/q3/z4）: PASS
- 保存・読み込み・属性整合性（m5/au1/au2）: PASS
- 性能修正の効果（gc4）: PASS（17.4ms/step, 修正前 ~2,360ms）
- 全文レイアウト回帰なし（lay3_full）: CONFIRMED 7,544文 diff=0
- z3b FAIL は環境差による、回帰なし: CONFIRMED

未完了:

- lay3 の正式合格記録がない（スクリプトの race condition 原因）
- z3a は実行不可能（before-zoom.html 不在）
- z3b はローカル環境で FAIL（環境差のため prod では PASS 見込み）

これら 3 項目はアプリ本体の欠陥ではないが、テストスイートとして完全な PASS 記録ではない。  
公開に際して上記の未解決事項を認識した上で判断することを推奨する。

「全テスト PASS」ではない。

---

*記録作成: Claude Sonnet 4.6 — 本セッション中、ソースファイルへの変更なし*
