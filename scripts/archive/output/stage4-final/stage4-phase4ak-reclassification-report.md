# Stage 4 Phase 4ak — Tier 2 SAMPLED_INFERRED 4,158件 再分類報告

**Phase**: 4ak
**実施日**: 2026-11-04
**性格**: Phase 4aj CONFIRMED_OK 4,158件を UNREVIEWED → RETAIN_CONFIRMED に再分類（台帳更新）

---

## 1. 作業前確認

| 項目 | 値 |
|------|-----|
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| origin HEAD | 2120b4b4201a492bfd7f9f5e610e7b2833b02d31 |
| Phase 4ag 状態（前） | UNREVIEWED=46,158 / RETAIN_CONFIRMED=46,421 / IMPL=365 / HOLD_DQ=7 / HOLD_CTX=1 |
| Phase 4aj 成果物 | stage4-phase4aj-tier2-audit.json（4,158件全件 CONFIRMED_OK） |
| Phase 4ai との関係 | Phase 4ai（196件 INDIVIDUALLY_CONFIRMED_OK）との重複なし |

---

## 2. 事前照合結果

| チェック | 期待値 | 実測値 | 判定 |
|---------|--------|--------|------|
| Phase 4aj CONFIRMED_OK 総数 | 4,158 | 4,158 | ✓ PASS |
| Phase 4aj refs 重複なし | 4,158 unique | 4,158 | ✓ PASS |
| Phase 4ag UNREVIEWED 確認 | 4,158 | 4,158 | ✓ PASS |
| IMPLEMENTED_AND_VERIFIED との重複 | 0 | 0 | ✓ PASS |
| Phase 4aj verdict 全件 CONFIRMED_OK | 4,158 | 4,158 | ✓ PASS |
| bible_data Strong 一致 | 0 mismatch | 0 | ✓ PASS |

**事前照合: PASS（6/6）**

---

## 3. 再分類結果

| state | 変更前 | 変更後 | 差分 |
|-------|--------|--------|------|
| UNREVIEWED | 46,158 | **42,000** | −4,158 |
| RETAIN_CONFIRMED | 46,421 | **50,579** | +4,158 |
| IMPLEMENTED_AND_VERIFIED | 365 | 365 | 0 |
| HOLD_DATA_QUALITY | 7 | 7 | 0 |
| HOLD_CONTEXT | 1 | 1 | 0 |
| **合計** | **92,952** | **92,952** | 0 |

---

## 4. basis の定義と根拠区分

### 4.1 付与 basis

```
PHASE4F_SAMPLED_INFERRED_CONFIRMED
```

**定義：** Phase 4f Tier 2 サンプリングで当該 Strong が対象となり、サンプル全件が CONFIRMED_OK であった。加えて Phase 4aj で全件 japanese 一貫性照合・データ品質照合（strong mismatch=0, NOT_FOUND=0）を実施した結果、CONFIRMED_OK と判定された。

### 4.2 個別確認との区別

| basis | 意味 | 件数 |
|-------|------|------|
| PHASE4H_INDIVIDUALLY_CONFIRMED_OK | Phase 4h で ref 1件ずつ個別確認（changeNeeded=false） | 196件（Phase 4ai） |
| PHASE4F_SAMPLED_INFERRED_CONFIRMED | Phase 4f サンプル全 OK + Strong 単位一貫性 + データ品質照合 | **4,158件（本 Phase）** |

PHASE4F_SAMPLED_INFERRED_CONFIRMED は **サンプル推定に基づく集団確認** であり、個別語義確認ではない。JA1955 との ref 単位比較や形態論的詳細確認を含まない。Phase 4ah における「SAMPLED_INFERRED」の定義に対応する。

---

## 5. Strong 別昇格件数（全33件）

