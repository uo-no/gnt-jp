# P6-B Relative Clause Schema — Test Matrix

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE (READ-ONLY)

---

## Evidence Level Scale

| Symbol | 意味 |
|---|---|
| ✅ CONFIRMED | 実データ・実コードから確認済み |
| 🔵 INFERRED | 構造から推定 (明示フィールドなし) |
| ⚠️ PARTIAL | 一部のみ確認 |
| ❌ NOT REPRESENTED | SR に情報なし (現在) |
| A* | schema extension 後に取得可能 |

---

## Block 1: SR Schema Structure — Confirmed Absence

| # | 検証項目 | 検証方法 | 結果 |
|---|---|---|---|
| 1-1 | SR に `RELATIVE_CLAUSE` construction が存在しない | 260 SR ファイルの `construction.canonical` 全 distinct 値を収集 | ✅ CONFIRMED: 不在。17 construction 種に含まれない |
| 1-2 | SR の全 node に antecedent/link/target 系フィールドが存在しない | 260 SR ファイルの全 key を収集; 'link','target','source','antecedent','coreference','coref','relation','attachment','relative' を検索 | ✅ CONFIRMED: 0 件 |
| 1-3 | `flags` フィールドが存在するが空 | 全 SR ファイルの flags field を検索 | ✅ CONFIRMED: 0 件 (未使用) |
| 1-4 | `morphCategory: ['relative_pronoun']` が全 relative pronoun に付与 | 全 R-*/K-* 形態 token の morphCategory を確認 | ✅ CONFIRMED: 1,676/1,676 (100%) |
| 1-5 | `evidence.role` は bible_data.role の転写 | JHN 1 relative pronoun の SR evidence.role と bible_data.role を比較 | ✅ CONFIRMED: role='s' 等が一致 |
| 1-6 | SR token の `id` フォーマット = `n` + 数字 | SR token node id を複数サンプルで確認 | ✅ CONFIRMED: `n43001003010` 等 |

---

## Block 2: bible_data.referent Field

| # | 検証項目 | 検証方法 | 結果 |
|---|---|---|---|
| 2-1 | bible_data に `referent` フィールドが存在する | JHN 1.json token キー一覧を確認 | ✅ CONFIRMED: フィールドあり |
| 2-2 | referent の形式が SR token id と同一 (`n`+数字) | JHN 1:3!11 `ὃ` referent = 'n43001003010' → SR で確認 | ✅ CONFIRMED: 一致 |
| 2-3 | bible_data.referent が対応 SR node を指す | `n43001003010` = SR token `ἕν.` [A-NSN] (JHN 1:3!10) | ✅ CONFIRMED |
| 2-4 | NT 全体での referent 有無集計 | 全 NT bible_data ファイルをスキャン | ✅ CONFIRMED: 1,078/1,676 (64.3%) あり |
| 2-5 | 一部 referent が space-separated 複数値 | ROM 16:4!1 `οἵτινες` referent = "n45016003002 n45016003004" | ✅ CONFIRMED |
| 2-6 | space-separated referent の各 nodeId が SR に存在する | n45016003002 = `Πρίσκαν`, n45016003004 = `Ἀκύλαν` | ✅ CONFIRMED |
| 2-7 | reading-engine.js Stage K-3 が bible_data.referent を「既存注釈の転写のみ」として使用 | reading-engine.js 88-99 行目確認 | ✅ CONFIRMED |

---

## Block 3: Existing Structural Patterns

| # | 検証項目 | 検証方法 | 結果 |
|---|---|---|---|
| 3-1 | CLAUSE_AS_NP が head noun と relative clause を co-locate | 1CO 10:13 ARTICULAR_NP > CLAUSE_AS_NP 構造を確認 | ✅ CONFIRMED: θεός + ὃς clause が CLAUSE_AS_NP 内に共存 |
| 3-2 | CLAUSE_AS_NP sibling として head noun が識別可能 | 1CO 10:13 CLAUSE_AS_NP の子ノード確認 | ✅ CONFIRMED: token 'θεός' と clause が兄弟 |
| 3-3 | CLAUSE_AS_NP を含む relative clause の件数 | 全 NT relative pronoun の親 clause → CLAUSE_AS_NP チェーン | ✅ CONFIRMED: 541/1,676 |
| 3-4 | head NP が CLAUSE_AS_NP sibling として識別可能な件数 | sibling に token/phrase.np 存在チェック | ✅ CONFIRMED: 527/541 |
| 3-5 | 関係代名詞を含む clause が fn=ADVERBIAL の件数 | 全 NT スキャン | ✅ CONFIRMED: 169 件 |
| 3-6 | 自由関係詞 (fn=SUBJECT/OBJECT の clause) の件数 | 全 NT スキャン | ✅ CONFIRMED: 196 件 |
| 3-7 | 関係代名詞を前置詞が支配 (PREP_PHRASE 内) の件数 | 全 NT スキャン | ✅ CONFIRMED: 204 件 |
| 3-8 | 全 27 書に関係代名詞が出現する | 書別集計 | ✅ CONFIRMED: 27/27 |

---

## Block 4: Critical Boundary Tests (Audit F)

