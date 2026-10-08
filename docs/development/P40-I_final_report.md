# Phase 4.0-I Final Report — Reed-Kellogg 読書モード / Post-Fix Visual QA

**Status: PASS**
Date: 2026-10-01
Phase: 4.0 / Task: Phase I — Post-Fix Visual QA (READ-ONLY Audit)
State: BROWSER-VERIFIED

---

## Summary

Phase H で修正した `rk-reading-adapter.js` の動作を、adapter + renderer 両面から検証した。

```
NT-wide adapter sweep:   8,010 / 8,010 sentences
Adapter errors:          0
prep-without-pobj:       0

In-browser renderer sweep: 35 chapters, 0 new renderer errors
  (3 pre-existing errors discovered — see §7)

ROM 1:24:    43/45 tokens rendered  ✅  (Phase G I-1 RESOLVED)
1CO 3:11:    13/13 tokens rendered  ✅
HEB 11:32:    4/4  tokens rendered  ✅
ROM 15:30:   56/56 tokens rendered  ✅

Phase C 12/12:              PASS
H-1 regression (5 cases):   PASS
Mobile (375×812, 390×844):  PASS
StudyPanel (4 cases):       PASS
```

---

## 1. I-1: ROM 1:24 render error resolved (Phase G I-1 確認)

**Status: CONFIRMED RESOLVED**

```
Before Phase H: レンダリングエラー: 「〜のそばに」(36番) に pobj がありません
After Phase H:  RK 図描画 (43/45 tokens, unrendered: τῇ, κτίσει)
```

- DOM error element (`.sd-empty`): 0 件 `CONFIRMED`
- adapter の head 構造: prep=6, pobj=6, prep-no-pobj=0 `CONFIRMED`
- ROM 1:24 の adapter 出力（修正後）:

```
36  παρὰ      role=prep   head=22
37  τὸν       role=det    head=38
38  κτίσαντα  role=pobj   head=36   ← Fix 2 (CLAUSE_AS_NP)
39  ὅς        role=subj   head=40
40  ἐστιν     role=relcl  head=38   ← head を κτίσαντα に訂正
```

**Screenshot**: `I1_rom_1_24_desktop.png`

---

## 2. I-2: H-modified cases (4 sentences)

### ROM 1:24

| 項目 | 結果 |
|------|------|
| tokens | 45 |
| rendered | 43 (96%) |
| unrendered | τῇ (pos 34), κτίσει (pos 35) |
| render error | 0 |
| status | **PASS** |

unrendered 2 tokens は Phase C.5 既存 Known Limitation（`ἐλάτρευσαν` の dative object）。Phase I scope 外。

**Screenshot**: `I2b_1co_3_11.png` / `I1_rom_1_24_desktop.png`

### 1CO 3:11

| tokens | rendered | render error | status |
|--------|----------|--------------|--------|
| 13 | 13 (100%) | 0 | **PASS** |

**Screenshot**: `I2b_1co_3_11.png`

### HEB 11:32

| tokens | rendered | render error | status |
|--------|----------|--------------|--------|
| 4 | 4 (100%) | 0 | **PASS** |

**Screenshot**: `I2c_heb_11_32.png`

### ROM 15:30

| tokens | rendered | render error | status |
|--------|----------|--------------|--------|
| 56 | 56 (100%) | 0 | **PASS** |

**Screenshot**: `I2d_rom_15_30.png`

---

## 3. I-3: H-1 structural regression (prep→adv cases)

Fix 1 (Category 1: prep-class tokens as direct clause children → `adv`) によって影響を受けた 8 sentences のうち、代表 5 ケース:

| ref | rendered/total | status |
|-----|----------------|--------|
| LUK 11:33 | 18/20 | PASS |
| ROM 12:6  | 44/46 | PASS |
| 2CO 1:6   | 9/9   | PASS |
| EPH 6:5   | 57/59 | PASS |
| COL 3:22  | 21/21 | PASS |

adapter 確認:
- 各 sentence の prep/pobj カウント balanced=true `CONFIRMED`
- Fix 1 対象 token が `role=adv` に変更済み `CONFIRMED`
- 他の prep/pobj 構造は維持 `CONFIRMED`

---

## 4. I-4: Representative cases (Phase C 12)

| ref | rendered/total | status |
|-----|----------------|--------|
| JHN 1:1 | 17/17 | PASS |
| JHN 1:2 | 7/7   | PASS |
| JHN 1:3 | 12/12 | PASS |
| JHN 1:4 | 12/12 | PASS |
| JHN 1:5 | 13/13 | PASS |
| MRK 1:1 | 5/5   | PASS |
| MRK 1:11 | 16/16 | PASS |
| MRK 2:1  | 12/12 | PASS |
| ROM 1:1  | 81/81 | PASS |
| ROM 1:16 | 19/19 | PASS |
| EPH 1:1  | 18/18 | PASS |
| EPH 1:3  | 66/66 | PASS |

**12 / 12 PASS**

---

## 5. I-5: In-browser renderer sweep

### 5.1 adapter-level NT-wide sweep (filesystem)

```
Total sentences: 8,010
Adapter errors:  0
prep-without-pobj: 0
```

