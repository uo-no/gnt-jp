/**
 * reading-ln-curation.js — センス→Gloss 人手キュレーション層（Phase 5-C3A）
 *
 * ★ このファイルだけが人手編集の対象。自動生成データ
 *   （reading-ln-gloss-data.js）は編集禁止 — 再生成で消えるため。
 *
 * 役割: 自動生成の (lemmaId, sense) → gloss を上書き・追加する。
 *   - sense は不透明な内部センスキー（token.sense の先頭キーと同形。
 *     scripts/migrate-semantic-keys.cjs が付与。番号自体に意味はない）
 *   - 上書き: 自動生成の gloss をより適切な語義に差し替える
 *   - 追加:   自動生成に存在しない (lemmaId, sense) を新設する
 *   - 削除は禁止（マージ規則: final = auto ← curation 上書きのみ）
 *
 * 形式: 各エントリは gloss と reason を持つ。
 *   gloss:  最終辞書（reading-ln-final-data.js）へ出力される訳語
 *   reason: 採用理由（監査・レビュー専用。final には出力されない。
 *           数か月後に「なぜこの訳を採用したのか」を追跡するための記録）
 *
 * 記入例（実データは Phase 5-C3B のレビューで追加する）:
 *
 *   window.READING_SENSE_CURATION = Object.freeze({
 *       "grc:G3056": Object.freeze({
 *           "s<n>": Object.freeze({
 *               gloss: "話",
 *               mode: "replace",
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

window.READING_SENSE_CURATION = Object.freeze({

    // ══ λόγος（grc:G3056）現行固定訳「ことば」═══════════════════════
    // 主要センス（ことば）は正しいため触れない。
    'grc:G3056': Object.freeze({
        's6494': Object.freeze({
            gloss: '申し開き',
            mode: 'replace',
            reason: '固定訳「ことば」では λόγον ἀποδίδωμι（会計・釈明の慣用句）が読めない。' +
                '代表聖句: LUK 16:2（会計の申し開き）・' +
                'HEB 13:17（申し開きをする者として）・1PE 4:5。新改訳系の定訳「申し開き」を採用。',
        }),
        's1761': Object.freeze({
            gloss: '理由',
            mode: 'replace',
            reason: 'Abbott-Smith 候補にも「理由」あり。' +
                '代表聖句: ACT 10:29（τίνι λόγῳ どういう理由で）・ACT 18:14・1PE 3:15。' +
                '固定訳「ことば」ではこれらの疑問・釈明文脈が不明瞭になる。',
        }),
    }),

    // ══ πνεῦμα（grc:G4151）現行固定訳「霊」════════════════════════
    // 主要センス（神の霊・人の霊・汚れた霊 — 形容詞側が意味を担うため
    // 名詞は「霊」のまま）は触れない。
    'grc:G4151': Object.freeze({
        's953': Object.freeze({
            gloss: '風',
            mode: 'replace',
            reason: 'Abbott-Smith 候補にも「風」あり。' +
                '代表聖句: JHN 3:8（風は思いのままに吹く — 同節後半の πνεῦμα=霊 は別センス）・' +
                'HEB 1:7。固定訳「霊」では JHN 3:8 前半が読めない。',
        }),
        's4501': Object.freeze({
            gloss: '息',
            mode: 'assist',   // 5-C3C 再評価で降格: JAS 2:26 は主要訳が「霊」を維持（G4 全用例一致を満たさない）
            reason: '代表聖句: 2TH 2:8（口の息）・' +
                'REV 11:11（いのちの息）・JAS 2:26（息のない体は死んだもの）。' +
                'Abbott-Smith 語義（π. ζωῆς「いのちの息」）と対応。',
        }),
        's257': Object.freeze({
            gloss: '心',
            mode: 'replace',
            reason: '代表聖句: MAT 5:3（心の貧しい者 — 唯一の用例）。' +
                '新改訳・新共同訳とも「心」で一致しており解釈の新規判断を含まない。',
        }),
    }),

    // ══ κόσμος（grc:G2889）現行固定訳「世界」══════════════════════
    // 主要センス（人々の世・地・宇宙）は「世界」のままで可。
    'grc:G2889': Object.freeze({
        's6050': Object.freeze({
            gloss: '世',
            mode: 'replace',
            reason: 'Abbott-Smith 候補「世の人々」「神に逆らう者たち」に対応する用法。' +
                '代表聖句: 1CO 1:20（世の知恵）・1CO 1:21・1CO 1:27。' +
                '「世界の知恵」より「世の知恵」が定訳（57件）。',
        }),
        's194': Object.freeze({
            gloss: '飾り',
            mode: 'replace',
            reason: 'Abbott-Smith 候補「装飾」に対応。' +
                '代表聖句: 1PE 3:3（髪を編む外面の飾り — 唯一の用例）。' +
                '固定訳「世界」では文が成立しない。',
        }),
    }),

    // ══ σάρξ（grc:G4561）現行固定訳「肉」══════════════════════════
    // 主要センス（パウロ的「肉」・肉体）は神学的定訳のため触れない。
    'grc:G4561': Object.freeze({
        's2152': Object.freeze({
            gloss: '人',
            mode: 'replace',
            reason: 'πᾶσα σάρξ の慣用。' +
                '代表聖句: 1PE 1:24（人はみな草のよう）・1CO 1:29・ACT 2:17' +
                '（すべての人に霊を注ぐ）。3件とも πᾶσα σάρξ 型で「すべての肉」より' +
                '「すべての人」が自然（新改訳も同様）。',
        }),
    }),

    // ══ ἀγάπη（grc:G26）現行固定訳「愛」═══════════════════════════
    'grc:G26': Object.freeze({
        's1675': Object.freeze({
            gloss: '愛餐',
            mode: 'replace',
            reason: '代表聖句: JUD 1:12（あなたがたの愛餐 — 唯一の用例）。' +
                '固定訳「愛」では複数形の食事文脈が読めない。「愛餐」は定訳。',
        }),
    }),

    // ══ πίστις（grc:G4102）現行固定訳「信仰」══════════════════════
    // 主要センス群はいずれも日本語では「信仰」が自然なため触れない。
    'grc:G4102': Object.freeze({
        's3395': Object.freeze({
            gloss: '誠実',
            mode: 'replace',
            reason: 'Abbott-Smith 候補' +
                '「誠実さ」「忠実さ」に対応。代表聖句: GAL 5:22（御霊の実 — 新改訳「誠実」）・' +
                'MAT 23:23（正義とあわれみと誠実）・REV 2:19。',
        }),
        's2539': Object.freeze({
            gloss: '確証',
            mode: 'replace',
            reason: '代表聖句: ACT 17:31' +
                '（すべての人に確証を与えた — 唯一の用例。新改訳「確証」）。' +
                '固定訳「信仰」では「信仰を与えた」となり原意と逆転する。',
        }),
        's4749': Object.freeze({
            gloss: '誓い',
            mode: 'replace',
            reason: '代表聖句: 1TI 5:12' +
                '（最初の誓いを破った — 唯一の用例）。固定訳「信仰」では' +
                'ἀθετέω（破棄する）との組み合わせが不明瞭。',
        }),
    }),

    // ══ χάρις（grc:G5485）現行固定訳「恵み」═══════════════════════
    // 主要センスは「恵み」のまま。挨拶文（1CO 1:3 恵みと平安）と
    // 同じセンスに注釈された用法は混在のため見送り。
    'grc:G5485': Object.freeze({
        's3359': Object.freeze({
            gloss: '感謝',
            mode: 'replace',
            reason: 'χάρις τῷ θεῷ の慣用。' +
                '代表聖句: 1CO 15:57（神に感謝します）・1TI 1:12・1CO 10:30。' +
                '固定訳「恵み」では「神に恵み」となり文が成立しない。',
        }),
        's6810': Object.freeze({
            gloss: '感謝',
            mode: 'replace',
            reason: '代表聖句: HEB 12:28' +
                '（感謝しようではないか — 唯一の用例）。直前の「感謝」エントリと同じ理由。',
        }),
    }),

    // ══ δικαιοσύνη（grc:G1343）現行固定訳「義」════════════════════
    // 主要センス（義認文脈を含む）は神学的定訳「義」のため触れない。
    'grc:G1343': Object.freeze({
        's2386': Object.freeze({
            gloss: '善行',
            mode: 'replace',
            reason: '代表聖句: MAT 6:1（人に見せるための善行 — 唯一の用例）。' +
                '新改訳「善行」・新共同訳「善い行い」で一致しており解釈の新規判断を含まない。',
        }),
    }),

});

// Node（ビルド・監査）用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { READING_SENSE_CURATION: window.READING_SENSE_CURATION };
}
