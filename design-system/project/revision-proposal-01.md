# Design System 改訂案 01

**状態: 提案 — 確定仕様ではない。人間の確認待ち。**

作成日: 2026-09-26
根拠: 静的コード監査（`design-system/project/` vs `public/index.html`）および実ブラウザ監査（Playwright, MAT/1, Desktop 1440px + Mobile 390px）

既存の Design System ファイルは一切変更していない。この文書は単独の改訂案ドキュメントである。

---

## 凡例

| 区分 | 意味 |
|---|---|
| **KEEP** | 現行仕様を維持する |
| **REVISE** | 改訂を提案する |
| **DEFER** | 判断を保留する。理由と解除条件を記す |
| **CONFIRMED** | 監査で実コード・実画面から確認した事実 |
| **INFERRED** | 推論・設計上の判断 |
| **HUMAN DECISION REQUIRED** | Claude では判断できない。人間の確認が必要 |

---

## 1. 情報設計上の論点

### 1-A. 翻訳選択と読み方モードの分離

**現行の状態 (CONFIRMED):**
読み方サイドバーのフラットリストに「口語訳」（翻訳）と「語順で読む」「構造で読む」「文の役割で読む」「つながりで読む」（ビューモード）が混在している。ブラウザ確認でそのまま確認済み。

**既存 Design System の判断:**
`06-component-architecture.md` および `ReadingLocationBar/README.md` で、翻訳（Translation）と表示モード（View Mode）を同一フラットリストに並べることを明示的な問題として記述している。

**改訂案 (REVISE):**

翻訳とビューモードを情報設計上 2 つの独立した選択軸として定義する。

- **翻訳軸:** 「何語・何訳で読むか」。口語訳・文語訳・ギリシャ語原文などの選択。同時に変わるのは本文テキストのみ。
- **ビューモード軸:** 「どう読み解くか」。通常読み・語順・構造・文の役割・つながり。同時に変わるのは表示形式のみ。本文テキストは変わらない。

これは UI の再配置提案であり、実装上の変更範囲は「サイドバーのグルーピング」に限定できる。翻訳選択とモード選択を同じリスト内でも視覚的・構造的に区切ること。

**根拠 (INFERRED):**
「口語訳」と「語順で読む」が同一列に並ぶと、どちらも「読み方」に見えるが、前者は本文テキストを決め、後者は表示形式を決める。ユーザーがこれを混同した場合、「口語訳で構造読みをする」という組み合わせが意図できなくなる。

**実装前に必要な確認 (HUMAN DECISION REQUIRED):**
- 翻訳軸とビューモード軸の実際の分離を、現行 UI のどの境界で行うか（サイドバー内のグループ見出し・セクション区切りなど）
- 「語順で読む」が将来的にギリシャ語原文以外でも有効になるか（翻訳軸との交差の扱い）

---

### 1-B. ReadingStateSwitch の配置と役割

**現行の状態 (CONFIRMED):**
`bp-segment-wrap`（単一表示/比較表示の pill スイッチ）は DOM に存在するが、一次読み方リストには表示されない。「比較表示を設定…」という末尾項目を選んだ先のサブパネルに配置されている。

**既存 Design System の定義:**
ReadingStateSwitch を「読み方パネルの最上位」に置き、比較 vs 単一を最初の分岐として定義している。

**改訂案 (REVISE):**

ReadingStateSwitch の役割を再定義する。現行実装が示す「比較は設定の一種」という位置づけを踏まえ、以下の 2 案を提示する。

**案 A: DS 準拠（最上位に移動）**
- 読み方パネルの冒頭に「単一読み / 比較読み」の pill スイッチを配置
- 「単一読み」選択中: 翻訳軸 + ビューモード軸のみ表示
- 「比較読み」選択中: 翻訳 A / 翻訳 B の選択と、現行と異なり Translation B が in-app データを持つ場合のみ有効化

**案 B: 現行構造を維持（末尾に保留）**
- 「比較表示を設定…」という現行位置を維持
- ただし役割説明を「比較モードに切り替える」と明確化し、pill 形状を `radius-pill` にする
- Translation B in-app データが実装されるまでは案 B を暫定とする

**DEFER 条件:** Translation B の in-app データが用意されない間は案 B を維持する。`ComparisonMobileStacked/README.md` §Open questions が解決されてから案 A へ移行を検討する。

