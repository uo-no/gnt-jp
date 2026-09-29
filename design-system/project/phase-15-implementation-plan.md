# Phase 15 実装計画書

**作成日:** 2026-09-29  
**補正日:** 2026-09-29（Q1/Q2/Q3 方針反映、Phase 15F 追加、背景色・`--bg-inset` 取り扱い明確化）  
**更新日:** 2026-09-29（Phase 15F-Inv 調査完了 — §B-5/§B-10/§C 該当セクション更新）

**根拠:**
- Phase 9–12: DESIGN.md 監査・修正（完了）
- Phase 13: H-10 ブラウザ比較（完了）
- Phase 14: App Diff 調査（完了）
- `design-system/project/DESIGN.md`（最新版）
- `design-system/project/revision-proposal-01.md`
- `public/css/tokens.css`・`public/index.html`

**この文書の性質:** 計画・整理のみ。アプリ本体・DESIGN.md・tokens ファイルの変更は行っていない。

---

## A. 基準固定判定

### 判定：READY WITH DEFERRED ITEMS

**根拠（CONFIRMED）:**

| チェック項目 | 結果 |
|---|---|
| DESIGN.md と tokens.json の整合 | 一致。Phase 10–12 の修正が正しく反映済み |
| tokens.json と tokens.css の整合 | 一致。CSS custom properties は tokens.json から正しく生成されている |
| revision-proposal-01.md との矛盾 | なし。DESIGN.md が採択済み判断を §8 で正確に記録している |
| アプリ本体への変更混入 | なし（git diff = clean、staged = なし）|
| H-11 の矛盾（Phase 11 発見）| 解消済み（Phase 12 で §8-1 CONFIRMED / §8-5 から削除）|

**保留・判断記録の現在状態:**

| H | 事項 | 種別 | 状態 |
|---|---|---|---|
| H-1 | アクセント色の実装タイミング | DECIDED | **15A–C 完了後に 15D 着手**（本計画書で確定）|
| H-2 | 翻訳/モード軸の UI 境界形態 | DEFER | ReadingModePicker 実装時 |
| H-3 | BUN: in-app 保有確認済み。KAI17/KYO 追加 | SPLIT | BUN = CONFIRMED（Phase 14）/ KAI17・KYO = DEFER（データ・ライセンス判断先決）|
| H-4 | ReadingStateSwitch 配置（案 A vs B） | DEFER | H-3（追加翻訳）解決後 |
| H-5 | BottomNavigation ノートタブ追加 | DEFER | ノート機能公開方針確定後 |
| H-6 | モバイル比較スクロール方式移行 | DEFER | H-3 + 節番号対応確認後 |
| H-7 | StructuralNode 3層の意味定義 | DEFER | 各層の教育的定義確定後。Phase 15F の実装ゲート |
| H-8 | focus-ring ink-primary の目視確認 | VISUAL REVIEW | Phase 15B 実装後に実施 |
| H-9 | 背景色 #fbfaf7 の長時間読書実機評価 | VISUAL REVIEW | 実機での長時間読書評価が前提。現行 #ffffff 暫定維持 |
| H-10 | breadcrumb フォント serif vs ui-sans | DECIDED | **ui-sans 変更方針確定。**モバイル実機確認と中間幅確認は視覚完了条件として残る |
| H-11 | Greek = 緑テーマの製品方向 | CONFIRMED | Phase 12 で解消済み |
| H-12 | accent-greek-700 `#2c4f34` の実機評価 | 暫定PASS | **Phase 15D 実装済み（2026-09-29）。**ブラウザ検証で視覚的問題なし確認。実機最終確定は残件。|
| H-13 | Hebrew テーマ色 | DEFER | Hebrew 製品計画確定後 |
| H-14 | テーマ活性化メカニズム | TECH INV | 現 Phase スコープ外 |
| H-15 | 言語テーマ影響範囲 | DEFER | Hebrew 実装計画時 |

**注：git 追跡状態について**  
`design-system/` ディレクトリは現在全体が untracked。DS を正式な実装基準として固定する場合はコミットで snapshot を作成することを推奨する。git 操作は明示的承認が必要なため本文書の実行範囲外とする。

---

## B. Phase 14 差分の分類

### B-1. トークン層

