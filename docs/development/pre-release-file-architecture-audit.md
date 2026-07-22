# Pre-Release File Architecture Audit（リリース前ファイル構成監査）

実施日: 2026-07-22
監査者立場: **リリース前アーキテクチャ監査担当**。Git 管理ファイル構成を監査し、**フォルダ整理方針を提案**する。
**本 Stage は監査・提案のみ。ファイル移動・削除・変更は行わない。**
前提: 全作業はコミット済(直近 `d5109f89`・作業ツリークリーン)。Reading Japanese / Reading Hint v1 完成後。

**基本方針**: 急いで削除・大規模変更を提案しない。「残すべき資産／整理すべき資産／不要候補」を**分類**する。

---

# 1. 現在構成評価

## 良い点

- **一時ファイルの track なし**——「* 2.json」(クラウド同期重複)・.DS_Store・.bak 等は git 管理下に 0。
- **全作業がコミット済**でリリース前の作業ツリーがクリーン。
- **runtime データと設計文書は概ね分離**——アプリが読むデータは `public/assets/data/`、設計は `public/docs/`。
- **回帰 baseline が committed**——`scripts/output/re-phase*-audit.json` が版管理され再現可能。
- **reading-hints.json は正しく `public/assets/data/`**(runtime fetch する Editorial Asset)。
- **本文データ(bible_data / translations / morph-index)が量的主体**(計 4,300+ ファイル)で明確に分離。

## 問題点

- **`public/docs/` が 178 ファイルのフラット構成**——spec/policy(正典)・design・audit(56)・implementation(29)・
  report(17)・plan(9)・review(6)・freeze(5)が**種別も領域も混在**。Reading Japanese(31)/Reading Hint(13)/
  Morph/Syntax/Semantic/Relative/StudyPanel/Search-UI(15+)/Visual-UX が一階層に同居し、**正典と履歴の区別が
  つかない**。
- **root `docs/` にデータ(.tsv)が混入**——`consistency_report.tsv` / `disambiguation_rules.tsv` /
  `patch_*.tsv` / `query_*.tsv` / `ranking_weights.tsv` / `synonym_priority_map.tsv` / `syntax_patterns.tsv` /
  `wallace_ontology_merged.tsv`(計 12)は**人向け文書でなく検索/オントロジーのビルドデータ**であり、docs/ に
  ある位置づけが不明瞭。
- **`scripts/output/` の混在**——回帰に必須の baseline(re-phase*-audit.json)と、一回きりの監査出力
  (concept-audit / phrase-intent-audit 等)と、恒久資産(editorial-review-records.json=M-12 台帳・
  adoption-diff/backup.json=M-15 rollback)が同居し、**再生成可能物と保全必須物の区別がない**。

## リスク

- **正典の埋没**——`reading-japanese-specification.md`(正典)・`reading-japanese-policy.md`(L-0)が 178 件の
  中に平坦に並び、**どれが「今守るべき仕様」でどれが「凍結済み履歴」か**が新規参加者に判別困難。
- **コードコメントの docs パス不整合**——core の約 20 箇所が `docs/xxx.md` 形式で設計文書を参照するが、実体は
  `public/docs/xxx.md`(既に `docs/` ≠ `public/docs/` の不一致)。整理でさらに乖離しうる(runtime 影響なし・
  コメント/provenance の保守性リスク)。

---

# 2. ファイル分類

## A. 必ず残す

| 対象 | 理由 |
|---|---|
| **root `docs/README.md` / `LICENSE.md` / `DATA_LICENSE.md` / `architecture-rules.md`** | プロジェクト入口・ライセンス・設計規範。移動しない |
| **`public/docs/reading-japanese-specification.md`** | Reading Japanese 根幹仕様(正典・R-1) |
| **`public/docs/reading-japanese-policy.md`(L-0)** | 推論/翻訳禁止の根幹原則(全設計の上位) |
| **`public/docs/reading-hint-editorial-specification.md`(SP-5)ほか Reading Hint 現行仕様** | Editorial Asset の生きた仕様 |
| **`public/assets/data/reading-hints.json`** | 公開中の Editorial Asset(runtime) |
| **`public/assets/data/*.json / *.js`(registry/lexicon/policy/changelog/roadmap)** | runtime データ(移動禁止=fetch パス依存) |
| **`scripts/output/re-phase*-audit.json` ほか回帰 baseline** | 回帰テストが読む=**移動・gitignore 不可** |
| **`scripts/output/reading-japanese-editorial-review-records.json`(M-12 台帳)・`reading-japanese-adoption-diff.json`/`-backup.json`(M-15 rollback)** | 恒久資産・監査/rollback の一次情報 |
| **`public/core/*` / `public/index.html` / `public/css/*`** | アプリ本体 |
| **`bible_data/` / `translations/` / `morph-index/`** | 本文データ(保護対象) |

