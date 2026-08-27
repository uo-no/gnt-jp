# P6-E — Relationship Matrix

**Phase:** P6-E — Visual Grammar Design  
**Date:** 2026-08-25  
**State:** AUDIT-COMPLETE

---

## 1. SR Construction Type → DG Rendering Coverage

| SR construction.canonical | NT count | DG gate ch count | Current rendering | Coverage |
|---|---|---|---|---|
| ARTICULAR_NP | 15,619 | est.high | Slot text (tokens) | PARTIAL — article absorbed, head noun displayed |
| PREP_PHRASE | 11,889 | est.high | PP inline in adv zone (`.dg-adv-pp-wrap`) | PARTIAL — prep bold + NP inline, no diagonal |
| GENITIVE_MOD | 7,281 | est.high | Modifier zone (属格修飾) | IMPLEMENTED |
| CONJOINED_CLAUSE | 5,574 | est.high | coordClauses / adverbialClauses path | IMPLEMENTED |
| ADJ_MOD | 4,435 | est.high | Modifier zone (形容詞的修飾 / 副詞的修飾) | IMPLEMENTED |
| SUBORDINATE_CLAUSE | 3,134 | est.high | adverbialClauses → 従属節 / 分詞節 | IMPLEMENTED |
| NP_COMPLEX | 2,642 | 154 | Slot text (no decomposition) | NOT RENDERED |
| NOMINALIZED_CLAUSE | 2,008 | 47 | Slot text only | NOT RENDERED |
| APPOSITION | 1,890 | 70 | Slot text (no distinction) | NOT RENDERED |
| CONTENT_CLAUSE | 908 | 31 | adverbialClauses → 従属節 (same as general subord.) | PARTIAL — rendered but not distinguished |
| CLAUSE_AS_NP | 886 | — | embeddedRelClauses path (P6-C) | IMPLEMENTED |
| COORDINATION | 855 | est.med | coordClauses path | IMPLEMENTED |
| ADV_MOD | 663 | est.med | Modifier zone (副詞的修飾) | IMPLEMENTED |
| DEMO_MOD | 574 | est.med | Slot text (no distinction from ADJ_MOD) | NOT RENDERED |
| PARTICIPIAL_CLAUSE | 543 | est.med | adverbialClauses → 分詞節 (italic) | IMPLEMENTED |
| NUM_MOD | 322 | est.low | Slot text | NOT RENDERED |
| COPULAR_VP | 201 | est.low | COPULA slot on main line | IMPLEMENTED |

---

## 2. SR function.canonical → DG Rendering Coverage

| fn.canonical | NT count | Main line | Connector | Modifier zone | Coverage |
|---|---|---|---|---|---|
| PREDICATE | 25,110 | ✅ 述語 | sp (from SUBJECT) / po (to OBJECT) | ✅ | IMPLEMENTED |
| ADVERBIAL | 21,541 | — | — | ✅ (phrase) / ✅ (clause) | IMPLEMENTED |
| OBJECT | 13,693 | ✅ 目的語 | po | ✅ | IMPLEMENTED |
| SUBJECT | 11,116 | ✅ 主語 | sp | ✅ | IMPLEMENTED |
| COMPLEMENT | 3,604 | ✅ 補語 | complement (diagonal) / implied | ✅ | IMPLEMENTED |
| INDIRECT_OBJECT | 2,662 | ✅ 間接目的語 | — | ✅ | **PARTIAL — on main line (should be platform)** |
| COPULA | 2,589 | ✅ 繋辞 | sp | ✅ | IMPLEMENTED |
| AUX | 1,071 | ✅ (no label) | — | — | IMPLEMENTED |
| OBJECT2 | 311 | ✅ 第二目的語 | po | ✅ | IMPLEMENTED |
| UNRESOLVED | 6 | treated as ADVERBIAL | — | — | FALLTHROUGH (safe) |

---

## 3. Visual Grammar Element → CSS / JS Implementation Map

| Visual element | CSS class | JS constructor | Status |
|---|---|---|---|
| Main horizontal baseline | `.dg-main-line` | `_dgRenderMainLine()` | ✅ |
| Subject/Predicate divider (full bar) | `.dg-conn-sp` | `_getConnector()` | ✅ |
| Predicate/Object divider (short bar) | `.dg-conn-po` | `_getConnector()` | ✅ |
| Predicate\Complement (backward diagonal) | `.dg-conn-complement` | `_getConnector()` | ✅ |
| Verbless predication (dashed diagonal) | `.dg-conn-implied` | `_getConnector()` | ✅ |
| Modifier zone (per-slot) | `.dg-slot-mod-zone` | `_dgRenderSlotModZone()` | ✅ |
| Modifier cell L-bracket connector | `.dg-adv-connector` (mod context) | `_dgRenderSlotModZone()` | ✅ |
| Adverbial phrase L-bracket | `.dg-adv-connector` | `_dgRenderAdvPhrases()` | ✅ |
| PP inline (prep bold + NP) | `.dg-adv-pp-wrap` | `_dgRenderAdvPhrases()` | ✅ |
| Subordinate clause L-bracket | `.dg-adv-clause-attach` | `_dgRenderClause()` | ✅ |
| Subordinate clause body | `.dg-adv-clause` | `_dgRenderClause()` | ✅ |
| Participial clause (italic) | `.dg-adv-clause-participial` | `_dgRenderClause()` | ✅ |
| Relative clause (purple dashed) | `.dg-rel-clause` | `_dgRenderClause()` | ✅ P6-C |
| Relative clause label | `.dg-rel-clause-label` | `_dgRenderClause()` | ✅ P6-C |
| Coordination left border | `.dg-coord-wrap` | `_dgRenderClause()` | ✅ |
| Coordination join line | `.dg-coord-join` | `_dgRenderClause()` | ✅ |
| **IO platform (raised line)** | **NOT IMPLEMENTED** | — | ❌ P6-F |
| **PP diagonal notation** | **NOT IMPLEMENTED** | — | ❌ P6-F |
| **CONTENT_CLAUSE / ὅτι visual** | **NOT IMPLEMENTED** | — | ❌ P6-F |
| **NOMINALIZED_CLAUSE / AcI visual** | **NOT IMPLEMENTED** | — | ❌ P6-F |
| **APPOSITION visual** | **NOT IMPLEMENTED** | — | ❌ P6-F |

