# Stage 4 Phase 4p — 回帰テスト計画

**Phase**: 4p-correction4  
**作成日**: 2026-11-03  
**対象**: G1210 Strong/lemma修正 95件（dei-necessity 85 + deom-hold 10）

---

## 1. テスト実行前提条件

以下が完了していること:

- [ ] bible_data 95件変更（strong/lemma/lemmaId/japanese）
- [ ] `node scripts/build-reading-lexicon.cjs` 実行完了
- [ ] `node scripts/build-search-index.js` 実行完了
- [ ] lexicon-lite.json 手動更新完了
- [ ] domains-cluster-index.json 手動更新完了
- [ ] domains-ln-index.json 手動更新完了

---

## 2. データ整合性テスト（T1）

実装スクリプト内または別途確認スクリプトで検証する。

### T1-1: 前提条件（実装開始前）

```
PRECONDITION: 95件すべての current.strong === "G1210"
期待: errors = 0
STOP条件: errors > 0 → 実装中止・内容調査
```

### T1-2: 変更後カウント確認

| チェック | 期待値 | 優先度 |
|---------|-------|-------|
| bible_data G1210 token 総数 | 43 | 必須 |
| bible_data G1163 token 総数 | 101 | 必須 |
| bible_data G1189 token 総数 | 22 | 必須 |
| G1210+G1163+G1189 合計 | 166（不変） | 必須 |
| bible_data 総 token 数 | 137,741（不変） | 必須 |

### T1-3: dei-necessity 85件 フィールド確認

対象: phase4p-reference-migration.json の dei-necessity 85件

| フィールド | 期待値 | 全件要件 |
|-----------|-------|---------|
| strong | G1163 | 85/85 |
| lemma | δεῖ | 85/85 |
| lemmaId | grc:G1163 | 85/85 |
| japanese | 〜しなければならない | 85/85 |
| ln | 変更前の値（71.21 または 71.34） | 85/85 |
| domain | 変更前の値（71004/71005 等） | 85/85 |
| text | 変更前の値（δεῖ/δεῖν/δέῃ/δέον/δέοντα 等） | 85/85 |
| morph | 変更前の値 | 85/85 |

### T1-4: deom-hold 10件 フィールド確認

対象: phase4p-reference-migration.json の deom-hold 10件

| フィールド | 期待値 | 全件要件 |
|-----------|-------|---------|
| strong | G1189 | 10/10 |
| lemma | δέομαι | 10/10 |
| lemmaId | grc:G1189 | 10/10 |
| japanese | 願う | 10/10 |
| ln | 33.17（変更前と同一） | 10/10 |
| domain | 33012（変更前と同一） | 10/10 |
| text | 変更前の値 | 10/10 |
| morph | 変更前の値 | 10/10 |

### T1-5: 不変確認（誤変更がないこと）

| 対象 | チェック | 期待 |
|------|---------|------|
| deo-bind 43件 | 全フィールド変更なし | 43/43 |
| G1163 既存 16件 | 全フィールド変更なし | 16/16 |
| G1189 既存 12件 | 全フィールド変更なし | 12/12 |
| JSON 構文エラー | なし | 0件 |
| token 追加・削除 | なし | 0件 |

### T1-6: 差分監査（フィールドレベル）

実装後、`snapshot_before`（95件）および `stage4-phase4p-bible-snapshot.zip`（73ファイル全体）を基準に以下を検証する。

| チェック | 期待値 | STOP 条件 | 検証ベース |
|---------|-------|---------|----------|
| ref 重複なし（before / after 両方） | 0件 | 1件でも重複があれば STOP | bible-snapshot.zip + 実装後ファイル |
| targetIndices の全 ref が実ファイルに存在すること | 73ファイル全件 | 存在しない ref があれば STOP | bible-snapshot.zip |
| targetIndices の ref集合 ≡ 実際に変更された ref集合 | 完全一致 | 過不足があれば STOP | bible-snapshot.zip + 実装後ファイル |
| 対象 95件のフィールド名集合が変更前後で完全一致（追加・削除なし） | 95/95 | 不一致があれば STOP | snapshot_before（95件） |
| 対象 95件の変更フィールドが [strong, lemma, lemmaId, japanese] のみ | 95/95 | 他フィールドに変更が 1件でもあれば STOP | snapshot_before（95件） |
| 対象 95件の prohibited_change フィールド（**32項目**）を deepStrictEqual で比較 | 変更 0件 | 変更があれば STOP | snapshot_before（95件） |
| 対象外トークン（73ファイル内の非ターゲット）を全フィールド deepStrictEqual で比較 | 変更 0件 | 変更があれば STOP | bible-snapshot.zip（全73ファイル） |
| 配列順序の不変確認 | 変更 0件 | 変更があれば STOP | bible-snapshot.zip + 実装後ファイル |
| 説明できない変更 | 0件 | 1件でもあれば STOP | 両方 |

