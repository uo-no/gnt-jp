# Stage 4 Phase 4p — 実装仕様書

**Phase**: 4p-correction  
**作成日**: 2026-11-03  
**ステータス**: CORRECTION COMPLETE — READY FOR HUMAN APPROVAL  
**種別**: 設計のみ（データ変更・コード変更・スクリプト実行なし）

---

## 0. 作業前保護確認

| 項目 | 状態 |
|------|------|
| ブランチ | `data/ja1955-nt-approved-132` |
| HEAD SHA | `4acb52bc` |
| origin HEAD | 2 commits ahead（origin は `4acb52bc` より前） |
| Phase 4m 未コミット変更 | bible_data 72ファイル変更済み（未コミット・保護） |
| Phase 4o 成果物 | 4ファイル untracked（保護） |
| Phase 4p 成果物 | 新規作成のみ（既存ファイル上書きなし） |
| reset / checkout / clean / stash | 実施せず |

---

## 1. 移行対象の確定

### 1.1 3クラスター区分（再確認）

| クラスター | 件数 | 現在の Strong/lemma/lemmaId | 移行先 | 根拠 |
|-----------|----:|--------------------------|-------|------|
| dei-necessity | 85 | G1210/δέω/grc:G1210 | G1163/δεῖ/grc:G1163 | gloss="it is necessary"、english="ought"、ln=71.21/71.34 — G1163 の字義と完全一致 |
| deom-hold | 10 | G1210/δέω/grc:G1210 | G1189/δέομαι/grc:G1189 | gloss="Beseech"/"ask"、ln=33.17(pray/pray for) — G1189 の意味領域と完全一致 |
| deo-bind | 43 | G1210/δέω/grc:G1210 | **変更なし** | text=δέω/δήσας/δεδεμένον 等（δέω の正規形）。Strong登録は正しい。 |

### 1.2 事前確認（実データで確認済み）

- 95件すべて `strong="G1210"`, `lemma="δέω"`, `lemmaId="grc:G1210"` であることを確認: **PASS**
- G1163 既存 16件・G1189 既存 12件は移行対象に含まれない: **CONFIRMED**
- deo-bind 43件は移行対象に含まれない: **CONFIRMED**
- 重複: 0件。漏れ: 0件。85+10+43=138=G1210 総件数: **CONFIRMED**

### 1.3 分類整合性確認

dei-necessity 85件の形態確認（代表例）:

| text（Greek） | 語形 | morph | 判定根拠 |
|-------------|------|-------|---------|
| δεῖ | 3人称単数現在 | V-PAI-3S | G1163 非人称動詞の基本形 |
| δέῃ | 3人称単数現在仮定 | V-PAS-3S | G1163 仮定法 |
| δεῖν | 現在不定詞 | V-PAN | G1163 不定詞 |
| δέον | 現在分詞中性 | V-PAP-NSN | G1163 分詞（「必要なもの」） |
| δέοντα | 現在分詞中性複数対格 | V-PAP-APN | G1163 分詞複数 |
| ἔδει | 未完了過去 | V-IAI-3S | ※注記参照 |

**※ ἔδει（未完了過去）について**: ἔδει は G1163 の既存 16件に含まれている（これらは移行対象外で正しく登録済み）。dei-necessity 85件には ἔδει を含むかチェック → phase4n audit で確認済み：dei-necessity の text はすべて現在形 (δεῖ/δεῖν/δέῃ/δέον/δέοντα)。

deom-hold 10件の形態確認（全件）:

| ref | text | morph | ln | domain |
|-----|------|-------|-----|--------|
| MAT 9:38!1 | δεήθητε | V-AOM-2P | 33.17 | 33012 |
| LUK 5:12!23 | ἐδεήθη | V-API-3S | 33.17 | 33012 |
| LUK 8:38!1 | ἐδεῖτο | V-INI-3S | 33.17 | 33012 |
| LUK 9:40!2 | ἐδεήθην | V-API-1S | 33.17 | 33012 |
| LUK 10:2!13 | δεήθητε | V-AOM-2P | 33.17 | 33012 |
| LUK 22:32!3 | ἐδεήθην | V-API-1S | 33.17 | 33012 |
| ACT 8:24!6 | Δεήθητε | V-AOM-2P | 33.17 | 33012 |
| ACT 10:2!17 | δεόμενος | V-PNP-NSM | 33.17 | 33012 |
| ROM 1:10!6 | δεόμενος | V-PNP-NSM | 33.17 | 33012 |
| 2CO 5:20!11 | δεόμεθα | V-PNI-1P | 33.17 | 33012 |

