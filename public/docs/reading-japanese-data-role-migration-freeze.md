# Reading Japanese Data Role Migration Freeze(Stage M-15 前提)

策定日: 2026-07-22
位置づけ: **M-15 Adoption Execution で bible_data.japanese に reading を反映するのに先立ち、
bible_data.japanese の役割変更と engine-corpus baseline の位置づけ変更、新しい監査境界を凍結**する。
根拠(FROZEN): reading-japanese-policy.md(L-0)・-adoption-decision-framework.md(M-13)・
-adoption-execution-design.md(M-14)。ユーザ判断(2026-07-22・M-15 実行方針=反映＋回帰再スコープ)。

**本 freeze 文書は設計・監査境界の確定のみ。コード・データ・bible_data は変更しない。**

---

## 0. 背景(なぜ役割移行か)

- 反映で顕在化した衝突は **実装バグではなく、bible_data.japanese に二つの役割を持たせていたこと**に起因する。
- **旧**: bible_data.japanese = **Morph/Engine の解析起点(Data 代表語)**。
- **新**: bible_data.japanese = **Reading Japanese の正規値**(M-13/M-14 の移行方針)。
- 反映しない別レイヤ案には戻さない(M-13 の単一正規値方針を維持)。

---

## 1. bible_data.japanese の役割変更

| | 反映前(〜M-14) | 反映後(M-15〜) |
|---|---|---|
| **役割** | Data 代表語(Engine 解析の**入力起点**) | **採用済み Reading Japanese**(正規の成果物値) |
| **生成主体** | 固定 Data(新改訳由来の代表語) | Data 代表語 + 決定的 Morph/Syntax 採用(A 分類のみ) |
| **Engine.resolve との関係** | japanese を base に Morph/Syntax/Particle を適用して reading を導出 | 反映済みトークンは japanese が既に reading(morph 規則は base 不一致で不発=冪等) |
| **旧値(Data 代表語)** | japanese そのもの | **bible_data には残さない**。adoption diff / git / Editorial 台帳で保持 |

- **原文(新改訳)は Data の起点として不変**(reading は Data を壊さず決定的構造のみ反映)。

---

## 2. engine-corpus baseline の位置づけ変更

- **engine-corpus 監査(re-phase1-audit.json の `morph=44,614` 等)は「現在の Reading Japanese 品質」指標ではない**。
  **反映前 Data 代表語時代の Engine baseline**(Engine が Data 代表語をどう変換したかの記録)である。
- 反映後、A 分類 9,412 の Morph トークンは **base が採用語形に変わり morph 規則が不発**になるため、
  **同一走査での morph coverage は 44,614 → 約 35,202 に低下する**。**これは失敗ではなく、reading 移行に
  伴う入力変化の期待差分**である。
- **旧 baseline(44,614 等)は削除しない**。**反映前 Engine baseline として凍結保存**し、
  **engine ロジックが壊れていないことの合成トークン検査(入力ハードコード)と併せて維持**する。

---

## 3. 新しい監査境界(4 分類)

reading 移行後の QA は以下 4 種に分離する。

| 監査 | 内容 | baseline の扱い |
|---|---|---|
| **1. Engine logic regression** | 既存ロジック不壊の確認。re-phase 系/re-stage 系の**合成トークン検査(入力ハードコード)** | 維持(engine 非改変で PASS) |
| **2. Morph coverage baseline** | 44,614 → 約 35,202 の低下 = **期待差分**。reading 移行の入力変化として **before/after を記録** | **旧 baseline は凍結保存・削除しない**。新走査値は別途記録(凍結 audit を上書きしない) |
| **3. Adoption integrity** | adoption diff 件数一致 / before 一致 / after 一致 / rollback 可能 / idempotency | 反映の一次検証 |
| **4. Reading output integrity** | bible_data 変更後の Reading Japanese が Builder 出力と一致・破損 0 | 反映の成果検証 |

- **監査の重心が「engine が Data をどう変換するか(1・2)」から「reading が正しく反映され可逆か(3・4)」へ移る**。
  1・2 は**歴史的 Engine baseline**として保持し、3・4 が**反映後の正規監査**となる。

---

## 4. 凍結事項(遵守)

- **旧 engine-corpus baseline(re-phase*-audit.json・re-stage*-audit.json 等)を削除・再生成しない**
  (反映前 Data 代表語時代の Engine baseline として凍結)。
- **bible_data に `japanese_old` / `japanese_new` を追加しない**(単一正規値・M-13)。
- **反映は A 分類のみ・機械適用のみ**(推論・再計算・Semantic/Discourse 判断を加えない・M-14)。
- **morph coverage 44,614→約35,202 の低下を「失敗」と解釈しない**(reading 移行の期待差分)。

---

## 5. 最重要判断

- **今回の衝突は反映中止理由ではなく、Data 層の役割移行に伴う監査モデル変更**である。bible_data.japanese を
  **Engine 解析起点から Reading Japanese 正規値へ移行**する L-0〜M-14 の方針と、engine-corpus baseline を
  **反映前 Engine の歴史的記録として凍結保存**する扱いは、**L-0 の責務境界(Data/Builder/Editorial の分離)と
  最も整合**する。
- **旧 baseline を残す**ことで、反映前 Engine の振る舞いはいつでも参照・再現でき、**reading 移行の before/after
  が監査可能**になる。新しい正規監査(Adoption integrity・Reading output integrity)が反映後の品質を担保する。

---

## 凍結

```
[reading-japanese-data-role-migration FROZEN 2026-07-22]
役割変更: bible_data.japanese = Data代表語(Engine入力起点) → 採用済みReading Japanese(正規値)。旧値はbible_dataに残さずdiff/git/台帳へ
engine-corpus baseline位置づけ: morph44,614等は「現在のreading品質」でなく「反映前Data代表語時代のEngine baseline」。反映後同一走査で44,614→約35,202低下=期待差分(失敗でない)
新監査境界4分類: (1)Engine logic regression=合成トークン検査維持 (2)Morph coverage baseline=旧値凍結保存・低下は期待差分・before/after記録 (3)Adoption integrity=diff件数/before/after/rollback/idempotency (4)Reading output integrity=Builder出力一致・破損0
凍結事項: 旧engine-corpus audit(re-phase*/re-stage*)を削除・再生成しない / japanese_old・new追加禁止 / 反映はA分類のみ機械適用 / morph低下を失敗と解釈しない
整合: Data層役割移行に伴う監査モデル変更。L-0責務境界(Data/Builder/Editorial分離)と最整合
```

本 freeze により M-15 の反映実装(A 分類 4,156 verse・9,535 token)へ進む。engine-corpus baseline は
反映前 Engine の歴史的記録として保持し、反映後は Adoption/Reading output integrity を正規監査とする。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結(bible_data.japanese 役割移行: Engine 入力起点→Reading 正規値・engine-corpus baseline を反映前歴史的記録として凍結・新監査境界 4 分類・morph 44,614→約35,202 は期待差分) |
