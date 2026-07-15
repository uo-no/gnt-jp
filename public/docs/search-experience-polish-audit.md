# Phase UX-8 — Search Experience Polish Audit

**生成日**: 2026-07-14  
**対象**: `search-tool.html`（index.html / StudyPanel / Knowledge Graph / Pattern Engine / Wallace Engine / search-concepts.json は対象外）  
**方針**: 監査のみ。実装変更なし。

---

## Summary

| 評価 | 件数 |
|------|------|
| GOOD | 12件 |
| ★★★★★ 改善必須 | 3件 |
| ★★★★☆ 改善推奨 | 7件 |
| ★★★☆☆ 現状維持 | 6件 |
| BLOCK | 0件 |

最大の課題は **UI一貫性の欠如**（見出し・ボタン・チップが役割ごとに統一されていない）と **言語の階層混在**（初心者向けと専門家向けが同列に並ぶ）の2点。機能は揃っているが、体験として「一つのツール」に見えていない。

---

## ① Empty State（空状態）

### 現状

```
λόγος                                  ← Greek glyph
聖書を検索する                          ← title
日本語・ギリシャ語・Strong番号で検索できます  ← desc

例                                       ← section
  [ἀγαπάω] [πιστεύω] [G3056]

テーマから探す
  聖書の大切なテーマから調べることができます
  [愛][祈り][信仰][救い][罪][キリスト][十字架][復活]

文法パターン
  [互いに＋命令形][μή＋命令形][ἵνα＋接続法][ἐάン＋接続法]

最近の検索                             ← 初回訪問時は非表示
```

### 評価

| 要素 | 評価 | 理由 |
|------|------|------|
| glyph `λόγος` | GOOD | 聖書アプリとして適切。Greek は文脈設定として機能している |
| title "聖書を検索する" | GOOD | 明快 |
| desc "日本語・ギリシャ語・Strong番号" | GOOD | 3入力形式を1行で提示 |
| **「例」チップ ギリシャ語のみ** | **★★★★★** | ἀγαπάω / πιστεύω は入口として機能しない。G3056 は headless 環境で 0件（要調査継続中） |
| テーマから探す | GOOD | 8テーマが初心者の主要入口として機能。説明文あり |
| 文法パターン | GOOD | 高度ユーザー向けとして適切。後方に配置 |
| 最近の検索 | GOOD | 初回非表示。使用後に自然に現れる設計 |
| **表示順序** | **★★★☆☆** | 「例（上）→ テーマ（下）」の順は逆。テーマが初心者入口なら先 |

---

## ② Search Input（検索入力）

### 現状

- ラベル: `検索語`（`.s-label`）
- placeholder: `愛・信じる・ἀγαπάω …`
- 検索アイコン: `🔍` Material Symbol `search`（左）
- 検索ボタン: アイコン `layers` + テキスト `検索する`

### 評価

| 要素 | 評価 | 理由 |
|------|------|------|
| placeholder | GOOD | 3形式を例示。ローマ字ではなく日本語・ギリシャ語の実例 |
| 検索アイコン（入力欄） | GOOD | 役割が明確 |
| **検索ボタンアイコン `layers`** | **★★★★☆** | `layers` は「レイヤー/積層」を示すアイコン。「検索する」の主アクションに相応しくない。`search` か `play_arrow` の方が意図と一致 |
| ラベル「検索語」 | ★★★☆☆ | Search icon + placeholder があれば不要。削除してもフォームの役割は伝わる |
| フォーカスリング | GOOD | `box-shadow: 0 0 0 3px var(--highlight-light)` で明確 |
| 余白 | GOOD | padding-bottom: 14px 等が適切 |

---

## ③ Search Result（検索結果）

### 現状

```
result-header:
  result-query-label (クリック可 → Abbott-Smith を開く)
  result-count (631件)

concept-insight (Concept 発火時のみ)

result-body:
  hits-count (631節)
  lemma-groups (日本語クエリ時のみ)
  hits-list:
    hit-card × 8件
    hits-toggle-btn (残り X節を表示)
    hits-overflow
  dist-panel (書物分布)
```

