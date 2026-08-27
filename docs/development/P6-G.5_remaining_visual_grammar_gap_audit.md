# P6-G.5 — Remaining Visual Grammar Gap Audit (Post G-4.3)

**Date:** 2026-08-25  
**Phase:** P6-G.5 — Read-only audit  
**Baseline:** P6-G.4.3 (CONTENT_CLAUSE internal structure rendering) complete  
**Constraint:** No production code changes. Read-only.

---

## Dirty State at Audit Start

```
git status --short (pre-audit):
 M public/core/dg-engine.js
 M public/index.html
 M scripts/output/re-stageB-audit.json
 M scripts/output/re-stageD-audit.json
 M scripts/output/wallace_coverage.json
 M scripts/output/wallace_coverage.md
```

G-4.3 changes (`dg-engine.js`, `index.html`) are present and intentional. Not touched during this audit.

---

## 1. Audit Methodology

**SR dataset:** `public/assets/data/sr/{BOOK}/{ch}.json`  
**Engine:** `public/core/dg-engine.js` (G-4.3 implementation included)  
**DR derivation:** `DgEngine.deriveDR(sen.root)` per sentence  
**NT coverage:** 27 books, 260 chapters, 8,010 sentences

### Key clarification: G-1 description of G-4

G-1 audit described G-4 as "CONTENT_CLAUSE fn=OBJ misrouted to adverbialClauses (736 instances)".  
**G-4.1 corrected this:** the routing was not the issue. CC fn=OBJ WAS correctly in DR slots via MAIN_FN branch. The problem was flat text rendering of CC internal structure.  
G-4.3 fixed the rendering: CC fn=OBJ now shows internal structure as sub-diagram.

---

## 2. NT-Wide Baseline Statistics (Confirmed)

| Metric | G-1 Audit | G-5 Current | Delta |
|--------|-----------|-------------|-------|
| Sentences | 8,010 | 8,010 | 0 |
| APPOSITION (SR) | 1,890 | 1,890 | 0 |
| NOMINALIZED_CLAUSE (SR) | 2,008 | 2,008 | 0 |
| CLAUSE_AS_NP (SR) | 886 | 886 | 0 |
| CONTENT_CLAUSE (SR) | 908 | 908 | 0 |
| PREP_PHRASE (SR) | 11,889 | 11,889 | 0 |
| INDIRECT_OBJECT fn (SR) | 2,662 | 2,662 | 0 |

SR data unchanged. Delta = 0 across all constructions.

---

## 3. Implemented Features — Current State

### G-1: IO Raised Platform — IMPLEMENTED (P6-G-2/P6-G-3)

| Metric | Value |
|--------|-------|
| SR IO nodes | 2,662 |
| DR IO slots | 1,736 |
| SR→DR gap | 926 (34.6%, pre-existing; engine issue) |
| Platform rendered | 1,736 (all DR IO slots get platform) |
| With modifiers | 52 |
| G-4.3 regression | JHN 1=18, MAT 5=14 — PASS |

**Status:** IO raised platform fully operational. 34.6% SR→DR gap is pre-existing (dg-engine routing issue for certain clause wrapper structures).

---

### G-4: CONTENT_CLAUSE — IMPLEMENTED (P6-G-4.3)

| Category | Count |
|----------|-------|
| CC fn=OBJ (SR) | 736 |
| CC fn=OBJ rendered (contentClause SET) | 542 (73.6%) |
| CC fn=OBJ fallback (flat text) | 194 (26.4%) |
| CC all-fn rendered in MAIN_FN | 561 |
| CC fn=ADVERBIAL (correct adv behavior) | 54 |

**194 NOT_FOUND breakdown:**

| Type | Count | Structural Reason |
|------|-------|-------------------|
| Buried | 145 | CC fn=OBJ is child of non-CC parent (ARTICULAR_NP, NP_COMPLEX). Parent slot renders both as combined text via displayText(). SR restructuring would be required. |
| Invisible | 39 | CC fn=OBJ embedded in NOMINALIZED_CLAUSE, APPOSITION, ADJ_MOD. Outer construction doesn't reach DR MAIN_FN slots. |
| **Total NOT_FOUND** | **194** | |

**Classification of 194:**
- NOT "missed bugs" — both categories represent cases where the CC is structurally subordinated within another construction
- Buried (145): correct flat text fallback; the parent node renders both head and CC as combined text
- Invisible (39): the containing construction (NOMINALIZED_CLAUSE etc.) is itself not in a DR slot reachable as MAIN_FN
- Both are SR-level limitations: fixing requires SR restructuring or deeper DR extraction

