# P6-F.1 — PP Diagonal Relationship Matrix

**Phase:** P6-F.1 — PP Diagonal Notation  
**Date:** 2026-08-25  
**State:** AUDIT-COMPLETE

---

## 1. SR → DR → Renderer パイプライン

```
SR (bible_data/sr/)
  construction.canonical = 'PREP_PHRASE'
  children[0] = token (前置詞)
  children[1..n] = NP children
        ↓
core/dg-engine.js
  extractPPStructure(node)
    → { prepToken, npNode } | null
  deriveDR() → advPhrases[]
    → adv.ppPrep = prepToken.text
    → adv.ppNpNode = npNode
    → adv.ppNpModInfo = { modifiers, headSIs }
        ↓
index.html
  _dgRenderAdvPhrases(advPhrases)
    if (adv.ppPrep && adv.ppNpNode) → [現在: inline]  [P6-F-1: diagonal]
    else → displayText(adv.node)
```

---

## 2. SR construction.canonical → DG 表示パス

| construction.canonical | NT件数 | DG path | P6-F-1 対象 |
|---|---|---|---|
| PREP_PHRASE (fn:ADVERBIAL) | 8,912 | `_dgRenderAdvPhrases()` → inline PP | ✅ YES |
| PREP_PHRASE (nested in PP) | 994 | `ppNpModInfo.modifiers` 経由 | ✅ YES (nested) |
| PREP_PHRASE (slot mod) | 954 | `extractSlotModifiers()` 経由 | 🔶 DEFERRED |
| PREP_PHRASE (NP内修飾) | 167 | `adv.node` → displayText fallback | 🔶 DEFERRED |
| PREP_PHRASE (complex/root) | 845 | fallback → displayText | 🔶 FALLBACK |
| PREP_PHRASE (edge: non-token ch[0]) | 213 | extractPPStructure null → displayText | 🔶 FALLBACK |

**P6-F-1 primary target:** fn:ADVERBIAL の 8,912 件 (74.9%)  
**Fallback 保持:** 1,058 件 → 既存 `displayText()` で安全

---

## 3. fn.canonical → 表示経路マトリクス

| fn.canonical | PP位置 | 現在の表示 | P6-F-1後 |
|---|---|---|---|
| ADVERBIAL | 節レベル副詞的 | inline (prep bold + NP) | **diagonal notation** |
| INDIRECT_OBJECT | 間接目的語 | main line (P6-F-2 対象) | P6-F-2 scope |
| OBJECT | 直接目的語 | main line slot | P6-F-2 scope |
| SUBJECT | 主語 | main line slot | P6-F-2 scope |
| COMPLEMENT | 補語 | main line slot (diagonal connector) | P6-F-2 scope |
| null/UNRESOLVED | 不明 | displayText fallback | fallback 保持 |

---

## 4. R-K / Leedy → 現在 → P6-F-1 後

```
R-K 原則          Leedy 適応           現在 DG                P6-F-1 後
─────────────────────────────────────────────────────────────────────
前置詞 diagonal    Greek PREP_PHRASE    inline (bold prep)     ✅ diagonal line
     ↘               prep governs NP     prep+NP 同一行         prep ↘
NP horizontal        same                                       ─────────
                                                                NP
```

---

## 5. extractPPStructure() → DG DR フィールド

| DR フィールド | 型 | ソース | 使用先 |
|---|---|---|---|
| `adv.ppPrep` | string | `prepToken.text` | 前置詞テキスト表示 |
| `adv.ppNpNode` | node | `ch[1]` or `_pp_np_group` | NP head text (`headDisplayText`) |
| `adv.ppNpModInfo` | object | `extractNPModifiers(npNode)` | governed NP の修飾語 |
| `adv.ppNpModInfo.headSIs` | SI[] | NP head の senseInfo | `headDisplayText` の候補限定 |
| `adv.ppNpModInfo.modifiers` | array | NP 修飾語一覧 | 修飾語の追加レンダリング |

**全フィールドが `extractPPStructure()` により既に提供されている。** P6-F-1 は DR の変更なし、renderer のみ変更。

---

## 6. CSS 責務分離

| CSS クラス | 責務 | P6-F-1 変更 |
|---|---|---|
| `.dg-adv-list` | 節レベル副詞的リスト (flex-column) | 変更なし |
| `.dg-adv-item` | 副詞的要素 1件 | 変更なし |
| `.dg-adv-connector` | L-bracket コネクタ | 変更なし |
| `.dg-adv-row` | 副詞的要素の行 | 変更なし |
| `.dg-adv-pp-wrap` | **現在: prep+NP inline** | **削除または変更** |
| `.dg-adv-pp-prep` | prep テキスト (bold) | **diagonal 版に置換** |
| `.dg-adv-pp-np` | NP テキスト (inline) | **horizontal 版に置換** |
| `.dg-adv-fn` | fn ラベル (副詞的) | 変更なし |
| `.dg-adv-text` | 非PP テキスト (fallback) | 変更なし |

**新規追加 CSS (P6-F-1 実装時):**

| 新 CSS クラス | 用途 |
|---|---|
| `.dg-pp-wrap` | PP diagonal 全体コンテナ |
| `.dg-pp-diag-row` | prep diagonal 行 |
| `.dg-pp-diag-line` | diagonal 線 (CSS transform) |
| `.dg-pp-prep` | prep テキスト (diagonal 位置) |
| `.dg-pp-np-row` | NP horizontal 行 |
| `.dg-pp-np` | NP テキスト |

---

## 7. fallback チェーン

```
PP node
  ↓
extractPPStructure(node) 
  ↓
  ├── { prepToken, npNode } → adv.ppPrep, adv.ppNpNode 設定
  │     ↓
  │   _dgRenderAdvPhrases():
  │     if (adv.ppPrep && adv.ppNpNode) → [P6-F-1: diagonal rendering]
  │
  └── null (ch[0] not token / ch.length < 2)
        ↓
      adv.ppPrep = undefined
        ↓
      _dgRenderAdvPhrases():
        else → textEl.textContent = displayText(adv.node)
                ↓
              [既存 inline fallback — 変更なし]
```

**edge case 213件は既存 fallback で安全に処理される。P6-F-1 実装後も同様。**

---

## 8. dg-engine.js 変更不要の確認

| コンポーネント | P6-F-1 変更 | 理由 |
|---|---|---|
| `extractPPStructure()` | **変更なし** | 既にデータ提供済み |
| `deriveDR()` | **変更なし** | `adv.ppPrep/ppNpNode` 既設定 |
| `headDisplayText()` | **変更なし** | NP head text 提供済み |
| `displayText()` | **変更なし** | fallback として使用継続 |
| `deriveRelativeConnectors()` | **変更なし** | P6-C 実装; 対象外 |

**P6-F-1 変更対象: `index.html` の `_dgRenderAdvPhrases()` 内 PP レンダリング部分 + CSS のみ。**

---

*Refs: P6-F.1_pp_diagonal_audit.md / P6-F.1_test_matrix.md / P6-F.1_final_report.md*
