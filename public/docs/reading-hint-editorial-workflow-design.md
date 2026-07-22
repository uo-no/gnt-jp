# Reading Hint Editorial Workflow Design(Stage SP-8)

策定日: 2026-07-22
位置づけ: Reading Hint を **Editorial Asset** として長期維持するための **作成→編集→監査→公開→改訂→廃止**の
Editorial Workflow を定義する。**Workflow の設計のみ。**
**UI 変更・コード変更・bible_data 変更・データモデル変更・生成アルゴリズム設計は禁止。**
前提(FROZEN・変更禁止): L-0 / RM-0 / M-12 / M-13 / M-14 / M-15 / SP-IA-1 / SP-SD-1 / SP-2 / SP-3 / SP-4 /
SP-5 / SP-6 / SP-7 / SP-7A。**Reading Hint が Editorial Asset であることは確定事項**。
根拠: reading-hint-data-model-design.md(SP-7)・reading-hint-metadata-review.md(SP-7A)・
reading-hint-editorial-specification.md(SP-5)・reading-japanese-editorial-full-review-report.md(M-12)。

Severity 凡例: **P0(致命)/ P1(高)/ P2(中)/ P3(低)**。

---

## 中核判断:AI は編集者でなく「編集支援者」

- 本プロジェクトの品質管理思想は**「決定的生成は AI/ルール・判断と監査は人」**で一貫する:
  - Reading Japanese(M-15): 機械適用(決定的)＋人の QA/rollback。Reading Memo(RM-0): 決定的生成
    (判断なし・Guard Rule)。**Editorial Review(M-6/M-10/M-12): 人の判定**(Accepted/Revise/Pending)。
- Reading Hint は **編集判断を含む**(distinctiveness・「読者が聞こえるか」・**JHN21 型の非表示判断**・
  静かな声の文言)。これらは **L-0 の境界そのもの**(推論しないか・声を壊さないか・隠れた原語を暴かないか)で
  あり、**人が監査すべき**。AI が自律的に決めると **L-0 違反(AI が"親切に"推論する)リスク**がある。
- **結論: AI = 編集支援者**(候補抽出・下書き案・ルール整合チェック・陳腐化検知)。**人 = 編集者/Reviewer/
  公開者**(判断・文言確定・監査 PASS・公開)。**この責務分離は本プロジェクトの思想と完全整合**であり、
  Workflow の設計原則とする。

---

## Phase 1: 制作工程

```
Candidate（AI 候補抽出）
  ↓
Draft（Editor 下書き・SP-5 の声）
  ↓
Editorial Review（Reviewer 監査・RM-0/SP-5/SP-6/L-0）
  ↓
Approved（監査 PASS）
  ↓
Published（読者へ公開）
  ↓
Revision（RJ 改訂/訂正 → Draft へ差し戻し）
  ↓
Retired（廃止・履歴は保持）
```

- status(SP-7): candidate → draft → in-review → approved → published →(revised)→ retired。
- **Evidence**: SP-7(ライフサイクル 6 段・status)・M-12(台帳の status 管理)。
- **Severity**: **P2**。
- **Conclusion**: **7 状態の一方向パイプライン**(Revision は Draft へ環流・Retired で終端・履歴保持)。

## Phase 2: 各工程の責務(入力/出力/責務)

| 工程 | 入力 | 出力 | 責務 |
|---|---|---|---|
| **Candidate** | SP-6 トリガ(pericope の集中反復・evidenceVerses・focusLemmaId) | 候補レコード(範囲・焦点 lemma・根拠) | **AI**: 決定的検出のみ(文言・公開判断はしない) |
| **Draft** | 候補 | hintText 下書き(SP-5 の静かな一文) | **Editor**: 声の付与・表示/非表示の一次判断・範囲確定 |
| **Review** | 下書き | 監査結果(PASS/Revise)+ audit 記録 | **Reviewer**: RM-0/SP-5/SP-6/L-0 準拠を独立監査 |
| **Approved** | PASS | 承認済み Hint | 公開ゲート前の確定(全条件+メタデータ完備) |
| **Published** | 承認済み | 公開 Hint(readingJapaneseVersion 束縛) | **公開者**: 公開・版束縛 |
| **Revision** | RJ 版不一致/訂正要求 | 差し戻し草稿 → 再 Review | **Editor+Reviewer**: 再編集+再監査 |
| **Retired** | 廃止決定 | 廃止レコード(履歴保持) | 公開停止・provenance 保存 |

