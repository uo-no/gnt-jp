# P6-G.4 — Repair Design Review

**Phase:** P6-G.4 (G-4.2 Design Review)  
**Date:** 2026-08-25  
**Status:** COMPLETE — Read-only  
**Sources reviewed:** dg-engine.js (all 647 lines), index.html DG renderer (_dgRenderClause, _dgRenderMainLine, _dgRenderSlotModZone, _dgRenderAdvPhrases), P6-G.4 audit docs, P6-F PP diagonal impl, P6-G-2 IO platform impl, P6-C relative clause impl

---

## Proposed Architecture Under Review

```
SR
 ↓
dg-engine.js: deriveClauseCore()
  → MAIN_FN branch (fn=OBJECT, cn=CONTENT_CLAUSE)
  → mainSlots.push({ fn, node: CC, ..., contentClause: {conjunction, innerDR} })
 ↓
DR slot: { fn, node, connector, ..., contentClause: {conjunction, innerDR} | null }
 ↓
index.html: _dgRenderMainLine()
  → if slot.contentClause: show conjunction label + _dgRenderClause(slot.contentClause.innerDR)
  → else: headDisplayText(slot.node, slot.headSIs) [fallback, unchanged]
```

---

## Review Point 1: innerDR generation does not break DR SSOT

**Assessment: SAFE**

`_extractContentClause(CCnode)` reads CCnode's children structurally:
- finds CONJ token (`c.type === 'token' && c.evidence?.morph_raw?.startsWith('CONJ')`)
- finds inner clause (`c.type === 'clause' || c.type === 'group'`)
- calls `deriveClauseCore(inner, conjTok?.text || null)` — same function used everywhere

No SR node is modified. `deriveClauseCore` is a pure function (no side effects). The innerDR is a new DR_Clause object derived from the SR subtree rooted at the inner clause node. SR = SSOT maintained.

Precedent: `_extractEmbeddedRelClauses()` (P6-C, line 145–171) already calls `deriveFromNode(child)` inside a slot extraction path. The proposed fix follows the same pattern.

---

## Review Point 2: No circular recursion

**Assessment: SAFE — no depth guard required for correctness**

SR is an acyclic tree. The derivation call graph:

```
deriveClauseCore(root_clause)
  → CC (fn=OBJ) → _extractContentClause(CC)
      → deriveClauseCore(inner_clause1)       ← strictly smaller subtree
          → CC2 (fn=OBJ) → _extractContentClause(CC2)
              → deriveClauseCore(inner_clause2)   ← strictly smaller
                  → (no more CC) → terminates
```

Each recursive level processes a **strictly smaller** SR subtree (inner clause is a child of CC, which is a descendant of the outer clause). No back-edges exist in a tree. Termination is guaranteed.

NT data confirmation: The NOT_FOUND nested-CC analysis found only 6 cases of 2-level CC nesting. Zero cases of 3+ levels exist in the NT.

Recommendation: No mandatory depth guard for correctness. However, an optional depth guard (max 5) provides defense against malformed SR data from future SR updates. This is LOW priority.

---

## Review Point 3: Same node not derived twice

**Assessment: SAFE**

`deriveClauseCore(clauseNode)` iterates only over `clauseNode.children` (direct children). When CC fn=OBJ is processed in the MAIN_FN branch, `_extractContentClause(CC)` calls `deriveClauseCore(inner_clause)`. The inner_clause is a CHILD of CC, not of clauseNode. Therefore:

- `deriveClauseCore(clauseNode)` never visits inner_clause directly
- `_extractContentClause` calls `deriveClauseCore(inner_clause)` separately
- These two calls process distinct node sets (disjoint subtrees)

No node appears in two derivation paths. No seen-set required.

Mutual exclusion with P6-C: `_extractEmbeddedRelClauses(CC)` checks `cn !== 'CLAUSE_AS_NP'` → returns null immediately. CC nodes never get embeddedRelClauses. No overlap.

---

## Review Point 4: CC with IO inside

**Assessment: SAFE — P6-G-2 handles correctly**

If CC's inner clause contains IO:
```
CC (fn=OBJ)  →  inner: [PRED(λέγω), IO(ὑμῖν), OBJ(τοῦτο)]
```

