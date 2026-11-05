# Task 43 — Apparatus Japanese Annotation Final Quality Gate

**Date:** 2026-10-16  
**Branch:** fix/vr5-gate-n-a  
**State:** DONE

---

## Scope

**Objective:** Task 40〜41-Fix の実装品質を最終確認し、FROZEN 前の品質ゲートとする。  
**Change Type:** 監査 + 最小コメント修正（DOCUMENTATION）  
**In Scope:**
- Task 42 の MAT 1:5 FAIL 根拠確認
- `_loadApparatusJaAllData()` の全fetch失敗時の実挙動確認
- コメント不正確箇所の最小修正
- 全8回帰テスト実行

**Out of Scope:** 機能追加・UI変更・データ再生成・JSON変更・package.json変更

---

## Phase A — MAT 1:5 FAIL 根拠確認

### 問題

Task 42 ブラウザテスト `MAT_1_5_3_READINGS` が FAIL。
テストは `rdg15 === 3` を期待していたが、実際の結果は `readings=5`。

### 調査結果

`apparatus.json` の `byVerse['MAT 1:5']` に存在するエントリ:

| エントリID | lemma | readings | status | tag |
|---|---|---|---|---|
| MAT-0001 | Βόος | 3 (Βόες · Βοὸς · Βοὸζ) | 確認済み | 表記差 |
| MAT-0002 | Ἰωβήδ | 2 (Ἰωβὴδ · Ὠβὴδ) | 確認済み | 表記差 |

合計: **5読み**（2エントリ）

### 根拠

テストが `rdg15 === 3` を期待したのは、MAT-0001 のみを想定していたため。  
実際には MAT 1:5 に MAT-0002 も存在する。

**判定: テストロジックのミス（INFERRED）→ 実装に欠陥なし（CONFIRMED）**

- `STATUS: CONFIRMED` — 実データから2エントリ・5読みを直接確認
- `STATUS: CONFIRMED` — `_buildApparatusHTML` は両エントリを正しく処理する

---

## Phase B — `_loadApparatusJaAllData()` 全fetch失敗時の挙動確認

### 実コード（公開前に確認済み）

```javascript
async function _loadApparatusJaAllData() {
    if (_apparatusJaAllData) return _apparatusJaAllData;
    if (_apparatusJaAllLoadP) return _apparatusJaAllLoadP;
    const fetchJson = url => fetch(url).then(r => r.ok ? r.json() : null).catch(() => null);
    _apparatusJaAllLoadP = Promise.all([
        fetchJson('../assets/data/apparatus-ja.json'),
        fetchJson('../assets/data/apparatus-ja-auto.json'),
        fetchJson('../assets/data/apparatus-ja-phase2.json'),
        fetchJson('../assets/data/apparatus-ja-phase3.json'),
    ]).then(([manual, p1, p2, p3]) => {
        const merged = {};
        for (const src of [p3, p2, p1, manual]) {
            if (src && src.entries) Object.assign(merged, src.entries);
        }
        _apparatusJaAllData = { entries: merged };
        return _apparatusJaAllData;
    }).catch(() => null);
    return _apparatusJaAllLoadP;
}
```

### 全fetch失敗時の実挙動

1. `fetchJson` は `fetch` が reject しても `.catch(() => null)` で `null` を返す — **throw しない**
2. `Promise.all([null, null, null, null])` は reject しない — **resolve する**
3. `.then(([manual, p1, p2, p3]) => {...})` が実行される — `merged = {}`
4. 戻り値: `_apparatusJaAllData = { entries: {} }` → **`{ entries: {} }` が返る**
5. `.catch(() => null)` は到達不能（`.then()` 内で例外が発生した場合のみ）

### 呼び出し元の安全性確認

```javascript
// _fillApparatusSection:
const jaEntries = jaData && jaData.entries;  // { entries: {} } → {} (truthy)
const html = _buildApparatusHTML(entries, jaEntries);
// jaEntries[e.id] = undefined → isConfirmed=false, isAuto=false → annoHtml=''
// ギリシャ語apparatus は表示される ✓
```

`null` が返った場合（理論上 `.catch()` が実行された時）も:
```javascript
const jaEntries = jaData && jaData.entries;  // null && ... → null (falsy → null)
// _buildApparatusHTML(entries, null) → anno なし、readings あり ✓
```

**判定: 両ケースとも安全 — CONFIRMED**

### コメント修正（DOCUMENTATION）

コメント「全て失敗した場合は null を返す」は実挙動と不一致。

| | 内容 |
|---|---|
| **変更前** | `*  全て失敗した場合は null を返す（静寂優先）。` |
| **変更後** | `*  全て失敗した場合は { entries: {} } を返す（静寂優先、ギリシャ語 apparatus 表示には影響しない）。` |

