# UX-11-3 — Interaction Audit

**実施日**: 2026-07-15  
**種別**: 監査のみ（実装変更なし）  
**対象**: 画面内のすべてのインタラクティブ要素の役割・重量・過多状態の評価

---

## 評価軸の定義

### インタラクション階層（Apple 基準）

| 階層 | 意味 | 視覚スタイル | 1画面での理想数 |
|------|------|-------------|---------------|
| **Primary** | この画面の最重要アクション | filled、最大視覚重量 | **1つ** |
| **Secondary** | 重要だが Primary ほどではない | ghost（枠のみ）または tinted | **2つまで** |
| **Tertiary** | 機能へのアクセス | text link・icon のみ | 制限なし（ただし抑制） |
| **Ghost** | 存在するが主張しない | opacity 0.4 以下・枠なし | 制限なし |

Apple が1画面に Primary を1つしか置かない理由: Primary が2つ以上あると「どちらを押せばよいか」の判断コストが発生し、使用を躊躇させる。

---

## 1. Discovery Lobby 状態（Desktop）

### 現状のインタラクティブ要素一覧

| 要素 | 現在の役割認識 | 視覚スタイル | 現在の階層 | 本来の階層 | ギャップ |
|------|--------------|------------|----------|----------|---------|
| `discovery-theme-chip`（忍耐・信仰・希望・証し）| 今日のテーマ。クリックで検索 | 透明・セリフ・大きい | Tertiary（見た目） | **Primary** | **-2（重大な過小評価）** |
| `.run-btn`「検索する」 | 検索実行 | filled 青・大・全幅 | **Primary**（見た目） | Tertiary | **+2（重大な過剰）** |
| `.layer-row`「語根で探す」 | 検索モード切替 | tinted 青カード | Secondary（見た目） | Ghost | **+2（過剰）** |
| `<details>`「詳細検索」 | 詳細オプション表示 | bordered disclosure | Tertiary | Tertiary | 0（適切） |
| `.share-url-btn`（リンクアイコン）| URL コピー | icon のみ・低 opacity | Tertiary | Tertiary | 0（適切） |
| `#history-recent-chips`（フォーカス時）| 履歴から再検索 | ghost pill | Tertiary | Tertiary | 0（適切） |

**Critical Issue: Primary と本来の Primary が逆転している**

- `discovery-theme-chip` は DS-DISCOVERY-01 の核心——「今日、聖書を読み始めるきっかけ」——であり、このプロダクトの最も重要なアクション。しかし視覚的には Tertiary に見える。
- `.run-btn` は「Enter できないユーザーのフォールバック」にすぎないが、Primary に見える。

この逆転がプロダクトのアイデンティティを損なっている。

---

### Discovery Lobby の理想的なインタラクション階層

| 階層 | 要素 | 変更 |
|------|------|------|
| Primary | `discovery-theme-chip`（テーマ語4件） | 視覚的重量を現状より上げる（現在は意図的に軽い——これは正しい方向だが、Primary であることが伝わらないほど軽すぎる） |
| Secondary | 検索入力欄（フォーカス） | 変更なし |
| Tertiary | `.run-btn`（検索する） | ghost、高さ縮小 |
| Tertiary | 語根で探す | インラインテキストまたは薄いトグル |
| Tertiary | 詳細検索 | 変更なし |
| Ghost | share-url-btn | 変更なし |

**注**: `discovery-theme-chip` の視覚重量を「上げる」必要はない。むしろ周囲の重量を「下げる」ことで、現在の透明セリフ語が自然に Primary になる。本質は**相対的な強調**。

---

## 2. 検索結果状態（Desktop）

### 現状のインタラクティブ要素一覧（一覧件数: 愛 631件の場合）

| 要素 | 現在の階層 | 本来の階層 | 出現回数 | ギャップ |
|------|----------|----------|---------|---------|
| `.run-btn`「検索する」 | Primary | Tertiary | 1 | +2 |
| `.hit-open-btn-lg`「本文で読む」 | Primary（塗り） | Secondary | **631** | +2 × 631 |
| `.hit-open-btn`「原語の流れを見る」 | Secondary | Secondary | 631 | 0 |
| `hit-ref`（節番号リンク）| Tertiary | Tertiary | 631 | 0 |
| `.add-btn`（共起語に追加） | Tertiary | Tertiary | 複数 | 0 |
| `ci-related-more-btn`「さらに詳しく」 | Tertiary | Tertiary | 1 | 0 |
| `.layer-chip`（ギリシャ語チップ） | Secondary | Secondary | 4 | 0 |
| Concept 概念チップ（青塗り） | Primary（塗り） | Tertiary | 4 | +2 |
| `.lg-bar`（語根グループ） | Secondary | Secondary | 可変 | 0 |
| `.dist-bar-row`（書物分布バー） | Secondary | Secondary | 20〜 | △ |
| `.sort-btn`（ソート切替） | Secondary | Tertiary | 3 | +1 |
| `#pattern-explore-chips` | Secondary | Secondary | 4 | 0 |

