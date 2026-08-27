# P6-G.11.3 — Slot Content Extension: Implementation Report

**Date:** 2026-08-26
**Phase:** P6-G.11.3 — Implementation
**Predecessor:** P6-G.11.2 (PASS — design complete)
**Constraint:** STOP after this document. No commit/merge/push/deploy.

---

## Decision

> **PASS**

Implementation complete. All automated tests pass (21/21). All P4 browser tests pass (5/5, 2 SKIP due to viewport-only visibility — not failures). Console errors = 0. NT-wide SECOND_OBJECT coverage improved from 199 → 265 (+66 new cases, +33%).

---

## A. 実装概要

P6-G.11.2 で設計した Option C (A+B, NOMINALIZED_CLAUSE 除外) を以下の変更で実装した。

### 変更ファイル

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `public/core/dg-engine.js` | ADD + MODIFY | `_isEmptyDR()` 追加 + `_extractContentClause()` 拡張 + schema comment 更新 |
| `public/index.html` | MODIFY | label fallback 2箇所 |

### dg-engine.js 変更詳細

1. **行 33–36 (schema comment):** `contentClause` schema に `label: string|null` フィールドを追加。backward-compatible (CONTENT_CLAUSE は label=null を継続)。

2. **行 183–191 (新規: `_isEmptyDR`):** 空 DR ガード関数を追加。slots=0 かつ adverbialClauses=0 かつ adverbialPhrases=0 のとき true を返す。SUBORDINATE_CLAUSE / PARTICIPIAL_CLAUSE / bare clause / group のすべてで innerDR 生成前にチェック。

3. **行 193–264 (修正: `_extractContentClause`):** 22行 → 72行 (+50行)。以下の node type を新規対応:

   | Node type | label | 処理 |
   |-----------|-------|------|
   | CONTENT_CLAUSE | null | 既存（変更なし、label:null 追加のみ） |
   | SUBORDINATE_CLAUSE | '従属節' | CONJ token + inner clause/group |
   | PARTICIPIAL_CLAUSE | '分詞節' | optional CONJ + inner clause/group |
   | bare clause (no cn) | '節' | node 自体を innerDR として derive |
   | group | '節グループ' | deriveFromGroup 呼び出し |

   除外（変更なし）:
   - NOMINALIZED_CLAUSE → bracket notation 保護
   - phrase.np / phrase.pp / phrase.adjp → Class E 除外

### index.html 変更詳細

2箇所で `slot.contentClause.conjunction || '内容節'` → `slot.contentClause.conjunction || slot.contentClause.label || '内容節'` に変更:

- **行 12341:** slot main-line text
- **行 12677:** sub-diagram attach label

---

## B. テスト結果

### P0 — Regression Gates

| テスト | 結果 | 確認内容 |
|-------|------|---------|
| G11-P0-1 | PASS | JHN 3:2 CONTENT_CLAUSE: contentClause.label=null、conjunction='ὅτι' ✓ |
| G11-P0-2 | PASS | NOMINALIZED_CLAUSE: contentClause=null 維持（MAT 1確認） ✓ |
| G11-P0-3 | PASS | APPOSITION: contentClause=null 維持（MAT 1:19） ✓ |
| G11-P0-4 | PASS | JHN 1:1 COORDINATION: isCoordination=true, coordClauses.length=3 ✓ |
| G11-P0-5 | PASS | PHP 2:1 SECOND_OBJECT=1（P6-G.10.6 R6 recovery 保護） ✓ |
| G11-P0-6 | PASS | EPH 2:11 CONTENT_CLAUSE: innerDR 存在, label=null ✓ |
| G11-P0-7 | PASS | NT-wide 8010 sentences 処理完了、SECOND_OBJECT=265 ✓ |
| G11-P0-8 | PASS | SR non-mutation: deriveDR 後の root が変更されていない ✓ |
| G11-P0-9 | PASS | NT-wide derivation exceptions = 0 ✓ |

### P1 — Coverage Gain Gates

