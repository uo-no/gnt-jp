# Task 45 — 異読注釈の日本語表示改善

**Date:** 2026-10-16  
**Branch:** fix/vr5-gate-n-a  
**HEAD:** ec1b447d test(apparatus): 語の分析 Level3 状態での異読表示を実操作で検証  
**State:** DONE

---

## 作業前 git status --short

```
 M package.json
 M public/index.html
[...その他変更・未追跡ファイル]
?? public/assets/data/apparatus-ja-auto.json
?? public/assets/data/apparatus-ja-phase2.json
?? public/assets/data/apparatus-ja-phase3.json
```

---

## Phase A — 現在の表示仕様確認

### タグ別件数（4データセット合計）

| タグ | 件数 | データソース |
|---|---|---|
| 読み差 | 4,308 | Phase1/2/3 自動生成 |
| 添加 | 1,615 | Phase1/2/3 自動生成 |
| 省略 | 814 | Phase1/2/3 自動生成 |
| 表記差 | 5 | manual |
| 語順差 | 5 | manual |
| 形態差 | 4 | manual |
| 節構造差 | 3 | manual |
| 語彙差 | 2 | manual |

### データ形式の実態

**manual（確認済み）の `ja` フィールド例**:
```
語順差: "語順: Χριστοῦ Ἰησοῦ / Ἰησοῦ Χριστοῦ"
添加:   "＋ὁ βασιλεύς（RP）"
省略:   "Ἰησοῦ の省略（Treg）"
形態差: "接頭辞の有無: δειγματίσαι / παραδειγματίσαι（παρα-）"
```

**Phase1/2/3（自動生成）の `ja` フィールド例**:
```
読み差: "γένεσις（WH Treg NIV）・γέννησις（RP）"
読み差: "περὶ（WH Treg NIV）・ὑπὲρ（RP）"
```

### 問題点

- `語順差`、`読み差` 等の専門用語タグが日本語話者に分かりにくい
- 特に自動生成データ（読み差 4,308件）はタグがラベルとなり、`ja` はギリシャ語のみ
- タグチップの `white-space: nowrap` により長い説明文が入らない状態

---

## Phase B — 適用した表示ルール

### タグラベルマッピング

| 内部タグ値（データ非変更） | 表示用ラベル |
|---|---|
| 語順差 | 語句の並び順が異なります |
| 添加 | 一方の本文には語句が加わっています |
| 省略 | 一方の本文では語句が省かれています |
| 読み差 | 使用されている語句が異なります |
| 形態差 | 語形が異なります |
| 表記差 | つづり・表記が異なります |
| 節構造差 | 文の組み立て方が異なります |
| 語彙差 | 異なる語が使われています |

**原則**:
- データ側の `tag` 値は変更しない（変換は表示層のみ）
- `ja` フィールドの内容はそのまま保持
- マッピングにないタグはそのまま表示（フォールバック安全）

---

## Phase C — 変更ファイルと変更内容

### `public/index.html` — 変更箇所 2箇所

#### CSS変更（`.mvv-app-anno` / `.mvv-app-tag`）

```css
/* 変更前 */
#mobile-verse-area .mvv-app-anno {
    display: flex;
    align-items: baseline;
    gap: var(--space-xs);
    margin-bottom: var(--space-xs);
}
#mobile-verse-area .mvv-app-tag {
    ...
    flex-shrink: 0;
    white-space: nowrap;
}

/* 変更後 */
#mobile-verse-area .mvv-app-anno {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;          ← 追加（長いラベルが折り返せるよう）
    gap: var(--space-xs);
    margin-bottom: var(--space-xs);
}
#mobile-verse-area .mvv-app-tag {
    ...
    flex-shrink: 0;
    /* white-space: nowrap を削除 */
}
```

#### JS変更（`_APPARATUS_TAG_LABELS` 定数 + タグ変換）

```javascript
// _buildApparatusHTML 関数直前に追加
const _APPARATUS_TAG_LABELS = {
    '語順差':   '語句の並び順が異なります',
    '添加':     '一方の本文には語句が加わっています',
    '省略':     '一方の本文では語句が省かれています',
    '読み差':   '使用されている語句が異なります',
    '形態差':   '語形が異なります',
    '表記差':   'つづり・表記が異なります',
    '節構造差': '文の組み立て方が異なります',
    '語彙差':   '異なる語が使われています',
};

// _buildApparatusHTML 内に追加
const tagLabel = (tag) => _escH(_APPARATUS_TAG_LABELS[tag] || tag);
// 使用箇所: ${_escH(ja.tag)} → ${tagLabel(ja.tag)}
```

