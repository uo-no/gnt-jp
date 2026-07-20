// Stage G: NT 全巻から均等に 200 節を抽出し Reading Japanese のみ生成（品質レビュー用）
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
function disp(words,i){const c=RC.getContext(words,i);const r=eng.resolve(words[i],c);if(!r)return words[i].japanese||words[i].text||'';return PresentationPolicy.formatDisplay(r.japanese,r.src||r.source,words,i);}
const NT=path.join(P,'bible_data/nt');
const allVerses=[];
const books=fs.readdirSync(NT).filter(b=>fs.statSync(path.join(NT,b)).isDirectory()).sort();
for(const book of books){
  for(const ch of fs.readdirSync(path.join(NT,book)).filter(f=>f.endsWith('.json')).sort((a,b)=>parseInt(a)-parseInt(b))){
    const toks=JSON.parse(fs.readFileSync(path.join(NT,book,ch),'utf8'));const byV=new Map();
    for(const t of toks){if(!byV.has(t.verse))byV.set(t.verse,[]);byV.get(t.verse).push(t);}
    for(const [v,words] of byV.entries()){allVerses.push({book,ch:ch.replace('.json',''),v,words});}
  }
}
const byBook={};for(const vv of allVerses){(byBook[vv.book]=byBook[vv.book]||[]).push(vv);}
const bookNames=Object.keys(byBook);
const target=200,totalV=allVerses.length;
let seed=20260718;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
const picked=[];
for(const b of bookNames){
  const vs=byBook[b];const n=Math.max(1,Math.round(target*vs.length/totalV));
  const s=vs.slice();for(let i=s.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[s[i],s[j]]=[s[j],s[i]];}
  picked.push(...s.slice(0,n));
}
const s2=picked.slice();for(let i=s2.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[s2[i],s2[j]]=[s2[j],s2[i]];}
const final=s2.slice(0,200).sort((a,b)=>bookNames.indexOf(a.book)-bookNames.indexOf(b.book)||parseInt(a.ch)-parseInt(b.ch)||parseInt(a.v)-parseInt(b.v));
const out=final.map(vv=>({ref:vv.book+' '+vv.ch+':'+vv.v,rj:vv.words.map((w,i)=>disp(vv.words,i)).join(' ')}));
fs.writeFileSync(path.join(__dirname,'output','stageG-verses.json'),JSON.stringify(out,null,0));
console.log('抽出節数:',out.length,'/ 書数:',new Set(out.map(o=>o.ref.split(' ')[0])).size);
