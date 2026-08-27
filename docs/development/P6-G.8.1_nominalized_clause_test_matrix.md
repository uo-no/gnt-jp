# P6-G.8.1 — NOMINALIZED_CLAUSE Test Matrix

**Date:** 2026-08-26  
**Phase:** P6-G.8.1 — Read-only Audit  
**Purpose:** Gate chapter test cases and DOM requirements for P6-G.8.3 implementation

---

## 1. Gate Chapter NOMINALIZED_CLAUSE in DR — Summary

| Gate Chapter | DR count | DR fn | Verses |
|-------------|---------|-------|--------|
| JHN 1 | 0 | — | None in DR (all buried) |
| MAT 5 | 3 | SUBJECT ×3 | 5:4, 5:6, 5:10 |
| MAT 28 | 0 | — | None in DR |
| EPH 2 | 0 | — | None in DR |
| PHP 2 | 1 | COMPLEMENT | 2:13 |
| COL 1 | 0 | — | None in DR |
| ROM 6 | 1 | SUBJECT | 6:7 |
| **Total** | **5** | | |

---

## 2. Primary Test Cases — Gate DR Instances

### TC-1: MAT 5:4 — Substantive Participle as Subject

| Property | Value |
|----------|-------|
| Ref | MAT 5:4 |
| URL | `?book=MAT&ch=5&transA=STRUCTURAL` |
| fn | SUBJECT |
| displayText | `οἱ πενθοῦντες,` |
| Sub-type | I (article ὁ + participle) |
| children[0] | token `οἱ` |
| children[1] | token `πενθοῦντες,` |
| Expected bracket | `[οἱ πενθοῦντες,]` |

**DOM requirements (post-implementation):**
```
.dg-nomc-wrap present:          YES — slot has cn=NOMINALIZED_CLAUSE
slot text content:               [οἱ πενθοῦντες,]  (with brackets)
slot fn label:                   主語
.dg-main-line-slot baseline:    Unchanged (aligned to baseline)
console errors:                  0
```

---

### TC-2: MAT 5:6 — Compound Participial Clause as Subject

| Property | Value |
|----------|-------|
| Ref | MAT 5:6 |
| URL | `?book=MAT&ch=5&transA=STRUCTURAL` |
| fn | SUBJECT |
| displayText | `οἱ πεινῶντες καὶ διψῶντες τὴν δικαιοσύνην,` |
| Sub-type | I (article + compound participial clause) |
| children[0] | token `οἱ` |
| children[1] | clause (participial with coordination) |

**DOM requirements:**
```
.dg-nomc-wrap present:          YES
Text:                            [οἱ πεινῶντες καὶ διψῶντες τὴν δικαιοσύνην,]
Width constraint:                white-space:nowrap (or allow wrap for long text — TBD in design)
Baseline alignment:              Unchanged
```

---

### TC-3: MAT 5:10 — Substantive Participle (Perfect Passive) as Subject

| Property | Value |
|----------|-------|
| Ref | MAT 5:10 |
| URL | `?book=MAT&ch=5&transA=STRUCTURAL` |
| fn | SUBJECT |
| displayText | `οἱ δεδιωγμένοι ἕνεκεν δικαιοσύνης,` |
| Sub-type | I (article + perfect passive participle + genitive phrase) |

**DOM requirements:** Same structure as TC-1 and TC-2.

---

### TC-4: PHP 2:13 — Substantive Participle as Complement

| Property | Value |
|----------|-------|
| Ref | PHP 2:13 |
| URL | `?book=PHP&ch=2&transA=STRUCTURAL` |
| fn | COMPLEMENT |
| displayText | `ὁ ἐνεργῶν ἐν ὑμῖν καὶ τὸ θέλειν καὶ τὸ ἐνεργεῖν ὑπὲρ τῆς εὐδοκίας.` |
| Sub-type | I (article + participial clause, with coordinate articular infinitives) |

**DOM requirements:**
```
.dg-nomc-wrap present:                          YES
fn label:                                        述語 (COMPLEMENT)
Text bracket:                                    [ὁ ἐνεργῶν ...]
Long text handling:                              Verify no layout overflow
```

---

### TC-5: ROM 6:7 — Short Substantive Participle as Subject

| Property | Value |
|----------|-------|
| Ref | ROM 6:7 |
| URL | `?book=ROM&ch=6&transA=STRUCTURAL` |
| fn | SUBJECT |
| displayText | `ὁ ἀποθανὼν` |
| Sub-type | I (article + single participle token) |

**DOM requirements:**
```
.dg-nomc-wrap present:          YES
Text:                            [ὁ ἀποθανὼν]
Minimal/short text:             Brackets should not feel oversized
```

---

## 3. Regression Test Cases

The following existing gate chapter features must remain unchanged after implementation.

