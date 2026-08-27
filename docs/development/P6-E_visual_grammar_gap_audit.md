# P6-E — Visual Grammar Gap Audit

**Phase:** P6-E — Visual Grammar Design  
**Date:** 2026-08-25  
**State:** AUDIT-COMPLETE  
**Scope:** READ-ONLY design audit. No production code changes.

---

## Audit Method

1. R-K/Leedy principles extracted from published R-K grammar (1877) and Leedy's Greek adaptation
2. Current DG implementation inspected: `public/core/dg-engine.js`, `public/index.html`
3. SR data sampled NT-wide (8,010 sentences, 260 chapters) and gate chapters (7 chapters)
4. Playwright screenshots: 7 chapters desktop 1280px + 2 chapters mobile 390px

---

## Item 1: Main Line Visual Primacy

**R-K principle:** Subject and predicate on a single horizontal baseline, separated by a full vertical bar. This is the sentence's structural spine — all other elements hang from it.

**Leedy adaptation:** Same. For Greek, verb-initial word order common; the main line preserves syntactic function, not surface order.

**Current DG expression:**
- Horizontal baseline: ✅ (`.dg-main-line`)
- SUBJECT | PREDICATE divider: ✅ (`.dg-conn-sp` — full vertical bar)
- PREDICATE | OBJECT divider: ✅ (`.dg-conn-po` — short vertical bar, baseline-aligned)
- Labels below slots: ✅ (主語 / 述語 / etc.)

**Gap:** Slots all rendered at same font weight. R-K visually emphasizes the PREDICATE as the functional center; current rendering treats all slot text identically. Minor visual primacy issue only.

**L-0 risk:** NONE. No syntactic inference required.

**Implementation cost:** LOW — CSS font-weight adjustment only.

**Recommendation:** DEFERRED. Current rendering is functionally correct; visual primacy improvement is P6-E+ scope.

---

## Item 2: Modifier Attachment

**R-K principle:** Adjectives and adverbs placed on a diagonal line below the word they modify. The diagonal connects modifier to head, making the dependency explicit.

**Leedy adaptation:** Same. Greek adjective/adverb modifier below the head token.

**Current DG expression:**
- Modifier zone: ✅ (`.dg-slot-mod-zone` / `.dg-slot-mod-cell`)
- L-bracket connector: ✅ (`.dg-adv-connector` — border-left + border-bottom)
- Content shown: ✅ (属格修飾 / 形容詞的修飾 / 副詞的修飾)
- PP internal structure: ✅ (`.dg-adv-pp-wrap` — prep bold + NP)

**Gap:** The L-bracket connector is a corner icon (10px wide, 8px tall), not an actual diagonal. R-K shows a true diagonal line from the head baseline to the modifier. Current implementation shows flat horizontal modifier row with a small corner connector. The visual relationship is indicated but not with a diagonal.

**L-0 risk:** NONE for flat modifiers. Diagonal requires knowing which token in the slot is the head — derivable from headSIs (already in DR).

**Implementation cost:** MEDIUM — requires diagonal CSS per modifier cell, aligned to head token position. Layout complexity increases.

**Recommendation:** DEFERRED. Current L-bracket is a practical approximation. True diagonal requires per-token positioning that adds layout complexity without proportional reading benefit.

---

## Item 3: Word-Level Modifier Diagonal

**R-K principle:** Each modifier (adjective, adverb, article, genitive) sits on a diagonal that descends from the specific word it modifies. This creates a visual tree from the word level.

**Leedy adaptation:** Articles typically absorbed into the head noun (not shown separately). Attributive adjective on diagonal below noun.

**Current DG expression:**
- Modifier shown per-slot: ✅
- No per-token diagonal: ❌ — modifiers align under the slot as a whole, not under the specific head token within the slot

**Gap:** When a slot has multiple tokens (e.g., ὁ λόγος — article + noun), modifier diagonals should descend from λόγος specifically. Current alignment is slot-level, not token-level.

**L-0 risk:** LOW. headSIs already in DR; slot-level alignment is conservative but not incorrect.

**Implementation cost:** HIGH — requires token-level horizontal positioning within slots. Not currently supported by the flex layout.

**Recommendation:** DEFERRED. Token-level diagonal positioning is a significant layout engine change. P6-F candidate.

---

## Item 4: Clause-Level Subordinate Connection

**R-K principle:** Subordinate clauses shown below the clause they modify, connected with a dashed line to the word they modify in the main clause.

**Leedy adaptation:** Subordinating conjunction (ἵνα, ὅτι, etc.) shown on the connector line or as a label. Clause body below.

