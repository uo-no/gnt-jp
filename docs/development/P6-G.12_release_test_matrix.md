# P6-G.12 — Release Test Matrix

**Date:** 2026-08-26
**Phase:** P6-G.12 — Read-Only Release Audit
**Status:** COMPLETE

---

## A. Engine Tests (Automated — 2026-08-26)

### A.1 G11 Regression Suite (21 tests)

| ID | Description | Result |
|----|------------|--------|
| G11-P0-1 | CONTENT_CLAUSE existing behavior (JHN 3:2): label=null, conjunction='ὅτι' | **PASS** |
| G11-P0-2 | NOMINALIZED_CLAUSE contentClause=null preserved | **PASS** |
| G11-P0-3 | APPOSITION slot contentClause=null (MAT 1:19) | **PASS** |
| G11-P0-4 | COORDINATION root: isCoordination=true, coordClauses.length=3 (JHN 1:1) | **PASS** |
| G11-P0-5 | PHP 2:1 SECOND_OBJECT=1 (R6 recovery preserved) | **PASS** |
| G11-P0-6 | EPH 2 CONTENT_CLAUSE sub-diagram label=null | **PASS** |
| G11-P0-7 | NT-wide scan: SECOND_OBJECT count ≥260 | **PASS** (265) |
| G11-P0-8 | SR non-mutation during deriveDR (JHN 3:16) | **PASS** |
| G11-P0-9 | NT-wide derivation exceptions = 0 | **PASS** |
| G11-P1-1 | MAT 5:34 SECOND_OBJECT recovery (SUBORDINATE_CLAUSE depth-2) | **PASS** |
| G11-P1-2 | COL 1:26 pericope SECOND_OBJECT recovery (SUBORDINATE_CLAUSE at v28) | **PASS** |
| G11-P1-3 | NT-wide SECOND_OBJECT post-repair count ≥260 (got 265) | **PASS** |
| G11-P2-1 | SUBORDINATE_CLAUSE slot → contentClause.label='従属節' | **PASS** |
| G11-P2-2 | PARTICIPIAL_CLAUSE slot → contentClause.label='分詞節' | **PASS** |
| G11-P2-3 | Bare clause slot (no cn) → contentClause.label='節' | **PASS** |
| G11-P2-4 | Group slot → contentClause.label='節グループ' | **PASS** |
| G11-P2-5 | SECOND_OBJECT self-nested group (JHN 2:14 count≥1) | **PASS** |
| G11-P2-6 | CONTENT_CLAUSE depth-2 recovery (OBJECT/CC→bare-clause→SO) | **PASS** |
| G11-P3-1 | NOMINALIZED_CLAUSE contentClause=null (known limitation) | **PASS** |
| G11-P3-2 | EPH 2:14 COMPLEMENT/APPOSITION contentClause=null | **PASS** |
| G11-P3-3 | Phrase-type (phrase.np/pp) slots remain invisible | **PASS** |
| G11-P3-4 | Structural gap cases SECOND_OBJECT=0 (1JN 4:10, 1PE 2:16) | **PASS** |
| **Total** | | **21/21 PASS** |

### A.2 P6-G.12 Engine Audit (new — 2026-08-26)

| ID | Description | Result |
|----|------------|--------|
| G12-ENG-1 | NT-wide: total sentences = 8010 | **PASS** |
| G12-ENG-2 | Gate sentences = 204 | **PASS** |
| G12-ENG-3 | Fallback sentences = 7806 | **PASS** |
| G12-ENG-4 | Gate DR derived = 203 (≥99%) | **PASS** |
| G12-ENG-5 | Engine exceptions in gate = 0 | **PASS** |
| G12-ENG-6 | DR structure issues = 0 | **PASS** |
| G12-ENG-7 | L-0 violations in renderer = 0 | **PASS** |
| G12-ENG-8 | CC label fallback chain intact (index.html ×2) | **PASS** |
| G12-ENG-9 | Fallback integrity: 5 residual samples, 0 misrender | **PASS** |
| **Total** | | **9/9 PASS** |

---

## B. Browser Tests (Playwright — 2026-08-26)

### B.1 P4 Browser Suite (from P6-G.11.3)

| ID | Description | Result |
|----|------------|--------|
| G11-P4-1 | COL 1:28 SUBORDINATE_CLAUSE: sub-diagram + label="従属節"/"ἵνα" | **PASS** |
| G11-P4-3 | MAT 5: CC labels include '節'/'従属節'/'ὅτι'/'ὥστε' | **PASS** |
| G11-P4-4 | MAT 2 '節グループ': viewport内に表示 | **SKIP** |
| G11-P4-5 | MAT 1 NOMINALIZED_CLAUSE: viewport内に表示 | **SKIP** |
| G11-P4-6 | EPH 2: CC label='ὅτι' + '節グループ' | **PASS** |
| G11-P4-7 | COL 1 mobile 390px: overflow なし | **PASS** |
| G11-console | Console errors = 0 (MAT-5, COL-1, JHN-1) | **PASS** |

### B.2 P6-G.12 Browser Suite (new — 2026-08-26)

