# Reading Japanese Builder Pilot 設計(Stage M-3a)

策定日: 2026-07-20
位置づけ: Builder を全巻へ適用する前に、**代表的な 1 節**を対象として Reading Japanese の改善フローを
検証する Pilot の設計。
根拠(すべて FROZEN): reading-japanese-policy.md(L-0)・-builder-design.md(L-2a)・
syntax-completion-implementation-report.md(L-3c)・semantic-completion-implementation-report.md(L-4c)・
reading-japanese-improvement-framework.md(M-1)・-builder-implementation-plan.md(M-2)。

**本文書は設計のみ。コード・bible_data の実装/変更、全巻適用、擬似コード・JSON・TypeScript は
一切含まない。** Pilot は **1 節のみ**を対象とし、**全巻適用は行わない・bible_data は変更しない**。

---

## 1. Pilot の目的

- **Builder の判断過程を検証**する(各層情報の統合・改善候補生成・verse 評価・最終決定の一連の流れ)。
- **L-0 Policy 適合**を確認する(構造忠実・非推論・非翻訳・非自然化)。
- **Verse 単位品質評価**を検証する(章節として完成条件を満たすか)。
- 全巻適用前に、**「決定的情報のみ反映・未確定は変更しない」保守的判断が正しく働くか**を確かめる。

---

## 2. 対象節(代表 1 節)

**1CO 1:9**(16 トークン)を Pilot 対象とする。理由: Builder の各層入力を網羅的に含む:

- **関係詞**(οὗ・G3739・referent=n46001009003 で先行詞「神」を指す・role 未注釈)
- **αὐτós**(αὐτοῦ・G846・masculine singular genitive → 彼の)
- **人称代名詞の number gap**(ἡμῶν・G2257・1 人称複数 → 私の。**Morph v1 対象外**)
- **semanticInfo**(lnDomain が多数のトークンに付帯)

これ 1 節で「Morph 反映済」「Syntax 未確定(role null)」「Morph 未対応(number)」「Semantic 情報あり」の
全パターンを検証できる。

---

## 3. Builder の処理手順(Pilot で検証する 7 段階)

| 段階 | 処理 | 責務 |
|---|---|---|
| 1 | **現在の japanese を取得** | Data 代表語(起点)を確認 |
| 2 | **Morph 情報を参照** | resolve の語形(彼の/私の/交わりを 等・Morph v1) |
| 3 | **Syntax 情報を参照** | relativeSyntax(οὗ の role/referent)・demonstrativeSyntax(本節なし) |
| 4 | **Semantic 情報を参照** | semanticInfo(lnDomain 等) |
| 5 | **改善候補を生成** | 決定的情報が既定より改善する場合のみ候補を出す(推論しない) |
| 6 | **Verse として評価** | 章節の完成条件(M-1 §1)で評価(語接続・一貫・非破損・構造忠実) |
| 7 | **最終 Reading Japanese を決定** | 悪化がないもののみ採用。未確定・Morph 未対応は現状維持 |

### Pilot walkthrough(1CO 1:9・設計上の判断・bible_data は変更しない)

| token | 現 ja | 参照情報 | Builder 判断 |
|---|---|---|---|
| πιστὸς 忠実な | 忠実な | sem 無 | 現状維持(決定的改善なし) |
| θεὸς 神 | 神 | lnDomain | 現状維持 |
| οὗ 〜する者の | 〜する者の | rel(role=null・referent=神) | **現状維持**(頭語 者 は Morph 済・**role 未確定**で反映せず・**語順変更しない**=Syntax は StudyPanel 責務) |
| αὐτοῦ 彼の | 彼の | sem(92.11) | **現状維持**(masc sing で「彼の」は構造忠実・改善不要) |
| ἡμῶν 私の | 私の | sem(92.4) | **現状維持**(1 人称複数=本来「私たちの」だが **G2257 は Morph v1 対象外**=Morph 未対応。Builder は Morph 判定をしない=変更しない) |
| κοινωνίαν 交わりを 他 | — | lnDomain | 現状維持(Morph 済・決定的改善なし) |

- **Pilot の想定結果**: 本節は **ほぼ現状維持**(Morph 反映済・Syntax は role 未確定/語順不変・Semantic は
  決定的 reading 改善対象なし)。**これは「決定的理由がなければ変更しない」保守的判断が正しく働くことの
  検証**である(改善件数の多寡は成功条件ではない)。
- ἡμῶν の number gap は **Morph 未対応(v1 対象外)として記録**され、Builder は変更しない(責務境界の確認)。

---

## 4. 改善判定基準

改善候補を採用するのは、以下を満たすときのみ。

