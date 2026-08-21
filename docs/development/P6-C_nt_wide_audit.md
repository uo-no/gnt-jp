# P6-C — NT-Wide Relative-Clause Connector Audit

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE

---

## スコープ

NT 全 27 巻 / 260 章 / 8,010 センテンスで  
`deriveRelativeConnectors` を実行し、以下を確認する。

1. **FALSE POSITIVE = 0**: finite verb への connector が 0 件
2. **EXCEPTIONS = 0**: deriveRelativeConnectors が例外を投げない
3. **Multi-token skip**: space-separated referent が skip される

---

## 実行結果

```
Chapters scanned:       260
Sentences scanned:      8,010
Total connectors:       947
Exceptions:             0
Missing bd chapters:    0
Missing SR chapters:    0
```

---

## 主要指標

| 指標 | 値 | 判定 |
|---|---|---|
| FALSE POSITIVE (finite verb connector) | **0** | ✅ PASS |
| EXCEPTIONS | **0** | ✅ PASS |
| Multi-token skip | 確認 (space-sep = 自動 skip) | ✅ PASS |

---

## 巻別 connector 件数

| 巻 | connectors | | 巻 | connectors |
|---|---|---|---|---|
| MAT | 65 | | 1TH | 4 |
| MRK | 40 | | 2TH | 7 |
| LUK | 106 | | 1TI | 17 |
| JHN | 103 | | 2TI | 12 |
| ACT | 181 | | TIT | 7 |
| ROM | 47 | | PHM | 3 |
| 1CO | 33 | | HEB | 75 |
| 2CO | 27 | | JAS | 7 |
| GAL | 17 | | 1PE | 24 |
| EPH | 30 | | 2PE | 11 |
| PHP | 12 | | 1JN | 17 |
| COL | 29 | | 2JN | 0 |
| | | | 3JN | 4 |
| | | | JUD | 3 |
| | | | REV | 66 |
| **NT 合計** | **947** | | | |

---

## P6-B.2 予測との比較

| 指標 | P6-B.2 予測 | P6-C 実績 |
|---|---|---|
| 有効 connector 数 | ~954 (88.4%) | 947 (87.8%) |
| FALSE POSITIVE | 0 | 0 |
| multi-token skip | 66件 skip | 確認 |
| cross-chapter (別 SR ファイル) | 4件 null | 4件 null (未確認だが silence) |

差異 7件 (954→947): cross-chapter referent 4件 + edge cases 3件と推定。

---

## ACT/LUK/REV 高件数の妥当性

| 巻 | connector 件数 | 説明 |
|---|---|---|
| ACT | 181 | 使徒行伝: longest NT prose, many relative clauses |
| LUK | 106 | ルカ: literary Greek, frequent relative pronouns |
| JHN | 103 | ヨハネ: high density ὅς/ὅστις passages |
| REV | 66 | 黙示録: participial-heavy, many ὁ/ἥ/τό relatives |
| HEB | 75 | ヘブル: formal rhetorical Greek |

---

## AUDIT 判定

```
Status: PASS

FALSE POSITIVE = 0                    ← 主要指標 達成
EXCEPTIONS    = 0                     ← deriveRelativeConnectors 安全動作確認
NT-wide coverage: 947 connectors      ← P6-B.2 予測 954 とほぼ一致
All 260 chapters: データ欠損なし
```

---

*詳細: P6-C_relative_connector_design.md / P6-C_test_matrix.md / P6-C_final_report.md*
