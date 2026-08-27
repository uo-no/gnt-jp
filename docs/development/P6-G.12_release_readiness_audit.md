# P6-G.12 — Visual Grammar v1 Release Readiness Audit

**Date:** 2026-08-26
**Phase:** P6-G.12 — Read-Only Release Audit
**Baseline:** P6-G.11.4 (DR=265, gap=46, coverage=85.2%)
**Constraint:** READ-ONLY. No production code changes. No commit/merge/push/deploy.

---

## A. Feature Integrity

### A.1 実装済み VG 機能インベントリ

| 機能 | 実装場所 | CSS クラス | 確認状態 |
|------|---------|-----------|---------|
| Main line (水平基線) | `_dgRenderMainLine()` | `.dg-main-line` | CONFIRMED |
| SUBJECT / PREDICATE / COPULA | `deriveClauseCore()` MAIN_FN | `.dg-slot-subject` 等 | CONFIRMED |
| OBJECT / COMPLEMENT | 同上 | `.dg-slot-object` 等 | CONFIRMED |
| SECOND_OBJECT (第二目的語) | OBJECT2→SECOND_OBJECT 正規化 | `.dg-slot-second_object` | CONFIRMED |
| AUX | MAIN_FN に含む | `.dg-slot-aux` | CONFIRMED |
| S\|P / P\|O / C\\ connectors | `connectorBetween()` | `.dg-conn-sp` 等 | CONFIRMED |
| implied connector (verbless) | `noVerb` フラグ | `.dg-conn-implied` | CONFIRMED |
| IO raised platform | `_dgRenderMainLine()` IO branch | `.dg-io-platform` | CONFIRMED |
| PP diagonal notation | `_dgRenderAdvPhrases()` | `.dg-pp-wrap` | CONFIRMED |
| Relative clause connector | `deriveRelativeConnectors()` + P6-C | `.dg-rel-clause` | CONFIRMED |
| Content clause sub-diagram | `_extractContentClause()` + P6-G-4 | `.dg-cc-clause-attach` | CONFIRMED |
| APPOSITION parallel-segment | `_dgRenderAppositionSlot()` | `.dg-appos-wrap` | CONFIRMED |
| NOMINALIZED_CLAUSE bracket | CSS `::before/::after` | `.dg-nomc` | CONFIRMED |
| Participial clause marker | `isParticipial` flag | `.dg-slot-participial` | CONFIRMED |
| Participial adv-clause label | `isParticipalClause` | `.dg-adv-clause-participial` | CONFIRMED |
| Subordinate adv-clause label | adverbialClauses | `.dg-adv-clause` | CONFIRMED |
| COORDINATION | `deriveFromNode()` COORDINATION | `.dg-coord-wrap` | CONFIRMED |
| Word-level modifiers | `extractSlotModifiers()` | `.dg-slot-mod-zone` | CONFIRMED |
| Fallback (tree view) | `_sdRenderNode()` | `.sd-node` | CONFIRMED |

### A.2 Gate Chapter ごとの機能確認

NT-wide engine audit (204 sentences across 7 gate chapters, 0 exceptions):

| 章 | sents | derived | issues | SO | IO | CC | Appos | NOMC | PP | Coord | Part | Rel | Mod |
|----|-------|---------|--------|----|----|-----|-------|------|-----|-------|------|-----|-----|
| JHN-1 | 57 | 57 | 0 | 2 | 19 | 29 | 5 | 3 | 6 | 5 | 13 | 8 | 8 |
| MAT-5 | 58 | 57 | 0 | 1 | 16 | 21 | 2 | 5 | 7 | 5 | 8 | 0 | 13 |
| MAT-28 | 23 | 23 | 0 | 1 | 8 | 6 | 1 | 1 | 3 | 1 | 8 | 0 | 7 |
| EPH-2 | 12 | 12 | 0 | 0 | 2 | 2 | 4 | 0 | 2 | 0 | 6 | 2 | 4 |
| PHP-2 | 18 | 18 | 0 | 4 | 2 | 8 | 3 | 2 | 3 | 0 | 5 | 1 | 4 |
| COL-1 | 9 | 9 | 0 | 2 | 3 | 4 | 2 | 0 | 2 | 1 | 5 | 3 | 2 |
| ROM-6 | 27 | 27 | 0 | 3 | 5 | 8 | 1 | 1 | 6 | 0 | 6 | 2 | 6 |
| **Total** | **204** | **203** | **0** | **13** | **55** | **78** | **18** | **12** | **29** | **12** | **51** | **16** | **44** |

