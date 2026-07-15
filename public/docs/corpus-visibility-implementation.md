# Phase UX-9.10-A — Corpus Visibility Implementation

**実施日**: 2026-07-14  
**仕様書**: `docs/search-corpus-presentation-spec.md` §4-1〜§4-3  
**変更範囲**: `search-tool.html` のみ

---

## 実装内容

UX-9.9 仕様の P1（必須）と P2（推奨）の Hit Card 部分を実装した。

| 仕様 ID | 内容 | 優先度 | 実装 |
|---------|------|--------|------|
| UX-9.9-A | Hit Card に `data-corpus` 属性付与 | P1 MUST | ✅ |
| §4-2 | LXX Hit Card に corpus badge 表示 | P2 SHOULD | ✅ |
| §4-3 | LXX 翻訳欠損プレースホルダー | P2 SHOULD | ✅ |

---

## 変更詳細

### 変更 1: `data-corpus` 属性の付与（CSS L1018〜1027）

`.corpus-badge` スタイルを `.hit-badges-subtle .ht-badge` の直後に追加。

```css
.corpus-badge {
    font-size: var(--text-caption);
    font-weight: 400;
    padding: 1px 5px;
    border-radius: var(--radius-s);
    border: 1px solid var(--border);
    color: var(--text-sub);
    letter-spacing: 0.04em;
    flex-shrink: 0;
}
```

新規カラートークン: なし。新規フォントサイズ: なし。既存トークンのみ使用。

### 変更 2: `corpusId` 読み取り + `data-corpus` 付与（JS）

`_buildUnifiedCard` 関数の冒頭（`const verse=...` の直後）に追加。

```js
const corpusId=tok.corpusId||'NT';
card.dataset.corpus=corpusId;
```

**判定ソース**: `tok.corpusId`（トークン構築時に `NT_BOOK_KEYS.has(bookKey) ? 'NT' : 'LXX'` で設定済み）。  
book 名からの推測なし。

### 変更 3: LXX corpus badge の挿入

`openBtnLgHtml` の直後に追加。

```js
const lxxBadgeHtml=corpusId==='LXX'?'<span class="corpus-badge">LXX</span>':'';
```

`card.innerHTML` テンプレートの `hit-ref` 直後に挿入。

```html
<div class="hit-header">
    <span class="hit-ref">${_jpRef}</span>${lxxBadgeHtml}
    <div class="hit-badges-subtle">${badgesHtml}</div>
</div>
```

**NT カード**: badge なし（無標、仕様 §4-2 に準拠）。  
**LXX カード**: `[LXX]` badge が `hit-ref` の右隣に表示。

### 変更 4: LXX 翻訳フェッチのスキップ

LXX には日本語訳ファイルが存在しない（`translations/` には NT のみ `JA1955`・`BUN`）。  
従来は 404 リクエストが多数発生し `'（訳が見つかりません）'` が表示されていた。  
LXX カードでは fetch をスキップし、直接プレースホルダーを表示する。

```js
// Auto-load translation
(async()=>{
    if(corpusId==='LXX'){
        // LXX に日本語訳ファイルなし — 404 を出さずにプレースホルダーを表示
        transText.textContent='（翻訳テキストなし）';
        transLoading.style.display='none';
        transText.classList.add('visible');
        return;
    }
    // NT の場合は従来通り _fetchTransVerse を呼ぶ
    ...
```

副次効果: LXX 書物の 404 console error を削減する。

---

## Before / After

### Hit Card（LXX）

**Before**:
```
詩篇2章2節          [語根]
─────────────────────────────────────────
読み込み中…  → （訳が見つかりません）（フェッチ失敗）
                              [本文で読む]
```

**After**:
```
詩篇2章2節  [LXX]   [語根]
─────────────────────────────────────────
（翻訳テキストなし）
                              [本文で読む]
```

### Hit Card（NT）— 変更なし

**Before / After（変更なし）**:
```
マタイ1章1節         [語根]
─────────────────────────────────────────
アブラハムの子ダビデの子、イエス・キリストの系図。
                              [本文で読む]
```