- **Evidence**: SP-7A(provenance・RJ 束縛)・SP-6(トリガ)・SP-5(声)。
- **Severity**: **P2**。
- **Conclusion**: **Candidate=AI 検出 / Draft=Editor 起草 / Review=Reviewer 監査 / Publish=公開ゲート / Revision=
  再監査環流 / Retire=履歴保持廃止**。

## Phase 3: AI の責務

| AI が行ってよい(編集支援) | AI が行ってはいけない |
|---|---|
| **候補抽出**(SP-6 トリガ: pericope 集中反復検出・evidence 収集・lemmaId アンカー) | **公開判断**(=公開者) |
| **下書き案の提示**(SP-5 の声のたたき台・**提案であり確定でない**) | **最終文言の確定権**(=Editor) |
| **ルール整合チェック**(SP-5/SP-6 lint: 数値/ラベル/原語検出・distinctive 判定・1/pericope) | **非表示判断の確定**(JHN21 型=Editor/Reviewer の L-0 判断) |
| **陳腐化検知**(readingJapaneseVersion 不一致のフラグ) | **監査 PASS 判定**(=Reviewer) |
| | **推論・語義選択**(L-0 違反) |

- **評価**: AI は **決定的な検出・提案・整合チェック・検知**に限る。**判断(公開・文言・非表示・監査 PASS・
  意味選択)はすべて人**。AI の下書きは"提案"であり、Editor が採否・改稿する。
- **Evidence**: L-0(推論禁止)・RM-0(Guard Rule=機械的検出は AI 可)・SP-7 Phase10(判断を含む=人)。
- **Severity**: **P1**(AI が判断に踏み込むと L-0 違反・編集資産の説明責任喪失)。
- **Conclusion**: **AI=編集支援者(検出/提案/lint/検知)。判断は人**。

## Phase 4: Editor の責務

Editor は**起草時に**以下を確認する:

- **SP-5 編集人格**(静かな読書の声・読者視点・「この段落では」)。
- **SP-6 Trigger**(集中反復・distinctive・段落冒頭・1 pericope 1 つ)。
- **Reading の声**(RM-0 継承・分析口調でない)。
- **推論していないか**(L-0: 語義選択・含意補完をしていないか)。
- **Strong/LN/原語/数値/詳細語義を出していないか**(SP-5)。
- **表示/非表示の一次判断**(JHN21 型=隠れた原語の対比は書かない)。

- **Evidence**: SP-5/SP-6/RM-0/L-0。
- **Severity**: **P2**。
- **Conclusion**: **Editor は SP-5 の声・SP-6 のトリガ・L-0 非推論・非露出・表示可否を確認して起草する**。

## Phase 5: Reviewer の責務(Editor との違い)

| | **Editor** | **Reviewer** |
|---|---|---|
| 立場 | **起草(作る)** | **監査(独立に検める)** |
| 行為 | hintText を書く・表示可否を一次判断 | 規則(RM-0/SP-5/SP-6/L-0)への準拠を独立検証・PASS/Revise 判定 |
| 責務 | 声・トリガ・非露出を満たす草稿 | **第二の目**——起草者と別人格で客観監査 |

- **評価**: **起草者 ≠ 監査者の分離**(M-15 の生成 vs QA・M-12 の Editorial Review が生成と別台帳、と同じ思想)。
  Reviewer は Editor の主観を離れ、**SP-5/SP-6/L-0 の各条項を機械的に照合**し、特に**非表示判断(JHN21 型)・
  distinctiveness・声の逸脱**を検める。
