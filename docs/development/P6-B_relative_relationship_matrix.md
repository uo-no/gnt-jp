# P6-B Relative Clause / Antecedent — Relationship Matrix

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE (READ-ONLY)

---

## Grade Scale

| Grade | 意味 |
|---|---|
| A | Explicitly represented (現在またはスキーマ拡張後に直接取得可能) |
| B | Indirectly represented (tree / morph / position から推定可能) |
| C | Inference required (L-0 境界に抵触) |
| D | Not represented (SR / bible_data に情報なし) |
| A* | schema extension 後に A になる (現在 D/B → 拡張後 A) |

---

## 1. Relative Clause 識別

| Relationship | SR Evidence (現在) | Grade 現在 | Grade 拡張後 | DG 利用可能? | Schema gap? |
|---|---|---|---|---|---|
| Relative pronoun token の識別 | `morphCategory: ['relative_pronoun']` (全 1,676 件) | A | A | Yes | No |
| Relative pronoun の節内機能 | `function.canonical` (SUBJECT/OBJECT/etc.) | A | A | Yes | No |
| 関係節 construction type | `RELATIVE_CLAUSE` construction 不在 | D | A* (Option D) | No → Yes | **GAP → removable** |
| 関係節 clause の識別 | morphCategory 経由で親 clause を探索 | B | B (または A* で Option D) | Partial | SOFT GAP |

---

## 2. Antecedent / Head Noun 関係

| Relationship | SR Evidence (現在) | Grade 現在 | Grade 拡張後 | DG 利用可能? | Schema gap? |
|---|---|---|---|---|---|
| Antecedent explicit link (token level) | `evidence.antecedentTokenId` 不在 | D | A* (Option E) | No → Yes | **GAP → removable** |
| MACULA 注釈 (bible_data.referent) | bible_data に存在 (1,078/1,676 = 64.3%) | D (SR未転写) | A* (転写後) | No → Yes | **GAP → removable by transfer** |
| CLAUSE_AS_NP 内の head noun (構造的) | CLAUSE_AS_NP sibling として識別可能 | B | B | Partial | SOFT GAP |
| Free relative (antecedent なし) | referent 欠落 = null で保持 | A (null保持) | A | Yes (null) | No |
| Unresolved antecedent | bible_data.referent 欠落 = null | A (null保持) | A | Yes (null) | No |

---

## 3. Relative Pronoun の節内構造

| Relationship | SR Evidence | Grade | DG 利用可能? | Schema gap? |
|---|---|---|---|---|
| Relative pronoun が SUBJECT | `fn=SUBJECT` on token | A | Yes | No |
| Relative pronoun が OBJECT | `fn=OBJECT` on token | A | Yes | No |
| Relative pronoun が INDIRECT_OBJECT | `fn=INDIRECT_OBJECT` on token | A | Yes | No |
| Relative pronoun が ADVERBIAL | `fn=ADVERBIAL` on token | A | Yes | No |
| Relative pronoun が COMPLEMENT | `fn=COMPLEMENT` on token | A | Yes | No |
| Relative pronoun が PREP の目的語 | fn=null (PREP_PHRASE 内) | B | Partial | SOFT GAP |
| 節内での複数述語 (ὃς...ὃς) | 各 relative pronoun が独立に fn を持つ | A | Yes | No |

---

## 4. 関係節の統語的付着

| Relationship | SR Evidence | Grade | DG 利用可能? | Schema gap? |
|---|---|---|---|---|
| Governing clause (親 clause) | tree containment → parent node | A | Yes | No |
| 関係節の機能 in governing (fn=ADVERBIAL) | fn=ADVERBIAL on enclosing clause | A | Yes | No |
| 関係節の機能 in governing (fn=SUBJECT) | fn=SUBJECT on enclosing clause (free rel) | A | Yes | No |
| 関係節の機能 in governing (fn=OBJECT) | fn=OBJECT on enclosing clause (free rel) | A | Yes | No |
| Head NP への connector (R-K/Leedy 用) | 現在なし → antecedentTokenId 後 | D | No → A* | **GAP → removable** |
| Attachment type (restrictive vs. non-restrictive) | SR に明示なし | C | No (L-0 BLOCKED) | GAP (C-level) |

