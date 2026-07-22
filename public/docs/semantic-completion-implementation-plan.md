# Semantic Completion 実装計画(Stage L-4b)

策定日: 2026-07-20
位置づけ: Semantic Completion Design(L-4a・FROZEN 候補)に基づき、**Semantic Completion を安全に実装する
ための実装計画**。実装は **reading-engine の情報層のみ**とし、**Reading Japanese の出力は変更しない
(バイト等価)**。
根拠: L-4a・L-3c(Syntax Completion 実装・getRelativeSyntax/getDemonstrativeSyntax の先例)・L-0/L-1/L-2a。

**本文書は計画のみ。コード・bible_data・Builder・Morph・Syntax の実装/変更、Reading Japanese 改善、
擬似コード・JSON・TypeScript は一切含まない。本 Stage(L-4b)でコード・データは変更しない。**

---

## 0. 前提(決定的信号は per-token 取得可能)

- L-4a の決定的意味信号は **すべて token フィールド**(class / strong / morph / role / lemma / ln)であり、
  **per-token で取得できる**(Syntax の referent 解決のような corpus 索引を要さない)。
- したがって Semantic Completion は **per-token の read-only アクセサ**として、K-3/K-4/L-3c と同型の
  **バイト等価情報層**で実装できる(reading 不変)。
- LN 語義は既存 lnGloss(Phase 5-D)が reading へ一部適用済。**本実装はそれを変えず**、意味分類を
  **情報として付帯**する(reading への新たな適用はしない)。

---

## 1. 実装対象(resolve 結果へ付帯する情報)

Semantic が read-only で付帯する決定的意味情報:

| 情報 | 由来(決定的) | 未判定(null)の条件 |
|---|---|---|
| **LN 語義**(domain 由来) | ln domain(93.3%) | domain 無(6.7%) |
| **interrogative / indefinite** | strong(G5101 / G5100) | 対象外語 |
| **reflexive person** | morph(F-1/2/3) | person 無(G848 497 等) |
| **intensive**(自身・同じ) | class(adj)・LN | class=pron の残 intensive |
| **deixis(近/遠)** | lemma(οὗτος/ἐκεῖνος) | この/その/あの 精緻化 |
| **副詞的 τί(なぜ/どう)** | role(adv) | 未注釈 role |

- **未判定は null のまま**(推論しない・安全 fallback)。付帯は決定的信号があるものに限る。

---

## 2. 実装順序(Phase A / B / C)

### Phase A: 決定的意味情報の取得

- **目的**: 決定的信号(class/strong/morph/role/lemma/ln)から意味分類を **読み取る read-only アクセサ**を
  用意する(per-token・推論なし)。
- **変更対象**: reading-engine の read-only アクセサ(意味情報取得)のみ。
- **変更してはいけない範囲**: resolve 出力の日本語(バイト等価)・Morph v1・Syntax(K-3/K-4/L-3c)・
  既存 lnGloss の reading 適用・pipeline 順序・bible_data。
- **完了条件**: 対象語で意味分類が取得でき、**決定的信号のない部分は null(未判定)**。**日本語出力は不変**。

### Phase B: resolve() への read-only 付帯

- **目的**: resolve 結果へ意味情報(semanticInfo)を **read-only 付帯**する(relativeSyntax/
  demonstrativeSyntax と同型)。
- **変更対象**: resolve() の付帯処理のみ(result への追加フィールド)。
- **変更してはいけない範囲**: result.japanese(バイト等価)・pipeline 順序・語幹決定・助詞・既存付帯
  (relativeSyntax/demonstrativeSyntax)。
- **完了条件**: 決定的意味情報が付帯され、**reading バイト等価**(japanese 不変)。未判定は付帯しない/null。

### Phase C: Builder 入力保証監査

- **目的**: Builder(未実装)が **意味推論を持たず読める形**で意味情報が揃うことを監査する。
- **変更対象**: 監査スクリプトのみ(実装本体は読み取り)。
- **変更してはいけない範囲**: 実装本体・Builder(未実装維持)。
- **完了条件**: §4 QA(意味分類率・未判定率・回帰・悪化 0・Builder 入力保証)ALL PASS。

---

## 3. pipeline への影響

| 確認項目 | 計画上の扱い |
|---|---|
| **Morph 非侵害** | Registry(`_MORPH_STEM_RULES`・7 lemma)・`_resolveMorph` に触れない。morph 44,251 不変 |
| **Syntax 非侵害** | getRelativeSyntax/getDemonstrativeSyntax・relativeSyntax/demonstrativeSyntax 付帯に触れない |
| **Presentation 非侵害** | presentation-policy.js・PhraseRenderer に触れない |
| **bible_data 非侵害** | 注釈の読み取りのみ。japanese・データを変更しない |
| **Reading Japanese バイト等価** | 意味分類は情報として付帯するのみ。**japanese 出力・既存 lnGloss reading は不変** |

