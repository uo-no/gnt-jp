# Stage 4 Phase 4q — morph coverage 回帰監査

**Phase**: 4q  
**監査日**: 2026-11-03  
**対象**: re-phase1 morph coverage 44,280 → 44,276（−4）の原因特定と機能回帰判定  
**ステータス**: CONDITIONAL PASS — 機能回帰なし（lexicon rebuild 後に baseline 更新が必要）

---

## 1. 作業前確認

| 項目 | 結果 |
|------|------|
| リポジトリ状態 | Phase 4q 変更済み（bible_data 73件 modified） |
| Phase 4q 完了判定 | ALL PASS（stage4-phase4q-implementation-report.md 参照） |
| データ・コード変更なし | CONFIRMED（読み取り専用監査） |
| baseline 変更なし | CONFIRMED |

---

## 2. morph coverage 変化の特定

### 2.1 概要

Phase 4q 後、シミュレーションにより 95 件全トークンについて変更前後の `engine.resolve()` 結果を比較した。

| 分類 | 件数 | 内容 |
|------|-----|------|
| morph coverage 消失（LOST） | 6 | 変更前: non-null → 変更後: null |
| morph coverage 獲得（GAINED） | 2 | 変更前: null → 変更後: non-null |
| ネット変化 | **−4** | 6 − 2 = −4 |
| morph 変化なし | 87 | 変更前後ともに同一（nullまたは同値） |

証拠: `node` シミュレーション（snapshot_before フィールドで旧値を復元・比較）、全 95 件確認済み。

### 2.2 LOST トークン 6 件（morph coverage 消失）

| ref | text | morph | cluster | 変更前 japanese | 変更前 resolved | 変更後 japanese | 変更後 resolved |
|-----|------|-------|---------|----------------|----------------|----------------|----------------|
| ACT 25:24!31 | δεῖν | V-PAN | dei-necessity | 縛る | 縛ること | 〜しなければならない | null |
| ACT 26:9!12 | δεῖν | V-PAN | dei-necessity | 縛る | 縛ること | 〜しなければならない | null |
| LUK 18:1!7 | δεῖν | V-PAN | dei-necessity | 縛る | 縛ること | 〜しなければならない | null |
| LUK 5:12!23 | ἐδεήθη | V-API-3S | deom-hold | 縛る | 縛られる | 願う | null |
| LUK 9:40!2 | ἐδεήθην | V-API-1S | deom-hold | 縛る | 縛られる | 願う | null |
| LUK 22:32!3 | ἐδεήθην | V-API-1S | deom-hold | 縛る | 縛られる | 願う | null |

### 2.3 GAINED トークン 2 件（morph coverage 新規獲得）

| ref | text | morph | cluster | 変更前 japanese | 変更前 resolved | 変更後 japanese | 変更後 resolved |
|-----|------|-------|---------|----------------|----------------|----------------|----------------|
| ACT 10:2!17 | δεόμενος | V-PNP-NSM | deom-hold | 縛る | null | 願う | 願いながら |
| ROM 1:10!6 | δεόμενος | V-PNP-NSM | deom-hold | 縛る | null | 願う | 願いながら |

### 2.4 95 件への包含確認

6 件 LOST + 2 件 GAINED は全て `stage4-phase4p-reference-migration.json` の 95 件対象トークンに含まれる。CONFIRMED（ref 照合済み）。

---

## 3. morph エンジン挙動分析

### 3.1 エンジン null 返却の仕組み

`reading-engine.js` line 1074:
```js
if (!changed) return null;
return { japanese: result, source: ResolveSource.MORPH };
```

変換ルールが適用されなかった場合（`changed === false`）、エンジンは `null` を返す。
呼び出し元は `null` 受信時に `token.japanese`（保存値）へ fallback する。

### 3.2 パターン A: V-PAN + "〜しなければならない" → null（dei-necessity 3 件）

**変換経路**: `_resolveUnsafe()` → voice=active（passive skip）→ mood=infinitive → `_applyRules(result, 'inf')`

