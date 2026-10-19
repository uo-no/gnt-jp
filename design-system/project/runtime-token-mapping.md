# Design System ↔ Runtime Token Mapping

監査日: 2026-10-19  
目的: 設計トークンと現在の実装トークンの対応関係を整理し、今後の移行を安全に進める。**この文書は対応表であり、ここに書かれた候補を一括でCSSへ適用する指示ではない。**

## 1. 先に確定したこと

- `design-system/project/tokens.json` は設計トークンのソースデータ。
- `design-system/project/tokens.css` は `tokens.json` から生成されたCSS。生成物は手編集しない。
- 実際のアプリの共通CSSは `public/css/tokens.css`。設計側の生成CSSとは別の名前・粒度・値体系である。
- 検索画面 `public/search-tool.html` は `--s-*` の独自トークンを持つ。アクセントの一部だけは `--accent` 系を参照している。
- したがって、今の課題は単純な「トークン不足」ではなく、**設計上の役割とruntimeトークンとの対応表・移行方針が未整備**ということ。
- 現在の表示を壊さないため、当面は `public/css/tokens.css` をruntimeの表示基準として扱う。設計トークンの値へ自動的に置き換えない。視覚確認後に役割と値を決定する。

## 2. 状態の意味

- **一致**: 役割と値が対応している。名前の別名は残る場合がある。
- **値のみ近似**: 値が近い、またはサイズだけ同じ。役割全体が一致するとは限らない。
- **未対応**: runtimeに役割を表すトークンがない、または実装で直接指定される。
- **意図的に別管理**: ブランドアクセント、構造読解の意味色、ユーザー選択ハイライト色など。無理に統合しない。
- **判断待ち**: 2つの値が違い、視覚上の意図・影響を確認してから決める。

## 3. Color roles

| Design System token | DS value / intent | Runtime counterpart | Status / decision |
|---|---|---|---|
| `surface-canvas` | `#fbfaf7`, warm reading canvas | `--bg: #fff` | **判断待ち**。ページ背景の差は視覚上の変更になるため、別途判断する。 |
| `surface-raised` | `#fff` | `--bg: #fff` | **値一致**。runtime名は汎用背景名。 |
| `surface-sunken` | `#f3f1ec` | `--bg-panel: #f3f1ec` | **値一致**。 |
| `surface-overlay` | `rgba(33,32,28,.45)` | 完全一致する共通トークンなし | **未対応**。モーダル・シートのオーバーレイを確認してから追加候補。 |
| `surface-selected` | `{accent-greek-100}` | `--accent-light: rgba(44,79,52,.10)` | **値不一致**。色面の用途とコントラストを比較して決める。 |
| `ink-primary` | `#211f1a` | `--text: #211f1a` | **値一致**。 |
| `ink-secondary` | `#57534a` | `--text-sub: #57534a` | **値一致**。 |
| `ink-tertiary` | `#8a8577` | `--text-hint: #8a8577` | **値一致**。参照ラベルにも使用を開始したが、視認性の目視確認待ち。 |
| `ink-on-accent` | `#fff` | 明示的なruntime役割トークンなし | **未対応**。アクセント面上の文字色を確認してから追加候補。 |
| `border-hairline` | `#e6e2d7` | `--border: #e6e2d7` | **値一致**。 |
| `border-strong` | `#cdc7b6` | `--border-strong: #cdc7b6` | **値一致**。 |
| `accent-greek-050` | `#f5f8f3` | 直接対応なし | **未対応**。薄いhover背景の需要を確認してから追加。 |
| `accent-greek-100` | `#e4ecdf` | `--accent-light: rgba(44,79,52,.10)` | **値不一致**。selected tintの差を残すか統一するかは画面確認後に決定。 |
| `accent-greek-300` | `#93b389` | 直接対応なし | **未対応**。既存UIで必要な役割があるか確認。 |
| `accent-greek-600` | `#3c6b45` | 直接対応なし（`--accent-dark` は本文色を参照するため同義ではない） | **未対応**。hover/pressed状態を調べてから追加候補。 |
| `accent-greek-700` | `#2c4f34` | `--accent: #2c4f34` | **値一致**。将来の赤版・青版テーマで差し替える製品アクセント。 |
| `structural-function-fill/ink` | `#e3eddf / #375e2c` | `--structural-function-fill/ink` | **一致・別管理を維持**。意味色。 |
| `structural-construction-fill/ink` | `#cce6db / #2e5945` | `--structural-construction-fill/ink` | **一致・別管理を維持**。青緑系の意味色。 |
| `structural-morphology-fill/ink` | `#e6f0ea / #316148` | `--structural-morphology-fill/ink` | **一致・別管理を維持**。意味色。 |
| `structural-connector` | `#a49c86` | 明示的な共通トークンなし | **未対応**。構造図の線色として調査。 |
| `signal-attention-fill/ink` | `#faf0da / #8a5a14` | `--color-caution: #a09050` など | **意味・値とも不一致**。注意色を単純置換しない。 |
| `focus-ring` | `{ink-primary}`, 2px + 2px offset | `--focus-ring: var(--text)` | **色は対応**。輪郭幅・offsetは各ルールを横断確認する。 |

