# Phase UX-10-3C — Discovery Theme Quality Audit

**実施日**: 2026-07-14  
**種別**: 品質監査（実装変更なし）  
**対象**: `_DISCOVERY_THEMES` const（`search-tool.html` 末尾）

---

## 目的

現在のテーマデータ（core / discovery / seasonal × 5）に対して、プール間の重複・頻度偏り・ordinary 改善案を定量的に評価する。

---

## 1. プール定義

| プール | 語 | 件数 |
|--------|-----|------|
| core | 愛・祈り・信仰・希望・救い・平安・恵み・喜び | 8 |
| discovery | 知恵・契約・義・慰め・証し・栄光・弟子・教会・永遠の命・悔い改め | 10 |
| seasonal/advent | 希望・光・約束・待ち望む | 4 |
| seasonal/lent | 十字架・悔い改め・従う・赦し | 4 |
| seasonal/easter | 復活・いのち・喜び・勝利 | 4 |
| seasonal/pentecost | 聖霊・教会・証し・賜物 | 4 |
| seasonal/ordinary | 祈り・感謝・平安・知恵 | 4 |

---

## 2. クロスプール重複分析

### core × discovery

重複なし ✅（完全分離）

### seasonal × core

| シーズン | 重複語 | 重複率 |
|---------|--------|--------|
| advent | 希望 | 1/4 = 25% |
| lent | なし | 0% |
| easter | 喜び | 1/4 = 25% |
| pentecost | なし | 0% |
| ordinary | 祈り・平安 | 2/4 = 50% |

### seasonal × discovery

| シーズン | 重複語 | 重複率 |
|---------|--------|--------|
| advent | なし | 0% |
| lent | 悔い改め | 1/4 = 25% |
| easter | なし | 0% |
| pentecost | 教会・証し | 2/4 = 50% |
| ordinary | 知恵 | 1/4 = 25% |

---

## 3. シーズン別 Uniqueness スコア

seasonal プール内で「他プールと重複しない語」の割合。

| シーズン | Uniqueness | 重複語 | 評価 |
|---------|-----------|--------|------|
| advent | 75% | 希望（∩core）| 許容 |
| lent | 75% | 悔い改め（∩discovery）| 許容 |
| easter | 75% | 喜び（∩core）| 許容 |
| pentecost | 50% | 教会・証し（∩discovery）| 注意 |
| **ordinary** | **25%** | **祈り・平安（∩core）・知恵（∩discovery）** | **要改善** |

---

## 4. 役割確認

重複語を持つ語には WARN を付記。

### core プール

| 語 | 状態 |
|----|------|
| 愛 | OK |
| 祈り | WARN（ordinary seasonal と重複） |
| 信仰 | OK |
| 希望 | WARN（advent seasonal と重複） |
| 救い | OK |
| 平安 | WARN（ordinary seasonal と重複） |
| 恵み | OK |
| 喜び | WARN（easter seasonal と重複） |

### discovery プール

| 語 | 状態 |
|----|------|
| 知恵 | WARN（ordinary seasonal と重複） |
| 契約 | OK |
| 義 | OK |
| 慰め | OK |
| 証し | WARN（pentecost seasonal と重複） |
| 栄光 | OK |
| 弟子 | OK |
| 教会 | WARN（pentecost seasonal と重複） |
| 永遠の命 | OK |
| 悔い改め | WARN（lent seasonal と重複） |

**注意**: WARN は機能的な問題ではない。deduplication ループが重複語を自動スキップする。  
影響は「その語が seasonal に出た日、後続プールの選択インデックスが次候補にシフトする」程度。

---

## 5. 5年間シミュレーション（2024–2028）

### シーズン分布

| シーズン | 日数 | 割合 |
|---------|------|------|
| ordinary | 1,156日 | 63% |
| easter | 245日 | 13% |
| lent | 230日 | 13% |
| advent | 124日 | 7% |
| pentecost | 70日 | 4% |

ordinary が年間の63%を占めるため、ordinary の品質が年間テーマ体験の大半を規定する。

### テーマ出現頻度（5年間・上位）

| テーマ | 日数 | 割合 | 注記 |
|--------|------|------|------|
| 平安 | 745日 | 41% | ordinary×2プール（seasonal+core）から頻出 |
| 信仰 | 606日 | 33% | core のみ |
| 祈り | 604日 | 33% | ordinary×2プール（seasonal+core）から頻出 |
| 希望 | 491日 | 27% | core（advent seasonal 重複含む）|
| 愛 | 487日 | 27% | core |
| 知恵 | 486日 | 27% | ordinary×2プール（seasonal+discovery）から頻出 |
| 喜び | 482日 | 26% | core（easter seasonal 重複含む）|
| 救い | 460日 | 25% | core |
| 恵み | 450日 | 25% | core |
| 感謝 | 287日 | 16% | ordinary seasonal のみ（重複なし）|
| 悔い改め | 227日 | 12% | discovery（lent seasonal 重複含む）|
| 証し | 200日 | 11% | discovery（pentecost seasonal 重複含む）|
| 教会 | 193日 | 11% | discovery（pentecost seasonal 重複含む）|
| 契約〜弟子 | 180–185日 | 10% | discovery |
| 季節限定語（復活・十字架等）| 55–61日 | 3% | seasonal のみ |
| 聖霊・賜物 | 19–20日 | 1% | pentecost seasonal のみ（期間短）|

