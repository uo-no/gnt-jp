# P5-C Visual Grammar — Findings
## 問題分類リスト（修正候補）

**Phase:** P5 — Original Greek NT Diagram Grammar  
**Audit State:** READ ONLY — 問題の記録のみ、修正なし  
**Date:** 2026-08-20

---

## 分類定義

| 分類 | 意味 |
|---|---|
| **BUG** | 実装が意図と一致していない不具合 |
| **DESIGN GAP** | 設計時点でスコープ外として意図的に除外された欠如 |
| **UX WEAKNESS** | 機能的には正しいが視覚的インパクトが不十分 |
| **EXPECTED** | 設計原則（L-0、SR SSOT等）から派生する期待される挙動 |

---

## FINDING-01

**分類:** BUG候補  
**タイトル:** EPH 2:8 s4 — 第2COMPLEMENTにコネクタが存在しない  
**パッセージ:** EPH 2:8 sentence 4（καί節）  
**CONFIRMED:**  
- `τοῦτο`（SUBJECT）— dashed diagonal — `ἐξ ὑμῶν`（COMPLEMENT）`θεοῦ τὸ δῶρον`（COMPLEMENT）
- `ἐξ ὑμῶン`（第1COMPLEMENT）はIMPLIEDコネクタで主語と接続されている。
- `θεοῦ τὸ δῶρον`（第2COMPLEMENT）はコネクタなしでベースライン上に置かれている。

**根拠:**  
`dg-engine.js` の `connectorBetween(prevFn, curFn, noVerb)` は:
```javascript
if (noVerb) {
    return (subj && comp) ? 'implied' : null;
}
```
`prevFn='COMPLEMENT', curFn='COMPLEMENT'` のケースでは `subj=false, comp=true` → `(subj && comp)` は false → `null` を返す。

第2COMPLEMENT（prevが既にCOMPLEMENT）にはコネクタが割り当てられない。

**影響:** EPH 2:8 s4 の図解で第2COMPLEMENTが孤立して見える。`ἐξ ὑμῶン` と `θεοῦ τὸ δῶρον` の関係が読み取れない。

**修正候補（P5-D以降、実装しない）:**  
`connectorBetween` に `comp && comp` ケースを追加し、COMPLEMENT→COMPLEMENT間を `complement`（または新しいコネクタ種別）で接続する。あるいは、SRの構造を見直して apposition か parallel として扱うか判断が必要。

**参照:**  
- `dg-engine.js:74-97`（connectorBetween関数）
- `dg-engine.js:126-129`（connectorBetween呼び出し）
- スクリーンショット: `D_eph28_s2_dgview.png`

---

## FINDING-02

**分類:** UX WEAKNESS  
**タイトル:** COMPLEMENTコネクタ対角線のサイズが小さすぎる  
**パッセージ:** JHN 1:1（全節）、MAT 5:3 ὅτι節  
**CONFIRMED:**  
- `dg-conn-complement` / `dg-conn-implied` のコンテナ幅が約22px。
- `::after` 疑似要素に `width: 28px; border-top: 2px solid; transform: rotate(-38deg)` を適用。
- スクリーンショット上でコネクタが非常に小さく見える（約22px幅の斜線）。

**影響:**  
- 对角コネクタを見落とすと、COMPLEMENTスロットが「浮いている」ように見える。
- 特にモバイル（M_jhn11_dgview.png確認）では視覚的インパクトがさらに低下する可能性。

**修正候補（P5-D以降）:**  
コネクタコンテナ幅を36〜44pxに拡大するか、コネクタの線を太く（3〜4px）するか、コンテナ背景に薄いtintを追加して視認性を高める。スロット間のvertical paddingも増やすことで対角線の角度を活かせる。

**参照:**  
- `index.html`: `.dg-conn-complement::after`（CSSセクション）
- スクリーンショット: `D_jhn11_dgview.png`、`M_jhn11_dgview.png`

---

## FINDING-03

**分類:** DESIGN GAP  
**タイトル:** 語レベル修飾語（与格修飾・属格）がスロットテキストに埋め込まれている  
**パッセージ:** MAT 5:3（主節・ὅτι節）  
**CONFIRMED:**  
- SUBJECTスロットのテキスト: "οἱ πτωχοὶ τῷ πνεύματι,"（`τῷ πνεύματι` 埋め込み）
- ὅτι節 SUBJECTスロットのテキスト: "ἡ βασιλεία τῶν οὐρανῶν."（`τῶν οὐρανῶν` 埋め込み）

**根拠:**  
`dg-engine.js:68-70` の `displayText(node)`:
```javascript
function displayText(node) {
    return getTokens(node).map(t => t.text || '').join(' ').trim();
}
```
SR のスロット（phrase.np 等）に含まれる全トークンをスペースで連結して返すため、内部に修飾語が含まれていても分離されない。

SR での `phrase.np[SUBJECT]` の中に `τῷ πνεύματι` が埋め込まれており、SR SSOT原則上この情報はSRに存在する。

