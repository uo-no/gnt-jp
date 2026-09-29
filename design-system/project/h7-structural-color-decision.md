# H-7 構造色 3層の意味定義：判断資料

**作成日:** 2026-09-29  
**更新日:** 2026-09-29（Q1・Q4 確定、Q3 推奨案追記）  
**性質:** 判断資料のみ。アプリコード・DESIGN.md・tokens・実装計画書への変更なし。  
**前提:** Phase 15F-Inv（コード調査）完了済み。

---

## 1. 確定した全体カラーパレット方針

以下はユーザーが確定した方針として記録する（DECIDED）。

| 項目 | 確定内容 |
|---|---|
| ギリシャ語版のテーマ色 | **緑系で統一**。青系は旧配色であり、今後のギリシャ語版の基本色にはしない |
| ヘブライ語版のテーマ色 | 赤系を使用（将来）|
| 構造色のパレット | ギリシャ語版の構造色は緑系パレット内で意味の違いを色調・濃淡によって表す |
| 深度の表現方法 | 深度の違いは色で表さない。**インデントを中心に表現する**（確定）|

### 既存 DS 構造色トークンとの齟齬

DESIGN.md §3-4 の現行トークン定義はグリーン方針確定以前に設計されており、青/紫を使用している。

| トークン | 現行値 | 方針との関係 |
|---|---|---|
| `structural-function-fill` | `#e7edf6`（淡青） | **不整合** — 青系はギリシャ語版から除外 |
| `structural-function-ink` | `#32517d`（青系） | **不整合** |
| `structural-construction-fill` | `#ece6f5`（淡紫） | **不整合** — 紫系も除外の方向 |
| `structural-construction-ink` | `#5a4785`（紫系） | **不整合** |
| `structural-morphology-fill` | `#e6f0ea`（淡緑） | **整合** — 緑系として方針に沿う |
| `structural-morphology-ink` | `#316148`（緑系） | **整合** |
| `structural-connector` | `#a49c86`（暖色灰） | 中立色。変更不要の可能性 |

**結論（CONFIRMED）:** 現行 DS の `structural-function-*` と `structural-construction-*` の色値は、緑系パレット方針に基づいて再設計が必要。`structural-morphology-*` は方針に沿い、継続使用候補。

**注意:** DESIGN.md と tokens.css は本作業では変更しない。トークン値の更新は別工程。ただし本判断資料に「既存トークン値を使う」と記録することは誤りになるため、以降では「再設計が必要な値」と明示する。

---

## 2. DESIGN.md に定義されている 3 層の意味（原文記録）

### 2-1. §3-4 構造色トークン（定義は CONFIRMED、色値は再設計対象）

| レイヤー | DESIGN.md §3-4 の意味定義 | 色値の状態 |
|---|---|---|
| FUNCTION | 主語・動詞・目的語・補語など**統語機能** | 再設計対象（現行=淡青） |
| CONSTRUCTION | 同格・並列・節の入れ子など**構成関係** | 再設計対象（現行=淡紫） |
| MORPHOLOGY | 格・時制・法など**語形変化タグ** | 継続使用候補（現行=淡緑・整合）|
| connector | ノードを繋ぐ線・括弧。意味を単独で担わない | 変更不要の可能性（暖色灰）|

意味の定義自体は変更しない。色値のみ再設計する。

### 2-2. §6-2 StructuralNode 仕様（CONFIRMED）

- Reed–Kellogg 式ネスト+インデント表現。`structural-connector` 色の細い接続線で親子関係を示す
- **「既定は FUNCTION 層のみ展開、CONSTRUCTION/MORPHOLOGY はタップで開く（Progressive Disclosure）」**
- 各層は色に加えて `structural-tag` ラベルを必ず併記する（色単独で意味を担わない）

### 2-3. revision-proposal-01.md §2-B（補足）

- ラベルが存在する限り色分けは補助情報。未実装でも機能成立
- 3色化が情報過多になる可能性を指摘。意味定義と実ユーザー評価が揃うまで単色維持を推奨

---

## 3. 現行アプリの実装事実（CONFIRMED from code）

### 3-1. HDG 視覚要素と現在の色

