# 名詞句構文12タイプ 初回独立監査メモ v0.1

- Date: 2026-10-31
- Scope: `syntax-registry.json` の nominal_syntax カテゴリ全12タイプ
- Source registry blob: `c44d13b6d128e3a6a2e302ad1ba0081d4cdadd00`
- Corpus: `public/bible_data/nt/{BOOK}/{CHAPTER}.json` on `main`
- Review status: first-pass; no production changes

## 1. 方針

現行の分類名を独立体系として承認するものではない。代表例のコーパス形態・語順・構造を確認し、概念の境界、用例の適合性、検出条件の妥当性を初回点検した。暫定処置はすべて再検証前提である。

このカテゴリは、レジストリ自身が「既存カテゴリの判定は置き換えず、名詞句ヘッドにのみ候補を追加する横断カテゴリ」と定義している。つまり設計の時点で、格の機能と並列の「用法タイプ」ではなく、名詞句の構造を記述する観察層である。監査の中心論点は、独立体系でこの層をどう位置づけるかになる。

## 2. 本文データとの照合

| Legacy ID | 代表箇所 | コーパス上の対象 | 初回所見 |
|---|---|---|---|
| nominal_syntax.simple_np | JHN 1:6 | ἄνθρωπος / N-NSM | 無冠詞。ただし分詞修飾あり（3.2） |
| nominal_syntax.articular_np | JHN 1:14 | ὁ λόγος / N-NSM | 冠詞あり |
| nominal_syntax.anarthrous_np | JHN 1:6 | ἄνθρωπος / N-NSM | simple_np と同一トークン |
| nominal_syntax.modified_np | MAT 12:35 | ὁ ἀγαθὸς ἄνθρωπος | 形容詞修飾あり |
| nominal_syntax.multiple_modifier_np | MAT 6:11 | τὸν ἄρτον ἡμῶν τὸν ἐπιούσιον | 属格＋反復冠詞形容詞 |
| nominal_syntax.appositional_np | MAT 1:6 | τὸν Δαυὶδ τὸν βασιλέα | 同格並置 |
| nominal_syntax.substantival_phrase | MAT 5:3 | οἱ πτωχοί / A-NPM | 形容詞の名詞化（句レベル） |
| nominal_syntax.head_initial_np | LUK 8:11 | ὁ λόγος τοῦ θεοῦ | 主名詞先行 |
| nominal_syntax.head_final_np | MAT 12:35 | ὁ ἀγαθὸς ἄνθρωπος | modified_np と同一トークン |
| nominal_syntax.nested_np | MAT 8:20 | ὁ υἱὸς τοῦ ἀνθρώπου | 深さ2 |
| nominal_syntax.complex_np | 2CO 4:4 | φωτισμὸν＋属格連鎖 | 深さ3以上 |
| nominal_syntax.vocative_np | MAT 6:9 | Πάτερ / N-VSM | 呼格 |

12タイプすべての代表箇所をNTコーパスで照合した（corpus_verified = yes ×12）。

## 3. 初回に判明した問題

### 3.1 カテゴリ全体が「タイプ」ではなく名詞句の属性集合

12タイプは、冠詞の有無・修飾スロット数・主名詞の位置・属格の深さ・同格の有無という、名詞句の構造属性の組み合わせである。1つの名詞句に複数の属性が同時に当てはまるのが通常であり（例：MAT 12:35 の ἄνθρωπος は有冠詞・修飾あり・主名詞末尾が同居する）、候補が競合する「用法タイプ」とは性質が違う。

独立体系では、このカテゴリはタイプ列挙ではなく、名詞句ごとの属性セット（冠詞：有／無、修飾スロット数：n、主名詞位置：先頭／末尾、深さ：n、同格：有／無）として再編するのが適切である。格の機能（主格・属格など）は従来通り格カテゴリ側が担い、構造属性はその根拠・文脈として付随する。

なお、articular_np と anarthrous_np の説明文が「有冠詞だから必ず特定とは限らない」「無冠詞であることだけから意味を決めることはできない」と明記している点は、形から意味を決めないという監査方針と一致しており、評価できる。

### 3.2 「修飾数」は個数ではなくスロットの種類数であり、分詞修飾を数えない

