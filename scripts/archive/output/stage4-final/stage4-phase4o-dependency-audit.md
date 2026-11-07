# Stage 4 Phase 4o — G1210 Strong/lemma修正 依存関係監査

**Phase**: 4o  
**作成日**: 2026-11-02  
**ステータス**: DEPENDENCY AUDIT COMPLETE — READY FOR IMPLEMENTATION DESIGN  
**調査モード**: READ ONLY（データ変更・コード変更なし）  
**根拠**: `stage4-phase4n-token-audit.json` (MISMATCH判定 95件)

---

## 1. 監査スコープ

### 対象トークン

| クラスター | 件数 | 誤登録内容 | 正しいTarget |
|-----------|-----|-----------|-------------|
| dei-necessity | 85 | G1210/δέω/grc:G1210 → δεῖ形態 | G1163/δεῖ/grc:G1163 |
| deom-hold | 10 | G1210/δέω/grc:G1210 → δέομαι形態 | G1189/δέομαι/grc:G1189 |
| **合計** | **95** | | |

### 変更対象フィールド（トークンレコード）

| フィールド | 変更内容 | 非変更フィールド |
|-----------|---------|---------------|
| `strong` | G1210 → G1163/G1189 | `text`, `morph`, `role`, `class`, `person`, `number`, `tense`, `voice`, `mood` |
| `lemma` | δέω → δεῖ/δέομαι | `ln` (各トークンの現在値を維持) |
| `lemmaId` | grc:G1210 → grc:G1163/grc:G1189 | `domain` (同上) |
| `japanese` | 縛る → 〜しなければならない/願う | `english`, `gloss`, `frame`, `subjref` |

---

## 2. 依存関係マップ

```
bible_data (primary source)
  ├─ reading-lexicon-data.js      ← build-reading-lexicon.cjs で再ビルド [REBUILD]
  ├─ reading-ln-gloss-data.js     ← 変更不要 (G1163/G1189マッピング既存) [NO CHANGE]
  ├─ search-index/nt/*.json       ← build-search-index.js で再ビルド [REBUILD]
  ├─ lexicon-lite.json            ← 手動更新（ビルドスクリプトなし） [MANUAL]
  ├─ domains-cluster-index.json   ← 手動更新（ビルドスクリプトなし） [MANUAL]
  └─ domains-ln-index.json        ← 手動更新（ビルドスクリプトなし） [MANUAL]

reading-engine.js                 ← 変更不要 [NO CHANGE]
re-stageB-regression.cjs          ← ベースライン更新が必要 [UPDATE AFTER]
```

---

## 3. ファイル別 影響分析

### 3.1 bible_data (primary)

- **変更方法**: Node.jsスクリプト（Phase 4m と同一パターン）
- **変更ファイル数**: 最大48ファイル（19書・各章ファイル）
- **影響書**: 1CO, 1PE, 1TH, 1TI, 2CO, 2PE, 2TH, 2TI, ACT, COL, EPH, HEB, JHN, LUK, MAT, MRK, REV, ROM, TIT
- **変更フィールド**: strong, lemma, lemmaId, japanese（4フィールド/トークン）
- **ガード条件**: 実行前に current.strong === "G1210" を確認（誤適用防止）
- **注意**: deom-holdの ln/domain は ALREADY CORRECT（変更しない）

### 3.2 reading-lexicon-data.js

- **場所**: `public/assets/data/reading-lexicon-data.js`
- **更新方法**: `node scripts/build-reading-lexicon.cjs`（自動再ビルド）
- **変化内容**:
  - G1210: japanese集計から dei-necessity/deom-hold のトークンが除外される（残: deo-bind 43件のみ）
  - G1163: 85件のトークンが追加される（追加日本語: 〜しなければならない）
  - G1189: 10件のトークンが追加される（追加日本語: 願う）
- **必須タイミング**: bible_data変更後

### 3.3 reading-ln-gloss-data.js

- **変更**: **不要**
- **根拠**:
  - G1163: `{ "71.21": "〜しなければならない", "71.34": "〜しなければならない" }` — 既存、正しい
  - G1189: `{ "33.17": "願う" }` — 既存、正しい
  - G1210: 71.21/71.34/33.17エントリが残るが、これらのln値を持つG1210トークンは移行後ゼロになる（reading-engine.jsはlemmaIdでlookupするため、移行後のG1163/G1189トークンにG1210エントリは参照されない）