- **Evidence**: M-12(監査の分離)・M-15(生成/QA 分離)。
- **Severity**: **P2**。
- **Conclusion**: **Editor=作る / Reviewer=独立に検める。起草と監査を分離**。

## Phase 6: 公開条件

Published へ進める条件(**すべて**満たす):

1. **SP-5 準拠**(声・≤ 二文・数値/ラベル/原語/詳細語義なし)。
2. **SP-6 準拠**(集中反復・distinctive・段落冒頭・1 pericope 1 つ・非表示条件遵守)。
3. **L-0 準拠**(推論/翻訳/語義選択なし)。
4. **Editorial Review PASS**(Reviewer 判定)。
5. **メタデータ完備**(focusLemmaId・evidenceVerses・provenance・readingJapaneseVersion 束縛=SP-7A)。

- **Evidence**: SP-5/SP-6/SP-7A/M-12。
- **Severity**: **P2**。
- **Conclusion**: **SP-5/SP-6/L-0 準拠 + Review PASS + メタデータ完備 → Published**。

## Phase 7: Reading Japanese 改訂時の運用

readingJapaneseVersion が変わった場合(SP-7A):

| 状況 | 扱い |
|---|---|
| 焦点 lemma のレンダリング不変(例: とどまる のまま) | **版再束縛のみ**(Hint 有効・action なし) |
| 焦点 lemma のレンダリング変化(とどまる→住み続ける) | **自動で focusReading 再導出 → 陳腐化フラグ → Revision(再監査)**。hintText は文中の語が変わるため**再編集+再 Review**。**自動公開しない** |
| 反復自体が RJ 改訂で崩れた | **Retired 候補**(Reviewer 判断で廃止・履歴保持) |

- **評価**: **自動更新でも盲目廃止でもなく「再監査」が原則**(SP-7A)。AI が版不一致を検知しフラグ、focusReading を
  再導出するが、**hintText の再公開は人の再監査を経る**。
- **Evidence**: SP-7A Phase6(RJ 改訂ライフサイクル)。
- **Severity**: **P1**(自動公開すると RJ 改訂で未監査の Hint が漏れる)。
- **Conclusion**: **RJ 改訂 → AI が検知+focusReading 再導出 → 人が再監査(Revision)→ 再公開 or Retire**。

## Phase 8: Passage View / Reading Memo / StudyPanel との運用関係

| 対象 | 生産様式 | Hint Workflow との関係 | 衝突 |
|---|---|---|---|
| **Reading Memo** | **決定的生成**(RM-0・workflow なし) | 別の生産様式。Hint(資産・workflow)と並存 | **なし** |
| **StudyPanel** | 計算/データ | lemmaId を共有参照するのみ | **なし** |
| **Passage View** | (将来)構造分析の資産 | Hint の evidence/lemmaId/範囲を **read-only 共有**(SP-7A) | **なし**(スコープ分離) |

- **評価**: **Reading Memo は生成物で workflow を持たず**、StudyPanel は計算、Passage View は別資産。**Hint の
  Editorial Workflow は Hint 専用**で、M-5/M-12 Editorial Workflow の基盤を共有しつつ**各々のスコープに閉じる**
  ため衝突しない。Passage View が将来資産化する際も、**同じ Editorial Workflow 基盤(作成/監査/公開/版)を
  再利用**でき整合する。
- **Evidence**: SP-7(Memo=生成/Hint=資産)・SP-7A(共有根拠)・M-12(Editorial Workflow)。
- **Severity**: **P2**。
- **Conclusion**: **Memo=生成(workflow 外)/ StudyPanel=計算 / Passage View=別資産(基盤共有)。衝突なし**。

## Phase 9: 品質保証(QA)項目

