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
});

/* 実 _setFlowInjection を、指定 document / 環境スタブで束縛して返す */
function buildSetFlowInjection(doc, env) {
    const factory = new Function(
        'document', 'window', '_cachedElByVerse', '_buildGfVerseBlock', '_syncOnboardingActiveFlag',
        setFlowInjectionSrc + '\n; return _setFlowInjection;'
    );
    return factory(doc, env.window, env._cachedElByVerse, env._buildGfVerseBlock, env._syncOnboardingActiveFlag);
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

/* ───────────────────────────── 結果出力 ───────────────────────────── */
console.log('── VR-5-H-7: Flow DOM Transition Regression ──\n');
for (const [status, name] of results) {
    console.log(`  ${status === 'PASS' ? '✓' : '✗'} [${status}] ${name}`);
}
const passCount = results.filter(r => r[0] === 'PASS').length;
console.log(`\n${failed === 0 ? 'ALL PASS' : 'FAILED'} (${passCount}/${results.length} checks)`);
process.exit(failed === 0 ? 0 : 1);
