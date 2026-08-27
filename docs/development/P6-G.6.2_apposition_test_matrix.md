# P6-G.6.2 — APPOSITION Test Matrix (Implementation Phase)

**Date:** 2026-08-25  
**Phase:** P6-G.6.2 — Repair Design (read-only)  
**Scope:** Test criteria for P6-G.6.3 implementation verification  
**Constraint:** No production code changes. Test design only.

---

## Test Architecture

| Priority | Level | Description |
|----------|-------|-------------|
| P1 | MUST PASS | Core APPOSITION rendering |
| P2 | MUST PASS | Gate chapter regression |
| P3 | MUST PASS | Fallback and edge cases |
| P4 | SHOULD PASS | Mobile and connector alignment |
| P5 | MONITOR | Secondary regression baseline |

Verification methods:
- **DOM** — `document.querySelector` / `querySelectorAll` in browser console
- **Visual** — screenshot comparison with design spec (Section 3 of repair design)
- **Static** — `grep` on modified files
- **Baseline** — pre/post metric comparison

---

## P1 — Core APPOSITION Rendering (MUST PASS)

### T-1: Basic APPOSITION Structure

**Verse:** MAT 1:19 "Ἰωσὴφ ὁ ἀνὴρ αὐτῆς" (fn=SUBJECT)

| Test ID | Check | Expected | Method |
|---------|-------|----------|--------|
| T-1a | `.dg-appos-wrap` exists | ≥1 element | DOM |
| T-1b | `.dg-appos-head` textContent | "Ἰωσήφ" (head NP only) | DOM |
| T-1c | `.dg-appos-appositive` textContent | "ὁ ἀνὴρ αὐτῆς" | DOM |
| T-1d | `.dg-slot-fn` textContent | "主語" | DOM |
| T-1e | `.dg-slot-text` absent in APPOSITION slot | 0 `.dg-slot-text` inside `.dg-appos-wrap`'s parent slot | DOM |
| T-1f | Dashed line visible | `.dg-appos-head` has `border-bottom` with `dashed` | Visual / CSS computed |

### T-2: APPOSITION fn=OBJECT

**Verse:** MAT 2:11 "δῶρα, χρυσὸν καὶ λίβανον καὶ σμύρναν" (fn=OBJECT)

| Test ID | Check | Expected | Method |
|---------|-------|----------|--------|
| T-2a | `.dg-appos-head` | "δῶρα," or similar head token | DOM |
| T-2b | `.dg-appos-appositive` | "χρυσὸν καὶ λίβανον καὶ σμύρναν" or similar | DOM |
| T-2c | `.dg-slot-fn` | "目的語" | DOM |

### T-3: APPOSITION fn=OBJECT — Articular NP

**Verse:** MAT 1:2 "τὸν Δαυὶδ τὸν βασιλέα" (fn=OBJECT)

| Test ID | Check | Expected | Method |
|---------|-------|----------|--------|
| T-3a | `.dg-appos-head` | "τὸν Δαυίδ" | DOM |
| T-3b | `.dg-appos-appositive` | "τὸν βασιλέα" | DOM |

### T-4: APPOSITION fn=SUBJECT — Proper Noun with Title

**Verse:** MAT 2:3 "ὁ βασιλεὺς Ἡρῴδης" (fn=SUBJECT)

| Test ID | Check | Expected | Method |
|---------|-------|----------|--------|
| T-4a | `.dg-appos-head` | "ὁ βασιλεύς" | DOM |
| T-4b | `.dg-appos-appositive` | "Ἡρῴδης" | DOM |

### T-5: CSS Properties

| Test ID | Check | Expected | Method |
|---------|-------|----------|--------|
| T-5a | `.dg-appos-wrap` flex-direction | "column" | CSS computed |
| T-5b | `.dg-appos-wrap` align-items | "stretch" | CSS computed |
| T-5c | `.dg-appos-head` border-bottom | contains "dashed" | CSS computed |
| T-5d | `.dg-appos-appositive` font-size | < 1rem (e.g. 0.92rem = ~14.7px) | CSS computed |
| T-5e | `.dg-appos-head` font-size | 1rem = 16px (desktop) | CSS computed |

