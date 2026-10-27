# Task 15 監査報告: B-3 回帰確認 + τὴν detInline 問題診断

Date: 2026-10-21
対象ファイル: `app/rk-diagram-m3.html` (READ ONLY)
監査種別: AUDIT — コード・データ変更なし

---

## 1. 作業開始時の Git SHA と作業ツリー状態

```
SHA: b08a0b73fc53f7f18549c5f1e434169a9b00c55a6350d5ebc267a816f464ead7
Branch: (lowfat-handover local, not tracked in gnt-jp git)
Status: 変更なし (READ ONLY)
```

Task 14 での変更箇所:
- `hPhrase()` line 8384-8385: ofNPNP override 追加
- `phrase()` line 8401-8402: ofNPNP override 追加

---

## A. Task 14 回帰確認

### A-1. ofNPNP 総数と構造分類

| 項目 | 値 |
|---|---|
| 全データ (`data/lowfat/*.xml`) | **581件** |
| 子要素数 | **全件 2子 (例外なし)** |
| 最終子が NONHEAD (det/prep/conj) | **0件** |

**CONFIRMED**: 全 581件が 2子構造、最終子は全件 NONHEAD でない。
`hi = ks.length - 1 = 1` は全件に安全に適用できる。

### A-2. 子要素パターン別 — head 選択の変化

| パターン | 件数 | 修正前 hi | 修正後 hi | 変化 | 正しいか |
|---|---|---|---|---|---|
| w:pron / wg:np | 225 | 0 (pron) **誤** | 1 (wg) | YES | ✓ |
| w:pron / w:noun | 117 | 0 (pron) **誤** | 1 (noun) | YES | ✓ |
| wg:np / w:noun | 89 | 1 (noun) 正 | 1 (noun) | no | ✓ |
| w:noun / w:noun | 61 | 0 (noun) **誤** | 1 (noun) | YES | ✓ |
| wg:np / wg:np | 28 | 0 (wg) **誤** | 1 (wg) | YES | ✓ |
| w:adj / w:noun | 16 | 1 (noun) 正* | 1 (noun) | no | ✓ |
| w:noun / wg:np | 11 | 0 (noun) **誤** | 1 (wg) | YES | ✓ |
| wg:np / w:adj | 9 | 1 (adj) 正 | 1 (adj) | no | ✓ |
| w:pron / w:adj | 7 | 0 (pron) **誤** | 1 (adj) | YES | ✓ |
| w:adj / wg:np | 5 | 0 (adj) **誤** | 1 (wg) | YES | ✓ |
| その他小計 | 13 | 様々 | 1 | 一部変化 | ✓ |

*adj→noun オーバーライドにより既に正しく選択されていた

**CONFIRMED**: 修正前に正しかった hi を誤方向へ変更するケースは 0件。

### A-3. 例外構造の有無

以下は全件確認済み (CONFIRMED):
- 全件 2子構造
- 第1子 = 属格修飾語 (pron, noun, adj, wg など)
- 第2子 (最終子) = head NP (noun, wg:np, wg:adjp, wg:cl など)
- 最終子が det/prep/conj (NONHEAD) のケース: 0件

特殊ケースとして確認した非典型パターン (各1-2件):

| パターン | 例 | 分類 |
|---|---|---|
| w:pron/w:adv | μου/πλησίον (LUK) | pron 属格 + 副詞的 head (副詞の実質化用法) ✓ |
| w:pron/w:verb | ἑαυτοῦ/ὑπάρχουσιν (LUK) | pron 属格 + 実質化分詞 ✓ |
| w:adj/w:adj | πάντων/ἔσχατος (MRK) | 属格 adj + 実質化 adj ✓ |
| wg:np/wg:adjp | γυναικῶν.../οὐκ ὀλίγαι (ACT) | 属格 NP + adjp head (数量表現) ✓ |
| w:det/wg:np | Τοῦ/καὶ γένος (ACT) | det 属格 + NP head (修正前から hi=1 ✓) |

**CONFIRMED**: いずれも最終子が意味的 head であることが確認できる。修正前から正しかったケース (wg:np/w:noun, w:adj/w:noun, wg:np/w:adj) に変化なし。

### A-4. 実行時検証 — 3 John 1:1-15 (4件)

| 件 | 参照 | 構造 | head NP y | pron y | 方向 |
|---|---|---|---|---|---|
| 1 | 3JN 1:2 | σου/ψυχή (DetNP) | ψυχή y=446 | σου y=484 | ψυχή < σου ✓ |
| 2 | 3JN 1:3 | σου/ἀληθείᾳ (DetNP) | ἀλ y=718 | σου y=756 | ἀλ < σου ✓ |
| 3 | 3JN 1:6 | σου/ἀγάπῃ (DetNP) | ἀγ y=1672 | σου y=1710 | ἀγ < σου ✓ |
| 4 | 3JN 1:10 | αὐτοῦ/ἔργα (DetNP) | ἔρ y=2980 | αὐ y=3018 | ἔρ < αὐ ✓ |

