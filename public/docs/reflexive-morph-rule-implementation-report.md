# 再帰代名詞限定 Morph Rule 実装報告(Stage J-8b)

実装日: 2026-07-20
位置づけ: 設計 docs/reflexive-morph-rule-design.md(J-8a・FROZEN)に基づき、再帰代名詞のうち
**person が strong で一意に決まる 2 lemma** に限定した Morph Rule 実装。αὐτós(J-3)・τίス(J-5)・
関係詞(J-6b)と同一の Registry 方式。
数値はすべて **クリーン NT 実測**(総 137,741・重複「 2.json」不在)。

---

## 1. 変更ファイル

| ファイル | 種別 | 変更内容 |
|---|---|---|
| public/core/reading-engine.js | 実装 | `_MORPH_STEM_RULES` に **G1683 / G4572** を追加(base='自分自身'→私自身 / あなた自身)。既存ロジック不変 |
| scripts/re-phase1-regression.cjs | テスト | 再帰代名詞 単体回帰 5 ケース追加 |

**基準値の更新は不要**(理由は §4-2)。**変更なし(制約遵守)**: bible_data / generated data(再生成なし)/
Semantic(reading-semantic-data.js)/ Syntax / Presentation(presentation-policy.js)/ lexicon。
Engine 構造・pipeline も不変(Registry に 2 lemma 追加のみ)。重複ファイル再混入 0。

---

## 2. 実装範囲

- 対象: **ἐμαυτοῦ(G1683)/ σεαυτοῦ(G4572)** のみ。
  - **G1683 → 私自身**(person=1 人称・morph F-1・strong で一意)
  - **G4572 → あなた自身**(person=2 人称・morph F-2・strong で一意)
- 対象外: **ἑαυτοῦ(G1438)/ ἑαυτοῦ(G848)** — person-leveling(F-3 が yourselves/ourselves に流用)で
  形態のみでは person が一意決定できないため **Semantic 責務**。汎用「自分自身 / 自分」を維持。
- 方式: strong キー Registry・**base='自分自身' 一致時のみ発火**(Semantic が別語を代入した token では
  非干渉)。person は strong で一意なので gender/number に依らず定数(単数各性を同一値へ写像)。
  case 助詞は Phase 1 の既存挙動。

---

## 3. Before / After(クリーン NT・実 Engine)

| lemma | 変更前 | 変更後 | 件数 |
|---|---|---|---|
| ἐμαυτοῦ(G1683)対格 | 自分自身を | **私自身を** | 18 |
| ἐμαυτοῦ 属格 | 自分自身の | **私自身の** | 14 |
| ἐμαυτοῦ 与格 | 自分自身に | **私自身に** | 5 |
| σεαυτοῦ(G4572)対格 | 自分自身を | **あなた自身を** | 33 |
| σεαυτοῦ 与格 | 自分自身に | **あなた自身に** | 5 |
| σεαυτοῦ 属格 | 自分自身の | **あなた自身の** | 5 |

- **G1683: 37/37 改善・G4572: 43/43 改善**(計 80 件)。
- **G1438: 330/0(不変)・G848: 493/0(不変)** — 対象外を確認。

---

## 4. QA 結果

### 4-1. 対象 2 lemma のみ改善確認

| lemma | total | changed | 結果 |
|---|---|---|---|
| ἐμαυτοῦ(G1683) | 37 | 37 | 私自身 へ全件改善 |
| σεαυτοῦ(G4572) | 43 | 43 | あなた自身 へ全件改善 |
| ἑαυτοῦ(G1438) | 330 | 0 | 対象外・不変 ✓ |
| ἑαυτοῦ(G848) | 493 | 0 | 対象外・不変 ✓ |

### 4-2. 既存 lemma の悪化 0

| lemma | 確認 | 結果 |
|---|---|---|
| αὐτός(G846) | 中性対格=それを | 悪化 0 |
| τίς(G5101) | 中性対格=何を | 悪化 0 |
| ὅς(G3739) | 中性対格=〜するものを | 悪化 0 |

