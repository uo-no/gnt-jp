# Morph Gap Resolution Design(Stage M-7b)

策定日: 2026-07-20
位置づけ: M-7a で **Morph Pending** と分類された項目(1/2 人称複数代名詞の number 未反映)を解消する
**Morph 層の拡張設計**。Reading Japanese が利用可能な決定的 Morph 情報を拡張する。
根拠(FROZEN): reading-japanese-policy.md(L-0)・morph-rule-engine-v1-frozen.md(J-9)・
-editorial-pilot-report.md(M-6)・reading-japanese-pending-classification.md(M-7a)。

**本 Stage は設計のみ。コード・Morph Registry・bible_data の実装/変更、日本語修正、擬似コード・JSON・
TypeScript は一切含まない。** 推測補完・Builder/Syntax/Semantic 修正は禁止。

---

## 0. 現在の Morph Registry 対象範囲

Morph v1 FROZEN の `_MORPH_STEM_RULES` = **7 lemma**:
αὐτós(G846)/ τίス(G5101)/ ὅς(G3739)/ ὅστις(G3748)/ ὅσος(G3745)/ ἐμαυτοῦ(G1683)/ σεαυτοῦ(G4572)。

- **人称代名詞 ἐγώ / σύ は未登録**。複数形が単数語形(私/あなた)で描画される(M-7a Morph Pending)。

---

## 1. 対象 lemma 一覧(純複数 strong のみ・厳密)

**number 分布を厳密に確認し、純複数(全件 plural)の strong のみを対象**とする。

### 1 人称複数(ἐγώ → 私たち)

| strong | morph | 現 ja | count | 純度 |
|---|---|---|---|---|
| G2257 | P-1GP(ἡμῶν) | 私 | 401 | 純複数 |
| G2254 | P-1DP(ἡμῖν) | 私 | 168 | 純複数 |
| G2248 | P-1AP(ἡμᾶς) | 私 | 166 | 純複数 |
| G2249 | P-1NP(ἡμεῖς) | 私 | 127 | 純複数 |

### 2 人称複数(σύ → あなたがた)

| strong | morph | 現 ja | count | 純度 |
|---|---|---|---|---|
| G5216 | P-2GP(ὑμῶν) | あなた | 559 | 純複数 |
| G5209 | P-2AP(ὑμᾶς) | あなた | 430 | 純複数 |
| G5210 | P-2NP(ὑμεῖς) | あなた | 236 | 純複数 |
| (G5213) | P-2DP(ὑμῖν) | **あなたがた** | 607 | 純複数・**既に正**(H-5 で修正済・変更不要) |

- **対象合計(変更が生じる): 1 人称 862 + 2 人称 1,225 = 2,087 件**。G5213(607)は既に あなたがた で対象外。

### 対象外(重要・誤変換防止)

| strong | 理由 |
|---|---|
| **σύ G4675(σου・P-2GS)** | **混在(単数 481 + 異常複数 2)= 実質 2 人称単数 σου**。**strong キーで拾うと単数 481 件を誤って あなたがた にする** → **対象外**。異常な 2 件の plural はデータ揺れで、推論的補完しない |
| ἐγώ 単数(G3450/G1473/G3165/G3427/G1698/G1691)・σύ 単数(G4771/G4671/G4571) | 純単数=私/あなた が正・現状維持 |

---

## 2. 現在状態

- 1/2 人称複数代名詞 2,087 件が **単数語形(私/あなた)** で描画されている。
- number(plural)は形態(morph P-1P/P-2P・token.number=plural)に**明示されている**が、Morph Registry
  未登録のため反映されていない。
- **誤解の例(M-6)**: JHN 1:14 ἡμῖν「私に」(本来「私たちに」)・JHN 1:16 ἡμεῖς「私」(本来「私たち」)。

---

## 3. 不足情報

- **number=plural を反映した 1/2 人称複数の読む語形**が不足:
  - 1 人称複数 → **私たち**(base 私 → 私たち)
  - 2 人称複数 → **あなたがた**(base あなた → あなたがた)
- これは **形態(person + number)由来の決定的変換**であり、推論を要さない(strong が person+number を
  一意に決める)。gender は人称代名詞に無い(gender-neutral)ため語幹に影響しない。

---

## 4. 追加後に提供できる Morph facts

Morph Registry に純複数 strong を追加した後、Builder が読める決定的語形:

| strong(person+number) | base | 提供語形 | + case 助詞(既存 Phase 1) |
|---|---|---|---|
| G2257/G2254/G2248/G2249(1 複) | 私 | **私たち** | 私たちの/私たちに/私たちを |
| G5216/G5209/G5210(2 複) | あなた | **あなたがた** | あなたがたの/あなたがたを |
| G5213(2 複) | あなたがた | あなたがた(不変) | あなたがたに 等 |

- 方式は **既存 Registry と同型**(strong キー・base 一致発火・安全 fallback)。person+number は strong で
  一意なので、gender/number マップは定数(reflexive ἐμαυτοῦ→私自身 と同型)。
- **Morph が決めるのは語形のみ**(私たち/あなたがた + case 助詞)。日本語訳・文脈・意味・語順・神学は
  決めない(§責務境界)。

---

## 5. Reading Japanese への影響範囲

- **変更が生じるトークン: 2,087 件のみ**(1 人称複数 862 + 2 人称複数 1,225)。私→私たち・あなた→あなたがた。
- **それ以外は完全に不変**(単数人称・他 lemma・G5213 既正)。**collateral な reading 変化 0**(純複数
  strong のみ・G4675 等混在は対象外で誤変換なし)。
- 影響は **number の構造忠実性向上**(私たち/あなたがた)であり、誤解(単数/複数)の解消。翻訳化・
  自然化ではない。
- 実装時は **出力変更**のため FROZEN プロトコル(re-phase1 に回帰ケース追加 → 悪化 0 → morph 基準更新)を
  適用(本設計 Stage では実装せず=reading 不変)。

---

## 6. QA 方法

| 項目 | 確認 |
|---|---|
| **bible_data 不変** | 注釈の読み取りのみ(japanese 代表語は起点として不変) |
| **reading 不変(本設計 Stage)** | 本 Stage は設計のみ・コード変更なし → reading 不変。実装時は 2,087 件のみ改善・他は不変 |
| **resolve pipeline 非破壊** | Registry 追加のみ・pipeline 順序不変 |
| **Morph Registry のみ対象** | `_MORPH_STEM_RULES` への純複数 strong 追加に限定・Syntax/Semantic/Builder 不変 |
| **純度厳密確認** | 対象は **純複数 strong のみ**。**G4675(混在)は対象外**(単数誤変換防止) |
| **推論混入 0** | person+number は strong/morph で一意・推測なし |
| **before/after(実装時)** | 2,087 件が 私たち/あなたがた へ・悪化 0・chip⇔panel 100%・破損 0 |
| **L-0〜M-7a 整合** | Morph 責務(語形)・Pending 返却先(Morph)と一致 |

---

## 責務境界

| Morph が決める | Morph が決めない |
|---|---|
| gender / number / person / case / tense / mood / voice | 日本語訳 / 文脈判断 / 意味推論 / 語順変更 / 神学的解釈 |

- **Builder は Morph の結果(私たち/あなたがた + case 助詞)を読むだけ**。判定・推論をしない。
- Syntax(構造)・Semantic(語義)は本拡張の対象外(number は Morph の決定的責務)。

---

## 完了条件の充足

| 完了条件 | 充足 |
|---|---|
| Morph Pending 解消に必要な拡張範囲が確定 | ✓ 純複数 strong 7 種(1 複 4 + 2 複 3)・2,087 件・G5213 既正・G4675 除外 |
| Syntax/Semantic 責務との境界が明確 | ✓ number=Morph・構造/語義は対象外(§責務境界) |
| 実装可能な設計になること | ✓ 既存 Registry と同型(strong キー・base 一致・定数語形)・FROZEN プロトコル |

```
[morph-gap-resolution-design 完了 2026-07-20]
対象: 純複数人称代名詞 strong（1複 ἐγώ G2257/G2254/G2248/G2249→私たち / 2複 σύ G5216/G5209/G5210→あなたがた）。計2087件
除外: G5213(既にあなたがた) / G4675(混在=単数σου・誤変換防止) / 単数人称
不足: number=plural を反映した語形（私たち/あなたがた）。person+numberはstrongで一意=決定的・推論なし
方式: 既存Registryと同型（strongキー・base一致・定数語形・+case助詞はPhase1）
影響: 2087件のみ私/あなた→私たち/あなたがた・他は完全不変・collateral0。実装時はFROZENプロトコル・悪化0
責務: Morph=語形（number反映）/ Syntax・Semantic・Builderは不変。Builderは読むだけ
QA: bible_data不変・Morph Registryのみ・純度厳密(G4675除外)・推論混入0・L-0〜M-7a整合
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版(Morph Pending 解消設計・純複数人称代名詞 7 strong・私たち/あなたがた・G4675 混在除外・2087 件・責務境界) |