(y座標が小さいほど上位 = head 位置)

mod エッジ方向:
- 全4件: `NP_head → pron` (正しい方向) ✓
- 全4件: `pron → NP_head` は存在しない ✓

**PASS 20 / FAIL 0** (task15_regression_3john.cjs)

### A-5. COL baseline 維持確認

| 確認項目 | 結果 |
|---|---|
| P1 vo Εὐχαριστοῦμεν→καθώς (aX=0) | PASS |
| P2 dash καθώς→ἐστίν | PASS |
| B-3: ἀがπην が δηλώσας と同 y=1950 | PASS |
| B-3: ὑμぶん が ἀがπην より下 (y=2034) | PASS |
| vo→ἀがπην 存在 | PASS |
| COL 総エッジ数 86 | PASS |

### A-6. 既存テスト (task7_verify.js)

PASS 11 / FAIL 3 — Task 11 baseline と完全一致。新規 FAIL ゼロ。

---

## B. τὴν の detInline 問題の診断

### B-1. 対象の特定

| 書巻・章・節 | 参照 | 語 | class |
|---|---|---|---|
| COL 1:8!5 | COL 1:8!5 | τὴν | det |

LOWFAT 上の位置:
```
wg role=o rule=DetNP
  w class=det         τὴν      ← 第1子 (NONHEAD)
  wg rule=ofNPNP      ← 第2子 (wg head = B-3修正により ἀがπην)
    w class=pron      ὑμぶん
    wg rule=NpPp      rk-dx=-802 rk-dy=602
      w class=noun    ἀがπην
      wg rule=PrepNp
        w class=prep  ε
        w class=noun  πνεύματι
```

### B-2. 現在の RK 表示

Task 14 修正後の測定値:

| 語 | x | y | エッジ |
|---|---|---|---|
| ἀがπην (head) | 959 | 1950 | — |
| τὴん | 989 | **2080** | mod ← ἀがπην (yDiff=130) |

mod エッジ: `ἀがπην(y=1950) → τὴん(y=2080)` — τὴん は ἀがπην の下 130px に modifier として配置されている。

### B-3. detInline が適用されない理由

`phrase([τὴん, ofNPNP], x, y)` 内の処理:

1. `pi = -1` (prep なし)
2. `hi = ks.findIndex(w && !NONHEAD)` → τὴん is det = NONHEAD → `hi = -1`
3. `hi = ks.findIndex(wg)` → ofNPNP at index 1 → `hi = 1`
4. ofNPNP override: 親 rule = DetNP ≠ ofNPNP → 不適用 (ofNPNP override は現在の phrase() が処理する wg の親の rule をチェック)
5. `rest = [τὴん(det)]`, `isWg = true`, `hoist = false`
6. detInline チェック:
   - `rule='AdjpNp'` → 不一致
   - `rule='NPofNP'` → 不一致 (**`'NPofNP'` のみ対応、`'ofNPNP'` は未対応**)
   - `rule='NPDetAdj'` → 不一致
   - `class='cl'` → 不一致
7. すべて不一致 → `place(ofNPNP, x, y)`, `mods(ἀがπην, [τὴん], x, y+h)` → τὴん が mod として下位配置

### B-4. 比較: 同一 COL の NPofNP ケース

COL 1:4 に存在する別の DetNP:
```
DetNP (role=o)
  τὴん (det, NONHEAD)
  wg rule=NPofNP → χάριν τοῦ θεοῦ
```

こちらは `rule='NPofNP'` に対する detInline が存在 (line 8417):
```javascript
if(detInline&&ks[hi].tagName==='wg'&&A(ks[hi],'rule')==='NPofNP'&&
   rest.length>0&&rest.every(k=>k.tagName==='w'&&A(k,'class')==='det')){
  const npKids=kids(ks[hi]);const npHead=npKids[0];
  if(npHead&&npHead.tagName==='w'&&!NONHEAD.has(A(npHead,'class'))){
    // τὴん を χάριν の前に inline 配置
  }
}
```
→ τὴん が χάριν の前に inline 配置される ✓

差異: NPofNP は head が**第1子** (χάριν)、ofNPNP は head が**最終子** (ἀがπην) → 既存の NPofNP detInline は ofNPNP に流用できない。

### B-5. 問題の分類

**判定: A — "LOWFAT統語関係は正しく、冠詞の配置だけが不自然"**