全件 ln=33.17・domain=33012 で整合。これらは `token.ln` と `token.domain` を変更しない。

---

## 1b. 実装前スナップショット仕様

### 1b.0 フィールド分類（全36フィールド）

bible_data トークンのフィールドを以下の3区分に分類する。**変更許可4項目以外の32項目はすべて変更禁止**。

| 区分 | 件数 | フィールド |
|------|----:|---------|
| 変更許可 | 4 | `strong`, `lemma`, `lemmaId`, `japanese` |
| 識別（変更禁止） | 5 | `ref`, `book`, `chapter`, `verse`, `tokenIndex` |
| その他（変更禁止） | 27 | `corpusId`, `language`, `tokenId`, `globalIdx`, `verseId`, `role`, `class`, `type`, `english`, `gloss`, `text`, `after`, `normalized`, `morph`, `person`, `number`, `gender`, `case`, `tense`, `voice`, `mood`, `degree`, `domain`, `ln`, `frame`, `subjref`, `referent` |
| **変更禁止合計** | **32** | 識別5 ＋ その他27 |

### 1b.1 95件スナップショット（reference-migration.json に記録済み）

`stage4-phase4p-reference-migration.json` の `tokens[*].snapshot_before` に 95件の完全な変更前トークン状態（全36フィールド）を記録済み。

- `tokens[*].fields.prohibited_change` に 32フィールドのリストを明示
- 推測補完なし（実際の bible_data から直接抽出）

### 1b.2 73ファイルの変更前完全スナップショット（アーカイブ）

ハッシュだけでは対象外トークンの変更を事後検証できないため、73ファイル全体の変更前 JSON を zip アーカイブとして保存した。

```
アーカイブ: scripts/output/stage4-final/stage4-phase4p-bible-snapshot.zip
内容:       73ファイル（public/bible_data/nt/{book}/{ch}.json）
基準点:     Phase 4m変更適用済み・Phase 4p変更前の現 worktree 状態
ファイル数: 73（bible_data/nt/ の章ファイル）
Phase 4m重複: 27ファイル（両 Phase で対象となる）
Phase 4pのみ: 46ファイル
```

このアーカイブを差分監査のベースラインとして使用する（下記 1b.4）。

### 1b.3 Phase 4m との重複ファイルの扱い

27ファイルが Phase 4m（132件 japanese 変更）と重複する。

| 項目 | 説明 |
|------|------|
| `hash_before` の基準点 | Phase 4m 変更適用済みの現在状態 |
| アーカイブの基準点 | 同上（Phase 4m 変更を含む現在 worktree 状態） |
| Phase 4m 変更の保護 | 実装スクリプトは `verse+tokenIndex` の一致でのみ変更する。Phase 4m 変更済み japanese は上書きしない。 |

重複27ファイル: 1TH/4, ACT/1, ACT/10, ACT/15, ACT/20, ACT/25, ACT/27, ACT/8, JHN/20, LUK/12, LUK/13, LUK/18, LUK/19, LUK/21, LUK/22, LUK/24, LUK/4, LUK/5, LUK/8, LUK/9, MAT/16, MAT/24, MAT/26, MAT/9, MRK/13, MRK/14, MRK/8

### 1b.4 差分検証仕様（73ファイル全体）

実装後に以下を検証する。スクリプトで自動化することを推奨。

