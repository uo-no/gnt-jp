# Stage 4 Phase 4d — 最終監査補足書

生成日: 2026-10-31  
監査対象: Phase 4d 成果物（sampling-dry-run-v2.json / tier1-morph-zone-addendum.md）  
スクリプトバージョン: v2.0.1（morphInputHash 追加）

---

## 監査の目的

Group A 本監査開始前に、以下 2 点を確認・補正する。

1. morph × zone セルのサンプリング保証表現の正確性
2. v1/v2 で inputHash が同一である原因と、morph データのハッシュ管理の整合性

---

## 監査項目 1: morph × zone セルの保証表現

### 発見された問題

`stage4-phase4d-tier1-morph-zone-addendum.md` §3.1 に以下の記述があった。

> n≥2 のセルは確率的サンプリングで 1 件以上が保証される

これは **誤記** であることが実データ分析で確認された。

### 実測データ（v2 ドライラン全 20 Tier 1 Strongs）

| 指標 | 値 |
|------|-----|
| 大セル総数（n≥2 のセル） | 434 |
| うち採用ゼロのセル | **244（56.2%）** |
| うち採用あり（1 件以上）のセル | 190（43.8%） |
| zone 最低保証（≥2/zone）違反 | **0（全 20 Strongs で充足）** |

**代表例（残り予算が小さい Strongs）：**

| Strong | 小セルコミット | 残り予算 | 大セル数 | 採用ゼロ大セル |
|--------|-------------|---------|---------|-------------|
| G1096 | 13 tokens | 7 | 37 | 30（81%）|
| G1325 | 13 tokens | 7 | 37 | 30（81%）|
| G4160 | 6 tokens | 14 | 50 | 36（72%）|
| G611 | 1 token | 19 | 10 | 0（0%）|
| G1520 | 0 tokens | 20 | 5 | 0（0%）|

残り予算 < 大セル数の場合、採用ゼロのセルが必然的に生じる。

### 正しい保証の記述

| 保証される条件 | 保証区分 | 証拠 |
|-------------|---------|------|
| n=1 セルの全件採用（small cell full scan） | **CONFIRMED** | 全 20 Strongs で充足 |
| 各 zone から最低 2 tokens（minPerZone=2） | **CONFIRMED** | 全 20 Strongs で充足、違反ゼロ |
| n≥2 セルから最低 1 token | **保証しない** | 434 大セル中 244 が採用ゼロ（実測） |
| 各 zone 内の morph 多様性最大化 | ベストエフォート | round-robin で zone 予算内の上位 morph G を優先採用 |

### round-robin が提供するもの

round-robin は「per-cell 最低保証」ではなく「zone 内 morph 多様性の最大化」である。

zone 内配分を `k`、zone 内 morph グループ数を `g` とすると：

- k ≥ g の場合: 全 morph グループから最低 1 件ずつ採用される（実質保証）
- k < g の場合: 上位 k 種（母集団が多い順）の morph グループのみ採用される

### 修正した文書

`stage4-phase4d-tier1-morph-zone-addendum.md` §3.1 論拠・§3.2 アルゴリズム概要を修正済み。  
誤記「n≥2 のセルは確率的サンプリングで 1 件以上が保証される」→「zone 比例配分の予算内でのみ採用（budget < 大セル数の場合は採用ゼロのセルが生じる）」に変更。

### 計画仕様との対照

`stage4-tier7-sampling-plan.md` §1.3 Tier 1 仕様：

```
層別次元: 書巻区分（4区）× 形態（tense × mood）
サンプル数/Strong: 15〜20 tokens
最小保証: 各書巻区分から最低 2 tokens
```

**実装は計画仕様を満たしている。** 計画仕様は「各書巻区分から最低 2 tokens」を要求するが、「各 morph×zone セルから最低 1 token」を要求していない。今回の修正は過剰な保証表現を削除するもので、実装変更は不要。

---

## 監査項目 2: inputHash と morphInputHash

### 発見された問題

v1（zone 層別のみ）と v2（morph × zone）の `inputHash` が同一であった。

```
v1 inputHash: sha256:3ce926e505660d3c
v2 inputHash: sha256:3ce926e505660d3c  ← 同一
```

### 原因

`inputHash` は「Group A の全 ref（sorted）」をハッシュしており、morph データを含まない。  
v1/v2 でサンプリング対象の token ref（Group A）が変わっていないため、同一になるのは**設計どおり**。

| ハッシュ | 対象 | v1 | v2 | 用途 |
|---------|------|----|----|------|
| `inputHash` | Group A 全 ref（sorted） | sha256:3ce926e505660d3c | sha256:3ce926e505660d3c | サンプリング対象 token の同一性確認 |
| `morphInputHash` | Tier 1 全 ref の `ref:morphGroup` pairs（sorted） | N/A | sha256:8f281060808335cb | morph 分類入力の同一性確認 |

### 実装した対応

スクリプト（v2.0.1）に `buildMorphInputHash` 関数を追加。

```javascript
function buildMorphInputHash(morphLookup, tier1Refs) {
  const pairs = [...tier1Refs].sort().map(ref => {
    const tok = morphLookup[ref] || null;
    return ref + ':' + classifyMorphGroup(tok);
  });
  return 'sha256:' + crypto.createHash('sha256')
    .update(pairs.join('\n'))
    .digest('hex')
    .slice(0, 16);
}
```

- ハッシュ対象: 8,724 件の `ref:morphGroup` pair（sorted by ref）
- 変化条件: bible_data の morph フィールド変更 OR `classifyMorphGroup` ルール変更
- 既存 `inputHash` は変更しない（意味を保持）

`meta.morphInputHash` として v3 ドライランに追加。

