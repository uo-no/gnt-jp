# Stage 4 最終監査設計書

生成日: 2026-10-31  
参照: `stage4-target-revised.json`, `stage4-strong-order.json`, `stage4-group-assignment.json`, `stage4-pron-design.md`, `stage4-predicate-design.md`

---

## 1. 件数の整合性確認（ユーザー指摘への回答）

### 1.1 旧報告書の不整合

前回報告書 (`stage4-prep-report.md`) では以下を記載した:

| 項目 | 旧値 |
|------|------|
| 内容語 plain tokens | 39,281 |
| 内容語 tilde tokens | 5,348 |
| 内容語 bracket tokens | 0（未計上） |
| 内容語 合計 | 44,629 |
| pron 合計 | 7,270 |

ユーザー指摘: "plain(39,281) + pron(7,270) = 46,551 ≠ 44,629、差分 1,922"

### 1.2 token ref 単位での再集計（s4groups.cjs による）

`Missing token refs: 0` — NT 全 remaining 92,952 件が ref 単位で正確に照合された。

**監査群別確定値**:

| Group | 説明 | tokens | Strongs |
|-------|------|--------|---------|
| A | 内容語 plain | **39,310** | 4,195 |
| B | εἰμί 述語構造 (tilde verb) | 2,369 | 22 |
| C | 否定副詞 (〜ない, tilde adv) | 2,494 | 2 |
| D | その他 tilde 内容語 | 377 | 16 |
| E | 内容語 bracket (adv) | 142 | 4 |
| **内容語 小計** | class∈{noun,verb,adj,adv,num} | **44,692** | 4,239 |
| F | pron plain | 5,544 | 46 |
| G | pron tilde (関係代名詞) | 1,657 | 3 |
| H | pron G4671 (σοί, S4 未除外) | 69 | 1 |
| **pron 小計** | class=pron | **7,270** | 50 |
| Z | 機能語（監査対象外） | 40,990 | 139 |
| **合計** | | **92,952** ✅ | |

### 1.3 旧値との差の説明

**なぜ 44,629 ≠ 39,281 + 7,270 か**:  
旧報告書の 44,629 は「内容語 class（noun/verb/adj/adv/num）の全 tokens（plain + tilde + bracket）の合計」であり、pron class（7,270）は最初から含まれていない。pron は内容語とは独立した class である。この 2 つを足し算することに意味はない。

**旧値と新値の差**:
- 内容語 plain: 39,281 → 39,310（+29）— G3756/G3361 等の "mixed Strong"（tilde が主だが plain tokens も存在）の plain tokens が正確に計上された
- 内容語 tilde: 5,348 → 5,240（-108）— 同じ理由で、mixed Strong の一部が tilde ではなく plain に正確に分類された
- 内容語 bracket: 0 → 142（+142）— adv class の bracket tokens（G3754/G5613/G2443/G3704）が未計上だった
- 内容語 合計: 44,629 → 44,692（+63）

### 1.4 4,211 と 4,182 の差 29 の内訳

| 計算方法 | Strongs 数 | 説明 |
|---------|-----------|------|
| Strong 単位で jaType が全 tilde の内容語 | 29 | 旧 "tilde-only Strongs"（全 tokens が tilde） |
| Strong 単位で jaType に plain があるもの | 4,182 | 旧 "plain-label あり" |
| 旧合計 | **4,211** | |
| token 単位で group A に割り当てられた Strongs | **4,195** | G3756/G3361 等の mixed Strong の plain tokens が A に入るため +13 |

Strong 単位と token 単位で分類すると数が変わる。旧値（4,211/4,182）は Strong の「代表的な jaType」で分類したもの。新値（4,195）は各 token の実際の jaType で Group A に割り当てた Strongs の数。

---

## 2. 監査群の定義と範囲

```
NT 全体: 137,741 tokens
  ↓
Stage 3/BL/S4/Ledger/Stage2only 除外: 44,789 tokens
  ↓
残存 (remaining): 92,952 tokens
  ├─ Group A (内容語 plain)             39,310 tokens — Stage 4 一次対象
  ├─ Group B (εἰμί 述語構造)             2,369 tokens — 述語構造審査
  ├─ Group C (否定副詞)                  2,494 tokens — 機能的確認のみ
  ├─ Group D (その他 tilde 内容語)          377 tokens — Strong 単位確認
  ├─ Group E (内容語 bracket)              142 tokens — 構造ラベル確認
  ├─ Group F (pron plain)               5,544 tokens — pron 独立監査
  ├─ Group G (pron 関係代名詞 tilde)     1,657 tokens — pron 独立監査
  ├─ Group H (G4671, S4 未除外)            69 tokens — 方針確定後処理
  └─ Group Z (機能語, 監査対象外)        40,990 tokens — 除外
```

**Stage 4 監査の総対象**: A+B+C+D+E+F+G+H = **51,962 tokens**, 4,289 Strongs（+H 1 Strong = 4,290）

---

## 3. 一次対象（Group A）の監査単位：二段階設計

