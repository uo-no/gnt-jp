# Phase UX-9-2 — Search Button Visual Alignment Audit

**生成日**: 2026-07-14  
**対象**: `search-tool.html`（コード変更なし・監査のみ）  
**根拠**: `docs/search-design-system.md` §4/§5/§8/§9  
**参照**: `docs/search-experience-polish-audit.md` SI-01

---

## 1. 現在の状態

### 1-1. 検索ボタン（`.run-btn`）の構成

```html
<button class="run-btn" id="run-btn" onclick="unifiedSearch()">
    <span class="material-symbols-outlined">layers</span>
    <span>検索する</span>
</button>
```

| 属性 | 値 |
|------|----|
| アイコン | `layers`（Material Symbols Outlined） |
| テキスト | `検索する` |
| 幅 | `width: 100%`（パネル全幅） |
| padding | `13px 0` |
| 背景 | `var(--highlight)`（青系 filled） |
| 文字色 | `#fff` |
| font-size | `0.88rem` |
| font-weight | `700` |
| border-radius | `8px` |
| hover | `opacity: 0.87; translateY(-1px)` |
| active | `scale(0.98)` |
| disabled | `opacity: 0.35; cursor: not-allowed` |

### 1-2. 検索入力欄の構成

```html
<div class="search-input-wrap" style="margin-bottom:10px;">
    <span class="search-icon">
        <span class="material-symbols-outlined">search</span>
    </span>
    <input class="unified-input" id="unified-search-input"
        placeholder="愛・信じる・ἀγαπάω …" …>
</div>
```

| 属性 | 値 |
|------|----|
| 左アイコン | `search`（magnifying glass）|
| placeholder | `愛・信じる・ἀγαπάω …` |
| padding-left | `44px`（アイコン分） |
| focus ring | `0 0 0 3px var(--highlight-light)` |
| font-size | `1.15rem` |

### 1-3. 周辺コンポーネントの配置順序（上から下）

```
[ 聖書原文検索 ] タイトル
[ ○ 準備中… ]  インデックス状態
──────────────────
検索語           ← .s-label（大文字見出し）
[ 🔍 愛・信じる… ] ← 入力欄（search アイコン付き）
[ layers 検索する ] ← .run-btn（★問題のボタン）
──────────────────
☑ 語根で探す    ← .layer-row.active-lemma（常時選択）
[ › 詳細検索 ]   ← .advanced-layers（折りたたみ）
──────────────────
履歴
```

### 1-4. モバイル（≤680px）の構成

| 要素 | 配置 | アイコン |
|------|------|---------|
| FAB ボタン | 画面右下固定（52px 円形） | `search` |
| 検索パネル | 底部 drawer（FAB タップで出現） | — |
| `.run-btn` | drawer 内に `.search-panel` と同構成 | `layers` |
| FAB open 時 | `layers` アイコンに変化（panel-open state） | `layers` |

---

## 2. 問題点

### 問題 B-1 — アイコン意味の不一致（Critical）

**`layers` アイコンが「検索実行」を表していない**

Material Symbols における `layers` の標準的な意味:
- 地図レイヤーの切り替え（Google Maps 等）
- ドキュメントのレイヤー管理
- 表示モードの選択・積み重ね設定

ユーザーが `layers` アイコンに期待する動作:
- 「表示する情報の層を変える」
- 「フィルターを設定する」
- 「ビューを切り替える」

**実際の動作**: `unifiedSearch()` = 検索を実行する

→ アイコンの期待と実際の動作が一致しない。

---

### 問題 B-2 — 同一画面内のアイコン分裂（Major）

**入力欄と実行ボタンで異なるアイコンを使っている**

| 要素 | アイコン | 意味 |
|------|---------|------|
| 入力欄左（`.search-icon`） | `search`（🔍） | 検索の入口 |
| 実行ボタン（`.run-btn`） | `layers` | 検索実行（≠ アイコンの意味） |

標準的な UX パターンでは、入力欄のアイコンと実行ボタンのアイコンは「同じ行為」を示すために統一されるか、入力欄アイコンが検索であればボタンも検索アイコンを持つ。現在は「検索の開始（🔍）」と「検索の実行（layers）」が別アイコンで表現されており、初見ユーザーが迷う構造になっている。

---

### 問題 B-3 — モバイル FAB とのアイコン矛盾（Moderate）

**FAB は `search` アイコン → パネル内は `layers` アイコン**

| 状態 | アイコン | ユーザーへのメッセージ |
|------|---------|---------------------|
| FAB（パネル閉） | `search` | 「タップすると検索できる」→ 正しい |
| FAB（パネル開） | `layers` | 「タップするとレイヤーが...？」→ 混乱 |
| `.run-btn`（パネル内） | `layers` | 「検索する = layers」→ 不正確 |

