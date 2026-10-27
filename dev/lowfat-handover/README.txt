Lowfat 文構造エディタ  グループ移動機能  引き継ぎパッケージ
=====================================================================
作成: 作業中断時点の成果物。実装は途中（性能問題が未解決）。
重要: 公開版 rk-diagram.html は変更禁止。このZIPには含めていない（参照用のSHA-256のみ記載）。

1. ZIPの構成と各ファイルの説明
---------------------------------------------------------------------
app/rk-diagram-m3.html
    現在の作業版（グループ移動の実装を含む）。8678行(wc -l)。SHA-256: c8d4cfadb578bd157a7ec3996fb9bf3b2b7c9b33272bf8fbe334d55066fbacdc
app/rk-diagram-m3.before-groupmove.html
    グループ移動の実装に着手する直前の版（M3・初期ズーム・系譜配置・所属バッジ・ズームUI右上移動までを含む）。
    SHA-256: 345d10a4ae798a863741884e1411cb6e39b2082943f728383cb5475255194e3c   ここへ戻すには、これを rk-diagram-m3.html としてコピーする。
data/lowfat/*.xml  (26ファイル)
    試験用のLowfat XML（聖書のLowfat。アップロードされた lowfat.zip の内容と完全に一致を確認済み）。
tests/*.js  (Puppeteer + Chromium で実ブラウザを操作する試験・検証スクリプト)
    gb2.js   Phase B: rk-dyによる押し下げの性質（連鎖・上方向クランプ・二重適用なし・別の列・手動語・冪等）
    gc0.js   調査用: dashの線を持つ積みの数と項目数の分布
    gc1.js   Phase C/D: dash線のドラッグ(レイアウト/構造編集の差)、押し下げ、Undo/Redo、変更一覧、JSON、Auto Layout、手動配置リセット、解除ボタン
    gc2.js   mod線のドラッグ、手動語の追従、上方向クランプ、保存→新規ページ再読み込み、パン/語ドラッグ/M3との競合
    gc3.js   性質検査(262文×ランダム4グループ×オフセット3種=2,775試行)とルカ3:23-38
    gc4.js   ルカ: hgt()不変性・hoist判定の安定、実ドラッグの性能(※この試験が性能問題で失敗する)
    gp1.js   性能の原因調査用プロファイラ。※未完成: dtがconstのため関数を差し替えられずエラー終了。計測データなし
    lay.js / lay2.js / lay3.js  全文の座標・線構成の比較(7,544文)。lay3.js は before-groupmove と現行の比較
    m5.js, m7a.js, m7b.js, m7c.js, m7lib.js, q3.js, z3a.js, z3b.js, z4.js, au1.js, au2.js
        グループ移動の実装前から使っていた既存の回帰試験（M3・Undo/Redo・ツリーD&D・Save XML・ズーム・文移動・データ整合）。
        ※グループ移動の実装後は再実行していない（未実施）。
tests/support/sets.json, luke.xml, lukeinfo.json
    試験が /tmp から読む補助データ（文の選択・Luke 3:23-38のXML・ドロップ試験位置）。

2. 現在の実装状況
---------------------------------------------------------------------
仕様: dash(接続詞→節の点線) / mod(頭語→修飾句の斜線) をドラッグして句・節グループを上下移動。
      wgの属性 rk-dy(縦オフセット,px,整数) に保存。後続グループは構造の流れで必要な分だけ押し下げ。
Phase A レイアウト基盤   完了・確認済み。rk-dyなしで全7,544文の座標・線構成が現行と一致（※Phase A直後のコードで確認）
Phase B オフセットと押し下げ  完了・確認済み（gb2.js, gc3.js）
Phase C ドラッグUI       実装済み。dash/mod両方。レイアウト編集モードのみ有効。★ルカで遅延あり(下記)
Phase D 保存・履歴・解除  完了・確認済み（Undo/Redo=1操作1件、保存→再読み込み一致、解除ボタン、変更一覧、JSON groupOffsets）
主な実装箇所 (app/rk-diagram-m3.html の行番号。生成時点):
    GM(計測値) L8301  dyOf L8302  stack() L8303  mods() L8316
    groupDyFor L8327  applyGroupDy L8329  clearAllGroupDy L8330
    startGroupDrag L8616  ヒット領域の生成(draw内) L8428  moved() L8437
    解除ボタン #gx のハンドラ L8657  diff() L8532  JSON表示(groupOffsets) L8562
    drawBoxes() L8401  m3Target() L8578
仕様上の制約: modは接続先がwgのときだけ対象（1語の修飾語は対象外）。先頭の項目は上へ動かせない（直前の下端でクランプ）。
    押し下げの結果はドロップ時にだけ反映（ドラッグ中は対象グループのみ表示）。実データのdashは「接続詞+節1つ」が大半（1コリント829積み中、2項目は4件）。

3. 未解決の性能問題
---------------------------------------------------------------------
症状: ルカ3:23-38(165語)で、レイアウト編集モードのままmod線をドラッグすると、移動中の1ステップが非常に遅い。
実測: 1ステップ平均 2,359.9ms（gc4.js。倍率1.0、mod線(grpを持つ線の13本目)、対象グループ20語、2pxずつ40ステップ。
      puppeteerのmouse.moveの経過時間で、DevTools側の遅延も含む）。ドロップ時のrk-dy確定は正常(rk-dy=72)、Undoは68ms。
再現条件: node tests/gc4.js （ルカ 3:23-38 を go(119) で開く → #mL → mod線の中点でmousedown → 2pxずつ縦に移動）
確認できたこと: 移動中(pointermove)に遅い。ドロップ・Undoは速い。再レイアウトは移動中は行わない（paint()は座標とSVG属性を更新し drawBoxes() を1回呼ぶ）。
未確認(仮説): (a)移動中に毎回呼ぶdrawBoxes()が重い (b)ヒット領域(pointer-events:stroke)やdt()の影響 (c)ヘッドレスChromium/DevTools側の遅延。
    参考: 以前の語ドラッグ(moved())はルカで1回あたり約14〜27ms。これだけでは2.4秒を説明できない。
未実施: ドラッグ開始時・ドロップ時の所要時間の個別測定、通常文での移動中の測定、gp1.jsによるプロファイル（dtがconstで差し替え不可のため失敗。
    performance計測の埋め込み、CDPのProfiler/Tracing等の別の方法が必要）。
注意: 最初の実測は試験側の不備(layout()を直接呼び画面の語との対応が壊れた状態)でコンソールエラーが出た。refresh()を挟んで修正済み。

4. テスト実行に必要な環境
---------------------------------------------------------------------
Node.js v22.22.2 で実行（他は未確認）。
npm: puppeteer-core 25.12.0, @sparticuz/chromium 153.0.0
    (npm i puppeteer-core @sparticuz/chromium)。使用したChromiumは HeadlessChrome 153.0.8010.0（@sparticuz/chromium同梱、headless:'shell'）。
各スクリプトの先頭は  require('@sparticuz/chromium')  と  require('puppeteer-core')  で、スクリプトのあるフォルダの node_modules を参照する。
画面サイズは 1280x800 固定。ブラウザの種類はChromium(ヘッドレス)のみ確認済み。他ブラウザ・タッチ・狭い画面は未確認。
例: cd tests && npm i puppeteer-core @sparticuz/chromium && timeout 290 node gc4.js
    (1回の実行が長いものは300秒近くかかる。gc3.js, gc2.js, lay*.js など)

5. 環境固有の絶対パス（新しい環境で変更が必要）
---------------------------------------------------------------------
スクリプトに直書きされている絶対パスと、使用しているスクリプト:
  /home/claude/lf/lowfat/
      使用: gb2, gc0, gc1, gc2, gc3, gc4, gp1, lay, lay2, lay3, m7a, m7c, z3a, z3b
  /home/claude/lf/lowfat/03-luke.xml
      使用: au2, m7b, q3, z4
  /mnt/user-data/outputs/rk-diagram-m3.before-genealogy.html
      使用: lay
  /mnt/user-data/outputs/rk-diagram-m3.before-groupmove.html
      使用: lay3
  /mnt/user-data/outputs/rk-diagram-m3.before-visibility-audit.html
      使用: lay2
  /mnt/user-data/outputs/rk-diagram-m3.before-zoom.html
      使用: z3a
  /mnt/user-data/outputs/rk-diagram-m3.html
      使用: au1, au2, gb2, gc0, gc1, gc2, gc3, gc4, gp1, lay, lay2, lay3, m5, m7a, m7b, m7c, q3, z3a, z3b, z4
  /mnt/user-data/outputs/rk-diagram.html
      使用: m7c
  /tmp/audit_saved.xml
      使用: au1
  /tmp/gm_saved.xml
      使用: gc2
  /tmp/lukeinfo.json
      使用: m7b
  /tmp/sets.json
      使用: z3a, z3b
対応方針:
    /mnt/user-data/outputs/rk-diagram-m3.html 等 → 新環境の app/ の絶対パスに置換（file:// 付きで使用）
    /home/claude/lf/lowfat/ → 新環境の data/lowfat/ に置換
    /tmp/sets.json, /tmp/luke.xml, /tmp/lukeinfo.json → tests/support/ の実パスに置換（スクリプトは /tmp から読む）
    /tmp/pre_m3_published_copy.html は ZIPに含めていない（公開版そのもののコピー。公開版の保護確認にだけ使用）
    /tmp/br は作業ディレクトリ。/tmp は一時領域のため、他に /tmp へ出力する中間ファイル(sweep.json 等)がある
置換例: sed -i 's#/home/claude/lf/lowfat/#/path/to/data/lowfat/#g; s#/mnt/user-data/outputs/#/path/to/app/#g' tests/*.js
lay3.js などは「現行と before-groupmove を比較」するため、両方を同じフォルダに置いてパスを合わせること。

6. 実施済み試験と未実施試験
---------------------------------------------------------------------
実施済み・合格（現行ファイル、実ブラウザ）: gb2.js, gc1.js, gc2.js, gc3.js, gc4.js の前半(hgt不変性・hoist安定)
    ＋Phase A直後に全7,544文の座標・線構成の一致（lay3.js）
実施済み・失敗: gc4.js の性能判定（1ステップ80ms未満）→ 上記の性能問題
未実施（グループ移動の実装後は再実行していない）:
    全7,544文の一致の再確認、M3の既存試験(m7a/m7b/q3/z4)、データ整合・保存(au1/m5)、ズーム・文移動(z3a/z3b)、ルカの表示(au2)
    rk-dyを持つ文での、ツリーD&D・構造編集後の再配置・XMLテキストの直接編集
注: 既存試験のうち属性の許可リストを使うもの(m5/au1)は rk-x/rk-y/rk-status のみ許可。rk-dy を使う場合は更新が必要。
参考(要件外): 性質検査で、移動により線が長くなり、新たな線×語の交差が延べ45件増えた（基準は6件）。

7. 公開版の保護
---------------------------------------------------------------------
公開版 rk-diagram.html は変更禁止（公開・上書き・編集をしないこと）。このZIPには含めていない。
SHA-256 先頭24桁(作業中の確認値): d8c8aa03241f09489efe77aa   サイズ426,673バイト
公開中のアーティファクトは https://claude.ai/artifact/J6VbgzWz53pio3HxPvtq1n （公開版と一致を確認済み。M3・初期ズーム等は未反映）。
Git: リポジトリなし（コミットIDなし）。版管理はバックアップファイルのみ（outputs内の rk-diagram-m3.before-*.html）。

8. 最初に確認する順番
---------------------------------------------------------------------
1) tests/gc4.js を実行して遅延を再現  2) app/rk-diagram-m3.html の startGroupDrag の paint() と drawBoxes()
3) gp1.js を修正して計測（またはperformance計測を一時的に埋め込む）  4) 修正後、gb2/gc1/gc2/gc3/gc4 → 既存の回帰試験 → lay3.js で全文一致を再確認
