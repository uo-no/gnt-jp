# Reading Hint Data Model Design(Stage SP-7)

策定日: 2026-07-22
位置づけ: Reading Hint の**データモデル・管理単位・参照モデル・ライフサイクル**を定義する。
**最重要論点は「Reading Hint は生成物か、編集・監査・公開を経る編集資産か」**(Phase 10)。
**UI 変更・コード変更・デザイン・生成実装は禁止。データ設計のみ。**
前提(FROZEN・変更禁止): RM-0 / SP-IA-1 / SP-SD-1 / SP-2 / SP-3 / SP-4 / SP-5 / SP-6。
根拠: reading-hint-unit-trigger-design.md(SP-6)・reading-hint-editorial-specification.md(SP-5)・
reading-japanese-editorial-full-review-report.md(M-12・台帳)・reading-japanese-adoption-execution-report.md(M-15)。

Reading Hint は **Reading の家**。**StudyPanel / Passage View を代替しない**。

Severity 凡例: **P0(致命)/ P1(高)/ P2(中)/ P3(低)**。

---

## Phase 1: 管理単位

| 候補 | 評価 |
|---|---|
| verse | ✗ 小さすぎ(反復・流れはスパン上でのみ意味を持つ・SP-6) |
| **pericope(段落)** | **採用**——SP-6 の編集単位と一致。反復集中スパンが Hint の自然な粒度 |
| chapter | ✗ 粗すぎ(2CO1:3–7 のように章内に複数 pericope) |
| book | ✗ 論外 |

- **理由**: SP-6 で編集単位=段落(pericope)と確定済み。Reading Hint は段落冒頭に一度置かれる段落スコープの
  観察であり、**管理単位も pericope が唯一整合**する。**bible_data に pericope 境界がない**(SP-6 実測)ため、
  **Hint レコード自身が pericope 範囲(verseStart–verseEnd)を保持し delimit する**。
- **Evidence**: SP-6 Phase1(段落・データに境界なし)。
- **Severity**: **P2**(pericope 境界データの不在=Hint が自ら範囲を持つ)。
- **Conclusion**: **管理単位=pericope。Hint レコードが範囲を保持する**。

## Phase 2: データモデル(A/B/C/D)

| 案 | メリット | デメリット | 責務 |
|---|---|---|---|
| **A. verse ごと** | アンカーが単純 | Hint は verse スコープでない・段落観察を節に断片化 | 誤スコープ |
| **B. pericope ごと** | **SP-6 編集単位と一致・範囲+Hint 文を 1 レコード** | pericope 境界の付与が必要(レコードが持つ) | **正スコープ** |
| C. chapter ごと | chapter は bible_data に存在 | 粗すぎ・章内複数 pericope を潰す | 粒度喪失 |
| **D. 別管理** | **bible_data を汚さない・M-12 台帳と同型** | 参照リンクが必要 | **編集資産の分離** |

- **評価**: **B(pericope 粒度)を D(別管理・編集資産ストア)に保持する**のが最適。1 レコード =
  {id, book, chapter, verseStart, verseEnd(pericope 範囲), focusReading(反復語), hintText, status, version,
  audit(監査記録), source='reading-hint'}。**M-12 Editorial Review 台帳(source=editorial-review)と同型の
  別台帳**。
- **Evidence**: M-12(別台帳の前例)・SP-6(pericope 単位)。
- **Severity**: **P2**。
- **Conclusion**: **pericope 粒度レコードを、bible_data と分離した Reading Hint 台帳に保持(B×D)**。

## Phase 3: bible_data との関係

- **評価**: **Reading Hint は bible_data に持たない。別データ(Reading Hint 台帳)に持つ**。
- **理由**:
  1. **責務分離(L-0/M-13/M-15)**: bible_data.japanese は Reading Japanese の**単一正規値**であり、
     **編集観察(Hint)を混ぜると Data 層と Editorial 層が混在**し責務境界が崩れる(M-15 で `japanese_old/new`
     を禁じたのと同じ原理)。
  2. **スコープ不一致**: bible_data は token スコープ・Hint は pericope スコープ。token レコードに段落観察を
     持たせるのは不整合。
  3. **前例**: M-12 Editorial Review 台帳が `source=editorial-review` で**分離管理**されている。Hint も同型。
- **Evidence**: M-15 data-role-migration(japanese は正規値のみ)・M-12(別台帳)。
- **Severity**: **P1**(bible_data 混入は責務境界破壊)。
- **Conclusion**: **Reading Hint は bible_data の外・別台帳。bible_data を read-only 参照するのみ**。

## Phase 4: 参照モデル

