# 接続詞12タイプ 初回独立監査メモ v0.1

- Date: 2026-10-31
- Scope: `syntax-registry.json` の conjunction カテゴリ全12タイプ
- Source registry blob: `c44d13b6d128e3a6a2e302ad1ba0081d4cdadd00`
- Corpus: `public/bible_data/nt/{BOOK}/{CHAPTER}.json` on `main`
- Review status: first-pass; no production changes

## 1. 方針

現行の分類名を独立体系として承認するものではない。代表例のコーパス形態を確認し、概念の境界、用例の適合性、検出条件の妥当性を初回点検した。暫定処置はすべて再検証前提である。

このカテゴリは、カテゴリ説明自身が「節側の分類（clause.*）と二層構造をなす」と明記する通り、接続詞トークンそのものの語彙的分類である。等位6タイプはレンマのみで決まり、従属6タイプはレンマ＋「従属節内にある」ことで決まる。

## 2. 本文データとの照合

| Legacy ID | 代表箇所 | コーパス上の標識 | 初回所見 |
|---|---|---|---|
| conjunction.coordinating_additive | JHN 1:4 | καὶ（CONJ） | 基本機能として整合 |
| conjunction.coordinating_adversative | 1CO 15:10 | ἀλλὰ（CONJ） | 整合 |
| conjunction.coordinating_transition | ROM 1:13 | δὲ（CONJ） | 整合。相関の δέ とも重なる |
| conjunction.coordinating_inferential | ROM 12:1 | οὖν（CONJ） | 整合 |
| conjunction.coordinating_explanatory | ROM 1:16 | γὰρ（CONJ） | 整合 |
| conjunction.correlative_men_de | ROM 6:11 | μὲν（PRT） | 相関構文として整合 |
| conjunction.subordinating_purpose | MAT 5:16 | ὅπως（ADV表記・class=conj） | 整合 |
| conjunction.subordinating_content | MAT 5:17 | ὅτι（CONJ） | 例は整合。粒度の問題あり（3.2） |
| conjunction.subordinating_temporal | MAT 6:2 | Ὅταν（CONJ） | 整合 |
| conjunction.subordinating_conditional | MAT 12:28 | εἰ（COND） | 整合 |
| conjunction.subordinating_result | MAT 8:24 | ὥστε（CONJ） | 整合 |
| conjunction.subordinating_comparative | JHN 13:34 | καθὼς（ADV表記・class=conj） | 整合 |

12タイプすべての代表箇所をNTコーパスで照合した（corpus_verified = yes ×12）。なお ὅπως・καθώς はコーパスの morph が ADV だが class は conj であり、検出はレンマ基準のため影響しない。

## 3. 初回に判明した問題

### 3.1 等位接続詞の「機能」は語彙の既定値である

等位6タイプはすべてレンマだけで判定される。καί＝連結、ἀλλά＝逆接、οὖν＝帰結という対応は、各語の代表的な機能としては正しい。しかし個別の出現では、καί が「〜も」の付加や説明に、οὖν が単なる話の継続に、γάρ が確認・強調に使われることがある。用法定タイプではなく「接続詞の基本機能（既定値）」として再定義し、個別の機能は文脈・談話の軸で上書きできる形が実態に合う。談話カテゴリの監査とあわせて扱うべき論点である。

### 3.2 ὅτι の二層の粒度が揃っていない

従属接続（内容）は、従属節内の ὅτι すべてに立つ。一方、節カテゴリは同じ ὅτι を導入動詞リストによって内容節と理由節に分けている（節監査参照）。つまり理由の ὅτι にも、語レベルでは「内容」というラベルが付く。二層構造である以上、語レベルは中立的な従属標識の同定に留め、機能の確定は節レベルに委ねるか、少なくとも両層の粒度を揃える必要がある。

### 3.3 転換（δέ）と相関構文の重なり

転換タイプの必須条件はレンマ δέ だけであり、「前に μέν がない」という条件（no_men）は定義されているものの必須には含まれていない。そのため μέν…δέ の δέ には転換と相関構文の両方が立つ。alternatives で相互に参照し合う設計ではあるが、候補提示の側では同じ語に実質競合する2候補が並ぶ。相関構文が立つ場合は転換を抑える、といった優先関係の明記が望ましい。

### 3.4 ὡς の補助条件が両義的

ὡς は内容タイプと比較タイプの両方に補助条件として現れる。ὡς 自体は様態・比較・時間・理由など多義であり、この条件だけではどちらの機能も補強しない。補助条件としての意味づけを Pass C で確認する。

## 4. 検出ロジックの初回所見

1. **再現性は高い**：レンマ基準のため、等位・従属とも判定は安定している。問題は精度ではなく、ラベルが主張する意味の範囲である。
2. **従属の判定は節区切りに依存**：`clause_is_subordinate` は節解析が付けたフラグ（ctx.subordinateClause）を読む。節カテゴリと同じく、節境界の精度が前提になる。
3. **相関構文の信号グループは良い設計**：必須条件を「μέν側の条件か δέ側の条件か」のグループで定義する方式は、2語で1構文をなすタイプの判定として妥当であり、他カテゴリの構文タイプにも応用できる。

## 5. 暫定処置案

| Legacy ID | 暫定処置 | 次に確認すること |
|---|---|---|
| conjunction.coordinating_additive | retain_redefined | 語彙の基本機能として保持。個別機能は談話の軸へ |
| conjunction.coordinating_adversative | retain_redefined | 同上 |
| conjunction.coordinating_transition | retain_redefined | 相関構文との優先関係を明記 |
| conjunction.coordinating_inferential | retain_redefined | 語彙の基本機能として保持 |
| conjunction.coordinating_explanatory | retain_redefined | 同上 |
| conjunction.correlative_men_de | retain_redefined | 構文タイプとして保持 |
| conjunction.subordinating_purpose | retain_redefined | 二層構造の語側として保持 |
| conjunction.subordinating_content | retain_redefined | 節側の内容／理由の区別と粒度を揃える |
| conjunction.subordinating_temporal | retain_redefined | 二層構造の語側として保持 |
| conjunction.subordinating_conditional | retain_redefined | 類別は節側に委ね、語側は標識の同定に留める |
| conjunction.subordinating_result | retain_redefined | 二層構造の語側として保持 |
| conjunction.subordinating_comparative | retain_redefined | ὡς の補助条件の意味づけを確認 |

## 6. 結論と次の作業

- 12タイプすべての代表例をNTコーパスで照合した（12/12）。
- 暫定処置は retain_redefined 12件。ただし等位側は「語彙の基本機能」への再定義、従属側は節カテゴリとの二層の役割分担の明示が条件である。
- この監査が終わると一次監査済みは 163/242 タイプ（14カテゴリ）になる。残りは3カテゴリ／79タイプ。
- 次の候補：小辞（21タイプ、等位接続詞の基本機能と談話の軸が接する）、談話（10タイプ）。
