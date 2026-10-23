#!/usr/bin/env node
'use strict';

// Compare genitive.source / genitive.separation candidate presence and evidence
// between the pre-evidence-gate analyzer and the current analyzer over the NT.
// This is an audit aid, not a grammatical gold standard.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PUBLIC = path.resolve(__dirname, '..', 'public');
const BASELINE = path.resolve(process.argv.find(a => a.startsWith('--baseline-dir='))?.split('=').slice(1).join('=') || 'baseline-pre-gate');
const TARGET_TYPES = ['genitive.source', 'genitive.separation'];
const TENSE = { P:'present', I:'imperfect', F:'future', A:'aorist', X:'perfect', Z:'pluperfect' };
const VOICE = { A:'active', M:'middle', P:'passive', D:'middle deponent', E:'middle or passive', N:'middle or passive' };
const MOOD = { I:'indicative', S:'subjunctive', O:'optative', M:'imperative', N:'infinitive', P:'participle' };
const CASE = { N:'nominative', G:'genitive', D:'dative', A:'accusative', V:'vocative' };
const NUMBER = { S:'singular', P:'plural' };
const GENDER = { M:'masculine', F:'feminine', N:'neuter' };
const CLASS_POS = { verb:'V', noun:'N', adjective:'A', adj:'A', article:'T', det:'T', preposition:'P', prep:'P', conjunction:'C', conj:'C', adverb:'D', adv:'D', particle:'X', ptcl:'X', pronoun:'R', pron:'R' };
global.entryPosCode = e => !e || typeof e !== 'object' ? '' : e.pos ? String(e.pos).replace(/-$/, '').toUpperCase() : CLASS_POS[String(e.class || '').toLowerCase()] || '';
global.decodeMorph = e => {
  if (!e || typeof e !== 'object') return {};
  const n = v => (!v || v === '-') ? '' : v;
  if (e.tense || e.mood || e.voice) return { pos:global.entryPosCode(e), tense:n(e.tense), voice:n(e.voice), mood:n(e.mood), case:n(e.case), number:n(e.number), gender:n(e.gender), person:n(e.person) };
  const parts = (typeof e.morph === 'string' ? e.morph : '').split('-');
  const pos = n(e.pos || parts[0] || '').replace(/-$/, '');
  if (String(pos).toUpperCase() === 'V' && parts[1]) { const s=parts[1], o=/^[0-9]/.test(s)?1:0; return {pos,tense:TENSE[s[o]]||'',voice:VOICE[s[o+1]]||'',mood:MOOD[s[o+2]]||'',person:s[o+3]||'',number:NUMBER[s[o+4]]||'',gender:'',case:''}; }
  if (parts[1]) { const s=parts[1], hp=['1','2','3'].includes(s[0]), b=hp?s.slice(1):s; return {pos,tense:'',voice:'',mood:'',person:hp?s[0]:'',case:CASE[b[0]]||'',number:NUMBER[b[1]]||'',gender:GENDER[b[2]]||''}; }
  return {pos,tense:'',voice:'',mood:'',person:'',case:'',number:'',gender:''};
};
global.cleanText = e => String((e && typeof e === 'object') ? (e.word || e.normalized || e.text || '') : e || '').replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g, '').trim();
function requireCjs(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const mod = { exports:{}, id:filePath, filename:filePath, loaded:false };
  const fn = vm.runInThisContext(`(function(module,exports,require,__dirname,__filename){\n${code}\n})`, {filename:filePath,displayErrors:true});
  fn(mod,mod.exports,require,path.dirname(filePath),filePath);
  return mod.exports;
}
const loadJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const books = loadJson(path.join(PUBLIC, 'books.json'));
const currentMod = requireCjs(path.join(PUBLIC, 'core', 'syntax-analyzer.js'));
const baselineMod = requireCjs(path.join(BASELINE, 'public/core/syntax-analyzer.js'));
const current = new currentMod.SyntaxAnalyzer(loadJson(path.join(PUBLIC, 'assets/data/syntax-registry.json')));
const baseline = new baselineMod.SyntaxAnalyzer(loadJson(path.join(BASELINE, 'public/assets/data/syntax-registry.json')));
const counts = { baseline:{}, current:{} };
const added = [];
const removed = [];
const candidateDetails = c => ({ id:c.id, confidence:c.confidence ?? null, rawScore:c.raw_score ?? c.rawScore ?? null, signals:(c.signals_matched || []).map(s => s && s.id || String(s)) });
function collect(analyzer, tokens) {
  const map = new Map();
  const all = analyzer.analyzeAll(tokens);
  for (let i=0;i<all.results.length;i++) {
    const token=tokens[i], row=all.results[i];
    if (!token?.ref || !row?.output) continue;
    for (const c of row.output.candidates || []) if (TARGET_TYPES.includes(c.id)) {
      const key=token.ref;
      if (!map.has(key)) map.set(key,{token:{ref:key,tokenId:token.tokenId||token.globalIdx||null,text:token.text||token.normalized||'',lemma:token.lemma||null,morph:token.morph||'',decoded:global.decodeMorph(token)},candidates:{}});
      map.get(key).candidates[c.id]=candidateDetails(c);
      counts[analyzer===baseline?'baseline':'current'][c.id]=(counts[analyzer===baseline?'baseline':'current'][c.id]||0)+1;
    }
  }
  return map;
}
let booksCount=0, chaptersCount=0, versesCount=0, tokensCount=0;
for (const book of books.NT) {
  booksCount++;
  for (let ch=1;ch<=book.chapters;ch++) {
    const file=path.join(PUBLIC,'bible_data',books.corpora.NT,book.key,`${ch}.json`);
    if (!fs.existsSync(file)) throw new Error('Missing NT chapter: '+book.key+' '+ch);
    chaptersCount++;
    const tokens=loadJson(file), verses=new Map();
    for (const t of tokens) { if(!t.ref) continue; const ref=t.ref.split('!')[0]; if(!verses.has(ref)) verses.set(ref,[]); verses.get(ref).push(t); }
    for (const verseTokens of verses.values()) {
      versesCount++; tokensCount+=verseTokens.length;
      const b=collect(baseline,verseTokens), c=collect(current,verseTokens);
      const keys=new Set([...b.keys(),...c.keys()]);
      for(const key of keys) {
        const before=b.get(key), after=c.get(key);
        for(const id of TARGET_TYPES) {
          const had=!!before?.candidates[id], has=!!after?.candidates[id];
          if(had===has) continue;
          const row={type:id,ref:key,token:(after||before).token,before:before?.candidates[id]||null,after:after?.candidates[id]||null};
          (has?added:removed).push(row);
        }
      }
    }
  }
}
const report={purpose:'Token-level candidate presence comparison; not a correctness verdict',baselineRef:'43d34c6161e20e87814041c9d122528b00293693',coverage:{books:booksCount,chapters:chaptersCount,verses:versesCount,tokens:tokensCount},counts,delta:Object.fromEntries(TARGET_TYPES.map(id=>[id,{baseline:counts.baseline[id]||0,current:counts.current[id]||0,change:(counts.current[id]||0)-(counts.baseline[id]||0)}])),added,removed};
fs.writeFileSync('studypanel-genitive-delta-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({coverage:report.coverage,delta:report.delta,added:added.length,removed:removed.length,reportFile:'studypanel-genitive-delta-report.json'},null,2));
