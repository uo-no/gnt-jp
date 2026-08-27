# P6-G.1 Relationship Coverage Matrix — SR → DR → Renderer Pipeline

**Date:** 2026-08-25
**Phase:** P6-G.1 NT-wide visual grammar gap re-audit (read-only)
**Scope:** All construction.canonical and function.canonical values → DG render output mapping

---

## 1. Pipeline Architecture

```
SR (SSOT)                    DR (dg-engine.js)              Renderer (index.html)
─────────────────────        ────────────────────────       ─────────────────────────
construction.canonical  →    deriveDR() → {slots,           _dgRenderSentence()
function.canonical            adverbialPhrases,             _dgRenderAdvPhrases()
children                      adverbialClauses,             _dgRenderSlots()
                              coordClauses}                 _dgRenderAdvClauses()
```

**L-0 boundary:** The renderer reads DR output only. No SR lookup, no fn inference.
**SR SSOT rule:** All routing decisions must trace to an explicit SR field.

---

## 2. fn.canonical → DR Slot Routing

| fn.canonical | DR target | dg-engine.js handler | Renderer output | Visual |
|---|---|---|---|---|
| SUBJECT | slots | MAIN_FN check | dg-slot (SUBJECT) | Baseline, leftmost |
| PREDICATE | slots | MAIN_FN check | dg-slot (PREDICATE) | Baseline, center |
| COPULA | slots | MAIN_FN check | dg-slot (COPULA) | Baseline |
| OBJECT | slots | MAIN_FN check | dg-slot (OBJECT) | Baseline, after pred |
| COMPLEMENT | slots | MAIN_FN check | dg-slot (COMPLEMENT) | Baseline, complement diagonal |
| INDIRECT_OBJECT | slots | MAIN_FN check | dg-slot (IO) | ⚠️ Baseline — no raised platform |
| SECOND_OBJECT | slots | MAIN_FN check | dg-slot (SO) | Baseline |
| AUX | slots | MAIN_FN check | dg-slot (AUX) | Baseline |
| ADVERBIAL | adverbialPhrases | non-MAIN_FN | dg-adv-item | Below baseline (diagonal if PP) |
| UNRESOLVED | — | — | (suppressed) | — |

**Gap:** `INDIRECT_OBJECT` currently rendered on baseline like `OBJECT`.
RK/Leedy requires a raised horizontal platform with vertical connector.
SR signal is explicit; no dg-engine.js change required for platform rendering.

---

## 3. construction.canonical → DR Construction Routing

### 3a. PREP_PHRASE (11,889 NT-wide)

| Sub-case | SR signal | DR route | Renderer | Visual | Status |
|---|---|---|---|---|---|
| PP, fn=ADVERBIAL, extractable | fn=ADVERBIAL + ch[0]=token | adverbialPhrases (ppPrep/ppNpNode set) | dg-pp-wrap + diagonal | Prep on diagonal, NP on horizontal | ✅ P6-F |
| PP, fn=ADVERBIAL, non-extractable | fn=ADVERBIAL + ch[0]≠token | adverbialPhrases (ppPrep=null) | dg-adv-row fallback | Text label | ✅ Fallback |
| PP, fn=MAIN_FN | fn ∈ MAIN_FN | slots | dg-slot (text) | Baseline slot text | ⚠️ No internal diagonal |
| PP, fn=null (nested) | fn=null, inside NP/phrase | parent node handles | parent displayText | Part of parent slot text | ✅ By design |

**Note:** PP fn=MAIN_FN (947 instances) — PP as subject/object is unusual. Current flat rendering
is defensible; internal prep diagonal inside slot would be an enhancement, not a correction.

### 3b. Clause-type constructions

| construction.canonical | NT count | fn distribution | DR route | Renderer | Visual | Status |
|---|---|---|---|---|---|---|
| SUBORDINATE_CLAUSE | 3,134 | ADVERBIAL (majority) | adverbialClauses | dg-adv-clause-attach | 従属節 L-bracket | ✅ |
| RELATIVE_CLAUSE | ~3,000 | RELATIVE | deriveRelativeConnectors | dg-rel-clause | Purple dashed + antecedent | ✅ P6-C |
| PARTICIPIAL_CLAUSE | 543 | ADVERBIAL | adverbialClauses | dg-adv-clause-attach | Italic 分詞節 label | ✅ |
| CONJOINED_CLAUSE | 5,574 | — | coordClauses | dg-coord-wrap | Left border | ✅ |
| CONTENT_CLAUSE | 908 | OBJ:736, ADV:54, SUBJ:26 | ⚠️ ALL → adverbialClauses | dg-adv-clause-attach | 従属節 (same as SUB) | ⚠️ DR ERROR |

