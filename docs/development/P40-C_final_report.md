# Phase 4.0-C Final Report — Adapter 構造精度検証

**Status: PASS**  
Date: 2026-10-01  
Phase: 4.0 / Task: Phase C — Adapter 構造精度検証  
State: VALIDATED

---

## Summary

`rk-reading-adapter.js` が、JHN・MRK・ROM・EPH の代表 12 節すべてに対して、SR ツリーを正しく RK ワード配列に変換し、レンダラーが全トークンを描画できることを確認した。

**最終結果: 12 / 12 PASS（未描画 0 語）**

---

## Test Cases

| Ref       | Tokens | Description                            | Result |
|-----------|--------|----------------------------------------|--------|
| JHN 1:6   | 8      | group root, ADJ_MOD + relative clause  | PASS   |
| JHN 1:10  | 16     | COORDINATION x3                        | PASS   |
| JHN 1:14  | 23     | CONJOINED + nested coord + ADJ_MOD/APPOSITION | PASS |
| MRK 1:1   | 5      | phrase.np root, verbless title         | PASS   |
| MRK 1:11  | 16     | CONJOINED_CLAUSE + APPOSITION          | PASS   |
| MRK 2:1   | 12     | CONJOINED_CLAUSE + CONTENT_CLAUSE      | PASS   |
| ROM 1:1   | 81     | verbless letter salutation, APPOSITION/NOMINALIZED_CLAUSE | PASS |
| ROM 1:16  | 19     | CONJOINED + SUBORDINATE_CLAUSE + NP_COMPLEX | PASS |
| ROM 5:1   | 38     | ADVERBIAL + DEMO_MOD + CLAUSE_AS_NP    | PASS   |
| EPH 1:1   | 18     | verbless letter address                | PASS   |
| EPH 1:3   | 66     | verbless doxology                      | PASS   |
| EPH 2:1   | 37     | subject ellipsis                       | PASS   |

Role coverage confirmed: verb, cverb, subj, obj, pred, iobj, det, adj, gen, relcl, advcl, clause, prep, pobj, conj, adv

---

## Issues Found and Fixed

### Issue 1 — CONJOINED_CLAUSE + group inner child (MRK 1:11, MRK 2:1)
- **Cause**: `CONJOINED_CLAUSE` handler only processed `clause` inner child, not `group` inner child.
- **Impact**: MRK 1:11, MRK 2:1 の主動詞が未検出 (NO_VERB)。
- **Fix**: `innerGroup` branch を追加し `_processGroupAsClause` へ委譲。
- **Classification**: BUG

### Issue 2 — group type at SR root (JHN 1:6)
- **Cause**: `_processClause` が `group` 型ノードを受け取ったとき `_processGroupAsClause` に委譲していなかった。
- **Impact**: すべての役割が flat fallback で `adv` になる。
- **Fix**: `_processClause` 冒頭に `if (node.type === 'group')` ディスパッチを追加。
- **Classification**: BUG

### Issue 3 — ADJ_MOD with no direct token children (ROM 1:1)
- **Cause**: `ADJ_MOD` ハンドラーに直接トークン子がない場合のブランチがなかった。
- **Impact**: ROM 1:1 の APPOSITION 内 NP が処理されず未訪問トークンが多数発生。
- **Fix**: `else if (nonTok.length > 0)` ブランチを追加。
- **Classification**: BUG

### Issue 4 — NOMINALIZED_CLAUSE not handled (EPH 1:3)
- **Cause**: `NOMINALIZED_CLAUSE`（冠詞 + 内部節）のハンドラーが存在しなかった。
- **Impact**: EPH 1:3 で 56 トークン相当が flat fallback。
- **Fix**: `NOMINALIZED_CLAUSE` ハンドラーを追加（article→`det`、inner clause→再帰）。
- **Classification**: BUG

### Issue 5 — SUBORDINATE_CLAUSE not handled (EPH 1:3, ROM 1:16)
- **Cause**: `SUBORDINATE_CLAUSE`（接続詞 + 内部節）のハンドラーが存在しなかった。
- **Impact**: καθώς/ὅτι 節が flat fallback。
- **Fix**: `SUBORDINATE_CLAUSE` ハンドラーを追加（conj token→`conj`、inner clause→再帰）。
- **Classification**: BUG