| 差分 | 分類 | 根拠 |
|---|---|---|
| `--text: #1d1d1f` → `ink-primary #211f1a` | **IMPLEMENT (15A)** | CONFIRMED（§3-2）|
| `--text-sub: #6e6e73` → `ink-secondary #57534a` | **IMPLEMENT (15A)** | CONFIRMED（§3-2）|
| `--text-hint: #8e8e93` → `ink-tertiary #8a8577` | **IMPLEMENT (15A)** | CONFIRMED（§3-2）|
| `--border: rgba(0,0,0,0.07)` → `border-hairline #e6e2d7` | **IMPLEMENT (15A)** | CONFIRMED（§3-2）|
| `--border-strong: rgba(0,0,0,0.12)` → `border-strong #cdc7b6` | **IMPLEMENT (15A)** | CONFIRMED（§3-2）|
| `--shadow-card` → `shadow-panel` 相当値 | **IMPLEMENT (15A)** | CONFIRMED（§5-3）|
| `--bg-panel: #f5f5f7` → `surface-sunken #f3f1ec` | **IMPLEMENT (15A)** | CONFIRMED（§3-2）|
| `--radius-s: 6px` → `radius-sm 4px` | **IMPLEMENT (15A)** | CONFIRMED（§5-2）|
| `--radius-m: 12px` → `radius-md 8px` | **IMPLEMENT (15A)** | CONFIRMED（§5-2）|
| `--radius-pill: 999px`（未定義）→ 追加 | **IMPLEMENT (15A)** | CONFIRMED（§5-2）|
| `--accent: #5a6e82` → `accent-greek-700 #2c4f34` | **IMPLEMENT (15D)** | 方向 CONFIRMED・値 PROVISIONAL（H-12）・タイミング H-1 DECIDED（15A–C 後）|
| `--bg: #ffffff` → `surface-canvas #fbfaf7` | **DEFER** | H-9（長時間実機評価が前提）。暫定 #ffffff 維持。15A では変更しない |
| `--bg-inset: #fafafa`（DS 外）| **SPLIT — 後述 §B-10** | 用途によって対応が異なる。一括置換しない |
| `--color-domain: #7a7aaa`（DS 外）| **SPLIT** | focus-visible からは 15B で除去。構造ラベル色としては H-7 解決まで維持（§B-5 参照）|

### B-2. H-10: breadcrumb フォント

**方針：ui-sans 変更確定（H-10 DECIDED）**

| 項目 | 分類 | 状態 |
|---|---|---|
| `.gbc-item` l.861・l.873 font-family | **IMPLEMENT (15E)** | ui-sans 変更方針確定 |
| `.gbc-ch-label` l.937 font-family | **IMPLEMENT (15E)** | 同上 |
| JS inline style l.7667 font-family | **IMPLEMENT (15E)** | 同上 |
| `#mobile-location-btn` l.5932 font-family | **IMPLEMENT (15E)** | 同上 |
| font-size: `text-ui-label` 13px/18px/500 の適用 | **VISUAL REVIEW (15E)** | 現行 `--text-caption` 0.75rem ≈ 12px から 1px 変化。デスクトップ・モバイル・1024px 前後で確認が必要 |
| モバイル実機での確認 | **VISUAL REVIEW (15E)** | Phase 13 はデスクトップ 1440px のみ。モバイル実機確認完了まで視覚確認条件を満たした扱いにしない |

### B-3. ReadingStateSwitch 形状と状態

| 項目 | 分類 | 根拠 |
|---|---|---|
| `.bp-segment` / `.bp-seg-btn` radius → `radius-pill` | **IMPLEMENT (15C)** | CONFIRMED（§6-5）。accent 色とは独立して実装可能 |
| Active 状態: `accent-greek-700` 塗り + `ink-on-accent` 文字 | **IMPLEMENT (15D)** | 値 PROVISIONAL（H-12 暫定値方式）・H-1 DECIDED（15A–C 後）|
| pill 形状適用後の暫定 Active: 白塗り + text-main を維持 | **IMPLEMENT (15C)** | 15D 実施まで暫定として維持 |

### B-4. focus-visible の統一

| 項目 | 分類 | 根拠 |
|---|---|---|
| `.hdg-clause--sub > .hdg-clause-label:focus-visible` l.4926 | **IMPLEMENT (15B)** | 原則 CONFIRMED（§7-1）|
| 同上 WORD_ORDER mode override l.5304 | **IMPLEMENT (15B)** | 同上 |
| `.role-view[tabindex="0"]:focus-visible` l.5501 | **IMPLEMENT (15B)** | 同上 |
| `.cf-clickable:focus-visible` l.5612 | **IMPLEMENT (15B)** | 同上 |
| 実装後 StructuralNode での目視確認 | **VISUAL REVIEW (15B 後)** | H-8 |

### B-5. Structural Reading の色トークン（Phase 15F）

DESIGN.md §3-4: 「各レイヤーが何の情報を伝え、色分けで読者の理解が実際に高まるかを先に定義する（H-7）。ラベルテキストが存在する限り色分けは補助情報であり、意味定義なしの先行実装はしない。」

| 項目 | 分類 | 根拠 |
|---|---|---|
| `.hdg-clause` 背景: `--bg-inset` → `structural-function-fill` | **Phase 15F（H-7 解決後）** | H-7 ゲート。現行の値は `--bg-inset` 経由（§B-10 参照）|
| `.hdg-clause-label` 色: `--color-domain` → `structural-function-ink` | **Phase 15F（H-7 解決後）** | H-7 ゲート。focus-visible 除去とは別管理 |
| `.hdg-fn` 等の機能チップ | **Phase 15F（調査後・H-7 解決後）** | Phase 14 未確認。先行コード調査が必要（§15F 参照）|
| Construction 層のクラス | **ADDITIONAL JUDGMENT（15F-Inv 完了 — 詳細は §C Phase 15F 参照）** | `hdg-clause--sub` の基本 dashed border は Phase 2-B override で `border-left: none !important`（l.5138）に上書き済み。appositive/adj-modifier サブタイプが hardcoded rgba 値（`--color-domain` 非参照）を使用。DS `structural-construction-*` への対応は H-7 解決 + 追加設計判断が必要 |
| Morphology 層のクラス | **OUT OF SCOPE（現時点）— 15F-Inv 完了** | `wlv-detail-morph { display: none }`（l.3499）= WLV 引き出しの形態表示は無効化済み。`morph-tag-pill` は `--bg-panel`/`--text-sub`/`--accent-light` 参照（structural-morphology-* は未使用）。DS `structural-morphology-*` トークンは現在アプリ内に実装なし |
| `--color-domain` トークン削除 | **DEFER（15F 以降）** | 構造ラベル色として使用中のため、15F 完了まで削除しない |

