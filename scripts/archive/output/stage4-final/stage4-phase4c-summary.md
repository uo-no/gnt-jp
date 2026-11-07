# Stage 4 Phase 4c 総括サマリ

生成日: 2026-10-31  
Phase: 4c（Group C — G3756 + G3361 否定表現機能監査）  
対象: 2 Strongs / 2,494 tokens  

---

## 1. Phase 4c の範囲と完了状態

| 対象 | Strongs | tokens | 確認方式 | 完了状態 |
|------|---------|--------|---------|---------|
| G3756 おう/おうく/おうち | 1 | 1,543 | Strong確認 + 用法別サンプル 83件 | ✅ |
| G3361 μή | 1 | 951 | Strong確認 + 用法別サンプル 141件 | ✅ |
| **合計** | **2** | **2,494** | **サンプル計 224件 / 全件確認 62件** | **✅** |

---

## 2. Strong 別判断

| Strong | lemma | tokens | 現行ラベル | 機能判定 | 修正要否 |
|--------|-------|--------|-----------|---------|---------|
| G3756 | οὐ/οὐκ/οὐχ | 1,543 | 〜ない | **FUNCTION_CONFIRMED** | **不要** |
| G3361 | μή | 951 | 〜ない | **FUNCTION_CONFIRMED** | **不要** |
| **合計** | | **2,494** | | | **CONFIRMED_ERROR: 0件** |

---

## 3. "〜ない" ラベルの性質と評価

"〜ない" は **構造的・機能的ラベル**（stage4-negation-design.md §2.3）であり、語彙的訳語ではない。

このラベルが意味するもの:
- 「この token は直後または節内の動詞/形容詞を否定する」
- JA1955 では否定形動詞として表現される（言わなかった / 持っていない 等）

### ラベルが表現しないこと（設計上の意図）

| 非表現事項 | 根拠 |
|----------|------|
| 強調否定の力（決して〜ない）| οὐ μή の強調は2 token の組合せ全体で成立 |
| 命令法禁止の力（〜するな）| 動詞の命令形 + "〜ない" の組合せで構造的に成立 |
| 目的節のニュアンス（〜ないように）| 節構造側の問題 |
| 希求否定の祈願的ニュアンス（どうか〜ないように）| 動詞の希求法形で表現 |

これらは設計上の既知事項であり、ラベル誤りではない。

---

## 4. 用法別確認結果

### 4.1 G3756（1,543 tokens）

| 用法カテゴリ | 推定件数 | 確認方式 | 判定 |
|------------|--------|---------|------|
| 直説法否定（第2アオリスト含む） | ~1,220 | サンプル16件 + 追加 | FUNCTION_CONFIRMED |
| οὐ μή 強調否定（G3756側） | 112 | サンプル16件 | FUNCTION_CONFIRMED + NOTE |
| 分詞否定 | 61 | サンプル12件 | FUNCTION_CONFIRMED |
| 動詞長距離 | 87 | サンプル12件 | FUNCTION_CONFIRMED |
| 不定詞否定 | 8 | **全件** | FUNCTION_CONFIRMED |
| 接続法 | 4 | **全件** | FUNCTION_CONFIRMED |
| 命令法（LUK 22:26 1件のみ真） | 1 | **全件** | FUNCTION_CONFIRMED |

### 4.2 G3361（951 tokens）

| 用法カテゴリ | 推定件数 | 確認方式 | 判定 |
|------------|--------|---------|------|
| 接続法（第2アオリスト含む） | ~238 | サンプル16件 + 追加 | FUNCTION_CONFIRMED |
| 命令法禁止（第2アオリスト含む） | ~164 | サンプル16件 | FUNCTION_CONFIRMED + NOTE |
| 分詞否定（第2アオリスト含む） | ~205 | サンプル16件 | FUNCTION_CONFIRMED |
| 不定詞否定（第2アオリスト含む） | ~97 | サンプル10件 | FUNCTION_CONFIRMED |
| οὐ μή 強調否定（G3361側） | 111 | サンプル16件 | FUNCTION_CONFIRMED + NOTE |
| 直説法用法 | 45 | **全件** | FUNCTION_CONFIRMED |
| 動詞長距離 | 52 | サンプル10件 | FUNCTION_CONFIRMED |
| 希求法 | ~16 | **1件全件** | FUNCTION_CONFIRMED |

