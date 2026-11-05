# Stage 4 Phase 4o — テスト計画

**Phase**: 4o  
**作成日**: 2026-11-02  
**ステータス**: READY FOR IMPLEMENTATION DESIGN  
**対象**: G1210 Strong/lemma修正 95件（dei-necessity 85 + deom-hold 10）

---

## 1. テスト概要

Phase 4o の実装後に必要なテストを定義する。Phase 4m と異なり、`strong`/`lemma`/`lemmaId` の変更により reading-engine.js の Phase 4（lexicon/lnGloss lookup）の出力が変化するため、stageB の変化件数は Phase 4m より大きい可能性がある。

---

## 2. テスト区分

### T1: 実装前提条件確認（PRECONDITION）

実装スクリプト実行前に確認する事項。

| チェック | 期待値 | 根拠 |
|---------|-------|------|
| 95件すべて `current.strong === "G1210"` | True（0件の例外） | 誤対象への適用防止 |
| dei-necessity 85件の `current.text` は δεῖ形態（δεῖ/δεῖν/δέῃ/δέον/δέοντα等） | True | 内部整合性確認 |
| deom-hold 10件の `current.text` は δέομαι形態 | True | 内部整合性確認 |
| deo-bind 43件が変更対象に含まれていないこと | True | 誤適用防止 |
| 変更対象外: HOLD_DATA_QUALITY以外の G1210トークンがゼロ | True | 範囲外変更防止 |

### T2: 実装後 bible_data 確認（DATA INTEGRITY）

| チェック | 期待値 |
|---------|-------|
| dei-necessity 85件: `strong === "G1163"` | 85件全件 |
| dei-necessity 85件: `lemma === "δεῖ"` | 85件全件 |
| dei-necessity 85件: `lemmaId === "grc:G1163"` | 85件全件 |
| dei-necessity 85件: `japanese === "〜しなければならない"` | 85件全件 |
| deom-hold 10件: `strong === "G1189"` | 10件全件 |
| deom-hold 10件: `lemma === "δέομαι"` | 10件全件 |
| deom-hold 10件: `lemmaId === "grc:G1189"` | 10件全件 |
| deom-hold 10件: `japanese === "願う"` | 10件全件 |
| deom-hold 10件: `ln` 変更なし（33.17のまま） | 10件全件 |
| deom-hold 10件: `domain` 変更なし（33012のまま） | 10件全件 |
| deo-bind 43件: すべてのフィールド変更なし | 43件全件 |
| G1163 既存 16件: 変更なし | 16件全件 |
| G1189 既存 12件: 変更なし | 12件全件 |
| bible_data JSON構文エラー | 0件 |
| token追加・削除 | 0件 |

### T3: 集計確認（COUNTS）

| 項目 | 移行前 | 移行後 |
|------|-------|-------|
| G1210トークン数 | 138 | 43（deo-bindのみ） |
| G1163トークン数 | 16 | 101（+85） |
| G1189トークン数 | 12 | 22（+10） |
| 合計 | 166 | 166（不変） |

### T4: 回帰テスト（REGRESSION）

#### T4-1: re-phase1

```shell
npm run test:re-phase1
```

- **期待**: ALL PASS（bible_dataの主要構造変更なし）
- **変化があった場合**: morph/syntax解析への影響を調査

#### T4-2: re-stageA

```shell
npm run test:re-stageA
```

- **期待**: PASS（stageAはlexicon/japanese以外の構造テスト）

#### T4-3: re-stageD

```shell
npm run test:re-stageD
```

- **期待**: PASS

#### T4-4: re-stageB（主要回帰）

```shell
npm run test:re-stageB
```

- **初回**: FAIL（期待値変化のため）
- **確認手順**:
  1. `scripts/output/re-stageB-audit.json` の `stats` を確認
  2. `scripts/output/re-stageB-samples.md` のサンプルをレビュー
  3. 各サンプルが `縛る → 〜しなければならない` または `縛る → 願う` の改善であることを確認
  4. `brokenNew === 0` であることを必ず確認（0でない場合は即座に調査・修正）
  5. `panelMismatch === 0` であることを確認
  6. 意図的改善であることを確認後のみ STAGEB_BASELINE を更新

- **ベースライン更新基準**:
  - `brokenNew === 0`（必須）
  - `panelMismatch === 0`（必須）
  - 差分サンプルがすべて「縛る」→ 正しい訳語の改善であること（必須）
  - 変化件数が 95件前後の合理的な範囲であること（参考：Phase 4mは132件変更で−13件変化）

