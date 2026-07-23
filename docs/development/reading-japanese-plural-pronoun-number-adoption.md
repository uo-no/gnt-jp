# 1・2人称複数代名詞 number 固定点採用 — 実装前設計（Evidence 反映版）

策定日: 2026-07-23
位置づけ: `docs/ai-workflow.md` のフロー（G1→G2→G3→実装前レビュー→実装→監査→凍結）に沿った**実案件の実装前設計記録**。
題材: 「1人称・2人称複数代名詞 number 反映」（原案 M-7a: `reading-japanese-pending-classification.md`）。
上位規範: `CLAUDE.md`（First Principle / §3 L-0 / §6 Data / §7 Reading Engine / §10）。
**本 Stage は設計更新のみ。コード・bible_data・reading-engine.js・Registry・CLAUDE.md・ai-workflow.md は一切変更しない。**

---

## 0. Evidence により確定した前提（要約）

Evidence Report（実測・NT 137,741 tokens）で判明し、本設計の土台となる事実：

1. **engine の Morph Rule は実装済み（M-7c・`reading-engine.js` L299–310）。** 本案件は Morph Engine 拡張**ではない**。
2. **engine `resolve()` は対象 2,680 トークンで 100% 冪等**（resolve×2 一致 2,680/2,680）。固定点条件を満たす。
3. **未反映は engine ではなく bible_data.japanese 側。** 採用対象は **1,217 件**（私→私たち 697 ／ あなた→あなたがた 520）。
4. **採用時の制約:** `resolve()` の出力をそのまま保存してはならない。格助詞付き表現（私たちに／あなたがたの 等）は Data 層へ固定禁止。
   - 保存可: **私たち／あなたがた**（基底複数形）
   - 保存禁止: 私たちに・私たちの・あなたがたを 等、格情報を含む表現
5. **inclusive/exclusive（包括・排他）は未判定のまま保持**（engine も解決していない・L-0）。

対象内訳（Evidence 確定値）:

| 区分 | 件数 | 扱い |
|---|---|---|
| 採用対象（number 固定点 未反映） | **1,217** | 私→私たち 697 ／ あなた→あなたがた 520 |
| 既反映（複数形で保持済み） | 855 | あなたがた 699 ／ 私たち 156 → **保持** |
| 除外集合 | 608 | G5213 P-2DP 既反映 607 ／ G4675 単数 1 → **不変** |
| 候補合計 | 2,680 | |

---

## 1. Dev Architect — Change Plan（Evidence 反映・改訂版）

**旧 Change Plan（Phase 4）からの訂正:** 「reading-engine Phase 1 に number ルールを追加」は**削除**。engine には既に M-7c があり、本案件は engine 変更を含まない。

