# P6-G.5 — Current Relationship Coverage Matrix (Post G-4.3)

**Date:** 2026-08-25  
**Phase:** P6-G.5 — Read-only audit  
**Supersedes:** `P6-G.1_relationship_coverage_matrix.md` (post P6-F baseline)  
**Updates:** G-2 (IO platform), G-4.3 (CONTENT_CLAUSE) implemented since G-1

---

## 1. Pipeline Architecture

```
SR (SSOT)                     DR (dg-engine.js)                  Renderer (index.html)
─────────────────────         ─────────────────────────          ──────────────────────────────
function.canonical     →      deriveDR(sen.root)                 _dgRenderSentence()
construction.canonical        {slots,                            _dgRenderMainLine()
children                       adverbialPhrases,                 _dgRenderClause()
                               adverbialClauses,                 _dgRenderAdvPhrases()
                               coordClauses}                     _dgRenderSlotModZone()
```

**L-0 boundary:** Renderer reads DR output only. No SR lookup at render time.  
**SR→DR boundary:** All routing decisions trace to explicit SR fields.

---

## 2. fn.canonical → DR Slot Routing (Current State)

| fn.canonical | SR Count | DR Count | dg-engine.js handler | Renderer output | Visual | Status |
|---|---|---|---|---|---|---|
| SUBJECT | 11,116 | high | MAIN_FN branch | dg-slot | Baseline, leftmost | ✅ |
| PREDICATE | 25,110 | high | MAIN_FN branch | dg-slot | Baseline, center | ✅ |
| COPULA | 2,589 | high | MAIN_FN branch | dg-slot | Baseline | ✅ |
| OBJECT | 13,693 | high | MAIN_FN branch | dg-slot | Baseline, after pred | ✅ |
| COMPLEMENT | 3,604 | high | MAIN_FN branch | dg-slot | Baseline, complement diagonal | ✅ |
| INDIRECT_OBJECT | 2,662 | 1,736 | MAIN_FN branch | dg-io-wrap (platform) | Raised platform above baseline | ✅ P6-G-2 |
| AUX | 1,071 | high | MAIN_FN branch | dg-slot | Baseline | ✅ |
| ADVERBIAL | 21,541 | high | adverbialPhrases | dg-adv-item | Below baseline (PP diagonal if PREP_PHRASE) | ✅ P6-F |
| OBJECT2 | 311 | **0** | ❌ Not in MAIN_FN | — | — | ⚠️ ENGINE GAP |
| UNRESOLVED | 6 | — | — | (suppressed) | — | N/A |

**OBJECT2 note:** SR uses `fn.canonical = 'OBJECT2'` but engine's MAIN_FN contains `'SECOND_OBJECT'`. Mismatch causes all 311 OBJECT2 nodes to miss MAIN_FN routing. Renderer has label `OBJECT2: '第二目的語'` (anticipates OBJECT2). Fix requires dg-engine.js change.

---

## 3. construction.canonical → DR/Renderer (Current State)

### 3a. Clause-type constructions

| construction.canonical | SR Count | DR Route | Renderer | Visual | Status |
|---|---|---|---|---|---|
| CONJOINED_CLAUSE | 5,574 | coordClauses | dg-coord-wrap | Left border | ✅ |
| SUBORDINATE_CLAUSE | 3,134 | adverbialClauses | dg-adv-clause-attach | 従属節 L-bracket | ✅ |
| RELATIVE_CLAUSE | ~3,000 | P6-C connector | dg-rel-clause | Purple dashed + antecedent | ✅ P6-C |
| PARTICIPIAL_CLAUSE | 543 | adverbialClauses | dg-adv-clause-attach | Italic 分詞節 label | ✅ |
| **CONTENT_CLAUSE fn=OBJ** | **736** | **MAIN_FN slots → contentClause** | **dg-cc-clause-attach** | **Conjunction label + sub-diagram** | **✅ P6-G-4.3** |
| CONTENT_CLAUSE fn=ADV | 54 | adverbialClauses | dg-adv-clause-attach | 従属節 (correct) | ✅ |
| CONTENT_CLAUSE fn=SUBJ | 26 | MAIN_FN slots → contentClause | dg-cc-clause-attach | Sub-diagram | ✅ P6-G-4.3 |
| CONTENT_CLAUSE fn=other | 92 | varies | varies | varies | ✅/⚠️ |

**CONTENT_CLAUSE fn=OBJ NOT_FOUND (194):**

| Subtype | Count | DR Route | Visual | Reason |
|---------|-------|----------|--------|--------|
| Buried (parent non-CC) | 145 | Parent slot text | Flat text (correct fallback) | SR structural: CC child of NP |
| Invisible (outside DR path) | 39 | Not in DR | Not rendered | SR structural: CC in NOMC/APPOS/ADJMOD |

---

### 3b. Nominal constructions

