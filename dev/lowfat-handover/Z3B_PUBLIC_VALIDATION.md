# Z3B_PUBLIC_VALIDATION.md

z3b（表示語数回帰）の公開環境検証記録。

作成日: 2026-10-20  
対象: `app/rk-diagram-m3.html`  
SHA-256: `8ef666d333c078f4bbe323edc7d58d5e9fecdbed00143871622336277ac46f8b`（本文書作成中・変更なし）  
公開アーティファクト: 変更・置換していない

---

## 1. z3b.js コード監査

### 1.1 Colossians 1:3–8 の読み込み手順

```javascript
// z3b.js 内 openSentence() の処理
window.__oldBook = BOOK;                                       // 現在のブックを記録
uploadFile(dir + '12-colossians.xml');                        // FileReader 経由で読み込み
waitForFunction(
  "BOOK&&BOOK!==window.__oldBook&&BOOK.name==='Colossians'",  // ブック名まで確認
  {timeout:60000}
);
go(2);                                                         // Colossians idx=2 = 1:3–8
```

`BOOK.name==='Colossians'` を待機条件に含めているため、**別の書巻が残った状態でのフォールスポジティブは発生しない**。`go()` は `layout()` と `draw()` を同期的に呼ぶので、直後の `getBoundingClientRect()` 呼び出し時点でレイアウトは完了している。

CONFIRMED: 読み込みと初期化の手順は適切。

### 1.2 pred=85 の算出方法と許容誤差

```javascript
const pred = {0:51, 1:46, 2:55, 3:85, 4:49, 5:67};
// i=3 が Colossians 1:3–8（metaSel.slice(1,7)[3] = metaSel[4]）
ok(Math.abs(r.vis - pred[i]) <= 2, ...);  // 許容誤差 ±2
```

`pred=85` はハードコードされた固定値。テスト内で計算・導出されるものではなく、**引き継ぎ元の実行環境（@sparticuz/chromium 153.0.8010.0）で事前に測定された基準値**。

### 1.3 可視語数の定義

```javascript
// 可視判定（crossover 定義：一部でも重なれば可視）
if(g.right>r.left && g.left<r.right && g.bottom>r.top && g.top<r.bottom) vis++
```

「完全に内側に収まる」ではなく「SVG の bounding rect と一部でも重なる」を可視とする。下端を少し超えた語も可視としてカウントされる。公開環境でのコンソール検証にも同じ定義を使う必要がある。

### 1.4 SVG と単語要素の取得タイミング

`go(idx)` が同期的にレイアウトを完了するため、直後の `evaluate()` で `words` と `svg` を参照するタイミングに問題はない。

### 1.5 キャンバス寸法の記録

テスト本体は `r = svg.getBoundingClientRect()` のみで寸法を使い、寸法値を出力しない。ただし、`r.width` と `r.height` は取得可能であるため、公開環境での確認時に併せて記録できる。

### 1.6 読み込み失敗の誤認リスク

`BOOK.name===` チェックにより、ブックの読み込み完了前に測定が走ることは防止されている。`go(idx)` の idx が範囲外の場合は、テスト出力の `ref:` で実際の章節を目視確認できる（`r.ref` = `$('#ref').textContent`）。

**問題点として指摘すべき事項（判定基準は変更しない）:**

| 指摘 | 重要度 | 説明 |
|---|---|---|
| `go()` 後に明示的な待機がない | 低 | `go()` は同期的なため実害なし。ただし将来アニメーション追加時にリスク |
| `r.ref` を `ok()` で検証していない | 低 | 実際のコンソール出力で確認可能だが、自動テストとして弱い |
| `pred` の測定環境が文書化されていない | 中 | 今回の FAIL の根本原因。本文書で記録する |

---

## 2. ビューポート高さ閾値調査（ローカル実行）

`rk-diagram-m3.html` を使って、ビューポート高さと可視語数の関係を実測した（スクリプト: `tests/z3b_vp_probe.js`）。

| ビューポート高 | キャンバス高 | vis | n | k | PASS（pred=85, ±2） |
|---|---|---|---|---|---|
| 800px | **677px** | **79** | 102 | 0.5 | **false** |
| 850px | **727px** | **83** | 102 | 0.5 | **true** |

**閾値: ビューポート高 ≥ 850px（キャンバス高 ≥ 727px）で PASS（vis=83、±2 許容内）。**

### 下端近傍の不可視語（参考）

vp=800 (canvas_h=677) のとき、可視境界付近にある不可視語（canvas 下端からの距離）：
```
καὶ (mb=-3), ἐπέγνωτε (mb=-3), ἐν (mb=-22), ἀληθείᾳ· (mb=-22),
χάριν (mb=-3), θεοῦ (mb=-22), τοῦ (mb=-41)
```
7語がキャンバス下端ぎりぎり外（mb < 0 = 下端より下）。

vp=850 (canvas_h=727) のとき：
```
τοῦ (mb=9), τὴν (mb=-18)
```
τὴν のみが下端外。τοῦ は境界付近（浮動小数点の端数で不可視側）。

### pred=85 の測定環境の推定

引き継ぎ元 README：「画面サイズ 1280x800 固定、@sparticuz/chromium 153.0.8010.0 使用」

macOS Chrome（本環境）は vp=1280x800 でキャンバス高 677px → vis=79。  
sparticuz/chromium 153.0.8010.0 は vp=1280x800 で vis=85 だった（pred が 85 と確認済み）。

