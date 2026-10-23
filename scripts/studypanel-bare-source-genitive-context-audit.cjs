#!/usr/bin/env node
'use strict';

// Read-only audit of published bare-source-genitive examples.
// Context API values are heuristics, not validated dependency relations.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const PUBLIC = path.resolve(__dirname, '..', 'public');
const CASE = { N:'nominative', G:'genitive', D:'dative', A:'accusative', V:'vocative' };
const NUMBER = { S:'singular', P:'plural' };
const GENDER = { M:'masculine', F:'feminine', N:'neuter' };
const CLASS_POS = { verb:'V', noun:'N', adjective:'A', adj:'A', article:'T', det:'T', preposition:'P', prep:'P', conjunction:'C', conj:'C', adverb:'D', adv:'D', particle:'X', ptcl:'X', pronoun:'R', pron:'R' };
global.entryPosCode = e => !e || typeof e !== 'object' ? '' : e.pos ? String(e.pos).replace(/-$/, '').toUpperCase() : CLASS_POS[String(e.class || '').toLowerCase()] || '';
global.decodeMorph = e => {
  if (!e || typeof e !== 'object') return {};
  const n = v => (!v || v === '-') ? '' : v;
  if (e.tense || e.mood || e.voice) return {pos:global.entryPosCode(e),tense:n(e.tense),voice:n(e.voice),mood:n(e.mood),case:n(e.case),number:n(e.number),gender:n(e.gender),person:n(e.person)};
  const parts = (typeof e.morph === 'string' ? e.morph : '').split('-');
  const pos = n(e.pos || parts[0] || '').replace(/-$/, '');
  if (String(pos).toUpperCase() === 'V' && parts[1]) {
    const s=parts[1], o=/^[0-9]/.test(s)?1:0;
    const tense={P:'present',I:'imperfect',F:'future',A:'aorist',X:'perfect',Z:'pluperfect'};
    const voice={A:'active',M:'middle',P:'passive',D:'middle deponent',E:'middle or passive',N:'middle or passive'};
    const mood={I:'indicative',S:'subjunctive',O:'optative',M:'imperative',N:'infinitive',P:'participle'};
    return {pos,tense:tense[s[o]]||'',voice:voice[s[o+1]]||'',mood:mood[s[o+2]]||'',person:s[o+3]||'',number:({S:'singular',P:'plural'})[s[o+4]]||'',gender:'',case:''};
  }
  if (parts[1]) { const s=parts[1], hp=['1','2','3'].includes(s[0]), b=hp?s.slice(1):s; return {pos,tense:'',voice:'',mood:'',person:hp?s[0]:'',case:CASE[b[0]]||'',number:NUMBER[b[1]]||'',gender:GENDER[b[2]]||''}; }
  return {pos,tense:'',voice:'',mood:'',person:'',case:'',number:'',gender:''};
};
global.cleanText = e => String((e && typeof e === 'object') ? (e.word || e.normalized || e.text || '') : e || '').replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g,'').trim();
function requireCjs(filePath) {
  const code=fs.readFileSync(filePath,'utf8'), mod={exports:{},id:filePath,filename:filePath,loaded:false};
  const fn=vm.runInThisContext(`(function(module,exports,require,__dirname,__filename){\n${code}\n})`,{filename:filePath,displayErrors:true});
  fn(mod,mod.exports,require,path.dirname(filePath),filePath); return mod.exports;
}
const loadJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const books=loadJson(path.join(PUBLIC,'books.json'));
const {SyntaxAnalyzer,ContextBuilder}=requireCjs(path.join(PUBLIC,'core','syntax-analyzer.js'));
const analyzer=new SyntaxAnalyzer(loadJson(path.join(PUBLIC,'assets/data/syntax-registry.json')));
const targets=[
  {book:'2CO',chapter:11,verse:26,why:'Greenlee: κινδύνοις ποταμῶν / κινδύνοις λῃστῶν; bare genitive described as source/origin'},
  {book:'JHN',chapter:6,verse:45,why:'unfoldingWord Greek Grammar: διδακτοὶ θεοῦ; θεοῦ interpreted as source/agent'},
  {book:'LUK',chapter:19,verse:8,why:'unfoldingWord: τῶν ὑπαρχόντων; possible source/partitive overlap, not a clean positive'}
];
const posLabel={N:'noun',A:'adjective',R:'pronoun',T:'article',P:'preposition',V:'verb',D:'adverb',C:'conjunction',X:'particle'};
const report={purpose:'Context-resolution audit only; does not adjudicate the grammar or validate Context API dependencies',references:[],limitations:[
  'headNoun is nearest preceding nominal token under a simple POS/skip rule.',
  'governor/governorVerb are heuristic outputs; the implementation explicitly is not a complete dependency parser.',
  'candidate labels are classifier outputs, not gold-standard judgments.'
]};
for(const target of targets) {
  const book=books.NT.find(b=>b.key===target.book);
  if(!book) throw new Error('NT book not found: '+target.book);
  const file=path.join(PUBLIC,'bible_data',books.corpora.NT,book.key,`${target.chapter}.json`);
  const tokens=loadJson(file);
  const verseRef=`${target.book} ${target.chapter}:${target.verse}`;
  const verseTokens=tokens.filter(t=>String(t.ref||'').split('!')[0]===verseRef);
  if(!verseTokens.length) throw new Error('Verse not found: '+verseRef);
  const all=analyzer.analyzeAll(verseTokens);
  const items=[];
  for(let i=0;i<verseTokens.length;i++) {
    const token=verseTokens[i], morph=global.decodeMorph(token);
    if(morph.case!=='genitive') continue;
    const ctx=ContextBuilder.build(token,verseTokens,i,analyzer.registry);
    const row=all.results[i]?.output;
    const summarize=t=>t?{text:global.cleanText(t),lemma:t.lemma||null,pos:posLabel[global.entryPosCode(t)]||global.entryPosCode(t)||null,ref:t.ref||null,morph:t.morph||''}:null;
    items.push({
      target:summarize(token),morph,
      previous:verseTokens.slice(Math.max(0,i-2),i).map(summarize),
      next:verseTokens.slice(i+1,i+3).map(summarize),
      nearestHead:summarize(ctx.headNoun),
      // Record the actual backward scan path so a nearest-head result can be audited,
      // rather than treating that result as a validated syntactic dependency.
      headScanPath:(() => {
        const path=[];
        for(let j=i-1;j>=0;j--) {
          const t=verseTokens[j], pos=global.entryPosCode(t);
          path.push({distance:i-j,token:summarize(t),pos,
            scanAction:['N','A','R'].includes(pos)?'candidate-and-stop':
              ['T','D'].includes(pos)?'skip-and-continue':'barrier-and-stop'});
          if(['N','A','R'].includes(pos)) break;
          if(!['T','D'].includes(pos)) break;
        }
        return path;
      })(),
      // All preceding nominal tokens are context alternatives, not asserted heads.
      precedingNominalCandidates:verseTokens.slice(0,i).map((t,j)=>({t,j}))
        .filter(({t})=>['N','A','R'].includes(global.entryPosCode(t)))
        .map(({t,j})=>({distance:i-j,token:summarize(t),
          morph:global.decodeMorph(t),samePhrase:typeof ctx.samePhrase==='function'?ctx.samePhrase(j,i):null,
          candidateGovernsTarget:typeof ctx.governs==='function'?ctx.governs(j,i):null})),
      governor:ctx.governor?{token:summarize(ctx.governor.token),lemma:ctx.governor.lemma,pos:ctx.governor.pos,idx:ctx.governor.idx}:null,
      governorVerb:summarize(ctx.governorVerb),
      mainVerb:summarize(ctx.mainVerb),
      // Inspect the dependency helper itself, not only the separate governor shortcut.
      apiGovernors:typeof ctx.governs==='function'?verseTokens.map((t,j)=>ctx.governs(j,i)?{idx:j,token:summarize(t)}:null).filter(Boolean):[],
      apiDependents:typeof ctx.dependsOn==='function'?verseTokens.map((t,j)=>ctx.dependsOn(i,j)?{idx:j,token:summarize(t)}:null).filter(Boolean):[],
      phraseWithNearestHead:typeof ctx.samePhrase==='function'&&ctx.headNoun?ctx.samePhrase(i,verseTokens.indexOf(ctx.headNoun)):null,
      isAfterPrep:!!ctx.isAfterPrep,
      clause:ctx.clause?{start:ctx.clause.start,end:ctx.clause.end,mainVerb:summarize(ctx.clause.mainVerb),subordinate:ctx.clause.subordinate}:null,
      candidates:(row?.candidates||[]).filter(c=>/genitive\.(source|partitive|subjective|possessive|separation|appositional|content)/.test(c.id)).map(c=>({id:c.id,confidence:c.confidence,signals:(c.signals_matched||[]).map(s=>s&&s.id||String(s))}))
    });
  }
  report.references.push({...target,ref:verseRef,reason:target.why,verseTokens:verseTokens.map(t=>({text:global.cleanText(t),lemma:t.lemma||null,pos:posLabel[global.entryPosCode(t)]||global.entryPosCode(t)||null,morph:t.morph||'',ref:t.ref||null})),genitives:items});
}
fs.writeFileSync('studypanel-bare-source-genitive-context-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({references:report.references.map(r=>({ref:r.ref,genitives:r.genitives.length,targets:r.genitives.map(g=>({word:g.target.text,lemma:g.target.lemma,head:g.nearestHead?.text||null,governor:g.governor?.token?.text||null,isAfterPrep:g.isAfterPrep,candidates:g.candidates.map(c=>c.id)}))})),reportFile:'studypanel-bare-source-genitive-context-report.json'},null,2));
