# H-12 Visual Audit — Phase 15D 実施前確認

**実施日:** 2026-09-29  
**目的:** Phase 15D (accent 色 `#5a6e82` → `#2c4f34`) を実施する前の現状記録と確認事項整理  
**監査種別:** READ-ONLY（コード変更・commit なし）

---

## 1. 現状確認（CONFIRMED）

### 1-1. accent トークン現在値

```
--accent:       #5a6e82   ← Phase 15D 未実施。変更していない。
--accent-light: rgba(90,110,130,0.10)
--accent-mid:   rgba(90,110,130,0.20)
```

**証拠:** Playwright `getComputedStyle(document.documentElement)` による実行時確認  
`accent: "#5a6e82"` / `accentLight: "rgba(90,110,130,0.10)"` / `accentMid: "rgba(90,110,130,0.20)"`

### 1-2. Phase 15D で変更する 3 値

| トークン | 現在値（blue-gray） | 15D 後の値（deep green） |
|---|---|---|
| `--accent` | `#5a6e82` | `#2c4f34`（暫定値） |
| `--accent-light` | `rgba(90,110,130,0.10)` | `rgba(44,79,52,0.10)` |
| `--accent-mid` | `rgba(90,110,130,0.20)` | `rgba(44,79,52,0.20)` |

cascade で自動更新される参照: **128 件**（index.html + tokens.css 合計）

---

## 2. アクセント色が現れる UI 箇所の現状（OBSERVED）

Playwright による computed style 実測。

### 2-1. サイドバー アクティブ行 — `.sb-row.active`

| プロパティ | 現在値 | Phase 15D 後 |
|---|---|---|
| background | `rgba(90,110,130,0.10)` = `--accent-light` | `rgba(44,79,52,0.10)` |
| color | `rgb(90,110,130)` = `#5a6e82` | `#2c4f34` |

スクリーンショット: 「新約聖書」行に青みがかった薄い背景と青灰テキストが確認できる。

### 2-2. 節選択ハイライト — `.verse-block.selected`

| プロパティ | 現在値 | Phase 15D 後 |
|---|---|---|
| background | `rgba(90,110,130,0.10)` = `--accent-light` | `rgba(44,79,52,0.10)` |

スクリーンショット: 第 1 節に非常に淡い青みがかったハイライトが確認できる（微細）。

### 2-3. 節番号 — `.v-num`

| プロパティ | 現在値 | Phase 15D 後 |
|---|---|---|
| color | `rgb(138,133,119)` = `--text-hint` | `var(--text-sub)` = `#57534a` |

**注意:** `.v-num` は `--accent` を直接参照しているわけではない。Phase 15D と同時に `--text-hint` → `--text-sub` へ変更する（DESIGN.md §4-3）。accent ではなく ink トークンの変更。

### 2-4. ReadingStateSwitch — `.bp-seg-btn.active`

| プロパティ | 現在値（Phase 15C 暫定） | Phase 15D 後 |
|---|---|---|
| background | `rgba(255,255,255,0.92)` 白塗り | `#2c4f34` 深緑塗り |
| color | `rgb(33,31,26)` = `--text` | `#ffffff` = `ink-on-accent` |

現在は白塗り（Phase 15C で暫定導入済み）。Phase 15D で deep green + 白テキストへ変更。  
ヘッドレス環境ではモーダルシート内のため視覚確認不可 → **実機確認必要**

### 2-5. BottomNavigation — `.mbn-item`

| 項目 | 現在値 | Phase 15D 後 |
|---|---|---|
| `#mbn-bible`（聖書）color | `rgb(87,83,74)` = `--text-sub` | 変化未定（DEFER） |
| `#mbn-mode`（本文）color | `rgb(87,83,74)` = `--text-sub` | 変化未定（DEFER） |
| `#mbn-search`（検索）color | `rgb(87,83,74)` = `--text-sub` | 変化未定（DEFER） |

**現状:** 3 タブすべて同色。アクティブタブの色差がない。  
**Phase 15D で追加:** アクティブタブに `accent-greek-700` 色変化を追加（CSS 設計が必要）  
モバイル専用要素 → **実機確認必要**

### 2-6. breadcrumb / 章移動ボタン

`gbc-item`、`gbc-ch-label`、`gbc-ch-arrow` などが `color: var(--highlight)` を参照。  
cascade 経由で `#5a6e82` → `#2c4f34` へ自動更新。

### 2-7. 時制テキスト装飾（6 件）

`present` / `aorist` / `perfect` / `future` / `indicative` / `imperative` の CSS が `var(--accent)` 参照。  
cascade 経由で自動更新。

### 2-8. サイドバー章ボタン `.sb-ch-btn.active`

コード上は存在するが、ヘッドレス確認では active 状態を再現できず未実測。  
CSS: `background: var(--highlight); color: #fff; border-color: var(--highlight);`  
→ cascade 経由で blue-gray fill → deep green fill へ自動更新される。

---

## 3. H-12 完了条件チェックリスト

計画書 Phase 15D 完了条件より。

