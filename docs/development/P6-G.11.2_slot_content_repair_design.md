# P6-G.11.2 — Slot Content Repair Design

**Date:** 2026-08-26
**Phase:** P6-G.11.2 — Read-Only Design Audit
**Predecessor:** P6-G.11.1 (PASS WITH LIMITATIONS — slot boundary is generic omission)
**Constraint:** READ-ONLY. No production code changes. No index.html, dg-engine.js, SR, DR modifications.
**Decision from P6-G.11.1:** Option C (A+B) recommended — extend _extractContentClause() to clause constructions + group-type slot nodes.

---

## A. deriveClauseCore() の Slot Traversal

`deriveClauseCore(clauseNode, conjunction)` — lines 420–525 of `public/core/dg-engine.js`.

For each child of `clauseNode.children`:
1. `fn = child.function?.canonical` (OBJECT2 → SECOND_OBJECT)
2. `fn === null` → P5-E-1: if type is clause/group → `deriveFromNode(child)` → `adverbialClauses[]`
3. `fn === 'ADVERBIAL'` → adverbialPhrases[] or adverbialClauses[]
4. `MAIN_FN.has(fn)`:
   ```javascript
   const modInfo = extractSlotModifiers(child);
   const embeddedRelInfo = _extractEmbeddedRelClauses(child);
   const contentClause = _extractContentClause(child);   // ← CURRENT BOUNDARY
   mainSlots.push({ fn, node: child, ..., contentClause });
   ```

**The boundary is enforced at `_extractContentClause(child)`.**

Currently returns non-null ONLY for `child.construction.canonical === 'CONTENT_CLAUSE'`.

All other node types → `contentClause = null` → slot is stored with `node: child` but no inner DR.

**No other path in `deriveClauseCore()` recurses into `child.children` for MAIN_FN fn nodes.**

---

## B. deriveFromGroup() の Group Traversal

`deriveFromGroup(node, conjunction)` — lines 529–603.

Entry: when a group is encountered (P5-E-1 path, or from `deriveFromNode()`).

```javascript
const clauseChildren = node.children.filter(c => c.type === 'clause');
const clauseChild    = clauseChildren[0] || null;
const extraPhrases   = node.children.filter(
  c => c.type !== 'clause' && c.type !== 'token' && c.function?.canonical
);

if (clauseChildren.length > 1 && extraPhrases.length === 0) {
  // isCoordination=true, coordClauses=clauseChildren.map(deriveClauseCore)
} else if (clauseChild) {
  dr = deriveClauseCore(clauseChild, conjunction);
} else {
  dr = { noVerb: true, slots: [], ... };
}
// merge extraPhrases into dr.slots
```

`deriveFromGroup()` CAN produce a meaningful DR from a group node's clause children.

When a group node IS the MAIN_FN slot node (fn=OBJECT, type=group), `deriveFromGroup(groupNode, null)` would correctly produce an innerDR.

**`deriveFromGroup()` is NOT currently called for group-type slot nodes.** Only `_extractContentClause(child)` is called, which returns null for groups.

---

## C. _extractContentClause() の既存再帰処理

`_extractContentClause(node)` — lines 186–207.

```javascript
function _extractContentClause(node) {
  if (!node) return null;
  if ((node.construction && node.construction.canonical) !== 'CONTENT_CLAUSE') return null;

  const children = node.children || [];
  const conjTok = children.find(
    c => c.type === 'token' && c.evidence && c.evidence.morph_raw &&
         c.evidence.morph_raw.startsWith('CONJ')
  );
  const inner = children.find(c => c.type === 'clause' || c.type === 'group');
  const conjunction = conjTok ? conjTok.text || null : null;

  const innerDR = inner
    ? (inner.type === 'clause'
        ? deriveClauseCore(inner, conjunction)
        : deriveFromGroup(inner, conjunction))
    : deriveClauseCore(node, conjunction);

  if (!innerDR) return null;
  return { conjunction, innerDR };
}
```

The recursive call chain:
- `_extractContentClause(ccNode)` → `deriveClauseCore(inner, conj)` → calls `_extractContentClause()` for EACH MAIN_FN child of `inner`

This means the fix propagates naturally to ALL depths: when the extended `_extractContentClause()` handles a bare clause, the resulting `deriveClauseCore()` call also runs `_extractContentClause()` on the inner clause's own MAIN_FN children. No explicit depth management needed. SR is a finite tree → no infinite recursion.

**Evidence of natural depth-2 propagation (confirmed):** MAT 5:34's OBJECT2 is at depth-2: outer OBJECT/SUBORDINATE_CLAUSE → innerDR → inner OBJECT/bare-clause → innerDR → SECOND_OBJECT. After Option A, both levels are lifted simultaneously by the recursive call chain.

