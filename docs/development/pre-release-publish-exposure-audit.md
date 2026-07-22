# Pre-Release Publish Exposure Audit（公開範囲監査）

実施日: 2026-07-23
監査者立場: リリース前の**公開範囲(GitHub / 配信)監査**。「公開して問題ないか」を確認し、必要なら**最小限の
修正提案のみ**行う。**監査のみ。ファイル削除・大量移動・名前変更・bible_data/core/runtime 変更なし。**
前提: 全作業コミット済。Reading Japanese / Reading Hint v1 完成後。

**基本方針**: 大規模整理・削除は禁止。証跡は保持する。

---

## 監査サマリ(セキュリティ観点)

- **秘密情報・API キー・認証情報 = 0**。`api_key/secret/password/token/private key` のパターン一致はすべて
  **言語データ(「token」=トークン配列・「secret」=語義 等)**で、実際の資格情報ではない(spot-check 済)。
- **認証情報ファイル = 0**(`.env / .pem / .key / .p12 / credentials / .htpasswd` の track なし)。
- **PII(メールアドレス)の track = 0**。README/アプリ内の「© 2026 Hiroki Minamida」は**意図的な帰属表示**
  (問題なし)。
- **`.gitignore` が機密を正しく除外**: `docs/private/`(内部メモ・tracked 0)/ `.env` `.env.*` `.dev.vars`(秘密)/
  `translations/KAI17/`(**非公開/ライセンス保護の翻訳・tracked 0**)/ `.DS_Store` / 特定ビルドスクリプト。
- **`public/_headers` は堅牢**: `nosniff` / `X-Frame-Options: DENY` / 制限的 CSP(`default-src 'self'` + Google
  Fonts のみ)/ `object-src 'none'`。**外部送信なし**(connect-src 'self')。

→ **セキュリティ上の公開危険(秘密漏洩・鍵・PII)はなし**。

---

## 1. Publish 安全性の分類

### A. 公開して問題なし

- **ユーザー向け**: `docs/README.md` / `public/index.html`(アプリ本体)/ アプリ内「出典・ポリシー」
  (品質保証説明含む)/ `public/assets/data/changelog.json` / `roadmap.json`。
- **アプリ・データ**: `public/core/*` / `public/css/*` / `public/assets/*` / `bible_data/` / `translations/`(公開分)/
  `morph-index/`(ライセンスは DATA_LICENSE で明示済)。
- **ライセンス**: `docs/LICENSE.md`(MIT)/ `docs/DATA_LICENSE.md`。

### B. 公開しても問題ないが開発者向け

- **`public/docs/` の設計・監査・仕様・報告(159 の .md)**——architecture / specification / design / audit /
  report。**秘密や PII は含まないが、開発者向け内容**(段階番号 SP-*/M-*・内部監査の率直な評価・凍結
  プロトコル・AI 支援の開発ワークフロー等)。
- **root `docs/` の .tsv(検索/オントロジーのビルドデータ)**・`architecture-rules.md`——開発者向け内部資料。
- **`scripts/` と `scripts/output/`(回帰 baseline・監査 JSON・M-12 台帳・M-15 diff)**——開発/監査用。

### C. 非公開推奨

- **現状、track 済で「非公開推奨」に該当する機密は 0**。機密になり得るものは**既に `.gitignore` で除外済**
  (`docs/private/` 内部メモ・`.env*` 秘密・`translations/KAI17/` 非公開翻訳)。
- **新たに非公開化すべき track 済ファイルは検出されなかった**(秘密・鍵・PII・API key・未公開予定の実データ
  なし)。

---

## 2. public/docs の役割確認

- **GitHub 公開の想定か**: リポジトリが public なら**全 tracked が閲覧可能**。加えて **`public/` は Web root
  (index.html = public/index.html)** のため、**`public/docs/*.md`(159 件)は配信サイトの URL
  `<site>/docs/<name>.md` で誰でも取得可能**(`_headers` に docs 除外なし)。
- **ユーザー向け docs として適切か**: **不適切寄り**。これらは設計・監査の**開発者向け資料**で、利用者向けの
  説明ではない。害はないが、利用者サイトに開発ノイズ(内部評価・段階番号・改訂履歴)が URL 露出する。
- **開発者向け資料を分離すべきか**: **推奨(ただし本 Stage では移動しない)**。GitHub リポジトリには残しつつ、
  **配信サイトでは `/docs/*.md` を提供しない**のが理想(§5 の最小手順)。**移動・削除は実施しない**。

---

## 3. 削除禁止（遵守）

- ファイル削除・大量移動・名前変更・bible_data 変更・core 変更・runtime 変更は**一切行っていない**。
- **証跡は保持**。すべての設計・監査文書は tracked のまま。

---

## 4. 正典確認（重要資産の保全）

