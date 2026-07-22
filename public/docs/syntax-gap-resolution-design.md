# Syntax Gap Resolution Design(Stage M-7d)

策定日: 2026-07-20
位置づけ: M-7a で **Syntax Pending** と分類された指示詞用法(連体/代名詞)を解消するための **Syntax 層の
拡張設計**。Builder が推論せず利用できる決定的 Syntax 情報を提供する。
根拠(FROZEN): reading-japanese-policy.md(L-0)・syntax-completion-*(L-3)・
-editorial-pilot-report.md(M-6)・reading-japanese-pending-classification.md(M-7a)・
morph-gap-resolution-implementation-report.md(M-7c)。

**本 Stage は設計のみ。コード・corpus・bible_data の実装/変更、日本語修正、擬似コード・JSON・
TypeScript は一切含まない。** Builder 例外追加・Semantic 変更・文脈推測・神学判断は禁止。

---

## 0. 実測(設計の前提・決定的導出可能性)

指示詞 1,687 について referent を verseId 索引で解決し、参照先 class・隣接・一致で連体/代名詞を分類:

| 分類 | 件数 | 判定根拠 |
|---|---|---|
| **代名詞的(pronominal)** | **304** | 参照先 class = **verb**(命題/動作参照=「これ/この事」)→ 決定的 |
| **連体(adnominal)** | **6** | 隣接(距離≤2)かつ gender/number/case **一致**の名詞 → 決定的 |
| **未判定** | **609** | 名詞参照だが非隣接/非一致・その他(曖昧) |
| referent 無 | 583 | 参照先注釈なし |
| 解決不可 | 185 | verseId 索引に先行詞なし |

- **決定的導出可能: 310 件(18.4%)**(pronominal 304 + adnominal 6)。**未判定・不足: 1,377 件(81.6%)**。
- **重要**: 連体/代名詞は **大半が決定的に導出できない**。M-7a JHN 1 Pending(οὗτος「この」= λόγος
  名詞参照)も **未判定側**に残る(名詞参照の代名詞的用法は referent だけでは断定不能)。

---

## 1. 対象 lemma 一覧

- **οὗτος(near・多 strong)/ ἐκεῖνος(G1565)/ τοιοῦτος(G5108)**(class=pron)。
- M-7a Syntax Pending 13 件(JHN 1)を含む NT 全指示詞 1,687。

---

## 2. 現在取得可能な情報(L-3c）

`getDemonstrativeSyntax(token)` が返す:

| 情報 | 状態 |
|---|---|
| lemma | 取得可 |
| role(節内役割) | 取得可(注釈) |
| referent(参照先 ID) | 取得可(1,104・解決 919) |
| **adnominal** | **null(未判定)** — per-token では参照先 class を読めないため |

---

## 3. 不足情報

- **連体(adnominal)/ 代名詞(pronominal)の区別**。現在は全件 null(未判定)。
- 区別が定まれば、代名詞用法 → これ/この方/この事、連体用法 → この+名詞(現状維持)を Builder が
  判断できる(reading は Builder が決定・Syntax は事実提供のみ)。

---

## 4. 決定的導出方法(corpus 索引・推論なし)

**verseId 索引(referent→参照先トークン)を用いた決定的導出**。per-token では不可のため、corpus を持つ
Syntax コンポーネントが行う(L-3c の「consumer 側決定的 lookup」の Syntax 実装)。

| 導出 | 条件(決定的) | 結果 | 件数 |
|---|---|---|---|
| **pronominal** | 参照先 class = **verb**(命題/動作を指す) | 代名詞的(これ/この事) | 304 |
| **adnominal** | **隣接(距離≤2)かつ gender/number/case 一致の名詞**を修飾 | 連体(この+名詞) | 6 |
| **未判定** | 上記いずれにも該当しない | null(現状維持) | 1,377 |

- いずれも **注釈(referent)+ 索引参照 + 形態一致**の決定的判定であり、**意味推論・文脈推測をしない**。
- **導出可能は 18.4%(310)に限定**。**大半(81.6%)は決定的に導出できず未判定**。

---

## 5. 未判定 fallback 条件(無理に埋めない)

以下は **未判定(adnominal=null・現状維持)** とし、推論で埋めない:

| 未判定条件 | 件数 | 理由 |
|---|---|---|
| 名詞参照だが非隣接/非一致 | 609 | 連体か代名詞的(anaphoric)か referent だけでは断定不能 |
| referent 無 | 583 | 参照先注釈なし |
| 解決不可 | 185 | verseId 索引に先行詞なし |

