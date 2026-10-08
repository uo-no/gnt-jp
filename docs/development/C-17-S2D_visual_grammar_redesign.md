# C-17 Phase 2-D — Visual Grammar Redesign

**Date:** 2026-09-01  
**State:** DESIGN COMPLETE → HUMAN REVIEW  
**Scope:** CSS のみ。JS / dg-engine.js / SR JSON 変更なし。

---

## 1. 現行 HDG の問題分析

### OBSERVED（スクリーンショット実測）

| ケース | 問題 |
|---|---|
| JHN 1:1 (1024px) | 3本の縦線（solid + dashed×2）が同時に目に入る |
| JHN 1:3 (1024px) | 3-4本（solid + dashed×2 + dotted）が競合 |
| MAT 28:5 (1024px) | depth 1 の ▼ 節 内に depth 2 の ▼ 節 が入れ子になり、同一 depth のトークンと視覚的に区別できない |
| COL 1:9 (768px) | 縦線が5-6本同時に表示。predicate（やめる）が画面下端に押し出される |
| COL 1:9 (390px) | dashed border が幅の20%を占める。主語・述語が他の slot と同じ視覚的重みで並ぶ |

### 根本的問題

現行の `depth → border-left` 表現は「深度の数」を正確に伝えるが、**「構造の重要度」を伝えない**。

- 主語/述語/補語（構造の骨格）と 副詞的/前置詞句（付属情報）が同じ視覚的重みで並ぶ
- 縦線が多いほど「深い」はわかるが、縦線を数えなければ depth がわからない
- COL 1:9 のような複雑文では「縦線の数」 > 「テキスト情報」になる

**失敗している第一印象（1-2秒）：**
> 縦線のグリッドの中にラベルとテキストが並んでいる

**目指す第一印象（1-2秒）：**
> 一本の軸（主節）から、階層が空白によって広がっている

---

## 2. 現行 RK の問題分析

### OBSERVED（スクリーンショット実測）

| ケース | 問題 |
|---|---|
| JHN 1:1 (1024px) | 3つの並列ベースラインは美しい（このケースは成立） |
| JHN 1:3 (1024px/390px) | SVG コネクタが目視で確認できない。一つ → 関係節 の接続が不明 |
| COL 1:9 (768px) | L-connector が3本同時に垂れ下がり、どれが何に繋がるか追えない |
| MAT 28:5 (1024px) | 女の elevation（間接目的語）は正しい RK だが、内容節の積み重なりで「3つの独立した図」に見える |

### SVG コネクタが見えない理由（CONFIRMED）

`_dgDrawRelConnectors` が生成する inverted-L は以下の経路を通る：

```
先行詞トークン「一つ」の bottom-center (y=K)
↓ 垂直 (x=固定)
関係節 top-left (y=K+N, x=J)
```

**問題の構造：**
- 先行詞トークン「一つ」は bordered box の中にある
- box の右端（述語/主語の divider 線）と SVG の垂直部分が **x 座標が近い** または重なる
- box の bottom border と SVG の start 点が視覚的に合流する
- 結果：「これは cell の border だ」と脳が解釈し、SVG 線として認識しない

**線を太くするだけでは解決しない：** 太くしても、同じ場所にある cell border と区別できない。

### 根本的問題

現行のトークン表現（bordered box）が RK の視覚言語と根本的に相性が悪い。

**RK の本来の視覚言語：**
- ベースライン（水平線）= 主要節の骨格
- テキスト = ベースライン上の単語
- 斜め線 = 修飾語の付属
- 垂直線 = 主語/述語の分割

**現在の実装：**
- トークン = bordered box（最も視覚的に強い要素）
- ベースライン = 1px 黒線（box の下に引かれる細い線）
- 関係接続 = 細い SVG 線（box に埋もれる）

結果として、**box > baseline** という優先順位が逆転している。

---

## 3. HDG 候補比較

### A. Indent-first（純粋インデント）

```
主節
    主語
    述語
    目的語
        関係節
            主語
            述語
```

