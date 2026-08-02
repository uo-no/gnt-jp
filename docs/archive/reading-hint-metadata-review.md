# Reading Hint Metadata Review(Stage SP-7A)

策定日: 2026-07-22
位置づけ: SP-7 で定義した Reading Hint データモデルを、**長期保守性・監査性・将来の Reading Japanese 更新
耐性**の観点からメタデータ再評価する。**データモデルの補足検討のみ。**
**UI 変更・コード変更・bible_data 変更・実装は禁止。SP-7 の責務・ライフサイクル・Editorial Asset の結論は
変更しない。**
前提(FROZEN・変更禁止): SP-7 / SP-6 / SP-5 / SP-4 / SP-3 / SP-2 / SP-SD-1 / SP-IA-1 / RM-0 / L-0 / M-15。
根拠: reading-hint-data-model-design.md(SP-7)・reading-hint-editorial-specification.md(SP-5)・
reading-japanese-adoption-execution-report.md(M-15)。

Severity 凡例: **P0(致命)/ P1(高)/ P2(中)/ P3(低)**。

---

## Phase 1: SP-7 データモデルの長期保守評価

SP-7 モデル: `{id, book, chapter, verseStart, verseEnd, focusReading, hintText, status, version, audit, source}`。

- **評価**: **良い骨格だが長期保守には不足**。不足点:
  1. **不変アンカーがない**——`focusReading`(とどまる)は Reading Japanese の**可変スナップショット**であり、
     RJ 改訂で陳腐化する(Phase 2)。
  2. **根拠(evidence)がない**——「なぜこの Hint が存在するか」を後から検証できない(Phase 4)。
  3. **audit が粗い**——editor/reviewer/日時/RJ 版が無く、編集資産の provenance として不足(Phase 5)。
  4. **RJ 版の束縛がない**——どの Reading Japanese 状態に対して作られたかが記録されず、陳腐化を検知できない。
- **Evidence**: M-15 で RJ は改訂され得る資産(japanese を実変更)。SP-7 は Editorial Asset を結論(監査/版管理要)。
- **Severity**: **P2**(骨格は妥当・補足が必要)。
- **Conclusion**: **SP-7 モデルに不変アンカー・evidence・provenance・RJ 版束縛を補うべき**(SP-7 の結論は不変)。

## Phase 2: focusReading 保存設計の評価

- **評価**: **focusReading を唯一の拠り所にすると脆弱**。将来 RJ が **とどまる → 住み続ける** に改訂されると、
  保存済み focusReading(とどまる)も hintText(「『とどまる』が繰り返し響きます」)も**古い語を指したまま陳腐化**
  する。**focusReading は「真実」ではなく、不変アンカーから導出される表示スナップショット(キャッシュ)**
  として扱うべき。
- **Evidence**: M-15(RJ の japanese は実変更される・私→私たち 等)。
- **Severity**: **P1**(不変アンカー無しでは RJ 改訂で Hint が陳腐化)。
- **Conclusion**: **focusReading は再導出可能なスナップショットとし、単独の識別子にしない**。

## Phase 3: 不変識別子(focusLemma / focusStrong / focusCluster)の評価

| 識別子 | 必要性 | メリット | デメリット |
|---|---|---|---|
| **focusLemma / lemmaId**(例: grc:G3306) | **高(採用)** | **不変アンカー**——RJ 改訂に耐える・focusReading を再導出可・StudyPanel と同軸参照 | 内部メタデータに Greek 由来 id を持つ(ただし**表示はしない**ので SP-5 非抵触) |
| **focusStrong**(例: G3306) | 中(任意併記) | 安定・Concordance と接続 | Strong は一部 lemma を混同・lemmaId で足りる |
| **focusCluster** | **低(不採用)** | — | **Semantic 層(Word の家)の概念**で可変・Hint(語彙反復)のアンカーに不要・層結合を生む |

- **評価**: **不変アンカー = lemmaId(bible_data に既存・grc:G3306 等・実測確認)**を採用。focusStrong は任意併記。
  **focusCluster は不採用**(Semantic 層概念で可変・Hint の責務外)。**lemmaId は内部アンカーであり表示しない**
  ため、SP-5 の「原語を表示しない」に抵触しない(メタデータと表示コンテンツは別)。
- **Evidence**: bible_data に lemmaId(grc:G3306)存在・不変(実測)。SP-5(原語は**表示**禁止・メタデータは可)。
- **Severity**: **P1**(不変アンカーの採否が更新耐性を左右)。
- **Conclusion**: **アンカー=lemmaId(不変)+ 任意 focusStrong。focusReading は導出スナップショット。Cluster は不採用**。

## Phase 4: 監査性(evidence の要否)

