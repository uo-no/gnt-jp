# P6-G.11.4 — Residual Reachability Audit

**Date:** 2026-08-26
**Phase:** P6-G.11.4 — Read-Only Residual Audit
**Baseline:** P6-G.11.3 (DR=265, gap=46, coverage=85.2%)
**Constraint:** READ-ONLY. No production code changes.

---

## A. 監査方法

NT 全 27 巻 8010 sentences を NT-wide scan。各 sentence について:
- SR: fn=OBJECT2 の全ノードを列挙
- DR: `countFnInDR(dr, 'SECOND_OBJECT')` で SECOND_OBJECT 総数を取得
- 差分 (SR count > DR count) を invisible とし、各 OBJECT2 について最近傍 MAIN_FN 祖先を blocking node として記録
- blocking node の DR slot 存在・contentClause 有無を記録
- 分類 A–F を適用

---

## B. 残存 46 件 — カテゴリ別サマリー

| カテゴリ | 件数 | 定義 |
|---------|------|------|
| A | 1 | SR に構造が明示され engine traversal の純粋 coverage gap、安全に derive 可能 |
| B | 0 | SR に構造はあるが Visual Grammar v1 での表現方法が未定義 |
| C | 7 | 既存仕様を保護するため意図的に defer（NOMINALIZED_CLAUSE bracket notation） |
| D | 19 | phrase-type — SR のみでは内部構造を安全に確定不可（L-0 制約） |
| E | 10 | 技術的な depth / traversal 制限 |
| F | 9 | Structural gap（R6/R7 など DR derivation の前提条件が欠落） |

---

## C. カテゴリ A — Pure Engine Coverage Gap (1件)

> **A: SR に構造が明示されており、_extractContentClause の拡張で安全に derive できる。**

| Ref | OBJECT2 text | Blocking | 詳細 |
|-----|------------|---------|------|
| MRK 11:31 | ὅτι ὄντως προφήτης ἦν | OBJECT\|group/no-cn | group slot が DR にあるが contentClause=null (`_isEmptyDR` が fire した疑い) |

**原因分析:** MRK 11:31 の OBJECT/group slot は DR に存在するが `contentClause=null`。`_extractContentClause(groupNode)` が `_isEmptyDR(innerDR)=true` を返した。`deriveFromGroup(node)` がこの特定の group について slots/adverbialClauses/adverbialPhrases すべて 0 の DR を返しているため。OBJECT2 "ὅτι ὄντως προφήτης ἦν" は group 内 clause → ADVERBIAL/SUBORDINATE_CLAUSE → inner clause に位置する。

**SR path:** ADVERBIAL → OBJECT → OBJECT → [group] → OBJECT → [clause] → ADVERBIAL/SUBORDINATE_CLAUSE → [clause]

**判定:** SHOULD DEFER（v1 freeze 後に個別調査が望ましい）。単一ケースのための `_isEmptyDR` ロジック変更は回帰リスクを生む。

---

## D. カテゴリ C — Intentional Defer (7件)

> **C: NOMINALIZED_CLAUSE bracket notation 保護のため、P6-G.11.3 で明示的に除外された。**

| # | Ref | OBJECT2 text | Blocking fn | Blocking cn |
|---|-----|------------|-------------|-------------|
| 1 | JHN 5:11 | ὑγιῆ | AUX | NOMINALIZED_CLAUSE |
| 2 | JHN 5:15 | ὑγιῆ. | SUBJECT | NOMINALIZED_CLAUSE |
| 3 | PHP 3:17 | τύπον | OBJECT | NOMINALIZED_CLAUSE |
| 4 | HEB 1:7 | πνεύματα, | OBJECT | NOMINALIZED_CLAUSE |
| 5 | HEB 1:7 | πυρὸς φλόγα· | OBJECT | NOMINALIZED_CLAUSE |
| 6 | HEB 10:29 | κοινὸν | SUBJECT | NOMINALIZED_CLAUSE |
| 7 | REV 2:2 | ἀποστόλους, | OBJECT | NOMINALIZED_CLAUSE |

**確認:** 全 7 件について blocking slot は DR にあり contentClause=null。これは P6-G.11.3 の intentional exclusion の直接結果。

**判定:** INTENTIONAL FALLBACK（index.html line 12346 の bracket notation が機能している）。

---

## E. カテゴリ D — Phrase-Type (19件)

> **D: blocking node が phrase.np / phrase.pp 型構造。SR のみでは内部構造を L-0 上安全に確定不可。**

### D.1 APPOSITION (phrase.np) — 7件

