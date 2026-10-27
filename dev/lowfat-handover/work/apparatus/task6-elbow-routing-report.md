# Task 6：L字形接続線 実装・検証報告

作成日: 2026-10-20  
対象: `app/rk-diagram-m3.html`  
変更箇所: `pd()` 関数（lines 8436-8437、2行変更）  
検証スクリプト: `tests/pd_elbow_verify.js`  
スクリーンショット: `tests/pd_elbow_ss/`（15件）  
回帰テスト: `tests/grp_dx_test.js` 42/42 PASS

---

## Phase 1：変更前確認

### pd() の実装と呼び出し元

```javascript
function pd(e){const a=e.a,b=e.b,ay=a.y+4,by=b.y+4;
  if(e.kind==='mod')return`M${a.x+Math.min(14,a.w)},${ay}L${b.x-PADX},${by}`;
  if(e.kind==='dash')return`M${a.x+a.w/2},${ay+6}L${b.x+b.w/2},${by-24}`;
  const ar=a.x+a.w+4,bl=b.x-4,d=`M${ar},${ay}L${bl},${by}`;if(e.kind==='cont')return d;
  ...
}
```

**呼び出し元:**
| 関数 | 行 | 用途 |
|---|---|---|
| `draw()` | 8445-8446 | 初期描画・全エッジ生成 |
| `moved()` | 8456 | 語句個別ドラッグ中の更新 |
| `startGroupDrag()` paint() | 8641 | グループドラッグ中のリアルタイム更新 |

`pd()` は純粋関数（副作用なし）。戻り値は SVG パス文字列のみ。

### FROZEN 確認

CLAUDE.md に記載の FROZEN モジュール（`reading-engine.js`, `reading-context.js`, `presentation-policy.js`, `phrase-renderer.js` 等）はいずれも reading 側のコアモジュール。`pd()` は `rk-diagram-m3.html` 内の描画関数であり FROZEN リストに含まれない。

VERDICT: **変更可能**。

### エッジ種別と影響範囲

| エッジ種別 | 意味 | a → b の方向 | 変更対象 |
|---|---|---|---|
| `mod` | 修飾線（斜め） | 修飾先 HEAD → 修飾グループ LEAD | YES（条件付き） |
| `dash` | グループ間点線 | 上グループ HEAD → 下グループ HEAD | YES（条件付き） |
| `cont` | 節内水平リンク | 左語右端 → 右語左端 | **変更なし** |
| `sv` / `vo` / `vp` | 述語ラベル付き水平リンク | 同上 | **変更なし** |

### 座標系確認

- `PADX = 3`（語枠の左右余白、下線端点と共通）
- `ay = a.y + 4`（語句ベースラインの中心付近）
- `mod` 終点: `b.x - PADX = b.x - 3`（modifier 語の左端直前）
- `dash` 終点 y: `by - 24`（modifier 語の頭から 24px 上）

---

## Phase 2：実装内容

### 変更前（lines 8436-8437）

```javascript
  if(e.kind==='mod')return`M${a.x+Math.min(14,a.w)},${ay}L${b.x-PADX},${by}`;
  if(e.kind==='dash')return`M${a.x+a.w/2},${ay+6}L${b.x+b.w/2},${by-24}`;
```

### 変更後（lines 8436-8437）

```javascript
  if(e.kind==='mod'){const sx=a.x+Math.min(14,a.w),tx=b.x-PADX;if(Math.abs(tx-sx)>150&&Math.abs(by-ay)>40)return`M${sx},${ay}V${by}H${tx}`;return`M${sx},${ay}L${tx},${by}`}
  if(e.kind==='dash'){const sx=a.x+a.w/2,tx=b.x+b.w/2;if(Math.abs(tx-sx)>150&&Math.abs(by-ay)>40)return`M${sx},${ay+6}V${by-24}H${tx}`;return`M${sx},${ay+6}L${tx},${by-24}`}
```

