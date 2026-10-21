(function(){
"use strict";
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE = window.matchMedia && matchMedia("(pointer: fine)").matches;

// ================= sound =================
// mp3 encoders add a little silence at the start of a file, which shifts every slice of a sprite.
// After decoding, snap each slice to where its sound actually begins so short clips aren't clipped.
function alignSegs(buf, segs){
  // measure where each slice really starts, then shift every slice by the typical (median) offset:
  // the encoder delay is the same for the whole file, while a soft fade-in must not push a slice later
  const d = buf.getChannelData(0), sr = buf.sampleRate, shifts = [];
  segs.forEach(([st, du]) => {
    const a = Math.max(0, Math.floor((st - .1) * sr)), b = Math.min(d.length, Math.floor((st + .1) * sr));
    let pk = 0; for (let i = a; i < Math.min(d.length, Math.floor((st + du) * sr)); i++) pk = Math.max(pk, Math.abs(d[i]));
    const thr = Math.max(.002, pk * .05);
    for (let i = a; i < b; i++) if (Math.abs(d[i]) > thr){ shifts.push(i/sr - st); break; }
  });
  shifts.sort((x, y) => x - y);
  const off = shifts.length ? Math.max(-.08, Math.min(.08, shifts[Math.floor(shifts.length/2)] - .004)) : 0;
  return segs.map(([st, du]) => [Math.max(0, st + off), du]);
}
const SFX = (() => {
  // every cue is a slice of one sprite of Deadlock's own UI sounds; cues with several takes rotate so repeats don't sound identical
  let ctx = null, master = null, sprite = null, lastHover = 0, on = true;
  const last = {};
  try { on = localStorage.getItem("dlhf.sound") !== "off"; } catch(e) {}
  function init(){
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ctx = new AC(); } catch(e) { return; }
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    fetch("img/snd/ui.mp3").then(r => r.arrayBuffer()).then(a => new Promise((res, rej) => ctx.decodeAudioData(a, res, rej))).then(b => { sprite = b; const keys = Object.keys(UISND), flat = keys.flatMap(k => UISND[k]), al = alignSegs(b, flat); let n = 0; keys.forEach(k => { UISND[k] = UISND[k].map(() => al[n++]); }); }).catch(()=>{});
  }
  function unlock(){ init(); if (ctx && ctx.state === "suspended") ctx.resume().catch(()=>{}); }
  const live = () => on && ctx && ctx.state === "running";
  function pick(n, variant){
    const v = UISND[n]; if (!v || !v.length) return null;
    if (variant != null) return v[variant % v.length];
    if (v.length === 1) return v[0];
    let i; do { i = Math.floor(Math.random()*v.length); } while (i === last[n]);
    last[n] = i; return v[i];
  }
  function play(n, o){
    o = o || {}; if (!(o.force ? ctx && ctx.state === "running" : live()) || !sprite) return;
    const seg = pick(n, o.variant); if (!seg) return;
    const s = ctx.createBufferSource(); s.buffer = sprite;
    s.playbackRate.value = (o.rate || 1) * (1 + (Math.random()*2-1) * (o.jitter == null ? .02 : o.jitter));
    const g = ctx.createGain(); g.gain.value = o.gain == null ? 1 : o.gain;
    s.connect(g); g.connect(master); s.start(ctx.currentTime + (o.delay || 0), seg[0], seg[1]);
  }
  function hover(kind){ const t = performance.now(); if (t - lastHover < 70) return; lastHover = t; play(kind || "hover", {gain: kind === "hover" ? .55 : .6}); }
  function set(v){ on = v; try { localStorage.setItem("dlhf.sound", v ? "on" : "off"); } catch(e) {} }
  return { init, unlock, play, hover, set, get on(){ return on; }, get ctx(){ return ctx; } };
})();
// hero voice lines: one sprite per hero, decoded on first use
// hero voice lines: one small sprite per hero. Compressed files are prefetched in the background;
// only the last few heroes are kept decoded, so memory stays small.
const VOX = (() => {
  const raw = {}, fetching = {}, dec = new Map(), MAXDEC = 4; let src = null, gain = null, vOn = true;
  try { vOn = localStorage.getItem("dlhf.voice") !== "off"; } catch(e) {}
  function set(v){ vOn = v; try { localStorage.setItem("dlhf.voice", v ? "on" : "off"); } catch(e) {} if (!v) stop(); }
  function fetchRaw(id){
    if (raw[id]) return Promise.resolve(raw[id]);
    if (!fetching[id]) fetching[id] = fetch(`img/vo/${id}.mp3`).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(a => (raw[id] = a)).catch(e => { delete fetching[id]; throw e; });
    return fetching[id];
  }
  function load(id){
    const c = SFX.ctx; if (!c) return Promise.reject();
    if (dec.has(id)){ const b = dec.get(id); dec.delete(id); dec.set(id, b); return Promise.resolve(b); }
    return fetchRaw(id).then(a => new Promise((res, rej) => c.decodeAudioData(a.slice(0), res, rej))).then(b => {
      if (!VO[id].aligned){ VO[id].seg = alignSegs(b, VO[id].seg); VO[id].aligned = true; }
      dec.set(id, b); while (dec.size > MAXDEC) dec.delete(dec.keys().next().value); return b;
    });
  }
  function warm(id){ if (!VO[id]) return; if (SFX.ctx) load(id).catch(()=>{}); else fetchRaw(id).catch(()=>{}); }
  function stop(){ if (src){ try { src.stop(); } catch(e) {} src = null; } }
  function play(id, idx){
    const c = SFX.ctx, seg = VO[id] && VO[id].seg[idx];
    if (!c || !seg || !vOn) return Promise.reject();
    if (c.state === "suspended") c.resume().catch(()=>{});
    return load(id).then(b => {
      stop(); if (!gain){ gain = c.createGain(); gain.gain.value = 1; gain.connect(c.destination); }
      const s = c.createBufferSource(); s.buffer = b; s.connect(gain); s.start(0, seg[0], seg[1]); src = s;
      return seg[1];
    });
  }
  return { play, stop, load, warm, fetchRaw, set, get on(){ return vOn; } };
})();
SFX.init();
["pointerdown","keydown"].forEach(ev => window.addEventListener(ev, () => SFX.unlock(), {capture:true}));

// ================= data =================
function bright(hex){
  let r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b); let h=0,s=0,l=(mx+mn)/2;
  if(mx!==mn){const d=mx-mn; s=l>.5?d/(2-mx-mn):d/(mx+mn); h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4; h/=6;}
  l=Math.max(l,.64); s=Math.min(s,.8);
  const f=n=>{const k=(n+h*12)%12,a=s*Math.min(l,1-l); return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))).toString(16).padStart(2,"0");};
  return "#"+f(0)+f(8)+f(4);
}
const HEROES = Object.keys(BASE).map(id => { const h = Object.assign({}, EDIT[id], BASE[id]); h.abText = EDIT[id].ab; if (!h.role && OV[id] && OV[id].r) h.role = OV[id].r; h.c2 = bright(h.color); return h; })
  .sort((a,b)=>a.name.localeCompare(b.name));
const BY = Object.fromEntries(HEROES.map(h=>[h.id,h]));
// ids the six October 2026 heroes had while they were up for the release vote, so old links still open them
const OLDID = { nurse:"harrow", chessmaster:"solomon", deadpack:"danny", artist:"violet" };
const heroId = id => BY[id] ? id : (OLDID[id] && BY[OLDID[id]] ? OLDID[id] : null);
const range = k => [Math.min(...HEROES.map(h=>h[k])), Math.max(...HEROES.map(h=>h[k]))];
HEROES.forEach(h => { const st = ST[h.id] || {}; h.dps = st.dps ? Math.round(st.dps) : 0; h.regen = st.regen || 0; });
const RNG = { hp:range("hp"), move:range("move"), sprint:range("sprint"), stam:range("stam"), dps:range("dps"), regen:range("regen") };
const TOTAL = QUESTIONS.length;
const img = id => `img/hero/${id}.webp`;
const cvars = h => `--c:${h.color};--c2:${h.c2}`;
const role = h => (h.type || "Unclassed").toLowerCase();
const frame = h => `fr_${role(h)}`;
const ROLE_C = { brawler:"#ff8a62", marksman:"#ffd873", assassin:"#78f2cf", mystic:"#d9a2ff", unclassed:"#efe2c8" };
const XGB = Object.fromEntries(XG.map(g => [g.id, g]));
const xitem = (g, name) => g.list.find(x => x[0] === name);
function xp(g, it, cls){
  if (!it || it[5] < 0) return `<span class="xp none ${cls||""}" aria-hidden="true">${esc(it ? it[0][0] : "?")}</span>`;
  const i = it[5], c = i % g.cols, r = Math.floor(i / g.cols);
  const x = g.cols > 1 ? c/(g.cols-1)*100 : 0, y = g.rows > 1 ? r/(g.rows-1)*100 : 0;
  return `<span class="xp ${cls||""}" style="background-image:url('img/xg/${g.id}.webp');background-size:${g.cols*100}% ${g.rows*100}%;background-position:${x.toFixed(3)}% ${y.toFixed(3)}%" aria-hidden="true"></span>`;
}
const dthumb = h => `<span class="dthumb" style="${cvars(h)}"><img src="${img(h.id)}" alt="" loading="lazy"></span>`;

// ================= state =================
const KEY = "dlhf.v1";
let answers = {}, idx = 0, lastRank = null, advanceTimer = null;
function save(){ try{ localStorage.setItem(KEY, JSON.stringify({answers, idx})); }catch(e){} }
function load(){ try{ const s = JSON.parse(localStorage.getItem(KEY)||"null"); if (s && s.answers) return s; }catch(e){} return null; }
function clearSave(){ try{ localStorage.removeItem(KEY); }catch(e){} }
const isAnswered = q => { const a = answers[q.id]; return a !== undefined && a !== null && !(Array.isArray(a) && !a.length); };
const isTouched = q => answers[q.id] !== undefined;
const answeredCount = () => QUESTIONS.filter(isAnswered).length;
const secDone = si => QUESTIONS.filter(q=>q.sec===si).every(isTouched);

function show(view){
  hideTip && hideTip(); stopVoice();
  ["viewIntro","viewQuiz","viewResult","viewCompare","viewTwin"].forEach(v => $("#"+v).hidden = (v !== view));
  document.body.classList.toggle("in-quiz", view === "viewQuiz");
  window.scrollTo(0,0);
}

// ================= tarot card =================
function tcard(h, o){
  o = o || {};
  const tag = o.tag || "span", r = role(h);
  return `<${tag} class="tcard r-${r} ${o.plate===false?"noplate":""} ${o.cls||""}" ${o.attrs||""} style="${cvars(h)};--fr:url('img/k/${frame(h)}.webp');--cbg:url('img/k/cbg_${r}.webp');--emb:url('img/k/emb_${r}.webp');${o.style||""}"><span class="in"><span class="aura"></span><img class="frame" src="img/k/${frame(h)}.webp" alt="" ${o.lazy?'loading="lazy"':""}><span class="art"><span class="ah"></span><img class="pt" src="${img(h.id)}" alt="" ${o.lazy?'loading="lazy"':""}><img class="gl" alt="" data-gl="${h.id}" src="img/gloat/${h.id}.webp" ${o.lazy?'loading="lazy"':""} decoding="async"></span>${o.plate===false?"":`<span class="plate"><b>${esc(h.name)}</b><small><i></i>${esc(h.type||"Unclassed")}</small></span>`}<span class="iri"></span><span class="glit"></span><span class="shine"></span></span></${tag}>`;
}

