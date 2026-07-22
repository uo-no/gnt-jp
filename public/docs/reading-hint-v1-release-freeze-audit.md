# Stage SP-16 Reading Hint v1 Release Freeze Audit

実施日: 2026-07-22
位置づけ: Reading Hint v1 を**正式固定(Release Freeze)できるか**の最終監査。**監査のみ。コード・UI・データ
変更なし。** SP-15 改訂後の現状を独立検証する。
根拠(FROZEN): SP-5 / SP-6 / SP-7 / SP-7A / SP-8 / SP-9 / SP-12 / SP-13 / SP-14 / SP-15。
確認対象: public/assets/data/reading-hints.json・public/index.html の Reading Hint 実装箇所・docs/reading-hint-*。

判定凡例: **PASS / WARNING / FAIL**。

---

## Phase 1: 設計整合

| 凍結仕様 | 整合確認 | 判定 |
|---|---|---|
| **SP-5 Editorial Specification** | 静かな読書の入口・非露出・最大 1〜2 文 | ✓ |
| **SP-6 Unit & Trigger** | pericope 単位(verseStart–verseEnd)・冒頭節でのみ表示 | ✓ |
| **SP-7 Data Model** | bible_data 外の独立台帳・read-only 参照 | ✓ |
| **SP-7A Metadata** | focusLemmaId(不変アンカー)保持・status/version 管理可 | ✓ |
| **SP-8 Workflow** | published のみ Runtime 表示・SP-15 で Revision→Approved 実運用済 | ✓ |
| **SP-9 Candidate Rules** | 集中反復・distinctive・遍在語/散発除外の 5 件(HEB11/2CO1/JHN15/ROM3/1CO13) | ✓ |

- **評価**: Reading Hint は **「読者に気づきを差し出す静かな入口」として成立**。5 件は SP-9 の採用ケース
  (見落としやすい集中反復)で、SP-5〜SP-9 の全仕様に整合。
- **判定**: **PASS**。

## Phase 2: Editorial Character

全 5 hintText(SP-15 改訂後):

| 参照 | hintText |
|---|---|
| HEB 11:1 | この章では、「信仰」ということばが、ひとりまたひとりへと受け継がれてゆきます。 |
| 2CO 1:3 | この段落では、「勧め」ということばが、寄せては返すように重なって聞こえてきます。 |
| JHN 15:1 | この段落では、「とどまる」ということばが、離れずにそばへ戻ってきます。 |
| ROM 3:21 | ここから、「義」ということばが、次々と重なって響いてきます。 |
| 1CO 13:1 | この章では、「愛」ということばが、読むたびに静かに立ちあらわれます。 |

- **禁止項目 lint = 違反 0**: Greek/lemma/Strong/LN/数値/回数/「反復」/「語族」/分析用語/神学解説/他訳比較なし。
- **最大 1〜2 文**: 全件 1 文(超過 0)。**読者視点**(この章では/この段落では/ここから)。**Reading Memo と
  人格一致**(静かな読書の声)。**結論でなく入口**(SP-15 で言い切り→開いた誘いへ改訂済)。
- **末尾表現の個別性**: 受け継がれてゆきます/聞こえてきます/戻ってきます/響いてきます/立ちあらわれます=
  全て異なる(定型感解消)。
- **判定**: **PASS**。

## Phase 3: Runtime Isolation

| 確認 | 結果 | 判定 |
|---|---|---|
| ReadingFormatter 変更なし | clause-analyzer.js 非改変(git 差分 0) | ✓ |
| Reading Memo 変更なし | 生成ロジック非改変 | ✓ |
| StudyPanel 変更なし | Word 情報流入なし | ✓ |
| bible_data 変更なし | 252(M-15 のまま) | ✓ |
| AI 推論/生成なし | Runtime は published 資産の read + verseStart 一致表示のみ | ✓ |
| hint なし節は完全同一動作 | 早期 return(hint 無し→DOM 追加なし) | ✓ |
| reading-engine.js | reading-hint 記述 0(未編集) | ✓ |
| index.html | +64 行純加算(削除 0)のまま | ✓ |
| engine 回帰(サンプル) | ALL PASS | ✓ |

