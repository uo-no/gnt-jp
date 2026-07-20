'use strict';
const vm=require('vm'),fs=require('fs'),path=require('path');
const _CLS2P={verb:'V',noun:'N',adjective:'A',adj:'A',article:'T',det:'T',preposition:'P',prep:'P',conjunction:'C',conj:'C',adverb:'D',adv:'D',particle:'X',ptcl:'X',pronoun:'R',pron:'R'};
global.entryPosCode=e=>e.pos?String(e.pos).replace(/-$/,'').toUpperCase():(_CLS2P[String(e.class||'').toLowerCase()]||'');
global.decodeMorph=e=>{const n=v=>(!v||v==='-')?'':v;return{pos:global.entryPosCode(e),tense:n(e.tense),voice:n(e.voice),mood:n(e.mood),case:n(e.case),number:n(e.number),gender:n(e.gender),person:n(e.person)};};
global.cleanText=e=>(e.word||e.normalized||e.text||'').replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g,'').trim();
function rq(fp){const w='(function(module,exports,require,__dirname,__filename){\n'+fs.readFileSync(fp,'utf8')+'\n})';const m={exports:{}};vm.runInThisContext(w,{filename:fp})(m,m.exports,require,path.dirname(fp),fp);return m.exports;}
const ROOT=path.resolve(__dirname,'..'),P=path.join(ROOT,'public');
const CB=rq(path.join(P,'core/syntax-analyzer.js')).ContextBuilder;
const {ReadingContext}=rq(path.join(P,'core/reading-context.js'));const {ReadingEngine}=rq(path.join(P,'core/reading-engine.js'));const {ReadingLexicon}=rq(path.join(P,'core/reading-lexicon.js'));
const {readingLexiconData}=rq(path.join(P,'assets/data/reading-lexicon-data.js'));const {readingSemanticData}=rq(path.join(P,'assets/data/reading-semantic-data.js'));const {READING_LN_FINAL}=rq(path.join(P,'assets/data/reading-ln-final-data.js'));const {PresentationPolicy}=rq(path.join(P,'core/presentation-policy.js'));
const eng=new ReadingEngine();eng.setLexicon(new ReadingLexicon(readingLexiconData));eng.setSemanticData(readingSemanticData);eng.setLnGlossData(READING_LN_FINAL);
const RC=new ReadingContext();RC.setContextBuilder(CB);
function verseTokens(book,ch,v){const toks=JSON.parse(fs.readFileSync(path.join(P,'bible_data/nt',book,ch+'.json'),'utf8'));return toks.filter(t=>t.verse===String(v));}
// 語順系: 各トークンの固定訳と Engine 出力を並べ、固定訳自体が誤っている語がないか確認
const refs=['LUK 3:4','MAT 11:17','2CO 11:21','REV 9:10','ACT 25:16'];
for(const ref of refs){
  const [book,cv]=ref.split(' ');const [ch,v]=cv.split(':');const words=verseTokens(book,ch,v);
  console.log('=== '+ref+' ===');
  words.forEach((w,i)=>{const c=RC.getContext(words,i);const r=eng.resolve(w,c);const disp=r?PresentationPolicy.formatDisplay(r.japanese,r.src||r.source,words,i):(w.japanese||'');
    // 固定訳と gloss が乖離する語（データ誤りの候補）だけ印
    const suspicious=(w.gloss&&w.japanese&&!/(冠詞|前置詞|語句)/.test(w.japanese))?'':'';
    console.log('  '+String(i).padStart(2)+' '+(w.text||'').padEnd(12)+' '+(w.morph||'').padEnd(10)+' fix='+(w.japanese||'').padEnd(8)+' gloss='+(w.gloss||'').padEnd(14)+' → '+disp);});
}