core 語が3件以上表示される日: **675日（37%）** — 年間の1/3以上で core 支配が発生。

### テーマ分布の偏り構造

```
平安 ─────────────── 41% （ordinary seasonal + core: 年間63%×2プール）
祈り ──────────────  33% （同上）
知恵 ──────────────  27% （ordinary seasonal + discovery）
感謝 ────────         16% （ordinary seasonal のみ・重複なし）
discovery 語  ───    10% 前後
季節限定語    ──      1–3%
```

ordinary の3語が他プールと重複することで、ordinary シーズン中に  
「seasonal が selected → 同語が core/discovery でも選ばれかけてスキップ → 別語が繰り上がる」  
という連鎖が起きる。結果として ordinary 日はテーマが固定パターン化しやすい。

---

## 6. 問題評価

| 重大度 | シーズン | 内容 |
|--------|---------|------|
| **HIGH** | ordinary | uniqueness 25%。4語中3語が他プール重複。年間63%を占めるため影響大。平安が5年で41%・祈りが33%に達する出現頻度偏り |
| MEDIUM | pentecost | uniqueness 50%。教会・証しが discovery と重複。年間4%（70日）のため実害は限定的 |
| LOW | advent | uniqueness 75%。希望1語がcoreと重複。deduplication で機能上は問題なし |
| LOW | lent | uniqueness 75%。悔い改め1語がdiscoveryと重複。同上 |
| LOW | easter | uniqueness 75%。喜び1語がcoreと重複。同上 |

**機能的問題は存在しない**。deduplication ループが全ケースを正しく処理する。  
問題は体験品質: ordinary 期間（年間の大半）に同じ語が繰り返し表示されやすい点。

---

## 7. ordinary 改善案

### 現在のプール

```
ordinary: ['祈り', '感謝', '平安', '知恵']
            ↑core重複  ↑unique  ↑core重複  ↑disc重複
```

uniqueness 25% → unique 語は `感謝` のみ。

### 候補語（他プール非重複）

| 候補語 | 神学的根拠 | ordinary との適合性 |
|--------|-----------|-------------------|
| 導き | 日々の歩みの中の神の導き（詩篇23等）| 高：ordinary time の性格に直結 |
| 忍耐 | 待ち続けること（ロマ5章等）| 高：ordinary は「待つ期間」|
| 賛美 | 礼拝・日常の感謝表現 | 中：感謝との対称性 |
| 慈しみ | חֶסֶד（ヘセド）の日本語訳。神学的深みあり | 中：発見テーマとしても機能する |

### 改善後案（例）

```
ordinary: ['感謝', '導き', '忍耐', '賛美']
```

uniqueness: 4/4 = **100%**。全語が他プールと重複しない。  
実装変更は不要（`_DISCOVERY_THEMES.seasonal.ordinary` の JSON データ変更のみ）。

---

## 8. 365日品質サマリ（2026年）

| 指標 | 値 | 評価 |
|------|----|------|
| 年間テーマセット種類 | 40+ | ✅ 充分な多様性 |
| undefined season | 0日 | ✅ |
| エラー発生 | 0日 | ✅ |
| ordinary seasonal 重複日数 | 173日 | ⚠️（ordinary期間の約75%）|
| core支配日（3語以上）| 675日/5年（37%）| ⚠️ 偏り |

---

## 9. 結論

| 評価軸 | 判定 |
|--------|------|
| 機能的正確性 | **PASS** — 常に4件・重複なし・エラーなし |
| データ品質 | **NEEDS_IMPROVEMENT** — ordinary uniqueness 25% |
| 即時対応要否 | **不要** — UI上の不具合ではなく体験品質の問題 |
| 推奨アクション | ordinary seasonal pool の語を独自語に差し替え（データ変更のみ・JS変更不要）|

---

## 変更しなかった項目

| 項目 | 理由 |
|------|------|
| `search-tool.html`（JS/CSS/HTML）| 変更禁止 |
| `_DISCOVERY_THEMES` const | 変更禁止 |
| `getDiscoveryThemes()` | 変更禁止 |
| 検索ロジック一切 | 変更禁止 |

---

## 成果物

| ファイル | 内容 |
|---------|------|
| `docs/discovery-theme-quality-audit.md` | 本ドキュメント |
| `docs/output/discovery-theme-quality-audit.json` | 機械可読版（完全データ）|
