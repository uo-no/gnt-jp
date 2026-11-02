# Stage 4 Phase 4k — 最終承認報告

**Phase**: 4k  
**作成日**: 2026-11-02  
**状態**: HUMAN-REVIEW（Bible JSON 96件コミット承認待ち）

---

## 変更 A: Morph Fix（承認済み・コミット待ち）

### 概要

`_VERB_RULES` に `去る`（さ行五段）漢字語幹例外を 4ルール追加。  
Phase 4k で `去る` に変わった V-2AAP 8件が `undefined` になる問題を修正。

### 変更ファイル（4ファイル）

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `public/core/reading-engine.js` | BUG/CORRECTNESS | `_VERB_RULES` 4ルール追加 + ヘッダ baseline 更新 |
| `scripts/re-phase1-regression.cjs` | DOCUMENTATION | baseline 44187→44280 + コメント追記 |
| `scripts/re-stageB-regression.cjs` | DOCUMENTATION | baseline changed/identical/brokenOld 各±8 + コメント追記 |
| `docs/development/morph-rule-engine-v1-frozen.md` | DOCUMENTATION | 改訂履歴 2026-11-01 エントリ追加 |

### git diff 内容（reading-engine.js 実質変更）

```diff
- *   基準値: NT 137,741 tokens / morph 44,591 / 悪化ケース 0
+ *   基準値: NT 137,741 tokens / morph 44,280 / 悪化ケース 0
+ *   （44,591 → 44,187: M-15反映・複数代名詞Data固定点 / 44,187 → 44,280: Phase 4k G863 + 去る fix）

+        // 五段確定・漢字語幹（去る: さ行五段）
+        [/(去)る$/, '$1りながら'],   // part-pres
+        // 五段確定・漢字語幹（去る: さ行五段）
+        [/(去)る$/, '$1った'],       // part-aor (V-2AAP 修正対象)
+        // 五段確定・漢字語幹（去る: さ行五段）
+        [/(去)る$/, '$1ってきた'],   // part-perf
+        // 五段確定・漢字語幹（去る: さ行五段）
+        [/(去)る$/, '$1れ'],         // imp
```

### 独立コミット可能か

**可能。** Bible JSON 96件変更と混在なし。  
Bible JSON を先にコミットしても後にコミットしても問題なし。

---

## 変更 B: Bible JSON 96件（コミット承認待ち）

### 概要

G863 ἀφίημι 96件の `token.japanese` を `赦す` から `finalCorrectedJa` に変更。  
正本: `stage4-phase4j-correction-g863-audit.json`

### 変更ファイル（53ファイル）

`public/bible_data/nt/` 配下 53 ファイル。  
`53 files changed, 96 insertions(+), 96 deletions(-)`  
変更フィールド: `token.japanese` **のみ**（他フィールド変化なし・確認済み）

### 訳語分布

| 訳語 | 件数 |
|------|-----|
| 許す | 32 |
| 残す | 23 |
| 去る | 15 |
| 残される | 9 |
| 捨てる | 9 |
| 離縁する | 3 |
| 疎かにする | 2 |
| 放つ | 2 |
| 黙認する | 1 |
| **合計** | **96** |

### 最終確認結果（READ ONLY）

| 確認項目 | 結果 |
|---------|------|
| 96件すべて `finalCorrectedJa` と一致 | **96件一致** ✓ |
| 1CO 7:11!15 = 離縁する | **離縁する** ✓ |
| 1CO 7:12!22 = 離縁する | **離縁する** ✓ |
| 1CO 7:13!15 = 離縁する | **離縁する** ✓ |
| G863 対象外で `japanese=赦す` のトークン | **0件** ✓ |
| `token.japanese` 以外のフィールド変化 | **0件** ✓ |
| 53ファイル JSON parse | **成功** ✓ |

### 独立コミット可能か

**可能。** Morph Fix とは完全に独立したファイル群（bible_data/ のみ）。

---

## テスト結果（変更 A + B 適用後の状態）

| テスト | 結果 | checks数 |
|--------|------|---------|
| test:re-phase1 | **ALL PASS** | 111 |
| test:re-stageB | **ALL PASS** | 27 |
| test:re-phase2 | **ALL PASS** | 47 |
| test:re-phase3 | **ALL PASS** | 27 |
| test:re-phase5 | **ALL PASS** | 55 |
| test:re-stageA | **ALL PASS** | 19 |

---

## 既存 FAIL と新規 FAIL の区別

| テスト | 状態 | 分類 |
|--------|------|------|
| test:genitive | FAIL（PASS=1923 FAIL=54 WARN=50） | **既存 FAIL** — Batch 62/68 は属格分類テキスト内容の問題。変更 A・B と無関係。DEFERRED。 |

**今回の変更による新規 FAIL: 0件。**

---

## 未コミット変更の状態

| 変更グループ | 対象ファイル | コミット準備 |
|------------|------------|------------|
| **変更 A: Morph Fix** | reading-engine.js / re-phase1-regression.cjs / re-stageB-regression.cjs / morph-rule-engine-v1-frozen.md | **READY** |
| **変更 B: Bible JSON** | public/bible_data/nt/ 53ファイル | **承認待ち** |
| 成果物（reports） | scripts/output/stage4-final/ 各 .md / .json | 変更 B コミット時に同梱 |

commit / push / PR はすべて未実施。

---

## 承認リクエスト

**変更 B（Bible JSON 96件）のコミットを承認してください。**

承認後:
1. 変更 A（Morph Fix）を独立コミット
2. 変更 B（Bible JSON 96件 + 成果物）を独立コミット
3. push / PR は別途指示を待つ
