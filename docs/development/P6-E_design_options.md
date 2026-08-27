# P6-E — Design Options

**Phase:** P6-E — Visual Grammar Design  
**Date:** 2026-08-25  
**State:** AUDIT-COMPLETE  
**Scope:** Design-only. No implementation. Production code unchanged.

---

## Design Hierarchy

```
R-K principle
  → Leedy Greek adaptation
    → Current SR evidence
      → L-0 constraints
        → Reading-first UX
          → Design recommendation
```

All design options evaluated in this order.

---

## Option A: Indirect Object Platform (Item 7)

### R-K basis
IO is on a raised platform — a horizontal line above the main baseline, connected by a vertical from the predicate. This is visually distinct from DO (on main baseline) and adverbial dative.

### Leedy adaptation
Greek dative IO: same platform treatment. Dative of means/manner/location = adverbial, shown as modifier. This distinction is already made in SR (INDIRECT_OBJECT vs ADVERBIAL).

### Design

```
BEFORE (current):
  ὁ πατήρ     ἔδωκεν     υἱόν
   主語          述語       目的語
              ↑
          ὑμῖν  (間接目的語 — currently on same main line)

AFTER (Option A):
         ὑμῖν        ← raised platform (horizontal line above main)
           |          ← vertical connector from predicate
  ὁ πατήρ │ἔδωκεν     υἱόν
   主語    │述語        目的語
```

### Implementation path
1. In `deriveDR()`: IO slots already identified (fn=INDIRECT_OBJECT in MAIN_FN set)
2. In `_dgRenderMainLine()`: separate IO slots from DO/COMPLEMENT/SUBJECT/PREDICATE
3. New `_dgRenderIOPlatform(ioSlots, predicatePosition)`: render IO above main line with connector
4. CSS: `.dg-io-platform` (horizontal line, positioned above main), `.dg-io-connector` (vertical from predicate)

### SR evidence: CONFIRMED — fn.canonical='INDIRECT_OBJECT' unambiguous
### L-0 risk: NONE
### Implementation cost: MEDIUM-HIGH (layout change in main-line renderer; requires knowing predicate position)
### Priority: HIGH — 2,662 occurrences; most significant R-K divergence

---

## Option B: PP Diagonal Notation (Item 8)

### R-K basis
Preposition on a diagonal line descending from the word it modifies. Object of the preposition on a horizontal below the diagonal.

### Leedy adaptation
Same. Greek PP: preposition governs the noun phrase.

### Design

```
BEFORE (current — inline):
  └ κατά τὸ θέλημα αὐτοῦ  副詞的

AFTER (Option B):
  └                     ← L-bracket connector from slot
      κατά              ← preposition on diagonal
      ─────────
      τὸ θέλημα αὐτοῦ  ← NP on horizontal
      属格修飾: αὐτοῦ   ← genitive modifier below NP
```

### Implementation path
1. `extractPPStructure()` already returns `{ prepToken, npNode }` — data fully available
2. In `_dgRenderAdvPhrases()`: replace inline `dg-adv-pp-wrap` with two-level component
3. New CSS: `.dg-pp-wrap` (flex-column), `.dg-pp-diag` (diagonal for prep), `.dg-pp-np` (horizontal for NP)
4. Diagonal: CSS `transform: rotate(-38deg)` (same as `.dg-conn-complement` pattern)

### SR evidence: CONFIRMED — PREP_PHRASE + extractPPStructure() fully operational
### L-0 risk: NONE
### Implementation cost: MEDIUM (new CSS component, modification to `_dgRenderAdvPhrases()`)
### Priority: HIGH — 11,889 PP occurrences; most common modifier type; improves reading clarity significantly

---

## Option C: Content Clause / ὅτι Visual (Item 11a)

### R-K basis
Content clause (ὅτι + full clause) as OBJECT or SUBJECT: shown as an embedded clause box connected to the OBJECT position on the main line.

### Leedy adaptation
Greek ὅτι clause = direct discourse or content clause. Shown as embedded proposition hanging from the OBJECT slot.

### Design

```
BEFORE (current):
  ἐγὼ │ εἶπον │
 主語   述語
              └─ 従属節 (same as generic adverbial subordinate)
                  ὅτι Ἐγώ εἰμι...

AFTER (Option C):
  ἐγὼ │ εἶπον │ [ὅτι-clause]  ← OBJECT slot on main line
 主語   述語     目的語
                    └─ embedded proposition box:
                       ἐγώ │ εἰμι │ ὁ χριστός
                      主語  述語    補語
```

### Implementation path
1. In SR: CONTENT_CLAUSE with fn=OBJECT → currently becomes adverbialClause (fn=null path or ADVERBIAL path)
2. Revised `deriveClauseCore()`: detect CONTENT_CLAUSE construction in OBJECT/SUBJECT slot → push to mainSlots with fn=OBJECT and embedded DR
3. New slot type `embeddedContentClause` in DR
4. `_dgRenderMainLine()`: render OBJECT slot as `[ὅτι …]` with embedded sub-diagram below