---

## 5. 複合・複雑 Relative 構造

| Relationship | SR Evidence | Grade | DG 利用可能? | Schema gap? |
|---|---|---|---|---|
| 前置詞に支配される関係詞 (ἐν ᾧ 等) | PREP_PHRASE + morphCategory で識別 | B | Partial | SOFT GAP |
| Nested relative clause (関係節の中の関係節) | morphCategory で各レイヤー識別; antecedentTokenId で各々の先行詞 | B → A* | Partial → Yes (拡張後) | SOFT GAP |
| 複数 token antecedent (space-separated referent) | bible_data.referent に複数 ID | B | Partial | SOFT GAP |
| Attraction (格の引き付け) | morph + semantic 分析が必要 | C | No (L-0 BLOCKED) | C-level GAP |
| Free relative (先行詞 NP なし) | null/absent で保持 | A | Yes (null) | No |
| 関係節が節全体を修飾 (pseudo-relative) | fn=ADVERBIAL + context | B | Partial | SOFT GAP |

---

## 6. L-0 境界マップ

| 情報 | L-0 Status | 代替取得方法 |
|---|---|---|
| 関係代名詞の識別 | PERMITTED (morphology) | morphCategory |
| Syntactic head token | PERMITTED (MACULA 注釈の転写) | bible_data.referent → antecedentTokenId |
| Free relative の認識 | PERMITTED (null で表現) | antecedentTokenId = null |
| Discourse referent の同定 | **BLOCKED** | N/A |
| Restrictive 判定 | **BLOCKED** | N/A |
| Antecedent の semantic 同定 | **BLOCKED** | N/A |
| Coreference chain | **BLOCKED** | N/A |

---

## 7. Schema Extension Coverage Matrix

| Pattern | 件数 | 現在 Grade | 拡張後 Grade |
|---|---|---|---|
| 関係代名詞 (morphCategory あり) | 1,676 | A | A |
| antecedentTokenId (bible_data.referent あり) | 1,078 | D | A* |
| antecedentTokenId (bible_data.referent なし) | 598 | D | A* (null) |
| CLAUSE_AS_NP 内 head noun (構造的) | 527 | B | B (または A* + Option D) |
| 関係節 construction type (RELATIVE_CLAUSE) | 1,676+ | D | A* (Option D 採用時) |
| 前置詞経由の関係詞 | 204 | B | B |
| 入れ子関係節 | 少数 | B | B → A* (各々 antecedentTokenId 付与で) |

---

## 8. Option 別 Coverage Summary

| Option | 追加変更数 | 解決 HARD GAP | 解決 SOFT GAP | L-0 RISK |
|---|---|---|---|---|
| A: RELATIVE_CLAUSE cn のみ | 1 (new cn value) | 部分 (cn識別のみ) | CLAUSE_AS_NP + connector は別途必要 | None |
| B: evidence.antecedentTokenId | 1 (new evidence field) | YES (antecedent link) | connector 描画可能 | None |
| C: relations array | 大規模 | YES | YES | None |
| D: RELATIVE_CLAUSE + relative{} | 2 (new cn + new object) | YES | YES | None |
| **E: evidence.antecedentTokenId のみ (Recommended)** | **1 (new evidence field)** | **YES (antecedent link)** | **connector 描画可能** | **None** |
| D+E: RELATIVE_CLAUSE + evidence.antecedentTokenId | 2 | YES (complete) | YES | None |

---

## 9. DG Renderer 利用可能性 (拡張後想定)

| DG Feature | 拡張後 Grade | 条件 |
|---|---|---|
| 関係節を relative clause として識別 | A | morphCategory: ['relative_pronoun'] (既存) |
| 相対節の connector 描画 | A* | evidence.antecedentTokenId が non-null |
| Free relative の無 connector 描画 | A | antecedentTokenId = null |
| Antecedent token の主線上の位置 | A* | surfaceIndex from antecedentTokenId |
| Relative pronoun の節内役割表示 | A | fn label (既存) |
| 前置詞支配関係詞の PP ライン | B | PREP_PHRASE + morphCategory |

---

*詳細: P6-B_relative_clause_schema_audit.md / P6-B_test_matrix.md / P6-B_final_report.md*