### 評価

| 要素 | 評価 | 理由 |
|------|------|------|
| result-query-label | **★★★★☆** | クリックで Abbott-Smith が開くが、視覚的には「タイトルテキスト」に見える。点線下線があるが薄い。ボタンらしい affordance がない |
| result-count vs hits-count | **★★★☆☆** | result-count は「1,234 件」、hits-count は「1,234 節（5 lemma）」と二段階表示。初心者には「件」と「節」の違いが分かりにくい |
| Hit card 翻訳の自動表示 | GOOD | 翻訳テキストを即座に読み込んで表示。本文優先の設計 |
| 書物分布 (dist-panel) | GOOD | ヒットの後に非干渉で配置。ナビゲーション補助として機能 |
| Progressive Disclosure (8→全) | GOOD | 最初の8件 + "残り X節を表示" で情報量を段階的に提示 |

---

## ④ Concept Insight（概念インサイト）

### 現状

```
「愛」について                     ← ci-concept-title
関連するギリシャ語                  ← ci-section-title
  [ἀγαπάω 愛する 631回] [ἀγάπη 愛 294回]   ← ci-lex-row
関連する概念                       ← ci-section-title
  [恵み][信仰][喜び][神] (最大8件 + さらに表示 (N))
▸ さらに詳しく                     ← details/summary
  └── 関連する検索 / 関連する文法
```

### 評価

| 要素 | 評価 | 理由 |
|------|------|------|
| 「「愛」について」タイトル | GOOD | 検索語を含む自然な見出し |
| **ci-section-title スタイル** | **★★★★☆** | `font-size: var(--text-caption); color: var(--text-sub)` のみ。他の section label（`.s-label`, `.empty-section-label`, `.cooc-title`）はすべて uppercase + letter-spacing があるが、ここだけ平文スタイル。視覚的に埋もれる |
| ci-lex-row（ギリシャ語行） | **★★★★☆** | クリックで Abbott-Smith が開くが、`title="Abbott-Smith 辞書を開く"` は hover-only。タップ環境では何が起こるか不明。「辞書 →」などのテキストラベルか Material Symbol アイコンがほしい |
| 関連する概念チップ | GOOD | Progressive Disclosure (≤8件 全表示、>8件 折りたたみ) が実装済み |
| 「さらに詳しく」(details) | **★★★☆☆** | `▸` が `::after` で付与されている。一方「詳細検索」サマリは `›` が `::before`。2つの details 要素が逆向きのアイコン実装。視覚一貫性なし |
| 「関連する検索」ラベル | ★★★☆☆ | 中身はパターン検索のプリセット。「検索」では抽象的。「パターンで探す」の方が中身と合う |
| 「関連する文法」ラベル | ★★★☆☆ | 同様。「文法」は中身（Wallace 型構文分類）の説明として不完全 |

---

## ⑤ Discovery（発見の導線）

### 評価

| 要素 | 評価 | 理由 |
|------|------|------|
| テーマから探す（8件） | GOOD | 初心者入口として機能 |
| Zero-hit Recovery UI | GOOD | UX-7-2-A で実装済み。「試してみる」4件チップ + ヒント |
| 最近の検索（Empty State） | GOOD | 使用後に自動表示 |
| 最近の検索（左パネル） | **★★★☆☆** | 左パネルにも `.history-block` + `.history-list` がある。Empty State の history-recent-section と**二重配置**。どちらが主かユーザーは判断できない |
| Pattern chips | **★★★☆☆** | `.layer-chip prox` クラスを使用。Prox（近接）レイヤーのオレンジ系と同色のため「近接検索用」に見える。パターン検索は別機能なのに視覚的に区別なし |

**「次に何をすればよいか」の評価**:
- 初回訪問: テーマから探す → GOOD
- 検索後 ヒットあり: 次のアクション（「本文で見る」「原文を見る」）→ GOOD  
- 検索後 0件: 試してみるチップ → GOOD（UX-7-2-A 後）
- Concept Insight 表示中: 関連する概念チップで深掘り → GOOD

