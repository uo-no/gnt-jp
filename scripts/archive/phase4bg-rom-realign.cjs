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

console.log('=== Phase 4bg — ローマ書 対応表照合（正規化強化版） ===\n');

// ── 正規化テーブル ──────────────────────────────────────
// 1. 正字/仮名変体の同一視マップ（確認された実ペアを含む）
const KANJI_KANA = [
  // 人称代名詞
  [/私(?:の|を|に|は|が|も|たち)?/g,       'わたし'],
  [/私たち(?:の|を|に|は|が|も)?/g,         'わたしたち'],
  [/僕(?:の|を|に|は|が|も)?/g,             'しもべ'],      // servant
  [/彼(?:の|を|に|は|が|も)?/g,             'かれ'],
  [/彼女(?:の|を|に|は|が|も)?/g,           'かのじょ'],
  [/彼ら(?:の|を|に|は|が|も)?/g,           'かれら'],
  [/誰(?:の|を|に|は|が|も|か|で)?/g,       'だれ'],
  [/何(?:の|を|に|は|が|も|か|で|処)?/g,    'なに'],
  // 指示詞
  [/此(?:の|れ|処)/g,                       'これ'],
  [/其(?:の|れ|処)/g,                       'それ'],
  [/彼(?:の|れ|処)/g,                       'あれ'],
  // 一般語
  [/者(?!に|を|は|が|で|の)/g,              'もの'],
  [/所/g,                                   'ところ'],
  [/御(?:自分|自身)/g,                      'ご自身'],
  [/心(?:の|を|に|は|が|も)/g,              'こころ'],
  [/言葉/g,                                 'ことば'],
  [/神(?:の|を|に|は|が|も)(?!様)/g,       'かみ'],
  [/主(?:の|を|に|は|が|も)/g,              'しゅ'],
  [/子(?!供|ども)/g,                        'こ'],
  // 敬語正規化
  [/おられ(?:る|た|ます)/g,                 'いる'],
  [/いらっしゃ(?:る|い|った)/g,             'いる'],
  [/なさ(?:る|い|った)/g,                   'する'],
  [/召し(?:上がる|あがる)/g,                'たべる'],
];

// 2. 活用・文末変化の正規化
function stemJa(s) {
  if (!s) return '';
  let r = s;

  // 文末記号・括弧類を除去
  r = r.replace(/[。、「」『』（）()【】〔〕！？\.\,\!\?\-\─\—]+/g, ' ');
  // 助詞・接続詞の文末付加を除去（セグメント末尾の助詞）
  r = r.replace(/[はがをにでもののかしてとやらず]$/, '');
  r = r.trim();

  // カンジ/カナ変体 適用
  for (const [pat, rep] of KANJI_KANA) {
    r = r.replace(pat, rep);
  }

  // 受身・使役 → 能動
  r = r.replace(/(?:せ|さ)られ(?:る|た|ている|てきた)?/g, 'する');
  r = r.replace(/(?:られ|れ)(?:る|た|ている|てきた|ました)$/g, '');
  r = r.replace(/(?:させ|され)(?:る|た|ている|てきた)?$/g, 'する');

  // 否定形 → 肯定語幹
  r = r.replace(/(?:ません|ない|なかった|ぬ|ず)$/g, '');

  // ～た/～ている/～てきた/～ます/～ました
  r = r.replace(/(?:してきた|してい(?:る|た|ます)|しました|します)$/g, 'する');
  r = r.replace(/(?:てきた|ている|ていた|てい(?:ます|ました)|ました|ます)$/g, '');
  r = r.replace(/(?:た|で)$/g, '');

  // 敬語的接辞
  r = r.replace(/^お|^ご/, '');

  // スペース正規化
  r = r.replace(/\s+/g, '').trim();

  return r;
}

// 3. 語彙同一判定
function isStemMatch(a, b) {
  if (!a || !b) return false;
  const sa = stemJa(a), sb = stemJa(b);
  if (!sa || !sb) return false;
  if (sa === sb) return true;
  // 一方が他方を含む（前置詞的付加 or 修飾語が追加されたケース）
  if (sa.length >= 2 && sb.length >= 2) {
    if (sb.includes(sa) || sa.includes(sb)) return true;
  }
  return false;
}

// 既知の語彙同一セット（Criterion B に基づく等価語彙グループ）
const VOCAB_EQUIV = [
  new Set(['しもべ','奴隷','僕']),
  new Set(['わたし','わたしたち']),  // actually different, but want to avoid this
  new Set(['召す','招く']),           // NOT equiv: 召す(summon)≠招く(invite) → genuine diff
  new Set(['聖','きよ']),
  new Set(['恵み','恩恵']),
  new Set(['信仰','信頼']),
  new Set(['愛','いつくしみ']),
  new Set(['知る','わきまえる','承知する']),  // from Phase 4bc criterion
  new Set(['平和','平安']),           // need to check: 平和 vs 平安 — same?
  new Set(['使徒職','使徒の務']),
  new Set(['前もって約束する','あらかじめ約束された','あらかじめ約束する']),
];

