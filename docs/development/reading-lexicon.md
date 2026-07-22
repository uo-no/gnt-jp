# Reading Lexicon 設計正典（Phase 4 Lexicon Layer）

作成: 2026-07-16
位置づけ: Reading Engine v2 ロードマップ Phase 4 の設計書。
実装前の設計文書であり、実装後は本書と実装の食い違いを本書の改訂で解消する。

---

## 1. 目的と責務境界

> **ReadingEngine が語彙知識を持たない構造へ移行する。**

Phase 4 の責務は **「lemma を引くと語義候補と語彙属性を返す辞書層」まで**。

| やること | やらないこと |
|---|---|
| lemma → 語義候補リスト（glosses）を返す | 語義の**選択**（文脈判断 — Phase 5 Semantic） |
| lemma → デポネント等の語彙属性を返す | 訳文の生成・言い換え |
| ReadingEngine 内の lemma リストをデータへ移管 | 表示判断（呼び出し元の責務のまま） |

## 2. 現状の語彙知識の棚卸し（移管対象の判定）

reading-engine.js 内に現在存在する「知識」と、その扱い:

| 定義 | 内容 | 判定 |
|---|---|---|
| `_PASSIVE_SKIP_LEMMAS`（Phase 1） | デポネント・自動詞グロスの 18 lemma | **今回移管**（本来の Lexicon 知識。Phase 1 実装時から移管予定と明記済み） |
| `_EN_DATIVE_LEMMAS`（Phase 2-A FROZEN） | ἐν+与格「にあって」許可の 4 lemma | **移管候補・今回は対象外**（2-A 凍結の変更を伴うため Phase 4-C 以降で別途判断） |
| `_COPULA_LEMMAS`（Phase 3-A FROZEN） | εἰμί/γίνομαι/ὑπάρχω | **対象外**（語彙知識ではなく統語機能語の定義。Analyzer 側の登録と同種） |
| `_PARTICLE_SKIP_GLOSSES`（「ある」） | 助詞を付与できない日本語グロス | **対象外**（ギリシャ語 lexicon ではなく日本語側の形態規則） |

## 3. データ設計

### 3.1 ファイル構成

```
assets/data/reading-lexicon-data.js   ← 生成物（手編集禁止）
core/reading-lexicon.js               ← ReadingLexicon クラス
scripts/build-reading-lexicon.cjs     ← 生成スクリプト（bible_data から集約）
```

**JSON ではなく JS ファイル（script タグ同期読み込み）とする理由:**
デポネントガードは最初の `resolve()` 呼び出しから必要になる。fetch（非同期）だと
初回チップタップとの競合で「答えられる」等の破損が再発しうる。script タグは
記述順に同期実行されるため、読み込み順序だけで安全性が保証される。

### 3.2 スキーマ

```javascript
// assets/data/reading-lexicon-data.js（生成物）
window.App.readingLexiconData = {
  version: 1,
  generated: '2026-07-16',
  source: 'bible_data NT + 手動デポネント判定（Phase 1 監査由来）',
  entries: {
    'ἀποκρίνομαι': {
      lemmaId: 'grc:G0611',        // lexicon-lite / Abbott-Smith との結合キー
      strong:  'G0611',
      glosses: ['答える'],          // bible_data.japanese の頻度順ユニーク集約
      deponent: true,               // 形は受動・意味は能動
      intransitiveJa: false,        // 日本語グロスが自動詞（受動変換不可）
    },
    'ἵστημι': {
      lemmaId: 'grc:G2476',
      strong:  'G2476',
      glosses: ['立つ', '立てる'],
      deponent: false,
      intransitiveJa: true,
    },
    'λόγος': {
      lemmaId: 'grc:G3056',
      strong:  'G3056',
      glosses: ['ことば', '話', 'こと'],   // Phase 4-B で全 lemma に集約生成
      deponent: false,
      intransitiveJa: false,
    },
    // ...
  },
};
```

