# Concept Gap Audit — Phase 8-3

**作成日:** 2026-07-12
**対象:** search-concepts.json v7
**方針:** JSON 変更なし。候補発見・判断材料の提供のみ。

---

## Current Library

| 項目 | 値 |
|---|---|
| Concept 数 | 30 |
| Alias 数 | 56 |
| Term 数 | 88 |
| NT トークン走査数 | 137,741 |

---

## Gap Analysis

### 調査方法

1. 全 NT トークンを走査し lemma ごとの出現数・書巻数を集計
2. 既存 Concept の terms（lemma axis）でカバーされていない語を抽出
3. 神学的独立性・頻度・既存 Concept との境界を手動評価
4. recommendation を 4 段階で分類

### Recommendation 基準

| 分類 | 基準 |
|---|---|
| independent_candidate | 独立した神学的意味域・十分な頻度・既存 alias では意味が広すぎる |
| conditional_candidate | 独立の余地はあるが隣接 Concept との境界整理が必要 |
| alias_sufficient | 既存 Concept の alias 追加で対応可能 |
| reject_ambiguity | 意味が広すぎる・神学的文脈が一意に定まらない |

---

## Recommended New Concepts（independent_candidate）

### 死（id: `death`）Priority 1

| 項目 | 値 |
|---|---|
| Label | 死（し） |
| Lemmas | θάνατος, ἀποθνῄσκω, νεκρός, θνητός |
| NT 出現数 | 365 |
| 登場書巻数 | 20 |
| 主な日本語グロス | θάνατος=死 / ἀποθνῄσκω=死ぬ / νεκρός=死んだ / θνητός=死すべき |
| 関連既存 Concept | resurrection, sin, eternal-life |

**境界評価:** 359 例超と高頻度。resurrection（復活）の対概念として独立。sin（罪）の結果・帰結として言及されるが、死自体が救済論の出発点となる独立概念（「死んで葬られ、三日目に復活」等）。

---

### 裁き（id: `judgment`）Priority 1

| 項目 | 値 |
|---|---|
| Label | 裁き（さばき） |
| Lemmas | κρίσις, κρίμα, κρίνω, κριτής, καταδικάζω |
| NT 出現数 | 213 |
| 登場書巻数 | 21 |
| 主な日本語グロス | κρίσις=裁き / κρίμα=裁き / κρίνω=裁く / κριτής=裁き人 / καταδικάζω=裁く |
| 関連既存 Concept | righteousness, sin, god |

**境界評価:** 189 例超と高頻度。神の裁き・最後の審判は NT 全体で反復される主要テーマ。righteousness（義）は裁きの基準であり、裁き自体とは区別される独立概念。

---

### 律法（id: `law`）Priority 1

| 項目 | 値 |
|---|---|
| Label | 律法（りっぽう） |
| Lemmas | νόμος, νομικός, νομοθεσία, νόμιμος |
| NT 出現数 | 203 |
| 登場書巻数 | 13 |
| 主な日本語グロス | νόμος=律法 / νομικός=律法に関する / νομοθεσία=律法授与 |
| 関連既存 Concept | righteousness, grace, faith, sin |

**境界評価:** 193 例と高頻度。ローマ書・ガラテヤ書で「律法 vs 恵み」「律法 vs 信仰」という対立構造を形成する独立概念。righteousness（義）は律法の目的/結果、grace（恵み）は律法の対置概念であり、律法自体は独自の意味域を持つ。

---

### 証し（id: `witness`）Priority 1

| 項目 | 値 |
|---|---|
| Label | 証し（あかし） |
| Lemmas | μαρτυρέω, μαρτυρία, μάρτυς, μαρτύριον |
| NT 出現数 | 168 |
| 登場書巻数 | 22 |
| 主な日本語グロス | μαρτυρέω=証しする / μαρτυρία=証し / μάρτυς=証人 / μαρτύριον=証し |
| 関連既存 Concept | mission, gospel, truth |

