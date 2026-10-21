"""Copy the buildable project from the scratchpad into the GitHub repo checkout."""
import os, shutil, fnmatch
S='/tmp/claude-0/-home-claude/fdcfef21-f3b0-5a24-8f6d-682b1f9d157b/scratchpad'
R='/home/claude/deadlock-hero-finder'
def mirror(src, dst, skip):
    if os.path.exists(dst): shutil.rmtree(dst)
    for root, dirs, files in os.walk(src):
        rel = os.path.relpath(root, src)
        dirs[:] = [d for d in dirs if not any(fnmatch.fnmatch(os.path.normpath(os.path.join(rel, d)) + '/', p) for p in skip)]
        for f in files:
            r = os.path.normpath(os.path.join(rel, f))
            if any(fnmatch.fnmatch(r, p) or fnmatch.fnmatch(f, p) for p in skip): continue
            os.makedirs(os.path.join(dst, rel), exist_ok=True); shutil.copy2(os.path.join(root, f), os.path.join(dst, r))
mirror(f'{S}/site', f'{R}/site', ['img/hbg/', 'img/bg/', 'img/ui/', 'img/nm/*.webp'])
mirror(f'{S}/xg', f'{R}/xg', ['*/repos/', 'sheet.png', '*_6701.json', 'vo_cands.txt', 'vo2.json', 'nm_ratio.json'])
for d, names in [('src', ['template2.html','app2.js','model.js','edit.js','team.js','extra.js','test.js','test2.js','test3.js','bestans.js']),
                 ('pipeline', ['parse_heroes.py','build_kits.py','update_base.py','kv3.py','abil_stats.py','gen_abil_text.py','wpn3.py','vo.py','audio6.py','new_vo.py','data3.py','build2.py','sync_repo.py']),
                 ('.', ['hero_base.json','codes.json','kits.json','heroes_raw.json','abil_stats.json','abil_text.json','hero_base_6701.json','codes_6701.json'])]:
    os.makedirs(f'{R}/{d}', exist_ok=True)
    for n in names:
        src = f'{S}/src/{n}' if d == 'src' else f'{S}/{n}'
        shutil.copy2(src, f'{R}/{d}/{n}')
n = 0; size = 0
for root, dirs, files in os.walk(R):
    if '.git' in root.split(os.sep): continue
    for f in files: n += 1; size += os.path.getsize(os.path.join(root, f))
print('files', n, 'MB', round(size/1e6, 1))
