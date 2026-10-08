# Phase 4.0-I Final Report — RK Reading Mode / Display / Legend / StudyPanel Integration Audit

**Status: PASS WITH ISSUES**
Date: 2026-10-01
Phase: 4.0 / Task: Phase I — Display / Legend / StudyPanel Integration Audit (READ-ONLY)
State: BROWSER-VERIFIED

---

## Summary

RK Reading Mode の日本語表示・凡例・StudyPanel 統合を監査した。
コード変更なし（READ-ONLY）。

| 項目 | 状態 |
|------|------|
| 日本語表示（黒塗り） | **ISSUE-1 MAJOR** |
| StudyPanel — jaWord/lexicon | **ISSUE-2 MAJOR** |
| 凡例（legend） | **ISSUE-3 MODERATE** |
| StudyPanel — same component | ✅ CONFIRMED |
| StudyPanel — responsive | ✅ PASS（幅変化・情報変化なし） |
| H Regression (4 cases) | ✅ PASS |
| Mobile (375x812, 390x844) | ✅ PASS |

---

## 1. Japanese Display

### 現象

RK Reading Mode のすべての SVG テキストが黒塗りになっており、本文として読めない。

```
JHN 1:1 の例（browser audit 実測）:
  text "そして"  fill="var(--link)"  computed = rgb(0, 0, 0)
  text "ことば"  fill="var(--core)"  computed = rgb(0, 0, 0)
  text "［冠詞］" fill="var(--mod)"   computed = rgb(0, 0, 0)
  rect (background) fill=(none)      computed = rgb(0, 0, 0)
```

**日本語テキスト自体は SVG DOM に存在している。`そして`, `ことば`, `〜の中に`, `〜の初め` 等が `<text>` 要素に含まれている。見えないだけ。**

### Root cause（2点）

#### Root cause 1 — CSS 変数未定義

レンダラーが text fill に使う CSS 変数が `index.html` に定義されていない。

| 変数 | index.html | rk-phase-c-test.html | Reference HTML |
|------|-----------|----------------------|----------------|
| `--core` | **空（undefined）** | `#3730a3` | `#3730a3` |
| `--mod`  | **空（undefined）** | `#0f766e` | `#0f766e` |
| `--adv`  | **空（undefined）** | `#a16207` | `#a16207` |
| `--link` | **空（undefined）** | `#a21caf` | `#a21caf` |
| `--sub`  | **空（undefined）** | `#5b6178` | `#5b6178` |
| `--ink`  | `#211f1a` ✅ | `#181b2b` | `#181b2b` |

`tokens.css` に `--core`, `--mod`, `--adv`, `--link`, `--sub` の定義なし（`--ink` のみ `--text` の alias として存在）。

CSS custom property が未定義のとき、SVG `fill` プロパティは initial value = `black` にフォールバック → text が black。

#### Root cause 2 — `.wn rect` の fill が black

Reference HTML には `.wn rect { fill: transparent; stroke: transparent; stroke-width: 1.5 }` が定義されている。

`index.html` にはこの CSS ルールがなく、`<rect>` の fill が SVG デフォルト（`black`）。

結果：**black rect + black text = 黒塗り**。

### 既存実装との比較

| 項目 | 語順で読む | RK |
|------|-----------|-----|
| 表示形式 | HTML `.wlv-chip-ja` span | SVG `<text>` 要素 |
| テキスト源 | `token.japanese`（bible_data） | `w.gl`（adapter → `bd.japanese`） |
| 値 | `そして`, `ことば` 等 | 同一（同じ bible_data から） |
| font | Noto Sans JP（CSS） | Noto Sans JP（renderer hardcode） |
| color | CSS token 経由 | `var(--core/mod/adv/link/sub)`（未定義） |

**RK の SVG テキストが HTML の `.wlv-chip-ja` と別 rendering path を取るのは構造上必然**（RK 図の SVG 内で位置計算が必要なため）。

### 推奨実装方針

**A — 既存表示をそのまま再利用**（推奨）

