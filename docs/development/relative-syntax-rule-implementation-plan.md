# 関係詞 Syntax Rule Engine 実装計画(Stage K-2)

策定日: 2026-07-20
位置づけ: Morph Rule Engine v1(FROZEN)の設計思想を継承し、関係詞の Syntax 情報(role / referent)を
**安全に扱う Syntax Rule Engine の実装計画**を策定する。
根拠: docs/relative-syntax-rule-design.md(K-1・FROZEN 候補)・morph-rule-engine-v1-frozen.md(J-9)。

**本文書は設計・責務・実装範囲・QA 計画のみ。コード・擬似コード・JSON は含まない。本 Stage(K-2)で
コード・データは変更しない。** reading-engine.js / bible_data / Semantic / Presentation / generated data は
変更しない。

前提: 関係詞 Morph(gender→者/もの)は実装済(J-6b)。対象 lemma: ὅς(G3739)/ ὅστις(G3748)/
ὅσος(G3745)。関係詞総数 1,658・束縛関係(referent 有)1,071・自由関係(referent 無)587・
role 注釈あり 1,348。

---

## 1. Syntax Rule Engine の責務定義

Syntax Rule Engine は、**bible_data に注釈済みの構造情報(role / referent)を読み取り、関係詞の節内役割と
先行詞リンクを保持する**層である。

- **役割標示**: `role`(s=主語 / o=目的語 / adv=副詞 / io=間接目的 / p=補語 / o2=第二目的)を読み取り、
  関係詞の**節内役割**として保持する。
- **先行詞リンク**: `referent`(先行詞トークン ID)を読み取り、関係詞と先行名詞の**リンク**を保持する。
- **推論しない**: parse・文脈推論は行わず、**注釈の読み取りに閉じる**(Morph が gender/number を読むのと
  同型・プロジェクト原則「意味を推論しない・既存注釈を使う」に合致)。
- **Phase 1 は出力を変えない**: 日本語文字列は変更せず、構造情報の**保持(情報付与)のみ**を行う。
  語順再構成・関係節前置・役割助詞の実描画は Phase 2 以降。

### Phase 1 の対象外(明示)

- 日本語語順再構成 / 関係節の前置
- whoever / whatever(自由関係)/ 数量表現(ὅσος)/ 自由関係詞解釈 → **Semantic 領域**
- role→役割助詞の実描画(者が/者を の生成)→ **Phase 2**

---

## 2. Morph v1 との境界比較

| 観点 | Morph v1(実装済) | Syntax Rule Engine(本計画) |
|---|---|---|
| 入力 | token の形態値(gender/number/case/person) | token の構造注釈(role / referent) |
| 読み取り方式 | 注釈読み取り・推論なし・決定的 | 注釈読み取り・推論なし・決定的(同型) |
| 出力への作用 | Reading Stem を**変える**(彼→彼ら 等) | **Phase 1: 変えない**(構造情報を保持のみ) |
| Registry | strong キー `_MORPH_STEM_RULES`・base 一致発火 | §3 で検討 |
| 対象 | 全形態 lemma(7) | 関係詞 3 lemma(束縛関係) |
| case の扱い | case→格助詞(αὐτós/τίς) | **case は節内役割の手掛かり**(関係詞では Syntax) |

- **共通点**: どちらも **bible_data の注釈を決定的に読み取る**(推論しない)。Syntax は Morph の設計思想を
  構造注釈へ拡張したもの。
- **相違点**: Morph は語幹文字列を変える(output-changing)。**Syntax Phase 1 は文字列を変えず構造情報を
  保持する**(non-output-changing)= Stage D(Context Layer・バイト等価)と同型の安全な情報層追加。

---

## 3. Rule Registry 方式の適用可否

