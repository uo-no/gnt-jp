# Task 50 — 検索画面 再設計仕様

> 対象: `public/search-tool.html`（Task 49 実装済み状態）
> フェーズ: 設計・監査のみ（実装・コミット・push 禁止）
> 調査日: 2026-10-16
> 基準スクリーンショット: iPhone 14 Pro (393×852)、iPhone SE (375×667)、デスクトップ (1280×900)

---

## 1. 現状の問題点（証拠つき）

### 1-1. ステータス情報がタイトルより上に表示される

**問題**: インデックス準備中のステータス行（`#idx-pill`）が、ページタイトル（`.s-search-title`）より上に配置されている。

**DOM証拠**（Playwright 計測、393px viewport）:

```
s-header:       top=0,   height=48   ← sticky ヘッダー
idx-pill:       top=64,  height=40   ← ステータス（タイトルより上）
s-search-title: top=104, height=28   ← 「聖書原文検索」タイトル
search-input:   top=144, height=56
s-mode-bar:     top=214, height=38
```

**コード原因**:

```css
/* search-tool.html 行257 */
.idx-status {
    height: 2.5rem;   /* 40px固定 — レイアウトジャンプ防止の意図 */
    …
}
```

DOM 順序（行1497–1502）:
```html
<div class="s-search-block">
    <div class="idx-status" id="idx-pill">…</div>          ← 先に出る
    <div class="s-search-title …">聖書原文検索</div>        ← 後から出る
```

**影響**: 最初にユーザーが見るのはステータス情報であり、検索欄への視線誘導が遅れる。「準備中」で検索不可のように見える。

---

### 1-2. 「形が変わっても探す」が検索欄と競合している

**問題**: lemma トグルのチェックボックスが旧 `--lemma` 色（#1a5fa8、鮮明な青）で塗りつぶされており、検索入力欄と同程度の存在感を持っている。

**コード原因**:

```css
/* 行401 — 旧レイヤーカラーを引き続き使用 */
.layer-row.active-lemma .layer-check {
    background: var(--lemma);   /* #1a5fa8 — 鮮明な青 */
    border-color: var(--lemma);
    color: #fff;
}
```

Phase E の設計方針（design-spec.md）では `--s-accent`（#2e4d8a）に統一するとされていたが、実装時に旧 CSS が残っている。

**スクリーンショット証拠**: `01-iphone-lobby.png` — 青い塗りつぶしチェックボックスが検索入力欄のすぐ下にあり、検索入力と視覚的に競合している。

---

### 1-3. 詳細オプションと検索条件の階層が不明確

**問題**: モードバーに「形が変わっても探す」（検索条件 ON/OFF）と「詳細オプション」（パネル展開）が並列に並んでいる。前者は検索パラメータ、後者はUIコントロール操作であり役割が異なるが、視覚的に同一レベルに見える。

**コード**（行1520–1538）:
```html
<div class="s-mode-bar">
    <div class="layer-row active-lemma s-lemma-toggle" …>
        <div class="layer-check"></div>
        <div class="layer-name">形が変わっても探す</div>
    </div>
    <button class="s-advanced-toggle" …>
        <span class="s-adv-arrow">▾</span> 詳細オプション
    </button>
    <div id="sqs-filter-bar"></div>
</div>
```

**影響**: 「形が変わっても探す」が ON/OFF トグルなのか、「詳細オプション」を開くボタンなのか、最初の訪問者には判断しにくい。SQS フィルターピルも同行に流れ込み、モードバーが過密になる。

---

### 1-4. 履歴チップに「語根」「品詞」ラベルが繰り返される

**問題**: 検索履歴の各アイテムが `[語根] 愛` の形式で表示される。ラベルは検索レイヤー種別の補助情報だが、検索語そのものより先に目に入り、視線を取る。

**コード**（行3341–3357）:
```js
const _BADGE_JP_HIST = {lemma:'語根', phrase:'フレーズ', prox:'近接', morph:'品詞'};

// 毎回のレンダリングで badge が先に出る
item.innerHTML = `
    <div class="history-badges">${badges}</div>
    <span class="h-query">${_escH(query)}</span>`;
```

**スクリーンショット証拠**: `05-iphone-results-jp.png` — 「語根 愛」「語根 ἀγαπάω」という表示で、青い「語根」バッジが「愛」より先に目に入る。

---

### 1-5. 履歴の後に「今日のみことば」が表示され関係性が不明瞭

**問題**: ページ構造が以下の順序になっている。

```
s-search-block
  └ 検索入力 → モードバー → 履歴（検索後のみ表示）
s-advanced-panel（折りたたみ）
[横区切り線]
s-results
  └ Discovery Lobby（「今日のみことば」）
```

検索後の状態では「履歴 → 区切り線 → 今日のみことば」という順になる。
「今日のみことば」が検索結果でも履歴でもなく、検索画面のコンテンツとして唐突に現れる。

**影響**: 初めて訪問するユーザーは「今日のみことば」が何のために存在するか把握しにくい。
検索経験のあるユーザーは履歴と「今日のみことば」の間の視覚的区別が薄い。

---

### 1-6. Safari 下部操作バーの safe-area 未対応

**問題**: CSS に `env(safe-area-inset-bottom)` の参照がない。

**証拠**:
```
grep "safe-area\|env(" public/search-tool.html → 0件
```

iPhone Safari の Face ID 機種では下部に 34px のホームインジケーター領域がある。
現在の bottom padding:

```css
.s-results { padding: … … var(--s-sp-8); }   /* デスクトップ: 64px */
@media (max-width:700px) {
    .s-results { padding: … … var(--s-sp-7); } /* モバイル: 48px */
}
```

