import json, re, os
from PIL import Image, ImageDraw
SRC='repos/yuqichin_rivals-player-assets/Hero Icons/'
V,D,S='Vanguard','Duelist','Strategist'
R=[
("Captain America",V,["abrams","warden"],"Shield-up brawler tank who sprints and leaps into the backline"),
("Doctor Strange",V,["doorman","mirage"],"Shield tank who opens team portals across the map"),
("Emma Frost",V,["abrams"],"Beam tank who turns to diamond and kicks foes into walls"),
("Groot",V,["graves","mcginnis"],"Grows walls to split fights and roots enemies with vines"),
("Hulk",V,["silver","abrams"],"Transforms mid-fight into a bigger brawler that leaps on targets"),
("Magneto",V,["paradox","viscous"],"Ranged tank; curtain eats projectiles, can bubble an ally"),
("Peni Parker",V,["mcginnis","graves"],"Plants a nest and mines, then holds ground with webs"),
("Thor",V,["lash","abrams"],"Dives in with hammer throws and a leaping lightning slam"),
("Venom",V,["billy","mokrill"],"Swings in, tethers nearby enemies and yanks them together"),
("The Thing",V,["abrams","mokrill"],"Brawler tank who charges in and trades punches"),
("Angela",V,["lash"],"Flying dive tank who binds foes and crashes down from the air"),
("Rogue",V,["sinclair","billy"],"Melee off-tank who pulls enemies in and steals their abilities"),
("Devil Dinosaur",V,["mokrill","shiv"],"Melee tank that bleeds targets, pounces and heals by biting"),
("The Hood",V,["silver","warden"],"Gun tank who powers into a demon form with lifesteal rifles"),
("Black Panther",D,["calico","yamato"],"Marks a target, then chains dashes that reset on marked hits"),
("Black Widow",D,["vindicta","greytalon"],"Sniper who scopes from range and kicks away divers"),
("Hawkeye",D,["greytalon"],"Charged-bow marksman who wins long-range duels"),
("Hela",D,["vindicta","mina"],"Headshot gunner who takes flight in her ult with crow blasts"),
("Iron Fist",D,["apollo","yamato"],"Martial artist who blocks, dash-kicks in and chains combos"),
("Iron Man",D,["pocket","vindicta"],"Hovers above the fight raining rockets and beam blasts"),
("Magik",D,["yamato","calico"],"Sword diver who blinks through portals and transforms to finish"),
("Moon Knight",D,["seven","celeste"],"Ricochet poke that bounces between clumped foes; area ult"),
("Namor",D,["mcginnis"],"Summons squid turrets and pokes with tridents"),
("Psylocke",D,["haze"],"Goes invisible, dashes in, then spins slashing everyone nearby"),
("Scarlet Witch",D,["celeste","seven"],"Lock-on caster who marks foes and channels a huge blast"),
("Spider-Man",D,["bebop","lash"],"Swings in, tags a target, yanks it close and uppercuts it"),
("Squirrel Girl",D,["holliday","graves"],"Lobs bouncing explosive acorns and traps foes in place"),
("Star-Lord",D,["haze","vyper"],"Twin-blaster flanker who jets around and auto-aims his ult"),
("Storm",D,["seven"],"Hovering storm caster whose ult drags and shocks clumped foes"),
("The Punisher",D,["venator","vyper"],"Rifle and shotgun gunner with smoke grenade and a turret"),
("Winter Soldier",D,["shiv","bebop"],"Hooks a target in and chains execute ults on low-health foes"),
("Wolverine",D,["mokrill","shiv"],"Leaps on a target, pins it and shreds tanks up close"),
("Mister Fantastic",D,["viscous","bebop"],"Rubbery brawler who bounces in, grabs foes and soaks damage"),
("Human Torch",D,["infernus"],"Flies over the fight laying fire trails and burning zones"),
("Phoenix",D,["pocket"],"Flying fire caster who blinks away and bombards an area"),
("Blade",D,["yamato","apollo"],"Sword/shotgun hunter with a parry, dashes and lifesteal frenzy"),
("Daredevil",D,["drifter","billy"],"Melee hunter who locks onto one target, blinds and reels it in"),
("Black Cat",D,["calico","yamato"],"Melee thief who grapples in, strikes, then zips back untargetable"),
("Elsa Bloodstone",D,["venator","holliday"],"Monster hunter with shotgun, knockback dash and a snare trap"),
("Cyclops",D,["wraith"],"Mid-range beam gunner with propulsion bursts to peel or engage"),
("Gorr",D,["graves","yamato"],"Melee duelist who raises minions from kills and teleports to them"),
("Deadpool",D,["victor","billy"],"Taunts enemies into bad trades; plays tank, damage or healer"),
("Adam Warlock",S,["ivy","victor"],"Links allies to share damage and revives himself after death"),
("Cloak & Dagger",S,["dynamo"],"Swaps between healing light daggers and blinding dark teleports"),
("Invisible Woman",S,["paige","viscous"],"Protective healer who shields allies and pulls or knocks foes"),
("Jeff the Land Shark",S,["rem","ivy"],"Tiny healer who dives under, swallows foes and carries them off"),
("Loki",S,["sinclair"],"Plants decoys that copy his shots and copies an enemy's kit"),
("Luna Snow",S,["kelvin","dynamo"],"Ice healer who freezes a target and channels a big team heal"),
("Mantis",S,["rem"],"Healer who boosts allies and puts enemies to sleep"),
("Rocket Raccoon",S,["mcginnis"],"Engineer healer who drops a revive beacon and damage tower"),
("Ultron",S,["rem","paige"],"Flying support who attaches healing drones to allies"),
("Gambit",S,["wraith","kelvin"],"Throws charged cards that heal allies or blow up enemies"),
("White Fox",S,["paige","rem"],"Healer who teleports to allies to shield them; charms foes in"),
("Jubilee",S,["kelvin","dynamo"],"Fireworks that heal allies and damage foes; ult launches them"),
]
fileof={"Gorr":"Gorr_The_God_Butcher"}
def slug(n): return re.sub(r'-+','-',re.sub(r'[^a-z0-9]+','-',n.lower())).strip('-')
ids="abrams apollo bebop billy calico celeste drifter dynamo graves greytalon haze holliday infernus ivy kelvin geist lash mcginnis mina mirage mokrill paige paradox pocket rem seven shiv silver sinclair doorman venator victor vindicta viscous vyper warden wraith yamato".split()
fwd={"abrams":"The Thing","apollo":"Iron Fist","bebop":"Spider-Man","billy":"Venom","calico":"Black Panther","celeste":"Scarlet Witch","drifter":"Daredevil","dynamo":"Cloak & Dagger","graves":"Groot","greytalon":"Hawkeye","haze":"Psylocke","holliday":"Squirrel Girl","infernus":"Human Torch","ivy":"Jeff the Land Shark","kelvin":"Luna Snow","geist":"Adam Warlock","lash":"Angela","mcginnis":"Rocket Raccoon","mina":"Hela","mirage":"Doctor Strange","mokrill":"Wolverine","paige":"Invisible Woman","paradox":"Magneto","pocket":"Phoenix","rem":"Mantis","seven":"Storm","shiv":"Winter Soldier","silver":"Hulk","sinclair":"Loki","doorman":"Doctor Strange","venator":"Elsa Bloodstone","victor":"Deadpool","vindicta":"Hela","viscous":"Mister Fantastic","vyper":"The Punisher","warden":"Captain America","wraith":"Gambit","yamato":"Magik"}
assert len(R)==54 and len({r[0] for r in R})==54
names={r[0] for r in R}
assert set(fwd)==set(ids) and len(ids)==38
for k,v in fwd.items():
    assert v in names,v
    tw=[r for r in R if r[0]==v][0][2]
    if k not in tw: print("fwd not in twins:",k,v)
