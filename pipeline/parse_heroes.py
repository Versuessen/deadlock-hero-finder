import re, json
src=open('gt/game/citadel/pak01_dir/scripts/heroes.vdata',encoding='utf-8').read().split('\n')
heroes={}; cur=None; depth=0
for line in src:
    m=re.match(r'^\t(hero_[a-z0-9_]+) = ?$',line)
    if m: cur=m.group(1); heroes[cur]={'_lines':[]}; continue
    if cur: heroes[cur]['_lines'].append(line)
out={}
for k,v in heroes.items():
    txt='\n'.join(v['_lines'])
    def g(pat,default=None):
        m=re.search(pat,txt); return m.group(1) if m else default
    d={
     'sel':('true' if ('HeroTag' in txt and re.search(r'm_eHeroType = "ECitadelHeroType_',txt) and re.search(r'm_bDisabled = false',txt)) else 'false'),'dis':g(r'm_bDisabled = (\w+)'),'dev':g(r'm_bInDevelopment = (\w+)'),
     'test':g(r'm_bNeedsTesting = (\w+)'),'prerel':g(r'm_bPrereleaseOnly = (\w+)'),'assigned':g(r'm_bAssignedPlayersOnly = (\w+)'),'limited':g(r'm_bLimitedTesting = (\w+)'),
     'id':g(r'm_HeroID = (\d+)'),'cx':g(r'm_nComplexity = (\d+)'),
     'type':g(r'm_eHeroType = "ECitadelHeroType_(\w+)"'),'gun':g(r'm_strGunTag = "#Attribute_EWeaponAttribute_(\w+)"'),
     'hp':g(r'EMaxHealth = ([\d.]+)'),'ms':g(r'EMaxMoveSpeed = ([\d.]+)'),'sprint':g(r'ESprintSpeed = ([\d.]+)'),'stam':g(r'EStamina = ([\d.]+)'),'regen':g(r'EBaseHealthRegen = ([\d.]+)'),'melee':g(r'ELightMeleeDamage = ([\d.]+)'),
     'tags':re.findall(r'"#(Citadel_\w+_HeroTag_\d)"',txt),
     'abil':[g(r'ESlot_Signature_%d = "(\w+)"'%i) for i in range(1,5)],
     'weapon':g(r'ESlot_Weapon_Primary = "(\w+)"'),
    }
    out[k]=d
json.dump(out,open('heroes_raw.json','w'),indent=1)
sel=[ (k,d) for k,d in out.items() if d['sel']=='true']
print(len(out),'blocks;',len(sel),'selectable')
for k,d in sel:
    print(k, d['id'], 'dis='+str(d['dis']),'dev='+str(d['dev']),'test='+str(d['test']),'pre='+str(d['prerel']),'asg='+str(d['assigned']),'lim='+str(d['limited']), d['cx'], d['type'], d['gun'], d['hp'], d['ms'], d['sprint'], d['stam'])
print('--- not selectable but not base:')
print([k for k,d in out.items() if d['sel']!='true'])