検出の `_npModifiers` は、一致する形容詞（複数あっても1として数える）・後続属格・反復冠詞による修飾・前置された冠詞付き句を、それぞれ最大1ずつ数える。つまり「複数修飾」は修飾語が2つ以上という意味ではなく、修飾の種類が2系統以上あるという意味である。

さらに、冠詞を伴わない分詞修飾は数えられない。その結果、simple_np の代表例 JHN 1:6 の ἄνθρωπος は、実際には ἀπεσταλμένος παρὰ θεοῦ という分詞修飾を持つにもかかわらず「無修飾」と判定される。代表例自体がカウンタ定義の限界を露出している。

### 3.3 深さは有冠詞属格ユニットの連続だけを数える

`_npDepth` は、ヘッドの後ろに続く「冠詞（属格）＋（形容詞）＋名詞（属格）」のユニット数だけを数える。無冠詞の属格連鎖は深さに現れない。2CO 4:4 のような有冠詞連鎖では機能するが、深さという属性の定義としては部分的な実装であることを記録する。

### 3.4 他カテゴリとの二重記述

- vocative_np は呼格カテゴリと対象が重なる（格の機能は呼格側が担うべきもの）。
- appositional_np は主格カテゴリの同格タイプと横断的に重なる。独立体系では同格は1か所に一本化する。
- substantival_phrase は形容詞・分詞の実体用法を句レベルで見直したものである。ただし前置詞句の名詞化（οἱ ἐν τῷ οἴκῳ の型）は形容詞・分詞カテゴリに受け皿がなく、この句レベルの観察にだけ存在する。統合時に消えないよう残課題として記録する。

## 4. 検出ロジックの初回所見

1. **判定は Phrase API 依存**：句の範囲（ctx.phrase）が取れない場合は対象の左3語までで代用するなど、句解析の品質に判定が左右される。Pass C では句解析自体の精度も対象になる。
2. **属性としては妥当な実装が多い**：冠詞の有無、主名詞の位置（内容語2つ以上の句に限る）、同格の隣接判定（コプラ節の述語主格と区別するため主格の裸隣接を同格と見なさない配慮がある）など、観察の道具としてはよくできている。問題は分類上の置き場所である。

## 5. 暫定処置案

| Legacy ID | 暫定処置 | 次に確認すること |
|---|---|---|
| nominal_syntax.simple_np | merge | 無冠詞＋修飾スロット0の派生状態として表現 |
| nominal_syntax.articular_np | retain_redefined | 構造属性（冠詞あり）として保持 |
| nominal_syntax.anarthrous_np | retain_redefined | 構造属性（冠詞なし）として保持 |
| nominal_syntax.modified_np | retain_redefined | 修飾の有無の属性として保持。スロット数の定義を明記 |
| nominal_syntax.multiple_modifier_np | merge | 修飾スロット数を数値属性化して統合 |
| nominal_syntax.appositional_np | retain_redefined | 主格の同格と一本化したうえで構造関係として保持 |
| nominal_syntax.substantival_phrase | merge | 形容詞・分詞の実体用法へ統合。前置詞句の名詞化は残課題 |
| nominal_syntax.head_initial_np | retain_redefined | 語順の属性として保持 |
| nominal_syntax.head_final_np | retain_redefined | 語順の属性として保持 |
| nominal_syntax.nested_np | retain_redefined | 深さの属性として保持。無冠詞連鎖の扱いを検討 |
| nominal_syntax.complex_np | merge | 深さを数値属性化して統合 |
| nominal_syntax.vocative_np | merge | 呼格カテゴリへ統合 |

## 6. 結論と次の作業

- 12タイプすべての代表例をNTコーパスで照合した（12/12）。
- 暫定処置は retain_redefined 7件、merge 5件。カテゴリ全体については、独立体系で「名詞句の構造属性セット」へ再編する方針を記録した。
- この監査が終わると一次監査済みは 132/242 タイプ（11カテゴリ）になる。残りは6カテゴリ／110タイプ。
- 名詞句内部クラスタ（冠詞・代名詞・形容詞・名詞句構文）はこれで一巡した。次の候補：関係代名詞と役割を分け合う節（clause、12タイプ）、または小さい前置詞（7タイプ）。