```js
// ベースライン: stage4-phase4p-bible-snapshot.zip を展開した /tmp/phase4p-before/
// 実装後:       現在の bible_data/nt/ の同73ファイル
// Node.js 実行想定（node:assert/strict を使用）

import { strict as assert } from 'node:assert';

const ALLOWED_CHANGE = new Set(['strong', 'lemma', 'lemmaId', 'japanese']);

/** ref の重複なしで Map を構築。重複があれば即 STOP。 */
function buildRefMap(tokens, label) {
  const map = new Map();
  for (const token of tokens) {
    assert(!map.has(token.ref),
      `STOP: duplicate ref '${token.ref}' in ${label}`);
    map.set(token.ref, token);
  }
  return map;
}

for (const F of FILE_LIST_73) {
  const before_tokens = JSON.parse(readFileSync('/tmp/phase4p-before/' + F));
  const after_tokens  = JSON.parse(readFileSync(WORKTREE + F));

  // (1) ref重複検出（before / after 両方）— Map 構築時に一意性を保証
  const beforeByRef = buildRefMap(before_tokens, `before:${F}`);
  const afterByRef  = buildRefMap(after_tokens,  `after:${F}`);

  // (2) トークン数不変
  assert.strictEqual(before_tokens.length, after_tokens.length,
    `STOP: token count changed in ${F}`);

  // (3) ref集合の完全一致（追加・削除なし）
  assert.deepStrictEqual(
    new Set(beforeByRef.keys()),
    new Set(afterByRef.keys()),
    `STOP: ref set changed in ${F}`
  );

  // (4) 配列順序の不変確認（今回の実装仕様では順序変更を許可しない）
  assert.deepStrictEqual(
    before_tokens.map(t => t.ref),
    after_tokens.map(t => t.ref),
    `STOP: token ordering changed in ${F}`
  );

  // (5) targetIndices の ref集合と実際の変更ref集合の一致を確認
  const targetRefs = new Set(fileInventory[F].targetIndices.map(x => x.ref));

  // (5a) targetRefs の全エントリが実ファイルに存在すること
  for (const r of targetRefs) {
    assert(beforeByRef.has(r),
      `STOP: targetIndices ref '${r}' not found in ${F}`);
  }

  // (5b) 実際に変更された ref集合 ≡ targetRefs（過不足なし）
  const actualChangedRefs = new Set(
    [...beforeByRef.keys()].filter(ref => {
      const b = beforeByRef.get(ref), a = afterByRef.get(ref);
      return Object.keys(b).some(k => b[k] !== a[k]);
    })
  );
  assert.deepStrictEqual(actualChangedRefs, targetRefs,
    `STOP: changed refs ≠ targetIndices refs in ${F}`);

  // (6) トークンごとの差分確認
  for (const [ref, b] of beforeByRef) {
    const a = afterByRef.get(ref);

    if (targetRefs.has(ref)) {
      // 対象トークン:
      // (6a) フィールド名集合の完全一致（フィールド追加・削除なし）
      assert.deepStrictEqual(
        new Set(Object.keys(b)),
        new Set(Object.keys(a)),
        `STOP: field set changed at ${ref} in ${F}`
      );
      // (6b) 変更禁止32フィールドを deepStrictEqual で比較
      for (const field of Object.keys(b)) {
        if (!ALLOWED_CHANGE.has(field)) {
          assert.deepStrictEqual(b[field], a[field],
            `STOP: prohibited field '${field}' changed at ${ref} in ${F}`);
        }
      }
    } else {
      // (6c) 非対象トークン: 全フィールド deepStrictEqual
      assert.deepStrictEqual(b, a,
        `STOP: non-target token changed at ${ref} in ${F}`);
    }
  }
}
// 説明できない差分が1件でもあれば即座に STOP し報告する
```

説明できない差分（上記条件を外れる変更）が1件でもあれば即座に STOP し報告する。

ファイル単位で以下を記録する（実装報告書に含める）:

| 記録項目 | 内容 |
|---------|------|
| `hash_before` | `fileInventory[*].hash_before`（記録済み） |
| `hash_after` | 実装後に計算 |
| `changed_token_count` | そのファイル内の変更トークン数 |
| `changed_refs` | 変更した ref のリスト |
| `changed_fields` | 変更されたフィールド名（4項目のみであること） |
| `unexpected_changes` | 想定外の変更（0件必須） |

---

## 2. 変更フィールドの確定

### 2.1 変更するフィールド

| フィールド | dei-necessity（85件） | deom-hold（10件） | 変更根拠 |
|-----------|---------------------|----------------|---------|
| `strong` | G1210 → **G1163** | G1210 → **G1189** | 正しい Strong 番号への修正 |
| `lemma` | δέω → **δεῖ** | δέω → **δέομαι** | strong に対応する正規 lemma |
| `lemmaId` | grc:G1210 → **grc:G1163** | grc:G1210 → **grc:G1189** | reading-engine.js の辞書ルックアップキー |
| `japanese` | 縛る → **〜しなければならない** | 縛る → **願う** | 正しい Strong 番号の訳語に対応 |

### 2.2 変更しないフィールド（全32項目）

変更禁止フィールドは識別(5)＋その他(27)＝**32項目**。主要フィールドの根拠を示す。

