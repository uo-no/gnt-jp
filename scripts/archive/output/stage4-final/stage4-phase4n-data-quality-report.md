# Stage 4 Phase 4n — G1210 / G1163 / G1189 データ品質監査

**Phase**: 4n  
**作成日**: 2026-11-02  
**性格**: READ ONLY 監査。Bible JSON・辞書・形態データの変更なし。  
**調査対象**: G1210（138件）/ G1163（16件）/ G1189（12件）= 166件

---

## 判定

**AUDIT COMPLETE — READY FOR HUMAN DECISION**

---

## 1. 作業前確認

| 項目 | 状態 |
|------|------|
| リポジトリ | `/Users/373da/Claude/開発室/gnt-jp` |
| ブランチ | `data/ja1955-nt-approved-132` |
| HEAD SHA | `4acb52bc` |
| origin との同期 | 2 commits ahead（Phase 4k の 2 コミット、未 push） |
| 変更状態 | Phase 4m bible_data 72ファイル・re-stageB未コミット。今回変更なし。 |
| Phase 4l成果物 | `stage4-phase4l-*.{json,md}` 3件 確認済み |
| Phase 4m成果物 | `stage4-phase4m-*.{json,md}` 3件 確認済み |
| 既存監査台帳 | `stage4-phase4h-full-population-audit.json`・`stage4-phase4i-g1210-deferred-issues.md` 確認済み |

---

## 2. 全体サマリー

| Strong | 全件数 | DATA_CORRECT | STRONG+LEMMA_MISMATCH | 主な問題 |
|--------|-------|-------------|----------------------|---------|
| G1163 | 16 | **16** | 0 | なし |
| G1210 | 138 | 43（deo-bind）| **95**（dei-necessity 85 + deom-hold 10）| Strong/lemma 誤登録 |
| G1189 | 12 | **12** | 0 | なし |
| **合計** | **166** | **71** | **95** | |

---

## 3. G1163 — 16件の調査結果

### 判定：全16件 DATA_CORRECT

| ref | text | lemma | morph | japanese | 判定 |
|-----|------|-------|-------|---------|------|
| MAT 18:33!2 | ἔδει | δεῖ | V-IAI-3S | 〜しなければならない | DATA_CORRECT |
| MAT 23:23!32 | ἔδει | δεῖ | V-IAI-3S | 〜しなければならない | DATA_CORRECT |
| MAT 25:27!1 | ἔδει | δεῖ | V-IAI-3S | 〜しなければならない | DATA_CORRECT |
| LUK 11:42!27 | ἔδει | δεῖ | V-IAI-3S | 〜しなければならない | DATA_CORRECT |
| LUK 13:16!16 | ἔδει | δεῖ | V-IAI-3S | 〜しなければならない | DATA_CORRECT |
| LUK 15:32!5 | ἔδει | δεῖ | V-IAI-3S | 〜しなければならない | DATA_CORRECT |
| LUK 22:7!8 | ἔδει | δεῖ | V-IAI-3S | 〜しなければならない | DATA_CORRECT |
| LUK 24:26!3 | ἔδει | δεῖ | V-IAI-3S | 〜しなければならない | DATA_CORRECT |
| JHN 4:4!1 | ἔδει | δεῖ | V-IAI-3S | 〜しなければならない | DATA_CORRECT |
| ACT 1:16!3 | ἔδει | δεῖ | V-IAI-3S | 〜しなければならない | DATA_CORRECT |
| ACT 17:3!7 | ἔδει | δεῖ | V-IAI-3S | 〜しなければならない | DATA_CORRECT |
| ACT 24:19!8 | ἔδει | δεῖ | V-IAI-3S | 〜しなければならない | DATA_CORRECT |
| ACT 27:21!13 | Ἔδει | δεῖ | V-IAI-3S | 〜しなければならない | DATA_CORRECT |
| ROM 1:27!29 | ἔδει | δεῖ | V-IAI-3S | 〜しなければならない | DATA_CORRECT |
| 2CO 2:3!12 | ἔδει | δεῖ | V-IAI-3S | 〜しなければならない | DATA_CORRECT |
| HEB 9:26!2 | ἔδει | δεῖ | V-IAI-3S | 〜しなければならない | DATA_CORRECT |

