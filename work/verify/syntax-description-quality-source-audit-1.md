# 統語ラベル説明242件・原典照合メモ（第1回）

- 対象: `public/assets/data/syntax-registry.json`（main）および `work/verify/syntax-description-quality-integrated-242-candidates-v2.md`
- 状態: **監査メモ。レジストリ・アプリコードは変更していない。**
- 範囲: まず根拠が確認しやすく、誤解や誤分類につながる危険が高い項目を確認。全242件の原典照合完了を意味しない。

## 重要な判定

### 1. `genitive.attributed` — 候補文の例を修正する必要あり

**判定: 候補文はそのまま採用しない。**

統合候補は `σῶμα τῆς ἁμαρτίας` を「被属性属格」の説明例として再掲している。しかし Wallace の *The Basics of New Testament Syntax* の公開抜粋では、この表現（Rom 6:6）は「attributive genitive」の例として明示され、その言い換えが “sinful body” とされている。その直後に別項目として “attributed genitive” が定義され、head noun 自体が意味上の形容詞として働く、という逆方向の関係が説明されている。

したがって、この例を `genitive.attributed` の肯定例として使うのは不適切。統合候補からこの例文を外し、`genitive.attributed` の例は原典で当該カテゴリに明示された例を確認できるまで保留する。レジストリの `example_verse: ROM 6:4` も、本文・原典の説明を追加確認する。

参照:
- Wallace, *The Basics of New Testament Syntax* 公開PDF（attributive genitive の Rom 6:6 の例と attributed genitive の定義）: https://www.amas.hk/pdf/shijianshenxue/4/3167%EF%BC%89The%20Basics%20of%20New%20Testament%20Syntax%20%28Daniel%20B.%20Wallace%29%20%28z-lib.org%29.pdf
- Wallace による attributed genitive の議論を紹介する論文: https://new.bible.org/article/legitimacy-attributed-genitive

### 2. `genitive.attributive` — 基本説明は妥当、ただし「ヘブライ語的」を定義に埋め込まない

**判定: 「ヘブライ語的用法」は補足扱いにし、類型そのものの定義と分ける。**

Wallace の公開抜粋は、`σῶμα τῆς ἁμαρτίας`（Rom 6:6）を attributive genitive の例として扱い、「罪深い体」と言い換えられることを示す。したがって、説明の核である「属格が中心名詞の性質・特徴を表し、形容詞的に言い換えられる」は根拠がある。一方、これを一律に「ヘブライ語的用法」と呼ぶと、意味関係の説明よりも起源・影響を断定する見出しになる。見出し・説明では定義を先に置き、ヘブライ語的表現との関係は必要なら注記として扱う。

### 3. `article.colwell` — 現行説明は規則を誤解させるため改稿必須

**判定: 現行維持にせず、候補文を差し替える。**

現行説明は「コプラ文で無冠詞の述語主格が動詞に先行する構文……冠詞側の名詞が主語であることを標識する」としている。これはコルウェルの観察を強すぎる形で言い換えている。Wallace を引用する公開文法ノートは、コルウェルの規則が後続研究で精緻化されていること、前動詞位置の無冠詞述語主格は通常「質的」、時に「定」、まれに「不定」であることを説明している。無冠詞・動詞前という条件だけで述語主格が定であると断定する規則ではない。

**推奨候補文:**
> コプラ文で、無冠詞の述語主格が動詞より前に置かれる構文。語順は解釈の手掛かりになるが、無冠詞だから定である、または冠詞側が主語だとこの規則だけで断定せず、主語・述語の関係と文脈を合わせて判断する。

参照: https://www.wrs.edu/assets/docs/Courses/Intermediate_Greek/Syntax_notes.pdf

### 4. `article.granville_sharp` — 必要条件を保ち、同一指示を機械的に断定しない

**判定: 定義の条件は概ね妥当。説明に「この型だけで同一指示を確定しない」注意を加える。**

現行説明は、冠詞＋名詞＋καί＋無冠詞名詞、単数・人称・非固有名詞という条件を含み、主要な識別条件を捉えている。ただし、この条件は対象名詞の種類・同格性なども関係する文法規則であり、見た目の語順だけから同一指示を無条件に断定する説明は避ける。

**推奨候補文:**
> 冠詞を伴う名詞と、καί で結ばれた無冠詞の名詞が、一人の人物を指すと解釈される構文。名詞の数・種類や文脈などの条件を確認し、冠詞の配置だけで同一指示と断定しない。

参照: https://www.wrs.edu/assets/docs/Courses/Intermediate_Greek/Syntax_notes.pdf

### 5. `particle.emphasis_per` / `particle.emphasis_toi` — dormant のまま維持

**判定: 原典確認待ちではなく、NT本文での未到達を明示した休眠型として扱う。**

main の監査記録では、περ と τοι の単独形は SBLGNT 本文に出現せず、εἴπερ・καθάπερ・μέντοι 等の複合形は別レンマとして扱うと明記されている。したがって、現在のNT検索で例がないことを検出バグと決めつけず、将来のLXXや異読対応のために型を保持する方針は合理的。ユーザー向け説明では「強意小辞」という語だけでなく、現在のNT本文では単独形が対象外であることを内部監査・開発資料に残す。読書UIで該当型が出現しない前提も維持する。

参照: https://github.com/uo-no/gnt-jp/blob/main/scripts/output/wallace-final-audit.md

### 6. 前置詞ラベル3種と `preposition.improper` — 一般化しすぎない

**判定: 第二監査案の短い定義はUI向けに使えるが、原典照合では対象語と格支配の一覧を別途検証する。**

固有前置詞は動詞の接頭辞としても使われる語群、非固有前置詞はそのような複合動詞を作らない語群として区別される。ただし、非固有前置詞が「ほぼ常に属格」と一括りにされるのは注意が必要で、個々の語によって格支配が異なる。第二監査案の「多くの場合は属格を伴うが、個々の前置詞の格支配を確認する」は現行より安全な表現。さらに、固有前置詞＋格の各型は、格だけでは前置詞の意味を一意に決められないことを説明するのがよい。

参照:
- https://gtmbiblicalgreek.com/grammar/chapter/46
- https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0007%3Apart%3D4%3Achapter%3D43

## 現時点の反映方針

| ID | 判定 | 次の扱い |
|---|---|---|
| `genitive.attributed` | 候補文に例の混同あり | 例を削除し、ROM 6:4 と原典の例を再確認 |
| `genitive.attributive` | 説明の核は妥当 | 「ヘブライ語的」は定義から分離 |
| `article.colwell` | 現行説明に重要な誤解リスク | 改稿候補を採用し、原典の条件と照合 |
| `article.granville_sharp` | 条件は概ね妥当 | 同一指示を語順だけで断定しない注意を追加 |
| `particle.emphasis_per` / `particle.emphasis_toi` | dormant 根拠あり | 休眠型として維持。UI表示対象にしない |
| 前置詞4型 | 第二監査案は安全寄り | 対象語一覧・格支配を次回照合 |

## 変更していないもの

このメモ作成では、`syntax-registry.json`、`hint_ja`、検出条件、スコア、UI、アプリコードを変更していない。ここに示した推奨文も、原典照合が必要なレビュー候補である。
