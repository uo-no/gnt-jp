# P6-G.11.4 — Residual Decision Matrix

**Date:** 2026-08-26
**Phase:** P6-G.11.4 — Read-Only Residual Audit
**Baseline:** P6-G.11.3 complete (DR=265, gap=46, coverage=85.2%)

---

## A. 4分類定義

| 分類 | 定義 |
|------|------|
| **MUST FIX** | Visual Grammar v1 freeze 前に修正必須。このままでは v1 の正確性・整合性に直接影響する。 |
| **SHOULD DEFER** | 修正望ましいが v1 freeze 前に必須ではない。技術的に修復可能だが追加設計・調査が必要。 |
| **INTENTIONAL FALLBACK** | 既存の意図的な表示経路が有効である。修正は設計変更を要するため意図的に非対応。 |
| **BLOCKED / UNSAFE TO INFER** | SR のみでは安全に derive 不可、または Visual Grammar v1 に表現方法がない。修正不可。 |

---

## B. カテゴリ別決定

### Category A — Pure Engine Coverage Gap (1件)

**ケース:** MRK 11:31 — OBJECT|group/no-cn — `_isEmptyDR` が fire して contentClause=null

**判定:** **SHOULD DEFER**

**理由:**
- 技術的には「`deriveFromGroup` が空 DR を返す理由を調査し、適切であれば `_isEmptyDR` 条件を緩和する」修正が可能
- ただし単一ケースのために `_isEmptyDR` ロジックを変更することは全 NT の regression リスクを負う
- この 1 件の不可視が Visual Grammar v1 の正確性に与える実害は最小
- 調査・修正には独立した audit 工程が必要

**条件:** V1 freeze 後、単独 audit Task として扱う。

---

### Category C — NOMINALIZED_CLAUSE (7件)

**ケース:** JHN 5:11, 5:15; PHP 3:17; HEB 1:7 ×2, 10:29; REV 2:2

**判定:** **INTENTIONAL FALLBACK**

**理由:**
- NOMINALIZED_CLAUSE の bracket notation は Visual Grammar v1 の確立した表現方法
- OBJECT2 は bracket 内テキストとして読者には可視
- Sub-diagram と bracket notation の共存は新規設計を要する（`dg-nomc` 表示経路との統合）
- P6-G.11.3 で明示的に除外（`_extractContentClause` の exclusion コメント参照）
- 機能的には問題なし: OBJECT2 "ὑγιῆ", "κοινὸν" 等は bracket 内で読者が識別できる

**条件:** Bracket + sub-diagram 共存設計を次フェーズで検討可能。現状は意図的 fallback。

---

### Category D — Phrase-Type (19件)

**ケース:** APPOSITION (7), NP_COMPLEX (3), CLAUSE_AS_NP (2), ADJ_MOD (1), ADV_MOD (1), ARTICULAR_NP (2), GENITIVE_MOD (1), PREP_PHRASE (1)

**判定:** **BLOCKED / UNSAFE TO INFER**

**理由:**
- Phrase.np / phrase.pp 型構造の内部構造を Visual Grammar の slot として表示するには、その phrase type の表示方法を新規定義する必要がある
- L-0 制約: SR の fn 値のみから phrase 内部の MAIN_FN slot 階層を一意に derive できない
  - APPOSITION: どのノードが head でどれが appositive かは phrase-level 表現方式次第
  - NP_COMPLEX: 内部の節構造の表示方式が未定義
  - CLAUSE_AS_NP: CLAUSE_AS_NP の内部が clause 型でも、その DR は phrase-as-slot の表示方式が未確立
- phrase.np の Visual Grammar 表現は VG v1 scope 外
- 修復するためには: phrase-type slot の sub-diagram 表現 + `_extractContentClause` の phrase 分岐追加 が必要

**条件:** VG v2 以降で phrase-type slot の sub-diagram 設計を定義した後に対応可能。

---

### Category E — Depth / Traversal Limitation (10件)

