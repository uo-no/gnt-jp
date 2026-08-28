# C-17 Step 5-A — 長大HDG構造の折りたたみ設計レポート

**Phase:** C-17 — Hierarchical Diagram (HDG) Renderer  
**Date:** 2026-08-28  
**State:** DESIGN ONLY — CODE CHANGES: 0  
**Base:** C-17 Step 4 FROZEN（変更禁止）

---

## 1. 調査結果：clause DOM 構造

### 1-1. 現在の DOM 構造（Step 4 FROZEN）

```
.sd-sentence[data-ref="COL 1:9"]
  .hdg-view
    .hdg-sentence
      .hdg-clause.hdg-clause--root[data-hdg-depth="0"][data-node-id="…"]
        .hdg-clause-label           ← "主節"
        .hdg-slots
          .hdg-slot.hdg-slot-object
            .hdg-fn                 ← "目的語"
            .hdg-clause.hdg-clause--sub[data-hdg-depth="1"][data-node-id="…"]
              .hdg-clause-label     ← "節"
              .hdg-slots
                …（再帰）
          .hdg-slot.hdg-slot-adverbial
            .hdg-fn                 ← "副詞的"
            .hdg-clause--pp         ← 前置詞句 block
              …
```

**折りたたみの自然な境界:**

```
.hdg-clause
  .hdg-clause-label  ← 常時表示（折りたたみ時の「見出し」）
  .hdg-slots         ← 折りたたみ時に hidden にする対象
```

`data-node-id` は `.hdg-clause` に付与済み（Step 4 完了）。  
`data-hdg-depth` は `0`（主節）〜最大 `20`（COL 1:9 最深部）。

---

## 2. ネスト構造の実測データ

### 2-1. 書別 maxDepth と総高さ

| 書 | maxDepth | 総高さ(px) | 最長節(px) | 最長節のdesc数 |
|---|---|---|---|---|
| COL 1 | **20** | 29,313 | 6,747 | 45 |
| JHN 1 | 8 | 58,586 | 3,990 | 25 |
| EPH 2 | 12 | 20,124 | 3,393 | 23 |
| PHP 2 | 10 | 26,067 | 3,021 | 19 |
| ROM 6 | 6 | 23,624 | 2,192 | 14 |
| MAT 28 | 8 | 21,878 | 1,915 | 11 |

COL は他書の 2〜3 倍の nesting depth を持つ特異ケース。  
JHN は節数が最多（371 節）だが depth は浅く（max 8）、1 節ごとの高さが COL より小さい。

### 2-2. COL 1:9 のクローズアップ（46 節、6,820px）

```
主節 depth=0  6,747px  [45 descendant clauses]
├ 前置詞句 depth=1  110px   [fn:副詞的]
├ 前置詞句 depth=1  258px   [fn:副詞的]
│   └ 節 depth=2  177px   [fn:副詞的]
└ 節 depth=1  6,018px  [fn:目的語] ← ★ 最大の「内容」枝
    ├ 前置詞句 depth=2  110px   [fn:副詞的]
    └ 内容節 depth=2  5,722px  [fn:目的語] ← 巨大
        └ 節 depth=3  5,675px  [fn:目的語]
            ├ 前置詞句 depth=4  114px   [fn:副詞的]
            ├ 節 depth=4  398px   [fn:副詞的]
            ├ 節 depth=4  526px   [fn:目的語]
            ├ 節 depth=4  567px   [fn:目的語]
            └ 節 depth=4  3,804px [fn:目的語] ← ★★ 最優先折りたたみ候補
                ├ 前置詞句 depth=5  110px   [fn:副詞的]
                └ 関係節 depth=5  3,508px  [fn:目的語]
                    ├ 同格 depth=6  613px   [fn:目的語]
                    │   └ 名詞化節 depth=7  528px  [fn:目的語]
                    └ 節 depth=6  2,846px  [fn:目的語]
                        ├ 節 depth=7  398px   [fn:目的語]
                        └ 節 depth=7  2,361px [fn:目的語]
                            └ 前置詞句 depth=8  2,213px [fn:副詞的]
                               （depth 14 まで続く…）
```

