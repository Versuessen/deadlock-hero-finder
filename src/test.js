const M = require('./model.js'); const EDIT = require('./edit.js');
const base = require('../hero_base.json');
const heroes = Object.keys(base).map(id => ({...base[id], ...EDIT[id]}));
if (heroes.some(h=>!h.t || h.t.length!==M.DIMS.length)) { console.log('bad trait length', heroes.filter(h=>!h.t||h.t.length!==23).map(h=>h.id)); process.exit(1); }
const Q = M.QUESTIONS;
function margin(hid, ans){ const {res}=M.rankHeroes(heroes, ans); const me=res.find(r=>r.hero.id===hid); const best=res.find(r=>r.hero.id!==hid); return {m: me.score-best.score, rank: res.indexOf(me)+1, top: res[0].hero.id, s: me.score}; }
function climb(hid){
  let best=null;
  for (let trial=0; trial<6; trial++){
    const ans={}; for (const q of Q) ans[q.id] = q.multi ? [Math.floor(Math.random()*q.opts.length)] : Math.floor(Math.random()*q.opts.length);
    let cur=margin(hid,ans).m, improved=true;
    while(improved){ improved=false;
      for (const q of Q){
        const choices = [null, ...q.opts.map((_,i)=>q.multi?[i]:i)];
        if (q.multi) for (let i=0;i<q.opts.length;i++) for (let j=i+1;j<q.opts.length;j++) choices.push([i,j]);
        for (const c of choices){ const old=ans[q.id]; ans[q.id]=c; const m=margin(hid,ans).m; if (m>cur+1e-9){cur=m;improved=true;} else ans[q.id]=old; }
      }
    }
    if (!best || cur>best.m) best={m:cur, ans:JSON.parse(JSON.stringify(ans))};
  }
  return best;
}
const mode = process.argv[2]||'all';
if (mode==='reach' || mode==='all'){
  const out=[];
  for (const h of heroes){ const b=climb(h.id); const r=margin(h.id,b.ans); out.push([h.name, +(b.m*100).toFixed(2), r.rank, +(r.s*100).toFixed(1)]); }
  out.sort((a,b)=>a[1]-b[1]); console.log('REACHABILITY (best achievable margin over #2, pct points):'); for (const o of out) console.log('  ',o.join(' | '));
}
if (mode==='dist' || mode==='all'){
  const cnt={}; const N=20000; heroes.forEach(h=>cnt[h.name]=0);
  for (let n=0;n<N;n++){ const ans={}; for (const q of Q){ if (Math.random()<0.1) continue; if (q.multi){ const k=1+Math.floor(Math.random()*2); const s=new Set(); while(s.size<k) s.add(Math.floor(Math.random()*q.opts.length)); ans[q.id]=[...s]; } else ans[q.id]=Math.floor(Math.random()*q.opts.length); }
    cnt[M.rankHeroes(heroes,ans).res[0].hero.name]++; }
  console.log('RANDOM-ANSWER TOP-1 SHARE (%):'); Object.entries(cnt).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  ',k.padEnd(12),(v/N*100).toFixed(2)));
}
