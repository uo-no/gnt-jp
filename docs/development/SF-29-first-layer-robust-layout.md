# SF-29 第一層レイアウトの堅牢化（枝幅で折り返さない）

作成: 2026-08-13
State: IMPLEMENTED / VALIDATED（回帰PASS）/ MEASURED（geometry acceptance 達成）
対象: `public/index.html` の Structure Flow CSS のみ（DOM/JS/データ/Reading Engine 不変）。
前提: SF-19（縦型）, SF-27（長枝40字要約・不変）, SF-29 UX監査（縦積み退行を実測）。

> 目的: 長い枝があっても第1層（主語＋動詞）を常に横並びで固定し、枝幅で折り返さない。

## 1. 根本原因
`.sf-l1`(flex-wrap:wrap) の子は `[主語 .sf-col][.sf-verb-wrap]`。`.sf-verb-wrap` は flex **column** で `[動詞][.sf-branches]` を内包するため、その幅＝最長枝の幅。長い枝で verb-wrap が広がると `.sf-l1` の wrap が働き、**動詞が主語の下へ回り込み縦積み**になっていた（監査実測: 答える/できる/倒れる で 動詞 top=103≠主語 top=50）。

## 2. 採用した解決（CSS のみ・DOM 不変＝trunk は動詞下のまま）
- `.sf-l1`: `flex-wrap: wrap → nowrap`（主語と動詞を常に同一行に固定）。
- `.sf-l1 > .sf-col { flex: 0 1 auto; min-width: 0; }`（主語＝内容幅・必要時のみ縮む）。
- `.sf-l1 > .sf-verb-wrap { flex: 1 1 0; }`（動詞＋枝は残り幅を占有。枝幅で第1層を折り返さない）。
- `.sf-verb-wrap > .sf-branches { align-self: stretch; min-width: 0; }`（枝は verb-wrap 幅に追従して**内部で折返す**＝横 overflow なし）。

避けた手法: `flex-wrap:nowrap` 単独ではみ出し、`overflow:hidden` で枝を切る、等は不採用（枝は幅内で折返す）。

## 3. Geometry Before / After（実 Chrome 実測）
| Case | Width | Before subj.top / verb.top | After subj.top / verb.top |
|---|---|---|---|
| 与える | 620 | 50 / 50 | 50 / 50 |
| 答える | 620 | 50 / **103** | 50 / **50** |
| できる | 620 | 50 / **103** | 50 / **50** |
| 倒れる | 620 | 50 / **103** | 50 / **50** |
| 答える | 420 | 50 / **103** | 50 / **50** |
| 答える | 360 | 50 / **103** | 50 / **50** |

`abs(subj.top - verb.top) = 0 ≤ 2px` を全4ケース×620/420/360 で達成。

## 4. Trunk geometry（動詞側から出ていること）
| Case | verb.left | trunk.left | 主語.right | 判定 |
|---|---|---|---|---|
| 答える/倒れる | 119 | 128 | 107 | trunk > verb.left > 主語.right ✓ |
| 与える/できる | 95 | 104 | 83 | trunk > verb.left > 主語.right ✓ |
枝(trunk)は動詞の右下から出ており、主語からは出ていない。

## 5. 副作用（高さ・overflow）
- 620px: 複雑文の高さが**減少**（C6 249→197, C7 377→325。縦積み解消で1行化）。
- 360px: 枝が verb-wrap 幅内で折返すため一部+1行（C6 293→301）。第1層は横並び維持。
- 横 overflow なし（band 幅 ≤ container を全幅で確認）。C1/C3/E1 高さ不変。
- 単段フォールバック（役割なし band＝`.sf-rel-row`）・上位 band・枝なし verb 文・collapsed/expanded は `.sf-l1` 非経由 or 影響なしで不変。

## 6. 不変（SF-20〜28 維持）
入口「文の組み立てを見る」/ collapsed / 第1層＋枝 / 長枝40字要約 / role・frame・referent 表示 / mobile 語詳細内の位置 / L-0 / Reading Engine・Lowfat・flow-tree データ … すべて不変。変更は表示 CSS 4宣言のみ。

## 7. 未解決（別タスク）
- 下部詳細情報と FLOW の情報階層（SF-29 監査 P0-3）は本SF対象外。今回のレイアウト修正で高さ・境界に上記変化はあるが、階層再設計は別途。
- 長枝チップの「カード見え」（SF-29 監査 P1-1）は別途。
- 実 GUI ピクセル目視は環境制限で未取得（geometry acceptance は実測達成）。