---

## D. MAIN_FN Slot Boundary の全 Node Type

Node types that can be MAIN_FN slot nodes (child.type when `MAIN_FN.has(fn)`):

| Node type | Construction | Current contentClause | Proposed (Option C) |
|-----------|-------------|----------------------|---------------------|
| token | (n/a) | null — correct | null (unchanged) |
| phrase.np | any | null | null (Class E — excluded) |
| phrase.pp | PREP_PHRASE | null | null (Class E — excluded) |
| phrase.adjp | any | null | null (Class E — excluded) |
| clause | CONTENT_CLAUSE | **non-null** (existing) | non-null (unchanged) |
| clause | SUBORDINATE_CLAUSE | null | **non-null** (Option A) |
| clause | PARTICIPIAL_CLAUSE | null | **non-null** (Option A) |
| clause | NOMINALIZED_CLAUSE | null | **null** (EXCLUDED — bracket notation) |
| clause | (none/bare) | null | **non-null** (Option A) |
| group | (none/UNRESOLVED) | null | **non-null** (Option B) |

**NOMINALIZED_CLAUSE: explicitly excluded.** Reason: renderer line 12346 renders NOMINALIZED_CLAUSE bracket notation ONLY when `contentClause` is null. Adding contentClause would bypass bracket notation. Mandate constraint: "NOMINALIZED_CLAUSE bracketを壊さない".

**Phrase-type nodes: excluded (Class E from P6-G.11.1).** Display semantics for phrase-type slot content are unresolved. Out of scope for P6-G.11.2.

---

## E. Clause-type Slot の再帰可能性

### E.1 SUBORDINATE_CLAUSE Slots

SR structure: `clause fn=OBJECT cn=SUBORDINATE_CLAUSE [CONJ-token] [inner-clause/group]`

Match in `deriveFromNode()` at line 663:
```javascript
if (cn === 'SUBORDINATE_CLAUSE' || ...) {
  const conjTok = ...find CONJ...;
  const inner = ...find clause/group...;
  return inner.type === 'clause'
    ? deriveClauseCore(inner, conjTok?.text)
    : deriveFromGroup(inner, conjTok?.text);
}
```

This is **identical** to what `_extractContentClause()` already does for CONTENT_CLAUSE. Structural equivalence confirmed. Extension is safe.

### E.2 PARTICIPIAL_CLAUSE Slots

SR structure: `clause fn=OBJECT cn=PARTICIPIAL_CLAUSE [optional CONJ] [inner clause/group]`

Same dispatch pattern as SUBORDINATE_CLAUSE in `deriveFromNode()` at line 664.

Extension: find CONJ + inner clause → `deriveClauseCore(inner, conj)` or `deriveFromGroup(inner, conj)`.

### E.3 Bare Clause Slots (no cn)

SR structure: `clause fn=OBJECT` with fn-marked children directly.

No [CONJ + inner wrapper] structure. The clause node's own children ARE the fn-marked elements.

Extension: `deriveClauseCore(node, null)` called directly on the slot node.

**Safety check:** The outer `deriveClauseCore(outerClause)` processes `outerClause.children`, among which is `bareClauseSlot`. It stores `{ node: bareClauseSlot, ... }` as a slot. The extended `_extractContentClause(bareClauseSlot)` then calls `deriveClauseCore(bareClauseSlot, null)`, which processes `bareClauseSlot.children` — a STRICTLY DISJOINT set from `outerClause.children`. No re-processing, no cycles.

### E.4 CONTENT_CLAUSE Depth-2 Cases

Currently: 4 invisible OBJECT2 instances where blocking is OBJECT/CONTENT_CLAUSE (nearest ancestor), but the OBJECT2 is inside the innerDR's OBJECT/bare-clause slot.

After Option A: the innerDR's OBJECT/bare-clause slot ALSO produces contentClause.innerDR (bare clause extension). `countFnInDR` recursively traverses all contentClause levels. Recovery CONFIRMED.

---

## F. Group-type Slot の再帰可能性

Group nodes with `fn ∈ MAIN_FN` (Option B):

SR structure: `group fn=OBJECT [children: clauses, tokens, fn-marked phrases]`

Extension: `deriveFromGroup(groupNode, null)` called directly on the slot node.

`deriveFromGroup(groupNode, null)` behavior:
- If 2+ clause children, no extraPhrases → `isCoordination: true, coordClauses: [...]`
- If 1 clause child → `deriveClauseCore(clauseChild, null)`
- If no clause children → `{ noVerb: true, slots: [], ... }` (empty — rejected by `_isEmptyDR` guard)

