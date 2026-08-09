# CLAUDE.md

> 対象読者：未来の Claude Code。
>
> 目的：**このファイルだけ読めば、コードを書く前にプロジェクトの目的・思想・設計原則・開発進行規律を理解できること。**
>
> 言語：本プロジェクトのドキュメント・コメント・UI・Claudeの応答・コミットメッセージは日本語を標準とする。

---

# 1. First Principle（最重要原則）

> **「聖書がよく分かった」＝原著者の意図がより正確に理解できること。**

アプリの成否はこの一点で測る。

この原則から、あらゆる判断を導く。

* **研究は目的ではなく、読むことを助けるための手段。**
* **「読むために研究する」という軸を最優先する。**
* **これはギリシャ語学習アプリではない。聖書理解を支援するツールである。**
* **機能追加より、原著者の意図理解への貢献を優先する。**
* 技術的に可能であることは、実装する理由にならない。
* 情報量が増えることは、読書体験が改善することを意味しない。

新機能・改修を検討するとき、まず問う。

> **これは原著者の意図理解＝読みにどう貢献するか。**

それを説明できない拡張は優先度を下げる。

---

## 最重要の非矛盾

「原著者の意図理解を助ける」ことと、

「解釈・意訳・推論を足さない」

ことは矛盾しない。

後者は前者を実現するための境界である。

読者を原著者の意図へ近づける道は、

> **ギリシャ語の構造をそのまま読めるようにすること**

であり、こちらの読み下し・補完・意訳を差し込むことではない。

「読者のために訳した方が親切」という理由でL-0を破ってはならない。

---

# 2. Mission

ギリシャ語新約聖書および七十人訳（LXX）を、**原語に触れながら読み進められる**聖書閲覧Webアプリ。

サーバー・ビルド工程を持たない静的構成で、ブラウザ上で動作する。

中心にあるのは「聖書を読む体験」。

目指すのは、

> **言語の壁に気づかせない。読書の流れが途切れない。**

---

## 2.1 画面構成

* `index.html` — 聖書本文の閲覧（メイン画面）
* `morph-search.html` — 形態論検索
* `syntax-search.html` — 統語論検索
* `search-tool.html` — 統合検索

検索ツールは読書体験の従属物である。

> **読むことが主、検索・研究が従。**

この序列を崩さない。

---

# 3. Design Philosophy

## 3.1 Reading Japanese

本プロジェクトの技術的良心は **Reading Japanese** に集約される。

正典：

`public/docs/reading-japanese-specification.md`

最上位原則：

`reading-japanese-policy.md`

根幹テーゼ：

> **Reading Japanese は「翻訳」ではない。ギリシャ語の構造（数・性・人称・格・指示・語形・節構造）を「読むための」日本語表示である。**

---

# 4. L-0 Boundary — 「しないこと」

以下を破ってはならない。

## 翻訳しない

自然な訳文を目的にしない。

## 推論しない

referent / discourse を勝手に解決しない。

## 語義を勝手に選ばない

文脈から一つの意味を勝手に確定しない。

Semantic情報は情報提供にとどめる。

## 自然な日本語へ整えない

語順変更・敬体化・意訳をしない。

## 未判定を埋めない

Unresolved by Design。

非一意・文脈依存・判断不能なものは現状維持する。

---

## 4.1 静寂

`null` / fallback / unchanged は失敗とは限らない。

必要な根拠がない場合、

> **何もしないことが正しい結果**

である。

AIは「空白を埋める」ことを改善とみなしてはならない。

---

# 5. 貫く原則

* 決定的な事実のみ反映する。
* 一意性の勾配を `Morph > Syntax > Semantic` とする。
* 文脈依存・非一意なものは採用しない。
* 解析器は候補を返し、勝手に断定しない。
* `candidates[]` と `confidence` を必要に応じて利用する。
* UIが最終的な表示責務を持つ。
* Failure Mode は `null` / 静寂を基本とする。
* 自然文生成源を一つに保つ。
* 完成した層はFROZENとして扱う。
* FROZEN層の変更には回帰証拠を要求する。

---

# 6. Architecture Overview

本プロジェクトは静的サイト。

ビルド不要のブラウザ実行を基本とする。

```text
bible_data
  ↓
syntax-analyzer.js
  ↓
phrase-analyzer.js
  ↓
clause-analyzer.js / ReadingFormatter

reading-engine.js
  Phase 1 morph
  Phase 2 syntax
  Phase 3 particle
  Phase 4 lexicon
  Phase 5 semantic
  Phase 6 phrase
  Phase 7 policy

reading-context.js
  ↓
reading-japanese-builder.js
  ↓
presentation-policy.js / phrase-renderer.js
  ↓
UI
```