- 全再帰代名詞は **非主格**(G1683 acc/gen/dat・G4572 acc/dat/gen)であり、既に morph が解決していた
  (自分自身+助詞)。頭語 swap は **morph coverage を変えず**(44,251 のまま)、particle 層にも波及しない。
  Stage B の「changed」件数も、これらは J-8b 以前から Tier2 と相違し「changed」だったため **件数不変**。
  → **re-phase1(morph)・re-phase3(particle)・re-stageB(changed)の基準更新は不要**(出力文字列のみ変化)。

### 4-3. Semantic 短絡維持

- base='自分自身' 一致時のみ発火。re-phase5 **ALL PASS(55)** = Semantic(idiom/prepDomain/lnGloss)の
  出力不変。Semantic > Morph の短絡順は不変。

### 4-4. chip⇔panel 一致

- chip⇔panel 一致 **137,741 / 不一致 0 / 一致率 100.00%**・破損形(新)**0**。

### 4-5. 全回帰 PASS

| テスト | 結果 |
|---|---|
| re-phase1 | **ALL PASS(104 checks)**(再帰 5 ケース追加・morph 44,251 不変) |
| re-phase2 | ALL PASS(47) |
| re-phase3 | ALL PASS(27)particle 不変 |
| re-phase5 | ALL PASS(55)Semantic 不変 |
| re-stageA | ALL PASS(19) |
| re-stageB | ALL PASS(27)chip⇔panel 100%・破損 0 |
| re-stageD | ALL PASS(18) |
| re-stageE | ALL PASS(16) |

test:genitive FAIL=2 は Stage H-5 で確認済みの既存失敗(J-8b と無関係)。

---

## 5. 未解決範囲(Semantic 責務)

| 用法 | 対象 | 内容 |
|---|---|---|
| **person-leveling** | ἑαυτοῦ(G1438) | F-3 が yourselves/ourselves に流用。精密 person(私たち自身/あなたがた自身/彼ら自身)は **節の主語(文脈)** から決まる → Semantic。汎用「自分自身」を維持 |
| 再帰 vs 所有 | ἑαυτοῦ(G848) | αὐτῶν の再帰的用法か所有(their own)かの判別 → Semantic。「自分」を維持 |
| 強調 / identity | 全般 | 「自ら」「〜自身が」の強調用法 → Semantic |

- ἐμαυτοῦ/σεαυτοῦ の改善は **精度向上**(自分自身も誤りではない)であり、誤り訂正(αὐτós の 彼→それ)
  とは性質が異なる。person が形態(strong)で一意な 2 lemma に限定した安全な実装である。

---

## 6. 結論

- **再帰代名詞のうち person が strong で一意な ἐμαυτοῦ / σεαυτοῦ の 2 lemma を Registry 追加で実装成功**。
  80 件を「自分自身」→「私自身 / あなた自身」に精密化。ἑαυτοῦ(G1438/G848)は person-leveling のため
  Semantic 責務として保留(不変)。
- 既存回帰 8 スイート ALL PASS・chip⇔panel 100%・破損 0・αὐτós/τίス/関係詞 悪化 0・Semantic 悪化 0。
  再帰代名詞は非主格のため particle/coverage への波及がなく、**基準値更新も不要**(最も干渉の小さい追加)。
- 7 lemma(αὐτós/τίス/ὅς/ὅστις/ὅσος/ἐμαυτοῦ/σεαυτοῦ)が同一 Registry に併存し相互干渉なし。Engine 構造を
  変えず lemma 追加のみで拡張できることを再確認(J-2 方針の実証)。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版(ἐμαυτοῦ→私自身・σεαυτοῦ→あなた自身 実装・80件精密化・ἑαυτοῦ は Semantic 保留・基準更新不要) |
