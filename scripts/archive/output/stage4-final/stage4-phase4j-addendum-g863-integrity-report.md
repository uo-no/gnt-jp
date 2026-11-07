# Stage 4 Phase 4j-addendum — G863 整合性確認レポート

**Phase**: 4j-addendum  
**作成日**: 2026-11-01  

---

## 1. 件数確認

| 確認項目 | 結果 |
|---------|------|
| 台帳総件数 | 96件 ✓ |
| ref 一意性 | 96件ユニーク ✓ |
| 全件Strong=G863 | ✓ |
| NTデータとのマッチング | 96件/96件 ✓ |
| CONFIRM+REVISE+HOLD = 96 | 78+18+0=96 ✓ |
| 最終訳語件数合計 = 96 | 96件 ✓ |

---

## 2. 入力との照合

| 入力ファイル | 使用箇所 | 状態 |
|------------|--------|------|
| stage4-phase4i-g863-final-ledger.json | 全96件の提案訳・クラスター | ✓ 読み取り専用 |
| stage4-phase4h-full-population-audit.json | Phase 4h分類の参照 | ✓ 参照のみ |
| bible_data/nt/（各書巻） | 各トークンの原文・形態・文脈 | ✓ 読み取り専用 |

---

## 3. 最終訳語分布

| 訳語 | Phase 4i | Phase 4j-addendum | 変化 |
|------|----------|-----------------|------|
| 許す | 32 | 32 | +0 |
| 残す | 7 | 23 | +16 |
| 去る | 33 | 15 | -18 |
| 残される | 9 | 9 | +0 |
| 捨てる | 7 | 9 | +2 |
| 去らせる | 3 | 3 | +0 |
| 疎かにする | 2 | 2 | +0 |
| 放つ | 2 | 2 | +0 |
| 黙認する | 1 | 1 | +0 |

---

## 4. REVISE_PROPOSED 全18件一覧

| ref | Phase 4i訳 | Phase 4j修正訳 | 意味クラス |
|-----|-----------|-------------|---------|
| MAT 4:20!4 | 去る | 残す | B-leave-property |
| MAT 4:22!4 | 去る | 残す | B-leave-property |
| MAT 5:24!1 | 去る | 残す | B-leave-property |
| MAT 18:12!16 | 去る | 残す | B-leave-flock |
| MAT 19:27!9 | 去る | 残す | B-leave-all |
| MAT 19:29!4 | 去る | 残す | B-leave-all |
| MRK 1:18!3 | 去る | 残す | B-leave-property |
| MRK 1:20!6 | 去る | 残す | B-leave-family |
| MRK 10:28!8 | 去る | 残す | B-leave-all |
| MRK 10:29!10 | 去る | 残す | B-leave-all |
| MRK 13:34!4 | 去る | 残す | B-leave-property |
| LUK 5:11!8 | 去る | 残す | B-leave-all |
| LUK 18:28!7 | 去る | 残す | B-leave-all |
| LUK 18:29!12 | 去る | 残す | B-leave-all |
| JHN 4:28!1 | 去る | 残す | B-leave-property |
| JHN 8:29!9 | 去る | 捨てる | B-abandon |
| JHN 14:18!2 | 去る | 捨てる | B-abandon |
| ACT 14:17!5 | 去る | 残す | B-leave-state |

---

## 5. データ変更確認

| 保護対象 | 状態 |
|---------|------|
| bible_data（Bible JSON） | **変更なし** ✓ |
| token.japanese フィールド | **変更なし** ✓ |
| stage4-phase4i-g863-final-ledger.json | **上書きなし** ✓ |
| stage4-phase4j-preaudit-g863-*.* | **上書きなし** ✓ |
| G1210・G2919 関連成果物 | **変更なし** ✓ |
| コミット・プッシュ・PR | **なし** ✓ |

---

## 6. 未確認事項

| 事項 | 内容 |
|------|------|
| JA1955テキスト対応 | 各トークンのJA1955原文は別途確認要（本監査では英語グロスと文脈から判断） |
| ACT 14:17 二重目的語 | 「自分を証しなく残した」= 残す（確定）。ただし構造が特殊であることを注記 |
| JHN 8:29 / JHN 14:18 | 捨てる（確定）。ただし正の形「捨てる」が強い印象を与える点は承知済み。見捨てるが慣用的だが現行lexiconになし |
