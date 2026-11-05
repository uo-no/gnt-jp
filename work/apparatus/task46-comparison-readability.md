# Task 46 — 異読の比較表示を分かりやすく仕上げる

**Date:** 2026-10-16  
**Branch:** fix/vr5-gate-n-a  
**HEAD:** ec1b447d test(apparatus): 語の分析 Level3 状態での異読表示を実操作で検証  
**State:** DONE

---

## 作業前 git status --short

```
 M package.json
 M public/index.html
[...その他]
```

---

## Phase A — 現在の表示確認

### 代表例のデータ構造

| 節 | エントリ | lemText | 読み数 | ja.tag |
|---|---|---|---|---|
| ROM 1:1 | ROM-0001 | Χριστοῦ Ἰησοῦ | 2 | 語順差（確認済み） |
| MAT 1:6 | MAT-0003 | δὲ | 2 | 添加（確認済み） |
| MAT 1:18 | MAT-0006, MAT-0007, MAT-0008 | 各1語 | 2, 2, 2 | 省略/読み差/添加 |
| MAT 1:19 | MAT-0009 | δειγματίσαι | 2 | 形態差（確認済み） |
| MAT 1:5 | MAT-0001, MAT-0002 | Βόες…/Ἰωβὴδ… | 3, 2 | 表記差（確認済み） |

### Task 45 実装後の表示（改善前）

ROM 1:1 の例:
```
Χριστοῦ Ἰησοῦ
[語句の並び順が異なります] 語順: Χριστοῦ Ἰησοῦ / Ἰησοῦ Χριστοῦ
Χριστοῦ Ἰησοῦ                   Treg · NIV
Ἰησοῦ Χριστοῦ                   WH · RP
```

**問題点**: readings 行が単純に並んでいるだけで、「2つの読みが対比されている」ことが視覚的に分かりにくい。

### 語義補助（「キリスト→イエス」）の実現可能性

- `reading-ln-gloss-data.js` に lemmaId × Louw-Nida → 日本語 gloss 対応表は存在する
- しかし apparatus の readings テキスト（ギリシャ語語形）→ lemmaId の変換が実装されていない
- 語義補助の実装には新機能の追加が必要 → **Task 46 スコープ外**
- 「確実でない場合は、ギリシャ語の順序だけを明示する」という方針で進める

---

## Phase B — 改善方針

**readings 行に番号（①②③）を付ける**（readings ≥ 2件の場合のみ）

**効果**:
- 「①と②が別の読みで対比されている」ことが視覚的に明確になる
- 省略エントリ「② （省略）」でコントラストが伝わる
- `ja` の `/` 区切りと readings 行の対応が分かりやすくなる（`① / ②` という構造対応）

**対象外**:
- 語義補助（「キリスト→イエス」）: 辞書-readings 間の接続がないため実装不可
- readings が1件のみの場合: 番号を付けない（番号の意味がない）

---

## Phase C — 変更内容

### `public/index.html` — 変更箇所 2箇所

#### CSS: `.mvv-app-rdg-num` 追加、`.mvv-app-rdg-text` に `flex: 1`

```css
#mobile-verse-area .mvv-app-rdg-num {
    font-size: calc(var(--text-caption) * 0.85);
    color: var(--text-sub);
    flex-shrink: 0;
    width: 1.3em;
}
#mobile-verse-area .mvv-app-rdg-text {
    font-size: var(--text-caption);
    color: var(--text-main);
    flex: 1;                    ← 追加（番号がある場合に残余幅を適切に使う）
}
```

#### JS: readings 行生成に番号追加