**CC fn=ADVERBIAL (54):** Correctly routed to adverbialClauses (shown as 従属節). These are genuine adverbial content clauses (conditional, purpose modifier clauses), not complement clauses. Correct behavior.

---

### PP Diagonal — P6-F (Verified Regression PASS)

| Metric | Value |
|--------|-------|
| PP diagonal (NT-wide DR) | 4,918 |
| PP fallback (adv text) | 3,920 |
| PP total adv phrases | 8,838 |

Note: 4,918 includes only PP in root clause adverbialPhrases and adverbialClauses. PP inside contentClause.innerDR sub-diagrams are rendered correctly but not separately counted here (measurement gap, not rendering gap). Gate chapter regression confirmed: PP unchanged (JHN 1=22, MAT 5=25).

---

## 4. Gap Analysis — Remaining Items

### G-2: APPOSITION Notation

**Volume:** 1,890 SR / 467 in DR (24.7% reach DR as direct slot nodes)

| fn | SR Count | DR Count (est.) |
|----|----------|-----------------|
| fn=SUBJECT | 355 | ~152 |
| fn=other/null | 1,231 | ~0 (buried in modifier NPs) |
| fn=OBJECT | 200 | ~56 |
| fn=COMPLEMENT | 75 | ~20 |
| fn=ADVERBIAL | 29 | ~27 |

**Why 75.3% don't reach DR:**
- 1,231 APPOSITION nodes have fn=other/null → embedded inside other NP constructions (ARTICULAR_NP, NP_COMPLEX, GENITIVE_MOD) as modifiers → parent node renders as slot, apposition buried inside
- Pattern: `ARTICULAR_NP(fn=OBJECT) → child: APPOSITION(fn=null)` → DR sees ARTICULAR_NP as slot, APPOSITION buried

**For 467 in DR (direct slot nodes):**
- Current rendering: `headDisplayText(APPOSITION_node)` = `displayText()` = ALL tokens (head NP + appositive NP) as flat text string
- Visual gap: no distinction between head NP and appositive NP
- RK/Leedy convention: appositive on parallel horizontal segment with dashed = connector

**Gate chapters:** 70 total APPOSITION (JHN 1: 11, MAT 5: 3, MAT 28: 2, EPH 2: 14, PHP 2: 8, COL 1: 27, ROM 6: 5)  
Estimated in DR as direct slots: ~17 (24.7% of 70)

**L-0 risk:** NONE — cn=APPOSITION is explicit SSOT. Children[0]=head, Children[1]=appositive.  
**Engine change required:** NO — renderer only  
**Implementation approach:** Detect `slot.node.construction.canonical === 'APPOSITION'` → extract first and subsequent children → render head as slot text, appositive(s) as parallel sub-element with "=" visual connector

---

### G-3: NOMINALIZED_CLAUSE Notation

**Volume:** 2,008 SR / 542 in DR (27.0% reach DR as direct slot nodes)

| fn | SR Count | DR Count |
|----|----------|----------|
| fn=SUBJECT | 466 | ~171 |
| fn=other/null | 1,237 | ~0 (buried) |
| fn=OBJECT | 156 | ~33 |
| fn=ADVERBIAL | 98 | ~69 (in adv clause slots) |
| fn=COMPLEMENT | 51 | ~19 |
| fn=AUX | ~0 | ~35 |

**Why 73.0% don't reach DR:**
- 1,237 NOMINALIZED_CLAUSE with fn=other/null: embedded inside clause or NP constructions
- Pattern: `ARTICULAR_NP(fn=SUBJECT) → child: NOMINALIZED_CLAUSE(fn=null)` → DR sees ARTICULAR_NP as slot, NOMINALIZED_CLAUSE buried
- Note: The τό + infinitive pattern (infinitive nominalized as NP) commonly appears this way

**For 542 in DR (direct slot nodes):**
- Current rendering: `displayText(NOMINALIZED_CLAUSE_node)` = clause text as flat string
- Visual gap: no notation indicating the noun slot contains a clause
- RK/Leedy convention: bracket notation `[...clause text...]` or box notation

**Gate chapters:** 47 total (JHN 1: 10, MAT 5: 12, MAT 28: 4, EPH 2: 6, PHP 2: 4, COL 1: 8, ROM 6: 3)  
Estimated in DR: ~13 (27.0% of 47)

**L-0 risk:** NONE — cn=NOMINALIZED_CLAUSE is explicit SSOT  
**Engine change required:** NO — renderer only  
**Implementation approach:** Detect `slot.node.construction.canonical === 'NOMINALIZED_CLAUSE'` → add bracket CSS class to slot text element → visual: `[τὸ θέλειν]`

