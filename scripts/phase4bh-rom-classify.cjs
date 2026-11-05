'use strict';
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2), 'utf8'); }
function gitShow(gp) {
  try { return JSON.parse(execSync('git show origin/main:' + gp, { maxBuffer: 4*1024*1024 }).toString()); }
  catch(e) { return null; }
}

console.log('=== Phase 4bh — ローマ書 対応表照合 再分類 ===\n');

// ═══════════════════════════════════════════════════════
// 正規化（改訂版: asymmetric 問題を解消）
// ═══════════════════════════════════════════════════════
// Step 1: 無条件の正字/仮名変体 置換
const ORTHO_TABLE = [
  // 人称
  [/私たち/g,       'わたしたち'],
  [/私(?!たち)/g,   'わたし'],
  [/我々|われわれ/g, 'わたしたち'],
  [/汝/g,           'あなた'],
  [/貴方/g,         'あなた'],
  // 一般語
  [/誰/g,           'だれ'],
  [/何(?![人物事千百十万億兆])/g, 'なに'],
  [/僕(?!に|を|は|が)/g, 'しもべ'], // servant (not pronoun 僕)
  // 旧仮名 ヤ行拗音 (JA1955 特有: シヤ→シャ 等)
  [/シヤ/g,  'シャ'],
  [/チヤ/g,  'チャ'],
  [/ジヤ/g,  'ジャ'],
  [/ヂヤ/g,  'ジャ'],
  [/ヅ/g,    'ズ'],
  [/ヱ/g,    'ウェ'],
  [/ヲ/g,    'ヲ'],
  // 旧漢字/異体字 (JA1955 で頻出)
  [/さいわい/g, '幸い'],
  [/まみれ/g,   'まみれ'],
];

function applyOrtho(s) {
  for (const [pat, rep] of ORTHO_TABLE) s = s.replace(pat, rep);
  return s;
}

// Step 2: 表記正規化（句読点・助詞除去 → 語幹）
function stem(s) {
  if (!s) return '';
  s = s.replace(/[。、！？「」『』（）()【】　\s\.・]+/g, '').trim();
  s = applyOrtho(s);
  // 末尾助詞除去
  s = s.replace(/[はがをにでもへよりのか]$/, '');
  // 受身・使役 → 活用除去
  s = s.replace(/(?:させ|され|られ)(?:た|て|ている|ています|ました)?$/, '');
  // て/た/ます形 → 語幹
  s = s.replace(/(?:てきた|ています|ている|ていた|ました|ます)$/, '');
  s = s.replace(/(?:して)$/, 'する');
  s = s.replace(/た$/, '');
  return s.trim();
}

// 語彙同一判定
function isStemMatch(a, b) {
  if (!a || !b) return false;
  const sa = stem(a), sb = stem(b);
  if (!sa || !sb) return false;
  if (sa === sb) return true;
  if (sa.length >= 2 && sb.length >= 2 && (sb.includes(sa) || sa.includes(sb))) return true;
  return false;
}

// 旧仮名のみの差 = 表記差
function isOrthoOnly(a, b) {
  if (isStemMatch(a, b)) return false; // already matched = 一致に分類
  const oa = applyOrtho(a.replace(/[。、！？\s]/g, '')).replace(/[はがをにでもの]$/, '');
  const ob = applyOrtho(b.replace(/[。、！？\s]/g, '')).replace(/[はがをにでもの]$/, '');
  return stem(oa) === stem(ob);
}

