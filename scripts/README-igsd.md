# scripts/build-igsd-index.cjs — IGSD 索引ビルド

> 対象：`scripts/build-igsd-index.cjs`（見出し語単位のデータ形式〈`strongs` 配列〉に対応した版）。
> `scripts/README.md`（scripts 全体の運用ガイド）とは別の、このスクリプト専用の説明。

## 1. 何をするか

IGSD の lemma 正本データ `public/assets/data/igsd/lemmas/*.json`（1ファイル = 1見出し語）を集約し、次の2ファイルを生成する。

| 出力 | 内容 |
| --- | --- |
| `public/assets/data/igsd/index.json` | 見出し語ごとの要約の配列。`{ strong, strongs, lemma, status, senses: [{id, label, label_en?, label_es?, count}], total }`。`label_en`（語義ラベルの英訳）・`label_es`（同スペイン語訳）は原データの `senses[].label_en`／`label_es` がある語義にだけ、そのまま通す（無い語義には付けない。表示側が `label` にフォールバックする）。`strongs` はその見出し語が束ねる Strong 番号の配列（常に配列）。`count` は語義ごとの割り当て件数、`total` はその見出し語の割り当て総数。`strong` 昇順。 |
| `public/assets/data/igsd/sense-map.json` | 全見出し語通算の対応表。`{ "<verseId>": "<Strong>:<senseId>" }`。`<Strong>` は、そのトークン自身の Strong ではなく、割り当て元の見出し語の `strong`（例：G2036 のトークンは `G3004:<senseId>`）。 |
| `public/assets/data/igsd/sense-map-gi.json` | `sense-map.json` と同じ対応を globalIdx で持ち直した表。`{ "<globalIdx>": "<Strong>:<senseId>" }`（キーは文字列）。globalIdx は bible_data の各トークンの `globalIdx`（NT の書物・章・語順の通し番号。`scripts/build-search-index.js` の globalIdx と同じ並び）。検索ツールは事前生成インデックス経由のトークンに verseId を持たないため、こちらで引く。 |

- 入力として読む lemma ファイルは、ファイル名が `G<数字>.json`（例 `G3056.json`）に一致するものだけ。
- ファイルの形式：1ファイルが複数の Strong 番号を束ねる場合は `strongs` 配列を持つ（例：`G3004.json` は λέγω で `strongs` が G3004・G2036・G2046）。`strongs` が無いファイルは `strong` 単独として扱い、index の `strongs` は `[strong]` になる。
- 同時に `public/bible_data/nt/**/*.json` の各トークンを読み、`verseId` の実在確認と、`strong` ごとの全トークン集合の取得に使う（読むだけで、bible_data は変更しない）。
- 語義の選択・補完は行わない。lemma ファイルに書かれた割り当てを集計・検証するだけ。

## 2. 実行方法

引数なしが既定。リポジトリ内の既定パスを使う。

```sh
node scripts/build-igsd-index.cjs
```

既定パスは次のオプションで差し替えられる（いずれも省略可）。

| オプション | 既定値 | 意味 |
| --- | --- | --- |
| `--lemmas-dir DIR` | `public/assets/data/igsd/lemmas` | lemma 正本データの置き場 |
| `--bible-data-dir DIR` | `public/bible_data/nt` | verseId・strong の照合に使う bible_data |
| `--out-dir DIR` | `public/assets/data/igsd` | `index.json`・`sense-map.json`・`sense-map-gi.json` の出力先（なければ作成） |

```sh
# 例：フィクスチャを読み、一時ディレクトリへ出力する（リポジトリのデータを汚さない）
node scripts/build-igsd-index.cjs \
  --lemmas-dir tests/fixtures/igsd/lemmas \
  --bible-data-dir tests/fixtures/igsd/bible_data/nt \
  --out-dir /tmp/igsd-out
```

終了コード：`0` 成功／`1` ビルド時検証エラー／`2` 不明な引数。
成功時は `OK: <n> lemmas, <m> assignments -> index.json, sense-map.json, sense-map-gi.json` を表示する。

## 3. selftest

```sh
node scripts/build-igsd-index.cjs --selftest
```

- フィクスチャは `tests/fixtures/igsd/`（`lemmas/` に見出し語 3件〈うち1件が `strongs` を持つ〉、`bible_data/nt/` に対応する最小の bible_data）。
- 正常系（集計・sense-map）、`strongs`（配列の出力、`strongs` の無い見出し語の扱い、別 Strong のトークンの sense-map 反映）、異常系（存在しない verseId／存在しない senseId／重複割り当て）、警告系（final の draft 降格。`strongs` の別 Strong の同じ lemma のトークン未割り当てを含む）、lemma 一致（別 lemma のトークンが被覆の対象にならないこと、アクセント・大文字の無視）、label_en／label_es（原データの値を通す・無い語義には補わない）、sense-map-gi（件数が sense-map と一致、既知フィクスチャの対応）、出力の書き込みと読み戻しを確認する。全 25 項目が `PASS` なら、最終行は `SELFTEST: ALL PASS` で終了コード 0。1件でも失敗すれば終了コード 1。
- 異常系・警告系は、フィクスチャを一時ディレクトリにコピーして書き換えた上で検証する。出力も一時ディレクトリへ書き、終わったら削除する。リポジトリ内のファイルは変更されない。
- `--selftest` は、見つかった時点で selftest を実行して終了する。他のオプションとの併用は想定しない。

## 4. ビルド時検証

### エラー（終了コード 1・出力ファイルは一切書かない）

エラーは全件を集めて表示してから終了する。

1. `assignments` の verseId が bible_data に存在しない。
2. `assignments` の senseId が、その lemma の `senses` に無い。
3. 同じ verseId が複数の lemma に割り当てられている。

### 警告（処理は続行・終了コード 0）

- `status` が `final` なのに、被覆すべきトークン（bible_data 上で `strong` が見出し語の `strongs`〈無ければ `strong`〉のいずれかに一致し、**かつ `lemma` が見出し語ファイルの `lemma` と一致する**もの）を `assignments` が覆っていない場合、警告を出し、**`index.json` 上でのみ** その見出し語の `status` を `draft` に落とす。lemma ファイル自体は書き換えない。
- `strong` の照合は文字列一致（正規化なし）。`lemma` の一致判定は、アクセントと大文字を無視する（NFD 分解→結合文字の除去→小文字化）。Strong 番号が同じでも別の語（別 lemma）のトークンは被覆の対象にしない（例：`G1722.json` の `strongs` は G1722・G1519 だが、G1519 の εἰς のトークンは対象外で、G1519 に紛れた ἐν のトークンだけが対象になる）。

## 5. 補足

- `index.json` の `total` は `assignments` のキー数。`senses[].count` は語義ごとの件数で、割り当てのない語義は `0`。
- `sense-map.json` のキー順は、lemma を `G<数字>.json` のファイル名順に読んだ順。