```json
{
  "meta": {
    "inputHash": "sha256:3ce926e505660d3c",
    "morphInputHash": "sha256:8f281060808335cb",
    ...
  }
}
```

---

## テスト結果

**TC-M10 追加後: 21/21 PASS**

| テスト | 内容 | 結果 |
|-------|------|------|
| TC-M10 | morphInputHash: v2 モードで存在、v1 で null、再現性、inputHash と差異 | **PASS** |
| TC-01〜TC-M9 | 既存 20 件 | **全 PASS（変更なし）** |

---

## ファイル差分（v2 → v3）

| 項目 | v2 | v3 | 変更 |
|------|----|----|------|
| `meta.morphInputHash` | absent | sha256:8f281060808335cb | 追加 |
| `meta.inputHash` | sha256:3ce926e505660d3c | sha256:3ce926e505660d3c | 変更なし |
| `meta.phase` | 4d-dry-run-v2 | 4d-dry-run-v2 | 変更なし |
| Tier 1 全 sampledRefs | — | — | 完全一致（再現性確認済み） |
| 総サンプル数 | 16,548 | 16,548 | 変更なし |
| JUD サンプル数 | 87 | 87 | 変更なし |
| integrityOk | true | true | 変更なし |

---

## 保証される条件・保証されない条件（確定版）

### 保証される条件（CONFIRMED）

| 条件 | 根拠 |
|------|------|
| n=1 の (zone, morphGroup) セル全件採用 | 全 20 Tier 1 Strongs で充足、TC-M4 PASS |
| 各 zone から最低 2 tokens（minPerZone=2） | 全 20 Strongs で違反ゼロ、TC-04 PASS |
| Tier 6/7 全件採用 | 全 591+2,910 Strongs で充足、TC-08 PASS |
| 同一入力→同一サンプル（再現性） | TC-01/TC-M5/TC-M10 PASS |
| ref 重複なし（per-Strong および cross-Strong） | TC-06/TC-M8/TC-Global PASS |
| 入力データ同一性（inputHash） | sha256:3ce926e505660d3c、両 run 一致 |
| morph 分類入力同一性（morphInputHash） | sha256:8f281060808335cb、再現性 TC-M10 確認 |

### 保証されない条件（明示的に非保証）

| 条件 | 理由 |
|------|------|
| n≥2 の大セルから最低 1 token | 予算制約（例: 残り 7 件に対し大セル 37 個）により不可能 |
| morph グループ全種のサンプル代表 | ベストエフォート; zone 内 k<g の場合、下位グループは採用ゼロ |
| JUD tokens の Tier 1/2 サンプル参入 | Zone IV 比率が小さい場合に確率的 → Tier 1/2 で JUD が採用ゼロになりうる |

### JUD の扱い

- Tier 6/7: 全件確認（33+21=54 tokens、CONFIRMED）
- Tier 3: zone 最低保証により 6 tokens がサンプルに含まれる
- Tier 1/2: 確率的（v2/v3 では合計 2 tokens が採用）
- Tier 4/5: 13+12=25 tokens がサンプルに含まれる

Tier 1/2 の JUD tokens（32 件）がサンプル未選択の場合、INFERRED_FROM_STRONG_LEVEL として扱う。  
これは現行のサンプリング計画の範囲内であり、仕様変更は不要。

---

## 成果物一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `scripts/stage4-groupA-sampler.cjs` | CORRECTNESS（v2.0.1） | `buildMorphInputHash` 追加、`morphInputHash` を meta に追加 |
| `scripts/stage4-sampler-test.cjs` | COVERAGE | TC-M10 追加（21 件） |
| `stage4-phase4d-sampling-dry-run-v3.json` | 新規 | v2 保護のうえ morphInputHash 追加版 |
| `stage4-phase4d-tier1-morph-zone-addendum.md` | CORRECTNESS | §3.1 論拠・§3.2 保証表現を修正、保証対照表を追加 |
| `stage4-phase4d-final-audit-addendum.md` | DOCUMENTATION | 本ファイル |

**変更しなかったファイル：**
- `stage4-phase4d-sampling-dry-run.json`（v1、保護済み）
- `stage4-phase4d-sampling-dry-run-v2.json`（v2、保護済み）
- `stage4-phase4d-final-report.md`（Phase 4d 完了報告書、内容変更なし）
- `stage4-phase4d-infrastructure-report.md`（インフラ報告書、内容変更なし）
- Phase 4a〜4c 成果物（変更なし）

---

## Group A 本監査開始可否

| 条件 | 状態 |
|------|------|
| Tier 1 morph × zone 層別実装 | ✅ 完了 |
| 保証表現の正確性 | ✅ 修正済み（誤記削除）|
| morph データハッシュ管理 | ✅ morphInputHash 追加 |
| 全テスト PASS（21/21） | ✅ 確認 |
| ドライラン完了（v3） | ✅ 完了 |
| Bible JSON 変更なし | ✅ 確認 |
| Phase 4a〜4c 成果物保護 | ✅ 確認 |
| commit / push 未実行 | ✅ 確認 |

### **Group A 本監査の開始条件: すべて充足**

ただし、監査担当者は以下を認識したうえで監査を開始すること。

1. **Tier 1 Strongs（20 件）のサンプル**: morph×zone 2D 層別、target=20、small cell（n=1）全件確認、各 zone 最低 2 件保証。n≥2 の大セルは zone 予算内でのベストエフォート採用。
2. **JUD Tier 1/2**: サンプル確率的（2 tokens のみ採用）。全件検証が必要な場合は拡大条件（expansionCondition）を適用すること。
3. **INFERRED_FROM_STRONG_LEVEL**: 未採用トークンへの誤りなし保証はない（Phase 4c §6 記載どおり）。

---

*Phase 4d 最終監査完了*
