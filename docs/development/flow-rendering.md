# Flow Rendering 設計正典（Stage B）

作成: 2026-07-17
位置づけ: Reading Engine 次期ロードマップ Stage B の設計書。
Stage A（docs/phrase-rendering.md）と対をなす。

---

## 0. 責務宣言（本書の最上位規範）

> **Flow Renderer は日本語を生成しない。
> Reading Engine が生成した Reading Japanese を語順のまま表示するだけの層である。**

| 層 | 責務 |
|---|---|
| **Reading Engine（FROZEN）** | 日本語の決定（語義・活用・助詞・前置詞・semantic）— **唯一の SSOT** |
| **Flow Renderer（本書）** | 表示構造・チップ生成・色（roleClass）・文法ラベル（dpGrammarClasses / morphText）・区切り（phraseBreakBefore）・signals |
| **Phrase Renderer（Stage A・FROZEN）** | 句引用の整形 |

Flow Renderer に**禁止**される処理: japanese の決定・語義判断・前置詞訳・
活用変換・semantic 判断。

### SSOT の保証（同一トークン = 同一日本語）

```
Flow chip の japanese
  = StudyPanel の japanese
  = Phrase 引用の語 japanese（引用整形前）
  = 原語タブの japanese
  = Engine.resolve(token, context) の結果（null なら w.japanese）
```

resolve は決定的（同じ入力 → 同じ出力）なので、各表示が独立に resolve
しても一致は保証される。Flow はさらに節単位キャッシュ（§2）で共有する。

## 1. 現状の問題（Stage B 監査 2026-07-17）

- チップ表示は `w.japanese` + `_naturalize()`（Engine Phase 1 の元になった
  旧規則の生き残り）で生成されており、Engine で修正済みのバグを
  そのまま表示している（実証: なた・語ながら・なよ・答えられる）
- 同じ語で chip「なよ」→ StudyPanel「なれ」の不整合が本番で発生
- semantic（465 件）・syntax（4,194 件）・particle（3,123 件）の改善が
  Flow に一切伝播していない
- ドロワー（wlv-dd-ja）・原語タブ（_buildGreekTabHTML）も生 japanese 直読み

## 2. Resolve Cache（節単位・性能設計）

```
節 words
   ↓
_buildVerseResolveCache(words)
   │  各トークン i について（本番 StudyPanel と同一の context 構築）:
   │    ctx_i = _buildReadingContext(words, i)   ← ContextBuilder.build
   │    resolved[i] = App.readingEngine.resolve(words[i], ctx_i)
   ↓
resolved: (ResolveResult | null)[]   ← 節につき 1 回だけ生成
   ↓
_wordToFlowChip(w, i, bookKey, ch, resolved[i])   ← チップ生成（3 箇所共通）
ドロワー / 原語タブ も同じ resolved を参照
```

- キャッシュは verse block に保持（既存の `block._flowChips` と同様に
  `block._flowResolved`）。チップ・ドロワー・原語タブが再 resolve しない
- 注意: ContextBuilder.build は**対象語ごと**に節分割（clause）・主動詞を
  解決するため、トークンごとの呼び出しが正しい仕様（particle 層の は/が が
  これに依存）。節内で共有できるのは phrases / hasPassiveVerb のみ。
  per-token 呼び出しは節 30 語規模で問題ない想定だが、⑤の NT 監査で
  **章レンダリング相当の実測時間**を計測し、性能ゲートとする
  （超過時の最適化は Stage D Context Layer の課題として引き継ぐ）

## 3. Fallback 設計（3 段階）

| Tier | 条件 | 表示 |
|---|---|---|
| 0（正常） | resolve が ResolveResult を返す | `resolved.japanese`（Engine 出力そのまま — 格助詞込み） |
| 1（resolve null） | Engine が改善なしと判断 | **`w.japanese` 素のまま**（StudyPanel・Phrase 引用と同一の fallback） |
| 2（rollback） | Engine 未ロード / キャッシュ生成失敗 / 例外 | **完全旧経路**（`_naturalize` 込みの従来チップ） |

**設計判断（発注時仕様からの明示的調整）**: 発注条件では「resolve null →
旧表示」だが、旧表示（`_naturalize`）を Tier 1 に使うと
(a) StudyPanel（fallback = 素の japanese）と乖離して SSOT 保証（§0）が破れ、
(b) Engine が意図的に fallback した語（語る 等）にだけ破損形（語ながら）が
復活する。よって **Tier 1 は素の `w.japanese`**、`_naturalize` を含む旧経路は
**Tier 2（Engine 自体が使えない時の rollback）専用**とする。

## 4. `_naturalize()` の扱い

- **削除禁止**。旧経路比較用・rollback 用・Tier 2 fallback 用として残置
- 新 Flow 経路（Tier 0/1）からは呼ばない
- Stage A の旧 `renderPhraseJP` / `_PP_TRANS_JP` と同じ扱い
  （削除判断は次 Stage 以降でまとめて行う）

## 5. 変更対象（すべて追加方式）

| 箇所 | 変更 |
|---|---|
| `_buildVerseResolveCache(words)` | **新設**（index.html。抽出可能なマーカー `__FLOW_CHIP_BEGIN__/END__` で囲む） |
| `_wordToFlowChip(w, i, bookKey, ch, resolved?)` | **省略可能引数を追加**。resolved 指定時: gloss/jaWord = Tier 0/1。未指定時: 従来動作（= Tier 2 経路そのもの。既存呼び出しは無変更で動き続ける） |
| チップ生成 3 箇所（本文フロー / 流れタブ / Greek Flow View） | キャッシュを生成して resolved を渡す |
| ドロワー `wlv-dd-ja` | `chip.jaWord`（= Tier 0/1 適用済み）を表示（構造変更なし） |
| 原語タブ `_buildGreekTabHTML` | 同じキャッシュの resolved を参照 |
| roleClass / signals / morphText / phraseBreakBefore | **不変更**（表示メタは Flow の責務のまま） |

Engine・ReadingLexicon・PhraseRenderer・Phrase Reading・凍結スクリプト群は
一切変更しない。

## 6. Stage A との責務境界（不変）

- Phrase Renderer: 句引用の整形（句末助詞省略・冠詞スキップ・並べ替え）
- Flow Renderer: 語順フロー表示（**省略しない** — 世の知恵を・神は をそのまま）
- Reading Engine: 日本語決定

## 7. 検証計画（Stage B ⑤〜⑧）

1. **単体**: `_wordToFlowChip`（マーカー抽出）— Tier 0/1/2 の分岐・
   表示メタ不変・既存引数互換
2. **NT 全巻監査**（scripts/re-stageB-audit.cjs）:
   - チップ gloss の新旧差分（件数・分類・サンプル）
   - **破損形の残存 0**（なた/なよ/語ながら 型の機械検出）
   - **chip ⇔ StudyPanel 一致率 100%**（同一トークンで chip の japanese と
     inspect 経路の japanese が一致することの機械検証 = SSOT の証明）
   - 章レンダリング相当の実測時間（性能ゲート）
3. **回帰**: scripts/re-stageB-regression.cjs（基準値凍結）+ 既存全回帰 PASS
4. **実表示監査**: re-phase5d-display-audit（600 節）は既に新チップ経路と
   同一の Engine 出力でフロー行を生成しているため、chip 切替後の表示と
   一致することを確認する
5. **凍結**: `[FROZEN]` マーカー + 基準値固定

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-17 | 初版（Stage B ②設計。SSOT・resolve cache・3 段階 fallback） |
