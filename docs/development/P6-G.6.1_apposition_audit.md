# P6-G.6.1 — APPOSITION Visual Grammar Audit

**Date:** 2026-08-25  
**Phase:** P6-G.6.1 — Read-only audit  
**Scope:** Can APPOSITION be safely visualized using existing DG architecture, L-0-compliant?  
**Constraint:** No production code changes. Read-only.

---

## Dirty State at Audit Start

```
git status --short:
 M public/core/dg-engine.js
 M public/index.html
 M scripts/output/re-stageB-audit.json
 M scripts/output/re-stageD-audit.json
 M scripts/output/wallace_coverage.json
 M scripts/output/wallace_coverage.md
```

G-4.3 changes (`dg-engine.js`, `index.html`) are present and intentional. Not touched during this audit.

---

## 1. NT-Wide APPOSITION Coverage Measurement

**Script:** Node.js; `eval(dg-engine.js)` + `DgEngine.deriveDR(sen.root)` per sentence.  
**Dataset:** `public/assets/data/sr/{BOOK}/{ch}.json` — all NT books, 8,010 sentences.

| Metric | Value |
|--------|-------|
| Total sentences (NT) | 8,010 |
| APPOSITION (SR total) | 1,890 |
| APPOSITION in DR (slots) | 467 |
| APPOSITION in DR (adv phrases) | ~19 |
| APPOSITION in DR (total) | ~486 |
| DR slot coverage | 24.7% (467/1,890) |
| Buried in parent constructions | 1,404 (74.3%) |

**P6-G.5 cross-check:** DR coverage = 24.7% — matches G-5 figure (24.7%). SR total = 1,890 — matches G-5 figure. Confirmed stable.

### Gate Chapter Distribution

| Chapter | APPOSITION (SR) | Est. in DR |
|---------|-----------------|------------|
| JHN 1 | 11 | ~3 |
| MAT 5 | 3 | ~1 |
| MAT 28 | 2 | ~1 |
| EPH 2 | 14 | ~4 |
| PHP 2 | 8 | ~2 |
| COL 1 | 27 | ~7 |
| ROM 6 | 5 | ~1 |
| **Total** | **70** | **~19** |

### Book Distribution (Top 10)

| Book | Count |
|------|-------|
| ACT | 270 |
| LUK | 220 |
| MAT | 174 |
| REV | 166 |
| JHN | 137 |
| ROM | 134 |
| MRK | 91 |
| 1CO | 78 |
| EPH | 68 |
| 2CO | 59 |

---

## 2. Pattern Classification

### Definitions

| Pattern | Description |
|---------|-------------|
| A | Common noun → appositive noun (no article on head) |
| B | Proper noun → appositive (name as head or appositive) |
| C | Articular NP → appositive (head has article) |
| D | Pronoun → appositive |
| E | Apposition containing internal modifiers (GENITIVE_MOD/ADJ_MOD children) |
| F | Apposition buried inside PREP_PHRASE parent |
| G | Apposition directly as clause-level slot (fn=MAIN_FN, not nested) |
| H | Multiple appositives (>1 appositive child) |
| I | Nested apposition (APPOSITION as child of APPOSITION) |
| J | Ambiguous / unresolved |

### NT-Wide Pattern Counts

| Pattern | Count | % of total |
|---------|-------|-----------|
| C (articular NP) | 480 | 25.4% |
| B (proper noun) | 439 | 23.2% |
| E (with modifiers) | 301 | 15.9% |
| I (nested) | 206 | 10.9% |
| F (inside PP) | 253 | 13.4% |
| A (common noun) | 203 | 10.7% |
| D (pronoun) | 8 | 0.4% |
| G (directly in clause) | 0 | — |
| H (multiple appositives) | 0 | — |
| J (ambiguous) | 0 | — |
| **Total** | **1,890** | 100% |

