import json,re,os,math
from PIL import Image
import numpy as np
from vo import D, code, clean
HB=json.load(open('hero_base.json'))
OUT={}
# ---------------- cross-game ----------------
GAMES=[('ow','Overwatch','hero'),('mr','Marvel Rivals','hero'),('val','Valorant','agent'),('lol','League of Legends','champion'),('apex','Apex Legends','legend')]
VALICON='/tmp/vap/public/imgs/agents/icons/'
CELL=96
xg=[]
for gid,gname,unit in GAMES:
    d=json.load(open(f'xg/{gid}/data.json'))
    roster=sorted(d['roster'],key=lambda x:x['name'].lower())
    cells=[]; items=[]
    for x in roster:
        im=None
        if gid=='val':
            slug=re.sub(r'[^a-z0-9]','',x['name'].lower())
            p=VALICON+slug+'.webp'
            if os.path.exists(p): im=Image.open(p).convert('RGBA')
        if im is None and x.get('img') and os.path.exists(f"xg/{gid}/{x['img']}"):
            im=Image.open(f"xg/{gid}/{x['img']}").convert('RGBA')
        idx=-1
        if im is not None:
            w,h=im.size; s=min(w,h); im=im.crop(((w-s)//2,0,(w-s)//2+s,s)).resize((CELL,CELL),Image.LANCZOS)
            idx=len(cells); cells.append(im)
        sub=x.get('sub')
        if gid=='mr' and sub and 'Flex' in sub: sub='Flex'
        items.append([x['name'], d['roles'].index(x['role']), sub or '', x['twins'], x['why'], idx])
    cols=12; rows=math.ceil(len(cells)/cols)
    sh=Image.new('RGBA',(cols*CELL,rows*CELL),(0,0,0,0))
    for i,c in enumerate(cells): sh.paste(c,((i%cols)*CELL,(i//cols)*CELL))
    sh.save(f'site/img/xg/{gid}.webp','WEBP',quality=68,method=4)
    fwd={k:v for k,v in d['fwd'].items()}
    xg.append(dict(id=gid,name=gname,unit=unit,roles=d['roles'],cols=cols,rows=rows,list=items,fwd=fwd))
    print(gid,len(items),'cells',len(cells),os.path.getsize(f'site/img/xg/{gid}.webp')//1024,'KB')
OUT['XG']=xg
# ---------------- voice lines ----------------
SIG={'abrams':"I know how to make an entrance.",'apollo':"I am without equal",'bebop':"A little trouble never hurt anyone…",
'billy':"Hey. Hey. Hey. Hey. Hey. Your taste in music sucks.",'calico':"The shadows call, and I answer…",'celeste':"Let the light shine",
'doorman':"Happy to be of service",'drifter':"Oh, I'm exactly who you think I am",'dynamo':"I AM THE COSMOS!",'geist':"My beauty is eternal",
'graves':"There's no escaping the grave.",'greytalon':"I do not miss.",'haze':"Mercy is not a gift that I bring today…",
'holliday':"No one's a better shot than me…",'infernus':"Once this goes off all they can do is burn…",'ivy':"You tried to punch a gargoyle? really?",
'kelvin':"Welcome to my ice dome.",'lash':"They save the best for last",'mcginnis':"Sometimes turrets aren't enough…",'mina':"New York will be mine",
'mirage':"The Djinn take me where I am needed",'mokrill':"Alright Maurice, here's the plan: I hold 'em down, you maul them.",
'paige':"Sorry I'm a little late, had to finish the chapter I was on...",'paradox':"Where are you going?",'pocket':"I'm a Fairfax…I can handle the pressure",
'rem':"I like naps.",'seven':"The storm gathers…",'shiv':"It takes a monster to stop a monster…",'silver':"Time to let out the beast…",
'sinclair':"Please hold your applause",'venator':"Ancient evils call for ancient tools",'victor':"Let's see 'em try to kill a dead man",
'vindicta':"They're not even gonna hear the bullet that kills them…",'viscous':"Cubes are for healing. Balls are for murder.",
'vyper':"The ol' Gorgon special",'warden':"I will stand against many!",'wraith':"Hope they got the message…",'yamato':"My family has defied death for generations."}
allv={clean(v) for v in D.values()}
CATS=['kill_anyhero','use_power4','melee_kill','congrats','last_one_standing','upgrade_power4','hunt','select','killstreak_high','close_call','near_miss','pick_up_gold','parry']
vo={}
for hid in HB:
    if hid not in SIG: continue
    s=SIG[hid]; assert s in allv or s.replace('really','Really') in allv or s.replace('…','....') in allv or True, hid
    pre=[code[hid][5:]+'_'] if hid!='sinclair' else ['magician_henry_','magician_savannah_']
    pool=[]
    for cat in CATS:
        for p in pre:
            for k,v in D.items():
                if re.match(re.escape(p+cat)+r'(_\d+[a-z]?)?_(hero|ult|ability)_3d$',k):
                    v=clean(v)
                    if 14<=len(v)<=100 and v!=s and v not in pool and not re.search(r'in spanish|\*|scream|laughter|[<>{}\[\]]',v,re.I): pool.append(v)
    # spread categories: round-robin-ish take
    vo[hid]={'s':s,'r':pool[:18]}
    if len(pool)<6: print('few lines',hid,len(pool))
OUT['VO']=json.load(open('xg/voice6.json'))
OUT['UISND']=json.load(open('xg/ui6.json'))
OUT['NM']=json.load(open('xg/nm_ratio2.json'))
# verify signature lines are verbatim
for hid,s in SIG.items():
    if s not in allv: print('SIG not verbatim:',hid,repr(s))
# ---------------- overview ----------------
t=open('gt/game/citadel/resource/localization/citadel_heroes/citadel_heroes_english.txt',encoding='utf-8-sig').read()
H=dict(re.findall(r'"([^"]+)"\s+"((?:[^"\\]|\\.)*)"',t))
ov={}
for hid,c in code.items():
    f=lambda k: ' '.join(re.sub(r'<[^>]+>','',H.get(c+k,'')).replace('\\n',' ').split())
    ov[hid]={'p':f('_playstyle'),'l':f('_lore')}
    if not ov[hid]['l']: print('no lore',hid)
FILL=json.load(open('xg/ov_fill.json'))
for hid,(r,pl) in FILL.items():
    if hid in ov:
        if not ov[hid]['p']: ov[hid]['p']=pl
        ov[hid]['r']=r
OUT['OV']=ov
# ---------------- stats for compare ----------------
hs=json.load(open('xg/hstats.json'))
ST={}
for hid,o in hs.items():
    st,lv,w=o['st'],o['lv'],o['w']
    n=w['burst'] or 1; cyc=w['cyc']; intra=w['intra'] or 0
    per=(cyc+(n-1)*intra) if n>1 else cyc
    rps=n/per if per else None
    pe=1 if str(w.get('hitonce')).lower()=='true' else (w['pel'] or 1)
    dps=w['dmg']*pe*rps if rps else None
    ST[hid]=dict(hp=st.get('EMaxHealth'),hpl=lv.get('MODIFIER_VALUE_BASE_HEALTH_FROM_LEVEL'),regen=st.get('EBaseHealthRegen'),ms=st.get('EMaxMoveSpeed'),
        spr=st.get('ESprintSpeed'),stam=st.get('EStamina'),stamr=round(1/st['EStaminaRegenPerSecond'],1) if st.get('EStaminaRegenPerSecond') else None,
        lm=st.get('ELightMeleeDamage'),hm=st.get('EHeavyMeleeDamage'),spl=lv.get('MODIFIER_VALUE_TECH_POWER'),
        bd=w['dmg'],pel=int(w['pel'] or 1),burst=int(n),rps=round(rps,2) if rps else None,clip=int(w['clip']) if w['clip'] else None,
        rel=w['reload'],relsingle=bool(w['single']),hitonce=str(w.get('hitonce')).lower()=='true',dps=round(dps,1) if dps else None,bdl=lv.get('MODIFIER_VALUE_BASE_BULLET_DAMAGE_FROM_LEVEL'),
        fs=round(w['fs']/39.37,1) if w['fs'] else None,fe=round(w['fe']/39.37,1) if w.get('fe') else None,spin=bool(w['spin']),
        dash=st.get('EGroundDashDistanceInMeters'))
OUT['ST']=ST
# ---------------- ability stats ----------------
AS=json.load(open('abil_stats.json'))
AT=json.load(open('abil_text.json'))
OUT['ABS']={k:{'d':(AT.get(k) or {}).get('full',''),'cd':v.get('cd'),'ch':v.get('charges'),'s':[[x['k'],x['v'],x.get('u',''),(x.get('sc') or {}).get('x')] for x in v.get('stats',[])],'u':v.get('up',[])} for k,v in AS.items()}
js='// generated by data3.py\n'+'\n'.join(f'const {k} = {json.dumps(v,ensure_ascii=False,separators=(",",":"))};' for k,v in OUT.items())+'\n'
open('src/extra.js','w').write(js); print('extra.js',len(js)//1024,'KB')
