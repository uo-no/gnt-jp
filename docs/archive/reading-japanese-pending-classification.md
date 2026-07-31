# Reading Japanese Pending Resolution Classification(Stage M-7a)

策定日: 2026-07-20
位置づけ: M-6 Editorial Pilot(JHN 1)で発生した **Pending を分類**し、どの層(Data / Morph / Syntax /
Semantic / Builder / Corpus)が解決責任を持つかを確定する。**Pending は品質不良ではなく、現在の決定的
情報不足の記録**であり、分類後に**原因層へ返却できる状態**にする。
根拠(FROZEN): reading-japanese-policy.md(L-0)・syntax/semantic-completion(L-3/L-4)・
-editorial-review-framework.md(M-5)・-editorial-pilot-report.md(M-6)。

**本 Stage は分類のみ。コード・bible_data・Builder・Engine は一切変更しない。**
日本語修正・推測補完・Builder 例外追加・翻訳化は禁止。

対象: M-6 Pending 全件(JHN 1・**21 節**・トークン単位 **23 件**)。

---

## 1. 分類結果(集計)

| 分類 | 件数 | 返却先 | 解消可能性 |
|---|---|---|---|
| **Morph Pending** | 9 | Morph(Registry 拡張) | 可 |
| **Syntax Pending** | 13 | Syntax(+ corpus 索引) | 可 |
| **Semantic Pending** | 0 | Semantic | (JHN 1 では該当なし) |
| **Corpus Pending** | 1 | Corpus(注釈)/ case 由来 | 部分 |
| **解消不能 Pending** | **0** | — | — |
| **Builder 保留** | **0** | — | Builder 責務外の Pending は無し |

- **全 23 件が原因層に一意分類**。**解消不能 0・Builder 保留 0**。
- Pending の主因は **Syntax(指示詞 adnominal)13 と Morph(複数人称 number)9**。

---

## 2. Morph Pending(9 件)

| 対象 token | 現 reading | english | 問題内容 | 必要な情報 | 解消可能性 | 推論禁止理由 |
|---|---|---|---|---|---|---|
| ἡμῖν(JHN 1:14) | 私に | us | 1 人称**複数**が「私」(単数扱い) | Morph Registry(number 語形) | 可(Morph 拡張) | number は形態にあるが Registry 外。私→私たち を editorial で当てるのは Morph 判定 |
| ἡμεῖς(1:16) | 私 | we | 同上 | 同上 | 可 | 同上 |
| ἡμᾶς(1:22) | 私を | us | 同上 | 同上 | 可 | 同上 |
| (他 複数人称) | 私/あなた 系 | we/us/you(pl) | number 未反映 | Morph Registry | 可 | 同上 |

- **原因層 = Morph**。ἐγώ/σύ 複数(G2254/G2257/G2248 等)は Morph v1 対象外。**Registry 拡張(number 語形
  私たち/あなたがた)で解消可能**。推論ではなく形態(number)由来の決定的変換。

---

## 3. Syntax Pending(13 件)

| 対象 token | 現 reading | english | 問題内容 | 必要な情報 | 解消可能性 | 推論禁止理由 |
|---|---|---|---|---|---|---|
| οὗτος(JHN 1:2) | この | he | **代名詞用法**(これ/この方)が連体形「この」 | 参照先 class(corpus 索引) | 可(Syntax+corpus) | 連体/代名詞は参照先 class 依存。この→これ を editorial で当てるのは推論 |
| οὗτος(1:7) | この | he | 同上 | 同上 | 可 | 同上 |
| ἐκεῖνος(1:8) | あの | he | 代名詞用法(あの方)が連体形「あの」 | 同上 | 可 | 同上 |
| (他 指示詞) | この/あの | he/this/that | adnominal 未判定 | 参照先 class | 可 | 同上 |

- **原因層 = Syntax**。指示詞の連体/代名詞は L-3c で **未判定**(参照先 class が per-token 決定不可)。
  **corpus 索引(referent→参照先 class)による決定的導出で解消可能**。推論ではなく注釈(referent)+ 索引。

---

## 4. Semantic Pending(0 件)

