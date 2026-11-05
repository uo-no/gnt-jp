'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { execSync } = require('child_process');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const CLASSIFY_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4bh-rom-classify.json');
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2), 'utf8'); }
function sha256file(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function gitShow(gp) {
  try { return JSON.parse(execSync('git show origin/main:' + gp, { maxBuffer: 4*1024*1024 }).toString()); }
  catch(e) { return null; }
}

console.log('=== Phase 4bi-v2 — ローマ書 CAND_OK 再実施（シングルトークンセグメント限定）===\n');

// ═══════════════════════════════════════════════════════
// 除外・TABLE（Phase 4bi と同一）
// ═══════════════════════════════════════════════════════
const EXCL_STRONGS = new Set(['G2046', 'G4238', 'G264', 'G3107']);

const TABLE = new Map([
  // ★ TABLE_OVERRIDESは Phase4bi で適用済み（今回は CAND_OK のみ対象）
  // TABLE 再チェック用に保持
  ['G782\t挨拶する',     'よろしく'],
  ['G1344\t義と認める',  '義とする'],
  ['G2556\t悪い',        '悪'],
  ['G2937\t創造物',      '被造物'],
  ['G18\t良い',          '善'],
  ['G4459\tどのように',  'どうして'],
  ['G435\t男',           '夫'],
  ['G3123\tむしろ',      'まして'],
  ['G1680\t希望',        '望み'],
  ['G2347\t苦難',        '患難'],
  ['G2089\tまだ',        'なおも'],
  ['G3049\t考える',      '認める'],
  ['G1659\t自由にする',  '解放する'],
  ['G2822\t招かれた',    '召す'],
  ['G4991\t救い',        '救'],
  ['G1342\t義の',        '義人'],
  ['G763\t不敬虔',       '不信心'],
  ['G379\t言い訳できない', '弁解の余地がない'],
  ['G165\t世',           '永遠'],
  ['G5540\t使用',        '関係'],
  ['G3441\tひとり',      'ばかりでなく'],
  ['G2917\t裁き',        'さばき'],
  ['G1391\t栄光',        '光栄'],
  ['G5092\t敬意',        'ほまれ'],
  ['G4412\t第一の',      'はじめ'],
]);

// ═══════════════════════════════════════════════════════
// 対応表ロード → シングルトークンセグメントを特定
// ═══════════════════════════════════════════════════════
console.log('対応表ロード中...');
const alignData = {};
for (let ch = 1; ch <= 16; ch++) {
  const d = gitShow('public/assets/data/alignment/JA1955/ROM/' + ch + '.json');
  if (d) alignData[ch] = d;
}

// ref → segment token 数 (1 なら シングルトークン)
const segTokenCount = new Map(); // ref → seg.tokens.length

for (const [ch, aData] of Object.entries(alignData)) {
  for (const [v, vData] of Object.entries(aData.verses)) {
    for (const seg of (vData.segments || [])) {
      if (!seg.tokens || seg.tokens.length === 0) continue;
      for (const pos of seg.tokens) {
        const ref = 'ROM ' + ch + ':' + v + '!' + pos;
        // segTokenCount: 最初に登録されたセグメントのtokens長を使う
        // 複数セグメントが同ref に該当することはないはずなので上書きでOK
        segTokenCount.set(ref, seg.tokens.length);
      }
    }
  }
}

const singleCount = [...segTokenCount.values()].filter(n=>n===1).length;
const multiCount  = [...segTokenCount.values()].filter(n=>n>1).length;
console.log('対応表マッピング済み:', segTokenCount.size, '件');
console.log('  シングルトークンセグメント:', singleCount, '件');
console.log('  マルチトークンセグメント   :', multiCount,  '件');

// ═══════════════════════════════════════════════════════
// グロス形生成（シングルトークン専用）
// ═══════════════════════════════════════════════════════
// 旧仮名変換
const ORTHO_TABLE = [
  [/シヤ/g, 'シャ'],[/チヤ/g,'チャ'],[/ジヤ/g,'ジャ'],[/ヅ/g,'ズ'],[/ヱ/g,'ウェ'],
  [/さいわい/g,'幸い'],[/私たち/g,'わたしたち'],[/私(?!たち)/g,'わたし'],
];
function applyOrtho(s) { for(const [p,r] of ORTHO_TABLE) s=s.replace(p,r); return s; }

function deriveGloss(segText) {
  // 1. 句読点・括弧 除去
  let s = segText.replace(/[。、！？「」（）【】　\s・]/g, '').trim();
  s = applyOrtho(s);
  if (!s) return null;

  // 2. 末尾の助詞/接続詞/格助詞を1回剥ぐ
  s = s.replace(/[はがをにでもへとよりのから]$/, '').trim();
  if (!s) return null;

  // 3. 受身形 → 能動辞書形
  s = s.replace(/(?:させ|され|られ)(?:た|て|ている|ています|ました)?$/, 'する').trim();
  s = s.replace(/(?:させ|され|られ)$/, '').trim(); // 残りのされ
  if (!s) return null;

  // 4. て形 → 辞書形（verb stems）
  if (/て$/.test(s)) {
    s = s.replace(/いて$/, 'く')     // 書いて→書く
         .replace(/って$/, 'う')     // 払って→払う
         .replace(/んで$/, 'ぬ')     // 死んで→死ぬ
         .replace(/して$/, 'する')   // 話して→話する→話す(special below)
         .replace(/って$/, 'つ')
         .replace(/て$/, 'る');      // 食べて→食べる (last resort)
  }

  // 5. た形 → 辞書形
  s = s.replace(/いた$/, 'く')
       .replace(/った$/, 'う')
       .replace(/した$/, 'する')
       .replace(/た$/, '');

  // 6. ます形 / ている形
  s = s.replace(/(?:ています|ている|ていた|ました|ます)$/, 'る');

  // 7. のである / のです / のだ 末尾（複数トークン句の可能性大 → null）
  if (/のである|のです|のだ|のに|のを/.test(s)) return null;

  // 8. ため末尾（目的節 → null）
  if (/ため$/.test(s)) return null;

  // 9. たい末尾（意向形 → 語幹を推定）
  s = s.replace(/たい$/, 'る'); // 大雑把

  // 10. 長さチェック（8文字超は不合格）
  if ([...s].length > 8) return null;

  // 11. 中間に助詞が入っているフレーズは不合格（は/が/を/に/で/も）
  //     ただし 〜にする/〜にあたる のような複合動詞は許可
  if (/[はをもへより]/.test(s)) return null; // は/を/も は確実にアウト
  // が/に/で は複合動詞の可能性があるため: 末尾がする/なる/ある場合のみ許可
  if (/[がにで]/.test(s) && !/(?:する|なる|ある)$/.test(s)) return null;

  // 12. 空チェック
  if (!s.trim()) return null;

  return s.trim();
}

// ═══════════════════════════════════════════════════════
// 実施計画確定
// ═══════════════════════════════════════════════════════
const classify = loadJson(CLASSIFY_PATH);
const ag = loadJson(AG_PATH);
const preShaAg = sha256file(AG_PATH);
console.log('\nAG SHA256 (pre):', preShaAg);

const agMap = new Map(ag.tokens.map(t => [t.ref, t]));

// 現在 CAND_OK の対象 = UNREVIEWED かつ vocab_diff かつ EXCL_STRONGS 外 かつ TABLE でない
const candOkPool = classify.all_vocab_unreviewed.filter(r => {
  if (EXCL_STRONGS.has(r.strong)) return false;
  if (!r.candidate || r.candidate === r.tok_ja) return false;
  if (TABLE.has(r.strong + '\t' + r.tok_ja)) return false; // TABLE対象は実施済み
  return true;
});
console.log('\nCAND_OK対象 (TABLE除く):', candOkPool.length, '件');

const plan = [];
const skipped = [];

for (const rec of candOkPool) {
  const { ref, strong, tok_ja, candidate } = rec;
  const ch = parseInt(ref.match(/ROM (\d+):/)[1]);

  // シングルトークンセグメント確認
  const segTokCount = segTokenCount.get(ref);
  if (!segTokCount || segTokCount > 1) {
    skipped.push({ ref, strong, tok_ja, candidate, reason: 'SKIP_MULTI_TOKEN_SEG', seg_tok_n: segTokCount||0 });
    continue;
  }

  // グロス形導出（シングルトークン確定済み）
  const gloss = deriveGloss(rec.seg_text);
  if (!gloss) {
    skipped.push({ ref, strong, tok_ja, candidate, reason: 'SKIP_DERIVE_FAIL', seg: rec.seg_text });
    continue;
  }
  if (gloss === tok_ja) {
    skipped.push({ ref, strong, tok_ja, candidate: gloss, reason: 'NO_OP_AFTER_DERIVE' });
    continue;
  }

  // inventory 状態確認（UNREVIEWED であること）
  const inv = agMap.get(ref);
  if (!inv || inv.state !== 'UNREVIEWED') {
    skipped.push({ ref, strong, tok_ja, candidate: gloss, reason: 'STATE_NOT_UNREV', state: inv?.state });
    continue;
  }

  plan.push({ ref, strong, tok_ja, gloss, chapter: ch, seg_text: rec.seg_text });
}

console.log('実施:', plan.length, '件');
console.log('スキップ:', skipped.length, '件');
const skipReasons = {};
skipped.forEach(s => { skipReasons[s.reason] = (skipReasons[s.reason]||0)+1; });
Object.entries(skipReasons).forEach(([k,v]) => console.log('  '+k+': '+v));

// スキップ内訳（MULTI_TOKEN）
const multiSkip = skipped.filter(s=>s.reason==='SKIP_MULTI_TOKEN_SEG');
const multiBy0 = multiSkip.filter(s=>s.seg_tok_n===0).length;
const multiByN = multiSkip.filter(s=>s.seg_tok_n>1).length;
console.log('  うちSKIP_MULTI詳細: 未収録='+multiBy0+' / 2以上共有='+multiByN);

// ═══════════════════════════════════════════════════════
// bible_data 更新
// ═══════════════════════════════════════════════════════
console.log('\nbible_data 更新中...');
const byChap = {};
for (const p of plan) {
  if (!byChap[p.chapter]) byChap[p.chapter] = [];
  byChap[p.chapter].push(p);
}

const changelog = {};
let bibChanged = 0;

for (const [chStr, changes] of Object.entries(byChap)) {
  const ch = parseInt(chStr);
  const fpath = path.join(BIBLE, 'ROM', ch + '.json');
  const data = loadJson(fpath);
  const refMap = new Map(data.map(t => [t.ref, t]));
  const chLog = [];
  let chChanged = 0;

  for (const p of changes) {
    const tok = refMap.get(p.ref);
    if (!tok) { console.error('bible_data未収録:', p.ref); continue; }
    if (tok.japanese !== p.tok_ja) {
      console.error('japanese不一致:', p.ref, 'expect="'+p.tok_ja+'" got="'+tok.japanese+'"');
      continue;
    }
    tok.japanese = p.gloss;
    chLog.push({ ref: p.ref, strong: p.strong, from: p.tok_ja, to: p.gloss, seg: p.seg_text });
    chChanged++;
  }

  if (chChanged > 0) saveJson(fpath, data);
  if (chLog.length > 0) changelog[ch] = chLog;
  bibChanged += chChanged;
}

// ═══════════════════════════════════════════════════════
// AG inventory 更新
// ═══════════════════════════════════════════════════════
let invChanged = 0;
for (const p of plan) {
  const inv = agMap.get(p.ref);
  if (!inv) continue;
  inv.state = 'IMPLEMENTED_AND_VERIFIED';
  inv.note = 'PHASE4BI_v2_ROM_JA1955: ' + p.tok_ja + '→' + p.gloss + ' (single-seg)';
  invChanged++;
}

const newCounts = {};
ag.tokens.forEach(t => { newCounts[t.state] = (newCounts[t.state]||0)+1; });
ag.state_summary = newCounts;
ag.meta.phase = '4bi';
ag.meta.date = '2026-11-05';

// 既知残件更新
if (!ag.known_residuals) ag.known_residuals = {};
ag.known_residuals.phase4bi = {
  date: '2026-11-05',
  source: 'JA1955対応表照合 Phase 4bh',
  rom_vocab_diff_rc: 429,
  rom_vocab_diff_misc: { 未収録: 368, IMPLEMENTED_AND_VERIFIED: 5 },
  rom_skip_multi_token_seg: skipReasons.SKIP_MULTI_TOKEN_SEG || 0,
  rom_skip_derive_fail: skipReasons.SKIP_DERIVE_FAIL || 0,
  rom_excl_strong: 20, // approx EXCL_STRONGS
  note: 'RC/未収録は今回対象外。SKIP件（主にマルチトークンセグメント）はグロス形個別指定が必要。',
};

saveJson(AG_PATH, ag);
const postShaAg = sha256file(AG_PATH);

console.log('\nbible_data 変更:', bibChanged, '件');
console.log('inventory 変更 :', invChanged, '件');
if (bibChanged !== invChanged) { console.error('不整合!'); process.exit(1); }
console.log('整合性確認:', bibChanged, '件 ✓');
console.log('AG SHA256 (post):', postShaAg);

// ═══════════════════════════════════════════════════════
// 章ごと集計
// ═══════════════════════════════════════════════════════
console.log('\n=== 章ごと実施件数（v2 分）===');
let total = 0;
for (let c = 1; c <= 16; c++) {
  const n = (changelog[c]||[]).length;
  if (n) { process.stdout.write('ROM'+c+':'+n+'  '); total += n; }
}
console.log('\nv2合計:', total);

console.log('\n=== 最終集計 ===');
console.log('UNREVIEWED    :', newCounts.UNREVIEWED);
console.log('RETAIN_CONF   :', newCounts.RETAIN_CONFIRMED);
console.log('IMPL          :', newCounts.IMPLEMENTED_AND_VERIFIED);
console.log('HOLD_DQ       :', newCounts.HOLD_DATA_QUALITY);
console.log('HOLD_CTX      :', newCounts.HOLD_CONTEXT);

// 代表例
console.log('\n=== 代表例 20件 ===');
plan.slice(0, 20).forEach(p => {
  console.log(p.ref+' ['+p.strong+'] "'+p.tok_ja+'" → "'+p.gloss+'"  (seg:"'+p.seg_text.slice(0,20)+'")');
});

// 保存
saveJson(path.join(OUT, 'stage4-phase4bi-v2-changelog.json'), {
  meta: { phase: '4bi-v2', date: '2026-11-05', total_changed: bibChanged },
  stats: {
    cand_ok_pool: candOkPool.length,
    implemented: plan.length,
    skipped: skipped.length,
    skip_reasons: skipReasons,
    known_residuals: ag.known_residuals.phase4bi,
  },
  by_chapter: changelog,
  skipped: skipped.slice(0, 200),
  pre_sha256_ag: preShaAg,
  post_sha256_ag: postShaAg,
});
console.log('\nWrote: stage4-phase4bi-v2-changelog.json');
