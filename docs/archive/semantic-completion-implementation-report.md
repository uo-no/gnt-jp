# Semantic Completion 実装報告(Stage L-4c)

実装日: 2026-07-20
位置づけ: Semantic Completion Implementation Plan(L-4b・FROZEN 候補)に基づき、**決定的意味情報を
resolve() 結果へ read-only 情報として付帯**する実装。**Reading Japanese 出力は変更しない(バイト等価)**。
数値はクリーン NT 実測(総 137,741・重複「 2.json」不在)。

---

## 1. 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| public/core/reading-engine.js | **`getSemanticInfo(token)` read-only アクセサを追加**。resolve() で `result.semanticInfo` を read-only 付帯(relativeSyntax/demonstrativeSyntax と同型)。**resolve 系の語幹決定・助詞・pipeline は不変** |

**変更なし(制約遵守)**: bible_data / generated data / **Morph Registry**(`_MORPH_STEM_RULES`・7 lemma)/
**Syntax accessor**(getRelativeSyntax/getDemonstrativeSyntax・不変)/ **Presentation**(presentation-policy.js)/
**PhraseRenderer**(phrase-renderer.js)/ 既存 lnGloss の reading 適用。重複再混入 0。

---

## 2. 実装内容

### `getSemanticInfo(token)`(決定的意味情報の読み取り・推論なし)

既存注釈・形態・構造の **決定的信号のみ**を読み取り、意味分類を返す(per-token・corpus 不要):

| 情報 | 由来(決定的) |
|---|---|
| **lnDomain** | Louw-Nida 主ドメイン(ln 注釈) |
| **pronType** | interrogative(τίς G5101)/ indefinite(τις G5100)(strong 分離) |
| **reflexivePerson** | 1/2/3(morph F-1/2/3) |
| **intensive** | αὐτós で class=adj のとき true |
| **deixis** | near(οὗτος)/ far(ἐκεῖνος)/ qualitative(τοιοῦτος)(lemma) |
| **adverbial** | τίς(G5101)で role=adv のとき true(副詞的 τί: なぜ/どう) |

- **決定的信号のない部分は付与しない(未判定=欠落・推論しない)**。いずれも無ければ null(安全 fallback)。
- resolve() で非 null 結果に `result.semanticInfo` を付帯(byte 等価)。null 結果は accessor で直接取得可能。

---

## 3. QA 結果

### 3-1. 意味分類率(NT 全巻 137,741)

| 情報 | 件数 | 備考 |
|---|---|---|
| semanticInfo 付与 | **129,022(93.7%)** | 主に lnDomain |
| lnDomain | 128,493(93.3%) | 多義語語義の骨格 |
| interrogative / indefinite | 555 / 530 | strong 分離 |
| reflexivePerson | 408 | morph F-1/2/3(ἐμαυτοῦ/σεαυτοῦ/ἑαυτοῦ) |
| intensive | 85 | αὐτós class=adj |
| deixis | 1,687 | 指示詞 lemma |
| adverbial | 79 | τίς role=adv |

### 3-2. 未判定率(推論しない・安全 fallback)

| 未判定 | 件数 | 理由 |
|---|---|---|
| αὐτós anaphoric pron(intensive 未判定) | 4,982 | class=pron は intensive を決定的に判定できない → 付与しない |
| ἑαυτοῦ person 無(morph F 桁なし・G848) | 497 | person-leveling で決定的信号なし → 付与しない |
| LN 非該当 | 9,248(6.7%) | domain 注釈なし → lnDomain 付与しない |
| discourse この/その/あの・pron intensive 等 | — | 決定的信号なし → 未判定 |

### 3-3. 回帰・バイト等価・非侵害

| 項目 | 結果 |
|---|---|
| **NT 全巻監査** | 137,741・実 FS・重複不在確認済 |
| **回帰 ALL PASS** | re-phase1(104)/2/3/5・re-stageA/B/D/E **全 ALL PASS**(基準値不変) |
| **Morph 回帰 0** | morph 44,251 不変・7 lemma 出力不変 |
| **Syntax 回帰 0** | relativeSyntax/demonstrativeSyntax・K-3/K-4/L-3c バイト等価不変 |
| **chip⇔panel 一致** | **100%(不一致 0)**・破損形 0 |
| **Reading Japanese identical** | re-stageB identical=**98,047 不変**(NT 全巻 137,741 出力バイト等価) |
| **悪化 0** | reading 不変・破損 0・**意味推論の混入 0**・構造隠蔽 0 |