---

# 7. Core Modules

| モジュール                              | 責務                     | 境界            |
| ---------------------------------- | ---------------------- | ------------- |
| `core/syntax-analyzer.js`          | Wallace統語分類            | 候補のみ・UI非依存    |
| `core/phrase-analyzer.js`          | 句構造構成                  | 再分類しない        |
| `core/clause-analyzer.js`          | 節構造 + ReadingFormatter | 自然文生成源        |
| `core/reading-engine.js`           | 7フェーズ解決                | 副作用なし         |
| `core/reading-context.js`          | ResolveContext SSOT    | 日本語生成しない      |
| `core/reading-japanese-builder.js` | verse単位の決定的fact採用      | 推論しない         |
| `core/reading-lexicon.js`          | lexicon lookup         | 語義選択しない       |
| `core/reading-projection.js`       | StudyPanel用射影          | HTML・説明文を持たない |
| `core/presentation-policy.js`      | 表示整形                   | 意味判断しない       |
| `core/phrase-renderer.js`          | 生成済み日本語の表示             | 意味判断しない       |
| `index.html`                       | UI本体                   | 判断ロジックを持たない   |
| `assets/js/app-storage.js`         | ユーザーデータ永続化             | ソフトデリート       |
| `css/tokens.css`                   | デザイントークン               | トークンのSSOT     |

---

# 8. Data Principles

* データとコードを分離する。
* runtimeデータは `public/assets/data/`。
* 設計文書は `public/docs/`。
* 本文データは `bible_data/` / `translations/` / `morph-index/`。
* `assets/data/` を直接編集しない。
* 生成可能なデータは `scripts/` 経由で生成する。
* 一次情報と生成物を区別する。
* runtimeにAI推論・AI生成を持ち込まない。
* 原文Dataは原則不変。
* `bible_data.japanese` は採用済みReading Japaneseの正規値として扱う。

---

# 9. Reading Engine Principles

中核API：

```text
resolve(token, context?) → ResolveResult | null
```

`null` は改善なし。

呼び出し元は従来の `token.japanese` 等へfallbackする。

7フェーズ：

```text
morph
→ syntax
→ particle
→ lexicon
→ semantic
→ phrase
→ policy
```

原則：

* morph文字列を自前でparseしない。
* decodedフィールドを使う。
* SyntaxAnalyzerを直接呼ばない。
* context経由で解析結果を受け取る。
* 副作用を持たない。
* 表示責務を持たない。
* 例外は基本的に `null` / fallback へ落とす。

---

# 10. FROZEN Protocol

FROZENとは「絶対に変更してはいけない」という意味ではない。

> **検証済みの現在状態を基準値として固定し、以後の変更に追加の証拠を要求する状態**

である。

FROZEN層：

* `reading-engine.js`
* `reading-context.js`
* `presentation-policy.js`
* `phrase-renderer.js`
* Syntax Completion
* Semantic Completion
* `morph-rule-engine-v1`
* その他、各Phaseで明示的にFROZENされたもの

変更時：

1. 変更理由を記録する。
2. 影響範囲を確認する。
3. 回帰ケースを追加する。
4. 既存baselineを保存する。
5. 新baselineを取得する。
6. 差分を確認する。
7. Freeze Auditを更新する。

偶然の回帰を「仕様変更」として扱わない。

---

# 11. UI / UX Principles

* 静かな読書体験を志向する。
* 情報密度を上げすぎない。
* StudyPanelは研究ツールではなく読書支援パネル。
* 文法情報は「なぜそう読めるか」の根拠としてのみ提示する。
* 本文 → 節パネル → 単語詳細の階層を維持する。
* 戻る操作は単純にする。
* Reading / Word / Passage の責務を分ける。
* 読む面に研究用情報を露出させない。
* 状態はURLで共有・復元する。
* メモ削除はソフトデリート。
* UI変更は監査駆動で行う。

読書面には原則として、

* 分類ラベル
* confidence数値
* 語形コード
* 生マーカー
* 内部解析情報

を露出させない。

---

# 12. AI Development Governance

Claudeは本プロジェクトの通常開発を自律的に進行する。

ただし、自律性とは無制限のScope拡張ではない。

---

## 12.1 Phase / Task / State

### Phase

開発上の大きな単位。

例：

`VR-6`

### Task