### RT-1: CONTENT_CLAUSE (MAT 5 or EPH 2) — Sub-diagram unchanged

| Check | Expected |
|-------|---------|
| `.dg-cc-clause` present | YES |
| Sub-diagram renders | YES |
| CONTENT_CLAUSE branch taken (not NOMINALIZED_CLAUSE branch) | YES |
| console errors | 0 |

MAT 5 has CONTENT_CLAUSE instances that must not be affected.

### RT-2: APPOSITION (EPH 2:14 or JHN 1:40) — Parallel segments unchanged

| Check | Expected |
|-------|---------|
| `.dg-appos-wrap` present | YES |
| `.dg-appos-head` + `.dg-appos-appositive` | YES |
| `border-bottom: dashed` on head | YES |
| APPOSITION branch taken (not NOMINALIZED_CLAUSE branch) | YES |

### RT-3: IO Platform (JHN 1, PHP 2) — Raised platform unchanged

| Check | Expected |
|-------|---------|
| IO slot renders on raised platform | YES |
| PP diagonal unchanged | YES |

JHN 1 has no NOMINALIZED_CLAUSE in DR, so this is a pure regression check: the absence of NOMINALIZED_CLAUSE should not affect existing IO / PP rendering.

### RT-4: Regular NP slots (any gate chapter) — No bracket on NP

| Check | Expected |
|-------|---------|
| Regular noun/NP SUBJECT slot | NO `.dg-nomc-wrap` |
| Regular OBJECT slot | NO `.dg-nomc-wrap` |
| Bracket ONLY on cn=NOMINALIZED_CLAUSE | YES |

---

## 4. Mobile Test Cases (390px viewport)

### MT-1: MAT 5:4 at 390px

| Check | Expected |
|-------|---------|
| Bracket visible | YES |
| Text wraps cleanly if overflow | Acceptable |
| Font size (NOMINALIZED_CLAUSE slot text) | ≥ 0.85rem (≥ 13.6px) |
| Brackets not clipped | YES |
| Baseline alignment on mobile | Preserved |

---

## 5. Non-Gate Chapter Verification

NOMINALIZED_CLAUSE visual change applies only within gate chapters (where DG renderer is active). Non-gate chapters (MAT 1, MAT 2, etc.) are not affected — `_isDGChapter` guard prevents renderer activation.

| Check | Expected |
|-------|---------|
| `?book=MAT&ch=1&transA=STRUCTURAL` renders DG | NO (not a gate chapter) |
| Bracket CSS class loaded regardless | YES (CSS is global) |
| No JS error on non-gate chapter | YES |

---

## 6. DOM Query Reference (for TC-1 MAT 5:4)

These queries define what the DOM must look like after implementation. Used in P6-G.8.3 browser verification.

```javascript
// Must exist
document.querySelectorAll('.dg-nomc-wrap').length                        // expect ≥ 1 (gate has 3 in MAT 5)

// Text must include brackets
document.querySelector('.dg-nomc-wrap').textContent                      // expect "[οἱ πενθοῦντες,]" (or similar)

// Must NOT exist on regular NP slots
// (check a known-NP slot in the same chapter)

// No console errors
// → Verify console.errors === 0 during MAT 5 render
```

---

## 7. Articular Infinitive Test Case (Non-gate — NT-wide validation)

Since gate chapters have 0 articular infinitive (Sub-type II) instances in DR, Sub-type II validation requires a non-gate chapter test.

**Recommended non-gate test:** Use a script to identify the first NT articular infinitive NOMINALIZED_CLAUSE in DR and navigate to its chapter.

Script hint:
```javascript
// In DR audit script: find first Sub-type II (firstChild token starting with τό/τοῦ/τῷ)
// as fn=SUBJECT or fn=OBJECT
```

This validation is NOT required for gate chapter regression, but should be documented in P6-G.8.3 final report as a secondary check.

---

## 8. Sentence-Level Context

### MAT 5 Beatitudes Structure (TC-1, TC-2, TC-3)

```
Sentence:    μακάριοι οἱ πτωχοὶ τῷ πνεύματι
             μακάριοι οἱ πενθοῦντες
             μακάριοι οἱ πεινῶντες καὶ διψῶντες τὴν δικαιοσύνην
             μακάριοι οἱ δεδιωγμένοι ἕνεκεν δικαιοσύνης

SUBJECT:     NOMINALIZED_CLAUSE (substantive participle — the mourning ones)
PREDICATE:   COPULA omitted (nominal sentence)
COMPLEMENT:  μακάριοι (blessed)
```

In DR: SUBJECT slot = NOMINALIZED_CLAUSE node with flat displayText.  
Target: SUBJECT slot = `[οἱ πενθοῦντες,]` — bracket signals clause-as-noun.

---

*P6-G.8.1 test matrix. No production code changes. Read-only.*
