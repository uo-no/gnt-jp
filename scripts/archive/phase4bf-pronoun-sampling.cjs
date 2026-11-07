'use strict';
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const TRANS = path.join(BASE, 'public/translations/JA1955');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2), 'utf8'); }

console.log('=== Phase 4bf — 代名詞残り・指示詞・疑問詞 サンプリング ===\n');

const ag = loadJson(AG_PATH);
const unrev = ag.tokens.filter(t => t.state === 'UNREVIEWED');

// bible_data キャッシュ
const bCache = {};
function getBibleTok(ref) {
  const m = ref.match(/^(\S+)\s+(\d+):(\d+)!/);
  const [, book, ch] = m;
  const fp = path.join(BIBLE, book, ch + '.json');
  if (!bCache[fp]) bCache[fp] = loadJson(fp);
  return bCache[fp].find(t => t.ref === ref);
}

// JA1955 キャッシュ
const tCache = {};
function getJa1955(book, ch, v) {
  const key = book + '/' + ch;
  if (!tCache[key]) {
    const fp = path.join(TRANS, book, ch + '.json');
    if (!fs.existsSync(fp)) return null;
    tCache[key] = loadJson(fp);
  }
  return tCache[key].verses?.[String(v)] || null;
}

// サンプル抽出（書をまたいで均等に）
function pickSamples(pool, n) {
  const byBook = {};
  pool.forEach(t => {
    const book = t.ref.match(/^(\S+)/)[1];
    if (!byBook[book]) byBook[book] = [];
    byBook[book].push(t);
  });
  const books = Object.keys(byBook).sort();
  if (pool.length <= n) return pool;
  const samples = [];
  const used = new Set();
  const iters = books.map(b => ({ tokens: byBook[b], step: Math.max(1, Math.floor(byBook[b].length / 3)), idx: 0 }));
  let r = 0;
  while (samples.length < n) {
    const bi = iters[r % iters.length];
    if (bi.idx < bi.tokens.length) {
      const t = bi.tokens[bi.idx];
      if (!used.has(t.ref)) { samples.push(t); used.add(t.ref); }
      bi.idx += bi.step;
    }
    r++;
    if (r > n * iters.length * 3) break;
  }
  if (samples.length < n) {
    for (const t of pool) {
      if (samples.length >= n) break;
      if (!used.has(t.ref)) { samples.push(t); used.add(t.ref); }
    }
  }
  return samples.slice(0, n);
}

// ── 分類ロジック ──────────────────────────────────────────
function classify(tok, verse, groupHints) {
  if (!verse) return { cls: '不明', reason: 'JA1955なし' };
  for (const { pat, label } of groupHints) {
    if (pat.test(verse)) return { cls: '明示語あり', word: verse.match(pat)?.[0] };
  }
  return { cls: '省略または省略/再構成', reason: 'ヒントパターンなし' };
}

// カテゴリ矛盾チェック
function checkContradiction(curJa, morphPrefix, groupId) {
  // 語彙カテゴリのマッピング
  const expected = {
    'P-1': /^(私|わたし|私たち|わたしたち|われわれ|我々|われら)$/, // 1人称
    'P-2': /^(あなた|あなたがた|汝|なんじ|御前|おまえ)$/,
    'D':   /^(これ|それ|あれ|この|その|あの|こちら|そちら|あちら|こう|そう|ああ|〜する者|〜するもの|彼の|あの人|その人|この人)$/,
    'I':   /^(誰|だれ|何|なに|どれ|どちら|どこ|いつ|いかに|何の)$/,
    'K':   /^(〜するほどの|〜のものはすべて|どれほど|〜する限りの|〜する者はだれでも)$/,
    'R':   /^(〜する者|〜するもの|〜という者|者|もの)$/,
  };
  for (const [prefix, pat] of Object.entries(expected)) {
    if (groupId.includes(prefix) || morphPrefix === prefix[0]) {
      if (!pat.test(curJa)) return { contradiction: true, expected: prefix, got: curJa };
    }
  }
  return { contradiction: false };
}