roster=[]
for n,role,tw,why in R:
    for t in tw: assert t in ids,t
    assert len(why)<=70,(n,len(why))
    s=slug(n); f=SRC+fileof.get(n,n.replace(' ','_'))+'.webp'
    im=Image.open(f).convert('RGBA'); im.save(f'img/{s}.png')
    roster.append({"name":n,"role":role,"sub":("Flex hero: can be picked as Vanguard, Duelist or Strategist" if n=="Deadpool" else None),"twins":tw,"why":why,"img":f"img/{s}.png"})
data={"game":"mr","roles":[V,D,S],
"sources":["https://marvelrivals.fandom.com/wiki/Heroes","https://turbosmurfs.gg/article/marvel-rivals-characters-release-order","https://rivalskins.com/heroes/","https://en.wikipedia.org/wiki/Marvel_Rivals","https://esports.gg/guides/marvel-rivals/gorr-god-butcher-ability-rundown/","https://massivelyop.com/2026/09/09/marvel-rivals-adds-gorr-the-god-butcher-to-the-roster-with-september-11s-season-10/","https://www.gosugamers.net/entertainment/news/79126-marvel-rivals-season-10-adds-duelist-gorr-as-its-only-new-hero-scarlet-witch-rework-nerfs-revealed","https://opencritic.com/news/31172/marvel-rivals-isnt-making-moon-girl-playable-and-fans-are-furious","https://marvelrivals.gg/devil-dinosaur/","https://marvelrivals.gg/the-hood/","https://marvelrivals.gg/jubilee/","https://marvelrivals.gg/cyclops/","https://marvelrivals.gg/white-fox/","https://marvelrivals.gg/black-cat/","https://marvelrivals.gg/elsa-bloodstone/","https://marvelrivals.gg/rogue/","https://marvelrivals.gg/deadpool/","https://marvelrivals.gg/angela/","https://marvelrivals.gg/gambit/","https://marvelrivals.gg/daredevil/","https://marvelrivals.gg/blade/","https://marvelrivals.gg/phoenix/","https://marvelrivals.gg/ultron/","https://marvelrivals.gg/emma-frost/"],
"image_sources":["https://github.com/yuqichin/rivals-player-assets (Hero Icons/*.webp, 134px official-style head icons, commit dated 2026-09-13; converted to PNG)"],
"notes":"Roster verified as of Season 10 'Butcher's Blasphemy' (launched 2026-09-11): 54 playable heroes (14 Vanguard, 27 Duelist, 12 Strategist + Deadpool, who is selectable in all three roles; listed here as Duelist with sub note). Gorr (marketed as 'Gorr the God Butcher') is the only Season 10 hero; Season 10.5 (Oct 9) adds no hero. Moon Girl appears only in story/trailer content and is not playable. Scarlet Witch was reworked in Season 10 (Chaos Marks, channelled ult). Forward-pick changes vs previous: drifter Blade->Daredevil (blind + single-target lock-on), lash Thor->Angela (aerial dive, binds and slams from the air), venator The Punisher->Elsa Bloodstone (monster hunter, shotgun knockback, immobilizing trap). Weak matches: geist->Adam Warlock (no MR hero spends/swaps health), wraith->Gambit (card theme; loop only partly similar), Deadpool (flex kit, loose fit).",
"roster":roster,"fwd":{k:fwd[k] for k in ids}}
json.dump(data,open('data.json','w'),indent=1,ensure_ascii=False)
# sheet
cols=9;W=150;H=190
rows=(len(roster)+cols-1)//cols
sh=Image.new('RGB',(cols*W,rows*H),(30,30,30));d=ImageDraw.Draw(sh)
for i,r in enumerate(roster):
    im=Image.open(r['img']).convert('RGBA');bg=Image.new('RGBA',im.size,(80,80,80,255));bg.alpha_composite(im)
    x=(i%cols)*W+8;y=(i//cols)*H+4
    sh.paste(bg.convert('RGB').resize((134,134)),(x,y))
    d.text((x,y+137),r['name'][:22],fill=(255,255,255));d.text((x,y+151),r['role'],fill=(180,180,180));d.text((x,y+165),','.join(r['twins']),fill=(150,200,255))
sh.save('sheet.png')
print(len(roster))