| 要素 | クラス | 役割 | 現在の背景色 | 現在のテキスト色 |
|---|---|---|---|---|
| Root 節ボックス | `.hdg-clause.hdg-clause--root` | 主節コンテナ | `rgba(50,100,170,0.00)`（透明）| — |
| Root 左バー | `.hdg-clause--root::before` | 文の起点マーカー | `#3a6aab`（青・hardcoded）| — |
| 従属節ボックス depth 1 | `.hdg-clause--sub` + `[data-hdg-depth="1"]` | 節構造コンテナ | `rgba(50,100,170,0.035)`（淡青）| — |
| 従属節ボックス depth 2 | 同上 depth 2 | 同上 | `rgba(50,100,170,0.065)` | — |
| 従属節ボックス depth 3+ | 同上 depth 3+ | 同上 | `rgba(50,100,170,0.09〜0.11)` | — |
| 節ラベル（depth 1–2） | `.hdg-clause-label` | 節の種類（「従属節」「同格」等）| — | `var(--color-domain)` 紫 |
| 節ラベル（depth 3+） | `.hdg-clause-label` + depth selector | 同上（淡化）| — | `#6495c8`（明青）opacity 0.48 |
| 機能チップ | `.hdg-fn` | 統語機能ラベル（「主語」「述語」等）| `var(--bg-inset)` | `var(--text-sub)` |

**補足:** `.hdg-clause { background: var(--bg-inset) }` は JS が全 clause に `data-hdg-depth` を付与するため実際には使われない。Group B で画面に実際に出るのは `.hdg-fn` の `--bg-inset` のみ。

### 3-2. Construction サブタイプの border（CONFIRMED）

| クラス | 現在の left border | 備考 |
|---|---|---|
| `.hdg-clause--sub`（基本）| `none !important`（Phase 2-E 廃止）| — |
| `.hdg-clause--sub.hdg-clause--appositive` | `1px dotted rgba(122,122,170,.18)` 薄紫 | hardcoded |
| `.hdg-clause--sub.hdg-clause--adj-modifier` | `1px dotted rgba(100,122,170,.16)` 薄青紫 | hardcoded |
| `.hdg-clause--sub.hdg-clause--pp[data-hdg-head-id]` | `2px solid rgba(74,124,191,0.55)` 青 | hardcoded |
| `.hdg-clause--sub.hdg-clause--adj-modifier[data-hdg-head-id]` | `2px solid rgba(74,124,191,0.45)` 青 | hardcoded |

これらの hardcoded 色もすべて青/紫系 → 緑系パレット方針により置換対象。

### 3-3. `.hdg-fn` ラベルの内容（CONFIRMED from `_DG_FN_JA` mapping）

`.hdg-fn` は SR JSON の `function.canonical` を日本語化した統語機能ラベル。  
例: SUBJECT→主語、PREDICATE→述語、OBJECT→目的語、ADVERBIAL→副詞語、COMPLEMENT→補語

### 3-4. DS 3層とアプリ要素の対応（CONFIRMED — Q1 確定）

| DS 概念 | 定義 | アプリ対応要素 |
|---|---|---|
| FUNCTION | 主語・動詞・目的語・補語など統語機能 | `.hdg-slot` + `.hdg-fn`（機能スロットラベル）|
| CONSTRUCTION | 同格・並列・節の入れ子など構成関係 | `.hdg-clause--sub` + `.hdg-clause-label`（節種ラベル）|
| MORPHOLOGY | 格・時制・法など語形変化タグ | なし（現在無効化）|

**確定（CONFIRMED）:** FUNCTION = `.hdg-fn` スロット（統語機能ラベル: 主語・述語・目的語等）、CONSTRUCTION = `.hdg-clause--sub` + `.hdg-clause-label`（節種ラベル: 従属節・同格・前置詞句等）。

### 3-5. 深度別ブルー系着色の意味（CONFIRMED）

コード comment（l.5260–5262）: 「depth color: 浅い=ほぼ白、深くなるほど少しずつ青が濃くなる」「visual depth = DOM上の hdg-clause 祖先数」

深度別着色は DOM 上のネスト深さを示す。DS の意味層（FUNCTION/CONSTRUCTION/MORPHOLOGY）とは直交する概念。  
**確定方針により、深度は色ではなくインデントで表現する → 深度別青系着色は廃止。**

---

## 4. 設計方向：案C（確定方針に沿って再整理）

深度廃止方針の確定により、案Aと案Cの差異（「深度着色廃止」）がなくなり、**実質的に案C（意味と深度を別属性で表す）が確定方向**になった。

### 案Cの確定変更

