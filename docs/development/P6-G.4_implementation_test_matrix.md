# P6-G.4 — Implementation Test Matrix (G-4.2 Revised)

**Phase:** P6-G.4 (G-4.2 Design Review → G-4.3 Implementation Gate)  
**Date:** 2026-08-25  
**Status:** SPECIFICATION ONLY — G-4.3 mandate required  
**Supersedes:** P6-G.4_test_matrix.md (G-4.1版) — count corrections + new assertions

---

## Changes from G-4.1 test_matrix.md

| 変更点 | G-4.1版 | G-4.2版 |
|--------|---------|---------|
| Target count | 540 | **542** (SLOT_IN_COORD 2件を加算) |
| T-11 (nested CC) | "CC nested has contentClause=null" | **"CC nested has contentClause set at both levels"** |
| T-13 (CSS) | 未定義 | **新規追加** |
| T-14 (fn=SUBJECT CC) | 未定義 | **新規追加** |
| Coverage target | ≥540 | **≥542** |

---

## Test Priority Overview

| Priority | Tests | 内容 |
|----------|-------|------|
| **P1 — Must pass** | T-1, T-2, T-5, T-6, T-12 | Core fix + regression |
| **P2 — Should pass** | T-3, T-4, T-7a, T-7c, T-8, T-9, T-10, T-13 | Coverage + CSS + known gaps |
| **P3 — Nice to have** | T-7b, T-11, T-14 | Edge cases + bonus coverage |

---

## T-1: SLOT_ROOT — CC fn=OBJ basic fix (P1)

**Target:** 311 SLOT_ROOT cases (CC in root DR slots as OBJECT)  
**Evidence chapters:** ROM 6 (5 cases), MAT 5 (6 cases), EPH 2 (1 case)

### T-1a — DR: `contentClause` set
```
dr.slots[i].fn === 'OBJECT'
  && dr.slots[i].node.construction?.canonical === 'CONTENT_CLAUSE'
→ slot.contentClause !== null
→ slot.contentClause.innerDR !== null
→ slot.contentClause.innerDR.slots.length > 0
```

### T-1b — DR: inner DR has PREDICATE
```
slot.contentClause.innerDR.slots.some(s => s.fn === 'PREDICATE')
→ true
```
(ほぼすべての inner clause に PREDICATE がある)

### T-1c — Renderer: slot text = conjunction only
```
// 1CO 1:5 (例): OBJECT slot element
slotEl.querySelector('.dg-slot-text').textContent === 'ὅτι'
  NOT: 'ὅτι ἐν παντὶ ἐπλουτίσθητε ἐν αὐτῷ...'
```

### T-1d — Renderer: sub-diagram attached
```
slotEl.nextSibling の DOM 内に .dg-cc-clause-attach が存在
  または
clauseEl に .dg-cc-clause-attach が存在 (親クロージャの後続要素として)
```
Implementation spec により、 `.dg-cc-clause-attach` は `_dgRenderClause` が返す wrap に appendChild される。

### T-1e — Non-CC OBJECT slots: no contentClause
```
dr.slots で fn=OBJECT かつ construction?.canonical !== 'CONTENT_CLAUSE' のすべてのスロット:
  slot.contentClause === null
```

---

## T-2: Gate chapters — CC rendering (P1)

### T-2a — ROM 6: 5件すべてにsub-diagram
```
// ROM 6 DR scan
SLOT_ROOT CC fn=OBJ count: 5
Each: slot.contentClause !== null
Each: dg-cc-clause-attach DOM要素が生成される
```

### T-2b — MAT 5: 6件
```
SLOT_ROOT CC fn=OBJ count: 6 (1件はNOT_FOUND; 6件がfixed)
Each fixed: slot.contentClause.conjunction ∈ {'ὅτι', 'ἵνα', null}
```

### T-2c — EPH 2: 1件
```
EPH 2 ch.2 DG view
SLOT_ROOT CC fn=OBJ count: 1
slot.contentClause !== null
```

### T-2d — PHP 2: SLOT_IN_ADV (2件)
```
PHP 2 adverbialClauses scan:
  adv_dr.slots[j].fn === 'OBJECT' && cn === 'CONTENT_CLAUSE'
→ adv_dr.slots[j].contentClause !== null (2件)
```

### T-2e — COL 1: buried (1件) → no contentClause expected
```
COL 1 ch.1 DG view
CC fn=OBJ は Buried (NOT_FOUND) → contentClause は親slot.node に設定されない
→ no .dg-cc-clause-attach for this sentence
→ no JS error
```

---

## T-3: SLOT_IN_ADV — CC inside adv clause (P2)

**Target:** 229 SLOT_IN_ADV cases

### T-3a — adv DR の slot に contentClause
```
dr.adverbialClauses[i].slots[j].fn === 'OBJECT'
  && cn === 'CONTENT_CLAUSE'
→ slot.contentClause !== null
→ slot.contentClause.innerDR.slots.length > 0
```