---

## ⑥ Progressive Disclosure（段階的開示）

| 箇所 | 実装 | 評価 |
|------|------|------|
| 詳細検索 (左パネル) | `<details>` 折りたたみ | GOOD — 初心者にノイズなし |
| さらに詳しく (Concept Insight) | `<details>` 折りたたみ | GOOD |
| 関連する概念 (>8件) | ボタン + `display:none` → `display:contents` | GOOD |
| ヒット件数 (>8件) | ボタン + `display:none` コンテナ | GOOD |
| 書物分布 | 常時表示（ヒット後末尾） | ★★★☆☆ — dist-panel も折りたたみ対象候補。ヒット数が少ない時は有益だが、多い時は遠く見える |
| 詳細検索 内部 (morph/prox) | 各レイヤー選択時にサブUIが展開 | GOOD |

情報量は適切。展開の入口が `<details>` とカスタムボタンで混在しているが、視覚的には許容範囲内。

---

## ⑦ Visual Consistency（視覚一貫性）

### 見出し（Section Label）— 5種類が乱立

| クラス | 使用箇所 | uppercase | letter-spacing | opacity |
|--------|---------|-----------|----------------|---------|
| `.s-label` | 左パネル「検索語」「履歴」 | ✓ | 0.10em | — |
| `.empty-section-label` | Empty State「例」「テーマから探す」 | ✓ | 0.10em | 0.6 |
| `.cooc-title` / `.dist-title` | 結果パネル「よく一緒に出る語」 | ✓ | 0.12em | 0.6 |
| `.lg-cooc-title` / `.lg-hits-title` | Lemma グループ内 | ✓ | 0.1em | 0.55 |
| **`.ci-section-title`** | **Concept Insight「関連するギリシャ語」** | **✗** | **なし** | — |

→ `ci-section-title` だけスタイルが異なり、他の見出しより弱く見える。

### ボタン（4系統の混在）

| クラス | 見た目 | 使用箇所 |
|--------|--------|---------|
| `.run-btn` | Filled Primary（highlight色） | 「検索する」 |
| `.hit-open-btn-lg` | Filled Primary（highlight色） | 「本文で見る」 |
| `.hit-trans-toggle` | Ghost outline（border-soft） | 「原文を見る」 |
| `.ci-related-more-btn` | Ghost dashed（border-soft） | 「さらに表示」 |
| `.hits-toggle-btn` | Ghost outline（accent-light bg） | 「残り X節を表示」 |
| `.morph-clear-btn` | Ghost dashed（morph色） | 「選択をクリア」 |
| `.lg-more-btn` | Ghost dashed（border-soft） | Lemmaグループ内「さらに表示」 |

→ 「さらに表示」系のボタンが3種類（`.ci-related-more-btn`, `.hits-toggle-btn`, `.lg-more-btn`）。同じ役割なのに外見が違う。

### チップ（6系統）

| クラス | 形状 | 使用箇所 |
|--------|------|---------|
| `.ex-chip` | 丸ピル、20px radius、Gentium Plus | Empty State・Zero-hit Recovery |
| `.layer-chip` | 小ピル、12px radius、太字 | Concept Insight 関連チップ、Pattern chips |
| `.morph-chip` | 小ピル、10px radius、monospace | 品詞フィルター |
| `.lg-chip` | 小ピル、10px radius、prox色 | Lemmaグループ共起 |
| `.ht-badge` / `.r-badge` | 角丸矩形、8px radius | ヒットタイプバッジ |
| `.h-badge` | 角丸矩形、3px radius | 履歴バッジ |

→ Pattern chips が `.layer-chip prox`（近接オレンジ）を使っているため、「近接検索のチップ」に見える。実際はパターン検索であり別機能。

### details summary 矢印の不統一

| 箇所 | 矢印 | 位置 |
|------|------|------|
| 詳細検索 | `›`（`::before`） | テキスト左 |
| さらに詳しく（Concept Insight）| `▸`（`::after`）| テキスト右 |

