# P6-G.2 — IO Relationship Matrix: SR → DR → Renderer Pipeline

**Date:** 2026-08-25
**Phase:** P6-G.2 read-only audit
**Purpose:** Trace the complete IO pipeline from SR SSOT to proposed raised platform rendering.

---

## 1. Full Pipeline Diagram

```
SR (SSOT)                         DR (dg-engine.js)              Renderer (index.html)
─────────────────────────         ────────────────────────        ─────────────────────────
node.function.canonical           deriveDR()                      _dgRenderMainLine(slots)
  = "INDIRECT_OBJECT"    →   →   deriveClauseCore()        →     _dgRenderSlotModZone(slots)
node.construction.*               dr.slots[].fn               →   _dgRenderClause(dr)
node.children                     dr.slots[].node
node.type                         dr.slots[].connector (null)
                                  dr.slots[].si
                                  dr.slots[].modifiers
                                  dr.slots[].headSIs
                                  dr.slots[].embeddedRelClauses
```

---

## 2. SR → DR: IO Slot Derivation

**Location in dg-engine.js:** `deriveClauseCore()`, lines 384–485

```javascript
// In deriveClauseCore, when a clause child has fn=INDIRECT_OBJECT:
} else if (MAIN_FN.has(fn)) {          // INDIRECT_OBJECT ∈ MAIN_FN ✓
    const modInfo = extractSlotModifiers(child);
    const tok0 = child.type === 'token' ? child : (getTokens(child)[0] || null);
    const isParticipial = (fn === 'PREDICATE' || fn === 'COPULA') && tok0 ? isParticiple(tok0) : false;
    // false for IO — IO is never a participle
    const embeddedRelInfo = _extractEmbeddedRelClauses(child);
    mainSlots.push({
        fn,       // = 'INDIRECT_OBJECT'
        node: child,
        connector: null,   // set below by connectorBetween — will be null for IO
        si: minSI(child),
        modifiers: modInfo ? modInfo.modifiers : [],
        headSIs:   embeddedRelInfo ? embeddedRelInfo.headSIs : (modInfo ? modInfo.headSIs : null),
        isParticipial: false,
        embeddedRelClauses: embeddedRelInfo ? embeddedRelInfo.embeddedClauses : [],
    });
}

// connectorBetween never returns non-null for IO:
// INDIRECT_OBJECT is not COPULA, PREDICATE, SUBJECT, COMPLEMENT, or OBJECT
// → all branches return null → IO always has connector=null
```

**Confirmed:** IO slot in DR has all required fields for rendering. No new fields needed.

---

## 3. DR: IO Slot Data Schema (Post-Derivation)

For a typical dative pronoun IO (e.g., αὐτῷ in JHN 1:38):

```json
{
    "fn":        "INDIRECT_OBJECT",
    "node":      { "type": "token", "text": "αὐτῷ", "surfaceIndex": 3, ... },
    "connector": null,
    "si":        3,
    "modifiers": [],
    "headSIs":   null,
    "isParticipial": false,
    "embeddedRelClauses": []
}
```

For ARTICULAR_NP with modifier (e.g., MAT 28:9):

```json
{
    "fn":        "INDIRECT_OBJECT",
    "node":      { "type": "group", "construction": { "canonical": "ARTICULAR_NP" }, ... },
    "connector": null,
    "si":        2,
    "modifiers": [ { "node": <genitive mod node>, "label": "属格修飾", "si": 4 } ],
    "headSIs":   Set { 2, 3 },
    "isParticipial": false,
    "embeddedRelClauses": []
}
```

---

## 4. DR → Renderer: Current IO Rendering (Status Quo)

```javascript
function _dgRenderMainLine(slots) {
    const line = document.createElement('div');
    line.className = 'dg-main-line';   // border-bottom: 2px solid
    
    for (const slot of slots) {
        // connector=null for IO → no connector div inserted
        if (slot.connector) { /* not reached for IO */ }
        
        const slotEl = document.createElement('div');
        slotEl.className = 'dg-slot dg-slot-indirect_object';
        // ...
        line.appendChild(slotEl);   // IO placed in flex row with SUBJ/PRED/OBJ
    }
    return line;   // IO is on the baseline, visually same as OBJ
}
```

**Problem:** IO sits on the main horizontal baseline (border-bottom of `.dg-main-line`)
at the same level as SUBJECT, PREDICATE, and OBJECT. No visual distinction from DO.

---

## 5. DR → Renderer: Proposed IO Raised Platform

### 5a. Modified `_dgRenderMainLine` logic

```
INPUT: slots[] (includes IO with fn='INDIRECT_OBJECT')

IF no IO in slots:
    → original behavior (all slots in main flex row) [unchanged]

IF IO present:
    ioSlots    ← slots.filter(s => s.fn === 'INDIRECT_OBJECT')
    mainSlots  ← slots.filter(s => s.fn !== 'INDIRECT_OBJECT')
    
    RENDER:
    <div class="dg-io-wrap">           ← new container (flex-column)
        <div class="dg-io-platform-area">   ← above main line
            FOR each ioSlot:
                <div class="dg-io-platform">  ← horizontal line (border-bottom)
                    <span class="dg-io-platform-text">
                        headDisplayText(ioSlot.node, ioSlot.headSIs)
                    </span>
                    <span class="dg-io-platform-fn">間接目的語</span>
                    [IO modifiers if any]
                </div>
            <div class="dg-io-stalk">   ← vertical connector (1.5px × 1.2rem)
        </div>
        <div class="dg-main-line">    ← unchanged except IO excluded
            [mainSlots only: SUBJ | PRED | OBJ]
        </div>
    </div>
```

