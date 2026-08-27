# P5-C.1 Visual Grammar Hardening — Implementation Log

**Phase:** P5 — Original Greek NT Diagram Grammar  
**Date:** 2026-08-20  
**State:** BROWSER-VERIFIED  
**Production code changes:** 2 files (`dg-engine.js`, `index.html`)

---

## Scope

対象: P5-C auditで特定した視覚的欠落のうち、最小変更で修正可能な4項目。

| Item | ID | 対象 |
|---|---|---|
| BUG FIX | F-01 | EPH 2:8 s4 第2COMPLEMENT孤立 |
| WORD-LEVEL MODIFIER | F-03 | 語レベル修飾語のmain lineからの分離 |
| SUBORDINATE CLAUSE ATTACH | F-06 | ὅとι節の接続線可視化 |
| COORDINATION | F-05 | 等位節の並列性表示 |

禁止: reading-engine.js変更 / syntax-analyzer.js変更 / SR schema変更 / ICL変更 / 語順変更 / SVO並替 / implied subject追加 / semantic/discourse推論 / L-0違反。  
SR は SSOT として読み取り専用で消費。

---

## 変更 1 — F-01 BUG FIX: `connectorBetween` in `dg-engine.js`

**ファイル:** `public/core/dg-engine.js`  
**箇所:** `connectorBetween()` 関数 noVerb ブロック  
**変更種別:** BUG

**Before:**
```javascript
if (noVerb) {
    if (subj && comp) return 'implied';
    return null;
}
```

**After:**
```javascript
if (noVerb) {
    if (subj && comp) return 'implied';
    // F-01: 同一関数名を理由にコネクタを拒否してはならない。
    // 複数のCOMPLEMENTが同一verbless節に存在する場合も implied diagonal で接続する。
    if (prevFn === 'COMPLEMENT' && curFn === 'COMPLEMENT') return 'implied';
    return null;
}
```

**根拠:** EPH 2:8 s4 の SR は `COMPLEMENT(ἐξ ὑμῶν)` + `COMPLEMENT(θεοῦ τὸ δῶρον)` という構造を明示している。コネクタの決定は関数型の一意性ではなく verbless 節内での連続性によって行うべき。

---

## 変更 2 — 語レベル修飾抽出: `dg-engine.js` 新規ヘルパー群

**ファイル:** `public/core/dg-engine.js`  
**変更種別:** FEATURE (DR拡張 — SR読み取りのみ、推論なし)

### 新規関数

#### `isGenitiveToken(t)`
`evidence.morph_raw` の文字インデックス2が `'G'` かどうかで属格を判定。  
morph_raw フォーマット: `"POS-CaseNumberGender"` (例: `"N-GSM"`, `"T-GPM"`)。

#### `allGenitiveTokens(node)`
ノード配下の全トークンが属格かどうかを返す（句レベルの判定に使用）。

#### `extractSlotModifiers(node) → { headSIs, modifiers } | null`

SRの `construction.canonical` を参照してモディファイアを抽出する。推論なし。

| ケース | SR構造 | 処理 |
|---|---|---|
| A | スロット自体が `GENITIVE_MOD` | 属格トークン = modifier、非属格 = head |
| B | `ARTICULAR_NP` が `ADV_MOD` 直接子を持つ | ADV_MODのトークン子 = head、句子 = modifier |
| C | `ARTICULAR_NP` が `GENITIVE_MOD` 直接子を持つ | 属格 = modifier、非属格 = head |

**使用例（MAT 5:3 SUBJECT）:**
- SR: `ARTICULAR_NP { article οἱ, ADV_MOD { token πτωχοὶ, ARTICULAR_NP { τῷ πνεύματι } } }`
- 結果: head = `{ οἱ, πτωχοὶ }` (head SI set), modifier = `τῷ πνεύματι 副詞的修飾`

**使用例（EPH 2:8 s4 COMPLEMENT）:**
- SR: `GENITIVE_MOD { token θεοῦ [N-GSM], ARTICULAR_NP { τὸ δῶρον } }`
- morph_raw[2] = 'G' → θεοῦ = modifier; morph_raw[2] = 'N' → τὸ/δῶρον = head
- 結果: head = `{ τὸ, δῶρον }`, modifier = `θεοῦ 属格修飾`

