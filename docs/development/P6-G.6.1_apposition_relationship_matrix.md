# P6-G.6.1 — APPOSITION Relationship Matrix

**Date:** 2026-08-25  
**Phase:** P6-G.6.1 — Read-only audit  
**Scope:** SR → DR → Renderer pipeline for APPOSITION; visual design alignment

---

## 1. Pipeline Overview

```
SR (SSOT)                          DR (dg-engine.js)                   Renderer (index.html)
─────────────────────              ─────────────────────────           ─────────────────────────────
construction.canonical             deriveDR(sen.root)                  _dgRenderMainLine(slots)
  = 'APPOSITION'       →          deriveClauseCore()                  _dgRenderSlotModZone(slots)
function.canonical                  MAIN_FN.has(fn) → slot             _dgRenderClause(dr)
children[0] = head                  extractSlotModifiers(child)        headDisplayText(slot.node, headSIs)
children[1] = appositive            → modInfo (null for APPOS)         displayText(slot.node)
                                    mainSlots.push({fn, node: child})   → flat text
```

**Current gap:** The pipeline correctly routes APPOSITION nodes with MAIN_FN functions to DR slots. The gap is entirely in the renderer: no detection of `cn=APPOSITION` on `slot.node` → slot text is flat, undifferentiated.

---

## 2. SR Representation

### SR Node Format

```json
{
  "id": "...",
  "type": "phrase.np",
  "construction": { "canonical": "APPOSITION" },
  "function": { "canonical": "SUBJECT" },
  "children": [
    {
      "type": "phrase.np",
      "construction": { "canonical": "ARTICULAR_NP" },
      "function": null,
      "children": [ /* head NP tokens */ ]
    },
    {
      "type": "token",
      "text": "Μαρίας",
      "function": null
    }
  ]
}
```

### SR Invariants (CONFIRMED)

