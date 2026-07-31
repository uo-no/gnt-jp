# Reading Japanese Editorial Pilot 報告(Stage M-6)

実施日: 2026-07-20
位置づけ: M-5 Editorial Review Framework に基づき、**実際の 1 章を対象に bible_data.japanese の編集
レビュー工程を検証**する。目的は Reading Japanese の品質改善そのものではなく、**Editorial Workflow が
正しく機能することの確認**。
根拠(FROZEN): reading-japanese-policy.md(L-0)・-editorial-review-framework.md(M-5)・
-improvement-framework.md(M-1)・-builder-phaseA-report.md(M-3)・syntax/semantic-completion(L-3/L-4)。

**本 Pilot は評価のみ。bible_data・コード・Builder・Engine は一切変更しない。**
NT 全巻編集・大量データ変更・Morph/Syntax/Semantic 拡張・Builder 責務変更・UI 変更は行わない。

---

## 1. 対象章と選定理由

**対象: John 1(JHN 1・51 節・826 トークン)**

選定理由(候補 1CO 1 / JHN 1 / MRK 1 / PHP 1 の実測比較):

| 候補 | 節 | 関係詞 | 指示詞 | αὐτós | 再帰 | τίς/τις |
|---|---|---|---|---|---|---|
| 1CO 1 | 31 | 3 | 2 | 8 | 0 | 2 |
| **JHN 1** | **51** | **15** | **15** | **48** | **2** | **7** |
| MRK 1 | 45 | 3 | 3 | 46 | 7 | 3 |
| PHP 1 | 30 | 1 | 8 | 5 | 0 | 4 |

- **JHN 1 が Morph/Syntax/Semantic の検証要素を最も網羅**(関係詞 15・指示詞 15・αὐτós 48・再帰 2・
  τίς 7・多義語 λόγος 等)。章節単位レビューが可能で、**NT 全体への一般化判断材料**に最適。

---

## 2. Verse 別レビュー結果(M-5 基準)

各節を Data → Morph → Syntax → Semantic → RJ 品質 の順で確認し、4 状態に分類(原因層記録)。

| 状態 | 件数 |
|---|---|
| **Accepted** | **30** |
| **Revise Required** | **0** |
| **Pending** | **21** |
| Not Reviewed | 0(全 51 節レビュー済) |

- **Pending 原因層(のべ)**: Syntax 14 / Morph 9 / Semantic 1。
- **破損節: 0**(re-stageB 破損形 0 と整合)。

### 代表節の walkthrough

| verse | 状態 | 内容(reading)と判断 |
|---|---|---|
| **JHN 1:1** | **Accepted** | 「初めに/ことば/神を/〜のもとに」等。**構造忠実・未判定要素なし・非破損**。λόγος=ことば(LN 反映)。採用 |
| **JHN 1:2** | **Pending(Syntax)** | οὗτος → **「この」**。ここは**代名詞用法**(「これ/この方は初めに…」)だが、**連体/代名詞は未判定**(L-3c)。editorial で「これ」に直すのは**判定/推論=禁止** → Engine 側(Syntax adnominal 導出)の課題として保留 |
| **JHN 1:14** | **Pending(Morph)** | ἡμῖν → **「私に」**。ここは **1 人称複数**(「私たちに宿った」)だが、G2254 は **Morph v1 対象外**で number 未反映。editorial で「私たちに」に直すのは **Morph 判定=禁止** → Engine 側(Morph Registry 拡張)の課題として保留。αὐτοῦ=彼の(masc sing・正) |

---

## 3. 各 Phase の実施結果

### Phase A: 現状取得
- JHN 1 全 51 節の verse / Greek / 現 bible_data.japanese / Morph / Syntax(relativeSyntax・
  demonstrativeSyntax)/ Semantic(semanticInfo)/ Builder 集約結果を取得(変更なし)。

### Phase B: Verse Review
- **Data**: placeholder 0・破損 0・重複 0(健全)。
- **Morph**: gender/number/case/person が概ね反映(αὐτós 48・関係詞頭語)。ただし **複数人称代名詞
  (ἐγώ/σύ 複数)は Registry 外で number 未反映**(私/あなた ← 私たち/あなたがた)。
- **Syntax**: 関係詞頭語(者/もの)・deixis は反映。**指示詞の連体/代名詞は未判定**(語順変更・翻訳化・
  構造隠蔽はしていない)。
- **Semantic**: LN domain・pronType・interrogative は反映。**person-leveling(ἑαυτοῦ)は未判定**。

### Phase C: 判定
- 状態・理由・原因層を記録(§2)。Accepted 30 / Revise 0 / Pending 21。

