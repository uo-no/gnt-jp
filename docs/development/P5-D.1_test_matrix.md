# P5-D.1 SR Coverage Boundary Audit — Test Matrix

**Phase:** P5 — Original Greek NT Diagram Grammar  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE (READ-ONLY)

---

## グレードスケール

| 記号 | 意味 |
|---|---|
| ✅ CONFIRMED | SR データ確認済み |
| ❌ ABSENT | SR に存在しない |
| ⚠️ PARTIAL | 部分的にのみ存在 |
| N/A | 適用なし |

---

## テスト項目 A — Relative Clause Antecedent Link

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| A-1 | SR node に `antecedentId` フィールドが存在するか | 調査 | 存在しない | ❌ ABSENT |
| A-2 | SR node に `coref`/`link`/`target` 等のフィールドが存在するか | 調査 | 存在しない | ❌ ABSENT |
| A-3 | `RELATIVE_CLAUSE` construction が SR に存在するか | 調査 | 存在しない（17種類の construction に含まれない） | ❌ ABSENT |
| A-4 | `SUBORDINATE_CLAUSE` construction が先行詞情報を持つか | 調査 | 持たない（cn=SUBORDINATE_CLAUSE は antecedent link なし） | ❌ ABSENT |
| A-5 | 関係代名詞の fn が "先行詞との関係" を示すか | 調査 | fn=SUBJECT/OBJECT/ADVERBIAL — 節内機能のみ。先行詞情報なし | ❌ ABSENT |
| A-6 | JHN 1:15 `ὅν` [R-ASM] に先行詞参照が存在するか | 確認 | fn=ADVERBIAL、先行詞参照なし | ❌ ABSENT |
| A-7 | PHP 2:6 `ὅς` [R-NSM] に先行詞参照が存在するか | 確認 | fn=SUBJECT、先行詞参照なし | ❌ ABSENT |

**判定: SR SCHEMA GAP — 確定。先行詞リンクは SR に存在しない。**

---

## テスト項目 B — PP Internal Genitive Attachment

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| B-1 | SR に PP+GENITIVE_MOD 構造が存在するか | 調査 | 存在する（NT 全書 575件） | ✅ CONFIRMED |
| B-2 | `ἐν μορφῇ θεοῦ` (PHP 2:5) が SR に存在するか | 確認 | `phrase.pp cn=PREP_PHRASE { ἐν, phrase.np cn=GENITIVE_MOD { μορφῇ, θεοῦ } }` | ✅ CONFIRMED |
| B-3 | PHP 2:5 の PP+GENITIVE_MOD が DG 可達か | 確認 | 不可達（fn=null 祖先 `.2`, `.2.0` がスキップされる） | ❌ ABSENT |
| B-4 | P5-gate 章の PP+GENITIVE_MOD 全件の可達性 | 確認 | 9件全件 DG 不可達（可達 0件） | ❌ ABSENT |
| B-5 | NT 全書での PP+GENITIVE_MOD 可達率 | 調査 | 34/575 件 = 6% が可達 | ⚠️ PARTIAL |
| B-6 | fn=null clause 子の NT 全書規模 | 調査 | 6,215件（うち述語含む: 6,004件） | ✅ CONFIRMED |
| B-7 | `extractSlotModifiers` が GENITIVE_MOD を正しく処理するか | コード確認 | 正しく処理する（Case A 実装済み） | ✅ CONFIRMED |
| B-8 | 不可達の原因は SR データではなく DG traversal か | 分析 | SR データは正確。`deriveClauseCore` が fn=null をスキップ | ✅ CONFIRMED |

**判定: RENDERER TRAVERSAL LIMITATION — 確定。SR にデータあり、DG traversal が fn=null 経路をスキップ。**

---

## テスト項目 C — Participial Attachment Target

