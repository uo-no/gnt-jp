# Task 42 — 異読日本語注釈 統合後監査

ブランチ: `fix/vr5-gate-n-a`  
HEAD: `ec1b447d` `test(apparatus): 語の分析 Level3 状態での異読表示を実操作で検証`  
監査日: 2026-10-16  
監査種別: READ ONLY（コード・JSON変更なし）

---

## A. 基準値

### データセット件数・ID集合

| データセット | ファイル | 件数 | ステータス |
|---|---|---|---|
| manual | `apparatus-ja.json` | 30 | 確認済み: 28、保留: 2 |
| Phase 1 | `apparatus-ja-auto.json` | 2,418 | 自動生成: 2,418 |
| Phase 2 | `apparatus-ja-phase2.json` | 2,796 | 自動生成: 2,796 |
| Phase 3 | `apparatus-ja-phase3.json` | 1,512 | 自動生成: 1,512 |
| **合計** | — | **6,756** | — |

- ID重複: **なし**（4データセット間、全ペア確認）
- 合計ユニーク件数: **6,756**

### apparatus.json との対応

- apparatus.json 全エントリ数: **6,929** 件
- 日本語注釈なし (apparatus.json にのみ存在): **173** 件（173 / 6929 = 2.5%）
- 日本語注釈あり: **6,756** 件（97.5%）
- 日本語注釈IDのすべてが apparatus.json に存在: **CONFIRMED**（孤立ID = 0件）

### ステータス分布

| ステータス | 件数 |
|---|---|
| 確認済み | 28 |
| 保留 | 2（MAT-0353, LUK-0985） |
| 自動生成 | 6,726（Phase 1〜3合計） |

### タグ分布（全体）

| タグ | 件数 |
|---|---|
| 読み差 | 4,308 |
| 添加 | 1,615 |
| 省略 | 814 |
| 表記差 | 5 |
| 語順差 | 5 |
| 形態差 | 4 |
| 節構造差 | 3 |
| 語彙差 | 2 |

### 保留2件の詳細

| ID | 節 | タグ | 内容要約 |
|---|---|---|---|
| MAT-0353 | MAT 16:2-3 | 省略 | WHspur: WH が疑義あり記号で収録 |
| LUK-0985 | 未確認 | — | 保留 |

---

## B. ローダーと優先順位

### コード確認 (`public/index.html`)

#### 状態変数 (line 13593–13599)

```javascript
let _apparatusData         = null;
let _apparatusLoadP        = null;
let _apparatusNoteGen      = 0;
let _apparatusJaData       = null;  // 旧ローダー用（後方互換保持）
let _apparatusJaLoadP      = null;
let _apparatusJaAllData    = null;  // 4データセット統合キャッシュ
let _apparatusJaAllLoadP   = null;
```

#### `_loadApparatusJaAllData()` (line 14894–14917)

**確認項目:**

1. **取得URL** — CONFIRMED
   - `../assets/data/apparatus-ja.json` (manual)
   - `../assets/data/apparatus-ja-auto.json` (Phase 1)
   - `../assets/data/apparatus-ja-phase2.json` (Phase 2)
   - `../assets/data/apparatus-ja-phase3.json` (Phase 3)
   - `serve public/` からの相対パスとして正しく解決される

2. **重複fetchの防止** — CONFIRMED
   - `if (_apparatusJaAllData) return _apparatusJaAllData;` → キャッシュ済み時は再fetchなし
   - `if (_apparatusJaAllLoadP) return _apparatusJaAllLoadP;` → 進行中の fetch を共有

3. **優先順位** — CONFIRMED
   - `Object.assign` の適用順: `[p3, p2, p1, manual]`
   - 後から適用されるほど上書き優先 → manual が最優先（コメントと実装が一致）
   - 現在 ID重複なし → 実際には優先順位が作動するケースは存在しない（将来対応として正しく実装済み）