### 2-3. 折りたたみ効果シミュレーション（COL 1:9）

| rank | 節ラベル | depth | 高さ | 閉じた場合の節減 | desc数 | fn |
|---|---|---|---|---|---|---|
| 1 | 主節 | 0 | 6,747px | — | 45 | （仕様上閉じない） |
| 2 | 節 | 1 | 6,018px | 5,994px | 41 | 目的語 |
| 3 | 内容節 | 2 | 5,722px | 5,698px | 39 | 目的語 |
| 4 | 節 | 3 | 5,675px | 5,651px | 38 | 目的語 |
| **5** | **節** | **4** | **3,804px** | **3,780px** | **26** | **目的語** |
| **6** | **関係節** | **5** | **3,508px** | **3,484px** | **24** | **目的語** |
| 7 | 節 | 6 | 2,846px | 2,822px | 18 | 目的語 |
| 8 | 節 | 7 | 2,361px | 2,337px | 15 | 目的語 |

**観察:** depth 4〜6 の 3〜4 節を閉じると、COL 1:9 は 6,820px → 約 800〜1,200px まで圧縮可能（推定）。

---

## 3. fn ラベルと clause の関係

現状の hdg-slot は「fn バッジ（span.hdg-fn）+ clause コンテンツ」を縦積みで表示する（Step 4）。

```
.hdg-slot.hdg-slot-object
  .hdg-fn  "目的語"
  .hdg-clause--sub  …
```

折りたたみ時:
- `.hdg-fn`（目的語 バッジ）は `.hdg-slot` に属するため、clauses の `.hdg-slots` を隠しても fn バッジは残る
- ユーザーは「目的語」という fn は認識できるが、その内容は見えなくなる
- これは「構造の縮約表示」として適切

---

## 4. 3案の比較

### 案 A: 全 clause を折りたたみ可能

全ての `.hdg-clause`（root + sub）に折りたたみトグルを付与。

| 評価軸 | 評価 | 理由 |
|---|---|---|
| 一貫性 | ◎ | 全 clause が同じ操作 |
| 主節の扱い | × | 主節を閉じると文全体が消える（仕様違反リスク） |
| 短い節への適用 | △ | 110px の前置詞句にもトグルが付く → UI ノイズ |
| 実装複雑度 | ○ | CSS class 追加のみ |

### 案 B: nested clause のみ（depth ≥ 1）

root 主節（depth=0）を除く全 sub-clause に折りたたみを付与。

| 評価軸 | 評価 | 理由 |
|---|---|---|
| 一貫性 | ◎ | depth ≥ 1 で完全に統一 |
| 主節の扱い | ◎ | depth=0 は UI 対象外 → 仕様を自然に満たす |
| 短い節への適用 | △ | 短い節にもトグルが付くが、自動折りたたみでないので問題は軽微 |
| 実装複雑度 | ◎ | `data-hdg-depth !== "0"` の条件分岐のみ |

### 案 C: 長大な nested clause のみ（閾値ベース）

高さ or desc 数が閾値を超える clause にのみ折りたたみを付与。

| 評価軸 | 評価 | 理由 |
|---|---|---|
| 一貫性 | × | 書・章・文によって対象が変わる → 予測不可 |
| 主節の扱い | ○ | 閾値設計次第 |
| 短い節への適用 | ◎ | 不要なトグルを除外できる |
| 実装複雑度 | × | 閾値定義、runtime 計算、動的切り替えが必要 |
| L-0 適合 | △ | 「長大」の判断基準は構造外の情報 → 推論に近い |

---

## 5. 推奨案：B（nested clause のみ）

**推奨理由:**