**Current DG expression:**
- L-bracket attach: ✅ (`.dg-adv-clause-attach`)
- Label: ✅ (従属節 / 分詞節 / 関係節 ← antecedent)
- Dashed left border: ✅ (`.dg-adv-clause`)
- Sub-clause renders recursively: ✅

**Gap:** The L-bracket connects to the top of the subordinate clause block, not to a specific word in the main clause. In R-K, the connection line points to the specific word being modified (e.g., connecting the adverbial clause to the verb it modifies). Current: generic indentation.

**L-0 risk:** NONE. Connection to specific word requires knowing the head — for ADVERBIAL clauses this is typically the PREDICATE, which is already derivable.

**Implementation cost:** MEDIUM — would require tracking which main-clause slot the subordinate clause modifies, then drawing a connector from that slot position. Currently not stored in DR.

**Recommendation:** DEFERRED. Current L-bracket is sufficient for reading comprehension. Precise slot-level connection is a P6-F enhancement.

---

## Item 5: Coordination Visual Grammar

**R-K principle:** Coordinated elements shown on parallel horizontal lines at the same vertical level. A dotted or solid horizontal connector joins the parallel lines. Each coordinated clause is a full peer.

**Leedy adaptation:** Same for Greek. The coordinating conjunction (καί, ἤ, δέ) shown at the join point.

**Current DG expression:**
- Parallel clause blocks: ✅ (`.dg-coord-wrap` — flex-column)
- Left border spanning all: ✅ (2.5px solid border-left)
- Conjunction label at join: ✅ (`.dg-coord-join-text` — italic, e.g., *καί*)
- Short horizontal tick at join: ✅ (`.dg-coord-join::before` — 0.5rem horizontal line)

**Gap:** R-K shows coordinated elements on true parallel horizontal lines with a dotted connector between them. Current shows them as sequential blocks with a shared left border. The "parallelism" is implied by shared left border rather than explicit parallel baselines. For complex coordinated clauses (3+ clauses), this is less visually explicit than R-K.

**L-0 risk:** NONE.

**Implementation cost:** LOW-MEDIUM — improving visual to explicit parallel lines with horizontal connectors would require layout adjustment but is CSS-level.

**Recommendation:** DEFERRED. Current shared left border adequately communicates coordination. Explicit parallel lines are a visual refinement for P6-F.

---

## Item 6: Predicate Complement vs Object

**R-K principle:** Direct object: PREDICATE | OBJECT (short vertical bar, baseline). Predicate complement: PREDICATE \ COMPLEMENT (backward diagonal). The diagonal distinguishes complement from object.

**Leedy adaptation:** Same. Greek εἶναι + predicate nominative → complement with backward diagonal.

**Current DG expression:**
- PREDICATE | OBJECT: ✅ (`.dg-conn-po`)
- PREDICATE \ COMPLEMENT: ✅ (`.dg-conn-complement` — backward diagonal)
- PREDICATE \ COMPLEMENT (implied): ✅ (`.dg-conn-implied` — dashed diagonal for verbless)

**Gap:** NONE. This is correctly implemented and visually distinguishable.

**L-0 risk:** NONE.

**Implementation cost:** N/A — implemented.

**Recommendation:** PASS. No action required.

---

## Item 7: Indirect Object Visual Treatment

**R-K principle:** Indirect object raised on a "platform" — a horizontal line above and to the right of the predicate, connected by a vertical line from the predicate. The IO is visually elevated, not on the main baseline.

**Leedy adaptation:** Greek dative IO shown on the platform. Dative of indirect object distinguished from dative of means/location (which are adverbial).

**Current DG expression:**
- INDIRECT_OBJECT on main line: ❌ — currently placed on the main baseline with 間接目的語 label, same level as SUBJECT / PREDICATE / OBJECT
- No raised platform: ❌

**Gap:** Significant. In R-K, the IO is NOT on the main horizontal line — it is on a separate raised platform connected by a vertical from the predicate. Current DG places IO on the main line, which conflates it with direct objects and subjects visually.

**Data:** INDIRECT_OBJECT = 2,662 occurrences NT-wide (3rd most common fn after PREDICATE and OBJECT).

**L-0 risk:** LOW. SR already labels fn=INDIRECT_OBJECT. The distinction between dative-IO and dative-adverbial is already made in SR data. No new syntactic inference needed.

**Implementation cost:** MEDIUM-HIGH — requires a separate rendering path for IO slots that places them in a "platform" position above/below the main line with a vertical connector from the predicate position. Requires layout change to `_dgRenderMainLine`.

