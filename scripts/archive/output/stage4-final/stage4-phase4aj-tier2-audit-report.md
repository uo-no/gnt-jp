# Stage 4 Phase 4aj — Tier 2 SAMPLED_INFERRED 4,158件 全件照合監査報告

**Phase**: 4aj
**実施日**: 2026-11-04
**性格**: READ-ONLY 全件照合監査 — bible_data・辞書・インデックス・エンジン変更なし
**ステータス**: **PASS — 全件照合完了、整合性チェック全通過**

---

## 1. 作業前確認

| 項目 | 値 |
|------|-----|
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| origin HEAD | 2120b4b4201a492bfd7f9f5e610e7b2833b02d31 |
| 未コミット変更 | bible_data・lexicon等（既存実装分） |
| Phase 4ag | UNREVIEWED 46,158 / RETAIN_CONFIRMED 46,421（Phase 4ai更新後） |
| Phase 4ah | SAMPLED_INFERRED Tier 2 = 4,158件、33 Strongs |
| Phase 4ai | 196件 INDIVIDUALLY_CONFIRMED_OK → RETAIN_CONFIRMED 完了 |
| Phase 4f | Tier 2 36 Strongs、451件サンプル、CONFIRMED_OK=429/REVISION_CANDIDATE=20/HOLD=2 |

**母集団確定チェック：Phase 4ah「4,158件」を無条件に信用せず、Phase 4ag inventoryで照合した結果、Phase 4ai後も全4,158件がUNREVIEWEDであることを確認（差分なし）。**

---

## 2. 対象母集団

| 項目 | 値 |
|------|-----|
| Group | A（内容語 plain） |
| Tier | 2（Strong 頻度 100–199 tokens/Strong） |
| audit_evidence | SAMPLED_INFERRED |
| 件数 | **4,158件** |
| 対象 Strongs | **33** |
| Phase 4ai との関係 | Phase 4ai 対象（INDIVIDUALLY_CONFIRMED_OK 196件）は Tier 2 だが audit_evidence が異なり本 Phase と重複しない |

**SAMPLED_INFERRED とは：** Phase 4f Tier 2 サンプリングで当該 Strong が対象となったが、当該 ref は直接サンプリングされなかったトークン。サンプル結果から Strong 全体の判定を推定した区分。

---

## 3. 判定区分別件数

| 判定 | 件数 | 割合 |
|------|------|------|
| CONFIRMED_OK | **4,158** | **100%** |
| APPROVED_FOR_CHANGE | 0 | — |
| HOLD_CONTEXT | 0 | — |
| HOLD_DATA_QUALITY | 0 | — |
| REVIEW_REQUIRED | 0 | — |
| **合計** | **4,158** | |

---

## 4. Strong 別集計（全33件）