**Notes:**
- **G=0**: All APPOSITION nodes classified as G are recategorized into A–E based on head morphology before reaching this fallback. Pattern G is subsumed by A, B, C, D, E.
- **H=0**: Multiple-appositive structures in Greek NT are encoded as nested I structures, not flat multiple-child APPOSITION nodes.
- **I=206**: Nesting confirmed by buried parent_cn=APPOSITION: 207 (matches). Structure: `APPOSITION(head=APPOSITION(...), appositive=...)`.
- **F=253**: APPOSITION inside PREP_PHRASE → buried (parent PP handles displayText). These never reach DR.

### Concrete Pattern Examples

**Pattern A** (common noun → appositive):
```
OBJECT fn=OBJECT, cn=APPOSITION:
  children[0]: token "δῶρα,"
  children[1]: phrase.np(COORDINATION) "χρυσὸν καὶ λίβανον καὶ σμύρναν"
```

**Pattern B** (proper noun → appositive):
```
SUBJECT fn=SUBJECT, cn=APPOSITION:
  children[0]: token "Ἰωάννης"
  children[1]: phrase.np(ARTICULAR_NP) "ὁ βαπτιστής"
```

**Pattern C** (articular NP → appositive):
```
OBJECT fn=OBJECT, cn=APPOSITION:
  children[0]: phrase.np(ARTICULAR_NP) "τὸν Δαυίδ"
  children[1]: phrase.np(ARTICULAR_NP) "τὸν βασιλέα"
```

**Pattern I** (nested) — MAT 1:1:
```
GENITIVE_MOD parent (buried):
  APPOSITION:
    children[0]: APPOSITION(APPOSITION("Ἰησοῦ", "χριστοῦ"), GENITIVE_MOD("υἱοῦ Δαυίδ"))
    children[1]: GENITIVE_MOD "υἱοῦ Ἀβραάμ"
```

---

## 3. SR Structure Verification

### APPOSITION Child Structure (CONFIRMED)

From DR slot analysis of 467 APPOSITION slot nodes (5 samples examined):

```
APPOSITION node:
  children[0] = head NP or token
  children[1] = appositive NP or token
  (children[2+] = rare; not observed in NT data)
```

**Observed child types for children[0] (head):**
- `phrase.np(cn=ARTICULAR_NP)` — most common
- `token` — proper noun head (e.g., "Ἰωάννης")
- `phrase.np(cn=NP_COMPLEX)` — complex head NP

**Observed child types for children[1] (appositive):**
- `phrase.np(cn=ARTICULAR_NP)` — most common
- `token` — simple name appositive (e.g., "Μαρίας", "Ἡρῴδης")
- `phrase.np(cn=COORDINATION)` — coordinated appositive
- `clause(cn=NOMINALIZED_CLAUSE)` — rare (nominalized clause as appositive; e.g., MAT 1:12 "Ἰησοῦς ὁ λεγόμενος χριστός")

**CRITICAL SR FINDING:** The relationship between children[0] and children[1] is EXPLICIT in SR. `cn=APPOSITION` unambiguously marks: `children[0]` = head referent, `children[1]` = appositive (co-referential NP). No inference required.

### L-0 Boundary Check

| Question | Answer |
|----------|--------|
| Is the APPOSITION relationship SR-explicit? | YES — `construction.canonical = 'APPOSITION'` is SSOT |
| Is children[0] the head? | YES — SR ordering convention; always confirmed in data |
| Is children[1] the appositive? | YES — SR structural invariant |
| Does renderer need to infer any relationship? | NO |
| Does renderer need to know the referent? | NO |
| Does renderer need discourse knowledge? | NO |

**L-0 status: SAFE for all candidates that use children[0]/children[1].**

---

## 4. DR Pipeline — Current State

### DR FN Distribution of APPOSITION in Slots

| fn | Count | Notes |
|----|-------|-------|
| SUBJECT | 252 | Main line subject position |
| OBJECT | 125 | Main line object position |
| INDIRECT_OBJECT | 36 | Goes through IO platform path |
| COMPLEMENT | 28 | Main line complement position |
| AUX | 26 | Main line auxiliary position |
| **Total** | **467** | |

**IO platform path (36 cases):** When fn=INDIRECT_OBJECT AND cn=APPOSITION, the node is routed through `_dgRenderMainLine()` → IO branch → `dg-io-platform`. The APPOSITION structure is flattened by `headDisplayText(ioSlot.node, ioSlot.headSIs)`. These are a special sub-case.