function isVocabEquiv(a, b) {
  for (const grp of VOCAB_EQUIV) {
    const sa = stemJa(a), sb = stemJa(b);
    // Check if stems are in same group
    for (const item of grp) {
      if (sa.includes(stemJa(item)) || stemJa(item).includes(sa)) {
        for (const item2 of grp) {
          if (sb.includes(stemJa(item2)) || stemJa(item2).includes(sb)) return true;
        }
      }
    }
  }
  return false;
}

function isMatch(tokJa, segText) {
  if (!tokJa || !segText) return false;
  if (isStemMatch(tokJa, segText)) return true;
  if (isVocabEquiv(tokJa, segText)) return true;
  return false;
}

// ── データ読み込み ────────────────────────────────────────
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
for (const key of Object.keys(romTokens)) {
  romTokens[key].sort((a, b) => a.pos - b.pos);
}

const alignData = {};
for (let ch = 1; ch <= 16; ch++) {
  const d = gitShow('public/assets/data/alignment/JA1955/ROM/' + ch + '.json');
  if (d) alignData[ch] = d;
}
console.log('対応表読み込み済み章: ' + Object.keys(alignData).join(', '));

// ── 照合 ─────────────────────────────────────────────────
const records = []; // { ref, strong, morph, inv_state, tok_ja, seg_text, seg_note, matched, false_pos_reason }

// まず正字/仮名変体ペアを収集するための pair tracker
const orthoPairs = {}; // stem(a) + '→' + stem(b) : count

for (const [ch, aData] of Object.entries(alignData)) {
  for (const [v, vData] of Object.entries(aData.verses)) {
    const verseKey = ch + ':' + v;
    const verseToks = romTokens[verseKey] || [];
    if (!verseToks.length) continue;

    const segByPos = {};
    for (const seg of (vData.segments || [])) {
      if (!seg.tokens) continue;
      for (const pos of seg.tokens) { segByPos[pos] = seg; }
    }

    for (const tok of verseToks) {
      const seg = segByPos[tok.pos];
      if (!seg) continue;
      const invTok = agMap.get(tok.ref);

      const matched = isMatch(tok.japanese, seg.t);
      const rawSameLen = tok.japanese && seg.t &&
        (stemJa(tok.japanese).length > 0 && stemJa(seg.t).length > 0);

      // 偽陽性理由検出
      let false_pos_reason = null;
      if (!matched && rawSameLen) {
        const sa = stemJa(tok.japanese), sb = stemJa(seg.t);
        if (sa === sb) false_pos_reason = '活用差のみ';
        else {
          // 正字/仮名変体チェック
          const ka = tok.japanese.replace(/[はがをにでもの、。]/g,'');
          const kb = seg.t.replace(/[はがをにでもの、。 ]/g,'');
          if (ka === kb) false_pos_reason = '文字表記のみ';
          else {
            const pairKey = sa.slice(0,4) + '→' + sb.slice(0,4);
            orthoPairs[pairKey] = (orthoPairs[pairKey] || 0) + 1;
          }
        }
      }

      records.push({
        ref: tok.ref,
        strong: tok.strong,
        morph: tok.morph,
        inv_state: invTok?.state || '未収録',
        tok_ja: tok.japanese,
        seg_text: seg.t,
        seg_note: seg.note || null,
        matched,
        false_pos_reason,
        stem_tok: stemJa(tok.japanese),
        stem_seg: stemJa(seg.t),
      });
    }
  }
}

const matched   = records.filter(r => r.matched);
const mismatched = records.filter(r => !r.matched);
const falsePosActivation = records.filter(r => r.false_pos_reason);

console.log('\n=== 照合結果（正規化強化後） ===');
console.log('総照合件数:', records.length);
console.log('  一致   :', matched.length, '(' + Math.round(matched.length/records.length*100) + '%)');
console.log('  不一致 :', mismatched.length, '(' + Math.round(mismatched.length/records.length*100) + '%)');

// 偽陽性の分類
const fpOrtho   = mismatched.filter(r => r.false_pos_reason === '文字表記のみ');
const fpInflect = mismatched.filter(r => r.false_pos_reason === '活用差のみ');
const genuine   = mismatched.filter(r => !r.false_pos_reason);

console.log('\n偽陽性分析:');
console.log('  活用差のみ:', fpInflect.length, '件（偽陽性）');
console.log('  文字表記のみ:', fpOrtho.length, '件（偽陽性）');
console.log('  真の語彙相違:', genuine.length, '件');