1. `data-hdg-depth="0"`（主節）という既存属性がそのまま除外条件になる — 追加の計算不要
2. depth ≥ 1 の全 sub-clause が一律に対象 → ユーザーが「この節だけ操作できない」という混乱が生じない
3. 閾値ベース（案 C）より実装がシンプルかつ堅牢
4. 自動折りたたみを採用しないため、短い節にトグルが付いても実害は最小
5. L-0 に安全: 新しい情報を推論・追加しない

---

## 6. DOM 境界と UI 状態設計

### 6-1. 折りたたみ対象 DOM

```
.hdg-clause[data-hdg-depth≠"0"]       ← 折りたたみ可能要素
  .hdg-clause-label                   ← トグルトリガー（常時表示）
  .hdg-slots                          ← 折りたたみ時に非表示
```

**Step 4 の構造を変更しない。** 新規属性・クラスを追加するのみ。

### 6-2. CSS 状態クラス

```css
/* Step 5-B で追加予定（Step 4 は触らない）*/

.hdg-clause.hdg-collapsed > .hdg-slots {
    display: none;
}

.hdg-clause-label[aria-expanded] {
    cursor: pointer;
    user-select: none;
}

/* 折りたたみ状態の視覚インジケーター */
.hdg-clause.hdg-collapsed > .hdg-clause-label::after {
    content: ' …';
    opacity: 0.45;
    font-weight: 400;
}
```

### 6-3. JS 状態

```javascript
// Step 5-B で追加予定（index.html への変更は Step 5-B まで禁止）

// depth ≥ 1 の clause label に click handler を付与
function _hdgAttachFold(sentEl) {
    sentEl.querySelectorAll('.hdg-clause[data-hdg-depth]').forEach(cl => {
        if (cl.dataset.hdgDepth === '0') return;  // skip root
        const lbl = cl.querySelector(':scope > .hdg-clause-label');
        const slots = cl.querySelector(':scope > .hdg-slots');
        if (!lbl || !slots) return;
        lbl.setAttribute('role', 'button');
        lbl.setAttribute('tabindex', '0');
        lbl.setAttribute('aria-expanded', 'true');
        lbl.setAttribute('aria-controls', slots.id || '');  // id付与が必要
        lbl.addEventListener('click', () => _hdgToggleFold(cl, lbl));
        lbl.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                _hdgToggleFold(cl, lbl);
            }
        });
    });
}

function _hdgToggleFold(cl, lbl) {
    const collapsed = cl.classList.toggle('hdg-collapsed');
    lbl.setAttribute('aria-expanded', String(!collapsed));
}
```

### 6-4. 初期状態

**全 clause 展開（open）。自動折りたたみなし。**

これは仕様で確定済み。

---

## 7. アクセシビリティ設計

### 7-1. ARIA 要件

| 属性 | 付与先 | 値 |
|---|---|---|
| `role="button"` | `.hdg-clause-label`（depth≥1） | 固定 |
| `tabindex="0"` | `.hdg-clause-label`（depth≥1） | 固定 |
| `aria-expanded` | `.hdg-clause-label`（depth≥1） | `"true"` / `"false"` |
| `aria-controls` | `.hdg-clause-label` | `.hdg-slots` の id を参照 |
| `id` | `.hdg-slots`（depth≥1） | `hdg-slots-{nodeId}` |

### 7-2. キーボード操作

- `Tab`: 各 clause label にフォーカス
- `Enter` / `Space`: 折りたたみ toggle
- `Escape`: 折りたたみを展開（フォーカスを持つ clause のみ、オプション）

### 7-3. スクリーンリーダー向け

- collapse 時：「内容節 [折りたたまれています]」相当の読み上げ
- expand 時：「内容節 [展開]」→ 子要素が読み上げ可能になる
- `.hdg-clause-label::after { content: ' …' }` はスクリーンリーダーに読まれる可能性があるため、
  `aria-hidden` の付与か、CSS `speak: none` での制御を検討

---

