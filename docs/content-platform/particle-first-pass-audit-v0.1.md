# 小辞21タイプ 初回独立監査メモ v0.1

- Date: 2026-10-31
- Scope: `syntax-registry.json` の particle カテゴリ全21タイプ
- Source registry blob: `c44d13b6d128e3a6a2e302ad1ba0081d4cdadd00`
- Corpus: `public/bible_data/nt/{BOOK}/{CHAPTER}.json` on `main`
- Review status: first-pass; no production changes

## 1. 方針

現行の分類名を独立体系として承認するものではない。代表例のコーパス形態を確認し、概念の境界、用例の適合性、検出条件の妥当性を初回点検した。暫定処置はすべて再検証前提である。

このカテゴリは、カテゴリ説明自身が「接続詞層・節層と多層構造をなす」と明記する通り、接続詞カテゴリと対象が大きく重なる。監査の中心は、その重なりの切り分けである。

## 2. 本文データとの照合

| Legacy ID | 代表箇所 | コーパス上の対象 | 初回所見 |
|---|---|---|---|
| particle.negative_ou | JHN 1:5 | οὐ（PRT-N） | 語彙クラスとして整合 |
| particle.negative_me | MAT 6:13 | μὴ（PRT-N） | 語彙クラスとして整合 |
| particle.double_negative | JHN 10:28 | οὐ μὴ＋ἀπόλωνται（接続法） | 形式として整合 |
| particle.emphatic_negative | JHN 10:28 | 同上 | 二重否定と同一例 |
| particle.particle_an | JHN 11:21 | ἂν（PRT） | 整合 |
| particle.particle_ean | 1JN 1:9 | ἐὰν（COND） | 節・接続詞側と重複 |
| particle.interrogative_particle | MAT 12:23 | Μήτι（PRT-I） | 整合 |
| particle.deliberative_particle | ROM 6:1 | οὖν（疑問文中） | 整合 |
| particle.rhetorical_particle | ROM 6:2 | μὴ γένοιτο | 本文は照合可。必須条件と合わない（3.3） |
| particle.emphatic_ge | GAL 3:4 | γε（PRT） | 整合 |
| particle.restrictive_monon | MAT 8:8 | μόνον（lemma μόνος） | 整合 |
| particle.continuative_de | ROM 1:13 | δὲ | 接続詞の転換と同一例 |
| particle.inferential_oun | ROM 12:1 | οὖν | 接続詞の帰結と同一例 |
| particle.explanatory_gar | ROM 1:16 | γὰρ | 接続詞の説明と同一例 |
| particle.correlative_men | MAT 9:37 | μὲν | 相関構文の前項 |
| particle.correlative_de | MAT 9:37 | δὲ | 相関構文の後項 |
| particle.connective_te | MAT 22:10 | τε（lemma は τέ） | 整合（レンマのアクセント差異あり） |
| particle.assertive_de | MAT 13:23 | δὴ | 整合 |
| particle.attention_de | ACT 13:2 | δή（命令文中） | 整合。条件式に曖昧さ |
| particle.emphasis_per | （登録なし） | 単独形は本文に出現しない | dormant 型 |
| particle.emphasis_toi | （登録なし） | 単独形は本文に出現しない | dormant 型 |

代表例が登録されている19タイプはすべてNTコーパスで照合した（corpus_verified = yes ×19）。残り2タイプは代表例自体がなく、単独形が本文に出現しない（corpus_verified = no、理由は台帳に明記）。

## 3. 初回に判明した問題

### 3.1 接続詞カテゴリとの二重記述が大規模にある

次のタイプは、接続詞カテゴリのタイプと同一の代表例・同一の対象を持つ。

- continuative_de ↔ coordinating_transition（ともに ROM 1:13）
- inferential_oun ↔ coordinating_inferential（ともに ROM 12:1）
- explanatory_gar ↔ coordinating_explanatory（ともに ROM 1:16）
- correlative_men / correlative_de ↔ correlative_men_de（相関構文を前項・後項に分割）
- connective_te ↔ coordinating_additive（連結の対象範囲が重なる）
- particle_ean ↔ subordinating_conditional / clause の条件標識

小辞側のタイプが付け加えているのは「節の第2位置にある」という条件だが、これは δέ・γάρ・οὖν のような後置小辞の通常の位置であり、その出現の談話機能を示す根拠にはならない。独立体系では、談話機能は1つの層（接続詞／談話）に一本化し、小辞カテゴリは否定・疑問・焦点など小辞固有の領域に絞るのが適切である。

### 3.2 dormant 型が2つある

