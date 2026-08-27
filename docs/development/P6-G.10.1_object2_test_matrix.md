# P6-G.10.1 — OBJECT2 Test Matrix

**Date:** 2026-08-26  
**Phase:** P6-G.10.1 — Read-only Audit  
**Constraint:** Read-only. This document defines tests for future P6-G.10.3 implementation.

---

## Test Scope

Tests verify that SR fn=OBJECT2 nodes correctly enter DR as fn=SECOND_OBJECT and render on the DG baseline with 第二目的語 label and 'po' connectors.

Gate chapters: JHN 1, MAT 5, MAT 28, EPH 2, PHP 2, COL 1, ROM 6.

---

## T-1 — Basic SECOND_OBJECT on baseline (PREDICATE + OBJECT + OBJECT2)

**Verse:** EPH 2:14 (V-O-O2)  
**SR:** PREDICATE=ποιήσας, OBJECT=τὰ ἀμφότερα, OBJECT2=ἓν  
**Expected:** `.dg-slot-second_object` present, fnLabel='第二目的語', connector between OBJ and OBJ2 = 'po'

```javascript
// Browser console — EPH 2
const slots = document.querySelectorAll('.dg-slot');
const obj2Slots = [...slots].filter(s => s.classList.contains('dg-slot-second_object'));
// Expected: obj2Slots.length >= 1
const fnLabel = obj2Slots[0]?.querySelector('.dg-slot-fn')?.textContent;
// Expected: '第二目的語'
```

**Exit criteria:** `.dg-slot-second_object` count ≥ 1, fnLabel = '第二目的語'

---

## T-2 — OBJECT→SECOND_OBJECT connector (po)

**Verse:** ROM 6:12 (V-O-O2-IO) and EPH 2:14 (V-O-O2)  
**Expected:** `.dg-conn-po` element immediately before `.dg-slot-second_object` in DOM

```javascript
// Check connector before SECOND_OBJECT slot
const obj2Slot = document.querySelector('.dg-slot-second_object');
const prevEl = obj2Slot?.previousElementSibling;
// Expected: prevEl.classList.contains('dg-conn-po') = true
```

**Exit criteria:** Connector element immediately preceding SECOND_OBJECT is `.dg-conn-po`

---

## T-3 — PREDICATE→SECOND_OBJECT connector (JHN 1:33 — no OBJECT)

**Verse:** JHN 1:33 (ClCl2: SUBJ + IO + PRED + OBJ2, no OBJECT)  
**SR:** PREDICATE=εἶπεν, OBJECT2=content of speech (group)  
**Expected:** SECOND_OBJECT slot exists; connector from PREDICATE to SECOND_OBJECT = 'po'

```javascript
// JHN 1 verse 33
const slots = document.querySelectorAll('.dg-slot-second_object');
// Expected: ≥ 1 instance from JHN 1:33
// Check preceding connector
```

**Exit criteria:** SECOND_OBJECT visible, connector from PREDICATE = 'po'

---

## T-4 — SECOND_OBJECT→PREDICATE connector (MAT 28:14 O-O2-V)

**Verse:** MAT 28:14 (O-O2-V)  
**SR surface order:** OBJECT=ὑμᾶς, OBJECT2=ἀμερίμνους, PREDICATE=ποιήσομεν  
**Expected:** DR order: OBJ → OBJ2 → PRED. Connector OBJ→OBJ2='po', OBJ2→PRED='po'

```javascript
// MAT 28 DG view
const mainLine = document.querySelector('.dg-main-line');
const children = [...mainLine.children];
// Expect: ... dg-conn-po ... dg-slot-second_object ... dg-conn-po ... dg-slot-predicate
```

**Exit criteria:** Two 'po' connectors around SECOND_OBJECT slot in correct DOM order

---

## T-5 — SECOND_OBJECT before PREDICATE, no OBJECT between (PHP 2:5)

**Verse:** PHP 2:5 (S-ADV-ADV-O2-V-O)  
**SR surface order:** SUBJ=ὃς, OBJ2=ἁρπαγμὸν, PRED=ἡγήσατο, OBJ=τὸ εἶναι  
**Expected:**  
- SUBJECT → [no connector] → SECOND_OBJECT → po → PREDICATE → po → OBJECT
- SUBJECT→SECOND_OBJECT connector = null (no connection; OBJECT2 is fronted)
- SECOND_OBJECT→PREDICATE connector = 'po'
- OBJECT is NOMINALIZED_CLAUSE → `.dg-nomc` bracket

```javascript
// PHP 2 verse 5
const obj2Slot = document.querySelector('.dg-slot-second_object');
const prevEl = obj2Slot?.previousElementSibling;
// Expected: prevEl is .dg-slot-subject (no connector between them)
// prevEl.classList.contains('dg-conn-po') = false
const nextEl = obj2Slot?.nextElementSibling;
// Expected: nextEl.classList.contains('dg-conn-po') = true
```

