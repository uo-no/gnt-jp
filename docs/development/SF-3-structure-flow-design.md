# SF-3 / SF-4 Structure Flow UX 設計・評価・選定

対象: 「この語の構造上の位置づけ」を上→下インデントから左→右 Structure Flow へ再設計
作成: 2026-08-11
State: DESIGN（実装前・コード変更なし）
前提: [SF-1](./SF-1-structure-audit.md), [SF-2](./SF-2-john-6-37-structure.md), neighborhood-view-design.md

---

## 0. 設計制約（守る）

- **First Principle / Reading is primary**: 文法解析図ではなく「読んでいる箇所の構造的まとまりを見る補助」。装飾・色分け・円ノード・放射状・ゲーム的UIを避ける。
- **L-0 / データ不変**: Lowfat / Analysis / Reading Engine / Representation / 日本語生成を変更しない。表示層（Renderer + CSS）のみ。
- **【重要】constituent の並びは structural order を保持**（neighborhood-view-design.md §5 / §7 が surface order への並べ替えを明確に禁止）。したがって左→右レイアウトは **Model が渡す構造順のまま**横に流す。並べ替えはしない。John 6:37 は structural order == surface order（[SF-2 §5](./SF-2-john-6-37-structure.md)）なので、この順で流すことが同時に reading order になる。
- **focus 意味の維持**: 現行同様「この語（focus）の位置づけ」を示す。anchor（直近clause）直下の兄弟を並べ、focus へ至る経路だけを展開する（非focusは畳んだ1チップ）。

## 1. 座標系

- **X軸（左→右）** = anchor 直下からの reading flow。兄弟 constituent を structural order で横に並べる。
- **Y軸（上→下）** = 構造の下降（分岐）。focus を含む constituent だけが1段下のレーンへ展開し、その子を再び左→右に並べる。focus 語に達したら停止。
- 非focusの兄弟は各レーンの終端チップ（畳んだラベル）。

`A → B → C`（横） / 分岐は下（縦）という課題指定に一致する。ただし本ビューでは「分岐」は *focus 経路の下降* に限定される（このビューは "この語の位置づけ" であり全枝の展開図ではない）。

## 2. 候補案と評価（SF-4）

| 案 | 概要 | 左→右 | 構造把握 | Reading邪魔しない | 長節/Mobile | 解析ツール臭 | 判定 |
|---|---|---|---|---|---|---|---|
| A: bracket-under-text | 連続本文の下に括弧罫で構成範囲を重ねる | △(本文は左右だが構造は括弧) | ○全体 | ○ | △深いと過密 | やや強(文法図) | 見送り |
| B: 深さ=左右のマインドマップ | 親を左・子を右へ展開（左右=深さ） | ✗ 左右がreading orderでない | ○ | △ | △横スクロール | 強 | 見送り（課題の"左→右=Reading Flow"に反する） |
| **C: 下降 reading レーン** | 各深さを左→右レーンにし、focus 経路だけ下段へ | ○(構造順=reading) | ○focus経路 | ○ | ○flex-wrapで折返し | 弱(チップ+細線) | **採用** |

**採用 = 案 C。** 理由:
1. 課題の「ノード＋関係線＋階層」「左→右=Reading Flow」「分岐は下」に最も素直に一致。
2. 現行の focus-path 展開セマンティクスをそのまま横向きに写像でき、意味の再解釈が不要（L-0安全）。
3. anchor=直近clauseのため下降段数が浅く（John 6:37 は最大2段）、長節でも過密になりにくい。深い系図等は Display Policy 未実装の既知事項（design §8）に委ね、本ビューは anchor 単位で自然に浅くなる。
4. flex-wrap により横 overflow を出さずMobileへdegradeできR。

## 3. 表示仕様（案C 詳細）

### DOM 構造（概念）
```
.sf-flow                               ルート（rn-level-body 内）
  .sf-lane                             1レーン = flex row（align-items:flex-start, flex-wrap）
    .sf-node                           1構成語（チップ＋必要なら下段）
      .sf-chip                         畳んだラベル（surface order 連結・既存 japanese）
      .sf-branch  (focus経路のみ)       接続線 + 子レーン（親の左端に整列）
        .sf-lane … （再帰）
    .sf-node .sf-chip.is-focus         focus 語（強調・葉）
```
- expanded（focus経路上）の node のみ `.sf-branch`（子レーン）を持つ。それ以外は終端チップ。
- 接続は `.sf-branch` の左に 1px の縦罫＋上部エルボのみ（色 `--border` 系）。

### 視覚（落ち着いた・非カラフル）
- chip: 背景ごく淡い `--bg-inset` / 角 `--radius-s` / 文字 `--text-body` / 色 `--text-main` / 罫 `--border`。
- focus chip: `font-weight:600` + 文字色 `--accent`(#5a6e82) + 下線1px `--accent`。色は1色のみ、彩度低。
- 接続線: `--border` / `--border-strong`。アイコン・円・矢印記号は使わない。
- ラベル語順は現行どおり surface order（`_ft11LabelOf`・within-node は Text Rendering 責務で従来から許可）。
- 見出し・注記（"Lowfat由来の構造情報 …"）は現行の文言を維持。

### Failure Mode
- Model が null / constituents 空 → 現行同様 `''`（既存表示に影響しない）。
- ラベル空 → 従来の「（この構成語）」プレースホルダを維持。

## 4. 実装範囲（SF-5 予告）

- 置換対象は Renderer の `_ft11RenderList()` のみ（`{label,isFocus,expanded,children}` を消費）。Model・`_ft11ToRenderItem`・`buildNeighborhoodView`・Adapter・bible_data は不変。
- CSS は index.html の既存 `<style>`（rn-level-section 群の近傍）へ `.sf-*` を追加。
- 他モード（Word Order / Translation / Syntax Tree / Flow / StudyPanel / MobileVerseView）へは触れない。

## 5. 既知の限界（記録）

- structural order ≠ surface order の節（後置 δέ 等・非連続 range）では、左→右が厳密な本文語順と一致しない場合がある。**設計上 structural order を優先する**（neighborhood-view-design.md §5/§7 準拠）。John 6:37 では発生しない。これは STOP 条件7に触れうるが、「不正確な surface 再並べ替えをしない」ことで L-0 を守る側に倒す判断であり、実装ブロッカーではない。`CONFIRMED`（判断）
- 非常に深い anchor（長大系図）での表示量制御は Display Policy（未実装）の担当。本ビューは anchor 単位で浅くなるため代表ケースでは問題化しない。