**確認内容:**
- text: 全件 ἔδει（未完了過去形）
- morph: 全件 V-IAI-3S（未完了・能動・直説法・3人称単数）— δεῖ の未完了として正確
- lemma: 全件 δεῖ — 正しい
- strong: 全件 G1163 — 正しい
- japanese: 全件「〜しなければならない」— 語義上正しい
- 辞書（lexicon-lite.json）G1163 エントリ: headword=δεῖ、count=16、gloss_ja="〜しなければならない" — 一致

### 問題: なし

---

## 4. G1210 — 138件の調査結果

### 4.1 deo-bind クラスター（43件）— DATA_CORRECT

δέω（縛る）の正当な形態。lemma=δέω・strong=G1210・japanese=縛る はすべて正しい。

**語形一覧（43件）:**
δέδεσαι(1)・δέδεται(3)・δεδεμένους(4)・δῆσαι(2)・δεδεμένος(4)・δήσας(1)・δήσουσιν(1)・
δεθῆναι(2)・δεδεκώς(1)・δεδεμένον(6)・δέδεμαι(1)・ἔδησαν(2)・ἔδησεν(4)・δήσῃ(2)・
δήσατε(1)・δήσῃς(1)・δήσητε(1)・δεδεμένα(1)・δεδεμένην(1)・Δήσαντες(1)・
δήσαντες(2)・δεδέσθαι(1)

### 4.2 dei-necessity クラスター（85件）— STRONG_MISMATCH + LEMMA_MISMATCH

**根拠となる token フィールド（1CO 8:2!9 の全フィールドから確認）:**
```
text:    δεῖ
english: ought           ← 義務・必要の意味（G1210 δέω="to bind" と矛盾）
gloss:   it is necessary ← 義務・必要の意味（G1210 δέω="to bind" と矛盾）
lemma:   δέω             ← WRONG（δεῖ であるべき）
strong:  G1210           ← WRONG（G1163 であるべき）
domain:  071004 071005   ← 義務・必要ドメイン（δέω の主ドメイン 18002 等と矛盾）
ln:      71.21 71.34     ← 義務・必要ドメイン
```

bible_data の `english` および `gloss` フィールド自身が、このトークンの語義が "it is necessary" であることを明示している。これは G1210（δέω = "to bind"）ではなく G1163（δεῖ = "it is necessary"）に属すべき語義。

**語形分布（85件）:**

| text | 件数 | morph | 語彙的意味 |
|------|-----|-------|-----------|
| δεῖ | 74 | V-PAI-3S | 現在・直説法（非人称）|
| Δεῖ | 3 | V-PAI-3S | 同上（文頭大文字）|
| δεῖν | 3 | V-PAN | 現在・不定詞 |
| δέῃ | 2 | V-PAS-3S | 現在・接続法 |
| δέον | 2 | V-PAP-NSN | 現在・分詞（n.sg.nom）|
| δέοντα | 1 | V-PAP-APN | 現在・分詞（n.pl.acc）|
| **計** | **85** | | |

**全85件の判定: STRONG_MISMATCH（G1210→G1163）+ LEMMA_MISMATCH（δέω→δεῖ）**

詳細 ref 一覧は `stage4-phase4n-token-audit.json` 参照。

### 4.3 deom-hold クラスター（10件）— STRONG_MISMATCH + LEMMA_MISMATCH

**δέομαι の語形が G1210 に登録されている（lemma=δέω は誤り）。**

