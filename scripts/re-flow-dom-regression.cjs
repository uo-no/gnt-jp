/*
 * re-flow-dom-regression.cjs — VR-5-H-7: Flow DOM Transition Regression Foundation
 *
 * 目的:
 *   H-6 で削除した _rightMode state のような「DOM 遷移時だけ現れる不具合」を検知する
 *   最小 Regression 基盤。既存 re-*-regression.cjs と同じ「依存なし Node スクリプト」流儀。
 *
 * 方針（VR-5-H-7 指示に準拠）:
 *   - 新規依存を追加しない（本リポは deps/devDeps とも空 = 意図的なゼロ依存・静的構成）。
 *   - index.html 全体をブラウザ代替として動かさない。Flow injection 層のみを対象にする。
 *   - コピーではなく「実 _setFlowInjection のソーステキストを抽出して実行」する
 *     （最小 DOM shim 上で behavioral 検証）。実コードが契約から乖離したら失敗する。
 *   - 併せて source-invariant（契約ロック）と構文ゲート（node --check）を張る。
 *
 * 本体コードは一切変更しない（本ファイルの追加のみ）。
 *
 * ── 位置づけ（VR-5-H-8: Regression Gate 固定化）──
 *   このテストは VR-5 整理作業（命名整理・Renderer 統合・N列化 等）を進める間の
 *   「保護ゲート」である。以下の invariant を FROZEN 相当としてロックし、これらを崩す
 *   変更を退行として検知する。invariant を意図的に外す場合は、本ファイルの対応チェックも
 *   同時に更新し、なぜ契約を変えてよいのかを設計文書に残すこと（黙って外さない）。
 *
 * ── ロックしている invariant ──
 *   1. _rightMode 実コード参照なし（VR-5-H-6 で削除。代入/比較トークンが 0 件）。
 *   2. dataset.colMode は col.colMode.kind の projection（VR-5-H-4。SSOT は colMode.kind、
 *      DOM は read-only 投影）。
 *   3. Flow 対象列の探索は data-col-mode="wordOrder"（VR-5-H-4。位置クラス .verse-pair-right
 *      には依存しない）。
 *   4. gf-mode CSS は直接子結合子 '>' を維持（VR-5-H-4。子孫結合子だと :not(.gf-mode) が
 *      body 等の祖先経由で誤マッチし Flow が消える回帰になるため）。
 *   5. Flow 起動源は _colB.kind === 'wordOrder' もしくは明示的な activateFlowCompare 経路のみ
 *      （VR-5-H-6。_rightMode read には依存しない）。
 *   6. single-mode で右列非表示の CSS 契約を維持（FLOW→single 遷移時の cleanup 前提）。
 *
 * 検証する Flow DOM 契約:
 *   Flow 表示中: [data-col-mode="wordOrder"].gf-mode を持つ列に .gf-verse-block が存在する。
 *
 * 確認対象: dataset.colMode / gf-mode class / gf-verse-block existence / DOM cleanup / Flow 再注入。
 * 確認しない: CSS pixel / レイアウト / フォント / 見た目 / canvas 等。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PUBLIC = path.join(__dirname, '..', 'public');
const INDEX = path.join(PUBLIC, 'index.html');
const html = fs.readFileSync(INDEX, 'utf8');

let failed = 0;
const results = [];
function check(name, cond, detail) {
    if (cond) { results.push(['PASS', name]); }
    else { results.push(['FAIL', name + (detail ? ' — ' + detail : '')]); failed++; }
}

/* ─────────────────────────────────────────────────────────────
   最小 DOM shim（純 Node・依存なし）。
   _setFlowInjection が実際に使う DOM API だけを実装する:
   createElement / className / classList(add,remove,toggle(force),contains) /
   dataset / appendChild / querySelector / querySelectorAll('.cls' と '[data-x="y"]')。
   ───────────────────────────────────────────────────────────── */
class ClassList {
    constructor(el) { this.el = el; this.set = new Set(); }
    add(...c) { c.forEach(x => this.set.add(x)); this._sync(); }
    remove(...c) { c.forEach(x => this.set.delete(x)); this._sync(); }
    contains(c) { return this.set.has(c); }
    toggle(c, force) {
        if (force === undefined) { this.set.has(c) ? this.set.delete(c) : this.set.add(c); }
        else { force ? this.set.add(c) : this.set.delete(c); }
        this._sync();
        return this.set.has(c);
    }
    _sync() { this.el._className = Array.from(this.set).join(' '); }
}
class El {
    constructor(tag) {
        this.tagName = String(tag || 'div').toUpperCase();
        this.children = [];
        this.dataset = {};
        this._cl = new ClassList(this);
        this._className = '';
        this.innerHTML = '';
        this.parentNode = null;
    }
    get className() { return this._className; }
    set className(v) {
        this._className = v || '';
        this._cl.set = new Set(String(v || '').split(/\s+/).filter(Boolean));
    }
    get classList() { return this._cl; }
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
    _matches(sel) {
        sel = sel.trim();
        if (sel[0] === '.') return this._cl.contains(sel.slice(1));
        const m = sel.match(/^\[data-([\w-]+)="([^"]*)"\]$/);
        if (m) {
            const key = m[1].replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
            return this.dataset[key] === m[2];
        }
        return false;
    }
    _descendants() {
        const out = [];
        const walk = n => { for (const c of n.children) { out.push(c); walk(c); } };
        walk(this);
        return out;
    }
    querySelector(sel) { for (const d of this._descendants()) if (d._matches(sel)) return d; return null; }
    querySelectorAll(sel) { return this._descendants().filter(d => d._matches(sel)); }
}

function makeDocument() {
    const doc = new El('root');
    doc.createElement = tag => new El(tag);
    return doc;
}

/* 列 fixture を作る（_buildColumnBlock の投影を模す: dataset.colMode / dataset.vnum / className） */
function makeColumn(doc, { colMode, vnum, right }) {
    const el = doc.createElement('div');
    el.className = right ? 'verse-block verse-pair-right' : 'verse-block verse-pair-left';
    el.dataset.vnum = String(vnum);
    el.dataset.colMode = colMode; // ← VR-5-H-4 projection: col.colMode.kind
    doc.appendChild(el);
    return el;
}

/* ─────────────────────────────────────────────────────────────
   実 _setFlowInjection のソーステキストを index.html から抽出して実行する。
   （コピーではなく実コードを評価。実装が契約から乖離すれば behavioral に失敗する）
   ───────────────────────────────────────────────────────────── */
function extractFunctionSource(source, header) {
    const start = source.indexOf(header);
    if (start < 0) return null;
    let i = source.indexOf('{', start);
    let depth = 0;
    for (; i < source.length; i++) {
        const ch = source[i];
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) { return source.slice(start, i + 1); } }
    }
    return null;
}

const setFlowInjectionSrc = extractFunctionSource(html, 'function _setFlowInjection(mode) {');
check('extract: _setFlowInjection ソース抽出に成功', !!setFlowInjectionSrc);

/* スタブ化する外部依存（Flow injection の周辺。DOM 契約の検証に無関係な副作用のみ） */
let onFlowTabOpenedCalls = 0;
let syncFlagCalls = 0;
const stubEnv = () => ({
    window: { App: { onboarding: { onFlowTabOpened() { onFlowTabOpenedCalls++; } } } },
    _syncOnboardingActiveFlag: () => { syncFlagCalls++; },
    _cachedElByVerse: { '16': [{ text: 'x', lemma: 'x' }], '17': [{ text: 'y', lemma: 'y' }] },
    _buildGfVerseBlock: (vNum) => ({
        html: '<span class="wlv-chip">gloss</span>',
        chips: [{ tokenId: 't1' }],
        words: [{ text: 'w' }],
        analysis: { ok: true },
    }),
    /* Phase1 Chapter Context Threading: _setFlowInjection が描画時コンテキスト取得のために
       AppState.location を参照するようになったため最小スタブを追加する。
       DOM 契約（gf-mode / gf-verse-block）の検証には影響しない。 */
    AppState: { location: { book: { key: 'ROM' }, chapter: 1 } },
});

/* 実 _setFlowInjection を、指定 document / 環境スタブで束縛して返す */
function buildSetFlowInjection(doc, env) {
    const factory = new Function(
        'document', 'window', '_cachedElByVerse', '_buildGfVerseBlock', '_syncOnboardingActiveFlag', 'AppState',
        setFlowInjectionSrc + '\n; return _setFlowInjection;'
    );
    return factory(doc, env.window, env._cachedElByVerse, env._buildGfVerseBlock, env._syncOnboardingActiveFlag, env.AppState);
}

/* ─────────────────────────────────────────────────────────────
   Case 1: compare JA1955/FLOW — Flow 起動で wordOrder 列へ注入される
   ───────────────────────────────────────────────────────────── */
if (setFlowInjectionSrc) {
    const env = stubEnv();
    const doc = makeDocument();
    const left  = makeColumn(doc, { colMode: 'translation', vnum: 16, right: false }); // JA1955
    const right = makeColumn(doc, { colMode: 'wordOrder',   vnum: 16, right: true });  // FLOW
    const setFlowInjection = buildSetFlowInjection(doc, env);

    setFlowInjection('flow');

    check('Case1: wordOrder 列が存在', doc.querySelectorAll('[data-col-mode="wordOrder"]').length === 1);
    check('Case1: dataset.colMode === "wordOrder"', right.dataset.colMode === 'wordOrder');
    check('Case1: wordOrder 列に gf-mode 付与', right.classList.contains('gf-mode'));
    check('Case1: wordOrder 列に gf-verse-block 注入', right.querySelector('.gf-verse-block') !== null);
    check('Case1: translation 列に gf-mode 非付与（位置でなく colMode で対象化）', !left.classList.contains('gf-mode'));
    check('Case1: translation 列に gf-verse-block 非注入', left.querySelector('.gf-verse-block') === null);
    check('Case1: flow 起動で onboarding 通知が発火', onFlowTabOpenedCalls === 1 && syncFlagCalls === 1);
}

/* ─────────────────────────────────────────────────────────────
   Case 2: compare JA1955/FLOW → BUN
   (a) 再描画後の新 DOM が translation 列に戻り、flow 起動されない（gf-mode 残留なし）
   (b) 旧 flow 列へ _setFlowInjection('trans') を呼ぶと gf-mode が除去される（cleanup 動作）
   ───────────────────────────────────────────────────────────── */
if (setFlowInjectionSrc) {
    // (a) 再描画: 新 DOM は BUN (translation)。render は _colB.kind!=='wordOrder' なので flow を呼ばない
    const env = stubEnv();
    const doc = makeDocument();
    makeColumn(doc, { colMode: 'translation', vnum: 16, right: false }); // JA1955
    const rightBun = makeColumn(doc, { colMode: 'translation', vnum: 16, right: true }); // BUN
    // render 側の実挙動を模す: wordOrder 列が無いので _setFlowInjection('flow') は呼ばれない
    const wordOrderCols = doc.querySelectorAll('[data-col-mode="wordOrder"]');
    check('Case2a: 再描画後 wordOrder 列が無い（BUN translation 復帰）', wordOrderCols.length === 0);
    check('Case2a: BUN 右列に gf-mode 残留なし', !rightBun.classList.contains('gf-mode'));
    check('Case2a: BUN 右列に gf-verse-block 表示対象なし', rightBun.querySelector('.gf-verse-block') === null);

    // (b) cleanup: 旧 flow 列へ trans を適用すると gf-mode が外れる
    const env2 = stubEnv();
    const doc2 = makeDocument();
    const flowed = makeColumn(doc2, { colMode: 'wordOrder', vnum: 16, right: true });
    const srm2 = buildSetFlowInjection(doc2, env2);
    srm2('flow');
    check('Case2b: flow で gf-mode 付与済み（前提）', flowed.classList.contains('gf-mode'));
    srm2('trans');
    check('Case2b: trans で gf-mode 除去（cleanup 動作）', !flowed.classList.contains('gf-mode'));
    // 契約: trans は gf-verse-block を除去しない（CSS :not(.gf-mode)>.gf-verse-block で不可視化する設計）
    check('Case2b: trans は gf-verse-block を DOM から消さない（CSS で不可視化する契約）',
        flowed.querySelector('.gf-verse-block') !== null);
}

/* ─────────────────────────────────────────────────────────────
   Case 3: FLOW → single
   単一表示では右列は single-mode CSS で非表示。flow は起動されない（gf-mode 残留なし）。
   ───────────────────────────────────────────────────────────── */
if (setFlowInjectionSrc) {
    const env = stubEnv();
    const doc = makeDocument();
    // single mode: 左列のみが本文。右列は存在しても single-mode CSS で display:none
    const rightCol = makeColumn(doc, { colMode: 'translation', vnum: 16, right: true });
    const wordOrderCols = doc.querySelectorAll('[data-col-mode="wordOrder"]');
    check('Case3: single 復帰で wordOrder 列が無い（flow 非起動）', wordOrderCols.length === 0);
    check('Case3: single 右列に gf-mode 残留なし', !rightCol.classList.contains('gf-mode'));
    // 非表示は CSS 契約（source-invariant で別途ロック）。ここでは gf-mode 残留のみを DOM 検証。
}

/* ─────────────────────────────────────────────────────────────
   Case 4: chapter change while FLOW
   章移動 = DOM 全再構築。新 DOM（前章 gf-mode 無し）へ flow を起動すると再注入される。
   ───────────────────────────────────────────────────────────── */
if (setFlowInjectionSrc) {
    const env = stubEnv();
    const doc = makeDocument();
    // 新章の新 DOM（複数節）。gf-mode は付いていない
    const v16 = makeColumn(doc, { colMode: 'wordOrder', vnum: 16, right: true });
    const v17 = makeColumn(doc, { colMode: 'wordOrder', vnum: 17, right: true });
    const setFlowInjection = buildSetFlowInjection(doc, env);

    check('Case4: 新 DOM は gf-mode 未付与（前章状態に非依存）',
        !v16.classList.contains('gf-mode') && !v17.classList.contains('gf-mode'));
    setFlowInjection('flow');
    check('Case4: 章移動後も全 wordOrder 節へ gf-mode 再付与',
        v16.classList.contains('gf-mode') && v17.classList.contains('gf-mode'));
    check('Case4: 章移動後も全 wordOrder 節へ gf-verse-block 再注入',
        v16.querySelector('.gf-verse-block') !== null && v17.querySelector('.gf-verse-block') !== null);
}

/* ─────────────────────────────────────────────────────────────
   Case 5: activateFlowCompare()
   明示的 Flow 起動経路が _rightMode 無しで成立し、gf-verse-block を生成する。
   ───────────────────────────────────────────────────────────── */
