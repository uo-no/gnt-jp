# StudyPanel Cognitive Load & Progressive Disclosure Audit(Stage SP-3)

実施日: 2026-07-22
位置づけ: Lexical / Observation / 将来 Discourse の追加を前提に、StudyPanel の**認知負荷・情報密度・
読む順序**を監査する。**UI 変更・コード変更・デザイン提案は禁止。監査のみ。**
前提(FROZEN・変更しない): SP-IA-1 / SP-SD-1 / RM-0 / SP-2、および Reading / Word / Passage の三責務。
根拠: reading-observation-information-architecture.md(SP-2)・studypanel-scope-definition.md(SP-SD-1)・
reading-memo-editorial-character-audit.md(RM-0)・studypanel-information-architecture-audit.md(SP-IA-1)。

Severity 凡例: **P0(致命)/ P1(高)/ P2(中)/ P3(低)**。

---

## 現状(監査基準)

| 階層 | 内容 | 状態 |
|---|---|---|
| **L1 まず読む** | Greek headword + Reading Japanese・Phrase Reading・(observation)・熟練者ラベル・使用傾向 | **常時 6 ブロック** |
| **L2 詳しく調べる** | Morph grid(7 行)・語源・辞書全文 | 折りたたみ |
| **L3 研究する** | Semantic(LN)・Cluster・Concordance・用例・外部検索 | 折りたたみ(非同期) |

追加候補: **Word**(同一 lemma・語族・別 lemma 同訳・同章反復・使用傾向補足)/ **Reading**(読書メモ)/
**Passage**(反復・Inclusio・Chiasm・Parallelism・Discourse=StudyPanel 責務外)。

---

## Phase 1: 現在の情報量

| 階層 | 密度 | 情報量 | 読む速度 |
|---|---|---|---|
| **L1** | **中〜高**(常時 6 ブロック) | 中(読み+補助が同居) | 速いべきだが**補助割り込みで低下リスク** |
| **L2** | **高**(morph 7 行 + 辞書全文) | 高 | 遅(opt-in・辞書全文は最密) |
| **L3** | **高**(LN/cluster/concordance/用例/外部) | **最大**(corpus) | 遅(研究・非同期) |

- **Evidence**: index.html 5495–5507(L1=word-head/prose/phrase/observation/expLabel/usage の 6 ブロック)・
  5407–5420(morph 7 行)・5484–5490(辞書全文)・5520–5549(L3 semantic layers)。
- **Severity**: **P2**(L1 の常時密度が既に中〜高)。
- **Conclusion**: **深掘り層(L2/L3)は折りたたみで密度管理良好。ボトルネックは L1 の常時 6 ブロック**。

## Phase 2: Progressive Disclosure(読む→少し調べる→研究する)

- **評価**: **L1=読む / L2=少し調べる / L3=研究する の 3 段は明快に成立**。Word スコープの Lexical(語族/
  反復/別 lemma)は **L2/L3 に収まり 3 段を壊さない**。**破綻条件は 2 つ**: ①L1(既に中〜高密度)に補助を
  足すと「読む」層が鈍る、②Passage を word 階層に混ぜると深さ軸と広さ軸が混線(SP-2 Phase8)。
- **Evidence**: SP-2 Phase8(word 深さ軸維持可・passage は別軸)・SP-IA-1 Phase2(L1 常時に補助同居)。
- **Severity**: **P1**(L1 追加・Passage 混入で破綻)。
- **Conclusion**: **3 段は維持可。ただし追加は L2/L3 へ・L1 と Passage 軸を保護すること**が条件。

## Phase 3: 視線誘導(読む順序)

順序: Reading Japanese → Phrase Reading → Reading Memo → Morph → Syntax → Semantic → Lexical → Concordance。

- **評価**: **自然**。**Reading の家(RJ→Phrase→Memo)→ Word の家(Morph→Syntax→Semantic→Lexical)→
  Corpus(Concordance)** という**「家 → 家」の深さ勾配**に一致(読む→分析→研究)。Lexical が Semantic の
  直後・Concordance の直前に来るのは corpus 隣接で妥当。**軽微な懸念**: Reading Memo は verse/clause スコープ
  で、token スコープの Morph の直前に置くと**スコープが verse→token へ縮む**(段差)。ただし Memo は
  Reading の家(L1)に属し「読む」段で消費されるため実害は小。
- **Evidence**: SP-2 の三つの家(Reading/Word/Passage)・RM-0(Memo=clause/verse)。
- **Severity**: **P3**(スコープ段差は軽微)。
- **Conclusion**: **順序は家の勾配として自然。Lexical は Semantic〜Concordance の corpus 帯に置くのが視線上も妥当**。

## Phase 4: Lexical 追加による衝突

