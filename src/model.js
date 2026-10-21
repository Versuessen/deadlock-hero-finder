// Questionnaire + scoring model. Shared by the page and the offline reachability test.
const DIMS = ["cx","spirit","range","mobility","tank","support","cc","burst","aim","pick","engage","stealth","zone","summon","scale","melee","sustain","air","global","teamdep","dot","execute","push"];

// Hero-side statements (low / mid / high) and player-side wants (low / mid / high).
const DIM_TEXT = {
  cx:      { label:"Complexity",   hero:["Easy to pick up","Moderate complexity","A demanding kit"], want:["a simple kit","a moderately complex kit","a complex kit"] },
  spirit:  { label:"Damage source",hero:["Kills mainly with the gun","Splits damage between gun and abilities","Most damage comes from spirit abilities"], want:["gun-first damage","a gun and ability mix","ability-driven damage"] },
  range:   { label:"Range",        hero:["Fights up close","Fights at mid range","Fights from long range"], want:["close range","mid range","long range"] },
  mobility:{ label:"Mobility",     hero:["Limited mobility","Average mobility","Highly mobile"], want:["low mobility","average mobility","high mobility"] },
  tank:    { label:"Durability",   hero:["Fragile; survives through positioning","Moderately durable","A durable frontliner"], want:["a fragile, high-damage hero","balanced durability","a durable hero"] },
  support: { label:"Ally support", hero:["Offers little direct help to allies","Some ally utility","Strong ally support: heals, shields or saves"], want:["no support duties","light support","a support role"] },
  cc:      { label:"Crowd control",hero:["Light on crowd control","Useful crowd control","Heavy crowd control"], want:["little crowd control","some crowd control","heavy crowd control"] },
  burst:   { label:"Damage timing",hero:["Sustained damage over burst","A mix of burst and sustained damage","Big burst combos"], want:["sustained damage","a burst and sustained mix","burst combos"] },
  aim:     { label:"Aim demand",   hero:["Low aim demand; abilities do much of the work","Moderate aim demand","Rewards precise aim"], want:["low aim demand","moderate aim demand","precision aim"] },
  pick:    { label:"Fight type",   hero:["Shines in teamfights","Handles teamfights and picks","Built to isolate and pick off single targets"], want:["teamfights","a mix of fights","picking off single targets"] },
  engage:  { label:"Position",     hero:["Plays from the backline","Follows up on fights","Starts fights"], want:["a backline position","following up","starting fights"] },
  stealth: { label:"Trickery",     hero:["No stealth or trickery","Some misdirection or escape tricks","Stealth, untargetability or misdirection"], want:["no stealth","some tricks","stealth and misdirection"] },
  zone:    { label:"Area control", hero:["Little area control","Some area denial","Controls space with traps, walls or zones"], want:["no setup","some area control","traps and zones"] },
  summon:  { label:"Summons",      hero:["No summons","Some summoned helpers","Commands summons"], want:["no summons","some summons","summons"] },
  scale:   { label:"Power curve",  hero:["Strongest early","Peaks in the mid-game","Scales into a late-game threat"], want:["early-game power","mid-game power","late-game scaling"] },
  melee:   { label:"Melee",        hero:["Rarely melees","Mixes melee into combos","Melee-heavy"], want:["little melee","some melee","heavy melee"] },
  sustain: { label:"Self-sustain", hero:["Little self-healing","Some self-sustain","Strong self-sustain"], want:["little self-healing","some sustain","strong self-sustain"] },
  air:     { label:"Verticality",  hero:["Stays grounded","Some aerial play","Fights from the air"], want:["staying grounded","some air time","aerial play"] },
  global:  { label:"Map presence", hero:["Focuses on the local fight","Some reach across the map","Map-wide presence"], want:["a local focus","some map reach","map-wide presence"] },
  teamdep: { label:"Team reliance",hero:["Self-sufficient","Benefits from coordination","Best with a coordinated ally"], want:["self-sufficiency","some coordination","ally synergy"] },
  dot:     { label:"Damage over time",hero:["Little damage over time","Some damage over time","A damage-over-time specialist"], want:["no damage over time","some damage over time","damage over time"] },
  execute: { label:"Finishing",    hero:["No execute tools","Punishes low-health targets","Executes low-health targets"], want:["no executes","some finishing power","executes"] },
  push:    { label:"Objective pressure",hero:["Weak at pushing lanes","Can push lanes","Strong lane and objective pressure"], want:["no pushing focus","some pushing","objective pressure"] }
};

