# Task 39 — 異読UI統合の実装前設計監査

作成日: 2026-10-15  
種別: 設計監査（READ ONLY）  
対象: `public/index.html` の現行apparatus UI + 4データセット統合設計

---

## Phase A — 現行UIと読み込み経路の調査

### A-1. DOMスロット構造（CONFIRMED）

apparatus表示に関わるスロットは `mobile-verse-area` 内のみ。

```
area.innerHTML = '<div id="wlv-passage-note-slot"></div><div id="wlv-apparatus-slot"></div>';
```

デスクトップパス（line 15562）は `wlv-passage-note-slot` のみ。**`wlv-apparatus-slot` はモバイル専用。**

| スロット | モバイル | デスクトップ |
|---|---|---|
| `wlv-passage-note-slot` | ✓ | ✓ |
| `wlv-apparatus-slot` | ✓ | ✗（存在しない） |

→ **apparatus（本文の異読）は現在モバイルUIにのみ表示される。**

### A-2. `_fillApparatusSection` の呼び出し箇所（CONFIRMED）

```javascript
// line 13373 — モバイルパスのみ
if (_bookKey && ch != null && vNum != null) _fillApparatusSection(_bookKey, ch, vNum, area);
```

デスクトップパスに `_fillApparatusSection` の呼び出しは**ない**（全grep確認済み）。

### A-3. 読み込み関数（CONFIRMED）

#### `_loadApparatusData()` — apparatus.json（5.6MB）

```javascript
async function _loadApparatusData() {
    if (_apparatusData) return _apparatusData;
    if (_apparatusLoadP) return _apparatusLoadP;
    _apparatusLoadP = fetch('../assets/data/apparatus.json')
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(d => { _apparatusData = d; return d; })
        .catch(() => null);  // 静寂優先
    return _apparatusLoadP;
}
```

#### `_loadApparatusJaData()` — apparatus-ja.json（7.2KB, manual 30件）

```javascript
async function _loadApparatusJaData() {
    if (_apparatusJaData) return _apparatusJaData;
    if (_apparatusJaLoadP) return _apparatusJaLoadP;
    _apparatusJaLoadP = fetch('../assets/data/apparatus-ja.json')
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(d => { _apparatusJaData = d; return d; })
        .catch(() => null);  // 静寂優先
    return _apparatusJaLoadP;
}
```

**Phase 1/2/3 JSONは現在ロードしていない。**

### A-4. `_fillApparatusSection` の処理フロー（CONFIRMED）

```javascript
async function _fillApparatusSection(bookKey, ch, vNum, area) {
    const myGen = ++_apparatusNoteGen;   // (1) 世代カウンタをインクリメント
    const [data, jaData] = await Promise.all([_loadApparatusData(), _loadApparatusJaData()]);
    if (myGen !== _apparatusNoteGen) return;  // (2) stale injection 防止
    if (!data) return;                         // (3) apparatus.json 失敗 → 静寂
    const verseKey = `${bookKey} ${ch}:${vNum}`;
    const idxs = data.byVerse[verseKey];
    if (!idxs || !idxs.length) return;        // (4) 異読なし → 静寂
    const entries = idxs.map(i => data.entries[i]);
    const jaEntries = jaData && jaData.entries;
    const html = _buildApparatusHTML(entries, jaEntries);
    if (!html) return;
    const slot = area && area.querySelector('#wlv-apparatus-slot');
    if (!slot) return;
    slot.outerHTML = `<details class="mvv-passage-note mvv-apparatus-note">
        <summary>本文の異読 <span class="mvv-app-count">${entries.length}</span></summary>
        ${html}
    </details>`;
}
```

stale injection 防止メカニズム: 節移動・語句詳細切り替えの際に `area.innerHTML` が上書きされ、スロットがリセットされる（line 13370）。また `_apparatusNoteGen` カウンタで古いPromise結果を破棄。