**影響:**  
- `τῷ πνεύματι`（"精神において"）がSUBJECTの一部として読まれ、`πτωχοί`（貧しい人々）の修飾語であることが視覚的に伝わらない。
- R-K では `πτωχοί` から左下に対角線を引き `τῷ πνεύματι` をぶら下げる。

**分類理由:**  
P5-B MVP のスコープでは「SRのphrase単位をスロットとして表示する」と定義されており、phrase内部の語レベル分解は意図的にスコープ外。DESIGN GAPとして記録。

**修正候補（P5-D以降）:**  
SRの phrase 内部子ノードを解析し、phrase内に `ADVERBIAL` / `GENITIVE_MOD` / `ARTICULAR_NP` 構造を持つ場合、それを別ブランチとして派生させるDR拡張を検討する。ただし SR SSOT原則に従い、新たな構文推論は行わない。

**参照:**  
- `dg-engine.js:68-70`（displayText）
- `public/assets/data/sr/MAT/5.json`（sentence 3 のSR構造）
- スクリーンショット: `D_mat53_dgview.png`

---

## FINDING-04

**分類:** DESIGN GAP  
**タイトル:** 前置詞句（PP）の内部構造（前置詞を対角線上に）が未実装  
**パッセージ:** JHN 1:1b、EPH 2:8 s3、EPH 2:8 s4  
**CONFIRMED:**  
- `πρὸς τὸν θεόν`（JHN 1:1b COMPLEMENT）: 平文 "πρὸς τὸν θεόν," として表示
- `διὰ πίστεως`（EPH 2:8 s3 ADVERBIAL）: 平文 "διὰ πίστεως·" として表示
- `ἐξ ὑμῶν`（EPH 2:8 s4 COMPLEMENT）: 平文 "ἐξ ὑμῶν," として表示

**根拠:**  
SR の `phrase.pp[COMPLEMENT]` 等は、`displayText()` で内部トークン（前置詞+名詞）を連結して返すだけ。PP内部構造分解はP5-B MVPスコープ外。

**影響:**  
- R-K では `πρός` が対角線上、`τὸν θεόν` が水平延長上に配置される。
- 現在の実装ではPPが一つのテキスト固まりとして表示されており、前置詞の支配関係が視覚化されない。

**修正候補（P5-D以降）:**  
SRの `phrase.pp` 内部に `CONJ/PREP` 相当のトークンがある場合（`evidence.morph_raw.startsWith('PREP')`）、前置詞トークンを対角線スロットとして分離し、支配名詞を水平延長で表示するDR拡張を検討する。

**参照:**  
- `dg-engine.js:68-70`（displayText — PP分解なし）
- スクリーンショット: `D_jhn11_dgview.png`、`D_eph28_s1_dgview.png`、`D_eph28_s2_dgview.png`

---

## FINDING-05

**分類:** DESIGN GAP  
**タイトル:** 等位節のレイアウトが並列性より順序性を示す  
**パッセージ:** JHN 1:1  
**CONFIRMED:**  
- 3節が縦積み（1a → 1b → 1c）で表示。
- 節間に `— καί` テキストラベル。
- 各節は独立したベースラインを持ち、構造内容は正確に表示されている。

**影響:**  
- 縦積みレイアウトは「1a が主節、1b・1c が副次的」という視覚的ヒエラルキーを示唆する。
- R-K では等位節を横に並べ（または同じ高さの平行ラインで）並列性を明示する。
- ただし、3節の内容（語数・構造）が異なるため、完全な横並びは実装コストが高い。

**修正候補（P5-D以降）:**  
等位節間を `dg-coord-join` から、より明確な「並列ブラケット」（例: 左端にまとめ縦線）で示すことを検討。または、等位節のラベル（① ② ③）を廃止し、並列を示すvisual要素を追加する。

**参照:**  
- `index.html`: `_dgRenderClause` 内の COORDINATION レンダリング（`dg-coord-wrap`）
- スクリーンショット: `D_jhn11_dgview.png`

---

## FINDING-06

**分類:** DESIGN GAP  
**タイトル:** MAT 5:3 ὅτι節の接続先が視覚的に不明  
**パッセージ:** MAT 5:3  
**CONFIRMED:**  
- ὅとι節は `従属節` ラベル付きボックスに収納され、主節の下にインデント配置。
- 主節のどのスロット（COMPLEMENT / SUBJECT / 全体）に接続されているかを示す線がない。
- `従属節` ラベルはテキスト依存（位置・線ではない）。

**SR根拠:**  
SR で ὅとι節は主節の ADVERBIAL スロットとして分類されている（`fn: 'ADVERBIAL'`）。したがって「主節全体の副詞的要素」として扱うことはSR的に正しい。しかし視覚的に「どこから来ているか」が不明。

**影響:**  
- R-K では従属節を修飾する語からstair-stepで接続する線を引く。
- 現在は「何となく下にある」という視覚的印象のみ。

**修正候補（P5-D以降）:**  
`dg-adv-clause` のコネクタを、主節のPREDICATEスロット（または verbless節の場合は全体）から出る線として描画する。現在の `└` ブラケット方式を拡張して、対応する主節スロットへの方向性を持たせる。

