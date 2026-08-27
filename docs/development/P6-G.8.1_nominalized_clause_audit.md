# P6-G.8.1 — NOMINALIZED_CLAUSE Read-only Audit

**Date:** 2026-08-26  
**Phase:** P6-G.8.1 — Read-only Audit  
**Predecessor:** P6-G.7 Remaining Visual Grammar Gap Reassessment (PASS WITH LIMITATIONS)  
**Constraint:** No production code changes. No dg-engine.js changes. Read-only audit.

---

## 1. Objective

Conduct a comprehensive read-only audit of NOMINALIZED_CLAUSE as a visual grammar gap.

Deliverables (4 documents):
- `P6-G.8.1_nominalized_clause_audit.md` — this document
- `P6-G.8.1_nominalized_clause_relationship_matrix.md` — SR→DR→Renderer pipeline
- `P6-G.8.1_nominalized_clause_test_matrix.md` — gate chapter test cases
- `P6-G.8.1_nominalized_clause_final_report.md` — design candidates + decision

---

## 2. SR Definition: What is NOMINALIZED_CLAUSE?

NOMINALIZED_CLAUSE is a syntactic construction (cn=NOMINALIZED_CLAUSE) in the SR schema.  
It describes a clause functioning in a nominal (noun-like) slot — subject, object, complement, etc. — where the clause itself is not introduced by a complementizer (unlike CONTENT_CLAUSE).

In NT Greek, the primary realizations are:

| Greek Type | Description | Example |
|-----------|-------------|---------|
| Articular infinitive | Article (τό + case) + infinitive clause | τὸ ζῆν (living), τοῦ πιστεύειν |
| Substantive participle | Article + participial clause | ὁ ἀποθανών (the one who died), οἱ πτωχοί |
| Substantive adjective/NP | Article nominalizing a word-class | τὰ ἀόρατα (the invisible things) |

NOMINALIZED_CLAUSE is **distinct from CONTENT_CLAUSE**:
- CONTENT_CLAUSE: finite embedded clause introduced by ὅτι, ἵνα, εἰ, etc. → sub-diagram rendered
- NOMINALIZED_CLAUSE: clause functioning as noun WITHOUT a complementizer → NO sub-diagram

---

## 3. NT-wide Measurement

| Metric | Value | Method |
|--------|-------|--------|
| SR total (cn=NOMINALIZED_CLAUSE) | 2,008 | CONFIRMED — DR audit script |
| Gate SR | 47 | CONFIRMED |
| DR main slots | 271 | CONFIRMED (canonical: 276¹) |
| DR as % of SR | 13.7% | |
| Gate DR | 5 | CONFIRMED |
| Adv zone DR (adverbialClauses) | 0 | CONFIRMED |
| NOMINALIZED_CLAUSE in DR with contentClause | 0 | CONFIRMED — null for all |
| NOMINALIZED_CLAUSE in DR with headSIs | 0 | CONFIRMED — null for all |

¹ *Variance of 271 vs 276 is within script traversal methodology difference (same as G.7 finding).*

---

## 4. Pattern Classification (SR)

### Patterns A–H by SR fn

| Pattern | fn | SR Count | % | DR-reachable? | Notes |
|---------|-----|---------|---|---------------|-------|
| **A** | null (buried) | 1,112 | 55.4% | No | Inside PP, NP_COMPLEX, GENITIVE_MOD etc. |
| **B** | SUBJECT | 466 | 23.2% | Yes — MAIN_FN | Primary target |
| **C** | OBJECT | 156 | 7.8% | Yes — MAIN_FN | |
| **D** | ADVERBIAL | 98 | 4.9% | No — adv zone² | Separate rendering path |
| **E** | AUX | 62 | 3.1% | Yes — MAIN_FN | Unusual but SR-explicit |
| **F** | COMPLEMENT | 51 | 2.5% | Yes — MAIN_FN | |
| **G** | INDIRECT_OBJECT | 62 | 3.1% | Yes — IO platform | |
| **H** | OBJECT2 | 1 | 0.1% | No — engine gap³ | Existing OBJECT2 engine gap |

**Note ²:** fn=ADVERBIAL is routed to the adv zone, not to DR slots. Furthermore, CONFIRMED: 0 NOMINALIZED_CLAUSE nodes appear in DR adverbialClauses — they are effectively buried at SR level (fn=ADVERBIAL path does not surface them as typed clause objects).

**Note ³:** fn=OBJECT2 is blocked by the OBJECT2 engine gap (separate issue — P6-G.7).

### Summary: DR-reachable patterns

| Pattern | DR Count |
|---------|---------|
| B (SUBJECT) | 170 |
| E (AUX) | 34 |
| C (OBJECT) | 32 |
| F (COMPLEMENT) | 18 |
| G (INDIRECT_OBJECT) | 17 |
| **Total** | **271** |

---

## 5. Structural Sub-types (NOMINALIZED_CLAUSE in DR)

