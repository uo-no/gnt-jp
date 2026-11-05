# Stage 4 Phase 4al — SAMPLED_TOKEN 410件 監査証拠照合報告

**Phase**: 4al
**実施日**: 2026-11-04
**性格**: READ-ONLY 監査証拠照合 — bible_data・辞書・インデックス・エンジン変更なし
**ステータス**: **PASS — 全件照合完了、整合性チェック全通過**

---

## 1. 作業前確認

| 項目 | 値 |
|------|-----|
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| origin HEAD | 2120b4b4201a492bfd7f9f5e610e7b2833b02d31 |
| Phase 4ag 状態（現在） | UNREVIEWED=42,000 / RETAIN_CONFIRMED=50,579 |
| Phase 4aj 完了 | Tier 2 SAMPLED_INFERRED 4,158件 → RETAIN_CONFIRMED |
| Phase 4ak 完了 | Phase 4aj 4,158件を台帳に反映 |
| Phase 4al 対象 | Tier 2 SAMPLED_TOKEN（Phase 4f 直接サンプル済み ref） |

---

## 2. 対象母集団の再構成

**410という数字を前提にせず、現在の inventory と元の監査記録から再構成した結果：**

| 派生元 | 条件 | 件数 |
|--------|------|------|
| Phase 4ah tokens | tier=2 AND audit_evidence=SAMPLED_TOKEN | 410 |
| Phase 4ag 状態確認 | 全410件が UNREVIEWED であること | 410（差分なし） |
| Phase 4f サンプル照合 | 全410件が Phase 4f サンプルに存在すること | 410（差分なし） |
| Phase 4f verdict 確認 | 全410件が CONFIRMED_OK であること | 410（差分なし） |

**対象母集団: 410件（確定）**

---

## 3. SAMPLED_TOKEN の位置づけ

| 区分 | 意味 | 件数（Tier 2） |
|------|------|--------------|
| SAMPLED_TOKEN | Phase 4f で当該 ref が直接サンプリングされ、per-ref 判定を受けた | **410件（本 Phase）** |
| SAMPLED_INFERRED | Phase 4f で当該 Strong が対象だったが ref 自体は未サンプリング | 4,158件（Phase 4aj/4ak 済） |
| INDIVIDUALLY_CONFIRMED_OK | Phase 4h で changeNeeded=false を ref 単位で確認 | 196件（Phase 4ai 済） |

SAMPLED_TOKEN は「強い証拠」：Phase 4f 監査員が当該 ref の greekForm・morph・verseContext・japanese を直接確認し HIGH confidence で CONFIRMED_OK を与えた。

---

## 4. 判定区分別件数

| 判定 | 件数 | 割合 |
|------|------|------|
| CONFIRMED_OK | **410** | **100%** |
| APPROVED_FOR_CHANGE | 0 | — |
| HOLD_CONTEXT | 0 | — |
| HOLD_DATA_QUALITY | 0 | — |
| REVIEW_REQUIRED | 0 | — |
| **合計** | **410** | |

---

## 5. 照合根拠（3条件）

| 条件 | 結果 |
|------|------|
| ① Phase 4f verdict: 全410件が CONFIRMED_OK | ✓ 410/410 |
| ② Phase 4f confidence: 全410件が HIGH | ✓ 410/410 |
| ③ japanese 一致: bible_data の現在値 = Phase 4f 記録値 | ✓ 410/410（mismatch=0） |

追加確認:
- strong mismatch: 0件
- NOT_FOUND in bible_data: 0件
- strong mismatch in Phase 4ag vs bible_data: 0件

---

## 6. Phase 4f サンプリング設計との照合

Phase 4f は 4ゾーン（Morphology-Zone）から各 Strong を 12–15件サンプリング:

| Zone | 件数 | 意味 |
|------|------|------|
| I（高頻度 morph、高頻度 Strong） | 148 | 最代表的用例 |
| II（高頻度 morph、低頻度 Strong） | 100 | morph 多様性 |
| III（低頻度 morph、高頻度 Strong） | 67 | 周辺的形態 |
| IV（低頻度 morph、低頻度 Strong） | 95 | エッジケース |

Zone I〜IV すべてをカバーしており、サンプリング設計上の代表性が確保されている。

---

## 7. Strong 別集計（全33件）

