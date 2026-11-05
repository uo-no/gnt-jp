# Stage 4 Phase 4u — re-stageB ブラウザ表示確認

**Phase**: 4u  
**実施日**: 2026-11-03  
**目的**: Phase 4t CONDITIONAL PASSとなったre-stageB 8件のブラウザ実画面表示確認  
**最終ステータス**: **PHASE 4u BROWSER AUDIT PASS**

---

## 1. 作業前確認

| 項目 | 値 |
|------|---|
| Phase 4t 判定 | CONDITIONAL PASS（UI未確認）|
| 対象 | changed→identical 5件 / changed→changed 3件 |
| Playwright | v1.63.0（chromium） |
| HTTPサーバ | http://localhost:8765 (Node.js static, public/) |
| PC viewport | 1280×900 |
| Mobile viewport | 390×844 / deviceScaleFactor=2 / isMobile=true |
| 実施制限 | READ-ONLY（コード・データ・baseline変更なし） |

---

## 2. 確認対象8件

| ref | Strong | morph | expected chip gloss | transition |
|-----|--------|-------|---------------------|-----------|
| 1PE 1:6!7 | G1163 | V-PAP-NSN | 〜しなければならない | changed→identical |
| 1TI 5:13!21 | G1163 | V-PAP-APN | 〜しなければならない | changed→identical |
| ACT 10:2!17 | G1189 | V-PNP-NSM | 願いながら | changed→identical |
| ACT 19:36!5 | G1163 | V-PAP-NSN | 〜しなければならない | changed→identical |
| ROM 1:10!6 | G1189 | V-PNP-NSM | 願いながら | changed→identical |
| ACT 8:24!6 | G1189 | V-AOM-2P | 願え | changed→changed |
| LUK 10:2!13 | G1189 | V-AOM-2P | 願え | changed→changed |
| MAT 9:38!1 | G1189 | V-AOM-2P | 願え | changed→changed |

---

## 3. 語順で読む（WO mode / Tier 0/1）— PC 1280×900

`http://localhost:8765/?book=XX&ch=N` → 当該節クリック → 対象chipクリック

### 3.1 chip表示

| ref | chip表示 | 期待値 | chip.dataset.greek | 判定 |
|-----|---------|--------|-------------------|------|
| 1PE 1:6!7 | 〜しなければならない | 〜しなければならない | δέον | **PASS** |
| 1TI 5:13!21 | 〜しなければならない | 〜しなければならない | δέοντα | **PASS** |
| ACT 10:2!17 | 願いながら | 願いながら | δεόμενος | **PASS** |
| ACT 19:36!5 | 〜しなければならない | 〜しなければならない | δέον | **PASS** |
| ROM 1:10!6 | 願いながら | 願いながら | δεόμενος | **PASS** |
| ACT 8:24!6 | 願え | 願え | Δεήθητε | **PASS** |
| LUK 10:2!13 | 願え | 願え | δεήθητε | **PASS** |
| MAT 9:38!1 | 願え | 願え | δεήθητε | **PASS** |

全8件 chip gloss PASS。

### 3.2 DetailDrawer（wlv-detail-drawer）

chipクリック後に開く `wlv-detail-drawer.visible` の内容：

| ref | #wlv-dd-greek | #wlv-dd-glosses | drawer表示 |
|-----|--------------|----------------|-----------|
| 1PE 1:6!7 | δέον | 〜しなければならない | **PASS** |
| 1TI 5:13!21 | δέοντα | 〜しなければならない | **PASS** |
| ACT 10:2!17 | δεόμενος | 願う・必要とする・お願いする | **PASS** |
| ACT 19:36!5 | δέον | 〜しなければならない | **PASS** |
| ROM 1:10!6 | δεόμενος | 願う・必要とする・お願いする | **PASS** |
| ACT 8:24!6 | Δεήθητε | 願う・必要とする・お願いする | **PASS** |
| LUK 10:2!13 | δεήθητε | 願う・必要とする・お願いする | **PASS** |
| MAT 9:38!1 | δεήθητε | 願う・必要とする・お願いする | **PASS** |

**設計確認**:
- chip（WO mode）= morph展開済み日本語（"願え" / "願いながら" / "〜しなければならない"）
- drawer `#wlv-dd-glosses` = lemma複数義（"願う・必要とする・お願いする"）← WO chip gloss と異なるが設計通り（chipはmorph展開、drawerはlemma listing）

G1163 drawerのみ単一義"〜しなければならない"（lexicon-lite上の gloss_ja）。G1189 drawerは複数義"願う・必要とする・お願いする"（reading-lexicon-data.js の glosses 結合）。いずれも正常。

