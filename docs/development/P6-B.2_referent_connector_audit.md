# P6-B.2 Referent-to-Diagram Connector Boundary Audit

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE (READ-ONLY)  
**Production code changes:** 0  
**SR schema changes:** 0

---

## 監査前提

P6-B.1 の結論:

```
bible_data.referent = MACULA coreference annotation (classification: E / mixed)
Safe field name: evidence.referentTokenId (NOT antecedentTokenId)
Distribution: 84.8% noun/adj/ptc safe; 1.3% finite verb unsafe; 6.1% multi-token mismatch
```

P6-B.2 の問い:

> MACULA の `referent` を Reed–Kellogg / Leedy 型 Diagram の
> `relative clause → syntactic head` connector の根拠として使用してよいか？

First Principle（mandate より）:

```
Diagram connector = "この relative clause は、この nominal constituent に syntactically attached"
MACULA referent   = "この token が何を refer / corefer しているか"
この2つを同一視してはならない
```

---

## Audit A: 系統的ケースサンプリング

### A-1: 通常の名詞先行詞 (noun antecedent)

| # | Passage | rel. text | morph | referent token | target morph | MACULA→DG適合 |
|---|---|---|---|---|---|---|
| 1 | JHN 1:9!6 | ὃ | R-NSN | n43001009003 = φῶς | N-NSN | ✅ token OK / ⚠️ phrase R2 |
| 2 | JHN 1:3!11 | ὃ | R-NSN | n43001003010 = ἕν | A-NSN | ✅ R1 (direct sibling) |
| 3 | JHN 1:30!11 | ὃς | R-NSM | n43001030010 = ἀνήρ | N-NSM | ✅ token OK |
| 4 | COL 1:15!1 | ὅς | R-NSM | n51001013015 = υἱοῦ | N-GSM | ✅ cross-verse 2v |
| 5 | 1CO 1:8!1 | ὃς | R-NSM | n46001007012 = κυρίου | N-GSM | ✅ cross-verse 1v |
| 6 | 1PE 1:8!1 | ὃν | R-ASM | n60001007024 = Ἰησοῦ | N-GSM | ✅ cross-verse 1v |
| 7 | 1PE 2:4!2 | ὃν | R-ASM | n60002003006 = κύριος | N-NSM | ✅ cross-verse 1v |
| 8 | 1PE 1:12!1 | οἷς | R-DPM | n60001010007 = προφῆται | N-NPM | ✅ cross-verse 2v |
| 9 | LUK 9:9!13 | οὗ | R-GSM | n42008050003 = Ἰησοῦς | N-NSM | ✅ cross-**chapter** |
| 10 | ACT 22:4!1 | ὃς | R-NSM | n44021040005 = Παῦλος | N-NSM | ✅ cross-**chapter** |

**所見:** 名詞先行詞は概ね MACULA referent = DG connector target として適合。cross-verse (227件) も問題なし。cross-chapter は 4件のみ — SR renderer が別章の SR ファイルを参照する必要がある。

### A-2: Object relative clause

| # | Passage | rel. text | morph | function | target morph | 適合 |
|---|---|---|---|---|---|---|
| 11 | JHN 1:3!11 | ὃ | R-NSN | SUBJECT in rel. clause | ἕν (A-NSN) | ✅ R1 |
| 12 | JHN 1:33!16 | ὃν | R-ASM | inside PREP_PHRASE | — | ⚠️ PP nested |
| 13 | COL 1:16!1 | ὅτι | — | — | — | N/A |
| 14 | 1CO 10:16!5 | ὃ | R-ASN | OBJECT in rel. clause | — | check needed |

**所見:** Object relative では relative pronoun が fn=OBJECT → SUBJECT が別に存在 → antecedent は parent clause 側に存在。SR の CLAUSE_AS_NP grandparent 構造で確認可能。

### A-3: Subject relative clause (adnominal)

