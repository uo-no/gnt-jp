# Display Label 設計正典（Stage E — 語義見出しの責務定義）

作成: 2026-07-18
位置づけ: Reading Engine 次期ロードマップ Stage E(StudyPanel 完全移行)の設計書。
扱うのは「語義見出し(Display Label)」という責務の定義と所有者。

---

## 0. 3 つの日本語は目的が異なる

StudyPanel の語義見出し `rn-ja` は従来 `lexEntry?.gloss_ja || jaWord` で、
目的の異なる 2 つの日本語を混ぜて見出しにしていた（λόγος では見出しに
「内なる思考を表すもの（ラテン語…）」という長い定義文が出ていた）。
これを解くため、3 種の日本語を別責務として分離する。

| 層 | 名称 | 例(λόγος) | 目的 | 単位 | 文脈 | 所有者 |
|---|---|---|---|---|---|---|
| ① | 読む日本語(Reading Japanese) | 申し開きを / ことば / 理由 | ギリシャ語の語順・構造を追う | トークン | 依存 | ReadingEngine.resolve |
| ② | **語義見出し(Display Label)** | **ことば** | 語を一目で識別する | **lemma** | **非依存** | **ReadingLexicon.getDisplayLabel** |
| ③ | 語義説明(Gloss/Definition) | 内なる思考を表すもの… | 語の意味を説明する | lemma | 非依存 | ReadingLexicon.gloss_ja / abbottSmith |

3 層は互いに SSOT を共有しない。①を②の源にもせず、③を②の源にもしない。

## 1. Display Label(②)の責務定義

> **Display Label は、ある lemma を代表する、文脈非依存・基本形・短い見出し訳。
> 読む日本語の脱文脈化でも、語義説明の要約でもない、独立した代表ラベル。**

| # | 条件 |
|---|---|
| L1 | lemma 単位で安定（同じ lemma は常に同じ見出し） |
| L2 | 文脈非依存・基本形（格助詞・活用・語義選択を含まない） |
| L3 | 短い（1〜数語。説明文ではない） |
| L4 | 決定的（同じ入力 → 同じラベル） |

## 2. 所有者: ReadingLexicon（gloss_ja とは別・純粋派生）

```
ReadingLexicon.getDisplayLabel(lemmaId, context?) → string | null
  供給規則（決定的・L1〜L4）:
    1. キュレーション済み label（将来・人手上書き）
    2. glosses[0]（Phase 4-B の頻度順代表訳・bible_data 実使用の最頻訳）
    3. なし → null（呼び出し側が最小 fallback）
```

- **gloss_ja は使わない**（③説明であり②見出しではない）
- **Engine.resolve は使わない**（①読む日本語であり②見出しではない）
- glosses[0] は「読む日本語」ではなく lemma 単位の代表訳。実データで
  ことば/肉/愛/世界/信仰/神 と、すべて L1〜L4 を満たす（NT 全トークン 100% 供給）

### context 引数（将来拡張・今回未使用）

シグネチャは `getDisplayLabel(lemmaId, context?)`。**context は将来用で今回は一切
参照しない**（`void context`・未指定でも完全に決定的）。将来、文脈により見出しを
切り替えたいケース（例: σάρξ を Flow 上は「肉」だが文脈により「肉体」「人間」）に
備え、Semantic Layer と統合できる余地を残す。その際も L4 は「同じ (lemmaId,
context) → 同じ label」として保つ。

## 3. 3 層の消費経路（移行後）

```
① 読む日本語  ReadingEngine.resolve → Presentation Policy → Flow chip / StudyPanel ヘッダ
② 語義見出し  ReadingLexicon.getDisplayLabel → StudyPanel rn-ja（見出し）
③ 語義説明    ReadingLexicon.gloss_ja / abbottSmith → StudyPanel 語義セクション（別枠）
```

StudyPanel は各層から受け取って出すだけ。「どの日本語を見出しにするか」の判断を
持たない。従来の `gloss_ja || jaWord` の混合判断を撤廃し、
`getDisplayLabel(resolvedId)` 1 本に置き換える。

## 4. 実装状況（2026-07-18）

- [済] `getDisplayLabel(lemmaId, context?)` を reading-lexicon.js に追加
  （glosses[0] 由来・純粋派生・NT 100% 供給・context 未使用）
- [済] StudyPanel `rn-ja` を `displayLabel = getDisplayLabel(resolvedId) || jaWord`
  へ置換（gloss_ja の見出し流用を撤廃。fallback の jaWord は実トークンで発火しない
  安全網）。③語義説明は abbottSmith が担う（別枠・不変）
- [表示差分] λόγος 等の見出しが「長い定義文」→「ことば」に変わる（意図した改善）
- [未] 生 jaWord を表示に使う残り箇所の jaWordDisplay 統一・死コード 6 関数削除は
  別タスク（表示に影響しない範囲・慎重に）

## 5. 変更しないもの

Reading Engine / Presentation Policy / ReadingContext / 冠詞表示 / Flow / Phrase
Reading の挙動、ReadingLexicon の既存フィールド（getDisplayLabel は読み取り専用の
純粋派生・既存出力仕様は不変）。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-18 | 初版（3 層分離・Display Label 責務・getDisplayLabel(lemmaId, context?)） |
