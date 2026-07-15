# Concept Audit — search-concepts.json 品質監査

生成: 2026-07-14T01:58:45.077Z

## Summary

| 項目 | 値 |
|---|---|
| Concepts | 37 |
| Terms | 115 |
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
| 4 | Term 存在確認（lemma 115 件を lemma_dict と照合） | PASS |
| 5 | Related Integrity | PASS |
| 6 | Related Symmetry | 双方向 88 / 片方向 0（報告のみ） |
| 7 | Children Cycle Detection | PASS |
| 8 | Pattern Integrity | PASS |
| 9 | Syntax Type Integrity | PASS |
| 9.5 | Domain Integrity（cluster-index 実在＋label 写し照合） | PASS |
| 10 | Orphan Concept | 0 件（WARNING） |

## Related グラフ

- symmetric: prayer ↔ faith
- symmetric: prayer ↔ thanksgiving
- symmetric: prayer ↔ worship
- symmetric: prayer ↔ temptation
- symmetric: prayer ↔ holy-spirit
- symmetric: love ↔ grace
- symmetric: love ↔ faith
- symmetric: love ↔ joy
- symmetric: love ↔ god
- symmetric: faith ↔ salvation
- symmetric: faith ↔ righteousness
- symmetric: faith ↔ hope
- symmetric: faith ↔ truth
- symmetric: faith ↔ obedience
- symmetric: faith ↔ perseverance
- symmetric: faith ↔ law
- symmetric: faith ↔ witness
- symmetric: faith ↔ temptation
- symmetric: salvation ↔ christ
- symmetric: salvation ↔ cross
- symmetric: salvation ↔ resurrection
- symmetric: salvation ↔ grace
- symmetric: salvation ↔ redemption
- symmetric: salvation ↔ sin
- symmetric: salvation ↔ hope
- symmetric: salvation ↔ repentance
- symmetric: salvation ↔ gospel
- symmetric: salvation ↔ eternal-life
- symmetric: salvation ↔ reconciliation
- symmetric: salvation ↔ death
- symmetric: salvation ↔ forgiveness
- symmetric: grace ↔ peace
- symmetric: grace ↔ god
- symmetric: grace ↔ redemption
- symmetric: grace ↔ law
- symmetric: grace ↔ forgiveness
- symmetric: righteousness ↔ sin
- symmetric: righteousness ↔ kingdom
- symmetric: righteousness ↔ judgment
- symmetric: righteousness ↔ law
- symmetric: sin ↔ repentance
- symmetric: sin ↔ death
- symmetric: sin ↔ judgment
- symmetric: sin ↔ law
- symmetric: sin ↔ forgiveness
- symmetric: holy ↔ glory
- symmetric: holy ↔ holy-spirit
- symmetric: holy ↔ worship
- symmetric: kingdom ↔ glory
- symmetric: kingdom ↔ god
- symmetric: kingdom ↔ gospel
- symmetric: kingdom ↔ judgment
- symmetric: glory ↔ god
- symmetric: glory ↔ worship
- symmetric: resurrection ↔ hope
- symmetric: resurrection ↔ eternal-life
- symmetric: resurrection ↔ death
- symmetric: resurrection ↔ christ
- symmetric: resurrection ↔ cross
- symmetric: hope ↔ eternal-life
- symmetric: hope ↔ joy
- symmetric: hope ↔ perseverance
- symmetric: truth ↔ witness
- symmetric: peace ↔ reconciliation
- symmetric: peace ↔ joy
- symmetric: repentance ↔ forgiveness
- symmetric: god ↔ holy-spirit
- symmetric: god ↔ judgment
- symmetric: god ↔ worship
- symmetric: holy-spirit ↔ worship
- symmetric: christ ↔ gospel
- symmetric: christ ↔ cross
- symmetric: gospel ↔ mission
- symmetric: gospel ↔ witness
- symmetric: cross ↔ redemption
- symmetric: redemption ↔ forgiveness
- symmetric: eternal-life ↔ death
- symmetric: reconciliation ↔ forgiveness
- symmetric: church ↔ disciple
- symmetric: church ↔ mission
- symmetric: disciple ↔ obedience
- symmetric: mission ↔ witness
- symmetric: obedience ↔ temptation
- symmetric: thanksgiving ↔ joy
- symmetric: thanksgiving ↔ worship
- symmetric: perseverance ↔ temptation
- symmetric: death ↔ judgment
- symmetric: judgment ↔ law

**総合判定: ✅ PASS**