| # | Passage | rel. text | SR context | target morph | 適合 |
|---|---|---|---|---|---|
| 15 | JHN 1:9!6 | ὃ fn=SUBJECT | clause → phrase.np(CLAUSE_AS_NP) → clause | φῶς N-NSN | ✅ |
| 16 | JHN 1:30!11 | ὃς fn=SUBJECT | clause → phrase.np(CLAUSE_AS_NP) → … | ἀνήρ N-NSM | ✅ |
| 17 | 1CO 1:8!1 | ὃς fn=SUBJECT | clause → phrase.np(CLAUSE_AS_NP) → … | κυρίου N-GSM | ✅ |

**所見:** Subject relative の大部分は CLAUSE_AS_NP grandparent を持つ → relative clause が NP の構成要素として SR に記録されている。

### A-4: Prepositional relative clause (ἐν ᾧ 型)

| # | Passage | rel. text | SR context | target morph | 適合 |
|---|---|---|---|---|---|
| 18 | JHN 1:47!17 | ᾧ R-DSM | PREP_PHRASE(ἐν ᾧ) → clause | Ἰσραηλίτης N-NSM | ✅ nominal OK / case mismatch expected |
| 19 | JHN 1:33!16 | ὃν R-ASM | PREP_PHRASE → clause → … | — | ⚠️ nested |
| 20 | 1CO 1:9!5 | οὗ R-GSM | PREP_PHRASE → clause | — | nominal expected |
| 21 | EPH 2:2!3 | ἐν ᾗ | PREP_PHRASE → clause → … | — | check needed |

**所見:** PP 内の relative pronoun の SR parent は clause ではなく phrase.pp (PREP_PHRASE)。Diagram connector は prep phrase 全体から antecedent へ。ただし MACULA referent は正しく antecedent を指す。case mismatch (dative pronoun, nominative antecedent) は PP relative の正常な統語動作。

### A-5: Nested relative clause

| # | Passage | 構造 | 課題 |
|---|---|---|---|
| 22 | JHN 1:3!11 | ὃ (inner) inside phrase.np of outer clause | ✅ 構造が SR に記録済み |
| 23 | 1CO 15 系 | nested relative inside object | ⚠️ SR depth が増加 |

### A-6: Coordinated relative clause (multiple clauses)

| # | Passage | rel. text | 課題 |
|---|---|---|---|
| 24 | ROM 16:4!1 | οἵτινες | R3: referent = "n45016003002 n45016003004" (2 tokens) |
| 25 | 1TI 1:4!7 | αἵτινες | R3: referent = 2 tokens |

### A-7: Ambiguous / edge cases

| # | Passage | issue | R-type |
|---|---|---|---|
| 26 | MRK 4:16!10 | referent → demonstrative pronoun οὗτοί | R5 |
| 27 | LUK 8:13!19 | referent → article οἱ | R8 |
| 28 | MRK 5:41!11 | referent → Aramaic word (ARAM morph) | R8 |
| 29 | LUK 10:35!16 | referent → X-morph (indefinite) | R8 |
| 30 | 1CO 10:11!12 | cross-chapter: → 1CO 6 ἅγιοι | R1 cross-chapter |

### A-8: Finite verb referent (全 11 件)

