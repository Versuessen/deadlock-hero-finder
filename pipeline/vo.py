import json,re
code=json.load(open('codes.json'))
t=open('gt/game/citadel/resource/localization/citadel_generated_vo/citadel_generated_vo_english.txt',encoding='utf-8-sig').read()
kv=re.findall(r'"([^"]+)"\s+"((?:[^"\\]|\\.)*)"',t)
D={}
for k,v in kv: D.setdefault(k,v)
def clean(v): return ' '.join(v.replace('\\"','"').replace('\\n',' ').split())
def pool(hid,cat,lo=10,hi=110):
    p=code[hid][5:]+'_'+cat
    out=[]
    for k,v in D.items():
        if re.match(re.escape(p)+r'(_\d+[a-z]?)?_(hero|ult|ability)_3d$',k):
            v=clean(v)
            if lo<=len(v)<=hi and v not in out and not re.search(r'[<>{}\[\]]|\bumm\b',v): out.append(v)
    return out
def reveal(hid):
    for k,v in D.items():
        if k.startswith('Vo.VoteReveal.') and k.split('.')[-1].lower()==code[hid][5:]: return clean(v)