| 資産 | 状態 |
|---|---|
| Reading Japanese Specification(reading-japanese-specification.md) | **tracked ✓** |
| Reading Japanese Policy / L-0(reading-japanese-policy.md) | **tracked ✓** |
| M-15(reading-japanese-adoption-execution-report.md) | **tracked ✓** |
| RM-0(reading-memo-editorial-character-audit.md) | **tracked ✓** |
| SP シリーズ Freeze(reading-hint-v1-release-freeze-audit.md ほか) | **tracked ✓** |
| Morph Rule Engine Frozen(morph-rule-engine-v1-frozen.md) | **tracked ✓** |

- **freeze/frozen/specification/policy の凍結文書 14 件がすべて保全**。失われていない。

---

## 5. 最終出力

### ① Publish して問題ない範囲

- README / changelog / LICENSE / DATA_LICENSE / roadmap / アプリ本体(index.html/core/css/assets)/
  bible_data・translations(公開分)・morph-index / アプリ内品質保証説明。**秘密・PII なしで公開安全**。

### ② Publish 前に注意すべきファイル

- **`public/docs/` の 159 開発文書(配信サイトで URL 到達可能)**——秘密ではないが**開発者向け**で、内部監査の
  率直な評価・AI 支援開発ワークフロー・段階番号が公開される。**利用者サイトに出す意図があるかの確認が必要**。
- **root `docs/*.tsv` / `architecture-rules.md`**——GitHub 上で可視(配信サイトには出ない=public 外)。開発者
  向け内部資料である旨の認識を持って公開する。

### ③ 非公開推奨ファイル

- **追加で非公開化すべき track 済ファイルはなし**。機密は既に `.gitignore`(`docs/private/` / `.env*` /
  `translations/KAI17/`)で除外済。**この除外設定を維持すること**が唯一の必須事項。

### ④ 今すぐ修正が必要か

- **セキュリティ上は不要**——秘密・鍵・PII・認証情報の漏洩はなく、機密は gitignore 済。**リリースを止める
  問題はない**。
- `public/docs` の配信露出は**安全性でなく体裁/意図の問題**であり、**任意**(急がない)。

### ⑤ 修正する場合の最小手順（任意・ファイル移動なし）

1. **配信サイトで `/docs/*.md` を提供しない**——`public/_redirects` に `/docs/* 404`(または 301 to /)を 1 行
   追加、もしくはビルド/デプロイ設定で `public/docs` を配信対象外にする。**ファイルは移動・削除しない**
   (GitHub リポジトリには開発者資料として残す)。
2. **`.gitignore` の機密除外を維持**(`docs/private/` / `.env*` / `KAI17`)。予防的に `.DS_Store` は既に除外済。
3. （体裁を上げるなら後日）公開文書の冒頭に「開発者向け設計資料」の一文を添える(内容変更は最小)。

- **やらないこと**: ファイル削除・大量移動・名前変更・bible_data/core/runtime 変更・gitignore 済機密の追跡化。

---

## 総括

- **公開して致命的問題はない**。秘密・鍵・PII・認証情報は tracked に存在せず、機密は `.gitignore` で適切に
  除外(内部メモ・秘密・非公開翻訳 KAI17)。正典・凍結資産 14 件はすべて保全。
- **唯一の留意点は `public/docs` 159 開発文書が配信 URL で公開到達可能**なこと。**安全性の問題ではなく体裁/
  意図の問題**で、リリースを止める必要はない。分離したい場合のみ、**ファイルを動かさず配信除外 1 行**で対応
  できる(§5)。

```
[pre-release-publish-exposure-audit 2026-07-23]
セキュリティ: 秘密/API key/認証/PII = 0（パターン一致は言語データの「token」等）。認証情報ファイル0。gitignoreが docs/private・.env*・KAI17(非公開翻訳)を正しく除外。_headersは堅牢CSP・外部送信なし
①公開安全: README/changelog/LICENSE/roadmap/アプリ本体/bible_data/translations/morph-index/品質保証説明
②注意: public/docs 159 md が <site>/docs/*.md で配信到達可能=開発者向け(内部評価/AI支援開発/段階番号露出・秘密でない)。root docs/.tsv/architecture-rulesはGitHub可視(配信外)
③非公開推奨: 追加該当なし。機密は既にgitignore済(docs/private・.env*・KAI17)・維持が必須
④今すぐ修正: 不要(セキュリティ問題なし・リリース可)。public/docs配信露出は体裁の問題で任意
⑤最小手順(移動なし): _redirectsで/docs/*を404/301(配信除外・repoには残す) / gitignore機密除外維持 / 任意で公開文書冒頭に開発者向け注記
正典保全: reading-japanese-specification/policy(L-0)/M-15/RM-0/SP-16 freeze/morph frozen 全tracked・14凍結文書保全
削除禁止遵守: 削除/移動/改名/bible_data/core/runtime 変更なし・証跡保持
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-23 | 初版(公開範囲監査・秘密/PII 0・gitignore 適切・public/docs 配信露出は体裁問題で任意・正典保全確認・削除禁止遵守・最小手順は配信除外1行) |