- **評価**: **evidence メタデータは必要**。「なぜこの Hint が存在するか」を後から監査するには、**反復の根拠と
  なった出現節**を保持する必要がある。例: `evidenceVerses = [JHN15:4, 15:5, 15:6, 15:7, 15:9, 15:10, 15:16]`、
  内部監査用の `occurrenceCount`(表示はしない=SP-5)。これにより監査者が「lemma が確かにこの範囲で集中反復
  している」ことを検証でき、SP-6 の表示条件(集中反復・distinctive)を後追い確認できる。
- **Evidence**: SP-6(集中反復・distinctive が表示条件)。M-12(台帳は原因層+根拠を保持)。
- **Severity**: **P1**(evidence 無しでは編集資産の監査ができない)。
- **Conclusion**: **evidenceVerses(根拠節)と occurrenceCount(内部・非表示)を保持する**。

## Phase 5: Editorial Asset として最低限保持すべきメタデータ

| 分類 | フィールド |
|---|---|
| **同定(不変)** | `id` / `focusLemmaId`(不変アンカー)/ 任意 `focusStrong` |
| **範囲** | `book` / `chapter` / `verseStart` / `verseEnd`(pericope 範囲) |
| **本文** | `hintText`(公開される静かな一文) |
| **表示スナップショット** | `focusReading`(lemmaId の現 RJ レンダリングから導出・キャッシュ) |
| **根拠** | `evidenceVerses` / `occurrenceCount`(非表示・監査用) |
| **provenance(編集資産)** | `editor` / `reviewer` / `created` / `updated` / `status` / `version` / `auditResult` |
| **RJ 束縛** | `readingJapaneseVersion`(作成/監査時の RJ 状態・陳腐化検知用) |
| **由来** | `source = 'reading-hint'` |

- **Evidence**: M-12(status/根拠)・M-15(版・監査・rollback)・SP-7(Editorial Asset)。
- **Severity**: **P2**。
- **Conclusion**: **同定(不変 lemmaId)/ 範囲 / 本文 / 導出スナップショット / 根拠 / provenance / RJ 束縛 / 由来**
  の 8 分類を最低限保持する。

## Phase 6: RJ 改訂時のライフサイクル

RJ が改訂された場合(例: とどまる → 住み続ける):

| 要素 | 扱い |
|---|---|
| 不変アンカー(focusLemmaId) | **不変**——Hint の主題(この lemma の反復)は有効なまま |
| focusReading(スナップショット) | **自動再導出**——lemmaId の新レンダリング(住み続ける)へ更新可能 |
| hintText(編集文) | **再監査が必要**——文中の日本語語が変わるため、SP-5 の声で再編集し再監査 |
| readingJapaneseVersion | **陳腐化検知**——RJ 版 > Hint 束縛版 なら「要再監査」フラグ |

- **評価**: **「そのまま使える」でも「完全自動更新」でもなく「再監査が必要」**。不変アンカーは生き残り、
  focusReading は自動再導出できるが、**hintText は編集文なので再編集・再監査を経る**。readingJapaneseVersion の
  不一致が再監査トリガになる。**これは Editorial Asset の価値そのもの**(RJ 改訂が沈黙の陳腐化でも盲目的自動
  更新でもなく、監査ワークフローを起動する)。
- **Evidence**: SP-7(Editorial Asset・監査/版管理)・M-15(RJ 改訂は監査/rollback を伴う)。
- **Severity**: **P1**(RJ 束縛と再監査トリガが無いと陳腐化が沈黙化)。
- **Conclusion**: **RJ 改訂 → アンカー生存・focusReading 再導出・hintText は再監査。readingJapaneseVersion で検知**。

## Phase 7: Passage View との将来連携

- **評価**: **Hint のメタデータは Passage View で再利用可能**。**focusLemmaId・evidenceVerses・pericope 範囲**は、
  Passage View の構造分析(同一 lemma の反復 → inclusio/chiasm 検出の入力)と**同じ根拠基盤**である。Passage View は
  Hint のメタデータを **read-only で消費**でき(同じ evidence に立脚)、構造分析は View が所有する。**メタデータを
  Passage-View-consumable に設計しておく**ことで、Reading Hint(読む面)と Passage View(分析面)が同一根拠で
  一貫する。
- **Evidence**: SP-4/SP-7(Hint は View の入口・同 pericope)・SP-6(反復根拠)。
- **Severity**: **P2**。
- **Conclusion**: **focusLemmaId・evidenceVerses・範囲は Passage View も利用可能な共有根拠。View が read-only 消費**。

## Phase 8: 総合評価

- **P0 なし**。**P1×4**(Phase2 focusReading 陳腐化 / Phase3 不変アンカー / Phase4 evidence / Phase6 RJ 束縛)は、
  すべて **「不変 lemmaId をアンカーに、focusReading を導出スナップショットとし、evidence と RJ 版束縛を持つ」**
  という**メタデータ補足**で回避可能。**SP-7 の責務・ライフサイクル・Editorial Asset の結論は不変**——本補足は
  SP-7 モデルへの**加算(additive)**であり、上書きしない。

