# τίς(G5101) Morph Rule 実装報告(Stage J-5)

実装日: 2026-07-19
位置づけ: αὐτós(J-3)で確立した Morph Rule Registry 方式を **τίς(疑問詞・G5101)へ適用**した
2 例目の実装。設計 docs/tis-morph-rule-design.md(J-4・FROZEN)に準拠。
数値はすべて **クリーン NT 実測**(総 137,741・重複「 2.json」不在)。

---

## 1. 変更ファイル

| ファイル | 種別 | 変更内容 |
|---|---|---|
| public/core/reading-engine.js | 実装 | `_MORPH_STEM_RULES` に **G5101** を追加(masculine→誰・neuter→何。feminine は未登録=「誰」のまま)。既存 `_morphStem` / `_resolveMorph` のロジックは不変 |
| scripts/re-phase1-regression.cjs | テスト | τίス 単体回帰 6 ケース追加。morph 基準 44,035 → **44,114**(+79) |
| scripts/re-phase3-regression.cjs | テスト | particle 基準 3,079 → **3,063**(は −16。誰は→何) |
| scripts/re-stageB-regression.cjs | テスト | changed 39,540→**39,603** / identical 98,201→**98,138**(チップ改善 +63) |

**変更していないもの(制約遵守)**: bible_data(H-5 の 169 のみ・不変)/ 生成データ(再生成なし)/
Semantic(reading-semantic-data.js)/ Syntax / Presentation(presentation-policy.js)/ reading-lexicon.js /
Engine の構造(Registry に 1 lemma 追加のみ)。重複ファイル再混入 0。

---

## 2. 実装範囲

- 対象 lemma: **τίς(G5101)のみ**。既存 Data 代表語「誰」を維持。
- 追加した Morph 責務: **gender による語幹選択**。
  - **masculine → 誰**(Data 代表語のまま・出力不変)
  - **neuter → 何**(主変換)
  - **feminine → Morph では変更しない**(Registry stems に未登録 → `|| base` で「誰」のまま。
    女性名詞への一致で人/物が referent 依存のため **Semantic 責務**として残す)
- 方式: **αὐτós(J-3)と同一の Registry**(strong キー・base=代表語一致で発火・gender→語幹・case 助詞)。
  Engine 構造・pipeline・Semantic 優先は不変。
- **禁止事項の遵守**: why/which/feminine referent の判断はしていない(文脈推論なし)。Semantic 優先
  pipeline も不変(base='誰' 一致時のみ発火し、lnGloss 等が別語を代入した token は非干渉)。

---

## 3. Before / After(実 Engine 出力・クリーン NT)

| token(gender/case) | 変更前 | 変更後 |
|---|---|---|
| masculine 対格(whom) | 誰を | 誰を(不変) |
| masculine 属格(whose) | 誰の | 誰の(不変) |
| masculine 主格(who) | 誰(null) | 誰(null・不変) |
| **neuter 対格(what)** | 誰を | **何を** |
| **neuter 主格(what)** | 誰 | **何** |
| **neuter 与格** | 誰に | **何に** |
| **neuter 属格** | 誰の | **何の** |
| feminine 対格 | 誰を | 誰を(不変・Semantic 責務) |

変換パターン(全 NT・neuter のみ変化):

| パターン | 件数 |
|---|---|
| neuter 対格 誰を → 何を | 262 |
| neuter 主格 誰 → 何 | 79 |
| neuter 与格 誰に → 何に | 10 |
| neuter 属格 誰の → 何の | 3 |

---

## 4. QA 結果

### 4-1. τίς 全 555 件クリーン再計測

- τίς G5101 = **555**(全 pron)。
- **changed 354 / unchanged 201**。

### 4-2. gender 別

| gender | 件数 | 変化 | 結果 |
|---|---|---|---|
| **neuter** | 354 | 354 改善(誰→何) | 全件改善 |
| **masculine** | 177 | 0 | **悪化 0**(誰のまま) |
| **feminine** | 24 | 0 | **悪化 0**(誰のまま・Semantic 責務) |

