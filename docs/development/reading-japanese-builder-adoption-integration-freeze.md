# Reading Japanese Builder Adoption Integration Freeze(Stage M-8f)

策定日: 2026-07-22
位置づけ: **M-8b Morph Adoption・M-8d Syntax Adoption・M-8e Semantic Boundary を統合し、
Builder の最終責務境界を凍結する**(capstone)。以後この境界を壊さず、M-9(Editorial Review 展開)へ渡す。
根拠(FROZEN): reading-japanese-policy.md(L-0)・-builder-design.md(L-2a)・
-builder-morph-adoption-implementation-report.md(M-8b)・
-builder-syntax-adoption-implementation-report.md(M-8d)・
-builder-semantic-adoption-boundary-design.md(M-8e)・-editorial-review-framework.md(M-5)。

**本 Stage は設計のみ。コード・bible_data・Builder・Engine は変更しない。** 数値はクリーン NT 実測
(総 137,741・重複「 2.json」不在)。

---

## 1. Builder Adoption の最終責務

Builder は **決定的で日本語出力が一意な fact のみを採用する記録層**である(判定・推論をしない)。

| Builder が採用可能(reading 反映) | Builder が採用不可(reading 変更禁止) |
|---|---|
| **Morph 決定語形**(number/person/gender/case が strong/morph で一意) | **Semantic 語義選択**(lnDomain からの gloss 選択・不定詞語選択) |
| **決定済み Syntax fact**(pronominal neuter=verb 参照の これ/あれ) | **Discourse 解釈**(deixis 距離 この→その・anaphora) |
| | **文脈補完**(省略・含意・intensive 付着・reflexive3 referent) |
| | **翻訳判断**(自然化・神学補完・語順変更) |

- **採用境界は「一意性の勾配」**: **Morph > Syntax > Semantic**。一意性が下がるほど採用不可(M-8e)。
- reading-level の Semantic 決定(慣用句 すなわち 等)は **resolve が source='semantic' で既決**であり、
  Builder は **guard で尊重**する(上書きしない)。

---

## 2. Adoption 実績(統合実測)

| 層 | 採用(reading 反映) | 内容 |
|---|---|---|
| **Morph** | **2,087**(純複数人称)/ フィールド総計 **15,965** | 私→私たち 862・あなた→あなたがた 1,225(M-8b 設計対象)。`morphAdopted` フィールドは全 Morph 語幹変化 15,965 を記録(αὐτός 彼→彼ら/彼女・τίス 誰/何・関係詞 者/もの・再帰 私自身/あなた自身 を含む) |
| **Syntax** | **179** | この→これ 164・これらの→これら 13・あの→あれ 2(pronominal neuter=verb 参照・M-8d) |
| **Semantic** | **0** | reading 影響なし。semanticInfo は StudyPanel/将来層向け metadata(添付 43,069・M-8e) |

- **Morph × Syntax 同時採用 = 0**(指示詞は Morph Registry 対象外・排他)。
- **M-8b/M-8d の採用は既存 resolve/Morph の決定語形を Builder が採用・記録したもの**であり、
  **bible_data.japanese(代表語)は不変**(起点保持)。

---

## 3. 未解決情報の扱い(現状維持)

| 未解決 | 件数/内容 | 扱い | 将来の担当 |
|---|---|---|---|
| **Syntax discourse 依存** | demonstrative 未判定 1,377(M-7e) | 現状維持 | Discourse Layer |
| **Semantic 未決定** | lnDomain gloss 選択・不定詞・reflexive3(251)・intensive 付着(85)・adverbial(79) | 現状維持 | 語義選択層/3 人称再帰層/副詞的疑問層 |
| **corpus 不足** | referent 未注釈・自由関係 等 | 現状維持 | 注釈拡充/Discourse Layer |

- **未解決はすべて「Unresolved by Design」**(L-0 の推論禁止を守る正式な完了状態)。**Builder は埋めない**。

---

## 4. QA 基準(凍結時実測)

| 項目 | 結果 |
|---|---|
| **推論混入 0** | Morph/Syntax は決定的 fact のみ・Semantic は reading 不採用(語義選択なし) |
| **未判定維持** | discourse 1,377・Semantic 非一意・corpus 不足 = 現状維持 |
| **bible_data 不変** | 代表語起点保持・git diff 空 |
| **chip⇔panel 維持** | 100%(chip/panel は engine.resolve 参照=不変)・破損 0 |
| **回帰 ALL PASS** | engine 8 スイート(re-phase1/2/3/5・re-stageA/B/D/E)+ Builder(re-m8d)= **全 9 ALL PASS** |
| **重複「 2.json」** | 0 |

---

## 5. M-9 への入力契約(Editorial Review へ渡す形式)

Builder は **verse 単位**で以下を出力する(`buildVerse(tokens, context)`・要 `setCorpus(corpusTokens)`)。

### 5-1. verse レベル

| フィールド | 内容 |
|---|---|
| `tokens[]` | 各トークンの集約情報(下記) |
| `readings[]` | 確定 reading 配列(Morph/Syntax 採用反映済) |
| `morphAdoptedCount` | この verse の Morph 採用トークン数 |
| `syntaxAdoptedCount` | この verse の Syntax 採用トークン数 |

