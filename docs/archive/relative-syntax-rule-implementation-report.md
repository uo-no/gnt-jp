# 関係詞 Syntax Rule Engine Phase 1 実装報告(Stage K-3)

実装日: 2026-07-20
位置づけ: 関係詞 Syntax Rule Engine の **Phase 1(role/referent 読み取り・保持)** 実装。
計画 docs/relative-syntax-rule-implementation-plan.md(K-2)・設計 relative-syntax-rule-design.md(K-1)に準拠。
**Phase 1 は日本語出力を一切変えない(Stage D 型バイト等価)構造情報層の追加**。
数値はクリーン NT 実測(総 137,741・重複「 2.json」不在)。

---

## 1. 変更ファイル

| ファイル | 種別 | 変更内容 |
|---|---|---|
| public/core/reading-engine.js | 実装(追加のみ) | `_RELATIVE_STRONGS` 定数 + `getRelativeSyntax(token)` **read-only アクセサ**を追加。**resolve() 系(resolve/_resolveUnsafe/_morphStem/_resolveMorph/…)は一切不変** |

**変更なし(制約遵守)**: bible_data / generated data(再生成なし)/ Semantic / Presentation / lexicon /
Morph Registry(`_MORPH_STEM_RULES`)。既存 pipeline 順序・出力も不変。重複ファイル再混入 0。

---

## 2. 実装内容(最小)

- **`getRelativeSyntax(token)`**: 関係詞 ὅς/ὅστις/ὅσος(G3739/G3748/G3745)について、bible_data に
  **注釈済みの構造情報を読み取って返すのみ**の read-only メソッド。
  - 返す情報: `{ strong, role(節内役割), referent(先行詞トークンID) }`
  - **束縛関係(referent 有)のみ対象**。**自由関係(referent 無)は null = 対象外(Semantic 責務)**。
  - role は s/o/io/adv/p/o2 の注釈(未注釈 '-'/'' は null)。
  - 非関係詞・欠落時はすべて null(**安全 fallback**)。
- **推論しない**(parse・文脈推論なし)。Morph が gender/number を読むのと同型の**注釈読み取り**。
- **resolve() に触れない** → 日本語出力は構造的に不変(バイト等価が保証される設計)。

### 実装原則の遵守

| 原則 | 遵守 |
|---|---|
| Morph Registry 方式と同じく既存構造を壊さない | ✓(追加のみ・resolve 不変) |
| 注釈読み取りのみ | ✓(role/referent を読むだけ) |
| 推論しない | ✓ |
| 安全 fallback | ✓(欠落・非対象は null) |
| 既存 pipeline 順序維持 | ✓(pipeline 未変更) |

---

## 3. QA 結果

### 3-1. Stage D 型バイト等価確認

- **resolve() 系は一切変更していない**ため、日本語出力は構造的に不変。実測でも:
  - **re-stageB: 変更 39,694 / 一致 98,047**(J-8b 基準と**完全一致**)= NT 全巻 137,741 チップ出力が
    バイト等価。
  - chip⇔panel 一致 **137,741 / 不一致 0 / 一致率 100%**・破損形 0。
- **既存回帰 8 スイート ALL PASS(基準値すべて不変)** = 出力バイト等価の実証(§3-4)。

### 3-2. role/referent 取得確認(NT 全巻 census)

| 項目 | 実測 |
|---|---|
| 関係詞総数 | 1,658 |
| **getRelativeSyntax 非 null(束縛関係)** | **1,071**(K-1 と一致) |
| role 取得(注釈あり) | 834(s379 / o348 / adv71 / io22 / p10 / o2 4) |

### 3-3. 自由関係の除外確認

| 項目 | 実測 |
|---|---|
| **自由関係(referent 無)→ null** | **587**(K-1 と一致・Semantic 責務として除外) |
| 非関係詞 → non-null(リーク) | **0**(αὐτós/τίς 等に誤作用なし) |

### 3-4. Morph v1 回帰・全既存回帰

| テスト | 結果 |
|---|---|
| re-phase1 | **ALL PASS(104 checks)** morph 44,251(Morph v1 全 7 lemma 単体含む) |
| re-phase2 | ALL PASS(47) |
| re-phase3 | ALL PASS(27) |
| re-phase5 | ALL PASS(55)Semantic 不変 |
| re-stageA | ALL PASS(19) |
| re-stageB | **ALL PASS(27)** 出力・chip⇔panel 不変 |
| re-stageD | ALL PASS(18) |
| re-stageE | ALL PASS(16) |

- **Morph v1(αὐτós/τίス/ὅς/ὅστις/ὅσος/ἐμαυτοῦ/σεαυτοῦ)は不変**(re-phase1 の全単体ケース PASS・
  関係詞 resolve 出力=者/もの も不変)。test:genitive FAIL=2 は Stage H-5 で確認済みの既存失敗。

---

## 4. Phase 1 の到達点と対象外

### 到達点

- 関係詞の **節内役割(role)・先行詞リンク(referent)を Engine 内部で読み取り・保持可能**にした
  (getRelativeSyntax)。束縛関係 1,071 件で構造情報が取得でき、自由関係 587 は安全に除外。
- **日本語出力は完全に不変**(バイト等価)。回帰リスク 0 の情報層追加(Stage D と同型)。

### 対象外(Phase 1 で実装しない・禁止事項の遵守)

| 項目 | 責務 |
|---|---|
| 日本語出力変更 / role による助詞変更(者が/者を の描画) | Phase 2 |
| 関係節語順再構成(節を先行詞の前へ) | Phase 3(PhraseRenderer 協働) |
| whoever/whatever(自由関係)・数量(ὅσος)・自由関係詞解釈 | Semantic |

いずれも本 Stage では実装していない(getRelativeSyntax は読み取りのみ)。

---

## 5. 結論

- **Phase 1 実装成功**。関係詞の構造注釈(role/referent)を **read-only アクセサ getRelativeSyntax で
  Engine 内部に保持可能**にした。**resolve() 不変・日本語出力バイト等価・全回帰 ALL PASS・
  Morph v1 非回帰・chip⇔panel 100%・破損 0**。
- Morph v1 が「形態注釈(gender/number)の読み取り」だったのと同様、Syntax Phase 1 は
  「構造注釈(role/referent)の読み取り」を、既存の凍結資産を一切壊さずに確立した。
- 次段(Phase 2: role→役割助詞描画 / Phase 3: 語順再構成)は本情報層を入力とし、K-2 の
  PhraseRenderer 連携条件を追加 Gate として進める。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版(getRelativeSyntax 追加・role/referent 読み取り保持・束縛1071取得/自由587除外・バイト等価・全回帰ALL PASS) |