---

### G-3b: CLAUSE_AS_NP — PARTIAL (P6-C handles relative clause component)

**Volume:** 886 SR / 194 in DR (21.9% reach DR)

**Current state (P6-C implemented):**
- `_extractEmbeddedRelClauses()` is called when cn=CLAUSE_AS_NP
- The relative clause child of CLAUSE_AS_NP is extracted and rendered separately (purple dashed)
- Head tokens are narrowed to exclude relative clause tokens (headSIs)

**Remaining gap:** No notation for the nominalized status of CLAUSE_AS_NP itself. The slot shows the head tokens (after removing relative clause tokens) without indicating it's a nominalized clause. Similar to NOMINALIZED_CLAUSE gap but smaller volume.

**Assessment:** CLAUSE_AS_NP is the most structurally treated of the remaining gaps (P6-C already provides partial notation). Pure visual enhancement of remaining gap is low priority.

---

### G-5 (New): OBJECT2 / SECOND_OBJECT — Engine fn Mismatch

**Volume:** 311 SR nodes with fn=OBJECT2 / 0 in DR

**Discovery:** SR stores second object function as `fn.canonical = 'OBJECT2'`. The dg-engine's MAIN_FN set contains `'SECOND_OBJECT'` (not `'OBJECT2'`). Result: `MAIN_FN.has('OBJECT2')` = false → 311 OBJECT2 nodes fall through the MAIN_FN check and never appear in DR slots.

**Evidence:**
- SR walkSR fn distribution: OBJECT2 = 311 (confirmed)
- DR walkDR fn=SECOND_OBJECT: 0 (confirmed)
- Renderer has label: `OBJECT2: '第二目的語'` → renderer anticipates OBJECT2 fn value

**Root cause:** MAIN_FN set uses `'SECOND_OBJECT'` but SR uses `'OBJECT2'`. Engine and SR are out of sync on this fn label.

**Fix required:** Add `'OBJECT2'` to MAIN_FN in dg-engine.js (or add mapping). This requires dg-engine.js change.

**Priority for next phase:** LOW — 311 NT-wide (small volume); secondary notation missing; dg-engine.js change required.

---

## 5. Regression Verification

| Feature | Baseline | Current | Status |
|---------|----------|---------|--------|
| PP diagonal | P6-F | JHN1=22, MAT5=25 | PASS |
| IO platform | P6-G-2 | JHN1=18, MAT5=14 | PASS |
| Relative clause P6-C | P6-C | JHN1=14 | PASS |
| SD fallback | — | ACT2: IO=0, CC=0 | PASS |
| Mobile 390px | — | JHN1: CC=2, IO=18 | PASS |
| Console errors | — | 0 (all gate chapters) | PASS |

---

## 6. Gate Chapter Updated Stats (SR-level)

| Chapter | APPOS | NOMC | CANP | CC | IO |
|---------|-------|------|------|----|----|
| JHN 1 | 11 | 10 | 10 | 4 | 22 |
| MAT 5 | 3 | 12 | 0 | 13 | 20 |
| MAT 28 | 2 | 4 | 3 | 4 | 12 |
| EPH 2 | 14 | 6 | 4 | 1 | 3 |
| PHP 2 | 8 | 4 | 1 | 3 | 2 |
| COL 1 | 27 | 8 | 12 | 1 | 5 |
| ROM 6 | 5 | 3 | 1 | 5 | 9 |
| **Total** | **70** | **47** | **31** | **31** | **73** |

---

## 7. Summary — Before/After G-4.3

| Gap | Before G-4.3 | After G-4.3 |
|-----|--------------|-------------|
| G-1 IO platform | IMPLEMENTED (P6-G-2) | PASS (no change) |
| G-4 CC fn=OBJ | Flat text (736 wrong render) | Sub-diagram (542 correct, 194 fallback) |
| G-2 APPOSITION | GAP: 467 in DR, flat text | GAP: unchanged |
| G-3 NOMINALIZED | GAP: 542 in DR, flat text | GAP: unchanged |
| G-3b CLAUSE_AS_NP | PARTIAL (P6-C rel clause) | PARTIAL: unchanged |
| G-5 OBJECT2 | ENGINE GAP: 0 in DR | ENGINE GAP: unchanged |
| PP diagonal | P6-F IMPLEMENTED | PASS (regression PASS) |

---

*P6-G.5 — read-only audit. No production code changes.*