| ref | text | morph | current strong | current lemma | 正しい strong | 正しい lemma |
|-----|------|-------|----------------|--------------|--------------|------------|
| MAT 9:38!1 | δεήθητε | V-AOM-2P | G1210 | δέω | G1189 | δέομαι |
| LUK 5:12!23 | ἐδεήθη | V-API-3S | G1210 | δέω | G1189 | δέομαι |
| LUK 8:38!1 | ἐδεῖτο | V-INI-3S | G1210 | δέω | G1189 | δέομαι |
| LUK 9:40!2 | ἐδεήθην | V-API-1S | G1210 | δέω | G1189 | δέομαι |
| LUK 10:2!13 | δεήθητε | V-AOM-2P | G1210 | δέω | G1189 | δέομαι |
| LUK 22:32!3 | ἐδεήθην | V-API-1S | G1210 | δέω | G1189 | δέομαい |
| ACT 8:24!6 | Δεήθητε | V-AOM-2P | G1210 | δέω | G1189 | δέομαι |
| ACT 10:2!17 | δεόμενος | V-PNP-NSM | G1210 | δέω | G1189 | δέομαι |
| ROM 1:10!6 | δεόμενος | V-PNP-NSM | G1210 | δέω | G1189 | δέομαι |
| 2CO 5:20!11 | δεόμεθα | V-PNI-1P | G1210 | δέω | G1189 | δέομαι |

これら10件はG1189に正しく登録された12件と同一語（δέομαι）の語形であり、bible_dataのソースデータでの誤割当と判断される。

---

## 5. G1189 — 12件の調査結果

### 判定：全12件 DATA_CORRECT

| ref | text | lemma | morph | japanese | 判定 |
|-----|------|-------|-------|---------|------|
| LUK 8:28!22 | δέομαί | δέομαι | V-PNI-1S | 願う | DATA_CORRECT |
| LUK 9:38!10 | δέομαί | δέομαι | V-PNI-1S | 願う | DATA_CORRECT |
| LUK 21:36!6 | δεόμενοι | δέομαι | V-PNP-NPM | 願う | DATA_CORRECT |
| ACT 4:31!2 | δεηθέντων | δέομαι | V-AOP-GPM | 願う | DATA_CORRECT |
| ACT 8:22!9 | δεήθητι | δέομαι | V-AOM-2S | 願う | DATA_CORRECT |
| ACT 8:34!8 | Δέομαί | δέομαι | V-PNI-1S | 願う | DATA_CORRECT |
| ACT 21:39!17 | δέομαι | δέομαι | V-PNI-1S | 願う | DATA_CORRECT |
| ACT 26:3!14 | δέομαι | δέομαι | V-PNI-1S | 願う | DATA_CORRECT |
| GAL 4:12!9 | δέομαι | δέομαι | V-PNI-1S | 願う | DATA_CORRECT |
| 2CO 8:4!4 | δεόμενοι | δέομαι | V-PNP-NPM | 願う | DATA_CORRECT |
| 2CO 10:2!1 | δέομαι | δέομαι | V-PNI-1S | 願う | DATA_CORRECT |
| 1TH 3:10!5 | δεόμενοι | δέομαι | V-PNP-NPM | 願う | DATA_CORRECT |

### 付記: lexicon-lite.json G1189 エントリの gloss_ja

G1189 の `gloss_ja = "必要とする"` は不正確（lexicon-lite.json の記述の問題）。reading-ln-gloss-data.js では "願う" と記載。bible_data の japanese は "願う" であり正しい。lexicon_ja の不一致は今回のスコープ外として記録する。

---

## 6. 参照データの照合

### lexicon-lite.json との照合

| Strong | headword | count | gloss_ja | bible_data件数 | 一致 |
|--------|---------|-------|---------|--------------|------|
| G1163 | δεῖ | 16 | 〜しなければならない | 16 | ✓ |
| G1210 | δέω | 138 | 縛る、結ぶ | 138 | ✓（count一致）|
| G1189 | δέομαι | 12 | 必要とする（要修正） | 12 | ✓（count一致）|

**注意**: G1210の lexicon-lite.json には `gloss = "It behooves"` と記載されている（δεῖ の意味）。これは bible_data に δεῖ 形態が G1210 に含まれることを反映したものと考えられる。G1210 の本来の gloss は "to bind"。

### reading-ln-gloss-data.js との照合

| Strong | domain | gloss |
|--------|--------|-------|
| G1163 | 71.21 / 71.34 | 〜しなければならない |
| G1210 | 71.21 / 71.34 | **縛る**（義務ドメインを「縛る」とマップ — 不整合）|
| G1189 | 33.17 | 願う |

