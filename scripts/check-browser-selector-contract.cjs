#!/usr/bin/env node
'use strict';

// Prevent browser tests from silently retaining selectors for removed StudyPanel markup.
// Keep this lightweight and run it before Playwright browser tests in the VR-5 gate.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const appPath = path.join(ROOT, 'public/index.html');
const browserTestDir = path.join(ROOT, 'tests/browser');
const app = fs.readFileSync(appPath, 'utf8');

const requiredMarkup = [
  { label: 'morphology section data attribute', pattern: /data-study-section="morphology"/ },
  { label: 'lexical section data attribute', pattern: /data-study-section="lexical"/ },
  { label: 'Layer 3 disclosure class', pattern: /rn-l3-entry/ }
];

const retiredSelectors = [
  { selector: '#rn-level2-details', reason: '旧 Layer 3 ID。現行 UI は data-study-section 属性で特定する' }
];

const failures = [];
for (const item of requiredMarkup) {
  if (!item.pattern.test(app)) failures.push(`public/index.html: required markup contract missing: ${item.label}`);
}

const testFiles = fs.readdirSync(browserTestDir)
  .filter(name => name.endsWith('.cjs'))
  .sort();

for (const name of testFiles) {
  const fullPath = path.join(browserTestDir, name);
  const source = fs.readFileSync(fullPath, 'utf8');
  for (const item of retiredSelectors) {
    if (source.includes(item.selector)) {
      failures.push(`${path.relative(ROOT, fullPath)}: retired selector "${item.selector}" found (${item.reason})`);
    }
  }
}

if (failures.length) {
  console.error('FAIL: StudyPanel browser selector contract');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: StudyPanel browser selector contract (required markup present; ${testFiles.length} browser test files checked for retired selectors)`);
}