| # | Passage | rel. text | target ref | target text | target morph |
|---|---|---|---|---|---|
| 31 | JHN 1:13!1 | οἳ | JHN 1:12!3 | ἔλαβον | V-2AAI-3P |
| 32 | LUK 6:3!11 | ὃ | LUK 6:4!2 | εἰσῆλθεν | V-2AAI-3S |
| 33 | LUK 18:30!1 | ὃς | LUK 18:29!12 | ἀφῆκεν | V-AAI-3S |
| 34 | ACT 3:15!13 | οὗ | ACT 3:15!10 | ἤγειρεν | V-AAI-3S |
| 35 | ACT 11:30!1 | ὃ | ACT 11:29!7 | ὥρισαν | V-AAI-3P |
| 36 | ROM 6:16!12 | ᾧ | ROM 6:16!5 | παριστάνετε | V-PAI-2P |
| 37 | ROM 9:6!2 | οἷον | ROM 9:6!5 | ἐκπέπτωκεν | V-RAI-3S |
| 38 | GAL 2:10!6 | ὃ | GAL 2:10!5 | μνημονεύωμεν | V-PAS-1P |
| 39 | EPH 3:4!2 | ὃ | EPH 3:3!8 | προέγραψα | V-AAI-1S |
| 40 | COL 1:29!2 | ὃ | COL 1:28!15 | παραστήσωμεν | V-AAS-1P |
| 41 | 1PE 2:8!13 | ὃ | 1PE 2:8!8 | προσκόπτουσιν | V-PAI-3P |

**所見:** 11件すべてが動詞本体を指す discourse event reference。DG renderer がこれらの referent を connector target として使用した場合、動詞トークンへの connector が描画される → 構文的に誤り。

### A-9: Multi-token referent (全 66 件の代表例)

| # | Passage | rel. text | referent | target count |
|---|---|---|---|---|
| 42 | 1CO 15:3!6 | ὃ | 4 tokens spanning v3-5 | 4 |
| 43 | 1PE 1:12!10 | ἃ | 2 tokens | 2 |
| 44 | 1PE 4:4!2 | ᾧ | 6 tokens | 6 |
| 45 | ROM 16:4!1 | οἵτινες | 2 tokens (Πρίσκαν + Ἀκύλαν) | 2 |
| 46 | 1TI 1:4!7 | αἵτινες | 2 tokens | 2 |
| 47 | 1TI 6:9!16 | αἵτινες | 3 tokens | 3 |

**所見:** Space-separated の multi-token referent は `string` フィールドに格納すると解析が必要。DG connector は複数 token のどれに引くかを確定できない。

---

## Audit B: Failure Taxonomy (R1-R8) 全件集計

### R-Type 定義と NT corpus 集計

| R-Type | 定義 | 件数 | % of 1,079 |
|---|---|---|---|
| **R1** | referent token が relative clause の直接の sibling として共通 NP 内に存在 | 少数 (推定 ~50) | ~4.6% |
| **R2** | referent token は正しい head だが、DG connector は上位 phrase.np node を target にする必要がある場合 | 多数 (推定 ~900) | ~83.4% |
| **R3** | space-separated multi-token referent | 66 | 6.1% |
| **R4** | finite verb referent (event reference) | 11 | 1.0% |
| **R5** | demonstrative pronoun / coreference chain 中継 | 10 | 0.9% |
| **R6** | free relative (referent = null): connector 不要 | 598 (別集計) | — |
| **R7** | referent が SR に存在しない | 0 | 0% |
| **R8** | other: article head, Aramaic, X-morph indefinite | ~42 | ~3.9% |

**注記 (R1 vs R2 の区別):**

R1 と R2 の実際の区別は「connector の target が token レベルで OK か、phrase レベルが必要か」という設計判断に依存する。Reed–Kellogg 伝統的スタイルでは connector は head noun **token** へ引く → R1/R2 区別は不要 (両方 SAFE)。modern NP-bracket スタイルでは phrase.np node へ引く → R2 は追加 SR traversal が必要。

この区別は P6-B.2 が解決すべき設計判断であり、本 audit ではデータを提示する。

---

## Audit C: SR 内での relative pronoun の構造的位置

### SR structural context 集計 (NT 全体 1,677件)

| 構造 | 件数 | % | DG connector への影響 |
|---|---|---|---|
| STANDALONE_clause | 825 | 49.2% | antecedent が同一 SR サブツリーに**含まれない** — referent が唯一の手がかり |
| CLAUSE_AS_NP_child | 542 | 32.3% | relative clause と antecedent NP が共通 CLAUSE_AS_NP 下に共存 |
| PREP_PHRASE_child | 204 | 12.2% | relative pronoun が prep phrase 内 — connector は PP 全体から antecedent へ |
| other (phrase.np parent, etc.) | 106 | 6.3% | case-by-case |

