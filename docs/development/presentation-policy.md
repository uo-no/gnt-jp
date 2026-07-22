# Presentation Policy 設計正典（Stage C — 第 1 規則: PP 統合の可視化）

作成: 2026-07-17
位置づけ: Reading Policy 2.0（Stage C)の最初の構成要素。
扱うのは **Reading Japanese の生成ではなく、表示方法**である。

---

## 0. 責務宣言

> **Presentation Policy は、Reading Engine が生成した Reading Japanese を
> 変更せずに、その「見せ方」だけを定義する。
> Flow と StudyPanel は同じ表示規則を共有する。**

| 層 | 責務 |
|---|---|
| Reading Engine（FROZEN） | Reading Japanese の生成（SSOT・一切変更しない） |
| **Presentation Policy（本書）** | 表示整形規則の定義と適用（core/presentation-policy.js） |
| Flow Renderer / StudyPanel | 整形済み文字列の表示（判断しない） |
| Phrase Reading / Observation | **現時点では対象外**（将来の一元管理を意識し、同じモジュールを参照できる構造にする） |

## 1. 規則 P1: PP 統合の可視化（括弧化）

### 目的

前置詞の意味が名詞（head）へ統合されていることを可視化する。
ギリシャ語の語順（前置詞 → 名詞）は維持する。

### 表示形

```
（前置詞チップ）    （head チップ / panel 表示）
〜へ                福音（へ）
〜から              世（から）
〜によって          神（によって）
〜と共に            兄弟（と共に）
〜の中に            キリスト（にあって）
```

- 前置詞チップは**無変更**（従来の生グロス表示のまま）
- head の表示は `base（統合助詞）` — 括弧は「この助詞は直前の前置詞の
  意味の実現である」ことを示す
- **内部値（AppState.inspect.data.jaWord・resolve cache・chip.jaWord）は
  生の Engine 出力のまま**。括弧化は各表示面のレンダリング時にのみ適用する

### 適用条件（すべて決定的・推論なし）

1. resolve 結果の `source` が `syntax` または `semantic`
2. トークンが **PP の head**（後方 3 語以内・介在は冠詞/形容詞のみ、に
   前置詞がある — Engine の `_resolvePrepDomain` と同一の局所走査）
3. 出力が既知の**前置詞由来サフィックス**で終わる（下記リスト・最長一致）

```
にあって・のもとに・の周りに・を通して・によって・と共に・
の後で・の前に・について・から・へ
```

このリストは Engine の凍結テーブル（_PREP_PARTICLE / _PREP_PARTICLE_2B /
_EN_DATIVE_LEMMAS / prepDomain）の出力サフィックスの**鏡像**である。
Engine のテーブルを拡張した場合はここに追随する（Stage A の引用省略リストと
同じ運用）。

### 適用されない例（設計どおりの静寂）

- 形態格助詞（神の・神に・世界を・神は）— 前置詞由来ではない
- 慣用句の固定訳（永遠に・このため）— base+助詞の構造ではない
  （リストのサフィックスで終わらないため機械的に除外される）
- 未統合 PP（ἐπί・πρός 一般等 5,323 件）— source が syntax/semantic でない

## 2. 適用面（Stage C 第 1 段階）

| 表示面 | 適用 |
|---|---|
| Flow チップ gloss（3 箇所共通 — `_wordToFlowChip` の Tier 0 表示） | ✓ |
| StudyPanel ヘッダ gloss（rcb-main-gloss） | ✓ |
| ドロワー（wlv-dd-ja） | ✓ |
| Phrase Reading 引用 / Observation / 読書メモ本文 | ✗（現状維持。将来同モジュールで一元化） |

**chip ⇔ panel の一致検証は「同じ Presentation を適用した後の文字列」で
行う**（両面が同一規則を共有することの機械的証明）。

## 3. 設定の置き場（SSOT）

- 規則の実装: `core/presentation-policy.js`（純粋関数・共有モジュール）
- 規則の宣言: `assets/data/reading-policy.json` に `presentation` セクションを
  新設（`pp_integrated_head: "parenthesize"`）。
- 制約: reading-policy.json は非同期ロードだが、チップは初回描画から
  整形が必要なため、**モジュール既定値 = JSON 宣言値**の対で運用する
  （食い違いは監査が検出する。同期ロードへの一本化は Reading Policy 2.0
  後続段階の課題として記録）

## 4. 検証計画

1. 実装前の NT 全巻成立性監査: 統合済み PP head 全件（約 4,400）に
   サフィックス分割を適用し、分割不能・base 空・異常形の件数を確認
2. 単体: 適用条件 3 点・非適用例・最長一致（にあって vs に）
3. NT 全巻監査: 括弧化件数の基準値化・chip⇔panel（整形後）一致率 100%・
   既存基準値の更新は理由付き（Stage B の gloss 変更件数等）
4. 実表示監査: 6 書サンプルで「〜へ 福音（へ）」の読み味を確認
5. 凍結: 回帰ケース + 基準値固定

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-17 | 初版（P1: PP 統合の括弧化。Flow + StudyPanel 共有） |
