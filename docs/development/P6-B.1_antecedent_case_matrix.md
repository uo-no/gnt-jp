# P6-B.1 Antecedent Source Audit — Case Matrix

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE (READ-ONLY)

---

## Evidence Level Scale

| Symbol | 意味 |
|---|---|
| ✅ CONFIRMED | 実データ・実コードから確認済み |
| ⚠️ PARTIAL | 部分的に確認 / 解釈が必要 |
| ❌ COUNTER | Counterexample — syntactic antecedent ではない |
| 🔵 INFERRED | 構造から推定 |

---

## Part 1: Standard Cases (Syntactic Antecedent — Noun)

Subject / Object / Prepositional relative clause で先行詞が明示的名詞のケース。

| # | Passage | relative text | morph | referent | target text | target morph | same-verse | L-0 safe | connector |
|---|---|---|---|---|---|---|---|---|---|
| 1 | JHN 1:9!6 | ὃ | R-NSN | n43001009003 | φῶς | N-NSN | ✅ | ✅ | 可 |
| 2 | JHN 1:30!11 | ὃς | R-NSM | n43001030010 | ἀνὴρ | N-NSM | ✅ | ✅ | 可 |
| 3 | JHN 1:47!17 | ᾧ | R-DSM | n43001047015 | Ἰσραηλίτης | N-NSM | ✅ | ✅ | 可 |
| 4 | MAT 5:3!7 | αὐτῶν | — | — | — | — | — | — | — |
| 5 | COL 1:16!1 | ὅτι | — | — | — | — | — | — | — |

**Subject relative (cross-verse):**

| # | Passage | relative text | morph | referent | target text | target morph | cross-verse | L-0 safe |
|---|---|---|---|---|---|---|---|---|
| 6 | COL 1:15!1 | ὅς | R-NSM | n51001013015 | υἱοῦ | N-GSM | ✅ 2 verses | ✅ |
| 7 | 1CO 1:8!1 | ὃς | R-NSM | n46001007012 | κυρίου | N-GSM | ✅ 1 verse | ✅ |
| 8 | 1PE 1:8!1 | ὃν | R-ASM | n60001007024 | Ἰησοῦ | N-GSM | ✅ 1 verse | ✅ |
| 9 | 1PE 2:4!2 | ὃν | R-ASM | n60002003006 | κύριος | N-NSM | ✅ 1 verse | ✅ |
| 10 | 1PE 1:12!1 | οἷς | R-DPM | n60001010007 | προφῆται | N-NPM | ✅ 2 verses | ✅ |

---

## Part 2: Nominal Adjective / Participle Antecedent

先行詞が形容詞的 / 分詞的に使われる名詞的用法のケース。syntactic antecedent として適切。

| # | Passage | relative text | morph | referent | target text | target morph | category | L-0 safe |
|---|---|---|---|---|---|---|---|---|
| 11 | JHN 1:3!11 | ὃ | R-NSN | n43001003010 | ἕν | **A-NSN** | 数詞/形容詞 (名詞的) | ✅ |
| 12 | JHN 1:27!5 | οὗ | R-GSM | n43001027004 | ἐρχόμενος | **V-PNP-NSM** | 名詞的分詞 | ✅ |
| 13 | 1CO 3:11!10 | ὅς | R-NSM | n46003011009 | κείμενον | **V-PNP-ASM** | 名詞的分詞 "the one laid" | ✅ |
| 14 | 1TH 5:24!5 | ὃς | R-NSM | n52005024003 | καλῶν | **V-PAP-NSM** | 名詞的分詞 "the one calling" | ✅ |
| 15 | 1PE 2:8!7 | οἳ | R-NPM | n60002007007 | ἀπιστοῦσιν | **V-PAP-DPM** | 名詞的分詞 "those not believing" | ✅ |

**解説:** 分詞が名詞的に機能するケース (substantival participle) は syntactic antecedent として有効。MACULA は名詞の代わりに分詞を参照先とするが、これは構造的に正当。

---

## Part 3: Finite Verb Referent (Event Reference) ← COUNTEREXAMPLES

`referent` が **finite verb** を指す 14 件の事例。これらは syntactic antecedent ではなく discourse event reference。

