'use strict';
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2), 'utf8'); }

// git show で origin/main からファイルを読む
function gitShow(gitPath) {
  try {
    const buf = execSync('git show origin/main:' + gitPath, { maxBuffer: 4 * 1024 * 1024 });
    return JSON.parse(buf.toString('utf8'));
  } catch (e) { return null; }
}

console.log('=== Phase 4bf — ローマ書 対応表照合 ===\n');

const ag = loadJson(AG_PATH);
const agMap = new Map(ag.tokens.map(t => [t.ref, t]));

// ROM bible_data を全章ロード
console.log('bible_data ロード中...');
const romTokens = {}; // verse_key → tokens[]
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
// 各節のトークンを位置順にソート
for (const key of Object.keys(romTokens)) {
  romTokens[key].sort((a, b) => a.pos - b.pos);
}

// 全ROM bible_data トークン数
const romAllToks = Object.values(romTokens).flat();
console.log('ROM bible_data トークン総数:', romAllToks.length);

// inventory での ROM トークン状態を確認
const romInvStates = {};
for (const t of ag.tokens.filter(t => t.ref.startsWith('ROM '))) {
  romInvStates[t.state] = (romInvStates[t.state] || 0) + 1;
}
console.log('ROM inventory 状態分布:', JSON.stringify(romInvStates));

// 対応表を章ごとに読む
const alignData = {}; // ch → parsed JSON
let alignAvailChapters = [];
for (let ch = 1; ch <= 16; ch++) {
  const d = gitShow('public/assets/data/alignment/JA1955/ROM/' + ch + '.json');
  if (d) { alignData[ch] = d; alignAvailChapters.push(ch); }
}
console.log('対応表読み込み済み章:', alignAvailChapters.join(', '));

// ── 照合ロジック ──────────────────────────────────────────
// 対応表: verses[v].segments[].{ t, tokens: [1-indexed position] }
// token.japanese ↔ segment.t の一致判定（Criterion B: 活用・敬語正規化後語彙一致）

// 正規化: 活用語尾・否定・敬語をはがして語幹を返す
function normalizeJa(s) {
  if (!s) return '';
  return s
    .replace(/〜する者$|〜するもの$|〜する$/, '') // テンプレート除去
    .replace(/いる|います|おります|おる|いた|いました|いてきた$/, 'いる') // 状態動詞
    .replace(/ています|ている|てきた|てきました$/, '')
    .replace(/します|しました|される|された|する$/, 'する')
    .replace(/ません|ない|なかった|ぬ|ず$/, '')
    .replace(/ました|ます$/, '')
    .replace(/〜[をにで]?$/, '')
    .replace(/[はがをにでもの]$/, '')
    .trim();
}

// 語彙一致判定（token.japanese vs alignment segment.t）
function isMatch(tokenJa, segText) {
  if (!tokenJa || !segText) return false;
  const nTok = normalizeJa(tokenJa);
  const nSeg = normalizeJa(segText);
  if (!nTok || !nSeg) return false;
  if (nTok === nSeg) return true;
  // 一方が他方を含む（複合語の一部）
  if (nSeg.includes(nTok) || nTok.includes(nSeg)) return true;
  return false;
}

const mismatches = [];
const matches = [];
const nullSegments = []; // segment.tokens === null
const unmapped = []; // token に対応する segment がない

let totalMapped = 0;

for (const [ch, aData] of Object.entries(alignData)) {
  for (const [v, vData] of Object.entries(aData.verses)) {
    const verseKey = ch + ':' + v;
    const verseToks = romTokens[verseKey] || [];
    if (!verseToks.length) continue;

    // segment の tokens は 1-indexed 位置
    const segByPos = {}; // pos → segment
    for (const seg of (vData.segments || [])) {
      if (!seg.tokens) {
        nullSegments.push({ ref: 'ROM ' + verseKey, segment_text: seg.t, note: seg.note || null });
        continue;
      }
      for (const pos of seg.tokens) {
        segByPos[pos] = seg;
      }
    }

    // 各トークンを対応表と照合
    for (const tok of verseToks) {
      const seg = segByPos[tok.pos];
      if (!seg) {
        // 対応表にマッピングなし
        const invTok = agMap.get(tok.ref);
        unmapped.push({ ref: tok.ref, japanese: tok.japanese, strong: tok.strong, state: invTok?.state || '未収録', note: '対応表セグメントなし' });
        continue;
      }

      totalMapped++;
      const matched = isMatch(tok.japanese, seg.t);
      const record = {
        ref: tok.ref,
        strong: tok.strong,
        morph: tok.morph,
        token_japanese: tok.japanese,
        segment_text: seg.t,
        segment_note: seg.note || null,
        inv_state: agMap.get(tok.ref)?.state || '未収録',
        normalized_tok: normalizeJa(tok.japanese),
        normalized_seg: normalizeJa(seg.t),
      };

      if (matched) {
        matches.push(record);
      } else {
        mismatches.push(record);
      }
    }
  }
}

