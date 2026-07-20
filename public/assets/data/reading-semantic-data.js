/**
 * reading-semantic-data.js — Semantic Layer データ（Phase 5-A）
 *
 * Phase 5-A: 慣用句・固定表現テーブル。
 *   - 完全一致のみ（lemma 連鎖 + 形態制約）。推論は行わない
 *   - seq: 連続トークンとの照合条件の配列
 *       l:      NFC 正規化した lemma（照合側も NFC 正規化して比較する。
 *               lemmaId を使わないのは οὗτος が形態別に 13 の lemmaId に
 *               分裂しているため。NFC 正規化で Unicode 表記ゆれも吸収）
 *       case / gender / number / mood / tense / person: 任意の形態制約
 *   - head: 固定訳 ja を表示する構成語の位置（0 起点）。
 *           head 以外の構成語は fallback のまま（既存表示を維持）
 *   - notNextGenNoun: パターン直後が属格名詞なら不成立
 *       （διὰ παντός と「διὰ πάσης＋属格名詞」の区別）
 *
 * 固定訳の出典: 制約と件数は 2026-07-16 の NT 全巻監査
 * （docs/reading-semantic.md）で確定。
 *
 * Phase 5-B（前置詞×目的語 domain）/ Phase 5-C（(lemmaId, ln)→gloss）は
 * このファイルに prepDomain / lnGloss として追加する（追加方式・予約）。
 *
 * 読み込み順序: 本ファイル → core/reading-engine.js（script タグ同期実行）。
 */

'use strict';

(function (root) {
    const data = {
        version: 2,
        generated: '2026-07-17',
        // ── Phase 5-A: 慣用句・固定表現（完全一致のみ） ──────────────
        idioms: [
            {
                name: 'διὰ τοῦτο',
                seq: [
                    { l: 'διά' },
                    { l: 'οὗτος', case: 'accusative', gender: 'neuter', number: 'singular' },
                ],
                head: 1,
                ja: 'このため',
            },
            {
                name: 'εἰς τὸν αἰῶνα',
                seq: [
                    { l: 'εἰς' },
                    { l: 'ὁ' },
                    { l: 'αἰών', case: 'accusative' },
                ],
                head: 2,
                ja: '永遠に',
            },
            {
                name: 'μὴ γένοιτο',
                seq: [
                    { l: 'μή' },
                    { l: 'γίνομαι', mood: 'optative' },
                ],
                head: 1,
                ja: '断じてそうではない',
            },
            {
                name: 'καὶ ἐγένετο',
                seq: [
                    { l: 'καί' },
                    { l: 'γίνομαι', mood: 'indicative', tense: 'aorist', person: '3', number: 'singular' },
                ],
                head: 1,
                ja: 'こうして…が起こった',
            },
            {
                name: 'ἀμὴν λέγω',
                seq: [
                    { l: 'ἀμήν' },
                    { l: 'λέγω', mood: 'indicative', tense: 'present', person: '1' },
                ],
                head: 1,
                ja: 'まことに言います',
            },
            {
                name: 'διὰ παντός',
                seq: [
                    { l: 'διά' },
                    { l: 'πᾶς', case: 'genitive', gender: 'masculine', number: 'singular' },
                ],
                head: 1,
                ja: '絶えず',
                notNextGenNoun: true,
            },
            {
                name: 'κατʼ ἰδίαν',
                seq: [
                    { l: 'κατά' },
                    { l: 'ἴδιος', case: 'accusative', gender: 'feminine' },
                ],
                head: 1,
                ja: 'ひそかに',
            },
            {
                name: 'ἐπὶ τὸ αὐτό',
                seq: [
                    { l: 'ἐπί' },
                    { l: 'ὁ', case: 'accusative' },
                    { l: 'αὐτός', case: 'accusative', gender: 'neuter' },
                ],
                head: 2,
                ja: '一つ所に',
            },
        ],
        // ── Phase 5-B: prepDomain（前置詞×格×目的語 domain → 助詞） ────
        // 目的語トークン自身の domain 注釈（Louw-Nida ドメイン番号）で
        // 意味を固定できる組み合わせのみ。推論は行わない。
        //   prep:    支配前置詞の lemma（NFC 正規化で照合）
        //   case:    目的語の格
        //   domain:  目的語の LN ドメイン番号（末尾3桁を除いた数値）
        //   ja:      base に後置する助詞列
        //   exclude: 適用しない目的語 lemma（NFC）。監査で特定した
        //            用法例外（πρὸς αἷμα「血と格闘」等）の保護
        //
        // 不採用の記録（2026-07-17 監査）:
        //   - ἐπί 全般: 場所・時間・根拠・対象の多義（設計正典どおり）
        //   - ἐν+与格+場所(178件): 目的語の37%が「天」で「天の中で」が破損。
        //     morph fallback「に」が既に許容 → 一律改善できる助詞がない
        //   - ἐν+与格+人: 2-A ホワイトリスト「にあって」との競合と
        //     残余の lemma 検証が未了 → 5-B 拡張候補として保留
        prepDomain: [
            {
                name: 'πρός+対格+固有名 → のもとに',
                prep: 'πρός', case: 'accusative', domain: 93,
                ja: 'のもとに',
                exclude: ['Βελιάρ'],   // 2CO 6:15 συμφώνησις πρὸς Βελιάρ（〜との調和）
            },
            {
                name: 'πρός+対格+人 → のもとに',
                prep: 'πρός', case: 'accusative', domain: 9,
                ja: 'のもとに',
                exclude: ['αἷμα'],     // EPH 6:12 πάλη πρὸς αἷμα（〜との格闘）
            },
            {
                name: 'περί+対格+身体 → の周りに',
                prep: 'περί', case: 'accusative', domain: 8,
                ja: 'の周りに',
            },
        ],
        // ── Phase 5-C 予約: lnGloss（(lemmaId, ln) → gloss 対応表） ──
    };

    if (typeof window !== 'undefined') {
        window.App = window.App || {};
        window.App.readingSemanticData = data;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { readingSemanticData: data };
    }
})(this);
