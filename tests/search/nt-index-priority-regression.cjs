#!/usr/bin/env node
'use strict';

/*
 * Regression guard for search index startup priority.
 * NT must be ready before LXX/Japanese prebuilt loading is scheduled.
 */
const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('public/search-tool.html', 'utf8');
const start = html.indexOf('function _startPrebuiltLxxAndJapanese(metaVersion){');
const end = html.indexOf('\nfunction ', start + 10);
assert.notEqual(start, -1, 'deferred LXX/Japanese loader must exist');
assert.notEqual(end, -1, 'could not isolate deferred LXX/Japanese loader');
const deferred = html.slice(start, end);

assert.match(deferred, /requestIdleCallback\(\(\)=>loadLxxAndJapanese\(\),\{timeout:1500\}\)/,
  'LXX/Japanese loading must be scheduled during browser idle time');
assert.match(deferred, /setTimeout\(\(\)=>loadLxxAndJapanese\(\),250\)/,
  'browsers without requestIdleCallback must retain a delayed fallback');

const ensureStart = html.indexOf('function _ensureFullIndex(){');
const ensureEnd = html.indexOf('\nasync function loadTokensForScope', ensureStart);
assert.notEqual(ensureStart, -1, '_ensureFullIndex must exist');
assert.notEqual(ensureEnd, -1, 'could not isolate _ensureFullIndex');
const ensure = html.slice(ensureStart, ensureEnd);

const fetchNt = ensure.indexOf("await _fetchPrebuiltCorpus('NT')");
const mergeNt = ensure.indexOf('for(const shard of nt)_mergePrebuiltCorpus(shard)');
const markReady = ensure.indexOf('IDX.ready=true;', mergeNt);
const scheduleOtherCorpora = ensure.indexOf('_startPrebuiltLxxAndJapanese(meta.sourceVersion)');
assert.ok(fetchNt >= 0, 'NT prebuilt shards must be fetched');
assert.ok(mergeNt > fetchNt, 'NT shards must be merged after fetching');
assert.ok(markReady > mergeNt, 'NT must be marked ready after its shards are merged');
assert.ok(scheduleOtherCorpora > markReady,
  'LXX/Japanese loading must only be scheduled after NT is ready');
assert.ok(!ensure.slice(0, markReady).includes("_fetchPrebuiltCorpus('LXX')"),
  'LXX prebuilt loading must not start before NT is ready');

console.log('PASS: NT index startup priority and deferred LXX/Japanese loading are preserved.');