## 8. L-0 確認

| チェック項目 | 判定 | 根拠 |
|---|---|---|
| 新しい統語推論を追加しない | ✅ | 折りたたみは表示状態の変更のみ |
| 意味的要約を表示しない | ✅ | collapsed 時は clause-label（「内容節」等）のみ表示 |
| 先行詞推論をしない | ✅ | 変更なし |
| SR JSON を変更しない | ✅ | 変更なし |
| Renderer が新たな構造情報を生成しない | ✅ | display:none は情報を追加しない |
| 折りたたみラベルが意訳にならない | ✅ | 既存の clause-label（「関係節」「従属節」等）をそのまま使用 |

---

## 9. 390px と 1024px の UX 想定

### 1024px

- clause label の幅は十分（300px+）
- トグルアイコン（`▶`/`▼` 等）を label 右端に配置可能
- マウスホバー時のカーソル変化（`cursor: pointer`）で操作可能性を示す

### 390px

- 主節の width は約 370px（padding 考慮後）
- label タップターゲット: 最低 44px 高さを確保する必要あり（現在の `.hdg-clause-label` は font-size .7rem ≈ 11px → padding 補強が必要）
- `.hdg-clause-label` の `padding` を 390px では `padding: .4rem .3rem` 程度に拡大
- トグルアイコンは label 左端（▶/▼）の方がモバイルでは視認しやすい

---

## 10. Step 4 との境界確認

| 項目 | Step 4 | Step 5-B |
|---|---|---|
| `.hdg-clause` の DOM 構造 | FROZEN — 変更なし | 変更なし |
| `.hdg-slots` の表示 | FROZEN — 常時表示 | `display:none` を追加（クラスで制御） |
| `.hdg-clause-label` | FROZEN — 表示のみ | `role`, `tabindex`, `aria-expanded` を追加 |
| `data-hdg-depth` | FROZEN — 付与済み | 読み取りのみ使用 |
| `data-node-id` | FROZEN — 付与済み | slots の id 生成に使用予定 |
| CSS クラス `.hdg-collapsed` | 存在しない | Step 5-B で新規追加 |

---

## 11. Step 5-B で実装する内容

1. **CSS**: `.hdg-collapsed > .hdg-slots { display: none }` + label インジケーター
2. **JS**: `_hdgAttachFold(sentEl)` — depth ≥ 1 の clause-label に event handler 付与
3. **JS**: `_hdgToggleFold(cl, lbl)` — クラス toggle + aria-expanded 更新
4. **HTML (JS)**: `.hdg-slots` に `id="hdg-slots-{nodeId}"` を付与（aria-controls 用）
5. **CSS (responsive)**: 390px での label タップターゲット拡大
6. **初期状態**: 全展開（オプション: 将来 localStorage で状態保存）

実装対象ファイル: `public/index.html` のみ  
SR JSON / dg-engine.js / RK renderer: 変更なし

---

## 12. 未解決事項（Step 5-B 着手前に判断が必要）

| # | 事項 | 状態 |
|---|---|---|
| 1 | 折りたたみ状態を localStorage で保存するか | **DEFERRED** — Step 5-B 設計時に判断 |
| 2 | 「全て折りたたむ / 全て展開」ボタンを付けるか | **DEFERRED** |
| 3 | collapsed label のインジケーター形状（▶▼ vs `…` vs `[+]`） | **DEFERRED** |
| 4 | 390px での label タップターゲット最小高さ（44px vs 現状の ~11px） | **要判断** before Step 5-B |
| 5 | `.hdg-clause--pp`（前置詞句 block）も fold 対象か | **DEFERRED** — 案 B では対象外（clause のみ） |
| 6 | collapsed 時の focus 管理（子要素にフォーカスがある状態で閉じた場合） | **要実装** in Step 5-B |

---

```
STEP 5-A: DESIGN ONLY
STEP 4:   FROZEN
CODE CHANGES: 0
```