| 基準 | 内容 |
|---|---|
| **構造忠実性** | ギリシャ語の形態・構造が正しく反映される(性数・関係詞・deixis 等) |
| **読解可能性** | 章節として意味が取れる |
| **章節内一貫性** | 同語・同構造の扱いが一貫 |
| **非誤解** | ギリシャ語と異なる読みにならない |
| **非破損** | 二重助詞・不正活用・意味不明形が生じない |
| **自然さのみを理由に変更しない** | 「自然になる」だけでは採用しない(L-0 §7) |

---

## 5. 変更しない条件(いずれか該当で現状維持)

| 条件 | 例(1CO 1:9) |
|---|---|
| **推論が必要** | role null の関係詞に役割を推測して付す等 |
| **翻訳になる** | 関係節を自然文へ書き換える |
| **語順変更になる** | 関係節を先行詞の前へ移す(K-5 で不採用) |
| **Semantic 未判定** | intensive/person-leveling 等の未判定を推測で埋める |
| **Syntax 未確定** | οὗ の role=null・連体代名詞未判定 |
| **Morph 未対応** | ἡμῶν の number(G2257 は v1 対象外) |

- 未確定・未対応・推論要は **すべて現状維持**(推論で埋めない)。

---

## 6. QA

| 項目 | 内容 |
|---|---|
| **before / after 比較** | 対象節の読む日本語を Pilot 前後で比較(変更/不変を明示) |
| **Builder 判断理由** | 各トークンの採用/現状維持の理由(決定的情報 or 未確定/未対応)を記録 |
| **L-0 Policy 適合** | 推論なし・翻訳なし・語順不変・構造隠蔽なし・章節評価を確認 |
| **悪化 0** | 構造隠蔽・推論・翻訳化・破損・一貫性低下 が 0 |
| **chip⇔panel 一致** | Pilot 出力で chip/panel が一致(不一致 0) |
| **bible_data 不変** | Pilot は評価のみ。bible_data.japanese を変更しない |

---

## 7. Gate

| Gate | 条件 |
|---|---|
| G1 | L-0/L-2a/L-3c/L-4c/M-1/M-2 が凍結されている |
| G2 | 対象節の Builder 入力(Morph/relativeSyntax/demonstrativeSyntax/semanticInfo)が取得できる |
| G3 | Builder が **推論せず・判定を持たず**、決定的情報の統合のみで判断する |
| G4 | 各トークンの判断理由が記録でき、L-0 適合・悪化 0 を検証できる |
| G5 | **語順変更・翻訳化・自然化・構造隠蔽をしない**ことが担保される |
| G6 | Pilot が **1 節のみ**・bible_data 不変・全巻適用しないことが担保される |

---

## 8. FROZEN 条件

Pilot 設計を凍結できる条件:

- §1〜§7 が確定している。
- 対象が **1 節のみ**で、全巻適用・bible_data 変更を含まない。
- Builder の判断が **決定的情報のみ・未確定は現状維持**(推論しない)であることが明記されている。
- **改善件数の多寡を成功条件にしない**(保守的判断の検証が目的)。
- L-0/M-1 準拠(構造忠実・非推論・非翻訳・非自然化・章節評価)。

---

## 責務凍結(候補)

```
[reading-japanese-builder-pilot-design FROZEN候補 2026-07-20]
目的: 全巻前に1節でBuilder判断過程・L-0適合・verse品質を検証。全巻適用しない・bible_data変更しない
対象: 1CO 1:9（関係詞οὗ/αὐτός/number gap ἡμῶν/semanticInfo を網羅する代表節）
手順: 現ja取得 → Morph参照 → Syntax参照 → Semantic参照 → 改善候補生成 → Verse評価 → 最終決定
判定: 構造忠実/読解可能/一貫/非誤解/非破損。自然さのみで変更しない
変更しない: 推論要/翻訳/語順変更/Semantic未判定/Syntax未確定/Morph未対応 → 現状維持
想定結果: ほぼ現状維持（保守的判断の検証・改善件数の多寡は成功条件でない）
QA: before/after・判断理由記録・L-0適合・悪化0・chip⇔panel一致・bible_data不変
Gate G1〜G6・FROZEN: 1節限定・決定的のみ・未確定は現状維持・推論なし
```

本設計は凍結可能な状態である。承認により FROZEN 化し、1CO 1:9 を対象に Pilot を実施する
(実装・bible_data 変更は行わない)。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結候補(Pilot 目的・対象節 1CO 1:9・処理手順・walkthrough・改善判定・変更しない条件・QA・Gate・FROZEN 条件) |
