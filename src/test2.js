const M = require('./model.js'); const EDIT = require('./edit.js');
const base = require('../hero_base.json');
const heroes = Object.keys(base).map(id => ({...base[id], ...EDIT[id]}));
const Q=M.QUESTIONS;
// Coherent persona: latent vector, answer by closest option (noise), categorical random
function persona(){
  const lat={}; M.DIMS.forEach(d=>lat[d]=Math.random()*4);
  const ans={};
  for (const q of Q){
    if (Math.random()<0.08) continue;
    if (q.opts[0].cat){ // categorical
      if (q.multi){ const k=1+Math.floor(Math.random()*2); const s=new Set(); while(s.size<k) s.add(Math.floor(Math.random()*q.opts.length)); ans[q.id]=[...s]; }
      else ans[q.id]=Math.floor(Math.random()*q.opts.length);
      continue;
    }
    let best=-1,bd=1e9;
    q.opts.forEach((o,i)=>{ let dist=0,wt=0; for(const d in o.fx){ const [t,w]=o.fx[d]; dist+=w*Math.abs(t-lat[d]); wt+=w;} dist=dist/wt + Math.random()*0.6; if(dist<bd){bd=dist;best=i;} });
    ans[q.id]=best;
  }
  return ans;
}
const cnt={}; heroes.forEach(h=>cnt[h.name]=0); const N=+process.argv[2]||15000;
const margins=[];
for(let n=0;n<N;n++){ const r=M.rankHeroes(heroes,persona()).res; cnt[r[0].hero.name]++; margins.push(r[0].score-r[1].score); }
margins.sort((a,b)=>a-b);
console.log('median margin #1-#2 (pts):',(margins[N>>1]*100).toFixed(2),' p10:',(margins[Math.floor(N*0.1)]*100).toFixed(2));
Object.entries(cnt).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  ',k.padEnd(12),(v/N*100).toFixed(2)));