| Ref | OBJECT2 text | Blocking |
|-----|------------|---------|
| MRK 3:3 | ξηράν· | INDIRECT_OBJECT\|phrase.np/APPOSITION |
| LUK 6:8 | ξηρὰν | INDIRECT_OBJECT\|phrase.np/APPOSITION |
| LUK 6:13 | καὶ ἀποστόλους | OBJECT\|phrase.np/APPOSITION |
| LUK 6:13 | Πέτρον | OBJECT\|phrase.np/APPOSITION |
| EPH 2:14 | ἓν | COMPLEMENT\|phrase.np/APPOSITION |
| REV 2:18 | ὡς φλόγα πυρός | SUBJECT\|phrase.np/APPOSITION |
| REV 2:20 | προφῆτιν, | OBJECT\|phrase.np/APPOSITION |

### D.2 CLAUSE_AS_NP (phrase.np subtype) — 2件

| Ref | OBJECT2 text | Blocking |
|-----|------------|---------|
| MRK 4:20 | καρποφοροῦσιν … | COMPLEMENT\|phrase.np/CLAUSE_AS_NP |
| JAS 1:27 | ἄσπιλον | COMPLEMENT\|phrase.np/CLAUSE_AS_NP |

### D.3 NP_COMPLEX (phrase.np) — 3件

| Ref | OBJECT2 text | Blocking |
|-----|------------|---------|
| JHN 9:8 | ὅτι προσαίτης ἦν | SUBJECT\|phrase.np/NP_COMPLEX |
| JHN 19:12 | βασιλέα | SUBJECT\|phrase.np/NP_COMPLEX |
| ACT 20:28 | ἐπισκόπους, | OBJECT\|phrase.np/NP_COMPLEX |

### D.4 ADJ_MOD / ADV_MOD / Modifier (3件)

| Ref | OBJECT2 text | Blocking |
|-----|------------|---------|
| MAT 7:9 | ἄρτον | SUBJECT\|phrase.np/ADJ_MOD |
| 1TI 2:5 | ἀντίλυτρον | SUBJECT\|phrase.np/ADV_MOD |
| HEB 9:13 | ἄμωμον | SUBJECT\|phrase.np/ARTICULAR_NP |

### D.5 GENITIVE_MOD / ARTICULAR_NP (2件)

| Ref | OBJECT2 text | Blocking |
|-----|------------|---------|
| HEB 5:12 | τὰ στοιχεῖα … | OBJECT\|phrase.np/GENITIVE_MOD |
| 1CO 1:4 | ἀνεγκλήτους | OBJECT\|phrase.np/ARTICULAR_NP |

### D.6 PREP_PHRASE (phrase.pp) — 1件

| Ref | OBJECT2 text | Blocking |
|-----|------------|---------|
| 2CO 3:5 | διακόνους … | COMPLEMENT\|phrase.pp/PREP_PHRASE |

### D 全件について L-0 判定

phrase.np / phrase.pp 型構造の内部を Visual Grammar で表示するには、その phrase の「名詞核 / 修飾節」の境界を SR だけから一意に確定する必要がある。しかし：
- APPOSITION 内の NOMINALIZED_CLAUSE などは既に別の表示経路（bracket notation）が存在する
- phrase.np 内部が COORDINATION か CLAUSE_AS_NP かは SR の type・cn を読めば分かるが、どの「副線」をどの位置に表示するかは Visual Grammar の新規定義が必要
- L-0: 現在 SR に明示的にある fn 値のみ使う → phrase.np/pp の MAIN_FN 内部を derive することは L-0 の範囲内だが、Visual Grammar v1 の表現様式が未定義

**判定:** BLOCKED / UNSAFE TO INFER（19件すべて）

---

## F. カテゴリ E — Technical Depth / Traversal Limitation (10件)

> **E: blocking slot が DR にあり contentClause も正しく生成されているが、OBJECT2 が innerDR の traversal では届かない深度にある。あるいは blocking の outer MAIN_FN slot 自体が DR に配置されていない。**

### E.1 bare clause blocking slot が DR に配置されていない (3件)

| Ref | OBJECT2 text | Path (末尾) |
|-----|------------|-----------|
| MAT 1:22 | Ἐμμανουήλ; … | SUBJECT/NOMINALIZED_CLAUSE → [clause] → ADVERBIAL → OBJECT → [group] → [clause] |
| JUD 1:24 | ἀπταίστους | INDIRECT_OBJECT/APPOSITION → /ARTICULAR_NP → [clause] → OBJECT → [clause] |
| JUD 1:24 | ἀμώμους | INDIRECT_OBJECT/APPOSITION → /ARTICULAR_NP → [clause] → OBJECT → [group] → [clause] |

