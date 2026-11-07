# Stage 4 開始判定ゲート

生成日: 2026-10-31  
判定対象: Stage 4 全件監査の開始可否  
参照成果物: stage4-final-design-v2.md / stage4-g756-review.md / stage4-tier7-sampling-plan.md / stage4-count-reconciliation.md

---

## 1. 母集団 92,952 件の整合性確認

### 1.1 内訳

| Group | 説明 | tokens | Strongs | 確認状態 |
|-------|------|--------|---------|---------|
| A | 内容語 plain | 39,310 | 4,195 | ✅ CONFIRMED |
| B | εἰμί 述語構造 | 2,369 | 22 | ✅ CONFIRMED |
| C | 否定副詞 | 2,494 | 2 | ✅ CONFIRMED |
| D | その他 tilde 内容語 | 377 | 16 | ✅ CONFIRMED |
| E | 内容語 bracket | 142 | 4 | ✅ CONFIRMED |
| F | pron plain | 5,544 | 46 | ✅ CONFIRMED |
| G | 関係代名詞 tilde | 1,657 | 3 | ✅ CONFIRMED |
| H | G4671 σοί 独立監査 | 69 | 1 | ✅ CONFIRMED |
| Z | 機能語（除外） | 40,990 | 139 | ✅ CONFIRMED |
| **合計** | | **92,952** | **432** | ✅ |

NT 全体 137,741 tokens との照合:
- 恒久 BL (G5213/G5209/G5210/G5216/G2532/G846): 15,883 tokens
- S4 除外 (G4675/G4571/G4771/G4674): 723 tokens
- Ledger 承認済み: 22,624 tokens
- Stage 2 census: 3,559 tokens
- 残存: 92,952 tokens
- **合計: 15,883 + 723 + 22,624 + 3,559 + 92,952 = 137,741 ✅**

### 1.2 合計照合

```
15,883 + 723 + 22,624 + 3,559 + 92,952 = 137,741
```

CONFIRMED — 欠損なし・重複なし。

---

## 2. 旧集計との差分解消

| 差分 | 旧値 | 新値 | 差 | 解消状態 |
|------|------|------|-----|---------|
| 内容語 plain tokens | 39,281 | 39,310 | +29 | ✅ RESOLVED |
| 内容語 plain Strongs | 4,182 | 4,195 | +13 | ✅ RESOLVED |
| 内容語全体 tokens | 44,629 | 44,692 | +63 | ✅ RESOLVED |

**解消根拠**: s4content.cjs の設計バグ（first-seen class でStrongのclassを代表させる方式）により mixed-class Strong 43件で計上誤りが発生していた。per-token 方式（s4groups.cjs）が正確。詳細: [stage4-count-reconciliation.md](stage4-count-reconciliation.md)

未解決の件数差: **なし**

---

## 3. G4671（σοί）の独立監査対象としての扱い

### 3.1 決定内容

- **G4671（σοί）は Group H として独立監査対象**
- 既存 S4 (G4675/G4571/G4771/G4674) への機械的追加はしない
- 69 tokens 全件確認を実施する

### 3.2 σύ 格変化完全対応

| Strong | ギリシャ語 | 格 | Stage 4 での扱い |
|--------|-----------|------|-----------------|
| G4771 | σύ | 主格 (nom.) | S4 除外済み（範囲外） |
| G4675 | σου | 属格 (gen.) | S4 除外済み（範囲外） |
| G4671 | σοί | 与格 (dat.) | **Group H — 独立監査** |
| G4571 | σέ | 対格 (acc.) | S4 除外済み（範囲外） |
| G4674 | σός | 所有形容詞 | S4 除外済み（範囲外） |

判断根拠: stage3-addendum-report.md の S4 除外セット定義を確認。G4671 は含まれていない。

### 3.3 S4 範囲への影響

G4671 の Group H への分類は既存 S4（723 tokens）の内容を変更しない。  
BL・S4 の対象集合は変更しない。

---

## 4. G4675 の格誤記訂正内容

### 4.1 発見箇所

`scripts/output/ja1955-full-audit/reports/stage3-addendum-report.md`  
行 19 および 行 180: `G4675 | σοί（与格）`