### C-1. 副詞的分詞

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| C-1-1 | SR が副詞的分詞の機能を明示するか | 調査 | `clause fn=ADVERBIAL` に分詞 PREDICATE → 明示 | ✅ CONFIRMED |
| C-1-2 | 副詞的機能の明示方法 | 確認 | `clause fn=ADVERBIAL` construction (1,636件) | ✅ CONFIRMED |
| C-1-3 | 付着先（修飾先）の明示ポインタが SR にあるか | 調査 | なし。tree 包含で暗示（同一 parent clause の PREDICATE） | ⚠️ PARTIAL |
| C-1-4 | DG が副詞的分詞を正しく描画しているか | 確認 | L-bracket + `分詞節` ラベル（P5-D 実装済み） | ✅ CONFIRMED |

### C-2. 形容詞的分詞

| # | 検証項目 | 期待値 | 実測値 | 結果 |
|---|---|---|---|---|
| C-2-1 | SR が形容詞的分詞の名詞付着を明示するか | 調査 | `phrase.np cn=ADJ_MOD` construction が明示（NT 全書 138件） | ✅ CONFIRMED |
| C-2-2 | ADJ_MOD 内の head 名詞 vs 分詞の分離が SR で判定可能か | 確認 | 可能（非 clause 最初の子 = head 名詞; clause 子 = 形容詞的分詞節） | ✅ CONFIRMED |
| C-2-3 | P5-gate 章の ADJ_MOD 分詞が DG 可達か | 確認 | 可達（JHN 1:6 `ἀπεσταλμένος` fn=SUBJECT, EPH 2:4 `ὑπερβάλλον`） | ✅ CONFIRMED |
| C-2-4 | `extractSlotModifiers` が ADJ_MOD を処理するか | コード確認 | 処理しない（Case A/B/C のみ、ADJ_MOD は未対応） | ❌ ABSENT |
| C-2-5 | JHN 1:6 `ἀπεσταλμένος` が現在の DG に分離表示されるか | ブラウザ確認 | 分離表示されない（全テキスト一括: `ἄνθρωπος ἀπεσταλμένος παρὰ θεοῦ,`） | ❌ ABSENT |
| C-2-6 | ADJ_MOD 処理の追加で L-0 違反が発生するか | 分析 | 発生しない（SR の ADJ_MOD construction が explicit に名詞付着を示す） | ✅ CONFIRMED |

**判定 C-1: SR 充足 + DG 実装済み。付着先は tree 包含で暗示（明示ポインタなし）。**  
**判定 C-2: SR 充足（ADJ_MOD 明示）、DG 可達。`extractSlotModifiers` が未対応 → RENDERER COVERAGE GAP**

---

## テスト項目 D — 回帰テスト

| スイート | PASS | FAIL |
|---|---|---|
| `test:re-phase1` | 217 | 0 |
| `test:re-phase2` | 78 | 0 |
| `test:re-stageB` | 47 | 0 |
| `test:flow-dom` | 62 | 0 |
| **合計** | **404** | **0** |

---

## 総合サマリー

| 制約 | SR データ | DG 到達 | DG 実装 | 分類 |
|---|---|---|---|---|
| 関係詞先行詞コネクタ | ❌ なし | N/A | N/A | **SR SCHEMA GAP** |
| PP 内 GENITIVE_MOD (P5-gate) | ✅ あり | ❌ 不可達 | 未実装 | **RENDERER TRAVERSAL LIMITATION** |
| 形容詞的分詞 名詞付着 | ✅ あり | ✅ 可達 | 未実装 | **RENDERER COVERAGE GAP** |
| 副詞的分詞 節付着 | ✅ あり | ✅ 可達 | ✅ 済み | IMPLEMENTED (P5-D) |

| カテゴリ | 件数 | 行動 |
|---|---|---|
| SR SCHEMA GAP | A (1) | SR schema 変更なしに実装不可。P6 以降 |
| RENDERER TRAVERSAL LIMITATION | B (1) | fn=null 節の traversal 設計が必要。P5-E 候補（要設計判断） |
| RENDERER COVERAGE GAP | C-2 (1) | `extractSlotModifiers` Case D 追加。P5-E 候補（影響小） |
| IMPLEMENTED | C-1 (1) | P5-D 完了 |

---

*詳細: P5-D.1_sr_coverage_boundary.md / P5-D.1_final_report.md*