```css
/* index.html :root に追加 */
--core: #3730a3;   /* 文の骨格（主語・動詞・目的語等） */
--mod:  #0f766e;   /* 名詞の修飾 */
--adv:  #a16207;   /* 副詞的要素 */
--link: #a21caf;   /* 接続（点線） */
--sub:  #5b6178;   /* サブテキスト（凡例等） */

/* SVG rect 背景を透明に */
.rk-reading-view .wn rect {
    fill: transparent;
    stroke: transparent;
    stroke-width: 1.5;
}
```

理由：
- テキスト自体は SVG DOM に正しく存在している
- レンダラーは既に Reference HTML と同一のロジックを持つ
- CSS 変数 5 行 + rect 規則 3 行の最小変更で解消
- 語順で読む の HTML rendering path と衝突しない
- dark mode 対応も Reference HTML の pattern をそのまま適用可能

B（共通 primitive）は今回不要。C（RK 専用実装）は不要かつ非推奨。

---

## 2. StudyPanel — Same Component?

### Same component: CONFIRMED ✅

`openStudyPanel()` 関数が共通。`#bottom-depth-panel` が共通。

| 項目 | 語順で読む | RK |
|------|-----------|-----|
| 呼び出し関数 | `openStudyPanel()` | `openStudyPanel()` |
| パネル要素 | `#bottom-depth-panel` | `#bottom-depth-panel` |
| コンポーネント | 共通 | 共通 ✅ |

### Same rendering path: NOT VERIFIED — ISSUE

呼び出し前の前処理が異なる。

| 処理 | 語順で読む | RK |
|------|-----------|-----|
| `_setInspectDataFromElToken(token)` | ✅ 呼ぶ | ❌ 呼ばない |
| `_setStudyTarget(ref, verseId)` | ✅ 呼ぶ | ❌ 呼ばない |
| `openStudyPanel(greek, rawMorph, ref, lemma)` | ✅ | ✅ |

結果として `AppState.inspect.data` の状態が異なる:

```
語順で読む click後:
  AppState.inspect.data.jaWord    = "〜の中に"   (有)
  AppState.inspect.data.strong    = "G1722"      (有)
  AppState.inspect.data.lemma     = ...          (有)

RK click後:
  AppState.inspect.data           = null
```

---

## 3. StudyPanel Content — 同一 token の比較

### 実測（browser audit）

語順で読む の Ἐν（JHN 1:1 最初の語）をクリック:
```
"‹ ‹ Ἐν Ἐν 〜の中に 単語を詳しく調べる 品詞前置詞
 使用傾向 福音書で使われることが多い マルコマタイルカ...
 辞書全文 【語義】（前置詞；与格支配；新約で最頻出の前置詞...）..."
```

RK の καὶ（JHN 1:1 最初のクリック可能語）をクリック:
```
"‹ ‹ καὶ καὶ 単語を詳しく調べる 品詞接続詞
 意味が近い語と比べる さらに調べる この語の用例を見る →...
 メモ 保存"
```

| 項目 | 語順で読む | RK |
|------|-----------|-----|
| Greek word | ✅ 表示 | ✅ 表示 |
| **日本語（jaWord）** | ✅ "〜の中に" | **❌ 非表示** |
| 品詞 | ✅ 表示 | ✅ 表示 |
| 使用傾向 | ✅ 表示 | ❌ 非表示 |
| 辞書全文（lexicon） | ✅ 表示 | ❌ 非表示 |
| 検索 actions | ✅ 表示 | ✅ 表示 |
| メモ | ✅ 表示 | ✅ 表示 |
| `AppState.inspect.data` | populated | null |

### Root cause

`_renderRKReadingView` の click handler が `_setInspectDataFromElToken()` を呼ばないため `AppState.inspect.data` が更新されない。
その結果、StudyPanel の日本語・lexicon セクションが描画されない。

また `buildClickMap` が `japanese` / `strong` を返さないため、仮に `_setInspectDataFromElToken` 相当を呼んでも jaWord・strong が欠損する。

