# DA-5 Discourse Feature Closure Audit

作成: 2026-08-16
Phase: **DA-5（Read-only Closure Audit）**
State: STATIC_AUDIT（READ ONLY）
対象コミット: `9fe85394`（DA-1 + DA-2b）
位置づけ: 現在の Discourse 機能が **意図的に境界づけられた完成した読み方**として FREEZE できるかを判定する。
新機能の発案はしない。証拠が正当化する範囲で「CLOSE / FREEZE」に至れるかを問う。
根拠(FROZEN/既存): DA-0〜DA-4 の各監査doc・`CLAUDE.md`(L-0/First Principle/FROZEN Protocol)。

Evidence 凡例: **CONFIRMED**（実データ/実コード/回帰実測）。

---

## 1. Executive Verdict

# CLOSED WITH NOTE

現在の Discourse View は、定義された読書目的
> 「段落内の節が明示的な語彙マーカーでどう接続されるかを読者が見られる。意味的談話解釈は未解決のまま残す。」
を **安全に充足しており、FREEZE 可能**。

FREEZE 判定 10 基準（§15）を**すべて充足**。残る2点は**ブロッカーではない NOTE**:
1. 用語「談話分析」が意味解釈まで示唆しうる（機能はしていない）→ 最小の任意調整を提案（実装しない）。
2. `discourse-unit-representation-schema.md`(DA-2a) は単独で読むと clause-node units を志向するが、FREEZE 実装は top-level（DA-2b NOTE / DA-2c で確定）→ DA-2a→2b→2c を順に読む前提。

---

## 2. DA-0 → DA-4 Consistency — **PASS**

6 docs を通読し、意図的な phase 境界を除いて **未解決の矛盾は無い**。

| 項目 | 各 doc の整合 |
|---|---|
| Unit 定義 | flow-tree node を基礎とする（DA-2a）。実装は top-level（DA-2b/2c）。**整合（後続 phase が明示的に確定）** |
| top-level vs nested | top-level 表示・nested は Structure Flow（DA-2c）。**整合** |
| parentUnitId | flow-tree parentId 逐語・top-level では null（DA-2a caveat / DA-2b）。**整合** |
| connections[] | 決定的 lexical marker（DA-3）。**整合** |
| relations[] | 空・意味関係は未確定（DA-2b/DA-3/DA-4）。**全 doc 一致** |
| clause.discourse | 非投影・heuristic（DA-2/DA-4）。**整合** |
| semantic relation | authoritative source ゼロ・NOT READY（DA-4）。**整合** |
| Renderer 責務 | top-level 節間フロー表示のみ。**整合** |
| Structure Flow 責務 | within-clause 階層（DA-2c）。**整合** |
| L-0 / Reading-first | 全 doc で厳守。**整合** |

**唯一の documented divergence（矛盾ではなく phase 境界）**: DA-2a schema（clause-node units 志向）vs FREEZE 実装（top-level）。
DA-2b が PASS WITH NOTE で理由（renderer flat・over-segmentation 回避）を明記し、DA-2c が E＋F で正式確定済み。
→ §2 の規定「意図的 phase 境界は矛盾として報告しない」に該当。**§1 の NOTE 2 として記録**（doc 読解順の注意）。

---

## 3. Final Responsibility Map（§3・CONFIRMED）

| Information | Source of Truth | Representation | Renderer | Status |
|---|---|---|---|---|
| clause Unit | flow-tree top-level node（`sentences[]`） | `units[].unitId/unitType` | DiscourseRenderer（top-level 行） | **CLOSED** |
| parent/child structure | flow-tree `parentId`/`children` | `units[].parentUnitId/tokenRefs`（**内部保持・非表示**） | 非表示（Structure Flow が表示） | **CLOSED** |
| lexical connective | bible_data token（`lemma`/`class`/`japanese`） | `connections[]`（from/to/lemma/greek/ja） | connector badge | **CLOSED** |
| connection direction | reading-order 隣接（unit 列順） | `connections` from/to | 縦・前→現 unit | **CLOSED**（display direction） |
| semantic relation | （authoritative source 無し） | `relations[] = []` | 非表示 | **EXCLUDED（空で凍結）** |
| referent | bible_data `referent`（源注釈） | discourse rep に**含めない** | 非表示（L-0） | **EXCLUDED** |
| translation | `translations/*.json` | TranslationRenderer（別 kind） | 別モード | **CLOSED（別責務）** |
| within-clause structure | flow-tree（NeighborhoodView） | Structure Flow representation | Structure Flow | **CLOSED（Structure Flow が所有）** |

**責務の二重所有なし。** Discourse＝**節間**接続（top-level）／Structure Flow＝**節内**包含。
`parentUnitId`/`tokenRefs` は Discourse Representation に**内部保持**するが**表示しない**（構造忠実性のためであり、Structure Flow と競合する表示ではない）。

---

## 4. Representation Completeness — **PASS（NOTE: 内部保持フィールドあり）**

