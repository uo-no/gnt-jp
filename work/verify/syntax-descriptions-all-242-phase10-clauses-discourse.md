# 第10段階：節・前置詞・接続詞・小辞・名詞句・談話の監査

## 基準

主資料はWallace, *Greek Grammar Beyond the Basics* と *The Basics of New Testament Syntax*。この段階は、レジストリの日本語説明と分類軸を点検し、原典の該当箇所・本文例で優先確認すべき問題をまとめる。Wallaceの節・前置詞・接続詞・小辞の説明を確認せず、ラベル名から意味を推測して定義を確定しない。

- Wallace, *Greek Grammar Beyond the Basics*: https://zondervanacademic.com/products/greek-grammar-beyond-the-basics
- Wallace, *The Basics of New Testament Syntax*: https://www.obinfonet.ro/docs/gk/resgk/wallace-basic-nt-greek.pdf

## 1. 節12型

### 条件文4型

`clause.conditional_first_class` 〜 `fourth_class` は、条件文の型を文全体の構文として分類する。接続詞や動詞の法だけを見て機械的に「真／偽」「現実／非現実」と断定しない。条件節（protasis）と帰結節（apodosis）の形、話者がどう提示しているか、文脈を合わせて読む。

特に第四類条件文は新約聖書で実例が限られ、古典的なパラダイムをそのまま全例に適用しない。Wallaceが採用する定義・用例・留保を照合し、存在しない典型例を作らない。

### ὅτι節：内容と原因

- `clause.substantival_hoti`：発話・思考・認識などの内容を表す節。
- `clause.causal_hoti`：理由・原因を示す節。

同じ `ὅτι` でも形だけで区別できない。節が「何を言った／知ったか」を補うのか、「なぜそうなったか」を説明するのか、主節との関係で比較する。

### 目的・結果・時間・比較節

- `clause.purpose_hina`：目的と結果の混同に注意し、Wallaceの分類と本文例を確認。
- `clause.result_hoste`：`ὥστε` の有無だけで節の意味・構造を一律に決めず、不定詞構文との違いも確認。
- `clause.temporal_hotan` / `clause.temporal_hote`：未来・反復などの条件性と、時間関係を区別。
- `clause.comparative_kathos`：比較・対応・様態などの意味範囲を、見出しだけで狭めない。
- `clause.adjectival_relative`：関係代名詞の節内格は先行詞との一致ではなく節内機能で決まることを明確にする。先行詞の性・数一致と節内の格機能を混同しない。

## 2. 前置詞7型

### 構造分類と機能分類の区別

`preposition.proper_with_genitive` / `dative` / `accusative` は前置詞と格の組み合わせという構造記述であり、場所・時間・手段・原因などの意味分類とは別軸。前置詞の意味は、格支配、語彙的意味、文脈を合わせて確認する。

`preposition.adverbial_pp` / `attributive_pp` / `substantival_pp` は、前置詞句が文中で担う働きの分類。名詞句内の位置、節内の修飾、名詞相当の働きを同じ軸で比較する。

### 特に確認すべき点

- `preposition.improper` の英語ラベル「independent」と現行日本語「非固有前置詞」の対応をWallaceの用語に照合し、「合成動詞を作らない」だけを定義にしない。
- 前置詞の格支配を説明するとき、各前置詞が一つの格だけを取るように誤解させない。
- 「副詞的／形容詞的／名詞的」は、前置詞句の意味そのものではなく文中での機能を説明する。

## 3. 接続詞12型と小辞21型

### 接続詞と談話機能の重複

`conjunction.coordinating_transition` / `particle.continuative_de`、`conjunction.coordinating_inferential` / `particle.inferential_oun`、`conjunction.coordinating_explanatory` / `particle.explanatory_gar` など、同じ語が接続詞と談話上の機能の双方で分類されている。これは必ずしも重複誤りではないが、UIでは同一トークンに二つのラベルが並ぶ場合に、品詞・構文と談話機能の違いを説明する必要がある。

### 小辞の説明に関する重点確認

