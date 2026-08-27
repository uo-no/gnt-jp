# P6-G.6.2 — APPOSITION Repair Design: Final Report

**Date:** 2026-08-25  
**Phase:** P6-G.6.2 — Repair Design (read-only)  
**Predecessor:** P6-G.6.1 APPOSITION Audit (PASS)  
**Constraint:** No production code changes. Design specification only.

---

## Decision

> **PASS — Ready to proceed to P6-G.6.3 Implementation**

All design requirements are resolved. Implementation path is fully specified. No blocking conditions.

---

## Design Summary

### Candidate Selection: Candidate E

Candidate E (border-bottom dashed on head span) selected over Candidate A (separate "=" element).  
**Reason:** Fewer DOM elements; aligns with existing dashed-line vocabulary (`dg-conn-implied`); same visual grammar outcome.

### Architecture Confirmed

- **Engine change:** NONE (`dg-engine.js` untouched)
- **SR change:** NONE
- **DR schema change:** NONE
- **Implementation file:** `public/index.html` only
- **Changes:** 4 targeted changes (CSS × 2, JS helper × 1, JS detection × 1)
- **L-0 status:** SAFE — all rendering decisions from SR SSOT (children[0/1])

---

## Visual Target (Confirmed)

Reed-Kellogg / Leedy parallel-segment notation:

```
[head NP text      ]   ← .dg-appos-head (border-bottom: 1px dashed)
────────────────────   ← dashed line (CSS; same vocabulary as dg-conn-implied)
[appositive text   ]   ← .dg-appos-appositive (font-size: .92rem)
[fn label: 主語    ]   ← .dg-slot-fn (unchanged)
════════════════════   ← main baseline (.dg-main-line border-bottom: 2px solid)
```

---

## Implementation Specification Summary

### Change 1: New CSS Rules (insert after `.dg-cc-clause`)

```css
/* P6-G-4.4: APPOSITION parallel-segment notation */
.dg-appos-wrap {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
}
.dg-appos-head {
    font-family: var(--font-greek);
    font-size: 1rem;
    color: var(--text-main);
    white-space: nowrap;
    border-bottom: 1px dashed var(--text-sub);
    padding-bottom: 2px;
}
.dg-appos-appositive {
    font-family: var(--font-greek);
    font-size: .92rem;
    color: var(--text-main);
    white-space: nowrap;
    padding-top: 3px;
    opacity: .9;
}
```

### Change 2: Mobile Override (inside `@media (max-width: 480px)`)

```css
    .dg-appos-head { font-size: .9rem; }
    .dg-appos-appositive { font-size: .82rem; }
```

### Change 3: New Helper Function (between `_dgRenderSlotModZone` and `_dgRenderAdvPhrases`)

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

### Change 4: APPOSITION Detection in `_dgRenderMainLine()` (replace textEl block)

```javascript
if (slot.contentClause && slot.contentClause.innerDR) {
    textEl.textContent = slot.contentClause.conjunction || '内容節';
    slotEl.appendChild(textEl);
} else if (slot.node?.construction?.canonical === 'APPOSITION') {
    // P6-G-4.4: APPOSITION — parallel segment notation
    slotEl.appendChild(_dgRenderAppositionSlot(slot.node));
} else {
    textEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
    slotEl.appendChild(textEl);
}
```

---

## Design Decisions Log

| Decision | Choice | Reason |
|----------|--------|--------|
| Candidate A vs E | **E** (border-bottom) | Simpler DOM; matches existing dashed vocabulary |
| Engine change | **NONE** | DR already routes APPOSITION nodes to slots correctly |
| APPOSITION = modifier? | **NO** | Parallel segments, NOT modifier zone (mandate) |
| Nested APPOSITION depth | **1** (non-recursive) | Safety; depth-2 nesting creates unusable slot height |
| fn=IO APPOSITION | **Excluded** | IO platform is a separate renderer path |
| displayText vs headDisplayText | **displayText** | children[0/1] are self-contained NPs; full text is correct |
| white-space | **nowrap** | Consistent with all other slot/PP text; horizontal scroll handles overflow |
| align-items on wrap | **stretch** | Dashed border-bottom spans full wrap width |

---

## Coverage After Implementation

| Case | Count | Status after G-4.4 |
|------|-------|---------------------|
| APPOSITION fn=SUBJECT in DR | ~252 | ✅ VISUALIZED (parallel segments) |
| APPOSITION fn=OBJECT in DR | ~125 | ✅ VISUALIZED |
| APPOSITION fn=COMPLEMENT in DR | ~28 | ✅ VISUALIZED |
| APPOSITION fn=AUX in DR | ~26 | ✅ VISUALIZED |
| **Total main line** | **~431** | ✅ |
| APPOSITION fn=IO in DR | 36 | ⚠️ Flat text (IO path; out of scope) |
| Buried APPOSITION | 1,404 | ⚠️ SR-structural limit; unchanged |
| APPOSITION in adv phrases | ~19 | ⚠️ Adv path; out of scope |