| フィールド | 変更禁止の根拠 |
|-----------|-------------|
| `ref`, `book`, `chapter`, `verse`, `tokenIndex` | 識別キー — スクリプトがトークンを特定するために使用 |
| `text` | Greek 本文表記は正確。δεῖ や δεήθητε 等の原文形は変更しない。 |
| `morph` | 形態論コードは文法形に基づき正確。 |
| `ln` | dei-necessity: 71.21/71.34 は G1163 の正しい LN 番号。deom-hold: 33.17 は G1189 の正しい LN 番号。**すでに正しい値**。 |
| `domain` | dei-necessity: 71004/71005/071004/071005 は G1163 の正しい domain。deom-hold: 33012 は G1189 の正しい domain。**すでに正しい値**。 |
| `english`, `gloss` | 既存値 (ought/must/ask/Beseech) はそのまま維持 |
| `role`, `class`, `type` | 品詞・分類情報：変更なし |
| `person`, `number`, `gender`, `case`, `tense`, `voice`, `mood`, `degree` | 活用情報：変更なし |
| `corpusId`, `language`, `tokenId`, `globalIdx`, `verseId` | コーパスメタデータ：変更なし |
| `normalized`, `after` | 正規化・境界情報：変更なし |
| `frame`, `subjref`, `referent` | 統語情報：変更なし |

### 2.3 Phase 4m との比較

| | Phase 4m | Phase 4p |
|--|---------|---------|
| 変更フィールド数 | 1（japanese のみ） | 4（strong/lemma/lemmaId/japanese） |
| ダウンストリーム影響 | re-stageB baseline のみ | lexicon rebuild + search-index rebuild + 手動更新 3件 + re-stageB baseline |
| 変更件数 | 132 | 95 |

---

## 3. 意味領域インデックスの設計確認

### 3.1 重要発見：Phase 4o 設計からの修正

Phase 4o では 071004/071005 クラスターから grc:G1210 を削除するのみと計画していた。しかし、Phase 4p の精査により以下が判明した。

**dei-necessity 85件のうち 4件が domain=071004/071005 を持つ:**

| ref | text | domain |
|-----|------|--------|
| 1CO 8:2!9 | δεῖ | 071004 071005 |
| 1TH 4:1!18 | δεῖ | 071004 071005 |
| 2TI 2:24!5 | δεῖ | 071004 071005 |
| MAT 26:54!8 | δεῖ | 071004 071005 |

移行後これら 4件の lemmaId = grc:G1163 になる。しかし **grc:G1163 は現在 071004/071005 の lemmas[] に存在しない**。

**→ 071004/071005 は G1210 削除 + G1163 追加の両方が必要。**

### 3.2 domains-cluster-index.json 変更仕様

| domainCode | 現在 G1210/G1163/G1189 状態 | G1210 | G1163 | G1189 | occurrences | lemmaCount |
|-----------|--------------------------|-------|-------|-------|------------|-----------|
| 33012 | G1189あり・G1210あり | **REMOVE** | N/A | 既存・変更なし | 変更なし | 20 → **19** |
| 71004 | G1163あり・G1210あり | **REMOVE** | 既存・変更なし | N/A | 変更なし | 12 → **11** |
| 71005 | G1163あり・G1210あり | **REMOVE** | 既存・変更なし | N/A | 変更なし | 8 → **7** |
| 071004 | G1210のみ（G1163不在） | **REMOVE** | **ADD** | N/A | 変更なし | 5 → **5**（-1+1） |
| 071005 | G1210のみ（G1163不在） | **REMOVE** | **ADD** | N/A | 変更なし | 3 → **3**（-1+1） |
| 18002 | G1210のみ | 変更なし | N/A | N/A | 変更なし | 変更なし |
| 23009 | G1210のみ | 変更なし | N/A | N/A | 変更なし | 変更なし |
| 37002 | G1210のみ | 変更なし | N/A | N/A | 変更なし | 変更なし |
| 37003 | G1210のみ | 変更なし | N/A | N/A | 変更なし | 変更なし |
| 37008 | G1210のみ | 変更なし | N/A | N/A | 変更なし | 変更なし |

**occurrences が変わらない理由**: occurrences はそのドメインクラスターに属する全 lemma のトークン合計数。移行後も token.domain フィールドは変更しないため、総トークン数は不変。

### 3.3 domains-ln-index.json 変更仕様

