# 第16段階：フォールバック対応の意味整合性と休眠チェック監査

## 1. 39件の直接ID不一致を再評価した結果

第14段階の直接ID一致のみの検査では、39件を「条件なしシグナル」と誤認した。mainの実装には `_BUILTIN_CONDITION_SIGNAL_MAP` があり、実行時の `CandidateScorer.prototype._evaluateType_patched()` はシグナルIDから対応条件IDを逆引きして評価する。

2026-10-22時点のmainのレジストリ242型・マップ36項目を照合した結果：
- 直接ID一致：410件
- フォールバック経由で同じ型内の条件に接続：39件
- フォールバック照合後の未対応シグナル：0件

既存の `scripts/genitive-regression-test.cjs` §7a にも、直接一致とマップ経由の双方を考慮する orphan-signal lint がある。したがって39件のID一括置換は不要であり、第14段階の「無条件加点」の結論は撤回した。

## 2. 実際に見つかった意味的不一致：`participle.adverbial_temporal`

対象の条件・シグナル：
- condition `temporal_tense`: `target_tense_in(['aorist','present','perfect'])`
- signal `tense_aorist`: +15、「アオリスト（先行動作）」

フォールバックマップは `temporal_tense → tense_aorist` と対応付けている。そのため、現在形・完了形の分詞でも `temporal_tense` が成立すれば、アオリスト専用のラベルを持つ +15 が加算され得る。これは直接IDの不一致ではなく、**条件の意味範囲とシグナルのラベル／重みの意味が一致していない問題**である。

同じ型には別途 `tense_present`（現在・同時動作）と `tense_perfect`（完了・結果状態継続）のシグナルもあるため、現在形・完了形に対して一般的な時間条件と個別時制条件の双方が加点される可能性がある。アオリストも `temporal_tense` と `tense_aorist` の二重加点になり得る。実際のスコア影響は、`_evaluateType_patched()` の評価結果で確認する必要がある。

### 修正候補（未実装）

- `temporal_tense` を独立した一般シグナルとして定義し、一般的な「時間的解釈の候補」ラベルにする。あるいは、
- `temporal_tense` をシグナルに対応付けず、`tense_aorist`、`tense_present`、`tense_perfect` の個別条件のみで加点する。

どちらが正しいかはWallaceの分詞分類と、既存スコア設計を確認して決める。原典が形態だけから時間的意味を確定しない場合は、時制形の寄与を弱め、主節との関係・文脈条件を重視する。

## 3. 対応条件が存在しても、実質的に加点できない型

`CheckEvaluator` には、現在常に `false` を返すと明記されたチェックがある。

| 型 | シグナル | 対応条件 | チェック | 影響 |
|---|---|---|---|---|
| `genitive.attributive` | `adjectival_equivalent` (+20) | `semantically_replaceable_by_adjective` | `has_adjectival_equivalent()` | 形容詞相当性の加点が常に発生しない |
| `genitive.epexegetical` | `namely_substitutable` (+25) | `paraphrasable_with_namely` | `semantic_equivalence_test()` | 「すなわち」置換可能性の加点が常に発生しない |
| `dative.means` | `instrumental_noun` (+20) | `substitutable_with_dia` | `semantic_substitution_test('διά')` | 「διά + 属格で言い換え可能」の加点が常に発生しない |
| `participle.adverbial_causal` | `logical_context` (+15) | `logical_discourse_marker` | `context_discourse_type_eq('argumentative')` | 論証的文体シグナルが常に発生しない |

これらは誤検出ではなく、意図した根拠が自動判定に寄与しない「休眠シグナル」である。型全体が必ず誤りとは限らず、ほかの条件や基礎スコアも存在するため、該当型をすべて無効にするのではなく、各条件が候補順位に与える寄与を確認する。

## 4. 優先順位

1. **最優先：** `temporal_tense → tense_aorist` の意味的不一致と重複加点を、Wallaceの分詞分類と照合する。
2. **次点：** 上表4件について、スコア計算で常時不成立となる条件を、根拠のある実装へ置き換えるか、検出器が判定できない限りスコアから外す。
3. 全39件のフォールバック対応を回帰テストで維持する。直接ID不一致を一律にバグ扱いしない。
4. 修正前後で代表例を含む全NTトークンを走査し、候補順位・confidence・表示閾値通過率・同列候補率を比較する。
5. 候補のconfidenceは統計的に校正された確率とみなさず、UI上の候補順位スコアとして扱う。

## 5. 原典確認の基準

Wallaceの *Greek Grammar Beyond the Basics* を第一資料とし、分類の定義・識別の鍵・本文例を確認する。出版社の書誌説明は同書が統語と釈義を結びつけ、文脈・語彙・その他の言語的特徴を併せて考える必要を明記している。書誌情報だけで個別の分類を確定せず、採用版の該当節・ページと新約聖書本文例を照合する。
参考： https://zondervanacademic.com/products/greek-grammar-beyond-the-basics

## 状態

この段階では監査文書のみを更新。レジストリ、スコアラー、UIの動作は変更していない。