### A-5. `_buildApparatusHTML` の表示条件（CONFIRMED）

**現行の日本語注釈表示条件: `status === '確認済み'` のみ。**

```javascript
const ja = jaEntries && jaEntries[e.id];
const annoHtml = (ja && ja.status === '確認済み' && ja.tag && ja.ja)
    ? `<div class="mvv-app-anno"><span class="mvv-app-tag">${_escH(ja.tag)}</span>
         <span class="mvv-app-ja">${_escH(ja.ja)}</span></div>`
    : '';
```

`status === '自動生成'` （Phase 1/2/3 全件）は現行UIで**完全に非表示**。

### A-6. CSS（CONFIRMED）

`#mobile-verse-area` スコープに限定したモバイル専用クラス群:

```css
#mobile-verse-area.word-analysis-open .mvv-passage-note:not(.mvv-apparatus-note) { display: none; }
/* → mvv-apparatus-note は語句分析モードでも非表示にならない（除外ルール） */

#mobile-verse-area .mvv-apparatus-entries { ... }
#mobile-verse-area .mvv-app-entry { ... }
#mobile-verse-area .mvv-app-lem { ... }
#mobile-verse-area .mvv-app-rdg { ... }
#mobile-verse-area .mvv-app-rdg-text { ... }
#mobile-verse-area .mvv-app-rdg-wit { ... }
```

デスクトップ向けの apparatus CSS は**現在存在しない**。

### A-7. フォールバック動作（CONFIRMED）

| 条件 | 動作 |
|---|---|
| apparatus.json フェッチ失敗 | `null` 返却 → `_fillApparatusSection` 早期 return → スロット更新なし |
| apparatus-ja.json フェッチ失敗 | `null` 返却 → `jaEntries = null` → 全エントリ `annoHtml = ''`（注釈なし表示） |
| 節に異読なし | `idxs = []` → 早期 return → スロット更新なし（静寂） |
| 高速 verse 切り替え | 世代カウンタ不一致で古い結果を破棄 |
| HTML 生成結果が空文字列 | `if (!html) return` → スロット更新なし |

---

## Phase B — データ契約

### B-1. 4データセット概要（CONFIRMED）

| データセット | ファイル | サイズ | 件数 | status |
|---|---|---|---|---|
| manual | apparatus-ja.json | 7.2KB | 30 | 確認済み(28) / 保留(2) |
| Phase 1 | apparatus-ja-auto.json | 342KB | 2,418 | 自動生成 |
| Phase 2 | apparatus-ja-phase2.json | 488KB | 2,796 | 自動生成 |
| Phase 3 | apparatus-ja-phase3.json | 315KB | 1,512 | 自動生成 |

- ID重複: 0件（Task 37 CONFIRMED）
- 同一IDに複数の注釈が存在するケースは設計上ない。

### B-2. 表示条件の設計

| status | 現行 | 統合後 |
|---|---|---|
| `確認済み` | `mvv-app-anno` で表示 | 現行維持 |
| `自動生成` | 非表示（ゲートに遮断） | `mvv-app-anno` + 自動生成識別子クラスで表示 |
| `保留` | 非表示 | 非表示（変更なし） |

**L-0制約遵守**: 表示するのは `tag` と `ja` の文字列そのもの。UIは内容を解釈・変更しない。

### B-3. 優先順位（同一ID衝突時）

現在は同一ID重複なし。将来の追加時に備えた優先順位（降順）:

1. manual（`確認済み`）
2. Phase 1/2/3（`自動生成`）— autoPhase順

実装上はマージ時に manual を後書きし、自動生成を先書きすることで manual が勝つ。

### B-4. `autoPhase` の扱い

- UIには表示しない（内部分類のみ）。
- マージ時の参照用として `autoPhase` フィールドを保持する。

---

## Phase C — 読み込み方式比較

### C-1. ファイルサイズ

