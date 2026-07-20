# Phrase Rendering 設計正典（Stage A）

作成: 2026-07-17
位置づけ: Reading Engine 次期ロードマップ Stage A の設計書。
Phrase Reading の文言・意味層は docs/phrase-reading.md（正典）が所有し、
本書はその**引用テキストの生成（Phrase Renderer）**だけを扱う。

---

## 0. 責務宣言（本書の最上位規範）

> **Phrase Renderer は Reading Engine が生成した Reading Japanese を
> 句表示用に整形する。意味・語義・構造判断は行わない。
> 句引用では末尾の格助詞（を・は・が等）を必要に応じて省略するが、
> これは引用形式の調整であり、Flow 表示の日本語とは別責務である。**

| 決めるもの | 所有者 |
|---|---|
| 語義・前置詞の訳・助詞・意味判断 | **Reading Engine（FROZEN）** |
| 句としての整形（語の選別・冠詞の省略・結合・句末調整） | **Phrase Renderer（本書）** |
| 案内文（構造層文・意味層 Intent 文） | **Phrase Reading**（docs/phrase-reading.md — 不変更） |

## 1. Flow 表示と Phrase Reading 引用の役割分担

| | Flow 表示 | Phrase Reading 引用 |
|---|---|---|
| 目的 | ギリシャ語の**形態・格関係を追う** | 「この語群が**一つのまとまり**である」ことを示す |
| 日本語 | Engine 出力を**そのまま**（世から・世の知恵を・神の知恵が） | 句そのもの（世の知恵・神の知恵） |
| 格助詞 | 保持（文中機能が見えることが価値） | **句末の文中機能助詞（を・は・が）を省略**（節内での役割は引用対象ではない） |

省略は**翻訳変更ではなく引用形式の調整**である。Engine の出力自体には触れない
（Renderer は出力文字列の句末を整形するだけで、語義・助詞の決定には関与しない）。

## 2. 引用生成規則（Phrase Renderer v1）

入力: 句（type / start / end / head）・トークン列・`resolveWord(idx) → string|null`
（呼び出し側が Engine.resolve + ResolveContext を包んで渡す。
Renderer は Engine・ContextBuilder を直接知らない）。

各語の描画:

1. **冠詞（class=det）はスキップ**（［冠詞］混入の解消）
2. 各語の日本語 = `resolveWord(idx)`、null なら `w.japanese || w.text`
   （Engine と同じ fallback 安全原則）
3. **PP は前置詞トークン自体もスキップ**する。前置詞の意味は Engine が
   head に付けて返すため（ἐκ τοῦ κόσμου → head「世から」）、
   前置詞グロス（〜から 等）を並べると二重になる
4. 語順は原文順のまま結合（日本語の PP は「修飾語＋中心語＋助詞」に
   自然に一致する — 旧 v0.1 の語順組替は不要になる）
4b. **属格同格連鎖の「の」整形**（NT 全巻差分監査 2026-07-17 で追加）:
   Ἰησοῦ Χριστοῦ のような固有名詞の同格連鎖では中間の「の」を落とし
   名前として結合する（イエスのキリストの → イエスキリストの）。
   条件: 現語が名詞（代名詞除外 —「私たちの」の所有の の は保持）・
   次語も属格で原文上隣接・どちらかが固有名詞（type='proper'）。
   注釈駆動の整形であり意味判断ではない
