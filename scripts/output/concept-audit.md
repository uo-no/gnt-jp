# Concept Audit — search-concepts.json 品質監査

生成: 2026-07-11T23:40:11.152Z

## Summary

| 項目 | 値 |
|---|---|
| Concepts | 15 |
| Terms | 58 |
| Patterns | 3 |
| Syntax Links | 1 |
| Domain Links | 15 |
| **FAIL** | 0 |
| WARNING | 0 |
| INFO | 0 |

## 監査項目別結果

| # | 項目 | 結果 |
|---|---|---|
| 1 | Schema Validation | PASS |
| 2 | ID 重複 | PASS |
| 3 | Alias 重複（label 含む発火語衝突） | PASS |
| 3.5 | Alias 品質（型・空・空白・概念内重複） | PASS |
| 4 | Term 存在確認（lemma 58 件を lemma_dict と照合） | PASS |
| 5 | Related Integrity | PASS |
| 6 | Related Symmetry | 双方向 19 / 片方向 0（報告のみ） |
| 7 | Children Cycle Detection | PASS |
| 8 | Pattern Integrity | PASS |
| 9 | Syntax Type Integrity | PASS |
| 9.5 | Domain Integrity（cluster-index 実在＋label 写し照合） | PASS |
| 10 | Orphan Concept | 0 件（WARNING） |

## Related グラフ

- symmetric: prayer ↔ faith
- symmetric: love ↔ grace
- symmetric: love ↔ faith
- symmetric: faith ↔ salvation
- symmetric: faith ↔ righteousness
- symmetric: faith ↔ hope
- symmetric: faith ↔ truth
- symmetric: salvation ↔ grace
- symmetric: salvation ↔ sin
- symmetric: salvation ↔ resurrection
- symmetric: salvation ↔ hope
- symmetric: salvation ↔ repentance
- symmetric: grace ↔ peace
- symmetric: righteousness ↔ sin
- symmetric: righteousness ↔ kingdom
- symmetric: sin ↔ repentance
- symmetric: holy ↔ glory
- symmetric: kingdom ↔ glory
- symmetric: resurrection ↔ hope

**総合判定: ✅ PASS**
