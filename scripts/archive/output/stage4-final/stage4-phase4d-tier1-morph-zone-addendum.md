# Stage 4 Phase 4d — Tier 1 morph × zone 層別設計補足

生成日: 2026-10-31  
スクリプトバージョン: v2.0.0  
対象: Group A Tier 1（n≥200、20 Strongs、8,724 tokens）

---

## 1. 設計根拠

### 1.1 計画仕様（stage4-tier7-sampling-plan.md §1.3 Tier 1）

```
層別次元: 書巻区分（4区）× 形態（tense × mood）
サンプル数/Strong: 15〜20 tokens
最小保証: 各書巻区分から最低 2 tokens
```

この仕様は 2 次元の層別を要求する。Phase 4d 初期実装では group-assignment.json に morph データがないため Zone 1 次元のみで実装し DEFERRED とした。本補足でこれを解消する。

### 1.2 morph データ取得元

- `public/bible_data/nt/{BOOK}/{ch}.json` の各 token が `tense`, `voice`, `mood` フィールドを持つ（実データ確認済）
- `buildMorphLookup(bibleDataPath, refs)` で全 8,724 Tier 1 ref を一括ロード
- 260 章ファイル（NT 全章）をロード、欠落ゼロ

---

## 2. morph グループ分類

### 2.1 動詞（morph 先頭 `V-`）

bible_data の `tense`, `mood` フィールドを使用。

| フィールド | 値の例 | コード例 |
|-----------|--------|---------|
| `tense` | "present", "aorist", "future", "imperfect", "perfect", "pluperfect" | PRS, AOR, FUT, IPF, PRF, PPF |
| `mood` | "indicative", "subjunctive", "optative", "imperative", "infinitive", "participle" | IND, SUB, OPT, IMP, INF, PTC |

形態グループキー: `V.{TENSE}.{MOOD}` — 例: `V.AOR.IND`, `V.PRS.PTC`

**第2アオリスト区別**: morph コードが `V-2` で始まる場合は `V.2AO.{MOOD}` として独立分類。bible_data の `tense`/`mood` フィールドでは第1・第2アオリストが同一表記になるため、morph コード文字列で判別。

### 2.2 非動詞

| morph 先頭 | グループ |
|-----------|---------|
| `N-` | NOUN |
| `A-` | ADJ |
| `ADV` | ADV |
| `PRT-` | PRT |
| `R-`, `P-` | PRON |
| `D-` | DEM |
| `CONJ` | CONJ |
| (不明) | UNKNOWN |

非動詞（名詞・形容詞等）は格・数・性を morph グループに含めない。格変化は形態的多様性として重要だが、「tense × mood」の設計仕様外であり、単一グループとして扱う（非動詞 Strong は全 Tier 1 の一部: G1520, G3056, G3762, G3956, G4183）。

---

## 3. 少数層（small cell）全件確認ルール

### 3.1 しきい値の決定

少数層しきい値（SMALL_CELL_THRESHOLD）の選択肢を実データで検証した。

| しきい値 | 全 Tier 1 の small セル | small セルのトークン総数 | 平均/Strong | 問題 |
|---------|----------------------|----------------------|-----------|------|
| n=1 | 114 | 114 | 6 | なし |
| n=2 | 172 | 230 | 12 | G1096/G1831/G3708 が 20件超 |
| n=3 | 225 | 389 | 19 | 多くの Strong が 20件超 |

**採用: SMALL_CELL_THRESHOLD = 1**（n=1 のセルを全件確認対象とする）

#### 理由
- threshold=1: 最大でも 13 件/Strong（G2983）の small セルトークンとなり、残り 7 件を large セルから補完することで合計 20 件に収まる
- threshold=2: G1096（27件）・G1831（28件）・G3708（25件）の small セルだけで目標 20 件を超え、計画の「15〜20 tokens」レンジを外れる
- n=1 のセルは当該 (zone, morph) の唯一の代表事例であり、確率的サンプリングの対象外にすべき

#### 論拠
計画の書巻区分最低保証「各書巻区分から最低 2 tokens」と同じ精神で適用する: zone 内で唯一の morph グループは全件確認（n=1 → 自明に全件）。n≥2 のセルは zone 比例配分の予算内でのみ採用される。budget < 大セル数 の場合（例: 残り 7 件に対し大セル 37 個）、採用ゼロのセルが生じる（次節参照）。

### 3.2 アルゴリズム概要

```
1. (zone, morphGroup) セルを構築
2. n=1 のセル → 無条件に全 token を選択（small cell full scan）
3. 残り予算 = target(20) - small_cell_total
4. n≥2 のセルから zone 比例配分（minimum 2/zone を維持）
5. 各 zone 内では morph group round-robin で多様性を最大化（保証ではない）
6. 合計 = small_cell_total + large_allocation ≤ 20
```