| Strong | lexical | 件数 | japanese | morph種 | 4f sample | zone alloc |
|--------|---------|------|---------|--------|----------|-----------|
| G932 | βασιλεία kingdom | 15 | 御国 | 3 | 15 | I:5,II:3,III:3,IV:4 |
| G565 | ἀπέρχομαι go away | 15 | 去る | 8 | 15 | I:5,II:4,III:4,IV:2 |
| G142 | αἴρω take up | 14 | 取り上げる | 8 | 14 | I:5,II:4,III:2,IV:3 |
| G450 | ἀνίστημι rise/raise | 13 | 立ち上がる | 9 | 14 | — |
| G1453 | ἐγείρω raise/wake | 13 | 起こす | 10 | 13 | I:4,II:3,III:3,IV:3 |
| G4198 | πορεύομαι go/travel | 13 | 行く | 8 | 13 | I:4,II:4,III:3,IV:2 |
| G906 | βάλλω throw/cast | 13 | 投げる | 10 | 13 | I:4,II:4,III:2,IV:3 |
| G649 | ἀποστέλλω send out | 13 | 遣わす | 9 | 13 | I:4,II:4,III:2,IV:3 |
| G2041 | ἔργον work/deed | 13 | 業 | 8 | 13 | I:5,II:3,III:2,IV:3 |
| G2564 | καλέω call/name | 13 | 呼ぶ | 8 | 13 | I:5,II:4,III:2,IV:2 |
| G3779 | οὕτως thus/so | 12 | このように | 1(ADV) | 12 | I:4,II:4,III:2,IV:2 |
| G3825 | πάλιν again | 12 | 再び | 1(ADV) | 12 | I:4,II:4,III:2,IV:2 |
| G1410 | δύναμαι be able | 12 | できる | 7 | 12 | I:4,II:4,III:2,IV:2 |
| G243 | ἄλλος other | 12 | 他の | 6 | 12 | I:4,II:4,III:2,IV:2 |
| G5607 | ὤν being (ptcp) | 12 | いる | 1(V-PAP) | 12 | I:4,II:4,III:2,IV:2 |
| G3498 | νεκρός dead | 12 | 死んだ | 5 | 12 | I:4,II:4,III:2,IV:2 |
| G2147 | εὑρίσκω find | 12 | 見つける | 9 | 12 | I:5,II:4,III:2,IV:1 |
| G1525 | εἰσέρχομαι enter | 12 | 入る | 7 | 12 | I:4,II:4,III:2,IV:2 |
| G991 | βλέπω see | 12 | 見る | 7 | 12 | I:4,II:4,III:2,IV:2 |
| G2476 | ἵστημι stand/set | 12 | 立つ | 11 | 12 | I:4,II:4,III:2,IV:2 |
| G2889 | κόσμος world | 12 | 世界 | 5 | 12 | I:4,II:4,III:2,IV:2 |
| G4100 | πιστεύω believe | 12 | 信じる | 8 | 12 | I:4,II:4,III:2,IV:2 |
| G1401 | δοῦλος slave/servant | 12 | しもべ | 5 | 12 | I:4,II:4,III:2,IV:2 |
| G2212 | ζητέω seek | 12 | 求める | 7 | 12 | I:4,II:4,III:2,IV:2 |
| G5119 | τότε then | 12 | そのとき | 1(ADV) | 12 | I:4,II:4,III:2,IV:2 |
| G2250 | ἡμέρα day | 12 | 日 | 7 | 12 | I:4,II:4,III:2,IV:2 |
| G1097 | γινώσκω know | 12 | 知る | 7 | 12 | I:5,II:3,III:2,IV:2 |
| G3173 | μέγας great | 12 | 大きい | 7 | 12 | I:4,II:4,III:2,IV:2 |
| G40 | ἅγιος holy/sacred | 12 | 聖なる | 6 | 12 | I:3,II:4,III:3,IV:2 |
| G1125 | γράφω write | 12 | 書く | 7 | 12 | I:4,II:4,III:2,IV:2 |
| G4983 | σῶμα body | 12 | 体 | 7 | 12 | I:4,II:4,III:2,IV:2 |
| G3306 | μένω remain | 12 | とどまる | 8 | 12 | I:5,II:3,III:2,IV:2 |
| G3860 | παραδίδωμι hand over | 11 | 引き渡す | 10 | 12 | — |
| **合計** | | **410** | | | | |

**備考: G450は14件サンプルのうちMRK 10:50!7（HOLD_DATA_QUALITY）が除外され13件。G3860は12件サンプルのうちMRK 4:29!3（IMPLEMENTED_AND_VERIFIED, Phase 4ad）が除外され11件。**

---

## 8. morph 型別分布（上位 15 形態）

