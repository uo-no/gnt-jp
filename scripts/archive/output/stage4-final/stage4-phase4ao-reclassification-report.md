# Stage 4 Phase 4ao — Tier 1 SAMPLED_TOKEN 375件 再分類報告

**Phase**: 4ao
**実施日**: 2026-11-04
**性格**: Phase 4an DIRECTLY_CONFIRMED_OK 375件を UNREVIEWED → RETAIN_CONFIRMED に再分類（台帳更新）

---

## 1. 作業前確認

| 項目 | 値 |
|------|-----|
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| origin HEAD | 1c7c8dee348d4582a227bdf0c37541d68cde4c1a |
| Phase 4ag 状態（前） | UNREVIEWED=41,590 / RETAIN_CONFIRMED=50,989 |
| Phase 4an 成果物 | 376件: DIRECTLY_CONFIRMED_OK=375 / DIRECTLY_CONFIRMED_HOLD=1 |
| 保護対象 | JHN 6:61!1（G3708 εἰδὼς）— DIRECTLY_CONFIRMED_HOLD、昇格対象外 |

---

## 2. 事前照合結果

| チェック | 期待値 | 実測値 | 判定 |
|---------|--------|--------|------|
| Phase 4an DIRECTLY_CONFIRMED_OK 総数 | 375 | 375 | ✓ PASS |
| 全375件 UNREVIEWED in Phase 4ag | 375 | 375 | ✓ PASS |
| basis = PHASE4E_DIRECTLY_SAMPLED_OK | 375 | 375 | ✓ PASS |
| bible_data strong 一致 | 375 | 375 | ✓ PASS |
| bible_data morph 一致 | 375 | 375 | ✓ PASS |
| bible_data japanese 一致 | 375 | 375 | ✓ PASS |
| JHN 6:61!1 が OK セットに含まれない | true | true | ✓ PASS |
| 重複 ref | 0 | 0 | ✓ PASS |

**事前照合: PASS（8/8）**

---

## 3. 再分類結果

| state | 変更前 | 変更後 | 差分 |
|-------|--------|--------|------|
| UNREVIEWED | 41,590 | **41,215** | −375 |
| RETAIN_CONFIRMED | 50,989 | **51,364** | +375 |
| IMPLEMENTED_AND_VERIFIED | 365 | 365 | 0 |
| HOLD_DATA_QUALITY | 7 | 7 | 0 |
| HOLD_CONTEXT | 1 | 1 | 0 |
| **合計** | **92,952** | **92,952** | 0 |

---

## 4. 保留保護確認

| 項目 | 値 |
|------|-----|
| **ref** | JHN 6:61!1 |
| **Strong** | G3708 ὁράω |
| **greekForm** | εἰδὼς（完了分詞） |
| **Phase 4an verdict** | DIRECTLY_CONFIRMED_HOLD |
| **Phase 4ao での扱い** | 昇格対象から除外 |
| **Phase 4ag state（更新後）** | **UNREVIEWED**（変更なし） |
| **japanese** | 見る（変更なし） |

**保護確認: ✓ 保護 PASS**

---

## 5. basis の定義と根拠区分

### 付与 basis

```
PHASE4E_DIRECTLY_SAMPLED_OK
```

**定義：** Phase 4e Tier 1 サンプリングで当該 ref が直接選定され、監査員が greekForm・morph・verseContext・japanese を個別確認の上、CONFIRMED_OK と判定した。Phase 4an で bible_data 現在値との strong/morph/japanese 完全一致を確認済み。

### 根拠強度の位置づけ

| basis | 確認粒度 | 対象 Tier | Phase |
|-------|---------|-----------|-------|
| PHASE4H_INDIVIDUALLY_CONFIRMED_OK | ref 単位・changeNeeded=false 全件 | — | 4ai（196件） |
| PHASE4F_DIRECTLY_SAMPLED_OK | ref 単位・Phase 4f 直接サンプル・HIGH conf | Tier 2 | 4am（410件） |
| **PHASE4E_DIRECTLY_SAMPLED_OK** | ref 単位・Phase 4e 直接サンプル・Tier 1 | **Tier 1** | **4ao（375件）** |
| PHASE4F_SAMPLED_INFERRED_CONFIRMED | Strong 単位推定 | Tier 2 | 4ak（4,158件） |
| PHASE4B_AUDITED | Group 単位 | — | — |

PHASE4E_DIRECTLY_SAMPLED_OK と PHASE4F_DIRECTLY_SAMPLED_OK は同等の ref 単位直接確認。対象 Strong の Tier（頻度帯）が異なるのみ。

---

## 6. Strong 別昇格件数（全20件）