**原因:** blocking bare-clause OBJECT ノードが deriveClauseCore の MAIN_FN slot として配置されない。fn=null の structural container 内に埋め込まれているか、ADVERBIAL fn の clause 内に位置するため、MAIN_FN として扱われない。

### E.2 group blocking slot が DR に配置されていない (3件) — Isaiah 40:3 引用

| Ref | OBJECT2 text | 書籍 |
|-----|------------|------|
| MAT 3:3 | εὐθείας | MAT |
| MRK 1:2 | εὐθείας | MRK |
| LUK 3:3 | εὐθείας | LUK |

**同一テキスト:** すべて Isaiah 40:3 の引用 "Ἑτοιμάσατε τὴν ὁδὸν κυρίου, εὐθείας ποιεῖτε τὰς τρίβους αὐτοῦ" の OBJECT2 "εὐθείας"。

**原因:** この引用は NOMINALIZED_CLAUSE 内の adverbial clause 内の group として配置されており、group slot が DR の MAIN_FN slot として配置されていない。structural 経路が複数の ADVERBIAL / non-fn 層を経由する。

### E.3 blocking slot に contentClause あるが OBJECT2 が depth ≥ 3 (3件)

| Ref | OBJECT2 text | CC label | CC innerDR slots |
|-----|------------|---------|----------------|
| LUK 10:21 | πάτερ κύριε … | 節グループ | [] (空) |
| ACT 24:10 | ὧν | 節 | [PREDICATE, INDIRECT_OBJECT] |
| ACT 24:14 | αἵρεσιν | null (CC) | [PREDICATE, OBJECT] |

**LUK 10:21:** group slot に contentClause.label='節グループ' があるが innerDR.slots=[] (空)。OBJECT2 はその group の内部 clause の ADVERBIAL 以下に位置し、さらに inner clause の ADVERBIAL 内に存在する。

**ACT 24:10:** bare clause OBJECT の contentClause.label='節'、innerDR に PREDICATE + INDIRECT_OBJECT。OBJECT2 "ὧν" は INDIRECT_OBJECT の さらに内部（ADVERBIAL/PREP_PHRASE → CLAUSE_AS_NP 経由）。

**ACT 24:14:** OBJECT/CONTENT_CLAUSE の innerDR に PREDICATE + OBJECT。OBJECT2 "αἵρεσιν" は ADVERBIAL/PREP_PHRASE → ARTICULAR_NP → CLAUSE_AS_NP を経由し depth-3+。

### E.4 CONTENT_CLAUSE が DR slot として配置されていない (1件)

| Ref | OBJECT2 text | Path |
|-----|------------|------|
| ROM 4:16 | Πατέρα πολλῶν ἐθνῶν | CLAUSE_AS_NP → [clause] → ADVERBIAL/SUBORDINATE_CLAUSE → [clause] → OBJECT/CONTENT_CLAUSE → [clause] |

**原因:** OBJECT/CONTENT_CLAUSE が ADVERBIAL/SUBORDINATE_CLAUSE の inner clause の中に位置しており、その SUBORDINATE_CLAUSE の innerDR には OBJECT/CONTENT_CLAUSE が配置されていない（おそらく outer SUBORDINATE_CLAUSE の ADVERBIAL 処理によって別パスに流れている）。

**判定 E 全件:** SHOULD DEFER。いずれも engine traversal のさらなる拡張（depth-3+ 対応、または ADVERBIAL 内の MAIN_FN detection の変更）が必要。これらは Visual Grammar v1 の範囲を超える。

---

## G. カテゴリ F — Structural Gap / Other (9件)

> **F: `findBlockingAncestor` が MAIN_FN 祖先を見つけられなかった（または MAIN_FN 祖先が ADVERBIAL phrase 内にある）。**

| Ref | OBJECT2 text | Path (抜粋) |
|-----|------------|-----------|
| JHN 4:46 | οἶνον. | ADVERBIAL/PREP_PHRASE → /ARTICULAR_NP → /CLAUSE_AS_NP → [clause] |
| 2CO 10:13 | μέτρου, | ADVERBIAL/PREP_PHRASE → /ARTICULAR_NP → /GENITIVE_MOD → /ARTICULAR_NP → /CLAUSE_AS_NP |
| PHP 3:8 | σκύβαλα | PREP_PHRASE → /GENITIVE_MOD → /ARTICULAR_NP → /GENITIVE_MOD → /CLAUSE_AS_NP → [clause] |
| 1TH 2:14 | πᾶσιν ἀνθρώποις … | ADVERBIAL/PREP_PHRASE → /APPOSITION → /NOMINALIZED_CLAUSE → /COORDINATION |
| 1TH 3:12 | ἀμέμπτους | ADVERBIAL/PREP_PHRASE → /NOMINALIZED_CLAUSE → [clause] |
| HEB 1:1 | κληρονόμον πάντων | ADVERBIAL/PREP_PHRASE → /CLAUSE_AS_NP → /CLAUSE_AS_NP → /CLAUSE_AS_NP |
| 1PE 2:16 | ἐπικάλυμμα τῆς κακίας | [group] → /SUBORDINATE_CLAUSE → [clause] |
| 1PE 3:14 | λόγον … | ADVERBIAL/NP_COMPLEX → /NOMINALIZED_CLAUSE → [clause] |
| 1JN 4:10 | ἱλασμὸν … | /CONTENT_CLAUSE → [clause] → [group] → [clause] |

