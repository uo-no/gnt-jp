# Syntax Gap Boundary Freeze(Stage M-7e)

策定日: 2026-07-20
位置づけ: M-7d Syntax Gap Resolution Design の実測結果を受け、**Syntax が責任を持つ範囲と、Syntax では
解決不能な範囲を正式に凍結**する。実装ではなく **責務境界の確定のみ**を行う。
根拠(FROZEN): reading-japanese-policy.md(L-0)・syntax-completion-*(L-3)・
-editorial-pilot-report.md(M-6)・reading-japanese-pending-classification.md(M-7a)・
morph-gap-resolution-implementation-report.md(M-7c)・syntax-gap-resolution-design.md(M-7d)。

**本 Stage は責務境界の確定のみ。bible_data / reading-engine.js / Morph Registry / Syntax 実装 /
Semantic 実装 / Builder / UI の変更、擬似コード・JSON・TypeScript は一切含まない。**

> **本 Stage の核心**: Syntax の未解決を「**未完成**」と扱わず、「**Syntax の責務外として凍結**」する。
> Morph Gap のような **Engine 拡張で解消可能な欠損**と、**Syntax では決定不能な情報不足**を明確に分離する。

### M-7d 実測(前提)

- 対象: οὗτος / ἐκεῖνος / τοιοῦτος・総数 **1,687**。
- **決定的導出可能: 310**(verb referent → pronominal 304 / 隣接一致名詞 → adnominal 6)。
- **未判定: 1,377**(名詞参照非隣接 / referent 不在 / referent 解決不可 / discourse 依存)。

---

## 1. Syntax 完了範囲

Syntax が提供する最終情報(**これ以上拡張しない**):

| 提供 | 内容 | 決定性 |
|---|---|---|
| **role** | 節内役割(s/o/io/adv/p/o2) | 注釈由来・決定的 |
| **referent** | 参照先トークン ID(verseId) | 注釈由来・決定的 |
| **pronominal / adnominal** | 連体/代名詞の区別 | **決定的導出可能なもののみ**(verb 参照=pronominal 304 / 隣接一致名詞=adnominal 6) |

- **pronominal/adnominal は決定的導出可能な 310 件のみ**を Syntax が提供する。
- **310 件は Syntax 解決済み**として扱う(pronominal 304・adnominal 6)。
- **Syntax 完成範囲はここまで**。決定的信号のない部分へは踏み込まない。

---

## 2. Syntax 非責任範囲(明文化)

以下は **Syntax が決定しない**(1,377 件):

| 対象 | 件数 | 理由 |
|---|---|---|
| 名詞参照非隣接 | 609 | 連体か代名詞的(anaphoric)か referent だけで断定不能 |
| referent 不在 | 583 | 参照先注釈なし |
| referent 解決不可 | 185 | verseId 索引に先行詞なし |
| **合計** | **1,377** | discourse 指示・文脈参照・名詞参照時の代名詞判断・遠近関係・「この/これ/その/それ」選択 |

- これらは **discourse 指示・文脈参照・名詞参照時の代名詞判断・遠近関係・日本語「この/これ/その/それ」
  選択**であり、**Semantic / discourse annotation / Editorial policy の領域**。**Syntax の責務外**。
- **Syntax はこれらを未判定のまま返す**(推論で埋めない・L-0 準拠)。

---

## 3. Builder 境界

Builder は **Syntax fact を読むだけ**。

| 許可 | 禁止 |
|---|---|
| adnominal=true / pronominal=true 等 **決定済み情報の利用** | 「referent が名詞だから この」 |
| — | 「文脈的に近そうだから これ」 |
| — | 「日本語として自然だから変更」 |

- **Builder に推論責任を移さない**。決定的でない指示詞は **Syntax が未判定を返し、Builder は現状維持**。
  Builder が名詞参照・文脈・自然さを根拠に判定することは **禁止**(L-0 推論禁止)。

---

## 4. Pending 再分類

M-7a / M-6 の **Syntax Pending** を次の 2 区分へ整理する。

| 変更前 | 変更後 | 件数 | 定義 |
|---|---|---|---|
| Syntax Pending | **Deterministically Resolved** | 310 | 決定的導出可能(pronominal 304 / adnominal 6)= Syntax 解決済み |
| Syntax Pending | **Unresolved by Design** | 1,377 | 決定的信号を欠き Syntax では判定不能。**L-0 推論禁止を守った結果** |

- **「Unresolved by Design」は品質不足ではなく、L-0 推論禁止を守った正式な完了状態**である。
- 従来「Syntax Pending」と一括していたものを、**解消済み(310)と設計上未解決(1,377)に分離**して凍結する。

