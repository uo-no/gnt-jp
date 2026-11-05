'use strict';
const fs=require('fs'),path=require('path');
const NT=path.resolve(__dirname,'..','public/bible_data/nt');
// pron + 指示詞(αὐτός/οὗτος/ἐκεῖνος/τοιοῦτος/ἑαυτοῦ/人称)を lemma単位で集約
// τίς/ὅς系はH-3aで監査済みだが人称文脈のため含めて再掲
const byLemma={};
for(const b of fs.readdirSync(NT).filter(x=>fs.statSync(path.join(NT,x)).isDirectory()).sort()){
  for(const c of fs.readdirSync(path.join(NT,b)).filter(f=>f.endsWith('.json'))){
    for(const t of JSON.parse(fs.readFileSync(path.join(NT,b,c),'utf8'))){
      const cls=t.class||'';
      // 代名詞・指示詞系のみ（pron + οὗτος/ἐκεῖνος/τοιοῦτος が adj/det の場合も拾う）
      const lem=(t.lemma||'').normalize('NFC');
      const isTarget=cls==='pron'||['αὐτός','οὗτος','ἐκεῖνος','τοιοῦτος','ἑαυτοῦ'].includes(lem);
      if(!isTarget)continue;
      const key=lem+'|'+(t.strong||'').replace(/^G0*/,'G');
      byLemma[key]=byLemma[key]||{lemma:lem,strong:(t.strong||'').replace(/^G0*/,'G'),count:0,ja:{},eng:{},person:{},gender:{},number:{},cs:{}};
      const e=byLemma[key];e.count++;
      e.ja[t.japanese]=(e.ja[t.japanese]||0)+1;
      e.eng[t.english]=(e.eng[t.english]||0)+1;
      const seg=(t.morph||'').split('-')[1]||'';
      const hasP=/^[123]/.test(seg);
      const p=hasP?seg[0]:(t.person||'-');
      const g=seg.slice(-1)||'-';
      e.person[p]=(e.person[p]||0)+1;
      e.gender[g]=(e.gender[g]||0)+1;
    }
  }
}
fs.writeFileSync('scripts/output/stageH4-tokens.json',JSON.stringify(byLemma));
// 主要（count>=50）のみ出力
const rows=Object.values(byLemma).filter(e=>e.count>=40).sort((a,b)=>b.count-a.count);
for(const e of rows){
  const topJa=Object.entries(e.ja).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const topEng=Object.entries(e.eng).sort((a,b)=>b[1]-a[1]).slice(0,5);
  console.log(e.lemma+' | '+e.strong+' | count='+e.count);
  console.log('   ja:'+JSON.stringify(Object.fromEntries(topJa))+' | person:'+JSON.stringify(e.person)+' | gender:'+JSON.stringify(e.gender));
  console.log('   eng:'+JSON.stringify(Object.fromEntries(topEng)));
}