Analysis of the first token of each NOMINALIZED_CLAUSE node in DR:

| Sub-type | Description | Count | % |
|---------|-------------|-------|---|
| **I** | Article + participial clause (substantive participle) | 237 | 87.4% |
| **II** | Articular infinitive (τό/τοῦ/τῷ/τόν + infinitive) | 34 | 12.6% |
| **III** | Conjunction-introduced nominal (ὅτι/ἵνα as noun) | 0 | 0% |
| **IV** | Other/complex | 0 | 0% |

**Key finding:** NOMINALIZED_CLAUSE in DR is exclusively:
1. Substantive participle (article + participle or participial phrase) — 87%
2. Articular infinitive — 13%

No ὅτι/ἵνα types reach DR main slots. Those are buried (Pattern A) or routed to the adv zone.

**First token distribution (top):**

| Token | Count | Type |
|-------|-------|------|
| ὁ | 143 | m.sg. article → substantive masc.sg. |
| οἱ | 44+5 | m.pl. article → substantive masc.pl. |
| τὸ | 24+1 | n.sg. article → articular infinitive or substantive neut. |
| τοὺ- | 13 | gen./acc.pl. article → substantive |
| τοῖ- | 10+1 | dat.pl. article → substantive |
| τῷ | 10+2 | dat.sg. → often articular infinitive (τῷ ζῆν) |
| τὸν | 8+1 | acc.sg. → articular infinitive (τὸν ζῆν) or substantive |
| ἡ | 6 | f.sg. article → substantive fem. |

---

## 6. DR Pipeline Analysis

### 6.1 SR → deriveDR()

NOMINALIZED_CLAUSE nodes with fn in MAIN_FN (`SUBJECT`, `COPULA`, `PREDICATE`, `OBJECT`, `COMPLEMENT`, `INDIRECT_OBJECT`, `SECOND_OBJECT`, `AUX`) enter DR as main line slots.

```javascript
// dg-engine.js deriveClauseCore() (line ~416–519)
if (MAIN_FN.has(child.function.canonical)) {
    slots.push({ fn: child.function.canonical, node: child, ... });
}
```

**Result for NOMINALIZED_CLAUSE:** slot.node = the NOMINALIZED_CLAUSE node, slot.fn = its function, slot.contentClause = null (not processed by `_extractContentClause()` which only handles CONTENT_CLAUSE), slot.headSIs = null (not processed by `_extractEmbeddedRelClauses()` which only handles CLAUSE_AS_NP).

### 6.2 deriveDR() → Renderer

```javascript
// dg-engine.js headDisplayText() (line ~404–412)
if (headSIs === null) {
    return displayText(node);  // all tokens joined with spaces
}
```

For NOMINALIZED_CLAUSE: headSIs=null → headDisplayText returns full displayText = all descendant tokens.

### 6.3 Renderer branch (_dgRenderMainLine() in index.html)

Current renderer decision tree (simplified):

```javascript
if (slot.contentClause && slot.contentClause.innerDR) {
    // CONTENT_CLAUSE branch — renders sub-diagram
} else if (slot.node?.construction?.canonical === 'APPOSITION') {
    // APPOSITION branch — renders parallel segments (P6-G.6.3)
} else {
    // Default: flat text
    textEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
    slotEl.appendChild(textEl);
}
```

**NOMINALIZED_CLAUSE falls through to the default branch.** Text output is correct (full displayText), but no visual distinction from a regular NP.

---

## 7. CONTENT_CLAUSE Comparison

| Property | CONTENT_CLAUSE | NOMINALIZED_CLAUSE |
|----------|---------------|---------------------|
| SR construction | cn=CONTENT_CLAUSE | cn=NOMINALIZED_CLAUSE |
| SR function | fn=OBJECT/SUBJECT/COMPLEMENT | fn=SUBJECT/OBJECT/COMPLEMENT/AUX/IO |
| Introduced by | ὅτι, ἵνα, εἰ, ὅτε etc. (complementizer) | article (articular inf.) or article+participle |
| Inner structure | Full finite clause — engine extracts | Nominalized — engine does NOT extract |
| slot.contentClause | `{ innerDR: {...}, conjunction: 'ὅτι' }` | `null` |
| slot.headSIs | null (conjunction is label, not head) | null |
| Renderer branch | CONTENT_CLAUSE branch → sub-diagram | Default branch → flat text |
| DR count | 326 (100% have innerDR) | 271 |
| Visual output | Embedded sub-diagram + conjunction label | Flat text — no distinction |
| RK/Leedy target | Sub-diagram (already implemented P6-G.4) | Bracket `[...]` notation |

**Critical distinction:** CONTENT_CLAUSE renders a sub-diagram because the inner finite clause has its own main line structure. NOMINALIZED_CLAUSE does NOT need a sub-diagram — the nominalized clause is atomic as a noun-slot filler. The visual goal is a bracket `[...]` around the existing flat text.