**境界評価:** mission（κηρύσσω: 布告する）と意味が近いが、witness（μαρτυρέω: 見聞きしたことを証言する）は認識論的・法的な証言という固有の意味域を持つ。ヨハネ文書での使用が特に多く独立テーマとして成立。

---

### 赦し（id: `forgiveness`）Priority 1

| 項目 | 値 |
|---|---|
| Label | 赦し（ゆるし） |
| Lemmas | ἄφεσις, ἀφίημι, ἄφεμα |
| NT 出現数 | 160 |
| 登場書巻数 | 13 |
| 主な日本語グロス | ἄφεσις=赦し / ἀφίημι=赦す |
| 関連既存 Concept | sin, salvation, grace, redemption, reconciliation |

**境界評価:** sin/salvation と隣接するが、「罪の赦し」は NT の核心的宣言であり独立した意味域を持つ。grace（χάρις）は神の好意・賜物の概念、redemption（ἀπολύτρωσις）は身代金的解放であり、赦し（ἄφεσις）は負債・罪責の免除という固有の神学語。

---

### 礼拝（id: `worship`）Priority 1

| 項目 | 値 |
|---|---|
| Label | 礼拝（れいはい） |
| Lemmas | προσκυνέω, λατρεύω, σέβομαι, εὐσέβεια, θρησκεία |
| NT 出現数 | 110 |
| 登場書巻数 | 16 |
| 主な日本語グロス | προσκυνέω=礼拝する / λατρεύω=仕える / σέβομαι=礼拝する / εὐσέβεια=敬虔 / θρησκεία=宗教 |
| 関連既存 Concept | holy, prayer, glory, thanksgiving |

**境界評価:** prayer（祈り）は δέομαι/προσεύχομαι。礼拝（προσκυνέω）は「ひれ伏す/崇拝する」の行為動詞で、NT では神・イエスへの応答として固有の意味域を持つ。holy は状態/性質の概念であり重複は低い。

---

### 誘惑・試練（id: `temptation`）Priority 1

| 項目 | 値 |
|---|---|
| Label | 誘惑・試練（ゆうわく・しれん） |
| Lemmas | πειρασμός, πειράζω, ἐκπειράζω, δοκιμή, δοκιμάζω |
| NT 出現数 | 91 |
| 登場書巻数 | 19 |
| 主な日本語グロス | πειρασμός=誘惑 / πειράζω=試みる / ἐκπειράζω=試みる / δοκιμή=試練 / δοκιμάζω=吟味する |
| 関連既存 Concept | faith, perseverance, obedience |

**境界評価:** perseverance（ὑπομονή）と意味が隣接するが、temptation は「誘惑する/試みる」という行為者と対象の関係概念。faith の文脈で不可欠であり、主の祈りの「試みに遭わせないで」等も含む。

---

### 知恵（id: `wisdom`）Priority 2

| 項目 | 値 |
|---|---|
| Label | 知恵（ちえ） |
| Lemmas | σοφία, σοφός, σοφίζω, σύνεσις, φρόνησις |
| NT 出現数 | 81 |
| 登場書巻数 | 13 |
| 主な日本語グロス | σοφία=知恵 / σοφός=知恵ある / σοφίζω=巧みにする / σύνεσις=知恵 / φρόνησις=思慮 |
| 関連既存 Concept | truth, righteousness |

**境界評価:** 70 例。Pauline 神学での「神の知恵 vs 人の知恵」（コリント１・２章）は独立概念。truth（ἀλήθεια: 真理/事実）とは異なり、知恵（σοφία）は認識能力・判断力の次元。

---

### 約束（id: `promise`）Priority 2

| 項目 | 値 |
|---|---|
| Label | 約束（やくそく） |
| Lemmas | ἐπαγγελία, ἐπαγγέλλομαι |
| NT 出現数 | 67 |
| 登場書巻数 | 14 |
| 主な日本語グロス | ἐπαγγελία=約束 / ἐπαγγέλλομαι=約束する |
| 関連既存 Concept | hope, faith, eternal-life, gospel |