const CATS = {
  feel: { hose:"Bullet hose", shotgun:"Shotgun spread", burst:"Burst fire", heavy:"Heavy single shots", precision:"Precision long gun" },
  gim:  { transform:"Transformations", summon:"Summons and turrets", trap:"Traps, walls and zones", teleport:"Teleports, portals and swaps", stealth:"Stealth and shadows", grab:"Hooks, pulls and grabs", flight:"Flying", steal:"Stealing enemy power", undying:"Refusing to die", timing:"Timing and perfect windows" },
  vibe: { occult:"Spirits, curses and the occult", beast:"Monsters and beasts", machine:"Machines and weird science", noir:"Gangsters, cops and old New York", storybook:"Storybook whimsy", showbiz:"Stage magic and showmanship" },
  type: { Brawler:"Brawler", Assassin:"Assassin", Marksman:"Marksman", Mystic:"Mystic" }
};
const CAT_WEIGHT = { feel:2.5, gim:2.2, vibe:1.5, type:2.5 };

const SECTIONS = [
  { n:"I",   name:"Initiation", c:"#5FE69E", blurb:"How long you've played and what you played before. It sets how complex a kit you'll be handed." },
  { n:"II",  name:"Firepower",  c:"#FF8A4C", blurb:"Guns or spells, near or far, steady or burst. This decides how your hero actually kills." },
  { n:"III", name:"The Team",   c:"#62B6FF", blurb:"Where you stand when a teamfight breaks out. Frontline, healer, backline or the one locking enemies down." },
  { n:"IV",  name:"Survival",   c:"#A6D63F", blurb:"What happens when three enemies turn on you. Tanky, slippery or glass cannon." },
  { n:"V",   name:"Game Plan",  c:"#C58CFF", blurb:"Your rhythm across a match: lanes, roaming, map pressure. And whether you peak early or late." },
  { n:"VI",  name:"Style",      c:"#FFD45E", blurb:"Gimmicks, melee, class and look. The feel that settles close calls." }
];