| 論点 | 判定 |
|---|---|
| strong キー Registry の適用 | **可**(関係詞 3 lemma を対象に、role/referent の読み取り規則を lemma 単位で登録できる) |
| base 一致発火の原則 | **踏襲**(関係詞の代表語「〜する者/〜するだけ」由来トークンにのみ作用) |
| 安全フォールバック | **踏襲**(role/referent 欠落時・自由関係は保持せず既定へ) |
| Phase 1 の Rule 内容 | **最小**(role/referent の読み取り・保持のみ。語幹変更なし) |
| 既存 `_resolveSyntax`(前置詞・FROZEN)との関係 | **別責務**。前置詞 Syntax(FROZEN 2026-07-16)は変更しない。関係詞 Syntax は独立に追加し、frozen 部を侵さない |

- Morph v1 の Registry 方式(strong キー・base 一致・安全 FB・Engine 構造不変)は **Syntax にもそのまま
  適用可能**。Phase 1 では「読み取り・保持」の最小 Rule を登録する形になる(実装は本計画の対象外)。
- **既存の前置詞 Syntax(`_resolveSyntax`)は凍結済み**。関係詞 Syntax はこれを**変更せず**、別の責務として
  追加する(pipeline の syntax 区画に共存)。

---

## 4. Phase 分割

| Phase | 内容 | 対象 | 出力変化 | 前提 |
|---|---|---|---|---|
| **Phase 1** | role / referent の**読み取り・保持**(構造情報付与) | 束縛関係 1,071 | **なし(バイト等価)** | K-1 凍結・注釈充足 |
| **Phase 2** | role→**役割助詞の描画**(者が/者を/者に/者の) | role 注釈あり | あり | PhraseRenderer 協働・節境界 |
| **Phase 3** | **語順再構成**(関係節を先行詞の前へ・自然な連体修飾) | 束縛関係 | あり(構造的) | Phase 2・節境界確定 |
| (対象外) | 自由関係(whoever/whatever)・数量(ὅσος)・不定(ὅστις) | 自由 587 | — | **Semantic 責務** |

- **Phase 1 を最優先**: 出力を変えずに構造情報の読み取り機構を確立する(最も安全・Stage D 型)。
- Phase 2/3 は出力を変えるため PhraseRenderer 協働・節境界確定が前提。段階的に進める。

---

## 5. 実装 Gate(G1〜G6)

| Gate | 内容 | 現状 |
|---|---|---|
| **G1** | K-1 責務設計が凍結されている | FROZEN 候補済(承認待ち) |
| **G2** | role / referent の注釈充足が確認済 | 充足(role 1,348 / referent 1,071) |
| **G3** | Phase 1 が**出力を変えない**ことを保証する機構(バイト等価監査) | 計画に定義(§6) |
| **G4** | 凍結資産(Morph v1・前置詞 Syntax `_resolveSyntax`)を侵さない | 別責務として追加・共存を確認 |
| **G5** | 自由関係(referent 無 587)を正しく除外(Semantic へ)し、束縛関係のみ対象 | 除外条件を定義 |
| **G6** | QA / 回帰ハーネス(バイト等価 + role/referent 保持の正当性)が用意されている | §6 で定義 |

- **G1〜G6 すべて充足で Phase 1 実装(K-3 相当)へ進む。** Phase 2 以降は §8 の PhraseRenderer 連携条件を
  追加 Gate とする。

---

## 6. QA / FROZEN プロトコル

### Phase 1 QA(出力非変化の検証)

1. **バイト等価監査**: NT 全巻で Reading Japanese 出力が **Phase 1 前後で完全一致**(構造情報付与は
   文字列を変えない)。Stage D と同型の実 FS バイト等価検証。
2. **role/referent 保持の正当性**: 束縛関係 1,071 件で、保持された節内役割・先行詞リンクが bible_data
   注釈と一致することを実測。
3. **自由関係の除外**: referent 無 587 件が Syntax 保持の対象外(既定のまま)であることを確認。
4. **既存回帰 ALL PASS**: re-phase1〜5 / re-stageA/B/D/E を **基準値不変**で全 PASS(出力非変化のため
   基準更新は発生しない)。