### Phase D: 修正判断
- **Revise Required = 0 のため、修正候補は作成しない**(編集問題が存在しない)。
- これ自体が「**保守的な Morph reading は翻訳化・自然化・破損・誤解を生まない**」ことの検証である。

### Phase E: QA
- **修正が発生しなかった**ため before/after は **バイト等価**(何も変更していない)。**悪化 0**。
- Morph 回帰 0・Syntax 回帰 0・Semantic 回帰 0(engine 非改変)・chip⇔panel 一致・データ破損なし・
  **bible_data 不変**。

---

## 4. 発見した共通ルール

| ルール | 内容 | 帰属 |
|---|---|---|
| **指示詞の代名詞用法は Pending** | οὗτος「この」が代名詞用法(これ/この方)でも連体/代名詞が未判定 → editorial で直さず Pending(Syntax) | Engine(Syntax adnominal 導出) |
| **複数人称代名詞は Pending** | ἡμῖν「私に」等が複数(私たち)でも Morph v1 対象外 → editorial で直さず Pending(Morph) | Engine(Morph Registry 拡張) |
| **編集問題(Revise)は生じない** | 保守的 Morph reading は破損/誤解/翻訳化/自然化を含まない → Revise 0 | 編集側は健全 |
| **Pending = Engine 側不足の記録** | Pending は「品質不良」ではなく「決定的に解決できない」記録・推論で埋めない | 各層へ差し戻し |

- **Engine 側不足と編集側問題が明確に区別できた**(Pending=Engine 側 21 / Revise=編集側 0)。

---

## 5. M-7(共通編集ルール抽出)への引き継ぎ事項

| 事項 | 内容 |
|---|---|
| **Pending の 2 大原因は Engine 拡張候補** | ①指示詞の連体/代名詞導出(Syntax・adnominal 未判定 14)②複数人称代名詞の number(Morph Registry 拡張・9)。M-7 は editorial ルールでなく Engine 差し戻しとして整理 |
| **Editorial ルールの骨子** | 「指示詞連体/代名詞」「複数人称 number」「person-leveling」は editorial で触れず **Pending 記録 → Engine へ**。editorial は破損/翻訳化/自然化/構造隠蔽の検出に集中 |
| **Accepted 判定の機能** | 未判定要素のない節は Accepted(30)。判定基準が機能することを確認 |
| **一般化** | JHN 1 の Pending 率(21/51≈41%)は指示詞・複数人称の多さに依存。NT 全巻では章により変動。Pending は Engine 完成度の指標(L-1 と整合) |
| **Revise 0 の含意** | 現状の reading は編集問題を持たない → 全巻編集の主眼は「Engine 差し戻し(Pending 解消)」であり「editorial 修正」ではない |

---

## 6. 完了条件の充足確認

| 完了条件 | 充足 |
|---|---|
| M-5 レビュー工程で実際に章節評価できる | ✓ JHN 1 全 51 節を評価 |
| verse 単位の判定記録が可能 | ✓ 状態・理由・原因層を記録 |
| Accepted / Revise Required / Pending の基準が機能する | ✓ 30 / 0 / 21 に分類 |
| 修正が必要な場合、理由を L-0 基準で説明できる | ✓(本 Pilot は Revise 0・保留理由を L-0/層別で説明) |
| Engine 側不足と編集側問題を区別できる | ✓ Pending(Engine)21 / Revise(編集)0 |
| M-7 へ進める情報が得られる | ✓ 共通ルール・Engine 拡張候補を抽出(§4/§5) |

---

## 7. この Stage でやらないこと(遵守)

- NT 全巻編集・大量データ変更・Morph/Syntax/Semantic 拡張・Builder 責務変更・UI 変更 は**行っていない**。
- bible_data・コード・Engine・Builder は**一切変更していない**(評価のみ・重複「 2.json」不在確認済)。

```
[reading-japanese-editorial-pilot 完了 2026-07-20]
対象: JHN 1（51節・検証要素最多）。評価のみ・bible_data不変
結果: Accepted 30 / Revise Required 0 / Pending 21（Syntax14/Morph9/Semantic1）・破損0
代表: 1:1 Accepted / 1:2 Pending(指示詞この=代名詞用法・Syntax未判定) / 1:14 Pending(私に=複数・Morph未対応)
共通ルール: 指示詞代名詞用法・複数人称=Pending(Engine差し戻し) / 編集問題(Revise)は生じない / Engine不足と編集問題を区別
Phase D: Revise 0のため修正候補なし。Phase E: 修正なし=バイト等価・悪化0・bible_data不変
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版(JHN 1 Editorial Pilot・Accepted30/Revise0/Pending21・Engine不足と編集問題の区別・M-7 引き継ぎ) |
