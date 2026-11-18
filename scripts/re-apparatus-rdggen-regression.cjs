#!/usr/bin/env node
/**
 * re-apparatus-rdggen-regression.cjs（実行キュー #117）
 *
 * apparatus-{ja,en,es}-rdggen.json（build-apparatus-rdggen.cjs の生成物）と、
 * それを既存 rdg にマージする chapter-loaders.js の _loadApparatusRdg{Ja,En,Es}Data を検証する。
 *
 *   1. 生成物のキーは既存 apparatus-rdg-{lang}.json の読みと重ならない（上書きしない）
 *   2. 実際のローダ関数（vm で読み込み、fetch はディスクから返す）でマージした結果が、
 *      既存の全読みについて既存値と完全一致する（既存表示の回帰なし）
 *   3. 生成物は単語形の読み（空白区切りで1語、omission でない）だけを持つ
 *   4. TIT-0003（テトス1:5）：②ἀπέλειπόν・③κατέλιπόν に3言語ともグロスがあり、
 *      JA は ①（本文の読み）と同じ「残す」系。①の既存値は不変
 *   5. 生成物の取得に失敗しても既存分だけで返る（静寂優先）
 *   6. 冪等：生成器を再実行しても生成物のバイト列が変わらない
 *
 * 実行: node scripts/re-apparatus-rdggen-regression.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'public', 'assets', 'data');
const LANGS = ['ja', 'en', 'es'];
let pass = 0, fail = 0;
function check(name, cond, detail) {
    if (cond) pass++;
    else { fail++; console.log(`  FAIL: ${name}${detail ? ' — ' + detail : ''}`); }
}
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));

const apparatus = readJson(path.join(DATA, 'apparatus.json'));
const byId = {};
for (const e of apparatus.entries) byId[e.id] = e;

function loadLoaders(failGen) {
    const src = fs.readFileSync(path.join(ROOT, 'public', 'app', 'loaders', 'chapter-loaders.js'), 'utf8');
    const fetch = async (url) => {
        const rel = url.replace(/^\.\.\//, '');
        const p = path.join(ROOT, 'public', rel);
        if (failGen && /-rdggen\.json$/.test(url)) return { ok: false, status: 404, json: async () => { throw new Error('404'); } };
        if (!fs.existsSync(p)) return { ok: false, status: 404, json: async () => { throw new Error('404'); } };
        const body = fs.readFileSync(p, 'utf8');
        return { ok: true, status: 200, json: async () => JSON.parse(body) };
    };
    const ctx = { fetch, console, setTimeout, clearTimeout, Promise, Map, Set };
    ctx.window = ctx;
    ctx.document = { addEventListener() {}, querySelector() { return null; }, getElementById() { return null; } };
    vm.createContext(ctx);
    vm.runInContext(src + '\n;this.__rdg = { ja: _loadApparatusRdgJaData, en: _loadApparatusRdgEnData, es: _loadApparatusRdgEsData };', ctx);
    return ctx.__rdg;
}

(async () => {
    console.log('=== re-apparatus-rdggen-regression ===');
    const loaders = loadLoaders(false);
    for (const lang of LANGS) {
        const base = readJson(path.join(DATA, `apparatus-rdg-${lang}.json`)).entries;
        const gen = readJson(path.join(DATA, `apparatus-${lang}-rdggen.json`)).entries;

        // 1. 重ならない
        let overlap = 0;
        for (const id in gen) for (const k in gen[id]) if (base[id] && base[id][k] != null) overlap++;
        check(`[${lang}] 生成物は既存 rdg の読みと重ならない`, overlap === 0, `${overlap} 件重複`);

        // 2. 実ローダでのマージ結果：既存の全読みが既存値と一致、生成分も入っている
        const merged = (await loaders[lang]()).entries;
        let baseReadings = 0, mismatch = 0;
        for (const id in base) for (const k in base[id]) {
            baseReadings++;
            if (!merged[id] || merged[id][k] !== base[id][k]) mismatch++;
        }
        check(`[${lang}] マージ後も既存 ${baseReadings} 読みの値が不変`, mismatch === 0 && baseReadings > 0, `${mismatch} 件不一致`);
        let genReadings = 0, genMissing = 0;
        for (const id in gen) for (const k in gen[id]) { genReadings++; if (!merged[id] || merged[id][k] !== gen[id][k]) genMissing++; }
        check(`[${lang}] 生成 ${genReadings} 読みがマージ結果に入る`, genMissing === 0 && genReadings > 0, `${genMissing} 件欠落`);
        const mergedCount = Object.values(merged).reduce((s, e) => s + Object.keys(e).length, 0);
        check(`[${lang}] マージ後の読み数 = 既存 + 生成`, mergedCount === baseReadings + genReadings, `${mergedCount} ≠ ${baseReadings}+${genReadings}`);

        // 3. 単語形の読みのみ
        let bad = 0;
        for (const id in gen) for (const k in gen[id]) {
            const r = byId[id] && byId[id].readings[Number(k)];
            if (!r || r.isOmission || !r.text || r.text.trim().split(/\s+/).length !== 1 || !String(gen[id][k]).trim()) bad++;
        }
        check(`[${lang}] 生成物は単語形の読みだけ`, bad === 0, `${bad} 件`);

        // 4. TIT-0003
        const t = merged['TIT-0003'] || {};
        check(`[${lang}] TIT-0003 ①の既存値が不変`, t['0'] === base['TIT-0003']['0']);
        check(`[${lang}] TIT-0003 ②ἀπέλειπόν にグロス`, !!t['1'], JSON.stringify(t));
        check(`[${lang}] TIT-0003 ③κατέλιπόν にグロス`, !!t['2'], JSON.stringify(t));
        if (lang === 'ja') {
            check('[ja] TIT-0003 ② は本文の読みと同じ「残す」系', /残/.test(t['1'] || ''), t['1']);
            check('[ja] TIT-0003 ③ は καταλείπω の「残す」系', /残/.test(t['2'] || ''), t['2']);
        }
    }

    // 5. 生成物が取れなくても既存分で返る
    const loadersNoGen = loadLoaders(true);
    for (const lang of LANGS) {
        const base = readJson(path.join(DATA, `apparatus-rdg-${lang}.json`)).entries;
        const m = await loadersNoGen[lang]();
        check(`[${lang}] 生成物 404 でも既存 rdg がそのまま返る`, m && JSON.stringify(m.entries) === JSON.stringify(base));
    }

    // 6. 冪等
    const hash = () => LANGS.map(l => crypto.createHash('sha256').update(fs.readFileSync(path.join(DATA, `apparatus-${l}-rdggen.json`))).digest('hex'));
    const before = hash();
    execFileSync(process.execPath, [path.join(__dirname, 'build-apparatus-rdggen.cjs')], { stdio: 'ignore' });
    const after = hash();
    check('生成器の再実行で生成物が同一（冪等）', before.every((h, i) => h === after[i]));

    console.log(`\n${pass}/${pass + fail} checks passed`);
    if (fail) { console.log(`\nFAILED: ${fail} check(s)`); process.exit(1); }
    console.log('\nPASS');
})().catch(e => { console.error(e); process.exit(1); });
