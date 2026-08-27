# P6-G.4 — CONTENT_CLAUSE fn=OBJ Repair Design

**Phase:** P6-G.4  
**Date:** 2026-08-25  
**Status:** DESIGN ONLY — No implementation  
**Prerequisite:** P6-G.4_content_clause_root_cause_audit.md (CONFIRMED)

---

## 1. Problem Statement (Confirmed)

**What P6-G.1 said:** 736 CC fn=OBJ misrouted to adverbialClauses.  
**What audit confirmed:** Not a routing issue. CC IS in `dr.slots` as OBJECT for 542/736 cases. The visual gap is:

1. **Flat text rendering** — CC shown as concatenated token string, no inner clause structure
2. **Buried CC** (145 cases) — CC inside parent clause that's a slot; CC not separately accessible  
3. **Invisible CC** (39 cases) — CC inside unusual structures (NOMINALIZED_CLAUSE, APPOSITION etc.)

---

## 2. Correct DR Representation

### 2.1 Current DR state (SLOT_ROOT case)

```
dr.slots[i] = {
  fn: 'OBJECT',
  node: CC_node,          ← the CONTENT_CLAUSE node itself
  connector: 'po'|null,
  modifiers: [],
  headSIs: null,
  embeddedRelClauses: [],
}
```
Renderer calls `headDisplayText(CC_node, null)` → `displayText(CC_node)` → flat token string.

### 2.2 Target DR state

```
dr.slots[i] = {
  fn: 'OBJECT',
  node: CC_node,
  connector: 'po'|null,    ← unchanged
  modifiers: [],
  headSIs: null,
  embeddedRelClauses: [],
  // NEW:
  contentClause: {          ← extracted from CC_node
    conjunction: 'ὅτι'|'ἵνα'|null,
    innerDR: DR_Clause,     ← deriveClauseCore(inner_clause)
  }
}
```

The renderer would then show:
```
[PREDICATE] — po — [OBJECT: ὅτι]
                        |
                   [inner clause DR rendered as sub-diagram]
```

### 2.3 Correct representation for other cases

**SLOT_IN_ADV (229 cases):** No structural change needed. CC IS correctly in adv sub-clause's slots. The same flat text → sub-diagram repair in the renderer would apply there too.

**Buried CC (145 cases):** The parent clause (fn=OBJECT, cn=null) is the slot. The CC inside it has different ancestry patterns (deep nesting, CONJOINED_CLAUSE wrappers, etc.). These may not be fixable by the same mechanism — the parent clause itself is the slot node, and the CC is not directly exposed. This requires SR-level restructuring or separate scope.

**Invisible CC (39 cases):** Inside NOMINALIZED_CLAUSE, APPOSITION, ADJ_MOD — very unusual structures, may require case-by-case SR fixes.

---

## 3. Minimal Fix Proposal

### Scope of Minimal Fix

Target: **SLOT_ROOT (311 cases)** and **SLOT_IN_ADV (229 cases)** = 540 cases where CC IS already in `slots[]` as OBJECT.

Exclusion: Buried (145) and Invisible (39) cases — require deeper SR changes, not a renderer/DR schema fix.

### Fix Location

**dg-engine.js — `deriveClauseCore()` lines 442–455**

Current:
```javascript
} else if (MAIN_FN.has(fn)) {
    const modInfo = extractSlotModifiers(child);
    ...
    mainSlots.push({
        fn, node: child, connector: null, si: minSI(child),
        modifiers: modInfo ? modInfo.modifiers : [],
        headSIs: ...,
        isParticipial,
        embeddedRelClauses: ...,
    });
}
```

Proposed addition: When `fn ∈ MAIN_FN` AND `child.construction?.canonical === 'CONTENT_CLAUSE'`:
```javascript
} else if (MAIN_FN.has(fn)) {
    const modInfo = extractSlotModifiers(child);
    ...
    // Extract CC inner structure
    const cn = child.construction?.canonical;
    let contentClause = null;
    if (cn === 'CONTENT_CLAUSE') {
        const conjTok = (child.children || []).find(
            c => c.type === 'token' && c.evidence?.morph_raw?.startsWith('CONJ')
        );
        const inner = (child.children || []).find(
            c => c.type === 'clause' || c.type === 'group'
        );
        if (inner) {
            contentClause = {
                conjunction: conjTok?.text || null,
                innerDR: inner.type === 'clause'
                    ? deriveClauseCore(inner, conjTok?.text || null)
                    : deriveFromGroup(inner, conjTok?.text || null),
            };
        }
    }
    mainSlots.push({
        fn, node: child, connector: null, si: minSI(child),
        modifiers: modInfo ? modInfo.modifiers : [],
        headSIs: ...,
        isParticipial,
        embeddedRelClauses: ...,
        contentClause,     // ← NEW: null for non-CC slots
    });
}
```

### Connector Fix (140 cases with connector=null after IO extraction)

When IO is extracted from the main line (P6-G-2), the slot that was after IO now directly follows PREDICATE, but its connector was computed as INDIRECT_OBJECT→X = null.