FAB が開いた時に `layers` アイコンに変わる理由は「パネルが開いている状態を示す」意図だが、
結果として「パネル開 = layers = 検索実行ボタン」という等号が成立してしまっている。

---

### 問題 B-4 — 「layers」がレイヤー選択 UI と視覚的に干渉（Minor）

**ボタンの `layers` アイコンが、直下のレイヤー選択行（`.layer-row`）と視覚的に紐づいて見える**

```
[ layers 検索する ] ← layers アイコン
☑ 語根で探す      ← layer-row
[ › 詳細検索 ]    ← layer-row（折りたたみ）
```

ユーザーは「このボタンを押すとレイヤーが開くのかな」と誤解する可能性がある。
実際にはボタンは検索実行で、レイヤー選択はチェックボックス行で行う。

---

### 問題 B-5 — CTA 分類の曖昧さ（Minor）

**Design System §5 に従えば `.run-btn` は Primary CTA**

しかし現在のアイコン（`layers`）は:
- 設定・フィルター操作（Utility 的なイメージ）を連想させる
- アプリの「最重要アクション」としての視覚的な強さが、テキスト `検索する` にのみ依存している

Primary CTA はアイコンもラベルも「最重要アクション」であることを示す必要がある。

---

## 3. 評価表

| 軸 | 現在の評価 | 理由 |
|----|-----------|----|
| アイコン意味の正確さ | ✗ 不正確 | `layers` は検索実行を連想させない |
| 入力欄との統一性 | ✗ 不統一 | 入力欄 `search`、ボタン `layers` |
| Mobile FAB との統一性 | △ 部分的 | FAB は `search`、パネル内は `layers` |
| Primary CTA としての視覚強度 | ○ 十分 | filled、full-width、highlight色 |
| テキストラベルの正確さ | ✓ 正確 | `検索する` は動詞として適切 |
| hover/active フィードバック | ✓ 良好 | translateY + scale |
| disabled 状態 | ✓ 良好 | opacity 0.35 + cursor:not-allowed |
| Design System §5 準拠 | △ 部分的 | Primary 分類は正しい、アイコンのみ問題 |

---

## 4. 改善案比較

### 案 A — `layers` → `search` アイコン（最小変更）

```html
<button class="run-btn" id="run-btn" onclick="unifiedSearch()">
    <span class="material-symbols-outlined">search</span>
    <span>検索する</span>
</button>
```

**変更箇所**: HTML 1行（1語）のみ

| ペルソナ | 評価 | 理由 |
|---------|------|------|
| 初心者 | ✓✓ | 🔍 = 「検索する」が直感的に一致 |
| 一般信徒 | ✓✓ | 同上 |
| 牧師 | ✓ | 変化に違和感なし |
| 神学生 | ✓ | 同上 |

**長所**:
- 変更リスクが極めて低い（1文字）
- 入力欄・FAB と視覚統一される
- 全ペルソナに正確な意図を伝える
- Design System §5（Primary CTA は最重要アクション）と完全一致

**短所**:
- 「検索レイヤー込みで実行する」というニュアンスが消える
  → ただし現状の `layers` アイコンでも初心者はその意味を理解していない

---

### 案 B — アイコン削除、テキストのみ

```html
<button class="run-btn" id="run-btn" onclick="unifiedSearch()">
    <span>検索する</span>
</button>
```

**変更箇所**: HTML（iconスパン削除）+ CSS（gap 削除）

| ペルソナ | 評価 | 理由 |
|---------|------|------|
| 初心者 | ✓ | テキストが明確 |
| 一般信徒 | ✓ | 迷いなし |
| 牧師 | △ | ボタンが地味になる |
| 神学生 | △ | 同上 |

**長所**: アイコンの誤解が完全になくなる  
**短所**: 視覚的重みが下がる。他のボタンとの差別化が薄れる。Primary CTA として目立たなくなる

---

### 案 C — `manage_search`（虫眼鏡＋設定）アイコン

```html
<span class="material-symbols-outlined">manage_search</span>
```

`manage_search` は「虫眼鏡 + グリッド」の複合アイコン。「検索設定を管理する」または「高度な検索」を表す。

| ペルソナ | 評価 | 理由 |
|---------|------|------|
| 初心者 | △ | `manage_search` の意味が不明 |
| 一般信徒 | △ | 「設定？」と迷う可能性 |
| 牧師 | ✓ | 「詳細検索つきの実行」と読める |
| 神学生 | ✓ | 同上 |

**長所**: 「検索」＋「レイヤー（設定）」の両方のニュアンスを持てる  
**短所**: `manage_search` は世界的に知名度が低い。初心者には `layers` と同様に不明瞭

