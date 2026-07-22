# Reading Japanese Adoption Decision Framework(Stage M-13)

策定日: 2026-07-22
位置づけ: **M-12 で生成した Editorial Review 台帳**
(`scripts/output/reading-japanese-editorial-review-records.json`)**を入力に、
最終成果物 bible_data.japanese へ何を反映可能かを決定する採用判断工程**を定義する。
**本 Stage は実装・反映を行わない。bible_data は不変。採用可否の判断基準と責務境界のみを定義する。**
根拠(FROZEN): reading-japanese-policy.md(L-0)・-builder-adoption-integration-freeze.md(M-8f)・
-editorial-review-integration-design.md(M-9)・-editorial-full-review-infrastructure-design.md(M-11)・
-editorial-full-review-report.md(M-12)。
数値はクリーン NT 実測(7,939 verse・重複「 2.json」不在)。

---

## 0. 現在の状態(前提)

- **bible_data.japanese = Data 代表語を保持した不変データ**(起点)。
- **Builder = 決定的 fact のみ採用する統合層**(Morph 2,087 純複数人称/総計 15,965・Syntax 179)。
- **Editorial Review = verse 単位で Accepted/Revise/Pending を判定する台帳**(M-12)。
- **M-12 結果**: 7,939 verse = Accepted 5,082 / Revise 0 / Pending 2,857(原因 Discourse/Corpus/Semantic)。

---

## 1. 採用単位

- **最終単位 = verse**。token/phrase/clause は**採用理由確認用**(diff の原因追跡)。
- **一部 token の変更であっても verse 単位で管理する**(verse アトミック)。
- **含意**: verse 内に 1 つでも Pending が存在すれば、**その verse の決定的採用も保留**される
  (verse 単位で反映/保留を切り替え・部分反映しない)。これにより責務境界(未判定を混ぜない)を守る。

---

## 2. 採用対象分類

| 分類 | 条件 | 扱い |
|---|---|---|
| **A. 自動採用可能** | Morph fact 決定的 **かつ** Syntax fact 決定的(該当時)**かつ** Builder Adoption 済み **かつ** Editorial **Accepted** | **反映候補**。例: 私→私たち・あなた→あなたがた・この→これ(pronominal neuter) |
| **B. 保留** | **Pending が存在**(Discourse/Semantic/Corpus/情報不足) | **推論禁止のため反映しない**(未解決が解けるまで verse ごと保留) |
| **C. 採用不可** | Editorial **Revise Required**、または **L-0 違反**となる変更 | **反映しない**(破損修正は表示層で・L-0 違反は永久に不可) |

- **A の必須 4 条件はすべて満たす必要がある**。**Editorial Accepted でない verse は A に入らない**
  (決定的 Morph 採用があっても、同 verse に Pending があれば B)。

---

## 3. bible_data.japanese 反映ポリシー

| 反映可能 | 反映禁止 |
|---|---|
| **決定済み Morph 語形**(number/person/gender/case・私たち/あなたがた/彼ら/〜する者 等) | 語義選択(lnDomain gloss・不定詞) |
| **決定済み Syntax fact による reading 修正**(pronominal neuter の これ/これら/あれ) | 自然な日本語への変更 / 文脈補完 |
| | Discourse 解釈(この/その距離・anaphora) |
| | 神学補完 / 翻訳改善 |

- **反映可能=一意性の勾配で「一意」に該当するもののみ**(Morph/決定済み Syntax・M-8f)。
- **反映禁止=非一意・文脈依存・意味/談話判断**(Semantic 語義選択/Discourse)。**Adoption は判断のみで
  推論しない**(L-0)。

---

## 4. 変更モデル(adoption diff)

bible_data を反映する場合、**変更ごとに以下を必須記録**する(adoption diff レコード)。

```json
{
  "verseId": "n43001031",
  "token": "n43001031011",
  "before": "この",
  "after": "これ",
  "source": "syntax",
  "reason": "pronominal-neuter-verb-referent"
}
```

| フィールド | 内容・制約 |
|---|---|
| `verseId` / `token` | 変更 verse / トークン(理由確認単位) |
| `before` | 変更前(Data 代表語 = 現 bible_data.japanese) |
| `after` | 変更後(Builder 確定 reading = 決定語形) |
| `source` | 原因層(`morph` / `syntax` のみ・**semantic/discourse は不可**) |
| `reason` | 決定的根拠(`plural-person` / `pronominal-neuter-verb-referent` 等) |