### 5b. `_dgRenderSlotModZone` adjustment

```
INPUT: slots[] (currently includes IO modifiers)
PROPOSED: pass only mainSlots (without IO) to _dgRenderSlotModZone
REASON: IO modifiers rendered inside dg-io-platform-area, not in modZone

CURRENT CALL SITE in _dgRenderClause:
    if (dr.slots.length > 0) wrap.appendChild(_dgRenderMainLine(dr.slots));
    const modZone = _dgRenderSlotModZone(dr.slots);   ← receives ALL slots

PROPOSED CHANGE:
    Let _dgRenderMainLine return {wrapEl, mainSlotsOnly}
    const modZone = _dgRenderSlotModZone(mainSlotsOnly);  ← exclude IO
```

**Note:** This requires a small interface change: `_dgRenderMainLine` must communicate
which slots it excluded (IO slots). One approach: return an object `{el, mainSlots}`.
Another: filter in `_dgRenderClause` before calling both functions.

---

## 6. SR → DR: Retention Analysis

| Path | Count | Source |
|---|---|---|
| SR IO nodes | 2,662 | Direct scan of SR tree |
| DR IO slots (shallow recursion) | 1,736 | dr.slots + adverbialClauses + coordClauses |
| DR IO slots (full incl. embeddedRelClauses) | 1,755 | + slot.embeddedRelClauses[].dr |
| SR→DR gap | 907 | Pre-existing; not IO-platform-specific |

**Gap characterization:**
- 518 sentences: SR has IO, DR has 0 IO → all IO in those sentences not surfaced
- 252 sentences: SR has N IO, DR has M < N IO → partial coverage
- Parent types of missing IOs: clause (587), group (2), SUBORDINATE_CLAUSE (1)
- Root cause: certain clause wrapper constructions (CONJOINED_CLAUSE children,
  deeply nested group structures) do not route IO children to DR slots in
  `deriveClauseCore()` or `deriveFromGroup()`. This is a pre-existing dg-engine.js
  routing issue, separate from P6-G.2 scope.

---

## 7. IO Construction × Rendering Decision Matrix

| IO node type | Count | headDisplayText behavior | embeddedRelClauses | Platform rendering |
|---|---|---|---|---|
| token | 1,286 | Token text directly | none | Simple platform text |
| ARTICULAR_NP | 255 | Head noun tokens (article stripped by headSIs) | possible | Head NP on platform |
| NP_COMPLEX | 46 | Head tokens | possible | Head NP on platform |
| NOMINALIZED_CLAUSE | 39 | All tokens (clause rendered as text) | none | Clause text on platform |
| APPOSITION | 36 | headDisplayText of whole node (appositive subsumed) | none | Primary NP on platform |
| ADJ_MOD | 30 | headDisplayText (head tokens) | none | Head on platform |
| ADV_MOD | 15 | headDisplayText (head tokens) | none | Head on platform |
| CLAUSE_AS_NP | 12 | Head tokens (article etc.) | YES | Article on platform; rel. clause rendered separately |
| GENITIVE_MOD | 6 | Head tokens | none | Head on platform (genitive in modifiers) |
| COORDINATION | 3 | displayText of all | none | Full text on platform |
| PREP_PHRASE | 2 | displayText | none | PP text on platform (fallback — no diagonal needed inside platform) |
| other | 8 | displayText | varies | displayText fallback |

**No IO type requires special-casing beyond existing `headDisplayText` logic.**
The existing slot rendering logic applies directly to platform rendering.

---

## 8. Connector Coverage Matrix (Post-Platform)

| Connector type | Source | After platform |
|---|---|---|
| `sp` (Subject \| Predicate) | connectorBetween | Unchanged |
| `po` (Predicate \| Object) | connectorBetween | Unchanged |
| `complement` (Predicate \ Complement) | connectorBetween | Unchanged |
| `implied` (verbless S – C) | connectorBetween | Unchanged |
| IO stalk (vertical connector) | NEW in renderer CSS | Added for IO |

**IO stalk is a pure CSS visual element. It does not require a new DR connector type.**
The existing `connectorBetween()` function is not modified.

---

## 9. Regression Impact Map

| Rendering function | Change required | Risk |
|---|---|---|
| `_dgRenderMainLine` | Add IO branch (extract IO, return wrapper) | MEDIUM |
| `_dgRenderSlotModZone` | Exclude IO slots from input | LOW |
| `_dgRenderAdvPhrases` | No change | NONE |
| `_dgRenderClause` | Pass non-IO slots to modZone | LOW |
| CSS `.dg-main-line` | No change | NONE |
| CSS `.dg-slot.*` | No change | NONE |
| PP diagonal (P6-F) | No change | NONE |
| Relative clause (P6-C) | No change | NONE |
| SD fallback | No change | NONE |
| DG gate check `_isDGChapter` | No change | NONE |
| `dg-engine.js` | **NO CHANGE** | NONE |

---

*P6-G.2 — read-only audit. No production code changes.*
