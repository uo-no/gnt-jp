# P6-G.8.1 — NOMINALIZED_CLAUSE Relationship Matrix

**Date:** 2026-08-26  
**Phase:** P6-G.8.1 — Read-only Audit  
**Purpose:** Full SR→DR→Renderer pipeline documentation for NOMINALIZED_CLAUSE

---

## 1. Pipeline Model

```
SR Node
  cn = NOMINALIZED_CLAUSE
  fn = SUBJECT | OBJECT | COMPLEMENT | AUX | INDIRECT_OBJECT | OBJECT2 | ADVERBIAL | null
  children = [article-token, participial-clause | infinitive-token]

      ↓ dg-engine.js deriveDR() / deriveClauseCore()

DR Slot (if fn ∈ MAIN_FN)
  slot.fn = fn
  slot.node = NOMINALIZED_CLAUSE node
  slot.contentClause = null         ← NOT extracted (only CONTENT_CLAUSE is)
  slot.headSIs = null               ← NOT extracted (only CLAUSE_AS_NP is)
  slot.modifiers = []               ← modifiers extracted separately
  slot.embeddedRelClauses = []      ← NOT extracted (only CLAUSE_AS_NP is)

      ↓ headDisplayText(slot.node, slot.headSIs=null)
      ↓ → displayText(node) = all tokens joined

Renderer (_dgRenderMainLine in index.html)
  textEl.textContent = full flat text
  slotEl.appendChild(textEl)

      ↓

Visualized: flat text — NO bracket, indistinguishable from NP
```

---

## 2. Stage-by-Stage Analysis

### Stage 1: SR

| Property | Value | Status |
|----------|-------|--------|
| SR source | `public/assets/data/sr/[BOOK]/[CH].json` | CONFIRMED |
| Construction field | `node.construction.canonical === 'NOMINALIZED_CLAUSE'` | CONFIRMED — SSOT |
| Function field | `node.function.canonical` | CONFIRMED — one of 8 values |
| Children | article token + participial/infinitive clause | CONFIRMED |
| NT total (cn=NOMINALIZED_CLAUSE) | 2,008 | CONFIRMED |
| Gate total | 47 | CONFIRMED |

### Stage 2: Engine — _extractContentClause()

```javascript
// dg-engine.js line ~182–203
function _extractContentClause(node) {
    if (node.construction?.canonical !== 'CONTENT_CLAUSE') return null;
    // ...
}
```

**Result for NOMINALIZED_CLAUSE:** Returns null. NOMINALIZED_CLAUSE is explicitly excluded.

### Stage 3: Engine — _extractEmbeddedRelClauses()

```javascript
// dg-engine.js line ~151–177
function _extractEmbeddedRelClauses(node) {
    if (node.construction?.canonical !== 'CLAUSE_AS_NP') return null;
    // ...
}
```

**Result for NOMINALIZED_CLAUSE:** Returns null. NOMINALIZED_CLAUSE is explicitly excluded.

### Stage 4: Engine — deriveClauseCore() MAIN_FN routing

```javascript
// dg-engine.js line ~416–519
const MAIN_FN = new Set([
    'SUBJECT','COPULA','PREDICATE','OBJECT','COMPLEMENT',
    'INDIRECT_OBJECT','SECOND_OBJECT','AUX'
]);
// ...
if (MAIN_FN.has(child.function.canonical)) {
    slots.push({
        fn: child.function.canonical,
        node: child,
        contentClause: _extractContentClause(child),  // → null
        headSIs: _extractEmbeddedRelClauses(child),   // → null
        modifiers: [...],
        embeddedRelClauses: [],
    });
}
```

**Result for NOMINALIZED_CLAUSE:**
- fn=SUBJECT/OBJECT/COMPLEMENT/INDIRECT_OBJECT/AUX → enters slot (MAIN_FN.has = true)
- fn=OBJECT2 → blocked (MAIN_FN.has('OBJECT2') = false — existing engine gap)
- fn=ADVERBIAL → routed to adv zone (not MAIN_FN)
- fn=null → buried (no fn field → no routing)

### Stage 5: Engine — headDisplayText()

```javascript
// dg-engine.js line ~404–412
function headDisplayText(node, headSIs) {
    if (headSIs === null) {
        return displayText(node);  // all descendant tokens joined
    }
    // ... (headSIs narrowing path — not reached for NOMINALIZED_CLAUSE)
}
```

**Result for NOMINALIZED_CLAUSE:** Since headSIs=null, returns `displayText(node)` = full text.

### Stage 6: Renderer — _dgRenderMainLine()

```javascript
// index.html (current — post P6-G.6.3)
if (slot.contentClause && slot.contentClause.innerDR) {
    // CONTENT_CLAUSE branch [NOT reached]
} else if (slot.node?.construction?.canonical === 'APPOSITION') {
    // APPOSITION branch [NOT reached]
} else {
    // Default: flat text
    textEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
    slotEl.appendChild(textEl);
}
```

