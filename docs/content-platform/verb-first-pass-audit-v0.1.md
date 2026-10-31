# 動詞48タイプ 初回独立監査メモ v0.1

- Date: 2026-10-31
- Scope: `syntax-registry.json` の verb カテゴリ全48タイプ
- Source registry blob: `c44d13b6d128e3a6a2e302ad1ba0081d4cdadd00`
- Corpus: `public/bible_data/nt/{BOOK}/{CHAPTER}.json` on `main`
- Review status: first-pass; no production changes

## 1. 方針

現行の分類名を独立体系として承認するものではない。代表例のコーパス形態（時制・法・態・人称）を確認し、概念の境界、用例の適合性、検出条件の妥当性を初回点検した。暫定処置はすべて再検証前提である。

このカテゴリは最大の48タイプを持ち、法の用法（22タイプ）、時制・相の用法（19タイプ）、態の用法（7タイプ）の3群からなる。Wallace の動詞各論（法・時制・態ごとの用法目録）がそのままタイプ列挙になっており、「読み」の分類が中心である。読みは本質的に文脈依存であり、レジストリ自身も多くの時制タイプに確度35〜50という低い値を付けている。この正直さは監査方針と一致する。

## 2. 本文データとの照合

48タイプすべての代表箇所をNTコーパスで照合し、対象動詞の形態（時制・法・態・人称）が登録内容と一致することを確認した（corpus_verified = yes ×48）。コーパスのレンマ規約による差異が3件あったが、いずれも検出条件には影響しない。

- verb.deliberative MAT 6:31 φάγωμεν — レンマは ἐσθίω
- verb.future_deliberative ROM 6:1 ἐροῦμεν — レンマは λέγω
- verb.voice_middle_reciprocal JHN 9:22 συνετέθειντο — レンマは συντίθεμαι（中動形の見出し）

照合の内訳（群ごと）：

| 群 | タイプ数 | 照合結果 |
|---|---|---|
| 法の用法 | 22 | 全タイプで標識・法・人称が登録と一致 |
| 時制・相の用法 | 19 | 全タイプで時制が登録と一致 |
| 態の用法 | 7 | 全タイプで態が登録と一致 |

## 3. 初回に判明した問題

### 3.1 条件が完全に同一で、区別できないタイプの組が2組ある

- **imperative_constative（総括命令）と imperative_ingressive（起動命令）**：必須条件はどちらも「アオリスト命令法」だけである。開始に焦点があるかどうかを分ける信号が、検出条件のどこにもない。総括命令をデフォルト読みとして保持し、起動命令は unresolved とした。
- **present_customary（習慣的現在）と present_iterative（反復的現在）**：必須条件はどちらも「現在形＋反復標識」で完全に同一である。習慣と反復は濃淡の違いであり、タイプとしては反復標識のある現在形に一本化し、区別は読みの注釈に残す（merge）。

同じ問題の変種として、imperfect_iterative（反復的未完了）は反復標識が必須条件に入っておらず、未完了時制だけで立つ。進行的未完了（デフォルト読み）と全ての未完了形で並立するため、こちらも unresolved とした。

### 3.2 格言タイプ3件は、共通の弱い標識に依存する

gnomic_present / aorist_gnomic / future_gnomic の必須標識は「文脈に γάρ・πᾶς（未来は τις も）がある」ことである。これらの語は格言でない文にも広く現れ、格言であることの根拠にはならない。一般的真理かどうかは、文の内容と文脈の判断そのものである。3件とも unresolved とし、格言という読みは「形式からは決められない読み」の代表例として扱う。

### 3.3 「劇的」タイプ2件は、形式の異常がない

dramatic_aorist と perfect_dramatic は、どちらも「生々しさ・直近性」という読みを主張するが、動詞の形式自体には通常と違う点がない。手掛かりは「節内に現在直説法がある」「近傍に過去直説法がある」といった間接的なものである。歴史的現在が機能したのは、現在形で過去を語るという形式の異常そのものが手掛かりになるためであり、その対比でも劇的タイプの弱さは際立つ。2件とも unresolved とした。

### 3.4 読みの判別は、小さいレンマリストに依存するタイプが多い

起動的アオリスト（状態動詞5語）、結果到達アオリスト（達成動詞5語）、企図的未完了（妨害・説得系5語）、命令的未来（律法動詞8語）、書簡的アオリスト（書簡動詞4語）などは、語彙的な手掛かりとして筋が良いが、リストの網羅性がそのまま検出の上限になる。リストは「典型例の目録」であって定義ではないことを、各タイプに明記すべきである。直接中動態に至っては、リストが実質 ἀπάγχομαι 1語であり、タイプというより語彙項目である。

### 3.5 許容のラベルが形式より強い主張をしている

imperative_permissive（許容命令）の実体は3人称命令法であり、代表例 MAT 27:42 は許容というより挑発である。voice_permissive_passive（許容受動態）の実体は受動形の命令法である。どちらも形式タイプとしては確かで、「許容」は文脈で決まる読みの一つにすぎない。形式に即した名称への再定義が必要である。

### 3.6 他カテゴリとの二層構造

emphatic_negation（節カテゴリ・小辞カテゴリと）、purpose_clause と conditional_subjunctive（節カテゴリと）は、同じ対象を動詞の法の側から記述するものである。二層自体は節監査・接続詞監査で確認した設計だが、独立体系では「節の機能は節側、動詞の法の読みは動詞側」と軸を明示し、同じ読みを二重に数えないことが要る。

## 4. 検出ロジックの初回所見