48px はホームインジケーター 34px を越えているため通常は問題ないが、
Safari のフルスクリーン時（下部バーが自動で隠れる状態から戻ったとき）に
最下部コンテンツが操作バーに隠れる可能性がある。

**確認が必要**: 実機での検証が必要（ブラウザシミュレーターでは再現しない）。

---

### 1-7. 画面全体の優先順位の曖昧さ

上記1–6の複合結果として、ユーザーの視線が次の順に誘導される:

```
現状: ステータス → タイトル → 検索欄 → 「形が変わっても探す」(強調) → 詳細オプション
理想: 検索欄 → 検索条件（控えめ） → 結果 / 提案
```

「検索する」という主動作より「システム状態の確認」「条件の設定」が先に来ている。

---

## 2. 維持する機能の一覧（変更対象外）

Task 49 で実装されたものも含む。

| 機能 | DOM ID / クラス | 状態管理 |
|------|----------------|---------|
| 統合検索入力 | `#unified-search-input` | — |
| サジェストドロップダウン | `#suggest-dropdown` | JS class `open` |
| lemma レイヤー | `#layer-lemma` `.active-lemma` | `_layers.lemma` |
| proximity レイヤー | `#layer-prox` / `#prox-sub` | `_layers.prox` / `currentDist` |
| フレーズレイヤー | `#layer-phrase` | `_layers.phrase` |
| morph レイヤー / チップ | `#layer-morph` / `#morph-sub` | `_layers.morph` / `_morphSel` |
| SQS フィルターバー | `#sqs-filter-bar` | `_sqsFilters` |
| 検索履歴 | `#history-block` / `#history-list` | localStorage |
| Discovery Lobby（今日のみことば） | `#discovery-lobby` | JS display |
| 結果ヘッダー | `#result-header` / `#hits-count` | — |
| Concept Insight | `#concept-insight` | 発火条件 JS |
| ヒットリスト | `#hits-list` | JS innerHTML |
| 書物分布 | `#dist-panel` | JS display |
| Abbott-Smith 辞書モーダル | `#as-modal` | `open` class |
| 聖書リーダーへの遷移 | `index.html?book=…&ch=…&verse=…` | URL |
| `_searchGoBack()` | `.s-header` 内ボタン | 履歴管理 |
| URL パラメータ復元 | `?lemma=` / `?word=` / `?word1=&word2=` | `initFromUrl()` |
| タスク別スニペット表示 | `card.dataset.qtype` | `detectQueryType()` |
| LXX バックグラウンド構築 | `IDX.l3Ready` | — |

---

## 3. 設計案の比較（A / B / C）

### 案A — 検索中心型

**発想**: 検索欄を最も重要な唯一の要素とし、その周辺をすべて控えめにする。
検索が「今何をするか」を示す唯一のシグナルにする。

**情報構造**:
```
1. [スティッキーヘッダー] ‹ 聖書に戻る  [ステータスドット]  [共有]
────────────────────────────────────────────────────────
2. [検索入力欄: 大、高さ52px]
3. [モードバー: 語根 ✓  |  詳細 ▾  |  アクティブ条件ピル]
────────────────────────────────────────────────────────
4. [履歴: 最近の検索 — テキストのみ、バッジなし]
   または
   [Discovery: 今日のみことば]
```

**変更点**:
- ステータス表示を **ヘッダー内の小ドット** に移動。高さを消費しない。
  ```
  ‹ 聖書に戻る    ◑         [🔗]
                  ↑ ローディング中のみ表示、完了で消える
  ```
- ページタイトル「聖書原文検索」を**削除**。URL や文脈から用途は明らか。
- 「形が変わっても探す」を `[✓ 語根]` の **小さなトグルチップ** に変更。
- 履歴バッジを廃止。検索語のみ表示。
- Discovery Lobby と履歴を **排他**表示: 履歴があれば履歴、なければ Lobby。

**モバイル ワイヤーフレーム**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
‹ 聖書に戻る             ◑ 準備中     [🔗]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                  ↕ 20px

┌────────────────────────────────────┐
│  愛・信じる・ἀγαπάω…          🔍  │  ← height 52px
└────────────────────────────────────┘
[✓ 語根]  [▸ 詳細]  [近接 ±5 ×]      ← 小さなチップ列

                  ↕ 12px
────────────────────────────────────
最近の検索
  愛       ἀγαπάω       救い          ← テキストのみ

  または（履歴なし時）

今日のみことば
┌────────────────────────────────────┐
│  ヤコブ 3:17 の言葉…              │
│  [知恵]  [平和]                    │
└────────────────────────────────────┘
```

**デスクトップ ワイヤーフレーム**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
‹ 聖書に戻る          ◑              　          [🔗 共有]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                      ↕ 48px

  ┌─────────────────────────────────────────────────┐
  │  愛・信じる・ἀγαπάω…                       🔍  │  ← height 56px
  └─────────────────────────────────────────────────┘
  [✓ 語根]  [▸ 詳細オプション]  [近接 ±5 ×]

                      ↕ 24px
  ─────────────────────────────────────────────────

  最近の検索
    愛   ἀγαπάω   救い   πίστις   信じる
```

**メリット**:
- 検索欄が唯一の主役。迷いが生じない。
- ページタイトルの削除で縦スペースを回収できる（モバイルで約28px）。
- 履歴と Discovery Lobby が排他表示なので両方が同時に見えない。

**デメリット**:
- ページタイトル削除により、初めての訪問者がここが「検索ページ」であることを
  認識するのが遅れる可能性（ただし検索入力欄のプレースホルダーで補完可能）。