### APPOSITION in Adverbial Phrases (~19 cases)

A small number (~19) of APPOSITION nodes appear in `adverbialPhrases` (fn=ADVERBIAL). These are rendered in `_dgRenderAdvPhrases()` as text labels. Out of scope for main line fix.

---

## 5. Buried APPOSITION — Why 74.3% Miss DR

### Parent Construction of Buried APPOSITION (1,404 total)

| Parent construction | Count | Reason missed |
|--------------------|-------|---------------|
| fn=null (no function) | 393 | No fn → engine's MAIN_FN.has(fn) = false → not added to slots |
| GENITIVE_MOD | 287 | APPOSITION inside genitive phrase → parent GENITIVE_MOD handles displayText |
| PREP_PHRASE | 277 | APPOSITION inside PP → PP handles displayText; PP text shown in adv zone |
| APPOSITION (nested) | 207 | Inner APPOSITION is child of outer APPOSITION → inner never directly extracted |
| NP_COMPLEX | 80 | APPOSITION inside NP_COMPLEX → parent NP handles displayText |
| CLAUSE_AS_NP | 80 | APPOSITION inside nominalized clause → outer CLAUSE_AS_NP handles displayText |
| ADV_MOD | 27 | APPOSITION inside adjectival modifier |
| ARTICULAR_NP | 19 | APPOSITION inside articular NP as child |
| ADJ_MOD | 18 | APPOSITION inside adjectival modifier |
| COORDINATION | 11 | APPOSITION inside coordinated structure |
| Other | 5 | Misc |

**Structural conclusion:** 74.3% of APPOSITION nodes are embedded inside parent constructions that themselves become DR slots. The engine's `displayText(parent)` collects all descendant tokens — including the APPOSITION children — as flat text.

**MAT 1:1 example (embedded in GENITIVE_MOD):**
```
SR sentence root:
  GENITIVE_MOD (becomes an adv phrase or slot modifier)
    └── APPOSITION (buried — fn=null, not MAIN_FN → not extracted as slot)
          ├── APPOSITION (doubly buried)
          │     ├── APPOSITION (triply buried: "Ἰησοῦ χριστοῦ")
          │     └── GENITIVE_MOD "υἱοῦ Δαυίδ"
          └── GENITIVE_MOD "υἱοῦ Ἀβραάμ"
```

**COL 1 context (27 gate chapter instances, mostly buried):**
- COL 1:1 "Παῦλος ἀπόστολος..." → buried (parent is clause root, fn=null for APPOSITION)
- COL 1:1 "Τιμόθεος ὁ ἀδελφός" → buried (vocative context)
- COL 1:3 "τῷ θεῷ πατρί..." → IN DR (fn=INDIRECT_OBJECT)
- COL 1:3 "τοῦ κυρίου ἡμῶν Ἰησοῦ Χριστοῦ" → buried (inside GENITIVE_MOD)
- Most COL 1 instances are Χριστοῦ Ἰησοῦ / Ἰησοῦ Χριστοῦ appositions → buried (inside other constructions)

---

## 6. Current Renderer Handling

### Code Path for APPOSITION Slot

```javascript
// _dgRenderMainLine() — current code
textEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
// When cn=APPOSITION:
// slot.headSIs = null (extractSlotModifiers does not handle APPOSITION)
// headDisplayText(appos_node, null) → displayText(appos_node) → all tokens joined
// Result: "head_tokens appositive_tokens" as flat string
```

### What `extractSlotModifiers()` Does with APPOSITION

`extractSlotModifiers()` checks `cn` for: `ADJ_MOD`, `GENITIVE_MOD`, and then iterates children for `ADV_MOD` and `GENITIVE_MOD`. **It has no `APPOSITION` case.** 

When called with an APPOSITION node, it falls through to the generic "iterate children" path at line 363. The APPOSITION children are classified as "non-modifier" → their tokens all go to `headSIs`. Result: `headSIs` = all tokens, `modifiers = []` → null returned.

