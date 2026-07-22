# Today's Discovery Selection Specification

**フェーズ**: UX-10-3A  
**作成日**: 2026-07-14  
**種別**: 選定規則仕様書（実装変更なし）  
**対象**: `getCurrentSeason()` / `getDiscoveryThemes()` / `_DISCOVERY_THEMES` / `discovery-themes.json`

---

## 1. 選定優先順位

### 概念階層

```
教会暦（Liturgical Calendar）
  └─ 現在のシーズンを決定
       ↓
季節テーマ（Seasonal Pool）
  └─ seasonal[season] から 1件
       ↓
編集セット（Editorial Pools）
  └─ core から 2件 + discovery から 1件
       ↓
日次微調整（Day-of-Year Index）
  └─ UTC day-of-year (0–364) を各プールの modulo index として使用
```

### 実装との対応

| 概念階層 | 実装関数/定数 | 現状 |
|---------|-------------|------|
| 教会暦 | `getCurrentSeason(date)` | **スタブ（'ordinary' 固定）** |
| 季節テーマ | `_DISCOVERY_THEMES.seasonal[season][day % pool.length]` | 実装済み（ordinary のみ有効）|
| 編集セット | `_DISCOVERY_THEMES.core` + `_DISCOVERY_THEMES.discovery` | 実装済み |
| 日次微調整 | `_dayOfYear(date)` → 0〜364/365 の整数 | 実装済み |

---

## 2. 4テーマ構成仕様

### 返却順・比率

| 順序 | 種別 | プール | 件数 | 実装 |
|------|------|--------|------|------|
| 1 | Season Theme | `seasonal[season]` | 1件 | ✅ |
| 2 | Core Theme | `core` | 2件 | ✅ |
| 3 | Core Theme | `core` | （上記に含む）| ✅ |
| 4 | Discovery Theme | `discovery` | 1件 | ✅ |

**返却配列**: `[seasonal, core₁, core₂, discovery]`  
**常に4件返ることを保証**: ループに安全ガードあり（各プールの全要素をスキャンしても重複を除けない場合は break）

### 重複排除規則

seasonal で選ばれた語が core / discovery と重複する場合、後続プールは次候補に進む。

**実測ケース（advent × core の '希望' 重複時）:**
```
day=0, season=advent:
  seasonal = '希望'（advent[0]）
  core scan: '愛'(skip '希望'), '祈り' → [希望, 愛, 祈り]
  discovery scan: '知恵' → [希望, 愛, 祈り, 知恵]
  → 希望 が seasonal として正しく 1 回だけ出現 ✅
```

---

## 3. 決定的アルゴリズム仕様

### 禁止

```
Math.random() の使用 → 禁止
```

### アルゴリズム

```
seed = _dayOfYear(date)
     = Math.floor(
         (Date.UTC(year, month, date) - Date.UTC(year, 0, 1))
         / 86400000
       )
     ∈ {0, 1, ..., 364} (通常年) / {0, ..., 365} (閏年)

seasonal_index = seed % seasonal[season].length
core_index₁    = seed % core.length  （重複なら seed+1, seed+2, ...）
core_index₂    = 次の非重複 index
discovery_index = seed % discovery.length （重複なら seed+1, ...）
```

### 決定性の保証

| テスト | 期待 | 実測 |
|--------|------|------|
| 同日2回実行 | 同じ配列 | ✅ |
| 翌日に変化する | 異なる配列 | ✅ |
| 年間365日で同日重複なし | 0日 | ✅ 0日 |
| 年間365日のユニークセット数 | 最大40種類（ordinary 時） | ✅ 40種類 |

### 変化のリズム

`ordinary` シーズン時の seasonal プール（4件）と core プール（8件）の最小公倍数 = 8日ごとに seasonal の選択がリセット。  
discovery プール（10件）との LCM で約40日周期のセット循環が生まれる。  
同じ4件セットが365日中0回繰り返す（連続日で完全に同一のセットが出ない）。

---

## 4. 年間設計確認

### シーズン定義（データあり・未実装）

| シーズン | プール | 件数 | データ | 判定実装 |
|---------|--------|------|--------|---------|
| advent | 希望・光・約束・待ち望む | 4件 | ✅ | ❌ 未実装 |
| lent | 十字架・悔い改め・従う・赦し | 4件 | ✅ | ❌ 未実装 |
| easter | 復活・いのち・喜び・勝利 | 4件 | ✅ | ❌ 未実装 |
| pentecost | 聖霊・教会・証し・賜物 | 4件 | ✅ | ❌ 未実装 |
| ordinary | 祈り・感謝・平安・知恵 | 4件 | ✅ | ✅（固定） |

### 教会暦の概略日程（将来実装用参考）

| シーズン | 開始目安 | 終了目安 | 特記 |
|---------|---------|---------|------|
| advent | 11月末第4日曜 | 12月24日 | 4週間。年により日程変動 |
| christmas | 12月25日 | 1月5日 | 実装スキップ可（データなし）|
| epiphany | 1月6日 | 灰の水曜前日 | ordinary と統合可 |
| lent | 灰の水曜（復活40日前）| 聖土曜日 | 復活祭可動祝日による変動 |
| easter | 復活日曜 | 聖霊降臨50日後 | 50日間 |
| pentecost | 聖霊降臨日曜 | 翌advent前週 | ordinary と実質同期間 |
| ordinary | 上記以外すべて | — | 現在は全年間 |

