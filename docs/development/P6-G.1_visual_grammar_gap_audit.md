# P6-G.1 Visual Grammar Gap Audit — NT-Wide Re-Audit (Post P6-F)

**Date:** 2026-08-25
**Scope:** NT-wide read-only audit of all remaining DG visual grammar gaps
**Baseline:** P6-F (PP Diagonal) complete. Audit covers all 27 NT books.
**Constraint:** No production code changes. dg-engine.js read-only.

---

## 1. Audit Scope and Method

P6-F implemented PP diagonal notation for adverbial prepositional phrases. This audit
re-examines the NT-wide SR dataset to identify all remaining visual grammar gaps relative
to Reed–Kellogg / Leedy diagramming conventions, prioritize them by data volume and
SR confidence, and recommend the next implementation candidate.

**SR dataset:** `/assets/data/sr/{BOOK}/{ch}.json`
**DG gate chapters:** JHN 1 / MAT 5 / MAT 28 / EPH 2 / PHP 2 / COL 1 / ROM 6

---

## 2. NT-Wide Baseline Statistics

| Metric | Count |
|---|---|
| Books | 27 |
| Chapters | 260 |
| Sentences | 8,010 |
| Tokens | 137,741 |
| Clauses (type=clause) | 43,835 |
| Verb tokens | 28,352 |
| Participle tokens (V-\*P\*) | 5,722 |
| Infinitive tokens (V-\*N\*) | 1,777 |

### fn.canonical distribution (top 10)

| fn.canonical | NT count |
|---|---|
| PREDICATE | 25,110 |
| ADVERBIAL | 21,541 |
| OBJECT | 13,693 |
| SUBJECT | 11,116 |
| COMPLEMENT | 3,604 |
| INDIRECT_OBJECT | 2,662 |
| COPULA | 2,589 |
| AUX | 1,071 |
| SECOND_OBJECT | 311 |
| UNRESOLVED | 6 |

### construction.canonical distribution (top 17)

| construction.canonical | NT count |
|---|---|
| ARTICULAR_NP | 15,619 |
| PREP_PHRASE | 11,889 |
| GENITIVE_MOD | 7,281 |
| CONJOINED_CLAUSE | 5,574 |
| ADJ_MOD | 4,435 |
| SUBORDINATE_CLAUSE | 3,134 |
| NP_COMPLEX | 2,642 |
| NOMINALIZED_CLAUSE | 2,008 |
| APPOSITION | 1,890 |
| CONTENT_CLAUSE | 908 |
| CLAUSE_AS_NP | 886 |
| COORDINATION | 855 |
| ADV_MOD | 663 |
| DEMO_MOD | 574 |
| PARTICIPIAL_CLAUSE | 543 |
| NUM_MOD | 322 |
| COPULAR_VP | 201 |

---

## 3. DG Gate Chapter Statistics

| Chapter | Sentences | Tokens | PP | IO | CC | NomClause | Appos | Participle | Infinitive |
|---|---|---|---|---|---|---|---|---|---|
| JHN 1 | 57 | 826 | 78 | 22 | 4 | 10 | 11 | 36 | 3 |
| MAT 5 | 58 | 821 | 49 | 20 | 13 | 12 | 3 | 23 | 10 |
| MAT 28 | 23 | 329 | 26 | 12 | 4 | 4 | 2 | 14 | 3 |
| EPH 2 | 12 | 362 | 51 | 3 | 1 | 6 | 14 | 24 | 0 |
| PHP 2 | 18 | 431 | 42 | 2 | 3 | 4 | 8 | 13 | 6 |
| COL 1 | 9 | 538 | 84 | 5 | 1 | 8 | 27 | 27 | 6 |
| ROM 6 | 27 | 367 | 33 | 9 | 5 | 3 | 5 | 9 | 3 |
| **Total** | **204** | **3,674** | **363** | **73** | **31** | **47** | **70** | **146** | **31** |

---

## 4. Current DG Visual Grammar Coverage (Post P6-F)