- Semantic Completion は **reading を変えない情報層の追加**(K-3/K-4/L-3c と同型)。pipeline 順序・出力不変。

---

## 4. QA

| 項目 | 合格条件 |
|---|---|
| **NT 全巻監査** | 137,741・7,939 章節・実 FS・重複「 2.json」不在の確認 |
| **意味分類率** | 各決定的信号の付帯率(LN 93.3%・interrogative/indefinite strong・reflexive person 326・intensive class・adv・deixis lemma) |
| **未判定率** | 非決定的(LN 非該当 6.7%・person-leveling 残 497・discourse・pron intensive 残)が null(未判定)であること・推論混入 0 |
| **回帰** | Morph(44,251)・Syntax(K-3/K-4/L-3c バイト等価)・Semantic 既存(re-phase5)・既存 8 スイート ALL PASS |
| **chip⇔panel 一致** | 100%(不一致 0)・破損形 0 |
| **Reading Japanese identical** | re-stageB identical(98,047)不変 = NT 全巻 137,741 出力バイト等価 |
| **悪化 0** | reading 不変・破損 0・**意味推論の混入 0**・構造隠蔽 0 |

---

## 5. Gate

### 実装開始条件

| Gate | 条件 |
|---|---|
| G-開始1 | L-4a(Semantic Completion Design)が凍結されている |
| G-開始2 | L-3c(Syntax Completion)・Morph v1 が実装済・凍結 |
| G-開始3 | 出力を変えない情報層(バイト等価)として実装する方針が確定 |
| G-開始4 | Morph・Syntax・Presentation・bible_data 非侵害の担保 |

### 実装終了条件

| Gate | 条件 |
|---|---|
| G-終了1 | LN 語義・interrogative/indefinite・reflexive person・intensive・deixis・副詞的 τί が決定的に付帯される |
| G-終了2 | 日本語出力バイト等価(identical 98,047 不変)・全回帰 ALL PASS・chip⇔panel 100%・破損形 0 |
| G-終了3 | **意味推論の混入 0**(決定的信号のみ)・非決定的は null(未判定) |

### Builder へ渡せる条件

| Gate | 条件 |
|---|---|
| G-渡1 | Builder が **意味を推論しない**(決定的意味分類を読むのみ) |
| G-渡2 | 未判定(null)が **安全既定**として明示され、Builder が既定処理できる |
| G-渡3 | LN 非該当・person-leveling・discourse が「未判定」として区別される |

---

## 6. リリース判定

以下をすべて満たすとき Semantic Completion を FROZEN 可能とする。

| # | 基準 |
|---|---|
| 1 | **バイト等価**(Reading Japanese identical 98,047 不変) |
| 2 | **悪化 0**(破損 0・chip⇔panel 100%・構造隠蔽 0) |
| 3 | **回帰 ALL PASS**(Morph/Syntax/Semantic 既存・8 スイート) |
| 4 | **推論混入 0**(決定的信号のみ・AI 的推測なし) |
| 5 | **決定的意味情報のみ**(LN/class/strong/morph/role/lemma 由来) |
| 6 | **未判定 fallback**(非決定的は null・Builder が安全既定で扱える) |

いずれか未達なら FROZEN しない(該当 Phase を保留・是正)。

---

## 責務凍結(候補)

```
[semantic-completion-implementation-plan FROZEN候補 2026-07-20]
実装: reading-engineの情報層のみ・per-token read-onlyアクセサ・resolve結果へsemanticInfo付帯（byte等価・reading不変）
対象: LN語義 + interrogative/indefinite(strong) + reflexive person(morph F) + intensive(class) + deixis(lemma) + 副詞的τί(role adv)。未判定はnull
順序: A 決定的意味情報の取得(per-token・推論なし) → B resolve付帯(byte等価) → C Builder入力保証監査
pipeline: Morph/Syntax/Presentation/bible_data/既存lnGloss reading 非侵害。Builder未実装維持
QA: 全巻/意味分類率(LN93.3%等)/未判定率/回帰/chip⇔panel100%/Reading identical98047/悪化0(推論混入0)
Gate: 開始(L-4a凍結/L-3c-Morph済/byte等価方針) 終了(決定的付帯/byte等価/推論0) 渡す(Builder推論なし/未判定安全既定)
リリース: byte等価・悪化0・回帰ALL PASS・推論混入0・決定的のみ・未判定fallback
```

本計画は凍結可能な状態である。承認により FROZEN 化し、G-開始 充足後に Phase A → B → C を実施する。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結候補(実装対象・Phase A/B/C・pipeline 影響・QA・Gate・リリース判定。決定的信号は per-token 取得可・バイト等価情報層) |