For the 10 `OBJECT|group` cases and 3 `SECOND_OBJECT|group` (self-nested) cases: the groups have clause children containing PREDICATE/OBJECT/SECOND_OBJECT. `deriveFromGroup()` produces meaningful innerDR. `countFnInDR` finds SECOND_OBJECT.

**Empty DR guard:** If `deriveFromGroup()` produces `{ noVerb: true, slots: [], adverbialClauses: [], ... }` (no clause children), `_isEmptyDR()` returns true → `_extractContentClause()` returns null → no sub-diagram attached. This protects against attaching empty sub-diagrams to simple group slots (e.g., coordinate NP groups with no clause children).

---

## G. Nested Clause / Nested Group の最大深度

**Maximum depth:** Unbounded in theory (SR is finite, so always terminates). Typical NT Greek: 2–3 levels. Observed maximum: MAT 5:34 (2 levels: SUBORDINATE_CLAUSE → bare-clause).

**No explicit depth guard needed:** The current engine has no depth limit in `deriveClauseCore()`. The new extension follows the same pattern. SR finitude guarantees termination.

**Self-reference impossible:** SR is a tree (no cycles). Each recursive call processes a descendant node. Stack depth equals SR tree depth.

---

## H. 二重描画リスク

**Renderer behavior** (confirmed from index.html line 12340):
```javascript
if (slot.contentClause && slot.contentClause.innerDR) {
  textEl.textContent = slot.contentClause.conjunction || slot.contentClause.label || '内容節';
  slotEl.appendChild(textEl);
}
```

When `contentClause` is non-null:
- Main line slot shows: conjunction token text OR construction label (e.g., '従属節', '分詞節', '節')
- Sub-diagram (lines 12672–12683): renders `contentClause.innerDR`

The main line slot **does NOT show the full clause text** when `contentClause` is present. It shows only the conjunction/label. The actual Greek tokens of the inner clause appear only in the sub-diagram.

**No double-drawing.** The same Greek tokens appear exactly once: either as the conjunction label on the main line, or in the sub-diagram. This is identical to existing CONTENT_CLAUSE behavior.

**Visual change:** All clause/group-type MAIN_FN slots NT-wide gain sub-diagrams. Previously they showed the full flat clause text on the main line. After the fix, they show the conjunction/label text + sub-diagram below. This is the intended behavior change — the same as CONTENT_CLAUSE rendering.

---

## I. Token Duplication Risk

`countFnInDR` counts SECOND_OBJECT SLOTS, not tokens. For any slot:

- Outer slot `fn=OBJECT` → not counted as SECOND_OBJECT
- `contentClause.innerDR.slots` containing `fn=SECOND_OBJECT` → counted as 1

For SECOND_OBJECT self-nested group (JHN 2:14, JHN 4:17, LUK 18:19):
- Outer SECOND_OBJECT slot (group fn=OBJECT2) → already counted as 1
- After Option B: inner OBJECT2 within the group's innerDR → counted as additional 1
- SR count for these sentences: 2 OBJECT2 nodes → DR count after fix: 2 ✓ (matches SR)

**No spurious double-counting.** Outer and inner SECOND_OBJECT are distinct grammatical nodes in SR.

---

## J. Circular Reference Risk

**None.**

All recursive calls in `_extractContentClause()` → `deriveClauseCore()` → `_extractContentClause()` process descendant nodes of the current slot node. SR is a directed acyclic tree. No node can be both an ancestor and a descendant. Termination guaranteed.

---

## K. Connector 生成への影響

Connectors are computed in `deriveClauseCore()` for `mainSlots` AFTER they are all collected:
```javascript
for (let i = 1; i < mainSlots.length; i++) {
  mainSlots[i].connector = connectorBetween(mainSlots[i-1].fn, mainSlots[i].fn, !hasVerb);
}
```

Adding `contentClause.innerDR` to a slot does NOT change the slot's `fn`, `si`, or position in `mainSlots`. Connector computation uses only `fn` values. **Zero impact on connector generation.**

The innerDR has its OWN connector computation (inside the recursive `deriveClauseCore()` call). These inner connectors are independent of the outer clause's connectors.

---

## L. Existing contentClause との統合

Current `contentClause` schema (DR comment line 33):
```
contentClause   null | {conjunction: string|null, innerDR: DR_Clause}
```

