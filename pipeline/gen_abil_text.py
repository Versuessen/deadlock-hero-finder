import json,re,pickle,copy
V=pickle.load(open('abil_vdata.pkl','rb'))
def props(name,seen=()):
    e=V.get(name) or {}
    acc={}
    for b in ([e['_base']] if e.get('_base') else [])+list(e.get('_multibase') or []):
        if b in V and b not in seen: acc.update(props(b,seen+(name,)))
    for k,v in (e.get('m_mapAbilityProperties') or {}).items():
        if isinstance(v,dict) and 'm_strValue' in v: acc[k]=v['m_strValue']
    return acc
def fmt(v):
    try: x=float(str(v).rstrip('m'))
    except: return None
    if x!=x: return None
    return ('%g'%round(x,2))
kits=json.load(open('kits.json'))
old=json.load(open('abil_text.json'))
L={}
for f in ['gt/game/citadel/resource/localization/citadel_heroes/citadel_heroes_english.txt']:
    for line in open(f,encoding='utf-8-sig'):
        s=line.strip()
        if s.startswith('//'): continue
        m=re.match(r'"([^"]+)"\s*"((?:[^"\\]|\\.)*)"',s)
        if m and m.group(1).lower() not in L: L[m.group(1).lower()]=m.group(2)
def clean(t,hn='',P=None):
    t=t.replace('\\"','"').replace('{s:hero_name}',hn)
    if P: t=re.sub(r'\{s:(\w+)\}',lambda m: fmt(P[m.group(1)]) if m.group(1) in P and fmt(P[m.group(1)]) not in (None,'0') else m.group(0),t)
    t=re.sub(r"\s*\(\{g:citadel_binding:'\w+'\}\)",'',t)
    BK={'attack':'M1','ads':'M2','altcast':'Alt-Cast','mantle':'Jump','crouch':'Crouch','moveforward':'Forward','roll':'Dash','ability1':'1','ability2':'2','ability3':'3','ability4':'4'}
    t=re.sub(r"\{g:citadel_binding:'(\w+)'\}",lambda m:' '+BK.get(m.group(1).lower(),'')+' ',t)
    t=re.sub(r"\{g:citadel_inline_attribute:'(\w+)'\}",lambda m:re.sub(r'(?<!^)(?=[A-Z])',' ',m.group(1)).lower().replace('d p s','DPS'),t)
    t=re.sub(r'\s*\b(?:for|of|by|up to|below|above|over|to)?\s*\{s:\w+\}[%a-z]*',' ',t)
    t=re.sub(r'([.!?])\s*:\s*',r'\1 ',t)
    t=re.sub(r'<br\s*/?>',' ',t); t=re.sub(r'<[^>]+>','',t)
    t=re.sub(r'\s+',' ',t).strip()
    t=re.sub(r'\s+([.,;:!?])',r'\1',t)
    t=re.sub(r'^Active:\s*','',t)
    t=t.replace('Alt-Cast Alt-Cast','Alt-Cast').replace('alt cast with Alt-Cast','Alt-Cast')
    return t
out={}
for h in kits:
    for a in h['abilities']:
        al=a['id'].lower()
        parts=[L.get(al+'_desc','')] if L.get(al+'_desc') else [L.get(al+x,'') for x in ['_desc_1','_desc_2','_desc_active','_desc_active_alt','_active_desc','_desc_passive','_passive_desc']]
        full=clean(' '.join(p for p in parts if p),h['name'],props(a['id']))
        first=re.split(r'(?<=[.!?])\s',full)[0] if full else ''
        out[a['id']]={'hero':h['name'],'name':a['name'],'quip':a['quip'] if a['quip']!=a['name'] else '','first':first,'full':full}
json.dump(out,open('abil_text.json','w'),indent=1,ensure_ascii=False)
print(len(out))
for k in ['ability_vampirebat_steallife','ability_chessmaster_throwbishop','ability_chessmaster_queen','ability_artist_homingbrush','ability_baba_bench_run','ability_deadpack_rocketeer']:
    print(k,'|',out[k]['full'])
ch=[k for k in old if k in out and old[k]['full']!=out[k]['full']]
print('changed vs old:',len(ch)); 
for k in ch[:8]: print(' OLD',old[k]['full'][:150],'\n NEW',out[k]['full'][:150])