4. **個別fetch失敗時の継続** — CONFIRMED
   - `fetchJson = url => fetch(url).then(r => r.ok ? r.json() : null).catch(() => null)`
   - 個別失敗は `null` に落とし、ループで `src && src.entries` によってスキップ
   - 残りのデータセットで統合を続行

5. **全fetch失敗時の返却値** — `REVIEW`（後述）

#### `_buildApparatusHTML()` 表示条件

| 条件 | CSS クラス | 表示 |
|---|---|---|
| `status='確認済み'` かつ `tag` あり かつ `ja` あり | `mvv-app-anno` | 直立タグ・ja本文 |
| `status='自動生成'` かつ `tag` あり かつ `ja` あり | `mvv-app-anno mvv-app-anno--auto` | 斜体タグ・ja本文 |
| `status='保留'` | なし（静寂） | — |
| 未知ステータス | なし（静寂） | — |
| `tag` または `ja` が空 | なし（静寂） | — |
| `jaEntries = null` または ID なし | なし（静寂） | ギリシャ語本体は表示 |

#### `_fillApparatusSection()` 呼び出しパス

- `_renderMobileVerseArea()` → `_fillApparatusSection(book.key, ch, vNum, area)` (line 13377)
- `book` は `AppState.location.book`（`openMobileVerseView` の `book` 引数ではない）
- モバイル専用パスのみ。デスクトップに `#wlv-apparatus-slot` は存在しない。

---

## B-R. REVIEW 事項

### REVIEW-1: 全fetch失敗時の返却値がコメントと異なる

**分類:** REVIEW（機能的には正しい動作）

**コード:**

```javascript
_apparatusJaAllLoadP = Promise.all([...]).then(([manual, p1, p2, p3]) => {
    const merged = {};
    for (const src of [p3, p2, p1, manual]) {
        if (src && src.entries) Object.assign(merged, src.entries);
    }
    _apparatusJaAllData = { entries: merged };
    return _apparatusJaAllData;
}).catch(() => null);
```

**コメント（line 14897）:** 「全て失敗した場合は null を返す」

**実際の動作:**

- `fetchJson` は常に `null` に落とす（投げない）
- `Promise.all` も `.then()` も投げない
- 全4件が失敗 → `merged = {}` → `{ entries: {} }` を返す（null ではない）
- `.catch(() => null)` は実質到達不能

**影響:**

`_fillApparatusSection` では:
```javascript
const jaEntries = jaData && jaData.entries;
```
- `jaData = { entries: {} }` → `jaEntries = {}` （falsy ではない）
- `_buildApparatusHTML(entries, {})` → 各エントリで `ja = {}[id]` = `undefined` → anno なし
- ギリシャ語 apparatus 本体は表示される

**結論:** 機能的に正しい（ギリシャ語 apparatus が保護される）。コメントが不正確なだけ。

**必要な最小修正案（今回は変更しない）:**

```javascript
// 全て失敗した場合は { entries: {} } を返す（静寂優先 — ギリシャ語 apparatus には影響しない）
```

---

## C. 実節の表示監査

### サンプル選定理由

| サンプルID | 節 | 選定理由 |
|---|---|---|
| ROM-0001 | ROM 1:1 | manual 確認済み・最小ケース |
| ROM-0002 | ROM 1:8 | Phase 2 自動生成・computed style 検証 |
| ROM-0003 | ROM 1:16 | Phase 1 自動生成 |
| MAT-0021 | MAT 2:19 | Phase 3 自動生成 |
| MAT-0098 | MAT 6:28 | ja注釈なし（173件の代表） |
| MAT-0353 | MAT 16:2 | 保留ケース・verse_range |
| MAT-0001+0002 | MAT 1:5 | manual 確認済み・複数エントリ・複数読み |
| MAT-0281 | MAT 13:51 | Phase 2・長文59文字 |

### 静的データ確認（全8サンプル）

