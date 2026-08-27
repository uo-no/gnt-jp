# P6-G.4 — Implementation Specification

**Phase:** P6-G.4 (G-4.2 → G-4.3 実装仕様)  
**Date:** 2026-08-25  
**Status:** SPECIFICATION ONLY — No code changes (G-4.3 mandate required)  
**Prerequisite:** G-4.2 Repair Design Review — PASS WITH LIMITATIONS

---

## Overview

`slot.contentClause = {conjunction, innerDR}` アーキテクチャの実装仕様。  
変更ファイル: `dg-engine.js` (2箇所) + `index.html` (2箇所 + CSS 1箇所)。

---

## 1. dg-engine.js — Change 1: `_extractContentClause()` helper

### 挿入位置

`_extractEmbeddedRelClauses()` の直後（現在 line 171 あたり）。

### 追加コード

```javascript
function _extractContentClause(node) {
    if (!node) return null;
    if (node.construction?.canonical !== 'CONTENT_CLAUSE') return null;

    const children = node.children || [];
    const conjTok = children.find(
        c => c.type === 'token' && c.evidence?.morph_raw?.startsWith('CONJ')
    );
    const inner = children.find(
        c => c.type === 'clause' || c.type === 'group'
    );
    if (!inner) return null;

    const innerDR = inner.type === 'clause'
        ? deriveClauseCore(inner, conjTok?.text || null)
        : deriveFromGroup(inner, conjTok?.text || null);

    if (!innerDR) return null;
    return {
        conjunction: conjTok?.text || null,
        innerDR,
    };
}
```

### 設計根拠

| 設計判断 | 理由 |
|---------|------|
| `cn !== 'CONTENT_CLAUSE'` guard | 非CC nodeが渡された場合にnullを返す防御 |
| `inner` not found → `return null` | inner clauseなし＝inner DR構成不能 → fallback |
| `deriveClauseCore(inner)` or `deriveFromGroup(inner)` | 既存パスを再利用；新しい推論は追加しない |
| `innerDR` null guard | `deriveClauseCore`例外時のderivedDRがnullになる場合の防御 |
| depth guardなし | SR是 acyclic tree → 再帰は必ず終了 (NT最大2段ネスト確認済み) |
| `conjTok` not found → `conjunction: null` | conjunction=nullのまま通過；innerDRは有効 |

### 既存`_extractEmbeddedRelClauses()`との比較

```
_extractEmbeddedRelClauses(node):  cn !== 'CLAUSE_AS_NP' → null
_extractContentClause(node):       cn !== 'CONTENT_CLAUSE' → null
```

同一パターン。CC nodeが`_extractEmbeddedRelClauses`に渡されても常にnullを返すため、二重処理なし。

### エクスポート

`_extractContentClause`は engine内部関数 (先頭`_`付き)。`window.DgEngine`エクスポートに追加不要。テストスクリプトはDR slot経由で検証する。

---

## 2. dg-engine.js — Change 2: `deriveClauseCore()` MAIN_FN branch

### 変更位置

現在 line 442–455 の MAIN_FN branch。

### 変更前 (現在)

```javascript
} else if (MAIN_FN.has(fn)) {
    const modInfo = extractSlotModifiers(child);
    const tok0 = child.type === 'token' ? child : (getTokens(child)[0] || null);
    const isParticipial = (fn === 'PREDICATE' || fn === 'COPULA') && tok0 ? isParticiple(tok0) : false;
    const embeddedRelInfo = _extractEmbeddedRelClauses(child);
    mainSlots.push({
        fn, node: child, connector: null, si: minSI(child),
        modifiers: modInfo ? modInfo.modifiers : [],
        headSIs:   embeddedRelInfo ? embeddedRelInfo.headSIs : (modInfo ? modInfo.headSIs : null),
        isParticipial,
        embeddedRelClauses: embeddedRelInfo ? embeddedRelInfo.embeddedClauses : [],
    });
}
```

### 変更後