### T-3b — Renderer: adv clause 内に sub-diagram
```
// adv clause render wrap の中に .dg-cc-clause-attach が存在
advClauseEl.querySelector('.dg-cc-clause-attach') !== null
```

### T-3c — SLOT_IN_ADV: 非CCのadv clauseは変更なし
```
// 任意の SLOT_IN_ADV で CC fn=OBJを含まない adv clause
adv_dr.slots.every(s => s.contentClause === null)
→ adv clause rendering 変化なし
```

---

## T-4: Conjunction detection (P2)

### T-4a — ὅτι
```
CC先頭が ὅτι トークン (morph_raw startsWith 'CONJ'):
  slot.contentClause.conjunction === 'ὅτι'
```

### T-4b — ἵνα
```
CC先頭が ἵνα トークン:
  slot.contentClause.conjunction === 'ἵνα'
```

### T-4c — ὅπως, εἰ 等
```
CC先頭が他の CONJ トークン:
  slot.contentClause.conjunction === (そのトークンのtext)
```

### T-4d — conjunction なし (implicit indirect discourse)
```
CC に CONJ morph トークンなし:
  slot.contentClause.conjunction === null
  slot.contentClause.innerDR !== null
  → 表示 label = '内容節'
```

---

## T-5: Regression — non-CC OBJECT slots (P1)

### T-5a — NP objects (token / ARTICULAR_NP)
```
OBJECT slots where slot.node.type === 'token':
  slot.contentClause === null
  headDisplayText(slot.node, slot.headSIs) 呼び出し: 変化なし
```

### T-5b — P6-C: CLAUSE_AS_NP with embeddedRelClauses (P2)
```
OBJECT slots where cn === 'CLAUSE_AS_NP':
  slot.contentClause === null  (← _extractContentClause が cn !== 'CONTENT_CLAUSE' でnull返し)
  slot.embeddedRelClauses: 変化なし
  rendering: 変化なし
```

### T-5c — P6-C regression: JHN 1 relative clause count (P1)
```
JHN 1 DG relative clause count (dg-rel-clause elements): 14 (P6-C baseline)
→ 変化なし
```

### T-5d — P6-C regression: `_extractEmbeddedRelClauses(CC_node)` = null
```
Any CC node passed to _extractEmbeddedRelClauses:
  cn !== 'CLAUSE_AS_NP' → returns null immediately
→ CC slot に embeddedRelClauses: [] (変化なし)
```

---

## T-6: Regression — IO raised platform P6-G-2 (P1)

### T-6a — JHN 1: IO platform count unchanged
```
JHN 1 DG view: dg-io-wrap element count = 18 (P6-G-2 baseline)
```

### T-6b — MAT 5: IO platform count unchanged
```
MAT 5 DG view: dg-io-wrap element count = 13 (P6-G-2 baseline)
```

### T-6c — IO not in main line
```
Gate chapters: .dg-main-line 内に fn=INDIRECT_OBJECT slot text なし
```

### T-6d — CC after IO: connector=null (known gap, not regression)
```
// CC fn=OBJ で IO が前に来る場合
slot.connector === null  (← 既存挙動維持、P6-G-4で修正しない)
→ 'po' connector 未表示 (accepted as known gap)
```

---

## T-7: Connector behavior (P2/P3)

### T-7a — CC as only OBJECT after PREDICATE → 'po' (P2)
```
PRED→CC-OBJ のみの場合:
  connectorBetween('PREDICATE','OBJECT') = 'po'
  slot.connector === 'po'
  → .dg-slot-connector.po 表示あり
```

### T-7b — CC after IO → null (P3, known gap)
```
PRED + IO + CC-OBJ の場合:
  slot.connector === null
  → connector 未表示 (known gap, accepted)
```

### T-7c — sp connectors unchanged (P2)
```
JHN 1 sp connector count = 48 (P6-G-2 baseline)
```

---

## T-8: Buried CC (145 cases) — correct fallback (P2)

### T-8a — 親slot は flat text 変化なし
```
Buried CC 例: COL 1 (parentFn=OBJECT/null, cn=null)
親slot の contentClause: null  (← _extractContentClause が cn !== 'CONTENT_CLAUSE' で null)
親slot の headDisplayText: 全トークン連結テキスト (変化なし)
.dg-cc-clause-attach なし
```

### T-8b — no JS error
```
Buried CC 含む章で console.error = 0
```

---

## T-9: Invisible CC (39 cases) — no crash (P2)

### T-9a — no DOM output, no error
```
// NOMINALIZED_CLAUSE/APPOSITION/ADJ_MOD 内の CC
→ .dg-cc-clause-attach なし
→ console.error = 0
```

---

## T-10: SD fallback — no regression (P2)

### T-10a — ACT 2 (non-gate chapter) SD unchanged
```
ACT 2: dg-io-wrap count = 0 (SD fallback active)
ACT 2: .dg-cc-clause-attach count = 0 (DG未使用)
```