- `particle.negative_ou` と `particle.negative_me`：「直説法／非直説法」という短い対比だけで全用法を説明できるか、Wallaceの各構文・例外を照合する。
- `particle.double_negative` と `particle.emphatic_negative`：どちらも `οὐ μή` を含むため、片方が構造、片方が意味・強度の分類なのかを明示する。排他的な二択として扱わない。
- `particle.particle_an` と `particle.particle_ean`：小辞単独と複合接続詞を混同せず、`ἐάν` を単純に `εἰ + ἄν` の要素別機能だけで判定しない。
- `particle.interrogative_particle` と `particle.deliberative_particle`：疑問を標識する語と、疑問文中の `οὖν` の機能は分類軸が異なる可能性がある。用語・ID・本文検出条件を確認する。
- `particle.rhetorical_particle` の説明は、`μή` を含む表現が「否定的な答えを予想する疑問」を表すとするが、例の `μὴ γένοιτο` は通常、強い拒絶・願わくばそうでないように、という定型表現として機能する。ラベル・定義・検出条件が一致しているか、Wallaceの本文例を優先して再確認する。
- `particle.emphasis_per` / `particle.emphasis_toi` は「単独形はSBLGNT本文に出現しない」と明記されている。dormant型として実行時に候補表示されないことをテストで確認し、レジストリの説明だけに依存しない。
- `particle.restrictive_monon` は副詞 `μόνον` と形容詞 `μόνος` の形態・機能を混同しない。

## 4. 名詞句構造12型

これらの型は、名詞句の形・語順・内部構造を記述するものが多く、意味解釈のラベルと同じ軸ではない。

- `nominal_syntax.simple_np` / `articular_np` / `anarthrous_np`：冠詞の有無を構造として説明し、有冠詞＝定・無冠詞＝不定という単純規則を避ける。
- `nominal_syntax.modified_np` / `multiple_modifier_np`：修飾語が一つか複数かという構造の差を明確にする。
- `nominal_syntax.appositional_np`：同じ対象を指す同格と、修飾・所有などの関係を区別する。
- `nominal_syntax.substantival_phrase`：名詞化された句の構造であり、分詞・形容詞・前置詞句の意味用法そのものとは区別する。
- `nominal_syntax.head_initial_np` / `head_final_np`：名詞句の語順記述であって、語順だけで意味関係や焦点を決めない。
- `nominal_syntax.nested_np` / `complex_np`：入れ子構造と多層の修飾連鎖の境界を実例で確認する。単に句が長いだけで「多層」としない。
- `nominal_syntax.vocative_np`：名詞句の構造と呼びかけの語用機能を混同しない。

## 5. 談話10型

### 語順・主題・焦点

`discourse.topic_fronting` / `focus_fronting` / `emphasis_word_order` は語順に関連するが同義ではない。節頭にあることだけで主題・焦点・強調を断定しない。Wallaceが示す語順と解釈の例を照合し、必要なら「候補」表示にとどめる。

### 転位・挿入

- `discourse.left_dislocation` と `nominative.pendens` は重なり得るが、談話構造と格構文の分類軸が異なる。両方が同時に付く場合の説明を用意する。
- `discourse.right_dislocation` は定義にある「先行する代名詞の指示内容を後から言い直す」構造が、Wallaceの用語と本文例に一致するか確認する。
- `discourse.parenthetical` と `discourse.explanatory_parenthesis` は、発話動詞の挿入と直前語句の言い換えという違いを保つ。

### 対比・背景・前景

- `discourse.contrast_men_de` は構文上の相関標識と談話上の対比機能を区別する。
- `discourse.backgrounding` / `foregrounding` は、動詞形や主節／従属節という形式だけで確定しない。談話の主筋・背景情報を、周辺文脈と本文の流れから判断する。
- Wallaceの分類範囲を超える談話分析概念を用いる場合は、別の専門資料が必要であり、Wallaceを根拠にしたかのように記述しない。

## 6. 全型共通の合格基準

1. Wallaceの原典で定義・節番号・例を確認する。
2. 型の定義を、語形の条件や実装ヒューリスティックだけで置き換えない。
3. 構造・形態・統語機能・意味解釈・談話機能を同じ軸の排他的候補として混在させない。
4. 近接候補が同一トークンに実際に複数検出されたかを確認し、レジストリの `alternatives` だけで比較を出さない。
5. 例を掲載するときはWallaceの採用版と本文を照合し、アプリの実解析結果と区別する。
6. スコアは確率と同一視せず、根拠が確認できない場合は確度を誇張しない。
7. dormant型は実行時に表示されないことを検証する。
8. 表示名に専門語を残す場合、短い平易な説明を隣接させる。

## 7. 残る作業

この段階で、残る6群（節12・前置詞7・接続詞12・小辞21・名詞句構造12・談話10）の重点監査項目を整理した。Wallaceのすべての節・例を逐一照合した完了監査ではない。次は全242型の監査台帳を統合し、原典確認済み／文案のみ／実トークン未検証を型ごとに明示する。レジストリ更新やUI実装は、その台帳に基づいて行う。