---

## 8. Gate Chapter NOMINALIZED_CLAUSE Detail

Gate DR = 5 total (3 in MAT 5, 1 in PHP 2, 1 in ROM 6):

| Ref | fn | displayText | Sub-type | Children |
|-----|----|-------------|---------|---------|
| MAT 5:4 | SUBJECT | οἱ πενθοῦντες, | I (subst.ptc.) | [token:οἱ, token:πενθοῦντες] |
| MAT 5:6 | SUBJECT | οἱ πεινῶντες καὶ διψῶντες τὴν δικαιοσύνην, | I (subst.ptc.) | [token:οἱ, clause] |
| MAT 5:10 | SUBJECT | οἱ δεδιωγμένοι ἕνεκεν δικαιοσύνης, | I (subst.ptc.) | [token:οἱ, clause] |
| PHP 2:13 | COMPLEMENT | ὁ ἐνεργῶν ἐν ὑμῖν καὶ τὸ θέλειν καὶ τὸ ἐνεργεῖν ὑπὲρ τῆς εὐδοκίας. | I (subst.ptc.) | [token:ὁ, clause] |
| ROM 6:7 | SUBJECT | ὁ ἀποθανὼν | I (subst.ptc.) | [token:ὁ, token:ἀποθανὼν] |

All 5 gate DR instances are Sub-type I (substantive participle). No articular infinitive (Sub-type II) in gate chapters.

**JHN 1 note:** JHN 1 has 0 NOMINALIZED_CLAUSE in DR (all 47 gate SR minus 5 that surface in MAT 5/PHP 2/ROM 6 are buried). JHN 1 NOMINALIZED_CLAUSE instances all have fn=null (Pattern A — buried inside other constructions).

---

## 9. Engine Change Assessment

**Engine change required: NO.**

Detection in renderer: `slot.node?.construction?.canonical === 'NOMINALIZED_CLAUSE'`  
This is SR SSOT (cn=NOMINALIZED_CLAUSE is explicit). No inference. No engine change needed.

The visual bracket is a presentation wrapper around the existing `headDisplayText()` output. No change to:
- deriveDR() routing
- headDisplayText() logic
- MAIN_FN set
- Any slot extraction function

**L-0 status: SAFE.** Bracket signals "this slot contains a clause functioning as noun" — directly readable from SR cn=NOMINALIZED_CLAUSE. No inference about syntactic structure or referent.

---

## 10. Known Limitations (Carried Forward)

| Limitation | SR Count | Reason |
|-----------|---------|--------|
| Pattern A (buried fn=null) | 1,112 | Structural — inside PP, NP_COMPLEX etc. |
| Pattern D (ADVERBIAL) | 98 | Adv zone path — different renderer |
| Pattern H (OBJECT2) | 1 | Existing OBJECT2 engine gap |
| Total non-reachable SR | ~1,737 | SR-structural; cannot be fixed by renderer alone |

Pattern G (fn=INDIRECT_OBJECT, 17 DR slots) reaches the IO raised platform. The bracket notation does not need to interfere with the IO platform rendering — the IO slot has its own renderer branch (before the APPOSITION/default branch). NOMINALIZED_CLAUSE with fn=INDIRECT_OBJECT will render on the IO platform with the existing `headDisplayText()` flat text — bracket addition would need to be applied inside the IO renderer as well, or treated as a separate sub-phase.

**Scope recommendation for P6-G.8.3 implementation:** Initially target only main line slots (fn=SUBJECT/OBJECT/COMPLEMENT/AUX), which account for 254/271 DR slots. IO (17 slots) can be addressed separately.

---

## 11. Regression Surface

The bracket addition is a new detection branch inserted between the APPOSITION branch and the default branch in `_dgRenderMainLine()`. The following existing features must not regress:

| Feature | Mechanism | Interaction |
|---------|-----------|-------------|
| CONTENT_CLAUSE sub-diagram | `slot.contentClause.innerDR` branch (checked first) | None — branch checked before NOMINALIZED_CLAUSE |
| APPOSITION parallel segments | `slot.node.construction.canonical === 'APPOSITION'` | None — branch checked before NOMINALIZED_CLAUSE |
| IO raised platform | fn=INDIRECT_OBJECT → separate platform rendering | None — IO rendered outside main line slot |
| PP diagonal | adverbialPhrases (separate) | None |
| Relative clause connector | adverbialClauses (separate) | None |
| Regular NP slots | Default branch | Must remain as is if cn ≠ NOMINALIZED_CLAUSE |
| APPOSITION inside NOMINALIZED_CLAUSE | Both cn=APPOSITION and cn=NOMINALIZED_CLAUSE could theoretically co-occur | Checked: priority of APPOSITION branch comes before NOMINALIZED_CLAUSE — no conflict if nested correctly |

---

*P6-G.8.1 audit complete. No production code changes. Read-only.*