| Phase | 監査 | Severity |
|---|---|---|
| 1 | SP-7 モデルの長期保守 | P2 |
| 2 | focusReading 陳腐化 | **P1** |
| 3 | 不変識別子(lemmaId) | **P1** |
| 4 | evidence(監査性) | **P1** |
| 5 | 編集資産メタデータ | P2 |
| 6 | RJ 改訂ライフサイクル | **P1** |
| 7 | Passage View 連携 | P2 |

---

## Reading Hint Metadata Rules(箇条書き)

- **保存する本文**: `hintText`(公開される静かな一文)。
- **保存しない本文**: 表示文に数値・ラベル・原語を入れない(SP-5)。※原語 id は**内部メタデータ**としてのみ
  保持し表示しない。
- **保持する識別子(不変)**: **`focusLemmaId`(grc:Gxxxx・不変アンカー)** + 任意 `focusStrong`。
  **`focusReading` は不変アンカーから導出する表示スナップショット**(単独の識別子にしない)。**focusCluster は
  保持しない**(Semantic 層・可変・責務外)。
- **根拠メタデータ**: `evidenceVerses`(反復の根拠節)+ `occurrenceCount`(内部・非表示・監査用)。
- **監査メタデータ**: `editor` / `reviewer` / `created` / `updated` / `status` / `version` / `auditResult` /
  `readingJapaneseVersion`(RJ 束縛)。
- **将来更新時の扱い**: RJ 改訂 → **不変アンカー生存・focusReading 自動再導出・hintText は再監査**。
  `readingJapaneseVersion` 不一致で「要再監査」を検知(沈黙の陳腐化も盲目的自動更新もしない)。
- **Passage View 連携**: `focusLemmaId` / `evidenceVerses` / pericope 範囲は Passage View も read-only 利用可能な
  共有根拠とする。

---

## FROZEN 判定

- **FROZEN 可能**。
- **理由**: 長期保守性・監査性・RJ 更新耐性の観点で、**SP-7 モデルに不変アンカー(lemmaId)・evidence・
  provenance・RJ 版束縛を加える補足**が確定した。これにより **RJ 改訂(とどまる→住み続ける)に対して
  アンカーが生存し、focusReading を再導出し、hintText は再監査で追随できる**。編集資産としての監査性
  (なぜ存在するか=evidence)も担保される。
- **SP-7 への影響の有無**: **なし(結論は不変)**。本補足は SP-7 のデータモデルへの**加算メタデータ**であり、
  SP-7 の**管理単位(pericope)・保存場所(bible_data 外の独立台帳)・一方向参照・ライフサイクル・
  Editorial Asset の結論を一切変更しない**。SP-7 の `focusReading` は「導出スナップショット」と役割が明確化され、
  `audit` は provenance フィールド群へ詳細化されるが、いずれも SP-7 の枠内の精緻化。
- **次 Stage**: pericope 境界データ整備(Corpus)/ Editorial Workflow への Hint 統合設計(本メタデータ規則を
  provenance/監査の基盤として用いる)。生成アルゴリズム・UI は対象外。

```
[reading-hint-metadata-review FROZEN 2026-07-22]
論点: SP-7 focusReading(とどまる)はRJ改訂で陳腐化→不変アンカー要
不変アンカー: focusLemmaId(grc:Gxxxx・bible_dataに既存・不変)採用 + 任意focusStrong。focusReadingは導出スナップショット。focusClusterは不採用(Semantic層・可変・責務外)
evidence: evidenceVerses(根拠節)+occurrenceCount(内部非表示・監査用)を保持=なぜ存在するか検証可能
provenance: editor/reviewer/created/updated/status/version/auditResult/readingJapaneseVersion(RJ束縛)
RJ改訂ライフサイクル: アンカー生存・focusReading自動再導出・hintTextは再監査。readingJapaneseVersion不一致で要再監査検知(沈黙陳腐化も盲目自動更新もしない)
Passage View連携: focusLemmaId/evidenceVerses/pericope範囲は共有根拠・View read-only消費可
SP-7影響: なし(加算メタデータのみ・責務/ライフサイクル/Editorial Asset結論不変。focusReading=導出スナップショットと明確化・audit=provenance群へ詳細化)
FROZEN可能。P0なし/P1×4はメタデータ補足で回避
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結(Reading Hint メタデータ補足・不変アンカー lemmaId・focusReading は導出スナップショット・evidence 監査・provenance・RJ 版束縛で更新耐性・Passage View 共有根拠・SP-7 は加算のみで不変) |