### B-6. 翻訳チップの pill 形状

| 項目 | 分類 | 根拠 |
|---|---|---|
| `.wlv-chip` radius: `var(--radius-s)` → `var(--radius-pill)` | **IMPLEMENT (15C)** | CONFIRMED（§2-3・§5-2）|

### B-7. 比較ビューの調整

| 項目 | 分類 | 根拠 |
|---|---|---|
| 右列背景（`--bg-inset` 参照）の扱い | **判断待ち（§B-10 参照）** | DS に明示的仕様なし。`--bg-inset` 用途分析の結果による |
| 右列 line-height: 2.1 → 30px（`verse-ja-comparison`）| **IMPLEMENT (15A)** | CONFIRMED（§4-2）|

### B-8. 節番号色（`.v-num`）

現行 `.v-num { color: var(--text-hint, #8e8e93) }` は DS の `ink-secondary` と不一致。  
DESIGN.md §4-3: 「アクセント色実装（H-1）と連動して評価」と記録されている。  
→ Phase 15D（アクセント色実装）と同時に `.v-num` の色参照を `--text-sub`（ink-secondary）へ変更する。15A では変更しない。

### B-9. H-14: テーマ活性化機構

**分類: DEFER / TECH INVESTIGATION**  
現行アプリにテーマ切替機構なし（CONFIRMED from code）。現 Phase スコープ外。

### B-10. `--bg-inset` の用途分類と対応方針

`--bg-inset: #fafafa` は DS に直接対応するトークンがない。Phase 14 の調査から判明している参照箇所を用途別に分類する。**単純に削除・置換しない。DS の意味が保てる場合のみ対応づける。**

**全 15 参照（15F-Inv にて確認済み）:**

| 行 | セレクター | 表示モード / 画面 | 用途 | グループ | DS 候補トークン |
|---|---|---|---|---|---|
| l.310 | `#main-reading-area.compare-mode #parallel-text-area` | COMPARE（モバイル） | 右列パネル背景 | **A** | `surface-sunken` |
| l.375 | `.mobile-trans-b` | COMPARE（モバイル） | 右翻訳ブロック | **A** | `surface-sunken` |
| l.1004 | `#parallel-text-area` | COMPARE（デスクトップ） | 右列パネル背景 | **A** | `surface-sunken` |
| l.1017 | `.verse-pair-right` | COMPARE | 右列 verse 行 | **A** | `surface-sunken` |
| l.1021 | `.verse-grid-spacer-right` | COMPARE | 右列スペーサー | **A** | `surface-sunken` |
| l.1023 | `.verse-grid-footer-right` | COMPARE | 右列フッター | **A** | `surface-sunken` |
| l.1050 | `.app-footer` | 全モード | アプリフッターバー | **A** | `surface-sunken` |
| l.2706 | `.dcv-unit` | DISCOURSE モード | 談話チェーン単位カード | **C** | 未定（A 類似だが DISCOURSE 専用 surface） |
| l.2982 | `.icl-footnote` | ICL パネル（PoC） | 脚注エリア背景 | **C** | 未定（限定的 PoC 機能） |
| l.4125 | `.sf-rel-focusband` | RELATION モード | フォーカス文脈バンド | **C** | 未定（RELATION 専用 surface） |
| l.4174 | `.sf-chip` | RELATION モード | 語チップ（非フォーカス） | **C** | 未定（RELATION 専用 chip） |
| l.4466 | `.dg-token` | RELATION モード（dg-view） | 談話文法トークンチップ | **C** | 未定（RELATION 専用 chip） |
| l.4816 | `.hdg-clause` | STRUCTURE（HDG） | FUNCTION ノード背景 | **B** | `structural-function-fill` |
| l.4852 | `.hdg-fn` | STRUCTURE（HDG） | 機能ラベルチップ背景 | **B** | `structural-function-fill` |
| l.5559 | `.cf-nodetype` | CLAUSE_FLOW | ノードタイプバッジ | **C** | 未定（CLAUSE_FLOW 専用 chip; HDG 構造ノードとは異なるコンテキスト） |

**グループ定義:**
- **Group A（比較右列 + フッター）:** 7 件。`surface-sunken` への対応が妥当。ただし DS に明示的仕様がないため視覚確認（VISUAL REVIEW）を完了条件とする。
- **Group B（STRUCTURE/HDG 構造ノード）:** 2 件（`.hdg-clause`, `.hdg-fn`）。`structural-function-fill` への対応を想定。Phase 15F-Impl の対象。H-7 解決まで変更しない。
- **Group C（その他モードの surface / chip）:** 6 件。計画書 §B-10 の当初分類外。DISCOURSE / RELATION / CLAUSE_FLOW / ICL 各モードの独自 surface・chip 背景。現 Phase スコープ外。DS 対応は各モードの設計検討時に個別判断。

