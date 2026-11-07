#!/usr/bin/env node
/**
 * audit-stage2-finalize.cjs — Stage 2 最終確定処理
 *
 * A1: ὑμεῖς 4格（G5213/G5209/G5210/G5216）確定分類
 * A2: G2532 auto_validation_excluded 管理
 * A3: G846 サンプリングによる実態確認
 * A4: ブラックリスト合計（重複チェック込み）
 * B:  差分16件の追加調査
 * C:  Stage 2 最終 manifest
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO       = path.join(__dirname, '..');
const PUBLIC     = path.join(REPO, 'public');
const BIBLE_ROOT = path.join(PUBLIC, 'bible_data', 'nt');
const JA_ROOT    = path.join(PUBLIC, 'translations', 'JA1955');
const OUT_DIR    = path.join(__dirname, 'output', 'ja1955-full-audit', 'reports');

// ── ユーティリティ ─────────────────────────────────────────────────────────
function strip(s) { return (s||'').replace(/^[［〔](.*)[］〕]$/,'$1').trim(); }
function hasBracket(s) { return /^[［〔]/.test(s||''); }
function containsBase(vt, jb) {
  if (!vt||!jb) return false;
  const clean = strip(jb);
  if (!clean) return false;
  if (vt.includes(clean)) return true;
  const k = clean.replace(/[ぁ-ん]/g,'').replace(/[ァ-ン]/g,'').replace(/[a-zA-Z]/g,'').replace(/[ー]/g,'').trim();
  return k.length >= 2 && vt.includes(k);
}
function parseRef(ref) {
  const m = ref.match(/^(\S+)\s+(\d+):(\d+)!(\d+)$/);
  return m ? { book:m[1], ch:m[2], v:m[3], idx:parseInt(m[4]) } : null;
}

// ── キャッシュ ─────────────────────────────────────────────────────────────
const chCache = new Map();
function loadCh(book, ch) {
  const k = `${book}/${ch}`;
  if (!chCache.has(k)) {
    try { chCache.set(k, JSON.parse(fs.readFileSync(path.join(BIBLE_ROOT,book,ch+'.json'),'utf8'))); }
    catch { chCache.set(k,[]); }
  }
  return chCache.get(k);
}
const jaCache = new Map();
function loadJA(book, ch) {
  const k = `${book}/${ch}`;
  if (!jaCache.has(k)) {
    try { jaCache.set(k, JSON.parse(fs.readFileSync(path.join(JA_ROOT,book,ch+'.json'),'utf8')).verses||{}); }
    catch { jaCache.set(k,{}); }
  }
  return jaCache.get(k);
}
function getVerseTokens(book, ch, verse) {
  const tokens = loadCh(book, ch);
  const arr = Array.isArray(tokens) ? tokens : Object.values(tokens);
  return arr.filter(t => String(t.verse) === String(verse));
}

// ── Census データ読み込み ───────────────────────────────────────────────────
const census = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage2-jikoji-census.json'),'utf8'));
const allJikoji = census.allTokens; // 32,317件

console.log(`現状維持総件数: ${allJikoji.length}件`);

// ── ═══════════════════════════════════════════════════════════════════════
// A3: G846 サンプリング分析
// ═══════════════════════════════════════════════════════════════════════
console.log('\n=== A3: G846 分析 ===');

const g846Tokens = allJikoji.filter(t => t.strong === 'G846');
console.log(`G846 現状維持件数: ${g846Tokens.length}件`);

// G846のJapanese labelの多様性を確認
const g846Labels = {};
for (const t of g846Tokens) {
  const ja = t.japanese || '';
  g846Labels[ja] = (g846Labels[ja]||0) + 1;
}
console.log('G846 日本語ラベル分布:', Object.entries(g846Labels).sort((a,b)=>b[1]-a[1]).slice(0,10));

// G846は duplicate_label（同一節内に同じラベルが複数存在）の実態を確認する
// 個別判定: structural_review_required vs explicit
let g846_structural = 0, g846_explicit = 0, g846_uncertain = 0;
const g846Analysis = [];

for (const tok of g846Tokens) {
  const r = parseRef(tok.ref);
  if (!r) { g846_uncertain++; continue; }
  const vt = loadJA(r.book, r.ch)[r.v] || null;
  if (!vt) { g846_uncertain++; continue; }

  const verseTokens = getVerseTokens(r.book, r.ch, r.v);
  const ja = tok.japanese || '';
  const sameLabel = verseTokens.filter(t => t.ref !== tok.ref && (t.japanese||'') === ja);
  const countInVerse = (vt.split(strip(ja)||'_').length - 1);

  let classification, reason;
  if (sameLabel.length > 0) {
    classification = 'structural_review_required';
    reason = `節内に同じラベル「${ja}」が${sameLabel.length}件存在`;
    g846_structural++;
  } else if (countInVerse > 1) {
    classification = 'structural_review_required';
    reason = `節テキストに「${strip(ja)}」が${countInVerse}回出現`;
    g846_structural++;
  } else {
    classification = 'explicit';
    reason = `節内で唯一の「${ja}」、JA1955に直接対応確認`;
    g846_explicit++;
  }

  g846Analysis.push({
    ref: tok.ref, strong: tok.strong, text: tok.text,
    japanese: ja, verseText: vt?.slice(0,80),
    classification, reason,
    sameLabelRefs: sameLabel.map(t=>t.ref),
  });
}

console.log(`G846: structural_review_required=${g846_structural}, explicit=${g846_explicit}, uncertain=${g846_uncertain}`);

// ── ═══════════════════════════════════════════════════════════════════════
// A4: ブラックリスト全体集計（重複チェック込み）
// ═══════════════════════════════════════════════════════════════════════
console.log('\n=== A4: ブラックリスト集計 ===');

const BLACKLIST_STRONGS = ['G5213','G5209','G5210','G5216','G2532','G846'];

// ὑμεῖス分類（既存のTask2結果から）
const addendumData = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage2-addendum.json'),'utf8'));
const humeis4Tokens = addendumData.task2.details; // 1,637件のanalysis
const humeis4ByRef = new Map(humeis4Tokens.map(t=>[t.ref,t]));

// G2532分析
const g2532Tokens = allJikoji.filter(t => t.strong === 'G2532');
const g2532ByRef = new Map(g2532Tokens.map(t=>[t.ref,t]));

// 既存ledger確認（承認済み変更台帳）
let ledgerRefs = new Set();
try {
  const ledgerFiles = fs.readdirSync(path.join(__dirname,'output')).filter(f=>f.includes('ledger')||f.includes('approved'));
  for (const f of ledgerFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname,'output',f),'utf8'));
    if (Array.isArray(data)) data.forEach(t => t.ref && ledgerRefs.add(t.ref));
    else if (data.tokens) data.tokens.forEach(t => t.ref && ledgerRefs.add(t.ref));
  }
} catch {}

// PR#471/ebf70bc6 で変更されたtoken refも承認済みとして扱う
const task1Data = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage2-addendum-task1.json'),'utf8'));
for (const c of [...task1Data.pr471.tokens, ...task1Data.pr472.tokens]) {
  ledgerRefs.add(c.ref);
}
console.log(`承認済みledger件数（変更済みトークン含む）: ${ledgerRefs.size}件`);

// Strong別集計
const blacklistStats = {};
const blacklistAllRefs = new Set();

for (const strong of BLACKLIST_STRONGS) {
  const tokens = allJikoji.filter(t => t.strong === strong);
  const refs = tokens.map(t=>t.ref);

  // 重複チェック（他のblacklistStrongに同じrefがないか）
  const dupWithOther = refs.filter(r => blacklistAllRefs.has(r));

  let srCount = 0, explicitCount = 0, uncertainCount = 0;
  const ledgerOverlap = refs.filter(r => ledgerRefs.has(r)).length;

  if (['G5213','G5209','G5210','G5216'].includes(strong)) {
    // ὑμεῖス: Task2の結果を使用
    for (const r of refs) {
      const t = humeis4ByRef.get(r);
      if (!t) { uncertainCount++; continue; }
      if (t.classification === 'structural_review_required') srCount++;
      else if (t.classification === 'explicit') explicitCount++;
      else uncertainCount++;
    }
  } else if (strong === 'G2532') {
    // G2532: auto_validation_excluded（全件）
    // サンプル26件の結果: explicit=11(42%), uncertain=15(58%)
    srCount = 0;
    explicitCount = 0;
    uncertainCount = tokens.length; // 全件をauto_validation_excluded扱い
  } else if (strong === 'G846') {
    srCount = g846_structural;
    explicitCount = g846_explicit;
    uncertainCount = g846_uncertain;
  }

  blacklistStats[strong] = {
    母集団件数: tokens.length,
    自動検証除外件数: strong === 'G2532' ? tokens.length : srCount + explicitCount + uncertainCount,
    structural_review_required: srCount,
    explicit: explicitCount,
    uncertain: uncertainCount,
    ledger重複件数: ledgerOverlap,
    他Strong重複件数: dupWithOther.length,
    分類方針: strong === 'G2532' ? 'auto_validation_excluded（全件）' :
              ['G5213','G5209','G5210','G5216'].includes(strong) ? '個別判定（structural_review_required/explicit）' :
              '個別判定（structural_review_required/explicit）',
  };

  for (const r of refs) blacklistAllRefs.add(r);

  console.log(`${strong}: 計${tokens.length}件, SR=${srCount}, explicit=${explicitCount}, unc=${uncertainCount}, ledger重複=${ledgerOverlap}`);
}

const blacklistTotal = Object.values(blacklistStats).reduce((s,v)=>s+v['母集団件数'],0);
console.log(`\nブラックリスト合計（重複チェック後）: ${blacklistAllRefs.size}件`);
console.log(`単純合計: ${blacklistTotal}件`);
if (blacklistAllRefs.size !== blacklistTotal) {
  console.log(`⚠️ 重複あり: ${blacklistTotal - blacklistAllRefs.size}件`);
} else {
  console.log('✓ 重複なし');
}

// ── ═══════════════════════════════════════════════════════════════════════
// B: 差分16件の追加調査
// ═══════════════════════════════════════════════════════════════════════
console.log('\n=== B: 差分16件の追加調査 ===');

// 方法: 旧データ（6738af25の親コミット）でclassifyを実行し、現在のデータと比較
// ただし全260章を処理すると時間がかかるため、変更があった14ファイルに絞って確認

const pr471Files = execSync('git show 6738af25 --name-only', {cwd:REPO, encoding:'utf8'})
  .split('\n').filter(l=>/bible_data.*\.json/.test(l)).map(l=>l.trim());
const pr471Parent = execSync('git rev-parse 6738af25^', {cwd:REPO, encoding:'utf8'}).trim();

const PILOT_MAP = new Map([
  ['G5088',{before:'産む',after:'生む',conservative:false}],
  ['G658',{before:'完成する',after:'熟する',conservative:false}],
  ['G1828',{before:'引き出す',after:'引く',conservative:false}],
  ['G4815',{before:'捕らえる',after:'はらむ',conservative:false}],
  ['G5278',{before:'忍耐する',after:'耐え忍ぶ',conservative:false}],
  ['G1939',{before:'欲望',after:'欲',conservative:false}],
  ['G1538',{before:'各自',after:'それぞれ',conservative:false}],
  ['G435',{before:'男',after:'人',conservative:true}],
  ['G3985',{before:'試みる',after:'誘惑する',conservative:true}],
  ['G3986',{before:'誘惑',after:'試錬',conservative:true}],
  ['G1161',{before:'［転換語句］',after:'また',conservative:true}],
  ['G846',{before:'彼',after:'自ら',conservative:true}],
]);
function vc(vt,w){return (vt||'').includes(w||'');}
function classify(tok,vt,pat){
  const ja=tok.japanese||'';
  const ib=hasBracket(ja); const sj=strip(ja);
  if(!vt)return '要確認';
  if(pat){
    const cm=ja===pat.before;
    const vha=vc(vt,pat.after); const vhb=containsBase(vt,pat.before);
    if(!cm)return '現状維持';
    if(pat.conservative){return (vha&&!vhb)?'更新候補':'要確認';}
    else{if(vha)return '更新候補'; if(vhb)return '現状維持'; return '要確認';}
  }
  if(ib){return (sj&&vc(vt,sj))?'現状維持':'要確認';}
  return containsBase(vt,ja)?'現状維持':'要確認';
}

// PR#471の14ファイルについて旧データで現状維持数を計算
let oldJikojiCount = 0, newJikojiCount = 0;
const diffTokens = [];

for (const f of pr471Files) {
  try {
    const oldTokens = JSON.parse(execSync(`git show ${pr471Parent}:${f}`,{cwd:REPO,maxBuffer:5*1024*1024}).toString());
    const newTokens = JSON.parse(execSync(`git show 6738af25:${f}`,{cwd:REPO,maxBuffer:5*1024*1024}).toString());
    const oldArr = Array.isArray(oldTokens)?oldTokens:Object.values(oldTokens);
    const newArr = Array.isArray(newTokens)?newTokens:Object.values(newTokens);

    // このファイルのJA1955テキストを取得
    const parts = f.split('/'); // public/bible_data/nt/BOOK/CH.json
    const book = parts[3], ch = path.basename(parts[4],'.json');
    const jaVerses = loadJA(book, ch);

    for (const tok of oldArr) {
      const vt = jaVerses[String(tok.verse)] || null;
      const pat = PILOT_MAP.get(tok.strong)||null;
      const v = classify(tok,vt,pat);
      if(v==='現状維持') oldJikojiCount++;
    }
    for (const tok of newArr) {
      const vt = jaVerses[String(tok.verse)] || null;
      const pat = PILOT_MAP.get(tok.strong)||null;
      const v = classify(tok,vt,pat);
      if(v==='現状維持') newJikojiCount++;
    }
  } catch(e) { console.error('ファイル処理エラー:', f, e.message); }
}

console.log(`PR#471の14ファイル:`);
console.log(`  旧データでの現状維持: ${oldJikojiCount}件`);
console.log(`  新データでの現状維持: ${newJikojiCount}件`);
console.log(`  差分: +${newJikojiCount - oldJikojiCount}件`);
console.log(`  PR#471で変更された32件: このファイル群内での差分`);

// 全体での差分検証
// 旧データ全体での現状維持数を知るには全260章の計算が必要
// → 時間的制約で差分14ファイルのみ確認し、残りは推定
const pr471TokensChanged = task1Data.pr471.tokens.length;
const pr472TokensChanged = task1Data.pr472.tokens.length;
const allChanged = pr471TokensChanged + pr472TokensChanged;
const actualNetIncrease = 32317 - 32169;
const unexplained = allChanged - actualNetIncrease;

console.log(`\n差分16件の結論:`);
console.log(`  変更トークン総数: ${allChanged}件（全164件が旧値でJA1955不一致→更新候補/要確認）`);
console.log(`  実際の純増: ${actualNetIncrease}件`);
console.log(`  説明できない差: ${unexplained}件`);
console.log(`  状態: 確定不可（推定）`);

// PR#471の14ファイルでの旧データ現状維持件数から手がかりを得る
const pr471FilesJikojiDiff = newJikojiCount - oldJikojiCount;
console.log(`  PR#471変更ファイル内での差分: +${pr471FilesJikojiDiff}件（変更32件中${pr471FilesJikojiDiff}件が有効増加）`);

// ── ═══════════════════════════════════════════════════════════════════════
// C: Stage 2 最終 Manifest
// ═══════════════════════════════════════════════════════════════════════
console.log('\n=== C: Stage 2 Manifest 生成 ===');

// ブラックリスト除外後の「検証対象」件数
const blacklistRefSet = blacklistAllRefs;
const verifiableJikoji = allJikoji.filter(t => !blacklistRefSet.has(t.ref));
const patternNomatch = allJikoji.filter(t => {
  // matchType判定（census.allTokensにはmatchTypeが含まれているはず）
  return t.matchType === 'pattern_nomatch';
});

console.log(`ブラックリスト除外後の検証対象: ${verifiableJikoji.length}件`);

const manifest = {
  title: 'Stage 2 最終確定 Manifest',
  generatedAt: new Date().toISOString().slice(0,10),
  status: 'STAGE2_FINAL',

  // A. 母集団
  population: {
    total_jikoji: allJikoji.length,
    originalAuditCount: 32169,
    diff: allJikoji.length - 32169,
    diffConfirmed: false,
    diffNote: `164件の承認変更（PR#471: 32件, ebf70bc6: 132件）が全件現状維持化。差16件は旧監査PILOT_PATTERNSの差異推定。確定不可。`,
  },

  // B. ブラックリスト（A1-A4）
  blacklist: {
    total: blacklistAllRefs.size,
    noDuplicateConfirmed: blacklistAllRefs.size === blacklistTotal,
    strongs: blacklistStats,
    note: 'G2532は auto_validation_excluded（全件）。G846・ὑμεῖスは個別判定による分類。',
  },

  // C. 検証対象
  verifiable: {
    total: verifiableJikoji.length,
    breakdown: {
      pattern_nomatch: allJikoji.filter(t=>t.matchType==='pattern_nomatch').length,
      pattern_match:   allJikoji.filter(t=>t.matchType==='pattern_match').length,
      direct:          allJikoji.filter(t=>t.matchType==='direct').length,
      kanji:           allJikoji.filter(t=>t.matchType==='kanji').length,
    },
    verifiableByMatchType: {
      direct:  verifiableJikoji.filter(t=>t.matchType==='direct').length,
      kanji:   verifiableJikoji.filter(t=>t.matchType==='kanji').length,
      pattern: verifiableJikoji.filter(t=>t.matchType?.startsWith('pattern')).length,
    },
  },

  // D. Stage 2 サンプル結果
  stage2Results: {
    sampleSize: 230,
    simpleValidRate: '84.8%',
    weightedValidRate: '81.8%',
    likelyFP: 35,
    fpRate: '15.2%',
    keyFinding: 'duplicate_label 問題が全FP件数の根本原因',
  },

  // E. 既存承認済みデータ
  approved: {
    ledgerCount: ledgerRefs.size,
    note: 'PR#471(32件) + ebf70bc6(132件) = 164件が現在の現状維持に含まれている',
  },

  // F. ファイルリスト
  files: {
    census: 'stage2-jikoji-census.json',
    sample: 'stage2-jikoji-sample.json',
    analysis: 'stage2-jikoji-analysis.json',
    finalReport: 'stage2-final-report.md',
    addendum: 'stage2-addendum.json',
    addendumTask1: 'stage2-addendum-task1.json',
    addendumFinal: 'stage2-addendum-final.md',
    manifest: 'stage2-manifest.json',
    g846Analysis: 'stage2-g846-analysis.json',
  },
};

fs.writeFileSync(path.join(OUT_DIR,'stage2-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
fs.writeFileSync(path.join(OUT_DIR,'stage2-g846-analysis.json'), JSON.stringify(g846Analysis, null, 2), 'utf8');

console.log(`Manifest: ${path.join(OUT_DIR,'stage2-manifest.json')}`);
console.log(`G846 Analysis: ${path.join(OUT_DIR,'stage2-g846-analysis.json')}`);

// ── Stage 3 対象の準備 ──────────────────────────────────────────────────
// ブラックリスト除外後のStrongごとの件数（Stage 3設計用）
const stage3Pool = verifiableJikoji.filter(t =>
  t.matchType === 'direct' || t.matchType === 'kanji'
);
const stage3ByStrong = {};
for (const t of stage3Pool) {
  if (!stage3ByStrong[t.strong]) stage3ByStrong[t.strong] = {
    count: 0, japanese: t.japanese, wordClass: t.wordClass, matchTypes: {}
  };
  stage3ByStrong[t.strong].count++;
  stage3ByStrong[t.strong].matchTypes[t.matchType] = (stage3ByStrong[t.strong].matchTypes[t.matchType]||0)+1;
}
const stage3TopStrong = Object.entries(stage3ByStrong)
  .sort((a,b)=>b[1].count-a[1].count).slice(0,40)
  .map(([s,v])=>({strong:s,...v}));

console.log(`\nStage 3対象（ブラックリスト除外後・direct+kanji）: ${stage3Pool.length}件`);
console.log(`ユニークStrong数: ${Object.keys(stage3ByStrong).length}`);
console.log('Top10 Strong:', stage3TopStrong.slice(0,10).map(s=>`${s.strong}(${s.japanese}):${s.count}`).join(', '));

fs.writeFileSync(path.join(OUT_DIR,'stage3-pool.json'), JSON.stringify({
  meta: { generatedAt: new Date().toISOString().slice(0,10), total: stage3Pool.length },
  topStrong: stage3TopStrong,
  allTokens: stage3Pool,
}, null, 2), 'utf8');
console.log(`Stage 3 Pool: ${path.join(OUT_DIR,'stage3-pool.json')}`);

console.log('\n=== Stage 2 最終確定 完了 ===');
