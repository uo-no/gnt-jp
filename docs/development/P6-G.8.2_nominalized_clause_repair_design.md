# P6-G.8.2 — NOMINALIZED_CLAUSE Repair Design

**Date:** 2026-08-26  
**Phase:** P6-G.8.2 — Design  
**Predecessor:** P6-G.8.1 Read-only Audit (PASS)  
**Constraint:** No production code changes. Design phase only.

---

## 1. Design Purpose

NOMINALIZED_CLAUSE nodes reach DR as main line slots, but the renderer outputs their text indistinguishably from regular noun phrases. The visual gap: a slot filled by "the one who died" looks identical to a slot filled by "Ἰησοῦς."

The repair adds a bracket `[...]` around the slot text. The bracket expresses:

> **This slot is filled by a clause functioning in a nominal structural position.**

The bracket does NOT:
- Identify the type of nominalization (participle vs. articular infinitive)
- Add any semantic interpretation not present in SR
- Render the internal structure of the clause
- Distinguish Sub-type I from Sub-type II
- Alter the slot's function label (主語 / 目的語 / 述語 etc.)

Detection source: `slot.node.construction.canonical === 'NOMINALIZED_CLAUSE'` — SR SSOT.  
Text content: `headDisplayText(slot.node, slot.headSIs)` — identical to current default branch output.

---

## 2. Candidate A — Confirmed

**CSS pseudo-element brackets.** Selected per P6-G.8.1 Final Report recommendation.

Rationale:
1. `.textContent` of the wrapper element = Greek text only. Downstream code reading textContent (search, copy, accessibility APIs) receives clean Greek text.
2. Bracket color (--text-sub) can be controlled independently from text color (--text-main).
3. RK/Leedy authentic: `[...]` is the standard bracket for clauses-as-nouns.
4. Minimal DOM: 1 `<span>` per slot. No helper function needed.
5. Consistent implementation pattern with existing `dg-slot-text` span.

---

## 3. Section 4 Decision — Bracket Boundary

**Boundary selected: A — NOMINALIZED_CLAUSE node全体**

The bracket encloses exactly what `headDisplayText(slot.node, slot.headSIs)` returns.

For NOMINALIZED_CLAUSE: `headSIs = null` → `headDisplayText()` returns `displayText(node)` = all descendant tokens. This IS the entire nominal unit that fills the slot:
- Sub-type I: `[article + participial clause with all dependents]`
- Sub-type II: `[τοῦ + infinitive + all dependents]`

**Rejected boundaries:**

| Option | Reason rejected |
|--------|----------------|
| B (children only) | SR children are internal structure, not the slot-filling unit. headDisplayText() is the SSOT for slot text — not children decomposition. |
| C (head only) | Sub-type I "head" would be article only (e.g., `[οἱ]`) — meaningless and misleading. |
| D (head + dependents without article) | Article is part of the nominalized unit (τὸ ζῆν = "the living" = one unit). Excluding article breaks the semantic unit. |

**Conclusion:** The bracket wraps the existing `headDisplayText()` output unchanged. No new parsing of node internals. L-0 fully maintained.

---

## 4. Sub-type I and Sub-type II — Same Branch

Both sub-types are detected by `slot.node.construction.canonical === 'NOMINALIZED_CLAUSE'`. The renderer branch is identical for both.

Sub-type I example:
```
[οἱ πενθοῦντες,]        ← article + participle + comma (displayText output)
```

Sub-type II example:
```
[τοῦ πιστεύειν αὐτόν]   ← genitive article + infinitive + object
```

No sub-type distinction needed in renderer. The bracket is the complete visual treatment for all NOMINALIZED_CLAUSE in DR.

---

## 5. Main Line Relationship — Connectors Unchanged

The connector (sp / po / complement / implied) is rendered as a separate DOM element BEFORE the slot element. The bracket is inside the slot element. No interaction.

```html
<div class="dg-main-line">
    <div class="dg-slot dg-slot-subject">           <!-- NOMINALIZED_CLAUSE as SUBJECT -->
        <span class="dg-nomc">οἱ πενθοῦντες,</span>  <!-- bracket via ::before/::after -->
        <span class="dg-slot-fn">主語</span>
    </div>
    <div class="dg-conn dg-conn-sp"></div>           <!-- connector: unchanged -->
    <div class="dg-slot dg-slot-predicate">
        ...
    </div>
</div>
```

---

## 6. Modifier Relationship — Separate Zone, No Conflict

Word-level modifiers are extracted into `slot.modifiers[]` and rendered by `_dgRenderSlotModZone()` — a completely separate DOM area below the baseline. The slot text (inside `.dg-nomc`) is the head text after modifier extraction. The bracket wraps the already-extracted head text.

```
[οἱ δεδιωγμένοι]    ← headDisplayText (modifiers extracted)
    主語
═══════════════════
  └── ἕνεκεν δικαιοσύνης  ← modifier zone (separate DOM, _dgRenderSlotModZone)
```

