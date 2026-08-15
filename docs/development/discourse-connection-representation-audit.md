# DA-3 Audit Report — Discourse Connection Representation

作成: 2026-08-16
Phase: **DA-3（Read-only 監査）**
State: STATIC_AUDIT（READ ONLY）
対象コミット: `9fe85394`（DA-1 + DA-2b）
位置づけ: Unit 間の **決定的な語彙的接続（lexical connection）** の Representation を、実コード・実データから監査する。
語彙マーカーの存在を「意味的談話関係」へ昇格させないことを厳守する。
根拠(FROZEN/既存): `discourse-analysis-design.md`・`discourse-unit-representation-schema.md`(DA-2a)・`discourse-nested-unit-ux-audit.md`(DA-2c)・`CLAUDE.md`(L-0)。

Evidence 凡例: **CONFIRMED**（実コード/実データ実測）。

---

## 1. Executive Summary

**PASS。**

> DA-3 の目的「Unit 間に存在する明示的な語彙マーカーの存在を表現する」は、
> **既に committed の `connections[]` によって正しく・安全に実装済み**である。
> 全フィールドが直接ソースデータ由来（推論なし）、`relations[]` は空、意味関係は生成していない。

したがって **DA-3 として新規実装は不要**（本監査は既存 connection contract を形式化するもの）。
Implementation Decision = **D. Defer**（コード変更なし・既存表現が目的を充足）。

---

## 2. Existing Connection Evidence（§3・実コード・CONFIRMED）

`buildDiscourseRepresentation()`（committed）の実コード:

**マーカー検出（unit ごと）:**
```js
let connective = null;
for (const t of toks) {                                  // toks = unit の token を surface 順にソート済み
    if (t.class === 'conj' && DCV_CONNECTIVE_LEMMAS.has(t.lemma)) {
        connective = { lemma: t.lemma,
                       greek: t.text || t.normalized || t.lemma,
                       ja: (t.japanese != null && t.japanese !== '') ? t.japanese : '',
                       tokenId, ref };
        break;                                           // surface 順で最初の1つ（leading connective）のみ
    }
}
```

**connections 構築:**
```js
const connections = [];
for (let i = 1; i < units.length; i++) {
    const c = units[i].connective;
    if (!c) continue;                                    // 接続詞なし unit は辺を作らない（asyndeton＝静寂）
    connections.push({ from: units[i-1].id, to: units[i].id, lemma: c.lemma, greek: c.greek, ja: c.ja });
}
```

**マーカー集合:**
```js
const DCV_CONNECTIVE_LEMMAS = new Set([
  'γάρ','δέ','οὖν','ἀλλά','μέν','ἵνα','ὅτι','διό','ὥστε','ἄρα','εἰ','ἐάν']);   // καί/τέ/ἤ を除外（高頻度・低signal）
```

**Renderer 表示（committed DiscourseRenderer）:** `connByTo[cn.to]` で to-unit に接続を対応させ、
前 unit との間に badge `greek + ja` を表示。接続なし境界は `dcv-conn-none`（静かな区切り）。**非interactive。**

サンプル（ROM 5・実測）:
```json
{ "from":"ROMANS#00103#n45005005002-n45005005021",
  "to":"ROMANS#00104#n45005006002-n45005006012",
  "lemma":"γάρ", "greek":"γὰρ", "ja":"［理由語句］" }
```

---

## 3. Source-of-Truth（§4・フィールド別・CONFIRMED）

| field | 実ソース | 分類 |
|---|---|---|
| `from` | `units[i-1].id` = 前 unit の flow-tree `node.id`（DA-2b 逐語） | **direct source**（id値）＋**deterministic transform**（前 unit という reading-order 隣接の対付け） |
| `to` | `units[i].id` = 当該 unit の flow-tree `node.id`（DA-2b 逐語） | **direct source** |
| `lemma` | token `lemma`（当該 unit 内、surface 順で最初の `class==='conj'` かつ SAFE lemma） | **direct source**（＋どの token を採るかは deterministic transform: leading + 集合フィルタ） |
| `greek` | token `text` → `normalized` → `lemma`（フォールバック順） | **direct source**（表層形） |
| `ja` | token `japanese`（採用済み Reading Japanese の逐語転写） | **direct source**（語の gloss。関係ラベルではない） |

- **heuristic / inferred フィールドは無し**（0）。
- 唯一の「transform」は (a) reading-order 隣接の対付け、(b) leading connective 選択＋curated lemma 集合。いずれも**決定的**（推論ではない）。
- **curated 集合の注記**: `DCV_CONNECTIVE_LEMMAS` は全接続詞ではなく `καί/τέ/ἤ` 等を除いた**表示選択ポリシー**（高頻度・低signal の抑制）。これは決定的な選択であって意味推論ではないが、「全ソース接続詞の網羅」ではない点を記録する。

