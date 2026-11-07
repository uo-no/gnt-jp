# Stage 4 Phase 4aq — Tier 1 SAMPLED_INFERRED 7,880件 再分類報告

**Phase**: 4aq
**実施日**: 2026-11-04
**性格**: Phase 4ap STRONG_CONSISTENT_SAMPLE_SUPPORTED 7,880件を UNREVIEWED → RETAIN_CONFIRMED に再分類（台帳更新）

---

## 1. 作業前確認

| 項目 | 値 |
|------|-----|
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| origin HEAD | 1c7c8dee348d4582a227bdf0c37541d68cde4c1a |
| Phase 4ag 状態（前） | UNREVIEWED=41,215 / RETAIN_CONFIRMED=51,364 |
| Phase 4ap 成果物 | SAMPLE_SUPPORTED=7,885 / EXCEPTION_RISK=439 |
| 保護対象（EXCEPTION_RISK） | 439件（G3762=214, G3056=123, G4183=39, G2983=22, G4160=21, G3708=20） |
| G3708 追加 +5 | V-RAP non-NSM（εἰδ-完了語幹）— 保守的除外 |

---

## 2. G3708 追加 +5 件の確認と処置

Phase 4ap レポートが「20件(+5件)」と表記した G3708 V-RAP non-NSM 5件を元データで照合:

| ref | morph | Phase 4ap verdict | Phase 4aq 処置 |
|-----|-------|-------------------|----------------|
| JHN 4:45!12 | V-RAP-NPM-ATT | STRONG_CONSISTENT_SAMPLE_SUPPORTED | **除外 → UNREVIEWED 維持** |
| JHN 14:9!16 | V-RAP-NSM-ATT | STRONG_CONSISTENT_SAMPLE_SUPPORTED | **除外 → UNREVIEWED 維持** |
| JHN 19:35!3 | V-RAP-NSM-ATT | STRONG_CONSISTENT_SAMPLE_SUPPORTED | **除外 → UNREVIEWED 維持** |
| 2PE 1:12!9  | V-RAP-APM     | STRONG_CONSISTENT_SAMPLE_SUPPORTED | **除外 → UNREVIEWED 維持** |
| JUD 1:5!5   | V-RAP-APM     | STRONG_CONSISTENT_SAMPLE_SUPPORTED | **除外 → UNREVIEWED 維持** |

**除外理由**: V-RAP* 形はいずれも εἰδ- 完了語幹（having seen = knowing）を持ち、Phase 4e の CONTEXT_DEPENDENT JHN 6:61!1（V-RAP-NSM）と同一の設計判断を必要とする。Phase 4ap では SAMPLE_SUPPORTED に分類されたが、G3708 設計判断と同時に処理すべきである。

**5件は 439件の母集団外（EXCEPTION_RISK に含まれない）**:
- 5件はすべて Phase 4ag UNREVIEWED 確認済み ✓
- 今回の再分類には含めない

**実際の昇格件数: 7,885 − 5 = 7,880 件**

---

## 3. 事前照合結果

| チェック | 期待値 | 実測値 | 判定 |
|---------|--------|--------|------|
| Phase 4ap SAMPLE_SUPPORTED 総数 | 7,885 | 7,885 | ✓ PASS |
| G3708 +5 除外後の昇格対象 | 7,880 | 7,880 | ✓ PASS |
| 全7,880件 UNREVIEWED in Phase 4ag | 7,880 | 7,880 | ✓ PASS |
| bible_data strong 一致 | 7,880 | 7,880 | ✓ PASS |
| bible_data japanese 一致 | 7,880 | 7,880 | ✓ PASS |
| bible_data morph 一致 | 7,880 | 7,880 | ✓ PASS |
| EXCEPTION_RISK との重複 | 0 | 0 | ✓ PASS |
| G3708 +5 が昇格対象に含まれない | true | true | ✓ PASS |
| 重複 ref | 0 | 0 | ✓ PASS |

**事前照合: PASS（9/9）**

---

## 4. 再分類結果