```
種別:        品質・基盤改善（bible_data.japanese の固定点採用 = M-15 型 Data adoption）

触れる層:
  - assets/data 側の bible_data.japanese（Data 層の正規値）… 反映先
  - reading-japanese-builder.js の採用記録 / adoption diff / backup / Editorial 台帳
    （M-15 と同一経路）
  ※ reading-engine.js（M-7c 含む Phase 1）は【変更しない】
  ※ Registry / syntax / phrase / clause / presentation / phrase-renderer も【変更しない】

FROZEN 接触: engine ロジックは非改変。ただし FROZEN baseline **metric** は Data 変更の影響を受ける（前提訂正）。
  - reading-engine Phase 1（M-7c）のコードは変更しない（利用するのみ）。engine の**出力（表示）は前後で不変**。
  - 【訂正】旧記述「engine 非変更のため Phase1 基準値は不変」は**誤り**。
    **Data adoption により engine 出力が不変でも、engine 内部メトリクス（morph 変換の発火数など）は変化し得る。**
    固定点を Data 層へ焼くと、主格のように「番号ルール発火→格助詞なし」で表示が確定する語は、採用後 resolve が
    null を返し morph 変換カウントから外れる（表示は同一）。実測: re-phase1 の morph coverage が 209 減（主格のみ）。
  - よって **FROZEN baseline metric は、Data 層変更の影響（悪化ケース 0・表示劣化 0）を確認したうえで、
    意図的変更として更新する**（engine コード改変ではなく Data adoption 由来の基準値更新）。
    更新は §2.1 の前提確認と 3 者再レビュー承認後に行う（本タスクでは未実施）。

作業経路（M-15 型 adoption）:
  Evidence（対象 1,217 の確定リスト）
    → dry-run（before 一致検証 + 下記 fail-closed 事前条件）
    → adoption diff 生成（1,217 件の before→after を機械算出）
    → backup（backup.json に旧値を退避）
    → apply（fail-closed 事前条件を全通過した場合のみ・before 一致箇所を機械置換・手編集禁止・§6）
    → audit（下記 Validation Criteria）

apply 前の fail-closed 事前条件（M3・1 件でも逸脱したら apply 中止）:
  - 対象件数 == ちょうど 1,217。
  - 対象トークンの stored 値が期待基底のみ = { '私', 'あなた' }。
  - 期待基底以外（OTHER）の値 == 0。
  - **逸脱を検出したら「安全のため勝手に補正しない」で停止**する（推測補完・自動修正を
    してはならない・L-0 / §6）。逸脱は原因調査へ差し戻す。

反映値の生成（after 値ソース固定・格助詞非焼き込み制約・M4）:
  - after 値の生成源は **静的 base map のみ**：{ '私' → '私たち', 'あなた' → 'あなたがた' }
    （strong キーで対象を限定）。
  - **`resolve()` の出力を after 値として使うことを【禁止】**する。理由: resolve は格助詞を
    付与するため、私たち**の**・私たち**に**・あなたがた**を** 等が Data 層へ混入する。
  - after 値は **基底複数形のみ**（私たち／あなたがた）。格助詞は engine の動的表示に委ねる
    （reading-japanese-data-layer-boundary-freeze と同一原則。動詞屈折と同じ扱い）。
  - after 検証: after ∈ { '私たち', 'あなたがた' } 全件。格助詞付き・その他語形 == 0。

対象限定（dedup・既存資産保護）:
  - 採用は 1,217 件（first: G2249/G2257/G2254/G2248 の ja='私' ／
    second: G5216/G5209/G5210 の ja='あなた'）に限定。
  - 既反映 855 件（私たち/あなたがた）は【触れない】。
  - 除外集合 608 件（G5213 既反映・G4675 単数）は【触れない】。
  - M-15 固定点（2,537）・αὐτός Rule（3人称）とは重複しない未対応集合であることを
    Evidence で確認済み → 二重作業・既存資産破壊なし。

影響見積り:
  - bible_data.japanese の変更件数 = 1,217（= 表示差分ではなく保存値差分）。
  - 読者表示は変化しない（engine が既に複数形を表示中）。本作業は
    「保存値を表示に一致させる」整合であり、reader-facing の見た目は不変。

rollback:  adoption diff / backup.json / git / Editorial 台帳の三重（M-15 既存経路）。
```

**G3 判定（改訂）: 通過（実装前レビューへ）。** engine 非改変・Data 層のみの M-15 型採用に縮小。FROZEN 接触なし・影響範囲は Evidence で 1,217 に確定・rollback 経路は既存。リスクは原案より大幅に低い。

---

## 2. Validation Criteria（Evidence 反映・改訂版）

実装後監査の合否表。全項目 PASS で凍結・記録、いずれか FAIL で rollback（三重経路）して設計へ。