| ln | 現在 G1210/G1163/G1189 状態 | G1210 | G1163 | G1189 | occurrences |
|----|--------------------------|-------|-------|-------|------------|
| 33.17 | G1189あり・G1210あり | **REMOVE** | N/A | 既存・変更なし | 変更なし |
| 71.21 | G1163あり・G1210あり | **REMOVE** | 既存・変更なし | N/A | 変更なし |
| 71.34 | G1163あり・G1210あり | **REMOVE** | 既存・変更なし | N/A | 変更なし |
| 18.13 | G1210のみ | 変更なし | N/A | N/A | 変更なし |
| 23.157 | G1210のみ | 変更なし | N/A | N/A | 変更なし |
| 37.33 | G1210のみ | 変更なし | N/A | N/A | 変更なし |
| 37.45 | G1210のみ | 変更なし | N/A | N/A | 変更なし |
| 37.46 | G1210のみ | 変更なし | N/A | N/A | 変更なし |
| 37.114 | G1210のみ | 変更なし | N/A | N/A | 変更なし |

### 3.4 移行後の検索整合性確認

| 検索ケース | 移行前 | 移行後 | 判定 |
|-----------|-------|-------|------|
| domain 33012 でのドメイン検索 | G1210/G1189 両方ヒット | G1189 のみヒット（G1210除去） | CORRECT |
| domain 71004 でのドメイン検索 | G1163/G1210 両方ヒット | G1163 のみヒット（G1210除去） | CORRECT |
| domain 071004 でのドメイン検索 | G1210 のみヒット | G1163 のみヒット（G1163追加・G1210除去） | CORRECT |
| ln 71.21 の逆引き | G1163/G1210 両方 | G1163 のみ | CORRECT |
| ln 33.17 の逆引き | G1189/G1210 両方 | G1189 のみ | CORRECT |

---

## 4. 辞書・検索インデックスの設計

### 4.1 件数定義の確認

lexicon-lite.json の `count` フィールド = bible_data 全体での `token.strong` 一致件数（bible_data 実カウントで確認済み）。

| Strong | 現在 count | 移行後 count | 差分 |
|--------|-----------|------------|------|
| G1163 | 16 | **101** | +85 |
| G1210 | 138 | **43** | −95 |
| G1189 | 12 | **22** | +10 |
| 合計 | 166 | 166 | 0 |

### 4.2 reading-lexicon-data.js の再生成

- **スクリプト**: `node scripts/build-reading-lexicon.cjs`
- **スコープ**: bible_data NT+LXX 全体走査 → lemmaId ごとに japanese を集計・頻度順ソート
- **移行後期待状態**:
  - `grc:G1163`: glosses=['〜しなければならない', ...] — 既存 16件 + 85件追加、先頭は変わらず
  - `grc:G1189`: glosses=['願う', '必要とする', 'お願いする', '神に祈る'] — 先頭は変わらず
  - `grc:G1210`: glosses=['縛る', ...] — dei/deom 95件除去後は deo-bind 43件のみ（縛る系統維持）
- **deponent フラグ**: G1163/G1189/G1210 いずれも deponent=false — 変更なし
- **タイミング**: bible_data 変更後

### 4.3 lexicon-lite.json 手動更新内容

| フィールド | key | before | after |
|-----------|-----|--------|-------|
| count | grc:G1163 | 16 | **101** |
| count | grc:G1210 | 138 | **43** |
| count | grc:G1189 | 12 | **22** |
| gloss | grc:G1210 | "It behooves" | **"to bind, to tie"** |
| gloss_ja | grc:G1189 | "必要とする" | **"願う、お願いする"** |

gloss/gloss_ja 修正根拠:
- G1210 `gloss="It behooves"` は δεῖ の字義であり δέω（to bind）として不正確
- G1189 `gloss_ja="必要とする"` は G1163/δεῖ の字義に近く δέομαι（to pray/beseech）として不正確

### 4.3b δέομαι 訳語ポリシー

- deom-hold 10件の `token.japanese` 変更先: **「願う」**（固定）
- `reading-lexicon-data.js` 再生成後の glosses 配列に「願い求める」「懇願する」「祈る」等が含まれる場合、これらは排除しない（bible_data 実使用 japanese の集計結果として有効）
- 基本訳語「願う」は deom-hold 10件の token レベルでのみ確定する。辞書の glosses 配列全体への介入は今回のスコープ外。

### 4.4 search-index の再生成