### 色の移行ルール

1. 製品アクセントと構造読解の意味色を同一視しない。
2. ハイライト色（ユーザー選択の黄・青・緑・ピンク）は製品アクセントとは別役割。緑一色にしない。
3. `--color-positive / caution / negative` とDesign Systemのsignal色は、色名が似ているだけで同一値にしない。
4. `--bg` を `surface-canvas` に合わせることは見た目の変更を伴うため、今は実施しない。

## 4. Typography roles

Design Systemの役割別サイズは定義済みだが、runtime側には同じ粒度の役割トークンがない。フォントファミリーも完全一致していない。**ここは値を機械的に変換せず、画面・状態ごとの役割対応を先に決める。**

| DS role | DS size / line-height / weight | Runtime evidence | Status / decision |
|---|---|---|---|
| `ui-caption` | 12px / 16px / 500 | `--text-caption: .75rem`（通常12px） | **部分一致**。captionサイズは共通、行間・ウェイトのトークンは段階導入中。 |
| `ui-label` | 13px / 18px / 500 | `--text-label: 13px` | **部分一致**。行間・ウェイトはローカル指定。 |
| `ui-body` | 15px / 22px / 400 | `--text-reading: 15px`、`--text-body: .9rem`（通常14.4px） | **判断待ち**。15px本文と14.4px UI本文は役割を分けて維持する可能性がある。 |
| `ui-title` | 17px / 24px / 600 | `--text-title: 1.25rem`（通常20px） | **役割不一致の可能性**。同名扱いで統合しない。 |
| `ui-display` | 22px / 28px / 600 | `--text-display: 2rem`（通常32px） | **不一致**。見出しの実装用途を確認してから対応づける。 |
| `verse-ja` | 17px / 34px / 400 | `--text-body-lg: 1rem`（通常16px）、StudyPanel内本文は `--line-height-reading-ja: 2.1` / `--tracking-reading` | **部分対応**。行間・字間は役割トークン化済みだが、本文サイズ17pxへの変更は保留。表示モードごとの実効値を採取する。 |
| `verse-ja-comparison` | 16px / 30px / 400 | 実装の複数の比較ルール | **要確認**。単一表示と比較表示は別役割として対応づける。 |
| `verse-ja-compact` | 14px / 24px / 400 | ピッカー等のコンパクト表示 | **要確認**。通常本文へ統合しない。 |
| `verse-source` | 18px / 34px / 400 | `--font-greek` はあるがサイズ・行間は複数箇所で指定 | **部分一致**。Greek本文・比較・語順表示を分けて確認する。Greek見出しには `--line-height-greek-headword: 1.2` を導入済み。 |
| `word-source-inline` | 16px / 26px / 400 | 語順・構造表示の個別指定 | **要確認**。単語チップと辞書見出しを同じ役割にしない。 |
| `gloss-source` | 12px / 16px / 400 | 語義・グロスの個別指定 | **要確認**。日本語グロスとギリシャ語ソースのフォント役割を分ける。 |
| `structural-tag` | 11px / 14px / 600 | runtimeの完全対応トークンなし | **未対応**。構造図に限定した役割トークン候補。 |
| `structural-node-text` | 15px / 22px / 400 | 本文側クラスとの合成で決まる | **要確認**。ボックス既定値と本文フォントを分ける。 |

