'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..'),NT=path.join(ROOT,'public/bible_data/nt');
// 対象 lemma: μόδιος(G3426), τίς(G5101)
const targets={'G3426':{lemma:'μόδιος'},'G5101':{lemma:'τίς'}};
const byStrong={};
for(const b of fs.readdirSync(NT).filter(x=>fs.statSync(path.join(NT,x)).isDirectory()).sort()){
  for(const c of fs.readdirSync(path.join(NT,b)).filter(f=>f.endsWith('.json'))){
    for(const t of JSON.parse(fs.readFileSync(path.join(NT,b,c),'utf8'))){
      const s=(t.strong||'').replace(/^G0*/,'G');
      if(targets[s]||targets[t.strong]){
        const key=targets[s]?s:t.strong;
        (byStrong[key]=byStrong[key]||[]).push({ref:t.ref,gk:t.text,morph:t.morph,eng:t.english,gloss:t.gloss,ja:t.japanese,lemmaId:t.lemmaId,ln:t.ln});
      }
    }
  }
}
for(const [s,arr] of Object.entries(byStrong)){
  console.log('===== '+s+' ('+targets[s].lemma+') 全'+arr.length+'回 =====');
  // japanese の分布
  const jaDist={},engDist={},glossDist={};
  arr.forEach(r=>{jaDist[r.ja]=(jaDist[r.ja]||0)+1;engDist[r.eng]=(engDist[r.eng]||0)+1;glossDist[r.gloss]=(glossDist[r.gloss]||0)+1;});
  console.log('japanese 分布:',JSON.stringify(jaDist));
  console.log('english 分布:',JSON.stringify(engDist));
  console.log('gloss 分布(上位):',JSON.stringify(Object.fromEntries(Object.entries(glossDist).sort((a,b)=>b[1]-a[1]).slice(0,8))));
  console.log('');
}
fs.writeFileSync('scripts/output/stageH1-tokens.json',JSON.stringify(byStrong));