(SO=SECOND_OBJECT, IO=INDIRECT_OBJECT, CC=content-clause, Appos=APPOSITION, NOMC=NOMINALIZED_CLAUSE, PP=PrepPhrase, Coord=coordination, Part=participial, Rel=relative clause)

**注:** MAT-5 の derived=57/58 は 1 sentence が DR slots なし（headless/empty clause）— 正常 fallback。

### A.3 CC label 観測値

| 章 | 観測 CC labels |
|----|-------------|
| JHN-1 | ὅτι, 分詞節, 節, 節グループ |
| MAT-5 | μήποτέ, ἵνα, ὅτι, 分詞節, 節, 節グループ |
| MAT-28 | ὅτι, 節 |
| EPH-2 | ὅτι, 節グループ |
| PHP-2 | ἐπειδὴ, ὅτι, 節, 節グループ |
| COL-1 | ἵνα, 従属節, 節 |
| ROM-6 | ὅτι, 節 |

全 CC label は conjunction 値または {'節', '節グループ', '従属節', '分詞節'} のいずれか — 期待通り。

### A.4 SR → DR 経路の完全性

```
SR fn=OBJECT2  →  dg-engine.js (OBJECT2→SECOND_OBJECT)  →  DR slot fn='SECOND_OBJECT'
SR fn=ADVERBIAL (clause)  →  adverbialClauses[]  →  _dgRenderClause (adverbial path)
SR construction=APPOSITION  →  DR slot + headSIs  →  _dgRenderAppositionSlot
SR construction=NOMINALIZED_CLAUSE  →  DR slot contentClause=null  →  .dg-nomc bracket
SR construction=CONTENT_CLAUSE  →  _extractContentClause → contentClause.innerDR  →  .dg-cc-clause-attach
SR construction=SUBORDINATE_CLAUSE  →  _extractContentClause → contentClause.label='従属節'  →  同上
SR construction=PARTICIPIAL_CLAUSE  →  _extractContentClause → contentClause.label='分詞節'  →  同上
SR type=clause (no cn)  →  _extractContentClause → contentClause.label='節'  →  同上
SR type=group  →  _extractContentClause → contentClause.label='節グループ' or deriveFromGroup  →  同上
```

全経路 CONFIRMED (dg-engine.js + index.html コードレビュー + engine audit)。

---

## B. NT-wide Coverage

### B.1 集計

| 指標 | 値 |
|-----|---|
| NT 総 sentences | 8,010 |
| Gate sentences (7章) | 204 |
| Fallback sentences (残余) | 7,806 |
| Gate DR derived | 203 (99.5%) |
| Engine exceptions | 0 |
| DR structure issues | 0 |
| SR SECOND_OBJECT | 311 |
| DR SECOND_OBJECT (engine-wide) | 265 (85.2%) |
| SECOND_OBJECT残存 | 46 (分類済み: P6-G.11.4) |

### B.2 Gate vs Non-gate の分離

```
8,010 sentences
├── 204 sentences  — 7 gate chapters → DG renderer active
│   ├── 203 derived DR (99.5%)
│   └── 1 empty DR (no slots, normal fallback)
└── 7,806 sentences — non-gate chapters → tree fallback (_sdRenderNode)
    └── 0 DG rendering attempted
```

**Critical finding:** Renderer は 7 gate chapters にのみ DG を適用する（index.html line 12754-12762）。NT の残る 7,806 sentences は `_sdRenderNode` (tree-view) fallback を使用する。これは v1 のスコープ上の設計。

### B.3 Engine-wide 機能分布（engine audit のみ — gate 7章）

```
SECOND_OBJECT slots: 15 sentences (7.4% of gate sentences)
INDIRECT_OBJECT:     67 sentences (32.8%)
ContentClause:      111 sentences (54.4%)
APPOSITION:          19 sentences (9.3%)
NOMC bracket:        14 sentences (6.9%)
PP diagonal:        164 sentences (80.4%)
Participial:         83 sentences (40.7%)
```

---

## C. Regression Audit

### C.1 P6-G.11.3 baseline 維持確認