- border-left を全廃
- 階層 = padding-left のみ
- 視認性：シンプルだが、複雑文では深度の「跳び」が空白だけになる
- COL 1:9 耐性：4-5 depth のインデントは追える
- collapse との相性：問題なし（indent は維持される）
- 390px 耐性：インデントが横幅を食う（depth × 20px など）
- **問題：** 視覚的なグルーピングの境界が曖昧。PP と 節 の区別が消える

### B. Branch-first（最小 branch 表現）

```
主節
 ├ 主語
 ├ 述語
 └ 目的語
    └ 関係節
```

- branch 線の追加が必要 → CSS のみでは困難（::before pseudo で可能だが複雑）
- 390px では branch 線が潰れる
- 「ダイアグラムらしさ」は最も高い
- **問題：** DOM 構造への依存度が高く、CSS のみでは実現困難

### C. Layered（背景深度）

- depth ごとに背景色を変化（白 → 薄グレー → より薄グレー）
- border-left を全廃、背景で深度を表現
- 視認性：境界が柔らかすぎて深度が曖昧になるリスク
- 390px 耐性：背景色変化は幅に影響しない ✓
- 「美しさ」: airless（高密度テキスト）になりうる
- **問題：** 多くの深度で微細な差分を表現する必要があり、調整が難しい

### D. Hybrid — **推奨案**（Root anchor + Indent + Light tint）

```
主節 [solid 3px border-left + lavender bg]
    ▼ 節 [indent + subtle bg only]
        副詞的 [small text]
        ▼ 前置詞句 [smallest text, no border]
        述語
        主語
    ▼ 節 [indent + subtle bg only]
        ...
```

**設計原則：**
1. Root clause（主節）のみ solid border-left → これが「唯一の軸」
2. depth 1+ の sub-clauses: `border-left: none` → 完全廃止
3. 深度表現: `padding-left` per depth + 非常に薄い背景 tint per depth
4. PP ブロック: border なし、文字サイズのみ縮小
5. fn ラベル（主語/述語）: depth 0 直下のみ強調、deeper は軽量化

**評価：**
- 視認性：ONE 縦線（root）→目が迷わない
- 情報量：インデント + ラベル + 文字サイズで十分に深度を表現
- 390px 耐性：border 廃止で横幅節約 ✓
- collapse との相性：問題なし
- ダイアグラムらしさ：「折りたたみ可能な深度マップ」として機能
- 見た瞬間の魅力：clean で意図的なデザイン

---

## 4. RK 候補比較

### ユーザーが最初に見るべき順序

1. **ベースライン**（主節の水平軸 = 文の骨格）
2. **主語 / 述語 の分割**（縦線 divider）
3. **目的語 / 補語**（ベースライン上の右側）
4. **修飾語の接続**（斜め線、L-connector）
5. **従属節** (content/adverbial/relative clauses)
6. **ラベル**（主語/述語/補語 etc.）

### 関係節の接続表現 候補

#### 案1: 線を太く / 鮮明にする（禁止）
- Phase 2-C で実施済み。Human Review で否定済み。
- 根本原因（cell border との混合）を解決しない。

#### 案2: connector shape の変更（JS 変更必要）
- 直角 L → 曲線（bezier curve）に変更すると明確に「接続」として認識される
- だが JS 変更（`_dgDrawRelConnectors` の path 計算変更）が必要
- Phase 2-E の選択肢として保留

#### 案3: dashed connector（CSS のみ）
- `stroke-dasharray: 5 3` で破線にする
- 破線は「solid な cell border と異なる」ことを脳が即座に判別する
- cell border（solid）と区別可能
- 実装: `.dg-rel-connector-svg path { stroke-dasharray: 5 3 !important; }`

#### 案4: 先行詞トークンの視覚強調（CSS のみ）— **推奨**
- 先行詞（antecedent）トークンに背景ハイライト（薄い紫）を追加
- `border-bottom: 2.5px solid var(--color-domain)` はそのまま
- `background: rgba(122,122,170,0.10)` を追加
- ユーザーは「ハイライトされた語」→「その下の関係節」という視線の流れを自然に追う
- 案3と組み合わせることで、①強調された先行詞、②破線の接続、③関係節ラベル という3要素が揃う

