'use strict';
const vm=require('vm'),fs=require('fs'),path=require('path');
const _CLS2P={verb:'V',noun:'N',adjective:'A',adj:'A',article:'T',det:'T',preposition:'P',prep:'P',conjunction:'C',conj:'C',adverb:'D',adv:'D',particle:'X',ptcl:'X',pronoun:'R',pron:'R'};
global.entryPosCode=e=>e.pos?String(e.pos).replace(/-$/,'').toUpperCase():(_CLS2P[String(e.class||'').toLowerCase()]||'');
global.decodeMorph=e=>{const n=v=>(!v||v==='-')?'':v;return{pos:global.entryPosCode(e),tense:n(e.tense),voice:n(e.voice),mood:n(e.mood),case:n(e.case),number:n(e.number),gender:n(e.gender),person:n(e.person)};};
global.cleanText=e=>(e.word||e.normalized||e.text||'').replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g,'').trim();
function rq(fp){const w='(function(module,exports,require,__dirname,__filename){\n'+fs.readFileSync(fp,'utf8')+'\n})';const m={exports:{}};vm.runInThisContext(w,{filename:fp})(m,m.exports,require,path.dirname(fp),fp);return m.exports;}
const ROOT=path.resolve(__dirname,'..'),P=path.join(ROOT,'public');
const CB=rq(path.join(P,'core/syntax-analyzer.js')).ContextBuilder;
const {ReadingContext}=rq(path.join(P,'core/reading-context.js'));
const {ReadingEngine}=rq(path.join(P,'core/reading-engine.js'));
const {ReadingLexicon}=rq(path.join(P,'core/reading-lexicon.js'));
const {readingLexiconData}=rq(path.join(P,'assets/data/reading-lexicon-data.js'));
const {readingSemanticData}=rq(path.join(P,'assets/data/reading-semantic-data.js'));
const {READING_LN_FINAL}=rq(path.join(P,'assets/data/reading-ln-final-data.js'));
const {PresentationPolicy}=rq(path.join(P,'core/presentation-policy.js'));
const eng=new ReadingEngine();eng.setLexicon(new ReadingLexicon(readingLexiconData));eng.setSemanticData(readingSemanticData);eng.setLnGlossData(READING_LN_FINAL);
const RC=new ReadingContext();RC.setContextBuilder(CB);
function loadVerse(book,ch,v){const toks=JSON.parse(fs.readFileSync(path.join(P,'bible_data/nt',book,ch+'.json'),'utf8'));return toks.filter(t=>t.verse===String(v));}
// 対象: C判定の該当トークン（focus 語で特定）
const targets=[
 {ref:'MRK 4:21',focus:'姦淫の女'}, {ref:'ACT 8:36',focus:'誰は'}, {ref:'HEB 1:6',focus:'礼拝せよ'},
 {ref:'LUK 18:36',focus:'誰'}, {ref:'LUK 19:3',focus:'誰は'}, {ref:'MRK 2:7',focus:'誰は'},
 {ref:'MRK 6:25',focus:'熱心'}, {ref:'LUK 8:43',focus:'流れ'}, {ref:'MRK 8:19',focus:'どれほど'},
];
for(const tg of targets){
  const [book,cv]=tg.ref.split(' ');const [ch,v]=cv.split(':');
  const words=loadVerse(book,ch,v);
  words.forEach((w,i)=>{
    const c=RC.getContext(words,i);const r=eng.resolve(w,c);
    const raw=r?r.japanese:(w.japanese||'');const disp=r?PresentationPolicy.formatDisplay(r.japanese,r.src||r.source,words,i):raw;
    if(disp===tg.focus||raw===tg.focus||(w.japanese===tg.focus)){
      console.log(tg.ref+' | gk='+w.text+' | morph='+w.morph+' | strong='+w.strong+' | lemma='+w.lemma+' | fixJa='+w.japanese+' | gloss='+(w.gloss||'')+' | ln='+(w.ln||'')+' | ENGINE='+raw+' | src='+(r?(r.src||r.source):'fallback')+' | DISP='+disp);
    }
  });
}
