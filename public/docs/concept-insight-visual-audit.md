# Phase UX-9-3 — Concept Insight Visual Consistency Audit

**生成日**: 2026-07-14  
**対象**: `search-tool.html`（コード変更なし・監査のみ）  
**根拠**: `docs/search-design-system.md` §4 / §5 / §8 / §9  
**方針**: Concept Insight が「検索結果の一部」ではなく「テーマ理解への入口」として視覚的に適切に位置づけられているか確認する

---

## 1. Section Hierarchy Audit

### 1-1. 各セクションの CSS プロパティ比較表

| コンポーネント | background | border | border-radius | padding | margin-bottom | hover |
|-------------|-----------|--------|---------------|---------|---------------|-------|
| `#concept-insight` | `var(--bg-panel)` = #f5f5f7 (グレー) | 1px solid `var(--border-soft)` | `var(--radius-m)` = **12px** | `var(--space-md)` = 16px | `var(--space-md)` = 16px | なし |
| `.hit-card` | `var(--bg-paper)` = **white** | 1px solid `var(--border-soft)` | **10px（直値）** | **14px 16px（直値）** | **8px（直値）** | border-color + box-shadow |
| `.lg-bar`（Lemma） | `var(--bg-paper)` = white | 1px solid `var(--border-soft)` | **6px（直値）** | **8px 12px（直値）** | 6px（`.lg-row`） | background → bg-panel |
| `.dist-panel`（分布） | 透明（指定なし） | なし（border-top のみ） | — | — | **18px（直値）** | なし |
| `.advanced-layers-toggle`（詳細検索） | なし | 1px solid `var(--border-soft)` | **8px（直値）** | **8px 12px（直値）** | — | color → highlight |

### 1-2. セクション見出し（Title）の比較表

| 要素 | font-size | font-weight | letter-spacing | text-transform | color | opacity |
|------|-----------|-------------|---------------|----------------|-------|---------|
| **`.ci-concept-title`** | `var(--text-body-lg)` = 1rem | **700** | -0.01em | なし | `var(--text-main)` | 1 |
| **`.ci-section-title`** | `var(--text-caption)` = 0.75rem | **未指定（400）** | **なし** | **なし** | `var(--text-sub)` | 1 |
| `.cooc-title` | **0.6rem（直値）** | 700 | 0.12em | uppercase | `var(--text-sub)` | 0.6 |
| `.dist-title` | **0.6rem（直値）** | 700 | 0.12em | uppercase | `var(--text-sub)` | 0.6 |
| `.lg-cooc-title`, `.lg-hits-title` | **0.58rem（直値）** | 700 | 0.10em | uppercase | `var(--text-sub)` | 0.55 |
| `.s-label`（検索語など） | **0.68rem（直値）** | 700 | 0.10em | uppercase | `var(--text-sub)` | 1 |
| `.advanced-layers-toggle` | **0.72rem（直値）** | 700 | 0.06em | なし | `var(--text-sub)` | 1 |

### 1-3. Visual Priority 評価

| 順位 | コンポーネント | 視覚的重み | 理由 |
|-----|-------------|-----------|------|
| 1 | `#concept-insight` | **高** | グレー背景 + 太字タイトル（1rem, 700） + border |
| 2 | `.hit-card` | **中-高** | white bg + hover: border-color + box-shadow（インタラクション優） |
| 3 | `.lg-bar`（Lemma） | **中** | white bg + chevron + 件数表示 |
| 4 | `.advanced-layers-toggle` | **中-低** | border 付きテキスト（ghost 風） |
| 5 | `.dist-panel` | **低** | 透明 bg + border-top のみ |

**判定**: Concept Insight は視覚的重みとしては最上位にある。グレー背景（`--bg-panel`）が白背景（Hit Card）と区別されており、「検索結果の一部ではない」ことは色で分離できている。ただし区別の根拠がグレーの微差のみであり、視覚的な「異なるカテゴリ」としての明示は弱い。

---

## 2. Design System Consistency Audit

### 2-1. §4-6 Section Label との違反

**違反: `.ci-section-title` が Design System の Section Label 規定に従っていない**

Design System §4-6 規定（大文字見出し・Primary Label）:
```css
font-size: var(--text-caption);
font-weight: 700;
letter-spacing: 0.10em;
text-transform: uppercase;
color: var(--text-sub);
opacity: 0.6;
```

