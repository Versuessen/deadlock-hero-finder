import json,re,sys
import abil_stats as A
HR=json.load(open('heroes_raw.json')); code=json.load(open('codes.json'))
HV=open('gt/game/citadel/pak01_dir/scripts/heroes.vdata',encoding='utf-8').read()
def hero_block(c):
    i=HV.index('\n\t'+c+' = '); j=HV.find('\n\t}',i); return HV[i:j]
def kvs(block,mapname):
    i=block.find(mapname+' = ');
    if i<0: return {}
    j=block.find('}',i); return {k:float(v) for k,v in re.findall(r'(\w+) = ([-\d.]+)',block[i:j])}
base=hero_block('hero_base')
def find(d,key):
    if isinstance(d,dict):
        if key in d: return d[key]
        for v in d.values():
            r=find(v,key)
            if r is not None: return r
    elif isinstance(d,list):
        for v in d:
            r=find(v,key)
            if r is not None: return r
    return None
def num(v):
    try: return float(v)
    except: return None
OUT={}
for hid,c in code.items():
    b=hero_block(c)
    st=dict(kvs(base,'m_mapStartingStats')); st.update(kvs(b,'m_mapStartingStats'))
    lv=dict(kvs(base,'m_mapStandardLevelUpUpgrades')); lv.update(kvs(b,'m_mapStandardLevelUpUpgrades'))
    W=A.resolve(HR[c]['weapon'])
    wi=W.get('m_WeaponInfo',W)
    g=lambda k: num(find(wi,k))
    w=dict(dmg=g('m_flBulletDamage'),cyc=g('m_flCycleTime'),clip=g('m_iClipSize'),pel=g('m_iBullets') or 1,burst=g('m_iBurstShotCount') or 1,
           intra=g('m_flIntraBurstCycleTime'),bcd=g('m_flBurstShotCooldown'),reload=g('m_reloadDuration') or g('m_flReloadDuration'),
           fs=g('m_flDamageFalloffStartRange'),fe=g('m_flDamageFalloffEndRange'),spd=g('m_flBulletSpeed'),spin=g('m_flMaxSpinCycleTime'),
           single=find(wi,'m_bReloadSingleBullets'),hitonce=find(wi,'m_bHitOnceAcrossAllBullets'))
    OUT[hid]=dict(st=st,lv=lv,w=w)
json.dump(OUT,open('xg/hstats.json','w'),indent=0)
for hid,o in sorted(OUT.items()):
    w=o['w'];print(f"{hid:10} hp={o['st'].get('EMaxHealth')} hpL={o['lv'].get('MODIFIER_VALUE_BASE_HEALTH_FROM_LEVEL')} spL={o['lv'].get('MODIFIER_VALUE_TECH_POWER')} bdL={o['lv'].get('MODIFIER_VALUE_BASE_BULLET_DAMAGE_FROM_LEVEL')} regen={o['st'].get('EBaseHealthRegen')} hm={o['st'].get('EHeavyMeleeDamage')} | dmg={w['dmg']} pel={w['pel']} cyc={w['cyc']} burst={w['burst']} intra={w['intra']} bcd={w['bcd']} clip={w['clip']} rel={w['reload']} spin={w['spin']} fs={w['fs']} single={w['single']}")
