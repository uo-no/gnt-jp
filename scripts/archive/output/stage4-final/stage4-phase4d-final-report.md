# Stage 4 Phase 4d — 最終報告書

生成日: 2026-10-31  
スクリプトバージョン: v2.0.0  
スクリプト: `scripts/stage4-groupA-sampler.cjs`

---

## 1. Phase 4d 完了状態

| タスク | 内容 | 状態 |
|-------|------|------|
| 4d-1 | count-clarification §6 追記 | ✅ |
| 4d-2 | sampling-plan §12 JDE → JUD 修正 | ✅ |
| 4d-3 | スクリプト内 JDE 残存チェック | ✅ 残存ゼロ |
| 4d-4 | Tier 1-5 サンプリングスクリプト（v1） | ✅ |
| 4d-5 | テスト 11/11 PASS（v1） | ✅ |
| 4d-6 | ドライラン v1（zone のみ） | ✅ |
| 4d-7 | Tier 1 morph × zone 層別（v2） | ✅ |
| 4d-8 | テスト 20/20 PASS（v2） | ✅ |
| 4d-9 | ドライラン v2（morph × zone） | ✅ |

---

## 2. Tier 1 morph 取得率

| 指標 | 値 |
|------|-----|
| Tier 1 対象 token 数 | 8,724 |
| bible_data から取得成功 | 8,724 |
| 取得失敗（欠落） | **0件** |
| 取得率 | **100.0%** |
| ロードした NT 章 | 260（NT 全章） |

---

## 3. morph × zone 全層の母集団数・サンプル数

### Tier 1 全 Strong のサマリ

| Strong | n | 母集団 cells | 母集団 morph G | small cells (n=1) | small tok | サンプル | morph G in sample |
|--------|---|------------|----------------|-----------------|----------|---------|-----------------|
| G191 | 361 | 40 | 14 | 6 | 6 | 20 | 12 |
| G611 | 231 | 11 | 7 | 1 | 1 | 20 | 7 |
| G1096 | 580 | 54 | 19 | 13 | 13 | 20 | 12 |
| G1325 | 380 | 44 | 19 | 13 | 13 | 20 | 12 |
| G1492 | 284 | 18 | 5 | 5 | 5 | 20 | 5 |
| G1520 | 207 | 5 | 2 | 0 | 0 | 20 | 2 |
| G1831 | 211 | 32 | 12 | 8 | 8 | 20 | 11 |
| G2036 | 866 | 18 | 6 | 2 | 2 | 20 | 6 |
| G2064 | 505 | 46 | 13 | 7 | 7 | 20 | 11 |
| G2192 | 679 | 34 | 12 | 4 | 4 | 20 | 9 |
| G2309 | 201 | 27 | 9 | 8 | 8 | 20 | 8 |
| G2980 | 234 | 39 | 14 | 7 | 7 | 20 | 10 |
| G2983 | 225 | 38 | 15 | 13 | 13 | 20 | 14 |
| G3004 | 1164 | 27 | 10 | 7 | 7 | 20 | 10 |
| G3056 | 330 | 4 | 1 | 0 | 0 | 20 | 1 |
| G3708 | 424 | 42 | 15 | 9 | 9 | 20 | 12 |
| G3762 | 234 | 4 | 1 | 0 | 0 | 20 | 1 |
| G3956 | 884 | 4 | 1 | 0 | 0 | 20 | 1 |
| G4160 | 520 | 55 | 19 | 6 | 6 | 20 | 12 |
| G4183 | 204 | 5 | 2 | 1 | 1 | 20 | 2 |
| **合計** | **8,724** | **547** | — | **123** | **123** | **400** | — |

---

## 4. 未対応・欠落 ref

| 種別 | 件数 | 内容 |
|------|------|------|
| bible_data 欠落 | **0件** | 全 8,724 Tier 1 ref がロード成功 |
| morph 欠落 | **0件** | morph フィールドなし token なし |
| group-assignment との不整合 | **0件** | ref 整合性確認済み |

---

## 5. テスト結果

### 全テスト: **20 / 20 PASS**

