# P5-D.1 SR Coverage Boundary Audit — Implementation Log

**Phase:** P5 — Original Greek NT Diagram Grammar  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE (READ-ONLY)  
**Production code changes:** 0 files

---

## Scope

P5-D で発見された3つの制約の根本原因を切り分ける。

**中心原則:** DG must never infer structure that is not explicitly represented by SR.

**切り分け基準:**
- **SR SCHEMA GAP**: SR 自体が関係を持たない → DG 実装では絶対に解決不可
- **RENDERER TRAVERSAL LIMITATION**: SR にデータが存在するが DG が到達できない → DG 拡張で解決可能（別 Phase）
- **RENDERER COVERAGE GAP**: SR にデータが存在し DG が到達できるが抽出していない → `extractSlotModifiers` 等の拡張で解決可能（別 Phase）

---

## A. Relative Clause Antecedent Link

### 調査

**対象 SR ファイル:** NT 全260ファイル（全書）  
**調査方法:** 関係代名詞トークン（`morph_raw` が `R-` または `K-` で始まる）559件を収集し、SR スキーマフィールドを調査。

### SR スキーマの完全フィールドリスト

| フィールド | 型 | 意味 |
|---|---|---|
| `type` | string | node type (clause/group/phrase.*/token) |
| `id` | string | node unique ID |
| `parentId` | string | 親 node の ID（tree 構造のみ） |
| `function.canonical` | string | 統語的機能 (SUBJECT/OBJECT/ADVERBIAL 等) |
| `construction.canonical` | string | 構文パターン名 (PREP_PHRASE/GENITIVE_MOD 等) |
| `construction.axis` | string | 語順軸 (常に `'WORD_ORDER'`) |
| `evidence.morph_raw` | string | 形態論コード |
| `evidence.ref` | string | 節参照 |
| `evidence.role` | string | 統語役割 (v/s/o/adv 等) — `function.canonical` に対応 |
| `flags` | dict | NOMINALIZED/APPOSITION/PREDICATION フラグ |
| `surfaceIndex` | number | テキスト内位置 |
| `text` | string | トークンテキスト |
| `tokenIds` | array | phrase/clause が含むトークン ID リスト |

**antecedent/link/coref 系フィールド: 皆無**

### 関係代名詞の SR 表現

559件の関係代名詞調査結果:

| fn | 件数 |
|---|---|
| OBJECT | 224 |
| SUBJECT | 184 |
| (fn なし) | 93 |
| ADVERBIAL | 41 |
| INDIRECT_OBJECT | 12 |
| OBJECT2 | 3 |
| COMPLEMENT | 2 |

関係代名詞を含む節の construction:

| 含む節の construction | 件数 |
|---|---|
| (なし) | 5309 |
| CONJOINED_CLAUSE | 933 |
| SUBORDINATE_CLAUSE | 199 |
| PARTICIPIAL_CLAUSE | 176 |
| その他 | 172 |

**`RELATIVE_CLAUSE` construction は NT SR に存在しない**（全 17 construction 一覧にも含まれない）。

### 判定

**SR SCHEMA GAP — 確定**

関係代名詞は `fn=SUBJECT/OBJECT/ADVERBIAL` として節内に存在するだけであり、先行詞への明示的 link は SR schema に存在しない。`antecedentId`、`coref`、`link` 等のフィールドは皆無。

DG はこの情報を SR から取得する手段が存在しない。先行詞コネクタを表示するには新しい SR フィールドの追加（別 Phase の SR schema 変更）が必要。

---

## B. PP Internal Genitive Attachment

### 調査

**対象:** NT 全書の `PREP_PHRASE` ノードのうち、支配 NP が `GENITIVE_MOD` construction を持つもの  
**DG 可達性基準:** 全祖先ノードが `function.canonical` を持つ（fn=null を持つ祖先は traversal でスキップ）

### NT 全体の PP+GENITIVE_MOD 分布

| 分類 | 件数 | 割合 |
|---|---|---|
| 総数 | 575 | 100% |
| DG 可達（全祖先 fn あり） | 34 | 6% |
| DG 不可達（fn=null 祖先あり） | 541 | **94%** |

### P5-gate 章の PP+GENITIVE_MOD 全件

| 箇所 | 前置詞 | 支配 NP | 可達性 |
|---|---|---|---|
| JHN 1:12 | ἐκ | θελήματος σαρκὸς | ❌ 不可達 |
| JHN 1:12 | ἐκ | θελήματος ἀνδρὸς | ❌ 不可達 |
| MAT 5:32 | παρεκτὸς | λόγου πορνείας | ❌ 不可達 |
| EPH 2:19 | εἰς | κατοικητήριον τοῦ θεοῦ | ❌ 不可達 |
| PHP 2:5 | ἐν | μορφῇ θεοῦ | ❌ 不可達 |
| PHP 2:5 | ἐν | ὁμοιώματι ἀνθρώπων | ❌ 不可達 |
| PHP 2:9 | εἰς | δόξαν θεοῦ πατρός | ❌ 不可達 |
| PHP 2:14 | εἰς | ἡμέραν Χριστοῦ | ❌ 不可達 |
| COL 1:1 | διὰ | θελήματος θεοῦ | ❌ 不可達 |

