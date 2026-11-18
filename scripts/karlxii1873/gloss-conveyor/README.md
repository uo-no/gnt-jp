# ES グロス conveyor（原本・無改変）— #117 の材料

ポポのワークスペース `~/workspace/bible-app/2026-11-10-spanish-phase2/gloss-conveyor/` から移したもの。RVR1909 用の原本のまま。

- `build.py` — per-token グロスの検証器。キー集合＝アラインメントの対応トークンと完全一致、セグメントごとの語の多重集合一致、訳語のないトークンはブラケットラベル（BRACKETS 集合）1つ。
- `gen.py` — 生成補助。
- `BRIEF.md` — 運用ブリーフ。
- `specs/ROM-1.py` — gloss spec の見本（GLOSSES 辞書： "節!tokenIndex" → グロス文字列）。

#117 では build.py を KARLXII1873 用に複製し（translation ID・パスの差し替えのみ）、ブラケット集合をスウェーデン語に置き換える。