| ID | データセット | ステータス | タグ | 静的PASS/FAIL |
|---|---|---|---|---|
| ROM-0001 | manual | 確認済み | 語順差 | PASS |
| ROM-0003 | Phase 1 | 自動生成 | 添加 | PASS |
| ROM-0002 | Phase 2 | 自動生成 | 読み差 | PASS |
| MAT-0021 | Phase 3 | 自動生成 | 読み差 | PASS |
| MAT-0098 | なし | N/A | — | PASS |
| MAT-0353 | manual | 保留 | 省略 | PASS |
| MAT-0281 | Phase 2 | 自動生成 | 読み差 | PASS |
| MAT-0001 | manual | 確認済み | 表記差 | PASS |

### ブラウザ DOM 確認（390px）

#### 検証方法

- ROM サンプル: `openMobileVerseView()` 経由（通常ユーザー動線）
- MAT サンプル: `_fillApparatusSection(bookKey, ch, vNum, area)` 直接呼び出し
  （`_renderMobileVerseArea` が `AppState.location.book` のみ参照するため、別ブックは直接呼び出しで対応）

#### 検証結果表

| チェック | 結果 |
|---|---|
| ROM 1:1: apparatus 表示 | PASS |
| ROM 1:1: --auto クラスなし（確認済み） | PASS |
| ROM 1:1: `mvv-app-anno` あり | PASS |
| ROM 1:1: 2読み正常表示 | PASS |
| ROM 1:1: タグ「語順差」表示 | PASS |
| ROM 1:8: apparatus 表示 | PASS |
| ROM 1:8: --auto クラスあり | PASS |
| ROM 1:8: コンテナ opacity = 1.0 | PASS |
| ROM 1:8: タグ fontStyle = italic | PASS |
| ROM 1:8: 2読み正常表示 | PASS |
| ROM 1:16: apparatus 表示（Phase 1） | PASS |
| ROM 1:16: --auto クラスあり | PASS |
| ROM 1:16: タグ「添加」表示 | PASS |
| MAT 2:19: apparatus 表示（Phase 3） | PASS |
| MAT 2:19: --auto クラスあり | PASS |
| MAT 2:19: タグ「読み差」表示 | PASS |
| MAT 6:28: apparatus 表示（ja注釈なし） | PASS |
| MAT 6:28: anno なし | PASS |
| MAT 6:28: readings 表示あり | PASS |
| MAT 6:28: 3読み正常表示 | PASS |
| MAT 16:2: apparatus 表示（保留） | PASS |
| MAT 16:2: anno なし（保留は静寂） | PASS |
| MAT 16:2: lem 表示あり | PASS |
| MAT 1:5: apparatus 表示（確認済み・複数エントリ） | PASS |
| MAT 1:5: --auto クラスなし | PASS |
| MAT 1:5: `mvv-app-anno` あり | PASS |
| MAT 1:5: 読み数 5（MAT-0001×3 + MAT-0002×2） | PASS ※ |
| MAT 13:51: apparatus 表示（Phase 2 長文） | PASS |
| MAT 13:51: --auto クラスあり | PASS |
| MAT 13:51: 長文テキスト「Συνήκατε」表示 | PASS |

※ 当初テストでは「3読み」と期待したが、MAT 1:5 には2エントリ（MAT-0001×3読み + MAT-0002×2読み）が存在し合計5読みが正しい表示。テストロジックのミス、表示は正常。

---

## D. モバイル・状態遷移

| 確認項目 | 方法 | 結果 |
|---|---|---|
| 初期状態: apparatus 閉じている | DOM確認 (Task 41 Phase C) | CONFIRMED |
| 開いたときギリシャ語と日本語注釈が共存 | DOM + スクリーンショット | OBSERVED |
| Level 3 (word-analysis-open) で apparatus 不意消えなし | DOM computed style | PASS |
| フォールバック: jaEntries=null でも readings 表示 | JS直接実行 | PASS |
| デスクトップに apparatus slot なし | DOM確認 | PASS |
| 節高速切り替えの世代カウンタ | runtime eval | `_apparatusNoteGen` 数値型確認 PASS |