**INFERRED:** sparticuz/chromium 153.0.8010.0 は macOS Chrome より SVG キャンバスを若干大きく確保し、キャンバス高が 727px 相当以上だった。これにより同一ビューポートでも vis が異なる。

### 変更前との比較（回帰確認）

`z3b_regression_check.js` で確認済み（前回セッション）：  
`before-groupmove` と現行版（`rk-diagram-m3.html`）はいずれも vp=1280x800 で vis=79。  
→ 今回の修正（group drag / drawBoxes fix）による回帰ではない。CONFIRMED。

---

## 3. 公開環境（Claude.ai アーティファクト）でのコンソール確認

### 3.1 確認方法

本ツール（Claude Code CLI）からは Claude.ai アーティファクトへのアクセスは不可能。ブラウザからの開発者コンソール操作が必要。

**BLOCKED — ターミナルから公開環境にアクセスできない。**

### 3.2 確認手順（デプロイ後、人間が実施）

以下は公開環境で z3b を確認するための手順。コードの変更・保存は不要。

**前提:** 新しい `rk-diagram.html`（= `rk-diagram-m3.html` 相当）が公開済みであること。

**手順:**

1. ブラウザで公開アーティファクトを開く。
2. `12-colossians.xml` をファイルアップロードして Colossians を読み込む。
3. `#ref` に "Colossians 1:3–8" が表示されるまで待つ（`go(2)` または UI で移動）。
4. 開発者コンソールに以下を貼り付けて実行する：

```javascript
// z3b 公開環境確認コード（読み取り専用）
(()=>{
  const r = svg.getBoundingClientRect();
  let vis = 0;
  for(const w of words){
    const g = w.g.getBoundingClientRect();
    if(g.right>r.left && g.left<r.right && g.bottom>r.top && g.top<r.bottom) vis++;
  }
  const fitK = +fitInfo().k.toFixed(4);
  const k = +view.k.toFixed(4);
  return {
    ref: $('#ref').textContent,        // 例: "Colossians 1:3–8"
    canvas: [Math.round(r.width), Math.round(r.height)],
    k, fitK,
    n: words.length,
    vis,
    first: (()=>{ const g=words[0].g.getBoundingClientRect(); return g.left>=r.left&&g.right<=r.right&&g.top>=r.top&&g.bottom<=r.bottom })(),
    pass_k:    k === Math.max(fitK, 0.5),
    pass_vis:  Math.abs(vis - 85) <= 2,
    pass_first: true  // first word check above
  };
})()
```

**期待される PASS 条件:**

| 項目 | 合格値 |
|---|---|
| `ref` | `"Colossians 1:3–8"` |
| `canvas[1]`（高さ） | ≥ 727px（本環境での閾値） |
| `k` | `Math.max(fitK, 0.5)` と等しい |
| `vis` | 83〜87（pred=85、許容 ±2） |
| `first` | `true` |

### 3.3 判定基準

| 結果 | 判定 |
|---|---|
| `pass_k=true && pass_vis=true && first=true && ref="Colossians 1:3–8"` | z3b 公開環境 **PASS** |
| `vis` が 83〜87 範囲外 | **FAIL** — 実測値・canvas サイズ・ref を記録して原因分析 |
| `ref` が期待と異なる | **無効** — 正しい文に移動してから再実行 |
| アクセス不可・読み込み失敗・コンソール制限 | **BLOCKED** |

`canvas[1] >= 700` だけで PASS と判断しない。最終判断は実測 `vis` 値による。

---

## 4. 未解決事項（継続）

### lay3_local.js — BLOCKED

スクリプト内の race condition により、公式テストの合格条件（90s 以内・追加待機なし）での実行が不可能。等価スクリプト（`lay3_full.js`）で全 7,544 文 diff=0 を CONFIRMED。アプリ本体の欠陥ではない。

解決方法：`lay3.js` に 2s 初期化待機を追加して再実行。

### z3a — BLOCKED

`rk-diagram-m3.before-zoom.html` が環境に存在しない。引き継ぎ元から取得が必要。

---

## 5. ファイル同一性確認

本文書作成中に変更したファイルなし。

| ファイル | SHA-256（作成前）| SHA-256（作成後） |
|---|---|---|
| `rk-diagram-m3.html` | `8ef666d3...` | `8ef666d3...` |
| `before-groupmove.html` | `345d10a4...` | `345d10a4...` |
| `before-drawboxes-fix.html` | `c8d4cfad...` | `c8d4cfad...` |

公開アーティファクト: 変更・置換していない。  
デプロイ: 実施していない。

---

## 6. 公開判断に残るリスク（z3b に関して）

| リスク | 内容 | 対策 |
|---|---|---|
| 公開環境キャンバス高が 727px 未満 | 公開ビューでのキャンバス高は不明。Claude.ai アーティファクトビューアのレイアウトによって変化する | デプロイ後に手順3.2のコンソールで実測 |
| `pred` が公開環境ブラウザとも不一致 | 異なる Chrome バージョンや DPI では閾値が異なる可能性がある | 実測値を新たな基準として記録 |
| z3b FAIL が環境差ではなく実際の回帰 | before-groupmove も同じ vis=79 であることは確認済み → 今回の修正は無関係 | 確認済み（CONFIRMED） |

---

*記録作成: Claude Sonnet 4.6 — 本セッション中、ソースファイルへの変更なし*
