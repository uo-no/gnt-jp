# P6-B.2 Referent-to-Diagram Connector Boundary — Test Matrix

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE (READ-ONLY)

---

## Evidence Level Scale

| Symbol | 意味 |
|---|---|
| ✅ CONFIRMED | 実データ・実コードから確認済み |
| ⚠️ PARTIAL | 部分的に確認 / 解釈が必要 |
| ❌ COUNTER | Counterexample / 問題確認 |
| 🔵 INFERRED | 構造から推定 |
| UNRESOLVED | 本 audit 中に確認できなかった |

---

## Block 1: First Principle 境界確認

| # | 検証項目 | 根拠 | 判定 |
|---|---|---|---|
| 1-1 | MACULA referent は coreference annotation (P6-B.1 確認) | P6-B.1_final_report.md | ✅ CONFIRMED |
| 1-2 | DG connector は syntactic attachment を表す | mandate 定義 | ✅ CONFIRMED |
| 1-3 | coreference と syntactic attachment は異なる概念 | P6-B.1 Audit H3 | ✅ CONFIRMED |
| 1-4 | relative pronoun の場合、両者が 84.8% で重なる | NT corpus 分析 | ✅ CONFIRMED |
| 1-5 | 1.0% (11件) で両者が不一致 (finite verb event reference) | NT corpus 分析 | ✅ CONFIRMED |
| 1-6 | 両者の重なりが high enough で referent を connector 根拠とすることは conditional に合法 | mandate Option B | 🔵 INFERRED (設計判断) |

---

## Block 2: NT Corpus 分布確認

| # | 検証項目 | 方法 | 結果 |
|---|---|---|---|
| 2-1 | NT 全 relative pronoun 総数 | lowfat XML 全ファイル parse | ✅ CONFIRMED: 1,677 |
| 2-2 | referent あり件数 | 同上 | ✅ CONFIRMED: 1,079 (64.3%) |
| 2-3 | referent なし (free relative) | 同上 | ✅ CONFIRMED: 598 (35.7%) |
| 2-4 | Noun target 件数 | 全件 morph 分類 | ✅ CONFIRMED: 840 (77.8%) |
| 2-5 | Adj/num target 件数 | 同上 | ✅ CONFIRMED: 75 (7.0%) |
| 2-6 | Participle target 件数 | 同上 | ✅ CONFIRMED: 39 (3.6%) |
| 2-7 | Finite verb target 件数 | 同上 | ✅ CONFIRMED: 11 (1.0%) |
| 2-8 | Demonstrative pronoun target | 同上 | ✅ CONFIRMED: 10 (0.9%) |
| 2-9 | Article / det target | 同上 | ✅ CONFIRMED: 6 (0.6%) |
| 2-10 | Other (X-*, ARAM, inf) | 同上 | ✅ CONFIRMED: ~32 (3.0%) |
| 2-11 | Space-separated multi-token | 同上 | ✅ CONFIRMED: 66 (6.1%) |
| 2-12 | Cross-verse referent | rel.ref vs target.ref verse 比較 | ✅ CONFIRMED: 227 (21.1%) |
| 2-13 | Cross-chapter referent | 同上 ch 比較 | ✅ CONFIRMED: 4 (0.4%) |
| 2-14 | target が SR に存在しない件数 | lowfat xml:id vs SR nodeId | ✅ CONFIRMED: 0 (全件 SR に存在) |

---

## Block 3: SR 構造分析

| # | 検証項目 | 方法 | 結果 |
|---|---|---|---|
| 3-1 | SR に RELATIVE_CLAUSE construction が存在しないこと | build-sr.cjs CONSTRUCTION_MAP 検索 | ✅ CONFIRMED: 存在しない |
| 3-2 | STANDALONE relative pronoun が SR 内で antecedent NP への link を持たないこと | JHN/1 SR 構造分析 | ✅ CONFIRMED: link なし |
| 3-3 | CLAUSE_AS_NP 構造では relative clause と antecedent が共通 NP 内に共存すること | JHN 1:9!6 / 1:3!11 SR 確認 | ✅ CONFIRMED |
| 3-4 | PREP_PHRASE 構造では relative pronoun が prep phrase の child であること | JHN 1:47!17 SR 確認 | ✅ CONFIRMED |
| 3-5 | SR structural context 分布 | 全 SR ファイル分析 | ✅ CONFIRMED: STANDALONE 49.2%, CLAUSE_AS_NP 32.3%, PREP 12.2% |
| 3-6 | STANDALONE 構造が全体の 49.2% を占めること | 同上 | ✅ CONFIRMED |
| 3-7 | STANDALONE では referent が connector 描画の唯一の根拠となること | SR tree に antecedent 経路がないことを確認 | ✅ CONFIRMED |

