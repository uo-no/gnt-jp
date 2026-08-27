# P6-G.6.1 — APPOSITION Test Matrix

**Date:** 2026-08-25  
**Phase:** P6-G.6.1 — Read-only audit (test requirements for future G-4.4 implementation)  
**Note:** These are implementation-phase test requirements. No implementation has been done.  
**Constraint:** No production code changes. Read-only.

---

## Test Architecture

Tests are defined relative to **Candidate A/E (parallel horizontal segments)** — the recommended implementation architecture.

Test levels:
- **L1** — Static code / SR data audit
- **L2** — Unit test (Node.js engine + renderer output)
- **L3** — Runtime DOM verification
- **L4** — Browser visual verification (gate chapters)
- **L5** — Mobile visual verification (390px)

---

## P1 — Core APPOSITION Rendering

### T-1: APPOSITION Main Line — Head/Appositive Split

**Level:** L3/L4  
**Entry:** APPOSITION fn=SUBJECT slot in DR

| Test | Verse | Expected | Current (pre-fix) | Status |
|------|-------|----------|-------------------|--------|
| T-1a | MAT 2:3 "ὁ βασιλεὺς Ἡρῴδης" (SUBJECT) | `.dg-appos-head` = "ὁ βασιλεύς"; `.dg-appos-appositive` = "Ἡρῴδης" | Flat "ὁ βασιλεὺς Ἡρῴδης" | NOT IMPLEMENTED |
| T-1b | MAT 1:19 "Ἰωσὴφ ὁ ἀνὴρ αὐτῆς" (SUBJECT) | head = "Ἰωσήφ"; appositive = "ὁ ἀνὴρ αὐτῆς" | Flat text | NOT IMPLEMENTED |
| T-1c | MAT 11:? (any SUBJECT APPOSITION in ACT or JHN) | head = children[0] displayText; appositive = children[1] displayText | Flat text | NOT IMPLEMENTED |

### T-2: APPOSITION fn=OBJECT

| Test | Verse | Expected | Status |
|------|-------|----------|--------|
| T-2a | MAT 1:2 "τὸν Δαυὶδ τὸν βασιλέα" (OBJECT) | head = "τὸν Δαυίδ"; appositive = "τὸν βασιλέα" | NOT IMPLEMENTED |
| T-2b | MAT 2:11 "δῶρα, χρυσὸν..." (OBJECT) | head = "δῶρα"; appositive = "χρυσόν... σμύρναν" (COORDINATION) | NOT IMPLEMENTED |

### T-3: APPOSITION fn=COMPLEMENT

| Test | Verse | Expected | Status |
|------|-------|----------|--------|
| T-3a | Any COMPLEMENT APPOSITION in DR | `.dg-appos-wrap` present; head/appositive split | NOT IMPLEMENTED |

### T-4: Dashed Separator Visual

| Test | Description | Expected | Status |
|------|-------------|----------|--------|
| T-4a | `.dg-appos-head` CSS | `border-bottom: 1px dashed` applied | NOT IMPLEMENTED |
| T-4b | `.dg-appos-wrap` CSS | `flex-direction: column` stacking | NOT IMPLEMENTED |

---

## P2 — Visual Grammar Alignment

### T-5: Function Label Preserved

| Test | Expected | Notes |
|------|----------|-------|
| T-5a | `.dg-slot-fn` shows "主語" / "目的語" / "補語" as appropriate | fn label must remain present below appositive |
| T-5b | APPOSITION slot fn label is NOT "同格" | "同格" is a construction, not a function |

### T-6: Head Text Correct (children[0])

| Test | Verse | Expected |
|------|-------|----------|
| T-6a | MAT 2:3 | `.dg-appos-head` textContent = "ὁ βασιλεύς" (not including "Ἡρῴδης") |
| T-6b | MAT 1:18 "τῆς μητρὸς αὐτοῦ Μαρίας" | head = "τῆς μητρὸς αὐτοῦ"; appositive = "Μαρίας" |

### T-7: Appositive Text Correct (children[1])

| Test | Verse | Expected |
|------|-------|----------|
| T-7a | MAT 2:3 | `.dg-appos-appositive` = "Ἡρῴδης" |
| T-7b | MAT 2:11 | `.dg-appos-appositive` = "χρυσόν... σμύρναν" (COORDINATION child displayText) |

