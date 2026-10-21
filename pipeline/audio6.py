import json,os,glob,re,subprocess
from vo import D, clean
P='pack/sounds/'
def dur(f): return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]).decode())
def sprite(clips,out,br='96k',gap=.25,ac=1,q=None):
    """clips: list of (path, maxlen). returns [(start,dur)]"""
    tmp=[];segs=[];t=0.0
    for i,c in enumerate(clips):
        f,mx=c[0],c[1]; tp=c[2] if len(c)>2 else None
        d=min(dur(f),mx) if mx else dur(f)
        fo=max(0,d-0.35) if mx and dur(f)>mx else None
        af=f'afade=t=out:st={fo:.2f}:d=0.35,' if fo is not None else ''
        if tp:
            vd=subprocess.run(['ffmpeg','-v','info','-i',f,'-t',f'{d:.3f}','-af','volumedetect','-f','null','-'],capture_output=True).stderr.decode()
            mv=float(re.search(r'max_volume: ([-\d.]+) dB',vd).group(1)); import math
            af+=f'volume={20*math.log10(tp)-mv:.2f}dB,'
        tf=f'/tmp/sp_{i}.wav'
        # trim inside the filter chain so the silent gap after each clip survives (an output -t cut it off)
        subprocess.run(['ffmpeg','-y','-v','error','-i',f,'-af',f'atrim=0:{d:.3f},asetpts=PTS-STARTPTS,'+af+f'apad=pad_dur={gap}','-ac',str(ac),'-ar','44100',tf],check=True)
        dd=dur(tf); assert dd>d+gap*.5, (f,d,dd); segs.append([round(t,3),round(d,3)]); t+=dd; tmp.append(tf)
    lst='/tmp/sp_list.txt'; open(lst,'w').write(''.join(f"file '{x}'\n" for x in tmp))
    subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',lst,'-ac',str(ac)]+(['-q:a',str(q)] if q is not None else ['-b:a',br])+[out],check=True)
    for x in tmp: os.remove(x)
    return segs
# ---------- voices ----------
vo=json.load(open('xg/vo2.json'))
files={os.path.basename(f).lower():f for f in glob.glob(P+'voicelines/*/*.mp3')}
ONLY=os.environ.get('ONLY'); UIONLY=os.environ.get('UIONLY')
VOICE=json.load(open('xg/voice6.json')) if ONLY else {}
for hid,v in ([] if UIONLY else vo.items()):
    if ONLY and hid!=ONLY: continue
    entries=[v['s']]+v['r']
    if hid=='doorman':
        entries=[e for e in entries if e[1].lower() in files]
        entries.insert(0,[clean(D['doorman_use_power4_02_ult_3d']),'doorman_use_power4_02.mp3'])
    if hid=='sinclair':
        extra=[]
        for e in entries:
            sv=e[1].lower().replace('henry','savannah')
            k=sv[:-4]+'_hero_3d'; k2=sv[:-4]+'_ult_3d'
            txt=clean(D.get(k) or D.get(k2) or '')
            if sv in files and txt: extra.append([txt,sv])
        entries+=extra
    clips=[(files[e[1].lower()],None) for e in entries]
    segs=sprite(clips,f'site/img/vo/{hid}.mp3',gap=.25,ac=1,q=0)
    VOICE[hid]={'s':[entries[0][0],0],'r':[[e[0],i+1] for i,e in enumerate(entries[1:])],'seg':segs}
    print(hid,len(entries),os.path.getsize(f'site/img/vo/{hid}.mp3')//1024,'KB')
if not UIONLY: json.dump(VOICE,open('xg/voice6.json','w'),ensure_ascii=False)
if ONLY: raise SystemExit
# ---------- UI ----------
U=P+'ui/'
MAP={
 'hover':[(f'ui_menu_hover_0{i}',None,.22) for i in range(1,5)],
 'hover_card':[(f'ui_herocard_hover_0{i}',None,.5) for i in (2,3,5,6,7)],
 'hover_hero':[(f'ui_herocard_hover_0{i}',None,.5) for i in (2,3,5,6,7)],
 'hover_chip':[(f'ui_menu_hover_0{i}',None,.3) for i in range(1,5)],
 'hover_ab':[(f'ui_shop_mod_hover_spirit_0{i}',None,.45) for i in range(1,5)],
 'click':[(f'ui_menu_press_big_0{i}',1.4,.8) for i in range(1,5)],
 'small':[('shop_broadcast',None,.5)],
 'cta':[('ui_title_press',2.6,.85)],
 'select':[('ui_shop_click_weapon',1.2,.6),('ui_shop_click_vitality',1.2,.6)],
 'deselect':[('ui_menu_back_minor',1.0,.6)],
 'back':[('ui_menu_back_minor',1.3,.7)],
 'skip':[('ui_moop',1.2,.6)],
 'deal':[(f'ui_shop_panel_page_0{i}',1.0,.55) for i in range(1,7)],
 'chime':[(f'ui_hud_upgrade_ability_0{i}',2.2,.6) for i in range(1,5)],
 'start':[('ui_game_matchmake_find',2.6,.8)],
 'reveal':[('ui_heroselection_enter_01',2.4,.7),('ui_heroselection_enter_02',2.4,.7),('ui_heroselection_enter_03',2.4,.7)],
 'lockin':[('hero_select_play',None,.8)],
 'flip':[(f'ui_ranked_whoosh_generic_0{i}',1.6,.6) for i in range(1,4)],
 'open':[(f'ui_menu_open_swoop_0{i}',1.4,.6) for i in range(1,8)],
 'close':[('shop_close',1.2,.6)],
 'copy':[(f'ui_commend_send_0{i}',2.0,.7) for i in range(1,5)],
 'tick':[(f'ui_get_gold_{i:02d}',.6,.5) for i in range(1,12)],
 'toggle_on':[('shop_activate',1.2,.6)],
 'toggle_off':[('shop_deactivate',1.2,.6)],
 'filter':[('ui_shop_panel_page_02',1.0,.6)],
 'pick':[(f'ui_draft_item_appear_base_0{i}',1.2,.6) for i in range(1,6)],
 'remove':[('ui_lane_swap_request_deny',1.0,.6)],
 
 'frog':[('ui_cheat_frog',2.8,.6)],
}
clips=[];index={}
for k,v in MAP.items():
    index[k]=[]
    for n,mx,tp in v:
        index[k].append(len(clips)); clips.append((U+n+'.mp3',mx,tp))
segs=sprite(clips,'site/img/snd/ui.mp3',gap=.2,ac=2,q=2)
UI={k:[segs[i] for i in ix] for k,ix in index.items()}
json.dump(UI,open('xg/ui6.json','w'))
print('ui.mp3',os.path.getsize('site/img/snd/ui.mp3')//1024,'KB', len(clips),'clips')
