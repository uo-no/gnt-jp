# P6-G.11.4 — Residual Relationship Matrix

**Date:** 2026-08-26
**Phase:** P6-G.11.4 — Read-Only Residual Audit
**Baseline:** P6-G.11.3 complete (DR=265, gap=46, coverage=85.2%)

---

## A. カテゴリ別件数マトリクス

| カテゴリ | 件数 | P6-G.11.3での対応 | Visual Grammar v1 状態 | 修復可能性 |
|---------|------|----------------|---------------------|-----------|
| **A** (Pure gap) | 1 | 未対応 (edge case) | 表示方法定義済 | 技術的には修復可能、リスク有 |
| **B** (VG undefined) | 0 | — | — | — |
| **C** (Intentional) | 7 | 意図的除外 | bracket notation 確立 | 意図的 non-fix |
| **D** (Phrase-type) | 19 | 対応外 (L-0 制約) | 未定義 | Blocked |
| **E** (Depth/traversal) | 10 | 一部 recover (see note) | 表示方法定義済 | 技術的困難 |
| **F** (Structural gap) | 9 | 対応外 | 未定義 | 困難 |
| **Total** | **46** | | | |

---

## B. P6-G.11.3 vs 残存 46 件の関係

### P6-G.11.3 で recover した 66 件の構造

P6-G.11.3 では以下の MAIN_FN slot content 型について `_extractContentClause` を拡張した:

| 追加型 | recover 件数 | label |
|--------|------------|-------|
| SUBORDINATE_CLAUSE | ~30 | '従属節' |
| PARTICIPIAL_CLAUSE | ~18 | '分詞節' |
| bare clause (no cn) | ~12 | '節' |
| group | ~6 | '節グループ' |

### 残存 46 件が recover されなかった理由

```
46件の内訳
├── blocking node が phrase-type (phrase.np / phrase.pp) [19件 = D]
│   └── _extractContentClause は phrase-type を exclude している (L-0 制約)
│       └── APPOSITION, NP_COMPLEX, CLAUSE_AS_NP, ADJ_MOD, ADV_MOD 等
│
├── blocking ancestor が存在しない (ADVERBIAL phrase 経由) [9件 = F]
│   └── DG engine は ADVERBIAL/phrase.pp の内部 clause を derive しない
│       └── PREP_PHRASE → ARTICULAR_NP → CLAUSE_AS_NP → [clause] 等
│
├── blocking node が NOMINALIZED_CLAUSE [7件 = C]
│   └── _extractContentClause で明示的除外 (bracket notation 保護)
│
├── depth / traversal 限界 [10件 = E]
│   ├── blocking slot 自体が DR に未配置 [6件]
│   │   └── bare clause / group が fn=null container 内に埋め込まれている
│   └── contentClause はあるが OBJECT2 が depth-3+ [4件]
│       └── innerDR → adverbialClauses → さらに内部の ADVERBIAL phrase 内
│
└── group slot contentClause=null (_isEmptyDR fire) [1件 = A]
    └── MRK 11:31: deriveFromGroup が空 DR を返す特定ケース
```

---

## C. 構造分類 vs 修復経路マトリクス

| # | 構造的特性 | 関連カテゴリ | 修復に必要な変更 | 修復対象 |
|---|-----------|------------|----------------|---------|
| R1 | MAIN_FN slot (clause/group) が DR に配置済み、CC 付き、OBJECT2 が innerDR に存在 | (recovered) | なし | ✓ 済 |
| R2 | MAIN_FN slot が DR に配置済み、CC 付き、OBJECT2 が depth-3+ | E (一部) | depth-n traversal の追加 | SHOULD DEFER |
| R3 | MAIN_FN slot が DR に配置済み、CC=null (NOMINALIZED_CLAUSE) | C | bracket + sub-diagram 共存設計 | INTENTIONAL FALLBACK |
| R4 | MAIN_FN slot が DR に配置済み、CC=null (_isEmptyDR fire) | A | deriveFromGroup のデバッグ | SHOULD DEFER |
| R5 | blocking が phrase.np / phrase.pp slot | D | phrase 内部の Visual Grammar 定義 + derive | BLOCKED |
| R6 | blocking ancestor が ADVERBIAL phrase 内 | F | ADVERBIAL phrase 内の clause derivation | SHOULD DEFER (困難) |
| R7 | blocking slot 自体が DR に未配置 (fn=null container) | E | fn=null container を MAIN_FN に昇格させるか、別 derive 経路 | SHOULD DEFER |

