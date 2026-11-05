# Stage 4 Phase 4aa — G566 ἀπέχω 特殊用法 再監査

**Phase**: 4aa
**実施日**: 2026-11-04
**目的**: G566 ἀπέχω MRK 14:41!13（ἀπέχει）の HOLD_LEXICAL 解除可否判定
**対象件数**: 1件
**種別**: READ-ONLY 監査（bible_data・辞書・インデックス・engine・baseline 変更なし）
**最終ステータス**: **PHASE 4aa AUDIT PASS — APPROVED_FOR_CHANGE**

---

## 1. 監査目的

Phase 4w で HOLD_LEXICAL に据え置いた G566 MRK 14:41!13 について、
Phase 4b の「設計判断要」という注記を再検証し、
推奨訳語と判定区分を確定する。

---

## 2. 対象トークン（CONFIRMED データ）

| フィールド | 値 |
|-----------|---|
| ref | MRK 14:41!13 |
| strong | G566 |
| lemma | ἀπέχω |
| text | ἀπέχει |
| morph | V-PAI-3S（Present Active Indicative 3rd Singular） |
| japanese（現在値） | **〜である** |
| english（コーパス） | **enough** |
| gloss（コーパス） | **It is enough** |
| ln | 59.47 / 85.16 |
| domain | 059005 / 085001 |

**evidence**: `public/bible_data/nt/MRK/14.json` トークン直読み（CONFIRMED）

---

## 3. 節コンテキスト（MRK 14:41 全27トークン）

```
!8  Καθεύδετε  V-PAI-2P  "眠る"      | Are you sleeping
!9  τὸ         T-ASN                   | -
!10 λοιπὸν     A-ASN     "残りの"     | still
!11 καὶ        CONJ      "そして"     | and
!12 ἀναπαύεσθε V-PMI-2P  "休ませる"  | taking your rest
!13 ἀπέχει     V-PAI-3S  "〜である"  | enough     [← 対象]
!14 ἦλθεν      V-2AAI-3S "来る"      | has come
!15 ἡ          T-NSF                   | the
!16 ὥρα        N-NSF     "時"        | hour
```

文脈読み: 「もう眠るのか、休んでいるのか。十分だ（もうよい）。時が来た。」（イエスがゲツセマネで弟子たちを起こす場面、3度目の帰還）

---

## 4. エラー診断

### 4.1 current japanese "〜である" の CONFIRMED_ERROR

| 診断軸 | 結果 |
|-------|------|
| lemma = εἰμί か | **NO** — lemma は ἀπέχω（G566）、εἰμί（G1510）ではない |
| Group B 誤分類パターン | **一致** — 旧来 "〜である" は V-PAI-3S 動詞を述語的 εἰμί 構造と誤判定した典型 |
| 文法的適合性 | **不適合** — ἀπέχει は ἀπέχω の3単現。εἰμί-ベースの "〜である" に語根的根拠なし |

**判定: CONFIRMED_ERROR（〜である は誤り）**

### 4.2 コーパス自体の "enough" 採用

コーパスは当該トークンに対し:

- `english: "enough"` ← 訳語として "enough" を採用済み
- `gloss: "It is enough"` ← 拡張グロスも "It is enough"
- `ln: "59.47 85.16"` ← Louw-Nida 59.47（量: 十分さ）が先頭

LN 59.47 は ἀπέχω の通常義（85.16: 距離）とは別の語義ドメインであり、
コーパスアノテーターが impersonal 用法（「十分だ」の意）を明示的に記録している。

**evidence**: CONFIRMED（bible_data 直読み）

---

## 5. 語義分析

### 5.1 ἀπέχω の通常義と特殊義

| 用法 | Strong | 意味 | 代表箇所 |
|------|--------|------|---------|
| 通常義A | G568/G566 | （代金を）受け取り済みにする / 満額受領 | MAT 6:2,5,16; LUK 6:24; PHP 4:18 |
| 通常義B | G568/G566 | 距離がある / 遠い | MAT 14:24; LUK 7:6; LUK 15:20; ACT 17:27 |
| 中動態 | G567 | 避ける / 控える | ACT 15:29; 1TH 4:3; 1PE 2:11 |
| **特殊義** | **G566** | **十分だ / もうよい（impersonal）** | **MRK 14:41 のみ** |

### 5.2 MRK 14:41 の ἀπέχει — 学術的位置づけ

ἀπέχει at MRK 14:41 is widely recognised as a **crux interpretum**（解釈の難所）。

主な解釈案:

| 解釈 | 訳例 | 支持根拠 |
|------|------|---------|
| impersonal「十分だ」 | "It is enough" / "Enough" | BDAG s.v. ἀπέχω 4; LN 59.47; 大多数の英語訳（NIV, ESV, NRSV） |
| 商業的「帳消しだ」 | "The account is settled" | ἀπέχω 受領義の延長; 一部の学者 |
| 副詞的「遠くに（いる）」 | "He is far away" | ἀπέχω 距離義; 解釈としては少数派 |

