"""Download the inputs the data scripts need that are not in the game files:

  ext/api/heroes.json, ext/api/items.json   deadlock-api.com hero and item lists (colours, gun tags, icon URLs)
  ext/ab/<ability id>.png                   ability icons for every playable hero (read by update_base.py)
  xg/val/icons/<agent>.webp                 Valorant agent icons for the cross-game sprite sheet (read by data3.py)

Files already present are skipped; pass --force to download everything again.
Run from the repository root after build_kits.py.
"""
import json, os, re, sys, urllib.request

FORCE = '--force' in sys.argv
API = 'https://api.deadlock-api.com/v1/assets'
VAL_ICONS = 'https://raw.githubusercontent.com/andrerfcsantos/valorant-agent-picker/main/public/imgs/agents/icons/'

def get(url, path):
    if os.path.exists(path) and not FORCE:
        return False
    os.makedirs(os.path.dirname(path), exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'deadlock-soulmate-pipeline'})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    open(path, 'wb').write(data)
    return True

for name in ('heroes', 'items'):
    if get(f'{API}/{name}', f'ext/api/{name}.json'):
        print(f'saved ext/api/{name}.json')

items = {x['class_name']: x for x in json.load(open('ext/api/items.json')) if x.get('class_name')}
n = 0
for hero in json.load(open('kits.json')):
    for ab in hero['abilities']:
        it = items.get(ab['id'])
        if not it or not it.get('image'):
            print(f'no icon in the API for {hero["name"]}: {ab["name"]} ({ab["id"]})')
            continue
        n += get(it['image'], f'ext/ab/{ab["id"]}.png')
print(f'{n} ability icons downloaded')

n = 0
for agent in json.load(open('xg/val/data.json'))['roster']:
    slug = re.sub(r'[^a-z0-9]', '', agent['name'].lower())
    try:
        n += get(VAL_ICONS + slug + '.webp', f'xg/val/icons/{slug}.webp')
    except Exception as e:
        print(f'no Valorant icon for {agent["name"]}: {e}')
print(f'{n} Valorant icons downloaded')
