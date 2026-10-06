# Phase N — 3 RK Reading Modes Comparative UX Audit
# FROZEN

**凍結日:** 2026-10-06
**基準コミット:** `b085eaa6` (feat: Phase M — Progressive RK renderer)
**判定:** PASS / FROZEN

---

## 対象モード

| モード | 内部ID | URL | renderer |
|---|---|---|---|
| Horizontal RK | `RK_READING` | `/RK` | `rk-reading-renderer.js` |
| Vertical RK | `RK_READING_V` | `/RKV` | `rk-reading-renderer-v.js` |
| Progressive RK | `RK_READING_P` | `/RKP` | `rk-reading-renderer-p.js` |

---

## Confirmed

- 全3モード Browser verification 済み (27スクリーンショット確認)
- Console errors = 0 (全モード)
- URL直接アクセス PASS: `/JHN/1/RK`, `/JHN/1/RKV`, `/JHN/1/RKP`
- モード切替 PASS
- ブラウザ refresh 後の URL 保持 PASS
- StudyPanel 連携 PASS
- Mobile 390px 動作確認済み
- Wide 1440px 動作確認済み

---

## 評価パッセージ

- Passage A: JHN 1:1–5 (S/V / coordinate / modifier / subordinate)
- Passage B: JHN 1:6–8 (関係節 / subordinate modifier増加)
- Passage C: JHN 1:14 (長文 / 複数構造)
- Passage D: ROM 1:24 (Phase H 代表ケース / 長い入れ子構造)

---

## 各モードの正式役割定義

**Horizontal RK**
> 文の完全な構造図を見ながら分析的に読む

**Vertical RK**
> 文の主構造・並列・修飾を空間的に俯瞰する

**Progressive RK**
> 本文を読みながら、必要な箇所だけ局所的に構造を開く

---

## Reading First 評価

順位（Reading First = 本文が前面に出ているか）:
1. Progressive — State 0 は本文そのもの (PASS)
2. Vertical — Y軸主軸が自然な視線方向 (PASS)
3. Horizontal — 構造線が本文と同時に表示される (MINOR)

---

## Mobile 評価（390px）

| モード | 複雑文の実用性 | 横スクロール | 推奨度 |
|---|---|---|---|
| Horizontal | △ (ROM 1:24 は多スクロール必要) | 不要 | 限定的 |
| Vertical | ○ (Y軸 = モバイルスクロール方向) | 不要 | 構造図として有効 |
| Progressive | ◎ | 不要 | 通読に最適 |

---

## DEFERRED UX Issues

修正しない。将来の独立 Phase で検討する。

| ID | モード | 内容 |
|---|---|---|
| D-N-1 | H | ROM 1:24等の複雑文で点線矩形が5–6層重複 |
| D-N-2 | H | 関係節の空矩形が視覚を支配 |
| D-N-3 | V | 深い修飾スタックで文字が小さくなる |
| D-N-4 | P | State 2展開時に接続パネルが本文領域を圧迫 |
| D-N-5 | P | State 0での役割手がかりが色のみ |
| D-N-6 | H | Mobile での複雑文対応 |

---

## Freeze 対象

以下は変更しない:

- 3モードの renderer
- 3モードの layout / behavior
- semantic structure / adapter
- StudyPanel
- URL routing `/RK` `/RKV` `/RKP`
- Design Tokens
- color coding
- Progressive RK State 0/1/2 の挙動
- Horizontal RK / Vertical RK の既存挙動

---

## 3モードの共存判定

3モードは重複していない。それぞれが異なる読書行動に対応する:

- 分析的読書 (H) — 文を構造図として精査する
- 俯瞰的読書 (V) — 段落・節の流れを空間として把握する
- 通読型読書 (P) — 本文を読みながら必要箇所だけ構造を確認する

「どれか1つに統合する」という判断は出さない。3つとも正式モードとして保持する。