**実装前に必要な確認 (HUMAN DECISION REQUIRED):**
- Translation B の in-app 保有は予定にあるか
- 案 A と案 B のどちらを採用するか

---

### 1-C. BottomNavigation の目的地再定義

**現行の状態 (CONFIRMED):**
モバイル下部ナビは「聖書（書物アイコン）」「本文（テキストのみ）」「検索（虫眼鏡アイコン）」の 3 タブ。全項目が同じグレーで、アクティブ状態の色変化なし。

**既存 Design System の定義:**
「聖書・検索・ノート・その他」の 4 タブ、アクティブ項目 = accent-greek-700（深緑）。「本文」タブは現在見ているサーフェスの名前であり目的地ではないと明示。

**改訂案 (REVISE):**

**「本文」タブを「読む」または削除する。**

BottomNavigation は「どこへ行くか」を示すナビゲーションとして定義し直す。現在表示しているサーフェスの名前をタブに出さない原則を維持する。

現行で実在する目的地:

| タブ | 実在するか | 備考 |
|---|---|---|
| 聖書（書物・章選択） | 実在 ✓ | 維持 |
| 検索 | 実在 ✓ | 維持 |
| ノート/ハイライト/メモ | 一部実在 | コードに `bookmarks`, `highlights`, `notes`, `recentVerses` が存在 (CONFIRMED: `VIEW_LABELS`、`index.html:7755-7759`) |
| その他 | 未定義 | ─ |

**提案:**
- 「本文」タブを廃止または「読む」に改名（読書サーフェスが home である前提なら不要とも言える）
- 「ノート」タブを追加（機能は実在するが現行 BottomNav には露出していない）
- 「その他」は機能・内容が定義されてから追加する。未確定のまま先行追加しない

**DEFER:** ノート機能の現在の実装状態・公開方針が確認されてから最終化する。

**実装前に必要な確認 (HUMAN DECISION REQUIRED):**
- ノート/ハイライト機能を BottomNavigation から到達可能にする方針はあるか
- 「本文」タブをなくした場合、モバイルで読書サーフェスへ戻る手段が確保されているか

---

### 1-D. モバイル比較表示の方式

**現行の状態 (CONFIRMED):**
モバイル比較は 1 節ずつのページング。`1節 ‹ ›` ナビゲーションで節を切り替え、翻訳 A と B を同一画面に縦に並べて表示する。章全体の連続スクロールではない。

**既存 Design System の定義 (ComparisonMobileStacked):**
章全体を 1 本の連続スクロールとし、sticky 翻訳ラベルと節番号タップジャンプを設計している。ただし同文書の § Open questions に「Translation B の in-app データ未確認」「1:1 節番号対応の未確認」「history の粒度未確認」と明示。

**改訂案 (DEFER — 現行維持を暫定とする):**

現行の verse-by-verse ページング方式を **暫定仕様** として明示的に採用する。理由:

1. Translation B の in-app データが現在存在しない (CONFIRMED: 現行は外部サイト誘導)
2. ComparisonMobileStacked が前提とする「節番号の 1:1 対応」が検証されていない
3. 現行のページング方式でも「2 翻訳を比べる」という目的は達成している

**連続スクロール方式への移行条件（解除条件）:**
以下がすべて確認されてから ComparisonMobileStacked 仕様の実装を検討する:

- Translation B テキストが in-app で参照可能になること
- 対象章での節番号 1:1 対応が確認されること（節番号がずれる書物の取り扱いを定義すること）
- 既存の highlight/word-tap ジェスチャーと節番号タップが競合しないことを確認すること

---

## 2. 視覚設計上の論点

### 2-A. アクセント色とプロダクト言語テーマ

> **前回の提案からのフレーミング変更（調整理由）:**
> 旧提案は「青灰 vs 深緑のブランド選択」として問いを立てていた。しかし DS および製品方針を確認した結果、これは二者択一のブランド判断ではなく、**DS がすでに定義したマルチ言語テーマ設計への整合の問題**であると判断し、記述を改訂する。アクセント色の方向性（緑）は DS の設計に内包されており、問いは「どちらを選ぶか」ではなく「いつ・どう実装するか」に変わる。

#### 現行の実装状態 (CONFIRMED)
`--accent: #5a6e82`（青灰）がすべてのアクティブ状態・選択状態・primary button に使用されている。ブラウザ確認でモードリストの active item、breadcrumb の色として視認。