```
bible_data（token/verse・正規値）
        ▲ read-only 参照（verseId 範囲）
        │
pericope（Reading Hint レコードが verseStart–verseEnd で delimit）
        │
Reading Hint（pericope の反復観察・Reading の家）
        │ 入口として指し示す（保持はしない）
        ├─▶ StudyPanel（この語を調べる・Word）
        └─▶ Passage View（段落構造を研究する・Passage）
```

- **責務**: **参照は一方向**——Hint → bible_data(read-only)。**bible_data は Hint を知らない**(M-12 台帳と同じ
  非侵襲)。Hint は pericope 範囲と観察文を**所有**し、Word/Passage の**データ・構造は所有せず指し示すのみ**。
- **Evidence**: SP-4(Hint は入口・代替しない)・M-12(台帳の一方向参照)。
- **Severity**: **P2**。
- **Conclusion**: **verse → pericope(Hint が範囲所有)→ Reading Hint → (入口として)StudyPanel/Passage View**。

## Phase 5: Reading Memo との関係

| | **Reading Memo** | **Reading Hint** |
|---|---|---|
| 責務 | clause/verse の談話の流れ | pericope の反復の気づき(入口) |
| 管理単位 | clause/verse(節ごと) | **pericope(段落ごと)** |
| ライフサイクル | **Generated**(ReadingFormatter が Wallace fact から決定的に生成・**保存なし・毎回再生成**) | **Editorial Asset**(候補生成→編集→監査→公開・**保存・版管理**) |

- **決定的差**: **Reading Memo は決定的生成物**(discourse.type→固定文・編集判断なし・RM-0)。
  **Reading Hint は編集判断を含む**(distinctiveness 評価・「読者が聞こえるか」・JHN21 の非表示判断)ため
  **編集資産**(Phase 10)。両者は管理単位・ライフサイクルで明確に分かれる。
- **Evidence**: RM-0(ReadingFormatter=決定的生成)・SP-6(Hint の表示/非表示判断)。
- **Severity**: **P2**。
- **Conclusion**: **Memo=決定的生成物(節・揮発)/ Hint=編集資産(段落・保存監査)**。

## Phase 6: Passage View との関係

- **評価**: **Reading Hint は Passage View の「入口」であり、Passage View の一部ではない別機能**。
  Hint は Reading の家で「信仰が繰り返し響く」と**読みの気づき**を差し出し、Passage View は Passage の家で
  「この章は信仰による証人の列挙構造」と**構造を分析**する。Hint は View を**指し示す**が、View の構造データを
  **持たない・代替しない**。
- **Evidence**: SP-4/SP-5(Hint=読む面・View=分析面・声と目的で分離)。
- **Severity**: **P2**。
- **Conclusion**: **Reading Hint は Passage View の入口(別機能)。構造は持たず指し示すのみ**。

## Phase 7: ライフサイクル

```
作成（候補生成: SP-6 の表示条件を満たす pericope に候補文）
  ↓
編集（Editorial: SP-5 の静かな声へ・範囲確定・表示/非表示判断=JHN21 型を落とす）
  ↓
監査（RM-0/SP-5/SP-6 ルール監査: 数値/ラベル/原語なし・1/pericope・distinctive・非表示条件）
  ↓
公開（status=published・読者へ）
  ↓
修正（訂正時に再編集→再監査→再公開・version 更新）
  ↓
削除（誤り/不要時に retire・履歴は保持）
```

- **各段の status**: draft → edited → audited → published → revised → retired。**version と audit 記録**を保持。
- **Evidence**: M-6/M-10(編集パイロット)・M-12(台帳の status 管理)。
- **Severity**: **P2**。
- **Conclusion**: **作成→編集→監査→公開→修正→削除の編集資産ライフサイクル**(status+version 付き)。

## Phase 8: 将来性(Lexical/Semantic/Discourse/Rhetorical/Editorial と両立)

| 層 | Reading Hint との両立 |
|---|---|
| **Lexical**(反復/語族) | ✓ **候補生成の入力**として使う(反復回数 fact)が、Hint は観察文のみ保存(データは持たない) |
| **Semantic** | ✓ Word の家・Hint は参照せず(語義は載せない・SP-5) |
| **Discourse** | ✓ Passage/clause の家・Hint は談話構造を持たない |
| **Rhetorical** | ✓ Passage の家・Hint は構造を持たず入口として指す |
| **Editorial** | ✓ **同一ワークフロー**——Hint の編集/監査/公開は M-5/M-12 Editorial Workflow が担う(Hint は編集資産) |