| テスト | 内容 | 結果 |
|-------|------|------|
| TC-01 | 再現性（zone 層別） | PASS |
| TC-02 | シード感度 | PASS |
| TC-03a | Tier 6 全件確認（n=7） | PASS |
| TC-03b | Tier 7 全件確認（n=3） | PASS |
| TC-04 | ゾーン最低保証 | PASS |
| TC-05 | JUD インクルージョン | PASS |
| TC-06 | ref 重複なし（per-Strong） | PASS |
| TC-07 | 母集団数合計 = 39,310 | PASS |
| TC-08 | Tier 6-7 全件確認維持 | PASS |
| TC-09 | 実測/推定/未確認ステータス | PASS |
| TC-Global | ref 重複なし（cross-Strong） | PASS |
| TC-M1 | morph×zone 全セル population>0 | PASS |
| TC-M2 | morph×zone pop sum = total | PASS |
| TC-M3 | morph×zone sample sum = sampledCount | PASS |
| TC-M4 | small cells (n=1) 全件確認 | PASS |
| TC-M5 | morph あり再現性 | PASS |
| TC-M6 | morph 欠落 → UNKNOWN グループ | PASS |
| TC-M7 | JUD tokens が morph×zone セルから漏れない | PASS |
| TC-M8 | morph×zone sample に重複なし | PASS |
| TC-M9 | 実 bible_data でのフル統合テスト | PASS |

---

## 6. v1 vs v2 ドライラン差分

| 指標 | v1（zone のみ） | v2（morph × zone） | 差分 |
|------|--------------|-----------------|------|
| 総サンプル | 16,548 | 16,548 | 0 |
| 総 JUD サンプル | 85 | 87 | +2 |
| Tier 1 サンプル | 400 | 400 | 0 |
| Tier 1 JUD サンプル | 0 | 2 | +2 |
| Tier 1 method | zone_stratified_4zone | morph_zone_stratified_2d | 変更 |
| morph カバレッジ記録 | なし | あり（547 cells） | 追加 |
| small cell 保証 | なし | n=1 cells 全件 | 追加 |
| 再現性 | ✅ | ✅ | 維持 |
| 重複 | 0 | 0 | 維持 |
| integrityOk | true | true | 維持 |
| inputHash | sha256:3ce926e505660d3c | sha256:3ce926e505660d3c | 同一 |

---

## 7. サンプリング計画への適合状況

| 計画要件 | 適合状態 |
|---------|---------|
| 書巻区分（4区）× 形態（tense × mood）| **✅ 実装完了** |
| サンプル数 15〜20 tokens/Strong | **✅ 全 20 Strongs で 20 件** |
| 各書巻区分から最低 2 tokens | **✅ 維持** |
| 少数層全件確認（small cell rule） | **✅ n=1 cells 全件確認** |
| 乱数シード（Strong番号 % 10000） | **✅ 実装済み** |
| 拡大条件記録 | **✅ expansionCondition フィールド** |
| 抽出 ref の保存 | **✅ sampledRefs 全件保存** |
| 母集団/サンプル/未確認カウント | **✅ 全 Strong に記録** |
| 重複検出 | **✅ _integrityCheck + globalDuplicateRefs** |
| 入力ハッシュ | **✅ sha256:3ce926e505660d3c** |

---

## 8. Group A 本監査の開始条件

| 条件 | 状態 |
|------|------|
| Tier 1 morph × zone 層別実装 | **✅ 完了** |
| 全テスト PASS | **✅ 20/20** |
| ドライラン完了（v2） | **✅ 完了** |
| JDE → JUD 修正 | **✅ 完了** |
| count-clarification 補足 | **✅ 完了** |
| bible_data 変更なし | **✅ 確認** |
| Phase 4a〜4c 成果物保護 | **✅ 確認** |

### **Group A 本監査の開始条件: すべて充足**

---

## 9. 成果物一覧

| ファイル | 内容 | バージョン |
|---------|------|---------|
| `scripts/stage4-groupA-sampler.cjs` | サンプリングエンジン | v2.0.0 |
| `scripts/stage4-sampler-test.cjs` | テストスイート（20件） | v2.0.0 |
| `stage4-phase4d-sampling-dry-run.json` | ドライラン（zone のみ、上書きなし） | v1 |
| `stage4-phase4d-sampling-dry-run-v2.json` | ドライラン（morph × zone） | v2 |
| `stage4-phase4d-tier1-morph-zone-addendum.md` | morph × zone 設計補足 | — |
| `stage4-phase4d-test-report.md` | テスト結果詳細 | 更新 |
| `stage4-phase4d-infrastructure-report.md` | インフラ報告書 | 参照 |
| `stage4-phase4d-final-report.md` | 本ファイル | — |

---

## 10. 制約遵守

| 制約 | 状態 |
|------|------|
| Bible JSON 変更禁止 | **変更なし** |
| `token.japanese` 変更禁止 | **変更なし** |
| 承認済みデータ変更禁止 | **変更なし** |
| Phase 4a〜4c 成果物変更禁止 | **変更なし** |
| Group A/F/G/H 本監査開始禁止 | **未開始** |
| Stage 5 開始禁止 | **未開始** |
| commit / push 禁止 | **未実行** |

---

*Phase 4d 完了*