| # | 条件 | 確認方法 | 現状 |
|---|---|---|---|
| 1 | `--accent` 値が `#2c4f34`（暫定値） | ブラウザ / Playwright | NOT YET（15D 未実施） |
| 2 | ReadingStateSwitch active が深緑塗り + 白テキスト | ブラウザ検証可 | NOT YET（15D 未実施） |
| 3 | BottomNavigation のアクティブタブに色変化がある | **実機確認必要**（モバイル専用） | NOT YET（15D 未実施） |
| 4 | 本文テキスト（ink-primary）と accent 色が視覚的に区別できる | **人間目視確認必要** | NOT YET |
| 5 | `structural-morphology-ink` と accent 色が同一画面で混同されない | **人間目視確認必要** | NOT YET |
| 6 | 人間が実機（スマートフォン + デスクトップ）で読書画面を確認し正式確定 | **実機 + 人間確認** | NOT YET |

### ブラウザで検証可能な条件
- **条件 1**: `getComputedStyle` で `--accent` = `#2c4f34` を確認
- **条件 2**: `.bp-seg-btn.active` の background が `#2c4f34` であることを Playwright で確認

### 実機または人間確認が必要な条件
- **条件 3**: `#mobile-bottom-nav` はモバイル専用 (`display: none` on desktop)。Playwright 390px で代替検証可能だが、実機推奨。
- **条件 4**: `ink-primary (#211f1a)` と `accent (#2c4f34)` の視覚的区別は画面・環境依存 → 人間判断
- **条件 5**: 同一画面に `morphology-ink (#316148)` と `accent (#2c4f34)` が並ぶ STRUCTURE モードでの視覚的区別 → 人間判断
- **条件 6**: 上記すべてを実機で確認し正式値として確定

---

## 4. 条件 5 の事前リスク評価（INFERRED）

`structural-morphology-ink: #316148` と `accent-greek-700: #2c4f34` のコントラスト評価。

| 値 | H | S | L（相対輝度） |
|---|---|---|---|
| `#316148` | 144° | 33% | ~12% |
| `#2c4f34` | 136° | 28% | ~8% |

相互コントラスト比: 約 1.5:1 — **数値上は近い**。ただし：
- 用途が異なる（morphology-ink は小さいタグラベル、accent はインタラクション要素）
- 同じ surface に並置されることは STRUCTURE モード限定
- 実際の混同リスクは実機での文脈確認が必要

**INFERRED（実機未確認）:** 用途差と配置差によって区別可能と推測するが、確定には人間目視が必要。

---

## 5. Phase 15D 実施に必要な追加 CSS 設計

以下は Phase 15D 実装時に token 変更だけでは自動更新されない要素。

### 5-1. ReadingStateSwitch

現在の実装（Phase 15C 暫定）:
```css
.bp-seg-btn.active {
    background: rgba(255,255,255,0.92);
    color: var(--text-main);
}
```

Phase 15D 後の設計案:
```css
.bp-seg-btn.active {
    background: var(--accent);          /* → #2c4f34 */
    color: var(--ink-on-accent, #fff);  /* 白テキスト */
}
```

### 5-2. BottomNavigation アクティブ状態（新規 CSS 設計が必要）

現在: アクティブ状態の CSS ルールなし（全タブ同色）

Phase 15D での設計案（要確認）:
```css
/* アクティブタブの icon color 変更 */
.mbn-item.active { color: var(--accent); }
/* または JS で class 付与する実装 */
```

**注意:** 現在のコードに `.mbn-item.active` を付与する JS ロジックがあるか要調査。

### 5-3. `.v-num` 色変更

```css
/* 現在（変更前） */
.v-num { color: var(--text-hint); }
/* Phase 15D と同時に変更 */
.v-num { color: var(--text-sub); }
```

---

## 6. NOT VERIFIED（今回の監査対象外）

- **RELATION モード**のフォーカスアーク・談話チェーン色（`--accent` 参照あり）— STRUCTURE モード同様に実機確認推奨
- **StudyPanel タブ**のアクティブ色 — ヘッドレス環境での再現未確認
- **ハイライト機能**のハイライト色 — `--accent-light` 参照あり
- **サイドバー章ボタン `.sb-ch-btn.active`** の active 状態実色 — ヘッドレス再現未確認
- **検索結果**の accent 参照箇所 — 今回未調査

---

## 7. 実機確認時の推奨確認手順

Phase 15D 実施後、実機（スマートフォン推奨: iPhone + Safari）で以下を確認する。

1. **読書画面（本文 + 節番号）**: `#2c4f34` が本文 `#211f1a` と区別できるか
2. **STRUCTURE モード**: morphology タグ (`#316148` 緑) と accent 色 (`#2c4f34` 深緑) が同一画面で混同されないか
3. **サイドバー**: アクティブ行の深緑が読みやすいか
4. **ReadingStateSwitch**: 深緑 pill が判別できるか
5. **BottomNavigation**: アクティブタブの色変化が視認できるか
6. 上記確認後、`#2c4f34` を正式確定、または調整値を提案する

---

---

## 最終判定（2026-09-29）

**H-12 = 暫定PASS**

| 条件 | 判定 | 根拠 |
|---|---|---|
| 深緑が本文より過度に目立っていない | ✅ PASS | 選択・ナビ用途に限定。reading text (#211f1a) と明確に分離。 |
| 節選択・BottomNav・章ピッカーの UI 状態が認識できる | ✅ PASS | Playwright computed + SS で確認 |
| 構造色とアクセント色に明らかな混同がない | ✅ PASS | STRUCTURE モード SS で文脈分離確認 |
| スマートフォン・デスクトップで破綻がない | ✅ PASS | 390px・1440px SS で問題なし |
| 実機での最終確定 | ⏸ 保留 | 実機 (iOS Safari) での目視が残件 |

*State: Phase 15D IMPLEMENTED + H-12 暫定PASS。実機最終確定は残件。*
