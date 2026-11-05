# Task 38 — リリース前保全監査

作成日: 2026-10-15  
種別: 保全監査（READ ONLY）  
監査時点: 2026-10-15 / ブランチ: `fix/vr5-gate-n-a`

---

## Phase A — Git 状態の保全

### A.1 ブランチと SHA（CONFIRMED）

| 項目 | SHA |
|---|---|
| 現在のブランチ | `fix/vr5-gate-n-a` |
| HEAD | `ec1b447dee669c64d69e7060d80de59f7a4bf2c5` |
| `origin/fix/vr5-gate-n-a` | `ec1b447dee669c64d69e7060d80de59f7a4bf2c5` |
| `origin/main` | `c3c6a0e2a51f88c5e49bc555af7cd89264e9209f` |
| ローカル `main` | `f28b9ca1c9653c043389ea03e7fe282695dd0fea` |

- HEAD と `origin/fix/vr5-gate-n-a` は一致 → ブランチはリモートと同期済み
- `main` ≠ `origin/main` → ローカル `main` は旧 SHA（未確認、今回の作業対象外）

### A.2 作業ツリーの変更分類（CONFIRMED）

**ステージング済み変更:** なし

**追跡済み・未ステージ変更（5ファイル）:**

| ファイル | 分類 |
|---|---|
| `package.json` | Task 30–35 で apparatus スクリプト追加（build/test 各4種） |
| `scripts/output/re-stageD-audit.json` | 既存の他タスク変更 |
| `scripts/output/wallace_coverage.json` | 既存の他タスク変更 |
| `scripts/output/wallace_coverage.md` | 既存の他タスク変更 |
| `scripts/re-flow-dom-regression.cjs` | 既存の他タスク変更 |

**未追跡ファイル — Task 28–36 成果物（13ファイル）:**

| ファイル | 種別 |
|---|---|
| `public/assets/data/apparatus-ja-auto.json` | Phase 1 自動生成 JSON |
| `public/assets/data/apparatus-ja-phase2.json` | Phase 2 自動生成 JSON |
| `public/assets/data/apparatus-ja-phase3.json` | Phase 3 自動生成 JSON |
| `scripts/build-apparatus-ja-auto.cjs` | Phase 1 生成器 |
| `scripts/build-apparatus-ja-phase2.cjs` | Phase 2 生成器 |
| `scripts/build-apparatus-ja-phase3.cjs` | Phase 3 生成器 |
| `scripts/re-apparatus-ja-auto-regression.cjs` | Phase 1 回帰テスト |
| `scripts/re-apparatus-ja-phase2-regression.cjs` | Phase 2 回帰テスト |
| `scripts/re-apparatus-ja-phase3-regression.cjs` | Phase 3 回帰テスト |
| `work/apparatus/task31-integration-audit.md` | 監査文書 |
| `work/apparatus/task33-ellipsis-display-policy.md` | 監査文書 |
| `work/apparatus/task34-special-cases-audit.md` | 監査文書 |
| `work/apparatus/task37-final-integration-audit.md` | 監査文書 |

**未追跡ファイル — apparatus 非関連（16ファイル）:** 既存の他タスク成果物（`verify-*.cjs`、`debug_*.cjs`、`public/rk-*.html` 等）。本監査の対象外。

### A.3 main 状態（CONFIRMED）

`main` は読み取りのみで確認。変更なし。

---

## Phase B — 成果物の保全

### B.1 ファイル存在・件数・サイズ・SHA-256（CONFIRMED）

**4データセット（JSON）:**

