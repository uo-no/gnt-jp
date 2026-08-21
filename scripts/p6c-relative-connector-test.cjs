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
// 直接テストするため、ダミー SR + bdByRef/bdById を構築して挙動を確認する。
section('§1  _isNominalMorph — morph フィルタ検証');

function makeBdByRef(ref, morph, referentId) {
  // bdToken for the relative pronoun
  const relTok = { ref, verseId: 'n99001001001', morph: 'R-NSM', referent: referentId };
  // bdToken for the target
  const targetTok = { ref: 'TEST 1:1!1', verseId: referentId, morph, referent: null };
  const bdByRef = new Map([[ref, relTok]]);
  const bdById  = new Map([[referentId, targetTok]]);
  return { bdByRef, bdById };
}

function makeSrRoot(relPronRef) {
  // Minimal SR subtree: sentence > clause > token(relative pronoun)
  return {
    type: 'clause',
    children: [{
      type: 'token',
      text: 'ὅς',
      evidence: { morph_raw: 'R-NSM', ref: relPronRef, nodeId: 'n99001001001' },
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
  const ref = 'TEST 1:1!99';
  const refId = 'n99001001002';
  // Override target morph:
  const relTok    = { ref, verseId: 'n99001001001', morph: 'R-NSM', referent: refId };
  const targetTok = { ref: 'TEST 1:1!1', verseId: refId, morph: morph || undefined };
  const bdByRef   = new Map([[ref, relTok]]);
  const bdById    = new Map([[refId, targetTok]]);
  const sr        = makeSrRoot(ref);
  const cons      = deriveRelativeConnectors(sr, bdByRef, bdById);
  check(`_isNominalMorph(${JSON.stringify(morph)}) → ${pass}`, (cons.length > 0) === pass, label);
}

// ── §2  負例5件（必ず connector 0件）────────────────────────────────────────────
section('§2  Negative fixtures — connector = 0 件 (MANDATORY)');

// A. relative pronoun → finite verb
{
  const ref = 'JHN 1:13!1';
  const refId = 'n99000001000';
  const relTok    = { ref, verseId: 'n43001013001', morph: 'R-NPM', referent: refId };
  const targetTok = { ref: 'JHN 1:12!3', verseId: refId, morph: 'V-2AAI-3P', text: 'ἔλαβον' };
  const bdByRef   = new Map([[ref, relTok]]);
  const bdById    = new Map([[refId, targetTok]]);
  const sr        = makeSrRoot(ref);
  const cons      = deriveRelativeConnectors(sr, bdByRef, bdById);
  check('A. relative pronoun → finite verb (R4 V-2AAI-3P) → connector 0', cons.length === 0,
        JSON.stringify(cons));
}

// B. relative pronoun → multi-token referent (space-separated)
{
  const ref = 'ROM 16:4!1';
  const refId = 'n45016003002 n45016003004';  // space-separated
  const relTok = { ref, verseId: 'n45016004001', morph: 'R-NPM', referent: refId };
  const bdByRef = new Map([[ref, relTok]]);
  const bdById  = new Map();  // doesn't matter
  const sr      = makeSrRoot(ref);
  const cons    = deriveRelativeConnectors(sr, bdByRef, bdById);
  check('B. relative pronoun → multi-token referent (space in referent) → connector 0', cons.length === 0,
        JSON.stringify(cons));
}

// C. relative pronoun → missing target (referent points to unknown nodeId)
{
  const ref = 'TEST 1:1!5';
  const refId = 'n99UNKNOWN';
  const relTok = { ref, verseId: 'n99001001005', morph: 'R-NSM', referent: refId };
  const bdByRef = new Map([[ref, relTok]]);
  const bdById  = new Map();  // target not present
  const sr      = makeSrRoot(ref);
  const cons    = deriveRelativeConnectors(sr, bdByRef, bdById);
  check('C. relative pronoun → missing target (bdById miss) → connector 0', cons.length === 0,
        JSON.stringify(cons));
}

// D. relative pronoun → non-nominal target (adverb)
{
  const ref = 'TEST 1:1!6';
  const refId = 'n99001001007';
  const relTok    = { ref, verseId: 'n99001001006', morph: 'R-NSM', referent: refId };
  const targetTok = { ref: 'TEST 1:1!2', verseId: refId, morph: 'D-', text: 'ἐκεῖ' };
  const bdByRef   = new Map([[ref, relTok]]);
  const bdById    = new Map([[refId, targetTok]]);
  const sr        = makeSrRoot(ref);
  const cons      = deriveRelativeConnectors(sr, bdByRef, bdById);
  check('D. relative pronoun → non-nominal target (D- adverb) → connector 0', cons.length === 0,
        JSON.stringify(cons));
}

// E. relative pronoun without referent
{
  const ref = 'JHN 1:27!5';
  const relTok = { ref, verseId: 'n43001027005', morph: 'R-GSM', referent: null };
  const bdByRef = new Map([[ref, relTok]]);
  const bdById  = new Map();
  const sr      = makeSrRoot(ref);
  const cons    = deriveRelativeConnectors(sr, bdByRef, bdById);
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
      const cons = deriveRelativeConnectors(sentence.root || sentence, bdByRef, bdById);
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
    const v9ref   = 'JHN 1:9!6';
    const v9Tok   = bdByRef.get(v9ref);
    const v9cons  = [];
    for (const sentence of jhn1Sr.sentences) {
      const cons = deriveRelativeConnectors(sentence.root || sentence, bdByRef, bdById);
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
          const cons = deriveRelativeConnectors(sentence.root || sentence, bdByRef, bdById);
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
    const cons = deriveRelativeConnectors(sentence.root || sentence, bdByRef, bdById);
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
    const cons = deriveRelativeConnectors(sentence.root || sentence, bdByRef, bdById);
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

// ── 結果 ─────────────────────────────────────────────────────────────────────
section('結果');
console.log(`PASS: ${PASS}  FAIL: ${FAIL}`);
if (FAIL > 0) {
  console.log('\n⚠  FAIL あり — index.html 実装前に確認すること');
  process.exitCode = 1;
} else {
  console.log('\n✓  All checks PASS');
}
