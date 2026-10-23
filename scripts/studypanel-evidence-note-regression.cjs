#!/usr/bin/env node
'use strict';

// Guard the evidence-first wording and ensure its supporting signals survive projection.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

function requireCjs(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const mod = { exports:{}, id:filePath, filename:filePath, loaded:false };
  const fn = vm.runInThisContext(`(function(module,exports,require,__dirname,__filename){\n${code}\n})`,
    { filename:filePath, displayErrors:true });
  fn(mod, mod.exports, require, path.dirname(filePath), filePath);
  return mod.exports;
}

const { ReadingFormatter } = requireCjs(path.join(PUBLIC, 'core', 'clause-analyzer.js'));
const { ReadingSupportProjection } = requireCjs(path.join(PUBLIC, 'core', 'reading-projection.js'));
const formatter = new ReadingFormatter();

const nominative = formatter.formatEvidence({
  id:'nominative.pendens', signals:['initial','resume']
});
assert.match(nominative, /文の初め近く/);
assert.match(nominative, /後の代名詞が受け直しています/);
assert.match(nominative, /本文で確かめられます/);
assert.equal(formatter.formatEvidence({
  id:'nominative.pendens', signals:['initial']
}), null, 'nominative pendens must stay silent without resumption evidence');

const imperative = formatter.formatEvidence({
  id:'infinitive.imperatival', signals:['no_finite_verb','anarthrous_inf']
});
assert.match(imperative, /ただし/);
assert.match(imperative, /命令とは決まりません/);
assert.match(imperative, /目的や補足/);
assert.doesNotMatch(imperative, /infinitive\.imperatival|nominative\.pendens|confidence|0\.\d+/);
assert.equal(formatter.formatEvidence({
  id:'infinitive.imperatival', signals:['no_finite_verb']
}), null, 'imperatival infinitive must stay silent unless both evidence signals match');

const projection = ReadingSupportProjection.build({
  tokens:[{ ref:'EPH 1:10!7', text:'ἀνακεφαλαιώσασθαι', lemma:'ἀνακεφαλαιόω', class:'verb' }],
  syntaxResults:[{ candidates:[
    { id:'infinitive.imperatival', confidence:0.6015, signals_matched:['no_finite_verb','anarthrous_inf'], signals_failed:[], wallace_ref:'', status:'active' },
    { id:'infinitive.purpose', confidence:0.55, signals_matched:['purpose_context'], signals_failed:['independent_clause'], wallace_ref:'', status:'active' }
  ] }],
  clauseResults:[],
  registry:{ getTypesForCategory:() => [{ id:'infinitive.imperatival', alternatives:['infinitive.purpose'] }] }
});
assert.ok(projection);
assert.deepEqual(projection.words[0].categories.infinitive.signals, ['no_finite_verb','anarthrous_inf']);
assert.deepEqual(projection.words[0].categories.infinitive.failedSignals, []);
assert.deepEqual(projection.words[0].alternatives[0].signals, ['purpose_context']);
assert.deepEqual(projection.words[0].alternatives[0].failedSignals, ['independent_clause']);

const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
assert.match(html, /formatEvidence\(\{/);
assert.match(html, /'verb', 'infinitive', 'discourse', 'nominative'/);

console.log('PASS: evidence formatter requires the necessary matched signals');
console.log('PASS: the imperative-infinitive note includes a caution and a contextual criterion');
console.log('PASS: Projection preserves matched and failed signals for each category and alternative');
async function testObservationRendering(id, signals, expectedText) {
  const start = html.indexOf('async function _buildObservationHTML');
  const end = html.indexOf('/* __OBSERVATION_END__ */', start);
  assert.ok(start >= 0 && end > start, 'Observation renderer source must be available');
  const source = html.slice(start, end);
  const ph = { scope:'word', priority:'high', phenomenon:id };
  const projectionForTest = {
    words:[{
      categories:{
        [id.split('.')[0]]: { id, confidence:0.6015, signals, failedSignals:[] }
      }
    }]
  };
  const sandbox = {
    _getReadingSupportProjection: async () => projectionForTest,
    _wallacePipeline: {
      rf: formatter,
      policy: {
        rules: { min_confidence:0.4, observation:{scopes:['word'],priorities:['critical','high','normal']} },
        byId: { [id]:ph }
      }
    },
    _policyScopes: x => Array.isArray(x.scope) ? x.scope : [x.scope],
    _WORD_ROLE_TEXT: {},
    _OBSERVATION_SENTENCES: {},
    _renderQuoteViaEngine: () => 'unused',
  };
  const render = vm.runInNewContext('(' + source + ')', sandbox);
  const result = await render([{ text:'token', lemma:'token' }], 0, []);
  assert.ok(result, `Observation should render for ${id}`);
  assert.match(result, expectedText);
}

async function main() {
  await testObservationRendering(
    'infinitive.imperatival',
    ['no_finite_verb','anarthrous_inf'],
    /命令とは決まりません/
  );
  await testObservationRendering(
    'nominative.pendens',
    ['initial','resume'],
    /代名詞が受け直しています/
  );
  console.log('PASS: StudyPanel Observation renders evidence-based notes for both categories');
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
