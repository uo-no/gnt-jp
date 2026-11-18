# ES per-token グロス・コンベア — 作業ブリーフ

## 目的
RVR1909 の対応表（Phase 1 で完成）をもとに、ギリシャ語トークンごとのスペイン語グロス（gloss-token 形式）を作る。形式は EN (WEB) の実証済み形式と完全同一。

## 入力
- 対応表: `~/workspace/bible-app/2026-11-07-spanish-rvr1909/conveyor/out/<BOOK>-<CH>.json`
  - `verses[v].segments[]` = `{t: スペイン語テキスト, tokens: [tokenIndex...] | null, note?}`
- ギリシャ語トークン（語形・品詞の確認用）: `~/workspace/gnt-jp-mainctl/public/bible_data/nt/<BOOK>/<CH>.json`

## 出力（spec）
`specs/<BOOK>-<CH>.py` に `GLOSSES = {"<節>!<tokenIndex>": "<グロス>", ...}` を書く。

## 分割の原則
1. セグメントのスペイン語テキスト（単語列）を、そのセグメントのトークン列に分配する。各トークンのグロスは、そのトークンが担う単語（複数可、テキスト内の位置に対応）。句読点は単語に付けたままにする。
2. 語順がギリシャ語とスペイン語で逆転している場合も、グロスはテキスト側の単語をそのトークンに帰属させる（EN の実証方式。検証は単語マルチセットの一致）。
3. スペイン語の単語を担わないトークンには、機能に応じた角括弧ラベルを1つだけ付ける：
   - `[artículo]` 冠詞 / `[partícula]` 小辞 / `[transición]` 接続・転換 / `[neg.]` 否定 / `[prep.]` 前置詞 / `[relativo]` 関係詞 / `[contenido]` 内容節の標識 / `[condición]` 条件 / `[absorbido]` 他のトークンのグロスに吸収されたもの（動詞に含まれる主語代名詞など）
4. グロスを付けるのは対応表のセグメントに現れるトークンだけ。None セグメントの単語はどのトークンにも付けない。未対応トークンには付けない。
5. スペイン語の文言を新たに作らない。使うのは対応表のセグメントテキストに実在する単語だけ（角括弧ラベルを除く）。検証で機械的に弾かれる。

## 検証
`python3 build.py <BOOK> <CH> specs/<BOOK>-<CH>.py out/<BOOK>-<CH>.json ~/workspace/bible-app/2026-11-07-spanish-rvr1909/conveyor/out ~/workspace/gnt-jp-mainctl/public/bible_data/nt`
→ ALL CHECKS PASSED が条件。

## 禁止
git/GitHub 操作。文言の創作。対応表そのものの変更（問題を見つけたら報告に書く）。

## 承認済み規約（ROM 1 パイロット、ユーザー承認 2026-11-10）
6. **合体名**： Ἰησοῦς と Χριστός がスペイン語で1語「Jesucristo」に合体する箇所では、テキスト順で先のトークンに合体語全体（前置詞等を含む）を付け、もう一方は `[absorbido]` とする。
7. 慣用句（μνείαν ποιοῦμαι →「me acuerdo」など）は内容語側に句全体を付け、軽動詞側は `[absorbido]`。
8. 接尾代名詞は Phase 1 原則11どおり動詞に同乗させ、独立トークンの代名詞は `[absorbido]`。
