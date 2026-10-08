# C-17 Phase 2-C — Design Decisions

**Date:** 2026-09-01  
**State:** DESIGN → IMPLEMENTATION

---

## C-1: Reed–Kellogg 関係節接続

### 監査結果

| 確認項目 | 結果 |
|---|---|
| dg-engine.js を変更する必要があるか | **NO** |
| 既存 connector mechanism を再利用できるか | **YES** |
| renderer 側だけで安全に表現できるか | **YES (CSS のみ)** |

### 調査内容 (CONFIRMED)

`_dgDrawRelConnectors(app)` が `_renderStructuralDiagramView` の末尾で呼ばれており、関係節ごとに inverted-L SVG パスを描画している。

- DOM 確認（JHN 1 章）: `svgConnectors: 5`, `relClausesWithAntRef: 6`, `paths: 3`
- パス例: `M 120.3 324.8 L 120.3 455.7 L 60.0 455.7` — 先行詞下端から関係節左端への L 字接続
- データ属性: `.dg-token--antecedent[data-dg-ref]` ↔ `.dg-rel-clause[data-ant-ref]` で対応

C-16 設計上、`antecedentRef` がある関係節には L-bracket (`dg-adv-clause-attach`) を**意図的に付けない**（SVG が代替するため）。

### 現状の問題

Phase 2-B で `.dg-rel-clause` の border を除去したが、SVG path が `stroke-width:1.5; opacity:0.7` (inline style) で細くなっており、接続線が弱い。

### 解決策 (CSS のみ)

```css
.dg-rel-connector-svg path {
    stroke-width: 2 !important;
    opacity: 0.78 !important;
}
```

- CSS `!important` で inline style を上書き (仕様上有効)
- JS / dg-engine.js 変更なし
- 既存の `--color-domain` 色（#7a7aaa）はそのまま維持

---

## C-2: HDG root clause の読み始め明確化

### 現状評価

Phase 2-B で以下が実装済み:
- 主節: solid 3px border + 4% lavender 背景 + .78rem ラベル
- depth 1+: dashed、progressively lighter

**OBSERVED**: 主節の entry point としての識別は機能している。

### 残課題

root clause 内の fn ラベル（主語/述語/補語）が 70% opacity（他の depth と同じ）。
root clause の直接内容を視覚的に少し強調することで、「どこから読み始めるか」がより明確になる。

### 解決策 (CSS のみ)

```css
.hdg-clause--root > .hdg-slots .hdg-fn {
    opacity: 0.88;
}
```

root clause 直下の fn ラベルのみ 88% に引き上げる。sub-clause の fn ラベルは 70% のまま。

---

## C-3: ラベル過多の最終監査

### 判断基準の適用

「構造を理解する助けになるか」→ KEEP  
「視線を止めるノイズになっていないか」→ REDUCE / REMOVE

### ラベル別判断

| ラベル | モード | 判断 | 理由 |
|---|---|---|---|
| 主節 | HDG | **KEEP** | root entry point。削ると何が起点かわからない |
| 節/従属節/関係節/同格 etc. | HDG | **KEEP** | 構文タイプの識別に必要 |
| 前置詞句 | HDG | **KEEP (reduced)** | Phase 2-B で既に 50% opacity に削減済み |
| 主語/述語/補語 (fn) | HDG/RK | **KEEP** | 文法的役割の識別に必要 |
| 副詞的 (adv-fn) | RK | **REDUCE** | Phase 2-B で 58%。さらに 50% に削減 |
| sub-clause 内 slot-fn | RK | **REDUCE** | 主節のラベルより薄くすることで視覚的ヒエラルキーを強化 |
| depth 3+ clause labels | HDG | **REDUCE** | 60% → 48%。深い構造ではラベルよりテキストを主役に |

### 解決策 (CSS のみ)

```css
/* RK: 従属節・関係節内の fn ラベルを主節より薄く */
.dg-adv-clause .dg-slot-fn,
.dg-rel-clause .dg-slot-fn { opacity: 0.68; }

/* RK: 副詞的ラベルをさらに削減 (Phase 2-B: 0.58 → 0.50) */
.dg-adv-fn { opacity: 0.50; }

/* HDG: depth 3+ のラベルをさらに薄く */
.hdg-clause[data-hdg-depth="3"] > .hdg-clause-label,
.hdg-clause[data-hdg-depth="4"] > .hdg-clause-label,
.hdg-clause[data-hdg-depth="5"] > .hdg-clause-label,
.hdg-clause[data-hdg-depth="6"] > .hdg-clause-label,
.hdg-clause[data-hdg-depth="7"] > .hdg-clause-label { opacity: 0.48; }
```

---

## Phase 2-C 変更スコープ（CSS のみ）

- `public/index.html` の `</style>` 直前に Phase 2-C ブロック追加（約20行）
- JS / SR JSON / dg-engine.js 変更なし
- commit / push は Human Review 後

---

## 実装結果

### CONFIRMED

| 確認項目 | 結果 |
|---|---|
| 回帰テスト 9/9 | PASS |
| console errors | 0 |
| collapseBroken | 0 |
| hybrid DOM (.hdg-view と .dg-view の混在) | 0 |
| SVG コネクタ computedStrokeWidth | 2px (CSS !important 有効) ✓ |
| SVG コネクタ computedOpacity | 0.78 (CSS !important 有効) ✓ |

### OBSERVED (スクリーンショット確認)

- RK JHN 1:3: 紫の縦線が「一つ」（先行詞）から「関係節」ラベルへ描画 ✓
- 副詞的ラベル: 50% opacity で非常に控えめ ✓
- HDG MAT 28: depth 3 の「▼ 節」ラベルが 48% opacity でほぼ透明 ✓
- HDG EPH 2: 主語/繋辞/補語 fn ラベルが構造の読み取りに十分な視認性 ✓
- HDG COL 1: 前置詞句ラベルが 48% 以下で構造テキストが主役 ✓

**State: IMPLEMENTED → BROWSER-VERIFIED → HUMAN-REVIEW**  
**commit: NO / push: NO**
