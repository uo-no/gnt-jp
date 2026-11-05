# Task 37 — 自動注釈データセット最終統合監査

作成日: 2026-10-15  
種別: 横断監査（READ ONLY）  
対象: apparatus-ja.json / apparatus-ja-auto.json / apparatus-ja-phase2.json / apparatus-ja-phase3.json

---

## 1. データセット照合

### 1.1 件数（CONFIRMED）

| データセット | ファイル | 件数 | ステータス |
|---|---|---|---|
| manual | apparatus-ja.json | 30 | 人手（確認済み・保留） |
| Phase 1 | apparatus-ja-auto.json | 2,418 | 自動生成 |
| Phase 2 | apparatus-ja-phase2.json | 2,796 | 自動生成 |
| Phase 3 | apparatus-ja-phase3.json | 1,512 | 自動生成 |
| **合計** | | **6,756** | |

- ユニーク ID 数: **6,756**（合計と一致 → 4データセット間・各内部の重複 **0件**）
- base apparatus 全体: **6,929件**
- **未カバー: 173件**

### 1.2 ID 重複確認（CONFIRMED）

| 組み合わせ | 重複件数 |
|---|---|
| manual × Phase 1 | 0 |
| manual × Phase 2 | 0 |
| manual × Phase 3 | 0 |
| Phase 1 × Phase 2 | 0 |
| Phase 1 × Phase 3 | 0 |
| Phase 2 × Phase 3 | 0 |
| 各データセット内 | 0 |

### 1.3 保留・除外対象の確認（CONFIRMED）

- **MAT-0353, LUK-0985**（verseRange + WHspur 保留）: manual に `保留` ステータスで存在。自動生成3ファイルには含まれない。
- **verseRange=true のエントリ**: Phase 1 / Phase 2 / Phase 3 すべてに 0件（除外条件が機能している）。

---

## 2. メタデータ照合

### 2.1 _meta 件数と実データの一致（CONFIRMED）

| データセット | _meta.entryCount | 実エントリ数 | 一致 |
|---|---|---|---|
| Phase 1 | 2,418 | 2,418 | ✓ |
| Phase 2 | 2,796 | 2,796 | ✓ |
| Phase 3 | 1,512 | 1,512 | ✓ |

### 2.2 Phase 1 — タグ別分類（CONFIRMED）

| _meta フィールド | 値 | 実 tag 件数 | 差分 | 説明 |
|---|---|---|---|---|
| additionCount | 1,608 | — | — | `+` のみのエントリ |
| omissionCount | 809 | tag=省略 = 809 | 0 | ✓ |
| bothCount | 1 | — | — | `+` と isOmission 両方（1TI-0014） |
| **tag=添加（実）** | — | **1,609** | — | additionCount + bothCount = 1,609 ✓ |
| truncatedLemCount | 14 | 実 `・長文lem）` 含む = 14 | 0 | ✓ |

**INFO-1（既知・設計通り）:** `_meta.additionCount = 1,608` は実 `tag=添加` 件数 1,609 と 1件差がある。差分は 1TI-0014（`+` と isOmission の複合）であり、`bothCount=1` として別計上されている。`additionCount + bothCount = 1,609 = 実 tag=添加` であることを確認済み。（Task 31 REVIEW-1 と同一、設計上の挙動）

### 2.3 Phase 3 — 分類別カウント（CONFIRMED）

| _meta フィールド | 値 | 内訳確認 |
|---|---|---|
| phraseCount | 1,429 | — |
| elisionCount | 68 | — |
| caseCount | 15 | — |
| **合計** | 1,512 | phraseCount + elisionCount + caseCount = 1,429 + 68 + 15 = 1,512 ✓ |
| excludedWHspur | 0 | Task 35 後（`every` 条件 → 5件生成対象に変更） |

### 2.4 ステータス区分（CONFIRMED）

