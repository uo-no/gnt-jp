# 与格14タイプ 初回独立監査メモ v0.1

- Date: 2026-10-30
- Scope: `syntax-registry.json` の dative カテゴリ全14タイプ
- Source registry blob: `c44d13b6d128e3a6a2e302ad1ba0081d4cdadd00`
- Corpus: `public/bible_data/nt/{BOOK}/{CHAPTER}.json` on `main`
- Review status: first-pass; no production changes

## 1. 方針

現行の分類名を独立体系として承認するものではない。代表例のコーパス形態・語順・構造を確認し、概念の境界、用例の適合性、検出条件の妥当性を初回点検した。暫定処置はすべて再検証前提である。

## 2. 本文データとの照合

| Legacy ID | 代表箇所 | コーパス上の対象 | 初回所見 |
|---|---|---|---|
| dative.indirect_object | MAT 7:6 | τοῖς κυσίν / N-DPM | δίδωμι の受け手を示す構造を確認 |
| dative.interest_advantage | ROM 6:10 | τῷ θεῷ / N-DSM | 「神に向かって生きる」関係。利益・受益と断定せず、referenceとの境界を要検証 |
| dative.interest_disadvantage | ROM 8:7 | τῷ νόμῳ / N-DSM | ὑποτάσσεται の補語・格支配の可能性があり、不利益の与格の代表例として疑義 |
| dative.reference | ROM 6:11 | τῇ ἁμαρτίᾳ・τῷ θεῷ / N-DSF・N-DSM | 「罪に対して死に、神に対して生きる」という観点・関係の候補 |
| dative.ethical | MAT 21:5 | σοι / P-2DS | 倫理的与格か、到達点・関心・利益の与格かを文脈で再検討 |
| dative.possession | LUK 2:7 | αὐτοῖς / P-DPM | 所有・存在構文の候補。ただし検出条件のPOS指定と実際のP形態が一致しない可能性 |
| dative.direct_object | MAT 4:10 | αὐτῷ / P-DSM | λατρεύω の格支配に基づく目的語候補 |
| dative.sphere | ACT 16:5 | τῇ πίστει / N-DSF | 「信仰において」の領域・範囲を表す候補 |
| dative.time | JHN 2:1 | τῇ ἡμέρᾳ τῇ τρίτῃ / N-DSF | 時点を示す構造を確認 |
| dative.means | ROM 3:28 | πίστει / N-DSF | 手段・媒介の候補。信仰の意味解釈と文法機能を分ける必要 |
| dative.manner | JHN 7:26 | παρρησίᾳ / N-DSF | 「公然と／率直に」の様態候補 |
| dative.association | ROM 6:4 | αὐτῷ / P-DSM | συν-動詞との結びつき・共同関係の候補 |
| dative.agent | LUK 23:15 | αὐτῷ / P-DSM | 完了受動分詞 πεπραγμένον に関係する行為者候補。POS指定を要確認 |
| dative.measure | ROM 5:9 | πολλῷ / A-DSN | μᾶλλον と共起する程度表現を確認 |

## 3. 初回に判明した問題

### 3.1 代表例の意味分類に疑義

- `dative.interest_disadvantage` の ROM 8:7 は、ὑποτάσσω が与格補語を取る構造として分析できる可能性がある。「不利益」という意味ラベルより、動詞の格支配を先に検証すべき。
- `dative.interest_advantage` の ROM 6:10 は、利益・受益よりも「神に対して／神との関係で生きる」という参照・関係の意味が考えられる。
- `dative.ethical` の MAT 21:5 は、σοι が「あなたに来る」という到達点・関心の与格としても読める。倫理的与格と確定しない。
- `dative.means` の ROM 3:28 は、πίστει の文法的な手段関係と、信仰の神学的意味を混同しない。

### 3.2 POSコードと代表例の不一致の可能性

`dative.possession` と `dative.agent` の条件には `target_pos_eq('R')` が使われている。一方、代表例の αὐτοῖς / αὐτῷ はコーパス上 `P-DPM` / `P-DSM` と記録されている。

