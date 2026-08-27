# P6-B.1 Antecedent Source Audit — Test Matrix

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE (READ-ONLY)

---

## Evidence Level Scale

| Symbol | 意味 |
|---|---|
| ✅ CONFIRMED | 実データ・実コードから確認済み |
| ⚠️ PARTIAL | 部分的に確認 / 解釈が必要 |
| ❌ COUNTER | Counterexample — 反証 |
| 🔵 INFERRED | 構造から推定 |
| UNRESOLVED | 本 audit 中に確認できなかった |

---

## Block 1: `bible_data.referent` Source Identification

| # | 検証項目 | 方法 | 結果 |
|---|---|---|---|
| 1-1 | `referent` の source は MACULA Greek Linguistic Datasets | DATA_LICENSE.md + flow-tree-adapter.js コメント確認 | ✅ CONFIRMED: CC BY 4.0, Clear Bible |
| 1-2 | `referent` は lowfat XML の `<w referent="...">` 属性そのまま | flow-tree-adapter.js SF-11 コメント: "値を改変せず生のまま" | ✅ CONFIRMED |
| 1-3 | `referent` は relative pronoun 専用ではなく personal/demo にも付与 | JHN 1 bible_data 全 referent 付きトークン調査 | ✅ CONFIRMED: 6種類のトークンに付与 |
| 1-4 | `referent` は单一 nodeId (通常) または space-separated 複数 nodeId | bible_data 全 NT スキャン | ✅ CONFIRMED: 66件 space-separated |
| 1-5 | `referent` 値は `n` + book + ch + verse + word-index 形式 | JHN 1:3!11 ὃ → n43001003010 を XML + SR で検証 | ✅ CONFIRMED |

---

## Block 2: `referent` Usage in Source Code

| # | 検証項目 | 方法 | 結果 |
|---|---|---|---|
| 2-1 | reading-engine.js は `referent` を「先行詞トークンID」と解釈 | reading-engine.js line 580: "referent=先行詞トークンID" | ✅ CONFIRMED (エンジンの解釈) |
| 2-2 | Stage K-3 は `referent` を "既存注釈の転写のみ" として使用 | reading-engine.js line 99: "転写のみ。推論しない" | ✅ CONFIRMED |
| 2-3 | build-sr.cjs は `referent` フィールドを SR に転写しない | build-sr.cjs で `referent` の参照を検索 | ✅ CONFIRMED: SR には referent 未転写 |
| 2-4 | flow-tree-adapter.js は `referent` を "生のまま" 転写 | flow-tree-adapter.js: `_attachRelationAttrs` 関数 | ✅ CONFIRMED |
| 2-5 | reading-engine.js K-3 の "先行詞トークンID" は ENGINE 解釈であり MACULA 元定義ではない | SOURCE: MACULA は coreference annotation として設計 | 🔵 INFERRED (MACULA docs 本 repo 内に存在しない) |

---

## Block 3: Referent Target Morph Distribution (NT corpus)

| # | 検証項目 | 方法 | 結果 |
|---|---|---|---|
| 3-1 | NT 全 relative pronoun 数 | 全 bible_data スキャン (morph R-*/K-*) | ✅ CONFIRMED: 1,676 |
| 3-2 | referent あり件数 | 同上 | ✅ CONFIRMED: 1,078 (64.3%) |
| 3-3 | referent なし件数 (free relative / unresolved) | 同上 | ✅ CONFIRMED: 598 (35.7%) |
| 3-4 | referent target が noun (N-*) の件数 | 全 relative pronoun の referent target morph を解析 | ✅ CONFIRMED: 840 (77.9%) |
| 3-5 | referent target が adjective (A-*) の件数 | 同上 | ✅ CONFIRMED: 74 (6.9%) |
| 3-6 | referent target が verb (V-*) の件数 | 同上 | ✅ CONFIRMED: 53 total (3.6%+1.3%+gray) |
| 3-7 | verb target のうち participial (V-*P-*) の件数 | verb cases の morph 分類 | ✅ CONFIRMED: 39 |
| 3-8 | **verb target のうち finite verb の件数** | 同上 | ✅ **CONFIRMED: 14 (1.3%)** |
| 3-9 | referent target が demonstrative pronoun (D-*) の件数 | 同上 | ✅ CONFIRMED: 9 (0.8%) |
| 3-10 | referent target が article (T-*) の件数 | 同上 | ✅ CONFIRMED: 6 (0.6%) |
| 3-11 | **space-separated 複数 referent の件数** | 同上 | ✅ **CONFIRMED: 66 (6.1%)** |
| 3-12 | cross-verse referent の件数 | rp.ref と refTok.ref の verse を比較 | ✅ CONFIRMED: 227 (21.1%) |