- **スクリプト**: `node scripts/build-search-index.js`
- **スコープ**: NT 全巻一括再生成（部分再生成オプションなし）
- **対象最低 19 書の理由**: dei-necessity+deom-hold 分布書。ただしスクリプトは全書生成するため実際は全巻。
- **更新フィールド**: strong / lemmaId / lemma / japanese（各 token レコード）
- **差分検証**: 再生成前後で対象 ref の strong/lemmaId が変化していることを spot-check

### 4.5 生成順序と依存関係

```
bible_data 変更（Step 1）
  ├─ reading-lexicon-data.js rebuild（Step 2: bible_data 依存）
  ├─ search-index rebuild（Step 3: bible_data 依存）
  ├─ lexicon-lite.json 手動更新（Step 4: 独立、bible_data 変更後に実施）
  ├─ domains-cluster-index.json 手動更新（Step 5: 独立）
  └─ domains-ln-index.json 手動更新（Step 6: 独立）
      ↓
  回帰テスト全スイート（Step 7: Step 1-6 完了後）
      ↓
  re-stageB baseline 更新（Step 8: brokenNew=0 確認後のみ）
```

---

## 5. reading-engine・StudyPanel への影響

### 5.1 reading-engine.js — 変更不要（再確認）

reading-engine.js の lemmaId 参照経路:

| 参照箇所 | 行番号 | 処理 | 移行後の挙動 |
|---------|--------|------|------------|
| lnGloss assist | 580-581 | `this._lnGloss.assist[token.lemmaId]?.[ln]` | G1163→`71.34→〜しなければならない`(正)、G1189→`33.17→願う`(正) |
| lexicon lookup | 710 | `this._lexicon.lookup(token.lemmaId)` | G1163 エントリ参照 / G1189 エントリ参照（両方既存） |
| lnGloss replace | 950-951 | `this._lnGloss.replace[token.lemmaId]?.[ln]` | 同上 |

`_MORPH_STEM_RULES`: G1210/G1163/G1189 は含まれない（G3739/G3748/G3745/G1249 等のみ）— CONFIRMED  
`getSemanticInfo()`: G5101/G5100/G846 のみ — CONFIRMED

### 5.2 reading-ln-gloss-data.js — 変更不要

移行後の対応確認:

| token lemmaId | token ln | lnGloss lookup 結果 | 期待 |
|--------------|----------|---------------------|------|
| grc:G1163 | 71.21 | "〜しなければならない" | 正しい |
| grc:G1163 | 71.34 | "〜しなければならない" | 正しい |
| grc:G1189 | 33.17 | "願う" | 正しい |
| grc:G1210 | 18.13 | "縛る" | 正しい（deo-bind は残留） |
| grc:G1210 | 37.114 | "縛る" | 正しい |

G1210 の 71.21/71.34/33.17 エントリ（"縛る"）は残存するが、移行後はこれらの ln 値を持つ G1210 トークンがゼロになるため参照されない。削除は不要。

### 5.3 StudyPanel 表示への影響

| 表示要素 | 変化内容 | 方向 |
|---------|---------|------|
| 語彙チップ（chip gloss） | 縛る → 〜しなければならない / 願う | **改善**（正しい訳語） |
| lexicon lookup | grc:G1210 → grc:G1163/grc:G1189 で正しい辞書項目を参照 | **改善** |
| LN gloss | lnGloss replace が grc:G1163/grc:G1189 で正しい gloss を返す | **改善** |
| 検索結果（Strong検索） | G1163/G1189 検索でこれらのトークンがヒットするようになる | **改善** |
| ドメイン検索 | 071004/071005 クラスターで G1163 が返るようになる | **改善** |
| 既存ブックマーク/URL | ref/verse ベースのため影響なし | **影響なし** |

---

## 6. 回帰テスト設計

### 6.1 データ整合性テスト

