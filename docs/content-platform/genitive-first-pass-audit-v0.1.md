# 属格22タイプ 初回独立監査メモ v0.1

- Date: 2026-10-30
- Scope: `syntax-registry.json` の genitive カテゴリ全22タイプ
- Source branch for legacy data: `main`
- Registry blob: `c44d13b6d128e3a6a2e302ad1ba0081d4cdadd00`
- Analyzer blob: `3441d097c6cbae923f0e4d431f541a13f60fdb10`
- Corpus: `public/bible_data/nt/{BOOK}/{CHAPTER}.json` on `main`
- Review status: first-pass; no production changes

## 1. この監査の意味

このメモはWallaceの分類を独自体系として承認するものではない。現行IDを監査対象として保持し、本文の実際の形態・語順・構文・文脈を確認して、概念の境界と検出ロジックの問題を洗い出す初回レビューである。

以下の提案はすべて暫定。複数の用例、反例、独立した文法資料による照合が済むまで、最終確定とはしない。

## 2. 本文データとの照合

現行レジストリの代表例について、NTコーパスの該当章データを読み、語形・格・語順を照合した。

| Legacy ID | 代表箇所 | コーパス上の確認対象 | 初回所見 |
|---|---|---|---|
| genitive.possessive | MAT 5:3 | τῶν οὐρανῶν / N-GPM | 属格形と名詞句内の位置は確認。意味関係は文脈を含め再検討 |
| genitive.descriptive | ROM 7:24 | τοῦ θανάτου / N-GSM | 形態と名詞句内の関係を確認。描写・関係・限定の境界を要検証 |
| genitive.partitive | ROM 11:17 | τινες τῶν κλάδων / N-GPM | 数量表現＋属格集合の構造を確認 |
| genitive.attributive | ROM 6:6 | τῆς ἁμαρτίας / N-GSF | 形態を確認。descriptiveとの区別を独立に立証する必要 |
| genitive.epexegetical | ROM 4:11 | περιτομῆς / N-GSF | 形態と名詞との関係を確認。「説明・内容・同格」の境界は要検証 |
| genitive.relationship | MAT 1:1 | υἱοῦ Δαυίδ / Δαυὶδ N-PRI | 親族関係の意味は明瞭。独立した格機能か、より広い関係・所有の下位例か要検証 |
| genitive.material | REV 18:12 | χρυσοῦ・ἀργύρου / N-GSM | 形態は確認。ここは「材料」より「積荷の内容・品目」と読む可能性があり、代表例の適合性に疑義 |
| genitive.content | JHN 21:8 | τῶν ἰχθύων / N-GPM | 「魚の入った網」という内容関係の候補。複数の対照例でmaterialとの境界を確認 |
| genitive.attributed | 登録例に verse ID なし | ἐν καινότητι ζωῆς | 例の出典と対象語を未確定。公開記事の根拠として使用不可 |
| genitive.predicate | 1CO 6:19 | ἑαυτῶν / F-2GPM | コプラ ἐστὲ と述語位置の属格を確認 |
| genitive.subjective | ROM 8:35 | τοῦ Χριστοῦ / N-GSM | 「キリストの愛」の属格。主語的か目的語的かは形態だけで決まらず文脈・談話を要する |
| genitive.objective | ROM 3:22 | Ἰησοῦ Χριστοῦ / N-GSM | 「イエス・キリストの信仰」の属格。subjectiveとの競合を保持すべき箇所 |
| genitive.plenary | 2CO 5:14 | τοῦ Χριστοῦ / N-GSM | 同じ属格が二方向に解釈できるという主張。単独の文法機能というより解釈上の仮説として扱うべき可能性 |
| genitive.comparison | MAT 3:11 | μού / P-1GS | 比較級 ἰσχυρότερος と属格の比較基準を確認 |
| genitive.separation | ROM 8:39 | ἀπὸ τῆς ἀγάπης / ἀγάπης N-GSF | 対象属格は前置詞 ἀπό に支配される。属格単独の意味機能と、前置詞句の意味を分離する必要 |
| genitive.time | JHN 3:2 | νυκτός / N-GSF | 時を表す裸の属格候補を確認 |
| genitive.place | LUK 16:24 | ὕδατος / N-GSN | 「水に浸す」の水。場所属格というラベルが適切か疑義。媒体・内容・動詞の補語関係を再分析 |
| genitive.agency | JHN 6:45 | θεοῦ（διδακτοὶ θεοῦ） | 登録例は文法的に行為者関係を検討できる構造。ただし該当章データの今回の自動取得が完了せず、token ID・形態の照合は保留 |
| genitive.means | 代表例なし | — | 代表用例がなく、検出条件も受動主動詞＋抽象名詞という間接的手掛かり。根拠不足 |
| genitive.source | JAS 1:13 | ἀπὸ θεοῦ / θεοῦ N-GSM | 属格は前置詞 ἀπό に支配される。前置詞句の起源・出所意味を「属格固有の用法」と混同しない |
| genitive.absolute | MAT 2:1 | τοῦ Ἰησοῦ γεννηθέντος / N-GSM + V-APP-GSM | 属格名詞句と属格分詞の一致を確認。独立した分詞構文として検証可能 |
| genitive.direct_object | JHN 10:3 | τῆς φωνῆς / N-GSF | ἀκούει の属格目的語候補。所有者 αὐτοῦ との係り受けを分けて確認 |