// ================= intro =================
function setVeil(v){
  const sl = $("#leanSlab"); sl.classList.toggle("veiled", v);
  $("#veilBtn").textContent = v ? "Reveal" : "Hide"; $("#veilBtn").setAttribute("aria-pressed", !v);
  try { localStorage.setItem("dlhf.veil", v ? "1" : "0"); } catch(e) {}
}
const TITLES = [
  ["Which hero answers", "your call?"],
  ["Who walks the city", "at your side?"],
  ["Every soul needs", "a vessel."],
  ["Pick your side", "of the ritual."],
  ["Lanes, souls, rituals.", "Who's yours?"],
  ["Deal the cards.", "Meet your hero."],
  ["Whose power fits", "your hands?"],
  ["The ritual needs", "a champion."]
];
function renderTitle(){
  const t = TITLES[Math.floor(Math.random()*TITLES.length)];
  $("#title").innerHTML = `${esc(t[0])} <span class="u">${esc(t[1])}</span>`;
}
let handPick = null;
function renderHand(){
  const pool = HEROES.map(h => h.id), pick = lastRank ? lastRank.res.slice(0,5).map(r => r.hero.id) : [];
  while (pick.length < 5){ const id = pool.splice(Math.floor(Math.random()*pool.length), 1)[0]; if (!pick.includes(id)) pick.push(id); }
  if (lastRank){ const top = pick.shift(); pick.splice(2, 0, top); }   // your hero sits in the middle, in front
  handPick = pick;
  const pos = [[-150,34,-16],[-76,8,-8],[0,0,0],[76,8,8],[150,34,16]];
  $("#hand").innerHTML = pick.map((id,i)=>{ const [x,y,r]=pos[i]; return tcard(BY[id], {style:`--hx:${x}px;--hy:${y}px;--hr:${r}deg;--hd:${(-i*1.1).toFixed(1)}s;z-index:${5-Math.abs(i-2)}`}); }).join("");
}
let gameTab = "ow", xq = ""; const openGroups = {};
const plural = (n, u) => `${n} ${n === 1 ? u : u === "hero" ? "heroes" : u + "s"}`;
const fold = s => s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
function renderCross(tabsToo){
  if (tabsToo !== false) $("#gtabs").innerHTML = XG.map(g=>`<button type="button" class="tape" data-g="${g.id}" aria-pressed="${g.id===gameTab}">${esc(g.name)}</button>`).join("");
  const g = XGB[gameTab], q = fold(xq.trim());
  $("#xsearch").placeholder = `Search ${plural(g.list.length, g.unit)}`;
  const rows = g.list.filter(it => !q || fold(it[0]).includes(q) || fold(it[2]).includes(q) || it[3].some(id => fold(BY[id].name).includes(q)));
  if (!rows.length){ $("#xlist").innerHTML = `<div class="xempty"><img src="img/k/chalk_sad.webp" alt="">No ${esc(g.unit)} in ${esc(g.name)} matches “${esc(xq)}”.</div>`; return; }
  const groups = g.roles.map((r,ri) => ({ r, items: rows.filter(it => it[1] === ri) })).filter(x => x.items.length);
  const key = r => gameTab + ":" + r;
  $("#xlist").innerHTML = groups.map((gr,gi) => `<div class="xgroup ${q || (openGroups[key(gr.r)] ?? gi === 0) ? "open" : ""}"><h4><button type="button" data-xg="${esc(gr.r)}" aria-expanded="${!!(q || (openGroups[key(gr.r)] ?? gi === 0))}" data-hov><span class="chev"></span>${esc(gr.r)}<small>${plural(gr.items.length, g.unit)}</small><span class="cl"></span></button></h4><div class="xrev">${gr.items.map(it => `
    <div class="xrow">${xp(g, it)}<div><b>${esc(it[0])}</b>${it[2] && it[2] !== g.roles[it[1]]?`<span class="sub">${esc(it[2])}</span>`:""}<span class="why">${esc(it[4])}</span></div>
      <div class="dl">${it[3].map(id => { const h = BY[id]; return `<button type="button" data-hero="${h.id}" style="${cvars(h)}">${dthumb(h)}${esc(h.name)}</button>`; }).join("")}</div></div>`).join("")}</div></div>`).join("");
}
let handAct = -1;
function handMove(e){
  const st = $("#stage"), hd = $("#hand"); if (!st || !hd) return;
  const r = st.getBoundingClientRect();
  const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  const cards = [...hd.children];
  if (!inside){ if (handAct !== -1){ hd.classList.remove("spread"); cards.forEach(c=>c.classList.remove("act")); handAct = -1; } return; }
  hd.classList.add("spread");
  const cx = r.left + r.width/2, scale = (cards[0] ? cards[0].offsetWidth : 210)/210;
  const xs = [-150,-76,0,76,150].map(x => cx + x*1.3*scale);
  let best = 0; xs.forEach((x,i)=>{ if (Math.abs(e.clientX-x) < Math.abs(e.clientX-xs[best])) best = i; });
  if (best !== handAct){ handAct = best; cards.forEach((c,i)=>c.classList.toggle("act", i===best)); gloatIn(cards[best]); SFX.hover("hover_hero"); }
  const c = cards[best], cr = c.getBoundingClientRect(), x = Math.min(1,Math.max(0,(e.clientX-cr.left)/cr.width)), y = Math.min(1,Math.max(0,(e.clientY-cr.top)/cr.height));
  c.style.setProperty("--gx", `${(x*100).toFixed(1)}%`); c.style.setProperty("--gy", `${(y*100).toFixed(1)}%`);
}
document.addEventListener("pointermove", e => { if (!$("#viewIntro").hidden) handMove(e); }, {passive:true});
// clicking the fan scrolls to that hero in the roster and opens their page
$("#stage").addEventListener("click", e => {
  if (handAct < 0 || !handPick) return;
  const id = handPick[handAct]; if (!id) return;
  SFX.play("click",{gain:.5});
  if (rosterFilter !== "All" && (BY[id].type || "Unclassed") !== rosterFilter){ rosterFilter = "All"; renderRoster(); }
  const card = document.querySelector(`#rosterGrid [data-hero="${id}"]`);
  if (card){ card.scrollIntoView({behavior: RM ? "auto" : "smooth", block:"center"}); card.classList.add("act"); setTimeout(() => card.classList.remove("act"), 1400); }
  setTimeout(() => openDossier(id), RM ? 0 : 650);
});
let rosterFilter = "All";
function renderRoster(){
  const types = ["All", ...["Brawler","Assassin","Marksman","Mystic","Unclassed"].filter(t => HEROES.some(h => (h.type || "Unclassed") === t))];
  $("#filters").innerHTML = types.map(t=>`<button type="button" class="tape" aria-pressed="${t===rosterFilter}" data-f="${t}">${t!=="All"?`<i style="--emb:url('img/k/emb_${t.toLowerCase()}.webp')"></i>`:""}${t}</button>`).join("");
  $("#rosterGrid").innerHTML = HEROES.map(h=>{
    const t = h.type || "Unclassed", hide = rosterFilter!=="All" && t!==rosterFilter;
    return tcard(h, {tag:"button", lazy:true, attrs:`type="button" data-hero="${h.id}" aria-label="${esc(h.name)}, ${esc(t)}" ${hide?"hidden":""}`});
  }).join("");
}

// ================= quiz =================
// ---------- progress rail: one ring per section, split into one arc per question ----------
const C = 2*Math.PI*29;
const secQs = si => QUESTIONS.map((q,i) => [q,i]).filter(([q]) => q.sec === si);
function buildRail(){
  $("#rail").innerHTML = SECTIONS.map((s,si) => {
    const qs = secQs(si), L = C/qs.length;
    const g = qs.length > 1 ? 4.2 : 0;
    const segs = qs.map(([q,qi],k) => {
      const off = -(k*L), d0 = `${L.toFixed(2)} ${(C-L).toFixed(2)}`, d1 = `${(L-g).toFixed(2)} ${(C-L+g).toFixed(2)}`;
      return `<g class="seg" data-q="${qi}" style="--d0:${d0};--d1:${d1};--o0:${off.toFixed(2)};--o1:${(off-g/2).toFixed(2)};--dl:${k*70}ms">
        <circle class="bg" cx="32" cy="32" r="29"/>
        <circle class="fg" cx="32" cy="32" r="29"/>
        <circle class="hit" cx="32" cy="32" r="29"/></g>`;
    }).join("");
    return `<div class="node" data-si="${si}" style="--sc:${s.c}"><div class="ring"><svg viewBox="-4 -4 72 72" aria-hidden="true"><g transform="rotate(-90 32 32)">${segs}</g></svg><img src="img/k/sigil${si+1}.webp" alt=""></div><span>${s.n} · ${esc(s.name)}</span></div>`;
  }).join("");
}
function renderRail(){
  if (!$("#rail .node")) buildRail();
  const cur = QUESTIONS[idx].sec;
  document.querySelectorAll("#rail .node").forEach(n => {
    const si = +n.dataset.si, qs = secQs(si), done = qs.filter(([q]) => isTouched(q)).length;
    n.classList.toggle("cur", si === cur); n.classList.toggle("done", done === qs.length);
    n.setAttribute("title", "");
    n.querySelectorAll(".seg").forEach(g => {
      const qi = +g.dataset.q, a = answers[QUESTIONS[qi].id];
      g.classList.toggle("ans", a !== undefined); g.classList.toggle("skip", a === null);
      g.classList.toggle("now", qi === idx);
    });
  });
  document.documentElement.style.setProperty("--secc", SECTIONS[cur].c);
}
// hover name plate for a ring segment
const rtip = document.createElement("div"); rtip.className = "rtip"; rtip.setAttribute("role","tooltip"); document.body.appendChild(rtip);
document.addEventListener("pointerover", e => {
  const g = e.target.closest && e.target.closest("#rail .seg");
  if (!g){ if (!(e.target.closest && e.target.closest("#rail"))) rtip.classList.remove("on"); return; }
  const qi = +g.dataset.q, q = QUESTIONS[qi], a = answers[q.id];
  const st = a === undefined ? "Not answered yet" : a === null ? "No preference" : [].concat(a).map(i => q.opts[i].t).join(" + ");
  rtip.style.setProperty("--sc", SECTIONS[q.sec].c);
  rtip.innerHTML = `<b>Card ${qi+1}</b><span>${esc(q.q)}</span><small>${esc(st)}</small>`;
  const r = g.closest(".ring").getBoundingClientRect();
  rtip.classList.add("on");
  const w = rtip.offsetWidth; rtip.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width/2 - w/2)) + "px"; rtip.style.top = (r.bottom + 12) + "px";
  SFX.hover("hover_chip");
});
document.addEventListener("pointerout", e => { if (e.target.closest && e.target.closest("#rail .seg") && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest("#rail .seg"))) rtip.classList.remove("on"); });
function jumpTo(qi){
  if (qi === idx || qi < 0 || qi >= TOTAL) return;
  clearTimeout(advanceTimer); advanceTimer = null;
  const d = qi > idx ? 1 : -1; idx = qi; save(); rtip.classList.remove("on");
  SFX.play("deal",{gain:.55}); renderQuestion(d);
}
let lastTally = 0;
function tally(n){
  let out = "", k = 0;
  for (let g = 0; g < Math.ceil(n/5); g++){
    const m = Math.min(5, n - g*5); let s = "";
    for (let j = 0; j < m; j++, k++){
      const fresh = k >= lastTally ? "" : "animation:none;";
      s += j === 4 ? `<i class="s" style="${fresh}"></i>` : `<i style="--r:${((k*37)%7-3)*.8}deg;${fresh}"></i>`;
    }
    out += `<span class="grp">${s}</span>`;
  }
  lastTally = n; return out;
}
function renderSecText(){
  const si = QUESTIONS[idx].sec, s = SECTIONS[si], qs = QUESTIONS.filter(q=>q.sec===si), n = answeredCount();
  $("#secText").innerHTML = `<span class="label">Section ${s.n} of VI</span><div class="secbox" style="margin-top:10px"><img src="img/k/sigil${si+1}.webp" alt=""><div><h4>${esc(s.name)}</h4><p>${esc(s.blurb)} ${qs.length} questions.</p></div></div>`;
}
function footState(){
  const q = QUESTIONS[idx], a = answers[q.id], last = idx === TOTAL-1;
  const fin = document.querySelector("#qcard .finale");
  if (fin){
    const all = QUESTIONS.every(isTouched), here = last && (isAnswered(q) || a === null);
    fin.classList.toggle("on", all || here);
    fin.querySelector("b").textContent = all ? "Every card is on the table." : "That's the last card.";
    fin.querySelector("span").textContent = `${answeredCount()} of ${TOTAL} answered. Use the rings above to change anything.`;
  }
  const nb = $("#nextBtn"); if (nb){ nb.disabled = !(isAnswered(q) || a === null); nb.textContent = last ? "Reveal my hero" : "Next card"; }
  const sb = $("#skipBtn"); if (sb) sb.textContent = a === null ? "Skipped" : "No preference";

}
function renderQuestion(dir){
  const q = QUESTIONS[idx], sec = SECTIONS[q.sec];
  const a = answers[q.id]; const sel = Array.isArray(a) ? a : (a===undefined||a===null ? [] : [a]);
  const card = $("#qcard");
  card.innerHTML = `
    <div class="qtop"><span class="num">${sec.n}</span><span class="sec">${esc(sec.name)}</span><span class="count">Card <b>${idx+1}</b> of ${TOTAL}</span></div>
    <h2 id="qtext">${esc(q.q)}</h2>
    ${q.hint?`<p class="hint">${esc(q.hint)}</p>`:""}
    <div class="opts ${q.opts.length>5?"two":""}" role="group" aria-labelledby="qtext">
      ${q.opts.map((o,i)=>`<button type="button" class="opt" id="opt-${q.id}-${i}" data-i="${i}" aria-pressed="${sel.includes(i)}"><span class="k">${i<9?i+1:0}</span><span><b>${esc(o.t)}</b>${o.d?`<small>${esc(o.d)}</small>`:""}</span><span class="chk" aria-hidden="true"></span></button>`).join("")}
    </div>
    <div class="finale"><div><b></b><span></span></div><button type="button" class="btn btn-mint" id="revealBtn" data-hov>Reveal my hero</button></div>
    <div class="qfoot">
      <div class="l"><button type="button" class="btn btn-dark btn-sm" id="backBtn" data-hov ${idx===0?"disabled":""}>Back</button></div>
      <div class="r"><button type="button" class="tape" id="skipBtn" data-hov>No preference</button><button type="button" class="btn btn-mint btn-sm" id="nextBtn" data-hov>Next card</button></div>
    </div>`;
  if (dir && !RM){ card.classList.remove("deal","deal-back"); void card.offsetWidth; card.classList.add(dir > 0 ? "deal" : "deal-back"); }
  footState(); renderRail(); renderLean(); renderSecText();
}
const prevPct = {};
function renderLean(){
  const list = $("#leanList");
  if (!answeredCount()){ list.innerHTML = `<li class="empty">Answer a card to see who rises.</li>`; return; }
  const before = {}; list.querySelectorAll("li[data-id]").forEach(li => before[li.dataset.id] = li.getBoundingClientRect().top);
  const {res} = rankAll();
  const top = res.filter(r => !r.taken).slice(0,5);
  list.innerHTML = top.map(r=>{ const h=r.hero, p=Math.round(r.score*100);
    return `<li data-id="${h.id}" style="${cvars(h)}"><div class="th"><img src="${img(h.id)}" alt=""></div><div><div class="nm">${esc(h.name)}</div><div class="bar"><i style="width:${prevPct[h.id]!=null?prevPct[h.id]:p}%" data-w="${p}"></i></div></div><div class="pct">${p}%</div></li>`; }).join("");
  requestAnimationFrame(()=> list.querySelectorAll(".bar i").forEach(i => i.style.width = i.dataset.w + "%"));
  top.forEach(r => prevPct[r.hero.id] = Math.round(r.score*100));
  if (RM) return;
  list.querySelectorAll("li[data-id]").forEach(li => {
    const p = before[li.dataset.id];
    if (p === undefined){ li.animate([{opacity:0, transform:"translateX(16px)"},{opacity:1, transform:"none"}], {duration:320, easing:"cubic-bezier(.2,.8,.2,1)"}); return; }
    const dy = p - li.getBoundingClientRect().top;
    if (Math.abs(dy) > 1) li.animate([{transform:`translateY(${dy}px)`},{transform:"none"}], {duration:460, easing:"cubic-bezier(.2,.8,.2,1)"});
  });
}
function syncPressed(){
  const q = QUESTIONS[idx], a = answers[q.id];
  const sel = Array.isArray(a) ? a : (a===undefined||a===null ? [] : [a]);
  document.querySelectorAll("#qcard .opt").forEach(b => b.setAttribute("aria-pressed", sel.includes(+b.dataset.i)));
}
function afterAnswer(wasDone){
  footState(); renderRail(); renderLean(); renderSecText();
  const si = QUESTIONS[idx].sec;
  if (!wasDone && secDone(si)) SFX.play("chime", {gain:.5, delay:.18});
  save();
}
function choose(i){
  const q = QUESTIONS[idx];
  if (!q.multi && answers[q.id] === i && advanceTimer) return;
  clearTimeout(advanceTimer); advanceTimer = null;
  const wasDone = secDone(q.sec);
  if (q.multi){
    let cur = Array.isArray(answers[q.id]) ? answers[q.id].slice() : [];
    if (cur.includes(i)){ cur = cur.filter(x=>x!==i); SFX.play("deselect",{gain:.6}); }
    else { cur.push(i); if (cur.length > q.multi) cur.shift(); SFX.play("select",{gain:.5});  }
    if (cur.length) answers[q.id] = cur; else delete answers[q.id];
    syncPressed(); afterAnswer(wasDone); return;
  }
  answers[q.id] = i; syncPressed();
  SFX.play("select",{gain:.5}); 
  afterAnswer(wasDone);
  if (idx < TOTAL-1) advanceTimer = setTimeout(()=>go(1), RM ? 120 : 520);
}
function go(d){
  clearTimeout(advanceTimer); advanceTimer = null;
  const n = idx + d;
  if (n >= TOTAL){ finish(); return; }
  if (n < 0) return;
  idx = n; save();
  SFX.play("deal",{gain:.55});
  renderQuestion(d);
  const f = document.querySelector("#qcard .opt[aria-pressed='true']") || document.querySelector("#qcard .opt");
  if (f) f.focus({preventScroll:true});
}
function skip(){
  const q = QUESTIONS[idx], wasDone = secDone(q.sec);
  answers[q.id] = null; SFX.play("skip",{gain:.55}); afterAnswer(wasDone); go(1);
}
function startQuiz(fresh){
  friendView = null; lastTally = 0; $("#rail").innerHTML = "";
  if (fresh){ answers = {}; idx = 0; clearSave(); for (const k in prevPct) delete prevPct[k]; }
  show("viewQuiz"); renderQuestion(1); syncHash();
  const f = document.querySelector("#qcard .opt"); if (f) f.focus({preventScroll:true});
}