**保証される条件と保証されない条件（Phase 4d 最終監査で確認・修正）**

| 条件 | 保証 | 実測 |
|------|------|------|
| n=1 セルの全件採用 | **保証** | 全 20 Strongs で充足 |
| 各 zone から最低 2 tokens | **保証** | 全 20 Strongs で充足 |
| n≥2 セルから最低 1 token | **保証しない** | 434 大セル中 244 セル（56%）が採用ゼロ |
| 各 zone 内での morph 多様性最大化 | ベストエフォート | round-robin で zone 予算内の上位 morph G を優先採用 |

---

## 4. 実データ検証結果

### 4.1 全 Tier 1 Strong の morph × zone 結果

| Strong | n | 母集団 morph G | サンプル morph G | small cells | small tok | sampled |
|--------|---|--------------|----------------|------------|----------|---------|
| G191 | 361 | 14 | 12 | 6 | 6 | 20 |
| G611 | 231 | 7 | 7 | 1 | 1 | 20 |
| G1096 | 580 | 19 | 12 | 13 | 13 | 20 |
| G1325 | 380 | 19 | 12 | 13 | 13 | 20 |
| G1492 | 284 | 5 | 5 | 5 | 5 | 20 |
| G1520 | 207 | 2 | 2 | 0 | 0 | 20 |
| G1831 | 211 | 12 | 11 | 8 | 8 | 20 |
| G2036 | 866 | 6 | 6 | 2 | 2 | 20 |
| G2064 | 505 | 13 | 11 | 7 | 7 | 20 |
| G2192 | 679 | 12 | 9 | 4 | 4 | 20 |
| G2309 | 201 | 9 | 8 | 8 | 8 | 20 |
| G2980 | 234 | 14 | 10 | 7 | 7 | 20 |
| G2983 | 225 | 15 | 14 | 13 | 13 | 20 |
| G3004 | 1164 | 10 | 10 | 7 | 7 | 20 |
| G3056 | 330 | 1 | 1 | 0 | 0 | 20 |
| G3708 | 424 | 15 | 12 | 9 | 9 | 20 |
| G3762 | 234 | 1 | 1 | 0 | 0 | 20 |
| G3956 | 884 | 1 | 1 | 0 | 0 | 20 |
| G4160 | 520 | 19 | 12 | 6 | 6 | 20 |
| G4183 | 204 | 2 | 2 | 1 | 1 | 20 |

- 全 20 Strongs で sampled = 20（目標達成）
- morph 欠落: **0件**（bible_data から 8,724 件全件ロード成功）
- 重複 ref: **0件**
- method: 全 Strongs が `morph_zone_stratified_2d`

### 4.2 morph カバレッジの評価

| 観察 | 内容 |
|------|------|
| 動詞 Strong（n=580, morph=19）| 19 morph グループのうち 12 グループがサンプルに含まれる（63%）|
| 小規模動詞 Strong（G611, n=231, morph=7）| 7 morph グループ全件をカバー（100%）|
| 非動詞 Strong（G3056/G3762/G3956）| morph=1 グループ → 事実上の zone 層別のみ（設計上適切）|
| small cells（n=1）の寄与 | G2983: 13 small tokens すべて小数 morph-zone cell。多様な活用形が保証収録 |

---

## 5. v1 との差分

| 項目 | v1（zone 層別のみ） | v2（morph × zone） |
|------|------------------|-----------------|
| Tier 1 method | `zone_stratified_4zone` | `morph_zone_stratified_2d` |
| 総サンプル | 16,548 | 16,548（変化なし） |
| Tier 1 サンプル | 400 | 400（変化なし）|
| JUD Tier 1 サンプル | 0 | 2（+2）|
| morph カバレッジ記録 | なし | あり（全 Strong） |
| small cell 保証 | なし | n=1 cells 全件保証 |
| 再現性 | 確認済み | 確認済み |

総サンプル数が変わらない理由: 各 Strong の target は 20 のまま。morph 層別は「どの tokens を選ぶか」を変えるが「何件選ぶか」は変えない。

---

## 6. 設計制約の遵守

| 制約 | 状態 |
|------|------|
| bible_data JSON 変更禁止 | 変更なし（読み取り専用） |
| token.japanese 変更禁止 | 変更なし |
| 承認済みデータ変更禁止 | 変更なし |
| Phase 4a〜4c 成果物変更禁止 | 変更なし |
| Group A 本監査開始禁止 | 未開始（dry-run のみ） |
| commit / push 禁止 | 未実行 |
