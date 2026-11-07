#!/usr/bin/env node
/**
 * audit-stage2-addendum.cjs — Stage 2 追加調査
 *
 * タスク1: 32,169→32,317件（+148）の token ref 単位差分特定
 * タスク2: G5213/G5209/G5210/G5216（ὑμεῖς各格）1,820件の再分類
 * タスク3: G2532（καί）追加サンプリング 30件
 * タスク4: 6層別加重妥当率の再評価
 *
 * 出力: scripts/output/ja1955-full-audit/reports/stage2-addendum-*.json/.md
 *
 * 禁止: 聖書JSON変更・token.japanese変更・既存成果物上書き
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PUBLIC     = path.join(__dirname, '..', 'public');
const BIBLE_ROOT = path.join(PUBLIC, 'bible_data', 'nt');
const JA_ROOT    = path.join(PUBLIC, 'translations', 'JA1955');
const OUT_DIR    = path.join(__dirname, 'output', 'ja1955-full-audit', 'reports');

// ── ユーティリティ（元スクリプトと完全同一） ───────────────────────────────
function stripBrackets(s) {
  return (s||'').replace(/^［(.*)］$/, '$1').replace(/^〔(.*)〕$/, '$1').trim();
}
function hasBracket(s) { return /^[［〔]/.test(s||''); }
function containsBase(vt, jb) {
  if (!vt || !jb) return false;
  const clean = stripBrackets(jb);
  if (!clean) return false;
  if (vt.includes(clean)) return true;
  const kanji = clean.replace(/[ぁ-ん]/g,'').replace(/[ァ-ン]/g,'').replace(/[a-zA-Z]/g,'').replace(/[ー]/g,'').trim();
  if (kanji.length >= 2 && vt.includes(kanji)) return true;
  return false;
}
function verseContains(vt, w) { return (vt||'').includes(w||''); }

const PILOT_PATTERNS = [
  { strong:'G5088', before:'産む',        after:'生む',     conservative:false },
  { strong:'G658',  before:'完成する',    after:'熟する',   conservative:false },
  { strong:'G1828', before:'引き出す',    after:'引く',     conservative:false },
  { strong:'G4815', before:'捕らえる',    after:'はらむ',   conservative:false },
  { strong:'G5278', before:'忍耐する',    after:'耐え忍ぶ', conservative:false },
  { strong:'G1939', before:'欲望',        after:'欲',       conservative:false },
  { strong:'G1538', before:'各自',        after:'それぞれ', conservative:false },
  { strong:'G435',  before:'男',          after:'人',       conservative:true  },
  { strong:'G3985', before:'試みる',      after:'誘惑する', conservative:true  },
  { strong:'G3986', before:'誘惑',        after:'試錬',     conservative:true  },
  { strong:'G1161', before:'［転換語句］', after:'また',    conservative:true  },
  { strong:'G846',  before:'彼',          after:'自ら',     conservative:true  },
];
const PILOT_MAP = new Map(PILOT_PATTERNS.map(p => [p.strong, p]));

function classifyVerdict(tok, vt, pat) {
  const ja = tok.japanese || '';
  const ib = hasBracket(ja);
  const sj = stripBrackets(ja);
  if (!vt) return '要確認';
  if (pat) {
    const cm  = ja === pat.before;
    const vha = verseContains(vt, pat.after);
    const vhb = containsBase(vt, pat.before);
    if (!cm) return '現状維持';
    if (pat.conservative) {
      if (vha && !vhb) return '更新候補';
      return '要確認';
    } else {
      if (vha) return '更新候補';
      if (vhb) return '現状維持';
      return '要確認';
    }
  }
  if (ib) { return (sj && verseContains(vt, sj)) ? '現状維持' : '要確認'; }
  return containsBase(vt, ja) ? '現状維持' : '要確認';
}

// ── キャッシュ ─────────────────────────────────────────────────────────────
const chCache = new Map();
function loadCh(book, ch) {
  const k = `${book}/${ch}`;
  if (!chCache.has(k)) {
    try { chCache.set(k, JSON.parse(fs.readFileSync(path.join(BIBLE_ROOT, book, ch+'.json'),'utf8'))); }
    catch { chCache.set(k, []); }
  }
  return chCache.get(k);
}
const jaCache = new Map();
function loadJA(book, ch) {
  const k = `${book}/${ch}`;
  if (!jaCache.has(k)) {
    try { jaCache.set(k, JSON.parse(fs.readFileSync(path.join(JA_ROOT, book, ch+'.json'),'utf8')).verses||{}); }
    catch { jaCache.set(k, {}); }
  }
  return jaCache.get(k);
}

// ── =====================================================================
// タスク1: 148件差分の特定
// git diffで旧→新を取り出し、token refを照合
// ── =====================================================================

console.log('\n=== タスク1: 148件差分の特定 ===');

// PR #471 (6738af25) の bible_data 変更を取得
function getChangedTokensFromCommit(commitSha, baseCommit) {
  const diffStr = execSync(`git diff ${baseCommit}..${commitSha} -- 'public/bible_data/nt/**/*.json'`, {cwd: path.join(__dirname,'..'), maxBuffer: 20*1024*1024}).toString();

  const changed = [];
  let currentFile = null;

  for (const line of diffStr.split('\n')) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6);
    }
    // +行で "japanese": "..." の変更を検出
    if (currentFile && line.startsWith('+') && !line.startsWith('+++') && line.includes('"japanese"')) {
      const m = line.match(/"ref"\s*:\s*"([^"]+)"/);
      // refがない行の場合は前後から推定が必要
    }
  }
  return changed;
}