- **before/after/reason/source layer の 4 点必須**。source は **morph/syntax のみ許可**(反映可能範囲)。
- diff は **rollback と監査の一次情報**(§6)。

---

## 5. 反映範囲の集計(M-12 台帳から算出)

| 区分 | 件数 |
|---|---|
| 総 verse | 7,939 |
| **採用候補 verse**(A: Accepted かつ 採用あり) | **4,156** |
|   うち Morph adoption verse | 4,140 |
|   うち Syntax adoption verse | 117 |
| Accepted かつ 採用なし(既に Data 代表語=反映差分なし) | 926 |
| **保留 verse**(B: Pending) | **2,857** |
| 採用不可 verse(C: Revise) | 0 |
| **未反映 verse**(保留 + 差分なし Accepted) | **3,783** |

- **検算**: 採用候補 4,156 + 差分なし Accepted 926 + Pending 2,857 + Revise 0 = **7,939** ✓。
- **注記**: Morph 採用のある verse は全巻 6,708 だが、**うち 2,568 は Pending(採用と Pending 併存)**で
  **A に入らず保留**(verse 単位)。決定的採用でも Pending verse では反映を待つ。

---

## 6. Rollback 方針

反映後も bible_data.japanese を**元に戻せることを保証**する。三重の復元経路を必須とする。

| 経路 | 内容 |
|---|---|
| **adoption diff ファイル** | before/after/reason/source を全変更について保持(逆適用で復元可能) |
| **git history** | bible_data.japanese の変更履歴(コミット単位で復元) |
| **Editorial Review 台帳** | 採用判断の根拠(status/pending)を永続保存 |

- **before を保持する adoption diff があれば、任意時点で Data 代表語へ逆適用できる**(可逆性の保証)。

---

## 7. 責務境界

| 層 | 役割 |
|---|---|
| **Data** | 代表語の保持(起点) |
| **Morph** | 語形決定(number/person/gender/case) |
| **Syntax** | 構造決定(role/referent/pronominal) |
| **Semantic** | 意味情報提供(**語義選択はしない**) |
| **Discourse** | 将来の談話解決(この/その・anaphora) |
| **Builder** | 決定 fact 採用(記録層) |
| **Editorial** | 品質判定(Accepted/Revise/Pending) |
| **Adoption(本工程)** | **反映判断のみ**(何を bible_data へ反映するかの決定・推論しない) |

- **Adoption は新たな fact を作らない**。Builder/Editorial の出力を受け、**A/B/C に分類して反映可否を判断する
  だけ**の層である。

---

## 8. この Stage でやらないこと

- bible_data 変更 / Builder 修正 / Morph 修正 / Syntax 修正 / Semantic 修正 / Discourse 実装 / UI 変更。
- **本 Stage は判断基準・責務境界の定義のみ**(実装・反映は次 Stage)。

---

## 9. 追加設計判断:bible_data.japanese の保持方針

- **最終成果物では bible_data.japanese = 採用済み Reading Japanese** とする(単一の正規値)。
- **旧 Data 代表語を bible_data 内に `japanese_old` / `japanese_new` の形で二重保持しない**。
  - **理由**: Data 層と Reading 層を同一 JSON 内に混在させると、**どちらが正規成果物か不明確**になり、
    L-0〜M-12 で確立した **Data / Builder / Editorial の責務境界を崩す**。
- **旧値の保存は bible_data の外で行う**:

| 保存先 | 保持内容 |
|---|---|
| **adoption diff** | before(旧値)/ after(新値)/ reason / source layer(変更監査・rollback) |
| **git history** | 変更履歴として復元可能 |
| **Editorial Review 台帳** | 採用判断の根拠として永続保存 |

- **反映後の責務**:
  - bible_data.japanese → 最新の**採用済み Reading Japanese**(単一正規値)。
  - Builder → 必要な metadata と fact を保持(再生成可能)。
  - Editorial Review → 採用判断履歴。
  - adoption diff → 変更監査・rollback 情報(before を保持)。
- **禁止**: bible_data 内に `japanese_old` / `japanese_new` を追加すること。

---

## 10. 完了条件