**prohibited_change フィールド（32項目）**:

識別(5): `ref`, `book`, `chapter`, `verse`, `tokenIndex`

その他(27): `corpusId`, `language`, `tokenId`, `globalIdx`, `verseId`, `role`, `class`, `type`, `english`, `gloss`, `text`, `after`, `normalized`, `morph`, `person`, `number`, `gender`, `case`, `tense`, `voice`, `mood`, `degree`, `domain`, `ln`, `frame`, `subjref`, `referent`

**対象外トークン検証の手順（zip アーカイブ使用 / Node.js）**:

```js
// node:assert/strict を使用
// 事前準備: unzip stage4-phase4p-bible-snapshot.zip -d /tmp/phase4p-before/
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
```

### T1-7: Phase 4m 変更の保護確認

Phase 4m で変更した 132件の `japanese` が維持されていることを確認する。

| チェック | 期待値 | STOP 条件 |
|---------|-------|---------|
| Phase 4m 変更 132件（stage4-phase4m-token-diff.json）の `japanese` が `newJa` と一致 | 132/132 | 1件でも不一致があれば STOP |
| Phase 4m と Phase 4p の重複 27ファイルについて、Phase 4m 変更済みトークンが不変 | 該当件数 全件 | 1件でも変更があれば STOP |

重複 27ファイル内の Phase 4m 変更トークンは Phase 4p の対象外であるため、実装後も `newJa`（Phase 4m 後の値）を維持していなければならない。

Phase 4m 変更トークンの検証は T1-6 の非対象トークン検証（zip アーカイブ使用）によっても自動的に網羅される。`newJa` 照合は別途 `stage4-phase4m-token-diff.json` との突き合わせで確認する。

### T1-8: JSONファイル単位の差分保存

実装後、変更した 73ファイルについて以下を記録する（実装報告書に含める）。

| 記録項目 | 内容 |
|---------|------|
| ファイルパス | bible_data/nt/{book}/{ch}.json |
| hash_before | `fileInventory[*].hash_before`（記録済み） |
| hash_after | 実装後に計算する（SHA256） |
| changed_token_count | そのファイル内の変更トークン数 |
| changed_refs | 変更した ref のリスト |
| non_target_unchanged | 非対象トークン全件完全一致の確認結果（PASS/FAIL） |

**hash_before と hash_after が同一のファイルが存在する場合**: 変更なしのファイルが対象ファイルとして誤ってリストされている可能性があるため調査する。

**非対象トークン完全一致の確認（zip アーカイブ使用）**:

各ファイルについて T1-6 の zip アーカイブ検証を実施し、非対象トークンに差分がゼロであることを確認してから `hash_after` を記録する。差分が検出された場合は即座に STOP し、該当トークンの全フィールドを報告する。

```js
// T1-6 の検証完了後に記録する（T1-6 が STOP の場合は記録しない）
for (const F of FILE_LIST_73) {
  const sha256_after = sha256hex(readFileSync(WORKTREE + F));
  const targetRefs   = new Set(fileInventory[F].targetIndices.map(x => x.ref));
  const after_tokens = JSON.parse(readFileSync(WORKTREE + F));

  record[F] = {
    path:                F,
    hash_before:         fileInventory[F].hash_before,          // 記録済み
    hash_after:          sha256_after,
    changed_token_count: after_tokens.filter(t => targetRefs.has(t.ref)).length,
    changed_refs:        fileInventory[F].targetIndices.map(x => x.ref),
    non_target_unchanged: 'PASS',  // T1-6 を通過した場合のみここに到達
  };
}
```

---

## 3. 辞書・インデックス確認テスト（T2）

### T2-1: lexicon-lite.json

| チェック | 期待値 |
|---------|-------|
| grc:G1163 count | **101** |
| grc:G1210 count | **43** |
| grc:G1189 count | **22** |
| grc:G1210 gloss | "to bind, to tie"（修正後） |
| grc:G1189 gloss_ja | "願う、お願いする"（修正後） |

### T2-2: domains-cluster-index.json

