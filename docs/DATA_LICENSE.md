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

## 4. 外部意味領域注釈（削除済み・2026-11-21 #196）

### ■ 経緯
MACULA Greek Linguistic Datasets に含まれる意味領域注釈（UBS MARBLE 由来）を参照していた。MACULA 全体のライセンス表記だけでは、本アプリが公開している加工済みデータの再配布条件が確定しないため、2026-11-21 のユーザー決定により分離保持ではなく**削除**とした。

### ■ 削除したもの（2026-11-21 完了）
- `bible_data` 全トークンの注釈コード（旧 `ln` / `domain` フィールド）
- `lexicon-lite.json` の注釈コード（旧 `ln` / `domains` フィールド）
- `assets/data/index/` の語索引・クラスター索引・表示ラベル（3 ファイル）
- `search-concepts.json` の注釈コード（旧 `domains`）
- 注釈を前提とした「関連する語／意味グループ」UI 一式と、その読み込み処理
- 語彙データ・監査出力・IGSD 注記に含まれていた注釈番号の記述

### ■ 置き換えたもの
読書エンジンの照合（語順で読むの語義置換・前置詞句の助詞照合・semanticInfo）は、注釈コードを**不透明な内部キー**へ置換して維持した。
- `token.sense`：(lemmaId, 注釈) 単位のセンスキー（`s<n>`）
- `token.senseGroup`：主ドメイン単位のグループキー（`g<n>`）

キーは乱数順に割り当てた無意味な連番で、元の番号体系・分類名・ラベルを表さない。コード→キーの対応表は移行時にメモリ内でのみ生成し、保存していない（コミット・作業ファイルのいずれにも残していない）。エンジンはキーを等値比較するだけで、照合結果は移行前とバイト単位で同一であることを全 NT トークンで確認した。

### ■ 再混入の防止
- 置換は `scripts/migrate-semantic-keys.cjs` で恒常化している。上流から `bible_data` を取り直して注釈が再混入した場合は、本スクリプトを実行すると既存キーを引き継いで内部キーへ置換する
- `node scripts/migrate-semantic-keys.cjs --check`（`npm run check:semantic-keys`）で、公開データに注釈コード・旧フィールド・削除済み索引が残っていないことを検査する

### ■ 残る事項
- Git の履歴には削除前のデータが残る（履歴の書き換えは行っていない）

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

- 外部由来データ（macula / Abbott-Smith。外部意味領域注釈は §4 のとおり削除済み）
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

### ■ 取り込み経路（2026-11-21 確認）
本アプリの `english` フィールドは MACULA Greek（Clear-Bible/macula-greek）の単語属性 `english` に対応し、MACULA のコンポーネント表記により Cherith Glosses 由来であることを確認した。すなわち Cherith Glosses は MACULA 経由で取り込まれており、単独の配布元から直接取得したものではない。出典 URL は MACULA のリポジトリ https://github.com/Clear-Bible/macula-greek とする。bible_data のリポジトリへの取り込みは 2026-07-01（コミット a8eef8c2）。2026-11-21 に ROM 1:1 のトークンで現行 MACULA の属性値と照合し、一致を確認した。

---

## 7-5. 翻訳本文の出典

アプリ情報ページの出典表に記載している内容を、ここにも記録する。取り込み元については 2026-11-21 に本文照合を行い、下記の「取り込み元の記録」のとおり確認した。

| 翻訳ID | 名称 | 出典表の記載 | 配置 |
| --- | --- | --- | --- |
| WEB | World English Bible | Public domain（EN の出典表） | `public/translations/WEB/` |
| RVR1909 | Reina-Valera 1909 | Dominio público — texto obtenido de eBible.org（ES の出典表） | `public/translations/RVR1909/` |
| JA1955 | 聖書 口語訳 | 日本聖書協会、1955年 | `public/translations/JA1955/` |
| BUN | 聖書 文語訳 | 日本聖書協会、1917年改訳 | `public/translations/BUN/` |

### ■ 取り込み元の記録（2026-11-21、本文照合により確認）

- WEB: 配布元は eBible.org（engwebp、USFM 形式で配布）。2026-11-21 に ROM 1章の全32節を eBible.org の現行 USFM と照合し、一致を確認した。リポジトリへの取り込みは 2026-11-05（コミット 83aa0df4）。
- RVR1909: 配布元は eBible.org（spaRV1909）。同日、ROM 1章の全32節を照合し、一致を確認した。取り込みは 2026-11-07（コミット d34a91ac）。
- JA1955: scrollmapper/bible_databases の JapKougo（「口語訳『聖書』(1954/1955年版)」と表記）と GEN 全1,533節を照合し、文言の一致を確認した（差異は句読点後の空白の有無のみ）。版の同定は下記の開発者確認による。
- BUN: 取り込み元は scrollmapper/bible_databases の JapBungo と特定した（GEN 全1,533節を照合し実質一致。唯一の差異は配布側データへのバックスラッシュ混入1件で、本アプリのデータには含まれていない）。同リポジトリの版表記は「明治元訳『舊約聖書』(1953年版)／大正改訳『新約聖書』」であり、出典表の記載（日本聖書協会、1917年改訳）は新約の改訳年を指すものと整合する。リポジトリへの取り込みは 2026-07-01（コミット a8eef8c2）。明治・大正期の翻訳であり、著作権の保護期間は満了している。

