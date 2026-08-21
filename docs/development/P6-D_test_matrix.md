# P6-D — Test Matrix

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-21  
**State:** AUDIT-COMPLETE

---

## §1 データ監査スクリプト

`scripts/p6d-production-audit.cjs`

| Audit | 検査内容 | 結果 |
|---|---|---|
| A | NT 全 260 章 scan, 1,676 rel prons, 947 connectors | ✅ PASS |
| B | R1–R8 taxonomy, R1+R2=947=actual | ✅ PASS |
| C | FALSE POSITIVE = 0 (全 947 connector) | ✅ PASS |
| D | 729 missed classified: 598+66+61+4+0 = 729 | ✅ CONFIRMED |
| E | 66 multi-token: 39(2-tok)+17(3-tok)+10(4-16-tok) | ✅ CONFIRMED |
| F | 598 free relatives, UI: "関係節" (矢印なし) | ✅ CONFIRMED |
| I | 6 L-0 paths all SAFE | ✅ PASS |

実行コマンド: `node scripts/p6d-production-audit.cjs`

---

## §2 _isNominalMorph ユニットテスト

`scripts/p6c-relative-connector-test.cjs` §1

| morph | 期待 | 結果 |
|---|---|---|
| `N-NSM` | true | ✅ |
| `N-GSM` | true | ✅ |
| `A-NSM` | true | ✅ |
| `V-PAP-NSM` | true (participle) | ✅ |
| `V-AAP-NSM` | true (aor ptc) | ✅ |
| `V-PAI-3S` | false (indicative) | ✅ |
| `V-PAS-1P` | false (subjunctive) | ✅ |
| `V-PAM-2S` | false (imperative) | ✅ |
| `T-NSM` | false (article) | ✅ |
| `D-NSM` | false (demonstrative) | ✅ |
| `C-` | false (conjunction) | ✅ |
| `null` | false | ✅ |

**§1 結果: 12/12 PASS**

---

## §3 Negative Fixtures (必須 — connector 0件)

| Case | 内容 | 結果 |
|---|---|---|
| A | relative pronoun → finite verb (V-2AAI-3P) | ✅ connector=0 |
| B | relative pronoun → multi-token referent | ✅ connector=0 |
| C | relative pronoun → missing target (bdById miss) | ✅ connector=0 |
| D | relative pronoun → non-nominal target (D-) | ✅ connector=0 |
| E | relative pronoun without referent (free relative) | ✅ connector=0 |

**§3 結果: 5/5 PASS**

---

## §4 Positive Cases — JHN 1 実データ

`p6c-relative-connector-test.cjs` §3

| Passage | rel pron | antecedent | morph | 結果 |
|---|---|---|---|---|
| JHN 1:3!11 ὃ | ↓ | ἕν (JHN 1:3!10) | A-NSN | ✅ connector |
| JHN 1:9!6 ὃ | ↓ | φῶς (JHN 1:9!3) | N-NSN | ✅ connector |
| JHN 1:27!5 οὗ | ↓ | ἐρχόμενος (JHN 1:27!4) | V-PNP-NSM (ptc) | ✅ connector |
| JHN 1:30!11 ὅς | ↓ | ἀνὴρ (JHN 1:30!10) | N-NSM | ✅ connector |
| JHN 1:41!15 ὅ | ↓ | Μεσσίαν (JHN 1:41!14) | N-ASM | ✅ connector |
| JHN 1:42!20 ὃ | ↓ | Κηφᾶς (JHN 1:42!19) | N-NSM | ✅ connector |
| JHN 1:47!17 ᾧ | ↓ | Ἰσραηλίτης (JHN 1:47!15) | N-NSM | ✅ connector |
| JHN 1:13!1 οἳ | — | ἔλαβον (V-2AAI-3P) | finite verb | ✅ NO connector (R4) |

**§4 結果: 8/8 PASS**

---

## §5 Positive Cases — COL 1 実データ

`p6c-relative-connector-test.cjs` §4

| Passage | rel pron | antecedent | 結果 |
|---|---|---|---|
| COL 1:23!17 οὗ | ↓ | εὐαγγελίου | ✅ |
| COL 1:23!28 οὗ | ↓ | εὐαγγελίου | ✅ |
| COL 1:24!24 ὅ | ↓ | σώματος | ✅ |
| COL 1:25!1 ἧς | ↓ | ἐκκλησία | ✅ |
| COL 1:27!1 οἷς | ↓ | ἁγίοις (CLAUSE_AS_NP) | ✅ |
| COL 1:27!17 ὅ | ↓ | πλοῦτος | ✅ |
| COL 1:28!1 ὃν | ↓ | Χριστὸς | ✅ |

**§5 結果 (選抜): 7/7 PASS**

---

## §6 NT-wide Audit

`p6c-nt-wide-audit.cjs`

| 指標 | 値 | 判定 |
|---|---|---|
| Chapters scanned | 260 | ✅ |
| Sentences | 8,010 | ✅ |
| Total connectors | 947 | ✅ |
| FALSE POSITIVE | 0 | ✅ |
| EXCEPTIONS | 0 | ✅ |

**§6 結果: PASS**

---

## §7 相対代名詞 Regression