**Result for NOMINALIZED_CLAUSE:** Falls through to default branch. Renders as flat text. No visual distinction.

---

## 3. Comparison: NOMINALIZED_CLAUSE vs CONTENT_CLAUSE

| Property | NOMINALIZED_CLAUSE | CONTENT_CLAUSE |
|----------|---------------------|----------------|
| SR construction | cn=NOMINALIZED_CLAUSE | cn=CONTENT_CLAUSE |
| Introduced by | Article (articular inf. / subst.ptc.) | Complementizer (ὅτι, ἵνα, εἰ…) |
| Inner clause type | Nominalized (not independently parseable) | Finite, has own main line |
| slot.contentClause | null | `{ innerDR: {...}, conjunction: 'ὅτι' }` |
| slot.headSIs | null | null |
| headDisplayText() | full displayText (all tokens) | not called — sub-diagram |
| Renderer branch | Default (flat text) | CONTENT_CLAUSE (sub-diagram) |
| DR count | 271 | 326 |
| Gate DR | 5 | 15 |
| Visual output | Flat text — NO marker | Sub-diagram + conjunction label |
| Engine change needed | NO | N/A (already implemented) |
| RK/Leedy notation | `[ ... ]` bracket | Embedded diagram |

**Critical distinction:** CONTENT_CLAUSE requires a sub-diagram because the inner clause has its own grammatical structure (subject, predicate, etc.). NOMINALIZED_CLAUSE is atomic as a noun-slot filler — it does not need inner structure rendered. The bracket `[...]` signals that the slot content is clause-derived, not a simple noun phrase.

---

## 4. Comparison: NOMINALIZED_CLAUSE vs CLAUSE_AS_NP

| Property | NOMINALIZED_CLAUSE | CLAUSE_AS_NP |
|----------|---------------------|--------------|
| SR construction | cn=NOMINALIZED_CLAUSE | cn=CLAUSE_AS_NP |
| Greek form | Article + participle / articular inf. | Relative clause functioning as NP (ὅς-clause, etc.) |
| slot.headSIs | null | set if relative clause extracted (P6-C) |
| headDisplayText() | full displayText | narrowed (excludes relative pronoun) |
| P6-C interaction | None | headSIs narrowing already applied |
| Renderer branch | Default (flat text) | Default (flat text, but narrowed) |
| DR count | 271 | 113 |
| Remaining gap | No bracket | No clause marker |
| Engine change needed | NO | NO |

---

## 5. Routing Summary: All SR fn Values

| fn | MAIN_FN? | Engine route | DR result | DR count |
|----|---------|-------------|-----------|---------|
| SUBJECT | Yes | → slot.fn=SUBJECT | In DR | 170 |
| AUX | Yes | → slot.fn=AUX | In DR | 34 |
| OBJECT | Yes | → slot.fn=OBJECT | In DR | 32 |
| COMPLEMENT | Yes | → slot.fn=COMPLEMENT | In DR | 18 |
| INDIRECT_OBJECT | Yes | → slot.fn=INDIRECT_OBJECT | In DR (IO platform) | 17 |
| null | No fn | Not routed | Buried | 1,112 |
| ADVERBIAL | No (adv zone) | → adv zone path | Adv zone (not typed) | 98 |
| OBJECT2 | No (engine gap) | Blocked | 0 | 1 |
| **Total in DR** | | | | **271** |

---

## 6. Visual Gap: Current vs Target

### Current (all 271 DR slots)

```
──────────────────────────
  [fn label]    [fn label]
══════════════════════════
       主語: οἱ πενθοῦντες
```

The slot text "οἱ πενθοῦντες" is rendered identically to "Ἰησοῦς" (a proper noun in SUBJECT position).  
No visual signal that this is a clause functioning as a noun.

### Target (RK/Leedy bracket notation)

```
──────────────────────────
  [fn label]    [fn label]
══════════════════════════
    主語: [οἱ πενθοῦντες]
```

The bracket `[...]` signals: the subject is a nominalized clause, not a simple NP.

---

## 7. L-0 Audit for Gap Repair

**Detection source:** `slot.node.construction.canonical === 'NOMINALIZED_CLAUSE'` — SR SSOT, explicit.

**Text content:** `headDisplayText(slot.node, null)` = `displayText(slot.node)` = all tokens. Unchanged.

**Bracket meaning:** "This slot is filled by a clause functioning as a noun." — Directly readable from SR cn=NOMINALIZED_CLAUSE. No inference about content, referent, or inner structure.

**L-0 status: SAFE.**

The bracket does not:
- Select a meaning from alternatives
- Infer a relationship not in SR
- Render inner clause structure (that would require engine change)
- Translate or paraphrase

---

*P6-G.8.1 relationship matrix. No production code changes. Read-only.*
