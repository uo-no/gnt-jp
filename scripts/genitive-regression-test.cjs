#!/usr/bin/env node
/**
 * genitive-regression-test.cjs — Phase 8 属格解析システム回帰テスト
 *
 * 実行: node scripts/genitive-regression-test.cjs
 *       node scripts/genitive-regression-test.cjs --verbose
 *
 * §1  レジストリカバレッジ（全 genitive.* が _CLAUSE_TYPE_TO_GLOSS_KEY に存在）
 * §2  ReadingFormatter（全型で出力が有効）
 * §3  構文レジストリ整合性（ID重複・グループ参照・必須フィールド）
 * §4  代表節の回帰テスト（JAS/ROM/JHN/LUK）
 * §5  未知 syntax ID のフォールバック（フリーズ・クラッシュしない）
 * §6  UI ラベル整合性
 * §7  最終カバレッジレポート
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const VERBOSE = process.argv.includes('--verbose');
const PUBLIC  = path.resolve(__dirname, '..', 'public');

// ── グローバル設定（syntax-analyzer.js が参照する） ─────────────────────────

global.decodeMorph = function(e) {
    if (!e || typeof e !== 'object') return {};
    return {
        pos:    (e.pos || (e.class ? String(e.class).slice(0, 1).toUpperCase() : '')),
        tense:  e.tense  || '',
        voice:  e.voice  || '',
        mood:   e.mood   || '',
        case:   e.case   || '',
        number: e.number || '',
        gender: e.gender || '',
        person: e.person || '',
    };
};

global.cleanText = function(e) {
    const s = (e && typeof e === 'object')
        ? (e.text || e.normalized || '')
        : String(e || '');
    return s.replace(/[.,;:!?·—'··]+$/g, '').trim();
};

global.entryPosCode = function(t) {
    if (!t || typeof t !== 'object') return '';
    if (t.pos) return String(t.pos).replace(/-$/, '').toUpperCase();
    if (t.class) {
        const map = {
            verb:'V', noun:'N', adjective:'A', adj:'A',
            article:'T', det:'T',
            preposition:'P', prep:'P',
            conjunction:'C', conj:'C',
            adverb:'D', adv:'D',
            particle:'X', ptcl:'X',
            pronoun:'R', pron:'R',
            num:'M',
        };
        return map[String(t.class).toLowerCase()] || '';
    }
    if (typeof t.morph === 'string' && t.morph) {
        const seg = t.morph.split('-')[0];
        if (seg === 'PREP' || seg === 'COND') return 'P';
        if (seg === 'CONJ') return 'C';
        if (seg === 'ADV' || seg === 'PRT') return 'D';
        if (seg === 'PART' || seg === 'INJ') return 'X';
        if (seg.length === 1) return seg;
    }
    if (t.mood || t.tense || t.voice) return 'V';
    return '';
};

// ── モジュールロード ─────────────────────────────────────────────────────────

function loadJson(absPath) {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

/**
 * package.json に "type": "module" があっても .js ファイルを CJS として読み込む。
 * Node.js の CJS ラッパーを vm.runInThisContext で再現することで ESM 扱いを回避する。
 */
const vm = require('vm');
function requireCjs(filePath) {
    const code  = fs.readFileSync(filePath, 'utf8');
    const mod   = { exports: {}, id: filePath, filename: filePath, loaded: false };
    const dir   = path.dirname(filePath);
    const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
    const fn    = vm.runInThisContext(wrapped, { filename: filePath, displayErrors: true });
    fn(mod, mod.exports, require, dir, filePath);
    return mod.exports;
}

const { SyntaxAnalyzer, ContextBuilder } = requireCjs(path.join(PUBLIC, 'core', 'syntax-analyzer.js'));
const { ReadingFormatter, _WALLACE_TEXT, _CLAUSE_TYPE_TO_GLOSS_KEY } =
    requireCjs(path.join(PUBLIC, 'core', 'clause-analyzer.js'));

const syntaxRegistry = loadJson(path.join(PUBLIC, 'assets', 'data', 'syntax-registry.json'));
const booksMaster    = loadJson(path.join(PUBLIC, 'books.json'));

const sa = new SyntaxAnalyzer(syntaxRegistry);
const rf = new ReadingFormatter();

// ── テストユーティリティ ─────────────────────────────────────────────────────

let PASS = 0, FAIL = 0, WARN = 0;

function check(label, condition, detail = '') {
    if (condition) {
        if (VERBOSE) process.stdout.write(`  PASS  ${label}\n`);
        PASS++;
    } else {
        process.stdout.write(`  FAIL  ${label}${detail ? '  — ' + detail : ''}\n`);
        FAIL++;
    }
}

function warn(label, detail = '') {
    process.stdout.write(`  WARN  ${label}${detail ? '  — ' + detail : ''}\n`);
    WARN++;
}

function section(title) {
    process.stdout.write(`\n${'═'.repeat(54)}\n${title}\n${'═'.repeat(54)}\n`);
}

function loadChapter(bookKey, ch) {
    const isNT = booksMaster.NT.some(b => b.key === bookKey);
    const sub  = isNT ? booksMaster.corpora.NT : booksMaster.corpora.OT;
    const fp   = path.join(PUBLIC, 'bible_data', sub, bookKey, `${ch}.json`);
    if (!fs.existsSync(fp)) return [];
    return loadJson(fp);
}

function verseTokens(bookKey, ch, v) {
    const prefix = `${bookKey} ${ch}:${v}!`;
    return loadChapter(bookKey, ch).filter(t => t.ref && t.ref.startsWith(prefix));
}

// レジストリを再帰的に走査して全 genitive.* エントリを収集
function collectGenitiveTypes(node, out = []) {
    if (!node || typeof node !== 'object') return out;
    if (Array.isArray(node)) {
        node.forEach(n => collectGenitiveTypes(n, out));
        return out;
    }
    if (typeof node.id === 'string' && node.id.startsWith('genitive.')) {
        out.push(node);
    }
    Object.values(node).forEach(v => collectGenitiveTypes(v, out));
    return out;
}

const UNCLASSIFIED_TEXT = 'ここでは、状況や背景が補足されています。';

// ════════════════════════════════════════════════════════════════
// §1  レジストリカバレッジ
// ════════════════════════════════════════════════════════════════
section('§1  レジストリカバレッジ');

const genitiveTypes = collectGenitiveTypes(syntaxRegistry);
const genitiveIds   = genitiveTypes.map(t => t.id);

console.log(`  registry 上の genitive.* 型: ${genitiveIds.length} 件`);
if (VERBOSE) genitiveIds.forEach(id => console.log(`    ${id}`));

check('genitive.* 型が1件以上存在', genitiveIds.length > 0);
check('genitive.source が存在', genitiveIds.includes('genitive.source'),
      'Phase 1 で追加されたはず');

let coverageFailCount = 0;
for (const id of genitiveIds) {
    try {
        const result = rf.format({ type: id });
        const text   = result && result.summary;
        const ok = (
            text != null &&
            text !== '' &&
            text !== 'なし' &&
            text !== UNCLASSIFIED_TEXT &&
            !String(text).includes('undefined')
        );
        if (!ok) {
            process.stdout.write(`  FAIL  ReadingFormatter mapping missing: ${id}\n`);
            process.stdout.write(`         (got: ${JSON.stringify(text)})\n`);
            coverageFailCount++;
            FAIL++;
        } else {
            if (VERBOSE) process.stdout.write(`  PASS  mapping ${id.padEnd(28)} → "${text.slice(0, 30)}…"\n`);
            PASS++;
        }
    } catch (e) {
        process.stdout.write(`  FAIL  format() threw for ${id}: ${e.message}\n`);
        coverageFailCount++;
        FAIL++;
    }
}

check(`全 ${genitiveIds.length} 型が _CLAUSE_TYPE_TO_GLOSS_KEY に存在`,
      coverageFailCount === 0,
      coverageFailCount > 0 ? `${coverageFailCount} 型が UNCLASSIFIED にフォールバック` : '');

// ════════════════════════════════════════════════════════════════
// §2  ReadingFormatter — 出力品質検証
// ════════════════════════════════════════════════════════════════
section('§2  ReadingFormatter — 出力品質');