// 機能語・テンプレート判定
const FUNC_STRONGS = new Set([
  'G3588','G3739','G3748','G3745','G5101','G4169',    // 冠詞・関係・疑問
  'G3450','G1473','G3165','G2257','G2248','G2254','G2249', // 1人称
  'G3427','G1698','G1691','G2504',                    // 1人称残り
  'G4671','G4771','G4675',                            // 2人称
  'G848','G1438','G240',                              // 再帰・相互
  'G5100','G5124','G1565','G3778','G5023',            // 不定・指示
  'G3634','G3755','G1699','G2251','G5212',            // 関係・所有
]);
const FUNC_MORPH_PREFIX = new Set(['T','P','R','D','I','K','C','X','F']);
const TEMPLATE_RE = /^〜/;
const LABEL_JA = new Set(['私','わたし','あなた','これ','それ','あれ','この','その','あの',
  '誰','だれ','何','なに','互いに','ある','〜する者','〜するもの','〜するだけ',
  '彼','彼女','彼ら','自分','自分自身','私たち','わたしたち',]);

function isLabel(tokJa, strong, morph) {
  if (FUNC_STRONGS.has(strong)) return true;
  if (FUNC_MORPH_PREFIX.has(morph?.[0])) return true;
  if (TEMPLATE_RE.test(tokJa)) return true;
  if (LABEL_JA.has(tokJa)) return true;
  return false;
}

// ═══════════════════════════════════════════════════════
// グロス形（候補値）生成
// ═══════════════════════════════════════════════════════
// 活用形 → 辞書形変換テーブル（確認済みパターン）
const KNOWN_GLOSS = [
  // segment text（正規化後） → candidate gloss
  [/^よろしく(言ってほしい|お伝えください)?$/,  'よろしく'],
  [/^召し?て$|^召して$/,                          '召す'],
  [/^召された?$/,                                  '召す'],
  [/^選び別たれ?$/,                               '選び別つ'],
  [/^義とされる?$/,                               '義とする'],
  [/^義とし$/,                                    '義とする'],
  [/^義とされるのである?$/,                        '義とする'],
  [/^義人$/,                                      '義人'],
  [/^さいわい$/,                                  '幸い'],
  [/^幸い$/,                                      '幸い'],
  [/^どうして$/,                                  'どうして'],
  [/^まして$/,                                    'まして'],
  [/^なおも$/,                                    'なおも'],
  [/^永遠に$/,                                    '永遠に'],
  [/^外見上の?$/,                                  '外見上の'],
  [/^弁解の余地がない?$/,                          '弁解の余地がない'],
  [/^ギリシヤ人$/,                                'ギリシヤ人'],
  [/^夫$/,                                        '夫'],
  [/^善$/,                                        '善'],
  [/^悪$/,                                        '悪'],
  [/^光栄$/,                                      '光栄'],
  [/^ほまれ$/,                                    'ほまれ'],
  [/^あらかじめ約束された?$/,                      'あらかじめ約束する'],
  [/^罪を犯し?$/,                                 '罪を犯す'],
  [/^認められるのである?$/,                        '認める'],
  [/^認め$/,                                      '認める'],
  [/^証拠$/,                                      '証拠'],
  [/^示す$/,                                      '示す'],
  [/^行っている?$/,                               '行う'],
  [/^第一$/,                                      '第一'],
  [/^はじめ$/,                                    'はじめ'],
];

function getGloss(segText) {
  // まず strip
  let s = segText.replace(/[。、！？「」（）【】　\s・]+/g, '').trim();
  s = applyOrtho(s);
  s = s.replace(/[はがをにでもへとより]$/, '').trim();

  // Known patterns check (stem適用後)
  const ss = stem(segText);
  for (const [pat, rep] of KNOWN_GLOSS) {
    if (pat.test(ss) || pat.test(s)) return rep;
  }

  // 受身→能動
  s = s.replace(/(?:させ|され|られ)(?:た|て|ている|ます)?$/, 'する');
  // した→する, った→う, いた→く
  s = s.replace(/いた$/, 'く');
  s = s.replace(/った$/, 'う');
  s = s.replace(/(?:(?!する)した|して)$/, 'する');
  s = s.replace(/た$/, '');
  return s.trim();
}

// ═══════════════════════════════════════════════════════
// データロード
// ═══════════════════════════════════════════════════════
const ag = loadJson(AG_PATH);
const agMap = new Map(ag.tokens.map(t => [t.ref, t]));

