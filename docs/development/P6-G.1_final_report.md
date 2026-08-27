# P6-G.1 Final Report — Visual Grammar Gap Re-Audit

**Date:** 2026-08-25
**Phase:** P6-G.1 NT-wide visual grammar gap re-audit
**Baseline:** P6-F (PP Diagonal) implemented and verified
**Constraint:** Read-only. No production code changes, no commit, no deploy.

---

## Decision

**PASS WITH LIMITATIONS**

---

## Evidence Summary

### What was audited

NT-wide SR dataset: 27 books, 260 chapters, 8,010 sentences, 137,741 tokens.
All `construction.canonical` and `function.canonical` values cross-referenced against
current DG render output. DG gate chapters (7 total) verified individually with SR stats.

### Implemented visual grammar (verified)

| Feature | NT Count | Status |
|---|---|---|
| PP Adverbial Diagonal | 8,912 | ✅ P6-F (extractable 98.2%) |
| Genitive L-bracket | 7,281 | ✅ |
| Relative Clause (purple dashed + antecedent) | ~3,000 | ✅ P6-C |
| Coordination (left border) | 855 | ✅ |
| Participial Clause (italic label) | 543 | ✅ |
| Subordinate Clause (従属節 label) | 3,134 | ✅ |
| Adjective / Adverb modifiers | 5,098 | ✅ |

### Remaining gaps

| Gap | NT Count | Severity | Engine Risk |
|---|---|---|---|
| G-1: IO platform missing | 2,662 | HIGH | None (index.html only) |
| G-2: APPOSITION notation absent | 1,890 | MEDIUM | None (index.html only) |
| G-3: NOMINALIZED_CLAUSE notation absent | 2,008 | MEDIUM | None (index.html only) |
| G-4: CONTENT_CLAUSE fn=OBJ misrouted to adverbial | 736 | HIGH (structural) | Requires dg-engine.js |

### Why PASS WITH LIMITATIONS and not BLOCKED

The system renders correctly for all implemented constructions. Implemented features
(PP diagonal, relative clause, coordination, genitive bracket) are verified and correct.
The 4 remaining gaps reduce RK/Leedy diagram fidelity but do not prevent the system
from functioning — diagrams are readable and structurally consistent within their scope.

Gap G-4 (CONTENT_CLAUSE routing) is a structural DR error, not a renderer display choice.
It misrepresents 736 complement clauses as adverbial. This is the most serious remaining
gap, but the system does not crash or produce invalid output — it produces a less-correct
but consistent display. BLOCKED status would apply if the system could not produce any
valid DG output; that is not the case.

### Why not PASS (full)

- The IO raised platform is a fundamental RK notation element (one of 5 core positions).
  Its absence means ditransitive clauses (2,662 NT-wide) are not RK-conformant.
- CONTENT_CLAUSE fn=OBJECT misrouting (736 instances) is a structural error in the DR.
- These are not aesthetic gaps — they affect the structural accuracy of the diagram.

---

## Next Implementation Candidate

**P6-G-2: INDIRECT_OBJECT Raised Platform**

### Mandate

Implement the Reed–Kellogg / Leedy raised platform notation for `fn=INDIRECT_OBJECT` nodes
in `public/index.html`. index.html only.

### Scope

- **Target:** All `slots` items with `fn === "INDIRECT_OBJECT"` in the DG renderer
- **Visual:** A small raised horizontal platform above the main baseline, connected to
  the predicate-object position by a vertical or slanted connector line
- **SR SSOT:** `function.canonical = "INDIRECT_OBJECT"` — explicit, no inference
- **dg-engine.js:** NO CHANGES PERMITTED
- **L-0:** Compliant — fn is labeled in SR; no disambiguation required
- **Gate coverage:** 73 instances across all 7 DG gate chapters

### Selection rationale (data-driven)

| Factor | G-1 IO Platform | G-2 Apposition | G-3 NomClause |
|---|---|---|---|
| RK structural priority | **Fundamental (core 5)** | Secondary | Tertiary |
| NT-wide count | 2,662 | 1,890 | 2,008 |
| Gate chapter instances | **73** | 70 | 47 |
| SR confidence | **Perfect** | Perfect | Perfect |
| dg-engine.js required | **No** | No | No |
| Priority score | **100%** | 76.9% | 76.9% |

G-1 uniquely scores maximum on all 5 priority criteria simultaneously.

### Constraints for P6-G-2 implementation

- dg-engine.js 変更禁止
- Greek surface word order 不変
- SR=SSOT; renderer inference 禁止
- L-0 維持
- Structure Flow / DA / ICL 変更禁止
- Existing SD fallback 保持
- Mobile 390px 考慮
- commit / merge / push / deploy 禁止
- P6-G-3 (next gap) への自動進行禁止

---

## Stop Declaration

P6-G.1 is complete.

- ✅ `docs/development/P6-G.1_visual_grammar_gap_audit.md` — created
- ✅ `docs/development/P6-G.1_relationship_coverage_matrix.md` — created
- ✅ `docs/development/P6-G.1_priority_matrix.md` — created
- ✅ `docs/development/P6-G.1_final_report.md` — created
- ✅ Verdict issued: **PASS WITH LIMITATIONS**
- ✅ Next candidate identified: **P6-G-2 — INDIRECT_OBJECT Raised Platform**
- ✅ No production code changes made
- ✅ No commit / merge / push / deploy

---

*P6-G.1 — read-only audit complete. STOP.*