**結論**: impersonal 用法「十分だ」/ "It is enough" が学術的主流かつコーパスアノテーション一致。

### 5.3 JA1955 の訳

JA1955（1955年改訳標準訳）MRK 14:41:

> 「…まだ眠って休んでいるのか。もうよい。時が来た。」

「**もうよい**」が JA1955 の採用訳。意味的には「十分だ / もう終わりだ」に相当する。

---

## 6. 訳語候補

### Group B 〜 prefix 適用

Group B（εἰμί 誤分類）の修正は全件 〜 prefix を使用する（Phase 4m/4y 実績に従う）。

### 候補比較

| 候補 | 語形 | 利点 | 注意点 |
|------|------|------|-------|
| **〜十分だ** | な形容詞述語 | LN 59.47「sufficient」と直対応; 「enough」に最も近い字義的訳 | な形容詞 + だ（だ語尾）→ Tier2 V-PAI-3S 展開は基本形 = 変化なし（問題なし） |
| 〜足りる | 下一段動詞 | 動詞活用パターンが明確; Tier2 展開で V-PAI-3S → 〜足りる（変化なし） | 「足りる」は量的充足のニュアンスが強い; 感嘆的な "Enough!" よりやや弱い |

### 推奨訳語

**〜十分だ**

根拠:
- コーパス `english: "enough"` / `gloss: "It is enough"` と字義的に対応
- LN 59.47（sufficient/enough）の語義ドメインと一致
- JA1955「もうよい」と意味的に等価
- Group B 〜 prefix 維持
- 語形は な形容詞述語。V-PAI-3S（基本形）→ Tier2 は「〜十分だ」のまま展開（活用なし）。morph 展開リスクなし

代替: 〜足りる（字義は類似するが感嘆的ニュアンスが薄い）

---

## 7. 判定

### 7.1 エラー判定

| 判定軸 | 結果 |
|-------|------|
| current japanese の正確性 | CONFIRMED_ERROR（〜である = εἰμί 誤分類） |
| 変更の必要性 | REQUIRED |

### 7.2 推奨訳語の信頼度

| 信頼度軸 | 評価 |
|---------|------|
| エラー診断信頼度 | **HIGH** — corpus, LN, JA1955 いずれも "enough" を支持 |
| 訳語ラベル信頼度 | **MEDIUM** — 〜十分だ が最適だが、な形容詞述語の Tier2 展開挙動は他 Group B 事例と性質が異なる |

### 7.3 最終判定区分

**APPROVED_FOR_CHANGE**

| 項目 | 値 |
|------|---|
| 判定 | APPROVED_FOR_CHANGE |
| current japanese | 〜である |
| error_type | CONFIRMED_ERROR（Group B: εἰμί 誤分類） |
| recommended japanese | **〜十分だ** |
| 代替候補 | 〜足りる |
| 実装可否 | 可（1件のみ、V-PAI-3S 基本形、morph 展開リスクなし） |
| 次フェーズ | Phase 4ab — G566 1件実装・downstream 検証 |

---

## 8. Phase 4b / 4w 注記との整合

| Phase 4b 注記 | Phase 4aa 判定 |
|-------------|---------------|
| 「形容詞的用法の疑い」 | INFERRED（コーパスアノテーションで impersonal 動詞用法として記録） |
| 「設計判断要」 | 解決済み — 訳語 〜十分だ に確定 |
| 「REVISION_CANDIDATE」 | Phase 4w では HOLD_LEXICAL に再分類済み → 本 Phase で APPROVED_FOR_CHANGE へ昇格 |

---

## 9. morph 展開予測

| morph | Tier2 予測 | Tier1(null) 予測 | 一致 | 評価 |
|-------|-----------|----------------|------|------|
| V-PAI-3S（〜十分だ） | 〜十分だ | 〜十分だ | ✓ | 基本形 = 変化なし（な形容詞述語の現在形） |

Tier2 は V-PAI-3S に対して基本的に base form をそのまま返すため、
な形容詞 + だ 語尾でも破損形は発生しない。
brokenNew への影響: **なし**（予測）

---

## 10. 未解決事項

なし。エラー診断・訳語・判定区分の全項目が CONFIRMED または十分な根拠に基づいて確定した。

---

## 11. 成果物

| ファイル | 内容 |
|---------|------|
| `stage4-phase4aa-g566-audit.md` | 本ファイル — 監査報告 |
| `stage4-phase4aa-g566-decision.json` | 機械可読判定 JSON |

---

**PHASE 4aa AUDIT PASS — APPROVED_FOR_CHANGE**

次アクション: Phase 4ab — G566 MRK 14:41!13 1件実装・downstream 検証