**Exit criteria:** No connector before SECOND_OBJECT (SUBJECT precedes it); 'po' connector after SECOND_OBJECT (before PREDICATE). `.dg-nomc` on OBJECT for τὸ εἶναι.

---

## T-6 — SECOND_OBJECT in verbless clause (ROM 6:12 O-O2-IO, noVerb)

**Verse:** ROM 6:12 coordinate clause (O-O2-IO, no PREDICATE)  
**Expected:** `noVerb=true` path — OBJECT→SECOND_OBJECT connector = 'po' even without PREDICATE

**Note:** This coordinate clause may render as a separate sub-DR. Verification depends on DG renderer for coordinate clauses.

**Exit criteria:** SECOND_OBJECT visible in ROM 6:12 context; connector from OBJECT = 'po'

---

## T-7 — SECOND_OBJECT with modifiers (COL 1:21 cn=COORDINATION)

**Verse:** COL 1:21 (V-O-O2-ADV)  
**SR:** OBJECT2=ἁγίους καὶ ἀμώμους καὶ ἀνεγκλήτους (cn=COORDINATION in phrase.adjp)  
**Expected:** SECOND_OBJECT slot shows coordinated adjective phrase text; fn label '第二目的語'; 'po' connector from OBJECT

```javascript
// COL 1
const obj2 = document.querySelector('.dg-slot-second_object');
// Expected: textContent contains 'ἁγίους' or similar
```

**Exit criteria:** SECOND_OBJECT slot text visible, no bracket/sub-diagram (plain text), correct label

---

## T-8 — OBJECT2 as CONTENT_CLAUSE — sub-diagram (NT verification)

**Note:** Gate chapters may not have OBJECT2 cn=CONTENT_CLAUSE instances. NT-wide verification needed.  
**Example books with OBJECT2 cn=CONTENT_CLAUSE:** Multiple books — select non-gate chapter.  
**Expected:** SECOND_OBJECT slot shows conjunction label (not raw text); sub-diagram below baseline

**Exit criteria:** When OBJECT2 is cn=CONTENT_CLAUSE, renderer uses Branch 1 (sub-diagram) not Default branch

---

## T-9 — OBJECT regression — PREDICATE→OBJECT connector unchanged

**Verse:** EPH 2:14 (V-O-O2)  
**Expected:** PREDICATE→OBJECT connector remains 'po' (unchanged by fix)

```javascript
// EPH 2
const objSlot = document.querySelector('.dg-slot-object');
const prevEl = objSlot?.previousElementSibling;
// Expected: prevEl.classList.contains('dg-conn-po') = true
```

**Exit criteria:** Existing OBJECT connectors unchanged in all gate chapters

---

## T-10 — IO platform regression

**Verse:** JHN 1 (IO platform)  
**Expected:** IO count unchanged (gate baseline: JHN 1 io=18)

```javascript
// JHN 1
document.querySelectorAll('.dg-io-platform').length
// Expected: 18 (unchanged from G.8.3 baseline)
```

**Exit criteria:** IO platform count = baseline in all gate chapters

---

## T-11 — PP diagonal regression

**Verse:** MAT 5, JHN 1  
**Expected:** PP diagonal count unchanged (MAT 5 pp=25, JHN 1 pp=22)

```javascript
document.querySelectorAll('.dg-adv-item').length
// Expected: matches G.8.3 baseline
```

**Exit criteria:** PP count = baseline in all gate chapters

---

## T-12 — NOMINALIZED_CLAUSE bracket regression

**Verse:** PHP 2, MAT 5, ROM 6  
**Expected:** `.dg-nomc` count unchanged (PHP 2=2, MAT 5=5, ROM 6=1)

```javascript
document.querySelectorAll('.dg-nomc').length
// Expected: matches G.8.3 baseline
```

**Exit criteria:** `.dg-nomc` count = baseline in all gate chapters

---

## T-13 — CONTENT_CLAUSE sub-diagram regression

**Verse:** MAT 5, EPH 2  
**Expected:** CC sub-diagram count unchanged (MAT 5=8, EPH 2=1)

```javascript
document.querySelectorAll('.dg-cc-inner').length
// Expected: matches G.8.3 baseline (or equivalent selector)
```

**Exit criteria:** CC sub-diagram count = baseline

---

## T-14 — SD fallback (non-DG chapter)

**Chapter:** Any non-gate chapter  
**Expected:** DG view not shown; no `.dg-slot-second_object` in DOM

