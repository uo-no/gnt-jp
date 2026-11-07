# scripts/ — 運用ガイド

## 1. ディレクトリ区分

```
scripts/
  *.cjs / *.js       現役スクリプト（テスト・ビルド・監査）
  output/            現役スクリプトが出力する監査・カバレッジ結果（レポ内保持）
  archive/           凍結スクリプト（再実行を前提としない証跡置き場）
  archive/output/    凍結済み出力証跡
```

---

## 2. スクリプトの分類と実行方法

### 2-A. 現役テスト・検証（`package.json` の `test:*`）

```
npm run test:genitive               # 属格用法 regression
npm run test:re-phase1              # Phase 1 regression（re-phase1-audit.cjs を子実行）
npm run test:re-phase2              # Phase 2 regression
npm run test:re-phase3              # Phase 3 regression
npm run test:re-phase5              # Phase 5 regression
npm run test:re-stageA              # Stage A regression（re-stageA-audit.cjs を子実行）
npm run test:re-stageB              # Stage B regression（re-stageB-audit.cjs を子実行）
npm run test:re-stageD              # Stage D regression（re-stageD-audit.cjs を子実行）
npm run test:re-stageE              # Stage E regression
npm run test:re-syntax-completion   # Syntax completion regression
npm run test:re-semantic-completion # Semantic completion regression
npm run test:re-flowtree-adapter    # Flow-tree adapter regression
npm run test:re-flowtree-runtime    # Flow-tree runtime regression
npm run test:re-neighborhoodview    # NeighborhoodView regression
npm run test:re-apparatus           # Apparatus regression
npm run test:re-apparatus-ja-auto   # Apparatus ja-auto regression
npm run test:syntax-evidence-gating # Syntax evidence-gating regression
npm run test:studypanel-evidence-notes
npm run test:browser-layer3         # ブラウザ層 L3 (Playwright)
npm run test:browser-selector-contract
```

CI（VR-5 回帰ゲート等）はこのうち主要なものを実行する。

### 2-B. 安全網（直接実行できる追加スクリプト）

以下は `package.json` エントリが存在しないか、または `npm run` 以外の用途で直接呼ぶもの。

```
node scripts/rb-morph-diff-test.cjs                   # Phase R-b 形態論 diff 検証
node scripts/half-quantity-partitive-regression.cjs   # 半量・分詞 regression
node scripts/required-signal-groups-regression.cjs    # 必要信号グループ regression
node scripts/re-w2a-temporal-regression.cjs           # W2A 時間 regression
node scripts/re-w2b-relative-regression.cjs           # W2B 関係節 regression
node scripts/re-m8d-builder-syntax-adoption-regression.cjs
node scripts/search-cooc-test.cjs                     # 共起検索テスト
node scripts/search-term-test.cjs                     # 単語検索テスト
node scripts/re-apparatus-display-regression.cjs
node scripts/re-apparatus-ja-all-regression.cjs
node scripts/check-tokens.cjs                        # R-f RF-1: 同名トークンの値ドリフト検査（runtime ⇔ design-system）
node scripts/audit-ja1955-verse-integrity.cjs
node scripts/concept-audit.cjs                        # コンセプト監査（output/ へ書き込む）
node scripts/corpus-metrics.cjs    # npm run metrics でも可
node scripts/wallace-coverage.cjs  # npm run coverage でも可
node scripts/path-audit.js         # npm run audit でも可
node scripts/check-search-tool-styles.cjs              # R-f RF-2: search-tool computed-style プローブ（jsdom 要）
node scripts/check-index-styles.cjs                    # R-f RF-3/RF-4: index ベース層＋幅ブレークポイント出し分け＋ onboarding 注入CSS の computed-style プローブ（jsdom 要）
```

### 2-C. 現役ジェネレータ（`build:*`）

