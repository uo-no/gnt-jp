# P6-G.11.2 — Slot Content Repair: Implementation Specification

**Date:** 2026-08-26
**Phase:** P6-G.11.2 — Read-Only Design Audit
**Companion to:** `P6-G.11.2_slot_content_repair_design.md`
**Status:** SPECIFICATION ONLY. Do NOT implement. No file changes in this phase.

This document specifies the exact code changes required for P6-G.11.3 (implementation phase).

---

## 1. Change Summary

| File | Change type | Lines affected | Risk |
|------|-------------|----------------|------|
| `public/core/dg-engine.js` | ADD + MODIFY | ~30 lines added, 0 deleted | Low |
| `public/index.html` | MODIFY | 2 lines | Low |

---

## 2. dg-engine.js Changes

### 2.1 Schema Comment Update

**Location:** Line 33–34 (DR schema comment block).

**Current:**
```javascript
 *   contentClause   null | {conjunction: string|null, innerDR: DR_Clause}
 *                            — inner DR for CONTENT_CLAUSE slots (P6-G-4)
```

**New:**
```javascript
 *   contentClause   null | {conjunction: string|null, innerDR: DR_Clause, label: string|null}
 *                            — inner DR for clause/group-type MAIN_FN slots (P6-G-4, P6-G.11.3)
 *                              label: display fallback when conjunction is null.
 *                              null for CONTENT_CLAUSE (backward-compatible).
```

---

### 2.2 New Helper Function `_isEmptyDR`

**Location:** Insert immediately BEFORE `_extractContentClause` (current line 186).

**New function:**
```javascript
  // Guard: returns true when a derived DR has no meaningful content to display.
  function _isEmptyDR(dr) {
    if (!dr) return true;
    if (dr.isCoordination) return dr.coordClauses.length === 0;
    return dr.slots.length === 0
        && dr.adverbialClauses.length === 0
        && dr.adverbialPhrases.length === 0;
  }
```

---

### 2.3 Modified `_extractContentClause`

**Location:** Lines 186–207 (current implementation).

**Current (lines 186–207):**
```javascript
  // P6-G-4: For a CONTENT_CLAUSE slot node, extract {conjunction, innerDR} or null.
  // Returns null for non-CC nodes or if derivation fails.
  // When no nested clause child exists, derives from the CC node itself (parity with deriveFromNode).
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

    // If inner clause child present use it; otherwise derive from CC node itself (two-token CC body)
    const innerDR = inner
      ? (inner.type === 'clause'
          ? deriveClauseCore(inner, conjunction)
          : deriveFromGroup(inner, conjunction))
      : deriveClauseCore(node, conjunction);

    if (!innerDR) return null;
    return { conjunction, innerDR };
  }
```

