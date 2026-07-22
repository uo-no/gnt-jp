# Discourse Boundary Classification(Stage M-7f)

策定日: 2026-07-20
位置づけ: M-7e で **Syntax 責務外(Unresolved by Design)1,377 件**と確定した指示詞について、**将来どの層が
扱うべき情報か**を分類する。分類・境界設計のみ。
根拠(FROZEN): reading-japanese-policy.md(L-0)・syntax-gap-resolution-design.md(M-7d)・
syntax-gap-boundary-freeze.md(M-7e)・semantic-completion-design.md(L-4a)。

**本 Stage は分類・境界設計のみ。コード・bible_data・Builder・Engine・Semantic の実装/変更、日本語変更、
推論による判定、擬似コード・JSON・TypeScript は一切含まない。**

対象: οὗτος / ἐκεῖνος / τοιοῦτος・**1,377 件**(Unresolved by Design)。

---

## 0. 実測(1,377 のサブグループ・gender 別)

| サブグループ | neuter | masc/fem | 計 | 性質 |
|---|---|---|---|---|
| **名詞参照非隣接**(referent 有・名詞) | 93 | 423 | **516** | 先行名詞への anaphora(この人/この方)or 非隣接連体 |
| **referent 不在 / 非名詞参照** | 314 | 362 | **676** | neuter 314=命題参照(これら)・referent 注釈なし |
| **referent 解決不可** | 130 | 55 | **185** | 先行詞が verseId 索引に不在 |
| **合計** | 537 | 840 | **1,377** | — |

---

## 1. 分類基準

| 基準 | 判定 |
|---|---|
| 決定的情報で処理可能か | 可 → Syntax(既に 310 解決済・本対象外)。不可 → 下記へ |
| **文脈依存か** | anaphora/deixis/既出性に依存 → **Discourse Layer** |
| **日本語表現判断か** | この/これ/その/それ の表現選択が人間判断 → **Editorial**(現状維持) |
| L-0 推論禁止と矛盾しないか | 推論で埋めない。決定的信号・注釈が来るまで **未判定を保持** |

---

## 2. 返却先分類

| サブグループ | 件数 | 主返却先 | 理由 |
|---|---|---|---|
| 名詞参照非隣接(referent 有) | **516** | **Discourse Layer(future)** | referent(先行名詞)+ 距離 + 既出性を **discourse が追跡**すれば anaphora(この人/この方)/ 連体を決定的に導ける。**現在は discourse 層が無い**ため未判定 |
| referent 不在 / 非名詞 | **676** | **Discourse Layer(future・discourse annotation 要)** | referent 注釈が無い。**discourse annotation(照応・談話構造)を付与**すれば discourse 層が解決可能。annotation が来るまでは Editorial が現状維持 |
| referent 解決不可 | **185** | **解決対象外** | 先行詞が索引に不在。**いかなる層でも決定的に解決不能** → 現状維持(この/あの)を恒久保持 |
| (Semantic) | **0** | **非該当** | deixis(近/遠)は lemma で既決(οὗτος=近/ἐκεῖνος=遠・Data)。この/これ の区別は **discourse であって Semantic ではない** → **Semantic に送らない(責務肥大化防止)** |

- **Discourse Layer(future)= 1,192**(516 + 676)/ **解決対象外 = 185**/ **Semantic = 0**。

---

## 3. 各返却先の責務

### Discourse Layer(future・将来の拡張ポイント)

- **将来層**。referent 連鎖・談話距離・既出性を追跡し、**この/これ/その/それ の選択と anaphora
  (この人/この方)を決定的に導く**。
- **必要**: referent(既存)+ 距離 + **discourse annotation**(照応・談話構造)。それらが揃えば
  **決定的**に解決可能(推論ではなく談話構造の読み取り)。
- **これがプロジェクトの主要な将来拡張ポイント**。Discourse Layer が整備されるまで 1,192 件は未判定。

### 解決対象外(185)

- 先行詞が索引に不在(cross-doc・注釈欠落)。**いかなる決定的手段でも解決不能**。
- **恒久的に現状維持**(この/あの)。品質不足ではなく、L-0 推論禁止下の到達点。

### Editorial(interim)

- Discourse Layer / annotation が整備されるまでの **暫定保持者**。1,377 件の **現状読み(この/あの)を安全
  既定として維持**(Accepted-with-current)。**Editorial は解決層ではなく、現状維持と記録に閉じる**。
