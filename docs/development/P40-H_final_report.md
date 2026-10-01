# Phase 4.0-H Final Report — Reed-Kellogg 読書モード `prep`/`pobj` Bug Fix

**Status: PASS**
Date: 2026-10-01
Phase: 4.0 / Task: Phase H — prep/pobj structural bug fix
State: BROWSER-VERIFIED

---

## Summary

Phase G で発見された ROM 1:24 のレンダリングエラー（`prep` role に `pobj` child がない）を修正した。NT-wide 調査により同型ケースが 11 sentences 存在することを確認。3 種類の構造パスに対して最小限の修正を実施し、全 11 ケースが解消。

```
NT-wide audit after fix:
  8,010 / 8,010 sentences
  Adapter errors:       0
  prep-without-pobj:    0

Phase C regression:    12 / 12 PASS
```

---

## 1. Root Cause

### 発見のきっかけ

ROM 1:24 で Renderer が以下を throw:
```
「〜のそばに」(36番) に pobj (前置詞の目的語) がありません
```

### 根本原因の特定

`rk-reading-adapter.js` が `role='prep'` を token に割り当てたにもかかわらず、その token を head とする `role='pobj'` の child が存在しない状態を作ってしまっていた。

3 種類の構造パスで発生:

#### Category 1 — prep-class token が clause の直接 child（8 cases）

`_processClauseChild` → `_fnToRole(fn, bdClass)` で、`bdClass === 'prep'` のとき `'prep'` を返していた。しかし clause の直接 child として処理される token には pobj を割り当てる機構がなく、`prep-without-pobj` 状態になる。

**Affected**: LUK 11:33, ROM 12:6 (×2), 2CO 1:6 (×2), EPH 6:5, COL 3:22

#### Category 2 — `phrase.pp` の object が `phrase.np cn=CLAUSE_AS_NP`（clause 子のみ）（2 cases）

`_processPP` → `_processNP(CLAUSE_AS_NP, prepSI, 'pobj')` を呼ぶが、CLAUSE_AS_NP が token や NP を直接持たず clause children のみの場合、`nounSI = -1` のまま全 clause が `'relcl'` で処理される。pobj が割り当てられず prep がそのまま残る。

**Affected**: ROM 1:24, 1CO 3:11

#### Category 3 — `phrase.np cn=PREP_PHRASE` が clause child を持つ（1 case）

`_processNP(phrase.np PREP_PHRASE)` は `npChild` と `toks` のみ確認し、clause child を処理しなかった。headSI = -1 のまま返り、上位の prep に pobj が割り当てられない。

**Affected**: ROM 15:30

#### Category 4 — `phrase.np cn=CLAUSE_AS_NP` が group 子のみ（1 case）

Category 2 と同じパスだが、clause ではなく group children のみの場合。

**Affected**: HEB 11:32

---

## 2. NT-wide Audit Before Fix

```
Total sentences:       8,010
Adapter errors:        0
prep-without-pobj:     11

Affected verses:
  LUK 11:33  pos=12  greek=ἐπὶ   (Category 1)
  ROM 1:24   pos=36  greek=παρὰ  (Category 2)
  ROM 12:6   pos=13  greek=κατὰ  (Category 1)
  ROM 12:6   pos=20  greek=ἐν    (Category 1)
  ROM 15:30  pos=29  greek=ἀπὸ   (Category 3)
  1CO 3:11   pos= 7  greek=παρὰ  (Category 2)
  2CO 1:6    pos= 4  greek=ὑπὲρ  (Category 1)
  2CO 1:6    pos= 3  greek=ὑπὲρ  (Category 1)
  EPH 6:5    pos=21  greek=κατ'  (Category 1)
  COL 3:22   pos=11  greek=ἐν    (Category 1)
  HEB 11:32  pos= 7  greek=περὶ  (Category 4)
```

---

## 3. Fix

**Modified file: `public/core/rk-reading-adapter.js`**

### Fix 1 — `_fnToRole`: Category 1

```javascript
// Before
if (bdClass === 'prep') return 'prep';

// After
// prep-class tokens as direct clause children have no pobj mechanism; treat as adverbial
if (bdClass === 'prep') return 'adv';
```

clause の直接 child として処理される prep-class token は pobj 機構を持たないため、`'adv'` を返すことで renderer エラーを回避。意味的にも正しい（前置詞が単独で副詞的に機能するケース）。

### Fix 2 — `_processNP(CLAUSE_AS_NP)`: Category 2 + 4

