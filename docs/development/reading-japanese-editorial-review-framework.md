# Reading Japanese Editorial Review Framework(Stage M-5)

策定日: 2026-07-20
位置づけ: **bible_data.japanese を最終成果物として完成させるための章節レビュー工程**の設計。
各章節の bible_data.japanese が Reading Japanese Policy(L-0)に照らして適切かを、**人間がどの基準で
評価・採用・保留・修正するか**を定義する。
根拠(すべて FROZEN): reading-japanese-policy.md(L-0)・-baseline.md(L-1)・
syntax/semantic-completion(L-3/L-4)・-improvement-framework.md(M-1)・-builder-design.md(L-2a)・
-builder-phaseA-report.md(M-3)・-builder-adoption-plan.md(M-4)。

**本文書は設計・方針のみ。コード・bible_data・Builder・reading-engine・Morph・Syntax・Semantic・
Presentation・UI の実装/変更、擬似コード・JSON・TypeScript は一切含まない。**

> **品質保証対象 = bible_data.japanese そのもの**。Builder は Reading Japanese を統合する**内部
> コンポーネント**であり、本 Stage のレビュー対象ではない。レビューは Builder ではなく
> **bible_data.japanese(最終成果物)** を対象に行う。

---

## 1. レビュー単位

- **品質保証単位 = verse(章節)**(L-0 §8 に従う)。
- **token / phrase / clause は中間確認**(局所正しさ・接続・節構造)であり、**最終判定単位ではない**。
- 最終判定は必ず **verse 単位**で行う。

---

## 2. レビュー工程

各章節について次の順序でレビューする(M-1 の改善順序に対応)。

```
Verse
  ↓
Data 確認         … 起点の代表語が安定・非破損・非誤データか
  ↓
Morph 反映確認    … 性数格人称 mood の語形が反映されているか
  ↓
Syntax 反映確認   … 関係詞頭語・deixis 等の決定分が反映されているか（語順は不変）
  ↓
Semantic 反映確認 … LN 語義・決定的意味が反映されているか（未判定は現状維持か）
  ↓
Reading Japanese 品質確認 … 章節として読解可能・接続・一貫・非誤解・非破損か
  ↓
最終判定          … verse 単位で採用/修正/保留を決定
```

- **問題が見つかった場合、原因層を必ず記録する**: **Data / Morph / Syntax / Semantic / Builder** の
  いずれか(複数可)。原因層の記録は、当該層への差し戻し(将来の是正)の根拠となる。
- 原因層の切り分けは L-1(Baseline)・各 Completion の責務境界に照らす(例: 性数未反映=Morph、
  関係詞構造=Syntax、語義=Semantic、章節統合=Builder、誤データ=Data)。

---

## 3. 採用条件(Accepted)

Reading Japanese が L-0 の**「ふさわしい章節」**を満たすとき採用する。評価基準:

| 基準 | 内容 |
|---|---|
| **構造忠実性** | ギリシャ語の形態・構造が隠れず反映されている |
| **読解可能性** | 章節として意味が取れる |
| **非破損** | 二重助詞・不正活用・意味不明形がない |
| **非誤解** | ギリシャ語と異なる意味に読めない |
| **章節内一貫性** | 同語・同構造の扱いが一貫 |
| **決定的情報の適切な反映** | Morph / Syntax / Semantic の決定的情報が適切に反映されている |

- **自然さのみを採用理由としない**(L-0 §7)。自然だが構造を隠す/推論を足す場合は採用しない。

---

## 4. 却下条件(Revise Required)

以下はいずれも却下(修正が必要)とする。

| 却下 | 内容 |
|---|---|
| **翻訳になっている** | 自然な目標言語文へ書き換えられている |
| **語順変更** | 関係節前置・語順再構成がある(K-5 で不採用) |
| **意味推論** | 既存注釈にない意味が補われている |
| **構造隠蔽** | 自然化のためにギリシャ語構造が消されている |
| **神学補完** | 神学的解釈が足されている |
| **自然さだけを理由とした変更** | 構造忠実性を伴わない自然化 |
| **Builder が責務外の判断** | Builder が判定・推論・翻訳をしている(内部処理の逸脱) |

- 却下は **Revise Required** として記録し、原因層を付す。

---

## 5. 保留条件(Pending)

以下は **Builder では解決しない**(Engine/注釈/corpus 側の不足)ため、**保留**として記録する。

