# P5-C Visual Grammar — Fidelity Matrix
## R-K / Leedy 原則 × 聖句別 評価マトリクス

**Phase:** P5 — Original Greek NT Diagram Grammar  
**Date:** 2026-08-20

---

## グレードスケール

| グレード | 意味 |
|---|---|
| **A** | 位置・線・接続だけで構造が伝わる（ラベル不要） |
| **B** | 構造は存在するが視覚的インパクトが弱い — 事前知識があれば読める |
| **C** | 部分的に欠落または誤解を招く表示 |
| **D** | 完全に欠如 — 当該構造が表示されていない |
| **N/A** | 当該聖句には適用されない構造 |

---

## 主マトリクス

| # | 評価軸（R-K/Leedy原則） | JHN 1:1 | MAT 5:3 | EPH 2:8 s3 | EPH 2:8 s4 |
|---|---|---|---|---|---|
| 1 | MAIN LINE — 水平ベースライン上の主述配置 | **A** | **A** | **A** | **B** |
| 2 | SP CONNECTOR — 主語/述語間の垂直線（\|） | **A** | **A** | N/A¹ | N/A¹ |
| 3 | COMPLEMENT — 後向き対角線（╲）の存在 | **B** | **B** | N/A² | N/A² |
| 4 | COMPLEMENT — 対角線の視覚的明瞭さ | **B** | **B** | N/A | N/A |
| 5 | MODIFIER — 語レベル修飾語の対角分離 | N/A | **D** | **D**³ | **D**³ |
| 6 | SUBORDINATE CLAUSE — 従属節の視覚的従属 | N/A | **B** | N/A | N/A |
| 7 | SUBORDINATE CLAUSE — 修飾先への方向性ある接続 | N/A | **C** | N/A | N/A |
| 8 | COORDINATION — 等位節の並列構造表示 | **B** | N/A | N/A | N/A |
| 9 | PP STRUCTURE — 前置詞を対角線上に置くPP内部構造 | **D** | N/A | **D** | **D** |
| 10 | IMPLIED CONNECTOR — 動詞なし節の破線対角線 | N/A | **B** | N/A | **C** |
| 11 | WORD ORDER — ギリシャ語語順の保持 | **A** | **A** | **A** | **A** |
| 12 | L-0 — 含意主語・補完テキストの非追加 | **A** | **A** | **A** | **A** |
| 13 | COPULA — copulaの軸的位置表示（ラベルなし） | **A** | N/A⁴ | N/A⁴ | N/A⁴ |
| 14 | PARTICIPIAL STRUCTURE — 分詞の二重性マーキング | N/A | N/A | **D** | N/A |

**脚注:**  
¹ SUBJECTスロットが存在しないためSP境界を示す機会なし  
² COMPLEMENTスロットが存在しない（PREDICATE節のみ）  
³ 副詞的PPは句単位での副詞リスト表示（語レベル分離とは別）  
⁴ 動詞なし節または分詞periphrastic構文であり通常のcopulaがない

---

## 集計サマリー

| グレード | 件数 | 割合 |
|---|---|---|
| **A** | 15 | 38% |
| **B** | 10 | 26% |
| **C** | 2 | 5% |
| **D** | 7 | 18% |
| N/A | 5 | 13% |

※N/A除く適用可能な評価軸34件中:  
- A: 15/34 = 44%  
- B: 10/34 = 29%  
- C: 2/34 = 6%  
- D: 7/34 = 21%

---

## 聖句別グレード分布

### JHN 1:1

| 評価軸 | グレード | 補足 |
|---|---|---|
| MAIN LINE | A | 3節それぞれ明確なベースライン |
| SP CONNECTOR | A | 垂直線 \| が明確 |
| COMPLEMENT diagonal | B | 存在するが22px幅は小さい |
| COORDINATION | B | 縦積み + καί ジョイナー（並列性は弱い） |
| PP STRUCTURE | D | `πρὸς τὸν θεόν` が平文 |
| WORD ORDER | A | CVS/SVC/CVSそれぞれ保持 |
| L-0 | A | 含意テキスト追加なし |
| COPULA | A | ἦν がコネクタ間に位置、ラベルなし |

**JHN 1:1 総合: B+** — 主要R-K構造（ベースライン・垂直線・対角線）は機能している。PP構造と対角線サイズが課題。

---

### MAT 5:3

| 評価軸 | グレード | 補足 |
|---|---|---|
| MAIN LINE | A | 明確 |
| SP CONNECTOR | A | ὅτι節内部で確認 |
| COMPLEMENT diagonal | B | ὅτι節内αὐτῶンで確認（小さい） |
| MODIFIER ATTACHMENT | D | τῷ πνεύματι が主語テキストに埋め込み |
| SUBORDINATE (存在) | B | dashed-border box + 従属節ラベル |
| SUBORDINATE (接続) | C | 接続先スロット不明 |
| IMPLIED CONNECTOR | B | 破線対角線存在（実線との差が微妙） |
| WORD ORDER | A | Μακάριοι — S word order保持 |
| L-0 | A | copula εἰμί を追加していない |

**MAT 5:3 総合: B** — verbless predication表示は正確。語レベル修飾の欠如が最大の弱点。

---

### EPH 2:8 s3（γάρ節）

| 評価軸 | グレード | 補足 |
|---|---|---|
| MAIN LINE | A | 単要素だが明確なベースライン |
| WORD ORDER | A | `ἐστε σεσῳσμένοι` 語順保持 |
| L-0 | A | ὑμεῖς（含意主語）追加なし |
| PP STRUCTURE | D | `διὰ πίστεως` が平文 |
| PARTICIPIAL | D | σεσῳσμένοι の二重性マーキングなし |

**EPH 2:8 s3 総合: B-** — L-0維持は正確。PP・分詞構造が欠如している。

---

### EPH 2:8 s4（καί節）

| 評価軸 | グレード | 補足 |
|---|---|---|
| MAIN LINE | B | 双COMPLEMENTが不明瞭 |
| IMPLIED CONNECTOR | C | 第1COMPLEMENTのみ接続、第2は孤立 |
| WORD ORDER | A | τοῦτο — ἐξ ὑμῶン — θεοῦ τὸ δῶρον 保持 |
| L-0 | A | 含意テキスト追加なし |
| PP STRUCTURE | D | `ἐξ ὑμῶν` が平文 |

**EPH 2:8 s4 総合: C+** — 第2COMPLEMENTの接続欠如が構造的誤読を招く。

---

## R-K/Leedy 原則カバレッジ（P5-B実装）

### 実装済み（機能している）

- 水平ベースライン ✓
- SP垂直コネクタ ✓
- COMPLEMENT後向き対角線（存在） ✓
- IMPLIED破線対角線（verbless） ✓
- ギリシャ語語順保持 ✓
- L-0（含意語追加なし） ✓
- COPULA軸表示（ラベルなし） ✓
- 等位節の視覚的連結（καί ジョイナー） ✓
- 従属節の視覚的従属（dashed border + インデント） ✓

### 未実装（DESIGN GAPとして記録）

- PP内部構造（前置詞を対角線上に） — 全パッセージ
- 語レベル修飾語の対角分離 — MAT 5:3
- 分詞の二重性マーキング — EPH 2:8 s3
- 等位節の厳密な並列表示 — JHN 1:1
- 従属節の方向性ある接続線 — MAT 5:3
- 第2COMPLEMENT接続 — EPH 2:8 s4

---

*Production code changes: 0*  
*詳細: P5-C_visual_grammar_audit.md*  
*問題分類: P5-C_findings.md*