**§B-10 との差異（Phase 14 時点との比較）:**  
計画書 §B-10 は Group A（7件）と Group B（3件を想定）のみ記載していたが、15F-Inv により Group C（6件）が追加判明した。Group C は Phase 15 の実装スコープ外。

**運用方針:**
- Group A は `surface-sunken` への対応が妥当だが、**背景色変化を伴うため視覚確認を完了条件とする**。DS に明示的仕様がないため VISUAL REVIEW を経てから確定扱いにする。
- Group B は Phase 15F-Impl の対象。H-7 解決まで変更しない。
- Group C は現 Phase 対象外。各モード設計時に個別に対応判断する。
- **Phase 15A では `--bg-inset` を変更しない。**15F および比較右列の視覚確認後に段階的に対応する。

---

## C. Phase 15 実装フェーズ

### 設計方針

- **accent 色（Phase 15D）は 15A–C 完了後に着手する。**（H-1 DECIDED）  
  radius・フォーカス・pill 形状が安定した状態でアクセント色の変化を評価しやすくする。
- **accent 値 `#2c4f34` は暫定値として実装し、実機評価後に正式確定する。**（H-12 PROVISIONAL）  
  DS はコントラスト検証済みと明記しており、暫定のままでも品質基準は満たす。
- **breadcrumb は ui-sans 変更方針確定。**（H-10 DECIDED）  
  ただしモバイル実機確認と中間幅確認が完了するまで視覚確認完了とはしない。
- **背景色（`--bg #ffffff → #fbfaf7`）は現 Phase で変更しない。**（H-9 DEFER）  
  長時間実機評価が前提。ヘッドレスブラウザでは評価不能。
- **`--bg-inset` は 15A では変更しない。**用途分類（§B-10）を先行させ、段階的に対応する。
- **radius 変更は ink/border/shadow 変更と分けて進めることを推奨する。**  
  radius-s/m の変更は多数のコンポーネントに影響するため、2パスに分割して回帰リスクを管理する。
- **Structural Reading の色変更（Phase 15F）は H-7 解決が前提ゲート。**  
  H-7 未解決のまま 3 色実装を先行しない（§3-4 DEFER）。ただし調査フェーズは H-7 と独立して実施できる。

---

### Phase 15A: 共有トークン移行（accent・背景・structural nodes を除く）

**対象ファイル:** `public/css/tokens.css`（主）、`public/index.html`（比較右列 line-height 1箇所）

**変更内容（推奨 2パス）:**

**Pass 1 — ink / border / shadow / --bg-panel:**

| 変更 | 現行 → DS 値 |
|---|---|
| `--text` / `--text-main` | `#1d1d1f` → `ink-primary #211f1a` |
| `--text-sub` | `#6e6e73` → `ink-secondary #57534a` |
| `--text-hint` | `#8e8e93` → `ink-tertiary #8a8577` |
| `--border` | `rgba(0,0,0,0.07)` → `border-hairline #e6e2d7` |
| `--border-strong` | `rgba(0,0,0,0.12)` → `border-strong #cdc7b6` |
| `--bg-panel` | `#f5f5f7` → `surface-sunken #f3f1ec` |
| `--shadow-card` | 既存値 → `shadow-panel: 0 1px 2px rgba(33,32,28,0.05), 0 6px 20px rgba(33,32,28,0.07)` |

**Pass 2 — radius:**

| 変更 | 現行 → DS 値 |
|---|---|
| `--radius-s` | `6px` → `4px` |
| `--radius-m` | `12px` → `8px` |
| `--radius-pill` 追加 | なし → `999px` |

**Pass 2 に含める index.html 変更:**

| 変更 | 箇所 |
|---|---|
| 比較右列 line-height: 2.1 → `30px`（`verse-ja-comparison` 準拠） | `.verse-pair-right .jp-text` 周辺 |

**変更しないもの:**

| 項目 | 理由 |
|---|---|
| `--accent: #5a6e82` | H-1 DECIDED（15D で実施）|
| `--bg: #ffffff` | H-9 DEFER（長時間実機評価が前提）|
| `--bg-inset: #fafafa` | 用途分類未完了（§B-10）|
| `--color-domain: #7a7aaa` | 構造ラベル色として使用中。focus-visible からの除去は 15B |

**前提条件:** なし（このフェーズが起点）

**主な回帰リスク:**
- Pass 1: `--border` が rgba → 固定値に変わる。現行のαブレンドとの印象差あり
- Pass 1: `--bg-panel` が `#f5f5f7` → `#f3f1ec` に変わる。Research Panel・BottomNav 等の背景が変化する
- Pass 2: `--radius-s` が `6→4px`。影響コンポーネント多数（`.gbc-ch-arrow`・`.reading-hint-popover`・`.hdg-fn`・`research-panel-close-btn`・`.jp-section` 等）