Phase内の具体的作業。

例：

`Flow Rendererの表示経路を監査する`

### State

Taskが現在どの段階にあるか。

例：

`STATIC_AUDIT`

ClaudeはPhase・Task・Stateを混同しない。

---

# 13. Development State Machine

原則として次の順序で進める。

```text
SCOPE
  ↓
VALUE CHECK
  ↓
FIDELITY CHECK
  ↓
DESIGN
  ↓
IMPLEMENTATION PLAN
  ↓
IMPLEMENTATION
  ↓
STATIC AUDIT
  ↓
RUNTIME AUDIT
  ↓
REGRESSION
  ↓
FREEZE AUDIT
  ↓
FROZEN / DONE
```

すべてのTaskがすべてのStateを必要とするわけではない。

不要なStateは、

```text
N/A — reason
```

として明示する。

---

# 14. Stateの意味

## SCOPE

何を変更するかを確定する。

必須：

* Objective
* In Scope
* Out of Scope
* Change Type

## VALUE CHECK

First Principleへの貢献を確認する。

## FIDELITY CHECK

L-0、原文忠実性、既存仕様との整合を確認する。

## DESIGN

変更後の構造・責務・データフローを確定する。

## IMPLEMENTATION PLAN

具体的な変更箇所・順序・検証方法を確定する。

## IMPLEMENTATION

計画に従って変更する。

## STATIC AUDIT

コード・参照・データ・責務境界を検証する。

## RUNTIME AUDIT

実行時の挙動を検証する。

## REGRESSION

既存動作が維持されていることを確認する。

## FREEZE AUDIT

基準値・証拠・文書を確認し、基準状態を確定する。

---

# 15. Phase Scope

Phaseには原則として以下を持つ。

```text
Phase ID
Objective
In Scope
Out of Scope
Current State
Entry Criteria
Exit Criteria
Validation Criteria
Known Risks
Dependencies
```

Claudeは現在Phaseに含まれない新Phaseを勝手に開始しない。

---

# 16. No Scope Creep

以下はScope拡張の理由にならない。

* ついでに直せる
* コードが汚い
* 将来必要になりそう
* Coverageを増やせる
* より美しい実装が可能
* 別の問題を発見した

現在のExit Criteria達成に必要なものだけを現在Phaseへ含める。

その他は、

* `RELATED`
* `TECH-DEBT`
* `FUTURE`

として分離する。

---

# 17. Change Type

変更には以下の種別を付ける。

* `BUG`
* `CORRECTNESS`
* `REFACTOR`
* `ARCHITECTURE`
* `UX`
* `DATA`
* `COVERAGE`
* `FEATURE`
* `PERFORMANCE`
* `DOCUMENTATION`

特に、

> **CORRECTNESS と COVERAGE は別物**

として扱う。

既存対応の精度改善と、未対応ケースの追加は同一Taskにしない。

明示的なCoverage要求がない限り、未対応ケースを発見しただけでCoverage拡張を開始しない。

---

# 18. Entry Criteria

次のStateへ進む前に、前StateのExit Criteriaを満たす。

特にImplementation開始前には、

* Scope確定
* Value確認
* Fidelity確認
* Design確認
* Validation Criteria確認

を完了する。

曖昧な依頼は実装許可ではない。

「直して」「改善して」「対応して」「全部やって」等の場合も、まず現在の問題とScopeを定義する。

---

# 19. Impact Analysis

コード・データを変更する前に、最低限次を確認する。

```text
Changed:
Direct consumers:
Indirect consumers:
User-visible surfaces:
Data dependencies:
Regression targets:
```

影響範囲が不明な場合、実装を拡大せず調査へ戻る。

---

# 20. Validation Matrix

検証レベル：

| Level | 内容                        |
| ----- | ------------------------- |
| L1    | 静的コード・参照監査                |
| L2    | Unit / Regression         |
| L3    | Runtime実行確認               |
| L4    | Browser / DOM / URL State |
| L5    | Visual / UX Audit         |

変更内容に応じて必要レベルを選択する。

UI・Renderer・StudyPanel・Flow・URL Stateなどの変更では、原則L4まで確認する。

UX変更ではL5を必要とする。

---

# 21. Validation Criteria

Validationは「テストをした」だけでは不十分。

原則として、

```text
Validation Criterion
↓
Test Case
↓
Evidence
↓
PASS / FAIL
```

の関係を持たせる。

代表ケースは、単に有名な聖句を選ぶのではなく、変更リスクを代表するものを選ぶ。