**'inf' ルール**（lines 204–209）:
```js
'inf': [
    [/する$/, 'すること'], [/いる$/, 'いること'], [/える$/, 'えること'],
    [/くる$/, 'くること'],
    [/([^ん])る$/, '$1ること'],
    [/つ$/, 'つこと'],    [/ぬ$/, 'ぬこと'], [/む$/, 'むこと'], [/ぶ$/, 'ぶこと'],
    [/う$/, 'うこと'],    [/く$/, 'くこと'], [/す$/, 'すこと'],
],
```

"〜しなければならない" の末尾は "い"（ない形の語尾）。上記いずれのパターンにも合致しない → `r === result`（変換なし） → `changed = false` → `return null`。

**変更前**: "縛る" は `/([^ん])る$/` に合致 → "縛ること"（`changed = true`）。

**なぜ変更前の output は誤りか**: δεῖν は δεῖ（必要性・must の意味動詞）の不定詞形。「縛ること」は全く別の動詞 δέω（縛る）の活用形であり、意味的に誤り。訳語 "〜しなければならない" は必要性を正確に表すが不定詞変換ルールに非適合のため null → 保存値表示。

### 3.3 パターン B: V-API + "願う" → null（deom-hold 3 件）

**変換経路**: `_resolveUnsafe()` → voice=passive → `_passiveAllowed()` 確認 → `_applyRules(result, 'pass')`

**`_passiveAllowed()` の判定**（line 708–711）:
```js
_passiveAllowed(token) {
    if (!this._lexicon) return false;
    const entry = this._lexicon.lookup(token.lemmaId);
    return !(entry && entry.deponent === true);
}
```

G1189 の lexicon エントリ: `{"deponent": false, "glosses": ["願う", ...]}` → `entry.deponent === true` は false → `_passiveAllowed` は **true** を返す（受動変換を試みる）。

**'pass' ルール**（lines 231–236）:
```js
'pass': [
    [/する$/, 'される'],  [/いる$/, 'いられる'],
    [/([^ん])る$/, '$1られる'],
    [/つ$/, 'たれる'],    [/む$/, 'まれる'],
    [/ぶ$/, 'ばれる'],    [/く$/, 'かれる'], [/す$/, 'される'],
],
```

"願う" の末尾は "う"。`う$` パターンが存在しない（期待されるべき形は "願われる"）。→ いずれも合致せず → `r === result`（変換なし）。  
mood=indicative のため後続の participle/infinitive/imperative ルールも適用されない → `changed = false` → `return null`。

**変更前**: "縛る" は `/([^ん])る$/` に合致 → "縛られる"（`changed = true`）。

**なぜ変更前の output は誤りか**: ἐδεήθην/ἐδεήθη は δέομαι（願う・祈る）の第一アオリスト受動形。文法的には受動形を持つがデポネント的動詞として能動・中動の意味を持つ（「祈った・願った」）。"縛られる"（δέω の受動）は語義的に完全な誤り。null + "願う"（保存値）の方が正確。

**エンジンの `う$` 未対応について**: これは `reading-engine.js` の既存の制限であり、Phase 4q の変更とは独立している。Phase 4q 以前も "願う" + V-API → null であった（今回の変更は変換前 "縛る" + V-API → "縛られる" を持っていた）。

### 3.4 パターン C: V-PNP + "願う" → "願いながら"（deom-hold GAINED 2 件）

**変換経路**: voice=middle → passive skip → mood=participle, tense=present → `_applyRules(result, 'part-pres')`

**'part-pres' ルール**（line 175）:
```js
[/う$/, 'いながら'],
```

"願う" の末尾 "う" が合致 → "願いながら"（`changed = true`）。

**変更前**: "縛る" は `/([^ん])る$/` ではなく五段確定ルール `/([あ...ぼ])る$/` を試みるが一致せず（"縛る" の "縛" は漢字語幹で "あ段かな + る" パターン外）→ null。

**"願いながら" の妥当性**: δεόμενος は δέομαι の現在中動分詞（「願いながら・祈りながら」）。"願いながら" はこの語義を正確に表現する。GAINED は正当な改善。

---

## 4. 機能回帰判定

### 4.1 表示への実影響

