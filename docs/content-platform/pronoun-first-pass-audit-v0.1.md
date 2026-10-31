# 代名詞12タイプ 初回独立監査メモ v0.1

- Date: 2026-10-31
- Scope: `syntax-registry.json` の pronoun カテゴリ全12タイプ
- Source registry blob: `c44d13b6d128e3a6a2e302ad1ba0081d4cdadd00`
- Corpus: `public/bible_data/nt/{BOOK}/{CHAPTER}.json` on `main`
- Review status: first-pass; no production changes

## 1. 方針

現行の分類名を独立体系として承認するものではない。代表例のコーパス形態・語順・構造を確認し、概念の境界、用例の適合性、検出条件の妥当性を初回点検した。暫定処置はすべて再検証前提である。

代名詞カテゴリは性質の異なる軸が混在している：語彙クラス（人称・再帰・相互など）、1語 αὐτός の位置による機能区別（強意／同一）、所有形容詞、相互の構文環境（前置詞句）。この混在を前提に、タイプごとに「何の軸の分類か」を記録した。

## 2. 本文データとの照合

| Legacy ID | 代表箇所 | コーパス上の対象 | 初回所見 |
|---|---|---|---|
| pronoun.personal | JHN 8:12 | Ἐγώ / P-1NS, type=personal | 明示主格は対比・強調を帯び得る。語彙クラスとしては妥当 |
| pronoun.intensive | 1TH 4:16 | αὐτὸς / P-NSM（冠詞付き κύριος の前） | 述語位置の基準と整合 |
| pronoun.identical | 1CO 12:5 | αὐτὸς / P-NSM, class=adj（冠詞直後） | 位置基準と整合。品詞タグは adj |
| pronoun.reflexive | PHP 2:8 | ἑαυτὸν / F-3ASM, lemma ἑαυτοῦ | レンマで同定可能 |
| pronoun.reciprocal | JHN 13:34 | ἀλλήλους / C-APM（節内に2回） | レンマで同定可能 |
| pronoun.demonstrative | JHN 1:2 | οὗτος / D-NSM, type=demonstrative | タグと一致 |
| pronoun.relative | MRK 3:29 | ὃς / R-NSM（文頭） | 先行詞のない不定関係節。検出条件と不一致（3.2） |
| pronoun.interrogative | MAT 6:31 | Τί / I-ASN, type=interrogative | タグと一致。例は審議疑問 |
| pronoun.indefinite | GAL 6:1 | τινι / X-DSN, type=indefinite | タグと一致 |
| pronoun.distributive | 1CO 3:8 | ἕκαστος / A-NSM, class=adj | 品詞タグは adj |
| pronoun.reciprocal_emphasis | 1TH 3:12 | ἀλλήλους / C-APM（εἰς の支配下） | 相互の前置詞句用法。「強調」の独立性は弱い（3.3） |
| pronoun.possessive_pronoun | JHN 8:16 | ἐμὴ / S-1SNSF, class=adj, type=possessive | 実体は所有形容詞（3.4） |

12タイプすべての代表箇所をNTコーパスで照合した（corpus_verified = yes ×12）。

## 3. 初回に判明した問題

### 3.1 αὐτός が3タイプ＋属格に分散している

αὐτός は personal（斜格の人称用法）、intensive（述語位置）、identical（限定位置）の3タイプに分かれ、所有の αὐτοῦ は属格カテゴリ側で扱われる。位置による強意／同一の区別は観察可能な基準として妥当だが、独立ナレッジでは「αὐτός という語の地図」を1枚にし、位置・格・冠詞との関係を軸として整理すべきである。特に主格の αὐτός は強意と競合し、personal の残余クラス（NOT条件で定義）に入る設計は、説明の際に誤解を招きやすい。

### 3.2 関係代名詞：必須条件と登録例自身が一致しない

`pronoun.relative` の required_signals は `rel_lemma` と `antecedent`（前方に性・数一致の名詞）の両方を必須とする。しかし登録例 MRK 3:29 の ὃς は文頭にあり、先行詞を持たない不定関係節である（レジストリ自身の gloss も「不定関係節」と明記）。分析単位（文）内に先行する名詞はないため、この例は自タイプの必須条件を満たさない。

提案：先行詞の有無は必須条件ではなく下位区別（先行詞を修飾する関係節／先行詞のない自由関係節）として再定義する。検出ロジックの本格監査（Pass C）で、他の関係節タイプ（clause カテゴリ側）との役割分担とあわせて確認する。

### 3.3 相互強調（前置詞句）の独立性