#### `headDisplayText(node, headSIs) → string`
`headSIs` が null または空なら `displayText(node)` にフォールバック（後方互換）。  
それ以外: `getTokens(node)` から headSIs に含まれるものだけを結合して返す。

### DR_Slot スキーマ拡張

```javascript
// Before
{ fn, node, connector, si }

// After  
{ fn, node, connector, si, modifiers: [{node, label, si}], headSIs: Set<number>|null }
```

`modifiers` が空配列 / `headSIs` が null = モディファイア抽出なし（後方互換）。

### Public API 拡張

```javascript
global.DgEngine = { deriveDR, displayText, headDisplayText };
```

---

## 変更 3 — CSS: コネクタサイズ・新クラス群 in `index.html`

**変更種別:** UX / FEATURE

### コネクタサイズ増加 (F-02/F-09 対応)

| プロパティ | Before | After |
|---|---|---|
| `.dg-conn-complement` width | 20px | 28px |
| `.dg-conn-complement` height | 28px | 36px |
| `.dg-conn-complement::after` width | 28px | 36px |
| `.dg-conn-implied` (同上) | 20px/28px | 28px/36px |
| `.dg-conn-implied::after` border-top | 2px dashed | 1.5px dashed; opacity: .75 |

### 新規 CSS クラス

#### `.dg-adv-clause-attach`
従属節の直前に挿入する L-bracket 要素。  
`border-left: 1.5px solid` + `border-bottom: 1.5px solid` で L 字形を形成。

#### `.dg-coord-wrap` 更新
`border-left: 2.5px solid var(--text-sub)` + `padding-left: .55rem` を追加。  
等位節群が共通の左縦線を持つことで並列性を位置で示す。

#### `.dg-coord-join` 更新
`margin-left` を削除（親の `padding-left` で代替）。

#### `.dg-slot-mod-zone` / `.dg-slot-mod-cell` / `.dg-slot-mod-spacer-*` (新規)
main-line の下に flex row でモディファイアゾーンを配置するための新クラス群。  
スペーサー幅はコネクタ要素の幅に一致させ、近似的なカラム整合を実現。

---

## 変更 4 — JS レンダラ: `_dgRenderMainLine` / `_dgRenderSlotModZone` / `_dgRenderClause` in `index.html`

**変更種別:** FEATURE

### `_dgRenderMainLine` 変更

```javascript
// Before
textEl.textContent = window.DgEngine.displayText(slot.node);

// After
textEl.textContent = window.DgEngine.headDisplayText(slot.node, slot.headSIs);
```

### 新規 `_dgRenderSlotModZone(slots)` 関数

スロット配列を受け取り、モディファイアがあれば `.dg-slot-mod-zone` を生成して返す。  
各スロットに対応する `.dg-slot-mod-cell` を flex で並べ、コネクタ幅に対応する spacer を先行させる。  
モディファイアが1件もない場合は `null` を返す（描画コスト0）。

### `_dgRenderClause` 変更

**非等位ブランチ:**
```javascript
// After _dgRenderMainLine
const modZone = _dgRenderSlotModZone(dr.slots);
if (modZone) wrap.appendChild(modZone);

// Before each adverbialClause
const attachEl = document.createElement('div');
attachEl.className = 'dg-adv-clause-attach';
wrap.appendChild(attachEl);
```

**等位ブランチ (coordClauses ループ内):**
- 同様に `modZoneSub` と `attachEl` を各 subWrap へ追加。

---

## L-0 Compliance

- SRから読み取った `construction.canonical` と `morph_raw` のみを使用
- 新しい統語推論・含意語追加・語義選択・referent決定は一切行っていない
- 語順はSRの `surfaceIndex` 順を維持
- `null` / fallback は改善なしとして静かに処理（headDisplayText のフォールバック等）

---

## 変更ファイル一覧

| ファイル | 変更種別 | 行数概算 |
|---|---|---|
| `public/core/dg-engine.js` | BUG + FEATURE | +100行 |
| `public/index.html` (CSS) | UX + FEATURE | +60行 |
| `public/index.html` (JS) | FEATURE | +60行 |
| 読み取り専用: SR JSON, reading-engine.js, syntax-analyzer.js | — | 0行 |

---

*証拠: P5-C.1_test_matrix.md / P5-C.1_final_report.md*