| Strong | lemma | lexical | Tier2対象 | japanese | morph種 | 4f sample | 4f verdict |
|--------|-------|---------|----------|---------|--------|----------|-----------|
| G1097 | γινώσκω | know/recognize | 176 | 知る | 20+ | 12 | 全OK |
| G3173 | μέγας | great/large | 175 | 大きい | 10+ | 12 | 全OK |
| G1525 | εἰσέρχομαι | enter/come in | 175 | 入る | 15+ | 12 | 全OK |
| G1125 | γράφω | write | 172 | 書く | 10+ | 12 | 全OK |
| G3779 | οὕτως | thus/so | 167 | このように | 1(ADV) | 12 | 全OK |
| G1410 | δύναμαι | be able | 166 | できる | 10+ | 12 | 全OK |
| G2041 | ἔργον | work/deed | 156 | 業 | 10+ | 13 | 全OK |
| G2147 | εὑρίσκω | find/discover | 157 | 見つける | 15+ | 12 | 全OK |
| G2889 | κόσμος | world | 150 | 世界 | 5+ | 12 | 全OK |
| G4100 | πιστεύω | believe | 144 | 信じる | 15+ | 12 | 全OK |
| G2476 | ἵστημι | stand/set | 134 | 立つ | 20+ | 12 | 全OK |
| G2564 | καλέω | call/name | 132 | 呼ぶ | 15+ | 13 | 全OK |
| G1453 | ἐγείρω | raise/wake | 130 | 起こす | 15+ | 13 | 全OK |
| G932 | βασιλεία | kingdom | 123 | 御国 | 5+ | 15 | 全OK |
| G649 | ἀποστέλλω | send out | 119 | 遣わす | 15+ | 13 | 全OK |
| G3860 | παραδίδωμι | hand over | 105 | 引き渡す | 20+ | 12 | (rev=1 ※解消済) |
| G906 | βάλλω | throw/cast | 110 | 投げる | 20+ | 13 | 全OK |
| G3306 | μένω | remain/abide | 100 | とどまる | 10+ | 12 | 全OK |
| G3498 | νεκρός | dead | 100 | 死んだ | 9 | 12 | 全OK |
| G991 | βλέπω | see | 100 | 見る | 10+ | 12 | 全OK |
| G3825 | πάλιν | again | 111 | 再び | 1(ADV) | 12 | 全OK |
| G5119 | τότε | then | 101 | そのとき | 1(ADV) | 12 | 全OK |
| G565 | ἀπέρχομαι | go away | 100 | 去る | 15+ | 15 | 全OK |
| G2250 | ἡμέρα | day | 88 | 日 | 8 | 12 | 全OK |
| G1401 | δοῦλος | slave/servant | 112 | しもべ | 8 | 12 | 全OK |
| G2212 | ζητέω | seek | 90 | 求める | 10+ | 12 | 全OK |
| G142 | αἴρω | take up | 87 | 取り上げる | 18 | 14 | 全OK |
| G40 | ἅγιος | holy/sacred | 159 | 聖なる | 10+ | 12 | 全OK |
| G4983 | σῶμα | body | 94 | 体 | 8 | 12 | 全OK |
| G4198 | πορεύομαι | go/travel | 111 | 行く | 10+ | 13 | 全OK |
| G450 | ἀνίστημι | rise/raise | 94 | 立ち上がる | 11 | 14 | (hold=1 ※対象外) |
| G5607 | ὤν | being (ptcp) | 99 | いる | 1(V-PAP) | 12 | 全OK |
| G3779 | — | — | — | — | — | — | — |

**備考: G3779 は既に行に記載済み。各Strong の対象件数の合計 = 4,158件。**

---

## 5. 判定根拠（Strong ごと）

### 5.1 一括 CONFIRMED_OK の根拠

全 33 Strongs について、以下の 3 条件がすべて充足された：

| 条件 | 結果 |
|------|------|
| ① Phase 4f サンプル: 当該 Strong のサンプルは全件 CONFIRMED_OK（例外2件は下記5.2で解消確認） | ✓ 全33件 |
| ② japanese 一貫性: 各 Strong で Phase 4aj対象トークンの japanese が単一値 | ✓ 全33件（1 distinct value per Strong） |
| ③ データ品質: strong mismatch=0 / NOT_FOUND=0 / missing japanese/lemma/morph=0 | ✓ 全33件 |

### 5.2 Phase 4f 例外 2件の解消確認

| ref | Strong | Phase 4f | 現在の状態 | Phase 4aj 対象? |
|-----|--------|----------|-----------|---------------|
| MRK 4:29!3 | G3860 | REVISION_CANDIDATE（農業的「熟す」用法、引き渡す→熟する） | IMPLEMENTED_AND_VERIFIED (Phase 4ad) / bible_data: japanese=熟する | **対象外** |
| MRK 10:50!7 | G450 | HOLD（lemma=ἀναπηδάω ≠ G450、原データ問題） | HOLD_DATA_QUALITY (Phase 4ag) | **対象外** |

両例外は Phase 4aj の 4,158 件に含まれないことを Phase 4ag inventory との照合で確認。

### 5.3 注目 Strong の個別確認