**設計判断: `passiveSkip` という操作フラグではなく `deponent` / `intransitiveJa`
という記述フラグで持つ。** 「受動変換をスキップする」は ReadingEngine 側の
解釈（派生値）であり、データは言語事実だけを記述する。将来 Abbott-Smith や
Louw-Nida の情報と付き合わせる時、記述フラグは検証・拡充できるが
操作フラグは再利用できない。

### 3.3 将来拡張（Phase 4-C 以降・スキーマ予約）

既存の `assets/data/lexicon/lexicon-lite.json`（5,440 エントリ・lemmaId キー・
gloss_ja / abbottSmith / ln 保有）が主要なマージ元。`lemmaId` を結合キーとして:

```javascript
    'λόγος': {
      // ...既存フィールド...
      gloss_ja: 'ことば',            // lexicon-lite 由来の代表訳
      louwNida: ['33.98', '13.115'], // ln フィールド（Phase 5 の語義選択の入口）
      abbottSmithRef: true,          // 全文は lexicon-lite 側に置き、参照だけ持つ
    }
```

Abbott-Smith 全文のような重いデータは reading-lexicon-data.js に**複製しない**
（既存の非同期ロード資産をそのまま使い、ReadingLexicon は将来 `enrich(liteData)`
メソッドで到着後にマージする — Phase 4 では未実装・予約のみ）。

## 4. ReadingLexicon API（core/reading-lexicon.js）

```javascript
class ReadingLexicon {
    /**
     * @param {Object} data  reading-lexicon-data.js の内容（注入。fetch しない）
     */
    constructor(data)

    /**
     * lemma を引いて語義候補と語彙属性を返す。
     * @param {string} lemma  ギリシャ語 lemma（トークンの token.lemma と同形）
     * @returns {LexiconEntry | null}  未登録 lemma は null
     *
     * LexiconEntry = {
     *     lemma:          string,
     *     glosses:        string[],   // 語義候補（選択しない・返すだけ）
     *     deponent:       boolean,
     *     intransitiveJa: boolean,
     *     lemmaId:        string,     // 将来の結合キー
     *     strong:         string,
     * }
     */
    lookup(lemma)

    /**
     * ReadingEngine 用の派生プロパティ:
     * 受動変換をスキップすべき lemma か（deponent || intransitiveJa）。
     * 未登録 lemma は false。
     * @returns {boolean}
     */
    passiveSkip(lemma)
}
```

- 戻り値は毎回凍結オブジェクト（`Object.freeze`）。呼び出し側の改変を防ぐ。
- 例外は投げない（不正入力は null / false）。reading-projection.js と同じ Failure Mode。

## 5. ReadingEngine が参照する最小インターフェース

**Phase 4 で engine が触れるのは `passiveSkip(lemma)` の 1 メソッドのみ。**
`lookup()` の glosses は Phase 5（Semantic）の消費者向けで、Phase 4 の engine は読まない。

```javascript
class ReadingEngine {
    setLexicon(lexicon)   // ReadingLexicon インスタンスを注入（省略可）
    // 内部: this._lexicon = null 初期値
}
```

- **注入は context ではなくインスタンスレベル**（setLexicon）。lexicon は
  節ごとに変わらないグローバル資源であり、ResolveContext（節スコープの
  純粋データ）とは寿命が異なる。
- engine は ReadingLexicon の内部構造を知らない（`passiveSkip` の bool だけ）。

### 劣化モード（lexicon 未注入時）

`_PASSIVE_SKIP_LEMMAS` は engine から**完全に削除**する。lexicon 未注入の場合:

> **受動変換を全面スキップする（安全側に倒す）。**

- 誤答方向の比較: 未注入で受動変換を続けると「答えられる」等の**意味破壊**が再発する。
  受動変換を止めると「呼ばれる」が「呼ぶ」のままになるだけ（**fallback = 悪化しない**）。
  Phase 1 の安全原則「改善できる場合のみ生成し、悪化する場合は fallback」に一致する。
- ブラウザでは script タグ順序（data → lexicon → engine → 注入）で常時注入される
  ため、劣化モードはデータスクリプトのロード失敗時のみ。

