# P6-G.8.2 — NOMINALIZED_CLAUSE Test Matrix

**Date:** 2026-08-26  
**Phase:** P6-G.8.2 — Design  
**Purpose:** Full test matrix T-1 through T-15 for P6-G.8.3 implementation verification

---

## Test Matrix Overview

| ID | Category | Description | Chapter | Required |
|----|----------|-------------|---------|---------|
| T-1 | Sub-type | Substantive participle — short | ROM 6 | PASS |
| T-2 | Sub-type | Substantive participle — long | MAT 5 | PASS |
| T-3 | fn | fn=SUBJECT | MAT 5 / ROM 6 | PASS |
| T-4 | fn | fn=OBJECT | NT-wide (non-gate script) | PASS |
| T-5 | fn | fn=COMPLEMENT | PHP 2 | PASS |
| T-6 | Modifier | NOMINALIZED_CLAUSE + word-level modifier | NT-wide script | PASS |
| T-7 | PP | NOMINALIZED_CLAUSE + PP in same clause | NT-wide script | PASS |
| T-8 | APPOSITION | APPOSITION slot — must NOT have bracket | EPH 2 / JHN 1 | PASS |
| T-9 | Regression | CONTENT_CLAUSE sub-diagram unchanged | MAT 5 / EPH 2 | PASS |
| T-10 | Regression | IO platform unchanged | JHN 1 / PHP 2 | PASS |
| T-11 | Regression | PP diagonal unchanged | JHN 1 / MAT 5 | PASS |
| T-12 | Mobile | 390px viewport — bracket visible, font size | MAT 5 | PASS |
| T-13 | Integrity | textContent = Greek only (no brackets) | MAT 5 | PASS |
| T-14 | Errors | Console errors = 0 | All gate chapters | PASS |
| T-15 | Fallback | SD (Structure Flow) fallback unchanged | JHN 1 non-DG | PASS |

---

## T-1: Substantive Participle — Short (Sub-type I)

**Chapter:** ROM 6 (`?book=ROM&ch=6&transA=STRUCTURAL`)  
**Verse:** ROM 6:7  
**fn:** SUBJECT  
**displayText:** `ὁ ἀποθανὼν`

| Check | Expected | Pass Condition |
|-------|---------|----------------|
| `.dg-nomc` exists at ROM 6:7 SUBJECT slot | YES | `querySelectorAll('.dg-nomc').length ≥ 1` |
| textContent of `.dg-nomc` | `ὁ ἀποθανὼν` | Exact match (no `[`, `]`) |
| Visual bracket before text | `[` visible | CSS ::before renders |
| Visual bracket after text | `]` visible | CSS ::after renders |
| Bracket color | var(--text-sub) | Computed color ≠ var(--text-main) |
| Font-size | 1rem (16px) | getComputedStyle |
| fn label below | 主語 | `.dg-slot-fn` textContent |

---

## T-2: Substantive Participle — Long (Sub-type I)

**Chapter:** MAT 5 (`?book=MAT&ch=5&transA=STRUCTURAL`)  
**Verse:** MAT 5:6  
**fn:** SUBJECT  
**displayText:** `οἱ πεινῶντες καὶ διψῶντες τὴν δικαιοσύνην,`

| Check | Expected | Pass Condition |
|-------|---------|----------------|
| `.dg-nomc` at MAT 5:6 SUBJECT slot | YES | |
| textContent | `οἱ πεινῶντες καὶ διψῶντες τὴν δικαιοσύνην,` | No brackets |
| `white-space: nowrap` | YES | Element does not line-break |
| Slot width | Auto-expands to contain text | No overflow clipping |
| `.dg-main-line` scrolls if needed | YES | overflow-x: auto on parent |
| Three `.dg-nomc` in MAT 5 total | YES | `querySelectorAll('.dg-nomc').length === 3` |

---

## T-3: fn=SUBJECT

**Covered by:** T-1 (ROM 6:7), T-2 (MAT 5:6), also MAT 5:4 and MAT 5:10.

| Check | Expected |
|-------|---------|
| SUBJECT slot → `.dg-nomc` | YES |
| fn label below bracket | 主語 |
| sp connector still present | YES |

---

## T-4: fn=OBJECT (non-gate validation)

**Context:** Gate chapters have 0 fn=OBJECT NOMINALIZED_CLAUSE in DR. Validation requires a non-gate chapter.

**Script to find test verse:**
```javascript
// Run in DR audit script:
// Find first NOMINALIZED_CLAUSE with fn=OBJECT in DR, any book
// Record ref, chapter URL
```

| Check | Expected |
|-------|---------|
| OBJECT slot → `.dg-nomc` | YES |
| fn label below bracket | 目的語 |
| po connector still present | YES |
| textContent = Greek text | YES (no brackets) |

