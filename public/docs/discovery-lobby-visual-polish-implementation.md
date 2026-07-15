# UX-10.7-B — Discovery Lobby Visual Polish Implementation

**実施日**: 2026-07-14  
**変更範囲**: `search-tool.html`（CSS 3行のみ）  
**根拠**: UX-10.7-A Visual Polish Audit — T-02 / T-03 / I-02

---

## 目的

Discovery Lobby の視覚品質のみ改善する。  
機能・JS・DOM 構造・データは一切変更しない。

---

## 変更内容

### T-03 — `.discovery-theme-chip` font-family

**解消対象**: UX-10.7-A T-03「chip font-family がシステム UI」

```diff
 .discovery-theme-chip {
     padding: 12px 0;
     border: none;
     background: transparent;
+    font-family: 'Gentium Plus', serif;
     font-size: var(--text-title);
     color: var(--text-main);
     cursor: pointer;
-    transition: opacity 0.15s, transform 0.15s;
+    transition: opacity 0.15s;
     user-select: none;
 }
```

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| font-family | inherit（system UI sans-serif）| `'Gentium Plus', serif` |
| transition | `opacity 0.15s, transform 0.15s` | `opacity 0.15s`（I-02 に伴い transform 削除）|

**効果**: テーマ語が聖書テキストと同じ serif フォントで表示される。  
「メニュー項目」から「聖書のことば」の質感へ。

---

### T-02 — `.discovery-title` color

**解消対象**: UX-10.7-A T-02「title と chip が同色（color hierarchy なし）」

```diff
 .discovery-title {
-    font-size: 1rem; font-weight: 400;
-    color: var(--text-main);
+    font-size: 1rem; font-weight: 400;
+    color: var(--text-sub);
     text-align: center;
     line-height: 1.75;
     margin: 0;
 }
```

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| color | `var(--text-main)` = #1d1d1f | `var(--text-sub)` = #6e6e73 |

**効果**: 説明文（問いかけ）が控えめな色に変わり、テーマ語（`var(--text-main)`）が色でも主役になる。  
DS-DISCOVERY-01「テーマ語が主役」を size に加えて color でも補強。

---

### I-02 — `.discovery-theme-chip:hover` transform 削除

**解消対象**: UX-10.7-A I-02「hover translateY(-1px) がボタン感」

```diff
 .discovery-theme-chip:hover {
     opacity: 0.55;
-    transform: translateY(-1px);
 }
```

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| transform | `translateY(-1px)` | なし |

**効果**: hover 時の物理的上昇感（= ボタン感）が除去される。  
opacity フェードのみの「静かな応答」になり、DS-DISCOVERY-02「静かな入口」が徹底される。

---

## 設計制約の遵守確認

| 制約 | 確認 |
|------|------|
| JS 変更禁止 | ✅ |
| renderDiscoveryLobby() 変更禁止 | ✅ |
| discovery-theme データ変更禁止 | ✅ |
| 検索処理変更禁止 | ✅ |
| DOM 構造変更禁止 | ✅ |
| border 追加禁止 | ✅ |
| background 追加禁止 | ✅ |

---

## 検証結果（Playwright / localhost:8765）

### Desktop 1280×800

| 確認項目 | 結果 | 実測 |
|---------|------|------|
| IDX.l3Ready | ✅ | — |
| Discovery Lobby 表示 | PASS ✅ | — |
| テーマ4件表示 | PASS ✅ | 忍耐 / 信仰 / 希望 / 証し |
| chip font-family Gentium Plus | PASS ✅ | `"Gentium Plus", serif` |
| title color = text-sub | PASS ✅ | `rgb(110, 110, 115)` = #6e6e73 |
| transition に transform なし | PASS ✅ | `opacity 0.15s` |
| chip クリック → 検索 | PASS ✅ | 92件（忍耐 NT 78 + LXX 14）|
| 回帰: 愛 631件 | PASS ✅ | `631 件` |
| 回帰: 罪 1,009件 | PASS ✅ | `1,009 件` |
| 回帰: ἀγαπάω 353件 | PASS ✅ | `353 件` |
| console errors | PASS ✅ | 0件 |

### Mobile 390×844

| 確認項目 | 結果 | 実測 |
|---------|------|------|
| Discovery Lobby 表示 | PASS ✅ | — |
| tap target ≥44px | PASS ✅ | **54px** |
| 横スクロールなし | PASS ✅ | — |
| chip クリック → 検索 | PASS ✅ | 92件 |
| console errors | PASS ✅ | 0件 |

---

## 変更後の Discovery Lobby CSS（完全版）

```css
#discovery-lobby {
    display: flex; flex-direction: column;
    align-items: center;
    padding: 48px var(--space-md) var(--space-xl);
    gap: var(--space-lg);
}
.discovery-title {
    font-size: 1rem; font-weight: 400;
    color: var(--text-sub);          /* ← T-02: text-main → text-sub */
    text-align: center;
    line-height: 1.75;
    margin: 0;
}
.discovery-themes {
    display: flex; flex-direction: column;
    align-items: center;
    gap: var(--space-md);
}
.discovery-theme-chip {
    padding: 12px 0;
    border: none;
    background: transparent;
    font-family: 'Gentium Plus', serif;  /* ← T-03: serif 追加 */
    font-size: var(--text-title);
    color: var(--text-main);
    cursor: pointer;
    transition: opacity 0.15s;           /* ← I-02: transform 削除 */
    user-select: none;
}
.discovery-theme-chip:hover {
    opacity: 0.55;                        /* ← I-02: translateY 削除 */
}
```

---

## 残存 IMPROVE

以下は UX-10.7-A で特定されたが本フェーズで対応しなかった項目:

| ID | 内容 | 状態 |
|----|------|------|
| C-01 | hover opacity 0.55 → `var(--opacity-secondary)` | 持越し |
| T-01 | title font-size 生値 → `var(--text-body-lg)` | 持越し |
| S-01 | lobby padding-top 48px 生値 → token 式 | 持越し |
| S-02 | chip と input の垂直差 13px（目標 30px）| 持越し |
| S-03 | `.state-empty gap: 14px` → `var(--space-md)` | 持越し |
| I-01 | transition → `var(--transition-fast)` | 持越し |
| I-03 | :active 状態追加 | 持越し |

---

## 成果物

| ファイル | 変更 |
|---------|------|
| `search-tool.html` L1032 | `.discovery-title color: var(--text-sub)` |
| `search-tool.html` L1046 | `.discovery-theme-chip font-family: 'Gentium Plus', serif` 追加 |
| `search-tool.html` L1049 | `transition: opacity 0.15s`（transform 削除）|
| `search-tool.html` L1054 | `transform: translateY(-1px)` 削除 |
| `docs/discovery-lobby-visual-polish-implementation.md` | 本ドキュメント |