---

## 4. R-K → Leedy → Current DG Chain

```
Reed-Kellogg (English, 1877)
│
│ Principle             Leedy Greek Adaptation          Current DG
├─ Horizontal baseline ─→ Same for Greek           ✅ .dg-main-line
├─ S | P full bar      ─→ Same                     ✅ .dg-conn-sp
├─ P | DO short bar    ─→ Same                     ✅ .dg-conn-po
├─ P \ C diagonal      ─→ Same (pred. nominative)  ✅ .dg-conn-complement
├─ IO raised platform  ─→ Greek dative IO           ❌ IO on main line
├─ Modifier diagonal   ─→ Article absorbed,         ❌ L-bracket only
│                          adj/adv on diagonal
├─ PP: prep diagonal   ─→ Greek PREP_PHRASE         ❌ inline (prep bold + NP)
│      NP horizontal
├─ Relative clause     ─→ Same                     ✅ P6-C (text label)
│  below antecedent       rel.pron → antecedent
├─ Participial phrase  ─→ Circumstantial ptc        ✅ 分詞節 italic
│  below modified noun    below clause
├─ Infinitive bracket  ─→ NOMINALIZED_CLAUSE        ❌ not rendered
│                          CONTENT_CLAUSE (ὅτι)     ❌ shown as 従属節
├─ Coordination        ─→ Same (καί / ἤ / ἀλλά)    ✅ .dg-coord-wrap
└─ Apposition          ─→ Same                     ❌ not rendered
```

---

## 5. SR Evidence Availability for P6-F Candidates

### Item 7: Indirect Object Platform

```
SR: fn.canonical = 'INDIRECT_OBJECT'
  → dg-engine: already in MAIN_FN set (line 41)
  → deriveDR output: slot with fn='INDIRECT_OBJECT'
  → index.html: rendered on main line
  → P6-F: route IO slots to separate "platform" render path
  Evidence: 2,662 NT-wide, SR unambiguous
```

### Item 8: PP Diagonal

```
SR: construction.canonical = 'PREP_PHRASE'
  → dg-engine: extractPPStructure() already parses prep + NP
  → DR output: { ppPrep, ppNpNode, ppNpModInfo }
  → index.html: _dgRenderAdvPhrases() renders inline
  → P6-F: replace inline with diagonal notation component
  Evidence: 11,889 NT-wide, fully parsed in SR
```

### Item 11: CONTENT_CLAUSE / NOMINALIZED_CLAUSE

```
SR: construction.canonical = 'CONTENT_CLAUSE'
  fn.canonical = 'OBJECT' or 'SUBJECT'
  First token typically: ὅτι / ὅς / ἵνα
  → dg-engine: treated as adverbialClause (any clause child of MAIN_FN slot)
  → DR: in adverbialClauses (STANDALONE path)
  → P6-F: distinguish CONTENT_CLAUSE in DR; render as embedded clause
    within the OBJECT slot rather than as a subordinate hanging below

SR: construction.canonical = 'NOMINALIZED_CLAUSE'
  → Not currently extracted by extractSlotModifiers()
  → Articular infinitive / articular participle used as noun
  → P6-F: extract as NOMINALIZED_CLAUSE slot; show with bracket notation
  Evidence: 2,008 NT-wide (408 sampled), SR construction type present
```

---

## 6. L-0 Boundary in P6-F Candidates

| Candidate | SR evidence sufficient? | New syntactic inference? | L-0 risk |
|---|---|---|---|
| IO platform | YES (fn=INDIRECT_OBJECT) | NO | NONE |
| PP diagonal | YES (PREP_PHRASE + extractPPStructure) | NO | NONE |
| CONTENT_CLAUSE distinction | YES (construction.canonical) | NO | NONE |
| NOMINALIZED_CLAUSE | YES (construction.canonical) | MINIMAL | LOW |
| APPOSITION | YES (construction.canonical) | NO | NONE |
| Genitive (subjective vs objective) | NO (semantic) | YES | L-0 — do not add |
| Participial head-noun | PARTIAL (morph agreement) | YES | MEDIUM — defer |

---

*Refs: P6-E_visual_grammar_gap_audit.md / P6-E_design_options.md / P6-E_final_report.md*