**Pass 1 の完了条件:**
1. 未定義 CSS 変数参照がない（ブラウザ DevTools Console に CSS 警告なし）
2. 読書画面: 本文テキスト・節番号・章ヘッダー・breadcrumb の色が DS 値に変化している（目視）
3. `--bg-panel` 変化（#f5f5f7 → #f3f1ec）: Research Panel・BottomNav 等のパネル背景が視覚的に許容範囲にある（目視）
4. 比較右列 line-height: `30px` が適用されている

**Pass 2 の完了条件:**
1. `--radius-s` 変化による視覚崩壊がない（目視）
2. `--radius-pill: 999px` が定義されている（15C の前提）
3. Pass 1 と合わせて読書の流れが損なわれていない（本文との対比・操作の動線）

---

### Phase 15B: focus-visible 統一

**対象ファイル:** `public/index.html`（4箇所）

**変更箇所:**

| 箇所 | 行 | 変更内容 |
|---|---|---|
| `.hdg-clause--sub > .hdg-clause-label:focus-visible` | l.4926–4928 | `outline-color: var(--color-domain, #7a7aaa)` → `var(--focus-ring, var(--text))` 相当値 |
| 同上 WORD_ORDER mode override | l.5304 | `outline-color: #3a6aab` → 同上 |
| `.role-view[tabindex="0"]:focus-visible` | l.5501–5503 | `outline: 2px solid var(--accent, …)` → `2px solid var(--focus-ring, var(--text))` 相当値 |
| `.cf-clickable:focus-visible` | l.5612–5614 | `outline: 2px solid var(--accent)` → 同上 |

**補足:** `--color-domain` はこれらのルールから除去するが、トークン自体は削除しない。構造ラベル色として Phase 15F 判断まで保持する。

**前提条件:** Phase 15A Pass 1 完了（`ink-primary` の値が正しく定義されていること）

**主な回帰リスク:** LOW。フォーカス表示の色変化のみ

**完了条件:**
1. 4箇所の focus-visible ルールが ink-primary 相当色（`#211f1a`）を使っている
2. キーボード Tab 操作で StructuralNode にフォーカスが当たり、outline が暗色で表示される
3. StructuralNode のフォーカスリングが構造ボックス境界線と視覚的に区別できる（H-8 — 人間の目視確認）

---

### Phase 15C: pill 形状（ReadingStateSwitch + 翻訳チップ）

**対象ファイル:** `public/index.html`（3箇所）

**変更箇所:**

| 対象 | 行（参考）| 変更内容 |
|---|---|---|
| `.bp-segment` | l.3833 | `border-radius: var(--radius-l)` → `var(--radius-pill)` |
| `.bp-seg-btn` | l.3838 | `border-radius: var(--radius-l)` → `var(--radius-pill)` |
| `.wlv-chip` | l.3421 | `border-radius: var(--radius-s)` → `var(--radius-pill)` |

**変更内容:** 形状のみ。Active 状態の色は 15D まで変更しない（暫定の白塗り + text-main を維持）

**前提条件:** Phase 15A Pass 2 完了（`--radius-pill: 999px` が定義されていること）

**主な回帰リスク:** LOW-MEDIUM。pill 形状への変化は視覚的に明確。テキストが pill 内に収まるか確認が必要

**完了条件:**
1. `.bp-segment` / `.bp-seg-btn` / `.wlv-chip` の `border-radius` が `var(--radius-pill)` を参照している
2. 実ブラウザで ReadingStateSwitch が pill 形状で表示される
3. `.wlv-chip`（語順モード）が pill 形状で表示される
4. pill 内テキストが途切れず、クリック・タッチ動作が正常に機能する

---

### Phase 15D: accent 色採用（暫定値 #2c4f34 → 実機評価後に確定）

**着手条件:** Phase 15A–C すべて完了（H-1 DECIDED）

**対象ファイル:** `public/css/tokens.css`、`public/index.html`

**実装前調査（15F-Inv にて完了）:**

`--accent` / `--highlight` 系トークンの全参照: **合計 128 件**（index.html + tokens.css）。

| alias トークン | 現在値 | 15D 後の値 | 変更箇所 |
|---|---|---|---|
| `--accent` | `#5a6e82` | `#2c4f34`（暫定） | tokens.css のみ（cascades 自動）|
| `--accent-light` | `rgba(90,110,130,0.10)` | `rgba(44,79,52,0.10)` | tokens.css で手動再計算 |
| `--accent-mid` | `rgba(90,110,130,0.20)` | `rgba(44,79,52,0.20)` | tokens.css で手動再計算 |
| `--accent-dark` | `var(--text)` | 変更なし | — |
| `--highlight` | `var(--accent)` | 変更なし（alias）| — |
| `--highlight-light` | `var(--accent-light)` | 変更なし（alias）| — |

**影響 UI 領域（主要）:** サイドバーアクティブ状態、verse 選択ハイライト、StudyPanel タブ、翻訳チップ hover/active、RELATION モードフォーカスアーク、談話チェーン接続語、各種 hover 背景、時制テキスト装飾（present/aorist/perfect/future/indicative/imperative）

tokens.css の `--accent`・`--accent-light`・`--accent-mid` 3 値を変更するだけで、全 128 参照が cascades を通じて自動更新される。ただし `--accent-light`・`--accent-mid` は literal rgba 値のため手動再計算が必要。

**変更内容:**