// ================= explanation =================
const band = v => v < 1.5 ? 0 : v < 3 ? 1 : 2;
function heroLine(d, hv, h){
  if (d === "cx") return ["In-game complexity 1 of 4: easy to pick up","In-game complexity 2 of 4","In-game complexity 3 of 4: a demanding kit","In-game complexity 4 of 4: the hardest kit"][h.cx-1];
  return DIM_TEXT[d].hero[band(hv)];
}
function explain(entry){
  const h = entry.hero, why = [], trade = [];
  for (const p of entry.parts){
    if (p.kind === "dim"){
      if (p.weight >= 1.5 && p.s >= 0.8) why.push({ w:p.weight*p.s, s:p.s, b:heroLine(p.d,p.hv,h), sm:`You asked for ${DIM_TEXT[p.d].want[band(p.target)]}.` });
      else if (p.weight >= 2 && p.s <= 0.6) trade.push({ w:p.weight*(1-p.s), s:p.s, b:heroLine(p.d,p.hv,h), sm:`You leaned towards ${DIM_TEXT[p.d].want[band(p.target)]}.` });
    } else if (p.kind === "cat"){
      const lbl = CATS[p.cat][p.val];
      if (p.s >= 0.75){
        const sm = p.cat==="feel" ? `${h.weapon}${h.gun?` · in-game tag: ${h.gun}`:""}` : p.cat==="type" ? `Deadlock files ${h.name} as a ${h.type}.` : p.cat==="vibe" ? `You picked ${lbl.toLowerCase()}.` : `One of the gimmicks you picked.`;
        const b = p.cat==="feel" ? `Matches your weapon feel: ${lbl.toLowerCase()}` : p.cat==="type" ? `In your chosen class: ${h.type}` : p.cat==="vibe" ? `Fits the aesthetic you chose` : `Built around ${lbl.toLowerCase()}`;
        why.push({ w:p.weight*p.s, s:p.s, b, sm });
      } else if (p.s === 0 && (p.cat==="type" || p.cat==="feel")){
        trade.push({ w:p.weight*0.8, s:0, b: p.cat==="type" ? `Not a ${p.val}: filed as ${h.type || "unclassed"}` : `Its gun isn't a ${lbl.toLowerCase()}`, sm: p.cat==="feel" ? `${h.weapon}${h.gun?` · in-game tag: ${h.gun}`:""}` : `You picked ${p.val}.` });
      }
    } else if (p.kind === "cap"){
      if (p.s >= 1) why.push({ w:1.6, s:1, b:"Inside your complexity comfort zone", sm:`In-game complexity ${h.cx} of 4.` });
      else trade.push({ w:p.weight*(1-p.s)+1, s:p.s, b:"Harder than you asked for", sm:`In-game complexity ${h.cx} of 4; your answers point to ${p.cap} or lower.` });
    }
  }
  why.sort((a,b)=>b.w-a.w); trade.sort((a,b)=>b.w-a.w);
  return { why: why.slice(0,4), trade: trade.slice(0,2) };
}
function bestReason(entry, top){
  let best = null;
  for (const p of entry.parts){
    const q = top.parts.find(x => x.kind===p.kind && (p.kind==="dim" ? x.d===p.d : p.kind==="cat" ? (x.cat===p.cat && x.val===p.val) : true));
    if (!q) continue;
    const gain = p.weight*(p.s - q.s);
    if (gain > 0.05 && (!best || gain > best.gain)) best = { gain, p };
  }
  if (best){
    const p = best.p, h = entry.hero;
    const what = p.kind==="dim" ? heroLine(p.d, p.hv, h) : p.kind==="cat" ? (p.cat==="type" ? `A ${h.type}` : p.cat==="feel" ? `${h.gun || h.weapon}` : p.cat==="vibe" ? "Closer to the aesthetic you chose" : `Built around ${CATS.gim[p.val].toLowerCase()}`) : `Complexity ${h.cx} of 4`;
    return `<em>Beats ${esc(top.hero.name)} on ${esc(p.kind==="dim" ? DIM_TEXT[p.d].label.toLowerCase() : p.kind==="cat" ? ({feel:"weapon feel",gim:"gimmicks",vibe:"aesthetic",type:"class"})[p.cat] : "complexity")}:</em> ${esc(what)}`;
  }
  const e = explain(entry); return e.why[0] ? esc(e.why[0].b) : "";
}

// ================= result rendering =================
function statBlock(label, val, unit, key, color){
  const [lo,hi] = RNG[key]; const pct = hi>lo ? 12 + 88*(val-lo)/(hi-lo) : 60;
  return `<div class="stat"><span class="label">${label}</span><div class="v">${val}${unit?`<small>${unit}</small>`:""}</div><div class="hbar" title="Roster range ${lo} to ${hi}"><i style="width:${pct.toFixed(1)}%;--bar:${color}"></i></div></div>`;
}
function seg(v){ return `<span class="seg">${[1,2,3,4].map(i=>`<i class="${v>=i?"on":v>=i-0.5?"half":""}"></i>`).join("")}</span>`; }
function confidence(res){
  const m = (res[0].score - res[1].score)*100;
  return m >= 4 ? "Clear pick" : m >= 1.5 ? "Solid pick" : "Close call";
}
// the hero's in-game name logo, tinted with their colour; the text stays for screen readers
const nameMark = (h, cls) => NM[h.id] ? `<span class="nmark ${cls||""}" style="--nm:url('img/nm/${h.id}.svg');--ar:${NM[h.id]}" role="img" aria-label="${esc(h.name)}"></span>` : esc(h.name);
function stage(h, entry, rank, o){
  o = o || {};
  const pct = entry ? Math.round(entry.score*100) : null;
  return `<div class="hstage ${pct===null?"nomatch":""}" style="--hero:${h.color};--hero-bright:${h.c2}">
    <div class="collage" style="background-image:url('img/rnd/${h.id}.webp')"></div><div class="dots"></div>
    <div class="flip ${o.flipped?"on":""}" id="${o.flipId||"flip"}"><div class="face back"><img class="frame" src="img/k/${frame(h)}.webp" alt=""><img class="mk" src="img/k/mark_menu.webp" alt=""></div><div class="face front">${tcard(h,{plate:false, gloat:true, cls: o.holo ? "holo-on" : ""})}</div></div>
    <div class="info">
      <div class="eyebrow"><span class="backer">${o.eyebrow ? esc(o.eyebrow) : rank===1?"Your hero":rank?`Rank ${rank} of ${HEROES.length}`:"Hero dossier"}</span></div>
      <h2 class="hname">${nameMark(h)}</h2>
      <div class="meta"><span>${esc(h.type||"No class")}</span><span class="cx">Complexity <img src="img/k/num${h.cx}.webp" alt="${h.cx} of 4"></span></div>
      <div class="chips">${h.gun?`<span class="tape red">${esc(h.gun)}</span>`:""}${h.tags.map(t=>`<span class="tape">${esc(t)}</span>`).join("")}</div>
      <div class="vo" data-vo="${h.id}"><span class="wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div><q>${o.voNow?esc(o.voNow):""}</q><div class="by"><button type="button" data-vonext="${h.id}" data-hov>Another line</button></div></div></div>
      <p class="pitch">${esc(h.pitch)}</p>
    </div>
    ${pct!==null?`<div class="match"><img src="img/k/award.webp" alt=""><div><div class="big"><span id="pctN">${o.count?0:pct}</span><sup>%</sup></div><span class="conf">${esc(o.conf||"Match")}</span></div></div>`:""}
  </div>`;
}
// ---------- voice lines ----------
let voTimer = 0, voTok = 0;
const voText = l => l[0];
function stopVoice(){ clearInterval(voTimer); voTok++; VOX.stop(); }
function typeLine(el, line, ms){
  const q = el.querySelector("q"); el.classList.add("talk");
  if (RM){ q.textContent = line; setTimeout(()=>el.classList.remove("talk"), ms || 600); return; }
  const step = Math.max(16, Math.min(60, (ms || line.length*34) / Math.max(1,line.length)));
  let i = 0; q.innerHTML = `<span class="caret"></span>`;
  voTimer = setInterval(() => {
    i += line[i] === " " ? 2 : 1;
    q.innerHTML = `${esc(line.slice(0,i))}<span class="caret"></span>`;
    if (i >= line.length){ clearInterval(voTimer); q.textContent = line; }
  }, step);
  setTimeout(() => { if (el.isConnected) el.classList.remove("talk"); }, (ms || line.length*34) + 300);
}
// plays the in-game recording and types the subtitle in time with it
function speak(el, id, entry){
  if (!el) return; stopVoice(); const tok = voTok;
  const line = entry[0];
  VOX.play(id, entry[1]).then(d => { if (tok === voTok) typeLine(el, line, d*1000*.9); }, () => { if (tok === voTok) typeLine(el, line); });
}
const voLast = {};
function randomLine(id){
  const p = [VO[id].s].concat(VO[id].r); let l;
  do { l = p[Math.floor(Math.random()*p.length)]; } while (p.length > 1 && voText(l) === voLast[id]);
  voLast[id] = voText(l); return l;
}
function overview(h){
  const o = OV[h.id] || {};
  return `<div class="ovpop" role="dialog" aria-label="In-game overview"><span class="label">In-game overview</span>
    ${h.role?`<p class="rl">${esc(h.role)}</p>`:""}
    ${o.p?`<p>${esc(o.p)}</p>`:""}
    ${o.l?`<span class="label" style="margin-top:10px">Lore</span><p class="lore">${esc(o.l)}</p><button type="button" class="more" data-lore>Read the full lore</button>`:""}</div>`;
}
function lorePanel(h){
  const o = OV[h.id] || {}; if (!o.l && !o.p) return "";
  const paras = (o.l || "").split(/(?<=[.!?…])\s{2,}|\n+/).filter(Boolean);
  return `<div class="lore" data-lore-id="${h.id}"><div class="lclip"><div class="lin" data-lore-toggle>
      <div class="lh"><span class="label">Backstory</span>${h.role?`<span class="rl">${esc(h.role)}</span>`:""}</div>
      <div class="lt">${o.p?`<p class="pl">${esc(o.p)}</p>`:""}${paras.map(t => `<p>${esc(t)}</p>`).join("")}</div>
    </div></div>
    <button type="button" class="more" data-lore-toggle data-hov><span>Read the full story</span><i></i></button></div>`;
}
function toggleLore(box){
  const open = !box.classList.contains("open");
  box.style.setProperty("--lh", box.querySelector(".lin").scrollHeight + 4 + "px");
  box.classList.toggle("open", open);
  box.querySelector(".more span").textContent = open ? "Show less" : "Read the full story";
  SFX.play(open ? "open" : "close",{gain:.4});
}
const NOT_PASSIVE = new Set(["Lil Helpers"]);
const isPassive = a => { const s = ABS[a[1]]; return !!s && !s.cd && !s.ch && !NOT_PASSIVE.has(a[0]); };
function kitPanel(h, cls){
  return `<div class="board ${cls||"c7"}"><span class="label">Abilities</span><h3>The kit</h3>
    <ul class="kit">${h.ab.map((a,i)=>`<li data-ab="${a[1]}" data-i="${i}" data-hid="${h.id}" style="--tipc:${h.c2}"><button type="button" class="krow" aria-expanded="false" data-hov><span class="aicon"><img src="img/ab/${a[1]}.webp" alt=""><span>${i+1}</span></span><span class="ktx"><b>${esc(a[0])}${i===3?"<em>Ultimate</em>":isPassive(a)?`<em class="pas">Passive</em>`:""}</b><span class="kp">${esc(h.abText[i])}</span></span><span class="kchev" aria-hidden="true"></span></button><div class="kdet"><div class="kin"><div></div></div></div></li>`).join("")}</ul></div>`;
}
// ---------- ability tooltip ----------
const tipEl = $("#tip"); let tipT = 0, tipFor = null;
const fmtN = v => { const n = +v; return isFinite(n) ? (Math.abs(n) >= 100 ? Math.round(n) : +n.toFixed(2)) + "" : String(v); };
const ICO = {
  clock:`<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.2"/><path d="M8 4.5V8l2.6 1.6"/></svg>`,
  range:`<svg viewBox="0 0 16 16"><path d="M1.5 8h13M4.5 5 1.5 8l3 3M11.5 5l3 3-3 3"/></svg>`,
  radius:`<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.2"/><circle cx="8" cy="8" r="1.4"/><path d="M8 8h6"/></svg>`,
  time:`<svg viewBox="0 0 16 16"><path d="M4 1.8h8M4 14.2h8M5 2c0 3.4 6 3.6 6 6s-6 2.6-6 6M11 2c0 3.4-6 3.6-6 6s6 2.6 6 6"/></svg>`,
  ap:`<svg viewBox="0 0 16 16"><path d="M8 1.5 14.5 8 8 14.5 1.5 8Z"/><path d="M9 4.8 6.4 8.6h2.4L7.2 11.4"/></svg>`,
  sp:`<svg viewBox="0 0 16 16"><path d="m8 1.8 1.8 4 4.4.4-3.3 2.9 1 4.3L8 11.2 4.1 13.4l1-4.3L1.8 6.2l4.4-.4Z"/></svg>`
};
const chipKind = k => /range|distance/i.test(k) ? "range" : /radius|width|aoe/i.test(k) ? "radius" : /duration|delay|window|time/i.test(k) ? "time" : null;
function tipHTML(li){
  const h = BY[li.dataset.hid], i = +li.dataset.i, a = h.ab[i], s = ABS[a[1]] || {s:[],u:[]};
  const sc = r => r[3] ? `<em class="sc">${ICO.sp}x${fmtN(r[3])}</em>` : "";
  const val = r => `${esc(r[1])}<small>${esc(r[2]||"")}</small>`;
  const chips = [], boxes = [];
  s.s.forEach(r => { const k = chipKind(r[0]); if (k && chips.length < 3) chips.push([k, r]); else boxes.push(r); });
  const ups = (s.u||[]).map((u,n) => { const m = /^T(\d):\s*(.*)$/.exec(u); return `<div class="tu"><b>${ICO.ap}${[1,2,5][n]||n+1}</b><span>${esc(m ? m[2] : u).replace(/; /g,"<br>")}</span></div>`; }).join("");
  return `<div class="th"><img src="img/ab/${a[1]}.webp" alt=""><div><b>${esc(a[0])}</b><small>${i===3?"<em>Ultimate</em>":isPassive(a)?`Ability ${i+1} · <em class="pas">Passive</em>`:`Ability ${i+1}`}</small></div>${s.cd?`<span class="tcd">${ICO.clock}${fmtN(s.cd)}<small>s</small></span>`:""}</div>
    ${chips.length || s.ch ? `<div class="tchips">${s.ch?`<span class="tchip">${ICO.ap}${s.ch}<small>charges</small></span>`:""}${chips.map(([k,r]) => `<span class="tchip" title="${esc(r[0])}">${sc(r)}${ICO[k]}${val(r)}</span>`).join("")}</div>` : ""}
    ${s.d?`<p class="tdesc">${esc(s.d)}</p>`:""}
    ${boxes.length?`<div class="tboxes">${boxes.map(r => `<div class="tbox">${sc(r)}<b>${val(r)}</b><span>${esc(r[0])}</span></div>`).join("")}</div>`:""}
    ${ups?`<div class="tups">${ups}</div>`:""}`;
}
function abDetail(li){
  const full = tipHTML(li), tmp = document.createElement("div"); tmp.innerHTML = full;
  const cd = tmp.querySelector(".tcd"), chips = tmp.querySelector(".tchips");
  tmp.querySelector(".th").remove();
  if (cd){ cd.classList.add("tchip"); if (chips) chips.prepend(cd); else { const c = document.createElement("div"); c.className = "tchips"; c.appendChild(cd); tmp.prepend(c); } }
  return tmp.innerHTML;
}
// the kit board keeps room for its tallest ability detail, so opening one never resizes the boards
function fitKit(root){
  (root || document).querySelectorAll(".kit").forEach(kit => {
    const board = kit.closest(".board"); if (!board || !board.offsetParent) return;
    kit.querySelectorAll(":scope > li").forEach(li => { const b = li.querySelector(".kdet .kin > div"); if (b && !b.innerHTML) b.innerHTML = abDetail(li); });
    board.style.minHeight = ""; board.style.height = "";
    if (innerWidth <= 1020) return;
    // measure the kit's own content (the board itself may be stretched by its neighbour in the row).
    // every detail's current height is subtracted, so the result doesn't depend on what is open or mid-animation
    let max = 0, now = 0;
    kit.querySelectorAll(":scope > li").forEach(li => { const k = li.querySelector(".kdet .kin"), d = k.firstElementChild; now += k.offsetHeight; max = Math.max(max, d.offsetHeight + 6); });
    const pb = parseFloat(getComputedStyle(board).paddingBottom) || 0;
    const closed = kit.offsetTop + kit.offsetHeight - now + pb;
    // a fixed height (not a minimum): while one detail closes and another opens, their combined height can
    // briefly overshoot; that overshoot stays inside the bottom padding instead of stretching the board
    const want = Math.ceil(closed + max + 2);
    board.style.minHeight = want + "px"; board.style.height = want + "px";
    const nb = board.nextElementSibling; if (nb && nb.classList.contains("c5") && nb.offsetHeight > want) board.style.height = nb.offsetHeight + "px";
    kitWidth.set(kit, kit.clientWidth);
    if (kitRO && !kit.dataset.ro){ kit.dataset.ro = 1; kitRO.observe(kit); }
  });
}
// text in the details rewraps when the column width changes (a scrollbar appearing is enough), so refit then
const kitWidth = new WeakMap();
const kitRO = window.ResizeObserver ? new ResizeObserver(es => es.forEach(e => { const k = e.target; if (k.isConnected && kitWidth.get(k) !== k.clientWidth) fitKit(k.closest(".board").parentNode); })) : null;
let fitT = 0; window.addEventListener("resize", () => { clearTimeout(fitT); fitT = setTimeout(() => fitKit(), 150); });
if (document.fonts) document.fonts.ready.then(() => fitKit());
function toggleAb(li){
  const btn = li.querySelector(".krow"), body = li.querySelector(".kdet .kin > div"), open = btn.getAttribute("aria-expanded") !== "true";
  if (open && !body.innerHTML) body.innerHTML = abDetail(li);
  if (open) li.parentNode.querySelectorAll(":scope > li.open").forEach(o => { if (o !== li){ o.classList.remove("open"); o.querySelector(".krow").setAttribute("aria-expanded", "false"); } });
  btn.setAttribute("aria-expanded", open); li.classList.toggle("open", open);
  SFX.play(open ? "hover_ab" : "close", {gain: open ? .55 : .35});
}
function placeTip(li){
  const r = li.getBoundingClientRect(), tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
  let x = r.left + 70, y = r.bottom + 8;
  if (x + tw > innerWidth - 12) x = innerWidth - 12 - tw;
  if (y + th > innerHeight - 12) y = Math.max(12, r.top - th - 8);
  tipEl.style.left = Math.max(12, x) + "px"; tipEl.style.top = y + "px";
}
function showTip(li){
  tipFor = li; const h = BY[li.dataset.hid];
  tipEl.style.setProperty("--tipc", h.c2);
  tipEl.innerHTML = tipHTML(li); tipEl.setAttribute("aria-hidden","false");
  placeTip(li); tipEl.classList.add("on"); SFX.play("hover_ab",{gain:.5});
}
function hideTip(){ clearTimeout(tipT); tipFor = null; tipEl.classList.remove("on"); tipEl.setAttribute("aria-hidden","true"); }
window.addEventListener("scroll", () => { if (tipFor) hideTip(); closeInfo(); }, {passive:true});
document.addEventListener("scroll", e => { if (tipFor) hideTip(); if (!(e.target.closest && e.target.closest(".ovpop"))) closeInfo(); }, {passive:true, capture:true});

