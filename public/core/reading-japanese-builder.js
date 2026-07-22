/**
 * reading-japanese-builder.js — Reading Japanese Builder（Stage M-3・Phase A 骨格）
 *
 * 責務: Morph / Syntax / Semantic が提供する決定的情報を **章節（verse）単位で統合**し、
 *        各章節の Reading Japanese を確定する最終統合層。
 *        （設計正典: docs/reading-japanese-builder-design.md / -implementation-plan.md /
 *         reading-japanese-improvement-framework.md）
 *
 * Phase A（本実装）: **最小骨格のみ**。
 *   - token・Morph 語形・relativeSyntax・demonstrativeSyntax・semanticInfo を
 *     verse 単位で **読み取り・集約する**構造を用意する。
 *   - **japanese 出力は現状と完全一致（バイト等価）**。reading = 現在の resolve 出力
 *     （null は素の token.japanese へフォールバック = 既存表示と同一）。
 *   - **改善ロジックは実装しない**（Phase B 以降）。推論・翻訳・語順変更をしない。
 *
 * 非破壊: reading-engine を変更しない（resolve を呼び出して結果を読むのみ）。
 *   Builder は情報統合の器であり、Phase A では出力を一切変えない。
 */

'use strict';

const READING_JAPANESE_BUILDER_VERSION = '0.1.0-phaseA-skeleton';

class ReadingJapaneseBuilder {
    /**
     * @param {Object} engine  ReadingEngine（resolve(token, context?) を持つ）
     */
    constructor(engine) {
        this._engine = (engine && typeof engine.resolve === 'function') ? engine : null;
        // M-8d: referent を決定的に解決するための verseId→token 索引（推論でなく lookup）。
        // 未設定（null）のとき Syntax Adoption は行わない（現状維持＝安全 fallback）。
        this._byVid = null;
    }

    /**
     * M-8d: Syntax Adoption 用の corpus 索引を設定する（referent の決定的解決）。
     * demonstrativeSyntax.referent（別トークンの verseId）→ 参照先 token を引くための索引。
     * **これは推論ではなく注釈の lookup**（参照先 class=verb を決定的に確認するためだけに使う）。
     * 未設定なら Syntax Adoption は発火しない（現状維持）。
     * @param {Array} tokens  コーパス全トークン（verseId を持つ）
     */
    setCorpus(tokens) {
        if (!Array.isArray(tokens)) { this._byVid = null; return; }
        const idx = new Map();
        for (const t of tokens) {
            if (t && typeof t.verseId === 'string' && t.verseId) idx.set(t.verseId, t);
        }
        this._byVid = idx;
    }

    /**
     * 1 トークンの Builder 入力を集約する（Phase A: 読み取りのみ）。
     * reading は現状の表示読み（resolve.japanese、null は token.japanese）＝バイト等価。
     * @returns {{ token, reading, morph, relativeSyntax, demonstrativeSyntax, semanticInfo }}
     */
    _collectToken(token, context) {
        const raw = (token && typeof token.japanese === 'string') ? token.japanese : '';
        let res = null;
        if (this._engine && token) {
            try { res = this._engine.resolve(token, context); } catch (_) { res = null; }
        }
        // Phase A: reading は現状と完全一致（Tier0=resolve.japanese / Tier1=素の japanese）
        const reading = (res && typeof res.japanese === 'string') ? res.japanese : raw;
        // M-8b: Morph Adoption 記録（判定なし・reading は不変=バイト等価）。
        // Morph が決定した語形（reading の語幹）が Data 代表語（raw）と異なる場合、
        // Builder は Morph fact を採用したものとして記録する（Editorial Review 連携用）。
        // 語幹比較は末尾の格助詞を 1 つ除いて行う（もの/自身/たち は語の一部・除かない）。
        const morphAdopted = (res && res.source === ReadingJapaneseBuilder.MORPH
            && !!raw && ReadingJapaneseBuilder._stem(reading) !== raw)
            ? { representative: raw, adopted: ReadingJapaneseBuilder._stem(reading) }
            : null;
        // M-8d: Syntax Adoption（demonstrativeSyntax pronominal neuter のみ・判定なし）。
        // 決定済み Syntax fact のみ採用（M-8c 境界）: 参照先=verb（決定的 lookup）かつ
        // gender=neuter の指示詞を「代名詞的（pronominal）」として これ/これら・あれ/あれら に採用する。
        //   - Semantic 先行（source=semantic の すなわち 等）は採用しない（resolve 連鎖を尊重）。
        //   - masc/fem（この人/この方=語選択の余地）は採用しない（M-8c）。
        //   - τοιοῦτος（質・非デイクシス）は決定的レンダリング不能のため採用しない（現状維持）。
        //   - referent 未解決・corpus 未設定・未判定は採用しない（現状維持＝推論禁止）。
        const syntaxAdopted = this._adoptPronominalNeuter(token, res, reading);
        return {
            token,
            reading: syntaxAdopted ? syntaxAdopted.adopted : reading,
            morphAdopted,
            syntaxAdopted,
            morph: res ? { japanese: res.japanese, source: res.source } : null,
            relativeSyntax: (res && res.relativeSyntax) ? res.relativeSyntax : null,
            demonstrativeSyntax: (res && res.demonstrativeSyntax) ? res.demonstrativeSyntax : null,
            semanticInfo: (res && res.semanticInfo) ? res.semanticInfo : null,
        };
    }

