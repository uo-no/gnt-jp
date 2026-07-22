# Phase UX-10-2B — Discovery Lobby Visual Transformation

**実施日**: 2026-07-14  
**監査ベース**: `docs/discovery-lobby-visual-audit.md` (UX-10-2A)  
**変更範囲**: `search-tool.html`（CSS のみ。HTML・JS 変更なし）

---

## 目的

Discovery Lobby を「検索候補チップ」から「今日の聖書への入口」へ視覚的に変換する。  
UX-10-2A 監査で特定した DS-DISCOVERY-01・02 違反を解消する。

---

## 変更内容（CSS のみ）

### 変更前後の対比

```css
/* ━━ BEFORE ━━ */
.discovery-themes {
    display: flex; flex-wrap: wrap; gap: var(--space-sm);
    justify-content: center;
}
.discovery-theme-chip {
    padding: 6px 14px;
    border: 1.5px solid var(--border-soft);
    border-radius: 20px;
    font-size: var(--text-body);
    color: var(--text-sub);
    background: var(--bg-paper);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
    user-select: none;
}
.discovery-theme-chip:hover {
    border-color: var(--highlight);
    color: var(--highlight);
    background: var(--highlight-light);
}
.discovery-title {
    color: var(--text-sub);
}

/* ━━ AFTER ━━ */
.discovery-themes {
    display: flex; flex-direction: column;
    align-items: center;
    gap: var(--space-md);
}
.discovery-theme-chip {
    padding: 4px 0;
    border: none;
    background: transparent;
    font-size: var(--text-body-lg);
    color: var(--text-main);
    cursor: pointer;
    transition: opacity 0.15s, transform 0.15s;
    user-select: none;
}
.discovery-theme-chip:hover {
    opacity: 0.55;
    transform: translateY(-1px);
}
.discovery-title {
    color: var(--text-main);
}
```

---

## 各変更の根拠

### 1. chip 表現解除（C + D）

| プロパティ | 変更前 | 変更後 | 根拠 |
|-----------|--------|--------|------|
| `border` | `1.5px solid var(--border-soft)` | `none` | ボックス感・フォームアイテム感の排除 |
| `background` | `var(--bg-paper)` | `transparent` | 「置かれた文字」としての質感 |
| `border-radius` | `20px` | 削除（border なしで不要） | pill 形状解除 |
| `padding` | `6px 14px` | `4px 0` | タップ領域を最小限確保しつつ枠感を除去 |

### 2. 縦配置（F）

| プロパティ | 変更前 | 変更後 | 根拠 |
|-----------|--------|--------|------|
| `flex-direction` | `row`（`flex-wrap: wrap`） | `column` | 選択肢一覧 → 静かな縦リズム |
| `gap` | `var(--space-sm)` = 8px | `var(--space-md)` = 16px | 縦配置での呼吸感 |
| `justify-content` | `center` | 削除（`align-items: center` で代替） | — |

### 3. テーマ文字の主役化

| プロパティ | 変更前 | 変更後 | 根拠 |
|-----------|--------|--------|------|
| `font-size` | `var(--text-body)` = 0.9rem | `var(--text-body-lg)` = 1rem | テーマ語に重みを与える |
| `color` | `var(--text-sub)` = #6e6e73（グレー）| `var(--text-main)` = #1d1d1f | テーマ語を主役に |

### 4. タイトル色強化

| プロパティ | 変更前 | 変更後 | 根拠 |
|-----------|--------|--------|------|
| `.discovery-title` `color` | `var(--text-sub)` | `var(--text-main)` | 問いかけを主役に |

### 5. hover — opacity + translateY のみ（E）

| プロパティ | 変更前 | 変更後 | 根拠 |
|-----------|--------|--------|------|
| `border-color` | `var(--highlight)` 変化 | 削除（border なし） | — |
| `color` | `var(--highlight)` 変化 | 削除 | 色変更禁止 |
| `background` | `var(--highlight-light)` 変化 | 削除 | 背景変更禁止 |
| `opacity` | なし | `0.55` | 「押せる」を静かに示す |
| `transform` | なし | `translateY(-1px)` | 軽いリフト感。ボタン感は出さない |
| `transition` | `border-color 0.15s, color 0.15s, background 0.15s` | `opacity 0.15s, transform 0.15s` | hover に合わせて更新 |

---

## DS原則との整合性（変更後）

| 原則 | 変更前 | 変更後 |
|------|--------|--------|
| DS-DISCOVERY-01: 検索方法を教えない | ❌ chip 形状 = 「検索候補」シグナル | ✅ 枠・背景なし = 「置かれたことば」 |
| DS-DISCOVERY-02: 入口を提示する場所 | ❌ 横並び chip = 選択肢一覧 | ✅ 縦配置の静かな招待 |

---

## 変更したこと vs 変更しなかったこと

| 項目 | 変更 | 理由 |
|------|------|------|
| `.discovery-themes` flex 方向 | `wrap` → `column` | 縦配置（F）|
| `.discovery-theme-chip` border / background | 削除 | chip 解除（C + D）|
| `.discovery-theme-chip` font-size / color | アップ | テーマ語の主役化 |
| `.discovery-title` color | アップ | 問いかけの主役化 |
| `.discovery-theme-chip:hover` | opacity + transform のみ | 仕様（色変更禁止）|
| `onclick` / `_exampleSearch` | **変更なし** | JS 変更禁止 |
| HTML 構造 | **変更なし** | HTML 変更禁止 |
| 新規カラートークン | **追加なし** | 禁止 |
| box-shadow / border | **追加なし** | 禁止 |

---

## 検証結果

### Visual

| 確認項目 | 結果 |
|---------|------|
| border: none | ✅ PASS |
| background: transparent | ✅ PASS |
| font-size: 16px（text-body-lg） | ✅ PASS |
| flex-direction: column | ✅ PASS |
| cursor: pointer | ✅ PASS |
| タイトル色: rgb(29,29,31) = text-main | ✅ PASS |
| テーマ 4件描画 | ✅ PASS |
| Mobile 390px 横スクロールなし | ✅ PASS |

### Functional

| 確認項目 | 結果 |
|---------|------|
| 「平安」クリック → 検索発火（361件） | ✅ PASS |
| 愛 631件（回帰） | ✅ PASS |
| 罪 1,009件（回帰） | ✅ PASS |
| ἀγαπάω 353件（回帰） | ✅ PASS |
| 新規 page/console errors | ✅ PASS（0件） |