| construction.canonical | SR Count | In DR (slots) | DR Coverage | Current render | Gap | Status |
|---|---|---|---|---|---|---|
| ARTICULAR_NP | 15,619 | high | high | headDisplayText (article handling) | None | ✅ |
| NP_COMPLEX | 2,642 | high | high | headDisplayText | None | ✅ |
| APPOSITION | 1,890 | **467** | **24.7%** | displayText (head+appositive as flat text) | No "=" notation | ⚠️ G-2 |
| NOMINALIZED_CLAUSE | 2,008 | **542** | **27.0%** | displayText (clause as flat text) | No bracket notation | ⚠️ G-3 |
| CLAUSE_AS_NP | 886 | **194** | **21.9%** | headDisplayText + P6-C rel clause | Nominalized status notation | ⚠️ PARTIAL |

**Why 73–78% of APPOSITION/NOMINALIZED_CLAUSE/CLAUSE_AS_NP don't reach DR:**
- fn=other/null cases (1,231 APPOS / 1,237 NOMC / 583 CANP): embedded inside parent NP constructions (ARTICULAR_NP, NP_COMPLEX, GENITIVE_MOD) as modifiers. Parent construction appears as slot; nested APPOS/NOMC is subsumed by `displayText(parent)`.
- These can only be surfaced with deeper per-slot SR tree traversal.

---

### 3c. Modifier constructions (slot-level)

| construction.canonical | SR Count | DR handler | Renderer | Visual | Status |
|---|---|---|---|---|---|
| GENITIVE_MOD | 7,281 | extractSlotModifiers | dg-slot-mod-zone | L-bracket label | ✅ |
| ADJ_MOD | 4,435 | extractSlotModifiers | dg-slot-mod-zone | Modifier label | ✅ |
| ADV_MOD | 663 | extractSlotModifiers | dg-slot-mod-zone | Modifier label | ✅ |
| DEMO_MOD | 574 | extractSlotModifiers | dg-slot-mod-zone | Modifier label | ✅ |
| NUM_MOD | 322 | extractSlotModifiers | dg-slot-mod-zone | Modifier label | ✅ |

---

### 3d. PP construction

| Sub-case | SR (est.) | DR route | Renderer | Visual | Status |
|---|---|---|---|---|---|
| PREP_PHRASE fn=ADVERBIAL, extractable | ~8,748 | adverbialPhrases (ppPrep set) | dg-pp-wrap + diagonal | Prep diagonal + NP horizontal | ✅ P6-F |
| PREP_PHRASE fn=ADVERBIAL, non-extractable | ~164 | adverbialPhrases (ppPrep=null) | dg-adv-row | Text label | ✅ fallback |
| PREP_PHRASE fn=MAIN_FN | ~947 | MAIN_FN slots | dg-slot | Slot text | ✅ (acceptable) |
| PREP_PHRASE fn=null (nested) | ~2,030 | parent handles | parent displayText | Part of parent text | ✅ by design |

---

## 4. INDIRECT_OBJECT Pipeline (Current — Implemented)

```
SR: { function: { canonical: "INDIRECT_OBJECT" }, ... }
 ↓ dg-engine.js: MAIN_FN branch → dr.slots[i] = {fn: "INDIRECT_OBJECT", ...}
 ↓ index.html: _dgRenderMainLine() detects fn==='INDIRECT_OBJECT'
   → extracted from main line flex-row
   → rendered as .dg-io-wrap above main line

Result:
        [IO text]
        [間接目的語]
        ─────────      ← .dg-io-platform
             |
             |         ← .dg-io-stalk
SUBJ | PRED | OBJ      ← .dg-main-line
```

**Coverage:** 1,736 / 2,662 SR (65.2%). 926 gap: pre-existing engine routing issue for certain clause wrapper structures.

---

## 5. CONTENT_CLAUSE Pipeline (Current — Implemented G-4.3)

```
SR: { construction: {canonical: "CONTENT_CLAUSE"}, function: {canonical: "OBJECT"}, children: [...] }
 ↓ dg-engine.js: MAIN_FN branch → _extractContentClause(child)
   → {conjunction: "ὅτι", innerDR: DR_Clause{slots:[SUBJECT,PREDICATE,...], ...}}
   → dr.slots[i] = {fn: "OBJECT", contentClause: {conjunction, innerDR}, ...}
 ↓ index.html: _dgRenderMainLine()
   → if (slot.contentClause) textEl = conjunction (e.g., "ὅτι")
   → else headDisplayText() fallback
 ↓ index.html: _dgRenderClause()
   → .dg-cc-clause-attach (border-left)
     .dg-cc-clause-label ("ὅτι")
     _dgRenderClause(innerDR) → [SUBJECT slot] | [PREDICATE slot] | [OBJECT slot] ...

Coverage: 542/542 fn=OBJ in MAIN_FN (100%). 194 fallback (correct).
```

---

## 6. APPOSITION Pipeline (Current — GAP)

