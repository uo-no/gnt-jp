# P6-G.2 — IO Raised Platform Test Matrix

**Date:** 2026-08-25
**Phase:** P6-G.2 read-only audit (test matrix for future P6-G-3 implementation phase)
**Scope:** Test cases for the IO raised platform when it is implemented.

---

## Test Case Taxonomy

| Code | Category |
|---|---|
| T-1 to T-5 | Core IO platform rendering |
| T-6 | IO modifier handling |
| T-7 | Edge cases |
| T-8 | Regression — PP diagonal (P6-F) |
| T-9 | Regression — other DG features |
| T-10 | Mobile 390px |
| T-11 | SD fallback (non-DG chapters) |
| T-12 | Console errors |

---

## T-1: Simple Ditransitive — IO Platform Appears (JHN 1:38)

**SR pattern:** PREDICATE + INDIRECT_OBJECT + OBJECT in same clause DR
**Gate chapter:** JHN 1, sentence ~14 (verse 38)
**Expected elements:**
- `.dg-io-wrap` exists (1 per clause with IO)
- `.dg-io-platform` inside dg-io-wrap (IO text above main line)
- `.dg-io-stalk` inside dg-io-platform-area (vertical connector)
- `.dg-io-platform-text` = "αὐτῷ" (IO dative pronoun)
- `.dg-io-platform-fn` = "間接目的語"
- `.dg-main-line` does NOT contain `.dg-slot-indirect_object` (IO removed from baseline)
- `.dg-conn-po` exists (PRED|OBJ connector unchanged)
- `.dg-conn-sp` exists (SUBJ|PRED connector if SUBJ present)

**Fail condition:** IO still in `.dg-main-line` (not elevated)

---

## T-2: IO Without DO — Platform Appears (JHN 1:27)

**SR pattern:** PREDICATE + INDIRECT_OBJECT (no OBJECT in clause)
**Expected elements:**
- `.dg-io-wrap` exists
- `.dg-io-platform` with IO text
- `.dg-main-line` has PRED slot only (no po connector — no OBJECT)
- No `.dg-conn-po` in main line
- IO on platform above main line

**Why this case matters:** 33.1% of IO instances have no DO.
Without DO, there is no `po` connector on the main line. The platform still appears;
stalk connects to approximately predicate position.

---

## T-3: Ditransitive with SUBJECT — All Connectors Correct (MAT 5:34)

**SR pattern:** SUBJECT + PREDICATE + INDIRECT_OBJECT + OBJECT
**Gate chapter:** MAT 5
**Expected elements:**
- `.dg-io-wrap` wraps the whole clause rendering
- `.dg-io-platform-area` above
- `.dg-main-line` has: SUBJ `.dg-conn-sp` PRED `.dg-conn-po` OBJ
- IO NOT in main line
- sp and po connectors correct and unchanged

**Why this case matters:** Most common ditransitive pattern; verifies connector generation
is not disrupted when IO is extracted from slot processing.

---

## T-4: IO with Modifier (MAT 28:9)

**SR pattern:** IO node = ARTICULAR_NP with genitive modifier (mods=1)
**Gate chapter:** MAT 28
**Expected elements:**
- `.dg-io-platform` with IO head text (article + noun, genitive stripped)
- IO modifier rendered below platform (or in platform area, depending on design)
- Modifier NOT in `.dg-slot-mod-zone` (since IO is excluded from modZone input)
- Main line modZone only shows non-IO slot modifiers

**Why this case matters:** 52 IO instances (3.0%) have slot-level modifiers.
Modifier routing must be correct after IO extraction.

---

## T-5: IO as CLAUSE_AS_NP (JHN 1:12)

**SR pattern:** IO node = CLAUSE_AS_NP (article + relative clause)
**Gate chapter:** JHN 1, sentence ~4 (verse 12)
**Expected elements:**
- `.dg-io-platform` displays head tokens (article + partial text)
- Embedded relative clause from `slot.embeddedRelClauses` rendered via existing
  `_dgRenderClause` path (outside platform, as sub-clause)
- Platform text = `headDisplayText(ioSlot.node, ioSlot.headSIs)` (head only, not whole clause)

**Why this case matters:** 12 CLAUSE_AS_NP IO instances. The headSIs exclusion mechanism
must work for IO platform the same way it works for other slot types.

**Fallback acceptable:** If no headSIs, `displayText()` used for full text — not ideal
visually but functionally correct.

---

## T-6: IO with NOMINALIZED_CLAUSE Node (MAT 5:51)

**SR pattern:** INDIRECT_OBJECT is a NOMINALIZED_CLAUSE + PREDICATE in clause
**Gate chapter:** MAT 5
**Expected elements:**
- `.dg-io-platform` exists
- IO text = displayText of NOMINALIZED_CLAUSE (all tokens as flat text)
- No crash or empty text

**Why this case matters:** 39 NOMINALIZED_CLAUSE IO instances. No headSIs usually,
so displayText fallback applies.

---

## T-7: Verbless Clause with IO (fn=INDIRECT_OBJECT + no PREDICATE)

