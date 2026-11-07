# Stage 4 Phase 4k — G863 ἀφίημι 実装報告

**Phase**: 4k  
**実施日**: 2026-11-01  
**HEAD SHA（変更前）**: `ebf70bc6a02e82a55b30d2c392039fc6a32541a8`  

---

## 1. 更新サマリー

| 項目 | 値 |
|------|----|
| 更新対象件数 | 96 |
| 実際の変更件数 | 96 |
| エラー件数 | 0 |
| 変更ファイル数 | 53 |

---

## 2. 訳語分布（変更前→変更後）

| 訳語 | 変更前 | 変更後 | 差分 |
|------|-------|-------|------|
| 許す | 0 | 32 | +32 |
| 残す | 0 | 23 | +23 |
| 去る | 0 | 15 | +15 |
| 捨てる | 0 | 9 | +9 |
| 残される | 0 | 9 | +9 |
| 離縁する | 0 | 3 | +3 |
| 疎かにする | 0 | 2 | +2 |
| 放つ | 0 | 2 | +2 |
| 黙認する | 0 | 1 | +1 |
| 赦す | 96 | 0 | -96 |

---

## 3. 変更ファイル一覧（53件）

- `public/bible_data/nt/1CO/7.json` — 3件
- `public/bible_data/nt/ACT/14.json` — 1件
- `public/bible_data/nt/ACT/5.json` — 1件
- `public/bible_data/nt/HEB/2.json` — 1件
- `public/bible_data/nt/HEB/6.json` — 1件
- `public/bible_data/nt/JHN/10.json` — 1件
- `public/bible_data/nt/JHN/11.json` — 2件
- `public/bible_data/nt/JHN/12.json` — 1件
- `public/bible_data/nt/JHN/14.json` — 2件
- `public/bible_data/nt/JHN/16.json` — 2件
- `public/bible_data/nt/JHN/18.json` — 1件
- `public/bible_data/nt/JHN/4.json` — 3件
- `public/bible_data/nt/JHN/8.json` — 1件
- `public/bible_data/nt/LUK/10.json` — 1件
- `public/bible_data/nt/LUK/12.json` — 1件
- `public/bible_data/nt/LUK/13.json` — 2件
- `public/bible_data/nt/LUK/17.json` — 2件
- `public/bible_data/nt/LUK/18.json` — 3件
- `public/bible_data/nt/LUK/19.json` — 1件
- `public/bible_data/nt/LUK/21.json` — 1件
- `public/bible_data/nt/LUK/4.json` — 1件
- `public/bible_data/nt/LUK/5.json` — 1件
- `public/bible_data/nt/LUK/6.json` — 1件
- `public/bible_data/nt/LUK/8.json` — 1件
- `public/bible_data/nt/LUK/9.json` — 1件
- `public/bible_data/nt/MAT/13.json` — 2件
- `public/bible_data/nt/MAT/15.json` — 1件
- `public/bible_data/nt/MAT/18.json` — 1件
- `public/bible_data/nt/MAT/19.json` — 3件
- `public/bible_data/nt/MAT/22.json` — 2件
- `public/bible_data/nt/MAT/23.json` — 4件
- `public/bible_data/nt/MAT/24.json` — 3件
- `public/bible_data/nt/MAT/26.json` — 2件
- `public/bible_data/nt/MAT/27.json` — 2件
- `public/bible_data/nt/MAT/3.json` — 2件
- `public/bible_data/nt/MAT/4.json` — 3件
- `public/bible_data/nt/MAT/5.json` — 2件
- `public/bible_data/nt/MAT/7.json` — 1件
- `public/bible_data/nt/MAT/8.json` — 2件
- `public/bible_data/nt/MRK/1.json` — 4件
- `public/bible_data/nt/MRK/10.json` — 3件
- `public/bible_data/nt/MRK/11.json` — 2件
- `public/bible_data/nt/MRK/12.json` — 4件
- `public/bible_data/nt/MRK/13.json` — 2件
- `public/bible_data/nt/MRK/14.json` — 2件
- `public/bible_data/nt/MRK/15.json` — 2件
- `public/bible_data/nt/MRK/4.json` — 1件
- `public/bible_data/nt/MRK/5.json` — 2件
- `public/bible_data/nt/MRK/7.json` — 3件
- `public/bible_data/nt/MRK/8.json` — 1件
- `public/bible_data/nt/REV/11.json` — 1件
- `public/bible_data/nt/REV/2.json` — 2件
- `public/bible_data/nt/ROM/1.json` — 1件

---

## 4. 1CO 7:11–13 修正確認（Phase 4j-correctionの3件）

- **1CO 7:11!15**: `赦す` → `離縁する`
- **1CO 7:12!22**: `赦す` → `離縁する`
- **1CO 7:13!15**: `赦す` → `離縁する`

---

## 5. データ変更なし確認

| 保護対象 | 状態 |
|---------|------|
| bible_data (token.japanese 以外) | **変更なし** ✓ |
| G863 対象外 47件 | **変更なし** ✓ |
| Phase 4i/4j/4j-correction 成果物 | **上書きなし** ✓ |
| commit/push/PR | **なし** ✓ |
