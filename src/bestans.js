const M = require('./model.js'); const EDIT = require('./edit.js'); const base = require('../hero_base.json');
const heroes = Object.keys(base).map(id => ({...base[id], ...EDIT[id]})); const Q=M.QUESTIONS;
function margin(hid, ans){ const {res}=M.rankHeroes(heroes, ans); const me=res.find(r=>r.hero.id===hid); const best=res.find(r=>r.hero.id!==hid); return me.score-best.score; }
const out={};
for (const hid of process.argv.slice(2)){
  let best=null;
  for (let t=0;t<4;t++){ const ans={}; for (const q of Q) ans[q.id] = q.multi ? [0] : Math.floor(Math.random()*q.opts.length);
    let cur=margin(hid,ans), imp=true;
    while(imp){ imp=false; for (const q of Q){ const ch = q.multi ? [] : q.opts.map((_,i)=>i); if (q.multi) for (let i=0;i<q.opts.length;i++) for (let j=i+1;j<q.opts.length;j++) ch.push([i,j]);
      for (const c of ch){ const o=ans[q.id]; ans[q.id]=c; const m=margin(hid,ans); if (m>cur+1e-9){cur=m;imp=true;} else ans[q.id]=o; } } }
    if(!best||cur>best.m) best={m:cur,ans:JSON.parse(JSON.stringify(ans))}; }
  out[hid]=best.ans;
}
console.log(JSON.stringify(out));