- **判定**: **PASS**。

## Phase 4: Data Asset Integrity

| 確認 | 結果 | 判定 |
|---|---|---|
| **独立資産** | public/assets/data/reading-hints.json(bible_data 外) | ✓ |
| **status 管理可能** | 全件 status あり・published のみ Runtime 表示 | ✓ |
| **rollback 可能** | 加算的実装 + 改訂前値を文書記録(SP-15)→ 復元可 | ✓ |
| **version 管理可能な構造** | focusLemmaId(不変アンカー)+ source='reading-hint'・SP-7/SP-7A の provenance 拡張余地 | ✓ |

- **評価**: 独立 Editorial Asset として status/version/rollback を扱える構造。SP-7/SP-7A のデータモデルに整合。
- **判定**: **PASS**。

## Phase 5: v1 公開判断

**FROZEN 可能(Release Freeze 承認)。**

- Phase 1〜4 すべて **PASS**。設計整合(SP-5〜SP-9)・Editorial Character(非露出/入口/人格)・Runtime
  Isolation(生成系・engine・bible_data 不変)・Data Asset Integrity(独立/status/rollback)がすべて満たされ、
  **P0/P1/P2/WARNING/FAIL の指摘なし**。
- SP-13(技術監査)PASS + SP-14(編集品質)Editorial Revision → SP-15(改訂 Approved)を経て、指摘された
  文言 4 点が解消済み。**Reading Hint v1(5 件)は正式に固定可能**。
- v1 スコープ(手編集 5 件・主 Reading ビュー・compare-mode 非対象)は SP-12 の合意事項であり、Freeze の
  妨げにならない(将来の件数追加・compare-mode 対応は v2 以降の別途課題)。

---

## 総合

- **Reading Hint v1 = Release Freeze 承認**。
- 実装は純加算(index.html +64・独立 JSON 1)で既存資産(engine/ReadingFormatter/Reading Memo/StudyPanel/
  bible_data)を一切壊さず、Reading Hint の人格(静かな読書の入口・非露出・一文)と責務境界(Reading の家・
  pericope 冒頭・Word 非流入・Passage 非混入)を保持。**編集資産として status/rollback/version を管理でき、
  Editorial Workflow(SP-8)で改訂・再監査済**。

```
[reading-hint-v1-release-freeze-audit FROZEN 2026-07-22]
判定: Reading Hint v1 = Release Freeze 承認（FROZEN可能）
Phase1設計整合: SP-5〜SP-9 全整合・5件は見落としやすい集中反復・「気づきを差し出す静かな入口」成立 PASS
Phase2 Editorial Character: 全5件 非露出違反0/1文/読者視点/Memo人格一致/入口(SP-15改訂で言い切り→誘い)/末尾表現全て異なる PASS
Phase3 Runtime Isolation: ReadingFormatter/Memo/StudyPanel/bible_data/reading-engine 非改変・AI推論生成なし・hintなし節同一動作・index.html +64純加算・engine回帰PASS PASS
Phase4 Data Asset Integrity: bible_data外独立・status管理可・rollback可(改訂前値記録)・focusLemmaId不変アンカーでversion管理可 PASS
Phase5判定: FROZEN可能。P0/P1/P2/WARNING/FAILなし。SP-13技術+SP-14品質+SP-15改訂を経て固定可能
v1スコープ: 手編集5件・主Readingビュー・compare-mode非対象(SP-12合意)・件数追加/compare対応はv2課題
総合: 純加算で既存不変・人格/責務境界保持・編集資産としてstatus/rollback/version管理可。Release Freeze承認
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版(Reading Hint v1 リリース凍結監査・Phase1〜4 全 PASS・Phase5=FROZEN 可能・P0〜FAIL なし・Release Freeze 承認) |