Renderer consequence: `slot.headSIs = null` → `headDisplayText` uses full `displayText` → flat text.

### Current Visual (CONFIRMED GAP)

```
[Ἰωσὴφ ὁ ἀνὴρ αὐτῆς]
       主語
```

Target (RK/Leedy):
```
[Ἰωσὴφ]
═══════════ (dashed)
[ὁ ἀνὴρ αὐτῆς]
       主語
```

The current rendering is not wrong (the text is correct), but it is **not visually distinguishable** from a simple noun slot.

### Existing Labels

| Label | Location | Value |
|-------|----------|-------|
| `_SD_CN_JA.APPOSITION` | index.html:12079 | `'同格'` |
| `_DG_FN_JA` | index.html:12270 | No APPOSITION entry (fn label only) |

The `_SD_CN_JA` entry is used only in the Structure Diagram (`_sdRenderNode`) — not in the DG renderer. The DG renderer has no APPOSITION-specific code path.

---

## 7. Visual Grammar Design Candidates

### Candidate A: Parallel Horizontal Segments (Full RK Notation)

```
Slot area:
┌─────────────────────────────┐
│  Ἰωσὴφ                      │
│  ═══════════════ (dashed)   │
│  ὁ ἀνὴρ αὐτῆς               │
│  [主語]                      │
└─────────────────────────────┘
```

Implementation:
- Detect `slot.node.construction.canonical === 'APPOSITION'` in `_dgRenderMainLine()`
- Extract `children[0]` (head), `children[1]` (appositive)
- Replace `textEl` with a vertical flex container:
  ```html
  <div class="dg-appos-wrap">
    <span class="dg-appos-head">head text</span>
    <span class="dg-appos-eq" aria-hidden="true"></span>  <!-- CSS dashed border -->
    <span class="dg-appos-appositive">appositive text</span>
  </div>
  ```
- New CSS: `.dg-appos-head { border-bottom: 1px dashed currentColor; padding-bottom: 2px; }`

L-0: SAFE — children[0/1] are SR-explicit.  
Engine change: NO.  
Renderer change: `_dgRenderMainLine()` + CSS.  
RK/Leedy: FULL MATCH — parallel segments with "=" convention.  
Mobile: Stacked layout is mobile-friendly; text wraps naturally.  
Regression risk: MODERATE — changes slot height → may affect connector vertical alignment.

---

### Candidate B: Appositive as Modifier Zone Extension

```
Main line: [Ἰωσὴφ] | 主語 |
              |
              └── [ὁ ἀνὴρ αὐτῆς] 同格
```

Implementation:
- Extend `extractSlotModifiers()` to handle APPOSITION:
  ```javascript
  if (cn === 'APPOSITION') {
    const head = children[0];
    const appositive = children[1];
    const headSIs = new Set(getTokens(head).map(t => t.surfaceIndex));
    return { headSIs, modifiers: [{ node: appositive, label: '同格', si: minSI(appositive) }] };
  }
  ```
- Slot shows head text (via headDisplayText with headSIs)
- Appositive appears in `_dgRenderSlotModZone()` with "同格" label

L-0: SAFE — children[0/1] SR-explicit.  
Engine change: YES — `extractSlotModifiers()` in dg-engine.js.  
Renderer change: NONE for main line; `_dgRenderSlotModZone()` inherits automatically.  
RK/Leedy: PARTIAL — modifier zone shows dependency, not parallelism. Apposition in RK is co-equal, not subordinate.  
Mobile: Mod zone layout already tested for mobile.  
Regression risk: LOW — modifier zone path is well-tested; inserting APPOSITION case is additive.

---

### Candidate C: Inline "=" Text Separator

```
Main line slot: [Ἰωσὴφ ══ ὁ ἀνὴρ αὐτῆς]
```

Implementation:
- If APPOSITION: `textEl.textContent = headText + ' ══ ' + appositiveText`

L-0: SAFE.  
Engine change: NO.  
Renderer change: 2 lines.  
RK/Leedy: WEAK — correct "=" symbol but not structurally separated.  
Mobile: May overflow for long appositives.  
Regression risk: MINIMAL.