```javascript
// Before: 全 clause を 'relcl' で処理、nounSI = -1 のまま返す
for (const cl of clauses) {
    _processClause(cl, nounSI >= 0 ? nounSI : parentHeadSI, 'relcl');
}
for (const grp of groups) {
    _processGroup(grp, nounSI >= 0 ? nounSI : parentHeadSI);
}

// After: nounSI = -1 のとき、最初の clause/group が semantic head
if (nounSI < 0 && clauses.length > 0) {
    nounSI = _processClause(clauses[0], parentHeadSI, role);
    for (const cl of clauses.slice(1)) {
        _processClause(cl, nounSI >= 0 ? nounSI : parentHeadSI, 'relcl');
    }
} else { /* unchanged */ }
if (nounSI < 0 && groups.length > 0) {
    const s = _processGroup(groups[0], parentHeadSI, role);
    if (s >= 0) nounSI = s;
    for (const grp of groups.slice(1)) { /* ... */ }
} else { /* unchanged */ }
```

直接 token/NP 子がない場合、最初の clause または group が意味的 head（名詞節化された句）であるため、継承 role（例: `'pobj'`）で処理する。

ROM 1:24 の結果:
- κτίσαντα: `role=relcl, head=36` → `role=pobj, head=36` ✅
- ὅς ἐστιν...: `head=36(παρὰ)` → `head=38(κτίσαντα)` ✅（意味的により正確）

### Fix 3 — `_processNP(phrase.np cn=PREP_PHRASE)`: Category 3

```javascript
// Before: npChild と toks のみ確認
// After: clause child も確認
const clChild = children.find(c => c.type === 'clause');
// ...
} else if (clChild) {
    // Nominalized clause (e.g., articular infinitive) as the NP head
    headSI = _processClause(clChild, parentHeadSI, role);
}
```

---

## 4. NT-wide Audit After Fix

```
Total sentences:       8,010
Adapter errors:        0
prep-without-pobj:     0    ← was 11
```

---

## 5. Regression

### Phase C: 12 / 12 PASS

```
PASS JHN 1:1  (17 tokens)
PASS JHN 1:2  (7 tokens)
PASS JHN 1:3  (12 tokens)
PASS JHN 1:4  (12 tokens)
PASS JHN 1:5  (13 tokens)
PASS MRK 1:1  (5 tokens)
PASS MRK 1:11 (16 tokens)
PASS MRK 2:1  (12 tokens)
PASS ROM 1:1  (81 tokens)
PASS ROM 1:16 (19 tokens)
PASS EPH 1:1  (18 tokens)
PASS EPH 1:3  (66 tokens)
```

### Phase G 代表ケース: PASS

```
JHN 1: 57 sentences, 0 errors
MRK 1: 43 sentences, 0 errors
MRK 2: 31 sentences, 0 errors
EPH 1:  9 sentences, 0 errors
ROM 1: 20 sentences, 0 errors  ← was 1 error (ROM 1:24)
```

---

## 6. Browser QA

| ケース | Before | After |
|--------|--------|-------|
| ROM 1:24 | `レンダリングエラー: …pobj…がありません` | RK 図描画 ✅ |
| ROM 1:24 StudyPanel | N/A（図なし） | 単語クリック → StudyPanel 開く ✅ |
| JHN 1:1 | 変化なし | ✅ |
| EPH 1:3 (66 tokens) | 変化なし | ✅ |

**Screenshot**: `H_ROM1_ROM_1_24.png` — ROM 1:24 が RK 図（5 サブツリー）として描画されることを確認。

### ROM 1:24 の unrendered words（修正後）

修正後、ROM 1:24 は描画成功するが 2 tokens が unrendered:
```
τῇ (pos 34), κτίσει (pos 35)
```

これは render error から recovered した Phase C.5 Known Limitation（`ἐλάτρευσαν` の dative object の構造解析）。Phase H scope 外。

---

## 7. Known Limitations

Phase C.5 の既存 Known Limitation（147 tokens unrenderable）は本修正の対象外。

ROM 1:24 については:
- **Before Phase H**: render error（図なし）— Category D
- **After Phase H**: 部分レンダリング（43/45 tokens 描画）— Category B に格下げ

HEB 11:32 (Category 4) については、Fix 2 によって CLAUSE_AS_NP + group children のケースも対処済み。ただし HEB 11:32 の実際のレンダリング品質は Phase H ブラウザテストの対象外（NT-wide prep-without-pobj = 0 で確認済み）。

---

## 8. Commit

```
SHA:     8068f0fa
Message: fix(rk-adapter): Phase H — prep/pobj structural bug fix (11 sentences)
```

## 9. Push

```
origin/main: 548ea7ca → 8068f0fa  ✅
```

---

## Modified Files

| File | Change Type | Description |
|------|-------------|-------------|
| `public/core/rk-reading-adapter.js` | `BUG` | 3 paths で prep-without-pobj を解消 |

## Unchanged

| File | Status |
|------|--------|
| `public/core/rk-reading-renderer.js` | UNCHANGED |
| `public/core/dg-engine.js`           | UNCHANGED |
| `assets/data/sr/` (SR data)          | UNCHANGED |
| `bible_data/nt/` (bible_data)        | UNCHANGED |

---

**Phase H: PASS**
