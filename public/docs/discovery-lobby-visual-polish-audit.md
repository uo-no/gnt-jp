# UX-10.7-A — Discovery Lobby Visual Polish Audit

**実施日**: 2026-07-14  
**種別**: 視覚品質監査（実装変更なし）  
**対象**: `search-tool.html` — `#discovery-lobby` および関連 CSS のみ  
**目的**: 「よく設計されたWebアプリ」から「静かな読書アプリの入口」へ

---

## 監査スコープと制約

| 対象 | 内容 |
|------|------|
| 対象 CSS | `#discovery-lobby`, `.discovery-title`, `.discovery-themes`, `.discovery-theme-chip`, `.discovery-theme-chip:hover`, `.state-empty` |
| 計測値ベース | Desktop 1280×800（Playwright 実測） |
| 変更禁止 | JS / 検索ロジック / renderDiscoveryLobby() / discovery-theme データ / DOM 構造 |
| 比較対象 | `.ex-chip`, `.unified-input`（既存コンポーネントの基準として）|

---

## 現状 CSS スナップショット

```css
#discovery-lobby {
    padding: 48px var(--space-md) var(--space-xl);  /* 48px 16px 32px */
    gap: var(--space-lg);  /* 24px */
}
.discovery-title {
    font-size: 1rem;
    font-weight: 400;
    color: var(--text-main);  /* #1d1d1f */
    line-height: 1.75;
}
.discovery-themes {
    gap: var(--space-md);  /* 16px */
}
.discovery-theme-chip {
    padding: 12px 0;
    border: none; background: transparent;
    font-size: var(--text-title);  /* 1.25rem / 20px */
    color: var(--text-main);  /* #1d1d1f */
    transition: opacity 0.15s, transform 0.15s;
}
.discovery-theme-chip:hover {
    opacity: 0.55;
    transform: translateY(-1px);
}
.state-empty {
    gap: 14px;  /* raw value */
    min-height: 60vh;
}
```

---

## §1 Typography Audit

### T-01 — `.discovery-title` font-size 生値

- **Severity**: IMPROVE
- **対象**: `.discovery-title` → `font-size`
- **現状**: `font-size: 1rem`（生値）
- **問題**: `--text-body-lg = 1rem` というトークンが存在するが未参照。機能的には同値だが、トークンを使用しない場合に将来のスケール変更が反映されない
- **推奨**: `font-size: var(--text-body-lg)`
- **変更量**: 1行

---

### T-02 — `.discovery-title` と `.discovery-theme-chip` が同色

- **Severity**: IMPROVE
- **対象**: `.discovery-title` → `color`
- **現状**: `color: var(--text-main)` = #1d1d1f（チップと同一色）
- **問題**: DS-DISCOVERY-01「テーマ語が主役」を色階層でも裏付けられていない。size 優位性（20px vs 16px）はあるが、color まで同値にすると「タイトルと語が等価」に見える。静かな読書アプリでは添え書き的な問いかけ文は控えめな色が適切
- **推奨**: `color: var(--text-sub)` = #6e6e73（opacity に頼らず色自体で脇役化）
- **変更量**: 1行

---

### T-03 — `.discovery-theme-chip` font-family がシステム UI フォント

- **Severity**: IMPROVE
- **対象**: `.discovery-theme-chip` → `font-family`
- **現状**: inherit（system UI sans-serif — macOS SF Pro / iOS San Francisco 等）
- **問題**: `.unified-input`（検索入力）と `.ex-chip`（例チップ）はともに `'Gentium Plus', serif` を使用する。フォントが既に読み込み済み。テーマ語（聖書語彙）がシステムフォントで表示されると「アプリのメニュー項目」に見え、聖書テキストの入口感が薄まる。同じ serif にすることで「scripture word として読むもの」の質感が生まれる
- **推奨**: `font-family: 'Gentium Plus', serif`
- **変更量**: 1行

---