#### DS が定義するマルチ言語テーマ設計 (CONFIRMED)

`tokens.json` および `01-product-family-and-reading-architecture.md` に以下が明記されている:

```
Product Accent
├── Greek  → Green  (accent-greek-*)  ← 現行プライマリプロダクト
└── Hebrew → Red    (accent-hebrew-*) ← 将来プロダクト（現在は実装しない）
```

- `accent-greek-700: #2c4f34`（深緑）— Greek Bible のプロダクトアイデンティティカラー。DS が `surface-canvas (#fbfaf7)` との 4.5:1 コントラスト達成を確認済みと明記。
- `accent-hebrew-700: #732f1e`（深赤）— 将来の Hebrew Bible 用として DS に予約済み。現行ビルドでは使用しない。
- 両言語ファミリーは同一の階調構造（050/100/300/600/700）を持つ。
- `01-product-family-and-reading-architecture.md` §2: 「GreenとRedは単なるThemeではなく、Bible Language / Corpusを表すProduct Identityである」と明記。

**現行の青灰 `#5a6e82` は、DS が定義した言語テーマ設計の外にある。** これは意図的な代替ではなく、DS 定義前の暫定実装状態と判断できる (INFERRED)。

#### 製品方針との整合 (CONFIRMED)

ユーザーから明示された製品方針:
- ギリシャ語版 = 緑テーマ（DS 定義と一致）
- ヘブライ語版 = 別の色（未選定。DS では赤として予約済み）
- 両版は同一サイト・共通 DS を共有する

これは DS の `accent-greek-*` / `accent-hebrew-*` トークン設計が前提とした構造と一致する。

#### 残る決定事項 (DEFER — 一部 HUMAN DECISION REQUIRED)

方向は確定（緑）。残る問いは「いつ・どの値で実装するか」:

1. **実装タイミング (HUMAN DECISION REQUIRED):** 青灰→深緑の切り替えは全アクティブ状態に一括で影響する。視覚的インパクトが大きいため、他の UI 作業との順序を人間が判断する。
2. **深緑の確定値 (INFERRED — 視覚テスト推奨):** DS は `#2c4f34` を指定しているが、実機での Reading-First 評価（本文との対比、長時間読書での印象）を経てから確定することを推奨する。DS 指定値を暫定とし、視覚テスト後に確定または微調整する選択肢がある。
3. **ヘブライ語テーマ (DEFER):** DS は深赤 `#732f1e` を予約しているが、Hebrew 製品の実装計画が具体化するまで採用判断は保留する（§2-F 参照）。

#### 構造色との分離について

`structural-function-*`・`structural-construction-*`・`structural-morphology-*` は言語テーマとは独立した意味的カラーシステムであり、言語が変わっても変化しない（§2-B および §2-F 参照）。

#### 実装時の変更範囲（参考）
`public/css/tokens.css` の `--accent: #5a6e82` を深緑値に変更し、`--accent-light` `--accent-mid` などの alias を再計算する。変更は `tokens.css` のみ。視覚回帰確認が必要。

**実装前に必要な確認 (HUMAN DECISION REQUIRED):**
- 深緑への切り替えタイミング（他 UI 作業との順序）
- DS 指定の `#2c4f34` を視覚テストなしで確定するか、実機評価後に確定するか

---

### 2-B. StructuralNode の構造色

**現行の状態 (CONFIRMED):**
`--color-domain: #7a7aaa`（紫）が FUNCTION / CONSTRUCTION / MORPHOLOGY すべての構造レイヤーに共通して使用されている。ブラウザ確認では、「書物」「起源」「子」「同格」「主語」「述語」「目的語」のラベルがすべて同系統の色で表示されており、層の違いは色では判別できない。

**既存 Design System の定義:**
3 系統の独立したトークンを定義:
- `structural-function-*` (青系): FUNCTION レイヤー（主語・述語・目的語など）
- `structural-construction-*` (紫系): CONSTRUCTION レイヤー（同格・等位など）
- `structural-morphology-*` (緑系): MORPHOLOGY レイヤー（格・時制・ムードタグ）

**改訂案:**

3 層カラーシステムを採用する前に、**各層が何の情報を伝えるか**を先に定義する。色は区別の道具であり、区別の意味が決まる前に色だけを実装しても読者の理解に貢献しない。

**先に定義すべき事項 (REVISE — 定義フェーズ):**