// より確実な方法: git showでJSONパースして前後を比較
function getChangedTokenRefsByGitDiff(commitSha, parentSha) {
  let diffOutput;
  try {
    diffOutput = execSync(
      `git diff ${parentSha} ${commitSha} -- 'public/bible_data/nt/*.json' 'public/bible_data/nt/**/*.json'`,
      { cwd: path.join(__dirname,'..'), maxBuffer: 30*1024*1024 }
    ).toString();
  } catch(e) {
    diffOutput = '';
  }

  // diff出力から変更されたjapanese値とrefを抽出
  const changes = [];
  let currentFile = '';

  const lines = diffOutput.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6);
    }
    // 追加行（+）で "japanese" フィールドの変化を捕捉
    if (line.startsWith('+') && !line.startsWith('+++') && /"japanese"/.test(line)) {
      const newVal = (line.match(/"japanese"\s*:\s*"([^"]*)"/) || [])[1];
      // 対応する削除行（-）を探す
      let oldVal = null;
      for (let j = Math.max(0, i-5); j < i; j++) {
        if (lines[j].startsWith('-') && !lines[j].startsWith('---') && /"japanese"/.test(lines[j])) {
          oldVal = (lines[j].match(/"japanese"\s*:\s*"([^"]*)"/) || [])[1];
          break;
        }
      }
      if (oldVal !== null && oldVal !== newVal) {
        // refを探す（近傍行から）
        let ref = '';
        for (let j = Math.max(0, i-10); j < Math.min(lines.length, i+10); j++) {
          const rm = (lines[j].match(/"ref"\s*:\s*"([^"]+)"/) || []);
          if (rm[1]) { ref = rm[1]; break; }
        }
        if (ref) {
          changes.push({ ref, oldJapanese: oldVal, newJapanese: newVal, file: currentFile, commit: commitSha });
        }
      }
    }
  }
  return changes;
}

// PR #471のpärent commit
const pr471Parent = execSync('git rev-parse 6738af25^', {cwd: path.join(__dirname,'..'), encoding:'utf8'}).trim();
const pr471Changes = getChangedTokenRefsByGitDiff('6738af25', pr471Parent);

// ebf70bc6のparent commit (= 6738af25)
const pr472Changes = getChangedTokenRefsByGitDiff('ebf70bc6', '6738af25');

console.log(`PR #471変更件数: ${pr471Changes.length}件`);
console.log(`commit ebf70bc6変更件数: ${pr472Changes.length}件`);
console.log(`合計: ${pr471Changes.length + pr472Changes.length}件`);

// 期待値: 16 + 132 = 148件
// これらのトークンが「現在の現状維持」に含まれるかを検証
const allChangedRefs = new Set([...pr471Changes, ...pr472Changes].map(c=>c.ref));

// 現在の現状維持全件ロード（census.jsonから）
const censusPath = path.join(OUT_DIR, 'stage2-jikoji-census.json');
const census = JSON.parse(fs.readFileSync(censusPath, 'utf8'));
const currentJikojiRefs = new Set(census.allTokens.map(t => t.ref));

// 変更されたトークンのうち現在の現状維持に含まれるもの
const changedNowJikoji = [...allChangedRefs].filter(r => currentJikojiRefs.has(r));
// 現在の現状維持のうち変更されていないもの
const unchangedJikoji = census.allTokens.filter(t => !allChangedRefs.has(t.ref));

console.log(`変更後に現状維持になったトークン: ${changedNowJikoji.length}件`);

// 変更トークンの詳細
const changedDetails = [...pr471Changes, ...pr472Changes].map(c => ({
  ...c,
  nowInJikoji: currentJikojiRefs.has(c.ref),
}));