根拠:
1. **エッジ方向は正しい**: mod エッジ `ἀがπην → τὴん` は「τὴん が ἀがπην を含む NP を修飾する」を正しく表現している。
2. **LOWFAT の親子関係は正しく反映されている**: τὴん は DetNP の子、ἀがπην は DetNP の head — この関係が mod エッジに表れている。
3. **問題は視覚的配置のみ**: 標準 RK 表記では冠詞は名詞と同一ベースラインに前置される (detInline)。現在は τὴん が ἀがπην の 130px 下に別行として配置されている。
4. **読み違えリスクは低**: τὴん→ἀがπην の mod エッジが存在するため「何の冠詞か」は図から読み取れる。ただし視覚的に非標準。

### B-6. 次に必要な修正 (Task 16 候補)

detInline に `rule='ofNPNP'` head ケースを追加:

```javascript
// detInline (ofNPNP head): ofNPNP の最終子 (head NP) の head語 が w のとき
//   det を ofNPNP の前に inline 配置
if(detInline&&ks[hi].tagName==='wg'&&A(ks[hi],'rule')==='ofNPNP'&&
   rest.length>0&&rest.every(k=>k.tagName==='w'&&A(k,'class')==='det')){
  const npKids=kids(ks[hi]);const npHead=npKids[npKids.length-1]; // 最終子
  // npHead の head を取得してチェック
  // ... (NpPp の場合 place() での head は phrase() に委ねる)
}
```

実装上の課題: ofNPNP の head NP (NpPp) はさらに PrepNp を含み、直接の先頭語が w でない場合がある。NPofNP detInline との対称的な実装が必要。

---

## 7. 実行した検証

| スクリプト | 結果 | 内容 |
|---|---|---|
| `task15_regression_3john.cjs` | **PASS 20 / FAIL 0** | 3John 4件 head 選択 + COL baseline |
| `task14_b3_verify.cjs` (Task 14) | PASS 14 / FAIL 0 | COL B-3 修正確認 (参照) |
| `task7_verify.js` | PASS 11 / FAIL 3 | 既存テスト baseline 維持 |
| Python 静的解析 | 581件全件確認 | 例外構造なし |

---

## 8. 未確認事項

| 項目 | 状態 | 理由 |
|---|---|---|
| NT 全体 (581件) の実行時視覚確認 | **NOT VERIFIED** | 27書巻すべての実行時テストは本 Task の Scope 外 |
| 非典型パターン (w:pron/w:verb 等) の実行時確認 | **NOT VERIFIED** | 1-2件の希少ケース、静的には正しいと判定 |
| Acts AdvpAdjp ケース (2件) の視覚確認 | **NOT VERIFIED** | 実行時確認していない |
| rk-dx=-802 rk-dy=602 値の XML クリーンアップ | **DEFERRED** | Task 14 スコープ外 |

---

## 9. 次のタスク提案

### Task 16 (推奨): ofNPNP head の detInline 対応

- **目的**: DetNP{τὴん, ofNPNP{...}} パターンで τὴん を ἀがπην の前に inline 配置する
- **分類**: UX (視覚的配置の標準化)
- **制約**: B-3 fix (Task 14) 维持、ofNPNP 以外の detInline ルール変更なし
- **影響**: `data/lowfat/*.xml` 中の ofNPNP を持つ DetNP の件数を事前確認
- **優先度**: 低 (統語関係は正しく表示されており、読み間違えリスクが低い)

### 参考: NT 全体 ofNPNP 件数 (書巻別上位)

| 書巻 | 件数 |
|---|---|
| John | 71 |
| Luke | 61 |
| Matthew | 58 |
| Acts | 57 |
| Hebrews | 39 |

---

## 完了状態

| 項目 | 状態 |
|---|---|
| READ ONLY 維持 | ✓ コード・XML 変更なし |
| B-3 回帰: 静的全件確認 | ✓ 581件例外なし |
| B-3 回帰: 実行時確認 (3John) | ✓ PASS 20 / FAIL 0 |
| B-3 回帰: 既存テスト baseline | ✓ PASS 11/FAIL 3 維持 |
| τὴん detInline: 原因特定 | ✓ ofNPNP head の detInline 未対応 |
| τὴん detInline: 分類 | ✓ **Category A** (関係は正しく、配置のみ非標準) |
| 次 Task 提案 | ✓ Task 16 候補として記録 |

**結論**: Task 14 の B-3 修正は 581件全件に対して安全に適用されており、3John での実行時確認でも mod 方向が全件正しいことを確認した。τὴん の detInline 問題は統語関係の誤表示ではなく視覚的配置の非標準（Category A）であり、次の独立 Task で対応できる。