```
FUNCTION  層: _____ を示す（例: 節内の統語機能 = 主語・述語・目的語）
            → この情報を色で区別することで読者が得られるものは: _____

CONSTRUCTION 層: _____ を示す（例: 句構造の種類 = 同格・等位・関係節）
            → この情報を色で区別することで読者が得られるものは: _____

MORPHOLOGY 層: _____ を示す（例: 個別語の格・時制・法）
            → この情報を色で区別することで読者が得られるものは: _____
```

これらの「得られるもの」が定義できた時点で、色分けの実装を進める。

**色以外の識別手段の必要性 (REVISE):**
DS の既存定義は「色のみに頼らず text label または形状差を必ず付ける」と規定している。現行もラベルテキスト（主語・述語・同格など）を表示している。**ラベルが存在する限り、色分けは補助情報**であり、未実装でも機能は成立する。色実装は意味定義の後で行う。

**現行の `--color-domain` (紫) の評価:**
現行の紫はすべての構造要素に統一して使われており、「構造表示の色」として一貫した読み方ができている。これを3色に分けた場合、逆に情報過多になる可能性がある。**DEFER: 意味定義と実ユーザーの読書評価が揃うまで単色維持を推奨。**

**実装前に必要な確認 (HUMAN DECISION REQUIRED):**
- FUNCTION / CONSTRUCTION / MORPHOLOGY の各層が伝えたい情報の定義
- 色分けを加えることで読者の理解が実際に高まるか（実ユーザーでの確認）

> **言語テーマとの関係:** `structural-function-*`・`structural-construction-*`・`structural-morphology-*` は統語・形態の意味を表す固定カラーであり、言語テーマ（`accent-greek-*` / `accent-hebrew-*`）とは完全に独立したシステムである。言語が Greek から Hebrew に変わっても構造色は変わらない（§2-F 参照）。

---

### 2-C. focus-visible

**現行の状態 (CONFIRMED from code):**
`.hdg-clause--sub > .hdg-clause-label:focus-visible { outline: 2px solid var(--color-domain, #7a7aaa) }` — 紫色のフォーカスリング（`index.html:4926-4929`）。同じ `.hdg-clause--sub` に WORD_ORDER モード時は `outline-color: #3a6aab`（青）のオーバーライドあり（`index.html:5304`）。`.role-view[tabindex="0"]:focus-visible` は `var(--accent)` 青灰（`index.html:5502`）。

ブラウザ確認では 1440px 全画面スクリーンショットで視認できず。**個別要素でのズーム確認は未完了（HUMAN DECISION REQUIRED）。**

**既存 Design System の定義:**
`--focus-ring: var(--ink-primary)` — 暗色（`#211f1a` 相当）。「フォーカスをアクセント色・構造色と混同させないため意図的に ink 色にする」と明記。

**DS が記録した競合:**
`StructuralNode/README.md` に「既存 focus ring は node type の色（紫）で着色されており、本システムの `focus-ring` トークン（ink 色）と競合する。自動的に本システム側に解決されない」と明示されている。

**改訂案 (REVISE — 方向定義、実装値は確認後):**

以下を原則として定義する:

**原則 A: 操作フォーカスと意味色を分離する**
- フォーカスリング = 操作の所在を示す。「どのコントロールにいるか」
- 構造色 = 節の意味レイヤーを示す。「これは何の構造か」
- この 2 つは同じ色を使ってはならない

**原則 B: ink-primary を focus-ring のデフォルトとする**
- `--focus-ring: var(--ink-primary)` を維持する
- キーボードユーザーが本文を読みながら操作する場合、フォーカスが構造色と混同されると「今どこにいるか」が分からなくなる

**実装にあたっての確認条件:**

1. `ink-primary (#211f1a)` が `outline: 2px` で `surface-canvas (#fbfaf7)` 上に置かれた場合に十分なコントラストを持つか確認（INFERRED: 暗色 on 明色なので高コントラストと推測されるが実測が必要）
2. 構造表示の各種 `hdg-*` 要素上で ink-primary フォーカスリングが構造のボックス境界線と視覚的に区別できるか — **HUMAN DECISION REQUIRED（実ブラウザでの目視確認）**
3. `.role-view:focus-visible` の `var(--accent)` も `--focus-ring` へ統一する

**現行の紫フォーカスの評価:**
紫の構造色上に紫のフォーカスが乗ると混同する可能性がある。ただし**ブラウザ確認未完了のため、現行が実際に混同されているか断定できない。** 方向は定義するが、実装判断は確認後とする。

