# P6-G.11.4 — Final Report: Residual Reachability Audit

**Date:** 2026-08-26
**Phase:** P6-G.11.4 — Read-Only Residual Audit
**Decision:** **PASS — Audit Complete**
**Status:** DONE (READ-ONLY. No code changes. No commit/merge/push/deploy.)

---

## 核心判断

> **残り 46 件を全部直す必要はない。**

Visual Grammar v1 freeze 前に追加修正が必要なケースは **0 件** である。

DR SECOND_OBJECT = 265 (coverage 85.2%) は Visual Grammar v1 の freeze 基準を満たす。

---

## A. Mandate 遵守確認

| 絶対条件 | 状態 |
|---------|------|
| SR data は一切変更しない | ✓ CONFIRMED — NT scan 8010 sentences、SR mutation 0件 |
| Structure Flow / DA / ICL に変更なし | ✓ CONFIRMED — READ-ONLY audit |
| NOMINALIZED_CLAUSE bracket notation を保護 | ✓ CONFIRMED — 7件は INTENTIONAL FALLBACK 判定 |
| commit / merge / push / deploy をしない | ✓ CONFIRMED |
| P6-G.11.4 の作業は P6-G.12 へ自動進行しない | ✓ STOP — 本文書が終点 |

---

## B. P6-G.11.4 全 10 問への回答

### Q1: NT-wide で残存 46 件を完全列挙できたか

**→ YES。** 完全列挙済み。

audit script `/scratchpad/p6g114-residual-audit.cjs` により NT 全 27 巻 8010 sentences を scan。
SR OBJECT2=311, DR SECOND_OBJECT=265, 差分 46 件について各ケースの:
- 参照 (書籍・章・節)
- OBJECT2 テキスト
- blocking node (fn / type / cn)
- DR slot 存在有無
- contentClause 有無
- A–F 分類

を確定。JSON エクスポート: `/scratchpad/p6g114-residuals.json`

詳細: `P6-G.11.4_residual_reachability_audit.md` Section B–G

---

### Q2: 分類 A–F の件数と内容

| カテゴリ | 件数 | 代表例 |
|---------|------|--------|
| A (pure coverage gap) | 1 | MRK 11:31 (group → _isEmptyDR) |
| B (VG representation undefined) | 0 | — |
| C (intentional defer / NOMC) | 7 | JHN 5:11, HEB 1:7 ×2, REV 2:2 |
| D (phrase-type / L-0 unsafe) | 19 | EPH 2:14 (APPOSITION), JHN 9:8 (NP_COMPLEX) |
| E (depth / traversal) | 10 | MAT 3:3 (Isaiah 引用 group), ACT 24:14 (depth-3) |
| F (structural gap R6/R7) | 9 | HEB 1:1, 1PE 2:16, 1JN 4:10 |

---

### Q3: structural gap 9 件全件列挙

JHN 4:46 / 2CO 10:13 / PHP 3:8 / 1TH 2:14 / 1TH 3:12 / HEB 1:1 / 1PE 2:16 / 1PE 3:14 / 1JN 4:10

**共通パターン:** blocking ancestor が ADVERBIAL/PREP_PHRASE / ARTICULAR_NP / GENITIVE_MOD / CLAUSE_AS_NP の連鎖内にあり、DG engine の通常 clause derivation では到達不可。

---

### Q4: depth 超過約 13 件列挙

実際は分類が細分化された:
- E.1 (bare clause DR 未配置): MAT 1:22, JUD 1:24 ×2 = 3件
- E.2 (group DR 未配置 / Isaiah 引用): MAT 3:3, MRK 1:2, LUK 3:3 = 3件
- E.3 (contentClause あり depth-3+): LUK 10:21, ACT 24:10, ACT 24:14 = 3件
- E.4 (SC 内 CC 未配置): ROM 4:16 = 1件
- 計 10件 (当初予測 ~13件との差 -3件は F カテゴリとの境界再分類による)

---

### Q5: NOMINALIZED_CLAUSE 7 件確認

**→ 確認済み (7件):**