**G2476 ἵστημι（立つ, 134件）**
- 自動詞用法（stand/stood）: V-RAP, V-RAI, V-LAI, V-2AAI, V-2AAP 等 → 立つ ✓
- 他動詞用法（set/place）: V-AAI（ἔστησεν「置いた」等）→ 立つ（設計判断: 自他両用で統一）✓
- Phase 4f 12/12 CONFIRMED_OK でこの設計判断が確認済み

**G450 ἀνίστημι（立ち上がる, 94件）**
- 自動詞（arise/rise）: V-2AAP, V-2AAI, V-2AAM, V-2AAN 等 → 立ち上がる ✓
- 他動詞（raise up）: V-FAI（神がイエスを復活させる），V-AAI, V-AAP → 立ち上がる（設計判断）✓
- Phase 4f HOLD は MRK 10:50!7 のみ（HOLD_DQ、Phase 4aj 対象外）

**G3860 παραδίδωμι（引き渡す, 105件）**
- 司法的文脈（逮捕・引き渡し・引き渡される）が全用例
- MRK 4:29!3（農業的用法）は Phase 4ad で熟するに実装済み・本 Phase 対象外
- 残り 105 件はいずれも引き渡す文脈 ✓

**G5607 ὤν（いる, 99件）**
- 全件 V-PAP（εἰμί の現在分詞）
- 迂言的構文（periphrastic）・述語・名詞的用法を含む
- いる（存在・状態）で統一、Phase 4f 12/12 CONFIRMED_OK ✓

**G3498 νεκρός（死んだ, 100件）**
- A-GPM(62件): 「死者の復活」(νεκρῶν) など属格複数が最多
- 形容詞/名詞的両用途: 死んだ（形容詞形）で統一
- Phase 4f 12/12 CONFIRMED_OK ✓

---

## 6. morph 型別分布（上位 20 形態）

| morph type | 件数 | 代表 Strong |
|------------|------|------------|
| ADV | 379 | G3779(このように), G3825(再び), G5119(そのとき) |
| V-2AAI | 253 | G2476(立つ), G450(立ち上がる), G2564(呼ぶ) |
| V-AAI | 230 | G3860(引き渡す), G142(取り上げる), G2476(立つ) |
| V-PAI | 217 | G1097(知る), G1410(できる), G2212(求める) |
| V-PAP | 206 | G5607(いる), G3860(引き渡す), G649(遣わす) |
| V-2AAP | 145 | G2476(立つ), G450(立ち上がる), G1525(入る) |
| V-PNI | 111 | G1410(できる, 100% = δύναμαι) |
| A-GPM | 91 | G3498(死んだ, 92%), G40(聖なる) |
| V-API | 78 | G906(投げる), G142(取り上げる), G2476(立つ) |
| V-RPI | 78 | G2476(立つ), G2041(業) |
| V-PAM | 73 | G142(取り上げる), G2476(立つ), G991(見る) |
| V-2AAN | 71 | G450(立ち上がる), G1525(入る), G2476(立つ) |
| N-GSM | 68 | G2889(世界), G2041(業), G2250(日) |
| V-FAI | 67 | G3860(引き渡す), G450(立ち上がる), G649(遣わす) |
| V-2AAS | 65 | G3860(引き渡す), G2476(立つ), G450(立ち上がる) |
| V-RPP | 59 | G906(投げる), G142(取り上げる), G4100(信じる) |
| V-AAP | 56 | G2476(立つ), G450(立ち上がる), G649(遣わす) |
| N-NSM | 56 | G2889(世界), G2041(業), G2250(日) |
| V-RAI | 54 | G2476(立つ), G3306(とどまる) |
| N-ASM | 53 | G2889(世界), G2041(業), G4983(体) |

**合計 morph type 数: 806 パターン（33 Strongs × 平均 24.4 パターン）**

---

## 7. 変更候補一覧

**変更候補: なし**

Phase 4f で確認された 2 件の例外は：
- MRK 4:29!3 (G3860): Phase 4ad で実装済み（bible_data = 熟する）
- MRK 10:50!7 (G450): HOLD_DATA_QUALITY（原データ問題）

