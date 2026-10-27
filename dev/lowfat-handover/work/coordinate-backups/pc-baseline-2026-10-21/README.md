# PC用座標基準版バックアップ

## 目的

スマートフォン最適の座標調整を開始する前に、現在の LOWFAT 座標を PC 用の基準版として保存したもの。  
このバックアップはスマホ用座標調整作業では上書きしない。

---

## 作成日時

2026-10-21

---

## バックアップ対象

### 座標データファイル（主対象）

`app/rk-diagram-m3.html` からユーザーが開くと作業で使用する LOWFAT XML のうち、
手動座標属性（`rk-dy` / `rk-dx`）を持つファイルを対象とした。

| 元ファイルパス | バックアップ先パス | 属性内容 |
|---|---|---|
| `data/lowfat/03-luke.xml` | `data/lowfat/03-luke.xml` | `rk-dx` 3件 |
| `data/lowfat/12-colossians.xml` | `data/lowfat/12-colossians.xml` | `rk-dy` 3件, `rk-dx` 3件 |

座標属性を持たない `data/lowfat/` 内の他の 25 ファイルは対象外とした（座標調整の対象外であり、元ファイルは変更されていない）。

### 参照用 HTML（副対象）

| 元ファイルパス | バックアップ先パス | 備考 |
|---|---|---|
| `app/rk-diagram-m3.html` | `app-ref/rk-diagram-m3.html` | 作業ツールの参照用コピー。座標データは含まない |

`app-ref/` は参照用コピーであり、座標基準データではない。  
スマホ座標調整時に HTML を変更しても、このコピーは影響を受けない。

---

## SHA-256 照合記録

コピー前後の SHA-256 はすべて一致している。

| ファイル | SHA-256 |
|---|---|
| `data/lowfat/03-luke.xml` | `5b91833c117b66f556acaa259b015a313bc61f5d9b218b552825543dbee16737` |
| `data/lowfat/12-colossians.xml` | `26317fccea680de2072b5ce68c32d5a5389afa9475016f329af710ed977a1514` |
| `app-ref/rk-diagram-m3.html` | `c7a0a14bbbf4c01308cf6331312d6af64de0769c052a44d98369ee5b2aedb53d` |

---

## 元データを変更していないこと

- 元ファイルはコピーで作成した。元ファイルを移動・改名・変更していない。
- バックアップ作成時点での元ファイルの SHA-256 は上記と同一。

---

## 座標内容の概要

### 03-luke.xml（ルカ福音書）

`rk-dx` 属性を持つ `wg` 要素 3件。すべて `luk_after_fold.xml` テストで確認済みの fold 構造（NPofNP 組）のグループ横方向オフセット。

```xml
<wg class="np" rule="NPofNP" junction="apposition" rk-dx="-780"> × 3件（系譜節 3:25, 3:30, 3:35）
```

### 12-colossians.xml（コロサイ書）

`rk-dy` + `rk-dx` 属性を持つ `wg` 要素 3件。Task 11–16 で調整・検証済みの構造。

```xml
<wg class="np" rule="NPofNP" junction="apposition" rk-dx="-1009" rk-dy="938">   (COL 1:3付近)
<wg Rule="ClCl" class="cl" ...               rk-dx="-1362" rk-dy="1176">         (COL 1:6付近)
<wg class="np" rule="NpPp"                   rk-dx="-802"  rk-dy="602">          (COL 1:6付近)
```

---

## 復元する場合の注意点

スマホ座標調整後に PC 用の基準座標に戻したい場合:

1. このディレクトリの `data/lowfat/03-luke.xml` と `data/lowfat/12-colossians.xml` を
   プロジェクトの `data/lowfat/` にコピーする。
2. 上書きの前に、現在の `data/lowfat/` ファイルの SHA-256 を確認し、変更内容を記録する。
3. HTML（`app/rk-diagram-m3.html`）は座標を持たないため、HTML の復元は原則不要。
   ただし、スマホ調整作業で HTML を変更した場合は `app-ref/` を参照できる。

---

## このバックアップを上書きしないこと

- スマホ座標調整作業でこのディレクトリ内のファイルを変更しない。
- スマホ用調整後の XML は別ディレクトリ（`sp-adjusted-YYYY-MM-DD/` 等）に保存する。
- このディレクトリは PC 用基準版として恒久的に維持する。