現行フィールド `{kind, scope, units[{unitId,unitType,parentUnitId,tokenRefs, (id,verseLabel,words,connective)}], connections[], relations[]}`。

1. **欠落**: なし（現 Renderer が必要とする verseLabel/words/connective/connections は揃っている）。
2. **冗長**: `id` と `unitId` が同値（renderer 互換のため `id` を維持・DA-2b で説明済み）。害はない。
3. **誤解を招く**: なし（unitType は verbatim 構造識別で、意味主張ではない）。
4. **未使用だが構造忠実性のため意図的保持**: `parentUnitId`/`tokenRefs`（表示されないが Rep/Presentation 分離の正しい状態・DA-2c §7）。
5. **データが支えられない意味主張を含むフィールド**: なし（relations[] 空・意味ラベルなし）。

→ **理論的完全性のためのフィールド追加はしない**（§4 規定）。現状で十分。

---

## 5. relations[] Contract — **FROZEN**

> **`relations[]` は空を維持する。**
> **authoritative かつ deterministic な source→target 談話関係注釈が導入されるまで、いかなる意味関係も投影しない。**

DA-4 の確定（authoritative source=0・confidence<1.0・source/target 対応が inference・fact 化は L-0 FAIL）により、これは**凍結契約**として妥当。
この空契約は Discourse 機能を閉じるのに**十分**（意味関係の不在は「実装の欠落」ではなく設計上の到達点）。

---

## 6. clause.discourse Boundary — **PASS**

| 層 | clause.discourse.{type,confidence,marker} の扱い |
|---|---|
| 内部 Analysis 能力 | 存在してよい（clause-analyzer が計算・ReadingFormatter が内部消費）。**変更しない** |
| Representation 能力 | **投影しない**（heuristic・confidence<1.0） |
| UI 能力 | 既存の soft reading hint（語詳細）としてのみ・Representation の relation としては露出しない |

> **Analysis に heuristic な discourse 分析が存在することは、それを露出する architectural obligation を生じない。答えは No。**

Analysis は変更しない。Representation は heuristic を fact 化しない。**恒久的に Discourse Representation の外**。

---

## 7. DA-2c — **CLOSED（恒久 DEFERRED）**

- top-level 表示は**意図的**（実データ: 入れ子は深さ5–8・冗長ラッパー20–30%・章あたり70–246 clause node）。
- nested 構造は既に **Structure Flow** で word-anchored 提供済み。
- 全 nested clause 表示は Structure Flow の**重複**＋読書 UX 破壊。
- **具体的な reader 要求が現存しない**。

→ DA-2c は「未完成の作業」ではなく**恒久 DEFERRED**（Representation は階層を内部保持・再開は具体的 reader 要求が示された時のみ）。**Closure をブロックしない。**

---

## 8. DA-3 — **CLOSED**

現行 `connections[]`（from/to/lemma/greek/ja）は現在の reader 目的に**十分**。
追加の marker object / direction field / connection type / relation label / metadata は**不要**（DA-3 で確定）。
**装飾的スキーマ refactor は推奨しない**（§8 規定）。**Closure をブロックしない。**

---

## 9. L-0 Final Audit — **PASS**

現 Discourse 経路全体（build → connections → render）で:

| 項目 | 判定 |
|---|---|
| translation / naturalization | **なし**（既存 japanese の逐語転写のみ・surface 並替なし） |
| semantic inference / discourse relation inference | **なし**（relations[] 空・関係ラベル未生成・実測 HTML に reason/result 等なし） |
| referent resolution | **なし**（referent 非投影） |
| arbitrary meaning selection / false certainty | **なし**（confidence 露出なし・heuristic 非投影） |
| hidden interpretation | **なし** |

**明示検証（すべて CONFIRMED）:**
- **lexical marker ≠ semantic relation**（DA-3・DA-4 負テスト）。
- **structural containment ≠ discourse relation**（parentUnitId は構造ポインタのみ）。
- **project-generated heuristic ≠ authoritative fact**（clause.discourse 非投影）。

---

## 10. Reading-First — **PASS**

1. 通常の日本語読解では見えにくいもの（接続詞による議論の運び）を可視化する: **YES**。
2. 聖書読解に従属している: **YES**（読み方の一選択肢・本文を覆わない）。
3. 文法レッスン化を避けている: **YES**（学術ラベルなし・関係ラベルなし）。
4. 不要なラベルを避けている: **YES**。
5. Structure Flow を重複せず補完する: **YES**（節間 vs 節内）。
6. 情報量が適切: **YES**（top-level・接続のある辺のみ・asyndeton は静寂）。
7. top-level 表現が理解可能: **YES**（desktop/mobile 確認済み）。
8. 別機能が必要という証拠: **なし**（具体的 reader 要求は未提示）。

---

## 11. Terminology — **POTENTIALLY MISLEADING（最小調整を提案・実装しない）**

