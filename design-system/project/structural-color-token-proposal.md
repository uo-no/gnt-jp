# 構造色トークン 緑系再設計案

**作成日:** 2026-09-29  
**性質:** 設計案（PROPOSAL）。色値はすべて未承認。承認前にアプリ実装・DESIGN.md・tokens 更新は行わない。  
**前提:** h7-structural-color-decision.md の Q1・Q2・Q4 確定を受けて作成。  
**対象外:** アプリ本体（`public/index.html`）、`public/css/tokens.css`、`DESIGN.md`、`tokens.json`、`tokens.css` は本ファイルの作成対象外。

---

## 1. 設計の前提

### 1-1. 確定方針（h7 より）

| 項目 | 確定内容 |
|---|---|
| カラーパレット | ギリシャ語版は緑系で統一 |
| Q1 | FUNCTION = `.hdg-fn` スロット、CONSTRUCTION = `.hdg-clause--sub` + `.hdg-clause-label` |
| Q2 | 深度別ブルー系着色は廃止（深度はインデントで表現） |
| Q4 | 色調の厳密な方向指定は不要。緑系パレット内で視認可能な差を設ける |
| Q3 | 未決（root clause `::before` 左バー色）— 推奨: `accent-greek-700 (#2c4f34)` |

### 1-2. 制約

- 各 fill + ink ペアは WCAG AA 4.5:1 以上のコントラスト比を確保する
- 新しい ink 色は `accent-greek-700 (#2c4f34)` と明度・彩度が十分に異なること（DESIGN.md §3-4 注記の原則を維持）
- 3つの fill は互いに色相または彩度で区別可能なこと
- MORPHOLOGY トークン（`#e6f0ea` / `#316148`）は変更しない

---

## 2. `structural-morphology-*` 継続使用の評価

### 2-1. 既存値

| トークン | 値 | HSL |
|---|---|---|
| `structural-morphology-fill` | `#e6f0ea` | H=144°, S=25%, L=92% |
| `structural-morphology-ink` | `#316148` | H=149°, S=33%, L=29% |

### 2-2. コントラスト確認

| 組み合わせ | コントラスト比 | 判定 |
|---|---|---|
| morphology-ink on morphology-fill | **6.14:1** | ✓ PASS (AA) |
| morphology-ink on surface-canvas (`#fbfaf7`) | **6.86:1** | ✓ PASS (AA) |

### 2-3. 評価

**CONFIRMED: 継続使用可能。**

- `structural-morphology-fill (#e6f0ea)` は淡い青緑（H=144°, L=92%）で、FUNCTION / CONSTRUCTION の提案 fill と色相・彩度で区別可能。
- `structural-morphology-ink (#316148)` は暗い緑（H=149°, L=29%）で、コントラスト 6.14:1 ≥ 4.5:1 を満たす。
- `accent-greek-700 (#2c4f34)` との明度差: L=29% vs L=24% — わずか 5pt。視覚的な区別は小さいが、DS 原則に従い別トークンとして維持する。

---

## 3. 提案トークン値（PROPOSAL — 未承認）

### 3-1. コントラスト計算方法

相対輝度 L の算出式（WCAG 2.1）:

```
各チャネル c_sRGB = RR/255 として
  c ≤ 0.04045 → c_lin = c / 12.92
  c > 0.04045 → c_lin = ((c + 0.055) / 1.055)^2.4

L = 0.2126 × R_lin + 0.7152 × G_lin + 0.0722 × B_lin

コントラスト比 = (L_lighter + 0.05) / (L_darker + 0.05)
```

測定条件: 通常テキスト・小サイズチップに対して WCAG AA 基準（4.5:1）を適用。

### 3-2. FUNCTION 層提案値

`.hdg-fn` スロット（統語機能ラベル: 主語・述語・目的語等）に適用する。

| トークン | 提案値（PROPOSAL） | HSL | 相対輝度 |
|---|---|---|---|
| `structural-function-fill` | `#e3eddf` | H=103°, S=28%, L=90% | 0.8223 |
| `structural-function-ink` | `#375e2c` | H=107°, S=36%, L=27% | 0.0900 |

**コントラスト確認:**

| 組み合わせ | コントラスト比 | 判定 |
|---|---|---|
| function-ink on function-fill | **6.23:1** | ✓ PASS (AA) |
| function-ink on surface-canvas (`#fbfaf7`) | **7.19:1** | ✓ PASS (AAA) |

**色調特徴:** 黄緑系（H=103°）。MORPHOLOGY fill（H=144°）と色相で 41° 差があり、並置時に区別可能。

**accent-greek-700 との比較:**
- `accent-greek-700` L=0.0638, H=134° 
- `structural-function-ink` L=0.0900, H=107°
- 明度差: 0.0262（約 26%相当）、色相差: 27° — 十分に区別可能。

### 3-3. CONSTRUCTION 層提案値

`.hdg-clause--sub` 背景と `.hdg-clause-label` テキストに適用する。

