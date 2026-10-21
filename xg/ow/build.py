import json, re, unicodedata, shutil, os
from PIL import Image, ImageDraw
def slug(n):
    s=unicodedata.normalize('NFKD',n).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+','-',s).strip('-')
src_name={'d-va':'dva','d-mon':'dmon'}
R=[
# name, role, sub, twins, why
("D.Va","Tank","Initiator",["viscous","infernus"],"Dives in to soak fire; ult turns her mech into a bomb"),
("D.Mon","Tank","Stalwart",["billy","apollo"],"Sword-and-shield brawler who cuts up the frontline up close"),
("Domina","Tank","Stalwart",["paradox","venator"],"Walls off space, knocks foes into walls and cages them"),
("Doomfist","Tank","Initiator",["abrams","lash"],"Punches foes into walls and slams down from the air"),
("Hazard","Tank","Initiator",["abrams","warden"],"Leaps in with a shotgun and pins enemies with spike walls"),
("Junker Queen","Tank","Stalwart",["billy","shiv"],"Yanks foes in with her blade and bleeds them up close"),
("Mauga","Tank","Bruiser",["warden"],"Charges in with twin chainguns and heals off his damage"),
("Orisa","Tank","Bruiser",["warden","dynamo"],"Fortifies to hold ground; ult pulls foes in, then pulses"),
("Ramattra","Tank","Stalwart",["silver","victor"],"Ranged poke that transforms into a melee brute form"),
("Reinhardt","Tank","Stalwart",["abrams"],"Charges enemies into walls and anchors the frontline"),
("Roadhog","Tank","Bruiser",["bebop","victor"],"Hook a target into a close-range combo, self-heal to survive"),
("Sigma","Tank","Stalwart",["paradox","wraith"],"Lobbed poke, eats projectiles, lifts foes and slams them"),
("Winston","Tank","Initiator",["lash","mokrill"],"Leaps onto the backline and zaps everyone at short range"),
("Wrecking Ball","Tank","Initiator",["viscous","lash"],"Rolls into the enemy team as an armored ball"),
("Zarya","Tank","Bruiser",["dynamo","paige"],"Bubbles allies and pulls the enemy team into one spot"),
("Anran","Damage","Flanker",["infernus"],"Dashes in and stacks burning damage on targets"),
("Ashe","Damage","Sharpshooter",["holliday","venator"],"Scoped shots, a burning explosive and a shotgun knockback"),
("Bastion","Damage","Specialist",["mcginnis","wraith"],"Toggles a high-fire-rate turret mode; ult rains artillery"),
("Cassidy","Damage","Sharpshooter",["silver"],"Revolver duelist who roll-reloads and fans the hammer"),
("Echo","Damage","Recon",["sinclair","pocket"],"Flying burst caster who copies an enemy's kit for her ult"),
("Emre","Damage","Specialist",["silver","wraith"],"Run-and-gun rifle, lifesteal weapon swap, transform ult"),
("Freja","Damage","Recon",["greytalon","vindicta"],"Crossbow poke; launches up to fire from above, bola ult"),
("Genji","Damage","Flanker",["apollo","yamato"],"Dashes through targets, deflects shots, sword ult"),
("Hanzo","Damage","Sharpshooter",["greytalon"],"Charged bow shots, multishot volley, piercing spirit ult"),
("Junkrat","Damage","Specialist",["holliday","seven"],"Spams area explosives and launches himself with mines"),
("Mei","Damage","Specialist",["kelvin"],"Slowing ice beam, walls and a self-freeze to survive"),
("Pharah","Damage","Recon",["pocket","vindicta"],"Hovers overhead raining explosive rockets"),
("Reaper","Damage","Flanker",["drifter","haze"],"Teleports behind the team and shreds up close"),
("Shion","Damage","Flanker",["vyper","haze"],"Dual-pistol flanker who dodges in for burst damage"),
("Sierra","Damage","Recon",["mirage","wraith"],"Mid-range rifle; marks a target and repositions fast"),
("Sojourn","Damage","Sharpshooter",["paradox","vyper"],"Charged rail shots, a slowing field and a power slide"),
("Soldier: 76","Damage","Specialist",["wraith","haze"],"Mid-range rifle gunner; ult auto-aims every shot"),
("Sombra","Damage","Recon",["haze","calico"],"Goes invisible to pick isolated targets, then escapes"),
("Symmetra","Damage","Specialist",["doorman","graves"],"Controls the map with teleporters and turret summons"),
("Torbjörn","Damage","Specialist",["mcginnis"],"Builds a turret and fortifies a position"),
("Tracer","Damage","Flanker",["mina","vyper"],"Blinks around the backline with rapid-fire pistols"),
("Vendetta","Damage","Flanker",["shiv","yamato"],"Dashes in, blocks damage, then leaps to finish targets"),
("Venture","Damage","Flanker",["mokrill"],"Burrows under enemies and pops up for close-range damage"),
("Widowmaker","Damage","Sharpshooter",["vindicta","greytalon"],"Long-range sniper who grapples to high ground"),
("Ana","Support","Tactician",["paige","rem"],"Ranged healer who sleeps a target and buffs an ally"),
("Baptiste","Support","Tactician",["kelvin","mcginnis"],"Heal-damage grenades and a field that saves the team"),
("Brigitte","Support","Survivor",["paige","kelvin"],"Frontline support who shields allies and rallies the team"),
("Illari","Support","Survivor",["mcginnis","celeste"],"Plants a healing pylon and fires a charged light rifle"),
("Jetpack Cat","Support","Tactician",["ivy","rem"],"Flies an ally around the map while keeping them healed"),
("Juno","Support","Survivor",["kelvin","celeste"],"Speeds up the team; ult calls a healing beam from above"),
("Kiriko","Support","Medic",["mirage","kelvin"],"Teleports to allies and gives the team a speed path"),
("Lifeweaver","Support","Medic",["viscous","ivy"],"Pulls allies out of danger and heals them"),
("Lúcio","Support","Tactician",["kelvin","dynamo"],"Speeds or heals the team while knocking enemies back"),
("Mercy","Support","Medic",["rem","ivy"],"Tethers to one ally at a time to heal and boost them"),
("Mizuki","Support","Survivor",["kelvin","paige"],"Aggressive healer; chain stops escapes, ult is a heal dome"),
("Moira","Support","Medic",["geist"],"Drains enemies with a beam to sustain herself and allies"),
("Wuyang","Support","Survivor",["dynamo","sinclair"],"Steers a water orb, heals and knocks enemies back"),
("Zenyatta","Support","Tactician",["celeste"],"Floating caster who marks enemies to take more damage"),
]
fwd={"abrams":"Reinhardt","apollo":"Genji","bebop":"Roadhog","billy":"Junker Queen","calico":"Sombra","celeste":"Zenyatta","drifter":"Reaper","dynamo":"Zarya","graves":"Symmetra","greytalon":"Hanzo","haze":"Sombra","holliday":"Ashe","infernus":"Anran","ivy":"Jetpack Cat","kelvin":"Mei","geist":"Moira","lash":"Doomfist","mcginnis":"Torbjörn","mina":"Tracer","mirage":"Kiriko","mokrill":"Venture","paige":"Brigitte","paradox":"Sojourn","pocket":"Echo","rem":"Mercy","seven":"Junkrat","shiv":"Vendetta","silver":"Cassidy","sinclair":"Echo","doorman":"Symmetra","venator":"Ashe","victor":"Roadhog","vindicta":"Widowmaker","viscous":"Wrecking Ball","vyper":"Tracer","warden":"Mauga","wraith":"Soldier: 76","yamato":"Genji"}
ids=re.findall(r'\(id: (\w+)\)',open('../deadlock_roster.md').read())
assert len(ids)==38 and set(ids)==set(fwd), set(ids)^set(fwd)
names={r[0] for r in R}; assert len(R)==53==len(names)
for k,v in fwd.items():
    assert v in names,v
    tw=[r for r in R if r[0]==v][0][3]
    if k not in tw: print('fwd not in twins',k,v)
