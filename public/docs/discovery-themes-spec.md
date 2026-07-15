# Phase UX-10-1A — Discovery Theme Data Specification

**作成日**: 2026-07-14  
**種別**: データ仕様書  
**対象ファイル**: `assets/data/discovery-themes.json`  
**変更ファイル**: 新規作成のみ。既存ファイル変更なし。

---

## 目的

Discovery Lobby（将来実装）が使用するテーマデータを定義する。  
本フェーズはデータ定義のみ。UI・JS・CSS・HTML は一切変更しない。

---

## ファイル仕様

### パス

```
assets/data/discovery-themes.json
```

### エンコーディング

UTF-8、BOM なし

### 整形

インデント 2 スペース、末尾改行あり

---

## スキーマ

```json
{
  "version": 1,
  "description": "...",
  "core": ["..."],
  "discovery": ["..."],
  "seasonal": {
    "advent":    ["..."],
    "lent":      ["..."],
    "easter":    ["..."],
    "pentecost": ["..."],
    "ordinary":  ["..."]
  }
}
```

### フィールド定義

| フィールド | 型 | 説明 |
|-----------|---|------|
| `version` | number | スキーマバージョン（変更時はインクリメント） |
| `description` | string | ファイル用途の説明（ランタイム使用禁止） |
| `core` | string[] | 毎日表示され得る中心テーマ |
| `discovery` | string[] | 少し広げる探索テーマ |
| `seasonal` | object | 教会暦ごとのテーマ（5 シーズン） |
| `seasonal.advent` | string[] | 降臨節（11〜12月） |
| `seasonal.lent` | string[] | 受難節（2〜4月） |
| `seasonal.easter` | string[] | 復活節（4〜6月） |
| `seasonal.pentecost` | string[] | 聖霊降臨節（6月） |
| `seasonal.ordinary` | string[] | 年間（通年） |

---

## テーマ語の制約

### 必須条件

- 各エントリは `search-tool.html` の検索入力として直接使用できる日本語
- `search-concepts.json` の `label` または `aliases` に一致するか、単語として検索可能なもの
- ユーザーが直感的に意味を理解できるもの

### 禁止事項

- ギリシャ語・ヘブライ語の直接使用（日本語のみ）
- Strong 番号・品詞タグ等の技術的文字列
- 1 文字語（検索ノイズになる語）
- 重複エントリ（同一セクション内）

---

## テーマ一覧

### core（8件）

| テーマ | 意図 |
|--------|------|
| 愛 | 最も中心的な NT 神学語 |
| 祈り | 実践的・普遍的 |
| 信仰 | NT 全体の基盤 |
| 希望 | 終末論的・現実的 |
| 救い | NT の核心メッセージ |
| 平安 | 日常的・牧会的 |
| 恵み | パウロ神学の中心 |
| 喜び | 実践的信仰生活 |

### discovery（10件）

| テーマ | 意図 |
|--------|------|
| 知恵 | 知的探究への入口 |
| 契約 | NT/LXX をつなぐ神学的橋渡し |
| 義 | パウロ・マタイ両文脈 |
| 慰め | 受難・試練文脈 |
| 証し | 使徒行伝・ヨハネ書簡 |
| 栄光 | ヨハネ神学・終末論 |
| 弟子 | 共観福音書の核心テーマ |
| 教会 | 使徒行伝・書簡群 |
| 永遠の命 | ヨハネ神学の鍵語 |
| 悔い改め | 洗礼者ヨハネ・使徒行伝 |

### seasonal（各 4件）

| シーズン | テーマ | 教会暦の文脈 |
|---------|--------|------------|
| advent | 希望・光・約束・待ち望む | 主の来臨を待つ期節 |
| lent | 十字架・悔い改め・従う・赦し | 受難・悔い改めの期節 |
| easter | 復活・いのち・喜び・勝利 | 復活の喜びの期節 |
| pentecost | 聖霊・教会・証し・賜物 | 聖霊降臨・教会の宣教 |
| ordinary | 祈り・感謝・平安・知恵 | 日常的信仰生活 |

---

## 利用規則（将来の実装者向け）

### 読み取り方

```js
// テーマデータの読み込み例（将来の Discovery Lobby 実装用）
const themes = await fetch('assets/data/discovery-themes.json').then(r => r.json());

// core テーマを取得
const coreThemes = themes.core;

// シーズンテーマを取得（シーズン名は外部で決定する）
const adventThemes = themes.seasonal.advent;
```

### 禁止事項

- ランダム処理の追加（禁止）
- このファイルへの検索ロジックの追加（禁止）
- `search-concepts.json` への依存関係の追加（禁止）
- シーズン判定ロジックのこのファイルへの追加（禁止。シーズン選択は呼び出し側で行う）

### 変更時の注意

- `version` フィールドをインクリメントする
- 新規テーマを追加する際は「テーマ語の制約」を参照する
- `search-concepts.json` の `label`/`aliases` との対応を確認することを推奨する（必須ではない）

---

## 検証

| 確認項目 | 結果 |
|---------|------|
| JSON 構文エラーなし（`python3 -c "import json; json.load(...)"`) | ✅ |
| 既存ファイル変更なし（`git diff --name-only HEAD`） | ✅ |
| `assets/data/discovery-themes.json` のみ新規追加 | ✅ |
| UTF-8 エンコーディング | ✅ |
| 全テーマが日本語（ギリシャ語なし） | ✅ |
| 同一セクション内に重複エントリなし | ✅ |

---

## 次フェーズ

| フェーズ | 内容 | 前提 |
|---------|------|------|
| UX-10-1B | Discovery Lobby UI の実装 | 本データの確定後 |
| UX-10-1C | シーズン判定ロジックの追加 | UX-10-1B 完了後 |