| domainCode | チェック | 期待値 |
|-----------|---------|-------|
| 33012 | lemmas[] に grc:G1210 を含まない | true |
| 33012 | lemmas[] に grc:G1189 を含む | true |
| 71004 | lemmas[] に grc:G1210 を含まない | true |
| 71004 | lemmas[] に grc:G1163 を含む | true |
| 71005 | lemmas[] に grc:G1210 を含まない | true |
| 71005 | lemmas[] に grc:G1163 を含む | true |
| 071004 | lemmas[] に grc:G1210 を含まない | true |
| 071004 | lemmas[] に grc:G1163 を含む | **true（追加必須）** |
| 071005 | lemmas[] に grc:G1210 を含まない | true |
| 071005 | lemmas[] に grc:G1163 を含む | **true（追加必須）** |
| 18002, 23009, 37002, 37003, 37008 | lemmas[] に grc:G1210 を含む | true（変更なし） |

### T2-3: domains-ln-index.json

| ln | チェック | 期待値 |
|----|---------|-------|
| 33.17 | lemmas[] に grc:G1210 を含まない | true |
| 33.17 | lemmas[] に grc:G1189 を含む | true |
| 71.21 | lemmas[] に grc:G1210 を含まない | true |
| 71.21 | lemmas[] に grc:G1163 を含む | true |
| 71.34 | lemmas[] に grc:G1210 を含まない | true |
| 71.34 | lemmas[] に grc:G1163 を含む | true |
| 18.13, 23.157, 37.33, 37.45, 37.46, 37.114 | lemmas[] に grc:G1210 を含む | true（変更なし） |

### T2-4: search-index（spot-check）

以下の代表 ref について search-index の token レコードを確認:

| ref | 期待 strong | 期待 lemmaId |
|-----|-----------|------------|
| JHN 3:7!6 | G1163 | grc:G1163 |
| MAT 9:38!1 | G1189 | grc:G1189 |
| ACT 9:2!21（deo-bind） | G1210 | grc:G1210 |

---

## 4. 回帰テスト（T3）

### T3-1: re-phase1

```bash
npm run test:re-phase1
```

- **期待**: ALL PASS
- **根拠**: bible_data の morph/syntax/role/class フィールドは変更なし
- **FAIL した場合**: strong/lemmaId 変更が予期しないパス経由で morph 解析に影響していないか調査

### T3-2: re-stageA

```bash
npm run test:re-stageA
```

- **期待**: ALL PASS

### T3-3: re-stageD

```bash
npm run test:re-stageD
```

- **期待**: ALL PASS

### T3-4: re-stageB（主要回帰）

**実行 1 回目（baseline 更新前）**:

```bash
npm run test:re-stageB
```

- **期待**: FAIL（`changed` / `identical` / `brokenOld` が現行 baseline と一致しない）
- **これは想定内の動作**

**差分サンプルレビュー手順**:

1. `scripts/output/re-stageB-audit.json` を開いて `stats` を確認
2. `scripts/output/re-stageB-samples.md` の差分サンプルを全件レビュー
3. 各変化が以下のいずれかであることを確認:
   - `縛る` → `〜しなければならない`（dei-necessity トークンの改善）
   - `縛る` → `願う`（deom-hold トークンの改善）
   - 上記以外の変化があれば原因調査（STOP）

**必須確認事項**:

| 項目 | 要件 | FAIL 時の対応 |
|------|------|-------------|
| `audit.brokenNew` | **= 0（絶対条件）** | 即座に STOP / 調査 / 修正 |
| `audit.panelMismatch` | **= 0（絶対条件）** | 即座に STOP / 調査 / 修正 |

**baseline 更新内容**（brokenNew=0/panelMismatch=0 確認後のみ）:

`scripts/re-stageB-regression.cjs` の `STAGEB_BASELINE` を更新:

```javascript
// 2026-11-0X Phase 4p bible_data 95件適用（G1210×85→G1163/G1210×10→G1189）。
// changed XXXXX→XXXXX（±X）/ identical XXXXX→XXXXX（±X）/ brokenOld XXXX→XXXX（±X）。
// 破損形（新）0・panelMismatch 0 維持。95件はすべて審査済み APPROVED_FOR_CHANGE。
changed:        XXXXX,   // Phase 4p bible_data 95件適用
identical:      XXXXX,
brokenOld:       XXXX,
```

（実際の数値は re-stageB-audit.json の stats から取得）

**実行 2 回目（baseline 更新後）**:

```bash
npm run test:re-stageB
```

- **期待**: ALL PASS（27 checks）

---

## 5. スポットチェック（T4）

### T4-1: dei-necessity 代表ケース

| ref | text | 確認内容 |
|-----|------|---------|
| JHN 3:7!6 | δεῖ | strong=G1163, lemma=δεῖ, japanese=〜しなければならない, ln=71.34（変更なし） |
| JHN 4:4!3 | ἔδει | G1163既存（変更なし — ἔδει は既に正しい登録） |
| REV 1:1!10 | δεῖ | strong=G1163, domain変更なし |
| ACT 5:29!4 | δεῖ | strong=G1163, japanese=〜しなければならない |