- 全 Phase 1 / 2 / 3 エントリの `status = '自動生成'`
- manual エントリの `status` は `確認済み` または `保留`（`自動生成` は 0件）

---

## 3. 内容と表示契約

### 3.1 タグと出力内容の整合（CONFIRMED）

| タグ | 期待する内容 | 違反件数 |
|---|---|---|
| `添加` | ja が `＋` で始まる（複合は `／` 含む） | 0 |
| `省略` | ja に `の省略` を含む | 0 |
| `読み差` | ja に `（` と `）` を含む | 0 |

### 3.2 長文ラベルの区別（CONFIRMED）

| ラベル | 対象 | 件数 | 条件 |
|---|---|---|---|
| `・長文）` | 添加テキスト切り詰め（Phase 1） | 52 | `addedText.length > 30` |
| `・長文lem）` | lemText 切り詰め（Phase 1、Task 36） | 14 | `lemText.length > 25` |
| 両方同時に持つ | — | 0 | （排他的 — 設計通り） |

**条件との一致:**
- `addedText > 30字` の実エントリ: 52件 = `長文` ラベル 52件 ✓
- `lemText > 25字` の実エントリ: 14件 = `長文lem` ラベル 14件 ✓

### 3.3 省略記号 `…` の由来識別（CONFIRMED）

| 由来 | 件数 | 識別可否 |
|---|---|---|
| 添加テキスト切り詰め（生成処理） | 52 | `・長文）` ラベルで識別可 |
| lemText 切り詰め（生成処理） | 14 | `・長文lem）` ラベルで識別可（Task 36 解消） |
| 元データ由来（apparatus.json の reading.text に `…`）| 0 | Phase 2/3 除外済み（70件が対象外） |

- Phase 2 に元データ `…` を含む ID: **0件** ✓
- Phase 3 に元データ `…` を含む ID: **0件** ✓
- Phase 1 の `…` は全件が生成処理由来（66件 = 添加切り詰め 52 + lemText 切り詰め 14）✓

### 3.4 証人ラベルと読みの対応確認（CONFIRMED）

- Phase 2 最初の 100件: 不一致 **0件** ✓
- Phase 3 最初の 100件: 不一致 **0件** ✓

### 3.5 WHspur 2-reading エントリ（Task 35）（CONFIRMED）

5件（MRK-0923 / MRK-0926 / LUK-0962 / LUK-0986 / LUK-0987）はいずれも:

- Phase 3 に存在する ✓
- `tag=読み差`, `status=自動生成`, `autoPhase=3` ✓
- `TEXT（WITNESSES）・TEXT（WITNESSES）` 形式 ✓
- `WHspur` が証人ラベルとして出力に現れる（例: `παρ᾽（WHspur Treg NIV）・ἀφ᾽（RP）`）✓
- 元データ `bE.readings` との完全一致 ✓

**データ上の矛盾なし。** WHspur は SBLGNT apparatus における証人ラベルの事実を反映しており、差異の神学的・本文批判的意味の断定ではない。

---

## 4. テストと再現性

### 4.1 全回帰テスト結果（CONFIRMED）

| テスト | チェック数 | 結果 |
|---|---|---|
| re-apparatus-ja-auto-regression | 32/32 | PASS |
| re-apparatus-ja-phase2-regression | 24/24 | PASS |
| re-apparatus-ja-phase3-regression | 53/53 | PASS |
| re-apparatus-ja-regression | 22/22 | PASS |
| re-apparatus-regression | 82/82 | PASS |
| re-apparatus-reproducibility | 10/10 | PASS |
| **合計** | **223/223** | **全 PASS** |

### 4.2 Phase 1 再現性確認（CONFIRMED）

`build-apparatus-ja-auto.cjs` の現在のロジックを静的にシミュレートし、現在の `apparatus-ja-auto.json` の全 2,418 エントリと照合。**不一致: 0件**（完全再現可能）。

---

## 5. 未カバー 173 件の内訳

### 5.1 Task 34 分類済みエントリ