| 変更 | 現在 | 変更後 | 状態 |
|---|---|---|---|
| `data-hdg-depth` 別背景色 | `rgba(50,100,170, 0.035〜0.11)` | **廃止** | **DECIDED**（深度はインデントで表現）|
| depth 別ラベル色 | hardcoded 青系 | **廃止** | **DECIDED** |
| root clause `::before` の青 | `#3a6aab`（旧配色・青）| 緑系へ変更 | Q3 で確定（下記）|
| Construction hardcoded 青/紫系 | `rgba(122,122,170,...)` 等 | 緑系へ変更 | Q1 + 色割り当て確定後 |

### 案Cの未確定変更（Q1/Q3 + 色値確定後）

| 変更 | 現在 | 変更後 |
|---|---|---|
| `.hdg-fn` 背景 | `var(--bg-inset)` | `structural-function-fill`（再設計後の緑系値）|
| `.hdg-fn` 文字 | `var(--text-sub)` | `structural-function-ink`（再設計後の緑系値）|
| `.hdg-clause--sub` 背景 | `rgba(0,0,0,0.008)` | `structural-construction-fill`（再設計後の緑系値）|
| `.hdg-clause-label` 文字 | `var(--color-domain)` 紫 | `structural-construction-ink`（再設計後の緑系値）|
| appositive/adj-modifier border | hardcoded rgba 青/紫 | `structural-construction-ink` at opacity（再設計後）|
| root `::before` | `#3a6aab` 青 | Q3 の答えに基づく緑系値 |

---

## 5. 緑系パレット内での3層の色割り当て案

### 5-1. 基本方針（確定）

- 3層すべてが緑系の色調・濃淡の違いで区別される
- 深度は色ではなくインデントで表現
- MORPHOLOGY は `structural-morphology-fill #e6f0ea` / `structural-morphology-ink #316148`（既存）を基準として継続
- FUNCTION と CONSTRUCTION は既存トークン（青/紫）を置換する新しい緑系値が必要
- `structural-morphology-ink (#316148)` と `accent-greek-700 (#2c4f34)` は意図的に別の明度・彩度で設計されている（DESIGN.md §3-4 注記）— この原則は緑系再設計後も維持する

### 5-2. 既存緑系トークン（参照値）

| トークン | 値 | 明度感 | 色調 |
|---|---|---|---|
| `accent-greek-050` | `#f5f8f3` | 最も明るい | 暖かみのある淡緑 |
| `accent-greek-100` | `#e4ecdf` | 明るい | やや黄みがかった淡緑 |
| `structural-morphology-fill` | `#e6f0ea` | 明るい | やや青みがかった淡緑 |
| `accent-greek-300` | `#93b389` | 中間 | 中彩度の緑 |
| `structural-morphology-ink` | `#316148` | 暗い | 中〜暗い緑（ ink 用）|
| `accent-greek-600` | `#3c6b45` | 暗い | 暗い緑（hover 状態）|
| `accent-greek-700` | `#2c4f34` | 最も暗い | 最も暗い深緑（プロダクトアクセント）|

**重要な制約:**  
- 新しい構造 ink 色は `accent-greek-700 (#2c4f34)` と明度・彩度が十分に異なること
- 各 fill + ink ペアは 4.5:1 コントラスト比を達成すること（DS 既存基準）
- 3つの fill は互いに区別可能なこと

### 5-3. 3層の役割・色調方向（Q4 確定: 緑系内で視認可能な差を設ける）

**Q4 確定方針:** 色調の厳密な方向指定は不要。緑系パレット内で視認可能な差を設ける。  
以下の色調方向は参考案。具体的な色値は **PROPOSAL**（未承認）として提示する。

**FUNCTION 層（統語機能: 主語・述語・目的語）**

- 意味的位置づけ: 節の中で最も基本的な統語単位。主役に最も近い要素を示す
- 色調方向（PROPOSAL）: 暖かみのある薄緑。`accent-greek-100 (#e4ecdf)` に近い黄緑系の淡色
- 役割の理由: 統語機能は文の骨格。アクセントカラー（accent-greek-700）の最も薄い tint と同じ色系を使うことで、「この製品の主役の情報」であることを示す

| | fill（PROPOSAL） | ink（PROPOSAL） | 参考トークン |
|---|---|---|---|
| 方向 | `accent-greek-100 (#e4ecdf)` に近い | `structural-morphology-ink (#316148)` に近いが異なる濃淡 | 既存 accent-greek-100 / morph-ink |
| 備考 | `accent-greek-100` は選択状態 fill として使用中のため直接流用は注意。新値を設計するか、文脈が非競合なら流用可を判断する | `accent-greek-700 (#2c4f34)` とは明度差を確保 | 要コントラスト確認 |