### T-10b — gate章以外でDG deriveDR未呼び出し
```
非gate章: window.DgEngine.deriveDR 呼び出しなし
→ _extractContentClause 未呼び出し
```

---

## T-11: Nested CONTENT_CLAUSE (P3)

**G-4.2 Design Review 修正:** G-4.1版では「contentClause=null またはdepth limit」だったが、設計レビューにより両レベルとも正しくレンダリングされる。

### T-11a — 2段ネストCC: 両レベルで contentClause 設定
```
// CC1 (fn=OBJ) → inner1 contains CC2 (fn=OBJ)
slot1.contentClause !== null
slot1.contentClause.innerDR.slots[j].fn === 'OBJECT'
  && slot1.contentClause.innerDR.slots[j].contentClause !== null  ← 重要: both levels
```

### T-11b — 2段ネストCC: 両レベルのsub-diagram描画
```
// outer .dg-cc-clause-attach の中に inner .dg-cc-clause-attach が存在
outerCcWrap.querySelector('.dg-cc-clause-attach') !== null
```

### T-11c — no infinite recursion / no stack overflow
```
NT全章ブラウザロード:
  console.error = 0
  Maximum call stack exceeded エラーなし
```

---

## T-12: JavaScript errors — zero tolerance (P1)

```
Gate chapters (JHN 1, MAT 5, MAT 28, EPH 2, PHP 2, COL 1, ROM 6):
  console.error count = 0
  console.warn (new, related to contentClause) = 0
  window.onerror = 0
```

---

## T-13: CSS / Visual (P2) — NEW in G-4.2

### T-13a — .dg-cc-clause-attach 存在
```
Gate chapterのCC fn=OBJ句でDOM:
  .dg-cc-clause-attach 要素が存在
  padding-left: 1.2rem (computed style)
  border-left: 2px solid (computed style)
```

### T-13b — .dg-cc-clause-label に conjunction text
```
.dg-cc-clause-label.textContent ∈ {'ὅτι', 'ἵνα', '内容節', ...}
```

### T-13c — inner DG classes intact
```
.dg-cc-clause 内に .dg-clause が存在
.dg-clause 内に .dg-main-line が存在
```

### T-13d — mobile 390px: overflow なし (visual check)
```
// viewport 390px での CC sub-diagram
.dg-cc-clause-attach: padding-left: .8rem (computed)
.dg-cc-clause-label: font-size: .7rem (computed)
→ 横スクロール可能 (overflow-x: auto 既存 .sd-view)
→ 表示崩れなし (visual audit)
```

---

## T-14: CC fn=SUBJECT / fn=COMPLEMENT bonus coverage (P3) — NEW in G-4.2

**G-4.2 Finding E:** `_extractContentClause` は fn を問わず `cn === 'CONTENT_CLAUSE'` に適用される。

### T-14a — CC fn=SUBJECT gets contentClause
```
dr.slots[i].fn === 'SUBJECT'
  && dr.slots[i].node.construction?.canonical === 'CONTENT_CLAUSE'
→ slot.contentClause !== null
```
(26 CC fn=SUBJECT cases の一部が gate章に含まれる場合)

### T-14b — Renderer: fn=SUBJECT CC の sub-diagram
```
// SUBJECT slot で contentClause あり
→ .dg-cc-clause-attach が SUBJECT slot の後に生成
→ visual: 主語節を pedestal として表示
```

---

## NT-Wide Coverage Check

実装後に `g4-comprehensive.cjs` 相当のスクリプトで確認。

```
Target:
  CC fn=OBJ with contentClause set: ≥ 542
    (311 SLOT_ROOT + 229 SLOT_IN_ADV + 2 SLOT_IN_COORD)
  CC fn=OBJ remaining flat-text (buried+invisible): ≤ 194
  Non-CC OBJECT slots with contentClause: 0
  contentClause.innerDR null for any set contentClause: 0
```

---

## Test Execution Order (G-4.3 実装後)

```
1. NT-wide DR check (Node.js script)
   → T-1a, T-1e, T-3a, T-5b, T-5d, T-11a confirmed
   → Coverage target ≥542 confirmed

2. Gate chapter browser check (desktop 1280px)
   → T-2 (all), T-1c, T-1d, T-6a, T-6b, T-12 confirmed
   → T-13 (CSS) confirmed

3. Gate chapter browser check (mobile 390px)
   → T-13d confirmed

4. Non-gate chapter check (ACT 2 etc.)
   → T-10 confirmed

5. Edge case check
   → T-4d (conjunction=null), T-8, T-9, T-11, T-14
```

---

## Known Gaps (not tested — accepted)

| Gap | Reason |
|-----|--------|
| Buried CC (145 cases): no sub-diagram | SR restructuring が必要; 本Scope外 |
| Invisible CC (39 cases): not displayed | 不確定な構造; 本Scope外 |
| connector=null for CC after IO (140 cases) | P6-G-2のConnector gap; 本Scope外 |

---

*テストマトリクス確定。G-4.3 実装後に実行する。*