- ステータスドットのみでは「インデックスが準備中」という情報が伝わりにくい
  （ドット hover/tap で詳細を表示する必要がある）。

**既存機能への影響**:
- `idx-pill` DOM は維持。CSS で `position: absolute` → ヘッダー内に移動。
- `.s-search-title` を `display: none` にするか削除。JS での参照を確認。
- 履歴の `h-badge` を `display: none`。JS ロジック変更なし。

---

### 案B — 読書と検索の統合型

**発想**: 「聖書を読む」体験の延長として検索を位置づける。
検索ページは読書の中断ではなく、読書を深める経路として設計する。
「今日のみことば」と検索履歴は、どちらも「聖書に向かう入口」として統一的に扱う。

**情報構造**:
```
1. [スティッキーヘッダー] ‹ 聖書に戻る          [🔗]
────────────────────────────────────────────────────────
2. [入口セクション: 今日のみことば + 最近の検索]
   ← 読書と検索の接続点。検索前の「始め方」提示
────────────────────────────────────────────────────────
3. [検索入力欄]
4. [モードバー + ステータス（入力欄下に小文字で）]
────────────────────────────────────────────────────────
5. [結果エリア]
```

**変更点**:
- ページのトップに **「入口セクション」** を設置する（上位構造の変更）。
  - 左: 「今日のみことば」カード（コンパクト版）
  - 右（または下）: 最近の検索（履歴）
  - バッジなし。両方が「次の読書の出発点」として視覚的に統一される。
- 検索入力欄は入口セクションの下に配置。
  「今日のみことばを読んで興味を持った語を入力する」という流れを示す。
- ステータスは検索入力欄の下に 1 行で表示（高さを取らない）:
  ```
  ✓ 新約聖書 検索可 · 旧約ギリシア語訳 準備中
  ```
- 「形が変わっても探す」は入力欄のラベル付近に `toggle` スタイルで配置（小さく）。

**モバイル ワイヤーフレーム**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
‹ 聖書に戻る                           [🔗]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【入口セクション】━━━━━━━━━━━━━━━━━━━━━━━━━
今日のみことば              最近の検索
─────────────────           ────────────
ヤコブ 3:17                  愛
しかし上から来る             ἀγαπάω
知恵は…                     救い
[知恵] [平和]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

聖書原文検索
┌────────────────────────────────────┐
│  愛・信じる・ἀγαπάω…          🔍  │
└────────────────────────────────────┘
✓ 語根検索  · 詳細 ▾
✓ 新約聖書   ◑ LXX 準備中
```

**結果状態（モバイル）**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
‹ 聖書に戻る                           [🔗]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────┐
│  愛                            × 🔍│
└────────────────────────────────────┘
✓ 語根検索  · 詳細 ▾

──────────────────────────────────────
「愛」 語根 459件（NT 369 + LXX 90）

マタイ 5:43          語根
『隣人を愛し、敵を憎め』と言われていた…
                          本文で読む →
```

**デスクトップ ワイヤーフレーム**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
‹ 聖書に戻る                                        [🔗 共有]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ┌────────────────────────────┬──────────────────────┐
    │ 今日のみことば             │  最近の検索          │
    │                            │  愛   ἀγαπάω   救い  │
    │ ヤコブ 3:17                │                      │
    │ しかし上から来る知恵は…   │                      │
    │ [知恵]  [平和]             │                      │
    └────────────────────────────┴──────────────────────┘

    聖書原文検索
    ┌──────────────────────────────────────────────────┐
    │  愛・信じる・ἀγαπάω…                        🔍  │
    └──────────────────────────────────────────────────┘
    ✓ 語根検索   ▸ 詳細オプション   ✓ NT   ◑ LXX 準備中
```

**メリット**:
- 「今日のみことば」と「最近の検索」が同一セクションに並ぶことで、
  どちらも「出発点の提案」として意味が統一される。
- ユーザーが読書から来た場合、自然な継続感がある。
- ステータスが検索入力の下にあるため、「まず検索欄が目に入る」順序が保たれる。

**デメリット**:
- 入口セクションを追加することで、初期状態の縦スペースが増加する。
- 最近の検索がない状態では入口セクションが「今日のみことば」のみになり、
  「これは聖書アプリのメインページと何が違うのか？」と混同される可能性。
- DOM 構造の変更範囲が広い（入口セクションを `s-results` より前に置く必要がある）。

**既存機能への影響**:
- `#discovery-lobby` の位置を変更（`s-results` から `s-search-block` の上、または新規 `s-entry` セクション）。
- 履歴チップを `history-list` の改修（バッジ非表示、コンパクト表示）。
- JS の `_renderEmptyStateHistory()` と `_renderHistory()` の統合または整理。

---

### 案C — ミニマルな道具型

**発想**: 装飾・説明・補助情報を最小限にし、道具としての透明性を高める。
使い方を説明しない。検索語を入れて返ってくる結果を見るだけ。
聖書の語句と向き合う時間を最大化する。

**情報構造**:
```
1. [スティッキーヘッダー] ‹ 聖書に戻る         [🔗]
────────────────────────────────────────────────
2. [検索入力欄]
3. [最小限のコントロール行: 語根 ✓  詳細 ▾]
────────────────────────────────────────────────
4. [結果エリア]
   （履歴あり時: 入力欄下に極小テキスト）
   （Lobby: 最低限のカード、タイトルなし）
```

