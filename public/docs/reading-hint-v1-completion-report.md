# Reading Hint v1 Completion Report(Stage R-1)

策定日: 2026-07-22
位置づけ: SP-5〜SP-16 で設計・実装・監査・改訂・リリース凍結まで完了した **Reading Hint v1** の正式記録。
**本 Stage は文書のみ。コード・UI・bible_data 変更なし。**
根拠(FROZEN): reading-hint-editorial-specification.md(SP-5)〜reading-hint-v1-release-freeze-audit.md(SP-16)。

---

## 1. Reading Hint v1 とは

- **段落・章を読み始める読者に、日本語の読みの中で聞こえる繰り返しの気づきを、分類ラベル・数値・原語を
  出さずに静かな一文で差し出す、読書の入口の編集メモ**(SP-5 の人格)。
- **Editorial Asset**(編集済み・保存済みの静的資産)。**Runtime に AI 推論・生成・解析はない**——公開済みの
  hint を読んで、該当節の冒頭で表示するだけ。

---

## 2. 開発アーク(SP-5〜SP-16)

| Stage | 内容 | 結果 |
|---|---|---|
| SP-5 | Editorial Specification(人格・非露出) | 凍結 |
| SP-6 | Unit & Trigger(pericope 単位・冒頭表示) | 凍結 |
| SP-7 / SP-7A | Data Model / Metadata(独立台帳・focusLemmaId 不変アンカー) | 凍結 |
| SP-8 | Editorial Workflow(AI=編集支援・人=判断公開) | 凍結 |
| SP-9 | Candidate Selection Rules(集中反復・遍在語除外) | 凍結 |
| SP-12 | v1 Implementation Plan → **実装** | 実装 |
| SP-13 | Post-Implementation Audit(技術) | 全 PASS |
| SP-14 | Editorial Quality Review(読者価値) | Editorial Revision |
| SP-15 | Editorial Revision(文言 4 件改訂) | Approved |
| SP-16 | Release Freeze Audit | **FROZEN 承認** |

---

## 3. 実装内容(SP-12)

| ファイル | 変更 |
|---|---|
| **public/assets/data/reading-hints.json** | 新規・5 件(全 published) |
| **public/index.html** | **+64 行(純加算・削除 0)**: 独立 fetch + 章索引 + 冒頭節ルックアップ + 静かな L1 表示 + CSS 1 |

### 公開中の 5 Hint(SP-15 改訂後)

| 参照 | 焦点 | hintText |
|---|---|---|
| HEB 11:1 | 信仰 | この章では、「信仰」ということばが、ひとりまたひとりへと受け継がれてゆきます。 |
| 2CO 1:3 | 勧め | この段落では、「勧め」ということばが、寄せては返すように重なって聞こえてきます。 |
| JHN 15:1 | とどまる | この段落では、「とどまる」ということばが、離れずにそばへ戻ってきます。 |
| ROM 3:21 | 義 | ここから、「義」ということばが、次々と重なって響いてきます。 |
| 1CO 13:1 | 愛 | この章では、「愛」ということばが、読むたびに静かに立ちあらわれます。 |

---

## 4. 既存機能を変更していないことの明記

**Reading Hint v1 は以下を一切変更していない**(監査で独立確認済・SP-13/SP-16):

| 既存機能 | 状態 |
|---|---|
| **Reading Japanese**(bible_data.japanese) | **不変**(M-15 の反映済 252 ファイルのまま) |
| **Reading Memo**(ReadingFormatter / `_WALLACE_TEXT` / Guard Rule) | **不変**(clause-analyzer.js 非改変) |
| **StudyPanel** | **不変**(Word 情報の流入なし) |
| **reading-engine.js** | **不変**(reading-hint 記述 0) |
| **bible_data** | **不変** |

- **Runtime 生成なし・AI 推論なし**。実装は純加算で、既存の決定的生成系(Reading Japanese/Reading Memo)を
  壊さない。**hint なし節は従来と完全同一動作**(早期 return)。

---

## 5. 監査・QA サマリ