| Feature | Construction / fn | NT Count | Status | Notes |
|---|---|---|---|---|
| PP Adverbial Diagonal | PREP_PHRASE fn=ADVERBIAL | 8,912 | ✅ IMPLEMENTED (P6-F) | Extractable 98.2% |
| Genitive L-bracket | GENITIVE_MOD | 7,281 | ✅ IMPLEMENTED | Slot modifier zone |
| Relative Clause | RELATIVE_CLAUSE | n/a | ✅ IMPLEMENTED (P6-C) | Purple dashed + antecedent |
| Coordination | COORDINATION | 855 | ✅ IMPLEMENTED | Left border |
| Participial Clause | PARTICIPIAL_CLAUSE | 543 | ✅ IMPLEMENTED | Italic label |
| Subordinate Clause | SUBORDINATE_CLAUSE | 3,134 | ✅ IMPLEMENTED | 従属節 label |
| Adjective Modifier | ADJ_MOD | 4,435 | ✅ IMPLEMENTED | Modifier zone |
| Adverb Modifier | ADV_MOD | 663 | ✅ IMPLEMENTED | Modifier zone |
| Indirect Object | fn=INDIRECT_OBJECT | 2,662 | ⚠️ PARTIAL | On baseline; no raised platform |
| Apposition | APPOSITION | 1,890 | ⚠️ GAP | Subsumed in slot text; no visual mark |
| Nominalized Clause | NOMINALIZED_CLAUSE | 2,008 | ⚠️ GAP | Slot text only |
| Content Clause (OBJ) | CONTENT_CLAUSE fn=OBJECT | 736 | ⚠️ DR ERROR | Misrouted to adverbialClauses by dg-engine |
| Second Object | fn=SECOND_OBJECT | 311 | ⚠️ MINOR | On baseline; no double-object notation |

---

## 5. Gap Items — Detailed Analysis

### G-1: INDIRECT_OBJECT Platform

**Volume:** 2,662 NT-wide (3rd largest fn after PREDICATE and ADVERBIAL); 73 in gate chapters
**SR SSOT:** `function.canonical = "INDIRECT_OBJECT"` — explicit, no inference
**Current DR:** Goes to `slots` array (INDIRECT_OBJECT ∈ MAIN_FN set)
**Current render:** Slot item on the main horizontal baseline, label = 間接目的語
**RK/Leedy convention:** IO sits on a raised horizontal platform ("stool") above the main baseline,
connected to the predicate by a vertical or slanted line. This is one of the 5 fundamental
structural elements of the Reed–Kellogg diagram.
**Visual gap severity:** HIGH — IO is visually indistinguishable from OBJECT on the current baseline.
The raised platform is a defining structural element, not a secondary enhancement.
**L-0 risk:** NONE — fn=INDIRECT_OBJECT requires no disambiguation. The SR has already
classified the element; the renderer only needs to route it to a different visual slot.
**Scope:** index.html only (CSS platform geometry + JS slot rendering logic)
**Gate coverage:** 73 instances across all 7 gate chapters

---

### G-2: APPOSITION Notation

**Volume:** 1,890 NT-wide; 70 in gate chapters
**SR SSOT:** `construction.canonical = "APPOSITION"` — explicit
**Current DR:** Subsumed into slot text via `headDisplayText()` / `displayText()`
**Current render:** No visual distinction; appositive element merged with head noun text
**RK/Leedy convention:** Apposition shown as a parallel side element, often on a separate
horizontal segment beneath the antecedent, connected by a dashed line or = notation.
**Visual gap severity:** MEDIUM — appositional relationships are common (1,890 NT-wide)
and structurally meaningful; their absence removes an important grammatical signal.
**L-0 risk:** NONE — cn=APPOSITION is the SSOT; no inference required.
**Scope:** index.html only (detect APPOSITION in slot children, CSS for apposition notation)
**Gate coverage:** 70 instances across all 7 gate chapters (notably dense in COL 1: 27)

---

### G-3: NOMINALIZED_CLAUSE

**Volume:** 2,008 NT-wide; 47 in gate chapters
**SR SSOT:** `construction.canonical = "NOMINALIZED_CLAUSE"`, `type = "clause"`
**Current DR:** Subsumed into slot text (treated as a complex token in displayText)
**Current render:** No special visual treatment; rendered as flat text in slot
**RK/Leedy convention:** A clause functioning as a noun phrase may be shown with
square bracket or parenthesis notation to mark its embedded clausal status.
**Visual gap severity:** MEDIUM — NOMINALIZED_CLAUSE is often embedded inside an
ARTICULAR_NP (article + τό + infinitive). Without special notation, the reader cannot
distinguish a nominalized clause from a simple noun in the diagram.
**L-0 risk:** NONE — cn=NOMINALIZED_CLAUSE is SSOT.
**Scope:** index.html only
**Gate coverage:** 47 instances (JHN 1: 10, MAT 5: 12)

---

### G-4: CONTENT_CLAUSE — DR Routing Error

