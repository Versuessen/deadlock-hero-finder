import re, json
L={}
for f in ['gt/game/citadel/resource/localization/citadel_heroes/citadel_heroes_english.txt','gt/game/citadel/resource/localization/citadel_gc_hero_names/citadel_gc_hero_names_english.txt']:
    for line in open(f,encoding='utf-8'):
        s=line.strip()
        if s.startswith('//'): continue
        m=re.match(r'"([^"]+)"\s*"((?:[^"\\]|\\.)*)"',s)
        if m and m.group(1) not in L: L[m.group(1)]=m.group(2)
def clean(t):
    t=t.replace('\\"','"')
    t=re.sub(r"\{g:citadel_inline_attribute:'(\w+)'\}",lambda m:'['+re.sub(r'(?<!^)(?=[A-Z])',' ',m.group(1))+']',t)
    t=re.sub(r"\{g:citadel_binding:'(\w+)'\}",lambda m:' <'+m.group(1)+'> ',t)
    t=re.sub(r'<br\s*/?>',' ',t); t=re.sub(r'<[^>]+>','',t)
    return re.sub(r'\s+',' ',t).strip()
H=json.load(open('heroes_raw.json'))
Lk={k.lower():v for k,v in L.items()}
res=[]
for k,d in H.items():
    if d['sel']!='true' or d['dis']=='true': continue
    name=Lk.get(k+':n') or Lk.get(k)
    h={'key':k,'name':name,'role':clean(Lk.get(k+'_role','')),'playstyle':clean(Lk.get(k+'_playstyle','')),
       'tags':[Lk.get(t.lower(),t) for t in d['tags']],'type':d['type'],'gun':d['gun'],'complexity':int(d['cx']),
       'hp':float(d['hp']),'move':float(d['ms']),'sprint':float(d['sprint']),'stamina':float(d['stam']),
       'weapon':Lk.get(('citadel_weapon_'+k+'_set').lower()) or Lk.get(('citadel_weapon_'+k.replace('hero_','')+'_set').lower()) or Lk.get((d['weapon'] or '').lower()),
       'abilities':[]}
    for a in d['abil']:
        al=(a or '').lower()
        h['abilities'].append({'id':a,'name':Lk.get(al),'quip':clean(Lk.get(al+'_quip','')),'desc':clean(Lk.get(al+'_desc','') or ' '.join(Lk.get(al+x,'') for x in ['_desc_1','_desc_2','_desc_active','_desc_active_alt','_active_desc','_desc_passive','_passive_desc'])),
            't1':clean(Lk.get(al+'_t1_desc','')),'t2':clean(Lk.get(al+'_t2_desc','')),'t3':clean(Lk.get(al+'_t3_desc',''))})
    res.append(h)
res.sort(key=lambda h:h['name'] or '')
json.dump(res,open('kits.json','w'),indent=1,ensure_ascii=False)
with open('kits.txt','w') as f:
    for h in res:
        f.write(f"## {h['name']} ({h['key']}) | {h['type']} | cx {h['complexity']} | gun {h['gun']} | HP {h['hp']} move {h['move']} sprint {h['sprint']} stam {h['stamina']} | weapon: {h['weapon']}\n")
        f.write(f"tags: {', '.join(h['tags'])}\nrole: {h['role']}\nplaystyle: {h['playstyle']}\n")
        for i,a in enumerate(h['abilities'],1):
            f.write(f"  {i}. {a['name']} — {a['quip']}\n     {a['desc']}\n     T2: {a['t2']} | T3: {a['t3']}\n")
        f.write('\n')
print(len(res)); print([h['name'] for h in res])
missing=[(h['name'],a['id']) for h in res for a in h['abilities'] if not a['name'] or not a['desc']]
print('missing',missing)