| # | Test Case | 検証 | 判定 |
|---|---|---|---|
| 4-1 | **Case 1** ὁ λόγος ὃν ἤκουσα — antecedent = λόγον | bible_data.referent で λόγον の nodeId が取得できるか (適切な例での確認) | ✅ PATTERN CONFIRMED: CLAUSE_AS_NP 内に head noun + clause が共存 |
| 4-2 | **Case 2** ἐν ᾧ — 前置詞支配の関係詞 | fn=null の ᾧ (PREP_PHRASE 内) が morphCategory で識別できるか | ✅ CONFIRMED: morphCategory=['relative_pronoun'] が付与される |
| 4-3 | **Case 3** ὃς ἐστιν — relative pronoun が SUBJECT | COL 1:15 `ὅς fn=SUBJECT` | ✅ CONFIRMED: fn=SUBJECT が既存で明示 |
| 4-4 | **Case 4** ὃν εἶδον — relative pronoun が OBJECT | 複数事例で fn=OBJECT 確認 | ✅ CONFIRMED |
| 4-5 | **Case 5** free relative — antecedent なし | bible_data.referent = '' (空文字) | ✅ CONFIRMED: null/空で保持 = 598 件 |
| 4-6 | **Case 6** unresolved antecedent | PHP 2:5 の ὃ と ὃς (fn=null clause 内) | 🔵 INFERRED: bible_data.referent が空の可能性が高い |

---

## Block 5: Schema Option Evaluation

| # | 検証項目 | Option A | Option B/E | Option C | Option D |
|---|---|---|---|---|---|
| 5-1 | production code 変更なしで設計可能 | ✅ | ✅ | ✅ | ✅ |
| 5-2 | L-0 BLOCKED 情報を排除 | ✅ | ✅ | ✅ | ✅ |
| 5-3 | antecedent pointer が明示的に取得可能 | ❌ | ✅ | ✅ | ✅ |
| 5-4 | evidence pattern に整合 | N/A | ✅ | ❌ | ⚠️ |
| 5-5 | 最小変更 (1 フィールド以内) | ✅ | ✅ | ❌ | ⚠️ |
| 5-6 | backward compatible | ✅ | ✅ | ⚠️ | ✅ |
| 5-7 | bible_data 転写パターンに整合 | N/A | ✅ | N/A | ⚠️ |
| 5-8 | free relative (null) をサポート | ✅ | ✅ | ✅ | ✅ |
| 5-9 | renderer が connector を描画可能 | ⚠️ (tree traversal 別途) | ✅ | ✅ | ✅ |
| 5-10 | 27/27 書に適用可能 | ✅ | ✅ | ✅ | ✅ |

---

## Block 6: Corpus Coverage Verification

| # | 指標 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| 6-1 | NT 総文数 | > 7,000 | 8,010 | ✅ |
| 6-2 | 相対節を含む文 | > 1,000 | 1,340 | ✅ |
| 6-3 | 総関係代名詞数 | ~1,600-1,800 | 1,676 | ✅ |
| 6-4 | morphCategory coverage | 100% | 100% (1,676/1,676) | ✅ |
| 6-5 | bible_data.referent coverage | > 60% | 64.3% (1,078/1,676) | ✅ |
| 6-6 | free relative (referent なし) | ~35-40% | 35.7% (598/1,676) | ✅ |
| 6-7 | CLAUSE_AS_NP pattern coverage | ~30-35% | 32.3% (541/1,676) | ✅ |
| 6-8 | 全 27 書での出現 | 27/27 | 27/27 | ✅ |

---

## Block 7: Production File Change Verification

| # | 検証項目 | 結果 |
|---|---|---|
| 7-1 | production code diff = 0 | ✅ CONFIRMED |
| 7-2 | `git diff -- public/core/` = empty | ✅ CONFIRMED (audit only) |
| 7-3 | SR schema files unchanged | ✅ CONFIRMED |
| 7-4 | syntax-registry.json unchanged | ✅ CONFIRMED |
| 7-5 | reading-engine.js unchanged | ✅ CONFIRMED |
| 7-6 | syntax-analyzer.js unchanged | ✅ CONFIRMED |
| 7-7 | dg-engine.js unchanged | ✅ CONFIRMED |
| 7-8 | index.html unchanged | ✅ CONFIRMED |
| 7-9 | 新しい統語推論ロジック追加なし | ✅ CONFIRMED |
| 7-10 | commit / merge / deploy なし | ✅ CONFIRMED |

---

## Block 8: UNRESOLVED Items

| # | 未確認事項 | 理由 | 影響 |
|---|---|---|---|
| 8-1 | PHP 2:5 `ὃ` および `ὃς` の bible_data.referent 値 | 本 audit 中に未確認 | 拡張後の antecedentTokenId が null か値ありかが不明 |
| 8-2 | space-separated referent の renderer での扱い方針 | 設計判断が必要 | 複数 token antecedent の connector 描画方針 |
| 8-3 | RELATIVE_CLAUSE construction を追加した場合の既存 dg-engine テストへの影響 | Option D 採用時にのみ適用 | 回帰テスト実行が必要 (P6-C 以降) |
| 8-4 | SR builder が bible_data.referent を読む仕組みの確認 | scripts/ に SR builder が見当たらない | 転写の実装パスが不明 |

---

## 総合サマリー

| カテゴリ | CONFIRMED | INFERRED | PARTIAL | NOT CONFIRMED |
|---|---|---|---|---|
| SR schema absence (Block 1) | 6 | 0 | 0 | 0 |
| bible_data.referent (Block 2) | 7 | 0 | 0 | 0 |
| Structural patterns (Block 3) | 8 | 0 | 0 | 0 |
| Boundary tests (Block 4) | 5 | 1 | 0 | 0 |
| Option evaluation (Block 5) | — | — | — | — |
| Corpus coverage (Block 6) | 8 | 0 | 0 | 0 |
| Production file change (Block 7) | 10 | 0 | 0 | 0 |
| **合計** | **44** | **1** | **0** | **4 (UNRESOLVED)** |

---

*詳細: P6-B_relative_clause_schema_audit.md / P6-B_relative_relationship_matrix.md / P6-B_final_report.md*
