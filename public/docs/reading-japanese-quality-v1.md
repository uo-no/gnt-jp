# Reading Japanese Quality Report v1.0

[FROZEN 2026-07-18] Reading Japanese Quality Report v1.0

本書は Stage A〜G.5 の監査結果を集約した**品質基準書**である。目的は修正ではなく、
現在の品質を将来比較できるよう凍結すること。Stage H 以降は本書を基準に品質改善を
測定する。この Stage では Engine / Presentation / bible_data を一切変更しない。

---

## 1. 概要

### Reading Japanese の目的

Reading Japanese は**新しい翻訳ではない**。固定された `bible_data.japanese` を、
ギリシャ語の構造(形態・統語・文脈)を反映した「読むための日本語」へ進化させ、
**日本語話者がギリシャ語の語順・構造を追うための補助表示**とする。本文(新改訳)は
変更しない。変更対象は Reading Flow / StudyPanel / Phrase Reading の表示のみ。

### 責務分離(Engine / Presentation / Context)

```
ReadingContext（Stage D）… 節の文脈情報を一元供給（唯一の Context Source）
        ↓
ReadingEngine（Phase 1-5）… 日本語の SSOT。意味を推論せず注釈を読み出す
        semantic(idiom→prepDomain→lnGloss) → syntax → morph → particle → fallback
        ↓
PresentationPolicy（Stage C）… 表示整形のみ（PP 括弧化）。日本語を変えない
        ↓
Flow / StudyPanel / Phrase Reading … 受け取って表示するだけ
```

- **Reading Japanese の決定者は ReadingEngine のみ**。Context は入力供給、Presentation は
  表示整形、各表示面は消費のみ。
- 語義見出し(Display Label)は ReadingLexicon が別責務として供給(Stage E)。

### 品質評価の考え方

品質は「テストが通るか」ではなく「**読者にとって自然か・誤解しないか**」で評価する。
機械的な回帰テスト(安定性の検証)とは分離し、人間が読む観点の評価を別に持つ。

---

## 2. 品質サマリー(Stage F 実測)

| 指標 | 値 |
|---|---|
| 全トークン数 | 137,741 |
| 旧 japanese との差分数(旧≠新) | 47,328 |
| 差分率 | 34.4% |

### カテゴリ別 差分件数

| カテゴリ | 件数 |
|---|---|
| morph:対格を | 10,933 |
| morph:属格の | 9,664 |
| morph:与格に | 7,176 |
| morph:分詞 | 5,894 |
| syntax(前置詞句) | 4,194 |
| particle(は/が) | 3,123 |
| morph:不定詞 | 2,268 |
| morph:受動 | 1,589 |
| morph:命令形 | 1,409 |
| morph:呼格よ | 613 |
| semantic(慣用/lnGloss/prepDomain) | 465 |
| **合計** | **47,328** |

### 誤解を招く破損の実測(Stage F・全件国勢調査)

| 破損パターン | 件数 | 母数に対する率 |
|---|---|---|
| 3 人称命令 → 2 人称命令形 | 197 | 命令形の 14.0% |
| 用言的グロス+助詞の破損 | 3 | 微小 |
| は/が の破損(用言に は) | 0 | ― |

※ Stage F 主観評価で疑った「隠れたは」等の破損は、実データ照合で**存在しないことを確認**
(唯一の例外は名詞化語「物乞いするは」1 件)。

---

## 3. 読者品質評価(Stage G・ランダム 200 節・全 27 書)

各節の Reading Japanese のみを読み、旧 japanese と比較せず評価:

| 評価 | 定義 | 件数 | 割合 |
|---|---|---|---|
| **A(そのままでよい)** | 自然・十分読みやすい・改善不要 | 130 | 65.0% |
| **B(改善余地あり)** | 意味は通るが、より自然な表現がありうる | 55 | 27.5% |
| **C(修正推奨)** | 誤解を招く・不自然・優先修正すべき | 15 | 7.5% |

※ C は Stage G 表で MRK 2:7 が重複し、実ユニークは 14 節。

### B・C の分類(70 件)