| 相手 | 衝突種 | 評価 |
|---|---|---|
| **使用傾向(L1)** | **重複** | 「使用傾向の補足」は L1 使用傾向と**直接重複** |
| **Concordance(L3)** | **重複** | 「同一 lemma 反復」は Concordance と**出現箇所で重複** |
| **Cluster / Semantic(L3)** | **責務衝突** | 「別 lemma 同訳」は cluster の意味近接と**重複整理必要**(SP-2 Phase7) |
| **語源(L2)** | 隣接 | 「語族」は語源(語根)と隣接・別物だが近接 |
| **熟練者ラベル(L1)** | 表示順 | 語アンカーの読みヒント・Lexical と層が異なる |

- **評価**: Lexical は **corpus スコープ**のため **L3(Semantic/Concordance 帯)が定位置**。L1 の使用傾向補足・
  L3 の Concordance/Cluster と**重複整理が前提**。表示順は **Semantic → Lexical → Concordance** が corpus 帯として
  自然。
- **Evidence**: SP-2 Phase7(Lexical↔cluster 重複・Morph↔熟練者ラベル)・SP-SD-1 Phase4。
- **Severity**: **P2**(重複整理を要するが破綻ではない)。
- **Conclusion**: **Lexical は L3 corpus 帯へ。使用傾向補足・Concordance・Cluster との重複を統合整理すること**。

## Phase 5: Reading Memo との衝突

- **評価**: **Lexical 情報(語族/別 lemma/出現回数)を Reading Memo へ入れると RM-0 の人格を壊す**——メモは
  「分類ラベル・数値を出さない静かな 1 文」であり、**数値(出現回数)・ラベル(lemma/Strong)・Corpus 照合は
  Guard Rule と衝突(throw)**。唯一 **反復を「流れの観察」として静かな声で言う場合のみ条件付きで許容**
  (RM-0 Phase6/7)。それ以外の Lexical データは**メモに侵入させてはならない**。
- **Evidence**: RM-0(Guard Rule・1 関係 1 文・反復は条件付き)・SP-2 Phase5(同居は人格破壊 P1)。
- **Severity**: **P1**(データ侵入で人格破壊)。
- **Conclusion**: **Lexical データは Word の家に留め、Reading Memo は流れの観察のみ**。反復も「静かな声で
  言える形」以外はメモ外。

## Phase 6: Passage 情報が StudyPanel へ侵入した場合

| Passage 情報 | 侵入時の影響 |
|---|---|
| Inclusio / Chiasm / Parallelism | **節横断構造を word 階層に載せられない**——スコープ不一致(SP-SD-1) |
| Theme(段落テーマ) | passage スコープ・word 深さ軸に属さない |
| Discourse(構造) | 談話構造は passage・局所の流れのみ Memo/clause |

- **評価**: **Passage を StudyPanel(word 階層)へ侵入させると、①深さ軸(L1→L2→L3)と広さ軸(passage)が
  混線し progressive disclosure が破綻、②L1 過負荷、③語に還元できない構造を語パネルに強制する責務違反**。
  影響は **IA 破綻レベル**。Passage は**別 View**(SP-2 の Passage の家)が唯一の整合先。
- **Evidence**: SP-SD-1(Passage は StudyPanel 外)・SP-2 Phase8(passage は別軸)・SP-IA-1 Phase6/7(P1)。
- **Severity**: **P1**(侵入で IA 破綻)。
- **Conclusion**: **Passage は StudyPanel に載せない。別 View が唯一の帰属**。

## Phase 7: Apple HIG 整合性

| HIG 原則 | 評価 |
|---|---|
| **Progressive Disclosure** | ✓ details 4 階層・opt-in 深掘りで良好 |
| **Minimalism** | **△**——L1 の常時 6 ブロック・L2 辞書全文が最小主義をやや侵食。追加は L1 を避けるべき |
| **Hierarchy** | ✓ 4 階層 + 家の勾配で明快 |
| **Consistency** | ✓ design token・serif・chevron・中央軸で一貫 |

- **評価**: **Progressive Disclosure / Hierarchy / Consistency は良好**。**唯一の弱点は Minimalism**——L1 常時層の
  密度。**追加を L2/L3 に限定し L1 を保護すれば HIG 整合は保てる**。L1 追加・Passage 混入は Minimalism/
  Hierarchy 双方を崩す。
- **Evidence**: SP-IA-1 Phase3(HIG 概ね整合・L2 密度)・Phase1(L1 密度)。
- **Severity**: **P2**(Minimalism のみ弱点)。
- **Conclusion**: **HIG 整合は良好。L1 保護と L2/L3 への追加限定が維持条件**。

## Phase 8: 総合評価

- **P0 なし**。**P1×3**(Phase2 progressive disclosure 破綻条件 / Phase5 Memo 人格 / Phase6 Passage 侵入)。
  すべて **「追加をどこに置くか」の境界を守れば回避可能**——SP-2 の三つの家が既に境界を定義済み。
- **Severity 総合**: **P1(条件付き)**。現状 IA は健全で、リスクは境界違反時のみ顕在化する。