---

## D. カテゴリ別 書籍分布

| 書籍 | A | C | D | E | F | Total |
|------|---|---|---|---|---|-------|
| MAT | — | — | 1 | 2 | — | 3 |
| MRK | 1 | — | 2 | 1 | — | 4 |
| LUK | — | — | 2 | 1 | — | 3 |
| JHN | — | 2 | 2 | — | 1 | 5 |
| ACT | — | — | 1 | 2 | — | 3 |
| ROM | — | — | — | 1 | — | 1 |
| 1CO | — | — | 1 | — | — | 1 |
| 2CO | — | — | 1 | — | 1 | 2 |
| EPH | — | — | 2 | — | — | 2 |
| PHP | — | 1 | — | — | 1 | 2 |
| 1TH | — | — | — | — | 2 | 2 |
| 1TI | — | — | 1 | — | — | 1 |
| HEB | — | 3 | 2 | — | 1 | 6 |
| JAS | — | — | 1 | — | — | 1 |
| 1PE | — | — | — | — | 2 | 2 |
| 1JN | — | — | — | — | 1 | 1 |
| JUD | — | — | — | 2 | — | 2 |
| REV | — | 1 | 2 | 1 | — | 4 |
| **Total** | **1** | **7** | **19** | **10** | **9** | **46** |

---

## E. Blocking Node 型別分布 (D カテゴリ詳細)

| Blocking type | 件数 | 書籍 |
|-------------|------|-----|
| phrase.np / APPOSITION | 7 | MRK, LUK, EPH, REV |
| phrase.np / NP_COMPLEX | 3 | JHN, ACT |
| phrase.np / ADJ_MOD | 1 | MAT |
| phrase.np / ADV_MOD | 1 | 1TI |
| phrase.np / ARTICULAR_NP | 2 | HEB |
| phrase.np / GENITIVE_MOD | 1 | HEB |
| phrase.np / CLAUSE_AS_NP | 2 | MRK, JAS |
| phrase.pp / PREP_PHRASE | 1 | 2CO |
| **Total D** | **19** | |

---

## F. E カテゴリ — blocking slot の DR 配置状況

| サブタイプ | 件数 | blocking に DR slot | CC 有 | OBJECT2 visible |
|-----------|------|-------------------|------|----------------|
| bare clause OBJECT — DR 未配置 | 3 | ✗ | — | ✗ |
| group OBJECT — DR 未配置 (Isa 40:3 ×3) | 3 | ✗ | — | ✗ |
| CC あり、depth-3+ で不可視 | 3 | ✓ | ✓ | ✗ (deep) |
| CC あり、innerDR が空 (CONTENT_CLAUSE inside SC) | 1 | ✓ | ✓ | ✗ |

---

## G. C カテゴリ — NOMINALIZED_CLAUSE 7 件詳細

| Ref | OBJECT2 text | Blocking fn | bracket 表示 |
|-----|------------|------------|------------|
| JHN 5:11 | ὑγιῆ | AUX | ✓ bracket 内 |
| JHN 5:15 | ὑγιῆ. | SUBJECT | ✓ bracket 内 |
| PHP 3:17 | τύπον | OBJECT | ✓ bracket 内 |
| HEB 1:7 | πνεύματα, | OBJECT | ✓ bracket 内 |
| HEB 1:7 | πυρὸς φλόγα· | OBJECT | ✓ bracket 内 |
| HEB 10:29 | κοινὸν | SUBJECT | ✓ bracket 内 |
| REV 2:2 | ἀποστόλους, | OBJECT | ✓ bracket 内 |