---

## 5. Reading Japanese 影響範囲

| 区分 | 件数 | 扱い |
|---|---|---|
| 変更可能(Syntax 解決済み) | 310 | pronominal(これ/この事)・adnominal(この+名詞)を Builder が採用可能(採用時 FROZEN プロトコル) |
| **現状維持(Unresolved by Design)** | **1,377** | この/あの のまま。**情報不足を推論で補わない** |

- 本境界凍結 Stage では reading を変えない(責務境界の確定のみ)。

---

## 6. QA 方針(設計段階の確認)

| 確認項目 | 結果 |
|---|---|
| **L-0 と矛盾しない** | 推論禁止・未判定 fallback・章節評価と一致 |
| **Syntax 責務肥大化がない** | 決定的 310 に限定・discourse へ拡張しない |
| **Builder に推論責任を移さない** | Builder は決定済み facts のみ利用・判定禁止(§3) |
| **Semantic との境界が明確** | 1,377(discourse/名詞参照代名詞/遠近)は Semantic/discourse annotation/Editorial の領域 |
| **M-7c Morph Gap Resolution と混同しない** | Morph=決定的信号(number)不足=Engine 拡張で完全解消(2,087)。Syntax=discourse 依存=単独で決定不能。**性質が異なることを明記** |

---

## 7. 完了条件

| 完了条件 | 充足 |
|---|---|
| Syntax が提供する情報範囲が確定する | ✓ role/referent/pronominal・adnominal(決定的 310 のみ) |
| Syntax が扱わない範囲が明文化される | ✓ 1,377(discourse/文脈/名詞参照代名詞/遠近/この・これ選択) |
| 1,377 件の未判定理由が説明可能になる | ✓ 名詞参照非隣接 609 / referent 不在 583 / 解決不可 185 |
| Builder の推論禁止境界が確定する | ✓ 決定済み facts のみ・判定禁止(§3) |
| M-7d の実測結果と矛盾しない | ✓ 310 / 1,377 と一致 |
| コード・データ変更なし | ✓ 設計のみ |

---

## 8. 最重要判断(Morph Gap との対比・凍結の根拠)

- **Morph Gap**(M-7c): number という **決定的信号の不足**だったため、Engine 拡張(Registry +7 strong)で
  **2,087 件を完全解消**できた。
- **Syntax Gap**(指示詞): 大部分が **discourse / context 依存**であり、**Syntax 単独では決定不能**。
  Engine 拡張では解消できない(決定的信号が存在しない)。
- したがって **Syntax の不足を実装不足として無限に拡張しない**。**決定的に導ける構造情報(310)だけを
  Syntax の完成範囲**として確定し、**残 1,377 は「Unresolved by Design」として凍結**する。
- **未判定を残すことは欠陥ではなく、L-0「推論禁止」を守るための正式な完了状態**である。

---

## 凍結(候補)

```
[syntax-gap-boundary-freeze FROZEN候補 2026-07-20]
Syntax完了範囲: role / referent / pronominal・adnominal（決定的310のみ: verb参照pronominal304 + 隣接一致名詞adnominal6）
Syntax非責任範囲: 1,377（名詞参照非隣接609 / referent不在583 / 解決不可185）= discourse/文脈/名詞参照代名詞/遠近/この・これ選択 → Semantic/discourse annotation/Editorial
Builder境界: 決定済みfacts（adnominal/pronominal）を読むだけ。名詞参照・文脈・自然さでの判定は禁止
Pending再分類: Syntax Pending → Deterministically Resolved(310) / Unresolved by Design(1,377)。後者は品質不足でなくL-0推論禁止順守の正式完了状態
RJ影響: 変更可能310 / 現状維持1,377（推論で補わない）
対比: Morph Gap=決定的信号(number)不足→Engine拡張で完全解消(2,087)。Syntax=discourse依存→単独で決定不能。無限拡張しない
QA: L-0整合・Syntax責務肥大化なし・Builderに推論移さない・Semantic境界明確・Morph Gapと混同しない
```

本境界は凍結可能な状態である。承認により FROZEN 化し、以後 Syntax の責務範囲は本境界に照らして扱う
(1,377 の「Unresolved by Design」は Syntax の完了状態として恒久的に扱い、解消は Semantic/discourse/
Editorial の領域とする)。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結候補(Syntax 完了範囲=決定的 310 / 非責任範囲=1,377「Unresolved by Design」・Builder 推論禁止境界・Morph Gap との性質差の明記) |