| Ref | Blocking fn | OBJECT2 text |
|-----|------------|-------------|
| JHN 5:11 | AUX | ὑγιῆ |
| JHN 5:15 | SUBJECT | ὑγιῆ. |
| PHP 3:17 | OBJECT | τύπον |
| HEB 1:7 | OBJECT | πνεύματα, |
| HEB 1:7 | OBJECT | πυρὸς φλόγα· |
| HEB 10:29 | SUBJECT | κοινὸν |
| REV 2:2 | OBJECT | ἀποστόλους, |

全 7 件について bracket notation が機能しており、OBJECT2 は読者に可視。

---

### Q6: OBJECT2 以外の fn にも同じ generic traversal gap が残っていないか

**→ 残っている。ただし性質が異なる。**

大きな fn gap が存在するが (PREDICATE 4457, OBJECT 1800, SUBJECT 1021 など)、
これらは SECOND_OBJECT gap と **性質が異なる**:

- **SECOND_OBJECT gap の性質:** 別の MAIN_FN slot content 内に OBJECT2 が存在し、P6-G.11.3 の拡張で recover 可能なものが対象だった
- **他 fn gap の主因:** NOMINALIZED_CLAUSE 内部 (contentClause=null で countDrFnAll が traverse しない) + ADVERBIAL phrase.pp 内 clause (derive されない)
- **修復経路が異なる:** 他 fn gap の根本的修復は NOMC sub-diagram 対応 (新設計) + ADVERBIAL phrase 内 clause derivation が必要

**結論:** 他 fn にも同種の gap は存在するが、「MAIN_FN slot content 内の fn が invisible」という OBJECT2 特有の問題が、P6-G.11.3 の拡張で大幅に解消された。

---

### Q7: 残存 gap が OBJECT2 固有か generic engine issue か

**→ 両方の要素を持つ。**

| 側面 | 判定 |
|------|------|
| D (phrase-type) 19件 | generic: phrase.np 内 clause が derive されないのは全 fn で共通 |
| C (NOMC) 7件 | generic: NOMC 内の fn は全種で invisible |
| E (depth/traversal) 10件 | generic: depth 超過・fn=null container は全 fn に影響 |
| F (structural) 9件 | generic: ADVERBIAL phrase 経路は全 fn で invisible |
| **全体** | **OBJECT2 固有ではない。ただし OBJECT2 が「他の MAIN_FN slot 内に入る」semantic 特性から特に影響が可視化された** |

---

### Q8: 残り 46 件を全部直す必要があるか

**→ NO。0 件が MUST FIX。**

| 分類 | 件数 | V1 freeze 前対応 |
|------|------|---------------|
| MUST FIX | 0 | — |
| SHOULD DEFER | 20 | v1 freeze 後 |
| INTENTIONAL FALLBACK | 7 | 対応不要 (既存表現有効) |
| BLOCKED / UNSAFE TO INFER | 19 | 修復不可 (VG v2 以降) |

85.2% coverage は Visual Grammar v1 として十分な到達点。

---

### Q9: OBJECT2 gap は OBJECT2 固有か generic engine issue か (Q7 再確認)

**→ Generic engine issue の集積、かつ OBJECT2 の semantic 配置により特に visible。**

P6-G.11.3 が recover した 66 件は「clause/group-type MAIN_FN slot 内の OBJECT2」という OBJECT2-specific な問題を解消した。
残存 46 件は generic engine limitation (phrase derivation / depth / structural) が主因。
両者は別の問題であり、今回の修正スコープは適切だった。

---

### Q10: 4分類での最終判定

| 分類 | 件数 | カテゴリ |
|------|------|---------|
| MUST FIX before v1 freeze | **0** | — |
| SHOULD DEFER | **20** | A(1) + E(10) + F(9) |
| INTENTIONAL FALLBACK | **7** | C |
| BLOCKED / UNSAFE TO INFER | **19** | D |

---

## C. P6-G.11.3 → P6-G.11.4 の接続

| 指標 | P6-G.11.3 baseline | P6-G.11.4 確認 |
|-----|-------------------|--------------|
| DR SECOND_OBJECT | 265 | 265 (変化なし, READ-ONLY) |
| Coverage | 85.2% | 85.2% |
| Invisible | 46 | 46 (全件分類済み) |
| SR mutations | 0 | 0 |
| Derivation exceptions | 0 | 0 |
| G11-P0~P3 tests | 21/21 PASS | (変化なし) |

