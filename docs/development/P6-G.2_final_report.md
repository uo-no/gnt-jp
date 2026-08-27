# P6-G.2 Final Report — IO Raised Platform Audit

**Date:** 2026-08-25
**Phase:** P6-G.2 — Read-only design audit
**Audited:** Indirect Object raised platform — SR/DR/renderer feasibility
**Constraint:** Read-only. No production code changes. No commit/merge/push/deploy.

---

## Decision

**PASS WITH LIMITATIONS**

---

## Evidence Summary

### NT-Wide Data (CONFIRMED)

| Metric | Value |
|---|---|
| SR IO nodes (NT-wide) | 2,662 |
| DR IO slots (full recursive) | 1,755 (65.9%) |
| SR→DR gap (pre-existing) | 907 (34.1%) |
| IO in DG gate chapters (SR) | 73 (7 chapters) |
| IO + DO (ditransitive) | 66.9% of DR IO |
| IO without DO | 33.1% of DR IO |
| DR connector on IO | null (100%) |
| IO as PREP_PHRASE | 2 (0.1%) |
| IO with modifiers | 52 (3.0%) |

### DR Analysis (CONFIRMED)

- fn=INDIRECT_OBJECT in DR `slots` array — explicit SSOT
- All required data already in DR slot (fn, node, si, modifiers, headSIs, embeddedRelClauses)
- connector=null for IO (100%): no connector logic in dg-engine.js for IO
- dg-engine.js changes: **NOT REQUIRED**

### L-0 Audit (CONFIRMED SAFE)

- fn=INDIRECT_OBJECT is the SR SSOT
- No semantic inference needed
- No syntactic disambiguation needed
- Greek surface word order of other slots (SUBJ, PRED, OBJ) unchanged
- Platform position is structural (elevated above baseline), not semantic

### Implementation (CONFIRMED feasible, index.html only)

- `_dgRenderMainLine`: extract IO from main line; render as platform above (~35 lines)
- `_dgRenderSlotModZone`: exclude IO from mod zone input (~3 lines change at call site)
- CSS: new `.dg-io-wrap`, `.dg-io-platform-area`, `.dg-io-platform`, `.dg-io-stalk` (~18 lines)
- dg-engine.js: NO CHANGES
- Total implementation: ~56 lines

---

## Why PASS

1. **SR signal is unambiguous.** fn=INDIRECT_OBJECT is explicit in SR with 100% confidence.
   No inference, no ambiguity, no disambiguation needed.

2. **DR already contains all necessary data.** The 1,755 IO slots in DR have fn, node,
   si, modifiers, headSIs, embeddedRelClauses — all fields needed for platform rendering.
   Zero new fields required from dg-engine.js.

3. **L-0 compliant.** The raised platform is a structural visual position (IO is elevated
   above baseline). It does not add semantic content. The platform renders what SR already
   classifies; it changes the visual position, not the information.

4. **index.html only.** dg-engine.js requires no changes. Regression surface is narrow:
   only IO slot handling in `_dgRenderMainLine` and mod zone input at call site.

5. **RK/Leedy fidelity is high.** IO platform is one of the 5 fundamental structural
   positions in Reed–Kellogg diagramming. Its absence is the most significant remaining
   structural gap after P6-F (PP diagonal).

---

## Why PASS WITH LIMITATIONS (not PASS)

**Limitation 1: 34.1% SR→DR retention gap (pre-existing)**

907 IO nodes in SR (34.1%) do not appear in any DR slot path. These are caused by
pre-existing DR routing issues in dg-engine.js for certain clause wrapper structures.
This gap predates P6-G.2 and is NOT introduced by the IO platform.

Impact: The platform will benefit 1,755 DR IO slots. The remaining 907 IOs remain
in their current (invisible) state — neither better nor worse than before.

**This is NOT a blocker for the platform.** It is a pre-existing engine limitation
to be addressed separately.

**Limitation 2: Approximate platform position**

The IO stalk (vertical connector) connects the platform to the main line at an
approximate position (horizontally centered or offset, not precisely above the
predicate-object connector). Precise positioning above the `po` connector would
require JavaScript DOM measurement after layout, which adds complexity and
potential mobile brittleness.

Impact: The diagram is RK-consistent in structure (IO elevated, on platform, connected
by stalk) but the stalk attachment point is an approximation, not geometrically exact.
For practical reading purposes, this approximation is acceptable.

**Limitation 3: IO modifier alignment**

52 IO slots (3.0%) have slot-level modifiers. These modifiers are currently rendered
in `_dgRenderSlotModZone` below the main baseline. With IO elevated to the platform,
modifier alignment becomes complex: modifiers logically belong to IO (above) but the
modZone renders below the main line.