### 重要発見: STANDALONE が 49.2%

STANDALONE 構造では、SR ツリーに relative clause の antecedent への明示的な structural link が**存在しない**。

```
[main clause]
├── [NP: antecedent]  ←── この NP は relative clause の兄弟でも子でもない
└── [relative clause]
    └── ὃς (fn=SUBJECT)
```

→ SR ツリーのみから connector を描画する場合、antecedent への経路が存在しない。
→ MACULA `referent` が **connector を描画するための唯一の根拠** となる。

### CLAUSE_AS_NP 構造の内部分類

```
phrase.np (CLAUSE_AS_NP)
├── [antecedent phrase / token]
└── clause (relative clause)
    └── ὃς
```

この構造では antecedent が relative clause と共通の NP 親を持つ。ただし antecedent が単一 token か phrase かによって R1/R2 に分類される。

---

## Audit D: Token-level vs Phrase-level Mismatch

### 問題の定式化

```
MACULA referent → 単一 token ID (head noun の xml:id)
DG connector target (選択肢) → 
  (a) head noun token  [Reed–Kellogg 伝統]
  (b) antecedent NP phrase node  [NP-bracket スタイル]
```

### 具体例: JHN 1:9!6

```
SR 構造:
phrase.np (CLAUSE_AS_NP, fn=SUBJECT)
├── phrase.np (ARTICULAR_NP)
│   ├── τὸ  (article)
│   ├── φῶς (N-NSN) ← MACULA referent = n43001009003
│   ├── τὸ  (article)
│   └── ἀληθινόν (adjective)
└── clause (relative clause)
    └── ὃ (fn=SUBJECT)

MACULA が指す: φῶς (token ID n43001009003)
Reed–Kellogg connector target: φῶς (同上) → (a) で充足
NP-bracket connector target: phrase.np(ARTICULAR_NP) → (b) では SR traversal 追加が必要
```

### 具体例: JHN 1:3!11 (R1 case)

```
SR 構造:
phrase.np (CLAUSE_AS_NP, fn=SUBJECT)
├── ἕν (A-NSN) ← MACULA referent = n43001003010 (direct token child)
└── clause (relative clause)
    └── ὃ (fn=SUBJECT)

MACULA が指す: ἕν (direct token child of NP)
Reed–Kellogg connector: ἕν → (a) で充足
NP-bracket connector: ἕν (子が1 token なので同一) → (b) でも充足
```

### 設計への含意

| Connector スタイル | MACULA referent の適合 | 追加作業 |
|---|---|---|
| (a) Head noun token へ | ✅ 直接利用可 (R4・R3 を除く) | morph filter のみ |
| (b) NP phrase node へ | ⚠️ 追加 SR traversal が必要 | referent token → 親 phrase.np を検索 |

**本 audit の結論:** Reed–Kellogg 伝統では (a) が標準。(b) は実装上の選択。MACULA referent は (a) スタイルで直接利用可能。(b) スタイルでも referent token の SR 親を検索することで解決可能。

---

## Audit E: Finite Verb Referent 全件分析

11件全て Audit A-8 に記載済み。共通の特徴:

1. **同一節内または直前節の動詞** を指す
2. relative pronoun の意味的解釈は「〜した（こと）」「〜する（こと）」— **事象/行為への参照**
3. DG connector として使用した場合: **動詞 token への connector** → 統語的誤り

### Finite verb referent の DG 描画禁止根拠

```
JHN 1:13!1  οἳ → ἔλαβον
正しい解釈: "those who received him" — relative clause は ἔλαβον (受けた事象) を antecedent とする discourse reference
誤った描画: relative clause bracket ← connector → ἔλαβον (V-2AAI-3P)
         ↑ この connector は構文的に意味をなさない (動詞を名詞的先行詞として扱う)
```

