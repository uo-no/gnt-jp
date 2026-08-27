# P5-D Visual Grammar Core — Implementation Log

**Phase:** P5 — Original Greek NT Diagram Grammar  
**Date:** 2026-08-20  
**State:** BROWSER-VERIFIED  
**Production code changes:** 2 files (`dg-engine.js`, `index.html`)

---

## Scope

対象: Greek NT 構文ダイアグラム文法 v1 の4文法領域を検証・実装。

| ID | 領域 | 状態 |
|---|---|---|
| P5-D-1 | 分詞節の視覚文法 | IMPLEMENTED |
| P5-D-2 | 関係代名詞 → 先行詞コネクタ | DESIGN GAP |
| P5-D-3 | 前置詞句内部文法 | IMPLEMENTED |
| P5-D-4 | 属格修飾語（PP内部） | IMPLEMENTED (code); test case unreachable by SR fn-depth |

禁止: reading-engine.js / syntax-analyzer.js / syntax-registry.json / SR schema / ICL / Structure Flow / Discourse Analysis 変更なし。SR は SSOT として読み取り専用で消費。

---

## 変更 1 — P5-D morphological helpers: `dg-engine.js`

3つの新規ヘルパーを追加（`dg-engine.js` line ~102）。

### `isParticiple(t)`
`morph_raw` の文字インデックス4が `'P'` かどうかで分詞を判定。  
形式: `V-{Tense}{Voice}{Mood}-...` → 位置4 = Mood: `P` = Participle。

**根拠:** SR の `PARTICIPIAL_CLAUSE` construction は実際の分詞節に対応しない（条件構造に使用）。分詞動詞は `morph_raw` でのみ確実に識別可能。

### `isRelPronToken(t)`
`morph_raw` が `R-`（ὅς/ἥ/ὅ）または `K-`（ὅσος 相関代名詞）で始まる場合に関係代名詞と判定。P5-D-2 設計調査で使用。

### `extractPPStructure(node)`
`PREP_PHRASE` construction の最初の子トークン（前置詞）と残り（支配 NP）を返す。PP が存在しない場合は `null`。

---

## 変更 2 — P5-D-1: 分詞節の視覚文法

### `dg-engine.js` 変更

**DR_Slot スキーマ拡張:**
```javascript
{ fn, node, connector, si, modifiers, headSIs, isParticipial: bool }
```

**DR_Clause スキーマ拡張:**
```javascript
{ ..., isParticipalClause: bool }
```

**`deriveClauseCore` 変更:**
- MAIN_FN スロット生成時: `tok0 = getTokens(child)[0]` → `isParticipial = isParticiple(tok0)`
- return 時: `isParticipalClause = mainSlots.some(s => s.isParticipial)`

**`deriveFromGroup` 変更:**
- extraPhrase マージ時: 同様に `isParticipial` を設定
- スロットマージ後: `isParticipalClause` を再計算（extra phrases から分詞が追加された場合）

**ADVERBIAL group ハンドリング:**
- `type=group` かつ `fn=ADVERBIAL` の場合: 内部の `clause` 子を個別に `adverbialClauses` へ追加
- MAT 28:19 の `βαπτίζοντες` + `διδάσκοντες` が別々の adverbialClause として抽出される

### `index.html` CSS 変更

```css
/* 分詞 PREDICATE/COPULA スロット — イタリック体マーカー */
.dg-slot-participial .dg-slot-text { font-style: italic; }
/* 分詞節ラベル */
.dg-adv-clause-participial .dg-adv-clause-label { font-style: italic; }
```

### `index.html` JS 変更

**`_dgRenderMainLine`:**
```javascript
if (slot.isParticipial) slotEl.classList.add('dg-slot-participial');
```

**`_dgRenderClause` (非等位・等位の両ブランチ):**
```javascript
scWrap.className = sc.isParticipalClause
    ? 'dg-adv-clause dg-adv-clause-participial'
    : 'dg-adv-clause';
scLbl.textContent = sc.isParticipalClause ? '分詞節' : '従属節';
```