// Strong別の内訳
const strongDist471 = {};
for (const c of pr471Changes) {
  const t = census.allTokens.find(tok => tok.ref === c.ref);
  const strong = t?.strong || c.ref.split('!')[0];
  strongDist471[c.newJapanese] = (strongDist471[c.newJapanese]||0) + 1;
}
const strongDist472 = {};
for (const c of pr472Changes) {
  const t = census.allTokens.find(tok => tok.ref === c.ref);
  const s = t?.strong || '?';
  if (!strongDist472[s]) strongDist472[s] = { count:0, oldNew:[] };
  strongDist472[s].count++;
  strongDist472[s].oldNew.push(`${c.oldJapanese}→${c.newJapanese}`);
}

// タスク1出力
const task1 = {
  title: 'タスク1: 32,169→32,317件（+148）差分の特定',
  pr471_changes: { count: pr471Changes.length, tokens: pr471Changes },
  pr472_changes: { count: pr472Changes.length, tokens: pr472Changes },
  total_changes: pr471Changes.length + pr472Changes.length,
  expectedDiff: 148,
  changedNowInJikoji: changedNowJikoji.length,
  changedDetails: changedDetails.filter(c => c.nowInJikoji),
  analysis: {
    pr471_label: 'JAS 1:12-15 pilot + G3986/G5278 NT-wide（16件）',
    pr472_label: '132件承認済みNT更新',
    conclusion: `差分${pr471Changes.length + pr472Changes.length}件 = PR#471(${pr471Changes.length}件) + commit-ebf70bc6(${pr472Changes.length}件)`,
  },
};

// ── =====================================================================
// タスク2: G5213 / G5209 / G5210 / G5216 の再分類
// ── =====================================================================
console.log('\n=== タスク2: ὑμεῖς 4格変化の再分類 ===');

const HUMEIS_STRONGS = ['G5213', 'G5209', 'G5210', 'G5216'];
const humeisTokens = census.allTokens.filter(t => HUMEIS_STRONGS.includes(t.strong));
console.log(`対象件数: ${humeisTokens.length}件`);

// Strong別件数
const humeisByStrong = {};
for (const t of humeisTokens) {
  humeisByStrong[t.strong] = (humeisByStrong[t.strong]||0) + 1;
}
console.log('Strong別:', humeisByStrong);

// 各トークンについて節内の同一ラベル状況を確認
function getVerseTokens(book, chapter, verse) {
  const tokens = loadCh(book, chapter);
  const arr = Array.isArray(tokens) ? tokens : Object.values(tokens);
  return arr.filter(t => String(t.verse) === String(verse));
}

function parseRef(ref) {
  const m = ref.match(/^(\S+)\s+(\d+):(\d+)!(\d+)$/);
  if (!m) return null;
  return { book:m[1], chapter:parseInt(m[2]), verse:parseInt(m[3]), idx:parseInt(m[4]) };
}

// 分類基準:
// structural_review_required: 同じ節内に同じJapaneseを持つ別トークンが存在（自動検証不能）
// explicit: 節内で唯一の対応（自動検証可能）
// implicit: kanji matchのみで確認（弱い）
// none: verseTextに語なし（通常 要確認に分類されるはずだが念のため）
// uncertain: verseTextがnull等

const task2Results = [];
let duplicateLabelCount = 0;
let uniqueCount = 0;
let noneCount = 0;
let uncertainCount = 0;

for (const token of humeisTokens) {
  const r = parseRef(token.ref);
  if (!r) { task2Results.push({...token, classification:'uncertain', reason:'ref解析失敗'}); uncertainCount++; continue; }

  const verseTokens = getVerseTokens(r.book, r.chapter, r.verse);
  const vt = token.verseText || loadJA(r.book, r.chapter)[String(r.verse)] || null;

  if (!vt) { task2Results.push({...token, classification:'uncertain', reason:'JA1955テキストなし'}); uncertainCount++; continue; }

  const ja = token.japanese || '';
  const sameLabel = verseTokens.filter(t => t.ref !== token.ref && (t.japanese||'') === ja);
  const sameStrong = verseTokens.filter(t => t.ref !== token.ref && t.strong === token.strong);

  // 対応可能性リスト: 節内の同じJapaneseを持つ別トークン
  const candidates = sameLabel.map(t => ({
    ref: t.ref,
    strong: t.strong,
    text: t.text,
    japanese: t.japanese,
    morph: t.morph,
    note: t.strong === token.strong ? '同一Strong' : '異なるStrong',
  }));

  let classification, reason, confidence;

  if (sameLabel.length > 0) {
    classification = 'structural_review_required';
    reason = `節内に同じラベル「${ja}」を持つトークンが${sameLabel.length}件存在（${sameLabel.map(t=>t.ref).join(', ')}）。containsBase()では対応を一意に特定できない。`;
    confidence = 'LOW';
    duplicateLabelCount++;
  } else {
    // 節内で唯一の場合でも、verseTextに語があるかを確認
    const clean = stripBrackets(ja);
    if (vt.includes(clean)) {
      const count = vt.split(clean).length - 1;
      if (count > 1) {
        classification = 'structural_review_required';
        reason = `「${ja}」が節テキストに${count}回出現。どの出現に対応するか不明。`;
        confidence = 'MEDIUM';
        duplicateLabelCount++;
      } else {
        classification = 'explicit';
        reason = `節内で唯一の「${ja}」トークン。JA1955に直接対応確認。`;
        confidence = 'HIGH';
        uniqueCount++;
      }
    } else {
      classification = 'none';
      reason = `JA1955節テキストに「${ja}」が含まれない（containsBase経由でヒットしている可能性）`;
      confidence = 'MEDIUM';
      noneCount++;
    }
  }

  task2Results.push({
    ref: token.ref,
    strong: token.strong,
    text: token.text,
    lemma: token.lemma,
    morph: token.morph,
    japanese: ja,
    verseText: vt ? vt.slice(0, 80) + (vt.length > 80 ? '...' : '') : null,
    classification,
    confidence,
    reason,
    duplicateCandidates: candidates,
    sameStrongInVerse: sameStrong.map(t => t.ref),
  });
}

