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
        if (typeof node.id === 'string' && /^[a-z]+\.[a-z_]+$/.test(node.id)) {
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
    if (typeof node.id === 'string' && /^[a-z]+\.[a-z_]+$/.test(node.id) && node.xsc) {
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
    const topActive = cands.find(c => (c.status ?? 'active') !== 'stub');
    check('合成 ἐν+与格 — 非 stub の最上位が UI 閾値 0.40 未満（Discovery Card 非表示）',
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