P6-G.11.4 は production code を一切変更していない。
P6-G.11.3 の baseline を全く損ねていない。

---

## D. Generic fn Gap Analysis — 最終見解

```
fn          SR      DR      gap     gap率
PREDICATE  25110  20653   4457    17.7%
OBJECT     13693  11893   1800    13.1%
SUBJECT    11116  10095   1021     9.2%
COMPLEMENT  3604   3066    538    14.9%
I.OBJECT    2662   2403    259     9.7%
S.OBJECT     311    265     46    14.8%  ← P6-G.11.3 で 35.4% → 14.8% に改善
```

**最終見解:** SECOND_OBJECT は P6-G.11.3 により他の主要 fn と同等の gap 率 (14.8%) まで改善された。大きな gap が残る fn (PREDICATE, OBJECT) の根本的修復は、NOMINALIZED_CLAUSE の sub-diagram 対応という別設計を要する。これは P6-G.11 シリーズの scope 外。

---

## E. Visual Grammar v1 freeze 判定

**P6-G.11.4 の監査結果として、DR SECOND_OBJECT = 265 (85.2%) は Visual Grammar v1 の freeze に十分である。**

根拠:
1. 残存 46 件は全件分類済みで、v1 での追加対応が不可能 or 不要であることが確認された
2. MUST FIX = 0 件
3. 回帰なし (P6-G.11.3 baseline 維持確認)
4. 7 件 INTENTIONAL FALLBACK (NOMC bracket) は独自表現として機能している
5. 19 件 BLOCKED は VG v1 設計外であり freeze を妨げない
6. 20 件 SHOULD DEFER は v1 freeze 後の継続的改善として記録済み

---

## F. 今後の改善候補 (参考: v1 freeze 後)

| 優先 | 件数 | 内容 |
|------|------|------|
| 高 | 3 | Isaiah 40:3 引用 (MAT 3:3, MRK 1:2, LUK 3:3) — group 経路の調査 |
| 中 | 1 | MRK 11:31 — _isEmptyDR edge case 調査 |
| 中 | 3 | ACT 24:10, 24:14, LUK 10:21 — depth-3 traversal 改善 |
| 低 | 13 | F カテゴリ structural gap + E カテゴリ残余 |
| 別設計 | 19 | D カテゴリ — VG v2 での phrase-type sub-diagram 設計後に対応 |
| 別設計 | 7 | C カテゴリ — NOMINALIZED_CLAUSE + sub-diagram 共存設計後に対応 |

---

## G. 成果物一覧

| 文書 | 内容 | 状態 |
|------|------|------|
| `P6-G.11.4_residual_reachability_audit.md` | 46件完全列挙 + A-F 分類 + generic fn gap | DONE |
| `P6-G.11.4_residual_relationship_matrix.md` | 分類マトリクス + 書籍分布 + P6-G.11.1 対応 | DONE |
| `P6-G.11.4_residual_decision_matrix.md` | 4分類決定 + 根拠 + 優先順位 | DONE |
| `P6-G.11.4_final_report.md` | 最終判断 + mandate 確認 (本文書) | DONE |
| `/scratchpad/p6g114-residual-audit.cjs` | NT-wide scan script | DONE (scratchpad) |
| `/scratchpad/p6g114-residuals.json` | 46件 JSON エクスポート | DONE (scratchpad) |

---

## H. 最終決定

**P6-G.11.4: PASS**

- NT-wide 46件残存 invisible SECOND_OBJECT を完全列挙・分類した
- 残り 46 件のうち Visual Grammar v1 freeze 前に修正すべきケースは **0件**
- DR SECOND_OBJECT = 265 (85.2%) は Visual Grammar v1 の品質基準を満たす
- P6-G.11 シリーズ (P6-G.11.1 〜 P6-G.11.4) が完了した

**STOP。** commit / merge / push / deploy なし。P6-G.12 への自動進行なし。

---

*P6-G.11.4 Final Report — Audit Complete. READ-ONLY. No production code changes.*