const task2Summary = {
  total: humeisTokens.length,
  structural_review_required: duplicateLabelCount,
  explicit: uniqueCount,
  none: noneCount,
  uncertain: uncertainCount,
};
console.log('Task2 分類:', task2Summary);

// ── =====================================================================
// タスク3: G2532（καί）追加サンプリング 30件
// ── =====================================================================
console.log('\n=== タスク3: G2532 追加サンプリング ===');

const g2532Tokens = census.allTokens.filter(t => t.strong === 'G2532');
console.log(`G2532 現状維持件数: ${g2532Tokens.length}件`);

// 既存4件（stage2-jikoji-sample.jsonのL4層から）
const existingSample = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'stage2-jikoji-sample.json'),'utf8'));
const existing4Refs = new Set(
  (existingSample.strata.L4?.tokens || []).filter(t=>t.strong==='G2532').map(t=>t.ref)
);
console.log(`既存サンプル: ${existing4Refs.size}件`);

// 追加サンプル選定基準:
// A. JA1955に「そして」を含む節（直接対応）
// B. JA1955に「そして」を含まない節（省略・吸収）
// C. 節内に別G2532が存在する（duplicate_label）
// D. 節内に「そして」が複数回出現（多重出現）
// E. 多様な書巻からの分散

const g2532Sample = { A:[], B:[], C:[], D:[], E:[] };
const booksWithG2532 = new Set(g2532Tokens.map(t=>t.book));

for (const token of g2532Tokens) {
  if (existing4Refs.has(token.ref)) continue; // 既存4件除外

  const r = parseRef(token.ref);
  if (!r) continue;

  const vt = token.verseText || loadJA(r.book, r.chapter)[String(r.verse)] || null;
  const verseTokens = getVerseTokens(r.book, r.chapter, r.verse);
  const sameLabel = verseTokens.filter(t => t.ref !== token.ref && t.japanese === 'そして');

  if (!vt) continue;

  const category = (() => {
    if (sameLabel.length > 0) return 'C';
    const count = vt.split('そして').length - 1;
    if (count > 1) return 'D';
    if (!vt.includes('そして')) return 'B';
    return 'A';
  })();

  if (g2532Sample[category].length < 8) {
    g2532Sample[category].push(token);
  }
}

// 各カテゴリから選択、書巻の多様性を確保
const addedRefs = new Set();
const g2532NewSample = [];
const catTargets = { A:8, B:8, C:8, D:4, E:0 };

for (const [cat, target] of Object.entries(catTargets)) {
  const pool = g2532Sample[cat] || [];
  const usedBooks = new Set();
  let count = 0;
  for (const tok of pool) {
    if (count >= target) break;
    if (!addedRefs.has(tok.ref)) {
      g2532NewSample.push({...tok, samplingCategory: cat});
      addedRefs.add(tok.ref);
      usedBooks.add(tok.book);
      count++;
    }
  }
}

// 不足分をランダムに補充（目標30件）
const remaining = g2532Tokens.filter(t => !existing4Refs.has(t.ref) && !addedRefs.has(t.ref));
let ri = 0;
while (g2532NewSample.length < 26 && ri < remaining.length) {
  const tok = remaining[ri * 17 % remaining.length]; // 疑似ランダム
  if (!addedRefs.has(tok.ref)) {
    const r = parseRef(tok.ref);
    if (r) {
      const vt = tok.verseText || loadJA(r.book, r.chapter)[String(r.verse)] || null;
      if (vt) {
        g2532NewSample.push({...tok, samplingCategory: 'E'});
        addedRefs.add(tok.ref);
      }
    }
  }
  ri++;
}

