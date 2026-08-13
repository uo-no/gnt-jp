# SF-2 John 6:37 構造の固定

対象: Structure Flow UI 再設計の代表ケース John 6:37
作成: 2026-08-11
State: STATIC_AUDIT（READ ONLY・コード変更なし）
前提: [SF-1-structure-audit.md](./SF-1-structure-audit.md)

> 本書は現在アプリが実際に持っている John 6:37 の構造を、node / parent / child /
> token range / display text / original order の観点で固定する。**再解釈しない。**
> 全数値は `public/assets/data/flow-tree/JHN/6.json` と `public/bible_data/nt/JHN/6.json`
> を Node で実読して算出（`CONFIRMED`）。

---

## 1. 本文と token（surface order）

| ! | greek | japanese |
|---|---|---|
| 1 | πᾶν | すべての |
| 2 | ὃ | 〜するもの |
| 3 | δίδωσίν | 与える |
| 4 | μοι | 私 |
| 5 | ὁ | ［冠詞］ |
| 6 | πατὴρ | 父 |
| 7 | πρὸς | 〜のもとに |
| 8 | ἐμὲ | 私 |
| 9 | ἥξει | 来る |
| 10 | καὶ | そして |
| 11 | τὸν | ［冠詞］ |
| 12 | ἐρχόμενον | 来る |
| 13 | πρός | 〜のもとに |
| 14 | με | 私 |
| 15 | οὐ | 〜ない |
| 16 | μὴ | 〜ない |
| 17 | ἐκβάλω | 追い出す |
| 18 | ἔξω | 外に |

（`［冠詞］` 表示は既知事項。今回の対象外＝変更しない。）

## 2. sentence root の位置づけ

- John 6:37!1 が属する sentence root は **`clause` 型で 6:37+6:38 をまたぐ超節**（token 36 個, id=`430060370010360`, parentId=null）。
- その **直接の子（top-level constituents）** は 3 つ:
  1. `clause 037001-037009`（6:37 前半）
  2. `group 037010-037018`（6:37 後半, καὶ 以下）
  3. `clause 038001-038018`（6:38 全体）
- ⇒ **John 6:37 は sentence root の下で「clause 1-9」と「group 10-18」の 2 ブロックに分かれる。** `CONFIRMED`

## 3. John 6:37 構造ツリー（node / parent / child / token range / display text / original order）

`original order` = children 配列の順（structural order）。`display text` = token を surface order に並べ替えて既存 japanese を連結（現行 `_ft11LabelOf` と同一規則）。

```
[clause] 037001-037009  (child of sentence root, 兄弟順=1/3)   「すべての〜するもの与える私［冠詞］父〜のもとに私来る」
├─[phrase.np] 037001-037006  (兄弟順=1/3)   「すべての〜するもの与える私［冠詞］父」
│  ├─[word] 037001  (1/2)   「すべての」
│  └─[clause] 037002-037006  (2/2)   「〜するもの与える私［冠詞］父」
│     ├─[word] 037002  (1/4)   「〜するもの」
│     ├─[word] 037003  (2/4)   「与える」
│     ├─[word] 037004  (3/4)   「私」
│     └─[phrase.np] 037005-037006  (4/4)   「［冠詞］父」
│        ├─[word] 037005  (1/2)   「［冠詞］」
│        └─[word] 037006  (2/2)   「父」
├─[phrase.pp] 037007-037008  (兄弟順=2/3)   「〜のもとに私」
│  ├─[word] 037007  (1/2)   「〜のもとに」
│  └─[word] 037008  (2/2)   「私」
└─[word] 037009  (兄弟順=3/3)   「来る」

[group] 037010-037018  (child of sentence root, 兄弟順=2/3)   「そして［冠詞］来る〜のもとに私〜ない〜ない追い出す外に」
├─[word] 037010  (1/2)   「そして」   (= καὶ)
└─[clause] 037011-037018  (2/2)   「［冠詞］来る〜のもとに私〜ない〜ない追い出す外に」
   ├─[clause] 037011-037014  (1/4)   「［冠詞］来る〜のもとに私」
   │  ├─[word] 037011  (1/2)   「［冠詞］」
   │  └─[clause] 037012-037014  (2/2)   「来る〜のもとに私」
   │     ├─[word] 037012  (1/2)   「来る」
   │     └─[phrase.pp] 037013-037014  (2/2)   「〜のもとに私」
   │        ├─[word] 037013  (1/2)   「〜のもとに」
   │        └─[word] 037014  (2/2)   「私」
   ├─[phrase.advp] 037015-037016  (2/4)   「〜ない〜ない」
   │  ├─[word] 037015  (1/2)   「〜ない」
   │  └─[word] 037016  (2/2)   「〜ない」
   ├─[word] 037017  (3/4)   「追い出す」
   └─[word] 037018  (4/4)   「外に」
```

## 4. 現在 UI が実際に表示する範囲（focus 依存）

現行 NeighborhoodView は sentence 全体ではなく **focus 語の anchor（直近 clause）の直接の子**のみを出す。代表 focus ごとに:

| focus | anchor（直近clause） | 表示される constituents（縦の並び=structural order） |
|---|---|---|
| `037001`（πᾶν） | clause 037001-009 | ①phrase.np 1-6（focus 含・expanded）／②phrase.pp 7-8／③word 9「来る」 |
| `037009`（ἥξει） | clause 037001-009 | 同上（③が focus・子なしなので expanded=false） |
| `037012`（ἐρχόμενον） | clause 037012-014 | ①word 12「来る」（focus）／②phrase.pp 13-14 |
| `037017`（ἐκβάλω） | clause 037011-018 | ①clause 11-14／②phrase.advp 15-16／③word 17「追い出す」（focus）／④word 18「外に」 |

- 対象語が focus のとき、その語を含む constituent が `expanded=true` となり、focus へ至る経路の子だけが再帰展開される（[SF-1 §5-6](./SF-1-structure-audit.md)）。

## 5. surface order と structural order の一致性（John 6:37）

- John 6:37 の**全ノードで token range が連続**（1-9 / 1-6 / 2-6 / 5-6 / 7-8 / 10-18 / 11-18 / …）。飛び番・交差なし。`CONFIRMED`
- ⇒ John 6:37 では **structural order（children 順）と surface order（! 番号）が一致**する。左→右 Reading Flow 表示で交差・逆行は発生しない。`CONFIRMED`
- 一般ケース（後置 δέ 等で非連続になりうる節）の破綻可能性は本ケースには現れないため、SF-3/SF-4 で別途評価する（STOP 条件 7 の判定対象）。

## 6. 固定事項（この構造を SF-3 以降の基準とする）

1. 表示単位のノードは `clause` / `phrase.*` / `group` / `word` の 4 系統。`CONFIRMED`
2. anchor = 直近 clause（無ければ sentence root fallback）。表示は anchor 直下の兄弟＋focus 経路の展開。`CONFIRMED`
3. 縦の並びは structural order、ノード内語順は surface order。`CONFIRMED`
4. John 6:37 は surface=structural 一致・全 range 連続。左→右化の代表ケースとして破綻要因を持たない。`CONFIRMED`
5. display text・japanese 値・parent/child・type の意味は現状のまま使う（再解釈・再生成しない）。`CONFIRMED`