**Note:** This test requires script identification of a non-gate verse. Run as secondary validation in P6-G.8.3. If non-gate chapters are not loaded in browser (non-gate chapters don't activate DG renderer), this test is N/A for browser and is validated via node script only.

---

## T-5: fn=COMPLEMENT

**Chapter:** PHP 2 (`?book=PHP&ch=2&transA=STRUCTURAL`)  
**Verse:** PHP 2:13  
**fn:** COMPLEMENT  
**displayText:** `ὁ ἐνεργῶν ἐν ὑμῖν καὶ τὸ θέλειν καὶ τὸ ἐνεργεῖν ὑπὲρ τῆς εὐδοκίας.`

| Check | Expected |
|-------|---------|
| `.dg-nomc` at PHP 2:13 COMPLEMENT slot | YES |
| textContent | `ὁ ἐνεργῶν ἐν ὑμῖν ...` (long text, no brackets) |
| fn label below | 述語 or COMPLEMENT label |
| complement connector (diagonal) | YES — unchanged |
| Long text visible (no clipping) | YES |

---

## T-6: Modifier + NOMINALIZED_CLAUSE

**Context:** Verify that word-level modifiers below NOMINALIZED_CLAUSE slots are NOT inside the bracket.

**Script identification:** Find NOMINALIZED_CLAUSE in DR with `slot.modifiers.length > 0`.

| Check | Expected |
|-------|---------|
| Bracket wraps headDisplayText only | YES — modifiers are extracted from headDisplayText |
| Modifier appears in `.dg-slot-mod-zone` below baseline | YES — separate zone |
| Modifier text NOT inside `.dg-nomc` textContent | YES |
| `.dg-adv-connector` below bracket slot | YES |

**Fallback:** If no gate chapter has NOMINALIZED_CLAUSE with modifiers, validate via node script (check `slot.modifiers.length` for gate DR NOMINALIZED_CLAUSE instances). Known gate examples (MAT 5:6, 5:10) have internal structure but check whether `slot.modifiers > 0`.

---

## T-7: PP Diagonal + NOMINALIZED_CLAUSE

**Context:** Verify PP diagonal is unaffected when a clause contains NOMINALIZED_CLAUSE and PP together.

| Check | Expected |
|-------|---------|
| `.dg-nomc` for NOMINALIZED_CLAUSE slot | YES |
| `.dg-pp-wrap` / `.dg-adv-item` for PP | YES |
| PP diagonal renders below main line | YES |
| No overlap or spacing issue between bracket and PP | YES |
| PP renders at correct column (below its slot) | YES |

---

## T-8: APPOSITION Slot — No Bracket

**Chapter:** EPH 2 (`?book=EPH&ch=2&transA=STRUCTURAL`) or JHN 1

**Verify:** APPOSITION slots must NOT have `.dg-nomc`.  
**Verify:** NOMINALIZED_CLAUSE detection branch must NOT fire for APPOSITION nodes.

| Check | Expected |
|-------|---------|
| `.dg-appos-wrap` present (APPOSITION slots) | YES — unchanged |
| `.dg-nomc` on APPOSITION slot | NO — must be 0 |
| `.dg-appos-head` + `.dg-appos-appositive` | YES — unchanged |
| APPOSITION dashed border visible | YES |

```javascript
// DOM query
document.querySelectorAll('.dg-appos-wrap').length  // expect: same as pre-implementation
document.querySelectorAll('.dg-nomc').length         // must be 0 for EPH 2 (no NOMINALIZED_CLAUSE in DR)
```

---

## T-9: CONTENT_CLAUSE Regression

**Chapter:** MAT 5 or EPH 2 (has CONTENT_CLAUSE in DR)

| Check | Expected |
|-------|---------|
| `.dg-cc-clause` present | YES — unchanged |
| `.dg-cc-clause-attach` + `.dg-cc-clause-label` | YES — unchanged |
| Sub-diagram renders inside CC attachment | YES |
| CONTENT_CLAUSE slots show conjunction label | YES (ὅτι / ἵνα etc.) |
| CONTENT_CLAUSE slot does NOT have `.dg-nomc` | YES — branch 1 fires (contentClause.innerDR), never reaches branch 3 |

```javascript
document.querySelectorAll('.dg-cc-clause').length  // must match pre-implementation count
```

---

## T-10: IO Platform Regression

**Chapter:** JHN 1 (`?book=JHN&ch=1&transA=STRUCTURAL`) or PHP 2

| Check | Expected |
|-------|---------|
| `.dg-io-platform` present | YES — unchanged |
| IO platform text | YES — unchanged |
| IO stalk visible | YES |
| `.dg-io-wrap` wraps correctly | YES |
| IO platform has NO `.dg-nomc` | YES — IO slots go to ioSlots array, not baseSlots loop |

```javascript
document.querySelectorAll('.dg-io-platform').length  // must match pre-implementation
```

---

## T-11: PP Diagonal Regression

**Chapter:** JHN 1 or MAT 5 (both have PP)

| Check | Expected |
|-------|---------|
| `.dg-pp-wrap` present | YES |
| `.dg-pp-prep` + `.dg-pp-np` | YES |
| `.dg-adv-connector` diagonal | YES |
| PP count unchanged | YES |

```javascript
document.querySelectorAll('.dg-pp-wrap').length  // must match pre-implementation
```

---

## T-12: Mobile 390px

**Chapter:** MAT 5 at 390px viewport width

| Check | Expected | Method |
|-------|---------|--------|
| `.dg-nomc` font-size | 14.4px (.9rem) | getComputedStyle |
| Bracket pseudo-elements visible | YES | Visual check |
| Bracket does not overflow viewport | YES | No horizontal scroll from bracket alone |
| `.dg-main-line` scrolls if needed | YES |
| fn label visible below bracket | YES |

```javascript
// At 390px viewport
getComputedStyle(document.querySelector('.dg-nomc')).fontSize  // expect ~14.4px
```

---

## T-13: textContent and Copy Integrity

**Chapter:** MAT 5

| Check | Expected | Method |
|-------|---------|--------|
| `.dg-nomc` textContent (JS) | Greek text only, NO `[` or `]` | `element.textContent` |
| `querySelector('.dg-nomc').textContent` | `"οἱ πενθοῦντες,"` | Exact string |
| Downstream `.textContent` reads | Clean Greek text | Verify no `[` in string |

```javascript
document.querySelector('.dg-nomc').textContent  
// MUST NOT contain '[' or ']'
// MUST equal headDisplayText output exactly
```

---

## T-14: Console Errors

**All gate chapters:**

```
?book=JHN&ch=1&transA=STRUCTURAL
?book=MAT&ch=5&transA=STRUCTURAL
?book=MAT&ch=28&transA=STRUCTURAL
?book=EPH&ch=2&transA=STRUCTURAL
?book=PHP&ch=2&transA=STRUCTURAL
?book=COL&ch=1&transA=STRUCTURAL
?book=ROM&ch=6&transA=STRUCTURAL
```

| Check | Expected |
|-------|---------|
| console.error count | 0 |
| console.warn count | 0 (or same as pre-implementation) |
| JS exceptions | 0 |

---

## T-15: Structure Flow / SD Fallback

**Verify:** The SD (Structure Diagram) fallback renders correctly.  
Structure Flow (non-DG view) is not affected by DG renderer changes. The `transA=STRUCTURAL` parameter activates DG. Other views (default Reading view) must be unaffected.

| Check | Expected |
|-------|---------|
| Default Reading view (`?book=JHN&ch=1`) | Unchanged |
| `.dg-nomc` CSS present but unused in non-DG view | YES (CSS is loaded globally but harmless) |
| No DG rendering in non-DG view | YES |
| `_dgRenderMainLine()` not called | YES |

---

## Pre-implementation Baseline (Record Before P6-G.8.3)

For each gate chapter, record these counts BEFORE implementing:

| Gate Chapter | `.dg-appos-wrap` | `.dg-cc-clause` | `.dg-io-platform` | `.dg-pp-wrap` | `.dg-conn-sp` |
|-------------|-----------------|----------------|-------------------|--------------|--------------|
| JHN 1 | ? | ? | ? | ? | ? |
| MAT 5 | ? | ? | ? | ? | ? |
| MAT 28 | ? | ? | ? | ? | ? |
| EPH 2 | ? | ? | ? | ? | ? |
| PHP 2 | ? | ? | ? | ? | ? |
| COL 1 | ? | ? | ? | ? | ? |
| ROM 6 | ? | ? | ? | ? | ? |

Record actual counts in P6-G.8.3 browser verification. Verify counts are unchanged post-implementation.

---

## Exit Criteria for P6-G.8.3

All of the following must PASS:

- [ ] T-1 PASS
- [ ] T-2 PASS
- [ ] T-3 PASS
- [ ] T-5 PASS (PHP 2:13)
- [ ] T-8 PASS (APPOSITION not affected)
- [ ] T-9 PASS (CONTENT_CLAUSE not affected)
- [ ] T-10 PASS (IO platform not affected)
- [ ] T-11 PASS (PP diagonal not affected)
- [ ] T-12 PASS (mobile 390px)
- [ ] T-13 PASS (textContent integrity)
- [ ] T-14 PASS (0 console errors, all gate chapters)
- [ ] T-15 PASS (non-DG view unaffected)

T-4, T-6, T-7: PASS or N/A with documented reason.

---

*P6-G.8.2 test matrix. No production code changes. Read-only.*
