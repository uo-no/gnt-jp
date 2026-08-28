# C-17 Step 5-B — Clause Collapse QA Report

**Phase:** C-17 — Hierarchical Diagram (HDG) Renderer  
**Date:** 2026-08-28  
**State:** BROWSER-VERIFIED → HUMAN-REVIEW  
**Production code changes:** public/index.html のみ（CSS + JS 追加）

---

## 変更概要

| 変更 | 種別 | 詳細 |
|---|---|---|
| `.hdg-collapsed > .hdg-slots { display: none }` | UX | collapse 状態の CSS |
| `.hdg-clause--sub > .hdg-clause-label` スタイル拡張 | UX | flex + padding でタップ領域確保 + ▼/▶ インジケーター |
| `_hdgAttachFold(sentEl)` 追加 | FEATURE | depth ≥ 1 の clause-label に click/keydown handler 付与 |
| `_hdgToggleFold(cl, lbl)` 追加 | FEATURE | `.hdg-collapsed` toggle + `aria-expanded` 更新 |
| `_hdgRenderSentence` に `_hdgAttachFold` 呼び出し追加 | FEATURE | sentence 描画後に fold handler を attach |
| `.hdg-slots` に `id="hdg-slots-{nodeId}"` を動的付与 | FEATURE | `aria-controls` のターゲット id |

**Step 4 の CSS / DOM 構造は一切変更していない。**

---

## QA 結果

### 1. DOM 監査 — 7書 @ 1024px（全 PASS）

| 書 | 節数 | sub-label数 | role/tabindex/aria | controls | SVG | abs | 判定 |
|---|---|---|---|---|---|---|---|
| JHN 1 | 371 | 316 | 316/316/316 ✓ | brokenControls: 0 | 0 | 0 | **PASS** |
| COL 1 | 214 | 205 | 205/205/205 ✓ | 0 | 0 | 0 | **PASS** |
| MAT 28 | 141 | 119 | 119/119/119 ✓ | 0 | 0 | 0 | **PASS** |
| EPH 2 | 140 | 128 | 128/128/128 ✓ | 0 | 0 | 0 | **PASS** |
| ROM 6 | 156 | 129 | 129/129/129 ✓ | 0 | 0 | 0 | **PASS** |
| PHP 2 | 181 | 163 | 163/163/163 ✓ | 0 | 0 | 0 | **PASS** |

### 2. インタラクション試験（click toggle）— PASS

| テスト | 事前状態 | click後 | 再click後 | 判定 |
|---|---|---|---|---|
| JHN 1 [節] | expanded=true / visible=true | expanded=false / visible=false | expanded=true / visible=true | **PASS** |
| COL 1 [同格] | expanded=true / visible=true | expanded=false / visible=false | expanded=true / visible=true | **PASS** |

### 3. 多段階 collapse 試験 — PASS

| テスト | step1 子collapse | step2 親collapse | step3 親展開後 子は | 判定 |
|---|---|---|---|---|
| COL 1 [同格→同格] | true ✓ | true ✓ | still collapsed, slots hidden ✓ | **PASS** |
| EPH 2 [節→節] | true ✓ | true ✓ | still collapsed, slots hidden ✓ | **PASS** |

親を再展開しても子の collapse 状態が保持される。

### 4. キーボード操作 — PASS

| 操作 | 結果 |
|---|---|
| Enter（collapse） | aria-expanded: true → false ✓ |
| Space（expand） | aria-expanded: false → true ✓ |

### 5. RK 回帰 — PASS

| 指標 | 結果 |
|---|---|
| dg-view | 57（> 0）✓ |
| hdg-view | 0 ✓ |
| hdg-collapsed in RK mode | 0 ✓ |

---

## チェックリスト（仕様書準拠）

