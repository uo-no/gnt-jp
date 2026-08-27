# P6-G.4 — CONTENT_CLAUSE fn=OBJ Root Cause Audit

**Phase:** P6-G.4 (G-4.1 Read-only Audit)  
**Date:** 2026-08-25  
**Status:** COMPLETE — Read-only  
**Method:** NT-wide SR scan + NT-wide DR trace (DgEngine.deriveDR) + dg-engine.js code analysis

---

## 1. P6-G.1 Claim vs. Confirmed Reality

### P6-G.1 claim
> `deriveClauseCore()` in dg-engine.js routes **all** CONTENT_CLAUSE nodes to `adverbialClauses`, regardless of fn. A CONTENT_CLAUSE with fn=OBJECT is displayed as an adverbial clause, not as the direct object.

### Confirmed reality
**The P6-G.1 claim is inaccurate.** NT-wide DR trace (all 8,010 sentences) shows CC fn=OBJ does NOT uniformly route to adverbialClauses. Most cases are correctly in `dr.slots` as OBJECT.

---

## 2. NT-Wide SR Count (CONFIRMED)

| fn                | Count |
|-------------------|-------|
| OBJECT            | **736** |
| null              | 73    |
| ADVERBIAL         | 54    |
| SUBJECT           | 26    |
| OBJECT2           | 17    |
| COMPLEMENT        | 2     |
| **Total CC**      | **908** |

All 736 CC fn=OBJECT nodes have:
- `nodeType: clause`
- `parentType: clause` (CONFIRMED: all are clause children)
- `childTypes: "token, clause"` — CONJ token + inner clause

---

## 3. DR Routing Classification (CONFIRMED)

### 3.1 Primary classification (by node reference equality in DR)

| Category | Count | % | Description |
|----------|-------|---|-------------|
| **SLOT_ROOT** | 311 | 42.3% | CC node in root DR's `slots[]` as fn=OBJECT |
| **SLOT_IN_ADV** | 229 | 31.1% | CC node in adv sub-clause's `slots[]` as fn=OBJECT |
| **SLOT_IN_COORD** | 2 | 0.3% | CC node in coord sub-clause's `slots[]` as fn=OBJECT |
| **NOT_FOUND** | 194 | 26.4% | CC node not in any slot at any depth |
| **Total** | **736** | 100% | |

### 3.2 NOT_FOUND sub-classification

| Sub-category | Count | % | Description |
|--------------|-------|---|-------------|
| **Buried in slot** | 145 | 19.7% | CC is a DESCENDANT of a slot node (parent in mainSlots, CC not separately accessible) |
| **Truly invisible** | 39 | 5.3% | CC not inside any slot node at any depth |

### 3.3 SLOT_ROOT connector distribution

Of 311 SLOT_ROOT cases:
- `connector=po`: 171 (55%) — PREDICATE→OBJECT connecting line present
- `connector=null`: 140 (45%) — no connecting line (IO or another OBJECT precedes CC)

---

## 4. Code Path Analysis (CONFIRMED)

### 4.1 Correct routing path (for SLOT_ROOT, 311 cases)

```
SR: clause (fn=OBJECT, cn=CONTENT_CLAUSE)
        ← direct child of parent clause being processed

dg-engine.js deriveClauseCore() [lines 384–485]:

  for (const child of (clauseNode.children || [])) {
    const fn = child.function?.canonical;  // → 'OBJECT'
    ...
    } else if (MAIN_FN.has(fn)) {          // MAIN_FN has('OBJECT') → true
        mainSlots.push({
            fn, node: child, connector: null, si: minSI(child),
            modifiers: ..., headSIs: ..., isParticipial: false,
            embeddedRelClauses: [],
        });
    }
  }
```

**CC goes to `mainSlots` as OBJECT. The slot's `node` field IS the CC node itself.**

Connector recomputation (lines 463–467):
```
mainSlots[i].connector = connectorBetween(mainSlots[i-1].fn, mainSlots[i].fn, !hasVerb)
```
- If previous slot is PREDICATE → `connectorBetween('PREDICATE','OBJECT')` = `'po'` ✓
- If previous slot is INDIRECT_OBJECT → `connectorBetween('INDIRECT_OBJECT','OBJECT')` = `null` ← connector lost

### 4.2 Buried-in-slot path (for 145 cases)

The CC is inside a **parent clause** that itself has fn=OBJECT or fn=SUBJECT (no construction canonical):
```
parent clause (fn=OBJECT, cn=null, type=clause)  ← goes to mainSlots as OBJECT
  CC (fn=OBJECT, cn=CONTENT_CLAUSE)               ← inside parent, invisible
```

In `deriveClauseCore`, the parent clause (fn=OBJECT, cn=null) goes to `mainSlots`:
- `mainSlots.push({fn:'OBJECT', node: parent_clause, ...})`
- The CC is a descendant of `parent_clause`
- CC never processed by `deriveClauseCore` as an independent child
- `headDisplayText(parent_clause, null)` = all tokens including CC tokens (flat text)

**CC text IS visible (as part of parent), but CC is not a separate slot.**

Most common parent patterns (of 145 buried cases):
| Parent pattern | Count |
|---|---|
| parent=fn:OBJECT,cn:null | 67 |
| parent=fn:null,cn:null inside object/adv chain | ~56 |
| parent=fn:ADVERBIAL,cn:null | ~15 |
| other | ~7 |