## B. 整理して移動推奨

### B-1. public/docs/ の 178 フラット → 種別サブフォルダ

- **現在**: `public/docs/*.md`(178 件・フラット)。
- **移動先案**: `public/docs/{specification,design,audit,report,history}/`(下記 §3)。
- **理由**: 正典・設計・監査・履歴を種別分離し、**「今守る仕様」と「凍結済み履歴」を可視化**する。特に
  audit(56)・implementation-report(29)は履歴性が高く、spec/policy と混ぜない。

### B-2. root docs/ の .tsv データ → データ置き場へ

- **現在**: `docs/consistency_report.tsv` ほか .tsv 計 12。
- **移動先案**: `docs/data/` もしくは `scripts/data/`(ビルド/検索データの置き場)。
- **理由**: 人向け文書でなくデータ。docs/ 直下から分離し、README/LICENSE と混ぜない。**参照元の有無を確認して
  から移動**(下記 §4)。

### B-3. scripts/output/ の一回きり監査出力 → 明示ディレクトリ

- **現在**: `scripts/output/` に baseline・恒久資産・一回きり監査が混在。
- **移動先案**: 恒久物は現状維持、一回きり監査出力は `scripts/output/adhoc/`(または gitignore・§E)。
- **理由**: 再生成可能物と保全必須物を分離。**baseline(re-phase*)は動かさない**。

## C. 履歴保存

| 対象 | 理由 |
|---|---|
| **各 Stage の design / implementation-report / audit / plan / review / freeze**(SP-*/M-* の凍結記録) | 設計判断の根拠・凍結プロトコルの証跡。**削除せず `public/docs/history/`(または reading-japanese/history)へ集約**して保存 |
| **Reading Hint v1 の SP-13〜SP-16・R-1〜R-5 の監査/改訂/統合記録** | 実装〜リリースの完全な監査証跡。履歴として保存 |
| **morph/syntax/semantic/relative/reflexive の design→implementation ペア** | Reading Engine の凍結履歴 |

## D. 削除候補

- **原則、積極的な削除は提案しない**(急がない方針)。
- **要レビュー(削除ではなく重複可能性の確認)**:
  - `reading-policy.md` / `reading-flow-gloss-policy.md` / `presentation-policy.md` と `reading-japanese-policy.md`
    の**役割重複の有無**——superseded なら履歴へ、現行なら A。**内容確認後に判断**(本監査では削除しない)。
  - `visual-weight-audit.md` / `visual-rhythm-audit.md` / `silence-audit.md` 等の**単発 UX 監査**——完了済で
    参照されないなら history 候補(削除ではない)。
- **判断保留**: どれも設計判断の証跡になり得るため、**削除前に「参照 0 かつ superseded」を二重確認**。

## E. .gitignore 候補

| 候補 | 理由 |
|---|---|
| `scripts/output/` の**一回きり監査出力**(concept-*, phrase-intent-* 等・再生成可能) | 生成物。ただし**回帰 baseline(re-phase*-audit.json)・M-12 台帳・M-15 diff は除外(必須 committed)**。個別指定が必要 |
| スクラッチ/一時(`/tmp` 相当・エディタ生成物) | 既に track 0 だが `.DS_Store` / `*~` / `.orig` を予防的に追加推奨 |

- **注意**: `scripts/output/` を丸ごと gitignore しては**ならない**(baseline・恒久資産が消える)。**ファイル単位/
  サブディレクトリ単位**で分ける。

---

# 3. 推奨フォルダ構成