> **言語テーマとの関係:** `--focus-ring: var(--ink-primary)` は DS が定義する共有トークンであり、言語テーマ（`accent-greek-*` / `accent-hebrew-*`）には依存しない。Greek 版・Hebrew 版ともに同一の ink-primary フォーカスが使われる。テーマが変わってもフォーカスリングは変わらないことが DS の設計意図である（§2-F 参照）。

---

### 2-D. 背景色

**現行の状態 (CONFIRMED):**
`--bg: #ffffff`（純白）。ブラウザ確認で読書面が純白であることを視認。

**既存 Design System の定義:**
`--surface-canvas: #fbfaf7`（温かみ paper white）。「純白を避ける — 長時間セッションで clinical な印象になる」と明記。

**改訂案 (DEFER — 実機読書評価待ち):**

ヘッドレスブラウザでは長時間読書への疲労感は評価不能。以下の条件を満たした上で判断する:

- 実機（スマートフォン + デスクトップ）で実際に 20〜30 分以上読書した人間による評価
- `#fbfaf7` と `#ffffff` の並べた印象と、長時間読書後の印象の両方を確認

**暫定:** `#ffffff` を維持する。

---

### 2-E. breadcrumb のフォント

**現行の状態 (CONFIRMED from code):**
`.gbc-item { font-family: 'Noto Serif JP', serif }` — 読書用 Mincho 体を breadcrumb ナビゲーションに使用。

**既存 Design System の定義:**
breadcrumb は UI クロム = `font-ui-sans` を使用する。「Never set a button or breadcrumb in a reading family」と明記。

**ブラウザ確認の観察:**
ヘッダーの breadcrumb に serif 体が使われていることは視認できる。ただし「違和感がある / ない」の判断はヘッドレスブラウザでは不可。 **HUMAN DECISION REQUIRED。**

**改訂案 (HUMAN DECISION REQUIRED 後に判断):**

選択肢:
- A: `ui-sans` に変更（DS 準拠。breadcrumb とナビゲーションが本文と視覚的に区別される）
- B: Noto Serif JP を維持（現行。breadcrumb が本文と連続した印象になる）

B を選択する場合、DS の「reading family は本文専用」という原則の例外として明示的に記録する。

変更の範囲は `index.html` の `.gbc-item { font-family }` 1 か所。Micro Change の範囲。

---

### 2-F. マルチ言語テーマのトークン設計

#### DS が定義する設計 (CONFIRMED)

`tokens.json` はすでに以下の 2 層構造でカラートークンを設計している:

**層 1 — 共有トークン（言語に依存しない）**

| トークン群 | 代表例 | 役割 |
|---|---|---|
| `surface-*` | `surface-canvas`, `surface-raised` | 読書面・パネルの背景 |
| `ink-*` | `ink-primary`, `ink-secondary`, `ink-tertiary` | テキスト・アイコン |
| `border-*` | `border-hairline`, `border-strong` | 区切り線・枠 |
| `structural-*` | `structural-function-*`, `structural-construction-*`, `structural-morphology-*` | 統語・形態の意味色（言語テーマと完全独立） |
| `signal-*` | `signal-attention-fill`, `signal-attention-ink` | ステータス・通知 |
| `focus-ring` | `{ink-primary}` | キーボードフォーカス（常に ink 色） |

**層 2 — 言語テーマトークン（プロダクトごとに差し替わる）**

| トークン群 | 現行プロダクト（Greek） | 将来プロダクト（Hebrew） |
|---|---|---|
| `accent-*-050` | `#f5f8f3`（薄緑） | `#fbf3f1`（薄赤）— DS 予約済み |
| `accent-*-100` | `#e4ecdf`（淡緑） | `#f0dcd5`（淡赤）— DS 予約済み |
| `accent-*-300` | `#93b389`（中緑） | `#c98f7c`（中赤）— DS 予約済み |
| `accent-*-600` | `#3c6b45`（深緑 hover） | `#8a4530`（深赤 hover）— DS 予約済み |
| `accent-*-700` | `#2c4f34`（深緑 primary） | `#732f1e`（深赤 primary）— DS 予約済み |

両ファミリーとも `surface-canvas (#fbfaf7)` 上で 4.5:1 コントラストを満たすと DS が明記している。

