# P5-D Visual Grammar Core — Final Report

**Phase:** P5 — Original Greek NT Diagram Grammar  
**Date:** 2026-08-20  
**State:** BROWSER-VERIFIED  
**Production code changes:** 2 files

---

## エグゼクティブサマリー

**P5-D は4文法領域のうち3領域を実装完了、1領域を DESIGN GAP として記録した。**

P5-D はギリシャ語 NT 構文ダイアグラム文法 v1 の Core Validation フェーズ。SR を SSOT として読み取り専用で消費し、分詞節の視覚マーキング・前置詞句の内部構造表示・P5 gate の拡張を実装した。

> **変更前 (P5-D 開始時):** 分詞形の動詞は通常の述語スロットと同一表示。PP は前置詞と支配 NP を分離せず一体テキスト。MAT 28 / PHP 2 / COL 1 は P5 gate 外（SD tree fallback）。
>
> **変更後 (P5-D 完了):** 分詞スロットが italic で視覚的に区別。adverbial 従属節が分詞か否かで `分詞節`/`従属節` ラベルを使い分け。PP が `前置詞 | NP head` と分離表示。MAT 28 / PHP 2 / COL 1 が DG renderer で描画。

---

## 実装サマリー

### P5-D-1 — 分詞節の視覚文法 ✅ IMPLEMENTED

**変更:** `dg-engine.js` + `index.html`

- `isParticiple(t)`: `morph_raw[4] === 'P'` で分詞動詞を検出
- DR_Slot に `isParticipial: bool` 追加
- DR_Clause に `isParticipalClause: bool` 追加
- ADVERBIAL group が複数 clause 子を持つ場合、各 clause を個別の adverbialClause として抽出（MAT 28:19 `βαπτίζοντες + διδάσκοντες` が別々に描画）
- CSS `.dg-slot-participial .dg-slot-text { font-style: italic }` で分詞スロットを視覚的に区別
- `_dgRenderClause`: `sc.isParticipalClause` に応じて `分詞節` / `従属節` を切り替え

**実証:**
- MAT 28: 9 分詞スロット、6 `分詞節` ラベル（`πορευθέντες`, `βαπτίζοντες`, `διδάσκοντες` 等）
- PHP 2: 1 分詞スロット（`εὑρεθεὶς`）
- COL 1: 2 分詞スロット

### P5-D-2 — 関係代名詞 → 先行詞コネクタ 🔴 DESIGN GAP

**SR 調査結果:**
- `ὅν` [R-ASM] (JHN 1:15): `fn=ADVERBIAL` として節内に存在。先行詞への explicit link なし。
- `ὅς` [R-NSM] (PHP 2:6): `fn=SUBJECT` として節内に存在。先行詞への explicit link なし。
- SR は `RELATIVE_CLAUSE` construction を持たない。

**決定:** SR が SSOT。antecedent link を推論することは L-0 違反。実装しない。  
将来的には SR schema に antecedent link フィールドを追加することで対応可能（P6 以降の別 Phase）。

### P5-D-3 — 前置詞句内部文法 ✅ IMPLEMENTED

**変更:** `dg-engine.js` + `index.html`

- `extractPPStructure(node)`: PREP_PHRASE の最初の token（前置詞）と残り（支配 NP）を分離
- DR_AdvPhrase に `ppPrep`, `ppNpNode`, `ppNpModInfo` フィールド追加
- `_dgRenderAdvPhrases`: `adv.ppPrep` が設定されている場合、`.dg-adv-pp-wrap` で `前置詞 | NP` を横並び表示

**実証:**
- PHP 2: 7 PP ペア表示（`μέχρι + θανάτου...`, `μετὰ + φόβου καὶ τρόμου`, `ἐν + κυρίῳ Ἰησοῦ` 等）
- EPH 2: 9 PP prep tokens（`ἐν`, `κατὰ`, `διὰ` 等）
- MAT 5: 5+ PP prep tokens（`εἰς`, `ἐν`, `ὑπὸ`, `ἐπάνω` 等）

### P5-D-4 — 属格修飾語の視覚文法 ✅ IMPLEMENTED (code); ⚠️ test case 未到達

**変更:** `dg-engine.js` + `index.html`

- `ppNpModInfo = extractSlotModifiers(ppNpNode)`: PP 支配 NP の属格修飾語を抽出
- `headDisplayText(ppNpNode, npMod.headSIs)`: 支配 NP の head テキストのみ表示
- `ppNpModItems`: 属格修飾語を PP row の後（item 直接の子として）正しい DOM 順で追加

**`ἐν μορφῇ θεοῦ` (PHP 2:6) の未到達について:**  
PHP 2:5 の根 clause の第3子 ([2]) は fn なし。`deriveClauseCore` は fn なし子をスキップするため、ὅς 節（[2.0]）は DG engine から到達不可。これは SR 構造的制限（fn がない場合の derivation scope 外）であり P5-D バグではない。

---

## P5 Gate 拡張

| 章 | 追加理由 |
|---|---|
| MAT 28 | 分詞節検証（πορευθέντες, βαπτίζοντες, διδάσκοντες） |
| PHP 2 | PP/分詞複合検証（ὑπάρχων, ἐν μορφῇ θεοῦ） |
| COL 1 | 分詞節追加検証 |