### 過剰インタラクション計算

| 階層 | 理想数 | 現状数 | 超過 |
|------|--------|--------|------|
| Primary | 1 | 2〜635 | **634 超過** |
| Secondary | 2 | 10〜 | 8 超過 |
| Tertiary | 制限なし | 多数 | — |

「本文で読む（Primary スタイル）」が 631 件並ぶ = 画面の中に 631 個の Primary アクションが存在する。これは Primary という概念の完全な崩壊。

---

### 結果画面の理想的なインタラクション階層

| 階層 | 要素 | 変更方向 |
|------|------|---------|
| Primary | なし（または `.run-btn` を薄く、結果がある場合は不要） | `.run-btn` を ghost 化 |
| Secondary | 節ごとの「本文で読む」 | ghost（枠のみ）に変更 |
| Secondary | `.layer-chip`（関連ギリシャ語） | 現状維持 |
| Secondary | `#pattern-explore-chips` | 現状維持 |
| Tertiary | 「原語の流れを見る」 | 現状維持（すでに ghost） |
| Tertiary | 共起語 add-btn | 現状維持 |
| Tertiary | `ci-related-more-btn` | 現状維持 |
| Tertiary | sort-btn | 現状維持 |
| Ghost | Concept 概念チップ | 塗り廃止 → ghost |

---

## 3. 繰り返しインタラクションの問題

同一のスタイルを持つインタラクティブ要素が N 回繰り返されると、2つの問題が起きる。

**問題 A: Primary の希釈**

1個の filled ボタン = 「これを押せ」というシグナル  
N 個の filled ボタン = 「どれを押せばよいか」という混乱

**問題 B: スキャニングの妨害**

読者がリストをスキャンする時、視線は文字列の開始位置（左）→テキスト→次の行、と動く。  
右端に同じ高コントラストの要素が繰り返し出現すると、スキャニングが常にその要素で中断される。

```
マタイ5章43節
『隣り人を愛し、…』         [本文で読む]  ← ← ← 視線がここで終わる

マタイ5章44節
『しかし、わたしは…』       [本文で読む]  ← ← ← また終わる

マタイ5章46節
『あなたがたが…』           [本文で読む]  ← ← ← また終わる
```

「本文で読む」ではなく「テキストを読む」ことが目的のツールで、  
テキストよりも高い視覚重量のボタンが右端に固定されるのは構造的矛盾。

---

## 4. 全画面インタラクション密度

| 状態 | Primary 数 | Secondary 数 | Tertiary 数 | 評価 |
|------|-----------|-------------|------------|------|
| **Desktop Lobby** | 2（run-btn + 語根カード） | 0 | 4〜 | ❌ Primary 過剰 |
| **Desktop 結果（愛）** | 2+N | 10〜 | 多数 | ❌ Primary 爆発 |
| **Mobile Lobby** | 1（FAB のみ） | 0 | 4（テーマ語） | △ FAB の色が Primary すぎる |
| **理想 Desktop Lobby** | **0〜1** | 1（入力欄） | 4（テーマ語） | ✅ |
| **理想 Desktop 結果** | **0〜1** | 4〜6 | 多数 | ✅ |

---

## 5. 「押せそうなもの」の総数

Apple のガイドライン的観点: ユーザーが「押せそうなもの」の数は、認知負荷に直結する。

| 状態 | 押せそうな要素の総数 | Apple 推奨上限 |
|------|-------------------|--------------|
| Desktop Lobby | 7〜8 | 3〜5 |
| Desktop 結果（愛、初期表示） | 20〜25 | 8〜10 |

結果画面の 20〜25 は特に深刻。ユーザーが「次に何をすべきか」を判断するためのコストが高い。

---

## 成果物

| ファイル | 内容 |
|---------|------|
| `docs/interaction-audit.md` | 本ドキュメント |
| 参照 | `docs/visual-weight-audit.md` — 各要素の重量定義 |
| 参照 | `docs/attention-audit.md` — 視線との連動 |