現在の `.ci-section-title`:
```css
font-size: var(--text-caption);   /* ✓ 一致 */
color: var(--text-sub);           /* ✓ 一致 */
margin-bottom: var(--space-xs);   /* ✓ */
/* font-weight: 未指定 → 400 (通常体)      ✗ 違反 */
/* letter-spacing: なし                    ✗ 違反 */
/* text-transform: uppercase なし          ✗ 違反 */
/* opacity: 1.0（他の見出しは 0.55〜0.6）  ✗ 不統一 */
```

**結果**: `関連するギリシャ語`・`関連する概念`・`パターンで探す`・`構文で探す` の見出しがすべて「平文テキスト」のように見える。他の `.cooc-title`・`.dist-title`・`.lg-cooc-title` は全て uppercase + letter-spacing で統一されているのに対し、Concept Insight だけが異なる。

**対応**: UX-9-3 として実装予定。

---

### 2-2. §5 CTA Hierarchy との違反

**`.ci-related-more-btn`（「さらに表示」）が Design System の Tertiary 規定と不統一**

Design System §5-4: 「Tertiary（さらに表示）系ボタンは将来 `.expand-btn` に統一」

現在の実装:
- `.ci-related-more-btn`: `border: 1px dashed var(--border-soft)` + `border-radius: var(--radius-s)`
- `.hits-toggle-btn`（Hit Cards）: components.css 側に定義（`accent-light` background系）
- `.lg-more-btn`（Lemma）: `border: 1px dashed var(--border-soft)` + `border-radius: 6px`

→ `.ci-related-more-btn` と `.lg-more-btn` は近いスタイルだが `.hits-toggle-btn` は別系統。3種類の乱立はUX-9-9で解決予定。今回はスコープ外。

---

### 2-3. §4-4 Chip System との違反

**Pattern チップが `prox`（近接オレンジ）色を誤用**

Concept Insight 内の Pattern チップ生成（JS line 2559）:
```js
const patHtml = pats.map(p =>
    `<span class="layer-chip prox" onclick="runPatternSearch(${p.i})">${_escH(p.label)}</span>`).join('');
```

→ `prox` 色（#b84a1a、オレンジ系）は「近接検索レイヤー」の意味色。  
Pattern Search（文法パターン）は全く別機能であるにもかかわらず同色を使用。

影響:
1. 「この橙色チップを押すと近接検索が始まる」という誤解を招く
2. Empty State の Pattern chips（`_renderPatternChips`）も同じ `prox` 色を使用  
   → 同一問題が2箇所に存在

Design System §4-4: 「Pattern Chip は `.layer-chip.prox`（近接オレンジ）を使用禁止」

**対応**: UX-9-7（Pattern chips 色分離）として定義済み。

---

### 2-4. §8 Visual Hierarchy との整合

Design System §8 では Concept Card の重要度は「Secondary」と定義されている（Hit Card も Secondary）。現状、`#concept-insight` と `.hit-card` は同じ重要度レベルに視覚的に置かれているが:

- 目的が異なる（地図 vs 招待状）
- インタラクションが異なる（テーマ探索 vs 本文遷移）

**判定**: 同じ重要度レベルに置かれているが、背景色差と位置（結果上部 vs 結果本体）で区別されており、現状は許容範囲。ただしユーザーが「これも検索結果の1つか」と誤解するリスクは残る。

---

## 3. Concept Insight 内部 Hierarchy Audit

### 3-1. 現在の順序

```
「愛」について                ← .ci-concept-title（1rem, 700, text-main）
関連するギリシャ語             ← .ci-section-title（0.75rem, 400, text-sub）
  [ἀγαπάω 愛する 631回] ...
関連する概念                  ← .ci-section-title
  [恵み][信仰][喜び] ... [さらに表示(N)]
▸ さらに詳しく               ← .ci-advanced-toggle（折りたたみ）
  パターンで探す
    [語根探索][フレーズ一致]...
  構文で探す
    [命令法][ἵνα節]...
```

### 3-2. 各要素の評価