→ 同じ `<details>` UI なのに異なる実装。

### フォントサイズ（hardcode 残留）

- `0.78rem`, `0.82rem`, `0.65rem`, `0.72rem` など、トークン外の値が inline style と CSS に多数残存。
- `var(--text-caption) = 0.75rem` と `0.78rem` が近接して使われており、意図的区別か誤りか不明。

### 色エイリアスの重複使用

tokens.css にて `--ink-soft: var(--text-hint)` と `--ink-muted: var(--text-sub)` が定義されているが、search-tool.html では `var(--ink-soft)`, `var(--ink-muted)`, `var(--text-sub)`, `var(--text-hint)` が混在。同一色に4つの参照名が使われている。

---

## ⑧ Language Audit（言語審査）

### 用語評価

| 用語 | 場所 | 初心者 | 評価 |
|------|------|--------|------|
| 聖書原文検索 | 左パネルヘッダー | △ | 「原文」は専門語だが題名として許容 |
| 検索語 | 入力ラベル | ✓ | 平易 |
| 語根で探す | 検索レイヤー | △ | 「語根」は神学生には分かるが初心者には難しい。説明文がフォローしている |
| フレーズで探す | 検索レイヤー | ✓ | 明快 |
| 近くに出てくる語 | 検索レイヤー | ✓ | 自然な日本語 |
| 品詞・語形で絞る | 検索レイヤー | △ | 「語形」はやや専門的 |
| 詳細検索 | 折りたたみ | ✓ | 一般的な用語 |
| **特徴共起** | 結果パネル | ✗ | **専門統計用語。初心者には意味不明** |
| テーマから探す | Empty State | ✓ | 非常に自然 |
| 試してみる | Zero-hit | ✓ | 自然 |
| **原文を見る** | Hit card | △ | 「原文」がギリシャ語を指すことが非自明。「ギリシャ語を見る」の方が明確 |
| 本文で見る | Hit card | ✓ | 「本文」は自然な日本語 |
| さらに詳しく | Concept Insight | ✓ | 自然 |
| 関連する概念 | Concept Insight | △ | 「概念」はやや抽象的。「関連するテーマ」の方が初心者寄り |
| **関連する検索** | Concept Insight | △ | 「検索」が目的語？意味が不明瞭 |
| **関連する文法** | Concept Insight | △ | 「文法」で何が分かるか不明 |
| さらに表示 (N) | Concept Insight | ✓ | 明確 |
| 残り N節を表示 | 結果リスト | ✓ | 明確（「節」は聖書用語として適切） |
| 履歴 | 左パネル | ✓ | 明快 |
| 最近の検索 | Empty State | ✓ | 明快 |

### 専門語の初心者への影響

**高リスク（意味が全く伝わらない可能性）**:
- 「特徴共起」→ 「よく一緒に出る語」が表示名として使われているが、`.cooc-title` の実際の表示は "よく一緒に出る語" と "特徴共起" が文脈で混在
  - line 1384: `よく一緒に出る語`（コードに直書き）
  - line 3765: `特徴共起`（Lemmaグループ内コードに直書き）

**中リスク（文脈から推測できるが確信がない）**:
- 「原文を見る」「語根」「語形」

---

## ⑨ Interaction Audit（インタラクション審査）

### ユーザー種別ごとの評価

#### 初心者（聖書に親しんでいる一般信徒）

| 場面 | 評価 | 課題 |
|------|------|------|
| 初回訪問 | GOOD | テーマから探すが目立つ |
| テーマチップクリック | GOOD | 即検索、Concept Insight 表示 |
| 結果を読む | GOOD | 日本語翻訳が自動表示される |
| 「本文で見る」クリック | GOOD | index.html へ遷移 |
| **「原文を見る」クリック** | IMPROVE | ギリシャ語コンテキストが展開するが、初心者には「何が見えるか」が予測できない |
| **result-query-label クリック** | IMPROVE | Abbott-Smith モーダルが開くが、テキストがクリックできると気づかない |
| 0件 | GOOD（UX-7-2-A 後） | 試してみるチップで再検索可能 |