`deriveClauseCore(inner)` → IO (fn=INDIRECT_OBJECT) → MAIN_FN → mainSlots as usual.

Renderer: `_dgRenderMainLine(innerDR.slots)` is called, which already contains the P6-G-2 IO platform logic:
```javascript
const ioSlots = slots.filter(s => s.fn === 'INDIRECT_OBJECT');
// → builds dg-io-wrap + dg-io-platform-area
```

IO inside CC inner clause gets the raised platform within the sub-diagram. Structurally correct and visually consistent with the top-level IO handling.

---

## Review Point 5: CC with PP inside

**Assessment: SAFE — P6-F handles correctly**

If CC's inner clause contains adverbial PPs:
```
CC (fn=OBJ)  →  inner: [PRED(ἐπλουτίσθητε), ADV(ἐν παντὶ), ADV(ἐν αὐτῷ)]
```

`deriveClauseCore(inner)` → ADV children (type=phrase) → `adverbialPhrases.push({ppPrep, ppNpNode, ...})`.

Renderer: `_dgRenderAdvPhrases(innerDR.adverbialPhrases)` is called on the innerDR, which already contains P6-F PP diagonal logic:
```javascript
if (adv.ppPrep && adv.ppNpNode) {
    // builds dg-pp-wrap with dg-pp-prep + dg-pp-diagonal + dg-pp-np-level
}
```

PP diagonal notation applies correctly within the CC sub-diagram.

---

## Review Point 6: PP diagonal coexistence

**Assessment: SAFE — fully independent**

PP diagonal logic is in `_dgRenderAdvPhrases()`. The proposed fix adds a new rendering path in `_dgRenderMainLine()` for CC slots (or in a new helper called from `_dgRenderClause()`). These paths are independent:

- PP diagonal: applies to `dr.adverbialPhrases` entries at any DR level
- CC sub-diagram: applies to `dr.slots[i].contentClause` entries
- No shared state, no CSS conflicts (different class names)

The PP diagonal for adverbial PPs WITHIN the CC inner clause is handled correctly (Review Point 5). The PP diagonal for adverbial PPs in the SAME clause as the CC (outside the CC) is completely unaffected.

---

## Review Point 7: CC with relative clauses inside

**Assessment: SAFE — P6-C handles correctly**

If CC's inner clause contains a CLAUSE_AS_NP with embedded relative clauses:
```
CC (fn=OBJ)  →  inner: [PRED, OBJ(CLAUSE_AS_NP: τὸν ἄρτον ὃν ἔδωκα)]
```

`deriveClauseCore(inner)` → OBJ (CLAUSE_AS_NP) → `_extractEmbeddedRelClauses(CLAUSE_AS_NP)` → finds relative clause → `embeddedRelClauses: [{dr, relPronRef}]`.

Renderer: `_dgRenderClause(innerDR)` is called, which contains (lines 12551–12570):
```javascript
for (const slot of (dr.slots || [])) {
    for (const erc of (slot.embeddedRelClauses || [])) {
        // renders relative clause with dg-rel-clause label
    }
}
```

Relative clauses inside CC inner clause are correctly handled by existing P6-C code.

---

## Review Point 8: Nested CONTENT_CLAUSE

**Assessment: SAFE — recursive path, finite depth**

When CC1's inner clause contains CC2 (fn=OBJ):
```
CC1 → inner1:
  [PRED(λέγει), CC2(fn=OBJ):
    ὅτι → inner2: [SUBJ, PRED, OBJ]]
```

Call graph:
1. `deriveClauseCore(root)` → CC1 → `_extractContentClause(CC1)` → `deriveClauseCore(inner1)`
2. `deriveClauseCore(inner1)` → CC2 → `_extractContentClause(CC2)` → `deriveClauseCore(inner2)`
3. `deriveClauseCore(inner2)` → no CC → terminates

Result:
```
slot1.contentClause.innerDR.slots[x] = {
    fn: 'OBJECT',
    contentClause: {
        conjunction: 'ὅτι',
        innerDR: DR(inner2)  ← CC2's inner clause
    }
}
```

The renderer recursively processes each level. NT maximum: 2 levels (confirmed by NOT_FOUND analysis). All 6 nested-CC cases would now be correctly rendered (they were previously buried in a parent slot — with the fix, they become accessible via the chain contentClause.innerDR.slots).

