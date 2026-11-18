# DATA LICENSE

本ドキュメントは、本リポジトリに含まれるデータの出典・利用形態・加工内容を整理したものである。

本リポジトリに含まれるデータは複数の外部由来データおよび独自生成データから構成されており、それぞれ性質が異なるため分離して記載する。

---

## 1. macula-greek-SBLGNT

### ■ 出典
MACULA Greek Linguistic Datasets, available at https://github.com/Clear-Bible/macula-greek/

### ■ データ概要
macula-greek-SBLGNTを基にした派生データ。

### ■ 加工内容
- token単位の解析情報を保持
- lemma・形態素情報を保持
- 節（verse）単位で再構成
- 表示用データ構造へ正規化

### ■ 再構成・正規化の定義
macula-greek-SBLGNTのtoken・lemma・形態素情報を保持したまま、節（verse）単位で再構成し、アプリケーション表示用データ構造へ変換する処理。

### ■ 元データとの関係
- 原データの逐次コピーではない
- 構造変換および再集約を含む派生データ
- token単位からverse単位への再構成を含む

---

## 2. bible_data

### ■ データ概要
聖書表示用の内部データ構造。

### ■ 生成元
macula-greek-SBLGNTを基に再構成されたデータ。

### ■ 特徴
- 節単位で整理された表示用データ
- アプリケーション表示用途に最適化された構造
- 原典データそのものではない

---

## 3. Abbott-Smith Dictionary Data

### ■ データ概要
Abbott-Smith辞書データ（lexical reference）を基に構造化したデータ。

### ■ 加工内容
- 英語辞書データを参照
- 日本語説明を追加（人手およびAI支援による生成）
- 辞書データとしての再構成を実施

### ■ データ性質
- 辞書情報を基盤とした派生データ
- 日本語部分は独自生成データを含む

---

## 4. Louw-Nida Semantic Domain Data

### ■ 出典・データの位置づけ
MACULA Greek Linguistic Datasets に含まれる `@ln` / `@domain` 注釈を参照している。MACULA 全体のライセンス表記だけでは、元となる UBS MARBLE 注釈について、このアプリが公開している加工済みデータの再配布条件まで確定したとは扱わない。

### ■ 含まれる情報
- `bible_data` のトークンに `ln` / `domain` コードが含まれる
- `lexicon-lite.json` 等にも意味領域コードが含まれる
- コードを利用するインデックスと表示ラベルも存在する
- Louw–Nida の定義文そのものを収録する意図はない

### ■ 現在の対応（2026-10）
LN 由来の「関連する語／意味グループ」UIを一時停止する。元データや生成スクリプトは削除しない。

**重要:** UI の非表示は、公開データから LN 注釈を除去したことを意味しない。注釈は読書エンジン等の既存処理にも参照されるため、依存関係を分離・検証するまではトークンデータから一括削除しない。公開ペイロードに残るコードの再配布条件は未解決事項として扱う。

### ■ 再開・データ分離の条件
1. 権利者・提供元に確認し、加工・公開配信を含む利用条件を記録する
2. 必要な帰属表示・ライセンス表記を確認する
3. 関連語候補の意味的な精度を別途検証する
4. LN 注釈を必要とする読書処理と、表示用データを安全に分離できるか監査する

---

## 5. SBLGNT Apparatus（テキスト批判装置）

### ■ 出典
jjmccollum/sblgnt-tei, available at https://github.com/jjmccollum/sblgnt-tei

### ■ 帰属表示
The Greek New Testament: SBL Edition © 2010 Society of Biblical Literature and Logos Bible Software.
Apparatus encoded in TEI XML by Joey McCollum (2021).

### ■ ライセンス
CC BY 4.0（クリエイティブ・コモンズ 表示 4.0 国際）ライセンスのもとで利用可能であることを確認済み。
ライセンス原文: https://github.com/jjmccollum/sblgnt-tei/blob/main/LICENSE

### ■ ソースファイル
`work/apparatus/sblgnt_tei.xml`（本リポジトリ内に保存、生成スクリプトの入力）

### ■ 生成物
`public/assets/data/apparatus.json`（`scripts/build-apparatus.cjs` により生成）

### ■ データ概要
SBLGNT（SBL Greek New Testament）本文に対するテキスト批判装置。
SBLGNT の採用読みと、WH・Treg・NA27・TR・RP・ECM 等の主要版における異読を収録。

