# Phase 2: LOWFATを基準としたRK図構造検証

**READ-ONLY 検証プロトタイプ — 対象ファイル変更なし**

## SHA-256 (16 chars) — 検証前記録

- `col_final_xml`: `549efaa4d438192e`
- `col_1_1_xml`: `f10aaf8094ab5d96`
- `luk_before_xml`: `216e53f8e4071baa`
- `app_html`: `d0d9bbdc5ca0caae`

---

## COL 1:3-8 (col_final.xml)
XML: `col_final.xml`

- ✅ **PASS** `slot1`: avgX(v)=0.0 < avgX(o)=410.5
- ✅ **PASS** `slot3`: avgX(v)=30.0 < avgX(o)=739.4
- ✅ **PASS** `slot4`: avgX(v)=701.6 < avgX(o)=1002.0
- ✅ **PASS** `slot6`: avgX(v)=145.5 < avgX(o)=549.1
- ✅ **PASS** `slot9`: avgX(v)=484.9 < avgX(o)=773.0
- ⚠️ **SUSPECT** `slot11`: avgX(v)=731.1 >= avgX(o)=451.2
- ✅ **PASS** `detnp1`: det COL 1:3!2 y=24.0 x=1094.6 | head COL 1:3!3 y=24.0 x=1133.0 | yDiff=0.0(<=8?true) xOk=true
- ✅ **PASS** `detnp2`: det COL 1:3!5 y=1038.0 x=145.6 | head COL 1:3!6 y=1038.0 x=192.2 | yDiff=0.0(<=8?true) xOk=true
- ⚠️ **SUSPECT** `detnp3`: det COL 1:4!2 y=376.0 x=671.6 | head COL 1:4!3 y=200.0 x=641.6 | yDiff=176.0(<=8?false) xOk=false
- ⚠️ **SUSPECT** `detnp4`: det COL 1:4!9 y=598.0 x=701.6 | head COL 1:4!10 y=422.0 x=671.6 | yDiff=176.0(<=8?false) xOk=false
- ✅ **PASS** `detnp5`: det COL 1:5!2 y=238.0 x=115.5 | head COL 1:5!3 y=238.0 x=163.0 | yDiff=0.0(<=8?true) xOk=true
- ✅ **PASS** `detnp6`: det COL 1:5!8 y=360.0 x=219.8 | head COL 1:5!9 y=360.0 x=271.3 | yDiff=0.0(<=8?true) xOk=true
- ✅ **PASS** `detnp7`: det COL 1:5!13 y=498.0 x=219.8 | head COL 1:5!14 y=498.0 x=258.2 | yDiff=0.0(<=8?true) xOk=true
- ✅ **PASS** `detnp8`: det COL 1:5!15 y=536.0 x=288.2 | head COL 1:5!16 y=536.0 x=333.4 | yDiff=0.0(<=8?true) xOk=true
- ✅ **PASS** `detnp9`: det COL 1:5!17 y=574.0 x=318.2 | head COL 1:5!18 y=574.0 x=364.8 | yDiff=0.0(<=8?true) xOk=true
- ✅ **PASS** `detnp10`: det COL 1:6!9 y=1452.0 x=249.2 | head COL 1:6!10 y=1452.0 x=287.6 | yDiff=0.0(<=8?true) xOk=true
- ✅ **PASS** `detnp11`: det COL 1:6!25 y=3012.0 x=710.7 | head COL 1:6!26 y=3012.0 x=758.2 | yDiff=0.0(<=8?true) xOk=true
- ✅ **PASS** `detnp12`: det COL 1:6!27 y=3050.0 x=788.2 | head COL 1:6!28 y=3050.0 x=834.9 | yDiff=0.0(<=8?true) xOk=true
- ⚠️ **SUSPECT** `detnp13`: det COL 1:7!5 y=1720.0 x=521.0 | head COL 1:7!6 y=1666.0 x=551.0 | yDiff=54.0(<=8?false) xOk=true
- ✅ **PASS** `detnp14`: det COL 1:7!15 y=1888.0 x=791.1 | head COL 1:7!16 y=1888.0 x=837.8 | yDiff=0.0(<=8?true) xOk=true
- ⚠️ **SUSPECT** `detnp15`: det COL 1:8!5 y=2682.0 x=917.5 | head COL 1:8!6 y=1950.0 x=887.5 | yDiff=732.0(<=8?false) xOk=false
- ✅ **PASS** `prepnp1`: prep COL 1:3!11 y=146.0 x=60.0 | np_head COL 1:3!12 y=146.0 x=126.3 | yDiff=0.0 xOk=true
- ✅ **PASS** `prepnp2`: prep COL 1:4!5 y=284.0 x=671.6 | np_head COL 1:4!6 y=284.0 x=715.9 | yDiff=0.0 xOk=true
- ✅ **PASS** `prepnp3`: prep COL 1:4!13 y=498.0 x=731.6 | np_head COL 1:4!14 y=498.0 x=781.7 | yDiff=0.0 xOk=true
- ✅ **PASS** `prepnp4`: prep COL 1:5!1 y=238.0 x=60.0 | np_head COL 1:5!2 y=238.0 x=115.5 | yDiff=0.0 xOk=true
- ✅ **PASS** `prepnp5`: prep COL 1:5!7 y=360.0 x=175.5 | np_head COL 1:5!8 y=360.0 x=219.8 | yDiff=0.0 xOk=true
- ✅ **PASS** `prepnp6`: prep COL 1:5!12 y=498.0 x=175.5 | np_head COL 1:5!13 y=498.0 x=219.8 | yDiff=0.0 xOk=true
- ✅ **PASS** `prepnp7`: prep COL 1:6!3 y=650.0 x=378.2 | np_head COL 1:6!4 y=650.0 x=428.2 | yDiff=0.0 xOk=true
- ✅ **PASS** `prepnp8`: prep COL 1:6!7 y=1414.0 x=175.0 | np_head COL 1:6!8 y=1414.0 x=219.2 | yDiff=0.0 xOk=true
- ✅ **PASS** `prepnp9`: prep COL 1:6!17 y=2836.0 x=317.7 | np_head COL 1:6!18 y=2836.0 x=361.9 | yDiff=0.0 xOk=true
- ✅ **PASS** `prepnp10`: prep COL 1:6!19 y=2890.0 x=287.7 | np_head COL 1:6!20 y=2890.0 x=343.5 | yDiff=0.0 xOk=true
- ✅ **PASS** `prepnp11`: prep COL 1:6!29 y=3050.0 x=514.9 | np_head COL 1:6!30 y=3050.0 x=559.2 | yDiff=0.0 xOk=true
- ✅ **PASS** `prepnp12`: prep COL 1:7!3 y=1552.0 x=400.4 | np_head COL 1:7!4 y=1552.0 x=461.0 | yDiff=0.0 xOk=true
- ✅ **PASS** `prepnp13`: prep COL 1:7!12 y=1812.0 x=731.1 | np_head COL 1:7!13 y=1812.0 x=801.8 | yDiff=0.0 xOk=true
- ✅ **PASS** `prepnp14`: prep COL 1:8!8 y=2628.0 x=145.5 | np_head COL 1:8!9 y=2628.0 x=189.8 | yDiff=0.0 xOk=true
- ✅ **PASS** `npofnp1`: head COL 1:3!4 y=1000.0 | modifiers avgY=1086.8 | head.y <= modAvgY ? true
- ✅ **PASS** `npofnp2`: head COL 1:3!6 y=1038.0 | modifiers avgY=1076.0 | head.y <= modAvgY ? true
- ✅ **PASS** `npofnp3`: head COL 1:4!3 y=200.0 | modifiers avgY=238.0 | head.y <= modAvgY ? true
- ✅ **PASS** `npofnp4`: head COL 1:5!14 y=498.0 | modifiers avgY=603.5 | head.y <= modAvgY ? true
- ✅ **PASS** `npofnp5`: head COL 1:6!26 y=3012.0 | modifiers avgY=3050.0 | head.y <= modAvgY ? true
- ⚠️ **SUSPECT** `npofnp6`: head COL 1:7!6 y=1666.0 | modifiers avgY=1609.0 | head.y <= modAvgY ? false
- ✅ **PASS** `npofnp7`: head COL 1:7!14 y=1850.0 | modifiers avgY=1888.0 | head.y <= modAvgY ? true
- ❓ **UNDETERMINED** `appos1`: Np-Appos hoist ロジックは複雑 — 人手確認が必要. words=8 refs=COL 1:3!2,COL 1:3!3
- ❓ **UNDETERMINED** `appos2`: Np-Appos hoist ロジックは複雑 — 人手確認が必要. words=5 refs=COL 1:3!5,COL 1:3!6
- ❓ **UNDETERMINED** `appos3`: Np-Appos hoist ロジックは複雑 — 人手確認が必要. words=2 refs=COL 1:3!8,COL 1:3!9
- ❓ **UNDETERMINED** `appos4`: Np-Appos hoist ロジックは複雑 — 人手確認が必要. words=2 refs=COL 1:4!6,COL 1:4!7
- ❓ **UNDETERMINED** `appos5`: Np-Appos hoist ロジックは複雑 — 人手確認が必要. words=8 refs=COL 1:5!2,COL 1:5!3
- ❓ **UNDETERMINED** `appos6`: Np-Appos hoist ロジックは複雑 — 人手確認が必要. words=8 refs=COL 1:5!15,COL 1:5!16
- ❓ **UNDETERMINED** `appos7`: Np-Appos hoist ロジックは複雑 — 人手確認が必要. words=6 refs=COL 1:5!17,COL 1:5!18
- ❓ **UNDETERMINED** `appos8`: Np-Appos hoist ロジックは複雑 — 人手確認が必要. words=5 refs=COL 1:7!4,COL 1:7!5
- ❓ **UNDETERMINED** `appos9`: Np-Appos hoist ロジックは複雑 — 人手確認が必要. words=15 refs=COL 1:7!11,COL 1:7!12
- ⚠️ **SUSPECT** `detcl1`: det COL 1:5!4 y=406.0 x=175.5 | cl_head COL 1:5!5 y=276.0 x=145.5 | yDiff=130.0 xOk=false
- ⚠️ **SUSPECT** `detcl2`: det COL 1:6!1 y=696.0 x=378.2 | cl_head COL 1:6!2 y=612.0 x=348.2 | yDiff=84.0 xOk=false
- ⚠️ **SUSPECT** `detcl3`: det COL 1:8!1 y=2728.0 x=761.1 | cl_head COL 1:8!2 y=1988.0 x=761.1 | yDiff=740.0 xOk=false

## COL 1:1-2 — predication=elided (col_1_1.xml)
XML: `col_1_1.xml`

- ✅ **PASS** `elided1`: LOWFATに verb あり=false / layout に verb=false / 含む語数=20 / 先頭ref=COL 1:1!1

---

## まとめ

- PASS: 37件
- SUSPECT: 9件
- UNDETERMINED: 9件