### Font family

| DS family | Runtime family | Status |
|---|---|---|
| `ui-sans` | `--font-ui` | **近似**。フォントスタックの並びが異なる。 |
| `reading-ja` | `--font-prose` | **近似**。DSはYu Mincho等、runtimeはNoto Serif JP中心。字形・可読性を見ずに差し替えない。 |
| `reading-source` | `--font-greek` | **近似**。Gentium Plusが共通だがfallbackが異なる。 |
| `reading-en` | 明示的なruntime roleなし | **未対応**。現行画面で英語本文が必要な領域を確認してから追加。 |

## 5. Spacing / radius / border / shadow / motion

| Role | Design System | Runtime | Status / decision |
|---|---|---|---|
| spacing scale | 4, 8, 12, 16, 24, 32, 48, 64px | `--space-xs/sm/md/lg/xl` = 4, 8, 16, 24, 32px。ほかに直接指定が残る | **部分対応**。12/48/64pxはDSに定義があるがruntimeの汎用spacing tokenにはない。40pxや画面固有寸法は意味を調べてから扱う。 |
| radius | 4, 8, 16, 999px | `--radius-s/m/l/pill` = 同値 | **値一致**。検索画面には6px・10pxなど別の役割がある。 |
| border width | 1 / 1.5 / 2px | 直接指定が中心 | **未対応**。既存境界の強さを見てから役割トークン候補を追加。 |
| shadow | `shadow-panel`, `shadow-sheet` | `--shadow-card` | **部分対応**。パネルとモバイルシートの区別がruntimeにない。 |
| opacity | 完全なスケールなし | `--opacity-primary/secondary/tertiary/disabled` | **runtime固有**。現行用途を調べてからDSへ取り込むか決める。 |
| motion duration | JSON内の共通duration roleなし（別文書にmotion設計） | `--duration-fast/base/slow` = 150/200/300ms | **別管理**。motion設計文書と照合してから統合。 |
| search motion | — | `--s-dur-fast/base/panel/result` = 140/220/280/180ms | **検索固有**。現在の応答感を保ったまま共通化できるか検証する。 |
| content width / header height | 画面設計内に用途別の記載 | 検索固有 `--s-content-max:720px`、header 56/48px、main appは直接指定もある | **レイアウト役割**。spacing scaleと混同しない。 |

## 6. Search-specific tokens

検索画面の `--s-*` は全て冗長とは限らない。以下のように扱う。

- **既にruntimeアクセントへ接続:** `--s-accent` → `--accent`、`--s-accent-soft` → `--accent-light`、`--s-accent-mid` → `--accent-mid`。これは維持する。
- **近いが同一でない色:** `--s-bg: #f5f3ee`、`--s-surface-2: #f0ede6`、`--s-border: #ddd9cf`、`--s-divider: #e8e4db`。runtimeの背景・境界と値が異なるため、検索結果の階層を目視してから決める。
- **フォント:** `--s-ff-ui` / `--s-ff-prose` / `--s-ff-greek` はruntime familyに近いがfallbackが異なる。文字化け・ギリシャ語字形を確認してから統合。
- **文字サイズ・行間・字間:** `--s-ts-*`, `--s-lh-*`, `--s-ls-*` は検索結果と絞り込みUIの役割別尺度。名前が違うだけでなく値もruntimeの尺度と異なるので、1対1で機械置換しない。
- **余白:** `--s-sp-1…8` は4/8/12/16/24/32/48/64px。runtimeの4/8/16/24/32pxと重なる値はあるが、12/48/64pxを追加する前に他の画面で同じ役割があるか確認。
- **角丸:** input/chip/button/modal/panelで4/6/6/10/8px。runtimeの4/8/16pxとは部分一致。検索固有の入力・モーダル形状として残す可能性あり。
- **duration:** 140/180/220/280ms。既存runtimeの150/200/300msへ置換する場合は、検索操作の体感と回帰テストが必要。

## 7. Migration plan — 先に行うこと／後で行うこと

