# P6-B.2 Referent-to-Diagram Connector — Relationship Matrix

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE (READ-ONLY)

---

## 1. MACULA referent × DG connector 適合マトリクス

| referent target morph | 件数 | % | DG connector 可否 | R-type | 追加条件 |
|---|---|---|---|---|---|
| Noun (N-*) | 840 | 77.8% | ✅ 可 | R1/R2 | morph filter pass |
| Adjective / numeral (A-*) | 75 | 7.0% | ✅ 可 | R1/R2 | morph filter pass |
| Nominal participle (V-*P-*) | 39 | 3.6% | ✅ 可 | R1/R2 | morph filter pass |
| Demonstrative pronoun (D-*) | 10 | 0.9% | ⚠️ 要注意 | R5 | chain 先の nominal へ |
| Article / det (T-*) | 6 | 0.6% | ⚠️ 要注意 | R8 | substantival phrase head |
| **Finite verb (V-*I/S/D/O-*)** | **11** | **1.0%** | **❌ 不可** | **R4** | event reference — 絶対禁止 |
| Infinitive (V-*N) | ~4 | ~0.4% | ⚠️ BORDERLINE | R8 | 動詞的名詞と解釈可能 |
| Aramaic / ARAM | 4 | 0.4% | ⚠️ 不明 | R8 | SBLGNT に Aramaic 挿入 |
| Other / X-morph | ~28 | ~2.6% | ⚠️ 要確認 | R8 | case-by-case |
| **Multi-token (space-sep)** | **66** | **6.1%** | **❌ 単一 connector 不可** | **R3** | 複数 connectors or skip |
| **合計 (with referent)** | **1,079** | **100%** | | | |

**DG connector 安全利用可能:** ~954件 (88.4% — noun+adj+ptc)  
**絶対排除必要:** 77件 (7.1% — R4 11件 + R3 66件)  
**注意・個別判断:** 48件 (4.5% — demo+art+Aramaic+X+inf)

---

## 2. SR structural context × connector 描画可能性マトリクス

| SR 構造 | 件数 | % | connector 描画 | antecedent の SR 位置 |
|---|---|---|---|---|
| STANDALONE_clause | 825 | 49.2% | referent に依存 | **SR ツリーに antecedent への経路なし** |
| CLAUSE_AS_NP_child | 542 | 32.3% | referent OR SR traversal | 共通 NP 内に antecedent が共存 |
| PREP_PHRASE_child | 204 | 12.2% | referent に依存 | PP の外 (parent clause) |
| other | 106 | 6.3% | case-by-case | — |

**STANDALONE が 49.2% → SR 単独では connector 描画不可。MACULA referent が必須。**

---

## 3. First Principle 境界マトリクス

| 操作 | First Principle | L-0 | 可否 |
|---|---|---|---|
| referent → connector (nominal target) | coreference ≈ syntactic attachment (84.8% 一致) | annotation transfer | ✅ CONDITIONAL |
| referent → connector (finite verb target) | coreference ≠ syntactic attachment (event ref) | 推論禁止 | ❌ FORBIDDEN |
| referent → connector (multi-token) | field 構造の問題 | field mismatch | ❌ SKIP |
| referent → connector なし (free relative) | syntactic attachment が存在しない | — | ✅ CORRECT (no connector) |
| referent token → 親 NP phrase を検索 | SR 構造探索 (annotation transfer ではない) | ⚠️ 境界 | ⚠️ BORDERLINE |
| heuristic で free relative の antecedent を推定 | 推論 | L-0 禁止 | ❌ FORBIDDEN |
| coreference chain (demo pronoun → nominal) の解決 | coreference resolution | L-0 禁止 | ❌ FORBIDDEN |

---

## 4. Cross-verse / Cross-chapter 対応マトリクス

| スコープ | 件数 | SR 解決可能性 | connector 可否 |
|---|---|---|---|
| Same-verse | 786 | ✅ 同一 SR 章ファイル内 | ✅ |
| Cross-verse 同章 | 223 | ✅ 同一 SR 章ファイル内 | ✅ |
| Cross-chapter 同書 | 4 | ⚠️ 別 SR ファイル要 | ⚠️ 実装次第 |
| Cross-book | 0 | N/A | N/A |