### L 字形ルーティングロジック

```
条件: |tx - sx| > 150  AND  |by - ay| > 40
→ 垂直優先 L 字形: M sx,sy  V by  H tx
   （source から垂直に target-y まで移動、次に水平に target-x まで移動）
条件を満たさない場合: 既存直線 (L) を維持
```

**注: `cont`/`sv`/`vo`/`vp` は一切変更しない。**

---

## Phase 3：描画検証

### 自動テスト結果（pd_elbow_verify.js）

| テスト | 内容 | 結果 |
|---|---|---|
| T0a | pd() 定義確認 | PASS |
| T0b | applyGroupOffset() 定義 | PASS |
| T1-pre | Colossians 最右端グループ特定 | PASS 「前置詞句「ἐν πνεύματι.」」x0=2224 |
| **T1a** | Colossians 折り返し後 mod が L字形 | **PASS** — elbow: `M2208,908V1046H17` |
| **T1b** | DOM path.d と pd() 結果が一致 | **PASS** — 1/1 一致 |
| T1c | 短い mod エッジ（73件）が直線を維持 | PASS |
| T1d | cont/sv/vo/vp が影響を受けない | PASS — 全直線 |
| T1e | エルボー折れ点 zoom スクリーンショット取得 | PASS — bend=(2208,1046) |
| T1f | Undo 後 L字形が直線に戻る | PASS — 0件残存 |
| T2-pre | Luke 最下端グループ特定 | PASS 「名詞句「τοῦ Νῶε τοῦ」」x0=2491 |
| **T2a** | Luke 折り返し後 mod/dash が L字形 | **PASS** — mod 1件: `M2475,5702V5886H1888` |
| T2b | DOM path.d と pd() 結果が一致 | PASS — 1/1 一致 |
| T2c | cont/sv/vo/vp が影響を受けない | PASS |
| T2e | Luke エルボー折れ点 zoom スクリーンショット取得 | PASS |
| T3a | Auto Layout後は全 mod エッジが直線 | PASS — 74件全直線 |
| T4a | 縦移動のみ（dy=60 dx=0）では L字形にならない | PASS — 全直線 |
| T5a | 折り返し後に L字形 mod が存在する | PASS — 1件 |
| T5b | Undo 後 L字形 mod が消える | PASS — 0件残存 |
| T5c | Redo 後 L字形 mod が復元する | PASS — 1件 |
| T6a | レイアウト編集モードで eh ドラッグハンドル存在 | PASS — 47件 |
| T7 | コンソールエラーなし | PASS — 0件 |

**合計: PASS 23 / FAIL 0 / WARN 0**

### ブラウザ描画確認（スクリーンショット）

#### Colossians 1:3-8（折り返し後）

- **`t1_col_elbow_tight.png`**: エルボー折れ点（bend at SVG 2208,1046）を中心にズーム。δηλώσας 付近から垂直に下降し、y=1046 で直角に折れる L 字形の折れ点が明確に視認できる。
- **`t1_col_target_zoom.png`**: 折り返し先（ἐν πνεύματι. / τῷ）を中心にズーム。水平セグメントが左端 x≈17 に到達している。句枠ラベル「前置詞句」も確認。
- **`final_col_elbow_bend.png`**: 折れ点周辺のパノラマビュー。δηλώσας → 垂直下降 → 左折のL字形経路が、主節構造の他の語句（καὶ, ἡμῖν, ἀγάπην, τὴν, ο）とともに確認できる。

**CONFIRMED**: L 字形折れ点が SVG DOM に正しく描画されている。

#### Luke 3:23-38（折り返し後）

- **`t2_luk_elbow_wide.png`**: 系譜カスケード + 折り返し後の全体ビュー。系譜の末尾グループ「τοῦ Νῶε τοῦ」から L 字形で接続。
- **`t2_luk_elbow_tight.png`**: エルボー折れ点（SVG 2475,5886）周辺ズーム。
- **`t2_luk_elbow_hrun.png`**: 水平ランの中間部。

