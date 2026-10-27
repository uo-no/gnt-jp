# Phase 3: rk-dx / rk-dy 手動調整箇所の監査

**READ-ONLY 監査 — 対象ファイル変更なし**

調査対象: `lowfat-handover/data/lowfat/` (6 件)

---

## 調整箇所 1
- **ファイル**: `03-luke.xml`
- **文範囲**: LUK 3:23!1 〜 LUK 3:38!8
- **対象 wg**: rule=`NPofNP` class=`np` role=`` junction=`apposition`
- **調整値**: rk-dx=`-780` / rk-dy=`None`
- **含む語数**: 136 語 (`LUK 3:25!5` 〜 `LUK 3:38!8`)
- **語テキスト**: τοῦ Ναοὺμ τοῦ Ἑσλὶ τοῦ Ναγγαὶ τοῦ Μάαθ...
- **直接親 wg**: rule=`Np-Appos` class=`np` role=``
- **直接子要素**:
  - w class=`det` role=`` `τοῦ` [LUK 3:25!5]
  - wg rule=`Np-Appos` class=`np` role=`` junc=`` (135語, 先頭:`Ναοὺμ`)
- **編集ファイル SHA-256(16)**: `5b91833c117b66f5`
- **原本 SHA-256(16)**: `10efdbb0415c1020`
- **原本に rk 属性**: なし (CONFIRMED: 原本は未編集)
- **判定**: `UNDETERMINED` — 人手で構造確認が必要 / 水平移動あり (rk-dx=-780)

## 調整箇所 2
- **ファイル**: `03-luke.xml`
- **文範囲**: LUK 3:23!1 〜 LUK 3:38!8
- **対象 wg**: rule=`NPofNP` class=`np` role=`` junction=`apposition`
- **調整値**: rk-dx=`-780` / rk-dy=`None`
- **含む語数**: 84 語 (`LUK 3:30!7` 〜 `LUK 3:38!8`)
- **語テキスト**: τοῦ Ἰωνὰμ τοῦ Ἐλιακὶμ τοῦ Μελεὰ τοῦ Μεννὰ...
- **直接親 wg**: rule=`Np-Appos` class=`np` role=``
- **直接子要素**:
  - w class=`det` role=`` `τοῦ` [LUK 3:30!7]
  - wg rule=`Np-Appos` class=`np` role=`` junc=`` (83語, 先頭:`Ἰωνὰμ`)
- **編集ファイル SHA-256(16)**: `5b91833c117b66f5`
- **原本 SHA-256(16)**: `10efdbb0415c1020`
- **原本に rk 属性**: なし (CONFIRMED: 原本は未編集)
- **判定**: `UNDETERMINED` — 人手で構造確認が必要 / 水平移動あり (rk-dx=-780)

## 調整箇所 3
- **ファイル**: `03-luke.xml`
- **文範囲**: LUK 3:23!1 〜 LUK 3:38!8
- **対象 wg**: rule=`NPofNP` class=`np` role=`` junction=`apposition`
- **調整値**: rk-dx=`-780` / rk-dy=`None`
- **含む語数**: 32 語 (`LUK 3:35!7` 〜 `LUK 3:38!8`)
- **語テキスト**: τοῦ Ἔβερ τοῦ Σαλὰ τοῦ Καϊνὰμ τοῦ Ἀρφαξὰδ...
- **直接親 wg**: rule=`Np-Appos` class=`np` role=``
- **直接子要素**:
  - w class=`det` role=`` `τοῦ` [LUK 3:35!7]
  - wg rule=`Np-Appos` class=`np` role=`` junc=`` (31語, 先頭:`Ἔβερ`)
- **編集ファイル SHA-256(16)**: `5b91833c117b66f5`
- **原本 SHA-256(16)**: `10efdbb0415c1020`
- **原本に rk 属性**: なし (CONFIRMED: 原本は未編集)
- **判定**: `UNDETERMINED` — 人手で構造確認が必要 / 水平移動あり (rk-dx=-780)

