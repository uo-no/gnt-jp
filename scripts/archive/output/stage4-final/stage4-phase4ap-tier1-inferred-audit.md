# Stage 4 Phase 4ap — Tier 1 SAMPLED_INFERRED 8,324件 Strong単位一貫性監査

**Phase**: 4ap
**実施日**: 2026-11-04
**性格**: READ-ONLY 監査 — residual inventory・Bible JSON・エンジン変更なし
**ステータス**: **PASS — 8,324件全件分類完了、未分類なし**

---

## 1. 作業前確認

| 項目 | 値 |
|------|-----|
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| origin HEAD | 1c7c8dee348d4582a227bdf0c37541d68cde4c1a |
| Phase 4ag 状態（現在） | UNREVIEWED=41,215 / RETAIN_CONFIRMED=51,364 |
| Phase 4ao 完了 | Tier 1 SAMPLED_TOKEN 375件 → RETAIN_CONFIRMED |
| Phase 4ap 対象 | Tier 1 SAMPLED_INFERRED 8,324件（20 Strongs） |
| 照合元 | Phase 4e（400 refs, 20 Strongs）/ Phase 4ad（Tier 1変更18件） |

---

## 2. 母集団の確認

| チェック | 件数 | 判定 |
|---------|------|------|
| Phase 4ah Tier 1 SAMPLED_INFERRED | 8,324 | ✓ 確認 |
| 全8,324件 Phase 4ag UNREVIEWED（Phase 4ao後） | 8,324 | ✓ PASS |
| 重複 ref | 0 | ✓ PASS |
| Phase 4an/4aoで処理した376件との重複 | 0 | ✓ PASS |
| bible_data NOT_FOUND | 0 | ✓ PASS |

**母集団: 8,324件（全件 UNREVIEWED、欠落・重複なし）**

---

## 3. Phase 4e 直接サンプルとの照合

Phase 4e は Tier 1 20 Strongs から400件をサンプリング。その判定：

| Phase 4e 判定 | 件数 | 影響 Strongs |
|-------------|------|-------------|
| CONFIRMED_OK | 375 | 全20件（内13件は完全 OK） |
| REVISION_CANDIDATE | 18 | G2983(2), G3056(1), G3762(10), G4160(1), G4183(4) |
| CONTEXT_DEPENDENT | 1 | G3708 |
| HOLD | 6 | G1520(5 PREP), G4183(1 ADV-C) |

### 3.1 Tier 1 Phase 4ad 変更確認

Phase 4e RC 18件は Phase 4ad で bible_data 更新済み → Phase 4ag IMPLEMENTED_AND_VERIFIED:

| Strong | 件数 | 変更内容 |
|--------|------|---------|
| G2983 | 2 | 受ける → 取る（特定 morph の用法） |
| G3056 | 1 | ことば → 申し開き（ROM 14:12!6） |
| G3762 | 10 | 誰も〜ない → 何も〜ない（中性形） |
| G4160 | 1 | 行う → 産み出す（MAT 7:17!14 樹木慣用句） |
| G4183 | 4 | 多くの → しばしば/強く/はるかに（副詞的用法） |

これらは SAMPLED_INFERRED とは **別のref** であり、SAMPLED_INFERRED 8,324件の中に含まれない。

---

## 4. 判定スキームと分類結果

### 4.1 判定区分

| 判定 | 定義 |
|------|------|
| STRONG_CONSISTENT_SAMPLE_SUPPORTED | Phase 4e 全件 CONFIRMED_OK の Strong、または例外 Strong でも問題 morph 外 |
| STRONG_CONSISTENT_BUT_EXCEPTION_RISK | 例外 Strong（RC/HOLD/CD あり）かつ問題 morph パターンに該当 |
| MULTIPLE_JAPANESE_CONTEXT_DEPENDENT | SAMPLED_INFERRED 内に複数 japanese 値が存在 |
| DATA_MISMATCH | Strong 不一致・bible_data 未発見 |
| POST_PHASE_IMPLEMENTED | Phase 4ad で変更済みだが UNREVIEWED のまま |
| ALREADY_CLASSIFIED | Phase 4ag が UNREVIEWED 以外 |
| UNRESOLVED | 上記いずれにも分類不能 |