## 6. 読み込みと注入経路

```html
<!-- index.html: 記述順 = 実行順（同期） -->
<script src="../assets/data/reading-lexicon-data.js"></script>
<script src="../core/reading-lexicon.js"></script>
<script src="../core/reading-engine.js"></script>
<!-- reading-engine.js 末尾の初期化部で:
     window.App.readingLexiconData があれば
     readingEngine.setLexicon(new ReadingLexicon(data)) を実行 -->
```

Node（監査・回帰テスト）: requireCjs で 3 ファイルを読み、明示的に
`engine.setLexicon(new ReadingLexicon(data))` を呼ぶ。

## 7. 移管手順（凍結プロトコル適用）

`_resolveMorph` は Phase 1 FROZEN のため、以下の手順で**挙動等価**を保証する:

1. `scripts/re-phase1-regression.cjs` に lexicon 注入を追加し、
   デポネントケース（既存 5 件）が**注入済み engine で**同じ結果になることを先に確認
2. 劣化モードの回帰ケースを追加（lexicon 未注入 → 受動変換なし = null）
3. `_resolveMorph` の `_PASSIVE_SKIP_LEMMAS.has(token.lemma)` を
   `this._passiveSkipLemma(token.lemma)`（lexicon 委譲）に置換し、
   `_PASSIVE_SKIP_LEMMAS` 定義を削除
4. `scripts/re-phase2-audit.cjs` に lexicon 注入を追加
5. NT 全巻監査 → **全基準値が不変であること**
   （morph 44,591 / syntax 4,266 / particle 3,131 / 悪化ケース 0）
   = 移管が挙動等価である機械的証明
6. `test:re-phase1` / `test:re-phase2` / `test:re-phase3` 全 PASS

基準値が 1 でも動いたら移管に誤りがある（データ転記ミス等）。

## 8. 段階分割

| 段階 | 内容 | 完了条件 |
|---|---|---|
| **4-A** | ReadingLexicon クラス + データファイル（18 lemma のみ）+ `_PASSIVE_SKIP_LEMMAS` 移管 | 全基準値不変・全 regression PASS |
| **4-B** | `scripts/build-reading-lexicon.cjs` で NT 全 lemma の glosses を bible_data.japanese から頻度順集約・生成 | lookup(lemma).glosses が全 lemma で返る。engine の挙動は不変（glosses は誰も消費しない） |
| **4-C**（将来） | lexicon-lite（gloss_ja / ln）マージ、`enrich()` 実装、`_EN_DATIVE_LEMMAS` 移管判断 | Phase 5 着手前に判断 |

4-B の生成は決定的（同じ bible_data から同じ出力）とし、生成物は
コミットする（fetch 依存を避けるため）。

## 9. 検証計画

- 単体: lookup 正常系 / 未登録 lemma / 不正入力 / passiveSkip 派生値 / freeze 確認
- 移管等価性: §7 の基準値照合（これが本命）
- 劣化モード: lexicon 未注入 engine で受動変換が全て null になること
- 新規 regression: `scripts/re-phase4-regression.cjs`（4-A 完了時に作成・凍結）

## 実装記録

### Phase 4-A（2026-07-16 完了）

- `core/reading-lexicon.js` + `assets/data/reading-lexicon-data.js`（19 エントリ）
- `_PASSIVE_SKIP_LEMMAS` を engine から削除し `entry.deponent` へ移管
- **設計変更（ユーザー決定）**: lookup キーは lemma ではなく **lemmaId**。
  この決定により JHN 7:53/8:1 の Unicode 表記ゆれ（ύ=U+1F7B）による
  隠れ悪化 2 件（πορεύομαι→行かれた）を発見・修正。morph 基準値 44,591→44,589
- 劣化モードは設計より厳格化: 受動トークンは**法変換も含め全変換なし**
  （受動を落として命令だけ掛かると「惑わせ」の意味逆転が起きるため）
- エントリの記述フラグは deponent のみに簡素化（intransitiveJa への分割は 4-C で判断）