| 用語 | 判定 |
|---|---|
| 「節のつながり」（view 見出し・subtitle「どの接続詞でつながっているか」） | **ACCURATE**（機能を正確に記述） |
| 「接続詞」・marker gloss（`［理由語句］`等） | **ACCURATE**（語の gloss・DA-3 で境界確定） |
| 「Clause Connection View」 | **ACCURATE** |
| **「談話分析」（読み方選択のモード名）** | **POTENTIALLY MISLEADING**：意味的談話解釈（reason/result 等）を示唆しうるが、機能は**意図的にそれをしない**。 |

**最小の推奨（任意・実装しない）:** モード名の意味過剰リスクは、view 内の subtitle「段落の中で、節と節がどの接続詞でつながっているかを追う読み方です」が既に正確にスコープしているため実害は小さい。
より安全にするなら、モード名を「談話（節のつながり）」等へ**語を1つ添える**だけで十分（`connections`/`relations` の実装には触れない）。**本監査では変更しない。**

---

## 12. Desktop / Mobile — **PASS**

既存回帰証拠（DA-1/DA-2b/DA-2 Final Regression / 本監査）:
- desktop / 375px mobile 動作・overflow なし（`.dcv-unit-body` flex-wrap）。
- **重複 nested unit なし**（本監査実測: 全章 unit id 一意・duplicate row 0）。
- 視覚 regression なし（DA-2b で display byte 一致）。
- interaction 競合なし（discourse unit 非interactive）／Structure Flow 競合なし（責務分離）。

---

## 13. Real Data — **PASS**

ROM5/JHN3/PHP2/1JN1/GAL2（本監査実測）:
- units 21/42/18/11/22・connections 19/26/17/8/18。
- 全章: `relations[]=[]`・構造フィールド保持・rendered HTML に関係ラベルなし・unit 行一意。
- 契約と一致。**未解決ケースなし。**

---

## 14. Remaining Work（§14）

| 現在の required work | future research（現製品定義では不要＝欠落ではない） |
|---|---|
| **なし**（機能は定義を充足） | authoritative discourse relation corpus の導入（DA-4 再開条件） |
| | 任意の semantic relation 層（研究/任意スコープ） |
| | embedded clause view（具体的 reader 要求があれば・DA-2c 再開条件） |
| | research 指向の discourse 可視化 |

→ **これらは「未完成の現要件」ではなく future research**。§14 の分離どおり、closure をブロックしない。

---

## 15. Freeze Recommendation

FREEZE 10 基準:

| # | 基準 | 判定 |
|---|---|---|
| 1 | reader-facing 目的の充足 | ✓ |
| 2 | Representation 十分 | ✓ |
| 3 | Renderer 責務明確 | ✓ |
| 4 | Structure Flow 責務明確 | ✓ |
| 5 | lexical connections 決定的 | ✓ |
| 6 | semantic relations 明示的除外 | ✓ |
| 7 | L-0 PASS | ✓ |
| 8 | 既知 regression なし | ✓ |
| 9 | 未解決 implementation defect なし | ✓ |
| 10 | 残りは future research（未完成要件でない） | ✓ |

**10/10 充足。**

> # DA CLOSED / FREEZE
> **現時点で、これ以上の Discourse 実装は正当化されない。**
>
> NOTE（非ブロッカー・任意）:
> (a) モード名「談話分析」の意味過剰リスク — 最小の語追加を提案（未実装・subtitle が既に正確にスコープ）。
> (b) DA-2a schema は DA-2b/DA-2c と順に読む前提（top-level 実装が確定形）。

FROZEN 対象:
- `buildDiscourseRepresentation()`（DA-1 + DA-2b・commit `9fe85394`）。
- `connections[]` 契約（DA-3）。
- `relations[] = []` 契約（DA-4・authoritative source 導入まで空）。
- top-level 表示・nested は Structure Flow（DA-2c）。

FROZEN 解除には（`CLAUDE.md` FROZEN Protocol に従い）: 変更理由・Impact Analysis・回帰ケース・baseline 保存・Freeze Audit 更新を要する。特に relations[] / clause.discourse 投影の解除は **DA-4 再開条件**（authoritative deterministic source）を前提とする。

---

## Self Audit

| Final Rule | 遵守 |
|---|---|
| 技術的に可能というだけで機能追加しない | ✓（追加なし） |
| semantic relations の不在を実装ギャップ扱いしない | ✓（future research） |
| Representation が保持するからと nested を再開しない | ✓（内部保持・非表示維持） |
| Analysis が計算するからと heuristic clause.discourse を露出しない | ✓（非投影維持） |
| 新機能に立証責任 | ✓（具体的 reader 要求なし＝追加しない） |
| コード変更なし | ✓ |

---

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-08-16 | 初版（DA-5。FREEZE 10基準 10/10 充足・責務マップ確定・relations[]空を凍結契約・clause.discourse 恒久非投影・DA-2c/DA-3 CLOSED・L-0/Reading-first PASS・用語 NOTE。判定 CLOSED WITH NOTE（FREEZE 可）。コード変更なし） |