roster=[]
for n,role,sub,tw,why in R:
    assert all(t in ids for t in tw) and 1<=len(tw)<=2, n
    assert len(why)<=70,(n,len(why))
    s=slug(n); f='repos/dh/3d/%s.png'%src_name.get(s,s)
    Image.open(f).verify()
    shutil.copy(f,'img/%s.png'%s)
    roster.append(dict(name=n,role=role,sub=sub,twins=tw,why=why,img='img/%s.png'%s))
unused=set(ids)-{t for r in R for t in r[3]}; print('unused deadlock ids in twins:',unused)
data={"game":"ow","roles":["Tank","Damage","Support"],
"sources":["https://overwatch.blizzard.com/en-us/heroes/","https://overwatch.weirdgloop.org/w/Heroes","https://overwatch.weirdgloop.org/w/Sub-Roles","https://overwatch.weirdgloop.org/w/Season/2026","https://overwatch.weirdgloop.org/w/Doctrine","https://overwatch.blizzard.com/en-us/heroes/hazard/","https://overwatch.blizzard.com/en-us/news/patch-notes/","https://en.wikipedia.org/wiki/Characters_of_the_Overwatch_franchise","https://www.nintendolife.com/news/2026/09/overwatch-announces-whats-next-as-it-reaches-the-end-of-its-first-year-long-story-arc","https://esports.gg/news/overwatch/overwatch-subroles-explained/"],
"image_sources":["https://github.com/drippinghere/overwatch-hero-icons (3d/ folder, 256x256 RGBA; README: all 53 heroes as of Season 4: Heroes of Busan)"],
"notes":"53 playable heroes (15 Tank / 24 Damage / 14 Support) as of Season 4 2026 'Heroes of Busan' (Aug 11 - Oct 6, 2026), latest patch Sep 22, 2026 bug-fix update; matches the 53 heroes on overwatch.blizzard.com/heroes. Sub-roles are official (introduced Season 1 2026, Feb 10); Hazard is currently Initiator (was Stalwart at launch of sub-roles). Not included: Doctrine (Support/Survivor, hero 54) had only a trial Sep 12-14 and fully releases Oct 6, 2026 (Season 5); Hero 55 (Support) is concept only. Sombra is still Damage/Recon but moves to Support in a Season 5 rework; Roadhog also gets a Season 5 rework - revisit their twins then. Forward-pick changes: mokrill Winston->Venture (both burrow in), shiv Reaper->Vendetta (dash/block/leap-finish kit maps 1:1), venator Freja->Ashe (burning grenade + shotgun knockback).",
"roster":roster,"fwd":fwd}
json.dump(data,open('data.json','w'),ensure_ascii=False,indent=1)
# sheet
c=9;t=128;th=30
W=Image.new('RGB',(c*t,((len(roster)+c-1)//c)*(t+th)),(30,30,30));d=ImageDraw.Draw(W)
for i,r in enumerate(roster):
    im=Image.open(r['img']).convert('RGBA').resize((t,t));x=(i%c)*t;y=(i//c)*(t+th)
    W.paste(im,(x,y),im);d.text((x+2,y+t+1),r['name'],fill='white');d.text((x+2,y+t+14),','.join(r['twins'])[:21],fill=(170,170,170))
W.save('sheet.png');print('ok',len(roster))
