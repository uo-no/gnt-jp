# RVR1909 conveyor（原本・無改変）— #116 手順2 の材料

ポポのワークスペース `~/workspace/bible-app/2026-11-07-spanish-rvr1909/conveyor/` から、
Claude が参照できるようリポジトリへ移したもの。内容は原本のまま（RVR1909 用）。

- `build.py` — 組立＋機械検証。`translations/RVR1909` パスと translation ID がハードコードされている。手順2ではこれを複製し、KARLXII1873 用に差し替える（検証ロジックは変えない）。
- `PRINCIPLES.md` — RVR1909 の作成原則。スウェーデン語版を作る際の土台。
- `review.py` / `SUBAGENT-BRIEF.md` — 検証補助と運用メモ。
- `specs/ROM-1.py`（パイロットの見本）/ `specs/ROM-2.py` / `specs/JHN-1.py` — spec 形式の見本。

spec 形式：1章＝1ファイル、辞書 SPEC は 節番号 → セグメント列。
各セグメントは (開始語, 終了語, トークン列|None, ノート|None)。
語番号はその節の訳文を単一スペースで割った1始まりの通し番号、
トークン列は bible_data の節内 tokenIndex。
