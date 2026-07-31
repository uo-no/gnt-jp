# Syntax Completion 実装計画(Stage L-3b)

策定日: 2026-07-20
位置づけ: Syntax Completion Design(L-3a・FROZEN 候補)に基づき、Reading Japanese Builder が
**推論なしで利用できる Syntax 情報を完成させる安全な実装計画**。目的は「Reading Japanese に必要十分な
Syntax」であり、一般的な統語解析ではない。
根拠: L-3a・K-3/K-4(Relative Syntax Phase 1/2)・L-0/L-1/L-2a。

**本文書は計画のみ。コード・bible_data・Builder・Semantic の実装/変更、Reading Japanese 改善、
擬似コード・JSON・TypeScript は一切含まない。本 Stage(L-3b)でコード・データは変更しない。**

---

## 0. 現状と前提(実測)

- **関係詞**: role/referent は K-3(getRelativeSyntax)で取得可能・K-4 で resolve 結果へバイト等価付帯。
  referent の先行詞解決は verseId 索引で **1,006/1,071(93.9%)** 可能(索引は未整備)。
- **指示詞**: role/referent は **注釈済だが未公開**(アクセサ無し)。referent 解決 **919/1,104(83%)**。
  参照先 class は noun 522 / verb 304 / adj 49 等と多様 → **連体/代名詞判別は隣接性だけでは決定的でない**
  (隣接 38 のみ)。参照先 class が導出信号だが、**確度に応じた「未判定」安全 fallback が必要**。
- すべて **reading を変えない情報層**(K-3/K-4 と同型のバイト等価)として実装する。

---

## 1. 実装対象

| 対象 | 内容 |
|---|---|
| **関係詞** | role・先行詞リンク(解決済) |
| **指示詞** | role・参照リンク・連体/代名詞フラグ(確度付き) |
| **role** | 節内役割の確定提供(s/o/io/adv/p/o2) |
| **referent** | verseId → 先行詞/参照先トークンへの解決 |
| **修飾関係** | referent 由来の token 間リンク |
| **最小構造境界** | Reading Japanese に必要な単純節の節境界(決定的に導出できる範囲) |

- **一般的な統語解析は対象外**(完全な統語木・全関係・複雑節の解析はしない)。

---

## 2. 実装順序(Phase A / B / C)

### Phase A: 既存注釈の取得・保持

- **目的**: 関係詞に加え **指示詞の role/referent を read-only アクセサで取得可能**にし、resolve 結果へ
  バイト等価で付帯する(K-3/K-4 の関係詞と同型)。
- **変更対象**: reading-engine の read-only アクセサ(構造情報取得)と付帯処理のみ。
- **変更してはいけない範囲**: resolve 出力の日本語(バイト等価)・Morph v1・Semantic・pipeline 順序・
  bible_data。
- **完了条件**: 関係詞・指示詞の role/referent が取得でき、**日本語出力バイト等価**。自由関係・非対象は
  null(安全 fallback)。

### Phase B: 決定的導出

- **目的**: 既存注釈から **Builder が読むだけの確定情報を決定的に導出**する。
  - **先行詞/参照先の解決**: verseId 索引で referent を実トークンへ解決(関係詞 93.9% / 指示詞 83%)。
  - **連体/代名詞フラグ(指示詞)**: 参照先 class・隣接・一致から**決定的に導出**。**確信できない場合は
    「未判定」**とする(推論しない・L-0)。
  - **修飾リンク**: referent 由来の token 間リンクを提供。
  - **最小構造境界**: 単純節の節境界を role/位置から導出(複雑節は「対象外」フラグ)。
- **変更対象**: 構造導出のロジック(注釈読み取り+決定的規則)・verseId 索引。
- **変更してはいけない範囲**: 日本語出力・意味推論の混入・Morph/Semantic・bible_data。**parse・意味推論を
  しない**。
- **完了条件**: 対象トークンで導出情報(解決済 referent・連体代名詞フラグ or 未判定・修飾リンク・
  単純節境界)が確定的に提供され、**バイト等価**を維持。

### Phase C: Builder 入力保証監査

- **目的**: Builder(未実装)が **推論せず読める形**で構造情報が揃っていることを監査する。
- **変更対象**: 監査スクリプトのみ(実装本体は読み取り)。
- **変更してはいけない範囲**: 実装本体・Builder(未実装維持)。
- **完了条件**: §4 の QA(取得率・解決率・指示詞判定率・回帰・悪化 0・Builder 入力保証)ALL PASS。

---

## 3. pipeline 影響確認

| 確認項目 | 計画上の扱い |
|---|---|
| **Morph v1 非侵害** | Registry(`_MORPH_STEM_RULES`)・`_resolveMorph` に触れない。morph 44,251 不変 |
| **Semantic 非侵害** | 語義層に触れない。re-phase5 基準不変 |
| **bible_data 非変更** | 注釈の読み取りのみ。japanese・データを変更しない |
| **Builder 未実装維持** | 構造情報の提供のみ。Builder(L-2a)は実装しない |
| **chip⇔panel 維持** | 情報付与は reading を変えない(バイト等価)ため 100% 維持・破損形 0 |

