# Reading Japanese Adoption Execution Design(Stage M-14)

策定日: 2026-07-22
位置づけ: **M-13 Adoption Decision Framework で確定した採用範囲(A 分類 4,156 verse)を、
bible_data.japanese へ安全に反映するための実行設計**を定義する。
**本 Stage では実装・データ変更を行わない。反映手順・差分管理・QA・Rollback のみを設計する。**
根拠(FROZEN): reading-japanese-policy.md(L-0)・-adoption-decision-framework.md(M-13)・
-builder-adoption-integration-freeze.md(M-8f)・-editorial-full-review-report.md(M-12)。
数値はクリーン NT 実測(7,939 verse・重複「 2.json」不在)。

**成果物は本ドキュメントのみ。コード・データ・bible_data は一切変更しない。**

---

## 0. 現在状態と設計原則

- **bible_data.japanese = Data 代表語(未反映)**。採用候補 A 分類 = **4,156 verse**
  (Morph Adoption 4,140 verse / Syntax Adoption 117 verse)。保留 2,857・Revise 0。
- **設計原則(M-13)**: 反映後、bible_data.japanese は **採用済み Reading Japanese を唯一の正規値**とする。
  **旧値は保持しない**(bible_data 内に `japanese_old/new` を持たない)。旧値は
  **adoption diff / git / Editorial 台帳**で復元可能にする。

---

## 1. 反映対象確認

- **反映対象は M-13 A 分類のみ**。verse は以下 3 条件を**すべて**満たすこと:
  - `verse status = Accepted` **かつ**
  - **採用 fact が存在**(morphAdopted または syntaxAdopted があるトークンを含む) **かつ**
  - **Pending が存在しない**。
- **禁止**: Pending verse の部分反映 / token 単位での verse 切り出し反映 / Editorial 推論による補正。
  → **反映/保留は verse アトミック**(M-13 §1)。Pending が 1 つでもある verse は verse ごと保留。

---

## 2. 反映対象優先順位

| Phase | 対象 | 条件 |
|---|---|---|
| **Phase A** | **Morph Adoption** | `source=morph` ・ reason が決定的 ・ number/person/gender/case が strong/morph と一致 |
| **Phase B** | **Syntax Adoption** | `source=syntax` ・ `reason='pronominal-neuter-verb-referent'` ・ referent class='verb' が決定的 |
| — | Semantic / Discourse | **対象外**(反映しない) |

- **Phase A → Phase B の順**で処理(排他・Morph×Syntax 同時採用 0=M-8f)。
- Phase A の Morph 語形には **純複数人称(私たち/あなたがた)に加え、αὐτός(彼→彼ら)・関係詞(〜する者)・
  分詞形など決定的 Morph 規則の全語形**を含む(いずれも `source=morph`・決定的)。

---

## 3. adoption diff 仕様

反映前に**必ず生成**する(1 トークン変更=1 レコード)。

```json
{
  "verseId": "n43001031",
  "tokenId": "n43001031011",
  "before": "この",
  "after": "これ",
  "source": "morph | syntax",
  "reason": "plural-person | pronominal-neuter-verb-referent | …"
}
```

| 必須条件 | 内容 |
|---|---|
| **before が旧 bible_data.japanese と一致** | `before = 現 token.japanese`(反映前値) |
| **after が Builder 出力と一致** | `after = Builder 確定 reading`(morphAdopted/syntaxAdopted 反映後) |
| **source は morph または syntax のみ** | semantic/discourse は生成不可 |

### 3-1. diff 件数の実証(A 分類・台帳 + Builder 出力から算出)

| 区分 | トークン diff |
|---|---|
| **Phase A(Morph)** | **9,412** |
| **Phase B(Syntax)** | **123**(この→これ 115 / これらの→これら 6 / あの→あれ 2) |
| **合計** | **9,535** |
| **before ≠ 現 japanese(不整合)** | **0**(全 diff の before が現 bible_data.japanese と一致) |

- Morph diff 上位: あなた→あなたがた(の/を)・彼→彼ら(に/の)・言う→言いながら・〜する者→〜するもの 等。
- **before 不整合 0** は、反映が「現 japanese を after で置換するだけ」で成立することを保証する(§4)。

---

## 4. 反映処理

| 要素 | 定義 |
|---|---|
| **入力** | current bible_data.japanese ＋ adoption diff |
| **処理** | **diff 対象トークンのみ** `japanese := after`(before 一致を確認してから置換) |
| **出力** | new bible_data.japanese(採用済み Reading Japanese・単一正規値) |

- **禁止**: Builder 再判定 / Morph・Syntax 再計算 / Semantic 追加判断。**処理は diff の機械適用のみ**
  (before 一致検証 → after 置換)。
- **冪等性**: 反映後に Builder を再実行すると、`raw(=新 japanese)` と reading が一致し
  **morphAdopted/syntaxAdopted は null(= 既反映)**になる。**二重適用 0**を QA で確認する(§5)。

---

## 5. QA(反映前後)

### 5-1. 件数・構造(必須)

| 項目 | 合格条件 |
|---|---|
| 変更件数一致 | 実変更トークン数 = adoption diff 件数(9,535) |
| diff 件数一致 | Phase A 9,412 / Phase B 123 |
| A 分類 verse 数一致 | 変更 verse = 4,156(A 分類) |
| **Pending verse 不変** | 2,857 verse の japanese 完全不変 |
| **Revise 不変** | 0 |
| bible_data JSON 構造維持 | キー構成・トークン数・CRLF 等不変(japanese 値のみ変化) |

### 5-2. 内容確認

| 層 | 確認 |
|---|---|
| **Morph** | 私→私たち・あなた→あなたがた が反映・**単数誤変換なし**(G4675 単数 σου 不変) |
| **Syntax** | この→これ・これらの→これら・あの→あれ・**pronominal neuter のみ** |

