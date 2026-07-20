/**
 * presentation-policy.js — Presentation Policy（Stage C・第 1 規則 P1）
 *
 * 責務: Reading Engine が生成した Reading Japanese を**変更せずに**、
 *        表示方法だけを整形する。Flow と StudyPanel が共有する。
 *        （設計正典: docs/presentation-policy.md）
 *
 * P1: PP 統合の可視化（括弧化）
 *   前置詞の意味が head へ統合されている場合、表示を base（統合助詞）にする。
 *     〜へ 福音へ   → 〜へ 福音（へ）
 *     〜から 世から → 〜から 世（から）
 *   適用条件（すべて決定的・推論なし）:
 *     1. resolve source が syntax / semantic
 *     2. トークンが PP の head（後方 3 語以内・介在は冠詞/形容詞のみに前置詞）
 *     3. 出力が既知の前置詞由来サフィックスで終わる（最長一致）
 *   非該当は入力をそのまま返す（慣用句固定訳・形態格助詞・未統合 PP）。
 *
 * 内部値（jaWord・resolve cache）は生の Engine 出力のまま。
 * 本モジュールは表示面のレンダリング時にのみ呼ばれる。
 * Failure Mode: 例外・不備は入力をそのまま返す。
 *
 * ══════════════════════════════════════════════════════════════════
 * Stage C P1 [FROZEN 2026-07-17]
 *   基準値: NT 括弧化 4,244 件 / 非該当（慣用句固定訳等）164 件は不変 /
 *           chip⇔StudyPanel（整形後）一致率 100%
 *   適用面: Flow チップ（3 箇所）・StudyPanel ヘッダ（jaWordDisplay）・
 *           ドロワー。Phrase Reading / Observation は現時点で対象外
 *           （将来の一元管理は本モジュールの参照追加で行う）。
 *   変更時は scripts/re-stageB-regression.cjs へ回帰ケース追加 →
 *   npm run test:re-stageB 全 PASS を確認すること。
 *   SSOT の対: reading-policy.json presentation.pp_integrated_head。
 * ══════════════════════════════════════════════════════════════════
 */

'use strict';

const PRESENTATION_POLICY_VERSION = '1.0.0';

// 規則モード。SSOT の対: assets/data/reading-policy.json の
// presentation.pp_integrated_head と同値であること（食い違いは監査が検出）。
const _PP_INTEGRATED_HEAD_MODE = 'parenthesize';

// 前置詞由来サフィックス（Engine 凍結テーブルの出力の鏡像・最長一致順）。
// Engine のテーブル拡張時はここに追随する（docs/presentation-policy.md §1）。
const _PREP_SUFFIXES = [
    'にあって', 'のもとに', 'の周りに', 'を通して', 'によって',
    'と共に', 'の後で', 'の前に', 'について', 'から', 'へ',
];

/** トークンが PP の head か（Engine の _resolvePrepDomain と同一の局所走査） */
function _isPPHead(words, idx) {
    if (!Array.isArray(words)) return false;
    for (let j = idx - 1, steps = 0; j >= 0 && steps < 3; j--, steps++) {
        const c = (words[j]?.class || '').toLowerCase();
        if (c === 'det' || c === 'adj') continue;
        return c === 'prep';
    }
    return false;
}

class PresentationPolicy {
    /**
     * 表示用整形。P1 の条件を満たさなければ入力をそのまま返す。
     *
     * @param {string} japanese  Engine の Reading Japanese（変更しない）
     * @param {string} source    ResolveResult.source（'syntax' | 'semantic' | …）
     * @param {Object[]} words   節の生トークン配列
     * @param {number} idx       対象トークンのインデックス
     * @returns {string}         表示文字列（例: 福音（へ））
     */
    static formatDisplay(japanese, source, words, idx) {
        try {
            if (_PP_INTEGRATED_HEAD_MODE !== 'parenthesize') return japanese;
            if (typeof japanese !== 'string' || !japanese) return japanese;
            if (source !== 'syntax' && source !== 'semantic') return japanese;
            if (!_isPPHead(words, idx)) return japanese;
            const sfx = _PREP_SUFFIXES.find(s => japanese.endsWith(s));
            if (!sfx) return japanese;
            const base = japanese.slice(0, -sfx.length);
            if (!base) return japanese;
            return `${base}（${sfx}）`;
        } catch (_) {
            return japanese;
        }
    }
}

// ── グローバルエクスポート ─────────────────────────────────────────
if (typeof window !== 'undefined') {
    window.App = window.App || {};
    window.App.PresentationPolicy = PresentationPolicy;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PresentationPolicy, PRESENTATION_POLICY_VERSION };
}