console.log('\n=== 照合結果 ===');
console.log('対応表マッピングあり:', totalMapped, '件');
console.log('  一致:', matches.length, '件 (' + Math.round(matches.length/totalMapped*100) + '%)');
console.log('  不一致候補:', mismatches.length, '件 (' + Math.round(mismatches.length/totalMapped*100) + '%)');
console.log('対応なし (unmapped):', unmapped.length, '件');
console.log('null segment (日本語補足):', nullSegments.length, '件');

// 不一致を分類
// A. 変更が要りそうなもの: UNREVIEWED かつ 語彙が明らかに違う
// B. ラベルとして妥当: テンプレート、機能語、前置詞系
// C. 対応表が null
const templateRe = /^〜|^@|^\[/;
const funcWordRe = /^(私|わたし|あなた|これ|それ|あの|この|何|誰|〜する者|〜するもの|自分|彼|彼女|彼ら)$/;

const mmA = mismatches.filter(m =>
  (m.inv_state === 'UNREVIEWED' || m.inv_state === 'RETAIN_CONFIRMED') &&
  !templateRe.test(m.token_japanese) &&
  !funcWordRe.test(m.token_japanese) &&
  m.normalized_tok.length > 0 && m.normalized_seg.length > 0
);
const mmB = mismatches.filter(m =>
  templateRe.test(m.token_japanese) || funcWordRe.test(m.token_japanese)
);
const mmOther = mismatches.filter(m => !mmA.includes(m) && !mmB.includes(m));

console.log('\n不一致の分類:');
console.log('  A. 変更が要りそうなもの (UNREVIEWED/RC 内容語):', mmA.length, '件');
console.log('  B. ラベルとして妥当 (機能語・テンプレート):', mmB.length, '件');
console.log('  C. その他:', mmOther.length, '件');

// 状態別内訳
const mmByState = {};
mismatches.forEach(m => { mmByState[m.inv_state] = (mmByState[m.inv_state]||0)+1; });
console.log('  inventory 状態別:', JSON.stringify(mmByState));

// 代表例20件（A から優先、次に mmOther）
const repA = mmA.slice(0, 20);
const repFill = [...repA, ...mmOther.slice(0, Math.max(0, 20 - repA.length))];
const representatives = repFill.slice(0, 20);

console.log('\n代表例 (最大20件):');
representatives.forEach((m, i) => {
  console.log((i+1) + '. ' + m.ref + ' [' + m.inv_state.slice(0,8) + ']');
  console.log('   token.ja="' + m.token_japanese + '" → seg.t="' + m.segment_text + '"' + (m.segment_note ? ' (' + m.segment_note + ')' : ''));
});

// 不一致率サマリー（UNREVIEWED のみ）
const romUnrev = mismatches.filter(m => m.inv_state === 'UNREVIEWED');
const romUnrevTot = ag.tokens.filter(t => t.state === 'UNREVIEWED' && t.ref.startsWith('ROM ')).length;
console.log('\nUNREVIEWED ROM トークン:', romUnrevTot, '件');
console.log('そのうち不一致候補:', romUnrev.length, '件 (' + (romUnrevTot ? Math.round(romUnrev.length/romUnrevTot*100) : 0) + '%)');
console.log('  うち内容語 (A類):', mmA.filter(m=>m.inv_state==='UNREVIEWED').length, '件');

// 承認単位の見積もり（章ごと）
console.log('\n章ごとの不一致件数 (A類):');
const mmAByChap = {};
mmA.forEach(m => {
  const ch = m.ref.match(/ROM (\d+):/)?.[1];
  if (ch) mmAByChap[ch] = (mmAByChap[ch]||0)+1;
});
for (let ch = 1; ch <= 16; ch++) {
  if (mmAByChap[ch]) console.log('  ROM ' + ch + ': ' + mmAByChap[ch] + '件');
}

saveJson(path.join(OUT, 'stage4-phase4bf-rom-alignment.json'), {
  meta: { phase: '4bf', date: new Date().toISOString().slice(0,10), chapters_used: alignAvailChapters },
  stats: {
    total_mapped: totalMapped,
    matches: matches.length,
    mismatches: mismatches.length,
    unmapped: unmapped.length,
    null_segments: nullSegments.length,
    mismatch_rate_pct: Math.round(mismatches.length/totalMapped*100),
  },
  mismatch_by_class: { A_needs_change: mmA.length, B_label_valid: mmB.length, C_other: mmOther.length },
  mismatch_by_inv_state: mmByState,
  unreviewed_rom_total: romUnrevTot,
  unreviewed_mismatches: romUnrev.length,
  mismatch_a_per_chapter: mmAByChap,
  representatives,
  all_mismatches_A: mmA,
  all_mismatches_other: mmOther.slice(0, 100),
});
console.log('\nWrote: stage4-phase4bf-rom-alignment.json');