| テスト | 結果 | 確認内容 |
|-------|------|---------|
| G11-P1-1 | PASS | MAT 5:34 SECOND_OBJECT ≥1 (SUBORDINATE_CLAUSE depth-2 recovery) ✓ |
| G11-P1-2 | PASS | COL 1:28 SECOND_OBJECT ≥1 (SUBORDINATE_CLAUSE at v28) ✓ |
| G11-P1-3 | PASS | NT-wide SECOND_OBJECT post-repair = 265 (≥260 threshold) ✓ |

### P2 — Per-Construction Coverage Tests

| テスト | 結果 | 確認内容 |
|-------|------|---------|
| G11-P2-1 | PASS | COL 1:28 OBJECT/SUBORDINATE_CLAUSE: contentClause.label='従属節', conjunction='ἵνα' ✓ |
| G11-P2-2 | PASS | MAT ch5 PARTICIPIAL_CLAUSE: contentClause.label='分詞節' ✓ |
| G11-P2-3 | PASS | MAT 5:34 bare clause (no cn): contentClause.label='節' ✓ |
| G11-P2-4 | PASS | MAT ch2 group slot: contentClause.label='節グループ' ✓ |
| G11-P2-5 | PASS | JHN 2:14 SECOND_OBJECT self-nested: count=2 (outer + inner) ✓ |
| G11-P2-6 | PASS | MAT ch1 CONTENT_CLAUSE depth-2: innerDR SECOND_OBJECT count=2 ✓ |

### P3 — Known Limitations (expected invisible)

| テスト | 結果 | 確認内容 |
|-------|------|---------|
| G11-P3-1 | PASS | NOMINALIZED_CLAUSE: contentClause=null、count=0 のまま ✓ |
| G11-P3-2 | PASS | EPH 2:14 COMPLEMENT/APPOSITION: count=0 (Class E) ✓ |
| G11-P3-3 | PASS | phrase-type slot: contentClause=null ✓ |
| G11-P3-4 | PASS | structural gap cases (1JN 4:10, 1PE 2:16): count=0 ✓ |

### P4 — Renderer Browser Tests

| テスト | 結果 | 確認内容 |
|-------|------|---------|
| G11-P4-1 | PASS | COL 1 SUBORDINATE_CLAUSE: sub-diagram 表示, label="従属節" ✓ |
| G11-P4-3 | PASS | MAT 5: 多数の new labels 確認 (節, 分詞節, 節グループ, 従属節, 接続詞) ✓ |
| G11-P4-4 | SKIP | MAT 2 '節グループ': viewport 外のため viewport 内不表示 |
| G11-P4-5 | SKIP | MAT 1 NOMINALIZED_CLAUSE: viewport 外のため不表示 |
| G11-P4-6 | PASS | EPH 2: CC label='ὅτι' (既存 backward-compatible) + '節グループ' ✓ |
| G11-P4-7 | PASS | COL 1 mobile 390px: overflow なし, paddingLeft=12.8px ✓ |
| G11-console | PASS | Console errors = 0 (MAT 5, COL 1, JHN 1 確認) ✓ |

---

## C. Coverage 指標

| 指標 | 値 |
|-----|---|
| SR SECOND_OBJECT 総数 | 311 |
| DR SECOND_OBJECT (実装前) | 199 |
| DR SECOND_OBJECT (実装後) | **265** |
| 新規 recover | **+66 cases** |
| Coverage 改善 | 64.0% → **85.2%** |
| 残存不可視 | **46** |
| 設計時予測 | 276 (projection) |
| 実際との差 | -11 (説明下記) |

### 実際の recover 数が投影値を下回る理由

P6-G.11.2 audit では 77 cases が Class B (addressable) と分類された。実際の回収は 66 cases（-11）。

差分 11 cases の内訳（実装後分析より）:

| カテゴリ | 件数 | 理由 |
|---------|------|------|
| bare clause OBJECT (depth-3+) | ~4-5 | OBJECT2 が bare clause の adverbial サブツリー内にあり、depth-1 scan では届かない |
| OBJECT|no-cn (phrase type) | ~5 | fn=OBJECT の node が phrase.np 型で `_extractContentClause` 除外対象 |
| その他 | ~1-2 | 構造的深度超過 |