```javascript
// Non-gate chapter (e.g., GEN 1 or non-gate NT chapter)
document.querySelectorAll('.dg-slot-second_object').length
// Expected: 0
```

**Exit criteria:** SECOND_OBJECT slot not present in non-DG view

---

## T-15 — Mobile 390px

**Verse:** ROM 6:12 or EPH 2:14  
**Expected:** SECOND_OBJECT slot visible at 390px; no horizontal overflow; font-size appropriate

```javascript
// At 390px viewport
const obj2 = document.querySelector('.dg-slot-second_object');
getComputedStyle(obj2).fontSize
// Expected: ~14.4px (0.9rem)
```

**Exit criteria:** SECOND_OBJECT visible without clip or overflow; no console errors

---

## T-16 — Console errors = 0

**All gate chapters:** JHN 1, MAT 5, MAT 28, EPH 2, PHP 2, COL 1, ROM 6  
**Expected:** 0 errors in browser console

**Exit criteria:** 0 console errors per chapter

---

## T-17 — NT-wide coverage

**Script:** Node.js traversal of all SR + DR  
**Expected:** DR fn=SECOND_OBJECT = 311 (all SR fn=OBJECT2 now in DR)

```javascript
// Node script
let count = 0;
for (const dr of allDRs) {
    count += dr.slots.filter(s => s.fn === 'SECOND_OBJECT').length;
}
// Expected: 311
```

**Exit criteria:** DR fn=SECOND_OBJECT = 311

---

## Summary Table

| Test | Verse | Feature verified | Priority |
|------|-------|-----------------|---------|
| T-1 | EPH 2:14 | SECOND_OBJECT slot + label | P1 |
| T-2 | ROM 6:12 / EPH 2:14 | OBJECT→SECOND_OBJECT connector 'po' | P1 |
| T-3 | JHN 1:33 | PREDICATE→SECOND_OBJECT (no OBJECT) | P1 |
| T-4 | MAT 28:14 | O-O2-V word order (OBJ2 before PRED) | P1 |
| T-5 | PHP 2:5 | SUBJECT→SECOND_OBJECT null, OBJ2→PRED 'po' | P1 |
| T-6 | ROM 6:12 (coord) | noVerb OBJECT→SECOND_OBJECT 'po' | P2 |
| T-7 | COL 1:21 | SECOND_OBJECT with cn=COORDINATION | P2 |
| T-8 | non-gate | OBJECT2 cn=CONTENT_CLAUSE sub-diagram | P2 |
| T-9 | EPH 2:14 | OBJECT connector regression | P1 |
| T-10 | JHN 1 | IO platform regression | P1 |
| T-11 | MAT 5, JHN 1 | PP diagonal regression | P1 |
| T-12 | PHP 2, MAT 5 | NOMINALIZED_CLAUSE bracket regression | P1 |
| T-13 | MAT 5, EPH 2 | CONTENT_CLAUSE sub-diagram regression | P1 |
| T-14 | non-gate | SD fallback no SECOND_OBJECT | P1 |
| T-15 | ROM 6 / EPH 2 | Mobile 390px | P2 |
| T-16 | all gate | Console errors = 0 | P1 |
| T-17 | NT-wide | DR count = 311 | P1 |

---

## Gate Chapter Expected Counts (Post-implementation)

| Chapter | `.dg-slot-second_object` | IO baseline | PP baseline | NOMC baseline | CC baseline |
|---------|--------------------------|-------------|-------------|---------------|-------------|
| JHN 1 | ≥2 (1:21, 1:33) | 18 | 22 | 1 | 2 |
| MAT 5 | ≥1 (5:34) | 14 | 25 | 5 | 8 |
| MAT 28 | ≥1 (28:14) | 7 | 18 | 1 | 1 |
| EPH 2 | ≥1 (2:14) | 3 | 28 | 0 | 1 |
| PHP 2 | ≥4 (2:1, 2:5, 2:25, 2:29) | 1 | 16 | 2 | 2 |
| COL 1 | ≥2 (1:21, 1:26) | 3 | 16 | 0 | 0 |
| ROM 6 | ≥5 (6:12×2, 6:16, 6:19×2) | 8 | 26 | 1 | 5 |

**Note:** Exact `.dg-slot-second_object` counts may be higher if sub-DRs (content clause inner DRs) contain SECOND_OBJECT slots. The above are minimum expected counts from direct gate SR instances.

---

## Exit Criteria — Implementation Complete When

1. T-1 through T-17 all PASS
2. No console errors across all gate chapters
3. IO, PP, NOMC, CC baselines unchanged
4. NT-wide DR SECOND_OBJECT count = 311
5. fnLabel '第二目的語' confirmed in all gate chapters

---

*P6-G.10.1 test matrix complete. For use in P6-G.10.3 implementation.*