The bracket does NOT enclose the modifier zone. The modifier zone is not affected.

---

## 7. PP Relationship — No Conflict

PP diagonals are rendered by `_dgRenderAdvPhrases()` — completely separate from `_dgRenderMainLine()`. The bracket exists inside a slot element on the main line. PP diagonals attach below the main line. No spatial or DOM conflict.

```
[ὁ ἀποθανὼν]       ← NOMINALIZED_CLAUSE with bracket
    主語
═══════════════════
    │
  ἀπό + θεοῦ       ← PP diagonal (separate DOM zone)
```

---

## 8. APPOSITION Relationship

**Case A: Slot cn=APPOSITION (outer)**

APPOSITION branch is checked BEFORE NOMINALIZED_CLAUSE branch. If the slot node is cn=APPOSITION, the APPOSITION parallel-segment renderer fires. Any NOMINALIZED_CLAUSE inside APPOSITION children is rendered as flat text by `displayText()` — no inner bracket.

This is correct: the bracket applies to the slot-level construction, not to inner children. The outer APPOSITION visual takes precedence.

**Case B: Slot cn=NOMINALIZED_CLAUSE (no APPOSITION at slot level)**

NOMINALIZED_CLAUSE branch fires. If the nominalized clause internally contains APPOSITION-structured children, they are rendered as flat text by `headDisplayText()`. No nested bracket.

**Case C: Nested NOMINALIZED_CLAUSE inside APPOSITION children**

Not separately handled in this phase. displayText() flattening applies. Out of scope for P6-G.8.3.

---

## 9. CONTENT_CLAUSE Regression — Confirmed Safe

Detection order in `_dgRenderMainLine()`:

```
1. slot.contentClause && slot.contentClause.innerDR   → CONTENT_CLAUSE branch (unchanged)
2. slot.node.construction.canonical === 'APPOSITION'   → APPOSITION branch (unchanged)
3. slot.node.construction.canonical === 'NOMINALIZED_CLAUSE'  → NEW: NOMINALIZED_CLAUSE branch
4. else                                                 → default flat text (unchanged)
```

CONTENT_CLAUSE nodes have `slot.contentClause.innerDR != null` → always hit branch 1. They never reach the NOMINALIZED_CLAUSE check (branch 3). No interference.

NOMINALIZED_CLAUSE nodes have `slot.contentClause = null` → never hit branch 1. Correct.

---

## 10. IO Platform Interaction

`_dgRenderMainLine()` splits slots into `baseSlots` (fn ≠ INDIRECT_OBJECT) and `ioSlots` (fn === INDIRECT_OBJECT). The NOMINALIZED_CLAUSE bracket branch only runs inside the `baseSlots` loop.

NOMINALIZED_CLAUSE with `fn=INDIRECT_OBJECT` (17 DR slots): these go to the IO platform renderer, which uses `headDisplayText()` directly (line 12350). The bracket is NOT applied to IO platform slots in this design.

**Scope decision:** IO NOMINALIZED_CLAUSE bracket is deferred. This phase covers 254/271 DR slots (fn=SUBJECT/OBJECT/COMPLEMENT/AUX). IO bracket would require modifying the IO platform renderer — separate sub-phase.

---

## 11. DOM Design

**Class name:** `.dg-nomc`

Conflict check against existing classes:
- `.dg-nomc-wrap` — NOT yet defined (used in P6-G.8.1 draft recommendation, not in production)
- `.dg-nomc` — NOT defined in current index.html
- No conflict. ✓

**DOM structure for a NOMINALIZED_CLAUSE slot:**

```html
<div class="dg-slot dg-slot-subject">
    <span class="dg-nomc">οἱ πενθοῦντες,</span>
    <!-- CSS: .dg-nomc::before { content: '['; } .dg-nomc::after { content: ']'; } -->
    <span class="dg-slot-fn">主語</span>
</div>
```

**DOM structure for a regular NP slot (unchanged):**

```html
<div class="dg-slot dg-slot-subject">
    <span class="dg-slot-text">Ἰησοῦς</span>
    <span class="dg-slot-fn">主語</span>
</div>
```

The `textEl` (`span.dg-slot-text`) created before the detection block is NOT appended in the NOMINALIZED_CLAUSE branch — it is discarded. The `nomcEl` (`span.dg-nomc`) takes its place.

---

## 12. CSS Design

### Desktop (base)

```css
/* P6-G-8: NOMINALIZED_CLAUSE bracket notation */
.dg-nomc {
    font-family: var(--font-greek);
    font-size: 1rem;
    color: var(--text-main);
    white-space: nowrap;
}
.dg-nomc::before {
    content: '[';
    color: var(--text-sub);
    font-size: .85rem;
    margin-right: 1px;
}
.dg-nomc::after {
    content: ']';
    color: var(--text-sub);
    font-size: .85rem;
    margin-left: 1px;
}
```