**CONSTRUCTION 層（構成関係: 同格・等位・従属節）**

- 意味的位置づけ: 節の接続・まとまりの構造を示す。FUNCTION より一段抽象的な構造情報
- 色調方向（PROPOSAL）: やや青みを帯びた緑（FUNCTION の黄緑系と対比）。`structural-morphology-fill (#e6f0ea)` に近い系統だが、MORPHOLOGY と区別できる濃淡・色調
- 役割の理由: FUNCTION（黄緑系）と MORPHOLOGY（淡緑）の間で色調を変えることで3層を区別する

| | fill（PROPOSAL） | ink（PROPOSAL） | 参考トークン |
|---|---|---|---|
| 方向 | `structural-morphology-fill (#e6f0ea)` よりやや濃い/異なる色調の淡緑 | `structural-morphology-ink (#316148)` とは異なる明度・彩度の緑系 | 既存 morph-fill / morph-ink を参考に新値を設計 |
| 備考 | MORPHOLOGY fill との区別が最大の課題。色調（hue）か明度（lightness）のどちらかで差をつける | FUNCTION ink とも区別できること | 要コントラスト確認 |

**MORPHOLOGY 層（語形変化: 格・時制・法）**

- 現行: `structural-morphology-fill #e6f0ea` / `structural-morphology-ink #316148`（既存）
- 方針: 現行値は緑系として方針に整合 → **継続使用候補（PROVISIONAL）**
- 条件: FUNCTION fill・CONSTRUCTION fill との視覚的区別が確保されること

**connector**

- 現行: `structural-connector #a49c86`（暖色灰）
- 方針: 「ノードを繋ぐ線は意味を単独で担わない」という DS 定義は変わらない → **変更不要の可能性（PROVISIONAL）**

### 5-4. root clause `::before` 左バーの色割り当て案

Root clause ラベル「主節」は CSS で `display: none`（非表示）。左バー（`::before`）のみが可視。  
現在: `#3a6aab`（青、旧配色）→ 緑系への変更が必要。

以下の緑系候補案（Q3 の再設問として提示）:

| 選択肢 | 色調方向 | 根拠 | 状態 |
|---|---|---|---|
| **a. FUNCTION ink 相当の緑** | 再設計後の `structural-function-ink` と同系 | 主節 = 最上位 FUNCTION コンテナとして扱う | PROPOSAL |
| **b. `accent-greek-700 (#2c4f34)`** | プロダクトアクセント（深緑）| 文の起点マーカーとしてプロダクト色を使う。アクセントの「予算を使う」判断が必要 | PROPOSAL |
| **c. `structural-connector (#a49c86)`** | 中立灰色 | root は特定の意味層に属さない中立コンテナとして扱う | PROPOSAL |
| **d. 廃止（`::before` を非表示）** | なし | root の起点マーカーは不要と判断した場合 | PROPOSAL |

---

## 6. H-7 で決める範囲 / 別判断 / 現 Phase 対象外（更新）

| 項目 | 状態 |
|---|---|
| 全体カラーパレットの方針（緑系統一・深度=インデント）| **DECIDED** |
| 深度別ブルー系着色の廃止 | **DECIDED** |
| FUNCTION 層の色適用（`.hdg-fn` スロット） | **DECIDED** (Q1 確定)・トークン再設計後に 15F-Impl |
| CONSTRUCTION 層の色適用（`.hdg-clause--sub`）| **DECIDED** (Q1 確定)・トークン再設計後に 15F-Impl |
| FUNCTION / CONSTRUCTION トークン値の再設計 | 別工程（DESIGN.md + tokens 更新必要）— 具体案は `structural-color-token-proposal.md` |
| root clause `::before` の緑系色 | Q3 で確定 |
| appositive/adj-modifier hardcoded rgba の置換 | Q1 + トークン確定後に 15F-Impl |
| MORPHOLOGY 層の色適用 | 現 Phase 対象外（WLV morph 無効化中）|
| Progressive Disclosure（タップ展開）の実装 | 別フェーズ |
| `--color-domain` 全面削除 | 現 Phase 対象外（RELATION/CLAUSE_FLOW 用途が残る）|
| `--bg-inset` Group C（RELATION/CLAUSE_FLOW 等）| 現 Phase 対象外 |

---

## 7. 残る質問（確定方針から導けない部分）

### Q1（**確定済み**）: FUNCTION と CONSTRUCTION のアプリ要素対応

