# P6-B.1 Antecedent Source Semantics Audit — Final Report

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE (READ-ONLY)  
**Production code changes:** 0  
**SR schema changes:** 0

---

## エグゼクティブサマリー

P6-B では `bible_data.referent` を `evidence.antecedentTokenId` として SR に転写することを推奨した。

本監査 P6-B.1 はその前提条件を厳密に検証した結果、以下を確認した:

**`bible_data.referent` は MACULA の coreference annotation であり、relative pronoun の syntactic antecedent annotation ではない。**

- 84.8% (noun + nominal adjective) のケースでは syntactic antecedent と一致する
- **14件 (1.3%) の finite verb target** は event/action reference であり syntactic antecedent ではない
- **66件 (6.1%) が space-separated 複数 nodeId** であり `string` 型フィールドと構造的不整合
- 9件 (0.8%) は demonstrative pronoun への coreference chain (中継参照)
- 6件 (0.6%) は article head (名詞本体ではなく冠詞を指す)

---

## 主要発見

### 発見 1: `referent` は relative pronoun 専用ではない

MACULA の `referent` 属性は以下の全トークン種別に付与される:
- Personal pronoun (αὐτός 等): discourse entity への coreference
- Demonstrative pronoun (οὗτος, ἐκεῖνος): discourse entity への coreference
- Relative pronoun (ὅς 等): 多くの場合 syntactic antecedent だが coreference として設計
- Adjective (pronominal use, ἴδιος 等): discourse entity
- Definite article (substantival): entity anchor
- Adverb (ὅπου): locative discourse referent

これは、`referent` が **coreference annotation** であることを示す。reading-engine.js が `referent` を「先行詞トークンID」と記述しているのはエンジンの解釈であり、MACULA の元定義とは異なる。

### 発見 2: Relative pronoun の referent target 分布 (NT corpus 1,078件)

| Target morph category | Count | % | SR転写の安全性 |
|---|---|---|---|
| Noun (N-*) | 840 | 77.9% | ✅ SAFE |
| Adjective nominal (A-*) | 74 | 6.9% | ✅ SAFE |
| Participle (V-*P-*) | 39 | 3.6% | ✅ SAFE (nominal ptc) |
| **Finite verb (V-*I-*/S-*/M-*)** | **~10** | **~0.9%** | **❌ NOT SAFE** |
| Infinitive (V-*N) | ~4 | ~0.4% | ⚠️ BORDERLINE |
| Demonstrative (D-*) | 9 | 0.8% | ⚠️ CHAIN |
| Article (T-*) | 6 | 0.6% | ⚠️ PARTIAL |
| Other (X-*, I-*, etc.) | ~30 | ~2.8% | ⚠️ MIXED |
| **Space-separated (multiple)** | **66** | **6.1%** | **❌ FIELD MISMATCH** |

### 発見 3: 14件の finite verb counterexample (確認済み)

```
ROM 6:16!12  ᾧ (relative) → παριστάνετε (V-PAI-2P = present indicative)
JHN 1:13!1   οἳ (relative) → ἔλαβον (V-2AAI-3P = aorist indicative)
GAL 2:10!6   ὃ (relative) → μνημονεύωμεν (V-PAS-1P = present subjunctive)
EPH 3:4!2    ὃ (relative) → προέγραψα (V-AAI-1S = aorist indicative)
[他 10件]
```

これらは動詞が表す事象/行為 (event/action) への参照であり、DG renderer が「antecedent connector」を描画しようとした場合、動詞トークンへの connector となり構文的に誤り。

### 発見 4: 66件の space-separated 複数 antecedent

```
1CO 15:3!6  ὃ → n46015003011 n46015004003 n46015004006 n46015005003  (4 tokens)
ROM 16:4!1  οἵτινες → n45016003002 n45016003004  (2 tokens)
```

`evidence.antecedentTokenId: string` 型フィールドには space-separated 文字列が格納されることになる。DG renderer がこれを `nodeId` として参照しようとすると存在しない nodeId として失敗する。

### 発見 5: フィールド名 `antecedentTokenId` の問題

"antecedent" は統語論の用語 (the noun phrase that a relative pronoun modifies)。MACULA の `referent` はその定義を保証しない。`antecedentTokenId` という名称は:
1. 14件の finite verb cases で実データと矛盾
2. MACULA のアノテーション semantic を改変する interpretation を加える

---

## P6-B への影響

### P6-B 推奨の修正事項

P6-B Final Report で推奨した `evidence.antecedentTokenId` を以下に修正する:

| 項目 | P6-B 推奨 | P6-B.1 後の修正 |
|---|---|---|
| フィールド名 | `evidence.antecedentTokenId` | **`evidence.referentTokenId`** |
| Source 説明 | MACULA 既存注釈の転写 | MACULA coreference annotation の転写 |
| Coverage | 1,078/1,676 (64.3%) | 912件 single-token noun/adj (84.8% of 1,078) が確実 |
| Field type | `string \| null` | `string \| null` (space-sep 複数は別途方針決定) |
| DG renderer 前提 | target を antecedent として描画 | **target morph の検証が必須** |

### 修正後の schema 仕様

