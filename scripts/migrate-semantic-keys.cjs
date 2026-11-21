#!/usr/bin/env node
/**
 * migrate-semantic-keys.cjs — 語義注釈を不透明な内部キーへ置換する（#196・恒常化）
 *
 * 実行:
 *   node scripts/migrate-semantic-keys.cjs            置換（未変換の値だけを変換。変換済みなら何もしない）
 *   node scripts/migrate-semantic-keys.cjs --check    検査のみ（外部注釈コード・旧フィールドが残っていれば exit 1）
 *   node scripts/migrate-semantic-keys.cjs --dry-run  置換内容を集計表示するだけ（書き込まない）
 *   追加オプション:
 *     --text <file>   リポジトリ内のテキストファイル中の 'lemmaId|コード' 形式のリテラルも
 *                     同じキーへ置換する（監査スクリプトの台帳など。複数指定可）
 *
 * 何をするか:
 *   外部の意味領域注釈（トークンの `ln` / `domain`）を、番号体系から復元できない
 *   無意味な連番キーへ置き換える。キーは 2 部構成:
 *     - センスキー  's<n>' : (lemmaId, 注釈コード) 単位。token.sense に入る
 *                            （複数コードはスペース区切りのまま各コードを置換。先頭が主）
 *     - グループキー 'g<n>' : 主ドメイン番号単位。token.senseGroup に入る
 *                            （旧 domain コードの「末尾 3 桁を除いた数値」ごとに 1 キー）
 *   読書エンジンは両キーを等値比較するだけなので、照合結果は変換前と同一になる。
 *
 * 対象:
 *   1. public/bible_data/{nt,lxx}/**.json  — "ln"/"domain" を "sense"/"senseGroup" へ
 *      （キー名と値以外はバイト単位で不変: 行・改行(CRLF)・キー順序を保持）
 *   2. public/assets/data/reading-ln-curation.js / reading-ln-gloss-data.js /
 *      reading-ln-final-data.js — lemmaId 配下の注釈コードのキー
 *   3. public/assets/data/reading-semantic-data.js — prepDomain ルールの `domain: <数値>`
 *      → `group: '<グループキー>'`
 *   4. public/assets/data/lexicon/lexicon-lite.json — `ln` / `domains` フィールドを除去
 *
 * 対応表について:
 *   コード→キーの対応表はこのプロセスのメモリ内にだけ作り、ファイルには一切書き出さない。
 *   キー番号は暗号論的乱数で並べ替えて割り当てるため、番号から元のコードは推測できない。
 *   再取り込み（bible_data を上流から取り直して `ln`/`domain` が再混入した場合）では、
 *   Git の HEAD にある変換済みファイルと tokenId（無ければ位置）で突き合わせて既存キーを
 *   引き継ぎ、未知の組だけに新しいキーを割り当てる。データファイル側（curation 等）に
 *   未変換のコードが残っていて引き継ぎ先が分からない場合は、推測せずに停止する。
 *
 * 再混入の防止: bible_data・語彙データを更新したら必ず `npm run check:semantic-keys`
 *   （= 本スクリプトの --check）を実行する。上流から取り直した bible_data に旧フィールドが
 *   あれば `npm run migrate:semantic-keys` で置換する（既存キーは HEAD から引き継がれる）。
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const BIBLE  = path.join(PUBLIC, 'bible_data');
const DATA   = path.join(PUBLIC, 'assets', 'data');
const KEYED_JS = ['reading-ln-curation.js', 'reading-ln-gloss-data.js', 'reading-ln-final-data.js']
    .map(f => path.join(DATA, f));
const SEMANTIC_JS = path.join(DATA, 'reading-semantic-data.js');
const LEXICON_LITE = path.join(DATA, 'lexicon', 'lexicon-lite.json');

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const DRY   = args.includes('--dry-run');
const TEXT_FILES = [];
for (let i = 0; i < args.length; i++) if (args[i] === '--text' && args[i + 1]) TEXT_FILES.push(path.resolve(args[++i]));

const RAW_CODE   = /^[0-9]+\.[0-9]+[a-z]?$/;   // 外部注釈コード（センス）
const RAW_DOMAIN = /^[0-9]+$/;                 // 外部注釈コード（ドメイン）
const SENSE_KEY  = /^s[1-9][0-9]*$/;
const GROUP_KEY  = /^g[1-9][0-9]*$/;

/** 旧 domain コード → 主ドメイン番号（旧エンジン _domainNumber と同一規則）。 */
function mainNumber(code) {
    if (!RAW_DOMAIN.test(code)) return null;
    return code.length > 3 ? parseInt(code.slice(0, -3), 10) : parseInt(code, 10);
}