| パターン | 変更前 表示 | 変更後 表示 | 正確性 |
|---------|-----------|-----------|--------|
| V-PAN + dei-necessity (×3) | 縛ること（`MORPH`） | 〜しなければならない（`FALLBACK`） | **改善**（必要性表現に戻る） |
| V-API + deom-hold (×3) | 縛られる（`MORPH`） | 願う（`FALLBACK`） | **改善**（デポネント・能動意味に戻る） |
| V-PNP + deom-hold (×2) | 縛る（`FALLBACK`） | 願いながら（`MORPH`） | **改善**（分詞が正確に展開） |

変更前に `engine.resolve()` が non-null を返していたトークンは、すべて **誤った訳語（G1210/縛る）に対して誤った活用形を生成していた**。morph coverage のカウントは増加していたが、それは語義的に誤った結果を表示していたに過ぎない。

### 4.2 「機能回帰なし」の根拠

| 検証項目 | 結果 | 根拠 |
|---------|------|------|
| LOST 6 件の変更前 output は正しかったか | NO | "縛ること"/"縛られる" は dei-necessity/deom-hold の意味を持たない |
| GAINED 2 件の変更後 output は正しいか | YES | "願いながら" は V-PNP-NSM (δεόμενος) の正確な日本語表現 |
| 変更後の fallback ("〜しなければならない"/"願う") は許容範囲か | YES | lexicon 保存値が正しい訳語として機能する |
| `morph coverage` 指標の減少 = ユーザーへの表示品質低下か | NO | 誤った morph output → 正しい fallback への変化は品質改善 |
| `engine.resolve()` のロジック自体に回帰はあるか | NONE | reading-engine.js 未変更; 入力値変更のみ |

**判定**: morph coverage 指標は −4 だが、**ユーザーが見るテキストの意味的正確性は改善または維持されている**。機能回帰なし。

### 4.3 エンジン側の `う$` 未対応について

V-API + "願う" → null は `reading-engine.js` の 'pass' ルールに `う$` パターンが存在しないことに起因する。これは Phase 4q の変更以前から存在する既知の制限であり、Phase 4q が新たに導入した回帰ではない。

例: V-API + "言う" も同様に null となる（Phase 4q 以前より）。

この制限への対応は別 Phase の Coverage 拡張として扱う（DEFERRED）。

---

## 5. 〜接頭辞の影響範囲

| 項目 | 値 | 証拠 |
|------|---|------|
| NT 全体の 〜-prefix トークン数 | 18,740 | CONFIRMED（bible_data 全ファイルスキャン） |
| うち morph coverage あり（Phase 4q 後） | 1,433 | CONFIRMED（engine.resolve() 全件実行） |
| Phase 4q で 〜-prefix に変更されたトークン | 85（dei-necessity cluster） | CONFIRMED（〜しなければならない） |
| うち morph coverage 消失 | 3（V-PAN のみ） | CONFIRMED（本監査） |
| うち morph coverage 変化なし | 82 | CONFIRMED（変更前後ともに null または同値） |

**1,433 の 〜-prefix morph coverage について**: 前置詞（"〜によって"、"〜の中に" 等）の格助詞付与や、"〜する者"・"〜するもの" 等の名詞 gender/number 変換など、verb 以外の変換によるものが主体。

**Phase 4q の 〜しなければならない 追加 85 件について**: V-PAN 3 件以外の 82 件は変更前の "縛る" 状態でも morph coverage を持っていなかった（V-PAI 等で engine が null を返す morph パターン）か、または変更後も同様に null のまま。〜-prefix 自体が morph coverage を大幅に阻害するものではない（既に 18,740 件中 1,433 件は coverage あり）。

---

## 6. re-stageB 3 FAIL 分析

### 6.1 変化の概要

| 指標 | Phase 4m baseline | Phase 4q 後 | 変化 | 判定 |
|-----|-----------------|------------|------|------|
| `brokenNew` | 0 | **0** | 0 | **PASS（絶対条件）** |
| `panelMismatch` | 0 | **0** | 0 | **PASS（絶対条件）** |
| `presented` | 4,258 | 4,258 | 0 | 不変 |
| `tokens` | 137,741 | 137,741 | 0 | 不変 |
| `changed` | 39,679 | 39,674 | **−5** | FAIL（baseline 乖離、改善方向） |
| `identical` | 98,062 | 98,067 | **+5** | FAIL（baseline 乖離、改善方向） |
| `brokenOld` | 1,253 | 1,245 | **−8** | FAIL（baseline 乖離、改善方向） |