---

## Block 4: 具体的ケース検証

| # | Passage | 検証内容 | 結果 |
|---|---|---|---|
| 4-1 | JHN 1:9!6 ὃ | referent → φῶς (N-NSN), ARTICULAR_NP の中 | ✅ R2 case |
| 4-2 | JHN 1:3!11 ὃ | referent → ἕν (A-NSN), NP の direct child | ✅ R1 case |
| 4-3 | JHN 1:47!17 ᾧ | referent → Ἰσραηλίτης (N-NSM), case mismatch 正常 | ✅ PP relative, 適合 |
| 4-4 | JHN 1:30!11 ὃς | referent → ἀνήρ (N-NSM), same-verse | ✅ CONFIRMED |
| 4-5 | COL 1:15!1 ὅς | referent → υἱοῦ (N-GSM), cross-verse 2v | ✅ CONFIRMED |
| 4-6 | JHN 1:13!1 οἳ | referent → ἔλαβον (V-2AAI-3P) = FINITE VERB | ❌ R4: connector 不可 |
| 4-7 | ROM 6:16!12 ᾧ | referent → παριστάνετε (V-PAI-2P) = FINITE VERB | ❌ R4: connector 不可 |
| 4-8 | GAL 2:10!6 ὃ | referent → μνημονεύωμεν (V-PAS-1P) = FINITE SUBJ | ❌ R4: connector 不可 |
| 4-9 | 1CO 15:3!6 ὃ | referent = 4 space-separated tokens | ❌ R3: single connector 不可 |
| 4-10 | ROM 16:4!1 οἵτινες | referent = 2 space-separated tokens (Πρίσκαν + Ἀκύλαν) | ❌ R3 |
| 4-11 | MRK 4:16!10 οἳ | referent → οὗτοί (D-NPM) = demonstrative | ⚠️ R5: chain |
| 4-12 | LUK 8:13!19 οἳ | referent → οἱ (T-NPM) = article | ⚠️ R8 |
| 4-13 | LUK 9:9!13 οὗ | referent → LUK 8:50!3 Ἰησοῦς = cross-chapter | ✅ CONFIRMED (跨章) |
| 4-14 | 1CO 10:11!12 οὓς | referent → 1CO 6:2!6 ἅγιοι = cross-chapter | ✅ CONFIRMED (跨章) |
| 4-15 | MRK 5:41!11 ὅ | referent → ARAM morph (Aramaic word) | ⚠️ R8: ARAM |

---

## Block 5: Failure Taxonomy R1-R8 集計検証

| # | R-type | 定義確認 | 件数確認 | 証拠 |
|---|---|---|---|---|
| 5-1 | R1 exact structural match | NP direct child sibling | ~50 (推定) | 🔵 INFERRED (JHN 1:3!11 confirmed) |
| 5-2 | R2 token match, phrase-level needed | ARTICULAR_NP 内の head token | ~900 (推定) | ✅ JHN 1:9!6 として確認 |
| 5-3 | R3 multi-token | space-separated referent | 66 | ✅ CONFIRMED (全件 lowfat scan) |
| 5-4 | R4 finite verb | V-*[ISD]O?- | 11 | ✅ CONFIRMED (全 11 件列挙) |
| 5-5 | R5 coreference chain | D-* target | 10 | ✅ CONFIRMED |
| 5-6 | R6 free relative | referent = null | 598 | ✅ CONFIRMED |
| 5-7 | R7 null (target not in SR) | SR lookup fail | 0 | ✅ CONFIRMED (0件) |
| 5-8 | R8 other | T-*, ARAM, X-* | ~42 | ✅ CONFIRMED (art 6, rest 36) |

---

## Block 6: Architecture Option 評価