---

## 4. Connection Direction（§5・CONFIRMED）

`from = units[i-1]`（前 unit）／`to = units[i]`（当該 unit・マーカー保持側）。実測で **from は常に「直前の unit」**（全 88 接続で adjacency 成立）。

**方向の分類: DISPLAY / reading-order direction。**
- 接続詞 token は**語彙的に `to` unit 内に存在**する（lexical fact）。
- `from`=前 unit への対付けは、top-level unit 列（flow-tree `sentences[]` の記述順＝章の reading 順）の**隣接**から決定される。
- これは **表示・読み順の方向**であり、**semantic direction ではない**（例: γάρ 節が前主張を根拠づける、という意味的従属方向を主張していない）。
- **structural direction でもない**（2つの clause 間に源注釈の構造辺があるわけではない。あるのは reading-order 隣接）。

→ **lexical（マーカーの存在）＋ display/reading-order（隣接方向）** の合成。semantic/structural direction とは明確に区別する。

---

## 5. Marker Contract（§6・安全に表現してよいもの）

| 現行フィールド | 内容 | 安全か |
|---|---|---|
| `lemma` | 実際の語彙マーカー（γάρ 等） | **安全**（source の語彙事実） |
| `greek` | マーカーの表層形（γὰρ） | **安全**（表層文字列） |
| `ja` | マーカー語の採用済み日本語 gloss（例 γάρ→「［理由語句］」） | **安全（ただし要監視）**。**語の gloss** であって節の関係ラベルではない。`［…語句］` は「[X]という種類の語」を示す既存注記規約。 |
| （関係ラベル: reason/result…） | — | **不在（禁止）**。生成していない。 |
| （自然文説明） | — | **不在（禁止）**。生成していない。 |

**要監視ポイント:** `ja="［理由語句］"` は文字列に「理由」を含むが、これは**接続詞 γάρ という語の gloss**（`bible_data.japanese` の逐語転写）であり、「この節は理由である」という**節の関係主張ではない**。
この gloss を `relations` の意味ラベル（`relation:"reason"`）へ**昇格・複製してはならない**（§6 の禁止事項）。現状は relations[]=[] で昇格していない＝安全。

---

## 6. connections[] vs relations[]（§9・明示境界）

| | connections[] | relations[] |
|---|---|---|
| 意味 | **明示的な語彙的接続**（unit 先頭にマーカー語が存在＋reading-order 隣接） | **意味的談話関係**（cause/result/contrast/purpose/condition/temporal/explanation/elaboration/continuation） |
| 決定性 | 決定的（source の語彙事実） | 推論（authoritative な関係注釈が無い限り確定不能） |
| DA-3 での状態 | **populated（既存・安全）** | **空 `[]`（維持）** |

**境界則:** マーカーの存在（connections）が意味関係（relations）へ**自動昇格しない**。
`ja` gloss は語の表現であって関係ではない。→ DA-3 でも **relations[] は空のまま**。

---

## 7. Proposed Minimal Schema（§8・evidence 準拠）

**既存の shape が既に最小かつ evidence 準拠**であり、変更を要さない:

```jsonc
connections: [
  {
    "from":  "<sourceUnitId = 前 unit の flow-tree node.id>",   // direct source + reading-order 隣接
    "to":    "<targetUnitId = マーカー保持 unit の node.id>",     // direct source
    "lemma": "<接続詞 lemma>",                                    // direct source（語彙マーカー）
    "greek": "<表層形>",                                          // direct source
    "ja":    "<マーカー語の既存 japanese gloss>"                  // direct source（語 gloss・関係ラベルではない）
  }
]
```

- 5 フィールドすべてに direct-source 根拠あり。**意味関係フィールドを追加しない。**
- （任意・低価値）`greek`/`ja` を `marker:{lemma,greek,ja}` に入れ子化すると意味の明確化にはなるが、**Renderer が `cn.greek`/`cn.ja` を直接読むため renderer 変更を伴い**、機能的利得が無い → **推奨しない**。
- （推奨・コードでなく契約として）**不変条件を明記**する:「`from→to` は reading-order 方向であって semantic direction ではない」「`ja` は語 gloss であって relation ではない」。これは**フィールド追加ではなく契約注記**で足りる（本監査で明記済み）。

---

## 8. Renderer Impact（§10）