#### 新言語テーマの追加方法 (INFERRED)

DS の設計意図に従えば、新しい言語テーマを追加する場合:

1. 同一階調構造（050/100/300/600/700）を持つ `accent-{language}-*` トークンを `tokens.json` に追加する
2. 各 accent-700 が `surface-canvas` 上で 4.5:1 以上を満たすことを確認する
3. 共有トークン・構造色・フォーカストークンは変更しない
4. `accent-hebrew-*` はすでに予約済みのため、Hebrew は既存トークンを参照するだけで済む

#### テーマの活性化メカニズム (DEFER — 技術調査が必要)

DS は言語テーマのトークン構造は定義しているが、**どのようにテーマを切り替えるか（適用メカニズム）は定義していない。**

現行アプリの実装を見ると `--accent` という単一のエイリアストークンで全アクティブ状態を参照している。マルチ言語テーマを実装する場合、以下のいずれかのメカニズムが考えられるが、現行アーキテクチャとの適合は技術調査が必要:

- **案 1:** `:root[data-lang="el"]` / `:root[data-lang="he"]` クラスで `--accent-*` を上書き
- **案 2:** `--accent-700` 等のエイリアストークンを言語に応じて JS で差し替え
- **案 3:** ビルド時に言語別 CSS ファイルを生成（同一サイトでは現実的でない）

案 1 が現行の静的 CSS アーキテクチャと最も親和性が高い (INFERRED)。ただし現行アプリがサポートするか、複数言語を同時に 1 ページで表示するシナリオがあるかによって判断が変わる。**メカニズムの確定は技術調査後とする。**

#### 言語テーマと意味的カラーの分離原則 (INFERRED)

言語テーマ色（`accent-greek-*` / `accent-hebrew-*`）は、以下の意味的役割のみに使用する:

- ナビゲーションのアクティブ状態
- 選択状態の背景（`surface-selected`）
- primary ボタン
- 重要なインタラクティブ要素

**以下には使用してはならない:**
- 本文テキスト（`ink-primary` が本文専用）
- 構造的意味の区別（`structural-*` が担う）
- フォーカス（`focus-ring` = ink-primary が担う）
- エラー・警告（`signal-*` が担う）

これにより、言語テーマが変わっても（Greek → Hebrew）読書体験の意味的カラーシステムは変化しない。

**実装前に必要な確認 (HUMAN DECISION REQUIRED):**
- テーマ活性化メカニズムの技術選定（§ H-14）
- 言語テーマが「アクセント/選択状態のみ」に限定されるか、`surface-sunken` 等の抑制された UI 詳細にも影響するか（§ H-15）

---

## 3. KEEP（変更しない）

以下は監査結果から問題を確認せず、変更を提案しない。

| 項目 | 根拠 |
|---|---|
| Verse コンポーネントの基本構造（番号 + 本文、カード/ボーダーなし） | ブラウザ確認で DS 仕様と整合を確認 |
| 日本語本文のフォント Noto Serif JP と行高 2.1x | DS の verse-ja (17px/34px) とほぼ整合 |
| ギリシャ語本文の Gentium Plus | DS の reading-source fallback として整合 |
| spacing トークンの値（--space-xs 〜 --space-xl が DS の space-1 〜 space-5 と同値） | 値は一致、名称のみ異なる |
| StructuralNode の折りたたみ（▼/▶）| 動作確認済み。DS 仕様と整合 |
| BottomNavigation の pressed 状態 (`rgba(0,0,0,0.05)`) | DS が「carry forward as-is」と明記 |
| Button の hover 状態 | DS が「confirmed, carry forward」と明記 |
| `radius-lg` を使ったパネル / シート | DS `radius-lg` の用途と一致 |
| motion トークンの存在（fast/base/slow + ease-out）| DS の 10-motion.md が定義する方向と構造が整合 |
| ヘッダーの sticky 配置（`position: sticky; top: 0`）| 読書中に場所を常に示すという目的と整合 |

---

## 4. 実装前に必要な人間の確認（一覧）

### 4-1. UI 設計・既存監査由来の確認事項