### T-8: Non-APPOSITION Slots Unchanged

| Test | Expected | Regression target |
|------|----------|-------------------|
| T-8a | SUBJECT slot without APPOSITION shows flat text | JHN 1:1 "ἐν ἀρχῇ" ADVERBIAL unchanged |
| T-8b | OBJECT slot without APPOSITION shows flat text | MAT 5:3 "οἱ πτωχοί" SUBJECT unchanged |
| T-8c | COMPLEMENT slot (no APPOSITION) unchanged | EPH 2:8 "σεσῳσμένοι" unchanged |
| T-8d | COPULA slot unchanged | JHN 1:1 "ἦν" COPULA unchanged |
| T-8e | AUX slot unchanged | Any AUX slot |

---

## P3 — Gate Chapter Regression

### T-9: JHN 1 — Baseline Verification

| Test | Metric | Expected |
|------|--------|----------|
| T-9a | IO platform count | 18 (unchanged) |
| T-9b | PP diagonal count | 22 (unchanged) |
| T-9c | Relative clause count | 14 (unchanged) |
| T-9d | APPOSITION in DR | ~3; rendered with dg-appos-wrap |
| T-9e | Non-APPOSITION slots | unchanged flat text |
| T-9f | Console errors | 0 |

### T-10: MAT 5 — Baseline Verification

| Test | Metric | Expected |
|------|--------|----------|
| T-10a | IO platform count | 14 (unchanged) |
| T-10b | PP diagonal count | 25 (unchanged) |
| T-10c | APPOSITION in DR | ~1; rendered with dg-appos-wrap |
| T-10d | Content clause count | unchanged |

### T-11: COL 1 — High-APPOSITION Gate Chapter (27 SR instances)

| Test | Metric | Expected |
|------|--------|----------|
| T-11a | APPOSITION in DR | ~7 (est. 24.7% of 27) |
| T-11b | "τῷ θεῷ πατρί" (COL 1:3, OBJECT fn=IO) | IO platform renders; APPOSITION not in main line scope |
| T-11c | Buried APPOSITION ("Παῦλος ἀπόστολος") | Still flat text (not in DR; correct fallback) |
| T-11d | No regression in IO platform | IO count unchanged |
| T-11e | Console errors | 0 |

### T-12: EPH 2 — Secondary Gate Chapter (14 SR instances)

| Test | Metric | Expected |
|------|--------|----------|
| T-12a | APPOSITION in DR | ~4 |
| T-12b | EPH 2:8 G-4.3 content clause regression | CC sub-diagram unchanged |
| T-12c | EPH 2:8 IO platform | IO platform unchanged |

---

## P4 — Nested and Edge Cases

### T-13: Nested APPOSITION (Pattern I)

| Test | Description | Expected |
|------|-------------|----------|
| T-13a | Outer APPOSITION in DR slot | `.dg-appos-head` = displayText(children[0]) — which may itself be APPOSITION text (flat) |
| T-13b | Inner APPOSITION not extracted | Inner nesting rendered as part of head flat text — correct fallback |
| T-13c | No infinite recursion | DOM renders successfully; no JS error |

**Rationale:** When `children[0]` is itself an APPOSITION node, `displayText(children[0])` returns all tokens as flat text. The renderer does not recursively apply APPOSITION styling to `children[0]`. This is the correct scope limit for G-4.4.

### T-14: Long Appositive Text

| Test | Description | Expected |
|------|-------------|----------|
| T-14a | Appositive text > 40 chars (e.g., MAT 1:2 compound appositive) | Text wraps within slot; no horizontal overflow |
| T-14b | Desktop 1280px | No slot width exceeds viewport |
| T-14c | Mobile 390px | Slot wraps; main line scrolls horizontally if needed (existing behavior) |

### T-15: APPOSITION + PP Modifier (Co-occurrence)

| Test | Description | Expected |
|------|-------------|----------|
| T-15a | APPOSITION slot that also has a PP in the modifier zone | Both `.dg-appos-wrap` (APPOSITION) and `.dg-adv-item` (modifier) render correctly |
| T-15b | Modifier zone below APPOSITION slot | Vertical stack: [appos-wrap] + [fn label] then [mod zone below] |

### T-16: APPOSITION fn=IO — Out of Scope

