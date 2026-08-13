# SF-27 Long Branch Label — 表示上の要約（先頭＋…）

作成: 2026-08-13
State: IMPLEMENTED / VALIDATED（回帰PASS）/ MEASURED
前提: [SF-20](./SF-20-structure-flow-baseline-freeze.md)（凍結）, SF-26 実測監査
対象: `public/index.html` の `_sfRelationModel`→`_sfRenderRelationFlow` の**枝チップ表示文字列生成1箇所のみ**。

> 目的: 極端に長い従属節/目的語節が1枝チップに全token連結表示され「段落化」する問題（SF-26 で確認）を、
> **表示上だけ**「先頭＋…」に切り詰めて「構造上の枝ラベル」として走査可能にする。
> SF-20 の基本構造・Reading First・desktop/mobile 導線は不変。data/Japanese/解析結果は不変（L-0 安全）。

## 1. 設計判断（実装前・SF-26 実測から）

SF-26 実測（Chrome getBoundingClientRect, 360/420/620px）:
- 短枝 C1(1字)/C3(5,1字) … 1行・FLOW 120〜152px。
- 中枝 C6(22,23字) … 1行。C7 最長枝(30字) … 360px で2行。
- 極端 E1(JHN 1:29!10, 目的語 45token/137字) … **360px で6行・FLOW 244px**（段落化）。

境界（データ由来・恣意的固定値を先に置かない）:
- 360px の 1 行 ≈ **20〜22 日本語字**（E1: 137字/6行 ≈ 23字/行、C6: 23字=1行、C7: 30字=2行から逆算）。
- 「枝ラベルとして読める」上限 ≈ **約2行** → **閾値 40字**（≈2行分）に決定。
- 効果: **C1/C3/C6(23)/C7(30) は全て全文**（≤40）、**E1(137) のみ短縮**。token 数は line 数の proxy（char がより直接的）→ char 基準を採用。

## 2. 実装（1箇所）

`_sfRenderRelationFlow` の枝生成に、枝専用の切り詰めチップを追加:
```js
const SF_BRANCH_MAX = 40;
const branchChip = (n, isF) => {
    const full = _ft11LabelOf(n.tokens) || '（この構成語）';
    const shown = full.length > SF_BRANCH_MAX ? full.slice(0, SF_BRANCH_MAX) + '…' : full;
    return `<span class="sf-chip ${isF ? 'is-focus' : 'sf-ctx'}">${_escH(shown)}</span>`;
};
```
枝の map 内 `chip(n,isF)` → `branchChip(n,isF)` に変更。**第1層(主語+動詞)・上位は従来 `chip`（切り詰めなし）のまま**＝構造上、第1層は絶対に短縮されない。role/関係ラベル・frame・referent・nested は不変。

## 3. 実測結果（実装後・Chrome）

| Case | 枝(role/tok/字) | 360px 行数 前→後 | FLOW高(360) 前→後 | 判定 |
|---|---|---|---|---|
| C1 受ける | 目的語/1/1 | [1]→[1] | 120→120 | 不変（正） |
| C3 与える | 目的語/1/5, 間接/1/1 | [1,1]→[1,1] | 152→152 | 不変（正） |
| C6 できる | 目的語/7/22, 副詞/7/23 | [1,1]→[1,1] | 293→293 | 不変（不要短縮なし・正） |
| C7 倒れる | 副詞×4（最長 12/30） | [1,1,1,2]→[1,1,1,2] | 439→439 | 不変（過剰短縮なし・正） |
| **E1 極端** | 目的語/45/137 | **[6]→[2]** | **244→162** | **短縮（段落→2行ラベル）** |

- E1 枝チップ = 先頭40字＋「…」（例: `この私も〜である…`）。**第1層(動詞「言う")は全文＝不変**。
- 620px: E1 [3]→[1]・FLOW 183→120px。横 overflow なし（全幅・全ケース）。

## 4. 不変確認（SF-20 ほか）
第1層＝主語＋動詞／横並び／常に最上段／動詞から下方向へ枝／frame 既存ルール／自動詞 frame=0／`ὃ→πᾶν` 非描画／mobile 縦構造／Reading First／入口「文の組み立てを見る」／SF-22 mobile 接続 … すべて不変。CSS/DOM構造/データ/Japanese/構文解析 … 変更なし。

## 5. L-0 / スコープ
- 表示文字列の **prefix 表示＋「…」** のみ。日本語再生成・意味再解釈・新分類・推論・antecedent 推定なし ＝ **L-0 安全**。
- 全文は本文・読解 prose・Word Order Flow に存在（FLOW は構造補助）。枝クリック/折りたたみ/ツールチップ/遷移は追加しない。

## 6. 回帰
re-neighborhoodview(30)/-integration(34)/re-flowtree-adapter(28)/re-flowtree-runtime(10)/flow-dom(62/62・inline構文ゲート)/re-stageB(27) 全 PASS。diff は `public/index.html` の +12/−1 のみ（SF-27 以外の変更なし）。