    /**
     * M-8d: 指示詞の pronominal neuter のみを決定的に採用する（判定・推論なし）。
     * demonstrativeSyntax は engine.getDemonstrativeSyntax(token) を直接読む
     * （resolve はルール不発時 null を返し demonstrativeSyntax を添付しないため、res には依存しない）。
     * 発火条件（すべて決定的）:
     *   - getDemonstrativeSyntax あり（οὗτος/ἐκεῖνος・referent 注釈あり）
     *   - token.gender === 'neuter'（masc/fem は不採用＝M-8c）
     *   - corpus 索引で referent を引き、参照先 class === 'verb'（決定的 lookup＝pronominal）
     *   - 現 reading（＝Data 代表語）が **標準の連体指示形**（この/これらの/あの/あれらの）に一致
     *     （すなわち 等の固定慣用代表語・τοιοῦτος の「このような」は一致せず＝現状維持で不採用）
     * レンダリング: この→これ / これらの→これら / あの→あれ / あれらの→あれら（連体→代名詞）。
     *   格助詞は付さない（現状の指示詞と同一慣習・格助詞付与は particle 層/別 Stage の責務）。
     * @returns {{ representative: string, adopted: string, reason: string } | null}
     */
    _adoptPronominalNeuter(token, res, reading) {
        if (!this._byVid || !this._engine || !token) return null;
        if (token.gender !== 'neuter') return null; // masc/fem は語選択の余地＝不採用
        if (res && res.source === ReadingJapaneseBuilder.SEMANTIC) return null; // Semantic 先行を尊重
        let ds = null;
        try { ds = this._engine.getDemonstrativeSyntax(token); } catch (_) { ds = null; }
        if (!ds || !ds.referent) return null;
        const forms = ReadingJapaneseBuilder._DEIXIS_ADNOMINAL_TO_PRONOMINAL[ds.lemma];
        if (!forms) return null; // τοιοῦτος 等・対象外（現状維持）
        const map = forms[token.number] || null;
        if (!map || map.from !== reading) return null; // 標準連体形でなければ触れない（すなわち等を保護）
        const target = this._byVid.get(ds.referent);
        if (!target || target.class !== 'verb') return null; // 参照先が verb でない＝不採用
        if (map.to === reading) return null; // 変化なし
        return { representative: reading, adopted: map.to, reason: 'pronominal-neuter-verb-referent' };
    }

    /**
     * reading から末尾の格助詞を 1 つだけ除いた語幹を返す（Morph 採用判定用）。
     * 「もの/自身/たち」等は語の一部なので除かない。推論・変更はしない（読み取り比較のみ）。
     */
    static _stem(reading) {
        if (typeof reading !== 'string' || !reading) return reading;
        // M-15 修正: 「もの」の の は語の一部（格助詞でない）ため除かない
        // （関係詞 neuter 〜するもの を 〜するも に壊さない）。
        if (reading.endsWith('もの')) return reading;
        // 末尾が格助詞（の/に/を/は/が/よ）のみ除く
        const last = reading.slice(-1);
        if (!ReadingJapaneseBuilder._CASE_PARTICLES.has(last)) return reading;
        const stem = reading.slice(0, -1);
        return stem || reading;
    }

    /**
     * 章節（verse）単位で全トークンの Builder 入力を集約する（Phase A: 骨格）。
     * **出力の reading は現状と完全一致（バイト等価）**。改善はしない。
     * @param {Array} tokens   章節の全トークン（ギリシャ語順）
     * @param {Object} [context]  ResolveContext（任意）
     * @returns {{ tokens: Array, readings: string[] }}
     *   tokens: 各トークンの集約情報 / readings: reading 配列（現状と一致）
     */
    buildVerse(tokens, context) {
        if (!Array.isArray(tokens)) return { tokens: [], readings: [], morphAdoptedCount: 0 };
        const collected = tokens.map((t) => this._collectToken(t, context));
        return {
            tokens: collected,
            readings: collected.map((c) => c.reading),
            // M-8b: この verse で Morph 採用（reading≠代表語）が起きたトークン数（Editorial Review 連携用）
            morphAdoptedCount: collected.filter((c) => c.morphAdopted).length,
            // M-8d: この verse で Syntax 採用（pronominal neuter）が起きたトークン数（Editorial Review 連携用）
            syntaxAdoptedCount: collected.filter((c) => c.syntaxAdopted).length,
        };
    }
}

// ── 静的定数（Morph 採用記録・判定はしない） ──────────────────────
ReadingJapaneseBuilder.MORPH = 'morph';
ReadingJapaneseBuilder.SEMANTIC = 'semantic';
ReadingJapaneseBuilder._CASE_PARTICLES = new Set(['の', 'に', 'を', 'は', 'が', 'よ']);
// M-8d: 連体指示形→代名詞指示形の決定的マップ（lemma+number 決定・discourse 距離ではない）。
//   from（Data 代表語の標準連体形）に厳密一致するときのみ to（代名詞形）へ採用する。
//   これにより すなわち（固定慣用代表語）や τοιοῦτス「このような」は一致せず現状維持となる。
//   οὗτος→これ/これら（近）/ ἐκεῖνος→あれ/あれら（遠）。τοιοῦτος（質）は対象外。
ReadingJapaneseBuilder._DEIXIS_ADNOMINAL_TO_PRONOMINAL = {
    'οὗτος':   { singular: { from: 'この', to: 'これ' },   plural: { from: 'これらの', to: 'これら' } },
    'ἐκεῖνος': { singular: { from: 'あの', to: 'あれ' },   plural: { from: 'あれらの', to: 'あれら' } },
};

// ── グローバルエクスポート ─────────────────────────────────────────
if (typeof window !== 'undefined') {
    window.App = window.App || {};
    window.App.ReadingJapaneseBuilder = ReadingJapaneseBuilder;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ReadingJapaneseBuilder, READING_JAPANESE_BUILDER_VERSION };
}