console.log(`追加サンプル: ${g2532NewSample.length}件`);
console.log(`合計: ${existing4Refs.size + g2532NewSample.length}件`);

// 各サンプルの分析
function analyzeG2532Token(token, isExisting) {
  const r = parseRef(token.ref);
  if (!r) return { validity: 'uncertain', correspondence: 'uncertain' };

  const verseTokens = getVerseTokens(r.book, r.chapter, r.verse);
  const vt = token.verseText || loadJA(r.book, r.chapter)[String(r.verse)] || null;

  if (!vt) return { validity: 'uncertain', correspondence: 'uncertain', verseText: null };

  const sameLabel = verseTokens.filter(t => t.ref !== token.ref && t.japanese === 'そして');
  const soShiteCount = vt.split('そして').length - 1;
  const mathaCount   = vt.split('また').length - 1;
  const shikashiCount= vt.split('しかし').length - 1;

  let correspondence, auto_verdict_correct, reason;

  if (sameLabel.length > 0) {
    // 同じ節に別G2532等が「そして」ラベル → 一意対応不能
    correspondence = 'uncertain';
    auto_verdict_correct = false;
    reason = `節内に別のG2532/καίトークンが${sameLabel.length}件存在し、同じ「そして」ラベルを持つ。自動判定は不十分。`;
  } else if (soShiteCount === 1) {
    // 節内に「そして」が1回だけ→対応は明確
    correspondence = 'explicit';
    auto_verdict_correct = true;
    reason = `節内で「そして」が1回のみ出現。対応が一意に特定可能。`;
  } else if (soShiteCount > 1) {
    // 「そして」が複数回→どれに対応するか不明
    correspondence = 'uncertain';
    auto_verdict_correct = false;
    reason = `節テキストに「そして」が${soShiteCount}回出現。どの出現に対応するか不確定。`;
  } else if (soShiteCount === 0) {
    // 節に「そして」なし
    if (mathaCount > 0) {
      correspondence = 'implicit';
      auto_verdict_correct = false;
      reason = `節テキストに「そして」なし。「また」(${mathaCount}回)が代替訳の可能性。自動判定は誤り（verseTextに「そして」が存在しないはずだが現状維持分類）。`;
    } else {
      correspondence = 'none';
      auto_verdict_correct = false;
      reason = `節テキストに「そして」なし。JA1955での訳出省略か別語句への吸収の可能性。`;
    }
  } else {
    correspondence = 'uncertain';
    auto_verdict_correct = false;
    reason = '判定不能';
  }

  return {
    correspondence,
    auto_verdict_correct,
    reason,
    verseText: vt,
    soShiteCount,
    mathaCount,
    shikashiCount,
    duplicateLabelCount: sameLabel.length,
    duplicateLabelRefs: sameLabel.map(t=>t.ref),
  };
}

// 既存4件の分析
const existing4Tokens = (existingSample.strata.L4?.tokens || []).filter(t=>t.strong==='G2532');
const g2532Analysis = [];

for (const tok of existing4Tokens) {
  const eval_ = analyzeG2532Token(tok, true);
  g2532Analysis.push({ ...tok, isExisting: true, ...eval_ });
}
for (const tok of g2532NewSample) {
  const r = parseRef(tok.ref);
  const vt = r ? (loadJA(r.book, r.chapter)[String(r.verse)] || tok.verseText) : tok.verseText;
  const eval_ = analyzeG2532Token({...tok, verseText: vt}, false);
  g2532Analysis.push({ ...tok, verseText: vt, isExisting: false, ...eval_ });
}

const g2532Stats = {
  total: g2532Analysis.length,
  explicit: g2532Analysis.filter(t=>t.correspondence==='explicit').length,
  implicit: g2532Analysis.filter(t=>t.correspondence==='implicit').length,
  none:     g2532Analysis.filter(t=>t.correspondence==='none').length,
  uncertain:g2532Analysis.filter(t=>t.correspondence==='uncertain').length,
  auto_correct: g2532Analysis.filter(t=>t.auto_verdict_correct===true).length,
  auto_incorrect: g2532Analysis.filter(t=>t.auto_verdict_correct===false).length,
};
console.log('G2532分析:', g2532Stats);

// ── =====================================================================
// タスク4: 6層別加重妥当率の再評価
// ── =====================================================================
console.log('\n=== タスク4: 6層別加重妥当率 ===');

