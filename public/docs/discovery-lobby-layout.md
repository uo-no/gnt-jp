# Phase UX-10-1C — Discovery Lobby Skeleton

**実施日**: 2026-07-14  
**変更範囲**: `search-tool.html`（CSS・HTML・JS のみ）

---

## 目的

Discovery Lobby の DOM 骨格を追加する。  
本フェーズは**スケルトン追加のみ**。既存 Empty State の削除・表示切替・クリックイベントはすべて次フェーズ以降。

---

## 変更内容

### 変更 1: CSS 追加（`.empty-section-label` ブロック直後）

```css
/* ── Discovery Lobby (UX-10-1C) ── */
#discovery-lobby {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    min-height: 60vh;
    padding: var(--space-xl) var(--space-md);
    gap: var(--space-lg);
}
.discovery-title {
    font-size: 1rem; font-weight: 700;
    color: var(--text-sub);
    text-align: center;
    line-height: 1.75;
    margin: 0;
}
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
    cursor: default;
}
```

**設計根拠:**
- `#discovery-lobby` の `min-height: 60vh` は `.state-empty` と同一値 — 将来の切り替え時に高さが揃う
- 新規カラートークンなし。`--border-soft`・`--bg-paper`・`--text-sub` のみ（全て既存）
- `cursor: default` — クリックイベントは次フェーズで追加。現段階は視覚的にのみ存在

### 変更 2: HTML 追加（`state-empty` 直後、`state-loading` 直前）

```html
<!-- Discovery Lobby (UX-10-1C): hidden のまま。表示切替は次フェーズ -->
<div id="discovery-lobby" hidden>
    <h2 class="discovery-title">今日は、<br>どんなことばを読みますか？</h2>
    <div class="discovery-themes"></div>
</div>
```

**設計根拠:**
- `hidden` 属性: HTML 標準の非表示属性。`display:none` と同等だが意図が明確
- `<br>` で改行位置を制御（CSS `white-space: pre-line` より移植性が高い）
- `state-empty` との共存を保証（既存 Empty State は一切変更しない）

### 変更 3: JS 追加（`_DISCOVERY_THEMES` 定数の直前）

```js
/* ── Discovery Lobby Renderer (UX-10-1C) ── */
// まだ呼び出さない。表示切替なし。イベント登録なし。
function renderDiscoveryLobby() {
    const themes = getDiscoveryThemes();
    const container = document.querySelector('#discovery-lobby .discovery-themes');
    if (!container) return;
    container.innerHTML = '';
    themes.forEach(theme => {
        const chip = document.createElement('span');
        chip.className = 'discovery-theme-chip';
        chip.textContent = theme;
        container.appendChild(chip);
    });
}
```

**設計根拠:**
- `getDiscoveryThemes()` (UX-10-1B) を呼ぶだけ — テーマ選定ロジックに触れない
- `container.innerHTML = ''` で冪等性確保（二重呼び出し時も安全）
- DOM 操作のみ。イベント登録なし・表示切替なし・console出力なし

---

## DOM 構造

`result-panel` 内の順序:

```
<main class="result-panel">
  ├─ #state-empty       ← 既存 Empty State（変更なし）
  ├─ #discovery-lobby   ← 今回追加（hidden）
  ├─ #state-loading     ← 既存（変更なし）
  ├─ #result-header     ← 既存（変更なし）
  ├─ #concept-insight   ← 既存（変更なし）
  └─ #result-body       ← 既存（変更なし）
```

---

## 検証結果

| 確認項目 | 結果 |
|---------|------|
| `#discovery-lobby` が DOM に存在する | ✅ PASS |
| `hidden` 属性がある | ✅ PASS |
| `#state-empty` と共存する | ✅ PASS |
| `renderDiscoveryLobby()` 呼び出し後 テーマ 4件描画 | ✅ PASS |
| テーマ内容: `['平安', '信仰', '希望', '証し']`（2026-07-14） | ✅ PASS |
| 重複なし | ✅ PASS |
| `renderDiscoveryLobby()` 呼び出し後も `hidden` のまま | ✅ PASS |
| Empty State の表示が変化しない | ✅ PASS |
| Page/Console error（新規）: 0件 | ✅ PASS |

---

## 変更しなかった項目

| 項目 | 理由 |
|------|------|
| `state-empty` の内容・スタイル | 変更禁止 |
| Empty State の表示ロジック | 変更禁止 |
| `resolveTerm` / `resolveConcept` | 変更禁止 |
| Pattern / Wallace Engine | 変更禁止 |
| Knowledge Graph | 変更禁止 |
| StudyPanel | 変更禁止 |
| `index.html` | 変更禁止 |
| `search-concepts.json` | 変更禁止 |
| `discovery-themes.json` | 変更禁止 |
| Theme Resolver (`getDiscoveryThemes` 等) | 変更禁止 |
| 検索ロジック | 変更禁止 |
| History / Distribution | 変更禁止 |

---

## 次フェーズ

| フェーズ | 内容 | 前提 |
|---------|------|------|
| UX-10-1D | Empty State → Discovery Lobby 表示切替 + `renderDiscoveryLobby()` 呼び出し | 本フェーズ完了後 |
| UX-10-1E | テーマ chip クリック → 検索実行 | UX-10-1D 完了後 |
| UX-10-1F | `getCurrentSeason()` に実際の教会暦判定を実装 | UX-10-1E 完了後 |