### T-6: Static Code Verification

| Test ID | Check | Expected | Method |
|---------|-------|----------|--------|
| T-6a | `_dgRenderAppositionSlot` definition exists | grep returns 1 result (definition) | Static |
| T-6b | `_dgRenderAppositionSlot` call exists | grep returns 1 result (call in _dgRenderMainLine) | Static |
| T-6c | `.dg-appos-wrap` CSS rule | grep returns ≥1 CSS rule | Static |
| T-6d | No dg-engine.js change | `git diff public/core/dg-engine.js` is empty | Static |

---

## P2 — Gate Chapter Regression (MUST PASS)

### T-7: JHN 1 — Full Gate Baseline

| Test ID | Metric | Pre-fix baseline | Expected post-fix | Method |
|---------|--------|-----------------|-------------------|--------|
| T-7a | IO platform count | 18 | 18 | DOM count `.dg-io-platform` |
| T-7b | PP diagonal count | 22 | 22 | DOM count `.dg-pp-wrap` |
| T-7c | Relative clause count | 14 | 14 | DOM count `.dg-rel-clause` |
| T-7d | CC sub-diagrams | known | unchanged | DOM count `.dg-cc-clause-attach` |
| T-7e | APPOSITION slots | 0 (pre-fix) | ~3 `.dg-appos-wrap` | DOM count |
| T-7f | Console errors | 0 | 0 | Browser console |

### T-8: MAT 5 — Secondary Gate Baseline

| Test ID | Metric | Pre-fix baseline | Expected post-fix | Method |
|---------|--------|-----------------|-------------------|--------|
| T-8a | IO platform count | 14 | 14 | DOM count |
| T-8b | PP diagonal count | 25 | 25 | DOM count |
| T-8c | APPOSITION slots | 0 (pre-fix) | ~1 | DOM count |
| T-8d | Console errors | 0 | 0 | Browser console |

### T-9: COL 1 — High-APPOSITION Gate Chapter (27 SR)

| Test ID | Metric | Expected | Method |
|---------|--------|----------|--------|
| T-9a | `.dg-appos-wrap` count | ≥4 (est. ~7 DR-reachable) | DOM count |
| T-9b | COL 1:3 "τῷ θεῷ πατρί" (fn=IO) | IO platform renders flat text; NO `.dg-appos-wrap` in IO area | DOM |
| T-9c | Buried APPOSITION (e.g., COL 1:1 "Παῦλος ἀπόστολος") | NOT in DR; NOT rendered as `.dg-appos-wrap` | DOM (expect 0 in that sentence) |
| T-9d | IO platform count | 5 (gate baseline) | DOM count |
| T-9e | Console errors | 0 | Browser console |

### T-10: EPH 2 — CC + APPOSITION Co-occurrence

| Test ID | Metric | Expected | Method |
|---------|--------|----------|--------|
| T-10a | `.dg-appos-wrap` count | ≥2 (est. ~4 DR) | DOM count |
| T-10b | EPH 2:8 CC sub-diagram (G-4.3 regression) | `.dg-cc-clause-attach` present; CC slot shows conjunction | DOM |
| T-10c | EPH 2:8 IO platform | Present; count unchanged | DOM |
| T-10d | Console errors | 0 | Browser console |

### T-11: PHP 2 — APPOSITION + Modifiers

| Test ID | Metric | Expected | Method |
|---------|--------|----------|--------|
| T-11a | `.dg-appos-wrap` count | ≥1 (est. ~2) | DOM count |
| T-11b | Modifier zone below APPOSITION slot | `.dg-slot-mod-zone` renders if slot has extracted modifiers | DOM (verify not broken) |
| T-11c | Console errors | 0 | Browser console |

---

## P3 — Fallback and Edge Cases (MUST PASS)

### T-12: Non-APPOSITION Slots Unchanged

