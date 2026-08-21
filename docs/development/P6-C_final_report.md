# P6-C — Relative-Clause Connector Implementation — Final Report

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** IMPLEMENTED · BROWSER-VERIFIED · HUMAN-REVIEW 待ち  
**Production code changes:** dg-engine.js, index.html  
**SR schema changes:** 0

---

## エグゼクティブサマリー

P6-C は、Reed–Kellogg / Leedy ダイアグラムで関係代名詞と先行詞を  
視覚的 connector で結ぶ機能を実装した。

**P6-B.2 の推奨アーキテクチャ Option B (暫定) を採用:**  
MACULA `referent` + morph filter (R4 finite verb 除外) + multi-token skip (R3 除外)。

---

## 実装変更

### dg-engine.js

追加した関数:

| 関数 | 役割 |
|---|---|
| `_isNominalMorph(morph)` | bible_data morph → nominal 判定 (N-*, A-*, V-*P-*) |
| `_findRelPronInSubtree(node)` | SR subtree から relative pronoun token を検索 |
| `_extractEmbeddedRelClauses(node)` | CLAUSE_AS_NP slot から embedded relative clause を抽出 |
| `_collectRelPronTokens(node, results)` | SR tree 全体の relative pronoun tokens を収集 |
| `deriveRelativeConnectors(root, bdByRef, bdById)` | eligibility 検証済み connector records を返す (exported) |

変更した関数:

- `deriveClauseCore`:
  - fn=null 子ノード: relative clause を検出し DR に `isRelativeClause: true` / `relPronRef` を付与
  - MAIN_FN slots: CLAUSE_AS_NP の embedded relative clause を抽出し `embeddedRelClauses` を付与、`headSIs` を絞り込み

### index.html

- CSS: `.dg-rel-clause` / `.dg-rel-clause-label` (`--color-domain` 紫)
- DG gate: ROM 6 を追加
- `_bdByRef` / `_bdById` マップを各章で構築
- `_annotateRelClauses(dr, connMap)`: DR tree に `antecedentText` を pre-annotate
- `_dgRenderClause`: `isRelativeClause` ラベル + `embeddedRelClauses` レンダリング

---

## 検証結果

### テストスイート

| テスト | 件数 | 結果 |
|---|---|---|
| `_isNominalMorph` ユニット | 12 | ✅ 全 PASS |
| Negative fixtures (必須 5件) | 5 | ✅ 全 PASS |
| JHN 1 実データ | 8 | ✅ 全 PASS |
| COL 1 実データ | 1 | ✅ 全 PASS |
| `re-w2b-relative-regression.cjs` | 50 | ✅ 全 PASS |

### Browser Verification (Desktop 1280px)

| Chapter | dg-view | rel-clause | 回帰 |
|---|---|---|---|
| JHN 1 | 57 | 14 | ✅ |
| COL 1 | 9 | 5 | ✅ |
| MAT 5 | 58 | 5 | ✅ |
| MAT 28 | 23 | 0 | ✅ |
| EPH 2 | 12 | 3 | ✅ |
| PHP 2 | 18 | 3 | ✅ |
| ROM 6 | 27 | 4 | ✅ |

Mobile 390px: JHN 1 / COL 1 ✅

### NT-Wide Audit

```
Chapters: 260 / Sentences: 8,010 / Connectors: 947
FALSE POSITIVE (finite verb connector): 0  ← 主要指標
EXCEPTIONS: 0
```

---

## STOP CONDITIONS 確認

| 条件 | 状態 |
|---|---|
| SR schema 変更が必要 | → 不要 (Option B: MACULA referent 直接使用) |
| antecedent を推測 | → しない (referent field の直接読み取り) |
| MACULA referent だけでは validation 不可 | → morph filter により可能 |
| multi-token target の推論が必要 | → skip (connector なし) |
| DG visual grammar 変更が必要 | → なし (既存 L-bracket + dashed border の応用) |
| L-0 boundary を越える可能性 | → なし (annotation transfer のみ、推論なし) |

**いずれの STOP 条件も発動せず、実装完了。**

---

## P6-C Decision

```
Status: IMPLEMENTED · BROWSER-VERIFIED

Reed–Kellogg / Leedy connector 実装: YES
  - 手法: MACULA referent + morph filter + multi-token skip (Option B)
  - 対象: NT 全 27 巻 / 260 章 / 947 connectors
  - FALSE POSITIVE: 0 (finite verb connector なし)

Architecture: Option B (暫定) → Option D (長期目標)
  - P6-D 以降: SR schema に antecedentSRNodeId を追加

Commit authorized: NO
Merge authorized: NO
Deploy authorized: NO
P6-D auto-progress: NO

Priority compliance:
  1. L-0: ✅ 推論なし、annotation transfer のみ
  2. structural accuracy: ✅ eligible cases のみ connector
  3. R-K/Leedy fidelity: ✅ head noun token + visual L-bracket connector
  4. coverage: 947 / ~1,079 = 87.8%
  5. convenience: N/A (P6-C scope 外)
```

---

## 未解決・将来課題

| 項目 | 分類 |
|---|---|
| cross-chapter 4件 (同一 SR ファイルにない antecedent) | DEFERRED |
| R5 demonstrative chain 10件 (D-* morph) | DEFERRED |
| R8 article / Aramaic / X-morph 42件 | DEFERRED |
| SR schema に antecedentSRNodeId 追加 (Option D) | FUTURE (P6-D) |
| STANDALONE 49.2% への SR syntactic path 追加 | FUTURE (P6-D) |

---

**STOP — P6-D / commit / merge / deploy へ自動進行しない。**

---

*詳細: P6-C_relative_connector_design.md / P6-C_test_matrix.md / P6-C_nt_wide_audit.md*
