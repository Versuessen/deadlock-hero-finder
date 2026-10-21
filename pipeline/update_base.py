import json,re
from PIL import Image
hb=json.load(open('hero_base_6701.json')); codes=json.load(open('codes_6701.json'))
NEW={'ratking':'hero_ratking','baba':'hero_baba','solomon':'hero_chessmaster','danny':'hero_deadpack','violet':'hero_artist','harrow':'hero_nurse'}
codes.update(NEW); json.dump(codes,open('codes.json','w'),indent=1)
kits={h['key']:h for h in json.load(open('kits.json'))}
raw=json.load(open('heroes_raw.json'))
api={h['class_name']:h for h in json.load(open('ext/api/heroes.json'))}
att=open('gt/game/citadel/resource/localization/citadel_attributes/citadel_attributes_english.txt',encoding='utf-8-sig').read()
GUN=dict(re.findall(r'"Attribute_EWeaponAttribute_(\w+)"\s+"([^"]+)"',att))
out={}
for hid,c in codes.items():
    k=kits[c]; r=raw[c]; a=api[c]
    old=hb.get(hid,{})
    gun=GUN.get(r['gun']) if r['gun'] else (a.get('gun_tag') if a.get('gun_tag') else None)
    ab=[]
    for i,x in enumerate(k['abilities']):
        icon = old['ab'][i][1] if old and old['ab'][i][0]==x['name'] else (old['ab'][i][1] if old else x['id'])
        ab.append([x['name'], icon])
    out[hid]=dict(id=hid,name=k['name'],type=k['type'],cx=k['complexity'],gun=gun,hp=int(k['hp']) if float(k['hp']).is_integer() else k['hp'],
        move=k['move'],sprint=k['sprint'],stam=int(k['stamina']) if float(k['stamina']).is_integer() else k['stamina'],
        weapon=k['weapon'],color=a['colors']['style_hex'].upper() if not old else old['color'],tags=k['tags'],role=old.get('role'),ab=ab)
    if hid in NEW:
        for x in k['abilities']:
            Image.open(f"ext/ab/{x['id']}.png").convert('RGBA').resize((96,96),Image.LANCZOS).save(f"site/img/ab/{x['id']}.webp",quality=90,method=6)
json.dump(out,open('hero_base.json','w'),indent=1,ensure_ascii=False)
for hid in NEW: print(json.dumps(out[hid],ensure_ascii=False))
print(len(out))
for hid in hb:
    o,n=hb[hid],out[hid]
    d={f:(o[f],n[f]) for f in o if o[f]!=n[f]}
    if d: print(hid,d)