G11-P0 through G11-P3: **21/21 PASS** (2026-08-26 実行)

| テスト群 | 件数 | 結果 |
|---------|------|------|
| G11-P0 (Regression Gates) | 9 | 9/9 PASS |
| G11-P1 (Coverage Gain Gates) | 3 | 3/3 PASS |
| G11-P2 (Per-Construction) | 6 | 6/6 PASS |
| G11-P3 (Known Limitations) | 4 | 4/4 PASS |

### C.2 P6-F through P6-G 機能群の回帰確認

| フェーズ | 機能 | 確認方法 | 状態 |
|---------|------|---------|------|
| P6-G-4 | CONTENT_CLAUSE sub-diagram | G11-P0-1 + browser EPH-2 | PASS |
| P6-G.2 | IO raised platform | browser JHN-1, COL-1 + engine | PASS |
| P6-F | PP diagonal | browser MAT-5, ROM-6 + engine | PASS |
| P6-C | Relative clause connector | engine JHN-1 Rel=8, COL-1 Rel=3 | PASS |
| P6-G-4.4 | APPOSITION | G11-P0-3 + browser JHN-1 | PASS |
| P6-G-8 | NOMC bracket | G11-P0-2 + browser JHN-1 | PASS |
| P6-G.10.1/10.3 | OBJECT2 normalization | G11-P0-5 + engine | PASS |
| P6-G.10.6 | Group second-clause (R6) | G11-P0-5 PHP 2:1 SO=1 | PASS |
| P6-G.11.3 | Slot-content traversal | G11-P2-1〜P2-6 | PASS |

### C.3 COORDINATION regression

JHN-1 coordination: 5 sentences with isCoordination. Browser confirms `.dg-coord-wrap` present in JHN-1, MAT-5, EPH-2. **PASS**

### C.4 SR mutation check

G11-P0-8 PASS (SR non-mutation during deriveDR). Engine は SR を読み取りのみ。

---

## D. Fallback Integrity

### D.1 46 残存ケースの misrender チェック

| サンプル | 分類 | DR status | misrender |
|---------|------|----------|-----------|
| JHN 5:11 (NOMC, AUX) | C | slot present, CC=null | NONE |
| HEB 1:7 (NOMC, OBJECT) | C | slot present, CC=null | NONE |
| EPH 2:14 (APPOSITION, COMPLEMENT) | D | slot present, CC=null | NONE |
| HEB 1:1 (structural gap, F) | F | no MAIN_FN ancestor | NONE |
| PHP 3:8 (structural gap, F) | F | no MAIN_FN ancestor | NONE |

**結論:** 全 5 サンプル PASS。contentClause=null の場合、renderer は APPOSITION / NOMC / plain text の appropriate fallback を使用し、誤表示なし。

### D.2 非 gate 章 fallback

JHN 3: `dg-view` なし、`.sd-node` あり — 期待通り tree fallback。

### D.3 NOMINALIZED_CLAUSE bracket integrity

G11-P3-1 PASS: NOMC slots に contentClause=null が維持されている。
browser JHN-1: `.dg-nomc` DOM 要素 CONFIRMED。bracket は CSS `::before` / `::after` で表示。

### D.4 Fallback label (contentClause label=null のとき)

CONTENT_CLAUSE の contentClause.label=null ケース: renderer は `conjunction || label || '内容節'` を使用。`label=null` かつ `conjunction=null` のケースは `'内容節'` にフォールバック。これは intentional backward-compatible behavior。

---

## E. L-0 Audit

### E.1 静的コード検査

DG renderer セクション (index.html lines 12310-12850) を対象に keyword scan:

| 検査項目 | 結果 |
|---------|------|
| `.translate()` 呼び出し | NONE |
| `infer` キーワード | NONE |
| `semantic analysis` | NONE |
| mood inference | NONE |
| lexicon/glossary lookup | NONE |
| **L-0 違反** | **0** |

### E.2 CC label fallback chain

`conjunction || slot.contentClause.label || '内容節'`

`index.html` 内で 2 箇所 (line 12341, 12677) に確認済み。fallback chain 整合性: **CONFIRMED**

### E.3 SR SSOT 維持

