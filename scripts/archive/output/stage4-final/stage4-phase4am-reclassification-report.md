# Stage 4 Phase 4am — SAMPLED_TOKEN 410件 再分類報告

**Phase**: 4am
**実施日**: 2026-11-04
**性格**: Phase 4al CONFIRMED_OK 410件を UNREVIEWED → RETAIN_CONFIRMED に再分類（台帳更新）

---

## 1. 作業前確認

| 項目 | 値 |
|------|-----|
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| Phase 4ag 状態（前） | UNREVIEWED=42,000 / RETAIN_CONFIRMED=50,579 |
| Phase 4al 成果物 | 410件全件 CONFIRMED_OK / basis=PHASE4F_DIRECTLY_SAMPLED_OK / confidence=HIGH |
| Phase 4ai との重複 | 0 |
| Phase 4ak との重複 | 0 |
| IMPLEMENTED_AND_VERIFIED との重複 | 0 |

---

## 2. 事前照合結果

| チェック | 期待値 | 実測値 | 判定 |
|---------|--------|--------|------|
| Phase 4al CONFIRMED_OK 総数 | 410 | 410 | ✓ PASS |
| 全410件 UNREVIEWED in Phase 4ag | 410 | 410 | ✓ PASS |
| basis = PHASE4F_DIRECTLY_SAMPLED_OK | 410 | 410 | ✓ PASS |
| confidence = HIGH | 410 | 410 | ✓ PASS |
| japanese 一致（bible_data） | 410 | 410 | ✓ PASS |
| Phase 4ai/4ak/IMPL との重複 | 0 | 0 | ✓ PASS |

**事前照合: PASS（6/6）**

---

## 3. 再分類結果

| state | 変更前 | 変更後 | 差分 |
|-------|--------|--------|------|
| UNREVIEWED | 42,000 | **41,590** | −410 |
| RETAIN_CONFIRMED | 50,579 | **50,989** | +410 |
| IMPLEMENTED_AND_VERIFIED | 365 | 365 | 0 |
| HOLD_DATA_QUALITY | 7 | 7 | 0 |
| HOLD_CONTEXT | 1 | 1 | 0 |
| **合計** | **92,952** | **92,952** | 0 |

---

## 4. basis の定義と根拠区分

```
PHASE4F_DIRECTLY_SAMPLED_OK
```

**定義：** Phase 4f Tier 2 サンプリングで当該 ref が直接選定され、監査員が greekForm・morph・verseContext・japanese を個別確認の上、CONFIRMED_OK / HIGH confidence と判定した。Phase 4al で bible_data 現在値との japanese 完全一致を確認済み。

**根拠強度の位置づけ：**

| basis | 確認粒度 | Phase |
|-------|---------|-------|
| PHASE4H_INDIVIDUALLY_CONFIRMED_OK | ref 単位・changeNeeded=false 全件確認 | 4ai（196件） |
| **PHASE4F_DIRECTLY_SAMPLED_OK** | ref 単位・Phase 4f 直接サンプル・HIGH conf | **4am（410件）** |
| PHASE4F_SAMPLED_INFERRED_CONFIRMED | Strong 単位推定（サンプル全 OK + 一貫性） | 4ak（4,158件） |
| PHASE4B_AUDITED | Group B/D 照合 | — |
| GROUP_RULE_INFERRED | Group ルール適用 | — |

---

## 5. Strong 別昇格件数（全33件）