- **評価**: **すべて両立**。Hint は別台帳の編集資産で、Lexical を**候補の材料**に使いつつ**データは持たず**、
  Semantic/Discourse/Rhetorical は別の家、Editorial は Hint の管理主体そのもの。**責務が分離しているため
  将来層と衝突しない**。
- **Evidence**: SP-2/SP-4(三つの家)・M-12(Editorial Workflow)。
- **Severity**: **P2**。
- **Conclusion**: **将来 5 層と両立。Lexical は候補入力・Editorial は管理主体・他は別の家**。

## Phase 9: Progressive Disclosure

- **評価**: **壊さない**。Hint は Reading(読む)の段落入口に 1 つ・別台帳の編集資産として保持され、
  **L1 に per-word データ(Word)も構造(Passage)も持ち込まない**。読者を下層(Word/Passage)へ誘う入口として
  三段(読む→調べる→研究)を維持する。
- **Evidence**: SP-3/SP-6 Phase9。
- **Severity**: **P2**。
- **Conclusion**: **三段維持。Hint は入口として下層を代替しない**。

## Phase 10（最重要）: Reading Hint の本質——生成物か、編集資産か

| 観点 | Generated Content | **Editorial Asset(採用)** |
|---|---|---|
| 品質管理 | 生成ロジックのテストのみ | **個別の編集+監査で担保**(RM-0/SP-5/SP-6) |
| 監査 | 生成時のみ・個別監査なし | **公開前に個別監査**(表示/非表示・声・distinctiveness) |
| バージョン管理 | なし(毎回再生成) | **あり**(版・履歴・退行検知) |
| データモデル | 揮発(保存なし) | **pericope 粒度レコード(別台帳)** |
| ライフサイクル | 生成→表示 | **作成→編集→監査→公開→修正→削除** |
| 将来の保守性 | ロジック変更で全件が一斉に変わり制御困難 | **個別に修正・監査・凍結・rollback 可能** |

- **判断**: **Reading Hint は Editorial Asset として扱う**。理由:
  1. **編集判断を含む**——distinctiveness、「読者が読みで聞こえるか」、**JHN21 型の非表示判断**(意味ある内容が
     隠れた原語対比のとき書かない)は、決定的 fact だけでは自動化しきれない**編集判断**。Reading Memo が
     決定的生成物でいられるのは判断がないから(RM-0)。Hint は判断を持つ。
  2. **L-0〜SP-6 の設計思想は「編集資産」**——本プロジェクトは bible_data を**監査・版管理・rollback 付きの
     資産**として扱い(M-15)、Editorial Review を**保存台帳**とし(M-12)、**各段を凍結前に監査**してきた。
     Reading Japanese 自体が「生成しっぱなし」でなく**監査を経た資産**。Hint も同じ思想に属する。
  3. **保守性**——生成物だとロジック変更で全 Hint が一斉変動し品質を制御できない。編集資産なら個別に
     監査・凍結・訂正でき、**RM-0 の静かな声を長期に保てる**。
- **全体への影響**:
  - **bible_data**: **不変**(Hint は別台帳・read-only 参照)。正規値の純度を保つ。
  - **Reading Hint**: 新規**編集資産台帳**(pericope レコード+status+version+audit・source='reading-hint')。
  - **Reading Memo**: **不変**(決定的生成物のまま)。Memo=生成/Hint=資産という**役割の明確な分離**が確立。
  - **Passage View**: 別機能。Hint は入口として参照(構造は View 所有)。
  - **Editorial Workflow**: **Hint を管理対象に拡張**(M-5/M-12 の作成/編集/監査/公開/status を Hint へ適用)。
- **Evidence**: M-12(台帳)・M-15(資産・監査・rollback)・RM-0(Memo=決定的生成)・SP-6(Hint=判断)。
- **Severity**: **P1**(本質判断が全体設計を規定)。
- **Conclusion**: **Reading Hint = Editorial Asset**(bible_data 外・pericope 粒度・監査/版管理付き)。
  **Reading Memo(生成物)と役割を分離**し、Editorial Workflow が管理する。

## Phase 11: 総合評価

- **P0 なし**。**P1×3**(Phase3 bible_data 非混入 / Phase10 編集資産化 / 参照一方向)は、すべて**「Hint は
  bible_data 外の pericope 粒度・編集資産・一方向参照」**という本データモデルで確定・回避済み。
- **P2**: pericope 境界データの不在(Hint が範囲を保持し当面近似・SP-6 の将来データ課題)。

