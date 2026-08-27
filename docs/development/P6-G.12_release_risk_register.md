# P6-G.12 — Release Risk Register

**Date:** 2026-08-26
**Phase:** P6-G.12 — Read-Only Release Audit
**Status:** COMPLETE

---

## A. Risk Classification

| 分類 | 定義 |
|------|------|
| **RELEASE BLOCKER** | このリスクがあると v1 release は不可 |
| **PRE-RELEASE FIX** | release 前に修正すべきだが現在は未修正 |
| **KNOWN LIMITATION** | 設計上の制限または P6-G.11.4 の DEFER 判定。v1 に含めてよい |
| **VG v2** | VG v2 以降で対処すべきもの |

---

## B. RELEASE BLOCKER (0件)

リリースを阻止するリスクは現在確認されていない。

---

## C. PRE-RELEASE FIX (0件)

リリース前に修正すべき問題は現在確認されていない。

---

## D. KNOWN LIMITATIONS

### D.1 DG Renderer Gate — 7 chapters only

| 項目 | 詳細 |
|------|------|
| **リスク** | DG renderer は 7 chapters にのみ適用。残る NT 7806 sentences は tree-view fallback |
| **影響** | 読者が非 gate 章を開くと tree-view を参照する |
| **安全性** | tree-view fallback は正常動作確認済み (G12-JHN3-fallback PASS) |
| **判定** | KNOWN LIMITATION — v1 の設計上のスコープ制限 |
| **v2 plan** | Gate を全 NT に拡張するには DG renderer の chapter-agnostic 化が必要 |

### D.2 SECOND_OBJECT Coverage = 85.2%

| 項目 | 詳細 |
|------|------|
| **リスク** | SR に fn=OBJECT2 が存在する 311 件中 46 件が DR で不可視 |
| **影響** | 46 件は括弧表記 (NOMC: 7件) / 代替表示 (Appos/plain-text) / 単純不表示 |
| **分類** | P6-G.11.4 で全 46 件を分類済み: MUST FIX=0, SHOULD DEFER=20, INTENTIONAL=7, BLOCKED=19 |
| **判定** | KNOWN LIMITATION — 85.2% coverage は v1 freeze に十分 |
| **v2 plan** | Category E (depth) 10件、Category F (structural) 9件は個別 audit で対応 |

### D.3 EPH 2 章 SECOND_OBJECT = 0 (gate chapter)

| 項目 | 詳細 |
|------|------|
| **リスク** | EPH 2 は gate chapter だが SECOND_OBJECT が DR にない (EPH 1:3, EPH 2:14) |
| **影響** | EPH 2 を見る読者には SECOND_OBJECT が表示されない |
| **原因** | 両件とも Category D (APPOSITION 内 phrase.np — L-0 unsafe) |
| **判定** | KNOWN LIMITATION — P6-G.11.4 BLOCKED/UNSAFE 判定維持 |
| **v2 plan** | phrase.np/pp slot の Visual Grammar 表現定義後に対応 |

### D.4 IO Platform 長テキスト at 390px

| 項目 | 詳細 |
|------|------|
| **リスク** | 長い IO テキストが 390px viewport で右方向に overflow |
| **具体例** | COL 1:2 "τοῖς ἐν Κολοσσαῖς ἁγίοις καὶ πιστοῖς ἀδελφοῖς ἐν Χριστῷ" (overhang=45px) |
| **安全弁** | `.dg-view { overflow-x: auto }` — body level での overflow なし |
| **体験** | 読者は DG view 内を水平スクロールできる。破綻はない |
| **判定** | KNOWN LIMITATION — mobile での長 IO は許容範囲 |
| **pre-release fix 案** | `.dg-io-platform-text { white-space: normal }` 等でラップ可能だが regression リスク有 |

### D.5 Non-gate Chapter SECOND_OBJECT (Renderer レベルでの不可視)

| 項目 | 詳細 |
|------|------|
| **リスク** | 非 gate chapters では engine が SECOND_OBJECT を derive しても renderer が tree-view を使用 |
| **影響** | tree-view は fn='SECOND_OBJECT' の badge を表示する (`.sd-fn-badge`) ので機能的な情報損失ではない |
| **判定** | KNOWN LIMITATION — tree-view でも fn 情報は表示される |

