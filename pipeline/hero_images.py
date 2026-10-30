"""Download and convert a hero's pictures for the site:

  site/img/hero/<id>.webp    card portrait, 280x380       (deadlock-api.com)
  site/img/gloat/<id>.webp   hover portrait, 280x380      (deadlock-api.com)
  site/img/rnd/<id>.webp     full render, 960 px wide     (Deadlock Wiki CDN)
  site/img/nm/<id>.svg       name mark, coordinates rounded to one decimal, plus its width/height ratio
                             in xg/nm_ratio2.json         (deadlock-api.com)

Usage:  python3 pipeline/hero_images.py            heroes that have no card yet (new releases)
        python3 pipeline/hero_images.py rem violet  just these heroes (replaces their pictures)
        python3 pipeline/hero_images.py --all       every hero

Downloads are kept in ext/hero/. Run from the repository root after fetch_assets.py and update_base.py.
"""
import io, json, os, re, sys, urllib.parse, urllib.request
from PIL import Image

codes = json.load(open('codes.json'))
names = {hid: h['name'] for hid, h in json.load(open('hero_base.json')).items()}
api = {h['class_name']: h for h in json.load(open('ext/api/heroes.json'))}
ratios = json.load(open('xg/nm_ratio2.json'))

args = [a for a in sys.argv[1:] if not a.startswith('--')]
if '--all' in sys.argv:
    ids = list(names)
elif args:
    ids = args
else:
    ids = [hid for hid in names if not os.path.exists(f'site/img/hero/{hid}.webp')]
if not ids:
    print('every hero already has pictures; name heroes or pass --all to replace them')

def fetch(url, path):
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        req = urllib.request.Request(url, headers={'User-Agent': 'deadlock-soulmate-pipeline'})
        with urllib.request.urlopen(req, timeout=120) as r:
            open(path, 'wb').write(r.read())
    return path

for hid in ids:
    if hid not in names:
        sys.exit(f'unknown hero id "{hid}"; ids are the keys of hero_base.json')
    img = api[codes[hid]]['images']
    for key, folder in (('icon_hero_card', 'hero'), ('hero_card_gloat', 'gloat')):
        im = Image.open(fetch(img[key], f'ext/hero/{hid}_{folder}.png')).convert('RGBA')
        if im.size != (280, 380):
            im = im.resize((280, 380), Image.LANCZOS)
        im.save(f'site/img/{folder}/{hid}.webp', 'WEBP', quality=86, method=6)
    # the wiki names renders after the hero's display name, e.g. "Mo_%26_Krill_Render.png"
    render = 'https://cdn.deadlock.wiki/' + urllib.parse.quote(names[hid].replace(' ', '_')) + '_Render.png'
    im = Image.open(fetch(render, f'ext/hero/{hid}_render.png')).convert('RGBA')
    im.resize((960, round(im.height * 960 / im.width)), Image.LANCZOS).save(f'site/img/rnd/{hid}.webp', 'WEBP', quality=80, method=6)
    svg = open(fetch(img['name_image'], f'ext/hero/{hid}_name.svg'), encoding='utf-8').read()
    svg = re.sub(r'-?\d+\.\d+', lambda m: f'{float(m.group()):.1f}'.rstrip('0').rstrip('.'), svg)
    open(f'site/img/nm/{hid}.svg', 'w', encoding='utf-8').write(svg)
    w, h = (float(v) for v in re.search(r'viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"', svg).groups())
    ratios[hid] = round(w / h, 3)
    print(f'{hid}: card, gloat, render and name mark written')

json.dump(ratios, open('xg/nm_ratio2.json', 'w'))
