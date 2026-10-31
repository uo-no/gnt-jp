# 監査知見のアプリ反映手順（型 v0.1）

一次監査（docs/independent-multilingual-content-spec ブランチの監査メモ・台帳）の
処置を、本番レジストリとアプリ表示へ反映するときの標準手順。
最初の適用例：冠詞付き不定詞（infinitive.articular → 構造軸）。

## 手順

1. **監査メモの確認**：対象カテゴリの監査メモと台帳 CSV で、対象タイプの
   処置（retain_redefined / merge / replace / split / retire / unresolved）と
   代表例を確認する。処置が「提案」段階であることを前提に、反映前に
   ユーザーへ設計（レジストリ表現／生成への影響／表示）を提示し確認を取る。
2. **現状の切り分け**：本番レジストリで対象タイプの検出条件・確度・グループを、
   アナライザで消費者（スコアラー、reading-policy、パネル）を確認する。
   他タイプの `alternatives` や reading-policy.json の phenomenon 参照も含める。
3. **レジストリ差分**：処置をレジストリに記録する。
   - 候補から外す場合はタイプを削除せず `status: "replaced"` とし、
     `replaced_by` と `audit_ref` で置換先と監査根拠を辿れるようにする。
   - 構造として残す場合は、カテゴリ直下の `structural_axes` に軸を定義する
     （id / label / kind / description / forms / audit_ref）。
4. **生成への影響の明示**：どの候補が消え・残るか、確度・表示しきい値への
   影響を差分として書く。機能候補の生成条件は原則として変更しない。
   `status: "replaced"` のタイプは `_evaluateType` が候補に立てない。
5. **表示**：構造は「形の事実」として、機能候補とは別枠で
   「原文から確認できる情報」に置く。確度は付けない。
   検出は既存チェックと同じ走査を再利用し、二重実装を避ける
   （不定詞では `_articularInfArticleIdx` に一本化）。
6. **検証**：代表例（監査の example_verse）＋競合例＋負例＋回帰例を、
   ローカル（jsdom・スマートフォン幅と PC 幅）で確認してからプレビューへ。
   本番反映はマージ後の実物で再確認する。

## 適用例：冠詞付き不定詞（2026-10-31）

- 監査処置：replace（主語・目的語などの機能分類とは別の注釈軸）。
  代表例 PHP 1:21 τὸ ζῆν。
- レジストリ差分：`infinitive.articular` を `status: "replaced"` とし
  `replaced_by: "infinitive.structural_axes.articular"` を記録。
  infinitive カテゴリに `structural_axes: [articular]`（forms: bare / prep）を追加。
- 生成への影響：消えるのは確度45（表示しきい値未満）の残余候補のみ。
  目的・時・原因・手段など機能候補の条件と確度は不変。
  reading-policy.json の phenomenon `infinitive.articular` は候補が立たなくなるため
  不活性になる（エントリ自体は履歴として残置）。
- 表示：StudyPanel「原文から確認できる情報」に「構造：冠詞付き不定詞
  （ἐν τῷ＋不定詞）」の形で1行。検出は
  `SyntaxAnalyzer.articularInfinitiveStructure()`（window.App.syntax にも公開）、
  analyze() の出力にも `structural` として載る。
  前置詞の判定は形態コード PREP / class で行う（代名詞の形態コード 'P-…' との
  衝突を避けるため `_resolveEntryPos` の 'P' は使わない）。
- 検証例：PHP 1:21（ζῆν・ἀποθανεῖν、構造のみ）、MAT 13:3（目的＋τοῦ）、
  MAT 13:4（時＋読み分け＋ἐν τῷ）、MAT 26:32（時＋μετὰ τό、δὲ 介在）、
  MAT 6:24（冠詞なし → 構造なし、補語のみ）、回帰 ROM 1:1 / JHN 2:17 / ROM 8:35。