---

## 自動回帰テスト

| スイート | 結果 |
|---|---|
| `test:re-phase1` | 217 checks — ALL PASS |
| `test:re-phase2` | 78 checks — ALL PASS |
| `test:re-stageB` | 47 checks — ALL PASS |
| `test:flow-dom` | 62 checks — ALL PASS |
| **合計** | **404 checks — ALL PASS** |

---

## P5-C.1 継続検証

| 検証項目 | P5-C.1 時 | P5-D 後 | 状態 |
|---|---|---|---|
| JHN 1 dg-clause 数 | 49 | 49 | ✅ |
| JHN 1 coord border-left | 2px solid | 2px solid | ✅ |
| EPH 2 implied connector | 2 | 2 | ✅ |
| EPH 2 mod-zone 数 | 2 | 2 | ✅ |
| MAT 5 mod-zone 数 | 8 | 8 | ✅ |
| MAT 5 adv-item 数 | 39 | 41 | ✅ (+2: PP modifiers 新規) |
| ROM 6 sd-sentence | 27 | 27 | ✅ |
| ROM 6 dg-clause | 0 | 0 | ✅ |

---

## R-K/Leedy 原則カバレッジ 更新

| 評価軸 | P5-C.1 | P5-D | 変化 |
|---|---|---|---|
| 等位節の並列構造表示 | B+ | B+ | ↔ |
| 語レベル修飾対角分離 | C | C | ↔ |
| 従属節の方向性ある接続 | B | B | ↔ |
| IMPLIED CONNECTOR (verbless) | B | B | ↔ |
| PP内部構造 | D | C | ↑ 前置詞/NP 分離表示 |
| 分詞の二重性マーキング | D | C | ↑ italic + `分詞節` ラベル |
| 関係代名詞→先行詞接続 | D | D | → DESIGN GAP (SR insufficient) |

---

## 禁止事項の遵守確認

| 禁止項目 | 状態 |
|---|---|
| reading-engine.js 変更 | 変更なし ✅ |
| syntax-analyzer.js 変更 | 変更なし ✅ |
| syntax-registry.json 変更 | 変更なし ✅ |
| SR schema 変更 | 変更なし ✅ |
| ICL / Structure Flow / Discourse 変更 | 変更なし ✅ |
| Greek word order 変更 | 変更なし ✅ |
| SVO 並べ替え | 実施せず ✅ |
| predicate nominative subtype 推論 | 実施せず ✅ |
| implied subject / referent 追加 | 実施せず ✅ |
| semantic/discourse 推論 | 実施せず ✅ |
| commit / merge / deploy | 実施せず ✅ |
| auto-advance to P5-E | 実施せず ✅ |

---

## DEFERRED / DESIGN GAP 一覧

| Finding | 分類 | 理由 |
|---|---|---|
| 関係代名詞→先行詞コネクタ | DESIGN GAP | SR に antecedent link なし。L-0 境界を維持 |
| `ἐν μορφῇ θεοῦ` PP modifier の描画 | DEFERRED | PHP 2:5 ὅς節が fn=なし経路で到達不可。SR fn-depth 制限 |
| antecedent link の SR 追加 | FUTURE | P6 以降。SR schema 変更が必要 |

---

## 完了状態

```
STATE: BROWSER-VERIFIED

Implemented:
  ✅ P5-D-1 PARTICIPIAL DETECTION (isParticiple + isParticipial + isParticipalClause)
  ✅ P5-D-1 VISUAL MARKER (dg-slot-participial italic + 分詞節 label)
  ✅ P5-D-1 ADVERBIAL GROUP (multiple clause children extracted individually)
  ✅ P5-D-2 DESIGN GAP recorded (SR insufficient for antecedent connector)
  ✅ P5-D-3 PP INTERNAL STRUCTURE (prep + NP separated in display)
  ✅ P5-D-4 GENITIVE IN PP (code correct; test case unreachable by SR fn-depth)
  ✅ P5 GATE EXPANSION (MAT 28 / PHP 2 / COL 1)

Verified:
  ✅ Static: code review (dg-engine.js + index.html)
  ✅ Runtime: Playwright 1.62.1 / Chromium
  ✅ Desktop 1280px: MAT 28 / PHP 2 / COL 1 / JHN 1 (regression) / EPH 2 (regression)
  ✅ Mobile 390px: MAT 28 (no overflow)
  ✅ Regression: 404/404 PASS (re-phase1 + re-phase2 + re-stageB + flow-dom)
  ✅ P5-C.1 continuity: JHN 1 / MAT 5 / EPH 2 all preserved
  ✅ ROM 6 fallback (0 dg-clause, 27 sd-sentence)
  ✅ L-0: no implied elements, no inference, no reordering

NEXT: STOP — 人間レビュー待ち
AUTO-ADVANCE: NO
COMMIT/MERGE/DEPLOY: NO
```

---

*詳細: P5-D_visual_grammar_core.md / P5-D_test_matrix.md*  
*前提: P5-C.1_final_report.md / P5-C.1_test_matrix.md*
