# Stage 4 Phase 4ar — G3762 οὐδείς 中性・女性形95件の個別監査報告

**Phase**: 4ar
**実施日**: 2026-11-04
**性格**: READ-ONLY 個別監査（台帳・bible_data・japanese・エンジン変更なし）

---

## 1. 監査概要

| 項目 | 値 |
|------|-----|
| 対象 Strong | G3762 (οὐδείς) |
| 対象形態 | 中性形（A-\*SN-N）+ 女性形（A-\*SF-N） |
| 件数 | **95件** |
| 男性形 | 除外 — 「誰も〜ない」で正しく、別フェーズで処理 |
| Phase 4ag 状態（前） | 全95件 UNREVIEWED |
| 監査内容 | 現在の「誰も〜ない」を「何も〜ない」に変更すべきか個別判定 |

---

## 2. 判定根拠

### 2.1 中性形（A-\*SN-N）の原則

ギリシャ語中性形（neuter gender）の形容詞・代名詞は意味的に「物事・事柄・行為」を指し、「人」を指さない。

> `οὐδέν` / `μηδέν` = "nothing" (not "no one")

中性形95件中85件（A-ASN-N=63、A-NSN-N=18、A-DSN-N=3、A-GSN-N=1）はすべて「何も〜ない」が正しい。

### 2.2 女性形（A-\*SF-N）の個別分析

女性形は「女性名詞を修飾する」という文法形態であり、修飾される名詞が「人」か「物事・事柄」かによって訳語が変わる。全10件を個別に照合した。

| ref | 形態 | 修飾先 | 訳語判定 |
|-----|------|--------|---------|
| MRK 6:5!6 | A-ASF-N | δύναμιν（力・奇跡、G1411） | APPROVE_NANIMO |
| LUK 4:26!3 | A-ASF-N | αὐτῶν（代名詞、ヤモメ達を指す） | **RETAIN_DAREMO** |
| JHN 18:38!20 | A-ASF-N | αἰτίαν（罪状、G156） | APPROVE_NANIMO |
| JHN 19:4!18 | A-ASF-N | αἰτίαν（罪状、G156） | APPROVE_NANIMO |
| JHN 19:11!9 | A-ASF-N | ἐξουσίαν（権威、G1849） | APPROVE_NANIMO |
| ACT 25:18!6 | A-ASF-N | αἰτίαν（告訴状、G156） | APPROVE_NANIMO |
| 2CO 7:5!7 | A-ASF-N | ἄνεσιν（安らぎ、G425） | APPROVE_NANIMO |
| ACT 27:22!10 | A-NSF-N | ἀποβολή（喪失、G590） | APPROVE_NANIMO |
| PHP 4:15!15 | A-NSF-N | ἐκκλησία（教会、G1577） | **CONTEXT_DEPENDENT** |
| 1JN 1:5!24 | A-NSF-N | σκοτία（闇、G4653） | APPROVE_NANIMO |

#### LUK 4:26!3 — RETAIN_DAREMO の根拠

```
LUK 4:26: "πρὸς οὐδεμίαν αὐτῶν ἐπέμφθη Ἠλίας"
         = "エリヤは彼女たちのうちの誰にも遣わされなかった"
```

`αὐτῶν`（3複数属格代名詞）の先行詞は LUK 4:25 の「多くのやもめ（γυναῖκα χήραν）」。**人を指す代名詞**のため「誰も〜ない」が正しい。

#### PHP 4:15!15 — CONTEXT_DEPENDENT の根拠

```
PHP 4:15: "οὐδεμία μοι ἐκκλησία ἐκοινώνησεν"
         = "どの教会も私と〜したものはなかった"
```

`ἐκκλησία`（集会・教会）は女性名詞で文法的女性。意味的には制度的集団体であり、「人（誰も）」とも「抽象的事物（何も）」とも言い切れない。L-0設計判断を要する。

---

## 3. 判定結果