**No change。** 現行 DiscourseRenderer は既に:
- マーカー（`greek + ja`）を前 unit との間に badge 表示。
- reading-order 方向（縦・上→下）で表示。
- 接続詞なし境界は `dcv-conn-none`（静寂・関係捏造なし）。
- 非interactive（word selection と競合しない）。

desktop / mobile とも DA-1/DA-2b で表示不変・overflow なしを確認済み。**接続表示は語彙的接続の目的に十分**。重複接続なし（1 unit につき incoming 1 辺・`connByTo` は to で一意）。

---

## 9. L-0 Audit（§11）

| 項目 | 判定 |
|---|---|
| translation | **なし** |
| naturalization | **なし**（surface 並替なし・意訳なし） |
| semantic inference | **なし** |
| referent resolution | **なし** |
| clause meaning selection | **なし** |
| discourse relation inference | **なし**（relations[] 空・関係ラベル未生成） |

**明示確認: lexical marker ≠ semantic relation。**
`connections[]` は「マーカー語が存在する」事実の表現に留まり、「この節は理由/結果/…」という意味関係を一切主張していない。**L-0 PASS。**

---

## 10. Real Data Validation（§12・実測 ROM5/JHN3/PHP2/1JN1/GAL2）

| 章 | units | connections | from=直前unit常時 | 決定的token根拠なし | from/to同一verse | 先頭接続詞なしunit(辺なし) |
|---|---|---|---|---|---|---|
| ROM 5 | 21 | 19 | ✓ | 0 | 3 | 1 |
| JHN 3 | 42 | 26 | ✓ | 0 | 4 | 15 |
| PHP 2 | 18 | 17 | ✓ | 0 | 1 | 0 |
| 1JN 1 | 11 | 8 | ✓ | 0 | 1 | 3 |
| GAL 2 | 22 | 18 | ✓ | 0 | 3 | 4 |

- **全 88 接続が決定的 token 根拠を持つ**（to-unit 内に該当 lemma の `class='conj'` token が実在）。**根拠なし接続 = 0。**
- marker 分布（5章計）: δέ 27・γάρ 15・ἀλλά 9・εἰ 8・ἐάν 8・οὖν 5・ὅτι 5・ἵνα 5・μέν 2・ὥστε 2・ἄρα 1・διό 1。すべて `DCV_CONNECTIVE_LEMMAS` 由来。
- source/target: **from は常に直前 unit**（reading-order 隣接・例外0）。
- 曖昧ケース: `from/to 同一 verse`（1章内 1–4件）は、同一 verse 内に複数 top-level unit がある場合（例 ROM 5:7 に2文）。**verseLabel が同じでも別 unit・別 node.id で識別可**＝曖昧ではない。
- **決定的根拠のない接続は存在しない。**

---

## 11. Implementation Decision（§13.11）

**D. Defer（コード変更なし）。**
- 目的（語彙的接続の表現）は既存 `connections[]` で充足済み・安全。
- A（Representation-only）の余地は「marker 入れ子化・direction メタデータ追加」の**装飾的変更**のみで、機能的利得ゼロ・renderer 変更リスクあり → 採らない。
- B（Renderer 変更）・C（Analysis 変更）は不要。

---

## 12. DA-3 Decision（§13.12）

# DEFER

- **既存 `connections[]` が DA-3 の決定的語彙接続 Representation として十分・安全**。新規実装を要さない。本監査が既存 connection contract を形式化する（§7）。
- `relations[]` は空を維持。意味関係は引き続き生成しない。

**再開条件（将来）:**
- 新しい**決定的な接続ソース**（例: 権威ある discourse annotation で source→target の構造辺が明示された）が導入された場合。
- または、`from→to` を semantic direction として扱う要件が生じた場合（その時は authoritative な関係注釈を前提に別フェーズで L-0 監査）。
- いずれも「マーカー存在 → 意味関係」への昇格は authoritative annotation 無しには行わない。

---

## Self Audit

| 方針 | 遵守 |
|---|---|
| lexical marker を semantic relation へ昇格しない | ✓（relations[] 空・ja は語 gloss） |
| direct source / deterministic のみを候補 | ✓（全フィールド direct source・heuristic 0） |
| 新データソースを導入しない | ✓ |
| 方向を display と明記（semantic と混同しない） | ✓（§4） |
| コード変更なし | ✓ |

---

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-08-16 | 初版（DA-3。既存 connections[] を監査。全フィールド direct source・88接続全て決定的根拠あり・方向=reading-order・relations[]空維持。判定 PASS／Decision DEFER（実装不要）。コード変更なし） |