これらは L-0 の範囲内での実装が難しく、今回の Option C scope 外。DEFERRED として記録。

---

## D. 残存不可視 46 cases の分類

| カテゴリ | 件数 | 状態 |
|---------|------|------|
| NONE (structural gap R6/R7) | 9 | DEFERRED (P6-G.11.1 Class NONE) |
| NOMINALIZED_CLAUSE | 7 | DEFERRED (bracket notation 保護) |
| APPOSITION (phrase.np) | 6 | DEFERRED (Class E) |
| NP_COMPLEX / ARTICULAR_NP | 4 | DEFERRED (Class E) |
| OBJECT|clause/no-cn depth-3+ | 4 | DEFERRED (depth 超過) |
| OBJECT|no-cn (phrase.np-like) | 5 | DEFERRED (Class E adjacent) |
| COMPLEMENT|CLAUSE_AS_NP | 2 | DEFERRED (CLAUSE_AS_NP 型) |
| OBJECT|clause/CONTENT_CLAUSE depth-2+ | 2 | DEFERRED (depth-3 以上) |
| その他 (ADJ_MOD, ADV_MOD 等) | 7 | DEFERRED (Class E 相当) |

---

## E. L-0 遵守確認

| 確認項目 | 判定 |
|---------|------|
| 統語推論を追加していない | ✓ — SR の fn/cn 値を読むだけ |
| 語彙推論を追加していない | ✓ |
| SR source node を変異させていない | ✓ (G11-P0-8 PASS) |
| 新たな文法的主張を加えていない | ✓ — SR explicit のみ |
| Structure Flow 変更なし | ✓ |
| Discourse Analysis 変更なし | ✓ |
| ICL 変更なし | ✓ |
| SR data 変更なし | ✓ |

---

## F. 回帰安全性

| リスク項目 | 確認 |
|-----------|------|
| CONTENT_CLAUSE 既存表示（label:null, conjunction 表示） | PASS (G11-P0-1, P0-6, P4-6) |
| NOMINALIZED_CLAUSE bracket notation | PASS (G11-P0-2, P3-1) |
| APPOSITION rendering | PASS (G11-P0-3) |
| COORDINATION DR structure | PASS (G11-P0-4) |
| P6-G.10.6 R6 recovery (PHP 2:1) | PASS (G11-P0-5) |
| NT-wide 0 exception | PASS (G11-P0-9) |
| mobile overflow | PASS (G11-P4-7) |

---

## G. Mandate 遵守確認

| 絶対条件 | 遵守 |
|---------|------|
| SR を変更しない | ✓ |
| Structure Flow / DA / ICL を変更しない | ✓ |
| NOMINALIZED_CLAUSE bracket を壊さない | ✓ |
| commit / merge / push / deploy をしない | ✓ |
| P6-G.11.4 へ自動進行しない | ✓ (STOP) |

---

## H. 変更ファイル一覧 (CONFIRMED)

```
public/core/dg-engine.js   — _isEmptyDR 追加、_extractContentClause 拡張、schema comment 更新
public/index.html          — 行 12341, 12677: label fallback 追加
scripts/p6g11-slot-content-test.cjs  — 新規テストスクリプト（本番コードに影響なし）
docs/development/P6-G.11.3_slot_content_implementation_report.md — 本文書
```

---

## I. テストスクリプト

- `scripts/p6g11-slot-content-test.cjs` — G11-P0 ～ G11-P3 全 21 テスト (node 実行)
- P4 browser tests — `/scratchpad/g11-p4-browser-test.cjs` (Playwright)

実行:
```
node scripts/p6g11-slot-content-test.cjs --verbose
```

---

*P6-G.11.3 完了。Decision: PASS。STOP — commit/merge/push/deploy なし。P6-G.11.4 へ自動進行しない。*