---

## Audit F: Multi-token Referent 全件分析

66件の space-separated referent についての構造分類:

| パターン | 推定件数 | 代表例 |
|---|---|---|
| 複数の並列名詞 (固有名詞 2名等) | ~30 | ROM 16:4!1: Πρίσκαν + Ἀκύλαν |
| 動詞節が連続する複数事実 | ~20 | 1CO 15:3!6: 死・葬・復活・顕現 (4件) |
| 長い列挙 | ~10 | 1PE 4:4!2: 6 tokens |
| その他 | ~6 | 1TI 6:9!16: 3 tokens |

### DG connector への影響

```
ROM 16:4!1 referent = "n45016003002 n45016003004"
= Πρίσκαν (N-ASF) + Ἀκύλαν (N-ASM) → 2 人の並列先行詞

DG connector: どちらの token に引くか？
→ 両方に引く: 2 connectors → 実装が複雑
→ 最初の token に引く: 2番目の先行詞が無視される
→ connector を描画しない: 先行詞情報が失われる
```

**66件は single connector では対応不可。P6-C 前に方針決定が必要。**

---

## Audit G: MACULA referent の DG connector 適合性総括

| 判定基準 | 結果 |
|---|---|
| referent が nominal target を指すか | 84.8% YES / 1.0% NO (finite verb) / 6.1% MULTI / 3.9% MIXED |
| referent が syntactic antecedent と一致するか | 87%+ で一致 (nominal cases) |
| referent が cross-verse であっても DG connector に使用可能か | YES (cross-chapter 4件以外) |
| referent の token-level vs phrase-level 問題 | Reed–Kellogg (a) スタイルでは問題なし |
| referent なし (free relative) のケース | 598件 (35.7%) — connector なし = 正しい |
| finite verb referent の DG 誤描画リスク | 11件 / 1,079 件 (1.0%) — 必須フィルタ |
| multi-token referent の未解決問題 | 66件 / 1,079 件 (6.1%) — 方針決定必要 |

---

## Audit H: 境界分析 (First Principle 適用)

### 命題 1: MACULA referent を DG connector の根拠として使用することは合法か？

**結論: CONDITIONAL YES**

- referent は discourse coreference annotation (P6-B.1 確認)
- relative pronoun の場合、84.8% で syntactic antecedent と一致する
- DG connector は "structural attachment" を表す
- 両者は完全に同一ではないが、84.8% のケースで重なる

**条件:**
1. target morph が nominal (N-*, A-*, V-*P-*) であることを確認 → R4 排除
2. space-separated multi-token の場合は connector を描画しない or 別処理 → R3 排除
3. connector の情報源として「MACULA coreference annotation に基づく」ことを文書化

### 命題 2: MACULA referent を使用しない場合の代替は何か？

SR に relative clause → antecedent の explicit syntactic relationship が存在しない現状、代替は:
- 新規 SR フィールド (evidence.antecedentNPId 等) の追加 → P6-C 以降の実装作業が必要
- heuristic inference → L-0 禁止
- connector を描画しない → 機能欠落

**MACULA referent は、現在の SR schema で利用可能な唯一の実用的な connector 根拠である。**

---

## Audit I: Architecture Options 評価

### Option A: 直接利用 (MACULA referent → connector target)

```
connector.target = referentTokenId (as-is)
```

- ✅ 実装が最小
- ❌ R4 (finite verb): 動詞への connector (構文的誤り)
- ❌ R3 (multi-token): 空白区切りを tokenId として解析エラー
- ❌ 設計の透明性が低い (coreference annotation から syntactic connector を直接生成)
- **UNSAFE — 採用不可**

### Option B: Morph フィルタ付き利用

```
if (target.morph.startsWith('N-') || target.morph.startsWith('A-') || target.morph.includes('P-')) {
  connector.target = referentTokenId
}
if (referentTokenId.includes(' ')) { skip; }
```