**変更点**:
- ページタイトル「聖書原文検索」を**削除**（案A と同様）。
- ステータス「NT検索できます / LXX準備中」を **完全に非表示**、
  または `aria-live` で音声のみ（視覚的に存在感ゼロ）。
  準備完了後のフェードアウトのみ維持。
  → ユーザーが検索を試みたとき、まだ準備中であれば入力欄下に
  `「ギリシャ語検索は準備中です」` の一行だけ表示する。
- 「形が変わっても探す」を `語根 ✓` の 3 文字表記に圧縮（トグル機能は維持）。
- 「詳細オプション」→ `詳細 ▾` に短縮。
- 履歴: バッジ完全廃止。検索語のみを小さいフォントで1行に並べる。
  `最近: 愛  ἀγαπάω  救い` のような表記。
- Discovery Lobby: タイトル「今日のみことば」と日付を削除。
  聖書テキストカードと「この言葉から探す」チップのみ残す。

**モバイル ワイヤーフレーム（空状態）**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
‹ 聖書に戻る                           [🔗]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              ↕ 16px

┌────────────────────────────────────┐
│  愛・信じる・ἀγαπάω…          🔍  │
└────────────────────────────────────┘
語根 ✓   詳細 ▾

最近: 愛  ἀγαπάω  救い  ──────────────

              ↕ 24px

┌────────────────────────────────────┐
│  しかし上から来る知恵は、まず純粋  │
│  で、次に平和的で…                │
│  ヤコブ 3:17                      │
│  [知恵]  [平和]                   │
└────────────────────────────────────┘
```

**モバイル ワイヤーフレーム（結果状態）**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
‹ 聖書に戻る                           [🔗]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────┐
│  愛                            × 🔍│
└────────────────────────────────────┘
語根 ✓   詳細 ▾

──────────────────────────────────────
愛   459件  語根

マタイ 5:43
『隣人を愛し、敵を憎め』と言われていた
ことは、あなたがたの聞いているところ…
 ▸ ギリシャ語                  本文で読む →

──────────────────────────────────────
マタイ 5:44
```

**デスクトップ ワイヤーフレーム**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
‹ 聖書に戻る                                        [🔗 共有]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌──────────────────────────────────────────────────┐
  │  愛・信じる・ἀγαπάω…                        🔍  │
  └──────────────────────────────────────────────────┘
  語根 ✓   詳細 ▾
  最近: 愛  ἀγαπάω  救い

  ──────────────────────────────────────────────────

  ┌─────────────────────────────────────┐
  │ しかし上から来る知恵は、まず純粋で…  │
  │ ヤコブ 3:17                          │
  │ [知恵]  [平和]                       │
  └─────────────────────────────────────┘
                   max-width: 480px, centered
```

**メリット**:
- 最小限の視覚要素。「道具として透明」なデザイン。
- 縦スペースが最も小さく、画面の多くを聖書テキストに使える。
- タイトル・ステータスの問題が根本解決（存在しない）。

**デメリット**:
- 初めて訪問するユーザーへの文脈提供がない。何ができるか分からない。
- ステータスの完全非表示は「検索できない状態でユーザーが検索しようとする」
  エラー体験につながる可能性がある。
- 「今日のみことば」のタイトル・日付削除は Discovery Lobby の
  アイデンティティを失わせる（なぜこの聖句が出ているか不明）。

**既存機能への影響**:
- `#idx-pill` を JS でのみ管理（ready 前は `aria-live` で検知、視覚は非表示）。
- `.s-search-title` を削除（JS での参照を確認: `_returnToLobby()` のボタン先のみ）。
- `.h-badge` を `display: none`。
- Discovery Lobby の `.discovery-title` / `.discovery-date` を `display: none`。

---

## 4. 案の比較表

| 評価基準 | 案A 検索中心型 | 案B 読書統合型 | 案C ミニマル道具型 |
|---------|-------------|-------------|-----------------|
| 検索欄への到達速度 | ◎ 最速 | ○ 入口セクションの下 | ◎ 最速 |
| 初回訪問者の文脈理解 | △ タイトルなし | ◎ 入口で提示 | ✕ 文脈なし |
| インデックス状態の伝達 | ○ ドット表示 | ◎ 入力欄下に明示 | △ 非表示（エラー時のみ表示） |
| 履歴の読みやすさ | ◎ テキストのみ | ○ テキストのみ | ◎ 1行インライン |
| 今日のみことばの位置づけ | ○ 履歴と排他表示 | ◎ 入口として統合 | △ タイトル削除でやや曖昧 |
| 縦スペース効率 | ◎ タイトル削除 | △ 入口セクション追加 | ◎ 最小 |
| DOM変更の範囲 | 小〜中 | 中〜大 | 小 |
| First Principleへの貢献 | ○ 検索を中心に | ◎ 読書と接続 | ○ 道具として透明 |
| Safari safe area | 全案で要追加（CSS 1行） |  |  |

---

## 5. 推薦案

**推薦: 案A（検索中心型）をベースに、案Bから「ステータスの明示」を取り込んだ複合案**

理由:

**1. First Principle との整合**
「聖書がよく分かった」体験を支えるには、検索行動を最速で開始できる状態が必要。
案Aの「検索欄が唯一の主役」という構造はこれに最も直接的に応える。

**2. 既存実装との連続性**
Task 49（Phase E）で単一カラム + 720px センタリング + `--s-*` 変数系を確立した。
案Aはこの基盤を最大限活かしながら、問題点（ステータス位置・lemma 色・履歴バッジ）を解消する変更量が最小の案。