- 意味情報付与は **reading を変えない情報層**(K-3/K-4/L-3c と同型のバイト等価)。

---

## 4. Builder へ提供可能な Semantic Facts

Builder(未実装)が **意味推論を持たず読み取るだけ**で利用できる決定的意味情報:

| Semantic Fact | 対象 | 未判定時 |
|---|---|---|
| **lnDomain**(語義ドメイン) | 128,493(93.3%) | LN 非該当 6.7% は既定(代表語) |
| **pronType**(interrogative/indefinite) | 1,085(555/530) | 対象外語 |
| **reflexivePerson**(1/2/3) | 408 | person 無 497 は person 中立(自分) |
| **intensive** | 85(αὐτós adj) | pron 4,982 は anaphoric 既定 |
| **deixis**(近/遠/性状) | 1,687 | この/その/あの 精緻化は未判定 |
| **adverbial**(副詞的 τί) | 79 | 未注釈は事物(何)既定 |

- **Builder は意味を推論しない**(決定的分類を読む)。未判定は安全既定で扱う。

---

## 5. 未解決範囲

| 項目 | 状況 |
|---|---|
| **αὐτós の intensive(class=pron の残)** | class=adj のみ決定的。pron 内 intensive(same/very)は決定的信号なし → 未判定 |
| **ἑαυτοῦ の person-leveling(497)** | G848(P 形)は morph F 桁なし・subjref 空 → person 未判定 |
| **LN 非該当語義(6.7%)** | domain 注釈なし → 未判定(代表語既定) |
| **discourse この/その/あの** | 談話依存 → 未判定 |
| **語義の reading への適用** | Semantic Facts は情報提供のみ。reading への統合は Builder の責務(未実装) |
| Builder 実装・Reading Japanese 改善 | 本 Stage 対象外(未実装維持) |

---

## 6. FROZEN 可否

- **FROZEN 可能**。Semantic Completion は決定的意味情報(lnDomain/pronType/reflexivePerson/intensive/
  deixis/adverbial)を **read-only で提供**し、**日本語出力を一切変えず(バイト等価・identical 98,047)**、
  **推論を混入せず**(未判定=付与しない)、既存資産を非侵害で達成した。
- 達成: Morph 回帰 0(44,251)・Syntax 回帰 0(K-3/K-4/L-3c)・bible_data 非変更・Presentation/
  PhraseRenderer 非変更・reading バイト等価・Builder 未実装維持・全回帰 ALL PASS・chip⇔panel 100%・
  悪化 0。
- **Builder 入力保証**: Builder は意味推論を持たず、決定的意味分類の読み取りのみで利用できる(§4)。
- **推論混入 0**: すべて既存注釈・形態・構造の決定的読み取り。非決定的は未判定。

```
[semantic-completion-implementation FROZEN候補 2026-07-20]
実装: getSemanticInfo(token) 追加・resolve結果へ semanticInfo を read-only 付帯（byte等価・reading不変）
提供: lnDomain(93.3%) / pronType(interrogative555 indefinite530) / reflexivePerson(408) / intensive(85) / deixis(1687) / adverbial(79)
未判定: αὐτós pron intensive(4982) / ἑαυτοῦ person無(497) / LN非該当(6.7%) / discourse → 推論せず付与しない
QA: 全回帰ALL PASS・reading identical98047・chip⇔panel100%・破損0・Morph/Syntax回帰0・悪化0・推論混入0
非侵害: Morph Registry/Syntax accessor/bible_data/Presentation/PhraseRenderer/lnGloss reading 不変・Builder未実装維持
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版(getSemanticInfo 追加・決定的意味情報 6 種提供・未判定安全 fallback・バイト等価・全回帰 ALL PASS・悪化0) |
