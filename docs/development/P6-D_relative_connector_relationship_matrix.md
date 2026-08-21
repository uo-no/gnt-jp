# P6-D — Relative Connector Relationship Matrix

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-21  
**State:** AUDIT-COMPLETE

---

## 1. 相対代名詞 → Connector の全パスマップ

```
SR token (type: 'token')
  evidence.morph_raw: 'R-*' or 'K-*'  ← isRelPronToken()
  evidence.ref: "JHN 1:3!11"
  evidence.nodeId: "n43001003011"
          │
          ▼
  bdByRef.get(evidence.ref)             ← bible_data lookup
  bdTok = { morph, referent, text, ... }
          │
    ┌─────┴─────────────────────────────────────────────────────────┐
    │ referent = null/missing                                        │
    │   → R6: Free relative                                         │
    │   → connector = null                                          │
    │   → UI: "関係節" (矢印なし)                                    │
    │                                                               │
    │ referent = "n43001003010 n43001003012" (space in string)      │
    │   → R3: Multi-token antecedent                                │
    │   → connector = null (silent skip)                            │
    │   → UI: なし                                                  │
    │                                                               │
    │ referent = "n43001003010" (single token ID)                   │
    │   → bdById.get(referent)                                      │
    │                                                               │
    │     target = null (not in chapter)                            │
    │       → R7: Cross-chapter                                     │
    │       → connector = null                                      │
    │                                                               │
    │     target.morph = "N-NSN" → _isNominalMorph = true → R1    │
    │     target.morph = "A-NSM" → _isNominalMorph = true → R2    │
    │     target.morph = "V-PAP-NSM" → [4]='P' = true → R2        │
    │     target.morph = "V-PAI-3S" → [4]='I' = false → R4        │
    │     target.morph = "D-NSM" → not N-/A-/V- → R5              │
    │     target.morph = "T-NSN" → not N-/A-/V- → R8              │
    │                                                               │
    │     R1, R2 → connector = {                                    │
    │       relPronRef, relPronText,                                │
    │       targetRef, targetText, targetNodeId                     │
    │     }                                                         │
    │     → UI: "関係節 ← targetText"                              │
    └───────────────────────────────────────────────────────────────┘
```

---

## 2. 構造パス: STANDALONE vs CLAUSE_AS_NP

```
deriveClauseCore(sentenceRoot)
  │
  ├─ fn=null child (no syntactic function)
  │     → _findRelPronInSubtree(child)
  │           → relative pronoun found?
  │                 → sub.isRelativeClause = true
  │                 → sub.relPronRef = evidence.ref
  │                 → adverbialClauses.push(sub)
  │           → type: STANDALONE
  │           → DR path: dr.adverbialClauses[i].isRelativeClause
  │
  └─ fn ∈ MAIN_FN (SUBJECT, OBJECT, COMPLEMENT...)
        → _extractEmbeddedRelClauses(child)
              → child.construction.canonical === 'CLAUSE_AS_NP'?
                    → for each sub-clause in child.children:
                        → _findRelPronInSubtree(sub)
                              → relTok found → embeddedClauses.push(dr)
                    → headSIs = remaining (non-clause) tokens
              → slot.embeddedRelClauses = embeddedClauses
              → type: CLAUSE_AS_NP
              → DR path: dr.slots[j].embeddedRelClauses[k]
```

---

## 3. DR Annotation パス

```
index.html: _renderStructuralDiagramView
  │
  ├─ deriveRelativeConnectors(root, bdByRef, bdById)
  │     → [{ relPronRef, relPronText, targetRef, targetText, targetNodeId }]
  │     → _connMap = Map<relPronRef, connector>
  │
  └─ _annotateRelClauses(dr, _connMap)
        │
        ├─ dr.adverbialClauses[i].isRelativeClause
        │     → conn = connMap.get(sc.relPronRef)
        │     → sc.antecedentText = conn?.targetText
        │
        ├─ recursive: dr.adverbialClauses[i] の sub-DR
        │
        ├─ dr.coordClauses[j] の sub-DR
        │
        └─ dr.slots[k].embeddedRelClauses[l].relPronRef
              → conn = connMap.get(erc.relPronRef)
              → erc.antecedentText = conn?.targetText
```

---

## 4. Render パス

```
_dgRenderClause(dr)
  │
  ├─ adverbialClauses ループ
  │     → sc.isRelativeClause ?
  │           scWrap.className = 'dg-rel-clause'
  │           label = sc.antecedentText
  │                   ? '関係節 ← ' + sc.antecedentText
  │                   : '関係節'
  │         : sc.isParticipalClause ?
  │           scWrap.className = 'dg-adv-clause dg-adv-clause-participial'
  │           label = '分詞節'
  │         : (default)
  │           scWrap.className = 'dg-adv-clause'
  │           label = '従属節'
  │
  └─ slots ループ
        → slot.embeddedRelClauses ループ
              → ercWrap.className = 'dg-rel-clause'
              → label = erc.antecedentText
                        ? '関係節 ← ' + erc.antecedentText
                        : '関係節'
```