| Strong | lexical | 件数 | distinct_japanese | morph種 |
|--------|---------|------|------------------|---------|
| G191 | ἀκούω hear/listen | 20 | 聞く | 18 |
| G611 | ἀποκρίνομαι answer/reply | 20 | 答える | 10 |
| G1096 | γίνομαι become/happen | 20 | なる | 16 |
| G1325 | δίδωμι give | 20 | 与える | 19 |
| G1492 | οἶδα know | 20 | 知る | 12 |
| G1520 | εἷς one | 15 | 一つ | 6 |
| G1831 | ἐξέρχομαι go out | 20 | 出る | 15 |
| G2036 | εἶπον say (2nd aor) | 20 | 言う | 11 |
| G2064 | ἔρχομαι come/go | 20 | 来る | 17 |
| G2192 | ἔχω have | 20 | 持つ | 16 |
| G2309 | θέλω will/wish | 20 | 望む | 15 |
| G2980 | λαλέω speak | 20 | 語る | 16 |
| G2983 | λαμβάνω take/receive | 18 | 受ける | 15 |
| G3004 | λέγω say | 20 | 言う | 15 |
| G3056 | λόγος word | 19 | ことば | 6 |
| G3708 | ὁράω see | **19** | 見る | 17 |
| G3762 | οὐδείς no one/nothing | 10 | 誰も〜ない | 2 |
| G3956 | πᾶς all/every | 20 | すべての | 13 |
| G4160 | ποιέω do/make | 19 | 行う | 15 |
| G4183 | πολύς many/much | 15 | 多くの | 13 |
| **合計** | | **375** | | |

**備考:** G3708 は20件サンプル中 JHN 6:61!1（DIRECTLY_CONFIRMED_HOLD）を除く19件のみ昇格。

---

## 7. RETAIN_CONFIRMED 根拠区分（更新後）

| basis 区分 | 件数 | Phase |
|-----------|------|-------|
| DESIGN_RULE（Group Z） | 40,990 | — |
| ALL_INDIVIDUALLY_CONFIRMED（C+E） | 2,636 | 4c/4a |
| PHASE4H_INDIVIDUALLY_CONFIRMED_OK | 196 | 4ai |
| PHASE4B_AUDITED（D） | 281 | 4b |
| GROUP_RULE_INFERRED（B） | 2,318 | 4b |
| PHASE4F_SAMPLED_INFERRED_CONFIRMED | 4,158 | 4ak |
| PHASE4F_DIRECTLY_SAMPLED_OK | 410 | 4am |
| **PHASE4E_DIRECTLY_SAMPLED_OK** | **375** | **4ao** |
| **合計** | **51,364** | |

---

## 8. 整合性チェック

| チェック | 期待値 | 実測値 | 判定 |
|---------|--------|--------|------|
| 総 token 数 | 92,952 | 92,952 | ✓ PASS |
| 全 state の合計 | 92,952 | 92,952 | ✓ PASS |
| UNREVIEWED | 41,215 | 41,215 | ✓ PASS |
| RETAIN_CONFIRMED | 51,364 | 51,364 | ✓ PASS |
| IMPLEMENTED_AND_VERIFIED | 365 | 365 | ✓ PASS |
| HOLD_DATA_QUALITY | 7 | 7 | ✓ PASS |
| HOLD_CONTEXT | 1 | 1 | ✓ PASS |
| 再分類件数 | 375 | 375 | ✓ PASS |
| 重複 ref | 0 | 0 | ✓ PASS |
| JHN 6:61!1 保護 | UNREVIEWED | UNREVIEWED | ✓ PASS |

**Phase 4ao: PASS（10/10）**

---

## 9. 更新ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `stage4-phase4ao-reclassification.json` | 新規作成 — 375件の再分類証拠台帳 |
| `stage4-phase4ao-reclassification-report.md` | 新規作成 — 本ファイル |
| `stage4-phase4ag-residual-inventory.json` | 更新 — 375件 state 変更、state_summary 更新 |

**保護ファイル（変更なし）:**
- stage4-phase4an-tier1-sampled-token-audit.json（Phase 4an 成果物、証拠として保持）
- すべての Bible JSON / 辞書 / インデックス / エンジン / テストベースライン

---

## 10. 次 Phase への申し送り

| 項目 | UNREVIEWED 件数 | 推奨 |
|------|----------------|------|
| Tier 1 SAMPLED_INFERRED（8,324件） | 8,324 | Phase 4ap: Phase 4e Strong 単位一貫性照合 |
| Tier 3–7 TRULY_UNREVIEWED（32,890件） | 32,890 | Phase 4ah 9ユニット計画参照 |
| Group F/G/H（約7,270件） | 〃含む | 優先度低 |
| JHN 6:61!1（G3708 εἰδὼς） | 1 | 設計判断後に RETAIN_CONFIRMED 昇格または HOLD_CONTEXT へ |

**現在の UNREVIEWED 残存: 41,215件（92,952件の 44.3%）**