| 判定 | 件数 | 内容 |
|------|------|------|
| **APPROVE_NANIMO** | **93** | 「何も〜ない」に変更すべき |
| **RETAIN_DAREMO** | **1** | 「誰も〜ない」を維持（LUK 4:26!3） |
| **CONTEXT_DEPENDENT** | **1** | L-0設計判断待ち（PHP 4:15!15） |
| DATA_QUALITY_HOLD | 0 | — |
| UNRESOLVED | 0 | — |
| **合計** | **95** | |

### 形態別内訳

| 形態 | 件数 | APPROVE_NANIMO | RETAIN_DAREMO | CONTEXT_DEPENDENT |
|------|------|--------------|--------------|------------------|
| A-ASN-N | 63 | 63 | 0 | 0 |
| A-NSN-N | 18 | 18 | 0 | 0 |
| A-DSN-N | 3 | 3 | 0 | 0 |
| A-GSN-N | 1 | 1 | 0 | 0 |
| A-ASF-N | 7 | 6 | 1 | 0 |
| A-NSF-N | 3 | 2 | 0 | 1 |
| **合計** | **95** | **93** | **1** | **1** |

---

## 4. 整合性チェック

| チェック | 期待値 | 実測値 | 判定 |
|---------|--------|--------|------|
| 総件数 = 95 | 95 | 95 | ✓ PASS |
| 重複 ref なし | 95 unique | 95 unique | ✓ PASS |
| 全件 UNREVIEWED（監査前） | 95 | 95 | ✓ PASS |
| DATA_QUALITY_HOLD = 0 | 0 | 0 | ✓ PASS |
| UNRESOLVED = 0 | 0 | 0 | ✓ PASS |

**整合性: PASS（5/5）**

---

## 5. 総合判定

**CONDITIONAL PASS**

| 条件 | 状態 |
|------|------|
| 95件すべての判定完了 | ✓ |
| 根拠が ref 単位で説明可能 | ✓ |
| DATA_QUALITY_HOLD = 0 | ✓ |
| UNRESOLVED = 0 | ✓ |
| RETAIN_DAREMO 1件（LUK 4:26!3） | 判定完了・維持根拠明記 |
| CONTEXT_DEPENDENT 1件（PHP 4:15!15） | L-0設計判断を別途要求 |

CONDITIONAL PASSの条件: 整合性チェックはすべてPASSだが、PHP 4:15!15については「ἐκκλησία = 教会」という制度的集団体への適切な日本語表示（誰も vs 何も）をL-0レベルで決定する必要がある。

---

## 6. 次フェーズへの申し送り

### 即座に昇格可能（次フェーズ対象）

| 対象 | 件数 | 状態変更 | basis |
|------|------|---------|-------|
| APPROVE_NANIMO 93件 | 93 | UNREVIEWED → RETAIN_CONFIRMED（要別Phase） | PHASE4AR_INDIVIDUALLY_CONFIRMED |
| RETAIN_DAREMO 1件 (LUK 4:26!3) | 1 | UNREVIEWED → RETAIN_CONFIRMED（要別Phase） | PHASE4AR_INDIVIDUALLY_CONFIRMED |

### 設計判断待ち

| ref | 判断内容 |
|-----|---------|
| PHP 4:15!15 | ἐκκλησία（教会）への読みは「誰も」vs「何も」。L-0 boundary: 制度的集団体を「誰」として扱うか「何」として扱うか。 |

### 保護確認（Phase 4ag 変更なし）

本フェーズはREAD-ONLYのため、Phase 4ag 台帳は変更していない。

| ファイル | 変更 |
|---------|------|
| stage4-phase4ag-residual-inventory.json | **変更なし** |
| bible_data/ | **変更なし** |
| reading-engine.js / 辞書 / 検索index | **変更なし** |
| regression baseline | **変更なし** |

---

## 7. 参照ファイル

| ファイル | 内容 |
|---------|------|
| `stage4-phase4ar-g3762-audit.json` | 95件の ref 単位判定台帳（本レポートの根拠） |
| `stage4-phase4ap-tier1-inferred-audit.json` | G3762 exception_tokens の源泉 |
| `stage4-phase4ag-residual-inventory.json` | 現在の台帳状態（変更なし、UNREVIEWED=33,335） |