```javascript
} else if (MAIN_FN.has(fn)) {
    const modInfo = extractSlotModifiers(child);
    const tok0 = child.type === 'token' ? child : (getTokens(child)[0] || null);
    const isParticipial = (fn === 'PREDICATE' || fn === 'COPULA') && tok0 ? isParticiple(tok0) : false;
    const embeddedRelInfo = _extractEmbeddedRelClauses(child);
    const contentClause = _extractContentClause(child);    // ← NEW
    mainSlots.push({
        fn, node: child, connector: null, si: minSI(child),
        modifiers: modInfo ? modInfo.modifiers : [],
        headSIs:   embeddedRelInfo ? embeddedRelInfo.headSIs : (modInfo ? modInfo.headSIs : null),
        isParticipial,
        embeddedRelClauses: embeddedRelInfo ? embeddedRelInfo.embeddedClauses : [],
        contentClause,                                     // ← NEW (null for non-CC)
    });
}
```

### 変更点の要約

- 追加: `const contentClause = _extractContentClause(child);` (1行)
- 追加: `contentClause,` (DR_Slot schema フィールド)
- 非CC slot: `_extractContentClause(child)` → cn !== 'CONTENT_CLAUSE' → `null` → `contentClause: null`
- CC slot: `_extractContentClause(child)` → `{conjunction, innerDR}` → `contentClause: {conjunction, innerDR}`

### DR schema comment update (line 19-34 area)

```javascript
/*
 * DR_Clause  { id, conjunction, slots(DR_Slot[]), adverbialPhrases(DR_AdvPhrase[]),
 *              adverbialClauses(DR_Clause[]), isCoordination, coordClauses(DR_Clause[]), noVerb }
 *
 * DR_Slot    { fn, node, connector(null|'sp'|'po'|'complement'|'implied'), si,
 *              modifiers[], headSIs(Set|null), isParticipial,
 *              embeddedRelClauses[],                        ← P6-C
 *              contentClause(null|{conjunction,innerDR})    ← P6-G-4 (CONTENT_CLAUSE only)
 *            }
 *
 * DR_AdvPhrase { fn, node, si, ppPrep, ppNpNode, ppNpModInfo }    ← P6-F
 */
```

---

## 3. index.html — Change 3: `_dgRenderMainLine()` CC slot handling

### 変更位置

現在 line 12279 付近 (OBJECT slot の textEl.textContent を設定している箇所)。

### 現在のスロットレンダリングパターン (baseSlots loop)

```javascript
for (const slot of baseSlots) {
    if (slot.connector) { /* connector div */ }
    const slotEl = document.createElement('div');
    slotEl.className = 'dg-slot dg-slot-' + slot.fn.toLowerCase();
    if (slot.isParticipial) slotEl.classList.add('dg-slot-participial');
    const textEl = document.createElement('span'); textEl.className = 'dg-slot-text';
    textEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);  // ← FLAT TEXT
    slotEl.appendChild(textEl);
    if (slot.fn !== 'COPULA' && slot.fn !== 'AUX') {
        const fnEl = document.createElement('span'); fnEl.className = 'dg-slot-fn';
        fnEl.textContent = _DG_FN_JA[slot.fn] || slot.fn;
        slotEl.appendChild(fnEl);
    }
    line.appendChild(slotEl);
}
```

### 変更後

```javascript
for (const slot of baseSlots) {
    if (slot.connector) { /* connector div (unchanged) */ }
    const slotEl = document.createElement('div');
    slotEl.className = 'dg-slot dg-slot-' + slot.fn.toLowerCase();
    if (slot.isParticipial) slotEl.classList.add('dg-slot-participial');
    const textEl = document.createElement('span'); textEl.className = 'dg-slot-text';
    // ↓ CC slot handling (P6-G-4)
    if (slot.contentClause && slot.contentClause.innerDR) {
        textEl.textContent = slot.contentClause.conjunction || '内容節';
    } else {
        textEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
    }
    // ↑
    slotEl.appendChild(textEl);
    if (slot.fn !== 'COPULA' && slot.fn !== 'AUX') {
        const fnEl = document.createElement('span'); fnEl.className = 'dg-slot-fn';
        fnEl.textContent = _DG_FN_JA[slot.fn] || slot.fn;
        slotEl.appendChild(fnEl);
    }
    line.appendChild(slotEl);
}
```