**New (replacement):**
```javascript
  // P6-G-4 / P6-G.11.3: For clause/group-type MAIN_FN slot nodes, extract {conjunction, innerDR, label} or null.
  // CONTENT_CLAUSE: existing behavior (label: null → renderer falls back to '内容節').
  // SUBORDINATE_CLAUSE / PARTICIPIAL_CLAUSE: same [CONJ + inner] structure; label for labelless cases.
  // Bare clause (no cn): derive from node directly; no CONJ.
  // Group: derive via deriveFromGroup; no CONJ.
  // NOMINALIZED_CLAUSE: excluded — bracket notation must be preserved (see index.html line 12346).
  // Phrase-type (phrase.np, phrase.pp): excluded — Class E, out of scope.
  function _extractContentClause(node) {
    if (!node) return null;
    const cn = node.construction?.canonical;

    // ── CONTENT_CLAUSE (existing, unchanged) ─────────────────────────────
    if (cn === 'CONTENT_CLAUSE') {
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
      return { conjunction, innerDR, label: null };
    }

    // ── SUBORDINATE_CLAUSE: [CONJ token] + [inner clause/group] ──────────
    if (cn === 'SUBORDINATE_CLAUSE') {
      const children = node.children || [];
      const conjTok = children.find(
        c => c.type === 'token' && c.evidence?.morph_raw?.startsWith('CONJ')
      );
      const inner = children.find(c => c.type === 'clause' || c.type === 'group');
      const conjunction = conjTok?.text || null;
      const innerDR = inner
        ? (inner.type === 'clause'
            ? deriveClauseCore(inner, conjunction)
            : deriveFromGroup(inner, conjunction))
        : deriveClauseCore(node, conjunction);
      if (!innerDR || _isEmptyDR(innerDR)) return null;
      return { conjunction, innerDR, label: '従属節' };
    }

    // ── PARTICIPIAL_CLAUSE: [optional CONJ] + [inner clause/group] ───────
    if (cn === 'PARTICIPIAL_CLAUSE') {
      const children = node.children || [];
      const conjTok = children.find(
        c => c.type === 'token' && c.evidence?.morph_raw?.startsWith('CONJ')
      );
      const inner = children.find(c => c.type === 'clause' || c.type === 'group');
      const conjunction = conjTok?.text || null;
      const innerDR = inner
        ? (inner.type === 'clause'
            ? deriveClauseCore(inner, conjunction)
            : deriveFromGroup(inner, conjunction))
        : deriveClauseCore(node, conjunction);
      if (!innerDR || _isEmptyDR(innerDR)) return null;
      return { conjunction, innerDR, label: '分詞節' };
    }

    // ── Bare clause (no construction): node IS the inner clause ──────────
    if (node.type === 'clause' && !cn) {
      const innerDR = deriveClauseCore(node, null);
      if (!innerDR || _isEmptyDR(innerDR)) return null;
      return { conjunction: null, innerDR, label: '節' };
    }

    // ── Group-type slot node: derive via deriveFromGroup ──────────────────
    if (node.type === 'group') {
      const innerDR = deriveFromGroup(node, null);
      if (!innerDR || _isEmptyDR(innerDR)) return null;
      return { conjunction: null, innerDR, label: '節グループ' };
    }

    // NOMINALIZED_CLAUSE: excluded — bracket notation preserved in renderer.
    // Phrase-type (phrase.np, phrase.pp, phrase.adjp): excluded — Class E.
    // Token: excluded — no recursion needed.
    return null;
  }
```

**Line count:** Current = 22 lines. New = 54 lines (+32 lines, 0 deleted).

---

### 2.4 No Other dg-engine.js Changes

- `deriveClauseCore()`: unchanged. The call `const contentClause = _extractContentClause(child)` at line 487 requires NO modification — the extended function handles new node types automatically.
- `deriveFromGroup()`: unchanged.
- `deriveFromNode()`: unchanged.
- `MAIN_FN` set: unchanged.
- All other functions: unchanged.

---

## 3. index.html Changes

### 3.1 Slot Main-Line Label (Line 12341)

**Location:** `public/index.html`, line 12341.

**Current:**
```javascript
        textEl.textContent = slot.contentClause.conjunction || '内容節';
```

**New:**
```javascript
        textEl.textContent = slot.contentClause.conjunction || slot.contentClause.label || '内容節';
```

**Context (for verification):**
```javascript
        // P6-G-4: CC slot shows conjunction label; fallback to full text if no innerDR
        if (slot.contentClause && slot.contentClause.innerDR) {
            textEl.textContent = slot.contentClause.conjunction || slot.contentClause.label || '内容節';  // ← changed
            slotEl.appendChild(textEl);
        } else if (slot.node?.construction?.canonical === 'APPOSITION') {
```

---

### 3.2 Sub-Diagram Attach Label (Line 12677)

**Location:** `public/index.html`, line 12677.

**Current:**
```javascript
        ccLabel.textContent = slot.contentClause.conjunction || '内容節';
```

**New:**
```javascript
        ccLabel.textContent = slot.contentClause.conjunction || slot.contentClause.label || '内容節';
```

**Context (for verification):**
```javascript
    // P6-G-4: render CONTENT_CLAUSE inner structure as sub-diagram per slot
    for (const slot of (dr.slots || [])) {
        if (!slot.contentClause || !slot.contentClause.innerDR) continue;
        const ccWrap = document.createElement('div');
        ccWrap.className = 'dg-cc-clause-attach';
        const ccLabel = document.createElement('div');
        ccLabel.className = 'dg-cc-clause-label';
        ccLabel.textContent = slot.contentClause.conjunction || slot.contentClause.label || '内容節';  // ← changed
        const ccEl = _dgRenderClause(slot.contentClause.innerDR);
```

---

### 3.3 No Other index.html Changes