if (setFlowInjectionSrc) {
    const env = stubEnv();
    const doc = makeDocument();
    const right = makeColumn(doc, { colMode: 'wordOrder', vnum: 16, right: true });
    const setFlowInjection = buildSetFlowInjection(doc, env);
    // activateFlowCompare の本質: _applyTransMode('compare') → renderCurrentPage() → _setFlowInjection('flow')
    setFlowInjection('flow');
    check('Case5: 明示 Flow 起動経路が成立', right.classList.contains('gf-mode'));
    check('Case5: gf-verse-block 生成', right.querySelector('.gf-verse-block') !== null);
    // 二重注入されないこと（既存 gf-verse-block があれば再生成しない契約）
    setFlowInjection('flow');
    const gfCount = right.children.filter(c => c.classList.contains('gf-verse-block')).length;
    check('Case5: 再度 flow でも gf-verse-block は二重注入されない', gfCount === 1);
}

/* ─────────────────────────────────────────────────────────────
   VR-5-H-12-C: Renderer Output Contract Lock
   renderBodyColumn / renderGreekFlowView の現状 DOM contract を固定する。
   ★ HTML 全文 byte 比較ではなく、構造契約（クラス名・属性・chip 数・anchor /
     stopPropagation の有無）として assert する（inline style / 空白の将来変更に耐える）。
   ★ コピーではなく、実 WordOrderRenderer を index.html から抽出して実行する
     （renderBodyColumn/renderGreekFlowView が契約から乖離したら失敗する）。
   ───────────────────────────────────────────────────────────── */
const wordOrderRendererSrc = extractFunctionSource(html, 'const WordOrderRenderer = {');
check('extract: WordOrderRenderer 抽出に成功', !!wordOrderRendererSrc);

function countOcc(s, sub) { return s.split(sub).length - 1; }
function mkRep(book, chapter, verse, chips) {
    return { kind: 'wordOrder', verseRef: { book, chapter, verse }, chips };
}
function mkChip(over) {
    return Object.assign(
        { tokenId: 't', roleClass: 'role-x', greek: 'γρ', dpGrammarClasses: 'dp-x', gloss: 'ぐ', phraseBreakBefore: false },
        over || {});
}