| state | 変更前 | 変更後 | 差分 |
|-------|--------|--------|------|
| UNREVIEWED | 41,215 | **33,335** | −7,880 |
| RETAIN_CONFIRMED | 51,364 | **59,244** | +7,880 |
| IMPLEMENTED_AND_VERIFIED | 365 | 365 | 0 |
| HOLD_DATA_QUALITY | 7 | 7 | 0 |
| HOLD_CONTEXT | 1 | 1 | 0 |
| **合計** | **92,952** | **92,952** | 0 |

**Phase 4aq 指示書の期待値との差異**:
Phase 4aq 指示書は UNREVIEWED=33,330 / RETAIN_CONFIRMED=59,249 を期待値として記載（7,885件昇格想定）。
G3708 +5 保守的除外により実際は 7,880件昇格。差異は 5件、理由は上記 §2 のとおり。

---

## 5. 保護確認

| 保護対象 | 件数 | Phase 4ag 状態（更新後） |
|---------|------|------------------------|
| EXCEPTION_RISK（Phase 4ap） | 439 | **UNREVIEWED**（全件） |
| G3708 V-RAP non-NSM（+5） | 5 | **UNREVIEWED**（全件） |
| **保護合計** | **444** | **UNREVIEWED** |

---

## 6. basis の定義

```
PHASE4E_SAMPLED_INFERRED_CONFIRMED_T1
```

**定義**: Phase 4e の Tier 1 サンプル結果（CONFIRMED_OK）と Strong 単位の一貫性（distinct_japanese=1）に基づく推定確認。個々の ref をすべて直接確認したものではない。

**他の basis との比較**:

| basis | 確認粒度 | Tier | Phase |
|-------|---------|------|-------|
| PHASE4H_INDIVIDUALLY_CONFIRMED_OK | ref 単位・全件個別確認 | — | 4ai（196件） |
| PHASE4E_DIRECTLY_SAMPLED_OK | ref 単位・直接サンプル | Tier 1 | 4ao（375件） |
| PHASE4F_DIRECTLY_SAMPLED_OK | ref 単位・直接サンプル | Tier 2 | 4am（410件） |
| **PHASE4E_SAMPLED_INFERRED_CONFIRMED_T1** | Strong 単位推定 | **Tier 1** | **4aq（7,880件）** |
| PHASE4F_SAMPLED_INFERRED_CONFIRMED | Strong 単位推定 | Tier 2 | 4ak（4,158件） |

PHASE4E_SAMPLED_INFERRED_CONFIRMED_T1 は Phase 4e Tier 1 のサンプルを根拠にした推定確認。PHASE4F_SAMPLED_INFERRED_CONFIRMED（Tier 2）とは対象 Strong の頻度帯が異なるが同等の証拠強度。ref 単位の直接確認 basis（PHASE4H/4E/4F_DIRECTLY_SAMPLED_OK）より証拠強度は低い。

---

## 7. Strong 別昇格件数（全20件）

| Strong | lexical | 昇格件数 | EXCEPTION_RISK残存 | distinct_ja |
|--------|---------|---------|------------------|------------|
| G3004 | λέγω say | 1,144 | 0 | 1（言う） |
| G3956 | πᾶς all/every | 864 | 0 | 1（すべての） |
| G2036 | εἶπον say (2nd aor) | 846 | 0 | 1（言う） |
| G2192 | ἔχω have | 659 | 0 | 1（持つ） |
| G1096 | γίνομαι become | 560 | 0 | 1（なる） |
| G4160 | ποιέω do/make | 479 | **21** | 1（行う） |
| G2064 | ἔρχομαι come/go | 485 | 0 | 1（来る） |
| G3708 | ὁράω see | **379** | 20 (+5) | 1（見る） |
| G1325 | δίδωμι give | 360 | 0 | 1（与える） |
| G191 | ἀκούω hear | 341 | 0 | 1（聞く） |
| G3056 | λόγος word | 187 | **123** | 1（ことば） |
| G1492 | οἶδα know | 264 | 0 | 1（知る） |
| G3762 | οὐδείς no one | 0 | **214** | 1（誰も〜ない） |
| G2980 | λαλέω speak | 214 | 0 | 1（語る） |
| G611 | ἀποκρίνομαι answer | 211 | 0 | 1（答える） |
| G2983 | λαμβάνω take/receive | 183 | **22** | 1（受ける） |
| G1831 | ἐξέρχομαι go out | 191 | 0 | 1（出る） |
| G1520 | εἷς one | 187 | 0 | 1（一つ） |
| G4183 | πολύς many/much | 145 | **39** | 1（多くの） |
| G2309 | θέλω will/wish | 181 | 0 | 1（望む） |
| **合計** | | **7,880** | **439(+5)** | |