**Volume:** 908 NT-wide; fn=OBJECT: 736 (81%); fn=ADVERBIAL: 54; fn=SUBJECT: 26; other: 92
**DG gate chapters:** 31 CONTENT_CLAUSE instances (est. ~25 fn=OBJECT based on 81% ratio)
**SR SSOT:** `construction.canonical = "CONTENT_CLAUSE"`, `function.canonical = "OBJECT"` (736 cases)
**DR issue:** `deriveClauseCore()` in dg-engine.js routes **all** CONTENT_CLAUSE nodes to
`adverbialClauses`, regardless of fn. A CONTENT_CLAUSE with fn=OBJECT is displayed as
an adverbial clause (従属節), not as the direct object.
**Current render:** Shows as 従属節 below the adverbial list — structurally incorrect for
fn=OBJECT cases (ὅτι / ἵνα complement clauses as direct object of the main verb).
**RK/Leedy convention:** A complement clause as direct object should occupy the OBJECT
slot on the main baseline (horizontal line after predicate), not appear as an adverbial appendage.
**Visual gap severity:** HIGH — this is a DR-level misrouting, not merely a missing notation.
736 NT-wide instances are visually misrepresented.
**L-0 risk:** LOW for classification (fn=OBJECT is explicit SSOT); but fix requires dg-engine.js.
**Scope:** **Requires dg-engine.js change** (deriveClauseCore must route CONTENT_CLAUSE
by fn=OBJECT to slots, fn=ADVERBIAL to adverbialClauses). This is the highest-risk gap.
**Gate coverage:** ~25 fn=OBJECT cases in gate chapters

---

### G-5: SECOND_OBJECT (Minor)

**Volume:** 311 NT-wide (small); gate chapter count not separately tallied
**SR SSOT:** `function.canonical = "SECOND_OBJECT"` — explicit
**Current render:** Slot item on main baseline, label = 第2目的語
**RK/Leedy convention:** Double-object constructions (give IO DO) sometimes use a
forked notation. Current flat baseline rendering is acceptable for basic diagrams.
**Visual gap severity:** LOW — 311 instances, niche construction, baseline rendering conveys function
**Recommendation:** Defer; not a priority for current phase

---

### G-6: PP fn=null (Design by Contract)

**Volume:** 2,019 PREP_PHRASE nodes with fn=null
**Character:** These PP nodes are **embedded inside other phrases** (fn=null because fn is
on the parent NP/clause, not the PP itself). E.g., an NP containing a PP attribute where
the NP has fn=OBJECT but the PP inside has no independent fn.
**Current render:** Included in slot text via displayText of the parent node — correct behavior.
**Gap status:** NOT A GAP — fn=null PPs are correctly absorbed by parent node rendering.
PP diagonal notation applies to independently-functioning adverbial PPs (fn=ADVERBIAL).

---

## 6. Implemented Features Verification (Post P6-F)

All previously-implemented features verified against DG gate chapter data:

| Feature | Gate Chapter Evidence |
|---|---|
| PP Diagonal | JHN 1: 78 PP (incl. diagonal); EPH 2: 51 PP |
| IO on baseline | JHN 1: 22; MAT 5: 20 |
| Genitive L-bracket | Confirmed in all gate chapters (visual inspection P6-F.1 audit) |
| Relative clause | JHN 1 confirmed (P6-C/D audit) |
| Coordination | JHN 1 confirmed |
| Participial clause | COL 1: 27 participles |
| Subordinate clause | MAT 5 confirmed |

---

## 7. Summary Table

| Gap ID | Description | NT Count | Gate Count | SR Confidence | L-0 Risk | Scope | Priority |
|---|---|---|---|---|---|---|---|
| G-1 | INDIRECT_OBJECT raised platform | 2,662 | 73 | HIGH | NONE | index.html | **HIGH** |
| G-2 | APPOSITION notation | 1,890 | 70 | HIGH | NONE | index.html | **HIGH** |
| G-3 | NOMINALIZED_CLAUSE notation | 2,008 | 47 | HIGH | NONE | index.html | MEDIUM |
| G-4 | CONTENT_CLAUSE fn=OBJ routing | 736 | ~25 | HIGH | LOW (fix needs dg-engine) | dg-engine.js + index.html | MEDIUM |
| G-5 | SECOND_OBJECT notation | 311 | ~7 | HIGH | NONE | index.html | LOW |
| G-6 | PP fn=null | 2,019 | — | N/A | NONE | (by design) | NOT A GAP |

---

*P6-G.1 Audit — read-only. No production code changes.*
