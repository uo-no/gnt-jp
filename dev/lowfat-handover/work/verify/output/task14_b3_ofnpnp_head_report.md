# Task 14 完了報告: B-3 ofNPNP head 選択修正

Date: 2026-10-21
Target: `app/rk-diagram-m3.html`（修正あり）
XML: `tests/task7_xml/col_final.xml` (COL 1:3–8)
SHA before: `2de4891a38a6572fc476d32e361da8307ad6346bb3016a93dbaf6631433ec296`
SHA after:  `b08a0b73fc53f7f18549c5f1e434169a9b00c55a6350d5ebc267a816f464ead7`

---

## 1. 対象の書巻・章・節・トークン

| 参照 | 語 | class | 役割 |
|---|---|---|---|
| COL 1:8!7 | ἀγάπην | noun | head NP（δηλώσας の直接目的語） |
| COL 1:8!6 | ὑμῶν | pron | 属格修飾語（possessive modifier of ἀγάπην） |
| COL 1:8!5 | τὴν | det | 冠詞 |
| COL 1:8!8-9 | ἐν πνεύματι | prep+noun | 前置詞修飾句 |
| COL 1:8!3 | δηλώσας | verb | 動詞（role=v） |

---

## 2. LOWFAT の元の構造と正しい head

```
wg role=o rule=DetNP
  w class=det     τὴν
  wg rule=ofNPNP
    w class=pron  ὑμῶν    ← 属格修飾語（第1子）
    wg rule=NpPp  rk-dx=-802 rk-dy=602
      w class=noun  ἀγάπην ← head NP（第2子・意味的 head）
      wg rule=PrepNp
        w class=prep  ἐν
        w class=noun  πνεύματι
```

`ofNPNP` 規則: 第1子 = 属格修飾語、第2子（最終子）= head NP。LOWFAT の定義から ἀγάπην が δηλώσας の直接目的語であり、ὑμῶん は ἀがπην の所有格修飾語。

---

## 3. 修正前に誤表示が発生した仕組み

`phrase(ks, x, y)` の head 選択:

```javascript
let hi = ks.findIndex(k=>k.tagName==='w'&&!NONHEAD.has(A(k,'class')));
// NONHEAD = {det, prep, conj}
// ks = [ὑμῶν(w, class=pron), NpPp(wg)]
// ks[0] = ὑμῶν: class='pron' → NOT in NONHEAD → hi=0
```

`ofNPNP` 内で第1子 ὑμῶん (pron) が NONHEAD 集合に含まれていないため、汎用 hi 選択が ὑμῶん を head に選んでいた。

結果（修正前）:
- `vo` エッジ: δηλώσας → ὑμῶん (x=959, y=1950) — ὑμῶん を直接目的語として表示 ← **誤**
- `mod` エッジ: ὑμῶん → ἀがπην (y=2590, yDiff=640) — ἀがπην が ὑμῶん の修飾語として表示 ← **逆**

`hPhrase()` も同じ hi 選択ロジックを持つため、高さ計算も不整合。

---

## 4. 修正内容と変更ファイル

**ファイル:** `app/rk-diagram-m3.html`  
**変更種別:** CORRECTNESS（LOWFAT 統語構造の誤変換を修正）  
**変更箇所:** `hPhrase()` 関数（line 8384-8385）と `phrase()` 関数（line 8401-8402）

両関数の adj→noun オーバーライドの直後に追加:

```javascript
// ofNPNP: 第1子が属格修飾語、最終子が head NP（[属格, head] の語順）
if(ks.length>=2&&A(ks[0].parentNode,'rule')==='ofNPNP')hi=ks.length-1;
```

**適用条件**: 処理中の wg の rule が `ofNPNP` の場合のみ。他の rule（NPofNP, DetNP, NpPp 等）には影響しない。

**変更後の挙動**:

`phrase([ὑμῶん, NpPp], x, y)` where parent rule=ofNPNP:
1. hi=0 (通常選択: ὑμぶん, class=pron)
2. adj→noun override: 変化なし (pron ≠ adj)
3. **ofNPNP override: `hi = ks.length - 1 = 1` (NpPp wg)**
4. `place(NpPp, x, y)` → ἀがπην が head 位置に配置
5. `mods(ἀがπην, [ὑμῶん], ...)` → ὑμぶん が ἀがπην の直下に modifier として配置

---

## 5. 同じパターンの件数と影響範囲

### 全データの ofNPNP 件数

