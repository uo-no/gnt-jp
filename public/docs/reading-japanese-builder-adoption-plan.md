# Reading Japanese Builder Adoption 実装計画(Stage M-4)

策定日: 2026-07-20
位置づけ: **Builder が各層の決定済み情報を「採用」する実装計画**。Builder は**新しい判定を行わず**、
Morph・Syntax・Semantic が **決定済みの情報のみ**を Reading Japanese に反映する。
根拠(すべて FROZEN): reading-japanese-policy.md(L-0)・-builder-design.md(L-2a)・
-improvement-framework.md(M-1)・-builder-implementation-plan.md(M-2)・-builder-phaseA-report.md(M-3)・
morph-rule-engine-v1-frozen.md(J-9)・syntax-completion / semantic-completion(L-3c/L-4c)。

**本文書は設計・計画のみ。コード・bible_data・generated data・Morph・Syntax・Semantic・PhraseRenderer・
Presentation の実装/変更、擬似コード・JSON・TypeScript は一切含まない。本 Stage(M-4)で実装は行わない。**

---

## 0. 重要な前提(採用と判定の区別)

- **「決定済み情報」には 2 種がある**:
  1. **決定済み reading**(語形): Morph v1 の語形(彼ら/それ/者/もの/私自身/あなた自身)・lnGloss の
     語義置換。**これらは既に resolve 出力に反映済**(Phase A の reading = 現状 = これらを含む)。
  2. **決定済み分類**(フラグ): semanticInfo の intensive/adverbial/pronType/deixis/reflexivePerson、
     Syntax の role/referent。**これらは分類であって、日本語レンダリング(自身/なぜ 等)は未決定**。
- **Builder は判定しない**(L-2a)。分類を特定の日本語へレンダリングすることは**判定**であり、
  Builder の責務外。したがって:
  - **決定済み reading は採用**(既に反映済 → バイト等価で確認)。
  - **決定済み分類のうち日本語レンダリングが未決定のものは reading へ採用しない**(判定回避 = 現状維持)。
    分類は StudyPanel・将来の Semantic 決定的レンダリングのための情報として保持する。

---

## 1. Adoption の責務

| 責務 | 内容 |
|---|---|
| **決定済み情報のみ採用** | Morph の確定 reading・lnGloss 語義など**決定済み reading**を章節へ反映(既に反映済=確認) |
| **判定を行わない** | 分類フラグ(intensive/adverbial 等)を日本語へレンダリングしない(判定 = 責務外) |
| **未判定は現状維持** | Syntax adnominal/role null・Semantic person-leveling 残/pron intensive 残・レンダリング未決定は**現状維持**(推論で埋めない) |

---

## 2. Adoption 順序

| Phase | 採用対象 | 想定 reading 影響 |
|---|---|---|
| **B-1 Morph 採用** | Morph v1 の確定 reading(語形・格助詞) | **バイト等価**(既に resolve 出力に反映済) |
| **B-2 Syntax 採用** | relativeSyntax/demonstrativeSyntax の**決定済み**分(頭語 者/もの・deixis はすでに reading。role/referent は StudyPanel・adnominal 未判定) | **バイト等価**(reading へ新規反映なし・語順不変) |
| **B-3 Semantic 採用** | semanticInfo の**決定済み reading**(lnGloss はすでに reading)。分類フラグはレンダリング未決定 → 未採用 | **バイト等価**(決定済みレンダリングがあるもののみ変化・現時点はなし) |

- **各 Phase は決定済み reading の採用に閉じ、判定を要するレンダリングはしない** → 現時点で **Adoption は
  バイト等価**(決定済み reading が既に反映済のため)。将来 Semantic が決定的レンダリングを提供した段階で、
  それを B-3 で採用すると reading が変わる(その時は FROZEN プロトコル)。

---

## 3. 変更対象

### 採用可能(決定済み reading のみ)

| 採用可能 | 条件 |
|---|---|
| Morph が確定した reading | 語形・格助詞(Morph v1・既に反映) |
| relativeSyntax の決定済み情報 | 頭語 者/もの(Morph 済)・role/referent(**reading へは反映せず StudyPanel**) |
| demonstrativeSyntax の決定済み情報 | deixis この/あの(Data 済)・role/参照(**StudyPanel**)・adnominal は未判定 |
| semanticInfo の決定済み情報 | lnGloss 語義(既に reading)・**分類フラグはレンダリング決定時のみ**採用 |

### 変更禁止

| 禁止 | 理由 |
|---|---|
| **未判定情報** | adnominal・person-leveling 残・pron intensive 残 → 現状維持 |
| **推論** | 分類を日本語へ推測でレンダリングしない |
| **翻訳** | 自然文化しない |
| **語順変更** | 関係節前置・再構成しない(K-5) |
| **意味補完** | 既存注釈にない語義を足さない |

---

## 4. Verse 品質への影響

Adoption(決定済み reading の一貫採用)が verse 品質に与える影響:

| 品質 | 影響 |
|---|---|
| **構造忠実性** | 決定済みの Morph 語形(性数・頭語)が章節へ一貫反映される(既に反映済を確認・保証) |
| **読解可能性** | 決定済み reading のみで破綻を出さない(判定を足さないため誤りが増えない) |
| **章節内一貫性** | 同語・同構造の決定済み reading を章節で一貫させる(Adoption の主眼) |
| **非破損** | 判定・推論を足さないため破損形が生じない |

- Adoption 単独では reading はほぼバイト等価。**verse 品質の実質改善(語接続・一貫性)は Phase E**
  (M-2)で行い、Adoption はその前提となる**決定済み情報の一貫採用**を担う。

---

## 5. QA

| 項目 | 合格条件 |
|---|---|
| **before / after 差分** | Adoption 前後の reading 差分。**現時点はバイト等価**(決定済み reading は反映済)。将来のレンダリング採用時は改善/中立のみ・悪化 0 |
| **採用理由の記録** | 各トークンの採用/現状維持の理由(決定済み reading か・分類のみで未採用か・未判定か)を記録 |
| **回帰 ALL PASS** | Morph(44,251)・Syntax(L-3c)・Semantic(L-4c)・既存 8 スイート ALL PASS |
| **chip⇔panel 一致** | 100%(不一致 0)・破損形 0 |
| **悪化 0** | 構造隠蔽・推論・翻訳化・破損・一貫性低下 が 0 |
| **NT 全巻・実 FS** | 137,741・7,939 章節・重複「 2.json」不在確認 |

---

## 6. Gate(G1〜G6)

| Gate | 条件 |
|---|---|
| **G1** | L-0/L-2a/M-1/M-2/M-3(Phase A)・Morph v1・Syntax/Semantic Completion が凍結 |
| **G2** | Builder が Morph/relativeSyntax/demonstrativeSyntax/semanticInfo を取得できる(Phase A 済) |
| **G3** | Builder が **判定せず・決定済み情報のみ採用**する設計(分類のレンダリングをしない)の担保 |
| **G4** | **未判定は現状維持**(推論で埋めない)・**語順不変・翻訳化なし**の担保 |
| **G5** | before/after・採用理由記録・悪化 0 の QA ハーネスが用意 |
| **G6** | chip⇔panel 一致 100%・破損形 0 を維持(表示接続時に Builder 出力を共有) |

- 現時点の Adoption は **バイト等価**のため G1〜G4 で先行可。将来の決定的レンダリング採用(出力変化)は
  全 Gate + FROZEN プロトコル。

---

## 7. リリース判定

Adoption を完成・FROZEN 可能とする条件:

| # | 基準 |
|---|---|
| 1 | 決定済み reading が章節へ一貫採用されている(構造忠実・一貫) |
| 2 | **判定・推論・翻訳・語順変更・意味補完の混入 0** |
| 3 | 未判定・レンダリング未決定が **現状維持** |
| 4 | before/after が **バイト等価 or 改善/中立のみ(悪化 0)** |
| 5 | Morph/Syntax/Semantic 回帰 0・既存 8 スイート ALL PASS |
| 6 | chip⇔panel 一致 100%・破損形 0 |
| 7 | bible_data 代表語(起点)不変・generated data 不変 |

いずれか未達なら FROZEN しない。

---

## 責務凍結(候補)

```
[reading-japanese-builder-adoption-plan FROZEN候補 2026-07-20]
Adoption: Builderは新判定をせず、各層の「決定済み情報のみ」をReading Japaneseに採用する
区別: 決定済みreading(Morph語形/lnGloss=既に反映)は採用 / 決定済み分類(intensive/adverbial等・レンダリング未決定)は判定回避=現状維持
順序: B-1 Morph採用(byte等価) → B-2 Syntax採用(頭語/deixis既反映・role/referentはStudyPanel・byte等価) → B-3 Semantic採用(lnGloss既反映・分類はレンダリング決定時のみ・byte等価)
変更禁止: 未判定/推論/翻訳/語順変更/意味補完
Verse品質: 構造忠実・読解可能・章節一貫・非破損（決定済みの一貫採用。実質改善はPhase E）
QA: before/after(現状バイト等価・将来は改善中立のみ悪化0)・採用理由記録・回帰ALL PASS・chip⇔panel100%・悪化0
Gate G1〜G6・リリース: 一貫採用/判定推論翻訳語順補完混入0/未判定現状維持/バイト等価or改善中立/回帰0/chip⇔panel100%/bible_data起点不変
```

本計画は凍結可能な状態である。承認により FROZEN 化し、G1〜G4 充足後に Phase B-1 → B-2 → B-3 を実施する
(現時点はバイト等価・将来の決定的レンダリング採用は FROZEN プロトコル)。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結候補(Adoption 責務・順序 B-1/B-2/B-3・変更対象・Verse 品質・QA・Gate・リリース判定。決定済み reading は採用/分類のレンダリングは判定回避=現状維持) |