`pronoun.reciprocal_emphasis` は εἰς／πρὸς＋ἀλλήλους という構文環境を独立タイプとしているが、「強調」という機能は相互そのものと区別できる観察可能な根拠が弱い。レジストリ自身も低確度（default_confidence 40）としている。前置詞句に入ることは相互代名詞の構文環境として記録し、独立タイプとしては reciprocal への統合（merge）を提案する。

### 3.4 所有の表し方が2カテゴリに分散している

`pronoun.possessive_pronoun` の実体は所有形容詞（ἐμός・σός 等）で、コーパスでも class=adj、Wallace 参照自体が「所有形容詞」である。一方、NTで所有を表す主な手段は人称代名詞の属格（αὐτοῦ 等）で、そちらは属格カテゴリ側にある。独立ナレッジでは「所有表現」という概念の下に、属格形と所有形容詞を2つの形式的実現として並べるのが適切である。

### 3.5 コーパスの品詞タグがカテゴリと揃っていない

identical・distributive・possessive の対象語はコーパスで class=adj、再帰・相互の対象語は type=personal とタグ付けされている。現行の検出は主にレンマリストと位置に依存するため実害は小さいが、`pronoun_type()` を条件に使うタイプ（demonstrative／indefinite／possessive）では、タグ付け規約がそのまま判定基準になる。説明コンテンツでは「代名詞」という品詞名と、実際の形態クラスが一致しない場合があることを前提にする。

## 4. 検出ロジックの初回所見

1. **レンマリスト中心の設計は透明**：12タイプ中多くがレンマ＋（位置 or typeタグ）で、代表例は relative を除き自タイプの必須条件と整合する。
2. **intensive_position は形容詞の述語位置アルゴリズムの流用**（冠詞付き一致名詞が±5語以内にあること）。冠詞を伴わない固有名詞と組む αὐτός（例：固有名詞＋αὐτός）では述語位置が成立せず、personal に流れる可能性がある。対照例での確認が要る。
3. **has_article() は直前トークンのみを見る**。ὁ αὐτός 型は拾えるが、冠詞と αὐτός の間に語が挟まる形は対象外になる。
4. **疑問／不定の区別はアクセントと type タグが担う**。編集本文のアクセントは写本そのものの情報ではないため、説明では「疑問か不定かは文脈で判断する」ことを判断基準として併記すべきである。
5. **personal は NOT 条件による残余クラス**（強意位置でない・冠詞直後でない）。残余であること自体は設計として明示すべきで、「人称用法＝強調なし」と読ませてはならない。明示された主格人称代名詞は、省略が通常であるがゆえに対比・強調を帯び得る。

## 5. 暫定処置案

| Legacy ID | 暫定処置 | 次に確認すること |
|---|---|---|
| pronoun.personal | retain_redefined | 語彙クラスとして再定義。主格 αὐτός の強意との競合を明記 |
| pronoun.intensive | retain_redefined | 固有名詞など無冠詞名詞句での対照例 |
| pronoun.identical | retain_redefined | 冠詞と αὐτός の間に語が挟まる形の扱い |
| pronoun.reflexive | retain_redefined | ἑαυτοῦ が相互的に読まれる用例との区別 |
| pronoun.reciprocal | retain_redefined | reciprocal_emphasis 統合後の構文環境の記録方法 |
| pronoun.demonstrative | retain_redefined | 限定用法／単独用法と近称・遠称を別軸に |
| pronoun.relative | retain_redefined | 先行詞の有無を必須条件から下位区別へ。clause カテゴリとの分担 |
| pronoun.interrogative | retain_redefined | 疑問の種類（審議など）は談話機能の軸として分離 |
| pronoun.indefinite | retain_redefined | 疑問との判断基準を文脈側に明記 |
| pronoun.distributive | retain_redefined | ἀμφότεροι をリストに残すかの再検討 |
| pronoun.reciprocal_emphasis | merge | reciprocal へ統合し、前置詞句という環境情報として保持 |
| pronoun.possessive_pronoun | retain_redefined | 所有表現として属格形と並べる再配置 |

## 6. 結論と次の作業

- 12タイプすべての代表例をNTコーパスで照合した（12/12）。
- 暫定処置は retain_redefined 11件、merge 1件（reciprocal_emphasis）。unresolved として残すタイプはないが、relative の必須条件の再定義と intensive の無冠詞名詞句での対照例確認が、次回以降の宿題である。
- この監査が終わると一次監査済みは 109/242 タイプ（9カテゴリ）になる。残りは8カテゴリ／133タイプ。
- 次は、今回の横断比較で関係が深かった形容詞（名詞句内部クラスタの継続）か、関係代名詞と分担する節カテゴリが候補になる。
