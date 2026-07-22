# Reading Japanese Improvement Framework(Stage M-1)

策定日: 2026-07-20
位置づけ: **bible_data.japanese を最終成果物として改善するためのフレームワーク**。エンジン設計ではなく、
**各章節の Reading Japanese をどの原則・順序・品質基準で改善するか**を定義する。
根拠(すべて FROZEN): reading-japanese-policy.md(L-0)・-baseline.md(L-1)・-builder-design.md(L-2a)・
syntax-completion-*(L-3)・semantic-completion-*(L-4)・morph-rule-engine-v1-frozen.md(J-9)。

**本文書は設計・方針のみ。コード・bible_data・Builder・Reading Japanese・Morph・Syntax・Semantic の
実装/変更、擬似コード・JSON・TypeScript は一切含まない。**

前提: 各層の決定的情報は resolve 結果に付帯済(Morph 語形 / relativeSyntax・demonstrativeSyntax / semanticInfo)。
本 Framework はこれらを用いた**改善の憲章**であり、Builder(未実装)と人間レビューの共通基準となる。

---

## 1. 最終成果物(Reading Japanese の完成条件)

**評価単位 = verse(章節)**(L-0 §8)。各章節の japanese が、その章節のギリシャ語データに対して
以下をすべて満たすとき「完成」とする。

| 条件 | 定義 |
|---|---|
| **読解可能性** | 章節として意味が取れる(破綻・意味不明がない) |
| **構造忠実性** | ギリシャ語の形態・構造(性数・関係詞役割・先行詞・deixis 等)が隠れず反映されている |
| **章節内一貫性** | 同一章節で同語・同構造の扱いが矛盾しない |
| **語の接続** | 隣接語が日本語として接続する(助詞・活用が破綻しない) |
| **非誤解** | ギリシャ語と異なる意味に読める表現がない |
| **非破損** | 二重助詞・不正活用・意味不明形がない |

- **「自然な日本語」は完成条件ではない**(L-0)。完成 = 上記 6 条件を章節単位で満たすこと。

---

## 2. 改善対象

| 対象 | 内容(利用する決定的情報) |
|---|---|
| **Morph の反映** | gender/number/case/person/mood の語形(彼ら/それ/者/もの/私自身 等・Morph v1) |
| **Syntax の反映** | 関係詞 role/先行詞リンク・指示詞 role/参照・連体代名詞(確定分)(relativeSyntax/demonstrativeSyntax) |
| **Semantic の反映** | LN 語義・intensive/reflexive person/interrogative/indefinite/deixis/adverbial(semanticInfo) |
| **語の接続** | 章節内で隣接語が接続するよう統合(Builder) |
| **章節内一貫性** | 同語・同構造の一貫扱い(Builder) |
| **非破損** | 破損形・二重助詞の排除(Builder) |

- 改善は **各層の決定的情報を章節へ反映し、統合品質(接続・一貫・非破損)を満たす**方向のみ。

---

## 3. 改善対象外(明確な除外)

| 除外 | 理由 |
|---|---|
| **翻訳への書き換え** | Reading Japanese は翻訳ではない(L-0) |
| **日本語自然化だけを目的とした修正** | 自然さは完成条件でない。自然化のための改変はしない |
| **ギリシャ語構造の隠蔽** | 構造を消す自然化は禁止(隠蔽=悪化) |
| **意味推論** | 既存注釈にない意味を作らない(L-0 禁止) |
| **神学判断** | 対象外 |
| **StudyPanel 用表示** | 別責務(K-5)・研究補助は本成果物でない |
| **Presentation の都合による変更** | 表示整形は語・語順・確定値を変えない(L-0) |

---

## 4. 改善順序(適用順序と各段階の目的・責務)

各章節の Reading Japanese を改善する際の順序。**下位層(Data→Morph→Syntax→Semantic)の反映を積み上げ、
Builder が章節として統合し、品質確認で締める**。

| 段階 | 目的 | 責務 |
|---|---|---|
| **1. Data の確認** | 起点の代表語が安定・非破損・非誤データであることを確認 | Data(H-3b)。placeholder・重複・誤データ 0 の確認(L-1) |
| **2. Morph の反映** | 形態から読む語形を反映(彼ら/それ/者/もの 等) | Morph v1。gender/number/case/person/mood。決定的 |
| **3. Syntax の反映** | 節内役割・先行詞リンク・deixis の構造を反映 | Syntax Completion(relativeSyntax/demonstrativeSyntax)。**推論せず読む** |
| **4. Semantic の反映** | LN 語義・intensive/person/interrogative/indefinite の意味を反映 | Semantic Completion(semanticInfo)。**推論せず読む・未判定は既定** |
| **5. 章節統合** | 上記反映を章節として組み立て、語接続・一貫性を成立させ確定 | Reading Japanese Builder(L-2a)。翻訳・自然化・語順再構成をしない |
| **6. 品質確認** | 完成条件(§1)を章節単位で検証 | QA(§6)。非破損・構造忠実・一貫・非誤解を確認 |