### T-04 — `.discovery-title` line-height: 1.75

- **Severity**: GOOD ✅
- **対象**: `.discovery-title` → `line-height`
- **現状**: `line-height: 1.75`
- **評価**: 日本語 body text では 1.7-1.9 が読みやすさと静けさを両立する標準値。2行の問いかけ文（「今日はどの言葉から 聖書を読みますか」）に適切なブレスを与えている

---

### T-05 — `.discovery-theme-chip` font-weight: 400（暗黙 or 継承）

- **Severity**: IMPROVE (判断を要する)
- **対象**: `.discovery-theme-chip` → `font-weight`
- **現状**: 明示定義なし（継承 400 = regular）
- **問題**: 20px / 400 の日本語テキストは lightweight に見える可能性がある。hover 前から「選べる語」としての存在感を静かに示すには `500`（Medium）が middle ground。ただし font-weight 増加は「ボタン感」も増すため DS-DISCOVERY-02 と要調整
- **推奨**: `font-weight: 500`（または明示的に `400` を記述して intent を文書化）
- **変更量**: 1行（設計判断が必要）

---

## §2 Color Audit

### C-01 — hover opacity: 0.55 がトークン外

- **Severity**: IMPROVE
- **対象**: `.discovery-theme-chip:hover` → `opacity`
- **現状**: `opacity: 0.55`（生値）
- **問題**: `--opacity-secondary = 0.6` というトークンが存在するが未参照。0.55 と 0.6 の視覚差は約 8% で肉眼判別困難だが、Design System の opacity スケールから逸脱している
- **推奨**: `opacity: var(--opacity-secondary)`
- **変更量**: 1行

---

### C-02 — chip background transparent、panel は #f5f5f7

- **Severity**: GOOD ✅
- **評価**: chip は transparent のため panel 背景（#f5f5f7）に対してフラットに乗る。装飾なし。DS-DISCOVERY-02「静かな入口」準拠

---

### C-03 — アクセント色の非使用

- **Severity**: GOOD ✅
- **評価**: `--accent = #5a6e82` は chip に使用されていない。静かなモノクロームの入口として正しい判断。accent 色を使う場合は hover 時の color 変化として検討できるが、現状でも十分

---

## §3 Spacing Audit

### S-01 — `#discovery-lobby` padding-top: 48px が生値

- **Severity**: IMPROVE (minor)
- **対象**: `#discovery-lobby` → `padding-top`
- **現状**: `48px`（トークンスケール 4/8/16/24/32 に存在しない）
- **問題**: Design System のスペーストークンスケールに 48px がない。機能は正しいが、token 外の raw value
- **推奨**: `calc(var(--space-xl) + var(--space-md))` = 48px（または `--space-2xl: 48px` をトークンに追加）
- **変更量**: 1行（機能変化なし）

---

### S-02 — chip[0] y=156 と sidebar 入力 y=143 の垂直差 13px

- **Severity**: IMPROVE
- **対象**: `#discovery-lobby` → `padding-top`
- **現状**: chip[0] が sidebar 検索入力より 13px 下（目標: 30px 以上）
- **問題**: デスクトップで最初のテーマ語と検索入力がほぼ同水平ラインに位置する。左から右へスキャンすると「入力欄 or 候補リスト」構造として読まれる可能性がある（DS-DISCOVERY-02 の「検索候補リストに見えない」要件への残存リスク）
- **推奨**: `padding-top: 64px`（chip[0] が y≈172 に移動し、入力との差 ≈ 29px に）
- **変更量**: 1行

---

### S-03 — `.state-empty` gap: 14px がトークン外（既存 R-01）

- **Severity**: IMPROVE
- **対象**: `.state-empty` → `gap`
- **現状**: `gap: 14px`（生値）
- **推奨**: `gap: var(--space-md)` = 16px
- **変更量**: 1行

---

### S-04 — `.discovery-themes` gap: var(--space-md) = 16px