**Bonus:** The 6 nested-CC NOT_FOUND cases are a natural consequence of this fix and are resolved within scope.

---

## Review Point 9: headDisplayText responsibility separation

**Assessment: SAFE — additive, no change to headDisplayText()**

`headDisplayText(node, headSIs)` (dg-engine.js line 372–380) is unchanged. Its contract remains:
- If `headSIs` set: filter tokens to those in headSIs
- Else: return full displayText(node)

The renderer changes are ADDITIVE:
```javascript
if (slot.contentClause && slot.contentClause.innerDR) {
    // NEW: show conjunction as slot text, render innerDR below
    textEl.textContent = slot.contentClause.conjunction || '内容節';
    // + call _dgRenderClause(slot.contentClause.innerDR) and append
} else {
    // UNCHANGED: existing behavior
    textEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
}
```

If `contentClause` is null (non-CC slot, or CC with no inner clause found), the existing behavior is preserved exactly.

If `contentClause.conjunction` is null (CC with no CONJ token), the slot label falls back to a placeholder string. The innerDR is still rendered below. This provides structural rendering even for implicit-conjunction content clauses.

---

## Review Point 10: Existing slot contract compatibility

**Assessment: SAFE — additive extension only**

Current DR_Slot fields (as documented and used):
```
fn, node, connector, si, modifiers[], headSIs, isParticipial, embeddedRelClauses[]
```

Proposed addition: `contentClause: null | { conjunction, innerDR }`

This follows the same extension pattern as previous phases:
- P5-D-1 added: `modifiers[]`, `headSIs`, `isParticipial`
- P6-C added: `embeddedRelClauses[]`
- G-4: adds: `contentClause`

All consumers:
- `_dgRenderMainLine(slots)`: reads fn, connector, node, headSIs, modifiers, isParticipial → add contentClause handling
- `_dgRenderSlotModZone(slots)`: reads fn, connector, modifiers → unchanged (contentClause not needed here)
- `_dgRenderClause(dr)`: calls _dgRenderMainLine and handles slot.embeddedRelClauses → add contentClause rendering
- Test scripts: read fn, node reference, connector → unchanged for non-CC slots

Adding `contentClause=null` for all non-CC slots ensures no existing consumers break.

---

## Review Point 11: Mobile 390px

**Assessment: SAFE — no new mobile requirements**

The CC sub-diagram uses the same DG CSS classes as any other clause (`dg-clause`, `dg-main-line`, `dg-slot-*`, `dg-adv-*`). Existing `@media (max-width: 480px)` rules apply:
```css
.dg-slot-text { font-size: .9rem; }
.dg-slot { padding: .1rem .3rem; }
/* etc. */
```

The sub-diagram inherits reduced font sizes. The horizontal overflow behavior (existing scroll in `.sd-view`) handles any width increase. No new mobile-specific CSS is required for correctness.

Visual risk: Inner clause sub-diagram makes some sentences visually taller on mobile. This is expected and consistent with how adverbial clauses already add vertical depth.

---

## Review Point 12: SD fallback

**Assessment: SAFE — no interaction**

SD fallback (`_sdRenderNode`) reads SR nodes directly and knows nothing about DR or DR_Slot fields. The `contentClause` field on DR_Slot is never read by SD code.

Gate check (lines 12640–12648 in index.html): non-gate chapters use `_sdRenderNode` exclusively. The DG derivation (`DgEngine.deriveDR`) is only called for gate chapters. SD fallback completely unaffected.

---

## Review Point 13: Structure Flow / DA / ICL non-impact

**Assessment: SAFE — no interaction**

- **Structure Flow (SD)**: `_sdRenderNode` reads SR. Not involved.
- **DA**: No separate DA module in codebase.
- **ICL** (`_sdIclPanel`, `_sdIclIndex`): reads ICL payloads from SR node.id via `_sdIclIndex`. ICL processing is completely in the SD rendering path. DR and DR_Slot fields are never accessed by ICL code.
- **Reading Japanese** (`reading-engine.js` etc.): separate module, reads bible_data. No DG interaction.
- **StudyPanel**: reads SR nodes directly. No DG/DR involvement.

