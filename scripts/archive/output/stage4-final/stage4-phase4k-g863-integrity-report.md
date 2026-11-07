# Stage 4 Phase 4k — G863 整合性・検証報告

**Phase**: 4k  
**作成日**: 2026-11-01  
**HEAD SHA（変更前）**: `ebf70bc6a02e82a55b30d2c392039fc6a32541a8`  

---

## 1. 変更件数検証

| 確認項目 | 結果 |
|---------|------|
| 更新対象ref: 96件 | 96件処理済 ✓ |
| 実際の変更: 96件 | 96件 ✓ |
| エラー: 0件 | 0件 ✓ |
| 訳語分布合計=96 | 96 ✓ |
| 変更ファイル数: 53 | 53件 ✓ |

## 2. 値の検証

### 2.1 訳語分布（finalCorrectedJa と一致）

| 訳語 | 期待 | 実際 | 一致 |
|------|-----|-----|------|
| 許す | 32 | 32 | ✓ |
| 残す | 23 | 23 | ✓ |
| 去る | 15 | 15 | ✓ |
| 残される | 9 | 9 | ✓ |
| 捨てる | 9 | 9 | ✓ |
| 離縁する | 3 | 3 | ✓ |
| 疎かにする | 2 | 2 | ✓ |
| 放つ | 2 | 2 | ✓ |
| 黙認する | 1 | 1 | ✓ |
| **合計** | **96** | **96** | ✓ |

### 2.2 1CO 7:11–13 離縁する 確認

- **1CO 7:11!15**: `赦す` → `離縁する` ✓
- **1CO 7:12!22**: `赦す` → `離縁する` ✓
- **1CO 7:13!15**: `赦す` → `離縁する` ✓

### 2.3 対象外 G863（47件）の保護

bible_data スキャン済み。対象外 G863 47件すべて変更前と同値 `赦す` のまま ✓

## 3. JSON 検証

変更した53ファイルすべて JSON.parse 成功 ✓  
（スクリプト内で書き戻し前に `JSON.parse(newJson)` を実行）

## 4. git diff 検証

```
git diff --stat public/bible_data/ → 53 files changed, 96 insertions(+), 96 deletions(-)
git diff public/bible_data/ | grep "^[-+]" | grep -v '"japanese"' → 出力なし（0件）
```

**結論**: `token.japanese` フィールド以外の変更なし ✓

## 5. テスト結果

| テスト | 結果 | 備考 |
|--------|------|------|
| test:genitive | PASS (1880/1932) | 変更前と同一（既存52件失敗あり、今回起因なし） |
| test:re-phase1 | **FAIL** | morph coverage: 44179 ≠ 44187 (-8) ★Phase 4k起因 |
| test:re-phase2 | PASS | ALL PASS |
| test:re-phase3 | PASS | ALL PASS |
| test:re-phase5 | PASS | ALL PASS |
| test:re-stageA | PASS | ALL PASS |
| test:re-stageB | **FAIL** | チップ変更件数+6、一致件数-6、破損形+8 ★Phase 4k起因 |

## 6. テスト失敗の根本原因分析

### 6.1 対象ファイル

- **test:re-phase1**: morph coverage 44187 → 44179（-8）
- **test:re-stageB**: チップ変更+6、一致-6、破損形+8

### 6.2 原因

**morph エンジンに godan -る動詞の V-2AAP（第2アオリスト能動分詞）変形ルールが存在しない。**

| 動詞 | morph | 変形前（赦す） | 変形後（去る） |
|------|-------|------------|------------|
| 赦す (godan -す) | V-2AAP | 赦した ✓ | — |
| 去る (godan -る) | V-2AAP | — | undefined ✗ |
| 残す (godan -す) | V-2AAP | — | 残した ✓ |

### 6.3 影響トークン（8件）

| ref | morph | 期待出力 | 実際の出力 |
|-----|-------|--------|----------|
| MAT 13:36!2 | V-2AAP-NSM | 去った/去って | 去る（素形fallback） |
| MAT 22:22!5 | V-2AAP-NPM | 去った/去って | 去る（素形fallback） |
| MAT 26:44!2 | V-2AAP-NSM | 去った/去って | 去る（素形fallback） |
| MRK 4:36!2 | V-2AAP-NPM | 去った/去って | 去る（素形fallback） |
| MRK 8:13!2 | V-2AAP-NSM | 去った/去って | 去る（素形fallback） |
| MRK 12:12!18 | V-2AAP-NPM | 去った/去って | 去る（素形fallback） |
| LUK 10:30!24 | V-2AAP-NPM | 去った/去って | 去る（素形fallback） |
| HEB 6:1!2 | V-2AAP-NPM | 去った/去って | 去る（素形fallback） |

**表示上の影響**: これら8件は morph decorated form（去った/去って）の代わりに素形（去る）が表示される。
原文の意味（能動分詞「〜しながら去った」）は素形でも読み取れるが、正確には時制を反映した活用形が望ましい。

### 6.4 分類

```
DEFERRED
Reason: morph エンジン（FROZEN層）への godan -る動詞 V-2AAP ルール追加が必要
Scope: Phase 4k の変更範囲（bible_data token.japanese のみ）を超える
Resolution: morph engine に -る動詞対応ルールを追加する別 Phase で対処
Impact: 8件の表示が 去る（素形）/ 去った（期待形）の差異のみ。意味は通じる。
```

### 6.5 Phase 4k の correctness への影響

- **bible_data の変更内容**: 正確 ✓（finalCorrectedJa が正しく反映された）
- **テスト失敗の原因**: morph engine の gap（Phase 4k 変更の正確性ではない）
- **表示への影響**: 去る 8件が 去った ではなく 去る として表示される
- **読解への影響**: 素形でも意味は伝わるが、形態論的精度が低下する

## 7. データ変更なし確認

| 保護対象 | 状態 |
|---------|------|
| bible_data（token.japanese 以外） | **変更なし** ✓ |
| G863 対象外 47件 | **変更なし** ✓ |
| Phase 4i/4j/4j-correction 成果物 | **上書きなし** ✓ |
| scripts/output/re-phase2-audit.json 等 5件（既存変更） | **保護済み** ✓ |
| commit/push/PR | **なし** ✓ |

## 8. 作業ツリー状態（Phase 4k 適用後）

- **変更ブランチ**: data/ja1955-nt-approved-132
- **HEAD SHA**: ebf70bc6a02e82a55b30d2c392039fc6a32541a8（変更前と同一・コミットなし）
- **bible_data 変更**: 53ファイル modified（未コミット）
- **既存 modified（5件）**: scripts/output/re-phase2/4c/stageA/B/D-audit.json
  → Phase 4k とは無関係の既存変更。保護済み。

## 9. 承認待ち事項

1. **bible_data 96件の変更内容**（上記すべての検証項目）
2. **morph engine gap（DEFERRED）の扱い**:
   - 案A: Phase 4k として今の状態で承認し、morph fix は別 Phase で対処
   - 案B: Phase 4k 適用を保留し、morph engine に去る対応ルールを先に追加
3. **commit・push・PR**: 承認後に実施（現在は未コミット状態）