| 完了条件 | 充足 |
|---|---|
| Accepted の反映条件が明文化される | ✓ A の必須 4 条件(Morph/Syntax 決定的・Adoption 済み・Editorial Accepted) |
| Pending が反映されない理由が明確になる | ✓ B=Pending 存在で verse ごと保留・推論禁止(§1/§2) |
| bible_data 変更時の安全条件が定義される | ✓ adoption diff(before/after/reason/source)必須 + 三重 rollback(§4/§6) |
| Builder/Editorial/Adoption の責務境界が維持される | ✓ Adoption=反映判断のみ・fact を作らない(§7) |
| L-0〜M-12 と矛盾しない | ✓ 一意性の勾配・推論禁止・別台帳・bible_data 単一正規値 |
| 次 Stage で安全に反映実装できる状態 | ✓ A 分類 4,156 verse・diff schema・rollback・保持方針が確定 |

---

## 11. 最重要判断

- **反映の最小単位を verse とし、verse 内に 1 つでも Pending があれば決定的採用も保留する**
  (verse アトミック)。これにより **未判定情報が bible_data に混入する経路を断つ**。結果、自動採用可能は
  Accepted かつ採用ありの **4,156 verse**、保留は **2,857 verse**(Morph 採用併存の 2,568 verse を含む)。
- **bible_data.japanese は単一の正規値(採用済み Reading Japanese)とし、`japanese_old/new` を持たない**。
  旧値は **adoption diff / git / Editorial 台帳**の三経路で保持し、**Data 層と Reading 層の混在を避ける**。
  これが L-0〜M-12 の責務境界を反映後も守る鍵である。
- **Adoption は反映判断のみで fact を作らない**。反映可能は **Morph 決定語形・決定済み Syntax(pronominal
  neuter)** に限り(一意性の勾配)、**Semantic 語義選択・Discourse 解釈・翻訳/自然化は永久に反映禁止**。
  これで **原文(新改訳)を Data として起点保持しつつ、決定的構造のみを反映した Reading Japanese へ
  安全に移行できる状態**が定義され、次 Stage の反映実装に接続する。

---

## 凍結(候補)

```
[reading-japanese-adoption-decision-framework FROZEN候補 2026-07-22]
入力: M-12台帳(reading-japanese-editorial-review-records.json)。本Stageは判断基準のみ・bible_data不変・実装なし
採用単位: verse（token/phrase/clauseは理由確認・verseアトミック=verse内にPending1つでも決定的採用も保留）
分類: A自動採用可能(Morph/Syntax決定的+Adoption済+Editorial Accepted) / B保留(Pending存在・推論禁止で反映しない) / C採用不可(Revise or L-0違反)
反映可能: 決定済みMorph語形 / 決定済みSyntax(pronominal neuter)。反映禁止: 語義選択/自然化/文脈補完/Discourse/神学/翻訳
変更モデル: adoption diff {verseId,token,before,after,source(morph/syntaxのみ),reason} 必須
集計(台帳): 総7939 / 採用候補4156(Morph4140/Syntax117) / 差分なしAccepted926 / 保留Pending2857 / Revise0 / 未反映3783。検算7939✓。Morph採用6708中2568はPendingで保留
Rollback: adoption diff(before保持) + git history + Editorial台帳 の三重で可逆
責務: Data=代表語保持 / Morph=語形 / Syntax=構造 / Semantic=意味提供(語義選択せず) / Discourse=将来 / Builder=fact採用 / Editorial=品質判定 / Adoption=反映判断のみ(fact作らない)
保持方針: bible_data.japanese=採用済みReading Japanese(単一正規値)。japanese_old/new二重保持は禁止(Data/Reading層混在=責務境界崩壊)。旧値はdiff/git/台帳で保存
完了: A反映条件明文化 / Pending保留理由明確 / 安全条件(diff+rollback) / 責務境界維持 / L-0〜M-12整合 / 次Stageで安全反映可能
```

本設計は凍結可能な状態である。承認により FROZEN 化し、次 Stage で **A 分類(4,156 verse)の反映を
adoption diff + rollback 保証つきで安全に実装**する(bible_data.japanese を採用済み Reading Japanese へ)。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結候補(採用判断: verse アトミック・A/B/C 分類・反映ポリシー・adoption diff・集計 採用候補4156/保留2857・三重 rollback・責務境界・bible_data 単一正規値/japanese_old-new 禁止) |