- **Severity**: GOOD ✅
- **評価**: chip 間 16px + chip height 53px = 69px/chip リズム。トークン準拠。4チップで自然な縦列

---

### S-05 — title → themes gap: var(--space-lg) = 24px

- **Severity**: GOOD ✅
- **評価**: 実測 title bottom ≈ 132px → chip[0] top ≈ 156px = 24px。トークン準拠。問いかけとテーマ語の間のブレスが適切

---

## §4 Interaction Feel Audit

### I-01 — transition に ease-out トークン未使用（既存 R-02）

- **Severity**: IMPROVE
- **対象**: `.discovery-theme-chip` → `transition`
- **現状**: `transition: opacity 0.15s, transform 0.15s`（easing = CSS default ease）
- **問題**: `--transition-fast = 0.15s cubic-bezier(0.2,0.8,0.2,1)` トークンが存在。Design System の ease-out カーブは「始まりが素早く・終わりが滑らか」で、hover 離脱時の戻りが自然。デフォルト ease との差は hover-off 時に最も感じられる
- **推奨**: `transition: opacity var(--transition-fast), transform var(--transition-fast)`
- **変更量**: 1行

---

### I-02 — hover `transform: translateY(-1px)` がボタン感を与える

- **Severity**: IMPROVE
- **対象**: `.discovery-theme-chip:hover` → `transform`
- **現状**: hover 時に 1px 上昇
- **問題**: 微小な上昇アニメーションはクリッカブルボタンの慣例表現。DS-DISCOVERY-02「検索候補リストに見えない」設計において、chip が「選択可能なUI要素」として強く認識されるリスクがある。opacity フェードのみであれば「見える/消える」という静かな応答になるが、translateY は物理的な反応感（= ボタン感）を追加する
- **推奨**: `transform` を削除。hover 応答は opacity のみに絞る
- **変更量**: 1行（transform 削除）

---

### I-03 — :active 状態なし

- **Severity**: IMPROVE
- **対象**: `.discovery-theme-chip:active`（未定義）
- **現状**: :active CSS ルールなし
- **問題**: モバイルタップ時に視覚フィードバックがない。ユーザーがタップしたかどうかを認識できない。search 起動まで 100-300ms のラグがあるため特に重要
- **推奨**: `.discovery-theme-chip:active { opacity: var(--opacity-tertiary); }` = 0.3（深くフェードで「押した」感を示す）
- **変更量**: 3行（新規ルール追加）

---

### I-04 — 常時 affordance なし（既存 R-04）

- **Severity**: IMPROVE (要設計判断)
- **対象**: `.discovery-theme-chip`（static state）
- **現状**: border / background / shadow なし。cursor: pointer のみ
- **問題**: モバイル・タブレットではタップ可能性が視覚的に不明。T-05 の `font-weight: 500` が最もDS-DISCOVERY-02 と競合しない affordance 追加手段
- **推奨**: T-05 との統合（font-weight: 500）。または DS を維持しながら hover 前から subtle な `color: var(--accent)` へ変更（チップが accent色 #5a6e82 になる — ただし現在の黒との一貫性を崩す）
- **変更量**: 1行（font-weight 変更のみであれば）

---

## §5 Search Area Audit

### SA-01 — 検索入力 vs lobby の視覚的差別化

- **Severity**: GOOD ✅
- **評価**: `.unified-input`（border + background + serif 0.88rem + placeholder）vs `.discovery-theme-chip`（no border + transparent + 20px）。視覚差は十分。水平距離 ≈ 300px（sidebar 幅）でさらに分離されている

---

### SA-02 — chip が sidebar 入力と y 近接（S-02 参照）

- **Severity**: IMPROVE（S-02 と同一根拠）
- **参照**: S-02 を見よ

---

## §6 Apple-like Quality Check

### Q-01 — フォント family 整合性

