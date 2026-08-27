# P5-C Visual Grammar Audit — Final Report
## エグゼクティブサマリー

**Phase:** P5 — Original Greek NT Diagram Grammar  
**Date:** 2026-08-20  
**Scope:** JHN 1:1 / MAT 5:3 / EPH 2:8（desktop 1280px + mobile 390px）  
**Production code changes:** 0

---

## 結論

**P5-B実装は、Reed-Kellogg System の基本的視覚原則を部分的に達成している。**

> R-K図解の「骨格（ベースライン・SP垂直線・補語対角線）」は機能しているが、「筋肉（語レベル修飾・PP内部構造・等位並列・従属節接続）」は未実装のデザインギャップが多い。

P5-B MVP のスコープ定義（3聖句・SR SSO由来・L-0維持）を前提とすると、**この結果は想定範囲内**である。実装前に意図的にスコープ外とされた機能が、audit で「欠落」として現れている。

---

## 3聖句別サマリー

### JHN 1:1（ヨハネ 1章1節）

**総合評価: B+**

正常に機能:
- 3つの等位節それぞれにベースラインと全コネクタが正確に描画された
- COPULA `ἦν` がラベルなしでコネクタ間に正確に配置された（軸的役割を位置で示す）
- ギリシャ語語順（1a: CVS、1b: SVC、1c: CVS）が完全に保持された
- COMPLEMENTコネクタ対角線が3節すべてに存在する

問題:
- 等位節が縦積みレイアウトのため「1a が主節」という誤印象を与えうる（DESIGN GAP）
- complement対角線が22px幅で視覚的インパクトが弱い（UX WEAKNESS）
- `πρὸς τὸν θεόν` の前置詞内部構造が未表示（DESIGN GAP）

---

### MAT 5:3（マタイ 5章3節）

**総合評価: B**

正常に機能:
- verbless predication の破線対角線（implied connector）が正確に表示された
- ὅとι節が視覚的に従属関係として表示された（dashed border + インデント）
- ὅとι節内部の補語コネクタが正確（αὐτῶン ╲ ἐστιν | ἡ βασιλεία）

問題:
- `τῷ πνεύματι`（精神において）がSUBJECTテキストに埋め込まれ、修飾関係が非表示（DESIGN GAP）
- ὅとι節が主節のどのスロットに接続するかを示す線がない（DESIGN GAP）
- ラベル `従属節` がテキスト依存（位置・線ではない）

---

### EPH 2:8（エフェソ 2章8節）

**2文合計評価: B-**

#### s3（γάρ節）

正常に機能:
- 含意される ὑμεῖσ を追加しなかった（L-0 PASS）
- γάρ 接続詞の視覚的配置 ✓
- 副詞的PP（τῇ χάριτί、διὰ πίστεως）の副詞リスト表示 ✓

問題:
- 単要素ベースライン（述語のみ）は構造的に正しいが情報密度が低い
- `σεσῳσμένοι` のperiphrastic分詞構造が平文テキストに埋没（DESIGN GAP）
- `διὰ πίστεως` の前置詞内部構造未表示（DESIGN GAP）

#### s4（καί節）

正常に機能:
- SUBJECT（τοῦτο）と第1COMPLEMENT（ἐξ ὑμῶン）間のimplied connector ✓
- L-0 PASS ✓
- `οὐκ` の副詞的表示 ✓

問題:
- **第2COMPLEMENT（θεοῦ τὸ δῶρον）にコネクタがない — BUG候補** (FINDING-01)
  - `connectorBetween('COMPLEMENT', 'COMPLEMENT', true)` が `null` を返す設計問題
  - 図解上で `ἐξ ὑμῶン` と `θεοῦ τὸ δῶρον` の関係が全く読み取れない

---

## Findings サマリー（9件）

| ID | 分類 | 聖句 | 内容 |
|---|---|---|---|
| F-01 | **BUG候補** | EPH 2:8 s4 | 第2COMPLEMENTへのコネクタが生成されない |
| F-02 | UX WEAKNESS | JHN 1:1 | complement対角線コンテナが22pxで視覚的インパクト不足 |
| F-03 | DESIGN GAP | MAT 5:3 | 語レベル修飾語（τῷ πνεύματι等）がスロットテキスト埋め込み |
| F-04 | DESIGN GAP | 全パッセージ | PP内部構造（前置詞対角線）未実装 |
| F-05 | DESIGN GAP | JHN 1:1 | 等位節の縦積みが並列性より順序性を示す |
| F-06 | DESIGN GAP | MAT 5:3 | ὅとι節の主節への方向性ある接続線がない |
| F-07 | DESIGN GAP | EPH 2:8 s3 | periphrastic分詞の二重性マーキングなし |
| F-08 | EXPECTED | EPH 2:8 s3 | SUBJECTスロットなし（L-0正しい実装） |
| F-09 | UX WEAKNESS | 全パッセージ | solid/dashed対角線の視覚的差異が小さい |

---

## R-K/Leedy 原則カバレッジ

| 原則 | 実装 | 評価 |
|---|---|---|
| 水平ベースライン | ✓ | A |
| 主語/述語間垂直線（\|） | ✓ | A |
| 補語対角線（╲） | ✓（サイズ小） | B |
| 動詞なし節 破線対角線 | ✓ | B |
| ギリシャ語語順保持 | ✓ | A |
| L-0（含意語追加なし） | ✓ | A |
| COPULA 軸表示（ラベルなし） | ✓ | A |
| 語レベル修飾対角分離 | 未実装 | D |
| PP内部構造（前置詞対角線） | 未実装 | D |
| 分詞曲線マーキング | 未実装 | D |
| 等位節並列表示 | 部分的 | B |
| 従属節方向性ある接続 | 未実装 | C |

---

## P5-Dへの推奨事項

**最優先（BUG候補）:**
- FINDING-01: EPH 2:8 s4 第2COMPLEMENT接続問題の修正検討  
  `connectorBetween('COMPLEMENT', 'COMPLEMENT', noVerb)` の動作定義を明確化する。

**中優先（UX改善）:**
- FINDING-02: complement対角線コンテナ幅を36〜44pxに拡大
- FINDING-09: dashed/solidコネクタの視覚的差異を強化

**低優先（DESIGN GAP — 将来フェーズ）:**
- FINDING-03: 語レベル修飾語の分離（DR拡張）
- FINDING-04: PP内部構造（前置詞対角線）
- FINDING-05: 等位節並列レイアウト改善
- FINDING-06: 従属節接続線の方向性付与
- FINDING-07: periphrastic分詞マーキング

---

## Audit 完了状態

```
STATE: DONE
Production code changes: 0
Screenshots: CONFIRMED (D_jhn11_dgview.png, D_mat53_dgview.png, D_eph28_s1_dgview.png, D_eph28_s2_dgview.png, M_jhn11_dgview.png)
Evidence level: CONFIRMED (screenshots) + INFERRED (CSS metrics from conn_inspect.json)

NEXT: P5-D (pending user approval)
AUTO-ADVANCE: NO
COMMIT/MERGE/DEPLOY: NO
```

---

*詳細: P5-C_visual_grammar_audit.md / P5-C_visual_matrix.md / P5-C_findings.md*