### ■ 収録範囲（実測値）
- 異読エントリ数: 6,929件（NT全27書巻）
- 代替読み数: 14,132件
- 参照版: ECM / Greeven / Holmes(SBLGNT) / NA(NA27) / NIV(Reader's GNT) / RP(Byzantine) / TR / Treg / Tregmarg / WH / WHapp / WHmarg / WHspur

### ■ 加工内容
- TEI XML を構造化 JSON へ変換
- 既存 bible_data（macula-greek-SBLGNT由来）のトークン参照を付加
- Unicode NFC正規化によるギリシャ語文字照合
- 元データの内容・読みは変更しない

### ■ 元データとの関係
- SBLGNT テキスト自体は bible_data（項目1・2）がすでに収録
- 本データはその異読情報のみを追加
- SBL Errata に記録された誤りは Joey McCollum による修正（@resp="#JJM"）が適用済み

### ■ 個別写本データについて
本データは版（edition）レベルの証人情報のみを収録する。
個別写本（パピルス・大文字写本・小文字写本）の読みは含まない。
写本レベルのデータは INTF/DBG が著作権を保持しており、公開再配布可能な形では入手できない（2026-10現在）。

---

## 6. AIの利用範囲

本プロジェクトではAIを以下の用途で使用している：

- コード生成の補助
- 翻訳作業の補助
- データ構造整理の補助
- 語義分析の下書き補助

ただし、最終的なデータ構造および仕様決定は人間によって行われている。

---

## 6. データの位置づけまとめ

本リポジトリのデータは以下の3分類に整理される：

- 外部由来データ（macula / Abbott-Smith / Louw-Nida）
- 派生・再構成データ（bible_data）
- 補助生成データ（AI支援による日本語説明等）

---

## 7. ライセンス・利用条件

各データのライセンスおよび再配布条件は提供元の規約に従う。

### SBLGNT

SBL Greek New Testament (SBLGNT) は、Faithlife / Logos Bible Software が Michael W. Holmes 編集のもとで公開している。CC BY 4.0（クリエイティブ・コモンズ 表示 4.0 国際）ライセンスのもとで利用可能であることを確認済み。

### MACULA Greek Linguistic Datasets

MACULA Greek Linguistic Datasets は © Biblica, Inc. である。CC BY 4.0（クリエイティブ・コモンズ 表示 4.0 国際）ライセンスのもとで利用可能であることを確認済み。

本リポジトリは CC BY 4.0 の帰属表示義務を満たすよう管理する。

---

## 7-2. 翻訳本文：Karl XII:s bibel (1873)

### ■ 出典
- 版：Karl XII:s bibel（1873年改訂版。英国外国聖書協会 BFBS 印刷版の OCR を1976年の再版で照合したテキスト）。
- 入手元：CrossWire SWORD Project のモジュール **SweKarlXII1873**（Distribution License: Public Domain、OSIS 形式、UTF-8）。取り込みに使ったコピーは GitHub scrollmapper/bible_databases の `sources/sv/SweKarlXII1873`（CrossWire モジュール由来）。

### ■ ライセンス
パブリックドメイン。

### ■ 加工内容
- OSIS マークアップを除去し、書・章・節の構造へ変換（`scripts/karlxii1873/convert.py`）。新約27書・260章・7,954節。節区切りの差は `scripts/karlxii1873/VERSIFICATION.md` に記録。
- 訳文とギリシャ語トークンの対応表（`public/assets/data/alignment/KARLXII1873/`）は本プロジェクトの独自作成データ（モデル支援で章別 spec を作成し、`scripts/karlxii1873/build.py` の機械検証を通したもの）。

### ■ 配置
- 本文：`public/translations/KARLXII1873/`
- 対応表：`public/assets/data/alignment/KARLXII1873/`

---

## 7-3. 関連箇所データ（UBS Parallel Passage Database）

### ■ 出典
UBS Parallel Passage Database © 2023 United Bible Societies。入手元：https://github.com/ubsicap/ubs-open-license （`parallel passages/ParallelPassages.xml`）。

### ■ ライセンス
CC BY-SA 4.0（クリエイティブ・コモンズ 表示-継承 4.0 国際）。ライセンス原文：https://creativecommons.org/licenses/by-sa/4.0/

### ■ 加工内容
- 並行箇所グループを新約の節単位に再構成し、旧約の参照先は本プロジェクトの LXX 本文（`public/bible_data/lxx`）の章・節に照らして遷移先を決定（`scripts/build-related-passages.cjs`）。
- 派生物であり、同じ CC BY-SA 4.0 で提供する（生成物の `_notice` に明記）。

### ■ 生成物・表示
- 生成物：`public/assets/data/related-passages.json`（直接編集しない）。
- 表示：リーダーの「関連する箇所」に出典行を表示（`public/app/ui/related-passages.js`）。アプリ情報ページの出典表にも記載。

---

## 7-4. Cherith Glosses（英語グロス）

### ■ 出典
Cherith Glosses（Andi Wu）、© 2023 Cherith Analytics。

### ■ ライセンス
CC BY 4.0（アプリ情報ページの出典表の記載に従う）。

### ■ 表示上の帰属
アプリ情報ページの出典表（JA／EN／ES／SV）と、検索ツール（Greekn）の入口画面に出典行を表示する。

### ■ 未記録事項
取り込み元の URL・取得日・加工内容は、現時点で本リポジトリ内に記録が見つからない。判明した時点で本節に追記する（推測では書かない）。

---

## 7-5. 翻訳本文の出典

アプリ情報ページの出典表に記載している内容を、ここにも記録する。いずれも、取り込み元・取得日・権利状態の一次確認の記録は本リポジトリ内に見つからないため、**権利状態は本節では断定しない**（要確認）。

| 翻訳ID | 名称 | 出典表の記載 | 配置 |
| --- | --- | --- | --- |
| WEB | World English Bible | Public domain（EN の出典表） | `public/translations/WEB/` |
| RVR1909 | Reina-Valera 1909 | Dominio público — texto obtenido de eBible.org（ES の出典表） | `public/translations/RVR1909/` |
| JA1955 | 聖書 口語訳 | 日本聖書協会、1955年 | `public/translations/JA1955/` |
| BUN | 聖書 文語訳 | 日本聖書協会、1917年改訳 | `public/translations/BUN/` |

Karl XII:s bibel (1873) は 7-2 を参照。

---

## 7-6. 異読データの表示上の帰属

項目5（SBLGNT Apparatus、CC BY 4.0）の帰属表示は、データの `_meta.attribution` と本書に加え、リーダーの「本文の異読」の末尾の出典行、およびアプリ情報ページの出典表にも表示する。

---

## 8. 注意事項

- 本データは研究・学習用途を想定している
- 正確性・完全性は保証されない
- 出典情報は可能な範囲で整理しているが、未確定項目を含む
- 利用・再配布の判断は利用者の責任で行うこと