## 3. 初回に判明した概念上の問題

### 3.1 同一の構文を別カテゴリに重複登録

`genitive.absolute` と `participle.genitive_absolute` は、同じ属格絶対構文を名詞側・分詞側から別々に登録している。レジストリにも同一概念である旨の説明がある。

提案：言語中立ナレッジでは単一の構文ID（例：`construction.genitive_absolute`）に統合し、格分析と分詞分析は同一構文への別の観察・リンクとして保持する。StudyPanelの既存IDは移行期間中の別名として残す。

### 3.2 解釈上の議論を文法タイプとして固定する危険

`genitive.plenary` は、主語的・目的語的の両方に解釈できるという仮説を独立タイプとしている。しかし、これはまず曖昧性・多義的解釈の記述として扱うべきで、形態統語的な独立機能として固定するには追加根拠が必要。

提案：独立タイプとしては保留し、属格の解釈候補間の関係（両義性仮説）としてモデル化する案を検討する。

### 3.3 前置詞が支配する属格を、属格固有の機能と混同

`genitive.source` と `genitive.separation` の代表例はいずれも前置詞句である。属格形であることは事実だが、起源・分離の意味は前置詞と構文全体から生じる可能性が高い。

提案：前置詞の支配格（genitive）と、前置詞句の意味関係（source/separation）を別の分析軸にする。これらを属格名詞単独の候補として自動提示する設計は見直す。

### 3.4 下位タイプの境界が曖昧

- `descriptive` と `attributive`：独立した診断可能な差があるか未確認。
- `possessive` と `relationship`：後者は前者または広い関係属格の下位例である可能性。
- `material` と `content`：REV 18:12 の例が材料ではなく積荷の内容を指す可能性。
- `place`：LUK 16:24 の ὕδατος は場所というより媒体・内容・動詞補語の可能性。

提案：ラベルの言い換えではなく、各タイプが区別できる観察可能な条件と、反例・境界例を示せるかで統合／分割を判断する。

## 4. 検出ロジックの監査所見

現行 `syntax-analyzer.js` とレジストリの対応を確認した。次は少なくとも以下を修正候補として扱う。ただし今回は本番コードを変更していない。

1. **`genitive.attributive`**：`has_adjectival_equivalent()` は実装上常に false、`context_discourse_type_eq('semitic')` も自動判定不可で常に false。現状では「属性的」分類を裏付けるべき信号が実質的に動いていない。
2. **`genitive.epexegetical`**：`semantic_equivalence_test()` は常に false。意味上の「すなわち」テストを自動判定できないため、検出器が独立した意味機能を証明しているかのように扱ってはならない。
3. **`genitive.subjective` / `genitive.objective`**：両者の主要条件が同じ行為名詞リストに依存し、意味役割を区別する独立シグナルが弱い。現行検出は候補抽出にとどまり、主語的／目的語的判断を確定できない。
4. **`genitive.plenary`**：subjective/objective とほぼ同じ語彙トリガーを使うため、二重解釈を示す独立証拠がない。
5. **`genitive.means`**：受動態と抽象名詞の共起は手段関係の十分条件ではない。代表例もない。
6. **`genitive.source` / `genitive.separation`**：前置詞の意味・支配関係を属格名詞自体の意味として誤帰属する可能性。
7. **`genitive.place` / `genitive.material` / `genitive.content`**：語彙リスト一致を意味関係の証拠とみなさず、動詞・ヘッド・文脈との関係を個別に検証する必要がある。