### SR evidence: CONFIRMED — construction.canonical='CONTENT_CLAUSE', fn='OBJECT'/'SUBJECT'
### L-0 risk: NONE — SR construction type fully identifies these
### Implementation cost: MEDIUM-HIGH (new DR field + rendering path)
### Priority: MEDIUM — 908 occurrences; impacts epistolary texts heavily (JHN, ROM, GAL)

---

## Option D: Nominalized Clause / Articular Infinitive (Item 11b)

### R-K basis
Infinitive phrase shown with bracket. Articular infinitive (τοῦ + inf) = noun substitute.

### Leedy adaptation
Articular infinitive: show the article as nominalizer, infinitive as head. No embedded S+P (pure nominalization).

### Design

```
BEFORE (current):
  [τοῖς πιστεύουσιν εἰς τὸ ὄνομα αὐτοῦ]  (opaque slot text)

AFTER (Option D):
  [τοῖς πιστεύουσιν]  ← main text of slot
       └── εἰς τὸ ὄνομα αὐτοῦ  (PP modifier below)
       分詞的修飾: τοῖς … (артикль+分詞)
```

### Implementation path
1. NOMINALIZED_CLAUSE construction: identify articular participle (article + participle) vs articular infinitive (τοῦ + inf)
2. Render participial nominalization: slot text = head tokens; italic to indicate nominalized participle
3. Render infinitive nominalization: slot text = infinitive; label "不定詞的"
4. PP modifiers within the NP: extracted via existing `extractSlotModifiers()`

### SR evidence: CONFIRMED — construction.canonical='NOMINALIZED_CLAUSE' (2,008 NT-wide)
### L-0 risk: LOW — distinguishing article+participle from article+infinitive is morphological (morph_raw)
### Implementation cost: MEDIUM
### Priority: MEDIUM — 2,008 occurrences; significant for Pauline epistles and Hebrews

---

## Option E: Apposition Visual (Item gap)

### R-K basis
Apposition: parallel element on the same horizontal level as the head, connected by a dotted line.

### Leedy adaptation
Greek apposition common (especially in address and title constructions, e.g., "ἀπόστολος Χριστοῦ Ἰησοῦ").

### Design

```
BEFORE (current):
  Παῦλος ἀπόστολος Χριστοῦ Ἰησοῦ  (shown as undivided slot text)

AFTER (Option E):
  Παῦλος ····· ἀπόστολος Χριστοῦ Ἰησοῦ
  主語           同格
```

### SR evidence: CONFIRMED — construction.canonical='APPOSITION' (1,890 NT-wide)
### L-0 risk: NONE — SR identifies apposition construction
### Implementation cost: MEDIUM (new slot rendering for apposition pairs)
### Priority: MEDIUM — 1,890 occurrences; improves clarity for salutation clauses

---

## Rejected Options

### X1: True diagonal modifier lines (Items 2/3)
**Rejected because:** Requires per-token horizontal positioning within flex-layout slots. The current flex layout does not support absolute token-level positioning. Would require a layout engine rewrite. Cost too high relative to benefit for P6-F.

### X2: Connecting line from relative clause to antecedent (Item 10)
**Rejected because:** The antecedent is in a different layout block (possibly many lines above). Drawing a CSS/SVG line across independent blocks requires absolute positioning and would interfere with the page reflow. Text label "関係節 ← X" is functionally equivalent.

### X3: Participial head-noun visual connection (Item 9)
**Rejected because:** Identifying which specific noun a circumstantial participle modifies requires morphological agreement checking (case/number/gender matching) that is not in the current DR. This is new syntactic inference, which is L-0 adjacent.

### X4: DA discourse markers in DG view (Item 15)
**Rejected because:** DA is currently hidden. Requires DA pipeline integration. Deferred.

### X5: Semantic genitive distinction (subjective vs objective, Item 12)
**Rejected because:** L-0. Requires theological commentary to determine whether "ἀγάπη Θεοῦ" = God's love (subjective) or love for God (objective). Outside SR data scope.

---

## Priority Stack for P6-F

| Priority | Option | Item | SR evidence | Cost | NT count |
|---|---|---|---|---|---|
| 1 | Option B: PP diagonal | 8 | CONFIRMED | MEDIUM | 11,889 |
| 2 | Option A: IO platform | 7 | CONFIRMED | MEDIUM-HIGH | 2,662 |
| 3 | Option C: Content clause | 11a | CONFIRMED | MEDIUM-HIGH | 908 |
| 4 | Option D: Nominalized clause | 11b | CONFIRMED | MEDIUM | 2,008 |
| 5 | Option E: Apposition | gap | CONFIRMED | MEDIUM | 1,890 |

All options have SR evidence and no L-0 risk. Priority based on frequency × visual impact.

---

*Refs: P6-E_visual_grammar_gap_audit.md / P6-E_relationship_matrix.md / P6-E_final_report.md*