---

## Block 4: Critical Counterexamples (Audit D)

| # | 検証項目 | Passage | target | morph | L-0 safe? |
|---|---|---|---|---|---|
| 4-1 | Finite verb referent: indicative | ROM 6:16!12 ᾧ → παριστάνετε | V-PAI-2P | ❌ NOT SAFE |
| 4-2 | Finite verb referent: indicative (cross-verse) | JHN 1:13!1 οἳ → ἔλαβον | V-2AAI-3P | ❌ NOT SAFE |
| 4-3 | Finite verb referent: subjunctive | GAL 2:10!6 ὃ → μνημονεύωμεν | V-PAS-1P | ❌ NOT SAFE |
| 4-4 | Finite verb referent: indicative | EPH 3:4!2 ὃ → προέγραψα | V-AAI-1S | ❌ NOT SAFE |
| 4-5 | Finite verb referent: indicative | 1PE 2:8!13 ὃ → προσκόπτουσιν | V-PAI-3P | ❌ NOT SAFE |
| 4-6 | Multiple antecedent (4 tokens) | 1CO 15:3!6 ὃ → 4 space-separated | V-2AAI-3S + | ❌ FIELD MISMATCH |
| 4-7 | Multiple antecedent (2 tokens) | 1PE 1:12!10 ἃ → 2 space-separated | N-*+N-* | ⚠️ PARTIAL |
| 4-8 | Demonstrative pronoun referent | MRK 4:16!10 οἳ → οὗτοί | D-NPM | ⚠️ CHAIN |
| 4-9 | Article referent (not noun itself) | LUK 8:13!19 οἳ → οἱ | T-NPM | ⚠️ PARTIAL |

---

## Block 5: Source Semantics Classification Tests

| # | 主張 | 根拠 | 判定 |
|---|---|---|---|
| 5-1 | `referent` は MACULA coreference annotation | personal/demo 両方に同一フィールドが使われる | ✅ CONFIRMED |
| 5-2 | `referent` は relative pronoun の syntactic antecedent を常に指す | Audit D: 14件の finite verb cases 確認 | ❌ REFUTED |
| 5-3 | `referent` は relative pronoun の syntactic antecedent を「主に」指す | 840/1,078 = 77.9% が noun target | ✅ PARTIAL (主に yes) |
| 5-4 | `referent` が verb を指す場合は syntactic antecedent ではない | ROM 6:16!12 等: 動作/事象への参照 | ✅ CONFIRMED |
| 5-5 | `referent` の space-separated 形式は `antecedentTokenId: string` と非互換 | field definition と実データの比較 | ✅ CONFIRMED |
| 5-6 | `antecedentTokenId` という名称は syntactic claim を含む | 用語「antecedent」= 統語論的先行詞 | ✅ CONFIRMED |
| 5-7 | `referentTokenId` という名称は neutral (semantic claim なし) | フィールド名の意味分析 | ✅ CONFIRMED |

---

## Block 6: L-0 Boundary Tests

| # | 操作 | L-0 Status | 根拠 |
|---|---|---|---|
| 6-1 | bible_data.referent → SR `referentTokenId` として転写 | ✅ PERMITTED | annotation transfer (evidence.role と同パターン) |
| 6-2 | `referentTokenId` を `antecedentTokenId` に改名して意味を付加 | ⚠️ BORDERLINE | source が coreference の時に syntactic claim を加える |
| 6-3 | DG renderer が名詞 target に connector を描画 | ✅ PERMITTED | structural annotation からの描画 |
| 6-4 | DG renderer が finite verb target に antecedent connector を描画 | ❌ FORBIDDEN | verb = event reference ≠ structural antecedent |
| 6-5 | free relative pronoun (referent null) に antecedent connector を描画 | ❌ FORBIDDEN | L-0: 推論禁止 |
| 6-6 | discourse referent の同定・解決 | ❌ FORBIDDEN | L-0 明示禁止 |

---

## Block 7: Naming Analysis Tests