この条件が実際に何を意味するか、`target_pos_eq` の実装と呼び出し時のPOS正規化を追加確認する。もし単純なPOSコード比較なら、登録された代表例自体が条件を通過しない可能性がある。

### 3.3 関係・意味の分類が重なる

- `interest_advantage`、`interest_disadvantage`、`reference` は、利益／不利益／関係・観点をどこまで独立した機能として区別できるか検証が必要。
- `sphere` と `reference` は重なる例がある。名詞の語彙リストだけで区別しない。
- `means` と `manner` は「何によって」と「どのように」の差を、名詞の意味・動詞との関係・文脈で説明できるか検証する。

## 4. 検出ロジックの初回所見

1. `dative.ethical` は代名詞の語彙リストに依存するが、代名詞であることだけでは倫理的関与を証明できない。
2. `dative.interest_disadvantage` は否定・対立的な動詞を手掛かりにしているが、否定的文脈だけで不利益関係を決められない。
3. `dative.interest_advantage` と `dative.reference` は語彙リストの違いが中心で、同一用例での競合を比較する必要がある。
4. `dative.possession` / `dative.agent` の `target_pos_eq('R')` と実例のPOSコードの不一致を確認する。
5. `dative.association` は συν-動詞または σύν 前置詞を検出するが、前置詞支配と動詞の接頭辞を同じ根拠として扱わず、構文関係を区別する。
6. `dative.means` は `after_preposition` 条件を持つが、同じタイプの `no_preposition` も必要条件に含む。どちらが必須・加点・除外として実行されるかを評価器の契約に沿って確認する。
7. `dative.time` は `prev_pos_eq('T')` に依存する。冠詞を挟む構造・語順の異なる例を取りこぼさないかを調べる。
8. `dative.manner` の `semantic_substitution_test('adverb')` は自動判定の限界を確認し、false固定なら意味分類の根拠として扱わない。

## 5. 暫定処置案

| Legacy ID | 暫定処置案 | 次の確認 |
|---|---|---|
| dative.indirect_object | retain_redefined | 受け手・到達先と動詞の格支配を区別 |
| dative.interest_advantage | unresolved | referenceとの境界・ROM 6:10の再分析 |
| dative.interest_disadvantage | unresolved | ROM 8:7が動詞支配与格ではないか検証 |
| dative.reference | retain_redefined | sphere・interestとの境界 |
| dative.ethical | unresolved | MAT 21:5のσοιの機能を再分析 |
| dative.possession | retain_redefined | 存在構文の分析とPOS条件修正要否 |
| dative.direct_object | retain_redefined | 動詞価数・格支配辞書の複数例検証 |
| dative.sphere | retain_redefined | referenceとの区別 |
| dative.time | retain_redefined | 時点・期間・時間の範囲の区別 |
| dative.means | retain_redefined | 手段・媒介と様態の境界 |
| dative.manner | retain_redefined | 副詞置換は補助証拠に限定 |
| dative.association | retain_redefined | 動詞接頭辞と前置詞句の区別 |
| dative.agent | retain_redefined | 受動構文の条件とPOSコード確認 |
| dative.measure | retain_redefined | 程度表現の独立性と比較構文との関係 |

## 6. 結論と次の作業

- 14タイプすべてについて代表例の該当節をコーパスで確認した。
- 少なくとも `interest_disadvantage`、`interest_advantage`、`ethical` は代表例の意味分類を再検討する必要がある。
- `possession` と `agent` にはPOS条件の不一致疑いがある。
- 与格の意味分類は語彙リストだけで決めず、動詞の格支配、構文関係、文脈を別々に記録する。
- ここでの暫定処置は公開用分類の確定ではない。

次は、属格・与格の共通概念（関係・基準・手段・行為者・格支配）を横断比較し、その後、分詞カテゴリの初回監査に進む。

No production code, syntax registry, or StudyPanel behavior was changed.