| 要素 | 評価 | 理由 |
|------|------|------|
| タイトル「愛」について | **GOOD** | 検索語との関連が明確。1rem + bold で目立つ |
| 関連するギリシャ語（第1位） | **IMPROVE** | 初心者には「ギリシャ語」が先に来ることが intimidating。日本語テーマ（関連する概念）が先の方が自然 |
| `ci-lex-row`（クリック可） | **IMPROVE** | `title="Abbott-Smith 辞書を開く"` は hover tooltip のみ。タップ環境では affordance なし |
| 関連する概念（第2位） | **GOOD** | 探索の入口として機能。Progressive Disclosure（>8件 折りたたみ）も適切 |
| さらに詳しく（折りたたみ） | **GOOD** | 高度な内容を隠す設計は正しい |
| パターンで探す（内部） | **IMPROVE** | Pattern chip が `prox` 色（別問題 UX-9-7）|
| 構文で探す（内部） | **GOOD** | `morph` 色（紫）で他セクションと視覚的に区別されている |

### 3-3. 順序についての評価詳細

**現在**: 関連するギリシャ語 → 関連する概念

**初心者視点での問題点**:
- 「関連するギリシャ語」が最初に来ると、ギリシャ語を知らない初心者が「これは自分向けではない」と判断して Concept Insight を閉じてしまう可能性がある
- 「関連する概念」（日本語テーマのチップ列）の方が、初心者にとっての探索の入口として価値が高い

**推奨順序**: 関連する概念 → 関連するギリシャ語 → さらに詳しく

→ ただしこの変更は JS の `_renderConceptInsight` 関数内の HTML 生成順序の変更を伴うため、
今回は観察として記録し、改善案 D として提示する。

---

## 4. 色・アイコン監査

### 4-1. Concept Insight 専用色の有無

| 色の種類 | 現状 |
|---------|------|
| Concept Insight 専用 background | なし（共通トークン `var(--bg-panel)` を流用） |
| Concept Insight 専用 border | なし（共通トークン `var(--border-soft)` を流用） |
| `.ci-lex-row` background | `var(--bg)` = white（card内で白浮き） |
| 関連する概念チップ色 | `.layer-chip.lemma`（青 #1a5fa8） |
| パターンで探すチップ色 | `.layer-chip.prox`（橙 #b84a1a）← **問題** |
| 構文で探すチップ色 | `.layer-chip.morph`（紫 #7b3d9a） |

**Concept Insight 専用色はなく、共通トークンのみを使用**。  
これは Design System §4-6 の「新しい色を作らない」原則に従っており正しい実装。  
ただし専用色がないため「別カテゴリの情報」としての視覚分離が弱い。

### 4-2. Pattern チップと色競合

| チップ種別 | 色 | 本来の意味 | Concept Insight での使用 | 競合度 |
|-----------|---|-----------|--------------------------|--------|
| `.layer-chip.prox` | 橙（#b84a1a） | 近接検索レイヤー | Pattern Search チップ | **HIGH** |
| `.layer-chip.lemma` | 青（#1a5fa8） | 語根検索レイヤー | 関連する概念チップ | **HIGH** |
| `.layer-chip.morph` | 紫（#7b3d9a） | 語形フィルタ | 構文チップ | **MEDIUM** |

**最大の競合**: `prox`（橙）と Pattern Search の誤関連。
**次点**: `lemma`（青）と 関連する概念チップの誤関連。

しかし `.lemma` が「関連する概念」に使われることは、「これは概念（Lemma 単位）の探索」という解釈も可能で許容範囲内。
`.prox`（近接）が「パターン」に使われることは意味上の矛盾であり、より問題が大きい。

### 4-3. Search Result Badge との混同

Hit Card の `.ht-badge`（lemma/phrase/prox/morph）と Concept Insight の `.layer-chip`（lemma/phrase/prox/morph）は同じ色体系を使用している。  
ただし:
- `.ht-badge` はテキスト上部のバッジ形式（小さい・uppercase）
- `.layer-chip` はクリック可能なチップ形式（大きい・丸い）

形状が異なるため「混同」は起きにくいが、同じ意味色が異なる文脈で使われていることに変わりはない。

---

## 5. Mobile Audit（390px）

### 5-1. Concept Insight の縦幅問題