| テスト | 期待値 | 検証方法 |
|-------|-------|---------|
| G1210 トークン総数 | **43** | bible_data 全走査 strong=G1210 カウント |
| G1163 トークン総数 | **101** | bible_data 全走査 strong=G1163 カウント |
| G1189 トークン総数 | **22** | bible_data 全走査 strong=G1189 カウント |
| 合計 (G1210+G1163+G1189) | **166** | 不変確認 |
| dei-necessity 85件: strong=G1163 | 85件全件 | migration spec の ref リストで照合 |
| dei-necessity 85件: lemma=δεῖ | 85件全件 | 同上 |
| dei-necessity 85件: lemmaId=grc:G1163 | 85件全件 | 同上 |
| dei-necessity 85件: japanese=〜しなければならない | 85件全件 | 同上 |
| dei-necessity 85件: ln 変更なし | 85件全件 | 同上（71.21/71.34 維持） |
| dei-necessity 85件: domain 変更なし | 85件全件 | 同上 |
| deom-hold 10件: strong=G1189 | 10件全件 | migration spec の ref リストで照合 |
| deom-hold 10件: lemma=δέομαι | 10件全件 | 同上 |
| deom-hold 10件: japanese=願う | 10件全件 | 同上 |
| deom-hold 10件: ln=33.17 変更なし | 10件全件 | 同上 |
| deom-hold 10件: domain=33012 変更なし | 10件全件 | 同上 |
| deo-bind 43件: 全フィールド変更なし | 43件 | Phase 4n audit の deo-bind ref リストで照合 |
| G1163 既存 16件: 変更なし | 16件 | Phase 4n audit の g1163-correct ref リストで照合 |
| G1189 既存 12件: 変更なし | 12件 | Phase 4n audit の g1189-correct ref リストで照合 |
| bible_data JSON 構文エラー | **0件** | JSON.parse チェック |
| token 追加・削除 | **0件** | 総トークン数 137741 維持 |

### 6.2 辞書・インデックステスト

| テスト | 期待値 |
|-------|-------|
| lexicon-lite.json: G1163 count | 101 |
| lexicon-lite.json: G1210 count | 43 |
| lexicon-lite.json: G1189 count | 22 |
| domains-cluster-index: 071004 lemmas[] に grc:G1163 を含む | true |
| domains-cluster-index: 071004 lemmas[] に grc:G1210 を含まない | true |
| domains-cluster-index: 071005 lemmas[] に grc:G1163 を含む | true |
| domains-cluster-index: 33012 lemmas[] に grc:G1210 を含まない | true |
| domains-cluster-index: 71004/71005 lemmas[] に grc:G1210 を含まない | true |
| domains-ln-index: 71.21/71.34 lemmas[] に grc:G1210 を含まない | true |
| domains-ln-index: 33.17 lemmas[] に grc:G1210 を含まない | true |
| search-index: 対象 ref の strong/lemmaId が新値 | 95件 |

### 6.3 回帰テスト

| テスト | 期待 | 備考 |
|-------|------|------|
| `npm run test:re-phase1` | **PASS** | bible_data の morph/syntax は変更なし |
| `npm run test:re-stageA` | **PASS** | |
| `npm run test:re-stageD` | **PASS** | |
| `npm run test:re-stageB` 初回 | **FAIL** | 期待値変化のため（意図的） |
| re-stageB 差分サンプルレビュー | 「縛る→〜しなければならない」/「縛る→願う」の改善のみ | 悪化・破損形なし |
| `audit.brokenNew` | **0**（必須） | |
| `audit.panelMismatch` | **0**（必須） | |
| `npm run test:re-stageB` ベースライン更新後 | **PASS** | |

### 6.4 re-stageB baseline 変更仕様

**baseline 更新手順**（FROZEN §29 Protocol）:

1. bible_data 変更 + 全ダウンストリーム更新後に `npm run test:re-stageB` 実行（FAIL 想定）
2. `scripts/output/re-stageB-audit.json` の stats を取得
3. `scripts/output/re-stageB-samples.md` の差分サンプルをレビュー
4. 各サンプルが「縛る → 〜しなければならない」または「縛る → 願う」の改善であることを確認
5. `audit.brokenNew === 0` を確認（**0 でない場合は実装を即座に停止**）
6. `audit.panelMismatch === 0` を確認
7. 上記確認後のみ `STAGEB_BASELINE` の `changed` / `identical` / `brokenOld` を更新
8. コメントに変更理由を記録（Phase 4p bible_data 95件適用 G1210×85→G1163/×10→G1189）
9. `npm run test:re-stageB` 再実行で PASS を確認

**期待値を先に書き換えてテストを通すことは禁止。**  
必ず現行 baseline での差分取得 → サンプルレビュー → 因果関係確認 → 更新の順序を守る。

---

## 7. 実装順序とロールバック設計

### 7.1 実装順序

