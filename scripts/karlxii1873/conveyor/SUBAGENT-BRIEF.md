# RVR1909 対応表コンベア — 章作成の共通指示（ROM パイロット承認済み）

## 読むもの（最初に必ず）
- 原則: ~/workspace/bible-app/2026-11-07-spanish-rvr1909/conveyor/PRINCIPLES.md
- 見本 spec: 同フォルダ specs/ROM-1.py（書式・ノートの書き方）
- WEB の同章 spec: ~/workspace/bible-app/2026-11-05-phase1b-web/conveyor/specs/<BOOK>-<CH>.py
  （ギリシャ語トークンのグルーピングと判断のガイド。ファイル名は <BOOK>-<CH>.py。ただしセグメント境界は
   スペイン語の語順・訳し方に合わせて自分で決めること。WEB の None 箇所は
   RVR1909 では本文が一致する場合があるので鵜呑みにしない）

## 作業
担当章ごとに:
1. ワークシート生成:
   cd ~/workspace/bible-app/2026-11-07-spanish-rvr1909/conveyor
   python3 worksheet.py <BOOK> <CH> /home/hatch/workspace/gnt-jp-mainctl/public > worksheet-<book><CH>.txt
2. spec を specs/<BOOK>-<CH>.py に書く（SPEC 辞書。節番号→(開始語,終了語,トークン列|None,ノート|None)）
3. ビルドして全チェック合格まで直す:
   python3 build.py ROM <CH> specs/<BOOK>-<CH>.py out/ROM-<CH>.json /home/hatch/workspace/gnt-jp-mainctl/public

## 品質基準
- ALL CHECKS PASSED が必須（連結一致・範囲・重複は build が検証）
- 対応率は ROM 1 パイロット（98.7%）と同水準を目安。無理に対応づけない（原則1）
- None セグメントには必ずノート（日本語、簡潔に）。規則6（ビザンティン補い）・
  7（節境界）・8（関係節化・慣用表現・迂言訳）にも必ずノート
- 未対応トークンは理由が原則で説明できるものだけ（小辞の脱落、節境界の相手側、
  多義的で決め切れないもの）
- bible_data の数値フィールドは文字列。tokenIndex・verse は int() で扱うこと
- RVR1909 本文データは public/translations/RVR1909/ にある（build が参照）

## 禁止
- git / GitHub への push や PR はしない。ファイル作成と build まで
- 担当章以外の spec・out を編集しない。既存の ROM 分に触らない
- 本文テキストを推測で直さない（build の連結検証が原文を保証する）

## 報告に含めるもの（章ごと）
- build の TOTAL 行（対応率）
- 未対応トークンの一覧と理由
- None セグメントの一覧とノート内容
- 判断に迷った箇所があれば、その節と迷いの内容

## 置換型異読の統一扱い（原則6b、ROM 監査で確定）
- RVR の語が bible_data とは別のギリシャ語を訳している場合（例： ROM 10:17 de Dios ↔
  bible_data は Χριστοῦ）は、None セグメント＋ノートにし、bible_data 側トークンは
  未対応とする。付加型（ギリシャ語に無い語の補い）も従来どおり None。
- 代名詞の人称・数の読み違い（ROM 8:2 σε→me 等）は同一スロットとしてノート付きで対応づける。