| Phase | 監査 | Severity |
|---|---|---|
| 1 | 情報量(L1 常時密度) | P2 |
| 2 | Progressive Disclosure(L1/Passage 保護) | **P1** |
| 3 | 視線誘導(家の勾配・自然) | P3 |
| 4 | Lexical 衝突(重複整理) | P2 |
| 5 | Reading Memo 人格(データ侵入禁止) | **P1** |
| 6 | Passage 侵入(IA 破綻) | **P1** |
| 7 | Apple HIG(Minimalism のみ弱点) | P2 |

---

## Cognitive Load Summary(一枚)

```
L1  読む        Reading Japanese / Phrase Reading / Reading Memo（＋熟練者ラベル・使用傾向）
    │           ← 常時表示・静かな声・低負荷を保つ層（追加を足さない）
    ▼
L2  調べる       Morph / Syntax / 語源 / 辞書
    │           ← 語の詳細（token）・opt-in
    ▼
L3  研究する     Semantic / Lexical / Cluster / Concordance / 用例 / 外部検索
                ← corpus・研究・最大密度（Lexical はここ・重複整理）

  ─────────────  別軸（StudyPanel の外）─────────────
Passage View    Theme / Repetition / Discourse / Rhetoric（Inclusio/Chiasm/Parallelism）
                ← 広さ軸・word 階層に混ぜない
```

- **維持される条件**: ①**追加 Lexical は L3(research)へ**(L1 を足さない)・②**Reading Memo は流れの観察のみ**
  (Lexical データ禁止)・③**Passage は別 View**(word 階層に混ぜない)。
- この 3 条件下で **L1 読む / L2 調べる / L3 研究する は維持される**。破綻は 3 条件のいずれかを破った時のみ。

---

## FROZEN 判定

- **FROZEN 可能**。
- **理由**: 認知負荷・密度・読む順序の観点でも、**現 3 段(読む/調べる/研究)は健全で、追加は L3 で吸収でき、
  リスク(L1 過負荷・Memo 人格破壊・Passage 侵入)はすべて SP-2 の責務境界を守れば回避される**ことが確認
  できた。新たな P0 はなく、P1 はすべて既定義の境界で塞がれている。
- **UI 設計へ進める条件**:
  1. **追加 Lexical は L3(research 帯)へ配置**し、L1 常時層に足さない(Minimalism/読む速度の保護)。
  2. **L3 で Lexical と Semantic(cluster)・Concordance・使用傾向補足の重複を統合整理**する。
  3. **Reading Memo に Lexical データ(語族/別 lemma/出現回数/ラベル)を持ち込まない**(RM-0 人格・Guard Rule)。
  4. **Passage(Inclusio/Chiasm/Parallelism/Theme/Discourse 構造)は StudyPanel の word 階層に載せず別 View**。
  5. **L1→L2→L3 の深さ軸と Passage の広さ軸を混線させない**(progressive disclosure の維持)。

```
[studypanel-cognitive-load-audit FROZEN 2026-07-22]
現状: L1常時6ブロック(密度中〜高)/L2折(morph7行+辞書全文=密度高)/L3折非同期(corpus=密度最大)
Phase1情報量: 深掘りL2/L3は折りたたみで管理良好・ボトルネックはL1常時密度 P2
Phase2 PD: L1読む/L2調べる/L3研究は明快成立。破綻条件=L1追加orPassage混入 P1
Phase3視線: RJ→Phrase→Memo(Reading家)→Morph→Syntax→Semantic→Lexical(Word家)→Concordance(corpus)=家の勾配で自然。Memoのverse→token段差は軽微 P3
Phase4 Lexical衝突: 使用傾向補足↔使用傾向/同lemma反復↔Concordance/別lemma同訳↔cluster重複。LexicalはL3 corpus帯へ・Semantic→Lexical→Concordance順 P2
Phase5 Memo衝突: Lexicalデータ(語族/別lemma/出現回数)侵入はRM-0人格破壊(Guard衝突throw)・反復は流れ観察なら条件付き P1
Phase6 Passage侵入: word階層に載せると深さ軸/広さ軸混線でPD破綻・L1過負荷・責務違反=IA破綻。別Viewが唯一 P1
Phase7 HIG: Progressive Disclosure/Hierarchy/Consistency良好・Minimalismのみ弱点(L1密度)。追加をL2/L3限定で保てる P2
Phase8総合: P0なし・P1×3(PD破綻条件/Memo人格/Passage侵入)は全てSP-2境界遵守で回避可
維持条件: 追加LexicalはL3へ/Reading Memoは流れ観察のみ/Passageは別View。この3条件でL1読む/L2調べる/L3研究維持
FROZEN可能。UI設計条件: ①LexicalはL3 ②L3重複統合整理 ③Memoにデータ持ち込まない ④Passageは別View ⑤深さ軸/広さ軸を混線させない
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結(認知負荷/PD 監査 8 Phase・P0 なし/P1×3=境界遵守で回避可・L1 読む/L2 調べる/L3 研究は 3 条件下で維持・FROZEN 可能・UI 設計 5 条件) |