- Syntax Completion は **reading を変えない情報層の追加**(K-3/K-4 と同型)。pipeline 順序・出力は不変。

---

## 4. QA

| 項目 | 合格条件 |
|---|---|
| **全巻監査** | NT 全巻(137,741・7,939 章節)・実 FS・重複「 2.json」不在の確認 |
| **role 取得率** | 関係詞・指示詞の role 取得が注釈と一致 |
| **referent 解決率** | 関係詞 93.9%(1,006/1,071)・指示詞 83%(919/1,104)を確認。未解決は「対象外」明示 |
| **指示詞判定率** | 連体/代名詞フラグの確信導出率を実測。**未判定は安全 fallback**(推論しない)であることを確認 |
| **回帰** | Morph(morph 44,251)・Relative Syntax K-3/K-4(バイト等価)・既存 8 スイート ALL PASS |
| **悪化 0** | 日本語出力バイト等価(reading 不変)・破損形 0・chip⇔panel 100%。構造導出に意味推論の混入 0 |
| **Builder 入力保証** | Builder が推論せず読める形(確定 role・解決済 referent・確信/未判定フラグ・単純節境界)で提供 |

---

## 5. Gate

### 実装開始条件

| Gate | 条件 |
|---|---|
| G-開始1 | L-3a(Syntax Completion Design)が凍結されている |
| G-開始2 | K-3/K-4(関係詞 role/referent 取得・バイト等価)が実装済 |
| G-開始3 | 出力を変えない情報層(バイト等価)として実装する方針が確定 |
| G-開始4 | Morph v1・Semantic・bible_data 非侵害の担保 |

### 実装終了条件

| Gate | 条件 |
|---|---|
| G-終了1 | 関係詞・指示詞の role/referent 取得 + 先行詞解決 + 連体代名詞フラグ(確信/未判定)+ 単純節境界が提供される |
| G-終了2 | 日本語出力バイト等価・全回帰 ALL PASS・chip⇔panel 100%・破損形 0 |
| G-終了3 | 意味推論の混入 0(既存注釈由来の決定的導出のみ) |

### Builder に渡せる条件

| Gate | 条件 |
|---|---|
| G-渡1 | Builder が **Syntax 判定を持たない**(role/連体代名詞/節境界を判定しない) |
| G-渡2 | Builder が **referent を推論しない**(解決済で渡る) |
| G-渡3 | 未解決・未判定・自由関係・複雑節が **「対象外」として明示**され、Builder が既定処理できる |

---

## 6. リリース判定(Syntax Completion を FROZEN にできる基準)

以下をすべて満たすとき Syntax Completion を FROZEN 可能とする。

| # | 基準 |
|---|---|
| 1 | 実装終了条件(G-終了 1〜3)を満たす |
| 2 | Builder に渡せる条件(G-渡 1〜3)を満たす |
| 3 | **日本語出力バイト等価**(reading 不変)・**悪化 0** |
| 4 | **Morph v1・Semantic・bible_data 非侵害**(基準・データ不変) |
| 5 | 既存回帰 8 スイート ALL PASS・chip⇔panel 100%・破損形 0 |
| 6 | 構造情報が **既存注釈由来の決定的導出**(意味推論・parse なし)であること |
| 7 | 「必要十分な Syntax」の範囲(関係詞・指示詞・role・referent・修飾・単純節境界)に限定・複雑節/自由関係は対象外明示 |

いずれか未達なら FROZEN しない(該当 Phase を保留・是正)。

---

## 責務凍結(候補)

```
[syntax-completion-implementation-plan FROZEN候補 2026-07-20]
対象: 関係詞・指示詞・role・referent・修飾リンク・最小構造境界（一般統語解析は対象外）
順序: A 既存注釈取得保持(指示詞アクセサ・バイト等価) → B 決定的導出(referent解決/連体代名詞フラグ確度付き/修飾リンク/単純節境界) → C Builder入力保証監査
現状: 関係詞role/referent=K-3/K-4済(解決93.9%)、指示詞=未公開(解決83%・連体代名詞は隣接弱く未判定fallback要)
pipeline: Morph v1/Semantic/bible_data非侵害・Builder未実装維持・chip⇔panelバイト等価維持
QA: 全巻/role取得率/referent解決率(関係詞93.9%/指示詞83%)/指示詞判定率(未判定は安全fallback)/回帰/悪化0(reading不変)/Builder入力保証
Gate: 開始(L-3a凍結/K-3-4済/バイト等価方針/非侵害) 終了(構造提供/バイト等価/推論0) 渡す(Builder判定なし/referent推論なし/対象外明示)
リリース: バイト等価・悪化0・非侵害・回帰ALL PASS・決定的導出(推論なし)・範囲限定
```

本計画は凍結可能な状態である。承認により FROZEN 化し、G-開始 充足後に Phase A → B → C を実施する。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結候補(実装対象・Phase A/B/C・pipeline 影響・QA・Gate・リリース判定。指示詞 referent 解決83%・連体代名詞は未判定 fallback 要を明記) |