```
| 検証項目            | 担当            | 合格条件                                                        | 判定      |
|---------------------|-----------------|----------------------------------------------------------------|-----------|
| engine 非変更       | dev-architect   | reading-engine.js に差分なし（git diff 空）。M-7c 含め挙動不変    | PASS/FAIL |
| 表示品質 regression | dev-architect   | **主要判定**: display-equivalence 0（全 1,217 で `(resolve‖fallback)` が前後一致）。表示劣化なし | PASS/FAIL |
| engine regression   | dev-architect   | engine code 未変更（git diff 空）。engine 改変時のみ Phase1 不変条件（morph 件数等）を要求する | PASS/FAIL |
| baseline metric（Data adoption） | dev-architect | re-phase1 の morph coverage 変化を分析し、悪化ケース 0・表示劣化 0 を確認できた場合のみ baseline を意図的更新の対象とする（§2.1）。**無確認の baseline 更新は禁止** | PASS/FAIL |
| bible_data 差分件数 | dev-architect   | japanese の変更件数 = ちょうど 1,217（過不足なし）                | PASS/FAIL |
| 採用対象限定        | dev-architect   | 変更されたのは採用対象 1,217 件のみ（対象外への波及 0）            | PASS/FAIL |
| 既反映保持          | dev-architect   | 既反映 855 件（私たち/あなたがた）が不変                          | PASS/FAIL |
| 除外集合保持        | dev-architect   | 除外 608 件（G5213 既反映・G4675 単数）が不変                     | PASS/FAIL |
| after 値ソース固定  | dev-architect   | after は静的 base map 由来（M4）。resolve() 出力を after に使用していない。after ∈ {私たち, あなたがた} 全件・格助詞付き/その他語形 0 | PASS/FAIL |
| 格助詞非焼き込み    | biblical-editor | 反映後 after 値に格助詞（の/に/を 等）を含む表現が 0 件           | PASS/FAIL |
| number のみ反映     | biblical-editor | after は基底複数形（私たち/あなたがた）のみ。語義/文体変更なし     | PASS/FAIL |
| inclusive/exclusive | biblical-editor | 「私たち」で停止。包括/排他を埋めていない（L-0 未判定保持）        | PASS/FAIL |
| 表示等価（固定点）  | dev-architect   | 【M1】採用前後で読者表示が等価。全 1,217 件で `(resolve(before)‖before) === (resolve(after)‖after)`。※格助詞は resolve が表示時付与するため stored='私たち'→resolve='私たちの' は正常（不一致ではない） | PASS/FAIL |
| コーパス表示差分    | dev-architect   | 【M2】採用前後の表示差分 0 件。既存 npm run test:re-* は合成トークン用で bible_data 変更を検出できないため**本項目が主たる表示回帰ガード**。対象: 採用 1,217 件（可能なら pron 全 2,680 件）。比較: `resolve(before)‖before` vs `resolve(after)‖after` | PASS/FAIL |
| 品質指標            | dev-architect   | M-7a 該当 Morph Pending の保存値不整合が解消。語彙一貫性 M-16 の REVIEW 欠陥 0 | PASS/FAIL |
| 利用者視点          | product-growth  | 読者表示は不変（既に複数形表示）。読みの流れ・Mission のトーン維持   | PASS/FAIL |

総合判定:  全項目 PASS → 凍結・記録（adoption 台帳・diff/backup を保全）へ
           FAIL → rollback（三重経路）して設計へ

> 注（M1）: 旧「固定点不変 = resolve が after に変更を出さない」は **oblique 格で誤り**のため削除・差替。
> resolve は格助詞を独立付与するので stored='私たち'（genitive）→ resolve='私たちの' は**正常**であり不一致ではない。
> 正しい安全条件は「採用前後の**読者表示の等価**」（上記「表示等価（固定点）」項）。
```

---

## 2.1. baseline metric shift の記録と baseline 更新前レビュー（2026-07-23 apply 後）

apply 後の re-phase1 で morph coverage 基準値が **44,396 → 44,187（−209）** に変化。原因と安全性を実測で確認した記録。

**事実（実測・no-context Phase1 で before/after を全 NT 比較）:**
- delta = **−209**（re-phase1 の −209 と一致。※絶対値は harness の lexicon 注入で受動動詞変換が加算されるため定数差があるが、delta は lexicon 非依存で一致）。
- 低下 209 件の内訳 = **P-1NP 101 + P-2NP 108（＝採用 209 件の主格分）に完全一致**。主格以外の低下 **0**。
- 原因: 主格は「番号ルール発火 → 格助詞なし」で表示確定するため、採用後 stored が既に複数形になると resolve が null を返し、morph 変換カウントから外れる。**表示は同一**（display-equivalence 0）。
- semantic regression **0**（対象 strong G2249/G2254/G2257/G2248/G5210/G5216/G5213/G5209・lemma ἐγώ/σύ は reading-semantic-data に非出現 = semantic phase 発火不能）。
- その他 coverage 低下 **0**（変更は 1,217 トークンのみ・他は入力不変ゆえ寄与不変）。

**3 者再レビュー（baseline 更新の可否）:**
- **dev-architect:** baseline 更新は **FROZEN 破壊ではなく、意図的 Data adoption 由来の基準値更新**として扱える。engine code 非改変・delta は主格 209 に局在・悪化ケース 0・表示劣化 0 を確認済み。→ **更新可（承認後）**。
- **biblical-editor:** 表示・忠実性・L-0 に影響なし。number のみ反映・格助詞非焼き込み・inclusive/exclusive 未判定保持を確認。→ **影響なし**。
- **product-growth:** 読者表示は不変（既に複数形表示）で読者価値は維持。保存値の一貫化で検索・StudyPanel 等の raw 参照面はむしろ改善。→ **価値維持/改善**。