| Test ID | Verse | Check | Expected | Method |
|---------|-------|-------|----------|--------|
| T-12a | JHN 1:1 | Non-APPOSITION SUBJECT slot | `.dg-slot-text` present; NO `.dg-appos-wrap` | DOM |
| T-12b | MAT 5:3 | "οἱ πτωχοί" (SUBJECT) | `.dg-slot-text` present (not APPOSITION) | DOM |
| T-12c | JHN 1:1 | COPULA "ἦν" slot | `.dg-slot-text` present; no fn label (COPULA suppressed) | DOM |
| T-12d | Any sentence | PREDICATE slot without APPOSITION | `.dg-slot-text` present | DOM |

### T-13: Nested APPOSITION — Depth-1 Rule

**Pattern I (206 NT cases). Test with any nested APPOSITION in DR:**

| Test ID | Check | Expected | Method |
|---------|-------|----------|--------|
| T-13a | Outer APPOSITION renders with parallel segments | `.dg-appos-wrap` present | DOM |
| T-13b | Head text is flat (children[0] displayText, even if inner APPOSITION) | `.dg-appos-head` shows combined head tokens | DOM |
| T-13c | No inner `.dg-appos-wrap` inside `.dg-appos-head` or `.dg-appos-appositive` | `querySelectorAll('.dg-appos-wrap .dg-appos-wrap')` = 0 | DOM |
| T-13d | No JS error / infinite recursion | Console errors = 0 | Browser console |

### T-14: APPOSITION fn=IO — Excluded

**COL 1:3 "τῷ θεῷ πατρί" (fn=INDIRECT_OBJECT, cn=APPOSITION):**

| Test ID | Check | Expected | Method |
|---------|-------|----------|--------|
| T-14a | IO platform present | `.dg-io-platform` present | DOM |
| T-14b | IO platform text is flat | `.dg-io-platform-text` = "τῷ θεῷ πατρί..." (concatenated) | DOM |
| T-14c | NO `.dg-appos-wrap` inside `.dg-io-platform` | 0 elements | DOM |

### T-15: Buried APPOSITION — Fallback Unchanged

| Test ID | Verse | Check | Expected | Method |
|---------|-------|-------|----------|--------|
| T-15a | MAT 1:1 | "Ἰησοῦ Χριστοῦ" (buried in GENITIVE_MOD) | Not in DR; slot shows parent displayText (no `.dg-appos-wrap`) | DOM |
| T-15b | COL 1:1 | "Παῦλος ἀπόστολος" (fn=null, buried) | Sentence renders; no `.dg-appos-wrap` for this APPOSITION | DOM |

### T-16: Single-Child APPOSITION Guard (Degenerate)

*No NT instances observed. This tests the `children[1] || null` guard:*

| Test ID | Check | Expected | Method |
|---------|-------|----------|--------|
| T-16a | If APPOSITION with only 1 child (hypothetical) | `.dg-appos-head` renders; no `.dg-appos-appositive` | Code review |

---

## P4 — Mobile and Connector Alignment (SHOULD PASS)

### T-17: Mobile 390px — Short Apposition

**JHN 1 at 390px:**

| Test ID | Check | Expected | Method |
|---------|-------|----------|--------|
| T-17a | `.dg-appos-wrap` renders at 390px | Visible; no clipping | Visual (DevTools 390px) |
| T-17b | `.dg-appos-head` font-size | 0.9rem (mobile override) | CSS computed at 390px |
| T-17c | `.dg-appos-appositive` font-size | 0.82rem | CSS computed at 390px |
| T-17d | Main line horizontal scroll | Activates only if total slot width > 390px | Visual |

### T-18: Mobile 390px — Long Apposition

**Use any sentence with appositive > 40 characters:**

| Test ID | Check | Expected | Method |
|---------|-------|----------|--------|
| T-18a | No text clipping inside `.dg-appos-appositive` | Full text visible (scroll if needed) | Visual |
| T-18b | No horizontal overflow on body | `document.body.scrollWidth === window.innerWidth` OR scroll expected | DOM |

### T-19: Connector Alignment — SUBJECT APPOSITION with PREDICATE

