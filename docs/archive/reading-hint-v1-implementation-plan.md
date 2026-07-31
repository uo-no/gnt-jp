# Reading Hint v1 Implementation Plan(Stage SP-12)

策定日: 2026-07-22
位置づけ: Reading Hint を**最小工数で実装段階へ移行**するための実装計画。**新しい分析エンジン・AI・自動候補
抽出は作らない**。Reading Hint は **Editorial Asset(保存済み編集資産)であり Runtime Engine の生成物ではない**。
**本 Stage はコード変更禁止。設計・影響監査のみ。**
前提(FROZEN): SP-5 / SP-6 / SP-7 / SP-7A / SP-8 / SP-9・L-0 / RM-0 / M-15。

**重要**: SP-8/SP-9 の「AI」は**開発時の編集支援**を意味する。**アプリ実行時に AI 推論・生成は存在しない**
(公開済み Hint を読むだけ)。

Severity 凡例: **P0(致命)/ P1(高)/ P2(中)/ P3(低)**。

---

## Phase 1: 現アーキテクチャ確認

### 変更してはいけない箇所

| 対象 | 理由 |
|---|---|
| **reading-engine.js** | Reading Japanese の決定的生成(M-15)・非改変 |
| **ReadingFormatter / `_WALLACE_TEXT` / Guard Rule**(clause-analyzer.js §6) | Reading Memo の唯一の自然文生成源(RM-0)・Hint はここに触れない |
| **bible_data** | Reading Japanese 正規値(M-15)・Hint を混入させない(SP-7) |
| **`.wlv-reading-passage-note`(節全体の読書メモ)/ この節での響き** | 既存の per-verse 読書メモ・Hint と別物 |
| **StudyPanel(Word 家)内部** | Hint を混入させない(SP-SD-1/SP-4) |

### 利用可能な既存データ・機構

| 機構 | 用途 |
|---|---|
| **独立 JSON の init fetch**(reading-policy.json / clause-registry.json 等・index.html 8730 付近) | reading-hints.json を同様に読み込める |
| **chapter 単位 JSON**(`bible_data/${testament}/${book}/${ch}.json`・8261/10498) | verse 描画のタイミングが既にある |
| **verseId キー**(n+book+chap+verse) | Hint の範囲(verseStart–verseEnd)照合に使える |
| **lemmaId**(grc:Gxxxx・不変) | focusLemmaId 不変アンカー(SP-7A・v1 は保持のみ) |
| **Reading 本文 DOM**(`#bible-text-area` / `.verse-block` / `.gf-verse-block`) | 段落冒頭に L1 要素を足す挿入点 |

### 影響範囲

- **Reading 本文エリア(L1)への表示追加 + reading-hints.json の 1 fetch のみ**。
- **engine / bible_data / ReadingFormatter / StudyPanel 内部は影響ゼロ**(read-only の別アセット + 表示ルックアップ)。
- **Evidence**: 独立 JSON fetch パターン・verse 描画・verseId 実在(実測)。
- **Severity**: **P2**。
- **Conclusion**: **影響は「Reading L1 表示の加算 + 1 アセット読み込み」に限定。既存生成系は不変**。

---

## Phase 2: 最小データモデル(reading-hints.json)

**形式案**: 公開済み Hint の配列(bible_data 外の独立台帳・SP-7)。

| 項目 | v1 必須 | 内容 |
|---|---|---|
| `id` | ✓ | 一意 id |
| `book` / `chapter` / `verseStart` / `verseEnd` | ✓ | pericope 範囲(SP-6・照合キー) |
| `hintText` | ✓ | 公開される静かな一文(SP-5・表示はこれのみ) |
| `focusLemmaId` | ✓(保持) | 不変アンカー(SP-7A・v1 は表示せず保持のみ) |
| `status` | ✓ | `published` のみ Runtime 表示(SP-8) |
| `source` | ✓ | 固定 `reading-hint` |

| v1 で不要(将来) | 理由 |
|---|---|
| `version` / `editor` / `reviewer` / `created` / `updated` / `auditResult` | 編集資産の provenance(SP-7A)。v1 は少数手編集のため最小で可 |
| `evidenceVerses` / `occurrenceCount` | 監査根拠(SP-7A)。v1 表示に不要 |
| `focusReading`(スナップショット) | hintText に既に語が含まれる・v1 は静的少数 |
| `readingJapaneseVersion` | RJ 束縛(SP-7A)。v1 は静的検証のため後続 |

- **v1 レコード数**: **5〜10 件を手編集**(SP-8 の Editorial Workflow を人手で・例: HEB11:1 / 2CO1:3 / JHN15:1 /
  ROM3:21 — SP-6/SP-9 の採用ケース)。
- **Evidence**: SP-7(独立台帳)・SP-7A(focusLemmaId)・SP-6(pericope 範囲)。
- **Severity**: **P2**。
- **Conclusion**: **必須 6 項目(id/範囲/hintText/focusLemmaId/status/source)の最小レコードを 5〜10 件手編集**。

---

## Phase 3: Runtime 読み込み設計