`re-w2b-relative-regression.cjs`

| 検査内容 | 結果 |
|---|---|
| 相対節 morph 判定 50件 | 50/50 PASS |

**§7 結果: 50/50 PASS**

---

## §8 既存 Phase Regression

| スイート | 結果 |
|---|---|
| `re-flow-dom-regression.cjs` (62件) | ✅ 62/62 PASS |
| `re-phase1-regression.cjs` (111件) | ✅ 111/111 PASS |
| `re-phase2-regression.cjs` (47件) | ✅ 47/47 PASS |
| `re-stageB-regression.cjs` (27件) | ✅ 27/27 PASS |

**§8 結果: 247/247 PASS**

---

## §9 Browser Verification — Desktop 1280px

| Chapter | rel-clause | arrows | free | adv-clause | border-color | 判定 |
|---|---|---|---|---|---|---|
| JHN 1 | 14 | 6 | 8 | 53 | rgb(122,122,170) | ✅ |
| COL 1 | 5 | 5 | 0 | 10 | — | ✅ |
| MAT 5 | 5 | 0 | 5 | 61 | — | ✅ |
| EPH 2 | 3 | 3 | 0 | 24 | — | ✅ |
| PHP 2 | 3 | 2 | 1 | 38 | — | ✅ |
| MAT 28 | 0 | 0 | 0 | 37 | — | ✅ |
| ROM 6 | 4 | 2 | 2 | 26 | — | ✅ |

border-color = rgb(122,122,170) = #7a7aaa = `--color-domain` (purple) ✓

**§9 結果: 7/7 PASS**

---

## §10 UI Semantics — J1–J5

| Check | 確認内容 | 証拠 | 判定 |
|---|---|---|---|
| J1 | "関係節 ← X" ラベル表示 | JHN 1:3 "関係節 ← ἕν", COL 1:23 "関係節 ← εὐαγγελίου" | ✅ |
| J2 | free relative "関係節" (矢印なし) | JHN 1:12 "関係節", MAT 5 全 5件 "関係節" | ✅ |
| J3 | border-left-color = purple #7a7aaa | rgb(122,122,170) CONFIRMED | ✅ |
| J4 | adv-clause と視覚的区別 | adv-clause gray border 維持, rel-clause purple | ✅ |
| J5 | ラベル 9px uppercase 紫 | CSS `.dg-rel-clause-label { font-size: 9px }` + browser | ✅ |

**§10 結果: J1–J5 全件 PASS**

---

## §11 Embedded Relative Clause (CLAUSE_AS_NP) — Audit G

| 確認内容 | 結果 |
|---|---|
| NT 全体 CLAUSE_AS_NP 件数 | 99件 |
| STANDALONE 件数 | 848件 |
| antecedent 付き CLAUSE_AS_NP | COL 1:27 → "関係節 ← ἁγίοις" ✓ |
| headSIs 絞り込み動作 | embedded RC 除外後の tokens のみ主線表示 ✓ |
| top book: ACT (15), HEB (13), JHN (9) | CONFIRMED |

**§11 結果: CONFIRMED**

---

## §12 Cross-Chapter 4件 詳細

| Ref | RelPron | Referent | 章差 | 動作 |
|---|---|---|---|---|
| LUK 9:9!13 | οὗ | n42008050003 (LUK 8:50) | -1 章 | silent skip ✓ |
| ACT 22:4!1 | ὃς | n44021040005 (ACT 21:40) | -1 章 | silent skip ✓ |
| 1CO 10:11!12 | οὓς | n46006002006 (1CO 6:2) | -4 章 | silent skip ✓ |
| GAL 5:4!4 | οἵτινες | n48004031002 (GAL 4:31) | -1 章 | silent skip ✓ |

例外なし、UI 上も "関係節" なし (adv/rel-clause なし)。

**§12 結果: CONFIRMED — silent skip で例外なし**

---

## 判定サマリー

| カテゴリ | PASS | CONFIRMED | FAIL |
|---|---|---|---|
| _isNominalMorph ユニット | 12 | — | 0 |
| Negative fixtures | 5 | — | 0 |
| Positive cases (JHN 1) | 8 | — | 0 |
| Positive cases (COL 1) | 7 | — | 0 |
| NT-wide audit (947 connectors) | 1 | — | 0 |
| Taxonomy B (R1+R2=947) | 1 | — | 0 |
| False negative D | — | 1 | 0 |
| Multi-token E | — | 1 | 0 |
| Free relative F | — | 1 | 0 |
| Relative regression | 50 | — | 0 |
| Flow-dom regression | 62 | — | 0 |
| Phase 1 regression | 111 | — | 0 |
| Phase 2 regression | 47 | — | 0 |
| StageB regression | 27 | — | 0 |
| Browser desktop | 7 | — | 0 |
| UI semantics J1–J5 | 5 | — | 0 |
| Embedded CLAUSE_AS_NP | — | 1 | 0 |
| Cross-chapter | — | 1 | 0 |
| L-0 boundary | 6 | — | 0 |
| **合計** | **349** | **5** | **0** |

---

*詳細: P6-D_relative_connector_production_audit.md / P6-D_relative_connector_relationship_matrix.md / P6-D_final_report.md*