#### T4-5: ビルド成果物の再確認

| テスト | 内容 |
|-------|------|
| reading-lexicon-data.js rebuild | build後: G1163に「〜しなければならない」を含む / G1189に「願う」を含む / G1210に「縛る」のみ（binding義のみ） |
| search-index rebuild | 95件のref: strong/lemmaIdが新値 |
| lexicon-lite.json 手動更新後 | count: G1163=101, G1210=43, G1189=22 |

### T5: 代表ケース検証（SPOT CHECK）

移行後のbible_dataから代表ケースを確認する。

#### dei-necessity サンプル

| ref | text | 確認ポイント |
|-----|------|-----------|
| JHN 3:7!6 | δεῖ | strong=G1163, lemma=δεῖ, japanese=〜しなければならない |
| MAT 17:10!4 | δεῖ | 同上 |
| ACT 1:16!3 | ἔδει（既存G1163） | 変更なし（G1163のまま） |
| 1CO 8:2!9 | δεῖ | strong=G1163, ln=71.34（変更なし）, domain=71005（変更なし） |

#### deom-hold サンプル

| ref | text | 確認ポイント |
|-----|------|-----------|
| MAT 9:38!1 | δεήθητε | strong=G1189, lemma=δέομαι, japanese=願う, ln=33.17（変更なし） |
| LUK 8:38!1 | ἐδεῖτο | 同上 |
| LUK 22:32!3 | ἐδεήθην | 同上 |

#### deo-bind（変更なし確認）

| ref | text | 確認ポイント |
|-----|------|-----------|
| ACT 9:2!21 | δήσας | strong=G1210のまま, japanese変更なし |
| MAT 12:29!3 | δήσῃ | 同上 |

### T6: 手動更新ファイル確認

| ファイル | 確認内容 |
|---------|---------|
| lexicon-lite.json | G1163 count=101, G1210 count=43, G1189 count=22 |
| domains-cluster-index.json | domainCode 33012/71004/71005/071004/071005 の lemmas[] に grc:G1210 が含まれないこと |
| domains-ln-index.json | ln 33.17/71.21/71.34 の lemmas[] に grc:G1210 が含まれないこと |

---

## 3. テスト実行順序

```
1. T1: 前提条件確認（実装スクリプト内で自動化）
2. 実装: bible_data 95件変更
3. T2/T3: bible_data データ整合性確認
4. T4-4の前に: reading-lexicon rebuild + search-index rebuild
5. T4-1: re-phase1
6. T4-2: re-stageA
7. T4-3: re-stageD
8. T4-4: re-stageB（FAIL→サンプルレビュー→ベースライン更新）
9. T5: スポットチェック
10. T4: 手動更新ファイルの確認
11. T4-4再実行: ベースライン更新後 PASS を確認
```

---

## 4. 既存テストへの影響

| テスト | 影響 | 理由 |
|-------|------|-----|
| re-phase1 | 影響なし（PASS維持見込み） | morph解析はStrong非依存 |
| re-stageA | 影響なし（PASS維持見込み） | stageAはFlow Chip前段 |
| re-stageD | 影響なし（PASS維持見込み） | stageD対象はStrong非依存 |
| re-stageB | **影響あり** — ベースライン更新が必要 | lemmaId変化→lexicon/lnGloss変化→chip出力変化 |

---

## 5. STOP条件

以下のいずれかに該当する場合、実装を停止してユーザーへ報告する。

- T1（前提条件）で G1210 以外の Strong が見つかった場合
- deo-bind 43件に変更が適用されていた場合
- re-stageB実行後 `brokenNew > 0` になった場合
- re-stageB実行後 `panelMismatch > 0` になった場合
- サンプルレビューで「縛る→縛る」など改善なし/悪化が見つかった場合
- JSON構文エラーが発生した場合

---

## 6. 不変基準値

Phase 4o 実装後も以下を維持する（FROZEN §29 Protocol）。

| 項目 | 必須条件 |
|------|---------|
| brokenNew | = 0（絶対条件） |
| panelMismatch | = 0（絶対条件） |
| bible_data token総数 | 137,741（不変） |
| deo-bind 43件 | 全フィールド変更なし |
| G1163既存16件 | 変更なし |
| G1189既存12件 | 変更なし |