```
Step 1: bible_data 95件変更
  ├─ 前提確認: 実行前に current.strong === "G1210" を全件確認
  ├─ 対象: phase4p-reference-migration.json のrefリスト（95件）
  ├─ 変更: strong/lemma/lemmaId/japanese（4フィールド）
  ├─ 非変更: ln/domain/text/morph 等（明示的にスキップ）
  ├─ 方式: Phase 4m 実装スクリプトと同パターン（JSON読込→変更→書出）
  └─ 検証: 全95件の current strong=G1210 一致確認後に実行開始

Step 2: reading-lexicon-data.js rebuild
  └─ node scripts/build-reading-lexicon.cjs

Step 3: search-index rebuild
  └─ node scripts/build-search-index.js

Step 4: lexicon-lite.json 手動更新
  └─ count (G1163:101, G1210:43, G1189:22) + gloss修正

Step 5: domains-cluster-index.json 手動更新
  └─ 33012/71004/71005: G1210 削除
  └─ 071004/071005: G1210 削除 + G1163 追加

Step 6: domains-ln-index.json 手動更新
  └─ 33.17/71.21/71.34: G1210 削除

Step 7: 回帰テスト
  └─ npm run test:re-phase1 → PASS
  └─ npm run test:re-stageA → PASS
  └─ npm run test:re-stageD → PASS
  └─ npm run test:re-stageB → FAIL（想定）→ サンプルレビュー

Step 8: re-stageB baseline 更新（brokenNew=0/panelMismatch=0 確認後）
  └─ npm run test:re-stageB → PASS
```

### 7.2 ロールバック設計

**ロールバックの前提**:
- bible_data は git 管理下で、変更は未コミット
- git checkout によるロールバックは可能だが、**ユーザー変更を巻き戻す操作は禁止**
- Phase 4m の 72 ファイル変更もロールバック対象に含めないよう注意

**問題発生時の対応方針**:

| 問題 | 対応 |
|------|------|
| bible_data 変更後に brokenNew > 0 | **即座に STOP**。bible_data の当該トークンを調査。git diff で差分確認。修正後に再テスト。 |
| bible_data 変更後に panelMismatch > 0 | 同上 |
| JSON 構文エラー | 変更スクリプトの出力を確認。エラー箇所を特定して修正。 |
| deo-bind 43件に誤変更 | STOP → 誤変更トークンを特定 → 当該ファイルを修正スクリプトで戻す |
| search-index rebuild 失敗 | スクリプトのエラー内容確認。bible_data JSON 整合性を確認。 |
| G1163 未追加による 071004 検索不整合 | domains-cluster-index.json の該当エントリを修正 |

**Phase 4m 変更の保護**:
- Phase 4p の実装スクリプトは phase4p-reference-migration.json の 95 ref を対象とする
- Phase 4m で変更した 72 ファイルの japanese フィールドには原則触れない
- ただし一部ファイルが重複する場合（ACT/LUK/MAT 等）は、同一ファイルへの追記変更として慎重に実施

---

## 8. 停止条件

以下のいずれかに該当する場合、実装を停止してユーザーへ報告する。

| 条件 | 分類 |
|------|------|
| Step 1 前提確認で strong≠G1210 のトークンが発見された | STOP / BLOCKED |
| deo-bind / G1163既存 / G1189既存 に変更が適用された | STOP / CRITICAL |
| brokenNew > 0 | STOP / CRITICAL |
| panelMismatch > 0 | STOP / CRITICAL |
| JSON 構文エラー発生 | STOP / BLOCKED |
| domains-cluster-index の 071004/071005 に G1163 追加を忘れた場合 | STOP / CORRECTNESS |

---

## 9. 変更しないファイル

| ファイル | 理由 |
|---------|------|
| `public/core/reading-engine.js` | G1210/G1163/G1189 固有ロジックなし。変更不要。 |
| `public/assets/data/reading-ln-gloss-data.js` | G1163/G1189 マッピング既存・正しい。変更不要。 |
| `scripts/re-stageB-regression.cjs` | 実装後の差分確認まで baseline 変更禁止 |

---

## 成果物

| ファイル | 内容 |
|---------|------|
| `stage4-phase4p-implementation-spec.md` | 本仕様書 |
| `stage4-phase4p-reference-migration.json` | 95件 ref 単位の移行仕様（current→proposed 全フィールド） |
| `stage4-phase4p-index-migration.json` | 辞書・意味領域・検索インデックスの変更前後仕様 |
| `stage4-phase4p-regression-plan.md` | テスト項目・期待値・baseline 差分検証方法 |