## 調整箇所 4
- **ファイル**: `12-colossians.xml`
- **文範囲**: COL 1:3!1 〜 COL 1:8!9
- **対象 wg**: rule=`NPofNP` class=`np` role=`` junction=`apposition`
- **調整値**: rk-dx=`-1009` / rk-dy=`938`
- **含む語数**: 6 語 (`COL 1:3!4` 〜 `COL 1:3!9`)
- **語テキスト**: πατρὶ τοῦ κυρίου ἡμῶν Ἰησοῦ Χριστοῦ
- **直接親 wg**: rule=`Np-Appos` class=`np` role=`o`
- **直接子要素**:
  - w class=`noun` role=`` `πατρὶ` [COL 1:3!4]
  - wg rule=`Np-Appos` class=`np` role=`` junc=`` (5語, 先頭:`τοῦ`)
- **編集ファイル SHA-256(16)**: `26317fccea680de2`
- **原本 SHA-256(16)**: `10646a85185273b4`
- **原本に rk 属性**: なし (CONFIRMED: 原本は未編集)
- **判定**: `UNDETERMINED` — 下方向移動 (混雑回避か構造上の問題かを要確認) / 水平移動あり (rk-dx=-1009)

## 調整箇所 5
- **ファイル**: `12-colossians.xml`
- **文範囲**: COL 1:3!1 〜 COL 1:8!9
- **対象 wg**: rule=`` class=`cl` role=`` junction=``
- **調整値**: rk-dx=`-1362` / rk-dy=`1176`
- **含む語数**: 50 語 (`COL 1:6!6` 〜 `COL 1:8!9`)
- **語テキスト**: καὶ ἐν παντὶ τῷ κόσμῳ ἐστὶν καρποφορούμενον καὶ...
- **直接親 wg**: rule=`sub-CL` class=`cl` role=`o`
- **直接子要素**:
  - wg rule=`AdvPp` class=`pp` role=`adv` junc=`` (5語, 先頭:`καὶ`)
  - wg rule=`BeVerb` class=`vp` role=`v` junc=`` (4語, 先頭:`ἐστὶν`)
  - wg rule=`sub-CL` class=`cl` role=`adv` junc=`` (41語, 先頭:`καθὼς`)
- **編集ファイル SHA-256(16)**: `26317fccea680de2`
- **原本 SHA-256(16)**: `10646a85185273b4`
- **原本に rk 属性**: なし (CONFIRMED: 原本は未編集)
- **判定**: `UNDETERMINED` — 下方向移動 (混雑回避か構造上の問題かを要確認) / 水平移動あり (rk-dx=-1362)

## 調整箇所 6
- **ファイル**: `12-colossians.xml`
- **文範囲**: COL 1:3!1 〜 COL 1:8!9
- **対象 wg**: rule=`NpPp` class=`np` role=`` junction=``
- **調整値**: rk-dx=`-802` / rk-dy=`602`
- **含む語数**: 3 語 (`COL 1:8!7` 〜 `COL 1:8!9`)
- **語テキスト**: ἀγάπην ἐν πνεύματι
- **直接親 wg**: rule=`ofNPNP` class=`np` role=``
- **直接子要素**:
  - w class=`noun` role=`` `ἀγάπην` [COL 1:8!7]
  - wg rule=`PrepNp` class=`pp` role=`` junc=`` (2語, 先頭:`ἐν`)
- **編集ファイル SHA-256(16)**: `26317fccea680de2`
- **原本 SHA-256(16)**: `10646a85185273b4`
- **原本に rk 属性**: なし (CONFIRMED: 原本は未編集)
- **判定**: `UNDETERMINED` — 下方向移動 (混雑回避か構造上の問題かを要確認) / 水平移動あり (rk-dx=-802)

---
## まとめ
- 合計: 6 件 (LUK 3件 / COL 3件)
- 全件 UNDETERMINED — 自動判定不可（人手確認が必要）
- 原本 (gnt-jp/work/SBLGNT/lowfat/) への rk 属性追加: 0件 (CONFIRMED)
- 編集コピー (lowfat-handover/data/lowfat/) のみに rk 属性が存在