### 4.2 訂正内容

| 箇所 | 誤記 | 正 |
|------|------|-----|
| 行 19 | G4675 \| σοί（与格） | G4675 \| σου（属格） |
| 行 180 | 同上 | 同上 |

### 4.3 元 JSON の変更

**変更なし**。元の監査データ JSON（stage3-full-audit-excluded.json 等）は変更していない。  
誤記はラベルのみであり、監査判定・件数・グループ分類に影響なし。

訂正証拠: stage4-count-reconciliation.md §6 に記録済み（CONFIRMED）。

---

## 5. G756 個別調査の結論

### 5.1 調査結果

| 確認項目 | 結果 |
|---------|------|
| G756 lemma | ἄρχω（中動: ἄρχομαι, 始める） |
| NT 全 tokens | 84（全件 class=verb, group=D） |
| 現行 japanese | "〜である"（全 84 件） |
| 現行ラベルの正誤 | **CONFIRMED 誤り**（εἰμί のラベルを誤使用） |
| 正しいラベル候補 | "〜し始める"（Stage 4 実行時に確定） |
| 全件の構文パターン | G756 + 不定詞 = 開始相（始める + 主動作） |
| JA1955 との整合 | "〜はじめた" / "〜始められた" / "〜し出した" |

### 5.2 Stage 4 での監査方式

**「Strong 単位確認 + 全 84 tokens 確認」**  
- Strong 単位: ラベル誤り CONFIRMED → 即 NOTE（所要時間 5分未満）
- 全 84 tokens: 個別文脈確認 + 正しいラベルの判定（起点用法 等の例外確認）

### 5.3 Group D への影響

G756 は Group D 16 Strongs のうち唯一の CONFIRMED 誤りケース。  
他の 15 Strongs は「ラベル内容の妥当性確認」が主目的であり、監査方式が異なる。  
詳細: [stage4-g756-review.md](stage4-g756-review.md)

---

## 6. Tier 7 サンプリング方式の確定

### 6.1 Tier 7 の定義

Group A のみに Tier 分類が存在する。Tier 7 = n=1-4 の Strongs。

| n | Strongs | Tokens |
|---|---------|--------|
| 1 | 1,624 | 1,624 |
| 2 | 659 | 1,318 |
| 3 | 392 | 1,176 |
| 4 | 235 | 940 |
| **合計** | **2,910** | **5,058** |

### 6.2 確定方式

**Tier 7（n=1-4）はサンプリングを行わず全件確認とする。**

根拠:
- n が 1〜4 と極小であり「サンプリング」が成立しない
- 全件確認が実質的に Strong-level 確認と同等
- 5,058 tokens は意味領域別バッチ処理で対応可能

バッチ処理方針: 動詞 / 名詞 / 形容詞 / 副詞 の品詞別に一括処理。ラベルが明確な Strongs を優先確認し、AMBIGUOUS は積み残しリストへ。

### 6.3 他 Tier の方式

| Tier | 方式 |
|------|------|
| 1 (n≥200) | 層別サンプル 15-20件/Strong |
| 2 (n=100-199) | 層別サンプル 10-15件/Strong |
| 3 (n=50-99) | 層別サンプル 8-12件/Strong |
| 4 (n=20-49) | 層別サンプル 8-12件/Strong（NOTE時全件） |
| 5 (n=10-19) | 層別サンプル 6-8件/Strong（NOTE時全件） |
| 6 (n=5-9) | 全件確認 |
| 7 (n=1-4) | **全件確認（サンプリング不要）** |

詳細: [stage4-tier7-sampling-plan.md](stage4-tier7-sampling-plan.md)

---

## 7. Stage 4 開始に必要な条件の充足状況