| QA 項目 | 確認内容 |
|---|---|
| **編集人格** | SP-5/RM-0 の静かな声・読者視点・分析口調でない |
| **重複** | 1 pericope 1 つ・Reading Memo と非重複(スコープ排他) |
| **反復判定** | SP-6 閾値(集中反復)・distinctive(遍在語除外) |
| **根拠** | evidenceVerses が実在・焦点 lemma が範囲で集中反復 |
| **表現** | 数値/ラベル/原語/詳細語義なし(Guard Rule 相当 lint) |
| **非表示** | JHN21 型(隠れた原語対比)・散発が正しく非表示 |
| **更新状態** | readingJapaneseVersion 現行・陳腐化フラグなし |
| **RJ Version** | 束縛版が記録され現行 RJ と一致 |
| **Editorial Version** | version・provenance(editor/reviewer/日時)完備 |

- **Evidence**: SP-5/SP-6/SP-7A。
- **Severity**: **P2**。
- **Conclusion**: **編集人格/重複/反復判定/根拠/表現/非表示/更新状態/RJ 版/Editorial 版の 9 項目 QA**。

## Phase 10: 監査ログ(保持履歴)

| ログ項目 | 内容 |
|---|---|
| 作成者 | AI(候補)+ Editor(起草) |
| Reviewer | 監査者 |
| 承認日 | Approved 日時 |
| 公開日 | Published 日時 |
| version / auditResult | 各版の監査結果 |
| Revision | 改訂日時・理由・差分(旧 hintText/焦点/範囲) |
| readingJapaneseVersion | 各段での RJ 束縛版 |
| 廃止理由 | Retired の理由・日時 |

- **評価**: **provenance(SP-7A)+ 変更履歴**を全段で保持。M-12/M-15 の「監査・版・rollback」思想を Hint へ適用し、
  **「なぜ・誰が・いつ・何を」**を追跡可能にする。
- **Evidence**: SP-7A(provenance)・M-12(台帳)・M-15(版/rollback)。
- **Severity**: **P2**。
- **Conclusion**: **作成者/Reviewer/承認・公開日/version/Revision 理由/RJ 版/廃止理由の完全な監査ログ**。

## Phase 11: 総合評価

- **P0 なし**。**P1×3**(Phase3 AI が判断に踏み込まない / Phase7 RJ 改訂で自動公開しない / 中核=AI は編集支援者)は、
  すべて**「AI=決定的支援・人=判断と公開・全段監査」**という本 Workflow で確定・回避済み。
- **プロジェクト整合**: **「AI が候補、人が編集・監査・公開」は本プロジェクトの品質管理思想と完全整合**——
  Reading Japanese(決定的生成+人 QA)・Reading Memo(決定的生成)・Editorial Review(人の判定)と同じ、
  **決定的部分は自動・判断部分は人・全段監査**の構造。**「AI は編集者でなく編集支援者」は妥当**であり、
  L-0 の境界(推論・声・隠れた原語)を人が守る安全装置として機能する。

| Phase | 監査 | Severity |
|---|---|---|
| 1 | 制作工程 | P2 |
| 2 | 各工程責務 | P2 |
| 3 | AI 責務(支援者限定) | **P1** |
| 4 | Editor 責務 | P2 |
| 5 | Reviewer 責務 | P2 |
| 6 | 公開条件 | P2 |
| 7 | RJ 改訂運用 | **P1** |
| 8 | 他機能との関係 | P2 |
| 9 | QA | P2 |
| 10 | 監査ログ | P2 |

---

## Reading Hint Editorial Workflow Rules(箇条書き)

- **制作工程**: Candidate → Draft → Editorial Review → Approved → Published → Revision → Retired(status 管理)。
- **AI 責務(編集支援者)**: 候補抽出・下書き案・ルール整合 lint・陳腐化検知**のみ**。公開/文言/非表示/監査
  PASS/意味選択は**しない**。