| ファイル | 件数 | サイズ | SHA-256 |
|---|---|---|---|
| `public/assets/data/apparatus-ja.json` | 30 | 7.2KB | `581f4bd3c6a11e58147a460f9a12027a010552f0c3c43c3ecf752ac4321b05d1` |
| `public/assets/data/apparatus-ja-auto.json` | 2,418 | 342.1KB | `690c7e37a82dc9cb70ca998105aabc8bd895ce76936ccd0fc278130fdf5af994` |
| `public/assets/data/apparatus-ja-phase2.json` | 2,796 | 487.7KB | `1861c7c6ee4ffde01ea85bc52cadbe724828431ef51ec9404a670018decb1f2d` |
| `public/assets/data/apparatus-ja-phase3.json` | 1,512 | 314.8KB | `3ad71de41f0b9e90bc3fc9d79c6f161ccf6a2e861d098462aeeb3d4a9a6ebff6` |

期待件数との一致: 30 / 2,418 / 2,796 / 1,512 すべて ✓

**生成器・テストスクリプト:**

| ファイル | サイズ | SHA-256 |
|---|---|---|
| `scripts/build-apparatus-ja-auto.cjs` | 5.3KB | `d75753bc59e033e7b68112402eaa941fbc90a739927c7b1f49d12ed9fddc9a5c` |
| `scripts/build-apparatus-ja-phase2.cjs` | 4.4KB | `5e8a24cbdc2512372cf5c9193ce9cb911007f56963af72840afa4a1afcc290c9` |
| `scripts/build-apparatus-ja-phase3.cjs` | 6.1KB | `0c12b5785f083bc93bac3091185106fadf9f56042d7840499dbe1c01cdd0db36` |
| `scripts/re-apparatus-ja-auto-regression.cjs` | 8.5KB | `adf6fc0d5966d0fb29e628cbddff6ea37f401793d8caaaea2c3c2347acc3a587` |
| `scripts/re-apparatus-ja-phase2-regression.cjs` | 7.7KB | `1340342c2957a5b0b7ee097f64c01fcb9840c4930dc3ae734ad82ce7497f1d56` |
| `scripts/re-apparatus-ja-phase3-regression.cjs` | 12.5KB | `0f7df1ec4c43f437f5f8899f9f2c1595cc4c4141db00f9e3c1817b3cca26ac48` |
| `scripts/re-apparatus-ja-regression.cjs` | 5.4KB | `1473787f9f58fac00d45e1e4d9a79501977ad73f1d124953f0edca05b430f003` |
| `scripts/build-apparatus.cjs` | 14.0KB | `5cdf0406c975f67be43376a2b190ee70fe0474766d6bf7b953674a6d69de50f0` |
| `scripts/re-apparatus-reproducibility.cjs` | 5.3KB | `40536a6e108a754941f5a6413310368336f96474426d1f163955a778c67bf908` |

全 13ファイル存在確認 ✓

### B.2 参照関係（CONFIRMED）

生成器の出力先パスと実際のファイルパスの対応:

| 生成器 | 入力 | 出力 |
|---|---|---|
| `build-apparatus-ja-auto.cjs` | `apparatus.json` + `apparatus-ja.json` | `apparatus-ja-auto.json` |
| `build-apparatus-ja-phase2.cjs` | `apparatus.json` + `apparatus-ja.json` + `apparatus-ja-auto.json` | `apparatus-ja-phase2.json` |
| `build-apparatus-ja-phase3.cjs` | `apparatus.json` + `apparatus-ja.json` + `apparatus-ja-auto.json` + `apparatus-ja-phase2.json` | `apparatus-ja-phase3.json` |

依存順序: Phase 1 → Phase 2 → Phase 3（各段階が前段階の出力を除外リストとして参照）

---

## Phase C — 再生成手順と再現性

### C.1 package.json スクリプト対応（CONFIRMED）