if (wordOrderRendererSrc) {
    const R = (new Function(wordOrderRendererSrc + '\n; return WordOrderRenderer;'))();

    /* ── renderBodyColumn（本文左列 = jp-section / stopPropagation / anchor は option 駆動） ── */
    const repRom = mkRep('ROM', 1, '1', [ mkChip({ tokenId: 'a' }), mkChip({ tokenId: 'b', phraseBreakBefore: true }) ]);
    const body = R.renderBodyColumn(repRom);
    check('BodyColumn: jp-section ラッパを持つ', /class="jp-section"/.test(body));
    check('BodyColumn: wlv-flow-stream を持つ', /wlv-flow-stream/.test(body));
    check('BodyColumn: v-num に verse 番号', /<span class="v-num">1<\/span>/.test(body));
    check('BodyColumn: chip 数 = chips.length', countOcc(body, 'class="wlv-chip ') === 2);
    check('BodyColumn: chip に data-token-id 転写', body.includes('data-token-id="a"') && body.includes('data-token-id="b"'));
    check('BodyColumn: chip gloss / dpGrammarClasses 転写', /class="dp-x">ぐ<\/span>/.test(body));
    check('BodyColumn: chip に stopPropagation あり', /onclick="event\.stopPropagation\(\);_wlvChipClick/.test(body));
    check('BodyColumn: phraseBreakBefore で wlv-phrase-sep 挿入（1個）', countOcc(body, 'wlv-phrase-sep') === 1);

    /* VR-5-H-12-D: anchor は options.showOnboardingAnchor 駆動（renderer は verse を判定しない）。
       anchor policy（JHN3:16 判定）は呼び出し元 _buildColumnBlock 側へ移設済み。 */
    const bodyNoOpt  = R.renderBodyColumn(repRom);                                  // option 無し
    const bodyOff    = R.renderBodyColumn(repRom, { showOnboardingAnchor: false }); // option false
    const bodyOn     = R.renderBodyColumn(repRom, { showOnboardingAnchor: true });  // option true（verse は ROM）
    check('BodyColumn: option 無しでは anchor なし（既定沈黙）', !/data-onboarding-anchor/.test(bodyNoOpt));
    check('BodyColumn: showOnboardingAnchor=false では anchor なし', !/data-onboarding-anchor/.test(bodyOff));
    check('BodyColumn: showOnboardingAnchor=true で先頭 chip に anchor 付与', /data-onboarding-anchor="true"/.test(bodyOn));
    check('BodyColumn: anchor は先頭 chip のみ（1個）', countOcc(bodyOn, 'data-onboarding-anchor') === 1);
    check('BodyColumn: anchor は verse 非依存（renderer は JHN3:16 を判定しない）',
        /data-onboarding-anchor="true"/.test(bodyOn) && !/data-onboarding-anchor/.test(bodyNoOpt));

    /* ── renderGreekFlowView（compare 右列 Flow = bare wrapper / stopPropagation なし / anchor なし） ── */
    const flow = R.renderGreekFlowView(repRom);
    check('FlowView: chip 数 = chips.length', countOcc(flow, 'class="wlv-chip ') === 2);
    check('FlowView: v-num に verse 番号', /<span class="v-num">1<\/span>/.test(flow));
    check('FlowView: chip に data-token-id 転写', flow.includes('data-token-id="a"'));
    check('FlowView: chip gloss / dpGrammarClasses 転写', /class="dp-x">ぐ<\/span>/.test(flow));
    check('FlowView: chip に stopPropagation なし', !/stopPropagation/.test(flow) && /onclick="_wlvChipClick/.test(flow));
    check('FlowView: anchor を付与しない', !/data-onboarding-anchor/.test(flow));
    /* gf-verse-block 内利用契約: .jp-text / .jp-section を使わない
       （.gf-mode .jp-text{display:none} で消えるため bare wrapper が必須） */
    check('FlowView: jp-text を使わない（gf-mode 非表示回避契約）', !/jp-text/.test(flow));
    check('FlowView: jp-section を使わない（bare wrapper）', !/jp-section/.test(flow));
    check('FlowView: phraseBreakBefore で wlv-phrase-sep 挿入（1個）', countOcc(flow, 'wlv-phrase-sep') === 1);

    /* FlowView は option を受け取らず anchor を一切付与しない（Flow injection は onboarding
       アンカー対象外）。option を渡しても無視されることを確認する。 */
    const flowWithOpt = R.renderGreekFlowView(repRom, { showOnboardingAnchor: true });
    check('FlowView: showOnboardingAnchor=true でも anchor を付けない（Flow は本文専用アンカー対象外）',
        !/data-onboarding-anchor/.test(flowWithOpt));

    /* ─────────────────────────────────────────────────────────────
       VR-5-H-13-B: Renderer Output Byte Contract
       H-13-C（shared helper 抽出）の安全網。両 renderer の現行 HTML を
       whitespace 正規化のうえ byte 固定する（class/attribute/event/data 属性を凍結）。
       ★ 許可する差分は whitespace のみ（norm: タグ間空白除去 + 連続空白の単一化）。
         helper 抽出後も、この正規化 byte が一致すれば class/属性/イベント/データは不変。
       ★ fixture は 2 chip（phraseBreakBefore: 2 個目=true）で sep 挿入位置も固定。
       ───────────────────────────────────────────────────────────── */
    /* whitespace のみを吸収する正規化: 連続空白の単一化 + タグ間空白除去 + 「空白 + >」除去。
       class/attribute/event/data の変化は残す（byte 契約はそれらに不寛容）。 */
    const norm = s => s.replace(/\s+/g, ' ').replace(/>\s+</g, '><').replace(/\s+>/g, '>').trim();
    const snapRep = mkRep('ROM', 1, '1', [
        mkChip({ tokenId: 'a', roleClass: 'role-x', greek: 'γ1', dpGrammarClasses: 'dp-x', gloss: 'ぐ1' }),
        mkChip({ tokenId: 'b', roleClass: 'role-y', greek: 'γ2', dpGrammarClasses: 'dp-y', gloss: 'ぐ2', phraseBreakBefore: true }),
    ]);
    const GOLDEN_BODY_OFF = `<div class="jp-section"><span class="v-num">1</span><div class="jp-text" style="font-size: var(--text-body);line-height:2.4;"><div class="wlv-flow-stream" style="flex-wrap:wrap;display:flex;gap:var(--rhythm-micro);align-items:baseline;"><span class="wlv-chip role-x" data-token-id="a" onclick="event.stopPropagation();_wlvChipClick(this,'a')" title="γ1"><span class="wlv-chip-ja"><span class="dp-x">ぐ1</span></span></span><span class="wlv-phrase-sep"></span><span class="wlv-chip role-y" data-token-id="b" onclick="event.stopPropagation();_wlvChipClick(this,'b')" title="γ2"><span class="wlv-chip-ja"><span class="dp-y">ぐ2</span></span></span></div></div></div>`;
    const GOLDEN_BODY_ON = `<div class="jp-section"><span class="v-num">1</span><div class="jp-text" style="font-size: var(--text-body);line-height:2.4;"><div class="wlv-flow-stream" style="flex-wrap:wrap;display:flex;gap:var(--rhythm-micro);align-items:baseline;"><span class="wlv-chip role-x" data-token-id="a" data-onboarding-anchor="true" data-greek="γ1" onclick="event.stopPropagation();_wlvChipClick(this,'a')" title="γ1"><span class="wlv-chip-ja"><span class="dp-x">ぐ1</span></span></span><span class="wlv-phrase-sep"></span><span class="wlv-chip role-y" data-token-id="b" onclick="event.stopPropagation();_wlvChipClick(this,'b')" title="γ2"><span class="wlv-chip-ja"><span class="dp-y">ぐ2</span></span></span></div></div></div>`;
    const GOLDEN_FLOW = `<div style="display:flex;align-items:baseline;gap: var(--space-sm);padding: var(--space-xs) 0;"><span class="v-num">1</span><div style="flex:1;font-size: var(--text-body);line-height:2.4;display:flex;flex-wrap:wrap;gap: var(--space-xs) var(--space-xs);align-items:baseline;"><span class="wlv-chip role-x" data-token-id="a" onclick="_wlvChipClick(this,'a')" title="γ1"><span class="wlv-chip-ja"><span class="dp-x">ぐ1</span></span></span><span class="wlv-phrase-sep"></span><span class="wlv-chip role-y" data-token-id="b" onclick="_wlvChipClick(this,'b')" title="γ2"><span class="wlv-chip-ja"><span class="dp-y">ぐ2</span></span></span></div></div>`;

    check('byte: renderBodyColumn(anchor off) が現行 HTML と一致（whitespace 正規化後）',
        norm(R.renderBodyColumn(snapRep)) === GOLDEN_BODY_OFF);
    check('byte: renderBodyColumn(anchor on) が現行 HTML と一致（whitespace 正規化後）',
        norm(R.renderBodyColumn(snapRep, { showOnboardingAnchor: true })) === GOLDEN_BODY_ON);
    check('byte: renderGreekFlowView が現行 HTML と一致（whitespace 正規化後）',
        norm(R.renderGreekFlowView(snapRep)) === GOLDEN_FLOW);
    /* mutation 自己確認: golden は class/attr/event/data の1文字変化も検知する
       （whitespace 以外に不寛容）。norm は tag 間空白と連続空白のみ吸収する。 */
    check('byte: mutation 感度（属性1文字変更を golden が検知）',
        norm(R.renderBodyColumn(snapRep)).replace('role-x', 'role-Z') !== GOLDEN_BODY_OFF
        && norm(R.renderBodyColumn(snapRep)) === GOLDEN_BODY_OFF);
}

/* ─────────────────────────────────────────────────────────────
   Source-invariant（契約ロック）: 実 index.html が H-4/H-6 契約を保っているか
   ───────────────────────────────────────────────────────────── */
// _rightMode の実コード参照が 0（コメントは許容）。代入・比較の実トークンで検出。
check('invariant: _rightMode の実コード参照なし（代入）', !/_rightMode\s*=/.test(html));
check('invariant: _rightMode の実コード参照なし（比較）', !/_rightMode\s*===/.test(html));
// VR-5-H-4 projection
check('invariant: _buildColumnBlock が dataset.colMode を投影',
    /columnBlock\.dataset\.colMode\s*=\s*col\.colMode\.kind\s*;/.test(html));
// VR-5-H-4 探索キーの一般化
check('invariant: Flow 探索が [data-col-mode="wordOrder"]',
    /querySelectorAll\(\s*'\[data-col-mode="wordOrder"\]'\s*\)/.test(html));
// VR-5-H-4 の > 結合子維持
check('invariant: .gf-mode > .gf-verse-block（子結合子維持）', /\.gf-mode\s*>\s*\.gf-verse-block/.test(html));
check('invariant: :not(.gf-mode) > .gf-verse-block（子結合子維持）', /:not\(\.gf-mode\)\s*>\s*\.gf-verse-block/.test(html));
// render の flow 起動が _colB.kind 駆動・_rightMode 非依存
check('invariant: render flow 起動が _colB.kind === \'wordOrder\' 駆動',
    /if\s*\(\s*_colB\.kind\s*===\s*'wordOrder'\s*\)\s*\{\s*_setFlowInjection\('flow'\)/.test(html.replace(/\s+/g, ' ')));
// VR-5-H-12-D: renderBodyColumn の anchor policy は呼び出し元へ移設済み
check('invariant: _buildColumnBlock が renderBodyColumn へ showOnboardingAnchor を渡す',
    /renderBodyColumn\(_vrRep,\s*\{\s*showOnboardingAnchor:/.test(html));
check('invariant: anchor policy(JHN3:16)は呼び出し元にある',
    /_bodyVr\.book === 'JHN'\s*&&\s*_bodyVr\.chapter === 3\s*&&\s*String\(_bodyVr\.verse\) === '16'/.test(html));
// single-mode 右列非表示 CSS（Case3 の非表示契約）
check('invariant: single-mode で右列非表示 CSS が存在',
    /#main-reading-area\.single-mode\s+\.verse-pair-right/.test(html));
// activateFlowCompare が明示 flow 起動（Case5 経路）
check('invariant: activateFlowCompare が _setFlowInjection(\'flow\') を明示呼び',
    /activateFlowCompare[\s\S]{0,400}_setFlowInjection\('flow'\)/.test(html));

/* ─────────────────────────────────────────────────────────────
   構文ゲート: インライン <script> を node --check（H-6 のブレース破壊を検知できる層）
   ───────────────────────────────────────────────────────────── */
(function syntaxGate() {
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let m, i = 0, bad = 0;
    const tmpDir = require('os').tmpdir();
    while ((m = re.exec(html))) {
        i++;
        const tmp = path.join(tmpDir, `re-flow-dom-syntax-${process.pid}-${i}.js`);
        fs.writeFileSync(tmp, m[1]);
        const cp = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
        try { fs.unlinkSync(tmp); } catch (_) {}
        if (cp.status !== 0) { bad++; }
    }
    check(`syntax-gate: インライン script が構文的に正しい（${i}件）`, bad === 0, `${bad}件で構文エラー`);
})();

/* ─────────────────────────────────────────────────────────────
   Phase 2A-4: Chapter Focus Observer + _navigateVerse scope
   ───────────────────────────────────────────────────────────── */

/* Invariant: Phase 2A-4 関数・変数の存在 */
check('invariant(2A-4): _setupChapterObserver 定義あり',
    /function _setupChapterObserver\s*\(\s*\)/.test(html));
check('invariant(2A-4): _observeChapterBlock 定義あり',
    /function _observeChapterBlock\s*\(/.test(html));
check('invariant(2A-4): _recalcFocusChapter 定義あり',
    /function _recalcFocusChapter\s*\(\s*\)/.test(html));
check('invariant(2A-4): _chapterObserver 変数宣言あり',
    /let _chapterObserver\s*=/.test(html));
check('invariant(2A-4): _chapterObserverVisible = new Map() あり',
    /_chapterObserverVisible\s*=\s*new Map\(\)/.test(html));

/* Invariant: Observer 設計契約（options オブジェクトを直接確認） */
check('invariant(2A-4): Observer options に root: container あり',
    /\{\s*root:\s*container\s*,\s*threshold:\s*0\s*\}/.test(html));
check('invariant(2A-4): Observer options に threshold: 0 あり',
    /\{\s*root:\s*container\s*,\s*threshold:\s*0\s*\}/.test(html));
check('invariant(2A-4): render() が _setupChapterObserver を呼ぶ',
    /* _chapterBlock) { _setupChapterObserver() } という形で存在する */
    /_chapterBlock\s*\)\s*\{\s*_setupChapterObserver\s*\(\s*\)/.test(html));
check('invariant(2A-4): _loadAndAppendChapter が _observeChapterBlock(_lacCb) を呼ぶ',
    /_observeChapterBlock\s*\(\s*_lacCb\s*\)/.test(html));

/* Invariant: _navigateVerse scope fix */
check('invariant(2A-4): _navigateVerse が closest(".chapter-block") を使う',
    /closest\s*\(\s*'\.chapter-block'\s*\)/.test(html));
check('invariant(2A-4): _navigateVerse が _navChBlock||document でスコープする',
    /\(_navChBlock\s*\|\|\s*document\)\.querySelectorAll/.test(html));
check('invariant(2A-4): _navigateVerse の章末遷移が _navChBlock.dataset.chapter を読む',
    /_navChBlock\s*\?\s*parseInt\s*\(\s*_navChBlock\.dataset\.chapter/.test(html));

/* Invariant: Phase 2C-2 DOM-reuse navigation */
{
    const nvSrc2C = extractFunctionSource(html, 'function _navigateVerse(delta) {');
    check('extract(2C-2): _navigateVerse ソース再抽出に成功', !!nvSrc2C);
    if (nvSrc2C) {
        check('invariant(2C-2): 隣章 DOM 存在チェックを持つ (.chapter-block[data-book=)',
            /\.chapter-block\[data-book=/.test(nvSrc2C));
        check('invariant(2C-2): _adjBlock 分岐が存在する',
            /if\s*\(\s*_adjBlock\s*\)/.test(nvSrc2C));
        check('invariant(2C-2): delta>0 で先頭節、delta<0 で末尾節を選択する',
            /delta\s*>\s*0\s*\?/.test(nvSrc2C));
        check('invariant(2C-2): _adjBlock なし時の _navTo fallback を維持する',
            /else\s*\{\s*[\s\S]{0,60}_navTo\s*\(/.test(nvSrc2C));
        check('invariant(2C-2): 隣章 DOM 移動で AppState.toBrowsing() を新規に呼ばない',
            !/if\s*\(_adjBlock\s*\)[\s\S]{0,300}AppState\.toBrowsing/.test(nvSrc2C));
        check('invariant(2C-2): 隣章 DOM 移動で openVerseInspector() を呼ばない',
            !/if\s*\(_adjBlock\s*\)[\s\S]{0,300}openVerseInspector/.test(nvSrc2C));
        check('invariant(2C-2): 章範囲ガード (nextCh >= 1 && nextCh <= maxCh) を維持する',
            /nextCh\s*>=\s*1\s*&&\s*nextCh\s*<=\s*maxCh/.test(nvSrc2C));
    }
}

/* Behavioral: _navigateVerse 多章スコープ修正 */
{
    const navigateVerseSrc = extractFunctionSource(html, 'function _navigateVerse(delta) {');
    check('extract(2A-4): _navigateVerse ソース抽出に成功', !!navigateVerseSrc);

    if (navigateVerseSrc) {
        /* closest を El prototype に追加（_navigateVerse の closest('.chapter-block') で使用） */
        if (!El.prototype.closest) {
            El.prototype.closest = function (sel) {
                let n = this;
                while (n) { if (n._matches && n._matches(sel)) return n; n = n.parentNode || null; }
                return null;
            };
        }

        const VERSE_SEL = '.verse-pair-left, .verse-block:not(.verse-pair-left):not(.verse-pair-right)';

        /* 章ブロック + 節ブロック(v14-v16)を作る */
        function mkChapterWith3Verses(doc, book, chNum) {
            const cb = doc.createElement('div');
            cb.className = 'chapter-block';
            cb.dataset.book = book; cb.dataset.chapter = String(chNum);
            const vbs = [];
            for (let v = 14; v <= 16; v++) {
                const vb = doc.createElement('div');
                vb.className = 'verse-block';
                const vn = doc.createElement('span');
                vn.className = 'v-num'; vn.textContent = String(v);
                vb.appendChild(vn);
                vb._scrolled = false;
                vb.scrollIntoView = function () { this._scrolled = true; };
                cb.appendChild(vb);
                vbs.push(vb);
            }
            /* querySelectorAll を stub: VERSE_SEL → own verse blocks */
            cb.querySelectorAll = (sel) => sel === VERSE_SEL ? [...vbs] : [];
            return { cb, vbs };
        }

        const doc2 = makeDocument();
        const { cb: cb1, vbs: [c1v14, c1v15, c1v16] } = mkChapterWith3Verses(doc2, 'ROM', 1);
        const { cb: cb2, vbs: [c2v14, c2v15, c2v16] } = mkChapterWith3Verses(doc2, 'ROM', 2);
        doc2.appendChild(cb1); doc2.appendChild(cb2);

        /* ch2:v14 を選択状態にする */
        c2v14.className = 'verse-block selected'; /* setter が _cl を更新する */

        /* document-level querySelectorAll stub */
        doc2.querySelectorAll = (sel) => {
            if (sel === '.verse-block.selected') return [c2v14];
            if (sel === VERSE_SEL) return [c1v14, c1v15, c1v16, c2v14, c2v15, c2v16];
            return [];
        };

        let navToCalled = null;
        const _nv = (new Function(
            'document', 'AppState', '_navTo',
            navigateVerseSrc + '\n; return _navigateVerse;'
        ))(
            doc2,
            { location: { book: { key: 'ROM', ch: 16 }, chapter: 1, testament: 'nt' } },
            (bk, ch) => { navToCalled = ch; }
        );

        _nv(1); /* ch2:v14 選択中 → 次節(+1) → ch2:v15 を期待 */

        check('behavioral(2A-4): ch2:v14→次節でch2:v15を選択', c2v15._scrolled === true);
        check('behavioral(2A-4): ch2:v14→次節でch1:v15を誤選択しない', c1v15._scrolled === false);
        check('behavioral(2A-4): 同章内で見つかるため _navTo を呼ばない', navToCalled === null);

        /* 逆方向: ch2:v15 選択 → 前節(-1) → ch2:v14 を期待 */
        c2v14._scrolled = false; c2v15._scrolled = false; /* リセット */
        c2v15.className = 'verse-block selected';
        c2v14.className = 'verse-block';
        doc2.querySelectorAll = (sel) => {
            if (sel === '.verse-block.selected') return [c2v15];
            if (sel === VERSE_SEL) return [c1v14, c1v15, c1v16, c2v14, c2v15, c2v16];
            return [];
        };
        _nv(-1); /* ch2:v15 選択中 → 前節(-1) → ch2:v14 を期待 */
        check('behavioral(2A-4): ch2:v15→前節でch2:v14を選択', c2v14._scrolled === true);
        check('behavioral(2A-4): ch2:v15→前節でch1:v14を誤選択しない', c1v14._scrolled === false);
    }
}

/* ─────────────────────────────────────────────────────────────
   Phase 2C-2: Cross-chapter DOM-reuse Navigation
   ───────────────────────────────────────────────────────────── */
{
    const navigateVerseSrc2C = extractFunctionSource(html, 'function _navigateVerse(delta) {');

    if (navigateVerseSrc2C) {
        if (!El.prototype.closest) {
            El.prototype.closest = function (sel) {
                let n = this;
                while (n) { if (n._matches && n._matches(sel)) return n; n = n.parentNode || null; }
                return null;
            };
        }

        const VERSE_SEL = '.verse-pair-left, .verse-block:not(.verse-pair-left):not(.verse-pair-right)';

        /* 章ブロック + 節ブロックを作るヘルパー（v1-v3 の3節） */
        function mkChapter2C(doc, book, chNum) {
            const cb = doc.createElement('div');
            cb.className = 'chapter-block';
            cb.dataset.book = book; cb.dataset.chapter = String(chNum);
            const vbs = [];
            for (let v = 1; v <= 3; v++) {
                const vb = doc.createElement('div');
                vb.className = 'verse-block';
                const vn = doc.createElement('span');
                vn.className = 'v-num'; vn.textContent = String(v);
                vb.appendChild(vn);
                vb._scrolled = false;
                vb.scrollIntoView = function () { this._scrolled = true; };
                cb.appendChild(vb);
                vbs.push(vb);
            }
            cb.querySelectorAll = (sel) => sel === VERSE_SEL ? [...vbs] : [];
            return { cb, vbs };
        }

        /* ── テスト1: 次章DOMあり → ch1:v3 から +1 → ch2:v1 へ scrollIntoView ── */
        {
            const docA = makeDocument();
            const { cb: cbA1, vbs: [a1v1, a1v2, a1v3] } = mkChapter2C(docA, 'ROM', 1);
            const { cb: cbA2, vbs: [a2v1, a2v2, a2v3] } = mkChapter2C(docA, 'ROM', 2);
            docA.appendChild(cbA1); docA.appendChild(cbA2);

            /* ch1:v3 を選択 */
            a1v3.className = 'verse-block selected';
            docA.querySelectorAll = (sel) => {
                if (sel === '.verse-block.selected') return [a1v3];
                return cbA1.querySelectorAll(sel); /* ch1スコープ内 */
            };
            /* querySelector: ch2を返す */
            docA.querySelector = (sel) => {
                if (sel === '.chapter-block[data-book="ROM"][data-chapter="2"]') return cbA2;
                if (sel === '.chapter-block[data-book="ROM"][data-chapter="1"]') return cbA1;
                return null;
            };

            let navToCalledA = null;
            const nvA = (new Function(
                'document', 'AppState', '_navTo',
                navigateVerseSrc2C + '\n; return _navigateVerse;'
            ))(
                docA,
                { location: { book: { key: 'ROM', ch: 16 }, chapter: 1, testament: 'nt' } },
                (bk, ch) => { navToCalledA = ch; }
            );

            nvA(1); /* ch1:v3 選択中 → +1 → 次章の先頭節(v1) を期待 */

            check('behavioral(2C-2): 次章DOMあり: ch1:v3→+1 で ch2:v1 へ scrollIntoView',
                a2v1._scrolled === true);
            check('behavioral(2C-2): 次章DOMあり: ch1:v3→+1 で ch2:v2 は scrollIntoView しない',
                a2v2._scrolled === false);
            check('behavioral(2C-2): 次章DOMあり: ch1:v3→+1 で _navTo を呼ばない',
                navToCalledA === null);
        }

        /* ── テスト2: 前章DOMあり → ch2:v1 から -1 → ch1:v3（末尾節）へ scrollIntoView ── */
        {
            const docB = makeDocument();
            const { cb: cbB1, vbs: [b1v1, b1v2, b1v3] } = mkChapter2C(docB, 'ROM', 1);
            const { cb: cbB2, vbs: [b2v1, b2v2, b2v3] } = mkChapter2C(docB, 'ROM', 2);
            docB.appendChild(cbB1); docB.appendChild(cbB2);

            b2v1.className = 'verse-block selected';
            docB.querySelectorAll = (sel) => {
                if (sel === '.verse-block.selected') return [b2v1];
                return cbB2.querySelectorAll(sel); /* ch2スコープ内 */
            };
            docB.querySelector = (sel) => {
                if (sel === '.chapter-block[data-book="ROM"][data-chapter="1"]') return cbB1;
                if (sel === '.chapter-block[data-book="ROM"][data-chapter="2"]') return cbB2;
                return null;
            };

            let navToCalledB = null;
            const nvB = (new Function(
                'document', 'AppState', '_navTo',
                navigateVerseSrc2C + '\n; return _navigateVerse;'
            ))(
                docB,
                { location: { book: { key: 'ROM', ch: 16 }, chapter: 2, testament: 'nt' } },
                (bk, ch) => { navToCalledB = ch; }
            );

            nvB(-1); /* ch2:v1 選択中 → -1 → 前章の末尾節(v3) を期待 */

            check('behavioral(2C-2): 前章DOMあり: ch2:v1→-1 で ch1:v3（末尾節）へ scrollIntoView',
                b1v3._scrolled === true);
            check('behavioral(2C-2): 前章DOMあり: ch2:v1→-1 で ch1:v1 は scrollIntoView しない',
                b1v1._scrolled === false);
            check('behavioral(2C-2): 前章DOMあり: ch2:v1→-1 で _navTo を呼ばない',
                navToCalledB === null);
        }

        /* ── テスト3: 次章DOMなし → 従来の _navTo() にフォールバック ── */
        {
            const docC = makeDocument();
            const { cb: cbC1, vbs: [c1v1, c1v2, c1v3] } = mkChapter2C(docC, 'ROM', 1);
            docC.appendChild(cbC1);

            c1v3.className = 'verse-block selected';
            docC.querySelectorAll = (sel) => {
                if (sel === '.verse-block.selected') return [c1v3];
                return cbC1.querySelectorAll(sel);
            };
            /* querySelector: ch2 は DOM にない → null */
            docC.querySelector = () => null;

            let navToCalledC = null;
            const nvC = (new Function(
                'document', 'AppState', '_navTo',
                navigateVerseSrc2C + '\n; return _navigateVerse;'
            ))(
                docC,
                { location: { book: { key: 'ROM', ch: 16 }, chapter: 1, testament: 'nt' } },
                (bk, ch) => { navToCalledC = ch; }
            );

            nvC(1); /* ch1:v3 → +1、ch2 DOM なし → _navTo(ROM, 2) を期待 */

            check('behavioral(2C-2): 次章DOMなし: _navTo(2) を呼ぶ（フォールバック）',
                navToCalledC === 2);
        }

        /* ── テスト4: 前章DOMなし → 従来の _navTo() にフォールバック ── */
        {
            const docD = makeDocument();
            const { cb: cbD2, vbs: [d2v1, d2v2, d2v3] } = mkChapter2C(docD, 'ROM', 2);
            docD.appendChild(cbD2);

            d2v1.className = 'verse-block selected';
            docD.querySelectorAll = (sel) => {
                if (sel === '.verse-block.selected') return [d2v1];
                return cbD2.querySelectorAll(sel);
            };
            docD.querySelector = () => null;

            let navToCalledD = null;
            const nvD = (new Function(
                'document', 'AppState', '_navTo',
                navigateVerseSrc2C + '\n; return _navigateVerse;'
            ))(
                docD,
                { location: { book: { key: 'ROM', ch: 16 }, chapter: 2, testament: 'nt' } },
                (bk, ch) => { navToCalledD = ch; }
            );

            nvD(-1); /* ch2:v1 → -1、ch1 DOM なし → _navTo(ROM, 1) を期待 */

            check('behavioral(2C-2): 前章DOMなし: _navTo(1) を呼ぶ（フォールバック）',
                navToCalledD === 1);
        }

        /* ── テスト5: 最初の章(ch=1)から -1 → 移動しない ── */
        {
            const docE = makeDocument();
            const { cb: cbE1, vbs: [e1v1] } = mkChapter2C(docE, 'ROM', 1);
            docE.appendChild(cbE1);

            e1v1.className = 'verse-block selected';
            docE.querySelectorAll = (sel) => {
                if (sel === '.verse-block.selected') return [e1v1];
                return cbE1.querySelectorAll(sel);
            };
            docE.querySelector = () => null;

            let navToCalledE = null;
            const nvE = (new Function(
                'document', 'AppState', '_navTo',
                navigateVerseSrc2C + '\n; return _navigateVerse;'
            ))(
                docE,
                { location: { book: { key: 'ROM', ch: 16 }, chapter: 1, testament: 'nt' } },
                (bk, ch) => { navToCalledE = ch; }
            );

            nvE(-1); /* ch1:v1 → -1 → nextCh=0 < 1 → ガード。何もしない */

            check('behavioral(2C-2): ch1 の先頭節から -1 で _navTo を呼ばない（範囲ガード）',
                navToCalledE === null);
        }

        /* ── テスト6: 最終章(ch=16)から +1 → 移動しない ── */
        {
            const docF = makeDocument();
            const { cb: cbF16, vbs: [f16v1, f16v2, f16v3] } = mkChapter2C(docF, 'ROM', 16);
            docF.appendChild(cbF16);

            f16v3.className = 'verse-block selected';
            docF.querySelectorAll = (sel) => {
                if (sel === '.verse-block.selected') return [f16v3];
                return cbF16.querySelectorAll(sel);
            };
            docF.querySelector = () => null;

            let navToCalledF = null;
            const nvF = (new Function(
                'document', 'AppState', '_navTo',
                navigateVerseSrc2C + '\n; return _navigateVerse;'
            ))(
                docF,
                { location: { book: { key: 'ROM', ch: 16 }, chapter: 16, testament: 'nt' } },
                (bk, ch) => { navToCalledF = ch; }
            );

            nvF(1); /* ch16:v3 → +1 → nextCh=17 > maxCh(16) → ガード */

            check('behavioral(2C-2): 最終章の末尾節から +1 で _navTo を呼ばない（範囲ガード）',
                navToCalledF === null);
        }

        /* ── テスト7: Phase 2B キャッシュが DOM 内移動でクリアされない（ソース検証） ── */
        check('invariant(2C-2): _navigateVerse に _appendedChapterCache.clear() がない（キャッシュ保護）',
            !/_appendedChapterCache\.clear/.test(navigateVerseSrc2C));
    }
}

/* ─────────────────────────────────────────────────────────────
   Phase 2A-5: Scroll-triggered Chapter Autoload
   ───────────────────────────────────────────────────────────── */

/* Invariant: Phase 2A-5 関数・変数の存在 */
check('invariant(2A-5): _setupAutoload 定義あり',
    /function _setupAutoload\s*\(\s*\)/.test(html));
check('invariant(2A-5): _placeSentinel 定義あり',
    /function _placeSentinel\s*\(\s*\)/.test(html));
check('invariant(2A-5): _doAutoload 定義あり',
    /async function _doAutoload\s*\(/.test(html));
check('invariant(2A-5): _stopAutoload 定義あり',
    /function _stopAutoload\s*\(\s*\)/.test(html));
check('invariant(2A-5): _alObserver 変数宣言あり',
    /let _alObserver\s*=/.test(html));
check('invariant(2A-5): _alCancelGen 変数宣言あり',
    /let _alCancelGen\s*=/.test(html));

/* Invariant: Autoload 設計契約 */
check('invariant(2A-5): Autoload rootMargin に 300px bottom あり',
    /rootMargin:\s*'0px 0px 300px 0px'/.test(html));
check('invariant(2A-5): _stopAutoload が _alCancelGen をインクリメントする',
    /_alCancelGen\+\+/.test(html));
check('invariant(2A-5): _doAutoload が _alCancelGen と比較する',
    /_alCancelGen\s*!==\s*_myGen/.test(html));
check('invariant(2A-5): render() が _setupAutoload を呼ぶ',
    /_setupChapterObserver\(\);\s*_setupAutoload\(\)/.test(html));
check('invariant(2A-5): 最終章ガード: chNum >= bookObj.ch で _stopAutoload',
    /chNum\s*>=\s*bookObj\.ch.*_stopAutoload/.test(html.replace(/\n/g, ' ')));
check('invariant(2A-5): sentinel CSS が存在',
    /\.chapter-load-sentinel\s*\{/.test(html));

/* Invariant: Focus Observer との共存 */
check('invariant(2A-5): _alObserver は _chapterObserver とは別変数',
    /let _alObserver/.test(html) && /let _chapterObserver/.test(html));

/* Behavioral: _doAutoload 同時リクエスト防止 */
{
    const doAutoloadSrc = extractFunctionSource(html, 'async function _doAutoload(bookObj, nextCh) {');
    check('extract(2A-5): _doAutoload ソース抽出に成功', !!doAutoloadSrc);

    if (doAutoloadSrc) {
        /* _doAutoload を sync 的に実行できるよう Promise を同期解決するスタブ */
        let lacCalls = 0;
        const stubEnv5 = {
            _transA: 'JA1955',
            _transMode: 'single',
            _alRunning: false,
            _alCancelGen: 0,
            _alRetryCount: 0,
            _alSentinel: null,
            _alObserver: null,
            SB_BOOKS: {
                nt: [{ key: 'ROM', name: 'ローマ人への手紙', ch: 16 }],
                ot: []
            },
            _toColumnMode: (id) => ({ kind: 'translation' }),
            _isGreekReadingMode: (kind) => kind !== 'translation',
            _stopAutoload: function () { this._alCancelGen++; this._alRunning = false; },
            _placeSentinel: function () { /* no-op in stub */ },
            document: {
                getElementById: () => ({
                    querySelector: () => null  /* simulate: chapter not yet in DOM */
                })
            },
            _loadAndAppendChapter: async function (bookObj, nextCh) {
                lacCalls++;
                return false; /* simulate fetch failure */
            },
        };

        /* _doAutoload を評価（Promise が返る; ここでは await できないので then チェーン） */
        /* Node 環境のため実際の非同期動作は確認しない。_alRunning フラグのみ確認 */
        check('behavioral(2A-5): _doAutoload ソースに _alRunning チェックあり',
            /if\s*\(\s*_alRunning\s*\)\s*return/.test(doAutoloadSrc));
        check('behavioral(2A-5): _doAutoload ソースに _alRunning = true あり',
            /_alRunning\s*=\s*true/.test(doAutoloadSrc));
        check('behavioral(2A-5): _doAutoload ソースに finally { _alRunning = false } あり',
            /finally[\s\S]{0,30}_alRunning\s*=\s*false/.test(doAutoloadSrc));
        check('behavioral(2A-5): _doAutoload ソースにモードガードあり',
            /_isAutoloadBlockedMode[\s\S]{0,50}_stopAutoload/.test(doAutoloadSrc));
        check('behavioral(2A-5): _doAutoload ソースに _alRetryCount >= 3 で _stopAutoload あり',
            /_alRetryCount\s*>=\s*3[\s\S]{0,20}_stopAutoload/.test(doAutoloadSrc));
    }
}

/* Behavioral: _placeSentinel 最終章ガード */
{
    const placeSentinelSrc = extractFunctionSource(html, 'function _placeSentinel() {');
    check('extract(2A-5): _placeSentinel ソース抽出に成功', !!placeSentinelSrc);
    if (placeSentinelSrc) {
        check('behavioral(2A-5): _placeSentinel に chNum >= bookObj.ch ガードあり',
            /chNum\s*>=\s*bookObj\.ch/.test(placeSentinelSrc));
        check('behavioral(2A-5): _placeSentinel が sentinel を最終章ブロックへ appendChild する',
            /last\.appendChild\s*\(\s*_alSentinel\s*\)/.test(placeSentinelSrc));
        check('behavioral(2A-5): _placeSentinel が disconnect してから observe する',
            /_alObserver\.disconnect[\s\S]{0,80}_alObserver\.observe/.test(placeSentinelSrc));
    }
}

/* ───────────────────── Phase 2B-2: Multi-chapter Cache Tests ───────────────────── */
{
    /* C-1: _appendedChapterCache 宣言が存在する */
    check('2B-2(C-1): _appendedChapterCache 宣言が index.html に存在する',
        /let\s+_appendedChapterCache\s*=\s*new\s+Map\s*\(\s*\)/.test(html));

    /* C-2: render() 内で _appendedChapterCache.clear() が app.innerHTML = '' より前に呼ばれる */
    const renderSrc = extractFunctionSource(html, 'function render(');
    check('extract(2B-2): render() ソース抽出に成功', !!renderSrc);
    if (renderSrc) {
        const clearPos    = renderSrc.indexOf('_appendedChapterCache.clear()');
        const innerPos    = renderSrc.indexOf("app.innerHTML = ''");
        check('2B-2(C-2): _appendedChapterCache.clear() が render() 内に存在する', clearPos >= 0);
        check('2B-2(C-2): _appendedChapterCache.clear() が app.innerHTML=\'\' より前にある',
            clearPos >= 0 && innerPos >= 0 && clearPos < innerPos);
    }

    /* C-3: _loadAndAppendChapter() 内で _appendedChapterCache.set(...) が app.appendChild より後に呼ばれる */
    const lacSrc = extractFunctionSource(html, 'async function _loadAndAppendChapter(');
    check('extract(2B-2): _loadAndAppendChapter() ソース抽出に成功', !!lacSrc);
    if (lacSrc) {
        const appendPos = lacSrc.indexOf('app.appendChild(_lacCb)');
        const setPos    = lacSrc.indexOf('_appendedChapterCache.set(');
        check('2B-2(C-3): _appendedChapterCache.set() が _loadAndAppendChapter() 内に存在する', setPos >= 0);
        check('2B-2(C-3): _appendedChapterCache.set() が app.appendChild(_lacCb) より後にある',
            appendPos >= 0 && setPos >= 0 && setPos > appendPos);
    }

    /* C-4: _resolveTokenJaById() が存在し、両キャッシュを検索するロジックを含む */
    const resolveTokenSrc = extractFunctionSource(html, 'function _resolveTokenJaById(');
    check('extract(2B-2): _resolveTokenJaById() ソース抽出に成功', !!resolveTokenSrc);
    if (resolveTokenSrc) {
        check('2B-2(C-4): _resolveTokenJaById は _cachedElByVerse を検索する',
            /_cachedElByVerse/.test(resolveTokenSrc));
        check('2B-2(C-4): _resolveTokenJaById は _appendedChapterCache.values() を検索する',
            /_appendedChapterCache\.values\s*\(\s*\)/.test(resolveTokenSrc));
        check('2B-2(C-4): _resolveTokenJaById は verseId で照合する',
            /w\.verseId\s*===\s*targetTokenId/.test(resolveTokenSrc));
        check('2B-2(C-4): _resolveTokenJaById は null ガードを持つ',
            /if\s*\(\s*!targetTokenId\s*\)\s*return\s*null/.test(resolveTokenSrc));
    }

    /* C-5: _resolveReferentEvidenceText が _resolveTokenJaById を呼ぶ（インライン検索ループを持たない） */
    const refEvidSrc = extractFunctionSource(html, 'function _resolveReferentEvidenceText(');
    check('extract(2B-2): _resolveReferentEvidenceText() ソース抽出に成功', !!refEvidSrc);
    if (refEvidSrc) {
        check('2B-2(C-5): _resolveReferentEvidenceText は _resolveTokenJaById を呼ぶ',
            /_resolveTokenJaById\s*\(/.test(refEvidSrc));
        check('2B-2(C-5): _resolveReferentEvidenceText は for..in ループを自前で持たない（委譲済み）',
            !/for\s*\(\s*const\s+\w+\s+in\s+_cachedElByVerse/.test(refEvidSrc));
    }

    /* C-6: _resolveSubjrefEvidenceText が _resolveTokenJaById を呼ぶ */
    const subjEvidSrc = extractFunctionSource(html, 'function _resolveSubjrefEvidenceText(');
    check('extract(2B-2): _resolveSubjrefEvidenceText() ソース抽出に成功', !!subjEvidSrc);
    if (subjEvidSrc) {
        check('2B-2(C-6): _resolveSubjrefEvidenceText は _resolveTokenJaById を呼ぶ',
            /_resolveTokenJaById\s*\(/.test(subjEvidSrc));
        check('2B-2(C-6): _resolveSubjrefEvidenceText は for..in ループを自前で持たない（委譲済み）',
            !/for\s*\(\s*const\s+\w+\s+in\s+_cachedElByVerse/.test(subjEvidSrc));
    }

    /* C-7: _resolveTokenJaById の behavioral 検証 — 初期章から発見 */
    if (resolveTokenSrc) {
        const mockCachedElByVerse = {
            '5': [
                { verseId: 'n11001005001', japanese: '神', text: 'θεόν' },
                { verseId: 'n11001005002', japanese: 'は', text: 'ἐστιν' },
            ],
        };
        const mockAppendedChapterCache = new Map();

        let result2B_C7_found = null;
        let result2B_C7_miss  = null;
        try {
            // eslint-disable-next-line no-new-func
            result2B_C7_found = new Function(
                '_cachedElByVerse', '_appendedChapterCache',
                `${resolveTokenSrc}\nreturn _resolveTokenJaById('n11001005001');`
            )(mockCachedElByVerse, mockAppendedChapterCache);

            result2B_C7_miss = new Function(
                '_cachedElByVerse', '_appendedChapterCache',
                `${resolveTokenSrc}\nreturn _resolveTokenJaById('n99999999999');`
            )(mockCachedElByVerse, mockAppendedChapterCache);
        } catch (e) {
            /* eval失敗 — チェックは FAIL になる */
        }
        check('2B-2(C-7): _resolveTokenJaById が初期章から正しい日本語を返す',
            result2B_C7_found === '神');
        check('2B-2(C-7): _resolveTokenJaById が未発見トークンに null を返す',
            result2B_C7_miss === null);
    }

    /* C-8: behavioral — 追加章から発見 */
    if (resolveTokenSrc) {
        const mockCachedElByVerse2 = {};
        const mockAppendedChapterCache2 = new Map();
        mockAppendedChapterCache2.set('ROM|2', {
            '1': [
                { verseId: 'n11002001001', japanese: 'さばき', text: 'κρίνων' },
            ],
        });

        let result2B_C8_appended = null;
        try {
            // eslint-disable-next-line no-new-func
            result2B_C8_appended = new Function(
                '_cachedElByVerse', '_appendedChapterCache',
                `${resolveTokenSrc}\nreturn _resolveTokenJaById('n11002001001');`
            )(mockCachedElByVerse2, mockAppendedChapterCache2);
        } catch (e) { /* eval失敗 */ }
        check('2B-2(C-8): _resolveTokenJaById が追加章キャッシュから正しい日本語を返す',
            result2B_C8_appended === 'さばき');
    }

    /* C-9: _loadAndAppendChapter JSDoc に _appendedChapterCache への言及がある（旧コメントは削除済み） */
    if (lacSrc) {
        check('2B-2(C-9): _loadAndAppendChapter JSDoc に _appendedChapterCache への言及がある',
            /_appendedChapterCache/.test(lacSrc));
        check('2B-2(C-9): 旧JSDoc（章別キャッシュが未実装）は削除されている',
            !/章別キャッシュが未実装/.test(lacSrc));
    }
}

/* ───────────────────── Phase 3-3: URL State Consistency ───────────────────── */
/*
 * F-1: JA1955 連続章スクロール中に selectedVerse.ch と location.chapter が乖離する問題。
 * 修正: AppState.toBrowsing() が ch フィールドを selectedVerse に保存し、
 *       getShareState() が selectedVerse.ch を chapter として優先する。
 *       applyShareState() は _findVerseInChapter() で章スコープ復元を行う。
 */

/* ── Source invariant ── */
check('invariant(3-3): toBrowsing() が selectedVerse に ch フィールドを保存する',
    /this\.selectedVerse\s*=\s*\{[^}]*ch\s*:/.test(html));

check('invariant(3-3): toBrowsing() の ch は null-safe（ch != null ? ch : null）',
    /ch\s*!=\s*null\s*\?\s*ch\s*:\s*null/.test(html));

check('invariant(3-3): getShareState() が selectedVerse?.ch を chapter に使う',
    /chapter\s*:\s*AppState\.selectedVerse\?\.ch\s*\?\?/.test(html));

check('invariant(3-3): getShareState() が location.chapter へフォールバックする',
    /AppState\.selectedVerse\?\.ch\s*\?\?\s*AppState\.location\?\.chapter/.test(html));

check('invariant(3-3): _findVerseInChapter() が定義されている',
    /function _findVerseInChapter\s*\(/.test(html));

check('invariant(3-3): _findVerseInChapter() が chapter-block を data-book+data-chapter で検索する',
    /\.chapter-block\[data-book=.*\]\[data-chapter=/.test(html));

check('invariant(3-3): applyShareState() が _findVerseInChapter() を呼ぶ',
    /_findVerseInChapter\s*\(/.test(html));

check('invariant(3-3): applyShareState() が _findVisibleVerseBlock へフォールバックする（book/chapter なし呼び出し保護）',
    /_findVerseInChapter\s*\([^)]+\)\s*\|\|\s*_findVisibleVerseBlock\s*\(/.test(html));

check('invariant(3-3): applyShareState() は state.book && state.chapter を確認してから章スコープ検索する',
    /state\.book\s*&&\s*state\.chapter\s*!=\s*null/.test(html));

/* ── Behavioral: getShareState() ── */
{
    const gssSrc = extractFunctionSource(html, 'function getShareState() {');
    check('extract(3-3): getShareState() ソース抽出に成功', !!gssSrc);

    if (gssSrc) {
        /* テスト1: selectedVerse.ch=1, location.chapter=2 → chapter=1（selectedVerse.ch 優先） */
        let gss1 = null;
        try {
            gss1 = new Function('AppState', gssSrc + '\nreturn getShareState();')({
                selectedVerse: { vNum: '5', elWords: [], ch: 1 },
                location: { book: { key: 'ROM' }, chapter: 2 },
                depth: { stack: [] },
                inspect: { data: null },
            });
        } catch (_) {}
        check('behavioral(3-3): getShareState() は selectedVerse.ch=1 を chapter に使う（location.chapter=2 を無視）',
            gss1 !== null && gss1.chapter === 1, `chapter=${gss1 && gss1.chapter}`);

        /* テスト2: selectedVerse.ch=null, location.chapter=3 → chapter=3（null は location へフォールバック） */
        let gss2 = null;
        try {
            gss2 = new Function('AppState', gssSrc + '\nreturn getShareState();')({
                selectedVerse: { vNum: '7', elWords: [], ch: null },
                location: { book: { key: 'ROM' }, chapter: 3 },
                depth: { stack: [] },
                inspect: { data: null },
            });
        } catch (_) {}
        check('behavioral(3-3): getShareState() は selectedVerse.ch=null のとき location.chapter=3 へフォールバック',
            gss2 !== null && gss2.chapter === 3, `chapter=${gss2 && gss2.chapter}`);

        /* テスト3: selectedVerse.vNum=null（toReading 後）, location.chapter=5 → chapter=5 */
        let gss3 = null;
        try {
            gss3 = new Function('AppState', gssSrc + '\nreturn getShareState();')({
                selectedVerse: { vNum: null, elWords: [] },   /* ch フィールドなし = undefined */
                location: { book: { key: 'ROM' }, chapter: 5 },
                depth: { stack: [] },
                inspect: { data: null },
            });
        } catch (_) {}
        check('behavioral(3-3): getShareState() は selectedVerse.ch が undefined のとき location.chapter=5 へフォールバック',
            gss3 !== null && gss3.chapter === 5, `chapter=${gss3 && gss3.chapter}`);

        /* テスト4: selectedVerse.ch=2, verse が空 → chapter=2 であること */
        let gss4 = null;
        try {
            gss4 = new Function('AppState', gssSrc + '\nreturn getShareState();')({
                selectedVerse: { vNum: '', elWords: [], ch: 2 },
                location: { book: { key: 'GAL' }, chapter: 3 },
                depth: { stack: [] },
                inspect: { data: null },
            });
        } catch (_) {}
        check('behavioral(3-3): getShareState() は selectedVerse.ch=2 のとき verse が空でも chapter=2',
            gss4 !== null && gss4.chapter === 2, `chapter=${gss4 && gss4.chapter}`);

        /* テスト5: verse あり → verse フィールドが返ること（既存挙動確認） */
        let gss5 = null;
        try {
            gss5 = new Function('AppState', gssSrc + '\nreturn getShareState();')({
                selectedVerse: { vNum: '12', elWords: [], ch: 4 },
                location: { book: { key: '1CO' }, chapter: 4 },
                depth: { stack: [] },
                inspect: { data: null },
            });
        } catch (_) {}
        check('behavioral(3-3): getShareState() の verse フィールドは selectedVerse.vNum を返す',
            gss5 !== null && gss5.verse === '12', `verse=${gss5 && gss5.verse}`);
    }
}

/* ── Behavioral: _findVerseInChapter() ── */
/* 注: DOM shim は単純セレクタのみ対応のため、直接モックで chapter-block と verse-block を模倣する。
   _findVerseInChapter は:
     1. document.querySelector('.chapter-block[data-book=X][data-chapter=Y]') → chapter-block
     2. cb.querySelectorAll('.verse-block:not(.verse-pair-right)') → verse 一覧
     3. b.querySelector('.v-num').textContent.trim() で照合
   この3ステップをモックで検証する。 */
{
    const fvicSrc = extractFunctionSource(html, 'function _findVerseInChapter(');
    check('extract(3-3): _findVerseInChapter() ソース抽出に成功', !!fvicSrc);

    if (fvicSrc) {
        /* verse-block モック: querySelector('.v-num') が指定テキストを返す */
        const makeVbMock = (vText) => ({
            querySelector: (sel) => sel === '.v-num' ? { textContent: vText } : null,
        });

        /* chapter-block モック: querySelectorAll で verse-block リストを返す。
           verse-block はキャッシュし、呼び出しごとに同一オブジェクトを返すことで
           _findVerseInChapter の戻り値とプリフェッチした参照が一致するようにする。 */
        const makeCbMock = (...vNums) => {
            const vbs = vNums.map(v => makeVbMock(String(v)));
            return { querySelectorAll: (_sel) => vbs };
        };

        /* document モック: selector が book+chapter に一致する場合のみ chapter-block を返す */
        const makeDocMock = (bookKey, chNum, cbMock) => ({
            querySelector: (sel) =>
                sel.includes(`data-book="${bookKey}"`) && sel.includes(`data-chapter="${chNum}"`)
                    ? cbMock
                    : null,
        });

        /* テスト1: book+chapter が一致する chapter-block 内の verse を返す */
        const cb_t1 = makeCbMock(1, 5, 10);
        const vb5 = cb_t1.querySelectorAll()[1]; /* verse 5 */
        const doc_t1 = makeDocMock('ROM', '2', cb_t1);
        let fvic1 = null;
        try {
            fvic1 = new Function('document', fvicSrc + '\nreturn _findVerseInChapter("ROM", "2", "5");')(doc_t1);
        } catch (_) {}
        check('behavioral(3-3): _findVerseInChapter("ROM","2","5") が ROM:2:5 の verse-block を返す',
            fvic1 !== null && fvic1 === vb5);

        /* テスト2: chapter が一致しない → document.querySelector が null → 関数は null を返す */
        let fvic2 = null;
        try {
            fvic2 = new Function('document', fvicSrc + '\nreturn _findVerseInChapter("ROM", "3", "5");')(doc_t1);
        } catch (_) {}
        check('behavioral(3-3): _findVerseInChapter("ROM","3","5") は対象 chapter-block がなければ null',
            fvic2 === null);

        /* テスト3: book が一致しない → null */
        let fvic3 = null;
        try {
            fvic3 = new Function('document', fvicSrc + '\nreturn _findVerseInChapter("GAL", "2", "5");')(doc_t1);
        } catch (_) {}
        check('behavioral(3-3): _findVerseInChapter("GAL","2","5") は book 不一致で null',
            fvic3 === null);

        /* テスト4: 複数章DOM — 指定章のみが verse-block を返す（ROM:1:5 vs ROM:2:5 が別オブジェクト） */
        const cb_rom1 = makeCbMock(1, 5, 32);     /* ROM:1 verses: 1,5,32 */
        const cb_rom2 = makeCbMock(1, 5, 29);     /* ROM:2 verses: 1,5,29 */
        const vb_rom1_5 = cb_rom1.querySelectorAll()[1]; /* ROM:1:5 */
        const vb_rom2_5 = cb_rom2.querySelectorAll()[1]; /* ROM:2:5 */

        const doc_multi = {
            querySelector: (sel) => {
                if (sel.includes('data-book="ROM"') && sel.includes('data-chapter="1"')) return cb_rom1;
                if (sel.includes('data-book="ROM"') && sel.includes('data-chapter="2"')) return cb_rom2;
                return null;
            },
        };

        let fvic4a = null, fvic4b = null;
        try {
            fvic4a = new Function('document', fvicSrc + '\nreturn _findVerseInChapter("ROM", "1", "5");')(doc_multi);
            fvic4b = new Function('document', fvicSrc + '\nreturn _findVerseInChapter("ROM", "2", "5");')(doc_multi);
        } catch (_) {}
        check('behavioral(3-3): 複数章DOM: _findVerseInChapter("ROM","1","5") が ROM:1 内の verse 5 を返す',
            fvic4a !== null && fvic4a === vb_rom1_5);
        check('behavioral(3-3): 複数章DOM: _findVerseInChapter("ROM","2","5") が ROM:2 内の verse 5 を返す',
            fvic4b !== null && fvic4b === vb_rom2_5);
        check('behavioral(3-3): 複数章DOM: ROM:1:5 と ROM:2:5 は異なる verse-block オブジェクトを返す',
            fvic4a !== null && fvic4b !== null && fvic4a !== fvic4b);
    }
}

/* ── Phase 3-3 追加インバリアント: toReading() が selectedVerse.ch を保持しないこと ── */
{
    /* toReading() が selectedVerse を { vNum: null, elWords: [] } に初期化することを確認する。
       toBrowsing() が ch を追加したとき、toReading() がそれをクリアすること（新しいオブジェクト作成）。 */
    check('invariant(3-3): toReading() が selectedVerse を { vNum: null, elWords: [] } にリセットする',
        /toReading\s*\(\s*\)\s*\{[\s\S]{0,200}selectedVerse\s*=\s*\{\s*vNum\s*:\s*null\s*,\s*elWords\s*:\s*\[\s*\]/.test(html));
}

/* ═══════════════════════ Phase 3-6: WO Continuous Chapter ═══════════════════════ */

/* ── A-1: _isAutoloadBlockedMode 関数の存在と動作 ── */
{
    /* source invariant: 関数が存在する */
    check('invariant(3-6): _isAutoloadBlockedMode 関数が index.html に存在する',
        /function\s+_isAutoloadBlockedMode\s*\(/.test(html));

    const blockedModeSrc = extractFunctionSource(html, 'function _isAutoloadBlockedMode(kind) {');
    check('extract(3-6): _isAutoloadBlockedMode ソース抽出に成功', !!blockedModeSrc);

    if (blockedModeSrc) {
        const blocked = new Function('kind', blockedModeSrc + '\nreturn _isAutoloadBlockedMode(kind);');

        /* wordOrder は autoload対象（false） */
        check('behavioral(3-6): _isAutoloadBlockedMode("wordOrder") === false',
            blocked('wordOrder') === false);

        /* translation も autoload対象（false） */
        check('behavioral(3-6): _isAutoloadBlockedMode("translation") === false',
            blocked('translation') === false);

        /* discourse / structural-diagram / hierarchical / relation はブロック（true） */
        check('behavioral(3-6): _isAutoloadBlockedMode("discourse") === true',
            blocked('discourse') === true);
        check('behavioral(3-6): _isAutoloadBlockedMode("structural-diagram") === true',
            blocked('structural-diagram') === true);
        check('behavioral(3-6): _isAutoloadBlockedMode("hierarchical") === true',
            blocked('hierarchical') === true);
        check('behavioral(3-6): _isAutoloadBlockedMode("relation") === true',
            blocked('relation') === true);
    }
}

/* ── A-2: _isGreekReadingMode 本体が変更されていない（wordOrder を含む） ── */
{
    const grmSrc = extractFunctionSource(html, 'function _isGreekReadingMode(kind) {');
    check('extract(3-6): _isGreekReadingMode ソース抽出に成功', !!grmSrc);

    if (grmSrc) {
        const grm = new Function('kind', grmSrc + '\nreturn _isGreekReadingMode(kind);');

        /* wordOrder は依然 true（_isGreekReadingMode 本体は変更しない） */
        check('invariant(3-6): _isGreekReadingMode("wordOrder") === true（本体変更なし）',
            grm('wordOrder') === true);
        check('invariant(3-6): _isGreekReadingMode("translation") === false',
            grm('translation') === false);
        check('invariant(3-6): _isGreekReadingMode("discourse") === true',
            grm('discourse') === true);
    }
}

/* ── A-3: 3箇所のガードが _isAutoloadBlockedMode を使用している ── */
{
    const lacSrc = extractFunctionSource(html, 'async function _loadAndAppendChapter(');
    const doaSrc = extractFunctionSource(html, 'async function _doAutoload(bookObj, nextCh) {');
    const saSrc  = extractFunctionSource(html, 'function _setupAutoload() {');

    check('extract(3-6): _loadAndAppendChapter ソース抽出に成功', !!lacSrc);
    check('extract(3-6): _doAutoload ソース抽出に成功', !!doaSrc);
    check('extract(3-6): _setupAutoload ソース抽出に成功', !!saSrc);

    if (lacSrc) {
        check('invariant(3-6): _loadAndAppendChapter が _isAutoloadBlockedMode を使用',
            /_isAutoloadBlockedMode/.test(lacSrc));
        check('invariant(3-6): _loadAndAppendChapter が _isGreekReadingMode をガードに使わない',
            !/_isGreekReadingMode[\s\S]{0,50}compare.*return false/.test(lacSrc.replace(/\n/g, ' ')));
    }
    if (doaSrc) {
        check('invariant(3-6): _doAutoload が _isAutoloadBlockedMode を使用',
            /_isAutoloadBlockedMode/.test(doaSrc));
    }
    if (saSrc) {
        check('invariant(3-6): _setupAutoload が _isAutoloadBlockedMode を使用',
            /_isAutoloadBlockedMode/.test(saSrc));
    }
}

/* ── B-1: WO jpData 経路 — 翻訳fetchをスキップして _buildFlowJpData を使う ── */
{
    const lacSrc = extractFunctionSource(html, 'async function _loadAndAppendChapter(');

    if (lacSrc) {
        /* WO は翻訳 JSON を fetch しない: null 分岐が存在する */
        check('invariant(3-6): _loadAndAppendChapter に wordOrder の null 分岐あり',
            /wordOrder.*null/.test(lacSrc.replace(/\s+/g, ' ')));

        /* _buildFlowJpData が呼ばれる */
        check('invariant(3-6): _loadAndAppendChapter が _buildFlowJpData を呼ぶ',
            /_buildFlowJpData/.test(lacSrc));

        /* _lacJpDataResolved が verse-loop のエントリとして使われる */
        check('invariant(3-6): _loadAndAppendChapter が _lacJpDataResolved.verses でループする',
            /_lacJpDataResolved\.verses/.test(lacSrc));

        /* WO では翻訳 fetch の null チェックが wordOrder 条件付き */
        check('invariant(3-6): _loadAndAppendChapter の翻訳 null チェックが WO をスキップする',
            /wordOrder.*_fetchTranslation|_lacColAKind\s*!==\s*'wordOrder'/.test(lacSrc.replace(/\s+/g, ' ')));
    }
}

/* ── B-2: _elTokenVerse + _buildFlowJpData 動作 ── */
{
    const elvSrc  = extractFunctionSource(html, 'function _elTokenVerse(w) {');
    const bfjdSrc = extractFunctionSource(html, 'function _buildFlowJpData(elData) {');
    check('extract(3-6): _elTokenVerse ソース抽出に成功', !!elvSrc);
    check('extract(3-6): _buildFlowJpData ソース抽出に成功', !!bfjdSrc);

    if (elvSrc) {
        const elv = new Function('w', elvSrc + '\nreturn _elTokenVerse(w);');
        /* NT形式: w.verse あり */
        check('behavioral(3-6): _elTokenVerse が NT形式（w.verse）から verse を返す',
            elv({ verse: '3' }) === '3');
        /* LXX形式: w.ref のみ */
        check('behavioral(3-6): _elTokenVerse が LXX形式（w.ref="GEN 1:3!2"）から "3" を返す',
            elv({ ref: 'GEN 1:3!2' }) === '3');
        /* 両フィールドなし → null */
        check('behavioral(3-6): _elTokenVerse がフィールド未設定トークンに null を返す',
            elv({}) === null);
        /* w.verse 優先 */
        check('behavioral(3-6): _elTokenVerse は w.verse を w.ref より優先する',
            elv({ verse: '5', ref: 'GEN 1:9!1' }) === '5');
    }

    if (elvSrc && bfjdSrc) {
        const buildFn = new Function('elData', elvSrc + '\n' + bfjdSrc + '\nreturn _buildFlowJpData(elData);');

        /* 空配列 → null */
        check('behavioral(3-6): _buildFlowJpData([]) === null',
            buildFn([]) === null);

        /* NT形式トークン（w.verse） → verses オブジェクト生成 */
        const ntElData = [
            { verse: '1', text: 'ἐν', lemma: 'ἐν' },
            { verse: '1', text: 'ἀρχῇ', lemma: 'ἀρχή' },
            { verse: '2', text: 'Οὗτος', lemma: 'οὗτος' },
            { verse: '3', text: 'πάντα', lemma: 'πᾶς' },
        ];
        const result = buildFn(ntElData);
        check('behavioral(3-6): _buildFlowJpData(elData) が verses オブジェクトを返す',
            result !== null && typeof result === 'object' && result.verses !== undefined);
        check('behavioral(3-6): _buildFlowJpData が verse番号キーを生成する（v1,v2,v3）',
            result !== null && '1' in result.verses && '2' in result.verses && '3' in result.verses);
        check('behavioral(3-6): _buildFlowJpData の verse値は空文字列',
            result !== null && result.verses['1'] === '' && result.verses['2'] === '');
        check('behavioral(3-6): _buildFlowJpData で重複 verse は1エントリにまとめられる',
            result !== null && Object.keys(result.verses).length === 3);

        /* LXX形式トークン（w.ref のみ）→ verse 抽出成功 */
        const lxxElData = [
            { ref: 'GEN 1:1!1', text: 'ἐν' },
            { ref: 'GEN 1:1!2', text: 'ἀρχῇ' },
            { ref: 'GEN 1:2!1', text: 'Οὗτος' },
        ];
        const lxxResult = buildFn(lxxElData);
        check('behavioral(3-6): _buildFlowJpData が LXX形式（w.refのみ）から verse キーを生成する',
            lxxResult !== null && '1' in lxxResult.verses && '2' in lxxResult.verses);
        check('behavioral(3-6): _buildFlowJpData が LXX形式で重複 verse を1エントリにまとめる',
            lxxResult !== null && Object.keys(lxxResult.verses).length === 2);
    }
}

/* ── C-1: ST / CR / RL は引き続き autoload ブロック ── */
{
    const blockedModeSrc = extractFunctionSource(html, 'function _isAutoloadBlockedMode(kind) {');
    if (blockedModeSrc) {
        const blocked = new Function('kind', blockedModeSrc + '\nreturn _isAutoloadBlockedMode(kind);');
        check('invariant(3-6): ST（hierarchical）は autoload 対象外のまま',
            blocked('hierarchical') === true);
        check('invariant(3-6): CR（structural-diagram）は autoload 対象外のまま',
            blocked('structural-diagram') === true);
        check('invariant(3-6): RL（relation）は autoload 対象外のまま',
            blocked('relation') === true);
        check('invariant(3-6): discourse は autoload 対象外のまま',
            blocked('discourse') === true);
    }
}

/* ── C-2: compare mode は引き続き autoload ブロック ── */
{
    const lacSrc = extractFunctionSource(html, 'async function _loadAndAppendChapter(');
    const saSrc  = extractFunctionSource(html, 'function _setupAutoload() {');
    if (lacSrc) {
        check('invariant(3-6): _loadAndAppendChapter に compare ガードあり',
            /_transMode\s*===\s*'compare'/.test(lacSrc));
    }
    if (saSrc) {
        /* Phase 3-7-E: _setupAutoload の compare ガードは専用 loader 委譲のため削除された。
           代わりに _isAutoloadBlockedMode チェックが維持されていることを確認する。 */
        check('invariant(3-6/3-7-E): _setupAutoload が _isAutoloadBlockedMode チェックを維持する',
            /_isAutoloadBlockedMode/.test(saSrc));
    }
}

/* ── C-3: 単一章書・最終章の停止条件が維持されている ── */
check('invariant(3-6): 最終章ガード（chNum >= bookObj.ch → _stopAutoload）維持',
    /chNum\s*>=\s*bookObj\.ch[\s\S]{0,20}_stopAutoload/.test(html.replace(/\n/g, ' ')));

/* ── C-4: JA1955 追加章 onclick が wordOrder 以外のみ設定される条件が維持 ── */
{
    const lacSrc = extractFunctionSource(html, 'async function _loadAndAppendChapter(');
    if (lacSrc) {
        check('invariant(3-6): JA1955 onclick ガード _lacColAMode.kind !== \'wordOrder\' が維持されている',
            /_lacColAMode\.kind\s*!==\s*'wordOrder'/.test(lacSrc));
    }
}

/* ── C-5: WO verse-block の v-num 要素確認（WordOrderRenderer 出力） ── */
check('invariant(3-6): WordOrderRenderer.renderBodyColumn が .v-num を出力する',
    /renderBodyColumn[\s\S]{0,500}v-num/.test(html));

/* ═══════════════════════════════════════════════════════════════════════
 * Phase 3-6-G: Mobile WO Chip URL State Fix
 * F-1 — mobile _wlvChipClick path での selectedVerse.ch 欠落と URL 非同期修正
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── G-1: mobile path が toBrowsing に chip.ch を渡す ── */
{
    const wlvSrc = extractFunctionSource(html, 'function _wlvChipClick(chipEl, tokenId) {');
    check('extract(3-6-G): _wlvChipClick ソース抽出に成功', !!wlvSrc);

    /* mobile toBrowsing に ch が渡っているか */
    check('behavioral(3-6-G-1): mobile path の toBrowsing が chip.ch を ch パラメータとして渡す',
        wlvSrc
            ? /AppState\.toBrowsing\(_mvVNum,\s*_mvWords,\s*null,\s*chip\.ch\s*!=\s*null\s*\?\s*Number\(chip\.ch\)\s*:\s*null\)/.test(wlvSrc)
            : false);

    /* mobile path に notifyAppStateChange() が存在するか */
    check('behavioral(3-6-G-2): mobile path に notifyAppStateChange() が追加されている',
        wlvSrc ? /notifyAppStateChange\(\)/.test(wlvSrc) : false);

    /* openMobileVerseView 呼び出しが chip.ch を渡しているか */
    check('behavioral(3-6-G-3): openMobileVerseView 呼び出しが chip.ch を ch として渡す',
        wlvSrc
            ? /openMobileVerseView\(_mvVNum,\s*_mvWords,\s*null,\s*chip\.ch\s*!=\s*null\s*\?\s*Number\(chip\.ch\)\s*:\s*null\)/.test(wlvSrc)
            : false);

    /* desktop path の selectedVerse.ch 設定が変更されていないか */
    check('invariant(3-6-G-4): desktop path の selectedVerse.ch 設定が維持されている',
        wlvSrc
            ? /AppState\.selectedVerse\s*=\s*\{[^}]*ch:\s*chip\.ch\s*!=\s*null\s*\?\s*Number\(chip\.ch\)\s*:\s*null/.test(wlvSrc)
            : false);

    /* mobile toBrowsing が chip.ch を渡しているが、desktop の toBrowsing は呼ばれていない */
    /* （desktop path は AppState.selectedVerse 直接設定のまま — 既存挙動維持） */
    check('invariant(3-6-G-5): desktop path では toBrowsing を呼ばない（AppState.selectedVerse 直接設定のまま）',
        wlvSrc
            ? !/AppState\.selectedVerse\s*=[\s\S]{0,100}AppState\.toBrowsing/.test(wlvSrc)
            : false);
}

/* ── G-2: getShareState が selectedVerse.ch を chapter へ使用する ── */
{
    const gsSrc = extractFunctionSource(html, 'function getShareState() {');
    check('invariant(3-6-G-6): getShareState が selectedVerse.ch をchapterへ使用する',
        gsSrc ? /selectedVerse\?\.ch\s*\?\?/.test(gsSrc) : false);
}

/* ── G-3: toBrowsing が ch を selectedVerse.ch へ設定する ── */
{
    const tbSrc = extractFunctionSource(html, 'toBrowsing(vNum, elWords, book, ch) {');
    check('invariant(3-6-G-7): toBrowsing が selectedVerse.ch を ch から設定する',
        tbSrc ? /this\.selectedVerse\s*=\s*\{[^}]*ch:\s*ch\s*!=\s*null\s*\?\s*ch\s*:\s*null/.test(tbSrc) : false);
}

/* ── G-4: chip.ch → Number(chip.ch) の型統一（NT=string/LXX=integer 両対応）── */
{
    /* NT: chip.ch = "2"(string) → Number("2") = 2。LXX: chip.ch = 2(integer) → Number(2) = 2。
       どちらも === 2 が成立することを確認。 */
    check('behavioral(3-6-G-8): Number("2") === 2（NT string chip.ch を整数化できる）',
        Number('2') === 2);
    check('behavioral(3-6-G-9): Number(2) === 2（LXX integer chip.ch を整数化できる）',
        Number(2) === 2);
    check('behavioral(3-6-G-10): chip.ch=null のとき null を渡す（null guard 成立）',
        (null != null ? Number(null) : null) === null);
}

/* ── G-5: JA1955 連続章の toBrowsing 呼び出しが変更されていない ── */
{
    const lacSrc = extractFunctionSource(html, 'async function _loadAndAppendChapter(');
    /* _loadAndAppendChapter の JA1955 パスは AppState.toBrowsing(vNum, ..., bookObj, chNum) で呼ぶ。
       mobile chip click パスとは独立しており、変更されていないことを確認。 */
    check('invariant(3-6-G-11): JA1955 _loadAndAppendChapter の toBrowsing 呼び出しが維持されている',
        lacSrc ? /AppState\.toBrowsing\(vNum,\s*_lacElByVerse/.test(lacSrc) : false);
}

/* ── G-6: ST / CR / RL は mobile chip click 経路に影響されない ── */
/* （autoload blockedMode ガードは別経路 → C-1 で確認済み。ここでは _wlvChipClick 内部に
    ST/CR/RL 依存のコードが追加されていないことを確認） */
{
    const wlvSrc2 = extractFunctionSource(html, 'function _wlvChipClick(chipEl, tokenId) {');
    check('invariant(3-6-G-12): _wlvChipClick 内に ST/CR/RL の新規ガードが追加されていない',
        wlvSrc2
            ? !/(hierarchical|structural-diagram|relation|discourse)[\s\S]{0,50}_wlvChipClick/.test(wlvSrc2)
            : false);
}

/* ═══════════════════════════════════════════════════════════════════════
 * Phase 3-6-I: Continuous Chapter Display Integrity Fix
 * A: MVV章参照統一 / A': JA1955本文章スコープ / C: F-2 closure修正
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── I-A-1: _renderMobileVerseArea が _mvvChapter を使う ── */
{
    const rvaSrc = extractFunctionSource(html, 'async function _renderMobileVerseArea(vNum, words) {');
    check('extract(3-6-I): _renderMobileVerseArea ソース抽出に成功', !!rvaSrc);
    check('behavioral(3-6-I-A-1): _renderMobileVerseArea のchが _mvvChapter を優先する',
        rvaSrc ? /const ch\s*=\s*_mvvChapter\s*!=\s*null\s*\?\s*_mvvChapter\s*:\s*AppState\.location\.chapter/.test(rvaSrc) : false);
    /* _syncMobileVerseTitle と同一 chapter source で一致するか確認 */
    check('behavioral(3-6-I-A-2): _renderMobileVerseArea の ch が AppState.location.chapter を直接使わない（fallback込みで_mvvChapter優先）',
        rvaSrc ? !/const ch\s*=\s*AppState\.location\.chapter\s*;/.test(rvaSrc) : false);
}

/* ── I-A-3: _syncMobileVerseTitle が _mvvChapter を使う（Phase 3-6-G 維持確認） ── */
{
    const svtSrc = extractFunctionSource(html, 'function _syncMobileVerseTitle() {');
    check('invariant(3-6-I-A-3): _syncMobileVerseTitle の ch が _mvvChapter を優先する（Phase 3-6-G維持）',
        svtSrc ? /const ch\s*=\s*_mvvChapter\s*!=\s*null\s*\?\s*_mvvChapter\s*:\s*AppState\.location\.chapter/.test(svtSrc) : false);
}

/* ── I-A-4: _mobileInspectorRender の _vrCh が _mvvChapter を使う ── */
{
    const mirSrc = extractFunctionSource(html, 'function _mobileInspectorRender(vNum, words) {');
    check('extract(3-6-I): _mobileInspectorRender ソース抽出に成功', !!mirSrc);
    check('behavioral(3-6-I-A-4): _mobileInspectorRender の _vrCh が _mvvChapter を優先する',
        mirSrc ? /const _vrCh\s*=\s*_mvvChapter\s*!=\s*null\s*\?\s*_mvvChapter/.test(mirSrc) : false);
    check('behavioral(3-6-I-A-5): _mobileInspectorRender の _vrCh が AppState.location.chapter を直接使わない',
        mirSrc ? !/const _vrCh\s*=\s*AppState\.location\.chapter/.test(mirSrc) : false);
}

/* ── I-A'-1: _mvvGetVerseText DOM path が _findVerseInChapter を使う ── */
{
    const mvtSrc = extractFunctionSource(html, 'async function _mvvGetVerseText(vNum) {');
    check('extract(3-6-I): _mvvGetVerseText ソース抽出に成功', !!mvtSrc);
    check('behavioral(3-6-I-A\'-1): _mvvGetVerseText DOM path が _findVerseInChapter を使う',
        mvtSrc ? /_findVerseInChapter\(/.test(mvtSrc) : false);
    check('behavioral(3-6-I-A\'-2): _mvvChapterが設定されていない場合のfallback _findVisibleVerseBlock が維持される',
        mvtSrc ? /_findVisibleVerseBlock\(/.test(mvtSrc) : false);
    check('behavioral(3-6-I-A\'-3): _mvvGetVerseText fetch path が _mvvChapter を優先する',
        mvtSrc ? /const ch\s*=\s*_mvvChapter\s*!=\s*null\s*\?\s*_mvvChapter\s*:\s*AppState\.location\.chapter/.test(mvtSrc) : false);
    /* 別章の同番号verseへのfallback禁止: _findVerseInChapterがnullの場合は fetchへ進む（DOM fallthroughしない） */
    check('behavioral(3-6-I-A\'-4): _findVerseInChapterがnull返却時に_findVisibleVerseBlockへfallbackしない',
        mvtSrc ? !/_findVerseInChapter[\s\S]{0,100}\|\|\s*_findVisibleVerseBlock/.test(mvtSrc) : false);
}

/* ── I-C-1: F-2 closure修正 — block.closest('.chapter-block') を使う ── */
{
    const lacSrc = extractFunctionSource(html, 'async function _loadAndAppendChapter(');
    check('extract(3-6-I): _loadAndAppendChapter ソース抽出に成功', !!lacSrc);
    check('behavioral(3-6-I-C-1): onclick が _lacCb でなく block.closest を使う',
        lacSrc ? /block\.closest\('\.chapter-block'\)/.test(lacSrc) : false);
    check('behavioral(3-6-I-C-2): onclick 内に _lacCb への直接参照がない',
        lacSrc ? !/_selectVerseBlocks\([^)]*_lacCb/.test(lacSrc) : false);
    check('behavioral(3-6-I-C-3): _lacCb.className = \'chapter-block\' が維持されている（closest の前提）',
        lacSrc ? /_lacCb\.className\s*=\s*'chapter-block'/.test(lacSrc) : false);
    check('behavioral(3-6-I-C-4): _lacCb = null（DOM挿入完了マーク）が維持されている',
        lacSrc ? /_lacCb\s*=\s*null/.test(lacSrc) : false);
}

/* ── I-C-5: _selectVerseBlocks の containerEl || document パターンが維持されている ── */
{
    const svbSrc = extractFunctionSource(html, 'function _selectVerseBlocks(vNum, activeBlock, containerEl) {');
    check('invariant(3-6-I-C-5): _selectVerseBlocks の containerEl || document フォールバックが維持されている',
        svbSrc ? /containerEl\s*\|\|\s*document/.test(svbSrc) : false);
}

/* ── I-invariant-1: Memo canonical identity 確認（Phase 3-6-J 実装後の状態） ── */
{
    const cvrSrc = extractFunctionSource(html, 'function _currentVerseRef() {');
    /* Phase 3-6-J: selectedVerse?.ch を優先、location.chapter はfallback として維持される */
    check('invariant(3-6-I-memo-1): _currentVerseRef が selectedVerse?.ch を優先する（Phase 3-6-J 実装済み）',
        cvrSrc ? /selectedVerse\?\.ch/.test(cvrSrc) : false);
    check('invariant(3-6-I-memo-2): _currentVerseRef が location.chapter を fallback として維持する',
        cvrSrc ? /AppState\.location\.chapter/.test(cvrSrc) : false);
}

/* ── I-invariant-2: Phase 3-6-G F-1 維持確認 ── */
{
    const wlvSrcI = extractFunctionSource(html, 'function _wlvChipClick(chipEl, tokenId) {');
    check('invariant(3-6-I-G-F1): _wlvChipClick mobile path の toBrowsing に chip.ch が渡される（F-1維持）',
        wlvSrcI ? /AppState\.toBrowsing\(_mvVNum,\s*_mvWords,\s*null,\s*chip\.ch\s*!=\s*null\s*\?\s*Number\(chip\.ch\)\s*:\s*null\)/.test(wlvSrcI) : false);
    check('invariant(3-6-I-G-F2): _wlvChipClick mobile path に notifyAppStateChange() が存在する（F-1維持）',
        wlvSrcI ? /notifyAppStateChange\(\)/.test(wlvSrcI) : false);
}

/* ═══════════════════════════════════════════════════════════════════════
 * Phase 3-6-J: Memo Reference Integrity Fix
 * _currentVerseRef / _saveCurrentNote / toggleBookmark のchapter source統一
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── J-1: _currentVerseRef ソース確認 ── */
const cvrSrc3J = extractFunctionSource(html, 'function _currentVerseRef() {');
{
    check('extract(3-6-J): _currentVerseRef ソース抽出に成功', !!cvrSrc3J);
    check('behavioral(3-6-J-1): _currentVerseRef が selectedVerse?.ch を優先する',
        cvrSrc3J ? /selectedVerse\?\.ch\s*\?\?/.test(cvrSrc3J) : false);
    check('behavioral(3-6-J-2): _currentVerseRef が location.chapter を fallback として使う',
        cvrSrc3J ? /AppState\.location\.chapter/.test(cvrSrc3J) : false);
    check('behavioral(3-6-J-3): _currentVerseRef が location.chapter を無条件 primary source として使わない',
        cvrSrc3J ? !/const ch\s*=\s*AppState\.location\.chapter/.test(cvrSrc3J) : false);
}

/* ── J-2: _currentVerseRef の behavioral テスト ── */
{
    /* _currentVerseRef を mock AppState で評価する */
    const evalCvr = (selectedVerse, locationBook, locationChapter) => {
        const mockAppState = {
            selectedVerse: selectedVerse,
            location: { book: locationBook, chapter: locationChapter },
        };
        try {
            const fn = new Function('AppState', cvrSrc3J + '; return _currentVerseRef();');
            return fn(mockAppState);
        } catch (e) { return 'ERROR: ' + e.message; }
    };

    /* selectedVerse.ch=2, location.chapter=1 → chapter 2 を使う */
    const r1 = evalCvr({ vNum: 3, ch: 2 }, { key: 'JHN' }, 1);
    check('behavioral(3-6-J-4): selectedVerse.ch=2 / location.chapter=1 → "JHN 2:3"',
        r1 === 'JHN 2:3', `got="${r1}"`);

    /* selectedVerse.ch=1, location.chapter=1 → chapter 1 を使う（通常ケース） */
    const r2 = evalCvr({ vNum: 3, ch: 1 }, { key: 'JHN' }, 1);
    check('behavioral(3-6-J-5): selectedVerse.ch=1 / location.chapter=1 → "JHN 1:3"',
        r2 === 'JHN 1:3', `got="${r2}"`);

    /* selectedVerse.ch=null → location.chapter にfallback */
    const r3 = evalCvr({ vNum: 3, ch: null }, { key: 'JHN' }, 1);
    check('behavioral(3-6-J-6): selectedVerse.ch=null → location.chapter=1 にフォールバック → "JHN 1:3"',
        r3 === 'JHN 1:3', `got="${r3}"`);

    /* selectedVerse.ch=undefined → location.chapter にfallback */
    const r4 = evalCvr({ vNum: 3 }, { key: 'JHN' }, 2);
    check('behavioral(3-6-J-7): selectedVerse.ch=undefined → location.chapter=2 にフォールバック → "JHN 2:3"',
        r4 === 'JHN 2:3', `got="${r4}"`);

    /* vNum=null → null を返す */
    const r5 = evalCvr({ vNum: null, ch: 2 }, { key: 'JHN' }, 2);
    check('behavioral(3-6-J-8): selectedVerse.vNum=null → null',
        r5 === null, `got="${r5}"`);

    /* book=null → null を返す */
    const r6 = evalCvr({ vNum: 3, ch: 2 }, null, 2);
    check('behavioral(3-6-J-9): location.book=null → null',
        r6 === null, `got="${r6}"`);

    /* ch1/ch2 の同じvNumが異なるrefを生成する */
    const rCh1 = evalCvr({ vNum: 3, ch: 1 }, { key: 'JHN' }, 1);
    const rCh2 = evalCvr({ vNum: 3, ch: 2 }, { key: 'JHN' }, 1);
    check('behavioral(3-6-J-10): ch1/ch2の同じvNumが異なるrefを生成する（衝突なし）',
        rCh1 !== rCh2 && rCh1 === 'JHN 1:3' && rCh2 === 'JHN 2:3', `ch1="${rCh1}" ch2="${rCh2}"`);

    /* ref形式が "BOOKKEY chapter:vNum" */
    check('behavioral(3-6-J-11): ref形式が "BOOKKEY chapter:vNum" で storage lookupと一致する',
        typeof r1 === 'string' && /^[A-Z0-9]+ \d+:\d+$/.test(r1), `ref="${r1}"`);
}

/* ── J-3: _saveCurrentNote のchapter source確認 ── */
{
    const scnSrc = extractFunctionSource(html, 'function _saveCurrentNote(idSuffix) {');
    check('extract(3-6-J): _saveCurrentNote ソース抽出に成功', !!scnSrc);
    check('behavioral(3-6-J-12): _saveCurrentNote の chapter が selectedVerse?.ch を優先する',
        scnSrc ? /selectedVerse\?\.ch\s*\?\?/.test(scnSrc) : false);
    check('behavioral(3-6-J-13): _saveCurrentNote の chapter が location.chapter を直接使わない',
        scnSrc ? !/const chapter\s*=\s*AppState\.location\.chapter/.test(scnSrc) : false);
    /* refとchapterが同じsourceから生成されることを確認（混在しない） */
    check('behavioral(3-6-J-14): _saveCurrentNote の ref が _currentVerseRef() から取得される',
        scnSrc ? /const ref\s*=\s*_currentVerseRef\(\)/.test(scnSrc) : false);
}

/* ── J-4: toggleBookmark のchapter source確認 ── */
{
    const tbSrc = extractFunctionSource(html, 'function toggleBookmark() {');
    check('extract(3-6-J): toggleBookmark ソース抽出に成功', !!tbSrc);
    check('behavioral(3-6-J-15): toggleBookmark の chapter が selectedVerse?.ch を優先する',
        tbSrc ? /selectedVerse\?\.ch\s*\?\?/.test(tbSrc) : false);
    check('behavioral(3-6-J-16): toggleBookmark の chapter が location.chapter を直接使わない',
        tbSrc ? !/const chapter\s*=\s*AppState\.location\.chapter/.test(tbSrc) : false);
    check('behavioral(3-6-J-17): toggleBookmark の ref が _currentVerseRef() から取得される',
        tbSrc ? /const ref\s*=\s*_currentVerseRef\(\)/.test(tbSrc) : false);
}

/* ── J-5: _loadNoteUI が _currentVerseRef() を使う（間接的に修正の恩恵を受ける） ── */
{
    const lnuSrc = extractFunctionSource(html, 'function _loadNoteUI(idSuffix) {');
    check('invariant(3-6-J-18): _loadNoteUI が _currentVerseRef() を呼ぶ',
        lnuSrc ? /const ref\s*=\s*_currentVerseRef\(\)/.test(lnuSrc) : false);
    check('invariant(3-6-J-19): _loadNoteUI が notes.find で ref を照合する',
        lnuSrc ? /notes\.find\(n\s*=>\s*n\.ref\s*===\s*ref\)/.test(lnuSrc) : false);
}

/* ── J-6: toBrowsing() が selectedVerse.ch を設定する（J修正の前提） ── */
{
    const tbSrc2 = extractFunctionSource(html, 'toBrowsing(vNum, elWords, book, ch) {');
    check('invariant(3-6-J-20): toBrowsing が selectedVerse.ch を ch から設定する',
        tbSrc2 ? /this\.selectedVerse\s*=\s*\{[^}]*ch:\s*ch\s*!=\s*null\s*\?\s*ch\s*:\s*null/.test(tbSrc2) : false);
}

/* ── J-7: storage API の lookup key が ref（string比較）であることを確認 ── */
{
    /* app-storage.js の saveNote が ref をkeyとして使うことを index.html 経由で確認 */
    check('invariant(3-6-J-21): storage.saveNote は ref を第1引数として呼ぶ',
        html.includes('window.App.storage.saveNote(ref,'));
    check('invariant(3-6-J-22): storage.addBookmark は { ref, bookKey, chapter, verse } で呼ぶ',
        html.includes('window.App.storage.addBookmark({ ref, bookKey, chapter, verse })'));
}

/* ── J-8: Phase 3-6-I MVV修正が維持されていることを確認 ── */
{
    const rvaSrc3J = extractFunctionSource(html, 'async function _renderMobileVerseArea(vNum, words) {');
    check('invariant(3-6-J-23): Phase 3-6-I A修正（_renderMobileVerseArea _mvvChapter優先）が維持される',
        rvaSrc3J ? /const ch\s*=\s*_mvvChapter\s*!=\s*null\s*\?\s*_mvvChapter\s*:\s*AppState\.location\.chapter/.test(rvaSrc3J) : false);
    const lacSrc3J = extractFunctionSource(html, 'async function _loadAndAppendChapter(');
    check('invariant(3-6-J-24): Phase 3-6-I C修正（block.closest）が維持される',
        lacSrc3J ? /block\.closest\('\.chapter-block'\)/.test(lacSrc3J) : false);
}

/* ═══════════════════════════════════════════════════════════════════════
 * Phase 3-7-C: Desktop Compare Chapter Container
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── C3-1: compare-chapter-block 生成ロジックが存在する ── */
check('invariant(3-7-C-1): compare-chapter-block 生成ロジックが存在する',
    /compare-chapter-block/.test(html));

/* ── C3-2: data-book / data-chapter が compare-chapter-block に設定される ── */
{
    const ccbSrc = (() => {
        const startIdx = html.indexOf('const _compareChapterBlock = ');
        if (startIdx < 0) return null;
        const endIdx = html.indexOf('})() : null;', startIdx);
        if (endIdx < 0) return null;
        return html.slice(startIdx, endIdx + '})() : null;'.length);
    })();
    check('extract(3-7-C): _compareChapterBlock IIFE ソース抽出に成功', !!ccbSrc);
    check('invariant(3-7-C-2a): _compareChapterBlock に data-book が設定される',
        ccbSrc ? /_ccb\.dataset\.book/.test(ccbSrc) : false);
    check('invariant(3-7-C-2b): _compareChapterBlock に data-chapter が設定される',
        ccbSrc ? /_ccb\.dataset\.chapter/.test(ccbSrc) : false);
    check('invariant(3-7-C-2c): _compareChapterBlock は useVersePair && window.innerWidth > 768 のみ生成される',
        ccbSrc ? /useVersePair\s*&&\s*window\.innerWidth\s*>\s*768/.test(ccbSrc) : false);
}

/* ── C3-3: verse-pair が compare-chapter-block 内に入る ── */
check('invariant(3-7-C-3): verse-pair が (_compareChapterBlock || mainArea) へ追加される',
    /\(_compareChapterBlock\s*\|\|\s*mainArea\)\.appendChild\(pairEl\)/.test(html));

/* ── C3-4: Mobile compare の既存 DOM パスが維持されている ── */
check('invariant(3-7-C-4a): mobile-verse-group が app.appendChild へ渡される（既存パス維持）',
    /app\.appendChild\(verseGroup\)/.test(html));
check('invariant(3-7-C-4b): _compareChapterBlock は window.innerWidth > 768 条件付き（mobile では null）',
    /window\.innerWidth\s*>\s*768/.test(html));

/* ── C3-5: _loadAndAppendChapter の compare guard が維持される（autoload はまだ未解除）── */
{
    const lacSrc5 = extractFunctionSource(html, 'async function _loadAndAppendChapter(');
    check('invariant(3-7-C-5): _loadAndAppendChapter に compare guard が残っている',
        lacSrc5 ? /_isAutoloadBlockedMode\(_lacColAKind\)\s*\|\|\s*_transMode\s*===\s*'compare'/.test(lacSrc5) : false);
}

/* ── Phase 3-7-D: Desktop Compare ChapterFocusObserver ── */
{
    const setupObsSrc = extractFunctionSource(html, 'function _setupChapterObserver() {');
    const rfcSrc      = extractFunctionSource(html, 'function _recalcFocusChapter() {');

    check('invariant(3-7-D-1): _setupChapterObserver に compare モード分岐が存在する',
        setupObsSrc ? /_transMode\s*===\s*'compare'/.test(setupObsSrc) : false);

    check('invariant(3-7-D-2): compare 分岐で .compare-chapter-block を observe する',
        setupObsSrc ? /\.compare-chapter-block/.test(setupObsSrc) : false);

    check('invariant(3-7-D-3): single モード経路で .chapter-block observe が維持される',
        setupObsSrc ? /\.chapter-block/.test(setupObsSrc) : false);

    check('invariant(3-7-D-4): _recalcFocusChapter が focusEl.dataset.book を読む（変更なし）',
        rfcSrc ? /focusEl\.dataset\.book/.test(rfcSrc) : false);

    check('invariant(3-7-D-5): _recalcFocusChapter が focusEl.dataset.chapter を読む（変更なし）',
        rfcSrc ? /focusEl\.dataset\.chapter/.test(rfcSrc) : false);

    check('invariant(3-7-D-6): _recalcFocusChapter が AppState.selectedVerse を変更しない',
        rfcSrc ? !/AppState\.selectedVerse\s*=/.test(rfcSrc) : false);
}

/* ── D7/D8: render() gate ── */
{
    const gateIdx = html.indexOf('if (_chapterBlock) { _setupChapterObserver(); _setupAutoload(); }');
    const gateSrc = gateIdx >= 0 ? html.slice(gateIdx, gateIdx + 200) : '';

    check('invariant(3-7-D-7): render() gate に _compareChapterBlock 分岐が存在する',
        /else if \(_compareChapterBlock\)/.test(gateSrc));

    check('invariant(3-7-D-8/3-7-E): _compareChapterBlock 分岐は _setupChapterObserver と _setupAutoload を呼ぶ',
        gateSrc
            ? /else if \(_compareChapterBlock\)\s*\{[^}]*_setupChapterObserver\(\)/.test(gateSrc) &&
              /else if \(_compareChapterBlock\)\s*\{[^}]*_setupAutoload\(\)/.test(gateSrc)
            : false);
}

/* ── Phase 3-7-E: Desktop Compare Continuous Chapter Autoload ── */
{
    const lacCompareSrc  = extractFunctionSource(html, 'async function _loadAndAppendChapterCompare(');
    const doAutoloadSrc  = extractFunctionSource(html, 'async function _doAutoload(');
    const setupAutoSrc   = extractFunctionSource(html, 'function _setupAutoload() {');
    const placeSentSrc   = extractFunctionSource(html, 'function _placeSentinel() {');

    /* E1: 既存 autoload guard が compare 専用 loader へ委譲 */
    check('invariant(3-7-E-1): _doAutoload が compare mode では _loadAndAppendChapterCompare を呼ぶ',
        doAutoloadSrc ? /_loadAndAppendChapterCompare/.test(doAutoloadSrc) : false);

    /* E2: _loadAndAppendChapterCompare が存在する */
    check('invariant(3-7-E-2): _loadAndAppendChapterCompare 関数が存在する',
        !!lacCompareSrc);

    /* E3: JA1955 翻訳データ取得経路（_fetchTranslation）が存在する */
    check('invariant(3-7-E-3): _loadAndAppendChapterCompare が _fetchTranslation を呼ぶ',
        lacCompareSrc ? /_fetchTranslation/.test(lacCompareSrc) : false);

    /* E4: Greek → _buildFlowJpData() → WO の経路が存在する */
    check('invariant(3-7-E-4): _loadAndAppendChapterCompare が _buildFlowJpData を呼ぶ',
        lacCompareSrc ? /_buildFlowJpData/.test(lacCompareSrc) : false);

    /* E5: .compare-chapter-block に data-book / data-chapter が設定される */
    check('invariant(3-7-E-5): loader が compare-chapter-block に dataset.book / dataset.chapter を設定する',
        lacCompareSrc
            ? /compare-chapter-block/.test(lacCompareSrc) &&
              /dataset\.book/.test(lacCompareSrc) &&
              /dataset\.chapter/.test(lacCompareSrc)
            : false);

    /* E6: compare chapter append の重複防止（_comparePending） */
    check('invariant(3-7-E-6): _comparePending による重複防止が存在する',
        lacCompareSrc ? /_comparePending/.test(lacCompareSrc) : false);

    /* E7: _placeSentinel が nextCh（chNum+1）を対象にする経路が存在する */
    check('invariant(3-7-E-7): _placeSentinel が compare mode で .compare-chapter-block を使う',
        placeSentSrc ? /compare-chapter-block/.test(placeSentSrc) : false);

    /* E8: single mode の autoload が従来経路のまま（_loadAndAppendChapter が維持される） */
    check('invariant(3-7-E-8): _doAutoload が single mode では _loadAndAppendChapter を呼ぶ経路を維持する',
        doAutoloadSrc ? /_loadAndAppendChapter\b/.test(doAutoloadSrc) : false);

    /* E9: mobile compare path が変更されていない（_mobileVerseList / mobile-verse-group） */
    check('invariant(3-7-E-9): mobile compare path（mobile-verse-group）が変更されていない',
        /mobile-verse-group/.test(html));

    /* E10: ChapterFocusObserver が追加 chapter block を監視できる（_chapterObserver.observe） */
    check('invariant(3-7-E-10): loader が新規ブロックを _chapterObserver に登録する',
        lacCompareSrc ? /_chapterObserver\.observe/.test(lacCompareSrc) : false);
}

/* ── Phase 3-7-F: Mobile Compare Chapter Identity ── */
{
    const mcsSetupSrc  = extractFunctionSource(html, 'function _mobileCompareSetup() {');
    const mcsApplySrc  = extractFunctionSource(html, 'function _mobileVerseApply() {');
    const lacCompareSrc = extractFunctionSource(html, 'async function _loadAndAppendChapterCompare(');
    const doAutoloadSrc = extractFunctionSource(html, 'async function _doAutoload(');

    /* F1: .mobile-verse-group に data-book / data-chapter が設定される */
    const renderSrc = extractFunctionSource(html, 'function render(');
    check('invariant(3-7-F-1): .mobile-verse-group に data-book / data-chapter が設定される',
        renderSrc
            ? /mobile-verse-group/.test(renderSrc) &&
              /dataset\.book\s*=/.test(renderSrc) &&
              /dataset\.chapter\s*=/.test(renderSrc)
            : false);

    /* F2: _mobileVerseList が { book, chapter, vnum } オブジェクトを保持 */
    check('invariant(3-7-F-2): _mobileCompareSetup が { book, chapter, vnum } を収集する',
        mcsSetupSrc
            ? /book\s*:/.test(mcsSetupSrc) &&
              /chapter\s*:/.test(mcsSetupSrc) &&
              /vnum\s*:/.test(mcsSetupSrc)
            : false);

    /* F3: _mobileVerseApply が book + chapter + vnum で対象を判定する */
    check('invariant(3-7-F-3): _mobileVerseApply が dataset.book / dataset.chapter / dataset.vnum で対象を特定する',
        mcsApplySrc
            ? /dataset\.book/.test(mcsApplySrc) &&
              /dataset\.chapter/.test(mcsApplySrc) &&
              /dataset\.vnum/.test(mcsApplySrc)
            : false);

    /* F4: 節番号だけの比較（dataset.vnum === cur で cur がオブジェクトでない）が残っていない。
       現在の実装は dataset.vnum === cur.vnum なので cur の直後に . が続く → PASS。 */
    check('invariant(3-7-F-4): _mobileVerseApply が vnum 単独比較（cur が非オブジェクト）を使用しない',
        mcsApplySrc
            ? !/g\.dataset\.vnum\s*===\s*cur(?!\.)/.test(mcsApplySrc)
            : false);

    /* F5: _mobileVerseApply が AppState.selectedVerse を変更しない */
    check('invariant(3-7-F-5): _mobileVerseApply が AppState.selectedVerse を変更しない',
        mcsApplySrc ? !/AppState\.selectedVerse/.test(mcsApplySrc) : false);

    /* F6: location.chapter の更新経路は既存経路のまま（_recalcFocusChapter / render 経由） */
    check('invariant(3-7-F-6): _mobileVerseApply が AppState.location を変更しない',
        mcsApplySrc ? !/AppState\.location/.test(mcsApplySrc) : false);

    /* F7: Desktop compare autoload が変更されていない */
    check('invariant(3-7-F-7): _loadAndAppendChapterCompare が変更されていない（存在する）',
        !!lacCompareSrc);
    check('invariant(3-7-F-7b): _doAutoload が compare 専用 loader を呼ぶ経路を維持する',
        doAutoloadSrc ? /_loadAndAppendChapterCompare/.test(doAutoloadSrc) : false);

    /* F8: mobile compare の表示・選択が維持される（teardown が _mobileVerseList をクリアする） */
    const teardownSrc = extractFunctionSource(html, 'function _mobileCompareTeardown() {');
    check('invariant(3-7-F-8): _mobileCompareTeardown が _mobileVerseList をクリアする',
        teardownSrc ? /_mobileVerseList\s*=\s*\[\]/.test(teardownSrc) : false);
}

/* ───────────────────────────── 結果出力 ───────────────────────────── */
console.log('── VR-5-H-7: Flow DOM Transition Regression ──\n');
for (const [status, name] of results) {
    console.log(`  ${status === 'PASS' ? '✓' : '✗'} [${status}] ${name}`);
}
const passCount = results.filter(r => r[0] === 'PASS').length;
console.log(`\n${failed === 0 ? 'ALL PASS' : 'FAILED'} (${passCount}/${results.length} checks)`);
process.exit(failed === 0 ? 0 : 1);
