'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }
function sha256file(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

console.log('=== Phase 4bc — G3708 / G3762 22件 japanese 修正 ===\n');

// ── 変更定義 ───────────────────────────────────────────────
const CHANGES = [
  // G3708 ὁράω — 21件 (見る → 各語)
  { ref: 'MAT 12:25!1',  strong: 'G3708', from: '見る',    to: '見抜く',    ja1955: '見抜いて（見抜く）',                     group: 'G3708' },
  { ref: 'MRK 6:20!7',   strong: 'G3708', from: '見る',    to: '知る',      ja1955: '知って',                                  group: 'G3708' },
  { ref: 'MRK 12:15!3',  strong: 'G3708', from: '見る',    to: '見抜く',    ja1955: '見抜いて（見抜く）',                     group: 'G3708' },
  { ref: 'LUK 9:33!34',  strong: 'G3708', from: '見る',    to: '知る',      ja1955: 'わからないで（否定形→知る正規化）',      group: 'G3708' },
  { ref: 'LUK 9:47!4',   strong: 'G3708', from: '見る',    to: '見抜く',    ja1955: '見抜き（見抜く）',                        group: 'G3708' },
  { ref: 'LUK 11:17!3',  strong: 'G3708', from: '見る',    to: '見抜く',    ja1955: '見抜いて（見抜く）',                     group: 'G3708' },
  { ref: 'JHN 6:61!1',   strong: 'G3708', from: '見る',    to: '見破る',    ja1955: '見破って（見破る）',                     group: 'G3708' },
  { ref: 'JHN 13:1!7',   strong: 'G3708', from: '見る',    to: '知る',      ja1955: '知り',                                    group: 'G3708' },
  { ref: 'JHN 13:3!1',   strong: 'G3708', from: '見る',    to: '思う',      ja1955: '思い（思う）',                            group: 'G3708' },
  { ref: 'JHN 18:4!3',   strong: 'G3708', from: '見る',    to: '知る',      ja1955: '承知しておられ（承知する→知る正規化）', group: 'G3708' },
  { ref: 'JHN 19:28!3',  strong: 'G3708', from: '見る',    to: '知る',      ja1955: '知って',                                  group: 'G3708' },
  { ref: 'ACT 2:30!5',   strong: 'G3708', from: '見る',    to: '認める',    ja1955: '認めていた（認める）',                   group: 'G3708' },
  { ref: 'ACT 20:22!17', strong: 'G3708', from: '見る',    to: '知る',      ja1955: 'わからない（否定形→知る正規化）',        group: 'G3708' },
  { ref: 'ACT 24:22!7',  strong: 'G3708', from: '見る',    to: 'わきまえる',ja1955: 'わきまえていた（わきまえる）',           group: 'G3708' },
  { ref: '2TI 2:23!8',   strong: 'G3708', from: '見る',    to: '知る',      ja1955: '知っている',                              group: 'G3708' },
  { ref: '2TI 3:14!9',   strong: 'G3708', from: '見る',    to: '知る',      ja1955: '知っており',                              group: 'G3708' },
  { ref: 'TIT 3:11!1',   strong: 'G3708', from: '見る',    to: '知る',      ja1955: '知りつつも',                              group: 'G3708' },
  { ref: '2PE 1:14!1',   strong: 'G3708', from: '見る',    to: '知る',      ja1955: '知っているからである',                   group: 'G3708' },
  { ref: 'REV 12:12!26', strong: 'G3708', from: '見る',    to: '知る',      ja1955: '知り',                                    group: 'G3708' },
  { ref: '2PE 1:12!9',   strong: 'G3708', from: '見る',    to: '知る',      ja1955: '知っており',                              group: 'G3708' },
  { ref: 'JUD 1:5!5',    strong: 'G3708', from: '見る',    to: '知る',      ja1955: '知っている',                              group: 'G3708' },
  // G3762 ACT 20:24!2 — 1件 (何も〜ない → 少しも〜ない)
  { ref: 'ACT 20:24!2',  strong: 'G3762', from: '何も〜ない', to: '少しも〜ない',
    ja1955: '少しも（「少しも惜しいとは思わない」— οὐδενὸς λόγου ποιοῦμαι 句全体のイディオム）',
    group: 'G3762', note: '句全体のイディオム（οὐδενὸς λόγου ποιοῦμαι）から切り出した断片' },
];

// [] 確定トークン（値変更なし、台帳記録のみ）
const BRACKET_RECORDS = [
  { ref: '1TI 1:9!1',  strong: 'G3708', cur_japanese: '見る',
    ja1955: 'すなわち（Εἰδὼς τοῦτο ὅτι が接続詞に置換）',
    classification: '[] 確定', note: '知識動詞なし、構文ごと接続詞に置換' },
  { ref: 'PHM 1:21!7', strong: 'G3708', cur_japanese: '見る',
    ja1955: '確かに（εἰδὼς ὅτι が副詞的に置換）',
    classification: '[] 確定', note: '知識動詞なし、確かにに置換' },
];

// ── ファイルごとにバッチ処理 ──────────────────────────────
const fileMap = new Map();
CHANGES.forEach(c => {
  const m = c.ref.match(/^(\S+)\s+(\d+):(\d+)!/);
  const [, book, ch] = m;
  const fp = path.join(BIBLE, book, ch + '.json');
  if (!fileMap.has(fp)) fileMap.set(fp, []);
  fileMap.get(fp).push(c);
});

console.log('対象ファイル数:', fileMap.size);
console.log('変更トークン総数:', CHANGES.length);

// ── Pre-flight ───────────────────────────────────────────
console.log('\n--- Pre-flight ---');
const preErrors = [];
const preShaSums = {};

for (const [fp, changes] of fileMap) {
  if (!fs.existsSync(fp)) { preErrors.push('FILE NOT FOUND: ' + fp); continue; }
  preShaSums[fp] = sha256file(fp);
  const data = loadJson(fp);
  for (const c of changes) {
    const t = data.find(x => x.ref === c.ref);
    if (!t) { preErrors.push('REF NOT FOUND: ' + c.ref); continue; }
    if (t.japanese !== c.from) {
      preErrors.push('JA_MISMATCH: ' + c.ref + ' cur="' + t.japanese + '" expected="' + c.from + '"');
    }
  }
}

if (preErrors.length) {
  console.error('PRE-FLIGHT ERRORS:');
  preErrors.forEach(e => console.error(' ', e));
  process.exit(1);
}
console.log('Pre-flight: PASS (全22件の現在値確認完了)');

// ── 実装 ──────────────────────────────────────────────────
console.log('\n--- 実装 ---');
const appliedDiffs = [];
const postShaSums = {};

for (const [fp, changes] of fileMap) {
  const data = loadJson(fp);
  for (const c of changes) {
    const t = data.find(x => x.ref === c.ref);
    t.japanese = c.to;
    appliedDiffs.push({ ...c, file: fp.replace(BASE + '/', '') });
    console.log('  ' + c.ref + ': "' + c.from + '" → "' + c.to + '"');
  }
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
  postShaSums[fp] = sha256file(fp);
  // verify parseable
  loadJson(fp);
}

console.log('\n適用完了:', appliedDiffs.length, '件');

// ── Post-verification ────────────────────────────────────
console.log('\n--- Post-verification ---');
const postErrors = [];

for (const [fp, changes] of fileMap) {
  const data = loadJson(fp);
  for (const c of changes) {
    const t = data.find(x => x.ref === c.ref);
    if (!t) { postErrors.push('V_REF_MISSING: ' + c.ref); continue; }
    if (t.japanese !== c.to) {
      postErrors.push('V_JA_WRONG: ' + c.ref + ' got="' + t.japanese + '" want="' + c.to + '"');
    }
    // verify other fields untouched (spot-check strong/morph)
    if (t.strong !== c.strong) {
      postErrors.push('V_STRONG_CHANGED: ' + c.ref + ' strong=' + t.strong);
    }
  }
  // verify SHA changed
  if (preShaSums[fp] === postShaSums[fp]) {
    postErrors.push('V_SHA_UNCHANGED: ' + fp);
  }
}

if (postErrors.length) {
  console.error('POST-VERIFICATION ERRORS:');
  postErrors.forEach(e => console.error(' ', e));
  process.exit(1);
}
console.log('Post-verification: PASS');
console.log('  変更ファイル数:', fileMap.size);
console.log('  変更トークン数:', appliedDiffs.length);

// ── 成果物 ───────────────────────────────────────────────

// 1. 変更 diff JSON
const fileDiffs = [];
for (const [fp, changes] of fileMap) {
  fileDiffs.push({
    file: fp.replace(BASE + '/', ''),
    sha256_before: preShaSums[fp],
    sha256_after: postShaSums[fp],
    tokens_changed: changes.length,
    refs: changes.map(c => c.ref)
  });
}

const diffJson = {
  meta: { phase: '4bc', date: new Date().toISOString().slice(0, 10), total_tokens: CHANGES.length, files_changed: fileMap.size },
  changes: appliedDiffs.map(c => ({
    ref: c.ref, strong: c.strong, group: c.group,
    from: c.from, to: c.to,
    ja1955_correspondence: c.ja1955,
    note: c.note || null,
    file: c.file
  })),
  bracket_records: BRACKET_RECORDS,
  file_diffs: fileDiffs
};
saveJson(path.join(OUT, 'stage4-phase4bc-implementation-diff.json'), diffJson);
console.log('\nWrote: stage4-phase4bc-implementation-diff.json');

// 2. アライメント記録（将来の対応表作業から参照できる形式）
const alignmentRecord = {
  meta: {
    phase: '4bc',
    date: new Date().toISOString().slice(0, 10),
    description: 'JA1955 口語訳との対応に基づく japanese 修正記録',
    reference_translation: 'JA1955',
    alignment_table_coverage: 'ローマ1〜7章が完成済み（今回対象外）。対象章の対応表が完成次第、本記録との整合チェックを実施すること。'
  },
  records: [
    ...CHANGES.map(c => ({
      ref: c.ref,
      japanese_before: c.from,
      ja1955_correspondence: c.ja1955,
      japanese_after: c.to,
      bracket_classification: null,
      note: c.note || null
    })),
    ...BRACKET_RECORDS.map(r => ({
      ref: r.ref,
      japanese_before: r.cur_japanese,
      ja1955_correspondence: r.ja1955,
      japanese_after: r.cur_japanese,
      bracket_classification: r.classification,
      note: r.note
    }))
  ]
};
saveJson(path.join(OUT, 'stage4-phase4bc-alignment-record.json'), alignmentRecord);
console.log('Wrote: stage4-phase4bc-alignment-record.json');

// 3. Summary report
const byNewJa = {};
CHANGES.forEach(c => { byNewJa[c.to] = (byNewJa[c.to] || 0) + 1; });

console.log('\n=== Phase 4bc 変更サマリー ===');
console.log('総変更件数:', CHANGES.length);
console.log('  うち G3708:', CHANGES.filter(c => c.group === 'G3708').length, '件');
console.log('  うち G3762:', CHANGES.filter(c => c.group === 'G3762').length, '件（ACT 20:24!2）');
console.log('変更後 japanese 分布:', JSON.stringify(byNewJa));
console.log('[] 確定（値変更なし）:', BRACKET_RECORDS.length, '件');
console.log('\n次: npm run build:search-index を実行してください');