| 変更 | 内容 |
|---|---|
| `--accent: #5a6e82` → `#2c4f34`（暫定値） | `public/css/tokens.css` |
| alias トークン再計算 | `--accent-light`・`--accent-mid` 等（調査後に確定）|
| ReadingStateSwitch active 状態 | `rgba(255,255,255,0.92)` 白塗り → `accent-greek-700` 塗り + `ink-on-accent #ffffff` テキスト |
| BottomNavigation アクティブ色 | 現行なし → `accent-greek-700` |
| `.v-num` 節番号色 | `var(--text-hint)` → `var(--text-sub)`（DESIGN.md §4-3、H-1 と連動）|

**主な回帰リスク:** HIGH
- 全インタラクティブ要素の色相が青灰から深緑へ変化
- `structural-morphology-ink`（#316148 緑）と accent-greek-700（#2c4f34 深緑）の近接
- verse-anchor（`.v-num.verse-anchor`）が現行 `--accent` 参照のため変化する

**完了条件（H-12 暫定PASS — 2026-09-29）:**
1. ✅ `--accent` 値が `#2c4f34`（暫定値）— Playwright 実測確認済み
2. ✅ ReadingStateSwitch active 状態が深緑塗り + 白テキスト — computed style 確認済み
3. ✅ BottomNavigation のアクティブタブ（本文）に緑色変化がある — 実測確認済み
4. ✅ 本文テキスト（ink-primary）と accent 色が視覚的に区別できる — ブラウザ SS で問題なし（H-12 暫定PASS）
5. ✅ `structural-morphology-ink` と accent 色の混同なし — STRUCTURE モード SS で文脈分離を確認（H-12 暫定PASS）
6. ⏸ 実機（スマートフォン + デスクトップ）での最終確定 — H-12 残件として保留

---

### Phase 15E: breadcrumb / モバイル位置ボタンのフォント ui-sans 化

**着手条件:** H-10 DECIDED（ui-sans 方針確定済み）。15A–C との依存なし。独立して実施可能。

**対象ファイル:** `public/index.html`（5箇所 + font-size/weight 調整）

**変更箇所:**

| 箇所 | 行（参考）| 変更内容 |
|---|---|---|
| `.gbc-item` CSS | l.861 | `font-family: 'Noto Serif JP', serif` → ui-sans |
| `.gbc-item` CSS（重複） | l.873 | 同上 |
| `.gbc-ch-label` CSS | l.937 | 同上 |
| `renderGlobalBreadcrumb()` JS inline style | l.7667 | `style="font-family:'Noto Serif JP',serif;"` → ui-sans |
| `#mobile-location-btn` CSS | l.5932 | `font-family: 'Noto Serif JP', serif` → ui-sans |

**font-size / font-weight 調整（実装前確認事項）:**
- 現行: `var(--text-caption)` = `0.75rem` ≈ 12px
- DS `text-ui-label`: 13px / 18px / weight 500
- font-size を 13px に変更するかどうか（1px の拡大が各幅で許容されるか）はデスクトップ・モバイル・中間幅での確認後に決定する
- **font-family のみ変更してから視覚確認し、size/weight の調整要否を判断する方法を推奨する**

**主な回帰リスク:** LOW。ただし `#mobile-location-btn` はモバイルヘッダーの主要要素のため、実機確認必須

**完了条件:**
1. 5箇所すべてが ui-sans に変更されている
2. デスクトップ（1440px）で breadcrumb と本文テキストが視覚的に区別できる（目視）
3. モバイル実機（実機 or Playwright 390px）で `#mobile-location-btn` のフォントと可読性を確認
4. 1024px 前後の中間幅で breadcrumb が視覚的に正常に表示される
5. 上記 3・4 が確認されるまでは視覚確認完了とはしない

---

### Phase 15F: Structural Reading 色トークン（調査先行・H-7 解決後に実施）

**ステータス: PENDING — H-7 解決が実装ゲート**

DESIGN.md §3-4: 「ラベルテキストが存在する限り色分けは補助情報であり、意味定義なしの先行実装はしない」（H-7）。  
Phase 15F は H-7 解決なしに実装に入らない。ただし以下の「事前調査」は H-7 と独立して実施できる。

#### 15F-Inv: 事前コード調査（COMPLETE）

**調査完了。以下が確認済みの事実。**

---

**`--bg-inset` 全 15 参照 → §B-10 参照（Group A/B/C 分類済み）**

---

**`--color-domain` 全 9 参照（CONFIRMED）:**

| 行 | セレクター | モード | 役割 | Phase 分類 |
|---|---|---|---|---|
| l.4477 | `.dg-token--antecedent` | RELATION（dg-view） | 先行詞下線マーカー | **Group C（他モード — 現 Phase 外）** |
| l.4672 | `.dg-rel-clause` | RELATION（dg-view） | 関係節左 border | **Group C** |
| l.4676 | `.dg-rel-clause-label` | RELATION（dg-view） | 関係節ラベル色 | **Group C** |
| l.4827 | `.hdg-clause-label` | STRUCTURE（HDG） | FUNCTION ノードラベル色 | **Phase 15F-Impl 対象** |
| l.4927 | `.hdg-clause--sub > .hdg-clause-label:focus-visible` | STRUCTURE（HDG） | フォーカスリング | **Phase 15B 対象（除去のみ）** |
| l.5213 | `.dg-view .dg-token--antecedent` | RELATION（dg-view） | 先行詞下線 override | **Group C** |
| l.5254 | `.hdg-clause--root::before` | STRUCTURE（HDG） | root 節左バー装飾 | **Phase 15F-Impl 対象** |
| l.5543 | `.cf-marker` | CLAUSE_FLOW | 節マーカーテキスト色 | **Group C** |
| l.15994 | JS `_dgSvgPath` | RELATION（dg-view） | 関係節 SVG アーク | **Group C** |