- CSS: unchanged. `dg-cc-clause-attach`, `dg-cc-clause-label`, `dg-cc-clause` classes already exist and cover all new sub-diagram types.
- NOMINALIZED_CLAUSE rendering (line 12346): unchanged — in `else` branch; only reached when `contentClause === null` (which is preserved for NOMINALIZED_CLAUSE slots).
- APPOSITION rendering (line 12343): unchanged — phrase.np type, excluded from extension.
- IO platform rendering: unchanged — uses `ioSlots` array, not `contentClause`.
- PP diagonal rendering: unchanged — ADVERBIAL fn, not MAIN_FN slot content.

---

## 4. Label Reference Table

| Construction / Type | `contentClause.conjunction` | `contentClause.label` | Displayed as |
|--------------------|----------------------------|----------------------|--------------|
| CONTENT_CLAUSE | conjunction text (e.g. 'ὅτι') | null | conjunction or '内容節' |
| CONTENT_CLAUSE (no conj) | null | null | '内容節' |
| SUBORDINATE_CLAUSE | conjunction text | '従属節' | conjunction or '従属節' |
| SUBORDINATE_CLAUSE (no conj) | null | '従属節' | '従属節' |
| PARTICIPIAL_CLAUSE | conjunction text (rare) | '分詞節' | conjunction or '分詞節' |
| PARTICIPIAL_CLAUSE (no conj) | null | '分詞節' | '分詞節' |
| Bare clause (no cn) | null | '節' | '節' |
| Group | null | '節グループ' | '節グループ' |
| NOMINALIZED_CLAUSE | — | — | bracket notation (unchanged) |

---

## 5. Boundary Conditions

### 5.1 When `_isEmptyDR` fires

`_isEmptyDR(dr)` returns true when:
- `dr` is null/undefined
- `dr.isCoordination === true` AND `dr.coordClauses.length === 0`
- `dr.isCoordination === false` AND `dr.slots.length === 0` AND `dr.adverbialClauses.length === 0` AND `dr.adverbialPhrases.length === 0`

Effect: `_extractContentClause()` returns null → slot.contentClause = null → no sub-diagram rendered → slot displays flat text as before.

### 5.2 Bare Clause Self-Derivation Safety

When `_extractContentClause(bareClauseNode)` calls `deriveClauseCore(bareClauseNode, null)`:
- `bareClauseNode` is a CHILD of the outer clause
- `bareClauseNode.children` are the inner clause's fn-marked nodes
- The outer `deriveClauseCore(outerClause)` only iterates `outerClause.children`
- These are DISJOINT sets: `outerClause.children` ≠ `bareClauseNode.children`
- No re-processing of already-processed nodes

### 5.3 Group Slot with No Clause Children

If a group slot node has zero clause children, `deriveFromGroup()` returns `{ noVerb: true, slots: [], ... }`. `_isEmptyDR()` returns true → `_extractContentClause()` returns null. The group slot renders flat (unchanged from current behavior).

### 5.4 CONTENT_CLAUSE Backward Compatibility

Existing behavior: `return { conjunction, innerDR }` (no `label`).
New behavior: `return { conjunction, innerDR, label: null }`.

Renderer: `slot.contentClause.conjunction || slot.contentClause.label || '内容節'`
- With conjunction: shows conjunction (unchanged) ✓
- Without conjunction: `null || null || '内容節'` = '内容節' (unchanged) ✓

---

## 6. Implementation Order for P6-G.11.3

The two files can be changed in any order. Recommended order:

1. **dg-engine.js** first:
   a. Insert `_isEmptyDR()` before `_extractContentClause()`
   b. Replace `_extractContentClause()` body
   c. Update schema comment (line 33)

2. **index.html** second:
   a. Update line 12341 (slot main-line label)
   b. Update line 12677 (sub-diagram label)

3. **Verify** NT-wide SECOND_OBJECT count = ~276 (exact value TBD by implementation)

4. **Run regression gates** per P6-G.11.2_slot_content_test_matrix.md

---

## 7. What P6-G.11.3 Must NOT Do

- Modify `deriveClauseCore()` body (other than schema comment update at line 33)
- Modify `deriveFromGroup()`
- Modify `deriveFromNode()`
- Modify `MAIN_FN` set
- Modify `_extractEmbeddedRelClauses()`
- Modify `extractSlotModifiers()`
- Add inference or annotation not in SR
- Add contentClause for NOMINALIZED_CLAUSE
- Add contentClause for phrase.np / phrase.pp / phrase.adjp types
- Modify Structure Flow, DA, ICL, or SR data files
- Commit, merge, push, or deploy

---

*Implementation specification complete. READ-ONLY. No code changed in this phase.*