- これらは **discourse/文脈依存**(この/その/あの の距離・照応)であり、**決定的信号を欠く**。
  Semantic/richer 注釈の領域として保留(Syntax では埋めない・L-0 推論禁止)。

---

## 6. Reading Japanese への影響

- **決定的 pronominal(verb 参照)304**: Builder が「これ/この事」等の代名詞的読みを選べる情報を提供
  (reading の決定は Builder・本 Stage では reading を変えない)。
- **決定的 adnominal 6**: 連体「この+名詞」を確認(現状維持で正)。
- **未判定 1,377**: 現状維持(この/あの)。**M-7a Syntax Pending の多く(JHN 1 οὗτος 名詞参照)は未判定に
  残る** → Syntax 単独では解消しない(discourse/Semantic へ)。
- 影響は **Syntax facts(pronominal/adnominal/未判定)の提供**であり、reading 自体は Builder が採用時に
  変える(その時 FROZEN プロトコル)。本設計 Stage では reading 不変。

---

## 7. QA 方法

| 項目 | 確認 |
|---|---|
| **bible_data 不変** | 注釈・索引の読み取りのみ |
| **Syntax 情報のみ対象** | demonstrativeSyntax の adnominal 導出に限定・Morph/Semantic/Builder 不変 |
| **推論混入 0** | referent + class + 形態一致の決定的判定のみ・文脈推測なし |
| **未判定を無理に埋めない** | 1,377 は未判定(現状維持)・pronominal/adnominal は決定的 310 のみ |
| **決定的導出率の実測** | pronominal 304 / adnominal 6 / 未判定 1,377(18.4% 導出可) |
| **L-0〜M-7c 整合** | Syntax 責務(構造)・推論禁止・未判定 fallback と一致 |

---

## 責務境界

| Syntax が決める | Syntax が決めない |
|---|---|
| role / referent / 修飾関係 / **連体・代名詞構造(決定的分のみ)** | 日本語訳 / 神学判断 / 文脈推論 / 自然な表現選択 |

- **Builder は Syntax facts(pronominal/adnominal/未判定)を読むだけ**。判定・推論をしない。
- **adnominal 判定責任境界**: **決定的(verb 参照=pronominal・隣接一致名詞=adnominal)は Syntax が導出。
  曖昧(名詞参照非隣接・discourse)は Syntax では判定せず未判定**(Semantic/richer 注釈へ)。

---

## 完了条件の充足

| 完了条件 | 充足 |
|---|---|
| Syntax Pending 解消に必要な拡張範囲確定 | ✓ 決定的導出 310(pronominal 304 + adnominal 6)・未判定 1,377 を確定 |
| adnominal 判定責任境界確定 | ✓ 決定的=Syntax / 曖昧=未判定(Semantic/注釈)（§責務境界） |
| 実装可能な設計になること | ✓ verseId 索引 + 参照先 class + 形態一致の決定的判定(推論なし) |

> **重要な設計結論**: Syntax Gap Resolution は指示詞の連体/代名詞を **18.4% しか決定的に解消できない**
> (主に verb 参照 pronominal 304)。**残 81.6% は決定的信号を欠き未判定**であり、Morph Gap(2,087 件を
> 完全解消)と異なり、指示詞 adnominal は Syntax 単独では大半が解消しない。M-7a Syntax Pending の多くは
> **未判定のまま discourse/Semantic 領域へ**送られる(推論で埋めない)。

```
[syntax-gap-resolution-design 完了 2026-07-20]
対象: οὗτος/ἐκεῖνος/τοιοῦτος の連体/代名詞（adnominal 未判定 1,687）
決定的導出（verseId索引・推論なし）: pronominal=参照先verb(304) / adnominal=隣接一致名詞(6) = 310（18.4%）
未判定fallback: 名詞参照非隣接609 / referent無583 / 解決不可185 = 1,377（81.6%・現状維持・埋めない）
責務境界: 決定的=Syntax導出 / 曖昧=未判定（Semantic・richer注釈）。Builderは読むだけ
結論: Morph Gap（完全解消）と異なり指示詞adnominalはSyntax単独で大半解消せず。M-7a Pendingの多くは未判定継続
QA: bible_data不変・Syntax情報のみ・推論混入0・未判定を埋めない・L-0〜M-7c整合
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版(指示詞 adnominal 決定的導出 18.4%・pronominal(verb 参照)304・未判定 1,377・責務境界・Syntax 単独では大半解消せずを明記) |