可能な限り、

* 通常ケース
* 境界ケース
* 失敗ケース
* 回帰ケース

を含める。

---

# 22. Evidence Policy

監査・検証結果には可能な限り根拠を付ける。

根拠として認めるもの：

* 実コード
* 実データ
* 実行結果
* テスト結果
* DOM
* スクリーンショット
* Git diff
* baseline
* 明示された仕様書

事実と推測を混同しない。

以下を区別する。

* `CONFIRMED`
* `OBSERVED`
* `NOT VERIFIED`
* `UNKNOWN`
* `INFERRED`

`INFERRED`を`CONFIRMED`として扱わない。

---

# 23. Audit Rule

監査は原則READ ONLY。

監査では、

* 問題を発見する
* 根拠を取得する
* PASS / FAILを判定する
* 改善案を提示する

ことを行う。

監査中に修正しない。

修正が必要になった場合、

```text
AUDIT
↓
FINDING
↓
IMPLEMENTATION
↓
RE-AUDIT
```

と分離する。

---

# 24. Specification Conflict

仕様と実装が一致しない場合、

```text
Specification says:
Implementation currently does:
Difference:
Impact:
SSOT:
```

を確認する。

SSOTが明示されている場合はSSOTに従う。

SSOTが不明な場合、Claudeは勝手に仕様を変更しない。

必要ならSTOPする。

---

# 25. Stop Conditions

Claudeは以下の場合、実装・進行を停止する。

* Scope不明
* SSOT不明
* 責務境界不明
* 仕様矛盾
* First Principleの判断が必要
* L-0の判断が必要
* FROZEN層の変更が必要
* 破壊的変更が必要
* ライセンス不明
* 回帰影響を評価できない
* 別Phaseの設計判断が必要
* 必要な事実を確認できない
* Exit Criteriaを判定できない

停止時：

```text
STOPPED

Reason:
Evidence:
Required decision:
Recommended next step:
```

---

# 26. Result Classification

作業結果は次のいずれかに分類する。

## PASS

Exit Criteriaを満たした。

## FAIL

検証結果が基準を満たさない。

## BLOCKED

必要な情報・判断・依存がなく進行不能。

## DEFERRED

現在Scope外。

## N/A

今回のTaskには適用されない。

## UNKNOWN

現時点で確認不能。

Exit Criteriaに関係するUNKNOWNを残したままDONEにしてはならない。

---

# 27. Definition of Done

`DONE` は「コードが動いた」ことを意味しない。

原則として、

* Scope確定
* 実装完了
* 必要なStatic Audit完了
* 必要なRuntime Audit完了
* 必要なBrowser Audit完了
* Regression PASS
* baseline確認
* Documentation更新
* 未確認事項の明示
* Scope外事項の分離
* Exit Criteria達成

を満たす。

小規模な変更については、不要な工程を省略してよい。

ただし、省略した場合は、

```text
N/A — reason
```

を明示する。

---

# 28. Micro Change

以下のような変更はMicro Changeとして扱える。

* typo修正
* 明白な文言修正
* 既存仕様内の小規模CSS修正
* 明白なバグ修正
* 既存テストの明白な修正

Micro ChangeではPhase級の文書一式を要求しない。

ただし、

* FROZEN層
* データ仕様
* L-0
* アーキテクチャ境界
* ユーザー可視挙動

に影響する場合はMicro Changeとして扱わない。

---

# 29. FROZEN Change

FROZEN層を変更する場合：

1. 変更理由を記録。
2. Impact Analysis。
3. 回帰ケース追加。
4. 既存baseline保存。
5. 実装。
6. 全関連Regression。
7. 新baseline取得。
8. 差分確認。
9. Freeze Audit更新。

基準値を悪化させた場合、理由なくDoneにしてはならない。

---

# 30. Coverage Rule

Coverage拡張は、品質改善と分離する。

例えば、

> 既存Relative Clauseの判定精度を改善する

ことと、

> Participial Clauseを新規対応する

ことは別Task。

未対応ケースを発見しても、明示的なCoverage要求がない限りCoverage拡張を開始しない。

---

# 31. No Silent Specification Change

AIは、

> 「実装を変える方が合理的」

という理由だけで仕様を変更してはならない。

仕様変更が必要な場合、

* 変更理由
* 現仕様
* 新仕様
* 影響範囲
* 既存データへの影響
* Regression影響

を明示する。

---

# 32. Natural Language Generation Boundary

日本語文章の生成源はReadingFormatterを単一の正規経路とする。

