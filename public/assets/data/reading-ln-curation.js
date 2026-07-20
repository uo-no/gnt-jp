/**
 * reading-ln-curation.js — LN→Gloss 人手キュレーション層（Phase 5-C3A）
 *
 * ★ このファイルだけが人手編集の対象。自動生成データ
 *   （reading-ln-gloss-data.js）は編集禁止 — 再生成で消えるため。
 *
 * 役割: 自動生成の (lemmaId, ln) → gloss を上書き・追加する。
 *   - 上書き: 自動生成の gloss をより適切な語義に差し替える
 *   - 追加:   自動生成に存在しない (lemmaId, ln) を新設する
 *   - 削除は禁止（マージ規則: final = auto ← curation 上書きのみ）
 *
 * 形式: 各エントリは gloss と reason を持つ。
 *   gloss:  最終辞書（reading-ln-final-data.js）へ出力される訳語
 *   reason: 採用理由（監査・レビュー専用。final には出力されない。
 *           数か月後に「なぜこの訳を採用したのか」を追跡するための記録）
 *
 * 記入例（実データは Phase 5-C3B のレビューで追加する）:
 *
 *   window.READING_LN_CURATION = Object.freeze({
 *       "grc:G3056": Object.freeze({
 *           "33.26": Object.freeze({
 *               gloss: "話",
 *               reason: "Abbott-Smith の speech に対応。NT 用例を確認済み"
 *           })
 *       }),
 *   });
 *
 * 反映: 編集後に npm run build:ln-final を実行して
 *       reading-ln-final-data.js を再生成する。
 * レビュー資料: scripts/output/re-phase5c2-top100.json（B/C 分類の抜粋）
 */

'use strict';

if (typeof window === 'undefined') { globalThis.window = globalThis; }

