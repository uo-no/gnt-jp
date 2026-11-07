# Stage 4 Phase 4l — データ品質問題報告

**Phase**: 4l  
**作成日**: 2026-11-02  
**性格**: READ ONLY。Bible JSON・台帳・成果物の変更なし。  
**根拠**: Phase 4l での直接調査（bible_data 全文検索）。

---

## 問題 1: G1163 / G1210 Strong 番号不整合

### 発見経緯

Phase 4l での bible_data 直接検索中に、**G1163 が既に 16件存在**することを確認。これは Phase 4i の `stage4-phase4i-g1210-deferred-issues.md` では「G1163 の存在確認が必要」と記載されており未調査だった点。

### 確認内容

```
bible_data 内の G1163 トークン: 16件
  - すべて ἔδει（V-IAI-3S、未完了過去形）
  - すべて japanese = "〜しなければならない"
```

**サンプル**（bible_data から直接確認）:

| ref | text | morph | strong | japanese |
|-----|------|-------|--------|---------|
| MAT 18:33!2 | ἔδει | V-IAI-3S | G1163 | 〜しなければならない |
| MAT 25:27!1 | ἔδει | V-IAI-3S | G1163 | 〜しなければならない |
| 2CO 2:3!12 | ἔδει | V-IAI-3S | G1163 | 〜しなければならない |

### 問題の構造

同じ「義務・必要性」の意味を持つ δεῖ / ἔδει の語形が、bible_data 内で2つの Strong に分かれている:

| 語形 | 時制 | Strong（bible_data） | japanese | 件数 |
|------|------|----------------------|---------|-----|
| ἔδει | 未完了過去 | **G1163** | 〜しなければならない | 16 |
| δεῖ, δεῖν, δέῃ, δέον, δέοντα | 現在 | **G1210** | 縛る | 85 |

### 影響範囲

- G1210 dei-necessity 85件の `japanese` を `〜しなければならない` に変更する場合、G1163 と同一の japanese を持ちながら異なる Strong 番号となる。
- lexicon が Strong 番号でひかれる設計の場合、G1210 に `縛る`（43件）と `〜しなければならない`（85件）の2種が混在する状態になる。
- `reading-lexicon.js` が Strong=G1210 で `縛る` を返す設計であれば、変更後の dei-necessity 85件には lexicon が誤ってヒットする可能性がある。

### 選択肢

| 選択肢 | 作業範囲 | 推奨度 |
|--------|---------|-------|
| **A: japanese のみ変更（G1210 維持）** | `token.japanese` 85件変更 | △（Short-term）|
| **B: Strong を G1163 に変更してから japanese を変更** | `token.strong` + `token.japanese` 85件変更 + lexicon確認 | ◎（Long-term）|
| **C: 設計確定後に対応（現状維持）** | なし（次 Phase 延期） | ○（安全）|

### 選択肢 B を選ぶ場合の前提確認

1. `reading-lexicon.js` が Strong 番号でどのように lexicon を引くかを確認
2. G1163 の lexicon エントリが存在するか確認
3. Strong 変更後に G1163 の lexicon が `〜しなければならない` を返すことを確認
4. regression baseline への影響（re-phase1/re-stageB）を事前評価

---

## 問題 2: G1210 deom-hold — δέομαι の Strong 誤割当

### 概要

bible_data に G1210 として登録されている 10件が、δέομαι（G1189 = 求める・願う・祈る）の語幹から活用した語形である。

今回の Phase 4l 対象（218件）には含まれないが、Phase 4l での調査で状況を確認した。

### 対象 10件

| ref | text | morph | current strong | 正しい Strong | current japanese |
|-----|------|-------|----------------|--------------|-----------------|
| MAT 9:38!1 | δεήθητε | V-AOM-2P | G1210 | G1189 | 縛る |
| LUK 5:12!23 | ἐδεήθη | V-API-3S | G1210 | G1189 | 縛る |
| LUK 8:38!1 | ἐδεῖτο | V-INI-3S | G1210 | G1189 | 縛る |
| LUK 9:40!2 | ἐδεήθην | V-API-1S | G1210 | G1189 | 縛る |
| LUK 10:2!13 | δεήθητε | V-AOM-2P | G1210 | G1189 | 縛る |
| LUK 22:32!3 | ἐδεήθην | V-API-1S | G1210 | G1189 | 縛る |
| ACT 8:24!6 | Δεήθητε | V-AOM-2P | G1210 | G1189 | 縛る |
| ACT 10:2!17 | δεόμενος | V-PNP-NSM | G1210 | G1189 | 縛る |
| ROM 1:10!6 | δεόμενος | V-PNP-NSM | G1210 | G1189 | 縛る |
| 2CO 5:20!11 | δεόμεθα | V-PNI-1P | G1210 | G1189 | 縛る |

### 問題の深刻度

この10件は dei-necessity（問題1）より深刻:
- `japanese = "縛る"` が意味的に完全に誤り（δέομαι = 「求める・願う・祈る」）
- `strong = G1210` も Strong's 標準と異なる（δέομαι の標準 Strong = G1189）

### G1189 の bible_data 状況

未確認（本 Phase 4l のスコープ外）。先決確認事項として記録する。

---

## 問題 3: G1210 deo-bind での Strong の正確性

### 概要

deo-bind 43件（δέω = 縛る）は現行 `japanese = "縛る"` が正確であるが、Strong=G1210 が δέω に対して本当に正しいかを確認した。

Strong's Exhaustive Concordance では δέω = G1210 ✓。これは正しい。

### 結論

deo-bind 43件: **問題なし**。

---

## まとめ

| 問題 | 件数 | 深刻度 | 先決事項 |
|------|-----|-------|---------|
| G1163/G1210 不整合（dei-necessity） | 85 | MEDIUM | Strong設計方針の決定 |
| G1210への δέομαι 誤割当（deom-hold） | 10 | HIGH | G1189 の存在確認・修正方針 |
| G1210 deo-bind（δέω） | 43 | なし | — |

**これらの問題はいずれも bible_data の `strong` フィールドに関するものである。** `token.japanese` の修正とは別に、`token.strong` の整合性確認が必要かどうかをユーザーが判断すること。