**P5-gate 章の PP+GENITIVE_MOD は全件 DG 不可達。**

### 不可達の原因 — PHP 2:5 詳細トレース

`ἐν μορφῇ θεοῦ` の SR パス:
```
clause (root)
  clause [.0] fn=OBJECT            ← fn あり → 可達
  clause [.1]                       ← fn なし → deriveClauseCore がスキップ
  clause [.2]                       ← fn なし → deriveClauseCore がスキップ
    clause [.2.0]                   ← fn なし → スキップ継続
      clause [.2.0.1] fn=ADVERBIAL  ← fn あり (祖先に fn=null が存在するため不可達)
        phrase.pp fn=ADVERBIAL cn=PREP_PHRASE
          token 'ἐν'
          phrase.np cn=GENITIVE_MOD   ← SR にデータあり、DG 不可達
            token 'μορφῇ' [N-DSF]     ← head
            token 'θεοῦ'  [N-GSM]     ← modifier
```

`deriveClauseCore` の問題コード:
```javascript
for (const child of (clauseNode.children || [])) {
    const fn = child.function?.canonical;
    if (!fn) continue;   // ← fn=null の clause[.1], clause[.2] がここでスキップ
    ...
}
```

### SR 内の GENITIVE_MOD データの正確性確認

SR の `phrase.np cn=GENITIVE_MOD { μορφῇ [N-DSF], θεοῦ [N-GSM] }` は正確に表現されている:
- `μορφῇ` [N-DSF] — dative, head（属格ではない）
- `θεοῦ` [N-GSM] — genitive, modifier

`extractSlotModifiers` の Case A（node itself is GENITIVE_MOD）がこれを正しく処理できる。

### DG コードの正確性確認

`extractPPStructure` → `extractSlotModifiers(npNode)` のコードパスは正確。  
問題は PP そのものへの到達であり、PP に到達できれば GENITIVE_MOD の抽出は正しく機能する。

### fn=null 祖先の NT 全体規模

| 統計 | 値 |
|---|---|
| root 直下の fn=null clause 子 (NT 全体) | 6,215 件 |
| うち PREDICATE/COPULA を含む | 6,004 件 |

fn=null clause は NT 全体で非常に広範に存在する。これは SR の設計的特性であり、並列節・連続節・discourse-level 節が明示的な統語機能なしで並置されるパターン。

### 判定

**RENDERER TRAVERSAL LIMITATION — 確定**

SR データは正確に存在する。GENITIVE_MOD inside PP は正しく表現されている。DG engine の `deriveClauseCore` が fn=null 子クローズをスキップするため、到達できない。

解決策（別 Phase）: fn=null clause 子をどのように処理するかの設計判断が必要。ただし単純に「fn=null を全部処理」すると、本来別文として扱うべき discourse-level 節も描画されてしまうリスクがある。

---

## C. Participial Attachment Target

### 調査

**対象:** NT 全書の分詞トークン（morph_raw の位置4が 'P'）5,722 件

### C-1. 副詞的分詞 (Adverbial Participle)

**SR 表現:**
```
clause fn=ADVERBIAL
  token fn=PREDICATE 'ὑπάρχων' [V-PAP-NSM]   ← 副詞的分詞
  phrase.pp fn=ADVERBIAL cn=PREP_PHRASE
    token 'ἐν'
    phrase.np cn=GENITIVE_MOD
      token 'μορφῇ' ...
```

`clause fn=ADVERBIAL` が副詞的機能を明示する。DG はこれを `adverbialClauses` として抽出し、L-bracket + `分詞節` ラベルで描画（P5-D 実装済み）。

副詞的分詞を含む `clause fn=ADVERBIAL`: **1,636 件**（NT 全書）

**付着先（修飾先）の SR 表現:**  
付着先は tree 包含によって暗示される。`clause fn=ADVERBIAL` の親 clause に存在する `fn=PREDICATE` トークンが修飾対象。明示的ポインタは存在しないが、tree 構造から一意に決定可能。

**判定: SR 充足、DG 実装済み。付着先は tree 包含で暗示（明示ポインタなし）。**

### C-2. 形容詞的分詞 (Adjectival Participle)

**SR 表現:**
```
phrase.np fn=SUBJECT cn=ADJ_MOD   ← ADJ_MOD construction が明示マーカー
  token 'ἄνθρωπος' [N-NSM]        ← 修飾される名詞 (head)
  clause                           ← 形容詞的分詞節
    token fn=PREDICATE 'ἀπεσταλμένος' [V-RPP-NSM]   ← 形容詞的分詞
    phrase.pp fn=ADVERBIAL cn=PREP_PHRASE
      token 'παρὰ'
      token 'θεοῦ,'
```

