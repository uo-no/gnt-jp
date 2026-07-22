# StudyPanel Information Architecture Audit(Stage SP-IA-1)

実施日: 2026-07-22
位置づけ: Reading Japanese 完成後、StudyPanel に Lexical(語彙)/ Rhetorical(修辞)情報を将来追加する
可能性を検討する前に、**現在の StudyPanel が追加情報量に耐える情報設計になっているか**を監査する。
**UI・情報設計監査のみ。コード/UI/デザイン変更・実装提案・Lexical/Rhetorical の実装案は書かない。**
根拠(FROZEN): reading-japanese-policy.md(L-0)。監査対象: public/index.html の StudyPanel(#bottom-depth-panel)。

Severity 凡例: **P0(致命=破綻)/ P1(高)/ P2(中)/ P3(低)**。

---

## 現状の情報設計(監査の基準)

StudyPanel は **語(トークン)スコープ**の 4 階層(progressive disclosure)。

| 階層 | 表示 | 状態 | 主な情報種 |
|---|---|---|---|
| **L1 まず聖書を読む** | Greek headword + Reading Japanese(displayLabel)+ phrase reading(現象→Intent→文章)+ observation + 熟練者ラベル(中動態/主語省略)+ 使用傾向 | **常時表示** | Reading / (Syntax 断片) / (Editorial 断片) |
| **L2 単語を詳しく調べる** | Morph grid(品詞/時制/法=core・態/格/数/性)+ 語源 + 辞書全文(Abbott-Smith) | 折りたたみ | **Morph** / 辞書 |
| **L3 意味が近い語と比べる** | Semantic layers(LN domain / cluster / concordance) | 折りたたみ(非同期) | **Semantic** |
| **さらに調べる** | 用例/語形/構文 → 外部検索ツール | 常時表示 | 外部リンク |

---

## Phase 1: 現在の情報分類・混在評価

- **評価**: **Morph は L2、Semantic は L3 に明確に分離**(progressive disclosure で階層分割)。一方
  **Syntax と Editorial は第一級セクションを持たず**、L1 の phrase reading 散文・observation・熟練者ラベル
  (主語省略/中動態)に**織り込まれている**。情報種としての Morph/Semantic は綺麗だが、Syntax/Editorial は
  「居場所」が暗黙的。
- **Evidence**: L2=morphGrid(index.html 5407–5420)、L3=rn-semantic-layers(5520–5525)は明示ラベル付き
  セクション。Syntax(role/referent)専用セクションは存在せず、熟練者ラベル(5456–5482)と散文に分散。
- **Severity**: **P2**。
- **改善余地**: Syntax・Editorial を情報種として明示する余地(現状は Morph/Semantic のみが第一級)。

## Phase 2: 情報の優先順位

- **評価**: **読解必須(L1)→ 深掘り(L2/L3 折りたたみ)の階層は健全**(必須は常時・詳細は opt-in)。
  ただし **補助情報(使用傾向・熟練者ラベル)が常時表示の L1 に同居**し、「必須」と「補助」が同一可視層に
  混在。読解の主線(headword+Reading+散文)に補助が割り込む余地。
- **Evidence**: usageTrendsHTML・expLabelHTML が L1(常時)に配置(5506–5507)。L2/L3 は details で折りたたみ。
- **Severity**: **P2**。
- **改善余地**: L1 内の「必須/補助」の階層分離余地(補助が必須層を圧迫しない設計余地)。

## Phase 3: 視覚設計(Apple HIG 観点)

- **評価**: **良好**。progressive disclosure(details + chevron 90°回転)、design token 準拠(tokens.css の
  --text-main/sub・--border)、Noto Serif JP による一貫タイポ、morph の core 強調(品詞/時制/法)。
  中央カラム軸揃え(1028 行・視線跳び 287px を抑制)で視線誘導に配慮。HIG の「抑制・段階開示・明確な階層」に
  概ね整合。**懸念は L2 の密度**(morph grid + 語源 + 辞書全文が 1 折りたたみに集中)。
- **Evidence**: .rn-level-section/summary(3417–3448)、.rn-morph-grid、icon('chevronRight')、tokens.css 参照。
- **Severity**: **P3**。
- **改善余地**: L2 の情報密度分散の余地(単一折りたたみに 3 情報種が集中)。

## Phase 4: 認知負荷

- **評価**: **現状(Morph/Syntax/Semantic)は progressive disclosure で管理良好**。L1 が読解主線、詳細は
  折りたたみで opt-in。ただし **Lexical + Rhetorical を追加すると情報種が 2 系統増え**、①L1 に置けば
  常時表示層が過負荷、②L2/L3 に押し込めば各折りたたみ(L2=語詳細・L3=意味比較)のテーマに衝突する。
  **情報過多になる箇所 = L1(既に散文+ラベル+使用傾向)と、テーマ固定の L2/L3**。
- **Evidence**: L1 に 5 種(headword/Reading/散文/ラベル/使用傾向)が既に同居(5495–5507)。
- **Severity**: **P1**(将来追加時の過負荷リスク)。
- **改善余地**: 追加情報種の受け皿(L1 保護・新テーマ層)の設計余地。

## Phase 5: Lexical 情報追加の適性

- **評価**: 候補のうち **同一 lemma 反復・語族・別 lemma 同日本語は L3(意味が近い語=cluster/concordance)と
  概念的に重なる**(既に concordance/用例リンクが存在)。**「他訳候補」は L-0 境界と衝突リスク**——Reading
  Japanese(L1 の displayLabel=決定的 fact)の直近に「他訳」を置くと、**決定的読みと候補の区別が曖昧化**する。
- **Evidence**: L3=LN/cluster/concordance(5520–5549)、L1 displayLabel=Reading(5499)、外部用例リンク(5530)。
- **Severity**: **P2**。
- **改善余地(衝突する情報)**: L3 の semantic cluster と Lexical(別 lemma 同日本語)の重複整理余地/
  他訳候補と Reading(決定的)の境界保持余地。

## Phase 6: Rhetorical 情報追加の適性

- **評価**: 候補(反復・強調・対比・inclusio・chiasm)は本質的に **文・段落スコープ(複数節/複数トークンに
  またがる構造)**。一方 **StudyPanel は語(トークン)スコープ**(1 語の詳細)。**語レベルのフラグ
  (この語は反復キーワード)は収まりうるが、節をまたぐ構造(chiasm/inclusio/対比)は語パネルに収まらない**。
  責務スコープの不一致。
- **Evidence**: StudyPanel は 1 トークンの word-head/morph/semantic を描画(5495–5549)。節横断構造の受け皿なし。
- **Severity**: **P1**(スコープ不一致)。
- **改善余地**: 語スコープ(StudyPanel 適)と段落スコープ(修辞構造)の責務分離の必要性。

## Phase 7: 表示場所(情報設計評価のみ)

- **評価**:
  - **現在の場所で問題ない**: 語スコープの Lexical(この lemma の反復回数・語族)は L3 concordance 近傍に収まる。
  - **新しい階層が必要**: 語レベルの Rhetorical フラグ(キーワード反復の標識)は L1/L2/L3 のどのテーマにも
    属さず、専用の受け皿がない。
  - **別画面が必要**: 節横断の修辞構造(inclusio/chiasm/対比)は **語パネルでなく節/段落ビューの責務**。
- **Evidence**: 4 階層はいずれも語スコープ(headword 起点)。段落スコープの表示面が存在しない。
- **Severity**: **P1**。
- **改善余地**: 段落スコープ情報の表示面(別画面/別階層)の不在。

## Phase 8: 将来性(Discourse/Semantic/Lexical/Rhetorical Layer 追加時)

- **評価**: **語スコープの拡張には堅牢**——details セクションは積み増せ、Semantic 層は L3 に、語彙反復は
  L3 近傍に収まる。**しかし段落スコープ(Discourse の談話構造・Rhetorical の修辞構造)の受け皿がない**ため、
  これらを語パネルに押し込むと **L1 過負荷 or テーマ衝突で情報設計が緊張**する。**破綻はしないが、
  語スコープと段落スコープの二重性が未整理**。
- **Evidence**: 全 4 階層が語スコープ。Discourse/Rhetorical は本質的に節横断で、現 IA に homeなし。
- **Severity**: **P1**。
- **改善余地**: 語スコープ層と段落スコープ層の分離(将来層の帰属先の明確化)。

---

## Severity 集約

| Phase | 監査 | Severity |
|---|---|---|
| 1 | 情報分類・混在(Syntax/Editorial 第一級不在) | P2 |
| 2 | 優先順位(補助が L1 常時層に同居) | P2 |
| 3 | 視覚設計(L2 密度) | P3 |
| 4 | 認知負荷(将来追加時の L1 過負荷) | **P1** |
| 5 | Lexical 適性(他訳 vs Reading 境界・cluster 重複) | P2 |
| 6 | Rhetorical 適性(語 vs 段落スコープ不一致) | **P1** |
| 7 | 表示場所(段落スコープの表示面不在) | **P1** |
| 8 | 将来性(語/段落スコープ二重性未整理) | **P1** |

- **P0 なし**。最高位は **P1(4 件)= すべて「語スコープ StudyPanel に段落スコープ情報を載せる緊張」**に収斂。

---

## 結論

**軽微な再設計が必要(minor IA redesign)。**

- **現状の 4 階層 progressive disclosure は健全で、語スコープの拡張(Lexical の反復/語族)には耐える**
  (大幅な IA 再設計は不要)。視覚設計も HIG に概ね整合(P3)。
- **ただし 2 点の情報設計課題が P1**:
  1. **語スコープと段落スコープの二重性が未整理**——Rhetorical(inclusio/chiasm/対比)や Discourse の
     談話構造は**節横断であり、語パネル(StudyPanel)の責務スコープを超える**(Phase 6/7/8)。これらを
     語パネルに載せると L1 過負荷・テーマ衝突で緊張する(Phase 4)。
  2. **L1 常時表示層が既に混雑**(Reading+散文+ラベル+使用傾向)で、追加情報の受け皿として脆弱(Phase 2/4)。
- **加えて P2 として**、Syntax/Editorial の第一級不在(Phase 1)、他訳候補と Reading(決定的)の境界(Phase 5)。
- **したがって**: StudyPanel 自体は**語スコープ情報(Lexical の一部)を受け入れる軽微な整理**で足り、
  **段落スコープの Rhetorical/Discourse は StudyPanel の責務外**(別スコープの表示面が本来の帰属)。
  この「語/段落スコープの分離」と「L1 常時層の保護」を軽微な再設計課題として記録する。

---

## 凍結(候補)

```
[studypanel-information-architecture-audit FROZEN候補 2026-07-22]
対象: 現StudyPanel(#bottom-depth-panel)の情報設計のみ。UI/コード/実装提案なし
現状IA: 語スコープ4階層 progressive disclosure。L1まず読む(常時:Reading+散文+ラベル+使用傾向)/L2単語詳細(折:Morph grid+語源+辞書全文)/L3意味比較(折:LN/cluster/concordance)/さらに調べる(常時:外部リンク)
Phase1 分類: Morph=L2/Semantic=L3は明確分離だがSyntax/Editorialは第一級不在(L1散文/ラベルに散在) P2
Phase2 優先順位: 読解必須L1→深掘りL2/L3は健全。ただし補助(使用傾向/ラベル)が常時L1に同居 P2
Phase3 視覚: progressive disclosure/token準拠/serif/core強調/中央軸=HIG整合良好。L2密度のみ懸念 P3
Phase4 認知負荷: 現Morph/Syntax/Semanticは管理良好。Lexical+Rhetorical追加でL1過負荷/L2L3テーマ衝突 P1
Phase5 Lexical適性: 同lemma/語族/別lemma同日本語はL3 clusterと重複・他訳候補はReading(決定的)と境界曖昧化 P2
Phase6 Rhetorical適性: 反復/対比/inclusio/chiasmは段落スコープ・StudyPanelは語スコープ=不一致 P1
Phase7 表示場所: 語スコープLexicalは現L3近傍可/語Rhetoricalフラグは受け皿なし/節横断修辞は別画面責務 P1
Phase8 将来性: 語スコープ拡張は堅牢だが段落スコープ(Discourse/Rhetorical)の受け皿なし=語/段落二重性未整理 P1
結論: 軽微な再設計が必要。4階層は健全・語スコープ拡張に耐える。P1は全て「語パネルに段落スコープ情報を載せる緊張」に収斂。段落スコープRhetorical/DiscourseはStudyPanel責務外・L1常時層の保護と語/段落分離が軽微再設計課題
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-22 | 初版・凍結候補(StudyPanel IA 監査 8 Phase・P0 なし/P1×4・結論=軽微な再設計必要・語スコープ4階層は健全・段落スコープ修辞はStudyPanel責務外・L1保護課題) |
