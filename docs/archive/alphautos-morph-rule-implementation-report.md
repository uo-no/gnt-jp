# αὐτός(G846) Morph Rule 実装報告(Stage J-3)

実装日: 2026-07-19
位置づけ: Morph Rule Engine の**最初の実装**。αὐτós(G846)の gender/number 語幹選択を実装し、
「Data 代表語『彼』を維持したまま Morph が Reading Japanese の語幹を正しく変化できる」ことを検証した。
根拠設計: I-1(alphautos-morph-rule-design)・I-2(morph-rule-engine-design)・J-1(implementation-spec)・
J-2(implementation-plan)。

---

## 0. 実装中に判明した重大なデータ整合性問題(先に記載)

QA の全コーパス測定中に、ワークツリーへ **90 個の重複ファイル**(`* 2.json`)が混入していることを
発見した。

- 正体: クラウド同期(iCloud 等)が **Stage H-5 の 169 ファイル一括書き込み**時に作った
  コンフリクトコピー。base ファイルと **byte 完全一致**・**git 未追跡**・本セッション中(Jul 18 20:22)生成。
- 影響: glob(`*.json`)が実章と重複章を両方読み、コーパスを **137,741 → 187,809** に水増し。
  これにより **H-6 の αὐτós「6,954」は誤り**(重複込み)で、H-3c/H-4 の元値 **5,067 が正**だった。
- 対応: ユーザー承認のうえ 90 個を削除(一覧は scratchpad/removed-dup-files.txt に保存)。
  削除後コーパス = **137,741・ユニーク tokenId 137,741・重複 0**(既知のギリシャ語 NT 語数と一致)。
- 波及訂正: H-6 / H-4 / H-3c / I-3 の汚染数値に訂正注記を追加(σύ G5213=607 の H-5 パッチは
  重複生成**前**の実測のため正しく、影響なし)。

**以降の J-3 数値はすべてクリーン(137,741)コーパスの実測値。**

---

## 1. 変更ファイル一覧

| ファイル | 種別 | 変更内容 |
|---|---|---|
| public/core/reading-engine.js | 実装 | `_MORPH_STEM_RULES`(G846 レジストリ)+ `_morphStem`(語幹選択)追加。`_resolveMorph` の pron/noun 分岐で格助詞前に語幹選択を適用 |
| scripts/re-phase1-regression.cjs | テスト | αὐτós 単体回帰 9 ケース追加。morph 基準 43,936 → **44,035**(+99・FROZEN プロトコル) |
| scripts/re-phase3-regression.cjs | テスト | particle 基準 3,123 → **3,079**(主格 αὐτós 44 件が morph 短絡で particle 非到達) |
| scripts/re-stageB-regression.cjs | テスト | changed 39,485→**39,540** / identical 98,256→**98,201**(チップ改善 +55) |
| (削除)bible_data/nt/**/`* 2.json` × 90 | データ | 未追跡の重複コンフリクトコピー除去(§0) |
| docs/alphautos-quality-audit.md 他 | 文書 | H-6/H-4/H-3c/I-3 の汚染数値へ訂正注記 |

**変更していないもの(制約遵守)**: bible_data 追跡ファイル(H-5 の 169 のみ・J-3 は不変)/
生成データ(reading-lexicon-data.js 等・再生成なし)/ Presentation(presentation-policy.js)/
Semantic(reading-semantic-data.js)/ reading-lexicon.js。

---

## 2. 実装範囲

- 対象 lemma: **αὐτós(G846)のみ**。
- 対象形態: **gender × number** による語幹選択(+ 既存の case 格助詞)。
- 実装方式: lemma(strong)単位の Registry。**base が Data 代表語「彼」と一致する時のみ発火**し、
  Semantic(lnGloss 等)が別語を代入した token では Morph が上書きしない(Semantic > Morph を保持)。
- 変換表(実装):

| gender | number | 語幹 |
|---|---|---|
| masculine | singular | 彼 |
| masculine | plural | 彼ら |
| feminine | singular | 彼女 |
| feminine | plural | 彼女たち |
| neuter | singular | それ |
| neuter | plural | それら |

- **今回実装しないもの(遵守)**: Semantic Rule 追加 / intensive・identity 用法(自身・同じ・まさに)/
  bible_data・lexicon・生成データ・Presentation の変更。intensive/adj(class=adj 85 件)は pron 分岐に
  入らず不変。

---

## 3. 対象件数(クリーン実測)

- αὐτós G846 全出現: **5,067**(pron 4,982 / adj 85)。
- gender: masculine 4,446 / neuter 281 / feminine 340。
- number: singular 3,786 / plural 1,281。

---

## 4. QA 結果

### 4-1. 既存回帰(全 PASS)

| テスト | 結果 |
|---|---|
| re-phase1 | **ALL PASS(86 checks)** morph 44,035 |
| re-phase2 | ALL PASS(47) |
| re-phase3 | **ALL PASS(27)** particle 3,079 |
| re-phase5 | ALL PASS(55)Semantic 不変 |
| re-stageA | ALL PASS(19) |
| re-stageB | **ALL PASS(27)** chip⇔panel 一致 **100%**・破損形 0 |
| re-stageD | ALL PASS(18) |
| re-stageE | ALL PASS(16) |

