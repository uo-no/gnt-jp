exports.REF=`window.__ref=(px,py,w,level)=>{const fr=boxes(w),all=new Set(boxes().map(b=>b.el));let nw=null,nd=1e9;
 for(const o of words){if(o===w)continue;const d=Math.hypot(Math.max(o.x-3-px,0,px-(o.x+o.w+3)),Math.max(o.y-22-py,0,py-(o.y+8)));if(d<nd){nd=d;nw=o}}
 const dep=n=>{let m=0;for(const c of n.children)if(c.tagName==='wg')m=Math.max(m,dep(c));return m+1};
 const frameFor=el=>{const f=fr.find(b=>b.el===el);if(f)return f;if(!all.has(el))return null;const ws=[...el.getElementsByTagName('w')].map(e=>EW.get(e)).filter(x=>x&&x!==w);if(!ws.length)return null;const p=5+4*(dep(el)-1);return{el,x1:Math.min(...ws.map(q=>q.x))-p,x2:Math.max(...ws.map(q=>q.x+q.w))+p,y1:Math.min(...ws.map(q=>q.y))-26-p/2,y2:Math.max(...ws.map(q=>q.y))+10+p/2}};
 const inside=f=>px>=f.x1&&px<=f.x2&&py>=f.y1&&py<=f.y2;const chain=[];for(let n=nw.el.parentNode;n&&n.tagName==='wg';n=n.parentNode){const f=frameFor(n);if(f&&inside(f))chain.push(f)}
 const ring=[nw.x-5,nw.y-24,nw.w+10,34],cur=w.el.parentNode;
 if(chain.length){const f=chain[Math.min(level,chain.length-1)];return{kind:'chain',target:gpath(f.el),same:f.el===cur,frame:[f.x1,f.y1,f.x2-f.x1,f.y2-f.y1],ring,n:chain.length,nearest:nw.text,nd:Math.round(nd)}}
 if(!fr.some(inside))return{kind:'outside',target:null,same:false,ring,nearest:nw.text,nd:Math.round(nd)};
 return{kind:'fallback',target:gpath(nw.el.parentNode),same:nw.el.parentNode===cur,ring,nearest:nw.text,nd:Math.round(nd)}}`;
exports.READ=`(()=>{const g=e=>e?['x','y','width','height'].map(a=>+e.getAttribute(a)):null;return{hl:g(gH.querySelector('.hl')),ring:g(gH.querySelector('.hlw')),members:gH.querySelectorAll('.hlm').length,dt:$('#dt').textContent,dtShown:$('#dt').style.display==='block'}})()`;
const near=(a,b)=>a&&b&&a.every((v,i)=>Math.abs(v-b[i])<0.7);
// does the on-screen preview equal what the independent reference says?
exports.matches=(pv,ref)=>{if(!pv.dtShown)return false;
 if(ref.kind==='chain'){if(!near(pv.ring,ref.ring))return false;if(ref.same)return pv.hl===null&&/所属は変更なし/.test(pv.dt);return near(pv.hl,ref.frame)&&pv.members>=1&&/最近傍語：/.test(pv.dt)}
 if(ref.kind==='outside')return pv.hl===null&&/枠の外/.test(pv.dt);
 return near(pv.ring,ref.ring)&&/祖先の枠外|所属は変更なし/.test(pv.dt)};
