# Phase UX-10-6 — Discovery Lobby Final Experience Audit

**実施日**: 2026-07-14  
**種別**: 最終品質監査（実装変更なし）  
**対象**: `search-tool.html` / `assets/data/discovery-themes.json` / `docs/search-design-system.md`

---

## 結論（先頭に記載）

**BLOCK: 0件 → UX-10 完了判断が可能。**

7件の IMPROVE が残るが、いずれも機能・体験の本質には関わらない minor な改善である。

---

## 1. First Visit Experience（初回表示3秒以内）

### 実測値（Desktop 1280×800）

| 指標 | 値 |
|------|----|
| page load | **727ms** |
| Discovery Lobby visible at first render | YES ✅ |
| テーマ語表示数 | 4件（忍耐・信仰・希望・証し）|
| title y | 76px |
| chip[0] y | 156px |
| chip font-size / weight | 20px / 400 |
| title font-size / weight | 16px / 400 |
| chip border / background | none / transparent |
| console errors | 0件 |

### 評価

| 確認項目 | 評価 | 詳細 |
|---------|------|------|
| 3秒以内にロード | GOOD ✅ | 727ms。初期表示は十分に速い |
| 何を見るべきか分かる | GOOD ✅ | テーマ語（20px）が即座に中央に表示される |
| テーマ語が入口として理解できる | IMPROVE | `cursor:pointer` 以外の常時 affordance なし。ホバー前にクリック可能と分からない可能性 |
| 検索方法一覧に見えない | GOOD ✅ | ピル・ボーダー・背景なし。DS-DISCOVERY-02 達成 |

---

## 2. Discovery Flow

```
Discovery Theme → 検索 → Hit Card → 本文で読む → index.html → StudyPanel
```

| ステップ | 確認 | 実測 |
|---------|------|------|
| テーマ語クリック | PASS ✅ | input に語が入力される（「忍耐」確認）|
| unifiedSearch() 起動 | PASS ✅ | empty state 非表示 / result-body 表示 |
| 検索結果表示 | PASS ✅ | 78件（忍耐）/ 17 Hit Cards |
| 「本文で読む」CTA | PASS ✅ | 全 Hit Card に Primary CTA 存在 |
| index.html → StudyPanel | OUT OF SCOPE | search-tool.html スコープ外。フロー連続性は正常 |

**評価: GOOD** — フロー全体が自然につながっている。§3 IA 規定（探す → 発見 → 読む）に沿っている。

---

## 3. Theme Quality

### Core プール（8語）

| 語 | 聖書的妥当性 | 初心者理解度 | 検索接続 |
|----|------------|------------|---------|
| 愛 | ✅ ἀγάπη | ✅ | ✅ 631件 |
| 祈り | ✅ προσευχή | ✅ | ✅ |
| 信仰 | ✅ πίστις | ✅ | ✅ |
| 希望 | ✅ ἐλπίς | ✅ | ✅ |
| 救い | ✅ σωτηρία | ✅ | ✅ |
| 平安 | ✅ εἰρήνη | ✅ | ✅ |
| 恵み | ✅ χάρις | ✅ | ✅ |
| 喜び | ✅ χαρά | ✅ | ✅ |

**評価: GOOD** — 全語が新約聖書の中心概念。初心者・経験者いずれにも有意義。

### Discovery プール（10語）

| 語 | 聖書的妥当性 | 初心者理解度 | 備考 |
|----|------------|------------|------|
| 知恵 | ✅ | ✅ | |
| 契約 | ✅ | 中（やや神学的）| |
| 義 | ✅ δικαιοσύνη | 中 | |
| 慰め | ✅ | ✅ | |
| 証し | ✅ | ✅ | |
| 栄光 | ✅ δόξα | ✅ | |
| 弟子 | ✅ | ✅ | |
| 教会 | ✅ ἐκκλησία | ✅ | |
| 永遠の命 | ✅ | ✅ | |
| 悔い改め | ✅ μετάνοια | ✅ | |

**評価: GOOD** — discovery プールは core より深い探索へ誘う設計として機能している。

### Seasonal プール

| シーズン | 語 | 評価 | 備考 |
|---------|-----|------|------|
| ordinary | 感謝・導き・忍耐・賛美 | GOOD ✅ | uniqueness 100%（UX-10-3D 更新済）|
| advent | 希望・光・約束・待ち望む | GOOD / IMPROVE | **「待ち望む」は動詞終止形**。他の全テーマは名詞 |
| lent | 十字架・悔い改め・従う・赦し | GOOD / IMPROVE | **「従う」も動詞**。机能的影響なし |
| easter | 復活・いのち・喜び・勝利 | GOOD ✅ | |
| pentecost | 聖霊・教会・証し・賜物 | GOOD ✅ | uniqueness 50%（deduplication 処理済）|