// fx: { dim: [target 0-4, weight] }, cat: [kind, value], cap: max complexity tolerated
const QUESTIONS = [
  // I — Initiation
  { id:"exp", sec:0, q:"How much Deadlock have you played?", opts:[
    { t:"None yet", d:"This will be my first hero.", fx:{cx:[1,3]}, cap:2 },
    { t:"A few matches", d:"I know the basics: lanes, souls, the shop.", fx:{cx:[1.8,2]}, cap:3 },
    { t:"Plenty", d:"I know items, timings and matchups.", fx:{cx:[2.5,1]} },
    { t:"Veteran", d:"I'm looking for a new main.", fx:{cx:[3,1.5]} } ]},
  { id:"bg", sec:0, q:"Which games have you spent the most time in?", opts:[
    { t:"Shooters", d:"Counter-Strike, Valorant, Apex.", fx:{aim:[3.2,2], spirit:[1.2,1.5]} },
    { t:"MOBAs", d:"Dota 2, League, Smite.", fx:{spirit:[3,1.5], aim:[1.6,1], zone:[2,0.5]} },
    { t:"Hero shooters", d:"Overwatch, Marvel Rivals, Paladins.", fx:{aim:[2.5,1], spirit:[2.2,1], mobility:[2.8,0.5]} },
    { t:"Shooters and MOBAs", d:"A healthy mix of both.", fx:{aim:[2.5,0.5], spirit:[2.3,0.5]} },
    { t:"Something else", d:"Neither genre is really my home.", fx:{aim:[1.2,1.5], cx:[1.5,1]} } ]},
  { id:"load", sec:0, q:"How much do you want to think about mid-fight?", opts:[
    { t:"Point, click, win", d:"Keep the kit simple.", fx:{cx:[1,3]}, cap:2 },
    { t:"A couple of combos", d:"Some sequencing is fun.", fx:{cx:[2,2]} },
    { t:"Timing windows and tricky combos", d:"I like mastering a kit.", fx:{cx:[3,2]} },
    { t:"The hardest kit there is", d:"Make me sweat.", fx:{cx:[4,2.5]} } ]},

  // II — Firepower
  { id:"src", sec:1, q:"What should do most of your killing?", opts:[
    { t:"My gun", d:"Every bullet counts.", fx:{spirit:[0.8,3]} },
    { t:"Gun first, abilities to set it up", d:"", fx:{spirit:[1.7,2.5]} },
    { t:"An even split", d:"", fx:{spirit:[2.4,2]} },
    { t:"Abilities first, gun to finish", d:"", fx:{spirit:[3.2,2.5]} },
    { t:"Spells, spells, spells", d:"The gun is a formality.", fx:{spirit:[4,3]} } ]},
  { id:"range", sec:1, q:"Your favourite fighting distance?", opts:[
    { t:"In their face", d:"Melee range.", fx:{range:[0.3,3], melee:[3.5,1]} },
    { t:"Close", d:"Shotgun range.", fx:{range:[1.2,3]} },
    { t:"Mid-range skirmishes", d:"", fx:{range:[2.2,2.5]} },
    { t:"Long range", d:"Pick them apart from afar.", fx:{range:[3.3,3]} },
    { t:"Across the map", d:"Scope in.", fx:{range:[4,3], aim:[3.5,1]} } ]},
  { id:"aim", sec:1, q:"How do you feel about your aim?", opts:[
    { t:"I click heads", d:"Precision is my thing.", fx:{aim:[3.8,3]} },
    { t:"I can track a target", d:"Hold the spray on someone moving.", fx:{aim:[2.3,2]} },
    { t:"Decent, but I'd rather not rely on it", d:"", fx:{aim:[1.3,2]} },
    { t:"Let the abilities do the aiming", d:"", fx:{aim:[0.6,3], spirit:[3,1]} } ]},
  { id:"feel", sec:1, q:"Pick a weapon feel.", hint:"Grouped from each hero's in-game gun stats.", opts:[
    { t:"Bullet hose", d:"Hold the trigger down.", cat:["feel","hose"] },
    { t:"Shotgun spread", d:"Pellets at close range.", cat:["feel","shotgun"] },
    { t:"Burst fire", d:"Tap-tap-tap.", cat:["feel","burst"] },
    { t:"Heavy single shots", d:"Slow, hard-hitting rounds.", cat:["feel","heavy"] },
    { t:"Bow, crossbow or rifle", d:"A precision long gun.", cat:["feel","precision"] } ]},
  { id:"land", sec:1, q:"How should your damage land?", opts:[
    { t:"One big burst combo", d:"Then it's over.", fx:{burst:[3.8,2.5]} },
    { t:"Steady pressure", d:"Keep the damage flowing.", fx:{burst:[0.8,2.5]} },
    { t:"Burns, bleeds and poisons", d:"Let them tick away.", fx:{dot:[3.5,2.5]} },
    { t:"Execute them when they're low", d:"", fx:{execute:[3.5,2.5]} },
    { t:"Area damage", d:"Hit the whole team at once.", fx:{pick:[0.5,2], zone:[2.8,1]} } ]},

  // III — The Team
  { id:"pos", sec:2, q:"The fight starts. Where are you?", opts:[
    { t:"First in", d:"I start it.", fx:{engage:[4,3], tank:[3,1]} },
    { t:"Right behind the frontline", d:"Following up.", fx:{engage:[2.7,2]} },
    { t:"On the flank", d:"Going for their backline.", fx:{engage:[3,1.5], pick:[3.3,1.5], stealth:[2,0.5]} },
    { t:"At the back", d:"Dealing damage safely.", fx:{engage:[0.8,3], range:[3,1]} },
    { t:"Wherever someone needs saving", d:"", fx:{support:[3.5,2], engage:[1.5,1]} } ]},
  { id:"help", sec:2, q:"How do you feel about keeping teammates alive?", opts:[
    { t:"It's my favourite part", d:"Heals, shields and saves.", fx:{support:[4,3.5]} },
    { t:"I'll help when it's easy", d:"", fx:{support:[2,2]} },
    { t:"Not my job", d:"I make the plays.", fx:{support:[0.3,2.5]} },
    { t:"I want to carry the game", d:"", fx:{support:[0,2], scale:[3.8,2]} } ]},
  { id:"cc", sec:2, q:"How much do you want to control enemies?", hint:"Stuns, pulls, slows, silences.", opts:[
    { t:"Lock them all down", d:"", fx:{cc:[4,3]} },
    { t:"Enough to set up kills", d:"", fx:{cc:[2.5,2]} },
    { t:"I'd rather just deal damage", d:"", fx:{cc:[1,2.5]} } ]},
  { id:"duel", sec:2, q:"One-on-one or all-out brawl?", opts:[
    { t:"Duels", d:"Me versus you.", fx:{pick:[4,3]} },
    { t:"Hunting stragglers", d:"Whoever wanders off alone.", fx:{pick:[3.6,2.5], global:[2.5,1], stealth:[2,0.5]} },
    { t:"A bit of both", d:"", fx:{pick:[2.2,1.5]} },
    { t:"Big teamfights", d:"My ultimate hits everyone.", fx:{pick:[0.5,3], cc:[3,1]} } ]},
  { id:"dep", sec:2, q:"How do you feel about relying on teammates?", opts:[
    { t:"I play with friends", d:"Synergy is the fun part.", fx:{teamdep:[3.5,2.5]} },
    { t:"I'll coordinate if they do", d:"", fx:{teamdep:[2,1]} },
    { t:"Solo queue", d:"I need to be self-sufficient.", fx:{teamdep:[0.3,3]} } ]},

  // IV — Survival
  { id:"focus", sec:3, q:"Three enemies focus you. What happens next?", opts:[
    { t:"I soak it", d:"I'm built to take hits.", fx:{tank:[4,3]} },
    { t:"I'm already gone", d:"Dash, leap, fly.", fx:{mobility:[4,2.5], tank:[1,1]} },
    { t:"I vanish", d:"Invisible or untargetable.", fx:{stealth:[3.5,3]} },
    { t:"I heal through it", d:"And keep fighting.", fx:{sustain:[4,3]} },
    { t:"I take one of them with me", d:"", fx:{burst:[3.2,1.5], execute:[2.5,1]} } ]},
  { id:"move", sec:3, q:"How important is movement?", opts:[
    { t:"I want to fly", d:"Rooftops, ziplines, the sky.", fx:{mobility:[4,2.5], air:[3.8,2]} },
    { t:"Slippery on the ground", d:"Dashes, slides, blinks.", fx:{mobility:[3.5,3], air:[1,1]} },
    { t:"Standard is fine", d:"", fx:{mobility:[2,2]} },
    { t:"I hold my ground", d:"", fx:{mobility:[1,2.5], tank:[3,1]} } ]},
  { id:"hp", sec:3, q:"How squishy can you be?", opts:[
    { t:"Glass cannon", d:"I'll position well.", fx:{tank:[0.8,2.5], burst:[3,1]} },
    { t:"Balanced", d:"", fx:{tank:[2,1.5]} },
    { t:"Thick", d:"Give me a big health bar.", fx:{tank:[3.8,3]} } ]},

  // V — Game Plan
  { id:"curve", sec:4, q:"When do you want to be strongest?", opts:[
    { t:"Early", d:"Win lane and snowball.", fx:{scale:[1,2.5]} },
    { t:"Mid-game", d:"Roam and take fights.", fx:{scale:[2.2,2]} },
    { t:"Late", d:"Farm up and become a monster.", fx:{scale:[4,3]} } ]},
  { id:"between", sec:4, q:"Between fights, what are you doing?", opts:[
    { t:"Farming lanes and camps", d:"Efficient souls.", fx:{push:[3,1.5], scale:[3.2,1]} },
    { t:"Pushing objectives", d:"Guardians, walkers, the Patron.", fx:{push:[4,3]} },
    { t:"Roaming for ganks", d:"", fx:{global:[3,2], pick:[3,1], mobility:[3,1]} },
    { t:"Staying with my team", d:"", fx:{global:[3.5,1.5], support:[2.5,1.5]} } ]},
  { id:"reach", sec:4, q:"How much do you want to affect fights elsewhere on the map?", opts:[
    { t:"Show up anywhere, fast", d:"", fx:{global:[4,3]} },
    { t:"Help from a distance", d:"Long-reaching abilities.", fx:{global:[3,2], range:[3,1]} },
    { t:"I focus on my own fight", d:"", fx:{global:[0.5,2]} } ]},
  { id:"zone", sec:4, q:"Traps, walls and zones?", opts:[
    { t:"Love setting up the battlefield", d:"", fx:{zone:[4,3]} },
    { t:"Nice to have", d:"", fx:{zone:[2,1.5]} },
    { t:"I'd rather react than prepare", d:"", fx:{zone:[0.5,2]} } ]},

  // VI — Style
  { id:"gim", sec:5, multi:2, q:"Which gimmicks sound the most fun?", hint:"Pick up to two.", opts:[
    { t:"Transformations", d:"Become something stronger.", cat:["gim","transform"] },
    { t:"Summons and turrets", d:"An army that works for you.", cat:["gim","summon"] },
    { t:"Traps, walls and zones", d:"Shape the battlefield.", cat:["gim","trap"] },
    { t:"Teleports, portals and swaps", d:"Be where they don't expect.", cat:["gim","teleport"] },
    { t:"Stealth and shadows", d:"Now you see me.", cat:["gim","stealth"] },
    { t:"Hooks, pulls and grabs", d:"Get over here.", cat:["gim","grab"] },
    { t:"Flying", d:"Fight from the sky.", cat:["gim","flight"] },
    { t:"Stealing enemy power", d:"Health, stats, even ultimates.", cat:["gim","steal"] },
    { t:"Refusing to die", d:"Revives, invincibility, deferred damage.", cat:["gim","undying"] },
    { t:"Timing and perfect windows", d:"Parries, charged shots, release on cue.", cat:["gim","timing"] } ]},
  { id:"melee", sec:5, q:"How do you feel about melee?", opts:[
    { t:"It's my main weapon", d:"Heavy melee all day.", fx:{melee:[4,3]} },
    { t:"Part of my combos", d:"", fx:{melee:[2.2,1.5]} },
    { t:"I rarely melee", d:"", fx:{melee:[0.3,2]} } ]},
  { id:"class", sec:5, q:"Which in-game class sounds like you?", hint:"Deadlock files every hero under one of these.", opts:[
    { t:"Brawler", d:"Frontline fighters who win up close.", cat:["type","Brawler"] },
    { t:"Assassin", d:"Mobile killers who pick off targets.", cat:["type","Assassin"] },
    { t:"Marksman", d:"Damage dealers who win with weapon and range.", cat:["type","Marksman"] },
    { t:"Mystic", d:"Casters who shape fights with abilities.", cat:["type","Mystic"] } ]},
  { id:"vibe", sec:5, q:"Which aesthetic calls to you?", opts:[
    { t:"Spirits, curses and the occult", d:"", cat:["vibe","occult"] },
    { t:"Monsters and beasts", d:"", cat:["vibe","beast"] },
    { t:"Machines and weird science", d:"", cat:["vibe","machine"] },
    { t:"Gangsters, cops and old New York", d:"", cat:["vibe","noir"] },
    { t:"Storybook whimsy", d:"", cat:["vibe","storybook"] },
    { t:"Stage magic and showmanship", d:"", cat:["vibe","showbiz"] } ]}
];