**Recommendation:** CANDIDATE for P6-F. This is the most significant structural gap from R-K. SR data supports it. L-0 risk is low. Visual benefit is high (disambiguates IO from DO at a glance).

---

## Item 8: PP Internal Structure

**R-K principle:** Preposition on a diagonal line, with the object of the preposition on a horizontal below it. The PP hangs from the word it modifies via a diagonal.

**Leedy adaptation:** Same. Greek prepositional phrase: preposition on diagonal, noun phrase on horizontal below.

**Current DG expression:**
- PP in adverbial phrase zone: ✅ — preposition shown bold (`.dg-adv-pp-prep`), NP shown next to it (`.dg-adv-pp-np`)
- PP as modifier in slot mod zone: ✅ — `label: '副詞的修飾'` with PP text
- No actual diagonal layout: ❌ — shown inline (prep bold + space + NP), not with a true prep-on-diagonal structure

**Gap:** R-K shows preposition on a diagonal with the governed NP on a horizontal. Current shows prep+NP inline within the modifier row. The structural relationship (prep governs NP) is readable but not visually explicit via diagonal.

**L-0 risk:** NONE. PP structure is fully captured in SR (PREP_PHRASE = 11,889 occurrences). `extractPPStructure()` already identifies prep token and NP node.

**Implementation cost:** MEDIUM — requires a two-level visual element (diagonal for prep, horizontal for NP) instead of the current inline text. This would be a new CSS component for PP display.

**Recommendation:** CANDIDATE for P6-F. PP structure is fully available in SR. A visual PP component would significantly improve diagrammatic clarity for the most common modifier type (PREP_PHRASE = 12k occurrences). Medium cost, high value.

---

## Item 9: Participial Attachment

**R-K principle:** Participial phrase shown below the noun or verb it modifies, connected by a diagonal. In Greek especially, the participle's head (the modified noun) is visible.

**Leedy adaptation:** Participial clause below the main clause, with a connector to the noun being modified. Label distinguishes circumstantial from attributive participle.

**Current DG expression:**
- Participial clause as adverbialClause: ✅ — `isParticipial` flag → `.dg-adv-clause-participial`
- Italic label: ✅ — 分詞節 (italic)
- Participial predicate/copula slot: ✅ — `.dg-slot-participial` (italic text)
- Connection to specific modified noun: ❌ — generic L-bracket only

**Gap:** The participial clause is visually distinguished (italic) and shown below the clause it modifies. However, the connection target (which noun/pronoun the participle agrees with) is not shown. R-K would draw a line to the specific noun.

**L-0 risk:** MEDIUM. Identifying which noun a circumstantial participle modifies requires SR evidence (agreement in case/number/gender). SR has morphological data but the specific head-noun reference is not always explicit in the SR structure.

**Implementation cost:** HIGH if head-noun connection required. LOW for current state (already rendered correctly as participial clause).

**Recommendation:** CURRENT STATE ACCEPTABLE. The italic label + indentation is a practical and clear solution. Head-noun connection deferred to Option D (SR antecedentSRNodeId equivalent for participials).

---

## Item 10: Relative Clause Connector

**R-K principle:** Relative clause shown below the antecedent, connected by a dashed line from the relative pronoun position to the antecedent in the main clause.

**Leedy adaptation:** Same. Greek relative pronoun in the relative clause; antecedent in the main clause or a preceding clause.

**Current DG expression:**
- Relative clause visually distinct: ✅ — `.dg-rel-clause` (purple dashed left border)
- Label with antecedent text: ✅ — "関係節 ← antecedentText" (P6-C)
- Free relative: ✅ — "関係節" without arrow
- Cross-clause antecedents silently skipped: ✅

**Gap:** The antecedent is shown as TEXT ("関係節 ← ἕν") but there is no visual line drawn from the relative clause to the antecedent's position in the main line. R-K would show an explicit dashed line connecting the pronoun to the antecedent word.

**Data:** 947 connectors NT-wide (gate chapters: JHN1=6, EPH2=3, COL1=5, PHP2=2, ROM6=2).

**L-0 risk:** NONE for text label. Line connection would require knowing the column position of the antecedent — technically feasible but layout-dependent.

**Implementation cost:** HIGH for actual connecting line. CURRENT STATE (text label) is functional and clear.

**Recommendation:** CURRENT STATE ACCEPTABLE. "関係節 ← X" is unambiguous. Visual connecting line is a P6-F enhancement.

---

## Item 11: Infinitive / AcI Structure

**R-K principle:** Infinitive shown with a bracket notation. In AcI (Accusative + Infinitive = subject + predicate of embedded clause), the accusative is the logical subject and the infinitive is the embedded predicate.