**境界評価:** 67 例。アブラハムへの約束、聖霊の約束など NT の covenant promise は神学的に独立。hope（ἐλπίς: 期待・望み）は主観的態度であり、promise（ἐπαγγελία: 神の宣言・保証）は客観的な神の行為として区別される。

---

### 御心（id: `gods-will`）Priority 2

| 項目 | 値 |
|---|---|
| Label | 御心（みこころ） |
| Lemmas | θέλημα |
| NT 出現数 | 62 |
| 登場書巻数 | 18 |
| 主な日本語グロス | θέλημα=御心 |
| 関連既存 Concept | obedience, prayer, god |

**境界評価:** 62 例と中頻度。「神の御心」は Pauline 神学の中心概念で、obedience（ὑπακοή: 命令への服従）とは異なる。「御心が行われますように」（主の祈り）等の文脈での独立性が高い。βουλή（計画）も近義だが別概念。


---

## Conditional Candidates（conditional_candidate）

| id | label | lemmas | NT 出現数 | 関連既存 | 理由 |
|---|---|---|---|---|---|
| mercy | 憐れみ | ἔλεος, ἐλεέω, ἐλεήμων, οἰκτίρμων, οἰκτιρμός | 37 | grace, love | 37 例。grace（χάρις）は「受ける価値のない者への好意」、mercy（ἔλεος）は「苦難にある者への同情・介… |
| covenant | 契約 | διαθήκη | 33 | gospel, grace, promise, redemption | 33 例。旧・新契約の対比（コリント２:3章・へブル書）は神学的に独立。ただし promise（ἐπαγγελία）が独… |
| inheritance | 相続・嗣業 | κληρονομία, κληρονόμος, κληρονομέω, κλῆρος | 58 | promise, hope, eternal-life, kingdom | 47 例（4 lemma 合計）。OT の「約束の地」から NT の「神の国を受け継ぐ」への展開は固有の意味域。ただし … |
| fellowship | 交わり | κοινωνία, κοινωνός, κοινωνέω, κοινός | 51 | church, love | 37 例。church（ἐκκλησία: 召された集会）は組織概念、fellowship（κοινωνία: 分かち合… |
| gift | 賜物 | χάρισμα, δωρεά, δόμα, δῶρον | 51 | grace, holy-spirit | χάρισμα は既存 grace の term として登録済み。schema_note（v7）で「将来独立 Conce… |

### 憐れみ（conditional）

37 例。grace（χάρις）は「受ける価値のない者への好意」、mercy（ἔλεος）は「苦難にある者への同情・介入」という微妙な区別があり、神学的には独立。ただし grace と重複する文脈も多い（conditional_candidate の余地）。

### 契約（conditional）

33 例。旧・新契約の対比（コリント２:3章・へブル書）は神学的に独立。ただし promise（ἐπαγγελία）が独立 Concept になれば関連が重なる。promise とペアで検討すべき。

### 相続・嗣業（conditional）

47 例（4 lemma 合計）。OT の「約束の地」から NT の「神の国を受け継ぐ」への展開は固有の意味域。ただし promise/eternal-life/kingdom との重複概念が多く、独立後の差別化が課題。

### 交わり（conditional）

37 例。church（ἐκκλησία: 召された集会）は組織概念、fellowship（κοινωνία: 分かち合い・共有）は関係性・交わりの概念として区別される。ただし頻度が低いため独立 Concept としての入口の強さは中程度。

### 賜物（conditional）

χάρισμα は既存 grace の term として登録済み。schema_note（v7）で「将来独立 Concept 候補」として明示。霊の賜物（πνευματικά χαρίσματα）は holy-spirit と grace の交差点にある独立テーマ。grace から分離する神学的根拠はあるが、χάρισμa の登録解除が必要。


---

## Rejected Candidates（reject_ambiguity）