---

**Construction 層（CONFIRMED）:**

- `.hdg-clause--sub` 基本 dashed border（l.4818）は **Phase 2-B override（l.5138）で `border-left: none !important` に上書き済み**。基本 dashed border は現在非表示。
- `.hdg-clause--sub.hdg-clause--appositive`（l.5156–5159）: `border-left-style: dotted; border-left-color: rgba(122,122,170,.18)` — **hardcoded**（`--color-domain` 非参照）
- `.hdg-clause--sub.hdg-clause--adj-modifier`（l.5165–5168）: `border-left-style: dotted; border-left-color: rgba(100,122,170,.16)` — **hardcoded**（同上）
- `data-hdg-depth` ベースの深度別着色（l.5269–5279）: `.hdg-clause[data-hdg-depth="N"]` に hardcoded blue 系 rgba 値 + label color `#2e5da0/4a7cbf/6495c8` — **DS structural トークンとは別系統の hardcoded color。`--color-domain` 非参照。**

→ Construction 層は `--color-domain` を直接参照していない。DS `structural-construction-*` への対応は H-7 解決 + 深度別 hardcoded color との整合設計が必要。

---

**Morphology 層（CONFIRMED）:**

- `wlv-detail-morph { display: none; }`（l.3499）— WLV 引き出しの形態表示セクションは **現在無効化**。
- `.morph-tag-pill`（l.3441–3445）: `background: var(--bg-panel); border: 1px solid var(--border-soft); color: var(--text-sub)` — **structural-morphology-* 非参照**。
- `.morph-tag-pill.core`（l.3447–3451）: `background: var(--accent-light); border-color: var(--accent-mid); color: var(--highlight)` — **accent トークン使用**。
- DS `structural-morphology-*` トークンは **現在アプリ内に実装なし**。

#### 15F-Impl: 実装（H-7 解決後）

**着手条件:** Phase 15A 完了 + 15F-Inv 完了 + H-7（意味定義）解決

**変更対象分類（15F-Inv COMPLETE による確定）:**

| 対象 | 変更内容 | 分類 |
|---|---|---|
| `.hdg-clause` 背景（l.4816） | `var(--bg-inset)` → `structural-function-fill #e7edf6` | **実装可能**（H-7 解決後）|
| `.hdg-clause-label` 色（l.4827） | `var(--color-domain)` → `structural-function-ink #32517d` | **実装可能**（H-7 解決後）|
| `.hdg-fn` 背景（l.4852） | `var(--bg-inset)` → `structural-function-fill` | **実装可能**（H-7 解決後）|
| `.hdg-clause--root::before`（l.5254） | `var(--color-domain)` → `structural-function-ink` | **実装可能**（H-7 解決後）|
| Construction 層（appositive/adj-modifier サブタイプ） | hardcoded `rgba(122,122,170,.18)` / `rgba(100,122,170,.16)` → `structural-construction-*` | **追加判断が必要**（H-7 + 深度別 hardcoded blue 系との整合設計が必要）|
| `data-hdg-depth` 別着色（l.5269–5279） | hardcoded blue 系 rgba 群 | **追加判断が必要**（深度別着色と DS structural トークンの関係を設計する必要あり。H-7 ゲート）|
| Morphology 層 `morph-tag-pill` | `--bg-panel`/`--text-sub`/`--accent-*` 参照 | **対象外（現時点）**（WLV 形態表示は無効化中。有効化された時点で設計する）|
| DS `structural-morphology-*` | 現在アプリ内に実装なし | **対象外（現時点）**（WLV 形態表示が有効化されるまで不要）|
| RELATION モード `.dg-*` の `--color-domain` | l.4477, l.4672, l.4676, l.5213, l.15994 | **対象外（現 Phase）**（構造ノード identity とは異なる relational semantics。RELATION モード設計時に別途対応）|
| CLAUSE_FLOW `.cf-marker` の `--color-domain`（l.5543） | `var(--color-domain)` → ? | **対象外（現 Phase）**（CLAUSE_FLOW 固有。DS に対応仕様なし）|
| `--color-domain` トークン削除 | Phase 15F-Impl 後に RELATION/CLAUSE_FLOW 用途が残るため | **DEFER（15F 以降、他モードの対応も完了後）**|
| `--bg-inset` Group B 用途 | Phase 15F-Impl で処理。Group A は別扱い（§B-10）| — |

**主な回帰リスク:** MEDIUM-HIGH
- 全構造ノードの色相変化（紫 → 青/紫/緑 3色系）
- `structural-morphology-ink`（緑）と `accent-greek-700`（深緑）の近接（隣接しないよう配置を確認）
- Construction / Morphology 層が混在する画面での視認性