| npm スクリプト | 実ファイル | 存在 |
|---|---|---|
| `build:apparatus` | `scripts/build-apparatus.cjs` | ✓ |
| `test:re-apparatus` | `scripts/re-apparatus-regression.cjs` | ✓ |
| `test:re-apparatus-ja` | `scripts/re-apparatus-ja-regression.cjs` | ✓ |
| `test:re-apparatus-reproduce` | `scripts/re-apparatus-reproducibility.cjs` | ✓ |
| `build:apparatus-ja-auto` | `scripts/build-apparatus-ja-auto.cjs` | ✓ |
| `test:re-apparatus-ja-auto` | `scripts/re-apparatus-ja-auto-regression.cjs` | ✓ |
| `build:apparatus-ja-phase2` | `scripts/build-apparatus-ja-phase2.cjs` | ✓ |
| `test:re-apparatus-ja-phase2` | `scripts/re-apparatus-ja-phase2-regression.cjs` | ✓ |
| `build:apparatus-ja-phase3` | `scripts/build-apparatus-ja-phase3.cjs` | ✓ |
| `test:re-apparatus-ja-phase3` | `scripts/re-apparatus-ja-phase3-regression.cjs` | ✓ |

全 10スクリプトと実ファイルが対応 ✓

### C.2 _meta 整合確認（CONFIRMED、Task 37 比較）

| フィールド | 期待値 | 実値 | 一致 |
|---|---|---|---|
| Phase 1 `truncatedLemCount` | 14 | 14 | ✓ |
| Phase 2 `entryCount` | 2,796 | 2,796 | ✓ |
| Phase 3 `phraseCount + elisionCount + caseCount` | 1,512 | 1,429+68+15=1,512 | ✓ |
| Phase 3 `excludedWHspur` | 0 | 0 | ✓ |

### C.3 再現性テストの安全性（CONFIRMED）

`scripts/re-apparatus-reproducibility.cjs` は:
- 出力先: `os.tmpdir()` + タイムスタンプ付き一時ファイル（例: `/var/folders/.../apparatus-repro-1792074466008.json`）
- 検証後に `fs.unlinkSync(TEMP_PATH)` で削除
- 既存の `apparatus.json` を **上書きしない**

### C.4 再現性テスト結果（CONFIRMED）

実行コマンド: `node scripts/re-apparatus-reproducibility.cjs`  
結果: **10/10 checks passed — PASS**

再生成先: `/var/folders/t5/wtq46zrn14nb83kjb2_s8pmw0000gn/T/apparatus-repro-1792074466008.json`（一時ファイル、実行後削除済み）

---

## Phase D — 出典・ライセンス

### D.1 SBLGNT Apparatus データ（`docs/DATA_LICENSE.md` セクション 5）

| 項目 | 内容 |
|---|---|
| 出典 | `jjmccollum/sblgnt-tei` (GitHub) |
| 帰属表示 | The Greek New Testament: SBL Edition © 2010 Society of Biblical Literature and Logos Bible Software. Apparatus encoded in TEI XML by Joey McCollum (2021). |
| ライセンス | CC BY 4.0 — **確認済み**（`DATA_LICENSE.md` に記録） |
| ソースファイル | `work/apparatus/sblgnt_tei.xml` |
| 生成物 | `public/assets/data/apparatus.json`（`build-apparatus.cjs` により生成） |
| 加工内容 | TEI XML → 構造化 JSON。元データの内容・読みは変更しない。 |

### D.2 自動注釈データの出典・ステータス区分（CONFIRMED）

| データセット | ステータス | 記述場所 |
|---|---|---|
| apparatus-ja.json（manual）| `確認済み`(28件) + `保留`(2件) | エントリの `status` フィールド |
| apparatus-ja-auto.json（Phase 1）| `自動生成` — 全 2,418件 | エントリ + `_meta.policy` |
| apparatus-ja-phase2.json（Phase 2）| `自動生成` — 全 2,796件 | エントリ + `_meta.policy` |
| apparatus-ja-phase3.json（Phase 3）| `自動生成` — 全 1,512件 | エントリ + `_meta.policy` |

- 手動注釈と自動生成の区別は全件で明確 ✓
- 全生成器のコメントに `L-0 準拠` 制約が記述されている ✓
- 全 `_meta.policy` に「人手確認未実施」または「差異の断定なし」が記述されている ✓