| # | フィールド名 | Semantic claim | L-0 | Source 忠実度 | 推奨 |
|---|---|---|---|---|---|
| 7-1 | `evidence.antecedentTokenId` | YES: syntactic antecedent | ⚠️ BORDERLINE | LOW (source は coreference) | ❌ |
| 7-2 | `evidence.referentTokenId` | NO: neutral | ✅ SAFE | HIGH (source フィールド名に忠実) | ✅ |
| 7-3 | `evidence.maculaReferentId` | NO | ✅ SAFE | HIGH | ⚠️ (冗長) |
| 7-4 | `evidence.syntacticHeadTokenId` | YES: strong syntactic claim | ❌ UNSAFE | LOW | ❌ |

---

## Block 8: Reading-Engine.js K-3 Compatibility

| # | 検証項目 | 結果 |
|---|---|---|
| 8-1 | K-3 は現在 `referent` を raw string として返す (space-sep 含む) | ✅ CONFIRMED (line 593-598) |
| 8-2 | K-3 は referent target の morph を検証しない | ✅ CONFIRMED (validation なし) |
| 8-3 | K-3 の "先行詞トークンID" という記述は ENGINE 解釈 (MACULA 仕様ではない) | 🔵 INFERRED |
| 8-4 | K-3 が finite verb target を返した場合の downstream 影響 | UNRESOLVED (downstream が verb check をするかどうか未確認) |
| 8-5 | SR への referentTokenId 追加は K-3 に影響しない (K-3 は bible_data を読む) | ✅ CONFIRMED (K-3 は bible_data から直接 referent を読む; SR は別レイヤー) |

---

## Block 9: Production Code Change Verification

| # | 検証項目 | 結果 |
|---|---|---|
| 9-1 | production code diff = 0 | ✅ CONFIRMED |
| 9-2 | SR schema ファイル変更なし | ✅ CONFIRMED |
| 9-3 | reading-engine.js 変更なし | ✅ CONFIRMED |
| 9-4 | syntax-analyzer.js 変更なし | ✅ CONFIRMED |
| 9-5 | dg-engine.js 変更なし | ✅ CONFIRMED |
| 9-6 | index.html 変更なし | ✅ CONFIRMED |
| 9-7 | 新しい推論ロジック実装なし | ✅ CONFIRMED |
| 9-8 | referent → antecedent 変換ロジック実装なし | ✅ CONFIRMED |
| 9-9 | commit / merge / deploy なし | ✅ CONFIRMED |

---

## Block 10: UNRESOLVED Items

| # | 未確認事項 | 影響 |
|---|---|---|
| U-1 | MACULA documentation (英語原文) での `referent` 定義 | MACULA が "coreference" と "syntactic antecedent" をどう区別しているかの一次資料確認 |
| U-2 | Space-separated referent 66件のうち、first-token が syntactic antecedent になる割合 | first-fit strategy の有効性評価 |
| U-3 | SR builder が cross-chapter referent を解決できるかの確認 | P6-C 実装前に必須 |
| U-4 | finite verb referent 14件の DG renderer への影響 (描画誤りのリスク評価) | renderer 設計時に対処が必要 |
| U-5 | reading-engine.js K-3 の downstream consumer が finite verb referent をどう処理しているか | 既存バグの可能性 |

---

## Summary Table

| Category | CONFIRMED | PARTIAL/INFERRED | COUNTER | UNRESOLVED |
|---|---|---|---|---|
| Source identification (Block 1) | 5 | 0 | 0 | 0 |
| Code usage (Block 2) | 4 | 1 | 0 | 0 |
| Corpus distribution (Block 3) | 12 | 0 | 0 | 0 |
| Critical counterexamples (Block 4) | 9 | 0 | 0 | 0 |
| Source semantics (Block 5) | 4 | 1 | 2 | 0 |
| L-0 boundary (Block 6) | 4 | 1 | 2 | 0 |
| Naming analysis (Block 7) | 4 | 0 | 0 | 0 |
| K-3 compatibility (Block 8) | 2 | 1 | 0 | 2 |
| Production code (Block 9) | 9 | 0 | 0 | 0 |
| **合計** | **53** | **4** | **4** | **5** |

---

*詳細: P6-B.1_antecedent_source_audit.md / P6-B.1_antecedent_case_matrix.md / P6-B.1_final_report.md*