const romTokens = {};
for (let ch = 1; ch <= 16; ch++) {
  const data = loadJson(path.join(BIBLE, 'ROM', ch + '.json'));
  for (const t of data) {
    const m = t.ref.match(/^ROM (\d+):(\d+)!(\d+)/);
    if (!m) continue;
    const [, c, v, pos] = m;
    const key = c + ':' + v;
    if (!romTokens[key]) romTokens[key] = [];
    romTokens[key].push({ ...t, pos: parseInt(pos) });
  }
}
for (const k of Object.keys(romTokens)) romTokens[k].sort((a,b)=>a.pos-b.pos);

const alignData = {};
for (let ch = 1; ch <= 16; ch++) {
  const d = gitShow('public/assets/data/alignment/JA1955/ROM/' + ch + '.json');
  if (d) alignData[ch] = d;
}

// ═══════════════════════════════════════════════════════
// 照合・分類
// ═══════════════════════════════════════════════════════
const cat_match    = [];
const cat_ortho    = [];
const cat_label    = [];
const cat_vocab    = []; // 真の語彙相違

for (const [ch, aData] of Object.entries(alignData)) {
  for (const [v, vData] of Object.entries(aData.verses)) {
    const verseKey = ch + ':' + v;
    const verseToks = romTokens[verseKey] || [];
    if (!verseToks.length) continue;

    const segByPos = {};
    for (const seg of (vData.segments || [])) {
      if (!seg.tokens) continue;
      for (const pos of seg.tokens) segByPos[pos] = seg;
    }

    for (const tok of verseToks) {
      const seg = segByPos[tok.pos];
      if (!seg) continue;

      const invTok = agMap.get(tok.ref);
      const invState = invTok?.state || '未収録';
      const rec = {
        ref: tok.ref, strong: tok.strong, morph: tok.morph,
        inv_state: invState,
        tok_ja: tok.japanese, seg_text: seg.t, seg_note: seg.note || null,
      };

      if (isStemMatch(tok.japanese, seg.t)) {
        cat_match.push(rec);
      } else if (isOrthoOnly(tok.japanese, seg.t)) {
        cat_ortho.push({ ...rec, reason: '旧仮名・正字仮名変体' });
      } else if (isLabel(tok.japanese, tok.strong, tok.morph)) {
        cat_label.push(rec);
      } else {
        const gloss = getGloss(seg.t);
        cat_vocab.push({ ...rec, candidate: gloss });
      }
    }
  }
}

const total = cat_match.length + cat_ortho.length + cat_label.length + cat_vocab.length;

// ═══════════════════════════════════════════════════════
// 真の語彙相違 状態別
// ═══════════════════════════════════════════════════════
const STATES_ORDER = ['UNREVIEWED','RETAIN_CONFIRMED','未収録','IMPLEMENTED_AND_VERIFIED','HOLD_DATA_QUALITY','HOLD_CONTEXT'];
const vocabByState = {};
for (const r of cat_vocab) {
  const st = r.inv_state;
  if (!vocabByState[st]) vocabByState[st] = [];
  vocabByState[st].push(r);
}

console.log('=== 4分類 サマリー ===');
console.log('総照合件数:', total);
console.log('  一致（正規化後）              :', cat_match.length, '(' + Math.round(cat_match.length/total*100) + '%)');
console.log('  表記差のみ（同一語彙）        :', cat_ortho.length, '(' + Math.round(cat_ortho.length/total*100) + '%)');
console.log('  ラベルとして妥当（機能語等）  :', cat_label.length, '(' + Math.round(cat_label.length/total*100) + '%)');
console.log('  真の語彙相違                  :', cat_vocab.length, '(' + Math.round(cat_vocab.length/total*100) + '%)');