**SR pattern:** INDIRECT_OBJECT + SUBJECT only (no PREDICATE/COPULA)
**Example:** COL 1:1 `{"fns":"SUBJECT INDIRECT_OBJECT","hasDO":false}`
**Expected elements:**
- `.dg-io-wrap` exists
- `.dg-io-platform` with IO text
- `.dg-main-line` has SUBJECT only
- `dr.noVerb = true` — no connector applied to main line
- Platform still appears (DR correctly has IO in slots regardless of verb presence)

---

## T-8: Regression — PP Diagonal (P6-F) Unchanged (EPH 2)

**Gate chapter:** EPH 2 (highest PP density: 51 PP / 12 sentences)
**Expected (same as P6-F.1 T-4):**
- `.dg-pp-wrap` count ≥ 20
- `.dg-pp-diagonal` present for each PP wrap
- `.dg-pp-np-row` present for each PP wrap
- `.dg-conn-complement` present (EPH 2:8 has COMPLEMENT diagonal)
- No regression in adverbial phrase rendering

**Why this case matters:** P6-G.2 changes `_dgRenderMainLine` and `_dgRenderSlotModZone`.
These must not affect adverbial phrase rendering (PP diagonal is in `_dgRenderAdvPhrases`,
which is unchanged).

---

## T-9: Regression — Relative Clause, Coordination (JHN 1)

**Gate chapter:** JHN 1
**Expected:**
- `.dg-rel-clause` count ≥ 1 (relative clause connectors from P6-C)
- `.dg-coord-wrap` count ≥ 1 (coordination left border)
- `.dg-conn-sp` count ≥ 5 (subject-predicate connectors)
- `.dg-slot-indirect_object` ZERO in `.dg-main-line` (IO removed from baseline)
- `.dg-io-wrap` count ≥ 10 (IO platforms present)

---

## T-10: Mobile 390px — No Horizontal Overflow, Platform Compact

**Gate chapter:** JHN 1 (mobile viewport 390px)
**Expected:**
- `document.body.scrollWidth <= document.body.clientWidth` (no body overflow)
- `.dg-io-platform-text` text is single token or short phrase (no forced wrap issue)
- IO platform text uses reduced font-size at ≤ 480px (via media query)
- Platform height increase acceptable (≤ 3rem additional per clause)

**Secondary check:** MAT 5 at 390px — ditransitive clauses with platform.

---

## T-11: SD Fallback — Non-DG Chapter Unaffected (ACT 2)

**Chapter:** ACT 2 (non-DG gate chapter)
**Expected:**
- `.dg-view` count = 0 (DG not rendered for ACT 2)
- `.sd-node` count > 0 (SD fallback active)
- `.dg-io-wrap` count = 0 (IO platform not present in SD view)

---

## T-12: Console Errors = 0

**Scope:** All test chapters (JHN 1, MAT 5, MAT 28, EPH 2, PHP 2, COL 1, ROM 6, ACT 2)
**Expected:** No JavaScript errors in browser console

---

## Test Coverage Summary

| Test | SR Pattern | Gate Chapter | Priority |
|---|---|---|---|
| T-1 | IO + DO (ditransitive, token IO) | JHN 1 | MUST PASS |
| T-2 | IO without DO | JHN 1 | MUST PASS |
| T-3 | SUBJ + PRED + IO + OBJ | MAT 5 | MUST PASS |
| T-4 | IO with modifier | MAT 28 | MUST PASS |
| T-5 | IO as CLAUSE_AS_NP | JHN 1 | MUST PASS |
| T-6 | IO as NOMINALIZED_CLAUSE | MAT 5 | MUST PASS |
| T-7 | IO in verbless clause | COL 1 | MUST PASS |
| T-8 | PP diagonal regression | EPH 2 | MUST PASS |
| T-9 | RelClause + Coordination regression | JHN 1 | MUST PASS |
| T-10 | Mobile 390px | JHN 1, MAT 5 | MUST PASS |
| T-11 | SD fallback | ACT 2 | MUST PASS |
| T-12 | Console errors | All gate chapters | MUST PASS |

**All 12 tests must PASS for implementation to be accepted.**

---

## Key DOM Assertions Per Test

### IO Platform Present and Correct
```javascript
// After rendering JHN 1 with IO:
const ioWraps = document.querySelectorAll('.dg-io-wrap').length;        // ≥ 10
const ioPlat  = document.querySelectorAll('.dg-io-platform').length;    // ≥ 10
const ioStalk = document.querySelectorAll('.dg-io-stalk').length;       // ≥ 10
const ioSlotInLine = document.querySelectorAll(
    '.dg-main-line .dg-slot-indirect_object').length;                   // === 0
```

### Consistency
```javascript
// All wraps should have platform + stalk
const wraps = document.querySelectorAll('.dg-io-wrap');
const allConsist = [...wraps].every(w =>
    w.querySelector('.dg-io-platform') !== null &&
    w.querySelector('.dg-io-stalk')    !== null
);
// → true
```

### PP Diagonal Regression
```javascript
const ppWraps = document.querySelectorAll('.dg-pp-wrap').length;        // ≥ 20 (EPH 2)
const ppDiag  = document.querySelectorAll('.dg-pp-diagonal').length;    // === ppWraps
```

---

*P6-G.2 — read-only audit (test matrix for future implementation). No production code changes.*
