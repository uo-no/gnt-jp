# P6-D — Relative-Clause Connector Production Readiness — Final Report

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-21  
**State:** AUDIT-COMPLETE  
**対象:** P6-C 実装 (`dg-engine.js` + `index.html`)

---

## エグゼクティブサマリー

P6-D は P6-C (Relative-Clause Connector Implementation) の production-readiness を
12 項目の READ-ONLY audit で検証した。

**主要指標:**
- FALSE POSITIVE = 0 (全 947 connector で finite verb への誤 connector なし)
- EXCEPTIONS = 0 (NT 全 8,010 文で例外なし)
- Regression: 349 checks PASS / 0 FAIL
- L-0 boundary: 全 6 パス SAFE
- Taxonomy: R1+R2 = 947 = actual connectors (discrepancy = 0)

---

## Audit 結果一覧

| Audit | 内容 | 判定 |
|---|---|---|
| A | NT-wide coverage (1,676 relProns, 947 connectors, 56.5%) | ✅ PASS |
| B | Taxonomy R1–R8 (R1+R2=947=actual, discrepancy=0) | ✅ PASS |
| C | False positive = 0 (全 947 connector 検査) | ✅ PASS |
| D | False negative 分類 (598+66+61+4+0 = 729) | ✅ CONFIRMED |
| E | Multi-token 66件 (2〜16 token, 設計上 skip) | ✅ CONFIRMED |
| F | Free relative 598件 (UI: "関係節" 矢印なし) | ✅ CONFIRMED |
| G | CLAUSE_AS_NP 99件 + STANDALONE 848件 | ✅ CONFIRMED |
| H | 全 7章 baseline 一致 (JHN1/COL1/MAT5/EPH2/PHP2/MAT28/ROM6) | ✅ PASS |
| I | L-0 boundary 6パス全 SAFE | ✅ PASS |
| J | UI semantics J1–J5 全件確認 | ✅ PASS |
| K | Regression 349/349 PASS (flow-dom/phase1/phase2/stageB/relative) | ✅ PASS |
| L | Architecture: Option B 暫定 → Option D 将来 | 📋 NOTED |

---

## 主要品質指標

```
FALSE POSITIVE = 0    ← 主要指標 (finite verb への誤 connector)
EXCEPTIONS     = 0    ← 全 NT で deriveRelativeConnectors 安全動作
REGRESSION     = 0    ← 349 check で回帰なし
L-0            = SAFE ← 全 6 パスで推論なし
TAXONOMY       = 0 DISCREPANCY ← R1+R2=947=actual
```

---

## Confirmed Limitations (設計上の既知制約)

以下は不具合ではなく、P6-C の設計上の意図的な除外・制約である。

| 制約 | 件数 | 分類 | 内容 |
|---|---|---|---|
| Free relative (R6) | 598 | CORRECT | referent=null → "関係節" (矢印なし) — 正しい動作 |
| Multi-token (R3) | 66 | CORRECT | space-sep referent → skip — U-2 設計判断 |
| Cross-chapter (R7) | 4 | CORRECT | 別章 antecedent → silent skip — データ境界 |
| Non-nominal (R4/R5/R8) | 61 | CORRECT | morph filter 除外 — L-0 準拠 |
| MACULA ref ≠ syntactic ant | — | ARCHITECTURE | Option B 暫定 — Option D で解決予定 |

---

## 未解決課題 (DEFERRED to future phases)

| 課題 | 優先度 | 内容 |
|---|---|---|
| Option D: SR schema `antecedentSRNodeId` | 将来 | syntactic antecedent を明示 |
| cross-chapter bdById 拡張 (4件) | 低 | 章をまたぐ antecedent の lookup |
| R5 demonstrative chain (9件) | 低 | D-* morph を用いる構文パターン |
| R3 multi-token head noun (66件) | 将来 | multi-NP antecedent の単一 HEAD 判定 |

---

## Production Readiness Decision

```
════════════════════════════════════════════════════════════════
P6-D Decision: PASS WITH LIMITATIONS
════════════════════════════════════════════════════════════════

P6-C implementation は production 利用可能である。

根拠:
  ✓ FALSE POSITIVE = 0 (主要品質指標 達成)
  ✓ EXCEPTIONS = 0 (NT 全巻 安全動作)
  ✓ Regression: 349/349 PASS
  ✓ L-0 boundary: 全 6 パス SAFE
  ✓ Taxonomy: R1+R2 = 947 = actual (discrepancy = 0)
  ✓ 全 7 DG chapter: baseline 一致
  ✓ UI semantics J1–J5: 全件確認

Limitations (CORRECT BY DESIGN):
  - Free relative (598件): "関係節" without arrow — 仕様通り
  - Multi-token skip (66件): connector なし — U-2 設計判断
  - Cross-chapter skip (4件): silent skip — データ境界
  - Non-nominal exclusion (61件): morph filter — L-0 準拠
  - MACULA referent は coreference (syntactic antecedent の代替)
    → Option D (SR schema 変更) で将来解決

Coverage: 947 / 1,676 = 56.5% overall
  (missed 43.5% は全件設計上の除外 — true negative)

Production use scope:
  ✓ 現在 DG gate: JHN 1, MAT 5, MAT 28, EPH 2, PHP 2, COL 1, ROM 6
  ✓ NT-wide connector derivation (8,010 文 verified)
  ✓ STANDALONE + CLAUSE_AS_NP 両構造

Commit: AUTHORIZED (decision PASS WITH LIMITATIONS)
Merge:  NOT YET AUTHORIZED (human review required)
Deploy: NOT YET AUTHORIZED (human review required)
════════════════════════════════════════════════════════════════
```

---

## P6-D が検証したこと / しなかったこと

### 検証した (CONFIRMED)

- NT 全 1,676 相対代名詞の完全 taxonomy 分類
- 全 947 connector の FALSE POSITIVE 完全検査
- STANDALONE 848件 + CLAUSE_AS_NP 99件 の両構造動作
- 66件 multi-token の全件詳細 (2〜16 tokens)
- 598件 free relative の全件 (referent=null)
- 4件 cross-chapter の個別特定
- 61件 non-nominal exclusion の sub-type (R4:16, R5:9, R8:36)
- 7 DG chapter の browser 実動作 + baseline 一致
- 319 existing regression checks への影響なし
- 全 6 L-0 boundary path の SAFE 確認

### 検証しなかった (NOT IN SCOPE)

- 実際のユーザー使用感 / UX 主観判断 (→ HUMAN-REVIEW)
- MACULA `referent` の syntactic antecedent としての厳密な正確性評価 (→ Option D)
- DG gate 外の chapter (NT 残り 253 章) の visual 動作 (→ 将来 DG gate 拡張時)
- モバイル 390px での全 7章 browser 確認 (P6-C で JHN1/COL1 確認済み)

---

## ファイル一覧 (P6-D 生成物)

| ファイル | 内容 |
|---|---|
| `docs/development/P6-D_relative_connector_production_audit.md` | 全 12 audit 詳細 |
| `docs/development/P6-D_relative_connector_relationship_matrix.md` | データフロー / 判定マトリクス |
| `docs/development/P6-D_test_matrix.md` | 全テスト証拠 |
| `docs/development/P6-D_final_report.md` | 本文書 |
| `scripts/p6d-production-audit.cjs` | 監査スクリプト (READ-ONLY) |

**P6-D で変更したファイル: なし (READ-ONLY audit)**

---

**STOP — commit / merge / deploy / 次 Phase への自動進行 禁止。**

---

*参照: P6-C_final_report.md / P6-C_relative_connector_design.md / P6-C_nt_wide_audit.md*