1. **形態の読み取りは安定**：時制・法・態・人称はコーパスの形態情報で再現性高く判定できる。問題は形態から読みへの飛躍の大きさであり、タイプごとに差が大きい。
2. **具体的な判別信号を持つタイプは保持しやすい**：書簡的アオリスト（レンマ＋1人称）、禁止（μή＋アオリスト接続法）、審議的未来（疑問＋1人称）、習慣的未完了（κατά＋時間名詞の配分）などは、読みを裏付ける形式・語彙の手掛かりがある。
3. **デフォルト読みの明示は妥当**：叙述的直説法、総括的アオリスト、進行的未完了、予告的未来などは「その形態の既定の読み」として置かれており、確度も低めに抑えられている。独立体系でも既定値の層として整理できる。

## 5. 暫定処置案

| Legacy ID | 暫定処置 | 次に確認すること |
|---|---|---|
| verb.declarative | retain_redefined | 直説法の既定読みとして保持 |
| verb.historical_present | retain_redefined | 読みとして保持。物語文脈の手掛かりの精度は Pass C で確認 |
| verb.gnomic_present | unresolved | 格言性の判断基準を形式以外で定義できるか |
| verb.futuristic_present | retain_redefined | 文脈依存の候補として保持 |
| verb.epistolary_aorist | retain_redefined | 条件が具体的なタイプとして保持 |
| verb.dramatic_aorist | unresolved | 形式の異常がない読みをどう扱うか |
| verb.imperative_customary | retain_redefined | 現在命令法の既定読みとして保持 |
| verb.imperative_constative | retain_redefined | アオリスト命令法の既定読みとして保持 |
| verb.imperative_ingressive | unresolved | 総括命令と分ける信号を定義できるか |
| verb.imperative_urgency | retain_redefined | 切迫標識のあるタイプとして保持 |
| verb.imperative_permissive | retain_redefined | 3人称命令法という形式タイプへ再定義 |
| verb.hortatory | retain_redefined | 形式タイプとして保持 |
| verb.prohibitory | retain_redefined | 形式タイプとして保持 |
| verb.deliberative | retain_redefined | 形式タイプとして保持 |
| verb.emphatic_negation | retain_redefined | 節・小辞との二層の軸を明示 |
| verb.purpose_clause | retain_redefined | 節側との二層の軸を明示 |
| verb.indefinite_relative | retain_redefined | 形式タイプとして保持 |
| verb.conditional_subjunctive | retain_redefined | 節側との二層の軸を明示 |
| verb.potential_optative | retain_redefined | 形式タイプとして保持 |
| verb.wish_optative | retain_redefined | 形式タイプとして保持 |
| verb.optative_indirect_discourse | retain_redefined | 形式タイプとして保持 |
| verb.present_progressive | retain_redefined | 現在形の既定読みとして保持 |
| verb.present_customary | retain_redefined | 反復標識のある現在形として保持（反復的現在を統合） |
| verb.present_iterative | merge | 習慣的現在へ統合 |
| verb.imperfect_progressive | retain_redefined | 未完了形の既定読みとして保持 |
| verb.imperfect_ingressive | retain_redefined | 判別信号（先行する過去形）を明記して保持 |
| verb.imperfect_iterative | unresolved | 反復標識を必須にできるか |
| verb.imperfect_customary | retain_redefined | 配分表現の標識を持つタイプとして保持 |
| verb.imperfect_conative | retain_redefined | レンマリストは典型例の目録と明記 |
| verb.aorist_constative | retain_redefined | アオリストの既定読みとして保持 |
| verb.aorist_ingressive | retain_redefined | レンマリストは典型例の目録と明記 |
| verb.aorist_culminative | retain_redefined | レンマリストは典型例の目録と明記 |
| verb.aorist_gnomic | unresolved | 格言タイプ共通の問題として扱う |
| verb.perfect_intensive | retain_redefined | 完了形の基本義として保持 |
| verb.perfect_extensive | retain_redefined | 完了形の既定側の読みとして保持 |
| verb.perfect_dramatic | unresolved | 劇的タイプ共通の問題として扱う |
| verb.pluperfect_intensive | retain_redefined | 語彙的根拠のあるタイプとして保持 |
| verb.pluperfect_extensive | retain_redefined | 過去完了の既定読みとして保持 |
| verb.future_predictive | retain_redefined | 未来形の既定読みとして保持 |
| verb.future_imperatival | retain_redefined | 具体的な条件を持つタイプとして保持 |
| verb.future_deliberative | retain_redefined | 具体的な条件を持つタイプとして保持 |
| verb.future_gnomic | unresolved | 格言タイプ共通の問題として扱う |
| verb.voice_active | retain_redefined | 形態の記録として保持 |
| verb.voice_middle_direct | retain_redefined | 語彙項目に近いタイプとして保持 |
| verb.voice_middle_reflexive | retain_redefined | 相互的読みとの競合を明記 |
| verb.voice_middle_reciprocal | retain_redefined | 手掛かり（συν-・複数主語）を明記して保持 |
| verb.voice_passive | retain_redefined | 形態の記録として保持 |
| verb.voice_permissive_passive | retain_redefined | 受動命令法という形式タイプへ再定義 |

## 6. 結論

- 48タイプすべての代表例をNTコーパスで照合し、形態が登録内容と一致することを確認した（48/48）。
- 暫定処置は retain_redefined 40件、merge 1件（present_iterative）、unresolved 7件（gnomic_present、dramatic_aorist、imperative_ingressive、imperfect_iterative、aorist_gnomic、perfect_dramatic、future_gnomic）。
- この監査をもって、全17カテゴリ・242タイプの一次監査が完走する。全体の集計と横断所見は別途総括する。