---

## 5. JA1955 翻訳パターン内訳

| パターン | 推定件数 | 内容 |
|---------|--------|------|
| TRANSLATION_ABSORBED | ~2,400 | 否定が日本語動詞活用に吸収（〜ない/〜なかった/〜するな等） |
| TRANSLATION_EXPLICIT | ~60〜80 | "決して" などの強調副詞が出現（主に οὐ μή 文脈） |
| TRANSLATION_OMITTED | 0 | 確認されず |
| UNCERTAIN | 稀 | 長文の作用域文脈依存（token label の問題ではない） |

---

## 6. 設計補足の記録

既存 negation-design.md に不足していた項目を `stage4-phase4c-negation-sampling-addendum.md` に記録した。

**主な追加設計**:
- 用法カテゴリ 4 → 10 に拡張
- G3756 + 非直説法形（61 + 8 + 4 + 1 tokens）の独立確認
- G3361 + 直説法（45 tokens 全件）の独立確認
- 第2アオリスト morph（V-2xxx）の分類注意事項
- JA1955 翻訳パターン分類の追加

**変更した既存設計**: **なし**（上書き禁止遵守）

---

## 7. 件数・ref 整合性

```
group-assignment vs bible_data:
  G3756: 1,543 / 1,543 ✅
  G3361:   951 /   951 ✅
  合計: 2,494 ✅

ref 重複: 0件 ✅  
ref 欠落: 0件 ✅
  ※ 発見修正: NT_BOOKS の "JDE" → "JUD"（bible_data の書巻ディレクトリ名が JUD）
    JUD 書 5件の欠落が修正により解消された

Japanese ラベル均一性: "〜ない" 100%（G3756 / G3361 全件）
```

---

## 8. データ変更の確認

| 確認項目 | 状態 |
|---------|------|
| bible_data の変更 | **なし** |
| token.japanese の変更 | **なし** |
| 承認済みデータの変更 | **なし** |
| Phase 4a・4b 成果物の上書き | **なし** |
| commit / push | **なし** |

---

## 9. Phase 4c 成果物一覧

| ファイル | 内容 | 状態 |
|--------|------|------|
| stage4-phase4c-negation-audit.json | G3756/G3361 全用法別サンプルデータ | ✅ |
| stage4-phase4c-negation-report.md | 全件監査報告 | ✅ |
| stage4-phase4c-negation-sampling-addendum.md | 設計補足（既存設計の不足記録） | ✅ |
| stage4-phase4c-summary.md | 本ファイル（Phase 4c 総括） | ✅ |

---

## 10. Phase 4 全体への位置づけ

| Phase | 対象 | 判定 | 修正候補 |
|-------|------|------|---------|
| 4a（G756） | G756 84件 | CONFIRMED_ERROR | 84件 "〜し始める" |
| 4a（Group E） | 4 Strongs 142件 | CONFIRMED_OK | 0件 |
| 4b（Group B） | 5 Strongs 51件 | CONFIRMED_ERROR | 51件（内訳複数）|
| 4b（Group D） | 15 Strongs 293件 | 1件REVISION_CANDIDATE, 1件CONTEXT_DEPENDENT, 他OK | 11件 |
| **4c（Group C）** | **2 Strongs 2,494件** | **FUNCTION_CONFIRMED** | **0件** |

---

## 11. 次の Phase への引き継ぎ事項

1. **Group C は現行ラベル "〜ない" 維持確定**: Phase 4c の結果を根拠に変更不要
2. **JUD 書巻の NT_BOOKS 修正**: 各スクリプトで 'JDE' → 'JUD' の修正が必要（bible_data の正式ディレクトリ名は JUD）
3. **第2アオリスト morph 処理**: Group A 等での用法分類スクリプトで V-2xxx パターンの mood 抽出には追加処理が必要
4. **否定作用域の問題**: 動詞側の監査（Group A）で記録する。否定 token 自体の問題ではない
5. **Group Z との関係**: G3756 ptcl(80) + G3361 ptcl+conj(91) = 171 tokens は Group Z で別途監査。本 Phase 4c の結論に影響しない