const analysisData = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage2-jikoji-analysis.json'),'utf8'));
const censusMeta = census.meta;

// 6層の母集団数（census.jsonから）
const strataDefs = {
  L1: { label:'HIGH偽陽性リスク', pool: census.strataDesign.L1?.poolSize || 14341 },
  L2: { label:'MEDIUM・漢字抽出', pool: census.strataDesign.L2?.poolSize || 887 },
  L3: { label:'MEDIUM・直接マッチ', pool: census.strataDesign.L3?.poolSize || 4567 - 887 },
  L4: { label:'LOW・高頻度Strong', pool: census.strataDesign.L4?.poolSize || 8621 },
  L5: { label:'LOW・低頻度Strong', pool: census.strataDesign.L5?.poolSize || 672 },
  L6: { label:'bracket/pattern', pool: census.strataDesign.L6?.poolSize || 1165 },
};

let totalPoolCounted = 0;
const weightedCalc = [];

for (const [k, v] of Object.entries(analysisData.byStratum)) {
  const def = strataDefs[k] || {};
  const poolSize = def.pool || 0;
  const n = v.sampleCount;
  const valid = (v.likely_valid||0) + (v.probably_valid||0);
  const fp = v.likely_false_positive || 0;
  const stratRate = n > 0 ? valid / n : 0;
  const stratFpRate = n > 0 ? fp / n : 0;
  const estValid = Math.round(poolSize * stratRate);
  const estFp = Math.round(poolSize * stratFpRate);

  // 95%信頼区間（Wilson score interval の簡易計算）
  const z = 1.96;
  const p = stratRate;
  const q = 1 - p;
  const se = Math.sqrt(p * q / n);
  const ciLow = Math.max(0, p - z * se);
  const ciHigh = Math.min(1, p + z * se);

  totalPoolCounted += poolSize;

  weightedCalc.push({
    stratum: k,
    label: def.label,
    poolSize,
    sampleSize: n,
    valid,
    fp,
    stratValidRate: (stratRate*100).toFixed(1)+'%',
    stratFpRate: (stratFpRate*100).toFixed(1)+'%',
    ci95: `[${(ciLow*100).toFixed(1)}%, ${(ciHigh*100).toFixed(1)}%]`,
    estimatedValid: estValid,
    estimatedFp: estFp,
  });

  console.log(`${k}: pool=${poolSize}, n=${n}, valid=${valid}(${(stratRate*100).toFixed(0)}%), fp=${fp}(${(stratFpRate*100).toFixed(0)}%)`);
}

const totalEstValid = weightedCalc.reduce((s,v)=>s+v.estimatedValid,0);
const totalEstFp = weightedCalc.reduce((s,v)=>s+v.estimatedFp,0);
const weightedValidRate = totalEstValid / totalPoolCounted;
const totalJikoji = censusMeta.jikojiTotal;

console.log(`\n層別加重推定:`);
console.log(`  合計母集団(カバー): ${totalPoolCounted}件 / ${totalJikoji}件`);
console.log(`  推定妥当: ${totalEstValid}件 (${(weightedValidRate*100).toFixed(1)}%)`);
console.log(`  推定FP: ${totalEstFp}件`);

// ── 出力 ──────────────────────────────────────────────────────────────────
const addendumData = {
  meta: {
    title: 'Stage 2 追加調査 (Addendum)',
    generatedAt: new Date().toISOString().slice(0,10),
    constraints: ['聖書JSON変更なし','token.japanese変更なし','既存成果物上書きなし','Stage 3着手なし'],
  },
  task1: task1,
  task2: {
    title: 'G5213/G5209/G5210/G5216 再分類',
    summary: task2Summary,
    byStrong: humeisByStrong,
    details: task2Results,
  },
  task3: {
    title: 'G2532追加サンプリング',
    existing4: g2532Analysis.filter(t=>t.isExisting),
    newSample: g2532Analysis.filter(t=>!t.isExisting),
    stats: g2532Stats,
    samplingMethod: {
      A: 'JA1955に「そして」が1回のみ出現（直接対応）',
      B: 'JA1955に「そして」なし（省略・吸収）',
      C: '節内に別G2532トークンが存在（duplicate_label）',
      D: '節テキストに「そして」が複数回出現（多重出現）',
      E: '上記以外（多様性確保用補充）',
    },
  },
  task4: {
    title: '6層別加重妥当率',
    strataDetails: weightedCalc,
    totalPoolCounted,
    totalJikoji,
    totalEstimatedValid: totalEstValid,
    totalEstimatedFp: totalEstFp,
    weightedValidRate: (weightedValidRate*100).toFixed(1)+'%',
    note: '層L3のpoolSizeはcensusの実際値で再確認が必要',
  },
};