G1210 の reading-ln-gloss が義務ドメイン（71.21/71.34）を「縛る」にマップしているのは、G1163 と G1210 が同じドメインを共有している現状の副作用。dei-necessity 85件が G1163 に正しく移行されれば、この不整合も解消される。

---

## 7. 7つの問いへの回答

### Q1. G1210の85件は、本当にG1210 δέωなのか。

**NO。** これらは δεῖ（義務・必要を表す非人称動詞）の形態（δεῖ/δεῖν/δέῃ/δέον/δέοντα）であり、G1210（δέω = 縛る）とは別の語。bible_data の token 自身の `gloss = "it is necessary"` / `english = "ought"` フィールドがこの事実を内部的に証明している。標準 Strong's Concordance は δεῖ を G1163 に割り当てる。

### Q2. G1163の16件は、本当にG1163として登録すべき語なのか。

**YES。** これらは ἔδει（δεῖ の未完了形）であり、G1163（δεῖ）に正しく登録されている。lemma=δεῖ・morph=V-IAI-3S・japanese=〜しなければならない はすべて正確。

### Q3. G1210とG1163は、同じlemmaの異なるStrong番号なのか、それともデータ上の誤登録なのか。

**データ上の誤登録。** G1210（δέω = 縛る）と G1163（δεῖ = 〜しなければならない）は別の動詞。dei-necessity 85件（δεῖ 現在形）が G1210 に登録されているのは、ソースデータ（形態解析タグ付きコーパス）における誤割当の継承。ἔδει（未完了形）だけ G1163 に正しく登録され、現在形以降が G1210 に誤割当されている状態。

### Q4. G1210の85件を「〜しなければならない」に変更することは、語彙上妥当か。

**語彙上は妥当。** δεῖ 形態の語義は「〜しなければならない」であり、G1163 の `gloss_ja` と一致する。ただし、**strong=G1210・lemma=δέω のまま japanese のみを変更すると、Strong 番号と日本語訳の間に構造的矛盾が残る**（同一 Strong 番号 G1210 が「縛る」43件と「〜しなければならない」85件の2種を含む）。

### Q5. Strong番号を変更すべきなら、どのrefをどの番号にするべきか。

以下の移行を推奨する：

| 対象 | 件数 | current strong | current lemma | correct strong | correct lemma |
|------|-----|----------------|--------------|----------------|--------------|
| dei-necessity（δεῖ形態） | 85 | G1210 | δέω | **G1163** | **δεῖ** |
| deom-hold（δέομαι形態） | 10 | G1210 | δέω | **G1189** | **δέομαι** |
| deo-bind（δέω形態） | 43 | G1210 | δέω | G1210（変更不要）| δέω |

**根拠**: bible_data token の `english`・`gloss` フィールド（データ内部証拠）、標準 Strong's Exhaustive Concordance の番号体系、lexicon-lite.json の headword 定義。

**dei-necessity 85件の ref 全件**: `stage4-phase4n-token-audit.json` の cluster='dei-necessity' を参照。

### Q6. G1189の問題は何で、影響するトークンは何件か。

G1189 自体（12件）に問題はない。問題は **G1210 に誤登録された δέομαι 形態 10件**（deom-hold）が存在すること。

| 区分 | 件数 | 状態 |
|------|-----|------|
| G1189 正常 | 12 | DATA_CORRECT（lemma=δέομαι、japanese=願う）|
| G1210 deom-hold | 10 | STRONG_MISMATCH+LEMMA_MISMATCH（→G1189/δέομαι が正しい）|
| δέομαι 全体 | **22** | |

### Q7. 今回の調査だけで確定できる事項と、追加確認が必要な事項は何か。

**確定できる事項（bible_data の内部証拠のみで証明可能）:**