function catScore(hero, kind, val){
  if (kind === "type") return hero.type === val ? 1 : 0;
  if (kind === "vibe") { const i = hero.vibe.indexOf(val); return i === 0 ? 1 : i > 0 ? 0.75 : 0; }
  if (kind === "feel") return hero.feel[val] || 0;
  if (kind === "gim")  return hero.gim[val] || 0;
  return 0;
}

// answers: { qid: optionIndex | [optionIndex,...] }  (missing / null = skipped)
function buildProfile(answers){
  const acc = {}; const cats = []; let cap = null;
  for (const q of QUESTIONS){
    const a = answers[q.id];
    if (a === undefined || a === null) continue;
    const idxs = Array.isArray(a) ? a : [a];
    for (const i of idxs){
      const o = q.opts[i]; if (!o) continue;
      if (o.fx) for (const d in o.fx){ const [t,w] = o.fx[d]; (acc[d] = acc[d] || {tw:0,w:0}); acc[d].tw += t*w; acc[d].w += w; }
      if (o.cat) cats.push({kind:o.cat[0], val:o.cat[1], w:CAT_WEIGHT[o.cat[0]], label:o.t});
      if (o.cap) cap = cap === null ? o.cap : Math.min(cap, o.cap);
    }
  }
  const dims = {};
  for (const d in acc) dims[d] = { target: acc[d].tw/acc[d].w, weight: acc[d].w };
  return { dims, cats, cap };
}

