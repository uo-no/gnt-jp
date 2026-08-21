# P6-C — Relative-Clause Connector Design

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** IMPLEMENTED · BROWSER-VERIFIED · HUMAN-REVIEW  
**Production code changes:** dg-engine.js, index.html (minimal)  
**SR schema changes:** 0

---

## 1. Goal

Reed–Kellogg / Leedy 型構文ダイアグラムで、関係代名詞と先行詞の関係を  
視覚的 connector で表現する。

**P6-C は暫定 Option B（MACULA referent + morph filter）を実装する。**  
SR schema 変更はない。

---

## 2. Design Decisions (FROZEN)

| ID | 決定 | 理由 |
|---|---|---|
| U-1 | HEAD NOUN TOKEN target (NP phrase node ではない) | SR schema 変更不要、L-0 準拠 |
| U-2 | multi-token referent → SKIP (connector なし) | R3 66件は単一 connector 不可 |
| U-3 | Option B (MACULA referent + morph filter + multi-token skip) | 即時実装可能、L-0 準拠 |

---

## 3. Eligibility Rules (ALL must pass)

```
1. SR tree に relative pronoun token が存在する
2. bible_data に対応 ref の token が存在する (bdByRef lookup)
3. token.referent が non-null string で存在する
4. token.referent に空白が含まれない (R3 multi-token skip)
5. referent が bdById に存在する (target token が見つかる)
6. target.morph が nominal: N-* / A-* / V-*P-* (R4 finite verb 除外)
```

---

## 4. Architecture

```
bible_data (elData)
  ↓ bdByRef = Map<ref, bdToken>
  ↓ bdById  = Map<verseId, bdToken>
  ↓
DgEngine.deriveRelativeConnectors(sentenceRoot, bdByRef, bdById)
  → [{ relPronRef, relPronText, targetRef, targetText, targetNodeId }]
  ↓
_annotateRelClauses(dr, connMap)   ← DR に antecedentText を付与
  ↓
_dgRenderClause(dr)
  adverbialClause.isRelativeClause → .dg-rel-clause + '関係節 ← antecedentText'
  slot.embeddedRelClauses          → .dg-rel-clause + '関係節 ← antecedentText'
```

---

## 5. dg-engine.js 変更

### 追加関数

| 関数 | 役割 |
|---|---|
| `_isNominalMorph(morph)` | bible_data.morph が nominal かを判定 (N-* / A-* / V-*P-*) |
| `_findRelPronInSubtree(node)` | SR subtree から最初の relative pronoun token を検索 |
| `_extractEmbeddedRelClauses(node)` | CLAUSE_AS_NP slot から embedded relative clause を抽出 |
| `_collectRelPronTokens(node, results)` | SR tree 全体の relative pronoun tokens を収集 |
| `deriveRelativeConnectors(root, bdByRef, bdById)` | eligibility check 済み connector records を返す |

### deriveClauseCore 変更

1. **fn=null 子ノード**: `_findRelPronInSubtree` で relative pronoun を検出 → DR に `isRelativeClause: true` と `relPronRef` を付与
2. **MAIN_FN slots**: `_extractEmbeddedRelClauses` を呼び CLAUSE_AS_NP embedded relative clause を抽出 → slot に `embeddedRelClauses` フィールドを追加、`headSIs` を antecedent tokens のみに絞り込み

### Public API 変更

```javascript
global.DgEngine = { deriveDR, displayText, headDisplayText, deriveRelativeConnectors };
```

---

## 6. index.html 変更

### CSS

```css
.dg-rel-clause {
    border-left: 2px dashed var(--color-domain, #7a7aaa);  /* 紫: 関係節専用 */
}
.dg-rel-clause-label {
    color: var(--color-domain, #7a7aaa);
    text-transform: uppercase;
}
```

従属節 (`dg-adv-clause`) は `--border-soft` (グレー)、  
関係節 (`dg-rel-clause`) は `--color-domain` (紫) で視覚的に区別。

### 地図構築

```javascript
const _bdByRef = new Map((elData || []).filter(w => w.ref).map(w => [w.ref, w]));
const _bdById  = new Map((elData || []).filter(w => w.verseId).map(w => [w.verseId, w]));
```

### DG gate 拡張

ROM 6 を追加 (P6-C regression 検証用):

```javascript
(_src.book === 'ROM' && _src.chapter === 6)
```

### DR 注釈

`_annotateRelClauses(dr, connMap)`:
- `dr.adverbialClauses[i].antecedentText` を設定 (STANDALONE 関係節)
- `dr.slots[i].embeddedRelClauses[j].antecedentText` を設定 (CLAUSE_AS_NP 埋め込み関係節)

### 関係節ラベル

```
antecedentText あり → '関係節 ← ' + antecedentText
antecedentText なし → '関係節'
```

---

## 7. What is NOT changed

- `reading-engine.js` — 変更なし
- `syntax-analyzer.js` — 変更なし
- `syntax-registry.json` — 変更なし
- Structure Flow / Discourse Analysis / ICL engine — 変更なし
- L-0 policy — 変更なし
- SR schema — 変更なし

---

## 8. Known Limitations (P6-C は暫定)

| 項目 | P6-C 状態 |
|---|---|
| MACULA referent は coreference (syntactic antecedent ではない) | bible_data.referent を MACULA source として使用 |
| cross-chapter 4件 | bdById が同章の bible_data のみ → connector なし (silent skip) |
| free relative 598件 | referent=null → connector なし (正しい動作) |
| R5 demonstrative chain 10件 | D-* morph → morph filter で除外 |
| R8 article/other 42件 | T-* / X-* → morph filter で除外 |

---

## 9. Long-term Path (P6-D 以降)

SR schema に `antecedentSRNodeId` (explicit syntactic field) を追加し、  
MACULA referent への依存を排除する (Option D)。

---

*詳細: P6-C_test_matrix.md / P6-C_nt_wide_audit.md / P6-C_final_report.md*
