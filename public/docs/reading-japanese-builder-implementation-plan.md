# Reading Japanese Builder 実装計画(Stage M-2)

策定日: 2026-07-20
位置づけ: **Reading Japanese Builder の実装計画**。Builder は Morph / Syntax / Semantic が提供する
**決定的情報を章節単位で統合し、Reading Japanese を確定する最終統合層**。
根拠(すべて FROZEN): reading-japanese-policy.md(L-0)・-baseline.md(L-1)・-builder-design.md(L-2a)・
syntax-completion-implementation-report.md(L-3c)・semantic-completion-implementation-report.md(L-4c)・
reading-japanese-improvement-framework.md(M-1)・morph-rule-engine-v1-frozen.md(J-9)。

**本文書は設計・計画のみ。コード・bible_data・generated data・Morph・Syntax・Semantic・PhraseRenderer・
Presentation の実装/変更、擬似コード・JSON・TypeScript は一切含まない。本 Stage(M-2)で実装は行わない。**

---

## 0. 前提と位置づけ(重要)

- 各層の決定的情報は resolve 結果に付帯済:
  **Morph 語形**(japanese)+ **relativeSyntax / demonstrativeSyntax**(構造)+ **semanticInfo**(意味)。
- **Builder は「出力変更層」**。L-3c/L-4c(情報層・バイト等価)と異なり、**Builder は Reading Japanese を
  変える**(章節統合で決定的情報を反映)。したがって **FROZEN プロトコル**(回帰ケース追加 → 悪化 0 →
  基準更新)が必須で、バイト等価は前提としない。
- **Data 代表語(bible_data.japanese)は起点として不変**(H-3b・本計画で bible_data は変更しない)。
  Builder が確定するのは **Reading Japanese(読む日本語の deliverable)**であり、章節統合により得られる。
- **語順は変えない・推論しない・翻訳化しない**(M-1・K-5)。Builder は各層の決定を統合するのみ。

---

## 1. Builder の入力

| 入力 | 内容 |
|---|---|
| **token** | 章節内の全トークン(ギリシャ語順) |
| **Morph 情報** | resolve の語形(彼ら/それ/者/もの/私自身/格助詞・Morph v1) |
| **relativeSyntax** | 関係詞 role / 先行詞リンク(referent)(L-3c) |
| **demonstrativeSyntax** | 指示詞 role / 参照 / adnominal(未判定)(L-3c) |
| **semanticInfo** | lnDomain / pronType / reflexivePerson / intensive / deixis / adverbial(L-4c) |

- Builder は **verse(章節)スコープで全トークンの上記情報を読み取る**(推論しない・決定的情報のみ)。

---

## 2. Builder の責務

| 責務 | 内容 |
|---|---|
| **verse 単位統合** | 章節の全トークンの読む日本語を、決定的情報を反映して統合する |
| **語の接続** | 隣接語が日本語として接続するよう整える(助詞・活用の破綻を出さない) |
| **章節内一貫性** | 同一章節で同語・同構造の扱いを一貫させる |
| **Reading Japanese 確定** | 章節の最終的な読む日本語を確定する(deliverable) |

- Builder は **各層の決定的情報を反映**し、**章節として成立**させる。語順は変えない。

---

## 3. Builder が決めないこと

| 決めない | 決定する層 |
|---|---|
| **Morph 判定**(語形) | Morph v1 |
| **Syntax 判定**(role/referent/連体代名詞) | Syntax Completion(L-3c) |
| **Semantic 判定**(語義・意味分類) | Semantic Completion(L-4c) |
| **推論** | 誰も行わない(L-0 禁止) |
| **翻訳・語順自然化** | 対象外(M-1) |
| **StudyPanel 表示** | 別責務(K-5) |

- Builder は判定を代行せず、**確定情報の統合**に閉じる。未判定(連体代名詞・person-leveling 等)は
  **安全既定**で扱い、推論で埋めない。

---

## 4. 実装順序(Phase A〜F)

M-1 の改善順序(Data → Morph → Syntax → Semantic → 章節統合 → 品質確認)に対応。

### Phase A: Builder 内部骨格

- **目的**: verse スコープで全トークンの resolve 結果(Morph/Syntax/Semantic 情報)を集約する骨格を作る。
- **変更対象**: Builder の内部構造(verse パス)。**出力は変えない(バイト等価)**。
- **変更禁止**: resolve 出力・Morph/Syntax/Semantic・bible_data。
- **完了条件**: 章節の全情報が集約でき、**出力バイト等価**(骨格のみ・Stage D 型)。

### Phase B: Morph 反映

- **目的**: Morph 語形(彼ら/それ/者/もの 等)が章節として正しく反映されていることを統合で保証。
- **変更対象**: Builder の Morph 反映(語形は Morph v1 済のため、統合上の整合確認が主)。
- **変更禁止**: Morph Registry・語形決定。
- **完了条件**: Morph 語形が章節に反映・**悪化 0**(既に v1 で反映済のため基本バイト等価)。

### Phase C: Syntax 反映

- **目的**: 関係詞・指示詞の**構造(頭語 者/もの・deixis)**を章節へ反映(**語順は変えない**)。
- **変更対象**: Builder の Syntax 反映(relativeSyntax/demonstrativeSyntax の確定分)。役割・先行詞の
  「読解上の反映」は語順を変えない範囲に限る(構造の可視化は StudyPanel=K-5・reading への語順反映はしない)。
- **変更禁止**: 語順再構成・PhraseRenderer・連体代名詞の推論(未判定は既定)。
- **完了条件**: 構造の確定分が反映・**悪化 0**・語順不変。

### Phase D: Semantic 反映