### 5-2. token レベル(`tokens[i]`)

| フィールド | 内容 | Editorial Review での用途 |
|---|---|---|
| `reading` | 確定 reading(Data 代表語 + Morph/Syntax 採用) | 評価対象そのもの |
| `morphAdopted` | `{representative, adopted}` または null | Morph 採用の before/after |
| `syntaxAdopted` | `{representative, adopted, reason}` または null | Syntax 採用の before/after・理由 |
| `semanticInfo` | 決定的意味情報 metadata または null | 意味の骨格(reading 非影響・参照のみ) |
| `morph` | `{japanese, source}` | resolve 出力・source 層の確認 |
| `relativeSyntax` / `demonstrativeSyntax` | 構造情報 または null | StudyPanel 構造(reading 非影響) |
| `token` | 原トークン | 参照 |

- **契約の核心**: Editorial Review は **`reading`(評価対象)** と **`morphAdopted`/`syntaxAdopted`(採用の
  before/after と理由)** を受け取り、**verse 単位で Accepted/Revise/Pending を判定**できる。
  **`semanticInfo`/構造情報は reading を変えない参照メタデータ**(M-8e)。
- **bible_data.japanese(代表語)は不変**。Editorial は Builder 確定 reading を評価し、bible_data を
  直接書き換えない(M-5/M-6 の品質保証対象は Builder 確定 reading)。

---

## 6. 完了条件

| 完了条件 | 充足 |
|---|---|
| Builder 最終責務境界の確定 | ✓ 採用可能=Morph 決定語形/決定済み Syntax・採用不可=Semantic 語義選択/Discourse/文脈/翻訳 |
| Adoption 実績の凍結 | ✓ Morph 2,087(総計 15,965)/ Syntax 179 / Semantic 0 |
| 未解決の現状維持 | ✓ discourse 1,377・Semantic 非一意・corpus 不足=Unresolved by Design |
| M-9 入力契約の確定 | ✓ reading/morphAdopted/syntaxAdopted/semanticInfo を verse 単位で Editorial へ |
| L-0/M-8b/M-8d/M-8e 整合 | ✓ 一意性の勾配・推論禁止・bible_data 不変・回帰 ALL PASS |

---

## 7. 最重要判断

- **Builder Adoption の全体像が「一意性の勾配」として確定した**: **Morph(2,087・strong で一意)>
  Syntax(179・pronominal neuter で決定的)> Semantic(0・disambiguation/domain/context)**。
  **Builder は三層すべてで「決定的で一意な fact のみ採用する記録層」として一貫**し、それ未満(discourse・
  語義選択・文脈)は一切採用しない。
- **bible_data.japanese(代表語)は起点として不変**を保ちつつ、Builder 確定 reading が Morph/Syntax の
  決定語形を採用する。これにより **原文(新改訳)を一切変えず**、**ギリシャ語構造(number/pronominal)を
  反映した「読むための日本語」**を verse 単位で Editorial へ渡せる状態が完成した(L-0 の最終目的に接続)。
- **未解決は欠陥ではなく設計**(Unresolved by Design)。Builder に推論を移さないことで、将来層
  (Discourse Layer/語義選択層/3 人称再帰層/副詞的疑問層)の責務を汚染しない。

---

## 凍結

```
[reading-japanese-builder-adoption-integration FROZEN 2026-07-22]
最終責務: Builderは決定的で日本語出力が一意なfactのみ採用する記録層（判定・推論なし）
採用可能: Morph決定語形 / 決定済みSyntax fact（pronominal neuter）
採用不可: Semantic語義選択 / Discourse解釈 / 文脈補完 / 翻訳判断
実績: Morph2,087（純複数人称・morphAdoptedフィールド総計15,965＝全語幹変化）/ Syntax179 / Semantic0。Morph×Syntax同時0（排他）
一意性の勾配: Morph > Syntax > Semantic（下がるほど採用不可）
未解決=現状維持: discourse1,377 / Semantic非一意(reflexive3=251/intensive85/adverbial79/lnGloss) / corpus不足 → Unresolved by Design
M-9契約: buildVerse→{tokens,readings,morphAdoptedCount,syntaxAdoptedCount}。token→{reading, morphAdopted{rep,adopted}, syntaxAdopted{rep,adopted,reason}, semanticInfo(metadata・reading非影響), morph, relative/demonstrativeSyntax, token}
QA: 推論混入0 / 未判定維持 / bible_data不変(diff空) / chip⇔panel100% / 回帰全9 ALL PASS(engine8+re-m8d) / 重複0
不変: bible_data / reading-engine / Morph Registry / Syntax / Semantic / Presentation / UI
```

本 Stage をもって **Builder Adoption 境界(Morph/Syntax/Semantic)を統合凍結**する。以後の変更は
本境界(一意性の勾配・推論禁止・bible_data 不変)を前提とし、reading の拡張は決定的 fact の追加時のみ
行う。M-9 は本契約に従って Editorial Review を展開する。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結(Builder Adoption 統合: Morph2,087/総計15,965・Syntax179・Semantic0・一意性の勾配・M-9 入力契約確定・回帰全9 ALL PASS) |
