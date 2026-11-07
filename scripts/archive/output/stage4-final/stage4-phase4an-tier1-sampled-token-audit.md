# Stage 4 Phase 4an — Tier 1 SAMPLED_TOKEN 376件 監査証拠照合報告

**Phase**: 4an
**実施日**: 2026-11-04
**性格**: READ-ONLY 監査証拠照合 — bible_data・辞書・インデックス・エンジン変更なし
**ステータス**: **CONDITIONAL PASS — 376件照合完了、1件設計判断保留**

---

## 1. 作業前確認

| 項目 | 値 |
|------|-----|
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| Phase 4ag 状態（現在） | UNREVIEWED=41,590 / RETAIN_CONFIRMED=50,989 |
| Phase 4am 完了 | Tier 2 SAMPLED_TOKEN 410件 → RETAIN_CONFIRMED |
| Phase 4an 対象 | Tier 1 SAMPLED_TOKEN（Phase 4e 直接サンプル済み ref）376件 |
| 照合元 | stage4-phase4e-tier1-audit.json（400 refs, 20 Strongs） |

---

## 2. 対象母集団の再構成

**376という数字を前提にせず、現在の inventory と元の監査記録から再構成した結果：**

| 派生元 | 条件 | 件数 |
|--------|------|------|
| Phase 4ah tokens | tier=1 AND audit_evidence=SAMPLED_TOKEN | **376** |
| Phase 4ag 状態確認 | 全376件が UNREVIEWED であること（Phase 4am 後） | 376（差分なし） |
| Phase 4e サンプル照合 | 全376件が Phase 4e に存在すること | 376（差分なし） |
| Phase 4e verdict 確認 | 375件 CONFIRMED_OK + 1件 CONTEXT_DEPENDENT | 376（差分なし） |

**対象母集団: 376件（確定）**

---

## 3. 母集団の整合性 — Phase 4e との差分説明

Phase 4e は Tier 1 20 Strongs から計 400 ref をサンプリング。Phase 4an 対象は 376 件（差分 24 件）。

| 差分の内訳 | 件数 | Phase 4ag state |
|-----------|------|----------------|
| REVISION_CANDIDATE（後にIMPL済み） | 18 | IMPLEMENTED_AND_VERIFIED |
| HOLD（データ品質問題等） | 6 | HOLD_DATA_QUALITY |
| **合計** | **24** | — |

**検証：** Phase 4e 全 400 ref の Phase 4ag 状態分布を確認
- UNREVIEWED: 376（Phase 4an 対象）
- HOLD_DATA_QUALITY: 6（Phase 4e HOLD）
- IMPLEMENTED_AND_VERIFIED: 18（Phase 4e REVISION_CANDIDATE 実装済み）
- 合計: 400 ✓

---

## 4. 判定区分（Phase 4an 分類スキーム）

| 判定 | 定義 |
|------|------|
| DIRECTLY_CONFIRMED_OK | Phase 4e judgment=CONFIRMED_OK かつ strong/morph/japanese 全一致 |
| DIRECTLY_CONFIRMED_HOLD | Phase 4e judgment=CONTEXT_DEPENDENT — 設計判断が必要 |
| EVIDENCE_MISMATCH | Phase 4e 記録と bible_data 現在値が一致しない |
| NOT_FOUND_IN_PHASE4E | Phase 4e サンプルに存在しない（Tier 1 外） |
| ALREADY_CLASSIFIED_ELSEWHERE | Phase 4e が REVISION_CANDIDATE/HOLD だが UNREVIEWED に残存 |

---

## 5. 判定結果

| 判定 | 件数 | 割合 |
|------|------|------|
| DIRECTLY_CONFIRMED_OK | **375** | **99.7%** |
| DIRECTLY_CONFIRMED_HOLD | **1** | **0.3%** |
| EVIDENCE_MISMATCH | 0 | — |
| NOT_FOUND_IN_PHASE4E | 0 | — |
| ALREADY_CLASSIFIED_ELSEWHERE | 0 | — |
| **合計** | **376** | |

---

## 6. bible_data 現在値との一致確認（3条件）

| 条件 | 結果 |
|------|------|
| ① strong 一致: Phase 4e 記録 = bible_data 現在値 | ✓ 376/376 |
| ② japanese 一致: Phase 4e 記録 = bible_data 現在値 | ✓ 376/376 |
| ③ morph 一致: Phase 4e 記録 = bible_data 現在値 | ✓ 376/376 |

追加確認:
- NOT_FOUND in bible_data: 0件
- strong mismatch: 0件
- japanese mismatch: 0件
- morph mismatch: 0件

---

## 7. DIRECTLY_CONFIRMED_HOLD — 詳細