- **Editor 責務**: SP-5 の声・SP-6 トリガ・L-0 非推論・非露出・表示可否を確認して起草。
- **Reviewer 責務**: 起草と分離し、RM-0/SP-5/SP-6/L-0 準拠を独立監査して PASS/Revise を判定。
- **公開条件**: SP-5 準拠 + SP-6 準拠 + L-0 準拠 + Editorial Review PASS + メタデータ完備(SP-7A)。
- **QA**: 編集人格/重複/反復判定/根拠/表現/非表示/更新状態/RJ 版/Editorial 版の 9 項目。
- **Version 管理**: version + provenance + readingJapaneseVersion 束縛(SP-7A)。
- **改訂**: RJ 版不一致/訂正 → AI 検知+focusReading 再導出 → **人の再監査(Revision)**→ 再公開 or Retire。
  **自動公開しない**。
- **廃止**: 反復崩壊/誤り → Reviewer 判断で Retired・**履歴は保持**。
- **原則**: **AI は編集者でなく編集支援者。判断と公開は人。全段を監査ログに残す**。

---

## FROZEN 判定

- **FROZEN 可能**。
- **理由**: Reading Hint を Editorial Asset として維持する **作成→編集→監査→公開→改訂→廃止**の Workflow が、
  **「AI=決定的支援者・人=判断と公開・全段監査/版管理」**として確定した。これは Reading Japanese・Reading
  Memo・Editorial Review と同じ品質管理思想であり、**「AI は編集者でなく編集支援者」の責務分離が L-0 の境界を
  守る安全装置**として機能する。P0 はなく、P1 は本 Workflow で塞がれている。既存 FROZEN(SP-5/SP-6/SP-7/
  SP-7A)を変更しない。
- **次 Stage**:
  - **pericope 境界データ整備**(Corpus・Candidate 抽出の前提)。
  - もしくは **Editorial Workflow 基盤の共通化設計**(M-5/M-12 Editorial Review と Reading Hint Workflow の
    共通台帳・status・監査基盤を統合する責務設計)。生成アルゴリズム・UI は対象外。

```
[reading-hint-editorial-workflow-design FROZEN 2026-07-22]
中核: AI=編集支援者(候補抽出/下書き案/ルールlint/陳腐化検知) 人=編集者Reviewer公開者(判断/文言/非表示/監査PASS/公開)。プロジェクト思想(決定的生成は自動・判断と監査は人・全段監査)と完全整合。L-0境界(推論/声/隠れ原語)を人が守る安全装置
制作工程: Candidate(AI)→Draft(Editor)→Editorial Review(Reviewer)→Approved→Published→Revision→Retired
AI禁止: 公開判断/最終文言確定/非表示判断確定(JHN21型)/監査PASS判定/推論語義選択
Editor: SP-5声/SP-6トリガ/L-0非推論/非露出/表示可否を確認し起草
Reviewer: 起草と分離・RM-0/SP-5/SP-6/L-0を独立監査しPASS/Revise
公開条件: SP-5+SP-6+L-0準拠+Review PASS+メタデータ完備(SP-7A)
RJ改訂: レンダリング不変=版再束縛のみ/変化=focusReading再導出+陳腐化フラグ+再監査(自動公開しない)/反復崩壊=Retired候補
他機能: Reading Memo=生成(workflow外)/StudyPanel=計算/Passage View=別資産(基盤共有)。衝突なし
QA9項目: 編集人格/重複/反復判定/根拠/表現/非表示/更新状態/RJ版/Editorial版
監査ログ: 作成者/Reviewer/承認公開日/version/Revision理由/RJ版/廃止理由
FROZEN可能。既存SP-5/6/7/7A不変。次: pericope境界データ整備 or Editorial Workflow基盤共通化(M-5/M-12統合)
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結(Reading Hint Editorial Workflow・7 工程・AI=編集支援者/人=判断公開・Editor/Reviewer 分離・公開条件・RJ 改訂は再監査・QA9/監査ログ・プロジェクト思想と整合・FROZEN 可能) |