### 3.1 Stage A — Strong 単位の語彙審査

**目的**: 各 Strong の lemma について、現行の `token.japanese` ラベルが Reading Japanese として適切かを語彙レベルで確認する。

**記録形式**:

```json
{
  "strong": "G3004",
  "lemma": "λέγω",
  "class": "verb",
  "japanese": "言う",
  "n_remaining": 1164,
  "n_stage3": 184,
  "audit_result": "OK | AMBIGUOUS | CANDIDATE | MISMATCH | SKIP",
  "usage_types": ["命令・直説法など語義の幅を記述"],
  "ja1955_patterns": ["言われた", "言った", "言い"],
  "recommendation": "CANDIDATE/MISMATCH の場合のみ記入",
  "note": "備考"
}
```

**判定基準**:

| 判定 | 定義 |
|------|------|
| OK | 現行ラベルが Reading Japanese として適切 |
| AMBIGUOUS | 複数語義があり Strong 単位では一義的に判定できない |
| CANDIDATE | より正確または自然なラベルへの改善候補がある |
| MISMATCH | 明らかに誤対応 |
| SKIP | 調査不要（既に Stage 3 で十分確認済み等） |

**重要**: Strong 単位で "OK" と判定しても、個々の token の japanese を自動的に確定しない。

### 3.2 Stage B — token 単位の文脈審査

Stage A で AMBIGUOUS / CANDIDATE / MISMATCH となった Strong のみ実施。

**確認項目**:

```json
{
  "ref": "MAT.1.1",
  "strong": "G3004",
  "form": "λέγει",
  "morph": "V-PresentActiveIndicative-3s",
  "japanese": "言う",
  "context_synopsis": "文脈の要約（5語以内）",
  "ja1955_text": "JA1955 該当 verse の実際の日本語",
  "ja1955_rendering": "この Strong に対応する JA1955 表現",
  "appearance_type": "明示 | 吸収 | 省略",
  "label_assessment": "OK | CANDIDATE | MISMATCH",
  "confidence": "high | medium | low",
  "note": "備考"
}
```

**自動化の可否**:
- 自動: `morph` フィールドから語形を取得、bible_data から文脈 verse を取得
- 半自動: JA1955 verse テキストの取得
- 手動: appearance_type の判定、label_assessment の確認

### 3.3 Stage A で自動処理できる部分

- Strongs 辞書からの lemma・品詞情報の取得（自動）
- bible_data から `class`, `japanese`, `morph` の取得（自動）
- n_remaining の集計（既存 `stage4-strong-order.json`）
- Stage 3 の監査結果（n_stage3）の参照

### 3.4 人的確認が必要な部分

- **語義判断**: 多義語の場合、どの語義を採用すべきかは人間が判断する
- **JA1955 テキスト確認**: JA1955 での実際の表現を確認する
- **CANDIDATE の採択**: 改善候補が実際に改善となるか確認する
- **AMBIGUOUS の最終判断**: 文脈依存か Strong 単位で確定できるかの判断

---

## 4. 監査群ごとの設計まとめ

| Group | 対象 | tokens | 設計書参照 | 監査単位 | 難易度 |
|-------|------|--------|-----------|---------|--------|
| A | 内容語 plain | 39,310 | 本文書 §3 | Strong + token（AMBIGUOUS のみ） | 中〜高 |
| B | εἰμί 述語構造 | 2,369 | `stage4-predicate-design.md` §2 | Strong 単位（22 Strongs 一括 + 疑問5件個別） | 中 |
| C | 否定副詞 | 2,494 | `stage4-predicate-design.md` §3 | 機能的確認のみ（plain tokens の例外確認） | 低 |
| D | その他 tilde | 377 | `stage4-predicate-design.md` §4 | Strong 単位（16 Strongs + G756 個別確認） | 低〜中 |
| E | 内容語 bracket | 142 | `stage4-predicate-design.md` §5 | 一括確認 OK | 低 |
| F | pron plain | 5,544 | `stage4-pron-design.md` §2 | Strong 単位 + 文脈サンプル | 低〜中 |
| G | pron 関係代名詞 | 1,657 | `stage4-pron-design.md` §2-G | Strong 単位（3 Strongs） | 低〜中 |
| H | G4671 | 69 | `stage4-pron-design.md` §2-H | 方針確定後 | 低 |
| Z | 機能語 | 40,990 | — | 除外 | — |

---

## 5. Group A の優先順位

### Tier 1（n ≥ 200, 20 Strongs, 8,724 tokens）— 最高優先

| Strong | n | cls | ja |
|--------|---|-----|----|
| G3004 | 1,164 | verb | 言う |
| G3956 | 884 | adj | すべての |
| G2036 | 866 | verb | 言う |
| G2192 | 679 | verb | 持つ |
| G1096 | 580 | verb | なる |
| G4160 | 520 | verb | 行う |
| G2064 | 505 | verb | 来る |
| G3708 | 424 | verb | 見る |
| G1325 | 380 | verb | 与える |
| G191 | 361 | verb | 聞く |
| G3056 | 330 | noun | ことば |
| G1492 | 284 | verb | 知る |
| G3762 | 234 | adj | 誰も〜ない |
| G2980 | 234 | verb | 語る |
| G611 | 231 | verb | 答える |
| G2983 | 225 | verb | 受ける |
| G1831 | 211 | verb | 出る |
| G1520 | 207 | adj | 一つ |
| G4183 | 204 | adj | 多くの |
| G2309 | 201 | verb | 望む |

