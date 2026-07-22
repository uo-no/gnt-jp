# τίς(G5101)Morph Rule 設計(Stage J-4)

策定日: 2026-07-19
位置づけ: αὐτós(J-3)で確立した Morph Rule Engine の枠組みを **τίς(疑問詞・Strong G5101)へ適用**する
設計文書。J-4 実装前の**責務凍結**。
根拠: I-1/I-2(Morph Rule 設計)・J-1(実装仕様)・J-2(実装計画)・J-3(αὐτós 実装報告)・
H-3a(疑問詞・関係詞監査)・docs/bible-data-japanese-policy.md(H-3b)。

**本文書は設計(責務定義)のみ。実装・コード・擬似コードは含まない。**
bible_data / reading-engine.js / Semantic / Presentation / 生成データは変更しない。

数値は **クリーン NT 実測**(J-3 で重複ファイル「 2.json」除去済・総 137,741)。

---

## 1. τίς 全 NT 実測監査

- lemma: τίς / Strong: **G5101** / 全出現: **555** / class: すべて pron
- 固定 japanese: **「誰」555 件すべて**(単一固定)

### gender / number / case

| 観点 | 分布 |
|---|---|
| gender | **neuter 354 / masculine 177 / feminine 24** |
| number | singular 540 / plural 15 |
| case | accusative 286 / nominative 232 / dative 21 / genitive 16 |
| gender×number | n/s 351・m/s 166・f/s 23・m/p 11・n/p 3・f/p 1 |

### gender 別 english(責務判定の核心)

| gender | english 上位 | 意味の中心 |
|---|---|---|
| **masculine** | who 114 / which 19 / what 17 / whom 16 / whose 9 | **人(誰)** |
| **neuter** | what 236 / why 72 / *22 / how 8 / which 6 | **事物(何)+ なぜ** |
| **feminine** | what 21 / who 3 | 女性名詞への一致(境界) |

**要点**: 固定「誰」が適合するのは主に **masculine(人=誰)**。**neuter 354 件は「何」/「なぜ」で「誰」不適合**、
これが最大の不適合源(H-3a: τίス unsafe 74.4% の主因)。feminine 24 件は女性名詞への一致で referent 依存の境界。

---

## 2. Data 代表語「誰」の責務確認

- H-3b ポリシーどおり、**bible_data.japanese =「誰」は安定代表語として維持**する(削除・多義化しない)。
- 「誰」は masculine(人)の代表として妥当。gender による語幹の変化(何/なぜ)は Data ではなく
  Morph / Semantic が担う。
- τίs は H-3a で **Type C(固定禁止)** と分類済み。本設計は「誰」を起点に責務を Morph/Semantic へ
  再配置するもので、Data の値そのものは変えない(αὐτós と同じ方針)。

---

## 3. Morph が担当する範囲

Morph は token の形態値のみを入力とし、gender で語幹を決定する(意味推論なし)。

### gender(語幹の中核)

| gender | Reading 語幹 | 根拠 |
|---|---|---|
| **masculine** | 誰(Data 既定のまま) | who 中心・人 |
| **neuter** | **何** | what 中心・事物(誰→何 が τίς Morph の主変換) |
| **feminine** | (境界)既定は誰・Semantic で refine | 女性名詞一致・referent 依存(§4) |

- **τίς Morph の実質的変換は「neuter → 何」**(354 件)。masculine は Data の「誰」を維持するため
  出力不変。
- 語幹決定後、**case による格助詞付与は既存 Morph 責務**(何→何を/何の/何に・誰→誰を/誰の/誰に)。
- number(単複)は τίス では語幹をほぼ変えない(誰/何 は単複兼用)。plural 15 件は代表語のまま。

### case

- 既存の格助詞層をそのまま用いる。主格は無標(何/誰 のまま)。

---

## 4. Semantic へ委譲する範囲

gender では決まらず、語義・文脈の判別を要するもの。Morph の対象外。

| 用法 | 件数(目安) | Reading | なぜ Morph 対象外か |
|---|---|---|---|
| **why(なぜ)** | 72 | なぜ | 同じ **neuter** でも「何」(what)か「なぜ」(why)かは副詞的用法(対格 τί)で決まり、形態は同一 |
| **which(どれ/どの)** | 25 | どれ / どの | 選択・連体用法。文脈依存 |
| **how(どう)** | 8 | どう | 副詞的・文脈依存 |
| **feminine の person/thing 判別** | 24 | 誰 / 何・どの | 女性名詞が人(誰)か事物(何/どの)かは referent 依存 |

- **Semantic は Morph の既定を上書きする**(J-1/J-3 と同じ「Semantic > Morph」)。neuter の既定語幹「何」を、
  副詞的 τί では「なぜ」へ、選択用法では「どれ/どの」へ Semantic が置き換える。