### 3.4 lexicon-lite.json

- **場所**: `public/assets/data/lexicon/lexicon-lite.json`
- **更新方法**: 手動（ビルドスクリプトなし）
- **変化内容**:
  | Strong | 現在count | 移行後count |
  |--------|---------|-----------|
  | G1163 | 16 | 101 |
  | G1210 | 138 | 43 |
  | G1189 | 12 | 22 |
- **副次問題（DEFERRED）**:
  - G1210 `gloss: "It behooves"` — δέω の字義として不正確（δεῖの字義）。count修正と同タイミングで要修正だが別Issue。
  - G1189 `gloss_ja: "必要とする"` — 不正確（正: 願う/お願いする）。同上。
- **必須タイミング**: bible_data変更後

### 3.5 domains-cluster-index.json

- **場所**: `public/assets/data/index/domains-cluster-index.json`
- **更新方法**: 手動（ビルドスクリプトなし）
- **根拠**: deo-bindクラスター（43件）のln分布を実データで確認 → 18.13/23.157/37.114/37.33/37.45/37.46 のみ。71.xxx/33.17は**ゼロ**。
- **変化内容**:
  | domainCode | 現在 | 移行後 |
  |-----------|------|-------|
  | 33012 | grc:G1210を含む | grc:G1210を除去（deom-hold移行後はゼロ） |
  | 71004 | grc:G1163とgrc:G1210の両方を含む | grc:G1210を除去 |
  | 71005 | grc:G1163とgrc:G1210の両方を含む | grc:G1210を除去 |
  | 071004 | grc:G1210を含む | grc:G1210を除去 |
  | 071005 | grc:G1210を含む | grc:G1210を除去 |
- **UIへの影響**: `_clusterIndexData[domainCode].lemmas` でG1210が誤表示されなくなる
- **必須タイミング**: bible_data変更後

### 3.6 domains-ln-index.json

- **場所**: `public/assets/data/index/domains-ln-index.json`
- **更新方法**: 手動（ビルドスクリプトなし）
- **変化内容**:
  | ln | 現在 | 移行後 |
  |----|------|-------|
  | 33.17 | grc:G1210を含む | grc:G1210を除去 |
  | 71.21 | grc:G1210を含む | grc:G1210を除去 |
  | 71.34 | grc:G1210を含む | grc:G1210を除去 |
- **UIへの影響**: `_lnIndexData[ln].lemmas` でG1210が誤表示されなくなる
- **必須タイミング**: bible_data変更後

### 3.7 search-index/nt/*.json

- **場所**: `public/search-index/nt/*.json`
- **更新方法**: `node scripts/build-search-index.js`（全巻一括再生成）
- **変化内容**: 95トークンの `strong`/`lemmaId`/`lemma`/`japanese` がbible_dataと同期
- **影響書**: 19書（dei-necessity+deom-hold分布書）
- **必須タイミング**: bible_data変更後
- **リスクが残る場合**: 検索でG1210検索→G1163/G1189トークンがヒットしない（逆にG1163/G1189検索→これらのトークンがヒットしない）

### 3.8 reading-engine.js

- **変更**: **不要**
- **根拠**:
  - `_MORPH_STEM_RULES`: G1210/G1163/G1189 を含まない（G3739/G3748/G3745/G1249 等のみ）
  - `_RELATIVE_STRONGS`: G3739/G3748/G3745 のみ
  - `getSemanticInfo()`: G5101/G5100/G846 のみ
  - `_morphStem()`: `token.strong → _MORPH_STEM_RULES[strong]` — G1210は対象外
  - lemmaIdによるlexicon/lnGlossアクセスはdynamic（lemmaId変更で自動的に正しい辞書を参照）
- **CONFIRMED**: reading-engine.js 全体精査済み

### 3.9 re-stageB-regression.cjs（ベースライン）

- **変更**: bible_data変更・rebuilds 実施後に必要
- **予測**: japanese + lemmaId変更により chip出力が変化 → changed/identical/brokenOld が変動
- **必須条件**: brokenNew=0 および panelMismatch=0 は引き続き0を維持すること
- **手順**: FROZEN §29 Protocol（re-stageB実行 → サンプルレビュー → 意図的改善を確認 → ベースライン更新）

---

## 4. 変更実行推奨順序