- ✅ R4 を排除 (11件)
- ✅ R3 を排除 (66件)
- ✅ 84.8% のケースで valid connector
- ⚠️ R5 (demonstrative chain 10件) は still drawn (chain 経由の connector — 誤りではないが精度低)
- ⚠️ Reed–Kellogg (a) スタイル (token-level connector)
- **CONDITIONALLY SAFE — 実用的な第一選択**

### Option C: Morph フィルタ + Phrase-level 解決

```
target = SR.findTokenById(referentTokenId)
targetPhrase = SR.parentPhrase(target)  // 直近の phrase.np ancestor
connector.target = targetPhrase.id
```

- ✅ R4, R3 を排除
- ✅ NP-bracket スタイルの diagram に対応
- ⚠️ SR traversal ロジックが必要 (L-0 境界: annotation transfer ではなく構造検索)
- ⚠️ "直近の phrase.np" の定義に曖昧性あり (ARTICULAR_NP? CLAUSE_AS_NP?)
- **CONDITIONALLY SAFE — (b) スタイル diagram に適切**

### Option D: 明示的 SR syntactic フィールド

```
// SR (relative pronoun token):
{
  evidence: {
    referentTokenId: "n43001009003",     // MACULA coreference (既存)
    antecedentNPNodeId: "JHN#JHN 1:9!2…JHN 1:9!5"  // SR syntactic attachment (新規)
  }
}
```

- ✅ First Principle を最も純粋に実現
- ✅ coreference と syntactic attachment が明示的に分離
- ❌ SR builder への新実装が必要 (P6-C 以降)
- ❌ antecedentNPNodeId の自動生成は推論を含む → L-0 境界の別途検討が必要
- **IDEAL — 長期アーキテクチャとして推奨、即時実装は P6-C 以降**

### Option E: Referent を使用しない

```
// DG connector を描画しない (antecedent annotation が確立するまで)
```

- ✅ 誤った connector を描画しない
- ❌ relative clause の antecedent が UI 上で表示されない
- ❌ 1,013件の valid な connector が失われる
- **CONSERVATIVE — acceptable as interim if P6-C starts quickly**

---

## Audit J: Cross-verse / Cross-chapter 境界

| カテゴリ | 件数 | % | 実装への影響 |
|---|---|---|---|
| 同一節内 (same-verse) | 786 | 72.8% | ✅ 問題なし |
| 異節・同章 (cross-verse) | 223 | 20.7% | ✅ 同一 SR ファイルで解決可能 |
| 異章・同書 (cross-chapter) | 4 | 0.4% | ⚠️ 別 SR ファイルの参照が必要 |
| 異書 (cross-book) | 0 | 0% | N/A |

**Cross-chapter 4件:**
```
LUK 9:9!13 → LUK 8:50!3 (Ἰησοῦς)
ACT 22:4!1 → ACT 21:40!5 (Παῦλος)
1CO 10:11!12 → 1CO 6:2!6 (ἅγιοι)
GAL 5:4!4 → GAL 4:31!2 (ἀδελφοί)
```

**実装への含意:** DG renderer が cross-chapter referent を解決するには、別章の SR データをロードする必要がある。4件のみなので、解決できない場合は connector を描画しない (fallback = null) として処理可能。

---

## 禁止事項の遵守確認

| 禁止項目 | 状態 |
|---|---|
| production code 変更 | 変更なし ✅ |
| SR schema 変更 | 変更なし ✅ |
| dg-engine.js 変更 | 変更なし ✅ |
| referent filtering logic の実装 | 実施せず ✅ |
| antecedent inference の実装 | 実施せず ✅ |
| coreference resolution の実装 | 実施せず ✅ |
| heuristic の追加 | 実施せず ✅ |
| commit / merge / deploy | 実施せず ✅ |

---

*詳細: P6-B.2_relationship_matrix.md / P6-B.2_test_matrix.md / P6-B.2_final_report.md*