emphasis_per と emphasis_toi は、レジストリ自身が「単独形は SBLGNT 本文に出現しない（dormant 型）」と明記する通り、NT では複合形（εἴπερ・καθάπερ、μέντοι・τοιγαροῦν）の中にしか現れない。独立タイプとしては廃止（retire）し、複合形はそれぞれの語の語彙情報として扱うべきである。なお棚卸し台帳では、この2タイプも example が空のまま242件に数えられている（238件に例があるという棚卸し結果と整合する）。

### 3.3 rhetorical_particle の必須条件が代表例と合わない

修辞的否定小辞は「μή＋希求法」と「疑問節であり否定環境である」ことの両方を必須とする。しかし代表例の μὴ γένοιτο（ROM 6:2）は疑問文ではなく、後者を満たさない。強い否定の定型句（μὴ γένοιτο）と、否定的な答えを予期する疑問（μή の疑問用法）は、別の現象を1タイプに混ぜたものと考えられる。タイプの立て方自体が未決として unresolved に残す。代名詞の relative（代表例が必須条件を満たさない）と同じ型の問題である。

### 3.4 否定小辞のラベルと条件のずれ

negative_ou は「直説法」、negative_me は「非直説法」をラベルに含むが、どちらの条件もレンマしか見ていない。οὐ／μή と法の対応は強い傾向ではあるが絶対ではなく、条件で確認もされていない。語彙クラスとしては妥当なので、法との対応は傾向の注記に降ろして再定義する。

### 3.5 条件式の結合順序の曖昧さ（再掲）

attention_de の条件 `target_lemma_in(['δή']) AND clause_has_mood('imperative') OR clause_has_mood('subjunctive')` にも、節監査で指摘した AND/OR の結合順序の曖昧さがある。解釈によっては δή がなくても成立し得る。Pass C での横断確認事項に加える。

## 4. 検出ロジックの初回所見

1. **レンマ判定が中心で再現性は高い**：否定・疑問・焦点の各タイプは小辞の同定としては安定している。
2. **question_clause は本文の句読点に依存**：疑問の判定はギリシャ語疑問符（U+037E）や疑問詞の有無で決まるため、編集本文の句読点付けが判定を左右する。データ依存の前提として明記すべきである。
3. **第2位置の条件は位置の確認にすぎない**：is_focus_position は「節の2番目のトークンか」を見るもので、焦点化の根拠としては弱い。

## 5. 暫定処置案

| Legacy ID | 暫定処置 | 次に確認すること |
|---|---|---|
| particle.negative_ou | retain_redefined | 語彙クラスとして保持。法との対応は傾向の注記へ |
| particle.negative_me | retain_redefined | 同上 |
| particle.double_negative | retain_redefined | 形式のタイプとして保持 |
| particle.emphatic_negative | merge | 二重否定へ統合（強さは読みの注釈） |
| particle.particle_an | retain_redefined | 語彙クラスとして保持。働きは共起構文で読む |
| particle.particle_ean | merge | 条件標識（接続詞・節）側へ統合 |
| particle.interrogative_particle | retain_redefined | 疑問の確認条件を必須にするか検討 |
| particle.deliberative_particle | retain_redefined | 談話機能の分岐として保持 |
| particle.rhetorical_particle | unresolved | 定型句と疑問用法を分けるか、条件を組み直す |
| particle.emphatic_ge | retain_redefined | 語彙クラスとして保持 |
| particle.restrictive_monon | retain_redefined | 焦点の限定として保持 |
| particle.continuative_de | merge | 接続詞の転換へ統合 |
| particle.inferential_oun | merge | 接続詞の帰結へ統合 |
| particle.explanatory_gar | merge | 接続詞の説明へ統合 |
| particle.correlative_men | merge | 相関構文（接続詞）へ統合 |
| particle.correlative_de | merge | 相関構文（接続詞）へ統合 |
| particle.connective_te | merge | 接続詞の連結へ統合 |
| particle.assertive_de | retain_redefined | 語彙クラスとして保持 |
| particle.attention_de | retain_redefined | 条件式の結合順序を Pass C で確認 |
| particle.emphasis_per | retire | 複合形は語彙情報として扱う |
| particle.emphasis_toi | retire | 複合形は語彙情報として扱う |

## 6. 結論と次の作業

- 代表例のある19タイプを照合し、2タイプは代表例なし・本文に単独形なし（dormant）であることを確認した。
- 暫定処置は retain_redefined 10件、merge 8件、retire 2件、unresolved 1件。
- この監査が終わると一次監査済みは 184/242 タイプ（15カテゴリ）になる。残りは2カテゴリ／58タイプ。
- 次は談話（10タイプ）。接続詞の基本機能と小辞の談話機能の受け皿になるカテゴリであり、その監査で機能層の一本化方針が確定する。最後に動詞（48タイプ）が残る。
