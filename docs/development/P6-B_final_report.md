# P6-B Relative Clause / Antecedent Schema Design Audit — Final Report

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE (READ-ONLY)  
**Production code changes:** 0  
**SR schema changes:** 0

---

## エグゼクティブサマリー

P6-B 監査は、P6-A が発見した **Grade D HARD GAP (relative clause → antecedent link の不在)** を解消する最小 schema extension を設計するための READ-ONLY 監査である。

**主要発見:**

1. **MACULA 既存注釈が解決策の核心**: `bible_data.token.referent` フィールドに MACULA (Clear Bible) が注釈した antecedent nodeId が既に存在する (1,078/1,676 = 64.3%)。このフィールドは `evidence.role` と同様の「転写パターン」で SR に追加可能であり、新しい推論は不要。

2. **morphCategory は既に 100% カバー**: 全 1,676 件の relative pronoun に `morphCategory: ['relative_pronoun']` が付与済み。Relative pronoun の識別は解決済み。

3. **L-0 境界の明確な引き方**: `bible_data.referent` の転写 = L-0 COMPLIANT。Discourse referent の推定 = L-0 BLOCKED。この境界で設計が成立する。

4. **最小変更で HARD GAP を解消できる**: `token.evidence.antecedentTokenId` の 1 フィールド追加が最小有効解。

---

## 監査スコープ

| 監査 | 内容 |
|---|---|
| A | SR 現状スキーマの実コード・実データからの確認 |
| B | NT corpus からの関係節分類 |
| C | schema が表現すべき情報の厳密な分離 |
| D | 4候補 + 1新案の schema 比較 |
| E | プロジェクト原則への適合評価 |
| F | 6 critical boundary test |
| G | NT corpus audit (1,676 relative pronouns) |
| H | DG renderer の最小契約 |
| I | R-K/Leedy fidelity 評価 |
| J | 推奨最小 schema |

---

## 主要発見詳細

### 発見 1: bible_data.referent — MACULA 既存注釈

`bible_data` の token に `referent` フィールドが存在し、MACULA が注釈した antecedent token の SR nodeId を保持している。

```json
// bible_data/nt/JHN/1.json
{
  "ref": "JHN 1:3!11",
  "text": "ὃ",
  "morph": "R-NSN",
  "referent": "n43001003010",  ← SR token "ἕν." [A-NSN] を指す
  "role": "s"
}
```

| 統計 | 値 |
|---|---|
| NT 関係代名詞総数 | 1,676 |
| referent 注釈あり | 1,078 (64.3%) |
| referent なし (free relative) | 598 (35.7%) |
| referent が SR nodeId と一致 | 1,078/1,078 (確認サンプル) |
| space-separated (複数 antecedent) | 少数 (ROM 16:4 等) |

reading-engine.js Stage K-3 (FROZEN 2026-07-20) はこの `referent` フィールドを「既存注釈の転写のみ。推論しない」と明記している。SR への `evidence.antecedentTokenId` 転写も同一原則に従う。

### 発見 2: morphCategory は完全カバー済み

全 NT 1,676 件の relative pronoun token に `morphCategory: ['relative_pronoun']` が付与されている (100%)。  
DG renderer が relative pronoun を識別するための morphological foundation は既に存在する。

### 発見 3: RELATIVE_CLAUSE construction は存在しない

SR の 17 construction types に `RELATIVE_CLAUSE` はない。現在、relative clause は:
- 親 clause の construction が `null` (通常)
- 一部 `CLAUSE_AS_NP` でラップされる
- `morphCategory` で識別が必要

### 発見 4: CLAUSE_AS_NP が head noun を co-locate している

541 件 (32.3%) の relative clause が `CLAUSE_AS_NP` 内に存在し、そのうち 527 件は head noun が CLAUSE_AS_NP の sibling として tree 構造から識別可能。しかし、`antecedentTokenId` があれば CLAUSE_AS_NP 構造の解析が不要になる。

---

## Schema Option 比較 (最終)