5. **凍結資産非破壊**: Morph v1(morph 44,251)・前置詞 Syntax(syntax 基準)・chip⇔panel 100%・
   破損形 0 を維持。

### FROZEN プロトコル

- Phase 1 は出力非変化のため **既存基準値の更新は不要**(バイト等価)。ただし Syntax 保持機構の
  回帰ケース(role/referent 読み取りの単体テスト)を新規追加する。
- Phase 2 以降(出力変化)は Morph v1 と同じ FROZEN プロトコル(回帰ケース追加 → 悪化 0 確認 →
  基準値更新)に従う。

---

## 7. リリース基準

Phase 1 のリリース(凍結)は次をすべて満たすとき PASS とする。

| # | 基準 | 測定 |
|---|---|---|
| 1 | **出力バイト等価**(Reading Japanese 不変) | NT 全巻実 FS 比較 |
| 2 | **role/referent 保持の正当性**(注釈一致) | 束縛 1,071 実測 |
| 3 | **自由関係の除外**(587 件 対象外) | 実測 |
| 4 | **既存回帰 ALL PASS**(基準値不変) | test 一式 |
| 5 | **凍結資産非破壊**(Morph v1・前置詞 Syntax・chip⇔panel 100%・破損 0) | 監査 |
| 6 | **generated data 非依存**(再生成不要) | 確認 |

いずれか未達ならリリースしない。

---

## 8. 将来 PhraseRenderer 連携条件(Phase 2 以降)

Phase 2(役割助詞描画)・Phase 3(語順再構成)へ進むための追加条件:

| 条件 | 内容 |
|---|---|
| **節境界の確定** | 関係節に属するトークン範囲を role 分布・トークン列から確定できること(単純節→可・複文/入れ子→要検討) |
| **PhraseRenderer 協働** | 既存 core/phrase-renderer.js(Stage A)と連携し、関係節を先行詞の前へ配置する再構成が安全に行えること |
| **chip⇔panel 一致維持** | 語順再構成後も chip⇔panel 100%・破損形 0 を維持できること |
| **先行詞解決** | referent(先行詞トークン ID)を実トークンへ解決する索引(cross-file token index)が用意されること |
| **悪化 0** | before/after で自然性が悪化しないこと(Stage F/G の読者評価基準を適用) |

- Phase 2/3 は **出力を変える**ため、Phase 1 の情報層が安定・凍結してから着手する。
- 自由関係・数量・不定は全 Phase を通じて **Semantic 責務**(本計画の対象外)。

---

## 責務凍結(候補)

```
[relative-syntax-rule-implementation-plan FROZEN候補 2026-07-20]
Syntax Rule Engine: bible_data注釈(role/referent)を決定的に読み取る（Morph v1と同型・推論なし）
境界: Morph=gender→頭語(者/もの) / Syntax=role(節内役割)+referent(先行詞リンク) / Semantic=自由関係・数量・不定
Phase: P1 読み取り・保持(出力非変化・バイト等価) → P2 役割助詞描画 → P3 語順再構成(PhraseRenderer協働)
Registry: strongキー・base一致発火・安全FB・Engine構造不変・前置詞Syntax(FROZEN)非侵害
Gate: G1〜G6(K-1凍結/注釈充足/出力非変化保証/凍結資産非破壊/自由関係除外/QAハーネス)
リリース: 出力バイト等価・role/referent保持正当・自由関係除外・既存回帰ALL PASS・凍結資産非破壊・生成データ非依存
```

本計画は凍結可能な状態である。承認により FROZEN 化し、G1〜G6 充足後に Phase 1 実装へ進む。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結候補(Syntax Rule Engine 責務・Morph v1 境界比較・Registry 適用可否・Phase 分割・Gate G1〜G6・QA/FROZEN・リリース基準・PhraseRenderer 連携条件) |
