# Phase UX-10-1D — Empty State → Discovery Lobby 切替

**実施日**: 2026-07-14  
**変更範囲**: `search-tool.html`（CSS・HTML・JS）

---

## 目的

検索前画面（Empty State）の入口を既存の「検索例一覧」から「Discovery Lobby」へ変更する。  
検索実行後の画面は一切変更しない。

---

## 変更内容

### 変更 1: CSS — `#discovery-lobby` から `min-height` を削除

`#discovery-lobby` が `#state-empty` の内部に移動したため、`min-height: 60vh` は `state-empty` が提供する。  
`#discovery-lobby` 自身は中身のレイアウトのみ担う。

```css
/* Before */
#discovery-lobby {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    min-height: 60vh;
    padding: var(--space-xl) var(--space-md);
    gap: var(--space-lg);
}

/* After */
#discovery-lobby {
    display: flex; flex-direction: column;
    align-items: center;
    padding: var(--space-xl) var(--space-md);
    gap: var(--space-lg);
}
```

### 変更 2: HTML — `#discovery-lobby` を `#state-empty` 内の先頭へ移動

- 既存コンテンツ（`.empty-glyph`・`.empty-title`・`.empty-desc`・例示チップ）は**削除しない**
- `display:none` で温存し、`_showEmpty()` がエラー表示時に復元できるようにする
- 例示チップ div に `id="empty-examples-section"` を付与（将来のターゲット用）

```html
<div class="state-empty" id="state-empty">
    <!-- Discovery Lobby (UX-10-1D): 初期表示 -->
    <div id="discovery-lobby">
        <h2 class="discovery-title">今日は、<br>どんなことばを読みますか？</h2>
        <div class="discovery-themes"></div>
    </div>
    <!-- 以下は温存。_showEmpty() が復元する -->
    <div class="empty-glyph" style="display:none">λόγος</div>
    <div class="empty-title" style="display:none">聖書を検索する</div>
    <div class="empty-desc" style="display:none">...</div>
    <div id="history-recent-section" style="display:none;...">...</div>
    <div id="empty-examples-section" style="display:none;...">...</div>
    <div id="concept-discovery-section" style="display:none;...">...</div>
    <div id="pattern-search-section" style="display:none;...">...</div>
</div>
```

### 変更 3: `_showEmpty()` — エラー表示時に Discovery Lobby を隠す

`_showEmpty()` はエラー状態（「レイヤーを選択してください」等）でのみ呼ばれる。  
この時 Discovery Lobby を隠し、従来のエラーコンテンツを復元する。

```js
function _showEmpty(title, desc) {
    document.getElementById('state-loading').style.display = 'none';
    document.getElementById('result-body').style.display = 'none';
    const es = document.getElementById('state-empty');
    es.style.display = 'flex';
    // Discovery Lobby を隠してエラーコンテンツを前面へ
    document.getElementById('discovery-lobby').hidden = true;
    const _et = es.querySelector('.empty-title');
    const _ed = es.querySelector('.empty-desc');
    const _eg = es.querySelector('.empty-glyph');
    if (_eg) _eg.style.display = '';
    if (_et) { _et.style.display = ''; _et.textContent = title || '語を入力して検索する'; }
    if (_ed) { _ed.style.display = ''; _ed.textContent = desc || '有効なレイヤーをONにして検索してください'; }
}
```

### 変更 4: スクリプト末尾で `renderDiscoveryLobby()` を呼び出す

`const _DISCOVERY_THEMES` は `init()` (L4335) より後に定義されているため TDZ エラーになる。  
全定数・関数定義が完了したスクリプト末尾（`getDiscoveryThemes` 定義直後）に移動した。

```js
// _DISCOVERY_THEMES 初期化後に呼び出す（TDZ 回避。init() より後に実行される）
renderDiscoveryLobby();
```

---

## 表示制御フロー

```
ページロード
  └─ init() 実行
  └─ スクリプト末尾: renderDiscoveryLobby() → テーマ 4件描画
  └─ CSS: state-empty { display: flex } → Discovery Lobby が見える

検索実行時（unifiedSearch）
  └─ state-empty.style.display = 'none'  ← Discovery Lobby も自動非表示（内包）

エラー表示時（_showEmpty）
  └─ state-empty.style.display = 'flex'
  └─ discovery-lobby.hidden = true       ← Lobby 非表示
  └─ .empty-title / .empty-desc を復元  ← エラーメッセージ表示

ローディング時（_showLoading）
  └─ state-empty.style.display = 'none'  ← Discovery Lobby も自動非表示
```

---

## 検証結果

| 確認項目 | 結果 |
|---------|------|
| 初期: Discovery Lobby 表示 | ✅ PASS |
| テーマ 4件描画 | ✅ PASS (`['平安','信仰','希望','証し']`) |
| テーマ重複なし | ✅ PASS |
| タイトル「今日は、どんなことばを読みますか？」 | ✅ PASS |
| IDX.l3Ready 完了後 検索後: state-empty 非表示 | ✅ PASS |
| 愛 631 件（回帰） | ✅ PASS |
| Hit Card 存在 | ✅ PASS |
| 罪 1,009 件（回帰） | ✅ PASS |
| ἀγαπάω 353 件（回帰） | ✅ PASS |
| 新規 errors: 0件 | ✅ PASS |

---

## 変更しなかった項目

| 項目 | 理由 |
|------|------|
| `unifiedSearch` / `resolveTerm` / `resolveConcept` | 変更禁止 |
| 検索結果描画 / Hit Card / Concept Insight | 変更禁止 |
| Knowledge Graph / Pattern Engine / Wallace Engine | 変更禁止 |
| StudyPanel / `index.html` | 変更禁止 |
| `search-concepts.json` / `discovery-themes.json` | 変更禁止 |
| テーマクリック（イベント追加） | 次フェーズ（UX-10-1E） |
| Empty State 内の既存コンテンツ削除 | 次フェーズ以降 |

---

## 次フェーズ

| フェーズ | 内容 |
|---------|------|
| UX-10-1E | テーマ chip クリック → 検索実行 |
| UX-10-1F | `getCurrentSeason()` に教会暦判定を実装 |
| UX-10-2 | Discovery Lobby デザイン精緻化 |