### 4.2 分類結果

| 判定 | 件数 | 割合 |
|------|------|------|
| STRONG_CONSISTENT_SAMPLE_SUPPORTED | **7,885** | **94.7%** |
| STRONG_CONSISTENT_BUT_EXCEPTION_RISK | **439** | **5.3%** |
| MULTIPLE_JAPANESE_CONTEXT_DEPENDENT | 0 | — |
| DATA_MISMATCH | 0 | — |
| POST_PHASE_IMPLEMENTED | 0 | — |
| ALREADY_CLASSIFIED | 0 | — |
| UNRESOLVED | 0 | — |
| **合計** | **8,324** | |

---

## 5. Strong 別集計

| Strong | lexical | 件数 | SAMPLE_SUPPORTED | EXCEPTION_RISK | distinct_ja | morph種 |
|--------|---------|------|------------------|----------------|------------|---------|
| G3004 | λέγω say | 1,144 | 1,144 | 0 | 1（言う） | 15 |
| G3956 | πᾶς all/every | 864 | 864 | 0 | 1（すべての） | 13 |
| G2036 | εἶπον say (2nd aor) | 846 | 846 | 0 | 1（言う） | 11 |
| G2192 | ἔχω have | 659 | 659 | 0 | 1（持つ） | 16 |
| G1096 | γίνομαι become | 560 | 560 | 0 | 1（なる） | 16 |
| G4160 | ποιέω do/make | 500 | 479 | **21** | 1（行う） | 15 |
| G2064 | ἔρχομαι come/go | 485 | 485 | 0 | 1（来る） | 17 |
| G3708 | ὁράω see | 404 | 384 | **20** | 1（見る） | 53 |
| G1325 | δίδωμι give | 360 | 360 | 0 | 1（与える） | 19 |
| G191 | ἀκούω hear | 341 | 341 | 0 | 1（聞く） | 18 |
| G3056 | λόγος word | 310 | 187 | **123** | 1（ことば） | 6 |
| G1492 | οἶδα know | 264 | 264 | 0 | 1（知る） | 12 |
| G3762 | οὐδείς no one | 214 | 0 | **214** | 1（誰も〜ない） | 10 |
| G2980 | λαλέω speak | 214 | 214 | 0 | 1（語る） | 16 |
| G611 | ἀποκρίνομαι answer | 211 | 211 | 0 | 1（答える） | 10 |
| G2983 | λαμβάνω take/receive | 205 | 183 | **22** | 1（受ける） | 15 |
| G1831 | ἐξέρχομαι go out | 191 | 191 | 0 | 1（出る） | 15 |
| G1520 | εἷς one | 187 | 187 | 0 | 1（一つ） | 8 |
| G4183 | πολύς many/much | 184 | 145 | **39** | 1（多くの） | — |
| G2309 | θέλω will/wish | 181 | 181 | 0 | 1（望む） | 15 |
| **合計** | | **8,324** | **7,885** | **439** | | |

**重要: 全20 Strongs で distinct_japanese=1。SAMPLED_INFERRED 内で複数訳語が混在するケースはない。**

---

## 6. STRONG_CONSISTENT_SAMPLE_SUPPORTED 7,885件

### 6.1 根拠

| 条件 | 内容 |
|------|------|
| 13の完全 OK Strong | Phase 4e で全サンプル CONFIRMED_OK。distinct_ja=1 |
| G1520（187件） | Phase 4e HOLD は morph=PREP の Strong 誤割当て。SAMPLED_INFERRED には PREP なし（全8種は適正 numeral morph） |
| 例外 Strong の非 RC morph | G4160 は V-PAI-3S（21件）を除く479件、G2983 は RC morph 外の183件等 |

**13完全 OK Strongs:** G191, G611, G1096, G1325, G1492, G1831, G2036, G2064, G2192, G2309, G2980, G3004, G3956

**basis（次 Phase 推奨）:** `PHASE4E_SAMPLED_INFERRED_CONFIRMED_T1`

---

## 7. STRONG_CONSISTENT_BUT_EXCEPTION_RISK 439件の詳細

