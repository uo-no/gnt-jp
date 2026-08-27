# P5-E DG Renderer Coverage Extension — Final Report

**Phase:** P5 — Original Greek NT Diagram Grammar  
**Date:** 2026-08-20  
**State:** BROWSER-VERIFIED  
**Production code changes:** 1 file (dg-engine.js)

---

## エグゼクティブサマリー

**P5-E は P5-D.1 が分類した2つの RENDERER 制約を解消した。**

P5-D.1 audit が「SR データが存在するが DG が到達/描画できない」と分類した制約のうち、SR schema 変更なしに解決可能な2件を実装した。

> **P5-E-1 (RENDERER TRAVERSAL LIMITATION 解消):** fn=null 構造コンテナの traversal を許可し、その内部の fn-marked 子孫を DG で到達・描画可能にした。  
> **P5-E-2 (RENDERER COVERAGE GAP 解消):** `extractSlotModifiers` に Case D (ADJ_MOD) を追加し、SR の `phrase.np cn=ADJ_MOD` construction を modifier zone に正しく描画するようにした。

---

## 調査結果サマリー (P5-D.1 → P5-E)

### P5-D.1 分類の処理状況

| 制約 | P5-D.1 分類 | P5-E での処理 |
|---|---|---|
| 関係詞先行詞コネクタ | SR SCHEMA GAP | 対象外 — SR schema 変更なしに実装不可 |
| PP 内 GENITIVE_MOD | RENDERER TRAVERSAL LIMITATION | ✅ P5-E-1 で解消 |
| 形容詞的分詞 ADJ_MOD | RENDERER COVERAGE GAP | ✅ P5-E-2 で解消 |

---

## 実装サマリー

### P5-E-1 — fn=null Structural Traversal ✅ IMPLEMENTED

**変更:** `dg-engine.js` — `deriveClauseCore`

**変更前:**
```javascript
const fn = child.function?.canonical;
if (!fn) continue;   // fn=null 節を全スキップ
```

**変更後:**
```javascript
const fn = child.function?.canonical;
if (!fn) {
    // P5-E-1: fn=null structural container — traverse to reach fn-marked descendants
    if (child.type === 'clause' || child.type === 'group') {
        const sub = deriveFromNode(child);
        if (sub) adverbialClauses.push(sub);
    }
    continue;
}
```

**原則遵守:**
- fn=null node 自身に function を付与しない
- 子孫の function を親へ継承/昇格しない
- fn=null から `deriveFromNode` を呼び出し、結果を `adverbialClauses` として追加するのみ

**実証 (PHP 2):**
- `ἐν μορφῇ θεοῦ` (PHP 2:5): root → fn=null [.2] → fn=null [.2.0] → fn=ADVERBIAL [.2.0.1] → PREP_PHRASE という経路が開通
- `μορφῇ` が PP NP head として表示 ✅
- `θεοῦ` が `属格修飾` modifier として表示 ✅
- PHP 2 dg-clause 数: 28 → 59 (fn=null 節の描画開始による増加)

---

### P5-E-2 — ADJ_MOD Coverage ✅ IMPLEMENTED

**変更:** `dg-engine.js` — `_extractAdjMod` 追加 + `extractSlotModifiers` Case D + Case C 拡張

**追加ヘルパー:**
```javascript
function _extractAdjMod(children, headSIs, modifiers) {
    for (const child of children) {
        if (child.type === 'clause') {
            modifiers.push({ node: child, label: '形容詞的修飾', si: minSI(child) });
        } else if (child.type === 'token') {
            const childFn = child.function?.canonical;
            if (childFn === 'PREDICATE' || childFn === 'COPULA') {
                modifiers.push({ node: child, label: '形容詞的修飾', si: child.surfaceIndex });
            } else {
                headSIs.add(child.surfaceIndex);
            }
        } else {
            getTokens(child).forEach(t => headSIs.add(t.surfaceIndex));
        }
    }
}
```

**2つの ADJ_MOD パターンをカバー:**

| パターン | 代表ケース | 構造 | 処理 |
|---|---|---|---|
| Pattern 1 | JHN 1:6 `ἀπεσταλμένος` | ADJ_MOD が直接 fn-slot。clause child が modifier | Case D |
| Pattern 2 | EPH 2:7 `ὑπερβάλλον` | ADJ_MOD が GENITIVE_MOD 内にネスト。fn=PREDICATE token が modifier | Case C 拡張 |

**実証:**
- JHN 1:6: main line = `ἄνθρωπος` のみ ✅、mod zone = `形容詞的修飾: ἀπεσταλμένος παρὰ θεοῦ,` ✅
- EPH 2:7: mod zone = `形容詞的修飾: ὑπερβάλλον` ✅

---

## NT-wide Coverage 変化

| 指標 | P5-D.1 後 (P5-E 前) | P5-E 後 | 差分 |
|---|---|---|---|
| PP+GENITIVE_MOD reachable | 34/575 (6%) | 571/630 (91%) | **+85pp** |
| ADJ_MOD participle reachable | 低い (~6%) | 413/439 (94%) | **大幅改善** |