console.log('\n真の語彙相違', cat_vocab.length, '件 — 状態別:');
for (const st of STATES_ORDER) {
  const n = (vocabByState[st] || []).length;
  if (n) console.log('  ' + st.padEnd(30) + ': ' + n + '件');
}

// ═══════════════════════════════════════════════════════
// UNREVIEWED 変更候補 パターン表
// ═══════════════════════════════════════════════════════
const unrevVocab = vocabByState['UNREVIEWED'] || [];
console.log('\n=== UNREVIEWED 変更候補', unrevVocab.length, '件 ===');

// パターン集計: (strong, tok_ja, candidate) → count + examples
const patterns = {};
for (const r of unrevVocab) {
  const key = r.strong + '\t' + r.tok_ja + '\t' + r.candidate;
  if (!patterns[key]) patterns[key] = { strong: r.strong, from: r.tok_ja, to: r.candidate, seg_sample: r.seg_text, count: 0, refs: [] };
  patterns[key].count++;
  if (patterns[key].refs.length < 3) patterns[key].refs.push(r.ref);
}
const patSorted = Object.values(patterns).sort((a,b)=>b.count-a.count);
console.log('パターン数:', patSorted.length);

console.log('\n上位30パターン（件数≥2 または上位30まで）:');
patSorted.slice(0,30).forEach((p,i) => {
  console.log((i+1) + '. ' + p.strong.padEnd(7) + ' ' + String(p.count).padStart(3) + '件'
    + '  "' + p.from + '" → "' + p.to + '"'
    + (p.seg_sample !== p.to ? '  (seg: "' + p.seg_sample.slice(0,20) + '")' : ''));
  console.log('     ' + p.refs.join(', '));
});

// 章ごとの件数
const byChap = {};
unrevVocab.forEach(r => {
  const ch = r.ref.match(/ROM (\d+):/)?.[1];
  if (ch) byChap[ch] = (byChap[ch]||0)+1;
});
console.log('\nUNREVIEWED 変更候補 章ごと:');
for (let c=1; c<=16; c++) {
  if (byChap[c]) process.stdout.write('ROM' + c + ':' + (byChap[c]||0) + '  ');
}
console.log('\n合計:', Object.values(byChap).reduce((s,n)=>s+n,0));

// 表記差の内訳
console.log('\n表記差 内訳（上位10）:');
const orthoPairs = {};
cat_ortho.forEach(r => {
  const key = '"' + r.tok_ja + '" ↔ "' + r.seg_text.replace(/[。、\s]/g,'') + '"';
  orthoPairs[key] = (orthoPairs[key]||0)+1;
});
Object.entries(orthoPairs).sort((a,b)=>b[1]-a[1]).slice(0,10)
  .forEach(([k,n]) => console.log('  ' + String(n).padStart(3) + '  ' + k));

// ラベルとして妥当 状態別
const labelByState = {};
cat_label.forEach(r => { labelByState[r.inv_state] = (labelByState[r.inv_state]||0)+1; });
console.log('\nラベルとして妥当 状態別:', JSON.stringify(labelByState));

// ── 保存 ──────────────────────────────────────────────
const result = {
  meta: { phase: '4bh', date: new Date().toISOString().slice(0,10) },
  stats: {
    total_mapped: total,
    match: cat_match.length,
    ortho_only: cat_ortho.length,
    label_valid: cat_label.length,
    vocab_diff: cat_vocab.length,
  },
  vocab_diff_by_state: Object.fromEntries(
    STATES_ORDER.map(st => [st, (vocabByState[st]||[]).length]).filter(([,n])=>n>0)
  ),
  patterns_unreviewed: patSorted,
  ortho_pairs: Object.entries(orthoPairs).sort((a,b)=>b[1]-a[1]).slice(0,30).map(([k,n])=>({pair:k,count:n})),
  all_vocab_unreviewed: unrevVocab,
};
saveJson(path.join(OUT, 'stage4-phase4bh-rom-classify.json'), result);
console.log('\nWrote: stage4-phase4bh-rom-classify.json');