### 推奨実装方針

**B — 共通 primitive を利用**

1. `buildClickMap` に `japanese` と `strong` を追加:
   ```javascript
   m.set(i + 1, {
       greek:    _clean(t.text),
       rawMorph: (bd && bd.morph)    || '',
       ref:      (bd && bd.ref)      || '',
       lemma:    (bd && bd.lemma)    || '',
       japanese: (bd && bd.japanese) || '',  // 追加
       strong:   (bd && bd.strong)   || '',  // 追加
   });
   ```

2. `_renderRKReadingView` の click handler に `_setInspectDataFromElToken` 相当の処理を追加:
   ```javascript
   el.addEventListener('click', function () {
       _setStudyTarget(data.ref, /* verseId 相当 */);
       AppState.inspect.data = {
           greek:    data.greek,
           strong:   data.strong,
           rawMorph: data.rawMorph,
           lemma:    data.lemma,
           jaWord:   data.japanese,
           ref:      data.ref,
       };
       openStudyPanel(data.greek, data.rawMorph, data.ref, data.lemma);
   });
   ```

ただし既存の `_setInspectDataFromElToken` は `token.text`, `token.morph`, `token.ref`, `token.lemma`, `token.japanese`, `token.strong` を想定した schema を使用。RK の click data に同じ schema を揃えることで共通関数を再利用できる。

---

## 4. StudyPanel Responsive

| viewport | open | width | height | content変化 |
|----------|------|-------|--------|------------|
| 1440×900 | ✅ | 1440px | 414px | なし |
| 1280×900 | ✅ | 1280px | 414px | なし |
| 1024×768 | ✅ | 1024px | 353px | なし |
| 768×1024 | ✅ | 768px | 1004px（全画面） | なし |
| 390×844  | ✅ | 390px | 827px（全画面） | なし |

**幅変化と情報変化は分離されている：PASS**

- 1024px 以下でパネル高さが縮小 → scrollable
- 768px 以下で全画面オーバーレイに切り替わる
- いずれの viewport でも「品詞」「検索 actions」「メモ」は共通表示
- hiddenItems = 0（display:none で隠れている項目なし）

---

## 5. 凡例（Legend）

### Reference Implementation

```html
<div class="bar">
  <span><i style="background:var(--core)"></i>文の骨格</span>
  <span><i style="background:var(--mod)"></i>名詞の修飾</span>
  <span><i style="background:var(--adv)"></i>副詞的要素</span>
  <span><i style="background:var(--link)"></i>接続(点線)</span>
</div>
```

### 現在の状態

```
hasBarDiv:     false
hasLegendText: false（"文の骨格" なし）
rkViewChildren: sd-sentence のみ
```

`_renderRKReadingView` が legend HTML を生成しない。

### 実際の SVG 使用状況

JHN 1:1 の SVG（browser 実測）:

```
totalLines:  30
solidLines:  19
dashedLines: 11
strokeValues: ["var(--link)", "var(--ink)", "var(--mod)", "var(--adv)"]
```

**4 種の stroke すべてが実際に使われている** → 凡例は意味を持つ。

### 対応関係（renderer コード確認済み）

| 凡例 | CSS 変数 | renderer 用途 |
|------|---------|--------------|
| 文の骨格 | `--core` | subj/verb/obj/pred/clause/cverb/iobj の text fill |
| 名詞の修飾 | `--mod` | det/gen/adj/relcl/poss/voc 等の text fill・modifier line stroke |
| 副詞的要素 | `--adv` | prep/pobj/adv/neg/advcl の text fill・PP line stroke |
| 接続（点線） | `--link` | coord/conj/cmark の text fill・dotted connector line stroke |

Baseline structural line = `var(--ink)` （凡例外 — 文の骨格ではなく構造線そのもの）。

### Root cause

`_renderRKReadingView` に legend 生成コードが存在しない。Reference HTML の `.bar` 相当の DOM が未移植。

---

## 6. Reading First 確認