```
SR: { construction: {canonical: "APPOSITION"}, function: {canonical: "SUBJECT"}, 
      children: [NP1(head), NP2(appositive)] }
 ↓ dg-engine.js: MAIN_FN branch → mainSlots.push({fn: "SUBJECT", node: APPOSITION_node, ...})
   → APPOSITION appears as slot.node (467 cases; 24.7% of 1,890)
 ↓ index.html: _dgRenderMainLine()
   → textEl.textContent = headDisplayText(APPOSITION_node, null)
   → = displayText(APPOSITION_node) = "NP1_text NP2_text" (all tokens concatenated)

Visual: "Παῦλος ἀπόστολος" as flat text — no "=" or parallel notation
Target: "Παῦλος ═══ ἀπόστολος" (parallel with dashed connector)

Gap: NP2 (appositive) is rendered in text but not visually distinguished.
Coverage gap: 1,423/1,890 (75.3%) never reach DR as direct slot nodes.
```

---

## 7. NOMINALIZED_CLAUSE Pipeline (Current — GAP)

```
SR: { construction: {canonical: "NOMINALIZED_CLAUSE"}, function: {canonical: "SUBJECT"},
      children: [tokens forming nominalized clause] }
 ↓ dg-engine.js: MAIN_FN branch → mainSlots.push({fn: "SUBJECT", node: NOMINALIZED_CLAUSE_node, ...})
   → NOMINALIZED_CLAUSE appears as slot.node (542 cases; 27.0% of 2,008)
 ↓ index.html: _dgRenderMainLine()
   → textEl.textContent = headDisplayText(NOMINALIZED_CLAUSE_node, null)
   → = displayText() = "τὸ θέλειν" (all tokens, flat)

Visual: "τὸ θέλειν" as plain text — no bracket notation
Target: "[τὸ θέλειν]" (bracket indicating nominalized clause status)

Gap: No visual signal that the slot contains a clause, not a NP.
Coverage gap: 1,466/2,008 (73.0%) buried in parent NP constructions.
```

---

## 8. OBJECT2 Pipeline (Current — ENGINE GAP)

```
SR: { function: {canonical: "OBJECT2"}, ... }
 ↓ dg-engine.js: MAIN_FN.has("OBJECT2") → false (MAIN_FN has "SECOND_OBJECT" not "OBJECT2")
   → OBJECT2 falls to non-MAIN_FN handler
   → NOT added to dr.slots
   → 311 SR nodes → 0 DR slots

Renderer has label: OBJECT2: '第二目的語' (ready, but never reached)

Fix: Add 'OBJECT2' to MAIN_FN set in dg-engine.js
     OR normalize fn value: 'OBJECT2' → 'SECOND_OBJECT' in engine
```

---

## 9. Coverage Summary

| Relationship | SR Count | In DR | Renderer | Visual Grammar | Status |
|---|---|---|---|---|---|
| Subject | 11,116 | ✅ high | dg-slot | Baseline leftmost | ✅ |
| Predicate | 25,110 | ✅ high | dg-slot | Baseline center | ✅ |
| Object (NP) | 13,693 | ✅ high | dg-slot | Baseline after pred | ✅ |
| Complement | 3,604 | ✅ high | dg-slot | Baseline diagonal | ✅ |
| Copula | 2,589 | ✅ high | dg-slot | Baseline | ✅ |
| IO Raised Platform | 2,662 | 1,736 | dg-io-wrap | Platform above baseline | ✅ P6-G-2 |
| PP Adverbial Diagonal | ~8,912 | ~4,918+ | dg-pp-wrap | Prep diagonal | ✅ P6-F |
| Genitive modifier | 7,281 | ✅ high | dg-slot-mod-zone | L-bracket | ✅ |
| Adj/Adv modifier | 5,098 | ✅ high | dg-slot-mod-zone | Modifier label | ✅ |
| Relative clause | ~3,000 | ✅ high | dg-rel-clause | Purple dashed | ✅ P6-C |
| Coordination | 855 | ✅ high | dg-coord-wrap | Left border | ✅ |
| Participial clause | 543 | ✅ high | dg-adv-clause-attach | Italic label | ✅ |
| Subordinate clause | 3,134 | ✅ high | dg-adv-clause-attach | 従属節 bracket | ✅ |
| **CC fn=OBJ internal** | **736** | **542** | **dg-cc-clause-attach** | **Sub-diagram** | **✅ P6-G-4.3** |
| **Apposition** | **1,890** | **467** | **flat text** | **❌ No "=" notation** | **⚠️ GAP** |
| **Nominalized clause** | **2,008** | **542** | **flat text** | **❌ No bracket** | **⚠️ GAP** |
| CLAUSE_AS_NP | 886 | 194 | partial (P6-C) | Partial (rel clause shown) | ⚠️ PARTIAL |
| OBJECT2 | 311 | **0** | — | ❌ Not rendered | ⚠️ ENGINE GAP |

---

*P6-G.5 — read-only. No production code changes.*