---

## Phase D — 変更前後の具体例と検証結果

### ローマ1:1（語順差、manual 確認済み）

| | 表示 |
|---|---|
| **変更前** | `[語順差]　語順: Χριστοῦ Ἰησοῦ / Ἰησοῦ Χριστοῦ` |
| **変更後** | `[語句の並び順が異なります]　語順: Χριστοῦ Ἰησοῦ / Ἰησοῦ Χριστοῦ` |

日本語話者が「語句の並び順が違うんだ」と理解できる。

### ローマ1:8（読み差、Phase2 自動生成）

| | 表示 |
|---|---|
| **変更前** | `[読み差]（italic）　περὶ（WH Treg NIV）・ὑπὲρ（RP）` |
| **変更後** | `[使用されている語句が異なります]（italic）　περὶ（WH Treg NIV）・ὑπὲρ（RP）` |

自動生成はイタリック体タグのまま維持。

### 全タグ代表例の表示確認

| タグ | 箇所 | 新しいラベル | 結果 |
|---|---|---|---|
| 語順差 | ROM 1:1 | 語句の並び順が異なります | **PASS** |
| 読み差 | ROM 1:8 | 使用されている語句が異なります | **PASS** |
| 添加 | MAT 1:6 | 一方の本文には語句が加わっています | **PASS** |
| 省略 | MAT 1:18 | 一方の本文では語句が省かれています | **PASS** |
| 表記差 | MAT 1:5 | つづり・表記が異なります | **PASS** |
| 形態差 | MAT 1:19 | 語形が異なります | **PASS** |
| 節構造差 | MAT 1:25 | 文の組み立て方が異なります | **PASS** |

※ 語彙差（2件のみ）はブラウザ直接テスト省略。マップに定義済み・フォールバック安全を確認。

---

## 回帰テスト結果

### ブラウザ検証（31/31 PASS）

| 確認項目 | 結果 |
|---|---|
| TAG_LABELS_EXISTS — _APPARATUS_TAG_LABELS 定数の存在 | PASS |
| 全7タグのラベル変換（ROM / MAT 各箇所） | PASS (7×2=14件) |
| 旧タグ値がチップに残っていないこと | PASS |
| `ja` フィールドの内容が保持されていること | PASS |
| ギリシャ語異読（`mvv-app-rdg`）が保持されていること | PASS |
| 自動生成クラス（`--auto`）の区別が維持されていること | PASS |
| HTMLエスケープが維持されていること | PASS |
| ja注釈なし節でギリシャ語表示が壊れないこと | PASS |
| CSS `flex-wrap: wrap` の適用確認 | PASS |
| デスクトップ: `#wlv-apparatus-slot` なし | PASS |

### 既存回帰テスト（310/310 PASS）

| スクリプト | checks | 結果 |
|---|---|---|
| re-apparatus-regression.cjs | 82 | PASS |
| re-apparatus-ja-regression.cjs | 22 | PASS |
| re-apparatus-ja-auto-regression.cjs | 32 | PASS |
| re-apparatus-ja-phase2-regression.cjs | 24 | PASS |
| re-apparatus-ja-phase3-regression.cjs | 53 | PASS |
| re-apparatus-reproducibility.cjs | 10 | PASS |
| re-apparatus-ja-all-regression.cjs | 54 | PASS |
| re-apparatus-display-regression.cjs | 33 | PASS |
| **合計** | **310** | **310/310 PASS** |

`git diff --check`: クリーン（whitespace エラーなし）

---

## 未対応の説明パターンと理由

| パターン | 理由 |
|---|---|
| 語彙差（2件）のブラウザ直接確認 | 件数が少なく、マップ定義とフォールバック安全性を確認済み。Out of Scope（追加工数に対して効果が低い） |
| 自動生成 `ja` への日本語説明の付加 | `ja` はデータ側の値であり、表示層での変更はデータ改変に相当。現在のアーキテクチャでは表示層のみの改善に留める |
| Phase1/2/3 自動生成の `ja` フィールドの日本語化 | データ再生成に相当するため Out of Scope |

---

## 絶対条件チェック

| 条件 | 結果 |
|---|---|
| 既存の未コミット変更を保持 | ✓ |
| commit / push / PR / merge 禁止 | ✓ |
| 現在の4データセットと原文データを変更しない | ✓ |
| 検索UIや他の機能に手を広げない | ✓ |
| 既存の `ja` 内容を失わない | ✓ |
| HTMLエスケープを維持 | ✓ |
| 自動生成/確認済みの区別を維持 | ✓ |