Recommended design: IO modifiers rendered inside the platform area (below the IO text,
above the stalk). This requires excluding IO from the modZone call and adding modifier
rendering inside the platform.

**Limitation 4: Multiple IO per clause (rare)**

A small number of clauses have multiple IO instances (10 in `INDIRECT_OBJECT` appearing
twice in fns patterns). Multiple IO platforms would stack vertically above the main line.
Visual design for stacked platforms must be handled carefully.

---

## Rejected: BLOCKED

BLOCKED would apply if:
- SR data were insufficient to identify IO → NOT THE CASE (fn=INDIRECT_OBJECT is explicit)
- dg-engine.js changes were required but prohibited → NOT THE CASE (no engine changes needed)
- L-0 were violated → NOT THE CASE (structural, not semantic)
- Mobile were fundamentally incompatible → NOT THE CASE (platform adds height, manageable)

None of these conditions hold. The platform is architecturally safe.

---

## Implementation Specification (for P6-G-3 phase)

### Source
SR: `node.function.canonical = "INDIRECT_OBJECT"`
DR: `dr.slots[i].fn === 'INDIRECT_OBJECT'`

### Target
Visual position: elevated platform above `dg-main-line`

### Relationship
IO is an argument of the clause (structurally parallel to SUBJECT, PREDICATE, OBJECT)
but displayed on a raised platform per R-K/Leedy convention. The stalk represents the
abstract attachment to the verb/predicate.

### Geometry

```
        [IO text]
        [間接目的語]
        ─────────      ← .dg-io-platform (border-bottom)
             |
             |         ← .dg-io-stalk (width:1.5px, height:1.2rem)
[SUBJ] | [PRED] | [OBJ]
──────────────────────   ← .dg-main-line (border-bottom unchanged)
```

Platform shifted right (padding-left ≈ 4rem) to approximately align stalk with
predicate-object area. No JavaScript measurement.

### Position
Platform: above main line (flex-column parent container)
Stalk: centered under platform, approximately above predicate position
Main line: unchanged (IO removed from flex row)

### Connector
`.dg-io-stalk`: `width: 1.5px; height: 1.2rem; background: var(--text-sub)`
No change to `connectorBetween()` in dg-engine.js.

### Fallback
All IO node types use `headDisplayText(ioSlot.node, ioSlot.headSIs)` — same as
current slot rendering. No special fallback needed.
For IO with null headSIs: `displayText()` used (all tokens as flat text).

### Mobile behavior
- `.dg-io-platform-text`: `font-size: .85rem` at ≤ 480px (via `@media`)
- Platform adds ≈ 2.5rem height per clause with IO
- No horizontal overflow expected (IO text typically 1-3 tokens)

### Prohibited
- dg-engine.js changes
- Greek surface word order modification
- Semantic inference from IO context
- Renderer inference of IO attachment target
- Commit/merge/push/deploy during P6-G-3 audit phase

---

## Documents Created

| Document | Path | Status |
|---|---|---|
| IO Raised Platform Audit | docs/development/P6-G.2_io_raised_platform_audit.md | ✅ |
| IO Relationship Matrix | docs/development/P6-G.2_io_relationship_matrix.md | ✅ |
| Test Matrix | docs/development/P6-G.2_test_matrix.md | ✅ |
| Final Report | docs/development/P6-G.2_final_report.md | ✅ |

---

## Stop Declaration

P6-G.2 is complete.

- ✅ 14 audit items (A–N) examined
- ✅ NT-wide IO data collected (2,662 SR / 1,755 DR)
- ✅ SR→DR pipeline traced
- ✅ Current renderer representation confirmed
- ✅ Platform geometry evaluated (3 options; Option A selected)
- ✅ R-K/Leedy correspondence evaluated
- ✅ L-0 safety confirmed (NONE risk)
- ✅ Mobile 390px assessed (PASS WITH LIMITATIONS)
- ✅ Regression risk mapped (MEDIUM for modZone; LOW for all other)
- ✅ Implementation scope determined (index.html only, ~56 lines)
- ✅ Fallback strategy defined
- ✅ Gate chapter representative examples documented
- ✅ Test matrix written (T-1 through T-12)
- ✅ Final decision issued: **PASS WITH LIMITATIONS**
- ✅ Implementation spec written for P6-G-3
- ✅ No production code changes made
- ✅ No commit / merge / push / deploy

**STOP. Do not begin implementation. Do not auto-progress to P6-G-3.**

---

*P6-G.2 — read-only audit complete.*