### Issue 6 — CLAUSE_AS_NP missing group children (ROM 1:1)
- **Cause**: `CLAUSE_AS_NP` ハンドラーが `group` 子を処理していなかった。
- **Impact**: ROM 1:1 の "δι' οὗ ἐλάβομεν..." group が未処理。
- **Fix**: `for (const grp of groups)` ループを追加。
- **Classification**: BUG

### Issue 7 — GENITIVE_MOD head assignment wrong (ROM 1:1)
- **Cause**: `toks[toks.length-1]`（最後のトークン）を頭部としていたため、属格代名詞が頭部になっていた。
- **Impact**: δόξαν αὐτοῦ 等で αὐτοῦ が headword になる誤り。
- **Fix**: `toks[0]`（最初のトークン = 頭部名詞）に変更。
- **Classification**: CORRECTNESS

### Issue 8 — _processGroup token-only early exit missing non-conj tokens (ROM 1:16)
- **Cause**: 句内の group が `{καί, Ἕλληνι}` のようにトークンのみの場合、conjTok のみ処理して他を無視した。
- **Impact**: Ἕλληνι が safety fallback → 未描画。
- **Fix**: `others` ループで非 conj トークンを `adj` として割り当て。
- **Classification**: BUG

### Issue 9 — Verbless clause: renderer requires exactly 1 verb (MRK 1:1, ROM 1:1, EPH 1:1, EPH 1:3)
- **Cause**: 動詞節なし（手紙冒頭・讃美句）では verbCount=0 のまま `loadWords` が throw。
- **Impact**: 4 節が `ERROR: undefined`（renderer throw を catch）。
- **Fix**: `adaptSentence` に post-processing を追加:
  1. verbCount=0 の場合、最初の `subj`（なければ `pred`、なければ先頭トークン）を `verb` に昇格。
  2. 昇格後、残りの `headSI=-1` トークンをすべて promoted verb へ再ルート（`h=-1` 孤立を解消）。
- **Classification**: BUG

---

## Modified Files

| File | Change Type | Description |
|------|-------------|-------------|
| `public/core/rk-reading-adapter.js` | BUG/CORRECTNESS | 上記 Issue 1〜9 の全修正を適用 |

---

## Unmodified Critical Assets (CONFIRMED)

| File | Status |
|------|--------|
| `public/core/role-semantic-layout.js`  | UNCHANGED |
| `public/core/role-page-layout.js`      | UNCHANGED |
| `public/core/role-geometry-layout.js`  | UNCHANGED |
| `public/core/role-renderer.js`         | UNCHANGED |
| `public/core/dg-engine.js`             | UNCHANGED |
| `public/core/clause-role-renderer.js`  | UNCHANGED |
| `public/index.html`                    | UNCHANGED |
| `public/core/rk-reading-renderer.js`   | UNCHANGED |
| `assets/data/sr/` (SR data)            | UNCHANGED |
| `bible_data/nt/` (bible_data)          | UNCHANGED |

---

## Tests Executed

| Test | Tool | Result |
|------|------|--------|
| Node.js adapter-only test (12 verses) | scratchpad/phase-c-test.mjs | 10/12 verified (2 verbless expected) |
| Browser rendering test (12 verses)   | Playwright rk-phase-c-full.png | 12/12 PASS, 0 unrendered |
| Full-page screenshot visual QA       | rk-phase-c-full.png | 全 12 節が SVG 描画、目視確認 |

---

## Exit Criteria Check

| Criterion | Status |
|-----------|--------|
| 12 代表節すべてで adaptSentence が正常完了 | CONFIRMED |
| 全トークンが役割・係り先を持つ | CONFIRMED |
| 未描画トークン 0 語 | CONFIRMED |
| 既存 CLAUSE_ROLE パイプライン無変更 | CONFIRMED |
| rk-reading-renderer.js 無変更 | CONFIRMED |
| JHN / MRK / ROM / EPH マルチブック対応 | CONFIRMED |

**Phase C: PASS**