---

### 案 D — `arrow_forward` または `play_arrow` アイコン

```html
<span class="material-symbols-outlined">arrow_forward</span>
```

「実行する」「開始する」の意味。音楽プレイヤーや送信ボタンで使われる。

| ペルソナ | 評価 | 理由 |
|---------|------|------|
| 初心者 | △ | 「→」は検索ではなく「次へ」を連想 |
| 一般信徒 | △ | 同上 |
| 牧師 | ✓ | 実行ボタンとして解釈可能 |
| 神学生 | ✓ | 同上 |

**長所**: 「実行」の意味は伝わる  
**短所**: 「検索」の意味は伝わらない。入力欄の `search` アイコンとも統一感がない

---

### 案 E — アイコンなし → ラベル変更「🔍 検索する」（テキスト絵文字）

絵文字を使う案。Design System は「Only use emojis if the user explicitly requests it」のため対象外。

---

## 5. 推奨方針

### 推奨: 案 A — `layers` → `search`

**理由**:

#### 1. Design System との一致

`docs/search-design-system.md` §5 CTA Hierarchy:
> Primary は「検索する」と「本文で読む」のみ。

§9 Interaction Rules:
> インタラクションを持つ要素のラベルは動詞から始める。

検索実行ボタンの Primary アクションは「探す（unifiedSearch）」である。
`search` アイコンはこれを正確に表現する。`layers` は表現しない。

#### 2. 画面内統一性

| 要素 | 案 A（推奨） | 現在 |
|------|------------|------|
| 入力欄左アイコン | `search` | `search` |
| 実行ボタンアイコン | `search` | `layers` |
| Mobile FAB（閉） | `search` | `search` |
| Mobile FAB（開） | `layers`（現状維持） | `layers` |

案 A では入力欄・実行ボタン・FAB（閉）が揃い、「検索行為」の視覚的ループが完成する。

#### 3. 初心者理解度

`search` アイコンは世界標準の検索記号。ギリシャ語を知らない初心者でも「このボタンを押すと検索できる」と即座に理解できる。Empty State のタイトル「聖書を検索する」との視覚的一貫性も保たれる。

#### 4. 変更リスクの低さ

HTML の `layers` を `search` に変更するのみ。CSS・JS・検索ロジック・外部ファイルへの影響はゼロ。

#### 5. 既存設計との整合

`layers` を残す理由として「検索レイヤー（lemma/phrase/prox/morph）込みで実行する」という設計意図が考えられるが:
- その意図は現在のユーザーには伝わっていない（UX-8 SI-01 審査結果）
- レイヤー選択はボタン直下の `.layer-row` で行う。ボタン自体に「どのレイヤーで実行するか」を表示する必要はない
- `search` アイコンに変えても、レイヤーを選択してから「検索する」という操作フローは変わらない

---

## 6. 実装時の変更範囲

### 案 A 実装の場合

**変更対象**: `search-tool.html` のみ

**変更箇所**: 1行・1語

```
変更前:
    <span class="material-symbols-outlined">layers</span>

変更後:
    <span class="material-symbols-outlined">search</span>
```

**影響範囲**:

| 対象 | 影響 |
|------|------|
| HTML | 1行変更 |
| CSS | 変更なし（`.run-btn` スタイルはそのまま） |
| JS | 変更なし（`unifiedSearch()` はそのまま） |
| 検索ロジック | 変更なし |
| 他ファイル | 変更なし |

**視覚的変化**: `layers`（积層アイコン）→ `search`（虫眼鏡アイコン）のみ

**関連注記**:
- Mobile FAB が「パネル開」状態で `layers` アイコンに変わる挙動（`_toggleMobilePanel`）は現状維持
  - この挙動は「パネルを閉じる」という別の操作を指すため、変更対象が異なる
  - 将来的に FAB open 状態のアイコンも `close` に変更することを検討できるが、今回のスコープ外

---

## 7. 監査サマリー

| 問題 | 深刻度 | 案 A で解決 |
|------|--------|-----------|
| B-1: アイコン意味の不一致 | Critical | ✓ |
| B-2: 入力欄とのアイコン分裂 | Major | ✓ |
| B-3: Mobile FAB とのアイコン矛盾（閉状態） | Moderate | ✓（閉状態のみ） |
| B-4: layers が layer-row と視覚干渉 | Minor | ✓ |
| B-5: CTA 分類の曖昧さ | Minor | ✓ |

**結論**: `search` アイコンへの変更は、1行・ゼロリスクで Critical 問題を解決する。
Design System §5 / §8 / §9 との整合性も完全。実装を推奨する。
