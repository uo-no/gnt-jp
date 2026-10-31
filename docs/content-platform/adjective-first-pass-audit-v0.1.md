# 形容詞11タイプ 初回独立監査メモ v0.1

- Date: 2026-10-31
- Scope: `syntax-registry.json` の adjective カテゴリ全11タイプ
- Source registry blob: `c44d13b6d128e3a6a2e302ad1ba0081d4cdadd00`
- Corpus: `public/bible_data/nt/{BOOK}/{CHAPTER}.json` on `main`
- Review status: first-pass; no production changes

## 1. 方針

現行の分類名を独立体系として承認するものではない。代表例のコーパス形態・語順・構造を確認し、概念の境界、用例の適合性、検出条件の妥当性を初回点検した。暫定処置はすべて再検証前提である。

形容詞カテゴリは、位置（構造）・機能・形態（級）・意味解釈・語用という異なる軸のタイプが並列に置かれている。特に「位置」はWallaceの限定位置論以来、機能判断の根拠として使われてきたものであり、根拠と結論を別タイプに分けた構造がこのカテゴリの最大の特徴である。

## 2. 本文データとの照合

| Legacy ID | 代表箇所 | コーパス上の対象 | 初回所見 |
|---|---|---|---|
| adjective.attributive | JHN 10:11 | καλός / A-NSM（ὁ ποιμὴν ὁ καλός、第2限定位置） | 機能として妥当 |
| adjective.predicate | ROM 7:12 | ἅγιος / A-NSM（ὁ νόμος ἅγιος、無コプラ） | 機能として妥当 |
| adjective.substantival | LUK 6:20 | πτωχοί / A-NPM（οἱ πτωχοί） | 冠詞＋形容詞の名詞化 |
| adjective.attributive_position | JHN 10:11 | 同上 | 限定用法と同一例・同一条件 |
| adjective.predicate_position | ROM 7:12 | ἁγία / A-NSF（ἡ ἐντολὴ ἁγία） | 述語用法と同一節・同一条件 |
| adjective.comparative | JHN 13:16 | μείζων（lemma μέγας, degree=comparative）＋比較の属格 | 形態として妥当 |
| adjective.superlative | 2PE 1:4 | μέγιστα（degree=superlative） | 形態として妥当 |
| adjective.proper_adjective | MAT 7:17 | ἀγαθὸν / A-NSN（δένδρον ἀγαθὸν） | 一致名詞があるだけの基本候補 |
| adjective.restrictive | JHN 10:11 | 同上 | 限定用法と同一例・同一条件。意味は文脈依存 |
| adjective.epithet | LUK 1:3 | κράτιστε（degree=superlative）＋Θεόφιλε | 敬称。最上級形と同時成立 |
| adjective.genitive_complement | LUK 23:15 | ἄξιον / A-NSN ＋ θανάτου / N-GSM | 語彙的支配として妥当 |

11タイプすべての代表箇所をNTコーパスで照合した（corpus_verified = yes ×11）。

## 3. 初回に判明した問題

### 3.1 同じ語に、同じ証拠で3タイプが立つ

JHN 10:11 の καλός には、attributive（限定用法）・attributive_position（限定位置）・restrictive（限定的用法）の3タイプが立ち、必須条件はいずれも同じ `in_attributive_position()` である。ROM 7:12 でも predicate と predicate_position が同じ条件で並ぶ。

これは「構造の観察」「統語機能」「意味解釈」という3つの軸を、並列の用法タイプとして並べた結果である。独立ナレッジでは、位置は観察（根拠）として記録し、機能は1つに絞り、意味解釈は別軸の注釈として保持する形に再編すべきである。候補提示の側でも、1語に実質同じ候補が確度だけ変えて並ぶ問題につながる（第4段階の候補生成検証で扱う）。

### 3.2 proper_adjective は用法ではなく受け皿

`adjective.proper_adjective`（記述的用法・基本）の必須条件は「±3語以内に一致する名詞がある」ことだけで、限定用法とほぼ完全に重なる。これは文法の用法タイプではなく、候補生成の実装上の基本候補（受け皿）である。「記述的」という読み自体は restrictive と対になる意味解釈の軸の問題であり、タイプとしてではなく意味軸の記述として置き換える（replace）のが適切である。