| トークン | 提案値（PROPOSAL） | HSL | 相対輝度 |
|---|---|---|---|
| `structural-construction-fill` | `#cce6db` | H=155°, S=34%, L=85% | 0.7455 |
| `structural-construction-ink` | `#2e5945` | H=152°, S=32%, L=27% | 0.0816 |

**コントラスト確認:**

| 組み合わせ | コントラスト比 | 判定 |
|---|---|---|
| construction-ink on construction-fill | **6.05:1** | ✓ PASS (AA) |
| construction-ink on surface-canvas (`#fbfaf7`) | **7.65:1** | ✓ PASS (AAA) |

**色調特徴:** 青みを帯びた緑（H=155°）。FUNCTION fill（H=103°）と 52° 差。  
MORPHOLOGY fill（H=144°, S=25%, L=92%）とは、CONSTRUCTION fill（H=155°, S=34%, L=85%）が彩度で +9pt・明度で -7pt 異なるため、類似しつつも区別可能。

**accent-greek-700 との比較:**
- `structural-construction-ink` L=0.0816, H=152°  
- `accent-greek-700` L=0.0638, H=134°
- 明度差: 0.0178（約 18%相当）、色相差: 18° — 区別は可能だが、morph-ink・func-ink と比較して accent-greek-700 との差は最も小さい。注意: 同一画面での隣接配置を避けることが望ましい（DESIGN.md §3-4 の原則を準用）。

### 3-4. 3層 fill の並置比較

| 層 | fill 値 | HSL | 相対輝度 |
|---|---|---|---|
| FUNCTION | `#e3eddf` | H=103°, S=28%, L=90% | 0.8223 |
| MORPHOLOGY（既存）| `#e6f0ea` | H=144°, S=25%, L=92% | 0.8508 |
| CONSTRUCTION | `#cce6db` | H=155°, S=34%, L=85% | 0.7455 |

fill 間のコントラスト比（参考 — fill同士は識別補助指標として参照のみ）:

| 比較 | コントラスト比 |
|---|---|
| FUNCTION vs MORPHOLOGY | 1.03:1 |
| FUNCTION vs CONSTRUCTION | 1.10:1 |
| MORPHOLOGY vs CONSTRUCTION | 1.13:1 |

**注意:** fill 同士のコントラストは意図的に低い（淡色の背景として設計）。識別は主に **色相・彩度の差** で行う。DESIGN.md §3-4 の「各層は色に加えて `structural-tag` ラベルを必ず併記する（色単独で意味を担わない）」原則に従い、fill のみによる識別に頼らない。

### 3-5. root clause `::before` 左バー（Q3 推奨案）

| 案 | 色値 | コントラスト（on function-fill） | 状態 |
|---|---|---|---|
| **b. `accent-greek-700`（推奨）** | `#2c4f34` | **7.67:1** ✓ AAA | **PROPOSAL — 未承認** |
| a. function-ink 相当 | `#375e2c` | 6.23:1 ✓ AA | PROPOSAL |
| c. connector | `#a49c86` | 2.68:1 ✗ FAIL | PROPOSAL（左バーのみで文字でなければ OK の可能性）|
| d. 廃止 | — | N/A | PROPOSAL |

Q3 はユーザー承認待ち。

---

## 4. 廃止・置換対象の一覧

### 4-1. `data-hdg-depth` 深度別着色（廃止対象 — DECIDED）

`public/index.html` 内の以下のルールをすべて削除する（15F-Impl 時）。

| 行番号（概算） | セレクター | 現在の値 | 廃止理由 |
|---|---|---|---|
| l.5265 | `.hdg-clause--root` | `background: rgba(50,100,170,0.00)` | 深度別着色 → 廃止 |
| l.5268–5270 | `[data-hdg-depth="1"]` | `background: rgba(50,100,170,0.035)` | 深度別着色 → 廃止 |
| l.5271–5273 | `[data-hdg-depth="1"] > .hdg-clause-label` | `color: #2e5da0; opacity: 1` | 深度別ラベル色 → 廃止 |
| l.5274–5276 | `[data-hdg-depth="2"]` | `background: rgba(50,100,170,0.065)` | 深度別着色 → 廃止 |
| l.5277–5279 | `[data-hdg-depth="2"] > .hdg-clause-label` | `color: #4a7cbf; opacity: 1` | 深度別ラベル色 → 廃止 |
| l.5280–5282 | `[data-hdg-depth="3"]` | `background: rgba(50,100,170,0.09)` | 深度別着色 → 廃止 |
| l.5283–5285 | `[data-hdg-depth="3"] > .hdg-clause-label` | `color: #6495c8; opacity: 1` | 深度別ラベル色 → 廃止 |
| l.5286–5288 | `[data-hdg-depth="4-15"]` | `background: rgba(50,100,170,0.11)` | 深度別着色 → 廃止 |
| l.5289–5291 | `[data-hdg-depth="4-15"] > .hdg-clause-label` | `color: #6495c8; opacity: 1` | 深度別ラベル色 → 廃止 |
| l.5266–5267 | `.hdg-clause--root::before` | `background: #3a6aab`（旧配色・青） | Q3 の答えで置換 |