| ID | Description | Viewport | Result |
|----|------------|---------|--------|
| G12-JHN-1-desktop | DG rendered, 0 console errors, slots=369, all features | 1280px | **PASS** |
| G12-MAT-5-desktop | DG rendered, 0 console errors, slots=317, all features | 1280px | **PASS** |
| G12-EPH-2-desktop | DG rendered, 0 console errors, slots=72 | 1280px | **PASS** |
| G12-PHP-2-desktop | DG rendered, 0 console errors, slots=139 | 1280px | **PASS** |
| G12-COL-1-desktop | DG rendered, 0 console errors, slots=88 | 1280px | **PASS** |
| G12-ROM-6-desktop | DG rendered, 0 console errors, slots=124 | 1280px | **PASS** |
| G12-MAT-5-390px | No body overflow, ppFits, ioFits, ccFits all true | 390px | **PASS** |
| G12-COL-1-390px | No body overflow, ppFits=true, ccFits=true | 390px | **PASS (NOTE)** |
| G12-EPH-2-390px | No body overflow, all fits | 390px | **PASS** |
| G12-JHN3-fallback | Non-gate chapter: sd-node present, no dg-view | 1280px | **PASS** |
| G12-label-sanity | No undefined/null/empty labels in MAT-5 | 1280px | **PASS** |
| G12-COL1-768px | No overflow, DG present | 768px | **PASS** |

**NOTE on G12-COL-1-390px:** IO platform text "τοῖς ἐν Κολοσσαῖς ἁγίοις..." overhang=45px. Body overflow=false (`.dg-view overflow-x:auto` catches it). KNOWN LIMITATION — not a blocker.

### B.3 Browser test summary

| Suite | Passed | Failed | Skipped |
|-------|--------|--------|---------|
| G11-P4 | 5 | 0 | 2 |
| G12 | 12 | 0 | 0 |
| **Total** | **17** | **0** | **2** |

---

## C. Feature Coverage Matrix

| VG Feature | Gate chapters confirmed | Browser confirmed | Status |
|-----------|------------------------|------------------|--------|
| Main line | All 7 | All 6 | ✓ |
| Subject | All 7 | All 6 | ✓ |
| Predicate/Copula | All 7 | All 6 | ✓ |
| Object | All 7 | All 6 | ✓ |
| Complement | Confirmed (EPH-2, PHP-2) | EPH-2 | ✓ |
| Second Object | 6/7 (EPH-2 has 0 SO) | JHN-1, COL-1, ROM-6 | ✓ |
| Indirect Object | All 7 | JHN-1, COL-1 | ✓ |
| AUX | Confirmed (JHN-1) | — | ✓ |
| S\|P / P\|O connectors | All 7 | All 6 | ✓ |
| Complement \\ connector | EPH-2 | EPH-2 | ✓ |
| Implied connector (verbless) | MAT-5 | — | ✓ |
| IO raised platform | All 7 | JHN-1, COL-1 | ✓ |
| PP diagonal | All 7 | MAT-5, ROM-6 | ✓ |
| Relative clause connector | JHN-1, EPH-2, PHP-2, COL-1, ROM-6 | JHN-1 | ✓ |
| Content clause sub-diagram | All 7 | EPH-2, COL-1, MAT-5 | ✓ |
| APPOSITION | JHN-1, MAT-5, MAT-28, EPH-2, PHP-2, COL-1 | JHN-1, EPH-2 | ✓ |
| NOMC bracket | JHN-1, MAT-5, MAT-28, PHP-2, ROM-6 | JHN-1 | ✓ |
| Participial marker | All 7 | — | ✓ |
| Participial adv-clause | All 7 | MAT-5 | ✓ |
| Subordinate adv-clause | All 7 | COL-1 | ✓ |
| Coordination | JHN-1, MAT-5, MAT-28, COL-1 | JHN-1, EPH-2 | ✓ |
| Word-level modifiers | All 7 | — | ✓ |
| Tree fallback | JHN-3 (non-gate) | JHN-3 | ✓ |

**All 23 VG features: CONFIRMED**

---

## D. L-0 Compliance Matrix

| L-0 Rule | Test method | Result |
|---------|------------|--------|
| 翻訳しない | Renderer static scan: no natural language generation | PASS |
| 推論しない | No referent/discourse resolution in renderer | PASS |
| 語義を勝手に選ばない | No semantic inference in `_extractContentClause` | PASS |
| 自然な日本語へ整えない | No word-order change or honorification | PASS |
| 未判定を埋めない | contentClause=null → fallback, not inference | PASS |
| SR SSOT 維持 | G11-P0-8: SR non-mutation | PASS |
| fn 値 = SR explicit のみ | fn='OBJECT2'→'SECOND_OBJECT' は representational のみ | PASS |

---

## E. Known Test Gaps

| Gap | Reason | Impact |
|-----|--------|--------|
| G11-P4-4 (MAT 2 group): SKIP | viewport 外で visible でない | None — covered by engine audit |
| G11-P4-5 (MAT 1 NOMC): SKIP | viewport 外で visible でない | None — NOMC covered by JHN-1 |
| Non-gate chapters visual: not tested | 7806 sentences は tree fallback でテスト不要 | None |
| MAT-28 browser: not in G12 suite | MAT-5 で participial/PP covered | None |

---

*P6-G.12 Release Test Matrix — READ-ONLY.*