| 番号 | 確認事項 | 関連提案 |
|---|---|---|
| H-1 | アクセント色の実装タイミング: 深緑への切り替えを他 UI 作業と同時に行うか、独立して先行するか *(旧 H-1「青灰 vs 深緑のブランド判断」は 2-A の再フレーミングにより解消。方向は深緑で確定)* | 2-A |
| H-2 | 翻訳軸とビューモード軸の UI 上の区切り方 | 1-A |
| H-3 | Translation B の in-app 保有方針 | 1-B, 1-D |
| H-4 | ReadingStateSwitch の配置: 案 A（最上位）vs 案 B（末尾） | 1-B |
| H-5 | BottomNavigation にノートタブを追加するか | 1-C |
| H-6 | モバイル比較: ページング維持を正式採用するか | 1-D |
| H-7 | StructuralNode 3 層の各層が伝える情報の定義 | 2-B |
| H-8 | focus-visible を ink-primary にした場合の目視確認 | 2-C |
| H-9 | 背景色: 長時間読書での #ffffff vs #fbfaf7 の実機評価 | 2-D |
| H-10 | breadcrumb フォント: serif 維持か ui-sans 変更か | 2-E |

### 4-2. 言語テーマ設計に関する確認事項

| 番号 | 確認事項 | 選択肢と影響 | 関連提案 |
|---|---|---|---|
| H-11 | **ギリシャ語版 = 緑テーマの方針確認** (CONFIRMED と扱ってよいか) | *確認:* DS の設計・提示された製品方針と一致するため CONFIRMED として扱う。*要確認:* 正式な確認として記録が必要なら人間承認を得る。 | 2-A |
| H-12 | **深緑の確定値:** DS 指定の `#2c4f34` を視覚テスト前に確定するか | *確定する:* DS がコントラスト検証済みとして指定。実機テスト前に実装を進められる。 / *視覚テスト後に確定:* Reading-First の観点での実機評価を経てから確定。遅延が生じる。 | 2-A |
| H-13 | **ヘブライ語版テーマ色 (DEFER):** DS 予約済みの深赤 `#732f1e` を将来 Hebrew 製品のテーマ色として採用するかどうか | Hebrew 製品の実装計画が具体化するまで判断しない。現時点では DS の予約値をそのまま維持する。 | 2-F |
| H-14 | **テーマ活性化メカニズムの技術選定:** `:root[data-lang]` CSS クラスか、JS によるトークン差し替えか、その他か | 現行の静的 CSS アーキテクチャ（Python http.server + Cloudflare Pages）に依存する。現行アプリ上で複数言語を同時表示するシナリオがあるかによっても判断が変わる。技術調査が先決。 | 2-F |
| H-15 | **言語テーマの影響範囲:** `accent-*` 系（選択状態・ボタン・アクティブアイコン）のみか、`surface-sunken` や `border-hairline` 等の抑制されたトーンにも言語固有の差異を持たせるか | *アクセントのみ:* 共有トークンは全版共通、テーマ切り替えの影響が最小。推奨 (INFERRED)。 / *抑制トーンにも差異:* テーマの一体感は増すが、共有トークンの分岐が必要になり設計が複雑になる。 | 2-F |

---

## 5. 改訂後に再監査すべき項目

各提案が採用・実装された場合に確認が必要な事項:

| 対象 | 確認事項 |
|---|---|
| アクセント色変更後 | `color-contrast` 全トークンの再確認。特に accent-greek-700 on surface-canvas, ink-on-accent on accent-greek-700 |
| 翻訳/モード分離後 | 分離された UI が混在時より操作をシンプルにしているか |
| focus-visible 変更後 | 構造表示でフォーカスリングが構造ボックス境界と視覚的に区別できるか（実ブラウザ確認）|
| BottomNavigation 変更後 | 読書サーフェスへの戻り導線が失われていないか（特にモバイル）|
| breadcrumb フォント変更後 | ナビゲーション文字が本文と視覚的に区別できるか（実ブラウザ確認）|
| 言語テーマ実装後（Greek → 深緑） | 構造色（structural-*）・フォーカスリング（ink-primary）・シグナル色（signal-*）が言語テーマ色と視覚的に混同されないか。アクセントが本文（ink-primary）と区別できるか（実ブラウザ確認）|
| Hebrew テーマ実装時（将来） | `accent-hebrew-700 (#732f1e)` on `surface-canvas (#fbfaf7)` のコントラスト実測。構造色との識別確認。Greek 版と Hebrew 版が同一ページに共存する場合（比較表示等）のカラー競合確認 |

---

*この文書は提案である。確定仕様ではない。上記 H-1 〜 H-10 の判断を経た後、Design System 本体の対象ファイルを更新する。*