| ケース | 推定縦幅 | 問題 |
|-------|---------|------|
| 概念あり・関連少（例：「十字架」 related 3件） | ~120px | 問題なし |
| 概念あり・関連多（例：「愛」 related 12件以上） | ~200px+ | Hit Cards が画面外に押し出される |
| 概念あり・パターンあり（さらに詳しく展開時） | ~350px+ | スクロールが深くなる |

Mobile CSS（≤680px）での変更:
- `#concept-insight`: `padding: var(--space-sm)` = 8px（削減効果あり）
- Hit Card の `padding: 14px 14px`（小さくなる）
- **Concept Insight の max-height や折りたたみは設定なし**

→ 関連する概念が多い場合、初心者が Hit Cards に到達するまでに長いスクロールが必要になる。

### 5-2. Hit Card との境界明確性

| 状態 | 境界の明確さ | 理由 |
|------|-----------|------|
| Concept Insight（グレー bg）→ Hit Cards（白 bg） | **△ 弱め** | グレーと白の差は微差（#f5f5f7 vs #ffffff）。モバイルの明暗環境によっては区別しにくい |
| margin-bottom: 16px（Concept Insight）→ Hit Cards | ✓ 適切 | 16px の余白で視覚的な切れ目がある |
| border なし（間） | △ | Hit Cards の境界として `border-bottom` がないため、スクロール中の「区切り」が弱い |

### 5-3. Related Chip の過密度

Mobile では `.layer-chips` が `flex-wrap: wrap` で折り返す。

- 「愛」の関連概念は 8件（_REL_FOLD 以内）が即表示。1行に 3〜4 chip が入り折り返しは2〜3行程度。
- Concept Insight の `.ci-chips` は `justify-content: flex-start` で左詰め（Empty State は `center` と異なる）。
- 折り返しは自然に機能し、過密にはなりにくい。

**Mobile 評価**: 概念チップ密度は許容範囲。ただし Concept Insight の高さ上限なし問題（5-1）は課題。

---

## 6. 改善案

### 案 A — `.ci-section-title` に uppercase + letter-spacing 追加（UX-9-3）

**変更内容**:

```css
/* 変更前 */
.ci-section-title {
    font-size: var(--text-caption);
    color: var(--text-sub);
    margin-bottom: var(--space-xs);
}

/* 変更後（案）*/
.ci-section-title {
    font-size: var(--text-caption);
    font-weight: 700;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--text-sub);
    opacity: 0.6;
    margin-bottom: var(--space-xs);
}
```

| 属性 | 変更ファイル | 変更量 | リスク | 推奨度 |
|------|-----------|--------|--------|-------|
| CSS のみ | search-tool.html | 4行追加 | Low | ★★★★★ |

**効果**: Concept Insight 内の見出しが他のセクション見出しと視覚的に統一。「関連するギリシャ語」などが section label として認識できる。

---

### 案 B — Concept Insight に識別バッジを追加

**変更内容**: `「愛」について` タイトルの前に小さな識別ラベルを追加

```html
<!-- 変更後案（JS 生成部分） -->
el.innerHTML = 
    `<div class="ci-kind-label">テーマ情報</div>` +
    `<div class="ci-concept-title">「X」について</div>` + body;
```

```css
.ci-kind-label {
    font-size: 0.6rem; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--accent); opacity: 0.7;
    margin-bottom: var(--space-xs);
}
```

| 属性 | 変更ファイル | 変更量 | リスク | 推奨度 |
|------|-----------|--------|--------|-------|
| CSS 5行 + JS 1行 | search-tool.html | 低 | Low-Medium | ★★★☆☆ |

**効果**: 初見ユーザーが Concept Insight を「概念情報のカード」として認識しやすくなる。「テーマ情報」ラベルで「検索結果ではない」ことを明示。  
**注意**: 「テーマ情報」という表現が適切かどうかは議論の余地あり。「概念マップ」「テーマガイド」なども候補。

---

### 案 C — Pattern チップ色を `prox` から独立させる（UX-9-7）

**変更内容**: JS line 2559 のチップクラスを変更

```js
// 変更前
`<span class="layer-chip prox" onclick="runPatternSearch(${p.i})">`

// 変更後（案）
`<span class="layer-chip pattern" onclick="runPatternSearch(${p.i})">`
```