**public/docs/(178 フラット)を種別で再編**(領域プレフィックスは維持):

```
public/docs/
├── specification/        # 正典・現行仕様（守るべきもの）
│   ├── reading-japanese-specification.md      ← 正典
│   ├── reading-japanese-policy.md（L-0）
│   ├── reading-hint-editorial-specification.md（SP-5）
│   ├── reading-hint-unit-trigger-design.md（SP-6・現行条件）
│   └── phrase-reading.md / presentation-policy.md（現行のもの）
├── design/               # 設計文書（design / data-model / workflow）
│   ├── reading-hint-data-model-design.md（SP-7）...
│   ├── morph-* / syntax-* / semantic-* / relative-* design
│   └── reading-japanese-builder-*-design.md
├── audit/                # 監査（品質・整合・IA・UX）
│   ├── reading-hint-v1-*-audit.md（SP-13/16 等）
│   ├── reading-japanese-lexical/rhetorical-*-audit.md
│   └── studypanel-* / search-* / visual-* audit
├── report/               # 実装報告・完成報告
│   ├── *-implementation-report.md
│   └── reading-hint-v1-completion-report.md（R-1）
└── history/              # 凍結済みの段階記録（変更しないアーカイブ）
    └── SP-* / M-* の design→implementation→freeze 一式（superseded 含む）

docs/（root）
├── README.md / LICENSE.md / DATA_LICENSE.md / architecture-rules.md
└── data/                 # .tsv ビルド/検索データを分離
    └── *.tsv（consistency_report / patch_* / query_* / wallace_ontology_merged 等）

scripts/output/
├── （baseline 必須: re-phase*-audit.json — 現状維持）
├── （恒久資産: editorial-review-records.json / adoption-diff/backup.json — 現状維持）
└── adhoc/                # 一回きり監査出力（gitignore 候補）
```

- **原則**: `specification`(守る)/ `design`(作った理由)/ `audit`(検めた記録)/ `report`(結果)/ `history`
  (凍結アーカイブ)。**正典を specification/ に集約**して「今守るべきもの」を明確化。

---

# 4. 移動によるリスク

| リスク | 詳細 | 対応 |
|---|---|---|
| **リンク切れ** | README の `[...](../public/docs/reading-japanese-specification.md)` は、正典を `specification/` へ移すと**切れる** | 移動と同時に README リンクを更新(1 箇所) |
| **参照パス変更** | core 約 20 箇所のコメントが `docs/xxx.md` を参照(既に `docs/`≠`public/docs/` の不整合・**runtime 非依存のコメント**) | runtime 影響なし。整理時にコメントの docs パスを是正(任意・段階的) |
| **README 影響** | README は `./LICENSE.md` / `./DATA_LICENSE.md` / `../public/assets/data/roadmap.json` を参照。**root docs/ の README/LICENSE は動かさない**方針なら影響なし。.tsv 移動は README 非参照(要確認) | root の README/LICENSE は据え置き |
| **開発影響** | **回帰 baseline(scripts/output/re-phase*-audit.json)を動かすと回帰が壊れる**。M-12 台帳・M-15 diff のパスは監査/rollback が前提 | **baseline・恒久資産は移動禁止**。docs の移動は runtime/回帰に無関係(md は誰も fetch しない) |
| **docs 相互参照** | 45 文書が「根拠(FROZEN): xxx.md」等でプロース参照。**ハイパーリンクでなく表記のみ**なので技術的リンク切れは起きないが、可読性が落ちる | 段階移動 + 各文書冒頭の相対参照は据え置き(ファイル名で追える) |

- **最重要**: **md 文書はアプリが fetch しない**ため、docs 再編は**runtime に一切影響しない**。実害リスクは
  README リンク 1 箇所と、回帰 baseline を「誤って動かした場合」のみ。

---

# 5. 最小変更で整理する場合の手順

## 今すぐやるべき整理（低リスク・高効果）

1. **`public/docs/specification/` を新設し、正典 4〜5 件のみ移動**
   （reading-japanese-specification / reading-japanese-policy / reading-hint-editorial-specification /
   reading-hint-unit-trigger-design）→ **README リンクを 1 箇所更新**。「守るべき仕様」を即座に可視化。