**クリック数（初心者が Concept を探して1件読む場合）**: 2クリック（テーマチップ → 本文で見る）

#### 牧師（説教準備・テーマ研究）

| 場面 | 評価 | 課題 |
|------|------|------|
| 語根検索 | GOOD | Lemma グループで語義別に整理 |
| 書物分布確認 | GOOD | dist-panel が結果後に自然に現れる |
| 関連する概念から発展 | GOOD | Concept Insight から別テーマへ |
| URL共有 | GOOD | コピーボタン + URLへの状態保存 |

**クリック数（「愛」を検索→書物分布確認→ローマ書の絞り込み）**: 3操作

#### 神学生（言語・形態素研究）

| 場面 | 評価 | 課題 |
|------|------|------|
| ギリシャ語直接入力 | GOOD | 即 lemma 検索 |
| 詳細検索 → 品詞絞り | GOOD | morph フィルターが機能 |
| 近接検索 | GOOD | prox スライダーで距離調整 |
| **「詳細検索」発見性** | IMPROVE | 折りたたまれており、初回は見落とす可能性 |
| Abbott-Smith 参照 | ★★★☆☆ | result-query-label クリックで開くが affordance 不明 |

### 迷うポイント（全ユーザー共通）

1. **検索ボタンアイコン `layers`** — 「レイヤー設定を変える」ボタンに見える
2. **「原文を見る」** — 何が展開するか予測できない
3. **`result-query-label`** — 点線下線があるがクリック可能と気づきにくい
4. **Concept Insight と通常結果の関係** — 知識カードが「検索結果の一部」なのか「別の情報源」なのか不明確
5. **History の二重配置** — 左パネルと Empty State 両方にある

---

## ⑩ Design System Audit（デザインシステム審査）

### 現在使われている UI コンポーネントの分類

| コンポーネント種別 | クラス | 使用箇所 | 設計一貫性 |
|------------------|--------|---------|-----------|
| **Primary Button** | `.run-btn`, `.hit-open-btn-lg` | 「検索する」「本文で見る」 | ✗ 2種類が同等の filled primary |
| **Ghost Button** | `.hit-trans-toggle`, `.ci-related-more-btn`, `.hits-toggle-btn`, `.lg-more-btn`, `.morph-clear-btn` | 「さらに表示」等 | ✗ 5種類 |
| **Chip（選択系）** | `.ex-chip` | テーマ・例チップ | ✓ |
| **Chip（ラベル系）** | `.layer-chip .lemma/.phrase/.prox/.morph` | Concept・Pattern | ✗ Pattern に prox 色を流用 |
| **Chip（フィルター）** | `.morph-chip` | 品詞フィルター | ✓ |
| **Badge（情報表示）** | `.ht-badge`, `.h-badge`, `.r-badge` | ヒットタイプ・履歴 | ✗ 3種類（形状・radius 異なる） |
| **Section Label** | `.s-label`, `.empty-section-label`, `.cooc-title`, `.ci-section-title` 他 | 見出し | ✗ 5種類（uppercase 有無が不統一） |
| **Card** | `.hit-card`, `#concept-insight` | 結果・Insight | △ 意図的差別化（bg/radius）は適切 |
| **Details/Expand** | `.advanced-layers`, `.ci-advanced` | 折りたたみ | ✗ 矢印位置が逆 |
| **Empty State** | `.state-empty` | 空状態 | ✓ 単一実装 |
| **Result Card** | `.hit-card` | 検索ヒット | ✓ 統一 |
| **Concept Card** | `#concept-insight` | 知識カード | ✓ 単一実装 |

### 役割重複の問題