- 各段階は **決定的情報の反映**であり、上位(Builder)が統合する。**推論・翻訳・自然化は全段階で禁止**。
- 未判定(Syntax の連体代名詞・Semantic の person-leveling 等)は **安全既定**で扱い、推論で埋めない。

---

## 5. 品質判定(改善と悪化)

`before / after` の章節を比較して判定する(L-0 §7 準拠)。

### 改善(いずれか、かつ悪化がない)

| 改善 | 内容 |
|---|---|
| 構造忠実性の向上 | 性数・関係詞役割・先行詞・deixis 等が正しく反映された |
| 誤解の減少 | ギリシャ語と異なる読みが解消された(例: 中性を「彼」→「それ」) |
| Morph / Syntax / Semantic の反映 | 各層の決定的情報が章節に反映された |
| 章節内一貫性の向上 | 同語・同構造の扱いが一貫した |

### 悪化(いずれか該当で不採用)

| 悪化 | 内容 |
|---|---|
| ギリシャ語構造を隠す | 自然化のために構造を消した/溶かした |
| 推論の追加 | 既存注釈にない意味・先行詞・語義を足した |
| 翻訳化 | 語順再構成・意訳で自然文にした |
| 破損 | 二重助詞・不正活用・意味不明形が生じた |
| 一貫性低下 | 章節内で扱いが矛盾した |

- **「自然になった」は改善の根拠にしない**。自然化が構造を隠す/推論を足すなら**悪化**。
- 判定は **章節単位**(verse)。局所(token)の正しさは必要条件。

---

## 6. QA 方針

| 手段 | 内容 |
|---|---|
| **Verse レビュー** | 章節単位で完成条件(§1)を人間レビュー(読解可能・一貫・接続・非誤解)。自然さは基準にしない |
| **NT 全巻監査** | NT 全巻(137,741・7,939 章節)・実 FS・**重複「 2.json」不在の確認**(H-5/H-6 教訓) |
| **回帰確認** | Morph(morph 44,251)・Syntax(K-3/K-4/L-3c)・Semantic(L-4c)・既存 8 スイート ALL PASS |
| **before / after 差分** | 章節の japanese 変更が意図した範囲のみであること・改善/中立/悪化を分類 |
| **悪化 0** | §5 の悪化がいずれも 0(構造隠蔽・推論・翻訳化・破損・一貫性低下) |
| **Reading Japanese Policy 準拠** | L-0 の全基準に照らす(意味推論禁止・既存注釈のみ・章節評価) |

- QA は **自動(回帰・差分・破損・重複検出)+ 章節人間レビュー(構造理解・一貫)** の二段。

---

## 7. FROZEN 条件

Framework を凍結できる条件:

- §1(最終成果物)〜§6(QA)が確定している。
- L-0(Policy)・L-1(Baseline)・L-2a(Builder)・L-3/L-4(Syntax/Semantic Completion)と整合している。
- 改善が **各層の決定的情報の反映と章節統合**に限定され、**翻訳・自然化・意味推論・構造隠蔽を含まない**。
- 評価単位が **verse(章節)**で、改善/悪化の判定基準(§5)が定義されている。
- **「自然な日本語」を改善の根拠にしない**ことが明記されている。
- 本 Framework が今後の Reading Japanese 改善(Builder 実装・章節改善)の**唯一の改善憲章**となる。

---

## 責務凍結(候補)

```
[reading-japanese-improvement-framework FROZEN候補 2026-07-20]
最終成果物: 各章節のjapaneseが読解可能/構造忠実/章節一貫/語接続/非誤解/非破損（評価単位=verse）。自然さは完成条件でない
改善対象: Morph反映 + Syntax反映 + Semantic反映 + 語接続 + 章節一貫性 + 非破損（各層の決定的情報）
改善対象外: 翻訳書換/自然化のみ/構造隠蔽/意味推論/神学/StudyPanel表示/Presentation都合
改善順序: 1 Data確認 → 2 Morph反映 → 3 Syntax反映 → 4 Semantic反映 → 5 章節統合(Builder) → 6 品質確認
品質判定: 改善=構造忠実向上/誤解減/各層反映/一貫向上。悪化=構造隠蔽/推論追加/翻訳化/破損/一貫低下。自然化を改善根拠にしない
QA: Verseレビュー + NT全巻(重複検出) + 回帰ALL PASS + before/after差分 + 悪化0 + Policy準拠
```

本 Framework は凍結可能な状態である。承認により FROZEN 化し、以後の Reading Japanese 改善は本 Framework に
照らして行う。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結候補(最終成果物=verse 完成条件・改善対象/対象外・改善順序 6 段階・品質判定・QA・FROZEN 条件) |