2. **root `docs/data/` を新設し .tsv 12 件を移動**（参照 0 を確認後）。docs/ を人向け文書のみに。
3. **`.gitignore` に `.DS_Store` / `*~` / `.orig`** を予防追加（既存 track に影響なし）。

## 後回しでよい整理（中リスク・段階的）

4. **`public/docs/{design,audit,report,history}/` へ残り 170+ 件を段階移動**。1 領域ずつ（Reading Hint →
   Morph → Syntax …）行い、都度リンク/参照を確認。
5. **core コメントの `docs/` パス是正**（`public/docs/<subdir>/...` へ）。runtime 非依存のため急がない。
6. **`scripts/output/adhoc/` 分離**と一回きり監査の gitignore 化（baseline・恒久資産は必ず除外）。
7. **D の重複可能性(policy 系)を内容レビュー**し、superseded は history/ へ（削除しない）。

- **やらないこと（当面）**: 削除・bible_data/translations/morph-index の再編・runtime データの移動・回帰
  baseline の移動。これらは release に無関係かリスクが高い。

---

## 総括

- **リリース前として、runtime とデータは健全**（一時ファイル 0・全コミット済・データ分離）。
- **唯一の実質課題は `public/docs/` 178 フラットと root `docs/` の .tsv 混入**——いずれも**runtime 非依存**の
  ため、**「今すぐ 3 手順（正典分離・データ分離・.gitignore）」で最小の可視化**を行い、残りは段階整理でよい。
- **削除は急がない**。すべて設計判断の証跡になり得るため、history/ に保全してから、参照 0 かつ superseded の
  二重確認を経て個別判断する。

```
[pre-release-file-architecture-audit 2026-07-22]
現状: 全コミット済・作業ツリークリーン・一時ファイルtrack 0。tracked 4705(translations2378/bible_data1193/morph-index787/public-docs178/scripts101/root-docs15/core10)
良い点: 一時ファイル0・runtime/データ分離・回帰baseline committed・reading-hints.jsonはassets/data(runtime資産)
問題: public/docs 178フラット(audit56/implementation29/report17/design29混在・正典と履歴が不可分) / root docs に.tsvデータ12混入 / scripts/output で baseline・恒久資産・一回きり監査が混在
リスク: 正典(reading-japanese-specification/policy)が178件に埋没・coreコメント約20箇所がdocs/xxx.md参照(既にdocs≠public/docs不整合)
分類A必ず残す: 正典spec/policy・SP-5等現行Hint仕様・reading-hints.json・runtime data・回帰baseline(re-phase*-audit.json移動禁止)・M-12台帳/M-15 diff・core/index/bible_data
B整理移動: public/docs 178→specification/design/audit/report/history / root docs .tsv→docs/data / scripts/output一回きり→adhoc
C履歴保存: SP-*/M-*のdesign/implementation/audit/freeze証跡をhistory/へ集約(削除しない)
D削除候補: 積極提案なし。policy系(reading-policy/flow-gloss/presentation vs reading-japanese-policy)の重複は内容確認後判断・単発UX audit要レビュー。削除前に参照0かつsuperseded二重確認
E gitignore: scripts/output一回きり監査(baseline/台帳/diffは除外)・.DS_Store/*~/.orig予防。output丸ごとgitignore禁止
推奨構成: public/docs/{specification,design,audit,report,history}/ + docs/{README/LICENSE/architecture-rules, data/*.tsv} + scripts/output/adhoc
移動リスク: md文書はアプリfetchしない=runtime非影響。実害はREADMEリンク1箇所と回帰baseline誤移動のみ。docs相互参照45はプロース表記でリンク切れせず
最小手順 今すぐ: (1)specification/新設し正典4-5件移動+READMEリンク更新 (2)docs/data/へ.tsv移動 (3).gitignore予防追加。後回し: 残り170+段階移動/coreコメント是正/output adhoc分離/policy重複レビュー。やらない: 削除・本文データ再編・runtime移動・baseline移動
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版(リリース前ファイル構成監査・現状評価/A〜E分類/推奨構成/移動リスク/最小手順・削除は急がず分類・runtime非依存を明記) |