---

## Review Point 14: L-0

**Assessment: SAFE**

All operations are purely structural:

| Operation | L-0 | Evidence |
|-----------|-----|---------|
| Find CONJ token in CC.children | SAFE | Structural: checks `morph_raw.startsWith('CONJ')` |
| Find inner clause in CC.children | SAFE | Structural: `c.type === 'clause' \|\| c.type === 'group'` |
| `deriveClauseCore(inner, conjTok.text)` | SAFE | Same function; reads SR without inference |
| Show `conjTok.text` as slot label | SAFE | Shows actual SR token text; no translation |
| Render `innerDR` as sub-diagram | SAFE | Recursive structural rendering; existing code path |
| `contentClause=null` fallback | SAFE | Conservative; shows flat text |

No semantic reasoning, no translation, no interpretation of meaning. SR structure drives all decisions.

---

## Additional Findings

### Finding A: Target count correction

The audit document states "311 + 229 = 540". The actual count from the NT-wide trace is:
- SLOT_ROOT: 311
- SLOT_IN_ADV: 229
- SLOT_IN_COORD: 2
- **Total affected by fix: 542**

The 2 SLOT_IN_COORD cases also pass through `deriveClauseCore`'s MAIN_FN branch (inside coordination sub-clause derivation). They get `contentClause` at no additional implementation cost.

Implementation target: **542 / 736 (73.6%)**.

### Finding B: `deriveFromGroup()` path coverage

`deriveFromGroup()` (lines 489–547) pushes slots via extraPhrases (`type !== 'clause'`). A CC node has `type === 'clause'`, so it is NEVER in extraPhrases. CC nodes inside groups reach `deriveClauseCore` via the `clauseChild` path inside `deriveFromGroup`. The proposed fix in `deriveClauseCore` covers this path.

### Finding C: The 194 NOT_FOUND cases — correct fallback behavior

The proposed fix correctly does NOT apply to 194 NOT_FOUND cases:
- **145 Buried**: Parent clause (fn=OBJECT/fn=null, cn=null) is in mainSlots; CC is a descendant. CC never reaches MAIN_FN branch. Parent slot shows flat text including CC tokens. This is correct fallback — the CC is not separately accessible without SR restructuring.
- **39 Invisible**: CC inside NOMINALIZED_CLAUSE/APPOSITION/ADJ_MOD. DR rendering path doesn't reach these CCs. No display — correct (no inference).

Mandate: "取得不能なら既存flat表示へfallback" — CONFIRMED. These cases correctly fall back.

### Finding D: Connector gap persists (not introduced)

140 SLOT_ROOT cases have `connector=null` (IO or another OBJECT precedes CC in slot sequence). This is a pre-existing gap from connector computation. The proposed fix does not change connector logic. Gap persists but is not regressed.

### Finding E: fn scope — all CONTENT_CLAUSE vs fn=OBJECT only

The proposed fix applies to all `cn === 'CONTENT_CLAUSE'` nodes reaching MAIN_FN, regardless of fn (OBJECT, SUBJECT, COMPLEMENT, SECOND_OBJECT). This is CLEANER than fn=OBJECT-only. For G-4 scope, the primary target is fn=OBJECT (736 SR count), but CC fn=SUBJECT (26), CC fn=COMPLEMENT (2), CC fn=OBJECT2 (17) would also benefit if they reach the MAIN_FN branch.

Decision: Apply to ALL `cn === 'CONTENT_CLAUSE'` in MAIN_FN (not fn-gated). This is lower risk and more correct.

---

## Summary

All 14 review points: **SAFE**.

No blockers. No circular references. No SSOT violations. No SD/ICL/L-0 issues.

Items requiring specification in implementation spec:
1. Null conjunction fallback behavior (use `'内容節'` placeholder or empty string?)
2. null innerDR guard (CC with no inner clause child → contentClause=null)
3. CSS/layout for `dg-cc-clause` (new class needed for sub-diagram attachment)
4. Apply to all CONTENT_CLAUSE in MAIN_FN, not only fn=OBJECT
5. Target count: 542 (not 540)
6. Connector gap (140 cases) accepted as known limitation — not in scope

---

*G-4.2 Design Review COMPLETE. No code changes.*