`phrase.np cn=ADJ_MOD` construction が名詞修飾を明示する。  
非 ADJ_MOD の最初の子 = 修飾される名詞 head  
clause 子 = 形容詞的分詞節

**NT 全書の ADJ_MOD 分詞数:** 138 件（`fn=PREDICATE, ptype=phrase.np, pcn=ADJ_MOD`）  
**P5-gate 章の ADJ_MOD 分詞:**

| 箇所 | テキスト | morph | 現在の DG 表示 | 可達性 |
|---|---|---|---|---|
| JHN 1:6 | ἀπεσταλμένος | V-RPP-NSM | 全テキスト一括表示（分離なし） | ✅ 可達 |
| EPH 2:4 | ὑπερβάλλον | V-PAP-ASN | 全テキスト一括表示（分離なし） | ✅ 可達 |

### C-2 の DG 可達性トレース（JHN 1:6）

```
group → deriveFromGroup
  clause[.0] (fn=none) → deriveClauseCore(clause[.0])
    token[.0.0] fn=PREDICATE → mainSlots に追加 ✅
    phrase.np[.0.1] fn=SUBJECT cn=ADJ_MOD → mainSlots に追加 ✅
      extractSlotModifiers(phrase.np cn=ADJ_MOD) が呼ばれる
        Case A: node is GENITIVE_MOD? → No
        Case B: has ADV_MOD child? → No (ADJ_MOD ≠ ADV_MOD)
        Case C: has GENITIVE_MOD child? → No
        → returns null
      headDisplayText → 全テキスト返却（ἄνθρωπος ἀπεσταλμένος παρὰ θεοῦ,）
```

**結論:** phrase.np cn=ADJ_MOD は DG が到達できる（fn=SUBJECT であるため）。SR にデータが存在し DG に到達できる。しかし `extractSlotModifiers` が `ADJ_MOD` construction を処理しない。

**判定:**
- 副詞的分詞: **SR 充足 + DG 実装済み**
- 形容詞的分詞: **SR 充足**（ADJ_MOD construction が明示）、DG 到達可能だが抽出せず → **RENDERER COVERAGE GAP**

---

## 総合分類表

| 制約 | SR にデータ存在 | DG 到達可 | 現状 | 分類 |
|---|---|---|---|---|
| 関係詞先行詞コネクタ | ❌ なし | N/A | 表示不可 | **SR SCHEMA GAP** |
| PP 内 GENITIVE_MOD 表示 | ✅ あり | ❌ 不可達 | 不可達 | **RENDERER TRAVERSAL LIMITATION** |
| 形容詞的分詞の名詞付着 | ✅ あり (ADJ_MOD) | ✅ 可達 | 未抽出 | **RENDERER COVERAGE GAP** |
| 副詞的分詞の節付着 | ✅ あり (fn=ADVERBIAL) | ✅ 可達 | ✅ 実装済 | IMPLEMENTED |

---

## 次フェーズへの推奨

各分類に対する推奨対処（別 Phase での判断）:

### SR SCHEMA GAP → P6 以降
- 先行詞コネクタは SR schema に `antecedentId` フィールドが追加されるまで実装不可
- L-0 境界: 推論による先行詞決定は禁止

### RENDERER TRAVERSAL LIMITATION → P5-E 候補
- fn=null 節を処理する DG traversal 拡張の設計が必要
- リスク: fn=null 節には discourse-level 並置節が含まれ、無条件に描画すると構文ダイアグラムが混乱する
- 設計判断: どのような fn=null 節を traversal 対象とするか（別 Phase での仕様策定）

### RENDERER COVERAGE GAP → P5-E 候補
- `extractSlotModifiers` に Case D（ADJ_MOD）を追加
- ADJ_MOD construction の head = 最初の非 clause/非 phrase.np 子
- ADJ_MOD construction の modifier = clause 子（形容詞的分詞節）
- 変更が小さく、JHN 1:6 で即座に検証可能

---

## 調査使用データ

| データ | 件数/範囲 |
|---|---|
| SR ファイル | NT 全260ファイル |
| SR ノード（schema 調査） | 全トークン/句/節 |
| 関係代名詞トークン | 559件（JHN/ROM/PHP/EPH/MAT/COL） |
| construction.canonical 全種類 | 17種類 |
| 分詞トークン | NT 全書 5,722件 |
| PP+GENITIVE_MOD | NT 全書 575件 |

---

## 禁止事項の遵守確認

| 禁止項目 | 状態 |
|---|---|
| Production コード変更 (dg-engine.js) | 変更なし ✅ |
| Production コード変更 (index.html) | 変更なし ✅ |
| SR データ変更 | 変更なし ✅ |
| commit / merge / deploy | 実施せず ✅ |
| P5-E への自動進行 | 実施せず ✅ |

---

*証拠: P5-D.1_test_matrix.md / P5-D.1_final_report.md*  
*前提: P5-D_visual_grammar_core.md / P5-D_final_report.md*