### T4-2: deom-hold 代表ケース

| ref | text | 確認内容 |
|-----|------|---------|
| MAT 9:38!1 | δεήθητε | strong=G1189, ln=33.17（変更なし）, domain=33012（変更なし） |
| LUK 22:32!3 | ἐδεήθην | strong=G1189, japanese=願う |
| ACT 10:2!17 | δεόμενος | strong=G1189 |

### T4-3: deo-bind 変更なし確認

| ref | text | 確認内容 |
|-----|------|---------|
| ACT 9:2!21 | δήσας | strong=G1210（変更なし）, japanese変更なし |
| MAT 12:29!3 | δήσῃ | strong=G1210（変更なし） |
| REV 20:2!3 | ἔδησεν | strong=G1210（変更なし） |

### T4-4: 意味領域インデックス確認

```javascript
// domains-cluster-index.json での確認例
const idx = require('.../domains-cluster-index.json');
assert(!idx['071004'].lemmas.includes('grc:G1210'));  // 削除確認
assert( idx['071004'].lemmas.includes('grc:G1163'));  // 追加確認
assert(!idx['071005'].lemmas.includes('grc:G1210'));
assert( idx['071005'].lemmas.includes('grc:G1163'));
assert(!idx['33012'].lemmas.includes('grc:G1210'));
```

---

## 5b. δέομαι 訳語の確認

deom-hold 10件の `japanese` が「願う」に変更されていることを確認する。

| チェック | 期待値 |
|---------|-------|
| deom-hold 10件 japanese = "願う" | 10/10 |
| reading-lexicon-data.js 再生成後: grc:G1189 glosses の先頭が "願う" | true |
| reading-lexicon-data.js 再生成後: grc:G1189 glosses に「願い求める」「懇願する」等が含まれても排除しない | — |

---

## 6. STOP 条件まとめ

| 条件 | 分類 | 対応 |
|------|------|------|
| 前提確認で strong≠G1210 が 1件でも発見 | CRITICAL | 実装中止・内容調査 |
| deo-bind/G1163既存/G1189既存に変更適用 | CRITICAL | 即座に STOP・当該 ref を特定 |
| JSON 構文エラー発生 | CRITICAL | 当該ファイルを修正 |
| brokenNew > 0 | CRITICAL | 即座に STOP・調査・修正 |
| panelMismatch > 0 | CRITICAL | 即座に STOP |
| prohibited_change フィールドへの変更が 1件でも発見 | CRITICAL | 即座に STOP・snapshot_before と差分を報告 |
| 対象外トークンへの変更が 1件でも発見 | CRITICAL | 即座に STOP・影響範囲を特定 |
| Phase 4m 変更済み japanese の改変が 1件でも発見 | CRITICAL | 即座に STOP |
| 説明できない差分（上記以外）が 1件でも発見 | CRITICAL | 即座に STOP・報告 |
| domains-cluster-index 071004/071005 に G1163 未追加 | CORRECTNESS | 手動更新を再実施 |
| re-stageB サンプルに「縛る→縛る」等の非改善変化 | CORRECTNESS | 原因調査 |

---

## 7. テスト依存順序

```
T1-1 前提確認（実装前）
    ↓ PASS
bible_data 変更 + 全ダウンストリーム更新
    ↓
T1-2/T1-3/T1-4/T1-5 データ整合性
T2-1/T2-2/T2-3/T2-4 辞書・インデックス
    ↓ 全 PASS
T3-1 re-phase1
T3-2 re-stageA
T3-3 re-stageD
T3-4 re-stageB（1回目 — FAIL 想定）
    ↓ brokenNew=0/panelMismatch=0 確認
T4 スポットチェック
    ↓
baseline 更新
    ↓
T3-4 re-stageB（2回目 — PASS 期待）
    ↓
IMPLEMENTATION COMPLETE — HUMAN REVIEW
```

---

## 8. 現行 baseline（参照用）

```javascript
// 現在の STAGEB_BASELINE（Phase 4m 後）
changed:        39679,
identical:      98062,
brokenOld:       1253,
brokenNew:          0,   // 更新後も必ず 0
panelMismatch:      0,   // 更新後も必ず 0
presented:       4258,   // 変更なし
tokens:        137741,   // 変更なし
```

Phase 4p 後の `changed` / `identical` / `brokenOld` は実行後に取得する。`brokenNew` / `panelMismatch` / `presented` / `tokens` は変更なし。
