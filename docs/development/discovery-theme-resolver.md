# Phase UX-10-1B — Discovery Theme Resolver

**実施日**: 2026-07-14  
**データ仕様**: `docs/discovery-themes-spec.md` (UX-10-1A)  
**変更範囲**: `search-tool.html`（JS のみ。HTML・CSS 変更なし）

---

## 目的

Discovery Lobby に表示する「今日の 4 テーマ」を返す純粋関数を追加する。  
本フェーズは**ロジックのみ**。画面表示・render・DOM操作は一切行わない。

---

## 実装内容

### 追加した定数・関数一覧（`search-tool.html` 末尾）

| 識別子 | 種別 | 説明 |
|--------|------|------|
| `_DISCOVERY_THEMES` | `const` | `assets/data/discovery-themes.json` のインライン定義（ランタイム用ミラー） |
| `getCurrentSeason(date?)` | `function` | 教会暦シーズンを返す。現段階は `'ordinary'` 固定 |
| `_dayOfYear(date)` | `function` | UTC 日付から year-day（0始まり）を返す決定的ヘルパー |
| `getDiscoveryThemes(date?)` | `function` | 「今日の 4 テーマ」を返すメイン関数 |

---

## アルゴリズム

### _dayOfYear(date)

```
UTC年初（Jan 1 00:00 UTC）と
UTC当日（同年同月同日 00:00 UTC）の差をミリ秒で割る
→ 0〜364/365 の整数を返す
```

UTC 固定のため、タイムゾーンによって結果がブレない。

### getDiscoveryThemes(date)

```
day = _dayOfYear(date)
season = getCurrentSeason(date)   // 現段階 'ordinary'

①  seasonal: sPool[day % sPool.length]   → 1件
②  core:     cPool[(day+i) % cPool.length]  重複スキップ → 累計3件
③  discovery: dPool[(day+i) % dPool.length] 重複スキップ → 累計4件

返却: [seasonal, core, core, discovery]
```

- `Math.random()` 不使用（決定的）
- 重複ループに安全ガード (`i >= pool.length` でbreak)
- 副作用なし・DOM操作なし・console出力なし

---

## テーマ選定例（UTC 2026年）

| 日付 | seasonal | core ×2 | discovery | 返却配列 |
|------|----------|---------|-----------|---------|
| 07-14 (day=194) | 平安 | 信仰・希望 | 証し | `['平安','信仰','希望','証し']` |
| 07-15 (day=195) | 知恵 | 希望・救い | 栄光 | `['知恵','希望','救い','栄光']` |
| 07-21 (day=201) | 感謝 | 祈り・信仰 | 契約 | `['感謝','祈り','信仰','契約']` |

---

## ソース同期ルール

`_DISCOVERY_THEMES` は `assets/data/discovery-themes.json` のインラインコピー。  
JSON を変更した場合は定数も同期させること。

| 変更箇所 | 同期先 |
|---------|--------|
| `discovery-themes.json` の core/discovery/seasonal | `search-tool.html` の `_DISCOVERY_THEMES` |

---

## 品質条件

| 条件 | 実装 |
|------|------|
| 純粋関数（副作用なし） | ✅ 外部状態を読み書きしない |
| DOM操作なし | ✅ `document` 参照なし |
| console出力なし | ✅ `console.*` 呼び出しなし |
| Math.random() 不使用 | ✅ UTC day-of-year を seed として使用 |
| 同日2回実行 → 同じ配列 | ✅ 決定的アルゴリズム |
| 翌日 → 配列が変化する | ✅ day が変わると index が変わる |
| 重複なし | ✅ 重複スキップループ実装 |
| 常に4件返る | ✅ pool サイズ制約と安全ガードで保証 |

---

## 検証結果

### 手動テスト

| テスト | 結果 |
|--------|------|
| 同日2回実行 → 同一配列 | ✅ PASS |
| 翌日 date 変更 → 異なる配列 | ✅ PASS |
| 今日 length === 4 | ✅ PASS |
| 今日 重複なし | ✅ PASS |
| 翌日 重複なし | ✅ PASS |

### 年間スキャン（UTC 2026年 1月1日〜12月31日 365日）

| 確認項目 | 結果 |
|---------|------|
| 全365日で length === 4 | ✅ PASS |
| 全365日で重複なし | ✅ PASS |

---

## 変更しなかった項目

| 項目 | 理由 |
|------|------|
| HTML 構造 | 変更禁止（render は未実装）|
| CSS | 変更禁止 |
| `resolveTerm` / `resolveConcept` | 変更禁止 |
| Pattern / Wallace Engine | 変更禁止 |
| Knowledge Graph | 変更禁止 |
| StudyPanel | 変更禁止 |
| `index.html` | 変更禁止 |
| `search-concepts.json` | 変更禁止 |
| `discovery-themes.json` | 変更禁止 |

---

## 次フェーズ

| フェーズ | 内容 | 前提 |
|---------|------|------|
| UX-10-1C | Discovery Lobby UI への組み込み（`getDiscoveryThemes()` 呼び出し + テーマカード表示） | 本フェーズ完了後 |
| UX-10-1D | `getCurrentSeason(date)` に実際の教会暦判定を実装 | UX-10-1C 完了後 |