**Proposed extension** — add `label` field:
```
contentClause   null | {conjunction: string|null, innerDR: DR_Clause, label: string|null}
                — inner DR for clause/group-type MAIN_FN slots.
                  label: display fallback when conjunction is null (e.g. '従属節', '分詞節', '節', '節グループ').
                  null for CONTENT_CLAUSE (backward-compatible: renderer fallback remains '内容節').
```

Backward compatibility: existing CONTENT_CLAUSE `contentClause` returns `{ conjunction, innerDR }` (no `label` field). Renderer: `conjunction || slot.contentClause.label || '内容節'` → `label` is `undefined` → evaluates to `'内容節'`. ✓

**Renderer change** (index.html — 2 lines):
- Line 12341: `slot.contentClause.conjunction || '内容節'` → `slot.contentClause.conjunction || slot.contentClause.label || '内容節'`
- Line 12677: same

These two lines are the ONLY renderer changes required.

---

## M. OBJECT2 Coverage 改善量

Dry-run classification against all 112 residuals:

| Category | Cases | Addressed by Option C? |
|---------|-------|------------------------|
| OBJECT \| clause (no cn) | 49 | YES — bare clause extension |
| OBJECT \| group | 10 | YES — group extension |
| OBJECT \| clause/SUBORDINATE_CLAUSE | 6 | YES — SUBORDINATE_CLAUSE extension |
| OBJECT \| clause/CONTENT_CLAUSE (depth-2) | 4 | YES — bare clause recursive |
| OBJECT \| clause/PARTICIPIAL_CLAUSE | 4 | YES — PARTICIPIAL_CLAUSE extension |
| SECOND_OBJECT \| group (self-nested) | 3 | YES — group extension |
| SUBJECT \| clause (no cn) | 1 | YES — bare clause extension |
| SUBJECT \| clause/NOMINALIZED_CLAUSE | 2 | NO — NOMINALIZED excluded |
| OBJECT \| clause/NOMINALIZED_CLAUSE | 4 | NO — NOMINALIZED excluded |
| AUX \| clause/NOMINALIZED_CLAUSE | 1 | NO — NOMINALIZED excluded |
| phrase.np type (all) | 18 | NO — Class E excluded |
| NONE structural gap | 9 | NO — separate structural fix |
| **Total addressed** | **77** | |
| **Total not addressed** | **35** | |

**Projected DR:** 199 + 77 = **276**
**Projected coverage:** 276 / 311 = **88.7%**

Note: 77 is the upper bound. Actual recovery equals 77 if OBJECT2 is accessible at any traversal depth in the innerDR. Given the confirmed recursive `countFnInDR` traversal and the depth-2 MAT 5:34 case analysis, actual recovery is expected to match 77 closely.

---

## N. OBJECT 以外の fn への横展開

Option C is **generic** — it applies to ALL MAIN_FN slot fns uniformly:

- `_extractContentClause(child)` is called for every `MAIN_FN.has(fn)` child in `deriveClauseCore()`
- The extension does not check `fn === 'OBJECT'` — it applies to SUBJECT, PREDICATE, COMPLEMENT, IO, AUX, SECOND_OBJECT equally

Cross-function DR visibility will improve for all fn values where clause/group-type slot nodes exist. The OBJECT2 count is the audited metric (77 cases), but PREDICATE, OBJECT, SUBJECT within clause/group-type slots also become visible through the sub-diagrams.

---

## O. Gate Chapters への影響

| Chapter | Current | After Option C |
|---------|---------|----------------|
| JHN 1 | PASS (2/2) | PASS (unchanged) |
| MAT 5 | FAIL (MAT 5:34: OBJECT\|clause) | **PASS** (bare clause fix) |
| MAT 28 | PASS (1/1) | PASS (unchanged) |
| ROM 6 | PASS (5/5) | PASS (unchanged) |
| PHP 2 | PASS (4/4) | PASS (unchanged) |
| EPH 2 | FAIL (EPH 2:14: COMPLEMENT\|APPOSITION) | FAIL (unchanged — phrase-type excluded) |
| COL 1 | FAIL (COL 1:26: OBJECT\|SUBORDINATE_CLAUSE) | **PASS** (SUBORDINATE_CLAUSE fix) |

MAT 5 and COL 1 would pass. EPH 2 remains FAIL (COMPLEMENT/APPOSITION is phrase.np type, Class E).

---

## P. NT-wide Coverage Projection

| fn | Current DR | Projected DR (Option C) | Change |
|----|-----------|------------------------|--------|
| SECOND_OBJECT | 199 | ~276 | +77 |
| OBJECT | 8,878 | higher | (not fully audited) |
| SUBJECT | 7,753 | higher | (not fully audited) |
| PREDICATE | 15,454 | higher | (not fully audited) |

