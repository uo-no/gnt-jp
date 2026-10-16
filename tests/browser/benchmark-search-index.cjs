#!/usr/bin/env node
'use strict';

// Comparative local Chromium diagnostic; not a production-network benchmark.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../..');
const publicDir = path.join(root, 'public');
const gzipCache = new Map();
const types = { '.html':'text/html; charset=utf-8', '.json':'application/json; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml' };
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end('Bad request'); return; }
  const file = path.resolve(publicDir, '.' + pathname);
  if (!file.startsWith(publicDir + path.sep)) { res.writeHead(403).end('Forbidden'); return; }
  fs.readFile(file, (err, raw) => {
    if (err) { res.writeHead(err.code === 'ENOENT' ? 404 : 500).end('Not found'); return; }
    const type = types[path.extname(file)] || 'application/octet-stream';
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'no-store');
    if (req.headers['accept-encoding']?.includes('gzip') && raw.length > 1024 && type.includes('json')) {
      let compressed = gzipCache.get(file);
      if (!compressed) { compressed = zlib.gzipSync(raw); gzipCache.set(file, compressed); }
      res.writeHead(200, { 'Content-Encoding':'gzip', 'Vary':'Accept-Encoding' });
      res.end(compressed);
    } else { res.writeHead(200, { 'Content-Length':raw.length }); res.end(raw); }
  });
});

async function measure(mode) {
  const browser = await chromium.launch({ headless:true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const consoleLines = [];
    const failedResponses = [];
    const loaderDiagnostics = [];
    page.on('console', msg => {
      const line = msg.text();
      consoleLines.push(line);
      if (/search-index|prebuilt|Error/i.test(line)) loaderDiagnostics.push({ type:msg.type(), text:line });
    });
    page.on('response', res => { if (res.status() >= 400) failedResponses.push({ status: res.status(), url: res.url() }); });
    if (mode === 'fallback') {
      await page.route('**/search-index/meta.json', route => route.fulfill({ status:404, body:'forced fallback benchmark' }));
    }
    await page.goto('http://127.0.0.1:8765/search-tool.html', { waitUntil:'load', timeout:60000 });
    const start = Date.now();
    await page.waitForFunction(() => document.readyState === 'complete' && typeof ensureBookMasterApplied === 'function' && typeof _ensureFullIndex === 'function');
    await page.evaluate(async () => { await ensureBookMasterApplied(); });
    await page.evaluate(() => _ensureFullIndex());
    const ntReadyMs = Date.now() - start;
    await page.waitForFunction(() => typeof ALL_TOKENS !== 'undefined' && ALL_TOKENS.length >= 617364 && IDX.l3Ready, null, { timeout:300000 });
    const fullReadyMs = Date.now() - start;
    const stats = await page.evaluate(() => ({
      tokens:ALL_TOKENS.length,
      heapBytes:performance.memory?.usedJSHeapSize ?? null,
      resources:performance.getEntriesByType('resource').map(r => ({ name:r.name, bytes:r.transferSize || r.encodedBodySize || 0 }))
    }));
    const index = stats.resources.filter(r => r.name.includes('/search-index/'));
    const source = stats.resources.filter(r => !r.name.includes('/search-index/') && r.name.endsWith('.json'));
    const result = {
      mode, ntReadyMs, fullNtLxxJapaneseReadyMs:fullReadyMs, tokens:stats.tokens,
      approximateHeapMiB:stats.heapBytes == null ? null : +(stats.heapBytes / 1048576).toFixed(1),
      indexRequests:index.length, indexMiB:+(index.reduce((s,r)=>s+r.bytes,0)/1048576).toFixed(1),
      sourceJsonRequests:source.length,
      consoleTail:consoleLines.slice(-50), loaderDiagnostics, failedResponses:failedResponses.slice(0,12),
      loaderConfirmed:mode === 'prebuilt'
        ? consoleLines.some(s=>/prebuilt.*ready|ready.*prebuilt/i.test(s))
        : consoleLines.some(s=>/browser builder|fallback|building.*index/i.test(s))
    };
    await context.close();
    return result;
  } finally { await browser.close(); }
}

(async () => {
  if (!fs.existsSync(path.join(publicDir, 'search-index/meta.json'))) throw new Error('Missing generated public/search-index/meta.json');
  await new Promise((resolve,reject)=>server.listen(8765,'127.0.0.1',err=>err?reject(err):resolve()));
  try {
    for (const mode of ['prebuilt','fallback']) {
      const result = await measure(mode);
      console.log(JSON.stringify(result));
      if (!result.loaderConfirmed) throw new Error('Expected loader path was not confirmed: ' + mode + '; console=' + JSON.stringify(result.consoleTail));
      if (result.tokens !== 617364) throw new Error('Unexpected token count: ' + mode + ' ' + result.tokens);
    }
  } finally { await new Promise(resolve=>server.close(resolve)); }
})().catch(err=>{ console.error(err); process.exitCode=1; });