**Leedy adaptation:** Greek infinitive clauses (with or without article) shown as embedded propositions. Articular infinitive (τοῦ + inf) shown with article as a nominalizing marker.

**Current DG expression:**
- NOMINALIZED_CLAUSE construction: NOT extracted — 2,008 occurrences NT-wide, 47 in gate chapters
- Articular infinitive tokens: rendered as slot text but no special visual treatment
- AcI structure (accusative + infinitive): NOT shown as embedded S+P

**Gap:** SIGNIFICANT. Infinitives and AcI structures (common in Greek epistolary and narrative) are not diagrammed. They appear as tokens within slots but the internal structure (AcI's embedded subject + predicate relationship) is invisible. NOMINALIZED_CLAUSE construction in SR data is not consumed by dg-engine.

**Data:** NOMINALIZED_CLAUSE = 2,008 NT-wide; CONTENT_CLAUSE (ὅτι + full clause as OBJECT) = 908.

**L-0 risk:** MEDIUM. SR has NOMINALIZED_CLAUSE and CONTENT_CLAUSE construction types that identify these. AcI specific: the accusative as logical subject is labeled in SR (fn=SUBJECT within the embedded clause in some cases). New rendering path required but no new syntactic inference needed — SR data is sufficient.

**Implementation cost:** MEDIUM-HIGH. Requires new rendering path in `deriveClauseCore` to handle NOMINALIZED_CLAUSE and CONTENT_CLAUSE as embedded structures rather than opaque slot text.

**Recommendation:** CANDIDATE for P6-F. CONTENT_CLAUSE (908 occurrences) and NOMINALIZED_CLAUSE (2,008) are among the most impactful unrendered constructions. Both have SR support. Would significantly improve epistolary text comprehension (Romans, Ephesians, Hebrews especially).

---

## Item 12: Genitive Modifier

**R-K principle:** Possessive/genitive modifier on a diagonal below the head noun it modifies.

**Leedy adaptation:** Greek genitive typically shown on a diagonal below the head noun. Objective genitive vs subjective genitive may have different labels.

**Current DG expression:**
- Genitive modifier: ✅ — extracted via `extractSlotModifiers()` → `modifiers: [{label:'属格修飾'}]`
- Shown in modifier zone: ✅ — `.dg-slot-mod-cell` with L-bracket connector
- Multiple genitives: ✅ — stacked in modifier zone

**Gap:** MINOR. The genitive is shown with an L-bracket connector (not a diagonal) below the slot. The structural relationship is clear but not diagrammatically precise per R-K's diagonal notation. Subjective vs objective genitive distinction: not shown (L-0 — semantic distinction).

**L-0 risk:** Semantic distinction (subjective/objective genitive) is L-0 territory. Not addressable without theological commentary.

**Implementation cost:** LOW for current state improvement. Diagonal notation would require same layout changes as Item 2.

**Recommendation:** CURRENT STATE ACCEPTABLE. L-bracket is functionally clear. Diagonal improvement is bundled with Item 2/3 for P6-F.

---

## Item 13: Greek Word Order Preservation

**R-K principle:** R-K was designed for English fixed word order. Leedy adapts by showing tokens in surface order within the structural position (left-to-right within a slot = surface order).

**Current DG expression:**
- Surface index (`si = minSI(child)`) used for sorting: ✅ — slots sorted by `minSI`, modifier cells aligned to slot positions
- Main line reads left-to-right in Greek surface order: ✅
- Modifiers shown in their position relative to the slot: ✅

**Gap:** NONE for fundamental order. Minor: when a slot contains multiple tokens in complex NP (e.g., ARTICULAR_NP with attributive adjective), the slot text shows all tokens but the internal arrangement may not always reflect precise surface order (headSIs filtering may reorder). Not verified at token-level precision.

**L-0 risk:** NONE.

**Implementation cost:** N/A — current implementation is correct.

**Recommendation:** PASS. Current SI-based ordering is adequate.

---

## Item 14: L-0 / Ambiguity Boundary

**R-K principle:** R-K does not address ambiguity — it presents one analysis. For educational use, a "best analysis" is chosen.

**Leedy adaptation:** Same. Single analysis shown.

**Current DG expression:**
- SR provides one analysis (MACULA/MARBLE annotations): ✅
- When SR data exists: DG renders SR analysis without ambiguity markers: ✅
- When SR data does not exist: `.sd-empty` fallback: ✅
- UNRESOLVED fn: 6 occurrences NT-wide → treated as ADVERBIAL currently: OBSERVED

**Gap:** When the SR analysis is ambiguous or the DG rendering cannot represent the structure (e.g., APPOSITION, NP_COMPLEX), the structure silently falls through without indication. There is no "uncertain" or "see note" marker.

**L-0 risk:** Adding ambiguity markers would require judgment about which structures are ambiguous — this is L-0 territory. The safer approach is to ensure that unrenderable structures fall through gracefully (which they do) without adding ambiguity claims.

**Implementation cost:** N/A — adding ambiguity markers is L-0.

**Recommendation:** PASS (current silent skip is the correct behavior). Do not add ambiguity markers.

---

## Item 15: Discourse Analysis Integration余地

**R-K principle:** R-K does not address discourse level. Sentence diagrams are individual sentences.

**Leedy adaptation:** Same. Individual sentence analysis.

**Current DG expression:**
- DA mode: HIDDEN (UI entry removed, implementation preserved)
- Discourse connectors (γάρ, οὖν, δέ, etc.) in DG: shown as ADVERBIAL slots or adverbial phrases with their lexical text
- No inter-sentence connector visualization in DG mode: by design

**Gap:** Discourse particles in Greek (γάρ, οὖν, δέ, ἀλλά) function at the discourse level, not the sentence level. In the DG view, they appear as adverbial modifiers. This is structurally defensible (they attach to the clause) but loses the discourse function.

**DA integration余地:** When DA is re-integrated, the DG could show discourse connectors with a special marker (e.g., different color or icon) to indicate discourse function. This would require coordination between DA and DG data — currently independent pipelines.

**L-0 risk:** LOW for marker only. Discourse label assignment is L-0 (requires theological/rhetorical judgment).

**Implementation cost:** N/A for now (DA hidden). Future: MEDIUM — would need DA connector data to flow into DG render path.

**Recommendation:** DEFERRED until DA re-integration is planned. Note the integration point for future design.

---

## Summary Table

| # | Item | Current | Gap | L-0 Risk | Cost | Recommendation |
|---|---|---|---|---|---|---|
| 1 | Main line visual primacy | IMPLEMENTED | Minor (font weight) | NONE | LOW | DEFERRED |
| 2 | Modifier attachment | IMPLEMENTED (L-bracket) | No diagonal line | NONE | MEDIUM | DEFERRED |
| 3 | Word-level modifier diagonal | PARTIAL | Token-level positioning | LOW | HIGH | DEFERRED |
| 4 | Clause-level subordinate connection | IMPLEMENTED | No slot-specific connector | NONE | MEDIUM | DEFERRED |
| 5 | Coordination visual grammar | IMPLEMENTED | No explicit parallel lines | NONE | LOW | DEFERRED |
| 6 | Predicate complement vs object | **PASS** | None | NONE | N/A | PASS |
| 7 | Indirect object visual treatment | GAP | IO on main line (should be platform) | LOW | MEDIUM-HIGH | **P6-F CANDIDATE** |
| 8 | PP internal structure | PARTIAL | Inline not diagonal | NONE | MEDIUM | **P6-F CANDIDATE** |
| 9 | Participial attachment | IMPLEMENTED | No head-noun connection | MEDIUM | HIGH | CURRENT ACCEPTABLE |
| 10 | Relative clause connector | **IMPLEMENTED (P6-C)** | No visual connecting line | NONE | HIGH | CURRENT ACCEPTABLE |
| 11 | Infinitive / AcI structure | **GAP** | Not rendered | MEDIUM | MEDIUM-HIGH | **P6-F CANDIDATE** |
| 12 | Genitive modifier | IMPLEMENTED | No diagonal (same as #2) | LOW (semantic) | LOW | CURRENT ACCEPTABLE |
| 13 | Greek word order preservation | **PASS** | None | NONE | N/A | PASS |
| 14 | L-0 / ambiguity boundary | PASS (silent skip) | No ambiguity marker | L-0 (do not add) | N/A | PASS |
| 15 | DA integration余地 | DEFERRED (DA hidden) | Discourse markers | LOW | MEDIUM (future) | DEFERRED |

**P6-F Candidates (highest value, SR data supports):**
1. **Item 7: Indirect Object (IO platform)** — 2,662 occurrences, fn=INDIRECT_OBJECT in SR, medium cost
2. **Item 8: PP internal structure (diagonal)** — 11,889 PREP_PHRASE, fully in SR, medium cost
3. **Item 11: Infinitive/AcI/CONTENT_CLAUSE** — 2,008 + 908 occurrences, SR construction types available

---

*Refs: P6-E_relationship_matrix.md / P6-E_design_options.md / P6-E_final_report.md*