---

## 4. 語順で読む（WO mode）— Mobile 390×844

| ref | chip gloss | drawer visible | drawer glosses | 判定 |
|-----|-----------|---------------|----------------|------|
| 1PE 1:6!7 | 〜しなければならない | true | 〜しなければならない | **PASS** |
| 1TI 5:13!21 | 〜しなければならない | true | 〜しなければならない | **PASS** |
| ACT 10:2!17 | 願いながら | true | 願う・必要とする・お願いする | **PASS** |
| ACT 19:36!5 | 〜しなければならない | true | 〜しなければならない | **PASS** |
| ROM 1:10!6 | 願いながら | true | 願う・必要とする・お願いする | **PASS** |
| ACT 8:24!6 | 願え | true | 願う・必要とする・お願いする | **PASS** |
| LUK 10:2!13 | 願え | true | 願う・必要とする・お願いする | **PASS** |
| MAT 9:38!1 | 願え | true | 願う・必要とする・お願いする | **PASS** |

全8件モバイル PASS。

---

## 5. 文の構造で読む（DA mode）

URL suffix `/DA`。chips に `data-greek`/`data-gloss` なし、`data-token-id` のみ。`onclick="_wlvChipClick(this, tokenId)"` — WOとは異なるレンダリングパス。

**重要**: re-stageB regression test は WO mode の `chipFn(w, i, book, 1)` [Tier2] vs `chipFn(w, i, book, 1, resolved[i], words)` [Tier0/1] を比較している。DA mode は `_wlvChipClick` ベースの別パスであり、re-stageB の検証対象ではない。

### 5.1 DA mode chip表示

| ref | DA chip gloss | 備考 |
|-----|--------------|------|
| 1PE 1:6!7 | 〜しなければならない | G1163 japanese値そのまま表示 ✓ |
| 1TI 5:13!21 | 〜しなければならない | G1163 japanese値そのまま表示 ✓ |
| ACT 10:2!17 | 願う | G1189 japanese値そのまま表示（morph非適用） ✓ |
| ACT 19:36!5 | 〜しなければならない | G1163 japanese値そのまま表示 ✓ |
| ROM 1:10!6 | 願う | G1189 japanese値そのまま表示（morph非適用） ✓ |
| ACT 8:24!6 | 願う | G1189 japanese値そのまま表示（morph非適用） ✓ |
| LUK 10:2!13 | 願う | G1189 japanese値そのまま表示（morph非適用） ✓ |
| MAT 9:38!1 | 願う | G1189 japanese値そのまま表示（morph非適用） ✓ |

**DA mode の設計動作**:
- morph展開なし → `token.japanese` をそのまま chip text として表示
- G1163: "〜しなければならない" = Phase 4q 修正後の正しい japanese 値 → CONFIRMED
- G1189: "願う" = Phase 4q 修正後の正しい japanese 値 → CONFIRMED

**Phase 4q 前後の DA mode 比較（V-AOM-2P 3件）**:
- Phase 4q 前: G1210 japanese="縛る" → DA chip = "縛る"
- Phase 4q 後: G1189 japanese="願う" → DA chip = "願う"

誤認定トークン（δεῖ/δέομαι を δέω「縛る」として表示）が修正され、正しい語根「願う」に改善。

---

## 6. morph展開の検証まとめ

### 6.1 changed→identical 5件

| ref | morph | 変換ロジック | WO chip | DA chip | 判定 |
|-----|-------|------------|---------|---------|------|
| 1PE 1:6!7 | V-PAP-NSN | '〜'prefix→inf非マッチ→フォールバック | 〜しなければならない | 〜しなければならない | PASS |
| 1TI 5:13!21 | V-PAP-APN | 同上 | 〜しなければならない | 〜しなければならない | PASS |
| ACT 10:2!17 | V-PNP-NSM | う→いながら(Tier2適用) / engine resolve(Tier0/1) | 願いながら | 願う | PASS |
| ACT 19:36!5 | V-PAP-NSN | '〜'prefix→inf非マッチ→フォールバック | 〜しなければならない | 〜しなければならない | PASS |
| ROM 1:10!6 | V-PNP-NSM | う→いながら(Tier2適用) / engine resolve(Tier0/1) | 願いながら | 願う | PASS |

WO mode chip全件期待値一致。DA mode はbase formを表示（morph非適用パス）。

### 6.2 changed→changed 3件

