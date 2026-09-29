# Representative Screens

9つの必須Representative Screenを仕様として記述する。うち3つ（Single Reading／Mobile Comparison／Structural Reading）は`components/`配下にライブプレビューも収録した——それぞれ`Verse`・`ComparisonMobileStacked`・`StructuralNode`の実使用例として参照できる。美しいスクリーンショットを目的とせず、30分読んでも疲れないことを検証基準とする（`05`§1）。

## 1. Single Reading

Desktop：`Navigation Column | Bible Reading Surface`の2カラム。ReadingLocationBarが最上部、その下にChapter見出し（`ui-display`）、Verseの縦積み（`space-5`間隔）。右側の余白は本文の最大行長を確保する程度に留め、SaaS的な余白の使い方（巨大な空白フレーム）は避ける。Mobile：ヘッダー＋Verse縦積みのみ、Bottom Navigationが常設。既存実装のこの状態は、ほぼそのまま良質な基準線であり、変更は最小限（ReadingLocationBarのTranslation/View Modeチップ分離のみ）。

## 2. Comparison Reading — Desktop

`Navigation Column | [Translation A pane | Translation B pane]`。2ペインは`border-hairline`1本で区切り、ヘッダーにそれぞれ`Translation Label`（翻訳名のみ）。ReadingLocationBarはペインの外側、画面上部に1つだけ——Bible Locationは2ペインで共有される単一の情報であることを構造でも示す。Comparison Syncは`03`§3のVerse基準。View Modeは各ペイン独立して選べるが、既定はTranslation A=Default、Translation B=Defaultで揃え、ユーザーが明示的に変えるまでStructural系Modeを両ペインに同時適用しない。

## 3. Comparison Reading — Mobile（最重要）

`03-comparison-architecture.md`§5で設計した`ComparisonMobileStacked`。Translation A→Translation Bの縦積み、`space-7`区切り。ヘッダーは「比較」であることをラベル1語で示すのみ（アイコンの多用を避ける）。この画面の成功基準は「差分を探す画面」に見えないことであり、単独のSingle Readingを2つ縦につなげたように見えることが正解——ライブプレビューを`components/ComparisonMobileStacked/preview.html`に収録。

## 4. WORD_ORDER

原語の語順に沿って単語トークンを横に並べ、各トークンの下に小さなグロス（`gloss-source`、見出し語・簡潔な訳語）を添えるインターリニア形式。トークン間の間隔は構文的なまとまり（前置詞句など）でわずかに広げ、完全な等間隔グリッドにはしない——語順そのものが持つリズムを殺さないため。Comparison中は、Translation側のDefault文と、原文側のWORD_ORDERを左右または上下で対にする使い方を許容する（`03`§2.1で述べた「TranslationとView Modeの独立した組み合わせ」の具体例）。

## 5. STRUCTURE

実機で確認した既存の右パネル型Structural Readingを踏襲。デスクトップでは本文の右側にパネル（`shadow-panel`、`surface-raised`）として展開し、`StructuralNode`のネストした箱を上から下に階層表示する。モバイルでは本文の下に同じ内容をインラインで展開する（右パネルという空間の余裕がないため、Sheetではなくインライン展開を選ぶ——構造を読むという行為はReadingの延長であり、Sheetで覆ってReadingを隠すのは目的に反する）。

## 6. CLAUSE_ROLE

STRUCTUREと同じ`StructuralNode`語彙を使うが、既定で開く層がFUNCTION（文の役割）のみに絞られている状態——「文の役割で読む」は、STRUCTUREの中のFUNCTION層だけを取り出した、より軽量な入口という位置づけにする。共通コンポーネントの上に成り立つ「別モードだが別部品ではない」という`01`§5の原則の具体例。

## 7. RELATION

`structural-connector`による接続線を主役にした表示——語と語、節と節の「つながり」を、箱の入れ子ではなく線と矢印で示す。STRUCTURE/CLAUSE_ROLEが「階層」を主に見せるのに対し、RELATIONは「関係」を主に見せる、という役割分担をVisual Grammar（`05`§2）の同じ色トークンの上で表現する。

## 8. Research / Deep Dive

Reading Surfaceの上に重なるサイドパネル（デスクトップ）またはボトムシート（モバイル）。ReadingLocationBarはPanel内にも小さく複製表示し、「今どこを調べているか」を見失わせない。Panel内の情報はProgressive Disclosure（`05`§5）に従い、語義要約→形態→統語→Morph/Syntax Searchへのリンクの順で深くなる。

## 9. Research → Return

Panel/Sheetを閉じる操作（×、または背景タップ）で、Reading Surfaceは直前のReading State・View Mode・Translation A/B・スクロール位置に完全復元される（`04`§3, §6）。復元時に一瞬のハイライト（`accent-greek-100`を`space-4`分の背景として0.6秒フェードアウト）で「ここに戻った」ことを視覚的に確認できるようにするが、これは唯一許容する装飾的モーションであり、Research Returnという状態遷移の正しさを裏付けるためだけに使う。