- **読み込む層**: **init のアセット読み込み**(reading-policy.json 等と同列で reading-hints.json を fetch)→
  **メモリ内インデックス**(key=book+chapter → その章の Hint 配列)を構築。
- **verse から Hint を取得する方法**: verse 描画時、**現 verse が pericope の冒頭節(verseStart === 現 verse)** の
  Hint を索引から引く。**status==='published' のみ**採用(SP-8)。取得は**純粋な read**(範囲照合)。
- **Engine 非変更で可能か**: **可能**。**reading-engine.js / ReadingFormatter に一切触れない**——Hint は別アセットの
  読み取りと表示ルックアップのみで、決定的生成パイプラインの外側。**Runtime に推論・生成はない**(SP-12 前提)。
- **失敗モード**: reading-hints.json 欠落/該当なし → **Hint を出さないだけ**(既存表示は不変・安全 fallback)。
- **Evidence**: 独立 JSON fetch パターン(8730 付近)・verse 描画点(8261)。
- **Severity**: **P2**。
- **Conclusion**: **init で 1 fetch → 章索引 → 冒頭節でルックアップ表示。engine 非変更で成立**。

---

## Phase 4: StudyPanel / Reading Memo への影響監査

| 既存 | Reading Hint | 衝突 |
|---|---|---|
| **Reading Memo(この節での響き・`.wlv-reading-passage-note`)** | pericope 冒頭の入口 | **なし**——Memo=clause/verse(word-list-view ドロワー)・Hint=pericope(本文冒頭)。スコープ・位置とも別(SP-6 Phase8) |
| **StudyPanel(Word 家)** | Reading 家 L1 | **なし**——Hint は StudyPanel に入らない(SP-4/SP-SD-1) |

- **既存メモを壊さない条件**:
  1. **ReadingFormatter / `_WALLACE_TEXT` / Guard Rule に触れない**(Reading Memo 生成は不変)。
  2. **`.wlv-reading-passage-note` の DOM/生成を変更しない**(per-verse メモは不変)。
  3. Hint は**新規の別 DOM 要素**として段落冒頭に加算(既存要素を書き換えない)。
- **表示位置の責務確認**: Hint = **Reading 家 L1(本文冒頭・pericope 入口)**。**Word 家(StudyPanel)でも per-verse
  メモでもない**。SP-4 の「読む面は上」に一致。
- **Evidence**: SP-6 Phase8(Hint 先・Memo 後・排他)・SP-4(Reading L1)・RM-0(Memo 非改変)。
- **Severity**: **P1**(生成系に触れると RM-0/Memo 破壊)。
- **Conclusion**: **Hint は新規 L1 要素として段落冒頭に加算。ReadingFormatter/per-verse メモ/StudyPanel は不変**。

---

## Phase 5: UI 変更範囲

- **最小変更**: **段落冒頭節に静かな 1 行(hintText)を表示する新規 DOM 要素 1 つ + その CSS クラス 1 つ**。
- **新規 UI が必要か**: **新規パネル・新規画面は不要**。既存 Reading のタイポ(serif・静かな読書温度・
  `.wlv-reading-passage-note` 系の余白/色トークン)を**再利用**した、**L1 への加算要素のみ**。**UI 大改修なし**。
- **表示スタイル**: 数値・ラベル・原語なし(SP-5)・最大 1〜2 文・本文冒頭に控えめに。
- **Evidence**: SP-3(L1 の低負荷保護)・SP-5(静かな一文)。
- **Severity**: **P2**。
- **Conclusion**: **新規要素 1 + CSS 1 の加算のみ。新規画面/パネル不要・大改修なし**。

---

## Phase 6: v1 実装手順(小さな変更単位)

| 手順 | 単位 | 内容 |
|---|---|---|
| 1 | **アセット作成** | reading-hints.json に 5〜10 件を**手編集**(SP-5/SP-6/SP-8/SP-9 準拠・人が編集・監査) |
| 2 | **読み込み** | init に reading-hints.json の fetch を 1 行追加 + 章索引構築(engine 非改変) |
| 3 | **ルックアップ** | verse 描画で verseStart===現 verse かつ status=published の Hint を引く |
| 4 | **表示** | 段落冒頭に新規 DOM 要素 + CSS 1 つで hintText を控えめに表示 |
| 5 | **QA** | 下記 |
| 6 | **確認/rollback** | 下記 |

### QA 項目

- **bible_data 不変**(diff 0)。
- **ReadingFormatter / Reading Memo 不変**(この節での響き・chip⇔panel に影響なし)。
- **engine 非変更**(既存 regression 全 ALL PASS)。
- **Hint は published のみ・pericope 冒頭のみ**表示(毎節に出ない・SP-6)。
- **hintText に数値/ラベル/原語なし**(SP-5・目視 + 簡易 lint)。
- **表示位置 = Reading L1**(StudyPanel/per-verse メモに混入しない)。
- **5〜10 例が正しい章節で表示**され、該当なしの章では**何も出ない**(安全 fallback)。

### rollback 可能性

