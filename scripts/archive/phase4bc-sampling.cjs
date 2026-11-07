'use strict';
const fs = require('fs'), path = require('path');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const TRANS = path.join(BASE, 'public/translations/JA1955');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }

console.log('=== Phase 4bc — 機能語グループ サンプリング調査 ===\n');

const ag = loadJson(AG_PATH);
const unrev = ag.tokens.filter(t => t.state === 'UNREVIEWED');

// ── トークン・訳文ロード ──────────────────────────────────
const bibleCache = {}, transCache = {};
function getBibleTok(ref) {
  const m = ref.match(/^(\S+)\s+(\d+):(\d+)!/);
  const [, book, ch] = m;
  const fp = path.join(BIBLE, book, ch + '.json');
  if (!bibleCache[fp]) bibleCache[fp] = loadJson(fp);
  return bibleCache[fp].find(t => t.ref === ref);
}
function getJa1955(book, ch, v) {
  const fp = path.join(TRANS, book, ch + '.json');
  const key = book + '/' + ch;
  if (!transCache[key]) {
    if (!fs.existsSync(fp)) return null;
    transCache[key] = loadJson(fp);
  }
  return transCache[key].verses?.[String(v)] || null;
}

// ── 分類ロジック ─────────────────────────────────────────
function classify1stPerson(tok, verse1955) {
  if (!verse1955) return { cls: '不明', reason: 'JA1955なし' };
  // わたし/私/我 が節に明示されているか
  if (/わたし|わたしの|わたしを|私|われ|我/.test(verse1955))
    return { cls: '明示語あり', word: verse1955.match(/わたし[のをにで]?|私|われ|我[がをにで]?/)?.[0] };
  // なければ省略（日本語は主語・目的格代名詞を省略するのが一般的）
  return { cls: '省略', reason: '節中に1人称代名詞なし（日本語の省略）' };
}

function classifyReflexive(tok, verse1955, currentJa) {
  if (!verse1955) return { cls: '不明', reason: 'JA1955なし' };
  if (/自分|自ら|自身|みずから/.test(verse1955))
    return { cls: '明示語あり', word: verse1955.match(/自分[のをにたち]*|自ら|自身|みずから/)?.[0] };
  return { cls: '省略または文再構成', reason: '自分/自ら/自身なし — 節全体を要確認' };
}

function classifyRelative(tok, verse1955) {
  if (!verse1955) return { cls: '不明', reason: 'JA1955なし' };
  // 関係代名詞自体は日本語に対応語がない
  // 節が「〜する者」「〜したもの」「〜する人」等で保たれているか確認
  if (/者|もの|人|方|こと/.test(verse1955))
    return { cls: '省略（関係節維持）', reason: '関係節構造は維持（代名詞自体は日本語では不要）' };
  return { cls: '文再構成に吸収', reason: '関係節構造が消え文が再構成' };
}

// ── グループ定義 ─────────────────────────────────────────
const GROUPS = [
  { id: 'G3739', strongs: ['G3739'], label: '関係代名詞 ὅς/ἥ/ὅ', classifyFn: classifyRelative },
  { id: '1person', strongs: ['G3450','G1473','G3165'], label: '1人称セット μου/ἐγώ/με', classifyFn: classify1stPerson },
  { id: 'G848',  strongs: ['G848'],  label: '再帰代名詞 αὑτός（3人称）', classifyFn: classifyReflexive },
  { id: 'G1438', strongs: ['G1438'], label: '再帰代名詞 ἑαυτός', classifyFn: classifyReflexive },
];

const results = {};