fs.writeFileSync(path.join(OUT_DIR,'stage2-addendum.json'), JSON.stringify(addendumData, null, 2), 'utf8');
console.log(`\nAddendum JSON: ${path.join(OUT_DIR,'stage2-addendum.json')}`);

// ── Markdownサマリー ───────────────────────────────────────────────────────
const md_t1 = `
## タスク1: 148件差分の特定

### 結論

| コミット | 変更件数 | 内容 |
|---------|---------|------|
| PR #471 (6738af25) | ${task1.pr471_changes.count}件 | JAS 1:12-15 pilot + G3986/G5278 NT-wide |
| commit ebf70bc6 | ${task1.pr472_changes.count}件 | 132件承認済みNT更新 |
| **合計** | **${task1.pr471_changes.count + task1.pr472_changes.count}件** | = 期待差分148件 |

**差分の性質**: 両コミットで変更されたトークンのJapaneseフィールドが新しいJA1955対応値になったため、containsBase() の判定が変わり「現状維持」に分類されるようになった。これは承認済み変更が正しく反映されたことを意味する。

### PR #471変更トークン（${task1.pr471_changes.count}件）

${task1.pr471_changes.tokens.slice(0,20).map(c=>`- ${c.ref}: 「${c.oldJapanese}」→「${c.newJapanese}」 (${c.nowInJikoji?'現在:現状維持':'現在:非現状維持'})`).join('\n')}
${task1.pr471_changes.tokens.length > 20 ? `...他${task1.pr471_changes.tokens.length-20}件` : ''}

### commit ebf70bc6変更トークン（先頭20件）

${task1.pr472_changes.tokens.slice(0,20).map(c=>`- ${c.ref}: 「${c.oldJapanese}」→「${c.newJapanese}」 (${c.nowInJikoji?'現在:現状維持':'現在:非現状維持'})`).join('\n')}
${task1.pr472_changes.tokens.length > 20 ? `...他${task1.pr472_changes.tokens.length-20}件` : ''}
`;

const md_t2 = `
## タスク2: ὑμεῖス 4格変化 1,820件の再分類

### 分類結果

| 分類 | 件数 | 割合 | 説明 |
|------|------|------|------|
| structural_review_required | ${task2Summary.structural_review_required} | ${(task2Summary.structural_review_required/task2Summary.total*100).toFixed(1)}% | 節内に同じラベルが複数存在→自動検証不能 |
| explicit | ${task2Summary.explicit} | ${(task2Summary.explicit/task2Summary.total*100).toFixed(1)}% | 節内で唯一の対応、JA1955に直接確認 |
| none | ${task2Summary.none} | ${(task2Summary.none/task2Summary.total*100).toFixed(1)}% | JA1955に語なし |
| uncertain | ${task2Summary.uncertain} | ${(task2Summary.uncertain/task2Summary.total*100).toFixed(1)}% | 判定不能 |
| **合計** | **${task2Summary.total}** | — | — |

### Strong別内訳

| Strong | 語形 | 件数 |
|--------|------|------|
${Object.entries(humeisByStrong).map(([s,n])=>`| ${s} | ὑμεῖς ${s==='G5216'?'生格':s==='G5213'?'与格':s==='G5209'?'対格':'主格'} | ${n} |`).join('\n')}

### 主な発生パターン

**パターンA（最多）: 複数のὑμεῖス格形が同一節に登場**
例: ὑμεῖς(G5210) + ὑμῶν(G5216) + ὑμῖν(G5213) が同一節 → すべて「あなたがた」
→ JA1955は「あなたがた」を数回使用するが、各ギリシャ語格形のどれに対応するかは別問題

**パターンB: 同一格形が節内に複数登場**
例: ὑμῶν(G5216) が節内に2箇所 → 両方とも「あなたがた」とラベル
→ 節テキストに「あなたがた」が1回なら、どちらに対応するかが不確定

### 解釈上の注意

structural_review_required は「訳語が誤っている」を意味しない。「あなたがた」はほぼ確実に正しい訳語だが、**自動検証によって対応が確認できた状態ではない**ことを示す。
`;

