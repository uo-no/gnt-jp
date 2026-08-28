# C-17 Step 4 — HDG Hierarchical Structure Consolidation — Final Report

**Phase:** C-17 — Hierarchical Diagram (HDG) Renderer  
**Date:** 2026-08-28  
**State:** FROZEN  
**Production code changes:** public/index.html のみ（CSS + JS）

---

## 概要

HDG Renderer（C-17 Steps 1〜3 で構築）の構造的完全性を確立した。

- fnラベルとコンテンツの分離問題を完全解消（hdg-slot 常時 column 化）
- group ノードの DOM ラッパー撤去（DocumentFragment 透過化）
- 6書ストレステスト + 3 viewport 検証 PASS

---

## 変更一覧

| 変更 | 種別 | 詳細 |
|---|---|---|
| `.hdg-slot` 常時 column 化 | UX | `flex-direction: column; align-items: flex-start; gap: .1rem` |
| `.hdg-group` CSS → `.hdg-slots > * + *` | REFACTOR | group が DOM に現れなくなるため |
| `_hdgGroupEl` → DocumentFragment | ARCHITECTURE | div ラッパーなし — 接続詞・等位節が親 slots の直接 sibling として表示 |
| `inSlot` から `isBlock` 判定削除 | REFACTOR | 常時 column のため判定不要 |

---

## QA 結果（DOM チェック）

| 書 | slots | --block | .hdg-group | wrongDir | SVG | abs | 判定 |
|---|---|---|---|---|---|---|---|
| JHN 1 | 548 | 0 | 0 | 0 | 0 | 0 | PASS |
| COL 1 | 230 | 0 | 0 | 0 | 0 | 0 | PASS |
| EPH 2 | 169 | 0 | 0 | 0 | 0 | 0 | PASS |
| MAT 28 | 208 | 0 | 0 | 0 | 0 | 0 | PASS |
| ROM 6 | 220 | 0 | 0 | 0 | 0 | 0 | PASS |
| PHP 2 | 241 | 0 | 0 | 0 | 0 | 0 | PASS |

RK 回帰: dg-view 57 > 0 ✓、hdg-view 0 ✓

---

## 確定事項（人間判断済み）

- **COL 1:1 NP_COMPLEX 横並び**：1024px では 同格 ブロックが横並び、390px では縦積み。NP_COMPLEX の column 化は行わない。この挙動を許容する。
- **COL 1:9 長大構造**：約 6600px 超の縦長。現段階では完全展開仕様を維持する。折りたたみは Step 5 以降。

---

## 絶対制約（全 Step 共通）

- dg-engine.js：変更なし
- SR JSON：変更なし
- RK Renderer：削除せず並行稼動
- SVG コネクタ（HDG内）：追加なし
- absolute positioning（HDG内）：使用なし
- L-0：Renderer による新規統語推論なし

---

## C-17 全 Step 完了状態

| Step | 内容 | 状態 |
|---|---|---|
| Step 1 | HDG Renderer 基盤、?view=hierarchical URL 取得修正 | FROZEN |
| Step 2 | CLAUSE_AS_NP→関係節、APPOSITION→同格、SUBORDINATE_CLAUSE→従属節、CONTENT_CLAUSE→内容節 | FROZEN |
| Step 3 | PP→前置詞句ブロック、hdg-slot--block（step 4で置換） | FROZEN |
| Step 4 | slot 常時 column 化、group DocumentFragment 透過化、6書ストレステスト | **FROZEN** |

---

## Step 5 未着手課題（記録のみ・実装なし）

- COL 1:9 等の長大節への折りたたみ機能
- NP_COMPLEX 内部の横並び/縦積み制御
- HDG から RK への切り替え UI（現在は URL パラメータのみ）
- HDG と memo 機能の接続（data-node-id は Step 4 時点で付与済み）
- HDG の印刷/エクスポート対応

---

*Committed: 2026-08-28*
