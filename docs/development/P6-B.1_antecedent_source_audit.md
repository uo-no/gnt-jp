# P6-B.1 Antecedent Source Semantics Audit

**Phase:** P6 — SR Schema Analysis  
**Date:** 2026-08-20  
**State:** AUDIT-COMPLETE (READ-ONLY)  
**Production code changes:** 0  
**SR schema changes:** 0

---

## Mission

P6-B の推奨では `bible_data.referent` を `evidence.antecedentTokenId` として SR に転写することを提案した。  
本監査は、その前提条件である「`bible_data.referent` は syntactic antecedent を安全に表現するか」を厳密に検証する。

---

## Audit A — Source Definition

### A-1. `referent` フィールドの定義と Producer

**Source: MACULA Greek Linguistic Datasets (Clear Bible / Biblica, CC BY 4.0)**

- Producer: Clear Bible が MACULA プロジェクトで注釈付与
- 格納場所: `work/SBLGNT/lowfat/*.xml` の `<w referent="...">` 属性
- 転写経路: `flow-tree-adapter.js` → `build-flow-tree.cjs` → `bible_data/nt/{BOOK}/{ch}.json`
- 転写方針: 「値を改変せず」生の Lowfat 文字列のまま保持 (L-0 準拠)

```
flow-tree-adapter.js: SF-11（schema v2）
"frame/referent の node id は解決せず生のまま運ぶ"
"意味解釈・正規化・別relationへの変換をしない"
```

### A-2. CONFIRMED: `referent` が付与されるトークン種別

bible_data/nt/JHN/1.json の実測:

| class / type | 例 | referent 用途 |
|---|---|---|
| pron / relative | ὃ (R-NSN) | relative pronoun → antecedent token |
| pron / personal | αὐτοῦ (P-GSM) | personal pronoun → discourse entity |
| pron / demonstrative | οὗτος (D-NSM) | demonstrative → discourse entity |
| adj / — | ἴδια (A-APN) | pronominal adjective → discourse entity |
| det / — | οἱ (T-NPM) | definite article (substantival) → discourse entity |
| adv / — | ὅπου (ADV) | locative adverb → discourse referent |

**CONFIRMED: `referent` は relative pronoun 専用ではない。 coreference アノテーションとして、personal pronoun・demonstrative・adjective・article・adverb にも付与される。**

### A-3. `referent` の値形式

| 形式 | 例 | 件数 |
|---|---|---|
| 単一 nodeId | `n43001003010` | 1,012/1,078 (93.9%) |
| space-separated 複数 nodeId | `n46015003011 n46015004003 ...` | 66/1,078 (6.1%) |

- 単一 nodeId = n + book(2桁) + chapter(3桁) + verse(3桁) + word-index(3桁)
- 形式は SR token の `id` フィールドと一致する

### A-4. null の意味

bible_data に `referent` フィールドが存在しない = MACULA が coreference を注釈しなかった

相対代名詞において null の理由:
1. **Free relative** (先行詞なし: "whoever", "whatever")
2. **Unresolved / MACULA が先行詞を特定しなかった**
3. **ὅστις 型** (indefinite relative) の一部

**598/1,676 件 (35.7%) が null** (読み取り確認: reading-engine.js Stage K-3 基準値 587/1,658)

### A-5. 受信側の解釈 (reading-engine.js)

reading-engine.js Stage K-3 (FROZEN 2026-07-20):

```javascript
// line 580: bible_data に注釈済みの構造情報
// （role=節内役割 / referent=先行詞トークンID）を
```

> **重要**: reading-engine.js は `referent` を「先行詞トークンID」と解釈しているが、これは ENGINE の解釈であり、MACULA の元定義とは異なる (MACULA は coreference annotation)。

---

## Audit B — Terminology Test

### B-1. MACULA における `referent` の意味

MACULA の `referent` 属性は **coreference annotation** である。