### 設計根拠

| 条件 | 挙動 |
|------|------|
| `slot.contentClause && slot.contentClause.innerDR` が真 | conjunction text (例: ὅτι, ἵνα) を表示 |
| `slot.contentClause.conjunction === null` | `'内容節'` をfallback label として表示 |
| `slot.contentClause` が null (非CC slot) | 既存の `headDisplayText` そのまま |
| `slot.contentClause.innerDR` が null | `contentClause` が設定済みでもinnerDRなし → `headDisplayText` fallback |

**`headDisplayText()` 関数は一切変更しない。**

---

## 4. index.html — Change 4: `_dgRenderClause()` CC sub-diagram attachment

### 変更位置

`_dgRenderClause(dr)` 内、`embeddedRelClauses` ループの直後 (現在 line 12570 付近)。

### 追加コード

```javascript
// P6-G-4: CONTENT_CLAUSE sub-diagrams
for (const slot of (dr.slots || [])) {
    if (!slot.contentClause || !slot.contentClause.innerDR) continue;
    const ccWrap = document.createElement('div');
    ccWrap.className = 'dg-cc-clause-attach';
    const ccLabel = document.createElement('div');
    ccLabel.className = 'dg-cc-clause-label';
    ccLabel.textContent = slot.contentClause.conjunction || '内容節';
    const ccEl = _dgRenderClause(slot.contentClause.innerDR);  // ← recursive, existing fn
    if (!ccEl) continue;
    ccEl.classList.add('dg-cc-clause');
    ccWrap.appendChild(ccLabel);
    ccWrap.appendChild(ccEl);
    wrap.appendChild(ccWrap);
}
```

### 挿入位置の厳密な指定

```javascript
// ↓ 挿入位置: embeddedRelClauses ループ終了直後、adverbialClauses ループ開始直前
//
// [既存 P6-C embeddedRelClauses loop here] ← unchanged
//
// [↓ 新規追加 P6-G-4 contentClause sub-diagrams]
for (const slot of (dr.slots || [])) {
    if (!slot.contentClause || !slot.contentClause.innerDR) continue;
    // ... (上記追加コード)
}
//
// [既存 adverbialClauses loop here] ← unchanged
for (const sc of (dr.adverbialClauses || [])) {
    // ...
}
```

### 再帰安全性

`_dgRenderClause(slot.contentClause.innerDR)` の呼び出しは P6-C の `_dgRenderClause(erc.dr)` と同一パターン。innerDR は SR subtree から派生した DR_Clause オブジェクトであり、cycles なし。SLOT_IN_ADV case では adv clause の DR に対して `_dgRenderClause` が呼ばれ、その内部で再びこのループが実行される (多段ネスト対応)。

---

## 5. index.html — Change 5: CSS追加

### 挿入位置

既存 `.dg-rel-clause-attach` または `.dg-adv-clause-attach` スタイルの近傍。

### 追加CSS

```css
/* P6-G-4: Content clause sub-diagram attachment */
.dg-cc-clause-attach {
    margin-top: .35rem;
    padding-left: 1.2rem;
    border-left: 2px solid #888;
}
.dg-cc-clause-label {
    font-size: .75rem;
    color: #888;
    margin-bottom: .2rem;
}
.dg-cc-clause {
    /* inherits .dg-clause styles */
}

@media (max-width: 480px) {
    .dg-cc-clause-attach {
        padding-left: .8rem;
    }
    .dg-cc-clause-label {
        font-size: .7rem;
    }
}
```

### 視覚設計

```
[PREDICATE] — po — [ὅτι]     ← slot text = conjunction only
                   |
             (border-left: 2px solid)
             ὅτι (label)
             ┌─────────────────────────────┐
             │  [SUBJECT] | [PREDICATE]    │  ← inner clause DR
             │      ├── [OBJECT]           │
             └─────────────────────────────┘
```

