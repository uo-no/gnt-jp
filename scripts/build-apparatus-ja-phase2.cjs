#!/usr/bin/env node
/**
 * build-apparatus-ja-phase2.cjs
 *
 * Phase 2 自動生成: tokenRefStatus=exact の読み差記述。
 * 各読みのテキストと証拠者を中立的に提示する。
 *
 * 出力: public/assets/data/apparatus-ja-phase2.json
 *
 * 生成条件:
 *   - tokenRefStatus = 'exact'
 *   - verseRange = false
 *   - 全読みテキストが MAX_TEXT_LEN 字以内
 *   - + prefix / isOmission / 内部 '…' を含む reading がない
 *   - apparatus-ja.json（手動）と apparatus-ja-auto.json（Phase 1）に未登録のID
 *
 * 制約（L-0）:
 *   - 語形・語義・形態・人名の同定・優劣の判断をしない
 *   - 文字列と証拠者の事実のみを提示する
 *   - 読みの差の「種類」（綴り差・語彙差等）を断定しない
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const BASE_PATH    = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus.json');
const MANUAL_PATH  = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja.json');
const PHASE1_PATH  = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja-auto.json');
const OUT_PATH     = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja-phase2.json');

const MAX_TEXT_LEN = 30;

const base   = JSON.parse(fs.readFileSync(BASE_PATH,   'utf8'));
const manual = JSON.parse(fs.readFileSync(MANUAL_PATH, 'utf8'));
const phase1 = JSON.parse(fs.readFileSync(PHASE1_PATH, 'utf8'));

const manualIds = new Set(Object.keys(manual.entries));
const phase1Ids = new Set(Object.keys(phase1.entries));
const coveredIds = new Set([...manualIds, ...phase1Ids]);

const excludedLong   = [];
const excludedOther  = [];
const outEntries     = {};

for (const e of base.entries) {
    if (e.verseRange)           continue;
    if (e.tokenRefStatus !== 'exact') continue;
    if (coveredIds.has(e.id))   continue;

    const rdgs = e.readings;

    // 長文除外
    if (rdgs.some(r => r.text.length > MAX_TEXT_LEN)) {
        excludedLong.push(e.id);
        continue;
    }

    // + prefix / isOmission がある reading を持つ場合は除外
    // （Task 28 が対象のはずだが念のため）
    if (rdgs.some(r => r.text.startsWith('+') || r.isOmission)) {
        excludedOther.push(e.id);
        continue;
    }

    // 読みテキストに '…' を含む場合は除外
    if (rdgs.some(r => r.text.includes('…'))) {
        excludedOther.push(e.id);
        continue;
    }

    // reading テキストが空またはダッシュ（isOmission=false なのに空）は除外
    if (rdgs.some(r => !r.isOmission && (r.text === '' || r.text === '-' || r.text === '–'))) {
        excludedOther.push(e.id);
        continue;
    }

    // ja 生成: TEXT（WITNESSES）・TEXT（WITNESSES）...
    const parts = rdgs.map(r => {
        const witStr = r.witnesses.join(' ');
        return r.text + '（' + witStr + '）';
    });
    const ja = parts.join('・');

    outEntries[e.id] = {
        tag:       '読み差',
        ja,
        status:    '自動生成',
        autoPhase: 2,
    };
}

const entryCount = Object.keys(outEntries).length;

const out = {
    _meta: {
        version:          '1.0.0',
        phase:            2,
        entryCount,
        generatedAt:      new Date().toISOString().slice(0, 10),
        description:      'Phase 2 自動生成: tokenRefStatus=exact の読み差記述',
        policy:           'L-0準拠。読み文字列と証拠者の事実のみ。語形・語義・差異種別の断定なし。',
        generator:        'scripts/build-apparatus-ja-phase2.cjs',
        excludedManual:   manualIds.size,
        excludedPhase1:   phase1Ids.size,
        excludedLongText: excludedLong.length,
        excludedLongIds:  excludedLong,
        excludedOther:    excludedOther.length,
        maxTextLength:    MAX_TEXT_LEN,
        targetStatus:     'tokenRefStatus=exact, verseRange=false',
    },
    entries: outEntries,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), 'utf8');
console.log('apparatus-ja-phase2.json 生成完了: ' + entryCount + ' エントリ');
console.log('  長文除外: ' + excludedLong.length + '件 — ' + excludedLong.join(', '));
console.log('  その他除外: ' + excludedOther.length + '件');
console.log('  手動カバー除外: ' + manualIds.size + '件');
console.log('  Phase1 除外: ' + phase1Ids.size + '件');
console.log('  出力先: ' + OUT_PATH);