| # | Passage | relative text | morph | target text | target morph | event interpretation | L-0 safe |
|---|---|---|---|---|---|---|---|
| 16 | ROM 6:16!12 | ᾧ (R-DSN) | — | παριστάνετε | **V-PAI-2P** | "to whomever you present yourselves" — 動作の対象が参照先 | ❌ |
| 17 | JHN 1:13!1 | οἳ (R-NPM) | — | ἔλαβον | **V-2AAI-3P** | entity anchor: "those who received" の受け手グループを動詞で代表 | ❌ |
| 18 | GAL 2:10!6 | ὃ (R-ASN) | — | μνημονεύωμεν | **V-PAS-1P** | "which we should remember" — 記憶行為が参照先 | ❌ |
| 19 | EPH 3:4!2 | ὃ (R-ASN) | — | προέγραψα | **V-AAI-1S** | "which I wrote before" — 文書行為 (cross-verse) | ❌ |
| 20 | 1PE 2:8!13 | ὃ (R-ASN) | — | προσκόπτουσιν | **V-PAI-3P** | "to which they stumble" — つまずき事象が参照先 | ❌ |
| 21 | ACT 3:15!13 | οὗ (R-GSM) | — | ἤγειρεν | **V-AAI-3S** | "of whom God raised" — 復活事象が参照先 | ❌ |
| 22 | ACT 11:30!1 | ὃ (R-ASN) | — | ὥρισαν | **V-AAI-3P** | "which they determined" — 決定事象 | ❌ |
| 23 | COL 1:29!2 | ὃ (R-ASN) | — | παραστήσωμεν | **V-AAS-1P** | "which [purpose] we present" — 目的行為 | ❌ |
| 24 | LUK 6:3!11 | ὃ (R-ASN) | — | εἰσῆλθεν | **V-2AAI-3S** | "which he entered" — 入場事象 | ❌ |
| 25 | LUK 18:30!1 | ὃς (R-NSM) | — | ἀφῆκεν | **V-AAI-3S** | "who left" — 行為が参照先 | ❌ |
| 26 | ROM 9:6!2 | οἷον (R-ASN) | — | ἐκπέπτωκεν | **V-RAI-3S** | "such as has fallen" — 状態が参照先 | ❌ |
| 27 | PHP 4:10!15 | ᾧ (R-DSN) | — | φρονεῖν | **V-PAN** | "for which to care" — infinitive (gray area) | ⚠️ |
| 28 | ACT 26:10!1 | ὃ (R-ASN) | — | πρᾶξαι | **V-AAN** | "which to do" — infinitive | ⚠️ |
| 29 | ACT 9:6!11 | ὅ (R-ASN) | — | ποιεῖν | **V-PAN** | "what to do" — infinitive | ⚠️ |

**Summary:**
- 純粋な finite indicative/subjunctive: ~10 件 → ❌ event reference ≠ syntactic antecedent
- Infinitive (gray area): ~4 件 → ⚠️ 動詞的名詞と解釈可能な場合あり

---

## Part 4: Multiple Antecedent Cases (66件 space-separated)

`referent` フィールドが space-separated 複数 nodeId を含む事例。

| # | Passage | relative text | referent (all) | # targets | note |
|---|---|---|---|---|---|
| 30 | 1CO 15:3!6 | ὃ | n46015003011 n46015004003 n46015004006 n46015005003 | 4 | v.3-5 の事実 (死・葬・復活・顕現) を参照 |
| 31 | 1PE 1:12!10 | ἃ | n60001011017 n60001011022 | 2 | 2 つの事実を参照 |
| 32 | 1PE 4:4!2 | ᾧ | n60004003013 ... n60004003020 | 6 | 6 tokens span |
| 33 | 1TI 1:4!7 | αἵτινες | n54001004003 n54001004005 | 2 | — |
| 34 | 1TI 6:9!16 | αἵτινες | n54006009007 n54006009009 n54006009011 | 3 | — |
| 35 | ROM 16:4!1 | οἵτινες | n45016003002 n45016003004 | 2 | Πρίσκαν + Ἀκύλαν (例: P6-B確認済み) |

**合計: 66件 (6.1%)** — `referentTokenId` (string) として格納した場合、space-separated 文字列となる。フィールド設計上 `string | null` では対応不可。

---

## Part 5: Demonstrative Pronoun Referent (9件 = coreference chain)