- **Severity**: IMPROVE（T-03 と同一）
- **評価**: app 内でテキスト読書に関わる要素（検索入力・例チップ）は 'Gentium Plus' を使う。lobby chip のみ system font であることが family 非整合を生んでいる

---

### Q-02 — 装飾ゼロ

- **Severity**: GOOD ✅
- **評価**: shadow / border-radius / background / border なし。極めてクリーンな実装。Apple の "content over chrome" 原則に沿っている

---

### Q-03 — whitespace 充足感

- **Severity**: GOOD ✅
- **評価**: padding-top 48px + lobby gap 24px + chip gap 16px。4チップで lobby height ≈ 260px。panel 800px に対して上下に自然な余白がある。過密感なし

---

### Q-04 — 垂直 visual center

- **Severity**: IMPROVE (minor)
- **対象**: `#discovery-lobby`（位置）
- **現状**: lobby center y ≈ 238px、panel center y = 400px（170px 上方ずれ）
- **評価**: lobby が画面上部 30% 付近に集中。「腰を落ち着けた読書の入口」よりも「ナビゲーションバー」に近い印象。S-02 の padding-top 64px は 14px しか改善しないため、根本解決には `min-height: 80vh` 化 or `justify-content: center` の修正が必要。ただし現 DOM 構造では難易度が高く、本フェーズの推奨範囲外

---

## 総合評価

| 分類 | 件数 | 対象 ID |
|------|------|---------|
| GOOD | 8件 | T-04 / C-02 / C-03 / S-04 / S-05 / SA-01 / Q-02 / Q-03 |
| IMPROVE | 10件 | T-01 / T-02 / T-03 / T-05 / C-01 / S-01 / S-02 / S-03 / I-01 / I-02 / I-03 / I-04 / Q-04 |
| BLOCK | 0件 | — |

---

## Visual Polish Recommendation

### P0 — トークン整合（1-2行変更、機能変化なし）

| ID | 変更内容 | 効果 |
|----|---------|------|
| T-01 | `.discovery-title font-size: var(--text-body-lg)` | token 参照化 |
| C-01 | `.discovery-theme-chip:hover opacity: var(--opacity-secondary)` | token 参照化 |
| I-01 | `transition: opacity var(--transition-fast), transform var(--transition-fast)` | ease-out 追加 |
| S-03 | `.state-empty gap: var(--space-md)` | token 参照化 |

---

### P1 — 読書アプリ質感（各1-3行変更、体験が変わる）

| ID | 変更内容 | 効果 | 優先度理由 |
|----|---------|------|-----------|
| T-02 | `.discovery-title color: var(--text-sub)` | title が脇役化 → chip が際立つ | DS-DISCOVERY-01 補強 |
| T-03 | `.discovery-theme-chip font-family: 'Gentium Plus', serif` | 聖書語彙の質感 | 読書アプリ差別化 最大効果 |
| I-02 | hover の `transform: translateY(-1px)` 削除 | ボタン感の排除 | DS-DISCOVERY-02 徹底 |
| I-03 | `.discovery-theme-chip:active { opacity: var(--opacity-tertiary) }` | モバイル tap feedback | UX 必須 |

---

### P2 — 微調整（設計判断が必要）

| ID | 変更内容 | 効果 | 判断ポイント |
|----|---------|------|------------|
| S-02 | `padding-top: 64px` | chip と input の垂直分離 | lobby のさらなる下方移動 |
| T-05 / I-04 | `font-weight: 500` | 常時 affordance（静かな）| DS-DISCOVERY-02 との緊張 |
| S-01 | `padding: calc(var(--space-xl) + var(--space-md)) ...` | token 式化 | 機能変化なし |

---

## 成果物

| ファイル | 内容 |
|---------|------|
| `docs/discovery-lobby-visual-polish-audit.md` | 本ドキュメント |
| `docs/output/discovery-lobby-visual-polish-audit.json` | 機械可読版 |