// ── グループ定義 ──────────────────────────────────────────
const GROUPS = [
  {
    id: 'P1-plural', label: '1人称複数（ἡμεῖς系）',
    strongs: ['G2257','G2248','G2254','G2249'],
    hints: [
      { pat: /わたしたち|私たち|われわれ|我々|われら/, label: '1人称複数' }
    ],
    morphPrefix: 'P-1'
  },
  {
    id: 'P1-other', label: '1人称単数その他（μοί/ἐμοί/ἐμέ/κἀγώ）',
    strongs: ['G3427','G1698','G1691','G2504'],
    hints: [
      { pat: /わたし[はをにでがも]?|私[はをにでがも]?|われ|我[がをにでも]?/, label: '1人称' }
    ],
    morphPrefix: 'P-1'
  },
  {
    id: 'P2', label: '2人称（σοί G4671 + 所有系）',
    strongs: ['G4671'],
    hints: [
      { pat: /あなた[にをはのが]?|汝[にをはの]?|なんじ|おまえ/, label: '2人称' }
    ],
    morphPrefix: 'P-2'
  },
  {
    id: 'mutual', label: '相互代名詞 ἀλλήλων（G240）',
    strongs: ['G240'],
    hints: [
      { pat: /互[いに]|たがいに|お互|一方/, label: '相互' }
    ],
    morphPrefix: 'C'
  },
  {
    id: 'indef', label: '不定代名詞 τις（G5100）',
    strongs: ['G5100'],
    hints: [
      { pat: /ある|一人|何らか|何か|誰か|あるも|何人/, label: '不定' }
    ],
    morphPrefix: 'X'
  },
  {
    id: 'D-top', label: '指示詞 οὗτος/ἐκεῖνος/τοῦτο（D-上位4）',
    strongs: ['G5124','G1565','G3778','G5023'],
    hints: [
      { pat: /これ|この|こちら|こう|こんな|ここ/, label: '近称' },
      { pat: /それ|その|そちら|そう|そんな|そこ/, label: '中称' },
      { pat: /あれ|あの|あちら|あそこ/, label: '遠称' },
    ],
    morphPrefix: 'D'
  },
  {
    id: 'I-top', label: '疑問詞 τίς/ποῖος（I-）',
    strongs: ['G5101','G4169'],
    hints: [
      { pat: /誰|だれ|何[人物の事]?|どれ|どちら|いつ|どこ|何の/, label: '疑問' },
    ],
    morphPrefix: 'I'
  },
  {
    id: 'KR', label: '相関・関係詞 ὅσος/ὅστις（K-/R-）',
    strongs: ['G3745','G3748','G3634','G3755'],
    hints: [
      { pat: /者|もの|人|方|こと|限り|〜する/, label: '節維持' },
    ],
    morphPrefix: 'K'
  },
];

// 所有形容詞（S-）の確認
{
  const sGroup = unrev.filter(t => {
    // morph を確認（G1699 = ἐμός my, S-NSN）
    const tok = getBibleTok(t.ref);
    return tok && tok.morph && tok.morph[0] === 'S';
  });
  // S- があれば追加
  const sByStrong = {};
  sGroup.forEach(t => { sByStrong[t.strong] = (sByStrong[t.strong]||0)+1; });
  if (Object.keys(sByStrong).length > 0) {
    console.log('所有形容詞（S-）発見:', JSON.stringify(sByStrong));
    GROUPS.push({
      id: 'S-poss', label: '所有形容詞（ἐμός/σός/ἡμέτερος系）',
      strongs: Object.keys(sByStrong),
      hints: [
        { pat: /わたしの|私の|あなたの|私たちの|あなたがたの|自分の|彼の|彼女の/, label: '所有' }
      ],
      morphPrefix: 'S'
    });
  } else {
    console.log('所有形容詞（S-）: 0件（UNREVIEWED なし）');
  }
}

// ── 各グループ処理 ────────────────────────────────────────
const results = {};