- **SP-13(技術監査)**: 8 Phase 全 PASS・既存 6 対象 変更なし・P0/P1/P2 なし。
- **SP-14(編集品質)**: 削除候補 0・全件 ★★★ 以上・文言 4 点を改善候補として記録。
- **SP-15(改訂)**: 文言 4 件を改訂・Reviewer 全 PASS・データ構造不変。
- **SP-16(Release Freeze)**: Phase 1〜4 全 PASS・FROZEN 承認。
- engine 回帰: サンプル ALL PASS(engine 非改変の担保)。

---

## 6. rollback

- **完全可逆**: (a) reading-hints.json を削除/空にすれば Hint は消える(fetch 失敗を graceful に吸収)、
  (b) index.html は純加算(削除 0)のため復元容易、(c) 改訂前 hintText は SP-15 文書に記録。
  bible_data/engine/Memo は元から不変。

---

## 7. changelog.json 追記案(未適用・提案)

> **注記**: 以下は提案であり本 Stage では **changelog.json を変更しない**。適用は別途。

```json
{
  "version": "2.6.0",
  "date": "2026-07-22",
  "title": "読むための日本語と、読書の入口メモ",
  "story": "聖書本文の日本語を、翻訳ではなくギリシャ語の構造を読むための表示へと反映し、段落を読み始める入口に静かな気づきのメモを添えました。",
  "changes": [
    "ギリシャ語の数・性・人称や指示のはたらきを、本文の日本語表示に反映（決定的に定まる範囲のみ）",
    "段落の冒頭に、その段落で繰り返し響くことばへの静かな気づき（読書の入口）を追加",
    "読書メモ・単語の調べもの・本文表示はこれまで通り"
  ]
}
```

---

## 8. README 追記案(未適用・提案)

> **注記**: 現在リポジトリに README は存在しない。以下は README を設ける際の Reading 機能節の提案。
> 本 Stage では作成・適用しない。

```markdown
## Reading Japanese（読むための日本語）

本アプリの日本語表示は「翻訳」ではなく、**ギリシャ語の構造（数・性・人称・指示など）を
読むための日本語表示**です。原文（新改訳）を起点として保持しつつ、決定的に定まる構造のみを
反映します（推論・語義選択・自然な翻訳化はしません）。

- **Reading Japanese**: ギリシャ語構造を反映した本文の読み
- **Reading Memo**: この節の談話の流れの、静かな読書メモ
- **Reading Hint**: 段落・章を読み始める入口の、繰り返しの気づき（編集済みの静的メモ）
- **StudyPanel**: 語を詳しく調べる場所

詳細仕様: docs/reading-japanese-specification.md
```

---

## 9. 完了宣言

- **Reading Hint v1 = 完成・Release Freeze 承認**。設計(SP-5〜SP-9)・実装(SP-12)・監査(SP-13/SP-16)・
  編集改訂(SP-14/SP-15)を経て、**Editorial Asset として正式に固定**された。
- 既存の Reading Japanese・Reading Memo・StudyPanel・bible_data は**一切変更していない**。Runtime に AI/推論/
  生成はない。

```
[reading-hint-v1-completion-report 2026-07-22]
Reading Hint v1 = 完成・Release Freeze承認（SP-5〜SP-16）
本質: Editorial Asset・Runtime生成なし・AI推論なし・公開済み静的hintを冒頭節で表示するだけ
実装: reading-hints.json 5件published + index.html +64純加算。engine/ReadingFormatter/Reading Memo/StudyPanel/bible_data 全不変
公開Hint: HEB11:1信仰 / 2CO1:3勧め / JHN15:1とどまる / ROM3:21義 / 1CO13:1愛（SP-15改訂後）
監査: SP-13技術全PASS / SP-14品質(改訂候補) / SP-15改訂Approved / SP-16 Release Freeze承認。engine回帰PASS
rollback: reading-hints.json削除で無効化・index.html純加算で復元容易・改訂前値SP-15記録
追記案(未適用): changelog v2.6.0案 / README Reading節案 / docs/reading-japanese-specification.md 正典化
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版(Reading Hint v1 完成報告・SP-5〜SP-16 アーク・実装 5 件+64 行・既存不変明記・changelog/README 追記案・完了宣言) |