- **目的**: semanticInfo の**決定的意味**(intensive→自身 / reflexivePerson→私たち自身等 / adverbial→なぜ /
  LN 語義)を章節へ反映。
- **変更対象**: Builder の Semantic 反映(決定的分のみ)。**未判定は既定**(推論しない)。
- **変更禁止**: 意味推論・LN 非該当への推測・翻訳化。
- **完了条件**: 決定的意味が反映・未判定は既定・**悪化 0**・推論混入 0。

### Phase E: Verse 品質統合

- **目的**: 語の接続・章節内一貫性・非破損を章節単位で成立させ、Reading Japanese を確定。
- **変更対象**: Builder の統合(接続・一貫性・破損排除)。
- **変更禁止**: 語順自然化・翻訳化・構造隠蔽。
- **完了条件**: 完成条件(M-1 §1)を章節単位で満たす・**悪化 0**。

### Phase F: 全巻監査

- **目的**: NT 全巻で before/after・回帰・悪化 0 を監査。
- **変更対象**: 監査スクリプト・回帰基準(出力変化は FROZEN プロトコルで更新)。
- **変更禁止**: 実装本体(監査は読み取り)。
- **完了条件**: §5 QA ALL PASS・悪化 0。

---

## 5. QA

| 項目 | 合格条件 |
|---|---|
| **verse 品質維持** | 完成条件(M-1 §1: 読解可能・構造忠実・章節一貫・語接続・非誤解・非破損)を章節単位で満たす |
| **chip⇔panel 一致** | 100%(不一致 0)・破損形 0(chip/panel が同一 Builder 出力を参照) |
| **before / after 差分** | 章節の読む日本語の変更を改善/中立/悪化に分類・**悪化 0**(M-1 §5) |
| **Morph 回帰 0** | morph 44,251・7 lemma 出力(v1)を壊さない |
| **Syntax 回帰 0** | relativeSyntax/demonstrativeSyntax(L-3c)取得を壊さない |
| **Semantic 回帰 0** | semanticInfo(L-4c)取得を壊さない・re-phase5 基準 |
| **悪化 0** | 構造隠蔽・推論追加・翻訳化・破損・一貫性低下 が 0 |
| **NT 全巻・実 FS** | 137,741・7,939 章節・重複「 2.json」不在確認 |

- **出力変化があるため FROZEN プロトコル**(回帰ケース追加 → 悪化 0 確認 → 基準値更新)を適用する
  (Phase B 以降の reading 変化)。Phase A(骨格)はバイト等価。

---

## 6. Gate(G1〜G6)

| Gate | 条件 |
|---|---|
| **G1** | L-0/L-1/L-2a/L-3c/L-4c/M-1 がすべて凍結されている |
| **G2** | Builder 入力(Morph/relativeSyntax/demonstrativeSyntax/semanticInfo)が resolve 結果で取得可能 |
| **G3** | Builder が **推論せず・判定を持たず**、決定的情報の統合のみで動く設計であることの担保 |
| **G4** | 出力変化に対する **FROZEN プロトコル**(回帰追加→悪化0→基準更新)と before/after QA が用意 |
| **G5** | **語順自然化・翻訳化・構造隠蔽・PhraseRenderer 変更をしない**ことの担保 |
| **G6** | chip⇔panel 一致 100%・破損形 0 を維持できる QA ハーネス(Builder 出力を chip/panel が共有) |

- G1〜G6 充足で Phase A から実装。Phase A(バイト等価)は G1〜G3 で先行可、Phase B 以降は全 Gate 必須。

---

## 7. リリース判定

以下をすべて満たすとき Builder を完成・FROZEN 可能とする。

| # | 基準 |
|---|---|
| 1 | verse 完成条件(M-1 §1)を章節単位で満たす |
| 2 | **悪化 0**(構造隠蔽・推論・翻訳化・破損・一貫性低下) |
| 3 | Morph / Syntax / Semantic 回帰 0(v1・L-3c・L-4c 非破壊) |
| 4 | chip⇔panel 一致 100%・破損形 0 |
| 5 | before/after 差分が改善/中立のみ(悪化 0) |
| 6 | **推論・語順自然化・翻訳化・構造隠蔽の混入 0**(L-0/M-1 準拠) |
| 7 | bible_data 代表語(起点)不変・generated data 不変 |

いずれか未達なら FROZEN しない(該当 Phase を保留・是正)。

---

## 責務凍結(候補)

```
[reading-japanese-builder-implementation-plan FROZEN候補 2026-07-20]
Builder: Morph/Syntax/Semanticの決定的情報を章節単位で統合しReading Japaneseを確定する最終統合層（出力変更層・FROZENプロトコル）
入力: token + Morph語形 + relativeSyntax + demonstrativeSyntax + semanticInfo（verseスコープ・推論なし）
責務: verse統合・語接続・章節内一貫性・Reading Japanese確定（語順変えず）
決めない: Morph/Syntax/Semantic判定・推論・翻訳・語順自然化・StudyPanel
順序: A骨格(byte等価) → B Morph反映 → C Syntax反映(語順不変) → D Semantic反映(決定的・未判定は既定) → E Verse品質統合 → F全巻監査
QA: verse品質・chip⇔panel100%・before/after(悪化0)・Morph/Syntax/Semantic回帰0・NT全巻(重複検出)・FROZENプロトコル
Gate G1〜G6・リリース: verse完成/悪化0/回帰0/chip⇔panel100%/改善中立のみ/推論翻訳自然化混入0/bible_data起点不変
```

本計画は凍結可能な状態である。承認により FROZEN 化し、G1〜G6 充足後に Phase A → F を実施する。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結候補(Builder 入力・責務・決めないこと・Phase A〜F・QA・Gate・リリース判定。Builder は出力変更層で FROZEN プロトコル適用) |
