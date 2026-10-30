# 冠詞11タイプ 初回独立監査メモ v0.1

- Date: 2026-10-30
- Scope: `syntax-registry.json` の article カテゴリ全11タイプ
- Source registry blob: `c44d13b6d128e3a6a2e302ad1ba0081d4cdadd00`
- Corpus: `public/bible_data/nt/{BOOK}/{CHAPTER}.json` on `main`
- Review status: first-pass; no production changes

## 1. 方針

冠詞が存在することと、冠詞が特定の意味・談話機能を担うことを区別する。名詞句の形態・語順・修飾関係をコーパスで確認し、単語リスト一致だけでは唯一性・総称性・照応性などを確定しない。

## 2. 本文データとの照合

| Legacy ID | 代表箇所 | コーパス上の対象 | 初回所見 |
|---|---|---|---|
| article.monadic | MAT 5:14 | τὸ φῶς / T-NSN + N-NSN | 冠詞＋名詞句は確認。唯一体的意味は語彙一致だけでは確定できず、例の適合性に疑義 |
| article.generic | MAT 5:13 | τὸ ἅλας / T-NSN + N-NSN | 冠詞付き述語名詞句。総称か比喩的な個別同定か、文脈を再検討 |
| article.previous_reference | JHN 4:9 | ἡ γυνὴ ἡ Σαμαρῖτις | 既出のサマリア人女性への照応候補 |
| article.par_excellence | JHN 1:21 | Ὁ προφήτης / T-NSM + N-NSM | 特定の期待された預言者称号を指す候補。一般的な「卓越性」と区別 |
| article.simple_identification | MAT 2:14 | τὸ παιδίον καὶ τὴν μητέρα | 既出の子どもと母親を指す。前出指示との重複可能性 |
| article.well_known | JHN 7:38 | ἡ γραφή / T-NSF + N-NSF | 共有知識としての「聖書」を指す候補 |
| article.abstract | ROM 13:10 | ἡ ἀγάπη / T-NSF + N-NSF | 抽象名詞の冠詞付き用例。総称・概念の個別化との境界を確認 |
| article.deictic | LUK 23:47 | ὁ ἄνθρωπος οὗτος | 冠詞名詞句＋後置指示代名詞。指示性が冠詞自体の機能か再検討 |
| article.kataphoric | JHN 15:20 | τοῦ λόγου οὗ ἐγὼ εἶπον | 後続関係節が名詞を限定する構造を確認 |
| article.granville_sharp | EPH 1:3 | ὁ θεὸς καὶ πατήρ | 単数の人称名詞が一冠詞＋καίで結ばれる構造。適用条件を別途確認 |
| article.colwell | JHN 1:1 | θεὸς ἦν ὁ λόγος | コプラ前の無冠詞述語主格と冠詞付き名詞句を確認。語順だけで主語・定性を決めない |

## 3. 初回に判明した問題

### 3.1 単一体・総称・抽象の境界

`article.monadic`、`article.generic`、`article.abstract` は、名詞の語彙分類だけでは区別できない。MAT 5:13–14 は比喩的な述語名詞句であり、冠詞の意味機能を独立に示す例として再評価が必要。

提案：名詞の語彙クラスは候補抽出に使い、個別箇所での指示範囲・種類全体・概念の個別化は文脈から判断する。

### 3.2 単純識別と照応

`article.simple_identification` の MAT 2:14 は、子どもと母親が直前の文脈で既に登場している。したがって、単純識別と前出指示は排他的なタイプではなく、同一名詞句に複数の説明が成り立つ可能性がある。

提案：記事・UIでは分類候補の階層や相互排他を前提にせず、「指示対象の同定」と「談話上の照応」を別軸として記述する。

### 3.3 指示性と冠詞

`article.deictic` の LUK 23:47 では οὗτος が明示的な指示語である。冠詞を独立した指示詞とみなすのではなく、冠詞名詞句全体と指示代名詞の組み合わせとして扱う必要がある。

### 3.4 コルウェル構文の名称と説明

`article.colwell` のラベル「主語標識」は誤解を招く。コルウェルの観察は、コプラに先行する無冠詞述語主格の定性に関するものであり、語順だけで主語を特定する規則ではない。現行説明はこの誤読を避ける注意書きを含むが、ID・ラベルは修正候補。

提案：冠詞の機能としてではなく、コプラ文における述語主格の語順・冠詞分布の構文観察として、独立した構文概念に再配置する。

### 3.5 グランビル・シャープ構文

一冠詞＋καί＋単数名詞という表面形だけでは十分でない。人称名詞・固有名詞・複数形・修飾句など、適用条件と除外条件を独立に定義し、すべての一致例を同一指示と断定しない。

## 4. 検出ロジックの初回所見

1. **monadic / generic / well_known / abstract / par_excellence**：登録語彙への一致は意味機能を証明しない。名詞の意味、文脈、談話上の指示対象を確認する。
2. **previous_reference**：同じレンマが前に現れたことだけでは、同一指示対象の再提示を証明しない。語義・指示対象・談話の連続性を確認する。
3. **simple_identification**：ヘッド名詞があることは通常の名詞句を認識するだけで、特殊な冠詞用法が不成立であることを示さない。
4. **deictic**：隣接する指示語は名詞句の指示性を示すが、冠詞自体の独立機能と混同しない。
5. **kataphoric**：後続する関係節があることと、その関係節が指示対象を初めて特定することを区別する。
6. **Granville Sharp**：構文パターン検出は適用条件を検証し、同一指示の意味判断を自動確定しない。
7. **Colwell**：述語主格・主語の識別と、定性・不定性の解釈を分離する。冠詞の有無だけで神学的・意味的結論を出さない。

## 5. 暫定処置案

| Legacy ID | 暫定処置案 | 次の確認 |
|---|---|---|
| article.monadic | unresolved | MAT 5:14の例の適合性と語彙リスト依存 |
| article.generic | unresolved | MAT 5:13の総称性と比喩的述語の区別 |
| article.previous_reference | retain_redefined | 先行指示対象と談話連続性 |
| article.par_excellence | unresolved | 称号・慣用表現との境界 |
| article.simple_identification | retain_redefined | 一般的な名詞句同定として扱い、特殊用法の不成立を意味しない |
| article.well_known | retain_redefined | 共有知識と語彙リスト一致の区別 |
| article.abstract | unresolved | 抽象名詞の個別化と総称の区別 |
| article.deictic | replace | 名詞句の指示性・指示詞との共起として再配置 |
| article.kataphoric | retain_redefined | 後続修飾と初出特定の区別 |
| article.granville_sharp | retain_redefined | 適用条件と同一指示の限界を明示 |
| article.colwell | replace | 冠詞用法ではなく述語主格の語順・定性の構文観察に再配置 |

## 6. 結論と次の作業

- 11タイプすべての代表箇所をNTコーパスで照合した。
- 単一体・総称・抽象の分類は、語彙リストだけでは個別箇所の機能を判定できない。
- 単純識別と前出指示は重複し得る。
- 指示性は冠詞だけでなく名詞句全体・指示詞・談話文脈で評価する。
- Colwellの観察を「主語標識」と呼ぶのは不正確であり、構文観察として再配置を検討する。
- 暫定処置は公開用分類の確定ではない。

No production code, syntax registry, or StudyPanel behavior was changed.
