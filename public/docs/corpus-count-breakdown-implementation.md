# Phase UX-9.10-B — Corpus Count Breakdown Implementation

**実施日**: 2026-07-14  
**仕様書**: `docs/search-corpus-presentation-spec.md` §3  
**変更範囲**: `search-tool.html` のみ

---

## 実装内容

検索結果の件数表示に NT / LXX 内訳を追加した。

| 仕様 ID | 内容 | 優先度 | 実装 |
|---------|------|--------|------|
| UX-9.9-B | 件数表示に corpus 内訳追加 | P1 MUST | ✅ |

---

## 変更詳細

### 変更 1: `.result-count` CSS 修正（旧 L655）

件数要素を縦積みレイアウトに対応させる。

```css
/* Before */
.result-count {
    font-size: 0.78rem; font-weight: 700;
    color: var(--text-sub);
}

/* After */
.result-count {
    font-size: 0.78rem; font-weight: 700;
    color: var(--text-sub);
    display: inline-flex; flex-direction: column; align-items: flex-end; gap: 1px;
}
.result-count-sub {
    font-size: var(--text-caption);
    font-weight: 400;
    opacity: 0.75;
}
```

**設計根拠:**
- `inline-flex` を選択した理由: `result-header` が `align-items: baseline` の flex コンテナであり、`inline-flex` なら既存の baseline 整列を維持できる
- `flex-direction: column` で総件数と内訳を縦積み
- `align-items: flex-end` で内訳を右揃え（総件数と右端を合わせる）
- 新規カラートークン追加なし。`--text-caption`（0.75rem）のみ使用

### 変更 2: `_renderUnifiedResults` 件数表示ロジック（旧 L3368）

```js
// Before
document.getElementById('result-count').textContent=`${total.toLocaleString()} 件`;

// After
// Corpus breakdown count (corpusId が唯一の判定ソース。book名推測禁止)
let ntCount=0,lxxCount=0;
for(const[,{tok}] of merged){ if(tok.corpusId==='LXX') lxxCount++; else ntCount++; }

const _countEl=document.getElementById('result-count');
if(lxxCount>0){
    const _parts=[];
    if(ntCount>0) _parts.push(`新約聖書 ${ntCount.toLocaleString()}件`);
    _parts.push(`旧約ギリシア語訳（LXX） ${lxxCount.toLocaleString()}件`);
    _countEl.innerHTML=
        `<span>${total.toLocaleString()} 件</span>`+
        `<span class="result-count-sub">${_parts.join(' ／ ')}</span>`;
} else {
    _countEl.textContent=`${total.toLocaleString()} 件`;
}
```

**実装ルール:**
- `corpusId` のみで NT/LXX を判定（`tok.corpusId === 'LXX'`）
- `book` 名・`bookKey` からの推測なし
- LXX=0 の場合: `textContent` で従来表示を維持（innerHTML なし）
- NT=0 かつ LXX>0 の場合: 内訳行に LXX のみ表示

---

## Before / After

### κύριος の件数表示

**Before:**
```
κύριος    8,172件
```

**After:**
```
κύριος    8,172 件
          新約聖書 714件 ／ 旧約ギリシア語訳（LXX） 7,458件
```

### 愛 / 罪（日本語クエリ）の件数表示

**Before:**
```
愛    631件
```

**After:**
```
愛    631 件
      新約聖書 369件 ／ 旧約ギリシア語訳（LXX） 262件
```

> 日本語クエリは lemma を経由して NT+LXX 両方にマッチする（ἀγαπάω は LXX にも出現）。
> 件数はそのまま（631件は変わらず）、内訳情報が追加される。

---

## 検証結果

### 件数・内訳の正確性

| クエリ | 総件数 | NT件数 | LXX件数 | 内訳表示 | 判定 |
|--------|--------|--------|---------|---------|------|
| χριστός | 569 件 | 528 | 41 | 新約聖書 528件 ／ 旧約ギリシア語訳（LXX） 41件 | ✅ |
| κύριος | 8,172 件 | 714 | 7,458 | 新約聖書 714件 ／ 旧約ギリシア語訳（LXX） 7,458件 | ✅ |
| διαθήκη | 330 件 | 33 | 297 | 新約聖書 33件 ／ 旧約ギリシア語訳（LXX） 297件 | ✅ |
| 愛 | 631 件 | 369 | 262 | 新約聖書 369件 ／ 旧約ギリシア語訳（LXX） 262件 | ✅ |
| 罪 | 1,009 件 | 298 | 711 | 新約聖書 298件 ／ 旧約ギリシア語訳（LXX） 711件 | ✅ |
| ἀγαπάω | 353 件 | 143 | 210 | 新約聖書 143件 ／ 旧約ギリシア語訳（LXX） 210件 | ✅ |

### 回帰テスト（総件数）

| クエリ | 期待値 | 実測値 | 結果 |
|--------|--------|--------|------|
| 愛 | 631 件 | 631 件 | ✅ PASS |
| 罪 | 1,009 件 | 1,009 件 | ✅ PASS |
| ἀγαπάω | 353 件 | 353 件 | ✅ PASS |

### その他

| 確認項目 | 結果 |
|---------|------|
| page error 0件 | ✅ PASS |
| console error 0件 | ✅ PASS |

---

## 注記: 日本語クエリの LXX 内訳について

愛・罪・ἀγαπάω の内訳に LXX が表示されることは**仕様に合致する**。

| 前提 | 説明 |
|------|------|
| 日本語クエリの解決経路 | `愛` → `ἀγαπάω / φιλέω` 等の lemma → 全 corpus のトークンを検索 |
| LXX に ἀγαπάω が存在する | 詩篇・イザヤ等に同語根が出現 |
| 件数変化なし | 631件のうち NT 369件 + LXX 262件 = 631件 ✓ |

UX-9.9 仕様 §3 より: `LXX=0 の場合は従来表示` = LXX > 0 なら内訳表示が正しい。

---

## 変更行数

| ファイル | 追加行 | 変更行 | 種別 |
|---------|--------|--------|------|
| `search-tool.html` (CSS) | +5 | +3 | `.result-count` + `.result-count-sub` 追加 |
| `search-tool.html` (JS) | +10 | -1 | 件数カウント + 条件分岐表示 |
| **合計** | **+15** | **+2** | — |

---

## UX-9 ロードマップ更新

| フェーズ | 内容 | ステータス |
|---------|------|-----------|
| UX-9.8 | Corpus Boundary Audit | ✅ |
| UX-9.9 | Corpus Presentation Specification | ✅ |
| UX-9.10-A | Hit Card Corpus Visibility（`data-corpus` + LXX badge） | ✅ |
| **UX-9.10-B** | **件数表示 NT/LXX 内訳** | **✅** |
| UX-9.10-C | 分布パネル NT/LXX 2セクション分割 | 未着手（P1） |
| UX-9.10-D〜H | corpus filter UI 等 | 未着手 |
