# Reading Japanese Builder Phase A 実装報告(Stage M-3)

実装日: 2026-07-20
位置づけ: Reading Japanese Builder の **最小骨格(Phase A)** 実装。token・Morph・relativeSyntax・
demonstrativeSyntax・semanticInfo を verse 単位で受け取り集約する構造を用意し、**japanese 出力は現状と
完全一致(バイト等価)**。改善ロジックは実装しない(Phase B 以降)。
根拠: reading-japanese-builder-implementation-plan.md(M-2)・-design.md(L-2a)・-pilot-design.md(M-3a)。
数値はクリーン NT 実測(総 137,741・重複「 2.json」不在)。

---

## 1. 変更ファイル一覧

| ファイル | 種別 | 内容 |
|---|---|---|
| **public/core/reading-japanese-builder.js** | **新設** | `ReadingJapaneseBuilder` クラス(Phase A 骨格)。resolve 結果を verse 単位で集約する read-only 統合器 |

**変更なし(制約遵守)**: reading-engine.js(**非改変**・Builder は resolve を呼ぶのみ)/ bible_data /
generated data / Morph / Syntax / Semantic / **PhraseRenderer** / **Presentation**。重複再混入 0。
既存 core・pipeline は一切触れていない(Builder は独立した新規モジュール)。

---

## 2. Builder 構造(Phase A)

`ReadingJapaneseBuilder`(core/reading-japanese-builder.js・v0.1.0-phaseA-skeleton):

- **constructor(engine)**: ReadingEngine(resolve を持つ)を受け取る。
- **buildVerse(tokens, context)**: 章節の全トークンを集約し `{ tokens, readings }` を返す。
  - 各トークンを `_collectToken` で **read-only 集約**:
    `{ token, reading, morph, relativeSyntax, demonstrativeSyntax, semanticInfo }`
  - **reading = 現状の表示読み**(resolve.japanese、null は素の token.japanese へフォールバック)= **バイト等価**。
  - morph/relativeSyntax/demonstrativeSyntax/semanticInfo は resolve 結果から **読み取るのみ**。
- **改善ロジックは無し**(Phase A)。**推論・翻訳・語順変更をしない**。engine を変更しない
  (resolve を呼び出して結果を読むだけ = pipeline 非破壊)。

### 責務(Phase A の範囲)

- **情報統合の器のみ**。verse 単位で各層の決定的情報を集約する構造を確立した。
- **出力を一切変えない**(reading は現状と完全一致)。

---

## 3. QA 結果

| 項目 | 結果 |
|---|---|
| **NT 全巻 before/after 監査** | 137,741 トークンで **Builder.reading = 現状表示読み**(resolve.japanese‖token.japanese)。**バイト不一致 0** |
| **出力バイト等価** | reading 完全一致(0 mismatch)= 現状と同一 |
| **回帰 ALL PASS** | re-phase1(104)/2/3/5・re-stageA/B/D/E **全 ALL PASS**(engine 非改変・基準不変) |
| **chip⇔panel 一致** | re-stageB identical=**98,047 不変**・chip⇔panel **100%(不一致 0)**・破損形 0 |
| **resolve pipeline 非破壊** | reading-engine.js 非改変(Builder は resolve を呼ぶのみ) |
| **悪化 0** | reading 不変・破損 0・推論/翻訳/語順変更なし |
| **facts 集約** | 非 null resolve 結果 42,947 件で rel/demo/sem facts を集約(確認) |

- Builder は表示に未接続(Phase A は骨格のみ)。既存表示は engine 経由のまま = 現状不変。

---

## 4. 未実装範囲(Phase A で実装しない)

| 項目 | Phase |
|---|---|
| Morph 反映(統合上の整合確認) | Phase B |
| Syntax 反映(構造の確定分・語順不変) | Phase C |
| Semantic 反映(intensive/reflexivePerson/adverbial 等の決定的意味) | Phase D |
| Verse 品質統合(語接続・章節内一貫性・非破損) | Phase E |
| 全巻監査(出力変化の before/after・FROZEN プロトコル) | Phase F |
| 表示への接続(chip/panel が Builder 出力を参照) | Phase B 以降 |

- Phase A は **reading を変えない骨格**のみ。改善は Phase B 以降で FROZEN プロトコルにより行う。

---

## 5. Phase B への引き継ぎ事項

| 事項 | 内容 |
|---|---|
| **null resolve 結果の facts** | resolve が null を返すトークン(主格名詞・placeholder 等)は結果に facts が付帯しない。Phase B 以降は **getSemanticInfo / getRelativeSyntax / getDemonstrativeSyntax を token へ直接呼び**、全トークンの決定的情報を取得すること(resolve 付帯だけに依存しない) |
| **出力変更層への移行** | Phase A はバイト等価。Phase B 以降は reading を変える出力変更層 → **FROZEN プロトコル**(回帰ケース追加 → 悪化 0 → 基準更新)を適用 |
| **未判定の扱い** | Syntax の adnominal・role null、Semantic の person-leveling 残・pron intensive 残は **未判定=現状維持**(推論で埋めない・M-3a Pilot 設計どおり) |
| **語順不変・翻訳化禁止** | Syntax 反映は頭語(者/もの)・deixis の確定分のみ。**語順再構成・関係節前置はしない**(K-5・M-2) |
| **chip⇔panel の共有** | Phase B で表示へ接続する際、chip と panel が **同一 Builder 出力**を参照し一致 100% を維持すること |
| **Pilot 先行** | 全巻適用前に M-3a Pilot(1CO 1:9)で判断過程を検証してから Phase B の全巻へ広げること |

---

## 6. 結論

- **Phase A 実装成功**。Reading Japanese Builder の最小骨格(`ReadingJapaneseBuilder.buildVerse`)を新設し、
  token・Morph・relativeSyntax・demonstrativeSyntax・semanticInfo を **verse 単位で読み取り集約**する
  構造を確立した。
- **japanese 出力は現状と完全一致(バイト等価・NT 全巻 0 mismatch)**。engine・bible_data・その他資産は
  一切非改変。全回帰 ALL PASS・chip⇔panel 100%・破損 0・悪化 0。
- **改善ロジックは Phase B 以降**。Builder は情報統合の器として確立され、次段で決定的情報の反映
  (出力変更層・FROZEN プロトコル)へ進む準備が整った。

```
[reading-japanese-builder-phaseA 完了 2026-07-20]
新設: core/reading-japanese-builder.js（ReadingJapaneseBuilder・buildVerse 骨格）
出力: reading = 現状表示読み（バイト等価・NT全巻 mismatch 0）。改善ロジックなし
非破壊: reading-engine/bible_data/generated/PhraseRenderer/Presentation 不変・pipeline非破壊
QA: 全回帰ALL PASS・reading identical98047・chip⇔panel100%・破損0・悪化0
引き継ぎ: null結果はアクセサ直呼び / Phase B以降はFROZENプロトコル / 未判定は現状維持 / 語順不変
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版(Builder 骨格新設・verse 集約・reading バイト等価・全回帰 ALL PASS・Phase B 引き継ぎ) |
