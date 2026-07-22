# Phase UX-10-3B — Church Calendar Season Resolver

**実施日**: 2026-07-14  
**変更範囲**: `search-tool.html`（JS のみ。HTML・CSS・データ変更なし）

---

## 目的

`getCurrentSeason()` のスタブ（`return 'ordinary'` 固定）を、  
実際の教会暦に基づくシーズン判定に置き換える。  
外部ライブラリなし・UTC 統一・純粋関数として実装。

---

## 追加した関数

### `_easterUTC(year)` — 復活日を UTC タイムスタンプで返す

Meeus/Jones/Butcher アルゴリズム（グレゴリオ暦用）。外部ライブラリ不使用。  
入力: 4桁の西暦年。出力: 復活日 00:00 UTC のタイムスタンプ（ms）。

```js
function _easterUTC(year) {
    const a = year % 19;
    const b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4),      e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4),      k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
    const day   = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(year, month, day);
}
```

**検証済み Easter 日付:**

| 年 | 復活日 |
|----|--------|
| 2024 | 3月31日 ✅ |
| 2025 | 4月20日 ✅ |
| 2026 | 4月5日 ✅ |
| 2027 | 3月28日 ✅ |
| 2028 | 4月16日 ✅ |

### `_adventStartUTC(year)` — 降臨節第1主日を UTC タイムスタンプで返す

12月25日から4週前の日曜を計算する。

```js
function _adventStartUTC(year) {
    const dow = new Date(Date.UTC(year, 11, 25)).getUTCDay(); // 0=日曜
    return Date.UTC(year, 11, 25) - (dow + 21) * 86400000;
}
```

**計算式の根拠:**  
`Dec25 - dow` = 直前の日曜（dow=0 なら 12/25 自身）  
さらに 3 週間（21日）前 = 第 4 日曜前 = 降臨節第1主日

**検証済み Advent 開始日:**

| 年 | 開始日 |
|----|--------|
| 2024 | 12月1日 ✅ |
| 2025 | 11月30日 ✅ |
| 2026 | 11月29日 ✅ |

### `getCurrentSeason(date)` — 教会暦シーズン判定（実装版）

```js
function getCurrentSeason(date = new Date()) {
    const y      = date.getUTCFullYear();
    const ts     = Date.UTC(y, date.getUTCMonth(), date.getUTCDate());
    const D      = 86400000; // ms/day
    const easter = _easterUTC(y);
    // Lent: 灰の水曜（復活-46日）〜 聖土曜日（復活-1日）
    if (ts >= easter - 46 * D && ts < easter)           return 'lent';
    // Easter: 復活日曜〜 ペンテコステ前日（復活+48日）
    if (ts >= easter           && ts < easter + 49 * D) return 'easter';
    // Pentecost: ペンテコステ日曜〜 三位一体後1週（復活+62日）計14日
    if (ts >= easter + 49 * D && ts < easter + 63 * D)  return 'pentecost';
    // Advent: 第1主日〜 12/24
    if (ts >= _adventStartUTC(y) && ts <= Date.UTC(y, 11, 24)) return 'advent';
    return 'ordinary';
}
```

---

## シーズン定義

| シーズン | 開始 | 終了 | 期間（目安）|
|---------|------|------|-----------|
| lent | 灰の水曜（Easter - 46日）| 聖土曜日（Easter - 1日）| 約46日 |
| easter | 復活日曜 | ペンテコステ前日（Easter + 48日）| 49日 |
| pentecost | ペンテコステ日曜（Easter + 49日）| 三位一体後1週（Easter + 62日）| 14日 |
| advent | 第1主日（12/25 から4週前の日曜）| 12月24日 | 22〜28日 |
| ordinary | 上記以外 | — | 残り全日 |

### 2026年の実際の日程