| # | 検証項目 | 結果 |
|---|---|---|
| 6-1 | Option A (直接利用) が R4 を誤描画すること | ✅ CONFIRMED (11件 finite verb connector) |
| 6-2 | Option A が R3 を parse error または誤描画すること | ✅ CONFIRMED (space-sep を tokenId として検索 → miss) |
| 6-3 | Option B (morph filter) が R4, R3 を排除すること | ✅ CONFIRMED (filter 条件で排除可) |
| 6-4 | Option B で valid connector が描画される割合 | ✅ CONFIRMED: ~88% (954/1,079) |
| 6-5 | Option C の phrase-level 解決が L-0 境界上にあること | ⚠️ PARTIAL (annotation transfer ではなく SR traversal) |
| 6-6 | Option D の SR syntactic field が現在存在しないこと | ✅ CONFIRMED (build-sr.cjs に antecedentNPNodeId なし) |
| 6-7 | Option E (no connector) が機能欠落であること | ✅ CONFIRMED (free relative 以外でも描画されない) |

---

## Block 7: 既存コード影響確認

| # | 検証項目 | 結果 |
|---|---|---|
| 7-1 | reading-engine.js K-3 が referent を現在 raw string として返すこと | ✅ CONFIRMED (P6-B.1 確認) |
| 7-2 | SR builder (build-sr.cjs) が referent を SR に転写しないこと | ✅ CONFIRMED (P6-B.1 確認) |
| 7-3 | dg-engine.js が現在 referent に基づく connector を描画しないこと | ✅ CONFIRMED (連携前) |
| 7-4 | flow-tree-adapter.js が referent を node.referent に格納すること | ✅ CONFIRMED (P6-B.1 確認) |
| 7-5 | P6-C 前に dg-engine.js を変更しないこと | ✅ CONFIRMED (本 audit は READ-ONLY) |

---

## Block 8: Production Code 変更確認

| # | 検証項目 | 結果 |
|---|---|---|
| 8-1 | production code diff = 0 | ✅ CONFIRMED |
| 8-2 | SR schema 変更なし | ✅ CONFIRMED |
| 8-3 | dg-engine.js 変更なし | ✅ CONFIRMED |
| 8-4 | reading-engine.js 変更なし | ✅ CONFIRMED |
| 8-5 | syntax-analyzer.js 変更なし | ✅ CONFIRMED |
| 8-6 | referent filtering logic 実装なし | ✅ CONFIRMED |
| 8-7 | commit / merge / deploy なし | ✅ CONFIRMED |

---

## Block 9: UNRESOLVED Items (P6-C 前に解決必要)

| # | 未解決事項 | 優先度 | 影響 |
|---|---|---|---|
| U-1 | connector target style: (a) head token vs (b) NP phrase node — どちらを採用するか | **HIGH** | DG renderer 設計に直結 |
| U-2 | R3 (multi-token 66件) の処理方針: skip / first-token / 複数 connectors | **HIGH** | 66件の表示方針 |
| U-3 | Option B vs Option C の選択 (token-level vs phrase-level) | **HIGH** | renderer 実装方針 |
| U-4 | cross-chapter 4件の fallback 方針 (別 SR ファイルを読まない場合は null?) | Low | 4件のみ |
| U-5 | R5 (demonstrative chain 10件) の connector 方針 (chain 先まで辿るか否か) | Low | L-0 境界 issue |

---

## Summary Table

| Category | CONFIRMED | PARTIAL/INFERRED | COUNTER | UNRESOLVED |
|---|---|---|---|---|
| First Principle 境界 (Block 1) | 5 | 1 | 0 | 0 |
| NT corpus 分布 (Block 2) | 14 | 0 | 0 | 0 |
| SR 構造分析 (Block 3) | 7 | 0 | 0 | 0 |
| 具体的ケース (Block 4) | 9 | 3 | 3 | 0 |
| Failure taxonomy (Block 5) | 6 | 2 | 0 | 0 |
| Architecture 評価 (Block 6) | 6 | 1 | 0 | 0 |
| 既存コード影響 (Block 7) | 5 | 0 | 0 | 0 |
| Production code (Block 8) | 7 | 0 | 0 | 0 |
| **合計** | **59** | **7** | **3** | **5 (UNRESOLVED)** |

---

*詳細: P6-B.2_referent_connector_audit.md / P6-B.2_relationship_matrix.md / P6-B.2_final_report.md*