**3. 案Bの長所を部分採用**
案Bの「入口セクションで今日のみことばと履歴を統合」は発想として優れているが、
DOM の変更量が大きく、現時点でのリスクが高い。
ただし、ステータスの「入力欄下に 1 行で表示」（案B）は案Aに取り込める。

**4. 案Cの却下理由**
ステータスの完全非表示は「準備中に検索しても何も出ない」という体験を作りうる。
「今日のみことば」のタイトル削除はコンテンツの文脈を失わせる。これらはリスクが高い。

---

## 6. 推薦案の詳細設計

### 6-1. 構造変更（HTML）

**ステータス移動**:

現行:
```html
<div class="s-search-block">
    <div class="idx-status" id="idx-pill">…</div>      ← タイトルより上
    <div class="s-search-title">聖書原文検索</div>
    <input id="unified-search-input" …>
```

変更後:
```html
<div class="s-search-block">
    <div class="s-search-title">聖書原文検索</div>
    <div class="search-input-wrap">
        <input id="unified-search-input" …>
    </div>
    <div class="s-index-status" id="idx-pill">…</div>  ← 入力欄の下
    <div class="s-mode-bar">…</div>
```

CSS:
```css
.s-index-status {
    font-size: var(--s-ts-xs);
    color: var(--s-text-hint);
    margin-top: var(--s-sp-1);
    min-height: 0;           /* 完了後 display:none で高さゼロ */
    transition: opacity 1.2s ease;
}
.s-index-status.done { display: none; }  /* フェードアウト後に消す */
```

→ タイトルが最初に見える。入力欄に集中できる。ステータスは目の端で確認できる。

**履歴バッジの非表示**:

CSS追加のみで対応（JS変更なし）:
```css
.h-badge { display: none; }
.history-item { justify-content: flex-start; }
```

**lemma チェックボックスの色統一**:

```css
/* 旧 --lemma 色を --s-accent に統一 */
.layer-row.active-lemma .layer-check {
    background: var(--s-accent);
    border-color: var(--s-accent);
    color: #fff;
}
```

**「形が変わっても探す」のコンパクト化**（任意、後続 Task）:
現行の `.layer-row active-lemma s-lemma-toggle` を
`[✓ 語根]` のトグルチップに変更することはHTMLの変更が必要。
今 Phase では CSS レベルの調整に留める。

### 6-2. Safari safe area 対応

```css
/* .s-results への追加 */
.s-results {
    padding-bottom: calc(var(--s-sp-8) + env(safe-area-inset-bottom, 0px));
}
@media (max-width: 700px) {
    .s-results {
        padding-bottom: calc(var(--s-sp-7) + env(safe-area-inset-bottom, 0px));
    }
}
```

### 6-3. Discovery Lobby と履歴の分離

現行の DOM 順序（変更なし。CSS だけで対応）:

```
s-search-block: [タイトル → 入力 → ステータス → モードバー → 履歴]
s-advanced-panel
s-search-divider
s-results: [空状態 → Discovery Lobby | 結果]
```

問題: 履歴が表示中に Discovery Lobby も見えると、2セクションが並ぶ。
解決案（CSS）: 履歴表示中は Discovery Lobby の opacity/display を切り替える。

```js
// 既存の _renderHistory() の末尾に追加
const lobby = document.getElementById('discovery-lobby');
if (lobby) {
    lobby.style.display = _history.length > 0 ? 'none' : '';
}
```

または CSS で:
```css
/* history-block が visible の場合は lobby を非表示 */
/* JSで .has-history クラスを body に付けて制御 */
body.has-history #discovery-lobby { display: none; }
```

### 6-4. デスクトップ レスポンシブ確認

変更後の DOM 順序でも 700px ブレークポイントの挙動を確認する。

```css
/* 現行 — 維持 */
@media (max-width: 700px) {
    .s-search-block { padding: var(--s-sp-4) var(--s-sp-4) var(--s-sp-3); }
    .s-search-title { font-size: var(--s-ts-lg); text-align: left; }
    .s-results { padding: var(--s-sp-4) var(--s-sp-4) var(--s-sp-7); }
}
```

ステータスが入力欄の下に移動することでモバイルでの縦スペースに変化なし（高さを取らない設計のため）。

---

## 7. 推薦案の変更種別と影響範囲

| 変更 | 変更種別 | ファイル | リスク |
|------|---------|---------|--------|
| idx-pill を入力欄の下に移動 | UX | search-tool.html HTML | 低（DOM 移動のみ） |
| `.s-index-status.done { display:none }` | UX | search-tool.html CSS | 低 |
| lemma チェックの色を `--s-accent` に統一 | CORRECTNESS | search-tool.html CSS | 低 |
| `h-badge` を `display: none` | UX | search-tool.html CSS | 低 |
| Safari safe area `env()` 追加 | BUG | search-tool.html CSS | 低（フォールバックあり） |
| 履歴表示中に Discovery Lobby 非表示 | UX | search-tool.html JS | 低〜中 |

---

## 8. 確定した設計判断

*（2026-10-16 確定）*

### Q1 → CONFIRMED: ページタイトル「聖書原文検索」

**決定**: 削除せず、小さなページラベルとして維持する。検索入力欄が画面の主役。

- フォントサイズ・opacity を抑えて存在感を控えめにする（CSS 調整）。
- `onclick="_returnToLobby()"` の機能は維持する（入力クリア・ロビー復帰に使用）。
- HTML の `.s-search-title` 要素は残す。

### Q2 → CONFIRMED: Discovery Lobby と履歴の表示制御

**決定**: 検索操作中（履歴パネル表示中・候補パネル表示中）は Discovery Lobby を非表示にする。