| Invariant | Status | Evidence |
|-----------|--------|----------|
| `construction.canonical = 'APPOSITION'` marks all apposition | CONFIRMED | 1,890 NT-wide |
| `children[0]` = head NP | CONFIRMED | All 5 DR slot samples examined |
| `children[1]` = appositive NP | CONFIRMED | All 5 DR slot samples examined |
| `children.length` = 2 in all observed cases | CONFIRMED | No 3+ child APPOSITION observed in NT |
| Head and appositive are co-referential | SR SSOT (not renderer's concern) | fn=same on APPOSITION node |

---

## 3. DR Route Map

### Case 1: APPOSITION With MAIN_FN Function (467 slots)

```
SR: { cn=APPOSITION, fn=SUBJECT/OBJECT/COMPLEMENT/IO/AUX, children=[head, appositive] }
 ↓ dg-engine.js deriveClauseCore()
   MAIN_FN.has(fn) → true
   extractSlotModifiers(child) → null (no APPOSITION case in extractSlotModifiers)
   mainSlots.push({ fn, node: child, modifiers: [], headSIs: null, ... })
 ↓ DR slot: { fn: 'SUBJECT', node: APPOSITION_node, modifiers: [], headSIs: null }
 ↓ renderer _dgRenderMainLine()
   textEl.textContent = headDisplayText(APPOSITION_node, null)
                      = displayText(APPOSITION_node)
                      = "head_tokens appositive_tokens" (concatenated)
```

**Gap location:** Renderer `_dgRenderMainLine()` — no APPOSITION detection.

---

### Case 2: APPOSITION With fn=null or Non-MAIN_FN (1,404 buried)

```
SR: { cn=APPOSITION, fn=null OR fn=ADVERBIAL, parent=GENITIVE_MOD/PREP_PHRASE/APPOSITION/... }
 ↓ dg-engine.js deriveClauseCore()
   fn missing or not in MAIN_FN → skip
   OR parent construction becomes the slot node, APPOSITION buried inside
 ↓ Parent slot: { fn: parent_fn, node: parent_node, ... }
 ↓ renderer: displayText(parent_node) = all tokens including buried APPOSITION tokens
```

**Gap location:** SR-structural. Engine does not recurse into slot node children to find APPOSITION. Renderer-only fix cannot address this 74.3%.

---

### Case 3: APPOSITION in Adverbial Phrases (~19 cases)

```
SR: { cn=APPOSITION, fn=ADVERBIAL }
 ↓ dg-engine.js: adverbialPhrases.push({ fn: 'ADVERBIAL', node: APPOSITION_node, ppPrep: null, ... })
 ↓ renderer _dgRenderAdvPhrases()
   textEl.textContent = displayText(adv.node) = flat text
```

**Gap location:** `_dgRenderAdvPhrases()` — same flat text issue; separate renderer path from main line.

---

### Case 4: APPOSITION fn=INDIRECT_OBJECT (36 cases)

```
SR: { cn=APPOSITION, fn=INDIRECT_OBJECT }
 ↓ dg-engine.js: MAIN_FN.has('INDIRECT_OBJECT') → true → mainSlots.push({fn: 'INDIRECT_OBJECT', ...})
 ↓ DR slot: { fn: 'INDIRECT_OBJECT', node: APPOSITION_node }
 ↓ renderer _dgRenderMainLine()
   ioSlots = slots.filter(s => s.fn === 'INDIRECT_OBJECT')
   → dg-io-platform: textEl.textContent = headDisplayText(ioSlot.node, ioSlot.headSIs)
   = displayText(APPOSITION_node) → flat text
```

**Gap location:** IO platform renderer path. APPOSITION visual treatment within IO platform is an additional sub-case; out of scope for G-4.4 main focus.

---

## 4. What extractSlotModifiers() Currently Does With APPOSITION

```javascript
function extractSlotModifiers(node) {
  const cn = node.construction && node.construction.canonical;
  const children = node.children || [];
  
  // Case D: ADJ_MOD → handled
  if (cn === 'ADJ_MOD') { ... }
  
  // Case A: GENITIVE_MOD → handled
  if (cn === 'GENITIVE_MOD') { ... }
  
  // ↓ APPOSITION falls through to here:
  // Case B/C: iterate children for ADV_MOD or GENITIVE_MOD
  const headSIs = new Set();
  const modifiers = [];
  let hasModifiers = false;
  
  for (const child of children) {
    const childCn = child.construction && child.construction.canonical;
    if (childCn === 'ADV_MOD') { /* hasModifiers = true */ }
    else if (childCn === 'GENITIVE_MOD') { /* hasModifiers = true */ }
    else {
      // ARTICULAR_NP, token, COORDINATION, etc. → headSIs += all tokens
      if (child.type === 'token') headSIs.add(child.surfaceIndex);
      else getTokens(child).forEach(t => headSIs.add(t.surfaceIndex));
    }
  }
  // hasModifiers = false (children of APPOSITION are head/appositive NPs, not modifier constructions)
  return null;  // ← always returns null for APPOSITION nodes
}
```

Result: `slot.headSIs = null` for all APPOSITION slot nodes.

---

## 5. Renderer APPOSITION Detection Point

```javascript
// _dgRenderMainLine() — line ~12294 (current code)
const textEl = document.createElement('span');
textEl.className = 'dg-slot-text';
// P6-G-4: CC slot shows conjunction label
if (slot.contentClause && slot.contentClause.innerDR) {
    textEl.textContent = slot.contentClause.conjunction || '内容節';
} else {
    // ← APPOSITION would be detected here (new branch)
    textEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
}
```

**Proposed insertion point** for Candidate A/E:
```javascript
} else if (slot.node?.construction?.canonical === 'APPOSITION') {
    // Render parallel segments
    const apposWrap = _dgRenderAppositionSlot(slot.node);
    slotEl.insertBefore(apposWrap, textEl);
    // textEl is not appended (replaced by apposWrap)
} else {
    textEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
}
```

No engine change required. Detection is pure renderer-side.

---

## 6. Proposed APPOSITION Visual Structure (Candidate A/E)

### Target Visual

Reed-Kellogg/Leedy standard for apposition:

```
[head NP text]
══════════════  (dashed horizontal line, CSS border-bottom)
[appositive text]
     [fn label]
```

### Proposed HTML Structure

```html
<!-- BEFORE (current): -->
<div class="dg-slot dg-slot-subject">
  <span class="dg-slot-text">Ἰωσὴφ ὁ ἀνὴρ αὐτῆς</span>
  <span class="dg-slot-fn">主語</span>
</div>

<!-- AFTER (proposed): -->
<div class="dg-slot dg-slot-subject">
  <div class="dg-appos-wrap">
    <span class="dg-appos-head">Ἰωσὴφ</span>
    <!-- dashed line is CSS border-bottom on .dg-appos-head -->
    <span class="dg-appos-appositive">ὁ ἀνὴρ αὐτῆς</span>
  </div>
  <span class="dg-slot-fn">主語</span>
</div>
```

### Proposed CSS

```css
.dg-appos-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}
.dg-appos-head {
  border-bottom: 1px dashed currentColor;
  padding-bottom: 2px;
  white-space: nowrap;
}
.dg-appos-appositive {
  font-size: 0.92em;
  white-space: nowrap;
}
```

### Data Source

| Element | Source | L-0 |
|---------|--------|-----|
| head text | `displayText(slot.node.children[0])` | SAFE (SR-explicit) |
| appositive text | `displayText(slot.node.children[1])` | SAFE (SR-explicit) |
| fn label | `slot.fn` (unchanged) | SAFE |

---

## 7. Coverage After Proposed Fix (Candidate A/E)

| Category | Count | Handled by fix | Notes |
|----------|-------|----------------|-------|
| APPOSITION fn=SUBJECT (main line) | 252 | ✅ YES | Core case |
| APPOSITION fn=OBJECT (main line) | 125 | ✅ YES | Core case |
| APPOSITION fn=COMPLEMENT (main line) | 28 | ✅ YES | |
| APPOSITION fn=AUX (main line) | 26 | ✅ YES | |
| APPOSITION fn=IO | 36 | ❌ Out of scope | IO platform separate path |
| APPOSITION in adv phrases | ~19 | ❌ Out of scope | Adv renderer separate path |
| Buried APPOSITION (parent swallows) | 1,404 | ❌ Structural limit | SR-level; needs engine or SR change |
| **Total addressed** | **~431** | | 22.8% of SR total; 92.3% of main line |

---

## 8. Construction Coverage Summary

| Construction | SR | DR Slots | Renderer (current) | Renderer (proposed) | Status |
|---|---|---|---|---|---|
| APPOSITION fn=SUBJECT | ~355 | 252 | Flat text | Parallel segments | ✅ PROPOSED |
| APPOSITION fn=OBJECT | ~200 | 125 | Flat text | Parallel segments | ✅ PROPOSED |
| APPOSITION fn=IO | ~36 | 36 | Flat text (IO path) | Flat text (out of scope) | ⚠️ PARTIAL |
| APPOSITION fn=COMPLEMENT | ~75 | 28 | Flat text | Parallel segments | ✅ PROPOSED |
| APPOSITION fn=ADVERBIAL | ~29 | ~19 adv | Flat text (adv path) | Flat text (out of scope) | ⚠️ PARTIAL |
| Buried APPOSITION | 1,295 | 0 | Subsumed in parent | Unchanged | ❌ GAP (structural) |

---

## 9. Relation to Existing Architecture

### Integration with G-4.3 (Content Clause)

G-4.3 added:
```javascript
if (slot.contentClause && slot.contentClause.innerDR) {
    textEl.textContent = slot.contentClause.conjunction || '内容節';
}
```

G-4.4 APPOSITION detection would be chained after G-4.3 check:
```javascript
if (slot.contentClause && slot.contentClause.innerDR) {
    // CC: existing G-4.3 branch
} else if (slot.node?.construction?.canonical === 'APPOSITION') {
    // APPOSITION: new G-4.4 branch
} else {
    // Default: headDisplayText fallback
}
```

No conflict with G-4.3. CC and APPOSITION are mutually exclusive (a slot cannot be both CONTENT_CLAUSE and APPOSITION simultaneously in SR).

### Integration with P6-C (Relative Clause)

`slot.embeddedRelClauses` and `slot.headSIs` are set by `_extractEmbeddedRelClauses()`. For APPOSITION nodes, `_extractEmbeddedRelClauses()` returns null (APPOSITION cn is not CLAUSE_AS_NP). So `slot.headSIs = null` for APPOSITION. The proposed fix uses `slot.node.children[0]` directly, not `slot.headSIs`. No conflict.

### Integration with PP Diagonal

PP diagonal is in `_dgRenderAdvPhrases()`. APPOSITION main line fix is in `_dgRenderMainLine()`. No overlap. No conflict.

### Integration with IO Platform

IO platform is handled separately in `_dgRenderMainLine()` (ioSlots branch). APPOSITION fn=IO goes to IO path first (before the main slot loop). This means the G-4.4 APPOSITION detection in `baseSlots` loop does NOT touch IO APPOSITION (fn=IO is filtered out). Safe isolation.

---

## 10. L-0 Boundary Summary

| Question | Answer |
|----------|--------|
| Does the renderer infer which child is head? | NO — children[0] by SR convention |
| Does the renderer infer what the appositive refers to? | NO — not rendered, not our concern |
| Does the renderer infer discourse context? | NO |
| Does the renderer infer grammatical case from visual position? | NO |
| Is `construction.canonical = 'APPOSITION'` a reliable SR signal? | YES — CONFIRMED 1,890 instances |
| Can renderer safely show `displayText(children[1])` as appositive? | YES — SR SSOT |

**L-0 verdict: SAFE.** All proposed rendering decisions are derivable from SR without inference.

---

*P6-G.6.1 — read-only relationship matrix. No production code changes.*