**Cross-chapter 4件は低優先度。renderer が別章 SR を持たない場合は connector = null (fallback) でよい。**

---

## 5. Architecture Option × 指標マトリクス

| 指標 | Option A (直接) | Option B (morph filter) | Option C (B + phrase) | Option D (SR field) | Option E (なし) |
|---|---|---|---|---|---|
| R4 誤描画防止 | ❌ | ✅ | ✅ | ✅ | ✅ |
| R3 エラー防止 | ❌ | ✅ | ✅ | ✅ | ✅ |
| connector 描画率 | 100%* | ~88% | ~88% | ~88%† | 0% |
| phrase-level target | ❌ | ❌ (token) | ✅ | ✅ | N/A |
| L-0 適合性 | ❌ | ✅ | ⚠️ BORDER | ⚠️ BORDER | ✅ |
| 実装コスト | 最小 | 小 | 中 | 大 (P6-C 以降) | 最小 |
| coreference/syntactic 分離 | ❌ | ❌ | △ | ✅ | ✅ |
| free relative の正確な処理 | ❌ (誤描画) | ✅ (null) | ✅ (null) | ✅ (null) | ✅ (null) |

*R4 誤描画 11件 + R3 解析エラー 66件 を含む  
†新規 SR フィールドが利用可能なケースのみ

**推奨: Option B (即時採用可) + Option D (長期目標)**

---

## 6. 即時採用 vs 長期アーキテクチャ

### 即時採用 (P6-C): Option B

```
条件:
1. referentTokenId が non-null であること
2. referentTokenId に空白が含まれないこと (R3 排除)
3. target token の morph_raw が V-*[ISD]- にマッチしないこと (R4 排除)
4. target token の morph が T-* でないこと (article head 排除)

connector を描画しない場合:
- referentTokenId == null (free relative → 正しく null)
- R3, R4, R8-article の場合 → connector = null (silent skip)
```

この条件で **~87%** のケースで valid connector を描画できる。

### 長期目標 (P6-D 以降): Option D

SR に明示的な syntactic attachment フィールドを追加:

```json
{
  "evidence": {
    "referentTokenId": "n43001009003",      // MACULA coreference (from P6-C)
    "antecedentSRNodeId": "JHN#JHN 1:9!2…JHN 1:9!5"  // explicit SR syntactic field
  }
}
```

`antecedentSRNodeId` は SR builder が build 時に:
1. relative pronoun の CLAUSE_AS_NP 構造から解決 (for CLAUSE_AS_NP_child cases)
2. referentTokenId から SR 親 phrase.np を検索 (for STANDALONE cases)
→ この検索は L-0 境界の再確認が必要。

---

## 7. 制約サマリー

### P6-C 実装前に確定が必要な事項

| 事項 | 内容 | 優先度 |
|---|---|---|
| C-1 | connector target スタイル: (a) head token vs (b) NP phrase node | **HIGH** |
| C-2 | R3 (multi-token) の処理方針: skip / first-token / 複数 connectors | **HIGH** |
| C-3 | R5 (demonstrative chain) の処理: connector to demo pronoun / skip | Medium |
| C-4 | cross-chapter referent の fallback 方針 (4件) | Low |
| C-5 | DG renderer が Option B で実装するか Option C で実装するか | **HIGH** |

### P6-C 実装で確認が不要な事項

| 事項 | 確認済み |
|---|---|
| MACULA referent の NT corpus における morph 分布 | ✅ P6-B.1 確認済み |
| finite verb referent の排除基準 (R4 11件) | ✅ 本監査確認済み |
| multi-token referent の件数 (66件) | ✅ 本監査確認済み |
| cross-verse が SR ファイル内で解決可能であること | ✅ 確認済み (227件, 同一章) |

---

*詳細: P6-B.2_referent_connector_audit.md / P6-B.2_test_matrix.md / P6-B.2_final_report.md*