function scoreHero(hero, prof){
  let num = 0, den = 0; const parts = [];
  for (const d in prof.dims){
    const {target, weight} = prof.dims[d];
    const hv = hero.t[DIMS.indexOf(d)];
    const s = 1 - Math.abs(target - hv)/4;
    num += weight*s; den += weight;
    parts.push({ kind:"dim", d, target, weight, hv, s });
  }
  for (const c of prof.cats){
    const s = catScore(hero, c.kind, c.val);
    num += c.w*s; den += c.w;
    parts.push({ kind:"cat", cat:c.kind, val:c.val, label:c.label, weight:c.w, s });
  }
  if (prof.cap !== null){
    const over = Math.max(0, hero.cx - prof.cap);
    const s = Math.max(0, 1 - 0.45*over); const w = 3;
    num += w*s; den += w;
    parts.push({ kind:"cap", cap:prof.cap, weight:w, s, hv:hero.cx });
  }
  return { score: den ? num/den : 0, parts, den };
}

function rankHeroes(heroes, answers){
  const prof = buildProfile(answers);
  const res = heroes.map(h => ({ hero:h, ...scoreHero(h, prof) }));
  // Tie-break: closeness on the single heaviest dimension, then lower complexity, then name.
  const heavy = Object.entries(prof.dims).sort((a,b)=>b[1].weight-a[1].weight)[0];
  res.sort((a,b)=>{
    if (Math.abs(b.score-a.score) > 1e-9) return b.score-a.score;
    if (heavy){ const i = DIMS.indexOf(heavy[0]); const da = Math.abs(a.hero.t[i]-heavy[1].target), db = Math.abs(b.hero.t[i]-heavy[1].target); if (da!==db) return da-db; }
    if (a.hero.cx !== b.hero.cx) return a.hero.cx - b.hero.cx;
    return a.hero.name.localeCompare(b.hero.name);
  });
  return { prof, res };
}

if (typeof module !== "undefined") module.exports = { DIMS, DIM_TEXT, CATS, CAT_WEIGHT, SECTIONS, QUESTIONS, buildProfile, scoreHero, rankHeroes, catScore };