function statsPanel(h, cls){
  const T = i => h.t[i]; const sp = Math.round(T(1)/4*100);
  return `<div class="board ${cls||"c5"}"><span class="label">Base stats</span><h3>By the numbers</h3>
    <div class="stats">
      ${statBlock("Health",h.hp,"","hp","#7BBA1D")}
      ${statBlock("Move speed",h.move,"m/s","move",h.c2)}
      ${statBlock("Sprint bonus",h.sprint,"m/s","sprint",h.c2)}
      ${statBlock("Stamina",h.stam,"charges","stam","#70F8C1")}
      ${statBlock("Weapon DPS",h.dps,"","dps","#EC9719")}
      ${statBlock("Health regen",h.regen,"/s","regen","#7BBA1D")}
    </div>
    <p class="src"><button type="button" class="linkish" data-cmp="${h.id}" data-hov>Compare ${esc(h.name)} with others</button></p>
    <div class="lean2"><span class="label">Playstyle profile</span>
      <div class="dmg"><span class="ic" style="--m:url('img/k/tab_weapon.webp');background:var(--weapon)"></span><span class="bar"><i style="width:${100-sp}%;background-color:var(--weapon)"></i><i style="width:${sp}%;background-color:var(--spirit)"></i></span><span class="ic" style="--m:url('img/k/tab_spirit.webp');background:var(--spirit)"></span></div>
      <div class="dmg-l"><span style="color:var(--weapon)">Weapon</span><span style="color:var(--spirit)">Spirit</span></div>
      <div class="prof">
        <div><span>Range</span>${seg(T(2))}</div><div><span>Mobility</span>${seg(T(3))}</div><div><span>Durability</span>${seg(T(4))}</div>
        <div><span>Crowd control</span>${seg(T(6))}</div><div><span>Ally support</span>${seg(T(5))}</div><div><span>Aim demand</span>${seg(T(8))}</div>
      </div>
    </div></div>`;
}
function othersPanel(h){
  const tiles = XG.map(g => {
    const it = xitem(g, g.fwd[h.id]); if (!it) return "";
    const also = g.list.filter(x => x !== it && x[3].includes(h.id)).slice(0,3).map(x => x[0]);
    return `<div class="g" data-hov data-twin="${g.id}" data-twn="${esc(it[0])}" role="button" tabindex="0" aria-label="See every Deadlock match for ${esc(it[0])}"><span class="gn tape">${esc(g.name)}</span>
      <div class="who">${xp(g, it)}<div><b>${esc(it[0])}</b><span class="rl">${esc(g.roles[it[1]])}${it[2] && it[2] !== g.roles[it[1]]?` · ${esc(it[2])}`:""}</span></div></div>
      <p>${esc(it[4])}</p>
      ${also.length?`<div class="also">Also close: <span>${also.map(esc).join(", ")}</span></div>`:""}<span class="more2">See all matches<i></i></span></div>`;
  }).join("");
  return `<div class="board c12"><span class="label">Closest match in other games</span><h3>If you play…</h3>
    <div class="xg">${tiles}</div></div>`;
}
function whyPanel(entry){
  const {why, trade} = explain(entry); const h = entry.hero;
  const skipped = QUESTIONS.filter(q => !isAnswered(q)).length;
  if (entry.team && entry.team.length) why.unshift(...entry.team.map(t => ({ b:`Teams up with ${allyName(t.a)}`, s:null, add:t.p*4, sm:t.why })));
  if (entry.taken) return `<div class="board chalk c7"><span class="label">The reading</span><h3>Your friend's pick</h3><p class="none">A friend of yours already plays ${esc(h.name)}, so it's left out of your ranking. Remove them under "Playing with friends?" to rank ${esc(h.name)} again.</p></div>`;
  return `<div class="board chalk c7"><span class="label">The reading</span><h3>Why ${esc(h.name)}</h3>
    ${why.length?`<ul class="why">${why.map(x=>`<li><i></i><div><b>${esc(x.b)}<span class="fit">${x.add ? `+${x.add}%` : Math.round(x.s*100) + "%"}</span></b><small>${esc(x.sm)}</small></div></li>`).join("")}</ul>`:`<p class="none">Answer a few more questions for a detailed breakdown.</p>`}
    <span class="subhead">Trade-offs</span>
    ${trade.length?`<ul class="why">${trade.map(x=>`<li class="x"><i></i><div><b>${esc(x.b)}</b><small>${esc(x.sm)}</small></div></li>`).join("")}</ul>`:`<p class="none ok"><img src="img/k/chalk_smile.webp" alt="">No major conflicts with your answers.</p>`}
    ${skipped>=8?`<div class="frog"><img src="img/k/frog.webp" alt=""><div><b>The Cheater Frog noticed ${skipped} skipped cards.</b><p>With that many blanks the reading leans on fewer answers, so treat this pick as a rough guess.</p></div></div>`:""}
  </div>`;
}
function countUp(el, to){
  if (!el) return;
  if (RM){ el.textContent = to; return; }
  const t0 = performance.now(), d = 1100; let lastTick = 0;
  (function step(t){
    const k = Math.min(1,(t-t0)/d), v = Math.round(to*(1-Math.pow(1-k,3)));
    el.textContent = v;
    if (v - lastTick >= 14 && k < 1){ lastTick = v; SFX.play("tick",{gain:.22, jitter:0}); }
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}
function renderResult(focusId, reveal, quiet){
  const {res} = lastRank; const top = res[0];
  const cur = focusId ? res.find(r=>r.hero.id===focusId) : top;
  const h = cur.hero, rank = res.indexOf(cur)+1;
  const box = $("#result");
  box.style.setProperty("--hero", h.color); box.style.setProperty("--hero-bright", h.c2);
  const ups = res.filter(r => r !== top && !r.taken).slice(0,3);
  const pct0 = r => r.taken ? "" : Math.round(r.score*100) + "%";
  box.innerHTML = `
    <div class="viewing ${rank!==1?"on":""}"><span>Viewing ${esc(h.name)}${cur.taken?", already played by your friend":`, ranked ${rank} of ${HEROES.length} for you`}. Your pick is ${esc(top.hero.name)}.</span><button type="button" class="tape mint" data-view="${top.hero.id}" data-hov>Back to ${esc(top.hero.name)}</button></div>
    ${stage(h, cur.taken ? null : cur, cur.taken ? 0 : rank, {count:!quiet, holo:true, flipped:quiet, eyebrow: cur.taken ? "Your friend's pick" : "", conf: rank===1 ? confidence(res) : `${Math.round(cur.score*100)} vs ${Math.round(top.score*100)} for ${top.hero.name}`})}
    ${lorePanel(h)}
    <div class="rgrid">
      ${whyPanel(cur)}
      ${statsPanel(h)}
      ${kitPanel(h)}
      <div class="board c5"><span class="label">Close contenders</span><h3>Also in the cards</h3>
        <div class="ups" style="grid-template-columns:1fr">${ups.map(r=>`<button type="button" class="up" data-view="${r.hero.id}">${tcard(r.hero,{plate:false})}<div><b>${esc(r.hero.name)}</b><span class="pc">${Math.round(r.score*100)}%</span>${r.bonus?`<span class="tb">+${Math.round(r.bonus*100)} team</span>`:""}<small>${bestReason(r, top)}</small></div></button>`).join("")}</div>
        ${TEAM_ON ? alliesBlock() : ""}
      </div>
      ${TEAM_ON ? teamPanel(h) : ""}
      ${othersPanel(h)}
      <div class="board c12"><span class="label">Everyone else</span><h3>Full standings</h3>
        <ol class="ranks">${res.map((r,i)=>`<li class="${r.taken?"taken":""}"><button type="button" data-view="${r.hero.id}" class="${r.hero.id===h.id?"cur":""}" style="${cvars(r.hero)}"><span class="n">${r.taken?"–":i+1}</span><span class="th"><img src="${img(r.hero.id)}" alt="" loading="lazy"></span><span><span class="nm">${esc(r.hero.name)}<small>${r.taken?"Your friend's pick":esc(r.hero.type||"No class")}</small>${r.bonus?`<span class="tb">+${Math.round(r.bonus*100)}</span>`:""}</span><div class="bar"><i style="width:${r.taken?0:Math.round(r.score*100)}%"></i></div></span><span class="p">${pct0(r)}</span></button></li>`).join("")}</ol>
        <div class="actions">
          <button type="button" class="btn btn-mint btn-sm" id="shareBtn" data-hov>Share my result</button>
          <button type="button" class="btn btn-dark btn-sm" data-cmp="${[top].concat(ups).slice(0,3).map(r=>r.hero.id).join(",")}" data-hov>Compare my top three</button>
          <button type="button" class="btn btn-dark btn-sm" id="reviewBtn" data-hov>Change my answers</button>
          <button type="button" class="btn btn-dark btn-sm" id="retakeBtn" data-hov>Start over</button>
        </div>
      </div>
    </div>`;
  fitKit(box); setTimeout(() => fitKit(box), 450);
  if (quiet) return;
  flipIn(h, cur.taken ? null : Math.round(cur.score*100), reveal, cur.taken ? randomLine(h.id) : VO[h.id].s);
  if (reveal && box.querySelector(".frog")) SFX.play("frog",{gain:.5, delay:2.6});
}
// turns the result card over, counts the match up and plays the line
function flipIn(h, pct, reveal, line){
  const fl = $("#flip"), vo = $("#result .vo");
  voLast[h.id] = voText(line);
  if (RM){ fl.classList.add("on"); if (pct != null) $("#pctN").textContent = pct; speak(vo, h.id, line); return; }
  setTimeout(()=>{ fl.classList.add("on"); SFX.play("flip", {gain: reveal ? .55 : .4}); if (pct != null) countUp($("#pctN"), pct); }, reveal ? 520 : 140);
  setTimeout(()=> speak(vo, h.id, line), reveal ? 1250 : 520);
}
// with almost nothing answered any pick would be a coin toss, so the Cheater Frog shows up instead of a hero
const FROG_MIN = 5;
function frogResult(){
  const n = answeredCount(), first = QUESTIONS.findIndex(q => !isAnswered(q));
  $("#result").innerHTML = `<div class="frogpage">
    <img class="fr" src="img/k/frog.webp" alt="">
    <div><span class="backer">No hero dealt</span>
      <h2>The Cheater Frog caught you.</h2>
      <p>You answered ${n} of ${TOTAL} cards. With that few, any hero would be a guess, and the frog doesn't deal guesses. Answer at least ${FROG_MIN} and the cards will turn.</p>
      <div class="actions"><button type="button" class="btn btn-mint btn-sm" id="frogBack" data-q="${Math.max(0,first)}" data-hov>Answer more cards</button><button type="button" class="btn btn-dark btn-sm" id="retakeBtn" data-hov>Start over</button><button type="button" class="btn btn-dark btn-sm" id="frogRoster" data-hov>Browse the roster</button></div>
    </div></div>`;
  show("viewResult"); SFX.play("frog",{gain:.55, delay:.2});
}
function finish(){
  if (answeredCount() < FROG_MIN) return frogResult();
  lastRank = rankAll(); save();
  lastRank.res.slice(0,4).forEach(r => warmHero(r.hero.id));
  const rv = $("#reveal");
  if (RM){ show("viewResult"); renderResult(null, true); return; }
  rv.hidden = false; rv.classList.remove("out"); SFX.play("start",{gain:.55});
  let done = false;
  const go2 = () => { if (done) return; done = true;
    show("viewResult"); renderResult(null, true); SFX.play("lockin",{gain:.8}); SFX.play("reveal",{gain:.55, delay:.1});
    rv.classList.add("out"); setTimeout(()=>{ rv.hidden = true; rv.classList.remove("out"); }, 720); };
  rv.onclick = go2; setTimeout(go2, 1550);
}
let dossierId = null;
function stepDossier(d){
  if (!dossierId) return;
  const L = HEROES, i = L.findIndex(h => h.id === dossierId), n = L[(i + d + L.length) % L.length];
  SFX.play("deal",{gain:.5}); openDossier(n.id, d);
}
let ignorePop = false;
function openDossier(id, dir, fromPop){
  id = heroId(id); const h = BY[id]; if (!h) return;
  const body = $("#modalBody"); dossierId = id;
  const L = HEROES, i = L.findIndex(x => x.id === id), pv = L[(i-1+L.length)%L.length], nx = L[(i+1)%L.length];
  $("#dPrev").setAttribute("aria-label", `Previous hero: ${pv.name}`); $("#dPrev").querySelector("small").textContent = pv.name;
  $("#dNext").setAttribute("aria-label", `Next hero: ${nx.name}`); $("#dNext").querySelector("small").textContent = nx.name;
  warmHero(pv.id); warmHero(nx.id);
  body.style.setProperty("--hero", h.color); body.style.setProperty("--hero-bright", h.c2);
  body.innerHTML = `${stage(h,null,0,{flipped:true, flipId:"flipM"})}${lorePanel(h)}<div class="rgrid">${kitPanel(h,"c7")}${statsPanel(h,"c5")}${TEAM_ON ? teamPanel(h) : ""}${othersPanel(h)}</div>`;
  const wasOpen = !$("#modal").hidden;
  $("#modal").hidden = false; document.body.style.overflow = "hidden"; $("#modal").scrollTop = 0; fitKit(body); setTimeout(() => { if (dossierId === id) fitKit(body); }, 450);
  if (!wasOpen){ SFX.play("open",{gain:.5}); $("#modalClose").focus(); }
  else if (dir && !RM) body.animate([{opacity:0, transform:`translateX(${dir*40}px)`},{opacity:1, transform:"none"}], {duration:320, easing:"cubic-bezier(.2,.8,.2,1)"});
  { const vo = body.querySelector(".vo"), line = randomLine(id); speak(vo, id, line); }
  if (!fromPop){ try { const u = "#hero=" + id; if (wasOpen && history.state && history.state.dossier) history.replaceState({dossier:id}, "", u); else history.pushState({dossier:id}, "", u); } catch(e) {} }
}
function closeDossier(fromPop){
  if ($("#modal").hidden) return; hideTip(); $("#modal").hidden = true; stopVoice(); dossierId = null;
  if ($("#share").hidden) document.body.style.overflow = ""; SFX.play("close",{gain:.45});
  if (!fromPop && history.state && history.state.dossier){ ignorePop = true; try { history.back(); } catch(e) { ignorePop = false; } }
}
// keeps the address bar in step with what's on screen, so a copied address reopens the same view
function syncHash(){
  let h = "";
  if (!$("#modal").hidden && dossierId) return;
  if (!$("#viewCompare").hidden) h = cmpIds.length ? `#compare=${cmpIds.join(",")}` : "#compare";
  else if (!$("#viewTwin").hidden) h = "#twin";
  else if (!$("#viewResult").hidden && friendView && friendView.code) h = "#r=" + encodeURIComponent(friendView.code);
  try { history.replaceState(null, "", h || location.pathname + location.search); } catch(e) {}
}
window.addEventListener("popstate", e => {
  if (ignorePop){ ignorePop = false; syncHash(); return; }
  const st = e.state || {};
  if (st.dossier && heroId(st.dossier)) openDossier(st.dossier, 0, true);
  else if (!$("#modal").hidden) closeDossier(true);
  else if (!$("#share").hidden) closeShare();
});

// ================= team fit =================
// friends' heroes: [{h: heroId, n: name or ""}]; heroes that team up well with them get a small boost,
// and a hero a friend already plays is taken off your list (a team can't field the same hero twice)
let allies = [], allyPick = false;
try { const a = JSON.parse(localStorage.getItem("dlhf.allies") || "[]"); if (Array.isArray(a)) allies = a.filter(x => x && BY[x.h]).slice(0,3); } catch(e) {}
function saveAllies(){ try { localStorage.setItem("dlhf.allies", JSON.stringify(allies)); } catch(e) {} }
const allyName = a => a.n ? `${a.n}'s ${BY[a.h].name}` : BY[a.h].name;
const teamOf = id => TEAM[id] || {w:[], c:[]};
function applyTeam(rk){
  const on = TEAM_ON && allies.length, ids = allies.map(a => a.h);
  rk.res.forEach(r => {
    if (r.base == null) r.base = r.score;
    r.score = r.base; r.team = []; r.bonus = 0; r.taken = false;
    if (!on) return;
    if (ids.includes(r.hero.id)){ r.taken = true; return; }
    allies.forEach(a => {
      const mine = teamOf(a.h).w.find(x => x[0] === r.hero.id), theirs = teamOf(r.hero.id).w.find(x => x[0] === a.h);
      const p = (mine ? 1 : 0) + (theirs ? 1 : 0);
      if (p) r.team.push({ a, p, why: (mine || theirs)[1] });
    });
    r.bonus = Math.min(.12, r.team.reduce((s, t) => s + t.p*.04, 0));
    r.score = Math.min(.99, r.base + r.bonus);
  });
  rk.res.sort((a,b) => (a.taken - b.taken) || (b.score - a.score));
  return rk;
}
const rankAll = () => applyTeam(rankHeroes(HEROES, answers));
function teamPanel(h){
  const t = teamOf(h.id); if (!t.w.length) return "";
  const row = ([id, why]) => { const o = BY[id]; return o ? `<li><button type="button" class="tm" data-hero="${id}" style="${cvars(o)}" data-hov>${tcard(o,{plate:false, lazy:true})}<span class="tx"><b>${esc(o.name)}<em>${esc(o.type || "Unclassed")}</em></b><small>${esc(why)}</small></span></button></li>` : ""; };
  return `<div class="board c12 teamfit"><span class="label">Team fit</span><h3>Who ${esc(h.name)} runs with</h3>
    <div class="tcols">
      <div class="tcol ok"><span class="tsh"><i></i>Plays well with</span><ul class="tms">${t.w.map(row).join("")}</ul></div>
      <div class="tcol bad"><span class="tsh"><i></i>Watch out for</span><ul class="tms">${t.c.map(row).join("")}</ul></div>
    </div></div>`;
}
function alliesBlock(){
  return `<div class="allies"><span class="subhead ok">Playing with friends?</span>
    <p>Add the heroes your friends play. Heroes that team up well with them move up, and heroes they already play come off your list.</p>
    <div class="alist">${allies.map((a,i) => { const o = BY[a.h]; return `<span class="ally" style="${cvars(o)}">${dthumb(o)}<b>${esc(allyName(a))}</b><button type="button" data-unally="${i}" aria-label="Remove ${esc(allyName(a))}" data-hov>×</button></span>`; }).join("")}
      ${allies.length < 3 ? `<button type="button" class="tape mint" data-allypick data-hov>${allies.length ? "Add another" : "Add a friend's hero"}</button>` : ""}</div>
    ${allyPick ? `<div class="picker"><div class="ph"><b>Which hero does your friend play?</b><button type="button" class="tape" data-allyclose data-hov>Cancel</button></div>
      <div class="pgrid">${HEROES.map(o => `<button type="button" data-ally="${o.id}" style="${cvars(o)}" ${allies.some(a => a.h === o.id) ? "disabled" : ""}>${dthumb(o)}${esc(o.name)}</button>`).join("")}</div></div>` : ""}
  </div>`;
}
function reRank(){
  if (!lastRank) return;
  const y = window.scrollY, focus = $("#result .hstage") && document.querySelector("#result .ranks button.cur");
  lastRank = rankAll();
  const fid = focus ? focus.dataset.view : null;
  renderResult(fid && lastRank.res.some(r => r.hero.id === fid) ? fid : null, false, true);
  window.scrollTo(0, y);
}
function addAlly(id, name){
  if (!BY[id] || allies.some(a => a.h === id)) return false;
  if (allies.length >= 3) allies.shift();
  allies.push({ h:id, n:(name || "").slice(0,16) }); saveAllies(); return true;
}

// ================= share =================
// the public site; share links and codes open there for anyone
const SHARE_URL = "https://ritual-reading.vercel.app/";
// one character per question (two for the pick-two question): x = not reached, s = skipped
function encodeAnswers(a, name){
  const body = QUESTIONS.map(q => {
    const v = a[q.id];
    if (q.multi){ if (v === undefined) return "xx"; if (v === null) return "ss"; return [].concat(v).slice(0,2).map(i => String.fromCharCode(97+i)).join("").padEnd(2,"-"); }
    return v === undefined ? "x" : v === null ? "s" : String(v);
  }).join("");
  const nm = (name || "").trim().replace(/[^\p{L}\p{N} _.'-]/gu, "").slice(0,16).replace(/ /g,"_");
  return "1" + body + (nm ? "~" + nm : "");
}
function decodeAnswers(raw){
  let c = String(raw || "").trim();
  const hm = /#r=([^&\s]+)/.exec(c); if (hm) c = hm[1];
  try { c = decodeURIComponent(c); } catch(e) {}
  const [body, nm] = c.split("~");
  if (!body || body[0] !== "1") return null;
  const out = {}; let k = 1;
  for (const q of QUESTIONS){
    if (q.multi){
      const t = body.slice(k, k+2); k += 2; if (t.length < 2) return null;
      if (t === "xx") continue; if (t === "ss"){ out[q.id] = null; continue; }
      const arr = [...t].filter(ch => ch !== "-").map(ch => ch.charCodeAt(0) - 97);
      if (!arr.length || arr.some(i => !(i >= 0 && i < q.opts.length))) return null;
      out[q.id] = arr;
    } else {
      const ch = body[k++]; if (ch === undefined) return null;
      if (ch === "x") continue; if (ch === "s"){ out[q.id] = null; continue; }
      const i = +ch; if (!(i >= 0 && i < q.opts.length)) return null;
      out[q.id] = i;
    }
  }
  if (k !== body.length) return null;
  return { answers: out, name: (nm || "").replace(/_/g," ").slice(0,16) };
}
const shareLink = code => `${SHARE_URL}#r=${encodeURIComponent(code)}`;
let shareName = ""; try { shareName = localStorage.getItem("dlhf.name") || ""; } catch(e) {}

// ---------- share image ----------
const imgCache = {};
function loadImg(src){
  if (!imgCache[src]) imgCache[src] = new Promise((res) => { const im = new Image(); im.decoding = "async"; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  return imgCache[src];
}
function coverDraw(ctx, im, x, y, w, h, ax, ay, zoom){
  if (!im) return;
  const s = Math.max(w/im.width, h/im.height) * (zoom || 1), dw = im.width*s, dh = im.height*s;
  ctx.drawImage(im, x + (w-dw)*(ax==null?.5:ax), y + (h-dh)*(ay==null?.5:ay), dw, dh);
}
function tinted(im, color, w, h){
  const c = document.createElement("canvas"); c.width = Math.ceil(w); c.height = Math.ceil(h);
  const x = c.getContext("2d"); x.drawImage(im, 0, 0, c.width, c.height);
  x.globalCompositeOperation = "source-in"; x.fillStyle = color; x.fillRect(0,0,c.width,c.height); return c;
}
async function drawCard(ctx, h, x, y, w){
  const r = role(h), H = w*20/13;
  const [cbg, pt, inm, fr] = await Promise.all([loadImg(`img/k/cbg_${r}.webp`), loadImg(img(h.id)), loadImg(`img/k/in_${r}.webp`), loadImg(`img/k/${frame(h)}.webp`)]);
  const art = document.createElement("canvas"); art.width = Math.round(w*2); art.height = Math.round(H*2);
  const a = art.getContext("2d"), W2 = art.width, H2 = art.height;
  a.fillStyle = "#0b1413"; a.fillRect(0,0,W2,H2);
  if (cbg){ const bw = W2*1.18, bh = cbg.height*bw/cbg.width; a.drawImage(cbg, (W2-bw)/2, (H2-bh)*.2, bw, bh); }
  const g = a.createRadialGradient(W2*.5, H2*.4, 0, W2*.5, H2*.4, W2*.75); g.addColorStop(0, h.color + "88"); g.addColorStop(.72, h.color + "00");
  a.fillStyle = g; a.fillRect(0,0,W2,H2);
  if (pt){
    const pw = W2, ph = pt.height*pw/pt.width, tilt = ({brawler:4, marksman:-3, assassin:4})[r] || .5;
    const tmp = document.createElement("canvas"); tmp.width = W2; tmp.height = H2; const t = tmp.getContext("2d");
    t.save(); t.translate(W2/2, H2*.97); t.rotate(tilt*Math.PI/180); t.drawImage(pt, -pw/2, -ph, pw, ph); t.restore();
    const fade = t.createLinearGradient(0, H2*.97-ph, 0, H2*.97); fade.addColorStop(.72, "#000"); fade.addColorStop(.97, "rgba(0,0,0,0)");
    t.globalCompositeOperation = "destination-in"; t.fillStyle = fade; t.fillRect(0,0,W2,H2);
    a.drawImage(tmp, 0, 0);
  }
  if (inm){ a.globalCompositeOperation = "destination-in"; a.drawImage(inm, 0, 0, W2, H2); a.globalCompositeOperation = "source-over"; }
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
  if (fr) ctx.drawImage(fr, x, y, w, H); ctx.shadowColor = "transparent"; ctx.drawImage(art, x, y, w, H); ctx.restore();
}
function spaced(ctx, text, x, y, sp){ ctx.letterSpacing = sp + "px"; ctx.fillText(text, x, y); ctx.letterSpacing = "0px"; }
function fitText(ctx, text, max){ let t = text; while (ctx.measureText(t).width > max && t.length > 4) t = t.slice(0,-2); return t === text ? t : t.trimEnd() + "…"; }
async function drawShare(res, name){
  const W = 1200, H = 630, c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"), top = res[0], h = top.hero, ups = res.filter(r => r !== top && !r.taken).slice(0,3);
  if (document.fonts){ await Promise.all(['700 40px "DL Reaver"','700 20px "DL Retail"','600 40px "DL Oracle"','italic 400 20px "DL Radiance"','400 20px "DL Radiance"'].map(f => document.fonts.load(f).catch(()=>{}))); }
  const [slate, rnd, nm, mark, ...upi] = await Promise.all([loadImg("img/k/slate.webp"), loadImg(`img/rnd/${h.id}.webp`), NM[h.id] ? loadImg(`img/nm/${h.id}.svg`) : null, loadImg("img/k/mark.webp"), ...ups.map(r => loadImg(img(r.hero.id)))]);
  x.fillStyle = "#0a1110"; x.fillRect(0,0,W,H);
  if (slate){ x.globalAlpha = .55; coverDraw(x, slate, 0, 0, W, H); x.globalAlpha = 1; }
  const glow = x.createRadialGradient(W*.78, H*.45, 0, W*.78, H*.45, W*.55); glow.addColorStop(0, h.color + "66"); glow.addColorStop(1, h.color + "00");
  x.fillStyle = glow; x.fillRect(0,0,W,H);
  if (rnd){
    // the renders are small, so they're softened on purpose; that also lifts the text off the picture
    const s = H*1.1/rnd.height, rw = rnd.width*s, rh = rnd.height*s, dx = W - rw + 40, dy = H - rh + 8;
    x.save(); x.globalAlpha = .92;
    if ("filter" in x){ x.filter = "blur(5px)"; x.drawImage(rnd, dx, dy, rw, rh); x.filter = "none"; }
    else { const k = 3, lo = document.createElement("canvas"); lo.width = Math.ceil(rw/k); lo.height = Math.ceil(rh/k); const l = lo.getContext("2d"); l.drawImage(rnd, 0, 0, lo.width, lo.height); x.imageSmoothingQuality = "high"; x.drawImage(lo, dx, dy, rw, rh); }
    x.restore();
    x.fillStyle = "rgba(8,13,12,.28)"; x.fillRect(0,0,W,H);
  }
  const fade = x.createLinearGradient(330, 0, 820, 0); fade.addColorStop(0, "rgba(10,17,16,.96)"); fade.addColorStop(.55, "rgba(10,17,16,.72)"); fade.addColorStop(1, "rgba(10,17,16,0)");
  x.fillStyle = fade; x.fillRect(0,0,W,H);
  const vig = x.createLinearGradient(0, H-140, 0, H); vig.addColorStop(0, "rgba(6,10,10,0)"); vig.addColorStop(1, "rgba(6,10,10,.9)"); x.fillStyle = vig; x.fillRect(0,0,W,H);
  await drawCard(x, h, 58, 58, 258);
  // text column
  const X = 366; x.textBaseline = "alphabetic";
  x.fillStyle = "#5FE69E"; x.font = '700 19px "DL Retail", "Arial Narrow", sans-serif';
  spaced(x, (name ? `${name}'s Deadlock hero` : "My Deadlock hero").toUpperCase(), X, 92, 4);
  if (nm){ let nh = 118, nw = nh*NM[h.id]; if (nw > 470){ nw = 470; nh = nw/NM[h.id]; } x.drawImage(tinted(nm, h.c2, nw, nh), X-4, 112, nw, nh); }
  else { x.fillStyle = h.c2; x.font = '700 84px "DL Reaver", Georgia, serif'; x.fillText(h.name, X, 200); }
  x.fillStyle = "#EFE7D6"; x.font = '600 58px "DL Oracle", Georgia, serif'; const pctT = `${Math.round(top.score*100)}%`; x.fillText(pctT, X, 318);
  const pw = x.measureText(pctT).width;
  x.fillStyle = "#FFD45E"; x.font = '700 18px "DL Retail", "Arial Narrow", sans-serif'; spaced(x, "MATCH · " + confidence(res).toUpperCase(), X + pw + 16, 310, 3);
  x.fillStyle = h.c2; x.font = 'italic 400 23px "DL Radiance", "Segoe UI", sans-serif'; x.fillText(fitText(x, h.role || h.type || "", 470), X, 360);
  // runners-up
  x.fillStyle = "#9fb3ab"; x.font = '700 15px "DL Retail", "Arial Narrow", sans-serif'; spaced(x, "ALSO IN THE CARDS", X, 424, 4);
  ups.forEach((r, i) => {
    const bx = X + i*168, by = 440, im = upi[i];
    x.save(); x.beginPath(); x.rect(bx, by, 52, 64); x.clip(); x.fillStyle = "#16211f"; x.fillRect(bx, by, 52, 64);
    if (im) coverDraw(x, im, bx, by, 52, 64, .5, .15, 1.1); x.restore();
    x.strokeStyle = r.hero.c2; x.lineWidth = 2; x.strokeRect(bx+1, by+1, 50, 62);
    x.fillStyle = "#EFE7D6"; x.font = '700 16px "DL Retail", "Arial Narrow", sans-serif'; x.letterSpacing = "1.5px"; x.fillText(fitText(x, r.hero.name.toUpperCase(), 100), bx + 62, by + 26); x.letterSpacing = "0px";
    x.fillStyle = "#FFD45E"; x.font = '600 22px "DL Oracle", Georgia, serif'; x.fillText(Math.round(r.score*100) + "%", bx + 62, by + 54);
  });
  // footer
  if (mark) x.drawImage(mark, 58, H - 62, 34, 34);
  x.fillStyle = "#EFE7D6"; x.font = '700 17px "DL Retail", "Arial Narrow", sans-serif'; spaced(x, "HERO FINDER", 102, H - 40, 3);
  x.fillStyle = "#8a9a94"; x.font = '400 14px "DL Radiance", "Segoe UI", sans-serif'; x.fillText("Unofficial Deadlock fan tool · ritual-reading.vercel.app", 102, H - 21);
  x.textAlign = "right"; x.fillStyle = "#9fb3ab"; x.font = '700 13px "DL Retail", "Arial Narrow", sans-serif'; spaced(x, "SHARE CODE", W - 40, H - 44, 3);
  x.fillStyle = "#EFE7D6"; x.font = '600 17px "DL Oracle", Georgia, serif'; x.fillText(encodeAnswers(answers, name), W - 40, H - 21); x.textAlign = "left";
  return c;
}

// ---------- share panel ----------
let shareCanvas = null, shareTok = 0;
async function refreshShareImage(){
  const tok = ++shareTok, im = $("#shareImg"); if (!im || !lastRank) return;
  $("#shareWrap").classList.add("busy");
  const c = await drawShare(lastRank.res, shareName);
  if (tok !== shareTok) return;
  shareCanvas = c; im.src = c.toDataURL("image/png"); $("#shareWrap").classList.remove("busy");
}
function openShare(){
  if (!lastRank) return;
  const code = encodeAnswers(answers, shareName), top = lastRank.res[0].hero;
  const el = $("#share");
  el.innerHTML = `<div class="sbox" role="dialog" aria-modal="true" aria-labelledby="shareH">
    <div class="shd"><div><span class="label">Share</span><h3 id="shareH">Show off ${esc(top.name)}</h3></div><button type="button" class="btn btn-dark btn-sm" id="shareClose" data-hov>Close</button></div>
    <div class="swrap busy" id="shareWrap"><img id="shareImg" alt="Your result card: ${esc(top.name)}, ${Math.round(lastRank.res[0].score*100)}% match"><span class="spin"></span></div>
    <div class="srow">
      <label class="sname"><span>Your name on the card</span><input id="shareName" maxlength="16" placeholder="Optional" autocomplete="off" value="${esc(shareName)}"></label>
      <div class="sacts">
        <button type="button" class="btn btn-mint btn-sm" id="shareSave" data-hov>Save image</button>
        <button type="button" class="btn btn-dark btn-sm" id="shareLink" data-hov>Copy link</button>
        <button type="button" class="btn btn-dark btn-sm" id="shareText" data-hov>Copy as text</button>
      </div>
    </div>
    <div class="scode"><span>Your code</span><input id="shareCodeIn" readonly value="${esc(code)}" aria-label="Your share code"><button type="button" class="tape mint" id="shareCode" data-hov>Copy code</button></div>
    <p class="snote">Friends who open your link, or paste your code on the start page, see your hero${TEAM_ON ? " and can add it as their teammate" : ""}.</p>
    <p class="stoast" id="stoast" aria-live="polite"></p>
  </div>`;
  el.hidden = false; document.body.style.overflow = "hidden"; SFX.play("open",{gain:.5});
  refreshShareImage(); $("#shareClose").focus({preventScroll:true});
}
function closeShare(){ const el = $("#share"); if (el.hidden) return; el.hidden = true; el.innerHTML = ""; if ($("#modal").hidden) document.body.style.overflow = ""; SFX.play("close",{gain:.45}); }
function stoast(msg){ const t = $("#stoast"); if (!t) return; t.textContent = msg; t.classList.remove("on"); void t.offsetWidth; t.classList.add("on"); }
function copyText(txt, okMsg, fallbackEl){
  const ok = () => { SFX.play("copy",{gain:.5}); stoast(okMsg); };
  const fall = () => { if (fallbackEl){ fallbackEl.value = txt; fallbackEl.focus(); fallbackEl.select(); stoast("Press Ctrl+C (or Cmd+C) to copy"); } else stoast("Copy blocked here: select the text by hand"); };
  try { navigator.clipboard.writeText(txt).then(ok, fall); } catch(e){ fall(); }
}
function resultText(code){
  const {res} = lastRank; const t = res[0], ups = res.filter(r => r !== t && !r.taken).slice(0,3);
  return `My Deadlock hero: ${t.hero.name} (${Math.round(t.score*100)}% match). Also in the cards: ${ups.map(r=>`${r.hero.name} ${Math.round(r.score*100)}%`).join(", ")}.\nFind yours: ${shareLink(code)}\nOr paste my code on the start page: ${code}`;
}
async function saveShareImage(){
  if (!shareCanvas) return;
  const top = lastRank.res[0].hero, fn = `deadlock-hero-${top.id}.png`;
  const blob = await new Promise(r => shareCanvas.toBlob(r, "image/png"));
  let dl = null;
  try { dl = window.claude && typeof claude.use === "function" ? await claude.use("downloads") : null; } catch(e) { dl = null; }
  if (dl){
    try { await dl.save({ filename: fn, data: blob }); SFX.play("copy",{gain:.5}); stoast("Image saved"); }
    catch(e){ const code = e && e.code; if (code === "declined") return; if (code === "rate_limited") stoast("A save prompt is already open"); else stoast("Saving isn't available here: right-click the image and save it"); }
    return;
  }
  try { const u = URL.createObjectURL(blob), a = document.createElement("a"); a.href = u; a.download = fn; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); SFX.play("copy",{gain:.5}); stoast("Image saved"); }
  catch(e){ stoast("Right-click the image and save it"); }
}

// ---------- a friend's reading ----------
let friendView = null;
function renderFriend(fr){
  const n = Object.values(fr.answers).filter(v => v !== null && !(Array.isArray(v) && !v.length)).length;
  const who = fr.name ? `${fr.name}'s` : "Your friend's";
  closeDossier(true); closeShare();
  if (n < FROG_MIN){
    $("#result").innerHTML = `<div class="frogpage"><img class="fr" src="img/k/frog.webp" alt=""><div><span class="backer">${esc(who)} reading</span><h2>Not enough answers in this code.</h2><p>The code only holds ${n} answers, too few to deal a hero. Take the reading yourself instead.</p><div class="actions"><button type="button" class="btn btn-mint btn-sm" id="startBtn2" data-hov>Begin my reading</button></div></div></div>`;
    show("viewResult"); return;
  }
  const {res} = rankHeroes(HEROES, fr.answers), top = res[0], h = top.hero, ups = res.slice(1,4);
  friendView = { h: h.id, n: fr.name, code: encodeAnswers(fr.answers, fr.name) };
  const box = $("#result"); box.style.setProperty("--hero", h.color); box.style.setProperty("--hero-bright", h.c2);
  box.innerHTML = `<div class="viewing on friendbar"><span>${esc(who)} reading, shared with you.</span></div>
    ${stage(h, top, 1, {count:true, holo:true, conf:confidence(res), eyebrow:`${who} hero`})}
    <div class="rgrid">
      <div class="board c7"><span class="label">Close contenders</span><h3>Also in ${fr.name ? esc(fr.name) + "'s" : "their"} cards</h3>
        <div class="ups" style="grid-template-columns:1fr">${ups.map(r=>`<button type="button" class="up" data-hero="${r.hero.id}">${tcard(r.hero,{plate:false})}<div><b>${esc(r.hero.name)}</b><span class="pc">${Math.round(r.score*100)}%</span><small>${esc(r.hero.role || r.hero.type || "")}</small></div></button>`).join("")}</div></div>
      <div class="board c5 fcta"><span class="label">Your turn</span><h3>What would the cards deal you?</h3>
        <p>Answer the same questions and see which hero fits you.${TEAM_ON ? ` Add ${esc(h.name)} as your teammate and heroes that play well alongside ${h.name} get a boost.` : ""}</p>
        <div class="actions">
          ${TEAM_ON ? `<button type="button" class="btn btn-mint btn-sm" id="allyStart" data-hov>Team up with ${esc(h.name)}</button>` : ""}
          <button type="button" class="btn ${TEAM_ON ? "btn-dark" : "btn-mint"} btn-sm" id="startBtn2" data-hov>${TEAM_ON ? "Take the reading solo" : "Begin my reading"}</button>
          <button type="button" class="btn btn-dark btn-sm" data-hero="${h.id}" data-hov>Open ${esc(h.name)}'s dossier</button>
        </div></div>
      ${TEAM_ON ? teamPanel(h) : ""}
    </div>`;
  show("viewResult");
  flipIn(h, Math.round(top.score*100), true, VO[h.id].s);
  SFX.play("reveal",{gain:.5, delay:.1});
}
function openCode(raw){
  const fr = decodeAnswers(raw); if (!fr) return false;
  renderFriend(fr); syncHash(); return true;
}

// ================= twin jump =================
// a tile in "If you play…" opens the twin finder on that game, filtered to that character
let twinBack = null;
function openTwinPage(){
  closeShare(); closeDossier(); friendView = null; twinBack = null; $("#xback").hidden = true;
  show("viewTwin"); renderCross(true); syncHash();
}
function openTwin(gid, name){
  if (!XGB[gid]) return;
  const from = !$("#modal").hidden && dossierId ? { kind:"dossier", id:dossierId } : !$("#viewResult").hidden ? { kind:"result" } : null;
  SFX.play("click",{gain:.55});
  closeShare(); closeDossier(); show("viewTwin"); syncHash();
  gameTab = gid; xq = name; $("#xsearch").value = name; renderCross(true);
  twinBack = from; const xb = $("#xback");
  if (from){ xb.hidden = false; xb.textContent = from.kind === "dossier" ? `Back to ${BY[from.id].name}` : "Back to your result"; } else xb.hidden = true;
  const row = [...document.querySelectorAll("#xlist .xrow")].find(r => r.querySelector("b").textContent === name);
  setTimeout(() => {
    if (row) row.scrollIntoView({behavior: RM ? "auto" : "smooth", block:"center"});
    if (row){ row.classList.remove("hit"); void row.offsetWidth; row.classList.add("hit"); }
  }, 80);
}

// ================= compare =================
let cmpIds = [], pickSlot = -1;
const CMP_ROWS = [
  { g:"Vitality", icon:"tab_vitality", rows:[
    ["Health","hp",1], ["Health per boon","hpl",1,"","Gained each time you level up"], ["Health regen","regen",1,"/s"],
    ["Move speed","ms",1,"m/s"], ["Sprint bonus","spr",1,"m/s"], ["Stamina","stam",1,"charges"], ["Stamina recovery","stamr",-1,"s","Time to refill one charge"], ["Dash distance","dash",1,"m"] ]},
  { g:"Weapon", icon:"tab_weapon", rows:[
    ["Weapon", h => `<span class="t">${esc(h.weapon)}${h.gun?`<small>${esc(h.gun)}</small>`:""}</span>`],
    ["Bullet damage", "bd", 1, "", "Per bullet or pellet"], ["Pellets per shot","pel",0],
    ["Fire rate","rps",1,"/s","Shots per second, bursts included"], ["Clip size","clip",1],
    ["Reload","rel",-1,"s"], ["Est. DPS","dps",1,"","Damage × pellets × fire rate, before falloff (pellets that hit once count once)"],
    ["Bullet damage per boon","bdl",1], ["Falloff starts","fs",1,"m"], ["Falloff ends","fe",1,"m"] ]},
  { g:"Spirit & melee", icon:"tab_spirit", rows:[ ["Spirit power per boon","spl",1], ["Light melee","lm",1], ["Heavy melee","hm",1] ]},
  { g:"Abilities", icon:"sigil5", rows:[0,1,2,3].map(i => [["Ability 1","Ability 2","Ability 3","Ultimate"][i], h => {
      const a = h.ab[i], s = ABS[a[1]] || {};
      return `<span class="cab"><img src="img/ab/${a[1]}.webp" alt=""><span>${esc(a[0])}<small>${s.cd?`${fmtN(s.cd)}s cooldown`:"Passive"}${s.ch?` · ${s.ch} charges`:""}</small></span></span>`; }]) },
  { g:"Playstyle", icon:"sigil2", rows:[
    ["Complexity", h => `<b>${h.cx}<small>of 4</small></b>`],
    ...[["Range",2],["Mobility",3],["Durability",4],["Crowd control",6],["Ally support",5],["Burst",7],["Aim demand",8],["Spirit focus",1]].map(([n,k]) => [n, h => `<b>${h.t[k]}<small>of 4</small></b><span class="bar"><i style="width:${h.t[k]/4*100}%"></i></span>`, "t"+k]) ]}
];
const chalkRing = `<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="M8 22 C 6 8, 40 3, 62 5 S 97 12, 94 24 S 60 38, 36 36 S 3 30, 12 14 L 20 9"/></svg>`;
function cmpVal(h, key){ if (key && key[0] === "t") return h.t[+key.slice(1)]; const s = ST[h.id] || {}; return s[key]; }
function renderCompare(){
  const hs = cmpIds.map(id => BY[id]);
  const slots = [0,1,2].map(i => {
    const h = hs[i];
    if (!h) return `<button type="button" class="slot empty ${pickSlot===i?"pick":""}" data-slot="${i}" data-hov><span>Add a hero</span></button>`;
    return `<div class="slot" style="${cvars(h)}">${tcard(h,{plate:false})}<div><b>${nameMark(h)}</b><small>${esc(h.type||"Unclassed")}</small><button type="button" class="linkish" data-slot="${i}" data-hov>Swap</button></div><button type="button" class="x" data-unslot="${i}" aria-label="Remove ${esc(h.name)}">×</button></div>`;
  }).join("");
  const picker = pickSlot >= 0 ? `<div class="picker"><div class="ph"><b>Pick a hero for slot ${pickSlot+1}</b><button type="button" class="tape" data-pickclose data-hov>Cancel</button></div>
    <div class="pgrid">${HEROES.map(h => `<button type="button" data-pick="${h.id}" style="${cvars(h)}" ${cmpIds.includes(h.id)?"disabled":""}>${dthumb(h)}${esc(h.name)}</button>`).join("")}</div></div>` : "";
  let table = "";
  if (hs.length){
    table = CMP_ROWS.map(gr => `<div class="cgroup"><h4><img src="img/k/${gr.icon}.webp" alt="">${esc(gr.g)}</h4>${gr.rows.map(r => {
      const [label, key, dir, unit, note] = r;
      let cells;
      if (typeof key === "function"){
        cells = hs.map(h => `<div class="cv" style="${cvars(h)}">${key(h)}</div>`);
      } else {
        const vals = hs.map(h => cmpVal(h, key));
        const nums = vals.filter(v => typeof v === "number");
        const best = dir && nums.length > 1 && new Set(nums).size > 1 ? (dir > 0 ? Math.max(...nums) : Math.min(...nums)) : null;
        const all = HEROES.map(h => cmpVal(h, key)).filter(v => typeof v === "number"), lo = Math.min(...all), hi = Math.max(...all);
        cells = hs.map((h,i) => {
          const v = vals[i]; if (v == null) return `<div class="cv"><b>–</b></div>`;
          const pct = hi > lo ? 8 + 92*(v-lo)/(hi-lo) : 60;
          const extra = key === "rel" && ST[h.id].relsingle ? "per shell" : key === "rps" && ST[h.id].spin ? "spins up" : key === "rps" && ST[h.id].burst > 1 ? `${ST[h.id].burst}-round burst` : key === "pel" && ST[h.id].hitonce && v > 1 ? "hit once" : unit;
          return `<div class="cv ${v===best?"best":""}" style="${cvars(h)}"><b>${fmtN(v)}${extra?`<small>${esc(extra)}</small>`:""}${v===best?chalkRing:""}</b>${dir?`<span class="bar"><i style="width:${pct.toFixed(1)}%"></i></span>`:""}</div>`;
        });
      }
      while (cells.length < 3) cells.push(`<div class="cv"></div>`);
      return `<div class="crow"><span>${esc(label)}${note?`<small>${esc(note)}</small>`:""}</span>${cells.join("")}</div>`;
    }).join("")}</div>`).join("");
  } else {
    table = `<div class="none"><img src="img/k/chalk_smile.webp" alt=""><div><b>Pick up to three heroes to line them up.</b></div></div>`;
  }
  $("#cmp").innerHTML = `<div class="shead seen"><div><span class="label">Side by side</span><h2><img src="img/k/sigil4.webp" alt="">Compare heroes</h2></div></div>
    <div class="cslots"><span class="lab">Heroes</span>${slots}</div>${picker}<div class="ctable">${table}</div>`;
  if ($("#modal").hidden) syncHash();
}
function openCompare(ids){
  if (ids) cmpIds = ids.filter(id => BY[id]).slice(0,3);
  pickSlot = cmpIds.length < 3 && !cmpIds.length ? 0 : -1;
  closeDossier(); show("viewCompare"); renderCompare();
}

// ================= interaction: hover sound, tilt, parallax =================
// hovering anything that opens a hero warms that hero's voice, name mark and backdrop
const warmed = new Set();
function warmHero(id){
  if (!id || !BY[id]) return; VOX.warm(id);
  if (warmed.has(id)) return; warmed.add(id);
  [`img/nm/${id}.svg`, `img/rnd/${id}.webp`, `img/gloat/${id}.webp`].forEach(u => { const im = new Image(); im.decoding = "async"; im.src = u; });
}
document.addEventListener("pointerover", e => { const el = e.target.closest && e.target.closest("[data-hero],[data-view],[data-pick]"); if (el) warmHero(el.dataset.hero || el.dataset.view || el.dataset.pick); }, {passive:true});
document.addEventListener("focusin", e => { const el = e.target.closest && e.target.closest("[data-hero],[data-view]"); if (el) warmHero(el.dataset.hero || el.dataset.view); });
function gloatIn(card){ const g = card && card.querySelector("img.gl[data-gl]:not([src])"); if (g) g.src = `img/gloat/${g.dataset.gl}.webp`; }
document.addEventListener("pointerover", e => { const c = e.target.closest && e.target.closest(".tcard"); if (c) gloatIn(c); }, {passive:true});
document.addEventListener("focusin", e => { const c = e.target.closest && e.target.closest(".tcard"); if (c) gloatIn(c); });
let hovEl = null;
document.addEventListener("pointerover", e => {
  if (e.pointerType && e.pointerType !== "mouse") return;
  const el = e.target.closest("[data-hov],.opt,.tcard,.ranks button,.up,.filters button,.gtabs button,.xrow .dl button,.pgrid button");
  if (el === hovEl) return; hovEl = el; if (!el || el.disabled) return;
  SFX.hover(el.classList.contains("tcard") ? "hover_card" : el.classList.contains("up") ? "hover_hero" : el.matches(".tape,.filters button,.gtabs button,.xrow .dl button,.pgrid button") ? "hover_chip" : "hover");
});
let tiltEl = null;
function resetTilt(el){ if (!el) return; ["--tx","--ty"].forEach(k => el.style.setProperty(k,"0deg")); ["--hx3","--hy3","--bx3","--by3"].forEach(k => el.style.setProperty(k,"0px")); }
let mx = 0, my = 0, raf = 0;
function applyParallax(){
  raf = 0;
  $("#city").style.setProperty("--px", `${(-mx*22).toFixed(1)}px`); $("#city").style.setProperty("--py", `${(-my*14).toFixed(1)}px`);
  document.querySelectorAll(".hstage .collage").forEach(c => { c.style.setProperty("--px", `${(-mx*26).toFixed(1)}px`); c.style.setProperty("--py", `${(-my*18).toFixed(1)}px`); });
  if (!$("#viewIntro").hidden){ const hd = $("#hand"); hd.style.setProperty("--rx", `${(mx*12).toFixed(2)}deg`); hd.style.setProperty("--ry", `${(-my*9).toFixed(2)}deg`); }
}
if (FINE && !RM){
  document.addEventListener("pointermove", e => {
    mx = e.clientX/innerWidth - .5; my = e.clientY/innerHeight - .5; if (!raf) raf = requestAnimationFrame(applyParallax);
    const el = e.target.closest(".tcard");
    if (tiltEl && tiltEl !== el) resetTilt(tiltEl);
    tiltEl = el; if (!el) return;
    const r = el.getBoundingClientRect(), x = (e.clientX-r.left)/r.width, y = (e.clientY-r.top)/r.height;
    el.style.setProperty("--tx", `${((x-.5)*18).toFixed(2)}deg`); el.style.setProperty("--ty", `${((.5-y)*16).toFixed(2)}deg`);
    el.style.setProperty("--gx", `${(x*100).toFixed(1)}%`); el.style.setProperty("--gy", `${(y*100).toFixed(1)}%`);
    const w = r.width;
    el.style.setProperty("--hx3", `${((x-.5)*w*.07).toFixed(1)}px`); el.style.setProperty("--hy3", `${((y-.5)*w*.045).toFixed(1)}px`);
    el.style.setProperty("--bx3", `${((.5-x)*w*.06).toFixed(1)}px`); el.style.setProperty("--by3", `${((.5-y)*w*.05).toFixed(1)}px`);
  }, {passive:true});
  document.addEventListener("pointerleave", () => { resetTilt(tiltEl); tiltEl = null; });
}

// ================= events =================
function placeOv(dot, pop){
  const r = dot.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
  let x = Math.min(Math.max(12, r.left - 24), innerWidth - w - 12), y = r.bottom + 10;
  if (y + h > innerHeight - 12) y = Math.max(12, r.top - h - 10);
  pop.style.left = x + "px"; pop.style.top = y + "px";
}
function closeInfo(){ document.querySelectorAll(".idot[aria-expanded='true']").forEach(b => b.setAttribute("aria-expanded","false")); const w = $("#ovp"); if (w && w.firstChild) w.innerHTML = ""; }
document.addEventListener("click", e => {
  if (!e.target.closest(".ovpop,.idot")) closeInfo();
  const sg = e.target.closest("#rail .seg"); if (sg){ jumpTo(+sg.dataset.q); return; }
  const kr = e.target.closest(".kit .krow"); if (kr){ toggleAb(kr.closest("li")); return; }
  const tw = e.target.closest("[data-twin]"); if (tw){ openTwin(tw.dataset.twin, tw.dataset.twn); return; }
  const lg = e.target.closest("[data-lore-toggle]"); if (lg){ const box = lg.closest(".lore"); if (lg.classList.contains("lin") && box.classList.contains("open")) return; toggleLore(box); return; }
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.info){ const open = t.getAttribute("aria-expanded") === "true"; closeInfo(); if (!open){ t.setAttribute("aria-expanded","true"); const w = $("#ovp"); w.innerHTML = overview(BY[t.dataset.info]); const pop = w.firstElementChild; pop.style.setProperty("--hero-bright", BY[t.dataset.info].c2); placeOv(t, pop); SFX.play("open",{gain:.35}); } else SFX.play("close",{gain:.3}); return; }
  if (t.hasAttribute("data-lore")){ const l = t.parentNode.querySelector(".lore"); l.classList.add("open"); t.remove(); SFX.play("click",{gain:.4}); const d = document.querySelector(".idot[aria-expanded='true']"); if (d) placeOv(d, l.closest(".ovpop")); return; }
  if (t.dataset.vonext){ SFX.play("small",{gain:.5}); speak(t.closest(".vo"), t.dataset.vonext, randomLine(t.dataset.vonext)); return; }
  if (t.dataset.cmp){ SFX.play("cta",{gain:.5}); const ids = t.dataset.cmp.split(","); if (ids.length > 1) return openCompare(ids); const cur = cmpIds.filter(x => x !== ids[0]); return openCompare(cur.length >= 3 ? [ids[0]].concat(cur.slice(0,2)) : cur.concat(ids)); }
  if (t.id === "navCmp" || t.id === "cmpBtn"){ SFX.play("cta",{gain:.2}); return openCompare(); }
  if (t.id === "twinBtn" || t.id === "navTwin"){ SFX.play("cta",{gain:.2}); return openTwinPage(); }
  if (t.dataset.slot !== undefined){ pickSlot = +t.dataset.slot; SFX.play("open",{gain:.4}); renderCompare(); return; }
  if (t.dataset.unslot !== undefined){ cmpIds.splice(+t.dataset.unslot,1); pickSlot = -1; SFX.play("remove",{gain:.5}); renderCompare(); return; }
  if (t.dataset.pick){ const i = Math.min(pickSlot, cmpIds.length); cmpIds[i] = t.dataset.pick; pickSlot = -1; SFX.play("pick",{gain:.55});  renderCompare(); return; }
  if (t.hasAttribute("data-pickclose")){ pickSlot = -1; SFX.play("close",{gain:.4}); renderCompare(); return; }
  if (t.id === "startBtn"){ SFX.play("cta",{gain:.6}); return startQuiz(true); }
  if (t.id === "resumeBtn"){ SFX.play("cta",{gain:.6}); const s = load(); if (s){ answers = s.answers; idx = Math.min(s.idx||0, TOTAL-1); } return startQuiz(false); }
  if (t.id === "rosterBtn"){ SFX.play("click",{gain:.6}); return $("#roster").scrollIntoView({behavior: RM ? "auto" : "smooth"}); }
  if (t.id === "xback"){ const b = twinBack; twinBack = null; t.hidden = true; SFX.play("back",{gain:.5}); if (!b) return;
    if (b.kind === "dossier") return openDossier(b.id);
    if (lastRank){ show("viewResult"); syncHash(); } return; }
  if (t.id === "home"){ $("#xback").hidden = true; twinBack = null; SFX.play("back",{gain:.55}); closeShare(); friendView = null; closeDossier(); if (lastRank) renderHand(); show("viewIntro"); updateResume(); try { history.replaceState(null, "", location.pathname + location.search); } catch(e) {} return; }
  if (t.id === "voiceBtn"){ const v = !VOX.on; VOX.set(v); t.setAttribute("aria-pressed", v); $("#voiceLbl").textContent = v ? "Voice lines on" : "Voice lines off"; if (v){ SFX.unlock(); SFX.play("toggle_on",{gain:.55}); const vo = document.querySelector("#modal:not([hidden]) .vo, #viewResult:not([hidden]) .vo"); if (vo){ const id = vo.dataset.vo; speak(vo, id, randomLine(id)); } } else { stopVoice(); SFX.play("toggle_off",{gain:.55}); } return; }
  if (t.id === "soundBtn"){ const v = !SFX.on; SFX.set(v); t.setAttribute("aria-pressed", v); $("#soundLbl").textContent = v ? "Interface sounds on" : "Interface sounds off"; if (v){ SFX.unlock(); setTimeout(()=>SFX.play("toggle_on",{gain:.55}), 30); } else { SFX.play("toggle_off",{gain:.55, force:true}); } return; }
  if (t.id === "veilBtn"){ const sl = $("#leanSlab"), v = !sl.classList.contains("veiled"); setVeil(v); SFX.play("filter",{gain:.55, jitter:0}); return; }
  if (t.dataset.xg){ const grp = t.closest(".xgroup"), open = !grp.classList.contains("open"); grp.classList.toggle("open", open); t.setAttribute("aria-expanded", open); openGroups[gameTab + ":" + t.dataset.xg] = open; SFX.play(open ? "open" : "close",{gain:.35}); return; }
  if (t.dataset.g){ gameTab = t.dataset.g; SFX.play("filter",{gain:.3, jitter:0}); renderCross(); return; }
  if (t.dataset.f){ rosterFilter = t.dataset.f; SFX.play("filter",{gain:.3, jitter:0}); renderRoster(); return; }
  if (t.id === "codeToggle"){ const f = $("#codeForm"), open = !f.classList.contains("open"); f.classList.toggle("open", open); f.inert = !open; if (!open) $("#codeErr").hidden = true; t.setAttribute("aria-expanded", open); SFX.play(open ? "open" : "close",{gain:.4}); if (open) $("#codeIn").focus(); return; }
  if (t.id === "shareBtn") return openShare();
  if (t.id === "shareClose") return closeShare();
  if (t.id === "shareSave") return saveShareImage();
  if (t.id === "shareLink") return copyText(shareLink(encodeAnswers(answers, shareName)), "Link copied", $("#shareCodeIn"));
  if (t.id === "shareCode") return copyText(encodeAnswers(answers, shareName), "Code copied", $("#shareCodeIn"));
  if (t.id === "shareText") return copyText(resultText(encodeAnswers(answers, shareName)), "Text copied", $("#shareCodeIn"));
  if (t.hasAttribute("data-allypick")){ allyPick = true; SFX.play("open",{gain:.4}); reRank(); const p = document.querySelector("#result .allies .picker"); if (p) p.scrollIntoView({behavior: RM ? "auto" : "smooth", block:"nearest"}); return; }
  if (t.hasAttribute("data-allyclose")){ allyPick = false; SFX.play("close",{gain:.4}); reRank(); return; }
  if (t.dataset.ally){ addAlly(t.dataset.ally, ""); allyPick = false; SFX.play("pick",{gain:.55}); reRank(); return; }
  if (t.dataset.unally !== undefined){ allies.splice(+t.dataset.unally, 1); saveAllies(); SFX.play("remove",{gain:.5}); reRank(); return; }
  if (t.id === "allyStart"){ SFX.play("cta",{gain:.6}); const fv = friendView; addAlly(fv.h, fv.n); friendView = null;
    if (lastRank){ lastRank = rankAll(); show("viewResult"); renderResult(null, false); syncHash(); return; }
    const sv = load(); if (sv && Object.keys(sv.answers).length){ answers = sv.answers; idx = Math.min(sv.idx||0, TOTAL-1); startQuiz(false); } else startQuiz(true);
    syncHash(); return; }
  if (t.id === "startBtn2"){ SFX.play("cta",{gain:.6}); friendView = null; startQuiz(true); syncHash(); return; }
  if (t.dataset.hero) return openDossier(t.dataset.hero);
  if (t.id === "modalClose") return closeDossier();
  if (t.id === "dPrev") return stepDossier(-1);
  if (t.id === "dNext") return stepDossier(1);
  if (t.classList.contains("opt")) return choose(+t.dataset.i);
  if (t.id === "backBtn"){ SFX.play("back",{gain:.5}); return go(-1); }
  if (t.id === "frogBack"){ SFX.play("click",{gain:.55}); idx = +t.dataset.q; startQuiz(false); return; }
  if (t.id === "frogRoster"){ if (lastRank) renderHand(); SFX.play("back",{gain:.5}); show("viewIntro"); updateResume(); setTimeout(() => $("#roster").scrollIntoView({behavior: RM ? "auto" : "smooth"}), 60); return; }
  if (t.id === "revealBtn"){ SFX.play("cta",{gain:.6}); return finish(); }
  if (t.id === "nextBtn"){ SFX.play("click",{gain:.55}); return go(1); }
  if (t.id === "skipBtn") return skip();
  if (t.dataset.view){ renderResult(t.dataset.view, false); $("#result").scrollIntoView({behavior: RM ? "auto" : "smooth", block:"start"}); return; }
  if (t.id === "reviewBtn"){ SFX.play("click",{gain:.55}); idx = 0; startQuiz(false); return; }
  if (t.id === "retakeBtn"){ SFX.play("click",{gain:.55}); return startQuiz(true); }
});
$("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeDossier(); });
document.addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("[data-twin]")){ e.preventDefault(); return openTwin(e.target.dataset.twin, e.target.dataset.twn); }
  if (e.key === "Escape" && !$("#share").hidden) return closeShare();
  if (e.key === "Escape"){ if (tipFor){ hideTip(); return; } if (document.querySelector(".idot[aria-expanded='true']")){ closeInfo(); return; } }
  if (!$("#modal").hidden && e.key === "Escape") return closeDossier();
  if (!$("#modal").hidden && (e.key === "ArrowLeft" || e.key === "ArrowRight") && !(e.target.closest && e.target.closest("input,textarea"))){ e.preventDefault(); return stepDossier(e.key === "ArrowRight" ? 1 : -1); }
  if ($("#viewQuiz").hidden || e.metaKey || e.ctrlKey || e.altKey) return;
  const q = QUESTIONS[idx];
  if (/^[0-9]$/.test(e.key)){ const i = e.key === "0" ? 9 : +e.key-1; if (i < q.opts.length){ e.preventDefault(); choose(i); } }
  else if (e.key === "Enter" && !(e.target.closest && e.target.closest("button"))){ if (isAnswered(q) || answers[q.id] === null){ e.preventDefault(); go(1); } }
  else if (e.key === "ArrowRight"){ if (isAnswered(q) || answers[q.id] === null){ e.preventDefault(); go(1); } }
  else if (e.key === "ArrowLeft" || (e.key === "Backspace" && e.target === document.body)){ e.preventDefault(); go(-1); }
  else if (e.key.toLowerCase() === "s"){ e.preventDefault(); skip(); }
});
function updateResume(){
  const s = load(); const n = s ? Object.keys(s.answers).length : 0;
  $("#resumeRow").hidden = !(n && n < TOTAL);
}
(function initSound(){ const b = $("#soundBtn"); b.setAttribute("aria-pressed", SFX.on); $("#soundLbl").textContent = SFX.on ? "Interface sounds on" : "Interface sounds off";
  const v = $("#voiceBtn"); v.setAttribute("aria-pressed", VOX.on); $("#voiceLbl").textContent = VOX.on ? "Voice lines on" : "Voice lines off"; })();

$("#xsearch").addEventListener("input", e => { xq = e.target.value; renderCross(false); });
let shareT = 0;
document.addEventListener("input", e => {
  if (e.target.id !== "shareName") return;
  shareName = e.target.value.slice(0,16); try { localStorage.setItem("dlhf.name", shareName); } catch(err) {}
  $("#shareCodeIn").value = encodeAnswers(answers, shareName);
  clearTimeout(shareT); shareT = setTimeout(refreshShareImage, 280);
});
$("#share").addEventListener("click", e => { if (e.target.id === "share") closeShare(); });
$("#codeForm").addEventListener("submit", e => {
  e.preventDefault(); const v = $("#codeIn").value;
  if (!v.trim()) return;
  if (openCode(v)){ $("#codeErr").hidden = true; $("#codeIn").value = ""; } else { $("#codeErr").hidden = false; SFX.play("deselect",{gain:.5}); }
});
// chalk underline scrawls in when a section heading scrolls into view
if ("IntersectionObserver" in window){
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting){ en.target.classList.add("seen"); io.unobserve(en.target); } }), {threshold:.6});
  document.querySelectorAll(".shead").forEach(el => io.observe(el));
} else document.querySelectorAll(".shead").forEach(el => el.classList.add("seen"));
(function(){ let v = true; try { v = localStorage.getItem("dlhf.veil") !== "0"; } catch(e) {} setVeil(v); })();
renderTitle(); renderHand(); renderRoster(); renderCross(); updateResume();
// lift the loading cover once the first screen's images are in (never longer than 4s)
(function(){
  const boot = $("#boot"); if (!boot) return;
  const t0 = performance.now(); let gone = false;
  const lift = () => { if (gone) return; gone = true; setTimeout(() => { boot.classList.add("done"); setTimeout(() => boot.remove(), 600); setTimeout(idlePrefetch, 1500); }, Math.max(0, 250 - (performance.now() - t0))); };
  const imgs = [...document.querySelectorAll("#hand img")];
  const ready = Promise.all(imgs.map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })).concat(document.fonts ? [document.fonts.ready] : []));
  ready.then(lift); window.addEventListener("load", lift); setTimeout(lift, 4000);
})();
// once the page is up and idle, quietly fetch the name marks (about 0.6 MB); voices load when you point at a hero
function idlePrefetch(){
  const c = navigator.connection; if (c && (c.saveData || /2g/.test(c.effectiveType || ""))) return;
  const ids = HEROES.map(h => h.id); let k = 0;
  const ric = window.requestIdleCallback || (f => setTimeout(() => f({timeRemaining: () => 10}), 200));
  (function next(){
    if (k >= ids.length) return;
    const id = ids[k++];
    const im = new Image(); im.onload = im.onerror = () => ric(next); im.src = `img/nm/${id}.svg`;
  })();
}
(function route(){
  const hs = location.hash || "";
  let m = /^#compare(?:=([\w,]*))?$/.exec(hs);
  if (m) return openCompare(m[1] ? m[1].split(",") : []);
  if (hs === "#twin") return openTwinPage();
  m = /^#hero=(\w+)$/.exec(hs);
  if (m && heroId(m[1])){ try { history.replaceState(null, "", location.pathname + location.search); } catch(e) {} return openDossier(m[1]); }
  m = /^#r=(.+)$/.exec(hs);
  if (m && !openCode(m[1])) syncHash();
})();
})();