**ケース:**
- E.1: bare clause OBJECT が DR に未配置 (MAT 1:22, JUD 1:24 ×2) — 3件
- E.2: group OBJECT が DR に未配置 (MAT 3:3, MRK 1:2, LUK 3:3) — 3件 (Isaiah 40:3)
- E.3: contentClause あり、OBJECT2 が depth-3+ (LUK 10:21, ACT 24:10, ACT 24:14) — 3件
- E.4: CONTENT_CLAUSE が SC 内で DR 未配置 (ROM 4:16) — 1件

**判定:** **SHOULD DEFER**

**個別分析:**

| Sub | ケース | 修復に必要な変更 | 理由 |
|-----|--------|---------------|------|
| E.1 | MAT 1:22, JUD 1:24 ×2 | fn=null structural container 内の bare clause の MAIN_FN 検出 | P5-E-1 に関係する derivation path 変更が必要 |
| E.2 | MAT 3:3, MRK 1:2, LUK 3:3 | NOMINALIZED_CLAUSE → adverbial → group の 3+ 層経路 | 同一 scripture 引用 ×3。group slot が DR に配置されない原因を NOMC 経路から追跡 |
| E.3 | LUK 10:21, ACT 24:10, ACT 24:14 | contentClause.innerDR の adverbialClauses 内でさらに深い traversal | countFnInDR は traverse するが実際の slot 配置が depth-3 以上 |
| E.4 | ROM 4:16 | SUBORDINATE_CLAUSE → inner clause → CONTENT_CLAUSE の連鎖 | SC の innerDR を traversal する countFnInDR では不可視だが CONTENT_CLAUSE slot が配置されていない |

**理由 (共通):**
- 10件すべて、追加の DR derivation 変更なしには修復不可
- 3件の Isaiah 引用 (E.2) は単一の scripture 引用が 3 書籍で不可視 — 価値はあるが v1 scope 外
- depth-3+ (E.3) は現在の `_extractContentClause` の再帰呼び出し限界を超える
- 単一の fix では解決できず、複数の独立した調査が必要

**条件:** 各ケースを独立した Sub-Task として v1 freeze 後に対応。

---

### Category F — Structural Gap (9件)

**ケース:** JHN 4:46, 2CO 10:13, PHP 3:8, 1TH 2:14, 1TH 3:12, HEB 1:1, 1PE 2:16, 1PE 3:14, 1JN 4:10

**判定:** **SHOULD DEFER**

**理由:**
- 9件すべて `findBlockingAncestor` が MAIN_FN 祖先を見つけられなかった — OBJECT2 の到達経路に MAIN_FN slot が存在しない
- 主なパターン: ADVERBIAL/PREP_PHRASE → ARTICULAR_NP → GENITIVE_MOD → CLAUSE_AS_NP → [clause] → OBJECT2
- これらは現在の DG engine が ADVERBIAL phrase.pp の内部 clause を derive しない設計に起因
- ADVERBIAL phrase 内の clause 内容を derive するには、ADVERBIAL 処理の抜本的な変更が必要
- 9件は各々異なる書籍・構造で出現しており、単一 fix では対応不可
- 特に HEB 1:1, 1PE 2:16, 1PE 3:14 は epistolary opening / complex prepositional phrases に由来

**条件:** Structural gap (ADVERBIAL phrase 内 clause) は VG v2 以降の ADVERBIAL 表現拡張と同時に検討。

---

## C. 4分類サマリー

| 分類 | カテゴリ | 件数 | 書籍分布 |
|------|---------|------|---------|
| MUST FIX | — | **0** | — |
| SHOULD DEFER | A (1) + E (10) + F (9) | **20** | MAT, MRK, LUK, ACT, ROM, 1TH, 1JN, 1PE, 2CO, PHP, JUD, REV |
| INTENTIONAL FALLBACK | C (7) | **7** | JHN, PHP, HEB, REV |
| BLOCKED / UNSAFE TO INFER | D (19) | **19** | MRK, LUK, JHN, ACT, EPH, 1CO, 1TI, HEB, JAS, 2CO, REV |
| **Total** | | **46** | |

**結論: 残り 46 件のうち、Visual Grammar v1 freeze 前に修正すべきものは 0 件。**

