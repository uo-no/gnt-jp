# Reading Support Projection 実装レポート（Phase 24）

- 実装日: 2026-07-08
- 方式: Phase 23.8 監査の **B 案**（既存 ReadingFormatter を維持し、補助 Projection を追加）
- 準拠: 設計理念正典（原則 1）・Phase 23.8「壊してはいけないもの」台帳

---

## 1. 設計概要

Wallace Engine（242 型）の解析結果を **StudyPanel が利用しやすい純粋データへ整理するだけ**の読み取り専用中間層。

- **文章を持たない**: label_ja / hint_ja / 説明文 / Reading Note / Observation / Wallace 要約 / HTML / UI 状態を一切保持しない。保持するのは型 id・confidence・シグナル id・句境界/ヘッド/従属語・節範囲・関連型 id・検索引数のみ
- **表示判断をしない**: どの層に何を出すかは Phase 25 以降の消費者の責務。自然文の生成源は従来どおり ReadingFormatter ただ一つ
- **additive**: 既存パイプライン（SyntaxAnalyzer → PhraseAnalyzer → ClauseAnalyzer → ReadingFormatter）は無変更。並列に生成し、失敗モードは「Projection が無い（null）」だけ

## 2. クラス構成

| ファイル | 内容 |
|---|---|
| **[core/reading-projection.js](../../public/core/reading-projection.js)（新設・約 200 行）** | `ReadingSupportProjection.build(args) → Object|null`（static・副作用なし・出力は deep-freeze 済みの読み取り専用）。内部ヘルパー: `_projectCandidate`（候補→純粋データ、文章フィールドを持ち込まない）/ `_relatedIdsOf`（RegistryLoader 読み取りのみ）/ `_searchParamsOf`（token→検索引数）/ `_deepFreeze` |
| [syntax-analyzer.js](../../public/core/syntax-analyzer.js) | **エクスポート 1 行のみ追加**: `window.App.syntax.ContextBuilder = ContextBuilder`（Phrase API の読み取り用・判定ロジック無変更） |
| [index.html](../../public/index.html) | ①script タグ 1 行追加 ②`_getWallaceClauseAnalysis()` 内で Projection を並列生成しキャッシュへ additive に格納（内側 try/catch・戻り値不変）③消費者向けアクセサ `_getReadingSupportProjection(words)` 新設（Phase 25 用・現時点で UI からの呼び出しなし） |

変更しなかったもの: SyntaxAnalyzer 判定ロジック / Registry / ReadingFormatter / UI レイアウト / CSS / 利用導線 / Syntax Search / PhraseAnalyzer / ClauseAnalyzer。

## 3. データ構造

```
projection（deep-freeze 済み・JSON 直列化可能）
├─ version: 1
├─ words[]（tokens と index 平行・候補なしトークンは null）
│   ├─ index / ref
│   ├─ top { id, category, confidence, signals[条件id], wallaceRef }
│   ├─ alternatives[≤4] { id, confidence }
│   ├─ categories { カテゴリ: {id, confidence} }   … 多層並走の素材（Phase 22 E2）
│   ├─ relatedIds[]                                … registry の alternatives（E1）
│   └─ searchParams { ref, lemma, pos, case, … }   … syntax-search 引き継ぎ引数
├─ phrases[] / genitivePhrases[]（Context Engine の句検出の写し）
│   └─ { type(NP/PP/PtcP/GenP), start, end, head, headLemma, case/gender/number, dependents[] }
├─ clauses[]（ClauseAnalyzer 結果 + アンカーの clause.* 候補）
│   └─ { type, start, end, anchor, confidence, top, alternatives[≤3] }
├─ related[]（節内の関連型 id の集約）
└─ metadata { tokenCount, analyzedCount, candidateCount, averageTopConfidence, clauseCount, phraseCount }
```

## 4. 利用箇所

- 生成: `_getWallaceClauseAnalysis()` 内（既存の `sa.analyzeAll()` 副産物 syntaxResults・clauseResults・ContextBuilder・sa.registry を**そのまま**使用 — 新しい解析・新 Scorer・新 Registry なし）。キャッシュ `_wallaceClauseCache` に `projection` フィールドとして格納（既存フィールドは不変）
- 読み出し: `_getReadingSupportProjection(words)`（async・null 可）— **現時点の UI 消費者はゼロ**（仕様どおり Phase 25 以降が読む）

## 5. Failure Mode

- 入力不備（配列でない・空・長さ不一致）→ **null**
- 内部例外（候補アクセス時の throw を含む）→ **null**（build 全体を try/catch で包む。テストで throw する getter を与えて検証済み）
- ContextBuilder / registry 未提供 → phrases 空 / relatedIds 空で成立（部分縮退）
- **null のとき UI は現状と完全に同一**: 生成は既存 try の内側でさらに独立 try、`_getWallaceClauseAnalysis` の戻り値・ReadingFormatter の経路・キャッシュヒット判定はすべて不変

## 6. 確認事項（仕様の 5 点）

| # | 確認 | 結果 |
|---|---|---|
| 1 | 文章を保持していない | ✓ テストで JSON 全文に「ここでは」「されています」「label_ja」「hint_ja」が不在を検証 |
| 2 | UI を知らない | ✓ HTML タグ不在・DOM/関数参照なし（JSON 直列化可能を検証）・表示判断ロジックなし |
| 3 | ReadingFormatter は Projection なしで動作 | ✓ Formatter へのコード変更ゼロ。生成失敗時も従来経路がそのまま実行される |
| 4 | 作成失敗でも UI 回帰なし | ✓ Failure = null のみ（§5）。戻り値・キャッシュ互換を維持 |
| 5 | 既存テスト維持 | ✓ **1647 PASS / 0 FAIL**（既存 1630 全維持 + §7ab 新規 17）。Coverage も不変（242 型・FAIL 0 / WARN 0） |

追加検証: 副作用なし（構築後に再解析した top 列が不変）・出力の凍結（Object.isFrozen）・新設ファイル単体の構文健全性。

## 7. Phase 25 で利用する情報（受け渡し済みの素材）

| Phase 25 の課題（22.5 Audit 10） | Projection 側の対応フィールド |
|---|---|
| Q2「なぜこの訳か」への即答（Critical C1） | `words[i].top`（id・signals・confidence）— 型 id から registry の文章素材を引く鍵 |
| かたまり提示（Critical C2・Q3） | `phrases` / `genitivePhrases`（境界・head・dependents）+ words の nominal_syntax/preposition categories |
| 流れの一言（High H1） | `words[i].categories`（conjunction / particle / clause の並走 top）+ `clauses` |
| 再会・似た箇所（High H2） | `words[i].top.id` を鍵に registry の example_verse を引く（Projection は id のみ運ぶ） |
| Related / 型引き継ぎ検索（Layer 4） | `words[i].relatedIds`・`related`・`searchParams` |
| 解釈が割れる箇所の扱い | `alternatives` の confidence 差（Δconf）・`metadata.averageTopConfidence` |

## 8. Regression 結果

- スイート: **1647 PASS / 0 FAIL / WARN 51（既知情報のみ・増減なし）**
- Wallace Coverage: 242 型・active 242・stub 0・**FAIL 0 / WARN 0**（不変）
- エンジン出力・Registry・表示文言: 変更ゼロ（analyzer への変更はブラウザ export 1 行のみ）