#### 案5: トークンスタイルの変更（CSS のみ）— **推奨**
- `.dg-token`: bordered box → underline スタイル
  ```css
  border: none;
  border-bottom: 1.5px solid rgba(0,0,0,0.15);
  background: transparent;
  border-radius: 0;
  padding: 1px 3px;
  ```
- ベースライン（水平線）が視覚的に最も強い要素になる
- 修飾語の接続線（diagonal、L-bracket）が明確に「diagram の線」として読める
- 結果: `baseline > connection line > token text` という正しい視覚優先順位

---

## 5. First Impression 評価（5段階）

### 現行 Phase 2-C vs. 提案 D

#### HDG

| 評価項目 | 現行 | 提案 D |
|---|---|---|
| First Impression | 3: 縦線のグリッドに見える | **4**: 一本の軸から深度が広がる |
| Readability | 3: 縦線が視線の流れを妨げる | **4**: 空白と文字で自然に追える |
| Structure | 3: 深度は追えるが骨格が埋もれる | **4**: 主節が常に明確な起点 |
| Visual Hierarchy | 3: solid > dashed > dotted は正確だが数える必要がある | **4**: 一本 + インデント → 即座に理解 |
| Density | 2: COL 1:9 で5本以上の縦線 | **4**: 縦線は1本のみ |
| Mobile | 3: 390px で border が横幅を食う | **4**: 横幅節約 |
| Identity | 3: 「ラベル付きネストリスト」に見える | **4**: 「折りたたみ可能な構造地図」 |
| Beauty | 3: 機能的だが意図が伝わらない | **4**: Intentional デザイン |

#### RK

| 評価項目 | 現行 | 提案 D |
|---|---|---|
| First Impression | 3: box のグリッドに見える | **4**: ベースラインが最初に目に入る |
| Readability | 3: 単純文は良い、複雑文で破綻 | **4**: 骨格が線として認識できる |
| Structure | 2: 関係節接続が不明 | **4**: 強調先行詞 + 破線 + 関係節ラベル |
| Visual Hierarchy | 3: ベースラインが box に埋もれる | **4**: baseline > text > line |
| Density | 3: box が多く詰まる | **4**: underline-style でより軽量 |
| Mobile | 3: box が幅を占有 | **4**: padding 削減で幅節約 |
| Identity | 3: 「box が並んだ表」に見える | **4**: 「線による骨格図」 |
| Beauty | 3: 機能的だが重い | **4**: 軽く、意図的 |

---

## 6. 390px 評価

### 現行 390px の問題

**HDG COL 1:9 (390px):**
- solid border (20px) + dashed border (16px) + dotted border (14px) = ネスト毎に幅が20px前後消費
- depth 3 のコンテンツは実質 390 - 70 = 320px 幅しか使えない
- bordered box（token）が全幅を使い、テキストが切れる

**RK COL 1:9 (390px):**
- L-connector のインデント + token box = 1行あたり実質 320px
- 複数トークンが横並びの場合（そして 私たち）は実質 280px 程度

### 提案 D 390px への効果

**HDG:**
- border-left 廃止 → インデントのみ（padding-left: 1rem per level vs. 今の border: 16px + padding: 8px+）
- depth 1: 節約 ~8px/level
- depth 3: 節約 ~24px → トークンの可読性が向上

**RK:**
- token underline style → box padding 削減（padding: 1px 3px vs. 今の 2px 6px）
- 全トークン幅が約 4-6px 削減
- 複数トークン横並びで効果が積算

---

## 7. 最終 Visual Grammar 案

### HDG — Design D（Root Anchor + Indent Map）

**核心原則:**
> 主節だけが「軸」。それ以外の深度は空白と字体で表現する。

```
[主節] ━━━━━━━ solid 3px border-left, lavender bg (UNCHANGED)
  [fn label] 主語          ← 88% opacity, 0.78rem (root only)
  [token] ことば

  [▼ 節]                  ← border: none, indent, small heading
    [fn label] 副詞的      ← 70% opacity, 0.63rem
    [▼ 前置詞句]           ← border: none, tiny label, deepest indent
      〜によって
      彼
    [fn label] 述語        ← 70% opacity
    なる
```