| Strong | lexical | 件数 |
|--------|---------|------|
| G932 | βασιλεία kingdom | 15 |
| G565 | ἀπέρχομαι go away | 15 |
| G142 | αἴρω take up | 14 |
| G450 | ἀνίστημι rise/raise | 13 |
| G1453 | ἐγείρω raise/wake | 13 |
| G4198 | πορεύομαι go/travel | 13 |
| G906 | βάλλω throw/cast | 13 |
| G649 | ἀποστέλλω send out | 13 |
| G2041 | ἔργον work/deed | 13 |
| G2564 | καλέω call/name | 13 |
| G3779 | οὕτως thus/so | 12 |
| G3825 | πάλιν again | 12 |
| G1410 | δύναμαι be able | 12 |
| G243 | ἄλλος other | 12 |
| G5607 | ὤν being (ptcp) | 12 |
| G3498 | νεκρός dead | 12 |
| G2147 | εὑρίσκω find | 12 |
| G1525 | εἰσέρχομαι enter | 12 |
| G991 | βλέπω see | 12 |
| G2476 | ἵστημι stand/set | 12 |
| G2889 | κόσμος world | 12 |
| G4100 | πιστεύω believe | 12 |
| G1401 | δοῦλος slave/servant | 12 |
| G2212 | ζητέω seek | 12 |
| G5119 | τότε then | 12 |
| G2250 | ἡμέρα day | 12 |
| G1097 | γινώσκω know | 12 |
| G3173 | μέγας great | 12 |
| G40 | ἅγιος holy/sacred | 12 |
| G1125 | γράφω write | 12 |
| G4983 | σῶμα body | 12 |
| G3306 | μένω remain | 12 |
| G3860 | παραδίδωμι hand over | 11 |
| **合計** | | **410** |

---

## 6. RETAIN_CONFIRMED 根拠区分（更新後）

| basis 区分 | 件数 | Phase |
|-----------|------|-------|
| DESIGN_RULE（Group Z） | 40,990 | — |
| ALL_INDIVIDUALLY_CONFIRMED（C+E） | 2,636 | 4c/4a |
| PHASE4H_INDIVIDUALLY_CONFIRMED_OK | 196 | 4ai |
| PHASE4B_AUDITED（D） | 281 | 4b |
| GROUP_RULE_INFERRED（B） | 2,318 | 4b |
| PHASE4F_SAMPLED_INFERRED_CONFIRMED | 4,158 | 4ak |
| **PHASE4F_DIRECTLY_SAMPLED_OK** | **410** | **4am** |
| **合計** | **50,989** | |

---

## 7. 整合性チェック

| チェック | 期待値 | 実測値 | 判定 |
|---------|--------|--------|------|
| 総 token 数 | 92,952 | 92,952 | ✓ PASS |
| 全 state の合計 | 92,952 | 92,952 | ✓ PASS |
| UNREVIEWED | 41,590 | 41,590 | ✓ PASS |
| RETAIN_CONFIRMED | 50,989 | 50,989 | ✓ PASS |
| IMPLEMENTED_AND_VERIFIED | 365 | 365 | ✓ PASS |
| HOLD_DATA_QUALITY | 7 | 7 | ✓ PASS |
| HOLD_CONTEXT | 1 | 1 | ✓ PASS |
| 再分類件数 | 410 | 410 | ✓ PASS |
| 重複 ref | 0 | 0 | ✓ PASS |

**Phase 4am: PASS（9/9）**

---

## 8. 更新ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `stage4-phase4am-reclassification.json` | 新規作成 — 410件の再分類証拠台帳 |
| `stage4-phase4am-reclassification-report.md` | 新規作成 — 本ファイル |
| `stage4-phase4ag-residual-inventory.json` | 更新 — 410件 state 変更、state_summary 更新 |

**保護ファイル（変更なし）:**
- stage4-phase4al-sampled-token-audit.json（Phase 4al 成果物、証拠として保持）
- すべての Bible JSON / 辞書 / インデックス / エンジン / テストベースライン

---

## 9. 次 Phase への申し送り

| 項目 | UNREVIEWED 件数 | 推奨 |
|------|---------------|------|
| Tier 1 SAMPLED_TOKEN（376件） | 376 | Phase 4an: Phase 4e 直接サンプル照合 |
| Tier 1 SAMPLED_INFERRED（8,324件） | 8,324 | Phase 4ao: Tier 1 Strong 単位一貫性照合 |
| Tier 3–7 TRULY_UNREVIEWED（32,890件） | 32,890 | Phase 4ah 9ユニット計画参照 |
| Group F/G/H（7,270件） | 7,270 | 優先度低 |

**現在の UNREVIEWED 残存: 41,590件（92,952件の 44.7%）**
