# Reading Japanese Builder Morph Adoption Design(Stage M-8a)

策定日: 2026-07-20
位置づけ: M-7c Morph Gap Resolution で完成した Morph facts(純複数人称 私たち/あなたがた)を、
**Reading Japanese Builder が採用する**ための設計。
根拠(FROZEN): reading-japanese-policy.md(L-0)・-builder-design.md(L-2a)・
-builder-adoption-plan.md(M-4)・-builder-phaseA-report.md(M-3)・
morph-gap-resolution-implementation-report.md(M-7c)・-editorial-review-framework.md(M-5)。

**本 Stage は設計のみ。コード・bible_data・Morph Registry・Builder 実装は変更しない。** 擬似コード・
JSON・TypeScript・日本語変更は含まない。

---

## 0. 前提の整理(Morph fact は既決)

- **bible_data.japanese(Data 代表語・起点)= 私 / あなた**(不変・H-3b)。
- **Morph fact(M-7c)= 私たち / あなたがた**(number 由来の**決定済み語形**・純複数人称 7 strong)。
  resolve 出力に既に反映済(morph 44,614)。
- **Builder Phase A(M-3)は resolve 出力を集約**しており、reading は既に Morph fact を含む。
- **本 Adoption = Builder の確定 reading が、Data 代表語(私/あなた)ではなく Morph 決定語形
  (私たち/あなたがた)を採用することの設計**(M-4 Adoption 原則: 決定済み reading の採用)。

---

## 1. Builder 入力

Builder は Morph facts から **決定済みの number / person / case** を読む(推論しない):

| 入力 | 内容 |
|---|---|
| Morph 決定語形 | 私たち(1 複 G2257/G2254/G2248/G2249)/ あなたがた(2 複 G5216/G5209/G5210) |
| number | plural(strong で一意) |
| person | 1 / 2(strong で一意) |
| case | 格助詞(私たちの/私たちに/あなたがたを 等・Phase 1 既存) |

- これらは **strong で一意に決まる決定的語形**(M-7c)。Builder は **読むだけ**(判定・推論なし)。

---

## 2. Adoption 条件

| 変更可能 | 変更禁止 |
|---|---|
| **Morph が決定した語形のみ**(私たち/あなたがた + case 助詞) | 文脈推論 / 翻訳 / 自然化 / 語順変更 / 神学補完 |

- Builder は **Morph が決定した語形をそのまま採用**する。それ以外の判断(文脈・自然さ・語順・神学)は
  一切行わない(L-0 推論禁止・M-4 責務境界)。
- **Morph が決定していないもの(単数・G4675・混在)は採用しない**(現状維持)。

---

## 3. 出力変更範囲

- **対象 verse のみ変更**。純複数人称 **2,087 件**が Data 代表語(私/あなた)→ Morph 決定語形
  (私たち/あなたがた)へ。
- **before / after 比較を必須化**:
  - before = Data 代表語(私/あなた)/ after = Builder 確定 reading(私たち/あなたがた)。
  - 変更は **2,087 件のみ**・それ以外は完全一致。
- **bible_data.japanese(代表語)自体は不変**(起点として保持)。Builder の**確定 reading** が
  Morph fact を採用する(reading の deliverable)。

| 変更パターン(M-7c 実測) | 件数 |
|---|---|
| あなたの→あなたがたの / あなたを→あなたがたを / あなた→あなたがた | 1,225 |
| 私の→私たちの / 私を→私たちを / 私に→私たちに / 私→私たち | 862 |
| **合計** | **2,087** |

---

## 4. QA

| 項目 | 合格条件 |
|---|---|
| **期待差分 2,087 件** | 純複数人称のみ 私/あなた→私たち/あなたがた(M-7c 実測と一致) |
| **単数非変更** | 単数人称(ἐγώ G3450 等・σύ G4771 等)= 私/あなた 不変 |
| **G4675 誤変換 0** | 単数 σου(G4675・base あなた)= あなた 不変(Morph 未決定=採用しない) |
| **chip⇔panel 維持** | 一致 100%・破損形 0(chip/panel が同一 Builder 出力を参照) |
| **悪化 0** | number 反映のみ(構造忠実性向上)・推論/翻訳/自然化/語順変更 0 |
| **bible_data 変更前後比較** | bible_data.japanese(代表語 私/あなた)は不変。Builder 確定 reading が 2,087 件で私たち/あなたがた |
| **NT 全巻・実 FS** | 137,741・重複「 2.json」不在確認 |

- 出力変更を伴うため **FROZEN プロトコル**(回帰ケース確認 → 悪化 0 → 基準)を適用(M-7c で既に morph/
  particle/stageB 基準更新済)。

---

## 5. FROZEN 条件

| 条件 | 内容 |
|---|---|
| **Morph facts のみ利用** | 私たち/あなたがた + case は Morph 決定・Builder は読むだけ |
| **Builder 判定なし** | 文脈・自然さ・語順・神学の判断をしない(推論禁止) |
| **L-0 整合** | 構造忠実性向上(number)・自然化でない・推論混入 0 |
| **Editorial Review へ渡せる状態** | Builder 確定 reading(私たち/あなたがた 採用済)を M-5 Editorial Review が verse 単位で評価できる |

- 上記を満たすとき Builder Morph Adoption を FROZEN 可能とする。

---

## 6. 責務境界(確認)

| 層 | 役割 |
|---|---|
| Morph(M-7c) | number 由来の決定語形(私たち/あなたがた)を決定 |
| **Builder(本 Adoption)** | **Morph 決定語形を採用**し verse 確定 reading とする(判定・推論なし) |
| Editorial(M-5) | Builder 確定 reading を verse 単位で評価(Accepted/Revise/Pending) |
| Data | 代表語(私/あなた)を起点として保持(不変) |

---

## 凍結(候補)

```
[reading-japanese-builder-morph-adoption-design FROZEN候補 2026-07-20]
前提: Morph fact(私たち/あなたがた)はM-7cで既決・resolve出力反映済。Builder Phase Aが集約済
Adoption: Builder確定readingがData代表語(私/あなた)でなくMorph決定語形(私たち/あなたがた)を採用
入力: Morph決定語形+number/person/case（strongで一意・読むだけ・推論なし）
変更可能: Morph決定語形のみ。禁止: 文脈推論/翻訳/自然化/語順変更/神学補完
出力変更: 2,087件のみ（対象verse）・before/after必須・それ以外不変・bible_data代表語は不変
QA: 期待差分2087/単数非変更/G4675誤変換0/chip⇔panel維持/悪化0/bible_data前後比較
FROZEN: Morph factsのみ・Builder判定なし・L-0整合・Editorial Reviewへ渡せる
```

本設計は凍結可能な状態である。承認により FROZEN 化し、Builder Morph Adoption を実装(または既存 resolve
経由の Builder 集約を確定 reading として採用)する。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結候補(Builder Morph Adoption・2,087件 私たち/あなたがた 採用・入力/条件/出力/QA/FROZEN・判定なし) |