条件:
- `#history-block` が visible （`_history.length > 0`）→ `#discovery-lobby.hidden = true`
- `#suggest-dropdown` が open → lobby は DOM 上で覆われるため追加制御不要
- 検索後: `#state-empty` が hidden なため lobby は自然に非表示

`_returnToLobby()` 後の挙動: 履歴がある場合は Lobby を hidden のまま維持する（詳細は T6）。

### Q3 → CONFIRMED: 「形が変わっても探す」のラベルと色

**決定**: ラベル文言は変更しない。色のみ変更する。

- `--lemma` (`#1a5fa8`) → `--s-accent` (`#2e4d8a`) に変更。
- 変更箇所: `.layer-row.active-lemma .layer-check` の `background` / `border-color` のみ。
- 他の `--lemma` 参照（検索結果ハイライト・バッジ・SQS チップ）は変更しない。

---

## 9. T1–T6 副作用分析と設計仕様

### T1: idx-pill を入力欄の下に DOM 移動

**副作用分析 — CONFIRMED: 副作用なし**

- `_watchIndexProgress()`（line 3152）は `getElementById('idx-dot'/'idx-label'/'idx-pill')` を使用。ID 参照のため DOM 位置変更の影響なし。
- `_returnToLobby()` は JS から `idx-pill` を参照しない。
- `.s-search-title` の `onclick="_returnToLobby()"` は HTML 属性で定義済み。DOM 移動不要。

**設計仕様 — HTML 変更**:

```html
<!-- 変更前 -->
<div class="s-search-block">
    <div class="idx-status" id="idx-pill">…</div>        ← タイトルより上
    <div class="s-search-title …">聖書原文検索</div>
    <div class="search-input-wrap">…</div>

<!-- 変更後 -->
<div class="s-search-block">
    <div class="s-search-title …">聖書原文検索</div>     ← 最初に表示
    <div class="search-input-wrap">…</div>
    <div class="idx-status" id="idx-pill">…</div>        ← 入力欄の下
```

CSS 追加（既存 `.s-search-block .idx-status` に `margin-top: 2px` を追記）。

---

### T2: idx-pill 完了後のレイアウトジャンプ防止

**副作用分析**:

T1 実装後、`idx-pill`（40px）は入力欄の下にある。現行は `height: 2.5rem` 固定のため、`display:none` 発火時に mode-bar と history-block が 40px 上方にジャンプする。

既存 JS（変更不要）:
```js
// _watchIndexProgress() — 既存実装
setTimeout(()=>{
    if(status) status.classList.add('done');               // +1000ms: opacity → 0
    setTimeout(()=>{ if(status) status.style.display='none'; },1300); // +2300ms: 最終除去
},1000);
```

**設計仕様 — CSS 変更**:

```css
/* 変更前 */
.idx-status {
    height: 2.5rem;   /* 固定高さ → ジャンプの原因 */
    transition: opacity 1.2s ease;
}
.idx-status.done { opacity: 0; pointer-events: none; }

/* 変更後 */
.idx-status {
    max-height: 2.5rem;   /* height → max-height */
    overflow: hidden;
    transition: opacity 1.2s ease, max-height 0.8s ease 0.4s;
}
.idx-status.done { opacity: 0; max-height: 0; pointer-events: none; }
```

opacity が先にフェードアウト（1.2s）、0.4s 遅延後に `max-height` が 0 に向けてアニメーション（0.8s）。
JS の `style.display='none'`（+2300ms）は最終クリーンアップとして維持。

**CONFIRMED: JS 変更なし。CSS のみで解決できる。**

---

### T3: lemma チェックボックスを `--s-accent` 色に統一

**副作用分析 — CONFIRMED: 他の lemma 色に影響なし**

`--lemma` の他の使用箇所（変更しない）:
- `.h-badge.lemma` — 履歴バッジ色（T4 で非表示になる）
- `.layer-chip.lemma` — SQS フィルターチップ
- `.r-badge.lemma` / `.ht-badge.lemma` — 結果カードバッジ
- `.hit-snippet .hl-lemma` — スニペット内ハイライト

変更範囲は 1 箇所のみ。

**設計仕様 — CSS 変更**:

```css
/* 変更: 行 401 */
.layer-row.active-lemma .layer-check {
    background:   var(--s-accent);   /* 旧: var(--lemma) = #1a5fa8 */
    border-color: var(--s-accent);
    color: #fff;
}
```

---

### T4: 履歴バッジを非表示にする

**副作用分析 — CONFIRMED: 副作用なし**

`.history-item` の HTML:
```html
<div class="history-item">
    <div class="history-badges">…<span class="h-badge lemma">語根</span>…</div>
    <span class="h-query">愛</span>
</div>
```

クリックハンドラーは `.history-item` に登録されており、CSS 変更の影響なし。
`.history-badges { display: none }` で空コンテナごと隠すのが最適。

**設計仕様 — CSS 追加**:

```css
.history-badges { display: none; }
```

---

### T5: Safari safe-area-inset-bottom 対応

**副作用分析 — CONFIRMED: 副作用なし**

`env(safe-area-inset-bottom, 0px)` フォールバックにより非 Safari ブラウザは 0px。

**設計仕様 — CSS 変更**:

```css
.s-results {
    padding-bottom: calc(var(--s-sp-8) + env(safe-area-inset-bottom, 0px));
}
@media (max-width: 700px) {
    .s-results {
        padding-bottom: calc(var(--s-sp-7) + env(safe-area-inset-bottom, 0px));
    }
}
```

---

### T6: Discovery Lobby を検索操作中に非表示にする

**副作用分析**:

`#discovery-lobby` の現行制御（JS）:
- `_returnToLobby()` → `discovery-lobby.hidden = false`（常に表示）
- `_showEmpty()` → `discovery-lobby.hidden = true`（エラー時）
- 検索後: `#state-empty` が非表示のため lobby は自然に隠れる

`#history-recent-section`（lobby 内のフォーカス時チップ）:
- T6 実装後、lobby 全体が hidden になるため chips が表示されなくなる。
- T7（フォーカス連動サジェスト）で `#suggest-dropdown` がその役割を引き継ぐ。
- **T6 と T7 は同一タスク内で実装を推奨**。T6 のみ実装すると空欄フォーカス時に何も表示されない。

**副作用（DEFERRED）**: `.s-search-title` の `title="今日のみことばへ戻る"` が、履歴あり時は実態と乖離する。title 文言の更新は後続タスクで対応。

**設計仕様 — JS 変更**:

```js
// _renderHistory() 末尾に追加
function _renderHistory(){
    const block = document.getElementById('history-block');
    const list  = document.getElementById('history-list');
    if(_history.length === 0){ block.style.display='none'; return; }
    block.style.display = '';
    list.innerHTML = '';
    // …既存 render ロジック（変更なし）…

    // [T6] 履歴表示中は Discovery Lobby を隠す
    const lobby = document.getElementById('discovery-lobby');
    if (lobby) lobby.hidden = true;
}

// _returnToLobby() の変更箇所
// 旧: document.getElementById('discovery-lobby').hidden = false;
// 新:
document.getElementById('discovery-lobby').hidden = _history.length > 0;
```

---

## 10. フォーカス連動サジェスト 状態遷移（T7）

### 10-1. 設計方針（確定）

- 空欄フォーカス時: 履歴を `#suggest-dropdown` に表示する
- 入力時: 日本語 → 語候補；ギリシャ語/Strong → 閉じる
- `#suggest-dropdown` で履歴・候補を統一管理する
- `#history-recent-section`（lobby 内チップ）は T7 後に不使用となる（削除は後続 Task）

### 10-2. データソース（CONFIRMED）

| 状態 | データソース | 関数 |
|------|------------|------|
| 空欄フォーカス | `_history` (localStorage) | `_renderHistoryInDropdown()` （新規） |
| 日本語入力 | `JP_PARTIAL_INDEX` / `tokenCache` | 既存 `_getSuggestions()` |
| ギリシャ語/Strong | データソースなし | — （ドロップダウンを閉じるのみ） |

### 10-3. 状態遷移表

| 現在の状態 | イベント | 条件 | 次の状態 | アクション |
|-----------|---------|------|---------|-----------|
| CLOSED | `focus` | `val === ''` かつ `_history.length > 0` | OPEN_HISTORY | `_renderHistoryInDropdown()` |
| CLOSED | `focus` | `val === ''` かつ `_history.length === 0` | CLOSED | 無操作 |
| CLOSED | `focus` | `val !== ''` かつ `qtype === 'japanese'` | OPEN_CANDIDATES | `_showSuggest(_getSuggestions(val))` |
| CLOSED | `focus` | `val !== ''` かつ `qtype !== 'japanese'` | CLOSED | 無操作 |
| OPEN_HISTORY / CLOSED | `input` | `val === ''` かつ `_history.length > 0` | OPEN_HISTORY | `_renderHistoryInDropdown()` |
| OPEN_HISTORY / CLOSED | `input` | `val === ''` かつ `_history.length === 0` | CLOSED | 閉じる |
| 任意 OPEN | `input` | `val !== ''` かつ `qtype === 'japanese'` | OPEN_CANDIDATES | `_showSuggest(_getSuggestions(val))` |
| 任意 OPEN | `input` | `val !== ''` かつ `qtype !== 'japanese'` | CLOSED | 閉じる |
| 任意 OPEN | `blur` | — | CLOSED | 150ms 後に閉じる（既存） |
| 任意 OPEN | `keydown[Escape]` | — | CLOSED | 閉じる（既存） |
| 任意 OPEN | `keydown[Enter]` | — | CLOSED | 閉じる + `unifiedSearch()` （既存） |
| OPEN_HISTORY | item `mousedown` | 履歴アイテム | CLOSED | `input.value = query`; レイヤー復元; `unifiedSearch()` |
| OPEN_CANDIDATES | item `mousedown` | 候補アイテム | CLOSED | `input.value = lemma`; `unifiedSearch()` （既存） |
| 任意 OPEN | 検索ボタン click | — | CLOSED | 閉じる + `unifiedSearch()` |

### 10-4. OPEN_HISTORY 時のドロップダウン HTML

```html
<div class="suggest-item suggest-history" data-query="愛">
    <span class="s-h-query">愛</span>
    <span class="s-h-layers">語根</span>   <!-- アクティブレイヤーを小さく表示 -->
</div>
```

既存 `.suggest-item` スタイルを継承。`suggest-history` クラスで視覚的に区別。

### 10-5. 実装変更点