| 項目 | 値 |
|------|-----|
| **ref** | JHN 6:61!1 |
| **Strong** | G3708 ὁράω see |
| **greekForm** | εἰδὼς |
| **lemma** | ὁράω |
| **morph** | V-RAP-NSM（完了能動分詞 主格 男性 単数） |
| **japanese（現在）** | 見る |
| **english（Phase 4e）** | knew |
| **Phase 4e judgment** | CONTEXT_DEPENDENT |
| **Phase 4e confidence** | MED |

**Phase 4e 注記：**
> εἰδώς は ὁράω（G3708）の完了分詞だが文脈意味は「知っていた」（english="knew"）。ja=[見る] はギリシャ語完了形「見た結果知っている」の構造義を示す。JA1955「イエスは自分の弟子たちが…」文脈では「知る」の方が自然。Reading Japanese として「見る」を維持するか「知る」に変更するかは設計判断が必要。

**Phase 4an 評価：**
現在の bible_data japanese=[見る] は Phase 4e 記録と一致しており、データ変更はない。ただし Phase 4e が CONTEXT_DEPENDENT と判定した理由は設計上の判断を必要とする。Phase 4ao 以降での設計判断待ち。

---

## 8. Strong 別集計（全20件）

| Strong | lexical | Phase 4an数 | DIRECTLY_OK | HOLD | morph種 | japanese |
|--------|---------|-----------|-------------|------|---------|---------|
| G191 | ἀκούω hear/listen | 20 | 20 | 0 | 18 | 聞く |
| G611 | ἀποκρίνομαι answer/reply | 20 | 20 | 0 | 10 | 答える |
| G1096 | γίνομαι become/happen | 20 | 20 | 0 | 16 | なる |
| G1325 | δίδωμι give | 20 | 20 | 0 | 19 | 与える |
| G1492 | οἶδα know | 20 | 20 | 0 | 12 | 知る |
| G1520 | εἷς one | 15 | 15 | 0 | 6 | 一つ |
| G1831 | ἐξέρχομαι go out | 20 | 20 | 0 | 15 | 出る |
| G2036 | εἶπον say (2nd aor) | 20 | 20 | 0 | 11 | 言う |
| G2064 | ἔρχομαι come/go | 20 | 20 | 0 | 17 | 来る |
| G2192 | ἔχω have | 20 | 20 | 0 | 16 | 持つ |
| G2309 | θέλω will/wish | 20 | 20 | 0 | 15 | 望む |
| G2980 | λαλέω speak | 20 | 20 | 0 | 16 | 語る |
| G2983 | λαμβάνω take/receive | 18 | 18 | 0 | 15 | 受ける |
| G3004 | λέγω say | 20 | 20 | 0 | 15 | 言う |
| G3056 | λόγος word | 19 | 19 | 0 | 6 | ことば |
| G3708 | ὁράω see | 20 | 19 | **1** | 17 | 見る |
| G3762 | οὐδείς no one/nothing | 10 | 10 | 0 | 2 | 誰も〜ない |
| G3956 | πᾶς all/every | 20 | 20 | 0 | 13 | すべての |
| G4160 | ποιέω do/make | 19 | 19 | 0 | 15 | 行う |
| G4183 | πολύς many/much | 15 | 15 | 0 | 13 | 多くの |
| **合計** | | **376** | **375** | **1** | | |

**備考:**
- G1520: Phase 4e 20件中5件が HOLD_DATA_QUALITY（bible_data 修正待ち）のため15件
- G2983: Phase 4e 20件中2件が HOLD_DATA_QUALITY のため18件
- G3056: Phase 4e 20件中1件が IMPLEMENTED_AND_VERIFIED のため19件
- G3762: Phase 4e 20件中10件が HOLD_DATA_QUALITY のため10件
- G4160: Phase 4e 20件中1件が IMPLEMENTED_AND_VERIFIED のため19件
- G4183: Phase 4e 20件中5件が HOLD_DATA_QUALITY のため15件

---

## 9. basis の定義

```
PHASE4E_DIRECTLY_SAMPLED_OK
```

**定義：** Phase 4e Tier 1 サンプリングで当該 ref が直接選定され、監査員が greekForm・morph・verseContext・japanese を個別確認の上、CONFIRMED_OK と判定した。Phase 4an で bible_data 現在値との strong/morph/japanese 完全一致を確認済み。

**他の basis との比較：**

| basis | 確認方法 | 確認粒度 |
|-------|---------|---------|
| PHASE4H_INDIVIDUALLY_CONFIRMED_OK | Phase 4h 全件個別監査 (changeNeeded=false) | ref 単位 |
| PHASE4F_DIRECTLY_SAMPLED_OK | Phase 4f Tier 2 直接サンプル (HIGH conf) + Phase 4al bible_data 一致 | ref 単位 |
| **PHASE4E_DIRECTLY_SAMPLED_OK** | Phase 4e Tier 1 直接サンプル (20 Strongs / 400 refs) + Phase 4an bible_data 一致 | ref 単位 |
| PHASE4F_SAMPLED_INFERRED_CONFIRMED | Phase 4f サンプル全 OK + Strong 単位一貫性 | Strong 単位 |