**注意:** NOMINALIZED_CLAUSE の bracket 表示は Visual Grammar v1 の確立した表現方法。OBJECT2 は bracket 内テキストとして読者には可視だが、SECOND_OBJECT slot としての DR 表現はない。これは機能的には完全に正しい。

---

## H. Generic fn Gap vs SECOND_OBJECT Gap の対比

| fn | SR count | DR count | gap | gap率 | gap の主因 |
|----|---------|---------|-----|-------|----------|
| PREDICATE | 25,110 | 20,653 | 4,457 | 17.7% | NOMC 内部 + ADVERBIAL phrase 内 clause |
| OBJECT | 13,693 | 11,893 | 1,800 | 13.1% | NOMC 内部 + depth 超過 |
| SUBJECT | 11,116 | 10,095 | 1,021 | 9.2% | NOMC 内部 + depth 超過 |
| COMPLEMENT | 3,604 | 3,066 | 538 | 14.9% | 上記に同じ |
| INDIRECT_OBJECT | 2,662 | 2,403 | 259 | 9.7% | 上記に同じ |
| **SECOND_OBJECT** | **311** | **265** | **46** | **14.8%** | **D+E+F+C (上記と異なる分類)** |

**重要な区別:**

1. **PREDICATE / SUBJECT / OBJECT の gap** は主に NOMINALIZED_CLAUSE 内部（contentClause=null で traversal されない）と ADVERBIAL phrase.pp 内の clause（derive されない）に起因。これらは P6-G.11.3 の範囲外。

2. **SECOND_OBJECT の gap** は他の fn と異なり、「別の MAIN_FN slot の内部コンテンツに OBJECT2 が現れる」という SEMANTIC 特性から来る。P6-G.11.3 の拡張で 66 件を recover し、14.8% の残存 gap になった。

3. **両者は修復経路が異なる。** PREDICATE gap を修復するには NOMINALIZED_CLAUSE の sub-diagram 対応（P6-G.X.Y 以降）が必要。SECOND_OBJECT gap の残存は phrase-type / structural gap が原因で、PREDICATE gap の修復とは独立。

4. **SECOND_OBJECT gap が "generic engine issue" である側面:** 残存 E カテゴリ（depth 超過）および F カテゴリ（structural gap）は SECOND_OBJECT 固有ではなく、他の fn にも同じ不可視が生じる。ただし OBJECT2 の semantics（clause 補語の位置）から OBJECT2 において特に顕著に現れる。

---

## I. P6-G.11.1 分類との対応確認

P6-G.11.1 では blocking pattern を以下に分類していた:

| P6-G.11.1 Class | P6-G.11.4 カテゴリ対応 | 件数 |
|----------------|---------------------|------|
| Class A (CONTENT_CLAUSE) | (すべて recover 済) | 0残 |
| Class B (SUBORDINATE / PARTICIPIAL / bare / group) | A: 1残 (MRK 11:31)、E: 一部 | 11残 |
| Class C (NOMINALIZED_CLAUSE) | C | 7 |
| Class D (NONE = structural gap) | F | 9 |
| Class E (phrase-type) | D | 19 |

**Class B の 11 残存 (E カテゴリ 10 + A 1):** P6-G.11.1 では 77 件が addressable とされていたが、実際の recover は 66 件。差分 11 件は P6-G.11.3 の _isEmptyDR guard と depth 限界によるもの。P6-G.11.1 の分類では depth 超過を Class B に含めていたが、P6-G.11.4 で E として再分類。

---

*P6-G.11.4 Residual Relationship Matrix — READ-ONLY.*