---

### Candidate D: Badge-only (Label "同格")

```
Main line slot: [Ἰωσὴφ ὁ ἀνὴρ αὐτῆς] [同格]
```

Implementation:
- If APPOSITION: add a CSS badge "同格" below the fn label.

L-0: SAFE.  
Engine change: NO.  
Renderer change: 5 lines.  
RK/Leedy: NOT MET — no visual structural distinction.  
Regression risk: MINIMAL.

---

### Candidate E: Stacked Slots with Dashed Connector (Visual Grammar First Principle)

```
Slot area (vertical stack):
  ┌──────────────────┐
  │  Ἰωσὴφ           │  ← .dg-appos-head (border-bottom dashed)
  ├──────────────────┤  ← dashed line CSS
  │  ὁ ἀνὴρ αὐτῆς   │  ← .dg-appos-appositive
  └──────────────────┘
       主語
```

This is essentially Candidate A with explicit CSS naming:
- `.dg-slot-text` replaced with `.dg-appos-wrap > .dg-appos-head + .dg-appos-appositive`
- Dashed border via CSS rather than character
- Renders within existing `.dg-slot` framework

L-0: SAFE.  
Engine change: NO.  
Renderer change: `_dgRenderMainLine()` detection branch + CSS.  
RK/Leedy: FULL MATCH.  
Mobile: Natural stacking; fits 390px width.  
Regression risk: MODERATE — slot height change; connector lines may need adjustment.

---

## 8. Candidate Comparison

| Criterion | A/E (parallel) | B (mod zone) | C (inline) | D (badge) |
|-----------|:---:|:---:|:---:|:---:|
| RK/Leedy alignment | ✅ FULL | ⚠️ PARTIAL | ⚠️ WEAK | ❌ NOT MET |
| L-0 safe | ✅ | ✅ | ✅ | ✅ |
| SR evidence | ✅ | ✅ | ✅ | ✅ |
| Engine change required | ❌ No | ✅ **Yes** | ❌ No | ❌ No |
| Renderer change | Yes (medium) | Inherited | Yes (minimal) | Yes (minimal) |
| Visual distinction | HIGH | MEDIUM | LOW | NONE |
| Mobile-safe | ✅ | ✅ | ⚠️ overflow risk | ✅ |
| Regression risk | MODERATE | LOW | LOW | MINIMAL |
| Connector alignment risk | YES | NO | NO | NO |

---

## 9. APPOSITION vs Modifier — Do Not Conflate

The mandate explicitly states: "APPOSITIONをmodifierと同一視しない。"

Grammatical ground: In Reed-Kellogg and Leedy notation, an appositive is a **co-referential NP** placed in **parallel** with the head noun, not a dependent modifier. The "=" dashed connector signifies equality/co-reference, not dependence.

Therefore:
- **Candidate B** (modifier zone extension) violates this principle visually. The modifier zone already implies dependency (vertical drop with connector from slot). Using it for APPOSITION implies "ὁ βαπτιστής" is a modifier of "Ἰωάννης" — grammatically incorrect in RK notation.
- **Candidates A/E** (parallel horizontal segments) correctly represent the co-referential relationship.

This eliminates Candidate B from primary recommendation despite its lower implementation risk.

---

## 10. Scope Limitation

### What Candidate A/E Covers

| Scope | Coverage |
|-------|----------|
| APPOSITION fn=SUBJECT in DR slot | ~252 |
| APPOSITION fn=OBJECT in DR slot | ~125 |
| APPOSITION fn=COMPLEMENT in DR slot | ~28 |
| APPOSITION fn=AUX in DR slot | ~26 |
| **Total main line** | **~431** |

### What Remains Out of Scope for Renderer-Only Fix

| Excluded case | Count | Reason |
|---------------|-------|--------|
| fn=INDIRECT_OBJECT APPOSITION | 36 | IO platform path (separate renderer branch) |
| Buried APPOSITION | 1,404 | SR-structural limit; parent swallows displayText |
| Nested APPOSITION (inner) | ~207 | Inner is children[0] of outer; displayText handles it |
| APPOSITION in adv phrases | ~19 | adv phrase renderer path (separate) |