### Tier 2（100 ≤ n < 200, 36 Strongs, 4,966 tokens）— 高優先

上位 10: G1097(知る,188), G3173(大きい,187), G1525(入る,187), G1125(書く,184), G3779(このように,179), G1410(できる,178), G40(聖なる,171), G2147(見つける,169), G2041(業,169), G2889(世界,162)

### Tier 3（50 ≤ n < 100, 79 Strongs, 5,548 tokens）— 中優先

### Tier 4（20 ≤ n < 50, 212 Strongs, 6,534 tokens）— 中優先

### Tier 5（10 ≤ n < 20, 347 Strongs, 4,585 tokens）— 低優先

### Tier 6（5 ≤ n < 10, 591 Strongs, 3,895 tokens）— 低優先

### Tier 7（n < 5, 2,910 Strongs, 5,058 tokens）— サンプリング

---

## 6. 実施順序案

```
Phase 4a: 前提確認（Stage 4 監査開始前）
  1. Group H (G4671) の方針確定 — S4 除外か pron 監査か
  2. pron class (F/G/H) の独立監査方針確認
  3. tilde 述語構造 (B/C/D) の「現状維持 vs 要修正」方針確認

Phase 4b: Group B/C/D/E 一括確認
  B: εἰμί 22 Strongs — Strong 単位語義確認 + 疑問5件 (G680/G1573/G567/G4823/G566) 個別調査
  C: 否定副詞 — plain tokens の理由確認
  D: 16 Strongs — Strong 単位 + G756 個別調査
  E: 4 Strongs — 一括 OK 確認

Phase 4c: Group A Tier 1-2（高頻度 56 Strongs, 13,690 tokens）
  verb: G3004/G2036/G2192/G1096/G4160/G2064/G3708/G1325/G191/G1492 等
  adj: G3956/G3762/G1520/G4183 等
  noun: G3056/G2041/G2889 等

Phase 4d: Group F/G（pron 監査）
  G: 関係代名詞 3 Strongs
  F: 高頻度 pron（G3450/G5101/G1473/G848/G2257: 2,287 tokens）

Phase 4e: Group A Tier 3-4（291 Strongs, 12,082 tokens）

Phase 4f: Group A Tier 5-6（938 Strongs, 8,480 tokens）

Phase 4g: Group A Tier 7（サンプリング, 2,910 Strongs, 5,058 tokens）
```

---

## 7. 未確定事項（UNKNOWN）— Stage 4 開始前に確定が必要

| # | 事項 | 推奨 |
|---|------|------|
| 1 | G4671（σοί 69 tokens）の扱い：S4 除外追加 or pron 監査 | S4 除外に追加推奨 |
| 2 | Group C（否定副詞 2,494 tokens）：語彙的監査が必要か現状維持か | 現状維持推奨 |
| 3 | Group G（関係代名詞 tilde）："〜する者" ラベルは OK か | 一括確認後に判断 |
| 4 | Tier 7（n<5, 2,910 Strongs）のサンプリング率 | 10%〜20%（291〜582 Strongs）を提案 |
| 5 | Stage 4 で判定できなかった AMBIGUOUS の処理方針（Stage 5 に送るか） | Stage 5 候補として分離 |

---

## 8. 変更禁止事項（全 Stage 4 を通じて）

- 聖書 JSON（bible_data）を変更しない
- token.japanese を変更しない（Stage A/B は監査・記録のみ）
- 既存承認済みデータ（ledger）を変更しない
- 恒久 BL・S4 除外セットを変更しない（G4671 の扱いを除く）
- Stage 4 全件監査の翻訳修正はこの設計書のスコープ外
- Stage 5（保留 49 件の再検討）に着手しない
- コミット・プッシュしない

---

## 9. NT 全件区分の最終確認

| 区分 | tokens | 検証方法 |
|------|--------|---------|
| stage3_pool 監査済み | 28,219 | pool.json ref 照合 |
| bl_excluded (恒久 BL) | 15,883 | Strong ∈ 6-set |
| s4_excluded (σύ 単数形) | 156 | Strong ∈ 4-set |
| ledger_approved | 148 | ledger ref 照合 |
| ledger_hold | 49 | ledger ref 照合 |
| ledger_taigai | 303 | ledger ref 照合 |
| stage2_only (pattern) | 31 | stage2 census 照合 |
| remaining (Stage 4 候補) | 92,952 | 上記以外 |
| **合計** | **137,741** ✅ | |

remaining 92,952 の全件が Group A〜H+Z に重複なく割り当て済み（`stage4-group-assignment.json` で確認可能）。