for (const grp of GROUPS) {
  const pool = unrev.filter(t => grp.strongs.includes(t.strong));
  console.log(grp.id + ': pool=' + pool.length + '件');

  // 書ごとにまとめて書をまたぐサンプルを取る
  const byBook = {};
  pool.forEach(t => {
    const book = t.ref.match(/^(\S+)/)[1];
    if (!byBook[book]) byBook[book] = [];
    byBook[book].push(t);
  });
  const books = Object.keys(byBook).sort();

  // 各書から evenly distributed に選ぶ（合計25件）
  const samples = [];
  const target = 25;
  // ラウンドロビンで書を巡回しながら選択
  const bookIters = books.map(b => ({ book: b, tokens: byBook[b], step: Math.max(1, Math.floor(byBook[b].length / 3)), idx: 0 }));
  let round = 0;
  while (samples.length < target) {
    const bi = bookIters[round % bookIters.length];
    // 各書から1〜3件取る（書の数が少ない場合は複数回）
    if (bi.idx < bi.tokens.length) {
      samples.push(bi.tokens[bi.idx]);
      bi.idx += bi.step;
    }
    round++;
    if (round > target * bookIters.length * 2) break; // safety
  }
  // 25件に調整（多ければ切る、少なければ pool から補充）
  const usedRefs = new Set(samples.map(t => t.ref));
  if (samples.length < target) {
    for (const t of pool) {
      if (samples.length >= target) break;
      if (!usedRefs.has(t.ref)) { samples.push(t); usedRefs.add(t.ref); }
    }
  }
  const finalSamples = samples.slice(0, target);
  console.log('  selected: ' + finalSamples.length + '件, books: ' + [...new Set(finalSamples.map(t=>t.ref.match(/^(\S+)/)[1]))].join('/'));

  // 各サンプルの詳細を取得
  const analyzed = [];
  for (const inv of finalSamples) {
    const ref = inv.ref;
    const m = ref.match(/^(\S+)\s+(\d+):(\d+)!/);
    const [, book, ch, v] = m;
    const tok = getBibleTok(ref);
    const verse = getJa1955(book, ch, v);
    if (!tok) { console.error('  SKIP: bible_data not found: ' + ref); continue; }

    const cls = grp.classifyFn(tok, verse, tok.japanese);

    analyzed.push({
      ref,
      greek_form: tok.text,
      morph: tok.morph,
      cur_japanese: tok.japanese,
      ja1955_verse: verse ? verse.slice(0, 100) : null,
      classification: cls.cls,
      detail: cls.word || cls.reason || null
    });
  }

  // 集計
  const counts = {};
  analyzed.forEach(a => { counts[a.classification] = (counts[a.classification]||0)+1; });

  results[grp.id] = { label: grp.label, pool_size: pool.length, sample_count: analyzed.length, counts, samples: analyzed };
}

// ── ROM 1-7 対応表チェック ────────────────────────────────
const alignDir = path.join(BASE, 'public/assets/data/alignment/JA1955');
const alignExists = fs.existsSync(alignDir);
console.log('\n対応表ディレクトリ:', alignExists ? '存在する' : '存在しない（未作成）');

// ROM 1-7 サンプルがあるか確認
for (const grp of GROUPS) {
  const romSamples = results[grp.id].samples.filter(s => /^ROM [1-7]:/.test(s.ref));
  if (romSamples.length) {
    console.log(grp.id + ': ROM 1-7 サンプル ' + romSamples.length + '件 → 対応表なし（ディレクトリ未作成）');
  }
}

// ── 出力 ─────────────────────────────────────────────────
saveJson(path.join(OUT, 'stage4-phase4bc-sampling-results.json'), {
  meta: { phase: '4bc-sampling', date: new Date().toISOString().slice(0,10), alignment_table_available: alignExists },
  groups: results
});
console.log('\nWrote: stage4-phase4bc-sampling-results.json');

// サマリー表示
console.log('\n=== サンプリング結果サマリー ===');
for (const [gid, g] of Object.entries(results)) {
  console.log('\n【' + g.label + '】pool=' + g.pool_size + '件, sample=' + g.sample_count + '件');
  Object.entries(g.counts).forEach(([cls, n]) => {
    const pct = Math.round(n / g.sample_count * 100);
    console.log('  ' + cls + ': ' + n + '件 (' + pct + '%)');
  });
  // 代表サンプル（書ごとに1件）
  const shown = new Set();
  g.samples.slice(0,5).forEach(s => {
    const book = s.ref.match(/^(\S+)/)[1];
    if (!shown.has(book)) {
      shown.add(book);
      console.log('  例: ' + s.ref + ' ' + s.greek_form + ' (' + s.cur_japanese + ') → ' + s.classification);
      if (s.ja1955_verse) console.log('       JA1955: 「' + s.ja1955_verse.slice(0,60) + '...」');
    }
  });
}