| Option | 変更数 | antecedent link | L-0 | bible_data 転写 | 最小変更 | 推奨 |
|---|---|---|---|---|---|---|
| A: RELATIVE_CLAUSE cn のみ | 1 (cn 値追加) | ❌ なし | ✅ | N/A | ✅ | 不完全 |
| B: evidence.antecedentTokenId | 1 (evidence field) | ✅ | ✅ | ✅ | ✅ | **推奨** |
| C: relations array | 大規模 | ✅ | ✅ | N/A | ❌ | 過大 |
| D: RELATIVE_CLAUSE + relative{} | 2 | ✅ | ✅ | ⚠️ | ⚠️ | 可 |
| **D+B: RELATIVE_CLAUSE + evidence.antecedentTokenId** | **2** | **✅** | **✅** | **✅** | **✅** | **最良** |

---

## 推奨 Minimal Schema Extension

### Primary (必須): `evidence.antecedentTokenId`

**変更内容:**

```json
// 現在の SR token (relative pronoun)
{
  "type": "token",
  "text": "ὅς",
  "morphCategory": ["relative_pronoun"],
  "evidence": {
    "nodeId": "n51001015001",
    "ref": "COL 1:15!1",
    "role": "s",
    "morph_raw": "R-NSM"
  }
}

// 拡張後
{
  "type": "token",
  "text": "ὅς",
  "morphCategory": ["relative_pronoun"],
  "evidence": {
    "nodeId": "n51001015001",
    "ref": "COL 1:15!1",
    "role": "s",
    "morph_raw": "R-NSM",
    "antecedentTokenId": "n51001013002"  // ← NEW: from bible_data.referent
  }
}
```

| 仕様項目 | 詳細 |
|---|---|
| Field name | `evidence.antecedentTokenId` |
| Field location | `token.evidence` |
| Field type | `string \| null` |
| Nullability | YES (free relative / unresolved = null または absent) |
| Source of truth | `bible_data.token.referent` (MACULA 注釈) |
| What it means | この関係代名詞が syntactically 修飾する先行詞 token の SR nodeId |
| What it does NOT mean | discourse referent の同定ではない / coreference resolution ではない / restrictive/non-restrictive を確定しない |
| Renderer consumption | relative pronoun token → `evidence.antecedentTokenId` → 先行詞 token の surfaceIndex → connector 描画 |
| Backward compatibility | optional field の追加のみ; 欠落 = null と等価 |
| Migration requirement | SR builder スクリプトが bible_data.referent を読んで evidence.antecedentTokenId として出力する変更 |
| L-0 compliance | ✅ COMPLIANT: bible_data.referent は MACULA 由来の既存注釈の転写。evidence.role と同一パターン |
| Coverage | 1,078/1,676 (64.3%) が non-null; 598 が null (free relative) |

### Secondary (推奨): `RELATIVE_CLAUSE` construction type

**変更内容:**

```json
// 現在の relative clause node
{
  "type": "clause",
  "construction": null,
  "function": { "canonical": "ADVERBIAL" }
}

// 拡張後 (Option D 採用時)
{
  "type": "clause",
  "construction": {
    "canonical": "RELATIVE_CLAUSE",
    "sourceRule": "RelClause",
    "derivedFrom": ["morphology"],
    "status": "CONFIRMED"
  },
  "function": { "canonical": "ADVERBIAL" }
}
```

| 仕様項目 | 詳細 |
|---|---|
| Construction canonical | `RELATIVE_CLAUSE` |
| Applied to | relative pronoun (`morphCategory: ['relative_pronoun']`) を子に持つ clause nodes |
| Source of truth | morphological fact (relative pronoun の存在) |
| Migration scope | 最大 1,676 clause nodes |
| Priority | Optional (evidence.antecedentTokenId のみでも renderer は動作可能) |
| L-0 compliance | ✅ COMPLIANT: morphological fact から syntactic construction を導く |
| Risk | 既存テスト (`SUBORDINATE_CLAUSE` 等との競合) への影響を確認が必要 |

---

## Grade 変化サマリー

