# Pre-Release Docs Placement Audit（root/docs と public/docs の配置監査）

実施日: 2026-07-23
監査者立場: リリース前のファイル**配置**監査。**root/docs（Git 管理・開発文書・Web 非配信）**と
**public/docs（public 配下・Web 公開対象になり得る）**を**厳密に分けて**評価する。
**監査・提案のみ。ファイル削除・移動・名前変更は一切行わない。**
前提: 全作業コミット済。`public/` が Web root(index.html = public/index.html)。root `docs/` は public 外。

---

## 現状構造

| 場所 | 件数 | Web 配信 | 内容実態 |
|---|---|---|---|
| **root `docs/`** | 15 | **されない**(public 外) | README / LICENSE / DATA_LICENSE / architecture-rules.md + **.tsv データ 12**(検索/オントロジーのビルドデータ) |
| **`public/docs/`** | 178 | **される**(`<site>/docs/*.md`) | 設計・監査・実装報告・仕様(SP-*/M-*/morph/syntax/semantic/studypanel/search/visual…)。**大半が開発者内部文書**、正典 spec も同居 |

- **runtime 依存**: **なし**——index.html / core / assets/js は **public/docs の .md を一切 fetch/import しない**
  (確認済)。**md 文書はアプリ動作に無関係**。

---

## 問題点（最重要）

- **役割モデルと実態の不一致**: ユーザ意図では public/docs = **利用者向けの公開仕様**、root/docs = **開発履歴**。
  しかし**実際の public/docs 178 件の大半(≈159)は開発者内部文書**(内部監査・段階番号・改訂履歴・設計判断)で、
  **役割モデル上は root/docs に属すべきものが Web 公開領域(public/docs)に置かれている**。
- 結果、**開発ノイズ(SP-13/14 の率直な内部評価・AI 支援開発ワークフロー・M シリーズ設計)が
  `<site>/docs/*.md` で URL 到達可能**(秘密ではないが利用者向けでない)。
- root `docs/` に **.tsv データ 12 が混入**(人向け文書でなくビルドデータ)。

---

## A. root/docs の状態

### 役割分類

| 分類 | ファイル |
|---|---|
| **利用者向け/法務(公開適切)** | README.md / LICENSE.md / DATA_LICENSE.md |
| **開発者向け規範** | architecture-rules.md |
| **開発ビルドデータ(.tsv)** | consistency_report / disambiguation_rules / patch_* / query_* / ranking_weights / synonym_priority_map / syntax_patterns / wallace_ontology_merged（計 12） |

### Web 配信対象でないことの確認

- **root `docs/` は `public/` の外**にあり、**Web アプリの配信対象ではない**(deploy されるのは public/ のみ)。
  GitHub リポジトリが public なら**閲覧可能**だが、**配信サイトの URL では到達しない**。→ **ユーザ意図(root/docs
  は公開領域でない)と一致**。

### 移動・整理候補(提案のみ・移動しない)

- **.tsv 12 → `docs/data/`**(または `scripts/data/`)へ分離し、docs/ 直下を人向け文書のみにする。参照 0 を
  確認後に実施。**README/LICENSE は据え置き**。

---

## B. public/docs の状態

### 実際に Web 公開される可能性のあるファイル

- **`public/docs/*.md` 全 159 件が `<site>/docs/<name>.md` で URL 到達可能**(`_headers` に docs 除外なし・
  runtime 非依存でも静的配信される)。

### 利用者向けに公開してよいもの(= public/docs に残すべき正典)

| ファイル | 理由 |
|---|---|
| **reading-japanese-specification.md** | Reading Japanese 根幹仕様(正典)。README がここへリンク・利用者に参照させる文書 |
| (任意)reading-japanese-policy.md(L-0) | 根幹原則。利用者向けというより設計原則寄り——公開可だが本質は開発者向け(判断は保留) |

### 開発内部資料として公開不要なもの(= 役割モデル上 root/docs 相当)

- **上記正典を除く ≈157〜158 件**——SP-*(Reading Hint 設計/監査/改訂/リリース)・M-*(Builder/Editorial/
  Adoption/反映)・morph/syntax/semantic/relative/reflexive の design→implementation・studypanel-* IA/認知負荷・
  search-*/visual-*/silence 等の UX 監査・completion/plan/review/freeze。**秘密ではないが利用者向けでない開発
  履歴**。

### URL 到達可能性の確認

- 例: `<site>/docs/reading-hint-v1-editorial-quality-review.md`(内部の率直な評価)・
  `<site>/docs/reading-japanese-adoption-execution-report.md`(M-15 内部報告)等が**そのまま生 md で到達可能**
  (ブラウザは raw markdown を表示)。**安全性の問題ではないが、体裁・意図として開発資料の露出**。

---

## 特定確認事項

### 1. Reading Japanese Specification の実体場所とリンク

- **実体**: **public/docs/reading-japanese-specification.md**(root/docs には無い)。→ **利用者向け正典として
  public/docs に置くのは役割モデルと一致・正しい**。
- **README リンク**: docs/README.md の `[…](../public/docs/reading-japanese-specification.md)` は**実体と一致・
  GitHub リポジトリ相対リンクとして有効**。
- **アプリ内リンク**: index.html「出典・ポリシー」7789 行は「**Reading Japanese Specification として公開して
  います**」の**名称参照のみ(href リンクなし)**。→ クリック可能なリンクは存在しない。

### 2. アプリ内「出典・ポリシー」のリンク先が利用者アクセス可能か