**参照:**  
- `index.html`: `_dgRenderAdvPhrases` / adverbialClause render部分
- スクリーンショット: `D_mat53_dgview.png`

---

## FINDING-07

**分類:** DESIGN GAP  
**タイトル:** EPH 2:8 s3 σεσῳσμένοι — 分詞periphrastic構造が視覚的に区別されない  
**パッセージ:** EPH 2:8 sentence 3  
**CONFIRMED:**  
- `ἐστε σεσῳσμένοι` がPREDICATEスロットに平文テキストとして表示。
- `σεσῳσμένοι`（完了受動分詞）がἐστεとperiphrastic述語を形成しているが、この二重性が視覚的に示されない。
- R-K/Leedy では分詞を曲線上に配置して動詞的・形容詞的二重性を示す。

**SR根拠:**  
SR で `phrase.vp[PREDICATE]{cn=COPULAR_VP}` がἐστε + σεσῳσμένοι を一体として PREDICATE として分類しており、SR SSOT上は一つのPREDICATEスロット。分詞の分離はSR内では行われていない。

**分類理由:**  
SR SSOT に従う限り、periphrastic分詞の内部分離は「SR への新しい構文推論の追加」となりP5-B スコープ外。DESIGN GAP。

**修正候補（P5-D以降）:**  
SR の `phrase.vp` 内部で補助動詞（ἐστε）と分詞（σεσῳσμένοι）が識別できる場合、DRでそれらを別サブスロットとして分離し、分詞には曲線ブランチを付与することを検討する。ただしSR SSOT原則への影響を事前に評価する必要あり。

**参照:**  
- `dg-engine.js:68-70`（displayText — vp内部分解なし）
- スクリーンショット: `D_eph28_s1_dgview.png`

---

## FINDING-08

**分類:** EXPECTED BEHAVIOR  
**タイトル:** EPH 2:8 s3 — SUBJECTスロットなし  
**パッセージ:** EPH 2:8 sentence 3  
**CONFIRMED:**  
- PREDICATEスロット（述語）のみがベースライン上に存在する。
- SUBJECTスロットが存在しない → 含意されるὑμεῖσは追加されていない。

**評価:**  
これはL-0原則（含意要素を追加しない）の正しい実装。SRにSUBJECTノードがないため、DRにも存在しない。  
図解として「単要素ベースライン」は情報密度が低く見えるが、L-0・SR SSOT上は正しい結果。

**分類理由:** EXPECTED BEHAVIOR（P5設計内）。問題なし。

**参照:**  
- `dg-engine.js:124`（`hasVerb = mainSlots.some(...)` — SUBJECT不在は別途確認不要）

---

## FINDING-09

**分類:** UX WEAKNESS  
**タイトル:** solid complement対角線とdashed implied対角線の視覚的差異が小さい  
**パッセージ:** JHN 1:1（solid）vs MAT 5:3 / EPH 2:8 s4（dashed）  
**CONFIRMED:**  
- 両コネクタ共に約22px幅コンテナ、`::after` 疑似要素で `border-top: 2px` の線。
- スクリーンショット上でどちらも「短い斜線」として見え、実線か点線かを区別するには注意が必要。
- `border-top: 2px solid`（complement）vs `border-top: 2px dashed`（implied）の差は小さい。

**影響:**  
- 「copulaあり補語」と「verbless predication」の意味的差異がdiagram上で伝わりにくい。
- 両者の区別はR-K/Leedy図解では重要な情報。

**修正候補（P5-D以降）:**  
dashed connector の透明度を上げる（例: `opacity: 0.6`）か、色を変える（`var(--text-muted)` より薄いtone）か、dash間隔を広げてより明確に「点線」と認識させる。

**参照:**  
- `index.html`: `.dg-conn-complement::after` vs `.dg-conn-implied::after`
- スクリーンショット: `D_jhn11_dgview.png`、`D_mat53_dgview.png`

---

## 優先度サマリー

| FINDING | 分類 | 影響度 | P5-D優先度 |
|---|---|---|---|
| FINDING-01 (EPH 2:8 s4 第2COMPLEMENT接続なし) | BUG候補 | 高 | HIGH |
| FINDING-02 (対角線サイズ小) | UX WEAKNESS | 中 | MEDIUM |
| FINDING-03 (語レベル修飾語埋め込み) | DESIGN GAP | 中 | MEDIUM |
| FINDING-04 (PP内部構造未実装) | DESIGN GAP | 中 | MEDIUM |
| FINDING-09 (solid/dashedの差が小) | UX WEAKNESS | 低 | LOW |
| FINDING-05 (等位節の並列性) | DESIGN GAP | 低 | LOW |
| FINDING-06 (ὅとι節接続先不明) | DESIGN GAP | 低 | LOW |
| FINDING-07 (periphrastic分詞) | DESIGN GAP | 低 | LOW |
| FINDING-08 (SUBJECT不在) | EXPECTED | なし | N/A |

---

*Production code changes: 0*  
*詳細監査: P5-C_visual_grammar_audit.md*  
*マトリクス: P5-C_visual_matrix.md*