| 事項 | 根拠 |
|------|------|
| dei-necessity 85件: text=δεῖ形態（義務・必要） | token.text, token.gloss, token.english |
| dei-necessity 85件: lemma=δέω は誤り | lemma と text の語形が一致しない |
| dei-necessity 85件: G1163 が正しい Strong | token.gloss="it is necessary" + lexicon G1163 headword=δεῖ |
| G1163 16件: DATA_CORRECT | text=ἔδει, lemma=δεῖ, morph=V-IAI-3S は整合 |
| deom-hold 10件: δέομαι 形態 | token.text が δέομαι の活用形 |
| deom-hold 10件: G1189 が正しい Strong | G1189 に同一形態の正常登録あり（lemma=δέομαι）|
| G1189 12件: DATA_CORRECT | lemma/strong/japanese すべて整合 |
| deo-bind 43件: DATA_CORRECT | δέω の正規活用形 |

**追加確認が必要な事項（実装前に確認すること）:**

| 事項 | 理由 |
|------|------|
| reading-engine.js での Strong/lemma の使われ方 | G1163 移行時の engine 挙動への影響を評価するため |
| lexicon-lite.json の count フィールド更新要否 | G1163: 16→101、G1210: 138→43、G1189: 12→22 になる |
| lexicon の rebuild が必要か | build:lexicon スクリプトの動作確認 |
| G1163 gloss_ja の `contexts` フィールド更新要否 | 現在は MAT/MRK/LUK/2CO/ROM のみ記載 |
| reading-ln-gloss-data.js の G1210 ドメインマッピング修正要否 | 71.21/71.34 が「縛る」にマップされている問題 |
| re-phase1 / re-stageB への影響 | strong 変更は morph engine の分岐に影響する可能性 |

---

## 8. 問題の種類と件数

| 問題分類 | 件数 | 対象 |
|---------|-----|------|
| STRONG_MISMATCH | 95 | dei-necessity 85件（G1210→G1163）+ deom-hold 10件（G1210→G1189）|
| LEMMA_MISMATCH | 95 | 同上（δέω→δεῖ または δέω→δέομαι）|
| DATA_CORRECT | 71 | deo-bind 43件 + G1163 16件 + G1189 12件 |
| JAPANESE_GLOSS_ISSUE | 85 | dei-necessity 85件（縛る→〜しなければならない が語義上正しい）|
| JAPANESE_CORRECT | 81 | G1163 16件（〜しなければならない）+ G1189 12件（願う）+ deo-bind 43件（縛る）|

---

## 9. 推奨する次の作業

### Phase 4o-A（推奨）: dei-necessity 85件の Strong + lemma 修正

**前提確認が必要な事項をすべて確認してから実施すること。**

1. reading-engine.js での Strong/lemma 参照箇所の洗い出し
2. lexicon-lite.json の count フィールド更新スクリプトの確認
3. lexicon rebuild の要否確認
4. 回帰テストへの影響評価（特に re-phase1 / re-stageB）
5. G1163 gloss_ja の contexts 更新
6. G1210 reading-ln-gloss ドメインマッピングの修正

**変更範囲**: bible_data token の `strong` + `lemma` 85件、lexicon count、lexicon contexts、reading-ln-gloss G1210 ドメインマップ。`japanese` の変更は Strong/lemma 修正と同時か直後に実施可。

### Phase 4o-B（推奨）: deom-hold 10件の Strong + lemma 修正

dei-necessity と同様の前提確認後、G1210→G1189・lemma=δέω→δέομαι の修正。japanese="縛る"→"願う" も同時変更。

### 現状維持の選択肢（Option C）

dai-necessity 85件の `japanese` のみ変更（strong/lemma は G1210/δέω のまま）も技術的には可能。ただし：
- 同一 Strong G1210 が「縛る」43件と「〜しなければならない」85件の混在になる
- lexicon の G1210 headword=δέω と japanese=〜しなければならない の矛盾が残る
- 将来の Strong 番号利用機能の誤動作リスクが残る

---

## 成果物

| ファイル | 内容 |
|---------|------|
| `stage4-phase4n-data-quality-report.md` | 本報告書 |
| `stage4-phase4n-token-audit.json` | G1210・G1163・G1189 全166件の ref 別判定 |
| `stage4-phase4n-strong-lemma-comparison.json` | G1210 dei-necessity + G1163 計101件の比較 |