P5-E-1 の fn=null traversal が PP+GENITIVE_MOD の到達可能性を 6% から 91% へ引き上げた。  
P5-E-2 の ADJ_MOD Case D + Case C 拡張が ADJ_MOD 分詞の描画率を 94% まで引き上げた。

---

## 自動回帰テスト

| スイート | PASS | FAIL |
|---|---|---|
| `test:re-phase1` | 217 | 0 |
| `test:re-phase2` | 78 | 0 |
| `test:re-stageB` | 47 | 0 |
| `test:flow-dom` | 62 | 0 |
| **合計** | **404** | **0** |

---

## P5-D 継続検証

| 検証項目 | P5-D 後 | P5-E 後 | 状態 |
|---|---|---|---|
| JHN 1 dg-clause 数 | 49 | 119 | ✅ (P5-E-1 fn=null traversal で増加) |
| PHP 2 dg-clause 数 | 28 | 59 | ✅ (fn=null 節追加) |
| PHP 2 PP preps | 7 | 16 | ✅ (fn=null 節内 PP も描画) |
| MAT 28 dg-clause 数 | 32 | 60 | ✅ (fn=null 節追加) |
| MAT 28 participial slots | 9 | 11 | ✅ (追加のみ) |
| MAT 28 participial adv-clauses | 6 | 8 | ✅ (追加のみ) |
| MAT 28 `πορευθέντες` | ✅ | ✅ | ✅ 維持 |
| MAT 28 `βαπτίζοντες` | ✅ | ✅ | ✅ 維持 |
| MAT 28 `διδάσκοντες` | ✅ | ✅ | ✅ 維持 |
| COL 1 dg-clause | 11 | 23 | ✅ (fn=null 節追加) |
| EPH 2 mod-zone 数 | 2 | 4 | ✅ (P5-E-1+P5-E-2 追加分) |
| ROM 6 dg-clause (gate 外) | 0 | 0 | ✅ 維持 |
| ROM 6 sd-sentence | 27 | 27 | ✅ 維持 |

**注:** P5-E-1 fn=null traversal により、全 P5-gate 章で dg-clause 数が増加している。これは fn=null 構造コンテナが従来スキップされていた節を描画開始したためであり、既存の描画内容の削除・変更は発生していない（追加のみ）。

---

## R-K/Leedy 原則カバレッジ 更新

| 評価軸 | P5-D | P5-E | 変化 |
|---|---|---|---|
| 等位節の並列構造表示 | B+ | B+ | ↔ |
| 語レベル修飾対角分離 | C | C+ | ↑ ADJ_MOD modifier zone 追加 |
| 従属節の方向性ある接続 | B | B+ | ↑ fn=null 節が `従属節`/`分詞節` として描画 |
| IMPLIED CONNECTOR (verbless) | B | B | ↔ |
| PP内部構造 | C | C+ | ↑ fn=null 経路内 PP も描画 |
| 分詞の二重性マーキング | C | C | ↔ |
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
| fn=null への function 付与 | 実施せず ✅ |
| function の継承/昇格 | 実施せず ✅ |
| antecedent / coref / link 追加 | 実施せず ✅ |
| 統語推論 | 実施せず ✅ |
| L-0 違反 | 実施せず ✅ |
| commit / merge / deploy | 実施せず ✅ |
| auto-advance to P5-F | 実施せず ✅ |

---

## DEFERRED / DESIGN GAP (変更なし)

| Finding | 分類 | 状態 |
|---|---|---|
| 関係代名詞→先行詞コネクタ | SR SCHEMA GAP | P6 以降。SR schema 変更が必要 |

---

## 完了状態

```
STATE: BROWSER-VERIFIED

Implemented:
  ✅ P5-E-1 fn=null STRUCTURAL TRAVERSAL (deriveClauseCore)
  ✅ P5-E-2 ADJ_MOD CASE D (slot IS ADJ_MOD — JHN 1:6 pattern)
  ✅ P5-E-2 ADJ_MOD CASE C EXTENSION (ADJ_MOD inside GENITIVE_MOD — EPH 2:7 pattern)
  ✅ _extractAdjMod helper (shared between Case D and Case C extension)

Verified:
  ✅ Static: code review (dg-engine.js)
  ✅ Runtime: Playwright 1.62.1 / Chromium
  ✅ Desktop 1280px: PHP 2 / JHN 1 / EPH 2 / MAT 28 / COL 1
  ✅ Mobile 390px: PHP 2 / JHN 1 (no overflow)
  ✅ Regression: 404/404 PASS (re-phase1 + re-phase2 + re-stageB + flow-dom)
  ✅ P5-D continuity: MAT 28 / PHP 2 / EPH 2 / COL 1 / ROM 6 all preserved
  ✅ NT-wide coverage: PP+GENMOD 91%, ADJ_MOD 94%
  ✅ L-0: no inference, no fn promotion, no new inference rules

NEXT: STOP — 人間レビュー待ち
AUTO-ADVANCE: NO
COMMIT/MERGE/DEPLOY: NO
```

---

*詳細: P5-E_renderer_coverage.md / P5-E_test_matrix.md*  
*前提: P5-D.1_final_report.md / P5-D_final_report.md*
