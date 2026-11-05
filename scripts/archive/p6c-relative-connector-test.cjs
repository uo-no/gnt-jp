#!/usr/bin/env node
/**
 * p6c-relative-connector-test.cjs — P6-C Relative-Clause Connector 検証
 *
 * 実行: node scripts/p6c-relative-connector-test.cjs
 *       node scripts/p6c-relative-connector-test.cjs --verbose
 *
 * §1  _isNominalMorph ユニットテスト
 * §2  deriveRelativeConnectors — 負例5件（必ず connector 0件）
 * §3  deriveRelativeConnectors — 正例（JHN 1 実データ）
 * §4  deriveRelativeConnectors — SR tree walk 検証（COL 1 実データ）
 *
 * API: deriveRelativeConnectors(sentenceRoot, bdById)  — 2引数（Phase 2以降）
 *   bdById: Map<verseId, bdToken>  — 代名詞トークンも含む
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const VERBOSE = process.argv.includes('--verbose');
const PUBLIC  = path.resolve(__dirname, '..', 'public');

// ── dg-engine.js ロード ──────────────────────────────────────────────────────
// dg-engine.js は browser IIFE: assigns to global.DgEngine
{
  const code = fs.readFileSync(path.join(PUBLIC, 'core', 'dg-engine.js'), 'utf8');
  vm.runInThisContext(code, { filename: 'dg-engine.js', displayErrors: true });
}
const { deriveRelativeConnectors } = global.DgEngine;

// ── テストユーティリティ ──────────────────────────────────────────────────────
let PASS = 0, FAIL = 0;
function check(label, cond, detail) {
  if (cond) {
    if (VERBOSE) console.log(`  PASS  ${label}`);
    PASS++;
  } else {
    console.log(`  FAIL  ${label}${detail ? '  — ' + detail : ''}`);
    FAIL++;
  }
}
function section(t) { console.log(`\n${'='.repeat(60)}\n${t}\n${'='.repeat(60)}`); }

function loadJson(absPath) {
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

// ── §1  _isNominalMorph ユニットテスト ────────────────────────────────────────
// _isNominalMorph は内部関数なので、deriveRelativeConnectors を使って間接テスト。
// bdById に代名詞トークンと対象トークンの両方を格納する（Phase 2 2引数 API）。
section('§1  _isNominalMorph — morph フィルタ検証');

function makeSrRoot(pronVerseId) {
  // Minimal SR subtree: sentence > clause > token(relative pronoun)
  // evidence.nodeId = verseId（Phase 2 canonical identity）
  return {
    type: 'clause',
    children: [{
      type: 'token',
      text: 'ὅς',
      evidence: { morph_raw: 'R-NSM', ref: 'TEST 1:1!99', nodeId: pronVerseId },
      function: { canonical: 'SUBJECT' },
    }],
  };
}

const morphCases = [
  { morph: 'N-NSM',     pass: true,  label: 'N-NSM (noun nominative masculine)' },
  { morph: 'N-GSM',     pass: true,  label: 'N-GSM (noun genitive masculine)' },
  { morph: 'A-NSM',     pass: true,  label: 'A-NSM (adjective/numeral)' },
  { morph: 'V-PAP-NSM', pass: true,  label: 'V-PAP-NSM (participle active present)' },
  { morph: 'V-AAP-NSM', pass: true,  label: 'V-AAP-NSM (participle aorist)' },
  { morph: 'V-PAI-3S',  pass: false, label: 'V-PAI-3S (finite indicative) → R4 EXCLUDE' },
  { morph: 'V-PAS-1P',  pass: false, label: 'V-PAS-1P (finite subjunctive) → R4 EXCLUDE' },
  { morph: 'V-PAM-2S',  pass: false, label: 'V-PAM-2S (finite imperative) → R4 EXCLUDE' },
  { morph: 'T-NSM',     pass: false, label: 'T-NSM (article) → EXCLUDE' },
  { morph: 'D-NSM',     pass: false, label: 'D-NSM (demonstrative) → EXCLUDE' },
  { morph: 'C-',        pass: false, label: 'C- (conjunction) → EXCLUDE' },
  { morph: null,        pass: false, label: 'null morph → EXCLUDE' },
];

for (const { morph, pass, label } of morphCases) {
  const pronId  = 'n99001001001';
  const targetId = 'n99001001002';
  const relTok    = { ref: 'TEST 1:1!99', verseId: pronId,   morph: 'R-NSM', referent: targetId };
  const targetTok = { ref: 'TEST 1:1!1',  verseId: targetId, morph: morph || undefined };
  // bdById includes BOTH pronoun and target tokens (Phase 2: no bdByRef)
  const bdById    = new Map([[pronId, relTok], [targetId, targetTok]]);
  const sr        = makeSrRoot(pronId);
  const cons      = deriveRelativeConnectors(sr, bdById);
  check(`_isNominalMorph(${JSON.stringify(morph)}) → ${pass}`, (cons.length > 0) === pass, label);
}

// ── §2  負例5件（必ず connector 0件）────────────────────────────────────────────
section('§2  Negative fixtures — connector = 0 件 (MANDATORY)');

// A. relative pronoun → finite verb
{
  const pronId  = 'n43001013001';
  const targetId = 'n99000001000';
  const relTok    = { ref: 'JHN 1:13!1', verseId: pronId,   morph: 'R-NPM', referent: targetId };
  const targetTok = { ref: 'JHN 1:12!3', verseId: targetId, morph: 'V-2AAI-3P', text: 'ἔλαβον' };
  const bdById    = new Map([[pronId, relTok], [targetId, targetTok]]);
  const sr        = makeSrRoot(pronId);
  const cons      = deriveRelativeConnectors(sr, bdById);
  check('A. relative pronoun → finite verb (R4 V-2AAI-3P) → connector 0', cons.length === 0,
        JSON.stringify(cons));
}

// B. relative pronoun → multi-token referent (space-separated)
{
  const pronId = 'n45016004001';
  const relTok = { ref: 'ROM 16:4!1', verseId: pronId, morph: 'R-NPM',
                   referent: 'n45016003002 n45016003004' };
  const bdById  = new Map([[pronId, relTok]]);
  const sr      = makeSrRoot(pronId);
  const cons    = deriveRelativeConnectors(sr, bdById);
  check('B. relative pronoun → multi-token referent (space in referent) → connector 0', cons.length === 0,
        JSON.stringify(cons));
}

// C. relative pronoun → missing target (referent points to unknown nodeId)
{
  const pronId  = 'n99001001005';
  const relTok  = { ref: 'TEST 1:1!5', verseId: pronId, morph: 'R-NSM', referent: 'n99UNKNOWN' };
  const bdById  = new Map([[pronId, relTok]]);  // target not present
  const sr      = makeSrRoot(pronId);
  const cons    = deriveRelativeConnectors(sr, bdById);
  check('C. relative pronoun → missing target (bdById miss) → connector 0', cons.length === 0,
        JSON.stringify(cons));
}

// D. relative pronoun → non-nominal target (adverb)
{
  const pronId   = 'n99001001006';
  const targetId = 'n99001001007';
  const relTok    = { ref: 'TEST 1:1!6', verseId: pronId,   morph: 'R-NSM', referent: targetId };
  const targetTok = { ref: 'TEST 1:1!2', verseId: targetId, morph: 'D-', text: 'ἐκεῖ' };
  const bdById    = new Map([[pronId, relTok], [targetId, targetTok]]);
  const sr        = makeSrRoot(pronId);
  const cons      = deriveRelativeConnectors(sr, bdById);
  check('D. relative pronoun → non-nominal target (D- adverb) → connector 0', cons.length === 0,
        JSON.stringify(cons));
}

// E. relative pronoun without referent
{
  const pronId = 'n43001027005';
  const relTok = { ref: 'JHN 1:27!5', verseId: pronId, morph: 'R-GSM', referent: null };
  const bdById = new Map([[pronId, relTok]]);
  const sr     = makeSrRoot(pronId);
  const cons   = deriveRelativeConnectors(sr, bdById);
  check('E. relative pronoun without referent (free relative) → connector 0', cons.length === 0,
        JSON.stringify(cons));
}

// ── §3  正例 — JHN 1 実データ ────────────────────────────────────────────────
section('§3  Positive cases — JHN 1 実データ');

// Load bible_data for JHN 1
const jhn1BdPath = path.join(PUBLIC, 'bible_data', 'NT', 'JHN', '1.json');
let jhn1Bd = [];
try {
  jhn1Bd = loadJson(jhn1BdPath);
} catch (e) {
  console.log(`  SKIP  bible_data not found: ${jhn1BdPath}`);
}

if (jhn1Bd.length > 0) {
  const bdByRef = new Map(jhn1Bd.filter(w => w.ref).map(w => [w.ref, w]));
  const bdById  = new Map(jhn1Bd.filter(w => w.verseId).map(w => [w.verseId, w]));

  // Load SR for JHN 1
  const jhn1SrPath = path.join(PUBLIC, 'assets', 'data', 'sr', 'JHN', '1.json');
  let jhn1Sr = null;
  try {
    jhn1Sr = loadJson(jhn1SrPath);
  } catch (e) {
    console.log(`  SKIP  SR not found: ${jhn1SrPath}`);
  }

  if (jhn1Sr && jhn1Sr.sentences) {
    let totalConnectors = 0;
    for (const sentence of jhn1Sr.sentences) {
      const cons = deriveRelativeConnectors(sentence.root || sentence, bdById);
      totalConnectors += cons.length;
      if (cons.length > 0 && VERBOSE) {
        for (const c of cons) {
          console.log(`    connector: ${c.relPronText} (${c.relPronRef}) → ${c.targetText} (${c.targetRef})`);
        }
      }
    }
    check(`JHN 1 全センテンス: connector 総数 > 0`, totalConnectors > 0,
          `total=${totalConnectors}`);
    if (VERBOSE) console.log(`    JHN 1 total connectors: ${totalConnectors}`);

    // Spot-check: JHN 1:9!6 ὃ → φῶς (N-NSN) expected
    // bdByRef kept for diagnostic token lookup (not passed to engine)
    const v9ref   = 'JHN 1:9!6';
    const v9Tok   = bdByRef.get(v9ref);
    const v9cons  = [];
    for (const sentence of jhn1Sr.sentences) {
      const cons = deriveRelativeConnectors(sentence.root || sentence, bdById);
      for (const c of cons) {
        if (c.relPronRef === v9ref) v9cons.push(c);
      }
    }
    if (v9Tok && v9Tok.referent) {
      const targetBd = bdById.get(v9Tok.referent);
      const targetMorph = targetBd ? targetBd.morph : 'unknown';
      const isNominal   = targetMorph && (
        targetMorph.startsWith('N-') ||
        targetMorph.startsWith('A-') ||
        (targetMorph.startsWith('V-') && targetMorph.length > 4 && targetMorph[4] === 'P')
      );
      if (isNominal) {
        check(`JHN 1:9!6 (ὃ → referent=${v9Tok.referent} morph=${targetMorph}) → connector あり`,
              v9cons.length > 0, `connectors=${JSON.stringify(v9cons)}`);
      } else {
        check(`JHN 1:9!6 → morph ${targetMorph} = non-nominal → connector なし (correct)`,
              v9cons.length === 0, `connectors=${JSON.stringify(v9cons)}`);
      }
    } else {
      if (VERBOSE) console.log(`    JHN 1:9!6 not found in bdByRef or no referent — skipping spot-check`);
    }

    // Verify finite verb referent cases return 0 connectors
    const r4Refs = ['JHN 1:13!1'];
    for (const ref of r4Refs) {
      const tok = bdByRef.get(ref);
      if (!tok || !tok.referent) continue;
      const targetTok = bdById.get(tok.referent);
      if (!targetTok) continue;
      if (targetTok.morph && (targetTok.morph.startsWith('V-') && targetTok.morph.length > 4 && targetTok.morph[4] !== 'P')) {
        // This is a finite verb case — verify no connector was produced
        const produced = [];
        for (const sentence of jhn1Sr.sentences) {
          const cons = deriveRelativeConnectors(sentence.root || sentence, bdById);
          for (const c of cons) {
            if (c.relPronRef === ref) produced.push(c);
          }
        }
        check(`R4 finite verb: ${ref} → no connector (morph=${targetTok.morph})`,
              produced.length === 0, `produced=${JSON.stringify(produced)}`);
      }
    }
  }
}

// ── §4  正例 — COL 1 実データ ────────────────────────────────────────────────
section('§4  Positive cases — COL 1 実データ');

const col1BdPath = path.join(PUBLIC, 'bible_data', 'NT', 'COL', '1.json');
const col1SrPath = path.join(PUBLIC, 'assets', 'data', 'sr', 'COL', '1.json');

let col1Bd = [], col1Sr = null;
try { col1Bd = loadJson(col1BdPath); } catch (_) {}
try { col1Sr = loadJson(col1SrPath); } catch (_) {}

if (col1Bd.length > 0 && col1Sr && col1Sr.sentences) {
  const bdByRef = new Map(col1Bd.filter(w => w.ref).map(w => [w.ref, w]));
  const bdById  = new Map(col1Bd.filter(w => w.verseId).map(w => [w.verseId, w]));

  let totalCons = 0;
  for (const sentence of col1Sr.sentences) {
    const cons = deriveRelativeConnectors(sentence.root || sentence, bdById);
    totalCons += cons.length;
    if (cons.length > 0 && VERBOSE) {
      for (const c of cons) {
        console.log(`    connector: ${c.relPronText} (${c.relPronRef}) → ${c.targetText} (${c.targetRef})`);
      }
    }
  }
  // COL 1:15 ὅς → υἱοῦ (cross-verse): expect connector
  const col15ref = 'COL 1:15!1';
  const col15tok = bdByRef.get(col15ref);
  const col15cons = [];
  for (const sentence of col1Sr.sentences) {
    const cons = deriveRelativeConnectors(sentence.root || sentence, bdById);
    for (const c of cons) { if (c.relPronRef === col15ref) col15cons.push(c); }
  }

  check(`COL 1 全センテンス: connector 総数 > 0`, totalCons > 0, `total=${totalCons}`);
  if (col15tok && col15tok.referent) {
    const targetBd = bdById.get(col15tok.referent);
    const targetMorph = targetBd ? targetBd.morph : null;
    if (VERBOSE) console.log(`    COL 1:15!1 referent=${col15tok.referent} targetMorph=${targetMorph} targetText=${targetBd && targetBd.text}`);
    check(`COL 1:15!1 (ὅς cross-verse) → connector あり (referent=${col15tok.referent})`,
          col15cons.length > 0 || (targetMorph && !targetMorph.startsWith('N-') && !targetMorph.startsWith('A-')),
          `connectors=${JSON.stringify(col15cons)}`);
  } else {
    if (VERBOSE) console.log(`    COL 1:15!1 not found in bdByRef or no referent`);
    check(`COL 1:15!1 bdByRef に存在`, !!col15tok);
  }
} else {
  console.log('  SKIP  COL 1 データなし');
}

// ── §5  Bug #4 回帰 — relPronNodeId 伝播・annotation E2E ──────────────────────
// Bug #4: deriveRelativeConnectors が relPronNodeId をコネクター出力に含めなかった
//         → _connMap が undefined key に集約 → annotation が完全にスキップされていた
// 修正: connector 出力に relPronNodeId 追加、standalone rel clause DR にも relPronNodeId 設定
section('§5  Bug #4 回帰 — relPronNodeId 伝播・annotation E2E');

const { deriveDR } = global.DgEngine;

// §5-1: connector 出力に relPronNodeId が含まれる（undefined でない）
{
  const pronId   = 'n51001015001';
  const targetId = 'n51001013003';
  const srRoot5  = {
    type: 'clause',
    children: [{ type: 'token', text: 'ὅς',
      evidence: { morph_raw: 'R-NSM', ref: 'COL 1:15!1', nodeId: pronId },
      function: { canonical: 'SUBJECT' } }]
  };
  const bdById5 = new Map([
    [pronId,   { ref: 'COL 1:15!1', verseId: pronId,   morph: 'R-NSM', referent: targetId }],
    [targetId, { ref: 'COL 1:13!3', verseId: targetId, morph: 'N-GSM', text: 'υἱοῦ' }],
  ]);
  const cons5 = deriveRelativeConnectors(srRoot5, bdById5);
  check('§5-1. connector 出力に relPronNodeId が存在する（undefined でない）',
    cons5.length > 0 && cons5[0].relPronNodeId === pronId,
    `relPronNodeId=${cons5[0] && cons5[0].relPronNodeId}`);
}

// §5-2: 複数 connector が undefined key に集約されない
{
  const ids = [
    ['n43001009006', 'n43001009005', 'R-NSN', 'N-NSN'],
    ['n43001015003', 'n43001014002', 'R-NSM', 'N-NSM'],
  ];
  const bdIdxM = new Map();
  const tokens = [];
  for (const [pronId, targetId, pMorph, tMorph] of ids) {
    bdIdxM.set(pronId,   { morph: pMorph, referent: targetId });
    bdIdxM.set(targetId, { morph: tMorph, text: 'X', ref: 'X' });
    tokens.push({ type: 'token', text: 'ὅς',
      evidence: { morph_raw: pMorph, nodeId: pronId, ref: 'X' },
      function: { canonical: 'SUBJECT' } });
  }
  const srMulti = { type: 'clause', children: tokens };
  const consMulti = deriveRelativeConnectors(srMulti, bdIdxM);
  const connMapMulti = new Map(consMulti.map(c => [c.relPronNodeId, c]));
  check('§5-2. 複数 connector が全て別々の key でマップされる（undefined 集約なし）',
    consMulti.length === 2 && !connMapMulti.has(undefined) && connMapMulti.size === 2,
    `count=${consMulti.length} keys=[${[...connMapMulti.keys()]}]`);
}

// §5-3: DR adverbial clause (standalone rel) に relPronNodeId が設定される
{
  const pronId5c = 'n51001015001';
  const srAC = {
    type: 'clause',
    children: [
      { type: 'token', text: 'ἐστιν',
        evidence: { morph_raw: 'V-PAI-3S', ref: 'COL 1:15!2', nodeId: 'n51001015002' },
        function: { canonical: 'PREDICATE' } },
      { type: 'clause', children: [{
          type: 'token', text: 'ὅς',
          evidence: { morph_raw: 'R-NSM', ref: 'COL 1:15!1', nodeId: pronId5c },
          function: { canonical: 'SUBJECT' } }] }
    ]
  };
  const dr5 = deriveDR(srAC);
  const sc5 = dr5 && dr5.adverbialClauses && dr5.adverbialClauses[0];
  check('§5-3. DR standalone relative clause に relPronNodeId が設定される',
    !!(sc5 && sc5.isRelativeClause && sc5.relPronNodeId === pronId5c),
    `relPronNodeId=${sc5 && sc5.relPronNodeId}`);
  check('§5-3. annotation guard (isRelativeClause && relPronNodeId) が成立する',
    !!(sc5 && sc5.isRelativeClause && sc5.relPronNodeId),
    `isRelativeClause=${sc5 && sc5.isRelativeClause} relPronNodeId=${sc5 && sc5.relPronNodeId}`);
}

// §5-4: E2E — connector → _connMap → _annotateRelClauses → antecedentNodeId 伝播
// _annotateRelClauses は index.html 内部関数のため、ロジックを inline で再現
{
  const pronId5d   = 'n51001015001';
  const targetId5d = 'n51001013003';
  const srE2E = {
    type: 'clause',
    children: [
      { type: 'token', text: 'ἐστιν',
        evidence: { morph_raw: 'V-PAI-3S', ref: 'COL 1:15!2', nodeId: 'n51001015002' },
        function: { canonical: 'PREDICATE' } },
      { type: 'clause', children: [{
          type: 'token', text: 'ὅς',
          evidence: { morph_raw: 'R-NSM', ref: 'COL 1:15!1', nodeId: pronId5d },
          function: { canonical: 'SUBJECT' } }] }
    ]
  };
  const bdE2E = new Map([
    [pronId5d,   { ref: 'COL 1:15!1', verseId: pronId5d,   morph: 'R-NSM', referent: targetId5d }],
    [targetId5d, { ref: 'COL 1:13!3', verseId: targetId5d, morph: 'N-GSM', text: 'υἱοῦ' }],
  ]);
  const consE2E = deriveRelativeConnectors(srE2E, bdE2E);
  const drE2E   = deriveDR(srE2E);
  const scE2E   = drE2E && drE2E.adverbialClauses && drE2E.adverbialClauses[0];
  if (scE2E) {
    const connMapE2E = new Map(consE2E.map(c => [c.relPronNodeId, c]));
    if (scE2E.isRelativeClause && scE2E.relPronNodeId) {
      const conn = connMapE2E.get(scE2E.relPronNodeId);
      if (conn) {
        scE2E.antecedentText   = conn.targetText;
        scE2E.antecedentRef    = conn.targetRef;
        scE2E.antecedentNodeId = conn.targetNodeId;
      }
    }
  }
  check('§5-4. E2E: sc.antecedentNodeId が annotation パイプライン終端に伝播する',
    !!(scE2E && scE2E.antecedentNodeId === targetId5d),
    `antecedentNodeId=${scE2E && scE2E.antecedentNodeId}`);
  check('§5-4. E2E: antecedentRef（display）と antecedentNodeId（verseId）が区別される',
    !!(scE2E && scE2E.antecedentRef !== scE2E.antecedentNodeId),
    `antecedentRef=${scE2E && scE2E.antecedentRef} antecedentNodeId=${scE2E && scE2E.antecedentNodeId}`);
}

// §5-5: 実データ — JHN 1 コネクター出力に有効な relPronNodeId が含まれる
{
  const jhn1SrPath5 = path.join(PUBLIC, 'assets', 'data', 'sr', 'JHN', '1.json');
  const jhn1BdPath5 = path.join(PUBLIC, 'bible_data', 'NT', 'JHN', '1.json');
  let jhn1Sr5 = null, jhn1Bd5 = [];
  try { jhn1Sr5 = loadJson(jhn1SrPath5); } catch (_) {}
  try { jhn1Bd5 = loadJson(jhn1BdPath5); } catch (_) {}
  if (jhn1Sr5 && jhn1Bd5.length > 0) {
    const bdById5r = new Map(jhn1Bd5.filter(w => w.verseId).map(w => [w.verseId, w]));
    let undefinedKeyCount = 0, validKeyCount = 0;
    for (const sentence of jhn1Sr5.sentences) {
      const cons5r = deriveRelativeConnectors(sentence.root || sentence, bdById5r);
      for (const c of cons5r) {
        if (c.relPronNodeId == null) undefinedKeyCount++;
        else validKeyCount++;
      }
    }
    check(`§5-5. JHN 1 実データ: connector の relPronNodeId が全て valid (undefined=0)`,
      undefinedKeyCount === 0 && validKeyCount > 0,
      `valid=${validKeyCount} undefined=${undefinedKeyCount}`);
  } else {
    console.log('  SKIP  §5-5 JHN 1 データなし');
  }
}

// ── 結果 ─────────────────────────────────────────────────────────────────────
section('結果');
console.log(`PASS: ${PASS}  FAIL: ${FAIL}`);
if (FAIL > 0) {
  console.log('\n⚠  FAIL あり — index.html 実装前に確認すること');
  process.exitCode = 1;
} else {
  console.log('\n✓  All checks PASS');
}