| 分類 | 件数(C/B) | 傾向 |
|---|---|---|
| 語義 | 18(C:8 / B:10) | 最重要。別語・疑問詞誤りは誤解に直結 |
| 語順 | 22(C:6 / B:16) | 長節の断片化。多くは追いにくいが致命的でない |
| 助詞 | 12(B:12) | 与格「に」の弱さ。誤解までは招かない |
| 分詞 | 14(B:14) | 平坦化・連続で動作主が曖昧 |
| 命令形 | 1(C:1) | 200 節では 1 件(全 NT では 197 件) |
| 前置詞 | 3(B:3) | 括弧化は概ね良好 |
| その他 | 0 | ― |

---

## 4. Critical Error Audit(Stage G.5・C 判定 14 節の責務分類)

| 責務分類 | 件数 | 割合 | 該当 |
|---|---|---|---|
| **A. Data**(bible_data/gloss/lemma) | 3 | 21.4% | MRK 4:21(姦淫の女=誤データ)・ACT 8:36・LUK 18:36(τί=何を「誰」) |
| **B. Reading Engine**(Rule/Syntax/Semantic) | 5 | 35.7% | HEB 1:6(3 人称命令)・LUK 19:3・MRK 2:7(疑問詞に は)・MRK 6:25(語義選択)・MRK 8:19(疑問詞 PP 誤検出) |
| **C. Presentation**(表示のみ) | 0 | 0% | なし(括弧化は正常動作) |
| **D. Acceptable Trade-off**(語順フロー設計) | 6 | 42.9% | LUK 3:4・MAT 11:17・2CO 11:21・LUK 8:43・REV 9:10・ACT 25:16 |
| **E. Unknown** | 0 | 0% | なし |
| 計 | 14 | | |

### Reading Engine 起因の内訳(5 件)

| 種別 | 件数 | 該当 |
|---|---|---|
| Engine Rule(命令形の人称非区別・疑問詞への は) | 3 | HEB 1:6・LUK 19:3・MRK 2:7 |
| Syntax(疑問詞対格の PP 誤検出) | 1 | MRK 8:19 |
| Semantic Selection(文脈語義の未選択) | 1 | MRK 6:25 |

---

## 5. Quality Scorecard(Quality KPIs)

**今後毎回この表を再計測し、v1.0 と比較する。** 各値は本書凍結時点(2026-07-18)の基準値。

| KPI | v1.0 基準値 |
|---|---|
| 全トークン数 | 137,741 |
| 差分数 | 47,328 |
| 差分率 | 34.4% |
| A 件数 | 130 |
| B 件数 | 55 |
| C 件数 | 15(ユニーク 14) |
| Data 件数 | 3 |
| Engine Rule 件数 | 3 |
| Semantic Selection 件数 | 1 |
| Presentation 件数 | 0 |
| Trade-off 件数 | 6 |

補助指標(全 NT・Stage F 国勢調査):
- 3 人称命令 → 2 人称命令形: 197 件
- 用言的グロス+助詞の破損: 3 件

---

## 6. 修正優先順位(修正案ではなく優先順位のみ)

| Priority | 対象 | 根拠 |
|---|---|---|
| **Priority 1** | Data(3 件 + 語義 B 群) | 別語・疑問詞誤りは誤解に直結し、Engine を変えずデータ修正で解ける |
| **Priority 2** | Engine Rule(3 件・全 NT では命令形 197 件) | 3 人称命令・疑問詞への助詞付与はルール適用範囲の問題。影響規模が大きい(命令形 197) |
| **Priority 3** | Semantic Selection(1 件) | 文脈語義選択。将来の Semantic Layer 拡張で対応する領域 |
| **Priority 4** | Acceptable Trade-off(6 件) | 語順フロー設計の本質。個別トークンに誤りなし。修正不要または設計判断 |

**Presentation は今回対象外(0 件)。** 括弧化・助詞表示は正常動作であり、品質低下の原因では
ない。

---

## 7. 凍結

```
[FROZEN 2026-07-18]
Reading Japanese Quality Report v1.0
基準値: 全 137,741 / 差分 47,328(34.4%) / A130 B55 C15(uniq14)
        Data3 EngineRule3 Semantic1 Presentation0 Trade-off6
        補助: 3人称命令197 / 用言+助詞破損3
```

Stage H 以降は本レポートを基準として品質改善を測定する。KPI(§5 Scorecard)を再計測し、
各値の増減で改善/退行を評価すること。

## 改訂履歴

| 日付 | 版 | 内容 |
|---|---|---|
| 2026-07-18 | v1.0 | 初版・凍結(Stage A〜G.5 の監査集約) |
