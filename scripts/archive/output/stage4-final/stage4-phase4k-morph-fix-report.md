# Stage 4 Phase 4k — Morph Fix 報告（去る 五段漢字語幹）

**Phase**: 4k follow-up  
**実施日**: 2026-11-01  
**変更ファイル**: `public/core/reading-engine.js`（FROZEN §29 手順適用）

---

## 1. 問題の原因

### 現象

Phase 4k で G863 ἀφίημι 96件 `token.japanese` を更新した結果、`去る` を持つ 8件のトークン（V-2AAP 形）がモーフエンジンで `undefined` になった。

| ref | morph | 変更後 japanese | morph 結果（修正前） |
|-----|-------|-----------------|---------------------|
| MAT 13:36!2 | V-2AAP-NSM | 去る | undefined |
| MAT 22:22!5 | V-2AAP-NPM | 去る | undefined |
| MAT 26:44!2 | V-2AAP-NSM | 去る | undefined |
| MRK 4:36!2  | V-2AAP-NPM | 去る | undefined |
| MRK 8:13!2  | V-2AAP-NSM | 去る | undefined |
| MRK 12:12!18 | V-2AAP-NPM | 去る | undefined |
| LUK 10:30!24 | V-2AAP-NPM | 去る | undefined |
| HEB 6:1!2   | V-2AAP-NPM | 去る | undefined |

### 根本原因

`_VERB_RULES` の `part-aor`（aorist active participle = V-2AAP）ルール群は、`る` 語幹の変換において以下の順で試行する:

```javascript
[/[^い]いる$/, '$&'],          // compound -いる
[/(見|得|出|着|来)る$/, '$1た'], // 漢字語幹で一段確定のもの
[/[ぁ-ん]る$/, (_, s) => ...], // ひらがな語幹（一段/五段自動判定）
[/.+[うく]す$/, '$&'],         // -うす/-くす
[/す$/, 'した'],               // -す 一般
```

`去る` は:
- `去` は漢字 → ひらがなルール（`[ぁ-ん]る$`）に不一致
- 一段例外リスト（`見|得|出|着|来`）にも不存在

→ どのルールにもマッチせず `undefined` になった。

### 正しい活用（さ行五段）

`去る`（さる）は **五段活用（さ行）**:

| 形 | 正解 | 誤り |
|----|------|------|
| 連用形 + ながら（pres participle） | 去りながら | - |
| 連用形 + た（aor participle） | **去った**（促音便） | ~~去た~~ |
| 連用形 + てきた（perf participle） | 去ってきた | - |
| 命令形（imperative） | 去れ | - |

---

## 2. 実装した修正

`_VERB_RULES` の該当 4セクションに `去る` 専用の五段例外ルールを追加した。既存の一段例外パターン（`(見|得|出|着|来)る$`）の直後に配置。

### 変更分類

**BUG / CORRECTNESS** — 活用処理の既存設計に沿った追加のみ（ルール削除・変更なし）。

### 追加ルール

```javascript
// part-pres (V-PAP): 去る → 去りながら
// 五段確定・漢字語幹（去る: さ行五段）
[/(去)る$/, '$1りながら'],

// part-aor (V-2AAP): 去る → 去った
// 五段確定・漢字語幹（去る: さ行五段）
[/(去)る$/, '$1った'],

// part-perf (V-RAP): 去る → 去ってきた
// 五段確定・漢字語幹（去る: さ行五段）
[/(去)る$/, '$1ってきた'],

// imp (V-PAM): 去る → 去れ
// 五段確定・漢字語幹（去る: さ行五段）
[/(去)る$/, '$1れ'],
```

---

## 3. 修正後の 8件確認