**CONFIRMED:**
- **FUNCTION** = `.hdg-fn`（機能スロットラベル: 主語・述語・目的語・副詞語など）
- **CONSTRUCTION** = `.hdg-clause--sub` + `.hdg-clause-label`（節種ラベル: 従属節・同格・前置詞句など）

### Q2（確定済み）: 深度別着色の廃止

> **確定: 廃止。インデントを中心に深度を表現する。**

実機でインデントのみで深度が十分に伝わるかの目視確認は、15F-Impl 実施後に行う。

### Q3（**未決**）: root clause `::before` 左バーの緑系色

§5-4 の 4 案から選択する。または別の方向を指定する。

**推奨案: b. `accent-greek-700 (#2c4f34)`**  
根拠: `::before` 左バーは統語機能（FUNCTION）でも節構造（CONSTRUCTION）でもない「文の起点マーカー」として機能する。構造意味色と混同しない観点から、プロダクトアクセント色（`accent-greek-700`）の使用が適切。コントラスト比は fill との組み合わせで十分（`structural-function-fill` 上で 7.67:1）。  
**この案はユーザーによって承認されていない。**

### Q4（**確定済み**）: 緑系3層の色調方向について

**CONFIRMED:** 色調の厳密な方向指定は不要。緑系パレット内で視認可能な差を設ける。

具体的な色値の提案は `structural-color-token-proposal.md` に記載。値はすべて PROPOSAL（未承認）。
承認後に DESIGN.md / tokens.json の structural トークン再設計に進める。

---

## 8. 15F-Impl に進むための前提条件と作業範囲

### 前提条件

| 条件 | 状態 |
|---|---|
| Phase 15A 完了 | 待ち（Phase 15A が起点）|
| 15F-Inv 完了 | **完了済み** |
| Q1: FUNCTION/CONSTRUCTION 対応確定 | **完了（§7 Q1 確定済み）** |
| Q3: root `::before` 色確定 | **未決（§7 Q3）**— 推奨案 `accent-greek-700` |
| Q4: 緑系3層の色調方向確定 | **完了（§7 Q4 確定済み）** |
| structural-function-* / structural-construction-* の再設計（DESIGN.md + tokens 更新）| **未着手**（提案値あり: `structural-color-token-proposal.md` 参照）|

### 実装時の変更対象（条件充足後）

| 作業 | 変更ファイル | 内容 |
|---|---|---|
| depth 着色廃止 | `public/index.html` | `data-hdg-depth` 別背景色・ラベル色ルール（l.5265–5303）を削除 |
| FUNCTION スロット色 | `public/index.html` | `.hdg-fn`: `--bg-inset` → 再設計後 `structural-function-fill`、`--text-sub` → 再設計後 `structural-function-ink` |
| CONSTRUCTION 節色 | `public/index.html` | `.hdg-clause--sub` 背景 → 再設計後 `structural-construction-fill`、`.hdg-clause-label` → 再設計後 `structural-construction-ink` |
| appositive/adj-modifier border | `public/index.html` | hardcoded 青/紫系 rgba → 再設計後 `structural-construction-ink` at opacity |
| root `::before` | `public/index.html` | Q3 の答えに基づく緑系値 |
| `public/css/tokens.css` のアプリ側トークン | — | `structural-*` トークン参照先が変わるため、tokens.css 更新後に app 側 CSS が自動反映される（`public/css/tokens.css` のアプリ側変数の更新は 15A 対象。structural 再設計はそれとは別）|

**注記:** `design-system/project/tokens.css` と `tokens.json` の `structural-function-*` / `structural-construction-*` 値の更新（緑系再設計）は、本 h7 ファイルに対応する別工程。それが完了して初めて 15F-Impl の CSS 変更で正しい値を参照できる。

---

## 変更ファイル一覧

| ファイル | 操作 |
|---|---|
| `design-system/project/h7-structural-color-decision.md` | **更新（本文書）** |
| `design-system/project/structural-color-token-proposal.md` | **新規作成（PROPOSAL）**（structural-function/construction トークン提案値・コントラスト比）|
| `public/index.html` | 変更なし |
| `public/css/tokens.css` | 変更なし |
| `design-system/project/DESIGN.md` | 変更なし |
| `design-system/project/tokens.json` | 変更なし |
| `design-system/project/tokens.css` | 変更なし |
| `design-system/project/phase-15-implementation-plan.md` | 変更なし |
| `design-system/project/revision-proposal-01.md` | 変更なし |

git add / commit / push / merge は一切行っていない。

---

*この文書は判断資料のみ。いかなるアプリ変更・DS変更も行っていない。*
