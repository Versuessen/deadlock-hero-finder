"""Refresh hero_base.json (the per-hero facts the page is built from) after a game update.

Reads kits.json and heroes_raw.json (from build_kits.py and parse_heroes.py), the deadlock-api hero list in
ext/api/heroes.json (from fetch_assets.py) and the attribute names in the localization files.
Keeps what was set by hand in the current hero_base.json: hero colours, role lines and ability icon names.
A newly released hero gets a site id made from its name (added to codes.json; rename it there if you like),
its colour from the API and its ability icons from ext/ab/. Prints every field that changed.
Run from the repository root.
"""
import json, os, re
from PIL import Image

old_base = json.load(open('hero_base.json'))
codes = json.load(open('codes.json'))                      # site id -> game hero code
kits = {h['key']: h for h in json.load(open('kits.json'))}
raw = json.load(open('heroes_raw.json'))
api = {h['class_name']: h for h in json.load(open('ext/api/heroes.json'))}
att = open('gt/game/citadel/resource/localization/citadel_attributes/citadel_attributes_english.txt', encoding='utf-8-sig').read()
GUN = dict(re.findall(r'"Attribute_EWeaponAttribute_(\w+)"\s+"([^"]+)"', att))

# heroes released since the last run
by_code = {c: hid for hid, c in codes.items()}
for c, k in kits.items():
    if c not in by_code:
        hid = re.sub(r'[^a-z0-9]', '', k['name'].lower())
        codes[hid] = c
        print(f'new hero: {k["name"]} ({c}) -> site id "{hid}"')
json.dump(codes, open('codes.json', 'w'), indent=1)

def num(x):
    return int(x) if float(x).is_integer() else x

out = {}
for hid, c in codes.items():
    if c not in kits:
        print(f'no longer playable, dropped: {hid} ({c})')
        continue
    k, r, a = kits[c], raw[c], api[c]
    old = old_base.get(hid, {})
    gun = GUN.get(r['gun']) if r['gun'] else (a.get('gun_tag') or None)
    ab = []
    for i, x in enumerate(k['abilities']):
        same = old and i < len(old['ab']) and old['ab'][i][0] == x['name']
        icon = old['ab'][i][1] if same else x['id']
        if not os.path.exists(f'site/img/ab/{icon}.webp'):
            Image.open(f'ext/ab/{x["id"]}.png').convert('RGBA').resize((96, 96), Image.LANCZOS) \
                .save(f'site/img/ab/{icon}.webp', quality=90, method=6)
            print(f'new ability icon: site/img/ab/{icon}.webp')
        ab.append([x['name'], icon])
    out[hid] = dict(id=hid, name=k['name'], type=k['type'], cx=k['complexity'], gun=gun, hp=num(k['hp']),
                    move=k['move'], sprint=k['sprint'], stam=num(k['stamina']), weapon=k['weapon'],
                    color=old['color'] if old else a['colors']['style_hex'].upper(),
                    tags=k['tags'], role=old.get('role'), ab=ab)

json.dump(out, open('hero_base.json', 'w'), indent=1, ensure_ascii=False)
print(len(out), 'heroes')
for hid, n in out.items():
    o = old_base.get(hid)
    if not o:
        print('added', hid)
        continue
    d = {f: (o.get(f), n[f]) for f in n if o.get(f) != n[f]}
    if d:
        print(hid, d)
