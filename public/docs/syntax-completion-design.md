# Syntax Completion 責務設計(Stage L-3a)

策定日: 2026-07-20
位置づけ: **Reading Japanese Builder の入力として必要な Syntax 基盤の完成責務**を定義する設計。
目的は **「Reading Japanese に必要十分な Syntax」** であり、ギリシャ語統語論の完全実装ではない。
根拠: relative-syntax-*(K-3/K-4/K-5)・reading-japanese-policy.md(L-0)・-baseline.md(L-1)・
-builder-design.md(L-2a)。

**本文書は責務設計のみ。コード・bible_data・Engine・Morph・Syntax・Semantic の実装/変更、
Reading Japanese 改善、Builder 実装、擬似コード・JSON・TypeScript は一切含まない。**

---

## 0. 前提と方針

- Reading Japanese Builder(L-2a)は **推論せず・Syntax 判定を持たず・構造情報をそのまま利用**する
  統合層。したがって Syntax は、Builder が読み取るだけで済む **構造情報を確定的に保証**する必要がある。
- Syntax は **既存注釈(Macula: role / referent)を読み取り、決定的に導出**して提供する
  (parse・意味推論はしない。K-1 の原則)。
- 実測(全巻): 関係詞 role/referent(referent 1,071)・指示詞 role/referent(referent 1,104)は**注釈済**。
  frame(節フレーム)は空 → 節境界は role/位置から**決定的に導出**する範囲に限る。

---

## 1. Syntax Completion の完了条件

Builder が利用する構造情報として、Syntax が最終的に保証する内容:

| 保証内容 | 対象 | 由来 |
|---|---|---|
| **関係詞の節内役割(role)** | 関係詞 1,658 | 注釈 role(s/o/io/adv/p/o2) |
| **関係詞の先行詞リンク(解決済)** | 関係詞 1,071 | referent(verseId)→ 先行詞トークンへ解決 |
| **指示詞の節内役割(role)** | 指示詞 1,687 | 注釈 role |
| **指示詞の参照リンク・連体/代名詞区分** | 指示詞 1,104 | referent + 隣接/一致から**決定的に導出**する連体/代名詞フラグ |
| **節境界(単純節)** | 関係詞・指示詞の属する節 | role・位置から決定的に導出できる範囲(複雑節は範囲外) |
| **token 間リンク(修飾関係)** | 関係詞→先行詞・指示詞→参照先 | referent 解決による構造リンク |

- **完了条件 = 上記が「Builder が読むだけの確定情報」として提供され、Builder が構造解析を要さない状態**。
- 「必要十分」の範囲: Reading Japanese に反映する構造(役割・先行詞・連体代名詞・節境界)に限る。
  完全な統語木・全統語関係は対象外。

---

## 2. Reading Japanese Builder が依存する情報

Builder が **一切推論せず利用できる情報**:

| Builder が読む | 内容 |
|---|---|
| role | 節内役割(主語/目的語/…)の確定値 |
| 先行詞リンク(解決済トークン) | referent が指す先行詞トークン(語・読む日本語) |
| 連体/代名詞フラグ(指示詞) | Syntax が決定的に導出した区分 |
| 節境界(単純節) | 節の範囲(確定できる範囲) |

### Builder が構造解析してはいけないこと(明記)

- **referent を推論しない**(Syntax が解決済みを渡す)。
- **role を判定しない**(Syntax が確定値を渡す)。
- **連体/代名詞を判定しない**(Syntax が導出済みフラグを渡す)。
- **節境界を解析しない**(Syntax が提供する)。
- **修飾関係を推論しない**(Syntax が token 間リンクを渡す)。

---

## 3. Syntax が扱う対象

| 対象 | 内容 |
|---|---|
| **関係詞** | role・先行詞リンク・節内役割 |
| **指示詞** | role・参照リンク・連体/代名詞区分 |
| **節境界** | 単純節の範囲(決定的に導出できる範囲) |
| **修飾構造** | token 間の修飾リンク(referent 由来) |
| **先行詞リンク** | referent(verseId)の先行詞トークンへの解決 |
| **role** | 節内役割(s/o/io/adv/p/o2)の提供 |

---

## 4. Syntax が扱わない対象(除外)

| 除外 | 理由 |
|---|---|
| **意味推論** | L-0 禁止。Syntax は構造の読み取り・導出のみ |
| **語義決定** | Semantic の責務 |
| **日本語生成** | Builder / Presentation の責務(Syntax は文字列を生成しない) |
| **語順自然化** | 方針外(K-5 で不採用) |
| **翻訳** | 対象外 |
| **神学判断** | 対象外 |
| **自由関係の意味判定**(whoever/whatever) | Semantic(referent 無 587) |
| 複雑節の統語解析(遠隔・入れ子・非連続) | 必要十分の範囲外(現状維持) |

---

## 5. Morph / Syntax / Semantic 境界の最終確認(重複なし)

