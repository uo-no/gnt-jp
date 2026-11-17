/**
 * translit.js — ギリシャ語の音訳（ローマ字転写）。#80
 *
 * 目的: 読者が語を「音として」認識する手がかり（読書の補助）。翻訳・語義選択・推論は行わない（L-0）。
 * 性質: ギリシャ語文字列 → ラテン文字列の決定的な純関数。手作りデータなし。DOM 非依存。
 * 方式: 簡易 SBL 一般方式。
 *   η→ē ω→ō（マクロン） υ→y（二重母音 αυ/ευ/ου/υι 内では u / i） θ→th φ→ph χ→ch ψ→ps
 *   γ+γ/κ/ξ/χ の γ→n  粗気息→語頭 h  ῥ→rh・語中 ρρ→rrh  アクセント・弱気息・下記/添記イオタは出力しない
 *   すべて小文字（固有名詞も大文字にしない）
 * 公開: window.Translit.of(str)
 */
(function (root) {
    'use strict';

    var BASE = {
        'α': 'a', 'β': 'b', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'ē', 'θ': 'th',
        'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x', 'ο': 'o', 'π': 'p',
        'ρ': 'r', 'σ': 's', 'ς': 's', 'τ': 't', 'υ': 'y', 'φ': 'ph', 'χ': 'ch', 'ψ': 'ps', 'ω': 'ō'
    };
    var VOWELS = 'αεηιουω';

    /* 1語を処理する。 */
    function word(w) {
        /* NFD に分解 → 文字ごとに基底字＋結合記号の列にする */
        var d = String(w).normalize('NFD').toLowerCase();
        var units = [];   // { c: 基底字, rough: bool, dia: bool }
        for (var i = 0; i < d.length; i++) {
            var ch = d[i], code = d.charCodeAt(i);
            if (code >= 0x0300 && code <= 0x036F) {
                var u = units[units.length - 1];
                if (!u) continue;
                if (code === 0x0314) u.rough = true;        // 粗気息
                else if (code === 0x0308) u.dia = true;      // ディアレシス（二重母音にしない）
                /* 0x0313 弱気息 / アクセント / 0x0345 下記イオタ は捨てる */
                continue;
            }
            if (BASE[ch] !== undefined) units.push({ c: ch, rough: false, dia: false });
        }
        var out = '';
        var initialRough = false;
        var n = units.length;
        for (var k = 0; k < n; k++) {
            var cur = units[k], c = cur.c;
            var nxt = units[k + 1], prv = units[k - 1];
            var piece;
            if (c === 'γ' && nxt && 'γκξχ'.indexOf(nxt.c) >= 0) {
                piece = 'n';
            } else if (c === 'ρ' && cur.rough) {
                piece = (k === 0) ? 'rh' : 'rh';
            } else if (c === 'ρ' && prv && prv.c === 'ρ' && k > 0) {
                piece = 'rh';           // 語中 ρρ → rrh（前の ρ は r、後ろが rh）
            } else if (c === 'υ' && prv && 'αεου'.indexOf(prv.c) >= 0 && !cur.dia && VOWELS.indexOf(prv.c) >= 0 &&
                       !(prv.c === 'υ')) {
                /* αυ ευ ου は u（ηυ・ωυ は二重母音扱いしない）。υι の υ は y のまま下で ι を i に */
                piece = (prv.c === 'α' || prv.c === 'ε' || prv.c === 'ο') ? 'u' : 'y';
            } else if (c === 'ι' && prv && prv.c === 'υ' && !cur.dia) {
                piece = 'i';
            } else {
                piece = BASE[c];
            }
            /* 母音の粗気息（語頭のみ h を前置）。ρ は上で rh 処理済み。 */
            if (cur.rough && c !== 'ρ' && VOWELS.indexOf(c) >= 0) {
                if (k === 0) initialRough = true;
                else if (prv && VOWELS.indexOf(prv.c) >= 0 && k === 1) initialRough = true; // 二重母音の第2字上の気息 (οἱ 等)
            }
            out += piece;
        }
        if (initialRough) out = 'h' + out;
        /* ρρ: 前の ρ は 'r'、後ろは 'rh' → 結果 'rrh' となる */
        return out;
    }

    /* ῥ（語頭）は 'rh'、ρ 単独の粗気息は rh。上記で処理済み。 */

    function of(str) {
        if (str == null) return '';
        var s = String(str);
        if (!s) return '';
        /* 空白・句読点は保持し、ギリシャ語の連続のみ変換 */
        return s.replace(/[Ͱ-Ͽἀ-῿̀-ͯ]+/g, function (m) { return word(m); });
    }

    root.Translit = { of: of };
})(typeof window !== 'undefined' ? window : globalThis);