```css
/* 追加 CSS */
.layer-chip.pattern {
    background: var(--accent-light);
    color: var(--accent);
    border-color: var(--accent-mid);
}
```

| 属性 | 変更ファイル | 変更量 | リスク | 推奨度 |
|------|-----------|--------|--------|-------|
| CSS 4行 + JS 2箇所（CI + Empty State） | search-tool.html | 低 | Medium | ★★★★☆ |

**効果**: パターン検索チップが「近接検索」と視覚的に混同されなくなる。  
**注意**: Empty State の Pattern chips（`_renderPatternChips`）も同時変更が必要。

---

### 案 D — 関連する概念 → 関連するギリシャ語 の順序変更

**変更内容**: `_renderConceptInsight` の HTML 生成順序

```js
// 変更前
const body = lexHtml + sec('関連する概念', relHtml) + advancedHtml;

// 変更後
const body = sec('関連する概念', relHtml) + lexHtml + advancedHtml;
```

| 属性 | 変更ファイル | 変更量 | リスク | 推奨度 |
|------|-----------|--------|--------|-------|
| JS 1行 | search-tool.html | 最小 | Low | ★★★☆☆ |

**効果**: 初心者が最初に目にするのが「日本語テーマのチップ列」になる。ギリシャ語行は後に続く（上級者向け）。  
**注意**: これは情報設計の優先度変更。「関連するギリシャ語が先の方が良い」という設計意図がある場合は変更しない。

---

### 案 E — Mobile 向け Concept Insight に `max-height` + overflow 制御

**変更内容**: Mobile CSS に追加

```css
@media (max-width: 680px) {
    #concept-insight {
        padding: var(--space-sm);
        max-height: 40vh;
        overflow-y: auto;
    }
}
```

| 属性 | 変更ファイル | 変更量 | リスク | 推奨度 |
|------|-----------|--------|--------|-------|
| CSS 3行 | search-tool.html | 最小 | Medium | ★★★☆☆ |

**効果**: Mobile でのスクロールの深さを制限し、Hit Cards への到達を助ける。  
**注意**: `overflow-y: auto` 時に内部スクロールと外部スクロールが混在する可能性がある（iOS の特に惹起）。スクロール体験の QA が必要。

---

## 7. 監査サマリー

### GOOD（現状維持）

| 項目 | 評価理由 |
|------|---------|
| Concept Insight の位置（result-header 直後） | 検索結果より前に「テーマ地図」が現れる。IA として正しい |
| グレー背景（`--bg-panel`）でHit Cardと区別 | 微差ながら視覚的分離ができている |
| `ci-concept-title`（1rem, bold） | テーマ名が明確に表示される |
| 関連する概念の Progressive Disclosure（>8件折り） | 適切な情報制限 |
| さらに詳しく の折りたたみ | 高度機能を奥に置く設計は正しい |
| Mobile padding 削減（16px → 8px） | モバイルでの高さ節約 |

### IMPROVE（改善推奨）

| 問題 | 対応案 | 優先度 |
|------|--------|-------|
| `.ci-section-title` に uppercase + letter-spacing がない（UX-8 CI-01） | 案 A | ★★★★★ |
| Pattern チップが `prox` 色（意味的誤用） | 案 C | ★★★★☆ |
| `ci-lex-row` のクリック affordance がホバーのみ | UX-9-8 で対応 | ★★★★☆ |
| 初心者に「これは検索結果ではない」が伝わりにくい | 案 B | ★★★☆☆ |
| 関連するギリシャ語が先で初心者を intimidate | 案 D | ★★★☆☆ |

### BLOCK なし

現状でブロックとなる問題はない。機能は動作しており、Critical UX 障害はない。

---

## 8. 推奨実装順序

| 順番 | 案 | 内容 | リスク |
|-----|---|------|--------|
| 1 | **案 A** | `ci-section-title` を大文字見出しに統一（UX-9-3） | Low |
| 2 | **案 C** | Pattern chip を `prox` から独立（UX-9-7） | Medium |
| 3 | **案 D** | 内部順序を「概念先・ギリシャ語後」に変更 | Low |
| 4 | **案 B** | 識別バッジ追加 | Low-Medium |
| 5 | **案 E** | Mobile max-height 制御 | Medium |