| Phase | 監査 | Severity |
|---|---|---|
| 1 | 管理単位(pericope) | P2 |
| 2 | データモデル(B×D) | P2 |
| 3 | bible_data 関係(分離) | **P1** |
| 4 | 参照モデル(一方向) | P2 |
| 5 | Reading Memo 関係 | P2 |
| 6 | Passage View 関係 | P2 |
| 7 | ライフサイクル | P2 |
| 8 | 将来性 | P2 |
| 9 | Progressive Disclosure | P2 |
| 10 | 本質(編集資産) | **P1** |

---

## Reading Hint Data Rules(箇条書き)

- **管理単位**: pericope(段落)。Hint レコードが verseStart–verseEnd で範囲を保持・delimit する。
- **保存場所**: **bible_data の外**・独立の **Reading Hint 台帳**(source='reading-hint'・M-12 台帳と同型)。
  bible_data には持たない。
- **参照方法**: Hint → bible_data(verseId 範囲・**read-only・一方向**)。bible_data は Hint を知らない。
- **編集責務**: Editorial——候補を SP-5 の静かな声へ整え、範囲確定・**表示/非表示判断**(JHN21 型を落とす)。
- **監査責務**: 公開前に **RM-0/SP-5/SP-6 ルール監査**(数値/ラベル/原語なし・1 pericope 1 つ・distinctive・
  非表示条件)。
- **ライフサイクル**: 作成(候補)→編集→監査→公開→修正→削除。status(draft/edited/audited/published/
  revised/retired)+ version + audit 記録。
- **公開条件**: 監査 PASS(SP-5/SP-6 全条件充足)かつ表示条件充足。
- **Editorial Asset として扱うか**: **YES**。生成物でなく、**編集・監査・公開・版管理される編集資産**。

---

## FROZEN 判定

- **FROZEN 可能**。
- **理由**: Reading Hint のデータモデルが、**管理単位=pericope・保存=bible_data 外の独立台帳・参照=一方向
  read-only・本質=編集資産(監査/版管理付き)**として、L-0〜SP-6 の設計思想(責務分離・資産としての品質管理・
  監査を経た凍結)と完全整合する形で確定した。**最重要論点(生成物 vs 編集資産)は編集資産で決着**し、
  bible_data・Reading Memo・Passage View・Editorial Workflow への影響も分離的で衝突がない。P0 はなく、
  P1 は本モデルで塞がれている。
- **次 Stage**:
  - **pericope 境界データの整備**(Corpus 課題・Hint 台帳の verseStart–verseEnd の裏付け)。
  - もしくは **Editorial Workflow への Hint 統合設計**(M-5/M-12 の作成/編集/監査/公開/status を Reading Hint
    台帳へ適用する責務設計)。
  - いずれも本データモデル・SP-5・SP-6 を上位制約とする。生成アルゴリズム・UI は対象外。

```
[reading-hint-data-model-design FROZEN 2026-07-22]
管理単位: pericope(段落)。Hintレコードがverse範囲を保持・delimit(bible_dataにpericope境界なし)
データモデル: pericope粒度レコード(B)を bible_data外の独立台帳(D)に保持。{id,book,chapter,verseStart,verseEnd,focusReading,hintText,status,version,audit,source=reading-hint}。M-12 Editorial台帳と同型
bible_data関係: 混入禁止(責務分離・M-15 japanese_old/new禁止と同原理)。Hint→bible_data read-only一方向参照
参照モデル: verse→pericope(Hintが範囲所有)→Reading Hint→(入口)StudyPanel/Passage View。一方向・bible_dataはHintを知らない
Memo関係: Reading Memo=決定的生成物(clause/verse・揮発・毎回再生成) / Reading Hint=編集資産(pericope・保存・版管理)。役割分離
Passage View関係: Hintは入口(別機能)・構造は持たず指し示すのみ
ライフサイクル: 作成(候補)→編集→監査(RM-0/SP-5/SP-6)→公開→修正→削除。status+version+audit
将来性: Lexical=候補入力(データ持たず)/Semantic Discourse Rhetorical=別の家/Editorial=管理主体。全両立
本質(Phase10最重要): Editorial Asset採用。理由=編集判断を含む(distinctiveness/聞こえるか/JHN21非表示)・L-0〜SP-6は監査版管理rollbackの資産思想・生成物だとロジック変更で全件変動し制御困難。影響: bible_data不変/Memo不変(生成物のまま)/Editorial WorkflowがHintを管理対象に拡張
FROZEN可能。次: pericope境界データ整備 or Editorial WorkflowへのHint統合設計(本モデル+SP-5/SP-6上位制約)
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結(Reading Hint データモデル・管理単位=pericope・bible_data 外の独立台帳・一方向参照・**本質=Editorial Asset**・Memo=生成物と役割分離・ライフサイクル 6 段・将来 5 層両立・FROZEN 可能) |