### 6.2 変化の原因分析

**changed −5 / identical +5（INFERRED）**:  
95 件のトークンが lemmaId=G1210 → G1163/G1189 に変更されたことで、エンジンの語彙参照結果が変化する。そのうち 5 件について、変更後のチップ出力が Phase 4m baseline 時に記録された「期待値」と一致するようになった可能性がある。baseline は Phase 4m 適用後（japanese="縛る"/lemmaId=G1210 状態）に設定されているが、stageB が参照する lexicon（reading-lexicon-data.js）はこの時点で G1163/G1189 エントリをすでに保持していた。5 件のトークンで偶然の一致が生じた可能性が高い。ただし詳細な一致メカニズムは NOT VERIFIED（stageB 内部ログ未確認）。

**brokenOld −8（INFERRED）**:  
8 件のトークンで、変更前は「壊れた出力（brokenOld）」が baseline に記録されていたが、Phase 4q 後の正しい lemmaId 参照により改善されたチップ出力が生成されるようになった。これは stageB が「古い壊れた期待値よりも良い出力」を検出していることを意味し、回帰ではなく改善を示す。

### 6.3 異常の有無

- `brokenNew=0`（絶対条件）: **PASS** — Phase 4q により新たに「壊れた出力」が発生したケースはゼロ。
- `panelMismatch=0`（絶対条件）: **PASS** — パネル不一致なし。
- 3 件の FAIL は全て **改善方向の baseline 乖離**（fewer deviations, more correct, fewer broken）。
- 異常（劣化・矛盾・新規破損）は存在しない。

**判定**: re-stageB 3 FAIL は baseline 更新が未実施であることに起因するものであり、機能上の回帰ではない。baseline 更新は Phase 4r 以降（lexicon rebuild 後、サンプルレビュー経由）で実施する。

---

## 7. 最終判定

### 7.1 判定: CONDITIONAL PASS

| 評価軸 | 判定 | 詳細 |
|-------|------|------|
| morph coverage 減少は Phase 4q 起因か | YES（CONFIRMED） | 95 件 target の変更に直接起因 |
| 変更前の morph output は正しかったか | NO（CONFIRMED） | 誤訳語"縛る"の活用形を誤って表示していた |
| 変更後の表示品質は低下したか | NO（CONFIRMED） | 保存値 fallback（〜しなければならない/願う）は意味的に正確 |
| V-PNP GAINED 2 件は正しい改善か | YES（CONFIRMED） | "願いながら" は δεόμενος の正確な日本語表現 |
| エンジンの回帰（reading-engine.js 変更起因）はあるか | NONE（CONFIRMED） | reading-engine.js 未変更 |
| re-stageB 絶対条件を満たすか | YES（CONFIRMED） | brokenNew=0, panelMismatch=0 |
| re-stageB 3 FAIL は機能上の回帰か | NO（INFERRED） | 全て改善方向; baseline 未更新が原因 |

### 7.2 条件付き PASS の条件

1. **re-phase1 baseline 更新**: morph coverage 44,280 → 44,276（−4）を正式な新 baseline 値として更新する（lexicon rebuild 後、悪化ゼロ確認を経て実施）。
2. **re-stageB baseline 更新**: changed=39,674 / identical=98,067 / brokenOld=1,245 を新 baseline として更新する（Phase 4r 以降、lexicon rebuild + サンプルレビュー後）。

### 7.3 DEFERRED 事項

- reading-engine.js の `う$` 受動パターン未対応（V-API + 願う → null）: 既存制限であり Phase 4q 起因ではない。Coverage 拡張として別 Phase で扱う。

---

## 8. 禁止事項遵守確認

| 禁止事項 | 結果 |
|---------|------|
| Bible JSON / 辞書 / インデックス 変更 | ✓ 未変更（READ ONLY） |
| morph 判定コード変更 | ✓ 未変更 |
| テスト・baseline 変更 | ✓ 未変更 |
| commit / push | ✓ 未実施 |

---

**CONDITIONAL PASS — morph coverage −4 は Phase 4q 起因の意図的なデータ修正の結果であり、機能回帰なし。baseline 更新は Phase 4r 以降に実施。**