証拠:
1. relative pronoun・personal pronoun・demonstrative に同一フィールドを使用
2. JHN 1:2 "οὗτος" (D-NSM) → n43001001017 = λόγος (v.1 から verse 境界を越えた参照)
3. JHN 1:3 "αὐτοῦ" (P-GSM) × 2 → n43001001017 = 同一 discourse entity を追跡
4. JHN 1:12 "αὐτοῖς" (P-DPM) → n43001012003 = ἔλαβον (動詞! entity anchor として動詞を使用)

MACULA の `referent` は:
> 「このトークンが言語的に指示する discourse entity を代表する別のトークン」
> ≠ 「相対節の syntactic head NP を指す文法的先行詞」

### B-2. Terminology Classification

| 選択肢 | 該当度 |
|---|---|
| A. syntactic antecedent | 部分的 (77.9% のノード) |
| B. semantic referent | 部分的 (finite verb cases) |
| C. discourse referent | 部分的 (personal/demo pronoun 用途) |
| D. coreference target | **主たる定義** |
| **E. mixed / ambiguous** | **CONFIRMED: 相対代名詞用途で E** |
| F. unknown | 否 (ソース確認済み) |

**Audit B 判定: E (mixed / ambiguous)**

relative pronoun の `referent` は:
- 大多数 (84.8%) は syntactic antecedent と一致する
- しかし MACULA は coreference annotaion として設計しており、動詞・指示代名詞への参照も含む

---

## Audit C — Representative Corpus Cases

NT corpus 全体 (1,676 相対代名詞、1,078 referent 有) から 20 件の代表ケースを調査。

| # | Passage | relative token | referent | target token | target morph | cross-verse | semantic inference req? | L-0 safe? |
|---|---|---|---|---|---|---|---|---|
| 1 | JHN 1:3!11 | ὃ (R-NSN) | n43001003010 | ἕν | A-NSN (numeral/adj) | No | No | ✅ YES |
| 2 | JHN 1:9!6 | ὃ (R-NSN) | n43001009003 | φῶς | N-NSN (noun) | No | No | ✅ YES |
| 3 | JHN 1:27!5 | οὗ (R-GSM) | n43001027004 | ἐρχόμενος | V-PNP-NSM (participle) | No | No | ✅ YES (nominal ptc) |
| 4 | JHN 1:30!11 | ὃς (R-NSM) | n43001030010 | ἀνὴρ | N-NSM (noun) | No | No | ✅ YES |
| 5 | JHN 1:47!17 | ᾧ (R-DSM) | n43001047015 | Ἰσραηλίτης | N-NSM (noun) | No | No | ✅ YES |
| 6 | COL 1:15!1 | ὅς (R-NSM) | n51001013015 | υἱοῦ | N-GSM (noun) | **YES** | No | ✅ YES |
| 7 | 1CO 1:8!1 | ὃς (R-NSM) | n46001007012 | κυρίου | N-GSM (noun) | **YES** | No | ✅ YES |
| 8 | ROM 6:16!12 | ᾧ (R-DSN) | n45006016005 | παριστάνετε | **V-PAI-2P (finite!)** | No | **YES** | ❌ NO |
| 9 | JHN 1:13!1 | οἳ (R-NPM) | n43001012003 | ἔλαβον | **V-2AAI-3P (finite!)** | **YES** | **YES** | ❌ NO |
| 10 | 1PE 2:8!7 | οἳ (R-NPM) | n60002007007 | ἀπιστοῦσιν | V-PAP-DPM (participle) | **YES** | No | ✅ YES (nominal ptc) |
| 11 | 1CO 15:3!6 | ὃ (R-ASN) | **MULTI:4** | ἀπέθανεν | V-2AAI-3S | No | **YES (多重)** | ⚠️ PARTIAL (4 tokens) |
| 12 | MRK 4:16!10 | οἳ (R-NPM) | n41004016002 | οὗτοί | **D-NPM (demo!)** | No | No | ⚠️ PARTIAL (chain) |
| 13 | JHN 10:35!6 | οὓς (R-APM) | n43010035002 | ἐκείνους | **D-APM (demo!)** | No | No | ⚠️ PARTIAL (chain) |
| 14 | ACT 21:23!4 | ὅ (R-ASN) | n44021023001 | τοῦτο | D-ASN (demo) | No | No | ⚠️ PARTIAL (chain) |
| 15 | 1CO 3:11!10 | ὅς (R-NSM) | n46003011009 | κείμενον | V-PNP-ASM (participle) | No | No | ✅ YES (nominal ptc) |
| 16 | 1TH 5:24!5 | ὃς (R-NSM) | n52005024003 | καλῶν | V-PAP-NSM (participle) | No | No | ✅ YES (nominal ptc) |
| 17 | LUK 8:13!19 | οἳ (R-NPM) | n42008013001 | οἱ | **T-NPM (article!)** | No | No | ⚠️ PARTIAL (art head) |
| 18 | ROM 2:29!14 | οὗ (R-GSM) | n45002029002 | ὁ | T-NSM (article) | No | No | ⚠️ PARTIAL (art head) |
| 19 | GAL 2:10!6 | ὃ (R-ASN) | n48002010005 | μνημονεύωμεν | **V-PAS-1P (finite!)** | No | **YES** | ❌ NO |
| 20 | EPH 3:4!2 | ὃ (R-ASN) | n49003003008 | προέγραψα | **V-AAI-1S (finite!)** | **YES** | **YES** | ❌ NO |