| ファイル | サイズ | 備考 |
|---|---|---|
| apparatus.json | 5.6MB | 現在ロード中 |
| apparatus-ja.json | 7.2KB | 現在ロード中 |
| apparatus-ja-auto.json | 342KB | 未ロード |
| apparatus-ja-phase2.json | 488KB | 未ロード |
| apparatus-ja-phase3.json | 315KB | 未ロード |
| **追加合計** | **1,145KB** | |

### C-2. 方式比較

#### 方式A: 別々フェッチ（3並列）

`Promise.all` に3ファイルを追加フェッチし、結果をマージ。

```javascript
const [data, jaManual, jaP1, jaP2, jaP3] = await Promise.all([
    _loadApparatusData(),
    _loadApparatusJaData(),
    _loadApparatusJaAutoData(),
    _loadApparatusJaPhase2Data(),
    _loadApparatusJaPhase3Data(),
]);
// マージ: autoが先、manualで上書き
const jaEntries = _mergeJaEntries(jaP1, jaP2, jaP3, jaManual);
```

- **長所**: コード変更最小。キャッシュ変数をPhaseごとに独立管理。静的サイト制約なし。
- **短所**: 初回4並列フェッチ（ただし apparatus.json 5.6MB より追加1.1MBは小）。

#### 方式B: マージJSON（事前生成）

生成スクリプトで4ファイルをマージした `apparatus-ja-merged.json`（約1.1MB）を生成し、1回フェッチ。

- **長所**: フェッチ1回、ロジック単純。
- **短所**: 生成スクリプト追加が必要。ビルド工程相当の手順。静的サイトの原則（生成可能なデータは `scripts/` 経由）には合致するが、Task 39 スコープ外の作業が増える。

#### 方式C: 遅延ロード（apparatus.json完了後にプリフェッチ）

apparatus.json フェッチ完了後にバックグラウンドで Phase JSON をプリフェッチ。

- **長所**: 初回apparatus.jsonと競合しない。
- **短所**: 実装複雑。ユーザーが即座に apparatus を開いた場合のキャッシュ未完了リスク。

### C-3. 推奨

**方式A（別々フェッチ）を推奨。**

理由:
- コード変更範囲が最小（既存のキャッシュパターンを3回繰り返すだけ）。
- apparatus.json（5.6MB）がすでに並列ロードされる設計であり、追加1.1MBは比率として小さい。
- 静的サイトの制約内で完結する。
- 既存のキャッシュ変数パターン（`_apparatusJaData` / `_apparatusJaLoadP`）の踏襲で実装者の認知負担が低い。

---

## Phase D — 最小UI設計

### D-1. 変更が必要な箇所

1. **`_loadApparatusJaData()` の拡張** — Phase 1/2/3を追加ロードしてマージ
2. **`_buildApparatusHTML` の表示ロジック** — `自動生成` ステータスの表示追加
3. **CSS** — 自動生成注釈の視覚的区別

### D-2. 状態別表示設計

| 状態 | 表示 |
|---|---|
| apparatus.json なし | スロット更新なし（現行維持） |
| 異読なし | スロット更新なし（現行維持） |
| 注釈なし（auto/manualともに未対応） | lemText + readings のみ（現行維持） |
| manual 確認済み注釈あり | `mvv-app-anno`（現行維持） |
| 自動生成注釈あり | `mvv-app-anno mvv-app-anno--auto` |
| フェッチ失敗 | 注釈なしで readings のみ表示（現行維持） |
| 高速 verse 切り替え | 世代カウンタで破棄（現行維持） |

### D-3. `_buildApparatusHTML` 変更設計

現行:
```javascript
const annoHtml = (ja && ja.status === '確認済み' && ja.tag && ja.ja)
    ? `<div class="mvv-app-anno">...</div>`
    : '';
```