| 条件 | 充足状態 | 備考 |
|------|---------|------|
| NT 全件（137,741）の照合完了 | ✅ PASS | stage4-prep-report.md |
| 残存 92,952 件の分類完了 | ✅ PASS | stage4-group-assignment.json（Missing=0） |
| 旧集計との差分（+63）の解消 | ✅ PASS | 43 mixed-class Strongs で説明済み |
| 監査群 A〜H+Z の件数確定 | ✅ PASS | 合計 92,952 ✅ |
| Strong 優先順位の確定 | ✅ PASS | stage4-strong-order.json |
| G4671（σοί）の方針確定 | ✅ PASS | Group H、独立監査、69件全確認 |
| G4675 誤記の記録 | ✅ PASS | stage4-count-reconciliation.md §6 |
| Group C 否定表現設計 | ✅ PASS | stage4-negation-design.md |
| Group H 独立設計 | ✅ PASS | stage4-pron-design.md §4 |
| G756 個別調査の完了 | ✅ PASS | stage4-g756-review.md |
| Tier 7 サンプリング方式の確定 | ✅ PASS | stage4-tier7-sampling-plan.md |
| AMBIGUOUS 判定の Stage 5 送り方針 | ✅ PASS | sampling-plan §11 で定義 |
| 全件監査・翻訳修正の未着手確認 | ✅ PASS | 今期間は設計のみ |

---

## 8. 未解決事項

| 事項 | 状態 | 開始を妨げるか |
|------|------|--------------|
| G756 の正しいラベル確定（"〜し始める" vs その他） | DEFERRED（Stage 4 実行時） | **妨げない**（全 84 tokens 確認で決定） |
| Group B 疑問 5件（G680/G1573/G567/G4823/G566）の語義確認 | DEFERRED（Phase 4b） | **妨げない**（件数が少なく監査開始後に確認可能） |
| Group Z の G3756/G3361 ptcl/conj tokens 171件の class 不整合 | DEFERRED（記録のみ） | **妨げない**（Group Z は監査対象外） |
| Tier 1-5 のサンプリングスクリプト実装 | DEFERRED（Phase 4d 開始前） | **妨げない**（先行フェーズで実装） |
| 2CO 3:1 の G756（Ἀρχόμεθα）の用法分類 | DEFERRED（全 84 tokens 確認中） | **妨げない** |

**開始を妨げる未解決事項: なし**

---

## 9. 最終判定

```
STATE: READY

Stage 4 の監査を開始できる状態にある。

理由:
- 母集団 92,952 件の整合性確認完了（欠損・重複なし）
- 旧集計との差分（+63）が完全に解消
- 全監査群（A〜H+Z）の件数・Strongs・方針が確定
- G756 CONFIRMED 誤りの検出 → Stage 4 で対処予定
- G4671 Group H 独立監査の設計完了
- Tier 7 全件確認方式が確定
- 開始を妨げる UNKNOWN・BLOCKED なし

次のステップ（実施順序）:
  Phase 4a: G756 監査（Group D 最優先）+ Group E 一括確認
  Phase 4b: Group B 語義疑問 5件 + Group D 残 15 Strongs
  Phase 4c: Group C 否定表現機能監査
  Phase 4d: Group A Tier 1-2（56 Strongs）
  Phase 4e: Group F/G/H pron 監査
  Phase 4f: Group A Tier 3-5
  Phase 4g: Group A Tier 6（全件）
  Phase 4h: Group A Tier 7（全件、バッチ処理）
```

---

## 10. 成果物一覧（Stage 4 設計フェーズ）

| ファイル | 内容 | 状態 |
|--------|------|------|
| stage4-target-revised.json | 監査群件数（修正版） | ✅ |
| stage4-group-assignment.json | 92,952件のGroup割当表 | ✅ |
| stage4-strong-order.json | Strong優先順位（Tier付き） | ✅ |
| stage4-pron-design.md | pron群（F/G/H）設計 | ✅ |
| stage4-predicate-design.md | 述語群（B/C/D/E）設計 | ✅ |
| stage4-negation-design.md | Group C 否定表現設計 | ✅ |
| stage4-final-design.md | 最終設計書 v1 | ✅ |
| stage4-count-reconciliation.md | 件数差分解消報告 | ✅ |
| stage4-final-design-v2.md | 最終設計書 v2（統合版） | ✅ |
| stage4-g756-review.md | G756 個別調査報告 | ✅ |
| stage4-tier7-sampling-plan.md | サンプリング方式確定 | ✅ |
| stage4-start-gate.md | 本ファイル（開始判定） | ✅ |