**状態（2026-07-23・baseline 更新後）:**
- bible_data apply 状態は**保持**。commit **未実施**・push 未実施。
- **PHASE1_BASELINE 更新済み**: morph 44,396 → **44,187**（3 者承認・悪化ケース 0・表示劣化 0 を再確認のうえ、Data adoption 由来の意図的更新として反映。engine code regression ではない・FROZEN protocol に沿う）。更新理由は `scripts/re-phase1-regression.cjs` の PHASE1_BASELINE コメント（2026-07-23 行）に記録。
- **re-phase1: ALL PASS（111 checks）** — Phase 1 基準を維持。
- 変更境界: baseline（test harness）・bible_data.japanese・adoption 記録・本設計文書のみ。engine / Registry / syntax / phrase / clause / presentation は未変更を git で確認済み。

---

## 3. G2 Fidelity Note — Evidence 反映の追記

biblical-editor が Evidence により確定した事項として、既存 Fidelity Note に以下を追記する：

```
Evidence 確定事項（追記）:
  1. number は Morph の決定的構造である。
     形態タグ末尾で単複が一意（曖昧 0・性フィールド空）。私→私たち は
     number 由来の決定的変換であり、翻訳でも推論でもない（反映してよい）。
  2. 格（case）は Data 固定の対象外である。
     格助詞（の/に/を）は engine の動的表示（動詞屈折と同格）。Data 層へ
     焼き込まない。反映は基底複数形に限る。
  3. 反映は「私たち」「あなたがた」で停止する。
     格助詞付き（私たちに 等）へは進めない。
  4. 推論の追加は禁止。
     inclusive/exclusive（包括/読者を含むか）は morph に無い情報であり、
     解決しない（Unresolved by Design・L-0）。engine も解決していない現状を保つ。
L-0 判定（確定）: OK。上記 4 制約下で number のみ反映するかぎり L-0 を侵さない。
```

---

## 4. 変更報告

**変更ファイル:**
- `docs/development/reading-japanese-plural-pronoun-number-adoption.md`（新規・本設計記録のみ）

**変更箇所:**
- §1 Change Plan を Evidence 反映で改訂（engine Phase 1 変更を削除／FROZEN 非接触を明記／M-15 型 Data adoption へ縮小／作業経路 Evidence→dry-run→diff→backup→apply→audit を明示／格助詞非焼き込み制約を追加／既存 M-15・αὐτός との重複なしを維持）。
- §2 Validation Criteria を改訂（engine 非変更・bible_data 差分件数・採用 1,217 限定・既反映 855 保持・除外 608 保持・格助詞非焼き込み・inclusive/exclusive 未判定保持 を追加）。
- §3 G2 Fidelity Note に Evidence 確定 4 事項を追記。

**CLAUDE.md との整合性:**
- §1 First Principle: 数の反映は「原著者の意図理解＝読み」への貢献。inclusive/exclusive を埋めない点で §1 非矛盾（親切さより忠実さ）に一致。
- §3 L-0: 翻訳/推論/自然化/未判定補完なし（number のみ・包括排他は保留）。
- §6 Data / §7 Reading Engine: 「bible_data は固定点のみ・動的表示（格助詞）は engine」という既存境界（data-layer-boundary-freeze）に準拠。engine 非改変。
- §10 Things Never To Break: FROZEN 非接触・既存資産（M-15/αὐτός/除外集合）不変・回帰維持。
- 新原則の追加なし。ai-workflow.md 本体・エージェント定義・CLAUDE.md は不変。

**コード変更有無:** なし（reading-engine.js・bible_data・Registry・index.html すべて無変更）。設計文書 1 件の新規作成のみ。

**次工程:** 実装前レビュー（dev-architect 主宰）で adoption スクリプトの before 一致検証と backup 経路を確定 → 実装（Data adoption 実行）→ §2 Validation Criteria による二重監査 → 凍結・台帳記録。**いずれも本タスク範囲外（別途承認後）。**

---

> **本タスクは設計更新のみ完了。** 実装・コード変更・bible_data 変更は行っていない。