---

## Regression Risk Summary

| Surface | Risk | Design response |
|---------|------|-----------------|
| Slot height increase | MODERATE | `align-items: flex-end` on main-line handles naturally; connectors stretch or bottom-anchor |
| `dg-conn-sp` (stretch) | RESOLVED | Stretches to full APPOSITION slot height — correct behavior |
| `dg-conn-complement`/`implied` (36px fixed) | LOW | `::after` starts at `bottom: 0`; baseline alignment preserved |
| IO platform | NONE | fn=IO filtered before baseSlots loop |
| CC sub-diagram | NONE | CC detection precedes APPOSITION check |
| PP diagonal | NONE | adv zone separate from main line |
| Relative clause | NONE | `dg-rel-clause` is in adv zone |
| Mobile overflow | LOW | `white-space: nowrap` + existing `overflow-x: auto` |
| Console errors | VERY LOW | No engine change; renderer change is additive |

---

## Test Matrix Summary

| Priority | Tests | Required |
|----------|-------|----------|
| P1 (Core rendering) | T-1 to T-6 | MUST PASS |
| P2 (Gate regression) | T-7 to T-11 | MUST PASS |
| P3 (Edge cases) | T-12 to T-15 | MUST PASS |
| P4 (Mobile + connectors) | T-17 to T-20 | SHOULD PASS |
| P5 (Secondary regression) | T-21 to T-25 | MONITOR |

Key test verses:
- MAT 1:19 — "Ἰωσὴφ ὁ ἀνὴρ αὐτῆς" (SUBJECT; Pattern B)
- MAT 2:3 — "ὁ βασιλεὺς Ἡρῴδης" (SUBJECT; Pattern C)
- MAT 1:2 — "τὸν Δαυὶδ τὸν βασιλέα" (OBJECT; Pattern C)
- COL 1:3 — "τῷ θεῷ πατρί" (IO — should remain flat; T-14)
- MAT 1:1 — "Ἰησοῦ Χριστοῦ" (buried — should remain flat; T-15)

---

## First Principle Check

> APPOSITIONをmodifierと同一視しない。

Confirmed:
- `.dg-appos-wrap` is a new dedicated structure, not `dg-adv-item` or `dg-slot-mod-zone`
- Visual output: parallel horizontal segments (head / dashed line / appositive) — not a "modifier drops down from slot"
- The dashed line signals co-referential relationship, not dependency

> SRにないattachmentを推測しない。

Confirmed:
- `slot.node.construction.canonical === 'APPOSITION'` — SR explicit
- `children[0]` = head — SR structural invariant
- `children[1]` = appositive — SR structural invariant
- No discourse inference, no referent lookup, no grammatical case inference

> 既存のIO platform / PP diagonal / contentClause architectureを壊さない。

Confirmed: All three unchanged. See non-changes table in implementation spec.

---

## L-0 Final Status

| Check | Status |
|-------|--------|
| APPOSITION relationship used from SR | ✅ SAFE |
| Head NP identified from SR children[0] | ✅ SAFE |
| Appositive NP identified from SR children[1] | ✅ SAFE |
| No discourse inference | ✅ SAFE |
| No referent resolution | ✅ SAFE |
| No grammatical case inference from position | ✅ SAFE |

---

## Deliverable Index

| Document | Status |
|----------|--------|
| `P6-G.6.2_apposition_repair_design.md` | ✅ Complete |
| `P6-G.6.2_apposition_implementation_spec.md` | ✅ Complete |
| `P6-G.6.2_apposition_test_matrix.md` | ✅ Complete |
| `P6-G.6.2_apposition_final_report.md` | ✅ This document |

All 4 deliverables complete. No production code changes made during this phase.

---

## Known Limitations (Carried Forward)

| Limitation | Count | Note |
|-----------|-------|------|
| Buried APPOSITION (structural) | 1,404 | SR-structural; renderer-only cannot address |
| APPOSITION fn=IO flat text | 36 | IO platform path; separate future scope |
| Nested APPOSITION inner levels | ~206 | Depth-1 rule; flat head text (correct fallback) |
| Pattern F (inside PP) | 253 | All buried; PP handles displayText |

---

*P6-G.6.2 design phase complete. STOP. Do not begin P6-G.6.3 or any implementation.*