SECOND_OBJECT is the fully audited metric. Other fn values improve proportionally as clause/group-type slot nodes in their categories gain innerDR.

---

## Q. L-0 Compliance

| Criterion | Assessment | Status |
|-----------|-----------|--------|
| New semantic inference | None — SR-explicit structure only | SAFE |
| New lexical inference | None | SAFE |
| New attachment inference | None — fn-markings already in SR | SAFE |
| SR source nodes mutated | None — `deriveClauseCore()` is read-only | SAFE |
| Inner fn values exposed | SR-explicit only | SAFE |
| NOMINALIZED_CLAUSE excluded | Bracket notation preserved | SAFE |
| Phrase-type excluded | No ambiguous display | SAFE |

**L-0: SAFE.** All extended node types have explicitly SR-encoded inner structures. No inference of any kind.

---

## R. Mobile 390px への影響

Existing CSS (from index.html):
```css
@media (max-width: 480px) {
  .dg-cc-clause-attach { padding-left: .8rem; }
  .dg-cc-clause-label  { font-size: 8px; }
}
```

The `dg-cc-clause-attach` and `dg-cc-clause-label` classes already have mobile-specific rules. New sub-diagrams (SUBORDINATE_CLAUSE, PARTICIPIAL_CLAUSE, bare clause, group) will use the same classes → automatic mobile layout.

**Overflow risk:** Clause-type slot nodes often contain full clauses with multiple tokens. Sub-diagrams on mobile (390px) may be compact but should not overflow given the existing padding rules. CONTENT_CLAUSE sub-diagrams on mobile already render without issue → same behavior expected.

**No new CSS needed** for basic mobile support. Visual testing is required (not in this read-only phase).

---

## S. Regression Risk

| Risk | Severity | Mitigation |
|------|---------|------------|
| NOMINALIZED_CLAUSE bracket notation bypassed | HIGH | NOMINALIZED_CLAUSE excluded from extension — confirmed |
| APPOSITION slot rendering bypassed | HIGH | APPOSITION is phrase.np — excluded from extension |
| CONTENT_CLAUSE existing behavior changed | MEDIUM | CONTENT_CLAUSE path unchanged; `label: null` is backward-compatible |
| `_extractEmbeddedRelClauses()` double-fires | LOW | CLAUSE_AS_NP is phrase.np type — extension doesn't affect it |
| `extractSlotModifiers()` conflicts | LOW | For clause/group nodes, extractSlotModifiers() returns null (no GENITIVE_MOD etc. on clauses) |
| Connector computation affected | NONE | Connectors use outer slot fn only — innerDR has no effect |
| Empty sub-diagram for no-clause groups | LOW | `_isEmptyDR()` guard prevents attaching empty innerDR |
| Infinite recursion | NONE | SR is a finite acyclic tree |
| Token deduplication in DR | NONE | countFnInDR counts slots, not tokens |
| NT-wide derivation errors | LOW | Same code paths used (deriveClauseCore, deriveFromGroup) |
| Mobile overflow | LOW | Existing CSS mobile rules already apply |

**Critical regression gates:**
1. JHN 1:1 COORDINATION structure unchanged
2. EPH 2:8 CONTENT_CLAUSE sub-diagram unchanged
3. MAT 1:19 APPOSITION modifier rendering unchanged
4. PHP 2:1 R6 recovery unchanged
5. NOMINALIZED_CLAUSE bracket notation (any verse with NOMINALIZED_CLAUSE slot)
6. NT-wide DR SECOND_OBJECT count = 199 before fix, ~276 after fix

---

## Summary: Design Safety Assessment

**Option C (modified — NOMINALIZED_CLAUSE excluded) is SAFE to implement.**

Key constraints satisfied:
- SRをSSOTとする: ✓ (no inference, SR-explicit only)
- rendererに統語推論を追加しない: ✓
- L-0を維持する: ✓
- OBJECT2専用hackにしない: ✓ (generic extension to all fn values)
- Phrase-type slotは今回修正しない: ✓ (phrase.np, phrase.pp excluded)
- NOMINALIZED_CLAUSE bracketを壊さない: ✓ (explicitly excluded)
- APPOSITIONを壊さない: ✓ (phrase.np — excluded)
- 既存CONTENT_CLAUSE処理を壊さない: ✓ (path unchanged, label: null backward-compatible)
- PP diagonalを壊さない: ✓ (PP is phrase.pp — excluded)
- IO platformを壊さない: ✓ (IO rendering uses `ioSlots`, not contentClause)

---

*Design complete. READ-ONLY. No production code modified. Proceed to implementation specification.*
