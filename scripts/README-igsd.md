# scripts/build-igsd-index.cjs — IGSD 索引ビルド

> 対象：`scripts/build-igsd-index.cjs`（PR #768 の `feat/igsd-build-index` 版に基づく）。
> `scripts/README.md`（scripts 全体の運用ガイド）とは別の、このスクリプト専用の説明。

## 1. 何をするか

IGSD の lemma 正本データ `public/assets/data/igsd/lemmas/*.json`（1 lemma = 1ファイル）を集約し、次の2ファイルを生成する。

| 出力 | 内容 |
| --- | --- |
| `public/assets/data/igsd/index.json` | lemma ごとの要約の配列。`{ strong, lemma, status, senses: [{id, label, count}], total }`。`count` は語義ごとの割り当て件数、`total` はその lemma の割り当て総数。`strong` 昇順。 |
| `public/assets/data/igsd/sense-map.json` | 全 lemma 通算の対応表。`{ "<verseId>": "<Strong>:<senseId>" }` |

- 入力として読む lemma ファイルは、ファイル名が `G<数字>.json`（例 `G3056.json`）に一致するものだけ。
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
| `--out-dir DIR` | `public/assets/data/igsd` | `index.json` と `sense-map.json` の出力先（なければ作成） |

```sh
# 例：フィクスチャを読み、一時ディレクトリへ出力する（リポジトリのデータを汚さない）
node scripts/build-igsd-index.cjs \
  --lemmas-dir tests/fixtures/igsd/lemmas \
  --bible-data-dir tests/fixtures/igsd/bible_data/nt \
  --out-dir /tmp/igsd-out
```

終了コード：`0` 成功／`1` ビルド時検証エラー／`2` 不明な引数。
成功時は `OK: <n> lemmas, <m> assignments -> index.json, sense-map.json` を表示する。

## 3. selftest

```sh
node scripts/build-igsd-index.cjs --selftest
```

- フィクスチャは `tests/fixtures/igsd/`（`lemmas/` に lemma 2件、`bible_data/nt/` に対応する最小の bible_data）。
- 正常系（集計・sense-map）、異常系（存在しない verseId／存在しない senseId／重複割り当て）、警告系（final の draft 降格）、出力の書き込みと読み戻しを確認する。全 10 項目が `PASS` なら、最終行は `SELFTEST: ALL PASS` で終了コード 0。1件でも失敗すれば終了コード 1。
- 異常系・警告系は、フィクスチャを一時ディレクトリにコピーして書き換えた上で検証する。出力も一時ディレクトリへ書き、終わったら削除する。リポジトリ内のファイルは変更されない。
- `--selftest` は、見つかった時点で selftest を実行して終了する。他のオプションとの併用は想定しない。

## 4. ビルド時検証

### エラー（終了コード 1・出力ファイルは一切書かない）

エラーは全件を集めて表示してから終了する。

1. `assignments` の verseId が bible_data に存在しない。
2. `assignments` の senseId が、その lemma の `senses` に無い。
3. 同じ verseId が複数の lemma に割り当てられている。

### 警告（処理は続行・終了コード 0）

- `status` が `final` なのに、bible_data 上でその lemma の `strong` と一致する全トークンを `assignments` が覆っていない場合、警告を出し、**`index.json` 上でのみ** その lemma の `status` を `draft` に落とす。lemma ファイル自体は書き換えない。
- 照合は `strong` の文字列一致（正規化なし）。

## 5. 補足

- `index.json` の `total` は `assignments` のキー数。`senses[].count` は語義ごとの件数で、割り当てのない語義は `0`。
- `sense-map.json` のキー順は、lemma を `G<数字>.json` のファイル名順に読んだ順。
