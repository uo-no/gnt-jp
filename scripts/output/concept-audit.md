# Concept Audit — search-concepts.json 品質監査

生成: 2026-07-12T11:59:13.020Z

## Summary

| 項目 | 値 |
|---|---|
| Concepts | 30 |
| Terms | 88 |
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
| 4 | Term 存在確認（lemma 88 件を lemma_dict と照合） | PASS |
| 5 | Related Integrity | PASS |
| 6 | Related Symmetry | 双方向 48 / 片方向 0（報告のみ） |
| 7 | Children Cycle Detection | PASS |
| 8 | Pattern Integrity | PASS |
| 9 | Syntax Type Integrity | PASS |
| 9.5 | Domain Integrity（cluster-index 実在＋label 写し照合） | PASS |
| 10 | Orphan Concept | 0 件（WARNING） |

## Related グラフ

- symmetric: prayer ↔ faith
- symmetric: prayer ↔ thanksgiving
- symmetric: love ↔ grace
- symmetric: love ↔ faith
- symmetric: faith ↔ salvation
- symmetric: faith ↔ righteousness
- symmetric: faith ↔ hope
- symmetric: faith ↔ truth
- symmetric: faith ↔ obedience
- symmetric: faith ↔ perseverance
- symmetric: salvation ↔ grace
- symmetric: salvation ↔ sin
- symmetric: salvation ↔ resurrection
- symmetric: salvation ↔ hope
- symmetric: salvation ↔ repentance
- symmetric: salvation ↔ christ
- symmetric: salvation ↔ gospel
- symmetric: salvation ↔ cross
- symmetric: salvation ↔ redemption
- symmetric: salvation ↔ eternal-life
- symmetric: salvation ↔ reconciliation
- symmetric: grace ↔ peace
- symmetric: grace ↔ god
- symmetric: grace ↔ redemption
- symmetric: righteousness ↔ sin
- symmetric: righteousness ↔ kingdom
- symmetric: sin ↔ repentance
- symmetric: holy ↔ glory
- symmetric: holy ↔ holy-spirit
- symmetric: kingdom ↔ glory
- symmetric: kingdom ↔ god
- symmetric: kingdom ↔ gospel
- symmetric: glory ↔ god
- symmetric: resurrection ↔ hope
- symmetric: resurrection ↔ eternal-life
- symmetric: hope ↔ eternal-life
- symmetric: hope ↔ joy
- symmetric: hope ↔ perseverance
- symmetric: peace ↔ reconciliation
- symmetric: peace ↔ joy
- symmetric: god ↔ holy-spirit
- symmetric: christ ↔ gospel
- symmetric: gospel ↔ mission
- symmetric: cross ↔ redemption
- symmetric: church ↔ disciple
- symmetric: church ↔ mission
- symmetric: disciple ↔ obedience
- symmetric: thanksgiving ↔ joy

**総合判定: ✅ PASS**