```javascript
/* 変更前 */
const rdgHtml = e.readings.map(r => {
    const text = r.isOmission ? '（省略）' : _escH(r.text || '');
    const wit  = _escH((r.witnesses || []).join(' · '));
    return `<div class="mvv-app-rdg"><span class="mvv-app-rdg-text">${text}</span><span class="mvv-app-rdg-wit">${wit}</span></div>`;
}).join('');

/* 変更後 */
const _rdgNums = ['①', '②', '③', '④'];
const rdgHtml = e.readings.map((r, idx) => {
    const numHtml = e.readings.length >= 2
        ? `<span class="mvv-app-rdg-num">${_rdgNums[idx] || (idx + 1)}</span>`
        : '';
    const text = r.isOmission ? '（省略）' : _escH(r.text || '');
    const wit  = _escH((r.witnesses || []).join(' · '));
    return `<div class="mvv-app-rdg">${numHtml}<span class="mvv-app-rdg-text">${text}</span><span class="mvv-app-rdg-wit">${wit}</span></div>`;
}).join('');
```

---

## Phase D — 変更前後の表示例

### ROM 1:1（語順差）

**変更前**:
```
Χριστοῦ Ἰησοῦ
[語句の並び順が異なります] 語順: Χριστοῦ Ἰησοῦ / Ἰησοῦ Χριストοῦ
Χριστοῦ Ἰησοῦ    Treg · NIV
Ἰησοῦ Χριστοῦ    WH · RP
```

**変更後**:
```
Χριστοῦ Ἰησοῦ
[語句の並び順が異なります] 語順: Χριστοῦ Ἰησοῦ / Ἰησοῦ Χριستοῦ
① Χριστοῦ Ἰησοῦ    Treg · NIV
② Ἰησοῦ Χριストοῦ    WH · RP
```

### MAT 1:18（省略 + 読み差 + 添加 複合）

**変更後**:
```
Ἰησοῦ
[一方の本文では語句が省かれています] Ἰησοῦ の省略（Treg）
① Ἰησοῦ        WH · NIV · RP
② （省略）       Treg

γένεсις
[使用されている語句が異なります]
γένεσис（WH Treg NIV）・γέννησις（RP）
① γένεσις       WH · Treg · NIV
② γέννησις      RP

μνηστευθείσης
[一方の本文には語句が加わっています] ＋γάρ（RP）
① μνηστευθείσης    WH · Treg · NIV
② + γάρ            RP
```

「② （省略）」でコントラストが明確。「①と②の2択」のパターンが3エントリ通じて一貫している。

---

## テスト結果

### ブラウザ検証（33/33 PASS）

| 確認項目 | 結果 |
|---|---|
| 全代表タグの番号付き表示（語順差/添加/省略/読み差/形態差/表記差） | PASS |
| ①②③ の番号が正しく付く | PASS |
| readings = 1件のみの場合は番号なし | PASS |
| `ja` テキスト・ギリシャ語・証人略号が保持 | PASS |
| 自動生成クラス（`--auto`）の区別が維持 | PASS |
| HTMLエスケープが維持 | PASS |
| ja注釈なし節でギリシャ語表示が維持 | PASS |
| 390px レイアウト崩れなし（rdg 幅 = 358px / 358px） | PASS |
| デスクトップ: `#wlv-apparatus-slot` なし | PASS |

### 既存回帰テスト

| スクリプト | 結果 |
|---|---|
| re-apparatus-display-regression.cjs (33) | PASS |
| re-apparatus-ja-all-regression.cjs (54) | PASS |
| re-apparatus-regression.cjs (82) | PASS |

`git diff --check`: クリーン

---

## 追加説明を付けなかった箇所と理由

| 項目 | 理由 |
|---|---|
| 語義補助（「キリスト→イエス」等） | 辞書データとapparatusのreadings間の接続がなく、確実な情報源なし。L-0「推論しない」に照らして断念 |
| 自動生成データ（読み差4,308件）の `ja` 日本語化 | データ再生成に相当。今回スコープ外 |
| 省略エントリへの lemma テキスト補完 | lemma が長い場合（`Βόες ἐκ τῆς Ῥαχάβ, Βόες`）に別の問題が生じる。`ja` テキストで「Ἰησοῦ の省略（Treg）」と既に説明されている |
| readings = 1件の場合への番号 | 対比の相手がないため番号に意味がない |

---

## 作業後の状態

**Branch:** fix/vr5-gate-n-a  
**変更ファイル:** `public/index.html` のみ  
**新規ファイル:** なし  
**データ変更:** なし  
**回帰:** なし