### 4-3. 悪化チェック

| 項目 | 結果 |
|---|---|
| neuter 改善 | **354 件**(誰→何) |
| masculine 悪化 | **0** |
| feminine 悪化 | **0**(未変更・Semantic 保留) |
| Semantic 既存処理 悪化 | **0**(re-phase5 ALL PASS・base='誰' 一致時のみ発火で lnGloss 非干渉) |
| particle 破損 | **0**(むしろ「誰は」16 件を解消=H-3a が不自然と指摘した疑問詞の は 付与) |
| Presentation 破損(破損形・chip⇔panel) | **0 / 一致率 100%** |

### 4-4. 既存回帰(全 PASS)

| テスト | 結果 |
|---|---|
| re-phase1 | **ALL PASS(92 checks)** morph 44,114 |
| re-phase2 | ALL PASS(47) |
| re-phase3 | **ALL PASS(27)** particle 3,063(は −16=誰は解消) |
| re-phase5 | ALL PASS(55)Semantic 不変 |
| re-stageA | ALL PASS(19) |
| re-stageB | **ALL PASS(27)** chip⇔panel 100%・破損形 0 |
| re-stageD | ALL PASS(18) |
| re-stageE | ALL PASS(16) |

FROZEN プロトコル: morph(Phase1)・particle(Phase3)・chip(StageB)基準を悪化 0 確認のうえ更新
(各ファイルに根拠コメント)。test:genitive FAIL=2 は Stage H-5 で確認済みの既存失敗(J-5 と無関係)。

### 4-5. αὐτós(J-3)の非回帰

αὐτós(G846)の出力は不変(中性対格=それを 等を確認)。Registry への lemma 追加が既存 lemma を
壊さないことを確認(2 lemma 併存)。

---

## 5. 未解決の Semantic 領域(J-5 対象外)

Morph(gender)では決まらず、Semantic の責務として残るもの:

| 用法 | 件数(目安) | あるべき Reading | 現状(Morph 既定) |
|---|---|---|---|
| **why(なぜ)** | 72 | なぜ | 何(neuter 既定・副詞的 τί) |
| **which(どれ/どの)** | 25 | どれ / どの | 何(選択・連体用法) |
| **how(どう)** | 8 | どう | 何 |
| **feminine の人/物判別** | 24 | 誰 / 何・どの | 誰(未変更) |

- neuter の「なぜ/どれ」は同一形態のため Morph では区別できず、Semantic が既定「何」を上書きする
  (Semantic > Morph)。Semantic 未整備の間は「何」で描画され、旧「誰」より悪化しない(何/なぜ/どれ は
  いずれも非人称で、誰より何が近い)。
- feminine 24 件は referent(人か女性名詞か)依存で Semantic 責務。J-5 では「誰」のまま保留。
- **疑問詞への は/が 付与**(「誰は」)は particle 層の論点。J-5 では neuter が morph 解決される
  ことで結果的に 16 件解消したが、masculine 主格の「誰は」等は particle 層の別課題として残る。

---

## 6. 結論

- **τίス Morph Rule が αὐτós と同一 Registry 方式で実装成功**。gender で人(誰)/事物(何)を分岐し、
  neuter 354 件を「誰→何」に改善。masculine・feminine は悪化 0。
- 既存回帰 8 スイート ALL PASS・chip⇔panel 100%・破損形 0・Semantic 悪化 0。副次的に疑問詞の
  不自然な「誰は」16 件を解消。
- Registry への **1 lemma 追加のみ**で拡張でき、Engine 構造・αὐτós の挙動は不変(J-2 拡張方針を実証)。
- feminine と why/which は Semantic 責務として明確に保留(設計どおり)。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-19 | 初版(τίς G5101 Morph Rule 実装・neuter→何 354件改善・QA・未解決 Semantic 領域) |