5. **句末の文中機能助詞の省略**（NT 全巻差分監査 2026-07-17 で確定）:
   - NP / PtcP / 単語引用 → 「を・は・が・に」を省略
     （節内での文中機能。「神の教会に」→「神の教会」）
   - **PP → 句末省略なし（Engine 出力をそのまま引用）**。
     PP 内の格は前置詞に支配されており（ἐκ→から・ἐν→に・πρός+対格→を）
     文中機能ではなく句の構成要素。Engine 未対応の前置詞
     （πρός 一般・χωρίς 等）では引用に前置詞の意味が現れないが、
     旧実装のように前置詞トークンの生グロス（〜のもとに 等）を付けることは
     **Renderer による日本語決定**であり、かつ Engine が安全性監査で棄却した
     訳（ἐν→の中に）を復活させるため行わない。
     Engine の前置詞対応が広がれば引用は自動改善する
   - 「の」は**省略しない**（連体機能は句の意味の一部。
     『〜の』関係文「「神の」が「愛」を説明しています」に必須）
   - **PP の助詞（から・へ・と共に・によって・にあって・のもとに 等）は
     Phrase 引用でも保持する（2026-07-17 確定）**。
     これらはギリシャ語前置詞が担う意味の訳であり、
     「文中での役割を示す格助詞」ではない。
     ἐκ τοῦ κόσμου は Flow「世から」・Phrase 引用「世から」で同一。
     （方針例示にあった「世」は Flow/Phrase の違いを説明する抽象例であり、
     PP の前置詞意味を削除する意図ではない — 発注者確認済み）
6. 静寂条件・引用範囲ガード（`_trimPhraseEnd`）は現行ロジック・現行位置の
   まま利用する（呼び出し側が縮めた endIdx を Renderer へ渡す。判定変更なし）

### 生成例

| 原文 | Flow 表示（Engine そのまま） | Phrase Reading 引用 |
|---|---|---|
| τὴν σοφίαν τοῦ κόσμου | 知恵を・世の | 知恵…世の → **「世の知恵」**※ |
| ἐκ τοῦ κόσμου | 〜から・世から | **「世から」**（PP 全体の引用） |
| ὁ λόγος τοῦ θεοῦ | ことば・神の | **「神のことば」**※ |

※ NP 内では原文順（head → genitive）と日本語の自然順（genitive → head）が
逆になるため、**NP に限り「属格修飾語 → 中心語」へ並べ替える**
（旧 v0.1 の PP 組替と同じ性質の、句種ごとの決まった整形。意味判断ではない）。

## 3. 廃止・残置

- `_PP_TRANS_JP`（Renderer 独自の前置詞テーブル）: **廃止方向**。
  Engine の凍結テーブルと矛盾する値（ἐν→の中で・διά+属格→によって・κατά→に従って）
  を持つため、新 Renderer は参照しない
- 旧 `renderPhraseJP` / `_buildPhraseContext` / `_renderPP` 等:
  **即削除しない**。新 Renderer への切替後も比較可能な状態で残置し、
  Stage A 凍結後の次 Stage で削除を判断する

## 4. アーキテクチャ

```
core/phrase-renderer.js（新設・追加方式）
    PhraseRenderer.renderQuote(phrase, endIdx, words, resolveWord)
        → string | null（null = 静寂）

index.html（切替のみ・意味層/文言は不変更）
    _phraseResolveWord(words, idx) → Engine.resolve(token, context)?.japanese ?? null
    切替箇所（3 経路）:
      1. _buildPhraseReadingHTML の構造層引用（renderPhraseJP 呼び出し）
      2. 同関数内の『〜の』関係文 quoteOf
      3. Observation の対象語引用
```

- Renderer は純粋関数（副作用なし・例外は null）。Node 単体テスト可能
- Engine（FROZEN）・ContextBuilder・Phrase Reading 文言テーブルには触れない

## 5. 検証計画（Stage A ⑤〜⑧）

1. 単体テスト: PP/NP/PtcP/GenP・冠詞スキップ・前置詞スキップ・
   句末省略（を/は/が）・の保持・fallback・静寂
2. NT 全巻監査: 全 Phrase Reading 引用の**新旧差分ダンプ**を生成し、
   ［冠詞］混入 0・Engine 出力との不整合 0 を機械検証 + サンプル目視
3. 回帰: `scripts/re-stageA-regression.cjs`（基準値凍結）
4. 実表示監査: re-phase5d-display-audit を拡張し引用列を併記して 6 書レビュー
5. 全既存回帰（re-phase1〜5）PASS 維持
6. 凍結: `[FROZEN]` マーカー + 基準値固定

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-17 | 初版（Stage A ②設計。Flow/引用の役割分担・句末助詞省略規則） |