`CONFIRMED` — Phase H 修正後の状態が維持されている。

### 5.2 in-browser renderer sweep (35 chapters)

35 chapters（MAT/MRK/LUK/JHN/ACT/ROM/1CO/2CO/GAL/EPH/PHP/COL/1TH/HEB/REV）を実ブラウザで検証。

**新規 renderer errors: 0**

ただし以下の pre-existing errors を発見:

| ref | error type | pre-existing |
|-----|-----------|--------------|
| MAT 5:23 | RangeError: Maximum call stack size exceeded | CONFIRMED ✅ |
| GAL 3:21 | RangeError: Maximum call stack size exceeded | CONFIRMED ✅ |
| HEB 11:4 | RangeError: Maximum call stack size exceeded | CONFIRMED ✅ |

#### pre-existing 確認根拠

1. **rk-reading-renderer.js は Phase H で変更なし** (`UNCHANGED` — Phase H Final Report §Unchanged)
2. **pre-H adapter で同様の構造を確認**: Phase H 直前の adapter (`548ea7ca`) で同一 sentences を実行し、以下を確認:
   - MAT 5:23: pre-H でも `hasCycle=true`（pos 37/38 の verb/cverb サイクル）
   - HEB 11:4:  pre-H でも `hasCycle=true`（pos 25/27 の cverb/verb サイクル）
   - GAL 3:21:  pre-H でも `hasCycle=false`（renderer の別問題、adapter は正常）
3. **Phase H が変更したコードパス**: `_fnToRole`(prep/adv), `_processNP(CLAUSE_AS_NP)`, `_processNP(PREP_PHRASE)` — いずれも verb/cverb の head 割り当てに関与しない

**分類: TECH-DEBT / DEFERRED — Phase I scope 外**

---

## 6. I-6: Mobile regression

| viewport | ROM 1:24 | JHN 1:1 | status |
|----------|----------|---------|--------|
| 375×812 | error=0 | error=0 | PASS |
| 390×844 | error=0 | error=0 | PASS |

**Screenshots**: `I6_mobile_375x812_ROM1.png`, `I6_mobile_375x812_JHN1.png`, `I6_mobile_390x844_ROM1.png`, `I6_mobile_390x844_JHN1.png`

---

## 7. I-7: StudyPanel on H-modified cases

| ref | StudyPanel | screenshot |
|-----|-----------|-----------|
| ROM 1:24  | opened ✅ | `I7_studypanel_ROM_1_24.png` |
| 1CO 3:11  | opened ✅ | `I7_studypanel_1CO_3_11.png` |
| HEB 11:32 | opened ✅ | `I7_studypanel_HEB_11_32.png` |
| ROM 15:30 | opened ✅ | `I7_studypanel_ROM_15_30.png` |

**4 / 4 PASS**

---

## 8. Pre-existing Issues Inventory (DEFERRED)

Phase I で新規に発見した pre-existing issues（Phase H 無関係）:

### TECH-DEBT-I-1: MAT 5:23 / HEB 11:4 — head_idx サイクル

**Root cause**: adapter が verb/cverb 間で循環 head を生成する SR 構造パスが存在する。

```
MAT 5:23: pos=38 πρόσφερε (verb) ↔ pos=37 ἐλθὼν (cverb)
HEB 11:4: pos=27 λαλεῖ (verb) ↔ pos=25 ἀποθανὼν (cverb)
```

renderer がこのサイクルを無限再帰で処理し `Maximum call stack size exceeded`。

### TECH-DEBT-I-2: GAL 3:21 — renderer 側 overflow（cycle なし）

adapter 出力は正常（8 tokens、head_idx cycle なし）。renderer の別パスで overflow 発生。νόμος が `role=verb, head=0` として root に置かれる構造（名詞が述語 root として機能する文）。

**いずれも Phase H 変更と無関係。次期 Phase で対処が必要。**

---

## 9. Validation Summary

| 検証項目 | 結果 |
|---------|------|
| ROM 1:24 render error = 0 | ✅ CONFIRMED |
| ROM 1:24 43/45 tokens rendered | ✅ PASS |
| 1CO 3:11 renders | ✅ PASS |
| HEB 11:32 renders | ✅ PASS |
| ROM 15:30 renders | ✅ PASS |
| H-1 prep→adv regression (5 cases) | ✅ ALL PASS |
| Phase C representative 12 cases | ✅ 12/12 PASS |
| NT-wide adapter sweep 8,010 sentences | ✅ 0 errors |
| In-browser sweep 35 chapters | ✅ 0 new errors |
| Mobile 375×812 | ✅ PASS |
| Mobile 390×844 | ✅ PASS |
| StudyPanel 4 H-cases | ✅ 4/4 PASS |
| Phase G I-1 resolved | ✅ CONFIRMED |

---

## 10. Modified Files

Phase I は READ-ONLY 監査。コード変更なし。

| File | Status |
|------|--------|
| `public/core/rk-reading-adapter.js`  | UNCHANGED (Phase H 修正済みの状態を確認) |
| `public/core/rk-reading-renderer.js` | UNCHANGED |

---

**Phase I: PASS**