window.READING_LN_CURATION = Object.freeze({

    // ══ λόγος（grc:G3056）現行固定訳「ことば」═══════════════════════
    // 主要 ln 33.98（ことば）は正しいため触れない。
    'grc:G3056': Object.freeze({
        '57.228': Object.freeze({
            gloss: '申し開き',
            mode: 'replace',
            reason: '固定訳「ことば」では λόγον ἀποδίδωμι（会計・釈明の慣用句）が読めない。' +
                'LN 57.228 = 資産と負債の記録（account）。代表聖句: LUK 16:2（会計の申し開き）・' +
                'HEB 13:17（申し開きをする者として）・1PE 4:5。新改訳系の定訳「申し開き」を採用。',
        }),
        '89.18': Object.freeze({
            gloss: '理由',
            mode: 'replace',
            reason: 'LN 89.18 = 理由（reason）。Abbott-Smith 候補にも「理由」あり。' +
                '代表聖句: ACT 10:29（τίνι λόγῳ どういう理由で）・ACT 18:14・1PE 3:15。' +
                '固定訳「ことば」ではこれらの疑問・釈明文脈が不明瞭になる。',
        }),
    }),

    // ══ πνεῦμα（grc:G4151）現行固定訳「霊」════════════════════════
    // 主要 ln 12.18（神の霊）・26.9（人の霊）・12.39 系（汚れた霊 —
    // 形容詞側が意味を担うため名詞は「霊」のまま）は触れない。
    'grc:G4151': Object.freeze({
        '14.4': Object.freeze({
            gloss: '風',
            mode: 'replace',
            reason: 'LN 14.4 = 風（wind）。Abbott-Smith 候補にも「風」あり。' +
                '代表聖句: JHN 3:8（風は思いのままに吹く — 同節後半の πνεῦμα=霊 は別 ln）・' +
                'HEB 1:7。固定訳「霊」では JHN 3:8 前半が読めない。',
        }),
        '23.186': Object.freeze({
            gloss: '息',
            mode: 'assist',   // 5-C3C 再評価で降格: JAS 2:26 は主要訳が「霊」を維持（G4 全用例一致を満たさない）
            reason: 'LN 23.186 = 息（breath）。代表聖句: 2TH 2:8（口の息）・' +
                'REV 11:11（いのちの息）・JAS 2:26（息のない体は死んだもの）。' +
                'Abbott-Smith 語義（π. ζωῆς「いのちの息」）と対応。',
        }),
        '88.57': Object.freeze({
            gloss: '心',
            mode: 'replace',
            reason: 'LN 88.57（謙遜の領域）。代表聖句: MAT 5:3（心の貧しい者 — 唯一の用例）。' +
                '新改訳・新共同訳とも「心」で一致しており解釈の新規判断を含まない。',
        }),
    }),

    // ══ κόσμος（grc:G2889）現行固定訳「世界」══════════════════════
    // 主要 ln 9.23（人々の世）・1.39/1.1（地・宇宙）は「世界」のままで可。
    'grc:G2889': Object.freeze({
        '41.38': Object.freeze({
            gloss: '世',
            mode: 'replace',
            reason: 'LN 41.38 = 神に敵対する世の体制・価値観（world system）。' +
                'Abbott-Smith 候補「世の人々」「神に逆らう者たち」に対応する用法。' +
                '代表聖句: 1CO 1:20（世の知恵）・1CO 1:21・1CO 1:27。' +
                '「世界の知恵」より「世の知恵」が定訳（57件）。',
        }),
        '6.188': Object.freeze({
            gloss: '飾り',
            mode: 'replace',
            reason: 'LN 6.188 = 装飾（adornment）。Abbott-Smith 候補「装飾」に対応。' +
                '代表聖句: 1PE 3:3（髪を編む外面の飾り — 唯一の用例）。' +
                '固定訳「世界」では文が成立しない。',
        }),
    }),

    // ══ σάρξ（grc:G4561）現行固定訳「肉」══════════════════════════
    // 主要 ln 26.7（パウロ的「肉」）・8.4/8.63（肉体・肉）は神学的定訳のため触れない。
    'grc:G4561': Object.freeze({
        '9.11': Object.freeze({
            gloss: '人',
            mode: 'replace',
            reason: 'LN 9.11 = 人類（humanity。πᾶσα σάρξ の慣用）。' +
                '代表聖句: 1PE 1:24（人はみな草のよう）・1CO 1:29・ACT 2:17' +
                '（すべての人に霊を注ぐ）。3件とも πᾶσα σάρξ 型で「すべての肉」より' +
                '「すべての人」が自然（新改訳も同様）。',
        }),
    }),

    // ══ ἀγάπη（grc:G26）現行固定訳「愛」═══════════════════════════
    'grc:G26': Object.freeze({
        '23.28': Object.freeze({
            gloss: '愛餐',
            mode: 'replace',
            reason: 'LN 23.28 = 交わりの食事（fellowship meal）。' +
                '代表聖句: JUD 1:12（あなたがたの愛餐 — 唯一の用例）。' +
                '固定訳「愛」では複数形の食事文脈が読めない。「愛餐」は定訳。',
        }),
    }),

    // ══ πίστις（grc:G4102）現行固定訳「信仰」══════════════════════
    // 主要 ln 31.102 と 31.85/31.104 はいずれも日本語では「信仰」が自然なため触れない。
    'grc:G4102': Object.freeze({
        '31.88': Object.freeze({
            gloss: '誠実',
            mode: 'replace',
            reason: 'LN 31.88 = 誠実さ・信実（faithfulness）。Abbott-Smith 候補' +
                '「誠実さ」「忠実さ」に対応。代表聖句: GAL 5:22（御霊の実 — 新改訳「誠実」）・' +
                'MAT 23:23（正義とあわれみと誠実）・REV 2:19。',
        }),
        '31.43': Object.freeze({
            gloss: '確証',
            mode: 'replace',
            reason: 'LN 31.43 = 信じる根拠（proof）。代表聖句: ACT 17:31' +
                '（すべての人に確証を与えた — 唯一の用例。新改訳「確証」）。' +
                '固定訳「信仰」では「信仰を与えた」となり原意と逆転する。',
        }),
        '33.289': Object.freeze({
            gloss: '誓い',
            mode: 'replace',
            reason: 'LN 33.289 = 誓約（pledge）。代表聖句: 1TI 5:12' +
                '（最初の誓いを破った — 唯一の用例）。固定訳「信仰」では' +
                'ἀθετέω（破棄する）との組み合わせが不明瞭。',
        }),
    }),

    // ══ χάρις（grc:G5485）現行固定訳「恵み」═══════════════════════
    // 主要 ln 88.66・25.89 は「恵み」のまま。57.103（贈り物）は挨拶文
    // （1CO 1:3 恵みと平安）が同じ ln に注釈されており混在のため見送り。
    'grc:G5485': Object.freeze({
        '33.35': Object.freeze({
            gloss: '感謝',
            mode: 'replace',
            reason: 'LN 33.35 = 感謝（thanks。χάρις τῷ θεῷ の慣用）。' +
                '代表聖句: 1CO 15:57（神に感謝します）・1TI 1:12・1CO 10:30。' +
                '固定訳「恵み」では「神に恵み」となり文が成立しない。',
        }),
        '33.350': Object.freeze({
            gloss: '感謝',
            mode: 'replace',
            reason: 'LN 33.350 = 感謝を示すこと。代表聖句: HEB 12:28' +
                '（感謝しようではないか — 唯一の用例）。33.35 と同じ理由。',
        }),
    }),

    // ══ δικαιοσύνη（grc:G1343）現行固定訳「義」════════════════════
    // 主要 ln 88.13・34.46（義認文脈）は神学的定訳「義」のため触れない。
    'grc:G1343': Object.freeze({
        '53.4': Object.freeze({
            gloss: '善行',
            mode: 'replace',
            reason: 'LN 53.4 = 宗教的善行（religious observance）。' +
                '代表聖句: MAT 6:1（人に見せるための善行 — 唯一の用例）。' +
                '新改訳「善行」・新共同訳「善い行い」で一致しており解釈の新規判断を含まない。',
        }),
    }),

});

// Node（ビルド・監査）用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { READING_LN_CURATION: window.READING_LN_CURATION };
}