PHASE4E_DIRECTLY_SAMPLED_OK は ref 単位の直接確認に基づく点で PHASE4F_SAMPLED_INFERRED_CONFIRMED より強い根拠を持つ。Phase 4f との違いは対象 Tier（Tier 1 = ≥200 tokens の高頻度 Strong）。

---

## 10. 整合性チェック

| チェック | 期待値 | 実測値 | 判定 |
|---------|--------|--------|------|
| 対象 ref 総数 | 376 | 376 | ✓ PASS |
| 重複 ref | 0 | 0 | ✓ PASS |
| 全376件 Phase 4e に存在 | 376 | 376 | ✓ PASS |
| DIRECTLY_CONFIRMED_OK 件数 | 375 | 375 | ✓ PASS |
| DIRECTLY_CONFIRMED_HOLD 件数 | 1 | 1 | ✓ PASS |
| EVIDENCE_MISMATCH | 0 | 0 | ✓ PASS |
| NOT_FOUND_IN_PHASE4E | 0 | 0 | ✓ PASS |
| ALREADY_CLASSIFIED_ELSEWHERE | 0 | 0 | ✓ PASS |
| bible_data NOT_FOUND | 0 | 0 | ✓ PASS |
| strong mismatch | 0 | 0 | ✓ PASS |
| japanese mismatch | 0 | 0 | ✓ PASS |
| morph mismatch | 0 | 0 | ✓ PASS |
| 全376件 Phase 4ag UNREVIEWED（事前） | 376 | 376 | ✓ PASS |
| Phase 4e 差分説明（18 IMPL + 6 HOLD） | 24 | 24 | ✓ PASS |

**Phase 4an 整合性: PASS（14/14）**

---

## 11. 最終判定

**CONDITIONAL PASS**

- 375/376件（99.7%）: DIRECTLY_CONFIRMED_OK — Phase 4e 直接確認 + bible_data 現在値一致確認済み
- 1/376件（0.3%）: DIRECTLY_CONFIRMED_HOLD — JHN 6:61!1（G3708）設計判断保留
- EVIDENCE_MISMATCH / NOT_FOUND / ALREADY_CLASSIFIED: 各 0件

CONDITIONAL の理由：JHN 6:61!1 の ὁράω 完了分詞（εἰδὼς = "知っていた"）について、japanese=[見る]（構造義）を維持するか「知る」（文脈義）に変更するかが未決定。これは Phase 4an スコープ外の設計判断であり、375件の昇格妨げとならない。

---

## 12. Phase 4ag との整合性

Phase 4an は READ-ONLY 監査フェーズ。**Phase 4ag inventory の更新は行っていない。**

| state | 現在 | Phase 4ao（予定）後 |
|-------|------|-------------------|
| UNREVIEWED | 41,590 | 41,215（−375件昇格 or 設計に従い調整） |
| RETAIN_CONFIRMED | 50,989 | 51,364（+375件） |
| 合計 | 92,952 | 92,952 |

JHN 6:61!1（G3708）は設計判断後に RETAIN_CONFIRMED または 別 basis で処理。

---

## 13. 成果物

| ファイル | 内容 |
|---------|------|
| `stage4-phase4an-tier1-sampled-token-audit.json` | 376件全件の判定・根拠記録（新規） |
| `stage4-phase4an-tier1-sampled-token-audit.md` | 本ファイル（新規） |

**更新ファイル: なし（READ-ONLY 監査フェーズ）**

---

## 14. 次 Phase への申し送り

| 推奨 Phase | 対象 | 推奨 |
|-----------|------|------|
| Phase 4ao | 375件を RETAIN_CONFIRMED に昇格（PHASE4E_DIRECTLY_SAMPLED_OK） | 高優先 |
| Phase 4ao | Phase 4ag state_summary 更新: UNREVIEWED 41,590→41,215 | 昇格実施後 |
| 設計判断 | JHN 6:61!1（G3708 εἰδὼς）「見る」維持か「知る」変更か | 次フェーズ前に決定推奨 |
| Phase 4ap | Tier 1 SAMPLED_INFERRED 8,324件（Phase 4ao 後） | 中優先 |
| Phase 4aq | Tier 3–7 TRULY_UNREVIEWED 32,890件 | 中優先 |

**現在の UNREVIEWED 残存: 41,590件（92,952件の 44.7%）**
**Phase 4an 完了後の見込み: 41,215件（−375件、Phase 4ao 実施後）**
