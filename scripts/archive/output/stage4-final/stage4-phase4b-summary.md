# Stage 4 Phase 4b 総括サマリ

生成日: 2026-10-31  
Phase: 4b（Group B 語義疑問 5件 / Group D 残り 15 Strong）  
対象: 20 Strongs / 344 tokens（Group B: 5 Strongs / 51 tokens + Group D: 15 Strongs / 293 tokens）

---

## 1. Phase 4b の範囲と完了状態

| 対象 | Strongs | tokens | 確認方式 | 完了状態 |
|------|---------|--------|---------|---------|
| Group B 語義疑問 | 5 | 51 | 全件確認 | ✅ |
| Group D（G756 除く） | 15 | 293 | 全件 14 Strong + サンプル 1 Strong | ✅ |
| **合計** | **20** | **344** | | **✅** |

---

## 2. Group B：5 Strong それぞれの判断

| Strong | lemma | tokens | 現行ラベル | 判断 | 推奨ラベル |
|--------|-------|--------|-----------|------|-----------|
| G680 | ἅπτομαι | 34 | 〜である | **CONFIRMED_ERROR** | `"〜さわる"` |
| G1573 | ἐγκακέω | 6 | 〜である | **CONFIRMED_ERROR** + REVISION_CANDIDATE | `"〜くじける"` 他候補あり |
| G567 | ἀπέχομαι | 6 | 〜である | **CONFIRMED_ERROR** | `"〜避ける"` |
| G4823 | συμβουλεύω | 4 | 〜である | **CONFIRMED_ERROR** + REVISION_CANDIDATE | `"〜相談する"` 他候補あり |
| G566 | ἀπέχω | 1 | 〜である | **CONFIRMED_ERROR** + HOLD | 未確定（1件特殊用法） |

**Group B 計**: 51 tokens 全件 CONFIRMED_ERROR

全 5 Strongs が G756 ἄρχομαι と同様の構図：εἰμί の述語ラベル "〜である" が非 εἰμί 動詞に誤適用されている。自動グループ割当でラベルに基づき Group B に配置されたが、語義的には Group B に属さない。

---

## 3. Group D：15 Strong それぞれの判断

| Strong | lemma | tokens | 確認 | verdict | 備考 |
|--------|-------|--------|------|---------|------|
| G3757 | οὗ | 19 | 全件 | CONFIRMED_OK | 表記揺れ NOTE（「所」） |
| G3195 | μέλλω | 109 | サンプル17件 | CONFIRMED_OK | — |
| G3761 | οὐδέ | 55 | 全件 | CONFIRMED_OK | — |
| G3699 | ὅπου | 39 | 全件 | CONFIRMED_OK | 表記揺れ NOTE（「ところ」） |
| G3752 | ὅταν | 8 | 全件 | CONFIRMED_OK | G3753 同ラベル（設計） |
| G5616 | ὡσεί | 11 | 全件 | **REVISION_CANDIDATE** | 全件近似表現用法 |
| G1163 | δεῖ | 16 | 全件 | CONFIRMED_OK | 全件 ἔδει（不完了） |
| G303 | ἀνά | 8 | 全件 | CONFIRMED_OK | — |
| G3753 | ὅτε | 14 | 全件 | CONFIRMED_OK | G3752 同ラベル（設計） |
| G3366 | μηδέ | 6 | 全件 | CONFIRMED_OK | G3761 と同ラベル（設計） |
| G1715 | ἔμπροσθεν | 4 | 全件 | CONFIRMED_OK | — |
| G575 | ἀπό | 1 | 全件 | CONFIRMED_OK | — |
| G5565 | χωρίς | 1 | 全件 | CONFIRMED_OK | — |
| G5228 | ὑπέρ | 1 | 全件 | **CONTEXT_DEPENDENT** | 1件副詞比較用法 |
| G3924 | παρεκτός | 1 | 全件 | CONFIRMED_OK | — |

**Group D 計**: CONFIRMED_ERROR 0 件。REVISION_CANDIDATE 1 Strong（G5616 11件）、CONTEXT_DEPENDENT 1 Strong（G5228 1件）

---

## 4. 修正候補・現状維持・判断保留の件数

| 区分 | tokens | Strongs | 内容 |
|------|--------|---------|------|
| **CONFIRMED_ERROR（要修正）** | **51** | **5** | Group B 全件。新ラベル設計・台帳記録が必要 |
| — うち高確信度ラベル確定 | 40 | 2 | G680（34）→"〜さわる"、G567（6）→"〜避ける" |
| — うち REVISION_CANDIDATE | 10 | 2 | G1573（6）、G4823（4）: ラベル設計判断要 |
| — うち HOLD | 1 | 1 | G566（1）: 1件特殊用法 |
| **REVISION_CANDIDATE** | **11** | **1** | G5616 全11件（近似表現用法 vs "〜のように"） |
| **CONTEXT_DEPENDENT** | **1** | **1** | G5228 1件（副詞比較用法 vs "〜のために"） |
| **CONFIRMED_OK** | **281** | **13** | Group D 残り 13 Strong |
| **NOTE（表記揺れ）** | **(58)** | **(2)** | G3757+G3699（設計判断待ち、重複計上） |
| **合計** | **344** | **20** | |