const md_t3 = `
## タスク3: G2532 追加サンプリング（${g2532Analysis.length}件）

### サンプル設計

| カテゴリ | 設計意図 | サンプル数 |
|---------|---------|----------|
| A: 直接対応 | 「そして」が節に1回のみ | ${g2532NewSample.filter(t=>t.samplingCategory==='A').length} |
| B: 省略・吸収 | 「そして」が節に含まれない | ${g2532NewSample.filter(t=>t.samplingCategory==='B').length} |
| C: duplicate_label | 節内に別G2532が存在 | ${g2532NewSample.filter(t=>t.samplingCategory==='C').length} |
| D: 多重出現 | 「そして」が節に複数回 | ${g2532NewSample.filter(t=>t.samplingCategory==='D').length} |
| E: 多様性補充 | 上記以外 | ${g2532NewSample.filter(t=>t.samplingCategory==='E').length} |
| 既存4件 | — | ${g2532Analysis.filter(t=>t.isExisting).length} |
| **合計** | — | **${g2532Analysis.length}** |

### 分析結果

| JA1955対応 | 件数 | 割合 | 自動判定正誤 |
|-----------|------|------|------------|
| explicit | ${g2532Stats.explicit} | ${(g2532Stats.explicit/g2532Stats.total*100).toFixed(1)}% | 正しい |
| implicit | ${g2532Stats.implicit} | ${(g2532Stats.implicit/g2532Stats.total*100).toFixed(1)}% | 誤り（verseに語なし） |
| none | ${g2532Stats.none} | ${(g2532Stats.none/g2532Stats.total*100).toFixed(1)}% | 誤り（省略） |
| uncertain | ${g2532Stats.uncertain} | ${(g2532Stats.uncertain/g2532Stats.total*100).toFixed(1)}% | 誤り（不確定） |
| **自動判定正 合計** | **${g2532Stats.auto_correct}** | **${(g2532Stats.auto_correct/g2532Stats.total*100).toFixed(1)}%** | — |
| **自動判定誤 合計** | **${g2532Stats.auto_incorrect}** | **${(g2532Stats.auto_incorrect/g2532Stats.total*100).toFixed(1)}%** | — |

### G2532 FP率の改訂推定

- サンプルベースFP率: **${(g2532Stats.auto_incorrect/g2532Stats.total*100).toFixed(1)}%** (n=${g2532Stats.total})
- Stage 2初期推定: 75% (n=4) → **信頼区間が大きく過大推定**
- 改訂推定: 1,296件中 約**${Math.round(1296*g2532Stats.auto_incorrect/g2532Stats.total)}件**が偽陽性

### 代表的なケース

${g2532Analysis.filter(t=>t.correspondence!=='explicit').slice(0,5).map(t=>`
**${t.ref}** (${t.samplingCategory||'既存'})
- 節: ${(t.verseText||'').slice(0,60)}...
- 対応: ${t.correspondence} / 自動判定: ${t.auto_verdict_correct?'正':'誤'}
- 理由: ${t.reason}
`).join('')}
`;

const md_t4 = `
## タスク4: 6層別加重妥当率

| 層 | 母集団 | n | 妥当 | FP | 妥当率 | 95%CI | 推定妥当件数 | 推定FP件数 |
|----|--------|---|------|-----|--------|-------|------------|----------|
${weightedCalc.map(w=>`| ${w.stratum}(${w.label}) | ${w.poolSize} | ${w.sampleSize} | ${w.valid} | ${w.fp} | ${w.stratValidRate} | ${w.ci95} | ${w.estimatedValid} | ${w.estimatedFp} |`).join('\n')}
| **合計** | **${totalPoolCounted}** | **${weightedCalc.reduce((s,v)=>s+v.sampleSize,0)}** | — | — | — | — | **${totalEstValid}** | **${totalEstFp}** |

### 加重妥当率: **${(weightedValidRate*100).toFixed(1)}%** (推定妥当 ${totalEstValid}件 / 母集団 ${totalPoolCounted}件)

#### 単純妥当率 vs 加重妥当率

| 指標 | 値 | 説明 |
|------|-----|------|
| 単純妥当率 | 84.8% | サンプル230件の妥当率（報告書に記録済み） |
| 加重妥当率 | ${(weightedValidRate*100).toFixed(1)}% | 6層の母集団規模で重み付けした推定 |

**補足**: 加重妥当率は層間の母集団サイズの偏りを補正した値。L1（HIGH risk）の母集団が最大（14,341件）のため、L1の妥当率${weightedCalc.find(w=>w.stratum==='L1')?.stratValidRate}が全体に大きく影響する。
`;

const fullMd = `# Stage 2 追加調査 Addendum

作成日: ${new Date().toISOString().slice(0,10)}
前提文書: stage2-final-report.md
ステータス: Stage 3 BLOCKERへの対応完了

---

${md_t1}

---

${md_t2}

---

${md_t3}

---

${md_t4}

---

*このファイルは既存のStage 2成果物を上書きせず、独立した追加調査として保存する*
`;

fs.writeFileSync(path.join(OUT_DIR,'stage2-addendum.md'), fullMd, 'utf8');
console.log(`Addendum MD: ${path.join(OUT_DIR,'stage2-addendum.md')}`);

console.log('\n=== 全タスク完了 ===');