**Case Classification Summary:**

| Pattern | Cases | L-0 Status | DG Connector |
|---|---|---|---|
| Noun antecedent (same verse) | 4 (#2,4,5) | ✅ SAFE | 可 |
| Noun antecedent (cross-verse) | 2 (#6,7) | ✅ SAFE | 可 |
| Nominal participle antecedent | 4 (#3,10,15,16) | ✅ SAFE | 可 |
| **Finite verb referent (event)** | **4 (#8,9,19,20)** | **❌ NOT syntactic antecedent** | 不可 |
| Multiple antecedent (MULTI) | 1 (#11) | ⚠️ PARTIAL | 特別処理要 |
| Demonstrative pronoun referent | 3 (#12,13,14) | ⚠️ PARTIAL | chain |
| Article (substantival head) | 2 (#17,18) | ⚠️ PARTIAL | 要検証 |
| Adjective antecedent (#1) | 1 | ✅ SAFE | 可 |

---

## Audit D — Critical Counterexamples

### D-1. Finite Verb Referent Cases (14 件確認)

relative pronoun の referent が **finite verb** を指す事例 — syntactic antecedent ではない。

| Passage | relative | target | morph | 構文的解釈 |
|---|---|---|---|---|
| ROM 6:16!12 | ᾧ (R-DSN) | παριστάνετε | V-PAI-2P | "to whomever you present yourselves" — 動詞句全体を参照 |
| JHN 1:13!1 | οἳ (R-NPM) | ἔλαβον | V-2AAI-3P | "those who received" の受け手 (entity anchor as verb) |
| GAL 2:10!6 | ὃ (R-ASN) | μνημονεύωμεν | V-PAS-1P | "which [thing] we should remember" — 動作が参照先 |
| EPH 3:4!2 | ὃ (R-ASN) | προέγραψα | V-AAI-1S | "which I wrote before" — 文書行為が参照先 |
| 1PE 2:8!13 | ὃ (R-ASN) | προσκόπτουσιν | V-PAI-3P | "to which they stumble" — 事象が参照先 |
| ACT 3:15!13 | οὗ (R-GSM) | ἤγειρεν | V-AAI-3S | "of whom God raised" — 行為事象が参照先 |

これら 14 件は **discourse-level event reference** または **semantic event anchor** であり、syntactic antecedent ではない。SR schema で `antecedentTokenId` と命名した場合、動詞 nodeId が格納される — 構造的に不正確。

### D-2. Multiple Antecedent Cases (66 件)

```
1CO 15:3!6  ὃ → "n46015003011 n46015004003 n46015004006 n46015005003"  (4 tokens)
1PE 1:12!10 ἃ → "n60001011017 n60001011022"  (2 tokens)
1TI 1:20!6  οὓς → "n54001020003 n54001020005"  (2 tokens)
```

`antecedentTokenId` (string) が space-separated 複数 ID を格納することは **フィールド仕様と不整合**。

### D-3. Demonstrative Pronoun Referent (9 件)

```
MRK 4:16!10  οἳ (R-NPM) → οὗτοί (D-NPM)
JHN 10:35!6  οὓς (R-APM) → ἐκείνους (D-APM)
```

relative pronoun が demonstrative pronoun を referent として持つ場合、それは「direct syntactic antecedent」ではなく coreference chain の中継 (demonstrative が真の先行詞 NP を指す)。

### D-4. Cross-Verse Referent Cases (227 件 = 21.1%)

```
COL 1:15!1 ὅς → υἱοῦ (COL 1:13!15) — 2 verses before
EPH 3:4!2  ὃ → προέγραψα (EPH 3:3!8) — previous verse
```

cross-verse 参照は syntactic antecedent として完全に正当 (relative clause が verse 境界をまたぐ構文は通常)。ただし SR builder が cross-chapter 参照を解決できる保証が必要 (UNRESOLVED U-3)。

---

## Audit E — 1,078 / 1,676 Claim の再検証

P6-B の「1,078/1,676 (64.3%)」の意味:

| 数値 | 意味 | 根拠 |
|---|---|---|
| **分母 1,676** | NT 全体の relative pronoun 数 (morph R-*/K-*) | 全 NT bible_data スキャン |
| **分子 1,078** | bible_data.referent フィールドあり (非空文字列) | 実測 |
| **598** | referent なし | free relative + unresolved |

**「1,078件 with referent」の内訳 (実測):**

| カテゴリ | 件数 | % | 説明 |
|---|---|---|---|
| Noun target | 840 | 77.9% | syntactic antecedent と一致する可能性高い |
| Adjective target (nominal) | 74 | 6.9% | nominal adjective use = 先行詞として適切 |
| Verb target - participial | 39 | 3.6% | nominal participle = 多くは先行詞 |
| **Verb target - finite** | **14** | **1.3%** | **event reference ≠ syntactic antecedent** |
| Verb target - infinitive | ~4 | ~0.4% | gray area |
| Pronoun target (demonstrative) | 9 | 0.8% | coreference chain |
| Article target | 6 | 0.6% | substantival phrase head |
| Other (X-*, I-*, etc.) | 30 | 2.8% | indefinite, interrogative, etc. |
| **Multiple (space-separated)** | **66** | **6.1%** | **単一フィールド格納不可** |
| Not found (cross-book?) | — | — | 上記 66 件と同一 (indexing gap) |

**結論: 「1,078件 = 先行詞リンク確認済み」ではない。**

正確な解釈:
- 1,078件: MACULA が coreference target を annotation した relative pronoun
- そのうち nominal syntactic antecedent として確実に使用できるのは **840+74 = 914 件 (84.8%)**
- 66件 (6.1%) は複数 token で単一フィールドに格納不可
- 14件 (1.3%) は finite verb = event reference
- 9件 (0.8%) は demonstrative = coreference chain
- 残りは gray area

---

## Audit F — Schema Naming

### F-1. `evidence.antecedentTokenId` という名称の問題

| 問題 | 詳細 |
|---|---|
| 意味の誤称 | "antecedent" = syntactic antecedent を意味する。しかし source data は coreference annotation |
| 動詞 nodeId 格納 | 14件の finite verb cases では `antecedentTokenId` に動詞 nodeId が入る — 明らかに不正確 |
| 複数値非対応 | field = string (単数) だが 66件は space-separated 複数値 |
| L-0 曖昧性 | syntactic claim を暗示する名称を付けることは annotation transfer の境界を越える可能性 |

### F-2. 代替名称の評価

| 候補 | 長所 | 短所 |
|---|---|---|
| `evidence.referentTokenId` | MACULA フィールド名に忠実、semantic claim なし | "antecedent" 概念を失う |
| `evidence.maculaReferentId` | source 明示 | 冗長、内部実装詳細が露出 |
| `evidence.antecedentTokenId` | 直感的、DG 設計に適合 | **source semantics との不一致** |
| `evidence.syntacticHeadTokenId` | syntactic claim を明示 | source data がそれを保証しない |

**推奨: `evidence.referentTokenId`** — MACULA の annotation を「そのまま転写」するフィールドとして、semantic interpretation を加えない名称が適切。

### F-3. `antecedent` という語が semantic interpretation を暗示するか

> YES. `antecedent` は統語論の用語であり、「relative pronoun が syntactically 修飾する名詞句」を意味する。  
> MACULA の `referent` annotation を `antecedentTokenId` として保存することは、annotation の意味を改変する可能性がある。

---

## Audit G — L-0 Boundary

| 情報 | L-0 Status | 根拠 |
|---|---|---|
| bible_data.referent → SR `referentTokenId` として転写 | **PERMITTED** | annotation transfer (evidence.role と同一パターン) |
| relative pronoun は先行詞 NP を syntactically 修飾する | **PERMITTED** (構造事実) | SR tree 構造から導出可能 |
| referent target が noun である場合の connector 描画 | **PERMITTED** | structural annotation からの描画 |
| `referent` を `antecedentTokenId` として命名し syntactic claim を付与 | **BORDERLINE** | coreference data に syntactic interpretation を付加 |
| finite verb referent を "syntactic head" として主張 | **FORBIDDEN** | annotation が事象参照であり、syntactic antecedent ではない |
| discourse referent の同定 | **FORBIDDEN** | L-0 明示禁止 |
| restrictive/non-restrictive の判定 | **FORBIDDEN** | L-0 明示禁止 |

---

## Audit H — Recommendation

### H-3: Mixed semantics — 直接転用は条件付き

**判定理由:**

`bible_data.referent` は MACULA の coreference annotation であり、relative pronoun の syntactic antecedent と以下の関係にある:

- **一致する: 84.8%** (noun + nominal adjective targets)
- **近似する: 3.6%** (nominal participle targets)
- **一致しない: 1.3%** (finite verb targets = event reference)
- **構造不整合: 6.1%** (space-separated multiple tokens)
- **chain: 0.8%** (demonstrative pronoun intermediary)

#### H-3 の条件付き許可条件

以下を満たす場合に限り、P6-C implementation で使用可能:

1. **フィールド名を `referentTokenId` に変更** (not `antecedentTokenId`)
   - Rationale: source data の semantic を正確に反映

2. **documentation に明記**:
   - Source: MACULA coreference annotation
   - 84.8% は名詞先行詞 (nominal antecedent に対応)
   - 1.3% (14件) は finite verb target (event reference)
   - 6.1% (66件) は space-separated 複数 ID (special handling required)

3. **DG renderer は target token の morph を検証してから connector を描画**:
   - target が N-*/A-*/V-*P-* (participle) → connector 描画可
   - target が V-*I-*/V-*S-*/V-*M-* (finite verb) → connector 描画しない or 別表示

4. **複数 token 処理の明示的方針**:
   - Option A: 最初の token のみ使用 (first-fit)
   - Option B: フィールド格納しない (null として保持)
   - 方針決定は P6-C 実装前に確定が必要

#### 却下条件

以下の場合は H-3 を NOT PERMITTED に格下げ:
- フィールド名を `antecedentTokenId` のままにする場合
- DG renderer が target morph 検証なしで connector を描画する場合
- 複数 token 処理方針を定義しないまま実装する場合

---

## 禁止事項の遵守確認

| 禁止項目 | 状態 |
|---|---|
| production code 変更 | 変更なし ✅ |
| SR schema 変更 | 変更なし ✅ |
| reading-engine.js 変更 | 変更なし ✅ |
| syntax-analyzer.js 変更 | 変更なし ✅ |
| SR builder 変更 | 変更なし ✅ |
| referent → antecedent の変換ロジック実装 | 実施せず ✅ |
| 新しい推論ロジック | 実施せず ✅ |
| commit / merge / deploy | 実施せず ✅ |

---

*詳細: P6-B.1_antecedent_case_matrix.md / P6-B.1_test_matrix.md / P6-B.1_final_report.md*
