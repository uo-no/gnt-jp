# Semantic Domain — 設計仕様書

> **ステータス**: 確定 (Architecture Hardened + Hierarchy Decision Locked)  
> **根拠**: 2026年7月 監査により確認・文書化

---

## 概念の定義

### 1. Semantic Domain（意味領域）

Louw-Nida *Greek-English Lexicon of the New Testament based on Semantic Domains*（第2版）が定義する意味分類体系。

- **主ドメイン（Major Domain）**: 1〜93 の番号で識別される最上位カテゴリー（例: 33 = Communication）
- **サブドメイン（Subdomain）**: 主ドメイン内の細分類（例: 33.29 = "call aloud, summon"）
- **ユーザー向けの意味分類**として機能する。UI には「意味グループ」として表示する

ラベルデータ: `assets/data/index/semantic-domain-labels.json`

```
majorDomains["33"]  → { title: "コミュニケーション" }
subdomains["33029"] → { title: "召す・呼び出す", description: "..." }
```

---

### 2. Cluster（クラスター）

**Semantic Domain 内に存在する語群。**

- 1つの Semantic Domain に対して **複数の Cluster が存在しうる**（監査で確認済み）
- Cluster ≠ Semantic Domain。Cluster は Semantic Domain の一部であり、同一ではない
- 同じ lemma が複数 Cluster に属することがある（例: καλέω は `33029` と `33030` 両方に属する）
- クラスターデータ: `assets/data/index/domains-cluster-index.json`

```json
{
  "33029": { "occurrences": 261, "lemmaCount": 9, "lemmas": ["grc:G2564", ...] },
  "33030": { "occurrences": 312, "lemmaCount": 6, "lemmas": ["grc:G2564", ...] }
}
```

**UI上の現れ方**: StudyPanel の「一緒に使われる語を見る」セクションで最大2件表示される。
同一語の StudyPanel に見出し「意味グループ」が2行並ぶ場合、それは **2つの異なる Cluster** を表示しており、同一 Semantic Domain の異なる側面を示す仕様である（バグではない）。

---

### 3. Raw Domain Code

**cluster-index のキー**として実際に使われる生の文字列。

```
例: "013001"  "13001"  "33029"  "033029"  "16"  "016"
```

**重要な発見（2026年7月監査）**: Raw Domain Code には**ゼロ埋め有り版と無し版が両方存在する**。
これらは**同一 Semantic Domain を指すが、クラスターとしては別エントリ**（メンバー語・出現数が異なる）。

```
"013001" → occurrences=5755, lemmaCount=19  (19語のクラスター)
"13001"  → occurrences=9958, lemmaCount=71  (71語のクラスター)
```

**絶対規則**:
- Raw Domain Code は **clusterIndex の参照・クラスター識別にのみ**使用する
- Raw Domain Code を正規化して clusterIndex にアクセスしてはいけない
  （正規化すると異なるクラスターが同一視され、誤ったデータを参照する）

---

### 4. Normalized Domain Code（正規化コード）

**ラベル辞書（semantic-domain-labels.json）を引くための変換後コード**。

変換規則: 先頭のゼロを取り除く（メジャードメイン部分のみ）

```
"013001"  →  "13001"
"033029"  →  "33029"
"008002"  →  "8002"
"016"     →  "16"
```

**許可される用途**:
- UI 表示用タイトルの取得（`_getDomainLabel`）
- `semantic-domain-labels.json` の `subdomains` / `majorDomains` へのアクセス
- `_getSemanticDomain()` の戻り値生成

**禁止される用途**:
- `domains-cluster-index.json`（`_clusterIndexData`）へのキーとしてのアクセス

---

## データフロー図

```
Lexicon エントリ
  └── domains: ["013001", "13001", "33029", ...]   ← Raw Domain Codes
                    │                 │
                    │ (生コードそのまま)│
                    ▼                 ▼
          _clusterIndexData[code]     _getDomainLabel(code)
          (クラスターデータ取得)          │
          ↓                           │ _normalizeDomainCode(code)
     occurrences                      │         ↓
     lemmaCount                       │  semantic-domain-labels.json
     lemmas[]                         │     subdomains["13001"]
          │                           │     majorDomains["13"]
          ▼                           ▼
     _buildClusterLayerHTML()    表示タイトル（例: "存在する・いる"）
     (クラスター語群チップ描画)
```