---

## 5. G3195・G3699・G3757 の詳細結論

### G3195 μέλλω（109 tokens）
- 4書巻区（共観/ヨハネ/使徒/書簡）× 各 5 件 = 17件サンプル確認
- シード 3195、拡大条件に達せず
- 全サンプルで "〜しようとする" 構造ラベルは妥当
- 分詞用法（「来るべき者」等）は CONTEXT_DEPENDENT として記録済み
- **CONFIRMED_OK**

### G3699 ὅπου（39 tokens）
- 全件確認。"〜するところ" = 場所の関係節を正確に表す
- G3757 との表記揺れあり（漢字「所」vs 平仮名「ところ」）
- どちらが「正」かは設計判断が必要。現行はデータレベルの不統一
- **CONFIRMED_OK**（表記揺れは REVISION_CANDIDATE として記録）

### G3757 οὗ（19 tokens）
- 全件確認。"〜する所" = G3699 と同一概念を別表記で表す
- οὗ（関係代名詞属格の副詞転用）と ὅπου（複合場所副詞）は語源が異なるが機能は同一
- 表記の違いはデータ上の問題（表示上ではない）
- **CONFIRMED_OK**（表記揺れは REVISION_CANDIDATE として記録）

---

## 6. 全件確認・サンプリングの実施状況

| 対象 | 確認方式 | 確認件数 / 対象件数 |
|------|---------|------------------|
| Group B 全 5 Strongs | 全件 | 51 / 51 |
| Group D G3195 | 層別サンプル | 17 / 109 |
| Group D 残り 14 Strongs | 全件 | 184 / 184 |
| **Phase 4b 合計** | | **252 確認 / 344 対象** |

G3195 サンプルで NOTE/AMBIGUOUS/ERROR が 0 件のため全件切替条件に達せず。

---

## 7. 母集団との件数・ref 整合性

```
Group B:
  group-assignment vs bible_data:
  G680: 34/34 ✅  G1573: 6/6 ✅  G567: 6/6 ✅  G4823: 4/4 ✅  G566: 1/1 ✅
  合計: 51 ✅

Group D（G756除く）:
  G3757: 19 ✅  G3195: 109 ✅  G3761: 55 ✅  G3699: 39 ✅  G3752: 8 ✅
  G5616: 11 ✅  G1163: 16 ✅  G303: 8 ✅  G3753: 14 ✅  G3366: 6 ✅
  G1715: 4 ✅  G575: 1 ✅  G5565: 1 ✅  G5228: 1 ✅  G3924: 1 ✅
  合計: 293 ✅

G756 の再混入: なし ✅
ref 重複: 0件  ref 欠落: 0件
```

---

## 8. データ変更なしの確認

| 項目 | 状態 |
|------|------|
| bible_data の変更 | **なし** |
| token.japanese の変更 | **なし** |
| Phase 4a 成果物の上書き | **なし** |
| 承認済みデータの変更 | **なし** |
| commit / push | **なし** |

---

## 9. Phase 4c 以降への注意事項

### 修正候補の持ち越し

| Strong | 件数 | 修正内容 | 状態 |
|--------|------|---------|------|
| G680 | 34 | "〜である" → "〜さわる" | ラベル確定済み |
| G567 | 6 | "〜である" → "〜避ける" | ラベル確定済み |
| G1573 | 6 | "〜である" → 候補検討中 | 設計判断要 |
| G4823 | 4 | "〜である" → 候補検討中 | 設計判断要 |
| G566 | 1 | "〜である" → 未確定 | HOLD |
| G5616 | 11 | "〜のように" → 検討 | 設計判断要 |
| G5228 | 1 | "〜のために" → 検討 | 設計判断要 |

これらの修正確認・台帳記録は Stage 4 実行フェーズの対象。Phase 4c では着手しない。

### Phase 4c の対象
- Group C：否定副詞（G3756 + G3361、2,494 tokens）
- Phase 4b で発見した問題は Phase 4c のスコープに影響しない

### 残 Group D の状態
- Phase 4a（G756: 84件 CONFIRMED_ERROR）+ Phase 4b（残 15 Strong: 293件確認）= Group D 全 377 tokens 監査完了
- Group D は以降の監査フェーズで再確認不要

---

## 10. Phase 4b 成果物一覧

| ファイル | 内容 | 状態 |
|--------|------|------|
| stage4-phase4b-group-b-audit.json | Group B 5 Strong 51 tokens 詳細データ | ✅ |
| stage4-phase4b-group-b-report.md | Group B 全件監査報告 | ✅ |
| stage4-phase4b-group-d-audit.json | Group D 15 Strong 293 tokens 詳細データ | ✅ |
| stage4-phase4b-group-d-report.md | Group D 全件監査報告 | ✅ |
| stage4-phase4b-summary.md | 本ファイル（Phase 4b 総括） | ✅ |