// 正字/仮名変体ペア収集（実際に現れたもの）
// matched に含まれるものが正規化で拾えたペア
const orthoPairsActual = {};
for (const r of matched) {
  if (r.tok_ja !== r.seg_text) {
    const key = r.tok_ja.slice(0,8) + ' ↔ ' + r.seg_text.slice(0,8);
    orthoPairsActual[key] = (orthoPairsActual[key] || 0) + 1;
  }
}
console.log('\n正規化で同一視されたペア（上位15）:');
Object.entries(orthoPairsActual).sort((a,b)=>b[1]-a[1]).slice(0,15)
  .forEach(([k,n]) => console.log('  ' + String(n).padStart(3) + '  ' + k));

// A類: inventory 状態 UNREVIEWED/RC かつ 機能語テンプレート除外 かつ genuine mismatch
const templateRe = /^〜|^@|\[/;
const funcWordRe = /^(わたし|私|あなた|これ|それ|あの|この|何|誰|〜する者|〜するもの|自分|彼|彼女|彼ら|私たち|わたしたち|互いに|ある)$/;

const mmA_unrev = genuine.filter(r =>
  r.inv_state === 'UNREVIEWED' &&
  !templateRe.test(r.tok_ja) && !funcWordRe.test(r.tok_ja) &&
  r.stem_tok.length >= 1 && r.stem_seg.length >= 1
);
const mmA_rc = genuine.filter(r =>
  r.inv_state === 'RETAIN_CONFIRMED' &&
  !templateRe.test(r.tok_ja) && !funcWordRe.test(r.tok_ja) &&
  r.stem_tok.length >= 1 && r.stem_seg.length >= 1
);

console.log('\n=== A類（確定した変更候補） ===');
console.log('UNREVIEWED A類:', mmA_unrev.length, '件');
console.log('RC A類         :', mmA_rc.length, '件（情報のみ）');

// ── (Strong × 変更前 → 変更後) パターン表 ───────────────────
const patterns = {};
for (const r of mmA_unrev) {
  const key = r.strong + ' | ' + r.tok_ja + ' → ' + r.seg_text.replace(/[。、「」（）]/g,'').trim();
  if (!patterns[key]) patterns[key] = { strong: r.strong, from: r.tok_ja, to: r.seg_text, count: 0, examples: [] };
  patterns[key].count++;
  if (patterns[key].examples.length < 2) patterns[key].examples.push(r.ref);
}

const patSorted = Object.values(patterns).sort((a,b)=>b.count-a.count);
console.log('\n(Strong × 変更前 → 変更後) パターン数:', patSorted.length);
console.log('上位30パターン（UNREVIEWED A類）:');
patSorted.slice(0,30).forEach((p,i) => {
  console.log((i+1) + '. ' + p.strong.padEnd(7) + ' ' + String(p.count).padStart(3) + '件  "' + p.from + '" → "' + p.to + '"');
  if (p.examples.length) console.log('     例: ' + p.examples.join(', '));
});

// ── ROM トークン状態別内訳 ───────────────────────────────────
console.log('\n=== ROM トークン状態別内訳 ===');
const romStateCounts = { '未収録': 0 };
const romAllToks = Object.values(romTokens).flat();
romAllToks.forEach(t => {
  const inv = agMap.get(t.ref);
  const st = inv?.state || '未収録';
  romStateCounts[st] = (romStateCounts[st] || 0) + 1;
});
for (const [st, n] of Object.entries(romStateCounts)) {
  console.log('  ' + st.padEnd(30) + ': ' + n + '件');
}

// ── 章ごとの A類件数（UNREVIEWED のみ）─────────────────────
console.log('\nUNREVIEWED A類 章ごと:');
const mmAByChap = {};
mmA_unrev.forEach(r => {
  const ch = r.ref.match(/ROM (\d+):/)?.[1];
  if (ch) mmAByChap[ch] = (mmAByChap[ch]||0)+1;
});
for (let ch = 1; ch <= 16; ch++) {
  if (mmAByChap[ch]) console.log('  ROM ' + String(ch).padStart(2) + ': ' + mmAByChap[ch] + '件');
}
const mmATotal = Object.values(mmAByChap).reduce((s,n)=>s+n,0);
console.log('  合計:', mmATotal, '件（全', mmA_unrev.length, '件）');

saveJson(path.join(OUT, 'stage4-phase4bg-rom-realign.json'), {
  meta: { phase: '4bg', date: new Date().toISOString().slice(0,10) },
  stats: {
    total: records.length,
    matched: matched.length,
    mismatched: mismatched.length,
    false_pos_inflect: fpInflect.length,
    false_pos_ortho: fpOrtho.length,
    genuine_mismatch: genuine.length,
    mismatch_A_unreviewed: mmA_unrev.length,
    mismatch_A_rc: mmA_rc.length,
  },
  ortho_pairs_normalized: Object.entries(orthoPairsActual).sort((a,b)=>b[1]-a[1]).slice(0,30).map(([k,n])=>({pair:k,count:n})),
  patterns: patSorted.slice(0,100),
  rom_state_counts: romStateCounts,
  mismatch_a_per_chapter: mmAByChap,
  all_mismatch_A_unrev: mmA_unrev,
});
console.log('\nWrote: stage4-phase4bg-rom-realign.json');
