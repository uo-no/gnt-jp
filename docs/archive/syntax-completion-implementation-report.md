# Syntax Completion 実装報告(Stage L-3c)

実装日: 2026-07-20
位置づけ: Syntax Completion Implementation Plan(L-3b・FROZEN 候補)に基づき、Reading Japanese Builder が
**推論なしで利用できる Syntax 基盤**を完成させる実装。**構造情報の完成が目的**で、Reading Japanese 改善・
bible_data 変更・Builder 実装は行わない。
数値はクリーン NT 実測(総 137,741・重複「 2.json」不在)。

---

## 1. 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| public/core/reading-engine.js | **`_DEMONSTRATIVE_LEMMAS` 定数 + `getDemonstrativeSyntax(token)` read-only アクセサを追加**。resolve() で指示詞の `demonstrativeSyntax` を結果へ read-only 付帯(K-4 の relativeSyntax と同型)。**resolve 系の語幹決定・助詞・pipeline は不変** |

**変更なし(制約遵守)**: bible_data / generated data / Semantic / Morph Registry(`_MORPH_STEM_RULES`・
7 lemma 不変)/ Presentation(presentation-policy.js)/ **PhraseRenderer**(phrase-renderer.js)/
関係詞アクセサ(getRelativeSyntax・K-3 不変)。重複再混入 0。

---

## 2. 実装内容

### Phase A: 既存注釈の取得・保持

- **`getDemonstrativeSyntax(token)`**: 指示詞 οὗτος / ἐκεῖνος / τοιοῦτος(lemma 判定・格形 strong 分散)の
  **注釈済み構造情報(role / referent)を読み取って返す**。返す形: `{ lemma, role, referent, adnominal }`。
  - referent 有のみ対象(referent 無は null)。role 未注釈は null。**非対象・欠落は null(安全 fallback)**。
- 関係詞(getRelativeSyntax・K-3)はそのまま維持。

### Phase B: resolve pipeline へ構造情報を安全に付帯

- resolve() で、非 null 結果かつ指示詞のとき `result.demonstrativeSyntax` を **read-only 付帯**
  (K-4 の relativeSyntax と同型)。**result.japanese は不変(バイト等価)・pipeline 順序不変**。
- **連体/代名詞フラグ(adnominal)は常に null(未判定)**。理由: 連体/代名詞の区別は参照先の class
  (noun/verb 等)に依存し、それは corpus 索引を要する(per-token では確定できない)。**engine では
  推論せず「未判定」とし、corpus を持つ consumer 側の決定的導出に委ねる**(L-0 推論禁止・安全 fallback)。

### Phase C: Builder 入力保証監査(§3)

---

## 3. QA 結果

| 項目 | 結果 |
|---|---|
| **NT 全巻監査** | 137,741・7,939 章節・実 FS・重複不在確認済 |
| **role 取得率** | 関係詞 834 / 指示詞 576(注釈のあるもの) |
| **referent 解決率** | 関係詞 **1,006/1,071(93.9%)**・指示詞 **919/1,104(83.2%)**(verseId 索引で解決可能) |
| **指示詞判定率(adnominal)** | **判定済 0 / 全件未判定**(安全 fallback・推論なし) |
| **回帰 ALL PASS** | re-phase1(104)/2/3/5・re-stageA/B/D/E **全 ALL PASS**(基準値不変) |
| **chip⇔panel 一致** | **100%(不一致 0)**・破損形 0 |
| **before/after バイト等価** | re-stageB identical=98,047 **不変**(NT 全巻 137,741 出力バイト等価) |
| **悪化 0** | reading 不変・破損 0・chip⇔panel 100%・意味推論の混入 0 |
| **非対象への leak** | **0**(関係詞・指示詞以外にアクセサが作用しない) |

- 全構造情報付与は **reading を変えない情報層**(K-3/K-4 と同型のバイト等価)。

---

## 4. Builder に提供できる Syntax 情報

Builder(未実装)が **推論せず読み取るだけ**で利用できる形で、以下を提供:

| 情報 | 対象 | 提供形態 | 取得/解決 |
|---|---|---|---|
| **role**(節内役割 s/o/io/adv/p/o2) | 関係詞・指示詞 | 確定値(注釈由来) | 関係詞 834・指示詞 576 |
| **referent**(参照先トークンID・verseId) | 関係詞 1,071・指示詞 1,104 | 確定 ID | verseId 索引で決定的解決(関係詞 93.9%・指示詞 83.2%) |
| **kind**(関係詞/指示詞の区別) | — | アクセサの別(getRelativeSyntax / getDemonstrativeSyntax) | — |
| **adnominal**(連体/代名詞) | 指示詞 | **未判定(null)** | consumer 側で決定的導出(§5) |

- **Builder は role を判定しない**(確定値を読む)。
- **Builder は referent を推論しない**(確定 ID を **決定的な verseId 索引 lookup** で解決。推論ではない)。
- **Builder は連体/代名詞を判定しない**(未判定を安全既定として扱う)。

---

## 5. 未判定として残した対象

| 対象 | 未判定の理由 |
|---|---|
| **指示詞の連体/代名詞(adnominal)全 1,104 件** | 区別は参照先 class(noun/verb 等)に依存し、per-token では確定不能(corpus 要)。実測でも隣接性は弱く(隣接 38)決定的でない。**推論を避け未判定(null)とし、corpus を持つ consumer 側の決定的導出に委ねる**(L-0 推論禁止) |
| role 未注釈の関係詞(237)・指示詞(528) | 注釈が「-」/空。推論せず null |
| referent 未解決(関係詞 65・指示詞 185) | verseId 索引に先行詞が無い/別スキーム。対象外として明示 |

- いずれも **推論せず未判定/対象外**とする安全 fallback。Builder はこれらを既定処理する。

---

## 6. 未解決範囲

| 項目 | 状況 |
|---|---|
| **referent の実トークン解決(verseId 索引)** | engine は referent-ID を提供。**解決(verseId→トークン)は corpus を持つ consumer 側の決定的 lookup**(推論ではない・実測 93.9%/83.2% 解決可)。engine 内への corpus 索引導入は per-token 設計を崩すため見送り |
| **連体/代名詞の導出** | 参照先 class(corpus)による決定的導出は consumer 側。engine は未判定 |
| **自由関係(referent 無 587)・複雑節** | 対象外(Semantic / 範囲外) |
| **節境界の明示提供** | frame 注釈が空のため、単純節の節境界導出は role/位置ベースで consumer 側(engine は role/referent を提供) |
| Builder 実装・Reading Japanese 改善 | 本 Stage 対象外(未実装維持) |

---

## 7. FROZEN 可否

- **FROZEN 可能**。Syntax Completion(構造情報の完成)は、関係詞・指示詞の **role/referent を read-only で
  提供**し、**日本語出力を一切変えず(バイト等価)**、**推論を混入せず**(連体/代名詞は未判定・安全 fallback)、
  既存資産を非侵害で達成した。
- 達成: Morph v1 非侵害(morph 44,251)・Semantic 非侵害(re-phase5)・bible_data 非変更・Presentation/
  PhraseRenderer 非変更・reading 不変・Builder 未実装維持・全回帰 ALL PASS・chip⇔panel 100%・悪化 0・leak 0。
- **Builder 入力保証**: Builder は role 判定・referent 推論・連体代名詞判定を持たず、確定値の読み取りと
  決定的 lookup のみで利用できる(§4)。
- **境界の明示**: referent の実トークン解決・連体代名詞の最終導出は corpus を持つ consumer 側の
  決定的処理(推論ではない)として残す。engine は raw 構造facts を提供する責務に閉じる。

```
[syntax-completion-implementation FROZEN候補 2026-07-20]
Phase A: getDemonstrativeSyntax（指示詞 role/referent/adnominal=null）追加。関係詞 getRelativeSyntax は不変
Phase B: resolve 結果へ demonstrativeSyntax を read-only 付帯（byte等価）。relativeSyntax(K-4)と併存
提供: role（確定）+ referent-ID（決定的解決 関係詞93.9%/指示詞83.2%）。adnominal=未判定（推論なし・安全FB）
QA: 全回帰ALL PASS・reading バイト等価(identical98047)・chip⇔panel100%・破損0・leak0・悪化0
非侵害: Morph v1/Semantic/bible_data/Presentation/PhraseRenderer 不変。Builder未実装維持
境界: referent実解決・連体代名詞導出は corpus側の決定的lookup（推論でない）として consumer に委ねる
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版(getDemonstrativeSyntax 追加・指示詞 role/referent 提供・adnominal 未判定・バイト等価・全回帰 ALL PASS・悪化0) |
