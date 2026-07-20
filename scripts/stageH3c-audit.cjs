'use strict';
const fs=require('fs'),path=require('path');
const NT=path.resolve(__dirname,'..','public/bible_data/nt');
// 対象 Strong と lemma
const TARGETS={
 G846:'αὐτός', G1565:'ἐκεῖνος', G3778:'οὗτος', G5108:'τοιοῦτος',
 G1438:'ἑαυτοῦ',
 G3173:'μέγας', G4152:'πνευματικός',
 G4710:'σπουδή', G2889:'κόσμος', G3056:'λόγος'
};
const norm=s=>(s||'').replace(/^G0*/,'G');
const data={};for(const k of Object.keys(TARGETS))data[k]=[];
for(const b of fs.readdirSync(NT).filter(x=>fs.statSync(path.join(NT,x)).isDirectory()).sort()){
  for(const c of fs.readdirSync(path.join(NT,b)).filter(f=>f.endsWith('.json'))){
    for(const t of JSON.parse(fs.readFileSync(path.join(NT,b,c),'utf8'))){
      const s=norm(t.strong); if(!data[s])continue;
      const seg=(t.morph||'').split('-')[1]||'';
      data[s].push({ref:t.ref,gk:t.text,morph:t.morph,eng:t.english,gloss:t.gloss,ja:t.japanese,ln:t.ln,gender:seg.slice(-1),caseChar:seg[0]||''});
    }
  }
}
fs.writeFileSync('scripts/output/stageH3c-tokens.json',JSON.stringify(data));
for(const [s,arr] of Object.entries(data)){
  if(!arr.length){console.log(TARGETS[s]+' ('+s+'): 出現0');continue;}
  const jaD={},engD={},lnD={};
  arr.forEach(r=>{jaD[r.ja]=(jaD[r.ja]||0)+1;engD[r.eng]=(engD[r.eng]||0)+1;const l=(r.ln||'').split(' ')[0];lnD[l]=(lnD[l]||0)+1;});
  console.log('== '+TARGETS[s]+' / '+s+' / count='+arr.length);
  console.log('   japanese:',JSON.stringify(Object.fromEntries(Object.entries(jaD).sort((a,b)=>b[1]-a[1]).slice(0,6))));
  console.log('   english(上位):',JSON.stringify(Object.fromEntries(Object.entries(engD).sort((a,b)=>b[1]-a[1]).slice(0,8))));
  console.log('   異なりLNコード数:',Object.keys(lnD).length,' 上位:',JSON.stringify(Object.fromEntries(Object.entries(lnD).sort((a,b)=>b[1]-a[1]).slice(0,5))));
}