### 3.3 restrictive は判断基準が未定義

限定的かどうか（指示対象を絞っているか）は文脈依存であり、レジストリ自身も「意味論判定はしない・低確度」と明記している。位置という観察可能な根拠だけでは判断基準が定義できないため、独立タイプとして立てるかどうかは未決（unresolved）として残す。記述的／限定的の区別を意味軸として設計する際に、あらためて扱う。

### 3.4 比較級の不規則リストとコーパスのレンマ規約のずれ

比較級の検出は corpus の degree フィールド、または不規則レンマリストに依存する。しかしリストの筆頭 μείζων は、コーパスではレンマ μέγας として登録されている（JHN 13:16 で確認）。degree フィールドがあるため代表例は通過するが、リスト照合の部分はレンマ規約とずれている疑いが強い。与格監査で見た POS 条件の不一致と同じ型の問題であり、リスト依存の検出全般を Pass C で洗う必要がある。

### 3.5 epithet は最上級形と同時に成立する

LUK 1:3 の κράτιστε は最上級の形態であり、superlative と epithet が同時に立つ。これは形態の軸と語用の軸が違うため併記自体は正しいが、タイプ一覧では重複に見える。epithet は統語機能ではなく、呼びかけに伴う語用・談話の注釈として再定義し、呼格カテゴリの軸とあわせて扱う。

### 3.6 検出の窓と方向の制限

- substantival の「一致名詞なし」は ±3語の窓で判定される。名詞から離れて置かれた形容詞（長距離の修飾）では、実体用法と誤判定し得る。
- genitive_complement の governs_genitive は対象の後方+3語以内の属格しか見ない。属格が形容詞に先行する語順（属格＋形容詞）では補語を拾えない。

## 4. 検出ロジックの初回所見

1. **位置アルゴリズムは共有部品**：`in_attributive_position()` と `predicate_position()` は分詞・代名詞（強意 αὐτός）からも使われる共通基盤であり、この監査の所見は他カテゴリの判定にも波及する。
2. **証拠の種類が混在**：位置・一致という表層証拠が中心だが、genitive_complement だけは依存関係（governs）を使う。証拠の種類と強さはタイプごとに明記すべきである。
3. **級の判定は形態フィールドが主**：degree フィールドが整備されているため比較級・最上級は安定している。レンマリストは補助だが、3.4 のずれを含む。

## 5. 暫定処置案

| Legacy ID | 暫定処置 | 次に確認すること |
|---|---|---|
| adjective.attributive | retain_redefined | 位置を根拠フィールドに降ろした機能として再定義 |
| adjective.predicate | retain_redefined | 同上 |
| adjective.substantival | retain_redefined | 分詞の実体用法・冠詞カテゴリとの横断整理。±3窓の限界明記 |
| adjective.attributive_position | merge | attributive の根拠（観察）へ統合 |
| adjective.predicate_position | merge | predicate の根拠（観察）へ統合 |
| adjective.comparative | retain_redefined | 形態の軸として保持。比較の属格と横断。不規則リストのレンマ規約照合 |
| adjective.superlative | retain_redefined | 形態の軸として保持。意味の絶対／相対は文脈の軸へ |
| adjective.proper_adjective | replace | 用法タイプから外し、記述的の読みは意味軸の記述へ置換 |
| adjective.restrictive | unresolved | 意味軸の設計時に、判断基準を定義できるか再検討 |
| adjective.epithet | retain_redefined | 語用・談話の注釈として再定義。呼格の軸と連携 |
| adjective.genitive_complement | retain_redefined | 属格カテゴリと横断。先行する属格補語の検出可否 |

## 6. 結論と次の作業

- 11タイプすべての代表例をNTコーパスで照合した（11/11）。
- 暫定処置は retain_redefined 7件、merge 2件（位置の構造標識2件）、replace 1件（proper_adjective）、unresolved 1件（restrictive）。
- この監査が終わると一次監査済みは 120/242 タイプ（10カテゴリ）になる。残りは7カテゴリ／122タイプ。
- 次の候補：関係代名詞と役割を分け合う節（clause）、または名詞句構文（nominal_syntax）。名詞句内部クラスタ（冠詞・代名詞・形容詞）の締めとして nominal_syntax を先に済ませると、位置と名詞句構造の所見が揃う。
