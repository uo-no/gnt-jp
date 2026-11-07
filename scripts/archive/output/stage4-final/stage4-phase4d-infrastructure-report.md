# Stage 4 Phase 4d — 監査基盤整備レポート

生成日: 2026-10-31  
Phase: 4d（Group A/F/G/H 監査前の基盤整備）  

---

## 1. Phase 4d 実施内容

| タスク | 内容 | 状態 |
|-------|------|------|
| 4d-1 | stage4-phase4c-count-clarification.md に §6 追記 | ✅ |
| 4d-2 | stage4-tier7-sampling-plan.md §12 の JDE → JUD 修正 | ✅ |
| 4d-3 | 監査スクリプト内 JDE 残存チェック | ✅ |
| 4d-4 | Tier 1-5 サンプリングスクリプト実装 | ✅ |
| 4d-5 | 9 テストケース実行 | ✅ 11/11 PASS |
| 4d-6 | Group A ドライラン実行 | ✅ |

---

## 2. 4d-1: count-clarification 追記内容

`stage4-phase4c-count-clarification.md` に §6「FUNCTION_CONFIRMED の区別」を追記。

追記内容の要点:

| 区分 | tokens | 説明 |
|------|-------:|------|
| 個別確認（全件確認） | 62 | 該当用法の mother population 全体が small enough のため全件確認 |
| 個別確認（用法別サンプル） | 162 | zone-stratified で無作為選択して個別照合 |
| **個別確認合計** | **224** | bible_data + JA1955 を個別照合して確認 |
| 未確認（推定） | 2,270 | Strong 単位確認 + サンプル結果に基づく推定 |

- `CONFIRMED_ERROR = 0` は **個別確認 224 件についての結果** であることを明記
- `REVISION_CANDIDATE = 0` も同様に 224 件のみに適用
- **未確認 2,270 件に誤りがないことは保証しない** ことを明記

---

## 3. 4d-2/3: JDE → JUD 修正と残存チェック

### 修正箇所

| ファイル | 修正前 | 修正後 | 根拠 |
|---------|-------|-------|------|
| `stage4-tier7-sampling-plan.md` line 83 | `ROM〜JDE` | `ROM〜JUD` | bible_data ディレクトリ名・books.json key は JUD |
| `stage4-tier7-sampling-plan.md` line 393 | `'JDE'` | `'JUD'` | 同上 |

### 残存 JDE チェック結果

```
grep -rn 'JDE' scripts/ --include='*.js' --include='*.cjs' --include='*.ts' → 0件
```

本番スクリプト（`scripts/*.cjs` / `scripts/*.js`）に JDE の残存なし。  
過去の scratchpad スクリプト（`/private/tmp/` 以下）は本番ではないため修正対象外。

---

## 4. 4d-4: サンプリングスクリプト設計

### スクリプト: `scripts/stage4-groupA-sampler.cjs`

#### 実装された 10 の要件

| # | 要件 | 実装方法 |
|---|------|---------|
| R1 | 再現可能シード | `parseInt(strong.replace('G',''), 10) % 10000`、XorShift32 PRNG |
| R2 | 書巻区分層別 | 4-zone（Tier 1-3）/ 2-zone（Tier 4-5） |
| R3 | 全 ref 保存 | `sampledRefs: string[]` に全サンプル ref を保存 |
| R4 | 母集団/サンプル/未確認カウント | `population.total`, `sampledCount`, `unsampledCount` |
| R5 | 低頻度 Strong 全件確認 | Tier 6（n=5-9）/ Tier 7（n=1-4）→ `method: 'full_scan'` |
| R6 | 複数ゾーン最低保証 | `minPerZone=2`、比例配分後に slack 順で余りを分配 |
| R7 | 重複検出 | `_integrityCheck.hasDuplicate`、global `globalDuplicateRefs` |
| R8 | 入力ハッシュ | `sha256:` + Group A 全 ref の SHA-256（前 16 桁） |
| R9 | 実測/推定/未確認区別 | `sampledConfirmationStatus` / `unsampledConfirmationStatus` |
| R10 | 拡大条件記録 | `expansionCondition.trigger` / `action` / `fullScanTrigger` |

