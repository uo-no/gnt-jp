'use strict';
const vm=require('vm'),fs=require('fs'),path=require('path');
const _CLS2P={verb:'V',noun:'N',adjective:'A',adj:'A',article:'T',det:'T',preposition:'P',prep:'P',conjunction:'C',conj:'C',adverb:'D',adv:'D',particle:'X',ptcl:'X',pronoun:'R',pron:'R'};
global.entryPosCode=e=>e.pos?String(e.pos).replace(/-$/,'').toUpperCase():(_CLS2P[String(e.class||'').toLowerCase()]||'');
global.decodeMorph=e=>{const n=v=>(!v||v==='-')?'':v;return{pos:global.entryPosCode(e),tense:n(e.tense),voice:n(e.voice),mood:n(e.mood),case:n(e.case),number:n(e.number),gender:n(e.gender),person:n(e.person)};};
global.cleanText=e=>(e.word||e.normalized||e.text||'').replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g,'').trim();
function rq(fp){const w='(function(module,exports,require,__dirname,__filename){\n'+fs.readFileSync(fp,'utf8')+'\n})';const m={exports:{}};vm.runInThisContext(w,{filename:fp})(m,m.exports,require,path.dirname(fp),fp);return m.exports;}
const P='public';
const CB=rq(P+'/core/syntax-analyzer.js').ContextBuilder;
const {ReadingContext}=rq(P+'/core/reading-context.js');const {ReadingEngine}=rq(P+'/core/reading-engine.js');const {ReadingLexicon}=rq(P+'/core/reading-lexicon.js');
const {readingLexiconData}=rq(P+'/assets/data/reading-lexicon-data.js');const {readingSemanticData}=rq(P+'/assets/data/reading-semantic-data.js');const {READING_LN_FINAL}=rq(P+'/assets/data/reading-ln-final-data.js');const {PresentationPolicy}=rq(P+'/core/presentation-policy.js');
const eng=new ReadingEngine();eng.setLexicon(new ReadingLexicon(readingLexiconData));eng.setSemanticData(readingSemanticData);eng.setLnGlossData(READING_LN_FINAL);
const RC=new ReadingContext();RC.setContextBuilder(CB);
// 対象 Strong（正規化: G0 詰め）
const TARGETS={G5101:'τίς',G4169:'ποῖος',G4214:'πόσος',G4159:'πόθεν',G4226:'ποῦ',G4219:'πότε',G4459:'πῶς',G3739:'ὅς',G3748:'ὅστις',G3745:'ὅσος',G3697:'ὁποῖος'};
const norm=s=>(s||'').replace(/^G0*/,'G');
const data={};for(const k of Object.keys(TARGETS))data[k]=[];
const NT=P+'/bible_data/nt';
for(const b of fs.readdirSync(NT).filter(x=>fs.statSync(path.join(NT,x)).isDirectory()).sort()){
  for(const c of fs.readdirSync(path.join(NT,b)).filter(f=>f.endsWith('.json'))){
    const toks=JSON.parse(fs.readFileSync(path.join(NT,b,c),'utf8'));const byV=new Map();
    for(const t of toks){if(!byV.has(t.verse))byV.set(t.verse,[]);byV.get(t.verse).push(t);}
    for(const words of byV.values())for(let i=0;i<words.length;i++){
      const w=words[i];const s=norm(w.strong);
      if(!data[s])continue;
      const r=eng.resolve(w,RC.getContext(words,i));
      const raw=r?r.japanese:(w.japanese||'');const disp=r?PresentationPolicy.formatDisplay(r.japanese,r.src||r.source,words,i):raw;
      const seg=(w.morph||'').split('-')[1]||'';
      data[s].push({ref:w.ref,gk:w.text,morph:w.morph,eng:w.english,gloss:w.gloss,ja:w.japanese,gender:seg.slice(-1),numchar:seg.length>=2?seg.slice(-2,-1):'',caseChar:seg[0]||'',engine:disp,src:r?(r.src||r.source):'fallback'});
    }
  }
}
fs.writeFileSync('scripts/output/stageH3a-tokens.json',JSON.stringify(data));
// Phase1 集計出力
for(const [s,arr] of Object.entries(data)){
  if(arr.length===0){console.log(TARGETS[s]+' ('+s+'): 出現0');continue;}
  const jaD={},engD={},genD={},numD={},caseD={};
  arr.forEach(r=>{jaD[r.ja]=(jaD[r.ja]||0)+1;engD[r.eng]=(engD[r.eng]||0)+1;genD[r.gender||'?']=(genD[r.gender||'?']||0)+1;});
  console.log('== '+TARGETS[s]+' / '+s+' / count='+arr.length);
  console.log('  japanese:',JSON.stringify(jaD));
  console.log('  english(上位):',JSON.stringify(Object.fromEntries(Object.entries(engD).sort((a,b)=>b[1]-a[1]).slice(0,6))));
  console.log('  gender:',JSON.stringify(genD));
}