```text
Step 1: bible_data 95件変更（strong/lemma/lemmaId/japanese）
  └─ 前提: current.strong === "G1210" の事前確認
  └─ 前提: deom-hold の ln/domain は変更しない

Step 2: reading-lexicon-data.js 再ビルド
  └─ node scripts/build-reading-lexicon.cjs

Step 3: search-index/nt/*.json 再ビルド
  └─ node scripts/build-search-index.js

Step 4: lexicon-lite.json 手動更新
  └─ G1163 count: 16→101
  └─ G1210 count: 138→43
  └─ G1189 count: 12→22
  └─ （推奨）G1210 gloss修正 / G1189 gloss_ja修正

Step 5: domains-cluster-index.json 手動更新
  └─ 33012/71004/71005/071004/071005 から grc:G1210 を除去

Step 6: domains-ln-index.json 手動更新
  └─ 33.17/71.21/71.34 から grc:G1210 を除去

Step 7: 回帰テスト実行
  └─ npm run test:re-phase1
  └─ npm run test:re-stageB（FAIL想定→サンプルレビュー→ベースライン更新）
  └─ npm run test:re-stageA
  └─ npm run test:re-stageD

Step 8: re-stageB-regression.cjs ベースライン更新
  └─ brokenNew=0, panelMismatch=0 維持を確認後のみ更新
```

---

## 5. リスク評価

| リスク | 深刻度 | 対策 |
|--------|-------|-----|
| 誤った Strong へ変更（前提確認なし） | HIGH | 実装スクリプトで事前に strong===G1210 を確認 |
| deom-hold の ln/domain を誤って変更 | HIGH | ln/domain は変更対象外と明示（migration-planに記録） |
| deo-bind 43件への誤適用 | HIGH | cluster フィールドで DEI-NECESSITY/DEOM-HOLD のみを対象とする |
| search-index 未更新で検索不整合 | MEDIUM | 実装後に rebuild をチェックリストに含める |
| ドメインインデックス未更新 | LOW | UIのドメイン逆引きが不正確になるが機能は維持 |
| re-stageB baseline未更新 | LOW | テストが FAIL になるが意図的な変化で修正可能 |
| brokenNew > 0 になる | CRITICAL | 実装後すぐに re-stageB 実行して確認。0でない場合は即座に調査 |

---

## 6. 影響を受けないファイル（確認済み）

| ファイル | 理由 |
|---------|------|
| `reading-engine.js` | G1210/G1163/G1189固有ロジックなし（全精査済み） |
| `reading-ln-gloss-data.js` | G1163/G1189マッピング既存・正しい |
| `re-phase1 / re-stageA / re-stageD テスト` | bible_data.japanese変化は僅少（95件/137741件）、これらのテストはPASS見込み |
| `morph-rule-engine` | Strong特有ルール対象外 |
| `syntax-analyzer.js` | Strong非依存 |
| `presentation-policy.js` | Strong非依存 |
| `phrase-renderer.js` | Strong非依存 |

---

## 7. 前回との差分（Phase 4m との違い）

Phase 4m は `token.japanese` 1フィールドのみの変更だったため、ダウンストリーム影響は re-stageB のみだった。

Phase 4o は `strong`/`lemma`/`lemmaId` を変更するため、lexicon lookup（reading-engine.js Phase 4）・search-index・domain indexのすべてに影響する。ダウンストリームの更新（rebuild 2件 + 手動更新 3件）が必須。

---

## 8. 結論

- 変更対象ファイル: bible_data（最大48件）+ 6ファイル（rebuild/手動）
- 変更不要ファイル: reading-engine.js, reading-ln-gloss-data.js
- ビルドスクリプトで自動更新可能: reading-lexicon-data.js, search-index
- 手動更新が必要（スクリプトなし）: lexicon-lite.json, domains-cluster-index.json, domains-ln-index.json
- 回帰テスト: re-stageB baseline更新が必要（brokenNew=0/panelMismatch=0 維持を確認してから）

---

## 成果物

| ファイル | 内容 |
|---------|------|
| `stage4-phase4o-dependency-audit.md` | 本報告書 |
| `stage4-phase4o-reference-inventory.json` | 参照箇所全一覧（修正要否・方法・タイミング） |
| `stage4-phase4o-migration-plan.json` | 95件 ref別 現在値/提案値（4フィールド） |
| `stage4-phase4o-test-plan.md` | テスト計画 |
