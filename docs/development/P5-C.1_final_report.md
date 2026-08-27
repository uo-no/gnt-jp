# P5-C.1 Visual Grammar Hardening — Final Report

**Phase:** P5 — Original Greek NT Diagram Grammar  
**Date:** 2026-08-20  
**State:** BROWSER-VERIFIED  
**Production code changes:** 2 files

---

## エグゼクティブサマリー

**P5-C.1 は全4項目を実装・検証完了した。**

P5-C audit (read-only) で特定した9件の findingsのうち、最小変更で修正可能な4件を対象とし、SR を SSOT として読み取り専用で消費、L-0 境界を維持しながら視覚的欠落を補完した。

> **変更前:** τῷ πνεύματι は SUBJECT テキストに埋め込まれ、θεοῦ は COMPLEMENT に孤立し、ὅとι節の接続方向は不明、3節の並列性は縦積みだけで伝わらなかった。
>
> **変更後:** 語レベル修飾が main line の下に L-bracket で接続され、第2COMPLEMENT が implied 対角線で接続され、従属節が L-bracket で接続先を示し、等位節が左縦線で並列を示す。

---

## 実装サマリー

### 変更 1 — F-01 BUG FIX

**対象:** `public/core/dg-engine.js` — `connectorBetween()`

EPH 2:8 s4 の `connectorBetween('COMPLEMENT', 'COMPLEMENT', true)` が `null` を返し第2COMPLEMENT が孤立していた問題を修正。verbless 節内で連続する COMPLEMENT には `'implied'` を返すケースを追加。

**根拠:** SR が `COMPLEMENT(ἐξ ὑμῶν)` + `COMPLEMENT(θεοῦ τὸ δῶρον)` を明示しており、コネクタの拒否は関数型の一意性ではなく構造的根拠によるべき。

### 変更 2 — 語レベル修飾添付

**対象:** `public/core/dg-engine.js` — 新規 `extractSlotModifiers()` / `headDisplayText()` / DR_Slot 拡張

SR の `construction.canonical` (`GENITIVE_MOD`, `ADV_MOD`) と `morph_raw` の形態格情報を利用してモディファイアを抽出。推論なし。

- Case A: スロット自体が `GENITIVE_MOD` → 形態格で head/modifier を分離（EPH 2:8 s4）
- Case B: `ADV_MOD` 直接子 → トークンが head、句が modifier（MAT 5:3 SUBJECT）
- Case C: `GENITIVE_MOD` 直接子 → 属格が modifier、非属格が head（MAT 5:3 ὅとι内）

### 変更 3 — 従属節 L-bracket 接続

**対象:** `public/index.html` (CSS + JS)

`.dg-adv-clause-attach` CSS クラス（L字形 border-left + border-bottom）と JS での要素挿入（`.dg-adv-clause` の直前）を追加。各従属節・副詞的句の前にL字コネクタが表示されるようになった。

### 変更 4 — 等位節並列表示

**対象:** `public/index.html` (CSS)

`.dg-coord-wrap` に `border-left: 2.5px solid var(--text-sub)` + `padding-left: .55rem` を追加。等位節群が共通の左縦線を持つことで、ラベルなしに並列構造を位置で示す。

---

## 聖句別検証結果

### JHN 1:1

**Before:** 等位節3節が縦積みのみで並列性が弱かった  
**After:** 左縦線（2px solid）で3節が束ねられた並列表示  
**Evidence:** CONFIRMED — DOM測定 `border-left: 2px solid rgb(110, 110, 115)` + screenshot

### MAT 5:3

**Before:**
- `τῷ πνεύματι` が SUBJECT テキスト `"οἱ πτωχοὶ τῷ πνεύματι"` に埋め込まれていた
- ὅとι節の接続先不明（dashed border + インデントのみ）
- `τῶν οὐρανῶν` が ὅとι節 SUBJECT テキストに埋め込まれていた

**After:**
- main line: `Μακάριοι ╲(implied) οἱ πτωχοί`
- modifier zone 直下: `└ τῷ πνεύματι 副詞的修飾`
- 従属節前: `└ 従属節`
- ὅとι節 main line: `αὐτῶν ╲ ἐστιν | ἡ βασιλεία`
- ὅとι節 modifier zone: `└ τῶν οὐρανῶν 属格修飾`

**Evidence:** CONFIRMED — screenshot D_mat53_sentence.png / M_mat53_390.png

### EPH 2:8 s4

**Before:**
- 第2COMPLEMENT (θεοῦ τὸ δῶρον) が孤立（コネクタなし）
- `θεοῦ` が COMPLEMENT テキストに埋め込まれていた

**After:**
- main line: `τοῦτο ╲(implied) ἐξ ὑμῶν ╲(implied) τὸ δῶρον`
- modifier zone: `└ θεοῦ 属格修飾`

**Evidence:** CONFIRMED — `dg-conn-implied count: 2` (前: 1) + screenshot

---

## R-K/Leedy 原則カバレッジ 更新

P5-C audit との比較:

| 評価軸 | P5-C | P5-C.1 | 変化 |
|---|---|---|---|
| 等位節の並列構造表示 | B | B+ | ↑ 左縦線追加 |
| 語レベル修飾対角分離 | D | C | ↑ L-bracket + 分離表示 |
| 従属節の方向性ある接続 | C | B | ↑ L-bracket 追加 |
| IMPLIED CONNECTOR (verbless) | C(EPH s4) | B | ↑ F-01 修正 |
| complement対角線の視覚的明瞭さ | B | B | ↔ サイズ増加(UX微改善) |
| PP内部構造 | D | D | → DEFERRED (scope外) |
| 分詞の二重性マーキング | D | D | → DEFERRED (scope外) |

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

---

## DEFERRED — Scope 外

以下は P5-C audit で特定されたが今回スコープ外:

| Finding | 分類 | 理由 |
|---|---|---|
| F-04 PP内部構造（前置詞対角線） | FUTURE | DR拡張とレンダラの大幅変更が必要 |
| F-07 periphrastic分詞マーキング | FUTURE | 分詞専用の視覚文法が未定義 |
| PP構造の全般カバレッジ | FUTURE | 現在3聖句に限定されたP5 gate内 |

---

## 完了状態

```
STATE: BROWSER-VERIFIED

Implemented:
  ✅ F-01 BUG FIX (connectorBetween COMPLEMENT+COMPLEMENT+noVerb)
  ✅ WORD-LEVEL MODIFIER (extractSlotModifiers + headDisplayText + dg-slot-mod-zone)
  ✅ SUBORDINATE CLAUSE ATTACH (dg-adv-clause-attach)
  ✅ COORDINATION LEFT BORDER (dg-coord-wrap border-left)

Verified:
  ✅ Static: code review (dg-engine.js + index.html)
  ✅ Runtime: Playwright 1.62.1 / Chromium
  ✅ Desktop 1280px: JHN 1:1 / MAT 5:3 / EPH 2:8 / ROM 6
  ✅ Mobile 390px: JHN 1:1 / MAT 5:3
  ✅ Regression: ROM 6 fallback SD tree (27 sentences, 0 dg-clause, 0 errors)
  ✅ L-0: no implied elements, no inference, no reordering

Test results: 42/42 PASS, 0 FAIL

NEXT: STOP
AUTO-ADVANCE: NO
COMMIT/MERGE/DEPLOY: NO
```

---

*詳細: P5-C.1_visual_grammar_hardening.md / P5-C.1_test_matrix.md*  
*前提 audit: P5-C_final_report.md / P5-C_findings.md*