---

## D. 決定根拠の整理

### なぜ MUST FIX = 0 か

Visual Grammar v1 の核心は「DR に存在する MAIN_FN slot を正しく表示する」ことにある。

P6-G.11.3 により:
- DR SECOND_OBJECT 265 件 (coverage 85.2%) を実現
- 残存 46 件は SR に fn=OBJECT2 が存在するが、いずれも以下の理由により DR での表現が今回定義できない:
  1. phrase 内部であり Visual Grammar v1 の表現方法が未定義 (D: 19件)
  2. 意図的な別表現方式 (C: 7件) が既に機能している
  3. DR derivation の構造的前提が欠落 (E+F: 19件) で追加設計が必要
  4. 単一 edge case (_isEmptyDR、A: 1件) で v1 品質に影響しない

Visual Grammar v1 は 85.2% coverage で freeze に値する。

### なぜ Category D を BLOCKED にするか (SHOULD DEFER でなく)

- phrase-type slot の sub-diagram 表現は Visual Grammar v1 の設計にない
- phrase.np / phrase.pp の内部構造の表示方式を決定するには、新規の Visual Grammar 設計 (VG v2) が必要
- L-0 の下では phrase 内部を SR から一意に derive できない — これは設計上の境界であり、技術的制約ではない
- 「技術的には実装できる」が「設計が undefined」= BLOCKED

### なぜ Category E+F を SHOULD DEFER にするか (BLOCKED でなく)

- E: depth 超過は `_extractContentClause` の再帰深度拡張と、`deriveFromGroup` / `deriveClauseCore` の traversal 改善で原理的には対応可能
- F: ADVERBIAL phrase 内 clause は新規 derivation path の追加で原理的には対応可能
- いずれも Visual Grammar v1 の設計外 = BLOCKED ではなく、v1 の実装範囲外 = DEFER

---

## E. SHOULD DEFER 件の優先順位 (参考)

v1 freeze 後の作業計画として、SHOULD DEFER 20 件の優先順位を示す。

| 優先 | ケース | 修復価値 | 難易度 |
|------|--------|---------|-------|
| 高 | MAT 3:3, MRK 1:2, LUK 3:3 (Isaiah 40:3 ×3) | 著名な scripture 引用 ×3 書籍 | 中 (同一原因) |
| 中 | MRK 11:31 (Category A) | 単一 edge case | 低〜中 |
| 中 | ACT 24:10, ACT 24:14 (depth-3) | Acts に集中 | 中 |
| 中 | JUD 1:24 ×2 (bare clause) | Jude は短い書 | 低 |
| 低 | LUK 10:21 (depth-3, group) | 構造が複雑 | 高 |
| 低 | HEB 1:1, 1PE 2:16, 1PE 3:14 (structural) | epistolary 複雑構造 | 高 |
| 低 | 1TH 2:14, 1TH 3:12, 2CO 10:13, PHP 3:8, JHN 4:46, 1JN 4:10 (structural) | 各 1件 | 高 |
| 低 | MAT 1:22, ROM 4:16 | depth / structural | 高 |

---

## F. 分類への例外的考慮

**EPH 2 について:**
- EPH 1:3 [D: APPOSITION] および EPH 2:14 [D: APPOSITION] が残存
- これは P6-G.11.2 で予測していた通り (「EPH 2 のみ残る」)
- EPH の gate failure は APPOSITION が原因で、Visual Grammar v1 での APPOSITION 表現未定義による
- BLOCKED 判定を変更する理由なし

**HEB について:**
- NOMINALIZED_CLAUSE (C: 3件) と APPOSITION / GENITIVE_MOD (D: 2件) の合計 5件
- HEB の複雑な文構造を反映している
- いずれも設計外要因

**JHN について:**
- NOMINALIZED_CLAUSE (C: 2件) + NP_COMPLEX (D: 2件) + Structural (F: 1件)
- JHN 5:11/5:15 は同一文型 ("ποιήσας με ὑγιῆ") の繰り返し — bracket notation が機能している

---

*P6-G.11.4 Residual Decision Matrix — READ-ONLY.*