Fix option: In `_dgRenderMainLine` (index.html), after filtering out IO slots, recompute connectors for the remaining slots sequence. This is a renderer-side fix but it's structural (not semantic inference).

OR: Accept this as a known gap — the 'po' connector is absent for CC-OBJ that follow IO, but the CC IS in the correct slot position.

### Renderer Fix (index.html — `_dgRenderMainLine`)

When `slot.contentClause` is present, render the slot differently:
- Show conjunction label (`ὅτι`/`ἵνα`) as the slot text instead of full flat text
- Render `slot.contentClause.innerDR` as a sub-diagram below the slot
- Sub-diagram uses the same `_dgRenderClause(innerDR)` call

Visual result:
```
PREDICATE — po — [ὅτι]       ← slot shows only conjunction
                   |
              [inner clause rendered as nested DG]
              SUBJECT | PREDICATE | OBJECT...
```

---

## 4. L-0 Audit

| Aspect | Assessment | Reason |
|--------|------------|--------|
| Inner clause extraction | **SAFE** | Structural: finds first clause child; no inference |
| Conjunction detection | **SAFE** | Structural: looks for CONJ morph token; no inference |
| `innerDR = deriveClauseCore(inner)` | **SAFE** | Same function used elsewhere; SR=SSOT |
| Rendering inner DR | **SAFE** | Recursive structural rendering; no semantic addition |
| Connector recomputation | **SAFE** | Mathematical: recomputes based on fn sequence; no inference |
| Showing only conjunction as slot text | **SAFE** | Shows actual Greek conjunction token; no inference |
| Buried CC (145) — no fix | **SAFE** | Conservative: don't attempt to render what's not in the slot |
| Invisible CC (39) — no fix | **SAFE** | Conservative: don't infer structure from SR tags |

**L-0 verdict: SAFE** for the minimal fix targeting SLOT_ROOT + SLOT_IN_ADV cases.

---

## 5. Regression Surface

### Affected code path

| File | What changes | Regression risk |
|------|-------------|----------------|
| `dg-engine.js` | `deriveClauseCore`: adds `contentClause` field to slot | LOW — new field, existing consumers see `null` for non-CC slots |
| `dg-engine.js` | `deriveClauseCore`: calls `deriveClauseCore` recursively for CC inner | MEDIUM — recursive; must check no infinite loops |
| `index.html` | `_dgRenderMainLine`: handles `slot.contentClause` | LOW — gated on non-null; existing slots unaffected |

### No-regression guarantees

- CC fn=ADVERBIAL (54 cases): not in MAIN_FN path → unchanged
- CC fn=null (73 cases): fn=null → adverbialClauses path → unchanged
- CC fn=SUBJECT (26 cases): in MAIN_FN path → gets `contentClause` field
  - Note: should CC fn=SUBJECT also get inner clause rendering? Probably yes, but out of current scope
- All non-CC slots: `cn !== 'CONTENT_CLAUSE'` → `contentClause = null` → no change in rendering
- IO platform (P6-G-2): not affected by CC changes (different fn)
- PP diagonal (P6-F): not affected
- Relative clauses (P6-C): not affected (handled via `embeddedRelClauses`, different path)
- SD fallback: CC-OBJ only appears in DG-capable chapters; SD fallback unchanged

### Risk: infinite recursion

`deriveClauseCore(inner_clause)` where inner_clause contains another CC fn=OBJ:
- The inner CC fn=OBJ would also get `contentClause` set, calling `deriveClauseCore` again
- This creates nested `contentClause.innerDR.slots[j].contentClause.innerDR` etc.
- Maximum nesting depth in NT data: from NOT_FOUND analysis, some CCs are nested 2–3 levels deep
- Risk is LOW (no circular references in tree structure), but depth must be monitored

Mitigation: Add `depth` parameter to `contentClause` extraction with a max depth of 3.

---

## 6. Out of Scope for Minimal Fix

1. **Buried CC (145 cases)** — require parent clause restructuring in SR or different scope
2. **Invisible CC (39 cases)** — unusual structures (NOMINALIZED_CLAUSE, APPOSITION, ADJ_MOD)
3. **CC fn=SUBJECT (26 cases)** — same flat text issue but SUBJECT position; defer
4. **CC fn=COMPLEMENT (2 cases)** — same issue; defer
5. **Connector null fix** — 140 SLOT_ROOT cases missing 'po' after IO; acceptable gap for now
6. **Visual layout design** — exact CSS/layout for nested inner DR diagram; separate design task

---

## 7. Summary

**Minimal fix:** 2 changes to dg-engine.js + 1 change to index.html  
**Scope:** 540 CC fn=OBJ cases (311 SLOT_ROOT + 229 SLOT_IN_ADV)  
**Excluded:** 196 cases (145 buried + 39 invisible + known sub-patterns)  
**L-0:** SAFE  
**Regression:** LOW risk; existing slots unaffected  
**Blocker:** None identified  

---

*Design only. No implementation. See P6-G.4_final_report.md for decision.*