**実装課題**: Lent・Easter は復活祭（可動祝日）に基づく。最低限の Computus アルゴリズム or ルックアップテーブルが必要。

### クロスプール重複一覧

現在のデータで seasonal と他プールが重複するケース：

| シーズン | 重複語 | 重複先 | 重複による影響 |
|---------|--------|--------|--------------|
| advent | 希望 | core | seasonal に '希望' が来た日、core は '希望' をスキップ |
| easter | 喜び | core | 同上 |
| ordinary | 祈り・平安 | core | ordinary の2語が core と重複 |
| ordinary | 知恵 | discovery | ordinary の1語が discovery と重複 |
| lent | 悔い改め | discovery | seasonal に '悔い改め' が来た日、discovery は次候補へ |
| pentecost | 教会・証し | discovery | pentecost の2語が discovery と重複 |

**評価**: 重複は deduplication ループで自動処理される。実装上の問題なし。  
ただし pentecost・ordinary はシーズンプールの50%が他プールと重複しており、  
将来データを拡張する際はプール間の独自性を高めることを推奨。

---

## 5. テーマ出現頻度（ordinary 全日・2026年）

### 頻度分布

| テーマ | 種別 | 出現日数 | 比率 | 備考 |
|--------|------|---------|------|------|
| 平安 | seasonal + core | 182日 | 50% | ordinary seasonal + core 両方から |
| 祈り | seasonal + core | 138日 | 38% | 同上 |
| 信仰 | core | 138日 | 38% | |
| 知恵 | seasonal + discovery | 128日 | 35% | ordinary seasonal + discovery 両方から |
| 希望 | core | 92日 | 25% | |
| 救い | core | 92日 | 25% | |
| 愛 | core | 91日 | 25% | |
| 感謝 | seasonal | 91日 | 25% | ordinary seasonal のみ |
| 恵み | core | 90日 | 25% | |
| 喜び | core | 90日 | 25% | |
| 契約〜悔い改め | discovery | 36〜37日 | 10% | |

**観察**: `平安`・`祈り`・`知恵` が seasonal プールと他プールの両方に存在するため出現頻度が高い。  
現在の ordinary 固定ではこの偏りが年間を通じて継続する。シーズン切り替えにより偏りが緩和される。

---

## 6. データ拡張余地

### 現在のスキーマ（v1）

```json
{
  "version": 1,
  "core": ["愛", "祈り", ...],
  "discovery": ["知恵", "契約", ...],
  "seasonal": {
    "advent": ["希望", "光", "約束", "待ち望む"],
    "ordinary": ["祈り", ...]
  }
}
```

**制約**: 各シーズンプールはフラット配列。優先度・重みなし。

### 将来拡張案 — スキーマ v2（参考）

```json
{
  "version": 2,
  "core": {
    "primary":   ["愛", "信仰", "希望", "救い"],
    "secondary": ["祈り", "平安", "恵み", "喜び"]
  },
  "discovery": ["知恵", "契約", ...],
  "seasonal": {
    "advent": {
      "primary":   ["希望", "光"],
      "secondary": ["約束", "待ち望む"]
    }
  }
}
```

**メリット**:
- 高優先テーマ（primary）を確率的に優先選択可能
- シーズン強調語と補助語を分離
- 現行 `sPool[day % sPool.length]` では primary/secondary 混在選択になるが、拡張後は `primary[day % primary.length]` を優先できる

**後方互換戦略**:
- `version: 2` チェックで新旧スキーマを分岐
- または `seasonal_v2` キー追加（既存 `seasonal` は維持）

**実装コスト**: `getDiscoveryThemes()` の pool 参照箇所 3箇所を修正。大きな変更ではない。

### 単純拡張（データのみ・v1互換）

シーズン数・テーマ数の追加はスキーマ変更なしで可能：

```json
"seasonal": {
  "advent":    ["希望", "光", "約束", "待ち望む"],
  "christmas": ["御子", "羊飼い", "天使", "ベツレヘム"]   ← 追加可
}
```

```json
"core": ["愛", "祈り", "信仰", "希望", "救い", "平安", "恵み", "喜び", "命", "御言葉"]  ← 追加可
```

追加するだけで `getDiscoveryThemes()` が自動的に新しいプールから選択する。

---

## 7. 実装状態まとめ

| 機能 | 状態 | 次フェーズ |
|------|------|-----------|
| 4テーマ構成（seasonal×1 + core×2 + discovery×1）| ✅ 実装済み | — |
| 決定的アルゴリズム（Math.random 禁止）| ✅ 実装済み | — |
| 重複排除 | ✅ 実装済み | — |
| ordinary シーズン | ✅ 実装済み | — |
| 教会暦シーズン判定（getCurrentSeason）| ❌ スタブ | UX-10-3B |
| advent / lent / easter / pentecost 日程判定 | ❌ 未実装 | UX-10-3B |
| データスキーマ v2（primary/secondary）| ❌ 未実装 | UX-10-3C |