| Strong | lemma | 件数 | distinct_japanese | 4f sample |
|--------|-------|------|------------------|-----------|
| G1097 | γινώσκω | 176 | 知る | 12 |
| G3173 | μέγας | 175 | 大きい | 12 |
| G1525 | εἰσέρχομαι | 175 | 入る | 12 |
| G1125 | γράφω | 172 | 書く | 12 |
| G3779 | οὕτως | 167 | このように | 12 |
| G1410 | δύναμαι | 166 | できる | 12 |
| G40 | ἅγιος | 159 | 聖なる | 12 |
| G2041 | ἔργον | 156 | 業 | 13 |
| G2147 | εὑρίσκω | 157 | 見つける | 12 |
| G2889 | κόσμος | 150 | 世界 | 12 |
| G4100 | πιστεύω | 144 | 信じる | 12 |
| G2476 | ἵστημι | 134 | 立つ | 12 |
| G2564 | καλέω | 132 | 呼ぶ | 13 |
| G1453 | ἐγείρω | 130 | 起こす | 13 |
| G932 | βασιλεία | 123 | 御国 | 15 |
| G243 | ἄλλος | 121 | 他の | 12 |
| G649 | ἀποστέλλω | 119 | 遣わす | 13 |
| G1401 | δοῦλος | 112 | しもべ | 12 |
| G4198 | πορεύομαι | 111 | 行く | 13 |
| G3825 | πάλιν | 111 | 再び | 12 |
| G906 | βάλλω | 110 | 投げる | 13 |
| G3860 | παραδίδωμι | 105 | 引き渡す | 12 |
| G5119 | τότε | 101 | そのとき | 12 |
| G565 | ἀπέρχομαι | 100 | 去る | 15 |
| G991 | βλέπω | 100 | 見る | 12 |
| G3498 | νεκρός | 100 | 死んだ | 12 |
| G3306 | μένω | 100 | とどまる | 12 |
| G5607 | ὤν | 99 | いる | 12 |
| G4983 | σῶμα | 94 | 体 | 12 |
| G450 | ἀνίστημι | 94 | 立ち上がる | 14 |
| G2212 | ζητέω | 90 | 求める | 12 |
| G2250 | ἡμέρα | 88 | 日 | 12 |
| G142 | αἴρω | 87 | 取り上げる | 14 |
| **合計** | | **4,158** | | |

---

## 6. RETAIN_CONFIRMED 根拠区分（更新後）

| basis 区分 | 件数 | 根拠 |
|-----------|------|------|
| DESIGN_RULE（Group Z 機能語） | 40,990 | Stage 4 対象外設計 |
| ALL_INDIVIDUALLY_CONFIRMED（C+E） | 2,636 | Phase 4c/4a 全件個別 OK |
| PHASE4H_INDIVIDUALLY_CONFIRMED_OK（Phase 4ai） | 196 | Phase 4h ref 単位個別確認 |
| PHASE4B_AUDITED（D） | 281 | Phase 4b 全件照合 |
| GROUP_RULE_INFERRED（B） | 2,318 | Phase 4b ルール適用 |
| **PHASE4F_SAMPLED_INFERRED_CONFIRMED（Phase 4ak）** | **4,158** | Phase 4f サンプル+一貫性照合 |
| **合計** | **50,579** | |

**個別確認済み（INDIVIDUALLY_CONFIRMED）合計: 2,832件**（C+E+Phase 4ai）
**サンプル推定（SAMPLED_INFERRED_CONFIRMED）: 4,158件**（本 Phase）

---

## 7. 全92,952件の重複・欠落チェック

| チェック | 期待値 | 実測値 | 判定 |
|---------|--------|--------|------|
| 総 token 数 | 92,952 | 92,952 | ✓ PASS |
| 全 state の合計 | 92,952 | 92,952 | ✓ PASS |
| UNREVIEWED 更新後 | 42,000 | 42,000 | ✓ PASS |
| RETAIN_CONFIRMED 更新後 | 50,579 | 50,579 | ✓ PASS |
| IMPLEMENTED_AND_VERIFIED | 365 | 365 | ✓ PASS |
| HOLD_DATA_QUALITY | 7 | 7 | ✓ PASS |
| HOLD_CONTEXT | 1 | 1 | ✓ PASS |
| 再分類件数 | 4,158 | 4,158 | ✓ PASS |
| 重複 ref | 0 | 0 | ✓ PASS |

**Phase 4ak: PASS（9/9）**

---

## 8. 更新ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `stage4-phase4ak-reclassification.json` | 新規作成 — 4,158件の再分類証拠台帳 |
| `stage4-phase4ak-reclassification-report.md` | 新規作成 — 本ファイル |
| `stage4-phase4ag-residual-inventory.json` | 更新 — 4,158件 state 変更、state_summary 更新 |

**保護ファイル（変更なし）:**
- stage4-phase4aj-tier2-audit.json（Phase 4aj 成果物、証拠として保持）
- すべての Bible JSON / 辞書 / インデックス / エンジン / テストベースライン

---

## 9. 次 Phase への申し送り

| 項目 | 状態 | 推奨 |
|------|------|------|
| Tier 1 SAMPLED_INFERRED 8,324件（Group A） | UNREVIEWED | Phase 4al で全件照合を推奨 |
| Tier 2 SAMPLED_TOKEN 410件（Group A） | UNREVIEWED | Phase 4f 直接サンプル済みトークン — 高優先 |
| ACT 3:13!27 G2919 裁く vs 決める | HOLD_CONTEXT | ユーザー確認待ち |
| G1520×5 / G4183 LUK 24:28 / G450 MRK 10:50 | HOLD_DATA_QUALITY | bible_data 修正待ち |
| Tier 3–7 TRULY_UNREVIEWED 32,890件 | UNREVIEWED | Phase 4ah 9ユニット計画参照 |
| Group F/G/H 7,270件 | UNREVIEWED | 優先度低 |

**現在の UNREVIEWED 残存: 42,000件（92,952件の 45.2%）**