- Semantic 未整備の間は Morph 既定「何」で描画される。これは現状の固定「誰」より **悪化しない**
  (why/which も非人称であり、誰より何が近い)。

### 対象外の周辺論点(記録のみ)

- **疑問詞への は/が 付与**(H-3a Phase 4: 「誰は」68 件が疑問文で不自然)は particle 層の論点であり、
  本 Morph Rule(gender→語幹)とは別責務。J-4 では扱わない。

---

## 5. Rule Table

| lemma | Strong | Data 代表語 | Morph が担当 | Semantic が担当 |
|---|---|---|---|---|
| **τίς** | G5101 | 誰 | gender: masculine→誰(不変)/ **neuter→何** ・ case 助詞 | why→なぜ / which→どれ・どの / how→どう / feminine の人・物判別 |

### 語幹選択(設計・実装形式ではない)

| gender | number | 語幹 |
|---|---|---|
| masculine | singular / plural | 誰 |
| neuter | singular / plural | 何 |
| feminine | singular / plural | 誰(既定)※ Semantic で refine |

- αὐτós の Registry と同一形式(strong キー・base=代表語一致で発火・gender で語幹・case 助詞)。
- τίス は **gender 依存が主**(αὐτós は gender+number 依存)。number の寄与は小さい。

---

## 6. αὐτós Morph Rule との共通化確認

J-3 で実装した αὐτós の枠組みに、τίς が**追加登録のみ**で収まることを確認する。

| 共通点 | αὐτós(G846) | τίς(G5101) |
|---|---|---|
| Registry キー | strong(G846) | strong(G5101) |
| 発火条件 | base = 代表語「彼」一致 | base = 代表語「誰」一致 |
| 入力 | gender / number / case | gender(/ number)/ case |
| 出力 | 語幹(彼/彼ら/それ …)+ 格助詞 | 語幹(誰/何)+ 格助詞 |
| Semantic 優先 | intensive/identity を Semantic が上書き | why/which を Semantic が上書き |
| 決定性 | 同一形態 → 同一語幹 | 同一形態 → 同一語幹 |

- **Engine の構造・責務境界・パイプラインは変更しない**。τίス は Rule Table の 1 行(G5101 の
  gender→語幹マップ)を追加するだけ(J-2 拡張方針どおり)。
- 相違は「τίス は gender 主・number 従」である点のみで、これは Registry の gender/number マップで
  自然に表現できる(αὐτós の枠組みを壊さない)。

---

## 7. 実装開始条件(Gate)

以下をすべて満たしたとき J-4 実装へ進む。

- [ ] G1: 本設計(J-4)が凍結されている。
- [ ] G2: Morph 担当(neuter→何・masculine→誰)と Semantic 委譲(why/which/feminine)の境界が確定。
- [ ] G3: FROZEN プロトコル手順が合意(re-phase1 に τίς 回帰ケース追加 → 悪化 0 → 基準更新。
      neuter→何 は particle 層/StageB 出力へ波及するため、αὐτós(J-3)同様に particle・stageB 基準の
      更新も想定)。
- [ ] G4: クリーン FS(137,741・「 2.json」不在)で before/after・Scorecard を回す QA 手順が用意されている。
- [ ] G5: 生成データ非再生成(Morph Rule は engine コード・build 系は不参照)を確認済み。
- [ ] G6: リリース判定基準(C 減少・Data 不変・Semantic 不破壊・Presentation 不変・既存 QA ALL PASS・
      悪化 0)が測定可能。

### J-4 固有の想定インパクト(計画の参考・確定は実装 QA で)

- 主変換 neuter→何(354 件)は「誰を→何を」等で大量の出力改善が見込まれる一方、主格 neuter の
  「誰は→何は」など particle 層との相互作用が αὐτós 同様に起きうる。実装時に before/after で
  悪化 0・chip⇔panel 100% を確認する。

---

## 責務凍結

```
[tis-morph-rule-design FROZEN 2026-07-19]
Stage J-4 — τίς(G5101) Morph Rule 責務設計
Data: 誰(代表語・維持) / Morph: gender→ masculine 誰(不変)・neuter 何 ＋ case 助詞 /
Semantic: why→なぜ・which→どれ/どの・feminine の人物判別（Morph を上書き） / Presentation: 無関与
実測(クリーン NT): τίς 555 / gender N354 M177 F24 / neuter=何 が主変換(354)
共通化: αὐτós(J-3)の Registry に strong=G5101 の gender→語幹マップを追加登録するのみ・Engine 構造不変
```

以後、τίς の Morph Rule 実装は本設計に照らして行う。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-19 | 初版・凍結(τίς 実測監査・Data/Morph/Semantic 責務・Rule Table・αὐτós 共通化・Gate) |