| 分類 | 件数 | 対象 ID |
|---|---|---|
| 自動注釈対象外 | 9 | LUK-0961, JHN-0259, ROM-0229, LUK-1050, LUK-1094, LUK-1099, LUK-1124, LUK-1139, LUK-1140 |
| 個別レビュー必須 | 8 | JUD-0015, MAT-0816, MRK-0745, LUK-0427, LUK-0428, LUK-0463, ACT-0808, ACT-1012 |

### 5.2 残余 156 件（phrase/elision/case の除外分）

| 除外理由 | 件数 |
|---|---|
| 元データ `…` 含む（phrase 148 + elision + case中） | 58 |
| reading > 30字（`…` なし） | 98 |
| **合計** | 156 |

tokenRefStatus 別: phrase=144, elision=10, case=2

これらは Phase 3 のジェネレーターで処理可能な形式だが、現行の除外条件（`…` または長文）に該当する。将来の Phase N+1 で閾値緩和または別フォーマット対応が必要。

### 5.3 未カバー分類まとめ

| 分類 | 件数 | 対応方針 |
|---|---|---|
| 自動注釈対象外 | 9 | 現状維持（専用注釈または保留） |
| 個別レビュー必須 | 8 | 将来フェーズ（長文対応）で検討 |
| 残余（…/長文） | 156 | 将来フェーズ（閾値緩和 or 原資料省略対応）で検討 |
| **合計** | **173** | |

---

## 6. 発見事項の分類

### BLOCKER

なし。

### REVIEW

なし（Task 33 REVIEW-1 は Task 36 で解消済み。Task 33 REVIEW-2 は DEFERRED 維持）。

### INFO

| ID | 内容 |
|---|---|
| INFO-1 | Phase 1 `_meta.additionCount` (1,608) ≠ 実 `tag=添加` (1,609)。1TI-0014 が `bothCount` に計上されているため（設計通り、Task 31 記録済み） |
| INFO-2 | 未カバー 173件中 156件は将来フェーズ対象。現状の未出力は正しい除外状態 |
| INFO-3 | Phase 1 の `／` を含むエントリ（複合形式）は 22件。うち1件（1TI-0014）が `+` と isOmission の複合。残 21件は複数の `+` 読みグループ |

### DEFERRED（Task 33 REVIEW-2 継続）

- Category C（元データ `…` 由来 70件）は出力なし状態を維持。`（原資料省略）` ラベル方針が合意されたら Phase N+1 で処理。

---

## 7. 変更が必要な項目 / 追加対応不要な項目

### 追加対応不要

- 全 6,756 件の ID 重複: **なし**（対応不要）
- _meta 件数整合: **一致**（対応不要）
- タグ・表示契約整合: **全件一致**（対応不要）
- 回帰テスト: **全 PASS**（対応不要）
- Phase 1 bothCount 差異（INFO-1）: **設計通り**（対応不要）
- WHspur 2-reading 5件: **正常生成**（対応不要）

### 変更が必要な項目

現時点で変更が必要な項目は**なし**。

将来フェーズでの検討候補（DEFERRED）:
- Phase N+1: 元データ `…` 対応（Category C 70件、`原資料省略` ラベル方針の合意後）
- Phase N+2: 長文対応（exact/phrase/elision 残余 156件 + Task 34 個別レビュー 8件）

---

## 8. 完了確認

- [x] 4データセットの件数・ID集合・重複が確定している（6,756件、重複ゼロ）
- [x] メタデータと表示契約の整合性が確認されている（全件一致）
- [x] すべての回帰テスト結果が記録されている（223/223 PASS）
- [x] 変更が必要な項目（なし）と追加対応不要な項目が分離されている
- [x] 既存JSON・生成器・UIを変更していない
- [x] コミット・push・PRを行っていない

---

*監査 CONFIRMED: 上記は全て実コード・実データ・実行結果（node スクリプト実行）に基づく。推測は含まない。*