| Test | Description | Expected |
|------|-------------|----------|
| T-16a | APPOSITION fn=IO (COL 1:3 "τῷ θεῷ πατρί") | IO platform renders flat text (unchanged); no dg-appos-wrap |
| T-16b | IO platform structure preserved | IO stalk, platform, fn label all present |

### T-17: Buried APPOSITION — Unchanged Fallback

| Test | Description | Expected |
|------|-------------|----------|
| T-17a | MAT 1:1 "Ἰησοῦ Χριστοῦ υἱοῦ Δαυίδ" (buried in GENITIVE_MOD) | Rendered as flat text in GENITIVE_MOD context; NO dg-appos-wrap |
| T-17b | COL 1:1 "Παῦλος ἀπόστολος" (fn=null, buried) | Not in DR; not rendered as slot at all |

---

## P5 — Regression Baseline Preservation

### T-18: PP Diagonal Unchanged

| Test | Expected |
|------|----------|
| T-18a | JHN 1 PP count = 22 | PASS |
| T-18b | MAT 5 PP count = 25 | PASS |

### T-19: IO Platform Unchanged

| Test | Expected |
|------|----------|
| T-19a | JHN 1 IO count = 18 | PASS |
| T-19b | MAT 5 IO count = 14 | PASS |

### T-20: Content Clause Unchanged

| Test | Expected |
|------|----------|
| T-20a | G-4.3 CC sub-diagrams still render | PASS |
| T-20b | CC conjunction labels present | PASS |

### T-21: Relative Clause Unchanged

| Test | Expected |
|------|----------|
| T-21a | JHN 1 REL count = 14 | PASS |

### T-22: Console Errors

| Test | Expected |
|------|----------|
| T-22a | All gate chapters: 0 console errors | PASS |

---

## Mobile Requirements (390px)

| Test | Description | Expected |
|------|-------------|----------|
| M-1 | JHN 1 APPOSITION on 390px | dg-appos-wrap fits within slot; no horizontal overflow |
| M-2 | Short apposition ("Ἡρῴδης") on 390px | Renders in single line; no overflow |
| M-3 | Medium apposition ("ὁ ἀνὴρ αὐτῆς") | Text wraps if needed; slot height adjusts |
| M-4 | Adjacent slots on main line | Connector lines remain aligned with taller APPOSITION slots |
| M-5 | Scroll behavior | Existing horizontal scroll for long main lines preserved |

---

## Connector Alignment Test Requirements

| Test | Description | Expected |
|------|-------------|----------|
| CA-1 | SUBJECT(APPOSITION) | PREDICATE: `dg-conn dg-conn-sp` between them | Connector height adapts to taller slot |
| CA-2 | SUBJECT(APPOSITION) | COPULA | COMPLEMENT: full connector chain | Connector alignment maintained |
| CA-3 | PREDICATE | OBJECT(APPOSITION) : `dg-conn dg-conn-po` | Connector visible; not clipped |
| CA-4 | Verbless clause: SUBJECT(APPOSITION) | COMPLEMENT dashed diagonal | Implied diagonal present |

---

## Test Priority Summary

| Priority | Tests | Focus |
|----------|-------|-------|
| P1 (MUST PASS) | T-1a, T-1b, T-2a, T-4a, T-5a, T-6a, T-7a | Core APPOSITION rendering |
| P2 (MUST PASS) | T-8a–e, T-9a–f, T-10a–d, T-11a–e | Gate chapter regression |
| P3 (MUST PASS) | T-13a–c, T-16a–b, T-17a–b, T-22a | Edge cases and fallbacks |
| P4 (SHOULD PASS) | T-14a–c, T-15a–b, CA-1–4 | Mobile and connector alignment |
| P5 (MONITOR) | T-12a, T-18–21 | Secondary regression baseline |

---

## NOT IN SCOPE for G-4.4

| Item | Reason |
|------|--------|
| APPOSITION fn=IO visual treatment | IO platform path — separate renderer scope |
| Nested APPOSITION inner levels | SR-structural; head text subsumes inner nesting (correct) |
| Buried APPOSITION (74.3%) | SR-structural limit; requires engine or SR change |
| APPOSITION in adverbial phrases | Adv phrase renderer — separate scope |
| "Multiple appositive" (H=0 in NT) | Not observed in NT; no implementation needed |

---

*P6-G.6.1 — read-only test matrix. No production code changes.*