### Phase A — 変更なしで対応関係を確定
1. Reading / StudyPanel / Search / Highlights / Historyの実効CSS値を、desktopとmobile、主要状態ごとに記録する。
2. Typographyは「UI」「日本語本文」「ギリシャ語本文」「比較本文」「辞書・グロス」「構造ラベル」に分けて役割を確定する。
3. Searchの各 `--s-*` が新レイアウト・旧レイアウトのどちらで使用中かを調べる。
4. 未使用クラスはCSS定義だけで判断せず、JSの動的参照も確認する。

### Phase B — 見た目を変えない整理
1. 同じ値・同じ役割のトークン参照だけを段階的に共通化する。
2. 意味が異なる値、背景色、本文サイズ、行間、モーションは変更しない。
3. 各小変更でdiff・ブラウザ表示・Playwright回帰を確認する。

### Phase C — デザイン判断を要する変更
1. canvas背景 `#fff` と `#fbfaf7` のどちらを正とするか決める。
2. selected tint `rgba(44,79,52,.10)` と `#e4ecdf` の使い分けを決める。
3. UI本文・日本語本文・Greek本文のフォントとサイズを実画面で比較し、役割別トークンの値を確定する。
4. 確定後にのみDesign Systemとruntimeの値を同期する。

## 8. 今回のコード変更と未検証事項

- `public/index.html`: `--color-domain` の紫色fallbackを除去し、`--accent` 参照に変更。
- `public/index.html`: 主要なfocus-visible輪郭を `--focus-ring` 参照へ変更。
- `public/search-tool.html`: layer row / discovery verseのfocus-visible輪郭を `--focus-ring` 参照へ変更。
- `public/index.html`: 参照ラベルの直接色 `#a0a0a6` を `--text-hint` に変更。
- 上記はGitHub上の再取得でコード反映を確認した。**ブラウザ目視、computed style、色コントラスト、Playwrightの視覚回帰は未実施。**

## 9. 完了条件

- 各画面の主要な文字サイズ・行間・フォント・余白・角丸・境界・影・動きを役割ごとに追跡できる。
- Design Systemの値、runtimeの値、画面固有の値、ユーザー選択値が混同されていない。
- 対応づけのないトークンが「不足」「意図的な別管理」「未使用候補」のどれかに分類されている。
- 変更は見た目を変えない共通化から始め、意図的な見た目の変更は別コミットとして視覚確認後に実施する。

## 10. 2026-10-19 実装移行ログ：Typography Phase B（値を変えない）

runtime側に役割別line-height / weightトークンを追加し、同じ役割が確認できたセレクタから参照を切り替えた。**数値は変更していない。**

- `public/css/tokens.css`:
  - `--weight-regular: 400`, `--weight-medium: 500`, `--weight-semibold: 600`, `--weight-bold: 700`
  - `--line-height-reading-ja: 2.1`
  - `--line-height-reading-prose: 1.9`
  - `--line-height-dictionary: 1.8`
  - `--line-height-word-chip: 1.4`
  - `--line-height-greek-headword: 1.2`
  - `--tracking-reading: 0.01em`
- `public/index.html`: `.reading-prose`, `.greek-headword`, StudyPanel内の節本文、辞書・用例本文、語チップの行間／字間を役割トークン参照に変更。
- `public/index.html`: `.ui-label` と辞書・用例本文のfont-weightを共通weightトークン参照へ変更。
- `public/search-tool.html`: `.s-label` のfont-weightを共通weightトークン参照へ変更。

### この段階で変更していないこと

- Design Systemの17px / 34pxという日本語本文規範を実装へ強制していない。
- 検索専用の `--s-lh-*` / `--s-ts-*` は値と使用箇所の対応が完了するまで維持。
- `public/index.html` の他の直接指定は一括置換していない。数値が同じでも用途が異なる可能性があるため。

### 検証状況

- GitHubから各変更ファイルを再取得し、トークン定義と参照への置換を確認。
- ブラウザのcomputed style、視覚比較、Playwright回帰テストは未実施。トークンが定義されていない環境ではなく、通常のCSS読み込み順であることをブラウザ側で確認する必要がある。