変更後:
```javascript
const annoHtml = (ja && (ja.status === '確認済み' || ja.status === '自動生成') && ja.tag && ja.ja)
    ? `<div class="mvv-app-anno${ja.status === '自動生成' ? ' mvv-app-anno--auto' : ''}">
         <span class="mvv-app-tag">${_escH(ja.tag)}</span>
         <span class="mvv-app-ja">${_escH(ja.ja)}</span>
       </div>`
    : '';
```

**`保留` は引き続き非表示。** `自動生成` の内容を解釈・変更しない（L-0遵守）。

### D-4. CSS追加設計（最小）

```css
/* 自動生成注釈の視覚的区別: confirmed より低い信頼度を示す */
#mobile-verse-area .mvv-app-anno--auto {
    opacity: 0.75;  /* または color を少し薄く */
}
```

詳細なスタイル値はUIレビュー時（L5）に決定する。ここでは構造のみを確定する。

### D-5. ローダー設計（`_loadApparatusJaAllData`）

```javascript
// 追加 state 変数（既存パターンと一致）
let _apparatusJaAllData  = null;
let _apparatusJaAllLoadP = null;

async function _loadApparatusJaAllData() {
    if (_apparatusJaAllData) return _apparatusJaAllData;
    if (_apparatusJaAllLoadP) return _apparatusJaAllLoadP;
    _apparatusJaAllLoadP = Promise.all([
        fetch('../assets/data/apparatus-ja.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('../assets/data/apparatus-ja-auto.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('../assets/data/apparatus-ja-phase2.json').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('../assets/data/apparatus-ja-phase3.json').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([manual, p1, p2, p3]) => {
        // マージ: 自動生成を先書き、manual で上書き（manual 優先）
        const merged = {};
        for (const src of [p1, p2, p3, manual]) {
            if (src && src.entries) Object.assign(merged, src.entries);
        }
        _apparatusJaAllData = { entries: merged };
        return _apparatusJaAllData;
    }).catch(() => null);
    return _apparatusJaAllLoadP;
}
```

- `_loadApparatusJaData()` は残す（後方互換。現行の独立ロードが必要な場合のため）。
- `_fillApparatusSection` 内の `_loadApparatusJaData()` を `_loadApparatusJaAllData()` に変更。
- 既存の `_apparatusJaData` / `_apparatusJaLoadP` は変更しない。

---

## Phase E — 実装計画

### E-1. タスク一覧

Task 39は設計監査のみ。実装は以下の3タスクに分割する。

#### Task 40: 日本語注釈ローダーの統合

**変更先**: `public/index.html`  
**変更種別**: `FEATURE`（ローダー追加、フェッチ追加）  
**In Scope**:
- `_apparatusJaAllData` / `_apparatusJaAllLoadP` 変数追加
- `_loadApparatusJaAllData()` 関数追加（D-5設計）
- `_fillApparatusSection` 内の呼び出し変更: `_loadApparatusJaData()` → `_loadApparatusJaAllData()`

**Out of Scope**:
- `_loadApparatusJaData()` の削除（後方互換のため残す）
- `_buildApparatusHTML` の変更（Task 41で行う）

**検証基準**:
- 既存 `確認済み` 注釈が引き続き表示される（regression）
- Phase 1/2/3 注釈が `jaEntries` に存在する（node スクリプト or ブラウザ console.log）
- フェッチ失敗時に existing readings が消えない

#### Task 41: `_buildApparatusHTML` 自動生成注釈の表示追加

**変更先**: `public/index.html`  
**変更種別**: `UX` + `FEATURE`  
**In Scope**:
- `_buildApparatusHTML` 表示条件変更（D-3設計）
- CSS追加: `#mobile-verse-area .mvv-app-anno--auto`（D-4設計）

**Out of Scope**:
- 自動生成注釈の内容変更
- デスクトップへの追加（Task 42）
- `保留` ステータスの表示（Out of Scope のまま）

