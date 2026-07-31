# Morph Gap Resolution 実装報告(Stage M-7c)

実装日: 2026-07-20
位置づけ: M-7b Morph Gap Resolution Design に基づき、**純複数人称代名詞の Morph reading 反映**を実装。
出力変更を伴うため **FROZEN プロトコル**で実施。
根拠(FROZEN): reading-japanese-policy.md(L-0)・morph-rule-engine-v1-frozen.md(J-9)・
reading-japanese-pending-classification.md(M-7a)・morph-gap-resolution-design.md(M-7b)。
数値はクリーン NT 実測(総 137,741・重複「 2.json」不在)。

---

## 1. 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| public/core/reading-engine.js | **`_MORPH_STEM_RULES` に純複数人称代名詞 7 strong を追加**(1 複 ἐγώ G2257/G2254/G2248/G2249→私たち・2 複 σύ G5216/G5209/G5210→あなたがた・stems キー `'\|plural'`)。既存ロジック不変 |
| scripts/re-phase1-regression.cjs | M-7c 単体回帰 7 ケース追加。morph 基準 44,251 → **44,614**(+363) |
| scripts/re-phase3-regression.cjs | particle 基準 3,017 → **3,015**(は −1 / が −1) |
| scripts/re-stageB-regression.cjs | changed 39,694 → **40,055** / identical 98,047 → **97,686**(+361) |

**変更なし(制約遵守)**: bible_data / generated data / Semantic / Syntax(getRelativeSyntax/
getDemonstrativeSyntax/getSemanticInfo)/ Presentation / PhraseRenderer / Builder(reading-japanese-builder.js)。
重複再混入 0。**Morph Registry のみが変更対象**(strong 数 7→14)。

---

## 2. 実装内容(既存 Registry と同型)

- 純複数人称代名詞 7 strong を追加。**strong キー一致・base 一致発火・決定的語形反映のみ**。
  - 1 複(base 私): G2257/G2254/G2248/G2249 → **私たち**
  - 2 複(base あなた): G5216/G5209/G5210 → **あなたがた**
- 人称代名詞は **gender 無(空)**・**number=plural** のため stems キーは `'|plural'`。
- case 助詞は Phase 1 既存挙動(私たち+の/に/を・あなたがた+の/を)。
- **文脈判断・自然化・推論・例外追加はしていない**(person+number は strong で一意=決定的)。

---

## 3. QA 結果

### 3-1. 対象 2,087 件の期待差分(純複数人称のみ反映)

| 変更パターン | 件数 |
|---|---|
| あなたの → あなたがたの | 559 |
| あなたを → あなたがたを | 430 |
| 私の → 私たちの | 400 |
| あなた → あなたがた | 236 |
| 私を → 私たちを | 167 |
| 私に → 私たちに | 168 |
| 私 → 私たち | 127 |
| **合計** | **2,087**(設計値と完全一致) |

### 3-2. 単数・混在ケース非変更確認(誤変換 0)

| 対象外 | 確認 |
|---|---|
| **σύ G4675(単数 σου・base あなた)** | あなたの(不変)。**混在 481 単数を あなたがた にしない**(Registry 未登録=発火せず) ✓ |
| G5213(既に あなたがた・H-5) | あなたがたに(不変) ✓ |
| 単数人称(ἐγώ G3450 等・σύ G4771 等) | 私の/あなたの(不変) ✓ |
| 非対象 lemma(αὐτós/τίス/関係詞/再帰) | それを・何を・者/もの・私自身 等(不変) ✓ |

### 3-3. 回帰・悪化・整合

| 項目 | 結果 |
|---|---|
| **回帰 ALL PASS** | re-phase1(111 checks)/2/3/5・re-stageA/B/D/E **全 ALL PASS** |
| **before/after 差分** | morph 44,251→44,614(+363・主格複数 ἡμεῖς127+ὑμεῖς236 が新規 morph 解決)・particle 3,017→3,015(主格 私は/あなたが→私たち/あなたがた・2 件)・stageB チップ改善 +361 |
| **reading 悪化 0** | 全変更が 私/あなた→私たち/あなたがた(number 反映)= 構造忠実性向上。誤解(単複)解消 |
| **chip⇔panel 一致** | **100%(不一致 0)**・破損形 **0** |
| **推論混入 0** | person+number は strong で一意・推測なし |
| **bible_data 不変** | 代表語(起点)不変・データ変更なし |

- test:genitive FAIL=2 は Stage H-5 で確認済みの既存失敗(M-7c と無関係)。

---

## 4. Morph Pending の解消

- M-7a で **Morph Pending** と分類された「複数人称の number 未反映」を **解消**。
  - M-6 JHN 1 の Pending 例: ἡμῖν「私に」→ **私たちに**・ἡμεῖς「私」→ **私たち**・ἡμᾶς「私を」→
    **私たちを** が反映される。
- 全 NT で 2,087 件が number 反映(私たち/あなたがた)へ改善。**Morph Pending(number)は Engine 側で解消**。

---

## 5. 未解決範囲(M-7c 対象外)

| 項目 | 状況 |
|---|---|
| Syntax Pending(指示詞 adnominal) | M-7a Syntax 分類(13)・別途 Syntax 側で解消(corpus 索引) |
| Corpus Pending(関係詞 role 欠落) | M-7a Corpus 分類(1)・注釈補完 |
| その他 number/person 未反映 | 純複数人称に限定(混在 G4675 等は対象外・現状維持) |
| Builder 反映 | Builder は Morph の結果を読むだけ(本 Stage は Morph Registry のみ) |

---

## 6. FROZEN 可否

- **FROZEN 可能**。純複数人称代名詞 7 strong の number 反映を **既存 Registry と同型**で実装し、
  **対象 2,087 件のみ改善(私/あなた→私たち/あなたがた)・単数/混在/対象外は完全不変(誤変換 0)・
  悪化 0・chip⇔panel 100%・破損 0・推論混入 0**。
- FROZEN プロトコル遵守: 単体回帰 7 ケース追加・morph/particle/stageB 基準を悪化 0 確認のうえ更新・
  全回帰 ALL PASS。
- bible_data・Semantic・Syntax・Presentation・PhraseRenderer・Builder は非侵害。

```
[morph-gap-resolution-implementation FROZEN候補 2026-07-20]
追加: 純複数人称 7 strong（1複 G2257/G2254/G2248/G2249→私たち / 2複 G5216/G5209/G5210→あなたがた・'|plural'）
差分: 2,087件のみ 私/あなた→私たち/あなたがた（設計値一致）。G4675単数σου/G5213既正/単数人称/他lemma 不変（誤変換0）
FROZEN: morph44251→44614(+363・主格複数新規解決)・particle3017→3015(は/が-1)・stageB changed+361。悪化0
QA: 全8スイートALL PASS・chip⇔panel100%・破損0・推論混入0・bible_data不変・Morph Registryのみ
解消: M-7a Morph Pending（複数人称number）を Engine 側で解消
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版(純複数人称 7 strong 追加・2,087件 number 反映・G4675 単数誤変換なし・FROZEN プロトコル・悪化0) |