- **Filled Primary ボタンが2種**: `.run-btn` と `.hit-open-btn-lg` は視覚的に同等だが意味上の重要度が異なる（「検索する」はアプリのメイン動詞、「本文で見る」は結果内アクション）
- **「さらに表示」ボタンが3種**: 同じ「展開する」というインタラクションに対してスタイルが異なる
- **Badge が3種**: `.ht-badge`（8px radius）、`.h-badge`（3px radius）、`.r-badge`（10px radius）— 同じ「種別を示すラベル」が radius だけで区別されている

---

## Phase UX-9 提案

### Low Risk（低リスク・高効果）

#### UX-9-1: 「例」チップに日本語を追加 ★★★★★
- **対象**: search-tool.html の Empty State「例」セクション
- **変更**: ギリシャ語3件をそのままに、日本語例（「赦し」「希望」等）を1〜2件追加するか、「例」を「日本語の例」と「ギリシャ語の例」に分割
- **効果**: 初心者が最初に試す入口が日本語になる
- **難易度**: 低（HTML 追記のみ）
- **影響範囲**: Empty State のみ

#### UX-9-2: 検索ボタンアイコンを `search` に変更 ★★★★☆
- **対象**: search-tool.html の `.run-btn`
- **変更**: `layers` → `search`（Material Symbols Outlined）
- **効果**: 「レイヤー設定」ではなく「検索実行」が伝わる
- **難易度**: 低（HTML 1行変更）
- **影響範囲**: ボタン外観のみ

#### UX-9-3: `ci-section-title` を他の見出しと統一 ★★★★☆
- **対象**: search-tool.html CSS（`.ci-section-title` スタイル）
- **変更**: `letter-spacing: 0.10em; text-transform: uppercase;` を追加（`.empty-section-label` と同一化）
- **効果**: Concept Insight 内の見出しが他セクションと視覚的に統一
- **難易度**: 低（CSS 2行）
- **影響範囲**: Concept Insight 表示のみ

#### UX-9-4: 「原文を見る」→「ギリシャ語を見る」 ★★★☆☆
- **対象**: search-tool.html JS（`_buildUnifiedCard`）
- **変更**: ボタンテキストを「原文を見る」→「ギリシャ語を見る」、「原文を閉じる」→「ギリシャ語を閉じる」
- **効果**: 初心者が「何が見えるか」を予測できる
- **難易度**: 低（JS 2行変更）
- **影響範囲**: Hit card のボタンのみ

#### UX-9-5: 「特徴共起」→「よく一緒に出る語」に統一 ★★★☆☆
- **対象**: search-tool.html JS（`_renderLemmaGroups`）
- **変更**: `特徴共起` を `よく一緒に出る語` に変更（line 3765）
- **効果**: 専門語が消え、既存の cooc-title と統一される
- **難易度**: 低（JS 1行変更）
- **影響範囲**: Lemma グループ内ヘッダーのみ

---

### Medium Risk（中リスク）

#### UX-9-6: details summary の矢印方向・スタイルを統一 ★★★★☆
- **対象**: search-tool.html CSS（`.advanced-layers-toggle`, `.ci-advanced-toggle`）
- **変更**: 両方を同一の `::before`（または `::after`）+ 同一グリフに統一
- **効果**: 折りたたみ UI の一貫性
- **難易度**: 低〜中（CSS 変更のみ、視覚テストが必要）
- **影響範囲**: 詳細検索 + Concept Insight さらに詳しく

#### UX-9-7: Pattern chips の色を独立させる ★★★☆☆
- **対象**: search-tool.html JS（`_renderPatternChips`）および CSS
- **変更**: `.layer-chip prox`（オレンジ系）から `.layer-chip morph`（紫系）または新クラス `pattern` への変更
- **効果**: パターン検索チップが「近接レイヤー」ではなく独立した機能に見える
- **難易度**: 中（JS + CSS、パターン検索全体の視覚確認が必要）
- **影響範囲**: Pattern chips の色のみ

#### UX-9-8: `result-query-label` にクリック可能な affordance を付与 ★★★★☆
- **対象**: search-tool.html CSS（`.result-query`）
- **現在**: `border-bottom: 2px dotted var(--border-soft)` + hover で色変化
- **変更**: hover 時に下線を実線・より濃い色に変化させるか、辞書アイコンを横に追加
- **効果**: Abbott-Smith へのリンクが発見可能になる
- **難易度**: 中（CSS + 可能ならアイコン追加）

