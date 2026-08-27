# P5-E DG Renderer Coverage Extension — Design Document

**Phase:** P5 — Original Greek NT Diagram Grammar  
**Date:** 2026-08-20  
**State:** BROWSER-VERIFIED

---

## 目的

SR schema を変更せず、Structural Diagram (DG) の Renderer coverage だけを拡張する。

---

## P5-E-1: fn=null Structural Traversal

### 問題

`deriveClauseCore` は clause/group の子ノードを iterate するとき、`function.canonical` が null のノードを `continue` でスキップしていた。

```javascript
// 変更前
for (const child of (clauseNode.children || [])) {
    const fn = child.function?.canonical;
    if (!fn) continue;   // ← fn=null 節が全スキップ
    ...
}
```

PHP 2:5 の root clause は fn=OBJECT を持つ子 [.0] と fn=null の子 [.1][.2] を持つ。
子 [.2] の内部に ὅς 節 → ADVERBIAL `ἐν μορφῇ θεοῦ` という PP+GENITIVE_MOD が存在するが、
DG がこの経路を traversal できないため SR データが存在しても描画不可だった。

### 設計原則

- fn=null node は「機能スロット」ではなく「構造コンテナ」として扱う
- fn=null node 自身に function を与えない
- fn=null node の子孫の function を親へコピーしない
- fn=null node から `deriveFromNode` を呼び出し、その結果を `adverbialClauses` として追加する

### 実装

`deriveClauseCore` の fn=null 処理：

```javascript
if (!fn) {
    // P5-E-1: fn=null structural container — traverse to reach fn-marked descendants
    if (child.type === 'clause' || child.type === 'group') {
        const sub = deriveFromNode(child);
        if (sub) adverbialClauses.push(sub);
    }
    continue;
}
```

この変更は再帰的に機能する。`deriveFromNode` → `deriveClauseCore` → 同じ fn=null 処理が適用されるため、fn=null が多重にネストした場合も正しく動作する。

### 描画上の意味

fn=null structural container から得られた DR_Clause は、`adverbialClauses` に追加される。
描画上は `従属節`（または participle を含む場合は `分詞節`）ラベルの L-bracket で表示される。
fn=null node 自身にラベルは付与されない（function なし = ラベルなし）。

---

## P5-E-2: ADJ_MOD Coverage

### 問題

SR の `phrase.np cn=ADJ_MOD` construction は DG から到達可能（fn=SUBJECT/OBJECT 等のスロットとして）だったが、`extractSlotModifiers` が ADJ_MOD を未対応だった。

Cases A/B/C のみ実装：
- Case A: slot IS GENITIVE_MOD
- Case B: slot has ADV_MOD child
- Case C: slot has GENITIVE_MOD child

ADJ_MOD の場合、head 名詞と形容詞的分詞が区別されず全テキストが main line に一括表示されていた。

### SR での ADJ_MOD パターン

**パターン 1 (JHN 1:6)**: ADJ_MOD が直接 fn-slot として現れる

```
phrase.np[cn=ADJ_MOD] fn=SUBJECT
  token 'ἄνθρωπος' [N-NSM]          ← head noun
  clause                              ← adjectival clause (modifier)
    token fn=PREDICATE 'ἀπεσταλμένος' [V-RPP-NSM]
    phrase.pp fn=ADVERBIAL cn=PREP_PHRASE
      token 'παρὰ' / token 'θεοῦ,'
```

ADJ_MOD の子が clause → clause child が形容詞的修飾節。

**パターン 2 (EPH 2:7)**: ADJ_MOD が GENITIVE_MOD 内にネスト

```
phrase.np[cn=ARTICULAR_NP] fn=OBJECT
  token 'τὸ'
  phrase.np[cn=GENITIVE_MOD]
    phrase.np[cn=ADJ_MOD]             ← ここにネスト
      token fn=PREDICATE 'ὑπερβάλλον' [V-PAP-ASN]
      token fn=null 'πλοῦτος'
    phrase.np[cn=ARTICULAR_NP]        ← τῆς χάριτος αὐτοῦ...
```

ADJ_MOD の子が token fn=PREDICATE → PREDICATE-function トークンが形容詞的修飾語。

### 実装

**共通ヘルパー `_extractAdjMod`:**

```javascript
function _extractAdjMod(children, headSIs, modifiers) {
    for (const child of children) {
        if (child.type === 'clause') {
            modifiers.push({ node: child, label: '形容詞的修飾', si: minSI(child) });
        } else if (child.type === 'token') {
            const childFn = child.function?.canonical;
            if (childFn === 'PREDICATE' || childFn === 'COPULA') {
                modifiers.push({ node: child, label: '形容詞的修飾', si: child.surfaceIndex });
            } else {
                headSIs.add(child.surfaceIndex);
            }
        } else {
            getTokens(child).forEach(t => headSIs.add(t.surfaceIndex));
        }
    }
}
```

**Case D（slot IS ADJ_MOD）:** `_extractAdjMod` を使って head/modifier を分離。

**Case C 拡張（GENITIVE_MOD 内の ADJ_MOD）:** GENITIVE_MOD の子が `cn=ADJ_MOD` の場合に `_extractAdjMod` を適用。

### L-0 遵守確認

- ADJ_MOD construction は SR の明示データ（SR が SSOT）
- PREDICATE function は SR の明示データ
- 「形容詞的分詞である」という morph 推論は行わない
- SR の `function.canonical === 'PREDICATE'` と `construction.canonical === 'ADJ_MOD'` の組み合わせを読むだけ

---

## NT-wide Coverage 測定

| 指標 | P5-E 前 (P5-D.1 基準) | P5-E 後 | 変化 |
|---|---|---|---|
| PP+GENITIVE_MOD reachable | 34/575 (6%) | 571/630 (91%) | +85pp |
| ADJ_MOD participle reachable | ~6% | 413/439 (94%) | 大幅改善 |

※ 測定スクリプトの実装差異により総件数が P5-D.1 基準値と異なるが、相対的改善率が P5-E の効果を示す。

---

## 変更ファイル

| ファイル | 変更 | 変更種別 |
|---|---|---|
| `public/core/dg-engine.js` | P5-E-1: `deriveClauseCore` fn=null traversal | COVERAGE |
| `public/core/dg-engine.js` | P5-E-2: `_extractAdjMod` helper 追加 | COVERAGE |
| `public/core/dg-engine.js` | P5-E-2: `extractSlotModifiers` Case D + Case C 拡張 | COVERAGE |

`index.html` 変更なし — 既存の mod-zone レンダリングで ADJ_MOD modifier が正しく表示される。

---

## 禁止事項の遵守確認

| 禁止項目 | 状態 |
|---|---|
| SR schema 変更 | 変更なし ✅ |
| reading-engine.js / syntax-analyzer.js / syntax-registry.json 変更 | 変更なし ✅ |
| ICL / Structure Flow / Discourse Analysis 変更 | 変更なし ✅ |
| fn=null node への function 付与 | 実施せず ✅ |
| 子孫 function の親への継承/昇格 | 実施せず ✅ |
| antecedent / coref / link 追加 | 実施せず ✅ |
| 新しい統語推論 | 実施せず ✅ |
| commit / merge / deploy | 実施せず ✅ |

---

*詳細: P5-E_test_matrix.md / P5-E_final_report.md*