#### Tier 別設定

| Tier | n 範囲 | target | zone 方式 | minPerZone | 特記事項 |
|------|-------|--------|----------|-----------|---------|
| 1 | ≥200 | 20 | 4-zone | 2 | 拡大: zone 内 NOTE/AMBIGUOUS > 3 → 該当 zone 全件 |
| 2 | 100-199 | 12 | 4-zone | 2 | 拡大: NOTE/AMBIGUOUS ≥ 2 → 2× |
| 3 | 50-99 | 10 | 4-zone | 2 | n≤60 → 全件確認（plan 推奨に従う）|
| 4 | 20-49 | 10 | 2-zone | 2 | 拡大: NOTE/AMBIGUOUS ≥ 2 → 全件 |
| 5 | 10-19 | 7 | 2-zone | 2 | 拡大: NOTE/AMBIGUOUS ≥ 1 → 全件 |
| 6 | 5-9 | — | 全件確認 | — | |
| 7 | 1-4 | — | 全件確認 | — | |

#### XorShift32 PRNG

```javascript
// s ^= s<<13; s ^= s>>17; s ^= s<<5
function createXorShift32(seed) {
  let s = (seed === 0 ? 1 : seed) >>> 0;
  return function next() {
    s ^= (s << 13) >>> 0;
    s ^= s >>> 17;
    s ^= (s << 5) >>> 0;
    return s >>> 0;
  };
}
```

#### 設計上の注記: morph 層別（Deferred）

サンプリング計画 §1.3 Tier 1 には「書巻区分（4区）× 形態（tense × mood）」という 2 次元層別が記載されているが、`group-assignment.json` は morph フィールドを持たない。

morph データは各トークンの `bible_data` に存在するが、Group A 全 39,310 tokens を対象に bible_data を読み込むことは本 dry-run の scope 外とした。

| 状態 | 内容 |
|------|------|
| 実装済み | 書巻区分層別（primary dimension）: Tier 1-5 |
| Deferred | morph 層別（secondary dimension）: 実監査フェーズで bible_data 読み込み時に実施 |

この決定は「サンプリング計画に書かれていない条件を追加しない」原則の範囲内。Tier 1 では zone 最低保証（min 2/zone）により major usage types の漏れを一定程度防ぐ。

---

## 5. 4d-5: テスト結果

`scripts/stage4-sampler-test.cjs` — **11 / 11 PASS**

詳細は `stage4-phase4d-test-report.md` を参照。

---

## 6. 4d-6: Group A ドライラン結果

### 入力

| 項目 | 値 |
|------|-----|
| 入力ファイル | `stage4-group-assignment.json` |
| 入力ハッシュ | `sha256:3ce926e505660d3c` |
| Group A tokens | 39,310 |
| Distinct Strongs | 4,195 |

### Tier 別結果

| Tier | Strongs | 母集団 | サンプル | 未確認 | 全件確認 Strongs | JUD_pop | JUD_samp |
|------|---------|--------|--------|-------|-----------------|---------|---------|
| 1 | 20 | 8,724 | 400 | 8,324 | 0 | 15 | 0 |
| 2 | 36 | 4,966 | 451 | 4,515 | 0 | 17 | 0 |
| 3 | 79 | 5,548 | 2,161 | 3,387 | 30 | 17 | 6 |
| 4 | 212 | 6,534 | 2,133 | 4,401 | 0 | 26 | 13 |
| 5 | 347 | 4,585 | 2,450 | 2,135 | 0 | 24 | 12 |
| 6 | 591 | 3,895 | 3,895 | 0 | 591 | 21 | 21 |
| 7 | 2,910 | 5,058 | 5,058 | 0 | 2,910 | 33 | 33 |
| **合計** | **4,195** | **39,310** | **16,548** | **22,762** | **3,531** | **153** | **85** |