### 4.3 Truly invisible path (for 39 cases)

CC is inside structures that go to the DR outside of any slot:
- Inside `NOMINALIZED_CLAUSE` (fn=SUBJECT or fn=COMPLEMENT or fn=null)
- Inside `APPOSITION` phrase
- Inside `ADJ_MOD` phrase  
- Inside `COORDINATION` without proper slot path

Examples:
- `gpar=COMPLEMENT/NOMINALIZED_CLAUSE`: CC inside a NOMINALIZED_CLAUSE that's a COMPLEMENT
- `gpar=null/APPOSITION`: CC inside an apposition phrase
- `gpar=null/ADJ_MOD`: CC inside an adjective modifier phrase (within an NP slot)

### 4.4 SLOT_IN_ADV path (for 229 cases)

CC fn=OBJ is inside a **participial or other adverbial clause** that itself is correctly in `adverbialClauses`:
```
adverbialClauses[i] = {
  slots: [
    {fn:'PREDICATE', node: λέγων_token},
    {fn:'OBJECT', node: CC}          ← CC correctly in adv clause's slots
  ]
}
```

This is **structurally correct** — the CC IS the object of the adverbial predicate (λέγων, εἰδότες, etc.). The adverbial predicate's clause is correctly in the adv zone.

---

## 5. Visual Issues (CONFIRMED)

### 5.1 Flat text in OBJECT slot (affects all 542 in-slot cases)

Renderer: `headDisplayText(CC_node, null)` = `displayText(CC_node)` = all CC tokens concatenated:
```
"ὅτι ἐν παντὶ ἐπλουτίσθητε ἐν αὐτῷ, ἐν παντὶ λόγῳ καὶ πάσῃ γνώσει"
```
Inner clause structure (PREDICATE, OBJECT, ADVERBIAL of the CC's content) is NOT rendered.

### 5.2 Missing connector (140 SLOT_ROOT cases)

When IO or another OBJECT precedes the CC in the slot sequence, connector=null. After P6-G-2 extracts IO from the main line, the CC slot still has connector=null (connector was computed with IO in sequence), so no 'po' line appears between PREDICATE and CC.

### 5.3 Buried CC text (145 cases)

CC text is shown as part of a longer parent slot (fn=OBJECT or fn=SUBJECT or fn=ADVERBIAL). No separate CC slot. No ὅτι/ἵνα label. No inner clause structure.

### 5.4 Missing CC (39 cases)

CC text not visible in the diagram at all (buried in NOMINALIZED_CLAUSE, APPOSITION, ADJ_MOD structures).

---

## 6. Code Location Summary

| Location | Lines | Relevance |
|---|---|---|
| `dg-engine.js deriveClauseCore()` | 384–485 | fn=OBJECT → mainSlots (line 442–455) |
| `dg-engine.js deriveClauseCore()` | 391–405 | fn=null clause → adverbialClauses |
| `dg-engine.js deriveClauseCore()` | 463–467 | connector recomputation |
| `dg-engine.js connectorBetween()` | (earlier) | INDIRECT_OBJECT→OBJECT = null |
| `dg-engine.js deriveFromNode()` | 551–633 | dispatcher, CONTENT_CLAUSE at 607–619 |
| `index.html _dgRenderMainLine()` | ~12261 | headDisplayText(slot.node) = flat text |

---

## 7. Gate Chapter Results

| Chapter | CC fn=OBJ count | Routing |
|---------|----------------|---------|
| COL/1 | 1 | NOT_FOUND (buried) |
| EPH/2 | 1 | SLOT_ROOT |
| JHN/1 | 4 | SLOT_IN_COORD(1), SLOT_IN_ADV(2), AS_ADV_DR(1) |
| MAT/28 | 4 | NOT_FOUND(2), SLOT_ROOT(1), AS_ADV_DR(1) |
| MAT/5 | 7 | SLOT_ROOT(6), NOT_FOUND(1) |
| PHP/2 | 3 | SLOT_IN_ADV(2), NOT_FOUND(1) |
| ROM/6 | 5 | SLOT_ROOT(5) |

---

## 8. Conclusion

The actual root cause of the visual gap for CONTENT_CLAUSE fn=OBJ is **NOT** misrouting to `adverbialClauses` as P6-G.1 claimed. The confirmed root cause is:

1. **Flat text rendering (all 542 in-slot cases)**: CC is correctly placed in `dr.slots` as OBJECT, but the renderer shows it as flat concatenated token text with no inner clause structure.

2. **Parent clause burial (145 cases)**: The CC is inside a plain clause (fn=OBJECT or fn=null, no construction canonical) that itself becomes a mainSlot. deriveClauseCore does not recurse into slot nodes' children, so the CC is invisible as a separate element.

3. **Deep structure invisibility (39 cases)**: CC inside NOMINALIZED_CLAUSE, APPOSITION, ADJ_MOD, or similar structures that are processed without reaching the CC.

**Minimal fix target:** The 311 SLOT_ROOT cases are the clearest repair opportunity — the CC IS in dr.slots as OBJECT and just needs structural sub-diagram rendering instead of flat text. The 229 SLOT_IN_ADV cases follow the same flat-text pattern within their adv sub-DR.

---

*G-4.1 Read-only Audit COMPLETE. No code changes made.*