他層は自然文を持ち込まない。

表示層は生成済み日本語を意味変更せず整形する。

---

# 33. Directory Responsibility

* UIにビジネスロジックを書かない。
* `core/` はDOM / window非依存。
* `assets/data/` は直接編集しない。
* `scripts/` は本番UIから参照しない。
* runtime dataのfetch pathを不用意に変更しない。
* `css/tokens.css` 以外にデザイントークン値を定義しない。

---

# 34. Existing Path / Structure Rule

既存構造と設計文書のパスが一致しない場合、勝手に再編しない。

現在知られている構造不整合：

* `docs/README.md` / `architecture-rules.md` は `pages/index.html` 前提
* 実体は `public/index.html`
* `pages/` は未実在
* 文書の一部は `docs/xxx.md`
* 実体は `public/docs/xxx.md`

この問題は、Pre-Releaseのファイル再編に関係する。

パス再編を伴う作業では、現在の実構造を勝手に別構造へ移行しない。

---

# 35. Repository Responsibility

本リポは `gnt-jp`。

3リポジトリの責務：

### gnt-jp

聖書アプリ本体。

### gnt-editorial

SNS・編集・発信。

### knowledge-library

研究・背景・判断履歴。

リポジトリ間にファイル参照依存を作らない。

責務をまたぐ場合は必要な情報だけを明示的に共有する。

---

# 36. Data Safety

以下を壊さない。

1. `bible_data` の原文Data
2. runtime dataのfetch path
3. regression baseline
4. Editorial Asset
5. rollback台帳
6. ライセンス境界
7. `assets/data/` の生成経路

特に原文Dataを、表示改善を理由に直接書き換えない。

---

# 37. Things Never To Break

以下は本プロジェクトの上位制約。

1. **L-0 Boundary**
2. **First Principle**
3. **Reading Japaneseの忠実性**
4. **FROZEN層の回帰安全性**
5. **ReadingFormatterの自然文生成単一性**
6. **ResolveContextのSSOT**
7. **core / UI責務境界**
8. **runtime dataのfetch path**
9. **回帰baseline**
10. **原文Dataの不変性**
11. **デザイントークンのSSOT**
12. **3リポジトリ責務境界**

---

# 38. 作業開始時の内部確認

Claudeは作業開始時に最低限、以下を確認する。

```text
CURRENT PHASE:
CURRENT TASK:
CURRENT STATE:

OBJECTIVE:

CHANGE TYPE:

IN SCOPE:
OUT OF SCOPE:

ENTRY CRITERIA:

VALIDATION CRITERIA:

KNOWN RISKS:

DEPENDENCIES:
```

---

# 39. 作業終了時の内部確認

```text
STATE BEFORE:
STATE AFTER:

IMPLEMENTED:

VERIFIED:

EVIDENCE:

REGRESSION:

NOT VERIFIED:

DEFERRED:

BLOCKED:

NEXT ALLOWED STATE:
```

これらは毎回ユーザーへ全文表示する必要はない。

ただし、Claude自身は判断材料として保持する。

---

# 40. 開発の基本姿勢

本プロジェクトでは、

> **早く作ることより、正しく境界を守ることを優先する。**

ただし、

> **確認を増やすこと自体を品質とはみなさない。**

Claudeは通常の進行を自律的に行い、人間への確認は本当に判断が必要な場合に限定する。

人間に確認する前に、Claude自身で確認できることを最大限確認する。

---

# 41. 最終判断原則

複数の選択肢で迷った場合、原則として次の優先順位で判断する。

```text
First Principle
    ↓
L-0 / Fidelity
    ↓
既存SSOT / 仕様
    ↓
現在PhaseのScope
    ↓
既存アーキテクチャ境界
    ↓
Regression Safety
    ↓
UX
    ↓
Implementation Simplicity
    ↓
Future Convenience
```

「将来便利そう」は、上位原則を覆す理由にならない。

---

# 42. Future Roadmap

単一ソース：

`public/assets/data/roadmap.json`

ロードマップ：

* テキストと辞書
* 読書体験
* 記録と持ち出し

優先順位はFirst Principleに従う。

機能として面白いかではなく、

> **原著者の意図理解＝読みにどう貢献するか**

で判断する。

---

# 43. Current Phase

現在フェーズ：

**Pre-Release**

基本読書・検索・URL共有は動作。

データ出典・ライセンス整理・ファイル構成整理等を進めている。

現在のPre-Release状態を理由に、未定義の新機能を勝手に追加しない。