### 全体サマリ

| 項目 | 値 |
|------|-----|
| サンプル率 | 42.1% |
| 全件確認 Strongs | 3,531 / 4,195（84.2%） |
| 層別サンプル Strongs | 664 / 4,195（15.8%） |
| JUD tokens（母集団） | 153 |
| JUD tokens（サンプル予定） | 85（55.6%） |
| ref 重複 | 0 |
| integrityOk | true |

### 再現性確認

同一入力で 2 回 `buildGroupASamplingPlan` を実行:
- Tier 1 全 20 Strongs のサンプル: **完全一致**
- inputHash: `sha256:3ce926e505660d3c`（両回一致）

### JUD トークンの確認

JUD tokens 153 件（Group A）は全て Zone IV (4-zone) / Zone AE (2-zone) に正しく分類される。  
Tier 6/7 の JUD tokens: 全件確認対象（合計 33 + 21 = 54 件サンプル済み）。  
Tier 1/2 の JUD tokens: Zone IV が小さいため今回の dry-run ではサンプル未選択（0/32件）。これは確率的な結果であり、実際の監査では morph 層別の追加で改善可能。

---

## 7. 成果物一覧

| ファイル | 種別 | 内容 |
|---------|------|------|
| `scripts/stage4-groupA-sampler.cjs` | スクリプト | サンプリングエンジン本体 |
| `scripts/stage4-sampler-test.cjs` | スクリプト | 9 テストケース（11 件実装） |
| `stage4-phase4d-sampling-dry-run.json` | データ | Group A 全 4,195 Strongs のサンプリング計画 |
| `stage4-phase4d-test-report.md` | 報告書 | テスト結果詳細 |
| `stage4-phase4d-infrastructure-report.md` | 報告書 | 本ファイル |
| `stage4-phase4c-count-clarification.md` | 補足 | §6 追記（FUNCTION_CONFIRMED 区別） |
| `stage4-tier7-sampling-plan.md` | 設計文書 | §12 JDE → JUD 修正（2 箇所） |

---

## 8. 制約遵守確認

| 制約 | 状態 |
|------|------|
| bible_data JSON 変更禁止 | **変更なし** |
| `token.japanese` 変更禁止 | **変更なし** |
| 承認済みデータ変更禁止 | **変更なし** |
| Phase 4a〜4c 監査 JSON 上書き禁止 | **上書きなし** |
| Group A・F・G・H 本監査開始禁止 | **本監査未開始**（dry-run のみ） |
| Stage 5 開始禁止 | **未開始** |
| commit / push 禁止 | **未実行** |

---

## 9. Group A 本監査前の残タスク

Phase 4d 完了後、Group A 本監査開始前に確認すべき事項:

1. **morph 層別の追加設計**（DEFERRED 項目）  
   Tier 1 Strongs（20件）の監査前に、bible_data から morph を読み込む  
   拡張サンプリングモードを実装することを推奨。

2. **JUD Tier 1/2 サンプリング率の改善**  
   現在 JUD は Tier 1/2 でサンプル未選択。morph 層別が実装されれば改善可能。  
   最悪の場合、JUD 特有の問題を発見できない可能性がある。  
   → 軽減策: JUD tokens を含む Strongs について JUD tokens を追加サンプルに含める  
     "JUD token at least 1" オプションを設計に追加する。

3. **拡大条件の機械的トリガー**（R10）  
   現在の `expansionCondition` はドキュメント形式。  
   実監査スクリプトで `NOTE/AMBIGUOUS` カウントを自動判定し拡大を自動実行する  
   ロジックを追加することを推奨。

---

*Phase 4d 完了 — Phase 4a〜4c の制約を遵守*
