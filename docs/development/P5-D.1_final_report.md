# P5-D.1 SR Coverage Boundary Audit — Final Report

**Phase:** P5 — Original Greek NT Diagram Grammar  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE (READ-ONLY)  
**Production code changes:** 0

---

## エグゼクティブサマリー

**P5-D.1 は P5-D で発見された3つの制約を「DG 実装の問題」と「SR データの表現限界」に切り分けた。**

中心原則 "DG must never infer structure that is not explicitly represented by SR" の下、NT 全260 SR ファイルを精査し、3つの明確な分類を得た。

> **A (関係詞先行詞): SR SCHEMA GAP** — データが SR に存在しない。DG 実装では解決不可。  
> **B (PP 内属格): RENDERER TRAVERSAL LIMITATION** — SR にデータが存在するが、DG traversal が fn=null 経路をスキップ。  
> **C-2 (形容詞的分詞): RENDERER COVERAGE GAP** — SR にデータが存在し DG が到達できるが `extractSlotModifiers` が未対応。

---

## 調査結果サマリー

### A — Relative Clause Antecedent Link: SR SCHEMA GAP

**調査規模:** NT 全書 関係代名詞 559件、全 SR スキーマフィールド精査

**決定的発見:**
- SR スキーマに `antecedentId`、`coref`、`link`、`target` 等のフィールドは**皆無**
- `RELATIVE_CLAUSE` construction は NT SR に存在しない（17種 construction 一覧に含まれない）
- 関係代名詞は `fn=SUBJECT/OBJECT/ADVERBIAL` として自節内に存在するだけ
- 先行詞への参照は SR に一切存在しない

**結論:** DG は SR から先行詞情報を取得する手段が存在しない。先行詞コネクタ表示には SR schema の拡張（`antecedentId` 等の新フィールド）が必要。P6 以降の別 Phase で SR 設計者が判断すべき事項。

---

### B — PP Internal Genitive Attachment: RENDERER TRAVERSAL LIMITATION

**調査規模:** NT 全書 PP+GENITIVE_MOD 575件、P5-gate 章 9件

**決定的発見:**

| 統計 | 値 |
|---|---|
| NT 全書 PP+GENITIVE_MOD | 575件 |
| DG 可達（fn=null なし祖先） | 34件 (6%) |
| DG 不可達 | 541件 (94%) |
| P5-gate 章 PP+GENITIVE_MOD | 9件 |
| P5-gate 章で DG 可達 | **0件** |

- SR は `ἐν μορφῇ θεοῦ` を `phrase.pp cn=PREP_PHRASE { ἐν, phrase.np cn=GENITIVE_MOD { μορφῇ [N-DSF], θεοῦ [N-GSM] } }` として正確に表現
- `extractSlotModifiers` の Case A コードは GENITIVE_MOD を正しく処理できる
- 問題は上流 traversal: PHP 2:5 の root.children[2] が fn=null のため `deriveClauseCore` がスキップ
- fn=null clause 子は NT 全書に 6,215件存在（根深い設計的特性）

**結論:** SR データは完全かつ正確。DG の `deriveClauseCore` が fn=null の clause 子をスキップするため到達不可。fn=null clause の traversal 処理には慎重な設計判断が必要（discourse-level の並置節まで誤って描画するリスクあり）。

---

### C — Participial Attachment Target

**C-1. 副詞的分詞: SR 充足 + DG 実装済み**

- SR: `clause fn=ADVERBIAL` 内に分詞 PREDICATE → 明示的副詞的機能
- 付着先: 同一 parent clause の主動詞（tree 包含で暗示）
- DG: L-bracket + `分詞節` ラベル（P5-D 実装済み）

副詞的分詞の付着先への明示的ポインタは SR にないが、tree 包含が十分な情報を提供しており、L-0 違反なしに描画可能。

**C-2. 形容詞的分詞: RENDERER COVERAGE GAP**