---

## 変更行数

| ファイル | 追加行 | 削除行 | 変更種別 |
|---------|--------|--------|---------|
| `search-tool.html` (CSS) | 9 | 0 | `.corpus-badge` スタイル追加 |
| `search-tool.html` (JS) | 2 | 0 | `corpusId` 読み取り + `dataset.corpus` |
| `search-tool.html` (JS) | 1 | 0 | `lxxBadgeHtml` 変数追加 |
| `search-tool.html` (JS) | 1 | 0 | `card.innerHTML` の `hit-header` 修正 |
| `search-tool.html` (JS) | 6 | 0 | LXX 翻訳フェッチスキップ |
| **合計** | **19** | **0** | — |

---

## 検証結果

### corpus 判定精度確認

| クエリ | 傾向 | 表示件数 | NT cards | LXX cards | 判定 |
|--------|------|---------|----------|-----------|------|
| χριστός | NT dominant (<10% LXX) | 569 件 | 80 | 0 | ✅ 正しい（最初の80件は全NT） |
| κύριος | BLOCK（91% LXX） | 8,172 件 | 80 | 0 | ✅ 正しい（NT-first sort、NT 714件が先頭） |
| διαθήκη | BLOCK（90% LXX） | 330 件 | 30 | 50 | ✅ 正しい（NT 33件が先頭、残りLXX） |

> **注**: κύριος の NT:80/LXX:0 は「最初の80件が全て NT」であることを示す。NT-first ソートにより NT 714件が先頭に並ぶため、page 1（80件）はすべて NT カード。LXX 7,458件はそれ以降に続く。corpus 判定ロジックは正確。

### badge・プレースホルダー確認

| 確認項目 | クエリ | 結果 |
|---------|--------|------|
| LXX badge 表示 | διαθήκη | ✅ 50件すべてに `[LXX]` badge |
| NT badge なし | χριστός・κύριος | ✅ badge なし（無標） |
| LXX 翻訳プレースホルダー | διαθήκη | ✅ 50件すべてに「（翻訳テキストなし）」 |
| NT 翻訳フェッチ継続 | χριστός | ✅ 日本語訳が正常表示 |
| `data-corpus` 欠損カード | 全クエリ | ✅ 0件（全カードに付与） |

### 件数回帰

| クエリ | 期待値 | 実測値 | 結果 |
|--------|--------|--------|------|
| 愛 | 631 件 | 631 件 | ✅ PASS |
| 罪 | 1,009 件 | 1,009 件 | ✅ PASS |
| ἀγαπάω | 353 件 | 353 件 | ✅ PASS |

---

## 変更しなかった項目

| 項目 | 理由 |
|------|------|
| 検索ロジック（`resolveTerm`, `resolveConcept`） | 禁止事項 |
| Pattern Engine / Wallace Engine | 禁止事項 |
| `search-concepts.json` | 禁止事項 |
| `index.html` / StudyPanel | 禁止事項 |
| 件数表示（UX-9.9-B） | 別フェーズ（P1 MUST だが本 PR 対象外） |
| 分布パネル分割（UX-9.9-C） | 別フェーズ（P1 MUST だが本 PR 対象外） |
| LXX 結果折りたたみ（UX-9.9-E） | 別フェーズ（P2 SHOULD） |
| NT badge | 仕様通り、NT は無標 |

---

## UX-9 ロードマップ更新

| フェーズ | 内容 | ステータス |
|---------|------|-----------|
| UX-9A | Search Design System 仕様書 | ✅ |
| UX-9-1〜7 | 各種 UI 修正 | ✅ |
| UX-9.8 | Corpus Boundary Audit | ✅ |
| UX-9.9 | Corpus Presentation Specification | ✅ |
| **UX-9.10-A** | **Hit Card Corpus Visibility** | **✅** |
| UX-9.10-B | 件数表示 NT/LXX 内訳 | 未着手（P1） |
| UX-9.10-C | 分布パネル NT/LXX 分割 | 未着手（P1） |
| UX-9.10-D〜H | 上位仕様の残項目 | 未着手 |