**具体的 CSS 変更:**

```css
/* Sub-clause の border を全廃（depth 1+） */
.hdg-clause--sub {
    border-left: none;
    padding-left: 0;   /* 既存 padding-left を別変数へ */
    margin-left: 0.8rem; /* border の代わりにマージン */
}

/* PP block: border なし、さらに小さく */
.hdg-clause--sub.hdg-clause--pp {
    border-left: none;
    padding-left: 0;
    margin-left: 0.6rem;
    background: transparent;
}

/* Depth-based background tint（border の代わりの深度表現） */
.hdg-clause[data-hdg-depth="1"] { background: rgba(0,0,0,0.012); border-radius: 4px; }
.hdg-clause[data-hdg-depth="2"] { background: rgba(0,0,0,0.020); }
.hdg-clause[data-hdg-depth="3"],
.hdg-clause[data-hdg-depth="4"],
.hdg-clause[data-hdg-depth="5"],
.hdg-clause[data-hdg-depth="6"],
.hdg-clause[data-hdg-depth="7"] { background: rgba(0,0,0,0.025); }
```

**変更しないもの:**
- 主節 border-left: 3px solid (唯一の縦線 → KEEP)
- 主節 background: lavender (唯一の色領域 → KEEP)
- collapse/expand 動作
- fn ラベル名称

---

### RK — Design D（Baseline-Primary + Token-Light）

**核心原則:**
> ベースラインが文の骨格。トークンはベースライン上のラベル。

```
                    [baseline: 2px, 高コントラスト]
[token] 主語  ┃  [token] 述語
主語            述語

[L-connector]
  [token] 副詞的   ← underline style, no box
  副詞的

[関係節 dashed-line →] なる | 一つ*       ← * = 先行詞 highlight
   [関係節] 〜するもの | なる
```

**具体的 CSS 変更:**

```css
/* 1. Token を underline スタイルへ */
.dg-token {
    border: none;
    border-bottom: 1.5px solid rgba(0,0,0,0.18);
    background: transparent;
    border-radius: 0;
    padding: 1px 4px 2px;
}

/* 2. 先行詞トークンに視覚的 highlight */
.dg-token--antecedent {
    background: rgba(122,122,170,0.12);
    border-bottom: 2.5px solid var(--color-domain, #7a7aaa);
    border-radius: 2px 2px 0 0;
}

/* 3. SVG コネクタを破線へ（solid cell border と区別） */
.dg-rel-connector-svg path {
    stroke-dasharray: 5 3 !important;
    stroke-width: 1.5 !important;
    opacity: 0.70 !important;
}

/* 4. 関係節エリアに薄い左アクセント（connector の着地点を示す） */
.dg-rel-clause {
    border-left: 2px solid rgba(122,122,170,0.22);
    padding-left: 0.5rem;
}

/* 5. ベースラインを太く（主要視覚要素として強化） */
.dg-baseline {          /* ← 実際のクラス名は要確認 */
    border-bottom-width: 2px;
}

/* 6. 副詞的ラベルを最小化（現行 50% → 45%） */
.dg-adv-fn {
    opacity: 0.45;
}
```

**関係節接続の視覚フロー（提案後）:**
1. ユーザーは「一つ」に薄紫の背景＋紫の下線を見る → 「これは特別なトークン」
2. 下にスクロールすると「関係節」ラベルが見える
3. そこから「一つ」に向かって破線が引かれている → 「ああ、一つの関係節か」

**変更しないもの:**
- L-bracket の形状（従属節/分詞節の接続表現）
- 斜め modifier 線
- ベースライン上の token 配置ロジック
- 間接目的語の elevation

---

## 8. JS / dg-engine.js / SR JSON 変更の要否

### CSS のみで実現できること（Phase 2-E 実装対象）