| # | Passage | relative text | target text | target morph | note |
|---|---|---|---|---|---|
| 36 | MRK 4:16!10 | οἳ | οὗτοί | D-NPM | demo pronoun が真の先行詞を指す chain |
| 37 | JHN 10:35!6 | οὓς | ἐκείνους | D-APM | chain |
| 38 | ACT 21:23!4 | ὅ | τοῦτο | D-ASN | chain |
| 39 | MRK 4:20!11 | οἵτινες | ἐκεῖνοί | D-NPM | chain |
| 40 | HEB 6:7!17 | οὓς | ἐκείνοις | D-DPM | chain |

---

## Part 6: Article Referent (6件 = substantival head)

| # | Passage | relative text | target text | target morph | note |
|---|---|---|---|---|---|
| 41 | LUK 8:13!19 | οἳ | οἱ | T-NPM | article が substantival phrase の head |
| 42 | ROM 2:29!14 | οὗ | ὁ | T-NSM | article (DG では head noun 不在) |
| 43 | 1JN 4:3!20 | ὃ | τὸ | T-NSN | — |
| 44 | HEB 12:26!1 | οὗ | τὸν | T-ASM | cross-verse |
| 45 | ACT 2:39!15 | ὅσους | τοῖς | T-DPM | — |

---

## Part 7: NT Corpus Distribution Summary

### By referent target morph category

| Category | Count | % of with-referent | Syntactic antecedent? |
|---|---|---|---|
| Noun (N-*) | 840 | 77.9% | ✅ YES |
| Adjective nominal (A-*) | 74 | 6.9% | ✅ YES (nominal use) |
| Participle (V-*P-*) | 39 | 3.6% | ✅ MOSTLY (nominal ptc) |
| **Finite verb (V-*I-*/S-*/M-*)** | **~10** | **~0.9%** | **❌ NO (event ref)** |
| Infinitive (V-*N) | ~4 | ~0.4% | ⚠️ GRAY |
| Pronoun / demonstrative (D-*/P-*) | 9 | 0.8% | ⚠️ CHAIN |
| Article (T-*) | 6 | 0.6% | ⚠️ SUBSTANTIVAL HEAD |
| Other (X-*, I-*, CONJ, etc.) | ~30 | ~2.8% | ⚠️ MIXED |
| Space-separated (multiple) | 66 | 6.1% | ✅ YES (but multi-token) |
| **Total with referent** | **1,078** | **100%** | |

### By usability for DG connector rendering

| Usability | Count | % |
|---|---|---|
| ✅ Safe for connector | ~914 (N-*+A-*+V-*P-*) | ~84.8% |
| ⚠️ Requires special handling | ~75 (art+demo+other+multi) | ~7.0% |
| ❌ NOT syntactic antecedent | ~14 (finite verb) + 66 (multi) | ~7.4% |
| ❌ Space-separated (multi field) | 66 | 6.1% |

---

## Part 8: Cross-Verse Analysis

| Category | Count | % |
|---|---|---|
| Total with referent | 1,078 | — |
| Cross-verse referent | 227 | 21.1% |
| Cross-verse + noun target | ~190 | ~17.6% |
| Cross-verse + verb target | ~14 | ~1.3% |

Cross-verse noun antecedents は syntactically legitimate (relative clause が verse boundary をまたぐ構文は正常)。ただし SR builder が cross-chapter 参照を解決できる保証が別途必要。

---

## Case Matrix Summary

| Pattern | # Cases | Syntactic Antecedent? | DG Connector | L-0 Status |
|---|---|---|---|---|
| Noun same-verse | Many | ✅ | 可 | SAFE |
| Noun cross-verse | 190+ | ✅ | 可 (要 cross-chapter 解決) | SAFE |
| Nominal participle | ~39 | ✅ mostly | 可 | SAFE |
| Nominal adjective | 74 | ✅ | 可 | SAFE |
| **Finite verb** | **~10** | **❌** | **不可** | **UNSAFE** |
| Infinitive | ~4 | ⚠️ | gray | BORDERLINE |
| **Multiple (space-sep)** | **66** | ✅ but multi | **特別処理要** | **FIELD MISMATCH** |
| Demonstrative chain | 9 | ⚠️ | chain | BORDERLINE |
| Article head | 6 | ⚠️ | alt | BORDERLINE |

---

*詳細: P6-B.1_antecedent_source_audit.md / P6-B.1_test_matrix.md / P6-B.1_final_report.md*