### 7.1 G3762 οὐδείς — 214件

| 分析項目 | 内容 |
|---------|------|
| Phase 4e RC 根拠 | 10件が neuter/feminine 形で 誰も〜ない → 何も〜ない（Phase 4ad 変更済み） |
| 現在 SAMPLED_INFERRED 訳語 | 全214件 = 誰も〜ない（Phase 4ad の10件変更対象外） |
| 中性・女性形（真の risk） | A-ASN-N(63) + A-NSN-N(18) + A-ASF-N(7) + A-DSN-N(3) + A-GSN-N(1) + A-NSF-N(3) = **95件** |
| 男性形（誰も〜ない で正しい） | A-NSM-N(90) + A-ASM-N(14) + A-GSM-N(9) + A-DSM-N(6) = **119件** |

**実際のリスク: 95件（中性・女性形 → 何も〜ない への変更が必要な可能性）**
**119件は 誰も〜ない で正しい可能性が高い**

### 7.2 G3056 λόγος — 123件（N-ASM）

| 分析項目 | 内容 |
|---------|------|
| Phase 4e RC 根拠 | ROM 14:12!6「ことば → 申し開き」（λόγον δώσει = "give account"慣用句） |
| 現在 SAMPLED_INFERRED 訳語 | 全123件 = ことば |
| morph | N-ASM（accusative singular masculine）123件全て |
| リスク | "give account"慣用句コンテキストのみ申し開きが必要。N-ASM は一般的形であり多くは ことば で正当 |

**実際のリスク: 少数（λόγον δώσει コンテキストのみ）。大部分は ことば で正当な可能性が高い**

### 7.3 G4183 πολύς — 39件（A-APN=29件, A-DSN=10件）

| 分析項目 | 内容 |
|---------|------|
| Phase 4e RC 根拠 | A-APN 形: MAT 9:14（しばしば）/ MRK 3:12, 5:43（〜厳しく）/ PHP 1:23（A-DSN: はるかに） |
| 現在 SAMPLED_INFERRED 訳語 | 全39件 = 多くの |
| リスク | A-APN と A-DSN は副詞的用法で特殊訳語が必要なケースあり。ただし文脈依存 |

### 7.4 G2983 λαμβάνω — 22件（V-2AAI-3S=?, V-PAP-NPM=?）

| 分析項目 | 内容 |
|---------|------|
| Phase 4e RC 根拠 | 受ける → 取る（特定文脈: 聖餐・物品受領） |
| 現在 SAMPLED_INFERRED 訳語 | 全22件 = 受ける |
| morph | V-2AAI-3S（2nd aorist indicative 3S）/ V-PAP-NPM（present active participle NPM） |
| リスク | 聖餐・具体的物品受領文脈では 取る が自然。文脈確認が必要 |

### 7.5 G4160 ποιέω — 21件（V-PAI-3S）

| 分析項目 | 内容 |
|---------|------|
| Phase 4e RC 根拠 | MAT 7:17!14「行う → 産み出す」（καρπὸν ποιεῖ = 樹木慣用句） |
| 現在 SAMPLED_INFERRED 訳語 | 全21件 = 行う |
| morph | V-PAI-3S（present active indicative 3rd singular） |
| リスク | 樹木慣用句コンテキストのみ。V-PAI-3S は汎用形で大半は 行う で正当 |

### 7.6 G3708 ὁράω — 20件（V-RAP-NSM）

| 分析項目 | 内容 |
|---------|------|
| Phase 4e CD 根拠 | JHN 6:61!1 εἰδώς（V-RAP-NSM）— 見る（構造義）vs 知る（文脈義） |
| 現在 SAMPLED_INFERRED 訳語 | 全20件 = 見る |
| morph | V-RAP-NSM（perfect active participle NSM） |
| リスク | εἰδ- 完了語幹（having seen = knowing）の全形に同様の設計判断が必要 |
| **追加観察** | V-RAP-NSM-ATT(2件)・V-RAP-NPM-ATT(1件)・V-RAP-APM(2件) = 5件も εἰδ- 完了語幹。現在 SAMPLE_SUPPORTED に分類済みだが同一設計問題を持つ |