- **完全可逆**——(a) reading-hints.json を削除/空にすれば Hint は消える、(b) fetch/ルックアップ/DOM 追加は
  **加算的で隔離**されており除去で原状復帰。bible_data・engine・Memo は元から不変なので**巻き戻しリスクなし**。

- **Evidence**: 加算的変更・独立アセット・engine 非改変。
- **Severity**: **P2**。
- **Conclusion**: **6 手順の小さな加算。QA は不変性中心。完全 rollback 可能**。

---

## 総合評価

- **P0 なし**。**P1×1**(Phase4: 生成系=ReadingFormatter/Memo/engine に触れないこと)は、本計画が「別アセット +
  L1 加算表示のみ」に限定することで塞がれている。
- **禁止事項の遵守**: 新しい大規模設計なし / AI システムなし / 自動生成なし / 推論による Hint 生成なし
  (公開済み手編集資産を読むのみ)/ bible_data 混入なし。

| Phase | 監査 | Severity |
|---|---|---|
| 1 | 現アーキ確認 | P2 |
| 2 | 最小データモデル | P2 |
| 3 | Runtime 読み込み | P2 |
| 4 | Memo/StudyPanel 影響 | **P1** |
| 5 | UI 変更範囲 | P2 |
| 6 | 実装手順 | P2 |

- **Conclusion**: **v1 は「reading-hints.json(5〜10 件手編集)を init で読み、pericope 冒頭に静かな 1 行を L1
  加算表示する」だけ**で成立する。engine・bible_data・Reading Memo・StudyPanel は不変、Runtime に AI/推論/生成は
  なく、完全 rollback 可能。**Editorial Asset を読む場所**という Reading Hint の本質(SP-7)に忠実。

---

## FROZEN 判定

- **FROZEN 可能**(実装計画として)。
- **理由**: Reading Hint v1 が、**bible_data 外の独立台帳 + engine 非変更の read-only ルックアップ + L1 加算表示**で、
  既存の決定的生成系(Reading Japanese/Reading Memo)と StudyPanel を一切壊さず、**少数例(5〜10 件)で検証可能**な
  最小構成として確定した。Runtime に AI/推論/生成はなく(公開済み編集資産を読むのみ)、SP-5〜SP-9 の凍結仕様と
  整合し、完全 rollback 可能。P0 なし・P1 は本計画で塞がれている。
- **次 Stage(実装フェーズ・別途コード許可のもとで)**:
  1. reading-hints.json の 5〜10 件手編集(Editorial Workflow・SP-8/SP-9)。
  2. init fetch + 章索引 + 冒頭節ルックアップ + L1 加算表示の**最小コード**(engine/bible_data/Memo 非改変)。
  3. QA(不変性・published/冒頭のみ・SP-5 lint)+ rollback 確認。
  - **pericope 境界データ**(SP-6 の将来課題)は v1 では Hint レコードの verseStart–verseEnd が担う。

```
[reading-hint-v1-implementation-plan FROZEN 2026-07-22]
前提: Reading Hint=Editorial Asset(保存済み)・Runtimeに AI/推論/生成なし・公開済みHintを読むだけ
Phase1不変: reading-engine.js / ReadingFormatter・_WALLACE_TEXT・Guard Rule / bible_data / per-verseメモ(.wlv-reading-passage-note) / StudyPanel内部。利用可: 独立JSON init fetch・chapter JSON・verseId・lemmaId・#bible-text-area
Phase2データ: reading-hints.json 配列。v1必須=id/book/chapter/verseStart/verseEnd/hintText/focusLemmaId/status(published)/source。不要=version/provenance詳細/evidence/focusReading/RJ版。5〜10件手編集
Phase3 Runtime: initで1 fetch→章索引(book+chapter)→verseStart===現verseかつpublishedでルックアップ表示。engine非変更で成立・失敗時は非表示fallback
Phase4影響: Memo(clause/verse・ドロワー)とHint(pericope・本文冒頭)はスコープ位置とも別=衝突なし。条件=ReadingFormatter/Guard Rule/per-verseメモに触れない・新規別DOM加算
Phase5 UI: 段落冒頭に静かな1行の新規DOM要素1+CSS1のみ。新規画面/パネル不要・大改修なし・数値/ラベル/原語なし
Phase6手順: (1)reading-hints.json手編集(2)init fetch+章索引(3)冒頭節ルックアップ(4)L1加算表示(5)QA(6)rollback。QA=bible_data不変/Memo不変/engine回帰PASS/published冒頭のみ/SP-5 lint/表示位置Reading L1。完全rollback可(アセット削除で無効化)
総合: P0なし/P1×1(生成系に触れない)は本計画で回避。禁止(大規模設計/AIシステム/自動生成/推論生成/bible_data混入)を遵守
FROZEN可能。次(実装フェーズ・別途コード許可): reading-hints.json手編集→最小コード(engine/bible_data/Memo非改変)→QA/rollback
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結(Reading Hint v1 実装計画・独立 reading-hints.json/engine 非変更ルックアップ/L1 加算表示/5〜10 件手編集/Runtime に AI 生成なし/Memo・StudyPanel・bible_data 不変/完全 rollback・実装は別途コード許可のもとで) |