| morph type | 件数 | 代表例 |
|------------|------|--------|
| ADV | 36 | G3779(このように), G3825(再び), G5119(そのとき) |
| V-PAI | 27 | G1410(できる), G2212(求める), G2889(世界以外の活用) |
| V-PAP | 26 | G5607(いる), G3860(引き渡す), G649(遣わす) |
| V-AAI | 26 | G3860(引き渡す), G142(取り上げる), G2564(呼ぶ) |
| V-2AAI | 21 | G450(立ち上がる), G2476(立つ), G565(去る) |
| V-2AAP | 13 | G450(立ち上がる), G2476(立つ), G1525(入る) |
| A-GPM | 11 | G3498(死んだ), G40(聖なる) |
| N-NSF | 9 | G2250(日), G932(御国), G2889(世界) |
| V-PAM | 9 | G142(取り上げる), G991(見る), G906(投げる) |
| V-2AAS | 9 | G3860(引き渡す), G450(立ち上がる), G2476(立つ) |
| V-PNI | 8 | G1410(できる) |
| V-AAM | 8 | G142(取り上げる), G649(遣わす), G906(投げる) |
| N-ASF | 7 | G2250(日), G932(御国) |
| V-FAI | 7 | G3860(引き渡す), G450(立ち上がる), G649(遣わす) |
| N-ASN | 7 | G2041(業), G4983(体), G2889(世界) |

---

## 9. basis の定義

```
PHASE4F_DIRECTLY_SAMPLED_OK
```

**定義：** Phase 4f Tier 2 サンプリングで当該 ref が直接選定され、監査員が greekForm・morph・verseContext・japanese を個別確認の上、CONFIRMED_OK / confidence=HIGH と判定した。Phase 4al で bible_data 現在値との一致を確認済み。

**他の basis との比較：**

| basis | 確認方法 | 確認粒度 |
|-------|---------|---------|
| PHASE4H_INDIVIDUALLY_CONFIRMED_OK | Phase 4h 全件個別監査 (changeNeeded=false) | ref 単位 |
| **PHASE4F_DIRECTLY_SAMPLED_OK** | Phase 4f サンプル（per-ref 判定、HIGH confidence）+ Phase 4al bible_data 一致確認 | ref 単位 |
| PHASE4F_SAMPLED_INFERRED_CONFIRMED | Phase 4f サンプル全 OK + Strong 単位一貫性 | Strong 単位 |
| PHASE4B_AUDITED | Phase 4b Group B/D 照合 | Group 単位 |

PHASE4F_DIRECTLY_SAMPLED_OK は ref 単位の確認に基づく点で PHASE4F_SAMPLED_INFERRED_CONFIRMED より強い根拠を持つ。ただし Phase 4h の changeNeeded チェックほどの網羅性はない。

---

## 10. 全件性の検証

| チェック | 期待値 | 実測値 | 判定 |
|---------|--------|--------|------|
| 対象 ref 総数 | 410 | 410 | ✓ PASS |
| 重複 ref | 0 | 0 | ✓ PASS |
| Phase 4f サンプルに存在 | 410 | 410 | ✓ PASS |
| Phase 4f verdict = CONFIRMED_OK | 410 | 410 | ✓ PASS |
| Phase 4f confidence = HIGH | 410 | 410 | ✓ PASS |
| bible_data NOT_FOUND | 0 | 0 | ✓ PASS |
| strong mismatch | 0 | 0 | ✓ PASS |
| japanese 一致 | 410 | 410 | ✓ PASS |
| Phase 4ag UNREVIEWED 確認（現在） | 410 | 410 | ✓ PASS |

**Phase 4al: PASS（9/9）**

---

## 11. Phase 4ag との整合性

Phase 4al は READ-ONLY 監査フェーズ。**Phase 4ag inventory の更新は行っていない。**

| state | 現在 | Phase 4am（予定）後 |
|-------|------|-------------------|
| UNREVIEWED | 42,000 | 41,590 |
| RETAIN_CONFIRMED | 50,579 | 50,989 |
| 合計 | 92,952 | 92,952 |

---

## 12. 成果物

| ファイル | 内容 |
|---------|------|
| `stage4-phase4al-sampled-token-audit.json` | 410件全件の判定・根拠記録（新規） |
| `stage4-phase4al-sampled-token-audit-report.md` | 本ファイル（新規） |

**更新ファイル: なし（READ-ONLY 監査フェーズ）**

---

## 13. Phase 4am への推奨事項

| 推奨 | 優先度 | 根拠 |
|------|--------|------|
| 410件を RETAIN_CONFIRMED に昇格（PHASE4F_DIRECTLY_SAMPLED_OK） | HIGH | 全件照合完了・証拠十分 |
| Phase 4ag state_summary 更新: UNREVIEWED 42,000→41,590, RETAIN_CONFIRMED 50,579→50,989 | HIGH | 昇格実施後 |
| 次の監査対象: Tier 1 SAMPLED_TOKEN 376件（Phase 4e サンプル） | MEDIUM | Phase 4al と同構造 |
| Tier 1 SAMPLED_INFERRED 8,324件 | MEDIUM | 大量だが Tier 2 と同手法で処理可能 |