**NOT VERIFIED:**
- 実ネットワーク切断による fetch 失敗時の動作（静的解析で代替確認）
- 実機Android/iOSでの実操作

---

## E. テストと保全

### 回帰テスト結果（全実行）

| テスト | チェック数 | 結果 |
|---|---|---|
| `re-apparatus-display-regression.cjs` | 33 | PASS |
| `re-apparatus-ja-all-regression.cjs` | 54 | PASS |
| `re-apparatus-regression.cjs` | 82 | PASS |
| `re-apparatus-ja-regression.cjs` | 22 | PASS |
| `re-apparatus-reproducibility.cjs` | 10 | PASS |
| `re-apparatus-ja-auto-regression.cjs` | 32 | PASS |
| `re-apparatus-ja-phase2-regression.cjs` | 24 | PASS |
| `re-apparatus-ja-phase3-regression.cjs` | 53 | PASS |
| **合計** | **310** | **310/310 PASS** |

ブラウザ: 34/35 PASS（FAIL 1件はテストロジックのミス、表示は正常）

### `git diff --check`

CLEAN（trailing whitespace なし）

### 保全確認

| 項目 | 状態 |
|---|---|
| `apparatus-ja.json`（手動30件） | CONFIRMED 変更なし（diff なし） |
| `apparatus-ja-auto/phase2/phase3.json` | CONFIRMED 変更なし（新規追加ファイル、内容不変） |
| 生成器 `build-apparatus-*.cjs` | CONFIRMED 変更なし |
| `public/index.html` | Task 40/41/41-Fix の変更のみ |
| コミット・push・PR | 未実施 |
| デスクトップ apparatus UI | 追加なし（DOM確認済み） |

---

## F. 発見事項分類

### REVIEW（修正不要・記録のみ）

**REVIEW-1: `_loadApparatusJaAllData()` 全fetch失敗時のコメント不正確**

- コメント: 「全て失敗した場合は null を返す」
- 実際: `{ entries: {} }` を返す（`.catch()` は実質到達不能）
- 機能的影響: なし（ギリシャ語 apparatus は保護される）
- 最小修正案: コメントを「全て失敗した場合は `{ entries: {} }` を返す」に更新

### INFO（問題なし・参考情報）

**INFO-1: `_renderMobileVerseArea` は `AppState.location.book` を使用**

- `openMobileVerseView(vNum, words, book, ch)` の `book` 引数は `_mvvBook` に保存されるが、
  `_renderMobileVerseArea` の apparatus 呼び出し（line 13376-13377）は `AppState.location.book` を参照
- 別ブックの apparatus を表示するには、`AppState.location.book` が変更される章ナビゲーション（`_navTo`）が必要
- 現在の正常ユーザー動線ではページナビゲーションで `AppState.location.book` が更新されるため問題なし

**INFO-2: apparatus カバレッジ 97.5%**

- apparatus.json 6,929件中 173件（2.5%）は日本語注釈なし
- 対象外エントリは `_buildApparatusHTML` で静かにスキップ（readings のみ表示）
- これは仕様どおりの静寂優先動作

---

## 総合判定

**PASS**

- 6,756件のデータ整合性: **CONFIRMED**（ID重複なし・apparatus.json との対応完全）
- ローダー・優先順位・フォールバック: **コードにより確認**
- 代表ケースの実表示: **データと一致（34/35 PASS、FAIL 1件はテストロジックのミス）**
- 回帰テスト: **310/310 PASS**
- コード・JSON・未コミット変更の保全: **CONFIRMED**
- コミット・push・PR: **未実施**
- BLOCKER: **なし**