| ref | morph | japanese | 修正前 | 修正後 | 判定 |
|-----|-------|----------|--------|--------|------|
| MAT 13:36!2  | V-2AAP-NSM | 去る | undefined | 去った | ✓ |
| MAT 22:22!5  | V-2AAP-NPM | 去る | undefined | 去った | ✓ |
| MAT 26:44!2  | V-2AAP-NSM | 去る | undefined | 去った | ✓ |
| MRK 4:36!2   | V-2AAP-NPM | 去る | undefined | 去った | ✓ |
| MRK 8:13!2   | V-2AAP-NSM | 去る | undefined | 去った | ✓ |
| MRK 12:12!18 | V-2AAP-NPM | 去る | undefined | 去った | ✓ |
| LUK 10:30!24 | V-2AAP-NPM | 去る | undefined | 去った | ✓ |
| HEB 6:1!2    | V-2AAP-NPM | 去る | undefined | 去った | ✓ |

---

## 4. 回帰確認

### 4-1. 既存 -す 動詞（回帰なし）

| 動詞 | 形 | 期待値 | 実値 | 判定 |
|------|----|--------|------|------|
| 赦す | V-PAP (ながら) | 赦しながら | 赦しながら | ✓ |
| 赦す | V-2AAP (た) | 赦した | 赦した | ✓ |
| 赦す | V-PAM (命令) | 赦せ | 赦せ | ✓ |
| 残す | V-PAP (ながら) | 残しながら | 残しながら | ✓ |
| 残す | V-2AAP (た) | 残した | 残した | ✓ |

### 4-2. 既存 -る 動詞（回帰なし）

| 動詞 | 形 | 期待値 | 実値 | 判定 |
|------|----|--------|------|------|
| 捨てる（一段） | V-2AAP | 捨てた | 捨てた | ✓ |
| 見る（一段例外） | V-2AAP | 見た | 見た | ✓ |
| 放つ | V-PAP | 放ちながら | 放ちながら | ✓ |
| 放つ | V-2AAP | 放った | 放った | ✓ |

### 4-3. 4ルール直接テスト

| ルール | 入力 | 期待値 | 実値 | 判定 |
|--------|------|--------|------|------|
| part-aor  | 去る V-2AAP | 去った    | 去った    | ✓ |
| part-pres | 去る V-PAP  | 去りながら | 去りながら | ✓ |
| part-perf | 去る V-RAP  | 去ってきた | 去ってきた | ✓ |
| imp       | 去る V-PAM  | 去れ      | 去れ      | ✓ |

---

## 5. FROZEN §29 準拠確認

| ステップ | 内容 | 状態 |
|---------|------|------|
| 1. 変更理由記録 | ファイル内コメント（五段確定・漢字語幹）+ 本レポート | ✓ |
| 2. Impact Analysis | 影響範囲: `去る` のみ。-す/-る/-つ 他動詞への干渉なし | ✓ |
| 3. 回帰ケース追加 | 8件の個別確認を本レポートに記録 | ✓ |
| 4. 既存 baseline 保存 | morph 44187（re-phase1）/ changed 39684, identical 98057, brokenOld 1257（re-stageB） | ✓ |
| 5. 実装 | 4ルール追加（reading-engine.js 169-170, 186-187, 198-199, 221-222行） | ✓ |
| 6. 全関連 Regression | re-phase1 / re-stageB / re-phase2 / re-phase3 / re-phase5 / re-stageA | ✓ |
| 7. 新 baseline 取得 | morph 44280 / changed 39692, identical 98049, brokenOld 1265 | ✓ |
| 8. 差分確認 | morph +93（悪化 0）/ changed +8, identical -8, brokenOld +8（8件改善のみ） | ✓ |
| 9. Freeze Audit 更新 | morph-rule-engine-v1-frozen.md 改訂履歴に追記 | ✓ |

---

## 6. データ変更なし確認

| 保護対象 | 状態 |
|---------|------|
| bible_data（Phase 4k の 96件変更は保持） | **変更なし** ✓ |
| token.japanese 96件 | **変更なし** ✓ |
| Phase 4i/4j/4j-correction/4k 成果物 | **上書きなし** ✓ |
| Bible JSON 以外の無関係ファイル | **変更なし** ✓ |
| commit / push / PR | **なし** ✓ |
