# Phase UX-10-1E — Discovery Theme Interaction

**実施日**: 2026-07-14  
**変更範囲**: `search-tool.html`（CSS・JS のみ）

---

## 目的

Discovery Lobby のテーマ chip をクリックすると、既存の `_exampleSearch()` 経路で検索を発火させる。  
新しい検索関数は作成しない。

---

## 変更内容

### 変更 1: CSS — `cursor: pointer` + hover 追加

```css
/* Before */
.discovery-theme-chip {
    ...
    cursor: default;
}

/* After */
.discovery-theme-chip {
    ...
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
    user-select: none;
}
.discovery-theme-chip:hover {
    border-color: var(--highlight);
    color: var(--highlight);
    background: var(--highlight-light);
}
```

**設計根拠:**
- `.ex-chip:hover` と同じトークンを使用（`--highlight` / `--highlight-light`）— 視覚的一貫性
- 新規カラートークンなし
- `user-select: none` — テキスト選択を防ぐ（既存 `.ex-chip` と同じ）

### 変更 2: `renderDiscoveryLobby()` — クリックイベント追加

```js
// Before
chip.textContent = theme;
container.appendChild(chip);

// After
chip.textContent = theme;
chip.addEventListener('click', () => _exampleSearch(theme));
container.appendChild(chip);
```

**実装根拠:**
- `_exampleSearch(theme)` は既存関数。入力フィールドに `theme` をセットして `unifiedSearch()` を呼ぶ
- 検索発火後、`unifiedSearch` が `state-empty.style.display='none'` を実行 → Discovery Lobby も自動非表示（内包されているため）
- 新しい検索関数・index 操作・URL 変更なし

---

## クリックフロー

```
テーマ chip クリック（例: 「愛」）
  └─ _exampleSearch('愛')
       └─ input.value = '愛'
       └─ input.dispatchEvent(new Event('input'))
       └─ unifiedSearch()
            └─ state-empty.style.display = 'none'  ← Discovery Lobby も消える
            └─ 検索実行 → 結果描画
            └─ Concept Insight 発火（愛 → ἀγαπάω / φιλέω）
```

---

## 検証結果

### テーマクリック検索発火

| テーマ | 発火 | 入力値 | 件数 |
|--------|------|--------|------|
| 平安 | ✅ | "平安" | 361件 |
| 信仰 | ✅ | "信仰" | 717件 |
| 希望 | ✅ | "希望" | 259件 |
| 証し | ✅ | "証し" | 493件 |

> テーマは日毎に変わる。上記は 2026-07-14 の値（`_dayOfYear` = 194）。

### UI 確認

| 確認項目 | 結果 |
|---------|------|
| `cursor: pointer` | ✅ PASS |
| クリック後 state-empty 非表示 | ✅ PASS（全4件） |

### 件数回帰

| クエリ | 期待値 | 実測値 | 結果 |
|--------|--------|--------|------|
| 愛 | 631件 | 631件 | ✅ PASS |
| 罪 | 1,009件 | 1,009件 | ✅ PASS |
| ἀγαπάω | 353件 | 353件 | ✅ PASS |

### その他

| 確認項目 | 結果 |
|---------|------|
| 新規 page/console errors | ✅ PASS (0件) |

---

## 変更しなかった項目

| 項目 | 理由 |
|------|------|
| `_exampleSearch` 関数本体 | 変更禁止 |
| `unifiedSearch` | 変更禁止 |
| `resolveTerm` / `resolveConcept` | 変更禁止 |
| Concept Insight | 変更禁止 |
| chip の見た目の大幅変更 | 次フェーズ UX-10-4 で実施 |

---

## 次フェーズ

| フェーズ | 内容 |
|---------|------|
| UX-10-1F | `getCurrentSeason()` に教会暦判定を実装 |
| UX-10-4 | Discovery Lobby デザイン精緻化（ボタン感・カード感の調整） |