---

## 変更 3 — P5-D-2: 関係代名詞 → 先行詞コネクタ

### DESIGN GAP

SR は関係代名詞の先行詞を明示的に参照しない。

**SR での関係代名詞の扱い:**
- `ὅν` [R-ASM] (JHN 1:15): `fn=ADVERBIAL` — 節内で普通のスロットとして存在
- `ὅς` [R-NSM] (PHP 2:6): `fn=SUBJECT` — 節内で普通のスロットとして存在
- SR に explicit antecedent link なし

**結論:** SR が SSOT である以上、先行詞コネクタをビジュアルで表示するには新しい syntactic inference が必要。L-0 境界を破るため実装しない。

**状態:** DESIGN GAP — SR insufficient for visual antecedent connector. 将来的には SR schema に antecedent link を追加することで対応可能（別 Phase）。

---

## 変更 4 — P5-D-3: 前置詞句内部文法

### `dg-engine.js` 変更

`deriveClauseCore` ADVERBIAL ブランチ + `deriveFromGroup` extraPhrase ブランチで:

```javascript
const ppS = extractPPStructure(child);
adverbialPhrases.push({
    fn: 'ADVERBIAL', node: child, si: minSI(child),
    ppPrep: ppS ? ppS.prepToken.text : null,
    ppNpNode: ppS ? ppS.npNode : null,
    ppNpModInfo: ppS && ppS.npNode ? extractSlotModifiers(ppS.npNode) : null,
});
```

**DR_AdvPhrase スキーマ拡張:**
```javascript
{ fn, node, si, ppPrep: string|null, ppNpNode: object|null, ppNpModInfo: {headSIs, modifiers}|null }
```

### `index.html` CSS 変更

```css
.dg-adv-pp-wrap { display: flex; align-items: baseline; gap: .25rem; }
.dg-adv-pp-prep { font-weight: 600; color: var(--text-main); }
.dg-adv-pp-np   { color: var(--text-main); }
```

### `index.html` JS 変更 — `_dgRenderAdvPhrases`

`adv.ppPrep` が設定されている場合:
1. `.dg-adv-pp-wrap` div: `.dg-adv-pp-prep`（前置詞）+ `.dg-adv-pp-np`（head NP テキスト）
2. `headDisplayText(adv.ppNpNode, npMod.headSIs)` で属格修飾語を除外した NP head
3. `ppNpModItems` を配列に収集し、`item.appendChild(row)` の後に追加（DOM順を保証）

---

## 変更 5 — P5 Gate 拡張

```javascript
/* P5 gate: P5-D expansion — MAT 28 / PHP 2 / COL 1 */
(_src.book === 'JHN' && _src.chapter === 1) ||
(_src.book === 'MAT' && _src.chapter === 5) ||
(_src.book === 'MAT' && _src.chapter === 28) ||
(_src.book === 'EPH' && _src.chapter === 2) ||
(_src.book === 'PHP' && _src.chapter === 2) ||
(_src.book === 'COL' && _src.chapter === 1)
```

---

## L-0 Compliance

- SR の `morph_raw` と `construction.canonical` のみを使用
- 新しい統語推論・含意語追加・語義選択・referent決定は一切行っていない
- 語順は SR の `surfaceIndex` 順を維持
- 先行詞コネクタ (P5-D-2) は SR 不足のため実装しない — L-0 を守った判断

---

## 変更ファイル一覧

| ファイル | 変更種別 | 概算 |
|---|---|---|
| `public/core/dg-engine.js` | FEATURE | +60行 |
| `public/index.html` (CSS) | UX | +10行 |
| `public/index.html` (JS) | FEATURE | +70行 |
| 読み取り専用: SR JSON, reading-engine.js, syntax-analyzer.js | — | 0行 |

---

*証拠: P5-D_test_matrix.md / P5-D_final_report.md*
