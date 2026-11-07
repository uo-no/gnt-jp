# Stage 4 Phase 4k — Morph Fix テスト結果

**Phase**: 4k follow-up  
**実施日**: 2026-11-01  
**対象修正**: `reading-engine.js` `_VERB_RULES` 去る 五段漢字語幹例外 4ルール追加

---

## サマリー

| テスト | 修正前 | 修正後 | 判定 |
|--------|--------|--------|------|
| test:re-phase1 | FAIL (got=44094相当) | **ALL PASS** (111 checks) | ✓ |
| test:re-stageB | FAIL | **ALL PASS** (27 checks) | ✓ |
| test:re-phase2 | ALL PASS | ALL PASS | ✓ |
| test:re-phase3 | ALL PASS | ALL PASS | ✓ |
| test:re-phase5 | ALL PASS | ALL PASS | ✓ |
| test:re-stageA | ALL PASS | ALL PASS | ✓ |

---

## 詳細結果

### test:re-phase1 (Morphology Core FROZEN)

```
── Part 1: 単体回帰 ──
Part 1: 106 passed, 0 failed

── Part 2: NT 全巻基準値照合（audit 実行中…） ──

ALL PASS (111 checks) — Phase 1 基準を維持
```

**baseline 更新**: morph 44187 → 44280（+93、悪化 0）

---

### test:re-stageB (Flow Chip FROZEN)

```
── Part 1: 単体回帰 ──
Part 1: 20 passed, 0 failed

── Part 2: NT 全巻基準値照合（差分監査 実行中…） ──

ALL PASS (27 checks) — Stage B 基準を維持
```

**baseline 更新**: changed 39684→39692 / identical 98057→98049 / brokenOld 1257→1265（各±8）

---

### test:re-phase2 (Syntax Layer FROZEN)

```
Part 1: 31 passed, 0 failed
ALL PASS (47 checks) — Phase 2-A/2-B 基準を維持
```

---

### test:re-phase3 (Particle Engine FROZEN)

```
Part 1: 20 passed, 0 failed
ALL PASS (27 checks) — Phase 3-A 基準を維持
```

---

### test:re-phase5 (Semantic Layer FROZEN)

```
Part 1: 38 passed, 0 failed
ALL PASS (55 checks) — Phase 5-A 基準を維持
```

---

### test:re-stageA (Stage A FROZEN)

```
Part 1: 14 passed, 0 failed
ALL PASS (19 checks) — Stage A 基準を維持
```

---

### test:genitive（参考）

```
最終結果: FAIL  (PASS=1923 FAIL=54 WARN=50)
```

**判定**: DEFERRED — Batch 62 / 68 の失敗は属格分類テキスト内容（説明文の記述）に関するもので、`_VERB_RULES` 変更・`bible_data` 変更とは無関係。本 Phase 4k morph fix のスコープ外の既存問題。

---

## 変更された baseline 値

### re-phase1-regression.cjs

```
// 修正前
morph: 44187,

// 修正後
morph: 44280,
// コメント追記: Phase 4k G863 + morph fix: 44187→44280（+93）、悪化 0
```

### re-stageB-regression.cjs

```
// 修正前
changed:   39684,
identical: 98057,
brokenOld:  1257,

// 修正後
changed:   39692,   // +8
identical: 98049,   // -8
brokenOld:  1265,   // +8
// コメント追記: Phase 4k morph fix: 去る V-2AAP 8件 去った 解決
```

### reading-engine.js ヘッダ

```
// 修正前
基準値: NT 137,741 tokens / morph 44,591 / 悪化ケース 0

// 修正後
基準値: NT 137,741 tokens / morph 44,280 / 悪化ケース 0
（44,591 → 44,187: M-15反映・複数代名詞Data固定点 / 44,187 → 44,280: Phase 4k G863 + 去る fix）
```

---

## Freeze Audit 更新

`docs/development/morph-rule-engine-v1-frozen.md` 改訂履歴に追記:

> 2026-11-01: _VERB_RULES 五段漢字語幹例外追加（去る: さ行五段）。変更分類: BUG/CORRECTNESS。FROZEN §29 手順に従い実施。影響: V-2AAP 8件 undefined→去った・悪化 0・morph 44187→44280（+93）。re-phase1 ALL PASS / re-stageB ALL PASS。Freeze Audit 更新済み。