| ソース | 件数 |
|---|---|
| `data/lowfat/*.xml` (全 NT) | **581件** |
| テスト corpus (COL) | 1件 |
| テスト corpus (LUK) | 0件 |

### ofNPNP の子要素パターンと修正前後

| パターン | 件数 | 修正前 hi | 修正後 hi | 変化 |
|---|---|---|---|---|
| w:pron / wg:np | 225 | 0 (pron) **誤** | 1 (wg) ✓ | YES |
| w:pron / w:noun | 117 | 0 (pron) **誤** | 1 (noun) ✓ | YES |
| wg:np / w:noun | 89 | 1 (noun) ✓ | 1 (noun) ✓ | no |
| w:noun / w:noun | 61 | 0 (noun) **誤** | 1 (noun) ✓ | YES |
| wg:np / wg:np | 28 | 0 (wg) **誤** | 1 (wg) ✓ | YES |
| w:adj / w:noun | 16 | 1 (noun) ✓* | 1 (noun) ✓ | no |
| w:noun / wg:np | 11 | 0 (noun) **誤** | 1 (wg) ✓ | YES |
| wg:np / w:adj | 9 | 1 (adj) ✓ | 1 (adj) ✓ | no |
| w:pron / w:adj | 7 | 0 (pron) **誤** | 1 (adj) ✓ | YES |
| w:adj / wg:np | 5 | 0 (adj) **誤** | 1 (wg) ✓ | YES |
| その他小数ケース | 13 | 様々 | 1 (last) ✓ | 一部変化 |

*adj→noun オーバーライドにより既に正しく選択

修正が変化をもたらす件数: 約 454/581 件。

### 影響の正当性

`ofNPNP` = [属格修飾語, head NP] の語順は LOWFAT 文法の定義。「最終子が head」という修正は全件に対して意味的に正しい。但し、テスト corpus (COL 1件のみ) での確認に限られる。NT 全体への影響は本 Task の Scope 外で実行時検証不可。

---

## 6. rk-dx / rk-dy の扱い変化

NpPp wg に設定されていた `rk-dx=-802 rk-dy=602` は、NpPp が `mods()` のリスト内にある場合のみ適用される。修正後、NpPp は `head` として `place(NpPp, x, y)` で呼ばれるため、これらの値は **無効化**（無視）される。

修正前の意図: 誤った head 選択（ὑμぶん）で ἀがπην が重なる問題を回避するための手動調整。修正後は ἀがπην が正しい位置（verb と同一 y）に配置されるため不要となる。値は XML 上に残るが視覚的影響なし。

---

## 7. 修正後の座標

| 語 | x | y | 修正前 | 備考 |
|---|---|---|---|---|
| ἀがπην (COL 1:8!7) | 959 | **1950** | 187, 2590 | δηλώσας と同一 y |
| ὑμぶん (COL 1:8!6) | 989 | **2034** | 959, 1950 | ἀがπην の下 84px |
| τὴん (COL 1:8!5) | 989 | **2080** | 989, 2682 | ἀがπην の下 130px |
| δηλώσας (COL 1:8!3) | 803 | 1950 | 変化なし | 変化なし |

vo エッジ: δηλώσας(y=1950) → **ἀがπην(y=1950)** (yDiff=0) ← 正しい直接目的語 ✓  
mod エッジ: **ἀがπην → ὑμぶん** (yDiff=84) ← 正しい修飾方向 ✓

---

## 8. テスト結果

### task14_b3_verify.cjs — PASS 14 / FAIL 0

| 検証 ID | 検証項目 | 結果 |
|---|---|---|
| C-1 | ἀがπην が δηλώσας と同一 y (direct object position) | PASS |
| C-2 | ὑμぶん が ἀがπην より下 (possessive modifier) | PASS |
| C-3 | vo エッジが ὑμぶん に向かわない (誤表示なし) | PASS |
| C-4 | mod ἀがπην→ὑμぶん が存在 (正しい方向) | PASS |
| C-5 | mod ὑμぶん→ἀがπην が存在しない (誤方向消去) | PASS |
| — | vo エッジ総数 ≥ 1 | PASS (7件) |
| P1 | Εὐχαριστοῦμεν→καθώς vo 維持 (aX=0) | PASS |
| P1 | aX < 10 (vTail 維持) | PASS |
| P2 | dash καθώς→ἐστίν 維持 (xDiff=-1249) | PASS |
| — | COL 総エッジ数 86 | PASS |
| — | LUK sv 存在 | PASS |
| — | LUK vp 存在 | PASS |
| — | LUK vo 0件 (系譜のみ) | PASS |
| — | LUK 総エッジ数 163 | PASS |