**調査規模:** NT 全書 ADJ_MOD 内分詞 138件、P5-gate 章 2件

| 箇所 | テキスト | morph | fn | 可達性 | 現在の表示 |
|---|---|---|---|---|---|
| JHN 1:6 | ἀπεσταλμένος | V-RPP-NSM | PREDICATE (clause child) | ✅ 可達 | 全テキスト一括 |
| EPH 2:4 | ὑπερβάλλον | V-PAP-ASN | PREDICATE (clause child) | ✅ 可達 | 全テキスト一括 |

- SR: `phrase.np cn=ADJ_MOD { head_noun_token, clause { PREDICATE 'ἀπεσταλμένος' ... } }` が明示的な名詞修飾関係を表現
- DG: 該当スロットは fn=SUBJECT を持ち `deriveClauseCore` から正常に到達できる
- 問題: `extractSlotModifiers` が ADJ_MOD construction を処理しない（Case A=GENITIVE_MOD, B=ADV_MOD, C=GENITIVE_MOD 子 のみ）

**結論:** SR に明示データあり、DG 到達可能。`extractSlotModifiers` に Case D（ADJ_MOD）を追加することで解決可能。L-0 違反なし（SR の ADJ_MOD が explicit な名詞付着を示す）。影響範囲が小さく P5-E の優先候補。

---

## 3分類の意味と行動指針

```
SR SCHEMA GAP
  ↓ 必要なもの: SR 設計者による新フィールド追加
  ↓ 行動: P6 以降に SR schema 仕様策定
  例: antecedentId, coref リンク

RENDERER TRAVERSAL LIMITATION
  ↓ 必要なもの: fn=null 節の traversal 方針の設計判断
  ↓ 行動: P5-E で設計判断（リスク評価必須）
  例: どの fn=null clause を traversal 対象とするか

RENDERER COVERAGE GAP
  ↓ 必要なもの: extractSlotModifiers の Case D 追加
  ↓ 行動: P5-E で実装（影響小）
  例: phrase.np cn=ADJ_MOD の head/modifier 分離
```

---

## 自動回帰テスト

audit は read-only。production コード変更なし。

| スイート | PASS | FAIL |
|---|---|---|
| `test:re-phase1` | 217 | 0 |
| `test:re-phase2` | 78 | 0 |
| `test:re-stageB` | 47 | 0 |
| `test:flow-dom` | 62 | 0 |
| **合計** | **404** | **0** |

---

## 禁止事項の遵守確認

| 禁止項目 | 状態 |
|---|---|
| Production コード変更 | 変更なし ✅ |
| SR データ変更 | 変更なし ✅ |
| commit / merge / deploy | 実施せず ✅ |
| P5-E への自動進行 | 実施せず ✅ |
| L-0 違反（推論によるデータ補完） | 実施せず ✅ |

---

## P5-D.1 完了状態

```
STATE: AUDIT-COMPLETE

Investigated:
  ✅ A: Relative clause antecedent link — SR SCHEMA GAP confirmed
  ✅ B: PP internal genitive (575 cases) — RENDERER TRAVERSAL LIMITATION confirmed
  ✅ C-1: Adverbial participle attachment — SR sufficient, DG implemented (P5-D)
  ✅ C-2: Adjectival participle (ADJ_MOD, 138 cases) — RENDERER COVERAGE GAP confirmed

Evidence basis:
  ✅ NT 全260 SR ファイル完全走査
  ✅ 関係代名詞 559件
  ✅ 分詞トークン 5,722件
  ✅ PP+GENITIVE_MOD 575件
  ✅ 自動回帰 404/404 PASS
  ✅ production コード変更 0行

NEXT: STOP — 人間レビュー待ち
AUTO-ADVANCE: NO
COMMIT/MERGE/DEPLOY: NO
```

---

*詳細: P5-D.1_sr_coverage_boundary.md / P5-D.1_test_matrix.md*  
*前提: P5-D_final_report.md / P5-D_visual_grammar_core.md*