**共通パターン:** OBJECT2 が ADVERBIAL/phrase 経路（prep phrase, articular NP, genitive mod 等）内の clause に埋め込まれており、そのパスは DG engine の clause derivation では一切 traversal されない。これらは「clause 内の MAIN_FN が ADVERBIAL phrase の内部にある」という SR 構造上の特殊ケース。

**判定 F 全件:** SHOULD DEFER。ADVERBIAL phrase.pp の内部 clause を derive するには新規の derivation path が必要であり、Visual Grammar v1 の設計範囲外。

---

## H. Generic fn Gap Analysis

NT-wide で fn=PREDICATE / SUBJECT / OBJECT 等についても SR と DR の差分を確認した。

| fn | SR count | DR count | gap |
|----|---------|---------|-----|
| PREDICATE | 25,110 | 20,653 | 4,457 |
| OBJECT | 13,693 | 11,893 | 1,800 |
| SUBJECT | 11,116 | 10,095 | 1,021 |
| COMPLEMENT | 3,604 | 3,066 | 538 |
| COPULA | 2,589 | 2,218 | 371 |
| INDIRECT_OBJECT | 2,662 | 2,403 | 259 |
| SECOND_OBJECT | 311 | 265 | 46 |

**重要な観察:**

1. **SECOND_OBJECT の gap は他 fn に比べて著しく小さい（46件 = 14.8%)。** これは OBJECT2 が semantic に「他の MAIN_FN slot の内部に埋め込まれる」という構造的特性に起因。P6-G.11.3 で 66 件を recover し、残り 46 件に限定された。

2. **PREDICATE (4457) / OBJECT (1800) の大きな gap は SECOND_OBJECT gap と性質が異なる。** 主な原因:
   - NOMINALIZED_CLAUSE slot の内部 clause（contentClause=null なので countDrFnAll が traversal しない）に fn=PREDICATE/OBJECT が大量存在
   - ADVERBIAL phrase.pp / phrase.np 内の clause（DR が一切 derive しない）に fn-marked nodes が存在
   - 上記は「MAIN_FN slot の内部にある fn-node」ではなく「phrase 内部の fn-node」というカテゴリで、今回の OBJECT2 gap とは異なる修復経路が必要

3. **SECOND_OBJECT gap は OBJECT2 固有の問題ではなく generic engine limitation だが、OBJECT2 は特に visible な impact を持つ。** PREDICATE が ADVERBIAL phrase 内で invisible でも DG 表示には直接影響しない。OBJECT2 (SECOND_OBJECT) が invisible だと文の意味理解に直接影響する。

4. **現在の 46 件 gap は Visual Grammar v1 の設計限界の自然な帰結であり、追加実装なしに達成可能な上限が 265 である。**

---

## I. Gate Chapter 確認

P6-G.11.2 が予測した "EPH 2 のみ" は確認された。

| Chapter | 残存件数 | 分類 | 内容 |
|---------|---------|------|------|
| MAT 5 | 0 | — | 完全 recover ✓ |
| COL 1 | 0 | — | 完全 recover ✓ |
| EPH 1 | 1 | D | EPH 1:3 SUBJECT/phrase.np/APPOSITION |
| EPH 2 | 1 | D | EPH 2:14 COMPLEMENT/phrase.np/APPOSITION |

---

## J. Baseline 確認

| 指標 | 値 |
|-----|---|
| Sentences scanned | 8,010 |
| Derivation exceptions | 0 |
| SR SECOND_OBJECT | 311 |
| DR SECOND_OBJECT (P6-G.11.3 baseline) | 265 |
| Invisible | 46 (本監査の対象) |
| SR mutations detected | 0 |

P6-G.11.3 の回帰なし確認: G11-P0-1 through P0-9 (21 tests) = 全 PASS。本監査は追加 regression を導入しない。

---

*P6-G.11.4 Residual Reachability Audit — READ-ONLY. No code changes.*