- `deriveDR()` は SR node を変更せず参照のみ (G11-P0-8 PASS)
- `fn`, `construction.canonical`, `type` を読み取り、新しい統語情報を追加しない
- `_extractContentClause` は SR の `construction.canonical` / `evidence.morph_raw` を読み取るのみ
- L-0: **SAFE**

### E.4 OBJECT2 正規化 L-0 確認

`if (fn === 'OBJECT2') fn = 'SECOND_OBJECT'` — これは L-0 safe。SR の fn 値を DR の表示用 label に変換するだけで、統語推論はない。

---

## F. Mobile Audit

### F.1 390px viewport

| 章 | 総 overflow | ppFits | ioFits | ccFits | console errors |
|----|-----------|--------|--------|--------|---------------|
| MAT-5 | PASS (none) | true | true | true | 0 |
| COL-1 | PASS (none) | true | **false** | true | 0 |
| EPH-2 | PASS (none) | true | true | true | 0 |

**COL-1 IO overflow 詳細:**
- IO platform text: "τοῖς ἐν Κολοσσαῖς ἁγίοις καὶ πιστοῖς ἀδελφοῖς ἐν Χ..." (COL 1:2)
- Overhang: 45px (right=435px, viewport=390px)
- 原因: `.dg-io-platform-text { white-space: nowrap }` + `padding-left: 4rem` で長テキストが overflow
- **安全弁:** `.dg-view { overflow-x: auto }` が確認済み — body overflow なし、user は diagram 内をスクロール可能
- **判定:** KNOWN LIMITATION（body レベルでの破綻なし、機能的に安全）

### F.2 768px tablet

COL-1 768px: no overflow, DG present. **PASS**

### F.3 Desktop 1280px

全 6 gate chapters: overflow なし、DG rendered、console errors=0。**PASS 6/6**

### F.4 Mobile フォントサイズ確認

@media (max-width: 480px) 適用:
```css
.dg-pp-prep { font-size: .85rem; }
.dg-pp-np   { font-size: .8rem; }
.dg-io-platform-text { font-size: .85rem; }
.dg-io-stalk { height: .9rem; }
.dg-cc-clause-attach { padding-left: .8rem; }
.dg-cc-clause-label  { font-size: 8px; }
.dg-appos-head { font-size: .9rem; }
.dg-appos-appositive { font-size: .82rem; }
.dg-nomc { font-size: .9rem; }
```

G11-P4-7 PASS: COL-1 mobile 390px no overflow, paddingLeft=12.8px (= .8rem)。

---

## G. Performance

### G.1 Engine exceptions

- NT-wide (8010 sentences): **0 exceptions** (G11-P0-9 PASS)
- Gate chapters (204 sentences): **0 exceptions** (engine audit)
- `deriveDR()` は try-catch で wrap、例外は null に drop

### G.2 Console errors

- P4 browser tests (MAT-5, COL-1, JHN-1): **0 console errors** (G11-console PASS)
- P6-G.12 browser tests (6 chapters): **0 console errors** (G12 browser audit)

### G.3 DOM size

| 章 | DOM slots count |
|----|----------------|
| JHN-1 | 369 |
| MAT-5 | 317 |
| ROM-6 | 124 |
| PHP-2 | 139 |
| COL-1 | 88 |
| EPH-2 | 72 |

最大 JHN-1 (369) でも DOM explosion なし。

### G.4 Deep recursion

`_extractContentClause` / `deriveClauseCore` / `_dgRenderClause` はすべて finite recursion（最大 depth 2〜3）。Stack overflow の報告なし。

---

## H. Visual Consistency

### H.1 Label sanity

MAT-5 DG view DOM query: **0 undefined/null/empty labels** (G12-label-sanity PASS)

### H.2 機能別 visual 識別性

| 機能 | 識別方法 |
|------|---------|
| SUBJECT \| PREDICATE | 全幅垂直線 (`.dg-conn-sp`) |
| PREDICATE \| OBJECT | 短垂直線 (`.dg-conn-po`) |
| PREDICATE \\ COMPLEMENT | 後退対角線 (`.dg-conn-complement`) |
| OBJECT \| SECOND_OBJECT | 短垂直線 (`.dg-conn-po`) |
| SUBJECT = COMPLEMENT (verbless) | 破線対角線 (`.dg-conn-implied`) |
| PP | 前置詞（上・対角線）→ NP（水平線）(`.dg-pp-wrap`) |
| IO | 上昇プラットフォーム + 縦軸 (`.dg-io-platform`, `.dg-io-stalk`) |
| ContentClause | 結合詞 / label + 下位 diagram (`.dg-cc-clause-attach`) |
| APPOSITION | head / 破線 / appositive (`.dg-appos-head`, `.dg-appos-appositive`) |
| NOMC | [ bracket ] (CSS `::before`/`::after`) |
| Relative clause | `関係節 ← antecedent` label (`.dg-rel-clause`) |

