# 多言語化翻訳データ管理設計

**文書種別**: 設計仕様  
**対象フェーズ**: Phase 2 — 多言語化の設計  
**作成日**: 2026-10-30  
**ステータス**: 承認済み（案1採用）

---

## 1. 設計方針

案1（段階的移行）を採用する。

- `token.japanese` を JA1955 互換フィールドとして維持する。  
- 翻訳別トークン注釈データを `translations/{transId}/tokens/` 以下に新設する。  
- 既存の節テキスト（`translations/{transId}/{book}/{ch}.json`）と同じ翻訳ID体系の下で管理する。  
- `token.english` も同じ問題を持つ。将来の英語翻訳追加時に移行対象として扱う。

---

## 2. ディレクトリ構造

### 現在の構造

```
public/
  bible_data/
    nt/{book}/{ch}.json   ← ギリシャ語本文 + token.japanese（JA1955値）
    lxx/{book}/{ch}.json
  translations/
    JA1955/
      {book}/{ch}.json    ← 口語訳 節単位テキスト（既存）
    BUN/
      {book}/{ch}.json    ← 文語訳 節単位テキスト（既存）
```

### 多言語化後の構造（案1）

```
public/
  bible_data/
    nt/{book}/{ch}.json   ← 変更なし。token.japanese はJA1955互換フィールドとして維持
    lxx/{book}/{ch}.json
  translations/
    JA1955/
      {book}/{ch}.json    ← 節単位テキスト（既存・変更なし）
      tokens/
        {book}/{ch}.json  ← 【新設】JA1955 トークン単位注釈
    BUN/
      {book}/{ch}.json    ← 節単位テキスト（既存・変更なし）
      tokens/
        {book}/{ch}.json  ← 将来追加
    ESV/
      {book}/{ch}.json    ← 将来追加
      tokens/
        {book}/{ch}.json  ← 将来追加
```

---

## 3. トークン単位注釈のフォーマット

**パス**: `translations/{transId}/tokens/{book}/{ch}.json`

```json
{
  "transId": "JA1955",
  "book": "MAT",
  "chapter": 1,
  "tokens": {
    "MAT 1:1!1": "系図",
    "MAT 1:1!2": "起源",
    "MAT 1:2!3": "生み",
    "MAT 1:19!4": "人"
  }
}
```

**キー**: `token.ref`（`{book} {ch}:{verse}!{tokenIndex}` 形式。bible_data の ref と同一）  
**値**: 翻訳に対応する日本語（または対象言語）の表現。存在しない場合はエントリなし（`null` や空文字で埋めない）。

### 設計上の重要事項

- キーは `token.ref` を SSOT とする。`tokenId` ではなくここ使用する。  
- 値が存在しないトークン（助詞・関係代名詞等）はエントリを持たない。  
- `bible_data.japanese` の `［...］` 表記相当の「表示なし」も同様にエントリなし。  
- トークン数が多いため、チャプター単位でファイルを分割する（節テキストと同じ粒度）。

---

## 4. アクセスパターン

### 現在（トークン注釈は bible_data.japanese から直接）

```javascript
const ja = token.japanese || '';
```

### 多言語化後（段階的移行）

```javascript
// Phase A: bible_data.japanese を引き続き使用（互換維持）
const ja = token.japanese || '';

// Phase B: 翻訳IDが設定されている場合は translations/tokens/ を参照
async function getTokenJa(token, transId = 'JA1955') {
  if (transId === 'JA1955') {
    // 互換: bible_data.japanese を使用（移行完了までの暫定）
    return token.japanese || '';
  }
  const tokenData = await loadTokenTranslation(transId, token.book, token.chapter);
  return (tokenData && tokenData.tokens[token.ref]) || '';
}
```

**注**: Phase B への移行は本設計とは別タスクとして扱う。現時点では Phase A を維持する。

---

## 5. 翻訳ID体系

| transId | 言語 | 翻訳名 | 状態 |
|---------|------|--------|------|
| `JA1955` | 日本語 | 口語訳（1955年版） | 節テキスト：既存。トークン注釈：整備中 |
| `BUN` | 日本語 | 文語訳 | 節テキスト：既存。トークン注釈：将来 |
| `ESV` | 英語 | English Standard Version | 将来 |
| `KJV` | 英語 | King James Version | 将来 |
| `RVR1960` | スペイン語 | Reina-Valera 1960 | 将来 |

transId はディレクトリ名と完全に一致させる。言語コードは翻訳IDとは別管理（同一言語の複数翻訳を共存させるため）。

---

## 6. `token.japanese` の位置づけ

```
token.japanese
  ↓ 現在の意味（変更なし）
  JA1955に対応するトークン注釈。口語訳の文脈に基づいて判断された値。
  「翻訳データ」ではなく「JA1955を基準とした Reading Japanese 補助値」として扱う。
  
  将来の位置づけ（移行後）
  translations/JA1955/tokens/ への移行後は互換参照フィールドとなる。
  新規翻訳の追加では token.japanese を変更しない。
```

### 変更しないもの

- `token.japanese` の参照箇所（index.html、morph-search.html、syntax-search.html等）
- `token.english` の扱い（同様の課題は将来対応）
- 節テキスト `translations/JA1955/{book}/{ch}.json` のフォーマット

---

## 7. 多言語化基盤の実装順序

### Step 1（現フェーズ）
JA1955 トークン注釈データ（`translations/JA1955/tokens/`）の形式を定義する。  
このフェーズでは実ファイルを生成しない。設計のみ。

### Step 2（Phase 3 完了後）
修正済み・承認済みの token.japanese 値を `translations/JA1955/tokens/` に書き出す  
生成スクリプトを整備する。  
bible_data.japanese との一致チェックツールを実装する。

### Step 3（将来）
アプリコードが `translations/tokens/` を参照できるように loadTokenTranslation() を実装する。  
翻訳ID切り替えUIを実装する。

---

## 8. 既存機能への影響

| 機能 | 影響 | 対応 |
|------|------|------|
| index.html 本文表示 | なし（token.japanese 維持） | 不要 |
| morph-search.html | なし | 不要 |
| syntax-search.html | なし | 不要 |
| 検索インデックス | なし（bible_data 変更なし） | 不要 |
| 節テキスト表示 | なし（translations/ 変更なし） | 不要 |
| ブックマーク・URL | なし | 不要 |

今回の Step 1 では既存機能に変更を加えない。

---

## 9. 欠落データの検出

将来実装する検証ツールの要件：

- `translations/JA1955/tokens/{book}/{ch}.json` と `bible_data.japanese` の値を照合する。  
- 一致する箇所・不一致の箇所を列挙する。  
- `bible_data.japanese` が更新されたが `translations/tokens/` に反映されていない箇所を検出する。  
- 将来の翻訳追加時に、coverage（対応済み/未対応トークン数）を測定できる。

---

## 10. 関連ファイル

| ファイル | 内容 |
|---------|------|
| `scripts/output/ja1955-nt-audit.json` | NT全体監査生データ（正本） |
| `scripts/output/ja1955-nt-ledger.json` | 監査台帳（status付き） |
| `scripts/build-ja1955-ledger.cjs` | 台帳生成スクリプト |
| `scripts/output/ja1955-nt-audit-final.md` | 人的分析込み最終報告 |
| `public/translations/JA1955/` | 口語訳 節単位テキスト（既存） |
| `public/translations/JA1955/tokens/` | 口語訳 トークン単位注釈（整備中） |