---

## 判明したデータ構造上の問題（参考）

2026年7月の監査で以下を確認:

| 分類 | 件数 | 内容 |
|------|------|------|
| **B（完全一致）** | 10件 | ゼロ埋め版・非ゼロ版が同一データを重複保持。データ生成バグ |
| **C（完全不一致）** | 496件 | 異なるメンバー語・出現数を持つ別クラスター |
| **C_partial** | 1件 | 一部共通・一部異なる（`33028` / `033028`） |

496件の「C」グループが存在するため、**Raw Domain Code の正規化統合は不可**。

B（10件）のみデータ生成側で重複削除が可能だが、アプリ側での対処は不要（どちらのキーでアクセスしても同じデータが返るため）。

---

## 将来の実装規則

**意味領域ブラウザ・検索・フィルター・関連語表示**はすべて以下の構造を前提とすること:

```
Semantic Domain（意味領域）
  └── Cluster A  (Raw Code: "13001")
  │     └── Lemma: εἰμί, γίνομαι, ...
  └── Cluster B  (Raw Code: "013001")
        └── Lemma: γίνομαι, ἐπεκτείνομαι, ...
```

- **意味領域ブラウザ**: `semantic-domain-labels.json` の `majorDomains` / `subdomains` を起点とする。Normalized Code → Raw Code の逆引きマップが必要になる
- **検索・フィルター**: `_getSemanticDomain(code)` を使い、majorCode でグループ化する
- **関連語表示**: Cluster の `lemmas[]` を基に表示する。複数 Cluster がある場合は Cluster 単位で表示する（Semantic Domain 単位での統合は行わない）

---

## アーキテクチャ原則: 階層化しない設計（意図的決定）

> **決定日**: 2026年7月  
> **ステータス**: 確定（再検討条件は下記を参照）

### 決定内容

`semantic-domain-labels.json` の **階層化は意図的に採用しない設計である**。

現在の JSON は `majorDomains` と `subdomains` の **2つのフラットマップ** で構成されており、
この構造は将来も維持する。`parent`・`children` 等の親子フィールドをデータ側に追加してはいけない。

### 根拠（監査ベース）

| 確認事項 | 結果 |
|----------|------|
| 階層構造を消費するUIコード | **0件** |
| `_getSemanticDomain` の実呼び出し数 | **0件**（定義のみ） |
| `majorCode` を参照するUI処理 | **0件**（関数定義内部のみ） |
| 唯一の利用パス | `rawCode → _getDomainLabel → チップラベル文字列` の1経路 |
| UIエントリのうち major フォールバック | 60.3%（フラット構造で成立中） |

階層化しても **利益がゼロ** であることが実使用データで確認された。

### アーキテクチャ原則

```
意味構造はデータではなく関数で生成する。
JSONはフラットな真実データ（Single Source of Truth）。
階層はビュー層の責務であり、データ層に埋め込まない。
```

| 禁止 | 許可 |
|------|------|
| `semantic-domain-labels.json` のネスト構造化 | `_getSemanticDomain()` による動的導出 |
| `majorCode` フィールドを JSON に追加 | `majorCode` の計算ロジック追加（必要時のみ） |
| `parent` / `children` 関係をデータ側に埋め込む | 階層ビューを派生関数で生成 |

### 将来の再検討条件

以下の **いずれか1つが成立した場合のみ** 階層化を再検討する:

1. `majorCode` 単位のナビゲーション UI が実装される
2. 「ドメイン 33 配下を見る」操作が主要機能として採用される
3. 意味領域ブラウザが正式機能として確定する
4. subdomain ラベルの網羅率が 95% 以上になる（現在: 79件 / LN全体）

上記条件が成立しない限り、このセクションの決定を覆す提案は行わない。

---

## 公開 API

| 関数 | 用途 | 正規化 | cluster アクセス |
|------|------|--------|-----------------|
| `_normalizeDomainCode(code)` | ラベル辞書キー変換 | する | **しない** |
| `_getDomainLabel(code)` | 表示用タイトル取得 | 内部で使用 | **しない** |
| `_getSemanticDomain(code)` | 意味領域オブジェクト取得 | 内部で使用 | **しない** |
| `_buildClusterLayerHTML(...)` | クラスター描画 | **しない** | する（生コード） |