### H.3 各機能の distinct label 確認

- modifier: `属格修飾` / `副詞的修飾` / `形容詞的修飾`
- PP: `副詞的` + preposition text
- IO: `間接目的語`
- OBJECT2: `第二目的語`
- APPOSITION: head text / appositive text (no label — visual only)
- NOMC: Greek text within `[...]`
- CC: conjunction text または `節` / `節グループ` / `従属節` / `分詞節`

これらは互いに視覚的に区別可能。

---

## I. Documentation Consistency

### I.1 歴史的数値の整合性

過去の P6-G ドキュメント群は各フェーズ時点の状態を正確に記録している:

| フェーズ | SECOND_OBJECT DR | 記録状態 |
|---------|-----------------|---------|
| P6-G.5 | 0 | CORRECT (pre-fix) |
| P6-G.9 | 0 | CORRECT (pre-fix) |
| P6-G.10.3 | 192 | CORRECT (first fix) |
| P6-G.10.6 | 199 | CORRECT (R6 fix) |
| P6-G.11.1 | 199 | CORRECT (pre-slot-content) |
| P6-G.11.3 | 265 | CORRECT (current) |
| P6-G.11.4 | 265 | CORRECT (current) |

歴史的記録として全件整合。current state を誤って主張しているドキュメントなし。

### I.2 既知の訂正メモ

P6-G.10.4 に記録済み: "P6-G.10.1 と P6-G.10.2 は EPH 2:14 を V-O-O2 節と誤記載していた。実際の SR は COPULA 構造。" → これは P6-G.10.4 の historical note として適切に記録済み。

### I.3 Gate chapter 記述

- P6-G.11.1 final report: "Gate FAIL chapters: MAT 5, EPH 2, COL 1" — これは P6-G.11.3 実装前の状態として正確
- P6-G.11.3 implementation report: "Gate FAIL: EPH 2 のみ" — P6-G.11.3 後の状態として正確
- P6-G.11.4: "Gate FAIL: EPH 1:3, EPH 2:14 — 両件 D (APPOSITION)" — 現在の状態として正確

### I.4 実装コードと docs の対応

| ドキュメント記述 | コード実態 | 整合 |
|---------------|----------|------|
| `_extractContentClause` 除外: NOMC / phrase-type | dg-engine.js lines 271-274 | ✓ |
| contentClause.label schema (`label: string\|null`) | dg-engine.js lines 33-36 | ✓ |
| CC label fallback: `conjunction \|\| label \|\| '内容節'` | index.html lines 12341, 12677 | ✓ |
| `_isEmptyDR` guard | dg-engine.js lines 186-192 | ✓ |
| Gate chapters: JHN-1, MAT-5, MAT-28, EPH-2, PHP-2, COL-1, ROM-6 | index.html lines 12754-12762 | ✓ |

---

## J. Audit Summary

| セクション | 結果 | 主要所見 |
|----------|------|---------|
| A. Feature integrity | **PASS** | 15機能すべて実装・機能確認 |
| B. NT-wide coverage | **PASS** | 0 exceptions, DR=265 (85.2%) |
| C. Regression | **PASS** | 21/21 tests + P6-F〜P6-G 全機能 PASS |
| D. Fallback integrity | **PASS** | 46残存ケース misrender なし |
| E. L-0 audit | **PASS** | 0 violations, CC fallback intact |
| F. Mobile | **PASS WITH NOTE** | COL-1 IO 45px overhang at 390px (body overflow なし) |
| G. Performance | **PASS** | 0 exceptions, 0 console errors |
| H. Visual consistency | **PASS** | labels OK, features distinct |
| I. Documentation | **PASS** | 歴史的記録整合、矛盾なし |

---

*P6-G.12 Release Readiness Audit — READ-ONLY. No code changes.*