| シーズン | 開始 | 終了 | 日数 |
|---------|------|------|------|
| lent | 2026-02-18 | 2026-04-04 | 46日 |
| easter | 2026-04-05 | 2026-05-23 | 49日 |
| pentecost | 2026-05-24 | 2026-06-06 | 14日 |
| advent | 2026-11-29 | 2026-12-24 | 26日 |
| ordinary | 上記以外 | — | 230日 |

---

## 設計上の決定

### UTC 統一

`_dayOfYear(date)` が UTC 基準のため、`getCurrentSeason()` も `Date.UTC(y, m, d)` を使用。  
→ タイムゾーンによる日付ズレなし。両関数の基準が一致。

### 外部ライブラリ不使用

Meeus/Jones/Butcher アルゴリズムを直接実装。  
Easter 計算のためだけに依存関係を追加しない。

### Pentecost 期間を 14 日に設定

ペンテコステ当日だけでは seasonal プールがほぼ使われない（年1日）。  
三位一体日曜（Pentecost + 7日）を含む2週間とすることで seasonal テーマが有意な期間表示される。

### 条件評価順序の安全性

lent < easter < pentecost < advent のシーズンは重複不可能（条件が排他的）。  
Easter は最大4月25日。Pentecost season は最遅で 6月26日終了。Advent は最早11月28日開始。  
重複なし ✅

---

## getDiscoveryThemes — シーズン別テーマ例

| シーズン（日付）| 返却テーマ |
|---------------|-----------|
| lent (2024-02-15) | 悔い改め・平安・恵み・栄光 |
| easter (2024-04-05) | 勝利・喜び・愛・栄光 |
| pentecost (2024-06-01) | 聖霊・愛・祈り・義 |
| advent (2024-12-10) | 希望・愛・祈り・証し |
| ordinary (2024-09-01) | 祈り・救い・平安・証し |

---

## 検証結果

### 固定日テスト（2024年）

| 日付 | 期待シーズン | 実測 | 結果 |
|------|------------|------|------|
| 2024-12-10 | advent | advent | ✅ PASS |
| 2024-02-15 | lent | lent | ✅ PASS |
| 2024-04-05 | easter | easter | ✅ PASS |
| 2024-06-01 | pentecost | pentecost | ✅ PASS |
| 2024-09-01 | ordinary | ordinary | ✅ PASS |
| 2026-07-14（今日）| ordinary | ordinary | ✅ PASS |

### Easter 既知値（2024〜2028）

| 年 | 期待 | 実測 | 結果 |
|----|------|------|------|
| 2024 | 2024-03-31 | 2024-03-31 | ✅ |
| 2025 | 2025-04-20 | 2025-04-20 | ✅ |
| 2026 | 2026-04-05 | 2026-04-05 | ✅ |

### 365日走査（2026年）

| シーズン | 日数 |
|---------|------|
| ordinary | 230 |
| easter | 49 |
| lent | 46 |
| advent | 26 |
| pentecost | 14 |
| **合計** | **365** |
| undefined | 0 ✅ |
| error | 0 ✅ |

### 機能回帰

| クエリ | 期待値 | 実測 | 結果 |
|--------|--------|------|------|
| 愛 | 631件 | 631件 | ✅ PASS |
| 罪 | 1,009件 | 1,009件 | ✅ PASS |
| ἀγαπάω | 353件 | 353件 | ✅ PASS |
| 新規 errors | 0件 | 0件 | ✅ PASS |

---

## 変更しなかった項目

| 項目 | 理由 |
|------|------|
| `getDiscoveryThemes()` | シーズン判定は `getCurrentSeason()` に委譲済み。変更不要 |
| `discovery-themes.json` | データ変更なし |
| 検索ロジック一切 | 変更禁止 |
| HTML / CSS | 変更禁止 |

---

## 次フェーズ

| フェーズ | 内容 |
|---------|------|
| UX-10-3C | データスキーマ v2（primary/secondary 分離）の検討 |
| UX-10-4 | Discovery Lobby デザイン精緻化 |