```js
// 新規: _renderHistoryInDropdown()
function _renderHistoryInDropdown() {
    const dd = document.getElementById('suggest-dropdown');
    if (!dd) return;
    dd.innerHTML = '';
    if (_history.length === 0) { dd.classList.remove('open'); return; }
    _history.slice(0, 6).forEach(({query, layers}) => {
        const item = document.createElement('div');
        item.className = 'suggest-item suggest-history';
        item.dataset.query = query;
        const layerLabels = ['lemma','phrase','prox','morph']
            .filter(l => layers[l])
            .map(l => _BADGE_JP_HIST[l] || l).join(' · ');
        item.innerHTML = `<span class="s-h-query">${_escH(query)}</span>` +
            (layerLabels ? `<span class="s-h-layers">${_escH(layerLabels)}</span>` : '');
        item.addEventListener('mousedown', e => {
            e.preventDefault();
            const inp = document.getElementById('unified-search-input');
            inp.value = query;
            const h = _history.find(h => h.query === query);
            if (h) { Object.keys(_layers).forEach(k => { _layers[k] = !!h.layers[k]; _syncLayerUI(k); }); }
            dd.classList.remove('open');
            unifiedSearch();
        });
        dd.appendChild(item);
    });
    dd.classList.add('open');
}

// 変更: _initSuggest() の focus ハンドラー
inp.addEventListener('focus', () => {
    const val = inp.value.trim();
    if (!val) {
        _renderHistoryInDropdown();
    } else if (detectQueryType(val) === 'japanese') {
        _showSuggest(_getSuggestions(val));
    }
});

// 変更: _initSuggest() の input ハンドラー
inp.addEventListener('input', (e) => {
    if (e.isComposing) return;   // IME 確定前はスキップ（V-7）
    const val = inp.value.trim();
    if (!val) { _renderHistoryInDropdown(); return; }
    const qtype = detectQueryType(val);
    if (qtype !== 'japanese') {
        document.getElementById('suggest-dropdown').classList.remove('open');
        return;
    }
    _showSuggest(_getSuggestions(val));
});
```

### 10-6. IME 対応メモ（V-7）

`e.isComposing === true` 中は候補表示をスキップする（実装仕様に反映済み）。
実機 iPhone Safari での動作は V-7 で確認が必要。

---

## 11. 実装タスク一覧（更新版）

| # | タスク | 変更種別 | 副作用 | 受け入れ基準 |
|---|--------|---------|--------|------------|
| T1 | `idx-pill` を `.s-search-title` の下・入力欄の下に DOM 移動 | UX | なし | 393px viewport でタイトル → 入力 → ステータスの順に表示 |
| T2 | `height` → `max-height` 変換 + `.done { max-height: 0 }` トランジション | UX | なし | NT ready 後に空間がスムーズに折りたたまれ、ジャンプしない |
| T3 | `.active-lemma .layer-check` を `--s-accent` に変更 | CORRECTNESS | なし | チェックが `#2e4d8a` で表示される |
| T4 | `.history-badges { display: none }` | UX | なし | 履歴アイテムが検索語のみ表示になる |
| T5 | `.s-results` に `env(safe-area-inset-bottom)` 追加 | BUG | なし | Safari 実機で最終行が操作バーに隠れない（V-1） |
| T6 | `_renderHistory()` + `_returnToLobby()` に Lobby hide ロジック追加 | UX | `_returnToLobby()` title ズレ（DEFERRED） | 履歴あり時に Lobby 非表示、履歴なし時は Lobby 表示 |
| T7 | `_renderHistoryInDropdown()` 新規 + `_initSuggest()` の focus/input 更新 | FEATURE | `#history-recent-section` chips が不使用になる | 空欄フォーカス → 履歴ドロップダウン；JP 入力 → 語候補ドロップダウン |

**推奨実装順**: T1 → T2 → T3 → T4 → T5 → T6 + T7（同時）

---

## 12. ブラウザ検証が必要な項目（更新版）

| ID | 内容 | 確認方法 | 優先度 | 状態 |
|----|------|---------|--------|------|
| V-1 | Safari 下部バー重なり（T5） | **実機 iPhone Safari 必須** | HIGH | OPEN |
| V-2 | T2: max-height トランジションでジャンプなし | ページロード直後の画面録画 | MED | OPEN |
| V-3 | T6: 履歴ありで Lobby 非表示、履歴削除後に再表示 | Playwright + 実機 | MED | OPEN |
| V-4 | T1: idx-pill 移動後のフェードアウト動作（IDX.ready 後） | Playwright | MED | OPEN |
| V-5 | T6 後の `_returnToLobby()` title 文言ズレ | — | LOW | DEFERRED |
| V-6 | 690–710px viewport 付近のレイアウト | DevTools リサイズ | LOW | OPEN |
| V-7 | T7: iPhone Safari IME 変換中に候補表示が干渉しないか | 実機 iPhone | MED | OPEN |

**V-1 について**: Safari の safe-area-inset-bottom は Playwright iOS エミュレーションでは再現しない。`env(safe-area-inset-bottom)` を CSS に追加した上で実機確認を推薦する。

---

## 付録: 現行実装の DOM 計測（393px viewport）

```
要素                  top     height  display
──────────────────────────────────────────────
s-header              0       48      flex
idx-pill              64      40      flex      ← 問題1: タイトルより上
s-search-title        104     28      block
search-input          144     56      inline-block
s-mode-bar            214     38      flex
s-advanced-panel      264     0       grid（折りたたみ中）
s-results             265     575     block
discovery-lobby       314     445     flex
history-block         0       0       none（検索前）
mobile-fab            0       0       none（廃止）
```

lemma チェックボックス色: `var(--lemma)` = `#1a5fa8`（旧値）
`var(--s-accent)` = `#2e4d8a`（設計値、未適用）

safe-area-inset-bottom: **CSS に記述なし**

T1 実装後の予測 DOM 順序（393px viewport）:
```
要素                  top     display
──────────────────────────────────────
s-header              0       flex
s-search-title        64      block
search-input          100     inline-block
idx-pill              164     flex  → done 後 max-height: 0 へ
s-mode-bar            204     flex
```
