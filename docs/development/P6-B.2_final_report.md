# P6-B.2 Referent-to-Diagram Connector Boundary Audit — Final Report

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE (READ-ONLY)  
**Production code changes:** 0  
**SR schema changes:** 0

---

## エグゼクティブサマリー

P6-B.2 の問い:

> MACULA の `referent` を Reed–Kellogg / Leedy 型 Diagram の
> `relative clause → syntactic head` connector の根拠として使用してよいか？

**結論:**

MACULA `referent` を DG connector の根拠として使用することは、**条件付きで可能** (Option B)。

- 直接使用 (Option A) は **UNSAFE** — R4 (finite verb 11件) を誤描画、R3 (multi-token 66件) でエラー
- Morph フィルタ付き使用 (Option B) は **CONDITIONALLY SAFE** — 約 88% で valid connector
- 長期的には明示的 SR syntactic field (Option D) が必要

---

## 主要発見

### 発見 1: SR は relative clause の antecedent への構造的経路を持たない (49.2% の場合)

NT corpus で 49.2% の relative pronoun は SR ツリー内で STANDALONE 構造を持つ。この場合、SR ツリーだけでは antecedent への connector を描画する根拠がない。**MACULA `referent` が唯一の実用的な根拠となる。**

```
SR 構造 (STANDALONE 例):
[main clause]
├── phrase.np (antecedent) ← SR にこの NP への link がない
└── clause (relative clause)
    └── ὃς fn=SUBJECT
```

### 発見 2: Finite verb referent 11 件 — 絶対禁止

```
JHN 1:13!1  οἳ → ἔλαβον      (V-2AAI-3P) = 受けた〈事象〉
ROM 6:16!12 ᾧ  → παριστάνετε (V-PAI-2P)  = 提示する〈行為〉
GAL 2:10!6  ὃ  → μνημονεύωμεν (V-PAS-1P) = 覚えている〈行為〉
[他 8 件]
```

これらは discourse event reference であり、syntactic antecedent ではない。DG connector として描画すれば構文的に誤りとなる。

### 発見 3: Multi-token referent 66 件 — 単一 connector 不可

```
ROM 16:4!1  οἵτινες → "n45016003002 n45016003004" (Πρίσκαν + Ἀκύλαν)
1CO 15:3!6  ὃ      → 4 tokens spanning v.3-5
```

`referentTokenId: string` で space-separated ID を格納した場合、connector の target が確定しない。

### 発見 4: Token-level vs Phrase-level — Reed–Kellogg では token が正解

MACULA referent は head noun **token** を指す (例: φῶς in "τὸ φῶς τὸ ἀληθινόν")。Reed–Kellogg / Leedy ダイアグラムでは relative clause connector の target は **head noun token** であり、MACULA referent と一致する。NP phrase node を target にするスタイルを採用する場合は SR 構造の追加探索が必要。

### 発見 5: Cross-verse 227件 は問題なし、Cross-chapter 4件は要注意

```
Cross-verse (同章):    223件 (20.7%) — 同一 SR ファイルで解決可能
Cross-chapter (異章):   4件 ( 0.4%) — 別 SR ファイルの参照が必要
```

Cross-chapter 4件: LUK 9:9→8:50, ACT 22:4→21:40, 1CO 10:11→6:2, GAL 5:4→4:31。少数かつ fallback (null) で処理可能。

---

## Failure Taxonomy 最終集計

| R-type | 件数 | % | DG connector | 対処 |
|---|---|---|---|---|
| R1: exact structural match | ~50 | ~4.6% | ✅ 直接描画可 | filter pass |
| R2: token OK, phrase-level choice | ~900 | ~83.4% | ✅ 描画可 (token-level) | filter pass |
| R3: multi-token (space-sep) | 66 | 6.1% | ❌ 単一 connector 不可 | skip |
| R4: finite verb target | 11 | 1.0% | ❌ 絶対禁止 | morph filter |
| R5: demonstrative chain | 10 | 0.9% | ⚠️ 要注意 | skip or chain |
| R6: free relative (null ref) | 598 (別) | — | ✅ connector なし = 正しい | null |
| R7: target not in SR | 0 | 0% | N/A | N/A |
| R8: other (art/ARAM/X-morph) | ~42 | ~3.9% | ⚠️ 要確認 | case-by-case |

---

## Architecture Options 評価

| Option | 説明 | 安全性 | 推奨 |
|---|---|---|---|
| A | 直接利用 (validation なし) | ❌ UNSAFE | ❌ 採用不可 |
| **B** | **morph filter + multi-token skip** | **✅ CONDITIONAL SAFE** | **✅ P6-C 推奨** |
| C | B + phrase-level 解決 | ⚠️ BORDERLINE (L-0) | ⚠️ design choice 要確認 |
| D | 明示的 SR syntactic field | ✅ IDEAL | 長期目標 |
| E | connector なし (interim) | ✅ safe だが機能欠落 | 可 (P6-C を早期着手する場合) |

### Option B 仕様 (P6-C 実装前の確定事項)

DG renderer が `evidence.referentTokenId` から connector を描画する条件:

```
条件 1 — 存在確認:
  referentTokenId != null
  referentTokenId に空白が含まれないこと  ← R3 排除

条件 2 — Morph フィルタ:
  target token の morph_raw が:
  - N-* (noun)         → ✅ 描画可
  - A-* (adj/numeral)  → ✅ 描画可
  - V-*P-* (participle) → ✅ 描画可
  - V-*[ISD]- や V-*[ISD][A-Z]*- (finite verb: indic/subj/imp) → ❌ 描画禁止
  - T-* (article)      → ❌ 描画禁止 (article head)
  - D-* (demonstrative) → ⚠️ P6-C 前に方針確定 (暫定: 描画しない)
  - その他             → ⚠️ 暫定: 描画しない (safe fallback)

条件 3 — Cross-chapter fallback:
  connector target が別章 SR に存在する場合は connector = null (silent skip)
```

この条件で:
- **~88.4% (954/1,079件) で valid connector** を描画
- **0件** の finite verb connector 誤描画
- **0件** の multi-token parse error

---

## L-0 境界最終確認

| 操作 | L-0 Status | 根拠 |
|---|---|---|
| `referentTokenId` を SR に格納 (annotation transfer) | ✅ PERMITTED | P6-B.1 確認済み |
| referentTokenId + morph filter → connector 描画 | ✅ PERMITTED | filter は annotation の読み取り確認、推論ではない |
| referent token → 親 phrase.np を SR で検索 (Option C) | ⚠️ BORDERLINE | SR 構造探索 = annotation transfer の範囲を超える可能性 |
| free relative (null referent) に connector を描画 | ❌ FORBIDDEN | L-0: 推論禁止 |
| demonstrative chain を辿って ultimate referent を解決 | ❌ FORBIDDEN | coreference resolution |
| finite verb referent に connector を描画 | ❌ FORBIDDEN | 構造的誤り |

---

## P6-B.1 → P6-B.2 の引き継ぎ更新

| P6-B.1 事項 | P6-B.2 での確認 |
|---|---|
| U-3: DG renderer の morph 検証ロジック設計 | → Option B 仕様として確定 (本報告書) |
| U-2: space-separated 66件への対処方針 | → skip (connector = null) を推奨。複数 connectors は P6-C 設計判断 |
| U-4: SR builder の cross-chapter 解決確認 | → cross-chapter 4件。fallback null で OK |
| U-5: K-3 downstream の finite verb 影響 | → K-3 は referent raw string を返すのみ。DG renderer 側の filter が必須 |

---

## UNRESOLVED 引き継ぎ (P6-C 前に解決必要)

| # | 項目 | 優先度 |
|---|---|---|
| **U-1** | **connector target style: (a) head token vs (b) NP phrase node** | **HIGH — P6-C 設計の前提** |
| **U-2** | **R3 multi-token (66件): skip / first-token / 複数 connectors のどれか** | **HIGH — P6-C 前必須** |
| **U-3** | **Option B vs Option C の選択 (token-level vs phrase-level resolver)** | **HIGH — P6-C 実装方針** |
| U-4 | cross-chapter 4件の fallback (null で OK か) | Low |
| U-5 | R5 demonstrative chain 10件の扱い | Low |

---

## P6-B.2 Decision

```
Status: AUDIT COMPLETE — STOP

MACULA referent direct-use for DG connector: CONDITIONAL YES
  — 条件: morph filter (R4 排除) + multi-token skip (R3 排除)
  — 直接使用 (filter なし): NO

MACULA referent as supplementary evidence: YES
  — referentTokenId は SR に格納すべき (Option B の前提)
  — 情報源が MACULA coreference annotation であることを明示

Explicit SR syntactic relationship required: YES (long-term)
  — 即時は referentTokenId + morph filter (Option B) で代替可
  — 長期: antecedentSRNodeId など explicit field を追加 (Option D)

Recommended architecture: B (immediate) → D (long-term)
  — P6-C: Option B (morph filter + skip) を実装
  — P6-D 以降: Option D (explicit SR syntactic field) を実装

Schema implementation authorized: NO
Commit authorized: NO
Merge authorized: NO
Deploy authorized: NO

Key validation findings:
  Total NT relative pronouns: 1,677
  With referent: 1,079 (64.3%)
  Safe for DG connector (Option B): ~954 (88.4%)
  MUST exclude — R4 finite verb: 11 (1.0%)
  MUST exclude — R3 multi-token: 66 (6.1%)
  Cross-chapter (require extra SR load): 4 (0.4%)
  Free relative (no connector = correct): 598

STANDALONE structure warning:
  49.2% of relative pronouns in SR have STANDALONE structure
  = SR tree has NO structural path to antecedent
  = MACULA referent is the ONLY available connector basis
  = Without referentTokenId in SR, 49.2% of connectors are impossible
```

---

**STOP — P6-C / SR schema implementation へ自動進行しない。**

P6-B.2 が示したのは:
1. MACULA `referent` は条件付きで DG connector の根拠として使用可能
2. Option B (morph filter + multi-token skip) が即時実装の推奨パス
3. **U-1 (connector target style)** と **U-2 (multi-token 方針)** と **U-3 (B vs C)** は人間の判断が必要
4. SR schema への `referentTokenId` 転写 (P6-C) の前にこれら 3 点を確定すること

P6-C (SR schema 変更・SR builder 実装・DG renderer 実装) への進行は人間の明示的承認を要する。

---

*詳細: P6-B.2_referent_connector_audit.md / P6-B.2_relationship_matrix.md / P6-B.2_test_matrix.md*