### D.6 NOMINALIZED_CLAUSE bracket のみで SECOND_OBJECT 不可視 (7件)

| 項目 | 詳細 |
|------|------|
| **リスク** | JHN 5:11, 5:15; PHP 3:17; HEB 1:7 ×2; HEB 10:29; REV 2:2 の 7 件 |
| **影響** | SECOND_OBJECT はテキストとして bracket 内に存在するが DR slot として表現されない |
| **現状** | bracket notation は機能確認済み。テキスト情報は読者に可視 |
| **判定** | INTENTIONAL FALLBACK — bracket + sub-diagram 共存設計は VG v2 課題 |

### D.7 深い recursion を持つ ContentClause の SECOND_OBJECT 不可視 (10件)

| 項目 | 詳細 |
|------|------|
| **リスク** | depth-3+ の structure で SECOND_OBJECT が innerDR traversal で到達不可 |
| **具体例** | ACT 24:14, LUK 10:21, Isaiah 引用 (MAT 3:3, MRK 1:2, LUK 3:3) 等 |
| **影響** | これらの文で SECOND_OBJECT の DR slot がない |
| **判定** | SHOULD DEFER — depth-3 traversal は個別 task |

---

## E. VG v2 Issues

### E.1 Phrase-type slot sub-diagram (19件 Category D)

| 項目 | 詳細 |
|------|------|
| **要件** | APPOSITION (7), NP_COMPLEX (3), CLAUSE_AS_NP (2) 等の phrase.np 内部の VG 表現定義 |
| **前提条件** | phrase.np/pp の Visual Grammar v2 設計 |
| **判定** | VG v2 |

### E.2 ADVERBIAL phrase 内 clause derivation (9件 Category F)

| 項目 | 詳細 |
|------|------|
| **要件** | PREP_PHRASE → ARTICULAR_NP → CLAUSE_AS_NP 等の経路で SECOND_OBJECT を derive |
| **前提条件** | ADVERBIAL phrase 内 clause の DR derivation path の新規設計 |
| **判定** | VG v2 |

### E.3 Non-gate chapter DG 展開

| 項目 | 詳細 |
|------|------|
| **要件** | Gate を全 NT (8010 sentences) に拡張 |
| **前提条件** | DG renderer の chapter-agnostic 化、全 NT の SR データ品質確認 |
| **判定** | VG v2 / v1 拡張 |

### E.4 Gate MAT-28, PHP-2 — SECOND_OBJECT 低件数

| 項目 | 詳細 |
|------|------|
| **観察** | MAT-28: SO=1, PHP-2: SO=4 (小さいが機能確認済み) |
| **判定** | No action needed |

---

## F. リスクマトリクスサマリー

| カテゴリ | 件数 | 最高 severity |
|---------|------|-------------|
| RELEASE BLOCKER | **0** | — |
| PRE-RELEASE FIX | **0** | — |
| KNOWN LIMITATION | **7** | Low-Medium |
| VG v2 | **4** | Deferred |

---

## G. KNOWN LIMITATIONS の読者体験影響

| Limitation | 実際の読者体験 |
|-----------|-------------|
| 7章 gate | 非 gate 章では tree-view (fn badge あり)。情報損失なし |
| SO 85.2% | 46件のうち 7件は bracket で可視。残りは不表示だが tree-view で確認可 |
| EPH 2 SO=0 | EPH 2 で SECOND_OBJECT が DG 上に不表示。致命的ではない |
| IO 390px | 非常に長い IO text では横スクロールが必要。体験は少し不便 |
| NOMC bracket only | NOMC 内 SECOND_OBJECT は bracket テキストで可視。SSOT は維持 |

---

## H. Go/No-Go チェックリスト

| 基準 | 状態 |
|------|------|
| Release blockers = 0 | ✓ |
| Pre-release fixes = 0 | ✓ |
| Engine exceptions = 0 | ✓ |
| Console errors = 0 | ✓ |
| Body overflow = 0 | ✓ |
| L-0 violations = 0 | ✓ |
| SR mutations = 0 | ✓ |
| Automated tests (G11+G12) = 30/30 PASS | ✓ |
| Known limitations 全件文書化済み | ✓ |
| 46 residuals 全件分類済み (P6-G.11.4) | ✓ |

---

*P6-G.12 Release Risk Register — READ-ONLY.*