### D.3 Louw-Nida ライセンスの未確定事項（既存 REVIEW、本監査対象外）

`docs/DATA_LICENSE.md` セクション 4 に記録済み: LN 由来 `@ln`/`@domain` 注釈を含む `bible_data` 公開再配布の条件が未解決。本 Task の対象である apparatus 自動注釈データはこの問題に直接依存しないが、参照のために記録する。

---

## 発見事項

### BLOCKER

**なし。**

### REVIEW

| ID | 内容 |
|---|---|
| REVIEW-1 | Task 28–36 の成果物（生成スクリプト 3件 + 生成 JSON 3件 + 回帰テスト 3件 + 監査文書 4件）が未コミット・未追跡状態のまま。現時点では意図的（コミット・push 禁止の制約下）。将来のコミット時には `package.json` の apparatus スクリプト追加と合わせて一括で追跡対象に加える必要がある。 |
| REVIEW-2 | Louw-Nida ライセンス未解決（`DATA_LICENSE.md` セクション 4 既記録）。apparatus 自動注釈データへの直接影響はないが、Pre-Release 公開前に解決または判断が必要。 |

### INFO

| ID | 内容 |
|---|---|
| INFO-1 | ローカル `main` (`f28b9ca1`) と `origin/main` (`c3c6a0e2`) が異なる。作業ブランチには影響なし。 |
| INFO-2 | `apparatus 非関連の未追跡ファイル` 16件（`verify-*.cjs`、`debug_*.cjs` 等）が存在する。本監査対象外。コミット前に整理が必要。 |
| INFO-3 | Phase 1 `_meta.additionCount`(1,608) ≠ 実 `tag=添加`(1,609)。1TI-0014 が `bothCount=1` として別計上されているため（設計通り、Task 31 / Task 37 記録済み）。 |
| INFO-4 | `re-apparatus-reproducibility.cjs` は `apparatus.json` のみを検証対象とする。`apparatus-ja-auto.json` 等の日本語注釈 JSON の再現性は別途 Phase 1 で静的確認済み（Task 37 Phase 1 再現性: 不一致 0件）。 |

---

## 回帰テスト結果（Task 38 実行）

| テスト | チェック数 | 結果 |
|---|---|---|
| `re-apparatus-ja-auto-regression` | 32/32 | PASS |
| `re-apparatus-ja-phase2-regression` | 24/24 | PASS |
| `re-apparatus-ja-phase3-regression` | 53/53 | PASS |
| `re-apparatus-ja-regression` | 22/22 | PASS |
| `re-apparatus-regression` | 82/82 | PASS |
| `re-apparatus-reproducibility` | 10/10 | PASS |
| **合計** | **223/223** | **全 PASS** |

---

## 完了確認

- [x] ブランチ・HEAD・`origin/main` の SHA を記録した
- [x] 作業ツリーの変更を Task 28–36 成果物 / 他タスク変更 / 無関係未追跡ファイルに分類した
- [x] 4データセットの実件数（30/2418/2796/1512）と SHA-256 を記録した
- [x] 生成器・テストと `package.json` スクリプトの対応を確認した
- [x] `_meta` 整合性を Task 37 比較で確認した
- [x] 再現性テストが一時ファイルに出力し既存 JSON を上書きしないことを確認した
- [x] 再現性テスト (`re-apparatus-reproducibility`) を実行し PASS を確認した
- [x] SBLGNT apparatus ライセンス（CC BY 4.0）確認済みを記録した
- [x] 自動生成 / 人手確認のステータス区分が明確であることを確認した
- [x] BLOCKER / REVIEW / INFO を分類した
- [x] 既存 JSON・生成器・UI を変更していない
- [x] コミット・push・PR・マージを行っていない

---

*監査 CONFIRMED: 上記は全て実コマンド・実ファイル・実行結果に基づく。推測は含まない。*