| 保留 | 例 |
|---|---|
| **Morph 未対応** | ἡμῶν の number(G2257 は Morph v1 対象外)等 |
| **Syntax 未判定** | 指示詞 adnominal・関係詞 role null |
| **Semantic 未判定** | person-leveling 残(ἑαυτοῦ 497)・pron intensive 残 |
| **corpus 側不足** | referent の実トークン解決不可(先行詞欠落 等) |
| **注釈不足** | LN 非該当(6.7%)・role/referent 欠落 |
| **Engine 側の情報不足** | 決定的信号が存在しない |

- **保留理由を必ず記録する**(どの層の不足か)。保留は当該層の将来是正の入力となる。
  保留は「品質不良」ではなく「現時点で決定的に解決できない」ことの記録であり、推論で埋めない。

---

## 6. レビュー状態

各 verse を次の 4 状態で管理する。

| 状態 | 定義 |
|---|---|
| **Not Reviewed** | 未レビュー |
| **Accepted** | 採用(L-0 のふさわしい章節を満たす) |
| **Revise Required** | 修正が必要(却下条件に該当・原因層記録) |
| **Pending** | Engine/注釈/corpus 側不足等により保留(保留理由記録) |

- 各 verse は常にいずれか 1 状態を持つ(初期は Not Reviewed)。
- Revise Required / Pending は **原因層・理由**を伴う。

---

## 7. QA

| 項目 | 内容 |
|---|---|
| **NT 全巻のレビュー状況管理** | 7,939 章節それぞれに 4 状態(+ 原因層/理由)を対応づけて管理できる設計 |
| **状態別件数の集計** | 少なくとも **Not Reviewed / Accepted / Revise Required / Pending** の件数を集計できること |
| **レビュー対象** | **bible_data.japanese(最終成果物)** を対象とする。**Builder(内部処理)はレビュー対象にしない** |
| **原因層の集計** | Revise Required / Pending を原因層(Data/Morph/Syntax/Semantic/Builder/corpus/注釈)別に集計できること |
| **L-0 準拠** | 評価基準が L-0(ふさわしい・改善悪化・意味推論禁止・章節評価)と一致すること |
| **重複監査** | NT 全巻・実 FS・重複「 2.json」不在の確認(H-5/H-6 教訓) |

- レビュー状態の管理・集計は **設計として定義**する(本 Stage で管理ツール・UI は実装しない)。

---

## 8. 完了条件(本 Framework の充足確認)

| 完了条件 | 充足 |
|---|---|
| bible_data.japanese をレビューする工程が定義される | §2 |
| 品質評価基準が L-0 と一致する | §3(L-0 のふさわしい定義に準拠) |
| 採用・修正・保留の判断基準が明文化される | §3/§4/§5 |
| レビュー状態を記録できる | §6(4 状態 + 原因層/理由) |
| 品質保証単位が verse として確定する | §1 |
| Builder に新たな責務を追加しない | Builder は内部処理・レビュー対象外(冒頭・§7) |
| bible_data.japanese を唯一の最終成果物として扱う | 冒頭・§7 |
| L-0〜M-4 と責務の矛盾がない | 各層の責務境界に準拠(§2 原因層・§5 保留) |

---

## 責務凍結(候補)

```
[reading-japanese-editorial-review-framework FROZEN候補 2026-07-20]
対象: bible_data.japanese（最終成果物）。Builderは内部処理でレビュー対象外
単位: verse（token/phrase/clauseは中間確認）
工程: Verse → Data確認 → Morph反映確認 → Syntax反映確認 → Semantic反映確認 → RJ品質確認 → 最終判定（問題は原因層記録）
採用(Accepted): L-0ふさわしい章節（構造忠実/読解可能/非破損/非誤解/章節一貫/決定的情報反映）。自然さのみを理由にしない
却下(Revise Required): 翻訳/語順変更/意味推論/構造隠蔽/神学補完/自然さのみ/Builder責務外判断
保留(Pending): Morph未対応/Syntax未判定/Semantic未判定/corpus不足/注釈不足/Engine情報不足（理由必須記録・推論で埋めない）
状態: Not Reviewed / Accepted / Revise Required / Pending（4状態・原因層/理由付）
QA: NT全巻7939章節の状態管理・件数集計・原因層集計・L-0準拠・重複監査。対象はbible_data.japanese
やらない: Builder実装/engine修正/bible_data修正/Morph-Syntax-Semantic修正/Presentation修正/UI変更（設計のみ）
```

本 Framework は凍結可能な状態である。承認により FROZEN 化し、以後の bible_data.japanese の章節レビューは
本 Framework に照らして行う。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結候補(レビュー単位=verse・レビュー工程・採用/却下/保留条件・4 状態・QA・完了条件。対象は bible_data.japanese・Builder は対象外) |