- JHN 1 では該当なし(person-leveling は本章の ἑαυτοῦ が morph F-桁を持つため決定的、または汎用
  「自分自身」で悪化なし)。
- 一般には **原因層 = Semantic**(person-leveling・LN 非該当・意味分類不足)。person-leveling は subjref が
  空のため決定的信号を欠き、汎用維持が安全(推論で埋めない)。

---

## 5. Corpus Pending(1 件)

| 対象 token | 現 reading | english | 問題内容 | 必要な情報 | 解消可能性 | 推論禁止理由 |
|---|---|---|---|---|---|---|
| ᾧ(JHN 1:47) | 〜する者に | whom | 関係詞の **role 注釈が欠落**(role null) | role 注釈 or case 由来推定 | 部分(case=dative で io/adv を補完可) | role が無い状態で役割を当てるのは推論 |

- **原因層 = Corpus(注釈不足)**。role 注釈が欠落。**case(dative)から部分的に補完できる**が、完全な
  role は注釈依存。推論での役割断定は禁止 → role が得られるまで Pending。

---

## 6. 解消不能 Pending / Builder 保留

| 分類 | 件数 | 確認 |
|---|---|---|
| **解消不能 Pending** | **0** | 決定的情報で導出不能なものは JHN 1 には無い。すべて Morph/Syntax/Corpus で解消可能(or 部分) |
| **Builder 保留** | **0** | Pending はすべて Engine/Corpus 側の情報不足であり、**Builder 責務外**の Pending は存在しない。Builder は例外を追加しない(統合のみ) |

---

## 7. 返却先の確定

| 返却先 | 件数 | 内容 | 解消手段(将来・本 Stage では実装しない) |
|---|---|---|---|
| **Morph** | 9 | 複数人称の number | Morph Registry 拡張(私たち/あなたがた) |
| **Syntax** | 13 | 指示詞の連体/代名詞 | Syntax adnominal 導出(corpus 索引・参照先 class) |
| **Corpus** | 1 | 関係詞 role 注釈欠落 | role 注釈補完 or case 由来推定 |
| **Semantic** | 0 | (JHN 1 なし) | person-leveling は subjref 依存(現状汎用維持) |
| 解消不能 | 0 | — | — |
| Builder | 0 | — | — |

- **全件が Morph / Syntax / Corpus に一意返却**。**Pending = 品質不良ではなく情報不足の記録**であり、
  各層へ差し戻して決定的信号が揃えば解消できる(Syntax 13・Morph 9 は解消可)。

---

## 8. 完了条件の充足

| 完了条件 | 充足 |
|---|---|
| M-6 Pending 全件分類完了 | ✓ 21 節・23 トークンを分類 |
| 原因層が一意に決定 | ✓ Morph9/Syntax13/Corpus1/Semantic0/解消不能0/Builder0 |
| Morph/Syntax/Semantic/Corpus への返却先確定 | ✓(§7) |
| L-0〜M-6 との矛盾なし | ✓(Pending=情報不足・推論禁止・Builder 責務外を維持) |

---

## 9. 推論禁止の一貫性(全 Pending 共通)

- すべての Pending は「**現在の決定的信号が不足**」しており、それを **推測で埋めれば推論=L-0 違反**に
  なる(この→これ・私→私たち・role 断定)。
- したがって Pending は **現状維持**のまま原因層へ返却し、**決定的信号(Registry の number・corpus 索引の
  参照先 class・role 注釈)が提供された時点で解消**する。**editorial で推論的に修正しない**。

```
[reading-japanese-pending-classification 完了 2026-07-20]
対象: M-6 Pending（JHN 1・21節・23トークン）。分類のみ・bible_data不変
分類: Morph9(複数人称number) / Syntax13(指示詞adnominal) / Semantic0 / Corpus1(関係詞role欠落) / 解消不能0 / Builder0
返却先確定: Morph=Registry拡張 / Syntax=corpus索引adnominal導出 / Corpus=role注釈 or case由来
全件原因層一意・解消不能0・Builder保留0。Pending=情報不足の記録・推論で埋めない・決定的信号提供時に解消
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版(M-6 Pending 分類・Morph9/Syntax13/Corpus1・返却先確定・解消不能0・Builder0・推論禁止一貫) |