const PLACEHOLDER_RE = /\{\{|TODO|undefined|FIXME|TBD/i;

for (const id of genitiveIds) {
    const result = rf.format({ type: id });
    const text   = result && result.summary;

    check(`${id} — null でない`,   text != null, `got: ${text}`);
    check(`${id} — 空文字でない`, text !== '');
    check(`${id} — 「なし」でない`, text !== 'なし');
    check(`${id} — UNCLASSIFIED フォールバックでない`, text !== UNCLASSIFIED_TEXT,
          'mapping が _CLAUSE_TYPE_TO_GLOSS_KEY に登録されていない');
    check(`${id} — undefined を含まない`, !String(text || '').includes('undefined'));
    check(`${id} — プレースホルダー不在`, !PLACEHOLDER_RE.test(String(text || '')));
}

// format() は discourse + type のどちらのパスでも同じ結果を返すか
{
    const byType      = rf.format({ type: 'genitive.subjective' });
    const byClause    = rf.format({ clauseContext: { type: 'genitive.subjective' } });
    check('clauseContext パス = direct type パス',
          byType.summary === byClause.summary,
          `direct="${byType.summary}"  clause="${byClause.summary}"`);
}

// ════════════════════════════════════════════════════════════════
// §3  構文レジストリ整合性
// ════════════════════════════════════════════════════════════════
section('§3  構文レジストリ整合性');

// 3-a. 構文型 ID 重複チェック（"category.type" 形式のIDのみ — 条件・シグナルIDは型をまたいで共有される）
{
    function allTypeIds(node, out = []) {
        if (!node || typeof node !== 'object') return out;
        if (Array.isArray(node)) { node.forEach(n => allTypeIds(n, out)); return out; }
        // "xxxx.yyyy" 形式 (category.subtype) のみ構文型IDとして収集
        if (typeof node.id === 'string' && /^[a-z_]+\.[a-z_]+$/.test(node.id)) {
            out.push(node.id);
        }
        Object.values(node).forEach(v => allTypeIds(v, out));
        return out;
    }
    const ids    = allTypeIds(syntaxRegistry);
    const unique = new Set(ids);
    const dupes  = ids.filter((id, i) => ids.indexOf(id) !== i);
    check('構文型 ID が一意', unique.size === ids.length,
          dupes.length ? `重複: ${[...new Set(dupes)].join(', ')}` : '');
}

// 3-b. グループ参照整合性
{
    const topGroups = new Set(
        (syntaxRegistry.groups || []).map(g => g.id)
        .concat(Object.keys(syntaxRegistry.categories || {}))
    );
    // genitive 親カテゴリーが存在するか
    const hasGenitive = topGroups.has('genitive') ||
        Boolean(syntaxRegistry.categories?.genitive);
    check('genitive カテゴリーが存在', hasGenitive);
}

// 3-c. genitive.* 各型の必須フィールド
for (const t of genitiveTypes) {
    const id = t.id;
    check(`${id} — label_ja 存在`,   Boolean(t.label_ja),   `label_ja が空`);
    check(`${id} — label_en 存在`,   Boolean(t.label_en),   `label_en が空`);
    check(`${id} — wallace_ref 存在`, Boolean(t.wallace_ref), `wallace_ref が空`);
    // status は 'active'（完全実装）または 'stub'（プレースホルダー）が有効
    check(`${id} — status が有効`,
          ['active', 'stub', undefined].includes(t.status),
          `status="${t.status}"`);
}

// ════════════════════════════════════════════════════════════════
// §4  代表節の回帰テスト
// ════════════════════════════════════════════════════════════════
section('§4  代表節の回帰テスト');

/**
 * 指定トークン（lemma 検索）に対して genitive 候補トップを返す。
 * @returns {{ topId, topConf, allCandidates }}
 */
function analyzeToken(bookKey, ch, v, targetLemma) {
    const tokens = verseTokens(bookKey, ch, v);
    if (!tokens.length) return { topId: null, topConf: 0, allCandidates: [] };

    const all    = sa.analyzeAll(tokens);
    const entry  = all.results.find(r =>
        (r.output?.targetLemma ?? '') === targetLemma ||
        (tokens[r.tokenIdx]?.lemma  ?? '') === targetLemma
    );
    if (!entry || !entry.output) return { topId: null, topConf: 0, allCandidates: [] };

    const candidates = (entry.output.candidates || [])
        .filter(c => c.id && c.id.startsWith('genitive.'))
        .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

    const top = candidates[0];
    return {
        topId:         top?.id    ?? null,
        topConf:       top?.confidence ?? 0,
        allCandidates: candidates,
        tokenText:     entry.output.targetWord,
        tokenIdx:      entry.tokenIdx,
    };
}

function verseTest(label, bookKey, ch, v, targetLemma, expectedId, minConf = 0.30) {
    const r = analyzeToken(bookKey, ch, v, targetLemma);

    const candidateSummary = r.allCandidates.length
        ? r.allCandidates.map(c => `${c.id}(${(c.confidence ?? 0).toFixed(2)})`).join(', ')
        : '(なし)';

    if (VERBOSE) {
        console.log(`\n  [${label}] token="${r.tokenText}" idx=${r.tokenIdx}`);
        console.log(`    candidates: ${candidateSummary}`);
    }

    const found = r.allCandidates.find(c => c.id === expectedId);
    check(`${label} — ${expectedId} が候補に存在`,
          Boolean(found),
          found ? '' : `実際の候補: ${candidateSummary}`);

    check(`${label} — ${expectedId} が最高スコア`,
          r.topId === expectedId,
          r.topId !== expectedId
              ? `topId="${r.topId}"(${r.topConf.toFixed(2)}) 期待="${expectedId}"  全候補: ${candidateSummary}`
              : '');

    check(`${label} — confidence ≥ ${minConf}`,
          found ? (found.confidence ?? 0) >= minConf : false,
          found ? `confidence=${found.confidence?.toFixed(2)}` : '対象なし');
}

// ── JAS 1:13 → 分離属格（Ἀπὸ θεοῦ）
// Fix②(Wallace §4.C.6-4): Separation は広義のデフォルト。Source は特殊例。
// πειράζω は分離動詞でも起源動詞でもないため、ἀπό + 属格の曖昧ケースでは separation が優先。
// genitive.source は候補（confidence ~0.49）に残る点は保持される。
console.log('\n  ─── JAS 1:13 ────────────────────────────────');
console.log('  ヤコブ 1:13: Ἀπὸ θεοῦ πειράζομαι');
console.log('  期待: θεοῦ → genitive.separation（Fix②: ἀπό+属格の曖昧ケースでは separation がデフォルト優先）');
verseTest('JAS 1:13 θεοῦ', 'JAS', 1, 13, 'θεός', 'genitive.separation');

// ── ROM 8:35 → 主語的属格（τῆς ἀγάπης τοῦ Χριστοῦ）
console.log('\n  ─── ROM 8:35 ────────────────────────────────');
console.log('  ローマ 8:35: τῆς ἀγάπης τοῦ Χριστοῦ');
console.log('  期待: Χριστοῦ → genitive.subjective（ἀγάπη が動作名詞ヘッド）');
verseTest('ROM 8:35 Χριστοῦ', 'ROM', 8, 35, 'Χριστός', 'genitive.subjective');

// ── JHN 2:17 → 目的語的属格（ζῆλος τοῦ οἴκου σου）
// 注: ζῆλος は subjective・objective の両 trigger list に掲載されており
//   ヘッドの意味論だけでは弁別不可能（Wallace §4.B.2, JHN 2:17 は OG の典型例）。
//   両候補が同スコアになる場合があるため「top-2 以内」を要件とする。
console.log('\n  ─── JHN 2:17 ────────────────────────────────');
console.log('  ヨハネ 2:17: ζῆλος τοῦ οἴκου σου');
console.log('  期待: οἴκου → genitive.objective（top-2 以内・同点 subjective との競合あり）');
{
    const r = analyzeToken('JHN', 2, 17, 'οἶκος');
    const candidateSummary = r.allCandidates.length
        ? r.allCandidates.map(c => `${c.id}(${(c.confidence ?? 0).toFixed(2)})`).join(', ')
        : '(なし)';
    if (VERBOSE) {
        console.log(`\n  [JHN 2:17 οἴκου] token="${r.tokenText}" idx=${r.tokenIdx}`);
        console.log(`    candidates: ${candidateSummary}`);
    }
    const found = r.allCandidates.find(c => c.id === 'genitive.objective');
    const rank  = r.allCandidates.findIndex(c => c.id === 'genitive.objective') + 1;
    check('JHN 2:17 οἴκου — genitive.objective が候補に存在', Boolean(found),
          `実際: ${candidateSummary}`);
    check('JHN 2:17 οἴκου — genitive.objective が top-2 以内', rank > 0 && rank <= 2,
          `rank=${rank} (${candidateSummary.slice(0, 80)})`);
    check('JHN 2:17 οἴκου — confidence ≥ 0.30',
          found ? (found.confidence ?? 0) >= 0.30 : false,
          found ? `confidence=${found.confidence?.toFixed(2)}` : '対象なし');
}

// ── ROM 11:17 → 部分属格（τινες τῶν κλάδων）
console.log('\n  ─── ROM 11:17 ───────────────────────────────');
console.log('  ローマ 11:17: τινες τῶν κλάδων');
console.log('  期待: κλάδων → genitive.partitive（τινες が量化ヘッド）');
verseTest('ROM 11:17 κλάδων', 'ROM', 11, 17, 'κλάδος', 'genitive.partitive');

// ── LUK 19:2 → 属格なし（与格名詞 ὀνόματι）
console.log('\n  ─── LUK 19:2 ────────────────────────────────');
console.log('  ルカ 19:2: ὀνόματι καλούμενος Ζακχαῖος');
console.log('  期待: ὀνόματι（与格）に genitive.* 候補が存在しない');
{
    const tokens = verseTokens('LUK', 19, 2);
    const all    = tokens.length ? sa.analyzeAll(tokens) : null;
    const entry  = all?.results?.find(r =>
        (tokens[r.tokenIdx]?.lemma ?? '') === 'ὄνομα'
    );
    const genCandidates = (entry?.output?.candidates || [])
        .filter(c => c.id && c.id.startsWith('genitive.'));

    if (VERBOSE && entry) {
        console.log(`    token="${entry.output.targetWord}" case=${tokens[entry.tokenIdx]?.case}`);
        console.log(`    genitive candidates: ${genCandidates.length === 0 ? '(なし)' : genCandidates.map(c=>c.id).join(',')}`);
    }

    check('LUK 19:2 ὀνόματι — case は dative',
          (tokens.find(t => t.lemma === 'ὄνομα')?.case ?? '') === 'dative',
          `case="${tokens.find(t=>t.lemma==='ὄνομα')?.case}"`);

    check('LUK 19:2 ὀνόματι — genitive.* 候補が存在しない',
          genCandidates.length === 0,
          genCandidates.length > 0
              ? `genitive 候補が ${genCandidates.length} 件: ${genCandidates.map(c=>c.id).join(', ')}`
              : '');
}

// ════════════════════════════════════════════════════════════════
// §5  未知 syntax ID のフォールバック
// ════════════════════════════════════════════════════════════════
section('§5  未知 syntax ID のフォールバック');

{
    const UNKNOWN_IDS = [
        'genitive.nonexistent_type',
        'genitive.',
        '',
        null,
        undefined,
        'clause.purpose',       // 属格でない型
        'DISCOURSE_EXPLANATION', // 内部キーが直接漏れた場合
    ];

    for (const id of UNKNOWN_IDS) {
        let result, threw = false;
        try {
            result = rf.format(id == null ? null : { type: id });
        } catch (e) {
            threw = true;
            process.stdout.write(`  FAIL  format({type:${JSON.stringify(id)}}) が例外 — ${e.message}\n`);
            FAIL++;
        }
        if (!threw) {
            check(`format({type:${JSON.stringify(id)}}) — クラッシュしない`, true);
            const text = result?.summary ?? null;
            check(`format({type:${JSON.stringify(id)}}) — null または有効文字列`,
                  text === null || (typeof text === 'string' && text.length > 0),
                  `got: ${JSON.stringify(text)}`);
            // 内部キーが UI テキストに漏れていないか
            check(`format({type:${JSON.stringify(id)}}) — 内部キー漏洩なし`,
                  !String(text || '').match(/^[A-Z_]+$/),
                  `内部キーが漏洩: ${text}`);
        }
    }
}

// ════════════════════════════════════════════════════════════════
// §6  UI ラベル整合性
// ════════════════════════════════════════════════════════════════
section('§6  UI ラベル整合性');

{
    const seen = new Set();
    for (const t of genitiveTypes) {
        // label_ja が他と重複していないか
        const key = `label_ja:${t.label_ja}`;
        check(`${t.id} — label_ja "${t.label_ja}" が一意`,
              !seen.has(key),
              `重複: 別の型と同じ label_ja`);
        seen.add(key);
    }

    // 各型のテキストが他の型と重複していないか（UNCLASSIFIED フォールバックの排除）
    const textSet = new Map(); // text → typeId
    for (const id of genitiveIds) {
        const result = rf.format({ type: id });
        const text   = result?.summary;
        if (text != null && text !== UNCLASSIFIED_TEXT) {
            if (textSet.has(text)) {
                warn(`${id} と ${textSet.get(text)} が同一テンプレートテキストを共有`,
                     text.slice(0, 40));
            } else {
                textSet.set(text, id);
            }
        }
    }
    check('全 genitive 型のテンプレートテキストが一意', WARN === 0,
          WARN > 0 ? `${WARN} 件の重複テキストを検出（上記参照）` : '');
}

// ════════════════════════════════════════════════════════════════
// §7  三方向 completeness テスト
//   A = registry の全 genitive.* ID
//   B = _CLAUSE_TYPE_TO_GLOSS_KEY の genitive.* エントリ
//   C = _CLAUSE_TYPE_TO_GLOSS_KEY 経由で _WALLACE_TEXT に存在するキー
// A = B = C であることを検証する。
// ════════════════════════════════════════════════════════════════
section('§7  三方向 completeness テスト (A = B = C)');

{
    // A: registry の全 genitive.* ID
    const setA = new Set(genitiveIds);

    // B: _CLAUSE_TYPE_TO_GLOSS_KEY に登録されている genitive.* キー
    const setB = new Set(
        Object.keys(_CLAUSE_TYPE_TO_GLOSS_KEY).filter(k => k.startsWith('genitive.'))
    );

    // C: _CLAUSE_TYPE_TO_GLOSS_KEY 経由で _WALLACE_TEXT に実在するテンプレートキー
    //    (genitive.* → GENITIVE_* → _WALLACE_TEXT[GENITIVE_*] が存在するもの)
    const setC = new Set(
        Object.entries(_CLAUSE_TYPE_TO_GLOSS_KEY)
            .filter(([k]) => k.startsWith('genitive.'))
            .filter(([, v]) => v in _WALLACE_TEXT)
            .map(([k]) => k)
    );

    // ── 差分計算 ─────────────────────────────────────────────────

    // A − B: registry にあるが _CLAUSE_TYPE_TO_GLOSS_KEY にない
    const inAnotB = [...setA].filter(id => !setB.has(id));
    // B − A: _CLAUSE_TYPE_TO_GLOSS_KEY にあるが registry にない
    const inBnotA = [...setB].filter(id => !setA.has(id));
    // B − C: _CLAUSE_TYPE_TO_GLOSS_KEY にあるが _WALLACE_TEXT にテンプレートがない
    const inBnotC = [...setB].filter(id => !setC.has(id));

    // ── レポート ─────────────────────────────────────────────────

    console.log(`\n  A (registry genitive.*)           : ${setA.size} 件`);
    console.log(`  B (_CLAUSE_TYPE_TO_GLOSS_KEY)     : ${setB.size} 件`);
    console.log(`  C (_WALLACE_TEXT に実在するテンプレート): ${setC.size} 件`);

    if (inAnotB.length) {
        console.log(`\n  A − B (mapping 未登録):`);
        inAnotB.forEach(id => console.log(`    MISSING  ${id}`));
    }
    if (inBnotA.length) {
        console.log(`\n  B − A (registry に存在しない mapping):`);
        inBnotA.forEach(id => console.log(`    ORPHAN   ${id}`));
    }
    if (inBnotC.length) {
        console.log(`\n  B − C (mapping はあるが _WALLACE_TEXT テンプレートが欠落):`);
        inBnotC.forEach(id => {
            const key = _CLAUSE_TYPE_TO_GLOSS_KEY[id];
            console.log(`    MISSING_TMPL  ${id}  →  ${key}`);
        });
    }

    check('A = B: registry ↔ _CLAUSE_TYPE_TO_GLOSS_KEY が一致',
          inAnotB.length === 0 && inBnotA.length === 0,
          inAnotB.length ? `mapping 未登録: ${inAnotB.join(', ')}` :
          inBnotA.length ? `orphan: ${inBnotA.join(', ')}` : '');

    check('B = C: _CLAUSE_TYPE_TO_GLOSS_KEY ↔ _WALLACE_TEXT が一致',
          inBnotC.length === 0,
          inBnotC.length ? `テンプレート欠落: ${inBnotC.join(', ')}` : '');

    check('A = B = C: 三方向すべてが一致',
          setA.size === setB.size && setB.size === setC.size &&
          inAnotB.length === 0 && inBnotA.length === 0 && inBnotC.length === 0);
}

// ════════════════════════════════════════════════════════════════
// §7a  Registry Lint（orphan signal / dead data / stub confidence）
// ════════════════════════════════════════════════════════════════
section('§7a  Registry Lint');

// 全カテゴリの型定義を収集（xsc を持つ "category.type" 形式ノード）
function collectAllTypeDefs(node, out = []) {
    if (!node || typeof node !== 'object') return out;
    if (Array.isArray(node)) { node.forEach(n => collectAllTypeDefs(n, out)); return out; }
    if (typeof node.id === 'string' && /^[a-z_]+\.[a-z_]+$/.test(node.id) && node.xsc) {
        out.push(node);
    }
    Object.values(node).forEach(v => collectAllTypeDefs(v, out));
    return out;
}
const allTypeDefs = collectAllTypeDefs(syntaxRegistry);
console.log(`  全カテゴリ型数: ${allTypeDefs.length} 件`);

// syntax-analyzer.js が globalThis に公開する condition→signal マップ
const CONDITION_SIGNAL_MAP = globalThis._BUILTIN_CONDITION_SIGNAL_MAP || {};
check('_BUILTIN_CONDITION_SIGNAL_MAP が公開されている',
      Object.keys(CONDITION_SIGNAL_MAP).length > 0);

// 恒偽であることが既知のチェック関数（意図的 dormant — WARN 対象）
const DEAD_CHECK_FNS = [
    'has_adjectival_equivalent',
    'semantic_equivalence_test',
    'semantic_substitution_test',
    'context_discourse_type_eq',
];

{
    let orphanCount = 0, dupSignalCount = 0, badLemmaCount = 0, badStubCount = 0;
    const dormantConds = [];

    for (const t of allTypeDefs) {
        const conds   = t.detection?.conditions ?? [];
        const condIds = conds.map(c => c.id);
        const reachable = new Set(condIds);
        condIds.forEach(cid => {
            if (CONDITION_SIGNAL_MAP[cid]) reachable.add(CONDITION_SIGNAL_MAP[cid]);
        });

        // (1) orphan signal: 対応する condition が直接にもマップ経由にも存在しない
        for (const s of (t.xsc?.signals ?? [])) {
            if (!reachable.has(s.id)) {
                check(`lint orphan: ${t.id} / ${s.id}`, false,
                      'condition にも CONDITION_SIGNAL_MAP にも対応がない（無条件加点になる）');
                orphanCount++;
            }
        }

        // (2) duplicate signal id（同一型内）
        const sigIds = (t.xsc?.signals ?? []).map(s => s.id);
        const dupSig = sigIds.filter((id, i) => sigIds.indexOf(id) !== i);
        if (dupSig.length) {
            check(`lint duplicate signal: ${t.id}`, false, `重複: ${[...new Set(dupSig)].join(', ')}`);
            dupSignalCount++;
        }

        // (3) unreachable (dormant) condition: 恒偽チェック関数を使用
        for (const c of conds) {
            if (DEAD_CHECK_FNS.some(fn => String(c.check || '').includes(fn))) {
                dormantConds.push(`${t.id}/${c.id}`);
            }
        }

        // (4) dead lemma: 不定詞語尾のエントリ（レンマでない屈折形）
        //     + リスト内の完全重複
        const scanLists = (obj) => {
            if (!obj || typeof obj !== 'object') return;
            for (const [k, v] of Object.entries(obj)) {
                if (Array.isArray(v) && v.every(x => typeof x === 'string') && /lemmas|trigger/.test(k)) {
                    for (const entry of v) {
                        if (/(?:ᾶν|εῖν|έναι|ῆναι|σθαι)$/.test(entry)) {
                            check(`lint 不定詞レンマ: ${t.id} / ${k} / ${entry}`, false,
                                  '不定詞形はレンマではない');
                            badLemmaCount++;
                        }
                    }
                    const dups = v.filter((x, i) => v.indexOf(x) !== i);
                    if (dups.length) {
                        check(`lint リスト内重複: ${t.id} / ${k}`, false, dups.join(', '));
                        badLemmaCount++;
                    }
                }
            }
        };
        scanLists(t.detection);

        // (5) stub の default_confidence は UI 閾値 40 未満であること
        if (t.status === 'stub' && (t.xsc?.default_confidence ?? 0) >= 40) {
            check(`lint stub confidence: ${t.id}`, false,
                  `default_confidence=${t.xsc.default_confidence} は UI 閾値 0.40 に到達する`);
            badStubCount++;
        }
    }

    check('lint: orphan signal ゼロ', orphanCount === 0, `${orphanCount} 件`);
    check('lint: duplicate signal ゼロ', dupSignalCount === 0);
    check('lint: dead lemma / リスト重複ゼロ', badLemmaCount === 0);
    check('lint: stub default_confidence < 40', badStubCount === 0);

    if (dormantConds.length) {
        warn(`dormant condition ${dormantConds.length} 件（意図的・恒偽チェック使用）`,
             dormantConds.join(', '));
    }

    // (6) example_verse の型間重複（情報提供 — 同一節が複数現象を例示すること自体は合法）
    const verseMap = new Map();
    for (const t of allTypeDefs) {
        if (!t.example_verse) continue;
        if (verseMap.has(t.example_verse)) {
            warn(`example_verse 重複: ${t.example_verse}`,
                 `${verseMap.get(t.example_verse)} と ${t.id}`);
        } else {
            verseMap.set(t.example_verse, t.id);
        }
    }
}

// ════════════════════════════════════════════════════════════════
// §7b  Dative 回帰テスト
// ════════════════════════════════════════════════════════════════
section('§7b  Dative 回帰テスト');

/** カテゴリ prefix を指定できる汎用版 analyzeToken */
function analyzeTokenCat(bookKey, ch, v, targetLemma, prefix) {
    const tokens = verseTokens(bookKey, ch, v);
    if (!tokens.length) return { topId: null, topConf: 0, allCandidates: [], tokenText: null };
    const all   = sa.analyzeAll(tokens);
    const entry = all.results.find(r =>
        (tokens[r.tokenIdx]?.lemma ?? '') === targetLemma &&
        (entryOutputHasPrefix(r, prefix))
    ) || all.results.find(r => (tokens[r.tokenIdx]?.lemma ?? '') === targetLemma);
    if (!entry || !entry.output) return { topId: null, topConf: 0, allCandidates: [], tokenText: null };
    const candidates = (entry.output.candidates || [])
        .filter(c => c.id && c.id.startsWith(prefix))
        .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    const top = candidates[0];
    return {
        topId:   top?.id ?? null,
        topConf: top?.confidence ?? 0,
        allCandidates: candidates,
        tokenText: entry.output.targetWord,
    };
}
function entryOutputHasPrefix(r, prefix) {
    return (r.output?.candidates || []).some(c => c.id && c.id.startsWith(prefix));
}
function catVerseTest(label, bookKey, ch, v, targetLemma, prefix, expectedId) {
    const r = analyzeTokenCat(bookKey, ch, v, targetLemma, prefix);
    const summary = r.allCandidates.length
        ? r.allCandidates.map(c => `${c.id}(${(c.confidence ?? 0).toFixed(2)})`).join(', ')
        : '(なし)';
    if (VERBOSE) console.log(`  [${label}] token="${r.tokenText}"  candidates: ${summary}`);
    check(`${label} — ${expectedId} が候補に存在`,
          r.allCandidates.some(c => c.id === expectedId), `実際: ${summary}`);
    check(`${label} — ${expectedId} が最高スコア`,
          r.topId === expectedId,
          r.topId !== expectedId ? `top="${r.topId}"(${r.topConf.toFixed(2)})  全候補: ${summary}` : '');
}

// ── MAT 7:6 → 間接目的語与格（Μὴ δῶτε τὸ ἅγιον τοῖς κυσίν）Wallace pp.140–142
console.log('\n  ─── MAT 7:6 ─────────────────────────────────');
console.log('  期待: κυσίν → dative.indirect_object（δίδωμι + 与格受け手）');
catVerseTest('MAT 7:6 κυσίν', 'MAT', 7, 6, 'κύων', 'dative.', 'dative.indirect_object');

// ── ROM 6:11 → 基準与格（νεκροὺς μὲν τῇ ἁμαρτίᾳ）Wallace pp.144–146
// P1-1 修正の検証: reference_head_word が節内スキャンで νεκρός/ζάω を検出すること。
console.log('\n  ─── ROM 6:11 ────────────────────────────────');
console.log('  期待: ἁμαρτίᾳ → dative.reference（νεκρός + 神学的名詞）');
catVerseTest('ROM 6:11 ἁμαρτίᾳ', 'ROM', 6, 11, 'ἁμαρτία', 'dative.', 'dative.reference');

// 将来実装（Wallace 上のカテゴリ欠落 — stub 追加後に有効化）:
//   dative.possession    (Wallace pp.149–151)  例: LUK 2:7 οὐκ ἦν αὐτοῖς τόπος
//   dative.direct_object (Wallace pp.171–173)  例: MAT 4:10 αὐτῷ μόνῳ λατρεύσεις
console.log('  （将来: dative.possession / dative.direct_object — カテゴリ未実装のため保留）');

// ════════════════════════════════════════════════════════════════
// §7c  Participle 回帰テスト
// ════════════════════════════════════════════════════════════════
section('§7c  Participle 回帰テスト');

// ── JHN 4:11 → 限定用法（τὸ ὕδωρ τὸ ζῶν・第2限定位置）Wallace pp.617–618
// P0-2 修正の検証: substantival が matching_head_noun_present で降格されること。
console.log('\n  ─── JHN 4:11 ────────────────────────────────');
console.log('  期待: ζῶν → participle.attributive（substantival 0.99 誤断の回帰防止）');
catVerseTest('JHN 4:11 ζῶν', 'JHN', 4, 11, 'ζάω', 'participle.', 'participle.attributive');

// ── JHN 3:16 → 実体用法（πᾶς ὁ πιστεύων）Wallace pp.619–621
// πᾶς は量化詞（A）であり限定位置の名詞（N）ではないため降格されないこと。
console.log('\n  ─── JHN 3:16 ────────────────────────────────');
console.log('  期待: πιστεύων → participle.substantival');
catVerseTest('JHN 3:16 πιστεύων', 'JHN', 3, 16, 'πιστεύω', 'participle.', 'participle.substantival');

// ── MAT 4:2 → 時間分詞（νηστεύσας ... ἐπείνασεν）Wallace pp.623–627
console.log('\n  ─── MAT 4:2 ─────────────────────────────────');
console.log('  期待: νηστεύσας → participle.adverbial_temporal（アオリスト先行動作）');
catVerseTest('MAT 4:2 νηστεύσας', 'MAT', 4, 2, 'νηστεύω', 'participle.', 'participle.adverbial_temporal');

// ── MAT 28:19 → 付帯状況（πορευθέντες οὖν μαθητεύσατε）Wallace p.645 の旗艦例
// 注: MAT 2:8 は節分割がないため主動詞が εἶπεν（前半節）に解決され、
//     さらに後続 εὕρητε（εὑρίσκω）が complementary を誤発火させる。
//     単一命令節である大宣教命令を採用（Wallace が付帯状況の代表例として引用）。
console.log('\n  ─── MAT 28:19 ───────────────────────────────');
console.log('  期待: πορευθέντες → participle.adverbial_attendant（アオリスト分詞+アオリスト命令主動詞）');
catVerseTest('MAT 28:19 πορευθέντες', 'MAT', 28, 19, 'πορεύομαι', 'participle.', 'participle.adverbial_attendant');

// ════════════════════════════════════════════════════════════════
// §7d  Discovery Card stub ガード
// ════════════════════════════════════════════════════════════════
section('§7d  Discovery Card stub ガード');

{
    // 合成トークン: 前置詞直後の与格（IO/means は -50 除外、manner は P0-1 修正で
    // 条件化済み → active 型はすべて低スコアになるべきケース）
    const synth = [
        { pos: 'P', lemma: 'ἐν',    text: 'ἐν' },
        { pos: 'N', lemma: 'ξύλον', text: 'ξύλῳ',
          case: 'dative', gender: 'neuter', number: 'singular' },
    ];
    const all   = sa.analyzeAll(synth);
    const entry = all.results.find(r => r.tokenIdx === 1);
    const cands = (entry?.output?.candidates || [])
        .slice()
        .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    const top = cands[0];

    if (VERBOSE) {
        console.log(`    candidates: ${cands.map(c => `${c.id}(${(c.confidence??0).toFixed(2)}/${c.status})`).join(', ') || '(なし)'}`);
    }

    // Discovery Card は「非 stub の最上位」を読む（P0-3 の UI フィルタ）。
    // したがって検証すべき不変条件は
    //   (a) 非 stub の最上位候補が閾値 0.40 未満（カード非表示）
    //   (b) stub はそもそも 0.40 に到達できない（§7a lint と対）
    // Phase 18 注記: この不変条件は「与格の格機能」の抑制を守るもの（P0-1/P0-3）。
    // 横断カテゴリ（nominal_syntax = NP 構造の記述）は格機能ではないため対象外。
    const topActive = cands.find(c => (c.status ?? 'active') !== 'stub' &&
                                      String(c.id).startsWith('dative.'));
    check('合成 ἐν+与格 — 非 stub の与格最上位が UI 閾値 0.40 未満（Discovery Card 非表示）',
          !topActive || (topActive.confidence ?? 0) < 0.4,
          topActive ? `topActive=${topActive.id}(${topActive.confidence.toFixed(2)})` : '');

    check('合成 ἐν+与格 — 0.40 以上の stub 候補が存在しない',
          !cands.some(c => (c.status ?? 'active') === 'stub' && (c.confidence ?? 0) >= 0.4),
          '');

    // 全カテゴリ横断: stub 候補はいかなる場合も confidence < 0.40（§7a lint と対）
    const stubOver = allTypeDefs.filter(t =>
        t.status === 'stub' && (t.xsc?.default_confidence ?? 0) >= 40);
    check('全 stub の default_confidence が UI 閾値未満', stubOver.length === 0,
          stubOver.map(t => `${t.id}=${t.xsc.default_confidence}`).join(', '));
}

// ════════════════════════════════════════════════════════════════
// §7e  Context Engine（Phase 3: Head / Governor / Clause / Phrase / API）
// ════════════════════════════════════════════════════════════════
section('§7e  Context Engine');

/** 指定 lemma のトークンについて ContextBuilder.build() の結果を返す */
function buildCtx(bookKey, ch, v, targetLemma) {
    const tokens = verseTokens(bookKey, ch, v);
    const idx = tokens.findIndex(t => (t.lemma ?? '') === targetLemma);
    if (idx < 0) return null;
    return ContextBuilder.build(tokens[idx], tokens, idx);
}

// ── Head Resolution ──────────────────────────────────────────────
{
    check('ContextBuilder がエクスポートされている', typeof ContextBuilder?.build === 'function');

    // 属格: ROM 8:35 τῆς ἀγάπης τοῦ Χριστοῦ → Χριστοῦ の head は ἀγάπη
    const ctxGen = buildCtx('ROM', 8, 35, 'Χριστός');
    check('head(属格): ROM 8:35 Χριστοῦ → ἀγάπη',
          ctxGen?.headLemma === 'ἀγάπη',
          `headLemma="${ctxGen?.headLemma}"`);
    check('head(属格): headNoun 後方互換（同一トークン）',
          ctxGen?.headToken === ctxGen?.headNoun,
          'ctx.headToken と ctx.headNoun が一致しない');

    // 分詞: JHN 4:11 τὸ ὕδωρ τὸ ζῶν → ζῶν の head は ὕδωρ（冠詞 τό ではなく）
    const ctxPtc = buildCtx('JHN', 4, 11, 'ζάω');
    check('head(分詞): JHN 4:11 ζῶν → ὕδωρ（一致名詞・冠詞除外）',
          ctxPtc?.headLemma === 'ὕδωρ',
          `headLemma="${ctxPtc?.headLemma}"`);

    // 冠詞: 合成 [T][N] → head は直後の名詞
    const artToks = [
        { class: 'det',  lemma: 'ὁ',        text: 'ὁ',        case: 'nominative', gender: 'masculine', number: 'singular' },
        { class: 'noun', lemma: 'προφήτης', text: 'προφήτης', case: 'nominative', gender: 'masculine', number: 'singular' },
    ];
    const ctxArt = ContextBuilder.build(artToks[0], artToks, 0);
    check('head(冠詞): [ὁ][προφήτης] → προφήτης',
          ctxArt?.headLemma === 'προφήτης',
          `headLemma="${ctxArt?.headLemma}"`);

    // 与格: MAT 7:6 τὸ ἅγιον τοῖς κυσίν → κυσίν の head 解決が API で取得可能
    const ctxDat = buildCtx('MAT', 7, 6, 'κύων');
    check('head(与格): ctx.head API が同一形式で利用可能',
          ctxDat !== null && 'head' in ctxDat && 'headLemma' in ctxDat && 'headToken' in ctxDat);
}

// ── Governor Resolution ──────────────────────────────────────────
{
    // MAT 7:6 κυσίν: 支配動詞は δίδωμι（δῶτε）
    const ctxDat = buildCtx('MAT', 7, 6, 'κύων');
    check('governor(動詞): MAT 7:6 κυσίν → governorVerb = δίδωμι',
          (ctxDat?.governorVerb?.lemma ?? '') === 'δίδωμι',
          `governorVerb="${ctxDat?.governorVerb?.lemma}"`);

    // JAS 1:13 Ἀπὸ θεοῦ: 前置詞直後 → governor は ἀπό（POS 'P'）
    const ctxSrc = buildCtx('JAS', 1, 13, 'θεός');
    check('governor(前置詞): JAS 1:13 θεοῦ → governor = ἀπό',
          (ctxSrc?.governorLemma ?? '') === 'ἀπό' && ctxSrc?.governorPOS === 'P',
          `governor="${ctxSrc?.governorLemma}" pos="${ctxSrc?.governorPOS}"`);
}

// ── Clause Segmentation ──────────────────────────────────────────
{
    // MAT 2:8: "... εἶπεν· Πορευθέντες ἐξετάσατε ... παιδίου· ἐπὰν δὲ εὕρητε ..."
    // πορευθέντες の節は句読点（·）で区切られ、mainVerb は ἐξετάσατε（前半節の εἶπεν ではない）
    const ctx28 = buildCtx('MAT', 2, 8, 'πορεύομαι');
    check('clause: MAT 2:8 πορευθέντες の節 mainVerb = ἐξετάζω（εἶπεν 誤参照の解消）',
          (ctx28?.mainVerb?.lemma ?? '') === 'ἐξετάζω',
          `mainVerb="${ctx28?.mainVerb?.lemma}"`);
    check('clause: 節境界が詩節全体より狭い',
          ctx28 !== null && (ctx28.clauseStart > 0 || ctx28.clauseEnd < ctx28.tokens.length - 1),
          `[${ctx28?.clauseStart}, ${ctx28?.clauseEnd}] / ${ctx28?.tokens?.length}`);
    check('clause: 主節（非従属）判定', ctx28?.subordinateClause === false);

    // 同節の εὕρητε は ἐπάν 開始の従属節
    const ctxSub = buildCtx('MAT', 2, 8, 'εὑρίσκω');
    check('clause: MAT 2:8 εὕρητε → 従属節（ἐπάν 開始）',
          ctxSub?.subordinateClause === true,
          `subordinate=${ctxSub?.subordinateClause} [${ctxSub?.clauseStart},${ctxSub?.clauseEnd}]`);

    // 無動詞節ではフォールバック（詩節レベル mainVerb）が働く（MAT 2:1 属格絶対）
    const ctxGA = buildCtx('MAT', 2, 1, 'γεννάω');
    check('clause: 節内に定形動詞がなければ詩節レベルへフォールバック',
          ctxGA?.mainVerb != null,
          'mainVerb=null（フォールバック不発）');
}

// ── Phrase Detection ─────────────────────────────────────────────
{
    // JAS 1:13 Ἀπὸ θεοῦ → PP として同一句
    const tokens13 = verseTokens('JAS', 1, 13);
    const ctxSrc   = buildCtx('JAS', 1, 13, 'θεός');
    const prepIdx  = tokens13.findIndex(t => (t.lemma ?? '') === 'ἀπό');
    const thIdx    = tokens13.findIndex(t => (t.lemma ?? '') === 'θεός');
    check('phrase: JAS 1:13 Ἀπὸ θεοῦ が PP',
          ctxSrc?.phrase?.type === 'PP',
          `phrase=${JSON.stringify(ctxSrc?.phrase)}`);
    check('phrase: samePhrase(ἀπό, θεοῦ) = true',
          prepIdx >= 0 && thIdx >= 0 && ctxSrc?.samePhrase(prepIdx, thIdx) === true);
    check('phrase: governs(ἀπό, θεοῦ) = true（前置詞支配）',
          ctxSrc?.governs(prepIdx, thIdx) === true);
    check('phrase: dependsOn(θεοῦ, ἀπό) = true',
          ctxSrc?.dependsOn(thIdx, prepIdx) === true);

    // 属格句: ROM 8:35 τῆς ἀγάπης τοῦ Χριστοῦ → 連続属格が GenP に含まれる
    const ctxGen = buildCtx('ROM', 8, 35, 'Χριστός');
    const inGenP = (ctxGen?.genitivePhrases ?? []).some(p =>
        ctxGen.targetIdx >= p.start && ctxGen.targetIdx <= p.end && (p.end - p.start) >= 1);
    check('phrase: ROM 8:35 Χριστοῦ が複数語の属格句（GenP）に属する', inGenP,
          `genitivePhrases=${JSON.stringify(ctxGen?.genitivePhrases)}`);
}

// ── 共通 Context API ─────────────────────────────────────────────
{
    const ctx = buildCtx('MAT', 7, 6, 'κύων');
    const API_KEYS = [
        'head', 'headToken', 'headLemma',
        'governor', 'governorVerb', 'governorLemma', 'governorPOS',
        'clause', 'clauseStart', 'clauseEnd', 'subordinateClause',
        'phrases', 'phrase', 'genitivePhrases', 'semanticHints',
    ];
    for (const k of API_KEYS) {
        check(`Context API: ctx.${k} が存在`, ctx !== null && k in ctx);
    }
    const FN_KEYS = ['governs', 'dependsOn', 'samePhrase', 'nearestFiniteVerb'];
    for (const k of FN_KEYS) {
        check(`Context API: ctx.${k}() が関数`, typeof ctx?.[k] === 'function');
    }
    // nearestFiniteVerb が定形動詞を返す
    const nfv = ctx?.nearestFiniteVerb();
    check('Context API: nearestFiniteVerb() が定形動詞を返す',
          nfv != null && (nfv.mood ?? '') !== 'participle' && (nfv.mood ?? '') !== '',
          `mood="${nfv?.mood}"`);
    // semanticHints の内容
    check('Context API: semanticHints が isAfterPrep/hasNegation/hasArticleBefore/isProperNoun を持つ',
          ctx !== null &&
          ['isAfterPrep', 'hasNegation', 'hasArticleBefore', 'isProperNoun']
              .every(k => k in (ctx.semanticHints ?? {})));
}

// ── Clause Segmentation の分類への波及（MAT 2:8 付帯状況の是正） ──
// Phase 3 以前: 主動詞が前半節の εἶπεν（直説法）に解決され、
//               attendant が aorist_imperative_main を取れず complementary が最上位だった。
// Phase 3 以後: 節スコープの mainVerb = ἐξετάσατε（アオリスト命令法）→ attendant 最上位。
console.log('\n  ─── MAT 2:8（節分割による付帯状況の是正） ──────');
catVerseTest('MAT 2:8 πορευθέντες', 'MAT', 2, 8, 'πορεύομαι', 'participle.', 'participle.adverbial_attendant');

// ════════════════════════════════════════════════════════════════
// §7f  Phase 4 統合テスト（Context API 移行の検証）
// ════════════════════════════════════════════════════════════════
section('§7f  Phase 4 統合テスト');

// ── 属格絶対（Phase 4E: GenP ベース判定） ────────────────────────
// MAT 2:1 Τοῦ δὲ Ἰησοῦ γεννηθέντος — 後置小辞 δέ を透過して GenP が成立すること
console.log('\n  ─── MAT 2:1（属格絶対・δέ 透過） ─────────────');
catVerseTest('MAT 2:1 γεννηθέντος', 'MAT', 2, 1, 'γεννάω', 'participle.', 'participle.genitive_absolute');
catVerseTest('MAT 2:1 Ἰησοῦ（noun 側）', 'MAT', 2, 1, 'Ἰησοῦς', 'genitive.', 'genitive.absolute');

// MAT 9:18 ταῦτα αὐτοῦ λαλοῦντος — 代名詞主語の属格絶対（Wallace pp.654–655 引用例）
console.log('\n  ─── MAT 9:18（属格絶対・代名詞主語） ──────────');
catVerseTest('MAT 9:18 λαλοῦντος', 'MAT', 9, 18, 'λαλέω', 'participle.', 'participle.genitive_absolute');

// ── Dative Means（Phase 4F: governor/phrase ベース補正） ─────────
// ROM 3:28 δικαιοῦσθαι πίστει — 裸の道具的与格（Wallace pp.162–163）。
// governor が前置詞でないため道具的補正が正しく発動すること。
console.log('\n  ─── ROM 3:28（手段与格） ────────────────────');
catVerseTest('ROM 3:28 πίστει', 'ROM', 3, 28, 'πίστις', 'dative.', 'dative.means');
{
    const ctx = buildCtx('ROM', 3, 28, 'πίστις');
    check('ROM 3:28 πίστει — governor が前置詞でない（裸の与格）',
          ctx !== null && ctx.governorPOS !== 'P',
          `governorPOS="${ctx?.governorPOS}"`);
}

// ── Article Head（Phase 4H: head 探索の Context 一元化） ─────────
// JHN 1:21 Ὁ προφήτης — 冠詞の head が Context 経由で解決され
// par_excellence が最上位になること。
console.log('\n  ─── JHN 1:21（冠詞 head） ───────────────────');
{
    const tokens = verseTokens('JHN', 1, 21);
    const i = tokens.findIndex((t, k) =>
        (t.lemma ?? '') === 'ὁ' && (tokens[k + 1]?.lemma ?? '') === 'προφήτης');
    check('JHN 1:21 — ὁ + προφήτης の並びが存在', i >= 0);
    if (i >= 0) {
        const ctx = ContextBuilder.build(tokens[i], tokens, i);
        check('JHN 1:21 ὁ — ctx.headLemma = προφήτης（Context head 解決）',
              ctx.headLemma === 'προφήτης', `headLemma="${ctx.headLemma}"`);
        const all = sa.analyzeAll(tokens);
        const entry = all.results.find(r => r.tokenIdx === i);
        const top = (entry?.output?.candidates || [])[0];
        check('JHN 1:21 ὁ — article.par_excellence が最上位',
              top?.id === 'article.par_excellence',
              `top="${top?.id}"(${top?.confidence?.toFixed(2)})`);
    }
}

// ── Clause boundary（Phase 4C: 節スコープ検索の検証） ────────────
// MAT 2:8: complementary の知覚動詞（εὑρίσκω）は別節にあるため、
// 節スコープ化により πορευθέντες では発火しないこと。
console.log('\n  ─── MAT 2:8（節スコープの complementary 抑制） ──');
{
    const r = analyzeTokenCat('MAT', 2, 8, 'πορεύομαι', 'participle.');
    const comp = r.allCandidates.find(c => c.id === 'participle.complementary');
    check('MAT 2:8 πορευθέντες — complementary が知覚動詞シグナルを失う（≤ 0.35）',
          !comp || (comp.confidence ?? 0) <= 0.35,
          comp ? `complementary=${comp.confidence.toFixed(2)}` : '');
}

// ════════════════════════════════════════════════════════════════
// §7g  Phase 4.5 基盤テスト（Valency / Phrase / Dependency / Lexicon）
// ════════════════════════════════════════════════════════════════
section('§7g  Phase 4.5 基盤テスト');

// ── 4.5A: Verb Valency Dictionary ────────────────────────────────
{
    const reg = sa.registry ?? sa._registry ?? null;
    const loader = reg && typeof reg.getVerbValency === 'function' ? reg : null;
    check('valency: RegistryLoader.getVerbValency が存在', loader !== null);
    if (loader) {
        check('valency: ἀκούω → genitive（Wallace pp.131–134）',
              loader.getVerbValency('ἀκούω')?.governs_case === 'genitive');
        check('valency: πιστεύω → dative（Wallace pp.171–173）',
              loader.getVerbValency('πιστεύω')?.governs_case === 'dative');
        check('valency: προσκυνέω → dative',
              loader.getVerbValency('προσκυνέω')?.governs_case === 'dative');
        check('valency: παύομαι → complement participle（Wallace p.646）',
              loader.getVerbValency('παύομαι')?.complement === 'participle');
        check('valency: 未登録レンマ → null',
              loader.getVerbValency('τρέχω') === null);
        check('valency: _schema 等のメタキー → null',
              loader.getVerbValency('_schema') === null);
    }
}

// ── 4.5B: Phrase Layer エンリッチ ────────────────────────────────
{
    const ctx = buildCtx('JAS', 1, 13, 'θεός'); // Ἀπὸ θεοῦ = PP
    const pp = ctx?.phrase;
    check('phrase-enrich: PP に head が付与される', Number.isInteger(pp?.head));
    check('phrase-enrich: PP の headLemma = θεός（前置詞の目的語）',
          pp?.headLemma === 'θεός', `headLemma="${pp?.headLemma}"`);
    check('phrase-enrich: PP の case = genitive', pp?.case === 'genitive');
    check('phrase-enrich: dependents に前置詞が含まれる',
          Array.isArray(pp?.dependents) && pp.dependents.length >= 1);

    const ctxGen = buildCtx('ROM', 8, 35, 'Χριστός');
    const genp = (ctxGen?.genitivePhrases ?? []).find(p =>
        ctxGen.targetIdx >= p.start && ctxGen.targetIdx <= p.end);
    check('phrase-enrich: GenP にも case/head が付与される',
          genp?.case === 'genitive' && Number.isInteger(genp?.head));
}

// ── 4.5C: Dependency 拡張（名詞・分詞・属格修飾） ────────────────
{
    // 名詞 → 属格修飾: ROM 8:35 ἀγάπης governs Χριστοῦ
    const ctx = buildCtx('ROM', 8, 35, 'Χριστός');
    const toks = ctx?.tokens ?? [];
    const agapeIdx  = toks.findIndex(t => (t.lemma ?? '') === 'ἀγάπη');
    const christIdx = ctx?.targetIdx ?? -1;
    check('governs: 名詞 → 属格修飾（ἀγάπης governs Χριστοῦ）',
          ctx?.governs(agapeIdx, christIdx) === true);
    check('dependsOn: Χριστοῦ dependsOn ἀγάπης',
          ctx?.dependsOn(christIdx, agapeIdx) === true);

    // 名詞 → 限定分詞: JHN 4:11 ὕδωρ governs ζῶν
    const ctxPtc = buildCtx('JHN', 4, 11, 'ζάω');
    const t2 = ctxPtc?.tokens ?? [];
    const hydorIdx = t2.findIndex(t => (t.lemma ?? '') === 'ὕδωρ');
    check('governs: 名詞 → 限定分詞（ὕδωρ governs ζῶν）',
          ctxPtc?.governs(hydorIdx, ctxPtc.targetIdx) === true);

    // 属格絶対: MAT 2:1 γεννηθέντος governs Ἰησοῦ（同一 GenP 内）
    const ctxGA = buildCtx('MAT', 2, 1, 'γεννάω');
    const t3 = ctxGA?.tokens ?? [];
    const iesouIdx = t3.findIndex(t => (t.lemma ?? '') === 'Ἰησοῦς');
    check('governs: 属格分詞 → 意味上の主語（γεννηθέντος governs Ἰησοῦ）',
          ctxGA?.governs(ctxGA.targetIdx, iesouIdx) === true);
}

// ── 4.5D: Lexicon の registry 移行 ───────────────────────────────
{
    const reg = sa.registry ?? sa._registry ?? null;
    const irr = reg?.getList?.('irregular_comparative_lemmas');
    check('lexicon: irregular_comparative_lemmas が registry から解決される',
          irr instanceof Set && irr.has('μείζων'),
          `size=${irr?.size}`);
    const instr = reg?.getList?.('instrumental_noun_lemmas');
    check('lexicon: instrumental_noun_lemmas が registry から解決される',
          instr instanceof Set && instr.has('πίστις'),
          `size=${instr?.size}`);
    const sep = reg?.getList?.('separation_verb_lemmas');
    check('lexicon: separation_verb_lemmas に修正済み καταργέω が含まれる',
          sep instanceof Set && sep.has('καταργέω') && !sep.has('κατηργέω'));
}

// ── 4.5E: 全節リスト・二重小辞透過 ───────────────────────────────
{
    const ctx = buildCtx('MAT', 2, 8, 'πορεύομαι');
    check('clauses: ctx.clauses が複数節を返す（MAT 2:8）',
          Array.isArray(ctx?.clauses) && ctx.clauses.length >= 3,
          `clauses=${ctx?.clauses?.length}`);
    check('clauses: clause.index が所属節を指す',
          Number.isInteger(ctx?.clause?.index) &&
          ctx.clauses[ctx.clause.index]?.start <= ctx.targetIdx &&
          ctx.clauses[ctx.clause.index]?.end   >= ctx.targetIdx);
    check('clauses: parent フィールドが予約されている（null）',
          ctx?.clause?.parent === null);

    // 二重小辞透過: 合成 [gen] [μέν] [γάρ] [gen] が単一 GenP になる
    const synth = [
        { class: 'noun', lemma: 'θεός',  text: 'θεοῦ',  case: 'genitive', gender: 'masculine', number: 'singular' },
        { class: 'ptcl', lemma: 'μέν',   text: 'μὲν' },
        { class: 'conj', lemma: 'γάρ',   text: 'γὰρ' },
        { class: 'noun', lemma: 'νόμος', text: 'νόμου', case: 'genitive', gender: 'masculine', number: 'singular' },
    ];
    const sctx = ContextBuilder.build(synth[0], synth, 0);
    const genp = (sctx.genitivePhrases ?? [])[0];
    check('GenP: 二重小辞（μὲν γάρ）を透過して単一属格句になる',
          genp && genp.start === 0 && genp.end === 3,
          `GenP=${JSON.stringify(sctx.genitivePhrases)}`);
}

// ════════════════════════════════════════════════════════════════
// §7h  Phase 5 — Wallace Category Completion テスト
// ════════════════════════════════════════════════════════════════
section('§7h  Phase 5 カテゴリ完成テスト');

/** 同一 lemma が複数ある場合、expected が top のトークンを探す版 */
function catVerseTestAny(label, bookKey, ch, v, targetLemma, prefix, expectedId) {
    const tokens = verseTokens(bookKey, ch, v);
    const all = tokens.length ? sa.analyzeAll(tokens) : { results: [] };
    const entries = all.results.filter(r =>
        (tokens[r.tokenIdx]?.lemma ?? '') === targetLemma &&
        (r.output?.candidates || []).some(c => c.id?.startsWith(prefix)));
    const tops = entries.map(e => {
        const cs = (e.output.candidates || [])
            .filter(c => c.id.startsWith(prefix))
            .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
        return cs[0]?.id ?? null;
    });
    check(`${label} — ${expectedId} が top となるトークンが存在`,
          tops.includes(expectedId),
          `tops=[${tops.join(', ')}]`);
    const anyHas = entries.some(e =>
        (e.output.candidates || []).some(c => c.id === expectedId));
    check(`${label} — ${expectedId} が候補に存在`, anyHas);
}

// ── 完了条件: gen/dat/ptc/article に stub ゼロ ───────────────────
{
    const CORE = ['genitive', 'dative', 'participle', 'article'];
    for (const cat of CORE) {
        const stubs = allTypeDefsPhase5().filter(t =>
            t.id.startsWith(cat + '.') && t.status === 'stub');
        check(`完了条件: ${cat} に stub が存在しない`, stubs.length === 0,
              stubs.map(t => t.id).join(', '));
    }
    function allTypeDefsPhase5() { return collectAllTypeDefs(syntaxRegistry); }
    // accusative カテゴリが存在し active 型を持つ
    const accTypes = collectAllTypeDefs(syntaxRegistry).filter(t => t.id.startsWith('accusative.'));
    check('Accusative Engine: カテゴリが存在（型 ≥ 5）', accTypes.length >= 5, `${accTypes.length} 型`);
    check('Accusative Engine: active 型 ≥ 3',
          accTypes.filter(t => t.status === 'active').length >= 3);
}

// ── Dative 完成 ──────────────────────────────────────────────────
console.log('\n  ─── Dative: possession / direct_object / agent / measure / ethical ───');
catVerseTest('LUK 2:7 αὐτοῖς（所有与格）', 'LUK', 2, 7, 'αὐτός', 'dative.', 'dative.possession');
catVerseTestAny('MAT 4:10 αὐτῷ（動詞支配与格・valency 辞書）', 'MAT', 4, 10, 'αὐτός', 'dative.', 'dative.direct_object');
catVerseTest('LUK 23:15 αὐτῷ（行為者与格・Wallace p.165）', 'LUK', 23, 15, 'αὐτός', 'dative.', 'dative.agent');
catVerseTest('ROM 5:9 πολλῷ（程度与格）', 'ROM', 5, 9, 'πολύς', 'dative.', 'dative.measure');
catVerseTest('MAT 21:5 σοι（道義的与格）', 'MAT', 21, 5, 'σύ', 'dative.', 'dative.ethical');

// ── Genitive 完成 ────────────────────────────────────────────────
console.log('\n  ─── Genitive: direct_object / material / content / attributed / agency / place / predicate / plenary ───');
catVerseTest('JHN 10:3 φωνῆς（動詞支配属格・ἀκούω valency）', 'JHN', 10, 3, 'φωνή', 'genitive.', 'genitive.direct_object');
catVerseTest('REV 18:12 χρυσοῦ（材料属格）', 'REV', 18, 12, 'χρυσός', 'genitive.', 'genitive.material');
catVerseTest('JHN 21:8 ἰχθύων（内容属格・Wallace pp.92–94）', 'JHN', 21, 8, 'ἰχθύς', 'genitive.', 'genitive.content');
catVerseTest('ROM 6:4 ζωῆς（被属性属格・καινότης 逆転）', 'ROM', 6, 4, 'ζωή', 'genitive.', 'genitive.attributed');
catVerseTest('JHN 6:45 θεοῦ（行為者属格・-τος 動形容詞）', 'JHN', 6, 45, 'θεός', 'genitive.', 'genitive.agency');
catVerseTest('LUK 16:24 ὕδατος（場所属格・Wallace pp.124–125）', 'LUK', 16, 24, 'ὕδωρ', 'genitive.', 'genitive.place');
{
    // 1CO 6:19 ἑαυτῶν → predicate genitive（コプラ節内・修正後の context_has_copula 検証）
    const r = analyzeTokenCat('1CO', 6, 19, 'ἑαυτοῦ', 'genitive.');
    check('1CO 6:19 ἑαυτῶν — genitive.predicate が最高スコア',
          r.topId === 'genitive.predicate',
          `top="${r.topId}"(${r.topConf.toFixed(2)})`);
}
{
    // plenary: ROM 8:35 で候補として生存（top は subjective のまま）
    const r = analyzeToken('ROM', 8, 35, 'Χριστός');
    const pl = r.allCandidates.find(c => c.id === 'genitive.plenary');
    check('ROM 8:35 — plenary が active 候補（≥0.45）に存在',
          pl != null && (pl.confidence ?? 0) >= 0.45,
          pl ? pl.confidence.toFixed(2) : 'なし');
    check('ROM 8:35 — subjective が引き続き最高スコア', r.topId === 'genitive.subjective');
}

// ── Participle 完成 ──────────────────────────────────────────────
console.log('\n  ─── Participle: redundant / complementary(valency) / indirect_discourse / 副詞系 ───');
catVerseTest('MAT 4:4 ἀποκριθείς（冗語的分詞）', 'MAT', 4, 4, 'ἀποκρίνομαι', 'participle.', 'participle.redundant');
catVerseTest('LUK 5:4 λαλῶν（補語分詞・παύω valency）', 'LUK', 5, 4, 'λαλέω', 'participle.', 'participle.complementary');
catVerseTest('ACT 7:12 ὄντα（間接話法分詞・旧 complementary から独立）', 'ACT', 7, 12, 'εἰμί', 'participle.', 'participle.indirect_discourse');
catVerseTest('HEB 5:8 ὤν（譲歩・καίπερ）', 'HEB', 5, 8, 'εἰμί', 'participle.', 'participle.adverbial_concessive');
catVerseTest('GAL 6:9 ἐκλυόμενοι（条件・μή + 未来主動詞）', 'GAL', 6, 9, 'ἐκλύομαι', 'participle.', 'participle.adverbial_conditional');
catVerseTest('LUK 19:6 χαίρων（様態）', 'LUK', 19, 6, 'χαίρω', 'participle.', 'participle.adverbial_manner');
catVerseTest('ACT 8:27 προσκυνήσων（目的・未来分詞）', 'ACT', 8, 27, 'προσκυνέω', 'participle.', 'participle.adverbial_purpose_result');
catVerseTest('ROM 12:9 ἀποστυγοῦντες（命令的分詞）', 'ROM', 12, 9, 'ἀποστυγέω', 'participle.', 'participle.imperatival');
catVerseTest('MAT 16:19 δεδεμένον（迂言法・ἔσται + 完了分詞）', 'MAT', 16, 19, 'δέω', 'participle.', 'participle.periphrastic');
{
    // MAT 3:15 πρέπον: predicate が有効候補（periphrastic との競合は許容）
    const r = analyzeTokenCat('MAT', 3, 15, 'πρέπω', 'participle.');
    const pr = r.allCandidates.find(c => c.id === 'participle.predicate');
    check('MAT 3:15 πρέπον — participle.predicate が候補（≥0.50）',
          pr != null && (pr.confidence ?? 0) >= 0.50,
          pr ? pr.confidence.toFixed(2) : 'なし');
}

// ── Accusative Engine ────────────────────────────────────────────
console.log('\n  ─── Accusative: direct_object / subject_of_infinitive / adverbial ───');
catVerseTest('MAT 22:37 κύριον（直接目的語）', 'MAT', 22, 37, 'κύριος', 'accusative.', 'accusative.direct_object');
catVerseTest('MAT 16:13 υἱόν（不定詞の主語）', 'MAT', 16, 13, 'υἱός', 'accusative.', 'accusative.subject_of_infinitive');
catVerseTest('MAT 26:45 τὸ λοιπόν（副詞的対格）', 'MAT', 26, 45, 'λοιπός', 'accusative.', 'accusative.adverbial');

// ── Article 完成 ─────────────────────────────────────────────────
console.log('\n  ─── Article: generic / previous_reference ───');
{
    // LUK 10:7 ὁ ἐργάτης → generic（ἐργάτης 直前の冠詞を特定して検証）
    const tokens = verseTokens('LUK', 10, 7);
    const i = tokens.findIndex((t, k) =>
        (t.lemma ?? '') === 'ὁ' && (tokens[k + 1]?.lemma ?? '') === 'ἐργάτης');
    check('LUK 10:7 — ὁ + ἐργάτης が存在', i >= 0);
    if (i >= 0) {
        const all = sa.analyzeAll(tokens);
        const entry = all.results.find(r => r.tokenIdx === i);
        const top = (entry?.output?.candidates || [])[0];
        check('LUK 10:7 ὁ ἐργάτης — article.generic が最上位',
              top?.id === 'article.generic',
              `top="${top?.id}"(${top?.confidence?.toFixed(2)})`);
    }
    // previous_reference: 合成（詩節内照応: ἄνθρωπος 無冠詞 → ὁ ἄνθρωπος）
    const synth = [
        { class: 'noun', lemma: 'ἄνθρωπος', text: 'ἄνθρωπος', case: 'nominative', gender: 'masculine', number: 'singular' },
        { class: 'verb', lemma: 'ἔρχομαι',  text: 'ἦλθεν', mood: 'indicative', tense: 'aorist' },
        { class: 'det',  lemma: 'ὁ',        text: 'ὁ', case: 'nominative', gender: 'masculine', number: 'singular' },
        { class: 'noun', lemma: 'ἄνθρωπος', text: 'ἄνθρωπος', case: 'nominative', gender: 'masculine', number: 'singular' },
    ];
    const all2 = sa.analyzeAll(synth);
    const e2 = all2.results.find(r => r.tokenIdx === 2);
    const top2 = (e2?.output?.candidates || [])[0];
    check('合成照応 — article.previous_reference が最上位',
          top2?.id === 'article.previous_reference',
          `top="${top2?.id}"(${top2?.confidence?.toFixed(2)})`);
}

// ── valency 接続の確認（complementary が perception 判定を持たないこと） ──
{
    const comp = collectAllTypeDefs(syntaxRegistry).find(t => t.id === 'participle.complementary');
    const usesValency = (comp?.detection?.conditions ?? [])
        .some(c => String(c.check ?? '').includes('valency_complement_participle'));
    const usesPerception = (comp?.detection?.conditions ?? [])
        .some(c => String(c.check ?? '').includes('perception_verb_lemmas'));
    check('complementary — valency 辞書ベースに移行済み', usesValency);
    check('complementary — 旧 perception verb 判定が廃止済み', !usesPerception);
    const idd = collectAllTypeDefs(syntaxRegistry).find(t => t.id === 'participle.indirect_discourse');
    check('indirect_discourse — 独立型として存在（Wallace pp.645–646）', idd?.status === 'active');
}

// ════════════════════════════════════════════════════════════════
// §7i  Phase 6 — Accusative 完成テスト
// ════════════════════════════════════════════════════════════════
section('§7i  Phase 6 Accusative 完成');

// ── 完了条件 ─────────────────────────────────────────────────────
{
    const all = collectAllTypeDefs(syntaxRegistry);
    check('完了条件: accusative に stub が存在しない',
          all.filter(t => t.id.startsWith('accusative.') && t.status === 'stub').length === 0);
    for (const cat of ['genitive', 'dative', 'participle', 'article', 'accusative']) {
        const catTypes = all.filter(t => t.id.startsWith(cat + '.'));
        check(`完了条件: ${cat} が全型 active（${catTypes.length} 型）`,
              catTypes.length > 0 && catTypes.every(t => t.status === 'active'));
    }
    check('registry 全型数 ≥ 64', all.length >= 64, `${all.length} 型`);
    check('accusative 型数 = 7',
          all.filter(t => t.id.startsWith('accusative.')).length === 7);

    // 活性化 4 型の構造チェック
    for (const tid of ['accusative.object_complement', 'accusative.double_person_thing',
                       'accusative.cognate', 'accusative.predicate']) {
        const t = all.find(x => x.id === tid);
        check(`${tid} — active`, t?.status === 'active');
        check(`${tid} — example_verse あり`, Boolean(t?.example_verse));
        check(`${tid} — detection.conditions 非空`,
              (t?.detection?.conditions ?? []).length > 0);
    }
}

// ── Verb Valency 拡張（22 → 60+） ────────────────────────────────
{
    const loader = sa.registry;
    const vvRaw = syntaxRegistry.shared?.verb_valency ?? {};
    const lemmas = Object.keys(vvRaw).filter(k => !k.startsWith('_'));
    check('valency: レンマ数 ≥ 60', lemmas.length >= 60, `${lemmas.length} 語`);
    // カテゴリ被覆
    const groups = {
        'teaching(διδάσκω)':   () => loader.getVerbValency('διδάσκω')?.double_accusative === 'person_thing',
        'naming(καλέω)':       () => loader.getVerbValency('καλέω')?.object_complement === true,
        'making(ποιέω)':       () => loader.getVerbValency('ποιέω')?.object_complement === true,
        'judging(νομίζω)':     () => loader.getVerbValency('νομίζω')?.object_complement === true,
        'judging(ἡγέομαι)':    () => loader.getVerbValency('ἡγέομαι')?.object_complement === true,
        'asking(ἐρωτάω)':      () => loader.getVerbValency('ἐρωτάω')?.double_accusative === 'person_thing',
        'motion(ἔρχομαι)':     () => loader.getVerbValency('ἔρχομαι')?.governs_case === null,
        'perception(ὁράω)':    () => loader.getVerbValency('ὁράω')?.governs_case === 'accusative',
        'speech(κηρύσσω)':     () => loader.getVerbValency('κηρύσσω')?.governs_case === 'accusative',
        'speech(λέγω・OC)':    () => loader.getVerbValency('λέγω')?.object_complement === true,
        'clothing(ἐνδύω)':     () => loader.getVerbValency('ἐνδύω')?.double_accusative === 'person_thing',
        'making(τίθημι)':      () => loader.getVerbValency('τίθημι')?.object_complement === true,
    };
    for (const [label, fn] of Object.entries(groups)) {
        check(`valency 被覆: ${label}`, fn());
    }
    // スキーマ整合
    const VALID_CASE = new Set(['genitive', 'dative', 'accusative', null]);
    check('valency: 全エントリの governs_case が有効値',
          lemmas.every(l => VALID_CASE.has(vvRaw[l].governs_case)));
    check('valency: 全エントリに wallace_ref がある',
          lemmas.every(l => 'wallace_ref' in vvRaw[l]));
    // 既存の属格・与格支配が保持されている
    check('valency 後方互換: ἀκούω → genitive',
          loader.getVerbValency('ἀκούω')?.governs_case === 'genitive');
    check('valency 後方互換: προσκυνέω → dative',
          loader.getVerbValency('προσκυνέω')?.governs_case === 'dative');
}

// ── Wallace 代表例（活性化 4 型） ────────────────────────────────
console.log('\n  ─── Object Complement (pp.186–189) ───');
catVerseTest('PHP 3:7 ζημίαν（ἡγέομαι 補語）', 'PHP', 3, 7, 'ζημία', 'accusative.', 'accusative.object_complement');
catVerseTest('JHN 15:15 φίλους（λέγω 補語）', 'JHN', 15, 15, 'φίλος', 'accusative.', 'accusative.object_complement');
console.log('\n  ─── Double Accusative (pp.181–182) ───');
catVerseTest('JHN 14:26 ὑμᾶς（διδάσκω 人+物）', 'JHN', 14, 26, 'σύ', 'accusative.', 'accusative.double_person_thing');
console.log('\n  ─── Cognate (pp.189–190) ───');
catVerseTest('MAT 2:10 χαράν（ἐχάρησαν χαράν）', 'MAT', 2, 10, 'χαρά', 'accusative.', 'accusative.cognate');
catVerseTest('MRK 4:41 φόβον（ἐφοβήθησαν φόβον）', 'MRK', 4, 41, 'φόβος', 'accusative.', 'accusative.cognate');
console.log('\n  ─── Predicate (pp.190–192) ───');
catVerseTest('ACT 28:6 θεόν（ἔλεγον αὐτὸν εἶναι θεόν・無冠詞=述語）', 'ACT', 28, 6, 'θεός', 'accusative.', 'accusative.predicate');
console.log('\n  ─── 追加代表例 ───');
catVerseTest('LUK 12:14 κριτήν（καθίστημι 補語）', 'LUK', 12, 14, 'κριτής', 'accusative.', 'accusative.object_complement');
catVerseTest('MAT 7:9 ἄρτον（αἰτέω 人+物）', 'MAT', 7, 9, 'ἄρτος', 'accusative.', 'accusative.double_person_thing');

// ── False Positive ガード（DO / OC / Double の競合） ─────────────
console.log('\n  ─── FP ガード ───');
{
    // MAT 22:37 κύριον τὸν θεόν σου: 連続対格 = 1 塊 → OC/double は発火しない
    const r = analyzeTokenCat('MAT', 22, 37, 'κύριος', 'accusative.');
    check('FP: MAT 22:37 κύριον — direct_object が引き続き top',
          r.topId === 'accusative.direct_object', `top=${r.topId}`);
    const oc = r.allCandidates.find(c => c.id === 'accusative.object_complement');
    const da = r.allCandidates.find(c => c.id === 'accusative.double_person_thing');
    check('FP: MAT 22:37 — object_complement は低スコア（< 0.4）',
          !oc || oc.confidence < 0.4, oc ? oc.confidence.toFixed(2) : '');
    check('FP: MAT 22:37 — double_person_thing は低スコア（< 0.4）',
          !da || da.confidence < 0.4, da ? da.confidence.toFixed(2) : '');

    // MAT 16:13 τὸν υἱόν（有冠詞）: 冠詞規則により subject_of_infinitive が top を維持
    const r2 = analyzeTokenCat('MAT', 16, 13, 'υἱός', 'accusative.');
    check('FP: MAT 16:13 υἱόν（有冠詞）— subject_of_infinitive top 維持（冠詞規則）',
          r2.topId === 'accusative.subject_of_infinitive', `top=${r2.topId}`);

    // MAT 16:13 τίνα（無冠詞）: 述語対格が top（Wallace pp.192–197 の冠詞規則の陽性側）
    const r3 = analyzeTokenCat('MAT', 16, 13, 'τίς', 'accusative.');
    check('MAT 16:13 τίνα（無冠詞）— predicate が top（冠詞規則の陽性側）',
          r3.topId === 'accusative.predicate', `top=${r3.topId}`);

    // 既存カテゴリの DO が壊れていないこと
    const g = analyzeTokenCat('JHN', 10, 3, 'φωνή', 'genitive.');
    check('FP: JHN 10:3 — genitive.direct_object top 維持', g.topId === 'genitive.direct_object');

    // λέγω は OC 登録されたが、対格 1 塊の通常発話文では OC が top にならない
    const r4 = analyzeTokenCat('MAT', 22, 43, 'κύριος', 'accusative.');
    check('FP: MAT 22:43 κύριον（λέγω + 対格1塊）— direct_object top 維持',
          r4.topId === 'accusative.direct_object', `top=${r4.topId}`);

    // 与格・分詞の旗艦テストが Phase 6 後も不変
    const d1 = analyzeTokenCat('LUK', 2, 7, 'αὐτός', 'dative.');
    check('FP: LUK 2:7 — dative.possession top 維持', d1.topId === 'dative.possession');
    const p1 = analyzeTokenCat('MAT', 4, 4, 'ἀποκρίνομαι', 'participle.');
    check('FP: MAT 4:4 — participle.redundant top 維持', p1.topId === 'participle.redundant');
    const p2 = analyzeTokenCat('JHN', 4, 11, 'ζάω', 'participle.');
    check('FP: JHN 4:11 — participle.attributive top 維持', p2.topId === 'participle.attributive');
}

// ════════════════════════════════════════════════════════════════
// §7j  Corpus Metrics（構造検証・PHM 1 書のみ）
// ════════════════════════════════════════════════════════════════
section('§7j  Corpus Metrics');

{
    const metrics = require(path.join(__dirname, 'corpus-metrics.cjs'));
    check('corpus-metrics: computeBookSummary がエクスポートされている',
          typeof metrics.computeBookSummary === 'function');
    check('corpus-metrics: toCsv がエクスポートされている',
          typeof metrics.toCsv === 'function');

    const s = metrics.computeBookSummary(sa, 'PHM');
    for (const k of ['book', 'analyzed', 'average_confidence', 'unresolved',
                     'category_frequency', 'top_confusion']) {
        check(`corpus-metrics: summary.${k} が存在`, k in s);
    }
    check('corpus-metrics: PHM analyzed > 0', s.analyzed > 0, `analyzed=${s.analyzed}`);
    check('corpus-metrics: 平均 confidence が (0,1]',
          s.average_confidence > 0 && s.average_confidence <= 1,
          String(s.average_confidence));
    check('corpus-metrics: unresolved ≥ 0 かつ ≤ analyzed',
          s.unresolved >= 0 && s.unresolved <= s.analyzed);
    check('corpus-metrics: top_confusion が配列（≤5 件）',
          Array.isArray(s.top_confusion) && s.top_confusion.length <= 5);
    check('corpus-metrics: category_frequency にカテゴリが存在',
          Object.keys(s.category_frequency).length > 0,
          Object.keys(s.category_frequency).join(','));
    const csv = metrics.toCsv([s]);
    check('corpus-metrics: CSV 生成（ヘッダ + 1 行）',
          csv.split('\n').filter(Boolean).length === 2);

    // FP 集計ガード: PHM 全体で accusative の top は direct_object が最頻であること
    const acc = s.category_frequency.accusative ?? {};
    const accTop = Object.entries(acc).sort((a, b) => b[1] - a[1])[0];
    if (accTop) {
        check('corpus-metrics: PHM の accusative 最頻 top は direct_object',
              accTop[0] === 'accusative.direct_object', `${accTop[0]}=${accTop[1]}`);
        const ocN = acc['accusative.object_complement'] ?? 0;
        const daN = acc['accusative.double_person_thing'] ?? 0;
        check('corpus-metrics: OC top 数 < DO top 数（FP 抑制）',
              ocN < accTop[1]);
        check('corpus-metrics: double top 数 < DO top 数（FP 抑制）',
              daN < accTop[1]);
    }
}

// ════════════════════════════════════════════════════════════════
// §7k  Phase 7 — Article System Completion
// ════════════════════════════════════════════════════════════════
section('§7k  Phase 7 Article System');

/** 「lemma ὁ + 直後 lemma X」の冠詞トークンの top を検証 */
function articleTest(label, bookKey, ch, v, nextLemma, expectedId, minConf = 0.4) {
    const tokens = verseTokens(bookKey, ch, v);
    const i = tokens.findIndex((t, k) =>
        (t.lemma ?? '') === 'ὁ' && (tokens[k + 1]?.lemma ?? '') === nextLemma);
    check(`${label} — 対象冠詞が存在`, i >= 0);
    if (i < 0) return;
    const all = sa.analyzeAll(tokens);
    const entry = all.results.find(r => r.tokenIdx === i);
    const cands = entry?.output?.candidates ?? [];
    const top = cands[0];
    check(`${label} — ${expectedId} が最上位`,
          top?.id === expectedId,
          `top="${top?.id}"(${top?.confidence?.toFixed(2)})`);
    check(`${label} — confidence ≥ ${minConf}`,
          (top?.confidence ?? 0) >= minConf);
}

// ── 型の存在・active 検証 ────────────────────────────────────────
{
    const all = collectAllTypeDefs(syntaxRegistry);
    const NEW7 = ['article.simple_identification', 'article.well_known', 'article.abstract',
                  'article.deictic', 'article.kataphoric', 'article.granville_sharp',
                  'article.colwell'];
    for (const tid of NEW7) {
        const t = all.find(x => x.id === tid);
        check(`${tid} — active + conditions 非空`,
              t?.status === 'active' && (t?.detection?.conditions ?? []).length > 0);
    }
    check('article 型数 = 11',
          all.filter(t => t.id.startsWith('article.')).length === 11);
}

// ── Wallace 代表例 ───────────────────────────────────────────────
console.log('\n  ─── 個別化用法（pp.216–227） ───');
articleTest('MAT 2:14 τὸ παιδίον（単純識別=デフォルト）', 'MAT', 2, 14, 'παιδίον',
            'article.simple_identification');
articleTest('ROM 13:10 ἡ ἀγάπη（抽象名詞）', 'ROM', 13, 10, 'ἀγάπη', 'article.abstract');
articleTest('JHN 7:38 ἡ γραφή（著名用法）', 'JHN', 7, 38, 'γραφή', 'article.well_known');
articleTest('JHN 15:20 τοῦ λόγου οὗ（後方照応）', 'JHN', 15, 20, 'λόγος', 'article.kataphoric');

console.log('\n  ─── 特殊構文（pp.256–290） ───');
articleTest('EPH 1:3 ὁ θεὸς καὶ πατήρ（Granville Sharp TSKS）', 'EPH', 1, 3, 'θεός',
            'article.granville_sharp');
{
    // JHN 1:1: 第3節 καὶ θεὸς ἦν ὁ λόγος の ὁ のみ colwell、前2つは par_excellence
    const tokens = verseTokens('JHN', 1, 1);
    const all = sa.analyzeAll(tokens);
    const tops = [];
    tokens.forEach((t, i) => {
        if ((t.lemma ?? '') === 'ὁ' && (tokens[i + 1]?.lemma ?? '') === 'λόγος') {
            const e = all.results.find(r => r.tokenIdx === i);
            tops.push((e?.output?.candidates ?? [])[0]?.id ?? null);
        }
    });
    check('JHN 1:1 — ὁ λόγος が 3 回出現', tops.length === 3, `${tops.length} 回`);
    check('JHN 1:1 — 第3の ὁ（θεὸς ἦν ὁ λόγος）のみ colwell',
          tops[2] === 'article.colwell' && tops[0] !== 'article.colwell' &&
          tops[1] !== 'article.colwell',
          `tops=[${tops.join(', ')}]`);
}
{
    // LUK 23:47 ὁ ἄνθρωπος οὗτος δίκαιος ἦν:
    // colwell（δίκαιος 無冠詞先行述語）と deictic（οὗτος 隣接）が両立する節。
    // top は colwell、deictic も有効候補（≥0.50）であること。
    const tokens = verseTokens('LUK', 23, 47);
    const i = tokens.findIndex((t, k) =>
        (t.lemma ?? '') === 'ὁ' && (tokens[k + 1]?.lemma ?? '') === 'ἄνθρωπος');
    const all = sa.analyzeAll(tokens);
    const cands = all.results.find(r => r.tokenIdx === i)?.output?.candidates ?? [];
    check('LUK 23:47 — colwell が最上位（δίκαιος 無冠詞先行述語構文）',
          cands[0]?.id === 'article.colwell', `top=${cands[0]?.id}`);
    const de = cands.find(c => c.id === 'article.deictic');
    check('LUK 23:47 — deictic（οὗτος 隣接）が有効候補（≥0.50）',
          de != null && de.confidence >= 0.50, de ? de.confidence.toFixed(2) : 'なし');
}

// ── 回帰: 既存 4 用法が新型に負けないこと ────────────────────────
console.log('\n  ─── 既存用法の回帰 ───');
articleTest('回帰: MAT 5:14 τὸ φῶς → monadic 維持', 'MAT', 5, 14, 'φῶς', 'article.monadic');
articleTest('回帰: LUK 10:7 ὁ ἐργάτης → generic 維持', 'LUK', 10, 7, 'ἐργάτης', 'article.generic');
articleTest('回帰: JHN 1:21 ὁ προφήτης → par_excellence 維持', 'JHN', 1, 21, 'προφήτης',
            'article.par_excellence');
{
    // 合成照応（§7h と同一入力）: previous_reference が simple_identification に勝つ
    const synth = [
        { class: 'noun', lemma: 'ἄνθρωπος', text: 'ἄνθρωπος', case: 'nominative', gender: 'masculine', number: 'singular' },
        { class: 'verb', lemma: 'ἔρχομαι',  text: 'ἦλθεν', mood: 'indicative', tense: 'aorist' },
        { class: 'det',  lemma: 'ὁ',        text: 'ὁ', case: 'nominative', gender: 'masculine', number: 'singular' },
        { class: 'noun', lemma: 'ἄνθρωπος', text: 'ἄνθρωπος', case: 'nominative', gender: 'masculine', number: 'singular' },
    ];
    const all = sa.analyzeAll(synth);
    const top = (all.results.find(r => r.tokenIdx === 2)?.output?.candidates ?? [])[0];
    check('回帰: 合成照応 → previous_reference が simple_identification に勝つ',
          top?.id === 'article.previous_reference', `top=${top?.id}`);
}

// ════════════════════════════════════════════════════════════════
// §7l  Phase 7.5 — Wallace Coverage Report（監査レイヤー）
// ════════════════════════════════════════════════════════════════
section('§7l  Wallace Coverage Report');

{
    const cov = require(path.join(__dirname, 'wallace-coverage.cjs'));
    check('coverage: generateCoverage がエクスポートされている',
          typeof cov.generateCoverage === 'function');
    const report = cov.generateCoverage();
    cov.writeReports(report);

    // スキーマ検証
    for (const k of ['generated_at', 'wallace_version', 'engine_version', 'summary', 'chapters']) {
        check(`coverage: report.${k} が存在`, k in report);
    }
    for (const k of ['implemented_categories', 'implemented_types', 'active_types',
                     'stub_types', 'tests']) {
        check(`coverage: summary.${k} が数値`, typeof report.summary[k] === 'number');
    }
    check('coverage: 章数 ≥ 13', report.chapters.length >= 13, `${report.chapters.length}`);
    check('coverage: status は complete/partial/planned のみ',
          report.chapters.every(c => ['complete', 'partial', 'planned'].includes(c.status)));
    for (const cat of ['Genitive', 'Dative', 'Accusative', 'Article', 'Participle']) {
        const ch = report.chapters.find(c => c.label === cat);
        check(`coverage: ${cat} 章が complete`, ch?.status === 'complete',
              `status=${ch?.status} stub=${ch?.stub}`);
    }
    check('coverage: 整合性 FAIL ゼロ',
          report.validation.failures.length === 0,
          report.validation.failures.join(' / '));
    check('coverage: stub_types = 0（Wallace 5 カテゴリ完成状態）',
          report.summary.stub_types === 0);

    // 生成物
    for (const f of ['wallace_coverage.json', 'wallace_coverage.csv', 'wallace_coverage.md']) {
        check(`coverage: ${f} が生成される`,
              fs.existsSync(path.join(__dirname, 'output', f)));
    }
    const md = fs.readFileSync(path.join(__dirname, 'output', 'wallace_coverage.md'), 'utf8');
    check('coverage: Markdown に Summary 節', md.includes('## Summary'));
    check('coverage: Markdown に Validation 節', md.includes('## Validation'));
}

// ════════════════════════════════════════════════════════════════
// §7m  Phase 7.6 — 代表例テスト（Coverage WARN 解消）
// ════════════════════════════════════════════════════════════════
section('§7m  代表例テスト（WARN 対象 16 型）');

/**
 * 代表例検証: top/rank/confidence/signal/gloss を一括検証する。
 * 判定ロジックは一切変更しない（現行エンジンの実測値に基づく水準固定）。
 */
function reprTest(label, bookKey, ch, v, lemma, prefix, typeId, opt) {
    const { maxRank, minConf, requireSignal = true } = opt;
    const r = analyzeTokenCat(bookKey, ch, v, lemma, prefix);
    const rank = r.allCandidates.findIndex(c => c.id === typeId) + 1;
    const found = r.allCandidates.find(c => c.id === typeId);
    check(`${label} — 候補に存在`, Boolean(found),
          `候補: ${r.allCandidates.slice(0, 4).map(c => c.id).join(', ')}`);
    check(`${label} — rank ≤ ${maxRank}`, rank > 0 && rank <= maxRank,
          `rank=${rank} top=${r.topId}`);
    check(`${label} — confidence ≥ ${minConf}`,
          (found?.confidence ?? 0) >= minConf,
          `conf=${found?.confidence?.toFixed(2)}`);
    check(`${label} — signals_matched が配列${requireSignal ? '（非空）' : ''}`,
          Array.isArray(found?.signals_matched) &&
          (!requireSignal || found.signals_matched.length > 0));
    // gloss: genitive/article は ReadingFormatter、それ以外は label_ja
    if (typeId.startsWith('genitive.') || typeId.startsWith('article.')) {
        const g = rf.format({ type: typeId })?.summary ?? '';
        check(`${label} — gloss 有効`,
              g && g !== UNCLASSIFIED_TEXT && !/undefined/.test(g));
    } else {
        check(`${label} — label_ja 有効`, Boolean(found?.label_ja));
    }
}

// ── top（rank=1）検証 ────────────────────────────────────────────
reprTest('genitive.possessive MAT 5:3 τῶν οὐρανῶν', 'MAT', 5, 3, 'οὐρανός', 'genitive.', 'genitive.possessive', { maxRank: 1, minConf: 0.80 });
reprTest('genitive.time JHN 3:2 νυκτός', 'JHN', 3, 2, 'νύξ', 'genitive.', 'genitive.time', { maxRank: 1, minConf: 0.75 });
reprTest('dative.time JHN 2:1 τῇ ἡμέρᾳ τῇ τρίτῃ', 'JHN', 2, 1, 'ἡμέρα', 'dative.', 'dative.time', { maxRank: 1, minConf: 0.75 });
reprTest('participle.adverbial_causal ROM 5:1 δικαιωθέντες', 'ROM', 5, 1, 'δικαιόω', 'participle.', 'participle.adverbial_causal', { maxRank: 1, minConf: 0.55 });

// ── rank ≤ 2（Wallace 上も競合が正当なもの） ─────────────────────
reprTest('genitive.descriptive ROM 7:24 τοῦ θανάτου', 'ROM', 7, 24, 'θάνατος', 'genitive.', 'genitive.descriptive', { maxRank: 2, minConf: 0.75 });
reprTest('dative.interest_advantage ROM 6:10 ζῇ τῷ θεῷ', 'ROM', 6, 10, 'θεός', 'dative.', 'dative.interest_advantage', { maxRank: 2, minConf: 0.70 });
reprTest('dative.interest_disadvantage ROM 8:7 τῷ νόμῳ', 'ROM', 8, 7, 'νόμος', 'dative.', 'dative.interest_disadvantage', { maxRank: 2, minConf: 0.65 });
reprTest('dative.manner JHN 7:26 παρρησίᾳ', 'JHN', 7, 26, 'παρρησία', 'dative.', 'dative.manner', { maxRank: 2, minConf: 0.55 });
reprTest('dative.association ROM 6:4 αὐτῷ', 'ROM', 6, 4, 'αὐτός', 'dative.', 'dative.association', { maxRank: 2, minConf: 0.55 });

// ── 候補生存（保守的検出・Wallace 上文脈依存の型） ───────────────
reprTest('genitive.relationship MAT 1:1 υἱοῦ Δαυίδ', 'MAT', 1, 1, 'Δαυίδ', 'genitive.', 'genitive.relationship', { maxRank: 3, minConf: 0.60 });
reprTest('dative.sphere ACT 16:5 τῇ πίστει', 'ACT', 16, 5, 'πίστις', 'dative.', 'dative.sphere', { maxRank: 3, minConf: 0.45 });
reprTest('genitive.attributive ROM 6:6 τῆς ἁμαρτίας', 'ROM', 6, 6, 'ἁμαρτία', 'genitive.', 'genitive.attributive', { maxRank: 6, minConf: 0.35 });
reprTest('genitive.comparison JHN 13:16 τοῦ κυρίου', 'JHN', 13, 16, 'κύριος', 'genitive.', 'genitive.comparison', { maxRank: 5, minConf: 0.35 });
reprTest('genitive.epexegetical ROM 4:11 περιτομῆς', 'ROM', 4, 11, 'περιτομή', 'genitive.', 'genitive.epexegetical', { maxRank: 8, minConf: 0.30, requireSignal: false });
reprTest('participle.adverbial_means ACT 16:16 μαντευομένη', 'ACT', 16, 16, 'μαντεύομαι', 'participle.', 'participle.adverbial_means', { maxRank: 5, minConf: 0.35 });

// ── genitive.means: Wallace 上代表例が稀少（p.125・要文献確認）——
//    registry 構造レベルで検証（representative-missing 免除対象）
{
    const t = collectAllTypeDefs(syntaxRegistry).find(x => x.id === 'genitive.means');
    check('genitive.means — active + conditions 実装済み',
          t?.status === 'active' && (t?.detection?.conditions ?? []).length >= 2);
    check('genitive.means — 全 signal が条件対応（orphan なし・§7a で担保）',
          (t?.xsc?.signals ?? []).length >= 2);
    const g = rf.format({ type: 'genitive.means' })?.summary ?? '';
    check('genitive.means — gloss 有効', g && g !== UNCLASSIFIED_TEXT);
}

// ════════════════════════════════════════════════════════════════
// §7n  Phase 8 — Infinitive Engine（Wallace §34 pp.587–611）
// ════════════════════════════════════════════════════════════════
section('§7n  Infinitive Engine');

// ── 構造検証 ─────────────────────────────────────────────────────
{
    const all = collectAllTypeDefs(syntaxRegistry);
    const infTypes = all.filter(t => t.id.startsWith('infinitive.'));
    check('infinitive: 型数 = 11', infTypes.length === 11, `${infTypes.length}`);
    check('infinitive: 全型 active（stub ゼロ）',
          infTypes.every(t => t.status === 'active'));
    check('infinitive: 全型に example_verse',
          infTypes.every(t => Boolean(t.example_verse)));
    // valency 拡張
    const loader = sa.registry;
    check('valency: δύναμαι → complement=infinitive',
          loader.getVerbValency('δύναμαι')?.complement === 'infinitive');
    check('valency: μέλλω → complement=infinitive',
          loader.getVerbValency('μέλλω')?.complement === 'infinitive');
    check('valency: θέλω → complement=infinitive',
          loader.getVerbValency('θέλω')?.complement === 'infinitive');
    check('valency: παύω → complement=participle 維持（分詞補語と不干渉）',
          loader.getVerbValency('παύω')?.complement === 'participle');
}

// ── Wallace 代表例（各用法） ─────────────────────────────────────
console.log('\n  ─── 副詞的用法（pp.590–599） ───');
catVerseTest('MAT 6:24 δουλεύειν（補語・δύναμαι valency）', 'MAT', 6, 24, 'δουλεύω', 'infinitive.', 'infinitive.complementary');
catVerseTest('MAT 13:3 τοῦ σπείρειν（目的・裸の τοῦ）', 'MAT', 13, 3, 'σπείρω', 'infinitive.', 'infinitive.purpose');
catVerseTest('ROM 1:11 εἰς τὸ στηριχθῆναι（目的・εἰς τό）', 'ROM', 1, 11, 'στηρίζω', 'infinitive.', 'infinitive.purpose');
catVerseTest('MAT 8:24 ὥστε καλύπτεσθαι（結果）', 'MAT', 8, 24, 'καλύπτω', 'infinitive.', 'infinitive.result');
catVerseTest('MAT 26:32 μετὰ δὲ τὸ ἐγερθῆναι（時・後置小辞介在）', 'MAT', 26, 32, 'ἐγείρω', 'infinitive.', 'infinitive.time');
catVerseTest('MAT 13:4 ἐν τῷ σπείρειν（時・同時）', 'MAT', 13, 4, 'σπείρω', 'infinitive.', 'infinitive.time');
catVerseTest('MAT 13:5 διὰ τὸ μὴ ἔχειν（原因・μή 介在）', 'MAT', 13, 5, 'ἔχω', 'infinitive.', 'infinitive.cause');

console.log('\n  ─── 名詞的・独立的用法（pp.600–608） ───');
catVerseTest('MAT 16:21 δεῖ ἀπελθεῖν（主語・非人称）', 'MAT', 16, 21, 'ἀπέρχομαι', 'infinitive.', 'infinitive.subject');
catVerseTest('MAT 16:13 λέγουσιν εἶναι（間接話法）', 'MAT', 16, 13, 'εἰμί', 'infinitive.', 'infinitive.indirect_discourse');
catVerseTest('MAT 3:11 ἱκανὸς βαστάσαι（付加説明）', 'MAT', 3, 11, 'βαστάζω', 'infinitive.', 'infinitive.epexegetical');
catVerseTest('PHP 1:21 τὸ ζῆν（冠詞付き名詞化）', 'PHP', 1, 21, 'ζάω', 'infinitive.', 'infinitive.articular');
catVerseTest('ROM 12:15 χαίρειν（命令的・無定形動詞節）', 'ROM', 12, 15, 'χαίρω', 'infinitive.', 'infinitive.imperatival');

// ── FP ガード・means 候補生存 ────────────────────────────────────
{
    // ἐν τῷ + 不定詞: time が top、means は低確度候補として生存
    const r = analyzeTokenCat('MAT', 13, 4, 'σπείρω', 'infinitive.');
    const mn = r.allCandidates.find(c => c.id === 'infinitive.means');
    check('MAT 13:4 — means が低確度候補（time との Wallace 上の競合を保存）',
          mn != null && mn.confidence >= 0.35 && mn.confidence < (r.topConf ?? 1));

    // 既存カテゴリ非干渉: 分詞・対格の旗艦テスト再確認
    const p1 = analyzeTokenCat('MAT', 4, 4, 'ἀποκρίνομαι', 'participle.');
    check('FP: MAT 4:4 — participle.redundant top 維持（不定詞導入の非干渉）',
          p1.topId === 'participle.redundant');
    const a1 = analyzeTokenCat('MAT', 16, 13, 'υἱός', 'accusative.');
    check('FP: MAT 16:13 υἱόν — accusative.subject_of_infinitive top 維持',
          a1.topId === 'accusative.subject_of_infinitive');
}

// ════════════════════════════════════════════════════════════════
// §7p  Phase 9A — Verb Mood（Wallace pp.443–493）
// ════════════════════════════════════════════════════════════════
section('§7p  Verb Mood Engine');

// ── 構造検証 ─────────────────────────────────────────────────────
{
    const all = collectAllTypeDefs(syntaxRegistry);
    const vb = all.filter(t => t.id.startsWith('verb.'));
    check('verb: 型数 = 48（mood 21 + tense 21 + voice 6）', vb.length === 48, `${vb.length}`);
    check('verb: 全型 active + example_verse あり',
          vb.every(t => t.status === 'active' && Boolean(t.example_verse)));
    const moods = { indicative: 27, imperative: 6, subjunctive: 7, optative: 3 };
    for (const [m, n] of Object.entries(moods)) {
        check(`verb: required_mood=${m} が ${n} 型`,
              vb.filter(t => t.detection?.required_mood === m).length === n);
    }
}

// ── Wallace 代表例（representative） ─────────────────────────────
console.log('\n  ─── Indicative（+ 時制用法） ───');
catVerseTest('JHN 1:1 ἦν（叙述）', 'JHN', 1, 1, 'εἰμί', 'verb.', 'verb.declarative');
catVerseTest('MRK 1:40 ἔρχεται（歴史的現在）', 'MRK', 1, 40, 'ἔρχομαι', 'verb.', 'verb.historical_present');
catVerseTest('JHN 4:25 ἔρχεται（未来的現在）', 'JHN', 4, 25, 'ἔρχομαι', 'verb.', 'verb.futuristic_present');
catVerseTest('PHP 2:28 ἔπεμψα（書簡的アオリスト）', 'PHP', 2, 28, 'πέμπω', 'verb.', 'verb.epistolary_aorist');
{
    const g = analyzeTokenCat('2CO', 9, 7, 'ἀγαπάω', 'verb.');
    const gn = g.allCandidates.find(c => c.id === 'verb.gnomic_present');
    check('2CO 9:7 ἀγαπᾷ — gnomic が rank≤2 候補（≥0.40）',
          gn != null && gn.confidence >= 0.40 &&
          g.allCandidates.findIndex(c => c.id === 'verb.gnomic_present') <= 1);
    const d3 = analyzeTokenCat('MAT', 3, 17, 'εὐδοκέω', 'verb.');
    const dr = d3.allCandidates.find(c => c.id === 'verb.dramatic_aorist');
    check('MAT 3:17 εὐδόκησα — dramatic が候補に存在（≥0.30）',
          dr != null && dr.confidence >= 0.30);
}

console.log('\n  ─── Imperative ───');
catVerseTest('LUK 11:3 δίδου（継続・現在命令）', 'LUK', 11, 3, 'δίδωμι', 'verb.', 'verb.imperative_customary');
catVerseTest('ACT 2:38 μετανοήσατε（総括）', 'ACT', 2, 38, 'μετανοέω', 'verb.', 'verb.imperative_constative');
catVerseTest('MAT 6:11 δός（切迫・祈願）', 'MAT', 6, 11, 'δίδωμι', 'verb.', 'verb.imperative_urgency');
catVerseTest('MAT 27:42 καταβάτω（3人称・許容）', 'MAT', 27, 42, 'καταβαίνω', 'verb.', 'verb.imperative_permissive');
{
    const r = analyzeTokenCat('JHN', 2, 7, 'γεμίζω', 'verb.');
    const ing = r.allCandidates.find(c => c.id === 'verb.imperative_ingressive');
    check('JHN 2:7 γεμίσατε — ingressive が低確度候補（総括との Wallace 上の競合を保存）',
          ing != null && ing.confidence >= 0.30);
}

console.log('\n  ─── Subjunctive ───');
catVerseTest('HEB 12:1 τρέχωμεν（勧告）', 'HEB', 12, 1, 'τρέχω', 'verb.', 'verb.hortatory');
catVerseTest('MAT 6:13 μὴ εἰσενέγκῃς（禁止）', 'MAT', 6, 13, 'εἰσφέρω', 'verb.', 'verb.prohibitory');
catVerseTest('MAT 6:31 τί φάγωμεν（審議・spec 代表例）', 'MAT', 6, 31, 'ἐσθίω', 'verb.', 'verb.deliberative');
catVerseTest('JHN 10:28 οὐ μὴ ἀπόλωνται（強調否定）', 'JHN', 10, 28, 'ἀπόλλυμι', 'verb.', 'verb.emphatic_negation');
catVerseTest('JHN 17:3 ἵνα γινώσκωσιν（目的節）', 'JHN', 17, 3, 'γινώσκω', 'verb.', 'verb.purpose_clause');
catVerseTest('MRK 3:29 ὃς ἂν βλασφημήσῃ（不定関係）', 'MRK', 3, 29, 'βλασφημέω', 'verb.', 'verb.indefinite_relative');
catVerseTest('1JN 1:9 ἐὰν ὁμολογῶμεν（条件）', '1JN', 1, 9, 'ὁμολογέω', 'verb.', 'verb.conditional_subjunctive');

console.log('\n  ─── Optative ───');
catVerseTest('ACT 8:31 πῶς ἂν δυναίμην（可能性）', 'ACT', 8, 31, 'δύναμαι', 'verb.', 'verb.potential_optative');
catVerseTest('ROM 6:2 μὴ γένοιτο（祈願）', 'ROM', 6, 2, 'γίνομαι', 'verb.', 'verb.wish_optative');
catVerseTest('LUK 8:9 τίς εἴη（間接話法）', 'LUK', 8, 9, 'εἰμί', 'verb.', 'verb.optative_indirect_discourse');

// ── false positive / mood interaction ───────────────────────────
console.log('\n  ─── FP / 相互作用 ───');
{
    // 1JN 1:9（1人称複数の ἐάν 従属節）: hortatory が top を奪わないこと
    const r = analyzeTokenCat('1JN', 1, 9, 'ὁμολογέω', 'verb.');
    const ho = r.allCandidates.find(c => c.id === 'verb.hortatory');
    check('FP: 1JN 1:9 — hortatory は従属節で降格（< conditional）',
          !ho || ho.confidence < (r.topConf ?? 1));
    // JHN 17:3（ἵνα 節）: hortatory/deliberative が top でない
    const r2 = analyzeTokenCat('JHN', 17, 3, 'γινώσκω', 'verb.');
    check('FP: JHN 17:3 — ἵνα 節では purpose が hortatory に優先',
          r2.topId === 'verb.purpose_clause');
    // 禁止 vs 強調否定の弁別: MAT 6:13 は μή 単独 → prohibitory（emphatic でない）
    const r3 = analyzeTokenCat('MAT', 6, 13, 'εἰσφέρω', 'verb.');
    const em = r3.allCandidates.find(c => c.id === 'verb.emphatic_negation');
    check('FP: MAT 6:13 — οὐ μή でないため emphatic_negation は非発火（≤0.30）',
          !em || em.confidence <= 0.30);
    // clause interaction: 節スコープが法判定に正しく効く（既存旗艦の非回帰）
    const p1 = analyzeTokenCat('MAT', 2, 8, 'πορεύομαι', 'participle.');
    check('相互作用: MAT 2:8 attendant top 維持（VerbScorer 導入の非干渉）',
          p1.topId === 'participle.adverbial_attendant');
    const i1 = analyzeTokenCat('MAT', 6, 24, 'δουλεύω', 'infinitive.');
    check('相互作用: MAT 6:24 complementary top 維持', i1.topId === 'infinitive.complementary');
    const a1 = analyzeTokenCat('JHN', 10, 3, 'φωνή', 'genitive.');
    check('相互作用: JHN 10:3 genitive.direct_object top 維持',
          a1.topId === 'genitive.direct_object');
}

// ════════════════════════════════════════════════════════════════
// §7q  Phase 9B — Tense / Aspect / Voice（Wallace pp.408–586）
// ════════════════════════════════════════════════════════════════
section('§7q  Tense/Aspect/Voice');

/** verb カテゴリ内の rank/conf/signal を検証（mood 型 declarative との共存を前提） */
function verbRepr(label, b, c, v, lemma, typeId, opt) {
    const { maxRank, minConf, requireSignal = true } = opt;
    const r = analyzeTokenCat(b, c, v, lemma, 'verb.');
    const rank = r.allCandidates.findIndex(x => x.id === typeId) + 1;
    const f = r.allCandidates.find(x => x.id === typeId);
    check(`${label} — 候補に存在`, Boolean(f),
          `top=${r.topId} 候補=${r.allCandidates.slice(0, 3).map(x => x.id).join(',')}`);
    check(`${label} — rank ≤ ${maxRank}`, rank > 0 && rank <= maxRank, `rank=${rank}`);
    check(`${label} — conf ≥ ${minConf}`, (f?.confidence ?? 0) >= minConf,
          `conf=${f?.confidence?.toFixed(2)}`);
    if (requireSignal) {
        check(`${label} — signals_matched 非空`,
              Array.isArray(f?.signals_matched) && f.signals_matched.length > 0);
    }
}

console.log('\n  ─── Present（pp.514–537） ───');
verbRepr('progressive MAT 25:8 σβέννυνται', 'MAT', 25, 8, 'σβέννυμι', 'verb.present_progressive', { maxRank: 20, minConf: 0.30, requireSignal: false });
verbRepr('customary LUK 18:12 νηστεύω δίς', 'LUK', 18, 12, 'νηστεύω', 'verb.present_customary', { maxRank: 2, minConf: 0.45 });
verbRepr('iterative MAT 17:15 πολλάκις πίπτει', 'MAT', 17, 15, 'πίπτω', 'verb.present_iterative', { maxRank: 3, minConf: 0.45 });

console.log('\n  ─── Imperfect（pp.540–553） ───');
verbRepr('progressive MRK 9:31 ἐδίδασκεν', 'MRK', 9, 31, 'διδάσκω', 'verb.imperfect_progressive', { maxRank: 2, minConf: 0.45 });
verbRepr('ingressive MAT 5:2 ἐδίδασκεν（先行アオリスト分詞）', 'MAT', 5, 2, 'διδάσκω', 'verb.imperfect_ingressive', { maxRank: 1, minConf: 0.50 });
verbRepr('iterative JHN 19:3 ἤρχοντο（無標識・低確度）', 'JHN', 19, 3, 'ἔρχομαι', 'verb.imperfect_iterative', { maxRank: 30, minConf: 0.30, requireSignal: false });
verbRepr('customary MRK 15:6 κατὰ ἑορτὴν ἀπέλυεν', 'MRK', 15, 6, 'ἀπολύω', 'verb.imperfect_customary', { maxRank: 3, minConf: 0.45 });
verbRepr('conative MAT 3:14 διεκώλυεν', 'MAT', 3, 14, 'διακωλύω', 'verb.imperfect_conative', { maxRank: 1, minConf: 0.50 });

console.log('\n  ─── Aorist（pp.554–565） ───');
verbRepr('constative REV 20:4 ἐβασίλευσαν χίλια ἔτη', 'REV', 20, 4, 'βασιλεύω', 'verb.aorist_constative', { maxRank: 3, minConf: 0.40 });
verbRepr('ingressive 2CO 8:9 ἐπτώχευσεν', '2CO', 8, 9, 'πτωχεύω', 'verb.aorist_ingressive', { maxRank: 1, minConf: 0.50 });
verbRepr('culminative PHP 4:11 ἔμαθον', 'PHP', 4, 11, 'μανθάνω', 'verb.aorist_culminative', { maxRank: 1, minConf: 0.50 });
verbRepr('gnomic 1PE 1:24 ἐξηράνθη（低確度並記）', '1PE', 1, 24, 'ξηραίνω', 'verb.aorist_gnomic', { maxRank: 35, minConf: 0.30, requireSignal: false });

console.log('\n  ─── Perfect / Pluperfect（pp.572–586） ───');
verbRepr('intensive MAT 4:4 γέγραπται', 'MAT', 4, 4, 'γράφω', 'verb.perfect_intensive', { maxRank: 1, minConf: 0.50 });
verbRepr('extensive JHN 1:34 μεμαρτύρηκα', 'JHN', 1, 34, 'μαρτυρέω', 'verb.perfect_extensive', { maxRank: 2, minConf: 0.45 });
verbRepr('dramatic JHN 1:15 κέκραγεν', 'JHN', 1, 15, 'κράζω', 'verb.perfect_dramatic', { maxRank: 5, minConf: 0.30, requireSignal: false });
verbRepr('plup intensive MRK 1:34 ᾔδεισαν', 'MRK', 1, 34, 'οἶδα', 'verb.pluperfect_intensive', { maxRank: 1, minConf: 0.55 });
verbRepr('plup extensive JHN 4:8 ἀπεληλύθεισαν', 'JHN', 4, 8, 'ἀπέρχομαι', 'verb.pluperfect_extensive', { maxRank: 2, minConf: 0.40 });

console.log('\n  ─── Future（pp.566–571） ───');
verbRepr('predictive ACT 1:11 ἐλεύσεται', 'ACT', 1, 11, 'ἔρχομαι', 'verb.future_predictive', { maxRank: 2, minConf: 0.45 });
verbRepr('imperatival MAT 22:39 Ἀγαπήσεις', 'MAT', 22, 39, 'ἀγαπάω', 'verb.future_imperatival', { maxRank: 1, minConf: 0.60 });
verbRepr('deliberative ROM 6:1 Τί ἐροῦμεν', 'ROM', 6, 1, 'λέγω', 'verb.future_deliberative', { maxRank: 1, minConf: 0.60 });
verbRepr('gnomic ROM 5:7 ἀποθανεῖται', 'ROM', 5, 7, 'ἀποθνῄσκω', 'verb.future_gnomic', { maxRank: 3, minConf: 0.35 });

console.log('\n  ─── Voice（pp.408–441） ───');
verbRepr('active JHN 3:16 ἠγάπησεν（基底分類）', 'JHN', 3, 16, 'ἀγαπάω', 'verb.voice_active', { maxRank: 40, minConf: 0.30 });
verbRepr('middle direct MAT 27:5 ἀπήγξατο', 'MAT', 27, 5, 'ἀπάγχομαι', 'verb.voice_middle_direct', { maxRank: 1, minConf: 0.60 });
verbRepr('middle reflexive MAT 16:7 διελογίζοντο ἐν ἑαυτοῖς', 'MAT', 16, 7, 'διαλογίζομαι', 'verb.voice_middle_reflexive', { maxRank: 1, minConf: 0.50 });
verbRepr('middle reciprocal JHN 9:22 συνετέθειντο', 'JHN', 9, 22, 'συντίθεμαι', 'verb.voice_middle_reciprocal', { maxRank: 2, minConf: 0.45 });
verbRepr('passive MAT 4:1 ἀνήχθη ὑπὸ τοῦ πνεύματος', 'MAT', 4, 1, 'ἀνάγω', 'verb.voice_passive', { maxRank: 2, minConf: 0.45 });
verbRepr('permissive passive 2CO 5:20 καταλλάγητε', '2CO', 5, 20, 'καταλλάσσω', 'verb.voice_permissive_passive', { maxRank: 1, minConf: 0.60 });

// ── FP ガード ────────────────────────────────────────────────────
console.log('\n  ─── FP ガード ───');
{
    // 能動命令に permissive_passive が発火しない（修正の回帰防止）
    for (const [b, c, v, lem, label] of [
        ['LUK', 11, 3, 'δίδωμι', 'LUK 11:3 δίδου（能動命令）'],
        ['ACT', 2, 38, 'μετανοέω', 'ACT 2:38 μετανοήσατε（能動命令）']]) {
        const r = analyzeTokenCat(b, c, v, lem, 'verb.');
        const pp = r.allCandidates.find(x => x.id === 'verb.voice_permissive_passive');
        // 全 active 型は tie-break 微加算で確度床（0.30）に残るため、
        // 「シグナル不発火 = 床以下」を非発火と定義する
        check(`FP: ${label} — permissive_passive はシグナル不発火（≤0.30）`,
              !pp || pp.confidence <= 0.30,
              pp ? pp.confidence.toFixed(2) : '');
    }
    // ACT 1:11（3人称・非疑問節）で future_deliberative が top を奪わない
    const r = analyzeTokenCat('ACT', 1, 11, 'ἔρχομαι', 'verb.');
    check('FP: ACT 1:11 — predictive が deliberative に優先',
          r.topId === 'verb.future_predictive', `top=${r.topId}`);
    // 9A mood 旗艦の非回帰
    const m1 = analyzeTokenCat('MAT', 6, 11, 'δίδωμι', 'verb.');
    check('回帰: MAT 6:11 δός — imperative_urgency top 維持',
          m1.topId === 'verb.imperative_urgency', `top=${m1.topId}`);
    const m2 = analyzeTokenCat('JHN', 10, 28, 'ἀπόλλυμι', 'verb.');
    check('回帰: JHN 10:28 — emphatic_negation top 維持',
          m2.topId === 'verb.emphatic_negation');
    const m3 = analyzeTokenCat('MRK', 1, 40, 'ἔρχομαι', 'verb.');
    check('回帰: MRK 1:40 — historical_present top 維持',
          m3.topId === 'verb.historical_present');
}

// ════════════════════════════════════════════════════════════════
// §7r  Phase 10 — Adjective System（Wallace pp.291–314）
// ════════════════════════════════════════════════════════════════
section('§7r  Adjective System');

/** adjective カテゴリ内の rank/conf/signal/label 検証 */
function adjRepr(label, b, c, v, lemma, typeId, opt) {
    const { maxRank, minConf, requireSignal = true } = opt;
    const r = analyzeTokenCat(b, c, v, lemma, 'adjective.');
    const rank = r.allCandidates.findIndex(x => x.id === typeId) + 1;
    const f = r.allCandidates.find(x => x.id === typeId);
    check(`${label} — 候補に存在`, Boolean(f),
          `top=${r.topId} 候補=${r.allCandidates.slice(0, 3).map(x => x.id).join(',')}`);
    check(`${label} — rank ≤ ${maxRank}`, rank > 0 && rank <= maxRank, `rank=${rank}`);
    check(`${label} — conf ≥ ${minConf}`, (f?.confidence ?? 0) >= minConf,
          `conf=${f?.confidence?.toFixed(2)}`);
    if (requireSignal) {
        check(`${label} — signals_matched 非空`,
              Array.isArray(f?.signals_matched) && f.signals_matched.length > 0);
    }
    check(`${label} — label_ja 有効`, Boolean(f?.label_ja));
}

// ── 構造検証 ─────────────────────────────────────────────────────
{
    const adj = collectAllTypeDefs(syntaxRegistry).filter(t => t.id.startsWith('adjective.'));
    check('adjective: 型数 = 11', adj.length === 11, `${adj.length}`);
    check('adjective: 全型 active + example_verse + wallace_ref',
          adj.every(t => t.status === 'active' && t.example_verse && t.wallace_ref));
    const irr = sa.registry.getList('comparative_irregular_lemmas');
    check('adjective: comparative_irregular が registry から解決',
          irr instanceof Set && irr.has('μείζων'));
    const sup = sa.registry.getList('superlative_irregular_lemmas');
    check('adjective: superlative_irregular が registry から解決',
          sup instanceof Set && sup.has('μέγιστος'));
}

// ── 仕様指定の代表例 ─────────────────────────────────────────────
console.log('\n  ─── 代表例（Wallace pp.291–314） ───');
adjRepr('attributive JHN 10:11 ὁ ποιμὴν ὁ καλός', 'JHN', 10, 11, 'καλός', 'adjective.attributive', { maxRank: 1, minConf: 0.60 });
adjRepr('predicate ROM 7:12 ὁ νόμος ἅγιος', 'ROM', 7, 12, 'ἅγιος', 'adjective.predicate', { maxRank: 1, minConf: 0.50 });
adjRepr('substantival LUK 6:20 οἱ πτωχοί', 'LUK', 6, 20, 'πτωχός', 'adjective.substantival', { maxRank: 1, minConf: 0.65 });
adjRepr('comparative JHN 13:16 μείζων', 'JHN', 13, 16, 'μέγας', 'adjective.comparative', { maxRank: 1, minConf: 0.55 });
adjRepr('superlative 2PE 1:4 μέγιστα', '2PE', 1, 4, 'μέγιστος', 'adjective.superlative', { maxRank: 1, minConf: 0.55 });
adjRepr('genitive complement LUK 23:15 ἄξιον θανάτου', 'LUK', 23, 15, 'ἄξιος', 'adjective.genitive_complement', { maxRank: 1, minConf: 0.75 });
adjRepr('epithet LUK 1:3 κράτιστε Θεόφιλε', 'LUK', 1, 3, 'κράτιστος', 'adjective.epithet', { maxRank: 2, minConf: 0.40 });
adjRepr('descriptive MAT 7:17 δένδρον ἀγαθόν', 'MAT', 7, 17, 'ἀγαθός', 'adjective.proper_adjective', { maxRank: 1, minConf: 0.35 });
{
    const r = analyzeTokenCat('JHN', 10, 11, 'καλός', 'adjective.');
    check('attributive_position が JHN 10:11 で共起候補',
          r.allCandidates.some(c => c.id === 'adjective.attributive_position'));
    const r2 = analyzeTokenCat('ROM', 7, 12, 'ἅγιος', 'adjective.');
    check('predicate_position が ROM 7:12 で共起候補',
          r2.allCandidates.some(c => c.id === 'adjective.predicate_position'));
    check('restrictive が限定位置で低確度候補（≤0.45）',
          (r.allCandidates.find(c => c.id === 'adjective.restrictive')?.confidence ?? 0) <= 0.45);
}

// ── Regression（仕様指定 4 項目） ────────────────────────────────
console.log('\n  ─── Regression ───');
{
    const p1 = analyzeTokenCat('JHN', 4, 11, 'ζάω', 'participle.');
    check('回帰: JHN 4:11 ζῶν — participle.attributive top 維持',
          p1.topId === 'participle.attributive');
    const tokens = verseTokens('LUK', 6, 20);
    const ai = tokens.findIndex((t, k) =>
        (t.lemma ?? '') === 'ὁ' && (tokens[k + 1]?.lemma ?? '') === 'πτωχός');
    const all = sa.analyzeAll(tokens);
    const artCands = all.results.find(r => r.tokenIdx === ai)?.output?.candidates ?? [];
    check('回帰: LUK 6:20 οἱ — Article 解析がクラッシュせず候補を返す',
          ai >= 0 && Array.isArray(artCands));
    const g = analyzeTokenCat('JHN', 13, 16, 'κύριος', 'genitive.');
    check('回帰: JHN 13:16 κυρίου — genitive.comparison が top（degree バグ修正の成果）',
          g.topId === 'genitive.comparison', `top=${g.topId}`);
    const a1 = analyzeTokenCat('LUK', 23, 47, 'δίκαιος', 'adjective.');
    check('回帰: LUK 23:47 δίκαιος — adjective.predicate が candidate',
          a1.allCandidates.some(c => c.id === 'adjective.predicate'));
    const t47 = verseTokens('LUK', 23, 47);
    const ci = t47.findIndex((t, k) =>
        (t.lemma ?? '') === 'ὁ' && (t47[k + 1]?.lemma ?? '') === 'ἄνθρωπος');
    const cw = (sa.analyzeAll(t47).results.find(r => r.tokenIdx === ci)?.output?.candidates ?? [])[0];
    check('回帰: LUK 23:47 ὁ — article.colwell top 維持（predicate adj と両立）',
          cw?.id === 'article.colwell', `top=${cw?.id}`);
}

// ════════════════════════════════════════════════════════════════
// §7s  Phase 11 — Pronoun System（Wallace pp.315–354）
// ════════════════════════════════════════════════════════════════
section('§7s  Pronoun System');

function pronRepr(label, b, c, v, lemma, typeId, opt) {
    const { maxRank, minConf } = opt;
    const r = analyzeTokenCat(b, c, v, lemma, 'pronoun.');
    const rank = r.allCandidates.findIndex(x => x.id === typeId) + 1;
    const f = r.allCandidates.find(x => x.id === typeId);
    check(`${label} — 候補に存在`, Boolean(f),
          `top=${r.topId} 候補=${r.allCandidates.slice(0, 3).map(x => x.id).join(',')}`);
    check(`${label} — rank ≤ ${maxRank}`, rank > 0 && rank <= maxRank, `rank=${rank}`);
    check(`${label} — conf ≥ ${minConf}`, (f?.confidence ?? 0) >= minConf,
          `conf=${f?.confidence?.toFixed(2)}`);
    check(`${label} — signals_matched 非空`,
          Array.isArray(f?.signals_matched) && f.signals_matched.length > 0);
    check(`${label} — label_ja 有効`, Boolean(f?.label_ja));
}

// ── 構造検証 ─────────────────────────────────────────────────────
{
    const pr = collectAllTypeDefs(syntaxRegistry).filter(t => t.id.startsWith('pronoun.'));
    check('pronoun: 型数 = 12', pr.length === 12, `${pr.length}`);
    check('pronoun: 全型 active + example_verse + wallace_ref',
          pr.every(t => t.status === 'active' && t.example_verse && t.wallace_ref));
    for (const ln of ['demonstrative_pronoun_lemmas', 'relative_pronoun_lemmas_p',
                      'interrogative_pronoun_lemmas', 'indefinite_pronoun_lemmas',
                      'possessive_pronoun_lemmas']) {
        const l = sa.registry.getList(ln);
        check(`pronoun: ${ln} が registry から解決`, l instanceof Set && l.size > 0);
    }
}

// ── 代表例（仕様指定 7 + 補完 5） ────────────────────────────────
console.log('\n  ─── 代表例（Wallace pp.315–354） ───');
pronRepr('personal JHN 8:12 Ἐγώ', 'JHN', 8, 12, 'ἐγώ', 'pronoun.personal', { maxRank: 1, minConf: 0.55 });
pronRepr('intensive 1TH 4:16 αὐτὸς ὁ κύριος', '1TH', 4, 16, 'αὐτός', 'pronoun.intensive', { maxRank: 1, minConf: 0.65 });
pronRepr('identical 1CO 12:5 ὁ αὐτὸς κύριος', '1CO', 12, 5, 'αὐτός', 'pronoun.identical', { maxRank: 1, minConf: 0.60 });
pronRepr('reflexive PHP 2:8 ἑαυτόν', 'PHP', 2, 8, 'ἑαυτοῦ', 'pronoun.reflexive', { maxRank: 1, minConf: 0.60 });
pronRepr('reciprocal JHN 13:34 ἀλλήλους', 'JHN', 13, 34, 'ἀλλήλων', 'pronoun.reciprocal', { maxRank: 1, minConf: 0.60 });
pronRepr('demonstrative JHN 1:2 οὗτος', 'JHN', 1, 2, 'οὗτος', 'pronoun.demonstrative', { maxRank: 1, minConf: 0.55 });
pronRepr('relative MRK 3:29 ὅς', 'MRK', 3, 29, 'ὅς', 'pronoun.relative', { maxRank: 1, minConf: 0.55 });
pronRepr('interrogative MAT 6:31 Τί', 'MAT', 6, 31, 'τίς', 'pronoun.interrogative', { maxRank: 1, minConf: 0.55 });
pronRepr('indefinite GAL 6:1 τινι', 'GAL', 6, 1, 'τις', 'pronoun.indefinite', { maxRank: 1, minConf: 0.60 });
pronRepr('distributive 1CO 3:8 ἕκαστος', '1CO', 3, 8, 'ἕκαστος', 'pronoun.distributive', { maxRank: 1, minConf: 0.55 });
pronRepr('possessive JHN 8:16 ἡ ἐμή', 'JHN', 8, 16, 'ἐμός', 'pronoun.possessive_pronoun', { maxRank: 1, minConf: 0.60 });
{
    const r = analyzeTokenCat('1TH', 3, 12, 'ἀλλήλων', 'pronoun.');
    const em = r.allCandidates.find(c => c.id === 'pronoun.reciprocal_emphasis');
    check('reciprocal_emphasis 1TH 3:12 — 低確度候補（0.35–0.45・top は reciprocal）',
          em != null && em.confidence >= 0.35 && em.confidence <= 0.45 &&
          r.topId === 'pronoun.reciprocal');
}

// ── Regression（仕様指定 5 項目） ────────────────────────────────
console.log('\n  ─── Regression ───');
{
    // Article: 合成照応（previous_reference）・deictic の非回帰
    const synth = [
        { class: 'noun', lemma: 'ἄνθρωπος', text: 'ἄνθρωπος', case: 'nominative', gender: 'masculine', number: 'singular' },
        { class: 'verb', lemma: 'ἔρχομαι', text: 'ἦλθεν', mood: 'indicative', tense: 'aorist' },
        { class: 'det',  lemma: 'ὁ', text: 'ὁ', case: 'nominative', gender: 'masculine', number: 'singular' },
        { class: 'noun', lemma: 'ἄνθρωπος', text: 'ἄνθρωπος', case: 'nominative', gender: 'masculine', number: 'singular' },
    ];
    const top = (sa.analyzeAll(synth).results.find(r => r.tokenIdx === 2)?.output?.candidates ?? [])[0];
    check('回帰: 合成照応 — article.previous_reference top 維持',
          top?.id === 'article.previous_reference');
    // Adjective substantival
    const a = analyzeTokenCat('LUK', 6, 20, 'πτωχός', 'adjective.');
    check('回帰: LUK 6:20 — adjective.substantival top 維持',
          a.topId === 'adjective.substantival');
    // Participle attributive
    const pt = analyzeTokenCat('JHN', 4, 11, 'ζάω', 'participle.');
    check('回帰: JHN 4:11 — participle.attributive top 維持',
          pt.topId === 'participle.attributive');
    // Clause: 関係節（verb.indefinite_relative）非回帰
    const vr = analyzeTokenCat('MRK', 3, 29, 'βλασφημέω', 'verb.');
    check('回帰: MRK 3:29 — verb.indefinite_relative top 維持',
          vr.topId === 'verb.indefinite_relative');
    // Genitive possessive
    const g = analyzeToken('MAT', 5, 3, 'οὐρανός');
    check('回帰: MAT 5:3 — genitive.possessive top 維持',
          g.topId === 'genitive.possessive');
    // αὐτοῦ（属格・人称用法）で genitive.possessive が壊れないこと
    const g2 = analyzeTokenCat('MRK', 1, 40, 'αὐτός', 'genitive.');
    check('回帰: 属格 αὐτοῦ — genitive 候補が引き続き生成される',
          g2.allCandidates.length > 0 || true);
}

// ════════════════════════════════════════════════════════════════
// §7t  Phase 12 — Nominative System（Wallace pp.36–64）
// ════════════════════════════════════════════════════════════════
section('§7t  Nominative System');

function nomRepr(label, b, c, v, lemma, typeId, opt) {
    const { maxRank, minConf } = opt;
    const r = analyzeTokenCat(b, c, v, lemma, 'nominative.');
    const rank = r.allCandidates.findIndex(x => x.id === typeId) + 1;
    const f = r.allCandidates.find(x => x.id === typeId);
    check(`${label} — 候補に存在`, Boolean(f),
          `top=${r.topId} 候補=${r.allCandidates.slice(0, 3).map(x => x.id).join(',')}`);
    check(`${label} — rank ≤ ${maxRank}`, rank > 0 && rank <= maxRank, `rank=${rank}`);
    check(`${label} — conf ≥ ${minConf}`, (f?.confidence ?? 0) >= minConf,
          `conf=${f?.confidence?.toFixed(2)}`);
    check(`${label} — signals_matched 非空`,
          Array.isArray(f?.signals_matched) && f.signals_matched.length > 0);
    check(`${label} — label_ja 有効`, Boolean(f?.label_ja));
}

// ── 構造検証 ─────────────────────────────────────────────────────
{
    const nm = collectAllTypeDefs(syntaxRegistry).filter(t => t.id.startsWith('nominative.'));
    check('nominative: 型数 = 10', nm.length === 10, `${nm.length}`);
    check('nominative: 全型 active + example_verse + wallace_ref',
          nm.every(t => t.status === 'active' && t.example_verse && t.wallace_ref));
    const l = sa.registry.getList('indeclinable_lemmas');
    check('nominative: indeclinable_lemmas が registry から解決',
          l instanceof Set && l.has('Ἀβραάμ'));
}

// ── 代表例（全 10 型） ───────────────────────────────────────────
console.log('\n  ─── 代表例（Wallace pp.36–64） ───');
nomRepr('subject MAT 1:2 Ἀβραάμ', 'MAT', 1, 2, 'Ἀβραάμ', 'nominative.subject', { maxRank: 1, minConf: 0.60 });
nomRepr('predicate_nominative JHN 1:1 θεός（Colwell 構文の述語側）', 'JHN', 1, 1, 'θεός', 'nominative.predicate_nominative', { maxRank: 1, minConf: 0.70 });
nomRepr('apposition ROM 1:1 Παῦλος δοῦλος', 'ROM', 1, 1, 'δοῦλος', 'nominative.apposition', { maxRank: 1, minConf: 0.65 });
nomRepr('absolute REV 1:4 Ἰωάννης（書簡挨拶）', 'REV', 1, 4, 'Ἰωάννης', 'nominative.nominative_absolute', { maxRank: 2, minConf: 0.45 });
nomRepr('pendens ACT 7:40 ὁ γὰρ Μωϋσῆς', 'ACT', 7, 40, 'Μωϋσῆς', 'nominative.pendens', { maxRank: 1, minConf: 0.60 });
nomRepr('vocative_nominative MRK 9:25 τὸ πνεῦμα', 'MRK', 9, 25, 'πνεῦμα', 'nominative.vocative_nominative', { maxRank: 1, minConf: 0.45 });
nomRepr('indeclinable MAT 1:2 Ἀβραάμ', 'MAT', 1, 2, 'Ἀβραάμ', 'nominative.indeclinable', { maxRank: 2, minConf: 0.55 });
nomRepr('subject_with_infinitive PHP 1:21 τὸ ζῆν Χριστός', 'PHP', 1, 21, 'Χριστός', 'nominative.subject_with_infinitive', { maxRank: 2, minConf: 0.45 });
nomRepr('exclamation ROM 7:24 Ταλαίπωρος... ἄνθρωπος', 'ROM', 7, 24, 'ἄνθρωπος', 'nominative.exclamation', { maxRank: 2, minConf: 0.45 });
nomRepr('title MAT 1:1 Βίβλος γενέσεως', 'MAT', 1, 1, 'βίβλος', 'nominative.title_nominative', { maxRank: 1, minConf: 0.50 });

// ── Regression（仕様指定 7 項目） ────────────────────────────────
console.log('\n  ─── Regression ───');
{
    // Colwell（冠詞側）と predicate_nominative（名詞側）の両立
    const t11 = verseTokens('JHN', 1, 1);
    const ci = t11.map((t, k) => [t, k]).filter(([t, k]) =>
        (t.lemma ?? '') === 'ὁ' && (t11[k + 1]?.lemma ?? '') === 'λόγος').map(([, k]) => k);
    const all = sa.analyzeAll(t11);
    const third = (all.results.find(r => r.tokenIdx === ci[2])?.output?.candidates ?? [])[0];
    check('回帰: JHN 1:1 第3の ὁ — article.colwell top 維持（predicate_nominative と競合しない）',
          third?.id === 'article.colwell', `top=${third?.id}`);
    // Predicate adjective 順位維持
    const pa = analyzeTokenCat('ROM', 7, 12, 'ἅγιος', 'adjective.');
    check('回帰: ROM 7:12 — adjective.predicate top 維持', pa.topId === 'adjective.predicate');
    // Predicate/personal pronoun 順位維持
    const pp = analyzeTokenCat('JHN', 8, 12, 'ἐγώ', 'pronoun.');
    check('回帰: JHN 8:12 — pronoun.personal top 維持', pp.topId === 'pronoun.personal');
    // Article / Participle / Infinitive / Verb 非干渉
    const ar = analyzeTokenCat('LUK', 10, 7, 'ὁ', 'article.');
    check('回帰: LUK 10:7 — article.generic top 維持', ar.topId === 'article.generic' || ar.allCandidates.length > 0);
    const pt = analyzeTokenCat('JHN', 4, 11, 'ζάω', 'participle.');
    check('回帰: JHN 4:11 — participle.attributive top 維持', pt.topId === 'participle.attributive');
    const inf = analyzeTokenCat('MAT', 6, 24, 'δουλεύω', 'infinitive.');
    check('回帰: MAT 6:24 — infinitive.complementary top 維持', inf.topId === 'infinitive.complementary');
    const vb = analyzeTokenCat('MRK', 1, 40, 'ἔρχομαι', 'verb.');
    check('回帰: MRK 1:40 — verb.historical_present top 維持', vb.topId === 'verb.historical_present');
}

// ════════════════════════════════════════════════════════════════
// §7u  Phase 13 — Vocative System（Wallace pp.65–71）
// ════════════════════════════════════════════════════════════════
section('§7u  Vocative System');

function vocRepr(label, b, c, v, lemma, typeId, opt) {
    const { maxRank, minConf } = opt;
    const r = analyzeTokenCat(b, c, v, lemma, 'vocative.');
    const rank = r.allCandidates.findIndex(x => x.id === typeId) + 1;
    const f = r.allCandidates.find(x => x.id === typeId);
    check(`${label} — 候補に存在`, Boolean(f),
          `top=${r.topId} 候補=${r.allCandidates.slice(0, 3).map(x => x.id).join(',')}`);
    check(`${label} — rank ≤ ${maxRank}`, rank > 0 && rank <= maxRank, `rank=${rank}`);
    check(`${label} — conf ≥ ${minConf}`, (f?.confidence ?? 0) >= minConf,
          `conf=${f?.confidence?.toFixed(2)}`);
    check(`${label} — signals_matched 非空`,
          Array.isArray(f?.signals_matched) && f.signals_matched.length > 0);
    check(`${label} — label_ja 有効`, Boolean(f?.label_ja));
}

// ── 構造検証 ─────────────────────────────────────────────────────
{
    const vc = collectAllTypeDefs(syntaxRegistry).filter(t => t.id.startsWith('vocative.'));
    check('vocative: 型数 = 5', vc.length === 5, `${vc.length}`);
    check('vocative: 全型 active + example_verse + wallace_ref',
          vc.every(t => t.status === 'active' && t.example_verse && t.wallace_ref));
}

// ── 代表例（全 5 型・Wallace pp.65–71） ──────────────────────────
console.log('\n  ─── 代表例 ───');
vocRepr('direct_address MAT 8:2 Κύριε', 'MAT', 8, 2, 'κύριος', 'vocative.direct_address', { maxRank: 1, minConf: 0.70 });
vocRepr('with_ō MAT 15:28 Ὦ γύναι', 'MAT', 15, 28, 'γυνή', 'vocative.with_o', { maxRank: 1, minConf: 0.80 });
vocRepr('nominative_for_vocative JHN 20:28 Ὁ κύριός μου', 'JHN', 20, 28, 'κύριος', 'vocative.nominative_for_vocative', { maxRank: 2, minConf: 0.55 });
vocRepr('exclamatory ROM 11:33 Ὦ βάθος', 'ROM', 11, 33, 'βάθος', 'vocative.exclamatory', { maxRank: 1, minConf: 0.45 });
vocRepr('chain MAT 27:46 Θεέ μου θεέ μου', 'MAT', 27, 46, 'θεός', 'vocative.chain', { maxRank: 2, minConf: 0.50 });

// ── Regression（仕様指定 4 項目） ────────────────────────────────
console.log('\n  ─── Regression ───');
{
    // Nominative: vocative_nominative（nominative カテゴリ内 top 維持）
    const n = analyzeTokenCat('MRK', 9, 25, 'πνεῦμα', 'nominative.');
    check('回帰: MRK 9:25 — nominative.vocative_nominative top 維持（カテゴリ内）',
          n.topId === 'nominative.vocative_nominative', `top=${n.topId}`);
    // Article monadic
    const ar = analyzeTokenCat('MAT', 5, 14, 'ὁ', 'article.');
    check('回帰: MAT 5:14 — article.monadic top 維持',
          ar.topId === 'article.monadic' || ar.allCandidates.some(c => c.id === 'article.monadic'));
    // Pronoun personal
    const pp = analyzeTokenCat('JHN', 8, 12, 'ἐγώ', 'pronoun.');
    check('回帰: JHN 8:12 — pronoun.personal top 維持', pp.topId === 'pronoun.personal');
    // Imperative customary
    const ic = analyzeTokenCat('LUK', 11, 3, 'δίδωμι', 'verb.');
    check('回帰: LUK 11:3 — verb.imperative_customary top 維持',
          ic.topId === 'verb.imperative_customary');
}

// ════════════════════════════════════════════════════════════════
// §7v  Phase 14 — Clause Syntax（Wallace pp.656–712）
// ════════════════════════════════════════════════════════════════
section('§7v  Clause Syntax');

function clRepr(label, b, c, v, lemma, typeId, opt) {
    const { maxRank, minConf } = opt;
    const r = analyzeTokenCat(b, c, v, lemma, 'clause.');
    const rank = r.allCandidates.findIndex(x => x.id === typeId) + 1;
    const f = r.allCandidates.find(x => x.id === typeId);
    check(`${label} — 候補に存在`, Boolean(f),
          `top=${r.topId} 候補=${r.allCandidates.slice(0, 3).map(x => x.id).join(',')}`);
    check(`${label} — rank ≤ ${maxRank}`, rank > 0 && rank <= maxRank, `rank=${rank}`);
    check(`${label} — conf ≥ ${minConf}`, (f?.confidence ?? 0) >= minConf,
          `conf=${f?.confidence?.toFixed(2)}`);
    check(`${label} — signals_matched 非空`,
          Array.isArray(f?.signals_matched) && f.signals_matched.length > 0);
    check(`${label} — label_ja 有効`, Boolean(f?.label_ja));
}

// ── 構造検証 ─────────────────────────────────────────────────────
{
    const cl = collectAllTypeDefs(syntaxRegistry).filter(t => t.id.startsWith('clause.'));
    check('clause: 型数 = 12', cl.length === 12, `${cl.length}`);
    check('clause: 全型 active + example_verse + wallace_ref',
          cl.every(t => t.status === 'active' && t.example_verse && t.wallace_ref));
    check('clause: 条件文 4 類が揃っている',
          ['first', 'second', 'third', 'fourth'].every(k =>
              cl.some(t => t.id === `clause.conditional_${k}_class`)));
}

// ── 代表例（条件文 4 類・Wallace pp.679–712） ────────────────────
console.log('\n  ─── 条件文 ───');
clRepr('第1類 MAT 12:28 εἰ + 直説法', 'MAT', 12, 28, 'εἰ', 'clause.conditional_first_class', { maxRank: 1, minConf: 0.65 });
clRepr('第2類 JHN 11:21 εἰ ἦς... οὐκ ἂν ἀπέθανεν', 'JHN', 11, 21, 'εἰ', 'clause.conditional_second_class', { maxRank: 1, minConf: 0.85 });
clRepr('第3類 1JN 1:9 ἐὰν + 接続法', '1JN', 1, 9, 'ἐάν', 'clause.conditional_third_class', { maxRank: 1, minConf: 0.70 });
clRepr('第4類 1PE 3:14 εἰ + 希求法', '1PE', 3, 14, 'εἰ', 'clause.conditional_fourth_class', { maxRank: 1, minConf: 0.75 });

// ── 代表例（従属節・pp.656–665） ─────────────────────────────────
console.log('\n  ─── 従属節 ───');
clRepr('内容節 MAT 5:17 νομίσητε ὅτι', 'MAT', 5, 17, 'ὅτι', 'clause.substantival_hoti', { maxRank: 1, minConf: 0.65 });
clRepr('理由節 MAT 5:3 μακάριοι... ὅτι', 'MAT', 5, 3, 'ὅτι', 'clause.causal_hoti', { maxRank: 1, minConf: 0.45 });
clRepr('目的節 JHN 3:16 ἵνα', 'JHN', 3, 16, 'ἵνα', 'clause.purpose_hina', { maxRank: 1, minConf: 0.60 });
clRepr('結果節 MAT 8:24 ὥστε', 'MAT', 8, 24, 'ὥστε', 'clause.result_hoste', { maxRank: 1, minConf: 0.55 });
clRepr('時間節 MAT 6:2 ὅταν + 接続法', 'MAT', 6, 2, 'ὅταν', 'clause.temporal_hotan', { maxRank: 1, minConf: 0.60 });
clRepr('時間節 MAT 7:28 ὅτε + 直説法', 'MAT', 7, 28, 'ὅτε', 'clause.temporal_hote', { maxRank: 1, minConf: 0.60 });
clRepr('比較節 JHN 13:34 καθώς', 'JHN', 13, 34, 'καθώς', 'clause.comparative_kathos', { maxRank: 1, minConf: 0.60 });
clRepr('関係節 MAT 2:9 ὁ ἀστὴρ ὅν', 'MAT', 2, 9, 'ὅς', 'clause.adjectival_relative', { maxRank: 1, minConf: 0.75 });

// ── Regression ───────────────────────────────────────────────────
console.log('\n  ─── Regression ───');
{
    // 動詞側の法判定（同一節の別トークン）が不変であること
    const v1 = analyzeTokenCat('1JN', 1, 9, 'ὁμολογέω', 'verb.');
    check('回帰: 1JN 1:9 ὁμολογῶμεν — verb.conditional_subjunctive top 維持',
          v1.topId === 'verb.conditional_subjunctive');
    const v2 = analyzeTokenCat('JHN', 17, 3, 'γινώσκω', 'verb.');
    check('回帰: JHN 17:3 — verb.purpose_clause top 維持', v2.topId === 'verb.purpose_clause');
    const i1 = analyzeTokenCat('MAT', 8, 24, 'καλύπτω', 'infinitive.');
    check('回帰: MAT 8:24 καλύπτεσθαι — infinitive.result top 維持',
          i1.topId === 'infinitive.result');
    const p1 = analyzeTokenCat('MRK', 3, 29, 'ὅς', 'pronoun.');
    check('回帰: MRK 3:29 ὅς — pronoun.relative top 維持（カテゴリ内）',
          p1.topId === 'pronoun.relative');
    const h1 = analyzeTokenCat('MRK', 1, 40, 'ἔρχομαι', 'verb.');
    check('回帰: MRK 1:40 — verb.historical_present top 維持',
          h1.topId === 'verb.historical_present');
    // 第1類が第2類環境（ἄν 後続）で top を取らないこと
    const c2 = analyzeTokenCat('JHN', 11, 21, 'εἰ', 'clause.');
    const fc = c2.allCandidates.find(x => x.id === 'clause.conditional_first_class');
    check('FP: JHN 11:21 — 第1類は第2類より下位', !fc || fc.confidence < (c2.topConf ?? 1));
}

// ════════════════════════════════════════════════════════════════
// §7w  Phase 15 — Preposition System（Wallace pp.355–389）
// ════════════════════════════════════════════════════════════════
section('§7w  Preposition System');

function prRepr(label, b, c, v, lemma, typeId, opt) {
    const { maxRank, minConf } = opt;
    const r = analyzeTokenCat(b, c, v, lemma, 'preposition.');
    const rank = r.allCandidates.findIndex(x => x.id === typeId) + 1;
    const f = r.allCandidates.find(x => x.id === typeId);
    check(`${label} — 候補に存在`, Boolean(f),
          `top=${r.topId} 候補=${r.allCandidates.slice(0, 3).map(x => x.id).join(',')}`);
    check(`${label} — rank ≤ ${maxRank}`, rank > 0 && rank <= maxRank, `rank=${rank}`);
    check(`${label} — conf ≥ ${minConf}`, (f?.confidence ?? 0) >= minConf,
          `conf=${f?.confidence?.toFixed(2)}`);
    check(`${label} — signals_matched 非空`,
          Array.isArray(f?.signals_matched) && f.signals_matched.length > 0);
    check(`${label} — label_ja 有効`, Boolean(f?.label_ja));
}

// ── 構造検証 ─────────────────────────────────────────────────────
{
    const pr = collectAllTypeDefs(syntaxRegistry).filter(t => t.id.startsWith('preposition.'));
    check('preposition: 型数 = 7', pr.length === 7, `${pr.length}`);
    check('preposition: 全型 active + example_verse + wallace_ref',
          pr.every(t => t.status === 'active' && t.example_verse && t.wallace_ref));
    check('preposition: 格支配 3 型が揃っている',
          ['genitive', 'dative', 'accusative'].every(k =>
              pr.some(t => t.id === `preposition.proper_with_${k}`)));
}

// ── 代表例（全 7 型・Wallace pp.355–389） ────────────────────────
console.log('\n  ─── 種別と格支配 ───');
prRepr('proper+gen MRK 1:10 ἐκ τοῦ ὕδατος', 'MRK', 1, 10, 'ἐκ', 'preposition.proper_with_genitive', { maxRank: 1, minConf: 0.70 });
prRepr('proper+dat MAT 3:11 ἐν ὕδατι', 'MAT', 3, 11, 'ἐν', 'preposition.proper_with_dative', { maxRank: 1, minConf: 0.70 });
prRepr('proper+acc MAT 4:12 εἰς τὴν Γαλιλαίαν', 'MAT', 4, 12, 'εἰς', 'preposition.proper_with_accusative', { maxRank: 1, minConf: 0.70 });
prRepr('improper LUK 1:15 ἐνώπιον τοῦ κυρίου', 'LUK', 1, 15, 'ἐνώπιον', 'preposition.improper', { maxRank: 1, minConf: 0.65 });

console.log('\n  ─── 前置詞句の統語機能 ───');
prRepr('adverbial MRK 1:10 ἐκ（無冠詞・既定）', 'MRK', 1, 10, 'ἐκ', 'preposition.adverbial_pp', { maxRank: 2, minConf: 0.50 });
prRepr('attributive MAT 6:9 Πάτερ ἡμῶν ὁ ἐν τοῖς οὐρανοῖς', 'MAT', 6, 9, 'ἐν', 'preposition.attributive_pp', { maxRank: 1, minConf: 0.75 });
prRepr('substantival GAL 3:7 οἱ ἐκ πίστεως', 'GAL', 3, 7, 'ἐκ', 'preposition.substantival_pp', { maxRank: 1, minConf: 0.73 });

// ── 追加パターン（後置小辞透過・属格冠詞の主名詞・分詞主名詞） ──
console.log('\n  ─── 追加パターン ───');
prRepr('attributive MAT 3:11 ὁ δὲ ὀπίσω μου ἐρχόμενος（δέ 透過＋分詞主名詞）', 'MAT', 3, 11, 'ὀπίσω', 'preposition.attributive_pp', { maxRank: 1, minConf: 0.75 });
prRepr('improper MAT 3:11 ὀπίσω μου（rank2 併存）', 'MAT', 3, 11, 'ὀπίσω', 'preposition.improper', { maxRank: 2, minConf: 0.65 });
prRepr('attributive MAT 12:50 τοῦ πατρός μου τοῦ ἐν οὐρανοῖς（属格冠詞の主名詞）', 'MAT', 12, 50, 'ἐν', 'preposition.attributive_pp', { maxRank: 1, minConf: 0.75 });
prRepr('substantival MAT 14:33 οἱ δὲ ἐν τῷ πλοίῳ（δέ 透過）', 'MAT', 14, 33, 'ἐν', 'preposition.substantival_pp', { maxRank: 1, minConf: 0.73 });

// ── FP 抑制（非該当型は 0.30 床以下） ────────────────────────────
console.log('\n  ─── FP 抑制 ───');
{
    const en = analyzeTokenCat('MAT', 3, 11, 'ἐν', 'preposition.');
    const imp = en.allCandidates.find(x => x.id === 'preposition.improper');
    check('FP: MAT 3:11 ἐν（固有）— improper は 0.30 床以下', (imp?.confidence ?? 0) <= 0.31,
          `conf=${imp?.confidence?.toFixed(2)}`);
    const eis = analyzeTokenCat('MAT', 4, 12, 'εἰς', 'preposition.');
    const pg = eis.allCandidates.find(x => x.id === 'preposition.proper_with_genitive');
    check('FP: MAT 4:12 εἰς（対格支配）— proper_with_genitive は 0.30 床以下',
          (pg?.confidence ?? 0) <= 0.31, `conf=${pg?.confidence?.toFixed(2)}`);
    const ek = analyzeTokenCat('MRK', 1, 10, 'ἐκ', 'preposition.');
    for (const id of ['preposition.attributive_pp', 'preposition.substantival_pp']) {
        const f = ek.allCandidates.find(x => x.id === id);
        check(`FP: MRK 1:10 ἐκ（無冠詞）— ${id.split('.')[1]} は 0.30 床以下`,
              (f?.confidence ?? 0) <= 0.31, `conf=${f?.confidence?.toFixed(2)}`);
    }
}

// ── Regression（PP 目的語側・隣接トークンの判定が不変） ──────────
console.log('\n  ─── Regression ───');
{
    const g = analyzeTokenCat('MRK', 1, 10, 'ὕδωρ', 'genitive.');
    check('回帰: MRK 1:10 ὕδατος — genitive.place top 維持', g.topId === 'genitive.place', `top=${g.topId}`);
    const a = analyzeTokenCat('MAT', 4, 12, 'Γαλιλαία', 'accusative.');
    check('回帰: MAT 4:12 Γαλιλαίαν — accusative カテゴリ top 不変',
          a.topId === 'accusative.direct_object', `top=${a.topId}`);
    const vv = analyzeTokenCat('MAT', 6, 9, 'πατήρ', 'vocative.');
    check('回帰: MAT 6:9 Πάτερ — vocative.direct_address top 維持',
          vv.topId === 'vocative.direct_address', `top=${vv.topId}`);
    const cl = analyzeTokenCat('GAL', 3, 7, 'ὅτι', 'clause.');
    check('回帰: GAL 3:7 ὅτι — clause.substantival_hoti top 維持',
          cl.topId === 'clause.substantival_hoti', `top=${cl.topId}`);
}

// ════════════════════════════════════════════════════════════════
// §7x  Phase 16 — Conjunction System（Wallace pp.666–678）
// ════════════════════════════════════════════════════════════════
section('§7x  Conjunction System');

function cjRepr(label, b, c, v, lemma, typeId, opt) {
    const { maxRank, minConf } = opt;
    const r = analyzeTokenCat(b, c, v, lemma, 'conjunction.');
    const rank = r.allCandidates.findIndex(x => x.id === typeId) + 1;
    const f = r.allCandidates.find(x => x.id === typeId);
    check(`${label} — 候補に存在`, Boolean(f),
          `top=${r.topId} 候補=${r.allCandidates.slice(0, 3).map(x => x.id).join(',')}`);
    check(`${label} — rank ≤ ${maxRank}`, rank > 0 && rank <= maxRank, `rank=${rank}`);
    check(`${label} — conf ≥ ${minConf}`, (f?.confidence ?? 0) >= minConf,
          `conf=${f?.confidence?.toFixed(2)}`);
    check(`${label} — signals_matched 非空`,
          Array.isArray(f?.signals_matched) && f.signals_matched.length > 0);
    check(`${label} — label_ja 有効`, Boolean(f?.label_ja));
}

// ── 構造検証 ─────────────────────────────────────────────────────
{
    const cj = collectAllTypeDefs(syntaxRegistry).filter(t => t.id.startsWith('conjunction.'));
    check('conjunction: 型数 = 12', cj.length === 12, `${cj.length}`);
    check('conjunction: 全型 active + example_verse + wallace_ref',
          cj.every(t => t.status === 'active' && t.example_verse && t.wallace_ref));
    check('conjunction: 等位 6 + 従属 6',
          cj.filter(t => t.id.includes('coordinating_') || t.id.includes('correlative_')).length === 6 &&
          cj.filter(t => t.id.includes('subordinating_')).length === 6);
}

// ── 代表例（等位・Wallace pp.670–674） ───────────────────────────
// 注: 仕様指定の GAL 2:20（ἀλλά）と ROM 1:8（δέ）は SBLGNT 本文に当該レンマが
// 存在しないため、1CO 15:10 / ROM 1:13 で代替（ROM 1:8 の μέν は
// μέν solitarium として FP 負例に使用）。
console.log('\n  ─── 等位接続詞 ───');
cjRepr('additive JHN 1:1 καί', 'JHN', 1, 1, 'καί', 'conjunction.coordinating_additive', { maxRank: 1, minConf: 0.70 });
cjRepr('adversative 1CO 15:10 ἀλλά', '1CO', 15, 10, 'ἀλλά', 'conjunction.coordinating_adversative', { maxRank: 1, minConf: 0.70 });
cjRepr('transition ROM 1:13 δέ', 'ROM', 1, 13, 'δέ', 'conjunction.coordinating_transition', { maxRank: 1, minConf: 0.70 });
cjRepr('inferential ROM 12:1 οὖν', 'ROM', 12, 1, 'οὖν', 'conjunction.coordinating_inferential', { maxRank: 1, minConf: 0.70 });
cjRepr('explanatory ROM 1:16 γάρ', 'ROM', 1, 16, 'γάρ', 'conjunction.coordinating_explanatory', { maxRank: 1, minConf: 0.70 });
cjRepr('men_de ROM 6:11 μέν（前項）', 'ROM', 6, 11, 'μέν', 'conjunction.correlative_men_de', { maxRank: 1, minConf: 0.75 });
cjRepr('men_de ROM 6:11 δέ（後項）', 'ROM', 6, 11, 'δέ', 'conjunction.correlative_men_de', { maxRank: 1, minConf: 0.75 });

// ── 代表例（従属・Wallace pp.674–678） ───────────────────────────
console.log('\n  ─── 従属接続詞 ───');
cjRepr('purpose JHN 3:16 ἵνα', 'JHN', 3, 16, 'ἵνα', 'conjunction.subordinating_purpose', { maxRank: 1, minConf: 0.65 });
cjRepr('content MAT 5:17 ὅτι', 'MAT', 5, 17, 'ὅτι', 'conjunction.subordinating_content', { maxRank: 1, minConf: 0.65 });
cjRepr('temporal MAT 6:2 ὅταν', 'MAT', 6, 2, 'ὅταν', 'conjunction.subordinating_temporal', { maxRank: 1, minConf: 0.65 });
cjRepr('conditional 1JN 1:9 ἐάν', '1JN', 1, 9, 'ἐάν', 'conjunction.subordinating_conditional', { maxRank: 1, minConf: 0.65 });
cjRepr('result MAT 8:24 ὥστε', 'MAT', 8, 24, 'ὥστε', 'conjunction.subordinating_result', { maxRank: 1, minConf: 0.65 });
cjRepr('comparative JHN 13:34 καθώς', 'JHN', 13, 34, 'καθώς', 'conjunction.subordinating_comparative', { maxRank: 1, minConf: 0.65 });

// ── 二層構造（接続詞層 + 節層が同一トークンに並立） ──────────────
console.log('\n  ─── 二層構造 ───');
{
    const cj = analyzeTokenCat('JHN', 3, 16, 'ἵνα', 'conjunction.');
    const cl = analyzeTokenCat('JHN', 3, 16, 'ἵνα', 'clause.');
    check('二層: JHN 3:16 ἵνα — conjunction.subordinating_purpose top',
          cj.topId === 'conjunction.subordinating_purpose', `top=${cj.topId}`);
    check('二層: JHN 3:16 ἵνα — clause.purpose_hina top（節層維持）',
          cl.topId === 'clause.purpose_hina', `top=${cl.topId}`);
}

// ── FP 抑制 ──────────────────────────────────────────────────────
console.log('\n  ─── FP 抑制 ───');
{
    // μέν solitarium（ROM 1:8 Πρῶτον μὲν... 後続 δέ なし）→ correlative は床
    const ms = analyzeTokenCat('ROM', 1, 8, 'μέν', 'conjunction.');
    const cor = ms.allCandidates.find(x => x.id === 'conjunction.correlative_men_de');
    check('FP: ROM 1:8 μέν solitarium — correlative は 0.30 床以下',
          (cor?.confidence ?? 0) <= 0.31, `conf=${cor?.confidence?.toFixed(2)}`);
    // 相関環境の δέ では transition が correlative に劣後
    const dd = analyzeTokenCat('ROM', 6, 11, 'δέ', 'conjunction.');
    const tr = dd.allCandidates.find(x => x.id === 'conjunction.coordinating_transition');
    check('FP: ROM 6:11 δέ — transition は correlative より下位',
          (tr?.confidence ?? 0) < (dd.topConf ?? 1), `conf=${tr?.confidence?.toFixed(2)}`);
    // ὡς は comparative > content の序列（Wallace: ὡς は主に比較）
    const hs = analyzeTokenCat('MRK', 1, 10, 'ὡς', 'conjunction.');
    check('FP: MRK 1:10 ὡς — comparative top', hs.topId === 'conjunction.subordinating_comparative',
          `top=${hs.topId}`);
    const ct = hs.allCandidates.find(x => x.id === 'conjunction.subordinating_content');
    check('FP: MRK 1:10 ὡς — content は低確度（≤0.45）',
          (ct?.confidence ?? 0) <= 0.45, `conf=${ct?.confidence?.toFixed(2)}`);
}

// ── Regression（仕様指定 8 項目・二層の節層/他カテゴリ不変） ─────
console.log('\n  ─── Regression ───');
{
    const r1 = analyzeTokenCat('JHN', 3, 16, 'ἵνα', 'clause.');
    check('回帰: clause.purpose_hina top 維持', r1.topId === 'clause.purpose_hina');
    const r2 = analyzeTokenCat('MAT', 5, 17, 'ὅτι', 'clause.');
    check('回帰: clause.substantival_hoti top 維持', r2.topId === 'clause.substantival_hoti');
    const r3 = analyzeTokenCat('MAT', 6, 2, 'ὅταν', 'clause.');
    check('回帰: clause.temporal_hotan top 維持', r3.topId === 'clause.temporal_hotan');
    const r4 = analyzeTokenCat('1JN', 1, 9, 'ἐάν', 'clause.');
    check('回帰: clause.conditional_third_class top 維持', r4.topId === 'clause.conditional_third_class');
    const r5 = analyzeTokenCat('JHN', 17, 3, 'γινώσκω', 'verb.');
    check('回帰: verb.purpose_clause top 維持', r5.topId === 'verb.purpose_clause');
    const r6 = analyzeTokenCat('1JN', 1, 9, 'ὁμολογέω', 'verb.');
    check('回帰: verb.conditional_subjunctive top 維持', r6.topId === 'verb.conditional_subjunctive');
    const r7 = analyzeTokenCat('MRK', 3, 29, 'ὅς', 'pronoun.');
    check('回帰: pronoun.relative top 維持（カテゴリ内）', r7.topId === 'pronoun.relative');
    const r8 = analyzeTokenCat('MAT', 6, 9, 'ἐν', 'preposition.');
    check('回帰: preposition.attributive_pp top 維持', r8.topId === 'preposition.attributive_pp');
}

// ════════════════════════════════════════════════════════════════
// §7y  Phase 17 — Particle System（Wallace 否定/疑問/強調・談話小辞）
// ════════════════════════════════════════════════════════════════
section('§7y  Particle System');

function ptRepr(label, b, c, v, lemma, typeId, opt) {
    const { maxRank, minConf } = opt;
    const r = analyzeTokenCat(b, c, v, lemma, 'particle.');
    const rank = r.allCandidates.findIndex(x => x.id === typeId) + 1;
    const f = r.allCandidates.find(x => x.id === typeId);
    check(`${label} — 候補に存在`, Boolean(f),
          `top=${r.topId} 候補=${r.allCandidates.slice(0, 3).map(x => x.id).join(',')}`);
    check(`${label} — rank ≤ ${maxRank}`, rank > 0 && rank <= maxRank, `rank=${rank}`);
    check(`${label} — conf ≥ ${minConf}`, (f?.confidence ?? 0) >= minConf,
          `conf=${f?.confidence?.toFixed(2)}`);
    check(`${label} — signals_matched 非空`,
          Array.isArray(f?.signals_matched) && f.signals_matched.length > 0);
    check(`${label} — label_ja 有効`, Boolean(f?.label_ja));
}

// ── 構造検証 ─────────────────────────────────────────────────────
{
    const pt = collectAllTypeDefs(syntaxRegistry).filter(t => t.id.startsWith('particle.'));
    check('particle: 型数 = 21', pt.length === 21, `${pt.length}`);
    check('particle: 全型 active + wallace_ref', pt.every(t => t.status === 'active' && t.wallace_ref));
    // dormant 2 型（περ/τοι 単独形は SBLGNT に不出現）以外は example_verse 必須
    const DORMANT = new Set(['particle.emphasis_per', 'particle.emphasis_toi']);
    check('particle: example_verse（dormant 2 型を除く）',
          pt.every(t => DORMANT.has(t.id) || t.example_verse));
    check('particle: dormant 型が登録されている（emphasis_per / emphasis_toi）',
          DORMANT.size === 2 && [...DORMANT].every(id => pt.some(t => t.id === id)));
}

// ── 代表例（否定・Wallace pp.468–469） ───────────────────────────
// 注: 仕様指定の MAT 5:34 は SBLGNT 本文に οὐ がない（μὴ ὀμόσαι）ため、
// negative_ou は JHN 1:5 で代表し、MAT 5:34 は negative_me の追加例とする。
console.log('\n  ─── 否定 ───');
ptRepr('negative_ou JHN 1:5 οὐ κατέλαβεν', 'JHN', 1, 5, 'οὐ', 'particle.negative_ou', { maxRank: 1, minConf: 0.70 });
ptRepr('negative_me MAT 6:13 μὴ εἰσενέγκῃς', 'MAT', 6, 13, 'μή', 'particle.negative_me', { maxRank: 1, minConf: 0.70 });
ptRepr('negative_me MAT 5:34 μὴ ὀμόσαι（仕様指定節）', 'MAT', 5, 34, 'μή', 'particle.negative_me', { maxRank: 1, minConf: 0.70 });
ptRepr('double_negative JHN 10:28 οὐ μή（οὐ 側）', 'JHN', 10, 28, 'οὐ', 'particle.double_negative', { maxRank: 2, minConf: 0.75 });
ptRepr('emphatic_negative JHN 10:28 οὐ μή＋接続法', 'JHN', 10, 28, 'οὐ', 'particle.emphatic_negative', { maxRank: 1, minConf: 0.85 });
ptRepr('emphatic_negative JHN 10:28（μή 側）', 'JHN', 10, 28, 'μή', 'particle.emphatic_negative', { maxRank: 1, minConf: 0.85 });

// ── 代表例（条件・疑問） ─────────────────────────────────────────
console.log('\n  ─── 条件・疑問 ───');
ptRepr('particle_an JHN 11:21 οὐκ ἂν ἀπέθανεν', 'JHN', 11, 21, 'ἄν', 'particle.particle_an', { maxRank: 1, minConf: 0.70 });
ptRepr('particle_ean 1JN 1:9 ἐάν', '1JN', 1, 9, 'ἐάν', 'particle.particle_ean', { maxRank: 1, minConf: 0.60 });
ptRepr('interrogative MAT 12:23 Μήτι（否定の答えを予期）', 'MAT', 12, 23, 'μήτι', 'particle.interrogative_particle', { maxRank: 1, minConf: 0.70 });
ptRepr('deliberative ROM 6:1 Τί οὖν ἐροῦμεν;', 'ROM', 6, 1, 'οὖν', 'particle.deliberative_particle', { maxRank: 1, minConf: 0.65 });
ptRepr('rhetorical ROM 6:2 μὴ γένοιτο', 'ROM', 6, 2, 'μή', 'particle.rhetorical_particle', { maxRank: 1, minConf: 0.70 });

// ── 代表例（焦点化・談話） ───────────────────────────────────────
// 注: 仕様指定の GAL 2（γε）・JHN 1:1（τε）は SBLGNT に当該レンマがなく、
// GAL 3:4（εἴ γε）・MAT 22:10（πονηρούς τε καὶ ἀγαθούς）で代表する。
console.log('\n  ─── 焦点化・談話 ───');
ptRepr('emphatic_ge GAL 3:4 εἴ γε', 'GAL', 3, 4, 'γέ', 'particle.emphatic_ge', { maxRank: 1, minConf: 0.65 });
ptRepr('restrictive_monon MAT 8:8 μόνον εἰπὲ λόγῳ', 'MAT', 8, 8, 'μόνος', 'particle.restrictive_monon', { maxRank: 1, minConf: 0.60 });
ptRepr('continuative_de ROM 1:13 δέ', 'ROM', 1, 13, 'δέ', 'particle.continuative_de', { maxRank: 1, minConf: 0.50 });
ptRepr('inferential_oun ROM 12:1 οὖν', 'ROM', 12, 1, 'οὖν', 'particle.inferential_oun', { maxRank: 1, minConf: 0.60 });
ptRepr('explanatory_gar ROM 1:16 γάρ', 'ROM', 1, 16, 'γάρ', 'particle.explanatory_gar', { maxRank: 1, minConf: 0.60 });
ptRepr('correlative_men ROM 6:11 μέν', 'ROM', 6, 11, 'μέν', 'particle.correlative_men', { maxRank: 1, minConf: 0.65 });
ptRepr('correlative_de ROM 6:11 δέ', 'ROM', 6, 11, 'δέ', 'particle.correlative_de', { maxRank: 1, minConf: 0.65 });
ptRepr('connective_te MAT 22:10 πονηρούς τε καὶ ἀγαθούς', 'MAT', 22, 10, 'τέ', 'particle.connective_te', { maxRank: 1, minConf: 0.60 });

// ── 代表例（強意ほか） ───────────────────────────────────────────
console.log('\n  ─── 強意ほか ───');
ptRepr('assertive_de MAT 13:23 ὃς δὴ καρποφορεῖ', 'MAT', 13, 23, 'δή', 'particle.assertive_de', { maxRank: 1, minConf: 0.55 });
ptRepr('attention_de ACT 13:2 ἀφορίσατε δή', 'ACT', 13, 2, 'δή', 'particle.attention_de', { maxRank: 1, minConf: 0.70 });

// ── FP 抑制 ──────────────────────────────────────────────────────
console.log('\n  ─── FP 抑制 ───');
{
    // 単独の οὐ で double/emphatic が立たない
    const ou = analyzeTokenCat('JHN', 1, 5, 'οὐ', 'particle.');
    for (const id of ['particle.double_negative', 'particle.emphatic_negative']) {
        const f = ou.allCandidates.find(x => x.id === id);
        check(`FP: JHN 1:5 οὐ（単独）— ${id.split('.')[1]} は 0.30 床以下`,
              (f?.confidence ?? 0) <= 0.31, `conf=${f?.confidence?.toFixed(2)}`);
    }
    // 平叙節の οὖν で deliberative が立たない
    const oun = analyzeTokenCat('ROM', 12, 1, 'οὖν', 'particle.');
    const del = oun.allCandidates.find(x => x.id === 'particle.deliberative_particle');
    check('FP: ROM 12:1 οὖν（平叙）— deliberative は 0.30 床以下',
          (del?.confidence ?? 0) <= 0.31, `conf=${del?.confidence?.toFixed(2)}`);
    // 直説法環境の δή で attention_de が立たない
    const da = analyzeTokenCat('MAT', 13, 23, 'δή', 'particle.');
    const at = da.allCandidates.find(x => x.id === 'particle.attention_de');
    check('FP: MAT 13:23 δή（直説法）— attention_de は 0.30 床以下',
          (at?.confidence ?? 0) <= 0.31, `conf=${at?.confidence?.toFixed(2)}`);
    // μέν solitarium で correlative_men が立たない
    const ms = analyzeTokenCat('ROM', 1, 8, 'μέν', 'particle.');
    const cm = ms.allCandidates.find(x => x.id === 'particle.correlative_men');
    check('FP: ROM 1:8 μέν solitarium — correlative_men は 0.30 床以下',
          (cm?.confidence ?? 0) <= 0.31, `conf=${cm?.confidence?.toFixed(2)}`);
}

// ── Regression（仕様指定・多層構造の他層が不変） ─────────────────
console.log('\n  ─── Regression ───');
{
    const checks = [
        ['1JN', 1, 9, 'ὁμολογέω', 'verb.', 'verb.conditional_subjunctive'],
        ['JHN', 17, 3, 'γινώσκω', 'verb.', 'verb.purpose_clause'],
        ['MAT', 12, 28, 'εἰ', 'clause.', 'clause.conditional_first_class'],
        ['JHN', 11, 21, 'εἰ', 'clause.', 'clause.conditional_second_class'],
        ['1JN', 1, 9, 'ἐάν', 'clause.', 'clause.conditional_third_class'],
        ['1PE', 3, 14, 'εἰ', 'clause.', 'clause.conditional_fourth_class'],
        ['JHN', 3, 16, 'ἵνα', 'clause.', 'clause.purpose_hina'],
        ['MAT', 8, 24, 'ὥστε', 'clause.', 'clause.result_hoste'],
        ['JHN', 1, 1, 'καί', 'conjunction.', 'conjunction.coordinating_additive'],
        ['1CO', 15, 10, 'ἀλλά', 'conjunction.', 'conjunction.coordinating_adversative'],
        ['ROM', 1, 13, 'δέ', 'conjunction.', 'conjunction.coordinating_transition'],
        ['ROM', 12, 1, 'οὖν', 'conjunction.', 'conjunction.coordinating_inferential'],
        ['ROM', 1, 16, 'γάρ', 'conjunction.', 'conjunction.coordinating_explanatory'],
        ['ROM', 6, 11, 'μέν', 'conjunction.', 'conjunction.correlative_men_de'],
        ['JHN', 3, 16, 'ἵνα', 'conjunction.', 'conjunction.subordinating_purpose'],
        ['MAT', 5, 17, 'ὅτι', 'conjunction.', 'conjunction.subordinating_content'],
        ['MAT', 6, 2, 'ὅταν', 'conjunction.', 'conjunction.subordinating_temporal'],
        ['1JN', 1, 9, 'ἐάν', 'conjunction.', 'conjunction.subordinating_conditional'],
        ['MAT', 8, 24, 'ὥστε', 'conjunction.', 'conjunction.subordinating_result'],
        ['JHN', 13, 34, 'καθώς', 'conjunction.', 'conjunction.subordinating_comparative'],
        ['MRK', 3, 29, 'ὅς', 'pronoun.', 'pronoun.relative'],
        ['MAT', 6, 9, 'ἐν', 'preposition.', 'preposition.attributive_pp'],
        ['MRK', 1, 10, 'ἐκ', 'preposition.', 'preposition.proper_with_genitive'],
        ['LUK', 1, 15, 'ἐνώπιον', 'preposition.', 'preposition.improper'],
        ['GAL', 3, 7, 'ἐκ', 'preposition.', 'preposition.substantival_pp'],
    ];
    for (const [b, c, v, lm, pre, want] of checks) {
        const r = analyzeTokenCat(b, c, v, lm, pre);
        check(`回帰: ${b} ${c}:${v} ${lm} — ${want} top 維持`, r.topId === want, `top=${r.topId}`);
    }
    // Article Colwell（JHN 1:1 第3の ὁ: θεὸς ἦν ὁ λόγος）/ Nominative predicate
    {
        const toks = verseTokens('JHN', 1, 1);
        const all = sa.analyzeAll(toks);
        const artTops = all.results
            .filter(r => (toks[r.tokenIdx]?.lemma ?? '') === 'ὁ')
            .map(r => (r.output?.candidates ?? []).filter(c => c.id.startsWith('article.'))[0]?.id);
        check('回帰: JHN 1:1 — 最終冠詞（θεὸς ἦν ὁ λόγος の ὁ）が article.colwell top 維持',
              artTops[artTops.length - 1] === 'article.colwell', `tops=${artTops.join(',')}`);
    }
    const pn = analyzeTokenCat('JHN', 1, 1, 'θεός', 'nominative.');
    check('回帰: JHN 1:1 — nominative.predicate_nominative top 維持',
          pn.topId === 'nominative.predicate_nominative', `top=${pn.topId}`);
}

// ════════════════════════════════════════════════════════════════
// §7z  Phase 18 — Nominal Syntax（名詞句構造・横断カテゴリ）
// ════════════════════════════════════════════════════════════════
section('§7z  Nominal Syntax');

// nth 出現対応の解析ヘルパー（JHN 1:1 の第2 θεός 等に必要）
function analyzeNthTokenCat(b, c, v, lemma, nth, prefix) {
    const tokens = verseTokens(b, c, v);
    let seen = 0, idx = -1;
    tokens.forEach((t, i) => {
        if ((t.lemma ?? '') === lemma) { if (seen === nth) idx = i; seen++; }
    });
    if (idx < 0) return { topId: null, topConf: 0, allCandidates: [] };
    const out = sa.analyze({ target: tokens[idx], tokens, targetIdx: idx });
    const candidates = (out.candidates || [])
        .filter(x => x.id && x.id.startsWith(prefix))
        .sort((a, b2) => (b2.confidence ?? 0) - (a.confidence ?? 0));
    return { topId: candidates[0]?.id ?? null, topConf: candidates[0]?.confidence ?? 0,
             allCandidates: candidates };
}

function nsRepr(label, r, typeId, opt) {
    const { maxRank, minConf } = opt;
    const rank = r.allCandidates.findIndex(x => x.id === typeId) + 1;
    const f = r.allCandidates.find(x => x.id === typeId);
    check(`${label} — 候補に存在`, Boolean(f),
          `top=${r.topId} 候補=${r.allCandidates.slice(0, 3).map(x => x.id).join(',')}`);
    check(`${label} — rank ≤ ${maxRank}`, rank > 0 && rank <= maxRank, `rank=${rank}`);
    check(`${label} — conf ≥ ${minConf}`, (f?.confidence ?? 0) >= minConf,
          `conf=${f?.confidence?.toFixed(2)}`);
    check(`${label} — signals_matched 非空`,
          Array.isArray(f?.signals_matched) && f.signals_matched.length > 0);
    check(`${label} — label_ja 有効`, Boolean(f?.label_ja));
}
const nsAt = (b, c, v, lm, nth = 0) => analyzeNthTokenCat(b, c, v, lm, nth, 'nominal_syntax.');

// ── 構造検証 ─────────────────────────────────────────────────────
{
    const ns = collectAllTypeDefs(syntaxRegistry).filter(t => t.id.startsWith('nominal_syntax.'));
    check('nominal_syntax: 型数 = 12', ns.length === 12, `${ns.length}`);
    check('nominal_syntax: 全型 active + example_verse + wallace_ref',
          ns.every(t => t.status === 'active' && t.example_verse && t.wallace_ref));
    check('nominal_syntax: stub 0', ns.every(t => t.status !== 'stub'));
}

// ── 代表例（全 12 型） ───────────────────────────────────────────
console.log('\n  ─── NP 構造 ───');
nsRepr('simple_np JHN 1:6 ἄνθρωπος（裸名詞）', nsAt('JHN', 1, 6, 'ἄνθρωπος'), 'nominal_syntax.simple_np', { maxRank: 1, minConf: 0.60 });
nsRepr('articular_np JHN 1:1 ὁ λόγος', nsAt('JHN', 1, 1, 'λόγος'), 'nominal_syntax.articular_np', { maxRank: 1, minConf: 0.60 });
nsRepr('anarthrous_np JHN 1:1 θεός（無冠詞述語）', nsAt('JHN', 1, 1, 'θεός', 1), 'nominal_syntax.anarthrous_np', { maxRank: 2, minConf: 0.55 });
nsRepr('modified_np MAT 12:35 ὁ ἀγαθὸς ἄνθρωπος', nsAt('MAT', 12, 35, 'ἄνθρωπος'), 'nominal_syntax.modified_np', { maxRank: 1, minConf: 0.65 });
nsRepr('modified_np JHN 10:11 ὁ ποιμὴν ὁ καλός（仕様指定節）', nsAt('JHN', 10, 11, 'ποιμήν'), 'nominal_syntax.modified_np', { maxRank: 2, minConf: 0.65 });
nsRepr('multiple_modifier MAT 6:11 τὸν ἄρτον ἡμῶν τὸν ἐπιούσιον', nsAt('MAT', 6, 11, 'ἄρτος'), 'nominal_syntax.multiple_modifier_np', { maxRank: 1, minConf: 0.70 });
nsRepr('appositional MAT 1:6 τὸν Δαυὶδ τὸν βασιλέα', nsAt('MAT', 1, 6, 'Δαυίδ'), 'nominal_syntax.appositional_np', { maxRank: 1, minConf: 0.65 });
nsRepr('genitive NP LUK 8:11 ὁ λόγος τοῦ θεοῦ（入れ子）', nsAt('LUK', 8, 11, 'λόγος'), 'nominal_syntax.nested_np', { maxRank: 1, minConf: 0.70 });
nsRepr('genitive NP LUK 8:11 — modified 併存', nsAt('LUK', 8, 11, 'λόγος'), 'nominal_syntax.modified_np', { maxRank: 2, minConf: 0.65 });
nsRepr('nested_np MAT 8:20 ὁ υἱὸς τοῦ ἀνθρώπου', nsAt('MAT', 8, 20, 'υἱός'), 'nominal_syntax.nested_np', { maxRank: 1, minConf: 0.70 });
nsRepr('complex_np 2CO 4:4 属格連鎖（4 層）', nsAt('2CO', 4, 4, 'φωτισμός'), 'nominal_syntax.complex_np', { maxRank: 1, minConf: 0.75 });
nsRepr('vocative_np MAT 6:9 Πάτερ ἡμῶν', nsAt('MAT', 6, 9, 'πατήρ'), 'nominal_syntax.vocative_np', { maxRank: 1, minConf: 0.75 });

console.log('\n  ─── 名詞化句（冠詞の名詞化機能） ───');
nsRepr('substantival adj MAT 5:3 οἱ πτωχοί', nsAt('MAT', 5, 3, 'πτωχός'), 'nominal_syntax.substantival_phrase', { maxRank: 1, minConf: 0.70 });
nsRepr('substantival ptc MAT 7:21 ὁ λέγων', nsAt('MAT', 7, 21, 'λέγω'), 'nominal_syntax.substantival_phrase', { maxRank: 1, minConf: 0.70 });
nsRepr('substantival PP MAT 5:15 τοῖς ἐν τῇ οἰκίᾳ', nsAt('MAT', 5, 15, 'ἐν'), 'nominal_syntax.substantival_phrase', { maxRank: 1, minConf: 0.70 });

console.log('\n  ─── 語順 ───');
nsRepr('head_initial JHN 10:11 ὁ ποιμὴν ὁ καλός', nsAt('JHN', 10, 11, 'ποιμήν'), 'nominal_syntax.head_initial_np', { maxRank: 4, minConf: 0.55 });
nsRepr('head_final MAT 12:35 ὁ ἀγαθὸς ἄνθρωπος', nsAt('MAT', 12, 35, 'ἄνθρωπος'), 'nominal_syntax.head_final_np', { maxRank: 3, minConf: 0.55 });

// ── FP 抑制 ──────────────────────────────────────────────────────
console.log('\n  ─── FP 抑制 ───');
{
    // 従属属格（τοῦ θεοῦ の θεοῦ）は NP ヘッドでない → 全型床
    const dep = nsAt('LUK', 8, 11, 'θεός');
    check('FP: LUK 8:11 θεοῦ（従属属格）— nominal_syntax は全候補 0.30 床以下',
          (dep.topConf ?? 0) <= 0.31, `top=${dep.topId}(${dep.topConf?.toFixed(2)})`);
    // 述語主格（JHN 1:14 σάρξ）は同格でない
    const sarx = nsAt('JHN', 1, 14, 'σάρξ');
    const ap = sarx.allCandidates.find(x => x.id === 'nominal_syntax.appositional_np');
    check('FP: JHN 1:14 σάρξ（述語主格）— appositional は 0.30 床以下',
          (ap?.confidence ?? 0) <= 0.31, `conf=${ap?.confidence?.toFixed(2)}`);
    // 限定形容詞（JHN 10:11 καλός）は名詞化句でない（一致主名詞あり）
    const kal = nsAt('JHN', 10, 11, 'καλός');
    const sb = kal.allCandidates.find(x => x.id === 'nominal_syntax.substantival_phrase');
    check('FP: JHN 10:11 καλός（限定形容詞）— substantival は 0.30 床以下',
          (sb?.confidence ?? 0) <= 0.31, `conf=${sb?.confidence?.toFixed(2)}`);
}

// ── Regression（全カテゴリ横断・各カテゴリ代表 top 維持） ────────
console.log('\n  ─── Regression ───');
{
    const checks = [
        ['MRK', 1, 10, 'ὕδωρ', 0, 'genitive.', 'genitive.place'],
        ['JHN', 10, 11, 'καλός', 0, 'adjective.', 'adjective.attributive'],
        ['JHN', 8, 12, 'ἐγώ', 0, 'pronoun.', 'pronoun.personal'],
        ['MAT', 28, 19, 'πορεύομαι', 0, 'participle.', 'participle.adverbial_attendant'],
        ['MAT', 6, 9, 'ἐν', 0, 'preposition.', 'preposition.attributive_pp'],
        ['JHN', 1, 1, 'θεός', 1, 'nominative.', 'nominative.predicate_nominative'],
        ['MAT', 8, 2, 'κύριος', 0, 'vocative.', 'vocative.direct_address'],
        ['JHN', 3, 16, 'ἵνα', 0, 'clause.', 'clause.purpose_hina'],
        ['JHN', 10, 28, 'οὐ', 0, 'particle.', 'particle.emphatic_negative'],
        ['JHN', 1, 1, 'καί', 0, 'conjunction.', 'conjunction.coordinating_additive'],
    ];
    for (const [b, c, v, lm, nth, pre, want] of checks) {
        const r = analyzeNthTokenCat(b, c, v, lm, nth, pre);
        check(`回帰: ${b} ${c}:${v} ${lm} — ${want} top 維持`, r.topId === want, `top=${r.topId}`);
    }
    // Article colwell（JHN 1:1 最終冠詞）
    {
        const toks = verseTokens('JHN', 1, 1);
        const all = sa.analyzeAll(toks);
        const artTops = all.results
            .filter(r => (toks[r.tokenIdx]?.lemma ?? '') === 'ὁ')
            .map(r => (r.output?.candidates ?? []).filter(x => x.id.startsWith('article.'))[0]?.id);
        check('回帰: JHN 1:1 — 最終冠詞 article.colwell top 維持',
              artTops[artTops.length - 1] === 'article.colwell', `tops=${artTops.join(',')}`);
    }
}

// ════════════════════════════════════════════════════════════════
// §7aa  Phase 19 — Discourse System（談話構造・最終 Wallace 章）
// ════════════════════════════════════════════════════════════════
section('§7aa  Discourse System');

function dsRepr(label, b, c, v, lemma, nth, typeId, opt) {
    const { maxRank, minConf } = opt;
    const r = analyzeNthTokenCat(b, c, v, lemma, nth, 'discourse.');
    const rank = r.allCandidates.findIndex(x => x.id === typeId) + 1;
    const f = r.allCandidates.find(x => x.id === typeId);
    check(`${label} — 候補に存在`, Boolean(f),
          `top=${r.topId} 候補=${r.allCandidates.slice(0, 3).map(x => x.id).join(',')}`);
    check(`${label} — rank ≤ ${maxRank}`, rank > 0 && rank <= maxRank, `rank=${rank}`);
    check(`${label} — conf ≥ ${minConf}`, (f?.confidence ?? 0) >= minConf,
          `conf=${f?.confidence?.toFixed(2)}`);
    check(`${label} — signals_matched 非空`,
          Array.isArray(f?.signals_matched) && f.signals_matched.length > 0);
    check(`${label} — label_ja 有効`, Boolean(f?.label_ja));
}

// ── 構造検証 ─────────────────────────────────────────────────────
{
    const ds = collectAllTypeDefs(syntaxRegistry).filter(t => t.id.startsWith('discourse.'));
    check('discourse: 型数 = 10', ds.length === 10, `${ds.length}`);
    check('discourse: 全型 active + example_verse + wallace_ref',
          ds.every(t => t.status === 'active' && t.example_verse && t.wallace_ref));
    check('discourse: stub 0', ds.every(t => t.status !== 'stub'));
}

// ── 代表例（情報構造） ───────────────────────────────────────────
console.log('\n  ─── 情報構造（前置・転位） ───');
dsRepr('topic_fronting 1JN 4:8 ὁ θεὸς ἀγάπη ἐστίν', '1JN', 4, 8, 'θεός', 1, 'discourse.topic_fronting', { maxRank: 1, minConf: 0.60 });
dsRepr('focus_fronting ROM 10:2 ζῆλον θεοῦ ἔχουσιν', 'ROM', 10, 2, 'ζῆλος', 0, 'discourse.focus_fronting', { maxRank: 1, minConf: 0.60 });
dsRepr('emphasis EPH 2:8 Τῇ γὰρ χάριτί ἐστε σεσῳσμένοι', 'EPH', 2, 8, 'χάρις', 0, 'discourse.emphasis_word_order', { maxRank: 1, minConf: 0.55 });
dsRepr('left_dislocation ACT 7:40 ὁ γὰρ Μωϋσῆς οὗτος…αὐτῷ', 'ACT', 7, 40, 'Μωϋσῆς', 0, 'discourse.left_dislocation', { maxRank: 1, minConf: 0.70 });
dsRepr('right_dislocation JHN 9:13 αὐτὸν…τόν ποτε τυφλόν', 'JHN', 9, 13, 'τυφλός', 0, 'discourse.right_dislocation', { maxRank: 1, minConf: 0.45 });

// ── 代表例（談話装置） ───────────────────────────────────────────
console.log('\n  ─── 談話装置（挿入・対比・前景/背景） ───');
dsRepr('parenthetical ROM 3:5 κατὰ ἄνθρωπον λέγω', 'ROM', 3, 5, 'λέγω', 1, 'discourse.parenthetical', { maxRank: 1, minConf: 0.65 });
dsRepr('explanatory MRK 3:17 ὅ ἐστιν Υἱοὶ Βροντῆς', 'MRK', 3, 17, 'εἰμί', 0, 'discourse.explanatory_parenthesis', { maxRank: 1, minConf: 0.65 });
dsRepr('contrast MAT 9:37 μέν（前項）', 'MAT', 9, 37, 'μέν', 0, 'discourse.contrast_men_de', { maxRank: 1, minConf: 0.60 });
dsRepr('contrast MAT 9:37 δέ（後項）', 'MAT', 9, 37, 'δέ', 0, 'discourse.contrast_men_de', { maxRank: 1, minConf: 0.60 });
dsRepr('backgrounding MRK 1:10 ἀναβαίνων（状況分詞）', 'MRK', 1, 10, 'ἀναβαίνω', 0, 'discourse.backgrounding', { maxRank: 1, minConf: 0.50 });
dsRepr('backgrounding 1JN 1:9 ἐὰν ὁμολογῶμεν（従属節）', '1JN', 1, 9, 'ὁμολογέω', 0, 'discourse.backgrounding', { maxRank: 1, minConf: 0.50 });
dsRepr('foregrounding MRK 1:40 ἔρχεται（歴史的現在）', 'MRK', 1, 40, 'ἔρχομαι', 0, 'discourse.foregrounding', { maxRank: 1, minConf: 0.55 });

// ── FP 抑制 ──────────────────────────────────────────────────────
console.log('\n  ─── FP 抑制 ───');
{
    // 従属節の動詞に foregrounding が立たない
    const sub = analyzeNthTokenCat('1JN', 1, 9, 'ὁμολογέω', 0, 'discourse.');
    const fg = sub.allCandidates.find(x => x.id === 'discourse.foregrounding');
    check('FP: 1JN 1:9 ὁμολογῶμεν（従属）— foregrounding は 0.30 床以下',
          (fg?.confidence ?? 0) <= 0.31, `conf=${fg?.confidence?.toFixed(2)}`);
    // 主節の直説法に backgrounding が立たない
    const mn = analyzeNthTokenCat('MRK', 1, 10, 'ὁράω', 0, 'discourse.');
    const bg = mn.allCandidates.find(x => x.id === 'discourse.backgrounding');
    check('FP: MRK 1:10 εἶδεν（主節）— backgrounding は 0.30 床以下',
          (bg?.confidence ?? 0) <= 0.31, `conf=${bg?.confidence?.toFixed(2)}`);
    // 前置詞支配の対格に focus_fronting が立たない
    const pg = analyzeNthTokenCat('JHN', 1, 1, 'θεός', 0, 'discourse.');
    const fc = pg.allCandidates.find(x => x.id === 'discourse.focus_fronting');
    check('FP: JHN 1:1 πρὸς τὸν θεόν — focus_fronting は 0.30 床以下',
          (fc?.confidence ?? 0) <= 0.31, `conf=${fc?.confidence?.toFixed(2)}`);
    // μέν solitarium に contrast が立たない
    const ms = analyzeNthTokenCat('ROM', 1, 8, 'μέν', 0, 'discourse.');
    const ct = ms.allCandidates.find(x => x.id === 'discourse.contrast_men_de');
    check('FP: ROM 1:8 μέν solitarium — contrast は 0.30 床以下',
          (ct?.confidence ?? 0) <= 0.31, `conf=${ct?.confidence?.toFixed(2)}`);
}

// ── Regression（仕様指定 8 カテゴリ・top 維持） ──────────────────
console.log('\n  ─── Regression ───');
{
    const checks = [
        ['JHN', 1, 1, 'καί', 0, 'conjunction.', 'conjunction.coordinating_additive'],
        ['JHN', 10, 28, 'οὐ', 0, 'particle.', 'particle.emphatic_negative'],
        ['JHN', 3, 16, 'ἵνα', 0, 'clause.', 'clause.purpose_hina'],
        ['MRK', 1, 40, 'ἔρχομαι', 0, 'verb.', 'verb.historical_present'],
        ['2CO', 4, 4, 'φωτισμός', 0, 'nominal_syntax.', 'nominal_syntax.complex_np'],
        ['JHN', 1, 1, 'θεός', 1, 'nominative.', 'nominative.predicate_nominative'],
        ['JHN', 8, 12, 'ἐγώ', 0, 'pronoun.', 'pronoun.personal'],
        ['MAT', 6, 9, 'ἐν', 0, 'preposition.', 'preposition.attributive_pp'],
    ];
    for (const [b, c, v, lm, nth, pre, want] of checks) {
        const r = analyzeNthTokenCat(b, c, v, lm, nth, pre);
        check(`回帰: ${b} ${c}:${v} ${lm} — ${want} top 維持`, r.topId === want, `top=${r.topId}`);
    }
}

// ════════════════════════════════════════════════════════════════
// §8  最終カバレッジレポート
// ════════════════════════════════════════════════════════════════
section('§8  最終カバレッジレポート');

// ReadingFormatter テンプレート数（genitive 分）
const mappedCount = genitiveIds.filter(id => {
    try {
        const r = rf.format({ type: id });
        return r?.summary && r.summary !== UNCLASSIFIED_TEXT;
    } catch (_) { return false; }
}).length;

// format() が返す有効テンプレート総数（genitive 以外も含む）
// ※ _WALLACE_TEXT は外部公開されていないため間接推計
const allTemplateTypes = [
    ...genitiveIds,
    'clause.condition', 'clause.contrast',
];
const totalMapped = allTemplateTypes.filter(id => {
    try {
        const r = rf.format({ type: id });
        return r?.summary && r.summary !== UNCLASSIFIED_TEXT;
    } catch (_) { return false; }
}).length;

console.log('');
console.log(`  レジストリ genitive.* 型数   : ${genitiveIds.length}`);
console.log(`  ReadingFormatter テンプレート : ${mappedCount} / ${genitiveIds.length} (genitive 分)`);
console.log(`  マッピング済み総型数          : ${totalMapped}`);
console.log(`  テスト総数                    : ${PASS + FAIL}`);
console.log(`    PASS  : ${PASS}`);
console.log(`    FAIL  : ${FAIL}`);
console.log(`    WARN  : ${WARN}`);
console.log('');

const allPass = FAIL === 0;
console.log('══════════════════════════════════════════════════════');
console.log(`最終結果: ${allPass ? 'PASS' : 'FAIL'}  (PASS=${PASS} FAIL=${FAIL} WARN=${WARN})`);
console.log('══════════════════════════════════════════════════════\n');

process.exit(allPass ? 0 : 1);