**Design rationale:**
- `font-family: var(--font-greek)` — consistent with `.dg-slot-text`
- `font-size: 1rem` — same as `.dg-slot-text`
- `color: var(--text-main)` — Greek text at full opacity
- `white-space: nowrap` — consistent with other slot elements
- Brackets at `.85rem` — slightly smaller than text, visually structural not content
- `color: var(--text-sub)` for brackets — muted, indicating structure
- `margin: 1px` around brackets — prevents brackets from touching Greek text

### Mobile (390px — inside existing `@media (max-width: 480px)`)

```css
.dg-nomc { font-size: .9rem; }
```

Consistent with `.dg-slot-text { font-size: .9rem; }` mobile override. Bracket pseudo-elements scale proportionally (`.85rem` relative to `.9rem` parent → ~13.6px at 16px root).

### CSS insertion point

After `.dg-appos-appositive` block (current line ~4537), before `@media (max-width: 480px)`:

```
.dg-appos-appositive { ... }   ← line 4530–4537
/* P6-G-8: NOMINALIZED_CLAUSE bracket notation */
.dg-nomc { ... }               ← NEW: after line 4537
.dg-nomc::before { ... }
.dg-nomc::after { ... }
@media (max-width: 480px) {   ← existing line 4538
```

---

## 13. JS Renderer Change

### Insertion point

In `_dgRenderMainLine()`, after the APPOSITION branch (current line ~12324–12325), before the `else` default branch.

**Before (current):**
```javascript
} else if (slot.node?.construction?.canonical === 'APPOSITION') {
    // P6-G-4.4: APPOSITION — parallel segment notation (head / dashed / appositive)
    slotEl.appendChild(_dgRenderAppositionSlot(slot.node));
} else {
    // Use headDisplayText: excludes tokens belonging to extracted word-level modifiers
    textEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
    slotEl.appendChild(textEl);
}
```

**After (with NOMINALIZED_CLAUSE branch added):**
```javascript
} else if (slot.node?.construction?.canonical === 'APPOSITION') {
    // P6-G-4.4: APPOSITION — parallel segment notation (head / dashed / appositive)
    slotEl.appendChild(_dgRenderAppositionSlot(slot.node));
} else if (slot.node?.construction?.canonical === 'NOMINALIZED_CLAUSE') {
    // P6-G-8: NOMINALIZED_CLAUSE — bracket notation (CSS ::before/::after)
    const nomcEl = document.createElement('span');
    nomcEl.className = 'dg-nomc';
    nomcEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
    slotEl.appendChild(nomcEl);
} else {
    // Use headDisplayText: excludes tokens belonging to extracted word-level modifiers
    textEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
    slotEl.appendChild(textEl);
}
```

**No helper function needed.** Unlike `_dgRenderAppositionSlot()` (which had to split head/appositive), NOMINALIZED_CLAUSE is a single text node with bracket wrapper. 3-line implementation.

---

## 14. Accessibility and Copy Integrity

| Check | Result |
|-------|--------|
| `element.textContent` of `.dg-nomc` | Greek text only — pseudo-elements excluded from textContent API |
| Browser copy-paste | Pseudo-elements may or may not be included (browser-dependent) — brackets `[` `]` are structural characters harmless in copied text |
| Screen reader behavior | Pseudo-elements may be announced by some AT — `[` `]` convey structural information and are acceptable |
| Search (window.find, in-page search) | Does NOT search pseudo-element content — Greek text searchable without brackets |
| DOM `.querySelectorAll('.dg-nomc')` | Returns the span; `.textContent` = Greek text only |

The key requirement ("textContent に [ ] が入らない") is met: CSS `::before`/`::after` content does NOT appear in `.textContent`.

---

## 15. Scope Boundary

| In scope for P6-G.8.3 | Out of scope |
|------------------------|-------------|
| `.dg-nomc` CSS class | IO platform NOMINALIZED_CLAUSE bracket |
| `_dgRenderMainLine()` NOMINALIZED_CLAUSE branch | Nested NOMINALIZED_CLAUSE inside APPOSITION children |
| Mobile CSS override | NOMINALIZED_CLAUSE in adv zone (0 instances anyway) |
| Gate chapter browser verification (MAT 5, PHP 2, ROM 6) | Non-gate chapter DG rendering |
| Regression verification for all existing features | Sub-type II (articular infinitive) explicit visual distinction |

---

## 16. Engine Change Decision — Final

**dg-engine.js: NO CHANGES.**

All detection and text extraction uses existing engine API:
- `slot.node.construction.canonical` — already set by SR
- `window.DgEngine.headDisplayText(slot.node, slot.headSIs)` — existing function, unchanged behavior

No new deriveDR() logic. No new MAIN_FN entries. No new extraction functions.

---

*P6-G.8.2 repair design complete. No production code changes. Read-only.*