---

## 8. RETAIN_CONFIRMED 根拠区分（更新後）

| basis 区分 | 件数 | Phase |
|-----------|------|-------|
| DESIGN_RULE（Group Z） | 40,990 | — |
| ALL_INDIVIDUALLY_CONFIRMED（C+E） | 2,636 | 4c/4a |
| PHASE4H_INDIVIDUALLY_CONFIRMED_OK | 196 | 4ai |
| PHASE4B_AUDITED（D） | 281 | 4b |
| GROUP_RULE_INFERRED（B） | 2,318 | 4b |
| PHASE4F_SAMPLED_INFERRED_CONFIRMED | 4,158 | 4ak |
| PHASE4F_DIRECTLY_SAMPLED_OK | 410 | 4am |
| PHASE4E_DIRECTLY_SAMPLED_OK | 375 | 4ao |
| **PHASE4E_SAMPLED_INFERRED_CONFIRMED_T1** | **7,880** | **4aq** |
| **合計** | **59,244** | |

---

## 9. 整合性チェック

| チェック | 期待値 | 実測値 | 判定 |
|---------|--------|--------|------|
| 総 token 数 | 92,952 | 92,952 | ✓ PASS |
| 全 state の合計 | 92,952 | 92,952 | ✓ PASS |
| UNREVIEWED | 33,335 | 33,335 | ✓ PASS |
| RETAIN_CONFIRMED | 59,244 | 59,244 | ✓ PASS |
| IMPLEMENTED_AND_VERIFIED | 365 | 365 | ✓ PASS |
| HOLD_DATA_QUALITY | 7 | 7 | ✓ PASS |
| HOLD_CONTEXT | 1 | 1 | ✓ PASS |
| 再分類件数 | 7,880 | 7,880 | ✓ PASS |
| 重複 ref | 0 | 0 | ✓ PASS |
| EXCEPTION_RISK 439件保護 | 439 | 439 | ✓ PASS |
| G3708 +5 保護 | 5 | 5 | ✓ PASS |
| EXCEPTION と昇格の重複 | 0 | 0 | ✓ PASS |
| G3708 +5 と昇格の重複 | 0 | 0 | ✓ PASS |

**Phase 4aq: PASS（13/13）**

---

## 10. 更新ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `stage4-phase4aq-reclassification.json` | 新規作成 — 7,880件の再分類証拠台帳 |
| `stage4-phase4aq-reclassification-report.md` | 新規作成 — 本ファイル |
| `stage4-phase4ag-residual-inventory.json` | 更新 — 7,880件 state 変更、state_summary 更新 |

**保護ファイル（変更なし）:**
- stage4-phase4ap-tier1-inferred-audit.json
- すべての Bible JSON / 辞書 / インデックス / エンジン / テストベースライン

---

## 11. 次 Phase への申し送り

| 優先 | 対象 | 件数 | 推奨 |
|------|------|------|------|
| 高 | G3762 neuter/fem forms | 95 | 形態論ベース変更審査（何も〜ない） |
| 中 | G3056 N-ASM exception | 123 | 文脈確認（大半は ことば で昇格可能） |
| 中 | G3708 V-RAP 設計判断 | 20+5 | L-0 判断後に処理 |
| 中 | G4183/G2983/G4160 exception | 101 | 文脈確認・個別昇格 |
| 中 | G3762 masculine forms | 119 | 誰も〜ない で昇格可能（別フェーズ） |
| 低 | Tier 3–7 TRULY_UNREVIEWED | ~32,890 | Phase 4ah 9ユニット計画 |

**現在の UNREVIEWED 残存: 33,335件（92,952件の 35.9%）**
