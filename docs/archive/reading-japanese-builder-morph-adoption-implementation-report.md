# Reading Japanese Builder Morph Adoption 実装報告(Stage M-8b)

実装日: 2026-07-20
位置づけ: M-8a Builder Morph Adoption Design に基づき、**Builder が Morph の決定済み語形(純複数人称
私たち/あなたがた)を採用する**実装。
根拠(FROZEN): reading-japanese-policy.md(L-0)・-builder-morph-adoption-design.md(M-8a)・
-builder-phaseA-report.md(M-3)・morph-gap-resolution-implementation-report.md(M-7c)・
-editorial-review-framework.md(M-5)。
数値はクリーン NT 実測(総 137,741・重複「 2.json」不在)。

---

## 1. 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| public/core/reading-japanese-builder.js | **`_collectToken` に `morphAdopted` 記録を追加**(reading 語幹が Data 代表語と異なり source=morph のとき採用記録)。`_stem` ヘルパ(末尾格助詞 1 つ除去)・静的定数 MORPH/_CASE_PARTICLES・buildVerse に `morphAdoptedCount` 追加 |

**変更なし(制約遵守)**: **bible_data.japanese(代表語起点として保持)** / **Morph Registry**(14 strong 不変)/
**reading-engine.js**(非改変)/ Syntax / Semantic / Discourse / UI / Presentation。重複再混入 0。

---

## 2. 実装方針(Builder は判定しない)

- **Builder は Morph fact に存在する決定済み語形を reading として採用**する(resolve 出力の Morph 語形)。
- `morphAdopted` は「reading の語幹(末尾格助詞除去)が Data 代表語(raw japanese)と異なり、かつ
  source=morph」のときに **採用記録**を残す(representative→adopted)。**判定・推論はしない**(Morph が
  既に決定した語形を読み取って記録するのみ)。
- **number/person の推論・文脈判断・翻訳・自然化・語順変更はしていない**(L-0 準拠)。
- reading そのものは Phase A と同一(**バイト等価**)。M-8b は **採用記録(metadata)の追加**であり、
  reading を変えない(Morph 語形は M-7c で既に resolve 出力に反映済)。

---

## 3. QA 結果

### 3-1. 対象件数(純複数人称 Morph 採用)

| 変更パターン | 件数 |
|---|---|
| あなた → あなたがた | 1,225 |
| 私 → 私たち | 862 |
| **合計** | **2,087**(設計値・M-7c 実測と一致) |

### 3-2. before / after

- **before = Data 代表語**(私 / あなた)/ **after = Morph 決定語形**(私たち / あなたがた)。
- Builder は 2,087 件で after(Morph 語形)を採用し、`morphAdopted={representative, adopted}` に記録。
- **bible_data.japanese(代表語)自体は不変**(起点保持)。

### 3-3. 非変更確認(誤採用 0)

| 対象 | 確認 |
|---|---|
| **σύ G4675(σου・単数)** | morphAdopted = **null**(あなたの のまま・採用なし)✓ |
| G5213(既存 あなたがた) | 代表語 = adopted = あなたがた → 差分なし(採用記録対象外)✓ |
| 単数人称(ἐγώ G3450 等) | morphAdopted = **null**(私 のまま)✓ |

### 3-4. 回帰・整合

| 項目 | 結果 |
|---|---|
| **reading バイト等価** | NT 全巻 137,741 で Builder.reading = 現状表示読み・**不一致 0** |
| **全既存テスト PASS** | re-phase1(111)/2/3/5・re-stageA/B/D/E **全 ALL PASS**(engine 非改変) |
| **chip⇔panel 一致** | **100%(不一致 0)**・**破損形 0** |
| **悪化 0** | reading 不変・number 反映のみ・推論/翻訳/自然化/語順変更 0 |
| **推論混入 0** | Morph 決定語形の読み取りのみ(判定なし) |
| **bible_data 変更前後比較** | bible_data.japanese(代表語 私/あなた)不変。Builder 採用記録は 2,087 件 |

- 参考: 全 Morph 採用(αὐτós/τίス/関係詞/再帰/複数人称の語幹変化総計)= 15,965 件。本 M-8b の
  対象は純複数人称 2,087 件。

### 3-5. Editorial Review 連携

- `buildVerse` が **`morphAdoptedCount`(verse 内の Morph 採用トークン数)** を返す。
- 各トークンの `morphAdopted`(representative→adopted)で **採用された verse/トークンを識別・記録可能**。
  M-5 Editorial Review Framework が「Morph 採用のあった verse」を対象として記録できる。

---

## 4. 完了条件の充足

| 完了条件 | 充足 |
|---|---|
| Builder が Morph fact のみ読む | ✓ source=morph の決定語形のみ採用記録・判定なし |
| 2,087 件が期待通り反映 | ✓ 私→私たち 862・あなた→あなたがた 1,225 |
| 単数誤変換 0 | ✓ G4675/単数人称 morphAdopted=null |
| bible_data 不変 | ✓ 代表語(私/あなた)起点保持 |
| L-0 違反なし | ✓ 推論/翻訳/自然化/語順変更 0・number 反映のみ |
| Editorial Review へ渡せる状態 | ✓ morphAdopted / morphAdoptedCount で採用 verse 識別可 |

---

## 5. FROZEN 可否

- **FROZEN 可能**。Builder は Morph の決定済み語形(私たち/あなたがた)を **判定なしで採用**し、
  2,087 件を記録。**単数(G4675/単数人称)は採用せず(誤変換 0)**、**bible_data 代表語は不変**、
  **reading バイト等価**、全回帰 ALL PASS・chip⇔panel 100%・破損 0・悪化 0・推論混入 0。
- Editorial Review 連携(morphAdopted/morphAdoptedCount)により、採用 verse を M-5 の対象として記録可能。

```
[reading-japanese-builder-morph-adoption-implementation FROZEN候補 2026-07-20]
実装: builder.js に morphAdopted 記録追加（source=morph かつ語幹≠代表語）。reading はバイト等価・判定なし
採用: 純複数人称 2,087（私→私たち862 / あなた→あなたがた1,225）。before=代表語 / after=Morph決定語形
非採用: G4675単数σου / 単数人称 = morphAdopted null（誤採用0）。bible_data代表語不変
QA: reading バイト等価(mismatch0)・全回帰ALL PASS・chip⇔panel100%・破損0・悪化0・推論混入0
連携: buildVerse.morphAdoptedCount / token.morphAdopted で Editorial Review(M-5)へ採用verse記録可
非改変: bible_data / Morph Registry / reading-engine / Syntax / Semantic / Presentation / UI
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版(Builder Morph Adoption 記録・純複数人称 2,087 採用・誤採用0・reading バイト等価・Editorial Review 連携) |
