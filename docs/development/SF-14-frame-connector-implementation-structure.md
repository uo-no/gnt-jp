# SF-14 Frame Connector 実装構造（記録 → 実装）

作成: 2026-08-12
State: STRUCTURE RECORD → IMPLEMENT（表示層のみ・SF-13 案C）
前提: [SF-12](./SF-12-relation-visual-refinement.md), [SF-13](./SF-13-frame-connector-design-audit.md)
成功条件: 弧の存在ではなく、**desktop で focus と frame target の対応が一目で判別できること**。

---

## 1. 実データ→edge（実測・6:37）

edge は (predIdx : argIdx) の band chip index ペア。全て focus に接続する。
- **focus=δίδωσίν(与える, band idx1)**: frame A1→[0]〜するもの / A2→[2]私 / A0→[3]［冠詞］父 ⇒ edges `1:0, 1:2, 1:3`（arrowhead=arg 側）。role は各 arg の真上（目的語/間接目的語/主語＝SF-12）。
- **focus=πᾶν**: frame 無・被参照無 ⇒ **edge 0 個 → 弧なし**（存在しない関係を作らない）。
- **focus=ὃ(band idx0)**: 与える(idx1) の項 ⇒ edge `1:0`（arg=focus）。ὃ→πᾶν は無し。
- nested: A0 の node-id は語 πατὴρ(!6) だが、これを含む **band chip [3]（［冠詞］父）へ接続**（個別 token へは drill しない）。
- 文外(6:35 等)・ゼロ(n00000000000) は **edge に含めない**。

## 2. 4チャネルの視覚分離（SF-13 §7 準拠）

| relation | 位置 | 線種 | 矢頭 | 色 |
|---|---|---|---|---|
| 包含 | 帯の面＋上位への縦線 | 実線(縦) | なし | border |
| 順序 | chip 間インライン `→` | 文字 | → | text-sub |
| **frame** | **chip 行の下 strip** | **実線弧** | **arg側に▸** | accent |
| **referent** | **chip 行の上 strip（role行の更に上）** | **点線弧** | なし | text-sub |

role（SF-12）は chip 真上のラベル（チャネルではない）。生値は非表示。

## 3. DOM 構造

`_sfRenderRelationFlow` の出力（focusband）を拡張。edge があるときのみ arc strip と data を出す。

```html
<div class="sf-rel">
  <div class="sf-rel-focusband" data-sf-frame="1:0,1:2,1:3" data-sf-ref="">
    <div class="sf-arc-strip sf-arc-ref" aria-hidden="true"></div>   <!-- 上: referent（enhancerがSVG充填） -->
    <span class="sf-cap">所属するまとまり</span>
    <div class="sf-rel-row">
      <span class="sf-col"><span class="sf-role-cap">目的語</span>
            <span class="sf-chip sf-ctx" data-sf-idx="0">〜するもの</span></span>
      <span class="sf-col sf-arrowcol"><span class="sf-role-cap"></span><span class="sf-rel-arrow">→</span></span>
      <span class="sf-col"><span class="sf-role-cap is-focus">動詞</span>
            <span class="sf-chip is-focus" data-sf-idx="1">与える</span></span>
      … 私[2] … ［冠詞］父[3] …
    </div>
    <div class="sf-arc-strip sf-arc-frame" aria-hidden="true"></div> <!-- 下: frame（enhancerがSVG充填） -->
    <div class="sf-frame-note">項：目的語 〜するもの／間接目的語 私／主語 父</div> <!-- 縮退用・既定hidden -->
  </div>
  … 上位 band …
  <div class="sf-note sf-ref-note">共参照：…</div>  <!-- referent 縮退/文外用・既定は文外時のみ -->
</div>
```
- chip に `data-sf-idx`。edge は focusband の `data-sf-frame` / `data-sf-ref`（"pred:arg" / "src:tgt" のCSV）。
- text-note（`.sf-frame-note` / `.sf-ref-note`）は**常に DOM に持ち**、幅広で弧が描けた時は hidden、縮退時に表示。

## 4. Enhancer `_sfEnhanceRelations(scope)`（レイアウト後に実行）

1. `scope` 内の各 `.sf-rel-focusband[data-sf-frame]|[data-sf-ref]` について:
2. chip[data-sf-idx] の `getBoundingClientRect` を band 基準で取得（中心x・上端/下端y）。
3. **折返し検出**: edge 関与 chip の `offsetTop` が全て一致（同一行）でなければ **縮退**（弧を消し `.sf-frame-note`/`.sf-ref-note` を表示）→ 次へ。
4. 同一行なら SVG を strip に生成:
   - frame: 各 (pred,arg) を下 strip に2次ベジェ弧。**span 長い弧を下（深い level）** に置き入れ子化。arg 側に▸。stroke=accent 実線。
   - referent: 各 (src,tgt) を上 strip に点線弧（矢頭なし・stroke=text-sub 破線）。
   - text-note は hidden。
5. `ResizeObserver`（panel 幅変化）＋描画直後の 1 回で再計算（debounce）。破棄時 observer 解除。

- 弧は **focus を共有する扇形**（SF-13 §3）。相互交差最小。level 入れ子で重なりも意味保持。
- SVG は inline（ゼロ依存）。strip 高さ = (level数)×約9px。

## 5. CSS（要点）

```
.sf-arc-strip { position: relative; width: 100%; height: 0; }          /* enhancer が高さと svg を設定 */
.sf-arc-frame svg path { stroke: var(--accent); fill: none; stroke-width: 1.25; }
.sf-arc-frame svg .sf-arw { fill: var(--accent); }                     /* 矢頭 */
.sf-arc-ref svg path { stroke: var(--text-sub); stroke-dasharray: 3 3; fill: none; }
.sf-frame-note, .sf-ref-note { display: none; }                        /* 既定 hidden、縮退で block */
.sf-rel-focusband.sf-degraded .sf-frame-note { display: block; }
```
- 縮退(`sf-degraded`)時: strip 空・note 表示 ＝ SF-12＋短い注記（情報保持）。

## 6. 縮退方針（幅段階）

- **十分な幅（弧成立）**: 弧表示・note hidden。→ 最初にこの幅で検証。
- **420px**: 収まれば弧、折返せば縮退。
- **360px**: 原則 **縮退（SF-12＋注記）**。弧を無理に維持しない（SF-13 §6）。

## 7. 実装範囲 / 不変

- 変更: `public/index.html`（`_sfRelationModel` に frameEdges/referentEdges・`_sfRenderRelationFlow` に strip/data・`_sfEnhanceRelations` 追加・reading-notes 描画後フック・CSS）。
- 不変: SF-11 データ経路（flow-tree v2）、adapter、NeighborhoodView、Reading Engine。推論なし。ὃ→πᾶν 非生成。文外/ゼロ非接続。

## 8. 検証（実装後）

- 実 Chrome（harness は実レイアウト＋script 実行）で **wide→420→360**。
- δίδωσίν で主語/目的語/間接目的語 の3接続が判別可（成功条件）。πᾶν/ὃ で非生成確認。6:38(nested)/6:39(referent同文)/6:51(複雑)。
- Regression（SF-11/12 と同一）。