JA1955（口語訳）については、収録データが1955年版そのものであることを開発者が確認済み（2026-11-19）。日本聖書協会は口語訳をパブリックドメインとして扱っており、本データは1975／1984／2002年の修正版由来ではないため、修正部分に関する権利の留保も適用されない。

Karl XII:s bibel (1873) は 7-2 を参照。

---

## 7-6. 異読データの表示上の帰属

項目5（SBLGNT Apparatus、CC BY 4.0）の帰属表示は、データの `_meta.attribution` と本書に加え、リーダーの「本文の異読」の末尾の出典行、およびアプリ情報ページの出典表にも表示する。

---

## 7-7. 七十人訳（LXX）ギリシャ語旧約聖書

### ■ 出典
- データ: `public/bible_data/lxx/`（正典39書、章別 JSON、NT と同じトークン構造）
- 本文の底本: Septuaginta, ed. A. Rahlfs（Stuttgart: Württembergische Bibelanstalt, 1935）。TLG（カリフォルニア大学アーバイン校）が電子化し、CATSS が Göttingen の個別版への適合を進めたテキスト
- 形態解析: CATSS LXXM（morphologically analyzed Septuagint、CCAT = ペンシルベニア大学 Center for Computer Analysis of Texts、R. Kraft らのチームによる）
- 取り込み元: GitHub リポジトリ nathans/lxxmorph-unicode（LXXM の Unicode 変換、Nathan D. Smith）。2026-11-21 の照合で、GEN 1章（741トークン）、JOS 1章（441トークン）、JDG 1章（939トークン）、DAN 1章（498トークン）の text／morph／lemma がすべて一致することを確認し、出所を特定した。ヨシュア記・士師記は B テキスト、ダニエル書は Theodotion 版を収録している。配布物に含まれる続編等のファイルは取り込んでいない。リポジトリへの取り込みは 2026-07-01（コミット a8eef8c2）

### ■ アプリ側の加工
トークン構造への正規化と xml:id の付与。Strong 番号は原データに含まれておらず、アプリ側で lemma 照合により付与した（付与できない語は空欄）。english／japanese／gloss は空。

### ■ 利用条件
CCAT の配布条件（配布物の 0-readme.txt／0-user-declaration.txt）では、このデータは学生・教師・研究者の学習・教育目的での利用を前提として配布され、商用利用には権利者・開発者の事前の書面同意が必要とされる。再配布にも条件がある。本アプリは現在、無償・非商用で公開している。

### ■ 対応状況
アプリ内クレジットへの LXX の出典表示は、アプリ情報ページの出典表に追加した（2026-11-21、全言語）。収益化を行う場合は、事前に同意取得の要否を確認する（未対応）。

### ■ 商用利用に関するメモ（2026-11-21）
- 本アプリは現在、無償・非商用で公開しているため、CCAT への同意確認は収益化を判断する時点まで保留する（2026-11-21、開発者判断）。現時点の残課題としては扱わない。
- 流通している Rahlfs 系の電子データの多くは CCAT（CATSS）由来であり、派生リポジトリが MIT や CC 等のライセンスを掲げていても、上流の CCAT の利用条件は消えない。本データの商用利用の可否は、取り込み元リポジトリの表示ではなく CCAT の条件で判断する。個別リポジトリのライセンス表示は、利用する段で一次確認する。
- 代替案：同意が得られない場合の逃げ道として、Swete 版（底本はパブリックドメイン）をベースにしたオープンデータ（OpenGreekAndLatin／nathans/lxx-swete、CC BY-SA 4.0）への底本差し替えがあり得る。ただし CATSS 級の形態素解析データの同等物は存在しないため、差し替えは形態素の再構築を伴う大規模作業になる。検討の順序は「まず CCAT へ同意確認 → 不可なら Swete 差し替え」。


---

## 8. 注意事項

- 本データは研究・学習用途を想定している
- 正確性・完全性は保証されない
- 出典情報は可能な範囲で整理しているが、未確定項目を含む
- 利用・再配布の判断は利用者の責任で行うこと