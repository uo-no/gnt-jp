#!/usr/bin/env node
'use strict';

// R-f RF-1 (design 案1: 分離の正式化＋ドリフトガード).
//
// Two token systems intentionally coexist:
//   - runtime canonical:  public/css/tokens.css        (the app's only token source)
//   - design record:      design-system/project/tokens.css (generated from tokens.json,
//                         exported from the Design System artifact; no code reads it)
//
// They are separate systems with mostly different names, but a handful of
// custom properties share the same name in both files. Those same-name tokens
// are expected to carry the same value; if one side is edited without the
// other, the values silently drift. This script compares every same-name
// token after resolving var() aliases within each file, and fails on any
// mismatch so the drift is noticed. It never rewrites either file: which side
// to move is a design decision (see design-system/project/runtime-token-mapping.md).
//
// Usage: node scripts/check-tokens.cjs   (run from the repository root)

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const RUNTIME_PATH = path.join(ROOT, 'public/css/tokens.css');
const DESIGN_PATH = path.join(ROOT, 'design-system/project/tokens.css');

// Collect custom property declarations from a CSS file.
// Comments are stripped first (design tokens.css annotates values with
// trailing /* ... */ notes). Later declarations win, mirroring the cascade
// for equal-specificity :root rules.
function parseCustomProperties(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const props = new Map();
  const re = /(--[A-Za-z0-9-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    props.set(m[1], m[2].trim());
  }
  return props;
}

// Resolve var(--x) references using the file's own definitions, recursively.
// Returns { value } on success or { unresolved: '--x' } when a referenced
// name is not defined in the same file, or a cycle is detected.
function resolveValue(props, raw, seen = new Set()) {
  let value = raw;
  for (let depth = 0; depth < 20; depth++) {
    const ref = /var\(\s*(--[A-Za-z0-9-]+)\s*\)/.exec(value);
    if (!ref) return { value };
    const name = ref[1];
    if (seen.has(name) || !props.has(name)) return { unresolved: name };
    seen.add(name);
    value = value.slice(0, ref.index) + props.get(name) + value.slice(ref.index + ref[0].length);
  }
  return { unresolved: 'var() chain too deep' };
}

// Comparison normalization: values are compared as CSS authors write them,
// ignoring letter case (hex colors, keywords) and whitespace differences
// (alignment padding in public/css/tokens.css, spacing after commas).
function normalize(value) {
  return value.toLowerCase().replace(/\s+/g, ' ').replace(/,\s/g, ',').trim();
}

function main() {
  for (const p of [RUNTIME_PATH, DESIGN_PATH]) {
    if (!fs.existsSync(p)) {
      console.error(`check-tokens: missing file: ${path.relative(ROOT, p)}`);
      process.exit(1);
    }
  }
  const runtime = parseCustomProperties(fs.readFileSync(RUNTIME_PATH, 'utf8'));
  const design = parseCustomProperties(fs.readFileSync(DESIGN_PATH, 'utf8'));

  const sameName = [...runtime.keys()].filter(name => design.has(name)).sort();
  if (sameName.length === 0) {
    console.error('check-tokens: no same-name tokens found — the two files may have been renamed or emptied; investigate before trusting this guard.');
    process.exit(1);
  }

  const failures = [];
  for (const name of sameName) {
    const r = resolveValue(runtime, runtime.get(name));
    const d = resolveValue(design, design.get(name));
    if (r.unresolved || d.unresolved) {
      failures.push(`${name}: unresolved alias (runtime: ${r.unresolved || 'ok'}, design: ${d.unresolved || 'ok'})`);
      continue;
    }
    if (normalize(r.value) !== normalize(d.value)) {
      failures.push(`${name}: runtime "${r.value.trim()}" != design "${d.value.trim()}"`);
    }
  }

  if (failures.length > 0) {
    console.error(`check-tokens: FAIL — ${failures.length}/${sameName.length} same-name token(s) drifted:`);
    for (const f of failures) console.error(`  - ${f}`);
    console.error('Decide which side is correct as a design decision; do not auto-copy values. See design-system/project/runtime-token-mapping.md.');
    process.exit(1);
  }
  console.log(`check-tokens: PASS — ${sameName.length} same-name tokens agree between public/css/tokens.css and design-system/project/tokens.css (aliases resolved).`);
}

main();