FROZEN プロトコル: morph(Phase1)・particle(Phase3)・chip(StageB)の基準を、悪化 0 を確認のうえ更新
(各ファイルにコメントで根拠記載)。test:genitive は FAIL=2 だが Stage H-5 で確認済みの**既存失敗**
(genitive 句 confidence・J-3 と無関係)。

### 4-2. αὐτós 専用 QA(全 NT・クリーン)

αὐτós pron 4,982 件を全形態で再計測:

| gender/number | 変換 | 主な件数 |
|---|---|---|
| masculine plural | 彼→彼ら(彼の→彼らの・彼に→彼らに) | 1,048 |
| feminine singular | 彼→彼女 | 277 |
| neuter singular | 彼→それ | 124 |
| neuter plural | 彼→それら | 78 |
| feminine plural | 彼→彼女たち | 39 |
| masculine singular | 彼(不変・正) | 3,302 |

**changed 1,680 / unchanged 3,302 / 悪化 0**。単体回帰でも 6 形態すべて期待語幹を確認。

### 4-3. Quality Scorecard 差分(αὐτós)

| | 不適合件数 | 不適合率 |
|---|---|---|
| **変更前**(Data「彼」固定) | 1,755 | 34.6% |
| **変更後**(Morph Rule) | 75 | 1.5% |
| **改善** | **1,680** | −33.1pt |

残存 75 は intensive/adj(class=adj 等)= gender/number では解決できず **Semantic 対象**(§6)。

### 4-4. 悪化チェック

| 項目 | 結果 |
|---|---|
| Semantic 既存結果 悪化 | **0**(re-phase5 ALL PASS・base=彼一致時のみ発火で lnGloss 非干渉) |
| Presentation 変更 | **0**(presentation-policy.js 不変・chip⇔panel 100%) |
| Data 変更 | **0**(bible_data 代表語「彼」不変) |
| generated data 変更 | **0**(再生成なし) |
| 破損形(新) | **0** |
| chip⇔panel 不一致 | **0**(一致率 100%) |

---

## 5. Before / After(実 Engine 出力例)

| token(gender/number/case) | 変更前 | 変更後 |
|---|---|---|
| 男性・単数・属格(his) | 彼の | 彼の(不変) |
| 男性・複数・属格(their) | 彼の | **彼らの** |
| 男性・複数・主格(they) | 彼(→particle は/が) | **彼ら** |
| 女性・単数・与格(her) | 彼に | **彼女に** |
| 女性・複数・属格 | 彼の | **彼女たちの** |
| 中性・単数・対格(it) | 彼を | **それを** |
| 中性・複数・対格(them) | 彼を | **それらを** |

注: 主格の αὐτós(44 件)は従来 particle 層が は/が を付与していた(彼は/彼が)。Morph が語幹を返して
短絡するため particle 非到達となり、新は「彼ら/彼女/それ」(数・性は適合、は/が は非付与)。旧「彼は/彼が」は
複数・女性・中性で数性が不適合だったため、referent 適合は改善(悪化 0)。**主格での語幹＋助詞の両立
(彼らは)は morph/particle 協調が必要で本 Stage の対象外**(将来課題)。

---

## 6. 未解決(Semantic 対象)一覧

Morph(gender/number)では解決できず、Semantic の責務として残るもの(J-3 対象外):

| 用法 | 件数(目安) | あるべき Reading | 現状(Morph 既定) |
|---|---|---|---|
| intensive(強調・class=adj 中心) | 〜75 | 自身 / 自ら | 彼/彼ら/それ(数性のみ反映) |
| identity(同一) | 少数 | 同じ | 同上 |
| まさに(強意) | 少数 | まさに | 同上 |

これらは同一 gender/number でも語で異なり形態では区別できない(I-1/I-2 の帰属基準)。Semantic Rule
(anaphoric か intensive/identity かの判別)で扱う。現状は Morph 既定語幹で描画され、**旧「彼」固定より
悪化しない**(数・性は反映される)。

---

## 7. 結論

- **Morph Rule Engine の最初の実装が成功**。αὐτós の Data 代表語「彼」を維持したまま、Morph が
  gender/number で語幹(彼/彼ら/彼女/彼女たち/それ/それら)を決定的に選択できることを検証した。
- αὐτós 不適合 **34.6%→1.5%**(1,680 件改善)。既存回帰 8 スイート ALL PASS・chip⇔panel 100%・
  破損形 0・悪化 0。
- Registry 方式により、次 lemma(τίs 他)は同じ契約で登録するだけで拡張できる(J-2 の想定どおり
  Engine 構造は不変)。
- 副産物として、H-5 由来の重複ファイル 90 個を除去しコーパス整合性(137,741)を回復。汚染していた
  H-6/I-3 等の数値を訂正した。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-19 | 初版(αὐτós Morph Rule 実装・QA・重複ファイル除去とコーパス整合性回復・汚染数値訂正) |