**Any sentence: SUBJECT(APPOSITION) | PREDICATE:**

| Test ID | Check | Expected | Method |
|---------|-------|----------|--------|
| T-19a | `.dg-conn-sp` (sp connector) visible | Present between slots | DOM |
| T-19b | SP connector height | Spans from top of APPOSITION slot to baseline | Visual |
| T-19c | No connector clipping | SP connector not clipped by taller APPOSITION slot | Visual |

### T-20: Connector Alignment — PREDICATE | OBJECT(APPOSITION)

**Any sentence: PREDICATE | OBJECT(APPOSITION):**

| Test ID | Check | Expected | Method |
|---------|-------|----------|--------|
| T-20a | `.dg-conn-po` visible | Present | DOM |
| T-20b | PO connector bottom-anchored | Aligns with main baseline; visible | Visual |

---

## P5 — Secondary Regression Baseline (MONITOR)

### T-21: PP Diagonal Unchanged

| Chapter | Baseline PP count | Expected post-fix | Method |
|---------|------------------|-------------------|--------|
| JHN 1 | 22 | 22 | DOM `.dg-pp-wrap` count |
| MAT 5 | 25 | 25 | DOM `.dg-pp-wrap` count |

### T-22: Content Clause Sub-diagram Unchanged (G-4.3 Regression)

| Test | Check | Expected | Method |
|------|-------|----------|--------|
| T-22a | Any CC slot (e.g., EPH 2:8) | `.dg-cc-clause-attach` present; conjunction label present | DOM |
| T-22b | CC sub-diagram renders | Inner clause slots rendered inside `.dg-cc-clause` | DOM |

### T-23: Relative Clause Unchanged (P6-C Regression)

| Test | Baseline | Expected | Method |
|------|----------|----------|--------|
| T-23a | JHN 1 REL count = 14 | 14 | DOM `.dg-rel-clause` count |

### T-24: Coordination Unchanged

| Test | Check | Expected | Method |
|------|-------|----------|--------|
| T-24a | Any CONJOINED_CLAUSE sentence | `.dg-coord-wrap` present; clauses visible | DOM |

### T-25: Console Errors — All Gate Chapters

| Test | Check | Expected |
|------|-------|----------|
| T-25a | JHN 1, MAT 5, MAT 28, EPH 2, PHP 2, COL 1, ROM 6 | 0 console errors each |

---

## Pre-Implementation Baseline Checklist

Before starting G-4.4 implementation, record:

```
JHN 1:
  IO platform count:     [  ] (expected: 18)
  PP diagonal count:     [  ] (expected: 22)
  REL clause count:      [  ] (expected: 14)
  .dg-appos-wrap count:  [  ] (expected: 0)
  Console errors:        [  ] (expected: 0)

MAT 5:
  IO platform count:     [  ] (expected: 14)
  PP diagonal count:     [  ] (expected: 25)
  .dg-appos-wrap count:  [  ] (expected: 0)
  Console errors:        [  ] (expected: 0)

COL 1:
  IO platform count:     [  ] (expected: 5)
  .dg-appos-wrap count:  [  ] (expected: 0)
  Console errors:        [  ] (expected: 0)
```

---

## Post-Implementation PASS Criteria

| Criterion | Test IDs | Required |
|-----------|----------|----------|
| Core APPOSITION rendering | T-1 through T-5 | ALL PASS |
| Static verification | T-6 | ALL PASS |
| Gate chapter regression | T-7 through T-11 | ALL PASS |
| Fallback / edge cases | T-12 through T-15 | ALL PASS |
| No console errors | T-7f, T-8d, T-9e, T-10d, T-11c, T-25a | ALL PASS (0 errors) |
| Mobile (optional) | T-17 through T-20 | SHOULD PASS |
| Secondary regression | T-21 through T-24 | MONITOR |

**BLOCKING failures:** Any P1 or P2 test failure blocks PASS decision.  
**Non-blocking:** P4/P5 failures are noted but do not block if root cause is known and limited.

---

*P6-G.6.2 test matrix. No production code changes.*