- **現状、アプリ内にリンク(href)はない**(名称参照のみ)ため「リンク先」自体が存在しない。
- 仮に到達させる場合、実体は `<site>/docs/reading-japanese-specification.md` の**生 markdown**(未レンダリング)。
  **利用者が読みやすい形ではない**。→ 名称参照に留めている現状は無難だが、「公開しています」の**到達手段が
  未整備**(観察・要修正ではない)。

### 3. public/docs に置くべき正典 vs root/docs に残すべき開発履歴の分類

- **public/docs に置くべき(正典・利用者向け)**: reading-japanese-specification.md(＋任意で policy)。
- **root/docs 相当(開発履歴・公開不要)**: 上記を除く全設計・監査・報告(≈157 件)。**現状は public/docs に
  あるため Web 公開されている**——これを開発履歴として root/docs 側へ寄せるのが役割モデルに沿う。

### 4. ファイル削除・移動は行わない

- **本監査では削除・移動・改名を一切実施しない**。証跡はすべて tracked のまま保持。**提案のみ**。

### 5. runtime コードへの影響

- **影響なし**。index.html / reading-engine.js / bible_data / assets/data は **public/docs の .md に依存しない**
  (fetch/import 0・core の docs 参照はコメントのみ)。→ **docs をどう再配置しても runtime は不変**。

---

## 推奨整理案（提案のみ・移動しない）

**目標**: public/docs = 利用者向け正典のみ / 開発履歴は root/docs（または配信除外）。

1. **public/docs は正典のみに絞る**——reading-japanese-specification.md(＋policy)を残し、他の開発文書は
   **root/docs 側(例: `docs/dev/` や `docs/history/`)へ寄せる**。**大量移動は段階的に**(Reading Hint →
   M シリーズ → morph/syntax… の順)、都度 README/相互参照を確認。
2. **代替(移動を避ける最小案)**: ファイルは public/docs に置いたまま、**配信サイトで `/docs/*.md` を出さない**
   (`public/_redirects` に `/docs/* 404` を 1 行・reading-japanese-specification.md のみ許可 or 例外)。GitHub
   には開発資料として残る。**runtime 非依存のため安全**。
3. **root docs の .tsv → `docs/data/`** に分離(参照 0 確認後)。
4. アプリ「出典・ポリシー」の「公開しています」表現は、到達手段が未整備のため、**名称参照のまま維持**するか、
   将来レンダリング済みページを用意するまで**リンクを付けない**(現状維持が無難)。

---

## 今すぐ変更が必要か

- **セキュリティ上は不要**(秘密・PII なし・§前監査で確認)。**リリースを止める問題はない**。
- **役割分離の観点では要整理**だが、**runtime 非依存で急がない**。**大量移動は段階的に、削除はしない**方針で、
  最小なら「**配信除外 1 行(_redirects で /docs/* を出さない・spec は例外許可)**」で「開発文書の Web 露出」を
  即座に止められる(ファイル移動なし)。
- **正典(reading-japanese-specification.md)の public/docs 配置・README リンクは正しく、維持**。

```
[pre-release-docs-placement-audit 2026-07-23]
現状: root docs 15(README/LICENSE/DATA_LICENSE/architecture-rules + .tsv12)=Web非配信(public外・GitHub可視のみ) / public/docs 178=Web配信(<site>/docs/*.md 到達可)・大半が開発者内部文書
問題: 役割モデル(public/docs=利用者向け・root/docs=開発)と実態不一致=開発内部文書≈159がpublic/docsにありWeb公開されている。root docsに.tsvデータ12混入
A root/docs: README/LICENSE/DATA_LICENSE(公開適)/architecture-rules(規範)/.tsv12(ビルドデータ)。public外=配信されない(意図と一致)。整理候補=.tsv→docs/data/
B public/docs: 159 md がURL到達可。残すべき正典=reading-japanese-specification.md(+任意policy)。公開不要=残り≈157(SP-*/M-*/morph/syntax/semantic/studypanel/search/visual audit・実装報告)。生md露出(体裁問題・秘密でない)
確認1 spec実体=public/docs/reading-japanese-specification.md(root docsに無し・利用者向け配置で正しい)。READMEリンク(../public/docs/...)実体一致・有効。アプリ出典は名称参照のみ(hrefリンクなし)
確認2 アプリ内リンク: href無し=リンク先なし。仮到達は生md(未レンダ)=読みやすくない。名称参照維持が無難
確認3 分類: public/docs維持=正典spec(+policy) / root/docs相当=残り開発履歴≈157(現状public/docsでWeb公開中)
確認4 削除移動: 一切せず提案のみ・証跡保持
確認5 runtime影響: なし(index/engine/bible_data/assets/dataはpublic/docs md非依存・fetch0・core参照はコメント)
推奨: public/docsを正典のみに絞る(開発文書はroot/docs側へ段階移動) OR 移動回避なら_redirectsで/docs/*配信除外(spec例外)。.tsv→docs/data。アプリ表現は名称参照維持
今すぐ: セキュリティ不要・リリース可。役割整理は急がず段階的・削除なし。最小は配信除外1行で開発文書のWeb露出を停止(移動なし)。正典配置とREADMEリンクは正しく維持
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-23 | 初版(root/docs と public/docs を厳密分離監査・正典 spec は public/docs で正配置・開発文書 159 が public/docs で Web 公開されている不一致を指摘・runtime 非依存・削除移動なし提案のみ・最小は配信除外1行) |
