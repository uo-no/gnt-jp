# Reading Support Mapping（Phase 25A / Projection → 表示要素の変換規則）

- 設計日: 2026-07-08
- 入力: Reading Support Projection（Phase 24・純粋データ）
- 出力先: StudyPanel の各表示要素（Reading Note / Observation / Phrase Reading / Related）
- 本フェーズ: 情報設計のみ。**コード変更ゼロ・UI 実装ゼロ・文言変更ゼロ**
- 準拠: 設計理念正典（原則 1: 補助であって代行ではない）・Phase 22 の層規則・Phase 23.6 の 5 テスト・Phase 23.8 の保全台帳

---

## 1. 設計思想

1. **Mapping の目的は文法の説明ではなく、利用者の 4 つの問いへの回答である。** 各表示要素は問いに 1 対 1 で対応する:
   - Reading Note → Q1「何と言っているのか」
   - Phrase Reading → Q3「どこまでが一まとまりか」
   - Observation → Q2「なぜこの訳になるのか」（の入口 — 見る場所の指さし）
   - Related → Q4「前にも見た？」+ 育った読者の出口
2. **Projection は鍵を運び、文は運ばない。** Mapping は「Projection のどのフィールドを、どの表示の**選択キー・表示条件**として使うか」の規則であり、文章そのものは従来どおり ReadingFormatter（と registry の文章フィールド）が供給する
3. **additive**: 既存表示（節の discourse 文・グロス・形態グリッド・辞書）は削除も置換もしない。Mapping が定義するのは**空いている座席の埋め方**だけ
4. **帰還原則**: すべての変換結果は「本文のどこを見ればよいか」が判る形で終わること（正典 原則 1 の判定基準を Mapping の検収条件に含める）

---

## 2. 各表示要素への Mapping（フィールド別一覧）

| Projection フィールド | 用途（どの表示の何に使うか） | 直接表示するか |
|---|---|---|
| `words[i].top.id` | **全表示の選択キー**。Reading Note のテンプレ選択（死蔵 33 + 今後追加分）・Observation の hint 参照・Related の起点・命名段階（Layer 3）での label_ja 引き当て | **しない**（id は内部キー。名前 label_ja は Layer 3 でのみ） |
| `words[i].top.confidence` | **表示条件の判定のみ**（§4 の帯 A/B/C）。文言の強さの選択には使ってよいが値は出さない | **しない**（数値・バー・%を全層で禁止） |
| `words[i].top.signals`（条件 id 列） | Observation の内容選択キー: 発火した条件 id → registry の該当 condition/signal の観察素材を引く。「この箇所で実際に何が根拠だったか」の個別化 | **しない**（signal 名・id は非表示。表示されるのは registry から引いた観察指示文のみ） |
| `words[i].alternatives`（id+conf ≤4） | ①競合判定: Δconf = top − alt[0] < 0.15 →「解釈が割れる箇所」フラグ（Observation に判別基準 1 文を許可・Layer 1 は top のみで沈黙を維持）②Layer 4 の別解リスト | Layer 4 でのみ（名前で・確度は出さない） |
| `words[i].categories`（カテゴリ別 top） | ①**流れの一言**の選択キー: conjunction / particle / clause の並走 top（καί・δέ・ἵνα の接続文）②Phrase Reading の型引き当て（nominal_syntax / preposition）③Layer 4 の多層ビュー（E2） | しない（キーのみ） |
| `phrases[]` / `genitivePhrases[]` | **Phrase Reading の本体**: start/end = かたまりの範囲（本文側の視覚対応の根拠）、head = 「この語が中心」、dependents = 「これらが付く」。語タップ時は当該語を含む最狭句を選択 | 範囲とヘッドは**本文の言葉として**表示（構造用語 NP/PP/head は非表示） |
| `clauses[]` | 文脈の一言（Clause 層・既存 discourse 文の座席）と Phrase Reading の親文脈。type は既存 Formatter の橋渡しキーとしてのみ | しない（type/anchor/stopReason 非表示） |
| `relatedIds` / `related` | Related（E1 混同対）。Layer 4 で「対比して読む」導線の対象 id（≤2 に間引き） | 名前（label_ja）で・Layer 4 のみ |
| `searchParams` (+ top.id) | Related の「同じ構文を探す」リンクに**型を引き継ぐ**引数（既存リンクの改良・Layer 4） | しない（URL 引数としてのみ） |
| `metadata` | 開発・監査用（表示条件のデバッグ）。表示には一切使わない | **しない** |

## 3. 表示要素別の変換規則

### 3.1 Reading Note（Layer 1・既存 rn-prose の座席）
- **入力**: `top.id`（テンプレ選択）+ 対象語のグロス・句範囲内の語（本文の言葉の材料 — UI 側が既に保持）
- **規則**: top.id にテンプレが存在し、かつ確度帯 A/B（§4）のとき、既存の節文に**加えて**語/かたまり粒度の 1 文を出す。文は「本文の言葉 → 読み方」の順（例の型: 「『τοῦ θεοῦ』は『神の』— 前の『ことば』にかかります」）。文法名称は置かない（23.6 の順序テスト）
- **禁止**: 型名・確度・シグナル・「〜属格」等の術語

