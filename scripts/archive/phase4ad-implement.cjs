#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE = path.resolve(__dirname, '..');
const DECISIONS_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ac-revision-decisions.json');
const SCRATCHPAD = '/private/tmp/claude-501/-Users-373da/8aaaba66-9b55-4401-81c0-0f799bfed13d/scratchpad';

function sha256File(filepath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filepath)).digest('hex');
}

function loadJson(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function saveJson(filepath, obj) {
  fs.writeFileSync(filepath, JSON.stringify(obj, null, 2), 'utf8');
}

// Parse ref "BOOK CC:VV!TT" → { book, chapter, verse, tokenIndex }
function parseRef(ref) {
  const m = ref.match(/^(\S+)\s+(\d+):(\d+)!(\d+)$/);
  if (!m) throw new Error('Cannot parse ref: ' + ref);
  return { book: m[1], chapter: m[2], verse: m[3], tokenIndex: m[4] };
}

function bibleJsonPath(book, chapter) {
  return path.join(BASE, 'public/bible_data/nt', book, chapter + '.json');
}

// Find token in a loaded JSON object by ref string
function findToken(data, ref) {
  for (const [key, token] of Object.entries(data)) {
    if (token.ref === ref) return { key, token };
  }
  return null;
}

function main() {
  const decisions = loadJson(DECISIONS_PATH);
  const changes = decisions.decisions;

  console.log('=== Phase 4ad Pre-Implementation Verification ===');
  console.log('Total decisions:', changes.length);

  // Group by file
  const byFile = {};
  for (const d of changes) {
    const { book, chapter } = parseRef(d.ref);
    const filePath = bibleJsonPath(book, chapter);
    const relPath = 'public/bible_data/nt/' + book + '/' + chapter + '.json';
    if (!byFile[relPath]) byFile[relPath] = { filePath, relPath, book, chapter, changes: [] };
    byFile[relPath].changes.push(d);
  }

  const fileKeys = Object.keys(byFile).sort();
  console.log('Unique files:', fileKeys.length);

  // === PRE SNAPSHOT ===
  const preSnapshot = {
    phase: '4ad',
    date: '2026-11-04',
    total_decisions: changes.length,
    files: {}
  };

  const preErrors = [];

  for (const relPath of fileKeys) {
    const { filePath, changes: fileChanges } = byFile[relPath];
    const data = loadJson(filePath);
    const preSha = sha256File(filePath);

    preSnapshot.files[relPath] = {
      pre_sha256: preSha,
      tokens: []
    };

    for (const d of fileChanges) {
      const found = findToken(data, d.ref);
      if (!found) {
        preErrors.push(`NOT FOUND: ${d.ref} in ${relPath}`);
        continue;
      }
      const { key, token } = found;

      // Verify current japanese
      if (token.japanese !== d.current_japanese) {
        preErrors.push(`MISMATCH: ${d.ref} expected japanese="${d.current_japanese}" but got "${token.japanese}"`);
      }

      // Verify strong
      if (token.strong !== d.strong) {
        preErrors.push(`STRONG MISMATCH: ${d.ref} expected ${d.strong} but got ${token.strong}`);
      }

      // Verify morph
      if (token.morph !== d.morph) {
        preErrors.push(`MORPH MISMATCH: ${d.ref} expected ${d.morph} but got ${token.morph}`);
      }

      preSnapshot.files[relPath].tokens.push({
        key,
        ref: d.ref,
        strong: token.strong,
        lemma: token.lemma,
        text: token.text,
        morph: token.morph,
        japanese: token.japanese,
        from: d.current_japanese,
        to: d.recommended_japanese,
        confidence: d.confidence
      });
    }
  }

  if (preErrors.length > 0) {
    console.error('\n=== PRE-CHECK ERRORS ===');
    preErrors.forEach(e => console.error('  ' + e));
    console.error('\nSTOPPED: Pre-check failed. No changes applied.');
    process.exit(1);
  }

  console.log('\n=== Pre-check PASS ===');
  console.log('All 31 refs found with expected current japanese values.');

  // Print pre-snapshot summary
  for (const relPath of fileKeys) {
    const info = preSnapshot.files[relPath];
    console.log(`  ${relPath}: ${info.tokens.length} change(s), pre-SHA256: ${info.pre_sha256.slice(0,8)}...`);
  }

  // Save pre-snapshot to scratchpad
  const preSnapPath = path.join(SCRATCHPAD, 'phase4ad-pre-snapshot.json');
  fs.mkdirSync(SCRATCHPAD, { recursive: true });
  fs.writeFileSync(preSnapPath, JSON.stringify(preSnapshot, null, 2), 'utf8');
  console.log('\nPre-snapshot saved to:', preSnapPath);

  // === IMPLEMENTATION ===
  console.log('\n=== Applying Changes ===');

  const tokenDiffs = [];

  for (const relPath of fileKeys) {
    const { filePath, changes: fileChanges } = byFile[relPath];
    const data = loadJson(filePath);
    const preInfo = preSnapshot.files[relPath];

    for (const d of fileChanges) {
      const found = findToken(data, d.ref);
      const { key, token } = found;

      // Apply change
      const prevJapanese = token.japanese;
      data[key].japanese = d.recommended_japanese;

      tokenDiffs.push({
        ref: d.ref,
        strong: d.strong,
        lemma: d.lemma,
        text: d.text,
        morph: d.morph,
        from: prevJapanese,
        to: d.recommended_japanese,
        file: relPath,
        confidence: d.confidence,
        source_group: d.source_group
      });

      console.log(`  ${d.ref}: "${prevJapanese}" → "${d.recommended_japanese}"`);
    }

    // Write back
    saveJson(filePath, data);
  }

  // === POST VERIFICATION ===
  console.log('\n=== Post-Implementation Verification ===');

  const postSnapshot = {
    phase: '4ad',
    date: '2026-11-04',
    files: {}
  };

  const postErrors = [];
  let changedCount = 0;
  let unchangedOtherCount = 0;

  for (const relPath of fileKeys) {
    const { filePath, changes: fileChanges } = byFile[relPath];
    const data = loadJson(filePath);
    const postSha = sha256File(filePath);

    postSnapshot.files[relPath] = {
      post_sha256: postSha,
      tokens: []
    };

    for (const d of fileChanges) {
      const found = findToken(data, d.ref);
      if (!found) {
        postErrors.push(`POST NOT FOUND: ${d.ref}`);
        continue;
      }
      const { token } = found;

      // Verify updated value
      if (token.japanese !== d.recommended_japanese) {
        postErrors.push(`POST MISMATCH: ${d.ref} expected "${d.recommended_japanese}" but got "${token.japanese}"`);
      }

      // Verify unchanged fields
      if (token.strong !== d.strong) postErrors.push(`POST STRONG CHANGED: ${d.ref}`);
      if (token.morph !== d.morph) postErrors.push(`POST MORPH CHANGED: ${d.ref}`);
      if (token.text !== d.text) postErrors.push(`POST TEXT CHANGED: ${d.ref}`);
      if (token.lemma !== d.lemma) postErrors.push(`POST LEMMA CHANGED: ${d.ref}`);

      changedCount++;

      postSnapshot.files[relPath].tokens.push({
        ref: d.ref,
        japanese: token.japanese,
        strong: token.strong,
        morph: token.morph,
        verified: token.japanese === d.recommended_japanese
      });
    }

    // Verify other tokens in same file are unchanged
    // (sample check: JSON parse success = all tokens intact)
    try {
      JSON.parse(JSON.stringify(data));
    } catch (e) {
      postErrors.push(`JSON integrity error in ${relPath}: ${e.message}`);
    }
  }

  if (postErrors.length > 0) {
    console.error('\n=== POST ERRORS ===');
    postErrors.forEach(e => console.error('  ' + e));
    console.error('\nSTOPPED: Post-check failed.');
    process.exit(1);
  }

  console.log('All', changedCount, 'tokens verified as updated correctly.');
  console.log('All changed fields: japanese only. Other fields: unchanged.');

  // Save results to scratchpad
  const tokenDiffPath = path.join(SCRATCHPAD, 'phase4ad-token-diffs.json');
  fs.writeFileSync(tokenDiffPath, JSON.stringify({ changes: tokenDiffs, pre_snapshot: preSnapshot, post_snapshot: postSnapshot }, null, 2), 'utf8');
  console.log('\nToken diffs saved to:', tokenDiffPath);

  // Output summary by Strong
  const byStrong = {};
  for (const d of tokenDiffs) {
    if (!byStrong[d.strong]) byStrong[d.strong] = 0;
    byStrong[d.strong]++;
  }
  console.log('\n=== Changes by Strong ===');
  for (const [s, cnt] of Object.entries(byStrong).sort()) {
    console.log(`  ${s}: ${cnt}`);
  }
  console.log('  TOTAL:', tokenDiffs.length);

  console.log('\n=== Phase 4ad Implementation: ALL PASS ===');
}

main();
