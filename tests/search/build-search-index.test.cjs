#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '../..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'search-index-fixture-'));
const writeJson = (file, value) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value));
};
try {
    writeJson(path.join(fixture, 'public/books.json'), {
        corpora: { NT: 'nt', OT: 'lxx' },
        NT: [{ key: 'MAT', code: '01', name: 'マタイ', chapters: 1 }],
        OT: [{ key: 'GEN', code: '01', name: '創世記', chapters: 1 }],
    });
    writeJson(path.join(fixture, 'public/bible_data/nt/MAT/1.json'), [
        { ref: 'MAT 1:1!1', verse: '1', text: 'Βίβλος', lemma: 'βίβλος', japanese: '書物', gloss: '[The] book', strong: 'G976', morph: 'N-NSF' },
        { ref: 'MAT 1:1!2', verse: '1', text: 'γενέσεως', lemma: 'γένεσις', japanese: '起源', strong: 'G1078', morph: 'N-GSF' },
    ]);
    writeJson(path.join(fixture, 'public/bible_data/lxx/GEN/1.json'), [
        { ref: 'GEN 1:1!1', verse: '1', text: 'θεός', lemma: 'θεός', japanese: '神', strong: 'G2316', morph: 'N-NSM' },
    ]);

    execFileSync(process.execPath, [
        path.join(repoRoot, 'scripts/build-search-index.js'),
        '--root', fixture,
        '--out-dir', 'public/search-index',
    ], { stdio: 'pipe' });

    const out = path.join(fixture, 'public/search-index');
    const meta = JSON.parse(fs.readFileSync(path.join(out, 'meta.json'), 'utf8'));
    const nt = JSON.parse(fs.readFileSync(path.join(out, 'nt/MAT.json'), 'utf8'));
    const lxx = JSON.parse(fs.readFileSync(path.join(out, 'lxx/GEN.json'), 'utf8'));

    assert.equal(meta.schemaVersion, 3);
    assert.equal(meta.chapterCount, 2);
    assert.equal(meta.tokenCount, 3);
    assert.equal(nt.tokenCount, 2);
    assert.equal(nt.bookKey, 'MAT');
    assert.equal(meta.corpora.NT.books[0].path, 'nt/MAT.json');
    assert.equal(nt.globalIdxStart, 0);
    assert.equal(nt.globalIdxEnd, 1);
    assert.equal(lxx.tokenCount, 1);
    assert.equal(lxx.bookKey, 'GEN');
    assert.equal(meta.corpora.LXX.books[0].path, 'lxx/GEN.json');
    assert.equal(lxx.globalIdxStart, 2);
    assert.equal(lxx.globalIdxEnd, 2);
    assert.deepEqual(nt.index.lemma['βίβλος'], [0]);
    assert.deepEqual(nt.index.lemma['βιβλοσ'], [0]);
    assert.deepEqual(nt.index.strong.G976, [0]);
    assert.deepEqual(nt.index.morph['N-NSF'], [0]);
    assert.equal(nt.tokens[0].globalIdx, 0);
    assert.equal(lxx.tokens[0].globalIdx, 2);
    assert.deepEqual(nt.index.text['Βίβλος'], [0]);
    assert.deepEqual(nt.index.text['βιβλοσ'], [0]);
    assert.deepEqual(nt.index.textToJp['Βίβλος'], '書物');
    assert.deepEqual(nt.index.japanesePartial['書物'], [0]);
    assert.deepEqual(nt.index.japanesePartial['書'], [0]);
    assert.deepEqual(lxx.index.japanesePartial['神'], [2]);
    for (const shard of [nt, lxx]) {
        assert.equal(shard.tokens.length, shard.tokenCount);
        for (const key of ['lemma', 'text', 'strong', 'morph', 'japanesePartial']) {
            for (const [term, postings] of Object.entries(shard.index[key])) {
                assert.ok(Array.isArray(postings), `${shard.bookKey} ${key}:${term} must be an array`);
                assert.ok(postings.every(idx => idx >= shard.globalIdxStart && idx <= shard.globalIdxEnd),
                    `${shard.bookKey} ${key}:${term} posting outside shard range`);
            }
        }
    }

    // Regression guard: corpus loading returns an array of book shards, not a single object.
    const runtime = fs.readFileSync(path.join(repoRoot, 'public/search-tool.html'), 'utf8');
    assert.match(runtime, /nt\.some\(shard=>shard\.sourceVersion!==meta\.sourceVersion\)/);
    assert.match(runtime, /lxx\.some\(shard=>shard\.sourceVersion!==metaVersion\)/);

    // Missing chapter files must fail rather than silently emit a partial index.
    fs.unlinkSync(path.join(fixture, 'public/bible_data/lxx/GEN/1.json'));
    const failed = require('node:child_process').spawnSync(process.execPath, [
        path.join(repoRoot, 'scripts/build-search-index.js'),
        '--root', fixture,
        '--out-dir', 'public/search-index-missing',
    ], { encoding: 'utf8' });
    assert.notEqual(failed.status, 0);
    assert.match(failed.stderr, /missing\/invalid chapter files/);

    console.log('PASS: generated corpus split, Greek/Japanese postings, globalIdx continuity, normalization, and missing-data guard');
} finally {
    fs.rmSync(fixture, { recursive: true, force: true });
}