| id | label | lemmas | NT 出現数 | 不採用理由 |
|---|---|---|---|---|
| flesh | 肉・肉体 | σάρξ | 147 | 147 例と高頻度だが意味が多義的: ①肉体（物理的身体）②人間本性③罪の原動力（肉の欲）④肉なるキリスト。Pauline 神学での「肉 vs 霊」対立は独立テ… |
| world | 世界・世 | κόσμος, αἰών | 307 | κόσμος 185 例・αἰών 122 例と高頻度だが、双方とも意味が広く「物理的世界・人類・悪の世界秩序・現代」等を包含。κόσμος を「世の中（悪の支… |
| mystery | 奥義 | μυστήριον | 26 | 26 例。Pauline 用語として「キリストにある神の奥義」「異邦人が相続人となる奥義」等で重要だが、単独 Concept としては頻度・適用範囲ともに限定的… |
| time-season | 時・季節 | καιρός, χρόνος | 138 | καιρός 85 例・χρόνος 53 例と頻出だが意味域が広く「タイミング・機会・時代・時間」等を包含。終末論的「時」の概念は重要だが、parousia（… |

---

## Collision Report

既存 Concept / Alias との衝突確認（candidates の lemma が既登録かどうか）:

| Candidate | 登録済み lemma | 既存 Concept | 対応 |
|---|---|---|---|
| gift | χάρισμα | grace | 独立化には既存 terms からの除外が必要 |

---

## Summary

| 分類 | 件数 |
|---|---|
| independent_candidate（追加推奨） | 10 |
| conditional_candidate（条件付き） | 5 |
| alias_sufficient | 0 |
| reject_ambiguity（採用しない） | 4 |
| **合計評価候補** | **19** |

---

## FAIL / WARNING

**FAIL 0 / WARNING 0**



---

## Phase 8-4 追加推奨（Priority 1）

以下の 8 Concept が Priority 1 として独立追加を推奨する。
いずれも NT 頻出・神学的独立性が高く・既存 alias では対応困難。

| id | label | 主 lemma | NT 出現数 | 理由一言 |
|---|---|---|---|---|
| death | 死 | θάνατος | 365 | 359 例超と高頻度。 |
| judgment | 裁き | κρίσις | 213 | 189 例超と高頻度。 |
| law | 律法 | νόμος | 203 | 193 例と高頻度。 |
| witness | 証し | μαρτυρέω | 168 | mission（κηρύσσω: 布告する）と意味が近いが、witness（μαρτυρέω: 見聞きしたことを証言する）は認識論的・法的な証言という固有の意味域を持つ。 |
| forgiveness | 赦し | ἄφεσις | 160 | sin/salvation と隣接するが、「罪の赦し」は NT の核心的宣言であり独立した意味域を持つ。 |
| worship | 礼拝 | προσκυνέω | 110 | prayer（祈り）は δέομαι/προσεύχομαι。 |
| temptation | 誘惑・試練 | πειρασμός | 91 | perseverance（ὑπομονή）と意味が隣接するが、temptation は「誘惑する/試みる」という行為者と対象の関係概念。 |

Priority 2（独立の余地あり・隣接整理後に追加）:

| id | label | 主 lemma | NT 出現数 |
|---|---|---|---|
| wisdom | 知恵 | σοφία | 81 |
| promise | 約束 | ἐπαγγελία | 67 |
| gods-will | 御心 | θέλημα | 62 |

---

## Notes

- frequency はNT 137K トークン走査の実測値。LXX は含まない。
- frequency は concept の terms に加える lemma の合計（例: forgiveness = ἄφεσις + ἀφίημι の合計）。
- 既存 Concept に登録済み lemma（χάρισμα / χαρίζομαι）を含む候補（gift）は、独立化に際して grace の terms から除外する必要がある。
- 「境界評価」は神学的な判断根拠を記録したもので、機械的ルールではない。
- Concept の追加は scripts/concept-audit.cjs + scripts/concept-coverage-audit.cjs を通すこと。