### Phase 4-B（2026-07-16 完了）

- `scripts/build-reading-lexicon.cjs`（`npm run build:lexicon`）で
  bible_data 全体（nt+lxx）から glosses を生成。5,440 エントリ・458KB
- 重複除去・頻度順（同数は初出順）・placeholder 除外・決定的生成
- deponent フラグの SSOT は生成スクリプトの `DEPONENT_LEMMA_IDS`（再生成で維持）
- **発見**: bible_data.japanese は実質 lemma 均一（複数候補を持つのは
  5,440 中 3 lemma のみ）。真の多義候補は Phase 4-C の lexicon-lite
  （gloss_ja）・Abbott-Smith 由来で供給する必要がある
- LXX は lemmaId・japanese とも未整備のため寄与ゼロ（将来整備時は再実行で反映）
- ReadingEngine の挙動は完全不変（全 regression PASS・基準値不変）

### Phase 4-C（2026-07-16 完了）

**二層構造の確立:**

- **基本層**（同期・511KB）: build-reading-lexicon.cjs が Abbott-Smith 語義
  パーサ（【語義】セグメント・①センスマーカー・「」引用の3抽出源＋
  文法ラベル/参照記号/長文定義のノイズ除去）で glosses を補完。
  並び: bible_data 実使用（頻度順）→ Abbott-Smith 語義 → gloss_ja
- **補強層**（非同期）: `ReadingLexicon.enrich(liteData)` が lexicon-lite
  到着後に glossJa / abbottSmith 全文 / semanticDomains（ln・domains）を付与。
  配線: index.html `_ensureSemanticData` → `App.readingLexicon.enrich(_lexiconData)`。
  enrich 前の lookup も安全（補強フィールドは null）

**監査結果（scripts/re-phase4c-audit.cjs・AUDIT PASS）:**

| 指標 | 値 |
|---|---|
| 複数語義候補を持つ lemma | 3 → **3,873（71.2%）** |
| NT トークン加重の複数候補カバレッジ | **80.9%** |
| ln（Louw-Nida）利用可能トークン | **100%** |
| abbottSmith / glossJa / domains | 98.3% / 87.8% / 99.9% |

**Phase 5 への注意（enrich タイミング）**: 補強層は lexicon-lite の非同期
ロード後に有効になる。Phase 5 Semantic が semanticDomains を resolve 時に
使う場合、初回チップタップ時点では未補強の可能性がある（fallback で安全だが
非決定的）。決定性が必要なら ln コードの基本層への焼き込み（推定 +300KB）を
Phase 5 設計時に判断する。

### _EN_DATIVE_LEMMAS の移管評価（2026-07-16・移管しない）

1. **性質が違う**: deponent は「語の言語事実」（どの規則からも参照できる）。
   _EN_DATIVE_LEMMAS は「ἐν+与格→にあって という特定規則の適用範囲設定」であり、
   辞書へ移すと lexicon が規則設定の置き場になる（責務混濁）
2. **実利がない**: Unicode 表記ゆれ実査で、対象 4 lemma の変異個体は
   JHN 8:11 κύριε（呼格）の 1 件のみ — ἐν+与格に該当せず、
   πορεύομαι の時のような隠れ悪化は存在しない
3. **寿命が短い**: Phase 5 Semantic が ἐν の意味選択を実装すれば
   このホワイトリスト自体が置き換え候補。移管してもすぐ廃止される可能性が高い

将来ホワイトリストを拡張する場合は、lexicon ではなく lemmaId キーの
新テーブル（Phase 2-C 追加方式）として実装すること。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-16 | 初版（Phase 4 設計。実装前） |
| 2026-07-16 | Phase 4-A 実装記録（lemmaId キー・劣化モード厳格化） |
| 2026-07-16 | Phase 4-B 実装記録（glosses 生成・データソース制約の発見） |
| 2026-07-16 | Phase 4-C 実装記録（二層構造・AS語義パーサ・enrich・EN_DATIVE 評価） |