**CONTENT_CLAUSE DR error detail:**
- `deriveClauseCore()` routes `CONTENT_CLAUSE` to `adverbialClauses` regardless of `fn.canonical`
- 736 instances with fn=OBJECT should route to the OBJECT slot (or a special OBJECT sub-panel)
- First-token markers: ὅτι (declarative), ἵνα (purpose/result) — both serve as complementizers
- Fix requires `dg-engine.js` change: route CONTENT_CLAUSE by fn (OBJECT → slots; ADVERBIAL → adverbialClauses)

### 3c. Nominal constructions

| construction.canonical | NT count | Current render | RK notation | Gap |
|---|---|---|---|---|
| ARTICULAR_NP | 15,619 | headDisplayText (article stripped) | N/A — transparent wrapper | ✅ Handled |
| NP_COMPLEX | 2,642 | headDisplayText | N/A — complex NP flattened | ✅ Handled |
| NOMINALIZED_CLAUSE | 2,008 | displayText (clause as text) | Square bracket or parenthesis notation | ⚠️ No notation |
| APPOSITION | 1,890 | headDisplayText (primary only) | Side leg or dashed = notation | ⚠️ No notation |
| CLAUSE_AS_NP | 886 | displayText | Similar to NOMINALIZED_CLAUSE | ⚠️ No notation |

### 3d. Modifier constructions (slot-level)

| construction.canonical | NT count | DR handler | Renderer | Visual | Status |
|---|---|---|---|---|---|
| GENITIVE_MOD | 7,281 | extractSlotModifiers | dg-slot-mod-zone | L-bracket label | ✅ |
| ADJ_MOD | 4,435 | extractSlotModifiers | dg-slot-mod-zone | Modifier label | ✅ |
| ADV_MOD | 663 | extractSlotModifiers | dg-slot-mod-zone | Modifier label | ✅ |
| DEMO_MOD | 574 | extractSlotModifiers | dg-slot-mod-zone | Modifier label | ✅ |
| NUM_MOD | 322 | extractSlotModifiers | dg-slot-mod-zone | Modifier label | ✅ |

---

## 4. INDIRECT_OBJECT Pipeline Detail

```
SR node:  { construction: null, function: { canonical: "INDIRECT_OBJECT" }, ... }
           ↓ dg-engine.js: deriveDR()
DR:       slots = [ ..., { fn: "INDIRECT_OBJECT", node: <SR_node>, ... }, ... ]
           ↓ index.html: _dgRenderSlots()
Renderer: <div class="dg-slot">
            <span class="dg-slot-text">αὐτῷ</span>
            <span class="dg-slot-fn">間接目的語</span>
          </div>
           ↓ Current visual:
SUBJECT | PREDICATE | OBJECT | INDIRECT_OBJECT   ← all on same baseline

RK/Leedy target:
SUBJECT | PREDICATE | OBJECT
                    |
                [IO platform]   ← raised horizontal, connected by vertical line
```

**Implementation path (index.html only):**
1. CSS: `.dg-io-platform` with `position: relative; margin-top: -.8rem; margin-left: <offset>; border-bottom: 1.5px`
2. JS: In `_dgRenderSlots()`, detect `slot.fn === 'INDIRECT_OBJECT'` → render as IO platform element
3. No dg-engine.js change needed; DR `slots` array already has IO with correct fn

---

## 5. APPOSITION Pipeline Detail

```
SR node:  { construction: { canonical: "APPOSITION" }, children: [NP1, NP2], ... }
           ↓ dg-engine.js: deriveDR() → slot handling
DR:       slot.node contains APPOSITION node; headDisplayText() selects first/head child
           ↓ index.html: _dgRenderSlots()
Renderer: <div class="dg-slot">
            <span class="dg-slot-text">Παῦλος</span>   ← only head, NP2 lost
          </div>

RK/Leedy target:
           Παῦλος
           ═══════ ἀπόστολος   ← dashed or = connector for apposition
```

**Detection path (index.html only):**
- `extractSlotModifiers()` or a new `extractApposition()` function reads SR children
- If any child has `cn=APPOSITION`, extract both NP1 (head) and NP2 (appositive)
- Render NP2 in a parallel visual element with dashed connector

---

## 6. Coverage Summary

| Category | NT Count | Rendered correctly | Gap |
|---|---|---|---|
| PP adverbial diagonal | 8,912 | 8,699 (97.6%) | 213 edge case fallback |
| Genitive mod bracket | 7,281 | ~7,281 | — |
| Relative clause | ~3,000 | ~3,000 | — |
| Subordinate clause label | 3,134 | 3,134 | — |
| IO on baseline (partial) | 2,662 | 2,662 | Platform missing |
| Coordination border | 855 | 855 | — |
| Participial clause | 543 | 543 | — |
| CONTENT_CLAUSE fn=OBJ | 736 | 0 correct | All misrouted to adverbial |
| APPOSITION | 1,890 | 0 visually marked | NP2 silently dropped |
| NOMINALIZED_CLAUSE | 2,008 | 0 visually marked | Rendered as flat text |

---

*P6-G.1 — read-only audit. No production code changes.*