**完了条件（H-7 解決後に確定）:**
1. 確認済み各クラスが DS structural トークンを参照している
2. 3層の色が実ブラウザで視覚的に区別できる（目視）
3. 各層のラベルテキストと色が対応している（意味が伝わる）
4. `structural-morphology-ink` と accent 色が同一画面で混同されない
5. 人間の目視確認（教育的有効性の観点）

---

## D. 実施順序と依存関係

```
Phase 15A-Pass1 (ink/border/shadow/--bg-panel)
  └─► Phase 15A-Pass2 (radius)
        └─► Phase 15B (focus-visible)
              └─► Phase 15C (pill 形状)
                    └─► Phase 15D (accent 色 #2c4f34 暫定値 → H-12 実機評価)

Phase 15E (breadcrumb ui-sans)  ←── H-10 DECIDED。15A-C と独立して実施可能

Phase 15F-Inv (構造色 コード調査) ←── COMPLETE
Phase 15F-Impl (構造色 実装)    ←── 15A 完了 + 15F-Inv 完了（済）+ H-7 解決後
```

**順序の補足:**
- 15A-Pass1 → 15A-Pass2 → 15B → 15C → 15D は直列依存
- 15E は 15A–C と独立。いつでも開始できる
- 15F-Inv は完了済み（本計画書に反映）
- 15F-Impl は H-7 が最大のゲート。H-7 が解決されない限り実装しない

---

## E. 残る判断待ち・追加調査・視覚確認項目

### 人間の判断・確認が必要な項目

| H | 事項 | 最早タイミング |
|---|---|---|
| H-8 | focus-ring ink-primary: StructuralNode 上での境界線との視覚的区別 | Phase 15B 実装後 |
| H-9 | 背景色 #fbfaf7 vs #ffffff の長時間読書実機評価 | 実機環境が整い次第（現 Phase 対象外）|
| H-10 残 | breadcrumb font-size 13px / weight 500 の適用要否。モバイル実機確認。1024px 前後確認 | Phase 15E 実装後 |
| H-12 | accent-greek-700 `#2c4f34` 暫定値の実機評価と正式確定 | Phase 15D 実装後 |
| H-7 | StructuralNode 3層の意味定義（Phase 15F-Impl の実装ゲート）| **今すぐ可能**（15F-Inv 完了）。追加設計判断: Construction 層 hardcoded blue 系 rgba + depth 別着色との整合をどう扱うか |

### 追加調査が必要な項目

| 項目 | 実施フェーズ |
|---|---|
| `--bg-inset` 比較右列グループ（Group A）の DS 対応トークン確定（`surface-sunken` への統合可否）| Phase 15A 実装後の視覚確認時 |
| `data-hdg-depth` 別 hardcoded blue 系着色と DS structural トークンの整合設計 | H-7 解決後・15F-Impl 前 |

### 完了した調査

| 項目 | 状態 |
|---|---|
| Phase 15F-Inv: Construction / Morphology 層クラス、`--bg-inset` / `--color-domain` 全参照箇所 | **COMPLETE** — 本計画書 §B-5・§B-10・Phase 15F セクションに反映済み |
| Phase 15D 前: `--accent` / `--accent-*` alias の全参照箇所 | **COMPLETE** — 128 件確認済み。Phase 15D セクションに反映済み |

### 現 Phase スコープ外（DEFER）

| 項目 | 解除条件 |
|---|---|
| `--bg: #ffffff` → `surface-canvas #fbfaf7` | H-9 実機評価後 |
| `--bg-inset` の比較右列グループ対応 | 視覚確認後（DS 明示仕様なし） |
| `--color-domain` トークン削除 | Phase 15F-Impl 完了後 |
| ReadingStateSwitch 配置変更（案 A 最上位）| H-4 / H-3（追加翻訳）解決後 |
| BottomNavigation 再構成（ノートタブ等）| H-5 解決後 |
| 翻訳/モード軸の UI 分離 | H-2 / ReadingModePicker 実装時 |
| H-14 テーマ活性化機構 | 現 Phase スコープ外 |
| Translation B 拡張（KAI17/KYO）| データ・ライセンス判断先決 |
| Hebrew テーマ（H-13/H-15）| Hebrew 製品計画確定後 |
| モバイル比較スクロール方式移行 | H-3 + 節番号対応確認後 |

---

## F. 変更ファイル一覧

| ファイル | 操作 |
|---|---|
| `design-system/project/phase-15-implementation-plan.md` | **補正（本文書）** |
| `public/index.html` | 変更なし |
| `public/css/tokens.css` | 変更なし |
| `design-system/project/DESIGN.md` | 変更なし |
| `design-system/project/tokens.json` | 変更なし |
| `design-system/project/tokens.css` | 変更なし |
| `design-system/project/revision-proposal-01.md` | 変更なし |

**Git 状態:** git add / commit / push / merge は一切行っていない。アプリ本体変更なし。

---

*この文書は計画・整理のみを目的とする。各 Phase の実装開始前に DESIGN.md および本計画書の該当セクションを確認し、依存条件が満たされていることを確認してから実施する。*