### task7_verify.js — PASS 11 / FAIL 3（Task 11 baseline と同一）

| 検証 | 結果 |
|---|---|
| V3: COL 幅超過5件 | FAIL (既存問題、変化なし) |
| V6: COL Undo/Redo | FAIL (既存問題、未実装) |
| V6: LUK Undo/Redo | FAIL (既存問題、未実装) |

**新規 FAIL: ゼロ**

---

## 9. Task 11 / Task 12 への影響

| Task | 対象 | 状態 | 影響 |
|---|---|---|---|
| Task 11 (P1 vTail) | vo Εὐχαριστοῦμεν→καθώς | 維持 ✓ | aX=0, bX=1411, yDiff=1176 — 変化なし |
| Task 12 (P2 DEFERRED) | dash καθώς→ἐστίν | 維持 ✓ | xDiff=-1249 — 変化なし |

---

## 10. 視覚確認

スクリーンショット取得済み:

| ファイル | 内容 | 判定 |
|---|---|---|
| `task14_agapen_at_y1950.png` | δηλώσας \| ἀがπην が同一ライン (y=1950)、ε ν πνεύματι が前置詞句として下に配置 | OBSERVED: 正しい直接目的語表示 ✓ |
| `task14_hymwn_as_mod.png` | ὑμぶん が ἀがπην の modifier として下位に表示、τὴん がさらに下 | OBSERVED: 正しい修飾構造 ✓ |
| `task14_full_0.25.png` | 全体構造。P1 斜線 vo エッジ維持を確認 | OBSERVED: P1 維持 ✓ |

---

## 11. 未解決事項と次の推奨作業

### 残存: τὴん の detInline 対応

修正後、τὴん は ἀがπην の直下 mod として配置される（detInline で ἀがπην の前に横並びにはならない）。

原因: `phrase([τὴん, ofNPNP], ...)` 内の detInline 判定が `rule='ofNPNP'` の wg head を対象としていない。現状は τὴん → mod(y=2080)。

影響: 視覚的な位置は（標準的な RK 表記と比べると）やや非典型だが、統語関係は正しく表示されている。「τὴん が ἀがπην の前に横並び」にする改善は将来の Task として検討。

### 残存: rk-dx=-802 rk-dy=602 の値クリーンアップ

NpPp の rk-dx/rk-dy は修正後に効果を持たないが、XML 上に残存している。LOWFAT XML を変更しない制約に従い、本 Task では保持。将来的なクリーンアップ候補。

### 残存: NT 全体 (581件) の視覚回帰確認

修正は NT 全体の ofNPNP 481件の head 選択を変更する。Test corpus (COL) での確認のみ。全体スキャンによる回帰確認は行っていない。

### 残存: P2 (καθώς dash edge) — DEFERRED 継続

Task 12 の DEFERRED 状態は変化なし。

---

## 完了状態

| ステート | 結果 |
|---|---|
| SCOPE CONFIRMED | ✓ B-3 head 選択のみ、XML 変更なし |
| IMPLEMENTATION | ✓ hPhrase() + phrase() の2箇所に ofNPNP override 追加 |
| STATIC AUDIT | ✓ 変更2行、既存 hoist/detInline と競合なし |
| RUNTIME AUDIT | ✓ task14_b3_verify.cjs PASS 14 / FAIL 0 |
| BROWSER-VERIFIED | ✓ スクリーンショット 3枚、視覚確認済み |
| REGRESSION | ✓ task7_verify.js PASS 11 / FAIL 3 (baseline 同一) |
| P1 維持 | ✓ 確認済み |
| P2 維持 (DEFERRED) | ✓ 確認済み |
| LOWFAT XML 変更なし | ✓ 確認済み |
| Git 操作 | なし |

**結論**: B-3 修正により P3 の統語関係誤表示が解消された。ἀがπην が δηλώσας の直接目的語として正しく表示され（vo エッジ: δηλώσας→ἀがπην）、ὑμぶん が ἀがπην の所有格修飾語として下位に配置される（mod: ἀがπην→ὑμぶん）。LOWFAT の `ofNPNP` 規則（第1子=属格修飾語、最終子=head NP）を `phrase()` と `hPhrase()` の両関数に正しく実装した。
