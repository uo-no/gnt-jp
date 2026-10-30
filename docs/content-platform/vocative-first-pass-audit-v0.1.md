# 呼格5タイプ 初回独立監査メモ v0.1

- Date: 2026-10-30
- Scope: `syntax-registry.json` の vocative カテゴリ全5タイプ
- Corpus: `public/bible_data/nt/{BOOK}/{CHAPTER}.json` on `main`
- Review status: first-pass; no production changes

## 1. 監査方針

呼格形態と、直接呼びかけ・感嘆・反復などの語用論的機能を分離する。ὦ の有無や隣接呼格の検出は形式的特徴を示すが、感情・修辞効果・指示対象は文脈依存である。

## 2. 代表箇所の照合

| ID | 代表箇所 | 本文上の形 | 初回所見 |
|---|---|---|---|
| `vocative.direct_address` | MAT 8:2 | Κύριε, ἐὰν θέλῃς | Κύριε は明瞭な呼格による直接呼びかけ。呼格形の検出は可能だが、呼びかけ先や発話機能は談話文脈で確認する。 |
| `vocative.with_o` | MAT 15:28 | Ὦ γύναι, μεγάλη σου ἡ πίστις | Ὦ γύναι は ὦ＋呼格の明瞭な構造。ὦ の存在は形式を示すが、「感情を込めた」といった語用論的含意を自動確定しない。 |
| `vocative.nominative_for_vocative` | JHN 20:28 | Ὁ κύριός μου καὶ ὁ θεός μου | Ὁ κύριός μου καὶ ὁ θεός μου は冠詞付き主格形が呼びかけとして用いられる例。nominative.vocative_nominative と同一概念で、カテゴリ間重複を解消すべき。 |
| `vocative.exclamatory` | ROM 11:33 | Ὦ βάθος πλούτου καὶ σοφίας | Ὦ βάθος は ὦ を伴う感嘆的呼格として分析可能。with_o と形式的に重複し、感嘆は別の語用論的注釈軸とする方がよい。 |
| `vocative.chain` | MAT 27:46 | Θεέ μου θεέ μου, ἱνατί με ἐγκατέλιπες | θεέ μου θεέ μου は呼格の反復。隣接する呼格の検出は可能だが、同一呼びかけ対象・反復の修辞的効果は文脈に依存する。 |

## 3. 横断的な問題

1. **呼びかけと語用論**：呼格形は直接呼びかけの形式的根拠だが、発話の感情や強調を形態から推定しない。
2. **ὦ 付き呼格と感嘆**：vocative.with_o と vocative.exclamatory は形式上同じ ὦ＋呼格を共有する。感嘆性は独立した語用論的注釈候補として扱う方がよい。
3. **主格転用**：JHN 20:28 の冠詞付き主格形による呼びかけは、nominative.vocative_nominative と同一の構文現象。二つのカテゴリに重複させない。
4. **呼格連鎖**：隣接する呼格の検出と、同一対象への反復・修辞効果の解釈を区別する。

## 4. 暫定処置

- retain_redefined: direct_address, with_o, chain
- merge: nominative_for_vocative, exclamatory

## 5. 結論

呼格の中心概念は、形態的呼格、主格形による呼びかけ、ὦ を伴う構文、反復構文として整理できる。感嘆性は別の語用論軸に置く方向が妥当。主格転用の二重登録を統合する必要がある。処置案は暫定。

No production code, syntax registry, or StudyPanel behavior was changed.