| 層 | 決定する | 決定しない |
|---|---|---|
| **Morph** | 形態から読む語形(gender/number/case/person/mood) | 構造・語義・章節統合 |
| **Syntax** | **構造情報の提供**(role/先行詞リンク/連体代名詞/節境界/修飾リンク) | 語形・語義・日本語生成・語順変更・意味推論 |
| **Semantic** | 文脈語義の整理(選択・idiom・自由関係の意味) | 語形・構造・章節確定・構造推論 |
| **Reading Japanese Builder** | 章節としての統合・最終確定 | 語形/構造/語義の内部判断(各層に委任) |
| **Presentation** | 表示整形のみ | 語・語順・確定値 |

- **重複責務なし**: Syntax は「構造を提供」、Morph は「語形を決める」、Semantic は「語義を選ぶ」、
  Builder は「章節として確定」、Presentation は「表示」。Syntax は文字列生成も語義決定もしない。

---

## 6. Syntax Completion の出口条件

Syntax が「Builder に渡せる状態」になる条件:

- **Builder が Syntax 判定を持たない**(role/連体代名詞/節境界の判定は Syntax 側で完結)。
- **Builder が referent を推論しない**(Syntax が先行詞トークンへ解決済みで渡す)。
- **Builder が role を判定しない**(Syntax が確定 role を渡す)。
- **Builder が連体/代名詞を判定しない**(Syntax が導出済みフラグを渡す)。
- **Builder が節境界・修飾関係を解析しない**(Syntax が提供する)。
- 構造情報が **決定的・注釈由来**(推論なし)で、対象トークンに対し欠落なく提供される
  (欠落・自由関係・複雑節は Syntax 側で「対象外」と明示され、Builder はそれを既定処理する)。

---

## 7. QA 方針

| 手段 | 内容 |
|---|---|
| **全巻監査** | NT 全巻で構造情報(role/referent 解決/連体代名詞/節境界)を実 FS 実測 |
| **構造情報取得率** | 関係詞 role/referent(1,071)・指示詞 role/referent(1,104)の取得率・先行詞解決率(実測 93.9%)を確認 |
| **回帰** | Morph 回帰(morph 44,251)・Relative Syntax K-3/K-4 バイト等価・既存 8 スイート ALL PASS |
| **chip⇔panel 一致** | 構造情報付与は reading を変えない(バイト等価)ため chip⇔panel 100% 維持 |
| **Builder 入力保証** | Builder が推論せず読める形(確定 role・解決済 referent・導出済フラグ)で提供されること |
| **悪化判定** | L-0 §7 準拠。構造情報の追加が reading を変えない(バイト等価)ことを確認。構造隠蔽・誤解・破損は 0 |

- 構造情報の提供は **reading を変えない情報層**(K-3/K-4 と同型のバイト等価)であること。

---

## 8. FROZEN 条件

Syntax Completion を凍結できる条件:

- §1(完了条件)〜§7(QA)が確定している。
- Builder(L-2a)が **推論せず・Syntax 判定を持たず**構造情報を利用できる出口条件(§6)が満たせる設計。
- 構造情報が **既存注釈(role/referent)由来の決定的導出**であり、意味推論・parse を含まない。
- 「必要十分な Syntax」の範囲(関係詞・指示詞・節境界・修飾・先行詞リンク・role)に限定され、
  完全な統語論実装を含まない。
- Morph v1・Relative Syntax K-3/K-4 の FROZEN 資産を侵さない(バイト等価・情報層追加)。
- 自由関係・複雑節・語義・語順自然化は対象外として明示されている。

---

## 責務凍結(候補)

```
[syntax-completion-design FROZEN候補 2026-07-20]
目的: Reading Japaneseに必要十分なSyntax（完全統語論でない）。Builderが推論せず構造情報を読むだけで済む状態
完了条件: 関係詞role/先行詞リンク(解決済) + 指示詞role/参照/連体代名詞フラグ + 節境界(単純節) + token間リンク を確定提供
Builder依存: role/先行詞トークン/連体代名詞フラグ/節境界を読むのみ。referent推論・role判定・連体代名詞判定・節境界解析をしない
Syntax対象: 関係詞・指示詞・節境界・修飾構造・先行詞リンク・role。既存注釈(role/referent)の決定的導出・推論なし
Syntax非対象: 意味推論・語義決定・日本語生成・語順自然化・翻訳・神学判断・自由関係の意味判定・複雑節解析
境界: Morph=語形 / Syntax=構造提供 / Semantic=語義 / Builder=章節確定 / Presentation=表示（重複なし）
出口: BuilderがSyntax判定/referent推論/role判定/連体代名詞判定/節境界解析を持たない
QA: 全巻監査・構造取得率(関係詞1071/指示詞1104・先行詞解決93.9%)・回帰・chip⇔panelバイト等価・Builder入力保証・悪化0
```

本設計は凍結可能な状態である。承認により FROZEN 化し、Syntax Completion 実装(構造情報の確定提供)へ進む。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結候補(Syntax Completion 完了条件・Builder 依存情報・Syntax 対象/非対象・Engine 境界・出口条件・QA・FROZEN 条件。指示詞も role/referent 注釈済を確認) |