左ボーダーで親スロットから接続。`dg-cc-clause-label` に conjunction を再表示（スロット側にも表示するため、ここは省略可能だが視認性のため保持）。

---

## 6. 対象範囲まとめ

| 項目 | 値 |
|------|---|
| 対象CC数 | **542** (311 SLOT_ROOT + 229 SLOT_IN_ADV + 2 SLOT_IN_COORD) |
| 除外CC数 | 194 (145 buried + 39 invisible) |
| 総CC fn=OBJ | 736 |
| カバレッジ | **73.6%** |
| 変更ファイル | `dg-engine.js` (2箇所), `index.html` (2箇所 + CSS 1箇所) |
| 新規関数 | `_extractContentClause(node)` (dg-engine.js, internal) |
| 新規DRフィールド | `DR_Slot.contentClause: null \| {conjunction, innerDR}` |
| 新規CSSクラス | `.dg-cc-clause-attach`, `.dg-cc-clause-label`, `.dg-cc-clause` |
| 変更なし | `headDisplayText()`, `connectorBetween()`, `_extractEmbeddedRelClauses()`, SD fallback, ICL, PP diagonal |

---

## 7. フォールバック条件一覧

| 状態 | contentClause | 表示 |
|------|--------------|------|
| 非CC slot (cn ≠ CONTENT_CLAUSE) | null | 既存 headDisplayText (変更なし) |
| CC slot, inner clauseなし | null | 既存 headDisplayText (fallback) |
| CC slot, deriveClauseCore例外 | null | 既存 headDisplayText (fallback) |
| CC slot, conjunction=null | `{conjunction:null, innerDR:DR}` | `'内容節'` label + sub-diagram |
| CC slot, 正常 | `{conjunction:'ὅτι', innerDR:DR}` | `'ὅτι'` label + sub-diagram |

「CCなら必ずinnerDRを表示する」のではなく、`innerDR` が有効な場合のみ sub-diagram を表示。これは mandate の要件を満たす。

---

## 8. 実装順序 (G-4.3 mandate 受領後)

1. `dg-engine.js`: `_extractContentClause()` helper 追加 (Change 1)
2. `dg-engine.js`: `deriveClauseCore()` MAIN_FN branch 修正 (Change 2) + DR schema comment update
3. `dg-engine.js`: `window.DgEngine` export確認 (追加export不要)
4. `index.html`: CSS 追加 (Change 5) — 先にCSSを入れてから renderer をテストできるようにする
5. `index.html`: `_dgRenderMainLine()` slot text 分岐追加 (Change 3)
6. `index.html`: `_dgRenderClause()` CC sub-diagram loop 追加 (Change 4)
7. NT-wide DR trace で `contentClause` set 件数確認 (target: ≥ 542)
8. ブラウザ検証 (gate chapters, mobile 390px)
9. P6-G.4_implementation_test_matrix.md 全assertions 実行

---

## 9. 注意事項

### SLOT_IN_ADV での二重表示リスク

SLOT_IN_ADV case: adv clause 内の CC slot が sub-diagram を持つ。`_dgRenderClause(advDR)` の呼び出し時、既に adv clause wrap 内に sub-diagram が追加される。これは正しい動作 (adv clause の内部OBJECTがCCであることを示す)。二重表示は発生しない。

### SLOT_IN_COORD での確認

SLOT_IN_COORD (2 cases): coordination sub-clause の DR に対して `_dgRenderClause` が呼ばれ、その内部 slot で CC が検出される。同じコードパスで処理される。

### CC fn=SUBJECT 等への影響

`_extractContentClause` は `cn === 'CONTENT_CLAUSE'` であれば fn 値を問わず適用される。CC fn=SUBJECT (26 cases) も `contentClause` が設定される。レンダラーもこれを受け入れ sub-diagram を表示する。これは **期待動作** (Reed-Kellogg では主語節も pedestalとして表示)。G-4 スコープは fn=OBJ を主対象としているが、他 fn も恩恵を受ける。

---

*仕様書のみ。G-4.3 実装 mandate を待つ。*