for (const grp of GROUPS) {
  const pool = unrev.filter(t => grp.strongs.includes(t.strong));
  if (pool.length === 0) {
    console.log(grp.id + ': pool=0件（スキップ）');
    continue;
  }

  const samples = pickSamples(pool, 25);
  const analyzed = [];
  const jaDist = {}; // current japanese の分布

  for (const inv of samples) {
    const ref = inv.ref;
    const m = ref.match(/^(\S+)\s+(\d+):(\d+)!/);
    const [, book, ch, v] = m;
    const tok = getBibleTok(ref);
    if (!tok) continue;
    const verse = getJa1955(book, ch, v);
    const cls = classify(tok, verse, grp.hints);
    const contradiction = checkContradiction(tok.japanese, grp.morphPrefix, grp.id);

    jaDist[tok.japanese] = (jaDist[tok.japanese] || 0) + 1;
    analyzed.push({
      ref, strong: inv.strong, text: tok.text, morph: tok.morph,
      cur_japanese: tok.japanese,
      ja1955_verse: verse ? verse.slice(0, 80) : null,
      classification: cls.cls,
      detail: cls.word || cls.reason || null,
      category_contradiction: contradiction.contradiction,
      contradiction_detail: contradiction.contradiction ? contradiction : null,
    });
  }

  const counts = {};
  analyzed.forEach(a => { counts[a.classification] = (counts[a.classification]||0)+1; });
  const contradictions = analyzed.filter(a => a.category_contradiction);

  // 現在の japanese 一覧（bible_data から全件）
  const allJa = {};
  for (const inv of pool.slice(0, 200)) {
    const tok = getBibleTok(inv.ref);
    if (tok) allJa[tok.japanese] = (allJa[tok.japanese]||0)+1;
  }

  results[grp.id] = {
    label: grp.label,
    pool_size: pool.length,
    sample_count: analyzed.length,
    ja_distribution_sample: jaDist,
    classifications: counts,
    contradiction_count: contradictions.length,
    contradictions: contradictions.map(a => ({ ref: a.ref, morph: a.morph, cur_ja: a.cur_japanese, detail: a.contradiction_detail })),
    samples: analyzed,
  };

  const pct = k => Math.round((counts[k]||0)/analyzed.length*100);
  console.log('\n【' + grp.label + '】pool=' + pool.length + '件 sample=' + analyzed.length + '件');
  console.log('  current japanese:', JSON.stringify(jaDist));
  console.log('  明示語あり:', (counts['明示語あり']||0) + '件 (' + pct('明示語あり') + '%)');
  console.log('  省略/再構成:', (counts['省略または省略/再構成']||0) + '件 (' + pct('省略または省略/再構成') + '%)');
  console.log('  カテゴリ矛盾:', contradictions.length + '件');
  if (contradictions.length > 0) {
    contradictions.slice(0,3).forEach(c => console.log('    矛盾: ' + c.ref + ' morph=' + c.morph + ' ja="' + c.cur_japanese + '"'));
  }
  // 代表例3件
  analyzed.slice(0,3).forEach(a => {
    console.log('  例: ' + a.ref + ' ' + a.text + '(' + a.cur_japanese + ') → ' + a.classification + (a.detail ? ' [' + a.detail + ']' : ''));
    if (a.ja1955_verse) console.log('       JA1955:「' + a.ja1955_verse.slice(0,60) + '...」');
  });
}

// ── 方針案 ─────────────────────────────────────────────────
console.log('\n=== 方針案サマリー ===');
for (const [id, r] of Object.entries(results)) {
  const hasContradiction = r.contradiction_count > 0;
  const meiji_rate = Math.round((r.classifications['明示語あり']||0)/r.sample_count*100);
  const policy = hasContradiction ? 'HOLD 候補（矛盾あり）' :
    r.sample_count === 0 ? 'スキップ' :
    'RETAIN 一括推奨';
  console.log(id.padEnd(12) + ' pool=' + String(r.pool_size).padStart(5) + '件  明示' + String(meiji_rate).padStart(3) + '%  矛盾' + r.contradiction_count + '件  → ' + policy);
}

saveJson(path.join(OUT, 'stage4-phase4bf-pronoun-sampling.json'), {
  meta: { phase: '4bf', date: new Date().toISOString().slice(0,10) },
  results
});
console.log('\nWrote: stage4-phase4bf-pronoun-sampling.json');