| 変更 | 方法 |
|---|---|
| HDG sub-clause border 全廃 | `.hdg-clause--sub { border-left: none }` |
| HDG depth-based background tint | `[data-hdg-depth="N"] { background: ... }` |
| HDG PP block 完全フラット化 | `.hdg-clause--pp { border: none; margin-left }` |
| RK token underline スタイル | `.dg-token { border: none; border-bottom: ... }` |
| RK 先行詞 highlight | `.dg-token--antecedent { background: ... }` |
| SVG connector 破線 | `.dg-rel-connector-svg path { stroke-dasharray: ... !important }` |
| 関係節 left accent | `.dg-rel-clause { border-left: 2px ... }` |

### JS 変更が必要なもの（Phase 2-F 以降の検討事項）

| 変更 | 理由 |
|---|---|
| SVG connector の曲線化 | `_dgDrawRelConnectors` の path 計算変更が必要 |
| 関係節ラベルへの先行詞名追加（「関係節 ← 一つ」） | renderer でのラベル生成ロジック変更 |
| RK 関係節を先行詞の真下に配置 | layout ロジックの変更が必要 |

### dg-engine.js: 変更不要 ✓
### SR JSON: 変更不要 ✓

---

## 9. Phase 2-E 実装計画

### 実装順序

**Step 1: HDG sub-clause border 廃止**
- `.hdg-clause--sub` の `border-left` を全廃
- depth-based background tint を追加
- PP block を完全フラット化
- 回帰テスト実行

**Step 2: RK token スタイル変更**
- `.dg-token` を underline スタイルへ
- ベースライン thickness 増加
- 副詞的ラベル opacity 調整

**Step 3: RK 関係節接続改善**
- `.dg-token--antecedent` background highlight
- SVG connector 破線化
- `.dg-rel-clause` left accent

**Step 4: スクリーンショット全ケース確認**
- 1024px: JHN 1:1, 1:3, COL 1:1, 1:9, MAT 28:5
- 768px: JHN 1:3, COL 1:1, 1:9
- 390px: JHN 1:3, COL 1:1, 1:9

**Step 5: 回帰テスト 9/9 PASS 確認**

**Step 6: HUMAN REVIEW で停止**

---

## 10. Design Freeze 条件

以下がすべて満たされれば Phase 2-D の設計を凍結し Phase 2-E 実装を承認する。

### HDG

- [ ] COL 1:9 で「縦線を数えなくても深度が追える」
- [ ] 主節（主語/述語）が画面を見た最初の2秒で認識できる
- [ ] 390px で横幅の節約が実感できる
- [ ] collapse/expand が引き続き機能する
- [ ] JHN 1:1 の簡単な文で「折りたたみ可能な深度マップ」に見える

### RK

- [ ] JHN 1:1 で「ベースラインが主要視覚要素」になっている
- [ ] JHN 1:3 で「一つ」が先行詞として即座に識別できる
- [ ] JHN 1:3 で「一つ → 関係節」の接続が説明なしで追える
- [ ] COL 1:9 で主節「やめる」のベースラインが最初に目に入る
- [ ] 390px で box よりも line が主役に見える

---

## 11. 許容するリスクと対策

| リスク | 対策 |
|---|---|
| HDG: border 廃止で depth 3+ が不明確になる | depth-based background tint で補完 |
| RK: token border 廃止でクリックターゲットが不明確 | hover state で border 表示（CSS :hover） |
| HDG: PP block 完全フラット化で「句」の区別が消える | PP ラベル文字（前置詞句）は維持、文字サイズで区別 |
| RK: underline token がギリシャ語の長単語で折り返す | white-space: nowrap 維持（既存動作） |
| 回帰: sub-clause border 廃止で collapse 表示崩れ | Phase 2-E で回帰テスト 9/9 確認 |

---

**PHASE 2-D: DESIGN COMPLETE → HUMAN REVIEW**  
**commit: NO / push: NO**

Human Review での確認事項：
1. HDG: border 廃止 + indent-only 案を承認するか
2. RK: token underline スタイル + 先行詞 highlight + 破線 connector 案を承認するか
3. Phase 2-E（CSS 実装）を開始してよいか
