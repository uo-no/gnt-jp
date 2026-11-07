# Stage 4 Phase 4az — ACT 検索 index 再生成報告

**Phase**: 4az
**実施日**: 2026-11-04
**種別**: 検索 index 再生成（bible_data・reading-engine 変更なし）

---

## 1. 目的と背景

Phase 4ay で `ACT 20:24!2` の `token.japanese` を `誰も〜ない` → `何も〜ない` に変更した。  
`public/search-index/nt/ACT.json` は古い値を持ったままだったため、本 Phase で再生成して同期する。

---

## 2. 事前状態確認

| 項目 | bible_data | search-index（再生成前） |
|------|-----------|----------------------|
| ACT 20:24!2 japanese | `何も〜ない` | **`誰も〜ない`**（旧値） |
| ACT 20:24!2 strong | G3762 | G3762 |
| ACT 20:24!2 morph | A-GSM-N | A-GSM-N |

---

## 3. ビルドスクリプト仕様確認

**スクリプト**: `scripts/build-search-index.js`  
**呼び出し**: `npm run build:search-index`

**書籍範囲**: NT 27書 + LXX 39書の全書籍を**一括処理**。
書籍単独指定（`--book ACT` 等）の機能はない。

**sourceVersion**: 全入力ファイルの SHA256 ハッシュから生成される。任意の入力ファイルが変わると全書籍の sourceVersion が更新される。これは設計仕様（バージョン追跡のため）。

**ACT 単独生成の可否**: **不可**。全書籍生成が必要。

---

## 4. 再生成の実行

```
npm run build:search-index
```

**結果**: 正常終了。NT 27書 + LXX 39書、計 617,364 tokens。

---

## 5. 検証結果

| チェック | 期待値 | 実測値 | 判定 |
|---------|--------|--------|------|
| V1 ACT 20:24!2 japanese（再生成後） | 何も〜ない | 何も〜ない | ✓ PASS |
| V2 bible_data と search-index の完全一致 | 一致 | 一致 | ✓ PASS |
| V3 ACT token 数不変 | 18,412 | 18,412 | ✓ PASS |
| V4 他の ACT token の japanese 変化なし | 0件 | 0件 | ✓ PASS |
| V5 schemaVersion / corpus / bookKey 正常 | v3 / NT / ACT | v3 / NT / ACT | ✓ PASS |
| V6 JSON parse 成功 | PASS | PASS | ✓ PASS |
| V7 NT 全体の token.japanese 変化 = 1件 | 1 | 1 | ✓ PASS |
| V8 NT 書籍数 = 27 | 27 | 27 | ✓ PASS |
| V9 LXX 生成完了（39書） | 39 | 39 | ✓ PASS |
| V10 meta.json 整合 | v3 / 1191ch / 617364tok | v3 / 1191ch / 617364tok | ✓ PASS |

**検証: PASS（10/10）**

---

## 6. 変更範囲の詳細

### 6.1 token data の変化

| book | ref | from | to |
|------|-----|------|----|
| ACT | ACT 20:24!2 | `誰も〜ない` | `何も〜ない` |

**token data 変化: 1件のみ（ACT 20:24!2）。**

### 6.2 sourceVersion の変化

| sourceVersion | 値 |
|--------------|-----|
| 再生成前（旧） | （不明：Phase 4as 実装後に生成されたもの） |
| 再生成後 | `c408bdd7c81ff42f` |

すべての書籍ファイル（NT 27書 + LXX 39書）の sourceVersion が `c408bdd7c81ff42f` に統一された。  
**これは設計仕様どおりの挙動であり、異常ではない。**

### 6.3 NT 書籍別の変化内訳

| 変化の種類 | 書籍数 | 内容 |
|-----------|--------|------|
| token data 変化 + sourceVersion 変化 | **1（ACT）** | ACT 20:24!2 の japanese 更新 |
| sourceVersion 変化のみ | **26** | 全入力源ハッシュ変更による。token data 変化なし |

---

## 7. Phase 4as / 4au との整合性確認

| フェーズ | 変更内容 | search-index 再生成前の状態 |
|---------|---------|--------------------------|
| Phase 4as | G3762 neuter/feminine 93件 → 何も〜ない | ✓ 既に反映済み（今回変化なし） |
| Phase 4au | G3056 N-ASM 7件 → 申し開き/著述 | ✓ 既に反映済み（今回変化なし） |
| Phase 4ay | ACT 20:24!2 → 何も〜ない | ✓ 今回反映 |

Phase 4as・4au の実装後に search-index が一度再生成されていたことを確認。今回の再生成では当該フェーズの変化が二重適用されていないことを token diff で確認済み。

---

## 8. ACT 20:24!2 同期状態

| ファイル | japanese |
|---------|---------|
| `public/bible_data/nt/ACT/20.json` | `何も〜ない` |
| `public/search-index/nt/ACT.json` | `何も〜ない` |
| **同期状態** | **SYNCHRONIZED ✓** |

---

## 9. 除外確認

| 対象 | 除外 | 確認 |
|------|------|------|
| Bible JSON 変更 | なし | ✓ |
| reading-engine.js 変更 | なし | ✓ |
| reading-lexicon-data.js 変更 | なし | ✓ |
| residual inventory 変更 | なし | ✓ |
| regression baseline 変更 | なし | ✓ |
| commit / push / PR / merge / deploy | なし | ✓ |

---

## 10. 成果物一覧

| ファイル | 内容 |
|---------|------|
| `stage4-phase4az-search-index-report.md` | 本ファイル |
| `stage4-phase4az-search-index-diff.json` | token data 変化・ファイル SHA diff |
| `stage4-phase4az-search-index-verification.json` | 全検証チェック結果 |

---

## 11. 総合判定

**PASS**

| 条件 | 判定 |
|------|------|
| ACT 20:24!2 の search-index が bible_data と一致 | ✓ PASS |
| ACT の他 token 不変 | ✓ PASS |
| NT 全体の token.japanese 変化 = 1件 | ✓ PASS |
| schema / 構造仕様どおり | ✓ PASS |
| 説明できない変化ゼロ | ✓ PASS |
| 禁止事項の遵守 | ✓ PASS |

---

## 12. 次フェーズへの申し送り

| 優先 | 対象 | 推奨アクション |
|------|------|------------|
| 高 | G3762 masculine 119件 → inventory 更新 | RETAIN_CONFIRMED 118件 + IMPL 1件（ACT 20:24!2） |
| 中 | G3708 V-RAP 設計判断 | 20件 / L-0 判断待ち |
| 中 | G4183/G2983/G4160 例外監査 | 82件 |
| 低 | PHP 4:15!15 L-0 設計判断 | HOLD_CONTEXT |
| 低 | HOLD_DATA_QUALITY 解決 | 7件 |