| npm script | スクリプト | 入力 | 出力 |
|---|---|---|---|
| `build:lexicon` | build-reading-lexicon.cjs | bible_data/, 語彙ソース | public/assets/data/reading-lexicon-data.js |
| `build:ln-gloss` | build-reading-ln-gloss.cjs | LN 対応表ソース | public/assets/data/reading-ln-gloss-data.js |
| `build:ln-final` | build-reading-ln-final.cjs | reading-ln-gloss-data.js | public/assets/data/reading-ln-final-data.js |
| `build:flow-tree` | build-flow-tree.cjs | work/SBLGNT/lowfat/*.xml | public/assets/data/flow-tree/{BOOK}/{ch}.json |
| `build:sr` | build-sr.cjs | bible_data/, flow-tree/ | public/assets/data/sr/{BOOK}/{ch}.json |
| `build:apparatus` | build-apparatus.cjs | work/apparatus/sblgnt_tei.xml | public/assets/data/apparatus.json |
| `build:apparatus-ja-auto` | build-apparatus-ja-auto.cjs | apparatus.json + マニュアル補正 | public/assets/data/apparatus-ja-auto.json |
| `build:apparatus-ja-phase2` | build-apparatus-ja-phase2.cjs | apparatus-ja-auto.json | public/assets/data/apparatus-ja-phase2.json |
| `build:apparatus-ja-phase3` | build-apparatus-ja-phase3.cjs | apparatus-ja-phase2.json | public/assets/data/apparatus-ja-phase3.json |
| `build:apparatus-lem-ja` | build-apparatus-lem-ja.cjs | apparatus.json | public/assets/data/apparatus-lem-ja.json |
| `build:apparatus-rdg-ja` | build-apparatus-rdg-ja.cjs | apparatus.json | public/assets/data/apparatus-rdg-ja.json |
| `build:search-index` | build-search-index.js | bible_data/ | public/search-index/{corpus}/{BOOK}.json |
| —（直接実行） | build-rk-offsets.cjs | Lowfat XML（rk-*属性入り） | public/assets/data/rk-offsets/{BOOK}.json |
| —（直接実行） | build-gloss-en-senses.cjs | public/assets/data/abbott-smith.tsv | public/assets/data/lexicon/gloss-en-senses.json |

**`build:flow-tree` の注意**: 書き込み前に既存の出力先をクリアする破壊的再生成。
`--dry` フラグで書き込みを省略し、変換結果の検証のみを行える。

```
node scripts/build-flow-tree.cjs --dry   # 検証のみ（出力ファイル不変）
npm run build:flow-tree                  # 実際の再生成（破壊的）
```

**生成系にガードを付けない理由**: 生成系スクリプトは冪等かつ決定的な再生成を前提とし、
`npm` および CI から直接呼ばれる。ドライランが意味を持つのは書き込みが副作用となる
データ反映系（§3 参照）であり、ビルド系は「再生成 = 正しい最新状態の確認」である。

---

## 3. データ書き込みのガード規約（house standard）

bible_data 等の **既存ファイルを変更する採用スクリプト** に適用する。
新規作成・現役化・改修のタイミングで以下を実装すること。

1. **既定はドライラン**: 引数なしで実行した場合、ファイルへの書き込みは一切行わない。
   対象ファイル数・変更件数・差分の要約を表示して終了する。

2. **ドライランの出力**: 適用予定の差分または変更件数・変更内容の要約を標準出力に表示し、
   実際のファイル（bible_data 等）は変更しない。

3. **`--apply` による反映**: 書き込みを行うには `--apply` フラグを明示する。
   書き込み前に `scripts/output/` へバックアップを出力し、
   適用後にファイルハッシュまたは変更件数を記録する。

**模範実装**: `scripts/archive/exec-adoption-reflection.cjs`

```javascript
const APPLY = process.argv.includes('--apply');
// ... 差分計算 ...
fs.writeFileSync('.../adoption-diff.json', ...);    // 常に出力（ドライランでも）
fs.writeFileSync('.../adoption-backup.json', ...);  // 書き込み前バックアップ
if (!APPLY) { console.log('DRY-RUN 完了。--apply で反映。'); process.exit(0); }
// ... bible_data への書き込み ...
backup.postHash = postHash;
fs.writeFileSync('.../adoption-backup.json', ...);  // post-hash を追記
```

---

## 4. archive の意味と個別メモ

`scripts/archive/` は証跡として凍結したスクリプト置き場である。
再実行を前提としない。`__dirname` 相対でパスを組むため、移動後はそのままでは実行不能。

### 個別メモ

**sync-abbott-smith.js**  
入出力パスが旧配置（リポジトリ直下 `data/` および `lexicon/`）のままになっている。
復活させる場合は、現行の `public/assets/data/` 配下への付け替えと
§3 のガード規約の適用が必要。

**build-syntax-index.js・clause-analyzer-test.js**  
archive への移動時点で既に実行不能だった（旧配置のパス参照が残っていた）。

**build-morph-index.js・pack-morph-index.js**  
消費側（morph-search.html）が PR #578 で引退済みのため凍結。
生成物 `public/morph-index/` の引退は別 PR で扱う。

**JA1955 Stage 1–4 監査・適用スクリプト群（2026-11-07 追加）**  
`archive/` 直下の `apply-*` / `audit-*` / `phase4*` / `stage4-*` / `build-ja1955-ledger.cjs` / `dryrun-ja1955-apply.cjs` / `run-morph-index.cjs` 等69件と、`archive/output/` 配下の報告書（.md）・台帳（ja1955-full-audit／stage4-final／stage4-prep の各レポート＋ja1955-nt-ledger.json）は、bible_data の japanese を口語訳（JA1955）へ対応付ける監査（Stage 1–4）の証跡。成果は PR #471／#472／#624／#626 で本採用済み。元は backup/local-wip-2026-11-05 ブランチにのみ存在したものを、サイズの大きい中間データ（プール・スナップショット zip・72MB の nt-audit.json 等）を除いて移入した。除いた中間データは同 backup ブランチに残置。