---

## 5. Eligibility 検証マトリクス

| 条件 | 検証対象 | 失敗時 |
|---|---|---|
| 1. SR に relative pronoun が存在 | `isRelPronToken(node)` | skip |
| 2. bdByRef に ref が存在 | `bdByRef.get(rp.relPronRef)` | skip (R?) |
| 3. referent が non-null string | `bdTok.referent` | connector=null (R6) |
| 4. referent に空白がない | `!referent.includes(' ')` | skip (R3) |
| 5. bdById に target が存在 | `bdById.get(referent)` | skip (R7) |
| 6. target.morph が nominal | `_isNominalMorph(morph)` | skip (R4/R5/R8) |

全 6条件をパスした場合のみ connector を生成する。

---

## 6. Taxonomy: R1–R8 × Connector 決定表

| Code | morph pattern | _isNominalMorph | Connector | NT count |
|---|---|---|---|---|
| R1 | `N-*` | true | **YES** | 837 |
| R2 | `A-*` | true | **YES** | 110 (adj) |
| R2 | `V-*P-*` (morph[4]==='P') | true | **YES** | (ptc, R2内) |
| R3 | referent に space | N/A | NO (skip) | 66 |
| R4 | `V-*[IMSD]-*` (finite) | false | NO | 16 |
| R4 | `V-*N-*` (infinitive) | false | NO | (R4内) |
| R5 | `D-*` | false | NO | 9 |
| R6 | referent = null | N/A | NO | 598 |
| R7 | target not in bdById | N/A | NO | 4 |
| R8 | `T-*`, `X-*`, etc. | false | NO | 36 |

---

## 7. _isNominalMorph ロジック

```javascript
function _isNominalMorph(morph) {
  if (!morph || typeof morph !== 'string') return false;
  if (morph.startsWith('N-')) return true;   // noun
  if (morph.startsWith('A-')) return true;   // adjective / numeral
  // participle: V- + index 4 = 'P' (tense+voice at [2][3], mood at [4])
  return morph.startsWith('V-') && morph.length > 4 && morph[4] === 'P';
}
```

**MACULA morph フォーマット:** `POS-{Tense}{Voice}{Mood}-{Case}{Number}{Gender}`  
例: `V-PAP-NSM` = Verb, Present Active Participle, Nominative Singular Masculine  
→ index[4] = 'P' (mood = Participle) → nominal = true

**R4 exclusion examples:**
- `V-PAI-3S` = Present Active Indicative → index[4]='I' → false
- `V-2AAI-3P` = 2nd Aorist Active Indicative → index[4]='I' → false
- `V-PAM-2S` = Present Active Imperative → index[4]='M' → false

---

## 8. Data Flow: bible_data ↔ SR ↔ DgEngine ↔ index.html

```
bible_data/nt/JHN/1.json
  ├── token.verseId = "n43001003010"   ← bdById key
  ├── token.ref     = "JHN 1:3!10"    ← bdByRef key
  ├── token.morph   = "A-NSN"          ← _isNominalMorph 入力
  ├── token.referent = "n43001003010"  ← connector target lookup
  └── token.text    = "ἕν"             ← connector targetText

assets/data/sr/JHN/1.json
  └── sentence.root.children[*]
        └── {type:'token', evidence: {
              morph_raw: "R-NSN",       ← isRelPronToken 判定
              ref: "JHN 1:3!11",        ← bdByRef key (rel pron lookup)
              nodeId: "n43001003011",   ← SR identity
            }, text: "ὃ"}

index.html
  ├── bdByRef = Map<ref, bdToken>
  ├── bdById  = Map<verseId, bdToken>
  ├── DgEngine.deriveRelativeConnectors(root, bdByRef, bdById)
  │     → [{relPronRef:"JHN 1:3!11", targetText:"ἕν", ...}]
  └── _annotateRelClauses(dr, connMap)
        → dr.adverbialClauses[i].antecedentText = "ἕν"
        → UI: "関係節 ← ἕν"
```

---

## 9. 未解決境界 (P6-D beyond scope)

| 境界 | 内容 | P6-C 状態 |
|---|---|---|
| MACULA referent vs syntactic antecedent | referent は coreference; syntactic antecedent と必ずしも一致しない | Option B: coreference を代用 |
| cross-chapter antecedent (4件) | 別章の bible_data を同時ロードしない | silent skip |
| multi-token (66件) | 複数 NP を束ねる connector は R-K 仕様外 | U-2: skip |
| R5 demonstrative chain (9件) | D-* morph → connector なし | 将来: demonstrative chain ルール |
| Option D path | SR.antecedentSRNodeId による完全解決 | 未実装 |

---

*詳細: P6-D_relative_connector_production_audit.md / P6-D_test_matrix.md / P6-D_final_report.md*