| Relationship | 現在 Grade | 拡張後 Grade |
|---|---|---|
| Relative pronoun 識別 | A | A (変化なし) |
| 節内 grammatical role | A | A (変化なし) |
| **Antecedent explicit link** | **D** | **A (evidence.antecedentTokenId)** |
| Free relative (null) | A | A (変化なし) |
| RELATIVE_CLAUSE construction | D | A* (Option D 採用時) |
| 前置詞支配の関係詞 | B | B (変化なし) |
| Restrictive vs. non-restrictive | C | C (L-0 BLOCKED のまま) |
| Discourse referent | D | D (L-0 BLOCKED のまま) |

---

## R-K/Leedy Fidelity

schema extension 後、DG renderer は以下を実現可能:

| Feature | 拡張後 |
|---|---|
| 関係節を識別し bracket 描画 | ✅ (morphCategory) |
| Antecedent (head noun) への connector line | ✅ (antecedentTokenId) |
| Free relative は connector なし | ✅ (null) |
| Relative pronoun の節内役割 | ✅ (fn label) |
| 前置詞経由の関係詞 | ⚠️ (PREP_PHRASE 経由で部分的) |
| Restrictive/non-restrictive 視覚区別 | ❌ (L-0 BLOCKED) |

**評価:** P6-A の Grade D HARD GAP を schema extension により解消し、R-K/Leedy diagram の「relative clause → head noun connector」を 64.3% のケースで実現可能。

---

## UNRESOLVED (P6-C 以降への引き継ぎ)

| Item | 内容 | 優先度 |
|---|---|---|
| U-1 | PHP 2:5 `ὃ`/`ὃς` の bible_data.referent 値の確認 | Medium |
| U-2 | space-separated referent (複数 antecedent) の renderer での扱い | Medium |
| U-3 | SR builder の bible_data.referent 転写パイプラインの確認 | High (実装前必須) |
| U-4 | RELATIVE_CLAUSE construction 追加時の既存 DG テスト影響 | Medium |

---

## 禁止事項の遵守確認

| 禁止項目 | 状態 |
|---|---|
| production code 変更 | 変更なし ✅ |
| `public/core/*.js` 変更 | 変更なし ✅ |
| `public/index.html` 変更 | 変更なし ✅ |
| SR schema 変更 | 変更なし ✅ |
| SR builder 変更 | 変更なし ✅ |
| 新しい統語推論の実装 | 実施せず ✅ |
| antecedent の自動推定ロジック | 実施せず ✅ |
| coreference / discourse referent 推定 | 実施せず ✅ |
| L-0 を越える意味解釈 | 実施せず ✅ |
| commit / merge / deploy | 実施せず ✅ |

---

## P6-B Decision

```
Status: AUDIT COMPLETE — STOP

Recommended option: D+B (RELATIVE_CLAUSE construction + evidence.antecedentTokenId)

Primary implementation: evidence.antecedentTokenId
  - Source: bible_data.token.referent (MACULA 既存注釈の転写)
  - Coverage: 1,078/1,676 (64.3%) non-null; 598 null (free relative)
  - L-0 compliance: CONFIRMED
  - Schema change scope: token.evidence field addition
  - Migration: SR builder スクリプト変更のみ

Secondary implementation (optional): RELATIVE_CLAUSE construction
  - Coverage: 全 1,676 件
  - L-0 compliance: CONFIRMED
  - Migration: ~1,676 clause nodes の construction 更新

Schema change required: YES (evidence.antecedentTokenId for primary)
Production implementation authorized: NO
Commit authorized: NO
Merge authorized: NO
Deploy authorized: NO
```

---

**STOP — P6-C / SR schema implementation へ自動進行しない。**

P6-B が示したのは「設計監査の結果」であり、実装許可ではない。  
SR schema 変更・SR builder 変更・production code 変更には、別途人間による承認と P6-C フェーズ定義が必要。

---

*詳細: P6-B_relative_clause_schema_audit.md / P6-B_relative_relationship_matrix.md / P6-B_test_matrix.md*