### 検出器の読み方に関する注意

現行実装は、`detection.conditions` の全条件をANDで必須にしているわけではない。XSC signalに対応する条件を評価し、`required_signals` はAND、`required_signal_groups` はグループ間OR／グループ内ANDとして扱う。除外条件は先に評価される。

したがって、レジストリ内に条件があるだけでは、実際に必須条件として機能しているとは限らない。今後は各タイプごとに、どの条件が候補の必須条件・加点条件・除外条件なのかを明示する。

## 5. 暫定処置案

| Legacy ID | 暫定処置案 | 理由／次の確認 |
|---|---|---|
| genitive.possessive | retain_redefined | 一般的な所有・帰属関係の候補。複数例で範囲を定義 |
| genitive.descriptive | unresolved | attributiveとの境界を再検討 |
| genitive.partitive | retain_redefined | 全体集合と部分の関係。数量詞以外の例も検証 |
| genitive.attributive | merge | descriptiveとの独立性が未立証。自動判定条件も機能していない |
| genitive.epexegetical | retain_redefined | 内容・同格関係として独立性を検証。意味判定は人手根拠が必要 |
| genitive.relationship | merge | possessive／広い関係関係の下位タイプ候補 |
| genitive.material | unresolved | contentとの境界と代表例を再検証 |
| genitive.content | unresolved | materialとの境界を複数例で検証 |
| genitive.attributed | unresolved | 代表箇所・定義・反例を特定 |
| genitive.predicate | retain_redefined | コプラ構文における述語補語の候補として再定義 |
| genitive.subjective | retain_redefined | 動作名詞との意味役割関係。objectiveと対照例を追加 |
| genitive.objective | retain_redefined | 同上。形態だけで確定しない |
| genitive.plenary | replace | 独立した格機能ではなく解釈上の両義性仮説としてモデル化を検討 |
| genitive.comparison | retain_redefined | 比較基準の属格候補。比較級との構造条件を精査 |
| genitive.separation | replace | 前置詞句／動詞支配の意味関係として再配置を検討 |
| genitive.time | retain_redefined | 時間を表す副詞的属格候補。用例範囲を再検証 |
| genitive.place | unresolved | 代表例の意味関係に疑義 |
| genitive.agency | retain_redefined | 動形容詞等の補語関係として再検証 |
| genitive.means | unresolved | 代表例・独立証拠不足 |
| genitive.source | replace | 前置詞句の起源・出所関係として再配置を検討 |
| genitive.absolute | merge | participle.genitive_absoluteと単一構文IDへ統合案 |
| genitive.direct_object | retain_redefined | 動詞の格支配・語彙価数に基づく目的語候補 |

## 6. このバッチの結論

- 22タイプすべての代表例・定義・検出条件を初回確認対象にした。
- 19の代表箇所についてNTコーパスの該当節を確認した。JHN 6:45は今回の章データ取得が完了せず、例のtoken-level検証を保留。genitive.meansは代表例が未登録。
- 少なくとも4つの分類境界（descriptive/attributive、possessive/relationship、material/content、source/separation）に再設計の必要がある。
- `genitive.absolute` と `participle.genitive_absolute` の二重登録を確認した。
- 意味判定を担う一部のcheckが常にfalseであること、subjective/objective/plenaryの検出条件が意味役割を区別できていないことを確認した。
- ここで示した暫定処置は公開用分類の確定ではない。独立した文法分析と追加用例検証を経て決定する。

## 7. 次の作業

1. 属格の境界例・反例を新約聖書全体から追加抽出する。
2. 各候補の必要条件と十分条件を区別し、語彙リスト依存の検出を再評価する。
3. 主語的／目的語的属格のように意味判断を要する候補は、自動検出の限界を明示する。
4. 属格絶対の重複IDを、既存UI・検索・テストを壊さない移行案に落とす。
5. 属格カテゴリの独立レビューを完了してから、与格カテゴリへ進む。

No production code, syntax registry, or StudyPanel behavior was changed in this audit.