#### UX-9-9: 「さらに表示」ボタンを1種類に統一 ★★★☆☆
- **対象**: `.ci-related-more-btn`, `.lg-more-btn`, `.hits-toggle-btn`
- **変更**: 共通クラス（例: `.expand-btn`）を定義し3箇所で使用
- **効果**: 同じ「展開する」インタラクションが統一されたビジュアルに
- **難易度**: 中（CSS 整理 + 3箇所の HTML 変更 + 回帰テスト）

---

### High Risk（高リスク・影響範囲大）

#### UX-9-10: Badge を2種類に統一 ★★★☆☆
- **対象**: `.ht-badge`, `.h-badge`, `.r-badge`
- **変更**: 「ヒットタイプバッジ」1種 + 「小ラベル」1種 に整理。radius / padding の差を解消
- **効果**: デザインシステムの整合性
- **難易度**: 高（3種類のバッジが各所に存在。全面的な視覚テストが必要）

#### UX-9-11: Section Label を2種類に統一 ★★★★☆
- **対象**: `.s-label`, `.empty-section-label`, `.cooc-title`, `.ci-section-title`, `.lg-cooc-title`
- **変更**: 「大文字見出し」1種 + 「通常見出し」1種 に整理
- **効果**: デザインシステムの整合性
- **難易度**: 高（全箇所の統一が必要。`ci-section-title` 単独修正は UX-9-3 として分離済み）

---

## Phase UX-9 実施順序（推奨）

| 順番 | Phase | 内容 | リスク | UX効果 |
|------|-------|------|--------|--------|
| 1 | UX-9-1 | 「例」チップに日本語を追加 | Low | ★★★★★ |
| 2 | UX-9-2 | 検索ボタンアイコン修正 | Low | ★★★★☆ |
| 3 | UX-9-3 | ci-section-title 統一 | Low | ★★★★☆ |
| 4 | UX-9-5 | 「特徴共起」→「よく一緒に出る語」 | Low | ★★★☆☆ |
| 5 | UX-9-4 | 「原文を見る」→「ギリシャ語を見る」 | Low | ★★★☆☆ |
| 6 | UX-9-6 | details 矢印統一 | Medium | ★★★★☆ |
| 7 | UX-9-8 | result-query-label affordance | Medium | ★★★★☆ |
| 8 | UX-9-7 | Pattern chips 色分離 | Medium | ★★★☆☆ |
| 9 | UX-9-9 | 「さらに表示」ボタン統一 | Medium | ★★★☆☆ |
| 10 | UX-9-11 | Section Label 全統一 | High | ★★★★☆ |
| 11 | UX-9-10 | Badge 統一 | High | ★★★☆☆ |

---

## GOOD（そのまま維持すべき要素）

1. **Progressive Disclosure の3層設計** — 「詳細検索」「さらに詳しく」「さらに表示」が自然な階層
2. **Hit card の翻訳自動表示** — ユーザーが「見る」を押す前に読める設計
3. **Concept Insight の配置** — 検索結果の上部に非干渉で表示
4. **テーマから探す（8件）** — 初心者の主要入口として機能
5. **placeholder "愛・信じる・ἀγαπάω …"** — 3入力形式を1行で示す
6. **最近の検索の段階表示** — 初回は非表示、使用後に自動表示
7. **フォーカスリング** — `highlight-light` による明確な focus 表示
8. **URL 状態保存 + 共有ボタン** — 研究中の状態を保存・共有できる
9. **書物分布 (dist-panel)** — ヒット一覧の後に自然に配置
10. **Mobile bottom drawer** — FAB タップでパネルが下から出る実装
11. **Zero-hit Recovery UI** — UX-7-2-A で実装済み
12. **エイリアス機能** — 「信じる」→信仰、「救われる」→救い 等が自然に動作