### 5-3. 禁止変更(0 であること)

- 語義変更 / 自然化 / 語順変更 / Discourse 変更 = **すべて 0**(diff は morph/syntax のみ・before→after は
  決定語形のみ)。

---

## 6. Rollback 設計

反映失敗・要巻き戻し時の復元を保証する。

| 手段 | 内容 |
|---|---|
| **adoption diff から逆変換** | 各レコードの `before` を再適用(after→before)で Data 代表語へ復元 |
| **git revert** | 反映コミットを revert |

### 必要成果物

| 成果物 | 内容 |
|---|---|
| **adoption diff** | 全変更(before/after/source/reason)・逆適用可能 |
| **adoption report** | 反映件数・Phase 別・QA 結果の記録 |
| **変更前 hash** | 反映前 bible_data のハッシュ(検証用) |
| **変更後 hash** | 反映後 bible_data のハッシュ(検証用) |

- **before を保持する adoption diff + 前後 hash + git** の三重で、**任意時点で可逆**。

---

## 7. 反映後の Editorial 扱い

- 反映後も **Editorial Review 台帳は保持**(`source=editorial-review`)し、**採用判断を履歴化**する。
- **再評価が必要な場合**: 新しい Builder output ＋ Editorial Review で **再生成可能**
  (bible_data.japanese は Builder が facts=morph/syntax 注釈から再導出でき、台帳は判断根拠を保持)。

---

## 8. この Stage でやらないこと

- 実際の bible_data 変更 / Semantic 改善 / Discourse 実装 / Corpus 修正 / Builder 変更 /
  Morph・Syntax 変更 / UI 変更。**本 Stage は実行設計のみ**。

---

## 9. 完了条件

| 完了条件 | 充足 |
|---|---|
| 反映対象が明確 | ✓ A 分類 4,156 verse・9,535 token diff(Phase A 9,412/Phase B 123) |
| verse 単位採用が維持される | ✓ verse アトミック・Pending 部分反映禁止(§1) |
| diff による監査可能性がある | ✓ adoption diff(before/after/source/reason)必須(§3) |
| rollback 可能 | ✓ diff 逆適用 + git + 前後 hash の三重(§6) |
| Pending 混入を防止できる | ✓ Pending verse は verse ごと保留・2,857 不変(§5) |
| bible_data 単一正規値方針を維持 | ✓ japanese=採用済み Reading・旧値は diff/git/台帳(§0/§7) |
| L-0〜M-13 と矛盾しない | ✓ 一意性の勾配・推論禁止・morph/syntax のみ反映 |

---

## 10. 最重要判断

- **反映処理は「adoption diff の機械適用」に限定する**(before 一致検証 → after 置換)。**Builder 再判定・
  Morph/Syntax 再計算・Semantic 追加判断を一切禁止**することで、反映工程に推論が混入する経路を断つ。
  before 不整合 0 の実証により、**現 japanese を after で置換するだけで反映が成立**する。
- **反映は A 分類 4,156 verse・9,535 token に限定**され、**Pending 2,857・Revise 0 は完全不変**。
  verse アトミックにより、決定的採用があっても Pending を含む verse には触れない(未判定の混入防止)。
- **可逆性を三重(adoption diff の before / git / 前後 hash)で保証**し、**bible_data.japanese を単一正規値
  (採用済み Reading Japanese)**へ移行する。これで **原文(新改訳)を起点保持しつつ決定的構造のみを
  反映する**実行手順が、安全条件つきで確定した。次 Stage で本設計に従い反映を実装する。

---

## 凍結(候補)

```
[reading-japanese-adoption-execution-design FROZEN候補 2026-07-22]
対象: M-13 A分類のみ（Accepted かつ 採用fact有 かつ Pending無）= 4,156 verse。実装なし・bible_data不変
反映単位: verseアトミック（Pending部分反映禁止・token単位反映禁止・Editorial補正禁止）
優先順: Phase A Morph(source=morph・number/person一致・αὐτός/関係詞/分詞/複数人称含む) → Phase B Syntax(source=syntax・pronominal-neuter-verb-referent)。Semantic/Discourse対象外
adoption diff: {verseId,tokenId,before(=現japanese),after(=Builder reading),source(morph/syntaxのみ),reason} 必須
diff実証(A分類): Phase A 9,412 + Phase B 123 = 9,535 token。before≠現japanese=0（機械適用で成立）
反映処理: current japanese + diff → before一致検証してafter置換のみ。Builder再判定/Morph・Syntax再計算/Semantic追加判断=禁止。冪等（反映後re-runでadopted=null・二重適用0）
QA: 変更件数=diff件数9535 / A分類verse4156 / Pending2857不変 / Revise0不変 / JSON構造維持 / Morph単数誤変換0 / Syntax pronominal neuterのみ / 禁止変更(語義/自然化/語順/Discourse)0
Rollback: adoption diff(before逆適用) + git revert + 変更前後hash の三重で可逆。成果物=diff/report/前hash/後hash
反映後: Editorial台帳保持(source=editorial-review)・再評価は新Builder output+Editorialで再生成可
保持方針: bible_data.japanese=採用済みReading（単一正規値）。japanese_old/new禁止。旧値はdiff/git/台帳
```

本設計は凍結可能な状態である。承認により FROZEN 化し、次 Stage で **A 分類 4,156 verse・9,535 token の
反映を adoption diff + 三重 rollback 保証つきで実装**する(bible_data.japanese を採用済み Reading Japanese へ)。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結候補(反映実行設計: A 分類 4,156verse・9,535token diff・Phase A/B・adoption diff 仕様・機械適用・QA・三重 rollback・単一正規値・実装なし) |
