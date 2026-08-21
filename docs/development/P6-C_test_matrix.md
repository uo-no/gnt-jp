# P6-C — Relative-Clause Connector Test Matrix

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** IMPLEMENTED · TESTED · BROWSER-VERIFIED

---

## §1 _isNominalMorph ユニットテスト

| morph | 期待 | 結果 |
|---|---|---|
| `N-NSM` | true (noun) | ✅ PASS |
| `N-GSM` | true (noun genitive) | ✅ PASS |
| `A-NSM` | true (adjective) | ✅ PASS |
| `V-PAP-NSM` | true (participle active present) | ✅ PASS |
| `V-AAP-NSM` | true (participle aorist) | ✅ PASS |
| `V-PAI-3S` | false (R4 finite indicative) | ✅ PASS |
| `V-PAS-1P` | false (R4 finite subjunctive) | ✅ PASS |
| `V-PAM-2S` | false (R4 finite imperative) | ✅ PASS |
| `T-NSM` | false (article) | ✅ PASS |
| `D-NSM` | false (demonstrative) | ✅ PASS |
| `C-` | false (conjunction) | ✅ PASS |
| `null` | false | ✅ PASS |

---

## §2 Negative Fixtures (MANDATORY — connector 0件)

| Case | 内容 | 結果 |
|---|---|---|
| A | relative pronoun → finite verb (V-2AAI-3P) | ✅ PASS (0件) |
| B | relative pronoun → multi-token referent (space in ID) | ✅ PASS (0件) |
| C | relative pronoun → missing target (bdById miss) | ✅ PASS (0件) |
| D | relative pronoun → non-nominal target (D- adverb) | ✅ PASS (0件) |
| E | relative pronoun without referent (free relative) | ✅ PASS (0件) |

---

## §3 Positive Cases — JHN 1 実データ

| Passage | rel pron | antecedent | morph | 結果 |
|---|---|---|---|---|
| JHN 1:3!11 ὃ | ↓ | ἕν (JHN 1:3!10) | A-NSN | ✅ connector |
| JHN 1:9!6 ὃ | ↓ | φῶς (JHN 1:9!3) | N-NSN | ✅ connector |
| JHN 1:27!5 οὗ | ↓ | ἐρχόμενος (JHN 1:27!4) | V-PNP-NSM (participle) | ✅ connector |
| JHN 1:30!11 ὅς | ↓ | ἀνὴρ (JHN 1:30!10) | N-NSM | ✅ connector |
| JHN 1:41!15 ὅ | ↓ | Μεσσίαν (JHN 1:41!14) | N-ASM | ✅ connector |
| JHN 1:42!20 ὃ | ↓ | Κηφᾶς (JHN 1:42!19) | N-NSM | ✅ connector |
| JHN 1:47!17 ᾧ | ↓ | Ἰσραηλίτης (JHN 1:47!15) | N-NSM | ✅ connector |
| JHN 1:13!1 οἳ | — | ἔλαβον (V-2AAI-3P) | finite verb | ✅ NO connector (R4) |

JHN 1 total: **7 connectors** ✅

---

## §4 Positive Cases — COL 1 実データ

| Passage | rel pron | antecedent | 結果 |
|---|---|---|---|
| COL 1:4!11 ἣν | ↓ | ἀγάπην | ✅ connector |
| COL 1:5!10 ἣν | ↓ | ἐλπίδα | ✅ connector |
| COL 1:7!9 ὅς | ↓ | Ἐπαφρᾶ | ✅ connector |
| COL 1:13!1 ὃς | ↓ | πατρὶ | ✅ connector |
| COL 1:14!2 ᾧ | ↓ | υἱοῦ | ✅ connector |
| COL 1:15!1 ὅς | ↓ | υἱοῦ (cross-verse) | ✅ connector |
| COL 1:18!10 ὅς | ↓ | υἱοῦ (cross-verse) | ✅ connector |
| COL 1:23!17 οὗ | ↓ | εὐαγγελίου | ✅ connector |
| COL 1:23!28 οὗ | ↓ | εὐαγγελίου | ✅ connector |
| COL 1:24!24 ὅ | ↓ | σώματος | ✅ connector |
| COL 1:25!1 ἧς | ↓ | ἐκκλησία | ✅ connector |
| COL 1:27!1 οἷς | ↓ | ἁγίοις | ✅ connector |
| COL 1:27!17 ὅ | ↓ | πλοῦτος | ✅ connector |
| COL 1:28!1 ὃν | ↓ | Χριστὸς | ✅ connector |

COL 1 total: **14 connectors** ✅

---

## §5 Browser Verification — Desktop 1280px

| Chapter | dg-view | rel-clause | adv-clause | 判定 |
|---|---|---|---|---|
| JHN 1 | 57 | 14 | 53 | ✅ PASS |
| COL 1 | 9 | 5 | 10 | ✅ PASS |
| MAT 5 | 58 | 5 | 61 | ✅ PASS (regression OK) |
| MAT 28 | 23 | 0 | 37 | ✅ PASS (regression OK) |
| EPH 2 | 12 | 3 | 24 | ✅ PASS (regression OK) |
| PHP 2 | 18 | 3 | 38 | ✅ PASS (regression OK) |
| ROM 6 | 27 | 4 | 26 | ✅ PASS (new gate) |

---

## §6 Browser Verification — Mobile 390px

| Chapter | rel-clause | 判定 |
|---|---|---|
| JHN 1 | 14 | ✅ PASS |
| COL 1 | 5 | ✅ PASS |

---

## §7 Regression — 既存テストスイート

| テスト | 結果 |
|---|---|
| `re-w2b-relative-regression.cjs` (50件) | ✅ PASS: 50 FAIL: 0 |
| `p6c-relative-connector-test.cjs` (22件) | ✅ PASS: 22 FAIL: 0 |

---

## §8 ROM 6:10 特別確認

ROM 6:10 "ὃ γὰρ ἀπέθανεν, τῇ ἁμαρτίᾳ ἀπέθανεν ἐφάπαξ· ὃ δὲ ζῇ, ζῇ τῷ θεῷ."

- ὃ (JHN 6:10!1): referent → finite verb または null → `関係節` (antecedent なし) ✅
- 誤って finite verb への connector なし ✅

---

## 判定サマリー

| カテゴリ | PASS | FAIL |
|---|---|---|
| _isNominalMorph ユニット | 12 | 0 |
| Negative fixtures | 5 | 0 |
| Positive cases (JHN 1) | 8 | 0 |
| Positive cases (COL 1) | 1 | 0 |
| Browser desktop | 7 | 0 |
| Browser mobile | 2 | 0 |
| Regression | 2 | 0 |
| **合計** | **37** | **0** |

---

*詳細: P6-C_relative_connector_design.md / P6-C_nt_wide_audit.md / P6-C_final_report.md*