- 変更範囲: JSDoc コメント1行のみ
- 実装変更: **なし**
- CSS変更: **なし**
- JSON変更: **なし**

---

## Phase C — 回帰テスト

### 実行スクリプト（直接 node 実行）

| スクリプト | checks | 結果 |
|---|---|---|
| `scripts/re-apparatus-regression.cjs` | 82 | **PASS** |
| `scripts/re-apparatus-ja-regression.cjs` | 22 | **PASS** |
| `scripts/re-apparatus-ja-auto-regression.cjs` | 32 | **PASS** |
| `scripts/re-apparatus-ja-phase2-regression.cjs` | 24 | **PASS** |
| `scripts/re-apparatus-ja-phase3-regression.cjs` | 53 | **PASS** |
| `scripts/re-apparatus-reproducibility.cjs` | 10 | **PASS** |
| `scripts/re-apparatus-ja-all-regression.cjs` | 54 | **PASS** |
| `scripts/re-apparatus-display-regression.cjs` | 33 | **PASS** |
| **合計** | **310** | **310/310 PASS** |

---

## Phase D — 最終状態記録

### 実装サマリー（Task 40〜41-Fix）

| Task | 変更内容 | ファイル |
|---|---|---|
| Task 40 | `_loadApparatusJaAllData()` 4データセット統合ローダー追加 | `public/index.html` |
| Task 40 | State変数: `_apparatusJaAllData`, `_apparatusJaAllLoadP` 追加 | `public/index.html` |
| Task 40 | 回帰テスト追加（54 checks） | `scripts/re-apparatus-ja-all-regression.cjs` |
| Task 41 | `_buildApparatusHTML` を `jaEntries` 引数対応に更新 | `public/index.html` |
| Task 41 | `_fillApparatusSection` を `_loadApparatusJaAllData()` 使用に変更 | `public/index.html` |
| Task 41 | 自動生成注釈の CSS クラス `mvv-app-anno--auto` 追加 | `public/index.html` |
| Task 41 | 回帰テスト追加（33 checks） | `scripts/re-apparatus-display-regression.cjs` |
| Task 41-Fix | `opacity: 0.7` 削除、`font-style: italic` をタグチップのみに適用 | `public/index.html` |
| Task 43 | コメント修正（1行）: 全fail時の戻り値を正確に記述 | `public/index.html` |

### データファイル（未コミット、untracked）

| ファイル | エントリ数 | 内容 |
|---|---|---|
| `public/assets/data/apparatus-ja-auto.json` | 2,418 | Phase 1 自動生成 |
| `public/assets/data/apparatus-ja-phase2.json` | 2,796 | Phase 2 自動生成 |
| `public/assets/data/apparatus-ja-phase3.json` | 1,512 | Phase 3 自動生成 |

### データ整合性（Task 42 監査から）

| 項目 | 結果 |
|---|---|
| 4データセット合計エントリ数 | 6,756 |
| IDオーバーラップ | 0 |
| apparatus.json エントリ数 | 6,929 |
| ja注釈なし | 173 (2.5%) |
| 孤立IDなし | CONFIRMED |

### 未解決事項

| 分類 | 内容 |
|---|---|
| DEFERRED | MAT 1:5 ブラウザテストの期待値修正（テストロジックのミス、実装は正しい） |
| DEFERRED | `re-apparatus-ja-all-regression.cjs` / `re-apparatus-display-regression.cjs` を package.json scripts に登録 |

### Exit Criteria 判定

| 基準 | 判定 |
|---|---|
| Task 42 FAIL の根拠確認（テストロジックのミス） | PASS |
| `_loadApparatusJaAllData()` 全失敗時の戻り値が `{ entries: {} }` | CONFIRMED |
| 呼び出し元が両戻り値（`{ entries: {} }`, `null`）を安全に処理 | CONFIRMED |
| コメント不正確箇所を最小修正（実装変更なし） | DONE |
| 全8回帰テスト 310/310 PASS | PASS |
| コード・JSON・CSS・package.json に機能変更なし | CONFIRMED |

**STATE: DONE**

---

## 絶対条件チェック

| 条件 | 結果 |
|---|---|
| 既存の未コミット変更を保持 | ✓ |
| コミット・push・PR作成・マージを行わない | ✓ |
| デスクトップ表示を追加しない | ✓ |
| データJSON・生成器・手動注釈30件を変更しない | ✓ |
| 自動生成注釈を「確認済み」と表示しない | ✓ |
| 原資料にない証人・読み・意味・解釈を追加しない | ✓ |
| 機能追加・UI変更・データ再生成を行わない | ✓ |