**検証基準**:
- `自動生成` 注釈が `mvv-app-anno--auto` クラスで表示される
- `確認済み` 注釈が `mvv-app-anno--auto` クラスを持たない
- `保留` 注釈が表示されない（regression）
- L4: ブラウザ DOM で正しいクラスが付与されていることを確認
- L5: 視覚的区別がユーザーに明確であること（Human Review）

#### Task 42: デスクトップへのapparatus拡張

**変更先**: `public/index.html`  
**変更種別**: `FEATURE`  
**状態**: DEFERRED（現フェーズのスコープ外）

理由: デスクトップパスには `wlv-apparatus-slot` が存在せず、`_fillApparatusSection` 呼び出しもない。デスクトップ拡張は別設計判断（デスクトップ読書体験・レイアウト）を要する。

### E-2. 実装順序

```
Task 40（ローダー統合）
    ↓ 検証: フェッチ・マージが正しい
Task 41（表示ロジック）
    ↓ 検証: 表示・CSS・regression
Task 42（デスクトップ）— DEFERRED
```

### E-3. 検証レベル

| Task | 必要レベル | 内容 |
|---|---|---|
| Task 40 | L3 | ブラウザ console で `jaEntries` の件数確認 |
| Task 41 | L4 + L5 | DOM クラス確認 + 視覚的区別の Human Review |
| Task 42 | L4 + L5 | デスクトップ DOM + Human Review |

---

## 発見事項の分類

### BLOCKER

なし。

### KEY FINDINGS（実装に必須の前提知識）

| ID | 内容 |
|---|---|
| KF-1 | apparatus（本文の異読）は現在モバイルのみ表示。デスクトップに `wlv-apparatus-slot` なし |
| KF-2 | `_buildApparatusHTML` の `status === '確認済み'` ゲートが Phase 1/2/3 全件を遮断している |
| KF-3 | `_loadApparatusJaData()` は `apparatus-ja.json`（manual 30件）のみをフェッチ |
| KF-4 | `_apparatusNoteGen` カウンタは新ローダーでも同様に機能する（変更不要） |
| KF-5 | 同一IDに複数の注釈は存在しない（Task 37 CONFIRMED）— マージ時の衝突は発生しない |

### REVIEW

| ID | 内容 | 対応 |
|---|---|---|
| REVIEW-1 | `mvv-app-anno--auto` のスタイル（透明度・色）はUI判断 | Task 41 の L5 で Human Review |
| REVIEW-2 | デスクトップへのapparatus拡張は別フェーズで設計判断が必要 | Task 42 DEFERRED |

### DEFERRED

| ID | 内容 |
|---|---|
| D-1 | Task 42（デスクトップ拡張） |
| D-2 | `保留` ステータスの表示方針（現行通り非表示維持） |
| D-3 | Phase N+1（元データ`…` 対応 70件、長文対応 156件） |

---

## 完了確認

- [x] 「本文の異読」DOM・CSS・表示条件を実コードで確認（Phase A）
- [x] apparatus本体と日本語注釈の読み込み経路・タイミング・エラー処理を確認（Phase A）
- [x] 既存手動注釈30件の表示経路と Phase 1〜3 接続点を確認（Phase A-5, B-2）
- [x] stale injection 防止メカニズムを確認（Phase A-4）
- [x] デスクトップとモバイルの表示差を確認（Phase A-1, A-2, A-6）
- [x] フォールバック動作を確認（Phase A-7）
- [x] データ契約・優先順位・表示条件を設計（Phase B）
- [x] 読み込み方式を比較・推奨（Phase C）
- [x] 最小UI設計を確定（Phase D）
- [x] 実装計画を最大3タスクに分割（Phase E）
- [x] HTML・CSS・JavaScript・JSONを変更していない（READ ONLY 維持）
- [x] コミット・push・PRを行っていない

---

*監査 CONFIRMED: 上記は全て実コード（public/index.html）・実データ・実行結果に基づく。推測は含まない。*