- **推論での修正は禁止**(この人/これ を文脈推測で当てない・L-0)。

### Semantic(非該当・0)

- **deixis(近/遠)は lemma で既決**。この/これ の区別は **discourse** の問題であり Semantic の語義選択では
  ない。**Semantic に送らない**ことで **Semantic 責務肥大化を防ぐ**(完了条件)。

---

## 4. Builder 境界(推論責任を移さない)

- Builder は **Discourse Layer が決定した facts**(将来)を読むだけ。**現在は 1,377 全件を現状維持**。
- **禁止**: 「referent が名詞だから この」「近そうだから これ」「自然だから変更」等の推論(L-0)。
- **Builder に推論責任を移さない**。決定は Discourse Layer(future)/ 現状維持は Editorial。

---

## 5. Reading Japanese 影響範囲

| 区分 | 件数 | 扱い |
|---|---|---|
| Discourse Layer で将来解決 | 1,192 | discourse 層 + annotation 整備後に決定的解決(その時 FROZEN プロトコル) |
| 解決対象外(恒久現状維持) | 185 | この/あの のまま |
| **現時点** | **1,377 全件** | **現状維持**(本 Stage は分類のみ・reading 不変) |

---

## 6. QA 方針(設計段階の確認)

| 確認項目 | 結果 |
|---|---|
| **Syntax 責務外の返却先が明確** | Discourse Layer 1,192 / 解決対象外 185 / Semantic 0 |
| **Builder に推論責任を移さない** | Builder は現状維持・判定は Discourse Layer(future)（§4） |
| **Semantic 責務肥大化を防ぐ** | deixis=lemma・discourse≠Semantic → **Semantic に送らない(0)** |
| **将来拡張ポイントが明確** | **Discourse Layer(future)= 1,192** が主拡張点(referent+距離+discourse annotation) |
| **L-0〜M-7e と矛盾しない** | 推論禁止・未判定保持・Unresolved by Design と一致 |

---

## 7. 完了条件

| 完了条件 | 充足 |
|---|---|
| Syntax 責務外の返却先が明確になる | ✓ Discourse Layer 1,192 / 解決対象外 185 / Semantic 0 |
| Builder に推論責任を移さない | ✓（§4・現状維持） |
| Semantic 責務肥大化を防ぐ | ✓（Semantic 0・deixis=lemma・discourse≠Semantic） |
| 将来拡張ポイントが明確になる | ✓（Discourse Layer future = 1,192） |
| L-0〜M-7e と矛盾しない | ✓（推論禁止・未判定保持） |

---

## 8. 最重要判断

- **指示詞の未判定 1,377 は「実装不足」ではなく「discourse 依存」**。number 不足(Morph Gap)のように
  Engine 拡張で埋まるものではなく、**談話構造(anaphora/deixis/既出性)を扱う将来の Discourse Layer**が
  責任を持つ。
- **Semantic に送らない**ことで Semantic の責務肥大化を防ぐ(deixis は lemma・この/これ は discourse)。
- **185 件は恒久的に解決対象外**(先行詞不在)であり、現状維持が L-0 下の正式な到達点。
- Discourse Layer は **本プロジェクトの主要な将来拡張ポイント**として位置づけられる。

---

## 凍結(候補)

```
[discourse-boundary-classification FROZEN候補 2026-07-20]
対象: Unresolved by Design 1,377（M-7e）
返却先: Discourse Layer(future) 1,192（名詞参照非隣接516 + referent不在/非名詞676）/ 解決対象外 185（referent解決不可）/ Semantic 0（非該当）
Discourse Layer(future): referent連鎖+距離+discourse annotation で この/これ/その/それ・anaphora を決定的解決。主要な将来拡張ポイント
Semantic非該当: deixis=lemma既決・この/これ=discourse≠Semantic → 送らない（責務肥大化防止）
Editorial(interim): Discourse Layer整備まで現状読み（この/あの）を安全既定で保持・推論禁止
Builder境界: 現状維持・判定はDiscourse Layer(future)・推論責任を移さない
解決対象外185: 先行詞不在で恒久現状維持（欠陥でなくL-0推論禁止下の到達点）
```

本分類は凍結可能な状態である。承認により FROZEN 化し、Discourse Layer(future)が主要な将来拡張ポイントと
して確定する。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結候補(1,377 分類: Discourse Layer 1,192 / 解決対象外 185 / Semantic 0・deixis=lemma で Semantic 非該当・Discourse Layer=将来拡張点) |