**CONFIRMED**: Luke 系譜においても L 字形が正しく描画されている。

### 残課題（NOT VERIFIED / 観察事項）

| 項目 | 状態 | 理由 |
|---|---|---|
| 極端な折り返し（dx=-2771 等）での視認性 | NOT VERIFIED（Task 5 参照） | 現行テストは dx=-600 程度。極端値でも機能するが視認性は現状未計測 |
| スマホ実機での確認 | NOT VERIFIED | Puppeteer ヘッドレス環境での検証のみ |
| ドラッグ中の L字形 → 直線スナップ動作の視覚的確認 | NOT VERIFIED | 自動テストでハンドル存在は確認（47件）。ドラッグアニメーション中の挙動は手動確認未実施 |
| 句枠との交差増減 | NOT VERIFIED | Task 5 で確認した「句枠崩壊」問題は本 Task 外（独立問題） |
| プレビューモードでの描画 | NOT VERIFIED | テスト T6 でプレビュー切替は確認済みだが L 字形との組み合わせは未確認 |

---

## Phase 4：回帰テスト

```
grp_dx_test.js  PASS: 42 / FAIL: 0
```

確認項目:
- グループ縦横移動（rk-dy / rk-dx）
- Undo / Redo
- XML 保存・再読み込み（rk-dx/rk-dy 属性の保持）
- Auto Layout の繰り返しによる座標累積変化なし
- 構造編集
- ズーム・パン・プレビュー・画角ガイド
- gc1 / gc4 回帰（Colossians / Luke での複合操作）

---

## Phase 5：変更サマリー

### 変更前後の SHA-256

| 状態 | SHA-256 |
|---|---|
| **変更前**（Task 4 完了後） | `3e9820db87195fa1e6498bb7a6caf4308f6134f4d0460d1b0f295124deb0b9e0` |
| **変更後**（Task 6 完了後） | `b67bda235e3e9364bb1c46ace90cc5ec59ee72d84e750f04694162e643a321c8` |

### 変更の範囲

| 項目 | 状態 |
|---|---|
| 変更ファイル | `app/rk-diagram-m3.html` のみ（1 ファイル） |
| 変更行数 | 2行（lines 8436-8437） |
| 公開版への影響 | なし（`rk-diagram.html` は本リポジトリに存在しない） |
| デプロイ | 未実施 |
| 構造データ変更 | なし |
| 座標・XML保存仕様変更 | なし |
| rk-dx / rk-dy 仕様変更 | なし |
| FROZEN モジュールへの変更 | なし |

### 変更種別

`UX` — 接続線の描画経路のみを変更。構造・データ・保存仕様・L-0 境界への影響なし。

---

## 線の交差・句枠干渉に関する残課題

### 改善された問題

- **折り返し後の斜め直線が図を横断する問題（部分的に解消）**: 典型的な折り返し距離（dx ≈ 400-800）では、斜め直線が 90° の L 字形に置き換わる。接続元から垂直に下降してから水平移動するため、読者が線を目で追いやすくなる。

### 残存する問題

- **極端な移動（dx > 2000）での水平区間の長さ**: 折れ点以降の水平セグメントが依然として図の広い範囲を横断する。L 字形によって「まず垂直、次に水平」という追跡可能性は向上するが、始点・終点を同時に画面に収めることはできない。
- **句枠崩壊（Task 5 Problem 4 より）**: 移動後のグループを包む句枠が分散した語の最小外接矩形になる問題は残存。ルーティング変更では解決不可（独立した問題）。

---

## 本 Task の Scope 外

- 読書モードへの移植
- 公開版への反映
- 自動折り返し機能の実装
- 障害物回避ルーティング
- 折れ点の手動編集
- 閾値（|dx|>150, |dy|>40）の UI 調整機能

---

*記録作成: 2026-10-20 Claude Sonnet 4.6*
