# StudyPanel 第3層 実装経路と表示契約の差分監査

- 監査日: 2026-10-23
- 基準 main: `62390d8227cb373103ba64b9c94deabf8238ca74`
- 対象: `public/index.html` の Desktop `_renderReadingNotes()` と Mobile `_mobileInspectorDetail()` / 非同期注入経路
- 目的: `studypanel-layer3-display-contract.md` の設計目標と実装を照合し、次のUI変更を根拠ある小さな単位に分ける。
- 範囲: 静的コード監査。アプリコード・辞書・原文データは変更しない。

## 結論

空の識別ラッパーは PR #245 で除去された。一方、Layer 3 の表示契約で定めた「原文から確認できる情報 → 文法・統語の分析と判断根拠 → 語義・語彙資料 → コーパス・外部資料への導線」という意味分類は、現行 DOM ではまだ一つの構造に整理されていない。

特に Desktop では形態情報・統語ラベル・語源構成・Abbott-Smith 辞書全文が同じ `#rn-level2-details[data-study-section="morphology"]` の内側に置かれている。Mobile でも形態・Lemma・Strong・統語ラベル・非同期の語源構成・辞書全文が同じ `.mvv-l3-section[data-study-section="morphology"]` 内にある。これは資料の欠落ではなく、情報の種類と配置の対応が不明瞭という問題である。

## 実装で確認した事実

### Desktop

`_renderReadingNotes()` の現行 HTML 生成は次の構成。

- 読書メモ本文: `details.rn-word-reading-note`（本文がある場合）
- 経験者向けラベル: `expLabelHTML`（条件を満たす場合）
- 構造表示: `data-study-section="structure"`
- `section#rn-level2-details[data-study-section="morphology"]` 内:
  - `morphGridHTML` — 形態情報
  - `morphCandidatesHTML` — 他に成立する形態（存在時）
  - `etymologyHTML` — 語構成・語源メモ（存在時）
  - `syntaxLabelHTML` — 統語ラベル（存在時）
  - `abbottFullHTML` — Abbott-Smith 辞書全文（存在時）

### Mobile

`_mobileInspectorDetail()` の現行 HTML と非同期注入経路は次の構成。

- `#mvv-reading-slot` — 読書メモ用スロット
- 経験者向けラベル
- `#mvv-flow-slot[data-study-section="structure"]` — 構造表示の非同期スロット
- `.mvv-l3-section[data-study-section="morphology"]` 内:
  - Lemma / Strong（値がある場合）
  - 形態情報と他に成立する形態（値がある場合）
  - `#mvv-etymology-slot` — 語構成・語源メモの非同期スロット
  - `#mvv-syntax-slot` — 統語ラベルの非同期スロット
  - `#mvv-abbott-slot` — Abbott-Smith 辞書全文の非同期スロット

### 非表示・未実装の項目

- 使用傾向は Desktop / Mobile とも StudyPanel 内で重複表示しない方針。
- LN 由来の関連語表示はフラグで停止中。再有効化しない。
- Research Links のセクションは現行生成 HTML で確認できないため、表示される機能として扱わない。
- Desktop / Mobile の情報差は確認した事実として記録する。今回の監査だけで機能の機械的な同一化はしない。

## 表示契約との差分

| 表示契約 | 現行実装 | 判定 |
|---|---|---|
| A. 原文から確認できる情報 | 形態情報は形態区画にある。Mobile の Lemma / Strong も同区画 | 部分一致 |
| B. 文法・統語の分析と判断根拠 | 統語ラベルが形態区画内に置かれる。ラベルの存在だけでは本文に即した判断根拠が揃っているとは限らない | 要整理・内容検証が必要 |
| C. 語義・語彙資料 | 語構成メモと辞書全文が形態区画内に置かれる | 配置の意味が不明瞭 |
| D. コーパス・外部資料への導線 | 使用傾向の重複表示なし。Research Links の描画なし | 方針は整合。用例検索導線は別途確認 |
| 第3層全体の任意閲覧 | 形態区画は現状、単独の折りたたみではない。Desktop は `section`、Mobile は `section` | 未決定事項として残る |

## 次の実装単位

1. **まず表示経路のブラウザ監査を拡張する。** 通常の形態語、形態候補のある語、辞書・語構成の両方がある語、辞書や Lemma が欠ける語を含める。PC / Mobile でセクションの可視性、順序、空スロット、語切替時の対象語一致を確認する。
2. **次に情報区分の DOM 整理を行う。** A〜D の見出しをただ追加するのではなく、実データがある区画だけを描画し、統語ラベル・語構成・辞書全文をそれぞれ適切な意味区分へ配置する。
3. **開閉設計は一体で判断する。** 形態区画だけを別の折りたたみにせず、既存の「詳しく見る」導線・読書メモ・スクロール領域との関係を PC / Mobile で検証してから、第3層全体を任意閲覧にするか決める。
4. **候補・根拠の文言は表示区画の移動と混ぜない。** 統語ラベルが出ていることを、具体的な本文上の判断根拠が表示されていることと同一視しない。文言改善は、シグナルと対象箇所のデータを照合した別の変更として扱う。

## 保持する資産と安全策

- Abbott-Smith 辞書全文、形態情報、Lemma / Strong、構成的な語義説明、既存の候補・統語データは削除しない。
- 非同期注入の世代管理と stale 結果防止を維持する。
- LN 関連語表示を再有効化しない。
- 未実装の Research Links や未確認の根拠を、存在するように見せない。
- まず検査を増やし、その結果に基づいて表示変更を小さな PR に分離する。

## 監査の限界

これはコードの生成経路を読んだ静的監査であり、実際の画面での余白・開閉・語切替・URL復元の全ケースを実証したものではない。PR #243 / #245 の既存ブラウザ監査はヨハネ3:16の3語に限定されている。全体の整理完了には、上記の代表語群と PC / Mobile の追加ブラウザ検査が必要。
