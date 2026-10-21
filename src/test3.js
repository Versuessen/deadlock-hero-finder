const M = require('./model.js'); const EDIT = require('./edit.js');
const base = require('../hero_base.json');
const heroes = Object.keys(base).map(id => ({...base[id], ...EDIT[id]}));
const Q=M.QUESTIONS; const D=M.DIMS;
const mu = D.map((d,i)=>heroes.reduce((s,h)=>s+h.t[i],0)/heroes.length);
function rank(ans, beta){
  const prof=M.buildProfile(ans);
  const res=heroes.map(h=>{ const r=M.scoreHero(h,prof); let a=0,w=0;
    for(const d in prof.dims){ const i=D.indexOf(d); const {target,weight}=prof.dims[d]; a+=weight*Math.max(-1,Math.min(1,((target-mu[i])/2)*((h.t[i]-mu[i])/2))); w+=weight; }
    return {h, s:r.score + beta*(w?a/w:0)}; });
  res.sort((x,y)=>y.s-x.s); return res;
}
function answerAs(h, noise, catCare){
  const ans={};
  for(const q of Q){
    if (q.opts[0].cat){
      if (Math.random()>catCare){ continue; }
      const kind=q.opts[0].cat[0];
      let scores=q.opts.map((o,i)=>({i,s:M.catScore(h,o.cat[0],o.cat[1])+Math.random()*0.3}));
      scores.sort((a,b)=>b.s-a.s);
      ans[q.id]= q.multi ? [scores[0].i, scores[1].i] : scores[0].i;
      continue;
    }
    let best=-1,bd=1e9;
    q.opts.forEach((o,i)=>{ let dist=0,wt=0; for(const d in o.fx){ const [t,w]=o.fx[d]; const hv=h.t[D.indexOf(d)]+ (Math.random()*2-1)*noise; dist+=w*Math.abs(t-hv); wt+=w;} dist/=wt; if(dist<bd){bd=dist;best=i;} });
    if (q.opts[best].cap && h.cx>q.opts[best].cap) { /* persona wouldn't pick cap option if hero too complex; fine */ }
    ans[q.id]=best;
  }
  return ans;
}
for (const beta of [0,0.1,0.2,0.3]){
  for (const [noise,care] of [[0.5,0.8],[1.0,0.6]]){
    let t1=0,t3=0,n=0; const per={};
    for(const h of heroes){ let a1=0; for(let k=0;k<60;k++){ const r=rank(answerAs(h,noise,care),beta); const idx=r.findIndex(x=>x.h.id===h.id); if(idx===0){t1++;a1++;} if(idx<3)t3++; n++; } per[h.name]=a1/60; }
    const worst=Object.entries(per).sort((a,b)=>a[1]-b[1]).slice(0,6).map(([k,v])=>k+':'+(v*100).toFixed(0)).join(' ');
    console.log(`beta=${beta} noise=${noise} care=${care}  top1=${(t1/n*100).toFixed(1)}% top3=${(t3/n*100).toFixed(1)}%  worst: ${worst}`);
  }
}