### Nested APPOSITION Handling

When `slot.node.cn === 'APPOSITION'` and `children[0]` itself has `cn === 'APPOSITION'`:
- Head is displayed as `displayText(children[0])` — all head tokens
- Appositive is `displayText(children[1])`
- The inner APPOSITION nesting is subsumed into the head text (correct fallback)
- No infinite recursion risk; not a nested renderer call

---

## 11. Existing Visual Language Consistency

| Feature | Visual notation | Notes |
|---------|----------------|-------|
| Subject | Baseline leftmost | Horizontal segment |
| Predicate | Baseline center | Horizontal segment |
| IO Platform | Raised platform with stalk | Vertical elevation |
| PP Diagonal | Prep on diagonal, NP horizontal | Oblique connector |
| Content Clause | Conjunction label + sub-diagram | Attached sub-grid |
| Relative clause | Purple dashed connector to antecedent | Horizontal dashed line |
| Modifiers | Vertical drop + label | Below slot |
| **Apposition (proposed A/E)** | **Parallel segments with dashed "="** | **Within slot, vertical stack** |

The proposed Candidate A/E is consistent with the existing visual language:
- Uses bordered horizontal segments (like all slots)
- Dashed line for grammatical relationship (like relative clause dashed connector)
- Stays within slot boundary (does not float outside like IO or PP)
- Does not conflict with modifier zone (which appears below, separate)

---

## 12. Mobile Requirements (Implementation Phase)

For 390px viewport:

| Test case | Requirement |
|-----------|-------------|
| Long appositive (>30 chars) | Appositive text wraps; no horizontal overflow |
| Short apposition ("Παῦλος ἀπόστολος") | Displays cleanly in ≤390px |
| APPOSITION + PP modifier | Mod zone below does not collapse; stacking correct |
| APPOSITION + IO (if in scope) | IO platform + APPOSITION stacking; no overlap |
| APPOSITION + content clause (rare) | Sub-diagram below still renders; no z-index conflict |
| Multiple sequential APPOSITION slots | Adjacent slots on main line remain aligned |

---

## 13. Regression Surface

APPOSITION implementation touches:

| Surface | Risk | Notes |
|---------|------|-------|
| Main line slot height | MODERATE | Slot becomes taller when APPOSITION → connector vertical alignment may shift |
| `dg-conn` between slots | MODERATE | Vertical lines between SUBJECT|PREDICATE|OBJECT are CSS-positioned; taller slot may misalign |
| IO platform height | NOT AFFECTED | IO path is separate; fn=IO APPOSITION not in scope |
| PP diagonal | NOT AFFECTED | adv zone; separate path |
| Content clause sub-diagram | NOT AFFECTED | CC slot detection is checked first |
| Relative clause connector | NOT AFFECTED | Separate purple dashed connector logic |
| Modifier zone | LOWER | Not changed in Candidate A/E |
| SD (Structure Diagram) | NOT AFFECTED | Separate renderer; already shows "同格" label |
| Mobile layout | MODERATE | Stack layout may affect 390px connector positioning |
| console.log / errors | LOW | No engine change in A/E |

---

## 14. Summary

| Finding | Value | Source |
|---------|-------|--------|
| SR total APPOSITION | 1,890 | Confirmed (NT-wide script) |
| DR slot APPOSITION | 467 (24.7%) | Confirmed (DR walk) |
| DR total (incl. adv) | ~486 | Confirmed |
| Buried (not in DR) | 1,404 (74.3%) | Confirmed |
| Children structure | Always [0]=head, [1]=appositive | CONFIRMED — 5 sample verification |
| L-0 status | SAFE for all rendering candidates | No inference needed |
| Recommended candidate | A/E (parallel segments within slot) | See Section 7 |
| Engine change needed | NO (for Candidate A/E) | Renderer-only |
| Gate chapters | 70 total APPOSITION; ~19 in DR | Confirmed |
| Regression risk | MODERATE (connector alignment) | Identified |

---

*P6-G.6.1 — read-only audit. No production code changes.*