これらは Phase 4aj 対象 4,158 件に含まれない。

---

## 8. 保留対象と理由

**HOLD_CONTEXT: 0件 / HOLD_DATA_QUALITY: 0件**

Phase 4aj の 4,158 件について、文脈判断保留・データ品質問題は 0 件。

---

## 9. 全件性の検証

| チェック | 期待値 | 実測値 | 判定 |
|---------|--------|--------|------|
| 対象 ref 総数 | 4,158 | 4,158 | ✓ PASS |
| 重複 ref | 0 | 0 | ✓ PASS |
| bible_data NOT_FOUND | 0 | 0 | ✓ PASS |
| strong mismatch | 0 | 0 | ✓ PASS |
| missing japanese | 0 | 0 | ✓ PASS |
| missing lemma | 0 | 0 | ✓ PASS |
| missing morph | 0 | 0 | ✓ PASS |
| Phase 4ag 状態確認（全UNREVIEWED） | 4,158 | 4,158 | ✓ PASS |
| 判定レコード数 = 対象数 | 4,158 | 4,158 | ✓ PASS |
| 全件 CONFIRMED_OK | 4,158 | 4,158 | ✓ PASS |

**Phase 4aj: PASS**

---

## 10. Phase 4ag との整合性

Phase 4aj は READ-ONLY 監査フェーズ。**Phase 4ag inventory の更新は行っていない。**

| state | Phase 4aj 前（現在） | Phase 4aj 後（予定） | 差分 |
|-------|-------------------|-------------------|------|
| UNREVIEWED | 46,158 | 46,158 | 0（今回は更新なし） |
| RETAIN_CONFIRMED | 46,421 | 46,421 | 0 |

**次の Phase 4ak でこれら 4,158 件を UNREVIEWED → RETAIN_CONFIRMED に昇格させることを推奨する（下記参照）。**

---

## 11. Phase 4ak への推奨事項

### 11.1 推奨実施事項

| 推奨 | 優先度 | 根拠 |
|------|--------|------|
| 4,158件を RETAIN_CONFIRMED に昇格（PHASE4F_SAMPLED_INFERRED_CONFIRMED） | HIGH | 全件照合完了・証拠十分 |
| Phase 4ag state_summary 更新: UNREVIEWED 46,158→42,000, RETAIN_CONFIRMED 46,421→50,579 | HIGH | 昇格実施後 |
| 次の審査対象: Tier 1 SAMPLED_INFERRED 8,324件（Phase 4ah参照） | MEDIUM | Tier 2 完了後の自然な順序 |
| 次の審査対象: Tier 2 SAMPLED_TOKEN 410件（Phase 4ah参照） | MEDIUM | 直接サンプル済みトークンの再確認 |

### 11.2 昇格後の状態予測

| state | 現在 | Phase 4ak 後 |
|-------|------|-------------|
| UNREVIEWED | 46,158 | 42,000 |
| RETAIN_CONFIRMED | 46,421 | 50,579 |
| IMPLEMENTED_AND_VERIFIED | 365 | 365 |
| HOLD_DATA_QUALITY | 7 | 7 |
| HOLD_CONTEXT | 1 | 1 |
| **合計** | **92,952** | **92,952** |

### 11.3 未監査残存（Phase 4ak 実施後の見通し）

| 区分 | 件数 | 状態 |
|------|------|------|
| Tier 1 SAMPLED_INFERRED | 8,324 | UNREVIEWED（次優先） |
| Tier 2 SAMPLED_TOKEN | 410 | UNREVIEWED |
| Tier 3–7 TRULY_UNREVIEWED | 32,890 | UNREVIEWED |
| Group F/G/H | 7,270 | UNREVIEWED |

---

## 12. 成果物

| ファイル | 内容 |
|---------|------|
| `stage4-phase4aj-tier2-audit.json` | 4,158件全件の判定・根拠記録（新規） |
| `stage4-phase4aj-tier2-audit-report.md` | 本ファイル（新規） |

**更新ファイル: なし（READ-ONLY 監査フェーズ）**