`wd()` 関数:
```javascript
const disp = w.gl || w.g;  // gl = Japanese gloss, g = Greek
```

**Japanese が primary display、Greek が fallback** — 設計原則通り ✅

ただし Issue 1 により実際には黒塗りになっている。

---

## 7. H Regression

| ケース | hasError | hasSVG | status |
|--------|---------|--------|--------|
| ROM 1:24  | false | true | ✅ PASS |
| 1CO 3:11  | false | true | ✅ PASS |
| HEB 11:32 | false | true | ✅ PASS |
| ROM 15:30 | false | true | ✅ PASS |

---

## 8. Mobile

| viewport | hasSec | hasSVG | wnCount | errors |
|----------|--------|--------|---------|--------|
| 375×812 | true | true | 18 | 0 | ✅ |
| 390×844 | true | true | 18 | 0 | ✅ |

SVG は生成されている（黒塗りは Issue 1 として分離）。

---

## 9. Issues

### ISSUE-1 [MAJOR] — Japanese 黒塗り（CSS 変数未定義 + rect fill）

```
Root cause:
  (A) --core / --mod / --adv / --link / --sub が index.html :root に未定義
  (B) .wn rect の fill: transparent が index.html に未定義

Scope: index.html CSS
Fix size: ~8 行の CSS 追加
Recommended: A (既存 Reference HTML / rk-phase-c-test.html の値を流用)
```

### ISSUE-2 [MAJOR] — StudyPanel jaWord / lexicon 非表示

```
Root cause:
  (A) buildClickMap が japanese / strong を返さない
  (B) _renderRKReadingView が _setInspectDataFromElToken() を呼ばない
      → AppState.inspect.data = null

Scope: rk-reading-adapter.js (buildClickMap), index.html (_renderRKReadingView)
Fix size: buildClickMap +2行、click handler +5行程度
Recommended: B (共通 _setInspectDataFromElToken を活用するか同等 schema を渡す)
```

### ISSUE-3 [MODERATE] — 凡例（legend）未実装

```
Root cause:
  _renderRKReadingView に legend 生成コードなし

Scope: index.html (_renderRKReadingView)
Fix size: legend HTML生成 ~5行
Note: Issue 1 (CSS vars) を解消しないと凡例の色も出ない
Recommended: A (Reference HTML の .bar 構造を _renderRKReadingView に追加)
```

### Reference Difference (既存、今回 scope 外)

| 項目 | Reference | 現在 | 分類 |
|------|---------|------|------|
| token list bar (語の一覧) | あり | なし | DEFERRED |
| 「実寸で見る」ボタン | あり | なし | DEFERRED |
| SVG horizontal scroll | あり | 未確認 | DEFERRED |

---

## 10. Recommended Next Phase

Phase J scope（READ-ONLY audit から IMPLEMENTATION へ）:

### 必須（ISSUE-1/2/3 解消）

| # | 変更内容 | 種別 | ファイル |
|---|----------|------|---------|
| J-1 | CSS 変数 `--core/mod/adv/link/sub` を `index.html` `:root` に追加 + dark mode | `BUG` | `index.html` |
| J-2 | `.rk-reading-view .wn rect { fill: transparent; }` CSS | `BUG` | `index.html` |
| J-3 | `buildClickMap` に `japanese` / `strong` 追加 | `BUG` | `rk-reading-adapter.js` |
| J-4 | `_renderRKReadingView` click handler に inspect.data 設定を追加 | `BUG` | `index.html` |
| J-5 | `_renderRKReadingView` に legend HTML 生成を追加 | `FEATURE` | `index.html` |

### 任意（DEFERRED）

- token list bar
- 「実寸で見る」
- pre-existing renderer errors (MAT 5:23, GAL 3:21, HEB 11:4)

---

## 11. Modified Files

Phase I は READ-ONLY 監査。コード変更なし。

---

**Phase I: PASS WITH ISSUES** (ISSUE-1/2 MAJOR, ISSUE-3 MODERATE — 次 Phase で対処)