### 3.2 Phrase Reading（Layer 2・かたまり）
- **入力**: 対象語を含む**最狭の句**（phrases ∪ genitivePhrases）+ その head 語の `categories.nominal_syntax / preposition` top
- **規則**: 句の範囲（start–end の語列）を本文の言葉で示し、head を中心に「どれがどれに付くか」を 1 行で言う。型 id は言い方の選択キー（nested_np なら「中に『◯◯の』が入っています」型の言い回し）としてのみ
- **表示条件**: 句の長さ ≥ 2 語（1 語句は言うことがない）かつ該当型の確度帯 A/B

### 3.3 Observation（Layer 2・見る場所の指さし）
- **入力**: `top.signals`（発火条件 id）→ registry の観察素材（hint_ja / signal label）を**参照キーとして**引く
- **規則**: 1 回の表示につき観察点は **1 点のみ**。Δconf < 0.15 のときに限り判別基準 1 文を追加してよい（Phase 22 Audit 8 の規則）。初回遭遇では出さない（再会時 or 利用者が展開したとき — Phase 22.5 Audit 5）
- **禁止**: 規則の一般論・複数ポイントの列挙・結論の再述

### 3.4 Related（Layer 4・既存「さらに調べる」の座席）
- **入力**: `relatedIds`（E1 混同対・≤2）+ `categories`（E2 多層）+ `searchParams`+`top.id`（型引き継ぎ検索）
- **規則**: ①「対比して読む」= relatedIds を名前で提示 ②「この語の別の顔」= 多層 top を層の言葉で提示 ③「同じ構文を探す」リンクに top.id を引数追加。いずれも利用者が Layer 4 を開いたときのみ

### 3.5 既存表示との関係
- 節の discourse 文（既存）はそのまま「文脈の一言（Clause 層）」として残る。**同一文重複の禁止**: 新規に出す文が既存表示と文字列同一なら出さない（Phase 23 の重複問題を Mapping 規則で封鎖）

## 4. 表示条件（確度帯と競合）

| 帯 | 条件 | 扱い |
|---|---|---|
| **A（確かな判定）** | top.confidence ≥ 0.60 | Reading Note / Phrase Reading / Observation すべて可 |
| **B（弱い判定）** | 0.40 ≤ conf < 0.60 | 表示可。ただし断定を弱める言い回しをテンプレ側で選ぶ（値は出さない） |
| **C（Contextual）** | conf < 0.40 | **Layer 1–3 では沈黙**。Layer 4 でのみ「参考の読み筋」として提示可（Wallace 自身が文脈依存とした型 — 不安の演出をしない） |
| **競合** | Δconf < 0.15 | Layer 1 は top のみ・Observation に判別基準 1 文を許可・Layer 4 で比較提示 |

## 5. 静寂条件（何も出さない場合の完全列挙）

1. Projection が null（Failure Mode — 既存表示のみ）
2. `words[i]` が null（候補なしトークン）
3. top が帯 C（<0.40）で Layer 1–3
4. top.id に対応するテンプレ/観察素材が未整備（**フォールバック文で埋めない**）
5. 句が 1 語のみ（Phrase Reading）
6. 初回遭遇（Observation — 再会 or 明示展開まで）
7. 生成文が既存表示と同一文字列
8. dormant 型（genitive.means / particle.emphasis_per / emphasis_toi）が top のとき（例が示せないため）

## 6. 表示しない情報（全層・恒久）

- **confidence の数値・バー・パーセント・rank**（帯は言い回しの内部選択にのみ使う）
- **signal 名・条件 id・signals_matched の生値**（観察指示文に変換されたものだけが見える）
- **Wallace 型 id**（`genitive.possessive` 等 — 内部キー）
- **型名 label_ja**: Layer 1–2 では非表示。**Layer 3（命名段階）でのみ**「文法では◯◯と呼ばれます」の形で後置（23.6 の NG/OK 基準）
- label_en・wallace_ref（Layer 4 のみ）・wallace_freq
- 構造用語（NP/PP/head/dependents/anchor/stopReason/discourse.type/marker）
- metadata・searchParams の生値（リンク引数としてのみ）

## 7. Phase 25B の実装指針

1. **実装順序** = 学習効果順（Phase 22.5 Audit 10）: ①Reading Note の語/かたまり粒度 1 文（C1・§3.1）→ ②Phrase Reading（C2・§3.2）→ ③同一文重複の解消は①②が出た時点で規則 §3.5 により自動達成（C3）→ 以降 H1 流れ / H2 再会
2. **座席は既存のみ**: rn-prose（L1）・details 折りたたみ（L2/L3）・「さらに調べる」（L4）。新 UI パターン禁止（23.8 台帳）
3. **文の供給**: 新しい文もすべて ReadingFormatter 経由 + assertReadingTextSafe を通す（唯一生成源の原則）。テンプレは _WALLACE_TEXT の文体（1 文・敬体）に従い、死蔵 33 テンプレを最初の資産として回収する
4. **非同期 + 世代カウンタ**の既存パターンに従う（読書を止めない）。Projection の読み出しは `_getReadingSupportProjection(words)` のみ
5. **検収**: 各表示は 23.6 の 5 テスト（帰還・代替・順序・4 問・静寂）+ 本書 §5–6 で判定。エンジンスイート 1647 PASS 維持 + 表示文言は目視検収（スナップショット不在 — 23.8 Medium リスク）