function listBibleFiles() {
    const out = [];
    for (const corp of ['nt', 'lxx']) {
        const dir = path.join(BIBLE, corp);
        if (!fs.existsSync(dir)) continue;
        for (const b of fs.readdirSync(dir).sort()) {
            const bd = path.join(dir, b);
            if (!fs.statSync(bd).isDirectory()) continue;
            for (const f of fs.readdirSync(bd).sort()) if (f.endsWith('.json')) out.push(path.join(bd, f));
        }
    }
    return out;
}

const FIELD_RE = /"(ln|domain|sense|senseGroup)": "([^"\\]*)"/g;

// ══════════════════════════════════════════════════════════════════
// --check: 残存検査
// ══════════════════════════════════════════════════════════════════
function runCheck() {
    const problems = [];
    let files = 0;
    for (const f of listBibleFiles()) {
        files++;
        const s = fs.readFileSync(f, 'utf8');
        for (const m of s.matchAll(FIELD_RE)) {
            const [, k, v] = m;
            if (k === 'ln' || k === 'domain') { problems.push(`${path.relative(ROOT, f)}: 旧フィールド "${k}"`); break; }
            for (const c of v.split(' ').filter(Boolean)) {
                const ok = k === 'sense' ? SENSE_KEY.test(c) : GROUP_KEY.test(c);
                if (!ok) { problems.push(`${path.relative(ROOT, f)}: 未変換の値（${k}）`); break; }
            }
        }
    }
    for (const f of KEYED_JS) {
        if (!fs.existsSync(f)) continue;
        const s = fs.readFileSync(f, 'utf8');
        if (/(['"])[0-9]+\.[0-9]+[a-z]?\1\s*:/.test(s)) problems.push(`${path.relative(ROOT, f)}: 未変換の注釈コードキー`);
    }
    if (fs.existsSync(SEMANTIC_JS) && /\bdomain:\s*[0-9]+/.test(fs.readFileSync(SEMANTIC_JS, 'utf8'))) {
        problems.push(`${path.relative(ROOT, SEMANTIC_JS)}: prepDomain に数値 domain が残っている`);
    }
    if (fs.existsSync(LEXICON_LITE)) {
        const lex = JSON.parse(fs.readFileSync(LEXICON_LITE, 'utf8'));
        const n = Object.values(lex).filter(e => e && (('ln' in e) || ('domains' in e))).length;
        if (n) problems.push(`${path.relative(ROOT, LEXICON_LITE)}: ln/domains を持つエントリ ${n} 件`);
    }
    for (const f of ['domains-ln-index.json', 'domains-cluster-index.json', 'semantic-domain-labels.json']) {
        if (fs.existsSync(path.join(DATA, 'index', f))) problems.push(`assets/data/index/${f} が存在する`);
    }
    console.log(`migrate-semantic-keys --check: bible_data ${files} ファイル＋語彙データを検査`);
    if (problems.length) {
        for (const p of problems.slice(0, 50)) console.log('  FAIL  ' + p);
        if (problems.length > 50) console.log(`  …ほか ${problems.length - 50} 件`);
        console.log(`FAIL: ${problems.length} 件`);
        process.exit(1);
    }
    console.log('PASS: 外部注釈コード・旧フィールドの残存 0');
}

// ══════════════════════════════════════════════════════════════════
// 置換
// ══════════════════════════════════════════════════════════════════
/** Git HEAD の同一パスのファイル（変換済み）を読む。無ければ null。 */
function headVersion(file) {
    try {
        const rel = path.relative(ROOT, file).split(path.sep).join('/');
        return execFileSync('git', ['show', `HEAD:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
    } catch (_) { return null; }
}

function runMigrate() {
    // ── 1. 走査: 未変換の組を収集し、既存キーの最大値と引き継ぎ候補を得る ──
    const sensePairs = new Set();     // `${lemmaId}\u0000${code}`
    const groupNums  = new Set();     // 主ドメイン番号
    const senseMap = new Map();       // pair → key（メモリ内のみ）
    const groupMap = new Map();       // number → key（メモリ内のみ）
    let maxS = 0, maxG = 0;
    const noteMax = (k) => {
        if (SENSE_KEY.test(k)) maxS = Math.max(maxS, parseInt(k.slice(1), 10));
        else if (GROUP_KEY.test(k)) maxG = Math.max(maxG, parseInt(k.slice(1), 10));
    };
    const rawFiles = [];
    const files = listBibleFiles();
    for (const f of files) {
        const tokens = JSON.parse(fs.readFileSync(f, 'utf8'));
        let raw = false;
        for (const t of tokens) {
            for (const k of String(t.sense || '').split(' ').filter(Boolean)) noteMax(k);
            for (const k of String(t.senseGroup || '').split(' ').filter(Boolean)) noteMax(k);
            if ('ln' in t || 'domain' in t) raw = true;
            if (typeof t.ln === 'string') for (const c of t.ln.split(' ').filter(Boolean)) {
                if (!RAW_CODE.test(c)) throw new Error(`想定外の ln 値形式: ${path.relative(ROOT, f)}`);
                sensePairs.add(`${t.lemmaId || ''}\u0000${c}`);
            }
            if (typeof t.domain === 'string') for (const c of t.domain.split(' ').filter(Boolean)) {
                const n = mainNumber(c);
                if (n === null) throw new Error(`想定外の domain 値形式: ${path.relative(ROOT, f)}`);
                groupNums.add(n);
            }
        }
        if (raw) rawFiles.push({ file: f, tokens });
    }
    // データファイル側の未変換キー
    const jsRawPairs = new Set();
    const scanKeyedText = (text, cb) => {
        let lemma = null;
        return text.split('\n').map(line => {
            const lm = line.match(/^\s*(['"])(grc:[^'"]+)\1\s*:/);
            if (lm) lemma = lm[2];
            return line.replace(/(['"])([0-9]+\.[0-9]+[a-z]?)\1(\s*:)/g, (all, q, code, colon) => {
                if (!lemma) return all;
                return cb(lemma, code, q, colon, all);
            });
        }).join('\n');
    };
    for (const f of KEYED_JS) {
        if (!fs.existsSync(f)) continue;
        const s = fs.readFileSync(f, 'utf8');
        for (const m of s.matchAll(/(['"])(s[1-9][0-9]*)\1\s*:/g)) noteMax(m[2]);
        scanKeyedText(s, (lemma, code, q, c, all) => { jsRawPairs.add(`${lemma}\u0000${code}`); return all; });
    }
    for (const m of fs.readFileSync(SEMANTIC_JS, 'utf8').matchAll(/group:\s*'(g[1-9][0-9]*)'/g)) noteMax(m[1]);
    const semRawNums = [...fs.readFileSync(SEMANTIC_JS, 'utf8').matchAll(/\bdomain:\s*([0-9]+)/g)].map(m => parseInt(m[1], 10));
    const textRawPairs = new Set();
    for (const f of TEXT_FILES) {
        for (const m of fs.readFileSync(f, 'utf8').matchAll(/(grc:[^|'"\s]+)\|([0-9]+\.[0-9]+[a-z]?)(?=['"])/g)) textRawPairs.add(`${m[1]}\u0000${m[2]}`);
    }

    const alreadyKeyed = maxS > 0 || maxG > 0;

    // ── 2. 引き継ぎ（再取り込み時のみ）: HEAD の変換済み版と突き合わせる ──
    if (alreadyKeyed && rawFiles.length) {
        for (const { file, tokens } of rawFiles) {
            const head = headVersion(file);
            if (!head) continue;
            let old;
            try { old = JSON.parse(head); } catch (_) { continue; }
            const byId = new Map(old.filter(t => t.tokenId).map(t => [t.tokenId, t]));
            tokens.forEach((t, i) => {
                const o = (t.tokenId && byId.get(t.tokenId)) || (!t.tokenId ? old[i] : null);
                if (!o) return;
                const nc = String(t.ln || '').split(' ').filter(Boolean);
                const ok = String(o.sense || '').split(' ').filter(Boolean);
                if (nc.length === ok.length && (t.lemmaId || '') === (o.lemmaId || '')) {
                    nc.forEach((c, j) => { const p = `${t.lemmaId || ''}\u0000${c}`; if (!senseMap.has(p)) senseMap.set(p, ok[j]); });
                }
                const nd = String(t.domain || '').split(' ').filter(Boolean).map(mainNumber);
                const og = String(o.senseGroup || '').split(' ').filter(Boolean);
                if (nd.length && og.length && !groupMap.has(nd[0])) groupMap.set(nd[0], og[0]);
            });
        }
    }

    // データファイル側の未変換コードは、初回移行（全体が未変換）でなければ解決できない
    if (alreadyKeyed) {
        const unresolved = [...jsRawPairs, ...textRawPairs].filter(p => !senseMap.has(p));
        const unresolvedG = semRawNums.filter(n => !groupMap.has(n));
        if (unresolved.length || unresolvedG.length) {
            console.error(`STOP: 変換済みデータと未変換のコードが混在し、引き継ぎ先を決定できない組が ${unresolved.length + unresolvedG.length} 件あります。`);
            console.error('      推測による割り当ては行いません。上流データと curation の状態を確認してください。');
            process.exit(2);
        }
    }

    // ── 3. 新規キーの割り当て（乱数順の連番） ──
    const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    const newPairs = shuffle([...new Set([...sensePairs, ...jsRawPairs, ...textRawPairs])].filter(p => !senseMap.has(p)));
    newPairs.forEach((p, i) => senseMap.set(p, 's' + (maxS + 1 + i)));
    const newNums = shuffle([...new Set([...groupNums, ...semRawNums])].filter(n => !groupMap.has(n)));
    newNums.forEach((n, i) => groupMap.set(n, 'g' + (maxG + 1 + i)));

    const senseOf = (lemma, code) => senseMap.get(`${lemma || ''}\u0000${code}`);
    const groupOf = (code) => groupMap.get(mainNumber(code));

    // ── 4. 書き込み ──
    const report = { bibleFiles: 0, tokens: 0, senseTokens: 0, groupTokens: 0, keyedJs: 0, prepRules: 0, textFiles: 0, lexiconStripped: 0 };
    const writes = [];
    for (const { file, tokens } of rawFiles) {
        const src = fs.readFileSync(file, 'utf8');
        let iLn = 0, iDom = 0;
        const out = src.replace(/"(ln|domain)": "([^"\\]*)"/g, (all, k, v) => {
            if (k === 'ln') {
                const t = tokens[iLn++];
                if (!t || t.ln !== v) throw new Error(`ln の位置対応が崩れています: ${path.relative(ROOT, file)}`);
                const keys = v.split(' ').filter(Boolean).map(c => senseOf(t.lemmaId, c));
                if (keys.length) report.senseTokens++;
                return `"sense": "${keys.join(' ')}"`;
            }
            const t = tokens[iDom++];
            if (!t || t.domain !== v) throw new Error(`domain の位置対応が崩れています: ${path.relative(ROOT, file)}`);
            const keys = [...new Set(v.split(' ').filter(Boolean).map(groupOf))];
            if (keys.length) report.groupTokens++;
            return `"senseGroup": "${keys.join(' ')}"`;
        });
        if (iLn !== tokens.filter(t => 'ln' in t).length || iDom !== tokens.filter(t => 'domain' in t).length) {
            throw new Error(`フィールド数が一致しません: ${path.relative(ROOT, file)}`);
        }
        // 検証: 2 フィールド以外のバイト不変（行単位）・JSON としての同一性
        const a = src.split('\n'), b = out.split('\n');
        if (a.length !== b.length) throw new Error(`行数が変化: ${path.relative(ROOT, file)}`);
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i] && !/"(ln|domain)": "/.test(a[i])) throw new Error(`対象外の行が変化: ${path.relative(ROOT, file)}:${i + 1}`);
        }
        const parsed = JSON.parse(out);
        parsed.forEach((t, i) => {
            const o = tokens[i];
            const ok = Object.keys(o).map(k => k === 'ln' ? 'sense' : k === 'domain' ? 'senseGroup' : k);
            if (JSON.stringify(Object.keys(t)) !== JSON.stringify(ok)) throw new Error(`キー順序が変化: ${path.relative(ROOT, file)}`);
            for (const k of Object.keys(o)) if (k !== 'ln' && k !== 'domain' && o[k] !== t[k]) throw new Error(`値が変化: ${path.relative(ROOT, file)} ${k}`);
        });
        report.bibleFiles++; report.tokens += tokens.length;
        writes.push([file, out]);
    }
    for (const f of KEYED_JS) {
        if (!fs.existsSync(f)) continue;
        const s = fs.readFileSync(f, 'utf8');
        let n = 0;
        const out = scanKeyedText(s, (lemma, code, q, colon) => { n++; return `${q}${senseOf(lemma, code)}${q}${colon}`; });
        if (n) { report.keyedJs += n; writes.push([f, out]); }
    }
    {
        const s = fs.readFileSync(SEMANTIC_JS, 'utf8');
        let n = 0;
        const out = s.replace(/\bdomain:\s*([0-9]+)/g, (all, num) => { n++; return `group: '${groupMap.get(parseInt(num, 10))}'`; });
        if (n) { report.prepRules = n; writes.push([SEMANTIC_JS, out]); }
    }
    for (const f of TEXT_FILES) {
        const s = fs.readFileSync(f, 'utf8');
        let n = 0;
        const out = s.replace(/(grc:[^|'"\s]+)\|([0-9]+\.[0-9]+[a-z]?)(?=['"])/g, (all, lemma, code) => { n++; return `${lemma}|${senseOf(lemma, code)}`; });
        if (n) { report.textFiles++; writes.push([f, out]); }
    }
    {
        const s = fs.readFileSync(LEXICON_LITE, 'utf8');
        const lex = JSON.parse(s);
        let n = 0;
        for (const e of Object.values(lex)) {
            if (e && typeof e === 'object' && (('ln' in e) || ('domains' in e))) { delete e.ln; delete e.domains; n++; }
        }
        if (n) {
            if (JSON.stringify(JSON.parse(s)) !== s) throw new Error('lexicon-lite.json が想定外の書式です（再書式化を避けるため停止）');
            report.lexiconStripped = n;
            writes.push([LEXICON_LITE, JSON.stringify(lex)]);
        }
    }

    console.log(`migrate-semantic-keys${DRY ? ' (dry-run)' : ''}:`);
    console.log(`  bible_data 変換ファイル : ${report.bibleFiles}（トークン ${report.tokens}・sense 付与 ${report.senseTokens}・senseGroup 付与 ${report.groupTokens}）`);
    console.log(`  新規センスキー / グループキー : ${newPairs.length} / ${newNums.length}（引き継ぎ ${senseMap.size - newPairs.length} / ${groupMap.size - newNums.length}）`);
    console.log(`  語彙データのキー置換   : ${report.keyedJs}`);
    console.log(`  prepDomain ルール      : ${report.prepRules}`);
    console.log(`  テキスト（台帳等）     : ${report.textFiles} ファイル`);
    console.log(`  lexicon-lite 除去      : ${report.lexiconStripped} エントリ`);
    if (!writes.length) console.log('  変更なし（変換済み）');
    if (!DRY) for (const [f, out] of writes) fs.writeFileSync(f, out);
    // 対応表はここで破棄される（ファイルへは出力しない）
    senseMap.clear(); groupMap.clear();
}

if (CHECK) runCheck(); else runMigrate();