**軽微課題**: `待ち望む`・`従う` が動詞終止形で名詞主体のプールと形式不整合。  
機能的には問題なし（検索は正常）。次回データ更新時に `待ち望み`（名詞）・`従順` 等への変更を検討。

---

## 4. Design System Compliance

### DS-DISCOVERY-01「検索方法を教えない。読むきっかけを差し出す」

| 確認 | 結果 |
|------|------|
| chip に border / background なし | ✅ |
| chip font-size (20px) > title (16px) | ✅ |
| テーマ語が視覚的主役 | ✅（size で優位）|
| ギリシャ語 / Strong番号なし | ✅ P-09 準拠 |

**評価: COMPLIANT**

---

### DS-DISCOVERY-02「静かな入口」

| 確認 | 結果 |
|------|------|
| 縦列レイアウト（横並びリストでない）| ✅ |
| box-shadow / border-radius なし | ✅ |
| 過剰なアニメーション・色装飾なし | ✅ |
| chip font-weight 400（太字なし）| ✅ |
| title font-weight 400（太字なし、UX-10-5B 適用済）| ✅ |

**評価: COMPLIANT**

---

### Search Design System §3 Empty State

§3 の必須要素（グリフ / title / description / テーマ / 例 / パターン / 履歴）は  
Discovery Lobby 表示時にすべて `display:none` で温存されており、  
`_showEmpty()` 呼び出し時（エラー時）に正常に復元される。

**評価: COMPLIANT**

---

### Search Design System §11 Corpus Visibility Rules

Discovery Lobby はコーパス表示を持たない。  
テーマクリック後の検索結果での corpus 表示は UX-9.x 系（corpus-visibility-implementation）が担当済み。

**評価: NOT APPLICABLE（lobby 自身は §11 の直接対象外）**

---

### Design Commandments

| 掟 | 確認 | 評価 |
|----|------|------|
| Ⅰ 検索ページは探す場所 | Discovery Lobby は「探すきっかけ」を提供 | ✅ |
| Ⅳ 「本文で読む」が唯一の Primary CTA | Lobby に CTA なし / 結果画面に「本文で読む」| ✅ |
| Ⅹ Empty State の入口は日本語から | 全テーマ語が日本語 | ✅ |
| ⅩⅩ 探すことで何かに出会う体験を守れ | テーマ → 検索 → Hit Card → 本文 のフロー | ✅ |

---

## 5. 残存課題

### GOOD（UX-10 で解消・達成済み）

| 内容 |
|------|
| DS-DISCOVERY-02（chip 形状なし）✅ |
| Tap target 53px（Apple HIG 超過）✅ |
| DS-DISCOVERY-01（chip 20px > title 16px）✅ |
| Discovery Flow（テーマ → 検索 → Hit Card → 本文で読む）✅ |
| Mobile 390px 完全動作 ✅ |
| ordinary uniqueness 100%（感謝・導き・忍耐・賛美）✅ |
| 教会暦シーズン判定（Meeus/Jones/Butcher）✅ |
| 回帰: 愛631 / 罪1009 / ἀγαπάω353 全 PASS ✅ |
| title font-weight 400（テーマ語優位）✅ |
| page load 727ms（3秒以内）✅ |

---

### IMPROVE（残存・優先度順）

| ID | 内容 | 修正 | 規模 |
|----|------|------|------|
| R-01 | `.state-empty gap: 14px`（token 外）| `var(--space-md)` | 1行 |
| R-02 | hover transition に ease-out なし / opacity 0.55 がトークン外 | `var(--transition-fast)` / `var(--opacity-secondary)` | 2行 |
| R-03 | `.discovery-title font-size: 1rem`（生値）| `var(--text-body-lg)` | 1行 |
| R-04 | クリック affordance が hover のみ | font-weight 500-600 等 | 小 |
| R-05 | chip[0](y=156) と入力(y=143) の垂直差 13px（目標 30px 未達）| padding-top を 64px 以上へ | 1行 |
| R-06 | 待ち望む・従う が動詞終止形（名詞主体プールと形式不整合）| 名詞形に変更（JSON データのみ）| 小 |
| R-07 | DS-DISCOVERY-01/02 が search-design-system.md §3 に未記載 | §3 に追記 | 文書のみ |

---

### BLOCK（なし）

**BLOCK = 0**

---

## UX-10 完了判断

| 基準 | 状態 |
|------|------|
| BLOCK なし | ✅ 達成 |
| Discovery Flow 動作 | ✅ |
| 機能回帰 PASS | ✅ |
| DS-DISCOVERY-01/02 準拠 | ✅ |
| Mobile 動作 | ✅ |

**UX-10 Discovery Lobby は完了基準を満たす。**  
残存の IMPROVE 7件は次フェーズ以降または別機会に対応する。

---

## 成果物

| ファイル | 内容 |
|---------|------|
| `docs/discovery-lobby-final-audit.md` | 本ドキュメント |
| `docs/output/discovery-lobby-final-audit.json` | 機械可読版（全データ）|