**補足:** l.5254 の `.hdg-clause--root::before { background: var(--color-domain, #7a7aaa) }` は後続の l.5266 に上書きされているため、l.5266 を変更すれば l.5254 は実質無効化されている状態のまま残留する（別途 Phase 15F で整理）。

### 4-2. Construction サブタイプ hardcoded rgba（置換対象）

以下の `public/index.html` ルールを、トークン確定後に `structural-construction-ink` at opacity に置換する。

| 行番号（概算） | セレクター | 現在の値 | 置換後（PROPOSAL） |
|---|---|---|---|
| l.5156–5159 | `.hdg-clause--sub.hdg-clause--appositive` | `1px dotted rgba(122,122,170,.18)` 薄紫 | `structural-construction-ink` at opacity（提案値 `#2e5945` の 18% 相当） |
| l.5165–5168 | `.hdg-clause--sub.hdg-clause--adj-modifier` | `1px dotted rgba(100,122,170,.16)` 薄青紫 | `structural-construction-ink` at opacity（16% 相当） |
| l.5176–5179 | `.hdg-clause--sub.hdg-clause--pp[data-hdg-head-id]` | `2px solid rgba(74,124,191,0.55)` 青 | `structural-construction-ink` at opacity（55% 相当） |
| l.5190–5192 | `.hdg-clause--sub.hdg-clause--adj-modifier[data-hdg-head-id]` | `2px solid rgba(74,124,191,0.45)` 青 | `structural-construction-ink` at opacity（45% 相当） |

**注意:** 置換後の具体的な opacity 値は実画面で確認してから決定する。上記の opacity は既存値を参考に記載したが、緑系の視覚的印象は青系と異なるため調整が必要な場合がある。

### 4-3. 既存 DS 構造色トークン（再設計対象 — 別工程）

以下は `design-system/project/tokens.json` と `design-system/project/tokens.css` の更新対象。15F-Impl 前提条件として必要だが、本作業ファイルでは変更しない。

| トークン | 現行値 | 提案値（PROPOSAL） |
|---|---|---|
| `structural-function-fill` | `#e7edf6`（淡青）| **`#e3eddf`** |
| `structural-function-ink` | `#32517d`（青系）| **`#375e2c`** |
| `structural-construction-fill` | `#ece6f5`（淡紫）| **`#cce6db`** |
| `structural-construction-ink` | `#5a4785`（紫系）| **`#2e5945`** |
| `structural-morphology-fill` | `#e6f0ea`（淡緑）| **継続使用**（変更なし）|
| `structural-morphology-ink` | `#316148`（緑系）| **継続使用**（変更なし）|

---

## 5. 全体サマリー

| トークン | 値 | 状態 |
|---|---|---|
| `structural-function-fill` | `#e3eddf` | **PROPOSAL（未承認）** |
| `structural-function-ink` | `#375e2c` | **PROPOSAL（未承認）** |
| `structural-construction-fill` | `#cce6db` | **PROPOSAL（未承認）** |
| `structural-construction-ink` | `#2e5945` | **PROPOSAL（未承認）** |
| `structural-morphology-fill` | `#e6f0ea` | CONFIRMED（既存継続）|
| `structural-morphology-ink` | `#316148` | CONFIRMED（既存継続）|
| root `::before` | Q3 未決（推奨: `#2c4f34`）| PROPOSAL（未承認）|

### コントラスト比まとめ

| ペア | コントラスト比 | 基準 |
|---|---|---|
| structural-function-ink on function-fill | **6.23:1** | ✓ AA |
| structural-function-ink on surface-canvas | **7.19:1** | ✓ AAA |
| structural-construction-ink on construction-fill | **6.05:1** | ✓ AA |
| structural-construction-ink on surface-canvas | **7.65:1** | ✓ AAA |
| structural-morphology-ink on morphology-fill（既存）| **6.14:1** | ✓ AA |
| structural-morphology-ink on surface-canvas（既存）| **6.86:1** | ✓ AA |
| accent-greek-700 on function-fill（参考: Q3 推奨案）| **7.67:1** | ✓ AAA |

---

## 6. 次のステップ

本ファイルはトークン設計案の段階。以下の順序で進める。

1. **ユーザー承認**: 本ファイルの提案値に対してユーザーが確認・承認（または修正指示）を行う
2. **Q3 確定**: root `::before` の色を確定する（推奨案 `accent-greek-700` か別案）
3. **tokens 更新**: `design-system/project/tokens.json` / `tokens.css` の `structural-function-*` / `structural-construction-*` を承認値で更新（別工程）
4. **DESIGN.md 更新**: §3-4 の構造色トークン定義を更新（別工程）
5. **15F-Impl**: Phase 15A 完了後、承認済みトークン値を用いてアプリ CSS を変更

---

*この文書は設計案のみ。アプリコード・DESIGN.md・tokens ファイルへの変更は行っていない。*  
*git add / commit / push は行っていない。*