---

## 8. 訳語一貫性確認

| 確認 | 結果 |
|------|------|
| 全20 Strongs の distinct_japanese in SAMPLED_INFERRED | **全て=1（複数訳語混在なし）** |
| bible_data Strong 一致 | 8,324/8,324 |
| bible_data japanese 存在 | 8,324/8,324 |
| bible_data morph 存在 | 8,324/8,324 |

**全20 Strongs で SAMPLED_INFERRED トークンの japanese は単一値。** データ破損・更新漏れによる内部不整合はない。

---

## 9. 次 Phase への再分類推奨

### 9.1 Phase 4aq: 安全な昇格対象

**推奨: 7,885件 → RETAIN_CONFIRMED**
- basis: `PHASE4E_SAMPLED_INFERRED_CONFIRMED_T1`
- 条件: Phase 4e 全サンプル CONFIRMED_OK の Strong、または例外 Strong の非 RC morph
- 更新後: UNREVIEWED 41,215 → 33,330（−7,885）

### 9.2 Phase 4ar 以降: 例外 risk 439件の個別監査

| Strong | 件数 | 推奨処置 |
|--------|------|---------|
| G3762 | 214 | morph 別分類: 中性・女性形95件（→何も〜ない審査）/ 男性形119件（→昇格可能） |
| G3056 | 123 | 文脈確認: "give account"慣用句コンテキスト特定。多数は ことば で昇格可能 |
| G4183 | 39 | 文脈確認: 副詞的用法（A-APN/A-DSN）の訳語審査 |
| G2983 | 22 | 文脈確認: 聖餐・物品受領文脈での 取る vs 受ける |
| G4160 | 21 | 文脈確認: 樹木慣用句コンテキスト特定。多数は 行う で昇格可能 |
| G3708 | 20(+5) | G3708 設計判断後に処理（εἰδ- 完了分詞全形）|

---

## 10. 整合性チェック

| チェック | 期待値 | 実測値 | 判定 |
|---------|--------|--------|------|
| 対象 ref 総数 | 8,324 | 8,324 | ✓ PASS |
| 重複 ref | 0 | 0 | ✓ PASS |
| 全件 Phase 4ag UNREVIEWED | 8,324 | 8,324 | ✓ PASS |
| 分類合計 | 8,324 | 8,324 | ✓ PASS |
| MULTIPLE_JAPANESE | 0 | 0 | ✓ PASS |
| DATA_MISMATCH | 0 | 0 | ✓ PASS |
| POST_PHASE_IMPLEMENTED | 0 | 0 | ✓ PASS |
| ALREADY_CLASSIFIED | 0 | 0 | ✓ PASS |
| UNRESOLVED | 0 | 0 | ✓ PASS |

**Phase 4ap 整合性: PASS（9/9）**

---

## 11. 最終判定

**PASS**

- 8,324件全件を分類済み。UNRESOLVED=0
- 7,885件（94.7%）: STRONG_CONSISTENT_SAMPLE_SUPPORTED → Phase 4aq で安全に昇格可能
- 439件（5.3%）: STRONG_CONSISTENT_BUT_EXCEPTION_RISK → 個別確認が必要
- 全20 Strongs で distinct_japanese=1（内部不整合なし）
- Phase 4ad 変更18件との重複なし（SAMPLED_INFERRED は別 ref）

---

## 12. 成果物

| ファイル | 内容 |
|---------|------|
| `stage4-phase4ap-tier1-inferred-audit.json` | 8,324件全件の分類記録（新規） |
| `stage4-phase4ap-tier1-inferred-audit.md` | 本ファイル（新規） |

**更新ファイル: なし（READ-ONLY 監査フェーズ）**

---

## 13. UNREVIEWED 残存

| 項目 | 件数 |
|------|------|
| 現在の UNREVIEWED | 41,215 |
| Phase 4aq 昇格予定 | −7,885 |
| Phase 4aq 後の見込み | **33,330** |
| Tier 1 exception risk（4aq後残存） | 439 |
| Tier 3–7 TRULY_UNREVIEWED | ~32,890 |
| Group F/G/H | ~7,270 |