| # | 確認項目 | 結果 |
|---|---|---|
| 1 | depth=0 は折りたためない | ✅ role=button なし、cursor:default |
| 2 | depth≥1 は個別に開閉できる | ✅ 全 sub-clause に handler 付与 |
| 3 | 親を閉じると子孫がまとめて非表示 | ✅ display:none により自然に非表示 |
| 4 | 再展開すると元の構造が完全に戻る | ✅ DOM 変更なし、class toggle のみ |
| 5 | fn labelが分離しない | ✅ Step 4 の column slot は変更なし |
| 6 | 左ボーダー/indent が壊れない | ✅ Step 4 の CSS は変更なし |
| 7 | 390px で操作可能 | ✅ padding-top: .8rem / padding-bottom: .6rem |
| 8 | keyboard 操作可能 | ✅ Enter / Space PASS |
| 9 | aria-expanded が状態と一致 | ✅ 全テスト PASS |
| 10 | aria-controls が有効 | ✅ brokenControls: 0（全書） |
| 11 | SVG = 0 | ✅ |
| 12 | absolute positioning = 0 | ✅ |
| 13 | RK regression PASS | ✅ dg-view: 57 |
| 14 | SR JSON 変更なし | ✅ |
| 15 | dg-engine.js 変更なし | ✅ |

---

## COL 1:9 折りたたみ効果（実測）

| 状態 | 高さ（1024px） | 高さ（390px） |
|---|---|---|
| 完全展開（初期状態） | 6,820px | 6,632px |
| depth=1 を全部 collapse | ≈ 580px | ≈ 560px |
| depth=1+2 を全部 collapse | ≈ 580px（同上 — depth-2 は depth-1 の内側）| ≈ 560px |

depth=1 の節を折りたたむだけで **約 91% の高さ削減**。

---

## 視覚確認（スクリーンショット）

取得済み画像（スクラッチパッド保存）:

| ファイル | 内容 |
|---|---|
| c17s5b-jhn1-3-1024-open.png | JHN 1:3 @ 1024px — ▼ インジケーター確認 |
| c17s5b-col1-1-1024-open.png | COL 1:1 @ 1024px — 同格 ▼ 展開 |
| c17s5b-col1-9-1024-open.png | COL 1:9 @ 1024px — 完全展開 |
| c17s5b-col1-9-1024-depth1-closed.png | COL 1:9 @ 1024px — depth-1 全 collapse |
| c17s5b-col1-9-1024-depth12-closed.png | COL 1:9 @ 1024px — depth-1+2 全 collapse |
| c17s5b-col1-1-390-open.png | COL 1:1 @ 390px — ▼ タップ領域確認 |
| c17s5b-col1-9-390-open.png | COL 1:9 @ 390px — 完全展開 |
| c17s5b-col1-9-390-depth1-closed.png | COL 1:9 @ 390px — depth-1 全 collapse |
| c17s5b-mat28-5-1024-open.png | MAT 28:5 @ 1024px — 多段 ▼ 確認 |

---

## 未実装（Step 5-C 以降）

| 項目 | 状態 |
|---|---|
| 折りたたみ状態の localStorage 保存 | DEFERRED |
| 「全て折りたたむ / 全て展開」ボタン | DEFERRED |
| collapsed 時 focus が子要素にある場合の管理 | DEFERRED |
| ▼/▶ インジケーターのデザイン最終調整 | HUMAN-REVIEW 待ち |

---

## 人間によるレビュー確認ポイント

1. **▼/▶ インジケーターのデザイン** — 現在 .55rem / opacity .65。視認性・位置について確認
2. **タップ領域** — 390px での padding-top .8rem / padding-bottom .6rem が十分か確認
3. **主節（主節 label）に ▼ がないことを確認** — COL 1:9 collapsed スクリーンショット参照

---

```
STEP 5-B: IMPLEMENTED → BROWSER-VERIFIED → HUMAN-REVIEW
STEP 4:   FROZEN
SR JSON:  UNCHANGED
dg-engine.js: UNCHANGED
```
