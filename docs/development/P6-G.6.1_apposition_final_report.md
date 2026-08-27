# P6-G.6.1 — APPOSITION Visual Grammar Audit: Final Report

**Date:** 2026-08-25  
**Phase:** P6-G.6.1 — Read-only audit  
**Auditor:** Claude Sonnet 4.6  
**Baseline:** P6-G.5 (APPOSITION ranked #1 next gap at 78.5%)  
**Constraint:** No production code changes during this audit.

---

## Decision

> **PASS — Ready to proceed to P6-G.6.2 Repair Design**

The APPOSITION relationship is visually renderable using the existing DG architecture without engine change. The implementation path is well-defined, L-0-safe, and regression risk is understood. Block conditions: none.

---

## A. NT-Wide APPOSITION Coverage

| Metric | Value | Source |
|--------|-------|--------|
| APPOSITION (SR total) | 1,890 | CONFIRMED — NT-wide script |
| In DR (slots) | 467 (24.7%) | CONFIRMED — DR walk |
| In DR (adv phrases) | ~19 | CONFIRMED |
| In DR (total) | ~486 (25.7%) | CONFIRMED |
| Buried (not in DR) | 1,404 (74.3%) | CONFIRMED |
| Gate chapter total (SR) | 70 | CONFIRMED |
| Gate chapter total (DR est.) | ~19 | ESTIMATED (24.7% × 70) |

**P6-G.5 cross-check:** All figures match G-5 measurements. SR data unchanged. ✅

---

## B. Pattern Classification

| Pattern | Count | % |
|---------|-------|---|
| C — Articular NP → appositive | 480 | 25.4% |
| B — Proper noun → appositive | 439 | 23.2% |
| E — Apposition with internal modifiers | 301 | 15.9% |
| F — Apposition inside PREP_PHRASE | 253 | 13.4% |
| I — Nested apposition | 206 | 10.9% |
| A — Common noun → appositive | 203 | 10.7% |
| D — Pronoun → appositive | 8 | 0.4% |
| G / H / J | 0 | — |
| **Total** | **1,890** | 100% |

**Key findings:**
- Patterns B and C dominate — proper names with titles/roles ("Ἰωάννης ὁ βαπτιστής", "ὁ βασιλεὺς Ἡρῴδης")
- Pattern I (nested, 206) = APPOSITION inside APPOSITION; typically rendered as flat head text in the outer appositive children[0] — correct fallback
- Pattern F (inside PP, 253) = entirely buried; PP handles displayText — structural limit
- SR children structure: invariably `children[0]` = head, `children[1]` = appositive (CONFIRMED in all DR-reachable instances)

---

## C. SR → DR → Renderer Path

### Confirmed Pipeline (467 main line cases)

```
SR: { cn=APPOSITION, fn=SUBJECT/OBJECT/COMPLEMENT/IO/AUX, children=[head_NP, appositive_NP] }
 ↓
dg-engine.js: MAIN_FN.has(fn) → true
  extractSlotModifiers(APPOSITION_node) → null (no APPOSITION case)
  mainSlots.push({ fn, node: APPOSITION_node, headSIs: null, modifiers: [] })
 ↓
DR: slot = { fn: 'SUBJECT', node: APPOSITION_node, headSIs: null }
 ↓
renderer: headDisplayText(APPOSITION_node, null) = displayText(APPOSITION_node)
         = "head_tokens appositive_tokens" concatenated → flat text
```

**Gap is 100% in the renderer.** Engine routing is correct. No engine change required.

---

## D. Current Gap (Confirmed)

| Case | Current behavior | Target behavior |
|------|-----------------|-----------------|
| APPOSITION fn=SUBJECT in DR | "Ἰωσὴφ ὁ ἀνὴρ αὐτῆς" — flat text | Head over dashed line over appositive |
| APPOSITION fn=OBJECT in DR | "τὸν Δαυὶδ τὸν βασιλέα" — flat text | Parallel segments |
| APPOSITION fn=COMPLEMENT in DR | flat text | Parallel segments |
| APPOSITION fn=AUX in DR | flat text | Parallel segments |
| APPOSITION fn=IO in DR | flat text (IO platform) | Out of scope for G-4.4 |
| Buried APPOSITION | part of parent flat text | Structural limit — unchanged |

**Visual gap confirmed:** No APPOSITION-specific renderer branch exists. No dg-appos CSS classes exist. One label entry only: `_SD_CN_JA.APPOSITION = '同格'` (Structure Diagram only).

---

## E. Candidate Visual Designs

Five candidates evaluated (detailed in audit doc):

| Candidate | Description | RK/Leedy | Engine change | Risk |
|-----------|-------------|----------|---------------|------|
| A/E | Parallel horizontal segments within slot | FULL MATCH | NO | MODERATE |
| B | Modifier zone extension | PARTIAL (implies dependency) | YES | LOW |
| C | Inline "=" text separator | WEAK | NO | LOW |
| D | Badge "同格" only | NOT MET | NO | MINIMAL |

---

## F. RK/Leedy Alignment

Reed-Kellogg / Leedy standard for apposition:
- Appositive placed on **parallel horizontal segment** below the head noun
- Connected by dashed "=" marker indicating co-reference
- Both segments within the same functional slot position

Candidate A/E matches this exactly:
```
  [Ἰωσὴφ]           ← .dg-appos-head
  ═══════════         ← CSS dashed border-bottom
  [ὁ ἀνὴρ αὐτῆς]    ← .dg-appos-appositive
      主語             ← .dg-slot-fn (unchanged)
```

Candidate B fails RK/Leedy: appositive in modifier zone implies dependence (NOT co-reference). Per mandate: "APPOSITIONをmodifierと同一視しない。"

---

## G. L-0 Audit

| Candidate | L-0 status | Reason |
|-----------|-----------|--------|
| A/E | **SAFE** | `cn=APPOSITION` explicit SSOT; `children[0]` = head by SR convention; `children[1]` = appositive by SR convention; no discourse inference |
| B | **SAFE** | Same SR access; engine change is additive |
| C | **SAFE** | displayText only |
| D | **SAFE** | Label only |

All candidates are L-0 SAFE. No candidate requires renderer-side inference about grammatical relationships, referents, or discourse context.

**L-0 verdict: SAFE for Candidate A/E.**

Key SR invariant (CONFIRMED): `construction.canonical = 'APPOSITION'` is unambiguous in SR. `children[0]` is the head; `children[1]` is the appositive. This is SR-structural (not inferred).

---

## H. Mobile Requirements

For G-4.4 implementation phase:

| Requirement | Notes |
|-------------|-------|
| `.dg-appos-wrap` uses flex-column | Natural stacking; wraps at any width |
| `white-space: nowrap` on text spans | Prevents mid-token breaks |
| Slot height increases | Main line height accommodates taller slot |
| Connector lines adapt | `dg-conn` vertical position may need CSS adjustment |
| 390px test required | JHN 1, MAT 5, COL 1 |
| No horizontal overflow from appositive | Long appositives wrap; test T-14a–c |

---

## I. Regression Surface

| Surface | Risk level | Mitigation |
|---------|-----------|------------|
| Slot height change (taller) | MODERATE | CSS review; gate chapter baseline re-measurement |
| `dg-conn` vertical alignment | MODERATE | Test all connector types (sp, po, complement, implied) after fix |
| IO platform (APPOSITION fn=IO) | NONE | IO slots filtered before base slot loop; no change |
| PP diagonal | NONE | adv zone path unaffected |
| Content clause sub-diagram | NONE | CC detection precedes APPOSITION detection in if-chain |
| Relative clause connector | NONE | Separate connector logic |
| Modifier zone | NONE | No modifier zone change in Candidate A/E |
| Structure Diagram | NONE | SD renderer uses `_sdRenderNode()`; separate; `同格` label already present |
| Console errors | LOW | No engine change; renderer change is additive |

**Connector alignment is the primary regression risk.** Gate chapter re-baseline required after implementation.

---

## J. Recommended Implementation Architecture

### Architecture Decision: Candidate A/E

**Renderer-only. No engine change. Parallel horizontal segments.**

**Scope:**
- APPOSITION fn=SUBJECT, OBJECT, COMPLEMENT, AUX in main line slots (~431 cases)
- APPOSITION fn=IO: out of scope (IO platform path; separate future scope)
- Buried APPOSITION (74.3%): structural limit; unchanged

**Implementation touchpoints:**
1. `_dgRenderMainLine()` — add APPOSITION detection branch after CC check:
   ```javascript
   } else if (slot.node?.construction?.canonical === 'APPOSITION') {
       const apposEl = _dgRenderAppositionSlot(slot.node);
       slotEl.appendChild(apposEl);
   } else {
       textEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
       slotEl.appendChild(textEl);
   }
   ```

2. New helper function `_dgRenderAppositionSlot(apposNode)`:
   ```javascript
   function _dgRenderAppositionSlot(apposNode) {
       const children = apposNode.children || [];
       const headNode = children[0] || apposNode;
       const appNode  = children[1] || null;
       const wrap = document.createElement('div');
       wrap.className = 'dg-appos-wrap';
       const headEl = document.createElement('span');
       headEl.className = 'dg-appos-head';
       headEl.textContent = window.DgEngine.displayText(headNode);
       wrap.appendChild(headEl);
       if (appNode) {
           const appEl = document.createElement('span');
           appEl.className = 'dg-appos-appositive';
           appEl.textContent = window.DgEngine.displayText(appNode);
           wrap.appendChild(appEl);
       }
       return wrap;
   }
   ```

3. New CSS classes: `.dg-appos-wrap`, `.dg-appos-head` (border-bottom dashed), `.dg-appos-appositive`

**No changes to:** dg-engine.js, extractSlotModifiers(), headDisplayText(), IO platform renderer, PP diagonal renderer, CC sub-diagram renderer, SD renderer.

---

## K. Decision

**PASS — Ready to proceed to P6-G.6.2 Repair Design**

| Criterion | Result |
|-----------|--------|
| APPOSITION relationship in SR | CONFIRMED — explicit SSOT, 1,890 instances |
| DR routing correct | CONFIRMED — 467 in DR slots (no engine change needed) |
| SR child structure | CONFIRMED — children[0]=head, children[1]=appositive invariant |
| L-0 status | SAFE — all rendering decisions from SR SSOT |
| Renderer-only fix viable | YES — detection at slot render time, no engine change |
| RK/Leedy-compliant design exists | YES — Candidate A/E (parallel segments) |
| Engine change required | NO |
| Mobile strategy defined | YES — flex-column natural stacking |
| Regression surface identified | YES — connector alignment (MODERATE risk) |
| Block conditions | NONE |

**Limitations acknowledged:**
- 74.3% of SR APPOSITION never reach DR (structural limit; renderer-only cannot address)
- APPOSITION fn=IO (36 cases): flat text continues in IO platform path (out of scope)
- Nested APPOSITION inner levels: flattened as head text (correct fallback)
- Gate chapter DR count is ~19 of 70 SR instances (25.7% of gate)

**Next phase:** P6-G.6.2 Repair Design — produce implementation spec, exact code changes, and test plan for Candidate A/E.

---

## Appendix: Document Index

| Document | Status |
|----------|--------|
| `P6-G.6.1_apposition_audit.md` | ✅ Complete |
| `P6-G.6.1_apposition_relationship_matrix.md` | ✅ Complete |
| `P6-G.6.1_apposition_test_matrix.md` | ✅ Complete |
| `P6-G.6.1_apposition_final_report.md` | ✅ This document |

All 4 deliverables complete. No production code changes made during this audit.

---

*P6-G.6.1 audit complete. STOP. Do not begin P6-G.6.2 or any implementation.*