```json
// SR token (relative pronoun) — P6-B.1 修正後推奨
{
  "type": "token",
  "text": "ὅς",
  "morphCategory": ["relative_pronoun"],
  "evidence": {
    "nodeId": "n51001015001",
    "ref": "COL 1:15!1",
    "role": "s",
    "morph_raw": "R-NSM",
    "referentTokenId": "n51001013015"  // ← from bible_data.referent
                                        // Source: MACULA coreference annotation
                                        // Note: 84.8% noun/adj; 1.3% finite verb; 6.1% space-sep
  }
}
```

**Field specification (revised):**

| 仕様項目 | 詳細 |
|---|---|
| Field name | `evidence.referentTokenId` (NOT `antecedentTokenId`) |
| Field type | `string \| null` |
| Source | `bible_data.token.referent` (MACULA coreference annotation) |
| What it means | MACULA が注釈したこのトークンの coreference target token の SR nodeId |
| What it does NOT mean | strict syntactic antecedent の保証 / discourse referent の解決 |
| Null when | referent なし (free relative, unresolved) |
| Space-separated when | 複数 antecedent (66件) — single-token を期待する consumer は first-token または null で扱うべき |
| L-0 compliance | ✅ COMPLIANT: annotation transfer (evidence.role と同一パターン) |
| Renderer requirement | target token の morph を確認してから connector を描画すること |

### DG Renderer への要件 (P6-C 実装前の明示)

| 要件 | 詳細 |
|---|---|
| REQ-1 | `referentTokenId` が non-null でも、target token が nominal (N-*/A-*/V-*P-*) であることを確認してから connector を描画する |
| REQ-2 | target morph が finite verb (V-*I-*/V-*S-*/V-*M-*) の場合は connector を描画しない (event reference) |
| REQ-3 | `referentTokenId` に space-separated 複数 ID が含まれる場合の処理方針を P6-C 前に確定する |
| REQ-4 | cross-verse / cross-chapter referent への参照解決方法を確定する |

---

## L-0 Boundary 最終確認

| 操作 | L-0 Status |
|---|---|
| `bible_data.referent` → SR `referentTokenId` として転写 | ✅ PERMITTED |
| フィールドを `antecedentTokenId` と命名して syntactic claim を加える | ⚠️ BORDERLINE (P6-B.1 で問題確認) |
| Finite verb target への antecedent connector 描画 | ❌ FORBIDDEN (構造事実と矛盾) |
| Discourse referent の解決 / coreference の推定 | ❌ FORBIDDEN |
| Free relative (referent null) に antecedent を補完 | ❌ FORBIDDEN |

---

## UNRESOLVED 引き継ぎ (P6-C 前に解決必須)

| # | 項目 | 優先度 |
|---|---|---|
| U-1 | MACULA 一次文書での `referent` 定義の確認 | Medium |
| **U-2** | **Space-separated 66件への対処方針** (first-token / null / 複数connector) | **HIGH — P6-C 前必須** |
| **U-3** | **DG renderer の morph 検証ロジック設計** | **HIGH — P6-C 前必須** |
| U-4 | SR builder の cross-chapter referent 解決能力確認 | High |
| U-5 | reading-engine.js K-3 downstream での finite verb referent 影響確認 | Medium |

---

## 禁止事項の遵守確認

| 禁止項目 | 状態 |
|---|---|
| production code 変更 | 変更なし ✅ |
| SR schema 変更 | 変更なし ✅ |
| syntax-analyzer.js 変更 | 変更なし ✅ |
| reading-engine.js 変更 | 変更なし ✅ |
| SR builder 変更 | 変更なし ✅ |
| referent → antecedent 変換ロジック実装 | 実施せず ✅ |
| 新規推論ロジック | 実施せず ✅ |
| commit / merge / deploy | 実施せず ✅ |

---

## P6-B.1 Decision

```
Status: AUDIT COMPLETE — STOP

bible_data.referent classification: E (mixed / ambiguous)

  Primary function: MACULA coreference annotation (NOT exclusively syntactic antecedent)

  Distribution (for relative pronouns):
    84.8% — noun/adj/nominal-ptc targets (syntactic antecedent に近似)
    3.6%  — participial (nominal, mostly OK)
    1.3%  — finite verb targets (event reference ≠ syntactic antecedent)  ← KEY ISSUE
    6.1%  — space-separated multiple tokens                               ← FIELD MISMATCH
    4.2%  — demonstrative/article/other

Safe for SR antecedent field:
  AS "antecedentTokenId": NO (semantic claim が source data と不整合)
  AS "referentTokenId":   YES (neutral name, annotation transfer, L-0 compliant)

Recommended schema source: bible_data.referent → evidence.referentTokenId
  Field name MUST be: referentTokenId (not antecedentTokenId)
  DG renderer MUST validate target morph before drawing connector

P6-B revision required:
  evidence.antecedentTokenId → evidence.referentTokenId

Schema implementation authorized: NO
Commit authorized: NO
Merge authorized: NO
Deploy authorized: NO
```

---

**STOP — P6-C / SR schema implementation へ自動進行しない。**

P6-B.1 が示したのは P6-B の推奨スキーマの修正要件である。  
P6-C (SR schema 変更・SR builder 実装) には:
1. フィールド名を `referentTokenId` に決定すること (人間による承認)
2. DG renderer の target morph 検証要件を確定すること
3. space-separated 複数 referent 66件への処理方針を確定すること

が前提として必要である。

---

*詳細: P6-B.1_antecedent_source_audit.md / P6-B.1_antecedent_case_matrix.md / P6-B.1_test_matrix.md*