| ref | morph | WO chip | DA chip | Tier2旧値（Phase 4q前） | 判定 |
|-----|-------|---------|---------|----------------------|------|
| ACT 8:24!6 | V-AOM-2P | **願え** | 願う | 縛よ（broken） | PASS |
| LUK 10:2!13 | V-AOM-2P | **願え** | 願う | 縛よ（broken） | PASS |
| MAT 9:38!1 | V-AOM-2P | **願え** | 願う | 縛よ（broken） | PASS |

WO mode: "願え" = 五段命令形（V-AOM-2P の正しい morph 展開）。Phase 4q 前は "縛よ"（isBrokenForm=true、機能破綻）→ 修正により "願え"（正常）に改善。

**「Tier2=願う 対 Tier0/1=願え」の意味**:
- Tier2（WO mode、engine resolveなし）: う語末尾は inf ルールにマッチしない → "願う"（base）
- Tier0/1（WO mode、engine resolveあり）: reading-engine.js が V-AOM-2P/願う を正解 "願え" に解決
- これは「Tier2の limitation」であり Phase 4q による regression ではない
- re-stageB ではこの3件が "changed" として記録されるが、Phase 4q 前（"縛よ" broken）より改善

---

## 7. ブラウザコンソールエラー

全8件のブラウザセッションで `console.error` 出力なし（network fetch error / [trans] / [initFromUrl] 等の既知ノイズを除く）。

---

## 8. スクリーンショット一覧

ディレクトリ: `/private/tmp/.../scratchpad/phase4u/`

| ファイル形式 | 件数 | 内容 |
|------------|------|------|
| PC desktop verse (`XX_Nvv_desktop_verse.png`) | 8 | 当該節クリック後 WO mode |
| PC desktop chip (`XX_Nvv_chip.png`) | 8 | chip クリック後 drawer 表示 |
| PC structure view (`desktop_structure_*.png`) | 3 | DA mode（代表3件） |
| Mobile load (`mobile_*_load.png`) | 8 | 章ロード直後 |
| Mobile verse (`mobile_*_verse.png`) | 8 | 当該節クリック後 |
| Mobile chip (`mobile_*_chip.png`) | 8 | chip クリック後 |

合計: 39スクリーンショット

---

## 9. 個別判定

| ref | transition | WO-PC | WO-Mobile | DA mode | drawer | 総合 |
|-----|-----------|-------|-----------|---------|--------|------|
| 1PE 1:6!7 | c2i | PASS | PASS | PASS | PASS | **PASS** |
| 1TI 5:13!21 | c2i | PASS | PASS | PASS | PASS | **PASS** |
| ACT 10:2!17 | c2i | PASS | PASS | PASS | PASS | **PASS** |
| ACT 19:36!5 | c2i | PASS | PASS | PASS | PASS | **PASS** |
| ROM 1:10!6 | c2i | PASS | PASS | PASS | PASS | **PASS** |
| ACT 8:24!6 | c2c | PASS | PASS | PASS | PASS | **PASS** |
| LUK 10:2!13 | c2c | PASS | PASS | PASS | PASS | **PASS** |
| MAT 9:38!1 | c2c | PASS | PASS | PASS | PASS | **PASS** |

---

## 10. 最終判定

| 確認項目 | 結果 |
|---------|------|
| WO mode chip gloss 全8件 | ✓ PASS |
| WO mode mobile chip gloss 全8件 | ✓ PASS |
| DetailDrawer Greek表示 全8件 | ✓ PASS |
| DetailDrawer lemma glosses 全8件 | ✓ PASS |
| DA mode Phase 4q japanese値反映 | ✓ CONFIRMED |
| brokenNew = 0 維持 | ✓ PASS（re-stageB絶対条件） |
| panelMismatch = 0 維持 | ✓ PASS（re-stageB絶対条件） |
| Phase 4q regression なし（WO mode） | ✓ CONFIRMED |
| コンソールエラー | ✓ なし |

Phase 4t の CONDITIONAL PASS の保留条件「UI not verified」が解消された。

**PHASE 4u BROWSER AUDIT PASS**

---

## 11. 次Phase引き継ぎ

### re-stageB baseline更新（要別途承認）

Phase 4u PASS により、re-stageB baseline 更新の前提条件が整った。

| 指標 | Phase 4m baseline | Phase 4q/4r/4s/4u 後実測 | 差分 |
|-----|-----------------|--------------------------|------|
| changed | 39,679 | 39,674 | −5 |
| identical | 98,062 | 98,067 | +5 |
| brokenOld | 1,253 | 1,245 | −8 |
| brokenNew | 0 | **0** | 0 |
| panelMismatch | 0 | **0** | 0 |

brokenNew=0 / panelMismatch=0 は絶対条件として維持。changed/identical/brokenOld の3指標は Phase 4q 実装を反映した更新が必要。

