# KARLXII1873 per-token グロス — 作成原則（提案・ポポ確認待ち）

ES 版 `gloss-conveyor/BRIEF.md` を土台にしたスウェーデン語版。**ブラケット集合と下記3点（S-a〜S-c）はポポの確認後に確定する**（確認前は gloss spec の量産に入らない）。

## 形式（ES 版と同一）
- spec：`specs/GLOSS-ROM-<CH>.py`（予定）に `GLOSSES = {"<節>!<tokenIndex>": "<グロス>"}`。
- 検証：`python3 scripts/karlxii1873/gloss-build.py ROM <CH> <spec> public/assets/data/gloss-token/KARLXII1873/ROM/<CH>.json public/assets/data/alignment/KARLXII1873 public/bible_data/nt`
  - キー集合＝アラインメントで対応づいたトークンと完全一致
  - セグメントごとに、ブラケットでないグロスの語の多重集合＝セグメント本文の語の多重集合
  - 訳語の無いトークンはブラケットラベル1つ
- 出力形式は RVR1909 の gloss-token と同一（translation だけ `KARLXII1873`）。
- スウェーデン語の語は対応表のセグメント本文に実在する語のみ（創作禁止）。None セグメント・未対応トークンには付けない。

## ブラケット集合（提案：ES 版→スウェーデン語）
| ES | SV（提案） | 用途 |
|---|---|---|
| `[artículo]` | `[artikel]` | ギリシャ語の冠詞（スウェーデン語の定冠詞は名詞語尾・指示形 den/det/de は名詞句側に入る） |
| `[partícula]` | `[partikel]` | 小辞 |
| `[transición]` | `[övergång]` | 接続・転換 |
| `[neg.]` | `[neg.]` | 否定 |
| `[prep.]` | `[prep.]` | 前置詞 |
| `[relativo]` | `[relativ]` | 関係詞 |
| `[contenido]` | `[innehåll]` | 内容節の標識（ὅτι 等） |
| `[condición]` | `[villkor]` | 条件 |
| `[absorbido]` | `[absorberad]` | 他のトークンのグロスに吸収されたもの（動詞に含まれる主語代名詞など） |

## ES 規約のスウェーデン語での扱い（提案）
- S-a（合体名）：ES の「Jesucristo」のような合体語はスウェーデン語に無い（Jesu / Christi は別語）。Ἰησοῦς と Χριστός は各自のトークンに各自の語を付ける。合体は起きない。
- S-b（慣用句・句単位セグメント）：複数トークンが1セグメントに入る場合は ES と同じ。内容語側のトークンに句全体、軽動詞側・機能側は `[absorberad]`。語順の逆転は単語多重集合の一致で検証されるので、テキスト側の語を担うトークンへ帰属させる。
- S-c（主語代名詞・助動詞）：動詞に含まれる jag/vi/han/de と助動詞 hafver/är は、動詞トークンのグロスに同乗（語順上離れる場合は ROM 1 の spec のとおり対応表側で単独 None になっているので gloss は付かない）。独立トークンの代名詞で語を担わないものは `[absorberad]`。

## 禁止
- 対応表（alignment）そのものの変更。問題を見つけたら報告に書く。
- gloss-sv-senses.json（語義リスト）は作らない。
